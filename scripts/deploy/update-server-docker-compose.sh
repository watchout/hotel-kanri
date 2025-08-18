#!/bin/bash

# サーバー上のDocker Compose設定を更新するスクリプト

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

echo -e "${YELLOW}=== サーバー上のDocker Compose設定更新開始 ===${NC}"

# docker-compose.ymlファイルを作成
cat > /tmp/docker-compose.yml << 'EOL'
version: '3.8'

services:
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx:/etc/nginx/conf.d
      - ./data/certbot/conf:/etc/letsencrypt
      - ./data/certbot/www:/var/www/certbot
    depends_on:
      - hotel-saas
      - hotel-common
    restart: always
    networks:
      - hotel-network

  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./config/postgres/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: always
    networks:
      - hotel-network

  redis:
    image: redis:7
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: always
    networks:
      - hotel-network

  rabbitmq:
    image: rabbitmq:3-management
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    restart: always
    networks:
      - hotel-network

  hotel-saas:
    image: ${DOCKER_REGISTRY}/hotel-saas:${SAAS_VERSION}
    environment:
      NODE_ENV: ${NODE_ENV}
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USER: ${RABBITMQ_USER}
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      BASE_URL: ${BASE_URL}
    ports:
      - "3100:3100"
    depends_on:
      - postgres
      - redis
      - rabbitmq
      - hotel-common
    restart: always
    networks:
      - hotel-network

  hotel-common:
    image: ${DOCKER_REGISTRY}/hotel-common:${COMMON_VERSION}
    environment:
      NODE_ENV: ${NODE_ENV}
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USER: ${RABBITMQ_USER}
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3400:3400"
    depends_on:
      - postgres
      - redis
      - rabbitmq
    restart: always
    networks:
      - hotel-network

networks:
  hotel-network:
    driver: bridge

volumes:
  postgres-data:
  redis-data:
  rabbitmq-data:
EOL

# SSHでサーバーに接続してDocker Compose設定を更新
scp -i $SSH_KEY /tmp/docker-compose.yml $DEPLOY_USER@$SERVER_IP:/tmp/docker-compose.yml

ssh -i $SSH_KEY $DEPLOY_USER@$SERVER_IP << EOF
  # sudoコマンドにパスワードを渡す
  echo "${SERVER_PASSWORD}" | sudo -S echo "sudo権限を確認しました"

  echo "=== ディレクトリ構造の確認 ==="
  if [ ! -d /opt/omotenasuai/hotel-kanri/config/docker ]; then
    echo "config/dockerディレクトリを作成しています..."
    echo "${SERVER_PASSWORD}" | sudo -S mkdir -p /opt/omotenasuai/hotel-kanri/config/docker
    echo "${SERVER_PASSWORD}" | sudo -S chown \$USER:\$USER /opt/omotenasuai/hotel-kanri/config/docker
  fi

  echo "=== Docker Compose設定ファイルの更新 ==="
  cp /tmp/docker-compose.yml /opt/omotenasuai/hotel-kanri/config/docker/docker-compose.yml
  echo "Docker Compose設定ファイルを更新しました"
  
  echo "=== 環境変数ファイルの確認 ==="
  if [ ! -f /opt/omotenasuai/hotel-kanri/.env ]; then
    echo ".envファイルを作成しています..."
    cat > /opt/omotenasuai/hotel-kanri/.env << EOFENV
DB_USER=hotel_app
DB_PASSWORD=xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9
DB_NAME=hotel_unified_db
REDIS_PASSWORD=r3d1sP@ssw0rd
RABBITMQ_USER=hotel_app
RABBITMQ_PASSWORD=r@bb1tMQP@ss
JWT_SECRET=OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g==
NODE_ENV=production
BASE_URL=https://dev-app.omotenasuai.com
DOCKER_REGISTRY=ghcr.io/watchout
SAAS_VERSION=develop
COMMON_VERSION=develop
EOFENV
    echo ".envファイルを作成しました"
  else
    echo ".envファイルはすでに存在します"
    # DOCKER_REGISTRYとバージョン設定を追加/更新
    if ! grep -q "DOCKER_REGISTRY" /opt/omotenasuai/hotel-kanri/.env; then
      echo "DOCKER_REGISTRY=ghcr.io/watchout" >> /opt/omotenasuai/hotel-kanri/.env
    fi
    if ! grep -q "SAAS_VERSION" /opt/omotenasuai/hotel-kanri/.env; then
      echo "SAAS_VERSION=develop" >> /opt/omotenasuai/hotel-kanri/.env
    fi
    if ! grep -q "COMMON_VERSION" /opt/omotenasuai/hotel-kanri/.env; then
      echo "COMMON_VERSION=develop" >> /opt/omotenasuai/hotel-kanri/.env
    fi
  fi
EOF

echo -e "${GREEN}=== サーバー上のDocker Compose設定更新が完了しました ===${NC}"
