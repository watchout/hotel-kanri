#!/bin/bash

# サーバー上のDocker環境を確認するスクリプト

# 変数設定
SERVER_IP="163.44.117.60"
DEPLOY_USER="admin"
SSH_KEY="/Users/kaneko/.ssh/id_ed25519"  # 実際に使用しているSSH鍵のパス

# 色の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== サーバー上のDocker環境チェック ===${NC}"

# SSHでサーバーに接続して各種確認を実行
ssh -i $SSH_KEY $DEPLOY_USER@$SERVER_IP << 'EOF'
  echo "=== システム情報 ==="
  uname -a
  lsb_release -a

  echo -e "\n=== Dockerのインストール状況 ==="
  if command -v docker &> /dev/null; then
    echo "Docker: インストール済み"
    docker --version
  else
    echo "Docker: インストールされていません"
  fi

  if command -v docker-compose &> /dev/null; then
    echo "Docker Compose: インストール済み"
    docker-compose --version
  else
    echo "Docker Compose: インストールされていません"
  fi

  echo -e "\n=== Dockerサービスの状態 ==="
  if command -v docker &> /dev/null; then
    systemctl status docker || echo "Dockerサービスの状態を確認できませんでした"
  fi

  echo -e "\n=== ユーザー権限の確認 ==="
  echo "現在のユーザー: $(whoami)"
  echo "dockerグループ所属: $(groups | grep -q docker && echo 'はい' || echo 'いいえ')"
  
  echo -e "\n=== ディスク容量の確認 ==="
  df -h
  
  echo -e "\n=== メモリ使用状況 ==="
  free -h
  
  echo -e "\n=== Dockerイメージとコンテナの確認 ==="
  if command -v docker &> /dev/null; then
    echo "Dockerイメージ:"
    docker images || echo "Dockerイメージを取得できませんでした"
    
    echo -e "\nDockerコンテナ:"
    docker ps -a || echo "Dockerコンテナを取得できませんでした"
    
    echo -e "\nDockerボリューム:"
    docker volume ls || echo "Dockerボリュームを取得できませんでした"
    
    echo -e "\nDockerネットワーク:"
    docker network ls || echo "Dockerネットワークを取得できませんでした"
  fi
  
  echo -e "\n=== ディレクトリ構造の確認 ==="
  if [ -d /opt/omotenasuai ]; then
    echo "/opt/omotenasuai ディレクトリが存在します"
    ls -la /opt/omotenasuai
  else
    echo "/opt/omotenasuai ディレクトリが存在しません"
  fi
EOF

echo -e "${YELLOW}=== チェック完了 ===${NC}"