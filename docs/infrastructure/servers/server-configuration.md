# サーバー構成

## 概要

本ドキュメントでは、omotenasuai.comプロジェクトのサーバー構成について記載します。各環境におけるサーバースペック、OS設定、ミドルウェア構成、監視設定について定義します。

## サーバー一覧

### 開発環境

| サーバー名 | 役割 | スペック | OS | IPアドレス |
|-----------|------|---------|----|---------| 
| dev-web-01 | Webサーバー | 2vCPU, 4GB RAM | Ubuntu 22.04 LTS | 10.0.1.10 |
| dev-api-01 | APIサーバー | 4vCPU, 8GB RAM | Ubuntu 22.04 LTS | 10.0.2.10 |
| dev-db-01 | データベースサーバー | 4vCPU, 16GB RAM | Ubuntu 22.04 LTS | 10.0.3.10 |

### テスト環境

| サーバー名 | 役割 | スペック | OS | IPアドレス |
|-----------|------|---------|----|---------| 
| test-web-01 | Webサーバー | 2vCPU, 4GB RAM | Ubuntu 22.04 LTS | 10.1.1.10 |
| test-api-01 | APIサーバー | 4vCPU, 8GB RAM | Ubuntu 22.04 LTS | 10.1.2.10 |
| test-db-01 | データベースサーバー | 4vCPU, 16GB RAM | Ubuntu 22.04 LTS | 10.1.3.10 |

### 本番環境

| サーバー名 | 役割 | スペック | OS | IPアドレス |
|-----------|------|---------|----|---------| 
| prod-lb-01 | ロードバランサー | 2vCPU, 4GB RAM | Ubuntu 22.04 LTS | 10.2.0.10 |
| prod-lb-02 | ロードバランサー（冗長） | 2vCPU, 4GB RAM | Ubuntu 22.04 LTS | 10.2.0.11 |
| prod-web-01 | Webサーバー | 4vCPU, 8GB RAM | Ubuntu 22.04 LTS | 10.2.1.10 |
| prod-web-02 | Webサーバー | 4vCPU, 8GB RAM | Ubuntu 22.04 LTS | 10.2.2.10 |
| prod-api-01 | APIサーバー | 8vCPU, 16GB RAM | Ubuntu 22.04 LTS | 10.2.3.10 |
| prod-api-02 | APIサーバー | 8vCPU, 16GB RAM | Ubuntu 22.04 LTS | 10.2.4.10 |
| prod-db-01 | データベースサーバー（マスター） | 8vCPU, 32GB RAM | Ubuntu 22.04 LTS | 10.2.5.10 |
| prod-db-02 | データベースサーバー（スレーブ） | 8vCPU, 32GB RAM | Ubuntu 22.04 LTS | 10.2.6.10 |

## OS設定

### 共通設定

```bash
# タイムゾーン設定
timedatectl set-timezone Asia/Tokyo

# NTPサーバー設定
apt-get update
apt-get install -y chrony
echo "server ntp.nict.jp iburst" >> /etc/chrony/chrony.conf
systemctl restart chronyd

# ファイルディスクリプタ上限設定
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# カーネルパラメータ設定
cat > /etc/sysctl.d/99-custom.conf << EOF
net.ipv4.tcp_max_syn_backlog = 4096
net.core.somaxconn = 4096
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_keepalive_intvl = 15
EOF
sysctl -p /etc/sysctl.d/99-custom.conf

# セキュリティ設定
apt-get install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

### Webサーバー固有設定

```bash
# Nginxインストール
apt-get install -y nginx

# Nginxチューニング
cat > /etc/nginx/conf.d/performance.conf << EOF
worker_processes auto;
worker_rlimit_nofile 65535;
events {
    worker_connections 4096;
    multi_accept on;
}
http {
    keepalive_timeout 65;
    keepalive_requests 100;
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF
```

### APIサーバー固有設定

```bash
# Node.jsインストール
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# PM2インストール（旧構造用 - 非推奨）
<!-- 
⚠️ 2025年1月18日より非推奨
新しい統合Docker構造ではPM2は使用しません
npm install -g pm2

# PM2設定
cat > /etc/systemd/system/pm2-api.service << EOF
[Unit]
Description=PM2 process manager for Node.js
After=network.target

[Service]
Type=forking
User=api-user
ExecStart=/usr/local/bin/pm2 start /opt/api/ecosystem.config.js
ExecReload=/usr/local/bin/pm2 reload all
ExecStop=/usr/local/bin/pm2 kill
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
-->

# Docker & Docker Compose インストール（新構造）
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker deploy
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

systemctl enable pm2-api
```

### データベースサーバー固有設定

```bash
# PostgreSQLインストール
apt-get install -y postgresql-14

# PostgreSQL設定
cat > /etc/postgresql/14/main/conf.d/custom.conf << EOF
max_connections = 200
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 41MB
maintenance_work_mem = 2GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
EOF

# データベースバックアップスクリプト
cat > /usr/local/bin/backup-postgres.sh << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
mkdir -p \$BACKUP_DIR
pg_dumpall -U postgres | gzip > \$BACKUP_DIR/full_backup_\$TIMESTAMP.sql.gz
find \$BACKUP_DIR -name "full_backup_*.sql.gz" -mtime +7 -delete
EOF
chmod +x /usr/local/bin/backup-postgres.sh

# バックアップのcron設定
echo "0 1 * * * /usr/local/bin/backup-postgres.sh" > /etc/cron.d/postgres-backup
```

## ミドルウェア構成

### Nginx設定

#### 開発環境

```nginx
server {
    listen 80;
    server_name dev.omotenasuai.com;
    
    location / {
        proxy_pass http://localhost:3400;  # hotel-common
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /saas/ {
        proxy_pass http://localhost:3100;  # hotel-saas
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /pms/ {
        proxy_pass http://localhost:3300;  # hotel-pms
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /member/ {
        proxy_pass http://localhost:3200;  # hotel-member
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 本番環境

```nginx
server {
    listen 80;
    server_name www.omotenasuai.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.omotenasuai.com;
    
    ssl_certificate     /etc/letsencrypt/live/omotenasuai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/omotenasuai.com/privkey.pem;
    
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
    
    location / {
        proxy_pass http://common_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# バックエンドのロードバランシング設定
upstream common_backend {
    server 10.2.3.10:3400;
    server 10.2.4.10:3400;
}

upstream saas_backend {
    server 10.2.3.10:3100;
    server 10.2.4.10:3100;
}

upstream pms_backend {
    server 10.2.3.10:3300;
    server 10.2.4.10:3300;
}

upstream member_backend {
    server 10.2.3.10:3200;
    server 10.2.4.10:3200;
}
```

### Node.js/PM2設定

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'hotel-common',
      script: '/opt/api/hotel-common/dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3400
      }
    },
    {
      name: 'hotel-saas',
      script: '/opt/api/hotel-saas/dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3100
      }
    },
    {
      name: 'hotel-pms',
      script: '/opt/api/hotel-pms/dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3300
      }
    },
    {
      name: 'hotel-member',
      script: '/opt/api/hotel-member/dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3200
      }
    }
  ]
};
```

### PostgreSQL設定

#### マスター設定

```
# postgresql.conf
listen_addresses = '*'
max_connections = 200
shared_buffers = 8GB
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1GB
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/14/archive/%f'

# pg_hba.conf
host replication replicator 10.2.6.10/32 md5
```

#### スレーブ設定

```
# postgresql.conf
listen_addresses = '*'
max_connections = 200
shared_buffers = 8GB
hot_standby = on

# recovery.conf
standby_mode = 'on'
primary_conninfo = 'host=10.2.5.10 port=5432 user=replicator password=PASSWORD'
trigger_file = '/tmp/postgresql.trigger'
```

## 監視設定

### Prometheus + Grafana

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']
  
  - job_name: 'nginx'
    static_configs:
      - targets: ['localhost:9113']
  
  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:9187']
  
  - job_name: 'nodejs'
    static_configs:
      - targets: ['localhost:9503']
```

### アラート設定

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'job']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack'
  routes:
  - match:
      severity: critical
    receiver: 'pagerduty'

receivers:
- name: 'slack'
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/XXXXXXXXX/XXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX'
    channel: '#alerts'
    send_resolved: true
    title: '{{ .GroupLabels.alertname }}'
    text: '{{ .CommonAnnotations.description }}'

- name: 'pagerduty'
  pagerduty_configs:
  - service_key: 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    description: '{{ .CommonAnnotations.description }}'
```

## バックアップ設定

### データベースバックアップ

- **方式**: 論理バックアップ（pg_dumpall）
- **頻度**: 毎日1回（AM 1:00）
- **保存期間**: 7日間
- **保存場所**: ローカルディスク + S3バケット

### ファイルバックアップ

- **方式**: rsyncによる差分バックアップ
- **頻度**: 毎日1回（AM 2:00）
- **保存期間**: 30日間
- **保存場所**: バックアップサーバー + S3バケット

### バックアップスクリプト

```bash
#!/bin/bash
# ファイルバックアップスクリプト

SOURCE_DIR="/opt/api"
BACKUP_DIR="/var/backups/files"
TIMESTAMP=$(date +%Y%m%d)

# 差分バックアップ作成
rsync -avz --link-dest=$BACKUP_DIR/latest $SOURCE_DIR $BACKUP_DIR/$TIMESTAMP

# シンボリックリンク更新
rm -f $BACKUP_DIR/latest
ln -s $BACKUP_DIR/$TIMESTAMP $BACKUP_DIR/latest

# 古いバックアップ削除
find $BACKUP_DIR -maxdepth 1 -type d -name "20*" -mtime +30 -exec rm -rf {} \;

# S3へのアップロード
aws s3 sync $BACKUP_DIR/$TIMESTAMP s3://omotenasuai-backups/files/$TIMESTAMP
```

## 障害復旧手順

### Webサーバー障害

1. ロードバランサーからの切り離し
2. サーバー再起動または再構築
3. アプリケーションデプロイ
4. ヘルスチェック確認
5. ロードバランサーへの再登録

### APIサーバー障害

1. ロードバランサーからの切り離し
2. PM2プロセスの再起動
   ```
   pm2 restart all
   ```
3. 問題が解決しない場合はサーバー再起動
4. ヘルスチェック確認
5. ロードバランサーへの再登録

### データベースサーバー障害

#### マスター障害時

1. スレーブをマスターに昇格
   ```
   touch /tmp/postgresql.trigger
   ```
2. アプリケーション設定の更新
3. 元マスターの復旧
4. 元マスターをスレーブとして再構成

#### スレーブ障害時

1. スレーブサーバーの再起動
2. レプリケーションの再設定
   ```
   pg_basebackup -h 10.2.5.10 -U replicator -D /var/lib/postgresql/14/main -P -v -R
   ```
3. PostgreSQLサービスの再起動
4. レプリケーション状態の確認

## 責任者

- **サーバー設計責任者**: [役職名]
- **運用責任者**: [役職名]
- **バックアップ責任者**: [役職名]

## 定期メンテナンス

- **頻度**: 月1回
- **時間帯**: 深夜（1:00-5:00）
- **作業内容**:
  - OSアップデート
  - ミドルウェアアップデート
  - ログローテーション確認
  - バックアップ検証
  - ディスク使用率確認

---

本ドキュメントは定期的にレビューし、必要に応じて更新してください。最終更新日: 2025-09-12