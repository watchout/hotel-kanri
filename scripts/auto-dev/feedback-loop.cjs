#!/usr/bin/env node
/**
 * 自動フィードバックループ
 * 
 * 実装後のテスト→修正→再テストを自動化
 * 成功時はPR作成とPlane更新、失敗時は修正指示を生成
 * 
 * Usage: node feedback-loop.cjs <task_id> [options]
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// ===== 設定 =====

const CONFIG = {
  // 最大修正ループ回数
  maxFixAttempts: 5,
  
  // テストタイムアウト（秒）
  testTimeout: 120,
  
  // プロジェクトパス
  projects: {
    'hotel-common': '/Users/kaneko/hotel-common-rebuild',
    'hotel-saas': '/Users/kaneko/hotel-saas-rebuild',
    'hotel-kanri': '/Users/kaneko/hotel-kanri'
  },
  
  // 標準テストスクリプト
  testScripts: {
    admin: '/Users/kaneko/hotel-kanri/scripts/test-standard-admin.sh',
    guest: '/Users/kaneko/hotel-kanri/scripts/test-standard-guest.sh'
  },
  
  // Memory更新ファイル
  memoryFiles: {
    bugs: '/Users/kaneko/hotel-kanri/.claude/memory/bugs.md',
    lessons: '/Users/kaneko/hotel-kanri/.claude/memory/lessons.md'
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
    DEBUG: '🔍'
  }[level] || 'ℹ️';
  console.log(`[${ts}] ${emoji} ${message}`);
}

function runCommand(cmd, options = {}) {
  const { cwd = process.cwd(), silent = false, timeout = 60000 } = options;
  
  try {
    const result = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      timeout,
      stdio: silent ? 'pipe' : 'inherit'
    });
    return { success: true, output: result };
  } catch (error) {
    return { 
      success: false, 
      output: error.stdout || '', 
      error: error.stderr || error.message,
      code: error.status 
    };
  }
}

// ===== テスト実行 =====

/**
 * 標準テストを実行
 */
function runTests(testType = 'admin') {
  const scriptPath = CONFIG.testScripts[testType];
  
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    log(`テストスクリプトが見つかりません: ${testType}`, 'ERROR');
    return { success: false, errors: ['テストスクリプト不在'] };
  }
  
  log(`テスト実行: ${testType}`);
  
  const result = runCommand(`bash ${scriptPath}`, {
    timeout: CONFIG.testTimeout * 1000,
    silent: true
  });
  
  // 結果解析
  const output = result.output || result.error || '';
  const errors = [];
  
  // エラーパターン検出
  const errorPatterns = [
    /❌\s*(.+)/g,
    /Error:\s*(.+)/g,
    /FAIL:\s*(.+)/g,
    /AssertionError:\s*(.+)/g
  ];
  
  errorPatterns.forEach(pattern => {
    const matches = output.matchAll(pattern);
    for (const match of matches) {
      errors.push(match[1].trim());
    }
  });
  
  // 成功判定
  const success = result.success && 
    (output.includes('PASSED') || output.includes('✅')) &&
    !output.includes('FAIL') && 
    !output.includes('❌');
  
  return {
    success,
    output,
    errors: [...new Set(errors)], // 重複除去
    testType
  };
}

/**
 * TypeScriptチェック
 */
function runTypeCheck(projectPath) {
  log(`TypeScript チェック: ${path.basename(projectPath)}`);
  
  const result = runCommand('npx tsc --noEmit', {
    cwd: projectPath,
    silent: true,
    timeout: 60000
  });
  
  // エラー抽出
  const errors = [];
  const output = result.output || result.error || '';
  const errorLines = output.match(/error TS\d+:.+/g) || [];
  
  return {
    success: result.success && errorLines.length === 0,
    errors: errorLines.slice(0, 10), // 最初の10件
    output
  };
}

/**
 * Lint チェック
 */
function runLint(projectPath) {
  log(`Lint チェック: ${path.basename(projectPath)}`);
  
  const result = runCommand('npm run lint 2>&1 || true', {
    cwd: projectPath,
    silent: true,
    timeout: 60000
  });
  
  const output = result.output || '';
  const errors = output.match(/error\s+.+/gi) || [];
  
  return {
    success: errors.length === 0,
    errors: errors.slice(0, 10),
    output
  };
}

// ===== 修正指示生成 =====

/**
 * エラーから修正指示を生成
 */
function generateFixInstructions(errors, context = {}) {
  const instructions = [];
  
  instructions.push('# 🔧 自動修正指示\n');
  instructions.push(`生成日時: ${new Date().toISOString()}\n`);
  instructions.push(`タスクID: ${context.taskId || 'unknown'}\n`);
  instructions.push(`試行回数: ${context.attempt || 1}/${CONFIG.maxFixAttempts}\n`);
  instructions.push('\n---\n\n');
  
  instructions.push('## 検出されたエラー\n\n');
  
  errors.forEach((error, i) => {
    instructions.push(`### エラー ${i + 1}\n`);
    instructions.push('```\n');
    instructions.push(error);
    instructions.push('\n```\n\n');
  });
  
  instructions.push('\n## 修正手順\n\n');
  instructions.push('1. 上記のエラーを解析してください\n');
  instructions.push('2. 根本原因を特定してください\n');
  instructions.push('3. 最小限の変更で修正してください\n');
  instructions.push('4. 修正後、テストを再実行してください\n');
  
  instructions.push('\n## 制約\n\n');
  instructions.push('- 既存のテストを壊さないこと\n');
  instructions.push('- SSOT準拠を維持すること\n');
  instructions.push('- 新しいエラーを導入しないこと\n');
  
  return instructions.join('');
}

// ===== Memory更新 =====

/**
 * バグをMemoryに記録
 */
function recordBug(bugInfo) {
  const { taskId, errors, solution, date } = bugInfo;
  
  const bugEntry = `
### BUG-${taskId}-${Date.now().toString(36).toUpperCase()}
- **タスク**: ${taskId}
- **エラー**: ${errors.slice(0, 3).join(', ')}
- **解決策**: ${solution || '自動修正により解決'}
- **日付**: ${date || new Date().toISOString()}

`;
  
  try {
    fs.appendFileSync(CONFIG.memoryFiles.bugs, bugEntry);
    log('バグ情報をMemoryに記録', 'SUCCESS');
  } catch (e) {
    log(`Memory更新失敗: ${e.message}`, 'WARN');
  }
}

/**
 * 学んだ教訓をMemoryに記録
 */
function recordLesson(lessonInfo) {
  const { taskId, lesson, date } = lessonInfo;
  
  const lessonEntry = `
### LESSON-${taskId}-${Date.now().toString(36).toUpperCase()}
- **タスク**: ${taskId}
- **教訓**: ${lesson}
- **日付**: ${date || new Date().toISOString()}

`;
  
  try {
    fs.appendFileSync(CONFIG.memoryFiles.lessons, lessonEntry);
    log('教訓をMemoryに記録', 'SUCCESS');
  } catch (e) {
    log(`Memory更新失敗: ${e.message}`, 'WARN');
  }
}

// ===== PR作成 =====

/**
 * PRを作成
 */
function createPR(taskId, projectPath) {
  log(`PR作成: ${taskId}`);
  
  // ブランチ名
  const branchName = `auto/${taskId.toLowerCase()}`;
  
  // 現在のブランチ確認
  const currentBranch = runCommand('git branch --show-current', {
    cwd: projectPath,
    silent: true
  });
  
  if (!currentBranch.success) {
    return { success: false, error: 'Gitブランチ取得失敗' };
  }
  
  // 変更の有無を確認
  const status = runCommand('git status --porcelain', {
    cwd: projectPath,
    silent: true
  });
  
  if (!status.output || status.output.trim() === '') {
    log('変更なし - PRスキップ', 'WARN');
    return { success: true, skipped: true };
  }
  
  // コミット＆プッシュ
  const commands = [
    `git checkout -b ${branchName} 2>/dev/null || git checkout ${branchName}`,
    'git add .',
    `git commit -m "feat(${taskId}): 自動実装"`,
    `git push -u origin ${branchName}`
  ];
  
  for (const cmd of commands) {
    const result = runCommand(cmd, { cwd: projectPath, silent: true });
    if (!result.success && !cmd.includes('checkout')) {
      return { success: false, error: result.error, command: cmd };
    }
  }
  
  // PR作成
  const prResult = runCommand(
    `gh pr create --title "[${taskId}] 自動実装" --body "自動生成されたPR" --base main`,
    { cwd: projectPath, silent: true }
  );
  
  return {
    success: prResult.success,
    branch: branchName,
    prUrl: prResult.output?.trim()
  };
}

// ===== Plane更新 =====

/**
 * Planeのタスクステータスを更新
 */
async function updatePlane(taskId, status = 'Done') {
  log(`Plane更新: ${taskId} → ${status}`);
  
  // ステートID（Plane固有）
  const stateIds = {
    'In Progress': 'c576eed5-315c-44b9-a3cb-db67d73423b7',
    'Done': '86937979-4727-4ec9-81be-585f7aae981d',
    'Blocked': 'blocked-state-id' // 要設定
  };
  
  const stateId = stateIds[status];
  if (!stateId) {
    log(`不明なステータス: ${status}`, 'WARN');
    return { success: false };
  }
  
  const scriptPath = path.join(__dirname, '../plane/update-issue-state.cjs');
  
  if (!fs.existsSync(scriptPath)) {
    log('Plane更新スクリプトが見つかりません', 'WARN');
    return { success: false };
  }
  
  const result = runCommand(`node ${scriptPath} ${taskId} ${stateId}`, {
    silent: true
  });
  
  return { success: result.success };
}

// ===== メインループ =====

/**
 * フィードバックループを実行
 */
async function runFeedbackLoop(taskId, options = {}) {
  const {
    testType = 'guest',
    projectPath = CONFIG.projects['hotel-common'],
    maxAttempts = CONFIG.maxFixAttempts,
    dryRun = false
  } = options;
  
  log('='.repeat(60));
  log(`フィードバックループ開始: ${taskId}`);
  log('='.repeat(60));
  
  let attempt = 0;
  let allErrors = [];
  
  while (attempt < maxAttempts) {
    attempt++;
    log(`\n--- 試行 ${attempt}/${maxAttempts} ---\n`);
    
    // 1. TypeScriptチェック
    const tsResult = runTypeCheck(projectPath);
    if (!tsResult.success) {
      log(`TypeScriptエラー: ${tsResult.errors.length}件`, 'WARN');
      allErrors.push(...tsResult.errors);
      
      if (dryRun) {
        console.log(generateFixInstructions(tsResult.errors, { taskId, attempt }));
        continue;
      }
      
      // TODO: Claude Codeで自動修正
      continue;
    }
    
    // 2. 標準テスト
    const testResult = runTests(testType);
    if (!testResult.success) {
      log(`テストエラー: ${testResult.errors.length}件`, 'WARN');
      allErrors.push(...testResult.errors);
      
      if (dryRun) {
        console.log(generateFixInstructions(testResult.errors, { taskId, attempt }));
        continue;
      }
      
      // TODO: Claude Codeで自動修正
      continue;
    }
    
    // 3. 成功！
    log('全テストパス！', 'SUCCESS');
    
    // Memory更新
    if (allErrors.length > 0) {
      recordBug({
        taskId,
        errors: allErrors,
        solution: `${attempt}回の試行で解決`
      });
      recordLesson({
        taskId,
        lesson: `エラー ${allErrors.length}件を${attempt}回の試行で修正`
      });
    }
    
    // PR作成
    if (!dryRun) {
      const prResult = createPR(taskId, projectPath);
      if (prResult.success && !prResult.skipped) {
        log(`PR作成完了: ${prResult.prUrl}`, 'SUCCESS');
      }
      
      // Plane更新
      await updatePlane(taskId, 'Done');
    }
    
    return {
      success: true,
      attempts: attempt,
      errors: allErrors
    };
  }
  
  // 最大試行回数到達
  log(`最大試行回数（${maxAttempts}）に達しました`, 'ERROR');
  
  // Plane更新（Blocked）
  if (!dryRun) {
    await updatePlane(taskId, 'Blocked');
  }
  
  return {
    success: false,
    attempts: attempt,
    errors: allErrors
  };
}

// ===== CLI =====

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
自動フィードバックループ

Usage: node feedback-loop.cjs <task_id> [options]

Options:
  --test-type <type>    テストタイプ（admin/guest）
  --project <path>      プロジェクトパス
  --max-attempts <n>    最大試行回数
  --dry-run             実行せず指示を表示

Examples:
  # ゲストAPI用
  node feedback-loop.cjs DEV-0170 --test-type guest

  # 管理画面用
  node feedback-loop.cjs DEV-0180 --test-type admin

  # Dry Run
  node feedback-loop.cjs DEV-0170 --dry-run
`);
    process.exit(0);
  }
  
  const taskId = args[0];
  const options = {
    dryRun: args.includes('--dry-run')
  };
  
  // テストタイプ
  const testIdx = args.indexOf('--test-type');
  if (testIdx !== -1) {
    options.testType = args[testIdx + 1];
  }
  
  // プロジェクト
  const projIdx = args.indexOf('--project');
  if (projIdx !== -1) {
    options.projectPath = args[projIdx + 1];
  }
  
  // 最大試行
  const maxIdx = args.indexOf('--max-attempts');
  if (maxIdx !== -1) {
    options.maxAttempts = parseInt(args[maxIdx + 1], 10);
  }
  
  try {
    const result = await runFeedbackLoop(taskId, options);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 結果サマリー');
    console.log('='.repeat(60));
    console.log(`タスク: ${taskId}`);
    console.log(`結果: ${result.success ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`試行回数: ${result.attempts}`);
    console.log(`検出エラー: ${result.errors.length}件`);
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ エラー: ${error.message}`);
    process.exit(1);
  }
}

// エクスポート
module.exports = {
  runFeedbackLoop,
  runTests,
  runTypeCheck,
  createPR,
  updatePlane,
  recordBug,
  recordLesson
};

if (require.main === module) {
  main();
}
