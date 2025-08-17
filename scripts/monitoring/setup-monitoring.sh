#!/bin/bash
# setup-monitoring.sh
# サーバー監視システムのセットアップスクリプト
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
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# 設定
MONITOR_DIR="/opt/omotenasuai/monitoring"
LOG_DIR="/var/log/file-monitor"
CRON_FILE="/etc/cron.d/file-monitor"
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/TXXXXXXXX/BXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX"

# 引数チェック
if [ "$#" -lt 1 ]; then
  log_error "使用方法: $0 <Slack Webhook URL>"
  log_info "例: $0 https://hooks.slack.com/services/TXXXXXXXX/BXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX"
  exit 1
fi

if [ -n "$1" ]; then
  SLACK_WEBHOOK_URL="$1"
fi

# rootユーザーチェック
if [ "$(id -u)" -ne 0 ]; then
  log_error "このスクリプトはroot権限で実行する必要があります"
  log_info "sudo $0 $*"
  exit 1
fi

# ディレクトリ作成
log_info "監視システム用ディレクトリを作成しています..."
mkdir -p "$MONITOR_DIR"
mkdir -p "$LOG_DIR"
chmod 755 "$MONITOR_DIR"
chmod 755 "$LOG_DIR"

# ファイル変更監視スクリプトのコピー
log_info "ファイル変更監視スクリプトをコピーしています..."
cp "$(dirname "$0")/file-change-monitor.sh" "$MONITOR_DIR/"
chmod 755 "$MONITOR_DIR/file-change-monitor.sh"

# Slack Webhook URLの設定
log_info "Slack Webhook URLを設定しています..."
sed -i "s|https://hooks.slack.com/services/TXXXXXXXX/BXXXXXXXX/XXXXXXXXXXXXXXXXXXXXXXXX|$SLACK_WEBHOOK_URL|g" "$MONITOR_DIR/file-change-monitor.sh"

# Git変更検出スクリプトの作成
log_info "Git変更検出スクリプトを作成しています..."
cat > "$MONITOR_DIR/git-change-detector.sh" << 'EOF'
#!/bin/bash
# git-change-detector.sh
# Gitリポジトリの変更を検出するスクリプト

set -e

REPOS=(
  "/opt/omotenasuai/hotel-saas"
  "/opt/omotenasuai/hotel-common"
  "/opt/omotenasuai/hotel-pms"
  "/opt/omotenasuai/hotel-member"
)
LOG_FILE="/var/log/file-monitor/git-changes.log"

for repo in "${REPOS[@]}"; do
  if [ -d "$repo/.git" ]; then
    cd "$repo"
    echo "==== $(date) - $repo ====" >> "$LOG_FILE"
    git status --porcelain >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
  fi
done
EOF

chmod 755 "$MONITOR_DIR/git-change-detector.sh"

# デプロイ履歴記録スクリプトの作成
log_info "デプロイ履歴記録スクリプトを作成しています..."
cat > "$MONITOR_DIR/deployment-recorder.sh" << 'EOF'
#!/bin/bash
# deployment-recorder.sh
# デプロイ履歴を記録するスクリプト

set -e

REPOS=(
  "/opt/omotenasuai/hotel-saas"
  "/opt/omotenasuai/hotel-common"
  "/opt/omotenasuai/hotel-pms"
  "/opt/omotenasuai/hotel-member"
)
HISTORY_FILE="/var/log/file-monitor/deployment-history.log"

for repo in "${REPOS[@]}"; do
  if [ -d "$repo/.git" ]; then
    cd "$repo"
    echo "==== $(date) - $repo ====" >> "$HISTORY_FILE"
    echo "Current commit: $(git rev-parse HEAD)" >> "$HISTORY_FILE"
    echo "Current branch: $(git rev-parse --abbrev-ref HEAD)" >> "$HISTORY_FILE"
    echo "Last commit message: $(git log -1 --pretty=%B)" >> "$HISTORY_FILE"
    echo "Last commit author: $(git log -1 --pretty=%an)" >> "$HISTORY_FILE"
    echo "Last commit date: $(git log -1 --pretty=%ad)" >> "$HISTORY_FILE"
    echo "" >> "$HISTORY_FILE"
  fi
done
EOF

chmod 755 "$MONITOR_DIR/deployment-recorder.sh"

# 監視スクリプト実行用のラッパースクリプト
log_info "監視スクリプト実行用のラッパースクリプトを作成しています..."
cat > "$MONITOR_DIR/run-monitoring.sh" << 'EOF'
#!/bin/bash
# run-monitoring.sh
# 監視スクリプトを実行するラッパースクリプト

set -e

MONITOR_DIR="/opt/omotenasuai/monitoring"
LOG_DIR="/var/log/file-monitor"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ログディレクトリの確認
mkdir -p "$LOG_DIR"

# ファイル変更監視の実行
"$MONITOR_DIR/file-change-monitor.sh" > "$LOG_DIR/file-monitor-$TIMESTAMP.log" 2>&1

# Git変更検出の実行
"$MONITOR_DIR/git-change-detector.sh" > "$LOG_DIR/git-detector-$TIMESTAMP.log" 2>&1

# デプロイ履歴記録の実行
"$MONITOR_DIR/deployment-recorder.sh" > "$LOG_DIR/deployment-recorder-$TIMESTAMP.log" 2>&1

# 古いログファイルの削除（7日以上前のもの）
find "$LOG_DIR" -name "file-monitor-*.log" -type f -mtime +7 -delete
find "$LOG_DIR" -name "git-detector-*.log" -type f -mtime +7 -delete
find "$LOG_DIR" -name "deployment-recorder-*.log" -type f -mtime +7 -delete
EOF

chmod 755 "$MONITOR_DIR/run-monitoring.sh"

# cronジョブの設定
log_info "cronジョブを設定しています..."
cat > "$CRON_FILE" << EOF
# ファイル変更監視 - 1時間ごとに実行
0 * * * * root $MONITOR_DIR/run-monitoring.sh

# デプロイ履歴記録 - 1日1回実行
0 0 * * * root $MONITOR_DIR/deployment-recorder.sh
EOF

chmod 644 "$CRON_FILE"

# cronサービスの再起動
log_info "cronサービスを再起動しています..."
systemctl restart cron || service cron restart

# 初回実行
log_info "監視スクリプトを初回実行しています..."
"$MONITOR_DIR/run-monitoring.sh"

log_info "セットアップが完了しました"
log_info "ログファイルは $LOG_DIR に保存されます"
log_info "監視スクリプトは1時間ごとに自動実行されます"
