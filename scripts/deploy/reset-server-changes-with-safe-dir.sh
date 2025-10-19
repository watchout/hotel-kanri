#!/bin/bash
# reset-server-changes-with-safe-dir.sh
# サーバー上のローカルな変更を破棄し、GitHubからの最新変更を適用するスクリプト
# safe.directoryの設定も行います
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

# 引数チェック
if [ "$#" -lt 1 ]; then
  log_error "使用方法: $0 <リポジトリ名> [ブランチ名]"
  log_info "例: $0 hotel-saas main"
  exit 1
fi

REPO_NAME=$1
BRANCH_NAME=${2:-main}
REPO_DIR="/opt/omotenasuai/${REPO_NAME}"

log_info "${REPO_NAME}リポジトリのローカル変更をリセットします（ブランチ: ${BRANCH_NAME}）"

# リポジトリディレクトリの存在確認
if [ ! -d "$REPO_DIR" ]; then
  log_error "リポジトリディレクトリが存在しません: $REPO_DIR"
  exit 1
fi

# safe.directoryの設定
log_info "safe.directoryを設定しています..."
git config --global --add safe.directory "$REPO_DIR"
log_info "safe.directory設定完了"

# 現在の状態をバックアップ（念のため）
BACKUP_DIR="/tmp/${REPO_NAME}_backup_$(date +%Y%m%d_%H%M%S)"
log_info "現在の状態をバックアップしています: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -r "$REPO_DIR"/* "$BACKUP_DIR"/ 2>/dev/null || true
log_info "バックアップ完了"

# リポジトリディレクトリに移動
cd "$REPO_DIR"

# 現在の状態を確認
log_info "現在の状態を確認しています..."
git status

# 変更をリセット
log_warning "ローカルな変更をリセットします。この操作は元に戻せません。"
read -p "続行しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  log_info "操作をキャンセルしました"
  exit 0
fi

log_info "変更をリセットしています..."
git reset --hard HEAD
git clean -fd

# 最新の変更を取得
log_info "リモートから最新の変更を取得しています..."
git fetch origin

# 指定されたブランチに切り替え
log_info "ブランチを切り替えています: $BRANCH_NAME"
git checkout "$BRANCH_NAME"

# 最新の変更をプル
log_info "最新の変更をプルしています..."
git pull origin "$BRANCH_NAME"

# 状態を確認
log_info "リセット後の状態:"
git status

log_info "操作が完了しました"
log_info "バックアップは以下の場所に保存されています: $BACKUP_DIR"

# 依存関係のインストールとビルド（オプション）
read -p "依存関係のインストールとビルドを行いますか？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  log_info "依存関係をインストールしています..."
  npm install --legacy-peer-deps
  
  log_info "アプリケーションをビルドしています..."
  npm run build
  
  log_info "インストールとビルドが完了しました"
fi

# PM2での再起動（オプション）
read -p "PM2でアプリケーションを再起動しますか？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  log_info "PM2でアプリケーションを再起動しています..."
  pm2 restart "$REPO_NAME" || pm2 start ecosystem.config.js --only "$REPO_NAME" --env development
  
  log_info "PM2での再起動が完了しました"
  pm2 status
fi

log_info "すべての操作が完了しました"
