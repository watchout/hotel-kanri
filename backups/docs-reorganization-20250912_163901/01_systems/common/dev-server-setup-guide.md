# 開発サーバーセットアップ手順書

本ドキュメントは、ホテル統合システム開発環境の初期セットアップ手順を詳細に記載しています。

## 前提条件

- ConoHa VPS契約済み（アプリケーションサーバー、データベースサーバー）
- サーバーIPアドレス
  - アプリケーションサーバー: 163.44.117.60
  - データベースサーバー: 163.44.97.2
- ローカル環境にSSH鍵ペア生成済み

## 1. 初期アクセス設定

### 1.1 SSH鍵の登録

ConoHaコントロールパネルでSSH鍵を登録します。

1. ConoHaコントロールパネルにログイン
2. VPSサーバー設定 → SSHキー管理 → 公開鍵を登録
3. 作成したサーバーにSSHキーを割り当て

### 1.2 初回rootアクセス

```bash
ssh root@163.44.117.60  # アプリケーションサーバー
ssh root@163.44.97.2    # データベースサーバー
```

## 2. 基本セキュリティ設定

以下の手順を両サーバーで実施します。

### 2.1 管理ユーザーの作成

```bash
# 管理ユーザーを作成
adduser admin

# sudoグループに追加
usermod -aG sudo admin

# SSH公開鍵ディレクトリを作成
mkdir -p /home/admin/.ssh
chmod 700 /home/admin/.ssh

# 公開鍵をコピー
cp ~/.ssh/authorized_keys /home/admin/.ssh/
chown -R admin:admin /home/admin/.ssh
chmod 600 /home/admin/.ssh/authorized_keys
```

### 2.2 SSHの設定変更

```bash
# SSHの設定ファイルを編集
nano /etc/ssh/sshd_config
```

以下の設定を変更:
```
PermitRootLogin no
PasswordAuthentication no
```

SSHサービスを再起動:
```bash
systemctl restart sshd
```

### 2.3 基本セキュリティ設定

```bash
# システムの更新
apt update && apt upgrade -y

# タイムゾーン設定
timedatectl set-timezone Asia/Tokyo

# 必要なパッケージのインストール
apt install -y build-essential curl git htop unzip rsync fail2ban

# ファイアウォールの設定
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

### 2.4 Fail2Banの設定

```bash
# 設定ファイルのコピー
cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# 設定ファイルの編集
nano /etc/fail2ban/jail.local
```

[sshd]セクションを確認・調整し、サービスを再起動:
```bash
systemctl restart fail2ban
```

## 3. アプリケーションサーバーのセットアップ

以降の手順は、管理ユーザー（admin）で実施します。

```bash
ssh admin@163.44.117.60
```

### 3.1 Node.jsのインストール

```bash
# Node.js 18 LTSのインストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# バージョン確認
node -v
npm -v
```

### 3.2 開発ツールのインストール

```bash
# PM2のインストール
sudo npm install -g pm2

# PM2の自動起動設定
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u admin --hp /home/admin

# Dockerのインストール
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker admin
sudo systemctl enable docker
sudo systemctl start docker

# Docker Composeのインストール
sudo apt install -y docker-compose

# バージョン確認
docker --version
docker-compose --version
```

### 3.3 プロジェクトディレクトリの準備

```bash
# プロジェクトディレクトリ作成
mkdir -p ~/projects/{hotel-saas,hotel-pms,hotel-member,hotel-common}

# デプロイスクリプトディレクトリ作成
mkdir -p ~/deploy-scripts
chmod 700 ~/deploy-scripts
```

### 3.4 デプロイスクリプトの作成

```bash
# hotel-saas用デプロイスクリプト
nano ~/deploy-scripts/deploy-saas.sh
```

**deploy-saas.sh**:
```bash
#!/bin/bash
set -e

# 変数設定
PROJECT_DIR=~/projects/hotel-saas
REPO_URL=https://github.com/your-org/hotel-saas.git
BRANCH=main

# プロジェクトディレクトリがなければ作成
mkdir -p $PROJECT_DIR

# リポジトリクローンまたは更新
if [ -d "$PROJECT_DIR/.git" ]; then
  echo "リポジトリを更新します..."
  cd $PROJECT_DIR
  git fetch
  git reset --hard origin/$BRANCH
else
  echo "リポジトリをクローンします..."
  git clone -b $BRANCH $REPO_URL $PROJECT_DIR
  cd $PROJECT_DIR
fi

# 依存関係インストール
echo "依存関係をインストールします..."
npm ci

# ビルド
echo "プロジェクトをビルドします..."
npm run build

# 環境変数設定
echo "環境変数を設定します..."
cp .env.example .env
# 必要に応じて.envファイルを編集

# PM2で起動/再起動
echo "アプリケーションを起動/再起動します..."
pm2 describe hotel-saas > /dev/null
if [ $? -eq 0 ]; then
  pm2 reload hotel-saas
else
  pm2 start dist/index.js --name hotel-saas
fi

# PM2設定を保存
pm2 save

echo "デプロイが完了しました"
```

同様に他のプロジェクト用のスクリプトも作成します。

```bash
# 実行権限を付与
chmod +x ~/deploy-scripts/*.sh
```

### 3.5 バックアップスクリプトの作成

```bash
# バックアップスクリプト作成
nano ~/deploy-scripts/backup.sh
```

**backup.sh**:
```bash
#!/bin/bash
set -e

# 変数設定
BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d-%H%M%S)
PROJECT_DIRS=("hotel-saas" "hotel-pms" "hotel-member" "hotel-common")

# バックアップディレクトリ作成
mkdir -p $BACKUP_DIR

# 各プロジェクトのバックアップ
for project in "${PROJECT_DIRS[@]}"; do
  if [ -d ~/projects/$project ]; then
    echo "バックアップ作成中: $project"
    tar -czf $BACKUP_DIR/${project}-${DATE}.tar.gz -C ~/projects $project
  fi
done

# 古いバックアップの削除 (30日以上前)
find $BACKUP_DIR -name "*.tar.gz" -type f -mtime +30 -delete

echo "バックアップが完了しました"
```

```bash
# 実行権限付与
chmod +x ~/deploy-scripts/backup.sh

# Cronジョブ設定
(crontab -l 2>/dev/null; echo "0 3 * * * ~/deploy-scripts/backup.sh") | crontab -
```

## 4. データベースサーバーのセットアップ

```bash
ssh admin@163.44.97.2
```

### 4.1 PostgreSQLのインストール

```bash
# PostgreSQL 14のインストール
sudo apt install -y postgresql-14 postgresql-contrib-14

# サービスの起動確認
sudo systemctl status postgresql
```

### 4.2 PostgreSQL設定の最適化

```bash
# 設定ファイルのバックアップ
sudo cp /etc/postgresql/14/main/postgresql.conf /etc/postgresql/14/main/postgresql.conf.bak

# 設定の編集
sudo nano /etc/postgresql/14/main/postgresql.conf
```

以下の設定を変更:
```
# メモリ設定 (4GB RAMを想定)
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 16MB
maintenance_work_mem = 256MB

# 接続設定
listen_addresses = '*'
max_connections = 100

# WAL設定
wal_buffers = 16MB
checkpoint_completion_target = 0.9
```

### 4.3 リモートアクセス設定

```bash
# pg_hba.confの編集
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

以下の行を追加:
```
# アプリケーションサーバーからのアクセスを許可
host    all             all             163.44.117.60/32       md5
```

```bash
# PostgreSQLサービスの再起動
sudo systemctl restart postgresql
```

### 4.4 データベースとユーザーの作成

```bash
# PostgreSQLに接続
sudo -u postgres psql
```

PostgreSQLプロンプトで:
```sql
-- 開発用データベースの作成
CREATE DATABASE hotel_saas_dev;
CREATE DATABASE hotel_pms_dev;
CREATE DATABASE hotel_member_dev;
CREATE DATABASE hotel_common_dev;

-- アプリケーション用ユーザーの作成
CREATE USER hotel_app WITH PASSWORD 'secure_password';

-- 権限の付与
GRANT ALL PRIVILEGES ON DATABASE hotel_saas_dev TO hotel_app;
GRANT ALL PRIVILEGES ON DATABASE hotel_pms_dev TO hotel_app;
GRANT ALL PRIVILEGES ON DATABASE hotel_member_dev TO hotel_app;
GRANT ALL PRIVILEGES ON DATABASE hotel_common_dev TO hotel_app;

-- 終了
\q
```

### 4.5 ファイアウォール設定

```bash
# PostgreSQLポート(5432)をアプリケーションサーバーからのみ許可
sudo ufw allow from 163.44.117.60 to any port 5432 proto tcp
sudo ufw status
```

### 4.6 バックアップ設定

```bash
# バックアップディレクトリ作成
mkdir -p ~/db-backups

# バックアップスクリプト作成
nano ~/deploy-scripts/db-backup.sh
```

**db-backup.sh**:
```bash
#!/bin/bash
set -e

# 変数設定
BACKUP_DIR=~/db-backups
DATE=$(date +%Y%m%d-%H%M%S)
DBS=("hotel_saas_dev" "hotel_pms_dev" "hotel_member_dev" "hotel_common_dev")

# バックアップディレクトリ作成
mkdir -p $BACKUP_DIR

# 各データベースのバックアップ
for db in "${DBS[@]}"; do
  echo "バックアップ作成中: $db"
  sudo -u postgres pg_dump $db | gzip > $BACKUP_DIR/${db}-${DATE}.sql.gz
done

# 古いバックアップの削除 (30日以上前)
find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +30 -delete

echo "データベースバックアップが完了しました"
```

```bash
# 実行権限付与
chmod +x ~/deploy-scripts/db-backup.sh

# Cronジョブ設定
(crontab -l 2>/dev/null; echo "0 4 * * * ~/deploy-scripts/db-backup.sh") | crontab -
```

## 5. アプリケーションサーバーとデータベースの接続確認

アプリケーションサーバーで:

```bash
ssh admin@163.44.117.60

# PostgreSQLクライアントのインストール
sudo apt install -y postgresql-client

# データベース接続テスト
psql -h 163.44.97.2 -U hotel_app -d hotel_saas_dev
# パスワードを入力

# 接続成功したら以下を実行
\q
```

## 6. 監視設定（オプション）

### 6.1 Node Exporterのインストール

両サーバーで:

```bash
# Node Exporterのダウンロードとインストール
cd /tmp
curl -LO https://github.com/prometheus/node_exporter/releases/download/v1.5.0/node_exporter-1.5.0.linux-amd64.tar.gz
tar xvf node_exporter-1.5.0.linux-amd64.tar.gz
sudo mv node_exporter-1.5.0.linux-amd64/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# サービスファイル作成
sudo nano /etc/systemd/system/node_exporter.service
```

**node_exporter.service**:
```
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
# サービス有効化
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter

# ファイアウォール設定
sudo ufw allow from 163.44.117.60 to any port 9100 proto tcp
```

## 7. ドキュメント作成

アプリケーションサーバーで:

```bash
# サーバー情報ドキュメント作成
nano ~/README.md
```

**README.md**:
```markdown
# 開発サーバー環境ドキュメント

## サーバー情報
- ホスト名: omotenasu-dev
- IPアドレス: 163.44.117.60
- OS: Ubuntu 22.04 LTS

## アプリケーション
- hotel-saas: ~/projects/hotel-saas
- hotel-pms: ~/projects/hotel-pms
- hotel-member: ~/projects/hotel-member
- hotel-common: ~/projects/hotel-common

## デプロイ手順
1. `~/deploy-scripts/deploy-saas.sh` を実行してhotel-saasをデプロイ
2. `~/deploy-scripts/deploy-pms.sh` を実行してhotel-pmsをデプロイ
3. ...

## データベース接続情報
- ホスト: 163.44.97.2
- ユーザー: hotel_app
- データベース: hotel_saas_dev, hotel_pms_dev, hotel_member_dev, hotel_common_dev

## 環境変数設定
各プロジェクトの`.env`ファイルで環境変数を設定してください。

## トラブルシューティング
- PM2ログの確認: `pm2 logs`
- システムログの確認: `sudo journalctl -u node_exporter`
```

## 8. バージョン管理ファイル作成

```bash
# バージョン管理ファイル作成
nano ~/projects/versions.json
```

**versions.json**:
```json
{
  "hotel-saas": {
    "version": "0.1.0",
    "last_deploy": "",
    "branch": "main",
    "commit": ""
  },
  "hotel-pms": {
    "version": "0.1.0",
    "last_deploy": "",
    "branch": "main",
    "commit": ""
  },
  "hotel-member": {
    "version": "0.1.0",
    "last_deploy": "",
    "branch": "main",
    "commit": ""
  },
  "hotel-common": {
    "version": "0.1.0",
    "last_deploy": "",
    "branch": "main",
    "commit": ""
  }
}
```

## 9. 最終確認

### 9.1 サービス稼働確認

両サーバーで:

```bash
# システム状態確認
htop
df -h
free -m

# サービス確認
sudo systemctl status postgresql  # データベースサーバー
pm2 status  # アプリケーションサーバー
```

### 9.2 ファイアウォール確認

両サーバーで:

```bash
sudo ufw status verbose
```

## 10. リモート開発環境設定

### 10.1 Cursor/VSCodeでのリモート開発設定

1. Cursorを開く
2. リモート接続設定を選択
3. SSHホスト設定に以下を入力:
   - ホスト: `admin@163.44.117.60`
   - ポート: `22`
   - 認証方法: SSH鍵
   - ワークスペースパス: `/home/admin/projects/hotel-saas`（または他のプロジェクト）

これで開発サーバーの初期セットアップは完了です。各プロジェクトのデプロイスクリプトを実行して、アプリケーションをデプロイできます。