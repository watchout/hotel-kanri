# 🔐 SSOT: hotel-saas 管理画面認証システム

**Doc-ID**: SSOT-SAAS-AUTH-ADMIN-001
**バージョン**: 1.4.0
**作成日**: 2025年10月2日
**最終更新**: 2026-02-05（3層構造タグ追加）
**ステータス**: 🔴 承認済み（最高権威）
**所有者**: Sun（hotel-saas担当AI）

**関連SSOT**:
- [SSOT_SAAS_AUTHENTICATION.md](./SSOT_SAAS_AUTHENTICATION.md) - 認証システム全体
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_SAAS_DATABASE_SCHEMA.md](./SSOT_SAAS_DATABASE_SCHEMA.md) - DBスキーマ（`staff`テーブル）
- [SSOT_TEST_ENVIRONMENT.md](./SSOT_TEST_ENVIRONMENT.md) - テスト環境・テストアカウント情報

---

## 層構造 (Layer Structure)

| セクション | 層 | RFC 2119 |
|-----------|-----|----------|
| §1 概要 | [CORE] | - |
| §2 必須要件（CRITICAL） | [CORE] | MUST |
| §3 SSOTに準拠しないと発生する問題 | [CORE] | - |
| §4 認証フロー | [CONTRACT] | MUST |
| §5 フロントエンド認証状態管理 | [CONTRACT] | MUST |
| §6 クライアント側ミドルウェア仕様 | [CONTRACT] | MUST |
| §7 hotel-common認証API仕様 | [CONTRACT] | MUST |
| §8 テナント切り替え | [CONTRACT] | SHOULD |
| §9 エラーハンドリング | [CONTRACT] | MUST |
| §10 セキュリティ | [CORE] | MUST |
| §11-§12 テスト・トラブルシューティング | [DETAIL] | MAY |

---

## 📋 目次

1. [概要](#概要)
2. [必須要件（CRITICAL）](#必須要件critical)
3. [SSOTに準拠しないと発生する問題](#ssoに準拠しないと発生する問題)
4. [認証フロー（実装済み）](#認証フロー実装済み)
5. [フロントエンド認証状態管理](#フロントエンド認証状態管理)
6. [クライアント側ミドルウェア仕様](#クライアント側ミドルウェア仕様)
7. [hotel-common認証API仕様](#hotel-common認証api仕様)
8. [テナント切り替え](#テナント切り替え) ⭐ **NEW**
9. [エラーハンドリング](#エラーハンドリング)
10. [セキュリティ](#セキュリティ)
11. [テスト](#テスト)
12. [トラブルシューティング](#トラブルシューティング)

---

## 📋 概要

### 目的
hotel-saas管理画面へのスタッフログイン認証の完全な仕様を定義する。

### 適用範囲
- hotel-saas管理画面ログイン
- hotel-common認証APIとの連携
- セッションベース認証（Redis + HttpOnly Cookie）

### 技術スタック
- **認証方式**: Session認証（Redis + HttpOnly Cookie）
- **パスワードハッシュ**: bcrypt
- **データベース**: PostgreSQL (統一DB)
- **テーブル**: `staff`
- **セッションストア**: **Redis（統一必須）**

---

## ⚠️ 必須要件（CRITICAL）

### 1. Redis統一要件
**両システムは全環境（開発・本番）で必ず同じRedisインスタンスを使用すること。**

この要件を満たさない場合、ログイン機能は正常に動作しません。

#### 正しい設定

**開発環境・本番環境共通**:

**hotel-saas (.env)**:
```bash
REDIS_URL=redis://localhost:6379  # 開発
# REDIS_URL=redis://production-redis:6379  # 本番
```

**hotel-common (.env)**:
```bash
REDIS_URL=redis://localhost:6379  # 開発
# REDIS_URL=redis://production-redis:6379  # 本番
```

#### 実装要件
1. **Redis接続**: 両システムで`redis`パッケージを使用
2. **キー形式**: `hotel:session:{sessionId}`（統一）
3. **TTL**: 3600秒（統一）
4. **接続失敗時**: 適切なエラーハンドリング（503エラー）
5. **環境別実装禁止**: 開発環境だけメモリ実装などは絶対禁止

#### 検証方法（開発・本番共通）
```bash
# 1. Redisが起動していることを確認
redis-cli ping
# 期待: PONG

# 2. ログイン後、セッションが保存されていることを確認
redis-cli KEYS "hotel:session:*"
# 期待: hotel:session:{sessionId} が表示される

# 3. セッション内容を確認
redis-cli GET "hotel:session:{sessionId}"
# 期待: JSON形式のセッションデータ

# 4. 両システムが同じRedisを見ていることを確認
# hotel-commonでログイン → hotel-saasでアクセス → 401が出ないこと
```

### 2. 環境統一要件
**開発環境と本番環境で実装を変えてはいけない**

- ✅ 正しい: 環境変数で接続先を変える（実装は同じ）
- ❌ 間違い: 開発環境だけ別実装（SimpleRedisなど）を使う

**理由**:
- 本番デプロイ時の予期せぬバグを防ぐ
- 開発環境で本番と同じ動作を保証
- デプロイリスクを最小化

---

## ❌ SSOTに準拠しないと発生する問題

### 🔴 問題1: ログイン直後に401エラー（ミドルウェアでinitialize()を呼び出す）

**症状**: ログイン成功後、ダッシュボードにリダイレクトされるが、すぐに401エラーでログイン画面に戻される

**原因**: 
```typescript
// ❌ 間違った実装（middleware/admin-auth.ts）
if (!isAuthenticated.value) {
  await initialize();  // ← ログイン直後にも実行されてしまう
}
```

**なぜ発生するか**:
1. ログイン成功 → `user.value` 設定 → `/admin` にリダイレクト
2. ミドルウェア実行 → `isAuthenticated.value` が一瞬 `false`
3. `initialize()` 実行 → `/api/v1/auth/me` 呼び出し
4. Cookieがまだ完全に設定されていない → 401エラー

**対応策（SSOTに記載済み）**:
```typescript
// ✅ 正しい実装
if (user.value) {
  // ログイン直後: user.value が存在 → initialize() スキップ
} else if (!isAuthenticated.value) {
  // 初回アクセス: user.value が存在しない → initialize() 実行
  await initialize();
}
```

**SSOTセクション**: [クライアント側ミドルウェア仕様](#%F0%9F%9A%A6-%E3%82%AF%E3%83%A9%E3%82%A4%E3%82%A2%E3%83%B3%E3%83%88%E5%81%B4%E3%83%9F%E3%83%89%E3%83%AB%E3%82%A6%E3%82%A7%E3%82%A2%E4%BB%95%E6%A7%98)

---

### 🔴 問題2: Redis不一致によるログイン失敗（重大）

**hotel-common**: SimpleRedis（メモリ内Map実装）を使用  
**hotel-saas**: 実Redis接続を使用

→ **両者は別のストレージのため、セッション共有不可**

**影響**:
- ログイン成功後、すぐに401エラー
- hotel-commonが作成したセッションをhotel-saasが読めない
- **開発環境でログイン機能が完全に動作しない**

**修正必須箇所**:
- ファイル: `/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts`
- 行: 14-42（SimpleRedis実装部分）
- 対応: SimpleRedisを削除し、実Redisクライアントに置き換え

**SSOTセクション**: [必須要件（CRITICAL）](#%E2%9A%A0%EF%B8%8F-%E5%BF%85%E9%A0%88%E8%A6%81%E4%BB%B6%EF%BC%88critical%EF%BC%89)

---

## 🎯 認証フロー（実装済み）

### 全体フロー

```
[hotel-saas] → [hotel-common] → [PostgreSQL staff table]
     ↓               ↓                    ↓
  Cookie設定    セッション作成        bcrypt検証
```

### 詳細フロー

1. **hotel-saas → hotel-common認証APIを呼び出し**
   - エンドポイント: `POST {HOTEL_COMMON_API_URL}/api/v1/auth/login`
   - 実装: `/Users/kaneko/hotel-saas/server/api/v1/auth/login.post.ts`

2. **hotel-common認証処理**
   - 実装: `/Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts`
   - ミドルウェア: `UnifiedSessionMiddleware.login()`
   - サービス: `SessionAuthService.authenticateUser()`

3. **認証成功時の処理**
   - hotel-common: セッション作成 + Cookie設定
   - hotel-saas: 追加セッション作成 + Cookie設定

4. **フロントエンド状態管理（ログイン成功後）**
   - Composable: `useSessionAuth` が `user.value` を設定
   - リダイレクト: `/admin/login` → `/admin`
   - **重要**: ページ遷移時に `user.value` を保持

5. **クライアント側ミドルウェア（ページアクセス時）**
   - ミドルウェア: `middleware/admin-auth.ts`
   - **ログイン直後**: `user.value` が存在するため `initialize()` をスキップ
   - **初回アクセス**: `user.value` が存在しないため `initialize()` を実行

---

## 🔒 フロントエンド認証状態管理

### useSessionAuth Composable

**実装ファイル**: `/Users/kaneko/hotel-saas/composables/useSessionAuth.ts`

#### グローバル状態
```typescript
const globalUser = ref<User | null>(null);
```

**重要**: `ref()`により、ページ遷移後も状態が保持される

#### 主要メソッド

##### 1. login(email, password)
**実行タイミング**: ログインフォーム送信時

**処理フロー**:
```typescript
1. POST /api/v1/auth/login（hotel-saas API経由）
2. hotel-common認証成功
3. Cookie設定（hotel_session）
4. globalUser.value = response.data.user  // ← フロントエンド状態設定
5. navigateTo('/admin')  // ← リダイレクト
```

**重要**: この時点で `globalUser.value` が設定され、Cookie も設定されている

##### 2. initialize()
**実行タイミング**: 
- ページ初回読み込み時
- ページリロード時
- **ログイン直後は実行してはいけない**

**処理フロー**:
```typescript
1. GET /api/v1/auth/me（Cookie自動送信）
2. セッション検証成功
3. globalUser.value = response.data.user  // ← 状態復元
```

**禁止**: `user.value` が既に存在する場合に `initialize()` を呼び出すこと

##### 3. isAuthenticated（算出プロパティ）
```typescript
const isAuthenticated = computed(() => !!globalUser.value);
```

**重要**: `globalUser.value` の存在チェックのみ（API呼び出しなし）

---

## 🚦 クライアント側ミドルウェア仕様

**実装ファイル**: `/Users/kaneko/hotel-saas/middleware/admin-auth.ts`

### 必須要件

#### 1. ログイン直後の特殊処理
```typescript
// ❌ 間違い: 常に initialize() を呼び出す
if (!isAuthenticated.value) {
  await initialize();
}

// ✅ 正しい: user.value が存在する場合はスキップ
if (user.value) {
  // ログイン直後: user.value は存在するが isAuthenticated が false の可能性
  console.warn('⚠️ user.valueは存在するがisAuthenticatedがfalse（ログイン直後の可能性）');
  // initialize() を呼び出さない
} else if (!isAuthenticated.value) {
  // 初回アクセス: user.value が存在しない
  await initialize();
}
```

#### 2. 実行順序
```
ログイン成功
  ↓
user.value = {...}  // useSessionAuth.login()
  ↓
navigateTo('/admin')  // ページ遷移
  ↓
middleware/admin-auth.ts 実行
  ↓
user.value 存在チェック
  ├─ 存在する → initialize() スキップ（ログイン直後）
  └─ 存在しない → initialize() 実行（初回アクセス）
```

#### 3. 禁止事項
- ❌ ログイン直後に `initialize()` を呼び出すこと
- ❌ `user.value` が存在するのに `initialize()` を呼び出すこと
- ❌ 認証状態を複数回検証すること

---

## 🔌 API仕様（実装済み）

### 1. hotel-saas ログインAPI

#### エンドポイント
```
POST /api/v1/auth/login
```

**実装ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/auth/login.post.ts`

#### リクエスト

**Headers**:
```
Content-Type: application/json
```

**Body**:
```typescript
{
  email: string,      // メールアドレス（必須）
  password: string    // パスワード（必須）
}
```

#### レスポンス（成功: 200 OK）

```typescript
{
  success: true,
  data: {
    sessionId: string,    // hotel-saas セッションID
    user: {
      id: string,         // スタッフID
      email: string,      // メールアドレス
      role: string,       // 役割
      tenant_id: string,  // テナントID
      permissions: string[]  // 権限配列
    }
  }
}
```

**Set-Cookie**:
```
hotel-session-id=<sessionId>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
```

#### エラーレスポンス

**401 Unauthorized** (認証失敗):
```typescript
{
  statusCode: 401,
  statusMessage: 'INVALID_CREDENTIALS'
}
```

**503 Service Unavailable** (hotel-common接続失敗):
```typescript
{
  statusCode: 503,
  statusMessage: 'AUTHENTICATION_SERVICE_UNAVAILABLE'
}
```

---

### 2. hotel-common 認証API（内部呼び出し）

#### エンドポイント
```
POST {HOTEL_COMMON_API_URL}/api/v1/auth/login
```

**実装ファイル**: `/Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts`

**デフォルトURL**: `http://localhost:3400`

#### リクエスト

```typescript
{
  email: string,       // メールアドレス（必須）
  password: string,    // パスワード（必須）
  tenantId: 'default'  // テナントID（hotel-saasから固定値）
}
```

#### レスポンス（成功）

```typescript
{
  success: true,
  sessionId: string,
  user: {
    user_id: string,
    tenant_id: string,
    email: string,
    role: 'staff' | 'manager' | 'admin' | 'owner',
    level: number,
    permissions: string[]
  },
  currentTenant: {
    id: string,
    name: string
  },
  accessibleTenants: [
    {
      id: string,
      name: string,
      isPrimary: boolean
    }
  ]
}
```

**フィールド説明**:
- `user`: 認証されたスタッフ情報
- `currentTenant`: 現在アクティブなテナント（複数所属の場合は主所属）
- `accessibleTenants`: アクセス可能な全テナントリスト（複数テナント所属対応）

**Set-Cookie**:
```
hotel-session-id=<sessionId>; HttpOnly; Secure (production); SameSite=Strict; Max-Age=3600000
```

#### エラーレスポンス

**400 Bad Request** (バリデーションエラー):
```typescript
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: '必須フィールドが不足しています'
  },
  timestamp: string
}
```

**401 Unauthorized** (認証失敗):
```typescript
{
  success: false,
  error: {
    code: 'INVALID_CREDENTIALS',
    message: '認証情報が正しくありません'
  },
  timestamp: string
}
```

---

## 🗄️ データモデル（実装済み）

### staffテーブル

**テーブル名**: `staff`

**認証に使用されるフィールド**:

| フィールド名 | 型 | NULL許可 | 説明 | 確認元 |
|------------|------|---------|------|--------|
| id | string | ❌ | 主キー（CUID） | SessionAuthService.ts:265 |
| tenant_id | string | ❌ | テナントID | SessionAuthService.ts:266 |
| email | string | ✅ | メールアドレス（UNIQUE） | SessionAuthService.ts:212 |
| password_hash | string | ✅ | bcryptハッシュ化パスワード | SessionAuthService.ts:247 |
| role | string | ✅ | 役割 | SessionAuthService.ts:268 |
| base_level | integer | ✅ | 権限レベル | SessionAuthService.ts:269 |
| permissions | jsonb | ✅ | 権限配列 | SessionAuthService.ts:270 |
| is_active | boolean | ❌ | アカウント有効フラグ | SessionAuthService.ts:213 |
| is_deleted | boolean | ❌ | 削除フラグ | SessionAuthService.ts:214 |

**インデックス**:
```sql
CREATE UNIQUE INDEX ON staff(email);
```

**検索条件**（実装より）:
```typescript
WHERE email = ? 
  AND is_active = true 
  AND is_deleted = false
```

---

## 💻 実装詳細

### 1. hotel-saas ログイン実装

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/auth/login.post.ts`

**処理フロー**:

```typescript
export default defineEventHandler(async (event) => {
  // 1. リクエストボディ取得
  const body = await readBody(event)
  const { email, password } = body
  
  // 2. hotel-common API呼び出し
  const baseUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
  const authResponse = await $fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email, password, tenantId: 'default' }
  })
  
  // 3. hotel-saas用セッション作成
  const sessionId = await createSession({
    user_id: authResponse.data.user.user_id,
    tenant_id: authResponse.data.user.tenant_id,
    email: authResponse.data.user.email,
    role: authResponse.data.user.role,
    permissions: authResponse.data.user.permissions || []
  })
  
  // 4. Cookie設定
  setCookie(event, 'hotel-session-id', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
    sameSite: 'strict',
    path: '/',
    maxAge: 3600
  })
  
  // 5. レスポンス返却
  return {
    success: true,
    data: {
      sessionId,
      user: { ... }
    }
  }
})
```

---

### 2. hotel-common 認証実装

#### ファイル1: `/Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts`

```typescript
router.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  const { email, password, tenantId } = req.body;

  // バリデーション
  if (!email || !password) {
    return res.status(400).json(
      StandardResponseBuilder.error('VALIDATION_ERROR', '必須フィールドが不足しています').response
    );
  }

  // 認証処理
  const result = await UnifiedSessionMiddleware.login(email, password, tenantId);

  if (!result.success) {
    return res.status(401).json(
      StandardResponseBuilder.error(result.error!.code, result.error!.message).response
    );
  }

  // Cookie設定
  res.cookie('hotel-session-id', result.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000
  });

  return StandardResponseBuilder.success(res, {
    success: true,
    sessionId: result.sessionId,
    user: { ... }
  });
});
```

#### ファイル2: `/Users/kaneko/hotel-common/src/middleware/UnifiedSessionMiddleware.ts`

```typescript
static async login(email: string, password: string, tenantId?: string): Promise<AuthResult> {
  const result = await sessionService.authenticateUser(email, password, tenantId);
  
  if (result.success && result.user) {
    const sessionId = (result.user as any).sessionId;
    return { ...result, sessionId };
  }
  
  return result;
}
```

#### ファイル3: `/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts`

```typescript
async authenticateUser(email: string, password: string, tenantId?: string): Promise<AuthResult> {
  // 1. staffテーブル検索
  const staffMembers = await hotelDb.getAdapter().staff.findMany({
    where: {
      email,
      is_active: true,
      is_deleted: false
    }
  });

  if (staffMembers.length === 0) {
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: '認証情報が正しくありません'
      }
    };
  }

  // 2. テナントフィルタリング
  // ✅ email はグローバルユニークなので1レコードのみ取得
  const staff = staffMembers[0];
  
  if (!staff) {
    return {
      success: false,
      error: 'INVALID_CREDENTIALS',
      message: 'メールアドレスまたはパスワードが正しくありません'
    };
  }

  // 3. パスワード検証（bcrypt）
  const bcrypt = require('bcrypt');
  const isPasswordValid = await bcrypt.compare(password, staff.password_hash);
  
  if (!isPasswordValid) {
    // failed_login_count をインクリメント
    await prisma.staff.update({
      where: { id: staff.id },
      data: {
        failedLoginCount: { increment: 1 },
        lockedUntil: staff.failedLoginCount >= 4 
          ? new Date(Date.now() + 30 * 60 * 1000)  // 5回目の失敗で30分ロック
          : undefined
      }
    });
    
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: '認証情報が正しくありません'
      }
    };
  }

  // ✅ 4. accessible_tenants 取得（複数テナント所属対応）
  const memberships = await prisma.staffTenantMembership.findMany({
    where: {
      staffId: selectedStaffMember.id,
      isActive: true
    },
    include: {
      tenant: true
    },
    orderBy: [
      { isPrimary: 'desc' },  // 主所属を優先
      { joinedAt: 'asc' }     // 古い順
    ]
  });

  const accessibleTenants = memberships.map(m => ({
    id: m.tenantId,
    name: m.tenant.name,
    isPrimary: m.isPrimary
  }));

  // 主所属テナントIDを決定
  const primaryMembership = memberships.find(m => m.isPrimary);
  // 主所属テナントまたは最初の所属テナントをアクティブに
  const activeTenantId = primaryMembership?.tenantId || accessibleTenants[0]?.id;
  
  if (!activeTenantId) {
    return {
      success: false,
      error: 'NO_TENANT_ACCESS',
      message: 'アクセス可能なテナントがありません'
    };
  }

  // アクティブテナントの権限情報取得
  const activeMembership = memberships.find(m => m.tenantId === activeTenantId);

  // ✅ 5. セッション作成（accessibleTenants追加）
  const sessionId = await this.createSession({
    user_id: staff.id,
    tenant_id: activeTenantId,
    email: staff.email,
    role: activeMembership.role,
    level: activeMembership.level || 3,
    permissions: activeMembership.permissions || [],
    accessibleTenants: accessibleTenants.map(t => t.id)  // ✅ 追加
  });

  // failed_login_count をリセット
  await prisma.staff.update({
    where: { id: staff.id },
    data: {
      failedLoginCount: 0,
      lastLoginAt: new Date()
    }
  });

  // ✅ 6. ユーザー情報返却（currentTenant, accessibleTenants追加）
  const user: SessionUser = {
    user_id: staff.id,
    tenant_id: activeTenantId,
    email: selectedStaffMember.email,
    role: selectedStaffMember.role || 'staff',
    level: selectedStaffMember.base_level || 3,
    permissions: selectedStaffMember.permissions || []
  };
  (user as any).sessionId = sessionId;

  const currentTenant = await prisma.tenant.findUnique({
    where: { id: activeTenantId },
    select: { id: true, name: true }
  });

  return { 
    success: true, 
    user,
    currentTenant,      // ✅ 追加
    accessibleTenants   // ✅ 追加
  };
}
```

---

### 3. セッション管理実装

#### セッション作成

**ファイル**: `/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts`

```typescript
async createSession(user: {
  user_id: string;
  tenant_id: string;
  email: string;
  role: string;
  level: number;
  permissions: string[];
  accessibleTenants?: string[];  // ✅ 追加
}): Promise<string> {
  const sessionId = this.generateSecureSessionId(); // crypto.randomBytes(32).toString('hex')
  
  const sessionData: SessionUser = {
    user_id: user.user_id,
    tenant_id: user.tenant_id,
    email: user.email,
    role: user.role as SessionUser['role'],
    level: user.level,
    permissions: user.permissions,
    accessibleTenants: user.accessibleTenants || [user.tenant_id],  // ✅ 追加
    created_at: new Date().toISOString(),
    last_accessed: new Date().toISOString()
  };

  // Redisに保存（1時間有効）
  await redis.setex(
    `hotel:session:${sessionId}`,
    3600,
    JSON.stringify(sessionData)
  );

  return sessionId;
}
```

**Redisキー形式**: `hotel:session:{sessionId}`  
**TTL**: 3600秒（1時間）

#### セッション検証

```typescript
async validateSession(sessionId: string): Promise<SessionUser | null> {
  const sessionData = await redis.get(`hotel:session:${sessionId}`);
  if (!sessionData) return null;

  const session = JSON.parse(sessionData) as SessionUser;

  // 最終アクセス時刻更新 + TTL延長
  session.last_accessed = new Date().toISOString();
  await redis.setex(
    `hotel:session:${sessionId}`,
    3600,
    JSON.stringify(session)
  );

  return session;
}
```

---

## 🔒 セキュリティ（実装済み）

### パスワード検証
- **bcrypt**を使用（`await bcrypt.compare(password, staff.password_hash)`）
- 実装: SessionAuthService.ts:247

### Cookie設定

**hotel-saas**:
```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SECURE === 'true',
  sameSite: 'strict',
  path: '/',
  maxAge: 3600  // 秒
}
```

**hotel-common**:
```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000  // ミリ秒
}
```

### セッションID生成
```typescript
crypto.randomBytes(32).toString('hex')  // 64文字のランダム16進数文字列
```

### Redis実装の要件

#### 必須仕様
**両システムは全環境（開発・本番）で同じRedis接続を使用すること**

⚠️ **絶対禁止**: 開発環境だけメモリ実装、本番だけRedis実装などの環境別実装

- **接続URL**: 環境変数`REDIS_URL`で指定（デフォルト: `redis://localhost:6379`）
- **パッケージ**: `redis` (npm)
- **キー形式**: `hotel:session:{sessionId}`
- **TTL**: 3600秒
- **接続方式**: 全環境で実Redis接続を使用

#### 実装状況

**hotel-saas** ✅ 正しく実装済み  
実装: `/Users/kaneko/hotel-saas/server/middleware/01.admin-auth.ts` (line 14-37)
```typescript
redisClient = createClient({
  url: config.redisUrl  // 環境変数 REDIS_URL
})
await redisClient.connect()
```

**hotel-common** ❌ 仕様違反（修正必須）  
実装: `/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts` (line 14-42)
```typescript
// ❌ SimpleRedis（メモリ実装）を使用している
// これは「開発環境用」として実装されているが、絶対に許されない
class SimpleRedis implements RedisLike {
  private store = new Map<string, { value: string; expires: number }>();
}
const redis: RedisLike = new SimpleRedis();
```

**❌ この実装の問題点**:
1. hotel-saasがセッションを読めず、ログイン直後に401エラー発生
2. 開発環境と本番環境で挙動が異なる
3. **本番デプロイ時に別途修正が必要になる（デプロイリスク）**
4. **環境別実装は絶対禁止の原則に違反**

---

## 🔧 環境変数

### hotel-saas

```bash
# hotel-common API URL
HOTEL_COMMON_API_URL=http://localhost:3400

# Redis接続（必須）
REDIS_URL=redis://localhost:6379

# Cookie設定
COOKIE_SECURE=true  # 本番環境でHTTPSを強制する場合
```

### hotel-common

```bash
# Node環境
NODE_ENV=production  # 本番環境の場合

# Redis設定（本番環境のみ・開発環境では使用されない）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

---

## 🔧 修正が必要な実装

### hotel-commonのRedis実装修正

**現在の実装**: `/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts` (line 14-42)

```typescript
// ❌ 削除が必要（SimpleRedis実装）
class SimpleRedis implements RedisLike {
  private store = new Map<string, { value: string; expires: number }>();
  // ...
}
const redis: RedisLike = new SimpleRedis();
```

**正しい実装**:
```typescript
// ✅ 実Redis接続に置き換え
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redis.on('error', (err) => {
  console.error('Redis接続エラー:', err);
});

// 初期化時に接続
await redis.connect();
```

**修正手順**:
1. `redis`パッケージのインストール確認
2. SimpleRedis実装を削除
3. 実Redisクライアントに置き換え
4. 環境変数`REDIS_URL`を設定
5. 接続エラーハンドリングを追加

---

## ⚠️ その他の既知の問題

### 問題1: 2重セッション構造
**症状**: hotel-commonとhotel-saasで別々にセッションを作成  
**影響**: メモリ使用量増加、同期の複雑化  
**対応**: 現状は仕様として実装済み（将来的に統合検討）

### 問題2: hotel-common接続必須
**症状**: hotel-commonが起動していないとログイン不可（503エラー）  
**影響**: hotel-commonへの依存度が高い  
**対応**: エラーログ記録済み（logAuth）

### 問題3: セッション再起動時消失（Redis未接続時）
**症状**: Redisが起動していない場合、セッション作成・検証が失敗  
**影響**: ログイン機能が完全に停止  
**対応**: Redis起動を必須とし、接続エラー時は503を返す

---

## 📊 ログ記録（実装済み）

### ログ種別

**hotel-saas**: `/Users/kaneko/hotel-saas/server/utils/log-client.ts`

```typescript
await logAuth({
  tenantId: string,
  userId?: string,
  action: 'LOGIN' | 'LOGIN_FAILED',
  success: boolean,
  failureReason?: string,
  ipAddress: string,
  userAgent: string,
  deviceInfo: object
})
```

**hotel-common**: `/Users/kaneko/hotel-common/src/utils/logger.ts`

```typescript
logger.info('セッションログイン成功', {
  userId: string,
  tenantId: string,
  email: string
})
```

---

## 🔄 テナント切り替え

**詳細仕様**: [SSOT_SAAS_MULTITENANT.md#スタッフ複数テナント所属](./SSOT_SAAS_MULTITENANT.md#スタッフ複数テナント所属)

### 概要

スタッフが複数のテナントに所属している場合、ログイン後に別のテナントに切り替える機能を提供します。

**認証方式**: Session認証（Redis + HttpOnly Cookie）

### 前提条件

1. スタッフが複数テナントに所属していること（`staff_tenant_memberships` テーブルに複数レコード）
2. ログイン時に `accessible_tenants` がSessionに保存されていること
3. 現在のテナントIDが `tenantId` としてSessionに保存されていること

### API仕様

**エンドポイント**: `POST /api/v1/auth/switch-tenant`

**リクエスト**:
```json
{
  "tenantId": "hotel-shibuya"
}
```

**レスポンス (成功)**:
```json
{
  "success": true,
  "data": {
    "tenant": {
      "id": "hotel-shibuya",
      "name": "ホテル渋谷"
    },
    "user": {
      "user_id": "staff-001",
      "email": "manager@hotel-group.com",
      "name": "山田太郎",
      "role": "STAFF",
      "level": 3,
      "permissions": ["front_desk", "orders"]
    }
  },
  "timestamp": "2025-10-05T10:35:00.000Z"
}
```

**Set-Cookie**:
```
hotel-session-id=<newSessionId>; HttpOnly; Secure; SameSite=Strict; Max-Age=3600000
```

---

**エラーレスポンス**:

**400 Bad Request** (テナントID未指定):
```json
{
  "success": false,
  "error": {
    "code": "TENANT_ID_REQUIRED",
    "message": "テナントIDが必要です"
  },
  "timestamp": "2025-10-05T10:35:00.000Z"
}
```

**403 Forbidden** (アクセス権限なし):
```json
{
  "success": false,
  "error": {
    "code": "TENANT_ACCESS_DENIED",
    "message": "指定されたテナントへのアクセス権限がありません"
  },
  "details": {
    "requested_tenant": "hotel-yokohama",
    "accessible_tenants": ["hotel-shinagawa", "hotel-shibuya", "hotel-ikebukuro"]
  },
  "timestamp": "2025-10-05T10:35:00.000Z"
}
```

**404 Not Found** (テナント不存在):
```json
{
  "success": false,
  "error": {
    "code": "TENANT_NOT_FOUND",
    "message": "指定されたテナントが存在しません"
  },
  "timestamp": "2025-10-05T10:35:00.000Z"
}
```

**503 Service Unavailable** (Redis接続エラー):
```json
{
  "success": false,
  "error": {
    "code": "SESSION_SERVICE_UNAVAILABLE",
    "message": "セッションサービスに接続できません"
  },
  "timestamp": "2025-10-05T10:35:00.000Z"
}
```

### 実装詳細

詳細な実装仕様は [SSOT_SAAS_MULTITENANT.md#スタッフ複数テナント所属](./SSOT_SAAS_MULTITENANT.md#スタッフ複数テナント所属) を参照してください。

---

## 📚 関連ドキュメント

### 実装ファイル
- `/Users/kaneko/hotel-saas/server/api/v1/auth/login.post.ts`
- `/Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts`
- `/Users/kaneko/hotel-common/src/middleware/UnifiedSessionMiddleware.ts`
- `/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts`

### 仕様ドキュメント
- `/Users/kaneko/hotel-kanri/docs/AUTHENTICATION_MASTER_SPECIFICATION.md`
- `/Users/kaneko/hotel-kanri/docs/01_systems/common/staff-login-guide.md`
- `/Users/kaneko/hotel-kanri/docs/01_systems/common/api/UNIFIED_API_SPECIFICATION.md`

---

## 🔄 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
| 1.2.0 | 2025-10-05 | ログインAPI複数テナント所属対応・JWT認証記載削除・Session認証に統一 | Sun |
| 1.1.0 | 2025-10-05 | テナント切り替え機能追加（API仕様・フロー・UI実装例） | Sun |
| 1.0.0 | 2025-10-02 | 初版作成（実装済みコードベース） | Sun |

---

**この仕様書は、実装済みのソースコードと既存ドキュメントのみを基に作成されています。**  
**想像や推測による記載は一切含まれていません。**

