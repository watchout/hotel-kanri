# Prisma開発ルール実装概要

**作成日**: 2025年8月20日  
**最終更新**: 2025年8月20日  
**ステータス**: 完了  
**適用範囲**: 全システム（hotel-saas, hotel-pms, hotel-member, hotel-common）  

## 1. 概要

データベースの不整合によるエラーを防止するため、Prisma開発ルールを実装しました。この文書では、実装した内容の概要と各システムへの適用方法について説明します。

## 2. 実装内容

### 2.1 ドキュメント

以下のドキュメントを作成しました：

- `docs/db/prisma-development-rules.md` - Prisma開発ルールの文書化
- `docs/db/prisma-naming-conventions.md` - Prisma命名規則の文書化
- `docs/db/prisma-adapter-pattern-example.md` - アダプターパターンの実装例
- `docs/notifications/prisma-development-rules-notification.md` - チーム全体への周知ドキュメント

### 2.2 自動チェックツール

以下の自動チェックツールを実装しました：

- `scripts/git-hooks/prisma-check` - コミット前にスキーマと型定義の整合性をチェックするGit Hook
- `scripts/detect-prisma-adapter-mismatch.js` - アダプターレイヤーの不足を検出するスクリプト
- `scripts/eslint-rules/prisma-adapter-rule.js` - 直接PrismaClientを使用せず、アダプターを使うよう強制するESLintルール

### 2.3 設定スクリプト

以下の設定スクリプトを実装しました：

- `scripts/setup-git-hooks.sh` - Git Hooksを設定するスクリプト
- `scripts/update-package-json.js` - package.jsonにPrisma関連のスクリプトを追加するスクリプト

### 2.4 CI/CD統合

以下のCI/CD設定を実装しました：

- `.github/workflows/prisma-validation.yml` - GitHub ActionsでのPrisma検証ワークフロー

## 3. 各システムへの適用方法

各システム（hotel-saas, hotel-pms, hotel-member, hotel-common）で以下の手順を実行してください：

### 3.1 ファイルのコピー

```bash
# ドキュメントのコピー
mkdir -p docs/database
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

### 3.2 npmスクリプトの追加

```bash
# package.jsonにスクリプトを追加
node scripts/update-package-json.js
```

### 3.3 Git Hooksの設定

```bash
# Git Hooksを設定
npm run prisma:setup-hooks
```

### 3.4 アダプターレイヤーの実装

1. `src/adapters` ディレクトリを作成
2. `src/adapters/prisma.adapter.ts` に基本アダプターを実装
3. 各モデルに対応するアダプタークラスを実装

### 3.5 既存コードの修正

1. 直接PrismaClientを使用している箇所をアダプターに置き換え
2. `npm run lint:prisma` を実行して違反を検出

## 4. 導入されるnpmスクリプト

以下のnpmスクリプトが追加されます：

- `prisma:validate` - Prismaスキーマを検証
- `prisma:format` - Prismaスキーマをフォーマット
- `prisma:generate` - Prismaクライアントを生成
- `prisma:check-adapter` - アダプターの不足を検出
- `prisma:setup-hooks` - Git Hooksを設定
- `lint:prisma` - Prismaアダプターパターンの使用を検証

## 5. 期待される効果

この実装により、以下の効果が期待されます：

1. **エラーの減少**: Prismaスキーマと型定義の不一致によるエラーを事前に検出
2. **コードの一貫性**: アダプターパターンによるデータベースアクセスの統一
3. **テスト容易性**: アダプターレイヤーをモック化することで単体テストが容易に
4. **保守性の向上**: データベースアクセスコードの重複を削減
5. **開発効率の向上**: 自動チェックによる問題の早期発見

## 6. 今後の展開

1. **チーム全体への周知**: 作成したドキュメントを共有し、開発ガイドラインとして確立
2. **コードレビューでの活用**: レビュー時にこれらのルールに基づいてコードをチェック
3. **継続的な改善**: 新たな問題が発生した場合、ルールを更新し、改善を続ける

## 7. 参考リソース

- [Prisma公式ドキュメント](https://www.prisma.io/docs/)
- [アダプターパターン - リファクタリングガーデン](https://refactoring.guru/design-patterns/adapter)
- [TypeScriptのデザインパターン](https://www.patterns.dev/typescript)



