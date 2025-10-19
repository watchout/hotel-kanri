# 🚨 データベースアクセスポリシー（厳格版）

> 更新履歴 (2025-09-08, hotel-common 統合管理による更新)
> - 認証方式の明確化: ブラウザは認証Cookie、`Authorization: Bearer` はサーバ間通信に限定
> - 直トークン参照/localStorage保存の禁止を追記

## **📋 基本方針**

### **✅ 許可されるアクセス方法**
- **hotel-common API経由のみ**
- `$fetch()` を使用したHTTP API呼び出し
- 統合認証システムを通じた認可済みアクセス

#### 認証の取り扱い（更新）
- ブラウザ: httpOnly+Secure+SameSite=strict の認証Cookieを使用
- サーバ間（saas→common）: `Authorization: Bearer <token>` を使用

### **❌ 全面禁止事項**
- **PrismaClient の直接初期化**
- **prisma.* の直接実行**
- **$queryRaw の使用**
- **データベース直接接続**
- **フォールバック処理でのDB操作**
- **ブラウザからの Authorization ヘッダー使用**
- **localStorage へのトークン保存**

## **🏗️ 正しいアーキテクチャ**

```yaml
hotel-saas (フロントエンド層):
  責務:
    - UI/UX提供
    - hotel-common API呼び出し
    - 認証状態管理
    - ビジネスロジック表示

  禁止事項:
    - 直接DB接続
    - Prisma直接使用
    - データ永続化処理

hotel-common (バックエンド層):
  責務:
    - 統合データベース管理
    - 認証・認可処理
    - ビジネスロジック実行
    - データAPI提供
```

## **🔄 API呼び出しパターン**

### **正しい実装例**
```typescript
// ✅ 正しい: hotel-common API使用
const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400/api/v1'

const response = await $fetch(`${hotelCommonApiUrl}/admin/summary`, {
  method: 'GET',
  query: { from, to }
})

if (!response || !response.success) {
  throw createError({
    statusCode: 503,
    statusMessage: 'Service unavailable. Please ensure hotel-common is running.'
  })
}
```

### **禁止された実装例**
```typescript
// ❌ 禁止: Prisma直接使用
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const result = await prisma.order.findMany()

// ❌ 禁止: フォールバック処理
try {
  // hotel-common API呼び出し
} catch (error) {
  // 直接DB接続でフォールバック ← 絶対禁止
  const prisma = new PrismaClient()
  return await prisma.order.findMany()
}
```

## **📊 修正完了状況**

### **修正済みファイル**
- ✅ `server/api/v1/auth/login.post.ts` - hotel-common認証API使用
- ✅ `server/api/v1/admin/summary.get.ts` - hotel-common統計API使用
- ✅ `server/api/v1/admin/devices/count.get.ts` - hotel-commonデバイスAPI使用
- ✅ `server/api/v1/admin/orders/monthly-count.get.ts` - hotel-common注文API使用
- ✅ `server/api/v1/orders/history.get.ts` - hotel-common履歴API使用
- ✅ `server/api/v1/order/index.post.ts` - Prismaインポート削除
- ✅ `server/api/v1/admin/statistics/kpis.get.ts` - Prismaインポート削除

### **要修正ファイル（残り）**
- 🔄 `server/api/v1/receipts/[receiptId].get.ts`
- 🔄 `server/api/v1/order/gacha-draw.post.ts`
- 🔄 `server/api/v1/order/menu.get.ts`
- 🔄 `server/api/v1/order/place.post.ts`
- 🔄 その他統計・管理系API

## **🎯 完全統合目標**

1. **hotel-saas**: 100% hotel-common API依存
2. **DB直接アクセス**: 0件
3. **Prisma直接使用**: 0件
4. **フォールバック処理**: 0件

---
**更新日時**: 2024-12-19
**適用範囲**: hotel-saasプロジェクト全体
**遵守レベル**: 必須（違反は開発停止対象）
