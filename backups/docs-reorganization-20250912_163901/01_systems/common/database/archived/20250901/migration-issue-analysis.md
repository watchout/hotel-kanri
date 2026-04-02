# マイグレーション問題分析

**作成日**: 2025年8月18日  
**作成者**: システム管理者  
**ステータス**: 調査中

## 問題の概要

Prismaマイグレーションの実行時に以下のエラーが発生しています：

```
P3006: Migration ... failed to apply cleanly to the shadow database. 
Error code: P1014: The underlying table for model service_usage_statistics does not exist.
```

このエラーにより、新しいマイグレーションの適用が妨げられ、スキーマとデータベースの同期が取れていない状態が続いています。

## 原因分析

詳細な調査の結果、以下の問題が特定されました：

### 1. service_usage_statisticsテーブルの削除と再作成

- **マイグレーション20250731020156_add_tenant_service_management**:
  このマイグレーションで`service_usage_statistics`テーブルが**削除**されています。

- **マイグレーション20250731123000_add_tenant_service_management**:
  同日の後続マイグレーションで同じテーブルが**再作成**されています。

この削除と再作成のパターンにより、Prismaのシャドウデータベースとの間に不整合が生じている可能性があります。

### 2. Staffテーブルの不一致

- **マイグレーション20250728005730_add_staff_management_system**:
  このマイグレーションでは`Staff`テーブルが`password_hash`フィールドを含む形で作成されています。

- **現在のスキーマ**:
  `schema.prisma`ファイルの`Staff`モデルにも`password_hash`フィールドが含まれています。

- **実際のデータベース**:
  実際のデータベースの`staff`テーブルには`password_hash`フィールドが存在しない可能性があります。

### 3. 同名マイグレーションの存在

- 同じ日に2つの`add_tenant_service_management`マイグレーションが存在しています。
  - 20250731020156_add_tenant_service_management
  - 20250731123000_add_tenant_service_management

これは混乱の原因となり、マイグレーション履歴の追跡を困難にしています。

## 解決策の提案

### 短期的解決策

1. **シャドウデータベースのリセット**:
   ```
   npx prisma migrate reset --skip-seed
   ```
   これにより、シャドウデータベースが再構築され、不整合が解消される可能性があります。

2. **マイグレーションの統合**:
   問題のあるマイグレーションを1つの整合性のあるマイグレーションに統合します。

### 長期的解決策

1. **マイグレーション命名規則の改善**:
   - 日付_時間_簡潔な説明 の形式を厳格に守る
   - 同じ日に複数のマイグレーションを作成する場合は、説明部分を明確に区別する

2. **マイグレーションレビュープロセスの導入**:
   - マイグレーションファイルの作成前に設計レビューを実施
   - テーブルの削除と再作成を含むマイグレーションには特別な注意を払う

3. **CI/CDパイプラインでのマイグレーション検証**:
   - マイグレーションの適用をテストする自動化されたプロセスを導入
   - 問題のあるマイグレーションを早期に検出

## 次のステップ

1. シャドウデータベースをリセットし、マイグレーションの適用を試みる
2. 実際のデータベース構造とスキーマの完全な同期を確認
3. 今後のマイグレーション管理のためのガイドラインを作成

## 参考資料

- [Prisma Migration Troubleshooting](https://www.prisma.io/docs/guides/migrate/troubleshooting-prisma-migrate)
- [Shadow Database Explained](https://www.prisma.io/docs/concepts/components/prisma-migrate/shadow-database)
