#!/bin/bash

# hotel-kanri統一管理: admin環境からのサーバーセットアップ
# 使用法: ./setup-from-admin.sh [サーバーIP] [adminパスワード]

set -e

if [ $# -lt 2 ]; then
  echo "使用法: $0 [サーバーIP] [adminパスワード]"
  echo "例: $0 163.44.117.60 admin_password"
  exit 1
fi

SERVER_IP=$1
ADMIN_PASSWORD=$2
echo "hotel-kanri統一管理: サーバーセットアップを開始します..."
echo "サーバーIP: $SERVER_IP"

# SSH接続用のエイリアス確認
if ! grep -q "omotenasu-dev" ~/.ssh/config; then
  echo "エラー: SSH設定 'omotenasu-dev' が見つかりません"
  exit 1
fi

echo "=== Phase 1: deployユーザー作成 ==="
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S useradd -m -s /bin/bash deploy 2>/dev/null || echo 'deployユーザーは既に存在します'"
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S usermod -aG sudo deploy"
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S bash -c \"echo 'deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/deploy\""
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S chmod 440 /etc/sudoers.d/deploy"

echo "=== Phase 2: 必要パッケージインストール ==="
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S apt update"
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S apt install -y nginx certbot python3-certbot-nginx postgresql postgresql-contrib git curl jq"

echo "=== Phase 3: アプリケーションディレクトリ構成 ==="
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S mkdir -p /opt/omotenasuai/{hotel-saas,hotel-member,hotel-pms,hotel-common,logs,backups,env}"
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S chown -R deploy:deploy /opt/omotenasuai"
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S chmod 755 /opt/omotenasuai"
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S chmod 700 /opt/omotenasuai/env"

echo "=== Phase 4: PostgreSQL設定 ==="
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S systemctl start postgresql"
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S systemctl enable postgresql"

# データベース・ユーザー作成
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S -u postgres psql << 'EOF'
CREATE DATABASE hotel_unified_db;
CREATE USER hotel_app WITH PASSWORD 'xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9';
GRANT ALL PRIVILEGES ON DATABASE hotel_unified_db TO hotel_app;
ALTER USER hotel_app CREATEDB;
\\q
EOF"

echo "=== Phase 5: Nginx設定 ==="
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S systemctl start nginx"
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S systemctl enable nginx"

echo "=== Phase 6: deployユーザーSSH設定 ==="
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S mkdir -p /home/deploy/.ssh"
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S chmod 700 /home/deploy/.ssh"
ssh omotenasu-dev "echo '$ADMIN_PASSWORD' | sudo -S chown deploy:deploy /home/deploy/.ssh"

echo ""
echo "✅ hotel-kanri統一管理: サーバーセットアップ完了！"
echo ""
echo "次の手順:"
echo "1. SSH公開鍵をdeployユーザーに追加:"
echo "   ssh-copy-id -i ~/.ssh/hotel_demo_deploy.pub deploy@$SERVER_IP"
echo ""
echo "2. GitHub SecretsにDEPLOY_SSH_KEYを設定"
echo ""
echo "3. hotel-kanriのGitHub Actionsでデプロイ実行"
echo ""
echo "データベース接続情報:"
echo "  DATABASE_URL=postgresql://hotel_app:xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9@localhost:5432/hotel_unified_db"
