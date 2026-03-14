# 【=== Phase 1 実装プロンプト - CRUDテンプレート作成 + 客室グレード動作確認 ===】

**実装AI向けの完全指示書**  
**対象**: hotel-common-rebuild / hotel-saas-rebuild  
**目的**: CRUDテンプレート作成 + 客室グレードでの動作確認  
**所要時間**: 2時間  
**最終更新**: 2025-11-04

---

## 🎯 【最重要】この指示書の目的

```
✅ やること:
1. CRUDテンプレートを新規作成（hotel-common用1ファイル + hotel-saas用5ファイル）
2. 客室グレードで動作確認（Create → List → Get → Update → Delete）
3. エラーゼロを達成
4. ユーザーに報告・承認取得

❌ やらないこと:
- 「ざっと読んで」実装開始（必ず1行ずつ実行）
- テンプレートをカスタマイズ（そのままコピー＆置換のみ）
- 動作確認をスキップ（全CRUDを実行必須）
- ユーザー承認なしで次に進む
```

---

## 📋 【必読ドキュメント】（★重要度）

| ドキュメント | 用途 | 重要度 |
|-------------|------|--------|
| `/Users/kaneko/hotel-kanri/docs/rebuild/TEMPLATE_SPEC.md` | テンプレート完全仕様 | ★★★ |
| `/Users/kaneko/hotel-kanri/docs/rebuild/OVERVIEW.md` | リビルド概要 | ★★ |
| `/Users/kaneko/hotel-kanri/docs/rebuild/ARCHITECTURE.md` | アーキテクチャ | ★ |

**重要**: TEMPLATE_SPEC.md の「Phase 1完全手順」セクションを**1行ずつ**実行してください。

---

## ⚠️ 【絶対禁止事項】

```
❌ 絶対禁止:
1. テンプレートコードを改変する
2. `:resource` や `RESOURCE` を削除・変更（置換時のみ許可）
3. 動作確認をスキップする
4. エラーがある状態で次に進む
5. ユーザーの承認なしで Phase 2 に進む
6. ハルシネーション（確認していないことを「確認済み」と言う）
7. プレースホルダーを使用する（実在するコードのみ）

✅ 正しい対応:
1. TEMPLATE_SPEC.md のコードをそのままコピー
2. 置換は sed コマンドを使用（機械的に実行）
3. CRUD全て実行して動作確認
4. エラーがあれば即座に報告・原因調査
5. 完了報告 → ユーザー承認 → 次に進む
6. 不明な点は必ず確認してから実行
7. 実在するファイル・関数のみ使用
```

---

## 📐 【実装フロー】（必ず順番通りに実行）

```
Step 1: 事前確認（依存ファイル確認）
  ├─ sessionAuthMiddleware 確認（hotel-common）
  ├─ callHotelCommonAPI 確認（hotel-saas）
  └─ Prisma Client生成

Step 2: テンプレートファイル新規作成
  ├─ /Users/kaneko/hotel-kanri/templates/ ディレクトリ作成
  ├─ hotel-common-crud.template.ts 作成（TEMPLATE_SPEC.md からコピー）
  └─ hotel-saas-*.template.ts 作成（5ファイル、TEMPLATE_SPEC.md からコピー）

Step 3: テストテナント作成
  └─ PostgreSQL に rebuild-test-tenant を INSERT

Step 4: 客室グレードで動作確認実装
  ├─ hotel-common: テンプレート → room-grades.routes.ts（置換）
  ├─ hotel-saas: テンプレート → room-grades/*.ts（5ファイル、置換）
  └─ app.ts に登録

Step 5: サーバー起動・動作確認
  ├─ hotel-common起動（PORT=3401）
  ├─ hotel-saas起動（PORT=3101）
  ├─ ログイン（Session Cookie取得）
  └─ CRUD実行（Create → List → Get → Update → Delete）

Step 6: Prisma Studioで確認
  └─ room_grades テーブルにデータ存在・tenant_id正しいことを確認

Step 7: チェックリスト確認・ユーザー報告
  ├─ 全項目チェック
  └─ Phase 1完了報告テンプレートで報告
```

---

## 🚀 【Step 1: 事前確認（依存ファイル確認）】

### 1-1. sessionAuthMiddleware 確認（hotel-common）

```bash
# ファイル存在確認
ls /Users/kaneko/hotel-common-rebuild/src/auth/session-auth.middleware.ts

# ✅ 存在する → OK、次に進む
# ❌ 存在しない → 既存からコピー:
mkdir -p /Users/kaneko/hotel-common-rebuild/src/auth
cp /Users/kaneko/hotel-common/src/auth/session-auth.middleware.ts \
   /Users/kaneko/hotel-common-rebuild/src/auth/
```

### 1-2. callHotelCommonAPI 確認（hotel-saas）

```bash
# ファイル存在確認
ls /Users/kaneko/hotel-saas-rebuild/server/utils/api-client.ts

# ✅ 存在する → OK、次に進む
# ❌ 存在しない → 既存からコピー:
mkdir -p /Users/kaneko/hotel-saas-rebuild/server/utils
cp /Users/kaneko/hotel-saas/server/utils/api-client.ts \
   /Users/kaneko/hotel-saas-rebuild/server/utils/
```

### 1-3. Prisma Client生成

```bash
cd /Users/kaneko/hotel-common-rebuild
npx prisma generate

# 期待結果: ✓ Generated Prisma Client
```

**重要**: この3つが揃っていないと、テンプレートが動作しません。

---

## 📝 【Step 2: テンプレートファイル新規作成】

### 2-1. ディレクトリ作成

```bash
cd /Users/kaneko/hotel-kanri
mkdir -p templates
```

### 2-2. hotel-common CRUDテンプレート作成

**ソース**: `/Users/kaneko/hotel-kanri/docs/rebuild/TEMPLATE_SPEC.md` の「hotel-common CRUD テンプレート」セクション（600行目付近）

**手順**:
1. TEMPLATE_SPEC.md を開く
2. 「### 完全なコード（Create + List + Get + Update + Delete）」以下のコード全体をコピー
3. `/Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts` に保存

**重要**: `:resource` はそのまま残す（置換しない）

**検証**:
```bash
# ファイル存在確認
ls /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts

# 内容確認（:resource が含まれているか）
grep ':resource' /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts

# 期待結果: prisma.:resource.create / prisma.:resource.findMany 等が表示される
```

### 2-3. hotel-saas プロキシテンプレート作成（5ファイル）

**ソース**: `/Users/kaneko/hotel-kanri/docs/rebuild/TEMPLATE_SPEC.md` の「hotel-saas プロキシ テンプレート」セクション（900行目付近）

**手順（5ファイル分）**:

#### 1) Create テンプレート
```bash
# TEMPLATE_SPEC.md の「完全なコード（Create）」をコピー
# /Users/kaneko/hotel-kanri/templates/hotel-saas-create.template.ts に保存
```

#### 2) List テンプレート
```bash
# TEMPLATE_SPEC.md の「完全なコード（Read - List）」をコピー
# /Users/kaneko/hotel-kanri/templates/hotel-saas-list.template.ts に保存
```

#### 3) Get by ID テンプレート
```bash
# TEMPLATE_SPEC.md の「完全なコード（Read - Get by ID）」をコピー
# /Users/kaneko/hotel-kanri/templates/hotel-saas-get.template.ts に保存
```

#### 4) Update テンプレート
```bash
# TEMPLATE_SPEC.md の「完全なコード（Update）」をコピー
# /Users/kaneko/hotel-kanri/templates/hotel-saas-update.template.ts に保存
```

#### 5) Delete テンプレート
```bash
# TEMPLATE_SPEC.md の「完全なコード（Delete）」をコピー
# /Users/kaneko/hotel-kanri/templates/hotel-saas-delete.template.ts に保存
```

**重要**: `RESOURCE` はそのまま残す（置換しない）

**検証**:
```bash
# 5ファイル全て存在確認
ls /Users/kaneko/hotel-kanri/templates/hotel-saas-*.template.ts

# 期待結果:
# hotel-saas-create.template.ts
# hotel-saas-list.template.ts
# hotel-saas-get.template.ts
# hotel-saas-update.template.ts
# hotel-saas-delete.template.ts

# 内容確認（RESOURCE が含まれているか）
grep 'RESOURCE' /Users/kaneko/hotel-kanri/templates/hotel-saas-create.template.ts

# 期待結果: '/api/v1/RESOURCE' 等が表示される
```

---

## 🗄️ 【Step 3: テストテナント作成】

### PostgreSQL にテストテナント INSERT

```bash
# PostgreSQL接続（パスワード: password）
psql -U admin -d hotel_db

# テナント作成
INSERT INTO tenants (id, name, subdomain, created_at, updated_at)
VALUES (
  'rebuild-test-tenant',
  'リビルドテスト施設',
  'rebuild-test',
  NOW(),
  NOW()
);

# 確認
SELECT * FROM tenants WHERE id = 'rebuild-test-tenant';

# 期待結果: 1行表示される

# 終了
\q
```

**重要**: このテナントIDを使用して、CRUD操作を行います。

---

## 🏗️ 【Step 4: 客室グレードで動作確認実装】

### 4-1. hotel-common 客室グレードAPI実装

#### 4-1-1. テンプレートをコピー

```bash
cd /Users/kaneko/hotel-common-rebuild

# テンプレートをコピー
cp /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts \
   src/routes/systems/common/room-grades.routes.ts
```

#### 4-1-2. 置換作業

```bash
# 1. :resource を roomGrade に置換（Prismaモデル名）
sed -i '' 's/:resource/roomGrade/g' src/routes/systems/common/room-grades.routes.ts

# 2. APIパスを room-grades に置換
sed -i '' "s|'/api/v1/:resource'|'/api/v1/room-grades'|g" src/routes/systems/common/room-grades.routes.ts

# 検証
grep 'prisma.roomGrade' src/routes/systems/common/room-grades.routes.ts | head -1
# 期待結果: prisma.roomGrade.create 等が表示される

grep '/api/v1/room-grades' src/routes/systems/common/room-grades.routes.ts | head -1
# 期待結果: router.post('/api/v1/room-grades', ... 等が表示される
```

#### 4-1-3. app.ts に登録

```bash
# src/app.ts を編集（手動）
# 以下を追記:

import roomGradesRoutes from './routes/systems/common/room-grades.routes'
app.use(roomGradesRoutes)
```

**重要**: import文の追加位置は、他の routes import の近くに配置してください。

### 4-2. hotel-saas 客室グレードプロキシ実装

#### 4-2-1. ディレクトリ作成

```bash
cd /Users/kaneko/hotel-saas-rebuild
mkdir -p server/api/v1/admin/room-grades
```

#### 4-2-2. 各テンプレートをコピー＆置換（5ファイル）

```bash
# 1. Create
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-create.template.ts \
   server/api/v1/admin/room-grades/create.post.ts
sed -i '' 's/RESOURCE/room-grades/g' server/api/v1/admin/room-grades/create.post.ts

# 2. List
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-list.template.ts \
   server/api/v1/admin/room-grades/list.get.ts
sed -i '' 's/RESOURCE/room-grades/g' server/api/v1/admin/room-grades/list.get.ts

# 3. Get by ID
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-get.template.ts \
   server/api/v1/admin/room-grades/[id].get.ts
sed -i '' 's/RESOURCE/room-grades/g' server/api/v1/admin/room-grades/[id].get.ts

# 4. Update
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-update.template.ts \
   server/api/v1/admin/room-grades/[id].put.ts
sed -i '' 's/RESOURCE/room-grades/g' server/api/v1/admin/room-grades/[id].put.ts

# 5. Delete
cp /Users/kaneko/hotel-kanri/templates/hotel-saas-delete.template.ts \
   server/api/v1/admin/room-grades/[id].delete.ts
sed -i '' 's/RESOURCE/room-grades/g' server/api/v1/admin/room-grades/[id].delete.ts
```

#### 4-2-3. 検証

```bash
# 5ファイル全て存在確認
ls server/api/v1/admin/room-grades/

# 期待結果:
# create.post.ts
# list.get.ts
# [id].get.ts
# [id].put.ts
# [id].delete.ts

# 置換確認（RESOURCE → room-grades）
grep '/api/v1/room-grades' server/api/v1/admin/room-grades/create.post.ts

# 期待結果: callHotelCommonAPI(event, '/api/v1/room-grades', ... が表示される
```

---

## 🚀 【Step 5: サーバー起動・動作確認】

### 5-1. サーバー起動

#### ターミナル1: hotel-common起動

```bash
cd /Users/kaneko/hotel-common-rebuild
PORT=3401 npm run dev

# 期待結果: Server running on http://localhost:3401
```

#### ターミナル2: hotel-saas起動

```bash
cd /Users/kaneko/hotel-saas-rebuild
PORT=3101 npm run dev

# 期待結果: Nuxt server running on http://localhost:3101
```

**重要**: 両方のサーバーが起動していることを確認してください。エラーがある場合は即座に報告してください。

### 5-2. ログイン（Session Cookie取得）

#### ターミナル3: テスト実行

```bash
# ログイン（Session Cookie取得）
curl -X POST http://localhost:3101/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}' \
  -c cookies.txt \
  -v

# 期待結果: 
# < HTTP/1.1 200 OK
# < Set-Cookie: hotel_session=...
# {"success":true,"user":{...}}
```

**エラー時の対処**:
- `404 Not Found` → ログインAPIが未実装（既存からコピー必須）
- `401 Unauthorized` → 認証情報が間違っている
- `Connection refused` → サーバーが起動していない

### 5-3. CRUD実行

#### 1) Create（新規作成）

```bash
curl -X POST http://localhost:3101/api/v1/admin/room-grades/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"gradeName":"テストグレード","gradeCode":"TEST","gradeLevel":5}' \
  | jq

# 期待結果:
# {
#   "success": true,
#   "data": {
#     "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#     "gradeName": "テストグレード",
#     "gradeCode": "TEST",
#     "gradeLevel": 5,
#     "tenantId": "rebuild-test-tenant",
#     ...
#   }
# }
```

**重要**: 返却された `id` を控えておいてください（次のステップで使用）

#### 2) List（一覧取得）

```bash
curl http://localhost:3101/api/v1/admin/room-grades/list \
  -b cookies.txt \
  | jq

# 期待結果:
# {
#   "success": true,
#   "data": [
#     {
#       "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#       "gradeName": "テストグレード",
#       ...
#     }
#   ]
# }
```

#### 3) Get by ID（詳細取得）

```bash
# {id} を上記で取得したIDに置換
ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

curl http://localhost:3101/api/v1/admin/room-grades/${ID} \
  -b cookies.txt \
  | jq

# 期待結果:
# {
#   "success": true,
#   "data": {
#     "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#     "gradeName": "テストグレード",
#     ...
#   }
# }
```

#### 4) Update（更新）

```bash
curl -X PUT http://localhost:3101/api/v1/admin/room-grades/${ID} \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"gradeName":"更新グレード"}' \
  | jq

# 期待結果:
# {
#   "success": true,
#   "data": {
#     "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#     "gradeName": "更新グレード",
#     ...
#   }
# }
```

#### 5) Delete（削除）

```bash
curl -X DELETE http://localhost:3101/api/v1/admin/room-grades/${ID} \
  -b cookies.txt \
  | jq

# 期待結果:
# {
#   "success": true
# }
```

### 5-4. エラー時の対処法

| エラー | 原因 | 対処法 |
|--------|------|--------|
| `404 Not Found` | ルーティング設定ミス | ファイル名・パスを確認 |
| `401 Unauthorized` | Cookie転送失敗 | `callHotelCommonAPI` 使用確認 |
| `500 Internal Server Error` | サーバー側エラー | サーバーログ確認 |
| `P2025: Record not found` | データ不存在 | IDが間違っているか、削除済み |

**重要**: エラーが出た場合は、即座に報告して原因を調査してください。

---

## 🔍 【Step 6: Prisma Studioで確認】

```bash
# 別ターミナルで実行
cd /Users/kaneko/hotel-common-rebuild
npx prisma studio

# ブラウザで http://localhost:5555 を開く
# room_grades テーブルを選択
# 以下を確認:
# - データが存在するか
# - tenant_id = 'rebuild-test-tenant' か
# - gradeName / gradeCode / gradeLevel が正しいか
```

**期待結果**:
- room_grades テーブルにデータが存在
- tenant_id が `rebuild-test-tenant`
- CRUD操作したデータが全て反映されている

---

## ✅ 【Step 7: チェックリスト確認・ユーザー報告】

### 事前準備

- [ ] 依存ファイル確認完了
  - [ ] sessionAuthMiddleware 存在確認
  - [ ] callHotelCommonAPI 存在確認
  - [ ] Prisma Client生成完了

### テンプレート作成

- [ ] hotel-common CRUDテンプレート作成
  - [ ] `/Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts` 作成
  - [ ] コード確認（文法エラーなし）
  - [ ] `:resource` がそのまま残っていることを確認

- [ ] hotel-saas プロキシテンプレート作成（5ファイル）
  - [ ] hotel-saas-create.template.ts 作成
  - [ ] hotel-saas-list.template.ts 作成
  - [ ] hotel-saas-get.template.ts 作成
  - [ ] hotel-saas-update.template.ts 作成
  - [ ] hotel-saas-delete.template.ts 作成
  - [ ] 全ファイルでコード確認（文法エラーなし）
  - [ ] `RESOURCE` がそのまま残っていることを確認

### テストテナント作成

- [ ] PostgreSQL に `rebuild-test-tenant` を INSERT
- [ ] `SELECT * FROM tenants WHERE id = 'rebuild-test-tenant'` で確認

### 客室グレード実装

- [ ] hotel-common 客室グレードAPI実装
  - [ ] テンプレートコピー完了
  - [ ] `:resource` → `roomGrade` 置換完了
  - [ ] APIパス置換完了
  - [ ] app.ts に登録完了

- [ ] hotel-saas 客室グレードプロキシ実装
  - [ ] 5ファイル作成完了
  - [ ] `RESOURCE` → `room-grades` 置換完了（全ファイル）

### サーバー起動・動作確認

- [ ] hotel-common起動成功（PORT=3401）
- [ ] hotel-saas起動成功（PORT=3101）
- [ ] ログイン成功（Session Cookie取得）

- [ ] CRUD実行成功
  - [ ] Create: 201 Created
  - [ ] List: 200 OK（データ表示）
  - [ ] Get by ID: 200 OK（データ表示）
  - [ ] Update: 200 OK
  - [ ] Delete: 200 OK

### Prisma Studio確認

- [ ] room_grades テーブルにデータ存在
- [ ] tenant_id = 'rebuild-test-tenant'
- [ ] CRUD操作が全て反映されている

### エラーゼロ確認

- [ ] hotel-common起動時エラーなし
- [ ] hotel-saas起動時エラーなし
- [ ] CRUD実行時エラーなし
- [ ] サーバーログにエラーなし

---

## 📊 【Phase 1完了報告テンプレート】

以下をユーザーに報告してください：

```
Phase 1完了しました。完了条件：

✅ テンプレート2種類作成（hotel-common + hotel-saas）
  - hotel-common-crud.template.ts（300行）
  - hotel-saas-*.template.ts（5ファイル）

✅ 客室グレードのCRUD全て動作
  - Create: ✅ 成功（201 Created）
  - List: ✅ 成功（200 OK、データ表示）
  - Get by ID: ✅ 成功（200 OK、データ表示）
  - Update: ✅ 成功（200 OK）
  - Delete: ✅ 成功（200 OK）

✅ エラーゼロ
  - hotel-common起動: ✅ エラーなし
  - hotel-saas起動: ✅ エラーなし
  - CRUD実行: ✅ エラーなし

✅ Prisma Studioで確認
  - room_grades テーブルにデータ存在
  - tenant_id正しく設定

次のPhase（Phase 2: 機能実装）に進んでよろしいですか？
```

---

## 🚨 【よくあるエラーと対処法】

### エラー1: `prisma.roomGrade is not a function`

**原因**: Prismaモデル名が間違っている

**対処法**:
```bash
# schema.prisma を確認
grep "model" /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma

# 例: model room_grades → Prismaモデル名は roomGrade（camelCase）
```

### エラー2: `401 Unauthorized`

**原因**: Cookie転送されていない

**対処法**:
```typescript
// callHotelCommonAPI を使用しているか確認
await callHotelCommonAPI(event, '/api/v1/room-grades', ...)
```

### エラー3: `tenantId undefined`

**原因**: sessionAuthMiddleware が動作していない

**対処法**:
```typescript
// hotel-common側で確認
router.use(sessionAuthMiddleware) // ← 必須
```

### エラー4: `P2025: Record not found`

**原因**: tenantId が違う、またはデータが存在しない

**対処法**:
```bash
# Prisma Studio でデータ確認
npx prisma studio
```

### エラー5: `Connection refused`

**原因**: サーバーが起動していない

**対処法**:
```bash
# サーバー起動確認
lsof -i :3401  # hotel-common
lsof -i :3101  # hotel-saas
```

### エラー6: `Module not found: callHotelCommonAPI`

**原因**: api-client.ts が存在しない

**対処法**:
```bash
# 既存からコピー
mkdir -p /Users/kaneko/hotel-saas-rebuild/server/utils
cp /Users/kaneko/hotel-saas/server/utils/api-client.ts \
   /Users/kaneko/hotel-saas-rebuild/server/utils/
```

---

## 🎯 【Phase 1成功の定義】

### 定量的基準

```
✅ Phase 1完了条件:

1. テンプレートファイルが存在する
   - /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts
   - /Users/kaneko/hotel-kanri/templates/hotel-saas-create.template.ts
   - /Users/kaneko/hotel-kanri/templates/hotel-saas-list.template.ts
   - /Users/kaneko/hotel-kanri/templates/hotel-saas-get.template.ts
   - /Users/kaneko/hotel-kanri/templates/hotel-saas-update.template.ts
   - /Users/kaneko/hotel-kanri/templates/hotel-saas-delete.template.ts

2. 客室グレードのCRUDが全て動作する
   - Create: 201 Created
   - List: 200 OK（データ表示）
   - Get by ID: 200 OK（データ表示）
   - Update: 200 OK
   - Delete: 200 OK

3. エラーがゼロ
   - サーバーログにエラーなし
   - curlコマンド実行でエラーなし

4. ユーザーの承認を得た
   - Phase 1完了報告
   - 「次のPhaseに進んでよろしいですか？」
   - 「承認します」を取得
```

### 定性的基準

```
✅ 実装AIが以下を理解している:

1. テンプレートの目的
   - 動作確認済みのパターンを使い回す
   - エラーを出さない

2. 置換ルール
   - hotel-common: :resource → Prismaモデル名
   - hotel-saas: RESOURCE → APIパス

3. Phase 2以降の流れ
   - テンプレートをコピー
   - 置換
   - 動作確認
   - 報告
   - 承認
   - Plane IssueをDone

4. トラブルシューティング
   - よくあるエラーを知っている
   - 対処法を知っている
```

---

## 📞 【エラー発生時の報告フォーマット】

エラーが発生した場合、以下の形式で報告してください：

```
🚨 Phase 1 エラー報告

## Step番号
Step X: [ステップ名]

## エラー内容
[エラーメッセージ全文]

## 実行したコマンド
[実行したコマンド]

## 現在の状態
- hotel-common起動: ✅ / ❌
- hotel-saas起動: ✅ / ❌
- ファイル存在確認: ✅ / ❌
- [その他]

## 調査した内容
- [確認したこと1]
- [確認したこと2]

## 次のアクション提案
[どうすればいいか提案]
```

---

## 🎯 【最後に】

```
✅ この指示書を**1行ずつ**実行してください
✅ 分からないことがあれば、即座に報告してください
✅ エラーがあれば、即座に報告してください
✅ 完了したら、必ずユーザーに報告してください

❌ 「ざっと読んで」実装開始しないでください
❌ 「たぶん動く」で次に進まないでください
❌ 「確認した」と嘘をつかないでください
```

**Phase 1実装を開始してください！**

