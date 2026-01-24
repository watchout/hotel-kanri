# データベースアクセスポリシーの決定

**Doc-ID**: ADR-2025-003
**Version**: 1.0
**Status**: Active
**Owner**: 金子裕司
**Linked-Docs**: SPEC-2025-003, SPEC-2025-004

---

## 📋 **決定事項**

hotel-saasプロジェクトにおいて、**hotel-common API経由のみ**によるデータアクセスを強制し、PrismaClientの直接使用を全面禁止する厳格なデータベースアクセスポリシーを採用する。

## 🎯 **背景・課題**

### **アーキテクチャ設計思想**
hotel-saasは統合アーキテクチャにおいて「フロントエンド層」として設計されており、データベースへの直接アクセスは設計思想に反する。

### **解決すべき問題**
1. **設計違反**: PrismaClientの直接使用による統合アーキテクチャからの逸脱
2. **メモリリーク**: 複数のPrismaClient初期化による資源消費
3. **循環参照**: ビルドエラーの原因となる依存関係の複雑化
4. **保守性低下**: データアクセスロジックの分散による保守困難

## 🏗️ **アーキテクチャ決定**

### **1. 厳格な層分離**
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
    - フォールバック処理でのDB操作

hotel-common (バックエンド層):
  責務:
    - 統合データベース管理
    - 認証・認可処理
    - ビジネスロジック実行
    - データAPI提供
```

### **2. API呼び出しパターンの標準化**
```typescript
// ✅ 正しい実装パターン
const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'

const response = await $fetch(`${hotelCommonApiUrl}/api/v1/admin/summary`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${authUser.token}`,
    'Content-Type': 'application/json'
  },
  query: { from, to }
})

if (!response?.success) {
  throw createError({
    statusCode: 503,
    statusMessage: 'Service unavailable. Please ensure hotel-common is running.'
  })
}
```

### **3. 全面禁止事項の明確化**
```typescript
// ❌ 以下のパターンは全面禁止
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// ❌ 直接クエリ実行
const result = await prisma.order.findMany()

// ❌ Raw SQLクエリ
const result = await prisma.$queryRaw`SELECT * FROM orders`

// ❌ フォールバック処理でのDB操作
try {
  const response = await $fetch('/api/hotel-common')
} catch (error) {
  // 直接DB接続でフォールバック ← 絶対禁止
  const prisma = new PrismaClient()
  return await prisma.order.findMany()
}
```

## ⚖️ **代替案との比較**

### **検討した代替案**

#### **案A: ハイブリッドアプローチ**
- **内容**: 重要なAPIはhotel-common、軽微なものは直接DB
- **メリット**: 実装の柔軟性
- **デメリット**: アーキテクチャの一貫性欠如、保守性低下
- **判定**: ❌ 設計思想に反する

#### **案B: 段階的移行**
- **内容**: 既存のPrisma使用を段階的にAPI化
- **メリット**: 移行リスクの分散
- **デメリット**: 移行期間中の複雑性、一貫性の欠如
- **判定**: ❌ 長期的な技術負債を生む

#### **案C: 厳格なAPI専用化（採用）**
- **内容**: hotel-common API経由のみを許可
- **メリット**: アーキテクチャの一貫性、保守性向上、設計思想準拠
- **デメリット**: 初期実装コスト
- **判定**: ✅ 長期的な品質・保守性を重視

## 🔄 **実装方針**

### **API統合パターン**

#### **1. 認証付きAPI呼び出し**
```typescript
export async function callHotelCommonAPI(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: any
    query?: Record<string, any>
    authUser: AuthUser
  }
) {
  const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'

  return await $fetch(`${hotelCommonApiUrl}/api/v1${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${options.authUser.token}`,
      'Content-Type': 'application/json'
    },
    body: options.body,
    query: options.query
  })
}
```

#### **2. エラーハンドリング標準化**
```typescript
try {
  const response = await callHotelCommonAPI('/admin/summary', { authUser })

  if (!response?.success) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Invalid response from hotel-common'
    })
  }

  return response.data
} catch (error: any) {
  if (error.response?.status) {
    throw createError({
      statusCode: error.response.status,
      statusMessage: error.response.data?.error?.message || 'hotel-common API error'
    })
  }

  throw createError({
    statusCode: 503,
    statusMessage: 'Service unavailable. Please ensure hotel-common is running.'
  })
}
```

### **移行完了状況**

#### **修正済みAPI（例）**
- ✅ `server/api/v1/auth/login.post.ts` - hotel-common認証API使用
- ✅ `server/api/v1/admin/summary.get.ts` - hotel-common統計API使用
- ✅ `server/api/v1/admin/front-desk/rooms.get.ts` - hotel-common客室API使用
- ✅ `server/api/v1/admin/front-desk/accounting.get.ts` - hotel-common会計API使用
- ✅ `server/api/v1/admin/operation-logs.get.ts` - hotel-common操作ログAPI使用

## 📊 **成功指標**

### **技術指標**
- **PrismaClient直接使用**: 0件
- **$queryRaw使用**: 0件
- **フォールバック処理**: 0件
- **hotel-common API依存率**: 100%

### **品質指標**
- **メモリリーク**: 0件
- **循環参照エラー**: 0件
- **ビルドエラー**: 0件
- **アーキテクチャ準拠率**: 100%

### **保守性指標**
- **データアクセスロジック集約率**: 100%
- **API仕様統一率**: 100%
- **エラーハンドリング統一率**: 100%

## 🚨 **リスク・対策**

### **パフォーマンスリスク**
- **リスク**: API呼び出しによるレイテンシ増加
- **対策**: hotel-commonの最適化、キャッシュ戦略の導入

### **可用性リスク**
- **リスク**: hotel-common障害時のサービス停止
- **対策**: hotel-commonの冗長化、ヘルスチェック機能

### **開発効率リスク**
- **リスク**: API実装待ちによる開発遅延
- **対策**: hotel-commonとの並行開発、モックAPI活用

## 🔍 **監視・検証**

### **自動チェック**
```bash
# Prisma使用チェック
grep -r "PrismaClient" server/ --include="*.ts" --exclude-dir=node_modules

# $queryRaw使用チェック
grep -r "\$queryRaw" server/ --include="*.ts" --exclude-dir=node_modules

# 直接DB接続チェック
grep -r "prisma\." server/ --include="*.ts" --exclude-dir=node_modules
```

### **品質ゲート**
- CI/CDパイプラインでの自動チェック
- プルリクエスト時の必須レビュー項目
- 定期的なアーキテクチャ監査

## 🎊 **結論**

hotel-saasプロジェクトにおいて、**厳格なデータベースアクセスポリシー**を採用することで、以下の効果を実現する：

### **アーキテクチャ品質向上**
- 統合アーキテクチャ設計思想の完全準拠
- 層分離の明確化による保守性向上
- 技術負債の根本的解決

### **開発効率向上**
- データアクセスロジックの集約による一元管理
- API仕様の統一による開発効率向上
- エラーハンドリングの標準化

### **システム安定性向上**
- メモリリーク・循環参照の根本的解決
- 一貫したエラーハンドリング
- 統合テストの簡素化

この決定により、hotel-saasは真の「フロントエンド層」として機能し、hotel-commonとの適切な役割分担を実現する。
