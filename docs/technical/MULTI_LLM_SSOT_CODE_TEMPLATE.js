/**
 * マルチLLM SSOT生成 - 移植用コードテンプレート
 * 
 * このファイルは他のプロジェクトへの移植用テンプレートです。
 * AI駆動開発SaaSへの組み込みを想定しています。
 * 
 * @version 1.0.0
 * @license MIT
 */

// ===== 1. 設定 =====

const CONFIG = {
  // モデル設定
  models: {
    techArchitect: 'claude-opus-4-20250514',
    marketingStrategist: 'gpt-4o',
    uxOpsDesigner: 'gemini-1.5-pro-latest', // またはclaude-sonnet-4-20250514
    synthesizer: 'claude-opus-4-20250514'
  },
  
  // コスト計算（USD / 1M tokens）
  pricing: {
    'claude-opus': { input: 15, output: 75 },
    'claude-sonnet': { input: 3, output: 15 },
    'gpt-4o': { input: 2.5, output: 10 },
    'gemini-1.5-pro': { input: 1.25, output: 5 }
  },
  
  // 出力設定
  output: {
    ssotDir: './docs/ssot',
    draftsDir: './docs/ssot/drafts',
    evidenceDir: './evidence'
  }
};


// ===== 2. プロンプトテンプレート =====

const PROMPTS = {
  // Tech Architect（技術視点）
  techArchitect: `
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
- サービス間の役割分担
- 認証・認可要件

### セキュリティ要件
- 入力検証
- 認証・認可
- 監査ログ

### 実装チェックリスト
- [ ] 項目1
- [ ] 項目2
`,

  // Marketing Strategist（ビジネス視点）
  marketingStrategist: `
あなたはマーケティング戦略家です。以下の機能について、ビジネス価値の観点から評価・提案してください。

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
`,

  // UX/Ops Designer（ユーザー/運用視点）
  uxOpsDesigner: `
あなたはUX/運用デザイナーです。以下の機能について、ユーザー体験と運用の観点から設計してください。

## 対象機能
{{TASK_DESCRIPTION}}

## 出力フォーマット（Markdown）

### ユーザーフロー
1. ステップ1
2. ステップ2
（Mermaid図も可）

### エラーハンドリング
| エラーケース | 対処方法 | ユーザーへの表示 |
|--------------|----------|------------------|

### 運用設計
- 通常運用
- 障害時対応
- スケーリング

### UI/UX要件
- 必須画面一覧
- 多言語対応
- アクセシビリティ
`,

  // Synthesizer（統合）
  synthesizer: `
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
`
};


// ===== 3. LLM呼び出し関数 =====

class LLMClient {
  constructor() {
    this.tokenUsage = {
      'claude-opus': { input: 0, output: 0 },
      'claude-sonnet': { input: 0, output: 0 },
      'gpt-4o': { input: 0, output: 0 },
      'gemini-1.5-pro': { input: 0, output: 0 }
    };
  }

  async callClaude(prompt, model = 'claude-opus-4-20250514') {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic();
    
    const response = await client.messages.create({
      model: model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const modelKey = model.includes('opus') ? 'claude-opus' : 'claude-sonnet';
    this.tokenUsage[modelKey].input += response.usage.input_tokens;
    this.tokenUsage[modelKey].output += response.usage.output_tokens;
    
    return response.content[0].text;
  }

  async callGPT4o(prompt) {
    const OpenAI = require('openai');
    const client = new OpenAI();
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096
    });
    
    this.tokenUsage['gpt-4o'].input += response.usage.prompt_tokens;
    this.tokenUsage['gpt-4o'].output += response.usage.completion_tokens;
    
    return response.choices[0].message.content;
  }

  async callGemini(prompt) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    
    // トークン推定（Geminiは直接返さない）
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(response.text().length / 4);
    this.tokenUsage['gemini-1.5-pro'].input += inputTokens;
    this.tokenUsage['gemini-1.5-pro'].output += outputTokens;
    
    return response.text();
  }

  calculateCost() {
    let totalCost = 0;
    const breakdown = {};
    
    for (const [model, usage] of Object.entries(this.tokenUsage)) {
      const pricing = CONFIG.pricing[model];
      if (!pricing) continue;
      
      const inputCost = (usage.input / 1_000_000) * pricing.input;
      const outputCost = (usage.output / 1_000_000) * pricing.output;
      const modelCost = inputCost + outputCost;
      
      if (usage.input > 0 || usage.output > 0) {
        breakdown[model] = {
          inputTokens: usage.input,
          outputTokens: usage.output,
          cost: `$${modelCost.toFixed(4)}`
        };
      }
      
      totalCost += modelCost;
    }
    
    return {
      breakdown,
      totalCost: `$${totalCost.toFixed(4)}`,
      totalCostJPY: Math.round(totalCost * 150)
    };
  }
}


// ===== 4. SSOT生成クラス =====

class SSOTGenerator {
  constructor(options = {}) {
    this.llm = new LLMClient();
    this.options = {
      ...CONFIG,
      ...options
    };
  }

  async generate(taskDescription) {
    const results = {
      drafts: {},
      finalSSoT: null,
      cost: null
    };

    // Step 1: Tech Architect
    console.log('🔧 Step 1: Tech Architect...');
    const techPrompt = PROMPTS.techArchitect.replace('{{TASK_DESCRIPTION}}', taskDescription);
    results.drafts.tech = await this.llm.callClaude(techPrompt, this.options.models.techArchitect);

    // Step 2: Marketing Strategist
    console.log('📊 Step 2: Marketing Strategist...');
    const marketingPrompt = PROMPTS.marketingStrategist.replace('{{TASK_DESCRIPTION}}', taskDescription);
    results.drafts.marketing = await this.llm.callGPT4o(marketingPrompt);

    // Step 3: UX/Ops Designer
    console.log('🎨 Step 3: UX/Ops Designer...');
    const uxPrompt = PROMPTS.uxOpsDesigner.replace('{{TASK_DESCRIPTION}}', taskDescription);
    // Gemini が使えない場合は Claude Sonnet で代替
    try {
      results.drafts.ux = await this.llm.callGemini(uxPrompt);
    } catch (error) {
      console.log('   ⚠️ Gemini unavailable, using Claude Sonnet...');
      results.drafts.ux = await this.llm.callClaude(uxPrompt, 'claude-sonnet-4-20250514');
    }

    // Step 4: Synthesis
    console.log('🔄 Step 4: Synthesis...');
    const synthesisPrompt = PROMPTS.synthesizer
      .replace('{{TECH_DRAFT}}', results.drafts.tech)
      .replace('{{MARKETING_DRAFT}}', results.drafts.marketing)
      .replace('{{UX_DRAFT}}', results.drafts.ux);
    results.finalSSoT = await this.llm.callClaude(synthesisPrompt, this.options.models.synthesizer);

    // コスト計算
    results.cost = this.llm.calculateCost();

    return results;
  }

  // 品質スコア計算
  calculateQualityScore(ssotContent) {
    const checks = [
      { name: '概要セクション', weight: 10, pass: /## 概要/.test(ssotContent) },
      { name: '要件ID', weight: 20, pass: /[A-Z]{3}-\d{3}/.test(ssotContent) },
      { name: 'Accept条件', weight: 20, pass: /Accept/.test(ssotContent) },
      { name: 'API仕様', weight: 15, pass: /## API仕様/.test(ssotContent) },
      { name: 'チェックリスト', weight: 15, pass: /- \[ \]/.test(ssotContent) },
      { name: '変更履歴', weight: 10, pass: /## 変更履歴/.test(ssotContent) },
      { name: 'DB設計', weight: 10, pass: /## データベース/.test(ssotContent) }
    ];
    
    return checks.reduce((score, check) => score + (check.pass ? check.weight : 0), 0);
  }
}


// ===== 5. 使用例 =====

/*
// CLI使用
const generator = new SSOTGenerator();
const result = await generator.generate(`
  有人ハンドオフ機能
  
  AIチャットで解決できない問い合わせを、スタッフに引き継ぐ機能。
  
  MVP制約:
  - 通知チャネル: 1つ固定（フロントデスク通知）
  - タイムアウト: 60秒で電話CTAを表示
`);

console.log('SSOT:', result.finalSSoT);
console.log('Cost:', result.cost);
console.log('Quality:', generator.calculateQualityScore(result.finalSSoT));


// Express API使用
app.post('/api/ssot/generate', async (req, res) => {
  const { taskDescription, options } = req.body;
  const generator = new SSOTGenerator(options);
  
  try {
    const result = await generator.generate(taskDescription);
    res.json({
      success: true,
      ssot: result.finalSSoT,
      drafts: result.drafts,
      cost: result.cost,
      qualityScore: generator.calculateQualityScore(result.finalSSoT)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
*/


// ===== 6. エクスポート =====

module.exports = {
  CONFIG,
  PROMPTS,
  LLMClient,
  SSOTGenerator
};
