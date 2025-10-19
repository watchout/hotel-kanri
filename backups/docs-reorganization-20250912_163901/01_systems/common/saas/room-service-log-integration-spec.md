# hotel-saas 客室サービスログ連携仕様書

**仕様書ID**: SAAS-ROOM-LOG-SPEC-2025-01-27-001  
**対象システム**: hotel-saas  
**連携先**: hotel-common  
**バージョン**: v2.0  
**作成日**: 2025年1月27日  
**作成者**: hotel-common統合管理  
**ステータス**: 承認済み  

---

## 📋 変更履歴

| バージョン | 日付 | 変更者 | 変更内容 |
|-----------|------|--------|----------|
| v1.0 | 2024年12月 | 初期実装 | 基本的なSaaS機能（注文管理中心） |
| **v2.0** | **2025年1月27日** | **hotel-common** | **客室サービス操作ログ連携機能の仕様化** |

---

## 🎯 概要

### 目的
hotel-saasでの客室サービス提供（ルームサービス、アメニティ補充、コンシェルジュサービス等）をhotel-commonに送信し、統合的な客室運営ログを実現する。

### 適用範囲
- ルームサービス注文・配達
- アメニティ・備品補充
- コンシェルジュサービス提供
- 客室設備・サービス関連の問い合わせ対応
- ゲスト向けサービスの品質管理

### SaaS特有の考慮事項
- **オフライン対応**: 客室タブレットでの操作継続
- **ゲスト影響最小化**: サービス中断の回避
- **リアルタイム性**: サービス品質への即座反映
- **プライバシー保護**: ゲスト情報の適切な取り扱い

---

## 🔄 ログ送信対象操作

### ゲストサービス関連（必須）
```typescript
// ルームサービス
'ROOM_SERVICE_ORDER'         // ルームサービス注文
'ROOM_SERVICE_DELIVERED'     // 配達完了
'ROOM_SERVICE_CANCELLED'     // 注文キャンセル

// アメニティ・備品
'ROOM_AMENITY_RESTOCK'       // アメニティ補充
'ROOM_SUPPLIES_DELIVERY'     // 備品配達
'ROOM_AMENITY_REQUEST'       // ゲストからのアメニティ要求

// コンシェルジュサービス
'CONCIERGE_SERVICE_START'    // コンシェルジュサービス開始
'CONCIERGE_SERVICE_COMPLETE' // サービス完了
'GUEST_INQUIRY_RESOLVED'     // 問い合わせ解決

// 客室設備サポート
'ROOM_EQUIPMENT_SUPPORT'     // 設備サポート
'ROOM_TECH_ASSISTANCE'       // 技術サポート
'ROOM_SERVICE_COMPLAINT'     // サービス苦情対応
```

### 品質管理関連（推奨）
```typescript
// サービス品質
'SERVICE_QUALITY_CHECK'      // サービス品質確認
'GUEST_SATISFACTION_SURVEY'  // 満足度調査
'SERVICE_FEEDBACK_RECEIVED'  // フィードバック受信

// システム管理
'ROOM_DEVICE_STATUS_CHECK'   // 客室デバイス状態確認
'ROOM_WIFI_SUPPORT'          // WiFiサポート
'ROOM_APP_ASSISTANCE'        // アプリ使用サポート
```

---

## 🔧 API連携仕様

### 基本設定
```typescript
// hotel-common API 設定
const HOTEL_COMMON_CONFIG = {
  apiUrl: process.env.HOTEL_COMMON_API_URL || 'https://api.hotel-common.com',
  endpoints: {
    operationLogs: '/api/v1/logs/operations'
  },
  authentication: {
    type: 'Bearer',
    tokenSource: 'SAAS_API_TOKEN'
  },
  timeout: 3000, // SaaS特有: 短いタイムアウト（UX重視）
  retryPolicy: {
    maxRetries: 2, // 少ないリトライ（ゲスト体験優先）
    backoffMs: 500
  },
  offlineMode: {
    enabled: true,
    maxQueueSize: 1000,
    syncInterval: 30000 // 30秒間隔
  }
}
```

### ログ送信実装例
```typescript
// SaaS側実装例
class SaaSRoomServiceLogger {
  private apiClient: HotelCommonApiClient;
  private offlineQueue: ServiceOperation[] = [];
  private isOnline: boolean = true;
  
  constructor() {
    this.apiClient = new HotelCommonApiClient(HOTEL_COMMON_CONFIG);
    this.setupOfflineHandling();
  }
  
  /**
   * 客室サービス操作ログ送信
   */
  async logServiceOperation(operation: ServiceOperation): Promise<void> {
    const logData = {
      action: operation.action,
      target_type: 'room',
      target_id: operation.roomId,
      details: {
        room_id: operation.roomId,
        room_number: operation.roomNumber,
        old_status: operation.oldStatus || 'occupied', // SaaS特有: 通常は占有中
        new_status: operation.newStatus || 'occupied',
        operation_reason: operation.reason,
        operation_category: 'guest_service',
        service_type: operation.serviceType,
        guest_impact: false, // SaaS特有: ゲスト体験向上が目的
        staff_id: operation.staffId,
        department: operation.department || 'concierge',
        service_duration: operation.durationMinutes,
        guest_satisfaction: operation.satisfaction,
        triggered_by_system: 'hotel-saas',
        timestamp: new Date().toISOString(),
        notes: operation.notes
      }
    };
    
    if (this.isOnline) {
      try {
        await this.apiClient.post('/api/v1/logs/operations', logData);
        console.log(`Service operation logged: ${operation.action} for room ${operation.roomNumber}`);
      } catch (error) {
        console.warn('Log send failed, queuing for offline sync:', error);
        this.queueForOfflineSync(logData);
      }
    } else {
      this.queueForOfflineSync(logData);
    }
  }
  
  /**
   * オフライン対応
   */
  private queueForOfflineSync(logData: any) {
    if (this.offlineQueue.length < HOTEL_COMMON_CONFIG.offlineMode.maxQueueSize) {
      this.offlineQueue.push({
        ...logData,
        queuedAt: new Date()
      });
    } else {
      console.warn('Offline queue full, dropping oldest log');
      this.offlineQueue.shift();
      this.offlineQueue.push(logData);
    }
  }
  
  /**
   * オフライン同期
   */
  private async syncOfflineQueue() {
    if (!this.isOnline || this.offlineQueue.length === 0) return;
    
    const batch = this.offlineQueue.splice(0, 10); // 10件ずつ処理
    
    for (const log of batch) {
      try {
        await this.apiClient.post('/api/v1/logs/operations', log);
      } catch (error) {
        // 失敗したログは先頭に戻す
        this.offlineQueue.unshift(log);
        break;
      }
    }
  }
}
```

---

## 📊 送信データ仕様

### SaaS特有の必須フィールド
```typescript
interface SaaSServiceOperationLog {
  action: string;
  target_type: 'room';
  target_id: string;
  
  details: {
    // 基本情報
    room_id: string;
    room_number: string;
    old_status: string;          // 通常は 'occupied'
    new_status: string;          // 通常は 'occupied'
    triggered_by_system: 'hotel-saas';
    timestamp: string;
    
    // SaaS特有フィールド
    service_type: 'room_service' | 'amenity' | 'concierge' | 'tech_support' | 'complaint';
    guest_impact: boolean;       // 通常は false（サービス向上目的）
    operation_category: 'guest_service'; // SaaS操作は基本的にゲストサービス
    
    // サービス品質情報
    guest_satisfaction?: 1 | 2 | 3 | 4 | 5; // 5段階評価
    service_rating?: number;     // サービス評価
    response_time?: number;      // 応答時間（分）
  }
}
```

### サービス種別ごとの詳細フィールド
```typescript
// ルームサービス
interface RoomServiceLog extends SaaSServiceOperationLog {
  details: SaaSServiceOperationLog['details'] & {
    service_type: 'room_service';
    order_id?: string;           // 注文ID
    menu_items?: string[];       // 注文品目
    total_amount?: number;       // 注文金額
    delivery_time?: number;      // 配達時間（分）
    special_requests?: string;   // 特別要望
  }
}

// アメニティ補充
interface AmenityLog extends SaaSServiceOperationLog {
  details: SaaSServiceOperationLog['details'] & {
    service_type: 'amenity';
    amenity_types?: string[];    // 補充したアメニティ種類
    quantity?: number;           // 補充数量
    restocking_reason?: 'guest_request' | 'scheduled' | 'emergency';
  }
}

// コンシェルジュサービス
interface ConciergeLog extends SaaSServiceOperationLog {
  details: SaaSServiceOperationLog['details'] & {
    service_type: 'concierge';
    inquiry_type?: string;       // 問い合わせ種別
    resolution_method?: string;  // 解決方法
    external_vendor?: string;    // 外部業者（必要時）
  }
}
```

---

## 🔄 実装パターン

### パターン1: リアルタイム送信（推奨）
```typescript
// ゲスト体験を重視したリアルタイム送信
async function completeRoomService(orderId: string, roomId: string) {
  // 1. SaaS内部処理
  await updateOrderStatus(orderId, 'delivered');
  
  // 2. ログ送信（非同期・ノンブロッキング）
  saasLogger.logServiceOperation({
    action: 'ROOM_SERVICE_DELIVERED',
    roomId,
    roomNumber: await getRoomNumber(roomId),
    serviceType: 'room_service',
    orderId,
    staffId: getCurrentStaffId(),
    durationMinutes: await getDeliveryTime(orderId)
  }).catch(error => {
    // エラーは内部記録のみ（ゲスト体験に影響させない）
    console.warn('Service log failed:', error);
  });
}
```

### パターン2: バッファリング送信
```typescript
// 客室タブレットでの軽量化実装
class SaaSLogBuffer {
  private buffer: ServiceOperation[] = [];
  private flushInterval: number = 10000; // 10秒
  
  constructor() {
    setInterval(() => this.flush(), this.flushInterval);
  }
  
  add(operation: ServiceOperation) {
    this.buffer.push(operation);
    
    // 重要操作は即座送信
    if (this.isCriticalOperation(operation.action)) {
      this.flush();
    }
  }
  
  private async flush() {
    if (this.buffer.length === 0) return;
    
    const operations = [...this.buffer];
    this.buffer = [];
    
    // バッチ送信
    await Promise.allSettled(
      operations.map(op => saasLogger.logServiceOperation(op))
    );
  }
  
  private isCriticalOperation(action: string): boolean {
    return ['ROOM_SERVICE_COMPLAINT', 'ROOM_EQUIPMENT_SUPPORT'].includes(action);
  }
}
```

---

## 🌐 オフライン対応

### 客室タブレット対応
```typescript
class SaaSOfflineManager {
  private localDB: IndexedDB;
  private syncQueue: ServiceOperation[] = [];
  private connectionStatus: 'online' | 'offline' = 'online';
  
  constructor() {
    this.setupConnectionMonitoring();
    this.setupPeriodicSync();
  }
  
  /**
   * オフライン時のローカル保存
   */
  async storeOfflineLog(operation: ServiceOperation) {
    await this.localDB.serviceLogs.add({
      ...operation,
      storedAt: new Date(),
      syncStatus: 'pending'
    });
    
    // ゲストに操作完了を通知（オフラインでも）
    this.notifyGuestServiceComplete(operation);
  }
  
  /**
   * オンライン復帰時の同期
   */
  async syncPendingLogs() {
    const pendingLogs = await this.localDB.serviceLogs
      .where('syncStatus')
      .equals('pending')
      .toArray();
    
    for (const log of pendingLogs) {
      try {
        await saasLogger.logServiceOperation(log);
        await this.localDB.serviceLogs.update(log.id, { 
          syncStatus: 'synced',
          syncedAt: new Date()
        });
      } catch (error) {
        console.warn('Sync failed for service log:', log.id, error);
        // 重要でないログは一定期間後に削除
        if (this.shouldDiscardLog(log)) {
          await this.localDB.serviceLogs.delete(log.id);
        }
      }
    }
  }
  
  private shouldDiscardLog(log: any): boolean {
    const ageHours = (Date.now() - log.storedAt.getTime()) / (1000 * 60 * 60);
    return ageHours > 24 && !this.isCriticalLog(log.action);
  }
}
```

---

## 📈 品質管理・分析

### ゲスト満足度連携
```typescript
// サービス品質とログの連携
class SaaSQualityManager {
  async recordServiceWithQuality(
    operation: ServiceOperation,
    guestFeedback?: GuestFeedback
  ) {
    // サービス実行ログ
    await saasLogger.logServiceOperation({
      ...operation,
      satisfaction: guestFeedback?.rating,
      serviceRating: guestFeedback?.serviceRating
    });
    
    // 品質管理ログ（必要時）
    if (guestFeedback && guestFeedback.rating <= 2) {
      await saasLogger.logServiceOperation({
        action: 'SERVICE_QUALITY_ISSUE',
        roomId: operation.roomId,
        roomNumber: operation.roomNumber,
        reason: `Low satisfaction: ${guestFeedback.comment}`,
        serviceType: 'quality_management',
        priority: 'high'
      });
    }
  }
}
```

### リアルタイム分析対応
```typescript
// SaaS特有の分析項目
interface SaaSServiceAnalytics {
  // サービス効率
  averageResponseTime: number;     // 平均応答時間
  serviceCompletionRate: number;   // サービス完了率
  guestSatisfactionAverage: number; // 平均満足度
  
  // 品質指標
  complaintRate: number;           // 苦情率
  repeatServiceRate: number;       // リピートサービス率
  upsellSuccessRate: number;       // アップセル成功率
  
  // 運営効率
  staffUtilizationRate: number;    // スタッフ稼働率
  peakServiceHours: number[];      // ピークサービス時間
  deviceUptimeRate: number;        // デバイス稼働率
}
```

---

## 🔧 設定・導入

### 環境変数設定
```bash
# hotel-common API接続
HOTEL_COMMON_API_URL=https://api.hotel-common.com
SAAS_API_TOKEN=your_saas_api_token_here

# SaaS特有設定
SERVICE_LOG_REALTIME=true          # リアルタイム送信
SERVICE_LOG_BUFFER_SIZE=50         # バッファサイズ
SERVICE_LOG_OFFLINE_QUEUE=1000     # オフラインキューサイズ
SERVICE_LOG_SYNC_INTERVAL=30000    # 同期間隔（30秒）

# 品質管理設定
GUEST_SATISFACTION_TRACKING=true   # 満足度追跡
SERVICE_QUALITY_ALERTS=true        # 品質アラート
LOW_RATING_THRESHOLD=2             # 低評価閾値

# デバイス設定
TABLET_OFFLINE_MODE=true           # タブレットオフライン対応
TABLET_CACHE_SIZE=100MB            # キャッシュサイズ
```

### 客室タブレット設定
```typescript
// タブレット専用設定
const TABLET_CONFIG = {
  // 軽量化設定
  logBufferSize: 20,
  flushInterval: 5000,        // 5秒間隔
  maxRetries: 1,              // 最小リトライ
  
  // オフライン対応
  offlineStorageLimit: 500,   // 500件まで
  syncOnReconnect: true,
  backgroundSync: true,
  
  // UX優先設定
  nonBlockingLogs: true,      // ノンブロッキング
  silentFailures: true,       // サイレント失敗
  guestNotificationPriority: true
};
```

---

## 📅 実装スケジュール

### Phase 1: 基盤実装（2025年2月）
- [ ] API連携ライブラリ実装
- [ ] オフライン対応機能
- [ ] 基本ログ送信機能

### Phase 2: サービス統合（2025年3月）
- [ ] ルームサービス連携
- [ ] アメニティ管理連携
- [ ] コンシェルジュサービス連携

### Phase 3: 品質管理機能（2025年4月）
- [ ] 満足度追跡機能
- [ ] 品質分析機能
- [ ] リアルタイムアラート

---

## 🚨 注意事項

### ゲスト体験優先
- ログ送信失敗がサービス提供を阻害しないこと
- オフライン時でもサービス継続可能であること
- 応答性能を最優先とすること

### プライバシー保護
- ゲスト個人情報の最小限送信
- 暗号化通信の徹底
- ログ保存期間の適切な管理

### システム安定性
- 客室タブレットの軽量動作
- ネットワーク障害時の自動復旧
- 大量アクセス時の負荷分散

---

**承認者**: hotel-common統合管理  
**承認日**: 2025年1月27日  
**次回見直し予定**: 2025年7月27日
