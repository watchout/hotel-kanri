# データベースルール

**常時適用**: 一貫したDB設計を維持します。

## 命名規則

### テーブル名
- **snake_case** + 複数形
- 例: `users`, `order_items`, `tenant_settings`

### カラム名
- **snake_case**
- 例: `tenant_id`, `created_at`, `is_active`

### Prismaモデル
```prisma
model OrderItem {
  id        String   @id @default(uuid())
  orderId   String   @map("order_id")      // camelCase → snake_case
  tenantId  String   @map("tenant_id")
  itemName  String   @map("item_name")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("order_items")  // テーブル名
}
```

## 必須カラム

### 全テーブル共通
| カラム | 型 | 説明 |
|:-------|:---|:-----|
| id | UUID | 主キー |
| tenant_id | UUID | テナントID（必須） |
| created_at | TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | 更新日時 |

## マイグレーション規則

### ✅ 許可される操作
- 新規テーブル作成
- 新規カラム追加（NULLABLEまたはDEFAULT付き）
- インデックス追加

### ⚠️ 要承認の操作
- カラム削除
- カラム名変更
- 型変更
- NOT NULL追加

### ❌ 禁止操作
- 直接SQL実行（Prismaを使う）
- 本番DBへの直接変更

## Prismaコマンド

```bash
# スキーマ確認
npx prisma format

# マイグレーション作成
npx prisma migrate dev --name [名前]

# 状態確認
npx prisma migrate status

# リセット（開発のみ）
npx prisma migrate reset
```

## 参照SSOT

- SSOT_DATABASE_SCHEMA.md
- SSOT_DATABASE_MIGRATION_OPERATION.md
- DATABASE_NAMING_STANDARD.md
