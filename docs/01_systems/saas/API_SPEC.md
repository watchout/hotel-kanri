# Hotel-SaaS API仕様

## 共通仕様

### ベースURL
```
https://api.hotel-saas.example.com/v1
```

### 認証
- Bearer認証を使用
- ヘッダー: `Authorization: Bearer <token>`

### エラーレスポンス
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

## エンドポイント

### 認証

#### POST /auth/login
ログイン処理

**リクエスト**
```json
{
  "email": "string",
  "password": "string"
}
```

**レスポンス**
```json
{
  "token": "string",
  "user": {
    "id": "string",
    "email": "string",
    "role": "string"
  }
}
```

### 注文

#### GET /order/menu
メニュー一覧取得

**レスポンス**
```json
{
  "categories": [
    {
      "id": "string",
      "name": "string",
      "items": [
        {
          "id": "string",
          "name": "string",
          "description": "string",
          "price": "number",
          "imageUrl": "string",
          "available": "boolean",
          "timeRestrictions": {
            "start": "string",
            "end": "string"
          }
        }
      ]
    }
  ]
}
```

#### POST /order
注文作成

**リクエスト**
```json
{
  "items": [
    {
      "menuId": "string",
      "quantity": "number"
    }
  ],
  "requestedTime": "string"
}
```

**レスポンス**
```json
{
  "orderId": "string",
  "status": "string",
  "items": [
    {
      "menuId": "string",
      "quantity": "number",
      "price": "number"
    }
  ],
  "totalAmount": "number",
  "requestedTime": "string"
}
```

#### GET /order/{id}
注文詳細取得

**レスポンス**
```json
{
  "orderId": "string",
  "status": "string",
  "items": [
    {
      "menuId": "string",
      "quantity": "number",
      "price": "number"
    }
  ],
  "totalAmount": "number",
  "requestedTime": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

### WebSocket

#### 接続
```
wss://api.hotel-saas.example.com/ws
```

#### イベント

##### 注文ステータス更新
```json
{
  "type": "ORDER_STATUS_UPDATE",
  "data": {
    "orderId": "string",
    "status": "string",
    "updatedAt": "string"
  }
}
```

##### エラー
```json
{
  "type": "ERROR",
  "data": {
    "code": "string",
    "message": "string"
  }
}
```

## エラーコード

| コード | 説明 |
|--------|------|
| AUTH_001 | 認証エラー |
| AUTH_002 | トークン期限切れ |
| ORDER_001 | 注文作成エラー |
| ORDER_002 | メニューが利用不可 |
| ORDER_003 | 時間外注文 |
| WS_001 | WebSocket接続エラー | 