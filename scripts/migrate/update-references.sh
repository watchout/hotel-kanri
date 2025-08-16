#!/bin/bash

# 他リポジトリからの参照先更新スクリプト
# 使用法: ./update-references.sh [リポジトリパス]
# 例: ./update-references.sh /path/to/hotel-common

set -e

# 引数チェック
if [ $# -lt 1 ]; then
  echo "使用法: $0 [リポジトリパス]"
  echo "例: $0 /path/to/hotel-common"
  exit 1
fi

REPO_PATH=$1
REPO_NAME=$(basename "$REPO_PATH")
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BRANCH_NAME="feature/update-kanri-references-$TIMESTAMP"

echo "リポジトリ: $REPO_NAME"
echo "パス: $REPO_PATH"
echo "ブランチ名: $BRANCH_NAME"

# リポジトリに移動
cd "$REPO_PATH"

# 現在のブランチを保存
CURRENT_BRANCH=$(git branch --show-current)
echo "現在のブランチ: $CURRENT_BRANCH"

# developブランチを最新化
echo "developブランチを最新化しています..."
git checkout develop
git pull origin develop

# 新しいブランチを作成
echo "新しいブランチを作成しています: $BRANCH_NAME"
git checkout -b "$BRANCH_NAME"

# 参照先の更新
echo "参照先を更新しています..."

# READMEファイルの更新
if [ -f "README.md" ]; then
  echo "README.mdを更新しています..."
  sed -i.bak 's|hotel-common/docs|hotel-kanri/docs|g' README.md
  sed -i.bak 's|hotel-common/config|hotel-kanri/config|g' README.md
  rm -f README.md.bak
fi

# ドキュメントファイルの更新
echo "ドキュメントファイルを更新しています..."
find . -name "*.md" -type f -exec grep -l "hotel-common/docs" {} \; | while read file; do
  echo "更新: $file"
  sed -i.bak 's|hotel-common/docs|hotel-kanri/docs|g' "$file"
  rm -f "$file.bak"
done

# 設定ファイルの参照更新
echo "設定ファイルの参照を更新しています..."
find . -name "*.js" -o -name "*.ts" -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" -type f -exec grep -l "hotel-common/config" {} \; | while read file; do
  echo "更新: $file"
  sed -i.bak 's|hotel-common/config|hotel-kanri/config|g' "$file"
  rm -f "$file.bak"
done

# パッケージ設定の更新
if [ -f "package.json" ]; then
  echo "package.jsonを更新しています..."
  if grep -q "hotel-common" package.json; then
    sed -i.bak 's|"hotel-common": ".*"|"hotel-common": "latest"|g' package.json
    rm -f package.json.bak
  fi
fi

# 変更の確認
echo "変更を確認しています..."
git status

# 変更があるか確認
if git diff-index --quiet HEAD --; then
  echo "変更はありませんでした。ブランチを削除して元のブランチに戻ります。"
  git checkout "$CURRENT_BRANCH"
  git branch -D "$BRANCH_NAME"
  exit 0
fi

# 変更をコミット
echo "変更をコミットしています..."
git add .
git commit -m "docs: hotel-kanriリポジトリへの参照を更新"

# ブランチをプッシュ
echo "ブランチをプッシュしています..."
git push origin "$BRANCH_NAME"

# Pull Requestの作成手順を表示
echo "Pull Requestを作成するには以下の手順を実行してください:"
echo "1. ブラウザで以下のURLを開く:"
echo "   https://github.com/example/$REPO_NAME/pull/new/$BRANCH_NAME"
echo "2. タイトルを設定: 'docs: hotel-kanriリポジトリへの参照を更新'"
echo "3. 説明を記入:"
echo "   hotel-kanriリポジトリへのドキュメントと設定ファイルの移行に伴い、参照先を更新します。"
echo "4. レビュアーを設定"
echo "5. 'Create pull request'ボタンをクリック"

# 元のブランチに戻る
git checkout "$CURRENT_BRANCH"

echo "処理が完了しました。"
exit 0