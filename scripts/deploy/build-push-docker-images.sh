#!/bin/bash

# Dockerイメージをビルドしてプッシュするスクリプト

# 変数設定
DOCKER_REGISTRY="ghcr.io/watchout"
VERSION="develop"  # または特定のバージョン/タグを指定

# 色の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# GitHubトークンの入力を求める
echo -e "${YELLOW}GitHubコンテナレジストリの認証情報を入力してください${NC}"
read -p "GitHubユーザー名: " GITHUB_USERNAME
read -sp "GitHubトークン（画面に表示されません）: " GITHUB_TOKEN
echo ""

echo -e "${YELLOW}=== Dockerイメージのビルドとプッシュ開始 ===${NC}"

# GitHubコンテナレジストリにログイン
echo "GitHubコンテナレジストリにログインしています..."
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin
if [ $? -ne 0 ]; then
  echo -e "${RED}GitHubコンテナレジストリへのログインに失敗しました${NC}"
  exit 1
fi

# hotel-saasのDockerイメージをビルドしてプッシュ
echo -e "\n=== hotel-saasのDockerイメージをビルド・プッシュ ==="
if [ -d "/Users/kaneko/hotel-saas" ]; then
  cd /Users/kaneko/hotel-saas
  echo "hotel-saasディレクトリに移動しました"
  
  # Dockerfileが存在するか確認
  if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}Dockerfileが見つかりません${NC}"
    exit 1
  fi
  
  # イメージをビルド
  echo "Dockerイメージをビルドしています..."
  docker build -t ${DOCKER_REGISTRY}/hotel-saas:${VERSION} .
  if [ $? -ne 0 ]; then
    echo -e "${RED}hotel-saasのDockerイメージのビルドに失敗しました${NC}"
    exit 1
  fi
  
  # イメージをプッシュ
  echo "Dockerイメージをプッシュしています..."
  docker push ${DOCKER_REGISTRY}/hotel-saas:${VERSION}
  if [ $? -ne 0 ]; then
    echo -e "${RED}hotel-saasのDockerイメージのプッシュに失敗しました${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}hotel-saasのDockerイメージのビルドとプッシュが完了しました${NC}"
else
  echo -e "${RED}hotel-saasディレクトリが見つかりません${NC}"
fi

# hotel-commonのDockerイメージをビルドしてプッシュ
echo -e "\n=== hotel-commonのDockerイメージをビルド・プッシュ ==="
if [ -d "/Users/kaneko/hotel-common" ]; then
  cd /Users/kaneko/hotel-common
  echo "hotel-commonディレクトリに移動しました"
  
  # Dockerfileが存在するか確認
  if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}Dockerfileが見つかりません${NC}"
    exit 1
  fi
  
  # イメージをビルド
  echo "Dockerイメージをビルドしています..."
  docker build -t ${DOCKER_REGISTRY}/hotel-common:${VERSION} .
  if [ $? -ne 0 ]; then
    echo -e "${RED}hotel-commonのDockerイメージのビルドに失敗しました${NC}"
    exit 1
  fi
  
  # イメージをプッシュ
  echo "Dockerイメージをプッシュしています..."
  docker push ${DOCKER_REGISTRY}/hotel-common:${VERSION}
  if [ $? -ne 0 ]; then
    echo -e "${RED}hotel-commonのDockerイメージのプッシュに失敗しました${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}hotel-commonのDockerイメージのビルドとプッシュが完了しました${NC}"
else
  echo -e "${RED}hotel-commonディレクトリが見つかりません${NC}"
fi

echo -e "${GREEN}=== Dockerイメージのビルドとプッシュが完了しました ===${NC}"
