# JWT認証統一化・集約計画書

**作成日**: 2025年9月17日  
**目的**: JWT認証の重複実装解消と統一化  
**対象**: 全システム（hotel-saas, hotel-pms, hotel-member, hotel-common）

## 🎯 問題の現状

### 1. ドキュメント分散問題
- **JWT関連ドキュメント**: 307ファイルに散在
- **重複記述**: 同じ認証ロジックが複数箇所に記載
- **仕様不整合**: システム間でJWT実装が微妙に異なる

### 2. 実装重複問題
- **各APIで認証コード重複**: 同じJWT検証ロジックがAPI毎に実装
- **ミドルウェア不統一**: システム毎に異なる認証ミドルウェア
- **エラーハンドリング不統一**: 401/403/419の返し方がバラバラ

## 🏗️ 統一化戦略

### Phase 1: 共通認証基盤統一（hotel-common）

#### 1.1 統一JWTサービス
```typescript
// /Users/kaneko/hotel-common/src/auth/JWTAuthService.ts
export class JWTAuthService {
  // 全システム共通のJWT検証・生成
  async validateToken(token: string): Promise<HotelJWTPayload>
  async generateToken(user: User): Promise<TokenPair>
  async refreshToken(refreshToken: string): Promise<TokenPair>
  
  // 権限チェック
  async checkPermissions(token: HotelJWTPayload, requiredPermissions: string[]): Promise<boolean>
  async checkTenantAccess(token: HotelJWTPayload, tenantId: string): Promise<boolean>
}
```

#### 1.2 統一認証ミドルウェア
```typescript
// /Users/kaneko/hotel-common/src/middleware/UnifiedAuthMiddleware.ts
export class UnifiedAuthMiddleware {
  // 全システム共通の認証チェック
  async authenticate(request: Request): Promise<AuthResult>
  async authorize(user: HotelJWTPayload, resource: string, action: string): Promise<boolean>
  
  // エラーハンドリング統一
  handleAuthError(error: AuthError): StandardErrorResponse
}
```

### Phase 2: 各システム統合

#### 2.1 hotel-saas
```typescript
// server/middleware/00.unified-auth.ts → hotel-common経由に変更
import { UnifiedAuthMiddleware } from '/Users/kaneko/hotel-common/src/middleware/UnifiedAuthMiddleware'

export default defineEventHandler(async (event) => {
  const authMiddleware = new UnifiedAuthMiddleware()
  return await authMiddleware.authenticate(event)
})
```

#### 2.2 hotel-pms
```typescript
// server/middleware/auth.ts → 新規作成
import { UnifiedAuthMiddleware } from '/Users/kaneko/hotel-common/src/middleware/UnifiedAuthMiddleware'

// Luna（オフライン対応）特化の認証
export default defineEventHandler(async (event) => {
  const authMiddleware = new UnifiedAuthMiddleware()
  // オフライン時のフォールバック認証も含む
  return await authMiddleware.authenticateWithOfflineFallback(event)
})
```

#### 2.3 hotel-member
```typescript
// server/middleware/auth.ts → 新規作成  
import { UnifiedAuthMiddleware } from '/Users/kaneko/hotel-common/src/middleware/UnifiedAuthMiddleware'

// Suno（プライバシー強化）特化の認証
export default defineEventHandler(async (event) => {
  const authMiddleware = new UnifiedAuthMiddleware()
  // プライバシー保護強化認証
  return await authMiddleware.authenticateWithPrivacyEnhancement(event)
})
```

### Phase 3: API実装統一

#### 3.1 認証が必要なAPI実装パターン
```typescript
// 各システムの API実装例
// /api/v1/orders/create.post.ts

export default defineEventHandler(async (event) => {
  // ❌ 旧方式: 各APIで認証ロジック重複
  // const token = getHeader(event, 'authorization')
  // const user = await validateJWT(token) // 重複コード
  
  // ✅ 新方式: ミドルウェアで自動認証済み
  const user = event.context.user // ミドルウェアで設定済み
  const permissions = event.context.permissions // ミドルウェアで設定済み
  
  // 権限チェック（必要に応じて）
  if (!permissions.includes('order.create')) {
    throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
  }
  
  // ビジネスロジックに集中
  const order = await createOrder(body, user.tenant_id)
  return { success: true, order }
})
```

## 📋 実装チェックリスト

### Phase 1: hotel-common基盤
- [ ] `JWTAuthService` 統一実装
- [ ] `UnifiedAuthMiddleware` 作成
- [ ] 統一エラーレスポンス定義
- [ ] 権限管理システム統一
- [ ] Redis セッション管理統一

### Phase 2: 各システム移行
- [ ] hotel-saas: 既存ミドルウェア → hotel-common移行
- [ ] hotel-pms: 認証ミドルウェア新規実装
- [ ] hotel-member: 認証ミドルウェア新規実装
- [ ] 各システムの権限設定ファイル統一

### Phase 3: API統一
- [ ] 全APIから重複認証コード除去
- [ ] ミドルウェア依存に変更
- [ ] エラーハンドリング統一
- [ ] テスト実装

## 🎯 期待効果

### 1. 開発効率向上
- **コード重複削減**: 認証ロジックが1箇所に集約
- **実装速度向上**: 新API作成時の認証実装不要
- **バグ削減**: 統一実装によるバグ混入防止

### 2. 保守性向上
- **仕様変更対応**: 1箇所修正で全システム反映
- **セキュリティ強化**: 統一されたセキュリティポリシー
- **ドキュメント統一**: 認証関連ドキュメントの一元化

### 3. 運用効率向上
- **エラー対応統一**: 統一されたエラーメッセージとログ
- **監査対応**: 統一された認証ログ
- **スケーラビリティ**: システム追加時の認証実装簡素化

## 📚 統一ドキュメント構成

### 1. マスタードキュメント
- `/Users/kaneko/hotel-kanri/docs/architecture/JWT_UNIFIED_AUTHENTICATION_SPEC.md`
  - 全システム共通の認証仕様
  - 実装ガイドライン
  - エラーハンドリング仕様

### 2. システム別実装ガイド
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/auth/UNIFIED_AUTH_IMPLEMENTATION.md`
- `/Users/kaneko/hotel-kanri/docs/01_systems/pms/auth/UNIFIED_AUTH_IMPLEMENTATION.md`
- `/Users/kaneko/hotel-kanri/docs/01_systems/member/auth/UNIFIED_AUTH_IMPLEMENTATION.md`
- `/Users/kaneko/hotel-kanri/docs/01_systems/common/auth/JWT_AUTH_SERVICE_SPEC.md`

### 3. 移行ガイド
- `/Users/kaneko/hotel-kanri/docs/migration/JWT_AUTH_MIGRATION_GUIDE.md`
  - 既存実装からの移行手順
  - 互換性保持方法
  - テスト方法

---

## 📊 **セッション認証移行状況**

**更新日**: 2025年10月1日  
**進捗**: hotel-common API移行作業中

### **移行完了済みAPI（106個）**

#### ✅ **完全移行済み**

1. **認証API** - `src/routes/systems/common/auth.routes.ts` (5個)
2. **注文管理API** - `src/routes/api/v1/orders/index.ts` (9個)
3. **メディア管理API** - `src/routes/api/v1/media/` (5個)
4. **管理画面API** - `src/routes/systems/saas/admin-dashboard.routes.ts` (6個)
5. **ページ管理API** - `src/routes/systems/common/page.routes.ts` (8個)
6. **予約管理API** - `src/routes/systems/pms/reservation.routes.ts` (一括適用)
7. **セッション管理API** - `src/routes/api/v1/sessions/index.ts` (4個)
8. **レスポンスツリーAPI** - `src/routes/systems/member/response-tree.routes.ts` (13個)
9. **セッション移行API** - `src/routes/session-migration.routes.ts` (4個)
10. **スタッフ管理API** - `src/routes/systems/common/admin-staff.routes.ts` (7個)
11. **会計API** - `src/routes/systems/common/accounting.routes.ts` (6個)
12. **操作ログAPI** - `src/routes/systems/common/admin-operation-logs.routes.ts` (3個)
13. **フロント会計API** - `src/routes/systems/common/front-desk-accounting.routes.ts` (4個)
14. **フロントチェックインAPI** - `src/routes/systems/common/front-desk-checkin.routes.ts` (2個)
15. **フロントルームAPI** - `src/routes/systems/common/front-desk-rooms.routes.ts` (3個)
16. **メモ添付API** - `src/routes/systems/common/memo-attachments.routes.ts` (4個)
17. **メモ通知API** - `src/routes/systems/common/memo-notifications.routes.ts` (4個)
18. **メモ読取状態API** - `src/routes/systems/common/memo-read-status.routes.ts` (3個)
19. **メモAPI** - `src/routes/systems/common/memos.routes.ts` (5個)
20. **操作ログルートAPI** - `src/routes/systems/common/operation-logs.routes.ts` (5個)
21. **ルームグレードAPI** - `src/routes/systems/common/room-grades.routes.ts` (一括適用)
22. **ルームメモAPI** - `src/routes/systems/common/room-memos.routes.ts` (7個)
23. **デバイスステータスAPI** - `src/routes/systems/saas/device-status.routes.ts` (1個)
24. **デバイスルートAPI** - `src/routes/systems/saas/device.routes.ts` (一括適用)
25. **SaaS注文API** - `src/routes/systems/saas/orders.routes.ts` (8個)
26. **チェックインセッションAPI** - `src/routes/checkin-session.routes.ts` (6個)
27. **セッション請求API** - `src/routes/session-billing.routes.ts` (6個)
28. **PMSルームAPI** - `src/routes/systems/pms/room.routes.ts` (一括適用)
29. **統合サーバーAPI** - `src/server/integration-server.ts` (3個)
30. **アプリランチャーAPI** - `src/integrations/app-launcher/api-endpoints.ts` (12個)

### **移行進捗率**
- **完了**: 106個のAPI
- **推定残り**: 約94個のAPI
- **進捗率**: 約53.0%

### **次の移行対象**
リストの上から順番に未対応のAPIをセッション方式に変更中。重複記載なく進行。

---

**次のアクション**: hotel-common API移行の継続実行
