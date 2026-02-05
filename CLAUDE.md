# CLAUDE.md - Hotel SaaS Project Framework Entry Point

**バージョン**: 3.0.0
**最終更新**: 2026-02-05
**管理者**: hotel-kanri (司令塔リポジトリ)
**フレームワーク**: ai-dev-framework v3.0 + auto-dev v3 統合

---

## Framework Integration (フレームワーク統合)

```
┌─────────────────────────────────────────────────────────────────────┐
│  ai-dev-framework v3.0（理論・プロセス）                            │
│  - SSOT 3層構造（Core/Contract/Detail）                            │
│  - AI中断プロトコル（T1-T7）                                        │
│  - 止まらないルール                                                 │
│  - 品質監査（SSOT, Code, Test, Visual, Feature）                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────────┐
│  auto-dev v3（実装自動化エンジン）                                  │
│  - 複数リポジトリ自動制御                                           │
│  - マルチLLM監査                                                    │
│  - Claude CLI + Cursor Agent 統合                                  │
│  - Plane連携、Discord通知                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Framework Documents

| ドキュメント | 場所 | 説明 |
|:-------------|:-----|:-----|
| AI Escalation Protocol | `docs/standards/AI_ESCALATION_PROTOCOL.md` | T1-T7、止まらないルール |
| DECISION_BACKLOG | `docs/03_ssot/DECISION_BACKLOG.md` | 未決定事項管理 |
| CROSS_CUTTING_API_CONTRACT | `docs/03_ssot/CROSS_CUTTING_API_CONTRACT.md` | リポジトリ横断API契約 |
| Knowledge Base | `docs/knowledge/` | ドメイン知識 |
| auto-dev README | `scripts/auto-dev/README.md` | 自動開発システム |

---

## Overview (プロジェクト概要)

Hotel SaaS は、ホテル向けの客室サービス管理システムです。マルチテナント対応の SaaS として、メニュー管理、注文管理、AIコンシェルジュ機能を提供します。

### 3-Repository Architecture (3リポジトリ構成)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    hotel-kanri (司令塔)                             │
│  - SSOT（Single Source of Truth）ドキュメント管理                    │
│  - 開発タスク管理（Plane連携）                                       │
│  - 品質チェックスクリプト                                            │
│  - 自動開発システム (auto-dev v3)                                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
           ┌────────────────┴────────────────┐
           ▼                                 ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│  hotel-common-rebuild    │    │  hotel-saas-rebuild      │
│  (API基盤)               │    │  (フロントエンド)         │
│  - Express + Prisma      │    │  - Nuxt 3                │
│  - PostgreSQL            │    │  - Vue 3 Composition API │
│  - Session認証           │    │  - Pinia 状態管理        │
│  - Port: 3401            │    │  - Port: 3101            │
└──────────────────────────┘    └──────────────────────────┘
```

### 技術スタック

| システム | ポート | 役割 |
|:---------|:-------|:-----|
| hotel-saas-rebuild | 3101 | フロントエンド + APIプロキシ |
| hotel-common-rebuild | 3401 | API基盤 + DB層 |
| PostgreSQL | 5432 | データベース |
| Redis | 6379 | セッション |

---

## SSOT 3-Layer Structure (3層構造)

すべてのSSOTドキュメントは以下の3層で構成されます：

| 層 | タグ | 説明 | 変更頻度 |
|----|------|------|---------|
| **Core** | `[CORE]` | 変わりにくい基本原則・制約 | 低 |
| **Contract** | `[CONTRACT]` | 破壊しない約束（API仕様、データ形式） | 中 |
| **Detail** | `[DETAIL]` | 変更される前提の実装詳細 | 高 |

### Stop-Not Rule (止まらないルール)

- **DETAIL層**: デフォルトで進む（相談不要）
- **CONTRACT層以上**: 明示的に「止まって相談」と記載がある場合のみ停止

---

## Key Documents (主要ドキュメント)

### Framework Entry Points
| ファイル | 説明 |
|---------|------|
| `CLAUDE.md` (本ファイル) | フレームワークエントリポイント |
| `docs/03_ssot/DECISION_BACKLOG.md` | 未決定事項バックログ |
| `docs/03_ssot/CROSS_CUTTING_API_CONTRACT.md` | リポジトリ横断API契約 |

### Foundation (基盤SSOT)
| ファイル | 説明 |
|---------|------|
| `docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md` | APIエンドポイント一覧 |
| `docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md` | マルチテナント設計 |
| `docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md` | Session認証設計 |
| `docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md` | データベーススキーマ |

### Feature SSOTs
| カテゴリ | パス |
|---------|------|
| Admin Features | `docs/03_ssot/01_admin_features/` |
| Guest Features | `docs/03_ssot/02_guest_features/` |

---

## 🚨 CRITICAL: Target Repository Rule (対象リポジトリ明記ルール)

SSOTドキュメントには必ず対象リポジトリを明記すること：

```markdown
## 対象リポジトリ
- [x] hotel-kanri (SSOT管理)
- [x] hotel-common-rebuild (API実装)
- [x] hotel-saas-rebuild (UI実装)
```

---

## 📦 Self-Contained Instructions Rule (自己完結型指示ルール)

他リポジトリ（hotel-common-rebuild、hotel-saas-rebuild）に送る実装指示は、**完全自己完結型**でなければならない。

### ルール

1. **SSOT内容を埋め込む**: 指示書内にSSOT内容をすべて含める（他リポのファイル参照禁止）
2. **Phase分離**: API側（hotel-common）を先に実装、UI側（hotel-saas）を後に実装
3. **連続実行指示**: 1タスク完了 → 次タスクへ自動進行
4. **停止条件を明記**: CORE/CONTRACT不明、矛盾、破壊的変更、セキュリティ懸念

### 指示ファイルの配置

```
docs/04_implementation_instructions/
├── PHASE1_COMMON_INSTRUCTIONS.md   # hotel-common-rebuild 用
└── PHASE2_SAAS_INSTRUCTIONS.md     # hotel-saas-rebuild 用
```

### 指示書テンプレート構成

```markdown
# Phase N: [リポジトリ名] 連続実行指示

## 実行ルール
- TDD強制（テスト先行）
- 停止条件

## タスク1: [タスクID] - [タスク名]
### 概要
### データベース設計（Prismaスキーマ埋め込み）
### API仕様（リクエスト/レスポンス埋め込み）
### 実装ファイル一覧
### テスト要件

## タスク2: ...

## 実行チェックリスト
```

---

## 🛡️ 絶対禁止パターン

### hotel-saasで禁止
```typescript
// ❌ Prisma直接使用
import { PrismaClient } from '@prisma/client';

// ❌ $fetch直接使用
const data = await $fetch('http://localhost:3401/...');

// ✅ callHotelCommonAPIを使用
const data = await callHotelCommonAPI(event, '/api/v1/...', { method: 'GET' });
```

### 全システムで禁止
```typescript
// ❌ フォールバック値
const tenantId = session.tenantId || 'default';

// ❌ 環境分岐
if (process.env.NODE_ENV === 'development') { ... }

// ❌ any型
const data: any = ...;
```

---

## 📋 Quick Commands

```bash
# hotel-kanri (このリポジトリ)
npm run check:ssot-links    # SSOTリンク整合性チェック

# hotel-common-rebuild
npm run dev                 # 開発サーバー起動 (port 3401)
npm run db:migrate          # DBマイグレーション
npm run test                # テスト実行

# hotel-saas-rebuild
npm run dev                 # 開発サーバー起動 (port 3101)
npm run build               # プロダクションビルド
npm run test                # テスト実行
```

---

## 📁 ディレクトリ構造

```
hotel-kanri/                    # 管理リポジトリ (司令塔)
├── CLAUDE.md                   # フレームワークエントリポイント
├── docs/03_ssot/               # SSOT（仕様書）
│   ├── DECISION_BACKLOG.md     # 未決定事項
│   ├── CROSS_CUTTING_API_CONTRACT.md # API契約
│   ├── 00_foundation/          # 基盤SSOT
│   ├── 01_admin_features/      # 管理機能SSOT
│   └── 02_guest_features/      # ゲスト機能SSOT
├── scripts/                    # ユーティリティ
│   ├── auto-dev/               # 自動開発システム
│   ├── plane/                  # Plane連携
│   └── quality/                # 品質チェック
├── .refs/                      # 他リポジトリへのシンボリックリンク
│   ├── hotel-saas/             # → hotel-saas-rebuild
│   └── hotel-common/           # → hotel-common-rebuild
└── .husky/                     # Git hooks

hotel-saas-rebuild/             # フロントエンド
├── pages/                      # ページ
├── components/                 # コンポーネント
├── composables/                # 状態管理
└── server/api/                 # プロキシAPI

hotel-common-rebuild/           # API基盤
├── src/routes/                 # ルーター
├── src/services/               # ビジネスロジック
├── src/utils/                  # ユーティリティ
└── prisma/                     # DBスキーマ
```

---

## 🔑 テスト用アカウント

| 項目 | 値 |
|:-----|:---|
| Email | `owner@test.omotenasuai.com` |
| Password | `owner123` |

---

## 🔗 Cross-Repository Reference (リポジトリ間参照)

Claude Code Web/CLI で `hotel-kanri` を開いた状態で、他リポジトリのファイルを直接参照可能です。

### 使用方法

```bash
# hotel-saas-rebuild のファイルを参照
.refs/hotel-saas/pages/admin/index.vue
.refs/hotel-saas/server/api/v1/admin/tenants.get.ts
.refs/hotel-saas/composables/useAuth.ts

# hotel-common-rebuild のファイルを参照
.refs/hotel-common/src/routes/tenants.routes.ts
.refs/hotel-common/src/services/tenant.service.ts
.refs/hotel-common/prisma/schema.prisma
```

### プロンプト例

```
「.refs/hotel-common/src/routes/ のファイル一覧を見せて」
「.refs/hotel-saas/pages/admin/tenants/ を読んで」
「.refs/hotel-common/prisma/schema.prisma のTenantモデルを確認して」
```

---

## 🤖 Auto-Dev Integration (自動開発統合)

### 複数リポジトリ自動実装

```bash
# 親タスクを指定して自動実行（SSOT → 実装 → テスト → PR）
node scripts/auto-dev/run-task-v3.cjs DEV-0170

# ドライラン（実行内容の確認のみ）
node scripts/auto-dev/run-task-v3.cjs DEV-0170 --dry-run

# 連続実行（Planeから順次タスク取得）
node scripts/auto-dev/run-loop-v3.cjs --idle --sleep-sec 60
```

### 環境変数（auto-dev用）

```bash
# リポジトリパス
AUTODEV_KANRI_DIR=/Users/kaneko/hotel-kanri
AUTODEV_COMMON_DIR=/Users/kaneko/hotel-common-rebuild
AUTODEV_SAAS_DIR=/Users/kaneko/hotel-saas-rebuild

# PR対象（kanriを除外）
AUTODEV_V3_PR_REPOS=common,saas

# SSOTサブタスクはスキップ
AUTODEV_V3_SKIP_SSOT_SUBTASKS=1
```

### 実装フロー

```
1. Plane からタスク取得
      ↓
2. SSOT 確認（hotel-kanri/docs/03_ssot/）
      ↓
3. hotel-common-rebuild で API 実装（TDD強制）
      ↓
4. hotel-saas-rebuild で UI 実装
      ↓
5. 品質ゲート（禁止パターン検出、ビルド、テスト）
      ↓
6. PR 作成 → Plane を Done に更新
```

### STOP条件

以下の場合、自動実行が停止し人間に通知:

- SSOT不在
- 禁止パターン検出（any / tenant fallback / saas Prisma / $fetch直 等）
- ビルド失敗
- テスト失敗（3回リトライ後）

---

## Related Links

- [DECISION_BACKLOG.md](./docs/03_ssot/DECISION_BACKLOG.md) - 未決定事項
- [CROSS_CUTTING_API_CONTRACT.md](./docs/03_ssot/CROSS_CUTTING_API_CONTRACT.md) - API契約
- [SSOT_API_REGISTRY.md](./docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md) - API一覧
- [AI_ESCALATION_PROTOCOL.md](./docs/standards/AI_ESCALATION_PROTOCOL.md) - AI中断プロトコル
- [auto-dev README](./scripts/auto-dev/README.md) - 自動開発システム
- [Knowledge Base](./docs/knowledge/_INDEX.md) - ナレッジベース
