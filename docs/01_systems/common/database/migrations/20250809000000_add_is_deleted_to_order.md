# Order テーブルへの isDeleted カラム追加

## 概要

この変更では、`Order`テーブルに`isDeleted`カラムを追加し、ソフトデリート機能を実装します。また、パフォーマンス向上のために`isDeleted`と`paidAt`の複合インデックスも作成します。

## 変更内容

1. `Order`テーブルに`isDeleted`カラム（BOOLEAN型、デフォルト値: false）を追加
2. `isDeleted`と`paidAt`の複合インデックスを作成
3. 変更履歴を`DatabaseChangeLog`テーブルに記録

## 理由

現在のAPI実装は複数箇所でisDeletedを前提（ソフトデリート設計）にしていますが、Orderテーブルにはこのカラムが存在しませんでした。そのため、count/aggregate系のAPIで例外が発生し、サーバーダウンの原因となっていました。

## 互換性と影響

- **後方互換性**: 保持されます（デフォルト値がfalseのため）
- **既存データへの影響**: なし
- **パフォーマンス**: `isDeleted`+`paidAt`の複合インデックスにより、月次集計クエリのパフォーマンスが向上します

## 検証観点

- `/api/v1/admin/orders/monthly-count.get.ts`が500エラーなしで動作すること
- ダッシュボードの集計系APIが正常に動作すること
- 既存の削除系API（ソフトデリート前提）が正常に動作すること

## マイグレーションSQL

```sql
-- AlterTable: Add isDeleted column to Order table
ALTER TABLE "Order" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Create index on isDeleted and paidAt columns for better performance
CREATE INDEX "Order_isDeleted_paidAt_idx" ON "Order"("isDeleted", "paidAt");

-- Insert record into DatabaseChangeLog
INSERT INTO "DatabaseChangeLog" ("changeType", "description", "details", "createdBy")
VALUES ('SCHEMA_CHANGE', 'Added isDeleted column to Order table', '{"table": "Order", "columns": ["isDeleted"], "indexes": ["Order_isDeleted_paidAt_idx"]}', 'system');
```

## 関連するコード変更

- Prismaスキーマの`Order`モデルに`isDeleted`フィールドと`@@index([isDeleted, paidAt])`を追加
- 月次集計クエリの`where`句に`isDeleted: false`条件を追加（既存コードは既にこの条件を前提としています）
