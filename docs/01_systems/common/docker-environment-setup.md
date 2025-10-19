# Docker環境セットアップガイド

このガイドでは、ホテル統合システムのDocker環境セットアップ方法について説明します。

## 前提条件

- Docker がインストールされていること
- Docker Compose がインストールされていること
- Git がインストールされていること

## 環境構築手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd hotel-common
```

### 2. 環境変数の設定

```bash
cp env.example .env
```

必要に応じて `.env` ファイルを編集し、環境変数を設定します。

### 3. Dockerコンテナのビルドと起動

```bash
docker-compose up -d
```

これにより、以下のサービスが起動します：
- アプリケーションサーバー（Node.js）
- データベースサーバー（PostgreSQL）
- キャッシュサーバー（Redis）

### 4. マイグレーションの実行

```bash
docker-compose exec app npm run migrate
```

### 5. 初期データのセットアップ（オプション）

```bash
docker-compose exec app npm run seed
```

## 環境の確認

### アプリケーションの動作確認

ブラウザで `http://localhost:3100` にアクセスし、アプリケーションが正常に動作していることを確認します。

### データベースの確認

```bash
docker-compose exec db psql -U hotel_app -d hotel_unified_db
```

## 開発ワークフロー

### コードの変更

ソースコードを変更すると、ホットリロードにより自動的に反映されます。

### 依存関係の追加

新しいnpmパッケージを追加する場合：

```bash
docker-compose exec app npm install <package-name>
```

### コンテナの再起動

```bash
docker-compose restart app
```

### ログの確認

```bash
docker-compose logs -f app
```

## 本番環境向けビルド

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 環境の停止

```bash
docker-compose down
```

データボリュームを含めて完全に削除する場合：

```bash
docker-compose down -v
```

## トラブルシューティング

### データベース接続エラー

- `.env` ファイルの `DATABASE_URL` が正しく設定されているか確認
- データベースコンテナが起動しているか確認

### ポートの競合

- 既に使用されているポートがある場合は、`docker-compose.yml` ファイルでポート設定を変更

### ボリュームの問題

- ボリュームのクリーンアップが必要な場合：
  ```bash
  docker volume rm hotel-common_postgres_data
  ```

## 環境別の設定

### 開発環境

デフォルトの設定で動作します。

### テスト環境

```bash
cp env.example .env.test
# .env.test ファイルを編集
NODE_ENV=test
```

テスト実行：
```bash
docker-compose --env-file .env.test -f docker-compose.yml -f docker-compose.test.yml up -d
```

### 本番環境

```bash
cp env.example .env.production
# .env.production ファイルを編集
NODE_ENV=production
```

本番環境起動：
```bash
docker-compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml up -d
```