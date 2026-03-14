#!/bin/bash

# このスクリプトはサーバー上で実行するためのものです
# サーバーにアップロードして、直接実行してください

# adminユーザーの公開鍵をDokkuに追加
sudo cat /home/admin/.ssh/authorized_keys | sudo dokku ssh-keys:add admin

# Dokkuのバージョンを確認
echo "Dokkuのバージョン:"
dokku version

# グローバルドメインの設定
echo "グローバルドメインを設定します..."
dokku domains:set-global dev.omotenasuai.com

# Let's Encryptの設定
echo "Let's Encryptのメールアドレスを設定します..."
dokku config:set --global DOKKU_LETSENCRYPT_EMAIL=admin@omotenasuai.com

# アプリケーションの一覧を表示
echo "現在のアプリケーション一覧:"
dokku apps:list

echo "Dokkuの初期設定が完了しました。"
