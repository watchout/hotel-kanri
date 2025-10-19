# 開発サーバーサービス設定ガイド

## 概要

このドキュメントでは、開発サーバー環境に構築されたサービス（データベース、キャッシュ、メッセージキューなど）の設定と利用方法について説明します。

## 構築済みサービス

開発サーバーには以下のサービスが構築されています：

| サービス名 | タイプ | バージョン | 接続情報 |
|----------|------|----------|---------|
| hotel_unified_db | PostgreSQL | 17.5 | postgres://postgres:PASSWORD@dokku-postgres-hotel-unified-db:5432/hotel_unified_db |
| hotel_redis | Redis | 8.2.0 | redis://:PASSWORD@dokku-redis-hotel-redis:6379 |
| hotel_rabbitmq | RabbitMQ | 4.1.3 | amqp://hotel_rabbitmq:PASSWORD@dokku-rabbitmq-hotel-rabbitmq:5672/hotel_rabbitmq |

## アプリケーションとのリンク方法

### 1. PostgreSQLのリンク

```bash
# hotel-commonアプリにPostgreSQLをリンク
dokku postgres:link hotel_unified_db hotel-common

# hotel-saasアプリにPostgreSQLをリンク
dokku postgres:link hotel_unified_db hotel-saas

# hotel-pmsアプリにPostgreSQLをリンク
dokku postgres:link hotel_unified_db hotel-pms

# hotel-memberアプリにPostgreSQLをリンク
dokku postgres:link hotel_unified_db hotel-member
```

### 2. Redisのリンク

```bash
# hotel-commonアプリにRedisをリンク
dokku redis:link hotel_redis hotel-common

# hotel-saasアプリにRedisをリンク
dokku redis:link hotel_redis hotel-saas

# hotel-pmsアプリにRedisをリンク
dokku redis:link hotel_redis hotel-pms

# hotel-memberアプリにRedisをリンク
dokku redis:link hotel_redis hotel-member
```

### 3. RabbitMQのリンク

```bash
# hotel-commonアプリにRabbitMQをリンク
dokku rabbitmq:link hotel_rabbitmq hotel-common

# hotel-saasアプリにRabbitMQをリンク
dokku rabbitmq:link hotel_rabbitmq hotel-saas

# hotel-pmsアプリにRabbitMQをリンク
dokku rabbitmq:link hotel_rabbitmq hotel-pms

# hotel-memberアプリにRabbitMQをリンク
dokku rabbitmq:link hotel_rabbitmq hotel-member
```

## 環境変数

サービスをアプリケーションにリンクすると、以下の環境変数が自動的に設定されます：

### PostgreSQL

- `DATABASE_URL`: PostgreSQLへの接続URL

### Redis

- `REDIS_URL`: Redisへの接続URL

### RabbitMQ

- `RABBITMQ_URL`: RabbitMQへの接続URL

## 追加の環境変数設定

アプリケーション固有の環境変数は、以下のコマンドで設定できます：

```bash
# 環境変数の設定
dokku config:set hotel-saas KEY=VALUE

# 環境変数の一括設定（.envファイルから）
dokku config:set hotel-saas $(cat .env | xargs)
```

## 環境変数テンプレート

各アプリケーション用の環境変数テンプレートは以下の場所に保存されています：

- hotel-saas: `templates/env/hotel-saas.env.template`
- hotel-common: `templates/env/hotel-common.env.template`
- hotel-pms: `templates/env/hotel-pms.env.template`
- hotel-member: `templates/env/hotel-member.env.template`

これらのテンプレートを使用して、各アプリケーションの環境変数を設定してください。

## サービスの管理

### サービス情報の確認

```bash
# PostgreSQLサービス情報
dokku postgres:info hotel_unified_db

# Redisサービス情報
dokku redis:info hotel_redis

# RabbitMQサービス情報
dokku rabbitmq:info hotel_rabbitmq
```

### サービスへの接続

```bash
# PostgreSQLへの接続
dokku postgres:connect hotel_unified_db

# Redisへの接続
dokku redis:connect hotel_redis

# RabbitMQへの接続（管理画面）
# http://SERVER_IP:15672 (ユーザー名: hotel_rabbitmq, パスワードはdokku rabbitmq:info hotel_rabbitmqで確認)
```

### バックアップと復元

```bash
# PostgreSQLのバックアップ
dokku postgres:export hotel_unified_db > backup.sql

# PostgreSQLの復元
dokku postgres:import hotel_unified_db < backup.sql
```

## 永続ストレージ

各サービスのデータは以下の場所に保存されています：

- PostgreSQL: `/var/lib/dokku/services/postgres/hotel_unified_db/data`
- Redis: `/var/lib/dokku/services/redis/hotel_redis/data`
- RabbitMQ: `/var/lib/dokku/services/rabbitmq/hotel_rabbitmq/data`

これらのディレクトリは定期的にバックアップすることをお勧めします。

## 注意事項

- サービスのパスワードは自動生成されています。必要に応じて`dokku [service]:info`コマンドで確認してください。
- 本番環境へのデプロイ前に、テストデータをクリアすることをお勧めします。
- サービスの設定変更は、アプリケーションの再起動が必要な場合があります。

---

作成日: 2025年8月22日
作成者: 管理者





