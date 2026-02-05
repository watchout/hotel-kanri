# CLAUDE.md - Hotel SaaS Project Framework Entry Point

**バージョン**: 2.0.0
**最終更新**: 2026-02-05
**管理者**: hotel-kanri (司令塔リポジトリ)

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

## Related Links

- [DECISION_BACKLOG.md](./docs/03_ssot/DECISION_BACKLOG.md) - 未決定事項
- [CROSS_CUTTING_API_CONTRACT.md](./docs/03_ssot/CROSS_CUTTING_API_CONTRACT.md) - API契約
- [SSOT_API_REGISTRY.md](./docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md) - API一覧
