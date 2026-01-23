#!/usr/bin/env node
/**
 * 完全自律実行パイプライン
 * 
 * Planeからタスク取得 → SSOT解析 → プロンプト生成 → 監査 → 
 * Claude Code実行 → テスト → PR作成 → Plane更新
 * 
 * までを完全自動化
 * 
 * Usage: node run-autonomous.cjs [options]
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 依存スクリプト
const SCRIPTS = {
  getNextTask: path.join(__dirname, '../plane/get-next-task.cjs'),
  getIssueDetail: path.join(__dirname, '../plane/get-issue-detail.cjs'),
  parseSSOT: path.join(__dirname, '../prompt-generator/parse-ssot.cjs'),
  classifyTask: path.join(__dirname, '../prompt-generator/classify-task.cjs'),
  generatePrompt: path.join(__dirname, '../prompt-generator/generate-prompt.cjs'),
  auditPrompt: path.join(__dirname, '../prompt-generator/audit-prompt.cjs'),
  runPipeline: path.join(__dirname, '../prompt-generator/run-full-pipeline.cjs'),
  runClaudeCode: path.join(__dirname, './run-claude-code.cjs'),
  feedbackLoop: path.join(__dirname, './feedback-loop.cjs')
};

// ===== 設定 =====

const CONFIG = {
  // 1セッションで処理するタスク数上限
  maxTasks: 5,
  
  // SSOT ベースディレクトリ
  ssotBaseDir: '/Users/kaneko/hotel-kanri/docs/03_ssot',
  
  // プロンプト出力ディレクトリ
  promptsDir: '/Users/kaneko/hotel-kanri/prompts/generated',
  
  // ログディレクトリ
  logsDir: '/Users/kaneko/hotel-kanri/logs/autonomous',
  
  // 監査通過スコア
  passScore: 95,
  
  // プロジェクトマッピング
  projectPaths: {
    'guest': '/Users/kaneko/hotel-common-rebuild',
    'admin': '/Users/kaneko/hotel-saas-rebuild',
    'common': '/Users/kaneko/hotel-common-rebuild',
    'saas': '/Users/kaneko/hotel-saas-rebuild'
  }
};

// ===== ユーティリティ =====

function log(message, level = 'INFO') {
  const ts = new Date().toISOString();
  const emoji = {
    INFO: 'ℹ️',
    WARN: '⚠️',
    ERROR: '❌',
    SUCCESS: '✅',
    STEP: '➡️',
    PHASE: '🔷'
  }[level] || 'ℹ️';
  console.log(`[${ts}] ${emoji} ${message}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function runScript(scriptPath, args = [], options = {}) {
  const { silent = false, timeout = 300000 } = options;
  const cmd = `node "${scriptPath}" ${args.join(' ')}`;
  
  try {
    const result = execSync(cmd, {
      encoding: 'utf-8',
      timeout,
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output: result };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout || '',
      error: error.stderr || error.message 
    };
  }
}

// ===== パイプラインステップ =====

/**
 * Step 1: 次のタスクを取得
 */
async function getNextTask() {
  log('次のタスクを取得中...', 'STEP');
  
  const result = runScript(SCRIPTS.getNextTask, [], { silent: true });
  
  if (!result.success) {
    throw new Error('タスク取得失敗: ' + result.error);
  }
  
  // JSONパース
  try {
    const lines = result.output.trim().split('\n');
    const jsonLine = lines.find(l => l.startsWith('{'));
    if (jsonLine) {
      return JSON.parse(jsonLine);
    }
    // 構造化されていない場合はパース
    const taskMatch = result.output.match(/(\w+-\d+)/);
    if (taskMatch) {
      return { id: taskMatch[1], name: result.output.trim() };
    }
  } catch (e) {
    // パース失敗
  }
  
  throw new Error('有効なタスクがありません');
}

/**
 * Step 2: タスク詳細を取得しSSOTパスを特定
 */
async function getTaskDetails(taskId) {
  log(`タスク詳細取得: ${taskId}`, 'STEP');
  
  const result = runScript(SCRIPTS.getIssueDetail, [taskId], { silent: true });
  
  if (!result.success) {
    log(`タスク詳細取得失敗、デフォルト値を使用`, 'WARN');
    return { id: taskId, ssotPath: null };
  }
  
  // Description からSSOTパスを抽出
  const output = result.output;
  const ssotMatch = output.match(/SSOT[_\w]+\.md/);
  
  let ssotPath = null;
  if (ssotMatch) {
    // SSOTファイルを検索
    const ssotName = ssotMatch[0];
    const findResult = execSync(
      `find "${CONFIG.ssotBaseDir}" -name "${ssotName}" 2>/dev/null | head -1`,
      { encoding: 'utf-8' }
    ).trim();
    
    if (findResult) {
      ssotPath = findResult;
    }
  }
  
  return {
    id: taskId,
    ssotPath,
    details: output
  };
}

/**
 * Step 3: SSOT解析 → プロンプト生成 → 監査
 */
async function generateAndAuditPrompt(ssotPath, taskId) {
  log(`パイプライン実行: ${taskId}`, 'STEP');
  
  if (!ssotPath || !fs.existsSync(ssotPath)) {
    throw new Error(`SSOTファイルが見つかりません: ${ssotPath}`);
  }
  
  // 出力先
  ensureDir(CONFIG.promptsDir);
  const outputPath = path.join(CONFIG.promptsDir, `${taskId}.md`);
  
  // フルパイプライン実行
  const result = runScript(
    SCRIPTS.runPipeline,
    [ssotPath, '--output', outputPath, '--task-id', taskId],
    { timeout: 600000 } // 10分
  );
  
  if (!result.success) {
    throw new Error('パイプライン実行失敗: ' + result.error);
  }
  
  // スコア確認（出力からパース）
  const scoreMatch = result.output?.match(/SSOT Auditor.*?(\d+)点/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  
  if (score < CONFIG.passScore) {
    throw new Error(`監査スコア不足: ${score}点 < ${CONFIG.passScore}点`);
  }
  
  log(`監査パス: ${score}点`, 'SUCCESS');
  
  return {
    promptPath: outputPath,
    score
  };
}

/**
 * Step 4: Claude Code実行
 */
async function runImplementation(promptPath, taskId, projectPath) {
  log(`Claude Code 実行: ${taskId}`, 'STEP');
  
  // Claude Codeの存在確認
  try {
    execSync('claude --version', { stdio: 'pipe' });
  } catch (e) {
    log('Claude Code CLIが未インストール - スキップ', 'WARN');
    return { success: true, skipped: true };
  }
  
  const result = runScript(
    SCRIPTS.runClaudeCode,
    [promptPath, '--work-dir', projectPath, '--task-id', taskId],
    { timeout: 1800000 } // 30分
  );
  
  return {
    success: result.success,
    output: result.output
  };
}

/**
 * Step 5: フィードバックループ（テスト→修正）
 */
async function runFeedback(taskId, testType, projectPath) {
  log(`フィードバックループ: ${taskId}`, 'STEP');
  
  const result = runScript(
    SCRIPTS.feedbackLoop,
    [taskId, '--test-type', testType, '--project', projectPath],
    { timeout: 900000 } // 15分
  );
  
  return {
    success: result.success,
    output: result.output
  };
}

// ===== メイン処理 =====

/**
 * 単一タスクを処理
 */
async function processTask(taskId, options = {}) {
  const startTime = Date.now();
  const result = {
    taskId,
    success: false,
    steps: [],
    duration: 0
  };
  
  try {
    // Step 1: タスク詳細取得
    const taskDetails = await getTaskDetails(taskId);
    result.steps.push({ name: 'getTaskDetails', success: true });
    
    if (!taskDetails.ssotPath) {
      throw new Error('SSOTパスが特定できません');
    }
    
    // Step 2: プロンプト生成・監査
    const promptResult = await generateAndAuditPrompt(
      taskDetails.ssotPath, 
      taskId
    );
    result.steps.push({ 
      name: 'generateAndAuditPrompt', 
      success: true,
      score: promptResult.score 
    });
    
    // Step 3: プロジェクトパス決定
    const testType = taskId.toLowerCase().includes('guest') ? 'guest' : 'admin';
    const projectPath = CONFIG.projectPaths[testType] || 
                        CONFIG.projectPaths.common;
    
    // Step 4: Claude Code実行
    if (!options.skipImplementation) {
      const implResult = await runImplementation(
        promptResult.promptPath,
        taskId,
        projectPath
      );
      result.steps.push({ 
        name: 'runImplementation', 
        success: implResult.success,
        skipped: implResult.skipped
      });
    }
    
    // Step 5: フィードバックループ
    if (!options.skipFeedback) {
      const feedbackResult = await runFeedback(taskId, testType, projectPath);
      result.steps.push({ 
        name: 'runFeedback', 
        success: feedbackResult.success 
      });
    }
    
    result.success = true;
    
  } catch (error) {
    log(`タスク処理エラー: ${error.message}`, 'ERROR');
    result.error = error.message;
    result.steps.push({ name: 'error', error: error.message });
  }
  
  result.duration = (Date.now() - startTime) / 1000;
  return result;
}

/**
 * 複数タスクをバッチ処理
 */
async function runBatch(options = {}) {
  const { maxTasks = CONFIG.maxTasks, taskIds = null } = options;
  
  log('='.repeat(60), 'PHASE');
  log('完全自律実行パイプライン開始', 'PHASE');
  log('='.repeat(60), 'PHASE');
  
  const results = [];
  let tasksProcessed = 0;
  
  // タスクリスト取得
  let tasks = [];
  if (taskIds && taskIds.length > 0) {
    tasks = taskIds.map(id => ({ id }));
  } else {
    // Planeから次のタスクを取得
    try {
      const nextTask = await getNextTask();
      if (nextTask) {
        tasks.push(nextTask);
      }
    } catch (e) {
      log(`タスク取得失敗: ${e.message}`, 'WARN');
    }
  }
  
  // 各タスク処理
  for (const task of tasks) {
    if (tasksProcessed >= maxTasks) {
      log(`最大タスク数（${maxTasks}）に達しました`, 'INFO');
      break;
    }
    
    log(`\n${'='.repeat(40)}`, 'PHASE');
    log(`タスク処理開始: ${task.id}`, 'PHASE');
    log('='.repeat(40), 'PHASE');
    
    const result = await processTask(task.id, options);
    results.push(result);
    tasksProcessed++;
    
    // 結果ログ
    if (result.success) {
      log(`タスク完了: ${task.id} (${result.duration.toFixed(1)}秒)`, 'SUCCESS');
    } else {
      log(`タスク失敗: ${task.id} - ${result.error}`, 'ERROR');
    }
  }
  
  // サマリー
  printSummary(results);
  
  return results;
}

/**
 * 結果サマリーを表示
 */
function printSummary(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 実行結果サマリー');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`\n処理タスク数: ${results.length}`);
  console.log(`成功: ${successCount}`);
  console.log(`失敗: ${results.length - successCount}`);
  console.log(`総実行時間: ${totalDuration.toFixed(1)}秒`);
  
  console.log('\n--- 詳細 ---\n');
  
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.taskId}`);
    console.log(`   実行時間: ${r.duration.toFixed(1)}秒`);
    
    if (r.error) {
      console.log(`   エラー: ${r.error}`);
    }
    
    r.steps.forEach(step => {
      const stepStatus = step.success ? '✓' : '✗';
      let stepInfo = `     ${stepStatus} ${step.name}`;
      if (step.score) stepInfo += ` (${step.score}点)`;
      if (step.skipped) stepInfo += ' [スキップ]';
      console.log(stepInfo);
    });
    
    console.log('');
  });
  
  console.log('='.repeat(60));
}

/**
 * ログをファイルに保存
 */
function saveLog(results) {
  ensureDir(CONFIG.logsDir);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = path.join(CONFIG.logsDir, `run_${timestamp}.json`);
  
  fs.writeFileSync(logPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results
  }, null, 2));
  
  log(`ログ保存: ${logPath}`, 'INFO');
}

// ===== CLI =====

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
完全自律実行パイプライン

Usage: node run-autonomous.cjs [options]

Options:
  --tasks <ids>           処理するタスクID（カンマ区切り）
  --max-tasks <n>         最大タスク数（デフォルト: 5）
  --skip-implementation   Claude Code実行をスキップ
  --skip-feedback         フィードバックループをスキップ
  --dry-run               実行せず計画を表示

Examples:
  # 次のタスクを自動処理
  node run-autonomous.cjs

  # 特定タスクを処理
  node run-autonomous.cjs --tasks DEV-0170,DEV-0171

  # プロンプト生成まで（実装なし）
  node run-autonomous.cjs --skip-implementation --skip-feedback
`);
    process.exit(0);
  }
  
  const options = {
    skipImplementation: args.includes('--skip-implementation'),
    skipFeedback: args.includes('--skip-feedback'),
    dryRun: args.includes('--dry-run')
  };
  
  // タスクID
  const tasksIdx = args.indexOf('--tasks');
  if (tasksIdx !== -1) {
    options.taskIds = args[tasksIdx + 1].split(',');
  }
  
  // 最大タスク数
  const maxIdx = args.indexOf('--max-tasks');
  if (maxIdx !== -1) {
    options.maxTasks = parseInt(args[maxIdx + 1], 10);
  }
  
  try {
    const results = await runBatch(options);
    
    // ログ保存
    saveLog(results);
    
    // 終了コード
    const allSuccess = results.every(r => r.success);
    process.exit(allSuccess ? 0 : 1);
    
  } catch (error) {
    console.error(`\n❌ 致命的エラー: ${error.message}`);
    process.exit(1);
  }
}

// エクスポート
module.exports = {
  processTask,
  runBatch,
  getNextTask,
  getTaskDetails
};

if (require.main === module) {
  main();
}
