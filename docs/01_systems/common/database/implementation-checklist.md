# データベース修正実装チェックリスト

**作成日**: 2025年8月18日  
**バージョン**: 1.0  
**ステータス**: 実装準備中

このチェックリストは、データベーススキーマとマイグレーションの問題を解決するための実装手順をまとめたものです。各ステップを順番に実行し、チェックマークを付けて進捗を管理してください。

## 前提条件

- [ ] データベースのバックアップを作成済み
- [ ] 現在のスキーマのバックアップを作成済み
- [ ] 実装計画を関係者と共有済み

## 1. マイグレーション問題の解決

### 1.1 競合するマイグレーションの統合

- [ ] `prisma/migrations`ディレクトリのバックアップを作成
  ```bash
  cp -r prisma/migrations prisma/migrations_backup_$(date +%Y%m%d)
  ```

- [ ] 競合するマイグレーションディレクトリの名前を変更
  ```bash
  mv prisma/migrations/20250731020156_add_tenant_service_management prisma/migrations/20250731020156_add_tenant_service_management_disabled
  mv prisma/migrations/20250731123000_add_tenant_service_management prisma/migrations/20250731123000_add_tenant_service_management_disabled
  ```

- [ ] 統合されたマイグレーションディレクトリを作成
  ```bash
  mkdir -p prisma/migrations/20250731999999_merged_tenant_service_management
  ```

- [ ] 統合されたマイグレーションファイルを作成
  ```bash
  cp prisma/merged_migration_preview.sql prisma/migrations/20250731999999_merged_tenant_service_management/migration.sql
  ```

### 1.2 シャドウデータベースのリセット

- [ ] シャドウデータベースをリセット
  ```bash
  npx prisma migrate reset --skip-seed
  ```

- [ ] Prismaクライアントを再生成
  ```bash
  npx prisma generate
  ```

## 2. スタッフテーブルの修正

### 2.1 スタッフテーブルの検証

- [ ] 現在のスタッフテーブル構造を確認
  ```bash
  npx prisma db pull --schema=prisma/temp/staff_check.prisma
  ```

- [ ] スタッフテーブルの不足フィールドを特定
  ```bash
  diff prisma/schema.prisma prisma/temp/staff_check.prisma | grep Staff -A 20
  ```

### 2.2 スタッフテーブルの更新

- [ ] 不足フィールドを追加するマイグレーションを作成
  ```bash
  npx prisma migrate dev --name add_missing_staff_fields
  ```

- [ ] マイグレーションファイルを確認
  ```bash
  cat prisma/migrations/$(ls -t prisma/migrations | head -1)/migration.sql
  ```

- [ ] マイグレーションを適用
  ```bash
  npx prisma migrate deploy
  ```

## 3. スキーマとデータベースの同期

### 3.1 スキーマの検証

- [ ] データベースからスキーマを生成
  ```bash
  npx prisma db pull --schema=prisma/schema.pulled.prisma
  ```

- [ ] 現在のスキーマと比較
  ```bash
  diff prisma/schema.prisma prisma/schema.pulled.prisma > prisma/schema.diff.txt
  ```

- [ ] 差分を確認
  ```bash
  cat prisma/schema.diff.txt
  ```

### 3.2 スキーマの更新

- [ ] 必要な変更を`schema.prisma`に適用
  - モデル名とテーブル名のマッピングを確認
  - フィールド型の不一致を修正
  - 不足しているインデックスを追加

- [ ] 更新されたスキーマを検証
  ```bash
  npx prisma validate
  ```

- [ ] 同期マイグレーションを作成
  ```bash
  npx prisma migrate dev --name sync_schema_with_database
  ```

## 4. テストと検証

### 4.1 基本的な検証

- [ ] Prismaクライアントでの基本的なクエリをテスト
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function test() { const staff = await prisma.staff.findMany(); console.log(staff.length); } test().catch(console.error).finally(() => prisma.$disconnect())"
  ```

- [ ] スタッフテーブルの構造を確認
  ```bash
  node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); async function test() { const info = await prisma.$queryRaw\`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'staff' ORDER BY ordinal_position\`; console.table(info); } test().catch(console.error).finally(() => prisma.$disconnect())"
  ```

### 4.2 アプリケーションテスト

- [ ] スタッフログイン機能をテスト
- [ ] JWT認証をテスト
- [ ] 権限チェックをテスト

## 5. ドキュメントとコミュニケーション

### 5.1 ドキュメント更新

- [ ] 実装結果を文書化
- [ ] 変更点の概要を作成
- [ ] 今後の推奨事項をまとめる

### 5.2 チーム共有

- [ ] 実装結果を関係者に共有
- [ ] 必要に応じてトレーニングを実施
- [ ] フィードバックを収集

## 6. モニタリングと改善

### 6.1 モニタリング設定

- [ ] データベースパフォーマンスモニタリングを設定
- [ ] エラーログのアラートを設定
- [ ] 定期的な健全性チェックを設定

### 6.2 継続的な改善

- [ ] 1週間後にフォローアップレビューを実施
- [ ] 必要に応じて追加の最適化を実施
- [ ] 学んだ教訓を文書化

---

## 実装メモ

実装中に気づいた点や重要な情報をここに記録してください：

1. 
2. 
3. 

## 承認

- 実装担当者: _________________ 日付: _________________
- レビュー担当者: _____________ 日付: _________________
- 承認者: _____________________ 日付: _________________
