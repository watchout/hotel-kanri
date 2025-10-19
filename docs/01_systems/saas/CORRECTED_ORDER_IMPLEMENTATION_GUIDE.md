=== hotel-saas 注文管理システム 修正実装指示 ===

【実際のソースコード確認済み】2025年9月22日

【必読ドキュメント（絶対パス）】
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/saas/ORDER_MIGRATION_ANALYSIS.md
★★☆ /Users/kaneko/hotel-kanri/docs/01_systems/saas/API_INTEGRATION_CHECKLIST.md
★☆☆ /Users/kaneko/hotel-saas/server/utils/authService.v2.ts
★☆☆ /Users/kaneko/hotel-saas/composables/useSessionApi.ts

【実際の実装状況】
✅ 認証システム: authService.v2.ts 実装済み
✅ セッションAPI: useSessionApi.ts 実装済み  
✅ 注文API: 複数実装あり（統合が必要）
❌ hotel-common: 注文管理API未実装

【重要】既存実装を活用した修正指示

【Phase 1: 既存注文API統合】

□ 1-1. 既存APIファイルの整理
   現在の状況:
   - /Users/kaneko/hotel-saas/server/api/v1/order/place.post.ts (Prisma使用)
   - /Users/kaneko/hotel-saas/server/api/v1/orders/create.post.v2.ts (hotel-common連携)
   
   作業内容:
   - place.post.ts を .disabled に変更
   - create.post.v2.ts を index.post.ts にリネーム
   - 既存のauthService.v2.ts活用を確認

□ 1-2. セッション対応注文API修正
   ファイル: server/api/v1/order/index.post.ts (create.post.v2.tsから)
   
   修正内容:
   ```typescript
   // 既存のauthService.v2.tsを活用
   import { getAuthService } from '~/server/utils/authService.v2'
   
   export default defineEventHandler(async (event) => {
     const authService = getAuthService()
     
     // 既存の認証機能を使用
     const user = await authService.authenticateUser(event)
     
     // セッション対応ロジック追加
     const { sessionId, roomNumber, items } = await readBody(event)
     
     if (sessionId) {
       // 新フロー: セッションベース注文
       return await createSessionOrder(sessionId, items, user)
     } else if (roomNumber) {
       // 既存フロー: 部屋番号ベース注文
       return await createRoomOrder(roomNumber, items, user)
     }
   })
   ```

□ 1-3. useSessionApi.ts活用確認
   ファイル: /Users/kaneko/hotel-saas/composables/useSessionApi.ts
   
   確認内容:
   - 既存のcheckin(), checkout()メソッド活用
   - authenticatedFetch()の使用確認
   - セッション取得機能の活用

【Phase 2: フロントエンド統合】

□ 2-1. 既存useSessionApi活用
   pages/admin/front-desk/operation.vue での修正:
   
   ```typescript
   // 既存のuseSessionApi()を活用
   const { checkin, getActiveSessionByRoom } = useSessionApi()
   
   const submitPhoneOrder = async () => {
     // 既存のセッション取得機能を使用
     const session = await getActiveSessionByRoom(roomNumber)
     // 注文処理
   }
   ```

□ 2-2. 既存認証機能活用
   - authenticatedFetch()の継続使用
   - 既存のエラーハンドリング活用
   - 既存のUI状態管理活用

【Phase 3: hotel-common API実装】

□ 3-1. 必要なAPIエンドポイント実装
   hotel-commonで実装が必要:
   - POST /api/v1/orders (注文作成)
   - GET /api/v1/orders/history (注文履歴)
   - PUT /api/v1/orders/{id}/status (ステータス更新)
   - POST /api/v1/sessions (セッション作成)
   - GET /api/v1/sessions/by-room/{roomNumber} (セッション取得)

□ 3-2. WebSocket通知対応
   - 既存のnotifyNewOrder()機能をhotel-commonに移行
   - リアルタイム通知の統合

【実装チェックリスト】
□ 既存place.post.tsの無効化完了
□ create.post.v2.tsのindex.post.tsへのリネーム完了
□ authService.v2.ts活用の確認完了
□ useSessionApi.ts活用の確認完了
□ フロントエンド既存機能との統合完了
□ hotel-common必要API実装完了
□ WebSocket通知統合完了
□ 統合テスト完了

【技術的詳細】
- 既存認証: authService.v2.ts (HotelSaasAuth使用)
- 既存セッション: useSessionApi.ts (authenticatedFetch使用)
- 既存WebSocket: notifyNewOrder()機能
- hotel-common API: http://localhost:3400

【重要な注意事項】
❌ 既存の実装を破壊しない
❌ authService.v2.tsの重複実装禁止
❌ useSessionApi.tsの重複実装禁止
✅ 既存機能の段階的拡張
✅ 後方互換性の維持

作成日時: 2025年9月22日
実装期限: 2025年10月15日

