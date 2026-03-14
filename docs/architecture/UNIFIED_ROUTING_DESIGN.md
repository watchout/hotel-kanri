# 🚀 統一ルーティング設計ドキュメント

**作成日**: 2025年9月17日  
**対象システム**: hotel-kanri (Nuxt 3 + Nitro)  
**目的**: 技術スタック矛盾の解決とルーティング標準化

---

## 🔧 **確定技術スタック**

### **実装済み技術構成**
```yaml
Frontend & Backend:
  Framework: Nuxt 3.16.2
  Server Engine: Nitro (Nuxt内蔵)
  Language: TypeScript
  
Database:
  ORM: Prisma 6.7.0
  Database: SQLite (開発) / PostgreSQL (本番想定)
  
API Architecture:
  Type: File-based Routing (Nitro)
  Structure: server/api/ ディレクトリ
  Format: [name].[method].ts
```

### **❌ 廃止された技術スタック記述**
以下のドキュメント記述は**実装と矛盾**しているため無効とします：

- ~~Express.js フレームワーク~~
- ~~NestJS フレームワーク~~
- ~~独立したバックエンドサービス~~

---

## 📁 **統一ルーティング規則**

### **1. ディレクトリ構造標準**

```
server/api/
├── healthz.get.ts                    # ヘルスチェック
├── v1/                              # APIバージョン管理
│   ├── auth/                        # 認証関連
│   │   ├── login.post.ts
│   │   ├── logout.post.ts
│   │   └── verify.get.ts
│   ├── admin/                       # 管理機能
│   │   ├── rooms/
│   │   │   ├── list.get.ts          # 部屋一覧
│   │   │   ├── create.post.ts       # 部屋作成
│   │   │   ├── [id].get.ts          # 部屋詳細
│   │   │   ├── [id].put.ts          # 部屋更新
│   │   │   └── [id].delete.ts       # 部屋削除
│   │   ├── orders/
│   │   │   ├── list.get.ts          # 注文一覧
│   │   │   ├── create.post.ts       # 注文作成
│   │   │   ├── [id].get.ts          # 注文詳細
│   │   │   └── [id].put.ts          # 注文更新
│   │   └── memos/                   # メモ管理（フラット化）
│   │       ├── list.get.ts          # メモ一覧
│   │       ├── create.post.ts       # メモ作成
│   │       ├── [id].get.ts          # メモ詳細
│   │       ├── [id].put.ts          # メモ更新
│   │       └── [id].delete.ts       # メモ削除
│   └── guest/                       # ゲスト機能
│       ├── orders/
│       │   ├── create.post.ts       # 注文作成
│       │   └── status.get.ts        # 注文状況
│       └── info/
│           └── list.get.ts          # 情報一覧
└── ws/                              # WebSocket
    ├── orders.ts                    # 注文リアルタイム
    └── notifications.ts             # 通知リアルタイム
```

### **2. 🚨 必須遵守ルール**

#### **❌ 禁止パターン**
```yaml
# 深いネスト（2階層以上の動的パス）
❌ /api/v1/admin/orders/[id]/items/[itemId]
❌ /api/v1/admin/rooms/[roomNumber]/memos/[memoId]

# index.*ファイル（Nitroバグ対応）
❌ server/api/v1/admin/rooms/index.get.ts
❌ server/api/v1/admin/orders/index.post.ts

理由: Nuxt 3のVue Routerが干渉し、404エラーの原因となる
```

#### **✅ 推奨パターン**
```yaml
# フラット構造への変更
✅ /api/v1/admin/order-items/[itemId]
✅ /api/v1/admin/room-memos/[memoId]

# 明示的なファイル名使用
✅ server/api/v1/admin/rooms/list.get.ts
✅ server/api/v1/admin/orders/create.post.ts

# クエリパラメータ活用
✅ /api/v1/admin/order-items?orderId=123
✅ /api/v1/admin/room-memos?roomNumber=101
```

### **3. RESTful設計原則**

#### **標準CRUD操作**
```yaml
# リソース操作の標準化
GET    /api/v1/admin/{resource}/list.get.ts       # 一覧取得
POST   /api/v1/admin/{resource}/create.post.ts    # 新規作成
GET    /api/v1/admin/{resource}/[id].get.ts       # 詳細取得
PUT    /api/v1/admin/{resource}/[id].put.ts       # 更新
DELETE /api/v1/admin/{resource}/[id].delete.ts    # 削除

# 特殊操作
GET    /api/v1/admin/{resource}/search.get.ts     # 検索
POST   /api/v1/admin/{resource}/validate.post.ts  # バリデーション
GET    /api/v1/admin/{resource}/export.get.ts     # エクスポート
POST   /api/v1/admin/{resource}/import.post.ts    # インポート
```

---

## 🔧 **実装ガイドライン**

### **1. APIファイル実装テンプレート**

```typescript
// server/api/v1/admin/rooms/list.get.ts
import { prisma } from '~/server/utils/prisma'
import { verifyAuth } from '~/server/utils/auth-helpers'

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const authUser = await verifyAuth(event)
    if (!authUser) {
      throw createError({ 
        statusCode: 401, 
        statusMessage: 'Unauthorized' 
      })
    }

    // クエリパラメータ取得
    const query = getQuery(event)
    const { page = 1, limit = 10, search } = query

    // データ取得
    const rooms = await prisma.room.findMany({
      where: search ? {
        OR: [
          { name: { contains: search as string } },
          { roomNumber: { contains: search as string } }
        ]
      } : {},
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      orderBy: { createdAt: 'desc' }
    })

    const total = await prisma.room.count({
      where: search ? {
        OR: [
          { name: { contains: search as string } },
          { roomNumber: { contains: search as string } }
        ]
      } : {}
    })

    return {
      success: true,
      data: rooms,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.message || 'Internal Server Error'
    })
  }
})
```

### **2. 動的パラメータ取得**

```typescript
// server/api/v1/admin/rooms/[id].get.ts
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'Room ID is required' 
    })
  }

  // 処理続行...
})
```

### **3. エラーハンドリング標準**

```typescript
// 統一エラーレスポンス形式
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

// 成功レスポンス形式
interface SuccessResponse<T> {
  success: true
  data: T
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

---

## 🚨 **現在の問題と修正計画**

### **1. 緊急修正が必要な問題**

#### **問題1: POST /api/v1/memos ルーティング競合**
```yaml
現状: POST /api/v1/memos が既読処理APIに誤って到達
原因: ルーティング順序とパス設計の問題
```

**修正計画**:
1. メモ関連APIをフラット構造に変更
2. 既読処理APIを明確に分離
3. ルーティング順序を最適化

#### **問題2: 技術スタックドキュメント矛盾**
```yaml
矛盾箇所: 
  - docs/01_systems/saas/specs/2025-01-28_system-architecture.v1.md
  - 複数のExpress.js記述
```

**修正計画**:
1. 矛盾ドキュメントの修正
2. 統一技術スタック定義の確立
3. 開発ルールの明文化

### **2. 段階的修正スケジュール**

#### **Phase 1: 緊急修正（即時実行）**
- [ ] POST /api/v1/memos ルーティング修正
- [ ] 技術スタックドキュメント統一
- [ ] 開発ルール文書化

#### **Phase 2: 構造改善（1週間以内）**
- [ ] 既存APIのフラット化
- [ ] RESTful原則準拠への変更
- [ ] 自動チェックスクリプト導入

#### **Phase 3: 品質向上（2週間以内）**
- [ ] 統一エラーハンドリング実装
- [ ] API仕様書自動生成
- [ ] テスト自動化

---

## 🛡️ **品質保証措置**

### **1. 開発時チェック**

```bash
# ルーティングルール違反チェック
npm run check:routing-rules

# 深いネストチェック
npm run check:deep-routes

# index.*ファイルチェック
npm run check:index-files

# 全体品質チェック
npm run check:all
```

### **2. Git Pre-commit Hook**

```bash
#!/bin/sh
# .husky/pre-commit

echo "🔍 ルーティングルール違反チェック実行中..."
npm run check:routing-rules

if [ $? -ne 0 ]; then
  echo "❌ APIルーティングルール違反が検出されました"
  echo "📋 修正後に再度コミットしてください"
  exit 1
fi

echo "✅ ルーティングルール準拠確認完了"
```

### **3. 継続的監視**

- **週次**: ルール遵守状況監査
- **月次**: API設計レビュー
- **四半期**: 技術スタック整合性確認

---

## 📚 **参考資料**

### **公式ドキュメント**
- [Nuxt 3 Server API](https://nuxt.com/docs/guide/directory-structure/server)
- [Nitro File-based Routing](https://nitro.unjs.io/guide/routing)
- [H3 Event Handlers](https://h3.unjs.io/)

### **内部ドキュメント**
- `docs/01_systems/saas/API_ROUTING_GUIDELINES.md`
- `docs/development/DEVELOPMENT_RULES_AND_PROCESSES.md`
- `nuxt.config.ts` (Nitro設定)

---

## 🎯 **今後の開発方針**

### **1. 新規API開発時**
1. この統一設計ドキュメントを必ず確認
2. フラット構造・明示的命名を徹底
3. 実装前にルール違反チェックを実行
4. RESTful原則に従った設計

### **2. 既存API修正時**
1. 修正機会にルール準拠へ変更
2. フロントエンド側のパス更新も同時実行
3. 後方互換性を考慮した段階的移行
4. 修正後の動作確認を徹底

### **3. レビュー基準**
- ルール違反APIは承認しない
- 例外が必要な場合は事前相談・文書化必須
- 定期的なルール遵守状況監査
- 技術スタック整合性の維持

---

**📝 最終更新**: 2025年9月17日  
**📋 適用対象**: hotel-kanri全APIエンドポイント  
**🔄 更新頻度**: 問題発生時・ルール変更時に随時更新  
**👥 責任者**: 開発チーム全員
