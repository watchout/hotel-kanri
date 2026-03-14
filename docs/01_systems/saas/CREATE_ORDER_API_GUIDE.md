# オーダー作成API使用ガイド

## 概要

このドキュメントは、hotel-commonで新たに実装されたオーダー作成API（`POST /api/v1/orders`）の使用方法をhotel-saas開発者向けに解説します。

## API仕様

### エンドポイント

```
POST /api/v1/orders
```

### 認証要件

このAPIは認証が必要です。リクエスト時に以下のヘッダーを含める必要があります。

```
Authorization: Bearer {JWT_TOKEN}
X-Tenant-ID: {TENANT_ID}
```

### リクエスト形式

#### ヘッダー

| ヘッダー名 | 必須 | 説明 |
|------------|------|------|
| Authorization | ✅ | Bearer {JWT_TOKEN} 形式の認証トークン |
| X-Tenant-ID | ✅ | テナントID |
| Content-Type | ✅ | application/json |

#### リクエストボディ

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
  "paymentMethod": "room-charge",
  "deviceId": "device-001",
  "source": "room-tablet"
}
```

#### パラメータ詳細

| パラメータ名 | 型 | 必須 | 説明 |
|--------------|------|------|------|
| roomId | string | ✅ | 部屋ID |
| items | array | ✅ | 注文アイテムの配列 |
| items[].menuId | string | ✅ | メニューアイテムID |
| items[].name | string | ✅ | アイテム名 |
| items[].price | number | ✅ | アイテム単価 |
| items[].quantity | number | ✅ | 数量（1以上） |
| items[].options | array | ❌ | オプションの配列 |
| items[].options[].id | string | ✅ | オプションID |
| items[].options[].name | string | ✅ | オプション名 |
| items[].options[].price | number | ✅ | オプション価格 |
| specialInstructions | string | ❌ | 特別指示（最大500文字） |
| paymentMethod | string | ✅ | 支払い方法（"room-charge", "credit-card", "cash"のいずれか） |
| deviceId | string | ❌ | 注文を作成したデバイスのID |
| source | string | ❌ | 注文ソース（"room-tablet", "mobile-app", "front-desk"など） |

### レスポンス形式

#### 成功レスポンス (200 OK)

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
    "paymentMethod": "room-charge",
    "deviceId": "device-001",
    "source": "room-tablet"
  }
}
```

#### レスポンスフィールド詳細

| フィールド名 | 型 | 説明 |
|--------------|------|------|
| success | boolean | 処理成功フラグ |
| order | object | 作成されたオーダー情報 |
| order.id | string | オーダーID |
| order.roomId | string | 部屋ID |
| order.status | string | オーダーステータス（"pending", "processing", "completed", "cancelled"など） |
| order.totalAmount | number | 合計金額（税込） |
| order.createdAt | string | 作成日時（ISO 8601形式） |
| order.updatedAt | string | 更新日時（ISO 8601形式） |
| order.items | array | 注文アイテムの配列 |
| order.items[].id | string | アイテムID |
| order.items[].menuId | string | メニューアイテムID |
| order.items[].name | string | アイテム名 |
| order.items[].price | number | アイテム単価 |
| order.items[].quantity | number | 数量 |
| order.items[].totalPrice | number | アイテム合計金額（単価×数量） |
| order.items[].options | array | オプションの配列 |
| order.specialInstructions | string | 特別指示 |
| order.paymentMethod | string | 支払い方法 |
| order.deviceId | string | デバイスID |
| order.source | string | 注文ソース |

### エラーレスポンス

#### 400 Bad Request

```json
{
  "success": false,
  "error": "リクエストが不正です",
  "details": {
    "roomId": "部屋IDは必須です",
    "items": "少なくとも1つのアイテムが必要です"
  }
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "error": "認証が必要です"
}
```

#### 403 Forbidden

```json
{
  "success": false,
  "error": "このリソースにアクセスする権限がありません"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "error": "指定された部屋が見つかりません"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "error": "内部サーバーエラーが発生しました"
}
```

## 認証方法

### JWTトークンの取得

オーダー作成APIを使用するには、有効なJWTトークンが必要です。トークンを取得するには、以下のログインAPIを使用します。

```
POST /api/v1/auth/login
```

**リクエスト例：**

```json
{
  "email": "professional@example.com",
  "password": "password123"
}
```

**レスポンス例：**

```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "staff-001",
    "email": "professional@example.com",
    "role": "admin"
  }
}
```

取得したaccessTokenをAuthorizationヘッダーに設定してAPIを呼び出します。

### テナントIDの取得

テナントIDは、ログイン成功後に取得できます。通常、ユーザー情報に含まれるtenantIdを使用します。

## 実装例

### cURL

```bash
# JWTトークンの取得
TOKEN=$(curl -X POST "http://localhost:3400/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"professional@example.com","password":"password123"}' \
  | jq -r '.accessToken')

# オーダーの作成
curl -X POST "http://localhost:3400/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: tenant-001" \
  -d '{
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
      }
    ],
    "paymentMethod": "room-charge"
  }'
```

### TypeScript (hotel-saas)

hotel-saasでは、`api-client.ts`を使用して簡単にAPIを呼び出すことができます。

```typescript
import { orderApi } from '../utils/api-client';

// オーダーの作成
async function createOrder() {
  try {
    const orderData = {
      roomId: 'room-101',
      items: [
        {
          menuId: 'menu-001',
          name: 'ハンバーガー',
          price: 1500,
          quantity: 2,
          options: [
            {
              id: 'option-001',
              name: 'チーズ追加',
              price: 200
            }
          ]
        }
      ],
      specialInstructions: 'ケチャップ多めでお願いします',
      paymentMethod: 'room-charge',
      source: 'room-tablet'
    };

    const result = await orderApi.createOrder(orderData);
    console.log('オーダー作成成功:', result.order);
    return result.order;
  } catch (error) {
    console.error('オーダー作成エラー:', error);
    throw error;
  }
}
```

### Vue Component例

```vue
<template>
  <div>
    <h2>オーダー作成</h2>
    <form @submit.prevent="submitOrder">
      <div>
        <label>部屋番号</label>
        <input v-model="order.roomId" required />
      </div>

      <div v-for="(item, index) in order.items" :key="index">
        <h3>アイテム {{ index + 1 }}</h3>
        <div>
          <label>名前</label>
          <input v-model="item.name" required />
        </div>
        <div>
          <label>価格</label>
          <input v-model.number="item.price" type="number" required />
        </div>
        <div>
          <label>数量</label>
          <input v-model.number="item.quantity" type="number" min="1" required />
        </div>
      </div>

      <div>
        <button type="button" @click="addItem">アイテム追加</button>
      </div>

      <div>
        <label>特別指示</label>
        <textarea v-model="order.specialInstructions"></textarea>
      </div>

      <div>
        <label>支払い方法</label>
        <select v-model="order.paymentMethod" required>
          <option value="room-charge">ルームチャージ</option>
          <option value="credit-card">クレジットカード</option>
          <option value="cash">現金</option>
        </select>
      </div>

      <button type="submit" :disabled="isSubmitting">注文する</button>
    </form>

    <div v-if="error" class="error">
      {{ error }}
    </div>

    <div v-if="successMessage" class="success">
      {{ successMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { orderApi } from '../../../utils/api-client';

const order = ref({
  roomId: '',
  items: [
    {
      menuId: 'menu-001',
      name: '',
      price: 0,
      quantity: 1,
      options: []
    }
  ],
  specialInstructions: '',
  paymentMethod: 'room-charge',
  source: 'admin-panel'
});

const isSubmitting = ref(false);
const error = ref('');
const successMessage = ref('');

function addItem() {
  order.value.items.push({
    menuId: `menu-${order.value.items.length + 1}`,
    name: '',
    price: 0,
    quantity: 1,
    options: []
  });
}

async function submitOrder() {
  isSubmitting.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const result = await orderApi.createOrder(order.value);
    successMessage.value = `オーダーが作成されました。オーダーID: ${result.order.id}`;

    // フォームをリセット
    order.value = {
      roomId: '',
      items: [
        {
          menuId: 'menu-001',
          name: '',
          price: 0,
          quantity: 1,
          options: []
        }
      ],
      specialInstructions: '',
      paymentMethod: 'room-charge',
      source: 'admin-panel'
    };
  } catch (err) {
    error.value = `オーダー作成エラー: ${err.message || 'エラーが発生しました'}`;
  } finally {
    isSubmitting.value = false;
  }
}
</script>
```

## エラーハンドリング

APIからのエラーレスポンスは、`success: false`と`error`メッセージを含みます。詳細なエラー情報は`details`オブジェクトに含まれる場合があります。

エラーハンドリングの例：

```typescript
try {
  const result = await orderApi.createOrder(orderData);
  // 成功処理
} catch (error) {
  if (error.statusCode === 400) {
    // バリデーションエラー
    console.error('入力データが不正です:', error.details);
  } else if (error.statusCode === 401) {
    // 認証エラー
    console.error('認証エラー: JWTトークンを更新してください');
    // トークンリフレッシュ処理
  } else if (error.statusCode === 403) {
    // 権限エラー
    console.error('このリソースにアクセスする権限がありません');
  } else if (error.statusCode === 404) {
    // リソースが見つからない
    console.error('指定されたリソースが見つかりません');
  } else {
    // その他のエラー
    console.error('サーバーエラーが発生しました:', error);
  }
}
```

## 注意事項

1. **認証トークンの有効期限**: JWTトークンには有効期限があります。有効期限が切れた場合は、リフレッシュトークンを使用して新しいトークンを取得してください。

2. **必須パラメータ**: `roomId`, `items`配列（少なくとも1つのアイテム）, `paymentMethod`は必須です。

3. **数値フィールド**: `price`, `quantity`などの数値フィールドは、必ず数値型で送信してください。文字列型で送信するとバリデーションエラーになります。

4. **エラーハンドリング**: APIからのエラーレスポンスを適切に処理し、ユーザーにフィードバックを提供してください。

5. **テナントID**: テナントIDは必ずリクエストヘッダーに含めてください。テナントIDが不正な場合、403エラーが返されます。

## トラブルシューティング

### JWT検証エラー: invalid signature

このエラーは、JWTトークンの署名が無効であることを示しています。以下の原因が考えられます：

1. **トークンの改ざん**: トークンが改ざんされている可能性があります。
2. **異なる環境のトークン**: 開発環境で取得したトークンを本番環境で使用するなど、環境が異なる場合に発生します。
3. **トークンの有効期限切れ**: トークンの有効期限が切れている可能性があります。

**解決策**:
- ログインAPIを使用して新しいトークンを取得してください。
- 正しい環境のAPIエンドポイントを使用していることを確認してください。
- トークンをそのまま使用し、改変しないようにしてください。

### リクエストが不正です

このエラーは、リクエストボディのバリデーションに失敗した場合に発生します。以下の点を確認してください：

1. **必須パラメータ**: `roomId`, `items`配列（少なくとも1つのアイテム）, `paymentMethod`が含まれていることを確認してください。
2. **データ型**: 数値フィールドが文字列になっていないか確認してください。
3. **配列の形式**: `items`配列が正しい形式であることを確認してください。

**解決策**:
- エラーレスポンスの`details`オブジェクトを確認し、具体的なエラー内容を把握してください。
- リクエストボディの形式と必須パラメータを確認してください。

## サポート

APIの使用中に問題が発生した場合は、以下の情報を添えてサポートチームにお問い合わせください：

1. リクエストボディ（機密情報を除く）
2. エラーメッセージ
3. 発生時刻
4. 環境情報（開発/テスト/本番）

サポート連絡先: support@hotel-common.example.com
