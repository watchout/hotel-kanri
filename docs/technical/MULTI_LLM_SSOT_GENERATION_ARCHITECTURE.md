# マルチLLM SSOT自動生成アーキテクチャ

**バージョン**: 1.0.0  
**最終更新**: 2026-01-17  
**目的**: AI駆動開発SaaSへの移植用ドキュメント

---

## 1. システム概要

### 1.1 コンセプト

「**多角的視点によるSSOT（Single Source of Truth）自動生成**」

- 3つの専門ペルソナ（Tech / Marketing / UX）が独立してドラフトを作成
- 4番目のペルソナ（Synthesizer）が統合・矛盾解消
- 最終的に高品質なSSOTドキュメントを出力

### 1.2 価値提案

| 従来のSSOT作成 | マルチLLM SSOT |
|:---------------|:---------------|
| 1人の視点 | 3つの専門視点 |
| 手動作成（2-4時間） | 自動生成（3分） |
| 視点の偏り | バランスの取れた要件定義 |
| レビュー→修正の繰り返し | 一発で高品質 |

### 1.3 コスト実績

```
1回のSSO生成: $0.46 (¥69)
内訳:
  - Claude Opus: $0.42 (92%)
  - GPT-4o: $0.01 (2%)
  - Claude Sonnet: $0.03 (6%)
```

---

## 2. アーキテクチャ

### 2.1 処理フロー

```
┌─────────────────────────────────────────────────────────────┐
│                     タスク入力                               │
│  (Issue ID + 機能説明)                                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Step 1-3: 並列ドラフト生成                      │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Tech Architect │  Marketing      │  UX/Ops Designer       │
│  (Claude Opus)  │  (GPT-4o)       │  (Gemini 1.5 Pro)      │
│                 │                 │                         │
│  ・API設計      │  ・ROI分析      │  ・ユーザーフロー       │
│  ・DB設計       │  ・競合分析     │  ・エラーハンドリング   │
│  ・セキュリティ │  ・KPI設定      │  ・運用設計             │
└────────┬────────┴────────┬────────┴────────┬────────────────┘
         │                 │                  │
         └────────────────┼──────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                Step 4: 統合 (Synthesizer)                    │
│                    (Claude Opus)                             │
│                                                              │
│  ・3つのドラフトを統合                                       │
│  ・矛盾の解消                                                │
│  ・SSOT標準フォーマットへ変換                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      出力                                    │
│  ・SSOT_[機能名].md（最終版）                                │
│  ・drafts/（各ペルソナのドラフト）                           │
│  ・cost-log.json（コスト記録）                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 ディレクトリ構造

```
project/
├── scripts/
│   └── ssot-multi-llm/
│       └── generate-ssot.cjs      # メインスクリプト
├── docs/
│   └── ssot/
│       └── [category]/
│           ├── SSOT_[FEATURE].md  # 最終版SSOT
│           └── drafts/
│               ├── [FEATURE]_TECH_ARCHITECT.md
│               ├── [FEATURE]_MARKETING_STRATEGIST.md
│               └── [FEATURE]_UX_OPS_DESIGNER.md
├── evidence/
│   └── [TASK_ID]/
│       └── ssot-generation-cost.json
└── .env.mcp                        # API Keys
```

---

## 3. ペルソナ設計

### 3.1 ペルソナ一覧

| ペルソナ | 推奨モデル | 特徴 | 強み |
|:---------|:-----------|:-----|:-----|
| **Tech Architect** | Claude Opus | 長文理解・コード精度 | API/DB設計、セキュリティ |
| **Marketing Strategist** | GPT-4o | 創造性・マーケ知識 | ROI分析、競合分析 |
| **UX/Ops Designer** | Gemini 1.5 Pro | 長いコンテキスト・UX | ユーザーフロー、運用設計 |
| **Synthesizer** | Claude Opus | 統合・矛盾解消 | 最終SSOT作成 |

### 3.2 各ペルソナの出力仕様

#### Tech Architect（技術視点）

```markdown
### API設計
- エンドポイント一覧（HTTP Method, Path, 説明）
- リクエスト/レスポンス形式

### データベース設計
- 必要なテーブル/カラム
- ORMスキーマ例（Prisma等）

### システム間連携
- サービス間の役割分担
- 認証・認可要件

### セキュリティ要件
- 入力検証
- 認証・認可
- 監査ログ

### 実装チェックリスト
```

#### Marketing Strategist（ビジネス視点）

```markdown
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

### マーケティング視点での推奨機能
```

#### UX/Ops Designer（ユーザー/運用視点）

```markdown
### ゲスト側ユーザーフロー
1. ステップ1
2. ステップ2

### スタッフ側ユーザーフロー
1. ステップ1
2. ステップ2

### エラーハンドリング
| エラーケース | 対処方法 | ユーザーへの表示 |

### 運用設計
- 夜間対応
- 繁忙期対応
- 障害時対応

### UI/UX要件
```

---

## 4. プロンプト設計

### 4.1 共通プロンプト構造

```
[ペルソナ定義]
あなたは{専門分野}の{役割}です。以下の機能について、{視点}から{アクション}してください。

[入力情報]
## 対象機能
{{TASK_DESCRIPTION}}

[出力フォーマット]
## 出力フォーマット（Markdown）
{期待する構造}
```

### 4.2 Synthesizerプロンプト

```
あなたはSSOT統合エージェントです。以下の3つの視点からの要件定義を統合し、
最終的なSSOTドキュメントを作成してください。

## 技術アーキテクト視点
{{TECH_DRAFT}}

## マーケティング戦略視点
{{MARKETING_DRAFT}}

## UX/運用デザイン視点
{{UX_DRAFT}}

## 出力フォーマット（SSOT標準形式）
{SSOT構造テンプレート}
```

### 4.3 SSOT標準フォーマット

```markdown
# SSOT_[機能名].md

## 概要
- 目的
- 適用範囲
- 関連SSOT

## 要件ID体系
- XXX-001〜099: 機能要件
- XXX-100〜199: 非機能要件
- XXX-200〜299: UI/UX要件
- XXX-300〜399: ビジネス要件

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
```

---

## 5. コスト計算ロジック

### 5.1 料金表（USD / 1M tokens）

```javascript
const PRICING = {
  'claude-opus': { input: 15, output: 75 },
  'claude-sonnet': { input: 3, output: 15 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gemini-1.5-pro': { input: 1.25, output: 5 }
};
```

### 5.2 コスト計算式

```javascript
function calculateCost(tokenUsage) {
  let totalCost = 0;
  const breakdown = {};
  
  for (const [model, usage] of Object.entries(tokenUsage)) {
    const pricing = PRICING[model];
    if (!pricing) continue;
    
    const inputCost = (usage.input / 1_000_000) * pricing.input;
    const outputCost = (usage.output / 1_000_000) * pricing.output;
    const modelCost = inputCost + outputCost;
    
    breakdown[model] = {
      inputTokens: usage.input,
      outputTokens: usage.output,
      cost: modelCost.toFixed(4)
    };
    
    totalCost += modelCost;
  }
  
  return {
    breakdown,
    totalCost: totalCost.toFixed(4),
    totalCostJPY: Math.round(totalCost * 150)
  };
}
```

### 5.3 コスト最適化戦略

| 戦略 | 効果 | トレードオフ |
|:-----|:-----|:-------------|
| Tech/Synthesizer のみ Opus | コスト削減 50% | 品質やや低下 |
| 全て Sonnet | コスト削減 80% | 品質低下 |
| Gemini活用 | コスト削減 30% | API安定性 |
| キャッシュ（類似タスク再利用） | コスト削減 90% | 初期構築コスト |

---

## 6. 技術要件

### 6.1 必要なAPIキー

```bash
# .env.mcp
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=AIzaSyxxxxx
```

### 6.2 依存ライブラリ

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "openai": "^4.0.0",
    "@google/generative-ai": "^0.21.0",
    "dotenv": "^16.0.0"
  }
}
```

### 6.3 Node.js バージョン

```
Node.js >= 18.0.0 (ES modules対応)
```

---

## 7. SaaS化拡張ポイント

### 7.1 API化

```javascript
// Express/Fastify でラップ
app.post('/api/ssot/generate', async (req, res) => {
  const { taskDescription, config } = req.body;
  
  const result = await generateSSoT({
    description: taskDescription,
    personas: config.personas || ['tech', 'marketing', 'ux'],
    synthesizer: config.synthesizer || 'claude-opus'
  });
  
  return res.json({
    ssotPath: result.ssotPath,
    drafts: result.drafts,
    cost: result.cost
  });
});
```

### 7.2 カスタマイズポイント

| ポイント | カスタマイズ内容 |
|:---------|:-----------------|
| **ペルソナ** | 業界特化ペルソナの追加（医療、金融、製造） |
| **プロンプト** | 顧客ドメインに最適化 |
| **SSOT形式** | 顧客のドキュメント規約に合わせる |
| **出力先** | Notion/Confluence/GitHub連携 |
| **課金** | トークン課金 or 月額固定 |

### 7.3 マルチテナント対応

```javascript
// テナント別プロンプトテンプレート
const tenantConfig = {
  'tenant-001': {
    personas: {
      tech: { model: 'claude-opus', promptTemplate: '...' },
      marketing: { model: 'gpt-4o', promptTemplate: '...' },
      ux: { model: 'gemini-1.5-pro', promptTemplate: '...' }
    },
    ssotFormat: 'confluence',
    outputPath: 'tenant-001/ssot/'
  }
};
```

### 7.4 ストリーミング対応

```javascript
// リアルタイムで進捗表示
async function* generateSSoTStream(taskDescription) {
  yield { step: 1, status: 'starting', message: 'Tech Architect...' };
  const techDraft = await callClaude(techPrompt);
  yield { step: 1, status: 'done', draft: techDraft };
  
  yield { step: 2, status: 'starting', message: 'Marketing...' };
  const marketingDraft = await callGPT4o(marketingPrompt);
  yield { step: 2, status: 'done', draft: marketingDraft };
  
  // ...
}
```

---

## 8. 品質保証

### 8.1 生成後チェック

```javascript
// SSOT品質スコア計算
function calculateQualityScore(ssotContent) {
  const checks = [
    { name: '概要セクション', weight: 10, pass: /## 概要/.test(ssotContent) },
    { name: '要件ID', weight: 20, pass: /[A-Z]{3}-\d{3}/.test(ssotContent) },
    { name: 'Accept条件', weight: 20, pass: /Accept/.test(ssotContent) },
    { name: 'API仕様', weight: 15, pass: /## API仕様/.test(ssotContent) },
    { name: 'チェックリスト', weight: 15, pass: /- \[ \]/.test(ssotContent) },
    { name: '変更履歴', weight: 10, pass: /## 変更履歴/.test(ssotContent) }
  ];
  
  return checks.reduce((score, check) => 
    score + (check.pass ? check.weight : 0), 0);
}
```

### 8.2 人間レビューフロー

```
生成 → 品質スコア計算 → 閾値判定
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
           80点以上              80点未満
           自動承認             人間レビュー
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
                        承認               再生成
```

---

## 9. 監視・ログ

### 9.1 コストログスキーマ

```json
{
  "taskId": "DEV-0171",
  "generatedAt": "2026-01-17T08:49:07Z",
  "totalCost": "$0.4597",
  "totalCostJPY": 69,
  "breakdown": {
    "claude-opus": {
      "inputTokens": 5494,
      "outputTokens": 4532,
      "cost": "$0.4223"
    },
    "gpt-4o": {
      "inputTokens": 355,
      "outputTokens": 914,
      "cost": "$0.0100"
    }
  },
  "qualityScore": 98,
  "ssotPath": "/docs/ssot/SSOT_FEATURE.md"
}
```

### 9.2 ダッシュボード指標

| 指標 | 説明 | 目標 |
|:-----|:-----|:-----|
| 生成成功率 | エラーなく完了した割合 | > 95% |
| 平均コスト | 1SSOT あたりのコスト | < $0.50 |
| 平均品質スコア | 自動計算スコア | > 85点 |
| 再生成率 | 人間レビュー後の再生成割合 | < 10% |

---

## 10. 移植チェックリスト

### 10.1 最小構成（MVP）

- [ ] Node.js環境セットアップ
- [ ] API Key取得（Anthropic, OpenAI）
- [ ] 依存ライブラリインストール
- [ ] プロンプトテンプレート調整
- [ ] SSOT出力ディレクトリ設定
- [ ] CLI動作確認

### 10.2 SaaS構成

- [ ] API化（REST/GraphQL）
- [ ] 認証・認可
- [ ] マルチテナント対応
- [ ] ストリーミング対応
- [ ] 課金システム連携
- [ ] ダッシュボード
- [ ] 外部連携（Notion/Confluence/GitHub）

### 10.3 エンタープライズ構成

- [ ] SSO/SAML対応
- [ ] 監査ログ
- [ ] コンプライアンス（SOC2等）
- [ ] SLA保証
- [ ] オンプレミスデプロイオプション

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|:-----|:-----------|:---------|
| 2026-01-17 | 1.0.0 | 初版作成 |
