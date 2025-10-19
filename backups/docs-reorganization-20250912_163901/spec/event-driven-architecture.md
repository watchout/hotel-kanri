# イベント駆動アーキテクチャ設計

> **注意**: このドキュメントは参照用です。最新の内容は [docs/integration/event-driven-architecture.md](../integration/event-driven-architecture.md) を参照してください。

## 概要
このドキュメントでは、hotel-saas（AIコンシェルジュ）、hotel-pms（PMS）、hotel-member（CRM）、hotel-common（統合基盤）の4つのシステム間のイベント駆動アーキテクチャについて定義します。

## イベント駆動アーキテクチャの原則

### 1. イベントの所有権
- 各システムは自身が所有するリソースに関連するイベントのみを発行する
- イベントの発行者はイベントの内容に責任を持つ
- イベントの購読者はイベントの処理に責任を持つ

### 2. イベントの構造
- すべてのイベントは標準化された形式に従う
- イベント名は`{リソース}.{アクション}`の形式で定義する
- イベントにはメタデータ（タイムスタンプ、発行者、相関ID等）を含める

### 3. イベントの配信保証
- イベントは少なくとも1回は配信される（at-least-once delivery）
- イベントハンドラは冪等性を確保する
- 配信失敗時は再試行メカニズムを使用する

### 4. イベントのバージョニング
- イベントスキーマはセマンティックバージョニングに従う
- 後方互換性を維持する
- 互換性のない変更は新しいイベントタイプとして定義する

## イベントブローカー

### 技術選定
- **初期段階**: RabbitMQ
  - シンプルな設定
  - 信頼性の高いメッセージング
  - 複数のエクスチェンジタイプ
  
- **スケールアップ時**: Apache Kafka
  - 高スループット
  - 永続的なログ
  - ストリーム処理機能

### トポロジ
```
                 ┌─────────────────────┐
                 │    EventBus基盤     │
                 └─────────┬───────────┘
                           │
                           │
     ┌─────────────────────┼─────────────────────┐
     │                     │                     │
┌────▼────┐          ┌─────▼─────┐         ┌─────▼─────┐
│ Exchange │          │ Exchange  │         │ Exchange  │
│ system   │          │ business  │         │ audit     │
└────┬────┘          └─────┬─────┘         └─────┬─────┘
     │                     │                     │
     │                     │                     │
┌────▼────┐          ┌─────▼─────┐         ┌─────▼─────┐
│ Queues  │          │ Queues    │         │ Queues    │
└─────────┘          └───────────┘         └───────────┘
```

## イベント一覧

### hotel-saas発行イベント

| イベント名 | 説明 | ペイロード | 購読システム |
|------------|------|----------|------------|
| `service.ordered` | サービス注文発生 | `{ orderId, roomId, serviceId, quantity, customerId, price }` | hotel-pms |
| `service.canceled` | サービス注文キャンセル | `{ orderId, reason }` | hotel-pms |
| `feedback.submitted` | フィードバック送信 | `{ customerId, serviceId, rating, comment }` | hotel-member |

### hotel-pms発行イベント

| イベント名 | 説明 | ペイロード | 購読システム |
|------------|------|----------|------------|
| `reservation.created` | 予約作成 | `{ reservationId, customerId, roomId, dateRange, origin, ... }` | hotel-saas, hotel-member |
| `reservation.updated` | 予約更新 | `{ reservationId, changes, ... }` | hotel-saas, hotel-member |
| `reservation.canceled` | 予約キャンセル | `{ reservationId, reason, ... }` | hotel-saas, hotel-member |
| `checkin_checkout.checked_in` | チェックイン | `{ reservationId, customerId, roomId, timestamp }` | hotel-saas, hotel-member |
| `checkin_checkout.checked_out` | チェックアウト | `{ reservationId, customerId, roomId, timestamp }` | hotel-saas, hotel-member |
| `billing.created` | 請求作成 | `{ billingId, reservationId, items, total, ... }` | hotel-member |
| `billing.paid` | 請求支払完了 | `{ billingId, paymentMethod, ... }` | hotel-member |

### hotel-member発行イベント

| イベント名 | 説明 | ペイロード | 購読システム |
|------------|------|----------|------------|
| `customer.created` | 顧客作成 | `{ customerId, name, email, phone, ... }` | hotel-pms, hotel-saas |
| `customer.updated` | 顧客情報更新 | `{ customerId, changes, ... }` | hotel-pms, hotel-saas |
| `member.registered` | 会員登録 | `{ customerId, membershipId, level, ... }` | hotel-pms, hotel-saas |
| `member.status_changed` | 会員ステータス変更 | `{ customerId, oldStatus, newStatus, reason }` | hotel-pms, hotel-saas |
| `points.added` | ポイント追加 | `{ customerId, points, reason, balance }` | hotel-pms, hotel-saas |
| `points.used` | ポイント使用 | `{ customerId, points, reason, balance }` | hotel-pms, hotel-saas |

### hotel-common発行イベント

| イベント名 | 説明 | ペイロード | 購読システム |
|------------|------|----------|------------|
| `system.maintenance` | システムメンテナンス通知 | `{ type, startTime, endTime, affectedSystems }` | 全システム |
| `system.error` | システムエラー通知 | `{ errorType, message, severity, source }` | 全システム |
| `auth.user_created` | ユーザー作成 | `{ userId, email, role, permissions }` | 全システム |
| `auth.permissions_changed` | 権限変更 | `{ userId, oldPermissions, newPermissions }` | 全システム |

## イベントスキーマ

### 基本構造

```json
{
  "eventType": "string",       // イベント名（例: "reservation.created"）
  "version": "string",         // イベントスキーマのバージョン（例: "1.0"）
  "timestamp": "string",       // ISO 8601形式のタイムスタンプ
  "data": {                    // イベント固有のデータ
    // イベントごとに異なるペイロード
  },
  "metadata": {                // イベントのメタデータ
    "tenantId": "string",      // テナントID
    "source": "string",        // 発行元システム
    "correlationId": "string", // 相関ID（関連するイベントを追跡するため）
    "userId": "string",        // 操作を行ったユーザーID（該当する場合）
    "traceId": "string"        // 分散トレーシングID
  }
}
```

### イベントスキーマ例

#### service.ordered

```json
{
  "eventType": "service.ordered",
  "version": "1.0",
  "timestamp": "2023-01-01T12:00:00Z",
  "data": {
    "orderId": "ord_12345",
    "roomId": "room_789",
    "serviceId": "svc_456",
    "serviceName": "ルームサービス - ディナー",
    "quantity": 2,
    "customerId": "cust_123",
    "price": 1500,
    "requestedDeliveryTime": "2023-01-01T19:00:00Z",
    "specialInstructions": "アレルギー：小麦"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-saas",
    "correlationId": "corr_abc123",
    "userId": "user_456",
    "traceId": "trace_789"
  }
}
```

#### reservation.created

```json
{
  "eventType": "reservation.created",
  "version": "1.0",
  "timestamp": "2023-01-01T10:30:00Z",
  "data": {
    "reservationId": "res_12345",
    "reservationNumber": "R20230101-001",
    "customerId": "cust_123",
    "customerName": "山田 太郎",
    "roomId": "room_456",
    "roomNumber": "301",
    "roomType": "デラックス",
    "checkInDate": "2023-01-15T15:00:00Z",
    "checkOutDate": "2023-01-17T11:00:00Z",
    "adults": 2,
    "children": 1,
    "status": "CONFIRMED",
    "origin": "MEMBER",
    "totalAmount": 35000,
    "specialRequests": "禁煙ルーム希望"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-pms",
    "correlationId": "corr_def456",
    "userId": "user_789",
    "traceId": "trace_012"
  }
}
```

## イベント処理パターン

### 冪等性の確保

```typescript
// 冪等処理の例（hotel-pms側でのservice.orderedイベント処理）
async function handleServiceOrdered(event) {
  const { orderId } = event.data;
  
  // 既に処理済みかチェック
  const existingOrder = await db.serviceOrders.findUnique({
    where: { externalId: orderId }
  });
  
  if (existingOrder) {
    logger.info(`Order ${orderId} already processed, skipping`);
    return;
  }
  
  // 注文処理
  await db.serviceOrders.create({
    data: {
      externalId: orderId,
      roomId: event.data.roomId,
      serviceId: event.data.serviceId,
      quantity: event.data.quantity,
      amount: event.data.price,
      status: 'PENDING',
      // その他のフィールド
    }
  });
  
  // 請求項目に追加
  await addToBilling(event.data);
}
```

### エラーハンドリング

```typescript
// エラーハンドリングの例
async function processEvent(event) {
  try {
    // イベントタイプに基づいてハンドラを選択
    const handler = getHandlerForEvent(event.eventType);
    
    if (!handler) {
      logger.warn(`No handler found for event type: ${event.eventType}`);
      return;
    }
    
    // イベント処理
    await handler(event);
    
    // 処理完了を記録
    await markEventAsProcessed(event);
    
  } catch (error) {
    // エラーログ
    logger.error(`Error processing event ${event.eventType}:`, error);
    
    // リトライ可能なエラーか判断
    if (isRetryableError(error)) {
      // デッドレターキューに送信
      await sendToDeadLetterQueue(event, error);
    } else {
      // 再試行
      await scheduleRetry(event);
    }
  }
}
```

## 障害対策

### オフライン対応

- **ローカルキャッシュ**: 重要データのローカルキャッシュ
- **イベントキュー**: 通信障害時のイベント蓄積
- **再同期機能**: 復旧後の差分同期

### 監視・デバッグ

- **イベントログ**: すべてのイベントの送受信を記録
- **処理状況の可視化**: イベント処理のリアルタイム監視
- **アラート**: 処理遅延やエラー発生時の通知

## イベントスキーマ管理

- **スキーマレジストリ**: イベントスキーマの一元管理
- **バージョン管理**: スキーマのバージョン履歴の保持
- **互換性チェック**: スキーマ変更時の互換性確認

## イベント進化戦略

### 後方互換性の維持

- **フィールドの追加**: 常に任意フィールドとして追加
- **フィールドの削除**: 段階的な廃止（deprecation）プロセス
  1. フィールドを任意（optional）としてマーク
  2. 一定期間後に削除

### バージョン移行戦略

1. **デュアルパブリッシング**: 新旧両方のバージョンでイベントを発行
2. **デュアルサブスクリプション**: 新旧両方のバージョンを購読
3. **段階的移行**: システムごとに順次新バージョンに移行