#!/bin/bash

# Docker Compose環境変数問題を修正するスクリプト

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

echo -e "${YELLOW}=== Docker Compose環境変数問題の修正開始 ===${NC}"

# SSHでサーバーに接続して環境変数問題を修正
ssh -i $SSH_KEY $DEPLOY_USER@$SERVER_IP << EOF
  # sudoコマンドにパスワードを渡す
  echo "${SERVER_PASSWORD}" | sudo -S echo "sudo権限を確認しました"

  echo "=== 環境変数ファイルの確認 ==="
  cd /opt/omotenasuai/hotel-kanri
  if [ -f .env ]; then
    echo ".envファイルが存在します"
    echo "内容:"
    cat .env
  else
    echo ".envファイルが存在しません"
    exit 1
  fi

  echo -e "\n=== 環境変数ファイルをDocker Composeディレクトリにコピー ==="
  if [ ! -d config/docker ]; then
    echo "config/dockerディレクトリを作成します"
    mkdir -p config/docker
  fi
  cp .env config/docker/.env
  echo "環境変数ファイルをconfig/dockerディレクトリにコピーしました"

  echo -e "\n=== Docker Composeファイルの修正 ==="
  cd /opt/omotenasuai/hotel-kanri/config/docker
  
  # バックアップの作成
  if [ -f docker-compose.yml ]; then
    cp docker-compose.yml docker-compose.yml.bak
    echo "Docker Composeファイルのバックアップを作成しました"
    
    # イメージ名を直接指定するように修正
    echo "Docker Composeファイルを修正しています..."
    sed -i 's|\${DOCKER_REGISTRY}/hotel-saas:\${SAAS_VERSION}|ghcr.io/watchout/hotel-saas:develop|g' docker-compose.yml
    sed -i 's|\${DOCKER_REGISTRY}/hotel-common:\${COMMON_VERSION}|ghcr.io/watchout/hotel-common:develop|g' docker-compose.yml
    echo "Docker Composeファイルの修正が完了しました"
  else
    echo "Docker Composeファイルが見つかりません"
    exit 1
  fi

  echo -e "\n=== 修正したDocker Compose設定でのデプロイテスト ==="
  cd /opt/omotenasuai/hotel-kanri
  echo "${SERVER_PASSWORD}" | sudo -S docker-compose -f config/docker/docker-compose.yml --env-file .env pull || echo "Dockerイメージのプルに失敗しましたが続行します"
  echo "${SERVER_PASSWORD}" | sudo -S docker-compose -f config/docker/docker-compose.yml --env-file .env up -d || echo "Docker Composeの起動に失敗しました"

  echo -e "\n=== デプロイ状態の確認 ==="
  echo "${SERVER_PASSWORD}" | sudo -S docker ps
  echo "${SERVER_PASSWORD}" | sudo -S docker images
EOF

echo -e "${GREEN}=== Docker Compose環境変数問題の修正が完了しました ===${NC}"
