# omotenasuai.com 統合ドキュメント

## 概要
本ディレクトリは、omotenasuai.comプロジェクト全体の統合ドキュメント管理システムです。
各システム（hotel-saas、hotel-pms、hotel-member、hotel-common）の散在していたドキュメントを一元化し、
統一された構造で管理します。

## 📁 ディレクトリ構造

### 00_shared/ - 共有ドキュメント
プロジェクト全体で共有されるアーキテクチャ、標準、インフラ、セキュリティ、運用に関するドキュメント

- **architecture/** - 全体アーキテクチャ、共通設計原則
- **standards/** - コーディング規約、ドキュメント規約、セキュリティ基準
- **infrastructure/** - 共通インフラ、ネットワーク、サーバー構成、ドメイン管理
- **security/** - 共通セキュリティポリシー、脆弱性管理
- **operations/** - 共通運用手順、監視、バックアップ、障害対応

### 01_systems/ - 各システム固有ドキュメント
各システム固有のアーキテクチャ、API、データベース、デプロイに関するドキュメント

- **common/** - hotel-common（統合基盤）
- **saas/** - hotel-saas（顧客サービス）
- **pms/** - hotel-pms（予約管理）
- **member/** - hotel-member（会員管理）

### 02_integration/ - システム連携ドキュメント
システム間連携に関するAPI、イベント、データフロー、ワークフローのドキュメント

- **apis/** - 共通API仕様、連携ガイド
- **events/** - イベント駆動アーキテクチャ、イベント定義
- **data-flow/** - データフロー図、データ連携仕様
- **workflows/** - 連携ワークフロー、シーケンス図

### 03_development/ - 開発プロセスドキュメント
開発プロセスに関するガイドライン、ワークフロー、ツール、テストのドキュメント

- **guidelines/** - 開発ガイドライン、ベストプラクティス
- **workflows/** - 開発ワークフロー、Gitフロー
- **tools/** - 開発ツール、IDE設定
- **testing/** - テスト戦略、テストケース

### 04_deployment/ - デプロイ・運用ドキュメント
デプロイ・運用に関する環境、CI/CD、監視、メンテナンスのドキュメント

- **environments/** - 環境定義、環境構築手順
- **ci-cd/** - CI/CDパイプライン、GitHub Actions
- **monitoring/** - 監視設定、アラート基準
- **maintenance/** - 定期メンテナンス、リリース手順

### 05_business/ - ビジネス要件・企画ドキュメント
ビジネス要件・企画に関する要件、仕様、ユーザー物語、ロードマップのドキュメント

- **requirements/** - 機能要件、非機能要件
- **specifications/** - 詳細仕様書
- **user-stories/** - ユーザー物語
- **roadmap/** - プロダクトロードマップ

## 🎯 統一方針

### データベース
- **本番・ステージング**: PostgreSQL統一
- **ローカル開発**: システム固有（hotel-saas: SQLite、他: PostgreSQL）
- **マルチテナント**: 全テーブルにtenant_id必須

### 認証
- **統一基盤**: hotel-common統一JWT認証基盤
- **独自実装禁止**: システム別認証システムの新規作成禁止

### AIエージェント
- **Sun (天照大神)** - hotel-saas: 明るく温かい・顧客サービス重視
- **Luna (月読命)** - hotel-pms: 冷静沈着・効率重視
- **Suno (須佐之男)** - hotel-member: 力強い・セキュリティ重視
- **Iza (伊邪那岐)** - hotel-common: 冷静分析・統合管理

### 技術スタック
- **共通**: Nuxt 3 + Vue 3 + TypeScript + Tailwind CSS + Heroicons
- **適材適所**: システム要件に応じた最適化（FastAPI等）

### イベント連携
- **現状準拠**: 既存のイベント連携パターンを維持
- **段階的統一**: 新機能開発時に統一パターンを適用

## 📋 重要ドキュメント

### 必読ドキュメント
1. [統一開発ルール](00_shared/standards/unified-development-rules.md)
2. [システム間API連携仕様](02_integration/apis/system-api-integration.md)
3. [イベント駆動アーキテクチャ](02_integration/events/event-driven-architecture.md)
4. [統一認証基盤](00_shared/architecture/unified-authentication-infrastructure-design.md)

### システム別ドキュメント
- **hotel-saas**: [プロジェクトルール](01_systems/saas/development/project-rules.md)
- **hotel-member**: [開発ルール](01_systems/member/.cursor/rules/rules.md)
- **hotel-pms**: [開発管理シート](01_systems/pms/temp-pms-docs/development-management-sheet.md)
- **hotel-common**: [AI統合管理ルール](00_shared/standards/ai-agent-rules.md)

## 🚫 禁止事項

### 全システム共通
- tenant_id無しでのデータアクセス
- 独自認証システムの実装
- Heroicons以外のアイコンライブラリ使用
- ハルシネーション（事実でない情報の提供）
- 仕様外機能の独自実装

### データベース操作
```bash
# 🚫 絶対禁止操作
npx prisma migrate reset
npx prisma db push --force-reset
DROP DATABASE *;
TRUNCATE TABLE *;
```

### 推奨操作
```bash
# ✅ 安全な操作
pnpm db:backup
pnpm db:status
pnpm db:safe-generate
npm run simple-rag  # RAGシステム実行
```

## 🔄 ドキュメント更新フロー

1. **変更前**: 影響範囲の確認
2. **変更中**: 関連ドキュメントの同期更新
3. **変更後**: レビュー・承認プロセス
4. **完了後**: 各システムへの通知

## 📞 問い合わせ・サポート

- **技術的質問**: 各システムの担当AIエージェント
- **ドキュメント更新**: プロジェクトマネージャー
- **緊急時対応**: 統合管理者（Iza）

---

**最終更新**: 2025-09-12
**管理者**: hotel-kanri統合管理システム
**バージョン**: v1.0.0
