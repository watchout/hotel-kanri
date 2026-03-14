# 📋 PERMISSION_SYSTEM ブラウザ目視テスト項目

**作成日**: 2025年10月14日  
**対象**: SSOT_PERMISSION_SYSTEM.md v1.0.0  
**目的**: 単体テストでカバーできない統合動作の確認

---

## 🎯 テスト目的

- ✅ 単体テストでカバーできない統合動作の確認
- ✅ 実際のHTTPリクエスト・レスポンスの確認
- ✅ Session認証との統合確認
- ✅ エラーハンドリングの実動作確認
- ✅ Redisキャッシュの実動作確認
- ✅ マルチテナント分離の実動作確認

---

## 🧪 テスト環境

### 前提条件

- ✅ hotel-common起動中（port 3400）
- ✅ Redis起動中（port 6379）
- ✅ PostgreSQL起動中（port 5432）
- ✅ **テストアカウントが作成済み**（Seed実行済み）
- ✅ PERMISSION_SYSTEMのデータ投入済み

### テストアカウント

**SSOT参照**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_PERMISSION_SYSTEM.md` (L1218-L1267)

| ロール | メールアドレス | パスワード | 権限数 |
|:------|:-------------|:----------|:-----:|
| OWNER | `owner@test.omotenasuai.com` | `owner123` | 10件（全権限） |
| MANAGER | `manager@test.omotenasuai.com` | `manager123` | 9件（SYSTEM_MANAGE以外） |
| STAFF | `staff@test.omotenasuai.com` | `staff123` | 4件（VIEW系のみ） |

**作成方法**:
```bash
cd /Users/kaneko/hotel-common
npx prisma db seed
```

**確認方法**:
```bash
psql postgresql://kaneko@localhost:5432/hotel_unified_db -c "
SELECT s.email, r.code as role, COUNT(rp.permission_id) as permissions
FROM staff s
JOIN user_roles ur ON ur.user_id = s.id
JOIN roles r ON r.role_id = ur.role_id
LEFT JOIN role_permissions rp ON rp.role_id = r.role_id
WHERE s.email LIKE '%@test.omotenasuai.com'
GROUP BY s.email, r.code
ORDER BY s.email;
"
```

**期待結果**:
```
owner@test.omotenasuai.com   | OWNER   | 10
manager@test.omotenasuai.com | MANAGER | 9
staff@test.omotenasuai.com   | STAFF   | 4
```

### 環境確認コマンド

```bash
# 1. hotel-common起動確認
ps aux | grep "integration-server" | grep -v grep

# 2. Redis起動確認
redis-cli ping
# 期待結果: PONG

# 3. PostgreSQL確認
psql postgresql://kaneko@localhost:5432/hotel_unified_db -c "SELECT COUNT(*) FROM permissions;"
# 期待結果: 10

# 4. 権限データ確認
psql postgresql://kaneko@localhost:5432/hotel_unified_db -c "SELECT code FROM permissions ORDER BY code;"
# 期待結果: 10件の権限コード表示

# 5. ロールデータ確認
psql postgresql://kaneko@localhost:5432/hotel_unified_db -c "
SELECT code, priority FROM roles 
WHERE tenant_id='tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7' 
ORDER BY priority DESC;
"
# 期待結果: OWNER(100), MANAGER(50), STAFF(10)

# 6. テストアカウント確認
psql postgresql://kaneko@localhost:5432/hotel_unified_db -c "
SELECT s.email, r.code as role, COUNT(rp.permission_id) as permissions
FROM staff s
JOIN user_roles ur ON ur.user_id = s.id
JOIN roles r ON r.role_id = ur.role_id
LEFT JOIN role_permissions rp ON rp.role_id = r.role_id
WHERE s.email LIKE '%@test.omotenasuai.com'
GROUP BY s.email, r.code
ORDER BY s.email;
"
# 期待結果:
# owner@test.omotenasuai.com   | OWNER   | 10
# manager@test.omotenasuai.com | MANAGER | 9
# staff@test.omotenasuai.com   | STAFF   | 4
```

---

## 📝 テスト項目一覧

### Test 1: ログイン + セッション取得

**目的**: Session認証基盤の動作確認

**テストアカウント**: `owner@test.omotenasuai.com` / `owner123` (OWNERロール)

**手順**:
```bash
# 1. ログインAPI呼び出し（OWNERロールのテストアカウント）
curl -X POST http://localhost:3400/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@test.omotenasuai.com",
    "password": "owner123"
  }' \
  -c cookies.txt \
  -v

# 期待結果:
# - Status: 200 OK
# - Set-Cookie: hotel-session-id=xxxxx
# - Response: { "success": true, "user": {...} }
```

**確認事項**:
- [ ] HTTPステータス200が返る
- [ ] `Set-Cookie`ヘッダーに`hotel-session-id`が含まれる
- [ ] レスポンスに`user.tenant_id`が含まれる
- [ ] レスポンスに`user.user_id`が含まれる
- [ ] `cookies.txt`にセッションIDが保存される

---

### Test 2: 権限チェックAPI（GET /api/v1/permissions/check）

**目的**: 権限チェック機能の動作確認

**手順**:
```bash
# 2-1. ORDER_MANAGE権限チェック（権限あり）
curl -X GET "http://localhost:3400/api/v1/permissions/check?permission_code=ORDER_MANAGE" \
  -b cookies.txt \
  -H "Content-Type: application/json"

# 期待結果:
# { "hasPermission": true, "permissionCode": "ORDER_MANAGE" }

# 2-2. 存在しない権限チェック（権限なし）
curl -X GET "http://localhost:3400/api/v1/permissions/check?permission_code=NONEXISTENT_PERMISSION" \
  -b cookies.txt \
  -H "Content-Type: application/json"

# 期待結果:
# { "hasPermission": false, "permissionCode": "NONEXISTENT_PERMISSION" }

# 2-3. パラメータなしでエラー確認
curl -X GET "http://localhost:3400/api/v1/permissions/check" \
  -b cookies.txt \
  -H "Content-Type: application/json"

# 期待結果:
# Status: 400, { "error": "permission_codeが必要です" }

# 2-4. 認証なしでエラー確認
curl -X GET "http://localhost:3400/api/v1/permissions/check?permission_code=ORDER_MANAGE" \
  -H "Content-Type: application/json"

# 期待結果:
# Status: 401, { "error": "認証が必要です" } または { "error": "UNAUTHORIZED", ... }
```

**確認事項**:
- [ ] 権限ありの場合、`hasPermission: true`が返る
- [ ] 権限なしの場合、`hasPermission: false`が返る
- [ ] パラメータ不足時、400エラーが返る
- [ ] 認証なし時、401エラーが返る

---

### Test 3: ユーザー権限一覧取得API（GET /api/v1/permissions/user-permissions）

**目的**: ユーザー権限一覧取得機能の動作確認

**手順**:
```bash
# 3-1. ユーザー権限一覧取得
curl -X GET "http://localhost:3400/api/v1/permissions/user-permissions" \
  -b cookies.txt \
  -H "Content-Type: application/json"

# 期待結果（OWNERロールの場合）:
# {
#   "permissions": [
#     "ORDER_VIEW", "ORDER_MANAGE",
#     "MENU_VIEW", "MENU_MANAGE",
#     "ROOM_VIEW", "ROOM_MANAGE",
#     "STAFF_VIEW", "STAFF_MANAGE",
#     "SYSTEM_MANAGE", "PERMISSION_MANAGE"
#   ]
# }

# 3-2. 2回目の呼び出し（Redisキャッシュから取得）
curl -X GET "http://localhost:3400/api/v1/permissions/user-permissions" \
  -b cookies.txt \
  -H "Content-Type: application/json"

# 期待結果: 同じ結果が高速で返る（キャッシュヒット）
```

**確認事項**:
- [ ] 権限コード配列が返る
- [ ] OWNERロールの場合、10件の権限が返る
- [ ] STAFFロールの場合、4件（VIEW系）の権限が返る
- [ ] 2回目の呼び出しが1回目より高速（キャッシュ効果）

---

### Test 4: ロール一覧取得API（GET /api/v1/permissions/roles）

**目的**: ロール一覧取得機能の動作確認

**手順**:
```bash
# 4-1. ロール一覧取得
curl -X GET "http://localhost:3400/api/v1/permissions/roles" \
  -b cookies.txt \
  -H "Content-Type: application/json"

# 期待結果:
# {
#   "roles": [
#     {
#       "id": "...",
#       "name": "オーナー",
#       "code": "OWNER",
#       "priority": 100,
#       "permissions": [...]
#     },
#     {
#       "id": "...",
#       "name": "マネージャー",
#       "code": "MANAGER",
#       "priority": 50,
#       "permissions": [...]
#     },
#     {
#       "id": "...",
#       "name": "スタッフ",
#       "code": "STAFF",
#       "priority": 10,
#       "permissions": [...]
#     }
#   ]
# }
```

**確認事項**:
- [ ] ロール配列が返る
- [ ] 各ロールに`permissions`配列が含まれる
- [ ] `priority`降順でソートされている（OWNER→MANAGER→STAFF）
- [ ] テナント別にフィルタされている

---

### Test 5: ロール作成API（POST /api/v1/permissions/roles）

**目的**: ロール作成機能とPERMISSION_MANAGE権限チェックの動作確認

**手順**:
```bash
# 5-1. カスタムロール作成
curl -X POST "http://localhost:3400/api/v1/permissions/roles" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "カスタムロール",
    "code": "CUSTOM_ROLE",
    "description": "テスト用カスタムロール",
    "priority": 30
  }'

# 期待結果:
# Status: 201, { "role": { "id": "...", "name": "カスタムロール", ... } }

# 5-2. パラメータ不足でエラー確認
curl -X POST "http://localhost:3400/api/v1/permissions/roles" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "カスタムロール"
  }'

# 期待結果:
# Status: 400, { "error": "name, code, priorityが必要です" }

# 5-3. PERMISSION_MANAGE権限なしでエラー確認
# （事前にSTAFFロールでログイン: staff@test.omotenasuai.com / staff123）
curl -X POST http://localhost:3400/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "staff@test.omotenasuai.com",
    "password": "staff123"
  }' \
  -c cookies_staff.txt

# STAFFアカウントでロール作成を試行
curl -X POST "http://localhost:3400/api/v1/permissions/roles" \
  -b cookies_staff.txt \
  -H "Content-Type: application/json" \
  -d '{
    "name": "カスタムロール",
    "code": "CUSTOM_ROLE_2",
    "priority": 30
  }'

# 期待結果:
# Status: 403, { "error": "この操作を行う権限がありません" }
```

**確認事項**:
- [ ] 正常時、201ステータスとロールオブジェクトが返る
- [ ] パラメータ不足時、400エラーが返る
- [ ] PERMISSION_MANAGE権限なし時、403エラーが返る
- [ ] 作成されたロールがDBに保存される

---

### Test 6: ロール-権限更新API（PUT /api/v1/permissions/role-permissions）

**目的**: ロール-権限更新機能の動作確認

**手順**:
```bash
# 6-1. 事前準備: 権限IDとカスタムロールIDを取得
# 権限ID取得
psql postgresql://kaneko@localhost:5432/hotel_unified_db -c "SELECT permission_id, code FROM permissions WHERE code IN ('ORDER_VIEW', 'MENU_VIEW') LIMIT 2;" -t

# カスタムロールID取得
psql postgresql://kaneko@localhost:5432/hotel_unified_db -c "SELECT role_id FROM roles WHERE code='CUSTOM_ROLE' AND tenant_id='default000' LIMIT 1;" -t

# 6-2. カスタムロールの権限を更新
curl -X PUT "http://localhost:3400/api/v1/permissions/role-permissions" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": "CUSTOM_ROLE_ID",
    "permission_ids": ["PERMISSION_ID_1", "PERMISSION_ID_2"]
  }'

# 期待結果:
# Status: 200, { "message": "ロール権限を更新しました" }

# 6-3. パラメータ不足でエラー確認
curl -X PUT "http://localhost:3400/api/v1/permissions/role-permissions" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": "CUSTOM_ROLE_ID"
  }'

# 期待結果:
# Status: 400, { "error": "role_id, permission_ids（配列）が必要です" }
```

**確認事項**:
- [ ] 正常時、200ステータスとメッセージが返る
- [ ] パラメータ不足時、400エラーが返る
- [ ] PERMISSION_MANAGE権限なし時、403エラーが返る
- [ ] 更新後、関連ユーザーのキャッシュがクリアされる

---

### Test 7: ユーザー-ロール割り当てAPI（POST /api/v1/permissions/user-roles）

**目的**: ユーザー-ロール割り当て機能の動作確認

**手順**:
```bash
# 7-1. 事前準備: テストユーザーIDとロールIDを取得
# ユーザーID取得
psql postgresql://kaneko@localhost:5432/hotel_unified_db -c "SELECT id FROM staff WHERE email='admin@omotenasuai.com' LIMIT 1;" -t

# ロールID取得
psql postgresql://kaneko@localhost:5432/hotel_unified_db -c "SELECT role_id FROM roles WHERE code='OWNER' AND tenant_id='default000' LIMIT 1;" -t

# 7-2. ユーザーにロールを割り当て
curl -X POST "http://localhost:3400/api/v1/permissions/user-roles" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "TEST_USER_ID",
    "role_ids": ["OWNER_ROLE_ID"]
  }'

# 期待結果:
# Status: 200, { "message": "ユーザーロールを割り当てました" }

# 7-3. 複数ロール割り当て
curl -X POST "http://localhost:3400/api/v1/permissions/user-roles" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "TEST_USER_ID",
    "role_ids": ["OWNER_ROLE_ID", "CUSTOM_ROLE_ID"]
  }'

# 期待結果:
# Status: 200, { "message": "ユーザーロールを割り当てました" }

# 7-4. 空配列でロール全解除
curl -X POST "http://localhost:3400/api/v1/permissions/user-roles" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "TEST_USER_ID",
    "role_ids": []
  }'

# 期待結果:
# Status: 200, { "message": "ユーザーロールを割り当てました" }
```

**確認事項**:
- [ ] 正常時、200ステータスとメッセージが返る
- [ ] 複数ロール割り当てが可能
- [ ] 空配列で全ロール解除が可能
- [ ] PERMISSION_MANAGE権限なし時、403エラーが返る
- [ ] 割り当て後、ユーザーのキャッシュがクリアされる

---

### Test 8: Redisキャッシュ動作確認

**目的**: Redisキャッシュの動作確認

**手順**:
```bash
# 8-1. 初回呼び出し（DBアクセス）
time curl -X GET "http://localhost:3400/api/v1/permissions/user-permissions" \
  -b cookies.txt \
  -H "Content-Type: application/json"

# 8-2. 2回目呼び出し（キャッシュヒット）
time curl -X GET "http://localhost:3400/api/v1/permissions/user-permissions" \
  -b cookies.txt \
  -H "Content-Type: application/json"

# 8-3. Redisキャッシュ確認
redis-cli KEYS "permission:user:*"

# 8-4. キャッシュのTTL確認
redis-cli TTL "permission:user:{userId}:tenant:{tenantId}"
# 期待結果: 300秒以下の値

# 8-5. キャッシュクリア後、再呼び出し
redis-cli FLUSHDB
time curl -X GET "http://localhost:3400/api/v1/permissions/user-permissions" \
  -b cookies.txt \
  -H "Content-Type: application/json"
```

**確認事項**:
- [ ] 初回呼び出しよりも2回目が高速
- [ ] Redisに`permission:user:{userId}:tenant:{tenantId}`キーが存在
- [ ] キャッシュTTLが300秒（5分）
- [ ] キャッシュクリア後、再度DBアクセスが発生

---

### Test 9: テナント分離確認

**目的**: マルチテナント分離の動作確認

**注意**: このテストは複数テナントが存在する場合のみ実施可能です。

**前提**: テストアカウントは単一テナント（`tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7`）にのみ所属しているため、**このテストはスキップ可能**です。

**複数テナント環境での手順**:
```bash
# 9-1. テナントAでログイン
curl -X POST http://localhost:3400/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email": "owner@test.omotenasuai.com", "password": "owner123" }' \
  -c cookies_tenantA.txt

# 9-2. テナントAのロール一覧取得
curl -X GET "http://localhost:3400/api/v1/permissions/roles" \
  -b cookies_tenantA.txt \
  -H "Content-Type: application/json"

# 9-3. 別テナントが必要な場合は、Seed追加が必要
# （現状は単一テナントのみ）
```

**確認事項**:
- [ ] テナントAのロールとテナントBのロールが異なる
- [ ] 各テナントは自分のテナントのロールのみ取得できる
- [ ] テナントを越えたデータアクセスが発生しない

---

### Test 10: エラーハンドリング確認

**目的**: エラーハンドリングの動作確認

**手順**:
```bash
# 10-1. 存在しないロールIDで権限更新
curl -X PUT "http://localhost:3400/api/v1/permissions/role-permissions" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": "NONEXISTENT_ROLE_ID",
    "permission_ids": ["PERMISSION_ID_1"]
  }'

# 期待結果:
# Status: 500, { "error": "ロール権限の更新に失敗しました" }

# 10-2. 他テナントのロールIDで権限更新
curl -X PUT "http://localhost:3400/api/v1/permissions/role-permissions" \
  -b cookies_tenantA.txt \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": "TENANT_B_ROLE_ID",
    "permission_ids": ["PERMISSION_ID_1"]
  }'

# 期待結果:
# Status: 500, { "error": "ロール権限の更新に失敗しました" }

# 10-3. 無効なJSONでリクエスト
curl -X POST "http://localhost:3400/api/v1/permissions/roles" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d 'INVALID_JSON'

# 期待結果:
# Status: 400または500, エラーメッセージ
```

**確認事項**:
- [ ] 存在しないロールID時、エラーが返る
- [ ] 他テナントのロールアクセス時、エラーが返る
- [ ] 無効なJSON時、エラーが返る
- [ ] 全てのエラーで適切なHTTPステータスが返る

---

## 📊 テスト結果チェックリスト

### 必須確認項目

- [ ] **Test 1**: ログイン成功、セッションID取得
- [ ] **Test 2**: 権限チェックAPI正常動作
- [ ] **Test 3**: ユーザー権限一覧取得API正常動作
- [ ] **Test 4**: ロール一覧取得API正常動作
- [ ] **Test 5**: ロール作成API正常動作
- [ ] **Test 6**: ロール-権限更新API正常動作
- [ ] **Test 7**: ユーザー-ロール割り当てAPI正常動作
- [ ] **Test 8**: Redisキャッシュ正常動作
- [ ] **Test 9**: テナント分離正常動作
- [ ] **Test 10**: エラーハンドリング正常動作

### 性能確認項目

- [ ] 初回APIコール: 200ms以下
- [ ] キャッシュヒット時: 50ms以下
- [ ] DBトランザクション: 500ms以下

### セキュリティ確認項目

- [ ] 認証なしアクセス: 全て401エラー
- [ ] 権限不足アクセス: 全て403エラー
- [ ] テナント越境アクセス: 全て失敗
- [ ] SessionIDなしアクセス: 全て401エラー

---

## 🎯 テスト完了基準

以下の全てを満たす場合、**ブラウザ目視テスト完了**とします：

1. ✅ 全10テストケースが合格
2. ✅ 必須確認項目10件が全てチェック済み
3. ✅ 性能確認項目が基準内
4. ✅ セキュリティ確認項目が全て合格
5. ✅ エラーが発生した場合、全て適切に処理される

---

## 📝 テスト実施報告フォーマット

```markdown
## ✅ PERMISSION_SYSTEM ブラウザ目視テスト完了報告

### テスト実施日
2025-10-XX

### テスト実施者
hotel-common担当者

### テスト結果サマリー
- **全テストケース**: X/10件合格
- **必須確認項目**: X/10件完了
- **性能確認**: 全て基準内 / 一部基準外
- **セキュリティ**: 全て合格 / 一部不合格

### 発見された問題
[問題があれば記載、なければ「なし」]

### 問題の対応状況
[問題があった場合の対応状況]

### 備考
[その他気づいた点があれば記載]
```

---

## 🔗 関連ドキュメント

- **SSOT**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_PERMISSION_SYSTEM.md`
- **Phase 1 Week 1指示書**: `/Users/kaneko/hotel-kanri/docs/03_ssot/PHASE_1_WEEK_1_INSTRUCTIONS.md`
- **単体テスト**: `/Users/kaneko/hotel-common/src/services/__tests__/permission.service.test.ts`

