#!/usr/bin/env node
/**
 * Plane → task-queue.json 同期スクリプト
 * 
 * PlaneのBacklogタスクをtask-queue.jsonに同期する
 * 
 * Usage:
 *   node sync-plane-to-queue.cjs           # Backlogタスクを同期
 *   node sync-plane-to-queue.cjs --all     # 全タスクを表示
 *   node sync-plane-to-queue.cjs --dry-run # 実際には同期しない
 *   node sync-plane-to-queue.cjs --no-ssot-check # SSOT未定義でも同期（自動生成に任せる）
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ===== 設定 =====
const QUEUE_FILE = path.join(__dirname, '../../task-queue.json');
const SSOT_BASE_DIR = path.join(__dirname, '../../docs/03_ssot');

// Plane APIクライアント読み込み
let planeApi;
try {
  planeApi = require('../plane/lib/plane-api-client.cjs');
} catch (error) {
  console.error('❌ Plane APIクライアントの読み込みに失敗:', error.message);
  process.exit(1);
}

// ===== ユーティリティ =====

function log(message, level = 'INFO') {
  const emoji = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌',
    SYNC: '🔄'
  }[level] || 'ℹ️';
  console.log(`${emoji} ${message}`);
}

function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) {
    return {
      version: '1.0.0',
      queue: [],
      processing: null,
      completed: [],
      failed: [],
      config: {
        maxRetries: 3,
        ssotRequired: true,
        autoPlaneSync: true
      }
    };
  }
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2) + '\n');
}

/**
 * DEV番号を抽出
 */
function extractDevNumber(name) {
  const match = name.match(/\[DEV-(\d+)\]/);
  return match ? `DEV-${match[1]}` : null;
}

/**
 * SSOTパスを抽出（Description内）
 */
function extractSsotPath(description) {
  if (!description) return null;
  
  // docs/03_ssot/.../*.md 形式を探す
  const match = description.match(/docs\/03_ssot\/[^\s"<>\]]+\.md/);
  if (match) {
    return match[0];
  }
  
  // SSOT_XXX.md 形式を探す
  const ssotMatch = description.match(/SSOT_[A-Z_]+\.md/);
  if (ssotMatch) {
    // ファイルを検索
    const ssotName = ssotMatch[0];
    const searchDirs = [
      '00_foundation',
      '01_admin_features',
      '02_guest_features',
      '03_marketing'
    ];
    
    for (const dir of searchDirs) {
      const fullPath = path.join(SSOT_BASE_DIR, dir, ssotName);
      if (fs.existsSync(fullPath)) {
        return `docs/03_ssot/${dir}/${ssotName}`;
      }
    }
  }
  
  return null;
}

/**
 * タスクの優先度を計算
 */
function calculatePriority(issue) {
  // Phase番号があれば優先度に反映
  const phaseMatch = issue.name.match(/\[Phase\s*(\d+)\]/i);
  const phase = phaseMatch ? parseInt(phaseMatch[1]) : 5;
  
  // DEV番号（小さいほど優先）
  const devMatch = issue.name.match(/\[DEV-(\d+)\]/);
  const devNo = devMatch ? parseInt(devMatch[1]) : 9999;
  
  // 優先度計算: Phase * 1000 + DEV番号
  return phase * 1000 + devNo;
}

/**
 * 全Issueを取得
 */
async function listAllIssues() {
  const config = planeApi.getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  const result = await planeApi.request('GET', endpoint);
  return result.results || result;
}

/**
 * Backlog状態のIssueを取得
 */
async function getBacklogIssues() {
  try {
    const issues = await listAllIssues();
    
    // Backlog状態のみフィルタ
    const backlogIssues = issues.filter(issue => {
      const stateName = issue.state_detail?.name || issue.state?.name || '';
      return stateName.toLowerCase() === 'backlog';
    });
    
    return backlogIssues;
  } catch (error) {
    log(`Plane API エラー: ${error.message}`, 'ERROR');
    return [];
  }
}

/**
 * メイン同期処理
 */
async function syncPlaneToQueue(options = {}) {
  const { dryRun = false, showAll = false, noSsotCheck = false } = options;
  
  log('Planeからタスクを取得中...', 'SYNC');
  
  const issues = showAll ? await listAllIssues() : await getBacklogIssues();
  
  if (issues.length === 0) {
    log('同期対象のタスクがありません', 'INFO');
    return;
  }
  
  log(`${issues.length} 件のタスクを取得`, 'INFO');
  
  const queue = loadQueue();
  let addedCount = 0;
  let skippedCount = 0;
  let errors = [];
  
  for (const issue of issues) {
    const devNumber = extractDevNumber(issue.name);
    
    if (!devNumber) {
      log(`DEV番号なし: ${issue.name}`, 'WARNING');
      skippedCount++;
      continue;
    }
    
    // 既にキューにあるかチェック
    const existsInQueue = queue.queue.find(t => t.id === devNumber);
    const existsInProcessing = queue.processing?.id === devNumber;
    const existsInCompleted = queue.completed.find(t => t.id === devNumber);
    
    if (existsInQueue || existsInProcessing || existsInCompleted) {
      log(`スキップ (既存): ${devNumber}`, 'INFO');
      skippedCount++;
      continue;
    }
    
    // SSOTパスを抽出
    const ssotPath = extractSsotPath(issue.description_html || issue.description || '');
    
    // SSOT必須チェック（--no-ssot-check時はスキップ、run-task.cjsで自動生成）
    if (!noSsotCheck && queue.config.ssotRequired && !ssotPath) {
      log(`スキップ (SSOT未定義): ${devNumber} - ${issue.name}`, 'WARNING');
      errors.push({
        id: devNumber,
        name: issue.name,
        reason: 'SSOT未定義（--no-ssot-checkで同期可能、run-task.cjsで自動生成）'
      });
      continue;
    }
    
    // SSOTファイル存在チェック（--no-ssot-check時はスキップ）
    if (!noSsotCheck && ssotPath) {
      const fullPath = path.join(__dirname, '../..', ssotPath);
      if (!fs.existsSync(fullPath)) {
        log(`スキップ (SSOTファイル不在): ${devNumber} - ${ssotPath}`, 'WARNING');
        errors.push({
          id: devNumber,
          name: issue.name,
          reason: `SSOTファイル不在: ${ssotPath}（--no-ssot-checkで同期可能）`
        });
        continue;
      }
    }
    
    // SSOT未定義でも同期した場合のフラグ
    const needsSsotGeneration = !ssotPath;
    
    // タスク追加
    const task = {
      id: devNumber,
      priority: calculatePriority(issue),
      status: 'pending',
      ssot: ssotPath,
      needsSsotGeneration, // run-task.cjsでSSOT自動生成が必要
      planeIssueId: issue.id,
      planeName: issue.name,
      createdAt: new Date().toISOString(),
      retryCount: 0
    };
    
    if (dryRun) {
      log(`(dry-run) 追加予定: ${devNumber} - ${issue.name}`, 'INFO');
      console.log(`   SSOT: ${ssotPath || '未定義'}`);
    } else {
      queue.queue.push(task);
      log(`追加: ${devNumber}`, 'SUCCESS');
    }
    addedCount++;
  }
  
  // 優先度でソート
  queue.queue.sort((a, b) => a.priority - b.priority);
  
  if (!dryRun) {
    saveQueue(queue);
  }
  
  // サマリー
  console.log('\n' + '━'.repeat(50));
  console.log('📊 同期結果');
  console.log('━'.repeat(50));
  console.log(`追加:     ${addedCount} 件${dryRun ? ' (dry-run)' : ''}`);
  console.log(`スキップ: ${skippedCount} 件`);
  console.log(`エラー:   ${errors.length} 件`);
  
  if (errors.length > 0) {
    console.log('\n⚠️ エラー詳細:');
    errors.forEach(e => {
      console.log(`   - ${e.id}: ${e.reason}`);
    });
  }
  
  console.log('━'.repeat(50));
  
  // 現在のキュー状態
  if (!dryRun) {
    console.log(`\n現在のキュー: ${queue.queue.length} 件待機中`);
  }
}

/**
 * PRマージ時にPlane Issueを更新
 */
async function updatePlaneOnMerge(taskId) {
  const queue = loadQueue();
  
  // 完了済みタスクを検索
  const completedTask = queue.completed.find(t => t.id === taskId);
  
  if (!completedTask || !completedTask.planeIssueId) {
    log(`タスク ${taskId} のPlane Issue IDが見つかりません`, 'ERROR');
    return false;
  }
  
  try {
    // Done状態のIDを取得
    const states = await planeApi.getStates();
    const doneState = states.find(s => s.name.toLowerCase() === 'done');
    
    if (!doneState) {
      log('Done状態が見つかりません', 'ERROR');
      return false;
    }
    
    // Issue更新
    await planeApi.updateIssue(completedTask.planeIssueId, {
      state: doneState.id
    });
    
    log(`Plane Issue ${taskId} を Done に更新しました`, 'SUCCESS');
    return true;
  } catch (error) {
    log(`Plane更新エラー: ${error.message}`, 'ERROR');
    return false;
  }
}

// ===== メイン =====

async function main() {
  const args = process.argv.slice(2);
  
  const options = {
    dryRun: args.includes('--dry-run'),
    showAll: args.includes('--all'),
    noSsotCheck: args.includes('--no-ssot-check')
  };
  
  // コマンド解析
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Plane → task-queue.json 同期スクリプト

Usage:
  node sync-plane-to-queue.cjs [options]

Options:
  --dry-run        実際には同期しない（確認のみ）
  --all            Backlog以外のタスクも表示
  --no-ssot-check  SSOT未定義でも同期（run-task.cjsで自動生成）
  --help, -h       ヘルプを表示

Examples:
  node sync-plane-to-queue.cjs                   # Backlogタスクを同期（SSOT必須）
  node sync-plane-to-queue.cjs --no-ssot-check   # SSOT未定義でも同期（自動生成）
  node sync-plane-to-queue.cjs --dry-run         # 確認のみ
`);
    return;
  }
  
  // update-plane コマンド
  if (args[0] === 'update-plane' && args[1]) {
    await updatePlaneOnMerge(args[1]);
    return;
  }
  
  await syncPlaneToQueue(options);
}

main().catch(error => {
  console.error('❌ エラー:', error.message);
  process.exit(1);
});
