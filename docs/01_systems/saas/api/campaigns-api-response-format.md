# キャンペーンAPI レスポンス形式ドキュメント

## 概要

hotel-commonサーバーのキャンペーンAPIのレスポンス形式について、実際の挙動を確認した結果をまとめています。
このドキュメントは、hotel-saasアプリケーションからhotel-commonサーバーのAPIを呼び出す際の参考情報として使用してください。

## 公開API

### GET /api/campaigns/active

アクティブなキャンペーン一覧を取得します。

**レスポンス形式:**

```json
{
  "success": true,
  "campaigns": [
    {
      "id": "camp_001",
      "name": "夏季特別キャンペーン",
      "code": "SUMMER2025",
      "description": "夏の特別割引キャンペーン",
      "startDate": "2025-07-01",
      "endDate": "2025-08-31",
      "isActive": true,
      "discountRate": 15,
      "targetCustomers": ["ALL"]
    },
    {
      "id": "camp_002",
      "name": "新規会員登録キャンペーン",
      "code": "NEWMEMBER",
      "description": "新規会員登録特典",
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "isActive": true,
      "discountRate": 10,
      "targetCustomers": ["NEW"]
    }
  ]
}
```

## 管理者API

### GET /api/campaigns/admin

管理者用キャンペーン情報を取得します。

**注意点:**
- このエンドポイントは、ページネーションパラメータ（page, limit）を無視します。
- 単一のキャンペーン情報のみを返します。

**レスポンス形式:**

```json
{
  "success": true,
  "campaign": {
    "id": "admin",
    "name": "新規会員登録キャンペーン",
    "code": "NEWMEMBER",
    "description": "新規会員登録特典",
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "isActive": true,
    "discountRate": 10,
    "targetCustomers": ["NEW"],
    "createdAt": "2025-06-01T00:00:00Z",
    "updatedAt": "2025-06-01T00:00:00Z"
  }
}
```

### GET /api/campaigns/admin/:id

特定のキャンペーン詳細を取得します。

**レスポンス形式:**

```json
{
  "success": true,
  "campaign": {
    "id": "camp_001",
    "name": "夏季特別キャンペーン",
    "code": "SUMMER2025",
    "description": "夏の特別割引キャンペーン",
    "startDate": "2025-07-01",
    "endDate": "2025-08-31",
    "isActive": true,
    "discountRate": 15,
    "targetCustomers": ["ALL"],
    "createdAt": "2025-06-01T00:00:00Z",
    "updatedAt": "2025-06-01T00:00:00Z"
  }
}
```

## クライアント側の対応

### 一覧表示の対応

`/api/campaigns/admin`エンドポイントは単一のキャンペーンしか返さないため、クライアント側で以下のように変換する必要があります：

```typescript
// src/api/services/admin-campaign-service.ts
async getCampaigns(params = {}) {
  try {
    // 実際のAPIエンドポイントに合わせて修正
    // GET /api/campaigns/admin は単一のキャンペーンを返すため、クエリパラメータを無視
    const response = await hotelCommonClient.get('/campaigns/admin')

    // API応答を一覧形式に変換
    if (response.data && response.data.campaign) {
      return {
        data: [response.data.campaign],
        meta: { total: 1 }
      }
    }
    return response.data
  } catch (error) {
    console.error('管理者キャンペーン一覧取得エラー:', error)
    throw error
  }
}
```

## 今後の課題

1. hotel-commonサーバー側でページネーション対応のAPIを実装する
2. 複数キャンペーンの管理機能を追加する
3. フィルタリング機能の実装
