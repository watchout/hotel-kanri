# omotenasuAI HP サーバーセットアップガイド

## サーバー接続情報

### SSH接続
```bash
ssh -i .ssh/omotenasuai_rsa omotenasuai@v2011.coreserver.jp
```

### サーバー詳細
- **ホスト**: v2011.coreserver.jp
- **実際のIP**: 163.44.176.23
- **ユーザー**: omotenasuai
- **認証**: RSA鍵認証

## 初期セットアップ手順

### 1. サーバー環境確認
```bash
# OSバージョン確認
cat /etc/os-release

# Webサーバー確認
ps aux | grep -E "(apache|nginx|httpd)"

# PHP確認
php -v

# ディスク使用量確認
df -h

# 現在のディレクトリ構成確認
ls -la
```

### 2. ドキュメントルート確認
```bash
# 通常のコアサーバーのドキュメントルート
ls -la public_html/

# Webサーバー設定確認（Apache）
cat .htaccess 2>/dev/null || echo ".htaccess not found"
```

### 3. 必要ディレクトリ作成
```bash
# HPプロジェクト用ディレクトリ作成
mkdir -p public_html/{about,services,contact,assets/{css,js,images}}

# 権限設定
chmod 755 public_html/
chmod 644 public_html/*.html 2>/dev/null || true
```

### 4. バックアップディレクトリ作成
```bash
# バックアップ用ディレクトリ
mkdir -p backups/homepage
```

## ファイルアップロード方法

### SCP使用
```bash
# 単一ファイル
scp -i .ssh/omotenasuai_rsa index.html omotenasuai@v2011.coreserver.jp:public_html/

# ディレクトリ全体
scp -i .ssh/omotenasuai_rsa -r assets/ omotenasuai@v2011.coreserver.jp:public_html/
```

### rsync使用（推奨）
```bash
# 差分同期
rsync -avz -e "ssh -i .ssh/omotenasuai_rsa" ./hp-files/ omotenasuai@v2011.coreserver.jp:public_html/
```

## Webサーバー設定

### Apache設定（.htaccess）
```apache
# HTTPS強制リダイレクト
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# セキュリティヘッダー
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options SAMEORIGIN
Header always set X-XSS-Protection "1; mode=block"

# キャッシュ設定
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
</IfModule>

# Gzip圧縮
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
```

## SSL証明書設定

コアサーバーでは、Let's Encryptの自動設定が可能です：

1. コントロールパネルにログイン
2. 「SSL設定」を選択
3. 「無料SSL」でLet's Encryptを有効化
4. 自動更新を有効にする

## 監視・メンテナンス

### ログ確認
```bash
# アクセスログ
tail -f logs/access_log

# エラーログ
tail -f logs/error_log
```

### バックアップ作成
```bash
# 定期バックアップスクリプト
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf backups/homepage/backup_$DATE.tar.gz public_html/
# 30日以上古いバックアップを削除
find backups/homepage/ -name "backup_*.tar.gz" -mtime +30 -delete
```

## トラブルシューティング

### よくある問題

1. **ファイルが表示されない**
   - 権限確認: `ls -la public_html/`
   - 権限修正: `chmod 644 public_html/*.html`

2. **CSS/JSが読み込まれない**
   - パス確認
   - MIMEタイプ確認

3. **SSL証明書エラー**
   - コントロールパネルでSSL設定確認
   - 証明書の有効期限確認

### 緊急時の対応

1. **サイトダウン時**
   ```bash
   # 簡易メンテナンスページ作成
   echo "<h1>メンテナンス中</h1><p>しばらくお待ちください</p>" > public_html/maintenance.html
   ```

2. **バックアップからの復旧**
   ```bash
   # 最新バックアップから復旧
   cd backups/homepage/
   tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz
   cp -r public_html/* ../../public_html/
   ```

---
作成日: 2025年1月18日
最終更新: 2025年1月18日
