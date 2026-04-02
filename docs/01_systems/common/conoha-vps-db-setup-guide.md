# ConoHa VPS データベースサーバーセットアップガイド

このガイドでは、ConoHa VPS上にPostgreSQLデータベースサーバー環境を構築する手順を説明します。

## 1. 初期アクセス設定

### 1.1 SSHキーの準備

ローカルマシンでSSHキーを生成します（既に持っている場合はスキップ可能）。

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

### 1.2 ConoHa VPSコントロールパネルでの設定

1. ConoHaコントロールパネルにログイン
2. 「サーバー管理」→「OmotenasuDB」を選択
3. 「設定変更」→「SSH Key」で公開鍵を登録
4. 「コンソール」からrootパスワードを確認

### 1.3 初回SSH接続

```bash
ssh root@163.44.97.2
```

初回接続時にパスワードを入力し、その後すぐにパスワードを変更します。

```bash
passwd
```

## 2. 基本セットアップ

### 2.1 セットアップスクリプトの転送

ローカルマシンからデータベースサーバーにセットアップスクリプトを転送します。

```bash
scp scripts/server-setup/initial-setup.sh root@163.44.97.2:/root/
```

### 2.2 スクリプトの実行

サーバーにSSH接続し、スクリプトを実行します。

```bash
ssh root@163.44.97.2
chmod +x /root/initial-setup.sh
./initial-setup.sh
```

スクリプト実行時に以下の情報を入力します：
- ホスト名: `omotenasu-db`
- サーバータイプ: `2` (データベースサーバー)
- スワップサイズ: `4` (GB)
- リモートアクセス: `y`
- アプリケーションサーバーのIP: `163.44.117.60`

## 3. PostgreSQL設定の最適化

### 3.1 PostgreSQLの設定ファイル編集

```bash
sudo nano /etc/postgresql/14/main/postgresql.conf
```

以下のパラメータを調整します：

```
# メモリ関連設定（4GB RAM環境の場合）
shared_buffers = 1GB                  # 全メモリの25%程度
work_mem = 32MB                       # クエリ実行時のメモリ
maintenance_work_mem = 256MB          # メンテナンス操作用メモリ
effective_cache_size = 2GB            # 全メモリの50%程度

# チューニング
max_connections = 100                 # 同時接続数
random_page_cost = 1.1                # SSDの場合
effective_io_concurrency = 200        # SSDの場合

# WAL設定
wal_buffers = 16MB                    # WALバッファサイズ
checkpoint_completion_target = 0.9    # チェックポイント完了目標
max_wal_size = 1GB                    # WALの最大サイズ

# その他
default_statistics_target = 100       # 統計情報の詳細さ
```

### 3.2 PostgreSQLの再起動

```bash
sudo systemctl restart postgresql
```

## 4. データベースセットアップスクリプトの転送と実行

### 4.1 スクリプトの転送

```bash
scp scripts/server-setup/db-setup.sh root@163.44.97.2:/root/
```

### 4.2 スクリプトの実行

```bash
ssh root@163.44.97.2
chmod +x /root/db-setup.sh
sudo -u postgres /root/db-setup.sh hotel_common hotel_user your_secure_password
```

## 5. バックアップ設定の強化

### 5.1 バックアップディレクトリの準備

```bash
sudo mkdir -p /var/backups/postgresql
sudo chown postgres:postgres /var/backups/postgresql
```

### 5.2 日次バックアップスクリプトの作成

```bash
sudo tee /usr/local/bin/pg_backup_enhanced.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="hotel_common"
RETENTION_DAYS=14

# 日次フルバックアップ
su - postgres -c "pg_dump -Fc $DB_NAME > $BACKUP_DIR/pg_dump_${DB_NAME}_$TIMESTAMP.dump"

# 週次全データベースバックアップ（日曜日）
if [ $(date +%u) -eq 7 ]; then
  su - postgres -c "pg_dumpall -c > $BACKUP_DIR/pg_dumpall_$TIMESTAMP.sql"
fi

# 古いバックアップの削除
find $BACKUP_DIR -name "pg_dump_*.dump" -type f -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "pg_dumpall_*.sql" -type f -mtime +$((RETENTION_DAYS*2)) -delete

# バックアップ結果のログ
echo "Backup completed at $(date)" >> $BACKUP_DIR/backup_history.log
du -sh $BACKUP_DIR/* | sort -h >> $BACKUP_DIR/backup_history.log
EOF

sudo chmod +x /usr/local/bin/pg_backup_enhanced.sh
```

### 5.3 cronジョブの設定

```bash
sudo bash -c '(crontab -l 2>/dev/null; echo "0 1 * * * /usr/local/bin/pg_backup_enhanced.sh") | crontab -'
```

## 6. セキュリティ強化

### 6.1 PostgreSQLユーザーのパスワードポリシー

```bash
sudo tee -a /etc/postgresql/14/main/pg_hba.conf << 'EOF'
# パスワード認証を強制
local   all             postgres                                md5
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
EOF

sudo systemctl restart postgresql
```

### 6.2 ファイアウォールの確認

```bash
sudo ufw status
```

アプリケーションサーバーからのみポート5432へのアクセスが許可されていることを確認します。

## 7. 監視設定

### 7.1 PostgreSQL統計情報の収集

```bash
sudo tee /usr/local/bin/pg_stats_collector.sh << 'EOF'
#!/bin/bash
LOG_DIR="/var/log/postgresql/stats"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $LOG_DIR

# データベース統計情報
su - postgres -c "psql -c 'SELECT * FROM pg_stat_database;'" > $LOG_DIR/pg_stat_database_$TIMESTAMP.log

# テーブル統計情報
su - postgres -c "psql -c 'SELECT * FROM pg_stat_user_tables;'" > $LOG_DIR/pg_stat_tables_$TIMESTAMP.log

# インデックス統計情報
su - postgres -c "psql -c 'SELECT * FROM pg_stat_user_indexes;'" > $LOG_DIR/pg_stat_indexes_$TIMESTAMP.log

# 古いログの削除
find $LOG_DIR -name "pg_stat_*.log" -type f -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/pg_stats_collector.sh
sudo bash -c '(crontab -l 2>/dev/null; echo "0 */6 * * * /usr/local/bin/pg_stats_collector.sh") | crontab -'
```

### 7.2 ディスク使用量の監視

```bash
sudo tee /usr/local/bin/disk_monitor.sh << 'EOF'
#!/bin/bash
THRESHOLD=80
USAGE=$(df -h / | grep -v Filesystem | awk '{print $5}' | sed 's/%//')

if [ $USAGE -gt $THRESHOLD ]; then
  echo "警告: ディスク使用量が ${USAGE}% に達しています" | mail -s "ディスク使用量警告: omotenasu-db" admin@example.com
fi
EOF

sudo chmod +x /usr/local/bin/disk_monitor.sh
sudo bash -c '(crontab -l 2>/dev/null; echo "0 */2 * * * /usr/local/bin/disk_monitor.sh") | crontab -'
```

## 8. パフォーマンステスト

### 8.1 pgbenchのインストール

```bash
sudo apt install -y postgresql-contrib
```

### 8.2 ベンチマークテストの実行

```bash
sudo -u postgres bash -c "pgbench -i -s 10 hotel_common"
sudo -u postgres bash -c "pgbench -c 10 -j 2 -T 60 hotel_common"
```

## 9. 接続テスト

### 9.1 ローカルからの接続テスト

```bash
sudo -u postgres psql -c "SELECT version();"
```

### 9.2 アプリケーションサーバーからの接続テスト

アプリケーションサーバーで以下のコマンドを実行：

```bash
psql -h 163.44.97.2 -U hotel_user -d hotel_common
```

## 10. 障害復旧テスト

### 10.1 バックアップからの復元テスト

```bash
# テスト用データベースの作成
sudo -u postgres createdb hotel_common_test

# 最新のバックアップを見つける
LATEST_BACKUP=$(ls -t /var/backups/postgresql/pg_dump_hotel_common_*.dump | head -1)

# バックアップから復元
sudo -u postgres pg_restore -d hotel_common_test $LATEST_BACKUP

# テスト用データベースの削除
sudo -u postgres dropdb hotel_common_test
```

## 11. ドキュメント化

### 11.1 設定情報の記録

```bash
# PostgreSQL設定の出力
sudo -u postgres psql -c "SHOW ALL;" > /root/postgresql_config.txt

# システム情報の出力
uname -a > /root/system_info.txt
cat /proc/cpuinfo >> /root/system_info.txt
free -h >> /root/system_info.txt
df -h >> /root/system_info.txt
```

## 12. 次のステップ

1. レプリケーション設定（将来的な冗長性のため）
2. 自動バキューム設定の最適化
3. 高度な監視システムの導入
4. 定期的なパフォーマンス分析の実施