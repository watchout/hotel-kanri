# 🏨 hotel-saas向けAPI完全ガイド

**hotel-commonで実装されているSaaS向けAPI一覧と使用方法**

---

## 📋 **目次**

1. [概要](#概要)
2. [認証・セキュリティ](#認証セキュリティ)
3. [API一覧](#api一覧)
4. [使用方法とサンプルコード](#使用方法とサンプルコード)
5. [エラーハンドリング](#エラーハンドリング)
6. [統合ガイド](#統合ガイド)

---

## 🎯 **概要**

hotel-commonは、hotel-saasシステム向けに以下の機能を提供するAPIを実装しています：

### **提供機能**
- ✅ **認証・セキュリティ**: JWT認証、トークン管理
- ✅ **注文管理**: 注文作成、履歴、メニュー管理
- ✅ **AIコンシェルジュ**: レスポンスツリー、セッション管理、モバイル連携
- ✅ **管理画面統計**: ダッシュボード、KPI、ランキング
- ✅ **基幹データ**: 部屋、予約、デバイス管理（参照専用）

### **システム構成**
```
hotel-saas (Nuxt.js) ←→ hotel-common (Express.js) ←→ PostgreSQL
     ↓                        ↓
  フロントエンド              統合API基盤
```

---

## 🔐 **認証・セキュリティ**

### **認証方式**
- **JWT Bearer Token認証**を使用
- 開発環境では認証バイパス機能あり
- 本番環境では必須認証

### **認証フロー**

#### **1. ログイン**  
2025-09-11 by common: パスワードはbcryptで検証し、不一致は401（文言は統一）。
```typescript
// POST /api/v1/auth/login
const loginResponse = await fetch('http://localhost:3400/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@hotel.com',
    password: 'password123',
    tenantId: 'hotel-001'
  })
});

const { accessToken, refreshToken } = await loginResponse.json();
```

#### **2. API呼び出し**
```typescript
// 認証が必要なAPI呼び出し
const response = await fetch('http://localhost:3400/api/v1/orders/history', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  }
});
```

#### **3. トークン更新**
```typescript
// POST /api/v1/auth/refresh
const refreshResponse = await fetch('http://localhost:3400/api/v1/auth/refresh', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    refreshToken: refresh_token
  })
});
```

---

## 📊 **API一覧**

### **🔐 認証系API**

| エンドポイント | メソッド | 説明 | 認証 |
|---|---|---|---|
| `/api/v1/auth/login` | POST | ログイン処理（bcrypt照合。未登録/不一致は401） | 不要 |
| `/api/v1/auth/validate-token` | GET | トークン検証 | 不要 |
| `/api/v1/auth/refresh` | POST | トークン更新 | 不要 |
| `/api/v1/tenants/:id` | GET | テナント情報取得 | 不要 |
| `/api/v1/staff/:id` | GET | スタッフ情報取得 | 不要 |

### **🛒 注文・メニュー系API**

| エンドポイント | メソッド | 説明 | 認証 |
|---|---|---|---|
| `/api/v1/orders/history` | GET | 注文履歴取得 | 必要 |
| `/api/v1/orders` | POST | 注文作成 | 必要 |
| `/api/v1/orders/active` | GET | アクティブ注文取得 | 必要 |
| `/api/v1/orders/:id` | GET | 注文詳細取得 | 必要 |
| `/api/v1/orders/:id/status` | PUT | 注文ステータス更新 | 必要 |
| `/api/v1/order/menu` | GET | メニュー一覧取得 | 必要 |
| `/api/v1/menus/top` | GET | トップメニュー取得 | 必要 |
| `/api/v1/order/place` | POST | 注文配置 | 必要 |

### **🤖 AIコンシェルジュ系API**

| エンドポイント | メソッド | 説明 | 認証 |
|---|---|---|---|
| `/api/v1/ai/response-tree` | GET | レスポンスツリー一覧 | 必要 |
| `/api/v1/ai/response-tree/:treeId` | GET | レスポンスツリー詳細 | 必要 |
| `/api/v1/ai/response-tree/nodes/:nodeId` | GET | ノード詳細取得 | 必要 |
| `/api/v1/ai/response-tree/nodes/:nodeId/children` | GET | 子ノード一覧 | 必要 |
| `/api/v1/ai/response-tree/search` | GET | ノード検索 | 必要 |
| `/api/v1/ai/response-tree/sessions` | POST | セッション開始 | 必要 |
| `/api/v1/ai/response-tree/sessions/:sessionId` | GET | セッション状態取得 | 必要 |
| `/api/v1/ai/response-tree/sessions/:sessionId` | PUT | セッション更新 | 必要 |
| `/api/v1/ai/response-tree/sessions/:sessionId` | DELETE | セッション終了 | 必要 |
| `/api/v1/ai/response-tree/mobile-link` | POST | モバイル連携作成 | 必要 |
| `/api/v1/ai/response-tree/mobile-link/:linkCode` | GET | モバイル連携確認 | 必要 |
| `/api/v1/ai/response-tree/mobile-link/:linkCode/connect` | POST | モバイル連携実行 | 必要 |
| `/api/v1/ai/response-tree/qrcode/:linkCode` | GET | QRコード取得 | 必要 |

### **📊 管理画面統計API**

| エンドポイント | メソッド | 説明 | 認証 |
|---|---|---|---|
| `/api/v1/admin/summary` | GET | サマリー統計 | 管理者 |
| `/api/v1/admin/dashboard/stats` | GET | ダッシュボード統計 | 管理者 |
| `/api/v1/admin/devices/count` | GET | デバイス数統計 | 管理者 |
| `/api/v1/admin/orders/monthly-count` | GET | 月次注文数統計 | 管理者 |
| `/api/v1/admin/rankings` | GET | ランキング統計 | 管理者 |

### **🏨 基幹データ参照API（参照専用）**

| エンドポイント | メソッド | 説明 | 認証 |
|---|---|---|---|
| `/api/v1/reservations` | GET | 予約一覧取得 | 必要 |
| `/api/v1/reservations/:id` | GET | 予約詳細取得 | 必要 |
| `/api/v1/rooms` | GET | 部屋一覧取得 | 必要 |
| `/api/v1/rooms/:id` | GET | 部屋詳細取得 | 必要 |
| `/api/v1/devices` | GET | デバイス一覧取得 | 必要 |
| `/api/v1/devices/:id` | GET | デバイス詳細取得 | 必要 |

---

## 💻 **使用方法とサンプルコード**

### **Nuxt.js統合例**

#### **1. APIクライアントの作成**

```typescript
// ~/composables/useHotelApi.ts
export const useHotelApi = () => {
  const config = useRuntimeConfig()
  const baseURL = config.public.hotelCommonApiUrl || 'http://localhost:3400'

  // 認証トークン管理
  const token = useCookie('hotel_auth_token')
  
  const apiCall = async (endpoint: string, options: any = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    
    // 認証トークンがある場合は追加
    if (token.value) {
      headers.Authorization = `Bearer ${token.value}`
    }
    
    const response = await $fetch(`${baseURL}${endpoint}`, {
      ...options,
      headers
    })
    
    return response
  }
  
  return {
    // 認証API
    login: (credentials: LoginCredentials) => 
      apiCall('/api/v1/auth/login', { method: 'POST', body: credentials }),
    
    validateToken: () => 
      apiCall('/api/v1/auth/validate-token'),
    
    // 注文API
    getOrderHistory: (params?: OrderHistoryParams) => 
      apiCall(`/api/v1/orders/history?${new URLSearchParams(params)}`),
    
    createOrder: (orderData: CreateOrderData) => 
      apiCall('/api/v1/orders', { method: 'POST', body: orderData }),
    
    getActiveOrders: () => 
      apiCall('/api/v1/orders/active'),
    
    // メニューAPI
    getMenus: () => 
      apiCall('/api/v1/order/menu'),
    
    getTopMenus: () => 
      apiCall('/api/v1/menus/top'),
    
    // AIコンシェルジュAPI
    getResponseTrees: () => 
      apiCall('/api/v1/ai/response-tree'),
    
    startSession: (sessionData: SessionData) => 
      apiCall('/api/v1/ai/response-tree/sessions', { method: 'POST', body: sessionData }),
    
    // 管理画面API
    getAdminSummary: () => 
      apiCall('/api/v1/admin/summary'),
    
    getDashboardStats: () => 
      apiCall('/api/v1/admin/dashboard/stats')
  }
}
```

#### **2. 認証プラグイン**

```typescript
// ~/plugins/auth.client.ts
export default defineNuxtPlugin(async () => {
  const { validateToken } = useHotelApi()
  const token = useCookie('hotel_auth_token')
  
  // ページ読み込み時にトークン検証
  if (token.value) {
    try {
      await validateToken()
    } catch (error) {
      // トークンが無効な場合はクリア
      token.value = null
      await navigateTo('/login')
    }
  }
})
```

#### **3. ページでの使用例**

```vue
<!-- ~/pages/orders/index.vue -->
<template>
  <div>
    <h1>注文履歴</h1>
    <div v-if="pending">読み込み中...</div>
    <div v-else-if="error">エラー: {{ error.message }}</div>
    <div v-else>
      <div v-for="order in orders" :key="order.id" class="order-item">
        <h3>注文 #{{ order.id }}</h3>
        <p>ステータス: {{ order.status }}</p>
        <p>合計: ¥{{ order.total_amount }}</p>
        <p>注文日時: {{ formatDate(order.created_at) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const { getOrderHistory } = useHotelApi()

// 注文履歴を取得
const { data: orders, pending, error } = await useLazyAsyncData('orders', () => 
  getOrderHistory({ page: 1, limit: 20 })
)

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ja-JP')
}
</script>
```

#### **4. AIコンシェルジュ統合例**

```vue
<!-- ~/pages/concierge/index.vue -->
<template>
  <div class="concierge-interface">
    <h1>AIコンシェルジュ</h1>
    
    <!-- レスポンスツリー表示 -->
    <div v-if="currentNode" class="response-node">
      <h2>{{ currentNode.content }}</h2>
      
      <!-- 選択肢表示 -->
      <div v-if="children.length > 0" class="choices">
        <button 
          v-for="child in children" 
          :key="child.id"
          @click="selectNode(child.id)"
          class="choice-button"
        >
          {{ child.content }}
        </button>
      </div>
      
      <!-- モバイル連携QRコード -->
      <div v-if="qrCode" class="qr-code">
        <img :src="qrCode" alt="モバイル連携QRコード" />
        <p>スマートフォンでスキャンしてください</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const { 
  getResponseTrees, 
  startSession, 
  getSession, 
  updateSession,
  getQRCode 
} = useHotelApi()

const currentSession = ref(null)
const currentNode = ref(null)
const children = ref([])
const qrCode = ref(null)

// セッション開始
const initializeSession = async () => {
  try {
    const trees = await getResponseTrees()
    if (trees.length > 0) {
      const session = await startSession({
        treeId: trees[0].id,
        deviceId: 'tv-001',
        interfaceType: 'tv'
      })
      
      currentSession.value = session
      await loadCurrentNode()
      await generateQRCode()
    }
  } catch (error) {
    console.error('セッション初期化エラー:', error)
  }
}

// 現在のノードを読み込み
const loadCurrentNode = async () => {
  if (!currentSession.value) return
  
  const session = await getSession(currentSession.value.id)
  currentNode.value = session.currentNode
  children.value = session.currentNode?.children || []
}

// ノード選択
const selectNode = async (nodeId: string) => {
  try {
    await updateSession(currentSession.value.id, {
      currentNodeId: nodeId,
      action: 'select'
    })
    
    await loadCurrentNode()
  } catch (error) {
    console.error('ノード選択エラー:', error)
  }
}

// QRコード生成
const generateQRCode = async () => {
  try {
    const linkResponse = await createMobileLink({
      sessionId: currentSession.value.id,
      expiresIn: 1800 // 30分
    })
    
    const qrResponse = await getQRCode(linkResponse.linkCode)
    qrCode.value = qrResponse.qrCodeUrl
  } catch (error) {
    console.error('QRコード生成エラー:', error)
  }
}

// 初期化
onMounted(() => {
  initializeSession()
})
</script>
```

### **管理画面統合例**

```vue
<!-- ~/pages/admin/dashboard.vue -->
<template>
  <div class="admin-dashboard">
    <h1>管理ダッシュボード</h1>
    
    <!-- サマリー統計 -->
    <div v-if="summary" class="summary-grid">
      <div class="stat-card">
        <h3>総予約数</h3>
        <p class="stat-number">{{ summary.totalReservations }}</p>
      </div>
      <div class="stat-card">
        <h3>アクティブ予約</h3>
        <p class="stat-number">{{ summary.activeReservations }}</p>
      </div>
      <div class="stat-card">
        <h3>総注文数</h3>
        <p class="stat-number">{{ summary.totalOrders }}</p>
      </div>
      <div class="stat-card">
        <h3>月次売上</h3>
        <p class="stat-number">¥{{ summary.monthlyRevenue?.toLocaleString() }}</p>
      </div>
    </div>
    
    <!-- 詳細統計 -->
    <div v-if="dashboardStats" class="detailed-stats">
      <h2>詳細統計</h2>
      <!-- グラフやチャートをここに表示 -->
    </div>
  </div>
</template>

<script setup>
// 管理者権限チェック
definePageMeta({
  middleware: 'admin-auth'
})

const { getAdminSummary, getDashboardStats } = useHotelApi()

// データ取得
const { data: summary } = await useLazyAsyncData('admin-summary', () => 
  getAdminSummary()
)

const { data: dashboardStats } = await useLazyAsyncData('dashboard-stats', () => 
  getDashboardStats()
)
</script>
```

---

## ⚠️ **エラーハンドリング**

### **統一エラーレスポンス形式**

```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
  timestamp: string
  request_id: string
}
```

### **主要エラーコード**

| エラーコード | 説明 | 対処法 |
|---|---|---|
| `UNAUTHORIZED` | 認証が必要 | ログインしてトークンを取得 |
| `FORBIDDEN` | 権限不足 | 適切な権限を持つアカウントでログイン |
| `TOKEN_EXPIRED` | トークンの有効期限切れ | リフレッシュトークンで更新 |
| `INVALID_TOKEN` | 無効なトークン | 再ログインが必要 |
| `VALIDATION_ERROR` | 入力値エラー | リクエストパラメータを確認 |
| `TENANT_ID_REQUIRED` | テナントID不足 | テナントIDを指定 |
| `RESOURCE_NOT_FOUND` | リソースが見つからない | IDやパラメータを確認 |
| `INTERNAL_SERVER_ERROR` | サーバー内部エラー | 管理者に連絡 |

### **エラーハンドリング例**

```typescript
// ~/composables/useErrorHandler.ts
export const useErrorHandler = () => {
  const handleApiError = (error: any) => {
    console.error('API Error:', error)
    
    if (error.response?.status === 401) {
      // 認証エラー - ログインページにリダイレクト
      navigateTo('/login')
      return
    }
    
    if (error.response?.status === 403) {
      // 権限エラー - エラーページ表示
      throw createError({
        statusCode: 403,
        statusMessage: 'アクセス権限がありません'
      })
    }
    
    // その他のエラー
    const errorMessage = error.response?.data?.error?.message || 'エラーが発生しました'
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: errorMessage
    })
  }
  
  return { handleApiError }
}
```

---

## 🔧 **統合ガイド**

### **1. 環境設定**

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      hotelCommonApiUrl: process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
    }
  },
  
  // CORS設定（開発環境）
  nitro: {
    devProxy: {
      '/api/hotel-common': {
        target: 'http://localhost:3400',
        changeOrigin: true,
        prependPath: true
      }
    }
  }
})
```

### **2. 型定義**

```typescript
// ~/types/api.ts
export interface LoginCredentials {
  email: string
  password: string
  tenantId: string
}

export interface AuthResponse {
  success: boolean
  data: {
    access_token: string
    refresh_token: string
    expires_in: number
    user: UserInfo
  }
}

export interface UserInfo {
  user_id: string
  tenant_id: string
  email: string
  role: string
  permissions: string[]
}

export interface Order {
  id: string
  tenant_id: string
  room_id?: string
  customer_id?: string
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'DELIVERED' | 'CANCELLED'
  total_amount: number
  items: OrderItem[]
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
}

export interface ResponseTree {
  id: string
  name: string
  description?: string
  isPublished: boolean
  rootNode?: ResponseNode
}

export interface ResponseNode {
  id: string
  treeId: string
  nodeType: string
  content?: string
  isRoot: boolean
  parentId?: string
  children?: ResponseNode[]
}
```

### **3. 開発環境での動作確認**

```bash
# hotel-commonサーバーの起動確認
curl http://localhost:3400/health

# 認証API動作確認
curl -X POST http://localhost:3400/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@hotel.com","password":"test123","tenantId":"default"}'

# 注文履歴API動作確認（認証必要）
curl http://localhost:3400/api/v1/orders/history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **4. 本番環境での注意事項**

- ✅ **HTTPS必須**: 本番環境では必ずHTTPS通信を使用
- ✅ **環境変数設定**: JWT_SECRET等のセキュリティ関連設定
- ✅ **CORS設定**: 適切なオリジン制限
- ✅ **レート制限**: API呼び出し頻度の制限
- ✅ **ログ監視**: エラーログとアクセスログの監視
- ✅ **バックアップ**: データベースの定期バックアップ

### **5. パフォーマンス最適化**

```typescript
// キャッシュ戦略の例
const { data: menus } = await useLazyAsyncData(
  'menus', 
  () => getMenus(),
  {
    // 5分間キャッシュ
    default: () => [],
    server: false,
    client: true,
    transform: (data) => data?.data || []
  }
)

// リアクティブな更新
watch(() => route.query.page, async (newPage) => {
  await refresh()
})
```

---

## 📞 **サポート・連絡先**

### **技術サポート**
- **Slack**: #hotel-saas-integration
- **担当者**: hotel-common開発チーム
- **ドキュメント**: `/docs/api/` ディレクトリ

### **緊急時連絡先**
- **障害報告**: #system-alerts
- **セキュリティ問題**: security@hotel-common.jp

---

**最終更新**: 2024年12月
**バージョン**: v1.0.0
**対応hotel-commonバージョン**: v1.0.0+
