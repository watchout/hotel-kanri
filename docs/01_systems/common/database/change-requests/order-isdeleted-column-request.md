# データベース変更依頼: Order テーブルへの isDeleted カラム追加

## 依頼内容

### 変更概要
- **対象テーブル**: `Order`
- **追加カラム**: `isDeleted BOOLEAN NOT NULL DEFAULT false`
- **追加インデックス**: `(isDeleted, paidAt)`
- **目的**: 既存APIのwhere句で参照しているisDeletedに整合させ、例外終了を防止

### 背景
現在のAPI実装は複数箇所でisDeletedを前提（ソフトデリート設計）にしていますが、`Order`テーブルにはこのカラムが存在しません。そのため、count/aggregate系のAPIで例外が発生し、サーバーダウンの原因となっています。

### 互換性/影響
- **後方互換性**: 保持されます（デフォルト値がfalseのため）
- **既存データへの影響**: なし
- **パフォーマンス**: `isDeleted`+`paidAt`の複合インデックスにより、月次集計クエリのパフォーマンスが向上します

### 検証観点
- `/api/v1/admin/orders/monthly-count.get.ts`が500エラーなしで動作すること
- ダッシュボードの集計系APIが500エラーなしで動作すること
- 既存の削除系API（ソフトデリート前提）が正常動作すること

## 実装詳細

### マイグレーションSQL
```sql
-- AlterTable: Add isDeleted column to Order table
ALTER TABLE "Order" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Create index on isDeleted and paidAt columns for better performance
CREATE INDEX "Order_isDeleted_paidAt_idx" ON "Order"("isDeleted", "paidAt");
```

### Prismaスキーマ変更
```prisma
model Order {
  // 既存フィールド...
  isDeleted        Boolean            @default(false)
  deletedAt        DateTime?
  // 既存リレーション...

  // 既存インデックス...
  @@index([isDeleted, paidAt])
}
```

## 代替案

データベース変更が難しい場合は、以下の代替案も検討可能ですが、推奨しません：

1. コード側で`Order`への`isDeleted`参照を外す（精度低下リスクあり）
2. 他のAPIも同様の修正が必要になる可能性が高く、技術的負債が増加

## 優先度と期限

- **優先度**: 高（本番環境で500エラーが発生中）
- **希望期限**: できるだけ早急に（今週中）

## 担当者

- **依頼者**: [担当者名]
- **承認者**: [承認者名]
- **実装者**: [実装者名]
