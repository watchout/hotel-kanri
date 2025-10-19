#!/bin/bash

# Dokkuインストールスクリプト

# 変数設定
SERVER_IP="163.44.117.60"
ADMIN_USER="admin"
SSH_KEY="/Users/kaneko/.ssh/id_ed25519"
SERVER_PASSWORD="scanner329"  # サーバーのパスワード（セキュリティのため本番環境では使用しないでください）

# 色の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Dokkuインストール開始 ===${NC}"

# SSHでサーバーに接続してDokkuをインストール
ssh -i $SSH_KEY $ADMIN_USER@$SERVER_IP << EOF
  # sudoコマンドにパスワードを渡す
  echo "${SERVER_PASSWORD}" | sudo -S echo "sudo権限を確認しました"

  echo "=== システム更新 ==="
  echo "${SERVER_PASSWORD}" | sudo -S apt-get update
  echo "${SERVER_PASSWORD}" | sudo -S apt-get upgrade -y

  echo -e "\n=== Dokkuのインストール ==="
  echo "${SERVER_PASSWORD}" | sudo -S apt-get install -y apt-transport-https
  
  # Dokkuのインストールスクリプトをダウンロード
  wget https://raw.githubusercontent.com/dokku/dokku/v0.30.6/bootstrap.sh
  
  # インストールスクリプトを実行
  echo "${SERVER_PASSWORD}" | sudo -S DOKKU_TAG=v0.30.6 bash bootstrap.sh
  
  echo -e "\n=== Dokkuのバージョン確認 ==="
  dokku version

  echo -e "\n=== Dokkuの初期設定 ==="
  # グローバル設定
  echo "${SERVER_PASSWORD}" | sudo -S dokku config:set --global DOKKU_HOSTNAME=dev.omotenasuai.com
  echo "${SERVER_PASSWORD}" | sudo -S dokku config:set --global DOKKU_LETSENCRYPT_EMAIL=admin@omotenasuai.com

  echo -e "\n=== 必要なプラグインのインストール ==="
  # PostgreSQLプラグイン
  echo "${SERVER_PASSWORD}" | sudo -S dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres

  # Redisプラグイン
  echo "${SERVER_PASSWORD}" | sudo -S dokku plugin:install https://github.com/dokku/dokku-redis.git redis

  # RabbitMQプラグイン
  echo "${SERVER_PASSWORD}" | sudo -S dokku plugin:install https://github.com/dokku/dokku-rabbitmq.git rabbitmq

  # Let's Encryptプラグイン
  echo "${SERVER_PASSWORD}" | sudo -S dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git

  echo -e "\n=== プラグインの確認 ==="
  dokku plugin:list

  echo -e "\n=== ストレージディレクトリの作成 ==="
  echo "${SERVER_PASSWORD}" | sudo -S mkdir -p /opt/dokku/data
  echo "${SERVER_PASSWORD}" | sudo -S chown -R dokku:dokku /opt/dokku/data

  echo -e "\n=== deployユーザーの設定 ==="
  echo "${SERVER_PASSWORD}" | sudo -S usermod -aG dokku deploy

  echo -e "\n=== Dokkuのインストールが完了しました ==="
EOF

echo -e "${GREEN}=== Dokkuのインストールが完了しました ===${NC}"
echo "次のステップ: Webセットアップの完了"
echo "ブラウザで http://${SERVER_IP} にアクセスし、SSHキーを設定してください。"
