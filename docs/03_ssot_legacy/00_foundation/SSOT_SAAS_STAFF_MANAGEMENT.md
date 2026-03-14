# 🔐 SSOT: hotel-saas スタッフ管理システム

**Doc-ID**: SSOT-SAAS-STAFF-001  
**バージョン**: 1.0.0  
**作成日**: 2025年10月19日  
**最終更新**: 2025年10月19日  
**ステータス**: 🔴 承認済み（最高権威）  
**所有者**: Iza（統合管理者）

**関連SSOT**:
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤（`staff`テーブル、`staff_tenant_memberships`テーブル）
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](./SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証
- [SSOT_SAAS_PERMISSION_SYSTEM.md](../01_admin_features/SSOT_SAAS_PERMISSION_SYSTEM.md) - 役職・権限管理
- [SSOT_DATABASE_SCHEMA.md](./SSOT_DATABASE_SCHEMA.md) - DBスキーマ
- [SSOT_TEST_ENVIRONMENT.md](./SSOT_TEST_ENVIRONMENT.md) - テストアカウント情報

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [データベース設計](#データベース設計)
4. [API仕様（hotel-common）](#api仕様hotel-common)
5. [API仕様（hotel-saas）](#api仕様hotel-saas)
6. [フロントエンド実装](#フロントエンド実装)
7. [セキュリティ](#セキュリティ)
8. [PERMISSION_SYSTEMとの連携](#permission_systemとの連携)
9. [実装チェックリスト](#実装チェックリスト)

---

## 📖 概要

### 目的

hotel-saas管理画面における、スタッフアカウントの作成・閲覧・更新・削除（CRUD）の完全な仕様を定義する。

### 適用範囲

- ✅ スタッフアカウントCRUD（作成・一覧・詳細・更新・削除）
- ✅ 複数テナント所属管理（`staff_tenant_memberships`）
- ✅ 役職割り当て（PERMISSION_SYSTEMとの連携）
- ✅ パスワード管理（初期設定・変更）
- ✅ アカウント有効化・無効化
- ✅ スタッフ検索・フィルタリング

### 技術スタック

- **データベース**: PostgreSQL (統一DB)
- **ORM**: Prisma
- **テーブル**: `staff`, `staff_tenant_memberships`, `roles`（PERMISSION_SYSTEM）
- **認証方式**: Session認証（Redis + HttpOnly Cookie）
- **パスワードハッシュ**: bcrypt（ソルトラウンド12）

---

## 🎯 スコープ

### 対象機能

- ✅ スタッフアカウント作成（メール・パスワード・名前）
- ✅ スタッフ一覧表示（ページネーション・検索・フィルタ）
- ✅ スタッフ詳細表示
- ✅ スタッフ情報更新（名前・メール・有効化状態）
- ✅ スタッフ削除（論理削除）
- ✅ パスワード変更（初期設定・リセット）
- ✅ テナント所属管理（追加・削除・主所属設定）
- ✅ 役職割り当て（PERMISSION_SYSTEMと連携）

### 対象外機能

- ❌ スタッフの勤怠管理（将来対応）
- ❌ 給与管理（将来対応）
- ❌ スキル・資格管理（将来対応）
- ❌ シフト管理（将来対応）

---

## 🗄️ データベース設計

### 1. `staff`テーブル（既存）

**参照**: [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md#3-staff-テーブルグローバルユーザー)

**重要変更点（v1.5.0での変更）**:
- ❌ **削除**: `tenant_id` カラム（複数テナント所属対応のため）
- ❌ **削除**: `role`, `department`, `permissions`, `level` カラム（`staff_tenant_memberships` + `roles`テーブルで管理）
- ✅ **追加**: `email` にグローバルユニーク制約
- ✅ **追加**: セキュリティフィールド（`failed_login_count`, `locked_until`, `is_deleted`）

**Prismaモデル**:
```prisma
model Staff {
  id                String    @id @default(cuid())
  email             String    @unique                    -- ✅ グローバルユニーク
  name              String
  passwordHash      String?   @map("password_hash")
  failedLoginCount  Int       @default(0) @map("failed_login_count")
  lastLoginAt       DateTime? @map("last_login_at")
  lockedUntil       DateTime? @map("locked_until")
  isActive          Boolean   @default(true) @map("is_active")
  isDeleted         Boolean   @default(false) @map("is_deleted")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  // リレーション
  memberships       StaffTenantMembership[]  -- ✅ 所属テナント一覧
  
  @@index([email])
  @@index([isActive], map: "idx_staff_is_active")
  @@index([isDeleted], map: "idx_staff_is_deleted")
  @@map("staff")
}
```

---

### 2. `staff_tenant_memberships`テーブル（既存）

**参照**: [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md#4-staff_tenant_memberships-テーブル複数テナント所属)

**重要**: PERMISSION_SYSTEM統合後は`role_id`フィールドを使用

**Prismaモデル（PERMISSION_SYSTEM統合後）**:
```prisma
model StaffTenantMembership {
  id                String    @id @default(cuid())
  staffId           String    @map("staff_id")
  tenantId          String    @map("tenant_id")
  
  roleId            String    @map("role_id")           -- ✅ PERMISSION_SYSTEM統合
  customPermissions Json      @default("[]") @map("custom_permissions")
  
  isActive          Boolean   @default(true) @map("is_active")
  isPrimary         Boolean   @default(false) @map("is_primary")
  joinedAt          DateTime  @default(now()) @map("joined_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  // リレーション
  staff             Staff     @relation(fields: [staffId], references: [id], onDelete: Cascade)
  tenant            Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  role              Role      @relation(fields: [roleId], references: [id], onDelete: Restrict)
  
  @@unique([staffId, tenantId], map: "uniq_staff_tenant")
  @@index([staffId], map: "idx_memberships_staff_id")
  @@index([tenantId], map: "idx_memberships_tenant_id")
  @@index([roleId], map: "idx_memberships_role_id")
  @@index([isActive], map: "idx_memberships_is_active")
  @@index([isPrimary], map: "idx_memberships_is_primary")
  @@map("staff_tenant_memberships")
}
```

---

## 🔌 API仕様（hotel-common）

### 基本方針

- **実装先**: `/Users/kaneko/hotel-common/src/routes/api/v1/admin/staff/`
- **認証**: Session認証必須
- **権限**: `system:staff:manage` 権限必須（PERMISSION_SYSTEM）
- **テナント分離**: 全APIで`tenantId`フィルタ必須

---

### 1. スタッフ一覧取得

#### `GET /api/v1/admin/staff`

**目的**: テナントに所属するスタッフの一覧を取得

**クエリパラメータ**:
```typescript
{
  tenantId: string;              // ✅ 必須
  page?: number;                 // ページ番号（デフォルト: 1）
  pageSize?: number;             // 1ページあたりの件数（デフォルト: 20）
  search?: string;               // 検索キーワード（名前・メール）
  roleId?: string;               // 役職でフィルタ
  isActive?: boolean;            // 有効化状態でフィルタ
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLoginAt';  // ソート項目
  sortOrder?: 'asc' | 'desc';    // ソート順序
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "staff-001",
        "email": "manager@hotel-a.com",
        "name": "田中 太郎",
        "isActive": true,
        "role": {
          "id": "role-001",
          "name": "フロント主任"
        },
        "lastLoginAt": "2025-10-19T12:00:00Z",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-10-19T12:00:00Z"
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "pageSize": 20,
      "totalPages": 2
    }
  }
}
```

**実装例（hotel-common）**:
```typescript
// /Users/kaneko/hotel-common/src/routes/api/v1/admin/staff/list.get.ts
import { defineRoute } from '../../../../../utils/route-helper';
import { SessionAuthService } from '../../../../../services/session-auth.service';
import { UnifiedPrismaClient } from '../../../../../services/database/unified-prisma-client';
import { buildStaffSearchWhere, mapStaffToSummary, createPaginationInfo } from '../../../../../utils/staff-helpers';

export default defineRoute(async (req, res) => {
  // 認証チェック
  const session = await SessionAuthService.validateSession(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証が必要です' }
    });
  }

  // 権限チェック
  if (!session.hasPermission('system:staff:manage') && !session.hasPermission('system:staff:view')) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'スタッフ管理権限がありません' }
    });
  }

  const {
    tenantId,
    page = 1,
    pageSize = 20,
    search,
    roleId,
    isActive,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // tenantId必須チェック
  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_TENANT_ID', message: 'tenantIdは必須です' }
    });
  }

  const prisma = UnifiedPrismaClient.getInstance().getClient();

  // Where条件構築
  const where = buildStaffSearchWhere({
    tenantId: tenantId as string,
    search: search as string,
    isActive: isActive !== undefined ? isActive === 'true' : undefined
  });

  // roleIdフィルタ
  if (roleId) {
    where.memberships = {
      some: {
        tenant_id: tenantId,
        role_id: roleId
      }
    };
  }

  // ページネーション
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  // データ取得
  const [items, total] = await Promise.all([
    prisma.staff.findMany({
      where,
      include: {
        memberships: {
          where: { tenant_id: tenantId as string },
          include: { role: true }
        }
      },
      skip,
      take,
      orderBy: { [sortBy as string]: sortOrder }
    }),
    prisma.staff.count({ where })
  ]);

  // レスポンスマッピング
  const staffList = items.map(staff => ({
    ...mapStaffToSummary(staff),
    role: staff.memberships[0]?.role ? {
      id: staff.memberships[0].role.id,
      name: staff.memberships[0].role.name
    } : null
  }));

  const pagination = createPaginationInfo(total, Number(page), Number(pageSize));

  return res.json({
    success: true,
    data: { items: staffList, pagination }
  });
});
```

---

### 2. スタッフ詳細取得

#### `GET /api/v1/admin/staff/:id`

**目的**: スタッフの詳細情報を取得

**パスパラメータ**:
- `id`: スタッフID

**クエリパラメータ**:
```typescript
{
  tenantId: string;  // ✅ 必須
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "staff-001",
    "email": "manager@hotel-a.com",
    "name": "田中 太郎",
    "isActive": true,
    "failedLoginCount": 0,
    "lastLoginAt": "2025-10-19T12:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-10-19T12:00:00Z",
    "memberships": [
      {
        "tenantId": "hotel-a",
        "tenantName": "ホテルA",
        "role": {
          "id": "role-001",
          "name": "フロント主任"
        },
        "isPrimary": true,
        "isActive": true,
        "joinedAt": "2025-01-01T00:00:00Z"
      }
    ]
  }
}
```

**実装例（hotel-common）**:
```typescript
// /Users/kaneko/hotel-common/src/routes/api/v1/admin/staff/[id].get.ts
import { defineRoute } from '../../../../../utils/route-helper';
import { SessionAuthService } from '../../../../../services/session-auth.service';
import { UnifiedPrismaClient } from '../../../../../services/database/unified-prisma-client';

export default defineRoute(async (req, res) => {
  const session = await SessionAuthService.validateSession(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証が必要です' }
    });
  }

  // 権限チェック
  if (!session.hasPermission('system:staff:manage') && !session.hasPermission('system:staff:view')) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'スタッフ管理権限がありません' }
    });
  }

  const { id } = req.params;
  const { tenantId } = req.query;

  if (!tenantId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_TENANT_ID', message: 'tenantIdは必須です' }
    });
  }

  const prisma = UnifiedPrismaClient.getInstance().getClient();

  // スタッフ取得
  const staff = await prisma.staff.findUnique({
    where: { id },
    include: {
      memberships: {
        where: { tenant_id: tenantId as string },
        include: {
          role: true,
          tenant: true
        }
      }
    }
  });

  if (!staff) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'スタッフが見つかりません' }
    });
  }

  // レスポンス構築
  const response = {
    id: staff.id,
    email: staff.email,
    name: staff.name,
    isActive: staff.isActive,
    failedLoginCount: staff.failedLoginCount,
    lastLoginAt: staff.lastLoginAt?.toISOString() || null,
    createdAt: staff.createdAt.toISOString(),
    updatedAt: staff.updatedAt.toISOString(),
    memberships: staff.memberships.map(m => ({
      tenantId: m.tenantId,
      tenantName: m.tenant.name,
      role: {
        id: m.role.id,
        name: m.role.name
      },
      isPrimary: m.isPrimary,
      isActive: m.isActive,
      joinedAt: m.joinedAt.toISOString()
    }))
  };

  return res.json({
    success: true,
    data: response
  });
});
```

---

### 3. スタッフ作成

#### `POST /api/v1/admin/staff`

**目的**: 新しいスタッフアカウントを作成

**リクエストボディ**:
```json
{
  "email": "newstaff@hotel-a.com",
  "name": "山田 花子",
  "password": "initial_password_123",
  "tenantId": "hotel-a",
  "roleId": "role-002",
  "sendWelcomeEmail": true
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "staff-new",
    "email": "newstaff@hotel-a.com",
    "name": "山田 花子",
    "isActive": true,
    "createdAt": "2025-10-19T14:00:00Z"
  }
}
```

**バリデーション**:
- ✅ `email`: 必須、有効なメールアドレス形式、グローバルユニーク
- ✅ `name`: 必須、1〜100文字
- ✅ `password`: 必須、8〜72文字、英数字記号含む
- ✅ `tenantId`: 必須、存在するテナントID
- ✅ `roleId`: 必須、存在する役職ID（PERMISSION_SYSTEM）

**実装例（hotel-common）**:
```typescript
// /Users/kaneko/hotel-common/src/routes/api/v1/admin/staff/create.post.ts
import { defineRoute } from '../../../../../utils/route-helper';
import { SessionAuthService } from '../../../../../services/session-auth.service';
import { UnifiedPrismaClient } from '../../../../../services/database/unified-prisma-client';
import { hashPassword, checkEmailExists } from '../../../../../utils/staff-helpers';
import { HotelLogger } from '../../../../../utils/logger';

const logger = HotelLogger.getInstance();

export default defineRoute(async (req, res) => {
  const session = await SessionAuthService.validateSession(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証が必要です' }
    });
  }

  // 権限チェック
  if (!session.hasPermission('system:staff:manage')) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'スタッフ作成権限がありません' }
    });
  }

  const { email, name, password, tenantId, roleId, sendWelcomeEmail = false } = req.body;

  // バリデーション
  if (!email || !name || !password || !tenantId || !roleId) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: '必須フィールドが不足しています' }
    });
  }

  // メールアドレス形式チェック
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_EMAIL', message: '無効なメールアドレス形式です' }
    });
  }

  // パスワード強度チェック
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({
      success: false,
      error: { code: 'WEAK_PASSWORD', message: 'パスワードは8〜72文字で設定してください' }
    });
  }

  const prisma = UnifiedPrismaClient.getInstance().getClient();

  // メールアドレス重複チェック
  const emailExists = await checkEmailExists(prisma, email, tenantId);
  if (emailExists) {
    return res.status(409).json({
      success: false,
      error: { code: 'EMAIL_EXISTS', message: 'このメールアドレスは既に使用されています' }
    });
  }

  // 役職存在確認
  const role = await prisma.role.findFirst({
    where: { id: roleId, tenantId }
  });

  if (!role) {
    return res.status(404).json({
      success: false,
      error: { code: 'ROLE_NOT_FOUND', message: '指定された役職が見つかりません' }
    });
  }

  // パスワードハッシュ化
  const passwordHash = await hashPassword(password);

  // トランザクション: スタッフ作成 + membership作成
  const staff = await prisma.$transaction(async (tx) => {
    // Staff作成
    const newStaff = await tx.staff.create({
      data: {
        email,
        name,
        passwordHash,
        isActive: true,
        isDeleted: false,
        failedLoginCount: 0
      }
    });

    // StaffTenantMembership作成
    await tx.staffTenantMembership.create({
      data: {
        staffId: newStaff.id,
        tenantId,
        roleId,
        isActive: true,
        isPrimary: true  // 最初のテナントは主所属
      }
    });

    return newStaff;
  });

  logger.info('Staff created', {
    staffId: staff.id,
    email: staff.email,
    tenantId,
    roleId,
    createdBy: session.userId
  });

  // TODO: sendWelcomeEmail が true の場合、ウェルカムメール送信

  return res.status(201).json({
    success: true,
    data: {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      isActive: staff.isActive,
      createdAt: staff.createdAt.toISOString()
    }
  });
});
```

---

### 4. スタッフ更新

#### `PUT /api/v1/admin/staff/:id`

**目的**: スタッフ情報を更新

**パスパラメータ**:
- `id`: スタッフID

**リクエストボディ**:
```json
{
  "name": "田中 太郎（更新）",
  "email": "updated@hotel-a.com",
  "isActive": true,
  "tenantId": "hotel-a"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "staff-001",
    "email": "updated@hotel-a.com",
    "name": "田中 太郎（更新）",
    "isActive": true,
    "updatedAt": "2025-10-19T15:00:00Z"
  }
}
```

**セキュリティ制約**:
- ❌ 自分自身のアカウントを無効化できない
- ❌ `system:staff:delete` 権限がない場合、自分より上位レベルのスタッフを編集できない

---

### 5. スタッフ削除（論理削除）

#### `DELETE /api/v1/admin/staff/:id`

**目的**: スタッフを論理削除

**パスパラメータ**:
- `id`: スタッフID

**クエリパラメータ**:
```typescript
{
  tenantId: string;  // ✅ 必須
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "スタッフを削除しました"
}
```

**セキュリティ制約**:
- ❌ 自分自身のアカウントは削除できない
- ❌ `system:staff:delete` 権限が必要
- ✅ 論理削除（`is_deleted = true`）のみ、物理削除は実行しない

**実装例（hotel-common）**:
```typescript
// /Users/kaneko/hotel-common/src/routes/api/v1/admin/staff/[id].delete.ts
import { defineRoute } from '../../../../../utils/route-helper';
import { SessionAuthService } from '../../../../../services/session-auth.service';
import { UnifiedPrismaClient } from '../../../../../services/database/unified-prisma-client';
import { HotelLogger } from '../../../../../utils/logger';

const logger = HotelLogger.getInstance();

export default defineRoute(async (req, res) => {
  const session = await SessionAuthService.validateSession(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '認証が必要です' }
    });
  }

  // 権限チェック
  if (!session.hasPermission('system:staff:delete')) {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'スタッフ削除権限がありません' }
    });
  }

  const { id } = req.params;
  const { tenantId } = req.query;

  // 自分自身の削除禁止
  if (id === session.userId) {
    return res.status(400).json({
      success: false,
      error: { code: 'CANNOT_DELETE_SELF', message: '自分自身のアカウントは削除できません' }
    });
  }

  const prisma = UnifiedPrismaClient.getInstance().getClient();

  // スタッフ存在確認
  const staff = await prisma.staff.findUnique({
    where: { id },
    include: {
      memberships: {
        where: { tenant_id: tenantId as string }
      }
    }
  });

  if (!staff) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'スタッフが見つかりません' }
    });
  }

  if (staff.memberships.length === 0) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_IN_TENANT', message: 'このスタッフは指定されたテナントに所属していません' }
    });
  }

  // 論理削除実行
  await prisma.staff.update({
    where: { id },
    data: {
      isDeleted: true,
      isActive: false,
      updatedAt: new Date()
    }
  });

  logger.warn('Staff deleted (soft)', {
    staffId: id,
    email: staff.email,
    tenantId,
    deletedBy: session.userId
  });

  return res.json({
    success: true,
    message: 'スタッフを削除しました'
  });
});
```

---

### 6. パスワード変更

#### `PUT /api/v1/admin/staff/:id/password`

**目的**: スタッフのパスワードを変更

**パスパラメータ**:
- `id`: スタッフID

**リクエストボディ**:
```json
{
  "newPassword": "new_secure_password_456",
  "tenantId": "hotel-a"
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "パスワードを変更しました"
}
```

**セキュリティ**:
- ✅ パスワードハッシュ化（bcrypt、ソルトラウンド12）
- ✅ `failed_login_count` リセット
- ✅ `locked_until` クリア

---

### 7. テナント所属追加

#### `POST /api/v1/admin/staff/:id/tenants`

**目的**: スタッフを別のテナントに追加

**パスパラメータ**:
- `id`: スタッフID

**リクエストボディ**:
```json
{
  "tenantId": "hotel-b",
  "roleId": "role-003",
  "isPrimary": false
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "テナントに追加しました"
}
```

---

### 8. テナント所属削除

#### `DELETE /api/v1/admin/staff-tenants/:membershipId`

**目的**: スタッフを特定のテナントから削除

**パスパラメータ**:
- `membershipId`: `staff_tenant_memberships.id`（削除する所属レコードのID）

**クエリパラメータ**:
```typescript
{
  tenantId: string;  // ✅ 必須（セキュリティ確認用）
}
```

**セキュリティ制約**:
- ❌ 主所属（`is_primary = true`）のテナントは削除できない
- ✅ 主所属以外のテナントは削除可能
- ✅ 自分が所属するテナントのmembershipのみ削除可能

**注意**: Nuxt 3制約により、フラット構造（1階層動的パス）に変更

---

## 🔌 API仕様（hotel-saas）

### 基本方針

- **実装先**: `/Users/kaneko/hotel-saas/server/api/v1/admin/staff/`
- **役割**: hotel-common APIへのプロキシ
- **Session転送**: `hotel_session` Cookieを転送

### プロキシAPI一覧

| メソッド | パス | プロキシ先 |
|:--------|:-----|:----------|
| `GET` | `/api/v1/admin/staff` | `http://localhost:3400/api/v1/admin/staff` |
| `GET` | `/api/v1/admin/staff/:id` | `http://localhost:3400/api/v1/admin/staff/:id` |
| `POST` | `/api/v1/admin/staff` | `http://localhost:3400/api/v1/admin/staff` |
| `PUT` | `/api/v1/admin/staff/:id` | `http://localhost:3400/api/v1/admin/staff/:id` |
| `DELETE` | `/api/v1/admin/staff/:id` | `http://localhost:3400/api/v1/admin/staff/:id` |
| `PUT` | `/api/v1/admin/staff/:id/password` | `http://localhost:3400/api/v1/admin/staff/:id/password` |
| `POST` | `/api/v1/admin/staff/:id/tenants` | `http://localhost:3400/api/v1/admin/staff/:id/tenants` |
| `DELETE` | `/api/v1/admin/staff-tenants/:membershipId` | `http://localhost:3400/api/v1/admin/staff-tenants/:membershipId` |

**実装例（hotel-saas）**:
```typescript
// /Users/kaneko/hotel-saas/server/api/v1/admin/staff/list.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const sessionCookie = getCookie(event, 'hotel_session');

  const response = await $fetch('http://localhost:3400/api/v1/admin/staff', {
    method: 'GET',
    query,
    headers: {
      Cookie: `hotel_session=${sessionCookie}`
    }
  });

  return response;
});
```

---

## 🎨 フロントエンド実装

### 1. スタッフ一覧画面

**パス**: `/pages/admin/settings/staff/index.vue`

**画面構成**:
```
┌────────────────────────────────────────────────────────┐
│ スタッフ管理                                           │
│ ┌────────────────────────────────────────────────────┐ │
│ │ + 新しいスタッフを追加                             │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 🔍 検索: [____________]   役職: [全て     ▼]      │ │
│ │ 状態: [全て     ▼]                                 │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌──────────────────────────────────────────────────┐   │
│ │ 名前           | メール              | 役職      │   │
│ ├──────────────────────────────────────────────────┤   │
│ │ 田中 太郎      | tanaka@hotel.com   | フロント主任 │   │
│ │ 最終ログイン: 2時間前                   [編集]    │   │
│ ├──────────────────────────────────────────────────┤   │
│ │ 山田 花子      | yamada@hotel.com   | スタッフ    │   │
│ │ 最終ログイン: 1日前                     [編集]    │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│ ページ: [◀] 1 / 3 [▶]                                  │
└────────────────────────────────────────────────────────┘
```

**実装例**:
```vue
<template>
  <div class="staff-management">
    <div class="header">
      <h1>スタッフ管理</h1>
      <UButton 
        color="primary" 
        @click="showCreateModal = true"
        v-if="hasPermission('system:staff:manage')"
      >
        + 新しいスタッフを追加
      </UButton>
    </div>

    <!-- 検索・フィルタ -->
    <div class="filters">
      <UInput
        v-model="search"
        placeholder="名前またはメールアドレスで検索"
        icon="i-heroicons-magnifying-glass"
        @input="debouncedSearch"
      />
      
      <USelect
        v-model="selectedRoleId"
        :options="roleOptions"
        placeholder="役職"
        @change="fetchStaff"
      />
      
      <USelect
        v-model="selectedStatus"
        :options="statusOptions"
        placeholder="状態"
        @change="fetchStaff"
      />
    </div>

    <!-- スタッフ一覧 -->
    <div class="staff-list">
      <div 
        v-for="staff in staffList" 
        :key="staff.id" 
        class="staff-card"
      >
        <div class="staff-info">
          <h3>{{ staff.name }}</h3>
          <p class="email">{{ staff.email }}</p>
          <p class="role">{{ staff.role?.name || 'ー' }}</p>
          <p class="last-login">
            最終ログイン: {{ formatLastLogin(staff.lastLoginAt) }}
          </p>
        </div>
        <div class="staff-actions">
          <UButton 
            size="sm" 
            color="white" 
            @click="editStaff(staff.id)"
            v-if="hasPermission('system:staff:manage')"
          >
            編集
          </UButton>
        </div>
      </div>
    </div>

    <!-- ページネーション -->
    <div class="pagination">
      <UButton
        size="sm"
        color="white"
        :disabled="currentPage === 1"
        @click="goToPage(currentPage - 1)"
      >
        ◀
      </UButton>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <UButton
        size="sm"
        color="white"
        :disabled="currentPage === totalPages"
        @click="goToPage(currentPage + 1)"
      >
        ▶
      </UButton>
    </div>

    <!-- スタッフ作成モーダル -->
    <StaffCreateModal 
      v-model="showCreateModal" 
      @created="onStaffCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { useToast } from '#app';

const { hasPermission } = usePermissions();
const { currentTenant } = useSessionAuth();
const toast = useToast();

const staffList = ref([]);
const search = ref('');
const selectedRoleId = ref('');
const selectedStatus = ref('all');
const currentPage = ref(1);
const totalPages = ref(1);
const showCreateModal = ref(false);

const statusOptions = [
  { label: '全て', value: 'all' },
  { label: '有効', value: 'active' },
  { label: '無効', value: 'inactive' }
];

const roleOptions = ref([{ label: '全て', value: '' }]);

// スタッフ一覧取得
const fetchStaff = async () => {
  try {
    const response = await $fetch('/api/v1/admin/staff', {
      params: {
        tenantId: currentTenant.value?.id,
        page: currentPage.value,
        pageSize: 20,
        search: search.value,
        roleId: selectedRoleId.value,
        isActive: selectedStatus.value === 'all' ? undefined : selectedStatus.value === 'active'
      }
    });
    
    staffList.value = response.data.items;
    totalPages.value = response.data.pagination.totalPages;
  } catch (error) {
    toast.error('エラー', 'スタッフ一覧の取得に失敗しました');
  }
};

// 役職一覧取得
const fetchRoles = async () => {
  try {
    const response = await $fetch('/api/v1/admin/roles', {
      params: { tenantId: currentTenant.value?.id }
    });
    
    roleOptions.value = [
      { label: '全て', value: '' },
      ...response.data.map(r => ({ label: r.name, value: r.id }))
    ];
  } catch (error) {
    console.error('役職一覧取得エラー', error);
  }
};

// 検索デバウンス
const debouncedSearch = useDebounceFn(() => {
  currentPage.value = 1;
  fetchStaff();
}, 300);

// ページ移動
const goToPage = (page: number) => {
  currentPage.value = page;
  fetchStaff();
};

// スタッフ編集
const editStaff = (staffId: string) => {
  navigateTo(`/admin/settings/staff/${staffId}/edit`);
};

// スタッフ作成完了
const onStaffCreated = () => {
  fetchStaff();
  toast.success('成功', 'スタッフを作成しました');
};

// 最終ログイン表示
const formatLastLogin = (lastLoginAt: string | null) => {
  if (!lastLoginAt) return '未ログイン';
  
  const date = new Date(lastLoginAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffHours < 1) return '1時間以内';
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  
  return date.toLocaleDateString('ja-JP');
};

onMounted(() => {
  fetchStaff();
  fetchRoles();
});
</script>

<style scoped>
.staff-management {
  padding: 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.staff-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.staff-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
}

.staff-info h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.staff-info .email {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
}

.staff-info .role {
  font-size: 14px;
  color: #3b82f6;
  margin-bottom: 4px;
}

.staff-info .last-login {
  font-size: 12px;
  color: #9ca3af;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}
</style>
```

---

### 2. スタッフ作成モーダル

**コンポーネント**: `/components/StaffCreateModal.vue`

**実装例**:
```vue
<template>
  <UModal v-model="isOpen">
    <div class="staff-create-modal">
      <h2>新しいスタッフを追加</h2>
      
      <UFormGroup label="メールアドレス" required>
        <UInput
          v-model="form.email"
          type="email"
          placeholder="staff@hotel.com"
        />
      </UFormGroup>
      
      <UFormGroup label="名前" required>
        <UInput
          v-model="form.name"
          placeholder="山田 太郎"
        />
      </UFormGroup>
      
      <UFormGroup label="初期パスワード" required>
        <UInput
          v-model="form.password"
          type="password"
          placeholder="8文字以上"
        />
      </UFormGroup>
      
      <UFormGroup label="役職" required>
        <USelect
          v-model="form.roleId"
          :options="roleOptions"
          placeholder="役職を選択"
        />
      </UFormGroup>
      
      <UFormGroup label="ウェルカムメール送信">
        <UCheckbox v-model="form.sendWelcomeEmail">
          <template #label>
            ログイン情報を含むメールを送信する
          </template>
        </UCheckbox>
      </UFormGroup>
      
      <div class="modal-actions">
        <UButton color="white" @click="closeModal">
          キャンセル
        </UButton>
        <UButton 
          color="primary" 
          @click="createStaff"
          :disabled="!isFormValid"
          :loading="loading"
        >
          作成
        </UButton>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useToast } from '#app';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'created'): void;
}>();

const { currentTenant } = useSessionAuth();
const toast = useToast();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
});

const form = ref({
  email: '',
  name: '',
  password: '',
  roleId: '',
  sendWelcomeEmail: false
});

const roleOptions = ref([]);
const loading = ref(false);

const isFormValid = computed(() => {
  return form.value.email && 
         form.value.name && 
         form.value.password.length >= 8 && 
         form.value.roleId;
});

// 役職一覧取得
const fetchRoles = async () => {
  try {
    const response = await $fetch('/api/v1/admin/roles', {
      params: { tenantId: currentTenant.value?.id }
    });
    
    roleOptions.value = response.data.map(r => ({
      label: r.name,
      value: r.id
    }));
  } catch (error) {
    console.error('役職一覧取得エラー', error);
  }
};

// スタッフ作成
const createStaff = async () => {
  loading.value = true;
  
  try {
    await $fetch('/api/v1/admin/staff', {
      method: 'POST',
      body: {
        ...form.value,
        tenantId: currentTenant.value?.id
      }
    });
    
    emit('created');
    closeModal();
  } catch (error: any) {
    if (error.data?.error?.code === 'EMAIL_EXISTS') {
      toast.error('エラー', 'このメールアドレスは既に使用されています');
    } else {
      toast.error('エラー', 'スタッフの作成に失敗しました');
    }
  } finally {
    loading.value = false;
  }
};

// モーダルを閉じる
const closeModal = () => {
  form.value = {
    email: '',
    name: '',
    password: '',
    roleId: '',
    sendWelcomeEmail: false
  };
  isOpen.value = false;
};

// モーダル表示時に役職を取得
watch(isOpen, (newValue) => {
  if (newValue) {
    fetchRoles();
  }
});
</script>

<style scoped>
.staff-create-modal {
  padding: 24px;
}

.staff-create-modal h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
```

---

### 3. スタッフ編集画面

**パス**: `/pages/admin/settings/staff/[id]/edit.vue`

**画面構成**:
```
┌────────────────────────────────────────────────────────┐
│ スタッフ編集: 田中 太郎                                │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 基本情報                                           │ │
│ │ ┌──────────────────────────────────────────────┐   │ │
│ │ │ 名前: [田中 太郎_____________]              │   │ │
│ │ │ メール: [tanaka@hotel.com______]            │   │ │
│ │ │ 状態: ☑ 有効                               │   │ │
│ │ └──────────────────────────────────────────────┘   │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ テナント所属                                       │ │
│ │ ┌──────────────────────────────────────────────┐   │ │
│ │ │ ホテルA | フロント主任 | 主所属 ✓          │   │ │
│ │ │ ホテルB | スタッフ     | [削除]             │   │ │
│ │ └──────────────────────────────────────────────┘   │ │
│ │ [+ テナントを追加]                                 │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ パスワード変更                                     │ │
│ │ [パスワードをリセット]                             │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ [キャンセル]                               [保存]      │
└────────────────────────────────────────────────────────┘
```

---

## 🔒 セキュリティ

### 1. 権限チェック

**必須権限**:

| 操作 | 必要な権限 |
|:-----|:----------|
| スタッフ一覧閲覧 | `system:staff:view` または `system:staff:manage` |
| スタッフ詳細閲覧 | `system:staff:view` または `system:staff:manage` |
| スタッフ作成 | `system:staff:manage` |
| スタッフ更新 | `system:staff:manage` |
| スタッフ削除 | `system:staff:delete` |
| パスワード変更 | `system:staff:manage` |
| テナント所属管理 | `system:staff:manage` + `system:roles:manage` |

---

### 2. 自己操作制限

**絶対禁止**:
- ❌ 自分自身のアカウントを無効化
- ❌ 自分自身のアカウントを削除
- ❌ 自分自身の主所属テナントを変更

**実装例**:
```typescript
// 自分自身の削除禁止
if (staffId === session.userId) {
  throw createError({
    statusCode: 400,
    message: '自分自身のアカウントは削除できません'
  });
}

// 自分自身の無効化禁止
if (staffId === session.userId && !isActive) {
  throw createError({
    statusCode: 400,
    message: '自分自身のアカウントを無効化できません'
  });
}
```

---

### 3. パスワードセキュリティ

**要件**:
- ✅ 最小8文字、最大72文字
- ✅ bcryptハッシュ化（ソルトラウンド12）
- ✅ パスワード失敗回数記録（`failed_login_count`）
- ✅ 5回失敗でアカウントロック（`locked_until`）

**実装例**:
```typescript
import * as bcrypt from 'bcrypt';

// パスワードハッシュ化
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// パスワード検証
export const verifyPassword = async (
  password: string, 
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

---

### 4. メールアドレスユニーク制約

**重要**: `staff.email` はグローバルユニーク（全テナント共通）

**理由**:
- 1つのメールアドレスで複数テナントにログイン可能
- ログイン時のテナント選択を実現

**実装例**:
```typescript
// メールアドレス重複チェック
export const checkEmailExists = async (
  prisma: any,
  email: string,
  tenantId: string,
  excludeId?: string
): Promise<boolean> => {
  const where: any = {
    email,
    isDeleted: false
  };
  
  if (excludeId) {
    where.id = { not: excludeId };
  }
  
  const existingStaff = await prisma.staff.findFirst({ where });
  return !!existingStaff;
};
```

---

## 🔗 PERMISSION_SYSTEMとの連携

### 1. 役職割り当てフロー

```
スタッフ作成
  ↓
Staff レコード作成（staff テーブル）
  ↓
StaffTenantMembership レコード作成（role_id 指定）
  ↓
権限自動付与（PERMISSION_SYSTEM）
```

### 2. 役職変更フロー

```
役職変更リクエスト
  ↓
StaffTenantMembership の role_id 更新
  ↓
権限キャッシュ無効化（Redis）
  ↓
次回API呼び出し時に新しい権限で認証
```

**実装参照**:
- [SSOT_SAAS_PERMISSION_SYSTEM.md - 6. スタッフ役職割り当てAPI](../01_admin_features/SSOT_SAAS_PERMISSION_SYSTEM.md#6-スタッフ役職割り当てapi)

---

## ✅ 実装チェックリスト

### データベース

- [ ] `staff`テーブル確認（MULTITENANT.md準拠）
- [ ] `staff_tenant_memberships`テーブル確認
- [ ] `staff.email` グローバルユニーク制約確認
- [ ] インデックス確認（`idx_staff_email`, `idx_staff_is_active`, `idx_staff_is_deleted`）

---

### API実装（hotel-common）

- [ ] `GET /api/v1/admin/staff`（一覧取得）
- [ ] `GET /api/v1/admin/staff/:id`（詳細取得）
- [ ] `POST /api/v1/admin/staff`（作成）
- [ ] `PUT /api/v1/admin/staff/:id`（更新）
- [ ] `DELETE /api/v1/admin/staff/:id`（削除）
- [ ] `PUT /api/v1/admin/staff/:id/password`（パスワード変更）
- [ ] `POST /api/v1/admin/staff/:id/tenants`（テナント追加）
- [ ] `DELETE /api/v1/admin/staff-tenants/:membershipId`（テナント削除）

---

### API実装（hotel-saas）

- [ ] 全hotel-commonエンドポイントへのプロキシAPI作成
- [ ] Session認証連携（Cookie転送）

---

### フロントエンド実装

- [ ] `/pages/admin/settings/staff/index.vue`（一覧）
- [ ] `/pages/admin/settings/staff/[id]/edit.vue`（編集）
- [ ] `/components/StaffCreateModal.vue`（作成モーダル）
- [ ] `/components/StaffPasswordResetModal.vue`（パスワードリセット）
- [ ] `/composables/useStaff.ts`（スタッフ管理用Composable）

---

### セキュリティ

- [ ] 権限チェック実装（全API）
- [ ] 自己操作制限（自分自身の削除・無効化禁止）
- [ ] パスワードハッシュ化（bcrypt、ソルトラウンド12）
- [ ] メールアドレス重複チェック
- [ ] 入力バリデーション（全API）

---

### PERMISSION_SYSTEMとの連携

- [ ] スタッフ作成時の役職割り当て
- [ ] 役職変更時の権限キャッシュ無効化
- [ ] 役職削除時のスタッフ保護（`ON DELETE RESTRICT`）

---

### テスト

- [ ] スタッフCRUD APIテスト
- [ ] 権限チェックテスト
- [ ] 自己操作制限テスト
- [ ] メールアドレスユニーク制約テスト
- [ ] パスワードセキュリティテスト
- [ ] PERMISSION_SYSTEM連携テスト

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
| 1.0.0 | 2025-10-19 | 初版作成<br>- スタッフCRUD完全仕様<br>- 複数テナント所属管理<br>- PERMISSION_SYSTEM連携<br>- パスワード管理<br>- セキュリティ制約 | Iza |

---

**🔖 このSSOTは、既存ドキュメント、ソースコード（staff-helpers.ts）、SSOT_SAAS_MULTITENANT.md、SSOT_SAAS_PERMISSION_SYSTEM.mdを基に作成されています。**  
**想像や推測による記載は一切含まれていません。**

