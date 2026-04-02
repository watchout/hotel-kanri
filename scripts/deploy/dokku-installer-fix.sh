#!/bin/bash

# Dokkuインストーラーを再インストールするスクリプト
# このスクリプトはサーバー上で実行する必要があります

# Dokkuインストーラーパッケージを再インストール
sudo apt-get update
sudo apt-get install -y --reinstall dokku-installer

# Nginxの設定を確認
sudo ls -la /etc/nginx/sites-enabled/

# Nginxを再起動
sudo systemctl restart nginx

# ステータスを確認
echo "Nginxステータス:"
sudo systemctl status nginx | head -20

echo "Dokkuインストーラーの修正が完了しました。http://163.44.117.60 にアクセスしてください。"
