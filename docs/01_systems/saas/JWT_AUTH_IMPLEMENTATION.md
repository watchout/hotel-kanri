# JWT認証統一実装ドキュメント

**最終更新**: 2025年9月8日 - Cookie運用/SSR/鍵ローテーション/エラーマップ最終決定を反映
**変更履歴**:
- 2025年9月8日: Cookie運用/SSR/419再発行・鍵ローテーション追記（hotel-common）
- 2025年8月18日: 統一認証ミドルウェア実装完了、旧ミドルウェア無効化
- 初版作成日: 設計段階

---

## 1. **実装完了概要**

✅ **統合システム（hotel-common）のJWT認証仕様に基づき、統一認証システムの実装が完了しました。**

**主な成果**:
- 開発/本番で同一フロー（SSR対応）
- 旧ミドルウェア統合＋順序定義（認証→権限→プラン）
- Cookie運用（httpOnly/Secure/SameSite=strict）へ移行（XSS耐性）。localStorage併用は不可。
- 鍵ローテーション（kid）/ 失効（jti）対応の指針を明記（90日ローテ/180日猶予）
- エラーマップ統一: 401/403/419

## 2. 実装コンポーネント

### 2.1 サーバー側

#### 2.1.1 AuthService (`server/utils/authService.ts`)

認証の中心となるサービスクラス。hotel-commonの`HotelSaasAuth`を使用してJWT認証を提供します。

主な機能：
- トークンの検証
- トークンの生成
- ユーザー認証チェック
- 管理者認証チェック
- パブリックパスのチェック

```typescript
// 使用例
const authService = getAuthService()
const user = await authService.authenticateUser(event)
```

#### 2.1.2 **統一認証ミドルウェア** (`server/middleware/00.unified-auth.ts`) ✅ **実装完了**

<!-- 旧ミドルウェア (`server/middleware/unified-auth.ts`) は無効化済み -->

**すべてのAPIリクエストに対する一貫した認証チェックを提供します。**

**実装済み機能**：
- ✅ 静的リソースの自動スキップ
- ✅ 権限設定ファイルとの連携
- ✅ デバイス認証 (IP-based + x-device-token)
- ✅ スタッフ/管理者JWT認証（httpOnly Cookieから抽出）
- ✅ 権限チェック
- ✅ 統一エラーハンドリング
 - ✅ SSR段階で未認証をブロック（未認証ページを描画しない）

```typescript
// ミドルウェア順序（統一）
// 1) 認証 (auth.global) 2) 権限 (permissions) 3) プラン制限 (plan-restrictions)
// SSR/CSR 両方で動作、Cookieからトークン抽出。
// 未認証=401、期限切れ=419、権限不足/テナント不一致=403（TENANT_MISMATCH）。
```

**統合された旧ミドルウェア**:
- 🚫 `auth.ts` (無効化済み)
- 🚫 `authDevice.ts` (無効化済み)
- 🚫 `unified-auth.ts` (無効化済み)
- 🚫 `permission-check.ts` (無効化済み)

#### 2.1.3 **権限設定ファイル** (`server/config/permissions.ts`) ✅ **新規実装**

**すべてのAPIエンドポイントとページの権限設定を一元管理します。**

**実装済み機能**：
- ✅ 4つの認証タイプ定義 (NONE/DEVICE/STAFF/ADMIN)
- ✅ 権限レベル定義 (0-9段階)
- ✅ パス別権限設定 (140+エンドポイント対応)
- ✅ ヘルパー関数 (isPublicPath, findPermissionConfig)

```typescript
// 権限設定例
export const permissionConfigs: PermissionConfig[] = [
  // パブリックパス
  { path: '/api/v1/auth/login', authType: AuthType.NONE, description: 'ログインAPI' },

  // デバイス認証
  { path: '/api/v1/orders', authType: AuthType.DEVICE, description: '注文API' },

  // スタッフ認証
  { path: '/admin/dashboard', authType: AuthType.STAFF, description: '管理画面' },

  // 管理者認証
  { path: '/api/v1/admin/users', authType: AuthType.ADMIN, permissions: ['user_manage'] }
]
```

#### 2.1.4 トークン検証API (`server/api/v1/auth/validate-token.post.ts`)

クライアント側からのトークン検証リクエストを処理します。

主な機能：
- トークンの検証
- 標準化されたレスポンス形式

```typescript
// レスポンス例
{
  success: true,
  data: {
    // Registered claims
    iss: "https://common.omotenasu.ai",
    aud: "hotel-saas",
    sub: "staff-123",
    exp: 1730000000,
    iat: 1729996400,
    nbf: 1729996400,
    jti: "uuid-...",
    kid: "rsa-key-20250901",

    // Namespaced custom claims
    "omotenasu:tenant_id": "tenant-001",
    "omotenasu:role": "admin",
    "omotenasu:permissions": ["admin:*"],
    "omotenasu:accessible_tenants": ["tenant-001"],
    "omotenasu:system_source": "saas"
  },
  meta: {
    tenant_id: "tenant-001",
    timestamp: "2023-09-01T12:00:00.000Z",
    request_id: "validate-1630000000000",
    system: "saas"
  }
}
```

### 2.1.5 SSR 対応（重要）

- サーバサイドでもミドルウェアを有効にし、Cookie からトークン抽出→ローカル事前検証（exp/nbf ±60s）→必要時のみ common へ検証
- SSR段階で 401/403/419 を返却。未認証描画→直後リダイレクトを防止

### 2.1.6 キャッシュ／リトライ／ループ防止
### 2.1.7 エラーマップ（統一・最終）

- 401 Unauthorized（未認証/トークンなし/不正）
- 403 Forbidden（権限不足/テナント不一致: statusMessage=TENANT_MISMATCH）
- 419 TokenExpired（期限切れ→クライアントはサイレント更新を試行）


- 短期キャッシュ: 検証結果を 30〜60 秒キャッシュ（jti+tenant_id キー）
- リトライ: 1 回まで、総 500ms 待ち
- ループ防止: クエリ `auth_retry=1` がある場合は再試行せずエラーページ表示

### 2.2 クライアント側

#### 2.2.1 統一認証コンポーザブル (`composables/useUnifiedAuth.ts`)

クライアント側の認証状態管理と認証操作を提供します（Cookie運用）。localStorage のトークン保存は禁止。

主な機能：
- トークンの保存・復元
- トークンの検証
- ログイン・ログアウト
- 権限チェック

```typescript
// 使用例
const { isAuthenticated, user, signIn, signOut } = useUnifiedAuth()

// ログイン
await signIn({ email, password })

// 権限チェック
if (isAuthenticated.value && user.value.role === 'admin') {
  // 管理者向け処理
}
```

#### 2.2.2 認証ミドルウェア (`middleware/auth.ts`)

クライアント側のルートガードとして機能します。

主な機能：
- パブリックパスのチェック
- 認証状態のチェック
- 権限に基づくリダイレクト

```typescript
// ミドルウェアの動作
1. パスがパブリックかどうかをチェック
2. 認証が必要なパスの場合、認証状態をチェック
3. 未認証の場合、ログインページにリダイレクト
4. 管理者パスの場合、管理者権限をチェック
```

## 3. 認証フロー

### 3.1 ログインフロー

```
1. ユーザーがログインフォームを送信
2. クライアント側の useUnifiedAuth.signIn() が呼び出される
3. /api/v1/auth/login APIが呼び出される
4. サーバー側でユーザー認証とJWTトークン生成
5. クライアント側でトークンを保存
6. 認証状態を更新
```

### 3.2 認証チェックフロー

```
1. クライアント側のミドルウェアが認証状態をチェック
2. 認証が必要なパスの場合、useUnifiedAuth.isAuthenticated をチェック
3. 未認証の場合、ログインページにリダイレクト

サーバー側:
1. サーバーミドルウェアがリクエストをインターセプト
2. パブリックパスの場合、認証をスキップ
3. 認証が必要なパスの場合、トークンを検証
4. 認証情報をイベントコンテキストに設定
```

### 3.3 ログアウトフロー

```
1. ユーザーがログアウトボタンをクリック
2. クライアント側の useUnifiedAuth.signOut() が呼び出される
3. /api/v1/auth/logout APIが呼び出される
4. サーバー側でトークンを無効化
5. クライアント側で認証状態をクリア
6. ログインページにリダイレクト
```

## 4. APIエンドポイントの統一

以下のAPIエンドポイントを修正し、統一認証システムを使用するようにしました：

1. `server/api/v1/admin/devices/index.get.ts`
   - 個別の認証チェックを削除
   - 統一認証ミドルウェアに依存

2. `server/api/v1/admin/place-types/index.get.ts`
   - 個別の認証チェックを削除
   - 統一認証ミドルウェアに依存

3. `server/api/v1/admin/tenant/current.get.ts`
   - 認証コンテキストからテナント情報を取得
   - 統一認証ミドルウェアに依存

## 5. 環境変数

以下の環境変数を使用します：

```
# JWT 署名鍵（kid でローテーション）
JWT_PRIVATE_KEY_BASE64=...
JWT_PUBLIC_KEYS_JSON='{"rsa-key-20250901":"-----BEGIN PUBLIC KEY-----..."}'

# JWKS（hotel-common配布の公開鍵セットを利用する場合）
JWT_PUBLIC_KEYS_JWKS_URL=https://common.example.com/.well-known/jwks.json

# Cookie 設定
AUTH_COOKIE_DOMAIN=.omotenasu.ai
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=strict

# TTL / スキュー
AUTH_ACCESS_TTL=900            # 15分
AUTH_REFRESH_TTL=1209600       # 14日
CLOCK_SKEW_TOLERANCE_SEC=60
```

## 6. セキュリティ考慮事項

1. **トークンの保存（更新）**
   - httpOnly+Secure+SameSite=strict の Cookie（`access_token`, `refresh_token`）
   - `Authorization` ヘッダーはサーバ間通信（saas→common）に限定

2. **トークンの有効期限**
   - Access: 既定 15分 / Refresh: 既定 14日
   - 419（TOKEN_EXPIRED）受領時はサイレント更新（Refresh）を試行、失敗時は再ログイン

3. **権限チェック**
   - ロールベースのアクセス制御
   - 細かい粒度の権限設定が可能

## 7. 今後の改善点

1. **リフレッシュトークン**
   - 短寿命Access + 長寿命Refresh、失効は jti で管理

2. **Cookie運用**
   - httpOnly/Secure/SameSite=strict + CSRF対策（SameSite=strict か CSRFトークン併用）

3. **権限管理の強化**
   - より細かい粒度の権限設定
   - リソースごとの権限チェック

4. **監査ログ**
   - 認証・認可アクションのログ記録

## 8. 使用方法

### 8.1 クライアント側

```typescript
// コンポーネント内での使用
<script setup>
import { useUnifiedAuth } from '~/composables/useUnifiedAuth'

const { user, isAuthenticated, signIn, signOut } = useUnifiedAuth()

// ログイン
const login = async () => {
  const result = await signIn({
    email: 'user@example.com',
    password: 'password'
  })

  if (result.success) {
    // ログイン成功
  } else {
    // ログイン失敗
  }
}

// ログアウト
const logout = async () => {
  await signOut()
  // ログアウト後の処理
}

// 権限チェック
const canEditUsers = computed(() => {
  return isAuthenticated.value && user.value?.role === 'admin'
})
</script>
```

### 8.2 サーバー側

```typescript
// APIエンドポイント内での使用
export default defineEventHandler(async (event) => {
  // 認証情報はイベントコンテキストから取得可能
  const authContext = event.context.auth

  if (authContext?.isAuthenticated) {
    const user = authContext.user
    const tenantId = user.tenantId

    // テナントに関連するデータを取得
    const data = await prisma.someTable.findMany({
      where: {
        tenantId
      }
    })

    return {
      success: true,
      data
    }
  }

  // 認証情報がない場合（通常はミドルウェアでエラーになるため、ここには到達しない）
  throw createError({
    statusCode: 401,
    message: '認証が必要です'
  })
})
```

## 9. まとめ

統一JWT認証システムの実装により、以下のメリットが得られました：

1. **一貫性のある認証フロー**
   - クライアント側とサーバー側で同じ認証ロジック
   - 環境に依存しない動作

2. **統合システムとの連携**
   - hotel-commonの認証システムとの互換性
   - 将来的な拡張性

3. **セキュリティの向上**
   - 標準化された認証チェック
   - 適切なエラーハンドリング

4. **保守性の向上**
   - 重複コードの削減
   - 認証ロジックの集中管理
