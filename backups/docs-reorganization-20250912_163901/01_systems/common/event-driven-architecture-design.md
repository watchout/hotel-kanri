# 🌐 Event-driven連携基盤設計書

**バージョン**: 1.0.0  
**策定日**: 2024年12月  
**適用対象**: hotel-saas、hotel-member、hotel-pms  
**基盤システム**: hotel-common Event-driven Infrastructure

---

## 📋 **概要**

ホテル管理システム群における統一Event-driven連携基盤の設計仕様書です。リアルタイム同期・バッチ同期・通信障害対応を含む包括的なイベント駆動アーキテクチャを定義します。

### **設計原則**[[memory:3370872]]
- **リアルタイム同期**: 予約情報・チェックイン/アウト・顧客基本情報・ポイント・部屋在庫
- **バッチ同期**: 売上集計・分析・レポート
- **通信障害対応**: hotel-pmsローカルキャッシュで業務継続、復旧後差分同期
- **技術基盤**: Webhook + 非同期Queue処理、RabbitMQ/Kafka検討

---

## 🏗️ **アーキテクチャ概要**

### **システム構成図**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   hotel-saas    │    │  hotel-member   │    │   hotel-pms     │
│   (Port: 3100)  │    │  (Port: 3200)   │    │  (Port: 3300)   │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │Event Publisher│ │    │ │Event Publisher│ │    │ │Event Publisher│ │
│ │Event Consumer │ │    │ │Event Consumer │ │    │ │Event Consumer │ │
│ │WebSocket Client│ │    │ │WebSocket Client│ │    │ │WebSocket Client│ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────┬───────────┴──────────┬───────────┘
                     │                      │
                     ▼                      ▼
              ┌─────────────────────────────────────────┐
              │        hotel-common Event Hub           │
              │         (Port: 3400)                    │
              │                                         │
              │ ┌─────────────┐ ┌─────────────────────┐ │
              │ │ Event Router│ │  Message Queue      │ │
              │ │ (WebSocket) │ │  (Redis/RabbitMQ)   │ │
              │ └─────────────┘ └─────────────────────┘ │
              │                                         │
              │ ┌─────────────┐ ┌─────────────────────┐ │
              │ │Event Storage│ │ Offline Cache       │ │
              │ │(PostgreSQL) │ │ (Redis/Local)       │ │
              │ └─────────────┘ └─────────────────────┘ │
              └─────────────────────────────────────────┘
```

---

## 🔄 **イベント分類・同期戦略**

### **リアルタイム同期イベント**（高優先度）

#### **1. 予約関連イベント**
```typescript
interface ReservationEvent {
  type: 'reservation'
  action: 'created' | 'updated' | 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out'
  priority: 'HIGH'
  sync_mode: 'realtime'
  data: {
    reservation_id: string
    customer_id?: string
    room_type: string
    room_number?: string
    checkin_date: Date
    checkout_date: Date
    total_amount: number
    status: ReservationStatus
    origin: ReservationOrigin
    // ソーストラッキング
    origin_system: 'hotel-member' | 'hotel-pms' | 'hotel-saas'
    updated_by_system: string
    synced_at: Date
  }
  targets: ['hotel-member', 'hotel-pms', 'hotel-saas'] // 全システムに配信
  delivery_guarantee: 'at_least_once'
}
```

#### **2. 顧客情報イベント**
```typescript
interface CustomerEvent {
  type: 'customer'
  action: 'created' | 'updated' | 'rank_changed' | 'points_changed'
  priority: 'HIGH'
  sync_mode: 'realtime'
  data: {
    customer_id: string
    name?: string
    email?: string
    phone?: string
    rank_id?: string
    total_points?: number
    updated_fields: string[] // 更新されたフィールドのみ
    // 権限制御
    updatable_by_pms: boolean
    // ソーストラッキング
    origin_system: 'hotel-member' | 'hotel-pms'
    updated_by_system: string
    synced_at: Date
  }
  targets: ['hotel-member', 'hotel-pms', 'hotel-saas']
  delivery_guarantee: 'at_least_once'
}
```

#### **3. 部屋在庫・状態イベント**
```typescript
interface RoomEvent {
  type: 'room'
  action: 'status_changed' | 'maintenance_updated' | 'price_updated'
  priority: 'HIGH'
  sync_mode: 'realtime'
  data: {
    room_id: string
    room_number: string
    room_type: string
    status: RoomStatus
    availability_date: Date
    base_price?: number
    maintenance_notes?: string
    // ソーストラッキング
    origin_system: 'hotel-pms'
    updated_by_system: string
    synced_at: Date
  }
  targets: ['hotel-member', 'hotel-pms'] // 予約システムのみ
  delivery_guarantee: 'at_least_once'
}
```

#### **4. チェックイン/アウトイベント**
```typescript
interface CheckInOutEvent {
  type: 'checkin_checkout'
  action: 'checked_in' | 'checked_out' | 'no_show'
  priority: 'CRITICAL'
  sync_mode: 'realtime'
  data: {
    reservation_id: string
    customer_id?: string
    room_number: string
    actual_checkin_time?: Date
    actual_checkout_time?: Date
    additional_charges?: number
    payment_status: 'pending' | 'completed' | 'failed'
    // ソーストラッキング
    origin_system: 'hotel-pms'
    updated_by_system: string
    synced_at: Date
  }
  targets: ['hotel-member', 'hotel-pms', 'hotel-saas']
  delivery_guarantee: 'exactly_once' // 重要イベントは重複配信防止
}
```

### **バッチ同期イベント**（中優先度）

#### **5. 売上・分析イベント**
```typescript
interface AnalyticsEvent {
  type: 'analytics'
  action: 'daily_report' | 'weekly_report' | 'monthly_report'
  priority: 'MEDIUM'
  sync_mode: 'batch'
  schedule: 'daily_23:00' | 'weekly_sunday_01:00' | 'monthly_1st_02:00'
  data: {
    report_type: string
    period_start: Date
    period_end: Date
    total_revenue: number
    occupancy_rate: number
    customer_count: number
    average_stay_duration: number
    detailed_data: any // 詳細レポートデータ
    // ソーストラッキング
    generated_by_system: 'hotel-pms'
    generated_at: Date
  }
  targets: ['hotel-member', 'hotel-saas'] // 分析・マーケティング用
  delivery_guarantee: 'at_least_once'
}
```

---

## 🔧 **技術実装仕様**

### **Event Publisher（イベント発行者）**

#### **統一EventPublisherクラス**
```typescript
// hotel-common/src/events/event-publisher.ts
export class HotelEventPublisher {
  private redisClient: Redis
  private webSocketServer: WebSocketServer
  private queueClient: QueueClient // RabbitMQ/Redis Queue
  
  constructor(config: EventPublisherConfig) {
    this.redisClient = new Redis(config.redis)
    this.webSocketServer = new WebSocketServer(config.websocket)
    this.queueClient = new QueueClient(config.queue)
  }
  
  async publishEvent<T extends HotelEvent>(event: T): Promise<void> {
    try {
      // 1. イベント検証・ソーストラッキング追加
      const validatedEvent = this.validateAndEnrichEvent(event)
      
      // 2. 優先度・同期方式による配信方法選択
      switch (event.sync_mode) {
        case 'realtime':
          await this.publishRealtimeEvent(validatedEvent)
          break
        case 'batch':
          await this.scheduleBatchEvent(validatedEvent)
          break
      }
      
      // 3. イベントストレージ（監査・復旧用）
      await this.storeEvent(validatedEvent)
      
    } catch (error) {
      await this.handlePublishError(event, error)
    }
  }
  
  private async publishRealtimeEvent(event: HotelEvent): Promise<void> {
    // WebSocket即座配信（接続中システム）
    this.webSocketServer.broadcast(event.targets, event)
    
    // Queue配信（オフラインシステム・保証配信）
    await this.queueClient.enqueue(event)
    
    // 重要イベントは複数経路で配信
    if (event.priority === 'CRITICAL') {
      await this.webhookClient.deliver(event)
    }
  }
}
```

### **Event Consumer（イベント消費者）**

#### **各システムでのEventConsumer**
```typescript
// hotel-member/src/events/event-consumer.ts (例)
export class MemberEventConsumer {
  private eventClient: HotelEventClient
  
  constructor() {
    this.eventClient = new HotelEventClient({
      system: 'hotel-member',
      subscriptions: [
        'reservation.*',    // 全予約イベント
        'customer.*',       // 全顧客イベント
        'checkin_checkout.*' // チェックイン/アウト
      ]
    })
    
    this.setupEventHandlers()
  }
  
  private setupEventHandlers(): void {
    // 予約イベント処理
    this.eventClient.on('reservation.created', async (event: ReservationEvent) => {
      // hotel-memberでの予約情報同期処理
      await this.syncReservationData(event.data)
    })
    
    // 顧客情報イベント処理（hotel-member主管理なので権限確認）
    this.eventClient.on('customer.updated', async (event: CustomerEvent) => {
      if (event.data.origin_system !== 'hotel-member') {
        // 他システムからの限定更新のみ処理
        await this.processLimitedCustomerUpdate(event.data)
      }
    })
  }
}
```

---

## 🚨 **通信障害・オフライン対応**

### **hotel-pms特化オフライン戦略**

#### **ローカルキャッシュ・業務継続**
```typescript
// hotel-pms/src/offline/cache-manager.ts
export class PMSOfflineCacheManager {
  private localCache: Map<string, any> = new Map()
  private pendingEvents: Array<HotelEvent> = []
  private isOnline: boolean = true
  
  constructor() {
    this.setupConnectivityMonitoring()
  }
  
  // 通信状態監視
  private setupConnectivityMonitoring(): void {
    setInterval(async () => {
      const wasOnline = this.isOnline
      this.isOnline = await this.checkConnectivity()
      
      if (!wasOnline && this.isOnline) {
        // オフライン → オンライン復旧
        await this.syncPendingEvents()
      }
    }, 5000)
  }
  
  // 業務継続用ローカル処理
  async processOfflineReservation(reservationData: any): Promise<void> {
    // ローカルキャッシュに保存
    const tempId = `offline-${Date.now()}`
    this.localCache.set(tempId, reservationData)
    
    // 復旧時同期用にイベントキューに追加
    this.pendingEvents.push({
      type: 'reservation',
      action: 'created',
      data: reservationData,
      created_offline: true,
      temp_id: tempId
    })
  }
  
  // 復旧時差分同期
  private async syncPendingEvents(): Promise<void> {
    console.log(`🔄 差分同期開始: ${this.pendingEvents.length}件`)
    
    for (const event of this.pendingEvents) {
      try {
        await this.eventPublisher.publishEvent(event)
        // 成功したイベントは削除
        this.pendingEvents = this.pendingEvents.filter(e => e !== event)
      } catch (error) {
        console.error('差分同期エラー:', error)
      }
    }
  }
}
```

---

## ⚙️ **Message Queue選定・設定**

### **技術選定比較**

| 技術 | メリット | デメリット | 採用判定 |
|------|----------|------------|----------|
| **Redis Streams** | 軽量、hotel-commonで既利用、設定簡単 | 永続化限定、高可用性要追加設定 | ✅ **第一候補** |
| **RabbitMQ** | 高信頼性、豊富な機能、AMQP標準 | 運用複雑、リソース消費大 | 🔄 将来検討 |
| **Apache Kafka** | 高スループット、イベントソーシング | 運用複雑、オーバースペック | ❌ 不採用 |

### **Redis Streams実装**
```typescript
// hotel-common/src/events/redis-queue.ts
export class RedisEventQueue {
  private redis: Redis
  
  constructor(redisConfig: RedisConfig) {
    this.redis = new Redis(redisConfig)
  }
  
  // イベントストリーム発行
  async publishToStream(streamName: string, event: HotelEvent): Promise<string> {
    const eventId = await this.redis.xadd(
      streamName,
      '*', // auto-generate ID
      'event_type', event.type,
      'event_data', JSON.stringify(event),
      'timestamp', Date.now()
    )
    
    return eventId
  }
  
  // コンシューマーグループでの消費
  async consumeFromStream(
    streamName: string, 
    consumerGroup: string,
    consumerId: string,
    callback: (event: HotelEvent) => Promise<void>
  ): Promise<void> {
    try {
      // コンシューマーグループ作成（存在しない場合）
      await this.redis.xgroup('CREATE', streamName, consumerGroup, '$', 'MKSTREAM')
    } catch (error) {
      // グループが既存の場合は無視
    }
    
    while (true) {
      try {
        const results = await this.redis.xreadgroup(
          'GROUP', consumerGroup, consumerId,
          'COUNT', 10,
          'BLOCK', 1000,
          'STREAMS', streamName, '>'
        )
        
        if (results && results.length > 0) {
          for (const stream of results) {
            for (const message of stream[1]) {
              const eventData = JSON.parse(message[1][3]) // event_data
              await callback(eventData)
              
              // 処理完了をACK
              await this.redis.xack(streamName, consumerGroup, message[0])
            }
          }
        }
      } catch (error) {
        console.error('Stream消費エラー:', error)
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }
}
```

---

## 📊 **監視・ログ・メトリクス**

### **Event-driven連携監視**

#### **重要メトリクス**
1. **配信成功率**: 99.9%以上
2. **配信遅延**: リアルタイムイベント < 100ms
3. **Queue積み残し**: < 1000件
4. **オフライン復旧時間**: < 30秒

#### **ログ設計**
```typescript
interface EventDeliveryLog {
  event_id: string
  event_type: string
  source_system: string
  target_systems: string[]
  delivery_status: 'success' | 'failed' | 'retrying'
  delivery_time: number // ms
  retry_count: number
  error_message?: string
  timestamp: Date
}
```

---

## 🔄 **段階的実装計画**

### **Phase 1: 基盤構築（1週間）**
- [ ] Redis Streams基盤実装
- [ ] 統一EventPublisher/Consumer作成
- [ ] WebSocket統合

### **Phase 2: リアルタイム同期（2週間）**
- [ ] 予約イベント実装
- [ ] 顧客情報イベント実装
- [ ] チェックイン/アウトイベント実装

### **Phase 3: オフライン対応（1週間）**
- [ ] hotel-pmsローカルキャッシュ実装
- [ ] 差分同期機能実装
- [ ] 通信障害検知・復旧自動化

### **Phase 4: バッチ同期・監視（1週間）**
- [ ] 売上・分析バッチイベント実装
- [ ] 監視・アラート機能実装
- [ ] パフォーマンス最適化

---

## 🎯 **成功指標**

- **システム間データ整合性**: 99.99%
- **リアルタイム配信遅延**: < 100ms
- **オフライン業務継続**: hotel-pms単独動作可能
- **復旧時同期**: 完全な差分同期・データ欠損なし
- **運用安定性**: 24時間365日稼働・自動復旧

---

このEvent-driven連携基盤により、ホテル管理システム群の統一的で信頼性の高いリアルタイム連携を実現します。 