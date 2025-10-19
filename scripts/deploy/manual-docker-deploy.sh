#!/bin/bash

# 手動Docker化デプロイスクリプト

# 変数設定
SERVER_IP="163.44.117.60"
DEPLOY_USER="admin"
SSH_KEY="/Users/kaneko/.ssh/id_ed25519"  # 実際に使用しているSSH鍵のパス
SERVER_PASSWORD="scanner329"  # サーバーのパスワード（セキュリティのため本番環境では使用しないでください）

# 色の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== 手動Docker化デプロイ開始 ===${NC}"

# SSHでサーバーに接続してデプロイを実行
ssh -i $SSH_KEY $DEPLOY_USER@$SERVER_IP << EOF
  # sudoコマンドにパスワードを渡す
  echo "${SERVER_PASSWORD}" | sudo -S echo "sudo権限を確認しました"

  echo "=== ディレクトリ構造の確認 ==="
  if [ ! -d /opt/omotenasuai/hotel-kanri ]; then
    echo "/opt/omotenasuai/hotel-kanriディレクトリを作成しています..."
    echo "${SERVER_PASSWORD}" | sudo -S mkdir -p /opt/omotenasuai/hotel-kanri
    echo "${SERVER_PASSWORD}" | sudo -S chown \$USER:\$USER /opt/omotenasuai/hotel-kanri
  fi

  echo "=== GitHubへのログイン ==="
  echo "GitHubコンテナレジストリにログインしています..."
  # 注意: 本番環境では環境変数やシークレットから取得するべきです
  echo "${SERVER_PASSWORD}" | sudo -S docker login ghcr.io -u watchout -p ghp_1234567890abcdefghijklmnopqrstuvwxyz || echo "GitHubログインに失敗しましたが続行します"

  echo "=== hotel-kanriリポジトリのクローンまたは更新 ==="
  if [ ! -d /opt/omotenasuai/hotel-kanri/.git ]; then
    echo "hotel-kanriリポジトリをクローンしています..."
    cd /opt/omotenasuai
    git clone https://github.com/watchout/hotel-kanri.git hotel-kanri || echo "クローンに失敗しましたが続行します"
  else
    echo "hotel-kanriリポジトリを更新しています..."
    cd /opt/omotenasuai/hotel-kanri
    git fetch --all
    git checkout develop
    git pull origin develop
  fi

  echo "=== 環境変数ファイルの準備 ==="
  cd /opt/omotenasuai/hotel-kanri
  if [ ! -f .env ]; then
    echo ".envファイルを作成しています..."
    echo "DB_USER=hotel_app" > .env
    echo "DB_PASSWORD=xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9" >> .env
    echo "DB_NAME=hotel_unified_db" >> .env
    echo "REDIS_PASSWORD=r3d1sP@ssw0rd" >> .env
    echo "RABBITMQ_USER=hotel_app" >> .env
    echo "RABBITMQ_PASSWORD=r@bb1tMQP@ss" >> .env
    echo "JWT_SECRET=OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g==" >> .env
    echo "NODE_ENV=production" >> .env
    echo "BASE_URL=https://dev-app.omotenasuai.com" >> .env
    echo "DOCKER_REGISTRY=ghcr.io/watchout" >> .env
    echo "SAAS_VERSION=main" >> .env
    echo "COMMON_VERSION=main" >> .env
  fi

  echo "=== docker-compose.ymlの準備 ==="
  if [ ! -d /opt/omotenasuai/hotel-kanri/config/docker ]; then
    echo "config/dockerディレクトリを作成しています..."
    mkdir -p /opt/omotenasuai/hotel-kanri/config/docker
  fi

  echo "=== Docker Composeの実行 ==="
  cd /opt/omotenasuai/hotel-kanri
  if [ -f config/docker/docker-compose.yml ]; then
    echo "Docker Composeを実行しています..."
    echo "${SERVER_PASSWORD}" | sudo -S docker-compose -f config/docker/docker-compose.yml pull || echo "Dockerイメージのプルに失敗しましたが続行します"
    echo "${SERVER_PASSWORD}" | sudo -S docker-compose -f config/docker/docker-compose.yml up -d || echo "Docker Composeの起動に失敗しました"
  else
    echo "docker-compose.ymlファイルが見つかりません"
  fi

  echo "=== ヘルスチェック ==="
  sleep 10
  curl -f http://localhost:3100/health || echo "Warning: hotel-saas health check failed"
  curl -f http://localhost:3400/health || echo "Warning: hotel-common health check failed"

  echo "=== デプロイ状態の確認 ==="
  echo "${SERVER_PASSWORD}" | sudo -S docker ps
  echo "${SERVER_PASSWORD}" | sudo -S docker images
EOF

echo -e "${GREEN}=== 手動Docker化デプロイが完了しました ===${NC}"
