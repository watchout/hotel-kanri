#!/bin/bash
# =============================================================================
# Claude Code Web 環境セットアップスクリプト
# =============================================================================
# 目的: Claude Code Webのセッション開始時に必要なリポジトリをクローンする
# 使用: SessionStartフック または 手動実行
# =============================================================================

set -e

# クラウド環境かどうかを判定（ローカルではスキップ）
if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  echo "[setup-cloud-env] ローカル環境のためスキップ"
  exit 0
fi

echo "[setup-cloud-env] Claude Code Web環境を検出 - セットアップ開始"

# ベースディレクトリ（ホームまたはワークスペース）
BASE_DIR="${AUTODEV_BASE_DIR:-$HOME}"
echo "[setup-cloud-env] BASE_DIR: $BASE_DIR"

# hotel-common-rebuild のクローン/プル
COMMON_DIR="${AUTODEV_COMMON_DIR:-$BASE_DIR/hotel-common-rebuild}"
if [ -d "$COMMON_DIR/.git" ]; then
  echo "[setup-cloud-env] hotel-common-rebuild: 既存 → pull"
  cd "$COMMON_DIR" && git pull --rebase || true
else
  echo "[setup-cloud-env] hotel-common-rebuild: クローン"
  git clone https://github.com/watchout/hotel-common-rebuild.git "$COMMON_DIR" || {
    echo "[setup-cloud-env] ⚠️ クローン失敗（GitHub App未設定の可能性）"
  }
fi

# hotel-saas-rebuild のクローン/プル
SAAS_DIR="${AUTODEV_SAAS_DIR:-$BASE_DIR/hotel-saas-rebuild}"
if [ -d "$SAAS_DIR/.git" ]; then
  echo "[setup-cloud-env] hotel-saas-rebuild: 既存 → pull"
  cd "$SAAS_DIR" && git pull --rebase || true
else
  echo "[setup-cloud-env] hotel-saas-rebuild: クローン"
  git clone https://github.com/watchout/hotel-saas-rebuild.git "$SAAS_DIR" || {
    echo "[setup-cloud-env] ⚠️ クローン失敗（GitHub App未設定の可能性）"
  }
fi

# 依存関係インストール（オプション）
if [ "${AUTODEV_INSTALL_DEPS:-0}" = "1" ]; then
  echo "[setup-cloud-env] 依存関係インストール中..."
  
  if [ -d "$COMMON_DIR" ]; then
    cd "$COMMON_DIR" && npm install --prefer-offline --no-audit 2>/dev/null || npm install
  fi
  
  if [ -d "$SAAS_DIR" ]; then
    cd "$SAAS_DIR" && npm install --prefer-offline --no-audit 2>/dev/null || npm install
  fi
fi

# 環境変数をCLAUDE_ENV_FILEに書き出し（永続化）
if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "[setup-cloud-env] 環境変数を永続化: $CLAUDE_ENV_FILE"
  cat >> "$CLAUDE_ENV_FILE" << EOF
AUTODEV_KANRI_DIR=$CLAUDE_PROJECT_DIR
AUTODEV_COMMON_DIR=$COMMON_DIR
AUTODEV_SAAS_DIR=$SAAS_DIR
EOF
fi

echo "[setup-cloud-env] ✅ セットアップ完了"
echo "  - AUTODEV_KANRI_DIR: ${CLAUDE_PROJECT_DIR:-$(pwd)}"
echo "  - AUTODEV_COMMON_DIR: $COMMON_DIR"
echo "  - AUTODEV_SAAS_DIR: $SAAS_DIR"
