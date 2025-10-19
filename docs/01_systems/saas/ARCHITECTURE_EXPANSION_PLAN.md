# ホテル管理システム アーキテクチャ拡張計画

## 概要

現在のRoom Serviceシステムを基盤として、総合的なホテル管理システムへの拡張を段階的に実施する計画書です。

## 現状分析

### 既存機能
- デバイス・プレイス管理
- 注文管理（Room Service）
- メニュー管理
- 在庫管理
- 統計・分析機能

### 技術スタック
- **Frontend**: Nuxt 3 + Vue 3 + TypeScript
- **Backend**: Nuxt 3 Server API
- **Database**: SQLite (開発) / PostgreSQL (本番想定)
- **ORM**: Prisma
- **Styling**: TailwindCSS

## 拡張計画

### Phase 1: モノリス拡張（現在〜6ヶ月）

#### 追加機能候補

```
📊 経営ダッシュボード
├── 売上分析
├── 稼働率管理
├── 顧客満足度
└── コスト分析

🏨 フロント業務
├── チェックイン/アウト
├── 予約管理
├── 料金管理
└── 顧客管理

👥 スタッフ管理
├── シフト管理
├── タスク管理
├── 権限管理
└── 勤怠管理

🧹 ハウスキーピング
├── 清掃状況管理
├── 備品管理
├── メンテナンス
└── 品質チェック
```

#### データベース拡張戦略

**共有データベースアプローチを継続**

```prisma
// 新機能のモデル追加例

model Guest {
  id          Int      @id @default(autoincrement())
  name        String
  email       String?
  phone       String?
  preferences Json?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // 関連
  bookings    Booking[]
  orders      Order[]   // 既存のOrderとの関連
}

model Booking {
  id          Int      @id @default(autoincrement())
  guestId     Int
  placeId     Int      // 既存のPlaceを参照
  checkIn     DateTime
  checkOut    DateTime
  status      String   @default("confirmed")
  totalAmount Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  guest       Guest    @relation(fields: [guestId], references: [id])
  place       Place    @relation(fields: [placeId], references: [id])
}

model Staff {
  id          Int      @id @default(autoincrement())
  name        String
  role        String
  email       String   @unique
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // 関連
  cleaningTasks CleaningTask[]
  shifts      Shift[]
}

model CleaningTask {
  id          Int      @id @default(autoincrement())
  placeId     Int      // 既存のPlaceを参照
  assignedTo  Int?
  status      String   @default("pending")
  priority    String   @default("normal")
  description String?
  scheduledAt DateTime
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  place       Place    @relation(fields: [placeId], references: [id])
  staff       Staff?   @relation(fields: [assignedTo], references: [id])
}

model Shift {
  id        Int      @id @default(autoincrement())
  staffId   Int
  startTime DateTime
  endTime   DateTime
  date      DateTime
  createdAt DateTime @default(now())
  
  staff     Staff    @relation(fields: [staffId], references: [id])
}
```

#### ディレクトリ構造拡張

```
/server/api/v1/
├── room-service/     # 現在の注文システム
│   ├── orders/
│   ├── menu/
│   └── devices/
├── reservation/      # 予約システム
│   ├── bookings/
│   ├── guests/
│   └── rates/
├── staff/           # スタッフ管理
│   ├── members/
│   ├── shifts/
│   └── tasks/
├── housekeeping/    # ハウスキーピング
│   ├── tasks/
│   ├── inventory/
│   └── maintenance/
├── analytics/       # 分析機能
│   ├── dashboard/
│   ├── reports/
│   └── metrics/
└── shared/          # 共通API
    ├── places/
    ├── guests/
    └── config/
```

### Phase 2: マイクロサービス分離（6ヶ月〜1年）

#### アーキテクチャパターン

##### オプション1: マスタデータAPI

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Room Service    │  │ Reservation     │  │ Housekeeping    │
│ App             │  │ App             │  │ App             │
└─────────┬───────┘  └─────────┬───────┘  └─────────┬───────┘
          │                    │                    │
          │         API calls  │                    │
          └────────────────────┼────────────────────┘
                               │
                    ┌─────────────────┐
                    │ Master Data API │
                    │ (Places, Guests)│
                    └─────────┬───────┘
                              │
                    ┌─────────────────┐
                    │ Master Database │
                    └─────────────────┘
```

**実装例:**

```typescript
// Master Data Service
// server/api/v1/master/places.get.ts
export default defineEventHandler(async (event) => {
  const places = await prisma.place.findMany({
    include: {
      placeType: true,
      _count: {
        select: {
          orders: true,
          bookings: true,
          cleaningTasks: true
        }
      }
    }
  })
  return places
})

// Client側での利用
// composables/useMasterData.ts
export const useMasterData = () => {
  const places = ref([])
  
  const fetchPlaces = async () => {
    const { data } = await $fetch('/api/v1/master/places')
    places.value = data
  }
  
  return {
    places: readonly(places),
    fetchPlaces
  }
}
```

##### オプション2: イベント駆動アーキテクチャ

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Room Service    │  │ Reservation     │  │ Housekeeping    │
│ App             │  │ App             │  │ App             │
│ - Local DB      │  │ - Local DB      │  │ - Local DB      │
│ - Place Cache   │  │ - Place Cache   │  │ - Place Cache   │
└─────────┬───────┘  └─────────┬───────┘  └─────────┬───────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                    ┌─────────────────┐
                    │ Event Bus       │
                    │ (Redis/Queue)   │
                    └─────────┬───────┘
                              │
                    ┌─────────────────┐
                    │ Master Data     │
                    │ Service         │
                    └─────────────────┘
```

**実装例:**

```typescript
// Master Data Service
export const updatePlace = async (placeId: number, data: PlaceUpdateData) => {
  const updatedPlace = await prisma.place.update({
    where: { id: placeId },
    data
  })
  
  // イベント発行
  await publishEvent('place.updated', {
    placeId,
    place: updatedPlace
  })
  
  return updatedPlace
}

// Room Service App - イベント受信
export const handlePlaceUpdated = async (event: PlaceUpdatedEvent) => {
  // ローカルキャッシュを更新
  await updateLocalPlaceCache(event.place)
}
```

#### サービス分割境界

```typescript
// 🛏️ Room Service Domain
interface RoomServiceDomain {
  entities: ['Order', 'OrderItem', 'MenuItem', 'Category']
  operations: ['注文作成', '注文管理', 'メニュー管理', '配達管理']
  sharedData: ['Place', 'Guest'] // 参照のみ
}

// 📋 Reservation Domain  
interface ReservationDomain {
  entities: ['Booking', 'Rate', 'Payment']
  operations: ['予約作成', 'チェックイン/アウト', '料金管理']
  sharedData: ['Place', 'Guest'] // 作成・更新権限あり
}

// 👥 Staff Domain
interface StaffDomain {
  entities: ['Staff', 'Shift', 'Task', 'Role']
  operations: ['スタッフ管理', 'シフト管理', 'タスク管理']
  sharedData: ['Place'] // 参照のみ
}

// 🧹 Housekeeping Domain
interface HousekeepingDomain {
  entities: ['CleaningTask', 'Inventory', 'MaintenanceRequest']
  operations: ['清掃管理', '備品管理', 'メンテナンス']
  sharedData: ['Place', 'Staff'] // 参照のみ
}
```

## データ一元化戦略

### 共通データモデル

```typescript
// types/shared.ts
export interface SharedPlace {
  id: number
  code: string
  name: string
  placeType: PlaceType
  isActive: boolean
  attributes?: Record<string, any>
  floor?: number
  capacity?: number
  area?: number
}

export interface SharedGuest {
  id: number
  name: string
  email?: string
  phone?: string
  preferences?: Record<string, any>
  loyaltyLevel?: string
}

export interface SharedStaff {
  id: number
  name: string
  role: string
  email: string
  isActive: boolean
  department?: string
}
```

### キャッシング戦略

```typescript
// utils/cache.ts
export class DataCache {
  private cache = new Map()
  private ttl = 5 * 60 * 1000 // 5分
  
  async getPlaces(): Promise<Place[]> {
    const cacheKey = 'places'
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data
    }
    
    const places = await $fetch('/api/v1/shared/places')
    this.cache.set(cacheKey, {
      data: places,
      timestamp: Date.now()
    })
    
    return places
  }
  
  invalidate(key: string) {
    this.cache.delete(key)
  }
  
  invalidatePattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }
}
```

### API設計パターン

```typescript
// 統一されたAPI設計
// /api/v1/{domain}/{resource}/{action}

// Room Service
GET    /api/v1/room-service/orders
POST   /api/v1/room-service/orders
PUT    /api/v1/room-service/orders/:id

// Reservation
GET    /api/v1/reservation/bookings
POST   /api/v1/reservation/bookings
PUT    /api/v1/reservation/bookings/:id

// Shared Resources
GET    /api/v1/shared/places
GET    /api/v1/shared/places/:id
PUT    /api/v1/shared/places/:id  // Master Dataサービスでのみ更新可能

// 横断的な検索・分析API
GET    /api/v1/analytics/dashboard
GET    /api/v1/analytics/reports/revenue
GET    /api/v1/analytics/reports/occupancy
```

## 移行手順

### Step 1: 共通基盤整備
1. 共通データモデルの定義
2. 共有APIエンドポイントの作成
3. キャッシュ機能の実装
4. 統一的なエラーハンドリング

### Step 2: 新機能追加（モノリス内）
1. 予約管理機能
2. スタッフ管理機能
3. ハウスキーピング機能
4. 分析・レポート機能

### Step 3: サービス境界の明確化
1. ドメイン境界の特定
2. API契約の定義
3. データ依存関係の整理
4. 移行計画の策定

### Step 4: 段階的分離
1. Master Dataサービスの分離
2. 各ドメインサービスの独立化
3. イベント駆動アーキテクチャの導入
4. 監視・ログ機能の強化

## パフォーマンス考慮事項

### データベース最適化
```sql
-- インデックス戦略
CREATE INDEX idx_place_active ON places(isActive);
CREATE INDEX idx_booking_dates ON bookings(checkIn, checkOut);
CREATE INDEX idx_order_place_date ON orders(placeId, createdAt);
CREATE INDEX idx_cleaning_task_status ON cleaning_tasks(status, scheduledAt);
```

### キャッシュ戦略
```typescript
// Redis利用例（将来）
export class RedisCache {
  private redis: Redis
  
  async getPlaces(): Promise<Place[]> {
    const cached = await this.redis.get('places:all')
    if (cached) {
      return JSON.parse(cached)
    }
    
    const places = await fetchPlacesFromDB()
    await this.redis.setex('places:all', 300, JSON.stringify(places))
    return places
  }
}
```

## 監視・運用

### メトリクス定義
```typescript
// パフォーマンス監視
interface SystemMetrics {
  responseTime: {
    api: number
    database: number
  }
  throughput: {
    ordersPerMinute: number
    bookingsPerHour: number
  }
  errors: {
    errorRate: number
    criticalErrors: number
  }
  business: {
    occupancyRate: number
    averageOrderValue: number
    customerSatisfaction: number
  }
}
```

### ログ戦略
```typescript
// 構造化ログ
export const logger = {
  info: (message: string, context: any) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      context,
      timestamp: new Date().toISOString(),
      service: 'hotel-saas'
    }))
  },
  
  error: (message: string, error: Error, context: any) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: {
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString(),
      service: 'hotel-saas'
    }))
  }
}
```

## セキュリティ考慮事項

### 認証・認可
```typescript
// 役割ベースアクセス制御
interface Permission {
  resource: string
  action: 'read' | 'write' | 'delete'
  scope: 'own' | 'department' | 'all'
}

interface Role {
  name: string
  permissions: Permission[]
}

// 例：フロントスタッフの権限
const frontDeskRole: Role = {
  name: 'front_desk',
  permissions: [
    { resource: 'bookings', action: 'read', scope: 'all' },
    { resource: 'bookings', action: 'write', scope: 'all' },
    { resource: 'guests', action: 'read', scope: 'all' },
    { resource: 'places', action: 'read', scope: 'all' },
    { resource: 'orders', action: 'read', scope: 'all' }
  ]
}
```

### データ保護
```typescript
// 個人情報の暗号化
export const encryptPII = (data: string): string => {
  // 暗号化ロジック
  return encrypted
}

// 監査ログ
export const auditLog = {
  logAccess: (userId: string, resource: string, action: string) => {
    // 監査ログ記録
  }
}
```

## 判断基準

### モノリス継続の条件
- チーム規模：3-5人
- ホテル規模：小〜中規模（50室以下）
- 開発速度重視
- 運用コスト重視

### マイクロサービス移行の条件
- チーム規模：6人以上
- ホテル規模：大規模（100室以上）
- 複数ホテルチェーン対応
- 高可用性要求
- 部門別の独立開発が必要

---

*作成日: 2025年6月3日*
*最終更新: 2025年6月3日*
*バージョン: 1.0* 