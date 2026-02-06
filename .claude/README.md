# Claude Code Configuration for hotel-kanri

[everything-claude-code](https://github.com/affaan-m/everything-claude-code) を参考に構築した、hotel-kanri専用のClaude Code設定集です。

## 構造

```
.claude/
├── agents/         # 専門エージェント（分業）
├── skills/         # ドメイン知識・パターン
├── commands/       # スラッシュコマンド
├── rules/          # 常時適用ルール
├── hooks/          # 自動チェック
├── memory/         # 長期記憶（Project Memory）
└── mcp-configs/    # 外部ツール連携
```

## クイックスタート

### 1. エージェントを使う

```bash
# === 計画フェーズ ===
/ssot ユーザー管理         # SSOT作成
/plan DEV-0170            # 実装計画立案

# === 実装フェーズ（推奨順序）===
/api DEV-0181             # API実装（hotel-common）
/ui DEV-0181              # UI実装（hotel-saas）
/impl SSOT_GUEST_AI_HANDOFF  # 汎用実装

# === 検証フェーズ ===
/integrate DEV-0181       # 3リポ統合確認
/gate                     # 品質ゲートチェック
/review src/routes/       # コードレビュー

# === TDD ===
/tdd 注文作成API
```

### 2. MCP設定

`mcp-configs/hotel-kanri.json` をClaude Code設定に追加:

```bash
# ~/.claude.json に追加
cp .claude/mcp-configs/hotel-kanri.json ~/.claude/
```

### 3. フックの有効化

`hooks/hooks.json` の内容を `~/.claude/settings.json` に追加。

## エージェント一覧

### 基盤エージェント
| エージェント | 役割 | コマンド |
|:------------|:-----|:--------|
| ssot-writer | SSOT作成 | `/ssot` |
| planner | 実装計画立案 | `/plan` |
| code-reviewer | コードレビュー | `/review` |
| security-reviewer | セキュリティ監査 | - |
| tdd-guide | テスト駆動開発 | `/tdd` |

### 3リポジトリ開発エージェント
| エージェント | 役割 | コマンド |
|:------------|:-----|:--------|
| api-implementer | hotel-common API実装 | `/api` |
| ui-implementer | hotel-saas UI実装 | `/ui` |
| integration-coordinator | 3リポ横断統合 | `/integrate` |
| quality-gate | 品質ゲートチェック | `/gate` |

## スキル一覧

| スキル | 内容 |
|:-------|:-----|
| hotel-saas-patterns | Nuxt3プロキシパターン |
| hotel-common-patterns | Express + Prismaパターン |
| multitenant-rules | マルチテナント必須ルール |
| ssot-workflow | SSOT作成フロー |

## ルール一覧

| ルール | 内容 |
|:-------|:-----|
| security | セキュリティ必須事項 |
| multitenant | テナント分離 |
| api-routing | ルーティング規約 |
| database | DB命名規則 |

## Project Memory

| ファイル | 内容 |
|:---------|:-----|
| decisions.md | 意思決定記録（ADR） |
| bugs.md | バグ知識ベース |
| lessons.md | 学習した教訓 |
| key_facts.md | プロジェクト固有情報 |

## フック

| 検出対象 | アクション |
|:---------|:----------|
| hotel-saasでPrisma使用 | ❌ 警告 |
| console.log残存 | ⚠️ 警告 |
| フォールバック値 | ❌ 警告 |
| any型使用 | ⚠️ 警告 |
| $fetch直接使用 | ❌ 警告 |

## コンテキストウィンドウ管理

- 最大有効MCPサーバー: 10
- 最大アクティブツール: 80
- プロジェクトごとに必要なサーバーのみ有効化

## 参考

- [everything-claude-code](https://github.com/affaan-m/everything-claude-code)
- [Model Context Protocol](https://github.com/anthropics/anthropic-model-context-protocol)
