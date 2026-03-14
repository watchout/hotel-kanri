# 🗄️ PostgreSQL移行計画書

**作成日**: 2025年1月13日
**移行予定**: Phase 2完了時（Week 3）
**目的**: スケーラビリティ確保・マルチテナント対応

---

## 🎯 **移行タイミング戦略**

### **Phase 1: SQLiteで基盤構築（Week 1-2）**
```markdown
【継続理由】
✅ スキーマ設計の試行錯誤が多い
✅ 軽量なマイグレーション実行
✅ 開発効率の最大化
✅ バックアップ・復元の簡易性

【実装内容】
- データベーススキーマ更新
- プラン制限ミドルウェア
- 追加端末料金システム
- エコノミープラン基本機能
```

### **Phase 2: PostgreSQL移行実行（Week 3）**
```markdown
【移行理由】
✅ 基本スキーマが安定
✅ マルチテナント対応必要
✅ 同時接続性能向上必要
✅ 本番環境準備

【移行作業】
- PostgreSQL環境構築
- スキーマ・データ移行
- 接続設定変更
- 性能テスト実行
```

### **Phase 3: PostgreSQL本格活用（Week 4以降）**
```markdown
【活用内容】
✅ Row Level Security (RLS)
✅ 高度なインデックス最適化
✅ 複雑なクエリ実行
✅ 本番環境デプロイ
```

---

## 🔧 **技術移行手順**

### **1. 環境構築**

#### **Docker Compose設定**
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: hotel_unified_db
      POSTGRES_USER: hotel_app
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
```

#### **環境変数設定**
```bash
# .env.postgresql
DATABASE_URL="postgresql://hotel_app:${POSTGRES_PASSWORD}@localhost:5432/hotel_unified_db"
REDIS_URL="redis://localhost:6379"
```

### **2. Prismaスキーマ更新**

#### **PostgreSQL対応スキーマ**
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// マルチテナント対応
model Tenant {
  id          String   @id @default(cuid())
  name        String
  domain      String   @unique
  planType    String   // 'leisure-economy', 'omotenasuai-professional', etc.
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // リレーション
  places      Place[]
  orders      Order[]
  devices     DeviceRoom[]

  @@index([domain])
  @@index([planType])
}

// Row Level Security対応
model Order {
  id         Int         @id @default(autoincrement())
  tenantId   String      // 追加: テナント分離
  roomId     String
  placeId    Int?
  status     String      @default("received")
  items      Json
  total      Int
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  paidAt     DateTime?
  isDeleted  Boolean     @default(false)
  deletedAt  DateTime?

  // リレーション
  tenant     Tenant      @relation(fields: [tenantId], references: [id])
  place      Place?      @relation(fields: [placeId], references: [id])
  orderItems OrderItem[]

  @@index([tenantId, placeId])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])
}

// 追加端末管理
model DeviceSubscription {
  id             String      @id @default(cuid())
  tenantId       String
  deviceId       Int
  deviceType     String      // 'room', 'front_desk', 'kitchen', 'bar', 'cleaning', 'manager', 'common_area'
  monthlyFee     Int         // 月額料金（円）
  isActive       Boolean     @default(true)
  registeredAt   DateTime    @default(now())

  // リレーション
  tenant         Tenant      @relation(fields: [tenantId], references: [id])
  device         DeviceRoom  @relation(fields: [deviceId], references: [id])

  @@unique([tenantId, deviceId])
  @@index([tenantId, deviceType])
  @@index([tenantId, isActive])
}

// プラン制限管理
model PlanRestriction {
  id                String   @id @default(cuid())
  tenantId          String   @unique
  planCategory      String   // 'leisure', 'omotenasuai', 'international'
  planType          String   // 'economy', 'professional', 'enterprise', 'ultimate'
  maxRoomDevices    Int      // 最大客室端末数
  maxAdditionalDevices Int   // 最大追加端末数
  aiCreditsPerMonth Int?     // 月間AIクレジット
  features          Json     // 利用可能機能
  restrictions      Json     // 制限事項
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // リレーション
  tenant            Tenant   @relation(fields: [tenantId], references: [id])

  @@index([planCategory, planType])
}
```

### **3. データ移行スクリプト**

#### **SQLite → PostgreSQL移行**
```typescript
// scripts/migrate-to-postgresql.ts
import { PrismaClient as SQLitePrisma } from '@prisma/client'
import { PrismaClient as PostgresPrisma } from '@prisma/client'

async function migrateData() {
  console.log('🔄 SQLite → PostgreSQL データ移行開始...')

  // SQLiteクライアント（移行元）
  const sqlitePrisma = new SQLitePrisma({
    datasources: {
      db: { url: 'file:./prisma/dev.db' }
    }
  })

  // PostgreSQLクライアント（移行先）
  const postgresPrisma = new PostgresPrisma({
    datasources: {
      db: { url: process.env.DATABASE_URL }
    }
  })

  try {
    // 1. テナント作成（既存データを単一テナントとして移行）
    const defaultTenant = await postgresPrisma.tenant.create({
      data: {
        id: 'default-tenant',
        name: '既存ホテル',
        domain: 'default.hotel-saas.local',
        planType: 'omotenasuai-economy'
      }
    })

    console.log('✅ デフォルトテナント作成完了')

    // 2. Places移行
    const places = await sqlitePrisma.place.findMany()
    for (const place of places) {
      await postgresPrisma.place.create({
        data: {
          ...place,
          tenantId: defaultTenant.id
        }
      })
    }
    console.log(`✅ Places移行完了: ${places.length}件`)

    // 3. Orders移行
    const orders = await sqlitePrisma.order.findMany({
      include: { orderItems: true }
    })
    for (const order of orders) {
      const { orderItems, ...orderData } = order
      const newOrder = await postgresPrisma.order.create({
        data: {
          ...orderData,
          tenantId: defaultTenant.id
        }
      })

      // OrderItems移行
      for (const item of orderItems) {
        await postgresPrisma.orderItem.create({
          data: {
            ...item,
            orderId: newOrder.id
          }
        })
      }
    }
    console.log(`✅ Orders移行完了: ${orders.length}件`)

    // 4. DeviceRoom移行
    const devices = await sqlitePrisma.deviceRoom.findMany()
    for (const device of devices) {
      await postgresPrisma.deviceRoom.create({
        data: {
          ...device,
          tenantId: defaultTenant.id
        }
      })

      // DeviceSubscription作成（客室端末として登録）
      await postgresPrisma.deviceSubscription.create({
        data: {
          tenantId: defaultTenant.id,
          deviceId: device.id,
          deviceType: 'room',
          monthlyFee: 0 // 基本料金に含まれる
        }
      })
    }
    console.log(`✅ Devices移行完了: ${devices.length}件`)

    // 5. プラン制限設定
    await postgresPrisma.planRestriction.create({
      data: {
        tenantId: defaultTenant.id,
        planCategory: 'omotenasuai',
        planType: 'economy',
        maxRoomDevices: 30,
        maxAdditionalDevices: 10,
        aiCreditsPerMonth: 100,
        features: {
          basic_order: true,
          kitchen_management: true,
          basic_front_desk: true,
          basic_ai_concierge: true,
          basic_tv_interface: true,
          basic_analytics: true,
          basic_multilingual: true
        },
        restrictions: {
          ai_voice_response: false,
          advanced_analytics: false,
          pms_integration: false,
          api_access: false
        }
      }
    })
    console.log('✅ プラン制限設定完了')

    console.log('🎉 データ移行完了！')

  } catch (error) {
    console.error('❌ データ移行エラー:', error)
    throw error
  } finally {
    await sqlitePrisma.$disconnect()
    await postgresPrisma.$disconnect()
  }
}

// 実行
migrateData().catch(console.error)
```

### **4. Row Level Security (RLS) 設定**

#### **PostgreSQL RLS ポリシー**
```sql
-- scripts/setup-rls.sql

-- テナント分離のためのRLS有効化
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeviceRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Place" ENABLE ROW LEVEL SECURITY;

-- テナント分離ポリシー
CREATE POLICY tenant_isolation_orders ON "Order"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id'));

CREATE POLICY tenant_isolation_devices ON "DeviceRoom"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id'));

CREATE POLICY tenant_isolation_places ON "Place"
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id'));

-- インデックス最適化
CREATE INDEX CONCURRENTLY idx_orders_tenant_status
  ON "Order" (tenant_id, status)
  WHERE is_deleted = false;

CREATE INDEX CONCURRENTLY idx_devices_tenant_type
  ON "DeviceSubscription" (tenant_id, device_type)
  WHERE is_active = true;
```

### **5. アプリケーション設定更新**

#### **Prismaクライアント更新**
```typescript
// server/utils/prisma.ts
import { PrismaClient } from '@prisma/client'

// PostgreSQL用Prismaクライアント
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

// テナント分離ミドルウェア
export async function withTenant<T>(
  tenantId: string,
  operation: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    // RLSでテナントIDを設定
    await tx.$executeRaw`SET LOCAL app.current_tenant_id = ${tenantId}`
    return await operation(tx)
  })
}

export default prisma
```

#### **環境変数管理**
```bash
# .env.example
# SQLite (開発初期)
# DATABASE_URL="file:./prisma/dev.db"

# PostgreSQL (Phase 2以降)
DATABASE_URL="postgresql://hotel_app:password@localhost:5432/hotel_unified_db"
REDIS_URL="redis://localhost:6379"

# マルチテナント設定
ENABLE_MULTITENANCY=true
DEFAULT_TENANT_ID="default-tenant"
```

---

## 📋 **移行チェックリスト**

### **移行前準備**
- [ ] PostgreSQL Docker環境構築
- [ ] 移行スクリプト作成・テスト
- [ ] データバックアップ作成
- [ ] RLSポリシー設計

### **移行実行**
- [ ] PostgreSQL環境起動
- [ ] スキーママイグレーション実行
- [ ] データ移行実行
- [ ] RLS設定適用

### **移行後確認**
- [ ] 全機能動作確認
- [ ] 性能テスト実行
- [ ] データ整合性確認
- [ ] バックアップ・復元テスト

### **本番準備**
- [ ] 本番環境PostgreSQL構築
- [ ] SSL/TLS設定
- [ ] 監視・ログ設定
- [ ] 障害対応手順作成

---

## 🚀 **移行後の利点**

### **技術的利点**
- **スケーラビリティ**: 同時接続数の大幅向上
- **マルチテナント**: RLSによる完全なデータ分離
- **性能**: 高度なクエリ最適化・インデックス
- **拡張性**: PostgreSQL固有機能の活用

### **ビジネス利点**
- **顧客数拡大**: 多数のホテルの同時サポート
- **データ分離**: セキュリティ・プライバシー確保
- **運用効率**: 一元管理・監視
- **将来対応**: エンタープライズ機能対応

---

## ⚠️ **注意事項**

### **移行リスク**
- **データ損失リスク**: 十分なバックアップとテストが必要
- **ダウンタイム**: 移行中のサービス停止
- **設定複雑化**: PostgreSQL固有の設定学習が必要

### **対策**
- **段階的移行**: 開発環境→ステージング→本番の順
- **ロールバック計画**: SQLiteへの復旧手順準備
- **十分なテスト**: 全機能の動作確認

---

### **統合DB運用ポリシー**
- 統合DB名は `hotel_unified_db`（単一DB前提）
- 共有環境では `prisma migrate deploy` を一度だけ実行
- reset/force-reset コマンドは使用禁止（データ損失防止）
- 変更前にバックアップを必ず取得

**この移行計画により、Phase 2完了時にPostgreSQLへの安全な移行を実現し、マルチテナント対応とスケーラビリティを確保します。**
