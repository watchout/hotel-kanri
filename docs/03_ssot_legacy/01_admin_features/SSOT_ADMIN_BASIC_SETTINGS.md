# SSOT: 基本設定システム（管理画面専用）

**作成日**: 2025-10-05  
**最終更新**: 2025-10-05  
**バージョン**: 1.2.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（Phase 1-2）

**関連SSOT**:
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤（Tenant設定）
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証
- [DATABASE_NAMING_STANDARD.md](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md) - DB命名規則

**関連実装**:
- `/Users/kaneko/hotel-saas/pages/admin/settings/basic.vue` - 基本設定UI
- `/Users/kaneko/hotel-saas/pages/admin/settings/hotelinfo.vue` - ホテル情報UI
- `/Users/kaneko/hotel-saas/pages/admin/settings/hotel-info.vue` - ホテル情報UI（レシート用）
- `/Users/kaneko/hotel-saas/pages/admin/settings/payment-methods.vue` - 支払い方法UI
- `/Users/kaneko/hotel-saas/pages/admin/settings/receipt-settings.vue` - 領収書設定UI

---

## 📋 目次

1. [概要](#概要)
2. [重要: このSSOTのスコープ](#重要-このssotのスコープ)
3. [スコープ](#スコープ)
4. [技術スタック](#技術スタック)
5. [データモデル](#データモデル)
6. [API仕様](#api仕様)
7. [設定項目詳細](#設定項目詳細)
8. [設定変更の影響範囲](#設定変更の影響範囲)
9. [UIパス一覧](#uiパス一覧)
10. [複数テナント所属時の動作](#複数テナント所属時の動作)
11. [トランザクション・整合性](#トランザクション整合性)
12. [UI仕様](#ui仕様)
13. [実装詳細](#実装詳細)
14. [既存実装状況](#既存実装状況)
15. [未実装機能](#未実装機能)

---

## 📖 概要

### 目的

ホテル運営の根幹となる基本設定を一元管理するシステムを提供する。ホテル情報、会計設定、支払い方法、表示制御など、システム全体に影響する設定を管理する。

### 基本方針

- **統一設定**: hotel-commonのTenantモデルで一元管理
- **hotel-saas**: APIプロキシ + 管理画面UI
- **JSON保存**: `Tenant.settings`フィールド（JSON型）に設定を保存
- **マルチテナント**: テナントごとに完全分離された設定
- **リアルタイム反映**: 設定変更の即時反映
- **バリデーション**: フロントエンド・バックエンド両方で厳格な検証

### アーキテクチャ概要

```
[管理画面]
  ↓ 設定管理操作
[hotel-saas API (Proxy)]
  ↓ GET/PUT /api/v1/admin/settings/*
[hotel-common API (Core)]
  ↓ Prisma ORM
[PostgreSQL (統一DB)]
  └─ tenants テーブル (settings: JSON)
```

---

## ⚠️ 重要: このSSOTのスコープ

### ✅ このSSOTが扱う範囲

- **管理画面での基本設定管理**
  - ホテル情報設定（名称、住所、連絡先など）
  - 会計設定（税率、端数処理、表示制御）
  - 支払い方法設定（有効/無効、表示順序）
  - 表示制御設定（フロント画面の表示オプション）
  - 領収書設定（テンプレート、表示項目）

### ❌ このSSOTが扱わない範囲

- **客室端末側の設定表示**: [SSOT_GUEST_DEVICE_APP.md](../02_guest_features/SSOT_GUEST_DEVICE_APP.md) を参照
- **AIコンシェルジュ設定**: [SSOT_ADMIN_AI_CONCIERGE.md](./SSOT_ADMIN_AI_CONCIERGE.md) を参照
- **客室管理**: [SSOT_SAAS_ROOM_MANAGEMENT.md](./SSOT_SAAS_ROOM_MANAGEMENT.md) を参照
- **メニュー管理**: [SSOT_SAAS_MENU_MANAGEMENT.md](./SSOT_SAAS_MENU_MANAGEMENT.md) を参照

---

## 🎯 スコープ

### 対象システム

- ✅ **hotel-common**: コア実装（設定CRUD、ビジネスロジック）
- ✅ **hotel-saas**: プロキシAPI + 管理画面UI
- ❌ **hotel-pms**: 対象外（将来的に設定参照の可能性あり）
- ❌ **hotel-member**: 対象外

**注**: 客室端末での設定参照については [SSOT_GUEST_DEVICE_APP.md](../02_guest_features/SSOT_GUEST_DEVICE_APP.md) を参照

### 機能範囲

#### ✅ 実装済み

##### 1. ホテル情報設定（部分実装）
- ✅ UI実装済み（`hotelinfo.vue`, `hotel-info.vue`）
- 🟡 API未実装（hotel-common）

##### 2. 会計設定（部分実装）
- ✅ UI実装済み（`basic.vue`）
  - 税込/税抜価格表示切り替え
  - 税額計算方法（四捨五入/切り捨て/切り上げ）
  - 階数表示順序設定
  - 客室横並び表示数設定
- 🟡 API部分実装（`/api/v1/admin/settings`）

##### 3. 支払い方法設定（実装済み）
- ✅ UI実装済み（`payment-methods.vue`）
- ✅ API実装済み（`/api/v1/admin/settings/payment-methods`）
- ✅ ドラッグ&ドロップ並び替え
- ✅ 有効/無効切り替え

##### 4. 領収書設定（部分実装）
- ✅ UI実装済み（`receipt-settings.vue`）
- 🟡 API未実装（hotel-common）

#### ❌ 未実装

- 表示制御設定（機能ON/OFF、メンテナンスモード）
- 営業時間設定
- チェックイン/アウト時刻設定（UI実装済み、API未実装）
- ロゴ・画像管理（UI実装済み、アップロード未実装）
- 設定変更履歴・監査ログ
- 設定インポート/エクスポート機能

---

## 🛠️ 技術スタック

### バックエンド（hotel-common）

- **Framework**: Express.js + TypeScript
- **ORM**: Prisma
- **データベース**: PostgreSQL（統一DB）
- **認証**: Session-based（Redis）
- **バリデーション**: Zod（型安全なバリデーション）

### フロントエンド（hotel-saas）

- **Framework**: Nuxt 3 + Vue 3 + TypeScript
- **状態管理**: Composables
- **認証**: `01.admin-auth.ts` middleware
- **API通信**: `$fetch` (Nuxt標準)
- **UI**: Tailwind CSS
- **ドラッグ&ドロップ**: Sortable.js（支払い方法並び替え）

### データベース

- **テーブル**: `tenants`
- **主要カラム**: `settings` (JSON型)
- **命名規則**: snake_case (DB層)
- **API/JSON**: camelCase

---

## 📊 データモデル

### Tenantモデル（既存）

```prisma
model Tenant {
  id           String    @id
  name         String    // ホテル名
  domain       String?   @unique
  planType     String?
  status       String    @default("active")
  contactEmail String?
  createdAt    DateTime  @default(now())
  deleted_at   DateTime?
  deleted_by   String?
  features     String[]
  is_deleted   Boolean   @default(false)
  settings     Json?     // ← 基本設定を保存
  
  // リレーション...
  
  @@index([is_deleted])
}
```

### Tenant.settings フィールド構造（JSON）

```typescript
interface TenantSettings {
  // ========================================
  // 1. ホテル基本情報
  // ========================================
  hotelInfo: {
    // 基本情報
    name: string;              // ホテル名（日本語）
    nameEn?: string;           // ホテル名（英語）
    category: 'hotel' | 'ryokan' | 'pension' | 'minshuku' | 'resort' | 'business' | 'capsule' | 'other';
    totalRooms: number;        // 客室数
    establishedYear?: string;  // 開業年
    license?: string;          // 旅館業許可番号
    
    // 住所情報
    postalCode: string;        // 郵便番号（例: 123-4567）
    prefecture: string;        // 都道府県
    city: string;              // 市区町村
    address: string;           // 住所
    addressEn?: string;        // 住所（英語）
    
    // 連絡先情報
    phone: string;             // 電話番号
    fax?: string;              // FAX番号
    email: string;             // メールアドレス
    website?: string;          // ウェブサイトURL
    
    // チェックイン/アウト
    checkinTime: string;       // チェックイン時刻（HH:MM形式）
    checkoutTime: string;      // チェックアウト時刻（HH:MM形式）
    
    // 説明
    description?: string;      // ホテル説明（日本語）
    descriptionEn?: string;    // ホテル説明（英語）
    facilities?: string;       // 施設・設備（カンマ区切り）
    
    // 画像
    logo?: string;             // ロゴURL
  };
  
  // ========================================
  // 2. 会計設定
  // ========================================
  accounting: {
    // 価格表示
    priceDisplayType: 'tax-included' | 'tax-excluded';  // 税込/税抜表示
    
    // 税額計算
    taxCalculationMethod: 'round' | 'floor' | 'ceil';   // 端数処理方法
    
    // フロント管理
    floorDisplayOrder: 'asc' | 'desc';                  // 階数表示順序
    roomsPerRow: number;                                // 客室横並び表示数（1-10）
  };
  
  // ========================================
  // 3. 支払い方法
  // ========================================
  paymentMethods: Array<{
    key: string;           // 一意なキー（例: 'cash', 'card', 'mobile_pay'）
    label: string;         // 表示名（例: '現金', 'クレジットカード'）
    enabled: boolean;      // 有効/無効
    order: number;         // 表示順序
    isDefault?: boolean;   // デフォルト方法（削除不可）
  }>;
  
  // ========================================
  // 4. 領収書設定
  // ========================================
  receipt: {
    // 店舗情報
    storeId: string;                // 店舗ID（伝票番号用）
    
    // 項目設定
    itemName: string;               // 項目名（例: '宿泊代'）
    itemDescription: string;        // 但し書き（例: 'ホテル宿泊料金として'）
    
    // 金額表示
    subtotalLabel: string;          // 小計ラベル（例: '小計'）
    taxLabel: string;               // 税金ラベル（例: '消費税'）
    totalLabel: string;             // 合計ラベル（例: '合計金額'）
    
    // 注意事項
    noteTemplate: string;           // 注意事項テンプレート
    
    // インボイス情報
    invoiceNumber?: string;         // 適格請求書発行事業者登録番号（T + 13桁）
  };
  
  // ========================================
  // 5. 表示制御（将来実装）
  // ========================================
  display?: {
    maintenanceMode: boolean;      // メンテナンスモード
    enabledFeatures: string[];     // 有効化機能リスト
    disabledMenus: string[];       // 非表示メニューリスト
  };
}
```

### デフォルト値

```typescript
const DEFAULT_SETTINGS: TenantSettings = {
  hotelInfo: {
    name: '',
    category: 'hotel',
    totalRooms: 0,
    postalCode: '',
    prefecture: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    checkinTime: '15:00',
    checkoutTime: '10:00',
  },
  accounting: {
    priceDisplayType: 'tax-included',
    taxCalculationMethod: 'round',
    floorDisplayOrder: 'asc',
    roomsPerRow: 3,
  },
  paymentMethods: [
    { key: 'cash', label: '現金', enabled: true, order: 1, isDefault: true },
    { key: 'card', label: 'クレジットカード', enabled: true, order: 2, isDefault: true },
    { key: 'other', label: 'その他', enabled: true, order: 3, isDefault: true },
  ],
  receipt: {
    storeId: 'ABC',
    itemName: '宿泊代',
    itemDescription: 'ホテル宿泊料金として',
    subtotalLabel: '小計',
    taxLabel: '消費税',
    totalLabel: '合計金額',
    noteTemplate: '※この領収書は、上記金額を確かに領収したことを証明するものです。\n※再発行はいたしかねますので、大切に保管してください。\n※領収書に関するお問い合わせは、上記連絡先までお願いいたします。',
  },
};
```

---

## 🔌 API仕様

### 命名規則統一

**重要**: [DATABASE_NAMING_STANDARD.md](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md) v3.0.0 に準拠

- **データベース**: `snake_case` (例: `tenant_id`, `created_at`)
- **API/JSON**: `camelCase` (例: `tenantId`, `createdAt`)
- **変数名**: `camelCase` (JavaScript/TypeScript標準)

**自動変換**: Prismaの`@map`ディレクティブでDB↔API間の自動変換

### 認証

**全APIエンドポイントで管理者Session認証必須**

- **認証方式**: Session認証（Redis + HttpOnly Cookie）
- **ミドルウェア**: `requireAdmin()` による自動認証チェック
- **未認証時**: 401 Unauthorized

詳細: [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md)

### hotel-common API（コア実装）

#### 1. GET /api/v1/admin/settings

**概要**: 全設定を取得

**認証**: 必須（管理者Session）

**リクエスト**:
```http
GET /api/v1/admin/settings
Cookie: session_id=xxx
```

**レスポンス**:
```typescript
{
  success: boolean;
  settings: TenantSettings | null;  // 未設定の場合はデフォルト値を返す
}
```

**エラー**:
- `401`: 未認証
- `403`: 権限不足
- `500`: サーバーエラー

---

#### 2. PUT /api/v1/admin/settings

**概要**: 全設定を更新（部分更新対応）

**認証**: 必須（管理者Session）

**リクエスト**:
```http
PUT /api/v1/admin/settings
Content-Type: application/json
Cookie: session_id=xxx

{
  "hotelInfo": {
    "name": "サンプルホテル",
    "phone": "03-1234-5678"
    // ... 他の項目
  },
  "accounting": {
    "priceDisplayType": "tax-included",
    "taxCalculationMethod": "round"
  }
  // ... 他のセクション
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  settings: TenantSettings;  // 更新後の全設定
}
```

**バリデーション**:
- `hotelInfo.phone`: 電話番号形式チェック
- `hotelInfo.postalCode`: 郵便番号形式（XXX-XXXX）
- `hotelInfo.email`: メールアドレス形式
- `hotelInfo.website`: URL形式
- `accounting.roomsPerRow`: 1-10の範囲
- `receipt.invoiceNumber`: `T[0-9]{13}` パターン

**エラー**:
- `400`: バリデーションエラー
- `401`: 未認証
- `403`: 権限不足
- `500`: サーバーエラー

---

#### 3. GET /api/v1/admin/settings/hotel-info

**概要**: ホテル情報のみ取得

**認証**: 必須（管理者Session）

**リクエスト**:
```http
GET /api/v1/admin/settings/hotel-info
Cookie: session_id=xxx
```

**レスポンス**:
```typescript
{
  success: boolean;
  data: TenantSettings['hotelInfo'];
}
```

---

#### 4. POST /api/v1/admin/settings/hotel-info

**概要**: ホテル情報のみ更新

**認証**: 必須（管理者Session）

**リクエスト**:
```http
POST /api/v1/admin/settings/hotel-info
Content-Type: application/json
Cookie: session_id=xxx

{
  "name": "サンプルホテル",
  "phone": "03-1234-5678",
  "email": "info@hotel.com",
  // ... 他の項目
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  message: string;
  data: TenantSettings['hotelInfo'];
}
```

---

#### 5. GET /api/v1/admin/settings/payment-methods

**概要**: 支払い方法一覧を取得

**認証**: 必須（管理者Session）

**レスポンス**:
```typescript
{
  success: boolean;
  data: TenantSettings['paymentMethods'];
}
```

---

#### 6. POST /api/v1/admin/settings/payment-methods

**概要**: 支払い方法を更新（並び順・有効/無効・追加・削除）

**認証**: 必須（管理者Session）

**リクエスト**:
```typescript
{
  methods: Array<{
    key: string;
    label: string;
    enabled: boolean;
    order: number;
  }>;
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  data: TenantSettings['paymentMethods'];
}
```

**制約**:
- デフォルト方法（`cash`, `card`, `other`）は削除不可
- `key`は重複不可

---

#### 7. GET /api/v1/admin/settings/receipt-settings

**概要**: 領収書設定を取得

**認証**: 必須（管理者Session）

**レスポンス**:
```typescript
{
  success: boolean;
  data: TenantSettings['receipt'];
}
```

---

#### 8. POST /api/v1/admin/settings/receipt-settings

**概要**: 領収書設定を更新

**認証**: 必須（管理者Session）

**リクエスト**:
```typescript
{
  storeId: string;
  itemName: string;
  itemDescription: string;
  subtotalLabel: string;
  taxLabel: string;
  totalLabel: string;
  noteTemplate: string;
  invoiceNumber?: string;  // T + 13桁
}
```

**レスポンス**:
```typescript
{
  success: boolean;
  message: string;
}
```

---

### hotel-saas API（プロキシ）

hotel-saasは全てのAPIをhotel-commonにプロキシします。

#### プロキシパス一覧

| hotel-saas Path | hotel-common Path | 説明 |
|----------------|-------------------|------|
| `GET /api/v1/admin/settings` | `GET /api/v1/admin/settings` | 全設定取得 |
| `PUT /api/v1/admin/settings` | `PUT /api/v1/admin/settings` | 全設定更新 |
| `GET /api/v1/admin/settings/hotel-info` | `GET /api/v1/admin/settings/hotel-info` | ホテル情報取得 |
| `POST /api/v1/admin/settings/hotel-info` | `POST /api/v1/admin/settings/hotel-info` | ホテル情報更新 |
| `GET /api/v1/admin/settings/payment-methods` | `GET /api/v1/admin/settings/payment-methods` | 支払い方法取得 |
| `POST /api/v1/admin/settings/payment-methods` | `POST /api/v1/admin/settings/payment-methods` | 支払い方法更新 |
| `GET /api/v1/admin/settings/receipt-settings` | `GET /api/v1/admin/settings/receipt-settings` | 領収書設定取得 |
| `POST /api/v1/admin/settings/receipt-settings` | `POST /api/v1/admin/settings/receipt-settings` | 領収書設定更新 |

**注意**: hotel-saasはデータベースに直接アクセスせず、必ずhotel-common経由でアクセスする

---

## ⚙️ 設定項目詳細

### 1. ホテル情報設定

#### 基本情報
- **ホテル名**: 必須、システム全体で使用
- **ホテル名（英語）**: 任意、多言語対応時に使用
- **ホテル分類**: 必須、選択式（ホテル/旅館/ペンション/民宿/リゾート/ビジネス/カプセル/その他）
- **客室数**: 必須、数値
- **開業年**: 任意
- **旅館業許可番号**: 任意

#### 住所情報
- **郵便番号**: 必須、形式チェック（XXX-XXXX）
- **都道府県**: 必須
- **市区町村**: 必須
- **住所**: 必須
- **住所（英語）**: 任意

#### 連絡先情報
- **電話番号**: 必須、形式チェック
- **FAX番号**: 任意
- **メールアドレス**: 必須、形式チェック
- **ウェブサイト**: 任意、URL形式チェック

#### 営業情報
- **チェックイン時刻**: 必須、時刻形式（HH:MM）
- **チェックアウト時刻**: 必須、時刻形式（HH:MM）

#### 説明
- **ホテル説明**: 任意、テキストエリア
- **ホテル説明（英語）**: 任意、テキストエリア
- **施設・設備**: 任意、カンマ区切り文字列

#### 画像
- **ロゴ**: 任意、URL形式（将来的にアップロード機能実装予定）

---

### 2. 会計設定

#### 価格表示
- **価格表示方式**: 必須、選択式
  - `tax-included`: 税込価格表示
  - `tax-excluded`: 税抜価格表示
- **用途**: メニュー表示時の価格表示方法を決定

#### 税額計算
- **税額計算方法**: 必須、選択式
  - `round`: 四捨五入（例: 1004.5円 → 1005円）
  - `floor`: 切り捨て（例: 1004.9円 → 1004円）
  - `ceil`: 切り上げ（例: 1004.1円 → 1005円）
- **用途**: 消費税計算時の端数処理

#### フロント管理
- **階数表示順序**: 必須、選択式
  - `asc`: 昇順（1階 → 2階 → 3階）
  - `desc`: 降順（3階 → 2階 → 1階）
- **客室横並び表示数**: 必須、数値（1-10の範囲）
- **用途**: フロント運用モード画面の表示制御

---

### 3. 支払い方法設定

#### デフォルト支払い方法（削除不可）
- **現金** (`cash`): 有効/無効切り替え可能
- **クレジットカード** (`card`): 有効/無効切り替え可能
- **その他** (`other`): 有効/無効切り替え可能

#### カスタム支払い方法
- **追加可能**: 管理者が任意の支払い方法を追加可能
- **編集可能**: 表示名、有効/無効、表示順序
- **削除可能**: カスタム方法のみ削除可能（デフォルトは不可）

#### 並び替え機能
- **ドラッグ&ドロップ**: Sortable.jsによる直感的な並び替え
- **即座保存**: ドラッグ完了時に自動保存

---

### 4. 領収書設定

#### 店舗情報
- **店舗ID**: 必須、英数字のみ、最大10文字
- **用途**: 伝票番号生成（例: `ABC-20251005-001`）

#### 項目設定
- **項目名**: 必須（例: '宿泊代'）
- **但し書き**: 必須（例: 'ホテル宿泊料金として'）

#### 金額表示
- **小計ラベル**: 必須（例: '小計'）
- **税金ラベル**: 必須（例: '消費税'）
- **合計ラベル**: 必須（例: '合計金額'）

#### 注意事項
- **注意事項テンプレート**: 必須、複数行テキスト
- **プレビュー表示**: リアルタイムプレビュー機能

#### インボイス情報
- **適格請求書発行事業者登録番号**: 任意、`T + 13桁の数字` 形式
- **用途**: インボイス制度対応

---

## 🔄 設定変更の影響範囲

### 会計設定変更時の影響

| 設定項目 | 影響を受けるシステム・機能 | 重要度 |
|---------|------------------------|--------|
| `priceDisplayType` | ・メニュー表示価格（税込/税抜表記）<br>・注文確認画面<br>・領収書表示 | 🔴 高 |
| `taxCalculationMethod` | ・注文金額計算（端数処理）<br>・領収書金額<br>・会計処理 | 🔴 高 |
| `floorDisplayOrder` | ・フロント運用モード画面（階数並び順） | 🟡 中 |
| `roomsPerRow` | ・フロント運用モード画面（客室表示列数） | 🟡 中 |

**注意**: 会計設定変更は進行中の注文には影響せず、変更後の新規注文から適用されます。

---

### ホテル情報変更時の影響

| 設定項目 | 影響を受けるシステム・機能 | 重要度 |
|---------|------------------------|--------|
| `name` | ・領収書ヘッダー<br>・メール署名<br>・システム全体の表示<br>・予約確認メール | 🔴 高 |
| `phone` / `email` | ・領収書<br>・問い合わせ先表示<br>・フッター情報 | 🔴 高 |
| `address` | ・領収書<br>・予約確認メール<br>・サイト表示 | 🔴 高 |
| `checkinTime` / `checkoutTime` | ・予約システム（将来連携）<br>・フロント業務画面 | 🟡 中 |
| `invoiceNumber` | ・領収書（インボイス対応）<br>・適格請求書発行 | 🔴 高 |

**注意**: ホテル情報変更は即座に全画面に反映されます。

---

### 支払い方法変更時の影響

| 操作 | 影響を受けるシステム・機能 | 重要度 |
|-----|------------------------|--------|
| 支払い方法の無効化 | ・フロント会計画面の選択肢から非表示<br>・過去データは保持（履歴表示可能） | 🟡 中 |
| 支払い方法の追加 | ・フロント会計画面に新しい選択肢追加<br>・即座に利用可能 | 🟢 低 |
| 並び順変更 | ・フロント会計画面の表示順序のみ変更<br>・機能への影響なし | 🟢 低 |
| デフォルト方法の変更 | ・削除不可フラグのみ（機能への影響なし） | 🟢 低 |

**注意**: 支払い方法変更は即座に反映されますが、過去の注文・会計データには影響しません。

---

### 領収書設定変更時の影響

| 設定項目 | 影響を受けるシステム・機能 | 重要度 |
|---------|------------------------|--------|
| `storeId` | ・伝票番号生成（例: ABC-20251005-001）<br>・領収書ID | 🔴 高 |
| `itemName` / `itemDescription` | ・領収書本文表示 | 🟡 中 |
| ラベル類 | ・領収書表示のみ（計算には影響なし） | 🟢 低 |
| `noteTemplate` | ・領収書注意事項表示のみ | 🟢 低 |

**注意**: 領収書設定変更は即座に反映されますが、既に発行済みの領収書には影響しません。

---

## 🗺️ UIパス一覧

| 画面名 | パス | ファイル | 状態 | 備考 |
|-------|------|---------|------|------|
| 基本設定 | `/admin/settings/basic` | `pages/admin/settings/basic.vue` | ✅ 実装済み | 税金・フロント管理設定 |
| ホテル情報（詳細版） | `/admin/settings/hotelinfo` | `pages/admin/settings/hotelinfo.vue` | ✅ 実装済み | 全項目対応 |
| ホテル情報（レシート用） | `/admin/settings/hotel-info` | `pages/admin/settings/hotel-info.vue` | ✅ 実装済み | インボイス対応 |
| 支払い方法 | `/admin/settings/payment-methods` | `pages/admin/settings/payment-methods.vue` | ✅ 実装済み | ドラッグ&ドロップ |
| 領収書設定 | `/admin/settings/receipt-settings` | `pages/admin/settings/receipt-settings.vue` | ✅ 実装済み | プレビュー付き |

### ⚠️ 注意事項

- **ホテル情報画面が2つ存在**:
  - `hotelinfo.vue`: 全項目網羅（詳細版）
  - `hotel-info.vue`: レシート特化（インボイス対応）
  - **推奨**: 将来的に1つに統一することを推奨

### ナビゲーション構造

```
管理画面
└── システム設定
    └── 基本設定
        ├── 基本設定 (/admin/settings/basic)
        ├── ホテル情報 (/admin/settings/hotelinfo または /admin/settings/hotel-info)
        ├── 支払い方法 (/admin/settings/payment-methods)
        └── 領収書設定 (/admin/settings/receipt-settings)
```

---

## 🔄 複数テナント所属時の動作

**前提**: [SSOT_SAAS_ADMIN_AUTHENTICATION.md v1.3.0](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) により、スタッフは複数テナントに所属可能（2025-10-05更新）

### テナント切り替え時の設定

#### 基本動作

- **現在のテナント**: セッションに保存された`currentTenantId`を使用
- **設定の読み取り**: 現在選択中のテナントの`Tenant.settings`を取得
- **設定の更新**: 現在選択中のテナントの`Tenant.settings`のみを更新
- **権限チェック**: 設定変更は管理者権限が必要（テナントごとに権限確認）

#### テナント分離の保証

各テナントの設定は完全に独立しています：

```typescript
// テナントAの設定
{
  "tenantId": "tenant-a",
  "settings": {
    "hotelInfo": { "name": "ホテルA", ... },
    "accounting": { ... }
  }
}

// テナントBの設定（完全に独立）
{
  "tenantId": "tenant-b",
  "settings": {
    "hotelInfo": { "name": "ホテルB", ... },
    "accounting": { ... }
  }
}
```

---

### テナント切り替えAPI連携

テナント切り替え後、設定APIは自動的に新しいテナントの設定を返します：

```typescript
// 1. テナント切り替え
POST /api/v1/admin/switch-tenant
Body: { tenantId: 'tenant-b' }
Response: { success: true, currentTenant: 'tenant-b' }

// 2. 設定取得（新しいテナントの設定が返る）
GET /api/v1/admin/settings
→ テナントBの Tenant.settings を返す

// 3. 設定更新（新しいテナントの設定を更新）
PUT /api/v1/admin/settings
Body: { hotelInfo: { name: '新しいホテル名' } }
→ テナントBの Tenant.settings のみ更新
```

---

### 実装上の注意点

#### hotel-common側の実装

```typescript
// TenantSettingsService.ts

async getSettings(tenantId: string): Promise<TenantSettings> {
  // セッションからtenantIdを取得（必須）
  const tenant = await this.prisma.tenant.findUnique({
    where: { 
      id: tenantId,        // ← 明示的なテナントID指定
      is_deleted: false 
    },
    select: { settings: true },
  });
  
  // ...
}

async updateSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<TenantSettings> {
  // 必ず指定されたtenantIdの設定のみ更新
  await this.prisma.tenant.update({
    where: { id: tenantId },  // ← 明示的なテナントID指定
    data: { settings: newSettings as any },
  });
  
  // ...
}
```

#### hotel-saas側のミドルウェア

```typescript
// プロキシAPI実装例
export default defineEventHandler(async (event) => {
  // セッションから現在のテナントIDを取得
  const session = await getSession(event);
  const tenantId = session.currentTenantId;  // ← テナント切り替え対応
  
  if (!tenantId) {
    throw createError({
      statusCode: 401,
      message: 'テナントが選択されていません',
    });
  }
  
  // hotel-commonにプロキシ（tenantIdは自動的にセッションから取得される）
  const response = await $fetch(`${HOTEL_COMMON_URL}/api/v1/admin/settings`, {
    headers: {
      'Cookie': event.node.req.headers.cookie || '',  // セッションCookie転送
    },
  });
  
  return response;
});
```

---

### セキュリティ考慮事項

#### テナント分離の検証

1. **セッション検証**: 必ずセッションから`currentTenantId`を取得
2. **権限確認**: 対象テナントへのアクセス権限を確認
3. **明示的フィルタ**: `WHERE tenant_id = ?`を必ず指定
4. **クロステナントアクセス防止**: URLパラメータでの`tenantId`指定は無視

#### 監査ログ

設定変更時は以下を記録：

- 変更者（`staff_id`）
- 対象テナント（`tenant_id`）
- 変更項目（`changed_fields`）
- 変更前後の値（`before`, `after`）
- タイムスタンプ（`changed_at`）

**詳細**: [SSOT_SAAS_ADMIN_AUTHENTICATION.md#テナント切り替え](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md#テナント切り替え) を参照

---

## 🔒 トランザクション・整合性

### データ更新戦略

#### 部分更新（Partial Update）

```typescript
// deepMerge実装例
private deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        source[key] !== null
      ) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
}
```

- **動作**: 差分のみを更新、未指定項目は既存値を保持
- **メリット**: API呼び出し時に全項目を送信する必要がない
- **トランザクション**: 単一`Tenant`レコードの更新のため、トランザクション不要

#### 楽観的ロック

- **現状**: 未実装
- **理由**: 
  - 設定変更は管理者のみが実施
  - 同時編集のリスクが低い
- **将来検討**: 複数管理者による同時編集が増えた場合に実装

---

### 設定キャッシュ戦略

#### キャッシュ不使用（現状）

```
リクエスト → hotel-saas → hotel-common → PostgreSQL
                                    ↓
                              Tenant.settings (JSON)
                                    ↓
                                レスポンス
```

- **戦略**: キャッシュなし、常にDBから最新値を取得
- **理由**:
  1. 設定変更頻度が低い（1日数回程度）
  2. 即座反映が重要（キャッシュによる遅延を避ける）
  3. 単一JSON型カラムのため読み取りが高速
- **パフォーマンス**: 
  - JSON型カラムの読み取りは十分高速
  - `Tenant`テーブルに`id`インデックスあり

#### 将来的なキャッシュ実装（検討事項）

**実装する場合の条件**:
- アクセス頻度が大幅に増加（1秒間に100リクエスト以上）
- DBへの負荷が問題になった場合

**実装案**:
```typescript
// Redis TTL: 60秒
const cacheKey = `tenant:${tenantId}:settings`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const settings = await prisma.tenant.findUnique({...});
await redis.setex(cacheKey, 60, JSON.stringify(settings));

return settings;
```

**キャッシュ無効化タイミング**:
- 設定更新時に即座に削除
- TTL: 60秒（念のため）

---

### データ整合性保証

#### JSON型フィールドのバリデーション

1. **フロントエンド**: リアルタイムバリデーション（UX向上）
2. **バックエンド**: Zodスキーマによる厳格なバリデーション（セキュリティ）

```typescript
// hotel-common側での厳格な検証
const result = TenantSettingsSchema.safeParse(data);

if (!result.success) {
  return {
    success: false,
    error: result.error.format(),
  };
}
```

#### デフォルト値の保証

- `Tenant.settings`が`null`の場合、`DEFAULT_SETTINGS`を返す
- 部分的な欠損がある場合、`deepMerge`でデフォルト値を補完

#### 設定移行時の後方互換性

**新しい設定項目を追加する場合**:

```typescript
// バージョン1.1.0で新項目追加
interface TenantSettings_v1_1 extends TenantSettings_v1_0 {
  newFeature?: {
    enabled: boolean;
    config: string;
  };
}

// DEFAULT_SETTINGSに追加
const DEFAULT_SETTINGS_v1_1 = {
  ...DEFAULT_SETTINGS_v1_0,
  newFeature: {
    enabled: false,
    config: 'default',
  },
};
```

- 既存テナントのデータには影響なし（deepMergeで補完）
- 新規追加項目は`optional`として定義

---

## 🎨 UI仕様

### 共通レイアウト

- **レイアウト**: `admin`
- **ミドルウェア**: `admin-auth`（Session認証必須）
- **ナビゲーション**: 管理画面サイドバー > システム設定 > 基本設定

### 画面構成

#### 1. 基本設定画面（`/admin/settings/basic`）

**セクション**:
1. **税金設定**
   - 価格表示方式（ラジオボタン）
   - 税額計算方法（セレクトボックス）
   - 計算例プレビュー

2. **フロント管理設定**
   - 階数表示順序（ラジオボタン）
   - 客室横並び表示数（数値入力）

**ボタン**:
- 保存ボタン（右下固定）

---

#### 2. ホテル情報設定画面（`/admin/settings/hotelinfo` または `/admin/settings/hotel-info`）

**注**: 2つのUIファイルが存在（統一推奨）

**セクション**:
1. **基本情報**
   - ホテル名、ホテル名（英語）
   - ホテル分類、客室数、開業年
   - 旅館業許可番号

2. **住所・連絡先**
   - 郵便番号、都道府県、市区町村
   - 住所、住所（英語）
   - 電話番号、FAX番号、メールアドレス、ウェブサイト

3. **チェックイン・チェックアウト**
   - チェックイン時刻（time input）
   - チェックアウト時刻（time input）

4. **説明・その他**
   - ホテル説明、ホテル説明（英語）
   - 施設・設備

5. **適格請求書発行事業者情報**（hotel-info.vueのみ）
   - 適格請求書発行事業者登録番号
   - プレビュー表示

**ボタン**:
- 保存ボタン（右上固定）

---

#### 3. 支払い方法設定画面（`/admin/settings/payment-methods`）

**セクション**:
1. **新しい支払い方法を追加**
   - キー（英数字）
   - 表示名
   - 追加ボタン

2. **支払い方法一覧**
   - テーブル表示（ドラッグハンドル、キー、表示名、状態、操作）
   - ドラッグ&ドロップで並び替え（即座保存）
   - 有効/無効チェックボックス
   - 削除ボタン（デフォルト方法は無効化）

**ボタン**:
- 最新データを取得ボタン
- 変更を保存ボタン

**機能**:
- Sortable.jsによるドラッグ&ドロップ
- 削除確認モーダル

---

#### 4. 領収書設定画面（`/admin/settings/receipt-settings`）

**セクション**:
1. **店舗情報**
   - 店舗ID
   - 伝票番号プレビュー

2. **基本設定**
   - 項目名
   - 但し書き

3. **金額表示設定**
   - 小計ラベル、税金ラベル、合計ラベル

4. **注意事項**
   - 注意事項テンプレート（テキストエリア）

5. **プレビュー**
   - リアルタイムプレビュー表示（領収書スタイル）

**ボタン**:
- リセットボタン
- 設定を保存ボタン

---

### UIコンポーネント

#### 入力フィールド
- **Text Input**: 標準的なテキスト入力
- **Number Input**: 数値入力（min/max制約付き）
- **Time Input**: 時刻入力（HH:MM形式）
- **Select Box**: ドロップダウン選択
- **Radio Button**: ラジオボタン選択
- **Checkbox**: チェックボックス
- **Textarea**: 複数行テキスト入力

#### フィードバック
- **トースト通知**: 保存成功/失敗の通知
- **ローディング**: 読み込み中表示
- **バリデーションエラー**: 赤文字表示

---

## 🚀 実装詳細

### hotel-common実装

#### ディレクトリ構成

```
/Users/kaneko/hotel-common/
├── src/
│   ├── routes/
│   │   └── api/
│   │       └── v1/
│   │           └── admin/
│   │               └── settings/
│   │                   ├── index.ts               # GET/PUT /api/v1/admin/settings
│   │                   ├── hotel-info.get.ts      # GET /api/v1/admin/settings/hotel-info
│   │                   ├── hotel-info.post.ts     # POST /api/v1/admin/settings/hotel-info
│   │                   ├── payment-methods.get.ts # GET /api/v1/admin/settings/payment-methods
│   │                   ├── payment-methods.post.ts # POST /api/v1/admin/settings/payment-methods
│   │                   ├── receipt-settings.get.ts # GET /api/v1/admin/settings/receipt-settings
│   │                   └── receipt-settings.post.ts # POST /api/v1/admin/settings/receipt-settings
│   │
│   ├── services/
│   │   └── settings/
│   │       ├── TenantSettingsService.ts  # 設定管理サービス
│   │       └── validators.ts             # バリデーションスキーマ
│   │
│   ├── types/
│   │   └── settings.ts                   # TenantSettings型定義
│   │
│   └── middleware/
│       └── requireAdmin.ts               # 管理者認証ミドルウェア
│
└── prisma/
    └── schema.prisma                     # Prismaスキーマ（Tenant定義）
```

#### TenantSettingsService

```typescript
// /Users/kaneko/hotel-common/src/services/settings/TenantSettingsService.ts

import { PrismaClient } from '@prisma/client';
import { TenantSettings, DEFAULT_SETTINGS } from '../../types/settings';

export class TenantSettingsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 全設定を取得
   */
  async getSettings(tenantId: string): Promise<TenantSettings> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId, is_deleted: false },
      select: { settings: true },
    });

    if (!tenant || !tenant.settings) {
      return DEFAULT_SETTINGS;
    }

    // JSONをマージしてデフォルト値を補完
    return this.mergeWithDefaults(tenant.settings as TenantSettings);
  }

  /**
   * 全設定を更新
   */
  async updateSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<TenantSettings> {
    const currentSettings = await this.getSettings(tenantId);
    const newSettings = this.deepMerge(currentSettings, settings);

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: newSettings as any },
    });

    return newSettings;
  }

  /**
   * ホテル情報のみ更新
   */
  async updateHotelInfo(tenantId: string, hotelInfo: Partial<TenantSettings['hotelInfo']>): Promise<TenantSettings['hotelInfo']> {
    const settings = await this.getSettings(tenantId);
    settings.hotelInfo = { ...settings.hotelInfo, ...hotelInfo };

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: settings as any },
    });

    return settings.hotelInfo;
  }

  // ... 他のヘルパーメソッド
}
```

#### バリデーション

```typescript
// /Users/kaneko/hotel-common/src/services/settings/validators.ts

import { z } from 'zod';

export const HotelInfoSchema = z.object({
  name: z.string().min(1, 'ホテル名は必須です'),
  nameEn: z.string().optional(),
  category: z.enum(['hotel', 'ryokan', 'pension', 'minshuku', 'resort', 'business', 'capsule', 'other']),
  totalRooms: z.number().int().min(0),
  establishedYear: z.string().optional(),
  license: z.string().optional(),
  postalCode: z.string().regex(/^\d{3}-\d{4}$/, '郵便番号はXXX-XXXX形式で入力してください'),
  prefecture: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(1),
  addressEn: z.string().optional(),
  phone: z.string().regex(/^0\d{1,4}-\d{1,4}-\d{4}$/, '電話番号形式が正しくありません'),
  fax: z.string().optional(),
  email: z.string().email('メールアドレス形式が正しくありません'),
  website: z.string().url().optional(),
  checkinTime: z.string().regex(/^\d{2}:\d{2}$/),
  checkoutTime: z.string().regex(/^\d{2}:\d{2}$/),
  description: z.string().optional(),
  descriptionEn: z.string().optional(),
  facilities: z.string().optional(),
  logo: z.string().url().optional(),
});

export const AccountingSchema = z.object({
  priceDisplayType: z.enum(['tax-included', 'tax-excluded']),
  taxCalculationMethod: z.enum(['round', 'floor', 'ceil']),
  floorDisplayOrder: z.enum(['asc', 'desc']),
  roomsPerRow: z.number().int().min(1).max(10),
});

export const PaymentMethodSchema = z.object({
  key: z.string().regex(/^[a-zA-Z0-9_]+$/),
  label: z.string().min(1),
  enabled: z.boolean(),
  order: z.number().int(),
  isDefault: z.boolean().optional(),
});

export const ReceiptSettingsSchema = z.object({
  storeId: z.string().regex(/^[A-Za-z0-9]+$/).max(10),
  itemName: z.string().min(1),
  itemDescription: z.string().min(1),
  subtotalLabel: z.string().min(1),
  taxLabel: z.string().min(1),
  totalLabel: z.string().min(1),
  noteTemplate: z.string().min(1),
  invoiceNumber: z.string().regex(/^T\d{13}$/, '適格請求書発行事業者登録番号はTから始まる13桁の数字です').optional(),
});

export const TenantSettingsSchema = z.object({
  hotelInfo: HotelInfoSchema,
  accounting: AccountingSchema,
  paymentMethods: z.array(PaymentMethodSchema),
  receipt: ReceiptSettingsSchema,
  display: z.object({
    maintenanceMode: z.boolean(),
    enabledFeatures: z.array(z.string()),
    disabledMenus: z.array(z.string()),
  }).optional(),
});
```

---

### hotel-saas実装

#### プロキシAPI実装例

```typescript
// /Users/kaneko/hotel-saas/server/api/v1/admin/settings/index.get.ts

export default defineEventHandler(async (event) => {
  try {
    // hotel-commonにプロキシ
    const response = await $fetch(`${HOTEL_COMMON_URL}/api/v1/admin/settings`, {
      method: 'GET',
      headers: {
        'Cookie': event.node.req.headers.cookie || '',
      },
    });

    return response;
  } catch (error) {
    console.error('設定取得エラー:', error);
    return {
      success: false,
      error: 'Failed to fetch settings',
    };
  }
});
```

```typescript
// /Users/kaneko/hotel-saas/server/api/v1/admin/settings/index.put.ts

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // hotel-commonにプロキシ
    const response = await $fetch(`${HOTEL_COMMON_URL}/api/v1/admin/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': event.node.req.headers.cookie || '',
      },
      body,
    });

    return response;
  } catch (error) {
    console.error('設定更新エラー:', error);
    return {
      success: false,
      error: 'Failed to update settings',
    };
  }
});
```

---

## ✅ 既存実装状況

### hotel-saas UI

| 画面 | ファイル | 状態 | 備考 |
|------|---------|------|------|
| 基本設定 | `pages/admin/settings/basic.vue` | ✅ 実装済み | 税金設定、フロント管理設定 |
| ホテル情報（1） | `pages/admin/settings/hotelinfo.vue` | ✅ 実装済み | 全項目対応、詳細版 |
| ホテル情報（2） | `pages/admin/settings/hotel-info.vue` | ✅ 実装済み | レシート用、インボイス対応 |
| 支払い方法 | `pages/admin/settings/payment-methods.vue` | ✅ 実装済み | ドラッグ&ドロップ並び替え |
| 領収書設定 | `pages/admin/settings/receipt-settings.vue` | ✅ 実装済み | プレビュー機能付き |

### hotel-saas API

| エンドポイント | ファイル | 状態 | 備考 |
|--------------|---------|------|------|
| GET /api/v1/admin/settings | - | ❌ 未実装 | |
| PUT /api/v1/admin/settings | - | ❌ 未実装 | |
| GET /api/v1/admin/settings/hotel-info | - | ❌ 未実装 | |
| POST /api/v1/admin/settings/hotel-info | - | ❌ 未実装 | |
| GET /api/v1/admin/settings/payment-methods | `server/api/v1/admin/settings/payment-methods.get.ts` | ✅ 実装済み | |
| POST /api/v1/admin/settings/payment-methods | - | ❌ 未実装 | UI側で呼び出しあり |
| GET /api/v1/admin/settings/receipt-settings | - | ❌ 未実装 | |
| POST /api/v1/admin/settings/receipt-settings | - | ❌ 未実装 | |

### hotel-common API

| エンドポイント | 状態 | 備考 |
|--------------|------|------|
| GET /api/v1/admin/settings | ❌ 未実装 | コア実装が必要 |
| PUT /api/v1/admin/settings | ❌ 未実装 | コア実装が必要 |
| GET /api/v1/admin/settings/hotel-info | ❌ 未実装 | コア実装が必要 |
| POST /api/v1/admin/settings/hotel-info | ❌ 未実装 | コア実装が必要 |
| GET /api/v1/admin/settings/payment-methods | ❌ 未実装 | コア実装が必要 |
| POST /api/v1/admin/settings/payment-methods | ❌ 未実装 | コア実装が必要 |
| GET /api/v1/admin/settings/receipt-settings | ❌ 未実装 | コア実装が必要 |
| POST /api/v1/admin/settings/receipt-settings | ❌ 未実装 | コア実装が必要 |

---

## 🚧 未実装機能

### Phase 1 - 必須機能（🔴 最高優先）

1. **hotel-common APIの完全実装**
   - TenantSettingsServiceの実装
   - 全8エンドポイントの実装
   - バリデーション実装（Zod）
   - エラーハンドリング

2. **hotel-saas APIプロキシの実装**
   - 7つの未実装エンドポイントの実装
   - エラーハンドリング
   - Cookie転送の確認

3. **UIとAPIの接続**
   - 各UIファイルが正しいAPIを呼び出すように修正
   - エラーハンドリングの統一
   - トースト通知の実装

### Phase 2 - 重要機能（🟡 高優先）

4. **表示制御設定の実装**
   - 機能ON/OFF切り替えUI
   - メンテナンスモード
   - メニュー表示/非表示制御

5. **設定変更履歴・監査ログ**
   - 変更履歴テーブルの追加
   - 変更内容の記録
   - 履歴表示UI

6. **画像アップロード機能**
   - ロゴアップロード
   - 画像プレビュー
   - 画像削除

### Phase 3 - 追加機能（🟢 中優先）

7. **設定インポート/エクスポート**
   - JSON形式でエクスポート
   - JSON形式でインポート
   - バックアップ機能

8. **設定テンプレート**
   - デフォルトテンプレート
   - カスタムテンプレート保存
   - テンプレート適用

9. **UI統合**
   - `hotelinfo.vue`と`hotel-info.vue`の統一
   - 重複機能の整理

---

## 🌐 多言語対応

### 概要

基本設定システムは**管理画面専用**であり、UIテキストのみ多言語化が必要です。

**対応パターン**: 🟡 **軽量対応**（UIテキストのみ）

**定義**:
- ✅ 静的UIテキスト（ボタン、ラベル、メッセージ等）を多言語化
- ✅ `@nuxtjs/i18n`を使用
- ❌ `translations`テーブルは使用しない
- ❌ 自動翻訳は実行しない
- ❌ データベースのデータフィールドは多言語化しない

**適用理由**: 
- 管理画面専用であり、スタッフが使用する機能
- 設定値（数値、選択肢等）は言語に依存しない
- ゲスト向け情報（ホテル名、住所等）は既存実装（`nameEn`, `addressEn`）で対応済み
- `translations`テーブルへの移行は将来検討

**対象範囲**:
- ✅ ゲスト向け情報（ホテル名、説明、住所） - 既存実装を維持
- ✅ UIテキスト（設定項目のラベル、説明） - `@nuxtjs/i18n`で対応
- ❌ システム内部設定（税金計算方法、支払い方法等） - 多言語化不要

**重要**: 既存の`nameEn`, `addressEn`, `descriptionEn`フィールドは**そのまま維持**します。

---

### 対象フィールド

#### 1. **既存の多言語対応（変更なし）**

| フィールド | 説明 | 対応方法 | 備考 |
|-----------|------|---------|------|
| `hotelInfo.name` | ホテル名（日本語） | 既存実装維持 | - |
| `hotelInfo.nameEn` | ホテル名（英語） | 既存実装維持 | - |
| `hotelInfo.address` | 住所（日本語） | 既存実装維持 | - |
| `hotelInfo.addressEn` | 住所（英語） | 既存実装維持 | - |
| `hotelInfo.description` | ホテル説明（日本語） | 既存実装維持 | - |
| `hotelInfo.descriptionEn` | ホテル説明（英語） | 既存実装維持 | - |

**判断**: 
- 既存の2言語（日本語・英語）対応は十分であり、15言語対応は不要と判断
- ゲスト画面側で多言語化が必要な場合、その時点で`translations`テーブル連携を検討

#### 2. **UIテキストの多言語化**

| 対象 | 対応方法 | 優先度 |
|------|---------|--------|
| 設定項目のラベル（「価格表示方式」「税額計算方法」等） | `@nuxtjs/i18n` | ⭐⭐⭐ |
| フォームのプレースホルダー | `@nuxtjs/i18n` | ⭐⭐⭐ |
| ボタンテキスト（「保存」「キャンセル」等） | `@nuxtjs/i18n` | ⭐⭐⭐ |
| エラーメッセージ | `@nuxtjs/i18n` | ⭐⭐⭐ |

---

### 実装方法

#### ✅ **既存実装の維持**

現在の`Tenant.settings`スキーマは**変更なし**:

```typescript
interface TenantSettings {
  hotelInfo: {
    name: string;              // ホテル名（日本語）
    nameEn?: string;           // ホテル名（英語） ← 維持
    address: string;           // 住所（日本語）
    addressEn?: string;        // 住所（英語） ← 維持
    description?: string;      // ホテル説明（日本語）
    descriptionEn?: string;    // ホテル説明（英語） ← 維持
    // ...
  };
  // ...
}
```

#### ✅ **UIテキストの多言語化**

**実装パターン**: `@nuxtjs/i18n`を使用

```vue
<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <div class="settings-section">
    <h2>{{ t('admin.settings.hotelInfo.title') }}</h2>
    
    <!-- ホテル名（日本語） -->
    <div class="form-group">
      <label>{{ t('admin.settings.hotelInfo.nameLabel') }}</label>
      <input 
        v-model="settings.hotelInfo.name" 
        :placeholder="t('admin.settings.hotelInfo.namePlaceholder')"
      />
    </div>
    
    <!-- ホテル名（英語） -->
    <div class="form-group">
      <label>{{ t('admin.settings.hotelInfo.nameEnLabel') }}</label>
      <input 
        v-model="settings.hotelInfo.nameEn" 
        :placeholder="t('admin.settings.hotelInfo.nameEnPlaceholder')"
      />
    </div>
    
    <!-- 保存ボタン -->
    <button @click="saveSettings">
      {{ t('admin.settings.actions.save') }}
    </button>
  </div>
</template>
```

**翻訳ファイル例** (`locales/ja.json`):

```json
{
  "admin": {
    "settings": {
      "hotelInfo": {
        "title": "ホテル情報設定",
        "nameLabel": "ホテル名",
        "namePlaceholder": "例: ホテル花園",
        "nameEnLabel": "ホテル名（英語）",
        "nameEnPlaceholder": "Example: Hotel Hanazono",
        "addressLabel": "住所",
        "addressEnLabel": "住所（英語）",
        "descriptionLabel": "ホテル説明",
        "descriptionEnLabel": "ホテル説明（英語）"
      },
      "actions": {
        "save": "保存",
        "cancel": "キャンセル"
      }
    }
  }
}
```

---

### マイグレーション計画

#### **Phase 1: UIテキストの多言語化（優先度: 高）**

**対象**: `hotel-saas` フロントエンド

**タスク**:
- [ ] `@nuxtjs/i18n`のセットアップ確認
- [ ] 翻訳ファイルの作成（`locales/ja.json`, `locales/en.json`）
- [ ] 既存UIコンポーネントの翻訳キー置き換え
  - [ ] `pages/admin/settings/hotel-info.vue`
  - [ ] `pages/admin/settings/hotelinfo.vue`
  - [ ] `pages/admin/settings/payment-methods.vue`
  - [ ] `pages/admin/settings/accounting.vue`
  - [ ] `pages/admin/settings/checkin.vue`
- [ ] 言語切り替え機能の動作確認

**工数**: 1-2日

---

#### **Phase 2: ゲスト向け情報の拡張多言語化（Phase 3以降で検討）**

**前提条件**: 
- ✅ Phase 1（UIテキスト多言語化）が完了している
- ✅ ゲスト画面（`hotel-saas/pages/guest/*`）で15言語対応の需要が確認されている
- ✅ Product Ownerの承認を得ている

**実装時期**: Phase 3以降（Phase 1完了の3-6ヶ月後）

**判断基準**: 以下のいずれかを満たす場合に実施
1. ゲスト画面のアクセスログで、非日本語・非英語の言語選択が月間10%以上
2. 顧客からの15言語対応要望が複数件ある
3. 競合他社が15言語対応を実施している

**対応方針**:
1. [ ] `hotelInfo.name`, `hotelInfo.description`, `hotelInfo.address`を`translations`テーブルに移行
2. [ ] 既存の`nameEn`, `descriptionEn`, `addressEn`は非推奨化（削除はPhase 5）
3. [ ] 自動翻訳ジョブの作成
4. [ ] ゲスト画面での言語切り替えUI実装

**工数**: 2-3日

---

### 実装チェックリスト

#### **Phase 1: UIテキスト多言語化**

**hotel-saas（フロントエンド）**:
- [ ] `@nuxtjs/i18n`セットアップ確認
- [ ] 翻訳ファイル作成
  - [ ] `locales/ja.json` - 日本語翻訳
  - [ ] `locales/en.json` - 英語翻訳
- [ ] UIコンポーネント更新
  - [ ] `pages/admin/settings/hotel-info.vue`
  - [ ] `pages/admin/settings/hotelinfo.vue`
  - [ ] `pages/admin/settings/payment-methods.vue`
  - [ ] `pages/admin/settings/accounting.vue`
  - [ ] `pages/admin/settings/checkin.vue`
- [ ] 言語切り替えUIの実装（ヘッダー）
- [ ] 動作確認（日本語 ↔ 英語）

**テスト**:
- [ ] 日本語表示の確認
- [ ] 英語表示の確認
- [ ] 言語切り替えの動作確認
- [ ] 翻訳キーの漏れがないか確認

---

### 注意事項

#### ✅ **やるべきこと**

1. **既存実装の完全維持**
   - `nameEn`, `addressEn`, `descriptionEn`フィールドは削除しない
   - APIレスポンスの構造は変更しない

2. **段階的な対応**
   - Phase 1でUIテキストのみ多言語化
   - Phase 2（Phase 3以降で検討）でゲスト向け情報の拡張多言語化を実施

3. **軽量な実装**
   - `translations`テーブルは使用しない（現時点）
   - `@nuxtjs/i18n`のみで対応

#### ❌ **やってはいけないこと**

1. **既存フィールドの削除**
   - `nameEn`, `addressEn`, `descriptionEn`を削除する
   - 既存のAPIレスポンス構造を変更する

2. **過剰な多言語化**
   - システム内部設定（税金計算方法、支払い方法等）を多言語化する
   - 必要のないフィールドに`translations`テーブルを追加する

3. **既存仕様との矛盾**
   - `Tenant.settings`スキーマを変更する
   - 既存のバリデーションロジックを破壊する

---

### 影響範囲

| システム | 影響度 | 内容 |
|---------|--------|------|
| **hotel-saas** | 🟡 中 | UIコンポーネントの翻訳キー置き換え |
| **hotel-common** | ✅ なし | API仕様変更なし |
| **hotel-pms** | ✅ なし | 依存なし |
| **hotel-member** | ✅ なし | 依存なし |

---

## 🔗 関連SSOT

- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証
- [SSOT_SAAS_FRONT_DESK_OPERATIONS.md](./SSOT_SAAS_FRONT_DESK_OPERATIONS.md) - フロント業務（会計設定参照）
- [SSOT_SAAS_MENU_MANAGEMENT.md](./SSOT_SAAS_MENU_MANAGEMENT.md) - メニュー管理（価格表示設定参照）
- [SSOT_MULTILINGUAL_SYSTEM.md](../00_foundation/SSOT_MULTILINGUAL_SYSTEM.md) - 多言語システム基盤

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2025-10-05 | 1.0.0 | 初版作成<br>- 既存UI実装を調査し仕様化<br>- API設計（hotel-common + hotel-saas）<br>- データモデル設計（Tenant.settings JSON）<br>- バリデーションスキーマ定義<br>- 未実装機能の明確化 | AI |
| 2025-10-05 | 1.1.0 | 120点を目指す改善<br>- 設定変更の影響範囲セクション追加<br>- UIパス一覧表追加<br>- トランザクション・整合性セクション追加<br>- キャッシュ戦略の明記<br>- データ整合性保証の詳細化<br>- 後方互換性戦略の追加 | AI |
| 2025-10-05 | 1.2.0 | 既存SSOT整合性確保<br>- 複数テナント所属時の動作セクション追加<br>- SSOT_SAAS_MULTITENANT.md v1.5.0 対応<br>- SSOT_SAAS_ADMIN_AUTHENTICATION.md v1.3.0 対応<br>- テナント切り替え時の設定の扱いを明記<br>- セキュリティ考慮事項・監査ログ追加<br>- 既存SSOTとの矛盾なしを確認 | AI |
| 2025-10-10 | 2.0.0 | 多言語対応追加<br>- 軽量対応（UIテキストのみ）<br>- 既存の`nameEn`, `addressEn`, `descriptionEn`を維持<br>- `@nuxtjs/i18n`による管理画面UI多言語化<br>- 段階的マイグレーション計画（Phase 1-2）<br>- 既存仕様との完全な整合性確保 | AI |

---

**以上、SSOT: 基本設定システム（v2.0.0）**

