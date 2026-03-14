#!/usr/bin/env node
/**
 * Claude Code CLI 連携スクリプト
 * 
 * 生成されたプロンプトをClaude Code CLIに渡して自動実装を行う
 * 
 * Usage: node run-claude-code.cjs <prompt_path> [options]
 * 
 * Options:
 *   --dry-run       実行せずコマンドを表示
 *   --yolo          パーミッション確認スキップ（危険）
 *   --model <name>  使用モデル（デフォルト: opus）
 *   --output <dir>  出力ディレクトリ
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

// ===== 設定 =====

const CONFIG = {
  // Claude Codeのパス（環境により調整）
  claudePath: 'claude',
  
  // デフォルトモデル
  defaultModel: 'opus',
  
  // 作業ディレクトリ
  workDir: process.cwd(),
  
  // ログディレクトリ
  logDir: path.join(__dirname, '../../logs/claude-code'),
  
  // タイムアウト（ミリ秒）
  timeout: 30 * 60 * 1000, // 30分
  
  // 最大リトライ
  maxRetries: 3
};

// ===== ユーティリティ =====

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function log(message, level = 'INFO') {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level}] ${message}`);
}

// ===== Claude Code 実行 =====

/**
 * Claude Codeがインストールされているか確認
 */
function checkClaudeInstalled() {
  try {
    execSync('claude --version', { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Claude Codeを実行
 */
async function runClaudeCode(promptPath, options = {}) {
  const {
    dryRun = false,
    yolo = false,
    model = CONFIG.defaultModel,
    workDir = CONFIG.workDir,
    taskId = null
  } = options;
  
  // プロンプト読み込み
  if (!fs.existsSync(promptPath)) {
    throw new Error(`プロンプトファイルが見つかりません: ${promptPath}`);
  }
  const prompt = fs.readFileSync(promptPath, 'utf-8');
  
  // ログディレクトリ準備
  ensureDir(CONFIG.logDir);
  const logFile = path.join(
    CONFIG.logDir, 
    `${taskId || 'task'}_${timestamp()}.log`
  );
  
  // コマンド構築
  const args = [
    '--print',  // 結果を出力
    '--model', model
  ];
  
  if (yolo) {
    args.push('--dangerously-skip-permissions');
  }
  
  // プロンプトをstdinから渡す
  const command = `echo '${prompt.replace(/'/g, "'\\''")}' | claude ${args.join(' ')}`;
  
  log(`実行コマンド: claude ${args.join(' ')}`);
  log(`プロンプト長: ${prompt.length.toLocaleString()} 文字`);
  log(`ログファイル: ${logFile}`);
  
  if (dryRun) {
    console.log('\n=== DRY RUN ===');
    console.log('以下のコマンドが実行されます:');
    console.log(`cd ${workDir}`);
    console.log(`claude ${args.join(' ')} < ${promptPath}`);
    return { success: true, dryRun: true };
  }
  
  // 実行
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let output = '';
    let errorOutput = '';
    
    const proc = spawn('claude', args, {
      cwd: workDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    // プロンプトをstdinに書き込み
    proc.stdin.write(prompt);
    proc.stdin.end();
    
    // 出力収集
    proc.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });
    
    proc.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });
    
    // タイムアウト
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('タイムアウト'));
    }, CONFIG.timeout);
    
    proc.on('close', (code) => {
      clearTimeout(timer);
      const duration = (Date.now() - startTime) / 1000;
      
      // ログ保存
      const logContent = [
        `=== Claude Code 実行ログ ===`,
        `タスク: ${taskId || 'unknown'}`,
        `開始時刻: ${new Date(startTime).toISOString()}`,
        `実行時間: ${duration.toFixed(1)}秒`,
        `終了コード: ${code}`,
        ``,
        `=== STDOUT ===`,
        output,
        ``,
        `=== STDERR ===`,
        errorOutput
      ].join('\n');
      
      fs.writeFileSync(logFile, logContent);
      
      if (code === 0) {
        log(`✅ 完了（${duration.toFixed(1)}秒）`);
        resolve({
          success: true,
          output,
          duration,
          logFile
        });
      } else {
        log(`❌ エラー（終了コード: ${code}）`, 'ERROR');
        resolve({
          success: false,
          output,
          errorOutput,
          code,
          duration,
          logFile
        });
      }
    });
    
    proc.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

/**
 * リトライ付き実行
 */
async function runWithRetry(promptPath, options = {}) {
  const maxRetries = options.maxRetries || CONFIG.maxRetries;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    log(`実行開始（試行 ${attempt}/${maxRetries}）`);
    
    try {
      const result = await runClaudeCode(promptPath, options);
      
      if (result.success) {
        return result;
      }
      
      // 失敗時はリトライ
      if (attempt < maxRetries) {
        log(`リトライ待機（5秒）...`, 'WARN');
        await new Promise(r => setTimeout(r, 5000));
      }
    } catch (error) {
      log(`実行エラー: ${error.message}`, 'ERROR');
      
      if (attempt < maxRetries) {
        log(`リトライ待機（5秒）...`, 'WARN');
        await new Promise(r => setTimeout(r, 5000));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`最大リトライ回数（${maxRetries}）に達しました`);
}

// ===== バッチ実行 =====

/**
 * 複数プロンプトを順次実行
 */
async function runBatch(promptPaths, options = {}) {
  const results = [];
  
  for (const promptPath of promptPaths) {
    log(`\n${'='.repeat(60)}`);
    log(`処理開始: ${path.basename(promptPath)}`);
    log('='.repeat(60));
    
    try {
      const result = await runWithRetry(promptPath, options);
      results.push({ path: promptPath, ...result });
    } catch (error) {
      results.push({ 
        path: promptPath, 
        success: false, 
        error: error.message 
      });
    }
  }
  
  // サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 バッチ実行結果');
  console.log('='.repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  console.log(`成功: ${successCount}/${results.length}`);
  
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    const name = path.basename(r.path);
    console.log(`  ${status} ${name}`);
  });
  
  return results;
}

// ===== CLI =====

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Claude Code CLI 連携スクリプト

Usage: node run-claude-code.cjs <prompt_path> [options]

Options:
  --dry-run       実行せずコマンドを表示
  --yolo          パーミッション確認スキップ（危険）
  --model <name>  使用モデル（デフォルト: opus）
  --work-dir <dir>  作業ディレクトリ
  --task-id <id>  タスクID（ログ用）

Examples:
  # 単一実行
  node run-claude-code.cjs prompts/generated/DEV-0170.md

  # YOLO モード（自動承認）
  node run-claude-code.cjs prompts/generated/DEV-0170.md --yolo

  # 作業ディレクトリ指定
  node run-claude-code.cjs prompts/generated/DEV-0170.md \\
    --work-dir /Users/kaneko/hotel-common-rebuild
`);
    process.exit(0);
  }
  
  // Claude Codeチェック
  if (!checkClaudeInstalled()) {
    console.error('❌ Claude Code CLIがインストールされていません');
    console.error('   インストール: npm install -g @anthropic-ai/claude-code');
    process.exit(1);
  }
  
  // 引数解析
  const promptPath = args[0];
  const options = {
    dryRun: args.includes('--dry-run'),
    yolo: args.includes('--yolo')
  };
  
  // モデル
  const modelIdx = args.indexOf('--model');
  if (modelIdx !== -1) {
    options.model = args[modelIdx + 1];
  }
  
  // 作業ディレクトリ
  const workDirIdx = args.indexOf('--work-dir');
  if (workDirIdx !== -1) {
    options.workDir = args[workDirIdx + 1];
  }
  
  // タスクID
  const taskIdIdx = args.indexOf('--task-id');
  if (taskIdIdx !== -1) {
    options.taskId = args[taskIdIdx + 1];
  }
  
  try {
    const result = await runWithRetry(promptPath, options);
    
    if (result.success) {
      console.log('\n✅ 実行成功');
      if (result.logFile) {
        console.log(`📁 ログ: ${result.logFile}`);
      }
    } else {
      console.log('\n❌ 実行失敗');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ エラー: ${error.message}`);
    process.exit(1);
  }
}

// エクスポート
module.exports = { 
  runClaudeCode, 
  runWithRetry, 
  runBatch,
  checkClaudeInstalled 
};

if (require.main === module) {
  main();
}
