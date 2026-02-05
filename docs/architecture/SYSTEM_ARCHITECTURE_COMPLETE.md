# 🏨 ホテル管理システム - 完全アーキテクチャ図

**作成日**: 2026-02-03  
**バージョン**: 1.0.0  
**目的**: 将来MAX拡張を想定した全システム構成の完全ドキュメント

---

## 📋 目次

1. [システム概要](#システム概要)
2. [リポジトリ一覧](#リポジトリ一覧)
3. [アーキテクチャ図](#アーキテクチャ図)
4. [各システム詳細](#各システム詳細)
5. [システム間連携](#システム間連携)
6. [データフロー](#データフロー)
7. [認証・セッション](#認証セッション)
8. [データベース設計](#データベース設計)
9. [インフラ構成](#インフラ構成)
10. [開発フェーズ](#開発フェーズ)

---

## 📖 システム概要

### ビジョン

**グローバル展開を見据えたマルチテナントSaaS型ホテル管理プラットフォーム**

- 15言語対応
- 200+国の文化プロファイル
- 数千テナント規模でのスケーラビリティ

### アーキテクチャ方式

**マイクロサービス型（HTTP API連携）**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Frontend Layer                                     │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   hotel-saas    │   hotel-pms     │  hotel-member   │   hotel-kanri         │
│ (AIコンシェルジュ) │ (フロント業務)   │  (会員管理)     │  (ドキュメント管理)    │
│   Port: 3101    │   Port: 3201    │   Port: 3301    │   (実行コードなし)     │
└────────┬────────┴────────┬────────┴────────┬────────┴───────────────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │ HTTP API
                           ▼
         ┌─────────────────────────────────────┐
         │         hotel-common                │
         │        (API基盤・DB層)              │
         │          Port: 3401                 │
         └─────────────────┬───────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
   ┌───────────┐    ┌───────────┐    ┌───────────┐
   │ PostgreSQL│    │   Redis   │    │  Firebase │
   │ Port:5432 │    │ Port:6379 │    │   (Push)  │
   └───────────┘    └───────────┘    └───────────┘
```

---

## 📁 リポジトリ一覧

### 現在アクティブ（rebuild版）

| リポジトリ名 | 概要 | 技術スタック | ポート | 状態 |
|:-------------|:-----|:-------------|:-------|:-----|
| **hotel-common-rebuild** | API基盤・DB層・認証 | Express + TypeScript + Prisma | 3401 | ✅ アクティブ |
| **hotel-saas-rebuild** | 管理画面・ゲスト画面・AIコンシェルジュ | Nuxt 3 + Vue 3 + Vuetify 3 | 3101 | ✅ アクティブ |
| **hotel-kanri** | SSOT・ドキュメント・自動開発スクリプト | Node.js (スクリプトのみ) | - | ✅ アクティブ |

### 将来対応（Phase 4以降）

| リポジトリ名 | 概要 | 技術スタック | ポート | 状態 |
|:-------------|:-----|:-------------|:-------|:-----|
| **hotel-pms-rebuild** | フロント業務・予約管理・チェックイン | Express + TypeScript | 3201 | 🔄 計画中 |
| **hotel-member-rebuild** | 会員管理・CRM・ポイントシステム | FastAPI + Python | 3301 | 🔄 計画中 |

### レガシー（非推奨）

| リポジトリ名 | 状態 |
|:-------------|:-----|
| hotel-saas | ❌ 非推奨（rebuild版へ移行） |
| hotel-common | ❌ 非推奨（rebuild版へ移行） |
| hotel-pms | ❌ 非推奨（rebuild版へ移行） |
| hotel-member | ❌ 非推奨（rebuild版へ移行） |

---

## 🏗️ アーキテクチャ図

### 全体構成（MAX拡張版）

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Internet / CDN                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Load Balancer / Nginx                                   │
│                         (SSL終端・リバースプロキシ)                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
         │                    │                    │                    │
         ▼                    ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  hotel-saas     │  │  hotel-pms      │  │  hotel-member   │  │  Static Assets  │
│  (Nuxt 3 SSR)   │  │  (Express)      │  │  (FastAPI)      │  │  (S3/CloudFront)│
│                 │  │                 │  │                 │  │                 │
│  ポート: 3101   │  │  ポート: 3201   │  │  ポート: 3301   │  │                 │
│                 │  │                 │  │                 │  │                 │
│  【機能】       │  │  【機能】       │  │  【機能】       │  │  【コンテンツ】  │
│  ・管理画面     │  │  ・予約管理     │  │  ・会員管理     │  │  ・画像         │
│  ・ゲスト画面   │  │  ・チェックイン │  │  ・CRM          │  │  ・CSS/JS       │
│  ・AIチャット   │  │  ・ハウスキーピング│ │  ・ポイント管理 │  │  ・メディア     │
│  ・注文管理     │  │  ・請求処理     │  │  ・マーケティング│ │                 │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘  └─────────────────┘
         │                    │                    │
         │      HTTP API      │      HTTP API      │
         └────────────────────┼────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           hotel-common (API基盤)                                     │
│                              ポート: 3401                                            │
│                                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   認証・認可    │  │  ビジネスロジック │  │   データアクセス │  │   共通サービス  │ │
│  │                 │  │                 │  │                 │  │                 │ │
│  │  ・Session認証  │  │  ・テナント管理 │  │  ・Prisma ORM   │  │  ・通知         │ │
│  │  ・権限チェック │  │  ・メニュー管理 │  │  ・トランザクション│ │  ・ファイル     │ │
│  │  ・テナント解決 │  │  ・注文管理     │  │  ・RLS          │  │  ・ログ         │ │
│  │  ・デバイス認証 │  │  ・客室管理     │  │                 │  │  ・監視         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │     Redis       │  │    Firebase     │
│                 │  │                 │  │                 │
│  ポート: 5432   │  │  ポート: 6379   │  │  (Cloud)        │
│                 │  │                 │  │                 │
│  【役割】       │  │  【役割】       │  │  【役割】       │
│  ・統一DB       │  │  ・セッション   │  │  ・Push通知     │
│  ・RLS対応      │  │  ・キャッシュ   │  │  ・リアルタイム │
│  ・マルチテナント│ │  ・Rate Limit   │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 📚 各システム詳細

### 1. hotel-common-rebuild

| 項目 | 内容 |
|:-----|:-----|
| **リポジトリ** | `github.com/watchout/hotel-common-rebuild` |
| **役割** | API基盤・データベース層・認証・共通サービス |
| **技術スタック** | Express 4.x + TypeScript 5.x + Prisma 5.x |
| **ポート** | 3401 |
| **担当AI** | Iza（伊邪那岐）- 創造神・基盤構築 |

#### ディレクトリ構造

```
hotel-common-rebuild/
├── src/
│   ├── server/
│   │   └── index.ts           # Expressサーバーエントリ
│   ├── routes/
│   │   ├── auth.routes.ts     # 認証API
│   │   ├── tenants.routes.ts  # テナント管理API
│   │   ├── menu.routes.ts     # メニュー管理API
│   │   ├── room-grades.routes.ts
│   │   ├── switch-tenant.routes.ts
│   │   ├── device-status.routes.ts
│   │   ├── guest-menus.routes.ts
│   │   ├── guest-categories.routes.ts
│   │   └── guest/
│   │       └── orders.routes.ts
│   ├── middlewares/
│   │   └── auth.middleware.ts # 認証ミドルウェア
│   ├── services/
│   │   └── faq.service.ts     # FAQサービス
│   ├── utils/
│   │   ├── response-helpers.ts
│   │   └── session-helpers.ts
│   ├── lib/
│   │   ├── prisma.ts          # Prismaクライアント
│   │   └── redis.ts           # Redisクライアント
│   └── types/
│       └── express.d.ts
├── prisma/
│   ├── schema.prisma          # DBスキーマ
│   └── seed.ts                # シードデータ
└── package.json
```

#### 主要API一覧

| エンドポイント | メソッド | 認証 | 説明 |
|:---------------|:---------|:-----|:-----|
| `/health` | GET | 不要 | ヘルスチェック |
| `/api/v1/admin/auth/login` | POST | 不要 | ログイン |
| `/api/v1/admin/auth/logout` | POST | 不要 | ログアウト |
| `/api/v1/admin/tenants` | GET/POST | 必須 | テナント管理 |
| `/api/v1/admin/switch-tenant` | POST | 必須 | テナント切替 |
| `/api/v1/admin/menus` | CRUD | 必須 | メニュー管理 |
| `/api/v1/admin/room-grades` | CRUD | 必須 | 客室グレード管理 |
| `/api/v1/guest/menus` | GET | デバイス認証 | ゲストメニュー取得 |
| `/api/v1/guest/orders` | CRUD | デバイス認証 | ゲスト注文管理 |

---

### 2. hotel-saas-rebuild

| 項目 | 内容 |
|:-----|:-----|
| **リポジトリ** | `github.com/watchout/hotel-saas-rebuild` |
| **役割** | 管理画面・ゲスト画面・AIコンシェルジュ・APIプロキシ |
| **技術スタック** | Nuxt 3 + Vue 3 + Vuetify 3 + TypeScript |
| **ポート** | 3101 |
| **担当AI** | Sun（天照）- 明るく温かい・顧客体験向上 |

#### ディレクトリ構造

```
hotel-saas-rebuild/
├── pages/
│   ├── admin/
│   │   ├── index.vue          # 管理ダッシュボード
│   │   ├── login.vue          # ログイン画面
│   │   ├── menus/             # メニュー管理
│   │   ├── orders/            # 注文管理
│   │   └── settings/          # 設定
│   ├── menu.vue               # ゲストメニュー画面
│   ├── order/
│   │   └── history.vue        # 注文履歴
│   └── info/
│       ├── wifi.vue           # Wi-Fi情報
│       └── luggage.vue        # 荷物預かり
├── components/
│   ├── admin/                 # 管理画面コンポーネント
│   ├── guest/                 # ゲスト画面コンポーネント
│   └── common/                # 共通コンポーネント
├── composables/
│   └── useAuth.ts             # 認証Composable
├── server/
│   ├── api/
│   │   └── v1/
│   │       ├── admin/         # 管理APIプロキシ
│   │       │   ├── auth/
│   │       │   ├── tenants/
│   │       │   └── menus/
│   │       └── guest/         # ゲストAPIプロキシ
│   │           ├── menus/
│   │           └── orders/
│   ├── middleware/
│   │   └── auth.ts
│   └── utils/
│       └── api-client.ts      # callHotelCommonAPI()
├── middleware/
│   └── auth.global.ts         # 認証ミドルウェア
└── package.json
```

#### 画面一覧

| パス | 認証 | 説明 |
|:-----|:-----|:-----|
| `/admin/login` | 不要 | ログイン画面 |
| `/admin` | Session認証 | 管理ダッシュボード |
| `/admin/menus` | Session認証 | メニュー管理 |
| `/admin/orders` | Session認証 | 注文管理 |
| `/menu` | デバイス認証 | ゲストメニュー |
| `/order/history` | デバイス認証 | 注文履歴 |
| `/info/wifi` | デバイス認証 | Wi-Fi情報 |

---

### 3. hotel-kanri

| 項目 | 内容 |
|:-----|:-----|
| **リポジトリ** | `github.com/watchout/hotel-kanri` |
| **役割** | SSOT・ドキュメント管理・自動開発スクリプト・品質管理 |
| **技術スタック** | Node.js (スクリプトのみ) |
| **ポート** | - (実行コードなし) |
| **担当AI** | Luna（月読）- 管理・品質保証 |

#### ディレクトリ構造

```
hotel-kanri/
├── docs/
│   ├── 03_ssot/               # SSOT（仕様書）
│   │   ├── 00_foundation/     # 基盤SSOT
│   │   ├── 01_admin_features/ # 管理機能SSOT
│   │   ├── 02_guest_features/ # ゲスト機能SSOT
│   │   └── openapi/           # OpenAPI定義
│   ├── architecture/          # アーキテクチャドキュメント
│   ├── standards/             # コーディング規約
│   └── adr/                   # Architecture Decision Records
├── scripts/
│   ├── auto-dev/              # 自動開発スクリプト
│   │   ├── run-task-v3.cjs    # タスク実行オーケストレータ
│   │   ├── run-loop-v3.cjs    # 連続実行ループ
│   │   └── notify-discord.cjs # Discord通知
│   ├── plane/                 # Plane API連携
│   │   └── lib/
│   │       └── plane-api-client.cjs
│   ├── quality/               # 品質チェック
│   └── quality-checklists/    # 監査チェックリスト
├── evidence/                  # 実行ログ・証跡
├── .cursorrules               # Cursor AI設定
├── .claude/                   # Claude Code設定
└── CLAUDE.md                  # Claude Code ガイド
```

---

### 4. hotel-pms-rebuild（将来）

| 項目 | 内容 |
|:-----|:-----|
| **リポジトリ** | `github.com/watchout/hotel-pms-rebuild` |
| **役割** | フロント業務・予約管理・チェックイン・ハウスキーピング |
| **技術スタック** | Express + TypeScript |
| **ポート** | 3201 |
| **担当AI** | Luna（月読）- 冷静沈着・24時間運用 |
| **状態** | 🔄 Phase 4で開発予定 |

#### 主要機能（予定）

- 予約管理（CRUD・検索・カレンダー表示）
- チェックイン/チェックアウト
- 客室割り当て・変更
- ハウスキーピング管理
- 請求処理・会計連携
- オフライン対応（ローカルキャッシュ）

---

### 5. hotel-member-rebuild（将来）

| 項目 | 内容 |
|:-----|:-----|
| **リポジトリ** | `github.com/watchout/hotel-member-rebuild` |
| **役割** | 会員管理・CRM・ポイントシステム・マーケティング |
| **技術スタック** | FastAPI + Python |
| **ポート** | 3301 |
| **担当AI** | Suno（須佐之男）- 顧客守護・プライバシー保護 |
| **状態** | 🔄 Phase 4で開発予定 |

#### 主要機能（予定）

- 会員マスタ管理
- 会員ランク・ステータス管理
- ポイントシステム
- マーケティングキャンペーン
- プライバシー・同意管理
- GDPR対応

---

## 🔗 システム間連携

### 連携方式

| 連携元 | 連携先 | 方式 | 詳細 |
|:-------|:-------|:-----|:-----|
| hotel-saas | hotel-common | HTTP API | `callHotelCommonAPI()` |
| hotel-pms | hotel-common | HTTP API | （将来） |
| hotel-member | hotel-common | HTTP API | （将来） |
| hotel-common | PostgreSQL | Prisma ORM | 直接接続 |
| hotel-common | Redis | ioredis | セッション管理 |
| hotel-common | Firebase | firebase-admin | Push通知 |

### API呼び出しフロー

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  hotel-saas     │     │  hotel-common   │     │   PostgreSQL    │
│  (Nuxt SSR)     │     │  (Express)      │     │                 │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. HTTP Request      │                       │
         │  (with Cookie)        │                       │
         ├──────────────────────>│                       │
         │                       │                       │
         │                       │  2. Session Check     │
         │                       ├──────────────────────>│ Redis
         │                       │<──────────────────────┤
         │                       │                       │
         │                       │  3. DB Query          │
         │                       │  (tenant_id filter)   │
         │                       ├──────────────────────>│
         │                       │                       │
         │                       │  4. Response          │
         │                       │<──────────────────────┤
         │                       │                       │
         │  5. HTTP Response     │                       │
         │<──────────────────────┤                       │
         │                       │                       │
```

### Cookie転送（重要）

**hotel-saas → hotel-common** の通信では、Cookie転送が必須です。

```typescript
// hotel-saas/server/utils/api-client.ts
export async function callHotelCommonAPI(
  event: H3Event,
  path: string,
  options: FetchOptions = {}
) {
  const cookie = getHeader(event, 'cookie') || '';
  const baseUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3401';
  
  return $fetch(path, {
    baseURL: baseUrl,
    ...options,
    headers: {
      ...options.headers,
      Cookie: cookie,  // ← Cookie転送必須
    },
  });
}
```

---

## 📊 データフロー

### 認証フロー（管理画面）

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│  User   │     │ hotel-saas  │     │hotel-common │     │  Redis  │
└────┬────┘     └──────┬──────┘     └──────┬──────┘     └────┬────┘
     │                 │                   │                 │
     │ 1. Login Form   │                   │                 │
     ├────────────────>│                   │                 │
     │                 │                   │                 │
     │                 │ 2. POST /login    │                 │
     │                 ├──────────────────>│                 │
     │                 │                   │                 │
     │                 │                   │ 3. Create Session
     │                 │                   ├────────────────>│
     │                 │                   │                 │
     │                 │                   │ 4. Session ID   │
     │                 │                   │<────────────────┤
     │                 │                   │                 │
     │                 │ 5. Set-Cookie     │                 │
     │                 │<──────────────────┤                 │
     │                 │                   │                 │
     │ 6. Cookie Set   │                   │                 │
     │<────────────────┤                   │                 │
     │                 │                   │                 │
```

### デバイス認証フロー（ゲスト画面）

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│ Device  │     │ hotel-saas  │     │hotel-common │     │PostgreSQL│
└────┬────┘     └──────┬──────┘     └──────┬──────┘     └────┬─────┘
     │                 │                   │                 │
     │ 1. Access /menu │                   │                 │
     │ (MAC/IP)        │                   │                 │
     ├────────────────>│                   │                 │
     │                 │                   │                 │
     │                 │ 2. Device Auth    │                 │
     │                 ├──────────────────>│                 │
     │                 │                   │                 │
     │                 │                   │ 3. Check device_rooms
     │                 │                   ├────────────────>│
     │                 │                   │                 │
     │                 │                   │ 4. tenant_id    │
     │                 │                   │<────────────────┤
     │                 │                   │                 │
     │                 │ 5. Auth Result    │                 │
     │                 │<──────────────────┤                 │
     │                 │                   │                 │
     │ 6. Menu Page    │                   │                 │
     │<────────────────┤                   │                 │
     │                 │                   │                 │
```

---

## 🔐 認証・セッション

### 認証方式一覧

| 対象 | 方式 | 詳細 |
|:-----|:-----|:-----|
| 管理画面スタッフ | Session認証 | Redis + HttpOnly Cookie |
| ゲスト画面 | デバイス認証 | MAC/IP → device_rooms テーブル |
| API間通信 | Cookie転送 | 内部通信のためAPIキー不要 |

### Session認証詳細

```typescript
// Cookie設定
res.cookie('hotel_session', sessionId, {
  httpOnly: true,       // XSS対策
  secure: false,        // 開発環境（本番はtrue）
  sameSite: 'lax',      // CSRF対策
  path: '/',
  maxAge: 8 * 60 * 60 * 1000  // 8時間
});

// Redisセッションデータ
{
  "userId": "admin-xxx",
  "tenantId": "tenant-xxx",
  "email": "owner@test.omotenasuai.com",
  "permissions": ["admin", "owner"],
  "createdAt": "2026-01-27T10:00:00Z"
}
```

### テスト用アカウント

| 項目 | 値 |
|:-----|:---|
| Email | `owner@test.omotenasuai.com` |
| Password | `owner123` |
| Tenant ID | `tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7` |

---

## 🗄️ データベース設計

### 統一データベース

```
PostgreSQL (hotel_common)
├── テナント管理
│   ├── tenants              # テナント情報
│   └── tenant_settings      # テナント設定
├── 認証・ユーザー
│   ├── admins               # 管理者
│   ├── staffs               # スタッフ
│   └── device_rooms         # デバイス認証
├── 客室管理
│   ├── room_grades          # 客室グレード
│   ├── rooms                # 客室
│   └── room_devices         # デバイス
├── メニュー管理
│   ├── menu_categories      # カテゴリ
│   ├── menu_items           # メニュー項目
│   └── menu_item_room_grades # グレード別価格
├── 注文管理
│   ├── orders               # 注文
│   └── order_items          # 注文明細
└── 設定・マスタ
    ├── ai_settings          # AI設定
    └── operational_logs     # 操作ログ
```

### マルチテナント設計

```sql
-- すべてのテーブルに tenant_id カラム
CREATE TABLE menu_items (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2),
  ...
);

-- 全クエリに tenant_id フィルタ必須
SELECT * FROM menu_items 
WHERE tenant_id = $1  -- ← 必須
AND is_deleted = false;
```

### 命名規則

| 対象 | 規則 | 例 |
|:-----|:-----|:---|
| テーブル名 | snake_case（複数形） | `menu_items` |
| カラム名 | snake_case | `tenant_id` |
| Prismaモデル | PascalCase | `MenuItem` |
| Prismaフィールド | camelCase + @map | `tenantId @map("tenant_id")` |

---

## 🖥️ インフラ構成

### 開発環境

| サービス | ホスト | ポート |
|:---------|:-------|:-------|
| hotel-saas-rebuild | localhost | 3101 |
| hotel-common-rebuild | localhost | 3401 |
| PostgreSQL | localhost | 5432 |
| Redis | localhost | 6379 |

### 本番環境（予定）

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloud Provider                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────┐                                           │
│   │   Route53   │  DNS                                      │
│   └──────┬──────┘                                           │
│          │                                                   │
│   ┌──────▼──────┐                                           │
│   │ CloudFront  │  CDN + SSL                                │
│   └──────┬──────┘                                           │
│          │                                                   │
│   ┌──────▼──────┐                                           │
│   │     ALB     │  Load Balancer                            │
│   └──────┬──────┘                                           │
│          │                                                   │
│   ┌──────┴───────────────────────┐                          │
│   │                              │                          │
│   ▼                              ▼                          │
│ ┌─────────────┐            ┌─────────────┐                  │
│ │   ECS       │            │   ECS       │                  │
│ │ hotel-saas  │            │hotel-common │                  │
│ └─────────────┘            └──────┬──────┘                  │
│                                   │                          │
│                    ┌──────────────┼──────────────┐          │
│                    │              │              │          │
│                    ▼              ▼              ▼          │
│              ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│              │   RDS   │   │ElastiCache│  │   S3   │        │
│              │PostgreSQL│   │  Redis  │   │ Static │        │
│              └─────────┘   └─────────┘   └─────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📅 開発フェーズ

### Phase 1: 基盤設計（✅ 完了）

- マルチテナントアーキテクチャ
- Session認証基盤
- データベーススキーマ

### Phase 2: 基盤機能（🔄 進行中）

- テナント管理API
- メニュー管理API
- 注文管理API
- ハンドオフ表示機能（DEV-0170）
- セッションリセット（DEV-0180）

### Phase 3: 運用機能

- 通知システム
- ログ・監視
- 分析ダッシュボード

### Phase 4: システム統合

- hotel-pms-rebuild 開発
- hotel-member-rebuild 開発
- イベント連携基盤

### Phase 5: グローバル展開

- 多言語対応
- 文化プロファイル
- 地域別規制対応

---

## 📝 補足情報

### 環境変数一覧

```bash
# hotel-common-rebuild
PORT=3401
DATABASE_URL=postgresql://user:pass@localhost:5432/hotel_common
REDIS_HOST=localhost
REDIS_PORT=6379

# hotel-saas-rebuild
PORT=3101
HOTEL_COMMON_API_URL=http://localhost:3401

# hotel-kanri (自動開発)
PLANE_API_HOST_URL=https://plane.example.com
PLANE_API_KEY=plane_xxx
PLANE_WORKSPACE_SLUG=co
PLANE_PROJECT_ID=xxx
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx
```

### Git ブランチ戦略

| ブランチ | 用途 |
|:---------|:-----|
| `main` | 本番リリース |
| `develop` | 開発統合 |
| `feature/dev-xxxx` | 機能開発 |
| `hotfix/xxx` | 緊急修正 |

---

**作成者**: 自動開発システム  
**最終更新**: 2026-02-03
