# APIルーティング規則 - クイックリファレンス

このドキュメントはSSOT作成時・API設計時の必須参照資料です。

---

## 📋 必須ドキュメント

**正式版**: 
- `/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md`
- `/Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_ROUTING_DESIGN.md`

---

## 🚨 必須遵守ルール（Nuxt 3 / Nitro制約）

### ❌ **禁止パターン**

#### 1. 深いネスト（2階層以上の動的パス）

```yaml
❌ /api/v1/admin/orders/[id]/items/[itemId]
❌ /api/v1/admin/rooms/[roomNumber]/memos/[memoId]
❌ /api/v1/admin/users/[userId]/settings/[settingId]

理由: Nuxt 3のVue Routerが干渉し、404エラーの原因となる
```

**⚠️ 重要**: hotel-saas（Nuxt 3）の制約です。hotel-common（Express）では2階層までは許容されますが、統一性のため避けることを推奨します。

#### 2. index.*ファイル

```yaml
❌ server/api/v1/admin/rooms/index.get.ts
❌ server/api/v1/admin/orders/index.post.ts
❌ server/api/v1/admin/categories/index.get.ts

理由: Nitroの既知のバグでルート認識に失敗する
```

**⚠️ 重要**: これはhotel-saas（Nuxt 3 / Nitro）特有の問題です。hotel-commonでは問題ありませんが、統一性のため避けてください。

#### 3. ルーティング競合を起こすパス

```yaml
❌ POST /api/v1/memos と POST /api/v1/memos/[id]/mark-read
   → Nitroは定義順にマッチングするため競合する

理由: ファイルベースルーティングでパターンが曖昧になる
```

---

## ✅ **推奨パターン**

### 1. フラット構造への変更

```yaml
✅ /api/v1/admin/order-items/[itemId]
✅ /api/v1/admin/room-memos/[memoId]
✅ /api/v1/admin/user-settings/[settingId]
```

### 2. クエリパラメータ活用

```yaml
✅ /api/v1/admin/order-items?orderId=123
✅ /api/v1/admin/room-memos?roomNumber=101
✅ /api/v1/admin/user-settings?userId=456
```

### 3. 明示的なファイル名使用

```yaml
# 動詞 + HTTPメソッド
✅ server/api/v1/admin/rooms/list.get.ts       # 一覧取得
✅ server/api/v1/admin/orders/create.post.ts   # 新規作成
✅ server/api/v1/admin/users/search.get.ts     # 検索

# 動的パラメータ（1階層のみ）
✅ server/api/v1/admin/rooms/[id].get.ts       # 詳細取得
✅ server/api/v1/admin/orders/[id].put.ts      # 更新
✅ server/api/v1/admin/users/[id].delete.ts    # 削除
```

---

## 📁 **標準CRUD操作**

### hotel-saas（Nuxt 3 / Nitro）

```yaml
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

# サブリソース操作（必ずフラット化）
POST   /api/v1/admin/{resource}-{sub}/[id].post.ts  # 例: /order-items/[id]
```

### hotel-common（Express）

```typescript
// 基本CRUD（相対パス）
router.get('/', ...)           // GET /api/v1/rooms
router.post('/', ...)          // POST /api/v1/rooms
router.get('/:id', ...)        // GET /api/v1/rooms/:id
router.put('/:id', ...)        // PUT /api/v1/rooms/:id
router.delete('/:id', ...)     // DELETE /api/v1/rooms/:id

// サブリソース（2階層まで許容、ただし統一性のため避ける）
router.get('/:parentId/children', ...)           # 一覧
router.post('/:parentId/children', ...)          # 作成
router.get('/:parentId/children/:childId', ...)  # 詳細（非推奨）
```

---

## 🔧 **実装テンプレート**

### 動的パラメータの取得

```typescript
// ✅ 推奨: getRouterParam使用
import { getRouterParam } from 'h3'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'ID is required' 
    })
  }
  
  // 処理...
})
```

### クエリパラメータの取得

```typescript
// ✅ 推奨: getQuery使用
import { getQuery } from 'h3'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const orderId = query.orderId as string
  const roomNumber = query.roomNumber as string
  
  // 処理...
})
```

---

## 🔍 **チェックリスト**

### SSOT作成時

- [ ] APIパスが含まれるか？
- [ ] 対象システムはhotel-saas（Nuxt 3）か、hotel-common（Express）か？
- [ ] hotel-saasの場合、動的パラメータは1階層のみか？
- [ ] hotel-saasの場合、index.*ファイルを使用していないか？
- [ ] フラット構造になっているか？
- [ ] クエリパラメータの使用を検討したか？
- [ ] RESTful原則に従っているか？（ただし複雑な処理はRPC的でもOK）
- [ ] ルーティング競合を起こさないパス設計か？
- [ ] 何をキーにしているかパスに含まれているか？（例: by-number, by-id）

### API設計時

- [ ] 深いネスト（2階層以上）を避けているか？
- [ ] サブリソースはフラット化したか？
- [ ] ファイル名は明示的か？（list.get.ts, create.post.ts等）
- [ ] 標準CRUD操作に従っているか？
- [ ] エラーハンドリングは統一されているか？
- [ ] 認証チェックは実装されているか？（管理者APIの場合）
- [ ] hotel-commonの場合、相対パスで統一されているか？
- [ ] システム別ディレクトリ構造に従っているか？

---

## 🚨 **よくある間違い**

### ❌ 間違い1: 深いネスト

```yaml
❌ /api/v1/admin/orders/[id]/items/[itemId]
```

### ✅ 正しい

```yaml
✅ /api/v1/admin/order-items/[itemId]
または
✅ /api/v1/admin/order-items?orderId=123&itemId=456
```

### ❌ 間違い2: index.*ファイル

```yaml
❌ server/api/v1/admin/rooms/index.get.ts
```

### ✅ 正しい

```yaml
✅ server/api/v1/admin/rooms/list.get.ts
```

### ❌ 間違い3: 動的パラメータの多用

```yaml
❌ /api/v1/admin/tenants/[tenantId]/users/[userId]/orders/[orderId]
```

### ✅ 正しい

```yaml
✅ /api/v1/admin/orders/[orderId]?tenantId=xxx&userId=yyy
```

### ❌ 間違い4: キーの種類が不明瞭

```yaml
❌ /api/v1/admin/rooms/[value]  # valueは何？番号？ID？
```

### ✅ 正しい

```yaml
✅ /api/v1/admin/rooms/by-number/[roomNumber]
✅ /api/v1/admin/rooms/by-id/[id]
```

### ❌ 間違い5: ルーティング競合

```yaml
❌ POST /api/v1/memos と POST /api/v1/memos/create を両方定義
   → どちらに到達するか不明確
```

### ✅ 正しい

```yaml
✅ POST /api/v1/memos/create.post.ts のみ定義
または
✅ POST /api/v1/memos.post.ts（index.*以外）
```

---

## 🎯 **システム別の違い**

| 項目 | hotel-saas（Nuxt 3） | hotel-common（Express） |
|------|---------------------|----------------------|
| 動的パス階層 | 1階層のみ | 2階層まで可（統一のため1階層推奨） |
| index.*ファイル | ❌ 禁止 | ✅ 可（統一のため避ける） |
| パス指定 | ファイルベース | 相対パス（router.get('/:id')） |
| ディレクトリ構造 | server/api/v1/admin/ | src/routes/systems/ |

---

## 📞 質問がある場合

詳細版を参照:
- **hotel-saas**: `/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md`
- **hotel-common**: `/Users/kaneko/hotel-kanri/docs/01_systems/common/api/api-routing-guidelines.md`
- **統一設計**: `/Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_ROUTING_DESIGN.md`

---

**🔖 このドキュメントは SSOT 作成時・API設計時の必須参照資料です。**

