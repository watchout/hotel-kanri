# hotel-saas デモ環境デプロイガイド

## 概要

このガイドでは、hotel-saas（AIコンシェルジュシステム）のデモ環境を最短で構築・公開するための手順を説明します。このガイドに従うことで、開発サーバー上にhotel-saasのデモ環境を迅速に構築できます。

## 前提条件

### サーバー要件
- Ubuntu 22.04 LTS
- 最小スペック: 2vCPU、4GB RAM、20GB SSD
- ポート開放: 22 (SSH)、80 (HTTP)、443 (HTTPS)、3100 (hotel-saas)
- サーバーへのSSHアクセス権限（deploy権限）

### ドメイン要件
- Cloudflareで管理されているドメイン
- DNSレコード設定権限
- Cloudflare API トークン

### 開発環境要件
- Git
- Node.js 18.x以上
- npm または yarn
- PostgreSQL 14以上

## デプロイ手順

### 1. サーバー環境準備

```bash
# サーバーに接続
ssh deploy@<サーバーIP>

# システム更新
sudo apt update && sudo apt upgrade -y

# 必要なパッケージのインストール
sudo apt install -y nginx certbot python3-certbot-nginx git curl

# Node.jsのインストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQLのインストール
sudo apt install -y postgresql postgresql-contrib

# PM2のインストール
sudo npm install -g pm2
```

### 2. hotel-saasリポジトリのセットアップ

```bash
# アプリケーションディレクトリの作成
sudo mkdir -p /opt/omotenasuai
sudo chown deploy:deploy /opt/omotenasuai

# リポジトリのクローン
cd /opt/omotenasuai
git clone https://github.com/your-org/hotel-saas.git
cd hotel-saas

# 依存関係のインストール
npm install

# .envファイルの作成
cp .env.example .env
```

### 3. 環境変数の設定

`.env`ファイルを以下のように編集します：

```
# アプリケーション設定
PORT=3100
NODE_ENV=production
BASE_URL=https://dev-app.omotenasuai.com

# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_USER=hotel_saas
DB_PASSWORD=<安全なパスワード>
DB_NAME=hotel_saas

# JWT認証
JWT_SECRET=<安全なシークレット>
JWT_EXPIRES_IN=24h

# API連携
API_URL=https://api.dev.omotenasuai.com
PMS_API_URL=https://pms.dev.omotenasuai.com/api
MEMBER_API_URL=https://member.dev.omotenasuai.com/api

# イベントバス設定
EVENT_BUS_URL=amqp://localhost
EVENT_BUS_EXCHANGE=hotel_events
```

### 4. データベースのセットアップ

```bash
# PostgreSQLにログイン
sudo -u postgres psql

# データベースとユーザーの作成
CREATE USER hotel_saas WITH PASSWORD '<安全なパスワード>';
CREATE DATABASE hotel_saas OWNER hotel_saas;
\q

# マイグレーションの実行
cd /opt/omotenasuai/hotel-saas
npx prisma migrate deploy
```

### 5. アプリケーションのビルドと起動

```bash
# アプリケーションのビルド
npm run build

# PM2で起動
pm2 start ecosystem.config.js
pm2 save
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
```

### 6. DNSレコードの設定

Cloudflareダッシュボードで以下のDNSレコードを設定します：

| タイプ | 名前 | コンテンツ | TTL | プロキシ状態 |
|-------|------|----------|-----|------------|
| A | dev-app | <サーバーIP> | 自動 | DNS のみ |

### 7. SSL証明書の取得

```bash
# Certbotで証明書を取得
sudo certbot --nginx -d dev-app.omotenasuai.com
```

### 8. Nginxの設定

```bash
# Nginx設定ファイルの作成
sudo nano /etc/nginx/conf.d/dev-app.omotenasuai.com.conf
```

以下の内容を設定ファイルに記述します：

```nginx
server {
    listen 80;
    server_name dev-app.omotenasuai.com;
    
    # HTTP -> HTTPS リダイレクト
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dev-app.omotenasuai.com;
    
    ssl_certificate /etc/letsencrypt/live/dev-app.omotenasuai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev-app.omotenasuai.com/privkey.pem;
    
    # プロキシ設定
    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静的ファイル
    location /static/ {
        alias /opt/omotenasuai/hotel-saas/.output/public/static/;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
    
    # ヘルスチェック
    location /health {
        access_log off;
        return 200 "OK";
    }
}
```

```bash
# Nginx設定のテストと再起動
sudo nginx -t
sudo systemctl reload nginx
```

### 9. 自動更新の設定

```bash
# SSL証明書の自動更新
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | sudo tee -a /etc/crontab

# アプリケーションの自動更新
cd /opt/omotenasuai/hotel-saas
echo "0 4 * * * cd /opt/omotenasuai/hotel-saas && git pull && npm install && npm run build && pm2 restart all" | sudo tee -a /etc/crontab
```

## デプロイ後の確認

### 1. サービス起動確認

```bash
# PM2のステータス確認
pm2 status

# Nginxのステータス確認
sudo systemctl status nginx
```

### 2. アクセス確認

以下のURLにアクセスして動作確認を行います：

- https://dev-app.omotenasuai.com/health
- https://dev-app.omotenasuai.com/

### 3. ログ確認

```bash
# アプリケーションログの確認
pm2 logs

# Nginxのアクセスログ
sudo tail -f /var/log/nginx/access.log

# Nginxのエラーログ
sudo tail -f /var/log/nginx/error.log
```

## トラブルシューティング

### アプリケーションが起動しない

**症状**: PM2ステータスでエラー表示、またはアプリケーションにアクセスできない

**解決策**:
1. ログを確認
   ```bash
   pm2 logs
   ```
2. 環境変数を確認
   ```bash
   cat .env
   ```
3. 依存関係を再インストール
   ```bash
   npm ci
   ```
4. アプリケーションを再起動
   ```bash
   pm2 restart all
   ```

### SSL証明書エラー

**症状**: ブラウザでSSL証明書エラーが表示される

**解決策**:
1. 証明書の状態を確認
   ```bash
   sudo certbot certificates
   ```
2. 証明書を再取得
   ```bash
   sudo certbot --nginx -d dev-app.omotenasuai.com --force-renewal
   ```
3. Nginxを再起動
   ```bash
   sudo systemctl reload nginx
   ```

### データベース接続エラー

**症状**: アプリケーションログにデータベース接続エラーが表示される

**解決策**:
1. PostgreSQLのステータス確認
   ```bash
   sudo systemctl status postgresql
   ```
2. データベース接続設定の確認
   ```bash
   sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='hotel_saas'"
   ```
3. 環境変数の確認と修正
   ```bash
   nano .env
   ```

## デプロイ完了レポート

デプロイが完了したら、以下の情報を含むレポートを作成します：

1. デプロイ日時
2. サーバーIPアドレス
3. アクセスURL
4. 各サービスのステータス
5. SSL証明書の有効期限
6. 発生した問題と解決策（あれば）

## 責任者

- **デプロイ責任者**: [役職名]
- **検証担当**: [役職名]
- **承認者**: [役職名]

---

本ドキュメントは定期的にレビューし、必要に応じて更新してください。最終更新日: YYYY-MM-DD
