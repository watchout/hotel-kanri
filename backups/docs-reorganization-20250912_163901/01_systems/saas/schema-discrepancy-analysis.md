# hotel-commonスキーマと実際のデータベース構造の不一致分析

## 概要

hotel-common統合データベースの実際の構造とhotel-commonのPrismaスキーマ定義の間に不一致があることが判明しました。この文書では、その不一致の詳細を分析し、解決策を提案します。

## 発見された不一致

### 1. テーブル名とモデル名の不一致

| Prismaモデル | 実際のテーブル | 状況 |
|------------|-------------|------|
| `User` | `users` | Prismaモデルのみに存在 |
| なし | `staff` | 実際のDBのみに存在 |

### 2. 命名規則の不一致

| テーブル | 命名規則 | 例 |
|---------|---------|---|
| `staff` | snake_case | `tenant_id`, `is_active`, `created_at` |
| `Tenant` | camelCase | `planType`, `createdAt`, `contactEmail` |

### 3. カラム構造の不一致

**staffテーブル（実際のDB）**:
```
- id (text, NOT NULL)
- tenant_id (text, NOT NULL)
- email (text, NOT NULL)
- name (text, NOT NULL)
- role (text, NOT NULL)
- department (text, NULL)
- is_active (boolean, NOT NULL)
- created_at (timestamp, NOT NULL)
- updated_at (timestamp, NOT NULL)
```

**Userモデル（Prismaスキーマ）**:
```
- id (String, @id @default(cuid()))
- tenantId (String)
- email (String, @unique)
- passwordHash (String)
- role (String, @default("user"))
- systemAccess (String[])
- isActive (Boolean, @default(true))
- lastLoginAt (DateTime?)
- createdAt (DateTime, @default(now()))
- updatedAt (DateTime, @updatedAt)
```

### 4. マッピング指定の不一致

Prismaスキーマでは`@@map`ディレクティブを使用してモデル名とテーブル名のマッピングを指定していますが、一部のテーブルでこの指定が不足しているか、実際のテーブル名と一致していない可能性があります。

## 問題点

1. **開発の混乱**: 開発者がPrismaスキーマを参照して実装すると、実際のデータベース構造と不一致があるため、エラーが発生する
2. **データアクセスの問題**: テーブル名やカラム名の不一致により、クエリが失敗する
3. **マイグレーションの困難**: スキーマの変更が実際のデータベースに正しく反映されない
4. **保守性の低下**: 不一致が続くと、コードベースの保守が困難になる

## 解決策の提案

### 短期的な対応

1. **実際のDBに合わせた実装**:
   - 現在のデータベース構造を変更せず、実際のテーブル名とカラム名に合わせたクエリを使用
   - `$queryRaw`や`$executeRaw`を使用して、直接SQLクエリを実行
   - 必要なカラムのみを追加し、既存の構造を尊重

2. **マッピング層の作成**:
   - Prismaモデルと実際のデータベース構造の間のマッピング層を作成
   - データ変換関数を実装して、アプリケーションとデータベースの間の不一致を吸収

### 中期的な対応

1. **Prismaスキーマの更新**:
   - 実際のデータベース構造に合わせてPrismaスキーマを更新
   - `@@map`ディレクティブを使用して、モデル名とテーブル名のマッピングを正確に指定
   - カラム名のマッピングも`@map`ディレクティブで指定

2. **段階的なマイグレーション**:
   - 実際のデータベース構造とPrismaスキーマの不一致を段階的に解消
   - 各ステップでテストを実施し、問題がないことを確認

### 長期的な対応

1. **命名規則の統一**:
   - データベース全体で一貫した命名規則を採用
   - すべてのテーブルとカラムで`snake_case`または`camelCase`のいずれかに統一

2. **スキーマ管理プロセスの改善**:
   - スキーマ変更の承認プロセスを明確化
   - スキーマ変更時の影響範囲の分析を義務付け
   - 自動テストによるスキーマの整合性チェック

3. **ドキュメントの整備**:
   - 実際のデータベース構造を正確に反映したドキュメントの作成
   - スキーマ変更履歴の管理
   - 各テーブルの役割と関連性の明確化

## 具体的な実装例

### 1. Prismaスキーマの更新例

```prisma
model Staff {
  id           String    @id
  tenant_id    String
  email        String
  name         String
  role         String
  department   String?
  is_active    Boolean
  password_hash String?
  system_access Json?
  base_level   Int?
  last_login_at DateTime?
  created_at   DateTime
  updated_at   DateTime

  tenant       Tenant    @relation(fields: [tenant_id], references: [id])

  @@index([tenant_id])
  @@index([email])
  @@map("staff")
}

model Tenant {
  id          String    @id
  name        String
  domain      String?
  status      String
  contactEmail String?
  createdAt   DateTime
  features    String[]
  planType    String?
  settings    Json?

  staff       Staff[]

  @@map("Tenant")
}
```

### 2. マッピング層の実装例

```typescript
// server/utils/db-mapper.ts
import { prisma } from './prisma';

// スタッフデータのマッピング
export function mapStaffData(dbStaff: any) {
  return {
    id: dbStaff.id,
    email: dbStaff.email,
    name: dbStaff.name,
    role: dbStaff.role,
    tenantId: dbStaff.tenant_id,
    isActive: dbStaff.is_active,
    passwordHash: dbStaff.password_hash,
    systemAccess: dbStaff.system_access,
    baseLevel: dbStaff.base_level,
    lastLoginAt: dbStaff.last_login_at,
    createdAt: dbStaff.created_at,
    updatedAt: dbStaff.updated_at,
    department: dbStaff.department
  };
}

// テナントデータのマッピング
export function mapTenantData(dbTenant: any) {
  return {
    id: dbTenant.id,
    name: dbTenant.name,
    domain: dbTenant.domain,
    status: dbTenant.status,
    contactEmail: dbTenant.contactEmail,
    createdAt: dbTenant.createdAt,
    features: dbTenant.features,
    planType: dbTenant.planType,
    settings: dbTenant.settings
  };
}

// スタッフ検索関数
export async function findStaffByEmail(email: string) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM staff WHERE email = ${email} AND is_active = true LIMIT 1;
    `;

    if (Array.isArray(result) && result.length > 0) {
      return mapStaffData(result[0]);
    }

    return null;
  } catch (error) {
    console.error('スタッフ検索エラー:', error);
    return null;
  }
}

// テナント検索関数
export async function findTenantById(tenantId: string) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM "Tenant" WHERE id = ${tenantId} LIMIT 1;
    `;

    if (Array.isArray(result) && result.length > 0) {
      return mapTenantData(result[0]);
    }

    return null;
  } catch (error) {
    console.error('テナント検索エラー:', error);
    return null;
  }
}
```

## 推奨アクション

1. **現状の詳細調査**:
   - すべてのテーブルとカラムの構造を詳細に調査
   - 各システム（hotel-saas, hotel-member, hotel-pms）での使用状況を確認

2. **不一致解消計画の策定**:
   - 短期、中期、長期の対応計画を策定
   - 各ステップのリスクと影響範囲を分析

3. **hotel-common管理チームとの協議**:
   - 不一致の原因と影響について共有
   - 解決策について合意形成

4. **段階的な実装**:
   - 短期的な対応から着手
   - 各ステップで十分なテストを実施

## 結論

hotel-commonスキーマと実際のデータベース構造の不一致は、開発効率と保守性に重大な影響を与える可能性があります。短期的には実際のデータベース構造に合わせた実装を行い、中長期的にはスキーマの整合性を確保するための取り組みが必要です。

hotel-common統合データベースの管理チームと協力して、スキーマ管理プロセスを改善し、将来的な不一致を防止することが重要です。
