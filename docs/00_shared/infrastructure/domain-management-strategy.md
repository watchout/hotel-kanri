# omotenasuai.com ドメイン運用戦略

このドキュメントでは、omotenasuai.comドメインのサブドメイン構成と運用方針について定義します。

## サブドメイン構成

### メインシステム

| サブドメイン | 役割 | 説明 |
|------------|------|------|
| all.omotenasuai.com | 総合ポータル | すべてのサービスへのアクセスポイント、統合ダッシュボード |
| app.omotenasuai.com | AIコンシェルジュ | AIを活用したホテルコンシェルジュサービス |
| pms.omotenasuai.com | ホテルPMS | プロパティマネジメントシステム |
| crm.omotenasuai.com | 顧客管理 | 顧客関係管理システム（旧member） |
| api.omotenasuai.com | 共通API | 各システム間の連携APIエンドポイント |

### マーケティング・情報

| サブドメイン | 役割 | 説明 |
|------------|------|------|
| www.omotenasuai.com | コーポレートサイト | 企業情報、製品紹介 |
| docs.omotenasuai.com | 開発者ドキュメント | API仕様書、開発者向け情報 |
| blog.omotenasuai.com | ブログ | 業界情報、製品アップデート |
| lp.omotenasuai.com | ランディングページ | マーケティングキャンペーン |

### 管理・運用

| サブドメイン | 役割 | 説明 |
|------------|------|------|
| admin.omotenasuai.com | 管理ポータル | システム管理者向け機能 |
| status.omotenasuai.com | システムステータス | サービス稼働状況 |

### 環境別構成

| 環境 | サブドメイン形式 | 例 |
|------|--------------|------|
| 本番環境 | {service}.omotenasuai.com | app.omotenasuai.com |
| 開発環境 | dev-{service}.omotenasuai.com | dev-app.omotenasuai.com |
| ステージング環境 | stg-{service}.omotenasuai.com | stg-app.omotenasuai.com |
| デモ環境 | demo-{service}.omotenasuai.com | demo-app.omotenasuai.com |

## DNS設定方針

### Aレコード設定

各サブドメインは、対応するサーバーのIPアドレスにAレコードで紐づけます。

```
all.omotenasuai.com.     IN A    163.44.117.60
app.omotenasuai.com.     IN A    163.44.117.60
pms.omotenasuai.com.     IN A    163.44.117.60
crm.omotenasuai.com.     IN A    163.44.117.60
api.omotenasuai.com.     IN A    163.44.117.60
```

### CNAME設定

開発環境やデモ環境は、CNAMEレコードを使用して本番環境のサブドメインを参照することも可能です。

```
dev-all.omotenasuai.com.  IN CNAME  all.omotenasuai.com.
dev-app.omotenasuai.com.  IN CNAME  app.omotenasuai.com.
```

## SSL証明書

すべてのサブドメインでHTTPSを有効にするために、以下のいずれかの方法でSSL証明書を取得します：

1. ワイルドカード証明書（*.omotenasuai.com）
2. Let's Encryptによる個別証明書の自動取得・更新

## リバースプロキシ設定

Nginxをリバースプロキシとして使用し、各サブドメインへのリクエストを適切なサービスに振り分けます。

### 設定例

```nginx
# all.omotenasuai.com - 総合ポータル
server {
    listen 80;
    server_name all.omotenasuai.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name all.omotenasuai.com;
    
    ssl_certificate /etc/letsencrypt/live/all.omotenasuai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/all.omotenasuai.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# app.omotenasuai.com - AIコンシェルジュ
server {
    listen 80;
    server_name app.omotenasuai.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name app.omotenasuai.com;
    
    ssl_certificate /etc/letsencrypt/live/app.omotenasuai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.omotenasuai.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# 他のサブドメインも同様に設定
```

## クッキーとセッション管理

シングルサインオン（SSO）を実装するため、以下の設定を行います：

1. 認証クッキーのドメインを `.omotenasuai.com` に設定
2. 各サービス間でのセッション共有の実装
3. JWTなどのトークンベースの認証の活用

## 開発サーバーへの適用計画

### フェーズ1: DNS設定

1. 開発環境用のDNSレコードを作成
   - dev-all.omotenasuai.com
   - dev-app.omotenasuai.com
   - dev-pms.omotenasuai.com
   - dev-crm.omotenasuai.com
   - dev-api.omotenasuai.com

2. DNSの伝播を確認（24-48時間程度）

### フェーズ2: SSL証明書の取得

1. Let's Encryptを使用して各サブドメインの証明書を取得
   ```bash
   sudo certbot --nginx -d dev-all.omotenasuai.com -d dev-app.omotenasuai.com -d dev-pms.omotenasuai.com -d dev-crm.omotenasuai.com -d dev-api.omotenasuai.com
   ```

2. 証明書の自動更新を確認
   ```bash
   sudo certbot renew --dry-run
   ```

### フェーズ3: Nginxリバースプロキシの設定

1. 開発サーバーにNginxをインストール（まだの場合）
   ```bash
   sudo apt install nginx
   ```

2. 各サブドメイン用の設定ファイルを作成
   ```bash
   sudo nano /etc/nginx/sites-available/dev-all.omotenasuai.com
   sudo nano /etc/nginx/sites-available/dev-app.omotenasuai.com
   # 他のサブドメインも同様に
   ```

3. シンボリックリンクを作成して設定を有効化
   ```bash
   sudo ln -s /etc/nginx/sites-available/dev-all.omotenasuai.com /etc/nginx/sites-enabled/
   sudo ln -s /etc/nginx/sites-available/dev-app.omotenasuai.com /etc/nginx/sites-enabled/
   # 他のサブドメインも同様に
   ```

4. Nginx設定をテストして再起動
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### フェーズ4: アプリケーション設定の更新

1. 各アプリケーションの環境変数を更新
   - BASE_URL
   - CORS設定
   - リダイレクトURI

2. 必要に応じてアプリケーションを再起動

### フェーズ5: テストと検証

1. 各サブドメインへのアクセスをテスト
2. SSLの動作確認
3. サービス間の連携テスト
4. ログイン・認証フローのテスト

## 運用とメンテナンス

### 監視

- 各サブドメインのアクセス可能性を定期的に監視
- SSL証明書の有効期限を監視（Let's Encryptの場合は自動更新）

### バックアップ

- Nginx設定ファイルの定期的なバックアップ
- DNS設定のエクスポートと保存

### 更新手順

1. 新しいサブドメインを追加する場合
   - DNS設定の追加
   - SSL証明書の取得
   - Nginx設定の追加
   - アプリケーションの設定更新

2. サブドメインを変更する場合
   - 古いサブドメインから新しいサブドメインへのリダイレクト設定
   - 新しいサブドメインの設定を追加
   - 移行期間（最低30日）の後、古い設定を削除

## セキュリティ対策

1. すべてのサブドメインでHTTPSを強制
2. 適切なCSP（Content Security Policy）ヘッダーの設定
3. HSTS（HTTP Strict Transport Security）の有効化
4. 定期的なセキュリティスキャンの実施

## 今後の展望

1. CDNの導入検討
2. ロードバランサーの導入（トラフィック増加時）
3. 地理的に分散したDNSサービスの利用