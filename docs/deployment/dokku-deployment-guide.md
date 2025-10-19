# Dokkuデプロイメントガイド

## 概要

このドキュメントでは、hotel-kanriプロジェクトのDokkuを使用したデプロイメント方法について説明します。Dokkuは「ミニPaaS」として機能し、Dockerを内部的に使用してアプリケーションのデプロイを簡素化します。

## アーキテクチャ

- **ローカル開発環境**: Docker Compose
- **サーバー環境**: Dokku (Docker上に構築)

## 前提条件

- Node.js 20.13.1
- PNPM 9.12.0以上
- Git
- Docker (ローカル開発用)

## ローカル開発環境のセットアップ

1. リポジトリをクローン
   ```bash
   git clone git@github.com:your-org/hotel-kanri.git
   cd hotel-kanri
   ```

2. Docker Composeを使用して開発環境を起動
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

3. アプリケーションにアクセス
   - hotel-saas: http://localhost:3100

## Dokkuサーバー環境のセットアップ

### 初期設定（サーバー管理者向け）

1. Dokkuのインストール
   ```bash
   wget -NP . https://dokku.com/install/v0.34.8/bootstrap.sh
   sudo DOKKU_TAG=v0.34.8 bash bootstrap.sh
   ```

2. アプリケーションの作成
   ```bash
   dokku apps:create hotel-kanri-dev
   ```

3. ドメインとSSLの設定
   ```bash
   dokku domains:set hotel-kanri-dev dev.omotenasuai.com
   dokku letsencrypt:enable hotel-kanri-dev
   ```

4. 環境変数の設定
   ```bash
   dokku config:set hotel-kanri-dev NODE_ENV=production HOST=0.0.0.0 NITRO_PORT=3100
   ```

5. PostgreSQLサービスのセットアップ
   ```bash
   dokku plugin:install https://github.com/dokku/dokku-postgres.git
   dokku postgres:create hotelkanri-dev-db
   dokku postgres:link hotelkanri-dev-db hotel-kanri-dev
   ```

6. Redisサービスのセットアップ
   ```bash
   dokku plugin:install https://github.com/dokku/dokku-redis.git
   dokku redis:create hotelkanri-dev-redis
   dokku redis:link hotelkanri-dev-redis hotel-kanri-dev
   ```

7. RabbitMQサービスのセットアップ
   ```bash
   dokku plugin:install https://github.com/dokku/dokku-rabbitmq.git
   dokku rabbitmq:create hotelkanri-dev-rabbitmq
   dokku rabbitmq:link hotelkanri-dev-rabbitmq hotel-kanri-dev
   ```

8. ファイル永続化の設定
   ```bash
   mkdir -p /var/lib/dokku/data/storage/hotel-kanri-dev/uploads
   dokku storage:mount hotel-kanri-dev /var/lib/dokku/data/storage/hotel-kanri-dev/uploads:/app/uploads
   ```

### デプロイ方法

#### 手動デプロイ

1. リモートを追加
   ```bash
   git remote add dokku-dev dokku@<サーバーIP>:hotel-kanri-dev
   ```

2. デプロイ
   ```bash
   git push dokku-dev main
   ```

#### GitHub Actionsによる自動デプロイ

`.github/workflows/deploy-dev.yml`ファイルを作成し、以下の内容を追加します：

```yaml
name: Deploy (dokku dev)
on:
  push:
    branches: [ "main" ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Add dokku remote
        run: git remote add dokku dokku@${{ secrets.DOKKU_DEV_HOST }}:${{ secrets.DOKKU_DEV_APP }}
      - name: Push to dokku
        env:
          GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519'
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DOKKU_DEV_DEPLOY_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          git push dokku HEAD:refs/heads/main
```

GitHub Secretsに以下の値を設定します：
- `DOKKU_DEV_HOST`: DokkuサーバーのIPアドレス
- `DOKKU_DEV_APP`: Dokkuアプリケーション名（例：hotel-kanri-dev）
- `DOKKU_DEV_DEPLOY_KEY`: デプロイ用のSSH秘密鍵

## 運用ルール

1. **バージョン固定**
   - Node.js: 20.13.x（.nvmrcで指定）
   - PNPM: 9.12.0（package.jsonで指定）
   - PostgreSQL: 16

2. **環境差を最小化するためのルール**
   - lockファイルは必ずコミット
   - 設定は環境変数のみで管理（.env.developmentはローカル、本番はdokku config:set）
   - ヘルスチェックで採用判定（/healthzが落ちたら自動ロールバック）

3. **デプロイフロー**
   - ローカル開発 → Gitリポジトリ → CI/CD → 開発環境
   - 直接サーバー修正は禁止

## トラブルシューティング

### デプロイ失敗時

```bash
dokku logs -t hotel-kanri-dev
dokku ps:revert hotel-kanri-dev
```

### データベースバックアップ

```bash
dokku postgres:export hotelkanri-dev-db > backup.sql
```

### 環境変数の確認

```bash
dokku config:show hotel-kanri-dev
```
