# ドキュメント矛盾レポート：命名規則

**作成日**: 2025-10-03  
**重要度**: 🚨 **CRITICAL**  
**影響範囲**: 全システム（hotel-saas, hotel-common, hotel-pms, hotel-member）

---

## 🚨 問題の概要

テーブル作成に関する命名規則ドキュメントが**3つ存在**し、**内容が矛盾**しています。

---

## 📊 矛盾するドキュメント

| # | ドキュメント | テーブル名 | フィールド名 | 状態 |
|:-:|------------|----------|------------|------|
| 1 | `/docs/01_systems/common/integration/rules/database-naming-convention.md` | `PascalCase` | `PascalCase` | ❌ **実装と不一致** |
| 2 | `/docs/db/prisma-naming-conventions.md` | `PascalCase` | `camelCase` | ⚠️ **部分的に一致** |
| 3 | `/docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md` | `snake_case`<br>(Prisma: PascalCase + `@@map`) | `snake_case`<br>(Prisma: camelCase + `@map`) | ✅ **実装と完全一致** |

---

## 🔍 実際の実装状況（2025-10-03確認）

### データベーステーブル
```sql
✅ 全61テーブルがsnake_case
- staff
- tenants
- orders
- order_items
- menu_items
- categories
- device_rooms
- campaigns
... (他53テーブル)
```

### Prismaスキーマ
```prisma
✅ モデル名: PascalCase
✅ フィールド名: camelCase
✅ @@mapディレクティブ: 必須使用

model Staff {
  id        String   @id
  tenantId  String   @map("tenant_id")  // ← camelCase → snake_case
  email     String
  isActive  Boolean  @map("is_active")
  createdAt DateTime @map("created_at")
  
  @@map("staff")  // ← PascalCase → snake_case
}
```

---

## 🎯 推奨対応（2025-10-03確定）

### 1. 正式ドキュメントの確定

**✅ `DATABASE_NAMING_STANDARD.md`（v3.0.0）を正式版として採用**

**方針**: 選択肢C - 新規のみsnake_case + 既存は現状維持

**理由**:
- ✅ **実態調査に基づく現実的な方針**（混在を認識）
- ✅ PostgreSQL標準に準拠（新規テーブル）
- ✅ TypeScript標準に準拠（Prismaフィールド）
- ✅ **リスク最小**（既存システム無影響）
- ✅ **段階的改善**（将来の統一への布石）

### 2. 矛盾するドキュメントの処理

| ドキュメント | 対応状況 |
|------------|---------|
| `DATABASE_NAMING_STANDARD.md` (v3.0.0) | ✅ **新規作成・正式採用** |
| `database-naming-convention.md` | 📝 **非推奨マーク追加** |
| `prisma-naming-conventions.md` | 📝 **非推奨マーク追加** |
| `SSOT_SAAS_DATABASE_SCHEMA.md` | 📝 **新標準へのリンク追加** |

---

## 📝 正式命名規則（確定版）

### データベース層（PostgreSQL）

```sql
-- テーブル名: snake_case（複数形推奨）
CREATE TABLE staff ( ... );
CREATE TABLE orders ( ... );
CREATE TABLE menu_items ( ... );

-- カラム名: snake_case
tenant_id TEXT NOT NULL
is_active BOOLEAN DEFAULT true
created_at TIMESTAMP DEFAULT NOW()

-- インデックス: idx_{table}_{column}
CREATE INDEX idx_staff_tenant_id ON staff(tenant_id);
```

### Prisma層（ORM）

```prisma
// モデル名: PascalCase（単数形）
model Staff { ... }
model Order { ... }
model MenuItem { ... }

// フィールド名: camelCase
tenantId String
isActive Boolean
createdAt DateTime

// マッピング: 必須
tenantId  String   @map("tenant_id")
isActive  Boolean  @map("is_active")
createdAt DateTime @map("created_at")

@@map("staff")  // ← テーブル名マッピング
```

### API/TypeScript層

```typescript
// インターフェース名: PascalCase
interface Staff { ... }

// プロパティ名: camelCase
{
  id: string
  tenantId: string
  isActive: boolean
  createdAt: string
}

// 変数名: camelCase
const staffMember: Staff = { ... }
```

---

## 🛠️ テーブル作成テンプレート

### PostgreSQL DDL

```sql
CREATE TABLE {table_name} (  -- ← snake_case
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  {field_name}    {TYPE},          -- ← snake_case
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  deleted_at      TIMESTAMP,
  is_deleted      BOOLEAN DEFAULT false,
  
  CONSTRAINT fk_{table}_{relation} FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_{table}_tenant_id ON {table_name}(tenant_id);
CREATE INDEX idx_{table}_{field} ON {table_name}({field_name});
```

### Prismaモデル

```prisma
model {ModelName} {  // ← PascalCase
  id          String    @id @default(uuid())
  tenantId    String    @map("tenant_id")      // ← camelCase + @map
  {fieldName} {Type}    @map("{field_name}")
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")
  isDeleted   Boolean   @default(false) @map("is_deleted")
  
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  
  @@map("{table_name}")  // ← snake_case
  @@index([tenantId])
  @@index([{fieldName}])
}
```

---

## ✅ 対応チェックリスト

- [x] 実態調査完了（2025-10-03）
- [x] `DATABASE_NAMING_STANDARD.md` v3.0.0作成
- [ ] `database-naming-convention.md`に非推奨マーク追加
- [ ] `prisma-naming-conventions.md`に非推奨マーク追加
- [ ] `SSOT_SAAS_DATABASE_SCHEMA.md`に新標準リンク追加
- [ ] 全チーム（Sun, Luna, Suno, Iza）に新規則を通知
- [ ] テーブル作成テンプレートを各システムに配布

---

## 📚 参考資料

- [SSOT_SAAS_DATABASE_SCHEMA.md](./03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md)
- [PostgreSQL命名規則ベストプラクティス](https://www.postgresql.org/docs/current/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS)
- [Prisma公式ドキュメント - マッピング](https://www.prisma.io/docs/concepts/components/prisma-schema/names-in-underlying-database)

---

**このレポートをベースにドキュメント整理を実施してください。**

