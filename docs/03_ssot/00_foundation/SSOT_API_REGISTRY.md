# SSOT: API Registry（APIエンドポイント一元管理）

**バージョン**: 1.0.0  
**最終更新**: 2025-12-19  
**ステータス**: ✅ 確定  
**管理者**: Luna (hotel-kanri統合管理)

---

## 📋 概要

このドキュメントは、hotel-saas-rebuildおよびhotel-common-rebuildの**全APIエンドポイントを一元管理**するための唯一の真実（SSOT）です。

### 目的

1. **実装前の必須参照**: プロンプト作成時（`>> prmt`）に必ず参照
2. **整合性担保**: hotel-saas（プロキシ）とhotel-common（バックエンド）の対応を明確化
3. **ルーター登録漏れ防止**: 新規API追加時の登録チェックリスト

---

## 🚨 必須ルール

### API実装時の強制チェック

```markdown
✅ 新規API実装前に必ず確認:
1. [ ] このレジストリにエンドポイントが定義されているか？
2. [ ] hotel-common-rebuildのルートファイルが存在するか？
3. [ ] hotel-common-rebuild/src/server/index.ts にルーター登録されているか？
4. [ ] hotel-saas-rebuildにプロキシファイルが存在するか？

❌ レジストリに未定義のAPIは実装禁止
❌ ルーター登録なしのルートファイルは無効
```

---

## 📊 Admin API（管理画面用・Session認証必須）

### 認証（/api/v1/admin/auth）

| Method | Path | hotel-common | hotel-saas | 説明 |
|--------|------|--------------|------------|------|
| POST | `/api/v1/admin/auth/login` | auth.routes.ts | login.post.ts | ログイン |
| POST | `/api/v1/admin/auth/logout` | auth.routes.ts | logout.post.ts | ログアウト |
| GET | `/api/v1/admin/auth/session` | auth.routes.ts | session.get.ts | セッション確認 |
| GET | `/api/v1/admin/auth/verify` | auth.routes.ts | - | トークン検証（内部用） |

**ルーター登録**: `app.use('/api/v1/admin/auth', authRouter)`

---

### テナント管理（/api/v1/admin/tenants）

| Method | Path | hotel-common | hotel-saas | 説明 |
|--------|------|--------------|------------|------|
| GET | `/api/v1/admin/tenants` | tenants.routes.ts | tenants.get.ts | 一覧取得 |
| POST | `/api/v1/admin/tenants` | tenants.routes.ts | tenants.post.ts | 新規作成 |
| GET | `/api/v1/admin/tenants/:id` | tenants.routes.ts | tenants/[id].get.ts | 詳細取得 |
| PATCH | `/api/v1/admin/tenants/:id` | tenants.routes.ts | tenants/[id].patch.ts | 更新 |
| DELETE | `/api/v1/admin/tenants/:id` | tenants.routes.ts | tenants/[id].delete.ts | 削除 |

**ルーター登録**: `app.use('/api/v1/admin/tenants', tenantsRouter)`

---

### テナント切替（/api/v1/admin/switch-tenant）

| Method | Path | hotel-common | hotel-saas | 説明 |
|--------|------|--------------|------------|------|
| POST | `/api/v1/admin/switch-tenant` | switch-tenant.routes.ts | switch-tenant.post.ts | テナント切替 |

**ルーター登録**: `app.use('/api/v1/admin/switch-tenant', switchTenantRouter)`

---

### 客室グレード管理（/api/v1/admin/room-grades）

| Method | Path | hotel-common | hotel-saas | 説明 |
|--------|------|--------------|------------|------|
| GET | `/api/v1/admin/room-grades` | room-grades.routes.ts | room-grades.get.ts | 一覧取得 |
| POST | `/api/v1/admin/room-grades` | room-grades.routes.ts | room-grades.post.ts | 新規作成 |
| GET | `/api/v1/admin/room-grades/:id` | room-grades.routes.ts | room-grades/[id].get.ts | 詳細取得 |
| PATCH | `/api/v1/admin/room-grades/:id` | room-grades.routes.ts | room-grades/[id].patch.ts | 更新 |
| DELETE | `/api/v1/admin/room-grades/:id` | room-grades.routes.ts | room-grades/[id].delete.ts | 削除 |

**ルーター登録**: `app.use('/api/v1/admin/room-grades', roomGradesRouter)`

---

### メニュー管理（/api/v1/admin/menu）

| Method | Path | hotel-common | hotel-saas | 説明 |
|--------|------|--------------|------------|------|
| GET | `/api/v1/admin/menu/items` | menu.routes.ts | menu/items/index.get.ts | 一覧取得 |
| GET | `/api/v1/admin/menu/items/:id` | menu.routes.ts | menu/items/[id].get.ts | 詳細取得 |
| PUT | `/api/v1/admin/menu/items/:id` | menu.routes.ts | menu/items/[id].put.ts | 更新 |

**ルーター登録**: `app.use('/api/v1/admin/menu', menuRouter)`

---

## 📊 Guest API（客室端末用・デバイス認証）

### メニュー閲覧（/api/v1/guest/menus）

| Method | Path | hotel-common | hotel-saas | 説明 |
|--------|------|--------------|------------|------|
| GET | `/api/v1/guest/menus` | guest-menus.routes.ts | guest/menus.get.ts | メニュー一覧 |
| GET | `/api/v1/guest/menus/:id` | guest-menus.routes.ts | guest/menus/[id].get.ts | メニュー詳細 |

**ルーター登録**: `app.use('/api/v1/guest/menus', guestMenusRouter)`

---

### カテゴリ閲覧（/api/v1/guest/categories）

| Method | Path | hotel-common | hotel-saas | 説明 |
|--------|------|--------------|------------|------|
| GET | `/api/v1/guest/categories` | guest-categories.routes.ts | guest/categories.get.ts | カテゴリ一覧 |

**ルーター登録**: `app.use('/api/v1/guest/categories', guestCategoriesRouter)`

---

### 注文管理（/api/v1/guest/orders）

| Method | Path | hotel-common | hotel-saas | 説明 |
|--------|------|--------------|------------|------|
| GET | `/api/v1/guest/orders/active` | guest/orders.routes.ts | guest/orders/active.get.ts | アクティブ注文取得 |
| GET | `/api/v1/guest/orders/history` | guest/orders.routes.ts | - | 注文履歴 |
| POST | `/api/v1/guest/orders` | guest/orders.routes.ts | - | 注文作成 |

**ルーター登録**: `app.use('/api/v1/guest/orders', guestOrdersRouter)`

---

### デバイス認証（/api/v1/guest/device）

| Method | Path | hotel-common | hotel-saas | 説明 |
|--------|------|--------------|------------|------|
| GET | `/api/v1/guest/device/status` | device-status.routes.ts | - | デバイス認証確認 |

**ルーター登録**: `app.use('/api/v1/guest/device/status', deviceStatusRouter)`

---

## 📊 System API

### ヘルスチェック

| Method | Path | hotel-common | hotel-saas | 説明 |
|--------|------|--------------|------------|------|
| GET | `/health` | index.ts | - | hotel-common ヘルスチェック |
| GET | `/api/v1/health` | - | health.get.ts | hotel-saas ヘルスチェック |

---

## 🔧 ルーター登録チェックリスト

### hotel-common-rebuild/src/server/index.ts

```typescript
// ✅ 認証ルート（認証ミドルウェア適用前）
app.use('/api/v1/admin/auth', authRouter)

// ✅ Guest API（認証ミドルウェア外）
app.use('/api/v1/guest/menus', guestMenusRouter)
app.use('/api/v1/guest/orders', guestOrdersRouter)
app.use('/api/v1/guest/categories', guestCategoriesRouter)
app.use('/api/v1/guest/device/status', deviceStatusRouter)

// 🔐 認証ミドルウェア（ここから下は認証必須）
app.use(authMiddleware)

// ✅ Admin API（認証必須）
app.use('/api/v1/admin/switch-tenant', switchTenantRouter)
app.use('/api/v1/admin/tenants', tenantsRouter)
app.use('/api/v1/admin/room-grades', roomGradesRouter)
app.use('/api/v1/admin/menu', menuRouter)
```

---

## 📋 新規API追加時の手順

### Step 1: このレジストリに追記

```markdown
| Method | Path | hotel-common | hotel-saas | 説明 |
|--------|------|--------------|------------|------|
| GET | `/api/v1/admin/xxx` | xxx.routes.ts | xxx.get.ts | 説明 |
```

### Step 2: hotel-common-rebuild

1. `src/routes/xxx.routes.ts` を作成
2. `src/server/index.ts` に `import xxxRouter from '../routes/xxx.routes'` 追加
3. `app.use('/api/v1/admin/xxx', xxxRouter)` を適切な位置に追加

### Step 3: hotel-saas-rebuild

1. `server/api/v1/admin/xxx.get.ts` を作成
2. `callHotelCommonAPI` を使用してプロキシ実装

### Step 4: 動作確認

```bash
# hotel-common 直接
curl http://localhost:3401/api/v1/admin/xxx

# hotel-saas プロキシ経由
curl http://localhost:3101/api/v1/admin/xxx
```

---

## 🚨 よくある問題と対処法

### 問題1: 404 Not Found

**原因**: ルーター未登録

**確認コマンド**:
```bash
grep "app.use('/api/v1/admin/xxx" /Users/kaneko/hotel-common-rebuild/src/server/index.ts
```

**対処**: `src/server/index.ts` にルーター登録を追加

### 問題2: パス不一致

**原因**: hotel-saas と hotel-common でパスが異なる

**確認**: このレジストリで正しいパスを確認

### 問題3: 認証エラー

**原因**: 認証ミドルウェアの位置が不適切

**対処**: Guest APIは `app.use(authMiddleware)` より前に登録

---

## 📝 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-12-19 | 1.0.0 | 初版作成 |

---

## 関連ドキュメント

- `API_ROUTING_GUIDELINES.md` - ルーティング設計ガイドライン
- `SSOT_SAAS_MULTITENANT.md` - マルチテナント設計
- `SSOT_SAAS_ADMIN_AUTHENTICATION.md` - Session認証設計

