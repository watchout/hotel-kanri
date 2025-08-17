# Dockerベースデプロイフロー提案書

**日付**: 2023年8月17日
**作成者**: hotel-kanri

## 1. 背景と目的

現在のomotenasuai.comプロジェクトのデプロイフローでは、サーバー上のNode.jsバージョンとアプリケーションの要件の不一致など、環境依存の問題が発生しています。この提案書では、Dockerを使用した一貫性のあるデプロイフローへの移行を提案します。

### 1.1. 現状の課題

1. **環境依存の問題**:
   - サーバー上のNode.jsバージョン（v18.20.8）とアプリケーション要件（v20以上）の不一致
   - 開発環境、CI/CD環境、本番環境での一貫性の欠如

2. **デプロイの信頼性**:
   - 環境の違いによるビルドエラーや実行時エラー
   - 「自分の環境では動くのに」という問題の発生

3. **スケーリングの難しさ**:
   - 新しいサーバーへのデプロイ時に同じ環境を再現するのが困難
   - 環境設定の手動管理による人的ミスのリスク

### 1.2. 提案の目的

1. **環境の一貫性確保**:
   - 開発、テスト、本番環境で同一の実行環境を保証
   - アプリケーションの依存関係とバージョン要件の明確化

2. **デプロイの信頼性向上**:
   - 「コンテナとして動作すれば、どこでも動作する」原則の実現
   - 環境依存のエラーを排除

3. **運用の効率化**:
   - スケーリングの容易化
   - インフラ管理の自動化

## 2. 提案内容

### 2.1. Dockerベースデプロイフローの概要

1. **コンテナ化**:
   - 各サービス（hotel-saas, hotel-common, hotel-pms, hotel-member）を個別のDockerコンテナとして実行
   - 各サービスのDockerfileで必要なNode.jsバージョンを明示的に指定

2. **Docker Composeによる環境管理**:
   - `docker-compose.yml`で複数サービスの連携を定義
   - 環境変数、ネットワーク設定、ボリューム設定の一元管理

3. **CI/CDパイプラインの更新**:
   - GitHub Actionsでコンテナのビルドとプッシュを実行
   - サーバー上ではコンテナのプル、起動のみを行う

### 2.2. 具体的な実装計画

#### 2.2.1. Dockerfileの作成・更新

各サービスのDockerfileを作成または更新します。例えば、hotel-saasのDockerfileは以下のようになります：

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3100

# Start the application
CMD ["node", ".output/server/index.mjs"]
```

#### 2.2.2. Docker Composeの設定

既存の`docker-compose.yml.template`を更新し、実際の運用に使用します：

```yaml
version: '3.8'

services:
  # Nginx - リバースプロキシ
  nginx:
    image: nginx:stable-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./config/nginx/sites-available:/etc/nginx/sites-enabled
      - ./config/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - hotel-common
      - hotel-saas
      - hotel-pms
      - hotel-member
    restart: always
    networks:
      - omotenasuai-network

  # PostgreSQL - データベース
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always
    networks:
      - omotenasuai-network

  # RabbitMQ - メッセージブローカー
  rabbitmq:
    image: rabbitmq:3-management-alpine
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

  # Redis - キャッシュ
  redis:
    image: redis:alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: always
    networks:
      - omotenasuai-network

  # hotel-common - 共通基盤
  hotel-common:
    image: ${DOCKER_REGISTRY}/hotel-common:${COMMON_VERSION}
    environment:
      NODE_ENV: ${NODE_ENV}
      PORT: 3400
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
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
      - postgres
      - redis
      - rabbitmq
    restart: always
    networks:
      - omotenasuai-network

  # hotel-saas - AIコンシェルジュ
  hotel-saas:
    image: ${DOCKER_REGISTRY}/hotel-saas:${SAAS_VERSION}
    environment:
      NODE_ENV: ${NODE_ENV}
      PORT: 3100
      COMMON_API_URL: http://hotel-common:3400
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_PORT: 5672
      RABBITMQ_USER: ${RABBITMQ_USER}
      RABBITMQ_PASSWORD: ${RABBITMQ_PASSWORD}
    ports:
      - "3100:3100"
    depends_on:
      - hotel-common
      - redis
      - rabbitmq
    restart: always
    networks:
      - omotenasuai-network

  # 他のサービスも同様に設定

networks:
  omotenasuai-network:
    driver: bridge

volumes:
  postgres-data:
  rabbitmq-data:
  redis-data:
```

#### 2.2.3. GitHub Actionsの更新

GitHub Actionsのワークフローを更新し、Dockerコンテナのビルドとプッシュを行います：

```yaml
name: Docker Build and Deploy

on:
  push:
    branches: [main, develop]
  workflow_dispatch:
    inputs:
      service:
        description: 'デプロイするサービス (all, hotel-saas, hotel-common, hotel-pms, hotel-member)'
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
        
      - name: ビルドとプッシュ
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ env.DOCKER_REGISTRY }}/${{ github.event.inputs.service || 'hotel-saas' }}:${{ github.event.inputs.version || github.ref_name }}
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
            
            # 環境変数ファイルの準備
            cd /opt/omotenasuai
            if [ ! -f .env ]; then
              cp .env.example .env
            fi
            
            # .envファイルに必要な変数を追加
            echo "DOCKER_REGISTRY=${{ env.DOCKER_REGISTRY }}" >> .env
            echo "SAAS_VERSION=${{ github.event.inputs.version || github.ref_name }}" >> .env
            echo "COMMON_VERSION=${{ github.event.inputs.version || github.ref_name }}" >> .env
            
            # Dockerイメージのプルと起動
            docker-compose pull
            docker-compose up -d
            
            # ヘルスチェック
            sleep 10
            curl -f http://localhost:3100/health || exit 1
            curl -f http://localhost:3400/health || exit 1
            
            echo "デプロイ完了"
```

### 2.3. 移行計画

#### 2.3.1. フェーズ1: 準備と検証

1. **Dockerfileの作成**:
   - 各サービス用のDockerfileを作成
   - ローカル環境でのビルドとテスト

2. **Docker Composeの設定**:
   - `docker-compose.yml`の更新
   - ローカル環境での統合テスト

3. **GitHub Actionsワークフローの作成**:
   - 新しいワークフローファイルの作成
   - テスト環境でのビルドとプッシュのテスト

#### 2.3.2. フェーズ2: 開発環境への適用

1. **開発サーバーの準備**:
   - Dockerとdocker-composeのインストール
   - 必要な設定ファイルの配置

2. **初回デプロイ**:
   - 手動でのDockerイメージのビルドとプッシュ
   - docker-composeによるサービスの起動

3. **CI/CDパイプラインの統合**:
   - GitHub Actionsワークフローの有効化
   - 自動デプロイのテスト

#### 2.3.3. フェーズ3: 本番環境への展開

1. **本番サーバーの準備**:
   - Dockerとdocker-composeのインストール
   - 本番用設定ファイルの準備

2. **段階的なサービス移行**:
   - 一つずつサービスをDockerベースに移行
   - 各段階での動作確認

3. **完全移行**:
   - すべてのサービスをDockerベースに移行
   - 古い実行環境の廃止

## 3. メリットとデメリット

### 3.1. メリット

1. **環境の一貫性**:
   - 開発、テスト、本番で同一の実行環境
   - 「自分の環境では動く」問題の解消

2. **バージョン管理の明確化**:
   - 各サービスの依存関係とバージョン要件の明示的な定義
   - 互換性の問題を事前に検出可能

3. **デプロイの信頼性向上**:
   - ビルド済みイメージを使用することによる一貫性の確保
   - ロールバックの容易化

4. **スケーラビリティの向上**:
   - 水平スケーリングの容易化
   - クラウドネイティブな環境への対応

### 3.2. デメリット

1. **学習コスト**:
   - チームメンバーのDockerに関する知識習得が必要
   - 初期設定の複雑さ

2. **リソース使用量**:
   - Dockerオーバーヘッドによるリソース消費の増加
   - イメージストレージの必要性

3. **デバッグの複雑化**:
   - コンテナ内の問題のデバッグが複雑になる可能性
   - ログ管理の追加設定が必要

## 4. 導入コストと期待される効果

### 4.1. 導入コスト

1. **開発工数**:
   - Dockerfile作成: 2人日
   - Docker Compose設定: 1人日
   - CI/CD更新: 2人日
   - テストと調整: 3人日
   - 合計: 約8人日

2. **インフラ要件**:
   - Dockerレジストリの準備
   - サーバーのディスク容量増加（イメージ保存用）

3. **教育コスト**:
   - チームへのDockerトレーニング: 1日
   - ドキュメント作成: 2人日

### 4.2. 期待される効果

1. **開発効率の向上**:
   - 環境セットアップ時間の短縮: 90%減
   - デプロイエラーの削減: 80%減

2. **運用コストの削減**:
   - トラブルシューティング時間の短縮: 50%減
   - 環境管理の工数削減: 70%減

3. **品質向上**:
   - 環境依存のバグ削減: 90%減
   - リリース成功率の向上: 95%以上

## 5. 結論と次のステップ

Dockerベースのデプロイフローへの移行は、初期投資は必要ですが、中長期的には開発効率の向上、運用コストの削減、品質向上につながると考えられます。特に、現在発生している環境依存の問題を根本的に解決する効果が期待できます。

### 5.1. 推奨アクション

1. **パイロットプロジェクト**:
   - hotel-saasをDockerベースに移行するパイロットプロジェクトを実施
   - 効果と課題を評価

2. **段階的な展開**:
   - 成功を確認後、他のサービスも段階的に移行
   - 各段階での検証と改善

3. **チーム教育**:
   - Docker基礎トレーニングの実施
   - 新しいデプロイフローのドキュメント作成と共有

### 5.2. タイムライン

1. **フェーズ1（準備と検証）**: 2週間
2. **フェーズ2（開発環境への適用）**: 1週間
3. **フェーズ3（本番環境への展開）**: 2週間
4. **合計**: 約1ヶ月

この提案が承認された場合、詳細な実装計画と移行スケジュールを作成します。
