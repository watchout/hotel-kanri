# 🚀 実装統一マスターガイド

**作成日**: 2025年10月1日  
**バージョン**: 1.0.0  
**適用範囲**: hotel-saas, hotel-pms, hotel-member, hotel-common

---

## 📋 **実装の基本原則**

### **✅ 必須原則**
1. **統一仕様書準拠**: `/docs/AUTHENTICATION_MASTER_SPECIFICATION.md` に従う
2. **重複実装禁止**: 同じ機能を複数箇所で実装しない
3. **KISS原則**: Keep It Simple, Stupid
4. **Single Source of Truth**: 1つの機能は1つの実装

### **❌ 禁止事項**
1. **JWT認証の実装**: 完全廃止
2. **独自認証システム**: 作成禁止
3. **複数認証方式の混在**: 統一認証のみ使用
4. **各APIでの個別認証**: ミドルウェアを使用

---

## 🔧 **セッション認証実装ガイド**

### **1. 基本セットアップ**

#### **Redis設定**
```bash
# .env
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-password
REDIS_DB=0
```

#### **依存関係**
```bash
npm install redis
npm install @types/redis
```

### **2. ミドルウェア実装**

#### **統一認証ミドルウェア**
```typescript
// server/middleware/01.session-auth.ts
import { redis } from '~/server/utils/redis'

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

#### **パブリックパス判定**
```typescript
// server/utils/auth.ts
export function isPublicPath(path: string): boolean {
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/health',
    '/_nuxt',
    '/favicon.ico'
  ]
  
  return publicPaths.some(publicPath => 
    path.startsWith(publicPath)
  )
}
```

### **3. 認証API実装**

#### **ログインAPI**
```typescript
// server/api/auth/login.post.ts
export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event)
  
  // 認証情報検証
  const user = await validateCredentials(email, password)
  if (!user) {
    throw createError({ 
      statusCode: 401, 
      statusMessage: 'ログイン失敗' 
    })
  }

  // セッション作成
  const sessionId = crypto.randomUUID()
  const sessionData = {
    user_id: user.id,
    tenant_id: user.tenant_id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    created_at: Date.now(),
    expires_at: Date.now() + 3600000 // 1時間
  }

  await redis.setex(
    `session:${sessionId}`, 
    3600, 
    JSON.stringify(sessionData)
  )

  // Cookie設定
  setCookie(event, 'session-id', sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600
  })

  return { success: true, user }
})
```

#### **ログアウトAPI**
```typescript
// server/api/auth/logout.post.ts
export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'session-id')
  
  if (sessionId) {
    // セッション削除
    await redis.del(`session:${sessionId}`)
  }

  // Cookie削除
  deleteCookie(event, 'session-id')

  return { success: true }
})
```

### **4. 保護されたAPI実装**

#### **基本パターン**
```typescript
// server/api/protected-endpoint.ts
export default defineEventHandler(async (event) => {
  // ミドルウェアで認証済み
  const user = event.context.user
  
  // 権限チェック（必要に応じて）
  if (user.role !== 'admin') {
    throw createError({ 
      statusCode: 403, 
      statusMessage: '権限不足' 
    })
  }
  
  // ビジネスロジック
  return await processRequest(user)
})
```

#### **テナント分離**
```typescript
// server/api/tenant-data.ts
export default defineEventHandler(async (event) => {
  const user = event.context.user
  
  // テナント分離
  const data = await getData({
    tenant_id: user.tenant_id
  })
  
  return data
})
```

---

## 🎨 **フロントエンド実装**

### **1. 認証Composable**

```typescript
// composables/useAuth.ts
export const useAuth = () => {
  const user = ref(null)
  const isLoggedIn = computed(() => !!user.value)

  const login = async (email: string, password: string) => {
    try {
      const { data } = await $fetch('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      })
      user.value = data.user
      return data
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
      user.value = null
      await navigateTo('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const checkAuth = async () => {
    try {
      const { data } = await $fetch('/api/auth/me')
      user.value = data.user
    } catch (error) {
      user.value = null
    }
  }

  return {
    user: readonly(user),
    isLoggedIn,
    login,
    logout,
    checkAuth
  }
}
```

### **2. 認証ミドルウェア**

```typescript
// middleware/auth.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn } = useAuth()
  
  const publicRoutes = ['/login', '/register', '/']
  
  if (!isLoggedIn.value && !publicRoutes.includes(to.path)) {
    return navigateTo('/login')
  }
})
```

---

## 🔒 **セキュリティ実装**

### **1. Cookie セキュリティ**
```typescript
const cookieOptions = {
  httpOnly: true,      // XSS対策
  secure: true,        // HTTPS必須
  sameSite: 'strict',  // CSRF対策
  maxAge: 3600         // 1時間
}
```

### **2. セッション管理**
```typescript
// セッション延長
export async function extendSession(sessionId: string) {
  const exists = await redis.exists(`session:${sessionId}`)
  if (exists) {
    await redis.expire(`session:${sessionId}`, 3600)
  }
}

// セッション無効化
export async function invalidateSession(sessionId: string) {
  await redis.del(`session:${sessionId}`)
}
```

### **3. 権限チェック**
```typescript
export function hasPermission(
  user: UserSession, 
  permission: string
): boolean {
  return user.permissions.includes(permission)
}

export function hasRole(
  user: UserSession, 
  role: string
): boolean {
  const roleHierarchy = {
    'admin': ['admin', 'manager', 'staff'],
    'manager': ['manager', 'staff'],
    'staff': ['staff']
  }
  
  return roleHierarchy[user.role]?.includes(role) || false
}
```

---

## 🧪 **テスト実装**

### **1. 認証テスト**
```typescript
// tests/auth.test.ts
describe('Authentication', () => {
  test('login success', async () => {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'password'
      }
    })
    
    expect(response.success).toBe(true)
    expect(response.user).toBeDefined()
  })

  test('login failure', async () => {
    await expect($fetch('/api/auth/login', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        password: 'wrong-password'
      }
    })).rejects.toThrow()
  })
})
```

### **2. セッションテスト**
```typescript
// tests/session.test.ts
describe('Session Management', () => {
  test('session creation', async () => {
    const sessionId = 'test-session-id'
    const userData = { user_id: '123', email: 'test@example.com' }
    
    await redis.setex(
      `session:${sessionId}`, 
      3600, 
      JSON.stringify(userData)
    )
    
    const stored = await redis.get(`session:${sessionId}`)
    expect(JSON.parse(stored)).toEqual(userData)
  })
})
```

---

## 📊 **パフォーマンス最適化**

### **1. Redis最適化**
```typescript
// Redis接続プール
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  lazyConnect: true
})
```

### **2. セッション最適化**
```typescript
// セッションデータの最小化
const minimalSessionData = {
  user_id: user.id,
  tenant_id: user.tenant_id,
  role: user.role,
  // 必要最小限のデータのみ
}
```

---

## 🚨 **エラーハンドリング**

### **1. 統一エラーレスポンス**
```typescript
// 401: 未認証
throw createError({ 
  statusCode: 401, 
  statusMessage: 'ログインが必要です' 
})

// 403: 権限不足
throw createError({ 
  statusCode: 403, 
  statusMessage: '権限不足' 
})

// 500: サーバーエラー
throw createError({ 
  statusCode: 500, 
  statusMessage: 'サーバーエラー' 
})
```

### **2. エラーログ**
```typescript
export function logAuthError(error: Error, context: any) {
  console.error('Auth Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  })
}
```

---

## ✅ **実装チェックリスト**

### **基本実装**
- [ ] Redis設定完了
- [ ] 統一認証ミドルウェア実装
- [ ] ログイン/ログアウトAPI実装
- [ ] フロントエンド認証Composable実装

### **セキュリティ**
- [ ] HttpOnly Cookie設定
- [ ] CSRF対策実装
- [ ] セッション有効期限設定
- [ ] 権限チェック実装

### **テスト**
- [ ] 認証テスト作成
- [ ] セッションテスト作成
- [ ] 権限テスト作成
- [ ] エラーハンドリングテスト作成

### **パフォーマンス**
- [ ] Redis接続最適化
- [ ] セッションデータ最小化
- [ ] キャッシュ戦略実装

---

**この統一ガイドに従って実装することで、一貫性のある高品質な認証システムが構築できます。**
