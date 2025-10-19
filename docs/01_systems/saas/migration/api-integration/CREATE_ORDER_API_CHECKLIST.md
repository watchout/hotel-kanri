# オーダー作成API統合チェックリスト

## 概要

このドキュメントは、オーダー作成API（`POST /api/v1/orders`）のhotel-common APIへの統合プロセスを追跡するためのチェックリストです。

## API仕様

**エンドポイント**: `POST /api/v1/orders`

**リクエストボディ**:
```json
{
  "roomId": "room-101",
  "items": [
    {
      "menuId": "menu-001",
      "name": "ハンバーガー",
      "price": 1500,
      "quantity": 2,
      "options": [
        {
          "id": "option-001",
          "name": "チーズ追加",
          "price": 200
        }
      ]
    },
    {
      "menuId": "menu-002",
      "name": "フライドポテト",
      "price": 500,
      "quantity": 1,
      "options": []
    }
  ],
  "specialInstructions": "ケチャップ多めでお願いします",
  "paymentMethod": "room-charge"
}
```

**レスポンス**:
```json
{
  "success": true,
  "order": {
    "id": "order-001",
    "roomId": "room-101",
    "status": "pending",
    "totalAmount": 3700,
    "createdAt": "2025-08-01T12:00:00.000Z",
    "updatedAt": "2025-08-01T12:00:00.000Z",
    "items": [
      {
        "id": "item-001",
        "menuId": "menu-001",
        "name": "ハンバーガー",
        "price": 1500,
        "quantity": 2,
        "totalPrice": 3000,
        "options": [
          {
            "id": "option-001",
            "name": "チーズ追加",
            "price": 200
          }
        ]
      },
      {
        "id": "item-002",
        "menuId": "menu-002",
        "name": "フライドポテト",
        "price": 500,
        "quantity": 1,
        "totalPrice": 500,
        "options": []
      }
    ],
    "specialInstructions": "ケチャップ多めでお願いします",
    "paymentMethod": "room-charge"
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

- [ ] `api-client.ts`にオーダー作成メソッドを追加
- [ ] リクエストパラメータの処理を実装
- [ ] エラーハンドリングを実装（フォールバックなし）

### 2. サーバーサイド実装

- [ ] `server/api/v1/orders/index.post.v2.ts`を作成
- [ ] hotel-common APIの呼び出しを実装
- [ ] 完全にhotel-common APIに依存する実装に変更
- [ ] 本番環境でのテスト

### 3. テスト

- [ ] テスト用APIエンドポイント`test-create-order.post.ts`を作成
- [ ] 単体テストを実行
- [ ] 統合テストを実行
- [ ] ブラウザでのオーダー作成をテスト

### 4. ドキュメント

- [x] チェックリストの作成
- [ ] API統合マスターチェックリストの更新
- [ ] 実装の詳細ドキュメントの作成

### 5. デプロイ

- [ ] ステージング環境でのテスト
- [ ] 本番環境への適用

## 依存関係

- `orderApi.createOrder` メソッド - hotel-commonのAPIに完全に依存

## 注意事項

- 部屋ID（roomId）は必須パラメータ
- 注文アイテムは少なくとも1つ必要
- 各アイテムには、menuId、name、price、quantityが必須
- フォールバックなし - hotel-common APIが利用できない場合はエラーを返す
- 本番環境では、必ずhotel-common APIを使用する
