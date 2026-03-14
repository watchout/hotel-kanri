#!/usr/bin/env node
/**
 * SSOT生成パイプライン（Claude Code版）
 * 
 * フロー:
 * 1. SSOT作成（Claude Code）
 * 2. 監査1（GPT-4o）
 * 3. 監査2（GPT-4o-mini）
 * 4. 修正（Claude Code）
 * 5. 完成＆スコア算出
 * 
 * @version 1.1.0
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

// ===== 設定 =====
const CONFIG = {
  models: {
    creator: 'claude-code',           // SSOT作成（Claude Code CLI）
    auditor1: 'gpt-4o',               // 監査1
    auditor2: 'gpt-4o-mini',          // 監査2（低コスト）
    fixer: 'claude-code'              // 修正（Claude Code CLI）
  },
  outputDir: path.join(__dirname, '../../evidence/ssot-pipeline')
};

// ===== チェックリスト定義 =====
const CHECKLIST = {
  technical: [
    { id: 'T01', name: 'テーブル名がsnake_case', weight: 2 },
    { id: 'T02', name: 'カラム名がsnake_case', weight: 2 },
    { id: 'T03', name: 'Prisma @map使用', weight: 2 },
    { id: 'T04', name: 'tenant_idインデックス', weight: 2 },
    { id: 'T05', name: 'リレーション定義正確', weight: 2 },
    { id: 'T06', name: 'パス形式 /api/v1/admin/', weight: 2 },
    { id: 'T07', name: '深いネストなし', weight: 2 },
    { id: 'T08', name: 'HTTP Method適切', weight: 2 },
    { id: 'T09', name: 'レスポンス形式統一', weight: 2 },
    { id: 'T10', name: 'エラーコード定義', weight: 2 },
    { id: 'T11', name: 'SessionUser形式正確', weight: 2 },
    { id: 'T12', name: 'tenant_id必須チェック', weight: 2 },
    { id: 'T13', name: '権限チェック記述', weight: 2 },
    { id: 'T14', name: '認証エラーハンドリング', weight: 2 },
    { id: 'T15', name: 'セキュリティ要件明記', weight: 2 },
    { id: 'T16', name: '既存SSOTと用語統一', weight: 2 },
    { id: 'T17', name: '既存APIパターン踏襲', weight: 2 },
    { id: 'T18', name: 'システム間連携正確', weight: 2 },
    { id: 'T19', name: 'hotel-common経由', weight: 2 },
    { id: 'T20', name: '変数名統一', weight: 2 },
    { id: 'T21', name: 'マルチテナント対応', weight: 2 },
    { id: 'T22', name: 'トランザクション考慮', weight: 2 },
    { id: 'T23', name: 'キャッシュ戦略', weight: 2 },
    { id: 'T24', name: 'ログ出力定義', weight: 2 },
    { id: 'T25', name: 'パフォーマンス要件', weight: 2 }
  ],
  implementability: [
    { id: 'I01', name: '要件ID体系（XXX-001）', weight: 3 },
    { id: 'I02', name: '全要件にID付与', weight: 3 },
    { id: 'I03', name: 'Accept条件明記', weight: 3 },
    { id: 'I04', name: 'Accept条件が検証可能', weight: 3 },
    { id: 'I05', name: '優先度明記', weight: 3 },
    { id: 'I06', name: '実装チェックリストあり', weight: 2 },
    { id: 'I07', name: 'Phase分け明確', weight: 2 },
    { id: 'I08', name: '各Phase完了条件', weight: 2 },
    { id: 'I09', name: 'テストケース定義', weight: 2 },
    { id: 'I10', name: 'ロールバック手順', weight: 2 },
    { id: 'I11', name: 'エラーケース列挙', weight: 2 },
    { id: 'I12', name: 'ユーザー表示メッセージ', weight: 2 },
    { id: 'I13', name: 'リトライ戦略', weight: 2 },
    { id: 'I14', name: '障害時対応', weight: 2 },
    { id: 'I15', name: 'バリデーション定義', weight: 2 },
    { id: 'I16', name: '技術視点あり', weight: 2 },
    { id: 'I17', name: 'ビジネス視点あり', weight: 2 },
    { id: 'I18', name: 'UX視点あり', weight: 2 },
    { id: 'I19', name: '運用視点あり', weight: 2 },
    { id: 'I20', name: 'KPI/ROI定義', weight: 2 },
    { id: 'I21', name: '概要セクション', weight: 1 },
    { id: 'I22', name: '変更履歴', weight: 1 },
    { id: 'I23', name: 'バージョン番号', weight: 1 },
    { id: 'I24', name: '関連SSOT参照', weight: 1 },
    { id: 'I25', name: '用語定義', weight: 1 }
  ]
};

// ===== タスク定義 =====
const TASKS = {
  permission: {
    id: 'permission',
    name: '権限システム',
    description: `管理画面の権限システム（RBAC）

機能要件:
- ロール管理（作成/編集/削除）
- 権限管理（リソース×アクション）
- ロール×権限の割り当て
- スタッフへのロール割り当て
- 権限チェックAPI

非機能要件:
- マルチテナント対応
- 権限チェックは100ms以内
- 監査ログ必須

制約:
- 既存のstaff_members, tenantsテーブルと連携
- オーナーロールは削除不可
- 循環参照禁止`
  },
  aiFaq: {
    id: 'aiFaq',
    name: 'AI FAQ自動応答',
    description: `ゲスト向けAI FAQ自動応答システム

機能要件:
- 質問の意図分類（多言語対応）
- FAQナレッジベース検索
- AI応答生成（Claude/GPT選択可）
- 回答の信頼度スコア
- 低信頼度時のフォールバック

非機能要件:
- 15言語対応
- 応答3秒以内
- 正答率90%以上

制約:
- ハンドオフ機能と連携
- テナント別ナレッジベース
- コスト制限（$0.01/応答）`
  },
  orderManagement: {
    id: 'orderManagement',
    name: '注文管理',
    description: `ルームサービス注文管理システム

機能要件:
- 注文一覧（リアルタイム更新）
- 注文詳細表示
- ステータス更新（受付→調理中→配達中→完了）
- 在庫連動（品切れ時自動非表示）
- キッチン/フロント通知

非機能要件:
- 同時100注文処理
- 画面更新1秒以内
- 24時間稼働

制約:
- メニューマスタと連携
- 客室情報と連携
- 多言語注文対応`
  }
};

// ===== Claude Code呼び出し =====
async function callClaudeCode(prompt) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(__dirname, '.temp-prompt.txt');
    fs.writeFileSync(tempFile, prompt);

    try {
      // パイプでプロンプトを渡して --print で非対話実行
      const result = execSync(`cat "${tempFile}" | claude --print`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
        timeout: 300000, // 5分
        cwd: path.join(__dirname, '../..')
      });
      fs.unlinkSync(tempFile);
      resolve(result);
    } catch (error) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      reject(error);
    }
  });
}

// ===== GPT呼び出し =====
async function callGPT(prompt, model = 'gpt-4o') {
  const OpenAI = require('openai');
  const client = new OpenAI();
  
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 8192
  });
  
  return {
    content: response.choices[0].message.content,
    usage: response.usage
  };
}

// ===== プロンプト =====
const PROMPTS = {
  create: (task) => `あなたはSSOT（Single Source of Truth）作成エキスパートです。
以下の機能について、高品質なSSOT文書を作成してください。

## 対象機能
${task.description}

## 必須セクション
1. 概要（目的・適用範囲・関連SSOT）
2. 要件定義（FR-001形式、各要件にAccept条件必須）
3. データベース設計（Prismaスキーマ、@map必須）
4. API設計（/api/v1/admin/形式、リクエスト/レスポンス）
5. UI/UX要件
6. エラーハンドリング
7. ビジネス指標（ROI/KPI）
8. 実装チェックリスト（Phase 1-5）
9. 変更履歴

## 重要ルール
- 要件IDは必ずFR-001, NFR-001形式
- Accept条件は検証可能な形で記述
- DB命名はsnake_case、Prismaは@map使用
- APIは深いネスト禁止

Markdown形式で出力してください。`,

  audit: (ssot) => `あなたはSSOT品質監査エキスパートです。
以下のSSOTを監査し、問題点を指摘してください。

## 対象SSOT
${ssot}

## 出力フォーマット（JSON）
{
  "score": {
    "technical": 0-50,
    "implementability": 0-50,
    "total": 0-100
  },
  "issues": [
    {
      "severity": "critical|warning|info",
      "category": "技術|実装可能性",
      "title": "問題のタイトル",
      "description": "問題の詳細",
      "recommendation": "推奨される修正"
    }
  ],
  "summary": "全体評価の要約"
}

必ずJSON形式で出力してください。`,

  fix: (ssot, issues) => `あなたはSSOT修正エキスパートです。
以下の指摘に基づき、SSOTを修正してください。

## 元のSSO
${ssot}

## 指摘事項
${issues}

## 修正ルール
1. severity: critical は必ず修正
2. severity: warning は可能な限り修正
3. 元のフォーマットを維持
4. 修正箇所にコメント不要

修正後のSSO全文をMarkdown形式で出力してください。`
};

// ===== スコア計算 =====
function calculateScore(ssot) {
  let technical = 0;
  let implementability = 0;

  const checks = {
    T01: /@@map\("[a-z_]+"\)/.test(ssot),
    T02: /@map\("[a-z_]+"\)/.test(ssot),
    T03: /@map/.test(ssot),
    T04: /@@index\(\[tenantId\]\)/.test(ssot),
    T05: /model\s+\w+\s*\{/.test(ssot),
    T06: /\/api\/v1\/admin\//.test(ssot),
    T07: !/\/\[.*\]\/.*\/\[.*\]/.test(ssot),
    T08: /\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|/.test(ssot),
    T09: /interface.*Response/.test(ssot) || /Response.*\{/.test(ssot),
    T10: /4\d{2}|5\d{2}/.test(ssot),
    T11: /session|SessionUser/.test(ssot),
    T12: /tenant_id|tenantId/.test(ssot),
    T13: /権限|permission|checkPermission/.test(ssot),
    T14: /401|認証エラー/.test(ssot),
    T15: /セキュリティ|security/.test(ssot),
    T16: /関連SSOT|SSOT_/.test(ssot),
    T17: /\/api\/v1\//.test(ssot),
    T18: /hotel-common|連携/.test(ssot),
    T19: /hotel-common/.test(ssot),
    T20: /tenant|Tenant/.test(ssot),
    T21: /マルチテナント|tenant_id/.test(ssot),
    T22: /トランザクション|transaction/.test(ssot),
    T23: /キャッシュ|cache|Redis/.test(ssot),
    T24: /ログ|log|監査/.test(ssot),
    T25: /ms以内|秒以内|パフォーマンス/.test(ssot),
    I01: /[A-Z]{2,3}-\d{3}/.test(ssot),
    I02: /FR-\d{3}|NFR-\d{3}/.test(ssot),
    I03: /Accept/.test(ssot),
    I04: /\[\s*[x ]\s*\]/.test(ssot),
    I05: /優先度|priority|🔴|🟡|🟢/.test(ssot),
    I06: /チェックリスト|Phase \d/.test(ssot),
    I07: /Phase \d/.test(ssot),
    I08: /完了条件|完了/.test(ssot),
    I09: /テスト|test/.test(ssot),
    I10: /ロールバック|rollback/.test(ssot),
    I11: /エラーケース|エラー/.test(ssot),
    I12: /メッセージ|message/.test(ssot),
    I13: /リトライ|retry/.test(ssot),
    I14: /障害|failure/.test(ssot),
    I15: /バリデーション|validation/.test(ssot),
    I16: /API|データベース|技術/.test(ssot),
    I17: /ROI|KPI|ビジネス/.test(ssot),
    I18: /UI|UX|ユーザー/.test(ssot),
    I19: /運用|operation/.test(ssot),
    I20: /KPI|ROI/.test(ssot),
    I21: /## 概要|## 📋/.test(ssot),
    I22: /変更履歴/.test(ssot),
    I23: /v?\d+\.\d+\.\d+|バージョン/.test(ssot),
    I24: /関連SSOT|SSOT_/.test(ssot),
    I25: /用語|定義/.test(ssot)
  };

  CHECKLIST.technical.forEach(item => {
    if (checks[item.id]) technical += item.weight;
  });
  
  CHECKLIST.implementability.forEach(item => {
    if (checks[item.id]) implementability += item.weight;
  });

  return { technical, implementability, total: technical + implementability };
}

// ===== メインパイプライン =====
async function runPipeline(taskId) {
  const task = TASKS[taskId];
  if (!task) throw new Error(`Unknown task: ${taskId}`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 SSOT Pipeline（Claude Code版）: ${task.name}`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const result = {
    task: task.name,
    steps: {},
    finalScore: null,
    cost: { gpt: 0 }
  };

  // Step 1: SSOT作成（Claude Code）
  console.log('\n📝 Step 1: SSOT作成（Claude Code）...');
  let ssotDraft;
  try {
    ssotDraft = await callClaudeCode(PROMPTS.create(task));
    result.steps.create = { model: 'claude-code', success: true };
    console.log('   ✅ 作成完了');
  } catch (error) {
    console.log(`   ⚠️ Claude Code失敗: ${error.message}`);
    console.log('   📝 GPT-4oにフォールバック...');
    const gptResult = await callGPT(PROMPTS.create(task), 'gpt-4o');
    ssotDraft = gptResult.content;
    result.steps.create = { model: 'gpt-4o', success: true };
    result.cost.gpt += (gptResult.usage.prompt_tokens / 1_000_000) * 2.5;
    result.cost.gpt += (gptResult.usage.completion_tokens / 1_000_000) * 10;
  }

  // Step 2: 監査1（GPT-4o）
  console.log('\n🔍 Step 2: 監査1（GPT-4o）...');
  let audit1Result = { issues: [], score: { total: 0 } };
  try {
    const gptResult = await callGPT(PROMPTS.audit(ssotDraft), 'gpt-4o');
    result.cost.gpt += (gptResult.usage.prompt_tokens / 1_000_000) * 2.5;
    result.cost.gpt += (gptResult.usage.completion_tokens / 1_000_000) * 10;
    
    // JSONパース
    const jsonMatch = gptResult.content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      gptResult.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      audit1Result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    result.steps.audit1 = { model: 'gpt-4o', success: true, score: audit1Result.score?.total };
    console.log(`   ✅ 監査完了 (スコア: ${audit1Result.score?.total || 'N/A'})`);
  } catch (error) {
    console.log(`   ⚠️ 監査1失敗: ${error.message}`);
    result.steps.audit1 = { model: 'gpt-4o', success: false, error: error.message };
  }

  // Step 3: 監査2（GPT-4o-mini）
  console.log('\n🔍 Step 3: 監査2（GPT-4o-mini）...');
  let audit2Result = { issues: [], score: { total: 0 } };
  try {
    const gptResult = await callGPT(PROMPTS.audit(ssotDraft), 'gpt-4o-mini');
    result.cost.gpt += (gptResult.usage.prompt_tokens / 1_000_000) * 0.15;
    result.cost.gpt += (gptResult.usage.completion_tokens / 1_000_000) * 0.6;
    
    const jsonMatch = gptResult.content.match(/```json\n?([\s\S]*?)\n?```/) || 
                      gptResult.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      audit2Result = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    result.steps.audit2 = { model: 'gpt-4o-mini', success: true, score: audit2Result.score?.total };
    console.log(`   ✅ 監査完了 (スコア: ${audit2Result.score?.total || 'N/A'})`);
  } catch (error) {
    console.log(`   ⚠️ 監査2失敗: ${error.message}`);
    result.steps.audit2 = { model: 'gpt-4o-mini', success: false, error: error.message };
  }

  // 指摘事項マージ
  const allIssues = [...(audit1Result.issues || []), ...(audit2Result.issues || [])];
  const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;
  console.log(`\n📋 指摘事項: ${criticalCount}件(Critical), ${warningCount}件(Warning)`);

  // Step 4: 修正（Claude Code）
  console.log('\n🔧 Step 4: SSOT修正（Claude Code）...');
  let ssotFinal = ssotDraft;
  if (criticalCount > 0 || warningCount > 0) {
    try {
      const issuesText = allIssues.map(i => 
        `[${i.severity}] ${i.title}: ${i.description}\n推奨: ${i.recommendation}`
      ).join('\n\n');
      ssotFinal = await callClaudeCode(PROMPTS.fix(ssotDraft, issuesText));
      result.steps.fix = { model: 'claude-code', success: true };
      console.log('   ✅ 修正完了');
    } catch (error) {
      console.log(`   ⚠️ Claude Code修正失敗: ${error.message}`);
      console.log('   📝 GPT-4oにフォールバック...');
      const issuesText = allIssues.map(i => 
        `[${i.severity}] ${i.title}: ${i.description}\n推奨: ${i.recommendation}`
      ).join('\n\n');
      const gptResult = await callGPT(PROMPTS.fix(ssotDraft, issuesText), 'gpt-4o');
      ssotFinal = gptResult.content;
      result.cost.gpt += (gptResult.usage.prompt_tokens / 1_000_000) * 2.5;
      result.cost.gpt += (gptResult.usage.completion_tokens / 1_000_000) * 10;
      result.steps.fix = { model: 'gpt-4o', success: true };
    }
  } else {
    console.log('   ⏭️ 指摘なし、修正スキップ');
    result.steps.fix = { model: 'none', skipped: true };
  }

  // Step 5: 最終スコア
  console.log('\n📊 Step 5: 最終スコア算出...');
  const finalScore = calculateScore(ssotFinal);
  result.finalScore = finalScore;
  result.ssot = ssotFinal;
  result.duration = Math.round((Date.now() - startTime) / 1000);
  result.cost.total = `$${result.cost.gpt.toFixed(4)}`;

  console.log(`   ✅ 最終スコア: ${finalScore.total}/100`);
  console.log(`      技術的正確性: ${finalScore.technical}/50`);
  console.log(`      実装可能性: ${finalScore.implementability}/50`);
  console.log(`\n⏱️ 所要時間: ${result.duration}秒`);
  console.log(`💰 コスト（GPTのみ）: ${result.cost.total}`);

  return result;
}

// ===== ベースライン（単一LLM） =====
async function runBaseline(taskId) {
  const task = TASKS[taskId];
  if (!task) throw new Error(`Unknown task: ${taskId}`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Baseline（Claude Code単体）: ${task.name}`);
  console.log('='.repeat(60));

  const startTime = Date.now();

  console.log('\n📝 SSOT作成（Claude Code）...');
  let ssot;
  try {
    ssot = await callClaudeCode(PROMPTS.create(task));
  } catch (error) {
    console.log(`   ⚠️ Claude Code失敗: ${error.message}`);
    const gptResult = await callGPT(PROMPTS.create(task), 'gpt-4o');
    ssot = gptResult.content;
  }

  const score = calculateScore(ssot);
  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log(`\n✅ 完了`);
  console.log(`   スコア: ${score.total}/100`);
  console.log(`   時間: ${duration}秒`);

  return { task: task.name, method: 'baseline', ssot, score, duration };
}

// ===== 結果保存 =====
function saveResult(result, taskId) {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${taskId}-${timestamp}.json`;
  const filepath = path.join(CONFIG.outputDir, filename);

  // SSOTを別に保存
  const ssotContent = result.ssot;
  delete result.ssot;
  
  fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
  console.log(`\n💾 結果保存: ${filepath}`);

  if (ssotContent) {
    const ssotFilename = `SSOT_${taskId.toUpperCase()}_DRAFT.md`;
    const ssotPath = path.join(CONFIG.outputDir, ssotFilename);
    fs.writeFileSync(ssotPath, ssotContent);
    console.log(`💾 SSOT保存: ${ssotPath}`);
  }

  return filepath;
}

// ===== メイン =====
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'single';
  const taskId = args[1] || 'permission';

  console.log('████████████████████████████████████████████████████████████');
  console.log('🔬 SSOT生成パイプライン（Claude Code版）');
  console.log('████████████████████████████████████████████████████████████');

  if (mode === 'baseline') {
    const result = await runBaseline(taskId);
    saveResult(result, taskId);
  } else if (mode === 'pipeline') {
    const result = await runPipeline(taskId);
    saveResult(result, taskId);
  } else if (mode === 'compare') {
    // 1タスクで比較
    console.log(`\n📊 比較モード: ${TASKS[taskId].name}`);
    
    const baseline = await runBaseline(taskId);
    const pipeline = await runPipeline(taskId);
    
    console.log('\n');
    console.log('████████████████████████████████████████████████████████████');
    console.log('📊 比較結果');
    console.log('████████████████████████████████████████████████████████████');
    console.log(`\n| 方式 | スコア | 技術 | 実装可能性 | 時間 |`);
    console.log(`|:-----|:-------|:-----|:-----------|:-----|`);
    console.log(`| ベースライン | ${baseline.score.total}点 | ${baseline.score.technical} | ${baseline.score.implementability} | ${baseline.duration}秒 |`);
    console.log(`| パイプライン | ${pipeline.finalScore.total}点 | ${pipeline.finalScore.technical} | ${pipeline.finalScore.implementability} | ${pipeline.duration}秒 |`);
    
    const diff = pipeline.finalScore.total - baseline.score.total;
    console.log(`\n🎯 結論: パイプライン方式は ${diff >= 0 ? '+' : ''}${diff}点`);
    
    saveResult({ baseline, pipeline, diff }, `compare-${taskId}`);
  } else if (mode === 'full') {
    // 全タスク比較
    const results = { baseline: {}, pipeline: {} };
    
    for (const tid of Object.keys(TASKS)) {
      console.log(`\n${'#'.repeat(60)}`);
      console.log(`# タスク: ${TASKS[tid].name}`);
      console.log('#'.repeat(60));
      
      results.baseline[tid] = await runBaseline(tid);
      results.pipeline[tid] = await runPipeline(tid);
      saveResult(results.pipeline[tid], tid);
    }

    // サマリー
    console.log('\n');
    console.log('████████████████████████████████████████████████████████████');
    console.log('📊 全タスク検証サマリー');
    console.log('████████████████████████████████████████████████████████████');
    
    console.log('\n| タスク | ベースライン | パイプライン | 差分 |');
    console.log('|:-------|:-------------|:-------------|:-----|');
    
    let totalB = 0, totalP = 0;
    for (const tid of Object.keys(TASKS)) {
      const b = results.baseline[tid].score.total;
      const p = results.pipeline[tid].finalScore.total;
      const diff = p - b;
      console.log(`| ${TASKS[tid].name} | ${b}点 | ${p}点 | ${diff >= 0 ? '+' : ''}${diff} |`);
      totalB += b;
      totalP += p;
    }
    
    const avgB = Math.round(totalB / Object.keys(TASKS).length);
    const avgP = Math.round(totalP / Object.keys(TASKS).length);
    console.log(`| **平均** | **${avgB}点** | **${avgP}点** | **${avgP - avgB >= 0 ? '+' : ''}${avgP - avgB}** |`);
    
    saveResult(results, 'full-comparison');
  } else {
    // single: 1タスクだけパイプライン
    const result = await runPipeline(taskId);
    saveResult(result, taskId);
  }
}

main().catch(console.error);
