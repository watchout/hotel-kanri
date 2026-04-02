# 🔐 SSOT: hotel-kanri 認証システム統合仕様

**Doc-ID**: SSOT-FOUNDATION-AUTH-001  
**バージョン**: 1.0.0  
**作成日**: 2025年10月2日  
**最終更新**: 2025年10月2日  
**ステータス**: 🔴 承認済み（最高権威）  
**所有者**: Iza（hotel-common統合管理者）

**関連SSOT**:
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](./SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証（子SSOT）
- [SSOT_SAAS_DEVICE_AUTHENTICATION.md](./SSOT_SAAS_DEVICE_AUTHENTICATION.md) - 客室端末認証（子SSOT・未作成）
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤（未作成）
- [AUTHENTICATION_MASTER_SPECIFICATION.md](/Users/kaneko/hotel-kanri/docs/AUTHENTICATION_MASTER_SPECIFICATION.md) - 旧仕様書（参考）

---

## 📋 概要

### 目的
hotel-kanriプロジェクト全体の認証システムの**唯一の真実の情報源**を定義する。

### 適用範囲
- **hotel-saas**: 管理画面認証 + 客室端末認証
- **hotel-pms**: PMSスタッフ認証（未実装）
- **hotel-member**: 会員認証（未実装）
- **hotel-common**: 認証API基盤（全システム共通）

### 技術スタック
- **認証方式**: Session認証（Redis + HttpOnly Cookie）
- **パスワードハッシュ**: bcrypt
- **データベース**: PostgreSQL（統一DB）
- **セッションストア**: Redis（統一必須）
- **Cookie名**: `hotel-session-id`（全システム統一）

### 命名規則統一
- **データベース**: `snake_case` (例: `user_id`, `tenant_id`, `created_at`)
- **API/JSON**: `camelCase` (例: `userId`, `tenantId`, `createdAt`)
- **変数名**: `camelCase` (JavaScript/TypeScript標準)

**重要**: 同じ概念は必ず同じ名称を使用
- ユーザーID: DB=`user_id`, API/JSON=`userId`, Redis=`user_id`
- テナントID: DB=`tenant_id`, API/JSON=`tenantId`, Redis=`tenant_id`
- セッションID: Cookie=`hotel-session-id`, Redis Key=`hotel:session:{sessionId}`

---

## ⚠️ 必須要件（CRITICAL）

### 1. Redis統一要件
**全システムは全環境（開発・本番）で必ず同じRedisインスタンスを使用すること。**

この要件を満たさない場合、認証機能は正常に動作しません。

#### 正しい設定（開発・本番共通）

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

**hotel-pms (.env)** (未実装):
```bash
REDIS_URL=redis://localhost:6379  # 開発
# REDIS_URL=redis://production-redis:6379  # 本番
```

**hotel-member (.env)** (未実装):
```bash
REDIS_URL=redis://localhost:6379  # 開発
# REDIS_URL=redis://production-redis:6379  # 本番
```

#### 実装要件
1. **Redis接続**: 全システムで`redis`パッケージを使用（npm）
2. **キー形式**: `hotel:session:{sessionId}`（統一必須）
3. **TTL**: 3600秒（1時間・統一必須）
4. **接続失敗時**: 適切なエラーハンドリング（503エラー）
5. **環境別実装禁止**: 開発環境だけメモリ実装（SimpleRedis等）は絶対禁止

#### 検証方法（全環境共通）
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

# 4. 全システムが同じRedisを見ていることを確認
# hotel-commonでログイン → hotel-saasでアクセス → 401が出ないこと
```

---

### 2. 環境統一要件
**開発環境と本番環境で実装を変えてはいけない**

- ✅ 正しい: 環境変数で接続先を変える（実装は同じ）
- ❌ 間違い: 開発環境だけ別実装（SimpleRedisなど）を使う

**理由**:
- 本番デプロイ時の予期せぬバグを防ぐ
- 開発環境で本番と同じ動作を保証
- デプロイリスクを最小化

---

### 3. Cookie統一要件
**全システムで同じCookie名・設定を使用すること**

#### Cookie名
```
hotel-session-id
```

#### Cookie設定

**現在の実装状況**:

**hotel-saas** (`/Users/kaneko/hotel-saas/server/api/v1/auth/login.post.ts` line 66-72):
```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 3600  // 秒単位
}
```

**hotel-common** (`/Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts` line 39-44):
```typescript
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000  // ミリ秒単位 ← 🔴 不統一
  // path が抜けている ← 🔴 不統一
}
```

**❌ 問題1**: maxAgeの単位が不統一
- hotel-saas: 3600秒 = 1時間
- hotel-common: 3600000ミリ秒 = 1時間

どちらも1時間だが、**単位が異なる**ため、将来的に値を変更する際に混乱を招く。

**❌ 問題2**: pathが抜けている
- hotel-saas: `path: '/'` あり
- hotel-common: `path` なし（デフォルト値に依存）

**✅ 正しい統一仕様**（修正必須）:

```typescript
{
  httpOnly: true,                    // XSS対策（JavaScript からアクセス不可）
  secure: process.env.NODE_ENV === 'production',  // 本番環境ではHTTPS必須
  sameSite: 'strict',                // CSRF対策
  path: '/',                         // 全パスで有効
  maxAge: 3600                       // 1時間（秒単位で統一）
}
```

**修正必須箇所**:
- `/Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts` (line 39-44)
  - 修正前:
    ```typescript
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600000
    }
    ```
  - 修正後:
    ```typescript
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',     // 追加
      maxAge: 3600   // ミリ秒→秒に変更
    }
    ```

**重要**: 全システムで秒単位に統一してください。
- hotel-saas: 3600（秒）✅ 修正不要
- hotel-common: 3600（秒）🔴 修正必須
- hotel-pms: 3600（秒）未実装
- hotel-member: 3600（秒）未実装

---

## 🔐 認証方式の決定

### ✅ 採用方式: セッション認証
- **技術**: Redis + HttpOnly Cookie
- **理由**: 
  - JWT認証の複雑さを排除（開発効率56時間向上）
  - デバッグ容易性（Redisで直接セッション確認可能）
  - セキュリティのバランス（HttpOnly Cookie）
  - KISS原則の徹底
- **適用**: 全システム統一
- **決定日**: 2025年10月1日

### ❌ 廃止方式: JWT認証
- **廃止日**: 2025年10月1日
- **理由**: 実装複雑化、バグ多発、開発効率低下
- **移行完了**: 2025年10月1日
- **旧実装**: 完全削除済み

---

## 🎯 セッション認証仕様（全システム共通）

### セッション構造（Redis保存形式）

**実装**: `/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts` (line 58-67)

```typescript
interface SessionUser {
  user_id: string          // ユーザーID (UUID)
  tenant_id: string        // テナントID (UUID)
  email: string            // メールアドレス
  role: 'staff' | 'manager' | 'admin' | 'owner'  // 役割
  level: number            // 権限レベル（1-5）
  permissions: string[]    // 権限配列
  accessibleTenants: string[]  // アクセス可能なテナントID配列（複数テナント所属対応）
  created_at: string       // セッション作成時刻（ISO 8601）
  last_accessed: string    // 最終アクセス時刻（ISO 8601）
}
```

**注意**: `name`フィールドは含まれていません。ユーザー名が必要な場合はstaffテーブルから別途取得してください。

**Redisキー形式**:
```
hotel:session:{sessionId}
```

**sessionId生成方法**:
```typescript
crypto.randomBytes(32).toString('hex')  // 64文字のランダム16進数文字列
```

**TTL**: 3600秒（1時間・自動延長）

---

### 認証フロー（全システム共通）

#### 1. ログインフロー

```
[フロントエンド]
  ↓ POST /api/v1/auth/login { email, password }
[システム (saas/pms/member)]
  ↓ POST {HOTEL_COMMON_API_URL}/api/v1/auth/login
[hotel-common]
  ↓ 1. staffテーブルからユーザー検索
  ↓ 2. bcryptでパスワード検証
  ↓ 3. セッションID生成
  ↓ 4. Redisにセッション保存（TTL: 3600秒）
  ↓ 5. レスポンスヘッダーにSet-Cookie
[システム]
  ↓ レスポンスのCookieをブラウザに転送
[フロントエンド]
  ↓ Cookieを自動保存（HttpOnly）
```

#### 実装（hotel-common）

**実装ファイル**: `/Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts` (line 17-72)

**注意**: ログイン処理は`UnifiedSessionMiddleware.login()`を経由します。

```typescript
// POST /api/v1/auth/login
router.post('/api/v1/auth/login', async (req: Request, res: Response) => {
  const { email, password, tenantId } = req.body;

  // UnifiedSessionMiddlewareでログイン処理
  const result = await UnifiedSessionMiddleware.login(email, password, tenantId);

  if (!result.success) {
    return res.status(401).json(
      StandardResponseBuilder.error(result.error!.code, result.error!.message).response
    );
  }

  // セッションIDをCookieに設定
  res.cookie('hotel-session-id', result.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000  // ← 🔴 修正必須: 3600 に変更
  });

  return StandardResponseBuilder.success(res, {
    success: true,
    sessionId: result.sessionId,
    user: {
      user_id: result.user!.user_id,
      tenant_id: result.user!.tenant_id,
      email: result.user!.email,
      role: result.user!.role,
      level: result.user!.level,
      permissions: result.user!.permissions
    }
  });
});
```

**UnifiedSessionMiddleware.login()の内部処理**:
1. staffテーブルからユーザー検索
2. bcryptでパスワード検証
3. SessionAuthService.createSession()でセッション作成
4. セッション情報を返却

**SessionAuthService.createSession()の実装** (`/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts` line 95-134):

```typescript
async createSession(user: {
  user_id: string;
  tenant_id: string;
  email: string;
  role: string;
  level: number;
  permissions: string[];
}): Promise<string> {
  const sessionId = this.generateSecureSessionId();  // crypto.randomBytes(32).toString('hex')
  
  const sessionData: SessionUser = {
    user_id: user.user_id,
    tenant_id: user.tenant_id,
    email: user.email,
    role: user.role as SessionUser['role'],
    level: user.level,
    permissions: user.permissions,
    created_at: new Date().toISOString(),
    last_accessed: new Date().toISOString()
  };

  // Redisに保存（1時間有効）
  await redis.setex(
    `hotel:session:${sessionId}`,
    3600,  // TTL: 1時間
    JSON.stringify(sessionData)
  );

  return sessionId;
}
```

---

#### 2. 認証確認フロー

```
[フロントエンド]
  ↓ GET /api/v1/protected (Cookie: hotel-session-id=xxx)
[システム] ミドルウェア実行
  ↓ 1. Cookieからセッション ID取得
  ↓ 2. Redisからセッション情報取得
  ↓ 3. セッション有効性確認
  ↓ 4. TTL延長（アクティブセッション）
  ↓ 5. event.context.userにユーザー情報設定
[システム] APIハンドラー実行
  ↓ event.context.userを使用して処理
```

#### 実装（全システム共通ミドルウェアパターン）

**hotel-saas**: `/Users/kaneko/hotel-saas/server/middleware/01.admin-auth.ts`  
**hotel-common**: `/Users/kaneko/hotel-common/src/middleware/UnifiedSessionMiddleware.ts`

```typescript
export default defineEventHandler(async (event) => {
  const path = event.node.req.url || '';

  // パブリックパスはスキップ
  if (isPublicPath(path)) return;

  // セッションIDをCookieから取得
  const sessionId = getCookie(event, 'hotel-session-id');

  if (!sessionId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    });
  }

  // Redisからセッション情報を取得
  const redis = await getRedisClient();
  const userDataString = await redis.get(`hotel:session:${sessionId}`);

  if (!userDataString) {
    throw createError({
      statusCode: 401,
      statusMessage: 'セッションが無効です'
    });
  }

  // ユーザー情報をパース
  const sessionData = JSON.parse(userDataString);

  // セッション延長（アクセスがあるたびに1時間延長）
  await redis.expire(`hotel:session:${sessionId}`, 3600);

  // event.context.userに設定
  event.context.user = sessionData;
  event.context.sessionId = sessionId;
});
```

---

#### 3. ログアウトフロー

```
[フロントエンド]
  ↓ POST /api/v1/auth/logout (Cookie: hotel-session-id=xxx)
[システム]
  ↓ POST {HOTEL_COMMON_API_URL}/api/v1/auth/logout
[hotel-common]
  ↓ 1. CookieからセッションID取得
  ↓ 2. Redisからセッション削除
  ↓ 3. レスポンスヘッダーにSet-Cookie（削除指示）
[システム]
  ↓ レスポンスのCookieをブラウザに転送
[フロントエンド]
  ↓ Cookieを削除
```

#### 実装（hotel-common）

**実装ファイル**: `/Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts` (line 78-118)

```typescript
// POST /api/v1/auth/logout
router.post('/api/v1/auth/logout', async (req: Request, res: Response) => {
  const sessionId = req.cookies?.['hotel-session-id'] || 
                   req.headers['x-session-id'] as string;

  if (!sessionId) {
    return res.status(400).json(
      StandardResponseBuilder.error('SESSION_ID_REQUIRED', 'セッションIDが必要です').response
    );
  }

  // UnifiedSessionMiddlewareでログアウト処理
  const result = await UnifiedSessionMiddleware.logout(sessionId);

  if (!result.success) {
    return res.status(500).json(
      StandardResponseBuilder.error(result.error!.code, result.error!.message).response
    );
  }

  // Cookieをクリア
  res.clearCookie('hotel-session-id');

  return StandardResponseBuilder.success(res, {
    success: true,
    message: 'ログアウトしました'
  });
});
```

**SessionAuthService.destroySession()の実装** (`/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts` line 170-180):

```typescript
async destroySession(sessionId: string): Promise<void> {
  await redis.del(`hotel:session:${sessionId}`);
  logger.info('セッション削除完了', {
    sessionId: sessionId.substring(0, 8) + '...'
  });
}
```

---

## 🗄️ データベーススキーマ（全システム共通）

### 命名規則（Prisma）
- **フィールド名**: `camelCase` (Prismaのデフォルト)
- **実際のカラム名（PostgreSQL）**: `snake_case` (@@map で変換)

### staffテーブル（管理画面ユーザー）

**実装**: `/Users/kaneko/hotel-kanri/docs/db/schema.prisma`

```prisma
model Staff {
  id                  String    @id @default(uuid())
  tenantId            String    @map("tenant_id")
  email               String    @unique
  name                String
  role                String    // 'staff' | 'manager' | 'admin' | 'owner'
  department          String?
  isActive            Boolean   @default(true) @map("is_active")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  failedLoginCount    Int       @default(0) @map("failed_login_count")
  lastLoginAt         DateTime? @map("last_login_at")
  lockedUntil         DateTime? @map("locked_until")
  passwordHash        String    @map("password_hash")
  deletedAt           DateTime? @map("deleted_at")
  deletedBy           String?   @map("deleted_by")
  isDeleted           Boolean   @default(false) @map("is_deleted")
  
  @@map("staff")
  @@index([tenantId])
  @@index([email])
  @@index([tenantId, isActive])
}
```

**マッピング**:
- Prisma: `tenantId` (camelCase)
- PostgreSQL: `tenant_id` (snake_case)
- API/JSON: `tenantId` (camelCase)
- Redis Session: `tenant_id` (snake_case)

**重要**: 認証SSOTでは `tenant_id` を統一概念として扱う

---

## 🔒 セキュリティ仕様（全システム共通）

### 1. パスワードハッシュ
- **アルゴリズム**: bcrypt
- **ソルトラウンド**: 10
- **実装**: hotel-common SessionAuthService

```typescript
import * as bcrypt from 'bcrypt';

// パスワードハッシュ化
const passwordHash = await bcrypt.hash(password, 10);

// パスワード検証
const isValid = await bcrypt.compare(password, staff.password_hash);
```

---

### 2. Cookie セキュリティ

#### HttpOnly
- **設定**: `true`（必須）
- **効果**: JavaScriptからアクセス不可（XSS対策）

#### Secure
- **設定**: `process.env.NODE_ENV === 'production'`
- **効果**: HTTPS通信でのみ送信

#### SameSite
- **設定**: `strict`（必須）
- **効果**: CSRF攻撃防止

---

### 3. セッション管理

#### セッションID生成
```typescript
crypto.randomBytes(32).toString('hex')  // 64文字のランダム16進数
```

#### セッション有効期限
- **TTL**: 3600秒（1時間）
- **延長**: アクセスがあるたびに自動延長

#### セッション無効化
- ログアウト時に即座削除
- TTL経過で自動削除（Redis機能）

---

### 4. 権限管理

#### 権限レベル
```typescript
const ROLE_LEVELS = {
  staff: 1,      // 一般スタッフ
  manager: 2,    // マネージャー
  admin: 3,      // 管理者
  owner: 5       // オーナー
};
```

#### 権限チェック
```typescript
function requireLevel(requiredLevel: number) {
  return (event: H3Event) => {
    const user = event.context.user;
    if (!user || user.level < requiredLevel) {
      throw createError({
        statusCode: 403,
        statusMessage: '権限がありません'
      });
    }
  };
}
```

---

## 🚦 システム別実装ガイド

### hotel-saas（実装済み）

#### ミドルウェア
- **ファイル**: `/Users/kaneko/hotel-saas/server/middleware/01.admin-auth.ts`
- **実装状況**: ✅ 完全実装済み
- **Redis接続**: ✅ 実Redis使用

#### Composable
- **ファイル**: `/Users/kaneko/hotel-saas/composables/useSessionAuth.ts`
- **実装状況**: ✅ 完全実装済み
- **グローバル状態**: `globalUser = ref<User | null>(null)`

#### API中継
- **ログイン**: `/Users/kaneko/hotel-saas/server/api/v1/auth/login.post.ts`
- **ログアウト**: `/Users/kaneko/hotel-saas/server/api/v1/auth/logout.post.ts`
- **ユーザー情報**: `/Users/kaneko/hotel-saas/server/api/v1/auth/me.get.ts`

**実装パターン**:
```typescript
// hotel-common APIを呼び出してCookieを転送
const response = await $fetch(`${HOTEL_COMMON_API_URL}/api/v1/auth/login`, {
  method: 'POST',
  body: { email, password, tenantId },
  headers: {
    Cookie: event.node.req.headers.cookie || ''
  }
});

// レスポンスヘッダーのSet-Cookieをブラウザに転送
if (response.headers['set-cookie']) {
  setResponseHeader(event, 'Set-Cookie', response.headers['set-cookie']);
}
```

---

### hotel-common（実装済み）

#### 認証サービス
- **ファイル**: `/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts`
- **実装状況**: ✅ 完全実装済み
- **Redis接続**: ✅ 実Redis使用（RealRedis）

#### ミドルウェア
- **ファイル**: `/Users/kaneko/hotel-common/src/middleware/UnifiedSessionMiddleware.ts`
- **実装状況**: ✅ 完全実装済み

#### API
- **ログイン**: `/Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts`
- **実装状況**: ✅ 完全実装済み

---

### hotel-pms（未実装）

#### 実装要件
1. **ミドルウェア**: hotel-saasの実装をコピーして適用
2. **Composable**: `useSessionAuth`を実装
3. **API中継**: hotel-commonへのプロキシ実装
4. **Redis接続**: 統一Redis必須

#### 実装チェックリスト
- [ ] ミドルウェア実装
- [ ] Composable実装
- [ ] API中継実装
- [ ] Redis接続設定
- [ ] Cookie設定統一
- [ ] 認証テスト実施

---

### hotel-member（未実装）

#### 実装要件
1. **会員認証**: staffテーブルではなくmembersテーブルを使用
2. **ミドルウェア**: 基本構造は同じ、テーブルが異なる
3. **Redis接続**: 統一Redis必須

#### 実装チェックリスト
- [ ] membersテーブル設計
- [ ] ミドルウェア実装
- [ ] Composable実装
- [ ] API中継実装
- [ ] Redis接続設定
- [ ] 認証テスト実施

---

## 🔧 環境変数（全システム統一）

### Redis接続
```bash
# 全システム共通
REDIS_URL=redis://localhost:6379  # 開発
# REDIS_URL=redis://production-redis:6379  # 本番
```

### hotel-common API URL（hotel-saas/pms/member用）
```bash
# 各システムから hotel-common への接続先
HOTEL_COMMON_API_URL=http://localhost:3400  # 開発
# HOTEL_COMMON_API_URL=https://api.hotel-common.production  # 本番
```

### Cookie設定
```bash
# 本番環境でHTTPSを強制する場合（オプション）
COOKIE_SECURE=true
```

### Node環境
```bash
NODE_ENV=development  # または production
```

---

## ❌ SSOTに準拠しないと発生する問題

### 🔴 問題1: Redis不統一によるログイン失敗

**症状**: ログイン成功後、すぐに401エラー

**原因**:
- hotel-commonが SimpleRedis（メモリMap）を使用
- hotel-saasが実Redisを使用
- 両者は別のストレージのため、セッション共有不可

**なぜ発生するか**:
1. hotel-commonでログイン → メモリMapにセッション保存
2. hotel-saasでアクセス → 実Redisからセッション取得
3. セッションが見つからない → 401エラー

**対応策**:
- hotel-commonを実Redis接続に変更（必須）
- SimpleRedisを完全削除

**SSOTセクション**: [必須要件（CRITICAL）](#必須要件critical)

---

### 🔴 問題2: Cookie名不統一による認証失敗

**症状**: システム間でセッションが共有されない

**原因**:
- システムAが `session-id` を使用
- システムBが `hotel-session-id` を使用
- 異なるCookie名のため、セッション取得不可

**対応策**:
- 全システムで `hotel-session-id` に統一（必須）

**SSOTセクション**: [Cookie統一要件](#3-cookie統一要件)

---

### 🔴 問題3: maxAge単位不統一によるセッション期限エラー

**症状**: システムによってセッション有効期限が異なる

**原因**:
- hotel-saas: 3600（秒）
- hotel-common: 3600000（ミリ秒）
- Redisは秒単位、Cookieは秒/ミリ秒混在

**対応策**:
- 全システムで秒単位（3600）に統一（必須）

**SSOTセクション**: [Cookie統一要件](#3-cookie統一要件)

---

### 🟡 問題4: 環境別実装による本番デプロイ失敗

**症状**: 開発環境では動作するが、本番環境で動作しない

**原因**:
- 開発環境: SimpleRedis（メモリ）
- 本番環境: 実Redis
- 環境別実装のため、本番デプロイ時に追加修正が必要

**対応策**:
- 開発・本番で同じ実装を使用（必須）
- 環境変数でのみ接続先を変更

**SSOTセクション**: [環境統一要件](#2-環境統一要件)

---

## 📊 パフォーマンス最適化

### 1. Redis接続のシングルトンパターン

```typescript
let redisClient: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();
  }
  return redisClient;
}
```

**効果**: 接続オーバーヘッド削減

---

### 2. セッション自動延長

```typescript
// アクセスがあるたびにTTLを延長
await redis.expire(`hotel:session:${sessionId}`, 3600);
```

**効果**: アクティブユーザーのセッション維持

---

### 3. パブリックパスのスキップ

```typescript
// パブリックパスは認証チェックをスキップ
if (isPublicPath(path)) return;
```

**効果**: 不要な認証チェックの削減

---

## 🧪 テスト要件

### 単体テスト

```typescript
describe('SessionAuthService', () => {
  it('正しい認証情報でログイン成功', async () => {
    const result = await authService.login('admin@example.com', 'password', 'tenant-001');
    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
  });

  it('間違ったパスワードでログイン失敗', async () => {
    const result = await authService.login('admin@example.com', 'wrong', 'tenant-001');
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_PASSWORD');
  });

  it('セッション作成後、Redisに保存される', async () => {
    const sessionId = await authService.createSession({ ... });
    const sessionData = await redis.get(`hotel:session:${sessionId}`);
    expect(sessionData).toBeDefined();
  });
});
```

---

### E2Eテスト

```typescript
describe('認証フロー', () => {
  it('ログイン → アクセス → ログアウト', async () => {
    // ログイン
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // ダッシュボードにリダイレクト
    await expect(page).toHaveURL('/admin');
    
    // 認証が必要なAPIにアクセス
    const response = await page.goto('/api/v1/admin/summary');
    expect(response?.status()).toBe(200);
    
    // ログアウト
    await page.click('button[data-testid="logout"]');
    await expect(page).toHaveURL('/admin/login');
  });

  it('未認証ユーザーは管理画面にアクセスできない', async () => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin/login');
  });
});
```

---

## 📝 実装チェックリスト

### hotel-saas
- [x] ミドルウェア実装
- [x] Composable実装
- [x] API中継実装
- [x] Redis接続設定
- [x] Cookie設定統一
- [x] 認証テスト実施

### hotel-common
- [x] 認証サービス実装
- [x] ミドルウェア実装
- [x] API実装
- [x] Redis接続設定
- [x] bcryptパスワードハッシュ
- [x] エラーハンドリング

### hotel-pms
- [ ] ミドルウェア実装
- [ ] Composable実装
- [ ] API中継実装
- [ ] Redis接続設定
- [ ] Cookie設定統一
- [ ] 認証テスト実施

### hotel-member
- [ ] membersテーブル設計
- [ ] ミドルウェア実装
- [ ] Composable実装
- [ ] API中継実装
- [ ] Redis接続設定
- [ ] 認証テスト実施

---

## 🚀 今後の拡張予定

### Phase 1: マルチファクタ認証（MFA）
- TOTP（Google Authenticator等）
- SMS認証
- メール認証

### Phase 2: OAuth連携
- Google OAuth
- Microsoft OAuth
- SSO連携

### Phase 3: 監査ログ強化
- ログイン履歴の詳細記録
- 異常検知
- セキュリティアラート

---

## 📚 参考資料

- [Redis ドキュメント](https://redis.io/docs/)
- [bcrypt ドキュメント](https://github.com/kelektiv/node.bcrypt.js)
- [OWASP セッション管理](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [HTTP Cookie セキュリティ](https://developer.mozilla.org/ja/docs/Web/HTTP/Cookies)

---

**最終更新**: 2025年10月2日  
**作成者**: AI Assistant (Iza)  
**レビュー**: 未実施  
**承認**: 未実施

