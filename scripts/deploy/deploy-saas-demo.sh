#!/bin/bash

# hotel-saasデモ環境デプロイスクリプト
# 使用法: ./deploy-saas-demo.sh [サーバーIP] [CloudflareAPIトークン]
# 例: ./deploy-saas-demo.sh 192.168.1.100 your-cloudflare-api-token

set -e

# 引数チェック
if [ $# -lt 2 ]; then
  echo "使用法: $0 [サーバーIP] [CloudflareAPIトークン]"
  echo "例: $0 192.168.1.100 your-cloudflare-api-token"
  exit 1
fi

# 変数設定
SERVER_IP=$1
CLOUDFLARE_API_TOKEN=$2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="dev-app.omotenasuai.com"
REPO_URL="https://github.com/your-org/hotel-saas.git"
APP_DIR="/opt/omotenasuai/hotel-saas"
DB_USER="hotel_saas"
DB_NAME="hotel_saas"
DB_PASSWORD=$(openssl rand -base64 16)
JWT_SECRET=$(openssl rand -base64 32)

echo "hotel-saasデモ環境のデプロイを開始します..."
echo "サーバーIP: $SERVER_IP"
echo "ドメイン: $DOMAIN"

# サーバーへの接続テスト
echo "サーバーへの接続をテストしています..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes deploy@$SERVER_IP "echo 接続成功"; then
  echo "エラー: サーバーに接続できません。SSHの設定を確認してください。"
  exit 1
fi

# 必要なパッケージのインストール
echo "必要なパッケージをインストールしています..."
ssh deploy@$SERVER_IP "sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx git curl"

# Node.jsのインストール
echo "Node.jsをインストールしています..."
ssh deploy@$SERVER_IP "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"

# PostgreSQLのインストール
echo "PostgreSQLをインストールしています..."
ssh deploy@$SERVER_IP "sudo apt install -y postgresql postgresql-contrib"

# PM2のインストール
echo "PM2をインストールしています..."
ssh deploy@$SERVER_IP "sudo npm install -g pm2"

# アプリケーションディレクトリの作成
echo "アプリケーションディレクトリを作成しています..."
ssh deploy@$SERVER_IP "sudo mkdir -p /opt/omotenasuai && sudo chown deploy:deploy /opt/omotenasuai"

# リポジトリのクローン
echo "リポジトリをクローンしています..."
ssh deploy@$SERVER_IP "cd /opt/omotenasuai && git clone $REPO_URL hotel-saas"

# 依存関係のインストール
echo "依存関係をインストールしています..."
ssh deploy@$SERVER_IP "cd $APP_DIR && npm install"

# データベースのセットアップ
echo "データベースをセットアップしています..."
ssh deploy@$SERVER_IP "sudo -u postgres psql -c \"CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';\" || true"
ssh deploy@$SERVER_IP "sudo -u postgres psql -c \"CREATE DATABASE $DB_NAME OWNER $DB_USER;\" || true"

# 環境変数の設定
echo "環境変数を設定しています..."
cat > /tmp/env_file << EOF
# アプリケーション設定
PORT=3100
NODE_ENV=production
BASE_URL=https://$DOMAIN

# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# JWT認証
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# API連携
API_URL=https://api.dev.omotenasuai.com
PMS_API_URL=https://pms.dev.omotenasuai.com/api
MEMBER_API_URL=https://member.dev.omotenasuai.com/api

# イベントバス設定
EVENT_BUS_URL=amqp://localhost
EVENT_BUS_EXCHANGE=hotel_events
EOF

scp /tmp/env_file deploy@$SERVER_IP:$APP_DIR/.env
rm /tmp/env_file

# マイグレーションの実行
echo "マイグレーションを実行しています..."
ssh deploy@$SERVER_IP "cd $APP_DIR && npx prisma migrate deploy || npx prisma db push --accept-data-loss"

# アプリケーションのビルドと起動
echo "アプリケーションをビルドして起動しています..."
ssh deploy@$SERVER_IP "cd $APP_DIR && npm run build && pm2 start ecosystem.config.js && pm2 save"
ssh deploy@$SERVER_IP "pm2 startup | tail -n 1 | bash"

# Cloudflare DNSレコードの設定
echo "Cloudflare DNSレコードを設定しています..."
ZONE_ID=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones?name=omotenasuai.com" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" | jq -r '.result[0].id')

curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "{\"type\":\"A\",\"name\":\"dev-app\",\"content\":\"$SERVER_IP\",\"ttl\":1,\"proxied\":false}"

# SSL証明書の取得
echo "SSL証明書を取得しています..."
ssh deploy@$SERVER_IP "sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@omotenasuai.com"

# Nginx設定ファイルの作成
echo "Nginx設定ファイルを作成しています..."
cat > /tmp/nginx_conf << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # HTTP -> HTTPS リダイレクト
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # プロキシ設定
    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 静的ファイル
    location /static/ {
        alias $APP_DIR/.output/public/static/;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
    
    # ヘルスチェック
    location /health {
        access_log off;
        return 200 "OK";
    }
}
EOF

scp /tmp/nginx_conf deploy@$SERVER_IP:/tmp/nginx_conf
ssh deploy@$SERVER_IP "sudo mv /tmp/nginx_conf /etc/nginx/conf.d/$DOMAIN.conf"
rm /tmp/nginx_conf

# Nginxの設定テストと再起動
echo "Nginx設定をテストして再起動しています..."
ssh deploy@$SERVER_IP "sudo nginx -t && sudo systemctl reload nginx"

# 自動更新の設定
echo "自動更新を設定しています..."
ssh deploy@$SERVER_IP "echo \"0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'\" | sudo tee -a /etc/crontab"
ssh deploy@$SERVER_IP "echo \"0 4 * * * cd $APP_DIR && git pull && npm install && npm run build && pm2 restart all\" | sudo tee -a /etc/crontab"

# デプロイ後の確認
echo "デプロイ後の確認を行っています..."
echo "PM2のステータス:"
ssh deploy@$SERVER_IP "pm2 status"

echo "Nginxのステータス:"
ssh deploy@$SERVER_IP "sudo systemctl status nginx | head -n 10"

echo "アクセス確認:"
curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/health" || echo "警告: $DOMAIN は応答していません"

echo "hotel-saasデモ環境のデプロイが完了しました！"
echo "アクセスURL: https://$DOMAIN"
echo "データベース情報: DB_USER=$DB_USER, DB_NAME=$DB_NAME, DB_PASSWORD=$DB_PASSWORD"
echo "※パスワード情報は安全な場所に保管してください。"

exit 0
