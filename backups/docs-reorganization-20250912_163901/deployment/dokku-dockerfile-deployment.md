# Dokku Dockerfileデプロイメントガイド

## 概要

このドキュメントでは、Dockerfile方式を使用したDokkuへのデプロイ方法について説明します。この方法では、アプリケーションのビルドと実行環境を完全に制御できます。

## 前提条件

- Dokkuがサーバーにインストールされていること
- Gitがローカル環境にインストールされていること
- DockerとDocker Composeがローカル環境にインストールされていること

## Dokkuサーバーの設定

### 1. アプリケーションの作成

```bash
# hotel-saasアプリケーションの作成
dokku apps:create hotel-saas

# hotel-commonアプリケーションの作成
dokku apps:create hotel-common
```

### 2. Dockerfile方式の有効化

```bash
# hotel-saasでDockerfile方式を有効化
dokku builder:set hotel-saas selected dockerfile

# hotel-commonでDockerfile方式を有効化
dokku builder:set hotel-common selected dockerfile
```

### 3. サービスの作成とリンク

```bash
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
```

### 4. 環境変数の設定

```bash
# hotel-saasの環境変数設定
dokku config:set hotel-saas NODE_ENV=production PORT=3100

# hotel-commonの環境変数設定
dokku config:set hotel-common NODE_ENV=production PORT=3400
```

### 5. ドメイン設定

```bash
# hotel-saasのドメイン設定
dokku domains:set hotel-saas app.dev.omotenasuai.com

# hotel-commonのドメイン設定
dokku domains:set hotel-common api.dev.omotenasuai.com
```

### 6. SSL証明書の設定

```bash
# Let's Encryptプラグインのインストール（初回のみ）
dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git

# メールアドレスの設定
dokku config:set --global DOKKU_LETSENCRYPT_EMAIL=admin@omotenasuai.com

# hotel-saasのSSL証明書発行
dokku letsencrypt:enable hotel-saas

# hotel-commonのSSL証明書発行
dokku letsencrypt:enable hotel-common
```

### 7. ストレージの設定

```bash
# hotel-saasのストレージディレクトリ作成
mkdir -p /var/lib/dokku/data/storage/hotel-saas/uploads

# hotel-saasにストレージをマウント
dokku storage:mount hotel-saas /var/lib/dokku/data/storage/hotel-saas/uploads:/app/uploads

# hotel-commonのストレージディレクトリ作成
mkdir -p /var/lib/dokku/data/storage/hotel-common/uploads

# hotel-commonにストレージをマウント
dokku storage:mount hotel-common /var/lib/dokku/data/storage/hotel-common/uploads:/app/uploads
```

## デプロイ方法

### 1. Gitリモートの追加

```bash
# hotel-saasのリモート追加
git remote add dokku-saas dokku@<サーバーIP>:hotel-saas

# hotel-commonのリモート追加
git remote add dokku-common dokku@<サーバーIP>:hotel-common
```

### 2. デプロイ

```bash
# hotel-saasのデプロイ
git push dokku-saas main:master

# hotel-commonのデプロイ
git push dokku-common main:master
```

### 3. GitHub Actionsによる自動デプロイ

`.github/workflows/deploy-saas.yml`ファイルを作成:

```yaml
name: Deploy hotel-saas
on:
  push:
    branches: [ "main" ]
    paths:
      - 'hotel-saas/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Add dokku remote
        run: git remote add dokku dokku@${{ secrets.DOKKU_HOST }}:hotel-saas
      - name: Push to dokku
        env:
          GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519'
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DOKKU_DEPLOY_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          git push dokku HEAD:refs/heads/master
```

`.github/workflows/deploy-common.yml`ファイルも同様に作成します。

## トラブルシューティング

### デプロイ失敗時

```bash
# ログの確認
dokku logs hotel-saas -t

# 以前のバージョンに戻す
dokku ps:revert hotel-saas
```

### Dockerfileの検証

```bash
# Dockerfileのビルドテスト
docker build -t hotel-saas-test ../hotel-saas
```

### 環境変数の確認

```bash
# 設定された環境変数の確認
dokku config:show hotel-saas
```
