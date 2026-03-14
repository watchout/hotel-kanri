# 完全統合モード（FULL INTEGRATION MODE）

## 概要

完全統合モードは、hotel-saasとhotel-commonの統合を最大限に活用するための運用モードです。このモードでは、認証や権限管理、データベースアクセスなどの基本機能をhotel-commonに完全に委譲し、一貫性のある統合環境を実現します。

## 設定方法

完全統合モードを有効にするには、以下の環境変数を設定します。

```bash
# 完全統合モード設定
INTEGRATION_MODE=FULL
USE_UNIFIED_DATABASE=true
ENABLE_JWT_AUTH=true

# 統合データベース接続設定
DATABASE_URL="postgresql://hotel_app:hotel_app_password@localhost:5432/hotel_unified_db?schema=public"

# 開発環境設定
UNIFY_ENV=local
NODE_ENV=development

# JWT認証設定
JWT_SECRET=hotel-saas-integration-secret-key-2025
```

## 主な変更点

### 1. 認証フロー

- 開発環境でも認証を要求（フォールバックは引き続き利用可能）
- `verifyToken`メソッドを使用した標準化されたトークン検証
- 統合認証サービスの完全活用

### 2. データベース連携

- 統一データベースを使用（PostgreSQL）
- Row Level Security (RLS)によるテナント分離
- 共通スキーマ定義の活用

### 3. API連携

- 統一APIエンドポイントの使用
- 標準化されたリクエスト/レスポンス形式
- クロスシステムAPI呼び出しの簡素化

## 開発環境での利用

開発環境では、以下の点に注意してください：

1. 認証は常に有効ですが、開発用のフォールバックが利用可能です
2. 統合データベースへの接続が必要です（`localhost:5432`のPostgreSQL）
3. 環境変数`NODE_ENV=development`を設定することで、開発用の便宜機能が有効になります

## トラブルシューティング

### 認証エラー

認証エラーが発生する場合は、以下を確認してください：

1. `JWT_SECRET`が正しく設定されているか
2. 統合データベースに接続できているか
3. 認証トークンが正しく生成・検証されているか

### データベース接続エラー

データベース接続エラーが発生する場合は、以下を確認してください：

1. PostgreSQLサービスが起動しているか
2. `DATABASE_URL`が正しく設定されているか
3. `hotel_app`ユーザーが適切な権限を持っているか

## 参考情報

- [統合認証仕様書](./AUTH_INTEGRATION_SPEC.md)
- [データベース統合仕様書](../database/database-integration-spec.md)
- [スタッフ認証統合リクエスト](../database/staff-auth-integration-request-revised.md)
