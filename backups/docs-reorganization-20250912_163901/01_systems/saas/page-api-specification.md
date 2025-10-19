# ページ管理API仕様書

本ドキュメントは、Page/PageHistoryモデルを使用したAPIエンドポイントの仕様を定義します。

## 1. 管理者向けAPI

### 1.1 ページ取得 API

**エンドポイント**: `GET /api/v1/admin/pages/:slug`

**認証**: 管理者認証必須（`checkAdminAuth`）

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
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "message": "ページが見つかりません"
}
```

### 1.2 ページ保存 API

**エンドポイント**: `POST /api/v1/admin/pages/:slug`

**認証**: 管理者認証必須（`checkAdminAuth`）

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
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "message": "保存に失敗しました"
}
```

### 1.3 ページ公開 API

**エンドポイント**: `POST /api/v1/admin/pages/:slug/publish`

**認証**: 管理者認証必須（`checkAdminAuth`）

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
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "message": "公開に失敗しました"
}
```

### 1.4 ページ履歴取得 API

**エンドポイント**: `GET /api/v1/admin/pages/:slug/history`

**認証**: 管理者認証必須（`checkAdminAuth`）

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
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "message": "履歴の取得に失敗しました"
}
```

### 1.5 特定バージョンの履歴取得 API

**エンドポイント**: `GET /api/v1/admin/pages/:slug/history/:version`

**認証**: 管理者認証必須（`checkAdminAuth`）

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
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "message": "指定されたバージョンが見つかりません"
}
```

### 1.6 バージョン復元 API

**エンドポイント**: `POST /api/v1/admin/pages/:slug/restore`

**認証**: 管理者認証必須（`checkAdminAuth`）

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
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "message": "バージョンの復元に失敗しました"
}
```

## 2. 公開向けAPI

### 2.1 公開ページ取得 API

**エンドポイント**: `GET /api/v1/pages/:slug`

**認証**: 不要（公開API）

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
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "message": "ページが見つかりません"
}
```

## 3. 実装例

### 3.1 管理者向けページ取得API実装例

```typescript
// server/api/v1/admin/pages/[slug].ts
import { defineEventHandler, getRouterParam } from 'h3';
import { checkAdminAuth } from '~/server/utils/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const GET = defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = await checkAdminAuth(event);
    const tenantId = user.tenantId;

    // スラグを取得
    const slug = getRouterParam(event, 'slug');

    if (!slug) {
      return {
        success: false,
        message: 'スラグが必要です'
      };
    }

    // ページデータを取得
    const page = await prisma.page.findUnique({
      where: {
        tenantId_slug: {
          tenantId,
          slug
        }
      }
    });

    if (!page) {
      return {
        success: false,
        message: 'ページが見つかりません'
      };
    }

    // ページデータを返す
    return {
      success: true,
      data: {
        id: page.id,
        title: page.title,
        html: page.html,
        css: page.css,
        content: page.content ? JSON.parse(page.content) : { blocks: [] },
        template: page.template,
        isPublished: page.isPublished,
        publishedAt: page.publishedAt,
        version: page.version
      }
    };
  } catch (error) {
    console.error(`ページ取得エラー: ${error}`);
    return {
      success: false,
      message: 'サーバーエラー'
    };
  }
});
```

### 3.2 公開ページ取得API実装例

```typescript
// server/api/v1/pages/[slug].ts
import { defineEventHandler, getRouterParam } from 'h3';
import { getTenantIdFromRequest } from '~/server/utils/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const tenantId = getTenantIdFromRequest(event);
    const slug = getRouterParam(event, 'slug');

    if (!slug) {
      return {
        success: false,
        message: 'スラグが必要です'
      };
    }

    // 公開されているページのみを取得
    const page = await prisma.page.findFirst({
      where: {
        tenantId,
        slug,
        isPublished: true
      }
    });

    if (!page) {
      return {
        success: false,
        message: 'ページが見つかりません'
      };
    }

    return {
      success: true,
      data: {
        html: page.html,
        css: page.css,
        content: page.content ? JSON.parse(page.content) : { blocks: [] },
        template: page.template
      }
    };
  } catch (error) {
    console.error(`公開ページ取得エラー: ${error}`);
    return {
      success: false,
      message: 'サーバーエラー'
    };
  }
});
```

## 4. セキュリティ考慮事項

1. 管理者向けAPIはすべて`checkAdminAuth`による認証を実施
2. テナントIDによるデータ分離を徹底
3. 公開APIは公開済みのページのみを返す
4. 入力値のバリデーションを実施
5. エラーメッセージは最小限の情報のみを返す

## 5. パフォーマンス考慮事項

1. インデックスを活用した高速クエリ
2. 大きなJSONデータの効率的な処理
3. 必要に応じてキャッシュを導入
4. 履歴データの定期的なアーカイブ
