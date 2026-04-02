# Prisma命名規則

## 基本原則

このプロジェクトでは、Prismaスキーマとデータベース設計において一貫した命名規則を採用します。これにより、コードの可読性が向上し、エラーを減らすことができます。

## テーブル命名規則

| 項目 | 規則 | 例 |
|------|------|------|
| テーブル名 | スネークケース、複数形 | `user_profiles`, `order_items` |
| モデル名 | PascalCase、単数形 | `UserProfile`, `OrderItem` |
| アダプターゲッター | キャメルケース、単数形 | `userProfile`, `orderItem` |

## フィールド命名規則

| 項目 | 規則 | 例 |
|------|------|------|
| プライマリキー | `id` | `id: String @id` |
| 外部キー | 参照先テーブル名の単数形 + `_id` | `tenant_id`, `user_id` |
| 日時フィールド | スネークケース | `created_at`, `updated_at` |
| 論理削除フラグ | `is_deleted` | `is_deleted: Boolean @default(false)` |
| 論理削除日時 | `deleted_at` | `deleted_at: DateTime?` |
| 論理削除者 | `deleted_by` | `deleted_by: String?` |

## リレーション命名規則

| 項目 | 規則 | 例 |
|------|------|------|
| 1対多リレーション | 参照先モデル名（PascalCase） | `User @relation(...)` |
| 多対多リレーション | 参照先モデル名の複数形（PascalCase） | `Categories @relation(...)` |

## インデックス命名規則

| 項目 | 規則 | 例 |
|------|------|------|
| 単一カラムインデックス | `@@index([column_name])` | `@@index([tenant_id])` |
| 複合インデックス | `@@index([column1, column2])` | `@@index([tenant_id, status])` |
| ユニークインデックス | `@@unique([column1, column2])` | `@@unique([tenant_id, email])` |

## 標準フィールドセット

すべてのテーブルに以下のフィールドを含めることを推奨します：

```prisma
// 標準フィールド
created_at  DateTime  @default(now())
updated_at  DateTime  @updatedAt

// 論理削除フィールド
is_deleted  Boolean   @default(false)
deleted_at  DateTime?
deleted_by  String?
```

## アダプターレイヤーの命名規則

PrismaAdapterクラスとTransactionAdapterクラスでは、以下の命名規則に従ってゲッターを定義します：

```typescript
// PrismaAdapterクラス内
get modelName() {
  return this.prisma.table_name;
}

// TransactionAdapterクラス内
get modelName() {
  return this.tx.table_name;
}
```

## スキーマ変更プロセス

1. スキーマファイル（`prisma/schema.prisma`）を編集
2. 命名規則に従っているか確認
3. マイグレーションを作成: `npx prisma migrate dev --name 変更内容の説明`
4. 型定義を更新: `npx prisma generate`
5. アダプターレイヤーを更新（新しいモデルの場合）

## 自動チェック

コミット前に以下のチェックが自動的に実行されます：

1. Prismaスキーマの変更がある場合、型定義が更新されているか
2. 新しいモデルが追加された場合、アダプターレイヤーが更新されているか
3. TypeScriptの型チェックでエラーがないか

## 注意事項

- スキーマの変更は必ずマイグレーションを通して行う
- 直接データベースを変更することは禁止
- フィールド名の一貫性を保つ（キャメルケースとスネークケースを混在させない）
- 必要なインデックスを適切に設定する

