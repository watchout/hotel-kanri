# 開発サーバードメイン実装計画

## 概要

本ドキュメントでは、開発サーバー環境に対するドメイン適用手順について記載します。開発環境でも本番環境に近い形でドメインを設定することで、環境間の一貫性を確保し、開発からデプロイまでのプロセスをスムーズにします。

## 目的

1. 開発環境でのドメイン名を統一し、環境間の移行を容易にする
2. SSL証明書を適用し、セキュアな開発環境を構築する
3. 本番環境と同等の設定で開発することで、環境差異によるバグを減らす
4. サブドメインを活用したマイクロサービスアーキテクチャの検証を可能にする

## 開発サーバードメイン構成

### ベースドメイン

- 開発環境ベースドメイン: `dev.omotenasuai.com`

### サブドメイン構成

- **SaaS開発**: `saas.dev.omotenasuai.com`
- **PMS開発**: `pms.dev.omotenasuai.com`
- **会員システム開発**: `member.dev.omotenasuai.com`
- **API開発**: `api.dev.omotenasuai.com`

## 実装手順

### 1. DNSレコードの設定

```bash
# 開発サーバーのIPアドレス
DEV_SERVER_IP=192.168.1.100

# Aレコードの設定
# dev.omotenasuai.com -> 開発サーバーIP
# *.dev.omotenasuai.com -> 開発サーバーIP（ワイルドカード証明書用）
```

設定例（Cloudflare）:
- タイプ: A
- 名前: dev
- コンテンツ: $DEV_SERVER_IP
- TTL: 自動
- プロキシ状態: DNS のみ

ワイルドカード設定:
- タイプ: A
- 名前: *.dev
- コンテンツ: $DEV_SERVER_IP
- TTL: 自動
- プロキシ状態: DNS のみ

### 2. SSL証明書の取得

Let's Encryptを使用してワイルドカード証明書を取得します。

```bash
# certbotのインストール
sudo apt-get update
sudo apt-get install certbot python3-certbot-dns-cloudflare

# Cloudflare APIトークン設定
echo "dns_cloudflare_api_token = YOUR_API_TOKEN" > cloudflare.ini
chmod 600 cloudflare.ini

# ワイルドカード証明書の取得
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials cloudflare.ini \
  -d dev.omotenasuai.com \
  -d *.dev.omotenasuai.com
```

### 3. Nginxの設定

各サブドメイン用のNginx設定ファイルを作成します。

```bash
# Nginx設定ディレクトリ
NGINX_CONF_DIR=/etc/nginx/conf.d

# 証明書パス
SSL_CERT=/etc/letsencrypt/live/dev.omotenasuai.com/fullchain.pem
SSL_KEY=/etc/letsencrypt/live/dev.omotenasuai.com/privkey.pem

# 各サービス用の設定ファイル作成
```

設定例（saas.dev.omotenasuai.com）:

```nginx
server {
    listen 80;
    server_name saas.dev.omotenasuai.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name saas.dev.omotenasuai.com;

    ssl_certificate     /etc/letsencrypt/live/dev.omotenasuai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dev.omotenasuai.com/privkey.pem;
    
    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # HSTS設定
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # その他のセキュリティヘッダー
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
    
    # プロキシ設定
    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

同様に他のサブドメイン用の設定も作成します。

### 4. 証明書自動更新の設定

```bash
# 証明書自動更新のcronジョブ設定
echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'" | sudo tee -a /etc/crontab
```

### 5. アプリケーション設定の更新

各アプリケーションの環境変数やコンフィグファイルを更新して、新しいドメイン設定を反映します。

例（hotel-saas .env）:
```
BASE_URL=https://saas.dev.omotenasuai.com
API_URL=https://api.dev.omotenasuai.com
```

### 6. ローカル開発環境の設定

開発者のローカル環境で開発サーバーのドメインを使用できるよう、hostsファイルの設定例を提供します。

```
# /etc/hosts に追加
192.168.1.100 dev.omotenasuai.com
192.168.1.100 saas.dev.omotenasuai.com
192.168.1.100 pms.dev.omotenasuai.com
192.168.1.100 member.dev.omotenasuai.com
192.168.1.100 api.dev.omotenasuai.com
```

## 検証手順

1. 各サブドメインへのHTTPS接続確認
2. 証明書の有効性確認
3. リダイレクト（HTTP→HTTPS）の確認
4. アプリケーションの正常動作確認
5. クロスオリジンリクエストの確認

## トラブルシューティング

### 証明書関連の問題

- **問題**: 証明書が見つからないエラー
- **解決策**: 証明書のパスと権限を確認

### DNS関連の問題

- **問題**: サブドメインが解決されない
- **解決策**: DNSレコードの設定とTTLを確認、DNSキャッシュのクリア

### Nginx設定の問題

- **問題**: 502 Bad Gateway エラー
- **解決策**: バックエンドサービスの起動確認、ポート設定の確認

## 責任者

- **実装責任者**: インフラチーム
- **レビュー担当**: セキュリティ担当
- **承認者**: プロジェクトマネージャー

## スケジュール

1. DNSレコード設定: YYYY-MM-DD
2. SSL証明書取得: YYYY-MM-DD
3. Nginx設定: YYYY-MM-DD
4. アプリケーション設定更新: YYYY-MM-DD
5. 検証完了: YYYY-MM-DD

---

本ドキュメントは定期的にレビューし、必要に応じて更新してください。最終更新日: YYYY-MM-DD