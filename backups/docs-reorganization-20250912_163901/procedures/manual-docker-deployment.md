# 手動Docker化デプロイ手順書

**日付**: 2023年8月18日
**作成者**: hotel-kanri
**バージョン**: 1.0

## 1. 概要

本ドキュメントでは、GitHub Actionsワークフローが正常に動作するまでの間、手動でDocker化デプロイを行う手順を説明します。この手順は一時的なものであり、最終的にはCI/CDパイプラインを通じた自動デプロイに移行する予定です。

## 2. 前提条件

- サーバーへのSSHアクセス権限
- サーバー上にDockerとdocker-composeがインストールされていること
- GitHubリポジトリへのアクセス権限
- ローカルマシンにGitがインストールされていること

## 3. 準備作業

### 3.1. サーバー環境の確認

サーバー上のDocker環境を確認します。

```bash
# ローカルマシンで実行
cd /Users/kaneko/hotel-kanri
./scripts/deploy/check-server-docker.sh
```

Docker環境がセットアップされていない場合は、以下のコマンドでセットアップします。

```bash
# ローカルマシンで実行
cd /Users/kaneko/hotel-kanri
./scripts/deploy/setup-server-docker.sh
```

### 3.2. リポジトリの準備

最新のコードを取得します。

```bash
# ローカルマシンで実行
cd /Users/kaneko/hotel-saas
git checkout main
git pull origin main

cd /Users/kaneko/hotel-common
git checkout main
git pull origin main

cd /Users/kaneko/hotel-kanri
git checkout develop
git pull origin develop
```

## 4. Dockerイメージのビルドとプッシュ

### 4.1. hotel-saasのビルドとプッシュ

```bash
# ローカルマシンで実行（Dockerがインストールされている場合）
cd /Users/kaneko/hotel-saas
docker build -t ghcr.io/watchout/hotel-saas:main .
docker push ghcr.io/watchout/hotel-saas:main
```

### 4.2. hotel-commonのビルドとプッシュ

```bash
# ローカルマシンで実行（Dockerがインストールされている場合）
cd /Users/kaneko/hotel-common
docker build -t ghcr.io/watchout/hotel-common:main .
docker push ghcr.io/watchout/hotel-common:main
```

## 5. サーバー上でのデプロイ

### 5.1. サーバーへの接続

```bash
# ローカルマシンで実行
ssh deploy@163.44.117.60
```

### 5.2. hotel-kanriリポジトリの更新

```bash
# サーバー上で実行
cd /opt/omotenasuai/hotel-kanri
git fetch --all
git checkout develop
git pull origin develop
```

### 5.3. 環境変数ファイルの確認

```bash
# サーバー上で実行
cd /opt/omotenasuai/hotel-kanri
if [ ! -f .env ]; then
  cp templates/env/.env.template .env
  # 必要な環境変数を設定
  echo "DB_USER=hotel_app" >> .env
  echo "DB_PASSWORD=xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9" >> .env
  echo "DB_NAME=hotel_unified_db" >> .env
  echo "REDIS_PASSWORD=r3d1sP@ssw0rd" >> .env
  echo "RABBITMQ_USER=hotel_app" >> .env
  echo "RABBITMQ_PASSWORD=r@bb1tMQP@ss" >> .env
  echo "JWT_SECRET=OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g==" >> .env
  echo "NODE_ENV=production" >> .env
  echo "BASE_URL=https://dev-app.omotenasuai.com" >> .env
fi

# バージョン設定
echo "DOCKER_REGISTRY=ghcr.io/watchout" >> .env
echo "SAAS_VERSION=main" >> .env
echo "COMMON_VERSION=main" >> .env
```

### 5.4. Dockerイメージのプルと起動

```bash
# サーバー上で実行
cd /opt/omotenasuai/hotel-kanri
docker-compose -f config/docker/docker-compose.yml pull
docker-compose -f config/docker/docker-compose.yml up -d
```

### 5.5. ヘルスチェック

```bash
# サーバー上で実行
sleep 10
curl -f http://localhost:3100/health || echo "Warning: hotel-saas health check failed"
curl -f http://localhost:3400/health || echo "Warning: hotel-common health check failed"
```

## 6. デプロイ後の確認

### 6.1. コンテナの状態確認

```bash
# サーバー上で実行
docker ps
```

### 6.2. ログの確認

```bash
# サーバー上で実行
docker logs omotenasuai-saas
docker logs omotenasuai-common
```

### 6.3. アプリケーションの動作確認

ブラウザで以下のURLにアクセスして動作を確認します。

- https://dev-app.omotenasuai.com

## 7. トラブルシューティング

### 7.1. コンテナが起動しない場合

```bash
# サーバー上で実行
docker logs omotenasuai-saas
docker logs omotenasuai-common
```

### 7.2. イメージのプルに失敗する場合

```bash
# サーバー上で実行
# GitHubへのログイン
docker login ghcr.io -u <GitHubユーザー名> -p <個人アクセストークン>

# 再度プル
docker-compose -f config/docker/docker-compose.yml pull
```

### 7.3. 既存のコンテナを削除して再デプロイする場合

```bash
# サーバー上で実行
docker-compose -f config/docker/docker-compose.yml down
docker-compose -f config/docker/docker-compose.yml up -d
```

## 8. PM2環境へのロールバック

問題が発生した場合は、以下のコマンドでPM2環境に戻すことができます。

```bash
# サーバー上で実行
cd /opt/omotenasuai/hotel-kanri
./scripts/rollback/rollback-to-pm2.sh all
```

## 9. 注意事項

- この手順は一時的なものであり、最終的にはCI/CDパイプラインを通じた自動デプロイに移行する予定です
- 手動デプロイ後は、必ず動作確認を行ってください
- 問題が発生した場合は、すぐにロールバックを検討してください
- 環境変数の設定は慎重に行い、機密情報の取り扱いに注意してください
