=== hotel-common 基盤問題解決 実装ガイド ===

【緊急度】最高 - 即座実行必須
【対象】hotel-commonチーム
【期限】48時間以内

【必読ドキュメント（絶対パス）】
★★★ /Users/kaneko/hotel-kanri/docs/architecture/CHECKIN_SESSION_DESIGN_PROPOSAL.md
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/common/database/DATABASE_SCHEMA_CONSISTENCY_REPORT.md
★★☆ /Users/kaneko/hotel-kanri/docs/migration/IMMEDIATE_MIGRATION_RESPONSE.md

【重大な基盤問題】
❌ CheckInSessionテーブル未実装（データ整合性破綻）
❌ Order.sessionIdが参照先なしの状態
❌ 外部キー制約設定不可
❌ トランザクション処理基盤なし

【Phase 0: 緊急データベース基盤整備（24時間以内）】

□ 0-1. CheckInSessionテーブル作成
   優先度: 最高
   実行場所: hotel-common/prisma/schema.prisma
   
   ```prisma
   model CheckInSession {
     id              String    @id @default(cuid())
     tenantId        String
     roomId          String
     sessionNumber   String    @unique
     
     // ゲスト情報
     primaryGuestName    String
     primaryGuestEmail   String?
     primaryGuestPhone   String?
     guestCount          Int     @default(1)
     
     // チェックイン/アウト情報
     checkedInAt     DateTime
     expectedCheckOut DateTime
     checkedOutAt    DateTime?
     
     // セッション状態
     status          String    @default("active")
     
     // 会計情報
     totalAmount     Int       @default(0)
     paidAmount      Int       @default(0)
     billingStatus   String    @default("pending")
     
     // メタデータ
     notes           String?
     specialRequests String?
     createdAt       DateTime  @default(now())
     updatedAt       DateTime  @updatedAt
     createdBy       String?
     
     // リレーション
     orders          Order[]
     guests          CheckInGuest[]
     
     @@index([tenantId])
     @@index([roomId])
     @@index([status])
     @@index([checkedInAt])
     @@index([sessionNumber])
     @@map("checkin_sessions")
   }
   
   model CheckInGuest {
     id              String         @id @default(cuid())
     sessionId       String
     guestNumber     Int
     name            String?
     ageGroup        String         // adult, child, infant
     gender          String?        // male, female, other, prefer_not_to_say
     phone           String?
     email           String?
     notes           String?
     
     session         CheckInSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
     
     @@index([sessionId])
     @@map("checkin_guests")
   }
   ```

□ 0-2. Orderテーブル外部キー制約追加
   ```prisma
   model Order {
     id        Int         @id @default(autoincrement())
     tenantId  String
     roomId    String
     placeId   Int?
     sessionId String?     // 外部キー制約追加
     status    String      @default("received")
     items     Json
     total     Int
     createdAt DateTime    @default(now())
     updatedAt DateTime
     paidAt    DateTime?
     isDeleted Boolean     @default(false)
     deletedAt DateTime?
     uuid      String?     @unique
     
     // リレーション追加
     session   CheckInSession? @relation(fields: [sessionId], references: [id])
     OrderItem OrderItem[]
     
     @@index([sessionId])
     // 既存インデックスは維持
   }
   ```

□ 0-3. マイグレーション実行
   ```bash
   cd /Users/kaneko/hotel-common
   npx prisma migrate dev --name "add-checkin-session-tables"
   npx prisma generate
   ```

【Phase 1: セッション管理API基盤実装（24時間以内）】

□ 1-1. セッション作成API（トランザクション対応）
   ファイル: src/routes/api/v1/sessions/index.ts
   
   ```typescript
   import { PrismaClient } from '@prisma/client'
   import { authenticateToken } from '../../../middleware/auth'
   
   const prisma = new PrismaClient()
   
   // セッション番号生成
   const generateSessionNumber = async (roomId: string): Promise<string> => {
     const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
     const count = await prisma.checkInSession.count({
       where: {
         sessionNumber: {
           startsWith: `${roomId}-${today}`
         }
       }
     })
     return `${roomId}-${today}-${String(count + 1).padStart(3, '0')}`
   }
   
   // POST /api/v1/sessions
   export const createSession = async (req: Request, res: Response) => {
     const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
     
     try {
       console.log(`🏨 [${transactionId}] セッション作成開始:`, req.body)
       
       const session = await prisma.$transaction(async (tx) => {
         // 1. セッション番号生成
         const sessionNumber = await generateSessionNumber(req.body.roomId)
         
         // 2. セッション作成
         const session = await tx.checkInSession.create({
           data: {
             tenantId: req.user.tenantId,
             roomId: req.body.roomId,
             sessionNumber,
             primaryGuestName: req.body.primaryGuestName,
             primaryGuestEmail: req.body.primaryGuestEmail,
             primaryGuestPhone: req.body.primaryGuestPhone,
             guestCount: req.body.guestCount || 1,
             checkedInAt: new Date(req.body.checkedInAt),
             expectedCheckOut: new Date(req.body.expectedCheckOut),
             notes: req.body.notes,
             specialRequests: req.body.specialRequests,
             createdBy: req.user.id
           }
         })
         
         // 3. ゲスト情報作成
         if (req.body.guests && req.body.guests.length > 0) {
           await tx.checkInGuest.createMany({
             data: req.body.guests.map((guest: any, index: number) => ({
               sessionId: session.id,
               guestNumber: index + 1,
               name: guest.name,
               ageGroup: guest.ageGroup || 'adult',
               gender: guest.gender,
               phone: guest.phone,
               email: guest.email,
               notes: guest.notes
             }))
           })
         }
         
         console.log(`✅ [${transactionId}] セッション作成完了:`, session.sessionNumber)
         return session
         
       }, {
         timeout: 30000,
         isolationLevel: 'ReadCommitted'
       })
       
       res.status(201).json({
         success: true,
         data: session
       })
       
     } catch (error) {
       console.error(`❌ [${transactionId}] セッション作成エラー:`, error)
       res.status(500).json({
         success: false,
         error: 'セッション作成に失敗しました',
         details: error.message
       })
     }
   }
   ```

□ 1-2. セッション取得API
   ファイル: src/routes/api/v1/sessions/by-room/[roomNumber].ts
   
   ```typescript
   // GET /api/v1/sessions/by-room/{roomNumber}
   export const getActiveSessionByRoom = async (req: Request, res: Response) => {
     try {
       const { roomNumber } = req.params
       
       const activeSession = await prisma.checkInSession.findFirst({
         where: {
           roomId: roomNumber,
           tenantId: req.user.tenantId,
           status: 'active'
         },
         include: {
           guests: true,
           orders: {
             where: { isDeleted: false },
             orderBy: { createdAt: 'desc' }
           }
         }
       })
       
       if (activeSession) {
         res.json({
           success: true,
           data: activeSession
         })
       } else {
         res.status(404).json({
           success: false,
           error: 'アクティブなセッションが見つかりません'
         })
       }
       
     } catch (error) {
       console.error('セッション取得エラー:', error)
       res.status(500).json({
         success: false,
         error: 'セッション取得に失敗しました'
       })
     }
   }
   ```

【Phase 2: 注文管理API基盤実装（24時間以内）】

□ 2-1. セッション対応注文作成API
   ファイル: src/routes/api/v1/orders/index.ts
   
   ```typescript
   // POST /api/v1/orders
   export const createOrder = async (req: Request, res: Response) => {
     const transactionId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
     
     try {
       console.log(`🛒 [${transactionId}] 注文作成開始:`, req.body)
       
       const order = await prisma.$transaction(async (tx) => {
         const { sessionId, items, notes } = req.body
         
         // 1. セッション存在確認
         if (sessionId) {
           const session = await tx.checkInSession.findUnique({
             where: { id: sessionId }
           })
           if (!session) {
             throw new Error('指定されたセッションが見つかりません')
           }
           if (session.status !== 'active') {
             throw new Error('セッションがアクティブではありません')
           }
         }
         
         // 2. 合計金額計算
         const total = items.reduce((sum: number, item: any) => 
           sum + (item.price * item.quantity), 0)
         
         // 3. 注文作成
         const order = await tx.order.create({
           data: {
             tenantId: req.user.tenantId,
             roomId: sessionId ? session.roomId : req.body.roomId,
             sessionId: sessionId,
             status: 'received',
             items: JSON.stringify(items),
             total: total
           }
         })
         
         // 4. 注文アイテム作成
         await tx.orderItem.createMany({
           data: items.map((item: any) => ({
             tenantId: req.user.tenantId,
             orderId: order.id,
             menuItemId: item.menuItemId,
             name: item.name,
             price: item.price,
             quantity: item.quantity,
             notes: item.notes || '',
             status: 'pending'
           }))
         })
         
         // 5. セッション請求更新
         if (sessionId) {
           await tx.checkInSession.update({
             where: { id: sessionId },
             data: {
               totalAmount: { increment: total },
               updatedAt: new Date()
             }
           })
         }
         
         console.log(`✅ [${transactionId}] 注文作成完了:`, order.id)
         return order
         
       }, {
         timeout: 30000,
         isolationLevel: 'ReadCommitted'
       })
       
       // WebSocket通知（非同期）
       notifyOrderCreated(order).catch(console.error)
       
       res.status(201).json({
         success: true,
         data: order
       })
       
     } catch (error) {
       console.error(`❌ [${transactionId}] 注文作成エラー:`, error)
       res.status(500).json({
         success: false,
         error: '注文作成に失敗しました',
         details: error.message
       })
     }
   }
   ```

【Phase 3: エラーハンドリング・監視基盤（24時間以内）】

□ 3-1. エラーハンドリングミドルウェア
   ファイル: src/middleware/errorHandler.ts
   
   ```typescript
   export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
     const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
     
     console.error(`❌ [${errorId}] エラー発生:`, {
       message: error.message,
       stack: error.stack,
       url: req.url,
       method: req.method,
       body: req.body,
       user: req.user?.id
     })
     
     // データベースエラー
     if (error.code === 'P2002') {
       return res.status(409).json({
         success: false,
         error: '重複データエラー',
         errorId
       })
     }
     
     // トランザクションタイムアウト
     if (error.message.includes('timeout')) {
       return res.status(408).json({
         success: false,
         error: '処理がタイムアウトしました',
         errorId
       })
     }
     
     // その他のエラー
     res.status(500).json({
       success: false,
       error: '内部サーバーエラー',
       errorId
     })
   }
   ```

□ 3-2. ヘルスチェックAPI
   ファイル: src/routes/api/health/index.ts
   
   ```typescript
   export const healthCheck = async (req: Request, res: Response) => {
     try {
       // データベース接続確認
       await prisma.$queryRaw`SELECT 1`
       
       // セッションテーブル確認
       const sessionCount = await prisma.checkInSession.count()
       
       // 注文テーブル確認
       const orderCount = await prisma.order.count()
       
       res.json({
         status: 'healthy',
         timestamp: new Date().toISOString(),
         database: 'connected',
         tables: {
           sessions: sessionCount,
           orders: orderCount
         }
       })
       
     } catch (error) {
       res.status(503).json({
         status: 'unhealthy',
         error: error.message
       })
     }
   }
   ```

【実装チェックリスト】
□ CheckInSessionテーブル作成完了
□ CheckInGuestテーブル作成完了
□ Order外部キー制約追加完了
□ マイグレーション実行完了
□ セッション作成API実装完了
□ セッション取得API実装完了
□ 注文作成API（トランザクション対応）実装完了
□ エラーハンドリングミドルウェア実装完了
□ ヘルスチェックAPI実装完了
□ 基盤テスト実行完了

【緊急デプロイ手順】
1. データベースマイグレーション実行
2. API実装・テスト
3. ヘルスチェック確認
4. hotel-saas連携テスト
5. 本番デプロイ

【技術的詳細】
- データベース: PostgreSQL + Prisma
- トランザクション: 30秒タイムアウト、ReadCommitted分離レベル
- エラーログ: 構造化ログ + エラーID付与
- 監視: ヘルスチェックAPI + メトリクス

作成日時: 2025年9月22日
緊急度: 最高（48時間以内実行必須）

