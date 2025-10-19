#!/bin/bash

# サーバー上にDocker環境をセットアップするスクリプト（非対話モード）

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

echo -e "${YELLOW}=== サーバー上のDocker環境セットアップ（非対話モード） ===${NC}"

# SSHでサーバーに接続して各種セットアップを実行
ssh -i $SSH_KEY $DEPLOY_USER@$SERVER_IP << EOF
  # sudoコマンドにパスワードを渡す
  echo "${SERVER_PASSWORD}" | sudo -S echo "sudo権限を確認しました"

  echo "=== システム更新 ==="
  echo "${SERVER_PASSWORD}" | sudo -S apt-get update
  echo "${SERVER_PASSWORD}" | sudo -S apt-get upgrade -y

  echo -e "\n=== Dockerのインストール ==="
  if ! command -v docker &> /dev/null; then
    echo "Dockerをインストールしています..."
    echo "${SERVER_PASSWORD}" | sudo -S apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo -S apt-key add -
    echo "${SERVER_PASSWORD}" | sudo -S add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu \$(lsb_release -cs) stable"
    echo "${SERVER_PASSWORD}" | sudo -S apt-get update
    echo "${SERVER_PASSWORD}" | sudo -S apt-get install -y docker-ce docker-ce-cli containerd.io
    echo "Dockerのインストールが完了しました"
  else
    echo "Dockerはすでにインストールされています"
    docker --version
  fi

  echo -e "\n=== Docker Composeのインストール ==="
  if ! command -v docker-compose &> /dev/null; then
    echo "Docker Composeをインストールしています..."
    echo "${SERVER_PASSWORD}" | sudo -S curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
    echo "${SERVER_PASSWORD}" | sudo -S chmod +x /usr/local/bin/docker-compose
    echo "Docker Composeのインストールが完了しました"
  else
    echo "Docker Composeはすでにインストールされています"
    docker-compose --version
  fi

  echo -e "\n=== Dockerサービスの有効化 ==="
  echo "${SERVER_PASSWORD}" | sudo -S systemctl start docker
  echo "${SERVER_PASSWORD}" | sudo -S systemctl enable docker
  echo "Dockerサービスが有効化されました"

  echo -e "\n=== ユーザー権限の設定 ==="
  if ! groups | grep -q docker; then
    echo "ユーザーをdockerグループに追加しています..."
    echo "${SERVER_PASSWORD}" | sudo -S usermod -aG docker \$USER
    echo "ユーザーがdockerグループに追加されました。変更を適用するにはログアウトして再ログインしてください。"
  else
    echo "ユーザーはすでにdockerグループに所属しています"
  fi
  
  echo -e "\n=== ディレクトリ構造の作成 ==="
  if [ ! -d /opt/omotenasuai/hotel-kanri ]; then
    echo "/opt/omotenasuai/hotel-kanriディレクトリを作成しています..."
    echo "${SERVER_PASSWORD}" | sudo -S mkdir -p /opt/omotenasuai/hotel-kanri
    echo "${SERVER_PASSWORD}" | sudo -S chown \$USER:\$USER /opt/omotenasuai/hotel-kanri
    echo "/opt/omotenasuai/hotel-kanriディレクトリが作成されました"
  else
    echo "/opt/omotenasuai/hotel-kanriディレクトリはすでに存在します"
  fi
  
  echo -e "\n=== hotel-kanriリポジトリのクローン ==="
  if [ ! -d /opt/omotenasuai/hotel-kanri/.git ]; then
    echo "hotel-kanriリポジトリをクローンしています..."
    cd /opt/omotenasuai
    git clone git@github.com:watchout/hotel-kanri.git hotel-kanri
    echo "hotel-kanriリポジトリがクローンされました"
  else
    echo "hotel-kanriリポジトリはすでにクローンされています"
    cd /opt/omotenasuai/hotel-kanri
    git fetch --all
    git checkout develop
    git pull origin develop
    echo "hotel-kanriリポジトリが最新の状態に更新されました"
  fi
  
  echo -e "\n=== 環境変数ファイルの準備 ==="
  cd /opt/omotenasuai/hotel-kanri
  if [ ! -f .env ]; then
    echo ".envファイルを作成しています..."
    if [ -f templates/env/.env.template ]; then
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
      echo "DOCKER_REGISTRY=ghcr.io/watchout" >> .env
      echo "SAAS_VERSION=main" >> .env
      echo "COMMON_VERSION=main" >> .env
      echo ".envファイルが作成されました"
    else
      echo "templates/env/.env.templateが見つかりません"
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
      echo ".envファイルが作成されました（テンプレートなし）"
    fi
  else
    echo ".envファイルはすでに存在します"
  fi
  
  echo -e "\n=== セットアップ完了 ==="
  echo "Docker環境のセットアップが完了しました"
  echo "現在のDocker状態:"
  docker --version
  if command -v docker-compose &> /dev/null; then
    docker-compose --version
  else
    echo "Docker Composeはまだインストールされていません"
  fi
  docker ps -a
EOF

echo -e "${GREEN}=== サーバー上のDocker環境セットアップが完了しました ===${NC}"
