# Docker化アーキテクチャ設計書（旧版）

<!-- 
🚨 このドキュメントは2025年1月18日より非推奨です
新しい統合Docker構造については以下を参照してください：
docs/architecture/docker/unified-docker-architecture-2025.md
-->

**日付**: 2023年8月18日
**作成者**: hotel-kanri
**バージョン**: 1.0 ⚠️ **DEPRECATED**

## 1. 概要 ⚠️ **旧構造 - 非推奨**

<!-- 
本ドキュメントでは、omotenasuai.comプロジェクトのDocker化アーキテクチャについて定義します。PM2ベースの直接デプロイから、Dockerベースのコンテナ化デプロイへの移行を目的としています。まずはhotel-saasを対象に実装し、成功後に他のサービスにも展開します。

⚠️ 注意: この構造は段階的に廃止され、統合Docker構造に移行中です。
-->

## 2. アーキテクチャの目標

- **環境の一貫性**: 開発環境、テスト環境、本番環境で同一の実行環境を保証
- **デプロイの信頼性向上**: 環境依存のエラーを排除し、デプロイの成功率を向上
- **スケーラビリティ**: 水平スケーリングを容易にし、クラウド環境との親和性を高める
- **分離性**: サービス間の分離を明確にし、依存関係の管理を容易にする
- **CI/CDの効率化**: ビルド、テスト、デプロイのプロセスを自動化し効率化する

## 3. 全体構成

### 3.1. コンテナ構成

```
+----------------------------------+
|           Nginx Proxy            |
+----------------------------------+
         |            |
+------------------+  |  +------------------+
|    hotel-saas    |  |  |   hotel-common   |
+------------------+  |  +------------------+
         |            |           |
+------------------+  |  +------------------+
|      Redis       |  |  |    PostgreSQL    |
+------------------+  |  +------------------+
                      |
+----------------------------------+
|           RabbitMQ              |
+----------------------------------+
```

### 3.2. サービス構成

| サービス名 | 説明 | ベースイメージ | 公開ポート |
|----------|------|--------------|----------|
| nginx | リバースプロキシ | nginx:stable-alpine | 80, 443 |
| hotel-saas | AIコンシェルジュ | node:20-alpine | 3100 |
| hotel-common | 共通基盤 | node:20-alpine | 3400 |
| postgres | データベース | postgres:14-alpine | 5432 |
| redis | キャッシュ | redis:alpine | 6379 |
| rabbitmq | メッセージブローカー | rabbitmq:3-management-alpine | 5672, 15672 |

## 4. 各サービスのDockerfile設計

### 4.1. hotel-saas Dockerfile

```dockerfile
# ビルドステージ
FROM node:20-alpine AS build

WORKDIR /app

# パッケージインストール
COPY package*.json ./
RUN npm install --legacy-peer-deps

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# 実行ステージ
FROM node:20-alpine

WORKDIR /app

# ビルド成果物のコピー
COPY --from=build /app/.output /app/.output
COPY --from=build /app/package*.json /app/

# 環境変数の設定
ENV NODE_ENV=production
ENV PORT=3100

# ポートの公開
EXPOSE 3100

# アプリケーションの起動
CMD ["node", ".output/server/index.mjs"]
```

### 4.2. hotel-common Dockerfile

```dockerfile
# ビルドステージ
FROM node:20-alpine AS build

WORKDIR /app

# パッケージインストール
COPY package*.json ./
RUN npm install

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# 実行ステージ
FROM node:20-alpine

WORKDIR /app

# ビルド成果物のコピー
COPY --from=build /app/dist /app/dist
COPY --from=build /app/package*.json /app/
COPY --from=build /app/prisma /app/prisma

# 環境変数の設定
ENV NODE_ENV=production
ENV PORT=3400

# 本番用の依存関係のみインストール
RUN npm install --production

# ポートの公開
EXPOSE 3400

# アプリケーションの起動
CMD ["node", "dist/main.js"]
```

## 5. docker-compose.yml設計

```yaml
version: '3.8'

services:
  # Nginx - リバースプロキシ
  nginx:
    image: nginx:stable-alpine
    container_name: omotenasuai-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./config/nginx/sites-available:/etc/nginx/sites-enabled
      - ./config/nginx/ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - hotel-saas
      - hotel-common
    restart: always
    networks:
      - omotenasuai-network

  # PostgreSQL - データベース
  postgres:
    image: postgres:14-alpine
    container_name: omotenasuai-postgres
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./config/postgres/init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: always
    networks:
      - omotenasuai-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # RabbitMQ - メッセージブローカー
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: omotenasuai-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    restart: always
    networks:
      - omotenasuai-network
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis - キャッシュ
  redis:
    image: redis:alpine
    container_name: omotenasuai-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: always
    networks:
      - omotenasuai-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # hotel-common - 共通基盤
  hotel-common:
    build:
      context: ../hotel-common
      dockerfile: Dockerfile
    image: ${DOCKER_REGISTRY}/hotel-common:${COMMON_VERSION:-latest}
    container_name: omotenasuai-common
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 3400
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USER: ${RABBITMQ_USER}
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3400:3400"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    restart: always
    networks:
      - omotenasuai-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3400/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # hotel-saas - AIコンシェルジュ
  hotel-saas:
    build:
      context: ../hotel-saas
      dockerfile: Dockerfile
    image: ${DOCKER_REGISTRY}/hotel-saas:${SAAS_VERSION:-latest}
    container_name: omotenasuai-saas
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: 3100
      COMMON_API_URL: http://hotel-common:3400
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USER: ${RABBITMQ_USER}
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD}
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      JWT_SECRET: ${JWT_SECRET}
      BASE_URL: ${BASE_URL:-https://dev-app.omotenasuai.com}
    ports:
      - "3100:3100"
    depends_on:
      hotel-common:
        condition: service_healthy
    restart: always
    networks:
      - omotenasuai-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3100/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  omotenasuai-network:
    driver: bridge

volumes:
  postgres-data:
  rabbitmq-data:
  redis-data:
```

## 6. CI/CD設計

### 6.1. GitHub Actionsワークフロー

```yaml
name: Docker Build and Deploy

on:
  push:
    branches: [main, develop]
    paths:
      - 'hotel-saas/**'
      - 'hotel-common/**'
      - '.github/workflows/docker-deploy.yml'
  workflow_dispatch:
    inputs:
      service:
        description: 'デプロイするサービス (all, hotel-saas, hotel-common)'
        required: false
        default: 'all'
      version:
        description: 'デプロイするバージョン (タグ名またはブランチ名)'
        required: false
        default: 'develop'

env:
  DOCKER_REGISTRY: ghcr.io/watchout
  SERVER_IP: 163.44.117.60
  DEPLOY_USER: deploy

jobs:
  build-and-push:
    name: Dockerイメージのビルドとプッシュ
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [hotel-saas, hotel-common]
    if: github.event.inputs.service == 'all' || github.event.inputs.service == matrix.service || github.event_name == 'push'
    
    steps:
      - name: リポジトリのチェックアウト
        uses: actions/checkout@v3
        
      - name: Dockerログイン
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Docker Buildx設定
        uses: docker/setup-buildx-action@v2
        
      - name: バージョン決定
        id: version
        run: |
          VERSION="${{ github.event.inputs.version || github.ref_name }}"
          echo "VERSION=$VERSION" >> $GITHUB_ENV
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          
      - name: ビルドとプッシュ
        uses: docker/build-push-action@v4
        with:
          context: ./${{ matrix.service }}
          push: true
          tags: ${{ env.DOCKER_REGISTRY }}/${{ matrix.service }}:${{ steps.version.outputs.version }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: サーバーへのデプロイ
    runs-on: ubuntu-latest
    needs: build-and-push
    
    steps:
      - name: リポジトリのチェックアウト
        uses: actions/checkout@v3
        
      - name: SSH経由でデプロイ実行
        uses: appleboy/ssh-action@v0.1.8
        with:
          host: ${{ env.SERVER_IP }}
          username: ${{ env.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            set -e
            
            # hotel-kanriリポジトリのクローンまたは更新
            if [ ! -d /opt/omotenasuai/hotel-kanri/.git ]; then
              echo "hotel-kanriリポジトリをクローンしています..."
              mkdir -p /opt/omotenasuai
              git clone git@github.com:watchout/hotel-kanri.git /opt/omotenasuai/hotel-kanri
            else
              echo "hotel-kanriリポジトリを更新しています..."
              cd /opt/omotenasuai/hotel-kanri
              git fetch --all
              git checkout ${{ github.ref_name }}
              git pull origin ${{ github.ref_name }}
            fi
            
            # 環境変数ファイルの準備
            cd /opt/omotenasuai/hotel-kanri
            if [ ! -f .env ]; then
              cp templates/env/.env.template .env
              # 必要な環境変数を設定
              echo "DB_USER=hotel_app" >> .env
              echo "DB_PASSWORD=xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9" >> .env
              echo "DB_NAME=hotel_unified_db" >> .env
              echo "REDIS_PASSWORD=r3d1sP@ssw0rd" >> .env
              echo "RABBITMQ_USER=hotel_app" >> .env
              echo "RABBITMQ_PASSWORD=r@bb1tMQP@ss" >> .env
              echo "JWT_SECRET=OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g==" >> .env
              echo "NODE_ENV=production" >> .env
              echo "BASE_URL=https://dev-app.omotenasuai.com" >> .env
            fi
            
            # バージョン設定
            echo "DOCKER_REGISTRY=${{ env.DOCKER_REGISTRY }}" >> .env
            echo "SAAS_VERSION=${{ github.event.inputs.version || github.ref_name }}" >> .env
            echo "COMMON_VERSION=${{ github.event.inputs.version || github.ref_name }}" >> .env
            
            # Dockerイメージのプルと起動
            cd /opt/omotenasuai/hotel-kanri
            docker-compose -f config/docker/docker-compose.yml pull
            docker-compose -f config/docker/docker-compose.yml up -d
            
            # ヘルスチェック
            sleep 10
            curl -f http://localhost:3100/health || echo "Warning: hotel-saas health check failed"
            curl -f http://localhost:3400/health || echo "Warning: hotel-common health check failed"
            
            echo "デプロイ完了"

  notify:
    name: デプロイ通知
    runs-on: ubuntu-latest
    needs: deploy
    if: always()
    
    steps:
      - name: Slack通知
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
          text: |
            Docker デプロイが${{ job.status == 'success' && '成功' || '失敗' }}しました
            - サービス: ${{ github.event.inputs.service || 'all' }}
            - バージョン: ${{ github.event.inputs.version || github.ref_name }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## 7. 開発環境設定

### 7.1. 開発用docker-compose.yml

```yaml
version: '3.8'

services:
  # PostgreSQL - データベース
  postgres:
    image: postgres:14-alpine
    container_name: dev-postgres
    environment:
      POSTGRES_USER: hotel_app
      POSTGRES_PASSWORD: password
      POSTGRES_DB: hotel_unified_db
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - dev-network

  # RabbitMQ - メッセージブローカー
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: dev-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: hotel_app
      RABBITMQ_DEFAULT_PASS: password
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - dev-network

  # Redis - キャッシュ
  redis:
    image: redis:alpine
    container_name: dev-redis
    command: redis-server --requirepass password
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - dev-network

networks:
  dev-network:
    driver: bridge

volumes:
  postgres-data:
  rabbitmq-data:
  redis-data:
```

### 7.2. 開発用.env.example

```
# データベース設定
DB_USER=hotel_app
DB_PASSWORD=password
DB_NAME=hotel_unified_db
DATABASE_URL=postgresql://hotel_app:password@localhost:5432/hotel_unified_db

# Redis設定
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=password

# RabbitMQ設定
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=hotel_app
RABBITMQ_PASSWORD=password

# JWT設定
JWT_SECRET=dev_secret_key

# アプリケーション設定
NODE_ENV=development
PORT=3100
BASE_URL=http://localhost:3100

# API URL
COMMON_API_URL=http://localhost:3400
```

## 8. 移行計画

### 8.1. フェーズ1: 準備と検証（1週間）

1. **Dockerfileの作成**:
   - hotel-saasとhotel-common用のDockerfileを作成
   - ローカル環境でのビルドとテスト

2. **docker-compose.ymlの更新**:
   - 既存のテンプレートを実際の運用に合わせて更新
   - 開発環境用と本番環境用の設定を分離

3. **GitHub Actionsワークフローの作成**:
   - Docker Build and Deployワークフローの作成
   - テスト環境でのビルドとプッシュのテスト

### 8.2. フェーズ2: hotel-saasの移行（1週間）

1. **hotel-saasのDockerfile実装**:
   - 本番用Dockerfileの最終調整
   - ビルドプロセスの最適化

2. **CI/CDパイプラインの統合**:
   - GitHub Actionsワークフローの有効化
   - イメージのビルドとプッシュのテスト

3. **開発環境でのテスト**:
   - Dockerコンテナとしてのhotel-saasのテスト
   - 機能とパフォーマンスの検証

### 8.3. フェーズ3: 本番環境への展開（1週間）

1. **本番サーバーの準備**:
   - Dockerとdocker-composeのインストール
   - 必要な設定ファイルの配置

2. **hotel-saasのデプロイ**:
   - CI/CDパイプラインを使用したデプロイ
   - 動作確認とモニタリング

3. **PM2設定の整理**:
   - 不要になったPM2設定の削除または非アクティブ化
   - 設定ファイルの整理

### 8.4. フェーズ4: 他サービスへの展開（2週間）

1. **hotel-commonの移行**:
   - hotel-commonのDockerfile実装
   - CI/CDパイプラインの更新

2. **残りのサービスの移行計画**:
   - hotel-pmsとhotel-memberの移行計画の策定
   - 段階的な移行スケジュールの作成

## 9. 注意点と考慮事項

1. **データの永続化**:
   - データベース、キャッシュ、メッセージキューのデータは適切にボリュームにマウントして永続化
   - バックアップ戦略の見直しと更新

2. **環境変数の管理**:
   - 機密情報は.envファイルで管理し、リポジトリにはコミットしない
   - 環境ごとに適切な値を設定

3. **リソース要件**:
   - コンテナのリソース制限（CPU、メモリ）を適切に設定
   - ホストマシンのリソース要件を見直し

4. **ログ管理**:
   - コンテナログの収集と集約の仕組みを整備
   - ログローテーションの設定

5. **モニタリング**:
   - コンテナとサービスの健全性モニタリングの導入
   - アラート設定の見直し

## 10. 結論

Docker化によって、環境の一貫性、デプロイの信頼性、スケーラビリティが向上し、開発からテスト、本番までのフローが効率化されます。まずはhotel-saasを対象に実装し、成功後に他のサービスにも展開することで、段階的かつ安全に移行を進めることができます。

PM2ベースの直接デプロイからDockerベースのコンテナ化デプロイへの移行は、初期投資は必要ですが、中長期的には開発効率の向上、運用コストの削減、品質向上につながると考えられます。
