# 統合ログシステム API使用例

**対象**: hotel-saas開発チーム  
**作成日**: 2025年9月25日  
**実装状況**: Phase 4完了

---

## 📋 概要

hotel-commonが提供する統合ログシステムのAPI使用方法を説明します。

### 提供API一覧

| エンドポイント | メソッド | 用途 |
|---------------|---------|------|
| `/api/v1/logs/auth` | POST | 認証ログ記録 |
| `/api/v1/logs/ai-operation` | POST | AI操作ログ記録 |
| `/api/v1/logs/billing` | POST | 請求ログ記録 |
| `/api/v1/logs/security` | POST | セキュリティログ記録 |
| `/api/v1/logs/device-usage` | POST | デバイス使用ログ記録 |
| `/api/v1/logs/search` | GET | ログ検索 |
| `/api/v1/logs/health` | GET | ヘルスチェック |

---

## 🔧 hotel-saasでの実装方法

### 1. ログクライアントの設定

```typescript
// hotel-saas/src/services/log-service.ts
import { createLogClient } from '@hotel-common/log-client'

const logClient = createLogClient({
  baseURL: process.env.HOTEL_COMMON_URL || 'http://localhost:3400',
  timeout: 10000
})

export { logClient }
```

### 2. 認証ログの記録

```typescript
// ログイン成功時
await logClient.logAuth({
  tenantId: user.tenantId,
  userId: user.id,
  action: 'LOGIN',
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  sessionId: session.id,
  success: true,
  deviceInfo: {
    deviceType: 'desktop',
    os: 'Windows 10',
    browser: 'Chrome 118'
  }
})

// ログイン失敗時
await logClient.logAuth({
  tenantId: tenantId,
  action: 'LOGIN_FAILED',
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  success: false,
  failureReason: 'パスワードが間違っています'
})
```

### 3. AI操作ログの記録

```typescript
// AIコンシェルジュ使用時
await logClient.logAiOperation({
  tenantId: user.tenantId,
  userId: user.id,
  operation: 'USE',
  aiFunction: 'CONCIERGE_CHAT',
  creditAmount: 10,
  balanceBefore: 100,
  balanceAfter: 90,
  requestDetails: {
    question: 'おすすめのメニューを教えて',
    language: 'ja'
  },
  responseDetails: {
    recommendations: ['ハンバーガー', 'パスタ'],
    confidence: 0.85
  },
  processingTimeMs: 1500,
  success: true
})
```

### 4. 請求ログの記録

```typescript
// 月次請求計算時
await logClient.logBilling({
  tenantId: tenant.id,
  billingPeriod: '2025-09',
  operation: 'CALCULATE',
  amount: 29800,
  currency: 'JPY',
  calculationDetails: {
    baseAmount: 19800,
    additionalDevices: 5,
    deviceCost: 2000,
    aiCreditUsage: 8000
  }
})

// 支払い処理時
await logClient.logBilling({
  tenantId: tenant.id,
  billingPeriod: '2025-09',
  operation: 'PAYMENT',
  amount: 29800,
  currency: 'JPY',
  paymentMethod: 'credit_card',
  paymentStatus: 'completed',
  externalTransactionId: 'stripe_pi_1234567890',
  invoiceNumber: 'INV-2025-09-001'
})
```

### 5. セキュリティログの記録

```typescript
// 不正アクセス検知時
await logClient.logSecurity({
  tenantId: user.tenantId,
  userId: user.id,
  eventType: 'UNAUTHORIZED_ACCESS',
  severity: 'HIGH',
  description: '管理者権限が必要なページへの不正アクセス試行',
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  requestDetails: {
    attemptedPath: '/admin/users',
    userRole: 'user',
    requiredRole: 'admin'
  },
  detectionMethod: 'PERMISSION_CHECK',
  actionTaken: 'BLOCKED'
})

// 異常な操作パターン検知時
await logClient.logSecurity({
  tenantId: user.tenantId,
  userId: user.id,
  eventType: 'SUSPICIOUS_ACTIVITY',
  severity: 'MEDIUM',
  description: '短時間での大量価格変更操作',
  requestDetails: {
    operationCount: 50,
    timeWindow: '5分',
    affectedItems: menuItemIds
  },
  detectionMethod: 'PATTERN_ANALYSIS',
  actionTaken: 'LOGGED'
})
```

### 6. デバイス使用ログの記録

```typescript
// デバイス接続時
await logClient.logDeviceUsage({
  tenantId: tenant.id,
  deviceId: device.id,
  roomId: '101',
  eventType: 'CONNECT',
  connectionQuality: 4,
  deviceInfo: {
    model: 'iPad Pro 12.9',
    osVersion: 'iPadOS 17.1',
    appVersion: '2.1.0'
  },
  networkInfo: {
    connectionType: 'wifi',
    signalStrength: -45,
    bandwidth: 150.5
  }
})

// セッション終了時
await logClient.logDeviceUsage({
  tenantId: tenant.id,
  deviceId: device.id,
  roomId: '101',
  eventType: 'DISCONNECT',
  sessionDurationMins: 45,
  dataTransferredMb: 12.5,
  performanceMetrics: {
    ordersPlaced: 3,
    revenueGenerated: 4500,
    averageResponseTime: 250
  }
})
```

### 7. ログ検索

```typescript
// 特定テナントの認証ログを検索
const authLogs = await logClient.searchLogs({
  tenantId: tenant.id,
  logTypes: ['auth'],
  startDate: new Date('2025-09-01'),
  endDate: new Date('2025-09-30'),
  limit: 100,
  offset: 0
})

// 高重要度のセキュリティログを検索
const securityLogs = await logClient.searchLogs({
  tenantId: tenant.id,
  logTypes: ['security'],
  severity: 'HIGH',
  limit: 50
})
```

---

## 🚨 重要な実装ポイント

### 1. エラーハンドリング

```typescript
try {
  await logClient.logAuth(authParams)
} catch (error) {
  // ログ記録失敗はメイン処理を止めない
  console.error('ログ記録失敗:', error)
  // 必要に応じてフォールバック処理
}
```

### 2. 非同期処理

```typescript
// メイン処理をブロックしないよう非同期で実行
const processOrder = async (orderData) => {
  // メイン処理
  const order = await createOrder(orderData)
  
  // ログ記録（非同期、エラーでもメイン処理は継続）
  logClient.logAiOperation(aiLogParams).catch(console.error)
  
  return order
}
```

### 3. バッチ処理での使用

```typescript
// 大量データ処理時は適度に間隔を空ける
for (const device of devices) {
  await logClient.logDeviceUsage(deviceLogParams)
  await new Promise(resolve => setTimeout(resolve, 100)) // 100ms待機
}
```

---

## 📊 パフォーマンス考慮事項

### 1. ログ記録頻度の制限

- **認証ログ**: 制限なし（セキュリティ重要）
- **AI操作ログ**: 制限なし（課金重要）
- **デバイスログ**: 1分間隔推奨
- **セキュリティログ**: 制限なし（セキュリティ重要）

### 2. データサイズの制限

- **requestDetails/responseDetails**: 各10KB以下推奨
- **deviceInfo/networkInfo**: 各5KB以下推奨
- **description**: 1000文字以下推奨

---

## 🔍 トラブルシューティング

### よくあるエラーと対処法

```typescript
// 1. 接続エラー
if (!(await logClient.healthCheck())) {
  console.warn('ログサービスに接続できません')
  // フォールバック処理
}

// 2. バリデーションエラー
try {
  await logClient.logAuth(params)
} catch (error) {
  if (error.response?.status === 400) {
    console.error('パラメータエラー:', error.response.data.errors)
  }
}

// 3. タイムアウトエラー
const logClientWithRetry = createLogClient({
  baseURL: process.env.HOTEL_COMMON_URL,
  timeout: 5000 // 短めに設定
})
```

---

## 📋 実装チェックリスト

### hotel-saasでの実装確認項目

- [ ] ログクライアントの設定完了
- [ ] 認証ログの記録実装（ログイン/ログアウト/失敗）
- [ ] AI操作ログの記録実装（コンシェルジュ/クレジット）
- [ ] 請求ログの記録実装（計算/支払い）
- [ ] セキュリティログの記録実装（不正アクセス/異常操作）
- [ ] デバイス使用ログの記録実装（接続/セッション）
- [ ] エラーハンドリングの実装
- [ ] パフォーマンステストの実施

---

**作成者**: hotel-common開発チーム  
**更新日**: 2025年9月25日  
**次回更新予定**: Phase 5完了後
