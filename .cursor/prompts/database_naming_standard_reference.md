# データベース命名規則標準 - クイックリファレンス

このドキュメントはSSOT作成時・テーブル作成時の必須参照資料です。

---

## 📋 必須ドキュメント

**正式版**: `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md` v3.0.0

---

## ✅ 新規テーブル作成標準（必須遵守）

### PostgreSQL DDL

```sql
CREATE TABLE {table_name} (  -- ← snake_case
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,           -- ← snake_case
  {field_name}    {TYPE},                  -- ← snake_case
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  deleted_at      TIMESTAMP,
  is_deleted      BOOLEAN DEFAULT false
);

CREATE INDEX idx_{table}_tenant_id ON {table_name}(tenant_id);
```

### Prismaモデル

```prisma
model {ModelName} {  // ← PascalCase
  id          String    @id @default(uuid())
  tenantId    String    @map("tenant_id")      // ← camelCase + @map必須
  {fieldName} {Type}    @map("{field_name}")   // ← camelCase + @map必須
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")
  isDeleted   Boolean   @default(false) @map("is_deleted")
  
  @@map("{table_name}")  // ← snake_case必須
  @@index([tenantId])
}
```

---

## ⚠️ 既存テーブル（現状維持）

```
✅ そのまま維持
❌ 強制的な統一は行わない
📝 SSOTドキュメントに「レガシー」と明記
```

既存テーブルの例:
- `orders`: camelCaseカラム（tenantId, createdAt）
- `staff`: snake_caseカラム（tenant_id, created_at）
- `pages`: PascalCaseカラム（TenantId, CreatedAt）

---

## 🔍 チェックリスト

### SSOT作成時

- [ ] 新規テーブルが含まれるか？
- [ ] テーブル名はsnake_caseか？
- [ ] カラム名はすべてsnake_caseか？
- [ ] Prismaモデル名はPascalCaseか？
- [ ] Prismaフィールド名はcamelCaseか？
- [ ] すべてのフィールドに`@map`があるか？
- [ ] `@@map`でテーブル名をマッピングしているか？
- [ ] `tenant_id`カラムは含まれているか？
- [ ] `created_at`, `updated_at`は含まれているか？

### 既存テーブル参照時

- [ ] 現在の命名規則をそのまま使用しているか？
- [ ] 「レガシーテーブル」と明記したか？
- [ ] 既存のPrismaモデル定義を参照したか？

---

## 🚨 よくある間違い

### ❌ 間違い1: @mapディレクティブ忘れ

```prisma
model UserPreference {
  tenantId String  // ← DBではtenantIdカラムになってしまう
  @@map("user_preferences")
}
```

### ✅ 正しい

```prisma
model UserPreference {
  tenantId String @map("tenant_id")  // ← DBではtenant_idカラム
  @@map("user_preferences")
}
```

### ❌ 間違い2: テーブル名マッピング忘れ

```prisma
model UserPreference {
  tenantId String @map("tenant_id")
  // @@map忘れ → テーブル名がUserPreferenceになってしまう
}
```

### ✅ 正しい

```prisma
model UserPreference {
  tenantId String @map("tenant_id")
  @@map("user_preferences")  // ← 必須
}
```

---

## 📞 質問がある場合

詳細版を参照: `/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md`

---

**🔖 このドキュメントは SSOT 作成時・テーブル作成時の必須参照資料です。**

