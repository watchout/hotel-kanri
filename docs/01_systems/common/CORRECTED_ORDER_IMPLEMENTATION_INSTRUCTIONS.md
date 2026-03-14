=== hotel-common 注文管理システム実装指示書 ===

【対象】hotel-commonチーム
【作成日】2025年9月29日
【役割】設計・実装指示（実装は開発チームが実施）

【重要】現状確認結果
✅ Prismaスキーマ: Order-checkin_sessions外部キー制約設定済み
✅ 認証ミドルウェア: authenticateToken実装済み
❌ API実装ファイルが存在するが検証・修正が必要

【必読ドキュメント（絶対パス）】
★★★ /Users/kaneko/hotel-kanri/docs/architecture/CHECKIN_SESSION_DESIGN_PROPOSAL.md
★★☆ /Users/kaneko/hotel-common/src/auth/middleware.ts
★☆☆ /Users/kaneko/hotel-common/prisma/schema.prisma

【Phase 1: 既存実装の検証・修正】

□ 1-1. 現在の実装ファイル検証
   対象ファイル:
   - /Users/kaneko/hotel-common/src/routes/api/v1/orders/index.ts
   - /Users/kaneko/hotel-common/src/routes/api/v1/sessions/index.ts
   - /Users/kaneko/hotel-common/src/routes/api/v1/index.ts

   検証項目:
   - TypeScript型安全性の確認
   - Prismaクライアント使用方法の確認
   - エラーハンドリングの適切性
   - 認証ミドルウェア統合の確認

□ 1-2. 必要な修正点
   
   **A. Prismaクライアント使用方法**
   ```typescript
   // 修正前（問題のある使用方法）
   import { PrismaClient } from '../../../generated/prisma';
   const prisma = new PrismaClient();
   
   // 修正後（推奨される使用方法）
   import { hotelDb } from '../../../database/prisma';
   // hotelDb を使用してデータベースアクセス
   ```

   **B. 認証ミドルウェア統合**
   ```typescript
   // 確認必要: req.user の型定義
   interface AuthenticatedRequest extends Request {
     user: {
       tenantId: string;
       userId: string;
       role: string;
     }
   }
   ```

   **C. エラーレスポンス統一**
   ```typescript
   // 推奨: StandardResponseBuilder使用
   import { StandardResponseBuilder } from '../../../utils/response-builder';
   
   // エラー時
   res.status(500).json(
     StandardResponseBuilder.error('注文作成に失敗しました', error.message)
   );
   ```

【Phase 2: API仕様の確認・調整】

□ 2-1. 注文作成API仕様確認
   エンドポイント: POST /api/v1/orders
   
   **リクエスト仕様**:
   ```json
   {
     "sessionId": "string (optional)",
     "roomId": "string (optional, sessionIdがない場合必須)",
     "items": [
       {
         "menuItemId": "number",
         "name": "string",
         "price": "number",
         "quantity": "number",
         "notes": "string (optional)"
       }
     ],
     "notes": "string (optional)"
   }
   ```

   **レスポンス仕様**:
   ```json
   {
     "success": true,
     "data": {
       "id": "number",
       "tenantId": "string",
       "roomId": "string",
       "sessionId": "string",
       "status": "received",
       "total": "number",
       "createdAt": "ISO string"
     }
   }
   ```

□ 2-2. セッション管理API仕様確認
   エンドポイント: POST /api/v1/sessions
   
   **リクエスト仕様**:
   ```json
   {
     "roomId": "string",
     "primaryGuestName": "string",
     "primaryGuestEmail": "string (optional)",
     "primaryGuestPhone": "string (optional)",
     "guestCount": "number (default: 1)",
     "checkedInAt": "ISO string",
     "expectedCheckOut": "ISO string",
     "notes": "string (optional)",
     "specialRequests": "string (optional)"
   }
   ```

【Phase 3: テスト・検証】

□ 3-1. 単体テスト実装
   テストファイル作成:
   - /Users/kaneko/hotel-common/src/__tests__/orders-api.test.ts
   - /Users/kaneko/hotel-common/src/__tests__/sessions-api.test.ts

   テスト項目:
   - 正常系: 注文作成、セッション作成
   - 異常系: 不正なリクエスト、認証エラー
   - エッジケース: セッション存在しない場合等

□ 3-2. 統合テスト
   ```bash
   # 開発サーバー起動
   npm run dev
   
   # API動作確認
   curl -X POST http://localhost:3400/api/v1/sessions \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer {token}" \
     -d '{
       "roomId": "101",
       "primaryGuestName": "テストゲスト",
       "checkedInAt": "2025-09-29T15:00:00Z",
       "expectedCheckOut": "2025-09-30T11:00:00Z"
     }'
   ```

【Phase 4: hotel-saas連携準備】

□ 4-1. CORS設定確認
   hotel-saasからのアクセスを許可する設定確認

□ 4-2. 環境変数設定
   ```env
   # .env ファイル確認
   JWT_SECRET=your-secret-key
   DATABASE_URL=your-database-url
   HOTEL_COMMON_PORT=3400
   ```

□ 4-3. API仕様書更新
   OpenAPI/Swagger仕様書の更新
   - 注文管理API仕様
   - セッション管理API仕様

【実装チェックリスト】
□ 既存実装ファイルの検証完了
□ Prismaクライアント使用方法修正完了
□ 認証ミドルウェア統合確認完了
□ エラーハンドリング統一完了
□ API仕様確認・調整完了
□ 単体テスト実装完了
□ 統合テスト実行完了
□ hotel-saas連携準備完了

【技術的詳細】
- データベース: PostgreSQL + Prisma
- 認証: JWT (既存middleware使用)
- API形式: REST API (Express Router)
- レスポンス形式: StandardResponseBuilder使用
- ログ: HotelLogger使用

【重要な制約事項】
❌ 新規Prismaクライアントインスタンス作成禁止
❌ 独自認証実装禁止（既存middleware使用）
❌ 非標準レスポンス形式禁止
✅ 既存インフラ・パターンの活用必須
✅ 型安全性の確保必須
✅ エラーハンドリングの統一必須

【完了報告】
各Phase完了時に以下を報告：
1. 実装内容の概要
2. テスト結果
3. 発見された問題と対応
4. 次Phaseへの引き継ぎ事項

作成者: システム設計担当
実装担当: hotel-commonチーム
連携先: hotel-saasチーム

