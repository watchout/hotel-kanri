#!/bin/bash

# hotel-commonからの重複ドキュメント削除スクリプト
# 使用法: ./remove-duplicate-docs.sh [hotel-commonのパス]
# 例: ./remove-duplicate-docs.sh /path/to/hotel-common

set -e

# 引数チェック
if [ $# -lt 1 ]; then
  echo "使用法: $0 [hotel-commonのパス]"
  echo "例: $0 /path/to/hotel-common"
  exit 1
fi

REPO_PATH=$1
TIMESTAMP=$(date +%Y%m%d%H%M%S)
BRANCH_NAME="feature/remove-duplicate-docs-$TIMESTAMP"
LOG_FILE="remove-duplicate-docs-$TIMESTAMP.log"

echo "hotel-commonからの重複ドキュメント削除を開始します..." | tee -a $LOG_FILE
echo "リポジトリパス: $REPO_PATH" | tee -a $LOG_FILE
echo "ブランチ名: $BRANCH_NAME" | tee -a $LOG_FILE
echo "----------------------------------------" | tee -a $LOG_FILE

# リポジトリの存在確認
if [ ! -d "$REPO_PATH" ]; then
  echo "エラー: リポジトリが見つかりません: $REPO_PATH" | tee -a $LOG_FILE
  exit 1
fi

# リポジトリが.gitディレクトリを持っているか確認
if [ ! -d "$REPO_PATH/.git" ]; then
  echo "エラー: 有効なGitリポジトリではありません: $REPO_PATH" | tee -a $LOG_FILE
  exit 1
fi

# リポジトリに移動
cd "$REPO_PATH"

# 現在のブランチを保存
CURRENT_BRANCH=$(git branch --show-current)
echo "現在のブランチ: $CURRENT_BRANCH" | tee -a $LOG_FILE

# developブランチを最新化
echo "developブランチを最新化しています..." | tee -a $LOG_FILE
git checkout develop
git pull origin develop

# 新しいブランチを作成
echo "新しいブランチを作成しています: $BRANCH_NAME" | tee -a $LOG_FILE
git checkout -b "$BRANCH_NAME"

# 削除対象のドキュメント一覧
echo "削除対象のドキュメントを特定しています..." | tee -a $LOG_FILE
DOCS_TO_REMOVE=(
  "docs/development-rules-and-documentation-standards.md"
  "docs/roadmap/current-roadmap.md"
  "docs/management/repository-management-structure.md"
  "docs/domain-management-strategy.md"
  "docs/dev-server-domain-implementation-plan.md"
)

# ドキュメントの削除
echo "ドキュメントを削除しています..." | tee -a $LOG_FILE
for doc in "${DOCS_TO_REMOVE[@]}"; do
  if [ -f "$doc" ]; then
    echo "削除: $doc" | tee -a $LOG_FILE
    git rm "$doc"
  else
    echo "スキップ: $doc (ファイルが見つかりません)" | tee -a $LOG_FILE
  fi
done

# README.mdの更新
if [ -f "README.md" ]; then
  echo "README.mdを更新しています..." | tee -a $LOG_FILE
  
  # バックアップの作成
  cp README.md README.md.bak
  
  # 参照先の更新
  sed -i.bak 's|docs/development-rules-and-documentation-standards.md|https://github.com/example/hotel-kanri/blob/main/docs/development/development-rules-and-documentation-standards.md|g' README.md
  sed -i.bak 's|docs/roadmap/current-roadmap.md|https://github.com/example/hotel-kanri/blob/main/docs/roadmap/current-roadmap.md|g' README.md
  sed -i.bak 's|docs/management/repository-management-structure.md|https://github.com/example/hotel-kanri/blob/main/docs/management/repository-management-structure.md|g' README.md
  sed -i.bak 's|docs/domain-management-strategy.md|https://github.com/example/hotel-kanri/blob/main/docs/infrastructure/domains/domain-management-strategy.md|g' README.md
  sed -i.bak 's|docs/dev-server-domain-implementation-plan.md|https://github.com/example/hotel-kanri/blob/main/docs/infrastructure/domains/dev-server-domain-implementation-plan.md|g' README.md
  
  # バックアップファイルの削除
  rm -f README.md.bak
  
  # 変更を確認
  if diff -q README.md README.md.bak > /dev/null; then
    echo "README.mdに変更はありませんでした" | tee -a $LOG_FILE
  else
    echo "README.mdを更新しました" | tee -a $LOG_FILE
    rm -f README.md.bak
  fi
else
  echo "警告: README.mdが見つかりません" | tee -a $LOG_FILE
fi

# 変更の確認
echo "変更を確認しています..." | tee -a $LOG_FILE
git status | tee -a $LOG_FILE

# 変更があるか確認
if git diff-index --quiet HEAD --; then
  echo "変更はありませんでした。ブランチを削除して元のブランチに戻ります。" | tee -a $LOG_FILE
  git checkout "$CURRENT_BRANCH"
  git branch -D "$BRANCH_NAME"
  exit 0
fi

# 変更をコミット
echo "変更をコミットしています..." | tee -a $LOG_FILE
git add .
git commit -m "docs: 重複するドキュメントを削除し、hotel-kanriリポジトリへの参照を追加"

# ブランチをプッシュ
echo "ブランチをプッシュしています..." | tee -a $LOG_FILE
git push origin "$BRANCH_NAME"

# Pull Requestの作成手順を表示
echo "Pull Requestを作成するには以下の手順を実行してください:" | tee -a $LOG_FILE
echo "1. ブラウザで以下のURLを開く:" | tee -a $LOG_FILE
echo "   https://github.com/example/hotel-common/pull/new/$BRANCH_NAME" | tee -a $LOG_FILE
echo "2. タイトルを設定: 'docs: 重複するドキュメントを削除し、hotel-kanriリポジトリへの参照を追加'" | tee -a $LOG_FILE
echo "3. 説明を記入:" | tee -a $LOG_FILE
echo "   hotel-kanriリポジトリへのドキュメント移行に伴い、重複するドキュメントを削除し、README.mdの参照先をhotel-kanriリポジトリに更新します。" | tee -a $LOG_FILE
echo "4. レビュアーを設定" | tee -a $LOG_FILE
echo "5. 'Create pull request'ボタンをクリック" | tee -a $LOG_FILE

# 元のブランチに戻る
git checkout "$CURRENT_BRANCH"

echo "処理が完了しました。" | tee -a $LOG_FILE
echo "ログファイル: $LOG_FILE" | tee -a $LOG_FILE
exit 0