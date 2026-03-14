# SSOT-3: API Contract

**Doc-ID**: SSOT-3
**Version**: 1.0.1
**Created**: 2026-03-05
**Status**: Approved
**Source**: Consolidated from all legacy SSOTs containing API endpoint definitions

---

## §1 Conventions

### §1.1 Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:3100` (hotel-common) / `http://localhost:3000` (hotel-saas) |
| Production | Configured via `BASE_URL` environment variable |

### §1.2 API Versioning

- **Format**: `/api/v1/{resource}`
- **MUST**: 全エンドポイントに `/api/v1/` プレフィックスを使用すること。 **Accept**: `GET /api/v1/health` が 200 を返し、プレフィックスなしの `GET /health` が 404 を返すこと。

### §1.3 Authentication

| Route Pattern | Auth Method | Header/Cookie |
|---------------|-------------|---------------|
| `/api/v1/admin/**` | Session (Redis) | Cookie: `hotel-session-id` |
| `/api/v1/order/**` | Device Auth (MAC/IP) | Auto-resolved by middleware |
| `/api/v1/menu/**` | Device Auth (MAC/IP) | Auto-resolved by middleware |
| `/api/v1/super-admin/**` | Super Admin Session (2FA) | Cookie: `hotel-session-id` |
| `/api/v1/auth/**` | None (public) | N/A |

### §1.4 Response Format

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "total": 100,
    "page": 1,
    "perPage": 20
  }
}
```

### §1.5 Error Format

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Session expired"
  }
}
```

### §1.6 Naming Convention

- **MUST**: JSON レスポンスは `camelCase` を使用すること。 **Accept**: 全 API レスポンスの JSON キーが `/^[a-z][a-zA-Z0-9]*$/` に合致すること。
- **MUST**: URL パスは `kebab-case` を使用すること。 **Accept**: 全ルート定義のパスセグメントが `/^[a-z][a-z0-9-]*$/` に合致すること。
- **MUST**: Query パラメータは `camelCase` を使用すること。 **Accept**: 全 API の Query パラメータ名が `/^[a-z][a-zA-Z0-9]*$/` に合致すること。

---

## §2 Authentication APIs

### §2.1 Staff Login

| Method | Path | Feature |
|--------|------|---------|
| POST | `/api/v1/auth/login` | Staff login (email + password) |
| POST | `/api/v1/auth/logout` | Staff logout (clear session) |
| GET | `/api/v1/auth/session` | Get current session |
| PUT | `/api/v1/auth/switch-tenant` | Switch active tenant |

**POST /api/v1/auth/login**

Request:
```json
{
  "email": "staff@hotel.com",
  "password": "********"
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "userId": "staff-uuid",
    "tenantId": "tenant-uuid",
    "email": "staff@hotel.com",
    "name": "Staff Name",
    "role": "admin",
    "permissions": ["orders:read", "orders:write"]
  }
}
```

- **MUST**: ログイン成功時に `hotel-session-id` Cookie を設定すること。 **Accept**: ログイン成功レスポンスの `Set-Cookie` ヘッダーに `hotel-session-id` が 1 件含まれること。
- **MUST**: Redis に `hotel:session:{sessionId}` キーでセッションを保存すること。 **Accept**: ログイン後に `redis-cli GET hotel:session:{sessionId}` でセッション JSON が 1 件取得できること。
**MUST**: TTL は 3600 秒とすること。 **Accept**: `redis-cli TTL hotel:session:{sessionId}` が 3600 以下かつ 3500 以上の値を返すこと。

### §2.2 Super Admin Login

| Method | Path | Feature |
|--------|------|---------|
| POST | `/api/v1/super-admin/auth/login` | Super admin login (2FA required) |

**MUST**: Super Admin 認証はスタッフ認証と完全に分離すること。 **Accept**: スタッフセッション Cookie で `/api/v1/super-admin/**` にアクセスした場合 401 が返ること。

---

## §3 Admin APIs

### §3.1 Order Management (F-003)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/api/v1/admin/orders` | Implemented | Order list with filters |
| GET | `/api/v1/admin/orders/:id` | Implemented | Order detail |
| POST | `/api/v1/admin/orders` | Partial | Create order |
| PUT | `/api/v1/admin/orders/:id/status` | Implemented | Update order status |
| GET | `/api/v1/admin/front-desk/room-orders` | Implemented | Orders by room |

**MUST**: 全クエリに `tenant_id` フィルタを自動適用すること。 **Accept**: テナント A のセッションで `GET /api/v1/admin/orders` を実行した結果にテナント B のデータが含まれないこと。

WebSocket:
- **URL**: `ws://*/ws/orders`
- **Events**: `order:created`, `order:status_changed`, `order:completed`
- **MUST**: リアルタイム更新は WebSocket 経由で配信すること。 **Accept**: 注文ステータス変更後 2 秒以内に WebSocket クライアントが `order:status_changed` イベントを受信すること。

### §3.2 Menu Management (F-002)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/api/v1/admin/menu/items` | Implemented | Menu item list |
| POST | `/api/v1/admin/menu/items` | Partial | Create menu item |
| PUT | `/api/v1/admin/menu/items/:id` | Partial | Update menu item |
| DELETE | `/api/v1/admin/menu/items/:id` | Partial | Delete menu item |
| GET | `/api/v1/admin/menu/categories` | Implemented | Category list |
| POST | `/api/v1/admin/menu/categories` | Not Started | Create category |
| PUT | `/api/v1/admin/menu/categories/:id` | Not Started | Update category |
| DELETE | `/api/v1/admin/menu/categories/:id` | Not Started | Delete category |

### §3.3 Room Management (F-004)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/api/v1/admin/front-desk/rooms` | Implemented | Room list |
| GET | `/api/v1/admin/front-desk/rooms/:id` | Implemented | Room detail |
| POST | `/api/v1/admin/front-desk/rooms` | Not Started | Create room |
| PUT | `/api/v1/admin/front-desk/rooms/:id` | Partial | Update room |
| DELETE | `/api/v1/admin/front-desk/rooms/:id` | Not Started | Delete room |

### §3.4 Staff Management (F-006)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/staff` | Implemented | Staff list |
| GET | `/staff/:id` | Implemented | Staff detail |
| POST | `/staff` | Implemented | Invite staff (email) |
| POST | `/staff/:id/accept-invitation` | Implemented | Accept invitation |
| PUT | `/staff/:id` | Implemented | Update staff info |
| DELETE | `/staff/:id` | Implemented | Soft delete staff |
| POST | `/staff/:id/restore` | Implemented | Restore staff |
| POST | `/staff/assign-role` | Implemented | Assign role |

**Requirement IDs**: STAFF-001 through STAFF-020, STAFF-SEC-001 through STAFF-SEC-010

### §3.5 Permission System (C-006 / F-021)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/roles` | Implemented | Role list |
| GET | `/roles/:id` | Implemented | Role detail |
| POST | `/roles` | Implemented | Create role |
| PUT | `/roles/:id` | Implemented | Update role |
| DELETE | `/roles/:id` | Implemented | Delete role |
| PUT | `/roles/permissions` | Implemented | Save permissions |
| GET | `/permissions` | Implemented | List all permissions |

**Requirement IDs**: PERM-API-001 through PERM-API-007

### §3.6 Front Desk Operations (F-005)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| POST | `/api/v1/admin/front-desk/checkin` | Partial | Process check-in |
| POST | `/api/v1/admin/front-desk/checkout` | Partial | Process check-out |
| GET | `/api/v1/admin/front-desk/accounting` | Partial | Accounting records |
| GET | `/api/v1/admin/front-desk/room-notes` | Partial | Room notes |
| POST | `/api/v1/admin/front-desk/room-notes` | Partial | Create room note |

### §3.7 AI Concierge (F-008..F-012)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/api/v1/admin/system/ai-contexts` | Partial | AI usage contexts |
| POST | `/api/v1/admin/system/ai-contexts/:id` | Partial | Model assignment |
| GET | `/api/v1/admin/system/credit-markup` | Not Started | Credit markup settings |
| POST | `/api/v1/admin/system/credit-markup` | Not Started | Update credit markup |
| CRUD | `/api/v1/admin/ai/providers` | Not Started | Provider management |
| CRUD | `/api/v1/admin/ai/characters` | Partial | Character management |
| CRUD | `/api/v1/admin/ai/knowledge` | Partial | Knowledge base CRUD |
| POST | `/api/v1/admin/ai/knowledge/upload` | Partial | File upload for RAG |
| GET | `/api/v1/admin/ai/knowledge/search-test` | Partial | Vector search test |

### §3.8 Statistics (F-013..F-015)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/api/v1/admin/statistics/dashboard` | Partial | KPI dashboard |
| GET | `/api/v1/admin/statistics/products` | Partial | Product analysis |
| GET | `/api/v1/admin/statistics/rooms` | Not Started | Room analysis |
| GET | `/api/v1/admin/statistics/time-periods` | Not Started | Time-period analysis |
| GET | `/api/v1/admin/statistics/export` | Not Started | CSV export |

### §3.9 Settings (F-007)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/api/v1/admin/settings/*` | Partial | Get settings |
| PUT | `/api/v1/admin/settings/*` | Partial | Update settings |

### §3.10 System Logs (F-017)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/logs/audit` | Partial | Audit logs |
| GET | `/logs/auth` | Partial | Auth logs |
| GET | `/logs/ai` | Not Started | AI operation logs |
| GET | `/logs/integration` | Not Started | Integration logs |
| GET | `/logs/alerts` | Not Started | Anomaly alerts |

---

## §4 Guest APIs

### §4.1 Menu (G-003)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/api/v1/order/menu` | Implemented | Full menu (tags + items) |
| GET | `/api/v1/menu/categories` | Implemented | Category list |
| GET | `/api/v1/menu/recommended` | Implemented | Recommended items |
| GET | `/api/v1/menus/top` | Implemented | Rankings (week/month/year) |
| GET | `/api/v1/menus/search` | Not Started | Search by keyword (Phase 2) |
| GET | `/api/v1/menus/filter` | Not Started | Advanced filtering (Phase 2) |
| GET | `/api/v1/menus/trending` | Not Started | Trending items (Phase 2) |
| GET | `/api/v1/menus/:id/related` | Not Started | Related products (Phase 2) |

### §4.2 Order (G-002)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| POST | `/api/v1/order/place` | Implemented | Place order |
| GET | `/api/v1/orders/history` | Implemented | Order history |

WebSocket:
- **URL**: `ws://*/ws/orders`
- **Guest Events**: `order:status_changed` (filtered by session)

### §4.3 AI Chat (G-007)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| POST | `/api/v1/ai/chat` | Not Started | AI concierge chat (Phase 2) |

---

## §5 Device Management APIs

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/api/v1/admin/devices` | Implemented | Device list |
| POST | `/api/v1/admin/devices` | Implemented | Register device |
| PUT | `/api/v1/admin/devices/:id` | Partial | Update device |
| DELETE | `/api/v1/admin/devices/:id` | Partial | Remove device |

---

## §6 Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Session expired or invalid |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource conflict (duplicate) |
| 422 | VALIDATION_ERROR | Request validation failed |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Redis/DB connection failure |

**MUST**: 401 レスポンス時にフロントエンドはログイン画面にリダイレクトすること。 **Accept**: 期限切れセッションで API 呼出後、ブラウザ URL が `/login` に遷移すること。
**MUST**: 403 レスポンス時に権限不足メッセージを表示すること。 **Accept**: 権限のないエンドポイントにアクセス時、レスポンスボディに `"code":"FORBIDDEN"` が含まれ UI にエラーメッセージが表示されること。
**MUST**: Redis 接続失敗時は 503 を返却すること。 **Accept**: Redis を停止した状態で任意の認証付き API を呼出し、HTTP 503 と `"code":"SERVICE_UNAVAILABLE"` が返ること。

---

## §7 Rate Limiting

| Route Pattern | Limit | Window |
|---------------|-------|--------|
| `/api/v1/auth/login` | 5 requests | 15 minutes |
| `/api/v1/admin/**` | 100 requests | 1 minute |
| `/api/v1/order/**` | 30 requests | 1 minute |
| `/api/v1/ai/chat` | 10 requests | 1 minute |

---

## §8 Pagination

**MUST**: リスト API は以下のクエリパラメータをサポートすること。 **Accept**: `GET /api/v1/admin/orders?page=2&perPage=5&sortBy=createdAt&sortOrder=asc` が `meta.page=2`, `meta.perPage=5` を含むレスポンスを返し、結果が昇順ソートされていること。

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `perPage` | number | 20 | Items per page (max 100) |
| `sortBy` | string | `createdAt` | Sort field |
| `sortOrder` | string | `desc` | Sort direction (asc/desc) |

Response meta:
```json
{
  "meta": {
    "total": 250,
    "page": 1,
    "perPage": 20,
    "totalPages": 13
  }
}
```

---

## §9 References

| Document | Path |
|----------|------|
| Legacy API Registry | `docs/03_ssot/00_foundation/SSOT_GENERIC_RESOURCES_API.md` |
| Order Management | `docs/03_ssot/01_admin_features/SSOT_SAAS_ORDER_MANAGEMENT.md` |
| Menu Management | `docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md` |
| Staff Management | `docs/03_ssot/01_admin_features/SSOT_SAAS_STAFF_MANAGEMENT.md` |
| Permission System | `docs/03_ssot/01_admin_features/SSOT_SAAS_PERMISSION_SYSTEM.md` |
| Guest Order Flow | `docs/03_ssot/02_guest_features/SSOT_GUEST_ORDER_FLOW.md` |
| Guest Menu View | `docs/03_ssot/02_guest_features/SSOT_GUEST_MENU_VIEW.md` |

---

## §10 Reserved

(Section intentionally left empty for future use.)

---

## §11 Cross-SSOT References

| SSOT | Title | Relationship |
|------|-------|--------------|
| SSOT-0 | Master Index | API Contract はマスターインデックスから参照される |
| SSOT-1 | Data Model | API リクエスト/レスポンスのスキーマは Data Model に準拠する |
| SSOT-2 | Feature Catalog | 各エンドポイントの Feature ID (F-xxx, G-xxx) は Feature Catalog で定義される |
| SSOT-4 | Non-Functional Requirements | Rate Limiting, レスポンスタイム等の非機能要件は SSOT-4 で管理される |
| SSOT-5 | UI/UX Specification | フロントエンドの API 呼出パターンおよびエラー表示仕様は SSOT-5 に従う |

---

## §12 Test Cases

| ID | Section | Test Description | Expected Result |
|----|---------|-----------------|-----------------|
| TC-API-001 | §1.2 | `GET /api/v1/health` にリクエスト送信 | HTTP 200 が返る |
| TC-API-002 | §1.2 | `GET /health` (プレフィックスなし) にリクエスト送信 | HTTP 404 が返る |
| TC-API-003 | §1.6 | 任意の API レスポンス JSON キーを検証 | 全キーが `camelCase` である |
| TC-API-004 | §2.1 | 正しい認証情報で `POST /api/v1/auth/login` | HTTP 200、`Set-Cookie: hotel-session-id` が含まれる |
| TC-API-005 | §2.1 | ログイン後 Redis に `hotel:session:{id}` キーが存在するか確認 | キーが存在し TTL が 3500-3600 秒 |
| TC-API-006 | §2.2 | スタッフセッションで `GET /api/v1/super-admin/auth/login` にアクセス | HTTP 401 が返る |
| TC-API-007 | §3.1 | テナント A のセッションで orders API 呼出 | テナント B のデータが含まれない |
| TC-API-008 | §3.1 | 注文ステータス変更後 WebSocket イベント受信を確認 | 2 秒以内に `order:status_changed` を受信 |
| TC-API-009 | §6 | 期限切れセッションで API 呼出 | HTTP 401、フロントエンドが `/login` にリダイレクト |
| TC-API-010 | §6 | 権限のないエンドポイントにアクセス | HTTP 403、`"code":"FORBIDDEN"` を含むレスポンス |
| TC-API-011 | §6 | Redis 停止状態で認証付き API 呼出 | HTTP 503、`"code":"SERVICE_UNAVAILABLE"` を含むレスポンス |
| TC-API-012 | §8 | `GET /api/v1/admin/orders?page=2&perPage=5` を送信 | `meta.page=2`, `meta.perPage=5` のレスポンス |

---

## §13 Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-05 | Initial creation — 80+ endpoints consolidated from legacy SSOTs |
| 1.0.1 | 2026-03-05 | Add §11 Cross-SSOT References, §12 Test Cases; add Accept criteria to all requirements; replace placeholder values with concrete specs |
