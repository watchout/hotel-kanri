# 統合認証仕様書

## 概要

hotel-saasとhotel-commonの統合認証システムは、JWT（JSON Web Token）を使用した標準的な認証フローを提供します。このドキュメントでは、認証フローの詳細と実装方法について説明します。

## 認証フロー

### 1. ログインフロー

1. ユーザーがログインフォームから認証情報を送信
2. サーバーが認証情報を検証
3. 検証成功時、JWTトークンを生成
4. クライアントにトークンを返却
5. クライアントがトークンをローカルストレージに保存

```mermaid
sequenceDiagram
    Client->>Server: POST /api/v1/auth/login {email, password}
    Server->>Database: 認証情報検証
    Database-->>Server: 検証結果
    Server->>Server: JWT生成
    Server-->>Client: {success: true, accessToken: "..."}
    Client->>Client: トークンをローカルストレージに保存
```

### 2. 認証検証フロー

1. クライアントがAPIリクエスト時にトークンを送信
2. サーバーがトークンを検証
3. 検証成功時、リクエストを処理
4. 検証失敗時、401/403エラーを返却

```mermaid
sequenceDiagram
    Client->>Server: API Request + Authorization Header
    Server->>Server: トークン検証
    alt 検証成功
        Server->>Database: データ取得/更新
        Database-->>Server: 結果
        Server-->>Client: 成功レスポンス
    else 検証失敗
        Server-->>Client: 401/403 エラー
    end
```

### 3. トークン検証API

クライアントサイドでトークンの有効性を確認するための専用APIエンドポイント：

```
POST /api/v1/integration/validate-token
```

リクエスト：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

または、Authorizationヘッダーを使用：
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

レスポンス（成功）：
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "tenantId": "tenant-456",
    "role": "admin",
    "systemSource": "saas",
    "permissions": ["*"],
    "expiresAt": 1719792000000
  },
  "meta": {
    "tenant_id": "tenant-456",
    "timestamp": "2023-08-18T12:34:56.789Z",
    "request_id": "validate-1692360896789",
    "system": "saas"
  }
}
```

レスポンス（失敗）：
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_INVALID",
    "message": "無効なトークンです"
  },
  "meta": {
    "tenant_id": "system",
    "timestamp": "2023-08-18T12:34:56.789Z",
    "request_id": "validate-error-1692360896789",
    "system": "saas"
  }
}
```

## JWT仕様

### トークン構造

JWTトークンは以下の構造を持ちます：

#### ヘッダー（Header）
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

#### ペイロード（Payload）
```json
{
  "userId": "user-123",
  "tenantId": "tenant-456",
  "role": "admin",
  "systemSource": "saas",
  "permissions": ["*"],
  "iat": 1692274496,
  "exp": 1692360896
}
```

#### 署名（Signature）
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  JWT_SECRET
)
```

### 有効期限

- アクセストークン：24時間（デフォルト）
- リフレッシュトークン：30日（オプション）

## 実装詳細

### 1. HotelSaasAuth クラス

`hotel-common`ライブラリの`HotelSaasAuth`クラスは、JWT認証の中核機能を提供します：

- `verifyToken(token: string)`: トークンを検証し、デコードされたペイロードを返す
- `generateToken(payload: Partial<HotelAuthToken>, expiresIn: string)`: 新しいトークンを生成する
- `validateToken(token: string)`: 後方互換性のため、`verifyToken`のエイリアス

### 2. AuthService クラス

`server/utils/authService.ts`の`AuthService`クラスは、`HotelSaasAuth`をラップし、サーバーサイドの認証機能を提供します：

- `validateToken(token: string)`: トークンを検証する
- `extractToken(event: H3Event)`: リクエストからトークンを抽出する
- `authenticateUser(event: H3Event)`: ユーザー認証を行う
- `authenticateAdmin(event: H3Event)`: 管理者認証を行う

### 3. useJwtAuth コンポーザブル

`composables/useJwtAuth.ts`の`useJwtAuth`コンポーザブルは、クライアントサイドの認証機能を提供します：

- `signIn(credentials)`: ログイン処理を行う
- `signOut()`: ログアウト処理を行う
- `validateToken(token)`: トークンの有効性を確認する
- `initialize()`: 認証状態を初期化する

## 統合モード

### PARTIAL モード（部分統合）

- 開発環境では認証をスキップ可能
- フォールバックメカニズムを優先的に使用
- 既存のSQLiteデータベースとの互換性を維持

### FULL モード（完全統合）

- 開発環境でも認証を要求（フォールバックは引き続き利用可能）
- `verifyToken`メソッドを優先使用
- 統一データベースを使用（PostgreSQL）
- 標準化されたAPI形式を使用

## セキュリティ考慮事項

1. JWT秘密鍵の安全な管理
2. HTTPS通信の使用
3. トークンの適切な有効期限設定
4. クロスサイトスクリプティング（XSS）対策
5. クロスサイトリクエストフォージェリ（CSRF）対策

## 開発環境での設定

開発環境では、以下の環境変数を設定することで認証の挙動を制御できます：

```bash
# 完全統合モード
INTEGRATION_MODE=FULL
ENABLE_JWT_AUTH=true
JWT_SECRET=hotel-saas-integration-secret-key-2025

# 部分統合モード
INTEGRATION_MODE=PARTIAL
ENABLE_JWT_AUTH=false
```

## トラブルシューティング

### 認証エラー

1. JWTトークンが正しく生成されているか確認
2. JWT秘密鍵が正しく設定されているか確認
3. トークンの有効期限が切れていないか確認
4. クライアント・サーバー間でトークンが正しく送受信されているか確認

### 開発環境での認証バイパス

開発環境で認証をバイパスする場合は、以下の設定を使用します：

```bash
ENABLE_JWT_AUTH=false
NODE_ENV=development
```

これにより、認証ミドルウェアがリクエストを自動的にスキップします。
