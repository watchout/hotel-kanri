# hotel-member ドキュメント参照ガイド

このREADMEは、hotel-member開発者が統合ドキュメントにアクセスするためのガイドです。

## 📚 統合ドキュメントへのアクセス

### システム仕様書
- [Member システム仕様](/Users/kaneko/hotel-kanri/docs/01_systems/member/)
- [API仕様書](/Users/kaneko/hotel-kanri/docs/01_systems/member/api/)
- [データベース設計](/Users/kaneko/hotel-kanri/docs/01_systems/member/database/)

### 開発ガイド
- [TypeScriptエラー防止ガイド](/Users/kaneko/hotel-kanri/docs/development/TYPESCRIPT_ERROR_PREVENTION_GUIDE.md)
- [統一Docker開発フロー](/Users/kaneko/hotel-kanri/docs/development/unified-docker-workflow.md)
- [多言語実装ガイド](/Users/kaneko/hotel-kanri/docs/01_systems/member/multilingual-implementation.md)

### 実装指示書
- [Phase1 システム設定基盤](/Users/kaneko/hotel-kanri/docs/implementation/PHASE1_SYSTEM_SETTINGS_IMPLEMENTATION_GUIDE.md)

### 統合・連携仕様
- [チェックインセッション会員統合仕様](/Users/kaneko/hotel-kanri/docs/systems/member/CHECKIN_SESSION_MEMBER_INTEGRATION_SPEC.md)
- [Suno緊急統合指示](/Users/kaneko/hotel-kanri/docs/01_systems/common/integration/guides/Suno_Emergency_Integration_Instructions.md)

### デプロイメント
- [統一Dockerデプロイガイド](/Users/kaneko/hotel-kanri/docs/deployment/unified-docker-deployment-guide.md)
- [Dokkuデプロイメント](/Users/kaneko/hotel-kanri/docs/deployment/dokku-dockerfile-deployment.md)

### アーキテクチャ
- [統一Dockerアーキテクチャ](/Users/kaneko/hotel-kanri/docs/architecture/docker/unified-docker-architecture-2025.md)
- [システム統合設計](/Users/kaneko/hotel-kanri/docs/architecture/system-integration.md)

## 🔧 開発環境セットアップ
```bash
# hotel-kanriディレクトリから
cd /Users/kaneko/hotel-member
npm install
npm run dev
```

## 📋 重要な開発ルール
1. **TypeScriptエラーゼロ必須**: 実装前に必ず`npm run type-check`でエラー解消
2. **統一Docker環境**: 全システム連携テストは統一環境で実行
3. **会員管理特化**: Suno（プライバシー強化）に特化した実装

---
**注意**: このREADMEのパスは全て絶対パスです。各担当者が確実にアクセスできるよう統一されています。
