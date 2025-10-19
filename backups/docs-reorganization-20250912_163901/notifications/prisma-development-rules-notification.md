# Prisma開発ルール導入通知

**日付**: 2025年8月20日  
**対象**: すべての開発チーム（Sun, Luna, Suno, Iza）  
**重要度**: 最高  
**発信者**: 統合管理チーム  

## 通知内容

本日より、すべてのシステム（hotel-saas, hotel-pms, hotel-member, hotel-common）において、**Prisma開発ルール**を導入・適用します。この新しいルールは、データベースの不整合によるエラーを防止し、より安定したコード開発を実現するためのものです。

## 背景と目的

現在、以下の問題が発生しています：

- Prismaスキーマと型定義の不一致によるランタイムエラー
- 直接PrismaClientを使用することによる一貫性のない実装
- データベースアクセスコードの重複と保守性の低下
- アダプターレイヤーの欠如によるテスト困難性

これらの問題により、データベース関連のエラーが増加し、開発効率の低下や運用上の問題が発生しています。本ルールの導入により、これらの問題を解決し、より高品質な開発を実現します。

## 主要なルール変更

1. **アダプターパターンの採用**：
   - 直接PrismaClientを使用せず、アダプターレイヤーを介してデータベースにアクセス
   - 各モデルに対応するアダプタークラスを作成

2. **命名規則の遵守**：
   - モデル: パスカルケース（例: `User`）
   - フィールド: キャメルケース（例: `firstName`）
   - リレーション: 一対一は単数形、一対多は複数形

3. **自動チェックの導入**：
   - Git pre-commitフックによるスキーマと型定義の整合性チェック
   - ESLintルールによる直接PrismaClient使用の検出
   - CI/CDパイプラインでの自動検証

4. **トランザクション管理の徹底**：
   - 複数のデータベース操作は必ずトランザクションで囲む

## 導入されるツール

1. **ドキュメント**：
   - `docs/db/prisma-development-rules.md` - 開発ルールの文書化
   - `docs/db/prisma-naming-conventions.md` - 命名規則の文書化
   - `docs/db/prisma-adapter-pattern-example.md` - 実装例

2. **自動チェックツール**：
   - `scripts/git-hooks/prisma-check` - コミット前にスキーマと型定義の整合性をチェック
   - `scripts/detect-prisma-adapter-mismatch.js` - アダプターレイヤーの不足を検出

3. **ESLintルール**：
   - `scripts/eslint-rules/prisma-adapter-rule.js` - 直接PrismaClientを使用せず、アダプターを使うよう強制

4. **npmスクリプト**：
   - `prisma:validate` - スキーマの検証
   - `prisma:check-adapter` - アダプターの不足を検出
   - `prisma:setup-hooks` - Git Hooksの設定
   - `lint:prisma` - Prismaアダプターパターンの使用を検証

## 各システムでの導入手順

各システム（hotel-saas, hotel-pms, hotel-member, hotel-common）で以下の手順を実行してください：

1. **ファイルのコピー**：
   ```bash
   # ドキュメントのコピー
   cp hotel-kanri/docs/db/prisma-development-rules.md docs/database/
   cp hotel-kanri/docs/db/prisma-naming-conventions.md docs/database/
   cp hotel-kanri/docs/db/prisma-adapter-pattern-example.md docs/database/
   
   # スクリプトのコピー
   mkdir -p scripts/git-hooks scripts/eslint-rules
   cp hotel-kanri/scripts/git-hooks/prisma-check scripts/git-hooks/
   cp hotel-kanri/scripts/detect-prisma-adapter-mismatch.js scripts/
   cp hotel-kanri/scripts/eslint-rules/prisma-adapter-rule.js scripts/eslint-rules/
   cp hotel-kanri/scripts/setup-git-hooks.sh scripts/
   cp hotel-kanri/scripts/update-package-json.js scripts/
   
   # CI/CD設定のコピー
   mkdir -p .github/workflows
   cp hotel-kanri/.github/workflows/prisma-validation.yml .github/workflows/
   ```

2. **npmスクリプトの追加**：
   ```bash
   # package.jsonにスクリプトを追加
   node scripts/update-package-json.js
   ```

3. **Git Hooksの設定**：
   ```bash
   # Git Hooksを設定
   npm run prisma:setup-hooks
   ```

4. **アダプターレイヤーの実装**：
   - `src/adapters` ディレクトリを作成
   - `src/adapters/prisma.adapter.ts` に基本アダプターを実装
   - 各モデルに対応するアダプタークラスを実装

5. **既存コードの修正**：
   - 直接PrismaClientを使用している箇所をアダプターに置き換え
   - `npm run lint:prisma` を実行して違反を検出

## 移行期間とサポート

- **移行期間**: 2週間（2025年9月3日まで）
- **サポート**: 移行期間中は統合管理チームがサポートを提供します

## 参考リソース

- [Prisma開発ルール](../db/prisma-development-rules.md)
- [Prisma命名規則](../db/prisma-naming-conventions.md)
- [アダプターパターン実装例](../db/prisma-adapter-pattern-example.md)
- [Prisma公式ドキュメント](https://www.prisma.io/docs/)

## 問い合わせ先

導入に関する質問や問題がある場合は、統合管理チーム（integration-team@example.com）までご連絡ください。



