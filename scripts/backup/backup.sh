#!/bin/bash

# omotenasuai.com バックアップスクリプト
# 使用法: ./backup.sh [環境]
# 例: ./backup.sh dev

set -e

# 引数チェック
if [ $# -lt 1 ]; then
  echo "使用法: $0 [環境]"
  echo "環境: dev, test, prod"
  exit 1
fi

# 変数設定
ENV=$1
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="/opt/backups"
S3_BUCKET="omotenasuai-backups"
RETENTION_DAYS=30

# 環境設定
case $ENV in
  dev)
    SERVER="dev.omotenasuai.com"
    DB_NAME="omotenasuai_dev"
    ;;
  test)
    SERVER="test.omotenasuai.com"
    DB_NAME="omotenasuai_test"
    ;;
  prod)
    SERVER="www.omotenasuai.com"
    DB_NAME="omotenasuai_prod"
    ;;
  *)
    echo "不正な環境: $ENV"
    exit 1
    ;;
esac

# データベースバックアップ関数
backup_database() {
  echo "データベースバックアップを作成しています..."
  
  # バックアップディレクトリ作成
  ssh deploy@$SERVER "mkdir -p $BACKUP_DIR/db"
  
  # PostgreSQLダンプ作成
  ssh deploy@$SERVER "PGPASSWORD=\$DB_PASSWORD pg_dump -h localhost -U omotenasuai -F c -b -v -f $BACKUP_DIR/db/${DB_NAME}_$TIMESTAMP.dump $DB_NAME"
  
  # S3にアップロード
  ssh deploy@$SERVER "aws s3 cp $BACKUP_DIR/db/${DB_NAME}_$TIMESTAMP.dump s3://$S3_BUCKET/$ENV/db/${DB_NAME}_$TIMESTAMP.dump"
  
  echo "データベースバックアップが完了しました！"
}

# ファイルバックアップ関数
backup_files() {
  echo "ファイルバックアップを作成しています..."
  
  # バックアップディレクトリ作成
  ssh deploy@$SERVER "mkdir -p $BACKUP_DIR/files"
  
  # アプリケーションディレクトリの圧縮
  ssh deploy@$SERVER "tar -czf $BACKUP_DIR/files/app_$TIMESTAMP.tar.gz -C /opt/omotenasuai ."
  
  # アップロードディレクトリの圧縮
  ssh deploy@$SERVER "if [ -d /var/www/omotenasuai/uploads ]; then \
    tar -czf $BACKUP_DIR/files/uploads_$TIMESTAMP.tar.gz -C /var/www/omotenasuai uploads; \
  fi"
  
  # 設定ファイルの圧縮
  ssh deploy@$SERVER "tar -czf $BACKUP_DIR/files/config_$TIMESTAMP.tar.gz -C /etc/nginx sites-available/omotenasuai.conf nginx.conf"
  
  # S3にアップロード
  ssh deploy@$SERVER "aws s3 cp $BACKUP_DIR/files/app_$TIMESTAMP.tar.gz s3://$S3_BUCKET/$ENV/files/app_$TIMESTAMP.tar.gz"
  ssh deploy@$SERVER "if [ -f $BACKUP_DIR/files/uploads_$TIMESTAMP.tar.gz ]; then \
    aws s3 cp $BACKUP_DIR/files/uploads_$TIMESTAMP.tar.gz s3://$S3_BUCKET/$ENV/files/uploads_$TIMESTAMP.tar.gz; \
  fi"
  ssh deploy@$SERVER "aws s3 cp $BACKUP_DIR/files/config_$TIMESTAMP.tar.gz s3://$S3_BUCKET/$ENV/files/config_$TIMESTAMP.tar.gz"
  
  echo "ファイルバックアップが完了しました！"
}

# 古いバックアップのクリーンアップ
cleanup_old_backups() {
  echo "古いバックアップをクリーンアップしています..."
  
  # ローカルの古いバックアップを削除
  ssh deploy@$SERVER "find $BACKUP_DIR/db -name \"*.dump\" -type f -mtime +$RETENTION_DAYS -delete"
  ssh deploy@$SERVER "find $BACKUP_DIR/files -name \"*.tar.gz\" -type f -mtime +$RETENTION_DAYS -delete"
  
  # S3の古いバックアップを削除
  ssh deploy@$SERVER "aws s3 ls s3://$S3_BUCKET/$ENV/db/ | grep -v latest | sort -r | tail -n +30 | awk '{print \$4}' | xargs -I {} aws s3 rm s3://$S3_BUCKET/$ENV/db/{}"
  ssh deploy@$SERVER "aws s3 ls s3://$S3_BUCKET/$ENV/files/ | grep -v latest | sort -r | tail -n +30 | awk '{print \$4}' | xargs -I {} aws s3 rm s3://$S3_BUCKET/$ENV/files/{}"
  
  echo "クリーンアップが完了しました！"
}

# 最新バックアップのマーキング
mark_latest_backup() {
  echo "最新バックアップをマーキングしています..."
  
  # 最新のデータベースバックアップをコピー
  ssh deploy@$SERVER "aws s3 cp s3://$S3_BUCKET/$ENV/db/${DB_NAME}_$TIMESTAMP.dump s3://$S3_BUCKET/$ENV/db/latest.dump"
  
  # 最新のファイルバックアップをコピー
  ssh deploy@$SERVER "aws s3 cp s3://$S3_BUCKET/$ENV/files/app_$TIMESTAMP.tar.gz s3://$S3_BUCKET/$ENV/files/latest_app.tar.gz"
  ssh deploy@$SERVER "if [ -f $BACKUP_DIR/files/uploads_$TIMESTAMP.tar.gz ]; then \
    aws s3 cp s3://$S3_BUCKET/$ENV/files/uploads_$TIMESTAMP.tar.gz s3://$S3_BUCKET/$ENV/files/latest_uploads.tar.gz; \
  fi"
  ssh deploy@$SERVER "aws s3 cp s3://$S3_BUCKET/$ENV/files/config_$TIMESTAMP.tar.gz s3://$S3_BUCKET/$ENV/files/latest_config.tar.gz"
  
  echo "マーキングが完了しました！"
}

# メインバックアッププロセス
echo "環境: $ENV"
echo "サーバー: $SERVER"
echo "バックアップを開始します..."

backup_database
backup_files
cleanup_old_backups
mark_latest_backup

echo "バックアップが正常に完了しました！"
exit 0