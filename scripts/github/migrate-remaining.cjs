#!/usr/bin/env node
/**
 * 残りの Plane Issue を GitHub に移行（高速版）
 * 
 * gh api を直接使用してプロセス起動コストを削減
 * 1件あたり ~3-4秒 で処理
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const planeApi = require('../plane/lib/plane-api-client.cjs');

const GITHUB_OWNER = 'watchout';
const GITHUB_REPO = 'hotel-kanri';
const PROJECT_NUMBER = 3;

const STATE_MAP = {
  'Backlog': 'Backlog',
  'Todo': 'Backlog',
  'In Progress': 'In Progress',
  'In Audit': 'In Review',
  'Audit Passed': 'Done',
  'Done': 'Done',
  'Cancelled': null
};

// ============================================================
// 高速 API ヘルパー（gh api 直接使用）
// ============================================================

function ghApi(method, endpoint, body) {
  try {
    const bodyArg = body ? ` --input -` : '';
    const cmd = `gh api ${method === 'GET' ? '' : '-X ' + method} "${endpoint}"${bodyArg}`;
    const result = execSync(cmd, {
      encoding: 'utf8',
      timeout: 15000,
      input: body ? JSON.stringify(body) : undefined,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return JSON.parse(result);
  } catch (err) {
    const stderr = err.stderr?.trim() || '';
    if (stderr.includes('rate limit')) {
      console.log('    ⏳ Rate limit - 60秒待機...');
      execSync('sleep 60');
      return ghApi(method, endpoint, body); // リトライ
    }
    console.error(`    API error: ${stderr.substring(0, 100)}`);
    return null;
  }
}

function ghGraphQL(query, variables = {}) {
  try {
    const args = Object.entries(variables)
      .map(([k, v]) => `-f ${k}="${String(v).replace(/"/g, '\\"')}"`)
      .join(' ');
    const result = execSync(
      `gh api graphql -f query='${query.replace(/'/g, "'\\''")}' ${args}`,
      { encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return JSON.parse(result);
  } catch (err) {
    const stderr = err.stderr?.trim() || '';
    if (stderr.includes('rate limit')) {
      console.log('    ⏳ Rate limit - 60秒待機...');
      execSync('sleep 60');
      return ghGraphQL(query, variables);
    }
    return null;
  }
}

function extractDevNumber(name) {
  const match = name?.match(/\[DEV-(\d+)\]/);
  return match ? `DEV-${match[1]}` : null;
}

function extractPhase(name) {
  const match = name?.match(/\[Phase\s*(\d+)\]/i);
  if (match) return `Phase ${match[1]}`;
  if (name?.includes('[MVP]')) return 'Phase 1';
  return null;
}

// ============================================================
// メイン処理
// ============================================================

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.log('=== 残りの Plane → GitHub 移行（高速版） ===');
  console.log(`モード: ${dryRun ? 'DRY RUN' : '本番実行'}`);
  console.log('');

  // Step 1: 作成済みIssueタイトル取得
  console.log('[Step 1] 作成済みIssue確認...');
  const existingRaw = execSync(
    `gh issue list --repo ${GITHUB_OWNER}/${GITHUB_REPO} --state all --limit 500 --json title --jq '.[].title'`,
    { encoding: 'utf8', timeout: 30000 }
  );
  const existingTitles = new Set(existingRaw.trim().split('\n').filter(Boolean));
  console.log(`  作成済み: ${existingTitles.size} 件`);

  // Step 2: Plane データ取得
  console.log('[Step 2] Plane データ取得...');
  const config = planeApi.getPlaneConfig();
  
  const statesEndpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/states/`;
  const statesRes = await planeApi.request('GET', statesEndpoint);
  const stateList = statesRes.results || statesRes;
  const stateMap = {};
  if (Array.isArray(stateList)) {
    stateList.forEach(s => { stateMap[s.id] = s.name; });
  }

  const issuesEndpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  const issuesRes = await planeApi.request('GET', issuesEndpoint);
  const allIssues = issuesRes.results || issuesRes;

  // フィルタ: Cancelled除外、Done除外、作成済み除外
  const remaining = allIssues.filter(i => {
    const stateName = stateMap[i.state];
    if (stateName === 'Cancelled') return false;
    if (stateName === 'Done') return false;
    if (existingTitles.has(i.name)) return false;
    return true;
  });

  // DEV番号順でソート
  remaining.sort((a, b) => {
    const aNum = parseInt(extractDevNumber(a.name)?.replace('DEV-', '') || '9999');
    const bNum = parseInt(extractDevNumber(b.name)?.replace('DEV-', '') || '9999');
    return aNum - bNum;
  });

  console.log(`  残り: ${remaining.length} 件`);

  if (dryRun) {
    console.log('');
    console.log('[DRY RUN] 移行対象:');
    remaining.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name.substring(0, 70)}`);
    });
    return;
  }

  // Step 3: プロジェクトフィールド情報取得
  console.log('[Step 3] Project フィールド取得...');
  const fieldsRes = ghGraphQL(`
    {
      user(login: "${GITHUB_OWNER}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          id
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field { id name }
              ... on ProjectV2SingleSelectField { id name options { id name } }
            }
          }
        }
      }
    }
  `);

  const projectId = fieldsRes?.data?.user?.projectV2?.id;
  const fields = fieldsRes?.data?.user?.projectV2?.fields?.nodes || [];
  
  let devNumberFieldId, phaseFieldId, statusFieldId, ssotFieldId;
  const phaseOptions = {};
  const statusOptions = {};
  
  fields.forEach(f => {
    if (f.name === 'DEV Number') devNumberFieldId = f.id;
    if (f.name === 'SSOT') ssotFieldId = f.id;
    if (f.name === 'Phase' && f.options) {
      phaseFieldId = f.id;
      f.options.forEach(o => { phaseOptions[o.name] = o.id; });
    }
    if (f.name === 'Status' && f.options) {
      statusFieldId = f.id;
      f.options.forEach(o => { statusOptions[o.name] = o.id; });
    }
  });

  console.log(`  Project: ${projectId}`);
  console.log(`  Status: ${JSON.stringify(statusOptions)}`);
  console.log('');

  // Step 4: 高速移行
  console.log('[Step 4] Issue 作成開始...');
  const startTime = Date.now();
  let created = 0, failed = 0;

  for (let i = 0; i < remaining.length; i++) {
    const issue = remaining[i];
    const stateName = stateMap[issue.state] || 'Backlog';
    const githubStatus = STATE_MAP[stateName] || 'Backlog';
    const devNumber = extractDevNumber(issue.name);
    const phase = extractPhase(issue.name);
    
    const descPlain = (issue.description_html || '')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .trim();

    const body = `**Plane 移行元**: sequence_id=${issue.sequence_id}\n\n${descPlain ? '---\n' + descPlain : ''}`;

    const progress = `[${i + 1}/${remaining.length}]`;
    process.stdout.write(`${progress} ${devNumber || 'N/A'} ${issue.name.substring(0, 50)}...`);

    // Issue 作成（REST API 直接）
    const issueRes = ghApi('POST', `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`, {
      title: issue.name,
      body: body
    });

    if (!issueRes?.number) {
      console.log(' ❌');
      failed++;
      continue;
    }

    const issueNodeId = issueRes.node_id;

    // Project に追加（GraphQL）
    const addRes = ghGraphQL(`
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
          item { id }
        }
      }
    `.replace(/\$projectId/g, `"${projectId}"`).replace(/\$contentId/g, `"${issueNodeId}"`));

    // 変数展開がGraphQLで直接使えないのでinline化
    const addRes2 = ghGraphQL(`
      mutation {
        addProjectV2ItemById(input: { projectId: "${projectId}", contentId: "${issueNodeId}" }) {
          item { id }
        }
      }
    `);

    const itemId = addRes2?.data?.addProjectV2ItemById?.item?.id;

    if (itemId) {
      // フィールド設定を1つのmutationにまとめる
      const mutations = [];
      
      if (devNumber && devNumberFieldId) {
        mutations.push(`devNum: updateProjectV2ItemFieldValue(input: { projectId: "${projectId}", itemId: "${itemId}", fieldId: "${devNumberFieldId}", value: { text: "${devNumber}" } }) { projectV2Item { id } }`);
      }
      if (phase && phaseFieldId && phaseOptions[phase]) {
        mutations.push(`phase: updateProjectV2ItemFieldValue(input: { projectId: "${projectId}", itemId: "${itemId}", fieldId: "${phaseFieldId}", value: { singleSelectOptionId: "${phaseOptions[phase]}" } }) { projectV2Item { id } }`);
      }
      if (githubStatus && statusFieldId && statusOptions[githubStatus]) {
        mutations.push(`status: updateProjectV2ItemFieldValue(input: { projectId: "${projectId}", itemId: "${itemId}", fieldId: "${statusFieldId}", value: { singleSelectOptionId: "${statusOptions[githubStatus]}" } }) { projectV2Item { id } }`);
      }

      if (mutations.length > 0) {
        ghGraphQL(`mutation { ${mutations.join('\n')} }`);
      }
    }

    created++;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = (created / (elapsed / 60)).toFixed(1);
    console.log(` ✅ #${issueRes.number} (${rate}件/分)`);
  }

  // Step 5: 結果
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log('');
  console.log('=== 完了 ===');
  console.log(`  成功: ${created}`);
  console.log(`  失敗: ${failed}`);
  console.log(`  所要時間: ${totalTime} 分`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
