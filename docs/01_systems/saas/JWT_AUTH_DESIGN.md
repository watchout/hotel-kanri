# JWT認証統一設計書

> 更新履歴 (2025-09-08, hotel-common 統合管理による更新)
> - 必須クレームの明確化: registered（iss/aud/sub/exp/iat/nbf/jti/kid）+ namespaced custom
> - 保存方式の統一: 認証Cookie（httpOnly+Secure+SameSite=strict）へ移行。Authorizationはサーバ間のみ
> - ライフサイクル: 短寿命Access + 長寿命Refresh、419で再発行
> - SSR対応: サーバ側でもCookieから検証、未認証描画を避ける

## 1. 現状分析

### 1.1 統合システムのJWT認証仕様（最終）

統合システム（hotel-common）では、以下のようなJWT認証の仕組みが実装されています：

- `HotelSaasAuth` クラスが認証の中心
- JWTトークンの生成と検証を担当
- 標準化されたトークンペイロード形式 `HotelAuthToken`

```typescript
// 登録済みクレーム (Registered Claims)
// iss, aud, sub, exp, iat, nbf, jti, kid（鍵ローテーション用）

// カスタムクレーム (Custom Claims) はネームスペースを分離して付与
// 例: omotenasu: { tenant_id, role, permissions, accessible_tenants, system_source }

interface HotelAuthTokenPayload {
  // Registered
  iss: string          // 発行者 (例: https://common.omotenasu.ai)
  aud: string          // 受信者 (例: hotel-saas)
  sub: string          // 対象者 = staff_id（userIdは廃止）
  exp: number          // 有効期限 (epoch seconds)
  iat: number          // 発行時刻 (epoch seconds)
  nbf?: number         // 有効化時刻 (epoch seconds)
  jti: string          // トークンID（リプレイ防止・失効管理）
  kid?: string         // 署名鍵ID（鍵ローテーション対応、必須化移行中）

  // Custom (namespaced)
  'omotenasu:tenant_id': string
  'omotenasu:role': 'user' | 'staff' | 'admin' | 'super_admin'
  'omotenasu:permissions': string[]
  'omotenasu:accessible_tenants': string[] // 必須。tenant_id を必ず含む
  'omotenasu:system_source': 'saas' | 'member' | 'pms'
}
```

### 1.2 現在の認証システムの問題点

- 複数の認証方式が混在（`useAuth`, `useJwtAuth`）
- 環境による条件分岐（開発環境では認証スキップ）
- APIエンドポイントごとに異なる認証チェック

## 2. JWT認証統一の設計

### 2.1 基本方針

1. **hotel-common の `HotelSaasAuth` を基盤として使用**
   - 既存の統合認証クラスを活用
   - 標準化されたトークン形式を採用

2. **単一の認証フロー**
   - ログイン → JWTトークン発行 → トークン検証 → アクセス制御
   - 環境に依存しない一貫した認証フロー

3. **クライアント・サーバー間の連携**
   - クライアント側は統一された `useAuth` コンポーザブル
   - サーバー側は統一された認証ミドルウェア

4. **トークンライフサイクル（Access/Refresh）**
   - Access Token: 短寿命（推奨: 15分）
   - Refresh Token: 長寿命（推奨: 14日）
   - 鍵ローテーション: kid により署名鍵識別、失効リストは jti 管理

### 2.2 認証フローの詳細

```
1. ログイン
   ユーザー → ログインフォーム → /api/v1/auth/login → JWTトークン発行

2. トークン保存（更新）
   - ブラウザ: 認証Cookie httpOnly+Secure+SameSite=strict（`access_token`, `refresh_token`）
   - サーバ間通信（saas→common）のみ `Authorization: Bearer <token>` を使用

3. トークン検証
   各リクエスト → 認証ミドルウェア → トークン検証 → ユーザー情報取得

4. アクセス制御
   リクエスト → 権限チェック → リソースアクセス
```

### 2.3 認証コンポーネント

#### 2.3.1 AuthService (サーバー側)

```typescript
// server/utils/authService.ts
import { HotelSaasAuth } from '~/lib/hotel-common'

export class AuthService {
  private static instance: AuthService
  private hotelAuth: HotelSaasAuth

  private constructor() {
    this.hotelAuth = new HotelSaasAuth('saas')
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  async validateToken(token: string): Promise<HotelAuthToken | null> {
    return this.hotelAuth.validateToken(token)
  }

  async generateToken(payload: Partial<HotelAuthToken>, expiresIn: string = '24h'): Promise<string | null> {
    return this.hotelAuth.generateToken(payload, expiresIn)
  }

  // その他の認証関連メソッド
}
```

### 2.4 事前バリデーションとスキュー許容（最終）

- ローカル検証: `exp`/`nbf` は ±60秒の clock skew を許容
- 失効は 419（TOKEN_EXPIRED）、未認証は 401、権限不足/テナント不一致は 403（TENANT_MISMATCH）
- 事前チェックで明らかに失効のものはリモート検証を省略し 419 を返却

### 2.5 保存方式（最終）
- ブラウザ: 認証Cookie（httpOnly+Secure+SameSite=strict）に `access_token`/`refresh_token`
- サーバ間（saas→common）: Authorization: Bearer <access_token>
- localStorage 併用は不可（既存は移行期間中に廃止）

### 2.6 鍵ローテーション（最終）
- kid は即日必須化。90日周期でローテーション、旧kidは180日猶予で検証可
- 公開鍵配布は環境変数 or JWKS。失効は jti リストで管理

### 2.7 監査ログ（最終）
- 未認証/期限切れ/権限拒否/テナント不一致を `system_event` に `AUTH_*` として記録
- 推奨フィールド: correlation_id, tenant_id, user_id(判明時), ip, path, action, status, error_code, ua, ts

### 2.5 マルチテナント整合性
### 2.6 SSR 対応とエラーマップ

- SSRでもCookieから検証し、未認証ページを描画しない
- エラーマップ統一:
  - 401 Unauthorized（未認証）
  - 403 Forbidden（認可/テナント不一致）
  - 419 TokenExpired（期限切れ→サイレント更新を試行）

- リクエストの `X-Tenant-ID` / URL 上のテナント / トークンの `omotenasu:tenant_id` が一致することを強制
- 不一致は 403 を返却（認可拒否）
- テナント切替時は新トークンを発行し、旧 jti を失効

#### 2.3.2 AuthMiddleware (サーバー側)

```typescript
// server/middleware/auth.ts
import { AuthService } from '../utils/authService'

export default defineEventHandler(async (event) => {
  // パブリックパスのチェック
  if (isPublicPath(event.path)) {
    return
  }

  // トークン取得
  const token = extractToken(event)
  if (!token) {
    throw createError({
      statusCode: 401,
      message: '認証が必要です'
    })
  }

  // トークン検証
  const authService = AuthService.getInstance()
  const authToken = await authService.validateToken(token)

  if (!authToken) {
    throw createError({
      statusCode: 401,
      message: '無効なトークンです'
    })
  }

  // 認証情報をイベントコンテキストに設定
  event.context.auth = {
    user: authToken,
    isAuthenticated: true
  }
})
```

#### 2.3.3 useAuth (クライアント側)

```typescript
// composables/useAuth.ts
import { computed, ref } from 'vue'

interface AuthState {
  token: string | null
  user: any | null
  isAuthenticated: boolean
  isLoading: boolean
}

const authState = ref<AuthState>({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: false
})

export const useAuth = () => {
  // トークンをローカルストレージから復元
  const restoreToken = () => {
    if (process.client) {
      const token = localStorage.getItem('accessToken')
      if (token) {
        authState.value.token = token
        validateToken(token)
      }
    }
  }

  // トークン検証
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await $fetch('/api/v1/auth/validate-token', {
        method: 'POST',
        body: { token }
      })

      if (response.success && response.data) {
        authState.value.user = response.data
        authState.value.isAuthenticated = true
        return true
      }
    } catch (error) {
      console.warn('Token validation failed:', error)
    }

    authState.value.user = null
    authState.value.isAuthenticated = false
    return false
  }

  // ログイン
  const signIn = async (credentials: {
    email: string
    password: string
    roomNumber?: string
  }): Promise<{ success: boolean; error?: string }> => {
    // ログイン処理
  }

  // ログアウト
  const signOut = async (): Promise<void> => {
    // ログアウト処理
  }

  return {
    // State
    user: computed(() => authState.value.user),
    isAuthenticated: computed(() => authState.value.isAuthenticated),
    isLoading: computed(() => authState.value.isLoading),
    token: computed(() => authState.value.token),

    // Methods
    signIn,
    signOut,
    validateToken,
    restoreToken,

    // 初期化
    initialize: () => {
      if (process.client) {
        restoreToken()
      }
    }
  }
}
```

### 2.4 認証ルートガード

```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to) => {
  // クライアントサイドでのみ実行
  if (process.server) return

  // パブリックパスのチェック
  if (isPublicPath(to.path)) {
    return
  }

  const { isAuthenticated, user } = useAuth()

  // 認証チェック
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }

  // 権限チェック
  if (to.meta.requiresAdmin && user.value?.role !== 'admin') {
    return navigateTo('/unauthorized')
  }
})
```

## 3. 実装計画

### 3.1 フェーズ1: 基盤実装

1. `AuthService` クラスの実装
   - `HotelSaasAuth` を使用したトークン生成・検証
   - ユーザー情報の取得・管理

2. `useAuth` コンポーザブルの実装
   - 認証状態の管理
   - トークンの保存・復元
   - ログイン・ログアウト機能

### 3.2 フェーズ2: ミドルウェア実装

1. サーバー認証ミドルウェアの実装
   - トークン検証
   - 権限チェック
   - エラーハンドリング

2. クライアント認証ミドルウェアの実装
   - ルートガード
   - リダイレクト処理

### 3.3 フェーズ3: API統合

1. ログインAPIの修正
   - JWTトークン発行の統一
   - エラーレスポンスの統一

2. トークン検証APIの修正
   - `HotelSaasAuth` を使用した検証
   - レスポンス形式の統一

3. 各APIエンドポイントの修正
   - 個別認証チェックの削除
   - ミドルウェアへの依存

### 3.4 フェーズ4: 移行と検証

1. 既存認証からの移行
   - `useAuth` と `useJwtAuth` の統合
   - 環境依存コードの削除

2. テストと検証
   - ログインフローのテスト
   - 保護されたAPIのテスト
   - エラーケースのテスト

## 4. セキュリティ考慮事項

### 4.1 トークンのセキュリティ

- JWTシークレットの適切な管理
- トークンの有効期限の設定
- HTTPSの使用

### 4.2 認証エラーハンドリング

- 明確なエラーメッセージ
- 適切なHTTPステータスコード
- セキュリティを考慮した情報開示

### 4.3 権限管理

- 細かい粒度の権限設定
- ロールベースのアクセス制御
- リソースごとの権限チェック

## 5. 結論

JWT認証に統一することで、以下のメリットが得られます：

1. **一貫性のある認証フロー**
   - クライアント側とサーバー側で同じ認証ロジック
   - 環境に依存しない動作

2. **統合システムとの連携**
   - `hotel-common` の認証システムとの互換性
   - 将来的な拡張性

3. **セキュリティの向上**
   - 標準化された認証チェック
   - 適切なエラーハンドリング

4. **保守性の向上**
   - 重複コードの削減
   - 認証ロジックの集中管理

この設計に基づいて実装を進めることで、現在の認証問題を根本的に解決し、より堅牢で保守性の高い認証システムを構築することができます。
