#!/bin/bash

# GitHub Actions専用サーバーセットアップスクリプト
# 使用法: ./setup-github-deploy-server.sh [サーバーIP]

set -e

if [ $# -lt 1 ]; then
  echo "使用法: $0 [サーバーIP]"
  echo "例: $0 163.44.117.60"
  exit 1
fi

SERVER_IP=$1
echo "GitHub Actions用サーバーセットアップを開始します..."
echo "サーバーIP: $SERVER_IP"

# GitHub Actions用deployユーザーの作成
echo "GitHub Actions用deployユーザーを作成しています..."
ssh root@$SERVER_IP "
  set -e
  
  # deployユーザー作成（PM2ベース設計）
  useradd -m -s /bin/bash deploy
  usermod -aG sudo deploy
  
  # sudoでパスワード不要に設定
  echo 'deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/deploy
  chmod 440 /etc/sudoers.d/deploy
  
  # SSH公開鍵認証用ディレクトリ準備
  mkdir -p /home/deploy/.ssh
  chmod 700 /home/deploy/.ssh
  chown deploy:deploy /home/deploy/.ssh
"

# 基本パッケージのインストール
echo "基本パッケージをインストールしています..."
ssh root@$SERVER_IP "
  set -e
  apt update && apt upgrade -y
  
  # 必須パッケージ
  apt install -y nginx certbot python3-certbot-nginx git curl jq
  
  # Node.js 18.x
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt install -y nodejs
  
  # PM2グローバルインストール
  npm install -g pm2
  
  # PostgreSQL
  apt install -y postgresql postgresql-contrib
"

# アプリケーションディレクトリ構成（PM2ベース）
echo "アプリケーションディレクトリを構成しています..."
ssh root@$SERVER_IP "
  set -e
  
  # ディレクトリ作成
  mkdir -p /opt/omotenasuai/{hotel-saas,hotel-member,hotel-pms,hotel-common,logs,backups,env}
  
  # deployユーザーに所有権付与（PM2ベース設計）
  chown -R deploy:deploy /opt/omotenasuai
  chmod 755 /opt/omotenasuai
  chmod 700 /opt/omotenasuai/env
"

# PostgreSQL設定
echo "PostgreSQLを設定しています..."
ssh root@$SERVER_IP "
  set -e
  
  # PostgreSQL起動・有効化
  systemctl start postgresql
  systemctl enable postgresql
  
  # hotel_unified_db + hotel_appユーザー作成
  sudo -u postgres psql << 'EOF'
CREATE DATABASE hotel_unified_db;
CREATE USER hotel_app WITH PASSWORD 'xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9';
GRANT ALL PRIVILEGES ON DATABASE hotel_unified_db TO hotel_app;
ALTER USER hotel_app CREATEDB;
EOF
"

# Nginx基本設定
echo "Nginx基本設定を行っています..."
ssh root@$SERVER_IP "
  set -e
  
  # Nginx起動・有効化
  systemctl start nginx
  systemctl enable nginx
  
  # 基本設定の確認
  nginx -t
"

# PM2のセットアップ
echo "PM2をセットアップしています..."
ssh root@$SERVER_IP "
  set -e
  
  # deployユーザーでPM2初期化
  sudo -u deploy pm2 startup
  
  # PM2の自動起動設定
  sudo env PATH=\$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deploy --hp /home/deploy
"

echo ""
echo "✅ GitHub Actions用サーバーセットアップ完了！"
echo ""
echo "次の手順:"
echo "1. GitHub SecretsにDEPLOY_SSH_KEYを設定"
echo "   - 秘密鍵: ~/.ssh/hotel_demo_deploy"
echo "   - 公開鍵をサーバーに追加:"
echo "     ssh-copy-id -i ~/.ssh/hotel_demo_deploy.pub deploy@$SERVER_IP"
echo ""
echo "2. リポジトリのdevelopブランチにプッシュしてGitHub Actionsテスト"
echo ""
echo "3. デプロイ確認:"
echo "   - https://dev-app.omotenasuai.com"
echo "   - https://dev-api.omotenasuai.com"
echo ""
echo "データベース接続情報:"
echo "  DATABASE_URL=postgresql://hotel_app:xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9@localhost:5432/hotel_unified_db"
