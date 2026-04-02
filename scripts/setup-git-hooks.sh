#!/bin/bash

# Git Hooksを設定するスクリプト
#
# このスクリプトは以下を行います：
# 1. Git Hooksディレクトリの作成
# 2. Prismaチェック用のpre-commitフックの設定
# 3. 実行権限の付与
#
# 使用方法:
# ./scripts/setup-git-hooks.sh

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Git Hooksを設定しています...${NC}"

# リポジトリのルートディレクトリを取得
REPO_ROOT=$(git rev-parse --show-toplevel)

# Git Hooksディレクトリのパス
HOOKS_DIR="$REPO_ROOT/.git/hooks"

# スクリプトディレクトリのパス
SCRIPTS_DIR="$REPO_ROOT/scripts/git-hooks"

# Git Hooksディレクトリが存在するか確認
if [ ! -d "$HOOKS_DIR" ]; then
  echo -e "${RED}Git Hooksディレクトリが見つかりません: $HOOKS_DIR${NC}"
  echo "Gitリポジトリが正しく初期化されているか確認してください。"
  exit 1
fi

# スクリプトディレクトリが存在するか確認
if [ ! -d "$SCRIPTS_DIR" ]; then
  echo "スクリプトディレクトリを作成しています: $SCRIPTS_DIR"
  mkdir -p "$SCRIPTS_DIR"
fi

# Prismaチェック用のpre-commitフックが存在するか確認
PRISMA_CHECK_SCRIPT="$SCRIPTS_DIR/prisma-check"
if [ ! -f "$PRISMA_CHECK_SCRIPT" ]; then
  echo -e "${RED}Prismaチェックスクリプトが見つかりません: $PRISMA_CHECK_SCRIPT${NC}"
  echo "スクリプトを作成してください。"
  exit 1
fi

# pre-commitフックを設定
echo "pre-commitフックを設定しています..."
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"

# 既存のpre-commitフックがあるか確認
if [ -f "$PRE_COMMIT_HOOK" ]; then
  echo -e "${YELLOW}既存のpre-commitフックを検出しました。バックアップを作成します...${NC}"
  mv "$PRE_COMMIT_HOOK" "$PRE_COMMIT_HOOK.bak"
  echo "バックアップを作成しました: $PRE_COMMIT_HOOK.bak"
fi

# シンボリックリンクを作成
ln -sf "../../scripts/git-hooks/prisma-check" "$PRE_COMMIT_HOOK"

# 実行権限を付与
chmod +x "$PRISMA_CHECK_SCRIPT"
chmod +x "$PRE_COMMIT_HOOK"

echo -e "${GREEN}Git Hooksの設定が完了しました。${NC}"
echo "pre-commitフックが有効になりました: $PRE_COMMIT_HOOK"
echo ""
echo "以下のコマンドでフックをテストできます："
echo "  git commit --dry-run"
echo ""
exit 0



