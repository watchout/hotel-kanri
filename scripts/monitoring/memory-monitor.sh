#!/bin/bash
# メモリ使用量監視スクリプト
#
# ADR-017 Step 5: 監視・アラート設定
# サーバー956MB制約に対応
#
# 10分間隔でcron実行を想定:
#   */10 * * * * /opt/omotenasuai/hotel-kanri/scripts/monitoring/memory-monitor.sh

set -euo pipefail

MEMORY_THRESHOLD_PERCENT="${MEMORY_THRESHOLD_PERCENT:-80}"
LOG_FILE="/var/log/omotenasuai/memory-monitor.log"

log() {
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] $*" | tee -a "$LOG_FILE" 2>/dev/null || echo "[$timestamp] $*"
}

send_alert() {
  local message="$1"
  if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      -d "text=⚠️ OmotenasuAI Memory Alert\n\n${message}" >/dev/null 2>&1 || true
  fi
}

# ==========================
# メモリチェック
# ==========================

# システム全体
total_mem=$(free -m | awk '/^Mem:/ {print $2}')
used_mem=$(free -m | awk '/^Mem:/ {print $3}')
available_mem=$(free -m | awk '/^Mem:/ {print $7}')
mem_percent=$((used_mem * 100 / total_mem))

log "メモリ: ${used_mem}MB / ${total_mem}MB (${mem_percent}%) — 空き: ${available_mem}MB"

# Dockerコンテナ別
log "--- Dockerコンテナ別 ---"
docker stats --no-stream --format "  {{.Name}}: {{.MemUsage}} ({{.MemPerc}})" 2>/dev/null | while read -r line; do
  log "$line"
done

# 閾値チェック
if [ "$mem_percent" -ge "$MEMORY_THRESHOLD_PERCENT" ]; then
  alert_msg="メモリ使用量が${mem_percent}%に達しました（閾値: ${MEMORY_THRESHOLD_PERCENT}%）\n合計: ${total_mem}MB / 使用: ${used_mem}MB / 空き: ${available_mem}MB"
  log "🚨 閾値超過!"
  send_alert "$alert_msg"
  exit 1
fi

log "✅ メモリ正常 (閾値: ${MEMORY_THRESHOLD_PERCENT}%)"
