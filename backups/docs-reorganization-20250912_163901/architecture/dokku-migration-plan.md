# Dokkuへの移行計画

**日付**: 2023年8月18日
**作成者**: hotel-kanri
**バージョン**: 1.0

## 1. 概要

本ドキュメントでは、hotel-saasとhotel-commonをDokkuを使用してデプロイする移行計画について説明します。Dokkuは「Herokuのようなミニ PaaS」として、シンプルなGitプッシュベースのデプロイを実現し、複雑なDocker設定やCI/CDの問題を解決します。

## 2. Dokkuの利点

### 2.1. 開発・運用上の利点

- **シンプルなデプロイフロー**: `git push dokku main`でデプロイ完了
- **環境変数の簡単な管理**: `dokku config:set`で環境変数を設定
- **データベース等のサービス連携**: プラグインで簡単に追加
- **スケーリング**: 水平・垂直スケーリングが可能
- **ロールバック**: 以前のデプロイに簡単にロールバック
- **SSL対応**: Let's Encryptとの統合が容易

### 2.2. 現状の課題解決

- Docker環境のセットアップ複雑さを解消
- GitHub Actionsワークフローの問題を回避
- 環境変数管理の問題を解決
- デプロイの一貫性と信頼性を向上

## 3. 移行計画

### 3.1. サーバーセットアップ

1. **Dokkuのインストール**

```bash
# サーバーに接続
ssh admin@163.44.117.60

# Dokkuのインストール
wget https://raw.githubusercontent.com/dokku/dokku/v0.30.6/bootstrap.sh
sudo DOKKU_TAG=v0.30.6 bash bootstrap.sh

# Webセットアップを完了
# ブラウザで http://163.44.117.60 にアクセスし、SSHキーを設定
```

2. **必要なプラグインのインストール**

```bash
# PostgreSQLプラグイン
sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres

# Redisプラグイン
sudo dokku plugin:install https://github.com/dokku/dokku-redis.git redis

# RabbitMQプラグイン
sudo dokku plugin:install https://github.com/dokku/dokku-rabbitmq.git rabbitmq

# Let's Encryptプラグイン
sudo dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
```

### 3.2. アプリケーションのセットアップ

1. **hotel-saasアプリケーションの作成**

```bash
# アプリケーション作成
dokku apps:create hotel-saas

# ドメイン設定
dokku domains:set hotel-saas dev-app.omotenasuai.com

# ポート設定
dokku proxy:ports-set hotel-saas http:80:3100
```

2. **hotel-commonアプリケーションの作成**

```bash
# アプリケーション作成
dokku apps:create hotel-common

# ドメイン設定
dokku domains:set hotel-common dev-api.omotenasuai.com

# ポート設定
dokku proxy:ports-set hotel-common http:80:3400
```

3. **データベースサービスの作成**

```bash
# PostgreSQLサービスの作成
dokku postgres:create hotel_unified_db

# PostgreSQLサービスのリンク
dokku postgres:link hotel_unified_db hotel-saas
dokku postgres:link hotel_unified_db hotel-common
```

4. **Redisサービスの作成**

```bash
# Redisサービスの作成
dokku redis:create hotel_redis

# Redisサービスのリンク
dokku redis:link hotel_redis hotel-saas
dokku redis:link hotel_redis hotel-common
```

5. **RabbitMQサービスの作成**

```bash
# RabbitMQサービスの作成
dokku rabbitmq:create hotel_rabbitmq

# RabbitMQサービスのリンク
dokku rabbitmq:link hotel_rabbitmq hotel-saas
dokku rabbitmq:link hotel_rabbitmq hotel-common
```

### 3.3. 環境変数の設定

1. **hotel-saasの環境変数設定**

```bash
dokku config:set hotel-saas \
  NODE_ENV=production \
  BASE_URL=https://dev-app.omotenasuai.com \
  JWT_SECRET=OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g==
```

2. **hotel-commonの環境変数設定**

```bash
dokku config:set hotel-common \
  NODE_ENV=production \
  JWT_SECRET=OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g==
```

### 3.4. アプリケーションのデプロイ準備

1. **hotel-saasリポジトリの設定**

```bash
# ローカルリポジトリで
cd /Users/kaneko/hotel-saas

# Dokkuリモートの追加
git remote add dokku dokku@163.44.117.60:hotel-saas

# Procfileの作成
echo "web: npm start" > Procfile

# .dockerignoreの作成
cat > .dockerignore << EOL
node_modules
npm-debug.log
EOL

# package.jsonのスクリプト確認
# "start": "node .output/server/index.mjs" が必要
```

2. **hotel-commonリポジトリの設定**

```bash
# ローカルリポジトリで
cd /Users/kaneko/hotel-common

# Dokkuリモートの追加
git remote add dokku dokku@163.44.117.60:hotel-common

# Procfileの作成
echo "web: node dist/main.js" > Procfile

# .dockerignoreの作成
cat > .dockerignore << EOL
node_modules
npm-debug.log
EOL

# package.jsonのスクリプト確認
# "start": "node dist/main.js" が必要
```

### 3.5. SSL設定

```bash
# Let's Encryptの設定
dokku config:set --global DOKKU_LETSENCRYPT_EMAIL=admin@omotenasuai.com

# hotel-saasのSSL設定
dokku letsencrypt:enable hotel-saas

# hotel-commonのSSL設定
dokku letsencrypt:enable hotel-common

# 自動更新の設定
dokku letsencrypt:cron-job --add
```

## 4. デプロイ手順

### 4.1. hotel-saasのデプロイ

```bash
cd /Users/kaneko/hotel-saas
git push dokku main
```

### 4.2. hotel-commonのデプロイ

```bash
cd /Users/kaneko/hotel-common
git push dokku main
```

### 4.3. デプロイ確認

```bash
# ログの確認
dokku logs hotel-saas
dokku logs hotel-common

# アプリケーションの状態確認
dokku ps:report hotel-saas
dokku ps:report hotel-common

# URLでの動作確認
curl -f https://dev-app.omotenasuai.com/health
curl -f https://dev-api.omotenasuai.com/health
```

## 5. 運用管理

### 5.1. スケーリング

```bash
# コンテナ数の増加
dokku ps:scale hotel-saas web=2
dokku ps:scale hotel-common web=2
```

### 5.2. リソース制限

```bash
# メモリ制限
dokku resource:limit --memory 1G hotel-saas
dokku resource:limit --memory 1G hotel-common
```

### 5.3. ロールバック

```bash
# 以前のデプロイへのロールバック
dokku ps:rebuild hotel-saas
dokku ps:rebuild hotel-common
```

### 5.4. バックアップ

```bash
# データベースのバックアップ
dokku postgres:export hotel_unified_db > backup.sql

# バックアップのスケジュール設定
# cronジョブの設定が必要
```

### 5.5. 監視

```bash
# 基本的なヘルスチェック
dokku ps:report

# Prometheusプラグインのインストール（オプション）
sudo dokku plugin:install https://github.com/dokku/dokku-prometheus.git prometheus
dokku prometheus:start
```

## 6. 移行スケジュール

1. **準備フェーズ（1-2日）**
   - Dokkuのインストールと設定
   - プラグインのインストール
   - アプリケーションとサービスの作成

2. **開発環境移行（1日）**
   - hotel-saasの開発環境デプロイ
   - hotel-commonの開発環境デプロイ
   - 動作確認とテスト

3. **本番環境準備（2-3日）**
   - 本番環境のDokkuセットアップ
   - データ移行計画の策定
   - バックアップ・リストア手順の確認

4. **本番環境移行（1日）**
   - メンテナンス通知
   - データバックアップ
   - 本番環境デプロイ
   - 動作確認

5. **ポストデプロイ（1-2日）**
   - 監視設定
   - アラート設定
   - ドキュメント更新

## 7. リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Dokkuの学習コスト | 中 | チュートリアルとハンズオン研修の実施 |
| データ移行の問題 | 高 | 事前のテスト移行と検証 |
| ダウンタイム | 高 | メンテナンス時間の事前通知と最小化 |
| パフォーマンス問題 | 中 | 事前のベンチマークテスト |
| ロールバック失敗 | 高 | 詳細なロールバック手順の準備と訓練 |

## 8. 結論

Dokkuへの移行により、デプロイの複雑さを大幅に削減し、開発チームの生産性向上が期待できます。また、運用管理の簡素化により、インフラストラクチャの保守コストも削減できます。

本計画に基づいて段階的に移行を進め、各ステップでの検証を徹底することで、安全かつ効率的な移行を実現します。
