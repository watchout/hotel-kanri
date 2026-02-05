# SSOT: マルチLLMペアプログラミング

**作成日**: 2026-01-27  
**最終更新**: 2026-01-27  
**バージョン**: 1.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🟡 高（品質向上の手段）  
**親SSOT**: [SSOT_AUTO_DEV_SYSTEM.md](./SSOT_AUTO_DEV_SYSTEM.md)

---

## 📋 このSSOTの目的

**複数のLLM（Claude, GPT-4o, Gemini）を組み合わせて、より高品質なコード生成・レビューを実現する。**

### 解決する課題

1. **単一LLMの盲点**: 1つのLLMでは見逃すバグ・問題がある
2. **品質のバラツキ**: LLMの出力品質が安定しない
3. **レビュー不足**: 人間のレビューなしで品質を担保したい

### 提供する価値

- ✅ 異なる視点からの多角的レビュー
- ✅ 投票方式による客観的品質判定
- ✅ ペアプログラミングによる反復改善
- ✅ SSOT準拠の厳密な監査

---

## 🏗️ マルチLLMアーキテクチャ

### LLM役割分担

```
┌─────────────────────────────────────────────────────────────┐
│ 実装AI（Driver）                                            │
│   - Claude Sonnet 4: メイン実装担当                         │
│   - 得意: 複雑なロジック、アーキテクチャ設計                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ レビューAI（Navigator）                                      │
│   - GPT-4o: コードレビュー1                                 │
│   - Gemini 1.5 Pro: コードレビュー2                         │
│   - 得意: 問題点指摘、改善提案、セキュリティチェック          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 監査AI（Auditor）                                            │
│   - Claude Opus 4: SSOT監査                                 │
│   - GPT-4o: SSOT監査                                        │
│   - Gemini 1.5 Pro: SSOT監査                                │
│   - 投票方式: 3モデル中2以上でPass                           │
└─────────────────────────────────────────────────────────────┘
```

### LLM構成詳細

| LLM | モデル | 役割 | コスト（USD/1M tokens） |
|-----|--------|------|------------------------|
| Claude Opus 4 | claude-opus-4-20250514 | 監査（最高精度） | Input: $15, Output: $75 |
| Claude Sonnet 4 | claude-sonnet-4-20250514 | 実装（バランス） | Input: $3, Output: $15 |
| GPT-4o | gpt-4o | レビュー・監査 | Input: $2.50, Output: $10 |
| GPT-4o mini | gpt-4o-mini | 軽量タスク | Input: $0.15, Output: $0.60 |
| Gemini 1.5 Pro | gemini-1.5-pro-latest | レビュー・監査 | Input: $1.25, Output: $5 |
| Gemini 1.5 Flash | gemini-1.5-flash-latest | 軽量タスク | Input: $0.075, Output: $0.30 |

---

## 🔧 実装方式

### 方式1: APIベース（推奨）

**ファイル**: `scripts/auto-dev/multi-llm-pair-programming.cjs`

**特徴**:
- スクリプト内でAPI直接呼び出し
- 並列実行（GPT-4o + Gemini同時）
- 投票方式（3モデル中2以上でPass）
- コスト計算・ログ記録

**コマンド**:
```bash
# 並列コードレビュー
node multi-llm-pair-programming.cjs review <file> [--ssot <ssot-path>]

# マルチLLM SSOT監査（投票方式）
node multi-llm-pair-programming.cjs audit <ssot-path> <code-path>

# ペアプログラミング生成
node multi-llm-pair-programming.cjs generate <ssot-path>
```

### 方式2: CLIベース

**ファイル**: `scripts/auto-dev/pair-program-cli.sh`

**特徴**:
- `claude` + `codex` コマンド連携
- リアルタイム対話
- コンテキスト継続
- 反復改善（複数ラウンド）

**コマンド**:
```bash
# フル ペアプログラミング フロー
./pair-program-cli.sh full <ssot-path>

# 既存コードをレビュー
./pair-program-cli.sh review <code-file> [ssot-path]

# 反復改善（Nラウンド）
./pair-program-cli.sh iterate <code-file> <rounds>

# CLIツール確認
./pair-program-cli.sh check
```

### 方式比較

| 観点 | APIベース | CLIベース |
|------|----------|----------|
| 実行方式 | スクリプト内API呼び出し | claude/codexコマンド |
| 並列実行 | ✅ 可能 | ❌ 不可 |
| 投票方式 | ✅ 3モデル投票 | ❌ なし |
| コスト計算 | ✅ 自動 | ❌ 手動 |
| コンテキスト継続 | ❌ 限定的 | ✅ 完全 |
| リアルタイム対話 | ❌ なし | ✅ 可能 |
| 反復改善 | ❌ 1回 | ✅ 複数ラウンド |

---

## 📊 品質基準

### MLPP-001: 並列レビュー

**目的**: 複数LLMで同時にコードレビュー

**構成**:
- GPT-4o: コードレビュー1
- Gemini 1.5 Pro: コードレビュー2

**評価項目**:
1. SSOT準拠: 仕様書の要件を満たしているか
2. 品質: 可読性、保守性、パフォーマンス
3. セキュリティ: 脆弱性、入力検証
4. ベストプラクティス: 設計パターン、エラーハンドリング

**出力形式**:
```json
{
  "score": 85,
  "verdict": "APPROVE",
  "issues": [
    { "severity": "major", "line": 42, "message": "N+1クエリの可能性" }
  ],
  "suggestions": ["キャッシュの追加を検討"],
  "summary": "全体的に良好。パフォーマンス改善の余地あり。"
}
```

**Accept条件**:
- ✅ 両モデルが85点以上でPass
- ✅ 問題点が統合・重複除去される
- ✅ レビュー結果がJSON形式で出力

---

### MLPP-002: 投票方式監査

**目的**: 3モデルの投票でSSoT準拠を判定

**構成**:
- Claude Opus 4: SSOT監査
- GPT-4o: SSOT監査
- Gemini 1.5 Pro: SSOT監査

**投票ルール**:
```
判定基準:
  - 各モデルが85点以上 → Pass票
  - 各モデルが85点未満 → Fail票
  - 3モデル中2以上がPass → 最終判定: APPROVED
  - 3モデル中2以上がFail → 最終判定: REJECTED
```

**評価項目**:
1. 要件ID（XXX-nnn）が全て実装されているか
2. Accept条件が全て満たされているか
3. API仕様が正確か
4. DBスキーマが正確か
5. エラーハンドリングが仕様通りか

**出力形式**:
```json
{
  "audits": [
    { "model": "claude-opus-4-20250514", "score": 92 },
    { "model": "gpt-4o", "score": 88 },
    { "model": "gemini-1.5-pro-latest", "score": 85 }
  ],
  "avgScore": 88,
  "passVotes": 3,
  "totalAuditors": 3,
  "passed": true,
  "verdict": "APPROVED"
}
```

**Accept条件**:
- ✅ 3モデルが並列実行
- ✅ 投票結果が集計される
- ✅ 2モデル以上PassでAPPROVED

---

### MLPP-003: ペアプログラミング（API）

**目的**: Claude + GPT-4oのDriver/Navigator方式でコード生成

**フロー**:
```
Phase 1: Claude（Driver）が初期実装
  - SSOTを読み込み
  - 要件IDを確認
  - TypeScriptで実装

Phase 2: GPT-4o（Navigator）がレビュー
  - SSOT準拠をチェック
  - 問題点を指摘
  - 改善提案
  - 修正コードを提案

Phase 3: Claude（Driver）が修正を反映
  - フィードバックを全て反映
  - 最終版コードを生成
```

**Accept条件**:
- ✅ 3フェーズが順番に実行
- ✅ 各フェーズの出力が次フェーズに渡る
- ✅ 最終コードにフィードバックが反映

---

### MLPP-004: CLIペアプログラミング

**目的**: claude + codexコマンドで反復改善

**フロー**:
```
ラウンド1:
  Claude（Driver）が実装
  Codex（Navigator）がレビュー
  Claude（Driver）が修正

ラウンド2:
  Codex（Navigator）がレビュー
  Claude（Driver）が修正

ラウンドN:
  ...（収束するまで）
```

**Accept条件**:
- ✅ 複数ラウンド実行可能
- ✅ 各ラウンドで改善
- ✅ ラウンド間でコンテキスト継続

---

## 🔧 環境要件

### 必須（APIベース）

| 要件 | 用途 |
|------|------|
| ANTHROPIC_API_KEY | Claude API |
| OPENAI_API_KEY | GPT-4o API |

### オプション

| 要件 | 用途 |
|------|------|
| GOOGLE_API_KEY | Gemini API |
| claude CLI | CLIペアプログラミング |
| codex CLI | CLIペアプログラミング |

---

## 🚀 セットアップ手順

### Step 1: 環境変数設定

`.env.mcp` に追加:
```bash
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
GOOGLE_API_KEY=xxxxx  # オプション
```

### Step 2: APIベース動作確認

```bash
cd /Users/kaneko/hotel-kanri

# ヘルプ確認
node scripts/auto-dev/multi-llm-pair-programming.cjs --help

# 既存コードをレビュー
node scripts/auto-dev/multi-llm-pair-programming.cjs review \
  /Users/kaneko/hotel-common-rebuild/src/routes/tenants.routes.ts \
  --ssot docs/03_ssot/01_admin_features/SSOT_TENANT_MANAGEMENT.md
```

### Step 3: CLIベース動作確認（オプション）

```bash
# CLIツール確認
./scripts/auto-dev/pair-program-cli.sh check

# フルフロー実行
./scripts/auto-dev/pair-program-cli.sh full \
  docs/03_ssot/01_admin_features/SSOT_XXX.md
```

---

## 💰 コスト見積もり

### 1回のペアプログラミング（概算）

| フェーズ | モデル | Input | Output | コスト |
|---------|--------|-------|--------|--------|
| 実装 | Claude Sonnet | 5K | 2K | $0.045 |
| レビュー | GPT-4o | 7K | 1K | $0.028 |
| 修正 | Claude Sonnet | 8K | 2K | $0.054 |
| **合計** | | | | **$0.13** |

### 1回のマルチLLM監査（概算）

| モデル | Input | Output | コスト |
|--------|-------|--------|--------|
| Claude Opus | 8K | 1K | $0.195 |
| GPT-4o | 8K | 1K | $0.030 |
| Gemini Pro | 8K | 1K | $0.015 |
| **合計** | | | **$0.24** |

### 月間コスト目安

| 利用頻度 | ペアプログラミング | 監査 | 合計 |
|---------|-------------------|------|------|
| 軽（10回/月） | $1.30 | $2.40 | $3.70 |
| 中（50回/月） | $6.50 | $12.00 | $18.50 |
| 重（200回/月） | $26.00 | $48.00 | $74.00 |

---

## 📋 要件ID一覧

| ID | 要件 | ステータス |
|----|------|-----------|
| MLPP-001 | 並列レビュー | ✅ 実装済み |
| MLPP-002 | 投票方式監査 | ✅ 実装済み |
| MLPP-003 | ペアプログラミング（API） | ✅ 実装済み |
| MLPP-004 | CLIペアプログラミング | ✅ 実装済み |

---

## 📚 関連ドキュメント

- [SSOT_AUTO_DEV_SYSTEM.md](./SSOT_AUTO_DEV_SYSTEM.md) - 親SSOT（自動開発システム）
- [auto-dev/README.md](/scripts/auto-dev/README.md) - スクリプトドキュメント
- [llm-client.cjs](/scripts/prompt-generator/lib/llm-client.cjs) - LLMクライアント

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2026-01-27 | 初版作成 |
