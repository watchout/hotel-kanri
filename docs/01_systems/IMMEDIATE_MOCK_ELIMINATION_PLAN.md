=== 緊急: モック実装即座排除計画 ===

【重要】開発フローでモック・一時実装は禁止
【対象】hotel-saas, hotel-common
【実行】即座実行必須

【現在のモック実装問題】
❌ /Users/kaneko/hotel-saas/server/api/v1/order/create.post.ts Line 23-24
   console.log('⚠️ hotel-common APIが未実装: モック注文作成を使用');
❌ モックデータ返却による本格運用阻害
❌ 根本的問題の先送り

【即座実行計画】

【Phase 1: hotel-common 本格API実装（即座）】

□ 1-1. Order外部キー制約追加
   ファイル: /Users/kaneko/hotel-common/prisma/schema.prisma

   ```prisma
   model Order {
     id        Int         @id @default(autoincrement())
     tenantId  String
     roomId    String
     placeId   Int?
     sessionId String?
     status    String      @default("received")
     items     Json
     total     Int
     createdAt DateTime    @default(now())
     updatedAt DateTime
     paidAt    DateTime?
     isDeleted Boolean     @default(false)
     deletedAt DateTime?
     uuid      String?     @unique
     
     // 外部キー制約追加
     session   checkin_sessions? @relation(fields: [sessionId], references: [id])
     OrderItem OrderItem[]
     
     @@index([sessionId])
     // 既存インデックス維持
   }
   ```

□ 1-2. マイグレーション実行

   ```bash
   cd /Users/kaneko/hotel-common
   npx prisma migrate dev --name "add-order-session-foreign-key"
   npx prisma generate
   ```

□ 1-3. 本格注文作成API実装
   ファイル: /Users/kaneko/hotel-common/src/routes/api/v1/orders/index.js

   ```javascript
   const express = require('express');
   const { PrismaClient } = require('@prisma/client');
   const prisma = new PrismaClient();
   
   // POST /api/v1/orders - 本格実装
   app.post('/api/v1/orders', authenticateToken, async (req, res) => {
     const transactionId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
     
     try {
       console.log(`🛒 [${transactionId}] 本格注文作成開始:`, req.body);
       
       const order = await prisma.$transaction(async (tx) => {
         const { sessionId, roomId, items, notes } = req.body;
         
         // セッション存在確認（sessionIdが提供された場合）
         if (sessionId) {
           const session = await tx.checkin_sessions.findUnique({
             where: { id: sessionId }
           });
           if (!session) {
             throw new Error('指定されたセッションが見つかりません');
           }
           if (session.status !== 'ACTIVE') {
             throw new Error('セッションがアクティブではありません');
           }
         }
         
         // 合計金額計算
         const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
         
         // 注文作成
         const order = await tx.order.create({
           data: {
             tenantId: req.user.tenantId,
             roomId: sessionId ? session.room_id : roomId,
             sessionId: sessionId,
             status: 'received',
             items: JSON.stringify(items),
             total: total
           }
         });
         
         // 注文アイテム作成
         await tx.orderItem.createMany({
           data: items.map(item => ({
             tenantId: req.user.tenantId,
             orderId: order.id,
             menuItemId: item.menuItemId,
             name: item.name,
             price: item.price,
             quantity: item.quantity,
             notes: item.notes || '',
             status: 'pending'
           }))
         });
         
         // セッション請求更新（sessionIdがある場合）
         if (sessionId) {
           await tx.checkin_sessions.update({
             where: { id: sessionId },
             data: {
               updated_at: new Date()
             }
           });
         }
         
         console.log(`✅ [${transactionId}] 本格注文作成完了:`, order.id);
         return order;
         
       }, {
         timeout: 30000,
         isolationLevel: 'ReadCommitted'
       });
       
       // WebSocket通知（実装済みの場合）
       try {
         await notifyOrderCreated(order);
       } catch (notifyError) {
         console.warn('WebSocket通知エラー:', notifyError);
         // 通知エラーは注文作成の成功を阻害しない
       }
       
       res.status(201).json({
         success: true,
         data: order
       });
       
     } catch (error) {
       console.error(`❌ [${transactionId}] 本格注文作成エラー:`, error);
       res.status(500).json({
         success: false,
         error: '注文作成に失敗しました',
         details: error.message
       });
     }
   });
   ```

【Phase 2: hotel-saas モック排除（即座）】

□ 2-1. モック実装の完全削除
   ファイル: /Users/kaneko/hotel-saas/server/api/v1/order/create.post.ts

   ```typescript
   /**
    * 注文作成API - hotel-common連携版
    * モック実装完全排除
    */
   import { getAuthService } from '~/server/utils/authService.v2'
   
   export default defineEventHandler(async (event) => {
     try {
       const authService = getAuthService()
       const user = await authService.authenticateUser(event)
       const { roomNumber, sessionId, items, specialInstructions } = await readBody(event)
       
       if ((!roomNumber && !sessionId) || !items || !Array.isArray(items) || items.length === 0) {
         throw createError({
           statusCode: 400,
           statusMessage: 'セッションIDまたは部屋番号と注文アイテムが必要です'
         })
       }
       
       console.log('🔍 本格注文作成:', { roomNumber, sessionId, itemCount: items.length })
       
       // hotel-common API呼び出し（モック排除）
       const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
       
       const orderData = {
         sessionId: sessionId,
         roomId: roomNumber,
         items: items,
         notes: specialInstructions
       }
       
       const response = await $fetch(`${hotelCommonApiUrl}/api/v1/orders`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${user.token}`,
           'Content-Type': 'application/json',
           'X-Tenant-ID': user.tenantId
         },
         body: orderData
       })
       
       console.log('✅ 本格注文作成完了:', response.data?.id)
       
       return {
         success: true,
         order: response.data
       }
       
     } catch (error: any) {
       console.error('❌ 本格注文作成エラー:', error)
       
       throw createError({
         statusCode: error.statusCode || 500,
         statusMessage: error.statusMessage || '注文作成に失敗しました',
         message: error.message || '注文作成中にエラーが発生しました'
       })
     }
   })
   ```

【Phase 3: 即座テスト・検証】

□ 3-1. hotel-common API動作確認

   ```bash
   curl -X POST http://localhost:3400/api/v1/orders \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer {token}" \
     -d '{
       "sessionId": "test-session-id",
       "items": [{"menuItemId": 1, "name": "テスト商品", "price": 1000, "quantity": 1}]
     }'
   ```

□ 3-2. hotel-saas API動作確認

   ```bash
   curl -X POST http://localhost:3100/api/v1/order/create \
     -H "Content-Type: application/json" \
     -d '{
       "roomNumber": "101",
       "items": [{"menuItemId": 1, "name": "テスト商品", "price": 1000, "quantity": 1}]
     }'
   ```

【実行チェックリスト】
□ hotel-common: Order外部キー制約追加完了
□ hotel-common: マイグレーション実行完了
□ hotel-common: 本格注文作成API実装完了
□ hotel-saas: モック実装完全削除完了
□ hotel-saas: hotel-common API呼び出し実装完了
□ 動作確認テスト完了
□ モック・一時実装の完全排除確認完了

【重要な制約】
❌ モック実装・一時実装は一切禁止
❌ 問題の先送りは禁止
✅ 根本的解決の即座実行
✅ 本格実装のみ許可

作成日時: 2025年9月22日
緊急度: 最高（即座実行必須）
目的: モック・一時実装の完全排除
