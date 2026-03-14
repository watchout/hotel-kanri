# 開発サーバーへのドメイン適用計画

このドキュメントでは、omotenasuai.comドメインの開発サーバーへの適用手順を詳細に説明します。

## 前提条件

- 開発サーバー（163.44.117.60）が稼働中
- データベースサーバー（163.44.97.2）が稼働中
- omotenasuai.comドメインの管理権限あり
- SSHによる開発サーバーへのアクセス権限あり

## 実施手順

### 1. DNSレコードの設定

以下のDNSレコードを追加します：

```
dev-all.omotenasuai.com.     IN A    163.44.117.60
dev-app.omotenasuai.com.     IN A    163.44.117.60
dev-pms.omotenasuai.com.     IN A    163.44.117.60
dev-crm.omotenasuai.com.     IN A    163.44.117.60
dev-api.omotenasuai.com.     IN A    163.44.117.60
```

**実施手順**:
1. ドメインレジストラまたはDNSサービスの管理画面にログイン
2. omotenasuai.comのDNS設定ページに移動
3. 上記のAレコードを追加
4. 変更を保存

**確認方法**:
```bash
dig dev-all.omotenasuai.com
dig dev-app.omotenasuai.com
```

### 2. 開発サーバーへのNginxインストール

```bash
# SSHで開発サーバーに接続
ssh admin@163.44.117.60

# Nginxがインストールされていない場合はインストール
sudo apt update
sudo apt install -y nginx

# Nginxの起動と自動起動設定
sudo systemctl start nginx
sudo systemctl enable nginx

# ステータス確認
sudo systemctl status nginx
```

### 3. Let's Encryptのインストールと証明書取得

```bash
# Certbotのインストール
sudo apt install -y certbot python3-certbot-nginx

# 証明書の取得
sudo certbot --nginx -d dev-all.omotenasuai.com -d dev-app.omotenasuai.com -d dev-pms.omotenasuai.com -d dev-crm.omotenasuai.com -d dev-api.omotenasuai.com

# 自動更新のテスト
sudo certbot renew --dry-run
```

### 4. Nginxの設定

各サブドメイン用の設定ファイルを作成します。

#### dev-all.omotenasuai.com の設定

```bash
sudo nano /etc/nginx/sites-available/dev-all.omotenasuai.com
```

以下の内容を追加：

```nginx
server {
    listen 80;
    server_name dev-all.omotenasuai.com;
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name dev-all.omotenasuai.com;
    
    ssl_certificate /etc/letsencrypt/live/dev-all.omotenasuai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev-all.omotenasuai.com/privkey.pem;
    
    # セキュリティ設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # HSTS設定
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 他のサブドメインの設定

同様の手順で他のサブドメインの設定ファイルも作成します。ポート番号は以下のように割り当てます：

- dev-all.omotenasuai.com → localhost:3100
- dev-app.omotenasuai.com → localhost:3100
- dev-pms.omotenasuai.com → localhost:3300
- dev-crm.omotenasuai.com → localhost:3200
- dev-api.omotenasuai.com → localhost:3400

### 5. 設定の有効化

```bash
# シンボリックリンクを作成
sudo ln -s /etc/nginx/sites-available/dev-all.omotenasuai.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/dev-app.omotenasuai.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/dev-pms.omotenasuai.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/dev-crm.omotenasuai.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/dev-api.omotenasuai.com /etc/nginx/sites-enabled/

# 設定のテスト
sudo nginx -t

# Nginxの再起動
sudo systemctl restart nginx
```

### 6. アプリケーションの設定更新

各アプリケーションの環境変数を更新します。

#### hotel-saas（AIコンシェルジュ）の設定

```bash
cd ~/projects/hotel-saas
nano .env
```

以下の内容を追加または更新：

```
BASE_URL=https://dev-app.omotenasuai.com
API_URL=https://dev-api.omotenasuai.com
CORS_ORIGIN=https://dev-all.omotenasuai.com,https://dev-app.omotenasuai.com,https://dev-pms.omotenasuai.com,https://dev-crm.omotenasuai.com
DATABASE_URL=postgresql://hotel_app:password@localhost:5432/hotel_unified_db
```

#### 他のアプリケーションも同様に設定

各アプリケーションの環境変数を更新し、必要に応じてアプリケーションを再起動します。

### 7. アプリケーションの起動

PM2を使用して各アプリケーションを起動します。

```bash
# 総合ポータル
cd ~/projects/hotel-common
pm2 start dist/index.js --name portal -- --port 3100

# AIコンシェルジュ
cd ~/projects/hotel-saas
pm2 start dist/index.js --name app -- --port 3100

# ホテルPMS
cd ~/projects/hotel-pms
pm2 start dist/index.js --name pms -- --port 3300

# CRM
cd ~/projects/hotel-member
pm2 start dist/index.js --name crm -- --port 3200

# API
cd ~/projects/hotel-common
pm2 start dist/api/index.js --name api -- --port 3400

# PM2の設定を保存
pm2 save
```

### 8. ファイアウォールの設定

HTTPとHTTPSのポートを開放します。

```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw status
```

### 9. 動作確認

以下のURLにアクセスして、各サービスが正常に動作していることを確認します：

- https://dev-all.omotenasuai.com
- https://dev-app.omotenasuai.com
- https://dev-pms.omotenasuai.com
- https://dev-crm.omotenasuai.com
- https://dev-api.omotenasuai.com

#### 9.1 ヘルスチェックの実行

各サービスの`/health`エンドポイントを使用してヘルスチェックを実行します：

```bash
# 各サービスのヘルスチェック
curl -s https://dev-app.omotenasuai.com/api/health | grep -q "status" && echo "✅ hotel-saas" || echo "❌ hotel-saas"
curl -s https://dev-crm.omotenasuai.com/api/health | grep -q "status" && echo "✅ hotel-member" || echo "❌ hotel-member"
curl -s https://dev-pms.omotenasuai.com/api/health | grep -q "status" && echo "✅ hotel-pms" || echo "❌ hotel-pms"
curl -s https://dev-api.omotenasuai.com/health | grep -q "status" && echo "✅ hotel-common" || echo "❌ hotel-common"

# 詳細なヘルスチェック情報の確認
curl -s https://dev-api.omotenasuai.com/health | jq
```

ヘルスチェックが成功すると、各サービスのステータスと基本的なシステム情報が表示されます。

### 10. 監視設定（オプション）

Uptime Robotなどのサービスを使用して、各サブドメインの稼働状況を監視します。

## トラブルシューティング

### SSL証明書の問題

```bash
# 証明書の更新
sudo certbot renew

# 特定のドメインの証明書を再取得
sudo certbot --nginx -d dev-all.omotenasuai.com
```

### Nginxの問題

```bash
# エラーログの確認
sudo tail -f /var/log/nginx/error.log

# アクセスログの確認
sudo tail -f /var/log/nginx/access.log

# 設定の再読み込み
sudo nginx -s reload
```

### アプリケーションの問題

```bash
# PM2のログ確認
pm2 logs

# 特定のアプリケーションの再起動
pm2 restart app
```

## 定期メンテナンス

- 毎月のセキュリティアップデート適用
- SSL証明書の有効期限確認（Let's Encryptは自動更新）
- Nginxログのローテーション確認
- バックアップの実行と確認

## 今後の拡張計画

1. CDNの導入検討
2. 負荷分散のためのロードバランサー導入
3. 監視システムの強化
4. 自動デプロイパイプラインの構築