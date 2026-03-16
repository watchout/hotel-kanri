#!/usr/bin/env node
/**
 * Plane → GitHub Projects V2 移行スクリプト
 *
 * 1. Plane から全 Issue をエクスポート
 * 2. hotel-kanri リポジトリに GitHub Issues を作成
 * 3. GitHub Projects V2 に追加し、カスタムフィールドを設定
 *
 * Usage:
 *   node migrate-plane-to-github.cjs --dry-run    # プレビュー（変更なし）
 *   node migrate-plane-to-github.cjs              # 実行
 *   node migrate-plane-to-github.cjs --skip-done  # Done を除外して移行
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Plane API Client
const planeApi = require('../plane/lib/plane-api-client.cjs');

// ============================================================
// 設定
// ============================================================

const GITHUB_OWNER = 'watchout';
const GITHUB_REPO = 'hotel-kanri';
const PROJECT_NUMBER = 3;

// Plane State → GitHub Status マッピング
const STATE_MAP = {
  'Backlog': 'Backlog',
  'Todo': 'Backlog',
  'In Progress': 'In Progress',
  'In Audit': 'In Review',
  'Audit Passed': 'Done',
  'Done': 'Done',
  'Cancelled': null  // 移行しない
};

// ============================================================
// GitHub API ヘルパー
// ============================================================

function gh(args) {
  try {
    const result = execSync(`gh ${args}`, {
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.trim();
  } catch (err) {
    console.error(`  gh command failed: gh ${args}`);
    console.error(`  stderr: ${err.stderr?.trim()}`);
    return null;
  }
}

function ghGraphQL(query) {
  try {
    const result = execSync(
      `gh api graphql -f query='${query.replace(/'/g, "'\\''")}'`,
      { encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return JSON.parse(result);
  } catch (err) {
    console.error(`  GraphQL failed: ${err.stderr?.trim()}`);
    return null;
  }
}

// ============================================================
// DEV番号抽出
// ============================================================

function extractDevNumber(name) {
  const match = name?.match(/\[DEV-(\d+)\]/);
  return match ? `DEV-${match[1]}` : null;
}

function extractPhase(name) {
  const match = name?.match(/\[Phase\s*(\d+)\]/i);
  if (match) return `Phase ${match[1]}`;
  // MVP = Phase 1 相当
  if (name?.includes('[MVP]')) return 'Phase 1';
  return null;
}

// ============================================================
// メイン処理
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const skipDone = args.includes('--skip-done');

  console.log('=== Plane → GitHub Projects V2 移行 ===');
  console.log(`モード: ${dryRun ? 'DRY RUN（変更なし）' : '本番実行'}`);
  console.log(`Done スキップ: ${skipDone ? 'はい' : 'いいえ'}`);
  console.log('');

  // -------------------------------------------------------
  // Step 1: Plane データ取得
  // -------------------------------------------------------
  console.log('[Step 1] Plane データ取得...');
  const config = planeApi.getPlaneConfig();

  // States 取得
  const statesEndpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/states/`;
  const statesRes = await planeApi.request('GET', statesEndpoint);
  const stateList = statesRes.results || statesRes;
  const stateMap = {};
  if (Array.isArray(stateList)) {
    stateList.forEach(s => { stateMap[s.id] = s.name; });
  }

  // Issues 取得
  const issuesEndpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  const issuesRes = await planeApi.request('GET', issuesEndpoint);
  const allIssues = issuesRes.results || issuesRes;

  console.log(`  取得: ${allIssues.length} 件`);

  // フィルタリング
  let issues = allIssues.filter(i => {
    const stateName = stateMap[i.state];
    if (stateName === 'Cancelled') return false;
    if (skipDone && stateName === 'Done') return false;
    return true;
  });

  // DEV番号順でソート
  issues.sort((a, b) => {
    const aNum = parseInt(extractDevNumber(a.name)?.replace('DEV-', '') || '9999');
    const bNum = parseInt(extractDevNumber(b.name)?.replace('DEV-', '') || '9999');
    return aNum - bNum;
  });

  console.log(`  移行対象: ${issues.length} 件`);
  console.log('');

  // -------------------------------------------------------
  // Step 2: エクスポートデータ保存
  // -------------------------------------------------------
  const exportData = issues.map(i => ({
    planeId: i.id,
    sequenceId: i.sequence_id,
    devNumber: extractDevNumber(i.name),
    title: i.name,
    state: stateMap[i.state] || 'Unknown',
    githubStatus: STATE_MAP[stateMap[i.state]] || 'Backlog',
    phase: extractPhase(i.name),
    priority: i.priority,
    parentId: i.parent,
    description: i.description_html || '',
  }));

  const exportPath = path.join(__dirname, 'plane-export.json');
  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  console.log(`[Step 2] エクスポート保存: ${exportPath}`);
  console.log('');

  if (dryRun) {
    console.log('[DRY RUN] 移行対象サマリー:');
    const summary = {};
    exportData.forEach(d => {
      summary[d.githubStatus] = (summary[d.githubStatus] || 0) + 1;
    });
    console.log('  ステータス別:');
    Object.entries(summary).forEach(([k, v]) => console.log(`    ${k}: ${v}`));
    console.log('');
    console.log('  先頭10件:');
    exportData.slice(0, 10).forEach(d => {
      console.log(`    ${d.devNumber || 'N/A'} | ${d.githubStatus} | ${d.title.substring(0, 60)}`);
    });
    console.log('');
    console.log('[DRY RUN] 完了。--dry-run を外して実行してください。');
    return;
  }

  // -------------------------------------------------------
  // Step 3: GitHub Issues 作成 & Project 追加
  // -------------------------------------------------------
  console.log('[Step 3] GitHub Issues 作成...');

  // Project のフィールドID取得
  const fieldsRes = ghGraphQL(`
    {
      user(login: "${GITHUB_OWNER}") {
        projectV2(number: ${PROJECT_NUMBER}) {
          id
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `);

  if (!fieldsRes?.data?.user?.projectV2) {
    console.error('Project フィールド取得失敗');
    process.exit(1);
  }

  const projectId = fieldsRes.data.user.projectV2.id;
  let devNumberFieldId = null;
  let phaseFieldId = null;
  let phaseOptions = {};
  let statusFieldId = null;
  let statusOptions = {};
  let ssotFieldId = null;

  const fields = fieldsRes.data.user.projectV2.fields?.nodes || [];
  fields.forEach(f => {
    if (f.name === 'DEV Number') {
      devNumberFieldId = f.id;
    }
    if (f.name === 'Phase' && f.options) {
      phaseFieldId = f.id;
      f.options.forEach(o => { phaseOptions[o.name] = o.id; });
    }
    if (f.name === 'Status' && f.options) {
      statusFieldId = f.id;
      f.options.forEach(o => { statusOptions[o.name] = o.id; });
    }
    if (f.name === 'SSOT') {
      ssotFieldId = f.id;
    }
  });

  console.log(`  Project ID: ${projectId}`);
  console.log(`  Status options: ${JSON.stringify(statusOptions)}`);
  console.log(`  Phase options: ${JSON.stringify(phaseOptions)}`);
  console.log('');

  // 移行結果追跡
  const results = [];
  let created = 0;
  let failed = 0;

  for (let idx = 0; idx < issues.length; idx++) {
    const issue = issues[idx];
    const data = exportData[idx];
    const progress = `[${idx + 1}/${issues.length}]`;

    // Issue タイトル（DEV番号をそのまま維持）
    const title = issue.name;

    // Issue ボディ（HTMLタグを除去してプレーンテキスト化）
    const descPlain = (data.description || '')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
      .trim();
    const body = [
      `**Plane 移行元**: sequence_id=${issue.sequence_id}`,
      '',
      descPlain ? '---' : '',
      descPlain
    ].join('\n').trim();

    // ボディをファイル経由で渡す（特殊文字エスケープ問題回避）
    const bodyFile = path.join(__dirname, '.tmp-issue-body.md');
    fs.writeFileSync(bodyFile, body);

    // GitHub Issue 作成
    console.log(`${progress} Creating: ${data.devNumber || 'N/A'} - ${title.substring(0, 50)}...`);

    const escapedTitle = title.replace(/"/g, '\\"');
    const issueUrl = gh(
      `issue create --repo ${GITHUB_OWNER}/${GITHUB_REPO} --title "${escapedTitle}" --body-file "${bodyFile}"`
    );

    if (!issueUrl) {
      console.log(`  ❌ Issue 作成失敗`);
      failed++;
      results.push({ ...data, githubIssue: null, error: 'create failed' });
      continue;
    }

    // Issue番号抽出
    const issueNumber = issueUrl.match(/\/issues\/(\d+)/)?.[1];
    if (!issueNumber) {
      console.log(`  ❌ Issue 番号取得失敗: ${issueUrl}`);
      failed++;
      results.push({ ...data, githubIssue: issueUrl, error: 'number parse failed' });
      continue;
    }

    // Project に追加
    const addResult = gh(
      `project item-add ${PROJECT_NUMBER} --owner @me --url ${issueUrl} --format json`
    );

    let itemId = null;
    if (addResult) {
      try {
        const addJson = JSON.parse(addResult);
        itemId = addJson.id;
      } catch { /* ignore parse error */ }
    }

    if (!itemId) {
      console.log(`  ⚠️ Project追加失敗またはItem ID取得失敗（Issue: #${issueNumber}）`);
    } else {
      // カスタムフィールド設定
      // DEV Number
      if (data.devNumber && devNumberFieldId) {
        ghGraphQL(`mutation { updateProjectV2ItemFieldValue(input: { projectId: "${projectId}", itemId: "${itemId}", fieldId: "${devNumberFieldId}", value: { text: "${data.devNumber}" } }) { projectV2Item { id } } }`);
      }
      // Phase
      if (data.phase && phaseFieldId && phaseOptions[data.phase]) {
        ghGraphQL(`mutation { updateProjectV2ItemFieldValue(input: { projectId: "${projectId}", itemId: "${itemId}", fieldId: "${phaseFieldId}", value: { singleSelectOptionId: "${phaseOptions[data.phase]}" } }) { projectV2Item { id } } }`);
      }
      // Status
      if (data.githubStatus && statusFieldId && statusOptions[data.githubStatus]) {
        ghGraphQL(`mutation { updateProjectV2ItemFieldValue(input: { projectId: "${projectId}", itemId: "${itemId}", fieldId: "${statusFieldId}", value: { singleSelectOptionId: "${statusOptions[data.githubStatus]}" } }) { projectV2Item { id } } }`);
      }
    }

    created++;
    results.push({ ...data, githubIssue: `#${issueNumber}`, githubUrl: issueUrl, itemId });

    // Rate limit 対策
    if (idx % 10 === 9) {
      console.log('  (rate limit pause: 5s)');
      await new Promise(r => setTimeout(r, 5000));
    } else {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // -------------------------------------------------------
  // Step 4: 結果レポート
  // -------------------------------------------------------
  console.log('');
  console.log('=== 移行結果 ===');
  console.log(`  作成成功: ${created}`);
  console.log(`  失敗: ${failed}`);
  console.log(`  合計: ${issues.length}`);

  const resultPath = path.join(__dirname, 'migration-result.json');
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  console.log(`  結果ファイル: ${resultPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
