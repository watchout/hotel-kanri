# Docker化デプロイガイド

**日付**: 2023年8月18日
**バージョン**: 1.0

このガイドでは、hotel-saasとhotel-commonをDocker化してデプロイする手順を説明します。

## 1. 準備作業

### 1.1. サーバー環境の確認

サーバー上のDocker環境を確認します。

```bash
./scripts/deploy/check-server-docker.sh
```

### 1.2. サーバー環境のセットアップ

Docker環境がまだ設定されていない場合は、以下のスクリプトを実行してセットアップします。

```bash
./scripts/deploy/setup-server-docker-noninteractive.sh
```

### 1.3. GitHubコンテナレジストリの認証設定

サーバー上でGitHubコンテナレジストリにアクセスするための認証情報を設定します。

```bash
./scripts/deploy/setup-github-auth.sh
```

プロンプトに従って、GitHubユーザー名とトークンを入力します。

## 2. Dockerイメージのビルドとプッシュ

### 2.1. Dockerfileの確認

hotel-saasとhotel-commonのDockerfileが存在することを確認します。

hotel-saas/Dockerfile:
```dockerfile
# Use a Node.js 20 base image for consistency with application requirements
FROM node:20-slim as base

# Stage 1: Dependencies
FROM base as dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Stage 2: Builder
FROM base as builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM base as production
WORKDIR /app
COPY --from=builder /app/.output/server ./server
COPY --from=builder /app/.output/public ./public
COPY package.json ./package.json
# Only install production dependencies
RUN npm install --production --omit=dev

# Expose the application port
EXPOSE 3100

# Start the application
CMD ["node", "server/index.mjs"]
```

hotel-common/Dockerfile:
```dockerfile
# Use a Node.js 20 base image for consistency with hotel-saas and application requirements
FROM node:20-slim as base

# Stage 1: Dependencies
FROM base as dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Stage 2: Builder
FROM base as builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM base as production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package.json ./package.json
# Only install production dependencies
RUN npm install --production --omit=dev

# Expose the application port
EXPOSE 3400

# Start the application
CMD ["node", "dist/main.js"]
```

### 2.2. Dockerイメージのビルドとプッシュ

以下のスクリプトを実行して、hotel-saasとhotel-commonのDockerイメージをビルドし、GitHubコンテナレジストリにプッシュします。

```bash
./scripts/deploy/build-push-docker-images.sh
```

プロンプトに従って、GitHubユーザー名とトークンを入力します。

## 3. サーバー上のDocker Compose設定

### 3.1. Docker Compose設定の更新

サーバー上のDocker Compose設定を更新します。

```bash
./scripts/deploy/update-server-docker-compose.sh
```

### 3.2. 手動デプロイの実行

サーバー上で手動デプロイを実行します。

```bash
./scripts/deploy/manual-docker-deploy.sh
```

## 4. デプロイ確認

### 4.1. サービスの稼働確認

サーバー上でDockerコンテナの稼働状況を確認します。

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "sudo docker ps"
```

### 4.2. ヘルスチェック

各サービスのヘルスチェックエンドポイントにアクセスして、正常に動作していることを確認します。

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "curl -f http://localhost:3100/health"
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "curl -f http://localhost:3400/health"
```

## 5. トラブルシューティング

### 5.1. コンテナログの確認

問題が発生した場合は、コンテナのログを確認します。

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "sudo docker logs hotel-saas"
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "sudo docker logs hotel-common"
```

### 5.2. ロールバック手順

問題が解決できない場合は、PM2環境にロールバックします。

```bash
./scripts/rollback/rollback-to-pm2.sh all
```

## 6. GitHub Actionsによる自動デプロイ

GitHub Actionsワークフローを使用して自動デプロイを行う場合は、以下の手順を実行します。

### 6.1. GitHub Actionsワークフローの確認

`.github/workflows/docker-deploy.yml`ファイルが存在することを確認します。

### 6.2. 手動トリガーによるデプロイ

GitHub Actionsワークフローを手動でトリガーします。

```bash
gh workflow run docker-deploy.yml --ref develop
```

または、GitHubのWebインターフェースからワークフローを手動でトリガーすることもできます。

## 7. 次のステップ

- Nginx設定のDocker対応
- モニタリング設定
- CI/CDパイプラインの完成
