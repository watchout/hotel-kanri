# キャンペーンAPI動作確認ガイド

## 概要

本ドキュメントでは、hotel-common側で実装されたキャンペーンAPIの動作確認方法について説明します。APIの各エンドポイントの動作確認手順と、よくあるエラーの解決方法を提供します。

## 前提条件

- hotel-common APIサーバーが稼働していること
- 有効なJWT認証トークンを取得していること
- API動作確認ツール（Postman、cURL、またはAPIテストスクリプト）が利用可能であること

## 動作確認手順

### 1. 環境セットアップ

#### 1.1 hotel-common APIサーバーの起動

```bash
# hotel-commonディレクトリに移動
cd path/to/hotel-common

# 開発サーバーを起動
npm run dev

# または実サーバーを起動
./start-real-campaign-server.sh
```

#### 1.2 認証トークンの取得

```bash
# 認証トークン取得APIを呼び出し
curl -X POST http://localhost:3400/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'
```

レスポンス例:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "role": "admin"
    }
  }
}
```

取得したトークンを環境変数に設定するか、以降のリクエストで使用します。

```bash
# 環境変数に設定
export AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. キャンペーン管理API動作確認

#### 2.1 キャンペーン一覧取得

```bash
curl -X GET http://localhost:3400/api/v1/admin/campaigns \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

期待されるレスポンス:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "朝食タイムセール",
      "description": "朝7時から9時までの限定価格",
      "type": "percentage",
      "value": 20,
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-12-31T23:59:59Z",
      "isActive": true,
      "timeRestrictions": {
        "timeSlots": [
          {
            "startTime": "07:00",
            "endTime": "09:00"
          }
        ],
        "allowedDays": [1, 2, 3, 4, 5]
      },
      "minOrderAmount": null,
      "maxUsageCount": null,
      "currentUsageCount": 0,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1
  }
}
```

#### 2.2 キャンペーン作成

```bash
curl -X POST http://localhost:3400/api/v1/admin/campaigns \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "テストキャンペーン",
    "description": "APIテスト用キャンペーン",
    "type": "percentage",
    "value": 15,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "isActive": true,
    "timeRestrictions": {
      "timeSlots": [
        {
          "startTime": "12:00",
          "endTime": "14:00"
        }
      ],
      "allowedDays": [1, 2, 3, 4, 5]
    },
    "menuItemIds": [1, 2, 3]
  }'
```

期待されるレスポンス:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "テストキャンペーン",
    "description": "APIテスト用キャンペーン",
    "type": "percentage",
    "value": 15,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "isActive": true,
    "timeRestrictions": {
      "timeSlots": [
        {
          "startTime": "12:00",
          "endTime": "14:00"
        }
      ],
      "allowedDays": [1, 2, 3, 4, 5]
    },
    "minOrderAmount": null,
    "maxUsageCount": null,
    "currentUsageCount": 0,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

#### 2.3 キャンペーン詳細取得

```bash
curl -X GET http://localhost:3400/api/v1/admin/campaigns/2 \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

期待されるレスポンス:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "テストキャンペーン",
    "description": "APIテスト用キャンペーン",
    "type": "percentage",
    "value": 15,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "isActive": true,
    "timeRestrictions": {
      "timeSlots": [
        {
          "startTime": "12:00",
          "endTime": "14:00"
        }
      ],
      "allowedDays": [1, 2, 3, 4, 5]
    },
    "minOrderAmount": null,
    "maxUsageCount": null,
    "currentUsageCount": 0,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "items": [
      {
        "id": 1,
        "menuItemId": 1,
        "menuItem": {
          "id": 1,
          "name": "モーニングセット",
          "price": 1200
        }
      },
      {
        "id": 2,
        "menuItemId": 2,
        "menuItem": {
          "id": 2,
          "name": "フレンチトースト",
          "price": 800
        }
      },
      {
        "id": 3,
        "menuItemId": 3,
        "menuItem": {
          "id": 3,
          "name": "フルーツサラダ",
          "price": 600
        }
      }
    ]
  }
}
```

#### 2.4 キャンペーン更新

```bash
curl -X PUT http://localhost:3400/api/v1/admin/campaigns/2 \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "更新されたテストキャンペーン",
    "description": "更新されたAPIテスト用キャンペーン",
    "value": 20,
    "timeRestrictions": {
      "timeSlots": [
        {
          "startTime": "12:00",
          "endTime": "15:00"
        }
      ],
      "allowedDays": [1, 2, 3, 4, 5, 6, 7]
    }
  }'
```

期待されるレスポンス:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "更新されたテストキャンペーン",
    "description": "更新されたAPIテスト用キャンペーン",
    "type": "percentage",
    "value": 20,
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-12-31T23:59:59Z",
    "isActive": true,
    "timeRestrictions": {
      "timeSlots": [
        {
          "startTime": "12:00",
          "endTime": "15:00"
        }
      ],
      "allowedDays": [1, 2, 3, 4, 5, 6, 7]
    },
    "minOrderAmount": null,
    "maxUsageCount": null,
    "currentUsageCount": 0,
    "updatedAt": "2025-01-02T00:00:00Z"
  }
}
```

#### 2.5 キャンペーン削除

```bash
curl -X DELETE http://localhost:3400/api/v1/admin/campaigns/2 \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

期待されるレスポンス:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "isDeleted": true
  }
}
```

### 3. 客室側API動作確認

#### 3.1 アクティブなキャンペーン一覧取得

```bash
curl -X GET http://localhost:3400/api/v1/campaigns/active \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

期待されるレスポンス:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "朝食タイムセール",
      "description": "朝7時から9時までの限定価格",
      "type": "percentage",
      "value": 20,
      "timeRestrictions": {
        "timeSlots": [
          {
            "startTime": "07:00",
            "endTime": "09:00"
          }
        ]
      },
      "items": [
        {
          "menuItemId": 1,
          "menuItem": {
            "id": 1,
            "name": "モーニングセット",
            "originalPrice": 1200,
            "campaignPrice": 960
          }
        }
      ]
    }
  ]
}
```

#### 3.2 キャンペーン適用確認

```bash
curl -X GET "http://localhost:3400/api/v1/campaigns/check?menuItemId=1" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

期待されるレスポンス:
```json
{
  "success": true,
  "data": {
    "activeCampaign": {
      "id": 1,
      "name": "朝食タイムセール",
      "type": "percentage",
      "value": 20,
      "timeRestrictions": {
        "timeSlots": [
          {
            "startTime": "07:00",
            "endTime": "09:00"
          }
        ]
      }
    },
    "originalPrice": 1200,
    "campaignPrice": 960,
    "discountAmount": 240,
    "discountText": "20%オフ"
  }
}
```

#### 3.3 カテゴリー別キャンペーン取得

```bash
curl -X GET http://localhost:3400/api/v1/campaigns/by-category/breakfast \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

期待されるレスポンス:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "朝食タイムセール",
      "description": "朝7時から9時までの限定価格",
      "type": "percentage",
      "value": 20,
      "items": [
        {
          "menuItemId": 1,
          "menuItem": {
            "id": 1,
            "name": "モーニングセット",
            "originalPrice": 1200,
            "campaignPrice": 960
          }
        }
      ]
    }
  ]
}
```

### 4. ウェルカムスクリーンAPI動作確認

#### 4.1 ウェルカムスクリーン設定取得

```bash
curl -X GET http://localhost:3400/api/v1/welcome-screen/config \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

期待されるレスポンス:
```json
{
  "success": true,
  "data": {
    "title": "ようこそ、ホテルサービスへ",
    "description": "タブレットから様々なサービスをご利用いただけます。",
    "buttonText": "始める",
    "imageUrl": "https://example.com/welcome.jpg",
    "showOnce": true
  }
}
```

#### 4.2 ウェルカムスクリーン表示判定

```bash
curl -X GET "http://localhost:3400/api/v1/welcome-screen/should-show?deviceId=device-123456" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

期待されるレスポンス:
```json
{
  "success": true,
  "data": {
    "shouldShow": true
  }
}
```

#### 4.3 ウェルカムスクリーン完了マーク

```bash
curl -X POST http://localhost:3400/api/v1/welcome-screen/mark-completed \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-123456"
  }'
```

期待されるレスポンス:
```json
{
  "success": true,
  "data": {
    "deviceId": "device-123456",
    "completedAt": "2025-01-01T12:34:56Z"
  }
}
```

## 自動テストスクリプト

以下は、APIの動作確認を自動化するためのテストスクリプトの例です。

```javascript
// test-campaign-api.js
const axios = require('axios');

const API_URL = 'http://localhost:3400/api/v1';
let authToken = '';
let testCampaignId = null;

async function login() {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@example.com',
      password: 'password'
    });

    authToken = response.data.data.token;
    console.log('✅ ログイン成功');
    return true;
  } catch (error) {
    console.error('❌ ログイン失敗:', error.response?.data || error.message);
    return false;
  }
}

async function testCampaignAPI() {
  // 1. キャンペーン一覧取得
  try {
    const listResponse = await axios.get(`${API_URL}/admin/campaigns`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ キャンペーン一覧取得成功:', listResponse.data.data.length, '件');
  } catch (error) {
    console.error('❌ キャンペーン一覧取得失敗:', error.response?.data || error.message);
  }

  // 2. キャンペーン作成
  try {
    const createResponse = await axios.post(
      `${API_URL}/admin/campaigns`,
      {
        name: 'テスト自動化キャンペーン',
        description: '自動テスト用キャンペーン',
        type: 'percentage',
        value: 15,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        timeRestrictions: {
          timeSlots: [
            {
              startTime: '12:00',
              endTime: '14:00'
            }
          ],
          allowedDays: [1, 2, 3, 4, 5]
        },
        menuItemIds: [1, 2, 3]
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    testCampaignId = createResponse.data.data.id;
    console.log('✅ キャンペーン作成成功:', testCampaignId);
  } catch (error) {
    console.error('❌ キャンペーン作成失敗:', error.response?.data || error.message);
  }

  if (!testCampaignId) {
    console.error('❌ テスト中止: キャンペーンIDが取得できませんでした');
    return;
  }

  // 3. キャンペーン詳細取得
  try {
    const detailResponse = await axios.get(`${API_URL}/admin/campaigns/${testCampaignId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ キャンペーン詳細取得成功:', detailResponse.data.data.name);
  } catch (error) {
    console.error('❌ キャンペーン詳細取得失敗:', error.response?.data || error.message);
  }

  // 4. キャンペーン更新
  try {
    const updateResponse = await axios.put(
      `${API_URL}/admin/campaigns/${testCampaignId}`,
      {
        name: '更新されたテストキャンペーン',
        value: 20
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    console.log('✅ キャンペーン更新成功:', updateResponse.data.data.name);
  } catch (error) {
    console.error('❌ キャンペーン更新失敗:', error.response?.data || error.message);
  }

  // 5. アクティブなキャンペーン一覧取得
  try {
    const activeResponse = await axios.get(`${API_URL}/campaigns/active`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ アクティブキャンペーン取得成功:', activeResponse.data.data.length, '件');
  } catch (error) {
    console.error('❌ アクティブキャンペーン取得失敗:', error.response?.data || error.message);
  }

  // 6. キャンペーン適用確認
  try {
    const checkResponse = await axios.get(`${API_URL}/campaigns/check?menuItemId=1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ キャンペーン適用確認成功:',
      checkResponse.data.data.activeCampaign ?
      `${checkResponse.data.data.discountText}` :
      'アクティブなキャンペーンなし');
  } catch (error) {
    console.error('❌ キャンペーン適用確認失敗:', error.response?.data || error.message);
  }

  // 7. キャンペーン削除
  try {
    const deleteResponse = await axios.delete(`${API_URL}/admin/campaigns/${testCampaignId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ キャンペーン削除成功:', deleteResponse.data.data.isDeleted);
  } catch (error) {
    console.error('❌ キャンペーン削除失敗:', error.response?.data || error.message);
  }

  // 8. ウェルカムスクリーン設定取得
  try {
    const configResponse = await axios.get(`${API_URL}/welcome-screen/config`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ ウェルカムスクリーン設定取得成功:', configResponse.data.data.title);
  } catch (error) {
    console.error('❌ ウェルカムスクリーン設定取得失敗:', error.response?.data || error.message);
  }
}

async function runTests() {
  const loginSuccess = await login();
  if (loginSuccess) {
    await testCampaignAPI();
  }
}

runTests();
```

実行方法:
```bash
# 必要なパッケージをインストール
npm install axios

# テストスクリプトを実行
node test-campaign-api.js
```

## よくあるエラーと解決方法

### 1. 認証エラー

**エラー例**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です",
    "status": 401
  }
}
```

**解決方法**:
- 有効なJWTトークンを取得し、リクエストヘッダーに正しく設定されていることを確認
- トークンの有効期限が切れていないか確認
- トークンに必要な権限が含まれているか確認

### 2. キャンペーン作成エラー

**エラー例**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラー",
    "status": 400,
    "details": {
      "startDate": "開始日時は必須です",
      "endDate": "終了日時は必須です"
    }
  }
}
```

**解決方法**:
- リクエストボディに必須フィールドがすべて含まれているか確認
- 日付形式が正しいか確認（ISO 8601形式: `2025-09-12THH:mm:ssZ`）
- 数値フィールドが正しい範囲内か確認

### 3. キャンペーン適用エラー

**エラー例**:
```json
{
  "success": false,
  "error": {
    "code": "CAMPAIGN_NOT_APPLICABLE",
    "message": "キャンペーンは現在適用できません",
    "status": 400
  }
}
```

**解決方法**:
- 現在の時刻がキャンペーンの開始日時と終了日時の間にあるか確認
- 現在の曜日がキャンペーンの許可された曜日に含まれているか確認
- 現在の時刻がキャンペーンの時間帯制限内にあるか確認
- キャンペーンが有効（isActive = true）であるか確認

## まとめ

このガイドでは、hotel-common側で実装されたキャンペーンAPIの動作確認方法について説明しました。各エンドポイントの呼び出し方法と期待されるレスポンス、よくあるエラーの解決方法を提供しています。

APIの動作を確認する際は、以下の点に注意してください：

1. 認証トークンが有効であること
2. リクエストパラメータが正しく設定されていること
3. 時間帯制限のあるキャンペーンは、サーバー時間（UTC）で判定されること
4. エラーレスポンスを適切に処理すること

問題が発生した場合は、エラーメッセージを確認し、上記の「よくあるエラーと解決方法」セクションを参照してください。それでも解決しない場合は、hotel-common開発チームにお問い合わせください。
