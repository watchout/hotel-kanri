#!/bin/bash

# 開発サーバードメイン設定スクリプト
# 使用法: ./setup-dev-domains.sh [サーバーIP]
# 例: ./setup-dev-domains.sh 192.168.1.100

set -e

# 引数チェック
if [ $# -lt 1 ]; then
  echo "使用法: $0 [サーバーIP]"
  exit 1
fi

# 変数設定
SERVER_IP=$1
BASE_DOMAIN="dev.omotenasuai.com"
SUBDOMAINS=("saas" "pms" "member" "api")
EMAIL="admin@omotenasuai.com"
NGINX_CONF_DIR="/etc/nginx/conf.d"
SSL_DIR="/etc/letsencrypt/live/$BASE_DOMAIN"

echo "開発サーバードメイン設定を開始します..."
echo "サーバーIP: $SERVER_IP"
echo "ベースドメイン: $BASE_DOMAIN"

# SSHで接続してセットアップを実行
ssh_execute() {
  ssh deploy@$SERVER_IP "$1"
}

# 必要なパッケージのインストール
echo "必要なパッケージをインストールしています..."
ssh_execute "sudo apt-get update && sudo apt-get install -y nginx certbot python3-certbot-dns-cloudflare"

# Cloudflare APIトークン設定
echo "Cloudflare API設定を作成しています..."
ssh_execute "echo \"dns_cloudflare_api_token = \$CLOUDFLARE_API_TOKEN\" > ~/cloudflare.ini"
ssh_execute "chmod 600 ~/cloudflare.ini"

# SSL証明書の取得
echo "SSL証明書を取得しています..."
ssh_execute "sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials ~/cloudflare.ini -d $BASE_DOMAIN -d *.$BASE_DOMAIN --agree-tos --email $EMAIL --non-interactive"

# Nginxの設定ファイル作成
echo "Nginx設定ファイルを作成しています..."

# メインドメイン設定
cat > /tmp/main.conf << EOF
server {
    listen 80;
    server_name $BASE_DOMAIN;
    
    # HTTP -> HTTPS リダイレクト
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $BASE_DOMAIN;
    
    ssl_certificate     $SSL_DIR/fullchain.pem;
    ssl_certificate_key $SSL_DIR/privkey.pem;
    
    # 共通基盤
    location / {
        proxy_pass http://localhost:3400;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # ヘルスチェック
    location /health {
        access_log off;
        return 200 "OK";
    }
}
EOF

# サブドメイン設定
for subdomain in "${SUBDOMAINS[@]}"; do
  case $subdomain in
    saas)
      PORT=3100
      ;;
    pms)
      PORT=3300
      ;;
    member)
      PORT=3200
      ;;
    api)
      PORT=3400
      ;;
    *)
      PORT=3400
      ;;
  esac

  cat > /tmp/$subdomain.conf << EOF
server {
    listen 80;
    server_name $subdomain.$BASE_DOMAIN;
    
    # HTTP -> HTTPS リダイレクト
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $subdomain.$BASE_DOMAIN;
    
    ssl_certificate     $SSL_DIR/fullchain.pem;
    ssl_certificate_key $SSL_DIR/privkey.pem;
    
    location / {
        proxy_pass http://localhost:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # ヘルスチェック
    location /health {
        access_log off;
        return 200 "OK";
    }
}
EOF
done

# 設定ファイルをサーバーにコピー
echo "設定ファイルをサーバーにコピーしています..."
scp /tmp/main.conf deploy@$SERVER_IP:/tmp/main.conf
for subdomain in "${SUBDOMAINS[@]}"; do
  scp /tmp/$subdomain.conf deploy@$SERVER_IP:/tmp/$subdomain.conf
done

# 設定ファイルを適用
echo "設定ファイルを適用しています..."
ssh_execute "sudo mv /tmp/main.conf $NGINX_CONF_DIR/$BASE_DOMAIN.conf"
for subdomain in "${SUBDOMAINS[@]}"; do
  ssh_execute "sudo mv /tmp/$subdomain.conf $NGINX_CONF_DIR/$subdomain.$BASE_DOMAIN.conf"
done

# Nginxの設定テスト
echo "Nginx設定をテストしています..."
ssh_execute "sudo nginx -t"

# Nginxの再起動
echo "Nginxを再起動しています..."
ssh_execute "sudo systemctl reload nginx"

# 証明書自動更新の設定
echo "証明書自動更新を設定しています..."
ssh_execute "echo \"0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'\" | sudo tee -a /etc/crontab"

# 各サービスの環境変数設定
echo "各サービスの環境変数を設定しています..."
for subdomain in "${SUBDOMAINS[@]}"; do
  case $subdomain in
    saas)
      APP_DIR="/opt/omotenasuai/hotel-saas"
      ;;
    pms)
      APP_DIR="/opt/omotenasuai/hotel-pms"
      ;;
    member)
      APP_DIR="/opt/omotenasuai/hotel-member"
      ;;
    api)
      APP_DIR="/opt/omotenasuai/hotel-common"
      ;;
    *)
      APP_DIR="/opt/omotenasuai/hotel-common"
      ;;
  esac
  
  ssh_execute "if [ -f $APP_DIR/.env ]; then
    sed -i 's#BASE_URL=.*#BASE_URL=https://$subdomain.$BASE_DOMAIN#g' $APP_DIR/.env
    sed -i 's#API_URL=.*#API_URL=https://api.$BASE_DOMAIN#g' $APP_DIR/.env
  fi"
done

# 動作確認
echo "動作確認を行っています..."
for subdomain in "${SUBDOMAINS[@]}"; do
  echo "https://$subdomain.$BASE_DOMAIN/health をチェックしています..."
  curl -s -o /dev/null -w "%{http_code}" https://$subdomain.$BASE_DOMAIN/health || echo "警告: $subdomain.$BASE_DOMAIN は応答していません"
done

echo "開発サーバードメイン設定が完了しました！"
exit 0