# WebSocket連携仕様書

> 更新履歴 (2025-09-08, hotel-common 統合管理による更新)
> - correlation_id の必須化と at-least-once 配信 + 重複排除
> - テナント/room内での順序保証（per-room sequence）
> - ACK/再送ポリシーの明記
> - 2025-09-10: Room Memo イベント定義とPhase整理を追記（hotel-common 指示）

## 1. WebSocket アーキテクチャ

### 1.1 システム構成
```
┌─────────────────────────────────────────────────┐
│            WebSocket Gateway                    │
│         (Redis Pub/Sub + Socket.IO)            │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼───────┐ ┌───▼───┐ ┌───────▼───────┐
│  hotel-saas   │ │ hotel │ │  hotel-pms    │
│   WS :3101    │ │ member│ │   WS :3301    │
│               │ │WS:3201│ │               │
└───────────────┘ └───────┘ └───────────────┘
```

### 1.2 技術スタック
- **Socket.IO**: WebSocket ライブラリ
- **Redis**: メッセージブローカー・Pub/Sub
- **JWT**: WebSocket認証
- **Room機能**: テナント・グループ別メッセージング

## 2. WebSocket接続設計

### 2.1 接続認証
```typescript
// WebSocket接続時の認証
interface WebSocketAuth {
  token: string           // JWT トークン
  tenant_id: string       // テナントID
  system: 'saas' | 'member' | 'pms'
  client_type: 'admin' | 'device' | 'guest'
  room_id?: string        // 客室ID（デバイス接続時）
}

// 接続時の認証処理
export class WebSocketAuthService {
  async authenticateConnection(
    socket: Socket,
    auth: WebSocketAuth
  ): Promise<boolean> {
    try {
      // JWT検証
      const payload = await this.authService.validateToken(auth.token)
      if (!payload) {
        return false
      }

      // システムアクセス権限チェック
      const hasAccess = payload.system_access.some(
        access => access.system === auth.system
      )
      if (!hasAccess) {
        return false
      }

      // ソケットに認証情報を設定
      socket.data.auth = {
        user_id: payload.sub,
        tenant_id: payload.tenant_id,
        system: auth.system,
        client_type: auth.client_type,
        room_id: auth.room_id
      }

      return true
    } catch (error) {
      console.error('WebSocket認証エラー:', error)
      return false
    }
  }
}
```

### 2.3 配信ポリシー

- 配信保証: at-least-once（重複排除は `correlation_id` で実施）
- 順序保証: 同一 `room_id` 内での sequence を採用（server発行の連番）
- ACK: 受信側は `ack:{correlation_id}` を返送。未ACKは一定時間で再送

### 2.2 接続管理
```typescript
// WebSocket接続管理
export class WebSocketConnectionManager {
  private connections: Map<string, Socket> = new Map()
  private roomConnections: Map<string, Set<string>> = new Map()

  async handleConnection(socket: Socket): Promise<void> {
    const auth = socket.data.auth
    
    // 接続を管理マップに追加
    this.connections.set(socket.id, socket)
    
    // テナント別ルームに参加
    await socket.join(`tenant:${auth.tenant_id}`)
    
    // システム別ルームに参加
    await socket.join(`system:${auth.system}`)
    
    // 客室別ルーム（デバイス接続時）
    if (auth.room_id) {
      await socket.join(`room:${auth.room_id}`)
      this.addRoomConnection(auth.room_id, socket.id)
    }
    
    // 管理者ルーム（管理画面接続時）
    if (auth.client_type === 'admin') {
      await socket.join(`admin:${auth.tenant_id}`)
    }

    console.log(`WebSocket接続: ${socket.id} (${auth.system}/${auth.client_type})`)
  }

  async handleDisconnection(socket: Socket): Promise<void> {
    const auth = socket.data.auth
    
    // 接続を管理マップから削除
    this.connections.delete(socket.id)
    
    // 客室別ルームから削除
    if (auth.room_id) {
      this.removeRoomConnection(auth.room_id, socket.id)
    }

    console.log(`WebSocket切断: ${socket.id}`)
  }

  private addRoomConnection(roomId: string, socketId: string): void {
    if (!this.roomConnections.has(roomId)) {
      this.roomConnections.set(roomId, new Set())
    }
    this.roomConnections.get(roomId)!.add(socketId)
  }

  private removeRoomConnection(roomId: string, socketId: string): void {
    const roomSockets = this.roomConnections.get(roomId)
    if (roomSockets) {
      roomSockets.delete(socketId)
      if (roomSockets.size === 0) {
        this.roomConnections.delete(roomId)
      }
    }
  }
}
```

## 3. イベント定義

### 3.1 システム間イベント
```typescript
// 共通イベント定義
interface SystemEvent {
  event_type: string
  tenant_id: string
  system_source: 'saas' | 'member' | 'pms'
  timestamp: string
  correlation_id: string
  sequence?: number         // 同一room_id内での順序保証用
  data: any
}

// 注文関連イベント
interface OrderEvent extends SystemEvent {
  event_type: 'order_created' | 'order_updated' | 'order_completed' | 'order_cancelled'
  data: {
    order_id: number
    room_id: string
    guest_id?: number
    status: string
    total: number
    items: OrderItem[]
  }
}

// 会員関連イベント
interface MemberEvent extends SystemEvent {
  event_type: 'member_checkin' | 'member_checkout' | 'points_updated'
  data: {
    member_id: number
    reservation_id?: number
    room_id?: string
    points?: number
    point_change?: number
  }
}

// 客室関連イベント
interface RoomEvent extends SystemEvent {
  event_type: 'room_status_changed' | 'housekeeping_completed' | 'maintenance_required'
  data: {
    room_id: string
    status: string
    guest_id?: number
    notes?: string
    task_id?: number
  }
}
```

### 3.2 クライアント向けイベント
```typescript
// 管理画面向けイベント
interface AdminEvent {
  event_type: string
  tenant_id: string
  timestamp: string
  data: any
}

// 新規注文通知
interface NewOrderNotification extends AdminEvent {
  event_type: 'new_order'
  data: {
    order_id: number
    room_id: string
    guest_name?: string
    total: number
    items_count: number
    estimated_time: string
  }
}

// デバイス向けイベント
interface DeviceEvent {
  event_type: string
  room_id: string
  timestamp: string
  data: any
}

// 注文ステータス更新
interface OrderStatusUpdate extends DeviceEvent {
  event_type: 'order_status_update'
  data: {
    order_id: number
    status: string
    estimated_time?: string
    message?: string
  }
}
```

```typescript
// Room Memo（Phase 2以降で配信）
type RoomMemoEventType =
  | 'MEMO_CREATED'
  | 'MEMO_UPDATED'
  | 'MEMO_STATUS_CHANGED'
  | 'MEMO_COMMENT_ADDED'
  | 'MEMO_DELETED'

interface RoomMemoEvent extends AdminEvent {
  event_type: RoomMemoEventType
  data: {
    memo_id: string
    room_id: string
    category: 'reservation' | 'handover' | 'lost_item' | 'maintenance' | 'cleaning' | 'guest_request' | 'other'
    visibility: 'public' | 'private' | 'role'
    visible_roles?: string[]
    status?: 'pending' | 'in_progress' | 'completed'
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    created_by_staff_id?: string
    assigned_to_staff_id?: string
  }
}
```

> Phase 整理
> - Phase 1 (MVP): Room Memo API（REST）のみ。WS配信なし
> - Phase 2: WSで `MEMO_*` を配信（at-least-once、room内順序保証、ACK/再送）

## 4. メッセージング実装

### 4.1 Redis Pub/Sub 統合
```typescript
// Redis Pub/Sub メッセージング
export class WebSocketMessagingService {
  private redisPublisher: Redis
  private redisSubscriber: Redis
  private io: Server

  constructor(io: Server) {
    this.io = io
    this.redisPublisher = new Redis(process.env.REDIS_URL!)
    this.redisSubscriber = new Redis(process.env.REDIS_URL!)
    this.setupSubscriptions()
  }

  private setupSubscriptions(): void {
    // システム間イベント購読
    this.redisSubscriber.subscribe('hotel:events:*')
    
    this.redisSubscriber.on('message', (channel, message) => {
      const event = JSON.parse(message) as SystemEvent
      this.handleSystemEvent(event)
    })
  }

  // システム間イベント発行
  async publishSystemEvent(event: SystemEvent): Promise<void> {
    const channel = `hotel:events:${event.system_source}`
    await this.redisPublisher.publish(channel, JSON.stringify(event))
  }

  // システム間イベント処理
  private handleSystemEvent(event: SystemEvent): void {
    switch (event.event_type) {
      case 'order_created':
        this.handleOrderCreated(event as OrderEvent)
        break
      case 'order_updated':
        this.handleOrderUpdated(event as OrderEvent)
        break
      case 'member_checkin':
        this.handleMemberCheckin(event as MemberEvent)
        break
      case 'room_status_changed':
        this.handleRoomStatusChanged(event as RoomEvent)
        break
      default:
        console.warn('未知のイベントタイプ:', event.event_type)
    }
  }

  private handleOrderCreated(event: OrderEvent): void {
    // 管理画面に新規注文通知
    this.io.to(`admin:${event.tenant_id}`).emit('new_order', {
      event_type: 'new_order',
      tenant_id: event.tenant_id,
      timestamp: event.timestamp,
      data: {
        order_id: event.data.order_id,
        room_id: event.data.room_id,
        total: event.data.total,
        items_count: event.data.items.length,
        estimated_time: '15-20分'
      }
    })

    // PMSシステムに客室状況更新通知
    this.io.to(`system:pms`).emit('room_order_activity', {
      event_type: 'room_order_activity',
      tenant_id: event.tenant_id,
      timestamp: event.timestamp,
      data: {
        room_id: event.data.room_id,
        activity_type: 'order_created',
        order_id: event.data.order_id
      }
    })
  }

  private handleOrderUpdated(event: OrderEvent): void {
    // 該当客室のデバイスに注文ステータス更新通知
    this.io.to(`room:${event.data.room_id}`).emit('order_status_update', {
      event_type: 'order_status_update',
      room_id: event.data.room_id,
      timestamp: event.timestamp,
      data: {
        order_id: event.data.order_id,
        status: event.data.status,
        estimated_time: this.calculateEstimatedTime(event.data.status),
        message: this.getStatusMessage(event.data.status)
      }
    })
  }
}
```

### 4.2 システム別WebSocketサーバー
```typescript
// hotel-saas WebSocketサーバー
export class SaasWebSocketServer {
  private io: Server
  private messagingService: WebSocketMessagingService

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
      }
    })
    
    this.messagingService = new WebSocketMessagingService(this.io)
    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.io.on('connection', async (socket) => {
      // 認証チェック
      const auth = socket.handshake.auth as WebSocketAuth
      const isAuthenticated = await this.authService.authenticateConnection(socket, auth)
      
      if (!isAuthenticated) {
        socket.disconnect(true)
        return
      }

      // 接続管理
      await this.connectionManager.handleConnection(socket)

      // 注文関連イベント
      socket.on('order_created', async (data) => {
        await this.handleOrderCreated(socket, data)
      })

      socket.on('order_status_update', async (data) => {
        await this.handleOrderStatusUpdate(socket, data)
      })

      // 切断処理
      socket.on('disconnect', async () => {
        await this.connectionManager.handleDisconnection(socket)
      })
    })
  }

  private async handleOrderCreated(socket: Socket, data: any): Promise<void> {
    const auth = socket.data.auth
    
    // システム間イベント発行
    const event: OrderEvent = {
      event_type: 'order_created',
      tenant_id: auth.tenant_id,
      system_source: 'saas',
      timestamp: new Date().toISOString(),
      data: {
        order_id: data.order_id,
        room_id: data.room_id,
        guest_id: data.guest_id,
        status: data.status,
        total: data.total,
        items: data.items
      }
    }

    await this.messagingService.publishSystemEvent(event)
  }

  private async handleOrderStatusUpdate(socket: Socket, data: any): Promise<void> {
    const auth = socket.data.auth
    
    // 権限チェック
    if (auth.client_type !== 'admin') {
      socket.emit('error', { message: 'Insufficient permissions' })
      return
    }

    // システム間イベント発行
    const event: OrderEvent = {
      event_type: 'order_updated',
      tenant_id: auth.tenant_id,
      system_source: 'saas',
      timestamp: new Date().toISOString(),
      data: {
        order_id: data.order_id,
        room_id: data.room_id,
        status: data.status,
        total: data.total,
        items: data.items
      }
    }

    await this.messagingService.publishSystemEvent(event)
  }
}
```

## 5. クライアント実装

### 5.1 管理画面クライアント
```typescript
// 管理画面WebSocketクライアント
export class AdminWebSocketClient {
  private socket: Socket
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  constructor(private authToken: string, private tenantId: string) {
    this.connect()
  }

  private connect(): void {
    this.socket = io('ws://localhost:3101', {
      auth: {
        token: this.authToken,
        tenant_id: this.tenantId,
        system: 'saas',
        client_type: 'admin'
      }
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.socket.on('connect', () => {
      console.log('WebSocket接続成功')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', () => {
      console.log('WebSocket切断')
      this.handleReconnect()
    })

    // 新規注文通知
    this.socket.on('new_order', (data: NewOrderNotification) => {
      this.handleNewOrder(data)
    })

    // 注文ステータス更新
    this.socket.on('order_status_update', (data: any) => {
      this.handleOrderStatusUpdate(data)
    })

    // エラーハンドリング
    this.socket.on('error', (error: any) => {
      console.error('WebSocketエラー:', error)
    })
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      setTimeout(() => {
        console.log(`再接続試行 ${this.reconnectAttempts}/${this.maxReconnectAttempts}`)
        this.connect()
      }, 1000 * this.reconnectAttempts)
    }
  }

  private handleNewOrder(data: NewOrderNotification): void {
    // 新規注文通知の処理
    // - 音声通知
    // - デスクトップ通知
    // - UI更新
    console.log('新規注文:', data)
    
    // 音声通知
    this.playNotificationSound()
    
    // デスクトップ通知
    if (Notification.permission === 'granted') {
      new Notification('新規注文', {
        body: `客室${data.data.room_id}から注文が入りました`,
        icon: '/icons/order.png'
      })
    }
  }

  private handleOrderStatusUpdate(data: any): void {
    // 注文ステータス更新の処理
    console.log('注文ステータス更新:', data)
  }

  private playNotificationSound(): void {
    const audio = new Audio('/sounds/order.mp3')
    audio.play().catch(e => console.warn('音声再生エラー:', e))
  }

  // 注文ステータス更新送信
  updateOrderStatus(orderId: number, status: string): void {
    this.socket.emit('order_status_update', {
      order_id: orderId,
      status: status,
      timestamp: new Date().toISOString()
    })
  }

  disconnect(): void {
    this.socket.disconnect()
  }
}
```

### 5.2 デバイスクライアント
```typescript
// デバイス（客室タブレット）WebSocketクライアント
export class DeviceWebSocketClient {
  private socket: Socket

  constructor(
    private deviceToken: string,
    private tenantId: string,
    private roomId: string
  ) {
    this.connect()
  }

  private connect(): void {
    this.socket = io('ws://localhost:3101', {
      auth: {
        token: this.deviceToken,
        tenant_id: this.tenantId,
        system: 'saas',
        client_type: 'device',
        room_id: this.roomId
      }
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.socket.on('connect', () => {
      console.log('デバイスWebSocket接続成功')
    })

    // 注文ステータス更新受信
    this.socket.on('order_status_update', (data: OrderStatusUpdate) => {
      this.handleOrderStatusUpdate(data)
    })

    // システムメッセージ受信
    this.socket.on('system_message', (data: any) => {
      this.handleSystemMessage(data)
    })
  }

  private handleOrderStatusUpdate(data: OrderStatusUpdate): void {
    // 注文ステータス更新の処理
    console.log('注文ステータス更新:', data)
    
    // UI更新
    this.updateOrderStatusUI(data.data.order_id, data.data.status)
    
    // 通知表示
    this.showNotification(data.data.message || this.getStatusMessage(data.data.status))
  }

  private handleSystemMessage(data: any): void {
    // システムメッセージの処理
    console.log('システムメッセージ:', data)
    this.showNotification(data.message)
  }

  private updateOrderStatusUI(orderId: number, status: string): void {
    // UI更新ロジック
    const orderElement = document.querySelector(`[data-order-id="${orderId}"]`)
    if (orderElement) {
      orderElement.setAttribute('data-status', status)
      // ステータス表示更新
    }
  }

  private showNotification(message: string): void {
    // 通知表示ロジック
    const notification = document.createElement('div')
    notification.className = 'notification'
    notification.textContent = message
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.remove()
    }, 5000)
  }

  private getStatusMessage(status: string): string {
    const messages = {
      'received': 'ご注文を承りました',
      'cooking': '調理中です',
      'ready': 'お料理が完成しました',
      'delivering': 'お届けに向かっています',
      'completed': 'お届け完了しました'
    }
    return messages[status] || 'ステータスが更新されました'
  }

  // 注文作成送信
  createOrder(orderData: any): void {
    this.socket.emit('order_created', {
      ...orderData,
      room_id: this.roomId,
      timestamp: new Date().toISOString()
    })
  }

  disconnect(): void {
    this.socket.disconnect()
  }
}
```

## 6. 監視・ログ

### 6.1 WebSocket監視
```typescript
// WebSocket監視サービス
export class WebSocketMonitoringService {
  private connectionStats: Map<string, any> = new Map()
  private messageStats: Map<string, number> = new Map()

  trackConnection(socket: Socket): void {
    const auth = socket.data.auth
    const key = `${auth.tenant_id}:${auth.system}:${auth.client_type}`
    
    const stats = this.connectionStats.get(key) || {
      active_connections: 0,
      total_connections: 0,
      last_connection: null
    }
    
    stats.active_connections++
    stats.total_connections++
    stats.last_connection = new Date().toISOString()
    
    this.connectionStats.set(key, stats)
  }

  trackDisconnection(socket: Socket): void {
    const auth = socket.data.auth
    const key = `${auth.tenant_id}:${auth.system}:${auth.client_type}`
    
    const stats = this.connectionStats.get(key)
    if (stats) {
      stats.active_connections--
      this.connectionStats.set(key, stats)
    }
  }

  trackMessage(eventType: string): void {
    const count = this.messageStats.get(eventType) || 0
    this.messageStats.set(eventType, count + 1)
  }

  getStats(): any {
    return {
      connections: Object.fromEntries(this.connectionStats),
      messages: Object.fromEntries(this.messageStats),
      timestamp: new Date().toISOString()
    }
  }
}
```

### 6.2 ログ記録
```typescript
// WebSocketログサービス
export class WebSocketLogService {
  async logEvent(event: {
    event_type: string
    socket_id: string
    user_id?: string
    tenant_id: string
    system: string
    data?: any
    timestamp: string
  }): Promise<void> {
    // データベースにログ保存
    await prisma.webSocketLog.create({
      data: event
    })
    
    // 重要なイベントは外部監視システムに送信
    if (this.isImportantEvent(event.event_type)) {
      await this.sendToMonitoringSystem(event)
    }
  }

  private isImportantEvent(eventType: string): boolean {
    const importantEvents = [
      'connection_failed',
      'authentication_failed',
      'high_message_rate',
      'system_error'
    ]
    return importantEvents.includes(eventType)
  }

  private async sendToMonitoringSystem(event: any): Promise<void> {
    // 外部監視システムへの送信実装
    // Datadog、New Relic、CloudWatch等
  }
}
```

この仕様書に基づいて、WebSocket連携システムを実装してください。 