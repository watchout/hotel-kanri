# 開発環境構築手順

## 1. システム要件

### 1.1 共通インフラ要件
- **PostgreSQL**: 14.0 以上（全システム共通）
- **Redis**: 6.0 以上（セッション・キャッシュ共有）
- **Git**: 2.30.0 以上

### 1.2 技術スタック選択方針
各システムは性質に応じて最適な技術スタックを選択可能：

- **hotel-saas**: Nuxt 3 + Vue 3 + TypeScript（既存維持）
- **hotel-member**: FastAPI + Python（高速API・データ処理向け）
- **hotel-pms**: Node.js/Nuxt 3 または FastAPI（要件次第）

### 1.3 統合のための共通仕様
- **API通信**: REST API (JSON)
- **認証**: JWT Bearer Token
- **データベース**: PostgreSQL（テナント分離）
- **リアルタイム通信**: WebSocket
- **キャッシュ**: Redis

### 1.4 推奨開発環境
- **OS**: macOS 12+ / Ubuntu 20.04+ / Windows 11
- **メモリ**: 16GB 以上
- **ストレージ**: 50GB 以上の空き容量
- **エディタ**: VS Code（推奨）

## 2. 初期セットアップ

### 2.1 リポジトリクローン
```bash
# 親ディレクトリに移動
cd /path/to/your/projects

# 各システムをクローン
git clone https://github.com/your-org/hotel-saas.git
git clone https://github.com/your-org/hotel-member.git
git clone https://github.com/your-org/hotel-pms.git
git clone https://github.com/your-org/hotel-integration.git

# ディレクトリ構成確認
ls -la
# hotel-saas/
# hotel-member/
# hotel-pms/
# hotel-integration/
```

### 2.2 データベースセットアップ
```bash
# PostgreSQL インストール（macOS）
brew install postgresql
brew services start postgresql

# PostgreSQL インストール（Ubuntu）
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# データベース作成
sudo -u postgres createdb hotel_unified_db
sudo -u postgres createuser hotel_app -P
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE hotel_unified_db TO hotel_app;"
```

### 2.3 Redis セットアップ
```bash
# Redis インストール（macOS）
brew install redis
brew services start redis

# Redis インストール（Ubuntu）
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Redis 動作確認
redis-cli ping
# PONG が返ってくれば成功
```

## 3. 各システムの環境構築

### 3.1 hotel-saas セットアップ
```bash
cd hotel-saas

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
```

`.env` ファイルの設定:
```env
# データベース設定
DATABASE_URL="postgresql://hotel_app:${DB_PASSWORD}@localhost:5432/hotel_unified_db"

# Redis設定
REDIS_URL="redis://localhost:6379"

# JWT設定
JWT_SECRET="your-super-secret-jwt-key-here"

# プラン設定
PLAN_TYPE=economy
MAX_DEVICES=30
ENABLE_AI_CONCIERGE=false
ENABLE_MULTILINGUAL=false
ENABLE_ADVANCED_ANALYTICS=false

# 開発設定
NODE_ENV=development
PORT=3100
```

```bash
# データベースマイグレーション
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

#### ポート固定設定とヘルスチェック
```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vite: { server: { strictPort: true } }
})
```
```bash
# ヘルスチェック
curl -s http://localhost:3100/health | cat
```

### 3.2 hotel-member セットアップ
```bash
cd /Users/kaneko/hotel-member

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
```

`.env` ファイルの設定:
```env
# データベース設定
DATABASE_URL="postgresql://hotel_app:${DB_PASSWORD}@localhost:5432/hotel_unified_db"

# Redis設定
REDIS_URL="redis://localhost:6379"

# JWT設定
JWT_SECRET="your-super-secret-jwt-key-here"

# システム設定
SYSTEM_NAME=member
PORT=3200

# 外部API設定
PAYMENT_API_KEY="your-payment-api-key"
EMAIL_SERVICE_KEY="your-email-service-key"
```

```bash
# データベースマイグレーション
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

### 3.3 hotel-pms セットアップ
```bash
cd /Users/kaneko/hotel-pms

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
```

`.env` ファイルの設定:
```env
# データベース設定
DATABASE_URL="postgresql://hotel_app:${DB_PASSWORD}@localhost:5432/hotel_unified_db"

# Redis設定
REDIS_URL="redis://localhost:6379"

# JWT設定
JWT_SECRET="your-super-secret-jwt-key-here"

# システム設定
SYSTEM_NAME=pms
PORT=3300

# 清掃管理設定
HOUSEKEEPING_SCHEDULE_ENABLED=true
MAINTENANCE_ALERTS_ENABLED=true
```

```bash
# データベースマイグレーション
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

## 4. 統合テスト環境

### 4.1 テストデータ作成
```bash
# 各システムでテストデータを作成
cd hotel-saas
npm run seed

cd /Users/kaneko/hotel-member
npm run seed

cd /Users/kaneko/hotel-pms
npm run seed
```

### 4.2 システム間連携テスト
```bash
# 統合テストスクリプト実行
cd hotel-integration
npm install
npm run test:integration
```

## 5. 開発ツール設定

### 5.1 VS Code 設定
`.vscode/settings.json`:
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.workingDirectories": [
    "hotel-saas",
    "hotel-member",
    "hotel-pms"
  ],
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

### 5.2 推奨拡張機能
- **Prettier**: コードフォーマッター
- **ESLint**: 静的解析
- **Prisma**: データベーススキーマ管理
- **Vue Language Features**: Vue.js サポート
- **TypeScript Importer**: 自動インポート

### 5.3 デバッグ設定
`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug hotel-saas",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/hotel-saas",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    },
    {
      "name": "Debug hotel-member",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/hotel-member",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    },
    {
      "name": "Debug hotel-pms",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/hotel-pms",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    }
  ]
}
```

## 6. 開発ワークフロー

### 6.1 ブランチ戦略
```bash
# 機能開発
git checkout -b feature/your-feature-name

# バグ修正
git checkout -b bugfix/your-bug-description

# ホットフィックス
git checkout -b hotfix/your-hotfix-description
```

### 6.2 コミット規約
```bash
# コミットメッセージ形式
git commit -m "feat(saas): 注文管理機能の追加"
git commit -m "fix(member): 会員登録時のバリデーション修正"
git commit -m "docs(integration): API連携仕様書の更新"

# プレフィックス
# feat: 新機能
# fix: バグ修正
# docs: ドキュメント
# style: スタイル修正
# refactor: リファクタリング
# test: テスト
# chore: その他
```

### 6.3 プルリクエスト
```bash
# プルリクエスト作成前のチェック
npm run lint
npm run test
npm run type-check

# プルリクエスト作成
git push origin feature/your-feature-name
# GitHub/GitLabでプルリクエスト作成
```

## 7. トラブルシューティング

### 7.1 よくある問題と解決方法

#### データベース接続エラー
```bash
# PostgreSQL が起動していない
brew services start postgresql  # macOS
sudo systemctl start postgresql  # Ubuntu

# 接続権限エラー
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE hotel_unified_db TO hotel_app;
```

#### Redis 接続エラー
```bash
# Redis が起動していない
brew services start redis  # macOS
sudo systemctl start redis-server  # Ubuntu

# Redis 設定確認
redis-cli config get bind
redis-cli config get port
```

#### ポート競合エラー
```bash
# ポート使用状況確認
lsof -i :3100  # hotel-saas
lsof -i :3200  # hotel-member
lsof -i :3300  # hotel-pms

# プロセス終了
kill -9 <PID>
```

#### Node.js バージョンエラー
```bash
# Node.js バージョン確認
node --version

# nvm でバージョン管理
nvm install 18
nvm use 18
```

### 7.2 ログ確認
```bash
# 各システムのログ確認
cd hotel-saas && npm run logs
cd hotel-member && npm run logs
cd hotel-pms && npm run logs

# データベースログ確認
sudo -u postgres tail -f /var/log/postgresql/postgresql-14-main.log

# Redis ログ確認
tail -f /var/log/redis/redis-server.log
```

## 8. パフォーマンス最適化

### 8.1 開発環境での最適化
```bash
# Node.js メモリ制限調整
export NODE_OPTIONS="--max-old-space-size=4096"

# TypeScript コンパイル高速化
# tsconfig.json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

### 8.2 データベース最適化
```sql
-- 開発環境用インデックス
CREATE INDEX CONCURRENTLY idx_orders_dev ON orders(tenant_id, created_at);
CREATE INDEX CONCURRENTLY idx_members_dev ON members(tenant_id, email);

-- 統計情報更新
ANALYZE;
```

## 9. セキュリティ設定

### 9.1 開発環境セキュリティ
```bash
# 環境変数ファイルの権限設定
chmod 600 .env

# Git に機密情報を含めない
echo ".env" >> .gitignore
echo "*.key" >> .gitignore
echo "*.pem" >> .gitignore
```

### 9.2 開発用認証情報
```env
# 開発用JWT秘密鍵（本番では必ず変更）
JWT_SECRET="dev-secret-key-change-in-production"

# 開発用データベース認証情報
DB_USER="hotel_dev_user"
DB_PASSWORD="dev_password_123"
```

## 10. 監視・メトリクス

### 10.1 開発環境監視
```bash
# システムリソース監視
htop
iostat -x 1

# Node.js プロセス監視
pm2 monit  # PM2使用時
```

### 10.2 ログ集約
```bash
# 統合ログ確認スクリプト
#!/bin/bash
tail -f hotel-saas/logs/app.log hotel-member/logs/app.log hotel-pms/logs/app.log
```

この手順に従って開発環境を構築し、統合システムの開発を開始してください。
