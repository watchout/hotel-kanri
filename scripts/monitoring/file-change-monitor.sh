#!/bin/bash
# file-change-monitor.sh
# サーバー上のファイル変更を監視し、不正な変更を検出するスクリプト
# 作成日: 2023年8月17日

set -e

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
  logger -t "file-monitor" "INFO: $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
  logger -t "file-monitor" "WARNING: $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
  logger -t "file-monitor" "ERROR: $1"
}

# 設定
MONITOR_DIRS=(
  "/opt/omotenasuai/hotel-saas"
  "/opt/omotenasuai/hotel-common"
  "/opt/omotenasuai/hotel-pms"
  "/opt/omotenasuai/hotel-member"
)
CHECKSUM_DIR="/var/log/file-monitor"
CHECKSUM_FILE="$CHECKSUM_DIR/checksums.txt"
CHANGE_LOG="$CHECKSUM_DIR/changes.log"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/TXXXXXXXX/BXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX"
EXCLUDE_PATTERNS=(
  "*.log"
  "*.tmp"
  "node_modules/*"
  ".git/*"
  ".nuxt/*"
  "dist/*"
)

# 初期化
mkdir -p "$CHECKSUM_DIR"
touch "$CHECKSUM_FILE"
touch "$CHANGE_LOG"
chmod 644 "$CHECKSUM_FILE"
chmod 644 "$CHANGE_LOG"

# 除外パターンの構築
EXCLUDE_ARGS=""
for pattern in "${EXCLUDE_PATTERNS[@]}"; do
  EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude='$pattern'"
done

# Slack通知関数
send_slack_notification() {
  local message="$1"
  local color="$2"
  
  # Slack通知が設定されている場合のみ実行
  if [[ -n "$SLACK_WEBHOOK_URL" && "$SLACK_WEBHOOK_URL" != "https://hooks.slack.com/services/TXXXXXXXX/BXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX" ]]; then
    curl -s -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"$message\", \"color\":\"$color\"}" \
      "$SLACK_WEBHOOK_URL"
  fi
}

# 変更検出関数
detect_changes() {
  local dir="$1"
  local temp_file=$(mktemp)
  
  log_info "ディレクトリを検査中: $dir"
  
  # 現在のチェックサムを計算
  eval find "$dir" -type f $EXCLUDE_ARGS -exec md5sum {} \; | sort > "$temp_file"
  
  # 前回のチェックサムと比較
  if grep -q "^$dir:" "$CHECKSUM_FILE"; then
    local prev_checksum_file=$(grep "^$dir:" "$CHECKSUM_FILE" | cut -d: -f2)
    
    if [ -f "$prev_checksum_file" ]; then
      # 変更を検出
      local changes=$(diff -u "$prev_checksum_file" "$temp_file" || true)
      
      if [ -n "$changes" ]; then
        local added=$(echo "$changes" | grep -c "^+" || true)
        local removed=$(echo "$changes" | grep -c "^-" || true)
        
        # 変更されたファイルのリスト
        local changed_files=$(echo "$changes" | grep "^[+-][^+-]" | awk '{print $2}' | sort | uniq)
        
        log_warning "変更が検出されました: $dir"
        log_warning "追加: $added, 削除: $removed"
        log_warning "変更されたファイル:"
        echo "$changed_files"
        
        # 変更ログに記録
        {
          echo "==== $(date) ===="
          echo "ディレクトリ: $dir"
          echo "追加: $added, 削除: $removed"
          echo "変更されたファイル:"
          echo "$changed_files"
          echo ""
        } >> "$CHANGE_LOG"
        
        # Slack通知
        local message="⚠️ *ファイル変更検知* ⚠️\nディレクトリ: $dir\n追加: $added, 削除: $removed\n変更時刻: $(date)"
        send_slack_notification "$message" "danger"
      else
        log_info "変更なし: $dir"
      fi
    else
      log_warning "前回のチェックサムファイルが見つかりません: $prev_checksum_file"
    fi
  fi
  
  # 新しいチェックサムを保存
  local new_checksum_file="$CHECKSUM_DIR/$(basename "$dir")_$(date +%Y%m%d_%H%M%S).md5"
  mv "$temp_file" "$new_checksum_file"
  
  # チェックサムファイルの参照を更新
  sed -i "/^$dir:/d" "$CHECKSUM_FILE"
  echo "$dir:$new_checksum_file" >> "$CHECKSUM_FILE"
  
  log_info "チェックサム更新完了: $dir"
}

# Git状態確認関数
check_git_status() {
  local dir="$1"
  
  if [ -d "$dir/.git" ]; then
    log_info "Gitリポジトリの状態を確認中: $dir"
    
    # カレントディレクトリを保存
    local current_dir=$(pwd)
    
    # Gitリポジトリに移動
    cd "$dir"
    
    # Git状態を確認
    local git_status=$(git status --porcelain)
    
    if [ -n "$git_status" ]; then
      log_warning "Gitリポジトリに未コミットの変更があります: $dir"
      log_warning "$git_status"
      
      # 変更ログに記録
      {
        echo "==== $(date) ===="
        echo "Gitリポジトリ: $dir"
        echo "未コミットの変更:"
        echo "$git_status"
        echo ""
      } >> "$CHANGE_LOG"
      
      # Slack通知
      local message="⚠️ *Git変更検知* ⚠️\nリポジトリ: $dir\n未コミットの変更があります\n検出時刻: $(date)"
      send_slack_notification "$message" "warning"
    else
      log_info "Gitリポジトリに未コミットの変更はありません: $dir"
    fi
    
    # 元のディレクトリに戻る
    cd "$current_dir"
  fi
}

# メイン処理
log_info "ファイル変更監視を開始します"

for dir in "${MONITOR_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    detect_changes "$dir"
    check_git_status "$dir"
  else
    log_warning "ディレクトリが存在しません: $dir"
  fi
done

log_info "ファイル変更監視が完了しました"

# 古いチェックサムファイルの削除（30日以上前のもの）
find "$CHECKSUM_DIR" -name "*.md5" -type f -mtime +30 -delete

# 監査ログのローテーション（1MB以上の場合）
if [ -f "$CHANGE_LOG" ] && [ $(stat -c%s "$CHANGE_LOG") -gt 1048576 ]; then
  mv "$CHANGE_LOG" "$CHANGE_LOG.$(date +%Y%m%d)"
  touch "$CHANGE_LOG"
  chmod 644 "$CHANGE_LOG"
  log_info "変更ログをローテーションしました"
fi
