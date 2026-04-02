# 🔄 統合Docker開発ワークフロー

**日付**: 2025年1月18日  
**作成者**: Iza（統合管理者）  
**対象**: 全開発チーム  
**バージョン**: 2.0  

---

## 📋 概要

UNIFY-DEVプロジェクトによる4システム統合Docker環境での開発ワークフローを定義します。

---

## 🏗️ 開発環境構成

### ディレクトリ構造
```
/Users/kaneko/
├── hotel-kanri/                    # 統合管理リポジトリ
│   ├── docker-compose.unified.yml  # 統合Docker設定
│   ├── docs/                       # ドキュメント
│   └── scripts/                    # 管理スクリプト
├── hotel-saas/                     # AIコンシェルジュ（Sun担当）
├── hotel-pms/                      # フロント業務（Luna担当）
├── hotel-member/                   # 会員管理（Suno担当）
└── hotel-common/                   # 共通基盤（Iza担当）
```

### コンテナ構成
```
┌─────────────────────────────────────────────────────────────┐
│                Docker Compose Network                       │
├─────────────────────────────────────────────────────────────┤
│  hotel-saas:3100  hotel-pms:3300/3301  hotel-member:3200/8080  hotel-common:3400 │
│  ↕                ↕                    ↕                       ↕                │
│  PostgreSQL:5432  Redis:6379  RabbitMQ:5672/15672                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 日常開発フロー

### 1. 開発環境起動

#### 全システム起動
```bash
# プロジェクトルートに移動
cd /Users/kaneko/hotel-kanri

# 全サービス起動
docker compose -f docker-compose.unified.yml up -d

# 起動確認
docker compose -f docker-compose.unified.yml ps
```

#### 個別システム起動
```bash
# 特定システムのみ起動
docker compose -f docker-compose.unified.yml up -d saas    # Sun担当
docker compose -f docker-compose.unified.yml up -d pms     # Luna担当
docker compose -f docker-compose.unified.yml up -d member  # Suno担当
docker compose -f docker-compose.unified.yml up -d common  # Iza担当

# 依存サービス（DB、Redis等）は自動起動
```

### 2. 開発作業

#### ファイル編集
```bash
# 各システムの実ファイルを直接編集
code /Users/kaneko/hotel-saas/     # Sun: AIコンシェルジュ開発
code /Users/kaneko/hotel-pms/      # Luna: フロント業務開発
code /Users/kaneko/hotel-member/   # Suno: 会員管理開発
code /Users/kaneko/hotel-common/   # Iza: 共通基盤開発

# 自動反映: Docker Volume Mount
# ファイル変更 → 即座にコンテナに反映 → ホットリロード
```

#### ホットリロード確認
```bash
# 各システムでnpm run devが動作中
# ファイル保存 → 自動ビルド → ブラウザ更新

# ログでホットリロード確認
docker compose -f docker-compose.unified.yml logs -f saas
docker compose -f docker-compose.unified.yml logs -f pms
docker compose -f docker-compose.unified.yml logs -f member
docker compose -f docker-compose.unified.yml logs -f common
```

### 3. 動作確認

#### ヘルスチェック
```bash
# 各システムの動作確認
curl http://localhost:3100/healthz  # hotel-saas
curl http://localhost:3300/health   # hotel-pms
curl http://localhost:3200/health   # hotel-member API
curl http://localhost:8080/         # hotel-member UI
curl http://localhost:3400/health   # hotel-common
```

#### ブラウザアクセス
```bash
# 各システムのUI確認
open http://localhost:3100  # hotel-saas（AIコンシェルジュ）
open http://localhost:3300  # hotel-pms（フロント業務）
open http://localhost:8080  # hotel-member（会員管理UI）
```

### 4. データベース操作

#### 統一データベース接続
```bash
# PostgreSQL接続
docker compose -f docker-compose.unified.yml exec db psql -U hotel_app -d hotel_unified_db

# テーブル一覧確認
\dt

# 各システムのテーブル確認
\dt saas_*     # hotel-saas関連
\dt pms_*      # hotel-pms関連
\dt member_*   # hotel-member関連
\dt common_*   # hotel-common関連
```

#### Prismaマイグレーション
```bash
# 各システムでのマイグレーション
docker compose -f docker-compose.unified.yml exec saas npx prisma migrate dev
docker compose -f docker-compose.unified.yml exec pms npx prisma migrate dev
docker compose -f docker-compose.unified.yml exec member npx prisma migrate dev
docker compose -f docker-compose.unified.yml exec common npx prisma migrate dev

# Prismaクライアント再生成
docker compose -f docker-compose.unified.yml exec [service] npx prisma generate
```

---

## 🔧 システム別開発ガイド

### ☀️ Sun（hotel-saas）開発フロー

#### 開発環境
```bash
# hotel-saas専用起動
docker compose -f docker-compose.unified.yml up -d saas

# ログ確認
docker compose -f docker-compose.unified.yml logs -f saas

# コンテナ内作業
docker compose -f docker-compose.unified.yml exec saas sh
```

#### 主な開発タスク
```typescript
// PWAオフライン機能強化
// ServiceWorker最適化
// 注文同期ロジック改善
// AI応答精度向上
```

#### テスト実行
```bash
# ユニットテスト
docker compose -f docker-compose.unified.yml exec saas npm run test

# E2Eテスト
docker compose -f docker-compose.unified.yml exec saas npm run test:e2e
```

### 🌙 Luna（hotel-pms）開発フロー

#### 開発環境
```bash
# hotel-pms専用起動
docker compose -f docker-compose.unified.yml up -d pms

# ブラウザ版とElectron版の確認
curl http://localhost:3300  # ブラウザ版
curl http://localhost:3301  # Electron版
```

#### 主な開発タスク
```typescript
// オフライン業務継続機能実装
// 予約同期ロジック設計
// Electron版Docker対応
// フロント業務効率化
```

#### オフライン機能テスト
```bash
# ネットワーク切断シミュレーション
docker compose -f docker-compose.unified.yml exec pms sh -c "
  # オフライン状態での予約作成テスト
  curl -X POST http://localhost:3300/api/reservations \
    -H 'Content-Type: application/json' \
    -d '{\"roomId\":\"101\",\"guestName\":\"テスト太郎\"}'
"
```

### ⚡ Suno（hotel-member）開発フロー

#### 開発環境
```bash
# hotel-member専用起動
docker compose -f docker-compose.unified.yml up -d member

# API・UI両方の確認
curl http://localhost:3200/health  # API
open http://localhost:8080         # UI
```

#### 主な開発タスク
```typescript
// 会員データキャッシュ戦略設計
// プライバシー保護強化
// API/UI分離対応
// 顧客マスタ管理（正本保持）
```

#### データ整合性テスト
```bash
# 顧客マスタ整合性確認
docker compose -f docker-compose.unified.yml exec member npm run test:data-integrity
```

### 🌊 Iza（hotel-common）開発フロー

#### 開発環境
```bash
# hotel-common専用起動
docker compose -f docker-compose.unified.yml up -d common

# Event-driven連携確認
docker compose -f docker-compose.unified.yml logs -f rabbitmq
```

#### 主な開発タスク
```typescript
// Event-driven連携管理
// 統一JWT認証基盤
// システム間同期制御
// 共通API提供
```

#### システム間連携テスト
```bash
# イベント発行テスト
docker compose -f docker-compose.unified.yml exec common npm run test:events

# JWT認証テスト
docker compose -f docker-compose.unified.yml exec common npm run test:auth
```

---

## 🌐 オフライン開発・テスト

### オフライン状態シミュレーション

#### ネットワーク切断
```bash
# Docker内部ネットワークは維持、外部接続のみ切断
docker compose -f docker-compose.unified.yml exec saas sh -c "
  # 外部API呼び出しを無効化
  export OFFLINE_MODE=true
  npm run dev
"
```

#### オフライン機能テスト
```bash
# hotel-pms: 予約業務継続テスト
docker compose -f docker-compose.unified.yml exec pms npm run test:offline

# hotel-saas: サービス注文テスト
docker compose -f docker-compose.unified.yml exec saas npm run test:offline

# hotel-member: 会員情報参照テスト
docker compose -f docker-compose.unified.yml exec member npm run test:offline
```

---

## 🔄 Git ワークフロー

### ブランチ戦略
```bash
# 各システム独立開発
cd /Users/kaneko/hotel-saas && git checkout -b feature/pwa-enhancement
cd /Users/kaneko/hotel-pms && git checkout -b feature/offline-reservations
cd /Users/kaneko/hotel-member && git checkout -b feature/privacy-enhancement
cd /Users/kaneko/hotel-common && git checkout -b feature/event-optimization
```

### コミット・プッシュ
```bash
# 各システムで独立してコミット
cd /Users/kaneko/hotel-saas
git add .
git commit -m "feat: PWAオフライン機能強化"
git push origin feature/pwa-enhancement

# 統合テスト後にメインブランチにマージ
git checkout main
git merge feature/pwa-enhancement
git push origin main
```

### 統合テスト
```bash
# 全システム最新版での統合テスト
cd /Users/kaneko/hotel-kanri
docker compose -f docker-compose.unified.yml down
docker compose -f docker-compose.unified.yml up -d --build

# 統合テスト実行
./scripts/integration-test.sh
```

---

## 🐛 デバッグ・トラブルシューティング

### ログ確認
```bash
# リアルタイムログ監視
docker compose -f docker-compose.unified.yml logs -f

# 特定サービスのログ
docker compose -f docker-compose.unified.yml logs -f saas
docker compose -f docker-compose.unified.yml logs -f pms
docker compose -f docker-compose.unified.yml logs -f member
docker compose -f docker-compose.unified.yml logs -f common

# エラーログのみ抽出
docker compose -f docker-compose.unified.yml logs | grep -i error
```

### コンテナ内デバッグ
```bash
# コンテナ内でシェル実行
docker compose -f docker-compose.unified.yml exec saas sh
docker compose -f docker-compose.unified.yml exec pms sh
docker compose -f docker-compose.unified.yml exec member sh
docker compose -f docker-compose.unified.yml exec common sh

# Node.jsデバッグモード
docker compose -f docker-compose.unified.yml exec saas node --inspect=0.0.0.0:9229 .output/server/index.mjs
```

### パフォーマンス監視
```bash
# リソース使用状況
docker stats

# 特定コンテナの詳細情報
docker compose -f docker-compose.unified.yml exec saas top
docker compose -f docker-compose.unified.yml exec saas ps aux
```

---

## 🧪 テスト戦略

### テスト種別

#### 1. ユニットテスト
```bash
# 各システムで個別実行
docker compose -f docker-compose.unified.yml exec saas npm run test
docker compose -f docker-compose.unified.yml exec pms npm run test
docker compose -f docker-compose.unified.yml exec member npm run test
docker compose -f docker-compose.unified.yml exec common npm run test
```

#### 2. 統合テスト
```bash
# システム間連携テスト
./scripts/integration-test.sh

# Event-driven連携テスト
docker compose -f docker-compose.unified.yml exec common npm run test:integration
```

#### 3. E2Eテスト
```bash
# フルスタックテスト
docker compose -f docker-compose.unified.yml exec saas npm run test:e2e
```

#### 4. オフラインテスト
```bash
# オフライン機能テスト
./scripts/offline-test.sh
```

---

## 📊 品質管理

### コード品質チェック
```bash
# ESLint実行
docker compose -f docker-compose.unified.yml exec saas npm run lint
docker compose -f docker-compose.unified.yml exec pms npm run lint
docker compose -f docker-compose.unified.yml exec member npm run lint
docker compose -f docker-compose.unified.yml exec common npm run lint

# TypeScript型チェック
docker compose -f docker-compose.unified.yml exec saas npm run type-check
```

### セキュリティチェック
```bash
# 脆弱性スキャン
docker compose -f docker-compose.unified.yml exec saas npm audit
docker compose -f docker-compose.unified.yml exec pms npm audit
docker compose -f docker-compose.unified.yml exec member npm audit
docker compose -f docker-compose.unified.yml exec common npm audit
```

---

## 🔧 環境管理

### 環境変数管理
```bash
# 各システムの.env確認
cat /Users/kaneko/hotel-saas/.env
cat /Users/kaneko/hotel-pms/.env
cat /Users/kaneko/hotel-member/.env
cat /Users/kaneko/hotel-common/.env

# Docker Compose環境変数
docker compose -f docker-compose.unified.yml config
```

### 依存関係管理
```bash
# package.json更新後
docker compose -f docker-compose.unified.yml exec saas npm install
docker compose -f docker-compose.unified.yml restart saas

# 新しい依存関係追加
docker compose -f docker-compose.unified.yml exec saas npm install [package-name]
```

---

## 🚀 デプロイ準備

### プロダクションビルド
```bash
# 各システムのプロダクションビルド
docker compose -f docker-compose.unified.yml exec saas npm run build
docker compose -f docker-compose.unified.yml exec pms npm run build
docker compose -f docker-compose.unified.yml exec member npm run build
docker compose -f docker-compose.unified.yml exec common npm run build
```

### Dockerイメージ作成
```bash
# プロダクション用Dockerイメージビルド
docker compose -f docker-compose.unified.yml build --no-cache

# イメージサイズ確認
docker images | grep hotel-
```

---

## 📚 関連ドキュメント

- **📖 システム構造**: `docs/architecture/docker/unified-docker-architecture-2025.md`
- **🚀 デプロイガイド**: `docs/deployment/unified-docker-deployment-guide.md`
- **🌐 オフライン設計**: `docs/architecture/offline/offline-strategy.md`
- **📋 システム通知**: `docs/notifications/docker-unified-system-notification.md`

---

## 🤝 サポート

### 開発サポート
- **統合管理**: Iza（統合管理者）
- **技術サポート**: hotel-kanri開発チーム

### 質問・課題報告
1. Docker開発環境の問題
2. システム間連携の課題
3. オフライン機能の実装相談
4. パフォーマンス最適化

---

**🎯 このワークフローに従って、効率的で品質の高い統合Docker開発を実現してください。**

---

**Iza（統合管理者）**  
**2025年1月18日**
