#!/usr/bin/env node
/**
 * backfill-plane-ssot-links.cjs
 *
 * 親タスク（DEV番号末尾0）のdescription_htmlに ssot: ブロックを一括追記する。
 *
 * 紐付けロジック:
 *   1. 親タスク配下のサブタスク（parentリレーション優先、無ければDEVレンジ+1..+9）を取得
 *   2. 親+サブ全てのDEV/COM番号を収集
 *   3. docs/03_ssot/ 配下の全SSOT_*.mdを走査し、本文にそれらDEV/COM番号が明示的に登場するものだけを候補とする
 *   4. 候補0件 → missing、候補10件超 → ambiguous、それ以外 → 追記対象
 *
 * Usage:
 *   node scripts/auto-dev/backfill-plane-ssot-links.cjs --dry-run         # デフォルト: 更新しない
 *   node scripts/auto-dev/backfill-plane-ssot-links.cjs --apply           # 実際に追記
 *   node scripts/auto-dev/backfill-plane-ssot-links.cjs --dry-run --min-dev 170 --max-dev 200
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

// 環境変数読み込み
const envPath = path.join(ROOT, '.env.mcp');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim();
      if (value.endsWith('\\')) value = value.slice(0, -1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key.trim()] = value;
    }
  });
}

const planeApi = require('../plane/lib/plane-api-client.cjs');

// ===== CLI引数解析 =====
const args = process.argv.slice(2);
const MODE = args.includes('--apply') ? 'apply' : 'dry-run';
const MIN_DEV = (() => {
  const idx = args.indexOf('--min-dev');
  return idx >= 0 && args[idx + 1] ? Number(args[idx + 1]) : 100;
})();
const MAX_DEV = (() => {
  const idx = args.indexOf('--max-dev');
  return idx >= 0 && args[idx + 1] ? Number(args[idx + 1]) : 99999;
})();
const MAX_CANDIDATES = 10; // これ超えたらambiguous

// ===== SSOT走査 =====
function listSsotFiles() {
  const ssotDir = path.join(ROOT, 'docs/03_ssot');
  const results = [];
  const stack = [ssotDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (entry.isFile() && entry.name.startsWith('SSOT_') && entry.name.endsWith('.md')) {
        const relativePath = full.replace(ROOT + '/', '');
        results.push({ relativePath, absolutePath: full });
      }
    }
  }
  return results;
}

/**
 * SSOT本文中に明示的に登場するDEV/COM番号を抽出する
 */
function extractIdsFromContent(content) {
  const s = String(content || '');
  const devIds = new Set((s.match(/\bDEV-\d{3,6}\b/gi) || []).map(x => x.toUpperCase()));
  const comIds = new Set((s.match(/\bCOM-\d{1,6}\b/gi) || []).map(x => x.toUpperCase()));
  return { devIds, comIds };
}

/**
 * 全SSOTファイルを読み込み、各ファイルが参照するDEV/COM番号のインデックスを構築する
 * 返却: Map<relativePath, { devIds: Set, comIds: Set }>
 */
function buildSsotIndex(ssotFiles) {
  const index = new Map();
  for (const { relativePath, absolutePath } of ssotFiles) {
    let content;
    try { content = fs.readFileSync(absolutePath, 'utf8'); } catch { continue; }
    const { devIds, comIds } = extractIdsFromContent(content);
    index.set(relativePath, { devIds, comIds });
  }
  return index;
}

// ===== Plane Issue解析 =====
function parseDevNumber(name) {
  const m = String(name || '').match(/\[DEV-(\d+)\]/i);
  return m ? Number(m[1]) : null;
}

function isParentTask(devNo) {
  return devNo !== null && devNo >= MIN_DEV && devNo <= MAX_DEV && devNo % 10 === 0;
}

function stripHtmlToText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

function descriptionContainsSsot(issue) {
  const desc = String(issue.description || '');
  const html = stripHtmlToText(issue.description_html || '');
  const combined = desc + '\n' + html;
  return /\bssot:/i.test(combined);
}

// ===== サブタスク取得 =====
function getSubIssues(parentIssue, allIssues) {
  // 1) parentリレーションがあればそれを優先
  const byParent = allIssues.filter(i => i.parent === parentIssue.id);
  if (byParent.length > 0) {
    return byParent
      .slice()
      .sort((a, b) => (parseDevNumber(a.name) || 0) - (parseDevNumber(b.name) || 0));
  }

  // 2) フォールバック: DEV-0170 -> 0171..0179 をレンジ抽出
  const parentDev = parseDevNumber(parentIssue.name);
  if (!parentDev) return [];
  const rangeStart = parentDev + 1;
  const rangeEnd = parentDev + 9;
  return allIssues
    .filter(i => {
      const n = parseDevNumber(i.name);
      return n && n >= rangeStart && n <= rangeEnd;
    })
    .sort((a, b) => (parseDevNumber(a.name) || 0) - (parseDevNumber(b.name) || 0));
}

/**
 * 親+サブの全DEV/COM番号を収集
 */
function collectTaskIds(parentIssue, subIssues) {
  const allNames = [parentIssue.name, ...(subIssues || []).map(i => i.name)].join('\n');
  const { devIds, comIds } = extractIdsFromContent(allNames);
  return { devIds, comIds };
}

/**
 * SSOTインデックスから、指定されたDEV/COM番号セットに一致するSSOTを検索する
 * 条件: SSOTの本文に「タスク配下のDEV/COM番号のいずれか」が明示的に登場する
 */
function findMatchingSsots(taskDevIds, taskComIds, ssotIndex) {
  const matches = [];
  for (const [relativePath, ssotIds] of ssotIndex) {
    let matched = false;
    // DEV番号の交差
    for (const devId of taskDevIds) {
      if (ssotIds.devIds.has(devId)) { matched = true; break; }
    }
    if (!matched) {
      // COM番号の交差
      for (const comId of taskComIds) {
        if (ssotIds.comIds.has(comId)) { matched = true; break; }
      }
    }
    if (matched) {
      matches.push(relativePath);
    }
  }
  return matches.sort();
}

/**
 * description_htmlに ssot: ブロックを追記する
 */
function buildUpdatedDescriptionHtml(currentHtml, ssotPaths) {
  const ssotBlock = [
    '---',
    'ssot:',
    ...ssotPaths.map(p => `- ${p}`)
  ].join('\n');

  const current = String(currentHtml || '').trim();
  if (!current) {
    return ssotBlock.replace(/\n/g, '<br>');
  }
  return current + '<br><br>' + ssotBlock.replace(/\n/g, '<br>');
}

// ===== メイン処理 =====
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  SSOT Backfill: 親タスクへの確定リンク追記              ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`モード: ${MODE === 'apply' ? '🔥 APPLY（実際に更新）' : '🔍 DRY-RUN（更新なし）'}`);
  console.log(`DEV範囲: ${MIN_DEV}〜${MAX_DEV}`);
  console.log(`最大候補数: ${MAX_CANDIDATES}（超えたらambiguous）\n`);

  // 1. SSOTファイル走査 & インデックス構築
  console.log('📂 SSOTファイル走査中...');
  const ssotFiles = listSsotFiles();
  console.log(`   ${ssotFiles.length} 件のSSOT_*.mdを検出`);

  console.log('📊 DEV/COM参照インデックス構築中...');
  const ssotIndex = buildSsotIndex(ssotFiles);
  // インデックスの統計
  let totalDevRefs = 0;
  let totalComRefs = 0;
  for (const [, ids] of ssotIndex) {
    totalDevRefs += ids.devIds.size;
    totalComRefs += ids.comIds.size;
  }
  console.log(`   DEV参照: ${totalDevRefs}件, COM参照: ${totalComRefs}件\n`);

  // 2. Planeタスク取得
  console.log('📋 Planeタスク取得中...');
  const config = planeApi.getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  const result = await planeApi.request('GET', endpoint);
  const allIssues = result.results || result;
  console.log(`   ${allIssues.length} 件のタスク取得\n`);

  // 3. 親タスク抽出
  const parentIssues = allIssues
    .filter(i => {
      const devNo = parseDevNumber(i.name);
      return isParentTask(devNo);
    })
    .sort((a, b) => (parseDevNumber(a.name) || 0) - (parseDevNumber(b.name) || 0));

  console.log(`🎯 対象の親タスク: ${parentIssues.length} 件\n`);

  // 4. 親タスクごとにSSOT候補を検索
  const report = {
    timestamp: new Date().toISOString(),
    mode: MODE,
    devRange: { min: MIN_DEV, max: MAX_DEV },
    updated: [],       // 更新成功
    skipped: [],       // 既にssot:あり
    missing: [],       // 候補0件
    ambiguous: [],     // 候補多すぎ
    errors: [],        // 更新失敗
    summary: {}
  };

  for (const parentIssue of parentIssues) {
    const devNo = parseDevNumber(parentIssue.name);
    const devId = `DEV-${String(devNo).padStart(4, '0')}`;

    // 既にssot:が含まれている場合はスキップ
    if (descriptionContainsSsot(parentIssue)) {
      report.skipped.push({
        devId,
        issueId: parentIssue.id,
        name: parentIssue.name
      });
      continue;
    }

    // サブタスクを取得
    const subIssues = getSubIssues(parentIssue, allIssues);

    // 全DEV/COM番号を収集
    const { devIds, comIds } = collectTaskIds(parentIssue, subIssues);

    // SSOTインデックスから候補検索
    const candidates = findMatchingSsots(devIds, comIds, ssotIndex);

    if (candidates.length === 0) {
      report.missing.push({
        devId,
        issueId: parentIssue.id,
        name: parentIssue.name,
        searchedDevIds: [...devIds],
        searchedComIds: [...comIds],
        subTaskCount: subIssues.length
      });
      console.log(`❓ ${devId}: ${parentIssue.name.substring(0, 50)} → missing (0候補)`);
      continue;
    }

    if (candidates.length > MAX_CANDIDATES) {
      report.ambiguous.push({
        devId,
        issueId: parentIssue.id,
        name: parentIssue.name,
        candidateCount: candidates.length,
        candidates: candidates.slice(0, 15),
        searchedDevIds: [...devIds],
        searchedComIds: [...comIds]
      });
      console.log(`⚠️  ${devId}: ${parentIssue.name.substring(0, 50)} → ambiguous (${candidates.length}候補)`);
      continue;
    }

    // 追記対象
    console.log(`✅ ${devId}: ${parentIssue.name.substring(0, 50)}`);
    for (const c of candidates) {
      console.log(`   → ${c}`);
    }

    if (MODE === 'apply') {
      try {
        const newHtml = buildUpdatedDescriptionHtml(parentIssue.description_html, candidates);
        const updateEndpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/${parentIssue.id}/`;
        await planeApi.request('PATCH', updateEndpoint, {
          description_html: newHtml
        });
        report.updated.push({
          devId,
          issueId: parentIssue.id,
          name: parentIssue.name,
          ssotPaths: candidates
        });
        console.log(`   ✅ Plane更新完了`);
      } catch (e) {
        report.errors.push({
          devId,
          issueId: parentIssue.id,
          name: parentIssue.name,
          error: e.message,
          ssotPaths: candidates
        });
        console.log(`   ❌ 更新失敗: ${e.message}`);
      }
    } else {
      report.updated.push({
        devId,
        issueId: parentIssue.id,
        name: parentIssue.name,
        ssotPaths: candidates
      });
    }
  }

  // 5. サマリー
  report.summary = {
    totalParentTasks: parentIssues.length,
    updated: report.updated.length,
    skipped: report.skipped.length,
    missing: report.missing.length,
    ambiguous: report.ambiguous.length,
    errors: report.errors.length
  };

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║  結果サマリー                                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`親タスク合計: ${report.summary.totalParentTasks}`);
  console.log(`✅ 更新${MODE === 'apply' ? '成功' : '予定'}: ${report.summary.updated}`);
  console.log(`📎 スキップ（既にssot:あり）: ${report.summary.skipped}`);
  console.log(`❓ missing（候補0件）: ${report.summary.missing}`);
  console.log(`⚠️  ambiguous（候補${MAX_CANDIDATES}件超）: ${report.summary.ambiguous}`);
  console.log(`❌ エラー: ${report.summary.errors}`);

  if (report.missing.length > 0) {
    console.log('\n--- missing 一覧（ssot:の追加が必要） ---');
    for (const item of report.missing) {
      console.log(`  ${item.devId}: ${item.name.substring(0, 60)}`);
      console.log(`    検索DEV: ${item.searchedDevIds.join(', ') || '(なし)'}`);
      console.log(`    検索COM: ${item.searchedComIds.join(', ') || '(なし)'}`);
    }
  }

  if (report.ambiguous.length > 0) {
    console.log('\n--- ambiguous 一覧（候補が多すぎ） ---');
    for (const item of report.ambiguous) {
      console.log(`  ${item.devId}: ${item.name.substring(0, 60)} (${item.candidateCount}候補)`);
    }
  }

  // 6. 結果JSON保存
  const evidenceDir = path.join(ROOT, 'evidence/auto-dev');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
  const resultPath = path.join(evidenceDir, 'ssot-link-result.json');
  fs.writeFileSync(resultPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 結果保存: ${resultPath}`);
}

main().catch(err => {
  console.error('❌ 致命的エラー:', err.message);
  process.exit(1);
});
