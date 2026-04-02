=== 注文管理システム 包括的実装指示 ===

【重要】実際のソースコード・DB分析済み（2025年9月22日）

【必読ドキュメント（絶対パス）】
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/saas/ORDER_MIGRATION_ANALYSIS.md
★★★ /Users/kaneko/hotel-kanri/docs/architecture/CHECKIN_SESSION_DESIGN_PROPOSAL.md
★★☆ /Users/kaneko/hotel-saas/server/utils/authService.v2.ts
★★☆ /Users/kaneko/hotel-saas/composables/useSessionApi.ts

【重大な発見事項】
❌ CheckInSessionテーブル未実装（Order.sessionIdが参照先なし）
❌ トランザクション処理不備
❌ エラーハンドリング不足
❌ データ移行戦略欠如

【Phase 0: 緊急基盤整備】

□ 0-1. データベーススキーマ整備（hotel-common）
   緊急度: 最高
   
   CheckInSessionテーブル作成:
   ```sql
   CREATE TABLE "CheckInSession" (
     "id" TEXT NOT NULL PRIMARY KEY,
     "tenantId" TEXT NOT NULL,
     "roomId" TEXT NOT NULL,
     "sessionNumber" TEXT NOT NULL UNIQUE,
     "primaryGuestName" TEXT NOT NULL,
     "guestCount" INTEGER NOT NULL DEFAULT 1,
     "checkedInAt" TIMESTAMP(3) NOT NULL,
     "expectedCheckOut" TIMESTAMP(3) NOT NULL,
     "checkedOutAt" TIMESTAMP(3),
     "status" TEXT NOT NULL DEFAULT 'active',
     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
     "updatedAt" TIMESTAMP(3) NOT NULL
   );
   ```

□ 0-2. データ整合性確保
   既存Order.sessionIdの処理:
   - sessionId=NULLの既存注文の扱い決定
   - 移行期間中の互換性確保
   - 外部キー制約の段階的適用

【Phase 1: 堅牢な注文API実装】

□ 1-1. トランザクション対応注文作成API
   ファイル: server/api/v1/orders/index.post.ts
   
   ```typescript
   import { getAuthService } from '~/server/utils/authService.v2'
   
   export default defineEventHandler(async (event) => {
     const authService = getAuthService()
     const user = await authService.authenticateUser(event)
     const { sessionId, roomNumber, items } = await readBody(event)
     
     // トランザクション処理
     return await prisma.$transaction(async (tx) => {
       // 1. セッション存在確認
       if (sessionId) {
         const session = await tx.checkInSession.findUnique({
           where: { id: sessionId }
         })
         if (!session) {
           throw createError({ statusCode: 404, statusMessage: 'セッションが見つかりません' })
         }
       }
       
       // 2. 注文作成
       const order = await tx.order.create({
         data: {
           tenantId: user.tenantId,
           roomId: sessionId ? session.roomId : roomNumber,
           sessionId: sessionId,
           status: 'received',
           items: JSON.stringify(items),
           total: calculateTotal(items)
         }
       })
       
       // 3. セッション請求更新
       if (sessionId) {
         await tx.checkInSession.update({
           where: { id: sessionId },
           data: {
             totalAmount: { increment: order.total },
             updatedAt: new Date()
           }
         })
       }
       
       // 4. WebSocket通知
       await notifyOrderCreated(order)
       
       return { success: true, order }
     }, {
       timeout: 30000,
       isolationLevel: 'ReadCommitted'
     })
   })
   ```

□ 1-2. エラーハンドリング強化
   - hotel-common API停止時のフォールバック
   - ネットワークエラー時のリトライ機能
   - 部分的失敗時の復旧機能

□ 1-3. データ検証・整合性チェック
   - セッション状態の検証
   - 注文データの妥当性チェック
   - 重複注文の防止

【Phase 2: セッション管理統合】

□ 2-1. セッション作成API（hotel-common）
   エンドポイント: POST /api/v1/sessions
   
   ```javascript
   app.post('/api/v1/sessions', authenticateToken, async (req, res) => {
     const transactionId = generateTransactionId()
     
     try {
       const session = await prisma.$transaction(async (tx) => {
         // セッション作成
         const session = await tx.checkInSession.create({
           data: {
             ...req.body,
             sessionNumber: await generateSessionNumber(req.body.roomId)
           }
         })
         
         // 部屋状態更新
         await tx.room.update({
           where: { id: req.body.roomId },
           data: { status: 'OCCUPIED' }
         })
         
         return session
       })
       
       // 成功ログ
       await logTransaction(transactionId, 'SUCCESS', session.id)
       res.status(201).json({ success: true, data: session })
       
     } catch (error) {
       // 失敗ログ
       await logTransaction(transactionId, 'ERROR', null, error.message)
       res.status(500).json({ success: false, error: error.message })
     }
   })
   ```

□ 2-2. セッション取得API強化
   - アクティブセッション取得
   - セッション履歴取得
   - セッション詳細情報取得

【Phase 3: データ移行戦略】

□ 3-1. 既存データ移行計画
   段階的移行:
   1. CheckInSessionテーブル作成
   2. 既存Order.sessionId=NULLデータの処理方針決定
   3. 移行スクリプト作成・テスト
   4. 本番移行実行

□ 3-2. 移行期間中の互換性確保
   ```typescript
   // 移行期間中の注文処理
   const createOrder = async (data) => {
     if (data.sessionId) {
       // 新フロー: セッションベース
       return await createSessionOrder(data)
     } else if (data.roomNumber) {
       // 旧フロー: 部屋番号ベース（互換性維持）
       return await createRoomOrder(data)
     }
   }
   ```

【Phase 4: 監視・品質保証】

□ 4-1. リアルタイム監視実装
   - API応答時間監視
   - エラー発生率監視
   - データ整合性監視

□ 4-2. ロールバック機能実装
   緊急ロールバック手順:
   ```bash
   # 1. 移行フラグ無効化
   # 2. 旧システムへの切り替え
   # 3. データベース接続切り替え
   # 4. 状態確認
   ```

【実装チェックリスト】
□ Phase 0: 緊急基盤整備完了
□ CheckInSessionテーブル作成完了
□ データ整合性確保完了
□ Phase 1: 堅牢な注文API実装完了
□ トランザクション対応完了
□ エラーハンドリング強化完了
□ Phase 2: セッション管理統合完了
□ Phase 3: データ移行戦略実行完了
□ Phase 4: 監視・品質保証完了

【技術的詳細】
- 既存認証: authService.v2.ts活用
- 既存セッション: useSessionApi.ts活用
- トランザクション: Prisma.$transaction使用
- 監視: リアルタイム監視実装
- ロールバック: 緊急時対応手順完備

【重要な制約事項】
❌ CheckInSessionテーブル未実装状態での本格運用禁止
❌ トランザクション処理なしでの複数テーブル更新禁止
❌ エラーハンドリングなしでのAPI統合禁止
✅ 段階的移行による安全な実装
✅ 既存データの完全な互換性確保
✅ 緊急時ロールバック機能必須

【実装期限】
Phase 0: 即座実行（1-2日）
Phase 1-2: 1週間以内
Phase 3-4: 2週間以内

作成日時: 2025年9月22日
最終更新: 実際のソースコード・DB分析反映

