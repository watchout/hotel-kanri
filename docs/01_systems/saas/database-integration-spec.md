# データベース連携仕様書

## 1. データベース構成

### 1.1 基本構成
- **データベース**: PostgreSQL 14+
- **接続プール**: pgBouncer
- **分離方式**: Row Level Security (RLS)
- **バックアップ**: 日次フルバックアップ + 継続的WALアーカイブ

### 1.2 接続設定
```typescript
// 共通データベース接続設定
const DATABASE_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: 'hotel_unified_db',
  username: process.env.DB_USER || 'hotel_app',
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production',
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
}
```

## 2. テーブル設計

### 2.1 共通テーブル

#### テナント管理
```sql
CREATE TABLE tenants (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'economy',
  plan_category VARCHAR(50) NOT NULL DEFAULT 'leisure',
  max_devices INTEGER NOT NULL DEFAULT 30,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  monthly_price DECIMAL(10,2),
  agent_id VARCHAR(255),
  agent_commission_rate DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### ユーザー管理
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  system_access TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 hotel-saas 専用テーブル

#### 注文管理
```sql
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  room_id VARCHAR(100) NOT NULL,
  guest_id INTEGER,
  place_id INTEGER,
  status VARCHAR(50) DEFAULT 'received',
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  special_requests TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  order_id INTEGER REFERENCES orders(id),
  menu_item_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### メニュー管理
```sql
CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  name_ja VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description_ja TEXT,
  description_en TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id INTEGER,
  image_url VARCHAR(500),
  is_available BOOLEAN DEFAULT true,
  stock_available BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  name_ja VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  description_ja TEXT,
  description_en TEXT,
  parent_id INTEGER REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.3 hotel-member 専用テーブル

#### 会員管理
```sql
CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  member_id VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  birth_date DATE,
  gender VARCHAR(10),
  loyalty_points INTEGER DEFAULT 0,
  membership_level VARCHAR(50) DEFAULT 'bronze',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE point_history (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  member_id INTEGER REFERENCES members(id),
  points INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'earn', 'redeem', 'expire'
  reason VARCHAR(255),
  order_id INTEGER,
  reservation_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 予約管理
```sql
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  reservation_number VARCHAR(100) UNIQUE NOT NULL,
  member_id INTEGER REFERENCES members(id),
  room_id VARCHAR(100) NOT NULL,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  checkin_time TIMESTAMP,
  checkout_time TIMESTAMP,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reservation_services (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  reservation_id INTEGER REFERENCES reservations(id),
  service_name VARCHAR(255) NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.4 hotel-pms 専用テーブル

#### 客室管理
```sql
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  room_number VARCHAR(20) NOT NULL,
  room_type VARCHAR(50) NOT NULL,
  floor INTEGER,
  capacity INTEGER DEFAULT 2,
  status VARCHAR(50) DEFAULT 'available', -- available, occupied, maintenance, cleaning
  -- ▼ ランク基準の上書き（override）用フィールド（任意）
  override_capacity_default INTEGER,     -- 標準収容人数の上書き（1〜10）
  override_capacity_max INTEGER,         -- 最大収容人数の上書き（標準以上、1〜10）
  override_room_size_sqm DECIMAL(6,1),   -- 客室面積（㎡）の上書き（0〜1000、少数1桁）
  override_standard_amenities JSONB,     -- 標準設備の上書き（文字列配列）
  override_premium_amenities JSONB,      -- プレミアム設備の上書き（文字列配列）
  current_guest_id INTEGER,
  current_reservation_id INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE room_types (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL,
  max_occupancy INTEGER NOT NULL,
  amenities JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

##### 客室ランク上書き（override）仕様
- 目的: ランク（RoomGrade）の代表値を基準としつつ、個別客室で例外値を保持できるようにする。
- 方針: 客室テーブルに任意のoverrideカラムを設け、値がある場合はランク値を上書き。
- 上書き対象とバリデーション目安:
  - override_capacity_default: 1〜10
  - override_capacity_max: 1〜10 かつ override_capacity_default 以上
  - override_room_size_sqm: 0〜1000（㎡、小数1桁）
  - override_standard_amenities / override_premium_amenities: 文字列配列（各1〜30文字、最大50要素、重複除去）
- 表示・API計算ロジック（擬似式）:
  - capacity_default = override_capacity_default ?? roomGrade.defaultCapacity
  - capacity_max = override_capacity_max ?? roomGrade.maxCapacity
  - room_size_sqm = override_room_size_sqm ?? roomGrade.roomSizeSqm
  - standard_amenities = override_standard_amenities ?? roomGrade.standardAmenities
  - premium_amenities = override_premium_amenities ?? roomGrade.premiumAmenities
- 実装ノート: クライアントは送信前にトリム・重複除去等の前処理を実施。サーバーは verifyAuth と X-Tenant-ID を付与して hotel-common API へ委譲（現方針に準拠）。

#### 清掃管理
```sql
CREATE TABLE housekeeping_tasks (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  room_id INTEGER REFERENCES rooms(id),
  task_type VARCHAR(50) NOT NULL, -- cleaning, maintenance, inspection
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
  assigned_to VARCHAR(255),
  estimated_duration INTEGER, -- minutes
  actual_duration INTEGER,
  notes TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE housekeeping_checklist (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  task_id INTEGER REFERENCES housekeeping_tasks(id),
  item_name VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 3. Row Level Security (RLS) 設定

### 3.1 RLS ポリシー設定
```sql
-- 全テーブルでRLSを有効化
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_checklist ENABLE ROW LEVEL SECURITY;

-- テナント分離ポリシー
CREATE POLICY tenant_isolation_orders ON orders
  USING (tenant_id = current_setting('app.current_tenant'));

CREATE POLICY tenant_isolation_members ON members
  USING (tenant_id = current_setting('app.current_tenant'));

CREATE POLICY tenant_isolation_rooms ON rooms
  USING (tenant_id = current_setting('app.current_tenant'));

-- 他のテーブルも同様にポリシーを設定
```

### 3.2 テナント設定関数
```sql
-- テナントIDを設定する関数
CREATE OR REPLACE FUNCTION set_current_tenant(tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant', tenant_id, false);
END;
$$ LANGUAGE plpgsql;

-- 現在のテナントIDを取得する関数
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_tenant', true);
END;
$$ LANGUAGE plpgsql;
```

## 4. データベース操作

### 4.1 接続時のテナント設定
```typescript
// Prisma クライアントでのテナント設定
export class TenantAwarePrismaClient {
  private prisma: PrismaClient

  constructor() {
    this.prisma = new PrismaClient()
  }

  async setTenant(tenantId: string) {
    await this.prisma.$executeRaw`SELECT set_current_tenant(${tenantId})`
  }

  async withTenant<T>(tenantId: string, operation: () => Promise<T>): Promise<T> {
    await this.setTenant(tenantId)
    try {
      return await operation()
    } finally {
      // テナント設定をクリア
      await this.prisma.$executeRaw`SELECT set_current_tenant('')`
    }
  }

  get client() {
    return this.prisma
  }
}
```

### 4.2 システム別データアクセス
```typescript
// hotel-saas でのデータアクセス
export class OrderService {
  constructor(private db: TenantAwarePrismaClient) {}

  async createOrder(tenantId: string, orderData: CreateOrderData) {
    return this.db.withTenant(tenantId, async () => {
      return this.db.client.order.create({
        data: {
          ...orderData,
          tenant_id: tenantId
        }
      })
    })
  }

  async getOrders(tenantId: string, filters: OrderFilters) {
    return this.db.withTenant(tenantId, async () => {
      return this.db.client.order.findMany({
        where: {
          tenant_id: tenantId,
          ...filters
        }
      })
    })
  }
}
```

## 5. データ同期

### 5.1 システム間データ同期
```typescript
// 会員情報の同期
export class MemberSyncService {
  async syncMemberToSaas(tenantId: string, memberId: number) {
    const member = await memberDb.withTenant(tenantId, async () => {
      return memberDb.client.member.findUnique({
        where: { id: memberId }
      })
    })

    if (member) {
      // hotel-saas に会員情報を同期
      await saasDb.withTenant(tenantId, async () => {
        await saasDb.client.guest.upsert({
          where: { member_id: memberId },
          update: {
            name: member.name,
            email: member.email,
            phone: member.phone,
            loyalty_points: member.loyalty_points
          },
          create: {
            member_id: memberId,
            name: member.name,
            email: member.email,
            phone: member.phone,
            loyalty_points: member.loyalty_points,
            tenant_id: tenantId
          }
        })
      })
    }
  }
}
```

### 5.2 データ整合性チェック
```typescript
// データ整合性チェック関数
export class DataIntegrityService {
  async checkOrderIntegrity(tenantId: string) {
    const inconsistencies = []

    // 注文と注文アイテムの整合性チェック
    const ordersWithoutItems = await db.withTenant(tenantId, async () => {
      return db.client.order.findMany({
        where: {
          tenant_id: tenantId,
          order_items: {
            none: {}
          }
        }
      })
    })

    if (ordersWithoutItems.length > 0) {
      inconsistencies.push({
        type: 'orders_without_items',
        count: ordersWithoutItems.length,
        items: ordersWithoutItems
      })
    }

    return inconsistencies
  }
}
```

## 6. マイグレーション

### 6.1 SQLite から PostgreSQL への移行
```sql
-- 移行スクリプト例
-- 1. テナントデータの作成
INSERT INTO tenants (id, name, plan_type, status)
VALUES ('default-tenant', 'Default Hotel', 'economy', 'active');

-- 2. 既存データの移行
INSERT INTO orders (tenant_id, room_id, status, items, total, created_at, updated_at)
SELECT
  'default-tenant',
  room_id,
  status,
  items,
  total,
  created_at,
  updated_at
FROM sqlite_orders;

-- 3. 外部キー制約の追加
ALTER TABLE orders ADD CONSTRAINT fk_orders_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id);
```

### 6.2 段階的移行手順
```bash
# 1. PostgreSQL データベースの作成
createdb hotel_unified_db

# 2. スキーマの作成
psql hotel_unified_db < schema.sql

# 3. データの移行
node migrate-from-sqlite.js

# 4. 整合性チェック
node check-data-integrity.js

# 5. アプリケーションの切り替え
# DATABASE_URL を PostgreSQL に変更
```

## 7. パフォーマンス最適化

### 7.1 インデックス設定
```sql
-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_orders_tenant_room ON orders(tenant_id, room_id);
CREATE INDEX idx_orders_status ON orders(tenant_id, status);
CREATE INDEX idx_orders_created_at ON orders(tenant_id, created_at);

CREATE INDEX idx_members_tenant_email ON members(tenant_id, email);
CREATE INDEX idx_members_member_id ON members(tenant_id, member_id);

CREATE INDEX idx_rooms_tenant_status ON rooms(tenant_id, status);
CREATE INDEX idx_rooms_number ON rooms(tenant_id, room_number);

CREATE INDEX idx_reservations_tenant_dates ON reservations(tenant_id, checkin_date, checkout_date);
CREATE INDEX idx_reservations_status ON reservations(tenant_id, status);
```

### 7.2 クエリ最適化
```typescript
// 効率的なクエリ例
export class OptimizedQueryService {
  // 注文一覧を効率的に取得
  async getOrdersWithItems(tenantId: string, filters: OrderFilters) {
    return this.db.withTenant(tenantId, async () => {
      return this.db.client.order.findMany({
        where: {
          tenant_id: tenantId,
          ...filters
        },
        include: {
          order_items: {
            select: {
              id: true,
              name: true,
              quantity: true,
              price: true,
              status: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        }
      })
    })
  }
}
```

## 8. バックアップ・リストア

### 8.1 バックアップ戦略
```bash
# 日次フルバックアップ
pg_dump -h localhost -U hotel_app -d hotel_unified_db \
  --format=custom --compress=9 \
  --file=backup_$(date +%Y%m%d).dump

# WAL アーカイブ設定
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

### 8.2 リストア手順
```bash
# フルリストア
pg_restore -h localhost -U hotel_app -d hotel_unified_db \
  --clean --if-exists backup_20240715.dump

# 特定テナントのみリストア
pg_restore -h localhost -U hotel_app -d hotel_unified_db \
  --data-only --table=orders --table=order_items \
  backup_20240715.dump
```

## 5. テナント分離実装

### 5.1 Prismaスキーマ設計

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// テナント管理
model Tenant {
  id          String   @id @default(cuid())
  name        String
  domain      String   @unique
  settings    Json?
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  // テナント配下のデータ
  users       User[]
  devices     Device[]
  places      Place[]
  orders      Order[]
  menu_items  MenuItem[]
  categories  Category[]

  @@map("tenants")
}

// ユーザー管理（テナント分離）
model User {
  id         String   @id @default(cuid())
  tenant_id  String
  email      String
  password   String
  role       String
  permissions String[]
  system     SystemType
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  tenant     Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Cascade)

  @@unique([tenant_id, email])
  @@map("users")
}

// デバイス管理（テナント分離）
model Device {
  id           String   @id @default(cuid())
  tenant_id    String
  place_id     String?
  name         String
  security_key String   @unique
  is_active    Boolean  @default(true)
  last_access  DateTime?
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  tenant       Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  place        Place?   @relation(fields: [place_id], references: [id], onDelete: SetNull)

  @@unique([tenant_id, security_key])
  @@map("devices")
}

// プレイス管理（テナント分離）
model Place {
  id         String   @id @default(cuid())
  tenant_id  String
  name       String
  type       String
  settings   Json?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  tenant     Tenant   @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  devices    Device[]
  orders     Order[]

  @@unique([tenant_id, name])
  @@map("places")
}

// 注文管理（テナント分離）
model Order {
  id         String      @id @default(cuid())
  tenant_id  String
  place_id   String
  status     OrderStatus @default(PENDING)
  total      Float
  created_at DateTime    @default(now())
  updated_at DateTime    @updatedAt

  tenant     Tenant      @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  place      Place       @relation(fields: [place_id], references: [id], onDelete: Cascade)
  items      OrderItem[]

  @@map("orders")
}

// 注文アイテム（テナント分離）
model OrderItem {
  id           String   @id @default(cuid())
  order_id     String
  menu_item_id String
  quantity     Int
  price        Float
  created_at   DateTime @default(now())

  order        Order    @relation(fields: [order_id], references: [id], onDelete: Cascade)
  menu_item    MenuItem @relation(fields: [menu_item_id], references: [id], onDelete: Cascade)

  @@map("order_items")
}

// メニューアイテム（テナント分離）
model MenuItem {
  id          String   @id @default(cuid())
  tenant_id   String
  category_id String?
  name        String
  description String?
  price       Float
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  tenant      Tenant      @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  category    Category?   @relation(fields: [category_id], references: [id], onDelete: SetNull)
  order_items OrderItem[]

  @@unique([tenant_id, name])
  @@map("menu_items")
}

// カテゴリ（テナント分離）
model Category {
  id         String     @id @default(cuid())
  tenant_id  String
  name       String
  sort_order Int        @default(0)
  created_at DateTime   @default(now())
  updated_at DateTime   @updatedAt

  tenant     Tenant     @relation(fields: [tenant_id], references: [id], onDelete: Cascade)
  menu_items MenuItem[]

  @@unique([tenant_id, name])
  @@map("categories")
}

// 列挙型
enum SystemType {
  SAAS
  MEMBER
  PMS
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  READY
  DELIVERED
  CANCELLED
}
```

### 5.2 Row Level Security (RLS) 設定

```sql
-- テナント分離のためのRLS設定

-- テナントテーブル
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- ユーザーテーブル
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_tenant_policy ON users
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id'));

-- デバイステーブル
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY devices_tenant_policy ON devices
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id'));

-- プレイステーブル
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
CREATE POLICY places_tenant_policy ON places
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id'));

-- 注文テーブル
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_tenant_policy ON orders
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id'));

-- メニューアイテムテーブル
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY menu_items_tenant_policy ON menu_items
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id'));

-- カテゴリテーブル
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY categories_tenant_policy ON categories
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id'));
```

### 5.3 テナント分離ミドルウェア

```typescript
// middleware/tenant-isolation.ts
export default defineNuxtRouteMiddleware((to, from) => {
  // テナントIDの取得（サブドメインまたはヘッダーから）
  const tenantId = extractTenantId(to)

  if (!tenantId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'テナントIDが指定されていません'
    })
  }

  // テナントIDをコンテキストに設定
  setTenantContext(tenantId)
})

function extractTenantId(route: RouteLocationNormalized): string | null {
  // サブドメインから抽出
  const host = useRequestHeaders().host
  if (host) {
    const subdomain = host.split('.')[0]
    if (subdomain !== 'www' && subdomain !== 'api') {
      return subdomain
    }
  }

  // ヘッダーから抽出
  const tenantHeader = useRequestHeaders()['x-tenant-id']
  if (tenantHeader) {
    return tenantHeader
  }

  return null
}
```

この仕様書に基づいて、データベース設計と連携を実装してください。
