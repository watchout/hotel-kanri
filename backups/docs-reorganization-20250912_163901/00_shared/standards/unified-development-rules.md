# 統一開発ルール

## 概要
本ドキュメントは、omotenasuai.comプロジェクト全体で適用される統一開発ルールを定義します。
各システム（hotel-saas、hotel-pms、hotel-member、hotel-common）共通の基準として運用されます。

## 🗂️ データベース統一方針

### 本番・ステージング環境
- **統一DB**: PostgreSQL
- **マルチテナント対応**: 全テーブルにtenant_id必須
- **ORM**: Prisma統一（各システム共通）

### ローカル開発環境
- **システム固有DB**: 各システムの要件に応じて最適化
  - hotel-saas: SQLite（開発効率重視）
  - hotel-member: PostgreSQL（本番環境と同一）
  - hotel-pms: PostgreSQL（本番環境と同一）
  - hotel-common: PostgreSQL（統合基盤）

### データベース安全性ルール
```bash
# 🚫 絶対禁止操作
npx prisma migrate reset
npx prisma db push --force-reset
DROP DATABASE *;
TRUNCATE TABLE *;
DELETE FROM * WHERE 1=1;

# ✅ 推奨安全操作
pnpm db:backup
pnpm db:status
pnpm db:safe-generate
pnpm db:safe-push
```

## 🔐 認証統一基盤

### 統一方針
- **基盤**: hotel-common統一JWT認証基盤
- **実装**: 各システムは共通認証ライブラリを使用
- **独自実装禁止**: システム別認証システムの新規作成禁止

### 実装パターン
```typescript
// ✅ 統一認証パターン
import { useAuth } from '@hotel-common/auth'

const { user, login, logout, isAuthenticated } = useAuth()

// ❌ 独自認証実装禁止
// 各システムでの独自JWT実装は禁止
```

## 🤖 AIエージェント統一ルール

### エージェント特性定義
```yaml
Sun (天照大神) - hotel-saas:
  personality: "明るく温かい・希望与える・親しみやすい"
  specialization: "顧客サービス・UI/UX・アクセシビリティ"

Luna (月読命) - hotel-pms:
  personality: "冷静沈着・確実遂行・効率重視"
  specialization: "運用・予約管理・24時間業務"

Suno (須佐之男) - hotel-member:
  personality: "力強い・顧客守護・正義感・信頼性"
  specialization: "顧客管理・プライバシー保護・セキュリティ"

Iza (伊邪那岐) - hotel-common:
  personality: "冷静分析・客観的評価・技術的厳密性"
  specialization: "統合基盤・システム間連携・アーキテクチャ"
```

### CO-STARフレームワーク統一適用
```yaml
Context: 各システムの専門領域
Objective: システム品質向上・統合性確保
Style: エージェント特性に応じた対応
Tone: プロフェッショナル・確実・責任感
Audience: 開発者・アーキテクト・プロジェクト管理者
Response: 具体的実装例・技術仕様・ガイドライン
```

## 🛠️ 技術スタック方針

### 共通基盤
- **フロントエンド**: Nuxt 3 + Vue 3 + TypeScript
- **スタイル**: Tailwind CSS
- **状態管理**: Pinia
- **アイコン**: Heroicons統一（`heroicons:`プレフィックス必須）

### システム別最適化
```yaml
hotel-saas:
  backend: "Nuxt 3 Server API"
  database: "SQLite (dev) / PostgreSQL (prod)"
  
hotel-member:
  backend: "FastAPI + Python"
  database: "PostgreSQL"
  additional: "SQLAlchemy + Prisma"
  
hotel-pms:
  backend: "Nuxt 3 Server API"
  database: "PostgreSQL"
  
hotel-common:
  backend: "統合API基盤"
  database: "PostgreSQL"
  role: "共通ライブラリ・認証・イベント基盤"
```

## 🔄 イベント連携（現状準拠）

### 基本方針
- **現状の実装を尊重**: 既存のイベント連携パターンを維持
- **段階的統一**: 新機能開発時に統一パターンを適用
- **後方互換性**: 既存システムへの影響を最小化

### イベント連携パターン
```typescript
// 現状のイベント発行パターンを維持
// hotel-member → hotel-pms
await eventPublisher.publish('customer.updated', {
  customerId,
  tenantId,
  updatedFields: ['name', 'phone'],
  timestamp: new Date()
});

// 新規開発時は統一パターンを適用
```

## 🚫 統一禁止事項

### データベース
- tenant_id無しでのデータアクセス
- 直接SQLクエリ（Prisma ORM必須）
- 本番環境での危険操作

### 認証
- 独自認証システムの実装
- JWT以外の認証方式の新規導入

### UI/UX
- Heroicons以外のアイコンライブラリ使用
- SVGアイコンの直接埋め込み
- プレフィックスなしのアイコン使用

### 開発プロセス
- ハルシネーション（事実でない情報の提供）
- 仕様外機能の独自実装
- セキュリティ対策の省略

## 📋 必須実行事項

### 開発前
```bash
# RAGシステム実行（必須）
npm run simple-rag

# 実用的ファイル検索
npm run practical

# ガードレール検証
npm run guardrails:validate
```

### 実装時
- バックアップ作成（データ変更前）
- 影響範囲確認
- テスト実行
- セキュリティチェック

### 実装後
- ドキュメント更新
- 統合テスト実行
- パフォーマンス確認

## 🔍 品質保証

### 必須テスト
- 単体テスト: 90%以上カバレッジ
- 統合テスト: システム間連携確認
- セキュリティテスト: 脆弱性スキャン
- E2Eテスト: ユーザーフロー確認

### コードレビュー
- セキュリティ観点
- パフォーマンス観点
- 統一ルール準拠確認
- ドキュメント整合性確認

---

**最終更新**: 2025-09-12
**適用範囲**: hotel-saas, hotel-pms, hotel-member, hotel-common
**承認者**: プロジェクトマネージャー
