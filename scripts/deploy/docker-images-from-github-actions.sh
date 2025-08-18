#!/bin/bash

# GitHub Actionsを使用してDockerイメージをビルドしてプッシュするスクリプト

# 変数設定
GITHUB_TOKEN=""  # GitHubトークン（実行時に入力）
GITHUB_USERNAME=""  # GitHubユーザー名（実行時に入力）
BRANCH="develop"  # ビルドするブランチ

# 色の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# GitHubトークンとユーザー名の入力を求める
echo -e "${YELLOW}GitHub Actionsを使用してDockerイメージをビルドしてプッシュします${NC}"
read -p "GitHubユーザー名: " GITHUB_USERNAME
read -sp "GitHubトークン（画面に表示されません）: " GITHUB_TOKEN
echo ""

# GitHub CLIがインストールされているか確認
if ! command -v gh &> /dev/null; then
    echo -e "${RED}GitHub CLI (gh) がインストールされていません。${NC}"
    echo "https://cli.github.com/ からインストールしてください。"
    exit 1
fi

echo -e "${YELLOW}=== GitHub Actionsを使用したDockerイメージのビルドとプッシュ開始 ===${NC}"

# GitHubにログイン
echo "GitHubにログインしています..."
echo $GITHUB_TOKEN | gh auth login --with-token
if [ $? -ne 0 ]; then
    echo -e "${RED}GitHubへのログインに失敗しました${NC}"
    exit 1
fi

# ワークフローの実行
echo -e "\n=== GitHub Actionsワークフローの実行 ==="
echo "リポジトリ: watchout/hotel-kanri"
echo "ワークフロー: docker-deploy.yml"
echo "ブランチ: ${BRANCH}"
echo "パラメータ:"
echo "  service: all"
echo "  version: ${BRANCH}"

gh workflow run docker-deploy.yml --ref ${BRANCH} -R watchout/hotel-kanri -f service=all -f version=${BRANCH}
if [ $? -ne 0 ]; then
    echo -e "${RED}GitHub Actionsワークフローの実行に失敗しました${NC}"
    exit 1
fi

echo -e "${GREEN}GitHub Actionsワークフローが実行されました${NC}"
echo "ワークフローの状態はGitHubのActionsタブで確認できます:"
echo "https://github.com/watchout/hotel-kanri/actions"

# ワークフローの状態を確認
echo -e "\n=== ワークフローの状態を確認 ==="
echo "最新のワークフロー実行を確認しています..."
sleep 5  # 少し待ってからワークフローの状態を確認

gh run list --workflow=docker-deploy.yml -R watchout/hotel-kanri -L 1
if [ $? -ne 0 ]; then
    echo -e "${RED}ワークフローの状態の確認に失敗しました${NC}"
    exit 1
fi

echo -e "${YELLOW}=== GitHub Actionsを使用したDockerイメージのビルドとプッシュが開始されました ===${NC}"
echo "ビルドとプッシュが完了するまでしばらく時間がかかります。"
echo "進行状況はGitHubのActionsタブで確認してください:"
echo "https://github.com/watchout/hotel-kanri/actions"

# サーバー上でのデプロイ確認手順
echo -e "\n${YELLOW}=== デプロイ確認手順 ===${NC}"
echo "ビルドとプッシュが完了したら、以下のコマンドでサーバー上のデプロイを確認できます:"
echo "ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 \"sudo docker images | grep ghcr.io/watchout\""
echo "ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 \"cd /opt/omotenasuai/hotel-kanri && sudo docker-compose -f config/docker/docker-compose.yml --env-file .env pull\""
echo "ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 \"cd /opt/omotenasuai/hotel-kanri && sudo docker-compose -f config/docker/docker-compose.yml --env-file .env up -d\""
echo "ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 \"sudo docker ps\""
