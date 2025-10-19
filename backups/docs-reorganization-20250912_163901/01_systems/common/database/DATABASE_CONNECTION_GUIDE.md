# PostgreSQL接続・API動作確認ガイド

## 🔍 概要

このドキュメントでは、hotel-commonプロジェクトにおけるPostgreSQLデータベース接続とAPIサーバーの動作確認手順について説明します。

## 📊 データベース接続

### 接続設定

hotel-commonプロジェクトでは、以下の環境変数を使用してPostgreSQLに接続します：

```bash
# .envファイル
DATABASE_URL=postgresql://hotel_app:xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9@localhost:5432/hotel_unified_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=hotel_common
```

### 接続テスト

データベース接続を確認するには、以下のコマンドを実行します：

```bash
node -e "const { hotelDb } = require('./dist/database'); async function testConnection() { try { const adapter = hotelDb.getAdapter(); const result = await adapter.tenant.findMany({ take: 1 }); console.log('PostgreSQL接続成功:', result); } catch (error) { console.error('PostgreSQL接続エラー:', error); } } testConnection();"
```

成功すると、以下のような出力が表示されます：

```
PostgreSQL接続成功: [
  {
    id: 'default',
    name: 'デフォルトテナント',
    domain: 'default.omotenasuai.com',
    status: 'active',
    contactEmail: 'admin@omotenasuai.com',
    createdAt: 2025-08-18T07:50:14.545Z,
    features: [ 'basic', 'premium' ],
    planType: 'premium',
    settings: { theme: 'light', language: 'ja', notifications: true }
  }
]
```

## 🚀 APIサーバー起動

### サーバー起動コマンド

APIサーバーを起動するには、以下のコマンドを実行します：

```bash
# シェルスクリプト使用
./start-server.sh

# または直接コマンド実行
npx ts-node-dev --transpile-only src/server/index-extended.ts
```

### 環境変数設定

APIサーバーには以下の環境変数が必要です：

```bash
HOTEL_COMMON_PORT=3400
WEBSOCKET_PORT=3401
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hotel_unified_db"
REDIS_HOST="localhost"
REDIS_PORT=6379
JWT_SECRET="hotel-common-development-secret"
```

## ✅ API動作確認

### ヘルスチェック

サーバーが正常に起動しているか確認するには：

```bash
curl -v http://localhost:3400/health
```

成功すると、以下のようなレスポンスが返ります：

```json
{
  "status": "healthy",
  "timestamp": "2025-08-22T06:30:06.099Z",
  "service": "hotel-common-integration",
  "version": "1.0.0",
  "database": "connected",
  "systems": {
    "hotel-saas": {
      "system": "hotel-saas",
      "url": "http://localhost:3100",
      "status": "DISCONNECTED",
      "lastCheck": "2025-08-22T06:29:48.655Z"
    },
    "hotel-member-frontend": {
      "system": "hotel-member-frontend",
      "url": "http://localhost:3200",
      "status": "DISCONNECTED",
      "lastCheck": "2025-08-22T06:29:48.655Z"
    },
    "hotel-member-backend": {
      "system": "hotel-member-backend",
      "url": "http://localhost:8080",
      "status": "DISCONNECTED",
      "lastCheck": "2025-08-22T06:29:48.655Z"
    },
    "hotel-pms": {
      "system": "hotel-pms",
      "url": "http://localhost:3300",
      "status": "DISCONNECTED",
      "lastCheck": "2025-08-22T06:29:48.655Z"
    }
  }
}
```

### 利用可能なエンドポイント

APIサーバーで利用可能なエンドポイントを確認するには、存在しないエンドポイントにアクセスします：

```bash
curl -v http://localhost:3400/api/v1/auth/validate-token
```

レスポンスに含まれる`available_endpoints`フィールドに、利用可能なすべてのエンドポイントが表示されます。

## 🔄 トラブルシューティング

### データベース接続エラー

データベース接続エラーが発生した場合：

1. Docker Composeが正常に起動しているか確認
   ```bash
   docker ps
   ```

2. 環境変数が正しく設定されているか確認
   ```bash
   cat .env
   ```

3. PostgreSQLサービスが利用可能か確認
   ```bash
   nc -zv localhost 5432
   ```

### APIサーバー起動エラー

APIサーバーが起動しない場合：

1. 依存関係がインストールされているか確認
   ```bash
   npm install
   ```

2. ポートが既に使用されていないか確認
   ```bash
   lsof -i :3400
   ```

3. ログを確認
   ```bash
   tail -f logs/server.log
   ```

## 📝 注意事項

- 本番環境では、セキュリティのため環境変数を適切に管理してください
- データベース操作は必ずPrismaアダプターを通じて行い、直接SQLを実行しないでください [[memory:6564100]]
- APIサーバーの起動前に、必要なDockerコンテナ（PostgreSQL、Redis）が起動していることを確認してください
