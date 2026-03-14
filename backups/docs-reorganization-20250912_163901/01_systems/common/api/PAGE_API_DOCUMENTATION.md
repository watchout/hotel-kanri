# ページ管理API仕様書

本ドキュメントは、Page/PageHistoryモデルを使用したAPIエンドポイントの仕様と実装について説明します。

## 1. 管理者向けAPI

### 1.1 ページ取得 API

**エンドポイント**: `GET /api/v1/admin/pages/:slug`

**認証**: 管理者認証必須（`verifyAdminAuth`）

**パラメータ**:
- `slug`: ページ識別子（例: "top"）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "page-123",
    "title": "トップページ",
    "html": "<div>...</div>",
    "css": "body { ... }",
    "content": { "blocks": [...] },
    "template": "luxury-classic",
    "isPublished": true,
    "publishedAt": "2023-08-09T12:00:00Z",
    "version": 3
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "ページが見つかりません"
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

### 1.2 ページ保存 API

**エンドポイント**: `POST /api/v1/admin/pages/:slug`

**認証**: 管理者認証必須（`verifyAdminAuth`）

**パラメータ**:
- `slug`: ページ識別子（例: "top"）

**リクエストボディ**:
```json
{
  "title": "トップページ",
  "html": "<div>...</div>",
  "css": "body { ... }",
  "content": { "blocks": [...] },
  "template": "luxury-classic"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "page-123",
    "version": 4
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "保存に失敗しました"
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

### 1.3 ページ公開 API

**エンドポイント**: `POST /api/v1/admin/pages/:slug/publish`

**認証**: 管理者認証必須（`verifyAdminAuth`）

**パラメータ**:
- `slug`: ページ識別子（例: "top"）

**リクエストボディ**:
```json
{
  "id": "page-123"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "page-123",
    "isPublished": true,
    "publishedAt": "2023-08-09T12:00:00Z"
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "公開に失敗しました"
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

### 1.4 ページ履歴取得 API

**エンドポイント**: `GET /api/v1/admin/pages/:slug/history`

**認証**: 管理者認証必須（`verifyAdminAuth`）

**パラメータ**:
- `slug`: ページ識別子（例: "top"）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "current": {
      "id": "page-123",
      "version": 4,
      "updatedAt": "2023-08-09T12:00:00Z"
    },
    "history": [
      {
        "id": "history-789",
        "version": 3,
        "createdAt": "2023-08-08T15:30:00Z",
        "createdBy": "user-456"
      },
      {
        "id": "history-788",
        "version": 2,
        "createdAt": "2023-08-07T10:15:00Z",
        "createdBy": "user-789"
      }
    ]
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "履歴の取得に失敗しました"
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

### 1.5 特定バージョンの履歴取得 API

**エンドポイント**: `GET /api/v1/admin/pages/:slug/history/:version`

**認証**: 管理者認証必須（`verifyAdminAuth`）

**パラメータ**:
- `slug`: ページ識別子（例: "top"）
- `version`: バージョン番号（例: "3"）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "history-789",
    "html": "<div>...</div>",
    "css": "body { ... }",
    "content": { "blocks": [...] },
    "template": "luxury-classic",
    "version": 3,
    "createdAt": "2023-08-08T15:30:00Z",
    "createdBy": "user-456"
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "指定されたバージョンが見つかりません"
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

### 1.6 バージョン復元 API

**エンドポイント**: `POST /api/v1/admin/pages/:slug/restore`

**認証**: 管理者認証必須（`verifyAdminAuth`）

**パラメータ**:
- `slug`: ページ識別子（例: "top"）

**リクエストボディ**:
```json
{
  "version": 3
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "page-123",
    "version": 5
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "バージョンの復元に失敗しました"
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

## 2. 公開向けAPI

### 2.1 公開ページ取得 API

**エンドポイント**: `GET /api/v1/pages/:slug`

**認証**: 不要（公開API）

**ヘッダー**:
- `X-Tenant-ID`: テナントID（必須）

**パラメータ**:
- `slug`: ページ識別子（例: "top"）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "html": "<div>...</div>",
    "css": "body { ... }",
    "content": { "blocks": [...] },
    "template": "luxury-classic"
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "ページが見つかりません"
  },
  "timestamp": "2023-08-09T12:00:00Z",
  "request_id": "uuid"
}
```

## 3. 実装詳細

### 3.1 コントローラー構成

- `AdminPageController`: 管理者向けページ管理API
- `PublicPageController`: 公開向けページ取得API

### 3.2 サービス層

`PageService` クラスは以下の機能を提供します:

- `getPageBySlug`: テナントIDとスラグでページを取得
- `getPublishedPageBySlug`: 公開済みページをスラグで取得
- `savePage`: ページを保存（新規作成または更新）
- `publishPage`: ページを公開する
- `getPageHistory`: ページの履歴一覧を取得
- `getPageHistoryVersion`: 特定バージョンの履歴を取得
- `restorePageVersion`: 過去のバージョンを復元

### 3.3 ルーティング

ルート設定は `src/routes/page.routes.ts` で定義されています。

### 3.4 認証

管理者向けAPIには `verifyAdminAuth` ミドルウェアを使用して認証を行います。
公開向けAPIは認証不要ですが、テナントIDをヘッダーから取得します。

## 4. セキュリティ考慮事項

1. 管理者向けAPIはすべて`verifyAdminAuth`による認証を実施
2. テナントIDによるデータ分離を徹底
3. 公開APIは公開済みのページのみを返す
4. 入力値のバリデーションを実施
5. エラーメッセージは最小限の情報のみを返す

## 5. パフォーマンス考慮事項

1. インデックスを活用した高速クエリ
2. 大きなJSONデータの効率的な処理
3. 必要に応じてキャッシュを導入
4. 履歴データの定期的なアーカイブ

## 6. テスト方法

### 6.1 管理者向けAPI

```bash
# ページ取得
curl -X GET "http://localhost:3400/api/v1/admin/pages/top" \
  -H "Authorization: Bearer <管理者トークン>" \
  -H "Content-Type: application/json"

# ページ保存
curl -X POST "http://localhost:3400/api/v1/admin/pages/top" \
  -H "Authorization: Bearer <管理者トークン>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "トップページ",
    "html": "<div>テスト</div>",
    "css": "body { color: blue; }",
    "content": { "blocks": [] },
    "template": "default"
  }'

# ページ公開
curl -X POST "http://localhost:3400/api/v1/admin/pages/top/publish" \
  -H "Authorization: Bearer <管理者トークン>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "<ページID>"
  }'

# 履歴取得
curl -X GET "http://localhost:3400/api/v1/admin/pages/top/history" \
  -H "Authorization: Bearer <管理者トークン>" \
  -H "Content-Type: application/json"

# 特定バージョン取得
curl -X GET "http://localhost:3400/api/v1/admin/pages/top/history/1" \
  -H "Authorization: Bearer <管理者トークン>" \
  -H "Content-Type: application/json"

# バージョン復元
curl -X POST "http://localhost:3400/api/v1/admin/pages/top/restore" \
  -H "Authorization: Bearer <管理者トークン>" \
  -H "Content-Type: application/json" \
  -d '{
    "version": 1
  }'
```

### 6.2 公開向けAPI

```bash
# 公開ページ取得
curl -X GET "http://localhost:3400/api/v1/pages/top" \
  -H "X-Tenant-ID: <テナントID>" \
  -H "Content-Type: application/json"
```
