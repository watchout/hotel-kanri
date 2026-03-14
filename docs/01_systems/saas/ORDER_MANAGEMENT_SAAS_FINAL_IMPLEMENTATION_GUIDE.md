=== hotel-saas 注文管理システム 最終実装指示書 ===

【対象】hotel-saasチーム
【作成日】2025年9月30日
【前提】hotel-common実装完了・検証済み

【重要】hotel-common実装検証完了
✅ hotel-commonの注文管理API実装が完了し、検証済みです
✅ 13のAPIエンドポイントすべて実装済み・動作確認済み
✅ 本実装指示はhotel-common連携を前提としています

## 🎯 実装概要

**目的**: hotel-commonの完成したAPIと連携し、SaaS側の注文管理機能を完成させる
**方針**: 既存モック実装を排除し、hotel-common APIを活用した本格実装
**期間**: 1-2週間での完成を目標

## 📋 実装対象ファイル

### **Phase 1: 既存API修正（優先度：最高）**

**1. 注文作成API修正**
```
ファイル: /Users/kaneko/hotel-saas/server/api/v1/order/create.post.ts
状態: ✅ モック排除済み（検証済み）
作業: hotel-common連携の動作確認
```

**2. 既存注文API確認・修正**
```
対象ファイル:
- /Users/kaneko/hotel-saas/server/api/v1/order/index.post.ts
- /Users/kaneko/hotel-saas/server/api/v1/orders/index.post.v2.ts
作業: hotel-common APIへの統合または廃止
```

### **Phase 2: セッション管理強化（優先度：高）**

**3. useSessionApi.ts機能拡張**
```
ファイル: /Users/kaneko/hotel-saas/composables/useSessionApi.ts
作業: 注文関連機能の追加
```

**4. フロントエンド画面修正**
```
ファイル: /Users/kaneko/hotel-saas/pages/admin/front-desk/operation.vue
作業: 注文管理UI統合
```

## 🔧 Phase 1: 既存API修正

### **1-1. 注文作成API動作確認**

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/order/create.post.ts`

**現在の実装確認**:
```typescript
// 既に修正済みの実装を確認
export default defineEventHandler(async (event) => {
  try {
    const authService = getAuthService()
    const user = await authService.authenticateUser(event)
    
    // hotel-common API呼び出し
    const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
    const response = await $fetch(`${hotelCommonApiUrl}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': user.tenantId
      },
      body: orderData
    })
    
    return {
      success: true,
      order: response.data
    }
  } catch (error: any) {
    // エラーハンドリング
  }
})
```

**✅ 必要な作業**:
1. 動作確認テスト実行
2. エラーハンドリングの確認
3. レスポンス形式の確認

### **1-2. 重複API整理**

**対象**: 既存の注文関連API

**確認・統合作業**:
```typescript
// 確認対象ファイル
/Users/kaneko/hotel-saas/server/api/v1/order/index.post.ts
/Users/kaneko/hotel-saas/server/api/v1/orders/index.post.v2.ts

// 作業内容
1. 各ファイルの機能確認
2. create.post.tsとの重複確認
3. 不要なファイルの削除または統合
```

## 🔧 Phase 2: セッション管理強化

### **2-1. useSessionApi.ts機能拡張**

**ファイル**: `/Users/kaneko/hotel-saas/composables/useSessionApi.ts`

**追加実装**:
```typescript
// 注文関連機能を追加
export const useSessionApi = () => {
  // 既存機能は維持
  const { authenticatedFetch } = useApiClient()
  
  // 新規追加: セッション別注文取得
  const getSessionOrders = async (sessionId: string) => {
    try {
      const response = await authenticatedFetch(`/api/v1/orders/by-session/${sessionId}`, {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('セッション注文取得エラー:', error)
      throw error
    }
  }
  
  // 新規追加: 部屋のアクティブセッション注文取得
  const getActiveSessionOrders = async (roomId: string) => {
    try {
      const response = await authenticatedFetch(`/api/v1/orders/active-session/${roomId}`, {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('アクティブセッション注文取得エラー:', error)
      throw error
    }
  }
  
  // 新規追加: 注文ステータス更新
  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const response = await authenticatedFetch(`/api/v1/orders/${orderId}/status`, {
        method: 'PUT',
        body: { status }
      })
      return response
    } catch (error) {
      console.error('注文ステータス更新エラー:', error)
      throw error
    }
  }
  
  // 新規追加: 注文詳細取得
  const getOrderDetails = async (orderId: number) => {
    try {
      const response = await authenticatedFetch(`/api/v1/orders/${orderId}`, {
        method: 'GET'
      })
      return response
    } catch (error) {
      console.error('注文詳細取得エラー:', error)
      throw error
    }
  }
  
  return {
    // 既存機能
    createSession,
    getSession,
    getSessionWithDetails,
    getSessionByNumber,
    getActiveSessionByRoom,
    
    // 新規追加機能
    getSessionOrders,
    getActiveSessionOrders,
    updateOrderStatus,
    getOrderDetails
  }
}
```

### **2-2. フロントエンド画面修正**

**ファイル**: `/Users/kaneko/hotel-saas/pages/admin/front-desk/operation.vue`

**修正内容**:
```vue
<template>
  <div class="operation-panel">
    <!-- 既存のセッション管理UI -->
    
    <!-- 新規追加: 注文管理セクション -->
    <div class="order-management-section">
      <h3>注文管理</h3>
      
      <!-- アクティブセッションの注文一覧 -->
      <div v-if="activeSession" class="session-orders">
        <h4>{{ activeSession.sessionNumber }} の注文</h4>
        
        <div v-for="order in sessionOrders" :key="order.id" class="order-item">
          <div class="order-header">
            <span class="order-id">#{{ order.id }}</span>
            <span class="order-status" :class="order.status">{{ getStatusLabel(order.status) }}</span>
            <span class="order-total">¥{{ order.total.toLocaleString() }}</span>
          </div>
          
          <div class="order-items">
            <div v-for="item in order.OrderItem" :key="item.id" class="item">
              {{ item.name }} × {{ item.quantity }} (¥{{ item.price }})
            </div>
          </div>
          
          <div class="order-actions">
            <button @click="updateStatus(order.id, 'preparing')" 
                    :disabled="order.status !== 'received'"
                    class="btn-preparing">
              調理開始
            </button>
            <button @click="updateStatus(order.id, 'ready')" 
                    :disabled="order.status !== 'preparing'"
                    class="btn-ready">
              調理完了
            </button>
            <button @click="updateStatus(order.id, 'delivered')" 
                    :disabled="order.status !== 'ready'"
                    class="btn-delivered">
              配達完了
            </button>
          </div>
        </div>
      </div>
      
      <!-- 注文作成ボタン -->
      <div class="order-create-section">
        <button @click="openOrderModal" class="btn-create-order">
          新規注文作成
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
// 既存のimport
const { getActiveSessionByRoom } = useSessionApi()
const { getActiveSessionOrders, updateOrderStatus } = useSessionApi()

// 既存のreactive data
const sessionOrders = ref([])

// 新規追加: 注文関連メソッド
const loadSessionOrders = async () => {
  if (!activeSession.value) return
  
  try {
    const response = await getActiveSessionOrders(selectedRoom.value)
    sessionOrders.value = response.data.orders || []
  } catch (error) {
    console.error('注文取得エラー:', error)
    // エラー表示
  }
}

const updateStatus = async (orderId: number, newStatus: string) => {
  try {
    await updateOrderStatus(orderId, newStatus)
    await loadSessionOrders() // 再読み込み
    // 成功メッセージ表示
  } catch (error) {
    console.error('ステータス更新エラー:', error)
    // エラー表示
  }
}

const getStatusLabel = (status: string) => {
  const labels = {
    'received': '受付済み',
    'preparing': '調理中',
    'ready': '調理完了',
    'delivered': '配達完了',
    'cancelled': 'キャンセル'
  }
  return labels[status] || status
}

const openOrderModal = () => {
  // 注文作成モーダルを開く
}

// セッション変更時に注文も読み込み
watch(activeSession, async (newSession) => {
  if (newSession) {
    await loadSessionOrders()
  }
})
</script>

<style scoped>
.order-management-section {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.order-item {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.order-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.order-status.received { background-color: #e3f2fd; color: #1976d2; }
.order-status.preparing { background-color: #fff3e0; color: #f57c00; }
.order-status.ready { background-color: #e8f5e8; color: #388e3c; }
.order-status.delivered { background-color: #f3e5f5; color: #7b1fa2; }

.order-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.order-actions button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-preparing { background-color: #ff9800; color: white; }
.btn-ready { background-color: #4caf50; color: white; }
.btn-delivered { background-color: #9c27b0; color: white; }

.btn-create-order {
  background-color: #2196f3;
  color: white;
  padding: 1rem 2rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}
</style>
```

## 🔧 Phase 3: 統合テスト

### **3-1. 接続テスト**

**テスト項目**:
```typescript
// 1. hotel-common API接続確認
const testConnection = async () => {
  try {
    const response = await $fetch('http://localhost:3400/api/health')
    console.log('✅ hotel-common接続OK:', response)
  } catch (error) {
    console.error('❌ hotel-common接続エラー:', error)
  }
}

// 2. 注文作成テスト
const testOrderCreation = async () => {
  const testOrder = {
    sessionId: 'test-session-id',
    items: [
      {
        menuItemId: 1,
        name: 'テスト商品',
        price: 1000,
        quantity: 1
      }
    ]
  }
  
  try {
    const response = await $fetch('/api/v1/order/create', {
      method: 'POST',
      body: testOrder
    })
    console.log('✅ 注文作成テストOK:', response)
  } catch (error) {
    console.error('❌ 注文作成テストエラー:', error)
  }
}
```

### **3-2. エンドツーエンドテスト**

**テストシナリオ**:
1. セッション作成
2. 注文作成
3. 注文ステータス更新
4. 注文取得確認

## 📋 実装チェックリスト

### **Phase 1: API修正**
□ create.post.ts動作確認完了
□ 重複API整理完了
□ エラーハンドリング確認完了

### **Phase 2: 機能拡張**
□ useSessionApi.ts機能追加完了
□ operation.vue UI修正完了
□ 注文管理画面動作確認完了

### **Phase 3: テスト**
□ hotel-common接続テスト成功
□ 注文作成テスト成功
□ エンドツーエンドテスト成功

## 🚨 重要な注意事項

### **❌ 禁止事項**
- 新規PrismaClientインスタンスの作成
- hotel-commonのデータベースへの直接アクセス
- モック実装の新規作成
- 独自の注文管理ロジックの実装

### **✅ 必須事項**
- hotel-common APIの活用
- 既存認証システム（authService.v2.ts）の使用
- エラーハンドリングの実装
- ログ出力の実装

## 🎯 完了基準

### **Phase 1完了基準**
□ 既存API修正完了
□ hotel-common連携動作確認
□ 重複コード整理完了

### **最終完了基準**
□ 注文作成〜配達完了フロー動作確認
□ エラーケース対応確認
□ UI/UX動作確認
□ パフォーマンステスト合格

## 📞 サポート体制

**技術的質問**: システム設計担当
**hotel-common連携**: hotel-commonチーム
**緊急事項**: プロジェクトマネージャー

---

**次のアクション**: 
Phase 1から順次実装を開始してください。
hotel-commonは実装完了・検証済みのため、安心して連携実装を進められます。

作成者: システム設計担当
対象: hotel-saasチーム
承認者: プロジェクトマネージャー
