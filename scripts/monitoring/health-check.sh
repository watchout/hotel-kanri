#!/bin/bash
# ヘルスチェック監視スクリプト
#
# ADR-017 Step 5: 監視・アラート設定
#
# 5分間隔でcron実行を想定:
#   */5 * * * * /opt/omotenasuai/hotel-kanri/scripts/monitoring/health-check.sh
#
# 環境変数:
#   TELEGRAM_BOT_TOKEN — Telegram通知用
#   TELEGRAM_CHAT_ID — 通知先チャットID
#   ALERT_WEBHOOK_URL — 汎用Webhook通知（オプション）

set -euo pipefail

# ==========================
# 設定
# ==========================

STG_APP_URL="${STG_APP_URL:-https://stg-app.omotenasuai.com}"
STG_API_URL="${STG_API_URL:-https://stg-api.omotenasuai.com}"
PROD_APP_URL="${PROD_APP_URL:-https://app.omotenasuai.com}"
PROD_API_URL="${PROD_API_URL:-https://api.omotenasuai.com}"

TIMEOUT=10
LOG_FILE="/var/log/omotenasuai/health-check.log"

# ==========================
# 関数
# ==========================

log() {
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] $*" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$timestamp] $*"
}

check_url() {
  local name="$1"
  local url="$2"
  local expected_code="${3:-200}"

  local status
  local response_time
  response_time=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000:0")
  status=$(echo "$response_time" | cut -d: -f1)
  local time_sec
  time_sec=$(echo "$response_time" | cut -d: -f2)

  if [ "$status" = "$expected_code" ] || [ "$status" = "302" ]; then
    log "✅ $name: HTTP $status (${time_sec}s)"
    return 0
  else
    log "❌ $name: HTTP $status (expected $expected_code) — $url"
    return 1
  fi
}

check_health_json() {
  local name="$1"
  local url="$2"

  local response
  response=$(curl -s --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "")

  if [ -z "$response" ]; then
    log "❌ $name: 応答なし — $url"
    return 1
  fi

  # JSON healthレスポンスのstatus確認
  local db_status
  db_status=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('database',d.get('db','unknown')))" 2>/dev/null || echo "unknown")

  if echo "$response" | grep -q '"status":"ok"\|"status":"healthy"'; then
    log "✅ $name: healthy (DB: $db_status)"
    return 0
  else
    log "❌ $name: unhealthy — $response"
    return 1
  fi
}

send_alert() {
  local message="$1"

  # Telegram通知
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=🚨 OmotenasuAI Alert\n\n${message}" \
      -d "parse_mode=HTML" >/dev/null 2>&1 || true
  fi

  # 汎用Webhook
  if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then
    curl -s -X POST "$ALERT_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"🚨 OmotenasuAI Alert: ${message}\"}" >/dev/null 2>&1 || true
  fi
}

# ==========================
# メイン
# ==========================

log "=== ヘルスチェック開始 ==="

failures=()

# ステージング
check_url "STG-APP" "$STG_APP_URL" "200" || failures+=("STG-APP")
check_health_json "STG-API" "$STG_API_URL/health" || failures+=("STG-API")

# 本番（URLが疎通する場合のみ）
if curl -s --max-time 3 "$PROD_API_URL" >/dev/null 2>&1; then
  check_url "PROD-APP" "$PROD_APP_URL" "200" || failures+=("PROD-APP")
  check_health_json "PROD-API" "$PROD_API_URL/health" || failures+=("PROD-API")
else
  log "⏭️ 本番URL未疎通（DNS未設定）— スキップ"
fi

# アラート送信
if [ ${#failures[@]} -gt 0 ]; then
  failure_list=$(printf ", %s" "${failures[@]}")
  failure_list=${failure_list:2}
  send_alert "以下のサービスが異常です: ${failure_list}"
  log "🚨 アラート送信: $failure_list"
  exit 1
else
  log "=== 全チェック正常 ==="
  exit 0
fi
