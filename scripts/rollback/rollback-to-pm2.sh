#!/bin/bash

# Docker環境からPM2環境へのロールバックスクリプト
# 使用法: ./rollback-to-pm2.sh [サービス名]
# 例: ./rollback-to-pm2.sh hotel-saas
#     ./rollback-to-pm2.sh all

set -e

# 色の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# 引数チェック
if [ $# -lt 1 ]; then
  echo -e "${RED}使用法: $0 [サービス名]${NC}"
  echo -e "${YELLOW}サービス名: hotel-saas, hotel-common, all${NC}"
  exit 1
fi

SERVICE=$1
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="/opt/omotenasuai/backups"

# バックアップディレクトリの作成
mkdir -p $BACKUP_DIR

echo -e "${YELLOW}=== Docker環境からPM2環境へのロールバック開始 ===${NC}"
echo -e "${YELLOW}サービス: $SERVICE${NC}"
echo -e "${YELLOW}タイムスタンプ: $TIMESTAMP${NC}"

# Dockerコンテナの状態確認
echo -e "${YELLOW}Dockerコンテナの状態確認...${NC}"
docker ps -a

# データベースのバックアップ（必要に応じて）
if docker ps | grep -q "omotenasuai-postgres"; then
  echo -e "${YELLOW}データベースのバックアップを作成しています...${NC}"
  docker exec -t omotenasuai-postgres pg_dumpall -c -U hotel_app > $BACKUP_DIR/db_backup_$TIMESTAMP.sql
  echo -e "${GREEN}データベースのバックアップを作成しました: $BACKUP_DIR/db_backup_$TIMESTAMP.sql${NC}"
else
  echo -e "${YELLOW}PostgreSQLコンテナが実行されていません。データベースのバックアップはスキップします。${NC}"
fi

# Docker環境の停止
echo -e "${YELLOW}Docker環境を停止しています...${NC}"
cd /opt/omotenasuai/hotel-kanri
docker-compose -f config/docker/docker-compose.yml down || echo -e "${YELLOW}Docker環境の停止に失敗しましたが、続行します...${NC}"

# PM2環境の復元
if [ "$SERVICE" = "hotel-saas" ] || [ "$SERVICE" = "all" ]; then
  echo -e "${YELLOW}hotel-saasをPM2環境に復元しています...${NC}"
  
  # hotel-saasリポジトリの更新
  cd /opt/omotenasuai/hotel-saas
  git fetch --all
  git checkout main
  git pull
  
  # 依存関係のインストールとビルド
  echo -e "${YELLOW}依存関係をインストールしています...${NC}"
  npm install --legacy-peer-deps
  
  echo -e "${YELLOW}アプリケーションをビルドしています...${NC}"
  npm run build
  
  # PM2でサービスを起動
  echo -e "${YELLOW}PM2でhotel-saasを起動しています...${NC}"
  cd /opt/omotenasuai
  pm2 start ecosystem.config.js --only hotel-saas || pm2 restart hotel-saas
  
  echo -e "${GREEN}hotel-saasをPM2環境に復元しました${NC}"
fi

if [ "$SERVICE" = "hotel-common" ] || [ "$SERVICE" = "all" ]; then
  echo -e "${YELLOW}hotel-commonをPM2環境に復元しています...${NC}"
  
  # hotel-commonリポジトリの更新
  cd /opt/omotenasuai/hotel-common
  git fetch --all
  git checkout main
  git pull
  
  # 依存関係のインストールとビルド
  echo -e "${YELLOW}依存関係をインストールしています...${NC}"
  npm install
  
  echo -e "${YELLOW}アプリケーションをビルドしています...${NC}"
  npm run build
  
  # PM2でサービスを起動
  echo -e "${YELLOW}PM2でhotel-commonを起動しています...${NC}"
  cd /opt/omotenasuai
  pm2 start ecosystem.config.js --only hotel-common || pm2 restart hotel-common
  
  echo -e "${GREEN}hotel-commonをPM2環境に復元しました${NC}"
fi

# サービスの動作確認
echo -e "${YELLOW}サービスの動作を確認しています...${NC}"
pm2 status

# ヘルスチェック
echo -e "${YELLOW}ヘルスチェックを実行しています...${NC}"
if [ "$SERVICE" = "hotel-saas" ] || [ "$SERVICE" = "all" ]; then
  if curl -s -f http://localhost:3100/health > /dev/null; then
    echo -e "${GREEN}hotel-saasのヘルスチェックに成功しました${NC}"
  else
    echo -e "${RED}hotel-saasのヘルスチェックに失敗しました${NC}"
  fi
fi

if [ "$SERVICE" = "hotel-common" ] || [ "$SERVICE" = "all" ]; then
  if curl -s -f http://localhost:3400/health > /dev/null; then
    echo -e "${GREEN}hotel-commonのヘルスチェックに成功しました${NC}"
  else
    echo -e "${RED}hotel-commonのヘルスチェックに失敗しました${NC}"
  fi
fi

# Nginxの再起動
echo -e "${YELLOW}Nginxを再起動しています...${NC}"
sudo systemctl restart nginx

echo -e "${GREEN}=== ロールバックが完了しました ===${NC}"
echo -e "${YELLOW}PM2のステータス:${NC}"
pm2 status

echo -e "${YELLOW}注意: ロールバック後の動作を十分に確認してください${NC}"
echo -e "${YELLOW}問題が発生した場合は、ログを確認してください: pm2 logs${NC}"
