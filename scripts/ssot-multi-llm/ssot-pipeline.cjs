#!/usr/bin/env node
/**
 * SSOT生成パイプライン
 * 
 * フロー:
 * 1. SSOT作成（Claude）
 * 2. 監査1（Gemini）
 * 3. 監査2（GPT-4o）
 * 4. 修正（Claude）
 * 5. 完成＆スコア算出
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

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
    creator: 'claude-sonnet-4-20250514',      // SSOT作成
    auditor1: 'gemini-1.5-flash',             // 監査1（高速）
    auditor2: 'gpt-4o',                       // 監査2（精度）
    fixer: 'claude-sonnet-4-20250514'         // 修正
  },
  scoring: {
    technical: 50,      // 技術的正確性
    implementability: 50 // 実装可能性
  },
  outputDir: path.join(__dirname, '../../evidence/ssot-pipeline')
};

// ===== チェックリスト定義 =====
const CHECKLIST = {
  technical: [
    // DB設計（10点）
    { id: 'T01', name: 'テーブル名がsnake_case', weight: 2 },
    { id: 'T02', name: 'カラム名がsnake_case', weight: 2 },
    { id: 'T03', name: 'Prisma @map使用', weight: 2 },
    { id: 'T04', name: 'tenant_idインデックス', weight: 2 },
    { id: 'T05', name: 'リレーション定義正確', weight: 2 },
    // API設計（10点）
    { id: 'T06', name: 'パス形式 /api/v1/admin/', weight: 2 },
    { id: 'T07', name: '深いネストなし', weight: 2 },
    { id: 'T08', name: 'HTTP Method適切', weight: 2 },
    { id: 'T09', name: 'レスポンス形式統一', weight: 2 },
    { id: 'T10', name: 'エラーコード定義', weight: 2 },
    // 認証（10点）
    { id: 'T11', name: 'SessionUser形式正確', weight: 2 },
    { id: 'T12', name: 'tenant_id必須チェック', weight: 2 },
    { id: 'T13', name: '権限チェック記述', weight: 2 },
    { id: 'T14', name: '認証エラーハンドリング', weight: 2 },
    { id: 'T15', name: 'セキュリティ要件明記', weight: 2 },
    // 既存整合性（10点）
    { id: 'T16', name: '既存SSOTと用語統一', weight: 2 },
    { id: 'T17', name: '既存APIパターン踏襲', weight: 2 },
    { id: 'T18', name: 'システム間連携正確', weight: 2 },
    { id: 'T19', name: 'hotel-common経由', weight: 2 },
    { id: 'T20', name: '変数名統一', weight: 2 },
    // システム設計（10点）
    { id: 'T21', name: 'マルチテナント対応', weight: 2 },
    { id: 'T22', name: 'トランザクション考慮', weight: 2 },
    { id: 'T23', name: 'キャッシュ戦略', weight: 2 },
    { id: 'T24', name: 'ログ出力定義', weight: 2 },
    { id: 'T25', name: 'パフォーマンス要件', weight: 2 }
  ],
  implementability: [
    // 要件定義（15点）
    { id: 'I01', name: '要件ID体系（XXX-001）', weight: 3 },
    { id: 'I02', name: '全要件にID付与', weight: 3 },
    { id: 'I03', name: 'Accept条件明記', weight: 3 },
    { id: 'I04', name: 'Accept条件が検証可能', weight: 3 },
    { id: 'I05', name: '優先度明記', weight: 3 },
    // チェックリスト（10点）
    { id: 'I06', name: '実装チェックリストあり', weight: 2 },
    { id: 'I07', name: 'Phase分け明確', weight: 2 },
    { id: 'I08', name: '各Phase完了条件', weight: 2 },
    { id: 'I09', name: 'テストケース定義', weight: 2 },
    { id: 'I10', name: 'ロールバック手順', weight: 2 },
    // エラーハンドリング（10点）
    { id: 'I11', name: 'エラーケース列挙', weight: 2 },
    { id: 'I12', name: 'ユーザー表示メッセージ', weight: 2 },
    { id: 'I13', name: 'リトライ戦略', weight: 2 },
    { id: 'I14', name: '障害時対応', weight: 2 },
    { id: 'I15', name: 'バリデーション定義', weight: 2 },
    // 多視点（10点）
    { id: 'I16', name: '技術視点あり', weight: 2 },
    { id: 'I17', name: 'ビジネス視点あり', weight: 2 },
    { id: 'I18', name: 'UX視点あり', weight: 2 },
    { id: 'I19', name: '運用視点あり', weight: 2 },
    { id: 'I20', name: 'KPI/ROI定義', weight: 2 },
    // ドキュメント品質（5点）
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
    description: `
管理画面の権限システム（RBAC）

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
- 循環参照禁止
`
  },
  aiFaq: {
    id: 'aiFaq',
    name: 'AI FAQ自動応答',
    description: `
ゲスト向けAI FAQ自動応答システム

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
- コスト制限（$0.01/応答）
`
  },
  orderManagement: {
    id: 'orderManagement',
    name: '注文管理',
    description: `
ルームサービス注文管理システム

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
- 多言語注文対応
`
  }
};

// ===== LLMクライアント =====
class LLMClient {
  constructor() {
    this.costs = { claude: 0, gpt: 0, gemini: 0 };
  }

  async callClaude(prompt, model = 'claude-sonnet-4-20250514') {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic();
    
    const response = await client.messages.create({
      model,
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    });
    
    // コスト計算
    const pricing = model.includes('opus') 
      ? { input: 15, output: 75 } 
      : { input: 3, output: 15 };
    this.costs.claude += (response.usage.input_tokens / 1_000_000) * pricing.input;
    this.costs.claude += (response.usage.output_tokens / 1_000_000) * pricing.output;
    
    return response.content[0].text;
  }

  async callGPT(prompt, model = 'gpt-4o') {
    const OpenAI = require('openai');
    const client = new OpenAI();
    
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 8192
    });
    
    // コスト計算
    this.costs.gpt += (response.usage.prompt_tokens / 1_000_000) * 2.5;
    this.costs.gpt += (response.usage.completion_tokens / 1_000_000) * 10;
    
    return response.choices[0].message.content;
  }

  async callGemini(prompt) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const result = await model.generateContent(prompt);
    
    // コスト推定
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(result.response.text().length / 4);
    this.costs.gemini += (inputTokens / 1_000_000) * 0.075;
    this.costs.gemini += (outputTokens / 1_000_000) * 0.30;
    
    return result.response.text();
  }

  getTotalCost() {
    const total = this.costs.claude + this.costs.gpt + this.costs.gemini;
    return {
      breakdown: this.costs,
      total: `$${total.toFixed(4)}`,
      totalJPY: Math.round(total * 150)
    };
  }
}

// ===== プロンプト =====
const PROMPTS = {
  create: (task) => `
あなたはSSOT（Single Source of Truth）作成エキスパートです。
以下の機能について、高品質なSSOT文書を作成してください。

## 対象機能
${task.description}

## 出力フォーマット（厳守）

\`\`\`markdown
# SSOT_${task.id.toUpperCase()}.md

**作成日**: ${new Date().toISOString().split('T')[0]}
**バージョン**: 1.0.0
**ステータス**: ドラフト

---

## 📋 概要

### 目的
（1-2文で記述）

### 適用範囲
- 対象システム: hotel-saas, hotel-common
- 対象ユーザー: 

### 関連SSOT
- SSOT_XXX.md

---

## 🎯 要件定義

### 機能要件（FR）

#### FR-001: （機能名）
- **説明**: 
- **Accept**: 
  - [ ] 条件1
  - [ ] 条件2

（FR-002以降続く）

### 非機能要件（NFR）

#### NFR-001: パフォーマンス
- **説明**:
- **Accept**:

---

## 🗄️ データベース設計

### テーブル定義

\\\`\\\`\\\`prisma
model ExampleTable {
  id        String   @id @default(uuid()) @map("id")
  tenantId  String   @map("tenant_id")
  createdAt DateTime @default(now()) @map("created_at")
  
  @@map("example_table")
  @@index([tenantId])
}
\\\`\\\`\\\`

---

## 🌐 API設計

### エンドポイント一覧

| Method | Path | 説明 |
|:-------|:-----|:-----|
| GET | /api/v1/admin/xxx | 一覧取得 |

### リクエスト/レスポンス

#### GET /api/v1/admin/xxx

Request:
\\\`\\\`\\\`typescript
// Query parameters
interface GetXxxRequest {
  page?: number;
  limit?: number;
}
\\\`\\\`\\\`

Response:
\\\`\\\`\\\`typescript
interface GetXxxResponse {
  success: boolean;
  data: Xxx[];
  pagination: { ... };
}
\\\`\\\`\\\`

---

## 🎨 UI/UX要件

### 画面一覧
1. 一覧画面
2. 詳細画面
3. 編集画面

### ユーザーフロー
1. ユーザーが〜
2. システムが〜

---

## 🚨 エラーハンドリング

| エラーケース | HTTPステータス | メッセージ | 対処 |
|:-------------|:---------------|:-----------|:-----|
| 認証エラー | 401 | ログインが必要です | ログイン画面へ |

---

## 📊 ビジネス指標

### ROI
- 削減時間: X時間/月
- コスト削減: X円/月

### KPI
| KPI | 目標 | 測定方法 |
|:----|:-----|:---------|

---

## ✅ 実装チェックリスト

### Phase 1: データベース
- [ ] テーブル作成
- [ ] マイグレーション

### Phase 2: API
- [ ] エンドポイント実装
- [ ] 認証・認可

### Phase 3: UI
- [ ] 一覧画面
- [ ] 詳細画面

### Phase 4: テスト
- [ ] 単体テスト
- [ ] 統合テスト

### Phase 5: 検証
- [ ] SSOT準拠確認
- [ ] Accept条件確認

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 |
|:-----|:-----------|:---------|
| ${new Date().toISOString().split('T')[0]} | 1.0.0 | 初版作成 |
\`\`\`

必ず上記フォーマットに従い、全セクションを埋めてください。
`,

  audit: (ssot, checklistJson) => `
あなたはSSOT品質監査エキスパートです。
以下のSSOTを監査し、チェックリスト評価と指摘事項を出力してください。

## 対象SSOT
${ssot}

## チェックリスト（JSON形式で回答）
${checklistJson}

## 出力フォーマット（JSON厳守）

\`\`\`json
{
  "checklist": {
    "T01": { "pass": true, "comment": "" },
    "T02": { "pass": false, "comment": "カラム名にcamelCase使用あり" },
    ...全50項目
  },
  "issues": [
    {
      "severity": "critical",
      "id": "T02",
      "title": "カラム名命名規則違反",
      "description": "createdAtはcreated_atにすべき",
      "recommendation": "@map(\"created_at\")を追加"
    },
    ...
  ],
  "score": {
    "technical": 42,
    "implementability": 45,
    "total": 87
  }
}
\`\`\`

必ずJSON形式で出力してください。
`,

  fix: (ssot, auditResults) => `
あなたはSSOT修正エキスパートです。
監査結果に基づき、SSOTを修正してください。

## 元のSSO
${ssot}

## 監査結果（2つの監査をマージ）
${auditResults}

## 指示
1. severity: critical の指摘は必ず修正
2. severity: warning の指摘は可能な限り修正
3. 修正箇所にコメント追加不要（クリーンな出力）
4. 元のフォーマットを維持

修正後のSSO全文を出力してください。
`
};

// ===== パイプライン実行 =====
class SSOTPipeline {
  constructor() {
    this.llm = new LLMClient();
    this.results = {};
  }

  async run(taskId) {
    const task = TASKS[taskId];
    if (!task) throw new Error(`Unknown task: ${taskId}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 SSOT Pipeline: ${task.name}`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    const result = {
      task: task.name,
      steps: {},
      finalScore: null,
      cost: null
    };

    // Step 1: SSOT作成（Claude）
    console.log('\n📝 Step 1: SSOT作成（Claude）...');
    const ssotDraft = await this.llm.callClaude(
      PROMPTS.create(task),
      CONFIG.models.creator
    );
    result.steps.create = { output: ssotDraft, model: CONFIG.models.creator };
    console.log('   ✅ 作成完了');

    // Step 2: 監査1（Gemini）
    console.log('\n🔍 Step 2: 監査1（Gemini）...');
    const checklistJson = JSON.stringify([...CHECKLIST.technical, ...CHECKLIST.implementability], null, 2);
    let audit1Result;
    try {
      const audit1Raw = await this.llm.callGemini(PROMPTS.audit(ssotDraft, checklistJson));
      audit1Result = this.parseAuditResult(audit1Raw);
      result.steps.audit1 = { output: audit1Result, model: CONFIG.models.auditor1 };
      console.log(`   ✅ 監査完了 (スコア: ${audit1Result.score?.total || 'N/A'})`);
    } catch (error) {
      console.log(`   ⚠️ Gemini監査失敗: ${error.message}`);
      audit1Result = { checklist: {}, issues: [], score: { total: 0 } };
      result.steps.audit1 = { error: error.message, model: CONFIG.models.auditor1 };
    }

    // Step 3: 監査2（GPT-4o）
    console.log('\n🔍 Step 3: 監査2（GPT-4o）...');
    let audit2Result;
    try {
      const audit2Raw = await this.llm.callGPT(PROMPTS.audit(ssotDraft, checklistJson));
      audit2Result = this.parseAuditResult(audit2Raw);
      result.steps.audit2 = { output: audit2Result, model: CONFIG.models.auditor2 };
      console.log(`   ✅ 監査完了 (スコア: ${audit2Result.score?.total || 'N/A'})`);
    } catch (error) {
      console.log(`   ⚠️ GPT監査失敗: ${error.message}`);
      audit2Result = { checklist: {}, issues: [], score: { total: 0 } };
      result.steps.audit2 = { error: error.message, model: CONFIG.models.auditor2 };
    }

    // 監査結果マージ
    const mergedIssues = this.mergeAuditResults(audit1Result, audit2Result);
    console.log(`\n📋 指摘事項: ${mergedIssues.critical}件(Critical), ${mergedIssues.warning}件(Warning)`);

    // Step 4: 修正（Claude）
    console.log('\n🔧 Step 4: SSOT修正（Claude）...');
    const auditSummary = JSON.stringify({
      audit1: audit1Result.issues || [],
      audit2: audit2Result.issues || []
    }, null, 2);
    const ssotFinal = await this.llm.callClaude(
      PROMPTS.fix(ssotDraft, auditSummary),
      CONFIG.models.fixer
    );
    result.steps.fix = { output: ssotFinal, model: CONFIG.models.fixer };
    console.log('   ✅ 修正完了');

    // Step 5: 最終スコア算出
    console.log('\n📊 Step 5: 最終スコア算出...');
    const finalScore = this.calculateFinalScore(ssotFinal);
    result.finalScore = finalScore;
    console.log(`   ✅ 最終スコア: ${finalScore.total}/100`);

    // コスト
    result.cost = this.llm.getTotalCost();
    result.duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`\n⏱️ 所要時間: ${result.duration}秒`);
    console.log(`💰 コスト: ${result.cost.total}`);

    return result;
  }

  parseAuditResult(raw) {
    try {
      // JSON部分を抽出
      const jsonMatch = raw.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      // JSONブロックなしの場合
      return JSON.parse(raw);
    } catch (error) {
      console.log('   ⚠️ JSONパース失敗、デフォルト値使用');
      return { checklist: {}, issues: [], score: { technical: 0, implementability: 0, total: 0 } };
    }
  }

  mergeAuditResults(audit1, audit2) {
    const allIssues = [...(audit1.issues || []), ...(audit2.issues || [])];
    return {
      critical: allIssues.filter(i => i.severity === 'critical').length,
      warning: allIssues.filter(i => i.severity === 'warning').length,
      info: allIssues.filter(i => i.severity === 'info').length
    };
  }

  calculateFinalScore(ssot) {
    let technical = 0;
    let implementability = 0;

    // 技術的正確性チェック
    CHECKLIST.technical.forEach(item => {
      if (this.checkItem(ssot, item.id)) {
        technical += item.weight;
      }
    });

    // 実装可能性チェック
    CHECKLIST.implementability.forEach(item => {
      if (this.checkItem(ssot, item.id)) {
        implementability += item.weight;
      }
    });

    return {
      technical,
      implementability,
      total: technical + implementability
    };
  }

  checkItem(ssot, itemId) {
    const checks = {
      // 技術的正確性
      T01: /@@map\("[a-z_]+"\)/.test(ssot),
      T02: /@map\("[a-z_]+"\)/.test(ssot),
      T03: /@map/.test(ssot),
      T04: /@@index\(\[tenantId\]\)/.test(ssot),
      T05: /model\s+\w+\s*\{/.test(ssot),
      T06: /\/api\/v1\/admin\//.test(ssot),
      T07: !/\/\[.*\]\/.*\/\[.*\]/.test(ssot),
      T08: /\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|/.test(ssot),
      T09: /interface.*Response/.test(ssot),
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
      // 実装可能性
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
    return checks[itemId] || false;
  }

  async saveResult(result, taskId) {
    const outputDir = CONFIG.outputDir;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${taskId}-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`\n💾 結果保存: ${filepath}`);

    // SSOT本体も保存
    if (result.steps.fix?.output) {
      const ssotFilename = `SSOT_${taskId.toUpperCase()}_DRAFT.md`;
      const ssotPath = path.join(outputDir, ssotFilename);
      fs.writeFileSync(ssotPath, result.steps.fix.output);
      console.log(`💾 SSOT保存: ${ssotPath}`);
    }

    return filepath;
  }
}

// ===== ベースライン比較（単一LLMのみ） =====
class BaselinePipeline {
  constructor() {
    this.llm = new LLMClient();
  }

  async run(taskId) {
    const task = TASKS[taskId];
    if (!task) throw new Error(`Unknown task: ${taskId}`);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Baseline（単一LLM）: ${task.name}`);
    console.log('='.repeat(60));

    const startTime = Date.now();

    // 単一LLM（Claude）のみでSSO作成
    console.log('\n📝 SSOT作成（Claude単体）...');
    const ssot = await this.llm.callClaude(
      PROMPTS.create(task),
      CONFIG.models.creator
    );

    // スコア算出
    const pipeline = new SSOTPipeline();
    const score = pipeline.calculateFinalScore(ssot);

    const result = {
      task: task.name,
      method: 'baseline',
      ssot,
      score,
      cost: this.llm.getTotalCost(),
      duration: Math.round((Date.now() - startTime) / 1000)
    };

    console.log(`\n✅ 完了`);
    console.log(`   スコア: ${score.total}/100`);
    console.log(`   コスト: ${result.cost.total}`);
    console.log(`   時間: ${result.duration}秒`);

    return result;
  }
}

// ===== メイン =====
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'full';
  const taskId = args[1] || 'permission';

  console.log('████████████████████████████████████████████████████████████');
  console.log('🔬 SSOT生成パイプライン検証');
  console.log('████████████████████████████████████████████████████████████');
  console.log(`\nモード: ${mode}`);
  console.log(`タスク: ${taskId}`);

  if (mode === 'baseline') {
    // ベースライン（単一LLM）
    const baseline = new BaselinePipeline();
    const result = await baseline.run(taskId);
    console.log('\n📊 結果:', JSON.stringify(result.score, null, 2));
  } else if (mode === 'pipeline') {
    // 提案パイプライン
    const pipeline = new SSOTPipeline();
    const result = await pipeline.run(taskId);
    await pipeline.saveResult(result, taskId);
    console.log('\n📊 結果:', JSON.stringify(result.finalScore, null, 2));
  } else if (mode === 'full') {
    // 全タスク比較
    const allResults = { baseline: {}, pipeline: {} };
    const taskIds = Object.keys(TASKS);

    for (const tid of taskIds) {
      console.log(`\n${'#'.repeat(60)}`);
      console.log(`# タスク: ${TASKS[tid].name}`);
      console.log('#'.repeat(60));

      // ベースライン
      const baseline = new BaselinePipeline();
      allResults.baseline[tid] = await baseline.run(tid);

      // パイプライン
      const pipeline = new SSOTPipeline();
      allResults.pipeline[tid] = await pipeline.run(tid);
      await pipeline.saveResult(allResults.pipeline[tid], tid);
    }

    // サマリー
    console.log('\n');
    console.log('████████████████████████████████████████████████████████████');
    console.log('📊 検証サマリー');
    console.log('████████████████████████████████████████████████████████████');

    console.log('\n| タスク | ベースライン | パイプライン | 差分 |');
    console.log('|:-------|:-------------|:-------------|:-----|');
    
    let totalBaseline = 0;
    let totalPipeline = 0;
    
    for (const tid of taskIds) {
      const b = allResults.baseline[tid].score.total;
      const p = allResults.pipeline[tid].finalScore.total;
      const diff = p - b;
      const diffStr = diff >= 0 ? `+${diff}` : `${diff}`;
      console.log(`| ${TASKS[tid].name} | ${b}点 | ${p}点 | ${diffStr} |`);
      totalBaseline += b;
      totalPipeline += p;
    }

    const avgBaseline = Math.round(totalBaseline / taskIds.length);
    const avgPipeline = Math.round(totalPipeline / taskIds.length);
    const avgDiff = avgPipeline - avgBaseline;
    console.log(`| **平均** | **${avgBaseline}点** | **${avgPipeline}点** | **${avgDiff >= 0 ? '+' : ''}${avgDiff}** |`);

    // コスト比較
    let baselineCost = 0;
    let pipelineCost = 0;
    for (const tid of taskIds) {
      baselineCost += parseFloat(allResults.baseline[tid].cost.total.replace('$', ''));
      pipelineCost += parseFloat(allResults.pipeline[tid].cost.total.replace('$', ''));
    }

    console.log('\n💰 コスト比較:');
    console.log(`   ベースライン: $${baselineCost.toFixed(4)}`);
    console.log(`   パイプライン: $${pipelineCost.toFixed(4)}`);
    console.log(`   差分: $${(pipelineCost - baselineCost).toFixed(4)}`);

    // 結論
    console.log('\n🎯 結論:');
    if (avgDiff >= 5) {
      console.log(`   ✅ パイプライン方式が有効（+${avgDiff}点向上）`);
    } else if (avgDiff >= 0) {
      console.log(`   🟡 効果は限定的（+${avgDiff}点）`);
    } else {
      console.log(`   ❌ ベースラインの方が良い（${avgDiff}点低下）`);
    }
  }
}

main().catch(console.error);
