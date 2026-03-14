# Hotel-SaaS APIルーティングガイドライン

## 🚨 **必須遵守ルール（Nuxt 3 / Nitro対応）**

### **1. 動的パスの制限**

#### ❌ **禁止パターン**
```yaml
# 深いネスト（2階層以上の動的パス）
❌ /api/v1/admin/orders/[id]/items/[itemId]
❌ /api/v1/admin/rooms/[roomNumber]/memos/[memoId]
❌ /api/v1/admin/users/[userId]/settings/[settingId]

理由: Nuxt 3のVue Routerが干渉し、404エラーの原因となる
```

#### ✅ **推奨パターン**
```yaml
# フラット構造への変更
✅ /api/v1/admin/order-items/[itemId]
✅ /api/v1/admin/room-memos/[memoId]
✅ /api/v1/admin/user-settings/[settingId]

# クエリパラメータ活用
✅ /api/v1/admin/order-items?orderId=123
✅ /api/v1/admin/room-memos?roomNumber=101
✅ /api/v1/admin/user-settings?userId=456
```

### **2. index.*ファイルの禁止**

#### ❌ **禁止パターン**
```yaml
❌ server/api/v1/admin/rooms/index.get.ts
❌ server/api/v1/admin/orders/index.post.ts
❌ server/api/v1/admin/categories/index.get.ts

理由: Nitroの既知のバグでルート認識に失敗する
```

#### ✅ **推奨パターン**
```yaml
# 明示的なファイル名使用
✅ server/api/v1/admin/rooms/list.get.ts
✅ server/api/v1/admin/orders/create.post.ts
✅ server/api/v1/admin/categories/collection.get.ts

# または機能別命名
✅ server/api/v1/admin/rooms/search.get.ts
✅ server/api/v1/admin/orders/submit.post.ts
```

### **3. RESTful設計原則**

#### ✅ **標準パターン**
```yaml
# リソース操作の標準化
GET    /api/v1/admin/rooms/list.get.ts          # 一覧取得
POST   /api/v1/admin/rooms/create.post.ts       # 新規作成
GET    /api/v1/admin/rooms/[id].get.ts          # 詳細取得
PUT    /api/v1/admin/rooms/[id].put.ts          # 更新
DELETE /api/v1/admin/rooms/[id].delete.ts      # 削除

# サブリソースはフラット化
GET    /api/v1/admin/room-memos/list.get.ts     # メモ一覧
POST   /api/v1/admin/room-memos/create.post.ts  # メモ作成
PUT    /api/v1/admin/room-memos/[id]/status.put.ts # ステータス更新
```

### **4. 命名規則**

#### ✅ **ファイル命名ルール**
```yaml
# 動詞 + HTTP メソッド
list.get.ts      # 一覧取得
create.post.ts   # 新規作成
update.put.ts    # 更新
remove.delete.ts # 削除

# 機能別命名
search.get.ts    # 検索
validate.post.ts # バリデーション
export.get.ts    # エクスポート
import.post.ts   # インポート
```

## 🔧 **実装ガイドライン**

### **1. 動的パラメータの取得**

```typescript
// ✅ 推奨: getRouterParam使用
import { getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  // 処理...
})

// ✅ 推奨: クエリパラメータ使用
import { getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const roomNumber = query.roomNumber as string
  // 処理...
})
```

### **2. エラーハンドリング**

```typescript
// ✅ 必須: 適切なエラーレスポンス
import { createError } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    // 処理...
  } catch (error: any) {
    throw createError({
      statusCode: error?.statusCode || 500,
      statusMessage: error?.message || 'Internal Server Error'
    })
  }
})
```

### **3. 認証チェック**

```typescript
// ✅ 必須: 管理者API認証
import { verifyAuth } from '~/server/utils/auth-helpers'

export default defineEventHandler(async (event) => {
  const authUser = await verifyAuth(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  // 処理...
})
```

## 🚨 **違反チェック自動化**

### **1. 開発時チェックスクリプト**

```bash
# 深いネストチェック
npm run check:deep-routes

# index.*ファイルチェック
npm run check:index-files

# 全体ルール違反チェック
npm run check:routing-rules
```

### **2. Git Pre-commit Hook**

```yaml
# .husky/pre-commit に追加
npm run check:routing-rules
if [ $? -ne 0 ]; then
  echo "❌ APIルーティングルール違反が検出されました"
  exit 1
fi
```

## 📊 **現在の違反状況**

### **🔴 緊急修正必要**
- `server/api/v1/admin/room-grades/index.post.ts` → `create.post.ts`
- `server/api/v1/admin/room-memos/index.*` → `list.get.ts`, `create.post.ts`

### **🟡 中優先度修正**
- `server/api/v1/admin/orders/[id]/items/[itemId]` → `order-items/[itemId]`
- `server/api/v1/admin/rooms/index.get.ts` → `list.get.ts`

## 🎯 **今後の開発ルール**

### **1. 新規API作成時**
1. このガイドラインを必ず確認
2. 深いネスト・index.*ファイルを避ける
3. RESTful原則に従う
4. 作成後にルール違反チェックを実行

### **2. 既存API修正時**
1. 修正機会にルール準拠へ変更
2. フロントエンド側のパス更新も同時実行
3. 後方互換性を考慮した段階的移行

### **3. レビュー基準**
- ルール違反APIは承認しない
- 例外が必要な場合は事前相談・文書化必須
- 定期的なルール遵守状況監査

---

**📝 最終更新**: 2025年9月12日
**📋 適用対象**: hotel-saas全APIエンドポイント
**🔄 更新頻度**: 問題発生時・ルール変更時に随時更新
