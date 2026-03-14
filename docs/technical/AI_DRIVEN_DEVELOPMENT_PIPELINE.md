# AI駆動開発パイプライン（完全自動化構想）

**バージョン**: 0.1.0（設計段階）  
**最終更新**: 2026-01-17  
**目的**: SSOT作成から本番デプロイまでの完全自動化

---

## 1. 全体フロー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI駆動開発パイプライン                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ 1. SSOT生成  │───▶│ 2. プロンプト │───▶│ 3. プロンプト│                   │
│  │  (Multi-LLM) │    │    生成      │    │    監査      │                   │
│  │    ✅完成    │    │              │    │  (3 LLM)     │                   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                   │
│                                                  │                           │
│                              ┌───────────────────┘                           │
│                              ▼                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ 6. 実装      │◀───│ 5. プロンプト│◀───│ 4. プロンプト│                   │
│  │(Claude Code) │    │    完成      │    │    修正      │                   │
│  │              │    │              │    │              │◀──┐              │
│  └──────┬───────┘    └──────────────┘    └──────────────┘   │              │
│         │                                        ▲          │              │
│         ▼                                        │          │              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────┴───────┐   │              │
│  │ 7. 実装監査  │───▶│ 8. 自動修正  │───▶│ 9. 再監査    │───┘              │
│  │  (3 LLM)     │    │(Claude Code) │    │    (PASS?)   │                   │
│  └──────────────┘    └──────────────┘    └──────┬───────┘                   │
│                                                  │ PASS                      │
│                                                  ▼                           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │12. Plane更新 │◀───│11. マージ    │◀───│10. テスト    │                   │
│  │   (Done)     │    │   (自動)     │    │  (自動/手動) │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 各ステージの詳細

### Stage 1: SSOT生成（✅ 完成）

**実装状況**: `scripts/ssot-multi-llm/generate-ssot.cjs`

```javascript
// 入力
const input = {
  taskId: 'DEV-0171',
  taskDescription: '有人ハンドオフ機能...'
};

// 出力
const output = {
  ssotPath: 'docs/ssot/SSOT_FEATURE.md',
  drafts: { tech, marketing, ux },
  cost: { total: '$0.46', breakdown: {...} }
};
```

---

### Stage 2: SSOTからプロンプト生成（🔧 次に実装）

**目的**: SSOTを読み込み、実装AIへの指示書（プロンプト）を自動生成

```javascript
// 入力
const ssotContent = fs.readFileSync('SSOT_FEATURE.md');

// 処理
// 1. SSOT解析（要件ID抽出、Accept条件抽出）
// 2. 実装順序の決定（依存関係分析）
// 3. プロンプトテンプレート適用
// 4. Item/Step構造で分割

// 出力
const prompt = `
## Item 1: データベース実装
### Step 1: Prismaスキーマ更新
...

## Item 2: API実装
### Step 1: ルート作成
...
`;
```

**プロンプト生成ルール**:
- Item/Step構造（Phase禁止）
- 具体的なファイルパス・コマンド
- 検証可能な成果物指定
- エラー時の対処フロー
- Evidence取得手順

---

### Stage 3: プロンプト監査（3 LLM）

**目的**: 生成されたプロンプトの品質を3つのLLMで検証

```javascript
const auditors = [
  { name: 'Tech Auditor', model: 'claude-opus', focus: 'SSOT準拠・技術的正確性' },
  { name: 'UX Auditor', model: 'gpt-4o', focus: 'ユーザー視点・操作フロー' },
  { name: 'Ops Auditor', model: 'gemini-1.5-pro', focus: '運用・障害時対応' }
];

// 各監査員の評価
const auditResults = await Promise.all(
  auditors.map(a => auditPrompt(prompt, a))
);

// 統合スコア
const score = calculateAuditScore(auditResults);
// PASS: 80点以上 → Stage 5へ
// FAIL: 80点未満 → Stage 4へ
```

**監査チェックリスト**:
- [ ] SSOT要件IDが全て含まれているか
- [ ] Accept条件が明確か
- [ ] ファイルパスが実在するか
- [ ] コマンドが実行可能か
- [ ] エラー処理が網羅されているか
- [ ] 曖昧な表現がないか

---

### Stage 4: プロンプト修正

**目的**: 監査で指摘された問題点を自動修正

```javascript
// 入力
const input = {
  originalPrompt,
  auditResults: [
    { auditor: 'Tech', issues: ['Item 2のAPI pathがSSoT不一致'] },
    { auditor: 'UX', issues: ['エラーメッセージが不親切'] }
  ]
};

// 修正LLM（Claude Sonnet）
const fixedPrompt = await fixPrompt(input);

// → Stage 3へ戻って再監査
```

**最大修正回数**: 3回（超過時は人間レビュー）

---

### Stage 5: プロンプト完成

**条件**: 監査スコア80点以上

```javascript
// 最終プロンプトを保存
fs.writeFileSync(
  `prompts/${taskId}/implementation-prompt.md`,
  finalPrompt
);

// メタデータ
const metadata = {
  taskId,
  ssotRef: 'SSOT_FEATURE.md',
  auditScore: 92,
  auditIterations: 2,
  generatedAt: new Date().toISOString()
};
```

---

### Stage 6: 実装（Claude Code + Codex 役割分担）

**目的**: 完成したプロンプトを実装AIに渡して自動実装

#### 🎯 役割分担の根拠

| 観点 | Claude Code | Codex (OpenAI) |
|:-----|:------------|:---------------|
| **強み** | コード理解・複数ファイル横断・SSOT準拠 | 画像→コード変換・創造的UI提案 |
| **得意領域** | バックエンド・API・ロジック・テスト | UIコンポーネント・スタイリング・レスポンシブ |
| **弱点** | UIが「古い」「Bootstrap風」になりがち | ロジックの一貫性・長コンテキスト保持 |

#### 🔧 自動タスク振り分けロジック

```javascript
function assignImplementationAI(task) {
  const taskType = analyzeTaskType(task);
  
  // 振り分けルール
  const assignment = {
    // Claude Code 担当
    'api': 'claude-code',           // API実装
    'database': 'claude-code',      // DB/Prisma
    'auth': 'claude-code',          // 認証・セキュリティ
    'logic': 'claude-code',         // ビジネスロジック
    'test': 'claude-code',          // テスト生成
    'refactor': 'claude-code',      // リファクタリング
    
    // Codex 担当
    'ui-component': 'codex',        // UIコンポーネント
    'styling': 'codex',             // CSS/スタイリング
    'responsive': 'codex',          // レスポンシブ対応
    'animation': 'codex',           // アニメーション
    'design-system': 'codex',       // デザインシステム適用
    
    // 複合タスク → 分割実行
    'fullstack': 'split'            // バックエンド(Claude) + フロント(Codex)
  };
  
  return assignment[taskType] || 'claude-code';
}
```

#### 📋 実行フロー

```
┌──────────────────────────────────────────────────────────────┐
│                  タスク分析・振り分け                         │
└──────────────────────────┬───────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ API/Logic    │ │ UI/UX        │ │ Full Stack   │
    │ (Claude Code)│ │ (Codex)      │ │ (Split)      │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │               │               │
           │               │        ┌──────┴──────┐
           │               │        ▼             ▼
           │               │   Claude Code    Codex
           │               │   (Backend)      (Frontend)
           │               │        │             │
           └───────────────┴────────┴─────────────┘
                           │
                           ▼
                    実装結果統合
```

#### 💻 実行コマンド

**Claude Code（ヘッドレスモード）**:
```bash
# 基本形：プロンプトを直接渡す
claude -p "$(cat prompts/${TASK_ID}/backend-prompt.md)" --print

# 作業ディレクトリ指定
cd ./hotel-common-rebuild && \
  claude -p "$(cat ../prompts/${TASK_ID}/backend-prompt.md)" --print

# JSON出力（パース用）
claude -p "$(cat prompts/${TASK_ID}/backend-prompt.md)" \
       --print \
       --output-format json
```

**Codex（OpenAI API経由）**:
```bash
# Codex相当の機能はOpenAI APIで
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "system", "content": "You are a frontend developer..."},
      {"role": "user", "content": "$(cat prompts/${TASK_ID}/frontend-prompt.md)"}
    ]
  }'
```

**実行形態の比較**:
| ツール | 形態 | 自動化適性 |
|:-------|:-----|:-----------|
| Claude Code CLI | ヘッドレスモード | ✅ 最適 |
| Claude Code IDE | VS Code拡張 | ❌ 手動向け |
| Codex (OpenAI) | API呼び出し | ✅ 最適 |

#### 🎨 UI実装時のCodex強化プロンプト

```markdown
## デザインシステム遵守
- CSSフレームワーク: Tailwind CSS
- UIライブラリ: Vuetify 3
- カラーパレット: 日本の伝統色（${DESIGN_TOKENS}）
- フォント: ${FONT_FAMILY}

## 必須チェック
- [ ] レスポンシブ対応（mobile-first）
- [ ] アクセシビリティ（WCAG 2.1 AA）
- [ ] ダークモード対応
- [ ] 多言語対応（i18n）

## 禁止パターン
- ❌ インラインスタイル
- ❌ ハードコード色（CSS変数使用）
- ❌ px単位（rem使用）
```

**実装出力**:
- 変更されたファイル一覧
- 実行ログ
- Evidence（スクリーンショット等）
- UI変更時: ビジュアルdiff

---

### Stage 7: 実装監査（3 LLM）

**目的**: 実装結果がSSOT/プロンプトに準拠しているか検証

```javascript
const codeAuditors = [
  { name: 'SSOT Compliance', model: 'claude-opus', focus: 'SSOT準拠' },
  { name: 'Security', model: 'gpt-4o', focus: 'セキュリティ・脆弱性' },
  { name: 'Best Practice', model: 'claude-sonnet', focus: 'コード品質' }
];

// 変更ファイルを読み込んで監査
const changedFiles = getGitDiff();
const auditResults = await Promise.all(
  codeAuditors.map(a => auditCode(changedFiles, ssot, a))
);
```

**監査チェックリスト**:
- [ ] 全ての要件IDが実装されているか
- [ ] Accept条件を満たしているか
- [ ] 禁止パターン（Prisma直接使用等）がないか
- [ ] セキュリティ脆弱性がないか
- [ ] テストが書かれているか

---

### Stage 8: 自動修正

**目的**: 監査で指摘された問題を自動修正

```javascript
// 修正指示を生成
const fixInstructions = generateFixInstructions(auditResults);

// Claude Code で修正実行
await claudeCode.run({
  prompt: fixInstructions,
  targetFiles: auditResults.problematicFiles
});

// → Stage 7へ戻って再監査
```

**最大修正回数**: 3回（超過時は人間レビュー）

---

### Stage 9: テスト

**目的**: 自動テスト + UI動作確認 + ビジュアルリグレッション

```javascript
// 自動テスト
const testResults = {
  unit: await runUnitTests(),
  integration: await runIntegrationTests(),
  e2e: await runE2ETests(),
  standard: await runStandardTests() // test-standard-guest.sh等
};

// UI動作確認（Playwright）
const uiResults = await runUITests({
  scenarios: extractScenariosFromSSOT(ssot),
  screenshots: true
});

// ビジュアルリグレッションテスト（UI変更時のみ）
const visualResults = await runVisualTests({
  baselineDir: './visual-baselines',
  screenshotDir: './evidence/${taskId}/screenshots',
  threshold: 0.1 // 10%以上の差分で警告
});

// Evidence保存
saveEvidence(taskId, { testResults, uiResults, visualResults });
```

#### 🎨 ビジュアルテスト詳細（UI変更時）

```javascript
// Playwright でスクリーンショット取得
const visualTestConfig = {
  viewports: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 }
  ],
  pages: [
    { name: 'menu', path: '/menu' },
    { name: 'order', path: '/order/history' },
    { name: 'info-wifi', path: '/info/wifi' }
  ],
  darkMode: true,
  languages: ['ja', 'en', 'zh']
};

// 差分検出
async function compareVisuals(baseline, current) {
  const pixelmatch = require('pixelmatch');
  const diff = pixelmatch(baseline, current, null, width, height, { threshold: 0.1 });
  
  if (diff > threshold) {
    return {
      passed: false,
      diffPercentage: (diff / (width * height)) * 100,
      diffImage: generateDiffImage(baseline, current)
    };
  }
  return { passed: true };
}
```

**ビジュアルテスト自動化ツール**:
- Playwright (推奨)
- Percy (SaaS)
- Chromatic (Storybook連携)
- reg-suit (オープンソース)

---

### Stage 10: PR/CIチェック

**目的**: Pull Request作成とCIパス確認

```bash
# ブランチ作成
git checkout -b feat/${TASK_ID}-${FEATURE_NAME}

# コミット
git add -A
git commit -m "feat(${TASK_ID}): ${FEATURE_NAME}

## 参照SSOT
- ${SSOT_PATH}

## 実装内容
- ${IMPLEMENTATION_SUMMARY}

## テスト結果
- 単体テスト: PASS
- 統合テスト: PASS
- E2Eテスト: PASS
"

# PR作成
gh pr create --title "[${TASK_ID}] ${FEATURE_NAME}" \
             --body-file pr-template.md
```

**CI必須チェック**:
- [ ] OpenAPI lint
- [ ] SSOT整合性チェック
- [ ] リンク整合性チェック
- [ ] TypeScript型チェック
- [ ] 単体テスト
- [ ] E2Eテスト

---

### Stage 11: マージ

**条件**: CI全パス + 自動承認ルール適合

```javascript
// 自動マージ条件
const autoMergeConditions = {
  ciPassed: true,
  auditScore: >= 90,
  noSecurityIssues: true,
  testCoverage: >= 80,
  humanReviewRequired: false // 重大変更は人間レビュー
};

if (checkAutoMergeConditions(pr, autoMergeConditions)) {
  await mergePR(pr, { method: 'squash' });
} else {
  await requestHumanReview(pr);
}
```

---

### Stage 12: Plane更新

**目的**: タスクステータスを自動更新

```javascript
// マージ完了時
await planeApi.updateIssue(taskId, {
  state: 'Done',
  comment: `
## ✅ 自動実装完了

### 成果物
- PR: #${prNumber}
- コミット: ${commitHash}
- SSOT: ${ssotPath}

### 監査スコア
- プロンプト監査: ${promptAuditScore}/100
- 実装監査: ${codeAuditScore}/100

### テスト結果
- 単体: ${unitTestResult}
- E2E: ${e2eTestResult}

### コスト
- SSOT生成: ${ssotCost}
- 実装: ${implementationCost}
- 監査: ${auditCost}
- 合計: ${totalCost}
`
});
```

---

## 3. 自動化レベル

### Level 1: 半自動（現状〜短期）

```
人間: タスク選択
  ↓
自動: SSOT生成 ← 今ここ
  ↓
人間: SSOT確認・承認
  ↓
自動: プロンプト生成
  ↓
人間: プロンプト確認・承認
  ↓
半自動: Claude Code実装（人間監視）
  ↓
人間: 動作確認・承認
  ↓
自動: PR/CI/マージ
```

### Level 2: ほぼ自動（中期）

```
人間: タスク選択
  ↓
自動: SSOT生成 → 監査 → 修正 → 承認
  ↓
自動: プロンプト生成 → 監査 → 修正 → 承認
  ↓
自動: 実装 → 監査 → 修正 → テスト
  ↓
人間: 最終確認（5分）
  ↓
自動: PR/CI/マージ/Plane更新
```

### Level 3: 完全自動（長期）

```
自動: タスク選択（優先度・依存関係から）
  ↓
自動: 全フロー
  ↓
人間: 日次レビュー（異常検知時のみ介入）
```

---

## 4. 実装ロードマップ

### Phase 1: 基盤（今〜1ヶ月）

| タスク | 工数 | 依存 |
|:-------|:-----|:-----|
| SSOT生成 | ✅完成 | - |
| プロンプト生成 | 2日 | SSOT生成 |
| プロンプト監査 | 3日 | プロンプト生成 |
| 修正ループ | 2日 | 監査 |

### Phase 2: 実装自動化（1〜2ヶ月）

| タスク | 工数 | 依存 |
|:-------|:-----|:-----|
| Claude Code連携 | 3日 | プロンプト完成 |
| 実装監査 | 3日 | 実装 |
| 自動修正ループ | 2日 | 監査 |
| テスト自動化 | 5日 | 修正 |

### Phase 3: CI/CD連携（2〜3ヶ月）

| タスク | 工数 | 依存 |
|:-------|:-----|:-----|
| PR自動作成 | 1日 | テスト |
| CI連携 | 2日 | PR |
| 自動マージ | 2日 | CI |
| Plane連携 | 1日 | マージ |

### Phase 4: SaaS化（3〜6ヶ月）

| タスク | 工数 | 依存 |
|:-------|:-----|:-----|
| Web UI | 2週間 | 全フロー |
| マルチテナント | 1週間 | UI |
| 課金システム | 1週間 | テナント |
| ダッシュボード | 1週間 | 課金 |

---

## 5. コスト試算

### 1タスクあたりのコスト（推定）

#### API/Logicタスク（Claude Code単独）

| ステージ | コスト | 備考 |
|:---------|:-------|:-----|
| SSOT生成 | $0.50 | 実績 |
| プロンプト生成 | $0.10 | 推定 |
| プロンプト監査×3 | $0.30 | 推定 |
| プロンプト修正×2 | $0.20 | 推定 |
| 実装（Claude Code） | $1.00 | 推定 |
| 実装監査×3 | $0.50 | 推定 |
| 修正×2 | $0.40 | 推定 |
| **合計** | **$3.00** | ¥450 |

#### UI/UXタスク（Codex + Claude Code監査）

| ステージ | コスト | 備考 |
|:---------|:-------|:-----|
| SSOT生成 | $0.50 | 実績 |
| プロンプト生成 | $0.15 | UI要件追加 |
| プロンプト監査×3 | $0.30 | 推定 |
| 実装（Codex） | $0.80 | GPT-4oベース |
| ビジュアルテスト | $0.10 | スクリーンショット比較 |
| 実装監査×3 | $0.50 | 推定 |
| 修正×2 | $0.30 | 推定 |
| **合計** | **$2.65** | ¥400 |

#### Full Stackタスク（Claude Code + Codex 分割）

| ステージ | コスト | 備考 |
|:---------|:-------|:-----|
| SSOT生成 | $0.50 | 実績 |
| プロンプト生成（2種） | $0.20 | Backend + Frontend |
| プロンプト監査×3 | $0.40 | 推定 |
| 実装（Claude Code） | $1.00 | Backend |
| 実装（Codex） | $0.80 | Frontend |
| ビジュアルテスト | $0.10 | スクリーンショット比較 |
| 実装監査×3 | $0.60 | 推定 |
| 修正×2 | $0.50 | 推定 |
| **合計** | **$4.10** | ¥615 |

### 人間工数との比較

| 項目 | 人間 | AI自動化 | 削減 |
|:-----|:-----|:---------|:-----|
| 1タスク所要時間 | 4時間 | 15分 | 94% |
| 1タスクコスト | ¥8,000 | ¥450 | 94% |
| 月間100タスク | ¥800,000 | ¥45,000 | ¥755,000/月 |

---

## 6. リスクと対策

### 技術リスク

| リスク | 対策 |
|:-------|:-----|
| LLM幻覚（存在しないファイル参照） | 実在確認ステップ必須 |
| 無限修正ループ | 最大3回制限、人間エスカレーション |
| Claude Code API制限 | レート制限、キュー管理 |
| セキュリティ脆弱性生成 | セキュリティ専門監査LLM |

### 運用リスク

| リスク | 対策 |
|:-------|:-----|
| 本番障害 | ステージング必須、ロールバック自動化 |
| コスト暴走 | 予算上限設定、アラート |
| 品質低下 | 品質スコア閾値、定期サンプリングレビュー |

---

## 7. 成功指標

| 指標 | 目標 | 測定方法 |
|:-----|:-----|:---------|
| 自動化率 | > 90% | 人間介入回数 / 総タスク数 |
| 1タスク所要時間 | < 20分 | 開始〜マージ |
| 1タスクコスト | < ¥500 | LLM API費用 |
| 品質スコア | > 85点 | 監査スコア平均 |
| バグ発生率 | < 5% | 本番障害 / デプロイ数 |
| 開発者満足度 | > 80% | 定期アンケート |

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|:-----|:-----------|:---------|
| 2026-01-17 | 0.1.0 | 初版設計 |
