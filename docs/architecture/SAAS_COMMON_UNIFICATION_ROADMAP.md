# 🎯 hotel-saas & hotel-common 統一化ロードマップ

**作成日**: 2025年9月17日  
**対象**: hotel-saas・hotel-common開発者  
**目的**: JWT認証統一化の具体的実装手順

---

## 📋 **参照必須ドキュメント（優先順）**

### **🔴 Phase 1: 認証基盤統一（最優先）**

#### **1.1 hotel-saas側 参照ドキュメント**
1. **`/Users/kaneko/hotel-kanri/docs/01_systems/saas/auth/JWT_AUTH_IMPLEMENTATION.md`** ⭐⭐⭐
   - 現在の実装状況確認
   - 統一認証ミドルウェアの詳細
   - AuthServiceの使用方法

2. **`/Users/kaneko/hotel-kanri/docs/01_systems/saas/auth/JWT_AUTH_DESIGN.md`** ⭐⭐
   - JWT設計思想
   - トークン構造
   - エラーハンドリング仕様

#### **1.2 hotel-common側 参照ドキュメント**
1. **`/Users/kaneko/hotel-kanri/docs/01_systems/common/integration/specifications/jwt-token-specification.md`** ⭐⭐⭐
   - 統一JWT仕様
   - HotelJWTPayload構造
   - システム間通信JWT

2. **`/Users/kaneko/hotel-kanri/docs/01_systems/common/api/HOTEL_SAAS_API_GUIDE.md`** ⭐⭐
   - hotel-saas向けAPI一覧
   - 認証フロー
   - 使用方法とサンプルコード

#### **1.3 統合仕様書**
1. **`/Users/kaneko/hotel-kanri/docs/api/migration-guide-saas-common.md`** ⭐⭐⭐
   - Staff統一移行ガイド
   - 実装方針（禁止事項・必須事項）
   - Phase別実装ガイド

---

## 🔧 **Phase 1: 具体的実装手順**

### **Step 1: 現状確認（必須）**

#### **hotel-saas確認項目**
```bash
# 1. 現在の認証実装確認
cd /Users/kaneko/hotel-saas
find server -name "*auth*" -type f
find server/middleware -name "*.ts" | grep -E "(auth|unified)"

# 2. TypeScriptエラー確認
npm run type-check
# ✅ Found 0 errors. 必須

# 3. 現在のAuthService確認
grep -r "AuthService\|HotelSaasAuth" server/
```

#### **hotel-common確認項目**
```bash
# 1. JWT基盤実装確認
cd /Users/kaneko/hotel-common
find . -name "*auth*" -type f
find . -name "*jwt*" -type f

# 2. TypeScriptエラー確認
npm run type-check
# ✅ Found 0 errors. 必須

# 3. HotelSaasAuth実装確認
grep -r "HotelSaasAuth\|JWT" src/
```

### **Step 2: 統一認証実装**

#### **hotel-common側実装**
**参照**: `/Users/kaneko/hotel-kanri/docs/01_systems/common/integration/specifications/jwt-token-specification.md`

```typescript
// src/auth/JWTAuthService.ts
export class JWTAuthService {
  async validateToken(token: string): Promise<HotelJWTPayload | null>
  async generateToken(user: Staff): Promise<TokenPair>
  async refreshToken(refreshToken: string): Promise<TokenPair>
  
  // 権限チェック
  async checkPermissions(token: HotelJWTPayload, requiredPermissions: string[]): Promise<boolean>
  async checkTenantAccess(token: HotelJWTPayload, tenantId: string): Promise<boolean>
}

// src/middleware/UnifiedAuthMiddleware.ts
export class UnifiedAuthMiddleware {
  async authenticate(request: Request): Promise<AuthResult>
  async authorize(user: HotelJWTPayload, resource: string, action: string): Promise<boolean>
  handleAuthError(error: AuthError): StandardErrorResponse
}
```

#### **hotel-saas側実装**
**参照**: `/Users/kaneko/hotel-kanri/docs/01_systems/saas/auth/JWT_AUTH_IMPLEMENTATION.md`

```typescript
// server/middleware/00.unified-auth.ts → hotel-common経由に変更
import { UnifiedAuthMiddleware } from '/Users/kaneko/hotel-common/src/middleware/UnifiedAuthMiddleware'

export default defineEventHandler(async (event) => {
  const authMiddleware = new UnifiedAuthMiddleware()
  return await authMiddleware.authenticate(event)
})

// server/utils/authService.ts → hotel-common経由に変更
import { JWTAuthService } from '/Users/kaneko/hotel-common/src/auth/JWTAuthService'

export function getAuthService() {
  return new JWTAuthService()
}
```

### **Step 3: API統一実装**

#### **重複認証コード除去**
**参照**: `/Users/kaneko/hotel-kanri/docs/api/migration-guide-saas-common.md`

```typescript
// ❌ 旧方式: 各APIで認証ロジック重複
export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization') // 重複
  const user = await validateJWT(token)           // 重複
  if (!user) throw createError(401)              // 重複
  
  // ビジネスロジック
})

// ✅ 新方式: ミドルウェアで自動認証済み
export default defineEventHandler(async (event) => {
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

---

## ⚠️ **実装時の注意事項**

### **❌ 禁止事項（厳守）**
**参照**: `/Users/kaneko/hotel-kanri/docs/api/migration-guide-saas-common.md` (Line 16-31)

- ❌ フォールバック処理（エラー時の代替処理）
- ❌ モックデータの使用
- ❌ 一時的な回避実装
- ❌ try-catch での例外隠蔽
- ❌ デフォルト値での問題回避
- ❌ 「とりあえず動く」実装

### **✅ 必須事項**
**参照**: `/Users/kaneko/hotel-kanri/docs/api/migration-guide-saas-common.md` (Line 32-40)

- ✅ エラーは必ず表面化させる
- ✅ 問題の根本原因を特定・解決
- ✅ 適切なエラーハンドリング（隠蔽ではない）
- ✅ 実装前の依存関係確認
- ✅ 段階的だが確実な実装

---

## 📊 **実装チェックリスト**

### **Phase 1: 認証基盤統一**
- [ ] hotel-common: JWTAuthService実装
- [ ] hotel-common: UnifiedAuthMiddleware実装
- [ ] hotel-saas: 既存AuthService → hotel-common移行
- [ ] hotel-saas: 統一認証ミドルウェア → hotel-common移行
- [ ] 統一エラーハンドリング実装
- [ ] TypeScriptエラー0件確認

### **Phase 2: API統一**
- [ ] 全APIから重複認証コード除去
- [ ] ミドルウェア依存に変更
- [ ] 権限チェック統一
- [ ] エラーレスポンス統一

### **Phase 3: テスト・検証**
- [ ] 認証フロー動作確認
- [ ] API疎通確認
- [ ] エラーハンドリング確認
- [ ] パフォーマンス確認

---

## 🎯 **次のアクション**

1. **現状確認**: 上記Step 1の確認項目を実行
2. **実装開始**: TypeScriptエラー0件確認後にPhase 1開始
3. **進捗報告**: 各Step完了時に報告

**この統一化により、JWT認証の重複実装が解消され、保守性・セキュリティが大幅に向上します。**
