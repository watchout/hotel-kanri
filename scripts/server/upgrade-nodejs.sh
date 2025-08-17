#!/bin/bash

# Node.jsをバージョン20にアップグレードするスクリプト
# 日付: 2023年8月17日
# 作成者: hotel-kanri

set -e

echo "サーバー上のNode.jsをバージョン20にアップグレードします..."

# 現在のNode.jsバージョンを確認
current_version=$(node -v)
echo "現在のNode.jsバージョン: $current_version"

# nvmがインストールされているか確認
if ! command -v nvm &> /dev/null; then
    echo "nvmがインストールされていません。インストールします..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
    
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
    
    echo "nvmのインストールが完了しました。"
else
    echo "nvmは既にインストールされています。"
fi

# Node.js v20の最新版をインストール
echo "Node.js v20の最新版をインストールします..."
nvm install 20
nvm use 20
nvm alias default 20

# 新しいバージョンを確認
new_version=$(node -v)
echo "アップグレード後のNode.jsバージョン: $new_version"

# グローバルパッケージの再インストール
echo "必要なグローバルパッケージを再インストールします..."
npm install -g pm2
npm install -g prisma

echo "Node.jsのアップグレードが完了しました。"
echo "各アプリケーションディレクトリで依存関係を再インストールしてください。"

# hotel-saasの依存関係を再インストール
if [ -d "/opt/omotenasuai/hotel-saas" ]; then
    echo "hotel-saasの依存関係を再インストールします..."
    cd /opt/omotenasuai/hotel-saas
    npm install --legacy-peer-deps
    npm run build
    pm2 restart hotel-saas || pm2 start ecosystem.config.js --only hotel-saas --env development
fi

# hotel-commonの依存関係を再インストール
if [ -d "/opt/omotenasuai/hotel-common" ]; then
    echo "hotel-commonの依存関係を再インストールします..."
    cd /opt/omotenasuai/hotel-common
    npm install --legacy-peer-deps
    npm run build
    pm2 restart hotel-common || pm2 start ecosystem.config.js --only hotel-common --env development
fi

echo "アップグレードプロセスが完了しました。"
