#!/usr/bin/env node
/**
 * タスクキュー管理スクリプト
 * 
 * Claude.ai バックグラウンドタスク用のキューを管理
 * 
 * Usage:
 *   node queue-manager.cjs add DEV-0175 --ssot docs/03_ssot/01_admin_features/SSOT_XXX.md
 *   node queue-manager.cjs list
 *   node queue-manager.cjs next
 *   node queue-manager.cjs start DEV-0175
 *   node queue-manager.cjs complete DEV-0175
 *   node queue-manager.cjs fail DEV-0175 --reason "CI failed"
 *   node queue-manager.cjs sync-plane
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ===== 設定 =====
const QUEUE_FILE = path.join(__dirname, '../../task-queue.json');
const PLANE_SCRIPT = path.join(__dirname, '../plane/get-next-task.cjs');

// ===== ユーティリティ =====

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

function log(message, level = 'INFO') {
  const emoji = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌'
  }[level] || 'ℹ️';
  console.log(`${emoji} ${message}`);
}

// ===== コマンド =====

/**
 * タスクをキューに追加
 */
function addTask(taskId, options = {}) {
  const queue = loadQueue();
  
  // 重複チェック
  const exists = queue.queue.find(t => t.id === taskId) ||
                 queue.processing?.id === taskId ||
                 queue.completed.find(t => t.id === taskId);
  
  if (exists) {
    log(`タスク ${taskId} は既にキューに存在します`, 'WARNING');
    return false;
  }
  
  // SSOT必須チェック
  if (queue.config.ssotRequired && !options.ssot) {
    log(`SSOT パスが必須です: --ssot docs/03_ssot/...`, 'ERROR');
    return false;
  }
  
  // SSOTファイル存在チェック
  if (options.ssot) {
    const ssotPath = path.join(__dirname, '../..', options.ssot);
    if (!fs.existsSync(ssotPath)) {
      log(`SSOT ファイルが見つかりません: ${options.ssot}`, 'ERROR');
      return false;
    }
  }
  
  const task = {
    id: taskId,
    priority: options.priority || 1,
    status: 'pending',
    ssot: options.ssot || null,
    planeIssueId: options.planeIssueId || null,
    createdAt: new Date().toISOString(),
    retryCount: 0
  };
  
  queue.queue.push(task);
  queue.queue.sort((a, b) => a.priority - b.priority);
  
  saveQueue(queue);
  log(`タスク ${taskId} をキューに追加しました`, 'SUCCESS');
  return true;
}

/**
 * キュー一覧を表示
 */
function listQueue() {
  const queue = loadQueue();
  
  console.log('\n📋 タスクキュー状態\n');
  console.log('━'.repeat(60));
  
  // 処理中
  if (queue.processing) {
    console.log('\n🔄 処理中:');
    console.log(`   ${queue.processing.id} (開始: ${queue.processing.startedAt})`);
    if (queue.processing.ssot) {
      console.log(`   SSOT: ${queue.processing.ssot}`);
    }
  }
  
  // 待機中
  console.log('\n⏳ 待機中:');
  if (queue.queue.length === 0) {
    console.log('   (なし)');
  } else {
    queue.queue.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.id} (優先度: ${task.priority})`);
      if (task.ssot) {
        console.log(`      SSOT: ${task.ssot}`);
      }
    });
  }
  
  // 完了
  console.log('\n✅ 完了 (直近5件):');
  const recentCompleted = queue.completed.slice(-5).reverse();
  if (recentCompleted.length === 0) {
    console.log('   (なし)');
  } else {
    recentCompleted.forEach(task => {
      console.log(`   - ${task.id} (完了: ${task.completedAt})`);
    });
  }
  
  // 失敗
  if (queue.failed.length > 0) {
    console.log('\n❌ 失敗:');
    queue.failed.forEach(task => {
      console.log(`   - ${task.id}: ${task.failureReason || '不明'}`);
    });
  }
  
  console.log('\n' + '━'.repeat(60));
  console.log(`合計: 待機 ${queue.queue.length} / 処理中 ${queue.processing ? 1 : 0} / 完了 ${queue.completed.length} / 失敗 ${queue.failed.length}`);
}

/**
 * 次のタスクを取得
 */
function getNextTask() {
  const queue = loadQueue();
  
  if (queue.processing) {
    log(`現在処理中のタスクがあります: ${queue.processing.id}`, 'WARNING');
    return null;
  }
  
  if (queue.queue.length === 0) {
    log('待機中のタスクがありません', 'INFO');
    return null;
  }
  
  const nextTask = queue.queue[0];
  console.log('\n📌 次のタスク:');
  console.log(JSON.stringify(nextTask, null, 2));
  return nextTask;
}

/**
 * タスクの処理を開始
 */
function startTask(taskId) {
  const queue = loadQueue();
  
  if (queue.processing) {
    log(`既に処理中のタスクがあります: ${queue.processing.id}`, 'ERROR');
    return false;
  }
  
  const taskIndex = queue.queue.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    log(`タスク ${taskId} がキューに見つかりません`, 'ERROR');
    return false;
  }
  
  const task = queue.queue.splice(taskIndex, 1)[0];
  task.status = 'processing';
  task.startedAt = new Date().toISOString();
  queue.processing = task;
  
  saveQueue(queue);
  log(`タスク ${taskId} の処理を開始しました`, 'SUCCESS');
  return true;
}

/**
 * タスクを完了
 */
function completeTask(taskId, options = {}) {
  const queue = loadQueue();
  
  if (!queue.processing || queue.processing.id !== taskId) {
    log(`タスク ${taskId} は現在処理中ではありません`, 'ERROR');
    return false;
  }
  
  const task = queue.processing;
  task.status = 'completed';
  task.completedAt = new Date().toISOString();
  task.prUrl = options.prUrl || null;
  task.prNumber = options.prNumber || null;
  
  queue.completed.push(task);
  queue.processing = null;
  
  saveQueue(queue);
  log(`タスク ${taskId} を完了しました`, 'SUCCESS');
  if (task.prUrl) {
    log(`PR: ${task.prUrl}`, 'INFO');
  }
  return true;
}

/**
 * タスクを失敗としてマーク
 */
function failTask(taskId, options = {}) {
  const queue = loadQueue();
  
  if (!queue.processing || queue.processing.id !== taskId) {
    log(`タスク ${taskId} は現在処理中ではありません`, 'ERROR');
    return false;
  }
  
  const task = queue.processing;
  task.retryCount = (task.retryCount || 0) + 1;
  
  // リトライ可能かチェック
  if (task.retryCount < queue.config.maxRetries && !options.noRetry) {
    task.status = 'pending';
    task.lastFailedAt = new Date().toISOString();
    task.lastFailureReason = options.reason || '不明';
    queue.queue.unshift(task); // キューの先頭に戻す
    queue.processing = null;
    
    saveQueue(queue);
    log(`タスク ${taskId} をリトライキューに戻しました (${task.retryCount}/${queue.config.maxRetries})`, 'WARNING');
  } else {
    task.status = 'failed';
    task.failedAt = new Date().toISOString();
    task.failureReason = options.reason || '不明';
    queue.failed.push(task);
    queue.processing = null;
    
    saveQueue(queue);
    log(`タスク ${taskId} を失敗としてマークしました`, 'ERROR');
  }
  
  return true;
}

/**
 * Planeからタスクを同期
 */
async function syncFromPlane() {
  const { execSync } = require('child_process');
  
  try {
    log('Planeからタスクを取得中...', 'INFO');
    
    const result = execSync(`node "${PLANE_SCRIPT}" --json`, {
      encoding: 'utf-8',
      timeout: 30000
    });
    
    const planeTask = JSON.parse(result);
    
    if (!planeTask || !planeTask.id) {
      log('Planeに待機中のタスクがありません', 'INFO');
      return;
    }
    
    // DEV番号を抽出
    const devMatch = planeTask.name.match(/\[DEV-(\d+)\]/);
    if (!devMatch) {
      log(`タスク名にDEV番号がありません: ${planeTask.name}`, 'WARNING');
      return;
    }
    
    const taskId = `DEV-${devMatch[1]}`;
    
    // SSOT参照を抽出（Description内）
    let ssotPath = null;
    if (planeTask.description_html) {
      const ssotMatch = planeTask.description_html.match(/docs\/03_ssot\/[^\s"<]+\.md/);
      if (ssotMatch) {
        ssotPath = ssotMatch[0];
      }
    }
    
    addTask(taskId, {
      ssot: ssotPath,
      planeIssueId: planeTask.id,
      priority: planeTask.priority || 1
    });
    
  } catch (error) {
    log(`Plane同期エラー: ${error.message}`, 'ERROR');
  }
}

/**
 * キューをクリア（確認付き）
 */
function clearQueue(options = {}) {
  if (!options.force) {
    log('キューをクリアするには --force オプションが必要です', 'WARNING');
    return false;
  }
  
  const queue = loadQueue();
  const backup = { ...queue };
  
  queue.queue = [];
  queue.processing = null;
  
  if (options.all) {
    queue.completed = [];
    queue.failed = [];
  }
  
  saveQueue(queue);
  log('キューをクリアしました', 'SUCCESS');
  
  // バックアップを出力
  console.log('\nバックアップ:');
  console.log(JSON.stringify(backup, null, 2));
  
  return true;
}

/**
 * 統計情報を表示
 */
function showStats() {
  const queue = loadQueue();
  
  console.log('\n📊 タスクキュー統計\n');
  console.log('━'.repeat(40));
  console.log(`待機中:     ${queue.queue.length} タスク`);
  console.log(`処理中:     ${queue.processing ? 1 : 0} タスク`);
  console.log(`完了:       ${queue.completed.length} タスク`);
  console.log(`失敗:       ${queue.failed.length} タスク`);
  console.log('━'.repeat(40));
  
  // 成功率
  const total = queue.completed.length + queue.failed.length;
  if (total > 0) {
    const successRate = ((queue.completed.length / total) * 100).toFixed(1);
    console.log(`成功率:     ${successRate}%`);
  }
  
  // 平均処理時間
  if (queue.completed.length > 0) {
    const durations = queue.completed
      .filter(t => t.startedAt && t.completedAt)
      .map(t => new Date(t.completedAt) - new Date(t.startedAt));
    
    if (durations.length > 0) {
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
      const avgMinutes = Math.round(avgDuration / 60000);
      console.log(`平均処理時間: ${avgMinutes} 分`);
    }
  }
}

// ===== メイン =====

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // オプション解析
  const options = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      options[key] = value;
    }
  }
  
  switch (command) {
    case 'add':
      if (!args[1] || args[1].startsWith('--')) {
        log('タスクIDを指定してください: node queue-manager.cjs add DEV-0175', 'ERROR');
        process.exit(1);
      }
      addTask(args[1], options);
      break;
      
    case 'list':
    case 'ls':
      listQueue();
      break;
      
    case 'next':
      getNextTask();
      break;
      
    case 'start':
      if (!args[1]) {
        log('タスクIDを指定してください', 'ERROR');
        process.exit(1);
      }
      startTask(args[1]);
      break;
      
    case 'complete':
    case 'done':
      if (!args[1]) {
        log('タスクIDを指定してください', 'ERROR');
        process.exit(1);
      }
      completeTask(args[1], options);
      break;
      
    case 'fail':
      if (!args[1]) {
        log('タスクIDを指定してください', 'ERROR');
        process.exit(1);
      }
      failTask(args[1], options);
      break;
      
    case 'sync-plane':
    case 'sync':
      syncFromPlane();
      break;
      
    case 'clear':
      clearQueue(options);
      break;
      
    case 'stats':
      showStats();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      console.log(`
タスクキュー管理スクリプト

Usage:
  node queue-manager.cjs <command> [options]

Commands:
  add <taskId>       タスクをキューに追加
    --ssot <path>    SSOTファイルパス（必須）
    --priority <n>   優先度（1が最高、デフォルト: 1）
  
  list, ls           キュー一覧を表示
  next               次のタスクを取得
  start <taskId>     タスクの処理を開始
  complete <taskId>  タスクを完了
    --prUrl <url>    PR URL
    --prNumber <n>   PR番号
  
  fail <taskId>      タスクを失敗としてマーク
    --reason <text>  失敗理由
    --noRetry        リトライしない
  
  sync-plane         Planeからタスクを同期
  clear              キューをクリア
    --force          確認なしで実行
    --all            完了・失敗も含めてクリア
  
  stats              統計情報を表示
  help               ヘルプを表示
`);
      break;
      
    default:
      log(`不明なコマンド: ${command}`, 'ERROR');
      log('ヘルプを表示: node queue-manager.cjs help', 'INFO');
      process.exit(1);
  }
}

main();
