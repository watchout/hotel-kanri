#!/bin/bash

# このスクリプトはDokkuサーバー上で実行するためのものです

# hotel-saasアプリケーションの作成
dokku apps:create hotel-saas

# hotel-commonアプリケーションの作成
dokku apps:create hotel-common

# Dockerfile方式の有効化
dokku builder:set hotel-saas selected dockerfile
dokku builder:set hotel-common selected dockerfile

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

# ストレージの設定
mkdir -p /var/lib/dokku/data/storage/hotel-saas/uploads
dokku storage:mount hotel-saas /var/lib/dokku/data/storage/hotel-saas/uploads:/app/uploads

mkdir -p /var/lib/dokku/data/storage/hotel-common/uploads
dokku storage:mount hotel-common /var/lib/dokku/data/storage/hotel-common/uploads:/app/uploads

# Let's Encryptの有効化
dokku letsencrypt:enable hotel-saas
dokku letsencrypt:enable hotel-common

echo "Dockerfile方式のDokkuアプリケーションセットアップが完了しました。"
