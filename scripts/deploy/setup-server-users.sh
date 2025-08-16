#!/bin/bash

# サーバーユーザー・権限セットアップスクリプト
# 使用法: ./setup-server-users.sh [サーバーIP]

set -e

if [ $# -lt 1 ]; then
  echo "使用法: $0 [サーバーIP]"
  echo "例: $0 163.44.117.60"
  exit 1
fi

SERVER_IP=$1
echo "サーバーユーザー・権限をセットアップしています..."
echo "サーバーIP: $SERVER_IP"

# GitHub Actions用デプロイユーザーの作成
echo "GitHub Actions用デプロイユーザーを作成しています..."
ssh root@$SERVER_IP "
  # github-deployユーザー作成
  useradd -m -s /bin/bash github-deploy
  usermod -aG sudo github-deploy
  
  # sudoでパスワード不要に設定
  echo 'github-deploy ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/github-deploy
"

# アプリケーション専用ユーザーの作成
echo "アプリケーション専用ユーザーを作成しています..."
ssh root@$SERVER_IP "
  # 各アプリケーション用ユーザー作成
  useradd -m -s /bin/bash hotel-saas
  useradd -m -s /bin/bash hotel-member
  useradd -m -s /bin/bash hotel-pms
  useradd -m -s /bin/bash hotel-common
  
  # アプリケーションディレクトリ作成と権限設定
  mkdir -p /opt/omotenasuai
  
  # 各サービス用ディレクトリ作成
  mkdir -p /opt/omotenasuai/hotel-saas
  mkdir -p /opt/omotenasuai/hotel-member
  mkdir -p /opt/omotenasuai/hotel-pms
  mkdir -p /opt/omotenasuai/hotel-common
  mkdir -p /opt/omotenasuai/logs
  mkdir -p /opt/omotenasuai/backups
  mkdir -p /opt/omotenasuai/env
  
  # 権限設定
  chown hotel-saas:hotel-saas /opt/omotenasuai/hotel-saas
  chown hotel-member:hotel-member /opt/omotenasuai/hotel-member
  chown hotel-pms:hotel-pms /opt/omotenasuai/hotel-pms
  chown hotel-common:hotel-common /opt/omotenasuai/hotel-common
  chown root:root /opt/omotenasuai/logs
  chown root:root /opt/omotenasuai/backups
  chown root:root /opt/omotenasuai/env
  chmod 755 /opt/omotenasuai
  chmod 755 /opt/omotenasuai/hotel-*
  chmod 700 /opt/omotenasuai/env
"

# systemdサービス設定
echo "systemdサービスを設定しています..."
ssh root@$SERVER_IP "
  # hotel-saasサービス
  cat > /etc/systemd/system/hotel-saas.service << 'EOF'
[Unit]
Description=Hotel SaaS Application
After=network.target

[Service]
Type=simple
User=hotel-saas
Group=hotel-saas
WorkingDirectory=/opt/omotenasuai/hotel-saas
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3100
EnvironmentFile=/opt/omotenasuai/env/hotel-saas.env

[Install]
WantedBy=multi-user.target
EOF

  # hotel-commonサービス
  cat > /etc/systemd/system/hotel-common.service << 'EOF'
[Unit]
Description=Hotel Common Services
After=network.target postgresql.service

[Service]
Type=simple
User=hotel-common
Group=hotel-common
WorkingDirectory=/opt/omotenasuai/hotel-common
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3400
EnvironmentFile=/opt/omotenasuai/env/hotel-common.env

[Install]
WantedBy=multi-user.target
EOF

  # サービス有効化
  systemctl daemon-reload
  systemctl enable hotel-saas
  systemctl enable hotel-common
"

# GitHub SSH鍵設定（後で手動設定）
echo "SSH公開鍵の設定準備完了"
echo ""
echo "次の手順:"
echo "1. GitHub ActionsのDEPLOY_SSH_KEYシークレットに秘密鍵を設定"
echo "2. サーバーのgithub-deployユーザーに公開鍵を設定:"
echo "   ssh-copy-id -i ~/.ssh/github_deploy_key.pub github-deploy@$SERVER_IP"
echo "3. 各リポジトリのdevelopブランチにプッシュでデプロイ実行"

echo "サーバーユーザー・権限セットアップ完了"
