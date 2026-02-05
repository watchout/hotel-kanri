#!/usr/bin/env node
/**
 * マルチLLMペアプログラミングシステム
 * 
 * 複数のLLM（Claude, GPT-4o, Gemini）を組み合わせて
 * より高品質なコード生成・レビューを実現
 * 
 * 役割分担:
 * - 実装AI: Claude.ai（メイン実装担当）
 * - レビューAI: GPT-4o + Gemini（並列コードレビュー）
 * - 最終判定: マルチLLM投票（3モデル中2以上でPass）
 * 
 * Usage:
 *   node multi-llm-pair-programming.cjs review <file>
 *   node multi-llm-pair-programming.cjs audit <ssot> <code>
 *   node multi-llm-pair-programming.cjs generate <ssot> --mode pair
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// LLMクライアント読み込み
let LLMClient;
try {
  const llmModule = require('../prompt-generator/lib/llm-client.cjs');
  LLMClient = llmModule.LLMClient;
} catch (error) {
  console.error('❌ LLMクライアントの読み込みに失敗:', error.message);
  process.exit(1);
}

// ===== 設定 =====

const CONFIG = {
  // 実装AI
  implementer: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    role: '実装担当'
  },
  
  // レビューAI（並列実行）
  reviewers: [
    { provider: 'openai', model: 'gpt-4o', role: 'コードレビュー1' },
    { provider: 'google', model: 'gemini-1.5-pro-latest', role: 'コードレビュー2' }
  ],
  
  // 監査AI（SSOT準拠チェック）
  auditors: [
    { provider: 'anthropic', model: 'claude-opus-4-20250514', role: 'SSOT監査' },
    { provider: 'openai', model: 'gpt-4o', role: 'SSOT監査' },
    { provider: 'google', model: 'gemini-1.5-pro-latest', role: 'SSOT監査' }
  ],
  
  // 投票ルール
  voting: {
    passThreshold: 2,  // 3モデル中2以上でPass
    minScore: 85       // 最低スコア
  },
  
  // ログ保存先
  logsDir: path.join(__dirname, '../../logs/multi-llm')
};

// ===== ユーティリティ =====

function log(message, level = 'INFO') {
  const emoji = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌',
    REVIEW: '🔍',
    VOTE: '🗳️'
  }[level] || 'ℹ️';
  console.log(`${emoji} ${message}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function extractScore(content) {
  if (!content) return null;
  const match = content.match(/"score"\s*:\s*(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function extractIssues(content) {
  if (!content) return [];
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[0]);
      return json.issues || [];
    }
  } catch (e) {
    // JSON解析失敗
  }
  return [];
}

// ===== コードレビュー =====

const CODE_REVIEW_PROMPT = (code, ssot = null) => `
あなたは経験豊富なシニアエンジニアです。以下のコードをレビューしてください。

## レビュー観点
1. **SSOT準拠**: 仕様書（SSOT）の要件を満たしているか
2. **品質**: コードの可読性、保守性、パフォーマンス
3. **セキュリティ**: 脆弱性、入力検証、認証・認可
4. **ベストプラクティス**: 設計パターン、エラーハンドリング

${ssot ? `## 参照SSOT（仕様書）
\`\`\`markdown
${ssot.substring(0, 3000)}
\`\`\`` : ''}

## レビュー対象コード
\`\`\`
${code.substring(0, 5000)}
\`\`\`

## 出力形式（JSON厳守）
{
  "score": 0-100の整数,
  "verdict": "APPROVE" | "REQUEST_CHANGES" | "COMMENT",
  "issues": [
    { "severity": "critical|major|minor", "line": 行番号, "message": "問題点" }
  ],
  "suggestions": ["改善提案"],
  "summary": "総評"
}
`;

/**
 * 並列コードレビュー
 */
async function parallelCodeReview(code, ssot = null) {
  const client = new LLMClient();
  const results = [];
  
  log('並列コードレビュー開始...', 'REVIEW');
  
  const prompt = CODE_REVIEW_PROMPT(code, ssot);
  
  // 並列実行
  const promises = CONFIG.reviewers.map(async (reviewer) => {
    try {
      log(`  ${reviewer.role} (${reviewer.model})...`, 'INFO');
      
      let response;
      if (reviewer.provider === 'openai') {
        response = await client.callGPT(prompt, reviewer.model, { maxTokens: 2000 });
      } else if (reviewer.provider === 'google') {
        response = await client.callGemini(prompt, reviewer.model, { maxTokens: 2000 });
      } else {
        response = await client.callClaude(prompt, reviewer.model, { maxTokens: 2000 });
      }
      
      const score = extractScore(response.content);
      const issues = extractIssues(response.content);
      
      return {
        model: reviewer.model,
        role: reviewer.role,
        score,
        issues,
        raw: response.content
      };
    } catch (error) {
      log(`  ${reviewer.role} エラー: ${error.message}`, 'ERROR');
      return {
        model: reviewer.model,
        role: reviewer.role,
        score: null,
        issues: [],
        error: error.message
      };
    }
  });
  
  const reviewResults = await Promise.all(promises);
  
  // 集計
  const validScores = reviewResults.filter(r => r.score !== null).map(r => r.score);
  const avgScore = validScores.length > 0 
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0;
  
  // 全issuesを統合（重複除去）
  const allIssues = [];
  const seenMessages = new Set();
  reviewResults.forEach(r => {
    r.issues.forEach(issue => {
      if (!seenMessages.has(issue.message)) {
        seenMessages.add(issue.message);
        allIssues.push({ ...issue, from: r.model });
      }
    });
  });
  
  return {
    reviews: reviewResults,
    avgScore,
    allIssues,
    passCount: validScores.filter(s => s >= CONFIG.voting.minScore).length,
    totalReviewers: CONFIG.reviewers.length
  };
}

// ===== SSOT監査 =====

const SSOT_AUDIT_PROMPT = (ssot, code) => `
あなたはSSOT準拠監査官です。
実装コードがSSOT（Single Source of Truth）の要件を100%満たしているか厳密に評価してください。

## 評価基準
1. 要件ID（XXX-nnn形式）が全て実装されているか
2. Accept条件が全て満たされているか
3. API仕様（エンドポイント、リクエスト/レスポンス）が正確か
4. DBスキーマ（テーブル、カラム）が正確か
5. エラーハンドリングが仕様通りか

## SSOT（仕様書）
\`\`\`markdown
${ssot.substring(0, 4000)}
\`\`\`

## 実装コード
\`\`\`
${code.substring(0, 4000)}
\`\`\`

## 出力形式（JSON厳守）
{
  "score": 0-100の整数,
  "requirementsCovered": ["実装済みの要件ID"],
  "requirementsMissing": ["未実装の要件ID"],
  "issues": [
    { "type": "missing|incorrect|incomplete", "requirementId": "XXX-nnn", "message": "問題点" }
  ],
  "summary": "総評"
}
`;

/**
 * マルチLLM SSOT監査（投票方式）
 */
async function multiLlmSsotAudit(ssotPath, codePath) {
  const client = new LLMClient();
  
  const ssot = fs.readFileSync(ssotPath, 'utf8');
  const code = fs.readFileSync(codePath, 'utf8');
  
  log('マルチLLM SSOT監査開始...', 'VOTE');
  
  const prompt = SSOT_AUDIT_PROMPT(ssot, code);
  
  // 並列実行
  const promises = CONFIG.auditors.map(async (auditor) => {
    try {
      log(`  ${auditor.role} (${auditor.model})...`, 'INFO');
      
      let response;
      if (auditor.provider === 'openai') {
        response = await client.callGPT(prompt, auditor.model, { maxTokens: 2000 });
      } else if (auditor.provider === 'google') {
        response = await client.callGemini(prompt, auditor.model, { maxTokens: 2000 });
      } else {
        response = await client.callClaude(prompt, auditor.model, { maxTokens: 2000 });
      }
      
      const score = extractScore(response.content);
      
      return {
        model: auditor.model,
        score,
        raw: response.content
      };
    } catch (error) {
      log(`  ${auditor.model} エラー: ${error.message}`, 'ERROR');
      return {
        model: auditor.model,
        score: null,
        error: error.message
      };
    }
  });
  
  const auditResults = await Promise.all(promises);
  
  // 投票集計
  const validScores = auditResults.filter(r => r.score !== null).map(r => r.score);
  const passVotes = validScores.filter(s => s >= CONFIG.voting.minScore).length;
  const avgScore = validScores.length > 0 
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : 0;
  
  const passed = passVotes >= CONFIG.voting.passThreshold;
  
  return {
    audits: auditResults,
    avgScore,
    passVotes,
    totalAuditors: CONFIG.auditors.length,
    passed,
    verdict: passed ? 'APPROVED' : 'REJECTED'
  };
}

// ===== ペアプログラミング生成 =====

const PAIR_PROGRAMMING_SYSTEM = `
あなたは2人のAIエンジニアがペアプログラミングしています。

【Driver（実装担当）】
- コードを書く
- 細部に集中
- 要件を正確に実装

【Navigator（レビュー担当）】
- 全体設計を俯瞰
- 問題点を指摘
- 改善提案

交互に役割を切り替えながら、最高品質のコードを生成してください。
`;

/**
 * ペアプログラミング形式でコード生成
 */
async function pairProgrammingGenerate(ssotPath) {
  const client = new LLMClient();
  const ssot = fs.readFileSync(ssotPath, 'utf8');
  
  log('ペアプログラミング開始...', 'INFO');
  
  // Phase 1: Claude（Driver）が初期実装
  log('Phase 1: Driver（Claude）が初期実装...', 'INFO');
  const driverPrompt = `
${PAIR_PROGRAMMING_SYSTEM}

あなたはDriverです。以下のSSOTに基づいてコードを実装してください。

## SSOT
${ssot.substring(0, 5000)}

## 指示
1. 要件IDを全て確認
2. Accept条件を満たす実装
3. TypeScriptで実装
4. コメントで要件IDを記載
`;
  
  const driverResponse = await client.callClaude(driverPrompt, CONFIG.implementer.model, {
    maxTokens: 4000,
    system: 'あなたは経験豊富なTypeScriptエンジニアです。'
  });
  
  const initialCode = driverResponse.content;
  log('  初期実装完了', 'SUCCESS');
  
  // Phase 2: GPT-4o（Navigator）がレビュー
  log('Phase 2: Navigator（GPT-4o）がレビュー...', 'REVIEW');
  const navigatorPrompt = `
${PAIR_PROGRAMMING_SYSTEM}

あなたはNavigatorです。Driverが書いたコードをレビューし、改善点を指摘してください。

## SSOT
${ssot.substring(0, 3000)}

## Driverのコード
${initialCode.substring(0, 4000)}

## 指示
1. SSOT準拠をチェック
2. 問題点を指摘
3. 改善提案
4. 修正後のコードを提案

## 出力形式
### 問題点
- [問題1]
- [問題2]

### 改善提案
- [提案1]
- [提案2]

### 修正後のコード
\`\`\`typescript
// 修正後のコード
\`\`\`
`;
  
  const navigatorResponse = await client.callGPT(navigatorPrompt, 'gpt-4o', {
    maxTokens: 4000
  });
  
  log('  レビュー完了', 'SUCCESS');
  
  // Phase 3: Claude（Driver）が修正を反映
  log('Phase 3: Driver（Claude）が修正を反映...', 'INFO');
  const finalPrompt = `
${PAIR_PROGRAMMING_SYSTEM}

Navigatorからのフィードバックを受けて、最終版のコードを生成してください。

## Navigatorのフィードバック
${navigatorResponse.content.substring(0, 3000)}

## 元のコード
${initialCode.substring(0, 3000)}

## 指示
1. フィードバックを全て反映
2. SSOT準拠を確認
3. 最終版のコードのみを出力

## 出力
最終版のTypeScriptコードのみを出力してください。
`;
  
  const finalResponse = await client.callClaude(finalPrompt, CONFIG.implementer.model, {
    maxTokens: 4000
  });
  
  log('  最終版生成完了', 'SUCCESS');
  
  return {
    initialCode,
    navigatorFeedback: navigatorResponse.content,
    finalCode: finalResponse.content
  };
}

// ===== 結果出力 =====

function printReviewResult(result) {
  console.log('\n' + '━'.repeat(60));
  console.log('📊 コードレビュー結果');
  console.log('━'.repeat(60));
  
  console.log('\n| モデル | スコア | 判定 |');
  console.log('|:-------|-------:|:-----|');
  result.reviews.forEach(r => {
    const verdict = r.score >= CONFIG.voting.minScore ? '✅ Pass' : '❌ Fail';
    console.log(`| ${r.model} | ${r.score || 'エラー'} | ${r.error ? '⚠️ エラー' : verdict} |`);
  });
  
  console.log(`\n### 総合スコア: ${result.avgScore}点`);
  console.log(`### Pass: ${result.passCount}/${result.totalReviewers}`);
  
  if (result.allIssues.length > 0) {
    console.log('\n### 指摘事項');
    result.allIssues.forEach((issue, i) => {
      const severity = {
        critical: '🔴',
        major: '🟠',
        minor: '🟡'
      }[issue.severity] || '⚪';
      console.log(`${i + 1}. ${severity} ${issue.message} (by ${issue.from})`);
    });
  }
  
  console.log('━'.repeat(60));
}

function printAuditResult(result) {
  console.log('\n' + '━'.repeat(60));
  console.log('🗳️ マルチLLM SSOT監査結果');
  console.log('━'.repeat(60));
  
  console.log('\n| モデル | スコア | 投票 |');
  console.log('|:-------|-------:|:-----|');
  result.audits.forEach(r => {
    const vote = r.score >= CONFIG.voting.minScore ? '✅ Pass' : '❌ Fail';
    console.log(`| ${r.model} | ${r.score || 'エラー'} | ${r.error ? '⚠️ エラー' : vote} |`);
  });
  
  console.log(`\n### 総合スコア: ${result.avgScore}点`);
  console.log(`### 投票結果: ${result.passVotes}/${result.totalAuditors} (閾値: ${CONFIG.voting.passThreshold})`);
  console.log(`### 判定: ${result.passed ? '✅ APPROVED' : '❌ REJECTED'}`);
  
  console.log('━'.repeat(60));
}

// ===== メイン =====

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  ensureDir(CONFIG.logsDir);
  
  switch (command) {
    case 'review': {
      const filePath = args[1];
      if (!filePath) {
        console.log('Usage: node multi-llm-pair-programming.cjs review <file> [--ssot <ssot-path>]');
        process.exit(1);
      }
      
      const ssotIndex = args.indexOf('--ssot');
      const ssotPath = ssotIndex !== -1 ? args[ssotIndex + 1] : null;
      
      const code = fs.readFileSync(filePath, 'utf8');
      const ssot = ssotPath ? fs.readFileSync(ssotPath, 'utf8') : null;
      
      const result = await parallelCodeReview(code, ssot);
      printReviewResult(result);
      break;
    }
    
    case 'audit': {
      const ssotPath = args[1];
      const codePath = args[2];
      
      if (!ssotPath || !codePath) {
        console.log('Usage: node multi-llm-pair-programming.cjs audit <ssot-path> <code-path>');
        process.exit(1);
      }
      
      const result = await multiLlmSsotAudit(ssotPath, codePath);
      printAuditResult(result);
      
      process.exit(result.passed ? 0 : 1);
      break;
    }
    
    case 'generate': {
      const ssotPath = args[1];
      
      if (!ssotPath) {
        console.log('Usage: node multi-llm-pair-programming.cjs generate <ssot-path>');
        process.exit(1);
      }
      
      const result = await pairProgrammingGenerate(ssotPath);
      
      console.log('\n' + '━'.repeat(60));
      console.log('🎉 ペアプログラミング完了');
      console.log('━'.repeat(60));
      console.log('\n### 最終コード\n');
      console.log(result.finalCode);
      break;
    }
    
    case 'help':
    case '--help':
    case '-h':
      console.log(`
マルチLLMペアプログラミングシステム

Usage:
  node multi-llm-pair-programming.cjs <command> [options]

Commands:
  review <file>               並列コードレビュー
    --ssot <path>             SSOT参照（オプション）
  
  audit <ssot> <code>         マルチLLM SSOT監査（投票方式）
  
  generate <ssot>             ペアプログラミング形式でコード生成
  
  help                        ヘルプを表示

Examples:
  # コードレビュー
  node multi-llm-pair-programming.cjs review src/routes/tenants.routes.ts
  
  # SSOT監査
  node multi-llm-pair-programming.cjs audit \\
    docs/03_ssot/01_admin_features/SSOT_XXX.md \\
    src/routes/xxx.routes.ts
  
  # ペアプログラミング生成
  node multi-llm-pair-programming.cjs generate \\
    docs/03_ssot/01_admin_features/SSOT_XXX.md

LLM構成:
  実装AI:     Claude Sonnet 4
  レビューAI: GPT-4o, Gemini 1.5 Pro
  監査AI:     Claude Opus 4, GPT-4o, Gemini 1.5 Pro

投票ルール:
  - 3モデル中2以上でPass（閾値: ${CONFIG.voting.passThreshold}）
  - 最低スコア: ${CONFIG.voting.minScore}点
`);
      break;
    
    default:
      console.log('Unknown command. Use --help for usage.');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ エラー:', error.message);
  process.exit(1);
});
