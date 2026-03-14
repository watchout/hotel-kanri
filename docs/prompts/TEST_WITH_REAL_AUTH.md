# 🔐 実認証を使用したテスト実行ガイド

**対象**: hotel-common APIテスト  
**認証方式**: Session認証（実際のログインフロー使用）  
**優先度**: 🔴 高  
**参照SSOT**: `SSOT_TEST_ENVIRONMENT.md`

---

## 🎯 基本方針

**認証モックは使用しない** - 実際のログインフローでセッションを取得してテストを実行します。

### 理由
1. ✅ **本番同等性**: 実際の認証フローと同じ動作を検証
2. ✅ **統一性**: SSOTに記載されたテストアカウントを全システムで共有
3. ✅ **信頼性**: モックではなく、実際のセッション管理を使用

---

## 🔑 テストアカウント情報（SSOT準拠）

| 項目 | 値 |
|------|------|
| **メールアドレス** | `admin@omotenasuai.com` |
| **パスワード** | `admin123` |
| **テナントID** | `default` |
| **用途** | 開発・テスト環境専用 |

**参照**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_TEST_ENVIRONMENT.md` (L105-108)

---

## 📋 テスト実行フロー

### Phase 1: 環境確認（1分）

```bash
# 1. PostgreSQL接続確認
psql -d hotel_unified_db -c "SELECT 1"

# 2. Redis接続確認
redis-cli ping

# 3. テストアカウント存在確認
psql -d hotel_unified_db -c "
SELECT email, name, tenant_id 
FROM staff 
WHERE email = 'admin@omotenasuai.com';
"
# 期待: admin@omotenasuai.com | (名前) | default

# 4. テストテナント存在確認
psql -d hotel_unified_db -c "
SELECT id, name 
FROM \"Tenant\" 
WHERE id = 'default';
"
# 期待: default | テストホテルグループ
```

### Phase 2: hotel-common起動確認（30秒）

```bash
# 1. hotel-common API疎通確認
curl -f http://localhost:3400/api/health

# ✅ 成功: そのまま次のステップへ
# ❌ 失敗: hotel-commonを起動
cd /Users/kaneko/hotel-common
npm run dev
```

### Phase 3: ログインしてセッション取得（1分）

```bash
# hotel-commonログインAPI経由でセッション取得
curl -X POST http://localhost:3400/api/v1/auth/admin/login \
  -H "Content-Type: application/json" \
  -c /tmp/test-session-cookies.txt \
  -d '{
    "email": "admin@omotenasuai.com",
    "password": "admin123",
    "tenantId": "default"
  }'

# レスポンス例:
# {
#   "success": true,
#   "data": {
#     "sessionId": "xxx",
#     "user": { "id": "xxx", "email": "admin@omotenasuai.com" },
#     "tenantId": "default"
#   }
# }

# Cookieからセッション情報を抽出
export TEST_SESSION_COOKIE=$(cat /tmp/test-session-cookies.txt | grep hotel_session | awk '{print $7}')
echo "Session Cookie: $TEST_SESSION_COOKIE"
```

### Phase 4: テスト実行（セッション付き）

#### 方法A: 環境変数でセッションを渡す

```bash
cd /Users/kaneko/hotel-common

# セッションCookieを環境変数に設定
export TEST_SESSION_COOKIE="セッションID"
export TEST_TENANT_ID="default"
export TEST_USER_EMAIL="admin@omotenasuai.com"

# テスト実行
npm test
```

#### 方法B: テストファイル内でログイン

テストファイルの`beforeAll`でログインを実行：

```typescript
// src/routes/api/v1/admin/__tests__/roles.api.test.ts

let testSessionCookie: string;
let testTenantId: string;
let testUserId: string;

beforeAll(async () => {
  // 実際のログインAPIを叩いてセッション取得
  const loginResponse = await request(API_BASE_URL)
    .post('/api/v1/auth/admin/login')
    .send({
      email: 'admin@omotenasuai.com',
      password: 'admin123',
      tenantId: 'default',
    });

  // レスポンスからセッション情報を取得
  const setCookieHeader = loginResponse.headers['set-cookie'];
  if (setCookieHeader && setCookieHeader.length > 0) {
    // hotel_session Cookieを抽出
    const sessionCookie = setCookieHeader.find((cookie: string) => 
      cookie.startsWith('hotel_session=')
    );
    testSessionCookie = sessionCookie || '';
  }

  testTenantId = loginResponse.body.data.tenantId;
  testUserId = loginResponse.body.data.user.id;

  console.log('✅ テストセッション取得完了');
  console.log('  Session Cookie:', testSessionCookie);
  console.log('  Tenant ID:', testTenantId);
  console.log('  User ID:', testUserId);
});

// テストでセッションCookieを使用
it('役職一覧を取得できる', async () => {
  const response = await request(API_BASE_URL)
    .get('/api/v1/admin/roles')
    .set('Cookie', testSessionCookie)  // ← セッションCookieを付与
    .expect(200);

  expect(response.body.success).toBe(true);
  expect(Array.isArray(response.body.data)).toBe(true);
});
```

---

## 🔧 実装例：roles.api.test.ts修正

### 修正前（モック使用）

```typescript
beforeAll(async () => {
  // テストユーザー作成（モック）
  await prisma.staff.upsert({
    where: { id: testUserId },
    update: {},
    create: {
      id: testUserId,
      email: 'test-roles-api@example.com',
      name: 'Test User for Roles API',
    },
  });

  // セッション作成（簡易版・モック）
  testSessionCookie = 'test-session-cookie';  // ← モック
});
```

### 修正後（実認証使用）

```typescript
beforeAll(async () => {
  // 実際のログインAPIを叩いてセッション取得
  const loginResponse = await request(API_BASE_URL)
    .post('/api/v1/auth/admin/login')
    .send({
      email: 'admin@omotenasuai.com',  // SSOT準拠
      password: 'admin123',             // SSOT準拠
      tenantId: 'default',              // SSOT準拠
    })
    .expect(200);

  // セッションCookie取得
  const setCookieHeader = loginResponse.headers['set-cookie'];
  if (setCookieHeader && setCookieHeader.length > 0) {
    const sessionCookie = setCookieHeader.find((cookie: string) => 
      cookie.startsWith('hotel_session=')
    );
    testSessionCookie = sessionCookie || '';
  }

  // レスポンスから情報取得
  testTenantId = loginResponse.body.data.tenantId;
  testUserId = loginResponse.body.data.user.id;

  console.log('✅ 実認証テストセッション取得完了');
  console.log('  Tenant ID:', testTenantId);
  console.log('  User ID:', testUserId);
});
```

---

## 📝 テストファイル修正手順

### Step 1: 不要な初期化処理を削除

```typescript
// ❌ 削除: テストユーザーの手動作成
await prisma.staff.upsert({ ... });

// ❌ 削除: テストテナントの手動作成
await prisma.tenant.upsert({ ... });

// ✅ 理由: SSOT記載のアカウント/テナントが既に存在
```

### Step 2: ログイン処理を追加

```typescript
// ✅ 追加: 実際のログインAPIでセッション取得
const loginResponse = await request(API_BASE_URL)
  .post('/api/v1/auth/admin/login')
  .send({
    email: 'admin@omotenasuai.com',
    password: 'admin123',
    tenantId: 'default',
  });
```

### Step 3: 全テストケースにセッションCookie付与

```typescript
// ✅ 修正: すべてのAPIリクエストにCookieを付与
const response = await request(API_BASE_URL)
  .get('/api/v1/admin/roles')
  .set('Cookie', testSessionCookie)  // ← 追加
  .expect(200);
```

---

## 🚨 注意事項

### 絶対禁止

1. ❌ **認証モックの使用**
   ```typescript
   // ❌ 禁止
   jest.mock('../../../middleware/auth', () => ({ ... }));
   ```

2. ❌ **独自のテストアカウント作成**
   ```typescript
   // ❌ 禁止
   await prisma.staff.create({
     email: 'my-test@example.com',  // 独自アカウント
     password: 'test123',
   });
   ```

3. ❌ **テナントIDのハードコード**
   ```typescript
   // ❌ 禁止
   const tenantId = 'my-test-tenant';  // 独自テナント
   ```

### 推奨事項

1. ✅ **SSOTアカウントのみ使用**
   - `admin@omotenasuai.com` / `admin123`

2. ✅ **セッションの再利用**
   - `beforeAll`で一度取得したセッションを全テストで使用

3. ✅ **エラーハンドリング**
   ```typescript
   if (!testSessionCookie) {
     throw new Error('セッション取得に失敗しました');
   }
   ```

---

## 🔄 テスト実行コマンド

### 全テスト実行（セッション付き）

```bash
cd /Users/kaneko/hotel-common

# Step 1: hotel-common起動確認
curl -f http://localhost:3400/api/health || npm run dev &

# Step 2: テスト実行
npm test
```

### 特定のテストのみ実行

```bash
# 役職APIテストのみ
npm test -- src/routes/api/v1/admin/__tests__/roles.api.test.ts

# permission.service.testのみ
npm test -- src/services/__tests__/permission.service.test.ts
```

---

## 📊 期待される改善結果

| 項目 | 修正前 | 修正後 | 改善 |
|------|--------|--------|------|
| **認証方式** | モック | 実認証 | ✅ 本番同等 |
| **テストアカウント** | 各テスト独自 | SSOT統一 | ✅ 統一性 |
| **セッション管理** | 簡易版 | Redis実装 | ✅ 信頼性 |
| **API疎通** | 401エラー | 正常動作 | ✅ 成功率向上 |

---

## 🛠️ トラブルシューティング

### 問題1: ログインAPIが401エラー

**原因**: テストアカウントがDBに存在しない

**対応策**:
```bash
# テストアカウント確認
psql -d hotel_unified_db -c "
SELECT * FROM staff 
WHERE email = 'admin@omotenasuai.com';
"

# 存在しない場合はシードデータ投入
cd /Users/kaneko/hotel-common
npm run seed:tenants
```

### 問題2: セッションCookieが取得できない

**原因**: レスポンスヘッダーの解析ミス

**対応策**:
```typescript
// デバッグ: レスポンスヘッダーを確認
console.log('Set-Cookie:', loginResponse.headers['set-cookie']);

// Cookieの抽出方法を確認
const setCookieHeader = loginResponse.headers['set-cookie'];
if (Array.isArray(setCookieHeader)) {
  const sessionCookie = setCookieHeader.find(cookie => 
    cookie.startsWith('hotel_session=')
  );
  console.log('Session Cookie:', sessionCookie);
}
```

### 問題3: テスト実行時に認証エラー

**原因**: セッションCookieの形式が間違っている

**対応策**:
```typescript
// Cookieの形式を確認
// 正しい形式: hotel_session=xxxxx; Path=/; HttpOnly
console.log('Cookie format:', testSessionCookie);

// 必要に応じてCookie文字列を加工
const cookieValue = testSessionCookie.split(';')[0]; // hotel_session=xxxxx のみ抽出
```

---

## 📝 チェックリスト

### 実装前

- [ ] PostgreSQLが起動していることを確認
- [ ] Redisが起動していることを確認
- [ ] hotel-commonが起動していることを確認
- [ ] テストアカウント（`admin@omotenasuai.com`）が存在することを確認

### 実装中

- [ ] 認証モックを削除
- [ ] 独自のテストアカウント作成を削除
- [ ] `beforeAll`でログインAPIを呼び出し
- [ ] セッションCookieを取得
- [ ] 全テストケースにCookieを付与

### 実装後

- [ ] テストが正常に実行されることを確認
- [ ] 401エラーが発生しないことを確認
- [ ] セッションが正しく取得できていることを確認（ログ出力）

---

## 🎯 まとめ

### キーポイント

1. **認証モックは使用しない** - 実際のログインフローを使用
2. **SSOTアカウントのみ使用** - `admin@omotenasuai.com` / `admin123`
3. **セッションの再利用** - `beforeAll`で一度取得
4. **全APIリクエストにCookie付与** - `.set('Cookie', testSessionCookie)`

### 次のステップ

1. ✅ `roles.api.test.ts`を修正
2. ✅ 他のAPIテストファイルも同様に修正
3. ✅ テスト実行して動作確認
4. ✅ カバレッジ向上

---

**作成日**: 2025年10月22日  
**参照SSOT**: `SSOT_TEST_ENVIRONMENT.md`  
**バージョン**: 1.0.0

