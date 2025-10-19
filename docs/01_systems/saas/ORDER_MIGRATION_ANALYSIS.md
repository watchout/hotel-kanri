# 注文処理のセッション対応移行分析

## 📋 **現在の注文処理実装分析**

### **現在のAPIエンドポイント**
1. **`/api/v1/order/index.post.ts`** - 基本注文作成（モック実装）
2. **`/api/v1/orders/index.post.v2.ts`** - hotel-common連携版
3. **`/api/v1/orders/index.post.ts.disabled`** - 旧実装（無効化済み）
4. **`/api/v1/order/place.post.ts.disabled`** - Place連携版（無効化済み）

### **現在のリクエスト形式**

#### **基本注文API (`/api/v1/order/index.post.ts`)**
```typescript
{
  roomNumber: string,           // 部屋番号で識別
  items: Array<{
    menuItemId?: number,
    name: string,
    price: number,
    quantity: number
  }>,
  specialInstructions?: string
}
```

#### **hotel-common連携版 (`/api/v1/orders/index.post.v2.ts`)**
```typescript
{
  roomId: string,              // 部屋番号で識別
  items: Array<OrderItem>,
  paymentMethod?: string
}
```

## 🔄 **セッション対応への変更点**

### **1. APIリクエスト形式の変更**

#### **Before (現在)**
```typescript
{
  roomNumber: string,          // または roomId
  items: Array<OrderItem>,
  specialInstructions?: string
}
```

#### **After (セッション対応)**
```typescript
{
  sessionId: string,           // roomNumber/roomIdから変更
  items: Array<{
    menuItemId: number,
    quantity: number,
    price: number,
    notes?: string
  }>,
  notes?: string
}
```

### **2. 注文作成フローの変更**

#### **Before (現在のフロー)**
```typescript
// 1. 部屋番号から直接注文作成
const createOrder = async (roomNumber: string, items: any[]) => {
  return await $fetch('/api/v1/order', {
    method: 'POST',
    body: {
      roomNumber: roomNumber,
      items: items
    }
  })
}
```

#### **After (セッション対応フロー)**
```typescript
// 1. 部屋番号からアクティブセッションを取得
// 2. セッションIDで注文作成
const createOrder = async (roomNumber: string, items: any[]) => {
  // Step 1: アクティブセッション取得
  const { getActiveSessionByRoom } = useSessionApi()
  const activeSession = await getActiveSessionByRoom(roomNumber)

  if (!activeSession) {
    throw new Error('アクティブなセッションが見つかりません')
  }

  // Step 2: セッションベース注文作成
  const { createSessionOrder } = useSessionApi()
  return await createSessionOrder({
    sessionId: activeSession.id,
    items: items,
    notes: specialInstructions
  })
}
```

### **3. 注文取得フローの変更**

#### **Before (現在)**
```typescript
// 部屋番号で注文を取得
const fetchRoomOrders = async (roomNumber: string) => {
  return await $fetch(`/api/v1/admin/front-desk/room-orders?roomNumber=${roomNumber}`)
}
```

#### **After (セッション対応)**
```typescript
// アクティブセッションの注文のみ取得
const fetchRoomOrders = async (roomNumber: string) => {
  const { getRoomOrders } = useSessionApi()
  return await getRoomOrders(roomNumber, false) // includeAll=false
}

// 全セッション履歴を取得する場合
const fetchAllRoomOrders = async (roomNumber: string) => {
  const { getRoomOrders } = useSessionApi()
  return await getRoomOrders(roomNumber, true) // includeAll=true
}
```

## 🔧 **必要な修正作業**

### **1. フロントエンド注文処理の修正**

#### **電話注文処理 (`pages/admin/front-desk/operation.vue`)**
```typescript
// Line 3408-3422 の修正が必要
const submitPhoneOrder = async () => {
  // Before
  const requestBody = {
    placeId: phoneOrderRoom.value.number, // 部屋番号を直接使用
    items: orderItems,
    note: '電話注文',
    staffName: 'フロントスタッフ'
  }

  // After (セッション対応)
  const { getActiveSessionByRoom } = useSessionApi()
  const activeSession = await getActiveSessionByRoom(phoneOrderRoom.value.number)

  if (!activeSession) {
    throw new Error('チェックインセッションが見つかりません')
  }

  const requestBody = {
    sessionId: activeSession.id,        // セッションIDを使用
    items: orderItems,
    notes: '電話注文 - ' + 'フロントスタッフ'
  }
}
```

#### **会計確認処理 (`pages/admin/front-desk/operation.vue`)**
```typescript
// Line 3926-3943 の修正が必要
const goToCashRegister = async (room: Room) => {
  // Before
  const response = await authenticatedFetch(`/api/v1/admin/front-desk/room-orders?roomNumber=${room.number}`)

  // After (セッション対応)
  const { getRoomOrders } = useSessionApi()
  const response = await getRoomOrders(room.number)

  // セッション情報も取得
  const { getActiveSessionByRoom } = useSessionApi()
  const activeSession = await getActiveSessionByRoom(room.number)

  const url = `/admin/front-desk/cash-register?room=${room.number}&sessionId=${activeSession?.id}&orders=${encodeURIComponent(JSON.stringify(response.orders))}`
}
```

### **2. サーバーサイドAPIの修正**

#### **新しいセッション対応注文API**
```typescript
// server/api/v1/admin/orders/session.post.ts (新規作成)
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { sessionId, items, notes } = body

  // 認証チェック
  const authUser = await verifyAuth(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // セッション存在確認
  const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
  const sessionResponse = await $fetch(`${hotelCommonApiUrl}/api/v1/admin/front-desk/sessions/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${authUser.token}` }
  })

  if (!sessionResponse.success) {
    throw createError({ statusCode: 404, statusMessage: 'セッションが見つかりません' })
  }

  // hotel-commonで注文作成
  const orderResponse = await $fetch(`${hotelCommonApiUrl}/api/v1/admin/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authUser.token}`,
      'Content-Type': 'application/json'
    },
    body: {
      sessionId,
      items,
      notes
    }
  })

  return orderResponse
})
```

#### **既存APIの段階的対応**
```typescript
// server/api/v1/order/index.post.ts の修正
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { roomNumber, sessionId, items, specialInstructions } = body

  // セッションIDが提供された場合は新フロー
  if (sessionId) {
    return await handleSessionOrder(sessionId, items, specialInstructions)
  }

  // 部屋番号の場合は既存フロー（フォールバック）
  if (roomNumber) {
    return await handleLegacyOrder(roomNumber, items, specialInstructions)
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'セッションIDまたは部屋番号が必要です'
  })
})
```

### **3. 注文表示・管理の修正**

#### **運用モード画面での注文表示**
```typescript
// pages/admin/front-desk/operation.vue
// Line 130-136 の注文プレビュー表示
<div v-if="room.orders.length > 0" class="orders-preview">
  <div class="orders-count">
    注文 {{ room.orders.length }}件
    <span v-if="room.currentSession" class="session-info">
      ({{ room.currentSession.sessionNumber }})
    </span>
  </div>
  <div v-for="order in room.orders" :key="order.id" class="order-item">
    <span :class="['order-status', order.status]">{{ getOrderStatusText(order.status) }}</span>
    <span class="order-time">{{ getElapsedTime(order.createdAt) }}</span>
  </div>
</div>
```

#### **注文履歴の表示**
```typescript
// Line 207-222 の注文詳細表示
<div v-if="selectedRoom.orders.length > 0" class="orders-detail">
  <h4>
    注文履歴
    <span v-if="selectedRoom.currentSession" class="session-badge">
      {{ selectedRoom.currentSession.sessionNumber }}
    </span>
  </h4>
  <div v-for="order in selectedRoom.orders" :key="order.id" class="order-detail">
    <!-- 既存の表示内容 + セッション情報 -->
  </div>
</div>
```

## 🎯 **実装優先度**

### **高優先度（Week 1）**
1. ✅ セッション対応注文API作成
2. ✅ 既存APIのフォールバック対応
3. ✅ 基本的な注文作成フローの修正

### **中優先度（Week 2）**
1. ✅ 電話注文処理の修正
2. ✅ 会計確認処理の修正
3. ✅ 注文表示UIの改善

### **低優先度（Week 3以降）**
1. ✅ 注文履歴の高度な管理
2. ✅ セッション間の注文比較機能
3. ✅ 分析・レポート機能

## 🚨 **互換性維持戦略**

### **段階的移行アプローチ**
```typescript
// 注文作成の段階的移行
const createOrder = async (orderData: any) => {
  try {
    // 新しいセッションフローを試行
    const { getActiveSessionByRoom, createSessionOrder } = useSessionApi()
    const activeSession = await getActiveSessionByRoom(roomNumber)

    if (activeSession) {
      return await createSessionOrder({
        sessionId: activeSession.id,
        items: orderData.items,
        notes: orderData.notes
      })
    }
  } catch (error) {
    console.warn('セッション注文作成に失敗。既存フローを使用します。', error)
  }

  // フォールバック: 既存フロー
  return await $fetch('/api/v1/order', {
    method: 'POST',
    body: {
      roomNumber: roomNumber,
      items: orderData.items,
      specialInstructions: orderData.notes
    }
  })
}
```

### **データ整合性確保**
```typescript
// 注文取得時の整合性チェック
const fetchOrdersWithValidation = async (roomNumber: string) => {
  // セッション対応API
  const sessionOrders = await getRoomOrders(roomNumber)

  // 既存API（比較用）
  const legacyOrders = await getRoomOrdersLegacy(roomNumber)

  // データ整合性チェック
  if (sessionOrders.orders.length !== legacyOrders.orders.length) {
    console.warn('注文データの不整合を検出:', {
      sessionCount: sessionOrders.orders.length,
      legacyCount: legacyOrders.orders.length
    })
  }

  return sessionOrders
}
```

## 📝 **テストケース**

### **基本機能テスト**
1. ✅ セッション対応注文作成
2. ✅ 部屋番号からセッション取得
3. ✅ 注文取得・表示
4. ✅ エラーハンドリング

### **互換性テスト**
1. ✅ 既存APIとの並行動作
2. ✅ フォールバック機能
3. ✅ データ整合性確認

### **エッジケーステスト**
1. ✅ セッションが存在しない場合
2. ✅ 複数セッションが存在する場合
3. ✅ セッション切り替え時の動作

---

**この分析に基づいて、段階的で安全な注文処理の移行を実現します。**

