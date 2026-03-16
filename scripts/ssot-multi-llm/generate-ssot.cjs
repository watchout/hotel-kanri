#!/usr/bin/env node
/**
 * マルチLLM SSOT自動生成スクリプト
 * 
 * 3つのLLM（Claude/GPT-4o/Gemini）で多角的にSSOTを生成し、
 * 最終的に統合して高品質なSSOTを作成する。
 * 
 * Usage: node generate-ssot.cjs <TASK_ID> [--dry-run]
 * 
 * 必要な環境変数:
 *   - ANTHROPIC_API_KEY
 *   - OPENAI_API_KEY
 *   - GOOGLE_API_KEY
 */

const fs = require('fs');
const path = require('path');

// 環境変数読み込み
require('dotenv').config({ path: path.join(__dirname, '../../.env.mcp') });

// コスト計算用の料金表（USD/1M tokens）
const PRICING = {
  'claude-opus': { input: 15, output: 75 },
  'claude-sonnet': { input: 3, output: 15 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gemini-1.5-pro': { input: 1.25, output: 5 }
};

// トークン使用量を追跡
let tokenUsage = {
  'claude-opus': { input: 0, output: 0 },
  'gpt-4o': { input: 0, output: 0 },
  'gemini-1.5-pro': { input: 0, output: 0 }
};

// ===== プロンプトテンプレート =====

const TECH_ARCHITECT_PROMPT = `
あなたはシステムアーキテクトです。以下の機能について、技術的な観点から要件を定義してください。

## 対象機能
{{TASK_DESCRIPTION}}

## 出力フォーマット（Markdown）

### API設計
- エンドポイント一覧（HTTP Method, Path, 説明）
- リクエスト/レスポンス形式

### データベース設計
- 必要なテーブル/カラム
- Prismaスキーマ例

### システム間連携
- hotel-common / hotel-saas の役割分担
- 認証・認可要件

### セキュリティ要件
- 入力検証
- 認証・認可
- 監査ログ

### 実装チェックリスト
- [ ] 項目1
- [ ] 項目2
`;

const MARKETING_STRATEGIST_PROMPT = `
あなたはホテル業界のマーケティング戦略家です。以下の機能について、ビジネス価値の観点から評価・提案してください。

## 対象機能
{{TASK_DESCRIPTION}}

## 出力フォーマット（Markdown）

### ROI分析
- スタッフ時間削減（時間/月）
- 顧客満足度向上（NPS予測）
- コスト削減効果（円/月）

### 競合との差別化
- 主要競合の現状
- 差別化ポイント

### コンバージョン施策
- アップセル機会
- リピート率向上策

### KPI設定
| KPI | 目標値 | 測定方法 |
|-----|--------|----------|

### マーケティング視点での推奨機能
- 必須機能
- あると良い機能
- 将来拡張
`;

const UX_OPS_DESIGNER_PROMPT = `
あなたはホスピタリティ業界のUX/運用デザイナーです。以下の機能について、ユーザー体験と運用の観点から設計してください。

## 対象機能
{{TASK_DESCRIPTION}}

## 出力フォーマット（Markdown）

### ゲスト側ユーザーフロー
1. ステップ1
2. ステップ2
（Mermaid図も可）

### スタッフ側ユーザーフロー
1. ステップ1
2. ステップ2

### エラーハンドリング
| エラーケース | 対処方法 | ユーザーへの表示 |
|--------------|----------|------------------|

### 運用設計
- 夜間対応
- 繁忙期対応
- 障害時対応

### UI/UX要件
- 必須画面一覧
- 多言語対応
- アクセシビリティ
`;

const SYNTHESIZER_PROMPT = `
あなたはSSOT統合エージェントです。以下の3つの視点からの要件定義を統合し、最終的なSSOTドキュメントを作成してください。

## 技術アーキテクト視点
{{TECH_DRAFT}}

## マーケティング戦略視点
{{MARKETING_DRAFT}}

## UX/運用デザイン視点
{{UX_DRAFT}}

## 出力フォーマット（SSOT標準形式）

# SSOT_[機能名].md

## 概要
- 目的
- 適用範囲
- 関連SSOT

## 要件ID体系
- XXX-001: 要件1
- XXX-002: 要件2

## 機能要件（FR）
### FR-001: 機能名
- 説明
- Accept（合格条件）

## 非機能要件（NFR）
### NFR-001: 性能
### NFR-002: セキュリティ

## API仕様
### エンドポイント一覧

## データベース設計
### テーブル定義

## UI/UX要件
### 画面一覧

## ビジネス指標
### ROI
### KPI

## 実装チェックリスト
- [ ] Phase 1: 
- [ ] Phase 2:
- [ ] Phase 3:

## 変更履歴
| 日付 | バージョン | 変更内容 |
`;

// ===== API呼び出し関数 =====

async function callClaude(prompt, model = 'claude-opus-4-20250514') {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();
  
  const response = await client.messages.create({
    model: model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });
  
  // トークン使用量を記録
  const modelKey = model.includes('opus') ? 'claude-opus' : 'claude-sonnet';
  tokenUsage[modelKey] = tokenUsage[modelKey] || { input: 0, output: 0 };
  tokenUsage[modelKey].input += response.usage.input_tokens;
  tokenUsage[modelKey].output += response.usage.output_tokens;
  
  return response.content[0].text;
}

async function callGPT4o(prompt) {
  const OpenAI = require('openai');
  const client = new OpenAI();
  
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4096
  });
  
  // トークン使用量を記録
  tokenUsage['gpt-4o'].input += response.usage.prompt_tokens;
  tokenUsage['gpt-4o'].output += response.usage.completion_tokens;
  
  return response.choices[0].message.content;
}

async function callGemini(prompt) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  // 利用可能なモデル: gemini-pro, gemini-1.0-pro, gemini-1.5-pro-latest
  const model = genai.getGenerativeModel({ model: 'gemini-pro' });
  
  const result = await model.generateContent(prompt);
  const response = result.response;
  
  // Geminiはトークン数を直接返さないので推定
  const inputTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(response.text().length / 4);
  tokenUsage['gemini-1.5-pro'].input += inputTokens;
  tokenUsage['gemini-1.5-pro'].output += outputTokens;
  
  return response.text();
}

// ===== コスト計算 =====

function calculateCost() {
  let totalCost = 0;
  const breakdown = {};
  
  for (const [model, usage] of Object.entries(tokenUsage)) {
    const pricing = PRICING[model];
    if (!pricing) continue;
    
    const inputCost = (usage.input / 1000000) * pricing.input;
    const outputCost = (usage.output / 1000000) * pricing.output;
    const modelCost = inputCost + outputCost;
    
    breakdown[model] = {
      inputTokens: usage.input,
      outputTokens: usage.output,
      inputCost: inputCost.toFixed(4),
      outputCost: outputCost.toFixed(4),
      totalCost: modelCost.toFixed(4)
    };
    
    totalCost += modelCost;
  }
  
  return {
    breakdown,
    totalCost: totalCost.toFixed(4),
    totalCostJPY: Math.round(totalCost * 150) // 1 USD = 150 JPY概算
  };
}

// ===== Plane更新 =====

async function updatePlaneWithCostLog(taskId, costData, ssotPath) {
  const planeApi = require('../plane/lib/plane-api-client.cjs');
  
  const costLog = `
## 🤖 マルチLLM SSOT生成ログ

### 生成日時
${new Date().toISOString()}

### 使用モデル
| モデル | 入力トークン | 出力トークン | コスト (USD) |
|--------|-------------|-------------|--------------|
${Object.entries(costData.breakdown).map(([model, data]) => 
  `| ${model} | ${data.inputTokens} | ${data.outputTokens} | $${data.totalCost} |`
).join('\n')}

### 総コスト
- **USD**: $${costData.totalCost}
- **JPY**: ¥${costData.totalCostJPY}

### 生成されたSSO
\`${ssotPath}\`
`;

  try {
    // タスクのdescriptionにコストログを追記
    const issue = await planeApi.getIssue(taskId);
    const updatedDescription = (issue.description || '') + '\n\n---\n' + costLog;
    
    await planeApi.updateIssue(taskId, {
      description: updatedDescription
    });
    
    console.log(`✅ Plane更新完了: ${taskId}`);
  } catch (error) {
    console.error(`⚠️ Plane更新失敗: ${error.message}`);
    // ローカルにログ保存
    fs.writeFileSync(
      path.join(__dirname, `../../evidence/${taskId}/cost-log.json`),
      JSON.stringify(costData, null, 2)
    );
  }
}

// ===== メイン処理 =====

async function main() {
  const [,, taskId, ...flags] = process.argv;
  const dryRun = flags.includes('--dry-run');
  
  if (!taskId) {
    console.error('Usage: node generate-ssot.cjs <TASK_ID> [--dry-run]');
    process.exit(1);
  }
  
  console.log(`🚀 マルチLLM SSOT生成開始: ${taskId}`);
  console.log(`   Dry Run: ${dryRun}`);
  
  // タスク説明（本番ではPlane APIから取得）
  const taskDescription = `
[MVP] 有人ハンドオフ機能

## 概要
AIチャットで解決できない問い合わせを、スタッフに引き継ぐ機能。

## MVP制約
- 通知チャネル: 1つ固定（フロントデスク通知）
- タイムアウト: 60秒で電話CTAを表示
- 対象: hotel-saas（ゲストUI）+ hotel-common（API）

## 既存実装
- FAQアクション: type: 'handoff', channel: 'front_desk' は定義済み
- AIChatWidget.vue に handleHandoff() スタブあり
`;

  if (dryRun) {
    console.log('\n📋 タスク説明:');
    console.log(taskDescription);
    console.log('\n[Dry Run] 実際のAPI呼び出しはスキップします');
    return;
  }
  
  // API Keyチェック
  const missingKeys = [];
  if (!process.env.ANTHROPIC_API_KEY) missingKeys.push('ANTHROPIC_API_KEY');
  if (!process.env.OPENAI_API_KEY) missingKeys.push('OPENAI_API_KEY');
  if (!process.env.GOOGLE_API_KEY) missingKeys.push('GOOGLE_API_KEY');
  
  if (missingKeys.length > 0) {
    console.error(`❌ 不足しているAPI Key: ${missingKeys.join(', ')}`);
    console.error('   .env.mcp に追加してください');
    process.exit(1);
  }
  
  try {
    // Step 1: Tech Architect (Claude)
    console.log('\n🔧 Step 1: Tech Architect (Claude Sonnet)...');
    const techPrompt = TECH_ARCHITECT_PROMPT.replace('{{TASK_DESCRIPTION}}', taskDescription);
    const techDraft = await callClaude(techPrompt);
    console.log('   ✅ 完了');
    
    // Step 2: Marketing Strategist (GPT-4o)
    console.log('\n📊 Step 2: Marketing Strategist (GPT-4o)...');
    const marketingPrompt = MARKETING_STRATEGIST_PROMPT.replace('{{TASK_DESCRIPTION}}', taskDescription);
    const marketingDraft = await callGPT4o(marketingPrompt);
    console.log('   ✅ 完了');
    
    // Step 3: UX/Ops Designer (Claude Sonnet - Gemini API問題のため代替)
    console.log('\n🎨 Step 3: UX/Ops Designer (Claude Sonnet)...');
    const uxPrompt = UX_OPS_DESIGNER_PROMPT.replace('{{TASK_DESCRIPTION}}', taskDescription);
    const uxDraft = await callClaude(uxPrompt, 'claude-sonnet-4-20250514');
    console.log('   ✅ 完了');
    
    // Step 4: Synthesis (Claude)
    console.log('\n🔄 Step 4: Synthesis (Claude Sonnet)...');
    const synthesisPrompt = SYNTHESIZER_PROMPT
      .replace('{{TECH_DRAFT}}', techDraft)
      .replace('{{MARKETING_DRAFT}}', marketingDraft)
      .replace('{{UX_DRAFT}}', uxDraft);
    const finalSSoT = await callClaude(synthesisPrompt);
    console.log('   ✅ 完了');
    
    // SSOTファイル保存
    const ssotDir = path.join(__dirname, '../../docs/03_ssot/02_guest_features/ai_chat');
    const ssotPath = path.join(ssotDir, 'SSOT_GUEST_AI_HANDOFF.md');
    fs.mkdirSync(ssotDir, { recursive: true });
    fs.writeFileSync(ssotPath, finalSSoT);
    console.log(`\n📄 SSOT保存: ${ssotPath}`);
    
    // ドラフトも保存
    const draftsDir = path.join(ssotDir, 'drafts');
    fs.mkdirSync(draftsDir, { recursive: true });
    fs.writeFileSync(path.join(draftsDir, 'HANDOFF_TECH_ARCHITECT.md'), techDraft);
    fs.writeFileSync(path.join(draftsDir, 'HANDOFF_MARKETING_STRATEGIST.md'), marketingDraft);
    fs.writeFileSync(path.join(draftsDir, 'HANDOFF_UX_OPS_DESIGNER.md'), uxDraft);
    console.log(`📁 ドラフト保存: ${draftsDir}`);
    
    // コスト計算
    const costData = calculateCost();
    console.log('\n💰 コスト計算:');
    console.log(`   総コスト: $${costData.totalCost} (¥${costData.totalCostJPY})`);
    console.log('   内訳:');
    for (const [model, data] of Object.entries(costData.breakdown)) {
      console.log(`     ${model}: $${data.totalCost} (in: ${data.inputTokens}, out: ${data.outputTokens})`);
    }
    
    // Plane更新
    console.log('\n📋 Planeにコストログを記録...');
    await updatePlaneWithCostLog(taskId, costData, ssotPath);
    
    // Evidenceディレクトリにもログ保存
    const evidenceDir = path.join(__dirname, `../../evidence/${taskId}`);
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(
      path.join(evidenceDir, 'ssot-generation-cost.json'),
      JSON.stringify({
        taskId,
        generatedAt: new Date().toISOString(),
        ssotPath,
        ...costData
      }, null, 2)
    );
    
    console.log('\n✅ マルチLLM SSOT生成完了！');
    
  } catch (error) {
    console.error(`\n❌ エラー: ${error.message}`);
    process.exit(1);
  }
}

main();
