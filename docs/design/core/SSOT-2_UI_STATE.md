# SSOT-2: UI / State Transitions

**Doc-ID**: SSOT-2
**Version**: 1.0.1
**Created**: 2026-03-05
**Status**: Approved
**Source**: Consolidated from SSOT_ADMIN_UI_DESIGN.md, SSOT_GUEST_ROOM_SERVICE_UI.md, SSOT_GUEST_ORDER_FLOW.md, SSOT_GUEST_MENU_VIEW.md, SSOT_GUEST_DEVICE_APP.md

---

## §1 Design System

### §1.1 Admin Theme

| Token | Value | Usage |
|-------|-------|-------|
| Primary | Tailwind default (blue-600) | Actions, links |
| Background | white / gray-50 | Page background |
| Sidebar | gray-900 | Navigation |
| Typography | System font stack | All text |
| Border Radius | 8px (rounded-lg) | Cards, buttons |

### §1.2 Guest Theme (Luxury)

| Token | Value | Usage |
|-------|-------|-------|
| Gold | #D4AF37 | Accent, highlights |
| Dark Gray | #1a1a1a | Background |
| Bronze | #8B7355 | Secondary accent |
| Font Size | 20-24px+ minimum | TV-optimized (10ft) |
| Touch Target | 80-120px minimum | Remote control optimized |
| Resolution | 1920x1080 Full HD | Google TV target |

### §1.3 Shared Conventions

- **MUST**: 管理画面は Tailwind CSS utility-first で構築すること。 **Accept**: 管理画面の全 `.vue` ファイルにおいてインラインスタイルが 0 件であり、`class` 属性に Tailwind ユーティリティクラスのみ使用されていること。
- **MUST**: ゲスト UI は 10-foot viewing distance を前提に設計すること。 **Accept**: ゲスト画面の本文フォントサイズが 20px 以上、見出しが 24px 以上であることを CSS 検査で確認できること。
- **MUST**: ゲスト端末はリモコン操作に最適化すること（フォーカス管理必須）。 **Accept**: 全インタラクティブ要素の 100% に `:focus-visible` スタイルが適用され、Tab/Arrow キーのみで全操作が完了できること。

---

## §2 Admin Screen Map

### §2.1 Page Inventory

| Route | Page | Feature ID | Status |
|-------|------|-----------|--------|
| `/admin/login` | Login | C-002 | Implemented |
| `/admin/dashboard` | Dashboard | F-001 | Implemented |
| `/admin/orders` | Order List | F-003 | Implemented |
| `/admin/orders/kitchen` | Kitchen View | F-003 | Implemented |
| `/admin/orders/delivery` | Delivery View | F-003 | Partial |
| `/admin/menu` | Menu List | F-002 | Implemented |
| `/admin/menu/categories` | Category Management | F-002 | Partial |
| `/admin/rooms` | Room List | F-004 | Partial |
| `/admin/rooms/:id` | Room Detail | F-004 | Partial |
| `/admin/front-desk` | Front Desk Dashboard | F-005 | Partial |
| `/admin/front-desk/checkin` | Check-in | F-005 | Partial |
| `/admin/front-desk/checkout` | Check-out | F-005 | Partial |
| `/admin/staff` | Staff List | F-006 | Implemented |
| `/admin/staff/:id` | Staff Detail | F-006 | Implemented |
| `/admin/staff/invite` | Staff Invitation | F-006 | Implemented |
| `/admin/settings` | Basic Settings | F-007 | Partial |
| `/admin/settings/roles` | Role Management | F-021 | Partial |
| `/admin/ai/overview` | AI Concierge Overview | F-008 | Partial |
| `/admin/ai/knowledge` | Knowledge Base | F-009 | Partial |
| `/admin/ai/providers` | AI Provider Settings | F-010 | Not Started |
| `/admin/ai/character` | AI Character | F-011 | Partial |
| `/admin/statistics` | Statistics Dashboard | F-013 | Partial |
| `/admin/statistics/products` | Product Analysis | F-013 | Partial |
| `/admin/statistics/rooms` | Room Analysis | F-013 | Not Started |
| `/admin/ui-design` | Layout Editor | F-016 | Partial |
| `/admin/logs` | System Logs | F-017 | Partial |
| `/admin/billing` | Billing Management | F-018 | Not Started |
| `/super-admin` | Super Admin Dashboard | F-019 | Not Started |

### §2.2 Admin Navigation Structure

```
Sidebar Navigation
├── Dashboard (/admin/dashboard)
├── Orders
│   ├── Order List (/admin/orders)
│   ├── Kitchen View (/admin/orders/kitchen)
│   └── Delivery View (/admin/orders/delivery)
├── Menu Management (/admin/menu)
│   └── Categories (/admin/menu/categories)
├── Front Desk
│   ├── Dashboard (/admin/front-desk)
│   ├── Check-in (/admin/front-desk/checkin)
│   └── Check-out (/admin/front-desk/checkout)
├── Room Management (/admin/rooms)
├── AI Concierge
│   ├── Overview (/admin/ai/overview)
│   ├── Knowledge Base (/admin/ai/knowledge)
│   ├── Providers (/admin/ai/providers)
│   └── Character (/admin/ai/character)
├── Statistics (/admin/statistics)
├── UI Design (/admin/ui-design)
├── Staff Management (/admin/staff)
├── Settings (/admin/settings)
│   └── Roles (/admin/settings/roles)
├── System Logs (/admin/logs)
└── Billing (/admin/billing)
```

---

## §3 Guest Screen Map

### §3.1 Page Inventory

| Route | Page | Feature ID | Status |
|-------|------|-----------|--------|
| `/` | Home / Top Page | G-001 | Implemented |
| `/menu/index` | Menu Top (Carousel) | G-003 | 85% |
| `/menu/category/[id]` | Category Detail | G-003 | 90% |
| `/order` | Order Menu List | G-002 | Implemented |
| `/order/cart` | Cart / Confirmation | G-002 | Implemented |
| `/order/complete` | Order Complete | G-002 | Implemented |
| `/order/history` | Order History | G-002 | Implemented |
| `/receipt/[orderId]` | Receipt | G-001 | Implemented |
| `/tv/concierge` | AI Concierge | G-007 | Not Started |
| `/tv/settings` | Device Settings | G-004 | Partial |

### §3.2 Guest Navigation Structure

```
Home Page (/)
├── Footer Service Buttons (5 buttons)
│   ├── Room Service → /order
│   ├── Info → /info (planned)
│   ├── Facilities → /facilities (planned)
│   ├── Tourism → /tourism (planned)
│   └── WiFi → /wifi (planned)
├── Menu Browse → /menu/index
│   └── Category → /menu/category/[id]
├── AI Concierge → /tv/concierge (planned)
├── Campaign Banners (inline)
└── Language Toggle (JP/EN)
```

### §3.3 Guest Key Components

| Component | File | Feature | Status |
|-----------|------|---------|--------|
| CategoryTabs | `CategoryTabs.vue` | 3-level category tabs | 95% |
| MenuCard | `MenuCard.vue` | Product card with hover | 100% |
| AvailabilityMask | `AvailabilityMask.vue` | Time-based availability | 100% |
| GachaMenuCard | `GachaMenuCard.vue` | Daily lucky menu | 100% |
| OrderStepTracker | `OrderStepTracker.vue` | 5-step progress | 100% |
| OrderStatusBadge | `OrderStatusBadge.vue` | Status badge | 100% |
| UpsellModal | `UpsellModal.vue` | Related products (max 3) | 100% |
| CartItem | `CartItem.vue` | Cart item management | 100% |
| SortTabs | `SortTabs.vue` | Period selection tabs | 100% |
| LuxuryCard | `LuxuryCard.vue` | Luxury styled card | 100% |
| LuxuryButton | `LuxuryButton.vue` | Luxury styled button | 100% |

---

## §4 State Transitions

### §4.1 Admin Authentication State

```
[Not Authenticated]
    │
    ├── POST /api/v1/auth/login (email + password)
    │   ├── Success → [Authenticated] → Redirect /admin/dashboard
    │   └── Failure → [Not Authenticated] → Show error
    │
[Authenticated]
    │
    ├── Session valid (Redis TTL < 3600s)
    │   └── Continue browsing
    ├── Session expired
    │   └── Redirect → /admin/login
    ├── POST /api/v1/auth/logout
    │   └── [Not Authenticated] → Redirect /admin/login
    └── Tenant switch (multi-tenant staff)
        └── PUT /api/v1/auth/switch-tenant
            └── [Authenticated] with new tenant context
```

### §4.2 Device Authentication State

```
[Device Access]
    │
    ├── middleware/01-device-auth.ts
    │   ├── MAC/IP lookup in device_rooms table
    │   │   ├── Found → [Authenticated Device]
    │   │   │   ├── Active checkin_session → [Room Context Set]
    │   │   │   └── No session → [Device Only] (limited access)
    │   │   └── Not Found → [Unregistered Device]
    │   │       └── Redirect → /device/unregistered
    │   └── Error → 503 Service Unavailable
```

### §4.3 Order Lifecycle State

```
[received] ──► [preparing] ──► [ready] ──► [delivering] ──► [delivered] ──► [completed]
    │              │              │              │                              │
    └── [cancelled] (from received/preparing only)                      [archived to order_logs]
```

- **MUST**: `received` → `preparing` のみスタッフが手動遷移。 **Accept**: `received` 以外のステータスから `preparing` への遷移 API 呼出しが 403 を返すこと。
- **MUST**: `completed` → `order_logs` への移行は 24 時間後に自動実行。 **Accept**: `completed` 設定から 24h ± 5min 以内に `order_logs` レコードが作成され、元レコードがソフトデリートされていること。
- **MUST**: WebSocket でリアルタイムにステータス変更を通知すること。 **Accept**: ステータス変更イベント発火から 2 秒以内にクライアント側で `order:status_changed` メッセージを受信できること。

### §4.4 Staff Lifecycle State

```
[invited] ──► [active] ──► [inactive] ──► [deleted (soft)]
    │                          │               │
    │                          └── [active] (restore)
    └── [expired] (7 days)         └── [active] (restore)
```

### §4.5 Check-in Session State

```
[no_session]
    │
    ├── Front desk check-in
    │   └── [checked_in] → Device gets room context
    │
[checked_in]
    │
    ├── Guest orders (linked to session)
    ├── Front desk check-out
    │   └── [checked_out] → Billing → [settled]
    │
[settled]
    └── Session archived to checkout_logs
```

---

## §5 Middleware Chain

### §5.1 Admin Routes (`/admin/**`)

```
Request
  → 01-auth-check.ts (Redis session validation)
  → 02-tenant-context.ts (tenant_id resolution)
  → 03-permission-check.ts (RBAC validation)
  → Route Handler
```

- **MUST**: 全 admin ルートでこの順序を維持すること。 **Accept**: ミドルウェアチェーン統合テストで 3 段階（auth-check → tenant-context → permission-check）の実行順序がログ出力で確認できること。

### §5.2 Guest Routes (`/`, `/menu/**`, `/order/**`)

```
Request
  → 01-device-auth.ts (MAC/IP device lookup)
  → 02-session-context.ts (checkin_session resolution)
  → Route Handler
```

- **MUST**: デバイス認証は管理画面認証と完全に独立していること。 **Accept**: Admin セッション Cookie を持たないデバイスリクエストがゲスト画面に 200 で正常アクセスでき、デバイストークンを持たない管理者リクエストが管理画面に正常アクセスできること。

---

## §6 Layout System (Admin UI Design)

### §6.1 Page Types

| Type | Description | Customizable |
|------|-------------|-------------|
| TOP | ゲストホーム画面 | Yes (layout editor) |
| ROOM_SERVICE | ルームサービスメニュー | Yes |
| FACILITIES | 館内施設案内 | Yes |
| TOURISM | 観光情報 | Yes |
| SURVEY | アンケート | Yes |
| WIFI | WiFi 接続情報 | Yes |
| NEWS_LIST | お知らせ一覧 | Yes |
| NEWS_DETAIL | お知らせ詳細 | Yes |
| CUSTOM | カスタムページ | Yes |

### §6.2 Widget System

- Layout Editor でドラッグ&ドロップ配置
- テンプレート管理（プリセットレイアウト）
- バージョン管理（変更履歴・リストア）
- スケジュール管理（時間帯別表示）
- デバイス別プレビュー

**Tables**: `page_layouts`, `page_templates`, `page_versions`, `page_widgets`, `page_schedules`

---

## §7 Responsive / Device Strategy

| Device | Resolution | Target | UI Approach |
|--------|-----------|--------|-------------|
| Google TV | 1920x1080 | Guest | 10ft UI, remote control |
| Android Tablet | 1280x800+ | Guest | Touch optimized |
| Desktop Browser | 1366x768+ | Admin | Standard responsive |
| Mobile Browser | 375x667+ | Admin (limited) | Responsive sidebar |

**MUST**: ゲスト端末は横向き (landscape) 固定とすること。 **Accept**: ゲストアプリの `AndroidManifest.xml` で `screenOrientation="landscape"` が設定され、CSS メディアクエリ `orientation: portrait` のスタイルが 0 件であること。
**MUST**: 管理画面はデスクトップファーストで設計すること。 **Accept**: 管理画面の全ページが 1366x768 ビューポートで水平スクロールなしに表示され、Lighthouse アクセシビリティスコアが 90 以上であること。

---

## §8 Internationalization (UI)

| Aspect | Current | Target |
|--------|---------|--------|
| Admin UI | Japanese only | Japanese + English (Phase 3) |
| Guest UI | Japanese + English toggle | 15 languages (Phase 3) |
| Content | `name_ja`, `name_en` columns | `translations` table (unified) |
| Direction | LTR only | LTR + RTL (Phase 3 for Arabic) |

---

## §9 References

| Document | Path |
|----------|------|
| Admin UI Design | `docs/03_ssot/01_admin_features/SSOT_ADMIN_UI_DESIGN.md` |
| Guest Room Service UI | `docs/03_ssot/02_guest_features/SSOT_GUEST_ROOM_SERVICE_UI.md` |
| Guest Order Flow | `docs/03_ssot/02_guest_features/SSOT_GUEST_ORDER_FLOW.md` |
| Guest Menu View | `docs/03_ssot/02_guest_features/SSOT_GUEST_MENU_VIEW.md` |
| Guest Device App | `docs/03_ssot/02_guest_features/SSOT_GUEST_DEVICE_APP.md` |
| UI Design Principles | `docs/03_ssot/00_foundation/SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md` |

---

## §10 Test Cases

### §10.1 Normal Cases

| ID | Scenario | Pre-condition | Action | Expected Result |
|----|----------|---------------|--------|-----------------|
| TC-N-001 | Order status: received → preparing | Order exists in `received` status | Staff clicks "調理開始" button | Status changes to `preparing`; WebSocket event `order:status_changed` emitted within 2s |
| TC-N-002 | Order status: preparing → ready | Order in `preparing` status | Staff clicks "調理完了" button | Status changes to `ready`; notification sent to delivery staff |
| TC-N-003 | Order status: delivered → completed | Order in `delivered` status | Staff clicks "完了" button | Status changes to `completed`; 24h archival timer starts |
| TC-N-004 | Admin login success | Valid email + password | POST `/api/v1/auth/login` | 200 response; Redis session created with TTL 3600s; redirect to `/admin/dashboard` |
| TC-N-005 | Device authentication | Registered device MAC/IP | GET `/` from device | Device context resolved; room context set if active checkin session exists |
| TC-N-006 | Check-in session start | Room exists, no active session | Front desk initiates check-in | `checked_in` session created; device gets room context |
| TC-N-007 | Check-out and billing | Active `checked_in` session | Front desk initiates check-out | Session transitions to `checked_out` → `settled`; archived to `checkout_logs` |
| TC-N-008 | Guest order flow | Device authenticated with room context | Guest selects item → cart → confirm | Order created in `received` status linked to checkin session |

### §10.2 Abnormal Cases

| ID | Scenario | Pre-condition | Action | Expected Result |
|----|----------|---------------|--------|-----------------|
| TC-A-001 | Invalid status transition | Order in `ready` status | Attempt transition to `received` | 403 Forbidden; status unchanged |
| TC-A-002 | Cancel from invalid state | Order in `delivered` status | Attempt cancel | 403 Forbidden; only `received`/`preparing` allow cancel |
| TC-A-003 | Admin login failure | Invalid credentials | POST `/api/v1/auth/login` | 401 response; no session created; error message displayed |
| TC-A-004 | Expired admin session | Session TTL exceeded | Any admin route request | Redirect to `/admin/login`; session cleared from Redis |
| TC-A-005 | Unregistered device access | Unknown MAC/IP | GET `/` from unregistered device | Redirect to `/device/unregistered` |
| TC-A-006 | Device auth service error | Database unreachable | GET `/` from any device | 503 Service Unavailable returned |
| TC-A-007 | Middleware order violation | Permission check before auth | Direct route handler access | Request rejected at first missing middleware step |

### §10.3 Boundary Cases

| ID | Scenario | Pre-condition | Action | Expected Result |
|----|----------|---------------|--------|-----------------|
| TC-B-001 | Session TTL boundary | Session at exactly 3600s | Request at TTL = 3600s | Session still valid; next request after TTL expires triggers redirect |
| TC-B-002 | Archival timing boundary | Order `completed` at T | Check at T + 24h ± 5min | `order_logs` record exists; original record soft-deleted |
| TC-B-003 | Staff invitation expiry | Invitation sent 7 days ago | Accept invitation at day 7 + 1s | Invitation status is `expired`; acceptance fails with error message |
| TC-B-004 | Minimum font size (guest) | Guest UI page loaded | Inspect computed font size | All body text >= 20px; all headings >= 24px |
| TC-B-005 | Minimum touch target (guest) | Guest UI interactive elements | Measure element dimensions | All touch targets >= 80px in both width and height |
| TC-B-006 | Minimum viewport (admin) | Admin page at 1366x768 | Check horizontal overflow | No horizontal scrollbar; all content visible without horizontal scroll |

---

## §11 Cross-SSOT References

| SSOT Document | Doc-ID | Relationship |
|---------------|--------|-------------|
| Foundation & Principles | SSOT-0 | UI state transitions follow architectural principles defined in SSOT-0 |
| Database Schema | SSOT-1 | State fields (`order_status`, `staff_status`, `session_status`) map to SSOT-1 enum columns |
| API Endpoints | SSOT-3 | State transition triggers correspond to API endpoints defined in SSOT-3 |
| Security & RBAC | SSOT-4 | Middleware chain (§5) enforces RBAC rules defined in SSOT-4 |
| Infrastructure & Deployment | SSOT-5 | Redis session store and WebSocket infrastructure depend on SSOT-5 topology |

---

## §12 Glossary

| Term | Definition |
|------|-----------|
| 10ft UI | TV 向けに 3m 以上の視聴距離を前提とした UI 設計手法 |
| RBAC | Role-Based Access Control; ロールに基づくアクセス制御 |
| TTL | Time To Live; セッションやキャッシュの有効期限 |
| Soft Delete | レコードを物理削除せず `deleted_at` タイムスタンプで論理削除する方式 |

---

## §13 Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.1 | 2026-03-05 | Add Accept criteria to all MUST requirements; add §10 Test Cases, §11 Cross-SSOT References, §12 Glossary; renumber sections |
| 1.0.0 | 2026-03-05 | Initial creation from legacy UI/UX SSOTs |
