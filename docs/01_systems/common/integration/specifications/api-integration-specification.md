# 🔗 Hotel Common API統合仕様書

**バージョン**: 2.0.0  
**策定日**: 2024年12月  
**適用対象**: hotel-saas、hotel-member、hotel-pms  
**統一基盤**: hotel-common PostgreSQL基盤

---

## 📋 **概要**

このドキュメントは、ホテル管理システム群における統一API連携の標準仕様を定義します。Phase 1で構築されたPostgreSQL統一基盤[[memory:3371266]]を基に、各システム間の整合性を保った連携を実現します。

---

## 🎯 **設計原則**

### **1. 統一性原則**
- 全システム共通のAPIレスポンス形式
- 統一エラーコード体系
- 標準化された認証方式

### **2. 責任分離原則**[[memory:3369219]]
- **hotel-member**: 顧客マスタの正本保持・全権限
- **hotel-pms**: 予約一元管理・限定顧客更新権限  
- **hotel-saas**: 参照専用・注文データ管理

### **3. ソーストラッキング原則**
- 全データ変更に`origin_system`記録
- `synced_at`、`updated_by_system`による追跡
- システム間監査ログ自動記録

---

## 🌐 **RESTful API設計標準**

### **エンドポイント命名規約**
```
GET    /api/v2/{entity}               - 一覧取得
GET    /api/v2/{entity}/{id}          - 詳細取得  
POST   /api/v2/{entity}               - 新規作成
PUT    /api/v2/{entity}/{id}          - 全体更新
PATCH  /api/v2/{entity}/{id}          - 部分更新
DELETE /api/v2/{entity}/{id}          - 削除（論理削除）
```

### **統一レスポンス形式**
```typescript
interface StandardApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string          // 統一エラーコード
    message: string       // 日本語エラーメッセージ
    details?: any         // 詳細情報
    field?: string        // エラー対象フィールド
  }
  meta?: {
    page?: number         // ページ番号
    limit?: number        // 取得件数制限
    total?: number        // 総件数
    has_next?: boolean    // 次ページ有無
  }
  system: {
    source: string        // 'hotel-saas' | 'hotel-member' | 'hotel-pms'
    timestamp: string     // ISO 8601形式
    request_id: string    // トレーシング用UUID
    version: string       // API バージョン
  }
}
```

### **統一エラーコード体系**
```typescript
enum HotelErrorCode {
  // 共通エラー (E001-E099)
  INVALID_REQUEST = "E001",      // 不正なリクエスト
  UNAUTHORIZED = "E002",         // 認証失敗
  FORBIDDEN = "E003",           // 権限不足
  NOT_FOUND = "E004",           // リソース未存在
  VALIDATION_ERROR = "E005",     // バリデーションエラー
  
  // 認証・認可エラー (A001-A099)
  TOKEN_EXPIRED = "A001",        // トークン期限切れ
  INVALID_TOKEN = "A002",        // 無効なトークン
  PERMISSION_DENIED = "A003",    // 操作権限なし
  TENANT_MISMATCH = "A004",      // テナント不一致
  
  // ビジネスロジックエラー (B001-B999)
  CUSTOMER_NOT_FOUND = "B001",   // 顧客未存在
  RESERVATION_CONFLICT = "B002", // 予約競合
  ROOM_UNAVAILABLE = "B003",     // 客室利用不可
  INSUFFICIENT_POINTS = "B004",  // ポイント不足
  INVALID_DATE_RANGE = "B005",   // 無効な日付範囲
  CHECKOUT_BEFORE_CHECKIN = "B006", // チェックアウト日がチェックイン日より前
  
  // システムエラー (S001-S099)
  DATABASE_ERROR = "S001",       // データベースエラー
  SYNC_FAILURE = "S002",         // 同期失敗
  EXTERNAL_API_ERROR = "S003",   // 外部API呼び出し失敗
  RATE_LIMIT_EXCEEDED = "S004"   // レート制限超過
}
```

---

## 🔐 **統一認証・認可システム**

### **JWT仕様**[[memory:3370954]]
```typescript
interface HotelJWTPayload {
  // 基本情報
  user_id: string               // ユーザーUUID
  tenant_id: string            // テナントUUID
  email: string                // メールアドレス
  
  // 権限情報
  role: 'STAFF' | 'MANAGER' | 'ADMIN' | 'OWNER' | 'SYSTEM'
  level: number                // 1-5段階権限レベル
  permissions: string[]        // 詳細権限配列
  
  // システム情報
  origin_system: string        // 発行システム
  source_systems: string[]     // アクセス可能システム
  
  // 有効期限
  iat: number                  // 発行時刻
  exp: number                  // 有効期限（8時間）
  jti: string                  // JWT ID（Redis管理）
}
```

### **APIキー認証（システム間通信）**
```typescript
interface SystemApiKey {
  api_key: string              // システム固有APIキー
  system_id: string          // hotel-saas | hotel-member | hotel-pms
  tenant_id: string          // 対象テナント
  permissions: string[]       // 許可操作
  expires_at: Date           // 有効期限
}
```

### **認証ヘッダー標準**
```http
Authorization: Bearer {JWT_TOKEN}
X-API-Key: {SYSTEM_API_KEY}
X-Tenant-ID: {TENANT_UUID}
X-Request-ID: {REQUEST_UUID}
X-Source-System: hotel-member
```

---

## 🏗️ **システム間連携仕様**

### **1. 顧客データ連携**[[memory:3369219]]

#### **hotel-member（主管理システム）**
```typescript
// 顧客管理API - 全権限
POST   /api/v2/customers                    // 新規顧客作成
GET    /api/v2/customers                    // 顧客一覧取得
GET    /api/v2/customers/{id}               // 顧客詳細取得
PUT    /api/v2/customers/{id}               // 顧客情報更新（全フィールド）
PATCH  /api/v2/customers/{id}               // 部分更新
DELETE /api/v2/customers/{id}               // 論理削除

// 会員専用機能
GET    /api/v2/customers/{id}/points        // ポイント履歴
POST   /api/v2/customers/{id}/points        // ポイント付与/消費
GET    /api/v2/customers/{id}/rank          // ランク情報
PUT    /api/v2/customers/{id}/rank          // ランク変更
```

#### **hotel-pms（限定更新権限）**
```typescript
// 顧客参照・限定更新
GET    /api/v2/customers                    // 顧客一覧（検索）
GET    /api/v2/customers/{id}               // 顧客詳細
PATCH  /api/v2/customers/{id}               // 限定フィールドのみ更新
// 更新可能フィールド: name, phone, address のみ
// 会員ランク・配信設定は更新不可

// PMS専用機能
GET    /api/v2/customers/{id}/stay-history  // 宿泊履歴
POST   /api/v2/customers/{id}/stay-record   // 宿泊記録追加
```

#### **hotel-saas（参照専用）**
```typescript
// 顧客参照のみ
GET    /api/v2/customers/{id}               // 顧客詳細（基本情報のみ）
GET    /api/v2/customers/search             // 顧客検索（名前・部屋番号）

// 注文関連
GET    /api/v2/customers/{id}/preferences   // 嗜好情報（注文用）
```

### **2. 予約データ連携**[[memory:3368959]]

#### **hotel-pms（中心管理システム）**
```typescript
// 予約管理API - 全権限
POST   /api/v2/reservations                 // 新規予約作成
GET    /api/v2/reservations                 // 予約一覧取得
GET    /api/v2/reservations/{id}            // 予約詳細取得
PUT    /api/v2/reservations/{id}            // 予約更新
PATCH  /api/v2/reservations/{id}/status     // ステータス変更
DELETE /api/v2/reservations/{id}            // 予約キャンセル

// PMS専用機能
PATCH  /api/v2/reservations/{id}/checkin    // チェックイン処理
PATCH  /api/v2/reservations/{id}/checkout   // チェックアウト処理
GET    /api/v2/reservations/calendar        // 予約カレンダー
GET    /api/v2/reservations/statistics      // 予約統計
```

#### **hotel-member（予約導線特化）**
```typescript
// 予約導線・会員予約
POST   /api/v2/reservations                 // 会員予約作成
GET    /api/v2/reservations/availability    // 空室状況確認
GET    /api/v2/reservations/member/{id}     // 会員予約履歴
PATCH  /api/v2/reservations/{id}/guest-info // ゲスト情報更新（予約前）

// 会員特典
GET    /api/v2/reservations/{id}/benefits   // 適用可能特典
POST   /api/v2/reservations/{id}/apply-benefit // 特典適用
```

#### **hotel-saas（参照・注文連携）**
```typescript
// 予約参照・注文連携
GET    /api/v2/reservations/current         // 現在滞在中予約
GET    /api/v2/reservations/{id}/room-info  // 客室情報
POST   /api/v2/reservations/{id}/orders     // 注文データ連携
```

### **3. 注文データ連携**

#### **hotel-saas（主管理システム）**
```typescript
// 注文管理API - 全権限
POST   /api/v2/orders                       // 新規注文作成
GET    /api/v2/orders                       // 注文一覧
GET    /api/v2/orders/{id}                  // 注文詳細
PATCH  /api/v2/orders/{id}/status           // 注文ステータス更新
GET    /api/v2/orders/statistics            // 注文統計

// コンシェルジュ機能
POST   /api/v2/concierge/requests           // コンシェルジュ依頼
GET    /api/v2/concierge/services           // 利用可能サービス
```

#### **hotel-pms（会計連携）**
```typescript
// 注文・会計連携
GET    /api/v2/orders/billing/{reservation_id} // 注文請求情報
POST   /api/v2/orders/payment/{order_id}    // 決済処理連携
GET    /api/v2/orders/daily-report          // 日次注文レポート
```

#### **hotel-member（ポイント連携）**
```typescript
// ポイント・特典連携
POST   /api/v2/orders/{id}/points           // 注文ポイント付与
GET    /api/v2/orders/{id}/member-benefits  // 会員特典適用
```

---

## ⚡ **Event-driven連携**[[memory:3370872]]

### **リアルタイム同期対象（現実的範囲）**
```typescript
interface CriticalRealtimeEvent {
  event_type: 'ota_reservation' | 'room_availability' | 'order_billing' | 'checkin_checkout'
  entity_id: string
  tenant_id: string
  source_system: string
  target_systems: string[]
  data: any
  timestamp: Date
  priority: 'CRITICAL'
}

// Critical：数秒単位同期必須
- OTA予約競合防止 (外部OTA → hotel-pms)
- 客室在庫・予約可能状況 (hotel-pms → hotel-member)
- 注文→請求連携 (hotel-saas → hotel-pms) 
- チェックイン/チェックアウト (hotel-pms → all systems)

// ⚠️ 以下は日次バッチに変更
- 顧客基本情報変更 → 日次バッチ (毎日 AM 6:00)
- ポイント残高変更 → 日次バッチ (毎日 AM 3:00)
- 分析・レポート → 週次・月次バッチ
```

### **バッチ同期対象（現実的頻度）**
```typescript
interface BatchSyncTask {
  task_type: 'customer_sync' | 'points_calculation' | 'daily_stats' | 'monthly_report'
  schedule: string  // cron形式
  source_system: string
  target_systems: string[]
  data_range: 'daily' | 'weekly' | 'monthly'
}

// 日次バッチ（現実的な同期頻度）
- 顧客基本情報同期 (hotel-member ↔ hotel-pms) AM 6:00
- ポイント・ランク計算 (hotel-member → all systems) AM 3:00
- 売上集計 (hotel-pms → hotel-member) AM 4:00

// 週次バッチ（分析・最適化）
- 滞在傾向分析 (hotel-pms → hotel-member) 月曜 AM 2:00
- 人気サービス分析 (hotel-saas → hotel-member) 月曜 AM 3:00

// 月次バッチ（レポート・統計）
- 月次レポート生成 (all systems → hotel-pms) 1日 AM 1:00
- 年間統計更新 (hotel-pms → all systems) 1日 AM 2:00
```

---

## 🔄 **データ同期・競合解決**

### **同期優先度ルール**
```typescript
interface SyncPriority {
  entity_type: string
  primary_system: string      // 主管理システム
  update_permissions: {
    [system: string]: string[] // 更新可能フィールド
  }
  conflict_resolution: 'timestamp' | 'system_priority' | 'manual'
}

const SYNC_RULES: SyncPriority[] = [
  {
    entity_type: 'customer',
    primary_system: 'hotel-member',
    update_permissions: {
      'hotel-member': ['*'],  // 全フィールド
      'hotel-pms': ['name', 'phone', 'address'],
      'hotel-saas': []  // 参照のみ
    },
    conflict_resolution: 'system_priority'
  },
  {
    entity_type: 'reservation', 
    primary_system: 'hotel-pms',
    update_permissions: {
      'hotel-pms': ['*'],
      'hotel-member': ['guest_name', 'special_requests'],
      'hotel-saas': []
    },
    conflict_resolution: 'timestamp'
  }
]
```

### **競合解決アルゴリズム**
```typescript
interface ConflictResolution {
  conflict_id: string
  entity_type: string
  entity_id: string
  conflicts: {
    field: string
    system_a: { value: any, timestamp: Date, system: string }
    system_b: { value: any, timestamp: Date, system: string }
  }[]
  resolution_strategy: 'auto' | 'manual'
  resolved_at?: Date
  resolved_by?: string
}

// 自動解決ルール
1. システム優先度: hotel-member > hotel-pms > hotel-saas
2. タイムスタンプ優先: 最新の変更を採用
3. フィールド権限: 更新権限のあるシステムを優先

// 手動解決が必要な場合
- 金額差異 > 1000円
- 予約期間の重複・矛盾
- 顧客の重要フィールド差異（名前・連絡先）
```

---

## 📊 **API監視・ログ**

### **リクエストログ形式**
```typescript
interface ApiRequestLog {
  request_id: string
  timestamp: Date
  source_system: string
  target_endpoint: string
  method: string
  tenant_id: string
  user_id?: string
  
  request: {
    headers: Record<string, string>
    params: any
    body: any
  }
  
  response: {
    status_code: number
    response_time_ms: number
    data_size_bytes: number
    error?: any
  }
  
  metadata: {
    user_agent?: string
    ip_address?: string
    api_version: string
  }
}
```

### **パフォーマンス監視**
```typescript
interface ApiMetrics {
  endpoint: string
  method: string
  
  // パフォーマンス指標
  avg_response_time: number     // 平均応答時間（ms）
  p95_response_time: number     // 95パーセンタイル応答時間
  requests_per_second: number   // 1秒あたりリクエスト数
  
  // 品質指標
  success_rate: number          // 成功率（%）
  error_rate: number           // エラー率（%）
  timeout_rate: number         // タイムアウト率（%）
  
  // 期間
  measurement_period: {
    start: Date
    end: Date
    duration_minutes: number
  }
}

// アラート閾値
const ALERT_THRESHOLDS = {
  response_time_ms: 2000,      // 2秒以上
  error_rate_percent: 5,       // 5%以上
  success_rate_percent: 95     // 95%未満
}
```

---

## 🚨 **エラーハンドリング・復旧手順**

### **通信障害時の対応**[[memory:3370872]]
```typescript
interface OfflineStrategy {
  system: string
  offline_capabilities: string[]
  local_cache_duration: number
  sync_strategy: 'immediate' | 'queue' | 'batch'
  
  recovery_steps: {
    step: number
    action: string
    timeout_seconds: number
    retry_count: number
  }[]
}

// hotel-pms オフライン対応
const PMS_OFFLINE_STRATEGY: OfflineStrategy = {
  system: 'hotel-pms',
  offline_capabilities: [
    'checkin_checkout',     // チェックイン/アウト継続
    'room_management',      // 客室管理
    'basic_billing'         // 基本会計
  ],
  local_cache_duration: 24, // 24時間
  sync_strategy: 'queue',   // キューで差分同期
  
  recovery_steps: [
    { step: 1, action: 'health_check', timeout_seconds: 30, retry_count: 3 },
    { step: 2, action: 'auth_refresh', timeout_seconds: 60, retry_count: 2 },
    { step: 3, action: 'data_sync', timeout_seconds: 300, retry_count: 1 },
    { step: 4, action: 'full_verification', timeout_seconds: 600, retry_count: 1 }
  ]
}
```

### **段階的復旧プロセス**
```typescript
interface RecoveryPhase {
  phase: number
  name: string
  description: string
  systems_involved: string[]
  estimated_duration_minutes: number
  success_criteria: string[]
}

const RECOVERY_PHASES: RecoveryPhase[] = [
  {
    phase: 1,
    name: '緊急復旧',
    description: '最低限の業務継続機能を復旧',
    systems_involved: ['hotel-pms'],
    estimated_duration_minutes: 5,
    success_criteria: ['PMS基本機能稼働', 'ローカルDB接続確認']
  },
  {
    phase: 2, 
    name: '部分連携復旧',
    description: 'hotel-memberとの基本連携を復旧',
    systems_involved: ['hotel-pms', 'hotel-member'],
    estimated_duration_minutes: 15,
    success_criteria: ['顧客データ同期確認', '認証連携復旧']
  },
  {
    phase: 3,
    name: '完全復旧',
    description: '全システム連携とリアルタイム同期を復旧',
    systems_involved: ['hotel-pms', 'hotel-member', 'hotel-saas'],
    estimated_duration_minutes: 30,
    success_criteria: ['全API接続確認', 'イベント同期正常化', 'データ整合性確認']
  }
]
```

---

## 📖 **実装ガイドライン**

### **各システムでの実装手順**

#### **1. hotel-commonライブラリ統合**
```typescript
// package.json に追加
"dependencies": {
  "hotel-common": "^1.0.0"
}

// 統一APIクライアント使用
import { createUnifiedClient } from 'hotel-common'

const apiClient = createUnifiedClient({
  tenantId: process.env.TENANT_ID,
  userId: getCurrentUserId(),
  source: 'hotel-member' // システム識別
})

// 顧客データ取得例
const customers = await apiClient.getCustomers({
  search: '田中',
  memberOnly: true,
  limit: 50
})
```

#### **2. 認証統合**
```typescript
// JWT認証ミドルウェア
import { verifyHotelJWT, refreshToken } from 'hotel-common'

app.use('/api/v2', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    const payload = await verifyHotelJWT(token)
    
    req.user = payload
    req.tenant_id = payload.tenant_id
    next()
  } catch (error) {
    if (error.code === 'TOKEN_EXPIRED') {
      // リフレッシュトークンで自動更新
      const newToken = await refreshToken(req.headers['x-refresh-token'])
      res.setHeader('X-New-Token', newToken)
      // 処理続行
    } else {
      res.status(401).json({
        success: false,
        error: { code: 'A002', message: '認証に失敗しました' }
      })
    }
  }
})
```

#### **3. イベント連携実装**
```typescript
// Event Publisher
import { publishHotelEvent } from 'hotel-common'

// 顧客情報更新時のイベント発行
await publishHotelEvent({
  event_type: 'customer',
  entity_id: customer.id,
  source_system: 'hotel-member',
  target_systems: ['hotel-pms', 'hotel-saas'],
  data: {
    action: 'update',
    changes: updatedFields,
    timestamp: new Date()
  },
  priority: 'MEDIUM'
})

// Event Subscriber
import { subscribeHotelEvents } from 'hotel-common'

subscribeHotelEvents('hotel-pms', {
  customer: async (event) => {
    // 顧客データ同期処理
    await syncCustomerData(event.entity_id, event.data)
  },
  reservation: async (event) => {
    // 予約データ処理
    await processReservationEvent(event)
  }
})
```

---

## ✅ **品質保証・テスト**

### **API統合テストシナリオ**
```typescript
interface IntegrationTestScenario {
  scenario_id: string
  name: string
  description: string
  systems_involved: string[]
  test_steps: TestStep[]
  expected_outcomes: string[]
}

const INTEGRATION_TESTS: IntegrationTestScenario[] = [
  {
    scenario_id: 'CUST_001',
    name: '顧客情報更新連携',
    description: 'hotel-memberでの顧客情報更新がhotel-pmsに正常同期されることを確認',
    systems_involved: ['hotel-member', 'hotel-pms'],
    test_steps: [
      { action: 'hotel-member: 顧客情報更新API呼び出し', expected: '200 OK' },
      { action: 'イベント発行確認', expected: 'customer updateイベント発行' },
      { action: 'hotel-pms: 同期完了確認', expected: '顧客データ更新確認' },
      { action: 'データ整合性確認', expected: '両システムで同一データ' }
    ],
    expected_outcomes: ['同期時間 < 5秒', 'データ100%一致', 'エラー0件']
  }
]
```

---

## 📚 **Next Steps - Phase 3準備**

**Phase 3で実装予定**:
1. **認証統一基盤実装**: JWT + Redis実装
2. **Event-driven基盤構築**: Pub/Sub システム
3. **監視・ログシステム**: 統合監視ダッシュボード
4. **運用手順書**: 障害対応・メンテナンス手順

---

**この仕様書は、各システムチームが統一された方法でAPI連携を実装するための完全なガイドラインです。Phase 1のPostgreSQL統一基盤と組み合わせることで、堅牢で拡張性の高いホテルシステム群を実現します。** 