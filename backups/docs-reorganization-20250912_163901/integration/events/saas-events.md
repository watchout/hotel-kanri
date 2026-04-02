# hotel-saas イベント連携

hotel-saasシステムは、他システムとイベント駆動アーキテクチャを通じて連携します。このドキュメントでは、hotel-saasが発行および購読するイベントについて定義します。

## 発行イベント

hotel-saasシステムは以下のイベントを発行します。

### service.ordered

サービス注文が発生した際に発行されるイベントです。

#### ペイロード
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

#### 購読システム
- hotel-pms: 請求処理、サービス提供指示

### service.canceled

サービス注文がキャンセルされた際に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "service.canceled",
  "version": "1.0",
  "timestamp": "2023-01-01T13:00:00Z",
  "data": {
    "orderId": "ord_12345",
    "reason": "顧客によるキャンセル",
    "canceledAt": "2023-01-01T13:00:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-saas",
    "correlationId": "corr_def456",
    "userId": "user_456",
    "traceId": "trace_789"
  }
}
```

#### 購読システム
- hotel-pms: 請求項目削除、サービス提供キャンセル

### feedback.submitted

フィードバックが送信された際に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "feedback.submitted",
  "version": "1.0",
  "timestamp": "2023-01-02T10:00:00Z",
  "data": {
    "customerId": "cust_123",
    "serviceId": "svc_456",
    "rating": 4,
    "comment": "とても良いサービスでした。ただ、配達が少し遅かったです。",
    "submittedAt": "2023-01-02T10:00:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-saas",
    "correlationId": "corr_ghi789",
    "userId": "user_456",
    "traceId": "trace_012"
  }
}
```

#### 購読システム
- hotel-member: 顧客フィードバック記録

## 購読イベント

hotel-saasシステムは以下のイベントを購読します。

### reservation.updated

予約情報が更新された際に発行されるイベントを購読します。

#### 処理内容
- 関連する客室情報を更新
- 予約に関連するサービス提案を更新

### checkin_checkout.checked_in

チェックインが発生した際に発行されるイベントを購読します。

#### 処理内容
- ウェルカムメッセージ表示
- パーソナライズされたサービス提案
- 客室設備の利用開始

### checkin_checkout.checked_out

チェックアウトが発生した際に発行されるイベントを購読します。

#### 処理内容
- サービス提供停止
- フィードバック依頼送信
- 次回の滞在に向けた情報保存

### customer.updated

顧客情報が更新された際に発行されるイベントを購読します。

#### 処理内容
- パーソナライズ情報の更新
- 顧客プロフィール表示の更新
- 推奨サービスの再計算

## オフライン対応

hotel-saasはPWA機能を活用し、オフライン時にも一部機能を提供します。特にサービス注文については以下の対応を行います：

1. **オフライン時の注文キャッシュ**
   - IndexedDBを使用してオフライン時の注文をローカルに保存
   - オンライン復帰時に自動的に注文を送信

2. **イベント送信キュー**
   - オフライン時に発行されるイベントをキューに格納
   - オンライン復帰時にキューからイベントを順次送信

3. **状態同期**
   - オンライン復帰時に最新の状態を取得して同期
   - 競合が発生した場合はサーバー側の状態を優先

## 関連ドキュメント
- [イベント駆動アーキテクチャ概要](../event-driven-architecture.md)
- [hotel-pms イベント連携](./pms-events.md)
- [hotel-member イベント連携](./member-events.md)