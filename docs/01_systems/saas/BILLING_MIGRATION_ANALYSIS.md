# 会計処理のセッション対応移行分析

## 📋 **現在の会計処理実装分析**

### **現在のAPIエンドポイント**
- **`/api/v1/admin/front-desk/billing.post.ts`** - メイン会計処理API

### **現在のリクエスト形式**
```typescript
{
  roomNumber: string,              // 部屋番号で識別
  orders: Array<Order>,            // 注文データ
  totalAmount: number,             // 合計金額
  discounts?: Array<Discount>,     // 割引情報
  paymentMethod: string,           // 決済方法
  receivedAmount?: number,         // 受取金額
  change?: number,                 // お釣り
  includeCheckout?: boolean        // チェックアウト含む
}
```

### **現在の処理フロー**
1. **請求書作成** - hotel-commonの`/api/v1/accounting/invoices`
2. **決済処理** - hotel-commonの`/api/v1/accounting/payments`
3. **チェックアウト処理** - 客室状態を`available`に更新

## 🔄 **セッション対応への変更点**

### **1. APIリクエスト形式の変更**

#### **Before (現在)**
```typescript
{
  roomNumber: string,              // 部屋番号で識別
  orders: Array<Order>,
  totalAmount: number,
  paymentMethod: string,
  receivedAmount?: number,
  change?: number,
  includeCheckout?: boolean
}
```

#### **After (セッション対応)**
```typescript
{
  sessionId: string,               // roomNumberから変更
  orders: Array<Order>,            // 同じ
  totalAmount: number,             // 同じ
  paymentMethod: string,           // 同じ
  receivedAmount?: number,         // 同じ
  change?: number,                 // 同じ
  includeCheckout?: boolean,       // セッション終了に変更
  finalAmount?: number,            // 新規追加
  notes?: string                   // 新規追加
}
```

### **2. 処理フローの変更**

#### **Before (現在のフロー)**
```typescript
// 1. 部屋番号ベースの請求書作成
const invoiceResponse = await $fetch('/api/v1/accounting/invoices', {
  body: {
    customer_name: `客室 ${roomNumber}`,
    customer_email: `room${roomNumber}@hotel.com`,
    items: orders.map(order => ({ /* ... */ })),
    notes: `客室 ${roomNumber} の会計処理`
  }
})

// 2. チェックアウト時は客室状態を更新
if (includeCheckout) {
  await updateRoomStatus(roomNumber, 'available')
}
```

#### **After (セッション対応フロー)**
```typescript
// 1. セッション情報を取得
const sessionResponse = await $fetch(`/api/v1/admin/front-desk/sessions/${sessionId}`)
const session = sessionResponse.data.session

// 2. セッション情報ベースの請求書作成
const invoiceResponse = await $fetch('/api/v1/accounting/invoices', {
  body: {
    customer_name: session.primaryGuestName,
    customer_email: session.primaryGuestEmail,
    items: orders.map(order => ({ /* ... */ })),
    notes: `セッション ${session.sessionNumber} の会計処理`,
    session_id: sessionId
  }
})

// 3. セッション会計状況を更新
await $fetch(`/api/v1/admin/front-desk/sessions/${sessionId}`, {
  method: 'PUT',
  body: {
    totalAmount: session.totalAmount + totalAmount,
    paidAmount: session.paidAmount + totalAmount,
    billingStatus: 'completed'
  }
})

// 4. チェックアウト時はセッション終了
if (includeCheckout) {
  await $fetch(`/api/v1/admin/front-desk/sessions/${sessionId}/checkout`, {
    method: 'PUT',
    body: {
      checkoutDate: new Date().toISOString(),
      finalAmount: totalAmount,
      notes: notes
    }
  })
}
```

### **3. フロントエンド処理の変更**

#### **会計確認ページ (`pages/admin/front-desk/cash-register.vue`)**
```typescript
// Line 1033-1044 の修正が必要
const processPayment = async () => {
  // Before
  const response = await authenticatedFetch('/api/v1/admin/front-desk/billing', {
    method: 'POST',
    body: {
      roomNumber: room.value,
      orders: ordersToProcess,
      totalAmount: total.value,
      paymentMethod: method.value,
      receivedAmount: received.value,
      change: change.value,
      includeCheckout: includeCheckout.value
    }
  })

  // After (セッション対応)
  const { getActiveSessionByRoom } = useSessionApi()
  const activeSession = await getActiveSessionByRoom(room.value)

  if (!activeSession) {
    throw new Error('アクティブなセッションが見つかりません')
  }

  const { processSessionBilling } = useSessionBilling()
  const response = await processSessionBilling(activeSession.id, {
    orders: ordersToProcess,
    totalAmount: total.value,
    paymentMethod: method.value,
    receivedAmount: received.value,
    change: change.value,
    includeCheckout: includeCheckout.value,
    notes: `会計処理 - ${new Date().toLocaleDateString('ja-JP')}`
  })
}
```

## 🔧 **必要な修正作業**

### **1. サーバーサイドAPIの修正**

#### **セッション対応会計API**
```typescript
// server/api/v1/admin/front-desk/billing.post.ts の修正
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { sessionId, roomNumber, orders, totalAmount, paymentMethod, receivedAmount, change, includeCheckout, finalAmount, notes } = body

  // 認証チェック
  const authUser = await verifyAuth(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  // セッションIDが提供された場合は新フロー
  if (sessionId) {
    return await handleSessionBilling(sessionId, {
      orders, totalAmount, paymentMethod, receivedAmount, change, includeCheckout, finalAmount, notes
    }, authUser.token)
  }

  // 部屋番号の場合は既存フロー（フォールバック）
  if (roomNumber) {
    return await handleLegacyBilling(roomNumber, {
      orders, totalAmount, paymentMethod, receivedAmount, change, includeCheckout
    }, authUser.token)
  }

  throw createError({
    statusCode: 400,
    statusMessage: 'セッションIDまたは部屋番号が必要です'
  })
})

// セッション対応会計処理
async function handleSessionBilling(sessionId: string, billingData: any, token: string) {
  const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'

  // 1. セッション情報取得
  const sessionResponse = await $fetch(`${hotelCommonApiUrl}/api/v1/admin/front-desk/sessions/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })

  if (!sessionResponse.success) {
    throw createError({ statusCode: 404, statusMessage: 'セッションが見つかりません' })
  }

  const session = sessionResponse.data.session

  // 2. 請求書作成（セッション情報使用）
  const invoiceResponse = await $fetch(`${hotelCommonApiUrl}/api/v1/accounting/invoices`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: {
      customer_name: session.primaryGuestName,
      customer_email: session.primaryGuestEmail || `session${sessionId}@hotel.com`,
      items: billingData.orders.map((order: any) => ({
        name: order.name || order.menuItem?.name_ja || '商品',
        quantity: order.quantity || 1,
        unit_price: order.price || order.menuItem?.price || 0,
        description: order.notes || ''
      })),
      notes: `セッション ${session.sessionNumber} の会計処理`,
      session_id: sessionId,
      session_number: session.sessionNumber
    }
  })

  // 3. 決済処理
  const paymentResponse = await $fetch(`${hotelCommonApiUrl}/api/v1/accounting/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: {
      invoice_id: invoiceResponse.data?.invoice?.id,
      amount: billingData.totalAmount,
      payment_method: billingData.paymentMethod || 'cash',
      payment_reference: `SESSION-${session.sessionNumber}-${Date.now()}`,
      notes: `セッション ${session.sessionNumber} 決済完了`,
      received_amount: billingData.receivedAmount,
      change_amount: billingData.change,
      session_id: sessionId
    }
  })

  // 4. セッション会計状況更新
  await $fetch(`${hotelCommonApiUrl}/api/v1/admin/front-desk/sessions/${sessionId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: {
      totalAmount: session.totalAmount + billingData.totalAmount,
      paidAmount: session.paidAmount + billingData.totalAmount,
      billingStatus: 'completed'
    }
  })

  // 5. チェックアウト処理（セッション終了）
  if (billingData.includeCheckout) {
    await $fetch(`${hotelCommonApiUrl}/api/v1/admin/front-desk/sessions/${sessionId}/checkout`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: {
        checkoutDate: new Date().toISOString(),
        finalAmount: billingData.finalAmount || billingData.totalAmount,
        notes: billingData.notes || `チェックアウト完了 - ${new Date().toLocaleDateString('ja-JP')}`
      }
    })
  }

  return {
    success: true,
    message: 'セッション会計処理が完了しました',
    data: {
      sessionId,
      sessionNumber: session.sessionNumber,
      invoice: invoiceResponse.data?.invoice,
      payment: paymentResponse.data?.payment,
      totalAmount: billingData.totalAmount,
      checkoutCompleted: billingData.includeCheckout
    }
  }
}
```

### **2. フロントエンド処理の修正**

#### **会計確認処理の段階的移行**
```typescript
// pages/admin/front-desk/cash-register.vue
const processPayment = async () => {
  processing.value = true
  showConfirmModal.value = false

  try {
    // セッション対応フローを試行
    const { getActiveSessionByRoom } = useSessionApi()
    const activeSession = await getActiveSessionByRoom(room.value)

    if (activeSession) {
      // セッション対応会計処理
      const { processSessionBilling } = useSessionBilling()
      const response = await processSessionBilling(activeSession.id, {
        orders: ordersToProcess,
        totalAmount: total.value,
        paymentMethod: method.value,
        receivedAmount: method.value === 'cash' ? received.value : total.value,
        change: method.value === 'cash' ? change.value : 0,
        includeCheckout: includeCheckout.value,
        notes: `会計処理 - ${new Date().toLocaleDateString('ja-JP')}`
      })

      console.log('✅ セッション会計処理完了:', response)

      // 成功処理
      showSuccessToast('会計完了', `セッション ${activeSession.sessionNumber} の会計が完了しました`)

    } else {
      // フォールバック: 既存会計処理
      console.warn('アクティブセッションが見つかりません。既存フローを使用します。')

      const { authenticatedFetch } = useApiClient()
      const response = await authenticatedFetch('/api/v1/admin/front-desk/billing', {
        method: 'POST',
        body: {
          roomNumber: room.value,
          orders: ordersToProcess,
          totalAmount: total.value,
          paymentMethod: method.value,
          receivedAmount: method.value === 'cash' ? received.value : total.value,
          change: method.value === 'cash' ? change.value : 0,
          includeCheckout: includeCheckout.value
        }
      })

      console.log('✅ 既存会計処理完了:', response)
      showSuccessToast('会計完了', `${room.value}号室の会計が完了しました`)
    }

  } catch (error) {
    console.error('❌ 会計処理エラー:', error)
    showErrorToast('会計エラー', error.message || '会計処理に失敗しました')
  } finally {
    processing.value = false
  }
}
```

#### **会計履歴・レシート表示の改善**
```typescript
// セッション情報を含むレシート表示
const generateReceipt = (sessionData?: any) => {
  return {
    // 既存のレシート情報
    roomNumber: room.value,
    orders: selectedOrders.value,
    total: total.value,

    // セッション情報追加
    sessionNumber: sessionData?.sessionNumber || `R${room.value}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-XXX`,
    guestName: sessionData?.primaryGuestName || '宿泊者',
    checkinDate: sessionData?.checkedInAt || new Date().toISOString(),

    // QRコード用データ
    qrData: {
      sessionId: sessionData?.id,
      sessionNumber: sessionData?.sessionNumber,
      totalAmount: total.value,
      paymentDate: new Date().toISOString()
    }
  }
}
```

## 🎯 **実装優先度**

### **高優先度（Week 1）**
1. ✅ セッション対応会計API作成
2. ✅ 既存APIのフォールバック対応
3. ✅ 基本的な会計処理フローの修正

### **中優先度（Week 2）**
1. ✅ セッション終了（チェックアウト）処理
2. ✅ 会計履歴の改善
3. ✅ レシート・領収書の改善

### **低優先度（Week 3以降）**
1. ✅ セッション会計分析機能
2. ✅ 複数セッション間の会計比較
3. ✅ 高度なレポート機能

## 🚨 **互換性維持戦略**

### **段階的移行アプローチ**
```typescript
// 会計処理の段階的移行
const processBilling = async (billingData: any) => {
  try {
    // 新しいセッションフローを試行
    const { getActiveSessionByRoom } = useSessionApi()
    const activeSession = await getActiveSessionByRoom(roomNumber)

    if (activeSession) {
      const { processSessionBilling } = useSessionBilling()
      return await processSessionBilling(activeSession.id, billingData)
    }
  } catch (error) {
    console.warn('セッション会計処理に失敗。既存フローを使用します。', error)
  }

  // フォールバック: 既存フロー
  const { authenticatedFetch } = useApiClient()
  return await authenticatedFetch('/api/v1/admin/front-desk/billing', {
    method: 'POST',
    body: {
      roomNumber: roomNumber,
      ...billingData
    }
  })
}
```

### **データ整合性確保**
```typescript
// 会計処理後の整合性チェック
const validateBillingResult = async (result: any) => {
  if (result.sessionId) {
    // セッション会計状況を確認
    const { getSessionBillingStatus } = useSessionBilling()
    const billingStatus = await getSessionBillingStatus(result.sessionId)

    console.log('セッション会計状況:', billingStatus)
  }

  return result
}
```

## 📝 **テストケース**

### **基本機能テスト**
1. ✅ セッション対応会計処理
2. ✅ セッション終了（チェックアウト）
3. ✅ 会計履歴・レシート生成
4. ✅ エラーハンドリング

### **互換性テスト**
1. ✅ 既存APIとの並行動作
2. ✅ フォールバック機能
3. ✅ データ整合性確認

### **エッジケーステスト**
1. ✅ セッションが存在しない場合
2. ✅ 部分的な会計処理
3. ✅ 会計エラー時のロールバック

---

**この分析に基づいて、段階的で安全な会計処理の移行を実現します。**



