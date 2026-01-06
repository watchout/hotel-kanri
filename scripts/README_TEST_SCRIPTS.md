# 標準テストスクリプト

## 📋 概要

hotel-saas-rebuild の実装後に必ず実行する標準テストスクリプトです。
**管理画面用**と**ゲスト画面用**の2つがあります。

### スクリプト一覧

| スクリプト | 対象 | 認証方式 | 用途 |
|-----------|------|---------|------|
| **test-standard-admin.sh** | 管理画面 | Session認証 | `/api/v1/admin/*`, `/admin/*` |
| **test-standard-guest.sh** | ゲスト画面 | デバイス認証 | `/api/v1/guest/*`, `/menu` |

### 目的
- ✅ 実装後の自動検証（認証 → API → UI）
- ✅ 実装ミス（401/404/空配列/5xx）を**commit前**に検知
- ✅ Evidence（テスト結果）の自動生成

### 必須ルール
**実装完了後、commit/PR前に必ず実行すること**

---

## 🚀 使い方

### 前提条件（共通）

1. **hotel-common-rebuild 起動**
   ```bash
   cd /Users/kaneko/hotel-common-rebuild
   npm run dev
   # → http://localhost:3401
   ```

2. **hotel-saas-rebuild 起動**
   ```bash
   cd /Users/kaneko/hotel-saas-rebuild
   npm run dev
   # → http://localhost:3101
   ```

3. **初期データ投入（初回のみ）**
   ```bash
   cd /Users/kaneko/hotel-common-rebuild
   npm run seed
   ```

### 実行（管理画面用）

```bash
cd /Users/kaneko/hotel-kanri/scripts
./test-standard-admin.sh
```

**対象**: 管理画面の実装（`/api/v1/admin/*`, `/admin/*`）

### 実行（ゲスト画面用）

```bash
cd /Users/kaneko/hotel-kanri/scripts
./test-standard-guest.sh
```

**対象**: ゲスト画面の実装（`/api/v1/guest/*`, `/menu`）

**注意**: デバイス登録が必要（後述）

### 成功時の出力例（管理画面用）

```
=== Phase 0: 前提条件確認 ===
✅ Cookie クリーンアップ完了
✅ hotel-common-rebuild 起動確認 OK
✅ hotel-saas-rebuild 起動確認 OK

=== Phase 1: ログイン ===
{
  "success": true,
  "data": { ... }
}
✅ ログイン成功（Cookie発行確認済み）

=== Phase 2: テナント切替 ===
{
  "success": true,
  "data": { ... }
}
✅ テナント切替成功

=== Phase 3-1: Categories API ===
{
  "success": true,
  "data": {
    "categories": [ ... ]
  }
}
✅ Categories API 成功（10 件）

=== Phase 3-2: Menus API ===
{
  "success": true,
  "data": {
    "items": [ ... ]
  }
}
✅ Menus API 成功（15 件）

=== Phase 4-1: /menu ページ SSR ===
✅ /menu ページ SSR 成功

=== Phase 4-2: /menu/category/{id} ページ SSR ===
✅ /menu/category/xxx ページ SSR 成功

=== Phase 4-3: /menu/item/{id} ページ SSR ===
✅ /menu/item/xxx ページ SSR 成功

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALL TESTS PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Categories: 10 件
Menus:      15 件
Tenant:     tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7
Cookie:     /tmp/saas_session.txt
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ commit/PR可能です
```

**この出力が表示されたら → commit/PR可能**

---

### 成功時の出力例（ゲスト画面用）

```
=== Phase 0: 前提条件確認 ===
✅ hotel-common-rebuild 起動確認 OK
✅ hotel-saas-rebuild 起動確認 OK

=== Phase 1: デバイス認証（hotel-common 直接） ===
{
  "found": true,
  "isActive": true,
  "roomId": "101",
  "tenantId": "tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7",
  ...
}
✅ デバイス認証成功（Room ID: 101, Tenant: tenant-003bc06e...）

=== Phase 2-1: Categories API（hotel-saas経由） ===
{
  "success": true,
  "data": {
    "categories": [ ... ]
  }
}
✅ Categories API 成功（10 件）

=== Phase 2-2: Menus API（hotel-common直接） ===
{
  "success": true,
  "data": {
    "items": [ ... ]
  }
}
✅ Menus API 成功（15 件）

=== Phase 3: UI検証（重要な注意事項） ===
⚠️  重要: ゲストUI（/menu）は device-guard.ts ミドルウェアが必要です
...
✅ API検証完了（UI検証はブラウザで実施）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ GUEST API TESTS PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
デバイス認証: ✅ 成功
Room ID:      101
Tenant ID:    tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7
Categories:   10 件
Menus:        15 件
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ゲストAPI動作確認完了
```

**この出力が表示されたら → API動作確認完了**

**UI検証**: ブラウザで `http://localhost:3101/menu` にアクセス

---

## ❌ 失敗時の対応

### エラーパターン別の対応方法

#### 1. hotel-common-rebuild が起動していない

**エラー**:
```
❌ ERROR: hotel-common-rebuild が起動していません (http://localhost:3401)
起動方法:
  cd /Users/kaneko/hotel-common-rebuild
  npm run dev
```

**対応**:
```bash
cd /Users/kaneko/hotel-common-rebuild
npm run dev
# 別ターミナルで再実行
```

---

#### 2. hotel-saas-rebuild が起動していない

**エラー**:
```
❌ ERROR: hotel-saas-rebuild が起動していません (http://localhost:3101)
起動方法:
  cd /Users/kaneko/hotel-saas-rebuild
  npm run dev
```

**対応**:
```bash
cd /Users/kaneko/hotel-saas-rebuild
npm run dev
# 別ターミナルで再実行
```

---

#### 3. ログイン失敗

**エラー**:
```
❌ ERROR: ログイン失敗
レスポンス: {"success":false,"error":"..."}
確認事項:
  1. テストユーザーが存在するか？
  2. パスワードが正しいか？
  3. hotel-common-rebuild のログを確認
```

**対応**:
1. テストユーザーが存在するか確認（seed実行済みか？）
2. hotel-common-rebuild のログを確認
3. Prisma Studio で確認
   ```bash
   cd /Users/kaneko/hotel-common-rebuild
   npx prisma studio
   # → Admin テーブルで owner@test.omotenasuai.com が存在するか確認
   ```

---

#### 4. テナント切替失敗

**エラー**:
```
❌ ERROR: テナント切替失敗
レスポンス: {"success":false,"error":"..."}
確認事項:
  1. テナントID が正しいか？ (現在: tenant-003bc06e...)
  2. ユーザーがこのテナントにアクセス権を持っているか？
  3. hotel-common-rebuild のログを確認
```

**対応**:
1. `staff_tenant_memberships` テーブルを確認
   ```bash
   cd /Users/kaneko/hotel-common-rebuild
   npx prisma studio
   # → staff_tenant_memberships で owner@test... のレコードを確認
   ```
2. tenant_id が正しいか確認

---

#### 5. Categories が0件

**エラー**:
```
❌ ERROR: Categories が0件です
確認事項:
  1. seedを実行したか？
     cd /Users/kaneko/hotel-common-rebuild
     npm run seed
  2. tenantIdフィルタが厳しすぎないか？
```

**対応**:
```bash
cd /Users/kaneko/hotel-common-rebuild
npm run seed
# 再実行
```

---

#### 6. /menu ページにエラーメッセージ

**エラー**:
```
❌ ERROR: /menu ページにエラーメッセージが表示されています
確認事項:
  1. API呼び出しが失敗していないか？
  2. useApi の実装を確認
```

**対応**:
1. hotel-saas-rebuild のログを確認
2. `useApi` の実装を確認（Cookie転送が正しいか？）
3. ブラウザで `/menu` にアクセスして詳細確認

---

## 📊 Evidence収集（PR作成時）

### Evidence保存コマンド

```bash
cd /Users/kaneko/hotel-kanri/scripts
./test-standard.sh 2>&1 | tee evidence-test.txt
echo "終了コード: ${PIPESTATUS[0]}" >> evidence-test.txt
```

### PR本文に貼り付ける内容

```markdown
## テスト・証跡

### 標準テストスクリプト実行結果

\`\`\`bash
$ /Users/kaneko/hotel-kanri/scripts/test-standard.sh

=== Phase 0: 前提条件確認 ===
✅ Cookie クリーンアップ完了
✅ hotel-common-rebuild 起動確認 OK
✅ hotel-saas-rebuild 起動確認 OK

=== Phase 1: ログイン ===
✅ ログイン成功（Cookie発行確認済み）

=== Phase 2: テナント切替 ===
✅ テナント切替成功

=== Phase 3-1: Categories API ===
✅ Categories API 成功（10 件）

=== Phase 3-2: Menus API ===
✅ Menus API 成功（15 件）

=== Phase 4-1: /menu ページ SSR ===
✅ /menu ページ SSR 成功

=== Phase 4-2: /menu/category/{id} ページ SSR ===
✅ /menu/category/xxx ページ SSR 成功

=== Phase 4-3: /menu/item/{id} ページ SSR ===
✅ /menu/item/xxx ページ SSR 成功

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ALL TESTS PASSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Categories: 10 件
Menus:      15 件
\`\`\`

- ✅ 全フロー成功
- ✅ commit/PR可能
\`\`\`
```

---

## 🎯 よくある質問

### Q1: スクリプトが途中で止まる

**A**: エラーメッセージを確認してください。`set -euo pipefail` により、1つでもエラーがあると即座に停止します。

### Q2: Cookieが残っていて失敗する

**A**: スクリプト冒頭で自動的に `/tmp/saas_session.txt` を削除します。手動で削除する必要はありません。

### Q3: 別のテナントでテストしたい

**A**: スクリプト冒頭の `TENANT` 変数を変更してください。

```bash
TENANT="tenant-xxx-yyy-zzz"
```

### Q4: 別のテストユーザーを使いたい（管理画面用）

**A**: `test-standard-admin.sh` 冒頭の `TEST_EMAIL` と `TEST_PASSWORD` を変更してください。

```bash
TEST_EMAIL="another@test.omotenasuai.com"
TEST_PASSWORD="password123"
```

### Q5: ゲスト用テストでデバイス認証失敗する

**A**: テストデバイスを `device_rooms` テーブルに登録してください。

#### 方法1: Prisma Studio で手動登録

```bash
cd /Users/kaneko/hotel-common-rebuild
npx prisma studio
```

`device_rooms` テーブルに以下を登録:
- `mac_address`: `AA:BB:CC:DD:EE:FF`
- `ip_address`: `192.168.1.101`
- `tenant_id`: `tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7`
- `room_id`: `101`
- `device_id`: `test-device-001`
- `is_active`: `true`

#### 方法2: 管理画面で登録

```
1. http://localhost:3101/admin/login にアクセス
2. ログイン: owner@test.omotenasuai.com / owner123
3. http://localhost:3101/admin/devices にアクセス
4. 「デバイス登録」ボタンをクリック
5. 上記の情報を入力して保存
```

---

## 🔧 スクリプトの仕組み

### Phase 0: 前提条件確認
- Cookie クリーンアップ（古いCookie削除）
- hotel-common-rebuild 起動確認（`/health`）
- hotel-saas-rebuild 起動確認（`/api/v1/health`）

### Phase 1: ログイン
- `POST /api/v1/admin/auth/login`
- Cookie発行確認

### Phase 2: テナント切替
- `POST /api/v1/admin/switch-tenant`
- セッション更新確認

### Phase 3: API検証
- Categories API（`GET /api/v1/guest/categories`）
- Menus API（`GET /api/v1/guest/menus`）
- 件数チェック（1件以上）

### Phase 4: UI検証
- `/menu` ページ SSR（エラーメッセージ検出）
- `/menu/category/{id}` ページ SSR
- `/menu/item/{id}` ページ SSR

---

## 📝 更新履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-11-18 | 2.0.0 | Phase構造化、エラーメッセージ詳細化、前提条件自動確認 |
| 2025-11-18 | 1.0.0 | 初版作成 |

---

**最終更新**: 2025年11月18日  
**バージョン**: 2.0.0  
**メンテナンス**: Gatekeeper

