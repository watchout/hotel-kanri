# イベント駆動アーキテクチャ設計

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

## システム別イベント一覧

### システム別イベント発行・購読一覧

| システム | 発行イベント | 購読イベント |
|---------|------------|------------|
| **hotel-saas** | service.ordered<br>service.canceled<br>feedback.submitted | reservation.updated<br>checkin_checkout.checked_in<br>checkin_checkout.checked_out<br>customer.updated |
| **hotel-pms** | reservation.created<br>reservation.updated<br>reservation.canceled<br>checkin_checkout.checked_in<br>checkin_checkout.checked_out<br>billing.created<br>billing.paid | service.ordered<br>service.canceled<br>customer.updated<br>member.status_changed |
| **hotel-member** | customer.created<br>customer.updated<br>member.registered<br>member.status_changed<br>points.added<br>points.used | reservation.created<br>reservation.canceled<br>checkin_checkout.checked_in<br>checkin_checkout.checked_out<br>billing.paid<br>feedback.submitted |
| **hotel-common** | system.maintenance<br>system.error<br>auth.user_created<br>auth.permissions_changed | すべてのイベント |

### 詳細イベント仕様

各システムのイベント詳細については、以下のドキュメントを参照してください：

- [hotel-saas イベント連携](./events/saas-events.md)
- [hotel-pms イベント連携](./events/pms-events.md)
- [hotel-member イベント連携](./events/member-events.md)
- [hotel-common イベント連携](./events/common-events.md)

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
      // 再試行
      await scheduleRetry(event);
    } else {
      // デッドレターキューに送信
      await sendToDeadLetterQueue(event, error);
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

## 関連ドキュメント
- [システム統合アーキテクチャ](../architecture/system-integration.md)
- [データフロー](./data-flow/overview.md)
- [API連携](./apis/overview.md)