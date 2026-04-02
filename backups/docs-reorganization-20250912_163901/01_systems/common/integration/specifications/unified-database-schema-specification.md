# 統一データベーススキーマ仕様書 (Unified Database Schema Specification)

**作成日**: 2024年12月28日  
**バージョン**: 2.0.0  
**対象システム**: hotel-common, hotel-member, hotel-pms, hotel-saas  
**基盤**: PostgreSQL 14+ + Prisma ORM

## 1. 概要 (Overview)

### 1.1 スキーマ設計原則
- **マルチテナント対応**: 全テーブルに `tenant_id` 必須
- **ソーストラッキング**: データ変更元システムの追跡
- **監査機能**: 全操作の履歴保持
- **段階移行対応**: 既存システムとの共存可能設計

### 1.2 システム間データ責任
- **hotel-member**: 顧客マスタ主管理（全権限）
- **hotel-pms**: 予約一元管理 + 限定顧客更新
- **hotel-saas**: 参照専用 + サービス注文管理
- **hotel-common**: 統一基盤・認証・ログ管理

## 2. ER図・エンティティ関係 (Entity Relationship Diagram)

### 2.1 核心エンティティ関係図

```mermaid
erDiagram
    tenant ||--o{ user : "has many"
    tenant ||--o{ customer : "has many"
    tenant ||--o{ reservation : "has many"
    tenant ||--o{ room : "has many"
    tenant ||--o{ system_event : "has many"
    
    user ||--o{ system_event : "generates"
    user }o--|| tenant : "belongs to"
    
    customer ||--o{ reservation : "makes"
    customer }o--|| tenant : "belongs to"
    
    reservation }o--|| customer : "belongs to"
    reservation }o--|| tenant : "belongs to"
    
    room }o--|| tenant : "belongs to"
    room ||--o{ room_memo : "has many"

    room_memo }o--|| tenant : "belongs to"
    room_memo ||--o{ room_memo_comment : "has many"
    room_memo ||--o{ room_memo_status_log : "has many"
    
    system_event }o--|| tenant : "belongs to"
    system_event }o--o| user : "created by"
    
    tenant {
        string id PK
        string name
        string code UK
        string domain
        json settings
        string plan_type
        enum status
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    user {
        string id PK
        string tenant_id FK
        string email UK
        string username UK
        string password_hash
        enum role
        int level
        string[] permissions
        string origin_system
        datetime synced_at
        string updated_by_system
        json system_settings
        datetime last_login_at
        int failed_login_count
        boolean is_locked
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    customer {
        string id PK
        string tenant_id FK
        string name
        string email UK
        string phone UK
        string address
        datetime birth_date
        string member_id UK
        string rank_id
        int total_points
        int total_stays
        string[] pms_updatable_fields
        string origin_system
        datetime synced_at
        string updated_by_system
        json preferences
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }
    
    reservation {
        string id PK
        string tenant_id FK
        string customer_id FK
        string guest_name
        datetime check_in_date
        datetime check_out_date
        int guest_count
        string status
        string origin
        decimal total_amount
        decimal paid_amount
        string special_requests
        string internal_notes
        datetime checked_in_at
        datetime checked_out_at
        datetime cancelled_at
        datetime created_at
        datetime updated_at
    }
    
    room {
        string id PK
        string tenant_id FK
        string room_number UK
        string room_type
        int floor
        int capacity
        string[] amenities
        json attributes
        enum status
        // notes は廃止（room_memosへ移行）
        decimal base_price
        string origin_system
        datetime synced_at
        string updated_by_system
        datetime created_at
        datetime updated_at
        datetime deleted_at
    }

    room_memo {
        string id PK
        string tenant_id FK
        string room_id FK
        enum category                 // reservation|handover|lost_item|maintenance|cleaning|guest_request|other
        enum visibility               // public|private|role
        string[] visible_roles        // role時のみ使用
        string content
        enum status                   // pending|in_progress|completed
        enum priority                 // low|normal|high|urgent
        datetime due_date
        string created_by_staff_id FK
        string assigned_to_staff_id FK
        string updated_by_staff_id FK
        datetime created_at
        datetime updated_at
        datetime deleted_at
        boolean is_deleted
    }

    room_memo_comment {
        string id PK
        string tenant_id FK
        string memo_id FK
        string parent_comment_id
        string content
        enum comment_type             // comment|status_change
        string status_from
        string status_to
        string created_by_staff_id FK
        datetime created_at
    }

    room_memo_status_log {
        string id PK
        string tenant_id FK
        string memo_id FK
        string status_from
        string status_to
        string comment
        string changed_by_staff_id FK
        datetime created_at
    }
    
    system_event {
        string id PK
        string tenant_id FK
        string user_id FK
        enum event_type
        string source_system
        string target_system
        string entity_type
        string entity_id
        enum action
        json event_data
        json before_data
        json after_data
        string ip_address
        string user_agent
        string request_id
        datetime occurred_at
    }
```

### 2.2 システム間権限マトリックス

| エンティティ | hotel-member | hotel-pms | hotel-saas | hotel-common |
|-------------|--------------|-----------|------------|--------------|
| **tenant** | READ | READ | READ | ADMIN |
| **user** | READ/UPDATE | READ | READ | ADMIN |
| **customer** | **ADMIN** | LIMITED_UPDATE | READ | READ |
| **reservation** | CREATE/READ | **ADMIN** | READ | READ |
| **room** | READ | **ADMIN** | NONE | READ |
| **system_event** | CREATE | CREATE | CREATE | ADMIN |

## 3. JWT クレーム構造標準化 (JWT Claims Structure)

### 3.1 統一JWTクレーム仕様

```typescript
interface HotelJWTPayload {
  // 🔐 RFC 7519 標準クレーム
  iss: string                  // Issuer: "hotel-common-auth"
  sub: string                  // Subject: user_id (UUID)
  aud: string[]               // Audience: ["hotel-member", "hotel-pms", "hotel-saas"]
  exp: number                 // Expiration: Unix timestamp (8時間後)
  nbf: number                 // Not Before: Unix timestamp
  iat: number                 // Issued At: Unix timestamp
  jti: string                 // JWT ID: UUID (Redis管理用)
  
  // 🏨 Hotel System専用クレーム
  tenant_id: string           // テナントUUID
  email: string               // ユーザーメールアドレス
  role: UserRole              // 'STAFF' | 'MANAGER' | 'ADMIN' | 'OWNER' | 'SYSTEM'
  level: number               // 権限レベル 1-5
  permissions: string[]       // 詳細権限配列
  
  // 🔄 システム間連携クレーム
  origin_system: SystemType   // 発行元システム
  source_systems: SystemType[] // アクセス可能システム
  
  // 📊 セッション管理クレーム
  session_id: string          // Redisセッション識別子
  device_id?: string          // デバイス識別子
  ip_address?: string         // 発行時IPアドレス
}

// システム間通信用JWTクレーム
interface SystemJWTPayload {
  iss: string                 // "hotel-common-system"
  sub: string                 // システムID
  aud: string[]              // 対象システム
  exp: number                // 15分後
  iat: number
  jti: string
  
  system_id: SystemType      // 発行元システム
  tenant_id: string          // 対象テナント
  permissions: string[]      // システム権限
  api_version: string        // "v2"
}

type SystemType = 'hotel-common' | 'hotel-member' | 'hotel-pms' | 'hotel-saas'
type UserRole = 'STAFF' | 'MANAGER' | 'ADMIN' | 'OWNER' | 'SYSTEM'
```

### 3.2 JWTトークン生成・検証仕様

```typescript
// アクセストークン生成例
const accessTokenPayload: HotelJWTPayload = {
  // 標準クレーム
  iss: "hotel-common-auth",
  sub: "user-uuid-12345",
  aud: ["hotel-member", "hotel-pms", "hotel-saas"],
  exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60), // 8時間
  nbf: Math.floor(Date.now() / 1000),
  iat: Math.floor(Date.now() / 1000),
  jti: "jwt-uuid-67890",
  
  // Hotel専用クレーム
  tenant_id: "tenant-uuid-abcde",
  email: "user@hotel.com",
  role: "STAFF",
  level: 3,
  permissions: ["reservation.read", "customer.read", "room.read"],
  
  // システム間連携
  origin_system: "hotel-common",
  source_systems: ["hotel-member", "hotel-pms", "hotel-saas"],
  
  // セッション管理
  session_id: "session-uuid-fghij",
  device_id: "device-uuid-klmno",
  ip_address: "192.168.1.100"
}

// システム間通信トークン生成例
const systemTokenPayload: SystemJWTPayload = {
  iss: "hotel-common-system",
  sub: "hotel-member",
  aud: ["hotel-pms"],
  exp: Math.floor(Date.now() / 1000) + (15 * 60), // 15分
  iat: Math.floor(Date.now() / 1000),
  jti: "system-jwt-uuid-pqrst",
  
  system_id: "hotel-member",
  tenant_id: "tenant-uuid-abcde",
  permissions: ["customer.read", "reservation.create"],
  api_version: "v2"
}
```

## 4. システム間インターフェース仕様 (System Interface Specification)

### 4.1 hotel-member インターフェース

```typescript
// hotel-member専用データアクセス権限
interface HotelMemberInterface {
  // 顧客管理（全権限）
  customers: {
    create: (data: CustomerCreateData) => Promise<Customer>
    read: (id: string) => Promise<Customer | null>
    update: (id: string, data: Partial<Customer>) => Promise<Customer>
    delete: (id: string) => Promise<boolean>
    search: (query: CustomerSearchQuery) => Promise<Customer[]>
  }
  
  // 会員機能専用
  members: {
    updatePoints: (customerId: string, points: number) => Promise<PointHistory>
    updateRank: (customerId: string, rank: string) => Promise<RankHistory>
    getPointHistory: (customerId: string) => Promise<PointHistory[]>
    calculateRank: (customerId: string) => Promise<string>
  }
  
  // 予約導線
  reservations: {
    create: (data: ReservationCreateData) => Promise<Reservation>
    getMemberReservations: (customerId: string) => Promise<Reservation[]>
    updateGuestInfo: (reservationId: string, data: GuestInfoData) => Promise<Reservation>
  }
  
  // イベント発行
  events: {
    publishCustomerUpdate: (customerId: string, data: any) => Promise<void>
    publishPointsChange: (customerId: string, change: number) => Promise<void>
    publishRankChange: (customerId: string, newRank: string) => Promise<void>
  }
}
```

### 4.2 hotel-pms インターフェース

```typescript
// hotel-pms専用データアクセス権限
interface HotelPmsInterface {
  // 予約管理（全権限）
  reservations: {
    create: (data: ReservationCreateData) => Promise<Reservation>
    read: (id: string) => Promise<Reservation | null>
    update: (id: string, data: Partial<Reservation>) => Promise<Reservation>
    cancel: (id: string, reason?: string) => Promise<Reservation>
    checkIn: (id: string, roomNumber: string) => Promise<Reservation>
    checkOut: (id: string, charges?: number[]) => Promise<Reservation>
    search: (query: ReservationSearchQuery) => Promise<Reservation[]>
  }
  
  // 顧客情報（限定更新）
  customers: {
    read: (id: string) => Promise<Customer | null>
    updateBasicInfo: (id: string, data: {
      name?: string
      phone?: string
      address?: string
    }) => Promise<Customer>
    search: (query: CustomerSearchQuery) => Promise<Customer[]>
    getStayHistory: (customerId: string) => Promise<StayHistory[]>
  }
  
  // 部屋管理（全権限）
  rooms: {
    getAvailability: (dateFrom: Date, dateTo: Date) => Promise<RoomAvailability[]>
    updateStatus: (roomNumber: string, status: RoomStatus) => Promise<Room>
    setMaintenance: (roomNumber: string, notes: string, until: Date) => Promise<Room>
    getOccupancy: (date: Date) => Promise<OccupancyReport>
  }
  
  // イベント発行
  events: {
    publishReservationUpdate: (reservationId: string, data: any) => Promise<void>
    publishCheckInOut: (reservationId: string, type: 'checkin' | 'checkout') => Promise<void>
    publishRoomStatusChange: (roomNumber: string, status: RoomStatus) => Promise<void>
  }
}
```

### 4.3 hotel-saas インターフェース

```typescript
// hotel-saas専用データアクセス権限
interface HotelSaasInterface {
  // 顧客情報（参照のみ）
  customers: {
    read: (id: string) => Promise<Customer | null>
    search: (query: CustomerSearchQuery) => Promise<Customer[]>
    getPreferences: (customerId: string) => Promise<CustomerPreferences>
  }
  
  // 予約情報（参照のみ）
  reservations: {
    getCurrent: (customerId?: string) => Promise<Reservation[]>
    getRoomInfo: (reservationId: string) => Promise<RoomInfo>
    getGuestList: (date: Date) => Promise<GuestListItem[]>
  }
  
  // サービス・注文管理（全権限）
  services: {
    createOrder: (data: ServiceOrderData) => Promise<ServiceOrder>
    updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<ServiceOrder>
    getOrderHistory: (customerId: string) => Promise<ServiceOrder[]>
    getConciergeRequests: (status?: string) => Promise<ConciergeRequest[]>
  }
  
  // イベント発行
  events: {
    publishServiceOrder: (orderId: string, data: any) => Promise<void>
    publishServiceComplete: (orderId: string) => Promise<void>
    publishFeedback: (customerId: string, feedback: FeedbackData) => Promise<void>
  }
}
```

## 5. データ移行マッピング (Data Migration Mapping)

### 5.1 hotel-member 移行マッピング

```typescript
// 既存hotel-memberスキーマ → 統一スキーマ
interface MemberMigrationMapping {
  // 既存 members テーブル → 統一 customers テーブル
  members: {
    id: 'id',                          // UUID維持
    hotel_id: 'tenant_id',             // テナント統一
    name: 'name',
    email: 'email',
    phone: 'phone',
    address: 'address',
    birthday: 'birth_date',
    member_number: 'member_id',        // 会員番号
    rank: 'rank_id',                   // ランク情報
    points: 'total_points',            // ポイント残高
    stay_count: 'total_stays',         // 宿泊回数
    preferences: 'preferences',        // JSON形式維持
    created_at: 'created_at',
    updated_at: 'updated_at'
  },
  
  // 新規追加フィールド
  additional_fields: {
    pms_updatable_fields: ['name', 'phone', 'address'],
    origin_system: 'hotel-member',
    updated_by_system: 'hotel-member',
    synced_at: 'NOW()'
  }
}
```

### 5.2 hotel-saas 移行マッピング

```typescript
// 既存hotel-saas SQLite → 統一PostgreSQL
interface SaasMigrationMapping {
  // 既存 orders テーブル → 新規 service_orders テーブル
  orders: {
    id: 'id',
    customer_id: 'customer_id',       // 顧客ID統一
    room_number: 'room_number',
    service_type: 'service_type',
    description: 'description',
    amount: 'amount',
    status: 'status',
    created_at: 'created_at'
  },
  
  // データ型変換
  type_conversions: {
    'INTEGER': 'INT',
    'TEXT': 'VARCHAR',
    'REAL': 'DECIMAL',
    'DATETIME': 'TIMESTAMP'
  }
}
```

### 5.3 rooms.notes → room_memos 移行マッピング（共通）

```typescript
// rooms.notes の既存値を room_memos へ一括取り込み
interface RoomNotesMigrationMapping {
  source: 'rooms.notes'
  target: 'room_memos'
  transform: (room: { id: string; tenant_id: string; room_number: string; notes: string | null }) => RoomMemoCreate[]
}

type RoomMemoCreate = {
  tenant_id: string
  room_id: string
  category: 'handover'        // 既定値
  visibility: 'public'        // 既定値
  visible_roles?: string[]
  content: string
  status: 'pending'
  priority: 'normal'
  created_by_staff_id: string // 不明な場合はシステムID
  assigned_to_staff_id?: string
}

// 移行ポリシー
// - 最古メモとして1件化 もしくは 行分割で系列化（選択式）
// - created_by_staff_id 未特定時は 'system' を使用
```

## 6. インデックス戦略 (Index Strategy)

### 6.1 必須インデックス

```sql
-- マルチテナント対応必須インデックス
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_customers_tenant_email ON customers(tenant_id, email);
CREATE INDEX idx_reservations_tenant_dates ON reservations(tenant_id, checkin_date, checkout_date);
CREATE INDEX idx_rooms_tenant_status ON rooms(tenant_id, status);

-- パフォーマンス最適化インデックス
CREATE INDEX idx_reservations_customer_status ON reservations(customer_id, status);
CREATE INDEX idx_customers_member_id ON customers(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX idx_system_events_tenant_occurred ON system_event(tenant_id, occurred_at);
CREATE INDEX idx_system_events_entity ON system_event(entity_type, entity_id);

-- 検索最適化インデックス
CREATE INDEX idx_customers_search ON customers USING gin(to_tsvector('japanese', name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '')));
CREATE INDEX idx_reservations_confirmation ON reservations(confirmation_code);
```

### 6.2 パーティション戦略

```sql
-- system_event テーブルの月次パーティション
CREATE TABLE system_event (
  -- カラム定義...
) PARTITION BY RANGE (occurred_at);

-- 月次パーティション作成例
CREATE TABLE system_event_2024_01 PARTITION OF system_event
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE system_event_2024_02 PARTITION OF system_event
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

## 7. 制約・バリデーション (Constraints & Validation)

### 7.1 データ整合性制約

```sql
-- 必須制約
ALTER TABLE users ADD CONSTRAINT chk_users_tenant_id CHECK (tenant_id IS NOT NULL);
ALTER TABLE customers ADD CONSTRAINT chk_customers_tenant_id CHECK (tenant_id IS NOT NULL);
ALTER TABLE reservations ADD CONSTRAINT chk_reservations_tenant_id CHECK (tenant_id IS NOT NULL);

-- ビジネス制約
ALTER TABLE reservations ADD CONSTRAINT chk_checkout_after_checkin 
  CHECK (checkout_date > checkin_date);
ALTER TABLE customers ADD CONSTRAINT chk_points_non_negative 
  CHECK (total_points >= 0);
ALTER TABLE rooms ADD CONSTRAINT chk_capacity_positive 
  CHECK (capacity > 0);

-- 一意制約
ALTER TABLE customers ADD CONSTRAINT unq_customers_tenant_email 
  UNIQUE (tenant_id, email) DEFERRABLE;
ALTER TABLE users ADD CONSTRAINT unq_users_tenant_email 
  UNIQUE (tenant_id, email) DEFERRABLE;
```

### 7.2 アプリケーションレベルバリデーション

```typescript
// Zod スキーマによるバリデーション
export const CustomerCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().regex(/^[0-9-+()\ ]+$/).optional(),
  address: z.string().max(500).optional(),
  birth_date: z.date().max(new Date()).optional(),
  member_id: z.string().optional(),
  preferences: z.object({}).optional()
})

export const ReservationCreateSchema = z.object({
  tenant_id: z.string().uuid(),
  customer_id: z.string().uuid().optional(),
  guest_name: z.string().min(1).max(100),
  checkin_date: z.date(),
  checkout_date: z.date(),
  room_type: z.string().min(1),
  total_amount: z.number().min(0),
  origin: z.enum(['MEMBER', 'OTA', 'FRONT', 'PHONE', 'WALK_IN'])
}).refine(data => data.checkout_date > data.checkin_date, {
  message: "チェックアウト日はチェックイン日より後である必要があります"
})
```

## 8. 運用・監視仕様 (Operations & Monitoring)

### 8.1 パフォーマンス監視

```sql
-- スロークエリ検知
SELECT query, mean_time, calls, total_time 
FROM pg_stat_statements 
WHERE mean_time > 1000 -- 1秒以上
ORDER BY mean_time DESC;

-- インデックス使用状況
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_tup_read DESC;

-- テーブルサイズ監視
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 8.2 データ整合性チェック

```typescript
// 定期整合性チェック
export class DataIntegrityChecker {
  async runDailyChecks(): Promise<IntegrityReport> {
    const checks = await Promise.all([
      this.checkOrphanedRecords(),
      this.checkDuplicateEmails(),
      this.checkReservationConflicts(),
      this.checkPointBalance(),
      this.checkSystemEventLogs()
    ])
    
    return {
      timestamp: new Date(),
      checks: checks,
      overallStatus: checks.every(c => c.passed) ? 'PASS' : 'FAIL'
    }
  }
  
  private async checkOrphanedRecords(): Promise<IntegrityCheckResult> {
    const orphanedCustomers = await this.db.customer.count({
      where: {
        tenant: null
      }
    })
    
    return {
      checkName: 'orphaned_records',
      passed: orphanedCustomers === 0,
      details: { orphanedCustomers }
    }
  }
}
```

---

## 📝 実装チェックリスト

### Phase 1: スキーマ実装
- [ ] Prismaスキーマファイル更新
- [ ] マイグレーションファイル生成
- [ ] インデックス作成スクリプト
- [ ] 制約追加スクリプト

### Phase 2: インターフェース実装  
- [ ] TypeScript型定義ファイル
- [ ] システム別アクセス制御クラス
- [ ] JWT クレーム検証関数
- [ ] データ移行スクリプト

### Phase 3: 運用準備
- [ ] パフォーマンス監視設定
- [ ] データ整合性チェック
- [ ] バックアップ・復旧手順
- [ ] 運用ドキュメント

**注意事項**:
1. 本仕様書は実装の完全なガイドラインです
2. 全てのシステムがこのスキーマに準拠する必要があります  
3. 変更時は必ず統合影響評価を実施してください
4. パフォーマンス監視は実装初日から開始してください 