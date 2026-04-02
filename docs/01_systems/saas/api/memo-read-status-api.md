# メモ機能既読未読 API仕様書

**作成日**: 2025年9月16日  
**作成者**: kaneko (hotel-kanri)  
**対象システム**: hotel-saas  
**機能**: メモ機能既読未読ステータス API仕様

## 🚨 **重要な実装方針**

### **❌ 禁止事項（厳守）**

**フォールバック・モック・一時対応の全面禁止**
- ❌ フォールバック処理（エラー時の代替処理）
- ❌ モックデータの使用
- ❌ 一時的な回避実装
- ❌ try-catch での例外隠蔽
- ❌ デフォルト値での問題回避
- ❌ 「とりあえず動く」実装

**理由**:
- エラーの隠蔽により問題発見が困難
- 一時対応の恒久化による技術的負債
- システム整合性の破綻
- デバッグ困難化

### **✅ 必須事項**

**正面からの問題解決**
- ✅ エラーは必ず表面化させる
- ✅ 問題の根本原因を特定・解決
- ✅ 適切なエラーハンドリング（隠蔽ではない）
- ✅ 実装前の依存関係確認
- ✅ 段階的だが確実な実装

## 📋 概要

メモ機能の既読未読ステータス管理のためのREST API仕様です。

## 🔐 認証・認可

すべてのAPIエンドポイントは以下の認証が必要です：

```http
Authorization: Bearer <JWT_TOKEN>
```

### 権限要件
- **基本権限**: すべてのスタッフが自分の既読未読ステータスを管理可能
- **管理者権限**: 他のスタッフの既読未読ステータスを参照可能（baseLevel 3以上）

## 📡 API エンドポイント

### 1. 既読処理API

#### POST /api/v1/memos/read-status

メモ、コメント、レスを既読にマークします。

**リクエスト**:
```http
POST /api/v1/memos/read-status
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "targetType": "memo",
  "targetId": "550e8400-e29b-41d4-a716-446655440000",
  "staffId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**リクエストボディ**:
```typescript
interface MarkAsReadRequest {
  targetType: 'memo' | 'comment' | 'reply';
  targetId: string; // UUID
  staffId: string;  // UUID - 省略時は認証ユーザー
}
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "targetType": "memo",
    "targetId": "550e8400-e29b-41d4-a716-446655440000",
    "staffId": "660e8400-e29b-41d4-a716-446655440001",
    "isRead": true,
    "readAt": "2025-09-16T10:30:00Z"
  }
}
```

**エラーレスポンス**:
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "INVALID_TARGET_TYPE",
    "message": "targetType must be one of: memo, comment, reply",
    "details": {
      "field": "targetType",
      "value": "invalid_type"
    }
  }
}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "TARGET_NOT_FOUND",
    "message": "Memo with ID 550e8400-e29b-41d4-a716-446655440000 not found",
    "details": {
      "targetType": "memo",
      "targetId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

### 2. 一括既読処理API

#### POST /api/v1/memos/read-status/batch

複数のアイテムを一括で既読にマークします。

**リクエスト**:
```http
POST /api/v1/memos/read-status/batch
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>

{
  "staffId": "660e8400-e29b-41d4-a716-446655440001",
  "items": [
    {
      "targetType": "memo",
      "targetId": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "targetType": "comment",
      "targetId": "770e8400-e29b-41d4-a716-446655440002"
    }
  ]
}
```

**リクエストボディ**:
```typescript
interface BatchMarkAsReadRequest {
  staffId: string; // UUID - 省略時は認証ユーザー
  items: Array<{
    targetType: 'memo' | 'comment' | 'reply';
    targetId: string; // UUID
  }>;
}
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "processedCount": 2,
    "successCount": 2,
    "failureCount": 0,
    "results": [
      {
        "targetType": "memo",
        "targetId": "550e8400-e29b-41d4-a716-446655440000",
        "success": true,
        "readAt": "2025-09-16T10:30:00Z"
      },
      {
        "targetType": "comment",
        "targetId": "770e8400-e29b-41d4-a716-446655440002",
        "success": true,
        "readAt": "2025-09-16T10:30:00Z"
      }
    ]
  }
}
```

### 3. 未読数取得API

#### GET /api/v1/memos/unread-count

スタッフの未読数を取得します。

**リクエスト**:
```http
GET /api/v1/memos/unread-count?staffId=660e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <JWT_TOKEN>
```

**クエリパラメータ**:
```typescript
interface UnreadCountQuery {
  staffId?: string; // UUID - 省略時は認証ユーザー
  includeDetails?: boolean; // デフォルト: false
}
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "staffId": "660e8400-e29b-41d4-a716-446655440001",
    "totalUnread": 15,
    "breakdown": {
      "memoUnread": 3,
      "commentUnread": 8,
      "replyUnread": 4
    },
    "lastUpdated": "2025-09-16T10:30:00Z"
  }
}
```

**詳細情報付きレスポンス** (`includeDetails=true`):
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "staffId": "660e8400-e29b-41d4-a716-446655440001",
    "totalUnread": 15,
    "breakdown": {
      "memoUnread": 3,
      "commentUnread": 8,
      "replyUnread": 4
    },
    "details": [
      {
        "memoId": "550e8400-e29b-41d4-a716-446655440000",
        "memoTitle": "フロント業務改善について",
        "unreadCount": 5,
        "breakdown": {
          "hasUnreadMemo": true,
          "unreadComments": 3,
          "unreadReplies": 1
        }
      }
    ],
    "lastUpdated": "2025-09-16T10:30:00Z"
  }
}
```

### 4. メモ一覧取得API（既読情報付き）

#### GET /api/v1/memos

既読情報付きでメモ一覧を取得します。

**リクエスト**:
```http
GET /api/v1/memos?includeReadStatus=true&staffId=660e8400-e29b-41d4-a716-446655440001&page=1&pageSize=20
Authorization: Bearer <JWT_TOKEN>
```

**クエリパラメータ**:
```typescript
interface MemoListQuery {
  includeReadStatus?: boolean; // デフォルト: false
  staffId?: string; // UUID - includeReadStatus=true時は必須
  page?: number; // デフォルト: 1
  pageSize?: number; // デフォルト: 20, 最大: 100
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'unreadCount'; // デフォルト: updatedAt
  sortOrder?: 'asc' | 'desc'; // デフォルト: desc
  filterUnreadOnly?: boolean; // 未読のみフィルタ, デフォルト: false
}
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "memos": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "フロント業務改善について",
        "content": "フロント業務の効率化を検討しています...",
        "authorId": "880e8400-e29b-41d4-a716-446655440003",
        "authorName": "山田太郎",
        "createdAt": "2025-09-15T14:30:00Z",
        "updatedAt": "2025-09-16T09:15:00Z",
        "readStatus": {
          "isRead": false,
          "readAt": null,
          "hasUnreadComments": true,
          "hasUnreadReplies": true,
          "totalUnreadCount": 5,
          "breakdown": {
            "unreadMemo": 1,
            "unreadComments": 3,
            "unreadReplies": 1
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    },
    "summary": {
      "totalMemos": 45,
      "totalUnreadMemos": 12,
      "totalUnreadCount": 38
    }
  }
}
```

### 5. メモ詳細取得API（既読情報付き）

#### GET /api/v1/memos/:id

既読情報付きでメモ詳細を取得します。

**リクエスト**:
```http
GET /api/v1/memos/550e8400-e29b-41d4-a716-446655440000?includeReadStatus=true&staffId=660e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <JWT_TOKEN>
```

**クエリパラメータ**:
```typescript
interface MemoDetailQuery {
  includeReadStatus?: boolean; // デフォルト: false
  staffId?: string; // UUID - includeReadStatus=true時は必須
  autoMarkAsRead?: boolean; // 自動既読処理, デフォルト: true
}
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "memo": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "フロント業務改善について",
      "content": "フロント業務の効率化を検討しています...",
      "authorId": "880e8400-e29b-41d4-a716-446655440003",
      "authorName": "山田太郎",
      "createdAt": "2025-09-15T14:30:00Z",
      "updatedAt": "2025-09-16T09:15:00Z",
      "readStatus": {
        "isRead": true,
        "readAt": "2025-09-16T10:30:00Z"
      }
    },
    "comments": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "content": "良いアイデアですね",
        "authorId": "990e8400-e29b-41d4-a716-446655440004",
        "authorName": "佐藤花子",
        "createdAt": "2025-09-15T16:20:00Z",
        "readStatus": {
          "isRead": false,
          "readAt": null
        },
        "replies": [
          {
            "id": "aa0e8400-e29b-41d4-a716-446655440005",
            "content": "ありがとうございます",
            "authorId": "880e8400-e29b-41d4-a716-446655440003",
            "authorName": "山田太郎",
            "createdAt": "2025-09-15T16:25:00Z",
            "readStatus": {
              "isRead": true,
              "readAt": "2025-09-16T08:45:00Z"
            }
          }
        ]
      }
    ]
  }
}
```

### 6. 既読ステータス取得API

#### GET /api/v1/memos/read-status

特定のアイテムの既読ステータスを取得します。

**リクエスト**:
```http
GET /api/v1/memos/read-status?targetType=memo&targetId=550e8400-e29b-41d4-a716-446655440000&staffId=660e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <JWT_TOKEN>
```

**クエリパラメータ**:
```typescript
interface ReadStatusQuery {
  targetType: 'memo' | 'comment' | 'reply';
  targetId: string; // UUID
  staffId?: string; // UUID - 省略時は認証ユーザー
}
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "targetType": "memo",
    "targetId": "550e8400-e29b-41d4-a716-446655440000",
    "staffId": "660e8400-e29b-41d4-a716-446655440001",
    "isRead": true,
    "readAt": "2025-09-16T10:30:00Z",
    "lastContentUpdate": "2025-09-16T09:15:00Z"
  }
}
```

## 🔄 WebSocket リアルタイム通知

### 接続

```javascript
const ws = new WebSocket('ws://localhost:3000/ws/memo-notifications');
ws.onopen = () => {
  // 認証
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'Bearer <JWT_TOKEN>'
  }));
};
```

### 未読数変更通知

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'unread_count_changed') {
    console.log('未読数が変更されました:', data.payload);
    // {
    //   staffId: "660e8400-e29b-41d4-a716-446655440001",
    //   totalUnread: 16,
    //   breakdown: {
    //     memoUnread: 3,
    //     commentUnread: 9,
    //     replyUnread: 4
    //   },
    //   changedItems: [
    //     {
    //       targetType: "comment",
    //       targetId: "bb0e8400-e29b-41d4-a716-446655440006",
    //       action: "created"
    //     }
    //   ]
    // }
  }
};
```

## 🧪 APIテストケース

### 1. 既読処理テスト

```typescript
describe('POST /api/v1/memos/read-status', () => {
  test('メモを既読にマークできる', async () => {
    const response = await request(app)
      .post('/api/v1/memos/read-status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        targetType: 'memo',
        targetId: 'valid-memo-id',
        staffId: 'valid-staff-id'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.isRead).toBe(true);
    expect(response.body.data.readAt).toBeDefined();
  });
  
  test('無効なtargetTypeでエラーになる', async () => {
    const response = await request(app)
      .post('/api/v1/memos/read-status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        targetType: 'invalid',
        targetId: 'valid-memo-id',
        staffId: 'valid-staff-id'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_TARGET_TYPE');
  });
  
  test('存在しないメモIDでエラーになる', async () => {
    const response = await request(app)
      .post('/api/v1/memos/read-status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        targetType: 'memo',
        targetId: 'non-existent-id',
        staffId: 'valid-staff-id'
      });
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('TARGET_NOT_FOUND');
  });
});
```

### 2. 未読数取得テスト

```typescript
describe('GET /api/v1/memos/unread-count', () => {
  test('未読数を正しく取得できる', async () => {
    const response = await request(app)
      .get('/api/v1/memos/unread-count')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ staffId: 'valid-staff-id' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalUnread).toBeGreaterThanOrEqual(0);
    expect(response.body.data.breakdown).toBeDefined();
  });
  
  test('詳細情報付きで取得できる', async () => {
    const response = await request(app)
      .get('/api/v1/memos/unread-count')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ 
        staffId: 'valid-staff-id',
        includeDetails: 'true'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.data.details).toBeDefined();
    expect(Array.isArray(response.body.data.details)).toBe(true);
  });
});
```

### 3. パフォーマンステスト

```typescript
describe('API Performance Tests', () => {
  test('未読数取得が100ms以内で完了する', async () => {
    const startTime = Date.now();
    
    const response = await request(app)
      .get('/api/v1/memos/unread-count')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ staffId: 'valid-staff-id' });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(100);
  });
  
  test('大量データでもメモ一覧取得が500ms以内で完了する', async () => {
    // 1000件のメモを事前に作成
    await createTestMemos(1000);
    
    const startTime = Date.now();
    
    const response = await request(app)
      .get('/api/v1/memos')
      .set('Authorization', `Bearer ${validToken}`)
      .query({ 
        includeReadStatus: 'true',
        staffId: 'valid-staff-id',
        pageSize: '50'
      });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(500);
  });
});
```

## 🚨 エラーハンドリング

### 共通エラーレスポンス形式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}
```

### エラーコード一覧

| エラーコード | HTTPステータス | 説明 |
|-------------|---------------|------|
| `INVALID_TARGET_TYPE` | 400 | 無効なtargetType |
| `INVALID_UUID` | 400 | 無効なUUID形式 |
| `MISSING_REQUIRED_FIELD` | 400 | 必須フィールドの不足 |
| `UNAUTHORIZED` | 401 | 認証エラー |
| `FORBIDDEN` | 403 | 権限不足 |
| `TARGET_NOT_FOUND` | 404 | 対象アイテムが存在しない |
| `STAFF_NOT_FOUND` | 404 | スタッフが存在しない |
| `DATABASE_ERROR` | 500 | データベースエラー |
| `INTERNAL_SERVER_ERROR` | 500 | 内部サーバーエラー |

### エラーハンドリング実装例

```typescript
// ✅ 正しいエラーハンドリング（隠蔽しない）
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { targetType, targetId, staffId } = req.body;
    
    // バリデーション
    if (!['memo', 'comment', 'reply'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TARGET_TYPE',
          message: `targetType must be one of: memo, comment, reply`,
          details: { field: 'targetType', value: targetType },
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
    
    // データベース処理
    const result = await readStatusService.markAsRead({
      targetType,
      targetId,
      staffId
    });
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    // エラーを隠蔽せず、適切にログ出力して上位に伝播
    console.error('Failed to mark as read:', error);
    
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TARGET_NOT_FOUND',
          message: error.message,
          details: error.details,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
    
    // 予期しないエラーも隠蔽しない
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }
};
```

## 📊 レート制限

### API制限

| エンドポイント | 制限 | ウィンドウ |
|---------------|------|----------|
| `POST /api/v1/memos/read-status` | 100回/分 | 1分 |
| `POST /api/v1/memos/read-status/batch` | 20回/分 | 1分 |
| `GET /api/v1/memos/unread-count` | 60回/分 | 1分 |
| `GET /api/v1/memos` | 30回/分 | 1分 |

### 制限超過時のレスポンス

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "details": {
      "limit": 100,
      "window": "1 minute",
      "retryAfter": 60
    },
    "timestamp": "2025-09-16T10:30:00Z",
    "requestId": "req_123456"
  }
}
```

---

**ドキュメント更新履歴**:
- 2025年9月16日: 初版作成 (kaneko)
