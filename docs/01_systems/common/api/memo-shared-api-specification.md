# メモ機能共有システム API詳細仕様書

**作成日**: 2025年9月16日  
**作成者**: kaneko (hotel-kanri)  
**対象システム**: hotel-common  
**機能**: メモ機能共有システム API詳細仕様

## 🚨 **重要な実装方針**

### **❌ 禁止事項（厳守）**

**フォールバック・モック・一時対応の全面禁止**
- ❌ フォールバック処理（エラー時の代替処理）
- ❌ モックデータの使用
- ❌ 一時的な回避実装
- ❌ try-catch での例外隠蔽
- ❌ デフォルト値での問題回避
- ❌ 「とりあえず動く」実装

## 📡 API基本情報

### ベースURL
```
http://localhost:3400/api/v1/memos
```

### 認証・ヘッダー
```http
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas|pms
X-Tenant-ID: <TENANT_UUID>
Content-Type: application/json
```

## 📋 メモ管理API

### 1. メモ一覧取得

#### GET /api/v1/memos

**リクエスト**:
```http
GET /api/v1/memos?page=1&pageSize=20&includeReadStatus=true&staffId=uuid&sourceSystem=saas
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
```

**クエリパラメータ**:
```typescript
interface MemoListQuery {
  page?: number;                    // デフォルト: 1
  pageSize?: number;               // デフォルト: 20, 最大: 100
  includeReadStatus?: boolean;     // デフォルト: false
  staffId?: string;               // includeReadStatus=true時は必須
  sourceSystem?: 'saas' | 'pms';  // フィルタリング用
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'priority' | 'viewCount';
  sortOrder?: 'asc' | 'desc';     // デフォルト: desc
  filterUnreadOnly?: boolean;      // 未読のみ, デフォルト: false
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  tags?: string[];                // タグフィルタ
  authorId?: string;              // 作成者フィルタ
  search?: string;                // タイトル・内容検索
  isPinned?: boolean;             // ピン留めフィルタ
  isArchived?: boolean;           // アーカイブフィルタ
  dateFrom?: string;              // ISO 8601 date
  dateTo?: string;                // ISO 8601 date
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
        "tenantId": "660e8400-e29b-41d4-a716-446655440001",
        "title": "フロント業務改善について",
        "content": "フロント業務の効率化を検討しています...",
        "authorId": "770e8400-e29b-41d4-a716-446655440002",
        "authorName": "山田太郎",
        "sourceSystem": "saas",
        "tags": ["業務改善", "フロント"],
        "priority": "high",
        "category": "業務",
        "isPinned": false,
        "isArchived": false,
        "viewCount": 15,
        "commentCount": 3,
        "attachmentCount": 1,
        "createdAt": "2025-09-15T14:30:00Z",
        "updatedAt": "2025-09-16T09:15:00Z",
        "createdBy": "770e8400-e29b-41d4-a716-446655440002",
        "updatedBy": "880e8400-e29b-41d4-a716-446655440003",
        "readStatus": {
          "isRead": false,
          "readAt": null,
          "hasUnreadComments": true,
          "totalUnreadCount": 4,
          "breakdown": {
            "unreadMemo": 1,
            "unreadComments": 3,
            "unreadReplies": 0
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
      "totalUnreadCount": 38,
      "priorityCounts": {
        "high": 5,
        "medium": 25,
        "low": 15
      },
      "systemCounts": {
        "saas": 30,
        "pms": 15
      }
    }
  }
}
```

### 2. メモ詳細取得

#### GET /api/v1/memos/:id

**リクエスト**:
```http
GET /api/v1/memos/550e8400-e29b-41d4-a716-446655440000?includeReadStatus=true&staffId=uuid&autoMarkAsRead=true
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
```

**クエリパラメータ**:
```typescript
interface MemoDetailQuery {
  includeReadStatus?: boolean;     // デフォルト: false
  staffId?: string;               // includeReadStatus=true時は必須
  autoMarkAsRead?: boolean;       // 自動既読処理, デフォルト: true
  includeComments?: boolean;      // デフォルト: true
  includeAttachments?: boolean;   // デフォルト: true
  commentsPage?: number;          // コメントページング
  commentsPageSize?: number;      // コメントページサイズ
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
      "tenantId": "660e8400-e29b-41d4-a716-446655440001",
      "title": "フロント業務改善について",
      "content": "フロント業務の効率化を検討しています...",
      "authorId": "770e8400-e29b-41d4-a716-446655440002",
      "authorName": "山田太郎",
      "sourceSystem": "saas",
      "tags": ["業務改善", "フロント"],
      "priority": "high",
      "category": "業務",
      "isPinned": false,
      "isArchived": false,
      "viewCount": 16,
      "commentCount": 3,
      "attachmentCount": 1,
      "createdAt": "2025-09-15T14:30:00Z",
      "updatedAt": "2025-09-16T09:15:00Z",
      "readStatus": {
        "isRead": true,
        "readAt": "2025-09-16T10:30:00Z",
        "readCount": 3,
        "totalReadTimeSeconds": 180
      }
    },
    "comments": [
      {
        "id": "aa0e8400-e29b-41d4-a716-446655440003",
        "memoId": "550e8400-e29b-41d4-a716-446655440000",
        "parentCommentId": null,
        "authorId": "990e8400-e29b-41d4-a716-446655440004",
        "authorName": "佐藤花子",
        "sourceSystem": "pms",
        "content": "良いアイデアですね。PMSからも確認できました。",
        "isEdited": false,
        "replyCount": 1,
        "createdAt": "2025-09-15T16:20:00Z",
        "updatedAt": "2025-09-15T16:20:00Z",
        "readStatus": {
          "isRead": false,
          "readAt": null,
          "readCount": 0
        },
        "replies": [
          {
            "id": "bb0e8400-e29b-41d4-a716-446655440005",
            "memoId": "550e8400-e29b-41d4-a716-446655440000",
            "parentCommentId": "aa0e8400-e29b-41d4-a716-446655440003",
            "authorId": "770e8400-e29b-41d4-a716-446655440002",
            "authorName": "山田太郎",
            "sourceSystem": "saas",
            "content": "ありがとうございます！",
            "isEdited": false,
            "replyCount": 0,
            "createdAt": "2025-09-15T16:25:00Z",
            "updatedAt": "2025-09-15T16:25:00Z",
            "readStatus": {
              "isRead": true,
              "readAt": "2025-09-16T08:45:00Z",
              "readCount": 1
            }
          }
        ]
      }
    ],
    "attachments": [
      {
        "id": "cc0e8400-e29b-41d4-a716-446655440006",
        "memoId": "550e8400-e29b-41d4-a716-446655440000",
        "commentId": null,
        "originalFilename": "業務フロー図.png",
        "storedFilename": "cc0e8400-e29b-41d4-a716-446655440006.png",
        "filePath": "/uploads/memos/2025/09/cc0e8400-e29b-41d4-a716-446655440006.png",
        "fileSize": 1024000,
        "mimeType": "image/png",
        "isImage": true,
        "imageWidth": 1920,
        "imageHeight": 1080,
        "createdAt": "2025-09-15T14:35:00Z",
        "createdBy": "770e8400-e29b-41d4-a716-446655440002"
      }
    ]
  }
}
```

### 3. メモ作成

#### POST /api/v1/memos

**リクエスト**:
```http
POST /api/v1/memos
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
Content-Type: application/json

{
  "title": "新しいメモのタイトル",
  "content": "メモの内容です。詳細な説明を記載します。",
  "tags": ["タグ1", "タグ2"],
  "priority": "medium",
  "category": "業務",
  "isPinned": false,
  "attachments": [
    {
      "originalFilename": "document.pdf",
      "fileData": "base64-encoded-file-data",
      "mimeType": "application/pdf"
    }
  ]
}
```

**リクエストボディ**:
```typescript
interface CreateMemoRequest {
  title: string;                   // 1-200文字
  content: string;                 // 1-10000文字
  tags?: string[];                 // 最大10個
  priority?: 'low' | 'medium' | 'high';
  category?: string;               // 最大50文字
  isPinned?: boolean;
  attachments?: Array<{
    originalFilename: string;
    fileData: string;              // Base64エンコード
    mimeType: string;
  }>;
}
```

**レスポンス**:
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "memo": {
      "id": "dd0e8400-e29b-41d4-a716-446655440007",
      "tenantId": "660e8400-e29b-41d4-a716-446655440001",
      "title": "新しいメモのタイトル",
      "content": "メモの内容です。詳細な説明を記載します。",
      "authorId": "770e8400-e29b-41d4-a716-446655440002",
      "authorName": "山田太郎",
      "sourceSystem": "saas",
      "tags": ["タグ1", "タグ2"],
      "priority": "medium",
      "category": "業務",
      "isPinned": false,
      "isArchived": false,
      "viewCount": 0,
      "commentCount": 0,
      "attachmentCount": 1,
      "createdAt": "2025-09-16T10:30:00Z",
      "updatedAt": "2025-09-16T10:30:00Z",
      "createdBy": "770e8400-e29b-41d4-a716-446655440002"
    },
    "attachments": [
      {
        "id": "ee0e8400-e29b-41d4-a716-446655440008",
        "originalFilename": "document.pdf",
        "storedFilename": "ee0e8400-e29b-41d4-a716-446655440008.pdf",
        "fileSize": 2048000,
        "mimeType": "application/pdf"
      }
    ]
  }
}
```

### 4. メモ更新

#### PATCH /api/v1/memos/:id

**リクエスト**:
```http
PATCH /api/v1/memos/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
Content-Type: application/json

{
  "title": "更新されたタイトル",
  "content": "更新された内容です。",
  "priority": "high",
  "isPinned": true
}
```

**リクエストボディ**:
```typescript
interface UpdateMemoRequest {
  title?: string;
  content?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  isPinned?: boolean;
  isArchived?: boolean;
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
      "title": "更新されたタイトル",
      "content": "更新された内容です。",
      "priority": "high",
      "isPinned": true,
      "updatedAt": "2025-09-16T10:35:00Z",
      "updatedBy": "770e8400-e29b-41d4-a716-446655440002"
    }
  }
}
```

### 5. メモ削除

#### DELETE /api/v1/memos/:id

**リクエスト**:
```http
DELETE /api/v1/memos/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "message": "Memo deleted successfully",
    "deletedAt": "2025-09-16T10:40:00Z",
    "deletedBy": "770e8400-e29b-41d4-a716-446655440002"
  }
}
```

## 💬 コメント管理API

### 1. コメント作成

#### POST /api/v1/memos/:memoId/comments

**リクエスト**:
```http
POST /api/v1/memos/550e8400-e29b-41d4-a716-446655440000/comments
Authorization: Bearer <JWT_TOKEN>
X-Source-System: pms
X-Tenant-ID: <TENANT_UUID>
Content-Type: application/json

{
  "content": "PMSからのコメントです。",
  "parentCommentId": null,
  "attachments": [
    {
      "originalFilename": "screenshot.png",
      "fileData": "base64-encoded-image-data",
      "mimeType": "image/png"
    }
  ]
}
```

**リクエストボディ**:
```typescript
interface CreateCommentRequest {
  content: string;                 // 1-2000文字
  parentCommentId?: string;        // 返信の場合
  attachments?: Array<{
    originalFilename: string;
    fileData: string;              // Base64エンコード
    mimeType: string;
  }>;
}
```

**レスポンス**:
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "comment": {
      "id": "ff0e8400-e29b-41d4-a716-446655440009",
      "memoId": "550e8400-e29b-41d4-a716-446655440000",
      "parentCommentId": null,
      "authorId": "990e8400-e29b-41d4-a716-446655440004",
      "authorName": "佐藤花子",
      "sourceSystem": "pms",
      "content": "PMSからのコメントです。",
      "isEdited": false,
      "replyCount": 0,
      "createdAt": "2025-09-16T10:45:00Z",
      "updatedAt": "2025-09-16T10:45:00Z",
      "createdBy": "990e8400-e29b-41d4-a716-446655440004"
    },
    "attachments": [
      {
        "id": "gg0e8400-e29b-41d4-a716-446655440010",
        "originalFilename": "screenshot.png",
        "storedFilename": "gg0e8400-e29b-41d4-a716-446655440010.png",
        "fileSize": 512000,
        "mimeType": "image/png",
        "isImage": true,
        "imageWidth": 1280,
        "imageHeight": 720
      }
    ]
  }
}
```

### 2. コメント更新

#### PATCH /api/v1/memos/:memoId/comments/:commentId

**リクエスト**:
```http
PATCH /api/v1/memos/550e8400-e29b-41d4-a716-446655440000/comments/ff0e8400-e29b-41d4-a716-446655440009
Authorization: Bearer <JWT_TOKEN>
X-Source-System: pms
X-Tenant-ID: <TENANT_UUID>
Content-Type: application/json

{
  "content": "更新されたコメント内容です。"
}
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "comment": {
      "id": "ff0e8400-e29b-41d4-a716-446655440009",
      "content": "更新されたコメント内容です。",
      "isEdited": true,
      "updatedAt": "2025-09-16T10:50:00Z",
      "updatedBy": "990e8400-e29b-41d4-a716-446655440004"
    }
  }
}
```

### 3. コメント削除

#### DELETE /api/v1/memos/:memoId/comments/:commentId

**リクエスト**:
```http
DELETE /api/v1/memos/550e8400-e29b-41d4-a716-446655440000/comments/ff0e8400-e29b-41d4-a716-446655440009
Authorization: Bearer <JWT_TOKEN>
X-Source-System: pms
X-Tenant-ID: <TENANT_UUID>
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "message": "Comment deleted successfully",
    "deletedAt": "2025-09-16T10:55:00Z",
    "deletedBy": "990e8400-e29b-41d4-a716-446655440004"
  }
}
```

## 📖 既読管理API

### 1. 既読処理

#### POST /api/v1/memos/read-status

**リクエスト**:
```http
POST /api/v1/memos/read-status
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
Content-Type: application/json

{
  "targetType": "memo",
  "targetId": "550e8400-e29b-41d4-a716-446655440000",
  "staffId": "770e8400-e29b-41d4-a716-446655440002",
  "readTimeSeconds": 120
}
```

**リクエストボディ**:
```typescript
interface MarkAsReadRequest {
  targetType: 'memo' | 'comment';
  targetId: string;                // UUID
  staffId?: string;               // 省略時は認証ユーザー
  readTimeSeconds?: number;       // 読み込み時間（秒）
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
    "staffId": "770e8400-e29b-41d4-a716-446655440002",
    "sourceSystem": "saas",
    "isRead": true,
    "readAt": "2025-09-16T11:00:00Z",
    "readCount": 4,
    "totalReadTimeSeconds": 300
  }
}
```

### 2. 一括既読処理

#### POST /api/v1/memos/read-status/batch

**リクエスト**:
```http
POST /api/v1/memos/read-status/batch
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
Content-Type: application/json

{
  "staffId": "770e8400-e29b-41d4-a716-446655440002",
  "items": [
    {
      "targetType": "memo",
      "targetId": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "targetType": "comment",
      "targetId": "aa0e8400-e29b-41d4-a716-446655440003"
    }
  ]
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
        "readAt": "2025-09-16T11:05:00Z"
      },
      {
        "targetType": "comment",
        "targetId": "aa0e8400-e29b-41d4-a716-446655440003",
        "success": true,
        "readAt": "2025-09-16T11:05:00Z"
      }
    ]
  }
}
```

### 3. 未読数取得

#### GET /api/v1/memos/unread-count

**リクエスト**:
```http
GET /api/v1/memos/unread-count?staffId=770e8400-e29b-41d4-a716-446655440002&includeDetails=true
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
```

**クエリパラメータ**:
```typescript
interface UnreadCountQuery {
  staffId?: string;               // 省略時は認証ユーザー
  includeDetails?: boolean;       // デフォルト: false
  sourceSystem?: 'saas' | 'pms'; // システム別フィルタ
}
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "staffId": "770e8400-e29b-41d4-a716-446655440002",
    "totalUnread": 15,
    "breakdown": {
      "memoUnread": 3,
      "commentUnread": 12
    },
    "systemBreakdown": {
      "saas": {
        "memoUnread": 2,
        "commentUnread": 8
      },
      "pms": {
        "memoUnread": 1,
        "commentUnread": 4
      }
    },
    "details": [
      {
        "memoId": "550e8400-e29b-41d4-a716-446655440000",
        "memoTitle": "フロント業務改善について",
        "unreadCount": 4,
        "breakdown": {
          "hasUnreadMemo": true,
          "unreadComments": 3
        },
        "sourceSystem": "saas",
        "priority": "high",
        "lastActivity": "2025-09-16T09:15:00Z"
      }
    ],
    "lastUpdated": "2025-09-16T11:10:00Z"
  }
}
```

## 📎 添付ファイル管理API

### 1. ファイルアップロード

#### POST /api/v1/memos/:memoId/attachments

**リクエスト**:
```http
POST /api/v1/memos/550e8400-e29b-41d4-a716-446655440000/attachments
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="file"; filename="document.pdf"
Content-Type: application/pdf

[binary file data]
--boundary
Content-Disposition: form-data; name="commentId"

aa0e8400-e29b-41d4-a716-446655440003
--boundary--
```

**レスポンス**:
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "attachment": {
      "id": "hh0e8400-e29b-41d4-a716-446655440011",
      "memoId": "550e8400-e29b-41d4-a716-446655440000",
      "commentId": "aa0e8400-e29b-41d4-a716-446655440003",
      "originalFilename": "document.pdf",
      "storedFilename": "hh0e8400-e29b-41d4-a716-446655440011.pdf",
      "filePath": "/uploads/memos/2025/09/hh0e8400-e29b-41d4-a716-446655440011.pdf",
      "fileSize": 3072000,
      "mimeType": "application/pdf",
      "fileHash": "sha256:abcd1234...",
      "isImage": false,
      "createdAt": "2025-09-16T11:15:00Z",
      "createdBy": "770e8400-e29b-41d4-a716-446655440002"
    }
  }
}
```

### 2. ファイルダウンロード

#### GET /api/v1/memos/attachments/:attachmentId/download

**リクエスト**:
```http
GET /api/v1/memos/attachments/hh0e8400-e29b-41d4-a716-446655440011/download
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="document.pdf"
Content-Length: 3072000

[binary file data]
```

### 3. ファイル削除

#### DELETE /api/v1/memos/attachments/:attachmentId

**リクエスト**:
```http
DELETE /api/v1/memos/attachments/hh0e8400-e29b-41d4-a716-446655440011
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "message": "Attachment deleted successfully",
    "deletedAt": "2025-09-16T11:20:00Z",
    "deletedBy": "770e8400-e29b-41d4-a716-446655440002"
  }
}
```

## 🔔 通知管理API

### 1. 通知一覧取得

#### GET /api/v1/memos/notifications

**リクエスト**:
```http
GET /api/v1/memos/notifications?page=1&pageSize=20&isRead=false
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
```

**クエリパラメータ**:
```typescript
interface NotificationListQuery {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
  notificationType?: 'memo_created' | 'memo_updated' | 'comment_added' | 'reply_added' | 'mention';
  dateFrom?: string;
  dateTo?: string;
}
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "ii0e8400-e29b-41d4-a716-446655440012",
        "memoId": "550e8400-e29b-41d4-a716-446655440000",
        "memoTitle": "フロント業務改善について",
        "commentId": "aa0e8400-e29b-41d4-a716-446655440003",
        "notificationType": "comment_added",
        "title": "新しいコメントが追加されました",
        "message": "佐藤花子さんがコメントを追加しました",
        "isRead": false,
        "isSent": true,
        "createdAt": "2025-09-16T10:45:00Z",
        "createdBy": "990e8400-e29b-41d4-a716-446655440004",
        "createdByName": "佐藤花子"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    },
    "summary": {
      "totalNotifications": 5,
      "unreadNotifications": 3
    }
  }
}
```

### 2. 通知既読処理

#### PATCH /api/v1/memos/notifications/:notificationId/read

**リクエスト**:
```http
PATCH /api/v1/memos/notifications/ii0e8400-e29b-41d4-a716-446655440012/read
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas
X-Tenant-ID: <TENANT_UUID>
```

**レスポンス**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "notificationId": "ii0e8400-e29b-41d4-a716-446655440012",
    "isRead": true,
    "readAt": "2025-09-16T11:25:00Z"
  }
}
```

## 🚨 エラーレスポンス

### 共通エラー形式

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
  };
}
```

### エラーコード一覧

| エラーコード | HTTPステータス | 説明 |
|-------------|---------------|------|
| `VALIDATION_ERROR` | 400 | リクエストデータの検証エラー |
| `INVALID_UUID` | 400 | 無効なUUID形式 |
| `MISSING_REQUIRED_FIELD` | 400 | 必須フィールドの不足 |
| `INVALID_SOURCE_SYSTEM` | 400 | 無効なソースシステム |
| `FILE_TOO_LARGE` | 400 | ファイルサイズ超過 |
| `UNSUPPORTED_FILE_TYPE` | 400 | サポートされていないファイル形式 |
| `UNAUTHORIZED` | 401 | 認証エラー |
| `INVALID_TOKEN` | 401 | 無効なJWTトークン |
| `TOKEN_EXPIRED` | 401 | JWTトークンの有効期限切れ |
| `FORBIDDEN` | 403 | 権限不足 |
| `TENANT_ACCESS_DENIED` | 403 | テナントアクセス拒否 |
| `MEMO_NOT_FOUND` | 404 | メモが存在しない |
| `COMMENT_NOT_FOUND` | 404 | コメントが存在しない |
| `ATTACHMENT_NOT_FOUND` | 404 | 添付ファイルが存在しない |
| `STAFF_NOT_FOUND` | 404 | スタッフが存在しない |
| `MEMO_ALREADY_DELETED` | 409 | メモが既に削除済み |
| `COMMENT_ALREADY_DELETED` | 409 | コメントが既に削除済み |
| `RATE_LIMIT_EXCEEDED` | 429 | レート制限超過 |
| `DATABASE_ERROR` | 500 | データベースエラー |
| `FILE_STORAGE_ERROR` | 500 | ファイルストレージエラー |
| `INTERNAL_SERVER_ERROR` | 500 | 内部サーバーエラー |

### エラーレスポンス例

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed for request data",
    "details": {
      "field": "title",
      "constraint": "length",
      "message": "Title must be between 1 and 200 characters",
      "value": ""
    },
    "timestamp": "2025-09-16T11:30:00Z",
    "requestId": "req_123456789",
    "path": "/api/v1/memos",
    "method": "POST"
  }
}
```

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "MEMO_NOT_FOUND",
    "message": "Memo with ID 550e8400-e29b-41d4-a716-446655440000 not found",
    "details": {
      "memoId": "550e8400-e29b-41d4-a716-446655440000",
      "tenantId": "660e8400-e29b-41d4-a716-446655440001"
    },
    "timestamp": "2025-09-16T11:30:00Z",
    "requestId": "req_123456790",
    "path": "/api/v1/memos/550e8400-e29b-41d4-a716-446655440000",
    "method": "GET"
  }
}
```

## 📊 レート制限

### API制限

| エンドポイント | 制限 | ウィンドウ |
|---------------|------|----------|
| `GET /api/v1/memos` | 60回/分 | 1分 |
| `POST /api/v1/memos` | 30回/分 | 1分 |
| `PATCH /api/v1/memos/:id` | 30回/分 | 1分 |
| `DELETE /api/v1/memos/:id` | 10回/分 | 1分 |
| `POST /api/v1/memos/:id/comments` | 60回/分 | 1分 |
| `POST /api/v1/memos/read-status` | 120回/分 | 1分 |
| `POST /api/v1/memos/read-status/batch` | 30回/分 | 1分 |
| `GET /api/v1/memos/unread-count` | 120回/分 | 1分 |
| `POST /api/v1/memos/:id/attachments` | 20回/分 | 1分 |

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
      "limit": 60,
      "window": "1 minute",
      "retryAfter": 60,
      "endpoint": "/api/v1/memos"
    },
    "timestamp": "2025-09-16T11:30:00Z",
    "requestId": "req_123456791"
  }
}
```

---

**ドキュメント更新履歴**:
- 2025年9月16日: 初版作成 - hotel-common詳細API仕様 (kaneko)
