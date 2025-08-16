#!/bin/bash

# 複数リポジトリの参照先一括更新スクリプト
# 使用法: ./batch-update-references.sh [ベースディレクトリ]
# 例: ./batch-update-references.sh /path/to/repositories

set -e

# 引数チェック
if [ $# -lt 1 ]; then
  echo "使用法: $0 [ベースディレクトリ]"
  echo "例: $0 /path/to/repositories"
  exit 1
fi

BASE_DIR=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATE_SCRIPT="$SCRIPT_DIR/update-references.sh"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
REPOS=("hotel-common" "hotel-saas" "hotel-pms" "hotel-member")
LOG_FILE="reference-update-$TIMESTAMP.log"

echo "複数リポジトリの参照先一括更新を開始します..." | tee -a $LOG_FILE
echo "ベースディレクトリ: $BASE_DIR" | tee -a $LOG_FILE
echo "タイムスタンプ: $TIMESTAMP" | tee -a $LOG_FILE
echo "対象リポジトリ: ${REPOS[*]}" | tee -a $LOG_FILE
echo "----------------------------------------" | tee -a $LOG_FILE

# スクリプトが実行可能かチェック
if [ ! -x "$UPDATE_SCRIPT" ]; then
  echo "更新スクリプトに実行権限を付与します..." | tee -a $LOG_FILE
  chmod +x "$UPDATE_SCRIPT"
fi

# 各リポジトリの更新
for repo in "${REPOS[@]}"; do
  REPO_PATH="$BASE_DIR/$repo"
  
  echo "[$repo] 処理を開始します..." | tee -a $LOG_FILE
  
  # リポジトリの存在確認
  if [ ! -d "$REPO_PATH" ]; then
    echo "[$repo] エラー: リポジトリが見つかりません: $REPO_PATH" | tee -a $LOG_FILE
    continue
  fi
  
  # リポジトリが.gitディレクトリを持っているか確認
  if [ ! -d "$REPO_PATH/.git" ]; then
    echo "[$repo] エラー: 有効なGitリポジトリではありません: $REPO_PATH" | tee -a $LOG_FILE
    continue
  fi
  
  # 更新スクリプトの実行
  echo "[$repo] 参照先を更新しています..." | tee -a $LOG_FILE
  if $UPDATE_SCRIPT "$REPO_PATH" >> $LOG_FILE 2>&1; then
    echo "[$repo] 参照先の更新が完了しました" | tee -a $LOG_FILE
  else
    echo "[$repo] エラー: 参照先の更新に失敗しました" | tee -a $LOG_FILE
  fi
  
  echo "[$repo] 処理が完了しました" | tee -a $LOG_FILE
  echo "----------------------------------------" | tee -a $LOG_FILE
done

echo "すべてのリポジトリの処理が完了しました" | tee -a $LOG_FILE
echo "ログファイル: $LOG_FILE" | tee -a $LOG_FILE

# Pull Request作成手順の表示
echo ""
echo "Pull Requestを作成するには以下の手順を実行してください:"
for repo in "${REPOS[@]}"; do
  BRANCH_NAME="feature/update-kanri-references-$TIMESTAMP"
  echo "[$repo]"
  echo "1. ブラウザで以下のURLを開く:"
  echo "   https://github.com/example/$repo/pull/new/$BRANCH_NAME"
  echo "2. タイトルを設定: 'docs: hotel-kanriリポジトリへの参照を更新'"
  echo "3. 説明を記入:"
  echo "   hotel-kanriリポジトリへのドキュメントと設定ファイルの移行に伴い、参照先を更新します。"
  echo "4. レビュアーを設定"
  echo "5. 'Create pull request'ボタンをクリック"
  echo ""
done

exit 0