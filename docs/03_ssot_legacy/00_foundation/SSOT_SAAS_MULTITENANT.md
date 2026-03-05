# SSOT: マルチテナントアーキテクチャ

**作成日**: 2025-10-02  
**バージョン**: 1.6.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最優先（Phase 1）  
**最終更新**: 2025-10-07（主所属テナント変更機能の実装詳細を追加）

**関連SSOT**:
- [SSOT_TEST_ENVIRONMENT.md](./SSOT_TEST_ENVIRONMENT.md) - テスト環境・テストテナント情報

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [技術スタック](#技術スタック)
4. [アーキテクチャ設計](#アーキテクチャ設計)
5. [データベース設計](#データベース設計)
6. [テナント識別・分離](#テナント識別分離)
7. [スタッフ複数テナント所属](#スタッフ複数テナント所属) ⭐ **NEW**
8. [主所属テナント変更機能](#主所属テナント変更機能) ⭐ **NEW (v1.6.0)**
9. [プラン管理](#プラン管理)
10. [実装詳細](#実装詳細)
11. [環境設定](#環境設定)
12. [セキュリティ](#セキュリティ)
13. [既存実装状況](#既存実装状況)
14. [修正必須箇所](#修正必須箇所)

---

## 📖 概要

### 目的
単一インフラで複数ホテル（テナント）へのサービス提供を実現し、各テナントのデータを完全に分離する。

### 基本方針
- **データ分離方式**: Row Level Security (RLS) + `tenant_id`カラム方式
- **テナント識別**: ログインID（メールアドレス）ベース + デバイスIDベース
- **スケーラビリティ**: 数千テナントまで対応可能な設計
- **コスト効率**: 単一データベース、単一Redisインスタンス

---

## 🎯 スコープ

### 対象システム
- ✅ **hotel-saas**: メイン実装（フロントエンド + ミドルウェア）
- ✅ **hotel-common**: テナント管理API、プラン管理API
- 🔄 **hotel-pms**: 将来対応（Phase 4）
- 🔄 **hotel-member**: 将来対応（Phase 4）

### 機能範囲
- テナント登録・管理
- ログインIDベース認証（スタッフ）
- デバイスIDベース認証（客室端末）
- データベースレベルのテナント分離
- プラン制限の適用
- テナント固有設定管理

---

## 🛠️ 技術スタック

### データベース
- **RDBMS**: PostgreSQL 14+
- **ORM**: Prisma 5.x
- **分離方式**: Row-Level Security (RLS) + アプリケーションレベルフィルタリング

### フロントエンド
- **Framework**: Nuxt 3
- **Middleware**: Nuxt Route Middleware（テナント解決）

### バックエンド
- **Framework**: Express.js (hotel-common)
- **認証**: Session-based（Redis）

### インフラ
- **Redis**: セッション管理 + テナントキャッシュ
- **PostgreSQL**: 統一データベース

---

## 🏗️ アーキテクチャ設計

### データ分離アーキテクチャ

```
┌─────────────────────────────────────────┐
│  テナント識別（2パターン）               │
│  ① スタッフログイン（メールアドレス）    │
│  ② 客室端末アクセス（デバイスID）        │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  hotel-saas (Nuxt 3)                    │
│  ├─ middleware/tenant-context.ts        │
│  │  └─ テナント解決・コンテキスト設定   │
│  └─ Prisma拡張（自動テナントフィルタ）  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  hotel-common (Express)                 │
│  └─ API: テナント管理、プラン管理       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  PostgreSQL (単一DB)                    │
│  ├─ tenants (テナント情報)              │
│  ├─ staff (グローバルアカウント)         │
│  ├─ staff_tenant_memberships (所属管理)  │
│  ├─ device_rooms (tenant_id付き)        │
│  ├─ orders (tenant_id付き)              │
│  ├─ menu_items (tenant_id付き)          │
│  └─ ... 全テーブルにtenant_id           │
└─────────────────────────────────────────┘
```

### テナント識別フロー

#### 1. スタッフログイン（管理画面）

```
1. スタッフログイン（メールアドレス + パスワード）
   ↓
2. Staffテーブル検索（email検索）
   ↓
3. パスワード検証 + tenant_id取得
   ↓
4. セッションにtenant_id設定
   ↓
5. テナントコンテキスト設定
   ↓
6. Prisma拡張適用（全クエリにtenant_id自動追加）
   ↓
7. データアクセス（テナント分離完了）
```

**詳細**: [SSOT_SAAS_ADMIN_AUTHENTICATION.md](./SSOT_SAAS_ADMIN_AUTHENTICATION.md) を参照

#### 2. 客室端末アクセス（自動認証）

```
1. 客室端末からアクセス（ブラウザ起動）
   ↓
2. デバイス情報取得（MAC/IPアドレス）
   ↓
3. DeviceRoomsテーブル検索
   ↓
4. デバイス存在確認 + tenant_id取得
   ↓
5. テナントコンテキスト設定
   ↓
6. Prisma拡張適用（全クエリにtenant_id自動追加）
   ↓
7. データアクセス（テナント分離完了）
```

**詳細**: [SSOT_SAAS_DEVICE_AUTHENTICATION.md](./SSOT_SAAS_DEVICE_AUTHENTICATION.md) を参照

**注記**: 客室端末から裏コマンド（リモコン操作）で管理画面にアクセスする場合は、別途スタッフログインが必要

---

## 🗄️ データベース設計

### 命名規則

**データベース列名**: `snake_case`
- `tenant_id` (String/UUID)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Prismaモデル**: `camelCase`
- `tenantId`
- `createdAt`
- `updatedAt`

**API/JSON**: `camelCase`
- `tenantId`
- `createdAt`

---

### テナント管理テーブル

#### `tenants` (hotel-common/prisma/schema.prisma)

```prisma
model Tenant {
  id                       String                     @id
  name                     String                     // ホテル名
  domain                   String?                    @unique // サブドメイン
  planType                 String?                    // プランタイプ
  status                   String                     @default("active") // active, suspended, deleted
  contactEmail             String?
  createdAt                DateTime                   @default(now())
  features                 String[]                   // 有効機能リスト
  settings                 Json?                      // テナント固有設定
  is_deleted               Boolean                    @default(false)
  
  // リレーション
  TenantSystemPlan         TenantSystemPlan[]
  authLogs                 AuthLogs[]
  billingLogs              BillingLogs[]
  
  @@index([is_deleted])
  @@map("tenants")
}
```

**重要フィールド**:
- `id`: テナント識別子（UUID推奨、開発環境では文字列も許可）
- `domain`: ドメイン名（例: "hotel-a.example.com"）※サブドメイン識別には使用しない
- `planType`: プランタイプ（例: "omotenasuai-economy"）
  - **詳細**: 料金・機能制限は [SSOT_SAAS_SUPER_ADMIN.md](./SSOT_SAAS_SUPER_ADMIN.md) を参照
- `status`: テナント状態（active/suspended/deleted）

---

#### `tenant_system_plan` (テナント×システム×プラン)

```prisma
model TenantSystemPlan {
  id                     String                 @id
  tenantId               String
  systemType             String                 // "hotel-saas", "hotel-pms", "hotel-member"
  planId                 String
  startDate              DateTime               @default(now())
  endDate                DateTime?
  isActive               Boolean                @default(true)
  monthlyPrice           Int
  createdAt              DateTime               @default(now())
  updatedAt              DateTime
  is_deleted             Boolean                @default(false)
  
  SystemPlanRestrictions SystemPlanRestrictions @relation(fields: [planId], references: [id])
  Tenant                 Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, systemType])
  @@index([tenantId])
  @@index([systemType])
  @@index([isActive])
  @@map("tenant_system_plan")
}
```

---

#### `system_plan_restrictions` (プラン制限定義)

```prisma
model SystemPlanRestrictions {
  id                       String             @id
  systemType               String             // "hotel-saas", "hotel-pms", "hotel-member"
  businessType             String             // "leisure", "omotenasuai"
  planType                 String             // "economy", "professional", "enterprise"
  planCategory             String             // 細分化カテゴリ
  monthlyPrice             Int
  maxDevices               Int                @default(30)
  enableAiConcierge        Boolean            @default(false)
  enableMultilingual       Boolean            @default(false)
  enableLayoutEditor       Boolean            @default(false)
  maxMonthlyOrders         Int                @default(1000)
  maxMonthlyAiRequests     Int                @default(0)
  maxStorageGB             Float              @default(5.0)
  
  TenantSystemPlan         TenantSystemPlan[]
  
  @@unique([systemType, businessType, planType, planCategory])
  @@map("system_plan_restrictions")
}
```

**注記**: 
- このテーブルのデータ管理（料金設定、機能制限の変更）は、スーパーアドミン機能で行います
- **詳細**: [SSOT_SAAS_SUPER_ADMIN.md](./SSOT_SAAS_SUPER_ADMIN.md) を参照

---

### マルチテナント対応テーブル

**全データテーブルに`tenant_id`カラムを追加**

#### 対象テーブル（hotel-common - PostgreSQL）
- ✅ `Order` → テーブル名: `orders`, カラム: `tenantId` (String)
- ✅ `OrderItem` → テーブル名: `order_items`, カラム: `tenantId` (String)
- ✅ `MenuItem` → テーブル名: `menu_items`, カラム: `tenantId` (String)
- ✅ `MenuCategory` → テーブル名: `menu_categories`, カラム: `tenantId` (String)
- ✅ `DeviceRoom` → テーブル名: `device_rooms`, カラム: `tenantId` (String)
- ❌ `pages` (ページ設定) - 🔴 tenant_id未実装
- ✅ `staff` (スタッフ) - ✅ テナント非依存のグローバルアカウント、所属は `staff_tenant_memberships` で管理

#### 対象テーブル（hotel-saas - PostgreSQL共通）
- ✅ `Order` (同上)
- ✅ `OrderItem` (同上)
- ✅ `MenuItem` (同上)
- ✅ `MenuCategory` → テーブル名: `menu_categories`, カラム: `tenantId` (String)
- ✅ `DeviceRoom` (同上)
- ✅ `Room` → テーブル名: `rooms`, カラム: `tenantId` (String)
- ✅ `RoomGrade` → テーブル名: `room_grades`, カラム: `tenantId` (String)

**必須インデックス**:
```sql
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_menu_items_tenant_id ON menu_items(tenant_id);
-- 全テーブルに同様のインデックスを追加
```

---

## 🔍 テナント識別・分離

### テナント識別方法

#### 1. スタッフログイン（管理画面）

**認証フロー**:
```
1. メールアドレス + パスワードでログイン（✅ tenantId 不要）
   ↓
2. hotel-common: Staffテーブル検索（グローバルユニーク）
   WHERE email = '{email}' AND is_active = true AND is_deleted = false
   ↓
3. パスワード検証（bcrypt.compare）
   ↓
4. staff_tenant_memberships から所属テナント一覧取得
   WHERE staff_id = '{staff.id}' AND is_active = true
   ↓
5. アクティブテナント決定（is_primary = true または最初の所属）
   ↓
6. セッションに保存
   - tenantId: アクティブテナントID
   - accessibleTenants: 所属テナント一覧
   - role, permissions, level: アクティブテナントの権限情報
```

**重要**: 
- ✅ テナント指定は不要。メールアドレスのみでログイン可能。
- ✅ 1つのメールアドレスで複数テナントに所属可能。
- ✅ ログイン後、所属テナント間で自由に切り替え可能。

#### 2. 客室端末アクセス（自動認証）

**認証フロー**:
```
1. ブラウザアクセス時にMAC/IPアドレス取得
   ↓
2. hotel-common: DeviceRoomsテーブル検索
   WHERE macAddress = '{mac}' OR ipAddress = '{ip}'
   ↓
3. デバイス存在確認 + tenant_id取得
   ↓
4. テナントコンテキストに自動設定
```

**重要**: ログイン操作不要。デバイス情報から自動的にテナントを識別。

#### 3. 開発環境用の代替方法

##### A. X-Tenant-IDヘッダー（API通信テスト用）
```http
GET /api/v1/orders
Host: localhost:3100
X-Tenant-ID: tenant-economy
```

##### B. クエリパラメータ（ブラウザテスト用）
```
http://localhost:3100/admin?tenantId=tenant-economy
```

**注意**: 本番環境では使用禁止。開発環境のみ許可。

---

### テナント分離実装

#### hotel-saas: `server/middleware/tenant-context.ts`

**現在の実装状況**: ✅ 実装済み

**機能**:
1. リクエストからテナント情報を抽出
2. `event.context.tenantId`にテナントIDを設定
3. Prisma拡張を適用して全クエリに自動フィルタリング

**実装の重要ポイント**:
```typescript
// 1. テナント解決（開発環境用の代替手段）
// 本番環境では、認証時に自動的にtenant_idが設定される
if (process.env.NODE_ENV === 'development') {
  tenantId = getHeader(event, 'x-tenant-id') || query.tenantId
}

// 2. コンテキスト設定
event.context.tenantId = tenantId
event.context.tenant = tenant

// 3. Prisma拡張適用
event.context.prisma = prisma.$extends({
  query: {
    order: {
      async findMany({ args, query }) {
        args.where = { ...args.where, tenantId }
        return query(args)
      },
      // create, update, delete も同様
    }
    // 他のモデルも同様
  }
})
```

**テナント取得の実際の流れ**:
1. **スタッフログイン時**: hotel-commonの認証APIが `staff_tenant_memberships` から所属テナント一覧を取得し、アクティブテナント (`tenantId`) と `accessibleTenants` をセッションに保存
2. **デバイスアクセス時**: device-guard.tsミドルウェアがDeviceRoomsテーブルから`tenant_id`を取得
3. **API呼び出し時**: セッションまたはコンテキストから`tenantId`（現在アクティブなテナント）を取得して使用
4. **テナント切り替え時**: `POST /api/v1/auth/switch-tenant` でアクティブテナントを変更し、新しいセッションを作成

**対象モデル**:
- ✅ order
- ✅ menuItem
- ✅ category
- ✅ device
- ✅ place

**スキップパス**（テナント分離不要）:
```typescript
const skipPaths = [
  '/api/auth',
  '/api/health',
  '/api/v1/tenants/resolve',
  '/api/v1/admin/tenants'
]
```

---

#### hotel-common: テナント検証ミドルウェア

**ファイル**: `src/auth/tenant-validation-middleware.ts`

**現在の実装状況**: ✅ 実装済み

**機能**:
1. `X-Tenant-ID`ヘッダーがセッションの`tenant_id`と一致するか検証
2. JWT整合性検証（将来削除予定）

```typescript
// X-Tenant-ID検証
export const validateTenantIdHeader = (req, res, next) => {
  const headerTenantId = req.headers['x-tenant-id']
  
  if (headerTenantId && req.user) {
    if (headerTenantId !== req.user.tenant_id) {
      return res.status(403).json({
        error: 'TENANT_MISMATCH',
        message: 'X-Tenant-ID must match session tenant_id'
      })
    }
  }
  
  next()
}
```

**重要**: このミドルウェアはセッション認証ミドルウェアの**後**に配置すること。

---

## 👥 スタッフ複数テナント所属

### 概要

**目的**: 1人のスタッフが複数のテナント（ホテル）に所属し、同一アカウントで各テナントにアクセスできる機能を提供します。

**ユースケース**:
- ホテルグループで複数施設を管理するスタッフ
- 複数ブランドを横断して業務を行うマネージャー
- 複数テナントのサポートを担当するスーパーアドミン

### 基本方針

#### 正の情報源
**JWTの`tenant_id`と`accessible_tenants`クレームを正の情報源とする**

```typescript
// JWTペイロード例
{
  user_id: "staff-001",
  tenant_id: "hotel-shinagawa",        // 現在アクティブなテナント（正）
  accessible_tenants: [                // アクセス可能なテナント一覧
    "hotel-shinagawa",
    "hotel-shibuya",
    "hotel-ikebukuro"
  ],
  email: "manager@hotel-group.com",
  role: "MANAGER",
  level: 4,
  permissions: ["front_desk", "orders", "statistics"],
  iat: 1735804200,
  exp: 1735832800
}
```

**重要な原則**:
1. `tenant_id`: 現在操作対象のテナント
2. `accessible_tenants`: アクセス権限のあるテナント一覧
3. `accessible_tenants` には必ず `tenant_id` が含まれる
4. テナント切り替え時は新しい `tenant_id` で新規JWTを発行

---

### データベース設計

#### 1. `staff` テーブル（基本情報）

**テーブル名**: `staff`

**設計方針**: 
- ✅ **tenant_id を持たない** - スタッフはテナント非依存のグローバルアカウント
- ✅ **email はグローバルユニーク** - 1つのメールアドレスで複数テナントに所属可能
- ✅ **所属テナント情報は `staff_tenant_memberships` で管理**

**スキーマ**:
```sql
CREATE TABLE staff (
  id                  TEXT PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE,          -- ✅ グローバルユニーク
  name                TEXT NOT NULL,
  password_hash       TEXT,
  failed_login_count  INTEGER DEFAULT 0,
  last_login_at       TIMESTAMP,
  locked_until        TIMESTAMP,
  is_active           BOOLEAN DEFAULT true,
  is_deleted          BOOLEAN DEFAULT false,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_staff_email ON staff(email);
CREATE INDEX idx_staff_is_active ON staff(is_active);
CREATE INDEX idx_staff_is_deleted ON staff(is_deleted);
```

**Prismaモデル**:
```prisma
model staff {
  id                String    @id @default(cuid())
  email             String    @unique                    -- ✅ グローバルユニーク
  name              String
  passwordHash      String?   @map("password_hash")
  failedLoginCount  Int       @default(0) @map("failed_login_count")
  lastLoginAt       DateTime? @map("last_login_at")
  lockedUntil       DateTime? @map("locked_until")
  isActive          Boolean   @default(true) @map("is_active")
  isDeleted         Boolean   @default(false) @map("is_deleted")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  // リレーション
  memberships       StaffTenantMembership[]  -- ✅ 所属テナント一覧
  
  @@index([email])
  @@index([isActive], map: "idx_staff_is_active")
  @@index([isDeleted], map: "idx_staff_is_deleted")
  @@map("staff")
}
```

**重要変更点**:
- ❌ **削除**: `tenant_id` カラム（テナント固定を防ぐ）
- ❌ **削除**: `role`, `department`, `system_access`, `base_level` カラム（これらは `staff_tenant_memberships` で管理）
- ✅ **追加**: `email` にグローバルユニーク制約
- ✅ **追加**: セキュリティフィールド（`failed_login_count`, `locked_until`, `is_deleted`）
- ✅ **変更**: 所属テナント情報・権限は `staff_tenant_memberships` テーブルで管理

---

#### 2. `staff_tenant_memberships` テーブル（複数所属管理）

**テーブル名**: `staff_tenant_memberships`

**目的**: スタッフと所属テナントの多対多関係を管理

**スキーマ**:
```sql
CREATE TABLE staff_tenant_memberships (
  id              TEXT PRIMARY KEY,
  staff_id        TEXT NOT NULL,
  tenant_id       TEXT NOT NULL,
  role            TEXT NOT NULL,              -- テナントごとの役割
  permissions     JSONB DEFAULT '[]',         -- テナント固有の権限
  level           INTEGER,                    -- テナント固有のレベル
  is_active       BOOLEAN DEFAULT true,
  is_primary      BOOLEAN DEFAULT false,      -- 主所属フラグ
  joined_at       TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_membership_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT uniq_staff_tenant UNIQUE (staff_id, tenant_id)
);

CREATE INDEX idx_memberships_staff_id ON staff_tenant_memberships(staff_id);
CREATE INDEX idx_memberships_tenant_id ON staff_tenant_memberships(tenant_id);
CREATE INDEX idx_memberships_is_active ON staff_tenant_memberships(is_active);
CREATE INDEX idx_memberships_is_primary ON staff_tenant_memberships(is_primary);
```

**Prismaモデル**:
```prisma
model StaffTenantMembership {
  id              String    @id @default(cuid())
  staffId         String    @map("staff_id")
  tenantId        String    @map("tenant_id")
  role            String
  permissions     Json      @default("[]")
  level           Int?
  isActive        Boolean   @default(true) @map("is_active")
  isPrimary       Boolean   @default(false) @map("is_primary")
  joinedAt        DateTime  @default(now()) @map("joined_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  // リレーション
  staff           Staff     @relation(fields: [staffId], references: [id], onDelete: Cascade)
  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([staffId, tenantId], map: "uniq_staff_tenant")
  @@index([staffId], map: "idx_memberships_staff_id")
  @@index([tenantId], map: "idx_memberships_tenant_id")
  @@index([isActive], map: "idx_memberships_is_active")
  @@index([isPrimary], map: "idx_memberships_is_primary")
  @@map("staff_tenant_memberships")
}
```

**重要な制約**:
1. `(staff_id, tenant_id)` はユニーク（同一スタッフは同一テナントに1回のみ所属）
2. 各スタッフは1つの主所属テナント (`is_primary = true`) を持つ
3. テナントごとに異なる `role` と `permissions` を設定可能

---

### 認証フロー

#### 1. ログイン時の処理

```typescript
// POST /api/v1/auth/login
{
  email: "manager@hotel-group.com",
  password: "********"
}

// 処理フロー
1. Staffテーブルでメールアドレス検索（✅ グローバルユニーク）
   SELECT * FROM staff WHERE email = ? AND is_active = true AND is_deleted = false
   ※ emailはユニークなので1レコードのみ取得

2. パスワード検証
   - bcrypt.compare(password, staff.password_hash)
   - 失敗時は failed_login_count をインクリメント
   - 5回失敗で locked_until を設定（30分ロック）

3. staff_tenant_memberships から accessible_tenants 取得
   SELECT m.tenant_id, m.role, m.permissions, m.level, m.is_primary, t.name
   FROM staff_tenant_memberships m
   JOIN tenants t ON m.tenant_id = t.id
   WHERE m.staff_id = ? AND m.is_active = true
   ORDER BY m.is_primary DESC, m.joined_at ASC

4. アクティブテナントの決定
   - is_primary = true のテナントを優先
   - なければ最初に所属したテナント（joined_at 昇順の最初）

5. セッション作成（Redis）
   {
     sessionId: "sess_xxx",
     userId: staff.id,
     email: staff.email,
     name: staff.name,
     tenantId: activeTenant.id,           // 現在アクティブなテナント
     role: activeTenant.role,
     permissions: activeTenant.permissions,
     level: activeTenant.level,
     accessibleTenants: [...]             // アクセス可能なテナント一覧
   }

6. Cookie設定
   - "hotel-session-id": sessionId (HttpOnly, Secure, SameSite=Lax)
```

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 28800,
    "tokenType": "Bearer",
    "user": {
      "id": "staff-001",
      "email": "manager@hotel-group.com",
      "name": "山田太郎"
    },
    "currentTenant": {
      "id": "hotel-shinagawa",
      "name": "ホテル品川"
    },
    "accessibleTenants": [
      {
        "id": "hotel-shinagawa",
        "name": "ホテル品川",
        "isPrimary": true
      },
      {
        "id": "hotel-shibuya",
        "name": "ホテル渋谷",
        "isPrimary": false
      },
      {
        "id": "hotel-ikebukuro",
        "name": "ホテル池袋",
        "isPrimary": false
      }
    ]
  },
  "timestamp": "2025-10-05T10:30:00.000Z"
}
```

---

#### 2. テナント切り替えフロー

```typescript
// POST /api/v1/auth/switch-tenant
{
  tenantId: "hotel-shibuya"
}

// 処理フロー
1. 現在のセッションから accessible_tenants 取得
   const session = await redis.get(`session:${sessionId}`);
   const { accessibleTenants, userId } = session;

2. 切り替え先テナントへのアクセス権限検証
   const hasAccess = accessibleTenants.some(t => t.id === tenantId);
   if (!hasAccess) {
     return 403 TENANT_ACCESS_DENIED
   }

3. staff_tenant_memberships からテナント固有の権限取得
   SELECT m.role, m.permissions, m.level, t.name
   FROM staff_tenant_memberships m
   JOIN tenants t ON m.tenant_id = t.id
   WHERE m.staff_id = ? AND m.tenant_id = ? AND m.is_active = true

4. 既存セッション削除
   await redis.del(`session:${oldSessionId}`);

5. 新しいセッション作成
   {
     sessionId: "sess_new_xxx",
     userId: userId,
     email: session.email,
     name: session.name,
     tenantId: newTenantId,               // ✅ 新しいテナントに切り替え
     role: membership.role,
     permissions: membership.permissions,
     level: membership.level,
     accessibleTenants: accessibleTenants  // ✅ 変更なし
   }

6. Cookie更新
   - 古い "hotel-session-id" を削除
   - 新しい "hotel-session-id" を設定
```

**API仕様**:

**エンドポイント**: `POST /api/v1/auth/switch-tenant`

**リクエスト**:
```json
{
  "tenantId": "hotel-shibuya"
}
```

**成功レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "refresh_token_updated",
    "expiresIn": 28800,
    "tokenType": "Bearer",
    "tenant": {
      "id": "hotel-shibuya",
      "name": "ホテル渋谷"
    },
    "role": "STAFF",
    "permissions": ["front_desk", "orders"]
  },
  "timestamp": "2025-10-05T10:35:00.000Z"
}
```

**エラーレスポンス**:

| ステータス | コード | 説明 |
|-----------|--------|------|
| 400 | `TENANT_ID_REQUIRED` | テナントIDが未指定 |
| 403 | `TENANT_ACCESS_DENIED` | 切り替え先テナントへのアクセス権限なし |
| 404 | `TENANT_NOT_FOUND` | 指定されたテナントが存在しない |

---

### セッションデータ仕様

#### セッション構造

**Redis キー**: `hotel:session:{sessionId}`

**データ構造**:
```typescript
interface SessionData {
  userId: string;                     // スタッフID
  tenantId: string;                   // 現在アクティブなテナントID
  accessibleTenants: string[];        // アクセス可能なテナント一覧
  email: string;
  name: string;
  role: 'STAFF' | 'ADMIN' | 'MANAGER' | 'READONLY' | 'SUPER_ADMIN';
  level: number;                      // 1-5（テナント固有）
  permissions: string[];              // テナント固有の権限配列
}
```

**重要な規約**:
1. `accessibleTenants` には必ず `tenantId` が含まれる
2. テナント切り替え時は旧セッションを削除し、新セッションを作成
3. セッションTTL: 3600秒（1時間）

#### セッション作成・更新

```typescript
// セッション作成
const sessionId = cuid();
const sessionData: SessionData = {
  userId: staff.id,
  tenantId: activeTenantId,
  accessibleTenants: memberships.map(m => m.tenantId),
  email: staff.email,
  name: staff.name,
  role: staff.role,
  level: staff.baseLevel,
  permissions: staff.systemAccess?.permissions || []
};

await redis.setex(
  `hotel:session:${sessionId}`,
  3600,  // 1時間
  JSON.stringify(sessionData)
);
```

#### Cookie設定

```typescript
res.cookie('hotel-session-id', sessionId, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000  // 1時間（ミリ秒）
});
```

---

### API実装例

#### hotel-common: 複数テナント対応API

```typescript
// GET /api/v1/admin/front-desk/rooms
router.get('/rooms', 
  sessionAuthMiddleware,       // Session認証
  async (req: Request, res: Response) => {
    try {
      // セッションからテナントIDを取得（正の情報源）
      const session = (req as any).session;
      const tenantId = session?.tenantId;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TENANT_ID_REQUIRED',
            message: 'テナントIDが必要です'
          }
        });
      }

      // accessible_tenants での権限確認（オプション）
      const accessibleTenants = session?.accessibleTenants || [];
      if (!accessibleTenants.includes(tenantId)) {
        return res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Session integrity violation'
          }
        });
      }

      // テナントIDベースでデータ取得
      const rooms = await hotelDb.getAdapter().room.findMany({
        where: { 
          tenantId, 
          isDeleted: false 
        }
      });

      return res.json({
        success: true,
        data: rooms,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    }
  }
);
```

---

### クライアント実装例

#### 1. 基本的なAPI呼び出し（推奨）

```typescript
const response = await $fetch('/api/v1/admin/front-desk/rooms', {
  method: 'GET',
  credentials: 'include'  // Cookie自動送信
});
```

#### 2. テナント切り替え実装

```typescript
async function switchTenant(newTenantId: string) {
  try {
    const response = await $fetch('/api/v1/auth/switch-tenant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',  // Cookie自動送信
      body: { tenantId: newTenantId }
    });

    if (response.success) {
      // ページをリロードしてテナントコンテキストを反映
      window.location.reload();
      
      return response.data;
    } else {
      throw new Error('テナント切替に失敗しました');
    }
  } catch (error: any) {
    console.error('テナント切替エラー:', error);
    throw new Error(error.data?.error?.message || 'テナント切替に失敗しました');
  }
}
```

---

### UI実装ガイドライン

#### テナント切り替えUI仕様

##### 1. 配置とレイアウト

**実装場所**: 管理画面ヘッダー（グローバルナビゲーション）

**既存の「テナント情報」表示を置き換え**:
- 現在: 静的なテナント情報テキスト
- 変更後: インタラクティブなテナント切り替えボタン

**配置位置**:
- ヘッダー右上
- ユーザーメニューの左隣
- ロゴから見て右端エリア

**サイズ**:
- 最小幅: 180px
- 最大幅: 280px
- 高さ: 40px（ヘッダーの標準ボタン高さに合わせる）
- モバイル: 幅100%、高さ48px

**余白**:
- 左側: 16px（前の要素との間隔）
- 右側: 16px（ユーザーメニューとの間隔）

---

##### 2. 表示パターン

**パターンA: 単一テナントのみ所属**

表示内容:
```
[🏨 ホテル品川]
```

特徴:
- ドロップダウンなし（クリック不可）
- アイコン + テナント名のみ表示
- グレーアウト表示（背景: gray-100）
- カーソル: default

使用ケース:
- accessibleTenants.length === 1

---

**パターンB: 複数テナント所属（2〜5件）**

表示内容:
```
[🏨 ホテル品川 ▼]
```

特徴:
- ドロップダウンボタン
- アイコン + テナント名 + 下向き矢印
- ホバー時: 背景色変化（hover:bg-gray-50）
- カーソル: pointer
- ドロップダウンメニュー: すべてのテナントを一覧表示

使用ケース:
- 2 <= accessibleTenants.length <= 5

---

**パターンC: 複数テナント所属（6件以上）**

表示内容:
```
[🏨 ホテル品川 (全12店舗) ▼]
```

特徴:
- テナント名 + 所属数の表示
- ドロップダウンメニュー: スクロール可能
- 最大表示高さ: 400px
- 検索ボックスを上部に表示（10件以上の場合）

使用ケース:
- accessibleTenants.length >= 6

---

##### 3. ドロップダウンメニュー仕様

**メニュー項目の構造**:

```
┌─────────────────────────────┐
│ 🔍 テナント検索 (10件以上)   │ ← 検索ボックス（オプション）
├─────────────────────────────┤
│ ✓ 🏨 ホテル品川 ★           │ ← 現在のテナント（太字、チェック、主所属マーク）
│   🏨 ホテル渋谷              │ ← その他のテナント
│   🏨 ホテル池袋 ★           │ ← 主所属だが非アクティブ
│   🏨 ホテル新宿              │
│   ...                        │
└─────────────────────────────┘
```

**各要素の説明**:

| 要素 | 説明 |
|-----|------|
| ✓ チェックマーク | 現在アクティブなテナント |
| 🏨 ビルアイコン | テナントを示すアイコン |
| ★ 星マーク | 主所属テナント（is_primary = true） |
| 太字 | 現在のテナント名 |
| 通常 | その他のテナント名 |

**ソート順**:
1. 現在のテナント（最上位固定）
2. 主所属テナント（is_primary = true）
3. その他のテナント（アルファベット順、日本語は五十音順）

**メニュー項目のスタイル**:
- デフォルト: 背景白、テキスト黒
- ホバー: 背景 gray-50
- アクティブ: 背景 blue-50、テキスト blue-700、太字
- 無効化: 背景白、テキスト gray-400、カーソル not-allowed

**最大表示数**:
- 5件まで: スクロールなし
- 6件以上: スクロール可能、最大高さ400px
- 10件以上: 検索ボックス表示

---

##### 4. 確認ダイアログ仕様

**表示条件**:
- 常に表示（ユーザーの意図しない切り替えを防止）

**ダイアログ内容**:

```
┌───────────────────────────────────┐
│  ⚠️  テナント切り替え確認         │
├───────────────────────────────────┤
│                                   │
│  テナントを以下に切り替えますか？  │
│                                   │
│  【切り替え先】                    │
│  🏨 ホテル渋谷                    │
│                                   │
│  ⚠️ 注意:                        │
│  - 現在のページの内容は保存されません│
│  - 未保存の変更は失われます        │
│                                   │
│  [ キャンセル ]    [ 切り替える ]  │
│                                   │
└───────────────────────────────────┘
```

**ボタン仕様**:
- キャンセル: secondary、左側、グレー系
- 切り替える: primary、右側、ブルー系、太字

**キーボード操作**:
- Esc: キャンセル
- Enter: 切り替え実行

---

##### 5. ローディング・エラー状態

**切り替え中の表示**:

```
[⏳ 切り替え中... ]
```

- ボタン無効化（disabled）
- スピナーアイコン表示
- テキスト: "切り替え中..."
- 背景: グレーアウト
- カーソル: wait

**切り替え成功時**:

```
[✓ 切り替え完了 ]
```

- 0.5秒間表示
- その後ページリロード
- トースト通知（オプション）:
  ```
  ✓ ホテル渋谷に切り替えました
  ```

**切り替え失敗時**:

- トースト通知（エラー）:
  ```
  ✗ テナント切り替えに失敗しました
  [エラー詳細メッセージ]
  ```
- ボタンを元の状態に戻す
- 現在のテナントを維持

---

##### 6. 実装例（Vue 3 / Nuxt 3）

**コンポーネント**: `/components/TenantSwitcher.vue`

```vue
<template>
  <div class="tenant-switcher">
    <!-- パターンA: 単一テナント -->
    <div 
      v-if="accessibleTenants.length === 1"
      class="tenant-display-only"
    >
      <Icon name="heroicons:building-office-2-solid" />
      <span>{{ currentTenant?.name }}</span>
    </div>
    
    <!-- パターンB・C: 複数テナント -->
    <UDropdown 
      v-else
      :items="tenantMenuItems"
      :popper="{ placement: 'bottom-end' }"
    >
      <UButton
        color="white"
        variant="outline"
        :label="tenantLabel"
        trailing-icon="i-heroicons-chevron-down-20-solid"
        :loading="isSwitching"
        :disabled="isSwitching"
      >
        <template #leading>
          <Icon name="heroicons:building-office-2-solid" />
        </template>
      </UButton>
    </UDropdown>
  </div>
</template>

<script setup lang="ts">
const { currentTenant, accessibleTenants, switchTenant } = useSessionAuth();
const toast = useToast();
const isSwitching = ref(false);

// テナント表示ラベル
const tenantLabel = computed(() => {
  if (!currentTenant.value) return 'テナント選択';
  
  const name = currentTenant.value.name;
  const count = accessibleTenants.value.length;
  
  // 6件以上の場合、件数を表示
  return count >= 6 
    ? `${name} (全${count}店舗)` 
    : name;
});

// ドロップダウンメニュー項目
const tenantMenuItems = computed(() => {
  // ソート: 現在 > 主所属 > その他
  const sorted = [...accessibleTenants.value].sort((a, b) => {
    // 現在のテナントは最上位
    if (a.id === currentTenant.value?.id) return -1;
    if (b.id === currentTenant.value?.id) return 1;
    
    // 主所属を次に
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    
    // それ以外は名前順
    return a.name.localeCompare(b.name, 'ja');
  });
  
  return [
    sorted.map(tenant => ({
      label: tenant.name,
      icon: tenant.id === currentTenant.value?.id 
        ? 'i-heroicons-check-20-solid' 
        : 'i-heroicons-building-office-2-20-solid',
      iconClass: tenant.isPrimary ? 'text-yellow-500' : undefined,
      labelClass: tenant.id === currentTenant.value?.id 
        ? 'font-bold text-blue-700' 
        : undefined,
      click: () => handleTenantSwitch(tenant.id),
      disabled: tenant.id === currentTenant.value?.id,
      // 主所属の場合、星マークを追加
      suffix: tenant.isPrimary ? '★' : undefined
    }))
  ];
});

async function handleTenantSwitch(tenantId: string) {
  if (tenantId === currentTenant.value?.id) return;
  
  // 確認ダイアログ
  const targetTenant = accessibleTenants.value.find(t => t.id === tenantId);
  const confirmed = confirm(
    `テナントを以下に切り替えますか？\n\n` +
    `【切り替え先】\n${targetTenant?.name}\n\n` +
    `⚠️ 注意:\n` +
    `- 現在のページの内容は保存されません\n` +
    `- 未保存の変更は失われます`
  );
  
  if (!confirmed) return;
  
  isSwitching.value = true;

  try {
    await switchTenant(tenantId);
    
    // 成功通知
    toast.add({
      title: 'テナント切替成功',
      description: `${targetTenant?.name} に切り替えました`,
      color: 'green',
      timeout: 2000
    });
    
    // ページリロード
    setTimeout(() => {
      window.location.reload();
    }, 500);
    
  } catch (error: any) {
    isSwitching.value = false;
    
    // エラー通知
    toast.add({
      title: 'テナント切替エラー',
      description: error.message || 'テナント切替に失敗しました',
      color: 'red',
      timeout: 5000
    });
  }
}
</script>

<style scoped>
.tenant-switcher {
  display: inline-flex;
  align-items: center;
  min-width: 180px;
  max-width: 280px;
}

.tenant-display-only {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f3f4f6;
  border-radius: 0.375rem;
  color: #6b7280;
  cursor: default;
  font-size: 0.875rem;
}

/* モバイル対応 */
@media (max-width: 640px) {
  .tenant-switcher {
    width: 100%;
    max-width: 100%;
  }
}
</style>
```

---

##### 7. レイアウトへの組み込み

**ファイル**: `/layouts/admin.vue`

```vue
<template>
  <div class="admin-layout">
    <header class="admin-header">
      <div class="header-left">
        <NuxtLink to="/admin" class="logo">
          <img src="/logo.svg" alt="Hotel Management" />
        </NuxtLink>
      </div>
      
      <div class="header-right">
        <!-- ✅ 既存の「テナント情報」表示を置き換え -->
        <TenantSwitcher />
        
        <!-- 通知アイコン -->
        <NotificationBell v-if="user" />
        
        <!-- ユーザーメニュー -->
        <UserMenu v-if="user" />
      </div>
    </header>
    
    <div class="admin-content">
      <aside class="admin-sidebar">
        <AdminNavigation />
      </aside>
      
      <main class="admin-main">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user, accessibleTenants } = useSessionAuth();
</script>

<style scoped>
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 64px;
  padding: 0 1.5rem;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* モバイル: ヘッダーをコンパクトに */
@media (max-width: 640px) {
  .admin-header {
    height: 56px;
    padding: 0 1rem;
  }
  
  .header-right {
    gap: 0.5rem;
  }
}
</style>
```

---

##### 8. アクセシビリティ

**キーボード操作**:
- Tab: フォーカス移動
- Enter / Space: ドロップダウンを開く
- ↑ / ↓: メニュー項目間を移動
- Enter: テナント選択
- Esc: ドロップダウンを閉じる

**ARIA属性**:
```vue
<UButton
  role="button"
  :aria-label="`現在のテナント: ${currentTenant?.name}。クリックしてテナントを切り替え`"
  :aria-expanded="isOpen"
  aria-haspopup="menu"
>
  <!-- ボタン内容 -->
</UButton>
```

**スクリーンリーダー対応**:
- ボタン: "現在のテナント: ホテル品川。クリックしてテナントを切り替え"
- メニュー項目: "ホテル渋谷に切り替え。主所属テナント"
- 現在のテナント: "ホテル品川。現在選択中"

---

##### 9. パフォーマンス最適化

**遅延読み込み**:
- ドロップダウンメニューは初回クリック時に描画
- テナント一覧は事前にキャッシュ

**メモ化**:
```typescript
const tenantMenuItems = computed(() => {
  // メニュー項目の計算結果をキャッシュ
});
```

**デバウンス**:
- 検索ボックス（10件以上の場合）: 300ms デバウンス

---

##### 10. 既存コードからの移行

**削除する箇所**:
```vue
<!-- ❌ 削除: 静的なテナント情報表示 -->
<div class="tenant-info">
  <span>テナント情報</span>
  <span>{{ tenantName }}</span>
</div>
```

**追加する箇所**:
```vue
<!-- ✅ 追加: インタラクティブなテナント切り替え -->
<TenantSwitcher />
```

**移行手順**:
1. `TenantSwitcher.vue` コンポーネントを作成
2. `admin.vue` レイアウトで既存の「テナント情報」部分を探す
3. `<TenantSwitcher />` で置き換え
4. スタイル調整（既存のヘッダーデザインに合わせる）
5. 動作確認

---

### セキュリティ考慮事項

#### 1. トークン整合性検証

```typescript
// accessible_tenants内にtenant_idが含まれているかチェック
if (!req.user.accessible_tenants.includes(req.user.tenant_id)) {
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Token integrity violation'
    }
  });
}
```

#### 2. 権限判定ロジック

```typescript
// SUPER_ADMIN: 全テナントアクセス可能
if (req.user.role === 'SUPER_ADMIN') {
  // 制限なし
} else {
  // 通常ユーザー: accessible_tenantsに含まれるテナントのみ
  if (!req.user.accessible_tenants.includes(targetTenantId)) {
    return res.status(403).json({
      error: {
        code: 'TENANT_ACCESS_DENIED',
        message: 'Access to target tenant not allowed'
      }
    });
  }
}
```

#### 3. レート制限（推奨）

```typescript
// テナント切替API
'/api/v1/auth/switch-tenant': {
  windowMs: 60 * 1000,    // 1分間
  max: 5,                 // 最大5回
  message: 'Too many tenant switch attempts'
}
```

**現状**: 未実装（実装推奨）

---

### エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `TENANT_ID_REQUIRED` | 400 | テナントIDが必要だが取得できない |
| `TENANT_ACCESS_DENIED` | 403 | テナントへのアクセス権限なし |
| `TENANT_NOT_FOUND` | 404 | 指定されたテナントが存在しない |
| `SESSION_INVALID` | 401 | セッションが無効または期限切れ |
| `INTERNAL_ERROR` | 500 | セッション整合性違反等のシステムエラー |

---

### 実装状況

| 項目 | 状態 | 説明 |
|------|------|------|
| `staff` テーブル | ❌ 未実装 | hotel-common / hotel-saas どちらにも未実装 |
| `staff_tenant_memberships` テーブル | ❌ 未実装 | 新規作成必要 |
| ログインAPI（複数テナント対応） | ⚠️ 部分実装 | 基本ログインは実装済みだが、accessible_tenants取得未実装 |
| テナント切替API | ❌ 未実装 | `POST /api/v1/auth/switch-tenant` 未実装 |
| Session accessible_tenants | ❌ 未実装 | Sessionデータに未追加 |
| UI（テナント選択） | ❌ 未実装 | 管理画面ヘッダーに未追加 |

---

### マイグレーション手順

#### Phase 1: データベーススキーマ追加

```sql
-- 🔴 重要: 既存の staff テーブルに tenant_id がある場合は削除が必要

-- 1. staff テーブルの修正（hotel-common）

-- 既存の tenant_id カラムを削除
ALTER TABLE staff DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE staff DROP COLUMN IF EXISTS role;
ALTER TABLE staff DROP COLUMN IF EXISTS department;
ALTER TABLE staff DROP COLUMN IF EXISTS system_access;
ALTER TABLE staff DROP COLUMN IF EXISTS base_level;

-- email をグローバルユニークに変更
ALTER TABLE staff DROP CONSTRAINT IF EXISTS staff_tenant_id_email_key;
ALTER TABLE staff ADD CONSTRAINT staff_email_unique UNIQUE (email);

-- セキュリティカラムを追加
ALTER TABLE staff ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- インデックス再構築
DROP INDEX IF EXISTS idx_staff_tenant_id;
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff(email);
CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_is_deleted ON staff(is_deleted);

-- 2. staff_tenant_membershipsテーブル作成
CREATE TABLE staff_tenant_memberships (
  id              TEXT PRIMARY KEY,
  staff_id        TEXT NOT NULL,
  tenant_id       TEXT NOT NULL,
  role            TEXT NOT NULL,
  permissions     JSONB DEFAULT '[]',
  level           INTEGER,
  is_active       BOOLEAN DEFAULT true,
  is_primary      BOOLEAN DEFAULT false,
  joined_at       TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_membership_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT uniq_staff_tenant UNIQUE (staff_id, tenant_id)
);

CREATE INDEX idx_memberships_staff_id ON staff_tenant_memberships(staff_id);
CREATE INDEX idx_memberships_tenant_id ON staff_tenant_memberships(tenant_id);
CREATE INDEX idx_memberships_is_active ON staff_tenant_memberships(is_active);
CREATE INDEX idx_memberships_is_primary ON staff_tenant_memberships(is_primary);
```

#### Phase 2: Prismaスキーマ追加

`/Users/kaneko/hotel-common/prisma/schema.prisma` に追加

#### Phase 3: API実装

1. ログインAPI更新（`accessible_tenants`取得）
2. テナント切替API実装（`POST /api/v1/auth/switch-tenant`）
3. Session生成ロジック更新（`accessible_tenants`データ追加）

#### Phase 4: UI実装

1. 管理画面ヘッダーにテナント選択UI追加
2. テナント切り替え機能実装
3. 現在のテナント表示

---

### テスト項目

#### 単体テスト

1. ✅ Session認証での認証成功
2. ❌ アクセス権限なしテナントへの切替時の403エラー
3. ❌ 無効なSessionでの401エラー
4. ❌ Redis接続エラー時の503エラー
5. ❌ 旧セッション削除の確認

#### 統合テスト

1. ✅ マルチテナント環境での動作確認
2. ❌ テナント切替後のAPI動作確認
3. ❌ 権限継承の確認
4. ❌ 複数テナント所属スタッフのログイン確認

---

### 運用・監視

#### ログ出力項目

```typescript
// 認証ログ
{
  "event": "auth_success",
  "user_id": "staff-001",
  "email": "manager@hotel-group.com",
  "tenant_id": "hotel-shinagawa",
  "accessible_tenants": ["hotel-shinagawa", "hotel-shibuya", "hotel-ikebukuro"],
  "request_id": "req_1735804200000_abc123",
  "timestamp": "2025-10-05T10:30:00.000Z"
}

// テナント切替ログ
{
  "event": "tenant_switch",
  "user_id": "staff-001",
  "from_tenant": "hotel-shinagawa",
  "to_tenant": "hotel-shibuya",
  "success": true,
  "request_id": "req_1735804200000_abc124",
  "timestamp": "2025-10-05T10:31:00.000Z"
}
```

#### メトリクス監視

- テナント切替頻度
- 認証エラー率
- `TENANT_MISMATCH`エラー発生率
- 複数テナント所属スタッフの割合

---

## ⭐ 主所属テナント変更機能

### 概要

**目的**: ログインユーザー本人が自分の主所属テナント（★マーク）を変更できる機能を提供します。

**特徴**:
- 特別な権限は不要（アクセス可能なテナントであれば誰でも変更可能）
- 主所属テナントは、ログイン時に最初に表示されるテナント
- UIで★マークで視覚的に識別
- ページリロード不要でリアルタイム更新

**ユースケース**:
- 複数ホテルを担当するスタッフが、メインで作業するホテルを変更
- 異動や担当変更に伴う主所属の切り替え
- ログイン時のデフォルトテナントの設定

---

### データベース設計

#### `staff_tenant_memberships` テーブル

主所属管理に使用するフィールド:

```sql
CREATE TABLE staff_tenant_memberships (
  -- ... 既存フィールド
  is_primary      BOOLEAN DEFAULT false,      -- 主所属フラグ ⭐
  joined_at       TIMESTAMP DEFAULT NOW(),    -- 加入日時（自動主所属判定に使用）
  -- ...
);

CREATE INDEX idx_memberships_is_primary ON staff_tenant_memberships(is_primary);
```

**主所属の自動設定ルール**:
1. ユーザーが複数テナントに所属している場合、`is_primary=true`のテナントが主所属
2. `is_primary`が未設定の場合、**最も早く加入したテナント**（`joined_at`が最小）を自動的に主所属に設定
3. ログイン時に主所属テナントが`currentTenant`として設定される

**制約**:
- 各スタッフは**必ず1つの主所属テナント**を持つ
- `is_primary=true`は1スタッフにつき1レコードのみ

---

### API仕様

#### hotel-common: `POST /api/v1/auth/set-primary-tenant`

**目的**: 主所属テナントを変更し、Redisセッションを更新

**リクエスト**:
```typescript
{
  tenantId: string  // 新しい主所属に設定するテナントID
}
```

**レスポンス**:
```typescript
{
  success: true,
  data: {
    currentTenant: {
      id: string,
      name: string
    },
    accessibleTenants: Array<{
      id: string,
      name: string,
      isPrimary: boolean  // 更新後のフラグ
    }>
  }
}
```

**処理フロー**:

```typescript
// 1. セッションからユーザー情報を取得
const session = req.session;
const staffId = session.user.id;

// 2. アクセス権限を確認
const accessibleTenantIds = session.accessibleTenants.map(t => t.id);
if (!accessibleTenantIds.includes(tenantId)) {
  throw new Error('指定されたテナントへのアクセス権限がありません');
}

// 3. テナント存在確認
const tenant = await hotelDb.getAdapter().tenant.findUnique({
  where: { id: tenantId }
});
if (!tenant) {
  throw new Error('指定されたテナントが見つかりません');
}

// 4. トランザクションで主所属を更新
await hotelDb.getAdapter().$transaction(async (tx) => {
  // 既存の is_primary=true を全て false に変更
  await tx.staffTenantMembership.updateMany({
    where: {
      staffId,
      isPrimary: true
    },
    data: {
      isPrimary: false
    }
  });
  
  // 指定されたテナントの is_primary を true に設定
  await tx.staffTenantMembership.update({
    where: {
      staffId_tenantId: {
        staffId,
        tenantId
      }
    },
    data: {
      isPrimary: true
    }
  });
});

// 5. 更新後の memberships を取得
const updatedMemberships = await hotelDb.getAdapter().staffTenantMembership.findMany({
  where: { staffId },
  include: { tenant: true }
});

// 6. 🔴 重要: Redisセッションを更新
const updatedMembership = updatedMemberships.find(m => m.tenantId === tenantId);
const updatedSession = {
  ...session,
  tenant_id: tenantId,  // ← 重要！現在のテナントIDを更新
  role: updatedMembership?.role || session.role,  // ← テナント固有のroleを更新
  level: updatedMembership?.level || session.level,  // ← テナント固有のlevelを更新
  permissions: updatedMembership?.permissions || session.permissions,  // ← テナント固有のpermissionsを更新
  currentTenant: {
    id: tenantId,
    name: tenant.name
  },
  accessibleTenants: updatedMemberships.map(m => ({
    id: m.tenantId,
    name: m.tenant.name,
    isPrimary: m.isPrimary
  }))
};

// Redisセッション更新（TTL: 24時間）
await redis.set(
  `hotel:session:${sessionId}`,
  JSON.stringify(updatedSession),
  'EX',
  86400
);
```

**実装ファイル**:
- `/Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts` (line 440-570)

**重要な実装ポイント**:

```typescript
// ❌ 修正前（tenant_idが更新されず403エラー）
const updatedSession = {
  ...session,
  accessibleTenants,
  currentTenant: { id: tenantId, name: tenant.name }
};

// ✅ 修正後（tenant_id、role、level、permissionsも更新）
const updatedMembership = updatedMemberships.find(m => m.tenantId === tenantId);
const updatedSession = {
  ...session,
  tenant_id: tenantId,  // ← 重要！
  role: updatedMembership?.role || session.role,
  level: updatedMembership?.level || session.level,
  permissions: updatedMembership?.permissions || session.permissions,
  accessibleTenants: updatedMemberships.map(m => ({
    id: m.tenantId,
    name: m.tenant.name,
    isPrimary: m.isPrimary
  })),
  currentTenant: { id: tenantId, name: tenant.name }
};
```

**理由**: 
1. 主所属変更後、`tenant_id`が古いままだと、他のAPIで`tenant_id`ベースの権限チェックが失敗し、403エラーが発生します。
2. テナントごとに`role`、`level`、`permissions`が異なるため、これらも必ず更新する必要があります。
3. `accessibleTenants`の`isPrimary`フラグも更新して、UIで★マークが正しく表示されるようにします。

---

#### hotel-saas: `POST /api/v1/auth/set-primary-tenant`

**目的**: hotel-commonへのプロキシAPI

**実装ファイル**:
- `/Users/kaneko/hotel-saas/server/api/v1/auth/set-primary-tenant.post.ts`

**完全な実装コード**:

```typescript
import { defineEventHandler, readBody, getCookie } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // リクエストボディ取得
    const body = await readBody(event);
    const { tenantId } = body;

    if (!tenantId) {
      return {
        success: false,
        error: {
          code: 'TENANT_ID_REQUIRED',
          message: 'テナントIDが必要です'
        }
      };
    }

    // Cookie取得（hotel-commonに転送）
    const sessionCookie = getCookie(event, 'hotel_session');
    if (!sessionCookie) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '認証が必要です'
        }
      };
    }

    // hotel-commonのAPIを呼び出し
    const response = await $fetch('http://localhost:3400/api/v1/auth/set-primary-tenant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `hotel_session=${sessionCookie}`
      },
      body: { tenantId }
    });

    // 🔴 重要: 二重ネストを解消
    return {
      success: response.success && response.data?.success,
      data: response.data?.data  // ← 内側のdataを抽出
    };
  } catch (error: any) {
    console.error('主所属変更エラー:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || '主所属の変更に失敗しました'
      }
    };
  }
});
```

**重要な修正ポイント**:

```typescript
// ❌ 修正前（二重ネストでフロントエンドがエラー）
return response;  // hotel-commonのレスポンスをそのまま返す

// ✅ 修正後（内側のdataを抽出）
return {
  success: response.success && response.data?.success,
  data: response.data?.data  // ← 二重ネストを解消
};
```

**理由**: `hotel-common`が`StandardResponseBuilder`でラップするため、以下の構造になります:

```typescript
// hotel-commonからのレスポンス（二重ネスト）
{
  success: true,
  data: {
    success: true,  // ← 内側のsuccess
    data: {         // ← 内側のdata
      currentTenant: {...},
      accessibleTenants: [...]
    }
  }
}

// hotel-saasプロキシAPIが返すべき構造（フロントエンドが期待する形）
{
  success: true,
  data: {
    currentTenant: {...},
    accessibleTenants: [...]
  }
}
```

プロキシAPIで内側の`data`を抽出することで、フロントエンドが期待する構造に変換します。

---

### フロントエンド実装

#### Composable: `useSessionAuth.ts`

**追加メソッド**: `setPrimaryTenant`

**実装ファイル**:
- `/Users/kaneko/hotel-saas/composables/useSessionAuth.ts` (line 213-241)

**完全な実装コード**:

```typescript
/**
 * 主所属テナントを変更
 * @param tenantId 新しい主所属に設定するテナントID
 * @returns 成功時true、失敗時false
 */
const setPrimaryTenant = async (tenantId: string): Promise<boolean> => {
  try {
    const response = await $fetch<{
      success: boolean
      data: {
        currentTenant: { id: string; name: string }
        accessibleTenants: Array<{ id: string; name: string; isPrimary: boolean }>
      }
    }>('/api/v1/auth/set-primary-tenant', {
      method: 'POST',
      credentials: 'include',
      body: { tenantId }
    });

    if (response.success) {
      // グローバル状態を更新（ページリロード不要）
      globalCurrentTenant.value = response.data.currentTenant;
      globalAccessibleTenants.value = response.data.accessibleTenants;
      
      console.log('主所属変更成功:', {
        newTenant: response.data.currentTenant,
        accessibleTenants: response.data.accessibleTenants
      });
      
      return true;
    }
    return false;
  } catch (error: any) {
    console.error('主所属変更エラー:', error);
    throw new Error(error.data?.error?.message || '主所属の変更に失敗しました');
  }
};

return {
  // ... 既存のメソッド
  currentTenant,
  accessibleTenants,
  switchTenant,
  setPrimaryTenant  // ← 追加
};
```

**重要なポイント**:
1. `credentials: 'include'` でCookieを自動送信
2. グローバル状態（`globalCurrentTenant`、`globalAccessibleTenants`）を更新することで、ページリロード不要で★マークが移動
3. エラー時は詳細なメッセージを含む`Error`をthrow

---

#### コンポーネント: `TenantSwitcher.vue`

**実装ファイル**:
- `/Users/kaneko/hotel-saas/components/TenantSwitcher.vue` (line 5, 13, 60-80)

**完全な実装コード**:

```vue
<template>
  <div class="tenant-switcher">
    <!-- パターンA: 単一テナント（nullチェック追加） -->
    <div 
      v-if="accessibleTenants && accessibleTenants.length === 1"
      class="tenant-display-only"
    >
      <Icon name="heroicons:building-office-2-solid" />
      <span>{{ currentTenant?.name }}</span>
    </div>
    
    <!-- パターンB: 複数テナント -->
    <UDropdown 
      v-else-if="accessibleTenants && accessibleTenants.length > 1"
      :items="tenantMenuItems"
      :popper="{ placement: 'bottom-end' }"
    >
      <template #item="{ item }">
        <div class="flex items-center justify-between w-full">
          <span>{{ item.label }}</span>
          
          <!-- 主所属マーク（★）-->
          <button
            v-if="item.isPrimary"
            class="text-yellow-500 cursor-default ml-2"
            title="主所属"
            disabled
          >
            ★
          </button>
          
          <!-- 主所属に設定ボタン（☆）-->
          <button
            v-else
            @click.stop="handleSetPrimary(item.id)"
            class="text-gray-300 hover:text-yellow-500 ml-2"
            :title="`${item.label}を主所属に設定`"
          >
            ☆
          </button>
        </div>
      </template>
    </UDropdown>
  </div>
</template>

<script setup lang="ts">
const { currentTenant, accessibleTenants, setPrimaryTenant } = useSessionAuth();
const toast = useToast();

// 確認モーダル用の状態
const showPrimaryConfirmModal = ref(false);
const targetTenantForPrimary = ref<{ id: string; name: string } | null>(null);

// ドロップダウンメニュー項目
const tenantMenuItems = computed(() => {
  if (!accessibleTenants.value) return [];
  
  // ソート: 現在 > 主所属 > その他
  const sorted = [...accessibleTenants.value].sort((a, b) => {
    if (a.id === currentTenant.value?.id) return -1;
    if (b.id === currentTenant.value?.id) return 1;
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.name.localeCompare(b.name, 'ja');
  });
  
  return [
    sorted.map(tenant => ({
      id: tenant.id,
      label: tenant.name,
      isPrimary: tenant.isPrimary,
      icon: tenant.id === currentTenant.value?.id 
        ? 'i-heroicons-check-20-solid' 
        : 'i-heroicons-building-office-2-20-solid',
      disabled: tenant.id === currentTenant.value?.id
    }))
  ];
});

// 主所属設定処理
const handleSetPrimary = (tenantId: string) => {
  const targetTenant = accessibleTenants.value?.find(t => t.id === tenantId);
  if (!targetTenant) return;
  
  targetTenantForPrimary.value = targetTenant;
  showPrimaryConfirmModal.value = true;
};

// 確認モーダル - 設定する
const handleConfirmSetPrimary = async () => {
  if (!targetTenantForPrimary.value) return;
  
  try {
    await setPrimaryTenant(targetTenantForPrimary.value.id);
    
    // 成功通知（SSOT準拠: useToast使用）
    toast.success(
      '主所属変更成功',
      `${targetTenantForPrimary.value.name} を主所属に設定しました`,
      2000
    );
  } catch (error: any) {
    // エラー通知（SSOT準拠: useToast使用）
    toast.error(
      '主所属変更エラー',
      error.message || '主所属の変更に失敗しました',
      5000
    );
  } finally {
    showPrimaryConfirmModal.value = false;
    targetTenantForPrimary.value = null;
  }
};

// 確認モーダル - キャンセル
const handleCancelSetPrimary = () => {
  showPrimaryConfirmModal.value = false;
  targetTenantForPrimary.value = null;
};
</script>

<style scoped>
.tenant-switcher {
  display: inline-flex;
  align-items: center;
  min-width: 180px;
  max-width: 280px;
}

.tenant-display-only {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f3f4f6;
  border-radius: 0.375rem;
  color: #6b7280;
  cursor: default;
  font-size: 0.875rem;
}
</style>
```

**重要な修正ポイント**:

```vue
<!-- ❌ 修正前（accessibleTenantsがundefinedでエラー）-->
<div v-if="accessibleTenants.length === 1">

<!-- ✅ 修正後（nullチェック追加）-->
<div v-if="accessibleTenants && accessibleTenants.length === 1">
```

**理由**: 
1. `accessibleTenants`が初期化前に`undefined`になる可能性があるため、必ずnullチェックを行う
2. 確認モーダルは`ConfirmModal`コンポーネントを使用（SSOT準拠: `confirm()`使用禁止）
3. 成功・エラー通知は`useToast`を使用（SSOT準拠: `alert()`使用禁止）

---

### UI/UX仕様

#### 表示仕様

| 状態 | 表示 | 色 | 操作 |
|------|------|-----|------|
| **主所属テナント** | ★ | `text-yellow-500`（黄色） | クリック不可 |
| **非主所属テナント** | ☆ | `text-gray-300`（グレー）<br>ホバー時: `text-yellow-500` | クリックで主所属に設定 |

#### 操作フロー

```
1. ユーザーがテナントスイッチャーをクリック
   ↓
2. ドロップダウンメニューが表示される
   - 現在のテナント: ✓マーク + ★または☆
   - 他のテナント: ★または☆
   ↓
3. ☆ボタンをクリック
   ↓
4. 確認モーダル表示（ConfirmModal）
   - タイトル: 「主所属変更確認」
   - メッセージ: 「{テナント名}を主所属に設定しますか？」
   - ボタン: 「設定する」「キャンセル」
   ↓
5. 「設定する」をクリック
   ↓
6. API呼び出し（POST /api/v1/auth/set-primary-tenant）
   ↓
7. 成功トースト表示（2秒）
   - タイトル: 「主所属変更成功」
   - メッセージ: 「{テナント名} を主所属に設定しました」
   ↓
8. ★マークが移動（ページリロード不要）
```

#### 禁止事項（SSOT準拠）

```typescript
// ❌ ブラウザデフォルトUI使用禁止
confirm('主所属を変更しますか？');  // ← 禁止
alert('変更しました');  // ← 禁止

// ✅ SSOT準拠の実装
showConfirmModal({ ... });  // ← ConfirmModalコンポーネント使用
toast.success('変更しました');  // ← useToast使用
```

**参照**: [SSOT_ADMIN_UI_DESIGN.md - UI/UX統一ルール](../01_admin_features/SSOT_ADMIN_UI_DESIGN.md#uiux統一ルール)

---

### 動作フロー（システム全体）

```
1. TenantSwitcher.vue
   ↓ handleSetPrimary(tenantId)
   
2. useSessionAuth.ts
   ↓ setPrimaryTenant(tenantId)
   
3. hotel-saas: POST /api/v1/auth/set-primary-tenant
   ↓ プロキシ（Cookie転送）
   
4. hotel-common: POST /api/v1/auth/set-primary-tenant
   ↓ トランザクション実行
   ├─ staff_tenant_memberships 更新
   │  ├─ 既存の is_primary=true を false に変更
   │  └─ 指定テナントの is_primary を true に設定
   └─ Redisセッション更新
      ├─ tenant_id 更新
      ├─ role 更新
      ├─ level 更新
      ├─ permissions 更新
      ├─ currentTenant 更新
      └─ accessibleTenants 更新
   
5. レスポンス返却
   ↓ 二重ネスト解消（hotel-saasプロキシ）
   
6. useSessionAuth.ts
   ↓ グローバル状態更新
   ├─ globalCurrentTenant.value 更新
   └─ globalAccessibleTenants.value 更新
   
7. TenantSwitcher.vue
   ↓ UI更新（★マーク移動）
   
8. 成功トースト表示
```

---

### 重要な技術的注意点

#### ⚠️ 問題1: tenant_id未更新による403エラー

**症状**: 主所属変更後、`/api/v1/admin/summary`などで403エラー

**原因**: Redisセッションの`tenant_id`が古いテナントのまま

**解決**: `hotel-common`の`set-primary-tenant`エンドポイントで`tenant_id`、`role`、`level`、`permissions`を更新

```typescript
// ✅ 必須: tenant_id, role, level, permissions を更新
const updatedSession = {
  ...session,
  tenant_id: tenantId,  // ← 重要！
  role: updatedMembership.role,
  level: updatedMembership.level,
  permissions: updatedMembership.permissions,
  currentTenant: { id: tenantId, name: tenant.name },
  accessibleTenants: [...]
};
```

---

#### ⚠️ 問題2: 二重ネストによるTypeError

**症状**: `Cannot read properties of undefined (reading 'name')`

**原因**: `hotel-common`が`StandardResponseBuilder`でラップするため、レスポンスが二重ネスト

**解決**: `hotel-saas`のプロキシAPIで内側の`data`を抽出して返す

```typescript
// ✅ 二重ネストを解消
return {
  success: response.success && response.data?.success,
  data: response.data?.data  // ← 内側のdataを抽出
};
```

---

#### ⚠️ 問題3: accessibleTenants未定義エラー

**症状**: `Cannot read properties of undefined (reading 'length')`

**原因**: `TenantSwitcher.vue`で`accessibleTenants`のnullチェック不足

**解決**: nullチェックを追加

```vue
<!-- ✅ nullチェック追加 -->
<div v-if="accessibleTenants && accessibleTenants.length === 1">
```

---

### テスト手順

#### 前提条件
- `admin@omotenasuai.com`が複数テナントに所属している
- `hotel-common`（ポート3400）が起動中
- `hotel-saas`（ポート3100または3001）が起動中

#### テストケース1: API動作確認

```bash
# 1. ログイン
curl -X POST http://localhost:3400/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@omotenasuai.com","password":"admin123"}' \
  -c cookies.txt -s | jq '.data.currentTenant, .data.accessibleTenants'

# 2. 主所属変更
curl -X POST http://localhost:3400/api/v1/auth/set-primary-tenant \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"tenantId":"default000"}' -s | jq '.data'

# 3. Redisセッション確認
redis-cli GET "hotel:session:$(redis-cli KEYS 'hotel:session:*' | head -1 | cut -d':' -f3)" \
  | jq '{tenant_id, currentTenant, accessibleTenants}'
```

**期待結果**:
- `tenant_id`が`default000`に更新されている
- `currentTenant.id`が`default000`
- `accessibleTenants[0].isPrimary`が`true`

#### テストケース2: ブラウザUI確認

1. `http://localhost:3001/admin/login`にアクセス
2. ログイン後、テナントスイッチャーをクリック
3. 別のテナントの☆ボタンをクリック
4. 確認モーダルで「設定する」をクリック
5. 成功トーストが表示され、★マークが移動することを確認
6. **重要**: ページリロードせずに、ダッシュボードのAPIが正常に動作することを確認（403エラーが出ない）

---

### 今後の改善案（オプション機能）

#### 1. 主所属変更履歴の記録

```sql
CREATE TABLE staff_primary_tenant_history (
  id              TEXT PRIMARY KEY,
  staff_id        TEXT NOT NULL,
  old_tenant_id   TEXT NOT NULL,
  new_tenant_id   TEXT NOT NULL,
  changed_at      TIMESTAMP DEFAULT NOW(),
  changed_by      TEXT,  -- staff_id (本人)
  
  CONSTRAINT fk_history_staff FOREIGN KEY (staff_id) REFERENCES staff(id)
);
```

**用途**: 監査ログ、不正アクセス検知

---

#### 2. 主所属変更の制限

```typescript
// 1日1回までの変更制限
const lastChange = await prisma.staffPrimaryTenantHistory.findFirst({
  where: {
    staffId,
    changedAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  }
});

if (lastChange) {
  throw new Error('主所属の変更は1日1回までです');
}
```

**用途**: 頻繁な変更の防止、セキュリティ強化

---

#### 3. 複数タブでの自動同期

```typescript
// SSE（Server-Sent Events）で他タブに通知
const eventSource = new EventSource('/api/v1/auth/session-events');

eventSource.addEventListener('primary-tenant-changed', (event) => {
  const data = JSON.parse(event.data);
  
  // 通知バナー表示
  showNotification({
    type: 'info',
    message: `主所属が ${data.newTenantName} に変更されました`,
    action: {
      label: 'リロード',
      onClick: () => window.location.reload()
    }
  });
});
```

**用途**: 複数タブでの一貫性確保、ユーザー体験向上

---

### 実装ファイル一覧

#### hotel-common
- `/src/routes/systems/common/auth.routes.ts` (line 440-570)
  - `POST /api/v1/auth/set-primary-tenant` エンドポイント実装
- `/prisma/schema.prisma`
  - `staff_tenant_memberships.is_primary` フィールド（既存）
  - `staff_tenant_memberships.joined_at` フィールド（既存）

#### hotel-saas
- `/server/api/v1/auth/set-primary-tenant.post.ts` (新規作成)
  - プロキシAPI実装
- `/composables/useSessionAuth.ts` (line 213-241)
  - `setPrimaryTenant` メソッド追加
- `/components/TenantSwitcher.vue` (line 5, 13, 60-80)
  - nullチェック追加
  - 主所属UI実装（★/☆ボタン）
  - 確認モーダル・トースト通知

---

## 📊 プラン管理

### プラン体系

**注記**: 料金プラン・機能制限の詳細定義は、スーパーアドミン機能で動的に管理されます。

**詳細**: [SSOT_SAAS_SUPER_ADMIN.md](./SSOT_SAAS_SUPER_ADMIN.md) を参照

---

### プラン制限の適用（技術的な仕組み）

#### hotel-common: プラン制限API

**ファイル**: `src/api/tenant-service-api.ts`

**現在の実装状況**: ✅ 実装済み

**主要関数**:

```typescript
// プラン制限取得
getServicePlanRestrictions(serviceType, planType, planCategory)

// サービスアクセス確認
checkServiceAccess(tenantId, serviceType)

// 使用統計記録
recordServiceUsage(tenantId, serviceType, month, data)
```

**使用例**:
```typescript
// hotel-saasでデバイス追加前にチェック
const result = await checkServiceAccess(tenantId, 'hotel-saas')
if (!result.success) {
  throw new Error('サービスにアクセスできません')
}

const plan = result.data.planRestrictions
if (currentDeviceCount >= plan.maxDevices) {
  throw new Error('デバイス数の上限に達しています')
}
```

---

### プラン制限ミドルウェア（hotel-saas）

**実装必要**: 🔴 未実装

**ファイル**: `server/middleware/plan-restrictions.ts`（作成必要）

**機能**:
- 機能ごとのアクセス制御
- デバイス数制限
- 月間注文数制限

**実装イメージ**:
```typescript
export default defineNuxtRouteMiddleware(async (to) => {
  const tenant = event.context.tenant
  
  // プラン制限取得
  const restrictions = await getServicePlanRestrictions(
    'hotel-saas',
    tenant.planType,
    'omotenasuai'
  )
  
  // AIコンシェルジュへのアクセス
  if (to.path.includes('/ai/concierge') && !restrictions.enableAiConcierge) {
    throw createError({
      statusCode: 403,
      message: 'この機能はProfessionalプラン以上で利用可能です'
    })
  }
})
```

---

## 💻 実装詳細

### hotel-saas実装

#### 必須ファイル

| ファイルパス | 実装状況 | 説明 |
|------------|---------|------|
| `server/middleware/tenant-context.ts` | ✅ 完了 | テナント解決・Prisma拡張 |
| `server/middleware/plan-restrictions.ts` | 🔴 未実装 | プラン制限適用 |
| `composables/useTenant.ts` | 🔴 未実装 | テナント情報取得 |
| `server/utils/tenant-resolver.ts` | 🔴 未実装 | テナント解決ヘルパー |

---

#### Prisma拡張対象モデル

**現在実装済み**:
- order
- menuItem
- category
- device
- place

**追加必要**:
- 🔴 room
- 🔴 roomGrade
- 🔴 reservation（将来）
- 🔴 customer（将来）

---

### hotel-common実装

#### 必須API

| エンドポイント | 実装状況 | 説明 |
|--------------|---------|------|
| `GET /api/v1/tenants/:id` | ✅ 完了 | テナント情報取得 |
| `POST /api/v1/tenants` | 🔴 未実装 | テナント作成 |
| `PUT /api/v1/tenants/:id` | 🔴 未実装 | テナント更新 |
| `GET /api/v1/service-plans` | ✅ 完了 | プラン一覧取得 |
| `POST /api/v1/tenant-services` | ✅ 完了 | テナントサービス登録 |

---

## ⚙️ 環境設定

### 開発環境

#### hotel-saas (.env)
```bash
# データベース
DATABASE_URL=postgresql://postgres:password@localhost:5432/hotel_unified_db

# Redis（認証・キャッシュ）
REDIS_URL=redis://localhost:6379

# アプリケーション
NODE_ENV=development
BASE_URL=http://localhost:3100

# テナント設定（開発用）
DEFAULT_TENANT_ID=tenant-economy
ENABLE_TENANT_QUERY_PARAM=true
```

#### hotel-common (.env)
```bash
# データベース
DATABASE_URL=postgresql://postgres:password@localhost:5432/hotel_unified_db

# Redis
REDIS_URL=redis://localhost:6379

# アプリケーション
NODE_ENV=development
PORT=3400
```

---

### 本番環境

#### hotel-saas (.env)
```bash
# データベース
DATABASE_URL=postgres://postgres:xxxxx@dokku-postgres-hotel-unified-db:5432/hotel_unified_db

# Redis
REDIS_URL=redis://:xxxxx@dokku-redis-hotel-redis:6379

# アプリケーション
NODE_ENV=production
BASE_URL=https://app.omotenasuai.com

# テナント設定（開発環境用の代替手段を無効化）
ENABLE_TENANT_QUERY_PARAM=false
```

**重要**: 本番環境では`ENABLE_TENANT_QUERY_PARAM=false`に設定し、認証ベースのテナント識別のみ許可。

---

## 🔒 セキュリティ

### データ分離保証

#### 1. アプリケーションレベル
- ✅ Prisma拡張による自動フィルタリング
- ✅ ミドルウェアによるテナントID検証
- ✅ セッション内のtenant_idとヘッダーの整合性チェック

#### 2. データベースレベル
- 🔴 Row-Level Security (RLS) - **未実装**

**RLS実装例**（将来実装）:
```sql
-- テナント分離ポリシー
CREATE POLICY tenant_isolation_policy ON orders
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id'));

-- ポリシー有効化
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
```

---

### テナント間データ漏洩防止

#### チェックリスト

- ✅ 全クエリにtenant_idフィルタ適用
- ✅ X-Tenant-IDヘッダー検証
- ✅ セッション内tenant_idと一致確認
- 🔴 RLS設定（将来実装）
- 🔴 監査ログ（将来実装）

---

## 📊 既存実装状況

### hotel-saas

| 機能 | 実装状況 | ファイル |
|-----|---------|---------|
| テナントコンテキストミドルウェア | ✅ 完了 | `server/middleware/tenant-context.ts` |
| Prisma拡張（order, menuItem, category, device, place） | ✅ 完了 | 同上 |
| X-Tenant-IDヘッダー対応（開発用） | ✅ 完了 | 同上 |
| クエリパラメータ対応（開発用） | ✅ 完了 | 同上 |
| プラン制限ミドルウェア | 🔴 未実装 | - |
| useTenant composable | 🔴 未実装 | - |

---

### hotel-common

| 機能 | 実装状況 | ファイル |
|-----|---------|---------|
| テナント管理API | 🟡 部分実装 | `src/api/tenant-service-api.ts` |
| プラン制限API | ✅ 完了 | 同上 |
| X-Tenant-ID検証ミドルウェア | ✅ 完了 | `src/auth/tenant-validation-middleware.ts` |
| テナント作成API | 🔴 未実装 | - |

---

## 🔴 修正必須箇所

### 1. hotel-saas: Prisma拡張の追加

**ファイル**: `server/middleware/tenant-context.ts`

**追加必要なモデル**:
```typescript
// 🔴 追加: room
room: {
  async findMany({ args, query }) {
    args.where = { ...args.where, tenantId }
    return query(args)
  },
  // findFirst, create, update, delete も同様
},

// 🔴 追加: roomGrade
roomGrade: {
  async findMany({ args, query }) {
    args.where = { ...args.where, tenantId }
    return query(args)
  },
  // findFirst, create, update, delete も同様
}
```

---

### 2. hotel-saas: プラン制限ミドルウェア

**ファイル**: `server/middleware/plan-restrictions.ts`（新規作成）

**実装必須機能**:
- AI機能へのアクセス制御
- デバイス数上限チェック
- 月間注文数上限チェック

**実装イメージ**:
```typescript
export default defineNuxtRouteMiddleware(async (to) => {
  const tenantId = event.context.tenantId
  
  // プラン情報取得
  const response = await $fetch(`${API_URL}/api/v1/tenant-services/check`, {
    params: { tenantId, serviceType: 'hotel-saas' }
  })
  
  const restrictions = response.data.planRestrictions
  
  // 機能制限チェック
  if (to.path.includes('/ai') && !restrictions.enableAiConcierge) {
    throw createError({
      statusCode: 403,
      message: 'この機能はProfessionalプラン以上で利用可能です'
    })
  }
})
```

---

---

## 📋 実装チェックリスト

### Phase 1: データベース・API基盤

#### hotel-common
- [ ] プラン制限チェックAPI改善

#### hotel-saas
- [ ] Prisma拡張にroom/roomGrade追加
- [ ] プラン制限ミドルウェア実装
- [ ] useTenant composable実装

**注記**: テナント管理・料金プラン管理・スーパーアドミン画面については [SSOT_SAAS_SUPER_ADMIN.md](./SSOT_SAAS_SUPER_ADMIN.md) を参照

---

### Phase 2: セキュリティ強化

- [ ] Row-Level Security (RLS) 設定
- [ ] 監査ログ実装
- [ ] テナント間データ漏洩テスト
- [ ] セキュリティレビュー

---

### Phase 3: スーパーアドミン機能

**注記**: スーパーアドミン画面の詳細機能については [SSOT_SAAS_SUPER_ADMIN.md](./SSOT_SAAS_SUPER_ADMIN.md) を参照

- テナント管理機能（登録・編集・削除フロー）
- 料金プラン管理機能（プラン変更フロー）
- 使用量モニタリング
- アラート機能
- AI管理機能

---

## 🔗 関連SSOT

### 基盤SSOT
- [SSOT_SAAS_AUTHENTICATION](./SSOT_SAAS_AUTHENTICATION.md) - 認証システム全体（親SSOT）
- [SSOT_SAAS_ADMIN_AUTHENTICATION](./SSOT_SAAS_ADMIN_AUTHENTICATION.md) - スタッフログイン認証（詳細）
- [SSOT_SAAS_DEVICE_AUTHENTICATION](./SSOT_SAAS_DEVICE_AUTHENTICATION.md) - 客室端末デバイス認証（詳細）
- [SSOT_SAAS_DATABASE_SCHEMA](./SSOT_SAAS_DATABASE_SCHEMA.md) - データベーススキーマ

### プラン・請求関連SSOT
- [SSOT_SAAS_SUPER_ADMIN](./SSOT_SAAS_SUPER_ADMIN.md) - **料金プラン・機能制限の設定**（作成予定）
- [SSOT_SAAS_BILLING](../01_core_features/SSOT_SAAS_BILLING.md) - 請求処理（作成予定）

### 機能SSOT
- [SSOT_SAAS_DASHBOARD](../01_core_features/SSOT_SAAS_DASHBOARD.md) - ダッシュボード（テナント別データ表示）

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 | 担当 |
|-----|-----------|---------|------|
| 2025-10-02 | 1.0.0 | 初版作成 | AI |
| 2025-10-02 | 1.1.0 | テナント識別方式を修正（サブドメイン方式 → ログインID/デバイスベース方式）、実装に合わせた内容に更新 | Iza |
| 2025-10-02 | 1.2.0 | 料金プラン・機能制限の詳細をSSOT_SAAS_SUPER_ADMINに分離。マルチテナントSSOTは技術的な仕組みのみに特化 | Iza |
| 2025-10-02 | 1.2.1 | 「テナント管理画面」を「スーパーアドミン画面」に修正。スーパーアドミンの責務を明確化 | Iza |
| 2025-10-02 | 1.3.0 | テナント作成API、スーパーアドミン実装チェックリスト等をSSOT_SAAS_SUPER_ADMINに完全分離 | Iza |
| 2025-10-05 | 1.4.0 | JWT認証からSession認証への完全移行。JWTに関する記載を全て削除 | Iza |
| 2025-10-05 | 1.5.0 | Staffテーブルから`tenant_id`を削除、完全な複数テナント所属対応。`staff_tenant_memberships`テーブルで所属管理 | Iza |
| 2025-10-06 | 1.6.0 | **主所属テナント変更機能の追加**<br>- `staff_tenant_memberships.is_primary`フィールド活用<br>- API仕様追加（hotel-common, hotel-saas）<br>- フロントエンド実装仕様（useSessionAuth, TenantSwitcher）<br>- UI/UX仕様（★/☆マーク）<br>- Redisセッション更新の重要性を明記<br>- 二重ネスト問題の解決方法を記載<br>- テスト手順・トラブルシューティング追加<br>- 今後の改善案（履歴記録、変更制限、複数タブ同期） | Iza |
| 2025-10-07 | 1.6.1 | **主所属テナント変更機能の実装詳細を追加**<br>- hotel-commonのAPI処理フローに詳細コード追加（テナント存在確認、トランザクション、Redisセッション更新）<br>- hotel-saasプロキシAPIの完全な実装コード追加（Cookie転送、二重ネスト解消）<br>- useSessionAuth.tsの完全な実装コード追加（エラーハンドリング、グローバル状態更新）<br>- TenantSwitcher.vueの完全な実装コード追加（nullチェック、確認モーダル、トースト通知）<br>- 実装ファイルの行番号を明記<br>- 重要な技術的注意点の詳細を追加（tenant_id未更新、二重ネスト、nullチェック）<br>- SSOT準拠の実装（ConfirmModal、useToast使用）を明記 | Iza |

---

**以上、SSOT: マルチテナントアーキテクチャ**

