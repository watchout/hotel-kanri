# SSO フロントエンド実装ガイド (SSO Frontend Implementation Guide)

**作成日**: 2024年12月28日  
**バージョン**: 1.0.0  
**対象システム**: hotel-member, hotel-pms, hotel-saas (フロントエンド)  
**基盤**: 統一認証基盤 (JWT + Redis + SSO)

## 1. 概要 (Overview)

### 1.1 SSO実装方針
- **統一ログインUI**: 3システム共通のログイン画面・UX
- **シームレス認証**: 一度ログインすれば全システムにアクセス可能
- **セッション管理**: フロント側の安全なセッション保持方法
- **自動リダイレクト**: 未認証時の自動ログイン画面誘導

### 1.2 技術スタック
- **認証基盤**: hotel-common JWT + Redis
- **フロントエンド**: Vue 3 / Nuxt 3 (hotel-member, hotel-saas), React (hotel-pms想定)
- **状態管理**: Pinia (Vue), Redux Toolkit (React)
- **HTTP通信**: axios (統一)

## 2. セッション管理設計 (Session Management Design)

### 2.1 フロント側セッション保持方式

#### 2.1.1 セキュアCookie + LocalStorage ハイブリッド方式

```typescript
// セッション管理インターフェース
interface FrontendSessionManager {
  // セキュアCookie（HttpOnly + Secure + SameSite）
  secureSession: {
    refreshToken: string      // HttpOnly Cookie（XSS対策）
    sessionId: string         // HttpOnly Cookie  
    tenantId: string         // HttpOnly Cookie
  }
  
  // LocalStorage（アクセストークン・ユーザー情報）
  localStorage: {
    accessToken: string       // 短期間（8時間）
    userInfo: UserInfo        // 表示用ユーザー情報
    permissions: string[]     // フロント権限制御用
  }
  
  // SessionStorage（一時データ）
  sessionStorage: {
    lastActivity: Date        // 最終アクティビティ時間
    currentSystem: string     // 現在のシステム
  }
}
```

#### 2.1.2 Cookie設定仕様

```typescript
// SSO Cookie 設定
export const SSO_COOKIE_CONFIG = {
  // リフレッシュトークン（最重要）
  refreshToken: {
    name: 'hotel_refresh_token',
    httpOnly: true,           // XSS攻撃対策
    secure: true,            // HTTPS必須
    sameSite: 'none',        // Cross-domain対応
    domain: '.hotel-domain.com', // 共通ドメイン
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30日
    path: '/'
  },
  
  // セッションID
  sessionId: {
    name: 'hotel_session_id',
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: '.hotel-domain.com',
    maxAge: 8 * 60 * 60 * 1000, // 8時間
    path: '/'
  },
  
  // テナントID
  tenantId: {
    name: 'hotel_tenant_id',
    httpOnly: false,         // フロントからアクセス必要
    secure: true,
    sameSite: 'none',
    domain: '.hotel-domain.com',
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1年
    path: '/'
  }
}
```

### 2.2 自動トークンリフレッシュ機能

```typescript
// 自動リフレッシュ管理クラス
export class TokenRefreshManager {
  private refreshTimer: NodeJS.Timeout | null = null
  private refreshInProgress = false

  /**
   * 自動リフレッシュ開始
   */
  startAutoRefresh(accessToken: string): void {
    const payload = this.decodeJWT(accessToken)
    const expiresIn = payload.exp * 1000 - Date.now()
    const refreshAt = expiresIn - (5 * 60 * 1000) // 5分前にリフレッシュ

    this.refreshTimer = setTimeout(() => {
      this.refreshToken()
    }, refreshAt)
  }

  /**
   * トークンリフレッシュ実行
   */
  private async refreshToken(): Promise<void> {
    if (this.refreshInProgress) return
    this.refreshInProgress = true

    try {
      const response = await axios.post('/api/auth/refresh', {}, {
        withCredentials: true // Cookie送信
      })

      if (response.data.success) {
        // 新しいアクセストークンを保存
        localStorage.setItem('accessToken', response.data.data.access_token)
        
        // ユーザー情報更新
        this.updateUserInfo(response.data.data.user)
        
        // 次回リフレッシュ設定
        this.startAutoRefresh(response.data.data.access_token)
        
        // アクセストークン更新イベント発行
        window.dispatchEvent(new CustomEvent('tokenRefreshed', {
          detail: response.data.data
        }))
      }
    } catch (error) {
      // リフレッシュ失敗時はログアウト処理
      this.handleRefreshFailure()
    } finally {
      this.refreshInProgress = false
    }
  }

  /**
   * リフレッシュ失敗時処理
   */
  private handleRefreshFailure(): void {
    // セッション情報クリア
    localStorage.removeItem('accessToken')
    localStorage.removeItem('userInfo')
    
    // ログイン画面にリダイレクト
    window.location.href = '/auth/login'
  }
}
```

## 3. 統一ログインUI設計 (Unified Login UI Design)

### 3.1 共通ログイン画面仕様

#### 3.1.1 デザインシステム統一

```vue
<!-- 共通ログインコンポーネント -->
<template>
  <div class="hotel-login-container">
    <!-- ホテルブランドヘッダー -->
    <div class="brand-header">
      <img :src="tenantInfo.logo" :alt="tenantInfo.name" />
      <h1>{{ tenantInfo.name }}</h1>
    </div>

    <!-- ログインフォーム -->
    <form @submit.prevent="handleLogin" class="login-form">
      <!-- テナント選択（必要に応じて） -->
      <div class="form-group" v-if="showTenantSelector">
        <label for="tenant">ホテル・グループ</label>
        <select v-model="loginForm.tenantId" id="tenant" required>
          <option v-for="tenant in availableTenants" 
                  :key="tenant.id" 
                  :value="tenant.id">
            {{ tenant.name }}
          </option>
        </select>
      </div>

      <!-- メールアドレス -->
      <div class="form-group">
        <label for="email">メールアドレス</label>
        <input 
          v-model="loginForm.email"
          type="email" 
          id="email" 
          required
          :disabled="loading"
          placeholder="user@hotel.com"
        />
      </div>

      <!-- パスワード -->
      <div class="form-group">
        <label for="password">パスワード</label>
        <input 
          v-model="loginForm.password"
          type="password" 
          id="password" 
          required
          :disabled="loading"
        />
      </div>

      <!-- Remember Me -->
      <div class="form-group checkbox-group">
        <input 
          v-model="loginForm.rememberMe"
          type="checkbox" 
          id="remember"
        />
        <label for="remember">ログイン状態を保持する</label>
      </div>

      <!-- エラーメッセージ -->
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <!-- ログインボタン -->
      <button 
        type="submit" 
        class="login-button"
        :disabled="loading"
      >
        <span v-if="loading" class="loading-spinner"></span>
        {{ loading ? 'ログイン中...' : 'ログイン' }}
      </button>
    </form>

    <!-- フッター -->
    <div class="login-footer">
      <a href="/auth/forgot-password">パスワードを忘れた方</a>
      <div class="system-info">
        {{ systemName }} v{{ version }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

interface LoginForm {
  tenantId: string
  email: string
  password: string
  rememberMe: boolean
}

const authStore = useAuthStore()
const loading = ref(false)
const errorMessage = ref('')
const loginForm = ref<LoginForm>({
  tenantId: '',
  email: '',
  password: '',
  rememberMe: false
})

const handleLogin = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    await authStore.login(loginForm.value)
    
    // ログイン成功時のリダイレクト
    const redirectTo = new URLSearchParams(window.location.search).get('redirect')
    window.location.href = redirectTo || getDashboardUrl()
  } catch (error: any) {
    errorMessage.value = error.message || 'ログインに失敗しました'
  } finally {
    loading.value = false
  }
}

// システム別ダッシュボードURL
const getDashboardUrl = (): string => {
  const systemRoutes = {
    'hotel-member': '/member/dashboard',
    'hotel-pms': '/pms/dashboard', 
    'hotel-saas': '/saas/dashboard'
  }
  return systemRoutes[getCurrentSystem()] || '/dashboard'
}
</script>
```

#### 3.1.2 レスポンシブデザイン対応

```scss
// 統一ログインUI スタイル
.hotel-login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;

  @media (max-width: 768px) {
    padding: 1rem;
  }

  .brand-header {
    text-align: center;
    margin-bottom: 2rem;
    color: white;

    img {
      max-height: 80px;
      margin-bottom: 1rem;
    }

    h1 {
      font-size: 2rem;
      font-weight: 300;
      margin: 0;

      @media (max-width: 768px) {
        font-size: 1.5rem;
      }
    }
  }

  .login-form {
    background: white;
    padding: 2.5rem;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    width: 100%;
    max-width: 400px;

    @media (max-width: 768px) {
      padding: 1.5rem;
    }

    .form-group {
      margin-bottom: 1.5rem;

      label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #374151;
      }

      input, select {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #e5e7eb;
        border-radius: 6px;
        font-size: 1rem;
        transition: border-color 0.2s;

        &:focus {
          outline: none;
          border-color: #667eea;
        }

        &:disabled {
          background: #f9fafb;
          cursor: not-allowed;
        }
      }

      &.checkbox-group {
        display: flex;
        align-items: center;

        input[type="checkbox"] {
          width: auto;
          margin-right: 0.5rem;
        }
      }
    }

    .error-message {
      background: #fef2f2;
      color: #dc2626;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      border: 1px solid #fecaca;
    }

    .login-button {
      width: 100%;
      background: #667eea;
      color: white;
      border: none;
      padding: 0.875rem;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover:not(:disabled) {
        background: #5a67d8;
      }

      &:disabled {
        background: #9ca3af;
        cursor: not-allowed;
      }

      .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid transparent;
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 0.5rem;
      }
    }
  }

  .login-footer {
    margin-top: 2rem;
    text-align: center;

    a {
      color: white;
      text-decoration: none;
      
      &:hover {
        text-decoration: underline;
      }
    }

    .system-info {
      margin-top: 1rem;
      color: rgba(255, 255, 255, 0.7);
      font-size: 0.875rem;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### 3.2 SSO認証フロー実装

#### 3.2.1 認証状態管理 (Pinia Store)

```typescript
// stores/auth.ts - Vue/Nuxt用認証ストア
import { defineStore } from 'pinia'
import axios from 'axios'

interface AuthState {
  user: UserInfo | null
  isAuthenticated: boolean
  permissions: string[]
  loading: boolean
  lastActivity: Date | null
}

interface UserInfo {
  id: string
  email: string
  name: string
  role: string
  level: number
  tenantId: string
  tenantName: string
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    permissions: [],
    loading: false,
    lastActivity: null
  }),

  getters: {
    hasPermission: (state) => (permission: string) => {
      return state.permissions.includes(permission)
    },
    
    isAdmin: (state) => {
      return state.user?.role === 'ADMIN' || state.user?.role === 'OWNER'
    },
    
    canAccessSystem: (state) => (systemName: string) => {
      const systemPermissions = {
        'hotel-member': ['member.access'],
        'hotel-pms': ['pms.access'],
        'hotel-saas': ['saas.access']
      }
      
      return systemPermissions[systemName]?.some(perm => 
        state.permissions.includes(perm)
      ) || false
    }
  },

  actions: {
    /**
     * ログイン処理
     */
    async login(credentials: LoginCredentials): Promise<void> {
      this.loading = true
      
      try {
        const response = await axios.post('/api/auth/login', {
          ...credentials,
          remember_me: credentials.rememberMe
        }, {
          withCredentials: true // Cookie送信
        })

        if (response.data.success) {
          const { access_token, user } = response.data.data
          
          // LocalStorageにアクセストークン保存
          localStorage.setItem('accessToken', access_token)
          localStorage.setItem('userInfo', JSON.stringify(user))
          localStorage.setItem('permissions', JSON.stringify(user.permissions || []))
          
          // 状態更新
          this.user = user
          this.isAuthenticated = true
          this.permissions = user.permissions || []
          this.lastActivity = new Date()
          
          // 自動リフレッシュ開始
          tokenRefreshManager.startAutoRefresh(access_token)
          
          // アクティビティ監視開始
          this.startActivityMonitoring()
        }
      } catch (error: any) {
        throw new Error(error.response?.data?.error?.message || 'ログインに失敗しました')
      } finally {
        this.loading = false
      }
    },

    /**
     * ログアウト処理
     */
    async logout(): Promise<void> {
      try {
        await axios.post('/api/auth/logout', {}, {
          withCredentials: true
        })
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        this.clearSession()
      }
    },

    /**
     * セッション初期化（ページ読み込み時）
     */
    async initializeSession(): Promise<void> {
      const accessToken = localStorage.getItem('accessToken')
      const userInfo = localStorage.getItem('userInfo')
      
      if (accessToken && userInfo) {
        try {
          // トークン有効性確認
          const response = await axios.post('/api/auth/verify', {}, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            withCredentials: true
          })

          if (response.data.success) {
            this.user = JSON.parse(userInfo)
            this.isAuthenticated = true
            this.permissions = JSON.parse(localStorage.getItem('permissions') || '[]')
            this.lastActivity = new Date()
            
            // 自動リフレッシュ開始
            tokenRefreshManager.startAutoRefresh(accessToken)
            this.startActivityMonitoring()
          } else {
            this.clearSession()
          }
        } catch (error) {
          this.clearSession()
        }
      }
    },

    /**
     * セッションクリア
     */
    clearSession(): void {
      this.user = null
      this.isAuthenticated = false
      this.permissions = []
      this.lastActivity = null
      
      localStorage.removeItem('accessToken')
      localStorage.removeItem('userInfo')
      localStorage.removeItem('permissions')
      
      tokenRefreshManager.stopAutoRefresh()
    },

    /**
     * アクティビティ監視開始
     */
    startActivityMonitoring(): void {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
      
      const updateActivity = () => {
        this.lastActivity = new Date()
        sessionStorage.setItem('lastActivity', this.lastActivity.toISOString())
      }

      events.forEach(event => {
        document.addEventListener(event, updateActivity, true)
      })
    }
  }
})
```

#### 3.2.2 ルートガード・認証チェック

```typescript
// router/guards.ts - Vue Router Guards
import { useAuthStore } from '../stores/auth'

/**
 * 認証ガード
 */
export const authGuard = async (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  
  // 認証不要ページ
  const publicPages = ['/auth/login', '/auth/forgot-password', '/']
  if (publicPages.includes(to.path)) {
    return next()
  }

  // セッション初期化（初回アクセス時）
  if (!authStore.isAuthenticated) {
    await authStore.initializeSession()
  }

  // 認証チェック
  if (!authStore.isAuthenticated) {
    return next(`/auth/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  // 権限チェック
  const requiredPermission = to.meta?.permission
  if (requiredPermission && !authStore.hasPermission(requiredPermission)) {
    return next('/403') // 権限不足
  }

  next()
}

/**
 * システム間認証チェック
 */
export const systemAccessGuard = async (to: any, from: any, next: any) => {
  const authStore = useAuthStore()
  const targetSystem = to.meta?.system

  if (targetSystem && !authStore.canAccessSystem(targetSystem)) {
    return next('/unauthorized')
  }

  next()
}
```

### 3.3 システム間ナビゲーション

#### 3.3.1 統一ナビゲーションバー

```vue
<!-- components/SystemNavigation.vue -->
<template>
  <nav class="system-navigation">
    <div class="nav-container">
      <!-- 現在のシステム表示 -->
      <div class="current-system">
        <span class="system-icon">{{ systemIcon }}</span>
        <span class="system-name">{{ systemName }}</span>
      </div>

      <!-- システム切り替えメニュー -->
      <div class="system-switcher">
        <button @click="showSystemMenu = !showSystemMenu" class="system-menu-btn">
          <span>システム切り替え</span>
          <ChevronDownIcon class="w-4 h-4" />
        </button>

        <div v-if="showSystemMenu" class="system-menu">
          <a 
            v-for="system in availableSystems" 
            :key="system.id"
            :href="system.url"
            class="system-menu-item"
            :class="{ active: system.id === currentSystemId }"
          >
            <span class="system-icon">{{ system.icon }}</span>
            <div>
              <div class="system-title">{{ system.name }}</div>
              <div class="system-desc">{{ system.description }}</div>
            </div>
          </a>
        </div>
      </div>

      <!-- ユーザーメニュー -->
      <div class="user-menu">
        <button @click="showUserMenu = !showUserMenu" class="user-menu-btn">
          <img :src="user.avatar || defaultAvatar" :alt="user.name" class="user-avatar" />
          <span class="user-name">{{ user.name }}</span>
        </button>

        <div v-if="showUserMenu" class="user-dropdown">
          <div class="user-info">
            <div class="user-name">{{ user.name }}</div>
            <div class="user-role">{{ user.role }} (Level {{ user.level }})</div>
            <div class="tenant-name">{{ user.tenantName }}</div>
          </div>
          <hr />
          <a href="/profile" class="dropdown-item">プロフィール設定</a>
          <a href="/settings" class="dropdown-item">システム設定</a>
          <hr />
          <button @click="handleLogout" class="dropdown-item logout-btn">
            ログアウト
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const showSystemMenu = ref(false)
const showUserMenu = ref(false)

const user = computed(() => authStore.user)
const currentSystemId = getCurrentSystemId()

// 利用可能システム一覧
const availableSystems = computed(() => {
  const systems = [
    {
      id: 'hotel-member',
      name: '会員管理',
      description: '顧客・会員データ管理',
      icon: '👥',
      url: 'https://member.hotel-system.com/dashboard'
    },
    {
      id: 'hotel-pms',
      name: '予約管理',
      description: '予約・客室・フロント業務',
      icon: '🏨',
      url: 'https://pms.hotel-system.com/dashboard'
    },
    {
      id: 'hotel-saas',
      name: 'サービス管理',
      description: 'コンシェルジュ・注文管理',
      icon: '🛎️',
      url: 'https://saas.hotel-system.com/dashboard'
    }
  ]

  // アクセス権限でフィルタ
  return systems.filter(system => 
    authStore.canAccessSystem(system.id)
  )
})

const handleLogout = async () => {
  await authStore.logout()
  window.location.href = '/auth/login'
}
</script>
```

## 4. 実装チェックリスト (Implementation Checklist)

### 4.1 hotel-member (Vue 3 + Nuxt 3)
- [ ] 認証ストア (Pinia) 実装
- [ ] ログインページ作成
- [ ] ルートガード設定
- [ ] 自動トークンリフレッシュ
- [ ] システムナビゲーション実装
- [ ] セッション管理実装

### 4.2 hotel-pms (React想定)
- [ ] 認証状態管理 (Redux Toolkit) 実装
- [ ] ログインコンポーネント作成
- [ ] React Router ガード
- [ ] axios インターセプター設定
- [ ] システム間ナビゲーション
- [ ] セッション永続化

### 4.3 hotel-saas (Vue 3 + Nuxt 3)
- [ ] hotel-member と同様の実装
- [ ] SSRモード対応
- [ ] サービスワーカー統合
- [ ] オフライン対応

### 4.4 共通実装
- [ ] 統一Cookie設定
- [ ] HTTPS証明書設定
- [ ] CORS設定調整
- [ ] セキュリティヘッダー設定

## 5. セキュリティ考慮事項 (Security Considerations)

### 5.1 XSS対策
- HttpOnly Cookieでリフレッシュトークン保護
- CSP (Content Security Policy) 設定
- 入力値サニタイゼーション

### 5.2 CSRF対策
- SameSite Cookie設定
- CSRFトークン実装（必要に応じて）
- Origin/Refererヘッダー検証

### 5.3 Session Hijacking対策
- IP address + User-Agent検証
- 定期的なセッションローテーション
- 異常検知・自動ログアウト

---

**注意事項**:
1. 本ガイドは統一認証基盤との完全統合を前提とします
2. 各システムの技術スタックに応じて実装方法を調整してください
3. セキュリティ設定は本番環境で厳格に適用してください
4. フロントエンド実装完了後、統合テストを必ず実施してください 