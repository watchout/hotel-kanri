=== hotel-saas 基盤問題対応 実装ガイド ===

【前提条件】hotel-common基盤問題解決完了後に実行
【対象】hotel-saasチーム
【期限】hotel-common基盤完了後48時間以内

【必読ドキュメント（絶対パス）】
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/common/FOUNDATION_ISSUES_RESOLUTION_GUIDE.md
★★★ /Users/kaneko/hotel-saas/server/utils/authService.v2.ts
★★☆ /Users/kaneko/hotel-saas/composables/useSessionApi.ts

【重要】基盤問題解決待ち
❌ hotel-commonのCheckInSessionテーブル作成完了まで待機
❌ セッション管理API実装完了まで待機
✅ 基盤完了後に段階的実装開始

【Phase 1: 基盤連携確認（基盤完了後即座）】

□ 1-1. hotel-common基盤API接続確認
   テスト項目:
   ```bash
   # ヘルスチェック
   curl http://localhost:3400/api/health
   
   # セッション作成テスト
   curl -X POST http://localhost:3400/api/v1/sessions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer {token}" \
     -d '{
       "roomId": "101",
       "primaryGuestName": "テストゲスト",
       "guestCount": 1,
       "checkedInAt": "2025-09-22T15:00:00Z",
       "expectedCheckOut": "2025-09-23T11:00:00Z"
     }'
   
   # セッション取得テスト
   curl http://localhost:3400/api/v1/sessions/by-room/101 \
     -H "Authorization: Bearer {token}"
   ```

□ 1-2. 既存authService.v2.ts動作確認
   ファイル: /Users/kaneko/hotel-saas/server/utils/authService.v2.ts
   
   確認項目:
   - hotel-common API接続確認
   - トークン検証機能確認
   - エラーハンドリング確認

□ 1-3. useSessionApi.ts拡張準備
   ファイル: /Users/kaneko/hotel-saas/composables/useSessionApi.ts
   
   新機能追加準備:
   ```typescript
   // セッション対応注文作成機能追加
   const createSessionOrder = async (sessionId: string, items: any[]) => {
     return await authenticatedFetch('/api/v1/orders', {
       method: 'POST',
       body: {
         sessionId,
         items
       }
     })
   }
   ```

【Phase 2: セッション対応注文API実装（24時間以内）】

□ 2-1. 既存注文APIの段階的移行
   現在のファイル構成:
   - /Users/kaneko/hotel-saas/server/api/v1/order/place.post.ts (無効化)
   - /Users/kaneko/hotel-saas/server/api/v1/orders/create.post.v2.ts (拡張)
   
   作業内容:
   ```typescript
   // create.post.v2.ts → index.post.ts に移行
   import { getAuthService } from '~/server/utils/authService.v2'
   
   export default defineEventHandler(async (event) => {
     const authService = getAuthService()
     const user = await authService.authenticateUser(event)
     const { sessionId, roomNumber, items } = await readBody(event)
     
     // hotel-common基盤API使用
     const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
     
     try {
       if (sessionId) {
         // 新フロー: セッションベース注文
         const response = await $fetch(`${hotelCommonApiUrl}/api/v1/orders`, {
           method: 'POST',
           headers: {
             'Authorization': `Bearer ${user.token}`,
             'Content-Type': 'application/json'
           },
           body: {
             sessionId,
             items,
             notes: specialInstructions
           }
         })
         return response
         
       } else if (roomNumber) {
         // 互換フロー: 部屋番号→セッション取得→注文
         const sessionResponse = await $fetch(`${hotelCommonApiUrl}/api/v1/sessions/by-room/${roomNumber}`, {
           headers: { 'Authorization': `Bearer ${user.token}` }
         })
         
         if (sessionResponse.success && sessionResponse.data) {
           // セッションが見つかった場合
           return await $fetch(`${hotelCommonApiUrl}/api/v1/orders`, {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${user.token}`,
               'Content-Type': 'application/json'
             },
             body: {
               sessionId: sessionResponse.data.id,
               items,
               notes: specialInstructions
             }
           })
         } else {
           // セッションが見つからない場合はエラー
           throw createError({
             statusCode: 404,
             statusMessage: 'アクティブなセッションが見つかりません。チェックインを確認してください。'
           })
         }
       }
       
     } catch (error) {
       console.error('注文作成エラー:', error)
       throw createError({
         statusCode: 500,
         statusMessage: '注文作成に失敗しました'
       })
     }
   })
   ```

□ 2-2. エラーハンドリング強化
   hotel-common API停止時の対応:
   ```typescript
   const createOrderWithFallback = async (data: any) => {
     try {
       // hotel-common API使用
       return await callHotelCommonAPI(data)
     } catch (error) {
       if (error.statusCode === 503 || error.code === 'ECONNREFUSED') {
         // hotel-common停止時の緊急対応
         console.error('hotel-common API停止中:', error)
         throw createError({
           statusCode: 503,
           statusMessage: 'サービス一時停止中です。しばらくお待ちください。'
         })
       }
       throw error
     }
   }
   ```

【Phase 3: フロントエンド統合（24時間以内）】

□ 3-1. useSessionApi.ts機能拡張
   ファイル: /Users/kaneko/hotel-saas/composables/useSessionApi.ts
   
   ```typescript
   // 既存機能を拡張
   export const useSessionApi = () => {
     const { authenticatedFetch } = useApiClient()
     
     // 既存のcheckin, checkout機能は維持
     
     // 新機能: セッション対応注文作成
     const createSessionOrder = async (sessionId: string, items: any[], notes?: string) => {
       console.log('🛒 セッション対応注文作成:', { sessionId, itemCount: items.length })
       
       const response = await authenticatedFetch('/api/v1/orders', {
         method: 'POST',
         body: {
           sessionId,
           items,
           notes
         }
       })
       
       console.log('✅ セッション対応注文作成完了:', response.data?.id)
       return response
     }
     
     // 新機能: 部屋番号からセッション取得→注文作成
     const createRoomOrder = async (roomNumber: string, items: any[], notes?: string) => {
       console.log('🏨 部屋番号ベース注文作成:', { roomNumber, itemCount: items.length })
       
       try {
         // アクティブセッション取得
         const sessionResponse = await getActiveSessionByRoom(roomNumber)
         
         if (sessionResponse.success && sessionResponse.data) {
           // セッションが見つかった場合
           return await createSessionOrder(sessionResponse.data.id, items, notes)
         } else {
           // セッションが見つからない場合
           throw new Error('アクティブなセッションが見つかりません')
         }
       } catch (error) {
         console.error('部屋番号ベース注文作成エラー:', error)
         throw error
       }
     }
     
     return {
       // 既存機能
       checkin,
       checkout,
       getActiveSessionByRoom,
       // 新機能
       createSessionOrder,
       createRoomOrder
     }
   }
   ```

□ 3-2. フロントエンド画面修正
   ファイル: pages/admin/front-desk/operation.vue
   
   電話注文処理修正:
   ```typescript
   const submitPhoneOrder = async () => {
     try {
       const { createRoomOrder } = useSessionApi()
       
       const response = await createRoomOrder(
         phoneOrderRoom.value.number,
         orderItems,
         '電話注文 - フロントスタッフ'
       )
       
       if (response.success) {
         phoneOrderModal.value = false
         await refreshRoomData()
         showNotification('注文を受け付けました', 'success')
       }
     } catch (error) {
       console.error('電話注文エラー:', error)
       if (error.message.includes('セッション')) {
         showNotification('チェックインセッションが見つかりません。チェックイン状況を確認してください。', 'error')
       } else {
         showNotification('注文の受付に失敗しました', 'error')
       }
     }
   }
   ```

【Phase 4: 統合テスト・監視（24時間以内）】

□ 4-1. 統合テスト実行
   テストシナリオ:
   ```typescript
   // 1. セッション作成→注文作成→ステータス更新
   // 2. 部屋番号ベース注文（セッション自動取得）
   // 3. エラーケース（セッションなし、API停止等）
   // 4. 既存機能との互換性確認
   ```

□ 4-2. 監視・アラート設定
   - hotel-common API応答時間監視
   - エラー発生率監視
   - セッション作成成功率監視

【実装チェックリスト】
□ hotel-common基盤問題解決完了確認
□ 基盤API接続確認完了
□ authService.v2.ts動作確認完了
□ セッション対応注文API実装完了
□ エラーハンドリング強化完了
□ useSessionApi.ts機能拡張完了
□ フロントエンド画面修正完了
□ 統合テスト実行完了
□ 監視・アラート設定完了

【重要な実装順序】
1. hotel-common基盤完了まで待機
2. 基盤API接続確認
3. 段階的機能実装
4. 統合テスト・監視

【技術的詳細】
- 既存認証: authService.v2.ts活用
- 既存セッション: useSessionApi.ts拡張
- API通信: hotel-common基盤API使用
- エラー処理: 段階的フォールバック

作成日時: 2025年9月22日
実行条件: hotel-common基盤問題解決完了後

