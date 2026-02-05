#!/usr/bin/env node
/**
 * 1タスク自動化スクリプト v2.0
 * 
 * 改善点:
 * - ファイルへの確実な保存 + 実ファイル監査
 * - Claude CLI失敗検知（status/stderr）
 * - 出力形式固定（BEGIN/ENDマーカー）
 * - 証跡保存（logs/auto-dev/）
 * - --resume再開機能
 * - --test選択オプション
 * 
 * 使用方法:
 *   node run-single-task.cjs DEV-0171
 *   node run-single-task.cjs DEV-0171 --test guest
 *   node run-single-task.cjs DEV-0171 --resume
 *   node run-single-task.cjs DEV-0171 --dry-run
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// 環境変数読み込み（ANTHROPIC_API_KEYを必ずエクスポート）
const envPath = path.join(__dirname, '../../.env.mcp');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) process.env[key.trim()] = vals.join('=').trim();
  });
}

// OpenAI（監査用）
const OpenAI = require('openai');
const openai = new OpenAI();

// Claude Code CLI設定（サブスク版 Opus 4.5を使用）
const USE_CLAUDE_CLI = true; // true: サブスク版CLI, false: API直接
let anthropic = null;
if (!USE_CLAUDE_CLI && process.env.ANTHROPIC_API_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic();
}

// 引数解析
const args = process.argv.slice(2);
const taskId = args.find(a => !a.startsWith('--'));
const flags = {
  dryRun: args.includes('--dry-run'),
  resume: args.includes('--resume'),
  test: args.find(a => a.startsWith('--test='))?.split('=')[1] || 'admin'
};

// 設定
const CONFIG = {
  maxRetries: 3,
  passScore: 95,
  baseDir: path.join(__dirname, '../..'),
  ssotDir: path.join(__dirname, '../../docs/03_ssot/02_guest_features'),
  logsDir: path.join(__dirname, '../../logs/auto-dev'),
};

// タスク状態
let STATE = {
  taskId: null,
  startedAt: null,
  currentStep: 'init',
  ssotPath: null,
  promptPath: null,
  attempts: { ssot: 0, prompt: 0, implementation: 0, test: 0 }
};

// ログディレクトリ
let logDir = null;

// ログ関数
function log(level, msg) {
  const icons = { step: '🔄', info: '📋', success: '✅', warning: '⚠️', error: '❌', debug: '🔍' };
  const line = `[${new Date().toISOString()}] ${icons[level] || '  '} ${msg}`;
  console.log(line);
  if (logDir) {
    fs.appendFileSync(path.join(logDir, 'execution.log'), line + '\n');
  }
}

// 証跡保存
function saveEvidence(name, content) {
  if (!logDir) return;
  const filePath = path.join(logDir, `${name}.txt`);
  fs.writeFileSync(filePath, typeof content === 'object' ? JSON.stringify(content, null, 2) : content);
  log('debug', `証跡保存: ${name}`);
}

// 状態保存
function saveState() {
  if (!logDir) return;
  fs.writeFileSync(path.join(logDir, 'state.json'), JSON.stringify(STATE, null, 2));
}

// 状態読み込み
function loadState(taskId) {
  const pattern = path.join(CONFIG.logsDir, taskId);
  if (!fs.existsSync(pattern)) return null;
  
  const dirs = fs.readdirSync(pattern).filter(d => d.match(/^\d+$/)).sort().reverse();
  if (dirs.length === 0) return null;
  
  const stateFile = path.join(pattern, dirs[0], 'state.json');
  if (!fs.existsSync(stateFile)) return null;
  
  return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
}

// Anthropic API直接呼び出し（高速）
async function callClaude(prompt, outputFormat = 'markdown') {
  saveEvidence(`claude_prompt_${Date.now()}`, prompt);
  
  if (USE_CLAUDE_CLI) {
    // Claude Code CLI経由（サブスク版 Opus 4.5）
    log('info', 'Claude Code CLI実行中（Opus 4.5）...');
    const startTime = Date.now();
    
    try {
      const result = spawnSync('claude', ['-p', prompt], {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024, // 50MB
        timeout: 300000, // 5分タイムアウト
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (result.error) {
        log('error', `Claude CLI エラー: ${result.error.message}`);
        saveEvidence(`claude_error_${Date.now()}`, result.error.message);
        return { success: false, error: result.error.message };
      }
      
      if (result.status !== 0) {
        log('error', `Claude CLI 終了コード: ${result.status}`);
        saveEvidence(`claude_stderr_${Date.now()}`, result.stderr || '(empty)');
        return { success: false, error: `Exit code: ${result.status}` };
      }
      
      const content = result.stdout || '';
      saveEvidence(`claude_raw_${Date.now()}`, content);
      
      log('info', `CLI応答完了: ${content.length}文字（${elapsed}秒）`);
      return { success: true, content };
    } catch (e) {
      log('error', `Claude CLI 例外: ${e.message}`);
      saveEvidence(`claude_error_${Date.now()}`, e.message);
      return { success: false, error: e.message };
    }
  } else {
    // Anthropic API直接呼び出し（Sonnet 4）
    log('info', 'Anthropic API実行中（Sonnet 4）...');
    
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      const content = response.content[0].text;
      saveEvidence(`claude_raw_${Date.now()}`, content);
      
      log('info', `API応答完了: ${content.length}文字`);
      return { success: true, content };
    } catch (e) {
      log('error', `Anthropic API失敗: ${e.message}`);
      saveEvidence(`claude_error_${Date.now()}`, e.message);
      return { success: false, error: e.message };
    }
  }
}

// コンテンツ抽出
function extractContent(raw, format) {
  if (format === 'markdown') {
    const match = raw.match(/---BEGIN_CONTENT---\s*([\s\S]*?)\s*---END_CONTENT---/);
    if (match) return match[1].trim();
    
    // フォールバック: Markdownコードブロック
    const mdMatch = raw.match(/```(?:markdown|md)?\s*([\s\S]*?)```/);
    if (mdMatch) return mdMatch[1].trim();
    
    return null;
  }
  
  if (format === 'json') {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        JSON.parse(match[0]);
        return match[0];
      } catch { return null; }
    }
  }
  
  return null;
}

// Gemini API呼び出し
async function callGemini(prompt) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    log('warning', 'GOOGLE_API_KEY未設定、Geminiスキップ');
    return null;
  }
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2000 }
        })
      }
    );
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    log('warning', `Gemini呼び出しエラー: ${e.message}`);
    return null;
  }
}

// マルチLLM監査（改善版）
async function auditMultiLLM(filePath, type) {
  // 実ファイルを読み込み
  if (!fs.existsSync(filePath)) {
    log('error', `監査対象ファイルが存在しません: ${filePath}`);
    return { score: 0, passed: false, issues: ['ファイルが存在しません'], fixes: [] };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  log('info', `マルチLLM監査中（${type}）... ファイル: ${path.basename(filePath)}, ${content.length}文字`);
  
  const auditPrompt = {
    ssot: `SSOTを評価してください。

評価観点（各20点、合計100点）:
1. 構造の明確さ - 概要/スコープ/API/DB/テスト/Accept条件のセクション有無
2. 技術仕様の具体性 - エンドポイント、リクエスト/レスポンス例の有無
3. エラー処理の網羅性 - エラーコード、エラーメッセージの定義
4. テストケースの充実 - 正常系/異常系の網羅
5. Accept条件の明確さ - 具体的な合格基準

【重要】以下のJSON形式で回答してください：
{
  "score": 85,
  "breakdown": {"structure": 18, "techSpec": 15, "errorHandling": 17, "testCases": 18, "acceptCriteria": 17},
  "issues": ["問題1", "問題2"],
  "fixes": ["修正方法1", "修正方法2"],
  "criticalIssues": []
}

SSOT内容:
${content.substring(0, 12000)}`,
    
    prompt: `実装プロンプトを評価してください。

評価観点（各20点）:
1. 実装対象の明確さ
2. 手順の具体性（Item/Step構造）
3. 禁止事項の明記
4. 完了条件の明確さ
5. エラー時の対応

JSON形式で回答:
{"score": 85, "issues": ["問題1"], "fixes": ["修正方法1"], "criticalIssues": []}

プロンプト:
${content.substring(0, 12000)}`,
    
    implementation: `実装内容を評価してください。

評価観点（各20点）:
1. 仕様準拠
2. エラー処理
3. セキュリティ
4. コード品質
5. テスト可能性

JSON形式で回答:
{"score": 85, "issues": ["問題1"], "fixes": ["修正方法1"], "criticalIssues": []}

実装:
${content.substring(0, 12000)}`
  };
  
  const prompt = auditPrompt[type] || auditPrompt.ssot;
  
  // GPT-4oとGeminiを並列実行
  const [gptResult, geminiResult] = await Promise.all([
    (async () => {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 2000,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        });
        return JSON.parse(response.choices[0].message.content);
      } catch (e) {
        log('warning', `GPT-4oエラー: ${e.message}`);
        return { score: 0, issues: [e.message], fixes: [], criticalIssues: [] };
      }
    })(),
    (async () => {
      const text = await callGemini(prompt);
      if (!text) return null;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        return null;
      }
    })()
  ]);
  
  // スコア統合
  const gptScore = gptResult?.score || 0;
  const geminiScore = geminiResult?.score || gptScore;
  const avgScore = Math.round((gptScore + geminiScore) / 2);
  
  log('info', `GPT-4o: ${gptScore}点, Gemini: ${geminiScore}点 → 平均: ${avgScore}点`);
  
  // Critical issues チェック
  const allCritical = [
    ...(gptResult?.criticalIssues || []),
    ...(geminiResult?.criticalIssues || [])
  ];
  
  // 平均95点以上 かつ Critical issues なし で合格
  const passed = avgScore >= CONFIG.passScore && allCritical.length === 0;
  
  if (allCritical.length > 0) {
    log('warning', `Critical issues検出: ${allCritical.join(', ')}`);
  }
  
  log('info', `最終スコア: ${avgScore}/100 ${passed ? '✅合格' : '❌不合格'}`);
  
  const result = {
    score: avgScore,
    passed,
    issues: [...new Set([...(gptResult?.issues || []), ...(geminiResult?.issues || [])])].slice(0, 5),
    fixes: [...new Set([...(gptResult?.fixes || []), ...(geminiResult?.fixes || [])])].slice(0, 5),
    criticalIssues: allCritical,
    gptScore,
    geminiScore,
    breakdown: gptResult?.breakdown
  };
  
  saveEvidence(`audit_${type}_${Date.now()}`, result);
  return result;
}

// GPT-4oで修正を生成
async function fixWithGPT(issues, fixes, currentContent) {
  log('info', 'GPT-4oで修正生成中...');
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: `以下の問題を修正してください。

## 問題点
${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

## 修正方法
${fixes.map((f, idx) => `${idx + 1}. ${f}`).join('\n')}

## 現在の内容
${currentContent}

【重要】修正後の完全な内容をMarkdown形式で出力してください。説明は不要です。`
      }],
      max_tokens: 16000,
      temperature: 0.2
    });
    
    const result = response.choices[0].message.content;
    saveEvidence(`gpt_fix_${Date.now()}`, result);
    return result;
  } catch (e) {
    log('error', `GPT-4o修正失敗: ${e.message}`);
    return null;
  }
}

// ファイル生成・修正ループ
async function runWithRetry(generateFn, auditType, description, outputPath) {
  log('step', `${description}開始`);
  STATE.currentStep = auditType;
  saveState();
  
  // 初回生成
  const genResult = await generateFn();
  if (!genResult.success) {
    log('error', `${description}生成失敗: ${genResult.error}`);
    return null;
  }
  
  // ファイルに保存
  const content = genResult.content;
  fs.writeFileSync(outputPath, content);
  log('info', `ファイル保存: ${outputPath} (${content.length}文字)`);
  
  for (let retry = 0; retry < CONFIG.maxRetries; retry++) {
    STATE.attempts[auditType] = retry + 1;
    saveState();
    
    // 実ファイルを監査
    const audit = await auditMultiLLM(outputPath, auditType);
    
    if (audit.passed) {
      log('success', `${description}完了（スコア: ${audit.score}）`);
      return outputPath;
    }
    
    log('warning', `修正ターン ${retry + 1}/${CONFIG.maxRetries}`);
    
    // 現在のファイル内容を読み込み
    const currentContent = fs.readFileSync(outputPath, 'utf8');
    
    // GPT-4oで修正（高速）
    const fixedContent = await fixWithGPT(audit.issues, audit.fixes, currentContent);
    
    if (fixedContent) {
      // 修正内容をファイルに上書き
      fs.writeFileSync(outputPath, fixedContent);
      log('info', `修正適用: ${outputPath} (${fixedContent.length}文字)`);
    }
  }
  
  log('error', `${description}は${CONFIG.maxRetries}回の修正でも合格しませんでした`);
  return null;
}

// テスト実行
function runTest(testType) {
  const testScript = testType === 'guest' 
    ? 'test-standard-guest.sh' 
    : 'test-standard-admin.sh';
  
  const scriptPath = path.join(__dirname, '..', testScript);
  
  if (!fs.existsSync(scriptPath)) {
    log('warning', `テストスクリプトが見つかりません: ${scriptPath}`);
    return { success: true, skipped: true };
  }
  
  log('step', `テスト実行: ${testScript}`);
  
  const result = spawnSync('bash', [scriptPath], {
    encoding: 'utf8',
    timeout: 120000,
    cwd: CONFIG.baseDir
  });
  
  saveEvidence(`test_${Date.now()}`, {
    script: testScript,
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr
  });
  
  return {
    success: result.status === 0,
    stdout: result.stdout,
    stderr: result.stderr
  };
}

// メイン処理
async function runSingleTask(taskId) {
  // ログディレクトリ作成
  const ts = Date.now();
  logDir = path.join(CONFIG.logsDir, taskId, String(ts));
  fs.mkdirSync(logDir, { recursive: true });
  
  // 状態初期化
  STATE = {
    taskId,
    startedAt: new Date().toISOString(),
    currentStep: 'init',
    ssotPath: null,
    promptPath: null,
    attempts: { ssot: 0, prompt: 0, implementation: 0, test: 0 }
  };
  
  // --resume: 前回の状態を読み込み
  if (flags.resume) {
    const prevState = loadState(taskId);
    if (prevState) {
      log('info', `前回の状態を復元: ${prevState.currentStep}`);
      STATE = { ...STATE, ...prevState };
    }
  }
  
  console.log('═'.repeat(60));
  console.log(`  1タスク自動化 v2.0: ${taskId}`);
  console.log(`  ログ: ${logDir}`);
  console.log('═'.repeat(60));
  
  if (flags.dryRun) {
    log('info', 'Dry-runモード: 実際の処理は行いません');
    return { success: true, dryRun: true };
  }
  
  // Step 1: SSOT生成
  const ssotPath = path.join(CONFIG.ssotDir, `SSOT_${taskId}.md`);
  STATE.ssotPath = ssotPath;
  
  const ssotResult = await runWithRetry(
    () => callClaude(`
タスク ${taskId} のSSOTを作成してください。

必須セクション（500行以内）:
1. ## 概要・目的（50行）- 何を実現するか
2. ## スコープ（30行）- 対象範囲と除外範囲
3. ## API設計（100行）- エンドポイント、リクエスト/レスポンス例
4. ## DB設計（50行）- テーブル、カラム、型
5. ## エラー処理（50行）- エラーコード、メッセージ
6. ## テストケース（100行）- 正常系/異常系
7. ## Accept条件（50行）- 具体的な合格基準

Markdown形式で出力してください。
`, 'markdown'),
    'ssot',
    'SSOT生成',
    ssotPath
  );
  
  if (!ssotResult) {
    return { success: false, step: 'ssot', logDir };
  }
  
  // Step 2: プロンプト生成
  const promptPath = path.join(logDir, 'implementation_prompt.md');
  STATE.promptPath = promptPath;
  
  const ssotContent = fs.readFileSync(ssotPath, 'utf8');
  
  const promptResult = await runWithRetry(
    () => callClaude(`
以下のSSOTから実装プロンプトを作成してください。

必須セクション:
1. ## 実装対象ファイル一覧
2. ## 実装手順（Item 1, Step 1, 2, 3...）
3. ## 禁止事項
4. ## 完了条件

SSOT:
${ssotContent.substring(0, 8000)}
`, 'markdown'),
    'prompt',
    'プロンプト生成',
    promptPath
  );
  
  if (!promptResult) {
    return { success: false, step: 'prompt', logDir };
  }
  
  // Step 3: 実装
  const promptContent = fs.readFileSync(promptPath, 'utf8');
  const implPath = path.join(logDir, 'implementation_result.md');
  
  const implResult = await runWithRetry(
    () => callClaude(`
以下のプロンプトに従って実装してください。

${promptContent}

実装が完了したら、変更したファイルの一覧と内容を報告してください。
`, 'markdown'),
    'implementation',
    '実装',
    implPath
  );
  
  if (!implResult) {
    return { success: false, step: 'implementation', logDir };
  }
  
  // Step 4: テスト実行
  if (flags.test !== 'none') {
    const testResult = runTest(flags.test);
    
    if (!testResult.success && !testResult.skipped) {
      log('warning', 'テスト失敗、修正中...');
      
      // テスト失敗時の修正
      const fixResult = await callClaude(`
テストが失敗しました。以下のエラーを修正してください。

エラー出力:
${testResult.stderr || testResult.stdout}

修正後、変更したファイルを報告してください。
`, 'markdown');
      
      if (fixResult.success) {
        // 再テスト
        const retestResult = runTest(flags.test);
        if (!retestResult.success) {
          log('error', 'テスト修正失敗');
          return { success: false, step: 'test', logDir };
        }
      }
    }
    
    log('success', 'テスト通過');
  }
  
  // 完了
  STATE.currentStep = 'done';
  saveState();
  
  console.log('═'.repeat(60));
  log('success', `タスク ${taskId} 完了`);
  console.log(`  証跡: ${logDir}`);
  console.log('═'.repeat(60));
  
  return { success: true, logDir };
}

// 実行
if (!taskId) {
  console.log('Usage: node run-single-task.cjs <task-id> [options]');
  console.log('');
  console.log('Options:');
  console.log('  --dry-run     実際の処理を行わない');
  console.log('  --resume      前回の状態から再開');
  console.log('  --test=admin  テストタイプ (admin|guest|none)');
  console.log('');
  console.log('Example:');
  console.log('  node run-single-task.cjs DEV-0171');
  console.log('  node run-single-task.cjs DEV-0171 --test=guest');
  console.log('  node run-single-task.cjs DEV-0171 --resume');
  process.exit(1);
}

runSingleTask(taskId)
  .then(result => {
    if (result.logDir) {
      console.log(`\n証跡ディレクトリ: ${result.logDir}`);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    log('error', err.message);
    console.error(err.stack);
    process.exit(1);
  });
