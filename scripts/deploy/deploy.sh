#!/bin/bash

# omotenasuai.com デプロイスクリプト
# 使用法: ./deploy.sh [環境] [サービス]
# 例: ./deploy.sh dev all
#     ./deploy.sh prod hotel-common

set -e

# 引数チェック
if [ $# -lt 2 ]; then
  echo "使用法: $0 [環境] [サービス]"
  echo "環境: dev, test, prod"
  echo "サービス: hotel-common, hotel-saas, hotel-pms, hotel-member, all"
  exit 1
fi

# 変数設定
ENV=$1
SERVICE=$2
TIMESTAMP=$(date +%Y%m%d%H%M%S)
DEPLOY_DIR="/opt/omotenasuai"
BACKUP_DIR="/opt/backups"

# 環境設定
case $ENV in
  dev)
    SERVER="dev.omotenasuai.com"
    BRANCH="develop"
    ;;
  test)
    SERVER="test.omotenasuai.com"
    BRANCH="release"
    ;;
  prod)
    SERVER="www.omotenasuai.com"
    BRANCH="main"
    ;;
  *)
    echo "不正な環境: $ENV"
    exit 1
    ;;
esac

# デプロイ関数
deploy_service() {
  local service=$1
  local repo="git@github.com:example/$service.git"
  
  echo "[$service] デプロイを開始します..."
  
  # バックアップ作成
  echo "[$service] バックアップを作成しています..."
  ssh deploy@$SERVER "mkdir -p $BACKUP_DIR && \
    if [ -d $DEPLOY_DIR/$service ]; then \
      cp -r $DEPLOY_DIR/$service $BACKUP_DIR/${service}_$TIMESTAMP; \
    fi"
  
  # リポジトリクローンまたは更新
  echo "[$service] コードを更新しています..."
  ssh deploy@$SERVER "mkdir -p $DEPLOY_DIR && \
    if [ -d $DEPLOY_DIR/$service ]; then \
      cd $DEPLOY_DIR/$service && \
      git fetch --all && \
      git checkout $BRANCH && \
      git pull; \
    else \
      cd $DEPLOY_DIR && \
      git clone -b $BRANCH $repo $service; \
    fi"
  
  # 依存関係インストールとビルド
  echo "[$service] 依存関係をインストールしています..."
  ssh deploy@$SERVER "cd $DEPLOY_DIR/$service && npm ci"
  
  echo "[$service] アプリケーションをビルドしています..."
  ssh deploy@$SERVER "cd $DEPLOY_DIR/$service && npm run build"
  
  # 環境変数設定
  echo "[$service] 環境変数を設定しています..."
  ssh deploy@$SERVER "if [ ! -f $DEPLOY_DIR/$service/.env ]; then \
    cp $DEPLOY_DIR/$service/.env.example $DEPLOY_DIR/$service/.env; \
  fi"
  
  # アプリケーション再起動
  echo "[$service] アプリケーションを再起動しています..."
  ssh deploy@$SERVER "cd $DEPLOY_DIR && pm2 reload ecosystem.config.js --only $service --env $ENV"
  
  echo "[$service] デプロイが完了しました！"
}

# メインデプロイ処理
echo "環境: $ENV"
echo "サーバー: $SERVER"

if [ "$SERVICE" = "all" ]; then
  # 全サービスデプロイ
  deploy_service "hotel-common"
  deploy_service "hotel-saas"
  deploy_service "hotel-pms"
  deploy_service "hotel-member"
else
  # 単一サービスデプロイ
  deploy_service "$SERVICE"
fi

# Nginxリロード
echo "Nginxを再読み込みしています..."
ssh deploy@$SERVER "sudo systemctl reload nginx"

echo "デプロイが正常に完了しました！"
exit 0