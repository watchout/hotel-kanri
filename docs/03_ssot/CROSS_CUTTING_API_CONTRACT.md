# CROSS_CUTTING_API_CONTRACT.md - リポジトリ横断API契約

**バージョン**: 1.0.0
**最終更新**: 2026-02-05
**ステータス**: [CONTRACT]

---

## Overview

このドキュメントは、hotel-common-rebuild と hotel-saas-rebuild 間の **API契約** を定義します。
両リポジトリで共通認識が必要な仕様をここに集約します。

**出典**: `docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md`

---

## Architecture

```
┌─────────────────────────┐         ┌─────────────────────────┐
│  hotel-saas-rebuild     │  HTTP   │  hotel-common-rebuild   │
│  (Nuxt 3 Frontend)      │ ──────> │  (Express API Server)   │
│  Port: 3101             │         │  Port: 3401             │
│                         │         │                         │
│  server/api/v1/**       │ Proxy   │  src/routes/**          │
│  (Nitro API Routes)     │ ──────> │  (Express Routers)      │
└─────────────────────────┘         └─────────────────────────┘
```

---

## [CONTRACT] Authentication (認証)

### Session認証 (Admin API)

| 項目 | 仕様 |
|------|------|
| 方式 | Cookie-based Session |
| Cookie名 | `hotel_admin_session` |
| 有効期限 | 24時間 |
| セキュリティ | `HttpOnly`, `Secure`, `SameSite=Strict` |

### デバイス認証 (Guest API)

| 項目 | 仕様 |
|------|------|
| 方式 | Device Token Header |
| Header名 | `X-Device-Token` |
| トークン形式 | UUID v4 |

---

## [CONTRACT] API Endpoints

### Admin Auth API (`/api/v1/admin/auth`)

| Method | Path | Request | Response | 状態 |
|--------|------|---------|----------|------|
| POST | `/login` | `{ email, password }` | `{ user, session }` | 実装済 |
| POST | `/logout` | - | `{ success }` | 実装済 |
| GET | `/session` | - | `{ user, tenant }` | 実装済 |

### Admin Tenants API (`/api/v1/admin/tenants`)

| Method | Path | Request | Response | 状態 |
|--------|------|---------|----------|------|
| GET | `/` | `?page&limit` | `{ data[], total }` | 実装済 |
| POST | `/` | `{ name, ... }` | `{ id, ... }` | 実装済 |
| GET | `/:id` | - | `{ id, ... }` | 実装済 |
| PATCH | `/:id` | `{ name?, ... }` | `{ id, ... }` | 実装済 |
| DELETE | `/:id` | - | `{ success }` | 実装済 |

### Admin Room Grades API (`/api/v1/admin/room-grades`)

| Method | Path | Request | Response | 状態 |
|--------|------|---------|----------|------|
| GET | `/` | `?page&limit` | `{ data[], total }` | 実装済 |
| POST | `/` | `{ name, ... }` | `{ id, ... }` | 実装済 |
| GET | `/:id` | - | `{ id, ... }` | 実装済 |
| PATCH | `/:id` | `{ name?, ... }` | `{ id, ... }` | 実装済 |
| DELETE | `/:id` | - | `{ success }` | 実装済 |

### Admin Menu API (`/api/v1/admin/menu`)

| Method | Path | Request | Response | 状態 |
|--------|------|---------|----------|------|
| GET | `/items` | `?page&limit&category` | `{ data[], total }` | 実装済 |
| GET | `/items/:id` | - | `{ id, ... }` | 実装済 |
| PUT | `/items/:id` | `{ name, price, ... }` | `{ id, ... }` | 実装済 |

### Admin Entitlements API (`/api/v1/admin/entitlements`)

| Method | Path | Request | Response | 状態 |
|--------|------|---------|----------|------|
| GET | `/` | - | `{ plan, features[] }` | **未実装** |
| GET | `/check/:featureCode` | - | `{ allowed, reason }` | **未実装** |
| POST | `/consume-credit` | `{ amount, operation }` | `{ remaining }` | **未実装** |

### Guest Menus API (`/api/v1/guest/menus`)

| Method | Path | Request | Response | 状態 |
|--------|------|---------|----------|------|
| GET | `/` | `?category&lang` | `{ data[] }` | 実装済 |
| GET | `/:id` | - | `{ id, ... }` | 実装済 |

### Guest Orders API (`/api/v1/guest/orders`)

| Method | Path | Request | Response | 状態 |
|--------|------|---------|----------|------|
| GET | `/active` | - | `{ orders[] }` | 実装済 |
| POST | `/` | `{ items[], ... }` | `{ orderId }` | 実装済 |

### AI Chat API (`/api/v1/ai/chat`)

| Method | Path | Request | Response | 状態 |
|--------|------|---------|----------|------|
| POST | `/` | `{ message, sessionId }` | `{ reply, actions[] }` | 実装済 |

**Actions形式**:
```typescript
interface ChatAction {
  type: 'deeplink' | 'handoff' | 'info';
  payload: {
    url?: string;      // deeplink時
    menuId?: string;   // メニュー誘導時
    phone?: string;    // handoff時
  };
}
```

---

## [CONTRACT] Error Response Format

すべてのAPIは以下の形式でエラーを返します：

```typescript
interface ErrorResponse {
  error: {
    code: string;      // "AUTH_REQUIRED", "NOT_FOUND", etc.
    message: string;   // Human-readable message
    details?: object;  // Optional additional info
  };
}
```

### Standard Error Codes

| Code | HTTP Status | 説明 |
|------|-------------|------|
| `AUTH_REQUIRED` | 401 | 認証が必要 |
| `AUTH_INVALID` | 401 | 認証情報が無効 |
| `FORBIDDEN` | 403 | 権限不足 |
| `NOT_FOUND` | 404 | リソースが存在しない |
| `VALIDATION_ERROR` | 400 | 入力値が不正 |
| `INTERNAL_ERROR` | 500 | サーバーエラー |

---

## [CONTRACT] Pagination Format

ページネーション対応のAPIは以下の形式を使用：

**Request Query Parameters**:
```
?page=1&limit=20&sort=createdAt&order=desc
```

**Response Format**:
```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

---

## [CONTRACT] Multi-tenant Headers

マルチテナントAPIでは以下のヘッダーを使用：

| Header | 説明 | 必須 |
|--------|------|------|
| `X-Tenant-ID` | 操作対象テナントID | Admin APIで必須 |

**注意**: Session認証の場合、セッションに紐づくテナントIDが使用されます。
ヘッダーは明示的なテナント切替時のみ使用。

---

## [CONTRACT] WebSocket Events (Future)

将来のリアルタイム通知用：

| Event | Direction | Payload | 用途 |
|-------|-----------|---------|------|
| `order:created` | Server→Client | `{ orderId, ... }` | 新規注文通知 |
| `order:updated` | Server→Client | `{ orderId, status }` | 注文ステータス更新 |
| `handoff:requested` | Server→Client | `{ requestId, ... }` | ハンドオフリクエスト |

---

## Implementation Checklist

### hotel-common-rebuild

```typescript
// src/server/index.ts でのルーター登録順序

// 1. 認証不要ルート
app.use('/api/v1/admin/auth', authRouter);
app.use('/api/v1/guest/menus', guestMenusRouter);
app.use('/api/v1/guest/orders', guestOrdersRouter);
app.use('/api/v1/guest/categories', guestCategoriesRouter);
app.use('/api/v1/ai/chat', aiChatRouter);

// 2. 認証ミドルウェア
app.use(authMiddleware);

// 3. 認証必須ルート
app.use('/api/v1/admin/switch-tenant', switchTenantRouter);
app.use('/api/v1/admin/tenants', tenantsRouter);
app.use('/api/v1/admin/room-grades', roomGradesRouter);
app.use('/api/v1/admin/menu', menuRouter);
app.use('/api/v1/admin/entitlements', entitlementsRouter); // 未実装
```

### hotel-saas-rebuild

```
server/api/v1/
├── admin/
│   ├── auth/
│   │   ├── login.post.ts
│   │   ├── logout.post.ts
│   │   └── session.get.ts
│   ├── tenants/
│   │   ├── index.get.ts
│   │   ├── index.post.ts
│   │   └── [id].*.ts
│   ├── room-grades/
│   ├── menu/
│   └── entitlements/        # 未実装
└── guest/
    ├── menus/
    ├── orders/
    └── categories/
```

---

## Related Documents

- [CLAUDE.md](../../CLAUDE.md) - フレームワークエントリポイント
- [DECISION_BACKLOG.md](./DECISION_BACKLOG.md) - 未決定事項
- [SSOT_API_REGISTRY.md](./00_foundation/SSOT_API_REGISTRY.md) - 詳細API仕様
