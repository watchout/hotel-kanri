# 🔍 hotel-common API分析レポート

**分析日時**: 2025年8月18日

## **📊 現在の状況**

hotel-commonサーバーは稼働中ですが、必要なAPIエンドポイントが実装されていません。

### **✅ 利用可能なAPI**

```
GET /health
```

### **❌ 必要なAPI（未実装）**

```
POST /api/v1/auth/login
POST /api/v1/integration/validate-token
GET  /api/v1/admin/summary
GET  /api/v1/admin/devices/count
GET  /api/v1/orders/history
```

## **🔍 利用可能なエンドポイント一覧**

hotel-commonは以下のエンドポイントを提供していますが、hotel-saasが必要とする認証系・管理系・注文系のAPIは実装されていません：

```
GET /health
GET /api/systems/status
POST /api/systems/:systemName/test
GET /api/database/test
GET /api/tenants
POST /api/auth/validate
GET /api/stats
GET /api/hotel-member/integration/health
POST /api/hotel-member/hierarchy/auth/verify
POST /api/hotel-member/hierarchy/permissions/check-customer-access
POST /api/hotel-member/hierarchy/tenants/accessible
POST /api/hotel-member/hierarchy/permissions/check-membership-restrictions
POST /api/hotel-member/hierarchy/permissions/check-analytics-access
POST /api/hotel-member/hierarchy/user/permissions-detail
POST /api/hotel-member/hierarchy/permissions/batch-check
GET /api/hotel-member/hierarchy/health
GET /api/v1/campaigns/health
GET /api/v1/campaigns/active
GET /api/v1/campaigns/check
GET /api/v1/campaigns/by-category/:code
GET /api/v1/welcome-screen/config
GET /api/v1/welcome-screen/should-show
POST /api/v1/welcome-screen/mark-completed
GET /api/v1/admin/campaigns
POST /api/v1/admin/campaigns
GET /api/v1/admin/campaigns/:id
PUT /api/v1/admin/campaigns/:id
DELETE /api/v1/admin/campaigns/:id
GET /api/v1/admin/campaigns/:id/analytics
GET /api/v1/admin/campaigns/analytics/summary
POST /api/v1/reservations
GET /api/v1/reservations
GET /api/v1/reservations/:id
PUT /api/v1/reservations/:id
DELETE /api/v1/reservations/:id
POST /api/v1/reservations/:id/checkin
POST /api/v1/reservations/:id/checkout
GET /api/v1/reservations/stats
POST /api/v1/rooms
GET /api/v1/rooms
GET /api/v1/rooms/:id
PUT /api/v1/rooms/:id
DELETE /api/v1/rooms/:id
PATCH /api/v1/rooms/:id/status
GET /api/v1/rooms/by-number/:roomNumber
GET /api/v1/rooms/by-floor/:floorNumber
POST /api/v1/rooms/search-available
GET /api/v1/rooms/stats
POST /api/v1/room-grades
GET /api/v1/room-grades
GET /api/v1/room-grades/:id
PUT /api/v1/room-grades/:id
DELETE /api/v1/room-grades/:id
PATCH /api/v1/room-grades/:id/pricing
GET /api/v1/room-grades/by-code/:code
GET /api/v1/room-grades/active
GET /api/v1/room-grades/stats
PATCH /api/v1/room-grades/display-order
GET /api/apps/google-play
GET /api/apps/google-play/:id
POST /api/apps/google-play
PUT /api/apps/google-play/:id
PATCH /api/apps/google-play/:id/approve
GET /api/places/:placeId/apps
POST /api/places/:placeId/apps
PUT /api/places/:placeId/apps/:appId
DELETE /api/places/:placeId/apps/:appId
GET /api/layouts/:layoutId/blocks/:blockId/apps
PUT /api/layouts/:layoutId/blocks/:blockId/apps
GET /api/client/places/:placeId/apps
GET /api/v1/admin/pages
GET /api/v1/admin/pages/:slug
POST /api/v1/admin/pages/:slug
POST /api/v1/admin/pages/:slug/publish
GET /api/v1/admin/pages/:slug/history
GET /api/v1/admin/pages/:slug/history/:version
POST /api/v1/admin/pages/:slug/restore
GET /api/v1/pages/:slug
```

## **🚨 不足しているAPI**

hotel-commonには以下の重要なAPIが不足しています：

### **1. 認証系API（最優先）**
```
POST /api/v1/auth/login
POST /api/v1/integration/validate-token
GET  /api/v1/tenants/{id}
```

### **2. 管理系API（高優先度）**
```
GET /api/v1/admin/summary
GET /api/v1/admin/devices/count
GET /api/v1/admin/orders/monthly-count
```

### **3. 注文系API（高優先度）**
```
GET  /api/v1/orders/history
POST /api/v1/orders
GET  /api/v1/orders/active
GET  /api/v1/menus/top
```

## **🔄 対応方針**

1. **短期対応**：
   - hotel-saas側でダミーAPIを実装して一時的に対応
   - 既存のAPIを修正して、hotel-commonの現在のエンドポイント構造に合わせる

2. **中期対応**：
   - hotel-commonチームに必要なAPIの実装を依頼
   - 段階的に必要なAPIを追加してもらう

3. **長期対応**：
   - hotel-commonとhotel-saasのAPI統合を完了
   - すべての直接データベースアクセスをhotel-common API経由に変更

## **📋 次のアクション**

1. hotel-commonチームに不足APIの実装を依頼
2. 一時的なダミーAPIを実装して、アプリケーションの動作を確保
3. 優先度の高いAPIから段階的に復旧を進める

---

**作成者**: hotel-saasチーム
**更新日時**: 2025年8月18日
