# ConoHa VPS 開発サーバーセットアップガイド

このガイドでは、ConoHa VPS上に開発サーバー環境を構築する手順を説明します。

## 1. 初期アクセス設定

### 1.1 SSHキーの準備

ローカルマシンでSSHキーを生成します（既に持っている場合はスキップ可能）。

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

### 1.2 ConoHa VPSコントロールパネルでの設定

1. ConoHaコントロールパネルにログイン
2. 「サーバー管理」→「OmotenasuAI」を選択
3. 「設定変更」→「SSH Key」で公開鍵を登録
4. 「コンソール」からrootパスワードを確認

### 1.3 初回SSH接続

```bash
ssh root@163.44.117.60
```

初回接続時にパスワードを入力し、その後すぐにパスワードを変更します。

```bash
passwd
```

## 2. 基本セットアップ

### 2.1 セットアップスクリプトの転送

ローカルマシンから開発サーバーにセットアップスクリプトを転送します。

```bash
scp scripts/server-setup/initial-setup.sh root@163.44.117.60:/root/
```

### 2.2 スクリプトの実行

サーバーにSSH接続し、スクリプトを実行します。

```bash
ssh root@163.44.117.60
chmod +x /root/initial-setup.sh
./initial-setup.sh
```

スクリプト実行時に以下の情報を入力します：
- ホスト名: `omotenasu-app`
- サーバータイプ: `1` (アプリケーションサーバー)
- スワップサイズ: `2` (GB)

## 3. アプリケーション用ユーザー設定

### 3.1 アプリケーションユーザーのSSH設定

```bash
# アプリケーションユーザーのホームディレクトリにSSHディレクトリを作成
mkdir -p /home/appuser/.ssh
chmod 700 /home/appuser/.ssh

# 公開鍵を認証済みキーファイルにコピー
cp ~/.ssh/authorized_keys /home/appuser/.ssh/
chown -R appuser:appuser /home/appuser/.ssh
chmod 600 /home/appuser/.ssh/authorized_keys
```

### 3.2 sudoers設定

```bash
# appuserにsudo権限を付与
echo "appuser ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/appuser
chmod 440 /etc/sudoers.d/appuser
```

## 4. アプリケーション環境のセットアップ

### 4.1 アプリケーションディレクトリの準備

```bash
# アプリケーションユーザーに切り替え
su - appuser

# アプリケーションディレクトリの作成
mkdir -p ~/hotel-app
cd ~/hotel-app
```

### 4.2 Gitリポジトリのクローン

```bash
git clone https://github.com/yourusername/hotel-common.git .
```

### 4.3 環境変数の設定

```bash
cp env.example .env.development
# .env.development ファイルを編集して適切な値を設定
```

### 4.4 依存関係のインストール

```bash
npm install
```

### 4.5 TypeScriptのビルド

```bash
npm run build
```

## 5. PM2によるアプリケーション管理

### 5.1 PM2の設定

```bash
# PM2の設定ファイルを作成
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'hotel-app',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgresql://hotel_app:password@localhost:5432/hotel_unified_db'
    }
  }]
};
EOF
```

### 5.2 PM2でアプリケーションを起動

```bash
pm2 start ecosystem.config.js
```

### 5.3 PM2の自動起動設定

```bash
pm2 startup
# 表示されたコマンドをコピーして実行
pm2 save
```

## 6. Nginxの設定 (オプション)

### 6.1 Nginxのインストール

```bash
sudo apt install -y nginx
```

### 6.2 Nginxの設定

```bash
sudo tee /etc/nginx/sites-available/hotel-app << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/hotel-app /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 6.3 ファイアウォールの設定

```bash
sudo ufw allow 'Nginx Full'
sudo ufw status
```

## 7. 監視設定

### 7.1 基本的なシステム監視

```bash
# htopのインストール（既にインストール済みの場合はスキップ）
sudo apt install -y htop

# ディスク使用量の確認
df -h

# メモリ使用量の確認
free -h
```

### 7.2 ログの確認

```bash
# システムログの確認
sudo tail -f /var/log/syslog

# アプリケーションログの確認
pm2 logs
```

## 8. セキュリティ強化

### 8.1 自動セキュリティアップデート

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 8.2 Fail2banの確認

```bash
sudo systemctl status fail2ban
```

## 9. バックアップ設定

### 9.1 アプリケーションバックアップスクリプト

```bash
cat > ~/backup-app.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/appuser/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cd ~/hotel-app
tar -czf $BACKUP_DIR/hotel-app_$TIMESTAMP.tar.gz .
find $BACKUP_DIR -name "hotel-app_*.tar.gz" -type f -mtime +7 -delete
EOF

chmod +x ~/backup-app.sh
```

### 9.2 cronジョブの設定

```bash
(crontab -l 2>/dev/null; echo "0 2 * * * /home/appuser/backup-app.sh") | crontab -
```

## 10. 動作確認

### 10.1 アプリケーションの稼働確認

```bash
curl http://localhost:3100
```

### 10.2 システムステータスの確認

```bash
pm2 status
systemctl status nginx
```

## 11. トラブルシューティング

### 11.1 アプリケーション起動失敗時

```bash
# PM2のログを確認
pm2 logs

# アプリケーションの再起動
pm2 restart hotel-app
```

### 11.2 Nginxエラー時

```bash
# Nginxの設定テスト
sudo nginx -t

# エラーログの確認
sudo tail -f /var/log/nginx/error.log
```

### 11.3 システムリソース不足時

```bash
# プロセスの確認
top

# ディスク使用量の確認
df -h
```

## 12. 次のステップ

1. データベースサーバーとの接続設定
2. CI/CDパイプラインの構築
3. 監視システムの拡張
4. バックアップ戦略の強化