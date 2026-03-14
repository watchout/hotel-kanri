# hotel-kanri Project Guide for Claude Code

## プロジェクト概要

hotel-kanriは、マルチテナントSaaS型ホテル管理システムの管理リポジトリです。

### システム構成

| システム | ポート | 役割 |
|:---------|:-------|:-----|
| hotel-saas-rebuild | 3101 | フロントエンド + APIプロキシ |
| hotel-common-rebuild | 3401 | API基盤 + DB層 |
| PostgreSQL | 5432 | データベース |
| Redis | 6379 | セッション |

### 技術スタック

- **Frontend**: Vue 3 + Nuxt 3 + Vuetify 3
- **Backend**: Express + TypeScript + Prisma
- **DB**: PostgreSQL
- **Auth**: Session認証（Redis + HttpOnly Cookie）

---

## 🚨 CRITICAL DOCUMENTATION MAP

**以下のドキュメントを必ず参照してからコードを変更してください：**

### 認証・セキュリティ
- `/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md`
- `/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md`

### データベース
- `/docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md`
- `/docs/standards/DATABASE_NAMING_STANDARD.md`

### API設計
- `/docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md`
- `/docs/01_systems/saas/API_ROUTING_GUIDELINES.md`

### 品質基準
- `/docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md`

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

## 📋 コマンド

### ビルド・テスト
```bash
# hotel-common
cd /Users/kaneko/hotel-common-rebuild
npm run build
npm run test:unit

# hotel-saas
cd /Users/kaneko/hotel-saas-rebuild
npm run build

# 統合テスト
cd /Users/kaneko/hotel-kanri/scripts
./test-standard-admin.sh  # 管理画面
./test-standard-guest.sh  # ゲスト画面
```

### 開発サーバー
```bash
# hotel-common
cd /Users/kaneko/hotel-common-rebuild
npm run dev

# hotel-saas
cd /Users/kaneko/hotel-saas-rebuild
npm run dev
```

---

## 📁 ディレクトリ構造

```
hotel-kanri/                    # 管理リポジトリ
├── docs/03_ssot/               # SSOT（仕様書）
├── scripts/                    # ユーティリティ
├── .claude/                    # Claude Code設定
│   ├── agents/                 # エージェント
│   ├── skills/                 # スキル
│   ├── commands/               # コマンド
│   ├── rules/                  # ルール
│   ├── hooks/                  # フック
│   └── memory/                 # 長期記憶
└── .cursorrules                # Cursor用ルール

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

## 📖 詳細ドキュメント

詳細な設定は `.claude/README.md` を参照してください。
