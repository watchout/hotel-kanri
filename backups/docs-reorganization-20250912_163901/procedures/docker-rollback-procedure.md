# Dockerからの復旧手順書（旧版）

<!-- 
🚨 このドキュメントは2025年1月18日より非推奨です
新しい統合Docker構造では、PM2への復旧は想定していません。
統合Docker構造については以下を参照してください：
docs/architecture/docker/unified-docker-architecture-2025.md
-->

**日付**: 2023年8月18日
**作成者**: hotel-kanri
**バージョン**: 1.0 ⚠️ **DEPRECATED**

## 1. 概要 ⚠️ **旧構造用 - 非推奨**

<!-- 
本ドキュメントでは、Docker化デプロイから元のPM2ベースのデプロイに戻す手順を説明します。問題が発生した場合や、Docker化を一時的に中止する必要がある場合に参照してください。

⚠️ 注意: 新しい統合Docker構造では、PM2への復旧は想定していません。
-->

## 2. 前提条件

- サーバーへのSSHアクセス権限
- PM2の基本的な知識
- バックアップデータ（可能であれば）

## 3. ロールバック手順

### 3.1. Docker環境の停止

```bash
# SSHでサーバーに接続
ssh deploy@163.44.117.60

# Docker環境を停止
cd /opt/omotenasuai/hotel-kanri
docker-compose -f config/docker/docker-compose.yml down

# コンテナとイメージの状態確認
docker ps -a
docker images
```

### 3.2. データベースのバックアップ（必要に応じて）

```bash
# Docker環境のデータベースをバックアップ
docker exec -t omotenasuai-postgres pg_dumpall -c -U hotel_app > /opt/omotenasuai/db_backup_$(date +%Y%m%d_%H%M%S).sql

# バックアップファイルの確認
ls -la /opt/omotenasuai/db_backup_*
```

### 3.3. PM2環境の復元

#### 3.3.1. hotel-saasの復元

```bash
# hotel-saasリポジトリの最新状態に更新
cd /opt/omotenasuai/hotel-saas
git fetch --all
git checkout main  # または適切なブランチ
git pull

# 依存関係のインストール
npm install --legacy-peer-deps

# ビルド
npm run build

# 環境変数ファイルの確認
# 既存の.envファイルを確認し、必要に応じて更新
nano .env

# PM2設定の確認
cd /opt/omotenasuai
nano ecosystem.config.js

# PM2でサービスを起動
pm2 start ecosystem.config.js --only hotel-saas
```

#### 3.3.2. hotel-commonの復元

```bash
# hotel-commonリポジトリの最新状態に更新
cd /opt/omotenasuai/hotel-common
git fetch --all
git checkout main  # または適切なブランチ
git pull

# 依存関係のインストール
npm install

# ビルド
npm run build

# 環境変数ファイルの確認
# 既存の.envファイルを確認し、必要に応じて更新
nano .env

# PM2でサービスを起動
pm2 start ecosystem.config.js --only hotel-common
```

### 3.4. サービスの動作確認

```bash
# PM2のステータス確認
pm2 status

# ログの確認
pm2 logs hotel-saas
pm2 logs hotel-common

# ヘルスチェック
curl -f http://localhost:3100/health
curl -f http://localhost:3400/health
```

### 3.5. Nginxの設定確認

```bash
# Nginx設定の確認
sudo nano /etc/nginx/sites-available/omotenasuai.conf

# Nginxの再起動
sudo systemctl restart nginx

# Nginxのステータス確認
sudo systemctl status nginx
```

## 4. CI/CDパイプラインの調整

### 4.1. GitHub Actionsワークフローの無効化

GitHub リポジトリの設定から、Docker関連のワークフローを無効化します：

1. GitHub リポジトリにアクセス
2. Settings > Actions > General に移動
3. "Disable Actions" を選択するか、特定のワークフローのみを無効化

または、`.github/workflows/docker-deploy.yml` ファイルを以下のように変更して無効化することもできます：

```yaml
name: Docker Build and Deploy

on:
  # 一時的にすべてのトリガーをコメントアウト
  # push:
  #   branches: [main, develop]
  workflow_dispatch:
    inputs:
      service:
        description: 'デプロイするサービス (all, hotel-saas, hotel-common)'
        required: false
        default: 'all'
```

### 4.2. 元のデプロイワークフローの有効化

`.github/workflows/deploy-dev.yml` が無効化されていた場合は、再度有効化します。

## 5. データの整合性確認

### 5.1. データベースの確認

```bash
# PostgreSQLに接続
psql -U hotel_app -d hotel_unified_db

# テーブル一覧の確認
\dt

# 重要なテーブルのデータ確認
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM reservations;
```

### 5.2. キャッシュデータの確認

```bash
# Redisに接続
redis-cli

# 認証
AUTH your_redis_password

# キーの一覧確認
KEYS *

# 特定のキーの確認
GET key_name
```

## 6. ロールバック後の検証

### 6.1. 機能テスト

以下の機能が正常に動作することを確認します：

- ユーザーログイン
- 予約の作成と表示
- 決済処理
- 通知機能
- 管理機能

### 6.2. パフォーマンス確認

```bash
# サーバーの負荷確認
top
htop

# ディスク使用量
df -h

# メモリ使用量
free -m
```

## 7. トラブルシューティング

### 7.1. PM2サービスが起動しない場合

```bash
# エラーログの確認
pm2 logs

# 設定ファイルの確認
cat ecosystem.config.js

# 手動での起動テスト
cd /opt/omotenasuai/hotel-saas
NODE_ENV=production node .output/server/index.mjs
```

### 7.2. データベース接続エラー

```bash
# PostgreSQLサービスの状態確認
sudo systemctl status postgresql

# PostgreSQLの再起動
sudo systemctl restart postgresql

# ログの確認
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 7.3. Nginx接続エラー

```bash
# Nginxのエラーログ確認
sudo tail -f /var/log/nginx/error.log

# 設定ファイルの構文チェック
sudo nginx -t

# Nginxの再起動
sudo systemctl restart nginx
```

## 8. ロールバック後の報告

ロールバック作業完了後、以下の情報を含む報告書を作成します：

1. ロールバックの理由
2. 実施した手順
3. 発生した問題と解決策
4. 現在のシステム状態
5. 今後の対応計画

## 9. Docker環境の再開（必要に応じて）

問題が解決し、再度Docker環境に移行する場合は、以下の手順で再開します：

```bash
# Docker環境の起動
cd /opt/omotenasuai/hotel-kanri
docker-compose -f config/docker/docker-compose.yml up -d

# PM2サービスの停止
pm2 stop hotel-saas
pm2 stop hotel-common

# 動作確認
curl -f http://localhost:3100/health
curl -f http://localhost:3400/health
```

## 10. 注意事項

- ロールバック作業は、可能な限り低負荷時間帯に実施してください
- 作業前に必ずデータのバックアップを取得してください
- 複数人で作業する場合は、作業の担当範囲を明確にしてください
- 問題が発生した場合は、すぐに作業を中断し、状況を報告してください

---

このドキュメントは、Docker化からPM2ベースのデプロイに戻す際の基本的な手順を示しています。実際の環境や状況に応じて、手順を調整してください。
