#!/bin/bash

# 開発サーバードメイン設定デプロイスクリプト
# 使用法: ./deploy-dev-domain-config.sh [サーバーIP] [CloudflareAPIトークン]
# 例: ./deploy-dev-domain-config.sh 192.168.1.100 your-cloudflare-api-token

set -e

# 引数チェック
if [ $# -lt 2 ]; then
  echo "使用法: $0 [サーバーIP] [CloudflareAPIトークン]"
  echo "例: $0 192.168.1.100 your-cloudflare-api-token"
  exit 1
fi

# 変数設定
SERVER_IP=$1
CLOUDFLARE_API_TOKEN=$2
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_SCRIPT="$SCRIPT_DIR/setup-dev-domains.sh"

echo "開発サーバードメイン設定のデプロイを開始します..."
echo "サーバーIP: $SERVER_IP"

# スクリプトが実行可能かチェック
if [ ! -x "$SETUP_SCRIPT" ]; then
  echo "セットアップスクリプトに実行権限を付与します..."
  chmod +x "$SETUP_SCRIPT"
fi

# サーバーへの接続テスト
echo "サーバーへの接続をテストしています..."
if ! ssh -o ConnectTimeout=5 -o BatchMode=yes deploy@$SERVER_IP "echo 接続成功"; then
  echo "エラー: サーバーに接続できません。SSHの設定を確認してください。"
  exit 1
fi

# スクリプトのコピー
echo "セットアップスクリプトをサーバーにコピーしています..."
scp "$SETUP_SCRIPT" deploy@$SERVER_IP:/tmp/setup-dev-domains.sh

# CloudflareAPIトークンの設定
echo "CloudflareAPIトークンを設定しています..."
ssh deploy@$SERVER_IP "export CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN"

# スクリプトの実行
echo "セットアップスクリプトを実行しています..."
ssh deploy@$SERVER_IP "chmod +x /tmp/setup-dev-domains.sh && /tmp/setup-dev-domains.sh $SERVER_IP"

# スクリプト実行後のクリーンアップ
echo "クリーンアップしています..."
ssh deploy@$SERVER_IP "rm -f /tmp/setup-dev-domains.sh"

# ドメイン設定の確認
echo "ドメイン設定を確認しています..."
for subdomain in "" "saas." "pms." "member." "api."; do
  echo "https://${subdomain}dev.omotenasuai.com/health をチェックしています..."
  if curl -s -o /dev/null -w "%{http_code}" "https://${subdomain}dev.omotenasuai.com/health" | grep -q "200"; then
    echo "✅ ${subdomain}dev.omotenasuai.com は正常に応答しています"
  else
    echo "⚠️ ${subdomain}dev.omotenasuai.com は応答していないか、エラーを返しています"
  fi
done

echo "開発サーバードメイン設定のデプロイが完了しました！"
exit 0