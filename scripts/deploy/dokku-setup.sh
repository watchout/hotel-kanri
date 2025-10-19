#!/bin/bash

# Dokkuの初期設定を行うスクリプト
# 以下のコマンドをサーバー上で直接実行する必要があります

# グローバルドメインの設定
dokku domains:set-global dev.omotenasuai.com

# Let's Encryptの設定
dokku config:set --global DOKKU_LETSENCRYPT_EMAIL=admin@omotenasuai.com

# SSHキーを追加（サーバーで直接実行する必要あり）
# echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAID2i5/en2gkBaLfnC/JA8+1iBkNASdW4RjyH0EzLdS88 kaneko@arrowsworks.com" | sudo dokku ssh-keys:add admin

# hotel-saasアプリケーションの作成
dokku apps:create hotel-saas

# hotel-commonアプリケーションの作成
dokku apps:create hotel-common

# PostgreSQLサービスの作成
dokku postgres:create hotel_db

# PostgreSQLサービスをアプリケーションにリンク
dokku postgres:link hotel_db hotel-saas
dokku postgres:link hotel_db hotel-common

# Redisサービスの作成
dokku redis:create hotel_redis

# Redisサービスをアプリケーションにリンク
dokku redis:link hotel_redis hotel-saas
dokku redis:link hotel_redis hotel-common

# RabbitMQサービスの作成
dokku rabbitmq:create hotel_rabbitmq

# RabbitMQサービスをアプリケーションにリンク
dokku rabbitmq:link hotel_rabbitmq hotel-saas
dokku rabbitmq:link hotel_rabbitmq hotel-common

# ドメイン設定
dokku domains:set hotel-saas app.dev.omotenasuai.com
dokku domains:set hotel-common api.dev.omotenasuai.com

# 環境変数の設定
dokku config:set hotel-saas NODE_ENV=production PORT=3100
dokku config:set hotel-common NODE_ENV=production PORT=3400

# Let's Encryptの有効化
dokku letsencrypt:enable hotel-saas
dokku letsencrypt:enable hotel-common

echo "Dokkuの初期設定が完了しました。"
