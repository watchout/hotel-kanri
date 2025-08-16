#!/bin/bash

# バージョン確認スクリプト
# 使用方法: ./scripts/version/check-versions.sh [environment]

set -e

ENVIRONMENT=${1:-development}
SERVER_IP="163.44.117.60"
DEPLOY_USER="deploy"

echo "🔍 バージョン確認: $ENVIRONMENT 環境"
echo "=================================="

# ローカルのversions.jsonから期待バージョンを取得
if [ -f "config/versions.json" ]; then
    echo "📋 設定ファイルのバージョン:"
    jq -r '.applications | to_entries[] | "\(.key): \(.value.version)"' config/versions.json
    echo ""
fi

# サーバー上の実際のバージョンを確認
echo "🖥️  サーバー上の実際のバージョン:"
echo "--------------------------------"

check_service_version() {
    local service=$1
    local port=$2
    
    echo -n "[$service] "
    
    # Gitバージョン確認
    git_version=$(ssh $DEPLOY_USER@$SERVER_IP "cd /opt/omotenasuai/$service 2>/dev/null && git describe --tags --always 2>/dev/null || echo 'N/A'")
    
    # サービス稼働確認
    health_status=$(ssh $DEPLOY_USER@$SERVER_IP "curl -s -o /dev/null -w '%{http_code}' http://localhost:$port/health 2>/dev/null || echo '000'")
    
    if [ "$health_status" = "200" ]; then
        status="🟢 稼働中"
    else
        status="🔴 停止中"
    fi
    
    echo "Git: $git_version | Status: $status | Port: $port"
}

# 各サービスのバージョン確認
check_service_version "hotel-common" "3400"
check_service_version "hotel-saas" "3100"
check_service_version "hotel-pms" "3300"
check_service_version "hotel-member" "3200"

echo ""
echo "🔄 PM2プロセス状況:"
echo "-------------------"
ssh $DEPLOY_USER@$SERVER_IP "pm2 list 2>/dev/null || echo 'PM2が起動していません'"

echo ""
echo "📊 システム情報:"
echo "---------------"
ssh $DEPLOY_USER@$SERVER_IP "echo 'サーバー時刻:' \$(date)"
ssh $DEPLOY_USER@$SERVER_IP "echo 'アップタイム:' \$(uptime -p)"

echo ""
echo "✅ バージョン確認完了"
