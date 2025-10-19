# メニュー管理システム実装記録（管理画面専用）

**実装日**: 2025-10-03
**最終更新**: 2025-10-03（APIパス統一対応）
**SSOT参照**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md` (v2.2.0)
**実装システム**: hotel-saas
**ステータス**: ✅ Phase 1完了（管理画面専用APIとして実装）

---

## 📋 実装概要

SSOT_SAAS_MENU_MANAGEMENT.md (v2.2.0)に基づき、hotel-saas側の**管理画面専用**プロキシAPIとcomposableを実装しました。

### ⚠️ 重要: スコープの明確化

- **✅ 対象**: 管理画面からのメニューCRUD操作（スタッフのみ）
- **❌ 対象外**: 客室端末からのメニュー閲覧（別SSOTで対応予定）

### アーキテクチャ

```
[管理画面（スタッフ）] 🔐 Session認証必須
  ↓ メニューCRUD操作
[hotel-saas API (Proxy)] ← 今回実装
  ↓ POST/PUT/DELETE /api/v1/admin/menu/*
[hotel-common API (Core)] ← 実装済み（前提）
  ↓ Prisma ORM
[PostgreSQL (統一DB)]
  ├─ menu_items テーブル
  └─ menu_categories テーブル
```

---

## ✅ 実装完了項目

### 1. プロキシAPI実装（管理画面専用）

#### メニュー関連 (`/server/api/v1/admin/menu/`)

| エンドポイント | ファイル | 機能 | 認証 | ステータス |
|-------------|---------|------|------|----------|
| `GET /api/v1/admin/menu/items` | `items.get.ts` | メニュー一覧取得 | 🔐必須 | ✅ |
| `POST /api/v1/admin/menu/items` | `items.post.ts` | メニュー作成 | 🔐必須 | ✅ |
| `GET /api/v1/admin/menu/items/:id` | `items/[id].get.ts` | メニュー単体取得 | 🔐必須 | ✅ |
| `PUT /api/v1/admin/menu/items/:id` | `items/[id].put.ts` | メニュー更新 | 🔐必須 | ✅ |
| `DELETE /api/v1/admin/menu/items/:id` | `items/[id].delete.ts` | メニュー削除 | 🔐必須 | ✅ |

#### カテゴリ関連 (`/server/api/v1/admin/menu/`)

| エンドポイント | ファイル | 機能 | 認証 | ステータス |
|-------------|---------|------|------|----------|
| `GET /api/v1/admin/menu/categories` | `categories.get.ts` | カテゴリ一覧取得 | 🔐必須 | ✅ |
| `POST /api/v1/admin/menu/categories` | `categories.post.ts` | カテゴリ作成 | 🔐必須 | ✅ |
| `PUT /api/v1/admin/menu/categories/:id` | `categories/[id].put.ts` | カテゴリ更新 | 🔐必須 | ✅ |
| `DELETE /api/v1/admin/menu/categories/:id` | `categories/[id].delete.ts` | カテゴリ削除 | 🔐必須 | ✅ |

### 2. Composable実装

| ファイル | 機能 | ステータス |
|---------|------|----------|
| `/composables/useMenu.ts` | メニュー・カテゴリCRUD操作 | ✅ |

#### useMenu提供メソッド

- `getMenuItems(params?)` - メニュー一覧取得
- `getMenuItem(id)` - メニュー単体取得
- `getCategories(params?)` - カテゴリ一覧取得
- `createMenuItem(data)` - メニュー作成
- `updateMenuItem(id, data)` - メニュー更新
- `deleteMenuItem(id)` - メニュー削除
- `createCategory(data)` - カテゴリ作成
- `updateCategory(id, data)` - カテゴリ更新
- `deleteCategory(id)` - カテゴリ削除

---

## 🔧 実装の詳細

### 認証パターン（管理画面専用）

すべてのプロキシAPIは以下の認証パターンを実装：

```typescript
// 1. 認証チェック（必須）
const authUser = event.context.user
if (!authUser) {
  throw createError({
    statusCode: 401,
    statusMessage: 'ログインが必要です'
  })
}

// 2. テナントID取得
const headersIn = getRequestHeaders(event)
const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId

if (!tenantId) {
  throw createError({
    statusCode: 400,
    statusMessage: 'X-Tenant-ID header is required'
  })
}

// 3. hotel-commonへのヘッダー設定
const upstreamHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Tenant-ID': tenantId,
  'Authorization': `Bearer ${authUser.token || authUser.sessionId}`
}

// 4. hotel-common API呼び出し（/api/v1/admin/menu/*）
const response = await menuApi.getItems({ headers: upstreamHeaders })
```

**重要**: 全API操作で認証必須（ミドルウェアでチェック済み + APIハンドラーで再確認）

### レスポンス正規化

hotel-commonからのレスポンスが多様な形式の可能性があるため、正規化を実施：

```typescript
const menuItems = response?.data?.menuItems ||
                  response?.menuItems ||
                  response?.items ||
                  response?.data ||
                  response || []
```

### エラーハンドリング

統一されたエラーハンドリングパターン：

```typescript
try {
  // API呼び出し
} catch (error: any) {
  console.error('エラー詳細:', error)
  throw createError({
    statusCode: error?.response?.status || error?.statusCode || 500,
    statusMessage: error?.response?._data?.error?.message || error?.message || 'デフォルトメッセージ'
  })
}
```

---

## 🚫 既存disabledファイルについて

`/server/api/v1/admin/menu/`配下に以下のdisabledファイルが存在：

- `index.post.ts.disabled` - 直接Prisma使用のメニュー作成
- `[id].get.ts.disabled` - 直接Prisma使用のメニュー取得
- `[id].put.ts.disabled` - 直接Prisma使用のメニュー更新

### 有効化しない理由

1. **アーキテクチャ違反**: 直接DB接続はマルチテナント統合アーキテクチャに反する
2. **スキーマ不一致**: 古いスキーマ（MenuItem, Category）を想定
3. **保守性**: プロキシパターンの方がhotel-commonの変更に強い

これらのファイルは**削除せず、参考として残す**が、有効化はしません。

### 有効なファイル

- `list.get.ts` - プロキシパターンで実装済み、そのまま使用可能

---

## 🔐 セキュリティ実装

### テナント分離

- すべてのAPIで`X-Tenant-ID`ヘッダーを必須化
- hotel-commonに転送して、hotel-common側でテナント分離を実施

### 認証（管理画面専用）

**全操作（GET/POST/PUT/DELETE）**:
- 🔐 Session認証必須（Redis + HttpOnly Cookie）
- 🔐 `event.context.user`の存在確認必須
- 🔐 `Authorization: Bearer {sessionId}`ヘッダー必須
- 🔐 スタッフのみアクセス可能

**パブリックAPIではない**:
- ❌ ゲストからのアクセス不可
- ❌ 認証なしでのアクセス不可
- ❌ デバイス認証不可（管理画面用API）

---

## 📊 パフォーマンス考慮事項

### キャッシュ戦略（将来実装）

hotel-saas側でRedisキャッシュを追加する場合：

- メニュー一覧: 5分キャッシュ
- カテゴリ一覧: 10分キャッシュ
- メニュー作成・更新・削除時にキャッシュクリア

### ページネーション

`GET /api/v1/menu/items`はクエリパラメータでページネーション対応：

```typescript
{
  limit: 100,  // デフォルト
  offset: 0    // デフォルト
}
```

---

## 🔗 hotel-common側の前提条件

以下のAPIがhotel-common側で実装済みであることを前提：

### 必須API

1. **メニューCRUD**
   - ✅ `GET /api/v1/menu/items` - 一覧取得
   - ✅ `POST /api/v1/menu/items` - 作成
   - ⚠️ `GET /api/v1/menu/items/:id` - 単体取得（要確認）
   - ✅ `PUT /api/v1/menu/items/:id` - 更新
   - ✅ `DELETE /api/v1/menu/items/:id` - 削除

2. **カテゴリCRUD**
   - ✅ `GET /api/v1/menu/categories` - 一覧取得
   - ⚠️ `POST /api/v1/menu/categories` - 作成（要確認）
   - ⚠️ `PUT /api/v1/menu/categories/:id` - 更新（要確認）
   - ⚠️ `DELETE /api/v1/menu/categories/:id` - 削除（要確認）

### データベーステーブル

- `menu_items` - SSOT DDLに準拠
- `menu_categories` - SSOT DDLに準拠

---

## 🧪 テスト方法

### 1. メニュー一覧取得

```bash
curl -X GET "http://localhost:3100/api/v1/menu/items?limit=10" \
  -H "X-Tenant-ID: tenant-xxx" \
  -H "Cookie: your-session-cookie"
```

### 2. メニュー作成

```bash
curl -X POST "http://localhost:3100/api/v1/menu/items" \
  -H "X-Tenant-ID: tenant-xxx" \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "nameJa": "ハンバーグステーキ",
    "nameEn": "Hamburger Steak",
    "price": 1200,
    "categoryId": 10
  }'
```

### 3. Composable使用例

```vue
<script setup>
const { loading, error, getMenuItems, createMenuItem } = useMenu()

// メニュー一覧取得
const menuItems = ref([])
onMounted(async () => {
  menuItems.value = await getMenuItems({ isAvailable: true })
})

// メニュー作成
const handleCreate = async () => {
  const newItem = await createMenuItem({
    nameJa: '新メニュー',
    price: 1500
  })
  console.log('作成成功:', newItem)
}
</script>
```

---

## 📝 未実装機能（Phase 2以降）

以下の機能はSSOTドキュメントに記載されているが、Phase 1では未実装：

- [ ] 管理画面UI（メニュー一覧・作成・編集フォーム）
- [ ] カテゴリ管理画面UI
- [ ] 在庫管理機能
- [ ] セットメニュー機能
- [ ] 裏メニュー機能
- [ ] 期間限定メニュー機能
- [ ] メニューランキング機能
- [ ] 画像・動画アセット管理
- [ ] 一括インポート・エクスポート

---

## 🐛 既知の問題・注意事項

### 1. hotel-common APIレスポンス形式の多様性

hotel-commonからのレスポンス構造が統一されていない可能性があるため、複数のフィールド名を試行する正規化を実装しています。

### 2. 環境変数の設定

`HOTEL_COMMON_API_URL`が未設定の場合、デフォルトで`http://localhost:3200`を使用します。

本番環境では`.env`に以下を設定してください：

```bash
HOTEL_COMMON_API_URL=https://common.hotel-saas.example.com
```

### 3. 認証トークンのフィールド名

hotel-saas内で`authUser.token`と`authUser.sessionId`が混在している可能性があります。現在は`authUser.token`を優先使用しています。

---

## 📚 関連ドキュメント

- **SSOT**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_core_features/SSOT_SAAS_MENU_MANAGEMENT.md`
- **hotel-common API仕様**: `hotel-common/docs/api/menu.md`（要確認）
- **統合認証仕様**: `docs/migration/COMMON_API_USAGE_GUIDE.md`

---

## 🎯 次のステップ

### 即座に実施すべきこと

1. **hotel-common側APIの動作確認**
   - 上記の必須APIがすべて実装されているか確認
   - レスポンス形式がSSOT仕様に準拠しているか確認

2. **結合テスト**
   - hotel-saas → hotel-common の通信確認
   - 認証ヘッダーの正常な伝播確認
   - テナント分離の動作確認

3. **管理画面UI実装**（Phase 2）
   - メニュー一覧画面
   - メニュー作成・編集フォーム
   - カテゴリ管理画面

---

**作成日**: 2025年10月3日
**最終更新**: 2025年10月3日（APIパス統一・管理画面専用化対応）
**作成者**: AI Assistant (☀️ Sun)
**SSOT準拠**: v2.2.0
**レビュー**: 未実施
**承認**: 未実施

