# オーダー履歴API統合チェックリスト

## 概要

このドキュメントは、オーダー履歴API（`GET /api/v1/orders/history`）のhotel-common APIへの統合プロセスを追跡するためのチェックリストです。

## API仕様

**エンドポイント**: `GET /api/v1/orders/history`

**クエリパラメータ**:
```
?page=1&limit=10&status=completed&from=2025-01-01&to=2025-12-31&roomId=123
```

**レスポンス**:
```json
{
  "success": true,
  "orders": [
    {
      "id": "order-001",
      "roomId": "room-101",
      "status": "completed",
      "totalAmount": 5000,
      "createdAt": "2025-08-01T12:00:00.000Z",
      "updatedAt": "2025-08-01T13:00:00.000Z",
      "items": [
        {
          "id": "item-001",
          "name": "ハンバーガー",
          "price": 1500,
          "quantity": 2,
          "totalPrice": 3000
        },
        {
          "id": "item-002",
          "name": "フライドポテト",
          "price": 500,
          "quantity": 2,
          "totalPrice": 1000
        },
        {
          "id": "item-003",
          "name": "コーラ",
          "price": 500,
          "quantity": 2,
          "totalPrice": 1000
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalItems": 100,
    "totalPages": 10
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

## 統合チェックリスト

### 1. APIクライアント層の実装

- [x] `api-client.ts`にオーダー履歴取得メソッドを追加
- [x] クエリパラメータの処理を実装
- [x] エラーハンドリングを実装（フォールバックなし）

### 2. サーバーサイド実装

- [x] `server/api/v1/orders/history.get.v2.ts`を作成
- [x] hotel-common APIの呼び出しを実装
- [x] 完全にhotel-common APIに依存する実装に変更
- [ ] 本番環境でのテスト

### 3. テスト

- [x] テスト用APIエンドポイント`test-orders-history.get.ts`を作成
- [x] 単体テストを実行
- [ ] 統合テストを実行
- [ ] ブラウザでのオーダー履歴表示をテスト

### 4. ドキュメント

- [x] チェックリストの作成
- [ ] API統合マスターチェックリストの更新
- [ ] 実装の詳細ドキュメントの作成

### 5. デプロイ

- [ ] ステージング環境でのテスト
- [ ] 本番環境への適用

## 依存関係

- `orderApi.getOrderHistory` メソッド - hotel-commonのAPIに完全に依存

## 注意事項

- オーダー履歴APIはページネーションに対応する必要がある
- フィルタリングパラメータ（日付範囲、ステータス、部屋ID）をサポートする
- 部屋ID（roomId）は必須パラメータ
- フォールバックなし - hotel-common APIが利用できない場合はエラーを返す
- 本番環境では、必ずhotel-common APIを使用する
