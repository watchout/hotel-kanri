# 🚀 ルーティング実装修正プラン

**作成日**: 2025年9月17日  
**対象**: hotel-kanri POST /api/v1/memos ルーティング競合問題  
**緊急度**: 🔴 **最高優先度**

---

## 🚨 **現在の問題状況**

### **問題の詳細**
```yaml
問題: POST /api/v1/memos が既読処理APIに誤って到達
影響: メモ作成機能が正常に動作しない
原因: Nuxt 3/Nitroのファイルベースルーティング競合
```

### **技術的根本原因**
1. **ルーティング順序の問題**: Nitroは定義順にルートをマッチング
2. **パス設計の曖昧性**: 複数のAPIが同じパスパターンを使用
3. **ファイル命名の不統一**: 明確な命名規則の欠如

---

## 🎯 **修正戦略**

### **Phase 1: 緊急修正（即時実行）**

#### **1.1 現在のルーティング状況調査**
```bash
# 現在のAPIファイル構造を確認
find server/api -name "*.ts" | sort

# メモ関連APIの特定
find server/api -name "*memo*" -o -name "*read*" | sort
```

#### **1.2 競合APIの分離**
```yaml
修正前:
  ❌ POST /api/v1/memos → 既読処理APIに誤到達

修正後:
  ✅ POST /api/v1/admin/memos/create.post.ts → メモ作成
  ✅ POST /api/v1/admin/memos/[id]/mark-read.post.ts → 既読処理
```

#### **1.3 ファイル構造の再編成**
```
server/api/v1/admin/memos/
├── list.get.ts              # メモ一覧取得
├── create.post.ts           # メモ作成 ← 新規作成
├── [id].get.ts              # メモ詳細取得
├── [id].put.ts              # メモ更新
├── [id].delete.ts           # メモ削除
└── [id]/
    ├── mark-read.post.ts    # 既読マーク ← 分離
    └── mark-unread.post.ts  # 未読マーク
```

### **Phase 2: 構造改善（1週間以内）**

#### **2.1 RESTful原則準拠**
```yaml
# 標準CRUD操作
GET    /api/v1/admin/memos/list.get.ts
POST   /api/v1/admin/memos/create.post.ts
GET    /api/v1/admin/memos/[id].get.ts
PUT    /api/v1/admin/memos/[id].put.ts
DELETE /api/v1/admin/memos/[id].delete.ts

# 特殊操作（サブリソース）
POST   /api/v1/admin/memos/[id]/mark-read.post.ts
POST   /api/v1/admin/memos/[id]/mark-unread.post.ts
GET    /api/v1/admin/memos/search.get.ts
```

#### **2.2 フロントエンド側の対応**
```typescript
// 修正前
const response = await $fetch('/api/v1/memos', {
  method: 'POST',
  body: memoData
})

// 修正後
const response = await $fetch('/api/v1/admin/memos/create', {
  method: 'POST',
  body: memoData
})
```

### **Phase 3: 品質向上（2週間以内）**

#### **3.1 自動チェックスクリプト導入**
```javascript
// scripts/check-routing-conflicts.js
const fs = require('fs')
const path = require('path')

function checkRoutingConflicts() {
  const apiDir = path.join(process.cwd(), 'server/api')
  const routes = []
  
  // APIファイルを再帰的に検索
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir)
    
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        scanDirectory(filePath)
      } else if (file.endsWith('.ts')) {
        const route = convertFilePathToRoute(filePath)
        routes.push({ file: filePath, route })
      }
    })
  }
  
  scanDirectory(apiDir)
  
  // 競合チェック
  const conflicts = findConflicts(routes)
  
  if (conflicts.length > 0) {
    console.error('🚨 ルーティング競合が検出されました:')
    conflicts.forEach(conflict => {
      console.error(`  - ${conflict.route}`)
      console.error(`    ファイル1: ${conflict.file1}`)
      console.error(`    ファイル2: ${conflict.file2}`)
    })
    process.exit(1)
  }
  
  console.log('✅ ルーティング競合は検出されませんでした')
}

function convertFilePathToRoute(filePath) {
  // ファイルパスをAPIルートに変換
  return filePath
    .replace(path.join(process.cwd(), 'server/api'), '')
    .replace(/\[([^\]]+)\]/g, ':$1')
    .replace(/\.(get|post|put|delete)\.ts$/, '')
    .replace(/\/index$/, '')
}

function findConflicts(routes) {
  const conflicts = []
  const routeMap = new Map()
  
  routes.forEach(({ file, route }) => {
    const method = extractMethod(file)
    const key = `${method} ${route}`
    
    if (routeMap.has(key)) {
      conflicts.push({
        route: key,
        file1: routeMap.get(key),
        file2: file
      })
    } else {
      routeMap.set(key, file)
    }
  })
  
  return conflicts
}

function extractMethod(filePath) {
  const match = filePath.match(/\.(get|post|put|delete)\.ts$/)
  return match ? match[1].toUpperCase() : 'GET'
}

checkRoutingConflicts()
```

#### **3.2 package.json スクリプト追加**
```json
{
  "scripts": {
    "check:routing": "node scripts/check-routing-conflicts.js",
    "check:deep-routes": "node scripts/check-deep-routes.js",
    "check:index-files": "node scripts/check-index-files.js",
    "check:all": "npm run check:routing && npm run check:deep-routes && npm run check:index-files",
    "fix:routing": "node scripts/auto-fix-routing.js"
  }
}
```

---

## 🔧 **具体的な実装手順**

### **Step 1: 現状調査と問題特定**

```bash
# 1. 現在のAPIファイル構造確認
find server/api -type f -name "*.ts" | head -20

# 2. メモ関連APIの特定
grep -r "memo" server/api/ || echo "メモ関連APIが見つかりません"

# 3. POST /api/v1/memos の実際の処理を確認
find server/api -path "*/v1/memos*" -name "*.post.ts"
```

### **Step 2: 競合APIファイルの作成**

```typescript
// server/api/v1/admin/memos/create.post.ts
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

    // リクエストボディ取得
    const body = await readBody(event)
    const { title, content, roomId, priority = 'normal' } = body

    // バリデーション
    if (!title || !content) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Title and content are required'
      })
    }

    // メモ作成
    const memo = await prisma.memo.create({
      data: {
        title,
        content,
        roomId,
        priority,
        authorId: authUser.id,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    return {
      success: true,
      data: memo
    }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.message || 'Failed to create memo'
    })
  }
})
```

```typescript
// server/api/v1/admin/memos/[id]/mark-read.post.ts
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

    // パラメータ取得
    const memoId = getRouterParam(event, 'id')
    if (!memoId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Memo ID is required'
      })
    }

    // メモ既読マーク
    const memo = await prisma.memo.update({
      where: { id: parseInt(memoId) },
      data: {
        isRead: true,
        readAt: new Date(),
        readById: authUser.id
      }
    })

    return {
      success: true,
      data: memo
    }
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.message || 'Failed to mark memo as read'
    })
  }
})
```

### **Step 3: フロントエンド側の修正**

```typescript
// composables/useMemosApi.ts
export const useMemosApi = () => {
  const createMemo = async (memoData: CreateMemoRequest) => {
    return await $fetch('/api/v1/admin/memos/create', {
      method: 'POST',
      body: memoData
    })
  }

  const markMemoAsRead = async (memoId: number) => {
    return await $fetch(`/api/v1/admin/memos/${memoId}/mark-read`, {
      method: 'POST'
    })
  }

  const getMemos = async (params?: GetMemosParams) => {
    return await $fetch('/api/v1/admin/memos/list', {
      method: 'GET',
      query: params
    })
  }

  return {
    createMemo,
    markMemoAsRead,
    getMemos
  }
}
```

### **Step 4: 動作確認とテスト**

```bash
# 1. 開発サーバー起動
npm run dev

# 2. APIエンドポイント確認
curl -X POST http://localhost:3100/api/v1/admin/memos/create \
  -H "Content-Type: application/json" \
  -d '{"title":"テストメモ","content":"テスト内容"}'

# 3. 既読処理確認
curl -X POST http://localhost:3100/api/v1/admin/memos/1/mark-read

# 4. ルーティング競合チェック
npm run check:routing
```

---

## 🛡️ **品質保証措置**

### **1. 自動テスト追加**

```typescript
// tests/api/memos.test.ts
import { describe, it, expect } from 'vitest'
import { $fetch } from 'ofetch'

describe('Memos API', () => {
  it('should create memo successfully', async () => {
    const response = await $fetch('/api/v1/admin/memos/create', {
      method: 'POST',
      body: {
        title: 'Test Memo',
        content: 'Test Content',
        roomId: '101'
      }
    })

    expect(response.success).toBe(true)
    expect(response.data.title).toBe('Test Memo')
  })

  it('should mark memo as read', async () => {
    // メモ作成
    const createResponse = await $fetch('/api/v1/admin/memos/create', {
      method: 'POST',
      body: {
        title: 'Test Memo',
        content: 'Test Content'
      }
    })

    // 既読マーク
    const readResponse = await $fetch(`/api/v1/admin/memos/${createResponse.data.id}/mark-read`, {
      method: 'POST'
    })

    expect(readResponse.success).toBe(true)
    expect(readResponse.data.isRead).toBe(true)
  })
})
```

### **2. Git Pre-commit Hook**

```bash
#!/bin/sh
# .husky/pre-commit

echo "🔍 ルーティング競合チェック実行中..."
npm run check:routing

if [ $? -ne 0 ]; then
  echo "❌ ルーティング競合が検出されました"
  echo "📋 修正後に再度コミットしてください"
  exit 1
fi

echo "✅ ルーティングチェック完了"
```

---

## 📊 **進捗管理**

### **チェックリスト**

#### **Phase 1: 緊急修正**
- [ ] 現在のAPIファイル構造調査
- [ ] メモ作成API分離 (`create.post.ts`)
- [ ] 既読処理API分離 (`mark-read.post.ts`)
- [ ] フロントエンド側パス修正
- [ ] 動作確認テスト

#### **Phase 2: 構造改善**
- [ ] RESTful原則準拠への変更
- [ ] 統一エラーハンドリング実装
- [ ] API仕様書更新
- [ ] 自動チェックスクリプト導入

#### **Phase 3: 品質向上**
- [ ] 自動テスト追加
- [ ] Git Pre-commit Hook設定
- [ ] ドキュメント更新
- [ ] チーム共有・レビュー

### **リスク管理**

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 既存機能の破綻 | 高 | 段階的移行・後方互換性維持 |
| フロントエンド側の修正漏れ | 中 | 全APIエンドポイント一覧作成 |
| 新たなルーティング競合 | 中 | 自動チェックスクリプト導入 |
| 開発効率の低下 | 低 | 明確なガイドライン提供 |

---

## 🎯 **成功指標**

### **技術指標**
- [ ] POST /api/v1/memos ルーティング競合解決
- [ ] 全APIエンドポイントのRESTful原則準拠
- [ ] ルーティング競合自動検出100%
- [ ] API応答時間 < 200ms維持

### **品質指標**
- [ ] ルーティング関連バグ0件
- [ ] API仕様書とコードの100%一致
- [ ] 自動テストカバレッジ > 80%
- [ ] 開発者満足度向上

---

**📝 最終更新**: 2025年9月17日  
**👥 実行責任者**: 開発チーム  
**🔄 レビュー頻度**: 週次進捗確認  
**📋 完了予定**: Phase 1 (即時), Phase 2 (1週間), Phase 3 (2週間)
