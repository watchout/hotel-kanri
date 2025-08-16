#!/bin/bash

# omotenasuai.com サービス監視スクリプト
# 使用法: ./check-services.sh [環境]
# 例: ./check-services.sh dev

set -e

# 引数チェック
if [ $# -lt 1 ]; then
  echo "使用法: $0 [環境]"
  echo "環境: dev, test, prod"
  exit 1
fi

# 変数設定
ENV=$1
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/XXXXXXXXX/XXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX"
EMAIL_RECIPIENT="admin@omotenasuai.com"

# 環境設定
case $ENV in
  dev)
    SERVER="dev.omotenasuai.com"
    BASE_URL="https://dev.omotenasuai.com"
    ;;
  test)
    SERVER="test.omotenasuai.com"
    BASE_URL="https://test.omotenasuai.com"
    ;;
  prod)
    SERVER="www.omotenasuai.com"
    BASE_URL="https://www.omotenasuai.com"
    ;;
  *)
    echo "不正な環境: $ENV"
    exit 1
    ;;
esac

# サービスURLの設定
COMMON_URL="${BASE_URL}/health"
SAAS_URL="${BASE_URL}/saas/health"
PMS_URL="${BASE_URL}/pms/health"
MEMBER_URL="${BASE_URL}/member/health"
API_URL="${BASE_URL}/api/health"

# Slackに通知を送信する関数
send_slack_notification() {
  local service=$1
  local status=$2
  local message=$3
  
  curl -s -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"[$ENV] $service $status: $message\"}" \
    $SLACK_WEBHOOK_URL
}

# メール通知を送信する関数
send_email_notification() {
  local service=$1
  local status=$2
  local message=$3
  
  echo "$message" | mail -s "[$ENV] $service $status" $EMAIL_RECIPIENT
}

# サービスの状態を確認する関数
check_service() {
  local service_name=$1
  local url=$2
  
  echo "[$service_name] 状態を確認しています..."
  
  # HTTPリクエストを送信して応答を確認
  response=$(curl -s -o /dev/null -w "%{http_code}" $url)
  
  if [ "$response" = "200" ]; then
    echo "[$service_name] 正常に動作しています"
  else
    echo "[$service_name] エラー: HTTP $response"
    send_slack_notification "$service_name" "ALERT" "サービスが応答していません。HTTP $response"
    send_email_notification "$service_name" "ALERT" "サービスが応答していません。HTTP $response"
    return 1
  fi
  
  return 0
}

# PM2プロセスの状態を確認する関数
check_pm2_processes() {
  echo "PM2プロセスの状態を確認しています..."
  
  # SSH経由でPM2プロセスの状態を取得
  pm2_status=$(ssh deploy@$SERVER "pm2 jlist")
  
  # 各サービスの状態を確認
  services=("hotel-common" "hotel-saas" "hotel-pms" "hotel-member")
  
  for service in "${services[@]}"; do
    status=$(echo $pm2_status | jq -r ".[] | select(.name == \"$service\") | .pm2_env.status")
    
    if [ "$status" = "online" ]; then
      echo "[$service] PM2プロセスは正常に実行中です"
    else
      echo "[$service] エラー: PM2プロセスの状態が $status です"
      send_slack_notification "$service" "ALERT" "PM2プロセスの状態が $status です"
      send_email_notification "$service" "ALERT" "PM2プロセスの状態が $status です"
    fi
  done
}

# システムリソースの状態を確認する関数
check_system_resources() {
  echo "システムリソースの状態を確認しています..."
  
  # SSH経由でシステムリソースの状態を取得
  cpu_usage=$(ssh deploy@$SERVER "top -bn1 | grep 'Cpu(s)' | awk '{print \$2 + \$4}'")
  memory_usage=$(ssh deploy@$SERVER "free | grep Mem | awk '{print \$3/\$2 * 100.0}'")
  disk_usage=$(ssh deploy@$SERVER "df -h / | grep / | awk '{print \$5}' | sed 's/%//'")
  
  # CPU使用率のチェック
  if (( $(echo "$cpu_usage > 80" | bc -l) )); then
    echo "警告: CPU使用率が高すぎます: ${cpu_usage}%"
    send_slack_notification "System" "WARNING" "CPU使用率が高すぎます: ${cpu_usage}%"
  else
    echo "CPU使用率は正常です: ${cpu_usage}%"
  fi
  
  # メモリ使用率のチェック
  if (( $(echo "$memory_usage > 85" | bc -l) )); then
    echo "警告: メモリ使用率が高すぎます: ${memory_usage}%"
    send_slack_notification "System" "WARNING" "メモリ使用率が高すぎます: ${memory_usage}%"
  else
    echo "メモリ使用率は正常です: ${memory_usage}%"
  fi
  
  # ディスク使用率のチェック
  if (( $(echo "$disk_usage > 90" | bc -l) )); then
    echo "警告: ディスク使用率が高すぎます: ${disk_usage}%"
    send_slack_notification "System" "WARNING" "ディスク使用率が高すぎます: ${disk_usage}%"
    send_email_notification "System" "WARNING" "ディスク使用率が高すぎます: ${disk_usage}%"
  else
    echo "ディスク使用率は正常です: ${disk_usage}%"
  fi
}

# データベース接続の状態を確認する関数
check_database_connection() {
  echo "データベース接続の状態を確認しています..."
  
  # SSH経由でデータベース接続をテスト
  db_status=$(ssh deploy@$SERVER "PGPASSWORD=\$DB_PASSWORD psql -h localhost -U omotenasuai -c 'SELECT 1' -d omotenasuai_${ENV} > /dev/null 2>&1 && echo 'OK' || echo 'ERROR'")
  
  if [ "$db_status" = "OK" ]; then
    echo "データベース接続は正常です"
  else
    echo "エラー: データベース接続に失敗しました"
    send_slack_notification "Database" "ALERT" "データベース接続に失敗しました"
    send_email_notification "Database" "ALERT" "データベース接続に失敗しました"
  fi
}

# メイン監視プロセス
echo "環境: $ENV"
echo "サーバー: $SERVER"
echo "監視を開始します..."

# 各サービスの状態を確認
check_service "Common" $COMMON_URL
check_service "SaaS" $SAAS_URL
check_service "PMS" $PMS_URL
check_service "Member" $MEMBER_URL
check_service "API" $API_URL

# PM2プロセスの状態を確認
check_pm2_processes

# システムリソースの状態を確認
check_system_resources

# データベース接続の状態を確認
check_database_connection

echo "監視が完了しました！"
exit 0