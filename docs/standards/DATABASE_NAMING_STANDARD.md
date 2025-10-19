# データベース命名規則標準

**策定日**: 2025-10-03  
**バージョン**: v3.0.0  
**ステータス**: ✅ **正式採用**  
**適用範囲**: 全システム（hotel-saas, hotel-common, hotel-pms, hotel-member）  
**重要度**: 🚨 **CRITICAL** - 新規テーブル作成時は必須遵守

---

## 🎯 基本方針

### **選択肢C: 新規のみsnake_case + 既存は現状維持**

```
✅ 新規テーブル: snake_case必須 + Prismaマッピング
⚠️ 既存テーブル: 現状維持（マイグレーション不要）
📝 ドキュメント: 混在状態を明記
```

**理由**:
1. ✅ **リスク最小**（既存システム無影響）
2. ✅ **新規テーブルは標準準拠**（PostgreSQL業界標準）
3. ✅ **段階的改善**（将来の統一への布石）
4. ✅ **実装コスト最小**

---

## 📊 現状認識（2025-10-03調査結果）

### 既存テーブルの実態

| パターン | Prismaフィールド | DBカラム | 例 | 割合 |
|---------|----------------|---------|-----|------|
| **snake_case** | snake_case | snake_case | `staff`, `menu_items`, `notification_templates` | ~60% |
| **camelCase** | camelCase | camelCase | `orders`, `order_items`, `invoices` | ~30% |
| **PascalCase** | PascalCase | PascalCase | `pages`, `page_histories` | ~10% |

### 混在の具体例

```sql
-- staff テーブル: 完全snake_case
tenant_id, is_active, created_at, is_deleted

-- orders テーブル: 完全camelCase  
tenantId, roomId, createdAt, isDeleted

-- pages テーブル: 完全PascalCase
TenantId, CreatedAt, IsPublished
```

---

## ✅ 新規テーブル作成標準（必須遵守）

### 1. データベース層（PostgreSQL）

```sql
-- ✅ テーブル名: snake_case（複数形推奨）
CREATE TABLE user_preferences (
  -- ✅ カラム名: snake_case
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  preference_key  TEXT NOT NULL,
  preference_value TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  deleted_at      TIMESTAMP,
  is_deleted      BOOLEAN DEFAULT false,
  
  CONSTRAINT fk_user_preferences_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ✅ インデックス: idx_{table}_{column}
CREATE INDEX idx_user_preferences_tenant_id ON user_preferences(tenant_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_is_deleted ON user_preferences(is_deleted);
```

### 2. Prisma層（ORM）

```prisma
// ✅ モデル名: PascalCase（単数形）
model UserPreference {
  // ✅ フィールド名: camelCase
  id              String    @id @default(uuid())
  tenantId        String    @map("tenant_id")      // ← 必須: @map
  userId          String    @map("user_id")
  preferenceKey   String    @map("preference_key")
  preferenceValue String?   @map("preference_value")
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")
  isDeleted       Boolean   @default(false) @map("is_deleted")
  
  // リレーション
  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  
  // ✅ テーブル名マッピング: 必須
  @@map("user_preferences")
  
  // インデックス
  @@index([tenantId])
  @@index([userId])
  @@index([isDeleted])
}
```

### 3. TypeScript/API層

```typescript
// ✅ インターフェース名: PascalCase
interface UserPreference {
  // ✅ プロパティ名: camelCase
  id: string
  tenantId: string
  userId: string
  preferenceKey: string
  preferenceValue: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ✅ 変数名: camelCase
const userPreference: UserPreference = { ... }
```

---

## ⚠️ 既存テーブルの扱い（現状維持）

### 基本方針

```
✅ そのまま維持（マイグレーション不要）
❌ 強制的な統一は行わない
📝 ドキュメントに「レガシー」と明記
🔄 大規模リファクタリング時のみ検討
```

### 既存テーブルの参照方法

```prisma
// ❌ 変更しない: Orderモデル（camelCase）
model Order {
  id        Int      @id @default(autoincrement())
  tenantId  String   // ← camelCaseのまま
  createdAt DateTime // ← camelCaseのまま
  
  @@map("orders")  // ← テーブル名のみマッピング済み
}

// ❌ 変更しない: staffモデル（snake_case）
model staff {
  id         String   @id
  tenant_id  String   // ← snake_caseのまま
  created_at DateTime // ← snake_caseのまま
  // @@map なし（テーブル名と同じ）
}

// ❌ 変更しない: pagesモデル（PascalCase）
model pages {
  Id        String   @id
  TenantId  String   // ← PascalCaseのまま
  CreatedAt DateTime // ← PascalCaseのまま
}
```

---

## 📋 命名規則詳細

### テーブル名

| 項目 | ルール | 例 |
|------|--------|-----|
| 形式 | `snake_case` | `user_preferences` |
| 単複 | 複数形推奨 | `orders` (推奨), `order` (許容) |
| 長さ | 3〜30文字 | `menu_items` |
| 命名 | 明確で説明的 | `customer_addresses` |

### カラム名

| 項目 | ルール | 例 |
|------|--------|-----|
| 形式 | `snake_case` | `tenant_id`, `is_active` |
| 主キー | `id` | `id` |
| 外部キー | `{関連テーブル}_id` | `tenant_id`, `user_id` |
| ブール | `is_`, `has_`, `can_` | `is_active`, `has_verified` |
| 日時 | `{動詞}_at` / `{名詞}_date` | `created_at`, `start_date` |

### 共通フィールド（標準セット）

```sql
-- ✅ 必須フィールド
id          TEXT PRIMARY KEY
tenant_id   TEXT NOT NULL
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP DEFAULT NOW()

-- ✅ 論理削除対応テーブルの場合
deleted_at  TIMESTAMP
deleted_by  TEXT
is_deleted  BOOLEAN DEFAULT false
```

### インデックス名

```sql
-- パターン: idx_{table}_{column1}_{column2}
CREATE INDEX idx_user_preferences_tenant_id ON user_preferences(tenant_id);
CREATE INDEX idx_orders_tenant_id_status ON orders(tenant_id, status);
```

### 制約名

```sql
-- 外部キー: fk_{子テーブル}_{親テーブル}
CONSTRAINT fk_orders_tenants FOREIGN KEY (tenant_id) REFERENCES tenants(id)

-- ユニーク: unq_{table}_{column1}_{column2}
CONSTRAINT unq_staff_tenant_id_email UNIQUE (tenant_id, email)

-- チェック: chk_{table}_{条件}
CONSTRAINT chk_orders_status CHECK (status IN ('pending', 'completed', 'cancelled'))
```

---

## 🛠️ テーブル作成テンプレート

### 基本テンプレート

```sql
CREATE TABLE {table_name} (
  -- 主キー
  id              TEXT PRIMARY KEY,
  
  -- マルチテナント
  tenant_id       TEXT NOT NULL,
  
  -- ビジネスロジックフィールド
  {field_name}    {TYPE} {CONSTRAINTS},
  
  -- 状態管理
  is_active       BOOLEAN DEFAULT true,
  
  -- タイムスタンプ
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  
  -- 論理削除
  deleted_at      TIMESTAMP,
  deleted_by      TEXT,
  is_deleted      BOOLEAN DEFAULT false,
  
  -- 外部キー制約
  CONSTRAINT fk_{table}_{parent} FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- インデックス
CREATE INDEX idx_{table}_tenant_id ON {table_name}(tenant_id);
CREATE INDEX idx_{table}_is_deleted ON {table_name}(is_deleted);
CREATE INDEX idx_{table}_{field} ON {table_name}({field_name}) WHERE is_deleted = false;
```

### Prismaモデルテンプレート

```prisma
model {ModelName} {
  id          String    @id @default(uuid())
  tenantId    String    @map("tenant_id")
  {fieldName} {Type}    @map("{field_name}")
  isActive    Boolean   @default(true) @map("is_active")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")
  deletedBy   String?   @map("deleted_by")
  isDeleted   Boolean   @default(false) @map("is_deleted")
  
  tenant      Tenant    @relation(fields: [tenantId], references: [id])
  
  @@map("{table_name}")
  @@index([tenantId])
  @@index([isDeleted])
}
```

---

## 🔍 チェックリスト

### 新規テーブル作成前

- [ ] テーブル名はsnake_caseか？
- [ ] カラム名はすべてsnake_caseか？
- [ ] `tenant_id`カラムは存在するか？（マルチテナント対応）
- [ ] `created_at`, `updated_at`は含まれているか？
- [ ] 論理削除が必要なら`is_deleted`, `deleted_at`, `deleted_by`はあるか？
- [ ] 外部キー制約は正しく定義されているか？
- [ ] 必要なインデックスは作成されているか？

### Prismaモデル作成前

- [ ] モデル名はPascalCaseか？
- [ ] フィールド名はcamelCaseか？
- [ ] すべてのフィールドに`@map`ディレクティブがあるか？
- [ ] `@@map("{table_name}")`でテーブル名をマッピングしているか？
- [ ] リレーションは正しく定義されているか？
- [ ] インデックスは`@@index`で定義されているか？

### マイグレーション実行前

- [ ] マイグレーション名は説明的か？（例: `add_user_preferences_table`）
- [ ] バックアップは取得したか？
- [ ] 開発環境でテストしたか？
- [ ] ロールバック手順は準備したか？

---

## 📚 関連ドキュメント

| ドキュメント | 用途 |
|------------|------|
| [SSOT_SAAS_DATABASE_SCHEMA.md](../03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) | データベーススキーマ全体仕様 |
| [SSOT_DATABASE_MIGRATION_OPERATION.md](../03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md) | マイグレーション運用手順 |
| [TABLE_RENAME_MIGRATION_PLAN.md](../migration/TABLE_RENAME_MIGRATION_PLAN.md) | テーブル名変更マイグレーション事例 |
| [DOCUMENT_CONFLICT_REPORT_NAMING_CONVENTION.md](../DOCUMENT_CONFLICT_REPORT_NAMING_CONVENTION.md) | 命名規則矛盾調査レポート |

---

## 🚀 今後のロードマップ

### Phase 1: 新規標準確立（現在）
- ✅ 新規テーブル作成標準の策定
- ✅ ドキュメント整備
- [ ] 全チームへの周知

### Phase 2: 段階的改善（6ヶ月後〜）
- [ ] 既存テーブルの影響度評価
- [ ] 優先度の高いテーブルから段階的統一
- [ ] マイグレーション計画策定

### Phase 3: 完全統一（1年後〜）
- [ ] 全テーブルsnake_case統一
- [ ] レガシーパターン完全排除
- [ ] ドキュメント更新

---

## ⚠️ 重要な注意事項

### 絶対に守るべきルール

1. 🚨 **新規テーブルは必ずsnake_case** - 例外なし
2. 🚨 **Prismaの`@map`/`@@map`は必須** - 忘れずに記述
3. 🚨 **既存テーブルは勝手に変更しない** - チーム合意必須
4. 🚨 **`tenant_id`は全テーブル必須** - マルチテナント対応

### よくある間違い

```prisma
// ❌ 間違い1: @mapディレクティブ忘れ
model UserPreference {
  tenantId String  // ← DBではtenantIdカラムになってしまう
  @@map("user_preferences")
}

// ✅ 正しい
model UserPreference {
  tenantId String @map("tenant_id")  // ← DBではtenant_idカラム
  @@map("user_preferences")
}

// ❌ 間違い2: テーブル名マッピング忘れ
model UserPreference {
  tenantId String @map("tenant_id")
  // @@map忘れ → テーブル名がUserPreferenceになってしまう
}

// ✅ 正しい
model UserPreference {
  tenantId String @map("tenant_id")
  @@map("user_preferences")  // ← 必須
}
```

---

## 📞 質問・相談窓口

- 技術的な質問: Iza（統合管理者）
- 実装相談: 各システム担当AI（Sun / Luna / Suno）
- ドキュメント修正提案: GitHub Issue / Pull Request

---

**🔖 このドキュメントは確定版です。新規テーブル作成時は必ず参照してください。**

