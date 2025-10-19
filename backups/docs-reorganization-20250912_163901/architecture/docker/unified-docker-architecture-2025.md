# 🐳 統合Docker化アーキテクチャ 2025

**日付**: 2025年1月18日  
**作成者**: Iza（統合管理者）  
**バージョン**: 2.0  
**対象システム**: hotel-saas, hotel-pms, hotel-member, hotel-common  

## 📋 概要

UNIFY-DEVプロジェクトの一環として、4システム完全Docker統合を実現。開発環境の一貫性確保とオフライン対応を含む統一運用を目指します。

## 🏗️ 新システム構造

### コンテナ構成図
```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐ │
│  │ hotel-saas  │ │ hotel-pms   │ │hotel-member │ │ hotel-  │ │
│  │   :3100     │ │ :3300/:3301 │ │:3200/:8080  │ │ common  │ │
│  │ AIコンシェルジュ│ │フロント業務  │ │ 会員管理    │ │ :3400   │ │
│  │             │ │             │ │             │ │共通基盤  │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │PostgreSQL   │ │   Redis     │ │  RabbitMQ   │             │
│  │   :5432     │ │   :6379     │ │:5672/:15672 │             │
│  │統一データベース│ │ キャッシュ   │ │メッセージング│             │
│  └─────────────┘ └─────────────┘ └─────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### システム間連携
```
┌─────────────────────────────────────────────────────────────┐
│                     Event-Driven連携                       │
├─────────────────────────────────────────────────────────────┤
│  hotel-saas ──service.ordered──→ hotel-common ──→ hotel-pms │
│      ↑                              ↓              ↓       │
│  AI応答生成 ←──customer.updated──── hotel-member ←─予約情報   │
│      ↓                              ↑              ↓       │
│  注文履歴 ──→ hotel-common ──point.earned──→ 会員ポイント    │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 各システム詳細

### hotel-saas（Sun担当）
```yaml
# AIコンシェルジュシステム
Container: hotel-saas
Ports: 3100
Technology: Nuxt 3 + Vue 3
Responsibilities:
  - 顧客向けAIコンシェルジュ
  - サービス注文管理
  - PWA + オフライン対応
  - 顧客体験最適化
```

### hotel-pms（Luna担当）
```yaml
# フロント業務システム
Container: hotel-pms
Ports: 3300 (Browser), 3301 (Electron)
Technology: 未確定（要調査）
Responsibilities:
  - 予約管理（全チャネル統合）
  - チェックイン/アウト業務
  - 部屋在庫管理
  - フロント業務効率化
  - オフライン業務継続（最重要）
```

### hotel-member（Suno担当）
```yaml
# 会員管理システム
Container: hotel-member
Ports: 3200 (API), 8080 (UI)
Technology: 未確定（要調査）
Responsibilities:
  - 顧客マスタ管理（正本保持）
  - 会員ランク・ポイント管理
  - プライバシー保護
  - CRM基盤
```

### hotel-common（Iza担当）
```yaml
# 共通基盤システム
Container: hotel-common
Ports: 3400
Technology: NestJS + TypeScript
Responsibilities:
  - 統一JWT認証基盤
  - Event-driven連携管理
  - 共通API提供
  - システム間同期制御
```

## 💾 統一データベース設計

### PostgreSQL統一DB
```sql
-- 統一データベース: hotel_unified_db
-- 接続情報: postgresql://hotel_app:password@db:5432/hotel_unified_db

-- 各システムのテーブル構成
┌─────────────────────────────────────────┐
│           hotel_unified_db              │
├─────────────────────────────────────────┤
│ saas_*     │ AIコンシェルジュ関連        │
│ pms_*      │ フロント業務関連           │
│ member_*   │ 会員管理関連              │
│ common_*   │ 共通機能関連              │
│ events_*   │ イベント管理関連           │
└─────────────────────────────────────────┘
```

## 🌐 オフライン対応設計

### 各システムのオフライン戦略

#### hotel-pms（最重要）
```typescript
// フロント業務の完全継続
┌─────────────────────────────────────┐
│        Offline-First Design        │
├─────────────────────────────────────┤
│ ✅ 予約作成・変更                    │
│ ✅ チェックイン/アウト               │
│ ✅ 部屋状況管理                     │
│ ✅ 顧客情報参照                     │
│ 📦 IndexedDB永続化                  │
│ 🔄 オンライン復帰時自動同期          │
└─────────────────────────────────────┘
```

#### hotel-saas（PWA対応）
```typescript
// サービス注文の継続
┌─────────────────────────────────────┐
│         PWA + ServiceWorker         │
├─────────────────────────────────────┤
│ ✅ サービス注文（ローカル保存）       │
│ ✅ メニュー表示（キャッシュ）         │
│ ✅ AI基本応答（ローカルデータ）       │
│ 📦 バックグラウンド同期             │
│ 🔄 注文データ自動送信               │
└─────────────────────────────────────┘
```

#### hotel-member（参照系メイン）
```typescript
// 会員情報の参照継続
┌─────────────────────────────────────┐
│        Read-Heavy Offline           │
├─────────────────────────────────────┤
│ ✅ 会員情報表示                     │
│ ✅ ポイント残高参照                 │
│ ✅ 利用履歴表示                     │
│ ❌ 新規登録（オンライン必須）        │
│ ⚠️  ポイント利用（制限あり）         │
└─────────────────────────────────────┘
```

## 🔧 開発環境構築

### Docker Compose起動
```bash
# プロジェクトルート（hotel-kanri）で実行
cd /Users/kaneko/hotel-kanri

# 全システム起動
docker compose -f docker-compose.unified.yml up -d

# 個別システム起動
docker compose -f docker-compose.unified.yml up -d saas
docker compose -f docker-compose.unified.yml up -d pms
docker compose -f docker-compose.unified.yml up -d member
docker compose -f docker-compose.unified.yml up -d common

# ログ確認
docker compose -f docker-compose.unified.yml logs -f [service_name]

# 停止
docker compose -f docker-compose.unified.yml down
```

### 開発ワークフロー
```bash
# 1. ファイル編集（実プロジェクトディレクトリ）
../hotel-saas/     # ← 実ファイル編集
../hotel-pms/      # ← 実ファイル編集  
../hotel-member/   # ← 実ファイル編集
../hotel-common/   # ← 実ファイル編集

# 2. 自動反映（Docker Volume Mount）
# ファイル変更 → 即座にコンテナに反映

# 3. ホットリロード
# 各システムで npm run dev が動作中
# ファイル変更 → 自動ビルド → ブラウザ更新
```

## 🚢 本番デプロイ（Dokku）

### Dokku統一デプロイ
```bash
# 各システム個別デプロイ
git subtree push --prefix=../hotel-saas dokku-saas main
git subtree push --prefix=../hotel-pms dokku-pms main
git subtree push --prefix=../hotel-member dokku-member main
git subtree push --prefix=../hotel-common dokku-common main

# または統合デプロイ（将来対応）
git push dokku-unified main
```

## 📊 システム監視

### ヘルスチェック
```yaml
# 各コンテナのヘルスチェック
saas:    GET /healthz
pms:     GET /health  
member:  GET /api/health
common:  GET /health

# システム間連携チェック
Event-Bus: RabbitMQ Management UI (:15672)
Database:  PostgreSQL接続確認
Cache:     Redis接続確認
```

## 🔄 マイグレーション計画

### Phase 1: 基盤整備（完了）
- ✅ hotel-saas Docker化
- ✅ hotel-common Docker化
- ✅ 統一PostgreSQL
- ✅ Docker Compose基盤

### Phase 2: 残りシステム統合（進行中）
- 🔄 hotel-pms Docker化
- 🔄 hotel-member Docker化
- 🔄 統合docker-compose.yml
- 🔄 オフライン対応実装

### Phase 3: 運用最適化（予定）
- 📋 G2/G3手順統一
- 📋 Dokku統合デプロイ
- 📋 監視・ログ統合
- 📋 パフォーマンス最適化

## 🎯 各システム担当者への指示

### ☀️ Sun（hotel-saas担当）
```markdown
✅ Docker化完了
📋 TODO:
- PWAオフライン機能の強化
- ServiceWorker最適化
- 注文同期ロジック改善
```

### 🌙 Luna（hotel-pms担当）
```markdown
🔄 Docker化実装中
📋 TODO:
- Dockerfile作成
- オフライン業務継続機能実装
- 予約同期ロジック設計
- Electron版対応
```

### ⚡ Suno（hotel-member担当）
```markdown
🔄 Docker化実装中  
📋 TODO:
- Dockerfile作成
- 会員データキャッシュ戦略
- プライバシー保護強化
- API/UI分離対応
```

### 🌊 Iza（統合管理者）
```markdown
🔄 統合管理継続
📋 TODO:
- 統合docker-compose.yml完成
- Event-driven連携監視
- システム間認証統一
- 全体パフォーマンス最適化
```

## 📚 関連ドキュメント

- [UNIFY-DEV統合計画](../unify-dev/overview.md)
- [Event-Driven連携仕様](../events/event-architecture.md)
- [オフライン対応設計](../offline/offline-strategy.md)
- [Dokku統合デプロイ](../deployment/dokku-unified-deploy.md)

---

**🚨 重要**: この新構造は2025年1月18日より有効です。古いPM2ベース構造は段階的に廃止予定です。
