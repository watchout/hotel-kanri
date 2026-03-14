# 🐳 統合Docker デプロイメントガイド

**日付**: 2025年1月18日  
**作成者**: Iza（統合管理者）  
**対象**: 全開発チーム、DevOps  
**バージョン**: 2.0  

---

## 📋 概要

UNIFY-DEVプロジェクトによる4システム統合Docker環境のデプロイメント手順を説明します。

## 🏗️ アーキテクチャ概要

### システム構成
```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │ hotel-saas  │ │ hotel-pms   │ │hotel-member │ │ hotel-  │ │
│  │   :3100     │ │ :3300/:3301 │ │:3200/:8080  │ │ common  │ │
│  │ AIコンシェルジュ│ │フロント業務  │ │ 会員管理    │ │ :3400   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │PostgreSQL   │ │   Redis     │ │  RabbitMQ   │             │
│  │   :5432     │ │   :6379     │ │:5672/:15672 │             │
│  └─────────────┘ └─────────────┘ └─────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 ローカル開発環境デプロイ

### 前提条件
```bash
# 必要なソフトウェア
- Docker Desktop 4.0+
- Docker Compose 2.0+
- Git 2.30+
```

### 環境構築手順

#### 1. リポジトリクローン
```bash
# プロジェクトルートに移動
cd /Users/kaneko/hotel-kanri

# 各システムが正しい位置にあることを確認
ls -la ../
# 期待される構造:
# /Users/kaneko/hotel-saas/
# /Users/kaneko/hotel-pms/
# /Users/kaneko/hotel-member/
# /Users/kaneko/hotel-common/
```

#### 2. 統合Docker Compose設定
```bash
# 統合docker-compose.ymlを作成
cp docker-compose.simple.yml docker-compose.unified.yml
```

#### 3. 環境変数設定
```bash
# 各システムの.env確認
ls -la /Users/kaneko/hotel-saas/.env
ls -la /Users/kaneko/hotel-pms/.env      # 要作成
ls -la /Users/kaneko/hotel-member/.env   # 要作成
ls -la /Users/kaneko/hotel-common/.env

# 統一データベース接続確認
grep DATABASE_URL ../hotel-*/env
# 期待値: postgresql://hotel_app:password@127.0.0.1:5432/hotel_unified_db
```

#### 4. 全システム起動
```bash
# 全サービス起動
docker compose -f docker-compose.unified.yml up -d

# 起動確認
docker compose -f docker-compose.unified.yml ps

# ログ確認
docker compose -f docker-compose.unified.yml logs -f
```

#### 5. 動作確認
```bash
# ヘルスチェック
curl http://localhost:3100/healthz  # hotel-saas
curl http://localhost:3300/health   # hotel-pms
curl http://localhost:3200/health   # hotel-member
curl http://localhost:3400/health   # hotel-common

# データベース接続確認
docker compose -f docker-compose.unified.yml exec db psql -U hotel_app -d hotel_unified_db -c "\dt"
```

---

## 🚀 本番環境デプロイ（Dokku）

### サーバー準備

#### 1. Dokku インストール
```bash
# サーバーにSSH接続
ssh admin@163.44.117.60

# Dokku インストール
wget -NP . https://dokku.com/install/v0.34.8/bootstrap.sh
sudo DOKKU_TAG=v0.34.8 bash bootstrap.sh

# 初期設定
dokku plugin:install https://github.com/dokku/dokku-postgres.git
dokku plugin:install https://github.com/dokku/dokku-redis.git
```

#### 2. アプリケーション作成
```bash
# 各システムのアプリ作成
dokku apps:create hotel-saas-prod
dokku apps:create hotel-pms-prod
dokku apps:create hotel-member-prod
dokku apps:create hotel-common-prod

# データベース作成
dokku postgres:create hotel-unified-db
dokku redis:create hotel-cache

# データベース接続
dokku postgres:link hotel-unified-db hotel-saas-prod
dokku postgres:link hotel-unified-db hotel-pms-prod
dokku postgres:link hotel-unified-db hotel-member-prod
dokku postgres:link hotel-unified-db hotel-common-prod

# Redis接続
dokku redis:link hotel-cache hotel-saas-prod
dokku redis:link hotel-cache hotel-pms-prod
dokku redis:link hotel-cache hotel-member-prod
dokku redis:link hotel-cache hotel-common-prod
```

#### 3. 環境変数設定
```bash
# hotel-saas
dokku config:set hotel-saas-prod \
  NODE_ENV=production \
  NUXT_PORT=3100 \
  NUXT_HOST=0.0.0.0 \
  JWT_SECRET="OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g==" \
  BASE_URL=https://saas.omotenasuai.com

# hotel-pms
dokku config:set hotel-pms-prod \
  NODE_ENV=production \
  PORT=3300 \
  ELECTRON_PORT=3301

# hotel-member
dokku config:set hotel-member-prod \
  NODE_ENV=production \
  API_PORT=3200 \
  UI_PORT=8080

# hotel-common
dokku config:set hotel-common-prod \
  NODE_ENV=production \
  PORT=3400
```

#### 4. ドメイン設定
```bash
# ドメイン設定
dokku domains:set hotel-saas-prod saas.omotenasuai.com
dokku domains:set hotel-pms-prod pms.omotenasuai.com
dokku domains:set hotel-member-prod member.omotenasuai.com
dokku domains:set hotel-common-prod api.omotenasuai.com

# SSL証明書設定
dokku letsencrypt:enable hotel-saas-prod
dokku letsencrypt:enable hotel-pms-prod
dokku letsencrypt:enable hotel-member-prod
dokku letsencrypt:enable hotel-common-prod
```

### デプロイ実行

#### 1. ローカルからのデプロイ
```bash
# Git remote追加
git remote add dokku-saas dokku@163.44.117.60:hotel-saas-prod
git remote add dokku-pms dokku@163.44.117.60:hotel-pms-prod
git remote add dokku-member dokku@163.44.117.60:hotel-member-prod
git remote add dokku-common dokku@163.44.117.60:hotel-common-prod

# 各システムデプロイ
git subtree push --prefix=/Users/kaneko/hotel-saas dokku-saas main
git subtree push --prefix=/Users/kaneko/hotel-pms dokku-pms main
git subtree push --prefix=/Users/kaneko/hotel-member dokku-member main
git subtree push --prefix=/Users/kaneko/hotel-common dokku-common main
```

#### 2. GitHub Actions自動デプロイ
```yaml
# .github/workflows/deploy-unified.yml
name: Unified Docker Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [hotel-saas, hotel-pms, hotel-member, hotel-common]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Dokku
        uses: dokku/github-action@master
        with:
          git_remote_url: 'ssh://dokku@163.44.117.60:22/${{ matrix.service }}-prod'
          ssh_private_key: ${{ secrets.DOKKU_SSH_PRIVATE_KEY }}
          git_push_flags: '--force'
```

---

## 🔍 監視・ログ管理

### ヘルスチェック
```bash
# ローカル環境
docker compose -f docker-compose.unified.yml exec saas curl -f http://localhost:3100/healthz
docker compose -f docker-compose.unified.yml exec pms curl -f http://localhost:3300/health
docker compose -f docker-compose.unified.yml exec member curl -f http://localhost:3200/health
docker compose -f docker-compose.unified.yml exec common curl -f http://localhost:3400/health

# 本番環境
dokku ps:report hotel-saas-prod
dokku ps:report hotel-pms-prod
dokku ps:report hotel-member-prod
dokku ps:report hotel-common-prod
```

### ログ確認
```bash
# ローカル環境
docker compose -f docker-compose.unified.yml logs -f saas
docker compose -f docker-compose.unified.yml logs -f pms
docker compose -f docker-compose.unified.yml logs -f member
docker compose -f docker-compose.unified.yml logs -f common

# 本番環境
dokku logs -t hotel-saas-prod
dokku logs -t hotel-pms-prod
dokku logs -t hotel-member-prod
dokku logs -t hotel-common-prod
```

---

## 🛠️ トラブルシューティング

### よくある問題と解決策

#### 1. コンテナ起動失敗
```bash
# 問題: コンテナが起動しない
# 解決策:
docker compose -f docker-compose.unified.yml logs [service_name]
docker compose -f docker-compose.unified.yml exec [service_name] sh

# Dockerfile確認
docker compose -f docker-compose.unified.yml build --no-cache [service_name]
```

#### 2. データベース接続エラー
```bash
# 問題: DATABASE_URL接続エラー
# 解決策:
docker compose -f docker-compose.unified.yml exec db psql -U hotel_app -d hotel_unified_db

# 接続文字列確認
echo $DATABASE_URL
```

#### 3. ポート競合
```bash
# 問題: ポートが既に使用中
# 解決策:
lsof -i :3100  # ポート使用状況確認
docker compose -f docker-compose.unified.yml down  # 全停止
docker system prune -f  # クリーンアップ
```

#### 4. Prismaクライアント問題
```bash
# 問題: Prismaクライアント生成エラー
# 解決策:
docker compose -f docker-compose.unified.yml exec common npx prisma generate
docker compose -f docker-compose.unified.yml exec common npx prisma migrate deploy
```

---

## 🔄 ロールバック手順

### ローカル環境
```bash
# 前のバージョンに戻す
git checkout [previous_commit]
docker compose -f docker-compose.unified.yml down
docker compose -f docker-compose.unified.yml up -d --build
```

### 本番環境（Dokku）
```bash
# Dokkuロールバック
dokku ps:revert hotel-saas-prod
dokku ps:revert hotel-pms-prod
dokku ps:revert hotel-member-prod
dokku ps:revert hotel-common-prod
```

---

## 📊 パフォーマンス監視

### メトリクス収集
```bash
# Docker統計情報
docker stats

# Dokku統計情報
dokku resource:report hotel-saas-prod
dokku resource:report hotel-pms-prod
dokku resource:report hotel-member-prod
dokku resource:report hotel-common-prod
```

### リソース制限設定
```yaml
# docker-compose.unified.yml
services:
  saas:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 📚 関連ドキュメント

- **📖 システム構造**: `docs/architecture/docker/unified-docker-architecture-2025.md`
- **🔧 開発ガイド**: `docs/development/docker-development-guide.md`
- **🌐 オフライン設計**: `docs/architecture/offline/offline-strategy.md`
- **⚠️ 旧構造（非推奨）**: `docs/architecture/docker/docker-architecture.md`

---

## 🤝 サポート

### 緊急時連絡
- **統合管理**: Iza（統合管理者）
- **技術サポート**: hotel-kanri開発チーム

### 質問・課題報告
1. Docker化実装での課題
2. デプロイエラーの解決
3. パフォーマンス問題
4. システム間連携の問題

---

**🎯 このガイドに従って、統合Docker環境の安全で効率的なデプロイを実現してください。**

---

**Iza（統合管理者）**  
**2025年1月18日**
