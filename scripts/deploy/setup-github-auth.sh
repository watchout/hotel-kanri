#!/bin/bash

# GitHubコンテナレジストリ認証情報設定スクリプト

# 変数設定
SERVER_IP="163.44.117.60"
DEPLOY_USER="admin"
SSH_KEY="/Users/kaneko/.ssh/id_ed25519"  # 実際に使用しているSSH鍵のパス
SERVER_PASSWORD="scanner329"  # サーバーのパスワード（セキュリティのため本番環境では使用しないでください）

# 色の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# GitHubトークンの入力を求める
echo -e "${YELLOW}GitHubコンテナレジストリの認証情報を設定します${NC}"
read -p "GitHubユーザー名: " GITHUB_USERNAME
read -sp "GitHubトークン（画面に表示されません）: " GITHUB_TOKEN
echo ""

echo -e "${YELLOW}=== GitHubコンテナレジストリ認証情報設定開始 ===${NC}"

# SSHでサーバーに接続して認証情報を設定
ssh -i $SSH_KEY $DEPLOY_USER@$SERVER_IP << EOF
  # sudoコマンドにパスワードを渡す
  echo "${SERVER_PASSWORD}" | sudo -S echo "sudo権限を確認しました"

  echo "=== GitHubコンテナレジストリにログイン ==="
  echo "${SERVER_PASSWORD}" | sudo -S docker logout ghcr.io || echo "ログアウトに失敗しましたが続行します"
  echo "${SERVER_PASSWORD}" | sudo -S docker login ghcr.io -u ${GITHUB_USERNAME} -p ${GITHUB_TOKEN}
  
  echo "=== ログイン状態の確認 ==="
  echo "${SERVER_PASSWORD}" | sudo -S cat ~/.docker/config.json || echo "設定ファイルの確認に失敗しました"
EOF

echo -e "${GREEN}=== GitHubコンテナレジストリ認証情報設定が完了しました ===${NC}"
