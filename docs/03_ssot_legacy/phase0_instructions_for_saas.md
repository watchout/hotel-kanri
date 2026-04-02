# 🔧 Phase 0 修正指示書 - hotel-saas

**対象システム**: hotel-saas  
**担当AI**: Sun  
**期間**: 3日  
**優先度**: 🔴 Critical

---

## 📋 修正概要

### 修正内容
1. **JWT認証の残骸削除**（53ファイル）
2. **環境分岐コード削除**（一部）
3. **テナントIDハードコード削除**（13ファイル）

### 修正方針
- Session認証（Cookie自動送信）に統一
- 環境分岐を削除（環境変数で接続先のみ変更）
- テナントIDフォールバック禁止

---

## 🚨 修正1: JWT認証の残骸削除（53ファイル）

### 修正パターン

#### ❌ 削除するコード
```typescript
const response = await $fetch(`${hotelCommonApiUrl}/api/v1/xxx`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${user.token}`,  // ← 削除
    'Content-Type': 'application/json',
    'X-Tenant-ID': user.tenant_id || user.tenantId  // ← X-Tenant-IDも削除
  },
  body: data
})
```

#### ✅ 修正後のコード
```typescript
const response = await $fetch(`${hotelCommonApiUrl}/api/v1/xxx`, {
  method: 'POST',
  credentials: 'include',  // ← Cookie自動送信
  headers: {
    'Content-Type': 'application/json'
  },
  body: data
})
```

### 修正対象ファイル一覧

#### グループ1: 注文管理API（3ファイル）

**優先度**: 🔴 最高

```
/Users/kaneko/hotel-saas/server/api/v1/order/create.post.ts
/Users/kaneko/hotel-saas/server/api/v1/order/place.post.ts
/Users/kaneko/hotel-saas/server/api/v1/order/menu.get.ts
```

**修正内容**:
```typescript
// 各ファイルで以下を修正

// ❌ 削除
headers: {
  'Authorization': `Bearer ${user.token}`,
  'Content-Type': 'application/json',
  'X-Tenant-ID': user.tenant_id || user.tenantId
}

// ✅ 追加
credentials: 'include',
headers: {
  'Content-Type': 'application/json'
}
```

---

#### グループ2: メニュー管理API（9ファイル）

**優先度**: 🔴 最高

```
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items/[id].get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items/[id].put.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items/[id].delete.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories/[id].put.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories/[id].delete.ts
```

**修正内容**: グループ1と同じパターン

---

#### グループ3: デバイス管理API（8ファイル）

**優先度**: 🟡 高

```
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/list.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/create.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/[id].get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/[id].put.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/access-logs/index.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/stats/summary.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/stats/access.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/devices/stats/ranking.get.ts
```

**修正内容**: グループ1と同じパターン

---

#### グループ4: フロント業務API（7ファイル）

**優先度**: 🔴 最高

```
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/rooms.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/room-orders.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/accounting.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/billing.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/billing-settings.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/checkin.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/front-desk/checkout.post.ts
```

**修正内容**: グループ1と同じパターン

---

#### グループ5: 客室グレード管理API（5ファイル）

**優先度**: 🟡 高

```
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id].put.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id].delete.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/create.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/reorder.patch.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id]/media/index.get.ts
```

**修正内容**: グループ1と同じパターン

---

#### グループ6: メモ管理API（6ファイル）

**優先度**: 🟢 中

```
/Users/kaneko/hotel-saas/server/api/v1/memos.get.ts
/Users/kaneko/hotel-saas/server/api/v1/memos.post.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].get.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].patch.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].delete.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id]/comments.post.ts
```

**修正内容**: グループ1と同じパターン

---

#### グループ7: その他API（15ファイル）

**優先度**: 🟡 高

```
/Users/kaneko/hotel-saas/server/api/v1/admin/categories/list.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/rooms/[roomNumber]/logs.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/phone-order/menu.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/phone-order/create.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/operation-logs.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/tenant/current.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top/content.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top/publish.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/media/reorder.post.ts
/Users/kaneko/hotel-saas/server/api/v1/menu/items.get.ts
/Users/kaneko/hotel-saas/server/api/v1/menu/categories.get.ts
/Users/kaneko/hotel-saas/server/api/v1/media-proxy.get.ts
/Users/kaneko/hotel-saas/server/api/v1/media/proxy/[...path].get.ts
/Users/kaneko/hotel-saas/server/api/v1/devices/client-ip.get.ts
/Users/kaneko/hotel-saas/server/api/v1/devices/check-status.post.ts
```

**修正内容**: グループ1と同じパターン

---

#### グループ8: ユーティリティファイル（2ファイル）

**優先度**: 🔴 最高

```
/Users/kaneko/hotel-saas/server/utils/api-client.ts
/Users/kaneko/hotel-saas/server/utils/api-context.ts
```

**修正内容**:
- JWT認証関連のコードを完全削除
- Session認証（Cookie）に統一
- `user.token`への参照を全て削除

---

## 🚨 修正2: テナントIDハードコード削除（13ファイル）

### 修正パターン

#### ❌ 削除するコード
```typescript
const tenantId = user.tenant_id || 'default'
const tenantId = session.tenantId ?? 'default'
```

#### ✅ 修正後のコード
```typescript
const tenantId = user.tenant_id
if (!tenantId) {
  throw createError({
    statusCode: 400,
    message: 'テナントIDが取得できません'
  })
}
```

### 修正対象ファイル一覧

```
/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top/content.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/pages/top/publish.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/reorder.patch.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/create.post.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/[id].delete.ts
/Users/kaneko/hotel-saas/server/api/v1/memos.post.ts
/Users/kaneko/hotel-saas/server/api/v1/memos.get.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].patch.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].get.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id].delete.ts
/Users/kaneko/hotel-saas/server/api/v1/memos/[id]/comments.post.ts
/Users/kaneko/hotel-saas/server/api/v1/media/proxy/[...path].get.ts
/Users/kaneko/hotel-saas/server/api/v1/pages/top.ts
```

---

## 📋 修正手順

### Day 1: グループ1-4の修正（最優先）

**作業時間**: 8時間

#### 午前（4時間）
1. **グループ1: 注文管理API**（3ファイル・1時間）
2. **グループ2: メニュー管理API**（9ファイル・3時間）

#### 午後（4時間）
3. **グループ3: デバイス管理API**（8ファイル・2時間）
4. **グループ4: フロント業務API**（7ファイル・2時間）

### Day 2: グループ5-8の修正

**作業時間**: 8時間

#### 午前（4時間）
5. **グループ5: 客室グレード管理API**（5ファイル・1.5時間）
6. **グループ6: メモ管理API**（6ファイル・1.5時間）
7. **グループ7: その他API**（15ファイル・1時間）

#### 午後（4時間）
8. **グループ8: ユーティリティファイル**（2ファイル・2時間）
9. **テナントIDハードコード削除**（13ファイル・2時間）

### Day 3: 動作確認・テスト

**作業時間**: 8時間

#### 午前（4時間）
1. **基本動作確認**
   - [ ] ログイン → Cookie設定確認
   - [ ] 注文作成 → hotel-common API呼び出し確認
   - [ ] メニュー取得 → hotel-common API呼び出し確認

2. **各機能の動作確認**
   - [ ] デバイス管理
   - [ ] フロント業務
   - [ ] 客室グレード管理
   - [ ] メモ管理

#### 午後（4時間）
3. **エラーケースの確認**
   - [ ] テナントID未設定時のエラー
   - [ ] Cookie未設定時のエラー
   - [ ] hotel-common接続失敗時のエラー

4. **最終確認**
   - [ ] 全53ファイルの修正完了確認
   - [ ] JWT認証コードの完全削除確認
   - [ ] テナントIDハードコードの完全削除確認

---

## ✅ 修正完了チェックリスト

### JWT認証の残骸削除
- [ ] グループ1: 注文管理API（3ファイル）
- [ ] グループ2: メニュー管理API（9ファイル）
- [ ] グループ3: デバイス管理API（8ファイル）
- [ ] グループ4: フロント業務API（7ファイル）
- [ ] グループ5: 客室グレード管理API（5ファイル）
- [ ] グループ6: メモ管理API（6ファイル）
- [ ] グループ7: その他API（15ファイル）
- [ ] グループ8: ユーティリティファイル（2ファイル）

### テナントIDハードコード削除
- [ ] 13ファイルの修正完了

### 動作確認
- [ ] ログイン → Cookie設定確認
- [ ] 注文作成 → hotel-common API呼び出し確認
- [ ] メニュー取得 → hotel-common API呼び出し確認
- [ ] デバイス管理動作確認
- [ ] フロント業務動作確認
- [ ] エラーハンドリング確認

---

## 🚨 注意事項

### 必ず守ること

1. **credentials: 'include'を必ず追加**
   - Cookie自動送信のために必須

2. **Authorization ヘッダーを完全削除**
   - JWT認証の残骸を完全に削除

3. **X-Tenant-ID ヘッダーも削除**
   - テナントIDはCookieから自動取得

4. **テナントIDフォールバック禁止**
   - `|| 'default'`や`?? 'default'`は絶対に使用しない

5. **エラーハンドリング必須**
   - テナントID未設定時は明確なエラーを返す

### 修正後の確認

各ファイル修正後、以下を確認：

```typescript
// ✅ 正しい実装の例
const response = await $fetch(`${hotelCommonApiUrl}/api/v1/xxx`, {
  method: 'POST',
  credentials: 'include',  // ← Cookie自動送信
  headers: {
    'Content-Type': 'application/json'
  },
  body: data
})

// ✅ テナントID取得の正しい例
const tenantId = user.tenant_id
if (!tenantId) {
  throw createError({
    statusCode: 400,
    message: 'テナントIDが取得できません'
  })
}
```

---

## 📊 進捗報告

### 日次報告

**報告先**: Iza（統合管理者）

**報告内容**:
- 修正完了ファイル数
- 動作確認結果
- 発見した問題
- 翌日の予定

### 完了報告

**報告内容**:
- 全53ファイルの修正完了
- 動作確認結果
- Phase 0完了確認

---

**作成日**: 2025年10月7日  
**担当AI**: Sun（hotel-saas担当）  
**承認者**: Iza（統合管理者）

