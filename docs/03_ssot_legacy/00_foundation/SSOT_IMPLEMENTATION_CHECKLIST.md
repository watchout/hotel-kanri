# SSOT: 実装チェックリスト（エラー防止ガイド）

**作成日**: 2025-10-14  
**最終更新**: 2025-10-14  
**バージョン**: 1.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（全実装時必須）

---

## 📋 このSSOTの目的

**SSOTに書かれていない「実装の落とし穴」を体系化し、実装前・実装後の必須チェック項目を定義する。**

### 発生しがちな問題

1. **Expressルーティング順序ミス** ← 今回のエラー
2. **SessionUserプロパティの不統一** ← 今回のエラー
3. **既存コードとの命名規則不一致**
4. **認証チェックの実装漏れ**
5. **エラーハンドリングの不統一**

---

## 🚨 実装前チェックリスト（必須）

### Phase 1: 既存コード調査（15分）

```bash
# ✅ 1. 同じディレクトリの既存APIを3つ以上確認
ls -la src/routes/api/v1/admin/*.ts
cat src/routes/api/v1/admin/tenants.get.ts  # 参考実装1
cat src/routes/api/v1/admin/roles.get.ts    # 参考実装2
cat src/routes/api/v1/admin/staff.get.ts    # 参考実装3

# ✅ 2. SessionUserの使われ方を確認
grep -r "user\\.user_id" src/routes/api/v1/admin/*.ts
grep -r "user\\.id" src/routes/api/v1/admin/*.ts
# → どちらが多いか確認し、多数派に従う

# ✅ 3. 認証チェックの標準パターンを確認
grep -r "checkPermission" src/routes/api/v1/admin/*.ts | head -5
# → 第1引数が何か（user.id or user.user_id）を確認

# ✅ 4. エラーハンドリングパターンを確認
grep -r "createError" src/routes/api/v1/admin/*.ts | head -5
# → statusCode, message の形式を確認

# ✅ 5. ルーティング登録順序を確認
cat src/routes/api/v1/admin/index.ts
# → 具体的パスが先、パラメータ付きパスが後かを確認
```

**✅ チェック完了の証明**:
```markdown
## 既存コード調査結果

- SessionUser: `user.user_id` を使用（5ファイル中5ファイル）
- 認証チェック: `checkPermission(user.user_id, ...)` が標準
- エラー形式: `createError({ statusCode: 400, message: '...' })`
- ルーティング順序: 具体的パス優先（例: /roles/permissions → /roles/:id）
```

---

### Phase 2: 実装パターン確認（5分）

#### ✅ Expressルーティング順序ルール

**絶対ルール**: 具体的なパスを先に、パラメータ付きパスを後に登録

```typescript
// ❌ 間違い（今回のエラー）
router.get('/roles/:id', ...) // 先に登録
router.put('/roles/permissions', ...) // 後に登録
// → /roles/permissions が /roles/:id にマッチしてしまう

// ✅ 正しい
router.put('/roles/permissions', ...) // 先に登録（具体的）
router.get('/roles/:id', ...) // 後に登録（パラメータ）
```

**確認コマンド**:
```bash
# index.ts のルーティング順序を確認
cat src/routes/api/v1/admin/index.ts | grep "router\\."
```

---

#### ✅ SessionUser プロパティ統一ルール

**hotel-common の SessionUser 標準仕様**:

```typescript
interface SessionUser {
  user_id: string    // ← 標準（userIdではない！）
  tenant_id: string  // ← 標準（tenantIdではない！）
  name: string
  email: string
  role_name: string
}
```

**確認方法**:
```bash
# 既存実装を確認
grep -r "user\\.user_id" src/ | wc -l  # user.user_id の使用回数
grep -r "user\\.id" src/ | wc -l       # user.id の使用回数
# → 多数派を採用
```

**実装例**:
```typescript
// ✅ 正しい
const userId = user.user_id
const tenantId = user.tenant_id

// ❌ 間違い
const userId = user.id  // ← user.id は存在しない
```

---

#### ✅ 認証チェック標準パターン

```typescript
// ✅ 正しいパターン
import { checkPermission } from '../../../services/PermissionService'

// セッションチェック
if (!session || !session.user) {
  throw createError({
    statusCode: 401,
    message: '認証が必要です'
  })
}

const user = session.user

// 権限チェック
const hasPermission = await checkPermission(
  user.user_id,  // ← user.user_id を使用
  'target.resource',
  'action'
)

if (!hasPermission) {
  throw createError({
    statusCode: 403,
    message: '権限がありません'
  })
}
```

---

#### ✅ エラーハンドリング統一ルール

```typescript
// ✅ 正しいパターン
import { createError } from 'h3'

// バリデーションエラー
if (!roleId) {
  throw createError({
    statusCode: 400,
    message: 'role_idは必須です'
  })
}

// 認証エラー
throw createError({
  statusCode: 401,
  message: '認証が必要です'
})

// 権限エラー
throw createError({
  statusCode: 403,
  message: '権限がありません'
})

// Not Found
throw createError({
  statusCode: 404,
  message: 'リソースが見つかりません'
})

// サーバーエラー
throw createError({
  statusCode: 500,
  message: '内部サーバーエラー'
})
```

---

## 🧪 実装後チェックリスト（必須）

### Phase 3: 単体テスト（10分）

```bash
# ✅ 1. hotel-common起動確認
curl http://localhost:3400/health
# → {"status":"ok"} が返ることを確認

# ✅ 2. 認証なしでアクセス（401エラー確認）
curl -X PUT http://localhost:3400/api/v1/admin/roles/permissions \
  -H "Content-Type: application/json" \
  -d '{"role_id":"xxx","permission_ids":["yyy"]}'
# → 401エラーが返ることを確認

# ✅ 3. 認証ありでアクセス（正常動作確認）
# まずログインしてセッションIDを取得
curl -X POST http://localhost:3400/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}' \
  -c cookies.txt

# セッション付きでAPIアクセス
curl -X PUT http://localhost:3400/api/v1/admin/roles/permissions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"role_id":"valid-role-id","permission_ids":["perm1","perm2"]}'
# → 200 OK が返ることを確認

# ✅ 4. ログ確認
tail -f logs/hotel-common.log
# → エラーログがないことを確認
```

---

### Phase 4: 統合テスト（hotel-saas経由）

```bash
# ✅ 1. hotel-saas から API を呼び出し
# ブラウザで http://localhost:3100/admin/roles にアクセス
# → 権限保存ボタンをクリック

# ✅ 2. ネットワークタブで確認
# F12 → Network タブ
# → /api/v1/admin/roles/permissions へのPUTリクエストを確認
# → Status: 200 を確認

# ✅ 3. hotel-common のログ確認
tail -f /path/to/hotel-common/logs/app.log
# → "PUT /api/v1/admin/roles/permissions 200" を確認
```

---

## 📊 エラーパターン別対処法

### パターン1: ルーティングミスマッチ

**症状**: `Cannot PUT /api/v1/admin/roles/permissions` (404エラー)

**原因**: 
- ルーティング順序が間違っている
- パスの登録漏れ

**確認方法**:
```bash
# ルーティング定義を確認
cat src/routes/api/v1/admin/index.ts | grep "/roles"
```

**修正方法**:
```typescript
// index.ts でルーティング順序を修正
router.put('/roles/permissions', rolesPermissionsPutHandler) // 具体的パス
router.get('/roles/:id', rolesGetByIdHandler) // パラメータパス
```

---

### パターン2: SessionUser プロパティミス

**症状**: `user.id is undefined` または `user.user_id is undefined`

**原因**: 
- SessionUser のプロパティ名を間違えている
- 既存コードと不一致

**確認方法**:
```bash
# 既存の使用パターンを確認
grep -r "user\\." src/routes/api/v1/admin/*.ts | grep -E "(user_id|id)"
```

**修正方法**:
```typescript
// ❌ 間違い
const userId = user.id

// ✅ 正しい
const userId = user.user_id
```

---

### パターン3: 権限チェック不一致

**症状**: 権限チェックが通らない（403エラー）

**原因**:
- `checkPermission` の引数が間違っている
- 権限名（permission）が間違っている

**確認方法**:
```bash
# 既存の checkPermission 使用例を確認
grep -r "checkPermission" src/routes/api/v1/admin/*.ts | head -3
```

**修正方法**:
```typescript
// ✅ 正しい引数
const hasPermission = await checkPermission(
  user.user_id,     // ← user_id を使用
  'roles',          // ← リソース名
  'update'          // ← アクション名
)
```

---

## 🤖 AI実装者への指示テンプレート

### 新規API実装時の必須手順

```markdown
## 実装手順

### Step 0: 実装前チェック（必須）
1. 既存コード調査を実施
   - 同じディレクトリの既存API 3つ以上を確認
   - SessionUser の使われ方を確認
   - 認証チェックパターンを確認
   - ルーティング順序を確認

2. 調査結果を報告
   ```
   ## 既存コード調査結果
   - SessionUser: user.user_id を使用
   - 認証: checkPermission(user.user_id, ...) が標準
   - ルーティング: 具体的パス優先
   ```

### Step 1: 実装
（SSOTに従って実装）

### Step 2: 実装後チェック（必須）
1. 単体テスト（curl）を実施
2. ログ確認
3. 統合テスト（ブラウザ）

### Step 3: 完了報告
すべてのチェック項目をクリアしたことを報告
```

---

## 📖 参照フロー

```
実装開始
  ↓
🔍 Phase 1: 既存コード調査（このSSOT参照）
  ↓
📝 Phase 2: 実装（機能別SSOT参照）
  ↓
🧪 Phase 3: 単体テスト（このSSOT参照）
  ↓
🔗 Phase 4: 統合テスト（このSSOT参照）
  ↓
完了
```

---

## ✅ チェックリスト要約

### 実装前（必須）
- [ ] 既存API 3つ以上を確認
- [ ] SessionUser のプロパティ名を確認（user.user_id vs user.id）
- [ ] 認証チェックパターンを確認
- [ ] ルーティング順序ルールを確認
- [ ] エラーハンドリングパターンを確認

### 実装中（必須）
- [ ] 具体的パスを先に登録（パラメータパスより前）
- [ ] SessionUser は `user.user_id` を使用
- [ ] 認証チェックは `checkPermission(user.user_id, ...)` を使用
- [ ] エラーは `createError({ statusCode, message })` を使用

### 実装後（必須）
- [ ] curl で単体テスト実施（401, 403, 200 を確認）
- [ ] ログにエラーがないことを確認
- [ ] ブラウザで統合テスト実施
- [ ] Network タブで 200 OK を確認

---

## 🎯 期待される効果

### Before（現状）
```
実装 → エラー → 調査 → 修正 → 再エラー → 再調査 → 再修正
所要時間: 2時間
```

### After（このSSOT適用後）
```
既存コード調査（15分） → 実装（30分） → テスト（10分） → 完了
所要時間: 55分（約3倍速）
```

---

## 📚 関連SSOT

- [SSOT_SAAS_PERMISSION_SYSTEM.md](../01_admin_features/SSOT_SAAS_PERMISSION_SYSTEM.md) - 権限システム仕様
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](./SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 認証システム仕様
- [error_detection_protocol.md](../../.cursor/prompts/error_detection_protocol.md) - エラー検知プロトコル

---

**作成者**: Iza（統合管理者）  
**レビュー**: Luna（実エラー経験者）  
**最終更新**: 2025-10-14  
**バージョン**: 1.0.0


