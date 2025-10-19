# Dokkuアプリケーション設定ガイド

**日付**: 2023年8月18日
**作成者**: hotel-kanri
**バージョン**: 1.0

このガイドでは、Dokkuを使用してhotel-saasとhotel-commonアプリケーションを設定し、デプロイする手順を説明します。

## 1. アプリケーションの作成

### 1.1. hotel-saasアプリケーションの作成

```bash
# サーバーに接続
ssh admin@163.44.117.60

# アプリケーションの作成
dokku apps:create hotel-saas
```

### 1.2. hotel-commonアプリケーションの作成

```bash
# アプリケーションの作成
dokku apps:create hotel-common
```

## 2. ドメイン設定

### 2.1. hotel-saasのドメイン設定

```bash
# ドメインの設定
dokku domains:set hotel-saas dev-app.omotenasuai.com

# ドメインの確認
dokku domains:report hotel-saas
```

### 2.2. hotel-commonのドメイン設定

```bash
# ドメインの設定
dokku domains:set hotel-common dev-api.omotenasuai.com

# ドメインの確認
dokku domains:report hotel-common
```

## 3. ポート設定

### 3.1. hotel-saasのポート設定

```bash
# ポートマッピングの設定
dokku proxy:ports-set hotel-saas http:80:3100 https:443:3100

# ポート設定の確認
dokku proxy:ports hotel-saas
```

### 3.2. hotel-commonのポート設定

```bash
# ポートマッピングの設定
dokku proxy:ports-set hotel-common http:80:3400 https:443:3400

# ポート設定の確認
dokku proxy:ports hotel-common
```

## 4. サービスのリンク

### 4.1. PostgreSQLサービスのリンク

```bash
# hotel-saasにPostgreSQLをリンク
dokku postgres:link hotel_unified_db hotel-saas

# hotel-commonにPostgreSQLをリンク
dokku postgres:link hotel_unified_db hotel-common

# リンクの確認
dokku postgres:info hotel_unified_db
```

### 4.2. Redisサービスのリンク

```bash
# hotel-saasにRedisをリンク
dokku redis:link hotel_redis hotel-saas

# hotel-commonにRedisをリンク
dokku redis:link hotel_redis hotel-common

# リンクの確認
dokku redis:info hotel_redis
```

### 4.3. RabbitMQサービスのリンク

```bash
# hotel-saasにRabbitMQをリンク
dokku rabbitmq:link hotel_rabbitmq hotel-saas

# hotel-commonにRabbitMQをリンク
dokku rabbitmq:link hotel_rabbitmq hotel-common

# リンクの確認
dokku rabbitmq:info hotel_rabbitmq
```

## 5. 環境変数の設定

### 5.1. hotel-saasの環境変数設定

```bash
# 環境変数の設定
dokku config:set hotel-saas \
  NODE_ENV=production \
  BASE_URL=https://dev-app.omotenasuai.com \
  JWT_SECRET=OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g==

# 環境変数の確認
dokku config:show hotel-saas
```

### 5.2. hotel-commonの環境変数設定

```bash
# 環境変数の設定
dokku config:set hotel-common \
  NODE_ENV=production \
  JWT_SECRET=OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g==

# 環境変数の確認
dokku config:show hotel-common
```

## 6. リソース制限の設定

### 6.1. hotel-saasのリソース制限

```bash
# メモリ制限の設定
dokku resource:limit --memory 1G hotel-saas

# CPUの制限
dokku resource:limit --cpu 1 hotel-saas

# リソース制限の確認
dokku resource:report hotel-saas
```

### 6.2. hotel-commonのリソース制限

```bash
# メモリ制限の設定
dokku resource:limit --memory 1G hotel-common

# CPUの制限
dokku resource:limit --cpu 1 hotel-common

# リソース制限の確認
dokku resource:report hotel-common
```

## 7. SSL設定

### 7.1. hotel-saasのSSL設定

```bash
# Let's Encryptの有効化
dokku letsencrypt:enable hotel-saas

# SSL設定の確認
dokku letsencrypt:list
```

### 7.2. hotel-commonのSSL設定

```bash
# Let's Encryptの有効化
dokku letsencrypt:enable hotel-common

# SSL設定の確認
dokku letsencrypt:list
```

## 8. ローカル環境の準備

### 8.1. hotel-saasリポジトリの設定

```bash
# ローカルマシンで実行
cd /Users/kaneko/hotel-saas

# Dokkuリモートの追加
git remote add dokku dokku@163.44.117.60:hotel-saas

# リモートの確認
git remote -v
```

### 8.2. hotel-saasのProcfile作成

```bash
# Procfileの作成
echo "web: npm start" > Procfile

# package.jsonのスクリプト確認/修正
# "start": "node .output/server/index.mjs" が必要
```

### 8.3. hotel-commonリポジトリの設定

```bash
# ローカルマシンで実行
cd /Users/kaneko/hotel-common

# Dokkuリモートの追加
git remote add dokku dokku@163.44.117.60:hotel-common

# リモートの確認
git remote -v
```

### 8.4. hotel-commonのProcfile作成

```bash
# Procfileの作成
echo "web: node dist/main.js" > Procfile

# package.jsonのスクリプト確認/修正
# "start": "node dist/main.js" が必要
```

## 9. アプリケーションのデプロイ

### 9.1. hotel-saasのデプロイ

```bash
# ローカルマシンで実行
cd /Users/kaneko/hotel-saas

# 変更をコミット
git add Procfile
git commit -m "Add: Procfile for Dokku deployment"

# Dokkuへのデプロイ
git push dokku main
```

### 9.2. hotel-commonのデプロイ

```bash
# ローカルマシンで実行
cd /Users/kaneko/hotel-common

# 変更をコミット
git add Procfile
git commit -m "Add: Procfile for Dokku deployment"

# Dokkuへのデプロイ
git push dokku main
```

## 10. デプロイ後の確認

### 10.1. アプリケーションの状態確認

```bash
# サーバーで実行
dokku ps:report hotel-saas
dokku ps:report hotel-common
```

### 10.2. ログの確認

```bash
# hotel-saasのログ
dokku logs hotel-saas

# hotel-commonのログ
dokku logs hotel-common

# リアルタイムログ
dokku logs hotel-saas -t
```

### 10.3. URLでの動作確認

```bash
# ヘルスチェック
curl -f https://dev-app.omotenasuai.com/health
curl -f https://dev-api.omotenasuai.com/health
```

## 11. スケーリング設定

### 11.1. コンテナ数のスケーリング

```bash
# hotel-saasのスケーリング
dokku ps:scale hotel-saas web=2

# hotel-commonのスケーリング
dokku ps:scale hotel-common web=2

# スケーリング状態の確認
dokku ps:report
```

## 12. バックアップ設定

### 12.1. データベースバックアップ

```bash
# 手動バックアップ
dokku postgres:export hotel_unified_db > /opt/dokku/data/backups/hotel_unified_db_$(date +%Y%m%d).sql

# 自動バックアップの設定
# cronジョブの設定が必要
```

## 13. トラブルシューティング

### 13.1. デプロイ失敗時の対応

```bash
# デプロイログの確認
dokku logs hotel-saas

# アプリケーションの再起動
dokku ps:restart hotel-saas

# ビルドキャッシュのクリア
dokku repo:purge-cache hotel-saas
```

### 13.2. ロールバック

```bash
# 以前のデプロイへのロールバック
dokku ps:rebuild hotel-saas
```

### 13.3. 一般的な問題

1. **ポート競合**:
   ```bash
   dokku proxy:ports-clear hotel-saas
   dokku proxy:ports-set hotel-saas http:80:3100
   ```

2. **環境変数の問題**:
   ```bash
   dokku config:show hotel-saas
   ```

3. **メモリ不足**:
   ```bash
   dokku resource:limit --memory 2G hotel-saas
   ```

## 14. 次のステップ

アプリケーションのデプロイが完了したら、次のステップに進みます：

1. 監視設定
2. アラート設定
3. CI/CD連携

詳細な手順については、「Dokku運用管理ガイド」を参照してください。
