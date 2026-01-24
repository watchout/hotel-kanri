#!/usr/bin/env node
/**
 * タスク自動実行オーケストレーター
 * 
 * Claude Codeに「DEV-0170を実行」と指示するだけで、
 * 子タスクを順に実行し、フロー全体を自動でこなす
 * 
 * 使い方:
 *   node run-task.cjs DEV-0170
 *   node run-task.cjs DEV-0170 --dry-run
 * 
 * @version 2.0.0
 * 
 * 監査構成: Gemini + GPT-4o (AND合成)
 * チェックリスト: quality-checklists/
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// 環境変数読み込み
const envPath = path.join(__dirname, '../../.env.mcp');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

// ===== チェックリストモジュール読み込み =====
const checklistDir = path.join(__dirname, '../quality-checklists');
let ssotGenerationChecklist, ssotAuditChecklist, promptAuditChecklist, testExecutionChecklist;

try {
  ssotGenerationChecklist = require(path.join(checklistDir, 'ssot-generation.cjs'));
  ssotAuditChecklist = require(path.join(checklistDir, 'ssot-audit.cjs'));
  promptAuditChecklist = require(path.join(checklistDir, 'prompt-audit.cjs'));
  testExecutionChecklist = require(path.join(checklistDir, 'test-execution.cjs'));
} catch (error) {
  console.warn('⚠️ チェックリストモジュールの読み込みに失敗。フォールバックモードで実行');
}

// ===== 設定 =====
const CONFIG = {
  maxRetries: 3,
  ssotGenerationPassScore: 95,  // SSOT生成合格スコア
  ssotAuditPassScore: 95,       // SSOT監査合格スコア
  promptAuditPassScore: 85,     // プロンプト監査合格スコア
  testPassScore: 100,           // テスト合格スコア（全Pass必須）
  evidenceDir: path.join(__dirname, '../../evidence/auto-dev'),
  logsDir: path.join(__dirname, '../../evidence/auto-dev/logs'),
  ssotDir: path.join(__dirname, '../../docs/03_ssot')
};

// ===== ログ =====
class Logger {
  constructor(taskId) {
    this.taskId = taskId;
    this.startTime = new Date();
    this.logs = [];
    
    if (!fs.existsSync(CONFIG.logsDir)) {
      fs.mkdirSync(CONFIG.logsDir, { recursive: true });
    }
  }

  log(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    this.logs.push(entry);
    
    const prefix = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      step: '🔄'
    }[level] || '•';
    
    console.log(`${prefix} ${message}`);
    if (data) console.log(`   ${JSON.stringify(data)}`);
  }

  save() {
    const filename = `${this.taskId}-${this.startTime.toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(CONFIG.logsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify({
      taskId: this.taskId,
      startTime: this.startTime,
      endTime: new Date(),
      logs: this.logs
    }, null, 2));
    return filepath;
  }
}

// ===== Plane API =====
const planeApi = require('../plane/lib/plane-api-client.cjs');

async function listAllIssues() {
  const config = planeApi.getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  return planeApi.request('GET', endpoint);
}

function parseDevNumber(name) {
  const m = name?.match(/\[DEV-(\d+)\]/);
  return m ? Number(m[1]) : null;
}

async function getTaskInfo(taskId) {
  // DEV-0170 → nameに[DEV-0170]を含むIssueを検索
  const devNo = parseInt(taskId.replace('DEV-', ''));
  const allIssuesResult = await listAllIssues();
  const allIssues = allIssuesResult.results || allIssuesResult;
  
  const issue = allIssues.find(i => parseDevNumber(i.name) === devNo);
  
  if (!issue) {
    throw new Error(`タスクが見つかりません: ${taskId}`);
  }
  
  return issue;
}

async function getSubTasks(taskId) {
  // 子タスクを取得（例: DEV-0170 → DEV-0171, DEV-0172, ...）
  const allIssuesResult = await listAllIssues();
  const allIssues = allIssuesResult.results || allIssuesResult;
  const parentDevNo = parseInt(taskId.replace('DEV-', ''));
  
  // 子タスクをフィルタ（DEV番号の範囲で判定: DEV-0170 → 0171-0179）
  const subTasks = allIssues.filter(i => {
    const devNo = parseDevNumber(i.name);
    if (!devNo) return false;
    return devNo > parentDevNo && devNo < parentDevNo + 10 && devNo % 10 !== 0;
  }).sort((a, b) => parseDevNumber(a.name) - parseDevNumber(b.name));
  
  return subTasks;
}

async function updateTaskState(taskId, state) {
  const stateIds = {
    'Backlog': '2564ad4a-abd6-4b05-9af0-2c3dcd28e2be',
    'In Progress': 'c576eed5-315c-44b9-a3cb-db67d73423b7',
    'Done': '86937979-4727-4ec9-81be-585f7aae981d'
  };
  
  await planeApi.updateIssue(taskId, { state: stateIds[state] });
}

// ===== GPT呼び出し（監査用） =====
async function callGPT(prompt, model = 'gpt-4o-mini') {
  const OpenAI = require('openai');
  const client = new OpenAI();
  
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4096
  });
  
  return response.choices[0].message.content;
}

// ===== Claude Code呼び出し =====
async function callClaudeCode(prompt, workingDir = null) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(__dirname, '.temp-prompt.txt');
    fs.writeFileSync(tempFile, prompt);

    const cwd = workingDir || path.join(__dirname, '../..');
    
    try {
      const result = execSync(`cat "${tempFile}" | claude --print --dangerously-skip-permissions`, {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
        timeout: 900000, // 15分（Claude Codeの実装時間を考慮）
        cwd
      });
      fs.unlinkSync(tempFile);
      resolve(result);
    } catch (error) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      reject(error);
    }
  });
}

// ===== SSOT生成 =====
async function generateSSOT(task, logger) {
  logger.log('step', 'SSOT生成（未存在のため作成）');
  
  const prompt = `
## タスク
${task.name}

## 説明
${task.description || 'なし'}

## 指示
上記タスクのSSOT（Single Source of Truth）を作成してください。

必須セクション:
1. 概要（目的、スコープ）
2. 要件ID一覧（REQ-XXX形式）
3. データベース設計（テーブル、カラム）
4. API設計（エンドポイント、リクエスト/レスポンス）
5. UI設計（画面、コンポーネント）
6. Accept（合格条件）

品質基準:
- テーブル名・カラム名はsnake_case
- APIパスは /api/v1/admin/[resource] 形式
- 全ての要件にAccept条件を定義

出力形式: Markdown
`;

  try {
    const result = await callClaudeCode(prompt, 'ssot-generation');
    
    // ファイル名生成
    const taskMatch = task.name.match(/\[DEV-\d+\].*?\[COM-\d+\]\s*(.+)/);
    const baseName = taskMatch 
      ? taskMatch[1].replace(/[^\w\s]/g, '').replace(/\s+/g, '_').toUpperCase()
      : 'GENERATED_SSOT';
    
    const ssotPath = path.join(CONFIG.ssotDir, '00_foundation', `SSOT_${baseName}.md`);
    fs.writeFileSync(ssotPath, result);
    
    logger.log('success', `SSOT生成完了: ${ssotPath}`);
    return ssotPath;
  } catch (error) {
    logger.log('error', `SSOT生成失敗: ${error.message}`);
    return null;
  }
}

// ===== SSOT監査（2段階） =====
async function auditSSOT(ssotPath, logger, model = 'gpt-4o-mini') {
  logger.log('step', `SSOT監査: ${ssotPath} (model: ${model})`);
  
  try {
    const result = execSync(
      `node scripts/ssot-audit/audit-ssot.cjs "${ssotPath}" --model ${model}`,
      { encoding: 'utf8', cwd: path.join(__dirname, '../..') }
    );
    
    // スコア抽出
    const scoreMatch = result.match(/スコア: (\d+)\/100/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    logger.log('info', `監査スコア: ${score}/100`);
    return { score, output: result, model };
  } catch (error) {
    logger.log('error', `監査失敗: ${error.message}`);
    return { score: 0, error: error.message, model };
  }
}

// ===== マルチLLM監査（Gemini + GPT-4o AND合成）=====
async function multiLLMAudit(ssotPath, logger) {
  logger.log('step', 'マルチLLM監査（Gemini + GPT-4o AND合成）');
  
  // 並列で2モデル実行
  const [geminiResult, gpt4oResult] = await Promise.all([
    auditSSOTWithModel(ssotPath, 'gemini-2.0-flash', logger),
    auditSSOTWithModel(ssotPath, 'gpt-4o', logger)
  ]);
  
  logger.log('info', `Gemini: ${geminiResult.score}点, GPT-4o: ${gpt4oResult.score}点`);
  
  // エラーチェック: 片方がエラー（0点 + error）の場合、もう片方のみ使用
  const geminiHasError = geminiResult.error || geminiResult.score === 0;
  const gpt4oHasError = gpt4oResult.error || gpt4oResult.score === 0;
  
  let andScore;
  if (geminiHasError && gpt4oHasError) {
    // 両方エラーの場合は0点
    logger.log('error', '両モデルでエラー発生、監査失敗');
    andScore = 0;
  } else if (geminiHasError) {
    // Geminiのみエラー → GPT-4oのスコアを使用
    logger.log('warning', `Geminiエラー、GPT-4oのみで判定: ${gpt4oResult.score}点`);
    andScore = gpt4oResult.score;
  } else if (gpt4oHasError) {
    // GPT-4oのみエラー → Geminiのスコアを使用
    logger.log('warning', `GPT-4oエラー、Geminiのみで判定: ${geminiResult.score}点`);
    andScore = geminiResult.score;
  } else {
    // 両方正常 → AND合成（厳しい方を採用）
    andScore = Math.min(geminiResult.score, gpt4oResult.score);
  }
  
  // 指摘事項を統合
  const combinedOutput = `
## Gemini監査結果（${geminiResult.score}点）${geminiResult.error ? ' [ERROR]' : ''}
${geminiResult.output || geminiResult.error || ''}

## GPT-4o監査結果（${gpt4oResult.score}点）${gpt4oResult.error ? ' [ERROR]' : ''}
${gpt4oResult.output || gpt4oResult.error || ''}

## AND合成スコア: ${andScore}点
`;
  
  logger.log('info', `AND合成スコア: ${andScore}点`);
  
  return {
    score: andScore,
    output: combinedOutput,
    geminiScore: geminiResult.score,
    gpt4oScore: gpt4oResult.score,
    geminiError: geminiResult.error,
    gpt4oError: gpt4oResult.error
  };
}

// ===== 個別モデル監査 =====
async function auditSSOTWithModel(ssotPath, model, logger) {
  try {
    const result = execSync(
      `node scripts/ssot-audit/audit-ssot.cjs "${ssotPath}" --model ${model}`,
      { encoding: 'utf8', cwd: path.join(__dirname, '../..'), timeout: 120000 }
    );
    
    const scoreMatch = result.match(/スコア: (\d+)\/100/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    return { score, output: result, model };
  } catch (error) {
    logger.log('warning', `${model}監査失敗: ${error.message}`);
    return { score: 0, error: error.message, model };
  }
}

// ===== プロンプト監査（マルチLLM版）=====
async function auditPrompt(promptContent, logger) {
  logger.log('step', 'プロンプト監査（regex + LLM）');
  
  // チェックリストモジュールがあれば使用
  if (promptAuditChecklist) {
    try {
      // マルチLLM監査を試行
      let result;
      try {
        result = await promptAuditChecklist.multiLLMAuditPrompt(promptContent);
        logger.log('info', `regex: ${result.regexResult.score}点, LLM: ${result.llmResult?.score || 'N/A'}点`);
        logger.log('info', `AND合成スコア: ${result.andScore}/100`);
        
        // LLMからの指摘事項
        if (result.issues && result.issues.length > 0) {
          logger.log('warning', `LLM指摘: ${result.issues.slice(0, 3).join(', ')}`);
        }
        
        // 自動補完が必要な場合
        if (result.andScore < CONFIG.promptAuditPassScore) {
          const enhanced = promptAuditChecklist.autoComplete(promptContent, result.regexResult.failed);
          logger.log('info', '不足項目を自動補完');
          return { 
            score: result.andScore, 
            regexScore: result.regexResult.score,
            llmScore: result.llmResult?.score,
            results: result.regexResult.results, 
            failed: result.regexResult.failed,
            issues: result.issues,
            suggestions: result.suggestions,
            enhanced
          };
        }
        
        return { 
          score: result.andScore, 
          regexScore: result.regexResult.score,
          llmScore: result.llmResult?.score,
          results: result.regexResult.results, 
          failed: result.regexResult.failed,
          issues: result.issues,
          suggestions: result.suggestions
        };
      } catch (llmError) {
        // LLMが使えない場合はregexのみ
        logger.log('warning', `LLM監査スキップ: ${llmError.message}`);
        result = promptAuditChecklist.runChecklist(promptContent);
        logger.log('info', `プロンプト監査スコア（regexのみ）: ${result.score}/100`);
        
        if (result.score < CONFIG.promptAuditPassScore) {
          const enhanced = promptAuditChecklist.autoComplete(promptContent, result.failed);
          return { score: result.score, results: result.results, failed: result.failed, enhanced };
        }
        return { score: result.score, results: result.results, failed: result.failed };
      }
    } catch (error) {
      logger.log('warning', `チェックリストエラー: ${error.message}`);
    }
  }
  
  // フォールバック: 簡易チェック
  const checkItems = [
    { id: 'P01', name: 'Item/Step構造', check: /Item\s*\d+|Step\s*\d+/i },
    { id: 'P02', name: 'ツール指示', check: /```bash|read_file|write|search_replace/ },
    { id: 'P03', name: 'チェックリスト', check: /\[\s*\]|\[x\]/i },
    { id: 'P04', name: '完了報告', check: /報告|完了|Evidence/ },
    { id: 'P05', name: 'エラー対処', check: /エラー|失敗|対処/ },
    { id: 'P06', name: 'SSOT参照', check: /SSOT|docs\/03_ssot/ },
    { id: 'P07', name: '不可侵ルール', check: /禁止|絶対|CRITICAL/ },
    { id: 'P08', name: 'ファイルパス', check: /\/Users\/|\.ts|\.vue|\.cjs/ },
    { id: 'P09', name: 'APIテスト', check: /curl|fetch|API.*テスト/ },
    { id: 'P10', name: 'PR/Evidence', check: /PR|Pull Request|Evidence/ }
  ];
  
  const results = checkItems.map(item => ({
    id: item.id,
    name: item.name,
    passed: item.check.test(promptContent)
  }));
  
  const passedCount = results.filter(r => r.passed).length;
  const score = (passedCount / checkItems.length) * 100;
  
  logger.log('info', `プロンプト監査スコア: ${score}/100 (${passedCount}/${checkItems.length})`);
  
  const failed = results.filter(r => !r.passed);
  if (failed.length > 0) {
    logger.log('warning', `不足項目: ${failed.map(f => f.name).join(', ')}`);
  }
  
  return { score, results, failed };
}

// ===== テスト実行（チェックリスト版）=====
async function runTests(testType, logger) {
  logger.log('step', `テスト実行（チェックリスト版）: ${testType}`);
  
  // チェックリストモジュールがあれば使用
  if (testExecutionChecklist) {
    try {
      const result = await testExecutionChecklist.runChecklist(testType);
      logger.log('info', `テストスコア: ${result.score}/100`);
      
      if (result.score === CONFIG.testPassScore) {
        logger.log('success', 'テスト全Pass');
        return { success: true, score: result.score, results: result.results };
      } else {
        logger.log('warning', `テスト失敗: ${result.failed.length}件`);
        for (const f of result.failed) {
          logger.log('warning', `  - ${f.id}: ${f.name}`);
        }
        return { success: false, score: result.score, results: result.results };
      }
    } catch (error) {
      logger.log('error', `チェックリスト実行エラー: ${error.message}`);
    }
  }
  
  // フォールバック: 従来のbashスクリプト
  const testScript = testType === 'admin' 
    ? 'scripts/test-standard-admin.sh'
    : 'scripts/test-standard-guest.sh';
  
  try {
    const result = execSync(
      `bash ${testScript}`,
      { encoding: 'utf8', cwd: path.join(__dirname, '../..'), timeout: 300000 }
    );
    logger.log('success', 'テスト成功');
    return { success: true, output: result, score: 100 };
  } catch (error) {
    logger.log('warning', `テスト失敗: ${error.message}`);
    return { success: false, error: error.message, score: 0 };
  }
}

// ===== PR作成 =====
async function createPR(taskId, taskTitle, logger) {
  logger.log('step', 'PR作成');
  
  try {
    const branchName = `feature/${taskId.toLowerCase()}`;
    
    // ブランチ作成・プッシュ
    execSync(`git checkout -b ${branchName} 2>/dev/null || git checkout ${branchName}`, {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf8'
    });
    
    execSync(`git add -A && git commit -m "${taskId}: ${taskTitle}" || true`, {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf8'
    });
    
    execSync(`git push -u origin ${branchName}`, {
      cwd: path.join(__dirname, '../..'),
      encoding: 'utf8'
    });
    
    // PR作成
    const prResult = execSync(
      `gh pr create --title "${taskId}: ${taskTitle}" --body "## Summary\n\nImplemented ${taskId}\n\n## Test\n\n- [x] 自動テスト実行済み"`,
      { cwd: path.join(__dirname, '../..'), encoding: 'utf8' }
    );
    
    const prUrl = prResult.trim();
    logger.log('success', `PR作成完了: ${prUrl}`);
    return { success: true, url: prUrl };
  } catch (error) {
    logger.log('error', `PR作成失敗: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ===== サブタスク実行 =====
async function executeSubTask(subTask, logger, dryRun = false) {
  const devNo = parseDevNumber(subTask.name);
  const taskId = devNo ? `DEV-${String(devNo).padStart(4, '0')}` : `SEQ-${subTask.sequence_id}`;
  logger.log('step', `━━━━━ サブタスク開始: ${taskId} ━━━━━`);
  logger.log('info', `タイトル: ${subTask.name}`);

  if (dryRun) {
    logger.log('info', '[DRY RUN] 実行をスキップ');
    return { success: true, skipped: true };
  }

  try {
    // 1. タスクをIn Progressに
    await updateTaskState(taskId, 'In Progress');
    logger.log('info', 'ステータス: In Progress');

    // 2. SSOT確認（未存在なら生成）
    let ssotPath = findSSOT(subTask);
    if (!ssotPath) {
      logger.log('warning', 'SSOT未存在、生成します');
      ssotPath = await generateSSOT(subTask, logger);
      if (!ssotPath) {
        logger.log('error', 'SSOT生成失敗');
        return { success: false, reason: 'ssot_generation_failed' };
      }
    }
    
    // 3. SSOT監査（マルチLLM: Gemini + GPT-4o AND合成）
    let auditResult = await multiLLMAudit(ssotPath, logger);
    
    // 4. スコア不足なら修正（95点以上が合格）
    let retries = 0;
    while (auditResult.score < CONFIG.ssotAuditPassScore && retries < CONFIG.maxRetries) {
      logger.log('warning', `スコア${auditResult.score}点 < ${CONFIG.ssotAuditPassScore}点、修正を試行（${retries + 1}/${CONFIG.maxRetries}）`);
      
      // Claude Codeで修正
      const fixPrompt = `
以下のSSOT監査で指摘された問題を修正してください。
目標スコア: ${CONFIG.ssotAuditPassScore}点以上

## 監査結果
${auditResult.output}

## SSOTファイル
${ssotPath}

## 品質基準
- テーブル名・カラム名はsnake_case
- APIパスは /api/v1/admin/[resource] 形式
- 全ての要件にAccept条件を定義
- 具体的なコード例を含める

ファイルを直接編集して修正してください。
`;
      await callClaudeCode(fixPrompt, 'ssot-fix');
      
      // 再監査（マルチLLM）
      auditResult = await multiLLMAudit(ssotPath, logger);
      retries++;
    }
    
    if (auditResult.score < CONFIG.ssotAuditPassScore) {
      logger.log('error', `監査スコア不足（${auditResult.score}点 < ${CONFIG.ssotAuditPassScore}点）、人間の介入が必要`);
      return { success: false, reason: 'audit_failed', score: auditResult.score };
    }
    
    logger.log('success', `SSOT監査合格: ${auditResult.score}点（基準: ${CONFIG.ssotAuditPassScore}点）`)

    // 5. プロンプト生成
    logger.log('step', 'プロンプト生成');
    let promptResult;
    try {
      promptResult = execSync(
        `node scripts/prompt-generator/generate-prompt.cjs ${taskId}`,
        { encoding: 'utf8', cwd: path.join(__dirname, '../..') }
      );
    } catch (error) {
      // プロンプト生成スクリプトがない場合は簡易プロンプト
      logger.log('warning', 'プロンプト生成スクリプト失敗、簡易プロンプト使用');
      promptResult = `
## タスク: ${taskId}
${subTask.name}

## SSOT参照
${ssotPath}

## 実装手順
1. SSOTを読み込む
2. 要件を確認
3. 実装を行う
4. テストを実行
`;
    }

    // 6. プロンプト監査
    const promptAuditResult = await auditPrompt(promptResult, logger);
    if (promptAuditResult.score < CONFIG.promptAuditPassScore) {
      logger.log('warning', `プロンプト監査スコア不足: ${promptAuditResult.score}点`);
      // プロンプトを補強
      promptResult += `

## 追加の必須確認事項
${promptAuditResult.failed.map(f => `- [ ] ${f.name}`).join('\n')}
`;
      logger.log('info', 'プロンプトを補強しました');
    }

    // 7. 実装（Claude Code）
    logger.log('step', '実装開始（Claude Code）');
    const implementPrompt = `
以下のタスクを実装してください。

## タスク
${subTask.name}

## 説明
${subTask.description || ''}

## SSOT
${ssotPath}

## プロンプト
${promptResult}

実装完了後、変更したファイルを報告してください。
`;
    
    await callClaudeCode(implementPrompt, 'implementation');
    logger.log('info', '実装完了');

    // 8. テスト
    const testType = subTask.name.includes('UI') ? 'guest' : 'admin';
    let testResult = await runTests(testType, logger);
    
    // テスト失敗時はリトライ
    let testRetries = 0;
    while (!testResult.success && testRetries < CONFIG.maxRetries) {
      logger.log('warning', 'テスト失敗、修正を試行');
      
      const fixPrompt = `
テストが失敗しました。以下のエラーを修正してください。

## エラー
${testResult.error}

修正後、変更したファイルを報告してください。
`;
      await callClaudeCode(fixPrompt);
      testResult = await runTests(testType, logger);
      testRetries++;
    }

    if (!testResult.success) {
      logger.log('error', 'テスト失敗、人間の介入が必要');
      return { success: false, reason: 'test_failed' };
    }

    // 8. PR作成
    const prResult = await createPR(taskId, subTask.name, logger);

    // 9. タスクをDoneに
    await updateTaskState(taskId, 'Done');
    logger.log('success', `${taskId} 完了!`);

    return { success: true, pr: prResult.url };

  } catch (error) {
    logger.log('error', `サブタスク失敗: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ===== SSOT検索 =====
function findSSOT(task) {
  const ssotDirs = [
    'docs/03_ssot/00_foundation',
    'docs/03_ssot/01_admin_features',
    'docs/03_ssot/02_guest_features',
    'docs/03_ssot/02_guest_features/ai_chat'
  ];
  
  // タスク名からキーワード抽出
  const keywords = ['handoff', 'permission', 'order', 'menu', 'staff', 'tenant'];
  const taskLower = task.name.toLowerCase();
  
  for (const keyword of keywords) {
    if (taskLower.includes(keyword)) {
      for (const dir of ssotDirs) {
        const dirPath = path.join(__dirname, '../..', dir);
        if (!fs.existsSync(dirPath)) continue;
        
        const files = fs.readdirSync(dirPath);
        const match = files.find(f => f.toLowerCase().includes(keyword) && f.endsWith('.md'));
        if (match) {
          return path.join(dir, match);
        }
      }
    }
  }
  
  return null;
}

// ===== メイン =====
async function main() {
  const args = process.argv.slice(2);
  const taskId = args[0];
  const dryRun = args.includes('--dry-run');

  if (!taskId) {
    console.log('使い方: node run-task.cjs <タスクID> [--dry-run]');
    console.log('例: node run-task.cjs DEV-0170');
    process.exit(1);
  }

  const logger = new Logger(taskId);

  console.log('████████████████████████████████████████████████████████████');
  console.log(`🚀 タスク自動実行: ${taskId}`);
  console.log('████████████████████████████████████████████████████████████');
  if (dryRun) console.log('⚠️ DRY RUN モード（実際の変更なし）\n');

  try {
    // 親タスク情報取得
    logger.log('step', '親タスク情報取得');
    const parentTask = await getTaskInfo(taskId);
    logger.log('info', `タイトル: ${parentTask.name}`);

    // 子タスク取得
    logger.log('step', '子タスク取得');
    const subTasks = await getSubTasks(taskId);
    logger.log('info', `子タスク数: ${subTasks.length}`);
    
    if (subTasks.length === 0) {
      logger.log('warning', '子タスクがありません。親タスク自体を実行します。');
      subTasks.push(parentTask);
    }

    // 各子タスクを実行
    const results = [];
    for (const subTask of subTasks) {
      const result = await executeSubTask(subTask, logger, dryRun);
      results.push({ taskId: subTask.sequence_id, devNo: parseDevNumber(subTask.name), ...result });
      
      if (!result.success && !result.skipped) {
        logger.log('error', '子タスク失敗のため中断');
        break;
      }
    }

    // 全子タスク完了なら親もDone
    const allSuccess = results.every(r => r.success);
    if (allSuccess && !dryRun) {
      await updateTaskState(taskId, 'Done');
      logger.log('success', `親タスク ${taskId} 完了!`);
    }

    // サマリー
    console.log('\n');
    console.log('████████████████████████████████████████████████████████████');
    console.log('📊 実行サマリー');
    console.log('████████████████████████████████████████████████████████████');
    console.log(`\n成功: ${results.filter(r => r.success).length}/${results.length}`);
    
    results.forEach(r => {
      const status = r.success ? '✅' : '❌';
      const displayId = r.devNo ? `DEV-${String(r.devNo).padStart(4, '0')}` : `SEQ-${r.taskId}`;
      console.log(`  ${status} ${displayId}`);
    });

    // ログ保存
    const logPath = logger.save();
    console.log(`\n📄 ログ: ${logPath}`);

  } catch (error) {
    logger.log('error', `致命的エラー: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
