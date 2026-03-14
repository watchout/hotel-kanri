# hotel-saas 実装済みAPI完全一覧

**作成日**: 2025年10月1日
**総API数**: 199個
**バージョン**: v1

---

## 📋 実装済みAPIエンドポイント一覧

### v1 API (193個)

| No | エンドポイント | メソッド | ファイルパス |
|----|--------------|---------|-------------|
| 1 | `/api/v1/admin/backgrounds/list` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/backgrounds/list.get.ts` |
| 2 | `/api/v1/admin/backgrounds/upload` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/backgrounds/upload.post.ts` |
| 3 | `/api/v1/admin/campaigns/:{\1}` | DELETE | `/Users/kaneko/hotel-saas/server/api/v1/admin/campaigns/[id].delete.ts` |
| 4 | `/api/v1/admin/campaigns/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/campaigns/[id].get.ts` |
| 5 | `/api/v1/admin/campaigns/:{\1}` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/campaigns/[id].put.ts` |
| 6 | `/api/v1/admin/campaigns/:{\1}/analytics` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/campaigns/[id]/analytics.get.ts` |
| 7 | `/api/v1/admin/campaigns/analytics/summary` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/campaigns/analytics/summary.get.ts` |
| 8 | `/api/v1/admin/campaigns/create` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/campaigns/create.post.ts` |
| 9 | `/api/v1/admin/campaigns/list` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/campaigns/list.get.ts` |
| 10 | `/api/v1/admin/categories/:{\1}.delete.test` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/categories/[id].delete.test.ts` |
| 11 | `/api/v1/admin/categories/:{\1}` | DELETE | `/Users/kaneko/hotel-saas/server/api/v1/admin/categories/[id].delete.ts` |
| 12 | `/api/v1/admin/categories/:{\1}` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/categories/[id].put.ts` |
| 13 | `/api/v1/admin/categories/:{\1}/order` | PATCH | `/Users/kaneko/hotel-saas/server/api/v1/admin/categories/[id]/order.patch.ts` |
| 14 | `/api/v1/admin/categories/:{\1}/toggle-availability` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/categories/[id]/toggle-availability.post.ts` |
| 15 | `/api/v1/admin/categories/create` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/categories/create.post.ts` |
| 16 | `/api/v1/admin/categories/list` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/categories/list.get.ts` |
| 17 | `/api/v1/admin/categories/reorder` | PATCH | `/Users/kaneko/hotel-saas/server/api/v1/admin/categories/reorder.patch.ts` |
| 18 | `/api/v1/admin/concierge/character-autogen` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/concierge/character-autogen.post.ts` |
| 19 | `/api/v1/admin/concierge/integrate-info` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/concierge/integrate-info.post.ts` |
| 20 | `/api/v1/admin/content/apps/fetch-icon` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/content/apps/fetch-icon.post.ts` |
| 21 | `/api/v1/admin/dashboard` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/dashboard.get.ts` |
| 22 | `/api/v1/admin/devices/:{\1}` | DELETE | `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/[id].delete.ts` |
| 23 | `/api/v1/admin/devices/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/[id].get.ts` |
| 24 | `/api/v1/admin/devices/:{\1}` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/[id].put.ts` |
| 25 | `/api/v1/admin/devices/access-logs` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/access-logs.get.ts` |
| 26 | `/api/v1/admin/devices/bulk-actions` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/bulk-actions.put.ts` |
| 27 | `/api/v1/admin/devices/check-limit` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/check-limit.get.ts` |
| 28 | `/api/v1/admin/devices/count` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/count.get.ts` |
| 29 | `/api/v1/admin/devices/create` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/create.post.ts` |
| 30 | `/api/v1/admin/devices/list` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/list.get.ts` |
| 31 | `/api/v1/admin/devices/seed` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/seed.post.ts` |
| 32 | `/api/v1/admin/devices/validate` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/devices/validate.post.ts` |
| 33 | `/api/v1/admin/front-desk/accounting` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/accounting.get.ts` |
| 34 | `/api/v1/admin/front-desk/billing-settings` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/billing-settings.get.ts` |
| 35 | `/api/v1/admin/front-desk/billing` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/billing.post.ts` |
| 36 | `/api/v1/admin/front-desk/checkin` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/checkin.post.ts` |
| 37 | `/api/v1/admin/front-desk/checkout` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/checkout.post.ts` |
| 38 | `/api/v1/admin/front-desk/room-orders` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/room-orders.get.ts` |
| 39 | `/api/v1/admin/front-desk/rooms` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/rooms.get.ts` |
| 40 | `/api/v1/admin/media/reorder` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/media/reorder.post.ts` |
| 41 | `/api/v1/admin/menu/:{\1}.delete.test` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/[id].delete.test.ts` |
| 42 | `/api/v1/admin/menu/list` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/list.get.ts` |
| 43 | `/api/v1/admin/menu/reorder` | PATCH | `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/reorder.patch.ts` |
| 44 | `/api/v1/admin/operation-logs` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/operation-logs.get.ts` |
| 45 | `/api/v1/admin/orders.csv.get.test` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/orders.csv.get.test.ts` |
| 46 | `/api/v1/admin/orders` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/orders.get.ts` |
| 47 | `/api/v1/admin/orders/list` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/orders/list.get.ts` |
| 48 | `/api/v1/admin/orders/monthly-count` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/orders/monthly-count.get.ts` |
| 49 | `/api/v1/admin/pages/top` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top.get.ts` |
| 50 | `/api/v1/admin/pages/top` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top.put.ts` |
| 51 | `/api/v1/admin/pages/top/content` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top/content.ts` |
| 52 | `/api/v1/admin/pages/top/publish` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top/publish.post.ts` |
| 53 | `/api/v1/admin/pages/top/publish` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top/publish.ts` |
| 54 | `/api/v1/admin/phone-order/create` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/phone-order/create.post.ts` |
| 55 | `/api/v1/admin/phone-order/menu` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/phone-order/menu.get.ts` |
| 56 | `/api/v1/admin/place-types` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/place-types.get.ts` |
| 57 | `/api/v1/admin/rankings.get.test` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/rankings.get.test.ts` |
| 58 | `/api/v1/admin/receipts/:{\1}/qr` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/receipts/[orderId]/qr.get.ts` |
| 59 | `/api/v1/admin/room-grades/:{\1}` | DELETE | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id].delete.ts` |
| 60 | `/api/v1/admin/room-grades/:{\1}` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id].put.ts` |
| 61 | `/api/v1/admin/room-grades/:{\1}/index` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id]/index.get.ts` |
| 62 | `/api/v1/admin/room-grades/:{\1}/media` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id]/media.get.ts` |
| 63 | `/api/v1/admin/room-grades/:{\1}/media/:{\1}` | DELETE | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id]/media/[mediaId].delete.ts` |
| 64 | `/api/v1/admin/room-grades/:{\1}/media/:{\1}` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id]/media/[mediaId].put.ts` |
| 65 | `/api/v1/admin/room-grades/:{\1}/media/index` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id]/media/index.get.ts` |
| 66 | `/api/v1/admin/room-grades/:{\1}/media/upload` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id]/media/upload.post.ts` |
| 67 | `/api/v1/admin/room-grades/create` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/create.post.ts` |
| 68 | `/api/v1/admin/room-grades/list` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/list.get.ts` |
| 69 | `/api/v1/admin/room-grades/reorder` | PATCH | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/reorder.patch.ts` |
| 70 | `/api/v1/admin/room-memos.disabled/:{\1}` | DELETE | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos.disabled/[id].delete.ts` |
| 71 | `/api/v1/admin/room-memos.disabled/:{\1}` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos.disabled/[id].put.ts` |
| 72 | `/api/v1/admin/room-memos.disabled/:{\1}/comments` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos.disabled/[id]/comments.get.ts` |
| 73 | `/api/v1/admin/room-memos.disabled/:{\1}/comments` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos.disabled/[id]/comments.post.ts` |
| 74 | `/api/v1/admin/room-memos.disabled/:{\1}/history` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos.disabled/[id]/history.get.ts` |
| 75 | `/api/v1/admin/room-memos.disabled/:{\1}/status` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos.disabled/[id]/status.put.ts` |
| 76 | `/api/v1/admin/room-memos.disabled/create` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos.disabled/create.post.ts` |
| 77 | `/api/v1/admin/room-memos.disabled/list` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos.disabled/list.get.ts` |
| 78 | `/api/v1/admin/room-memos` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos.get.ts` |
| 79 | `/api/v1/admin/room-memos` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos.post.ts` |
| 80 | `/api/v1/admin/room-memos/:{\1}` | DELETE | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos/[id].delete.ts` |
| 81 | `/api/v1/admin/room-memos/:{\1}` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos/[id].put.ts` |
| 82 | `/api/v1/admin/room-memos/:{\1}/comments` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos/[id]/comments.get.ts` |
| 83 | `/api/v1/admin/room-memos/:{\1}/comments` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos/[id]/comments.post.ts` |
| 84 | `/api/v1/admin/room-memos/:{\1}/history` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos/[id]/history.get.ts` |
| 85 | `/api/v1/admin/room-memos/:{\1}/status` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/room-memos/[id]/status.put.ts` |
| 86 | `/api/v1/admin/rooms` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/rooms.get.ts` |
| 87 | `/api/v1/admin/rooms/:{\1}/status` | PATCH | `/Users/kaneko/hotel-saas/server/api/v1/admin/rooms/[id]/status.patch.ts` |
| 88 | `/api/v1/admin/rooms/:{\1}/logs` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/rooms/[roomNumber]/logs.get.ts` |
| 89 | `/api/v1/admin/rooms/by-number/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/rooms/by-number/[roomNumber].get.ts` |
| 90 | `/api/v1/admin/rooms/list` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/rooms/list.get.ts` |
| 91 | `/api/v1/admin/rooms/memos/:{\1}/status` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/rooms/memos/[id]/status.put.ts` |
| 92 | `/api/v1/admin/settings/payment-methods` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/settings/payment-methods.get.ts` |
| 93 | `/api/v1/admin/staff/:{\1}` | DELETE | `/Users/kaneko/hotel-saas/server/api/v1/admin/staff/[id].delete.ts` |
| 94 | `/api/v1/admin/staff/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/staff/[id].get.ts` |
| 95 | `/api/v1/admin/staff/:{\1}` | PATCH | `/Users/kaneko/hotel-saas/server/api/v1/admin/staff/[id].patch.ts` |
| 96 | `/api/v1/admin/staff/create` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/staff/create.post.ts` |
| 97 | `/api/v1/admin/staff/current` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/staff/current.get.ts` |
| 98 | `/api/v1/admin/staff/list` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/staff/list.get.ts` |
| 99 | `/api/v1/admin/statistics/kpis` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/statistics/kpis.get.ts` |
| 100 | `/api/v1/admin/statistics/room-analysis` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/statistics/room-analysis.get.ts` |
| 101 | `/api/v1/admin/statistics/room-usage-analysis` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/statistics/room-usage-analysis.get.ts` |
| 102 | `/api/v1/admin/summary.get.test` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/summary.get.test.ts` |
| 103 | `/api/v1/admin/summary` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/summary.get.ts` |
| 104 | `/api/v1/admin/system/notification-settings` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/system/notification-settings.post.ts` |
| 105 | `/api/v1/admin/system/openai-test` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/system/openai-test.post.ts` |
| 106 | `/api/v1/admin/system/retention-settings` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/system/retention-settings.post.ts` |
| 107 | `/api/v1/admin/system/settings` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/system/settings.get.ts` |
| 108 | `/api/v1/admin/system/system-settings` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/system/system-settings.post.ts` |
| 109 | `/api/v1/admin/templates/:{\1}` | DELETE | `/Users/kaneko/hotel-saas/server/api/v1/admin/templates/[id].delete.ts` |
| 110 | `/api/v1/admin/templates/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/templates/[id].get.ts` |
| 111 | `/api/v1/admin/templates/:{\1}` | PUT | `/Users/kaneko/hotel-saas/server/api/v1/admin/templates/[id].put.ts` |
| 112 | `/api/v1/admin/templates/apply` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/templates/apply.post.ts` |
| 113 | `/api/v1/admin/templates/create` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/templates/create.post.ts` |
| 114 | `/api/v1/admin/templates/list` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/templates/list.get.ts` |
| 115 | `/api/v1/admin/tenant/current` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/tenant/current.get.ts` |
| 116 | `/api/v1/admin/tv/apps/fetch-icon` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/tv/apps/fetch-icon.post.ts` |
| 117 | `/api/v1/admin/upload/image.post.test` | GET | `/Users/kaneko/hotel-saas/server/api/v1/admin/upload/image.post.test.ts` |
| 118 | `/api/v1/admin/upload/image` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/upload/image.post.ts` |
| 119 | `/api/v1/admin/upload/video` | POST | `/Users/kaneko/hotel-saas/server/api/v1/admin/upload/video.post.ts` |
| 120 | `/api/v1/auth/debug-state` | GET | `/Users/kaneko/hotel-saas/server/api/v1/auth/debug-state.get.ts` |
| 121 | `/api/v1/auth/debug-token` | GET | `/Users/kaneko/hotel-saas/server/api/v1/auth/debug-token.get.ts` |
| 122 | `/api/v1/auth/login` | POST | `/Users/kaneko/hotel-saas/server/api/v1/auth/login.post.ts` |
| 123 | `/api/v1/auth/logout` | POST | `/Users/kaneko/hotel-saas/server/api/v1/auth/logout.post.ts` |
| 124 | `/api/v1/auth/me` | GET | `/Users/kaneko/hotel-saas/server/api/v1/auth/me.get.ts` |
| 125 | `/api/v1/auth/refresh` | POST | `/Users/kaneko/hotel-saas/server/api/v1/auth/refresh.post.ts` |
| 126 | `/api/v1/auth/refresh.post.v2` | GET | `/Users/kaneko/hotel-saas/server/api/v1/auth/refresh.post.v2.ts` |
| 127 | `/api/v1/auth/switch-tenant` | POST | `/Users/kaneko/hotel-saas/server/api/v1/auth/switch-tenant.post.ts` |
| 128 | `/api/v1/auth/test-integration` | GET | `/Users/kaneko/hotel-saas/server/api/v1/auth/test-integration.get.ts` |
| 129 | `/api/v1/auth/validate-token` | POST | `/Users/kaneko/hotel-saas/server/api/v1/auth/validate-token.post.ts` |
| 130 | `/api/v1/auth/verify-permissions` | GET | `/Users/kaneko/hotel-saas/server/api/v1/auth/verify-permissions.get.ts` |
| 131 | `/api/v1/campaigns/active` | GET | `/Users/kaneko/hotel-saas/server/api/v1/campaigns/active.get.ts` |
| 132 | `/api/v1/campaigns/by-category/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/campaigns/by-category/[categoryCode].get.ts` |
| 133 | `/api/v1/campaigns/check` | GET | `/Users/kaneko/hotel-saas/server/api/v1/campaigns/check.get.ts` |
| 134 | `/api/v1/concierge/knowledge-rerank` | POST | `/Users/kaneko/hotel-saas/server/api/v1/concierge/knowledge-rerank.post.ts` |
| 135 | `/api/v1/concierge/response-tree-mock` | GET | `/Users/kaneko/hotel-saas/server/api/v1/concierge/response-tree-mock.get.ts` |
| 136 | `/api/v1/concierge/response-tree/node/mock/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/concierge/response-tree/node/mock/[nodeId].get.ts` |
| 137 | `/api/v1/concierge/response-trees/mock` | GET | `/Users/kaneko/hotel-saas/server/api/v1/concierge/response-trees/mock.get.ts` |
| 138 | `/api/v1/concierge/session/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/concierge/session/[sessionId].get.ts` |
| 139 | `/api/v1/concierge/session/create` | POST | `/Users/kaneko/hotel-saas/server/api/v1/concierge/session/create.post.ts` |
| 140 | `/api/v1/concierge/session/message` | POST | `/Users/kaneko/hotel-saas/server/api/v1/concierge/session/message.post.ts` |
| 141 | `/api/v1/concierge/sync-session/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/concierge/sync-session/[sessionId].get.ts` |
| 142 | `/api/v1/debug/token-info` | GET | `/Users/kaneko/hotel-saas/server/api/v1/debug/token-info.get.ts` |
| 143 | `/api/v1/device/room-by-ip` | GET | `/Users/kaneko/hotel-saas/server/api/v1/device/room-by-ip.get.ts` |
| 144 | `/api/v1/devices/check-status` | POST | `/Users/kaneko/hotel-saas/server/api/v1/devices/check-status.post.ts` |
| 145 | `/api/v1/devices/client-ip` | GET | `/Users/kaneko/hotel-saas/server/api/v1/devices/client-ip.get.ts` |
| 146 | `/api/v1/info/articles` | GET | `/Users/kaneko/hotel-saas/server/api/v1/info/articles.get.ts` |
| 147 | `/api/v1/integration/health` | GET | `/Users/kaneko/hotel-saas/server/api/v1/integration/health.get.ts` |
| 148 | `/api/v1/integration/session-sync` | POST | `/Users/kaneko/hotel-saas/server/api/v1/integration/session-sync.post.ts` |
| 149 | `/api/v1/integration/test-member` | GET | `/Users/kaneko/hotel-saas/server/api/v1/integration/test-member.get.ts` |
| 150 | `/api/v1/integration/test-pms` | GET | `/Users/kaneko/hotel-saas/server/api/v1/integration/test-pms.get.ts` |
| 151 | `/api/v1/integration/user-info` | GET | `/Users/kaneko/hotel-saas/server/api/v1/integration/user-info.get.ts` |
| 152 | `/api/v1/integration/validate-token` | GET | `/Users/kaneko/hotel-saas/server/api/v1/integration/validate-token.get.ts` |
| 153 | `/api/v1/integration/validate-token` | POST | `/Users/kaneko/hotel-saas/server/api/v1/integration/validate-token.post.ts` |
| 154 | `/api/v1/logs/ai-operation/search` | GET | `/Users/kaneko/hotel-saas/server/api/v1/logs/ai-operation/search.get.ts` |
| 155 | `/api/v1/logs/ai-operation/stats` | GET | `/Users/kaneko/hotel-saas/server/api/v1/logs/ai-operation/stats.get.ts` |
| 156 | `/api/v1/logs/auth/search` | GET | `/Users/kaneko/hotel-saas/server/api/v1/logs/auth/search.get.ts` |
| 157 | `/api/v1/logs/auth/stats` | GET | `/Users/kaneko/hotel-saas/server/api/v1/logs/auth/stats.get.ts` |
| 158 | `/api/v1/logs/billing/search` | GET | `/Users/kaneko/hotel-saas/server/api/v1/logs/billing/search.get.ts` |
| 159 | `/api/v1/logs/billing/stats` | GET | `/Users/kaneko/hotel-saas/server/api/v1/logs/billing/stats.get.ts` |
| 160 | `/api/v1/logs/device-usage/search` | GET | `/Users/kaneko/hotel-saas/server/api/v1/logs/device-usage/search.get.ts` |
| 161 | `/api/v1/logs/device-usage/stats` | GET | `/Users/kaneko/hotel-saas/server/api/v1/logs/device-usage/stats.get.ts` |
| 162 | `/api/v1/logs/health` | GET | `/Users/kaneko/hotel-saas/server/api/v1/logs/health.get.ts` |
| 163 | `/api/v1/logs/security/search` | GET | `/Users/kaneko/hotel-saas/server/api/v1/logs/security/search.get.ts` |
| 164 | `/api/v1/logs/security/stats` | GET | `/Users/kaneko/hotel-saas/server/api/v1/logs/security/stats.get.ts` |
| 165 | `/api/v1/logs/test` | POST | `/Users/kaneko/hotel-saas/server/api/v1/logs/test.post.ts` |
| 166 | `/api/v1/media-proxy` | GET | `/Users/kaneko/hotel-saas/server/api/v1/media-proxy.get.ts` |
| 167 | `/api/v1/media/proxy/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/media/proxy/[...path].get.ts` |
| 168 | `/api/v1/memos` | GET | `/Users/kaneko/hotel-saas/server/api/v1/memos.get.ts` |
| 169 | `/api/v1/memos` | POST | `/Users/kaneko/hotel-saas/server/api/v1/memos.post.ts` |
| 170 | `/api/v1/memos/:{\1}` | DELETE | `/Users/kaneko/hotel-saas/server/api/v1/memos/[id].delete.ts` |
| 171 | `/api/v1/memos/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/memos/[id].get.ts` |
| 172 | `/api/v1/memos/:{\1}` | PATCH | `/Users/kaneko/hotel-saas/server/api/v1/memos/[id].patch.ts` |
| 173 | `/api/v1/memos/:{\1}/comments` | POST | `/Users/kaneko/hotel-saas/server/api/v1/memos/[id]/comments.post.ts` |
| 174 | `/api/v1/memos/read-status` | POST | `/Users/kaneko/hotel-saas/server/api/v1/memos/read-status.post.ts` |
| 175 | `/api/v1/memos/read-status/batch` | POST | `/Users/kaneko/hotel-saas/server/api/v1/memos/read-status/batch.post.ts` |
| 176 | `/api/v1/memos/unread-count` | GET | `/Users/kaneko/hotel-saas/server/api/v1/memos/unread-count.get.ts` |
| 177 | `/api/v1/order/create` | POST | `/Users/kaneko/hotel-saas/server/api/v1/order/create.post.ts` |
| 178 | `/api/v1/order/menu` | GET | `/Users/kaneko/hotel-saas/server/api/v1/order/menu.get.ts` |
| 179 | `/api/v1/order/place` | POST | `/Users/kaneko/hotel-saas/server/api/v1/order/place.post.ts` |
| 180 | `/api/v1/orders/active` | GET | `/Users/kaneko/hotel-saas/server/api/v1/orders/active.get.ts` |
| 181 | `/api/v1/orders/history` | GET | `/Users/kaneko/hotel-saas/server/api/v1/orders/history.get.ts` |
| 182 | `/api/v1/orders/test-create-order` | POST | `/Users/kaneko/hotel-saas/server/api/v1/orders/test-create-order.post.ts` |
| 183 | `/api/v1/orders/test-history-auth` | GET | `/Users/kaneko/hotel-saas/server/api/v1/orders/test-history-auth.get.ts` |
| 184 | `/api/v1/orders/test-history` | GET | `/Users/kaneko/hotel-saas/server/api/v1/orders/test-history.get.ts` |
| 185 | `/api/v1/pages/top` | GET | `/Users/kaneko/hotel-saas/server/api/v1/pages/top.get.ts` |
| 186 | `/api/v1/pages/top` | GET | `/Users/kaneko/hotel-saas/server/api/v1/pages/top.ts` |
| 187 | `/api/v1/receipts/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/v1/receipts/[receiptId].get.ts` |
| 188 | `/api/v1/test-proxy` | GET | `/Users/kaneko/hotel-saas/server/api/v1/test-proxy.get.ts` |
| 189 | `/api/v1/tv/remote-control` | GET | `/Users/kaneko/hotel-saas/server/api/v1/tv/remote-control.get.ts` |
| 190 | `/api/v1/user/profile` | GET | `/Users/kaneko/hotel-saas/server/api/v1/user/profile.get.ts` |
| 191 | `/api/v1/welcome-screen/config` | GET | `/Users/kaneko/hotel-saas/server/api/v1/welcome-screen/config.get.ts` |
| 192 | `/api/v1/welcome-screen/mark-completed` | POST | `/Users/kaneko/hotel-saas/server/api/v1/welcome-screen/mark-completed.post.ts` |
| 193 | `/api/v1/welcome-screen/should-show` | GET | `/Users/kaneko/hotel-saas/server/api/v1/welcome-screen/should-show.get.ts` |

---

### v1以外のAPI (6個)

| No | エンドポイント | メソッド | ファイルパス |
|----|--------------|---------|-------------|
| 1 | `/api/common-test` | GET | `/Users/kaneko/hotel-saas/server/api/common-test.get.ts` |
| 2 | `/api/health` | GET | `/Users/kaneko/hotel-saas/server/api/health.get.ts` |
| 3 | `/api/test/verify-auth-log` | GET | `/Users/kaneko/hotel-saas/server/api/test/verify-auth-log.get.ts` |
| 4 | `/api/uploads/:{\1}` | GET | `/Users/kaneko/hotel-saas/server/api/uploads/[...path].get.ts` |
| 5 | `/api/uploads/create` | POST | `/Users/kaneko/hotel-saas/server/api/uploads/create.post.ts` |
| 6 | `/api/ws/logs` | GET | `/Users/kaneko/hotel-saas/server/api/ws/logs.ts` |

---

## 📊 サマリー

- **v1 API**: 193個
- **v1以外 API**: 6個（レガシーAPI削除済み）
- **合計**: 199個

### 🗑️ 削除したレガシーAPI（2025年10月1日）

- `/api/auth/login` (POST) → `/api/v1/auth/login` に統一
- `/api/auth/logout` (POST) → `/api/v1/auth/logout` に統一
- `/api/auth/me` (GET) → `/api/v1/auth/me` に統一
- `/api/admin/content/apps/*` (6個) → 削除（未使用）

### カテゴリ別内訳

- 認証 (auth): 11個
- 管理 (admin): 120個以上
- デバイス (device/devices): 15個
- 注文 (order/orders): 10個
- メモ (memos): 8個
- ログ (logs): 7個
- その他: 残り

---

**更新日**: 2025年10月1日
**ステータス**: 全199個のAPI完全網羅（レガシーAPI削除済み）
