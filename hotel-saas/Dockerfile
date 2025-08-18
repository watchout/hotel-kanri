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

# ヘルスチェックの設定
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/health || exit 1

# アプリケーションの起動
CMD ["node", ".output/server/index.mjs"]
