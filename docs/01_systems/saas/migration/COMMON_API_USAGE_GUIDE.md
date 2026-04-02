# hotel-common API利用ガイド

## 概要

このドキュメントでは、hotel-commonで提供されているAPIの利用方法について説明します。hotel-saasアプリケーションはhotel-commonのAPIを使用して、認証、オーダー管理、テナント管理などの機能を実現します。

## 利用可能なAPI

現在、hotel-commonでは以下のAPIが利用可能です：

### 認証系API

| API | 説明 | ドキュメント |
|-----|------|------------|
| `POST /api/v1/auth/login` | ログイン処理 | [認証仕様書](../integration/AUTH_INTEGRATION_SPEC.md) |
| `POST /api/auth/validate` | トークン検証 | [認証仕様書](../integration/AUTH_INTEGRATION_SPEC.md) |
| `POST /api/v1/auth/refresh` | トークン更新 | - |

### テナント系API

| API | 説明 | ドキュメント |
|-----|------|------------|
| `GET /api/tenants` | テナント一覧 | - |
| `GET /api/tenants/:id` | テナント詳細 | - |

### オーダー系API

| API | 説明 | ドキュメント |
|-----|------|------------|
| `POST /api/v1/orders` | オーダー作成 | [オーダー作成API](../api/orders/CREATE_ORDER_API_GUIDE.md) |
| `GET /api/v1/orders/history` | オーダー履歴 | [オーダーAPIリファレンス](../api/orders/ORDER_API_QUICK_REFERENCE.md) |
| `GET /api/v1/orders/active` | アクティブオーダー | [オーダーAPIリファレンス](../api/orders/ORDER_API_QUICK_REFERENCE.md) |
| `GET /api/v1/orders/:id` | オーダー詳細 | [オーダーAPIリファレンス](../api/orders/ORDER_API_QUICK_REFERENCE.md) |
| `PUT /api/v1/orders/:id/status` | オーダーステータス更新 | [オーダーAPIリファレンス](../api/orders/ORDER_API_QUICK_REFERENCE.md) |

### システム系API

| API | 説明 | ドキュメント |
|-----|------|------------|
| `GET /api/systems/status` | システムステータス | - |
| `GET /api/stats` | 統計情報 | - |

## API利用方法

### 1. APIクライアント層の使用

hotel-saasでは、`server/utils/api-client.ts`にAPIクライアント層が実装されています。このクライアント層を使用することで、hotel-commonのAPIを簡単に呼び出すことができます。

```typescript
import { authApi, tenantApi, orderApi } from '../utils/api-client';

// 認証API
const loginResult = await authApi.login({ email, password });

// テナントAPI
const tenant = await tenantApi.getTenant(tenantId);

// オーダーAPI
const order = await orderApi.createOrder(orderData);
```

### 2. 認証

ほとんどのAPIは認証が必要です。認証には以下のヘッダーを使用します：

```
Authorization: Bearer {JWT_TOKEN}
X-Tenant-ID: {TENANT_ID}
```

JWTトークンを取得するには、ログインAPIを使用します：

```typescript
const loginResult = await authApi.login({
  email: 'professional@example.com',
  password: 'professional123'
});

const token = loginResult.accessToken;
```

### 3. エラーハンドリング

APIからのエラーレスポンスは、`success: false`と`error`メッセージを含みます。エラーハンドリングの例：

```typescript
try {
  const result = await orderApi.createOrder(orderData);
  // 成功処理
} catch (error) {
  if (error.statusCode === 400) {
    // バリデーションエラー
    console.error('入力データが不正です:', error.details);
  } else if (error.statusCode === 401) {
    // 認証エラー
    console.error('認証エラー: JWTトークンを更新してください');
    // トークンリフレッシュ処理
  } else {
    // その他のエラー
    console.error('APIエラー:', error);
  }
}
```

## 統合モード

hotel-saasとhotel-commonの統合には、以下の2つのモードがあります：

### PARTIAL モード（部分統合）

- 開発環境では認証をスキップ可能
- フォールバックメカニズムを優先的に使用
- 既存のSQLiteデータベースとの互換性を維持

### FULL モード（完全統合）

- 開発環境でも認証を要求（フォールバックは引き続き利用可能）
- hotel-common APIを優先使用
- 統一データベースを使用（PostgreSQL）
- 標準化されたAPI形式を使用

統合モードは環境変数で設定します：

```bash
# 完全統合モード
INTEGRATION_MODE=FULL
USE_UNIFIED_DATABASE=true
ENABLE_JWT_AUTH=true

# 部分統合モード
INTEGRATION_MODE=PARTIAL
USE_UNIFIED_DATABASE=false
ENABLE_JWT_AUTH=false
```

詳細は[完全統合モード](../integration/FULL_INTEGRATION_MODE.md)を参照してください。

## 開発環境での設定

開発環境では、以下の設定を使用します：

```bash
# hotel-common API URL
HOTEL_COMMON_API_URL=http://localhost:3400

# JWT設定
JWT_SECRET=hotel-saas-integration-secret-key-2025

# 統合モード
INTEGRATION_MODE=FULL
USE_UNIFIED_DATABASE=true
ENABLE_JWT_AUTH=true
```

## トラブルシューティング

### JWT検証エラー: invalid signature

このエラーは、JWTトークンの署名が無効であることを示しています。以下の原因が考えられます：

1. **トークンの改ざん**: トークンが改ざんされている可能性があります。
2. **異なる環境のトークン**: 開発環境で取得したトークンを本番環境で使用するなど、環境が異なる場合に発生します。
3. **トークンの有効期限切れ**: トークンの有効期限が切れている可能性があります。

**解決策**:
- ログインAPIを使用して新しいトークンを取得してください。
- 正しい環境のAPIエンドポイントを使用していることを確認してください。
- トークンをそのまま使用し、改変しないようにしてください。

### API接続エラー

APIに接続できない場合は、以下を確認してください：

1. hotel-commonサーバーが起動しているか
2. `HOTEL_COMMON_API_URL`が正しく設定されているか
3. ネットワーク接続に問題がないか

### データベース接続エラー

データベース接続エラーが発生する場合は、以下を確認してください：

1. PostgreSQLサービスが起動しているか
2. `DATABASE_URL`が正しく設定されているか
3. データベースユーザーが適切な権限を持っているか

## 参考資料

- [認証統合仕様書](../integration/AUTH_INTEGRATION_SPEC.md)
- [完全統合モード](../integration/FULL_INTEGRATION_MODE.md)
- [オーダー作成API](../api/orders/CREATE_ORDER_API_GUIDE.md)
- [オーダーAPIリファレンス](../api/orders/ORDER_API_QUICK_REFERENCE.md)
- [API更新情報](../api/HOTEL_SAAS_API_UPDATES.md)
