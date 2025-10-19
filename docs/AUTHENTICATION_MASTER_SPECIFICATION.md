# 🔐 認証システム統一仕様書（マスター）

**作成日**: 2025年10月1日  
**バージョン**: 1.0.0  
**適用範囲**: hotel-saas, hotel-pms, hotel-member, hotel-common

---

## 📋 **認証方式の確定**

### **✅ 採用方式: セッション認証**
- **技術**: Redis + HttpOnly Cookie
- **理由**: 開発効率、デバッグ容易性、セキュリティのバランス
- **適用**: 全システム統一

### **❌ 廃止方式: JWT認証**
- **廃止日**: 2025年10月1日
- **理由**: 実装複雑化、バグ多発、開発効率低下

---

## 🎯 **セッション認証仕様**

### **1. 基本構成**

```typescript
// セッション構造
interface UserSession {
  user_id: string        // ユーザーID (UUID)
  tenant_id: string      // テナントID (UUID)
  email: string          // メールアドレス
  role: 'admin' | 'manager' | 'staff'  // 役割
  permissions: string[]  // 権限配列
  created_at: number     // 作成時刻
  expires_at: number     // 有効期限
}

// Cookie設定
const cookieOptions = {
  httpOnly: true,        // XSS対策
  secure: true,          // HTTPS必須
  sameSite: 'strict',    // CSRF対策
  maxAge: 3600           // 1時間
}
```

### **2. 認証フロー**

#### **ログイン**
```typescript
// 1. 認証情報検証
const user = await validateCredentials(email, password)

// 2. セッション作成
const sessionId = crypto.randomUUID()
await redis.setex(`session:${sessionId}`, 3600, JSON.stringify(user))

// 3. Cookie設定
setCookie(event, 'session-id', sessionId, cookieOptions)
```

#### **認証確認**
```typescript
// 1. Cookie取得
const sessionId = getCookie(event, 'session-id')

// 2. セッション確認
const userData = await redis.get(`session:${sessionId}`)
if (!userData) throw createError({ statusCode: 401 })

// 3. ユーザー情報設定
event.context.user = JSON.parse(userData)
```

#### **ログアウト**
```typescript
// 1. セッション削除
await redis.del(`session:${sessionId}`)

// 2. Cookie削除
deleteCookie(event, 'session-id')
```

### **3. セキュリティ対策**

#### **Cookie セキュリティ**
- `HttpOnly`: JavaScript からアクセス不可
- `Secure`: HTTPS 通信でのみ送信
- `SameSite=strict`: CSRF 攻撃防止

#### **セッション管理**
- **有効期限**: 1時間（自動延長可能）
- **Redis TTL**: セッション有効期限と同期
- **セッション無効化**: ログアウト時に即座削除

#### **権限管理**
```typescript
// 権限レベル
const PERMISSION_LEVELS = {
  public: 0,     // 認証不要
  user: 1,       // ログイン必須
  admin: 2       // 管理者権限必須
}

// 権限チェック
function checkPermission(user: UserSession, requiredLevel: number) {
  const userLevel = PERMISSION_LEVELS[user.role] || 0
  return userLevel >= requiredLevel
}
```

---

## 🚀 **実装ガイド**

### **1. ミドルウェア実装**

```typescript
// server/middleware/01.session-auth.ts
export default defineEventHandler(async (event) => {
  const path = event.node.req.url

  // パブリックAPIはスキップ
  if (isPublicPath(path)) return

  const sessionId = getCookie(event, 'session-id')
  if (!sessionId) {
    throw createError({ 
      statusCode: 401, 
      statusMessage: 'ログインが必要です' 
    })
  }

  const userData = await redis.get(`session:${sessionId}`)
  if (!userData) {
    throw createError({ 
      statusCode: 401, 
      statusMessage: 'セッションが無効です' 
    })
  }

  event.context.user = JSON.parse(userData)
})
```

### **2. API実装パターン**

```typescript
// server/api/protected-endpoint.ts
export default defineEventHandler(async (event) => {
  // ミドルウェアで設定済み
  const user = event.context.user
  
  // 権限チェック（必要に応じて）
  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: '権限不足' })
  }
  
  // ビジネスロジック
  return await processRequest(user)
})
```

### **3. フロントエンド実装**

```typescript
// composables/useAuth.ts
export const useAuth = () => {
  const login = async (email: string, password: string) => {
    const { data } = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    })
    return data
  }

  const logout = async () => {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await navigateTo('/login')
  }

  return { login, logout }
}
```

---

## 📊 **パフォーマンス指標**

### **目標値**
- **認証処理時間**: < 10ms
- **セッション確認**: < 5ms
- **メモリ使用量**: < 1KB/セッション
- **Redis接続**: < 2ms

### **監視項目**
- アクティブセッション数
- 認証エラー率
- セッション有効期限切れ率
- Redis接続エラー率

---

## 🔧 **環境設定**

### **Redis設定**
```bash
# .env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password
REDIS_DB=0
```

### **Cookie設定**
```bash
# .env
COOKIE_SECRET=your-secret-key
COOKIE_DOMAIN=.yourdomain.com
COOKIE_SECURE=true
```

---

## 📚 **関連ドキュメント**

### **アーキテクチャ**
- `/docs/01_systems/saas/AUTHENTICATION_ARCHITECTURE.md`

### **統一化計画**
- `/docs/architecture/JWT_AUTHENTICATION_CONSOLIDATION_PLAN.md`

### **廃止通知**
- `/docs/JWT_DEPRECATION_NOTICE.md`

---

## ⚠️ **重要事項**

### **統一原則**
1. **全システム共通**: この仕様に従う
2. **例外禁止**: 独自実装は一切禁止
3. **参照必須**: 実装前にこのドキュメントを確認

### **変更管理**
- **変更提案**: プロジェクト責任者承認必須
- **実装変更**: 全システム同時適用
- **ドキュメント更新**: 変更と同時に実施

---

**この仕様書が認証システムの唯一の正式仕様です。**  
**他のドキュメントで異なる記載がある場合は、この仕様書が優先されます。**
