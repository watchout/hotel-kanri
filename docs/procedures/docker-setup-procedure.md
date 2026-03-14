# Docker環境セットアップ手順書

**日付**: 2023年8月18日
**作成者**: hotel-kanri
**バージョン**: 1.0

## 1. 概要

本ドキュメントでは、omotenasuai.comプロジェクトのDocker環境をセットアップする手順を説明します。開発環境と本番環境それぞれのセットアップ手順を記載しています。

## 2. 前提条件

### 2.1. 開発環境

- macOS、Windows、またはLinux
- Docker Desktop（macOS/Windows）またはDocker Engine（Linux）
- docker-compose
- Git
- Node.js v20以上（ローカル開発用）

### 2.2. 本番環境

- Ubuntu 22.04 LTS
- Docker Engine
- docker-compose
- Git
- SSH接続

## 3. 開発環境のセットアップ

### 3.1. Dockerのインストール

#### macOS

1. [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)をダウンロードしてインストール
2. Docker Desktopを起動
3. ターミナルで動作確認
   ```bash
   docker --version
   docker-compose --version
   ```

#### Windows

1. [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/)をダウンロードしてインストール
2. WSL2の設定（必要に応じて）
3. Docker Desktopを起動
4. PowerShellまたはコマンドプロンプトで動作確認
   ```bash
   docker --version
   docker-compose --version
   ```

#### Linux

1. Docker Engineのインストール
   ```bash
   sudo apt-get update
   sudo apt-get install docker-ce docker-ce-cli containerd.io
   ```
2. docker-composeのインストール
   ```bash
   sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```
3. Dockerサービスの起動
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   ```
4. 一般ユーザーでDockerを使用できるように設定
   ```bash
   sudo usermod -aG docker $USER
   ```
5. 動作確認
   ```bash
   docker --version
   docker-compose --version
   ```

### 3.2. リポジトリのクローン

```bash
# hotel-kanriリポジトリのクローン
git clone https://github.com/watchout/hotel-kanri.git
cd hotel-kanri

# hotel-saasリポジトリのクローン
git clone https://github.com/watchout/hotel-saas.git /Users/kaneko/hotel-saas

# hotel-commonリポジトリのクローン
git clone https://github.com/watchout/hotel-common.git /Users/kaneko/hotel-common
```

### 3.3. 開発環境の起動

```bash
# 開発用の環境変数ファイルの作成
cp templates/env/.env.template .env.dev

# 環境変数の編集
nano .env.dev
# 以下の値を設定
# DB_USER=hotel_app
# DB_PASSWORD=password
# DB_NAME=hotel_unified_db
# REDIS_PASSWORD=password
# RABBITMQ_USER=hotel_app
# RABBITMQ_PASSWORD=password
# JWT_SECRET=dev_secret_key
# NODE_ENV=development

# 開発用インフラ（PostgreSQL、Redis、RabbitMQ）の起動
docker-compose -f config/docker/development/docker-compose.yml up -d

# 起動確認
docker-compose -f config/docker/development/docker-compose.yml ps
```

### 3.4. ローカル開発の設定

```bash
# hotel-saasディレクトリに移動
cd /Users/kaneko/hotel-saas

# 環境変数ファイルの作成
cp .env.example .env

# 環境変数の編集（開発環境用）
nano .env
# 以下の値を設定
# DATABASE_URL=postgresql://hotel_app:password@localhost:5432/hotel_unified_db
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=password
# RABBITMQ_HOST=localhost
# RABBITMQ_PORT=5672
# RABBITMQ_USER=hotel_app
# RABBITMQ_PASSWORD=password
# JWT_SECRET=dev_secret_key
# NODE_ENV=development
# PORT=3100
# BASE_URL=http://localhost:3100
# COMMON_API_URL=http://localhost:3400

# 依存パッケージのインストール
npm install --legacy-peer-deps

# 開発サーバーの起動
npm run dev
```

## 4. 本番環境のセットアップ

### 4.1. サーバー準備

```bash
# SSHでサーバーに接続
ssh deploy@163.44.117.60

# Dockerのインストール
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# docker-composeのインストール
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# deployユーザーをdockerグループに追加
sudo usermod -aG docker deploy
```

### 4.2. リポジトリのセットアップ

```bash
# ディレクトリ作成
mkdir -p /opt/omotenasuai

# hotel-kanriリポジトリのクローン
git clone git@github.com:watchout/hotel-kanri.git /opt/omotenasuai/hotel-kanri
cd /opt/omotenasuai/hotel-kanri

# 環境変数ファイルの作成
cp templates/env/.env.template .env

# 環境変数の編集
nano .env
# 以下の値を設定
# DB_USER=hotel_app
# DB_PASSWORD=xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9
# DB_NAME=hotel_unified_db
# REDIS_PASSWORD=r3d1sP@ssw0rd
# RABBITMQ_USER=hotel_app
# RABBITMQ_PASSWORD=r@bb1tMQP@ss
# JWT_SECRET=OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g==
# NODE_ENV=production
# BASE_URL=https://dev-app.omotenasuai.com
# DOCKER_REGISTRY=ghcr.io/watchout
# SAAS_VERSION=develop
# COMMON_VERSION=develop
```

### 4.3. Dockerレジストリの認証設定

```bash
# GitHubの個人アクセストークンを使用してログイン
docker login ghcr.io -u <GitHubユーザー名> -p <個人アクセストークン>
```

### 4.4. サービスの起動

```bash
# ディレクトリに移動
cd /opt/omotenasuai/hotel-kanri

# Dockerイメージのプル
docker-compose -f config/docker/docker-compose.yml pull

# サービスの起動
docker-compose -f config/docker/docker-compose.yml up -d

# 起動確認
docker-compose -f config/docker/docker-compose.yml ps

# ログの確認
docker-compose -f config/docker/docker-compose.yml logs -f
```

### 4.5. Nginxの設定

```bash
# Nginxの設定ファイルを編集
nano config/nginx/sites-available/omotenasuai.conf

# 設定を反映
docker-compose -f config/docker/docker-compose.yml restart nginx
```

## 5. Docker環境の管理

### 5.1. コンテナの管理

```bash
# コンテナの状態確認
docker-compose -f config/docker/docker-compose.yml ps

# 特定のサービスの再起動
docker-compose -f config/docker/docker-compose.yml restart <サービス名>

# ログの確認
docker-compose -f config/docker/docker-compose.yml logs -f <サービス名>

# すべてのサービスの停止
docker-compose -f config/docker/docker-compose.yml stop

# すべてのサービスの起動
docker-compose -f config/docker/docker-compose.yml start

# コンテナの削除（データは保持）
docker-compose -f config/docker/docker-compose.yml down

# コンテナとボリュームの削除（データも削除）
docker-compose -f config/docker/docker-compose.yml down -v
```

### 5.2. イメージの管理

```bash
# イメージの一覧表示
docker images

# 未使用イメージの削除
docker image prune -a

# 特定のイメージの削除
docker rmi <イメージID>
```

### 5.3. ボリュームの管理

```bash
# ボリュームの一覧表示
docker volume ls

# 未使用ボリュームの削除
docker volume prune

# ボリュームのバックアップ
docker run --rm -v omotenasuai_postgres-data:/source -v $(pwd):/backup alpine tar -czf /backup/postgres-data-backup.tar.gz -C /source .
```

## 6. トラブルシューティング

### 6.1. コンテナが起動しない場合

```bash
# 詳細なエラーログの確認
docker-compose -f config/docker/docker-compose.yml logs <サービス名>

# コンテナの状態確認
docker inspect <コンテナID>

# 環境変数の確認
docker-compose -f config/docker/docker-compose.yml config
```

### 6.2. ネットワーク接続の問題

```bash
# ネットワークの一覧表示
docker network ls

# ネットワークの詳細確認
docker network inspect omotenasuai-network

# コンテナ間の接続テスト
docker exec -it omotenasuai-saas ping hotel-common
```

### 6.3. データベース接続の問題

```bash
# PostgreSQLコンテナに接続
docker exec -it omotenasuai-postgres psql -U hotel_app -d hotel_unified_db

# データベース接続情報の確認
docker exec -it omotenasuai-saas env | grep DATABASE_URL
```

### 6.4. コンテナのリセット

```bash
# コンテナの停止と削除
docker-compose -f config/docker/docker-compose.yml down

# イメージの再ビルド
docker-compose -f config/docker/docker-compose.yml build --no-cache

# コンテナの再作成と起動
docker-compose -f config/docker/docker-compose.yml up -d
```

## 7. バックアップと復元

### 7.1. データベースのバックアップ

```bash
# PostgreSQLのバックアップ
docker exec -t omotenasuai-postgres pg_dumpall -c -U hotel_app > backup_$(date +%Y%m%d_%H%M%S).sql

# バックアップファイルの圧縮
gzip backup_*.sql
```

### 7.2. データベースの復元

```bash
# バックアップファイルの展開
gunzip backup_YYYYMMDD_HHMMSS.sql.gz

# PostgreSQLの復元
cat backup_YYYYMMDD_HHMMSS.sql | docker exec -i omotenasuai-postgres psql -U hotel_app
```

### 7.3. ボリュームのバックアップ

```bash
# ボリュームのバックアップ
docker run --rm -v omotenasuai_postgres-data:/source -v $(pwd):/backup alpine tar -czf /backup/postgres-data-backup.tar.gz -C /source .
docker run --rm -v omotenasuai_redis-data:/source -v $(pwd):/backup alpine tar -czf /backup/redis-data-backup.tar.gz -C /source .
docker run --rm -v omotenasuai_rabbitmq-data:/source -v $(pwd):/backup alpine tar -czf /backup/rabbitmq-data-backup.tar.gz -C /source .
```

### 7.4. ボリュームの復元

```bash
# ボリュームの復元
docker run --rm -v omotenasuai_postgres-data:/target -v $(pwd):/backup alpine sh -c "rm -rf /target/* && tar -xzf /backup/postgres-data-backup.tar.gz -C /target"
docker run --rm -v omotenasuai_redis-data:/target -v $(pwd):/backup alpine sh -c "rm -rf /target/* && tar -xzf /backup/redis-data-backup.tar.gz -C /target"
docker run --rm -v omotenasuai_rabbitmq-data:/target -v $(pwd):/backup alpine sh -c "rm -rf /target/* && tar -xzf /backup/rabbitmq-data-backup.tar.gz -C /target"
```

## 8. CI/CD設定

GitHub Actionsを使用したCI/CDパイプラインが設定されています。以下の手順で設定を確認してください。

### 8.1. GitHub Secretsの設定

GitHub リポジトリの Settings > Secrets and variables > Actions で以下のシークレットを設定します。

- `DEPLOY_SSH_KEY`: デプロイサーバーへのSSH秘密鍵
- `SLACK_WEBHOOK_URL`: Slack通知用のWebhook URL

### 8.2. ワークフローの確認

`.github/workflows/docker-deploy.yml`ファイルを確認し、必要に応じて設定を変更します。

### 8.3. 手動デプロイの実行

GitHub リポジトリの Actions > Docker Build and Deploy > Run workflow から手動でデプロイを実行できます。

- サービス: `all`, `hotel-saas`, または `hotel-common`
- バージョン: ブランチ名またはタグ名（デフォルトは`develop`）

## 9. 開発ワークフロー

### 9.1. ローカル開発

1. 開発用インフラの起動
   ```bash
   cd /path/to/hotel-kanri
   docker-compose -f config/docker/development/docker-compose.yml up -d
   ```

2. アプリケーションの開発
   ```bash
   cd /path/to/hotel-saas
   npm run dev
   ```

3. 変更のコミットとプッシュ
   ```bash
   git add .
   git commit -m "変更内容の説明"
   git push origin <ブランチ名>
   ```

### 9.2. CI/CDパイプライン

1. GitHub上でPull Requestを作成
2. コードレビューとテスト
3. developブランチへのマージ
4. 自動デプロイの実行（developブランチへのプッシュ時）

### 9.3. 本番デプロイ

1. developブランチからmainブランチへのマージ
2. 自動デプロイの実行（mainブランチへのプッシュ時）
3. デプロイ結果の確認

## 10. 参考リンク

- [Docker公式ドキュメント](https://docs.docker.com/)
- [docker-compose公式ドキュメント](https://docs.docker.com/compose/)
- [GitHub Actions公式ドキュメント](https://docs.github.com/en/actions)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
- [Node.js公式ドキュメント](https://nodejs.org/en/docs/)
