# 権限管理システム強化計画

## 概要

hotel-saasシステムの権限管理システムを強化し、より細かな権限制御と柔軟な権限管理を実現するための計画書です。現在の基本的な権限管理から、機能ごとの詳細な権限制御が可能なシステムへと拡張します。

## 現状分析

### 現在の権限管理システム

現在のhotel-saasシステムでは、以下のシンプルな権限管理を実装しています：

1. **ロールベースの権限管理**
   - `super_admin`: システム全体の管理者
   - `admin`: テナント内の管理者
   - `staff`: 一般スタッフ

2. **権限レベル**
   - `READ`: 読み取り権限
   - `WRITE`: 書き込み権限
   - `ADMIN`: 管理者権限

3. **実装方法**
   - `permission-check.ts`ミドルウェアによる権限チェック
   - JWTトークンに含まれるロール情報の検証

### 現状の課題

1. **粒度の粗さ**: 機能ごとの細かな権限設定ができない
2. **柔軟性の不足**: ユーザーごとにカスタマイズされた権限設定ができない
3. **監査の困難さ**: 権限変更の履歴や監査が難しい
4. **動的な権限変更**: 運用中の権限変更が難しい

## 強化計画

### 1. 権限モデルの拡張

#### 1.1 機能ベースの権限管理

```typescript
// 機能カテゴリの定義
enum FeatureCategory {
  ROOM_MANAGEMENT = 'room_management',
  ORDER_MANAGEMENT = 'order_management',
  MENU_MANAGEMENT = 'menu_management',
  STAFF_MANAGEMENT = 'staff_management',
  TENANT_MANAGEMENT = 'tenant_management',
  STATISTICS = 'statistics',
  CONCIERGE = 'concierge',
  SETTINGS = 'settings'
}

// 権限レベルの定義（既存）
enum PermissionLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 3
}

// 権限マップの定義
interface PermissionMap {
  [key: string]: PermissionLevel;
}
```

#### 1.2 ロールテンプレートの導入

```typescript
// ロールテンプレートの定義
interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  permissions: PermissionMap;
  isSystem: boolean; // システム定義のロールかどうか
  tenantId: string | null; // テナント固有のロールの場合はテナントID
}

// システム定義のロールテンプレート
const systemRoleTemplates: RoleTemplate[] = [
  {
    id: 'super_admin',
    name: 'スーパー管理者',
    description: 'システム全体の管理者',
    permissions: {
      [FeatureCategory.ROOM_MANAGEMENT]: PermissionLevel.ADMIN,
      [FeatureCategory.ORDER_MANAGEMENT]: PermissionLevel.ADMIN,
      // ... 他の機能も同様に
    },
    isSystem: true,
    tenantId: null
  },
  // ... 他のロールテンプレート
];
```

#### 1.3 スタッフ権限の拡張

```typescript
// スタッフ権限の定義
interface StaffPermission {
  staffId: string;
  roleTemplateId: string | null; // ロールテンプレートを使用する場合
  customPermissions: PermissionMap | null; // カスタム権限を使用する場合
  overridePermissions: PermissionMap | null; // ロールテンプレートの一部を上書きする場合
  updatedAt: Date;
  updatedBy: string;
}
```

### 2. データベーススキーマの拡張

```sql
-- ロールテンプレートテーブル
CREATE TABLE "role_template" (
  "id" VARCHAR(36) PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "permissions" JSONB NOT NULL,
  "is_system" BOOLEAN NOT NULL DEFAULT false,
  "tenant_id" VARCHAR(36),
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenant_id") REFERENCES "Tenant" ("id") ON DELETE CASCADE
);

-- スタッフ権限テーブル
CREATE TABLE "staff_permission" (
  "staff_id" VARCHAR(36) PRIMARY KEY,
  "role_template_id" VARCHAR(36),
  "custom_permissions" JSONB,
  "override_permissions" JSONB,
  "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_by" VARCHAR(36) NOT NULL,
  FOREIGN KEY ("staff_id") REFERENCES "staff" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("role_template_id") REFERENCES "role_template" ("id") ON DELETE SET NULL,
  FOREIGN KEY ("updated_by") REFERENCES "staff" ("id") ON DELETE NO ACTION
);

-- 権限変更履歴テーブル
CREATE TABLE "permission_change_log" (
  "id" VARCHAR(36) PRIMARY KEY,
  "staff_id" VARCHAR(36) NOT NULL,
  "changed_by" VARCHAR(36) NOT NULL,
  "previous_permissions" JSONB,
  "new_permissions" JSONB NOT NULL,
  "change_reason" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("staff_id") REFERENCES "staff" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("changed_by") REFERENCES "staff" ("id") ON DELETE NO ACTION
);
```

### 3. 権限チェックミドルウェアの強化

```typescript
// server/middleware/enhanced-permission-check.ts
import { H3Event } from 'h3'
import { FeatureCategory, PermissionLevel } from '~/types/permissions'

export async function checkEnhancedPermission(
  event: H3Event,
  feature: FeatureCategory,
  requiredLevel: PermissionLevel
): Promise<boolean> {
  try {
    // セッションからユーザー情報を取得
    const session = await getServerSession(event)
    if (!session || !session.user) {
      return false
    }

    const user = session.user as any
    const userId = user.userId || user.id

    // スタッフ権限を取得
    const staffPermission = await prisma.staffPermission.findUnique({
      where: { staff_id: userId },
      include: {
        roleTemplate: true
      }
    })

    if (!staffPermission) {
      // 権限情報がない場合はスタッフのロールから判断
      return checkLegacyPermission(event, feature, requiredLevel)
    }

    // 権限レベルを取得
    let permissionLevel = PermissionLevel.NONE

    // 1. オーバーライド権限をチェック
    if (staffPermission.override_permissions &&
        staffPermission.override_permissions[feature] !== undefined) {
      permissionLevel = staffPermission.override_permissions[feature]
    }
    // 2. カスタム権限をチェック
    else if (staffPermission.custom_permissions &&
             staffPermission.custom_permissions[feature] !== undefined) {
      permissionLevel = staffPermission.custom_permissions[feature]
    }
    // 3. ロールテンプレートをチェック
    else if (staffPermission.roleTemplate &&
             staffPermission.roleTemplate.permissions[feature] !== undefined) {
      permissionLevel = staffPermission.roleTemplate.permissions[feature]
    }

    // スーパー管理者は常に全ての権限を持つ
    if (user.role === 'super_admin') {
      return true
    }

    // 権限レベルを比較
    return permissionLevel >= requiredLevel
  } catch (error) {
    console.error('権限チェックエラー:', error)
    return false
  }
}

// 従来の権限チェック（後方互換性のため）
async function checkLegacyPermission(
  event: H3Event,
  feature: FeatureCategory,
  requiredLevel: PermissionLevel
): Promise<boolean> {
  // 従来の権限チェックロジック
  // ...
}
```

### 4. 管理画面の実装

#### 4.1 権限管理画面

- ロールテンプレート管理
  - テンプレートの作成・編集・削除
  - 権限の詳細設定
- スタッフ権限管理
  - ロールテンプレートの割り当て
  - カスタム権限の設定
  - 権限の上書き
- 権限変更履歴
  - 変更履歴の表示
  - 変更理由の記録

#### 4.2 APIエンドポイント

```typescript
// ロールテンプレート管理API
// server/api/v1/admin/role-templates/index.get.ts
// server/api/v1/admin/role-templates/[id].get.ts
// server/api/v1/admin/role-templates/index.post.ts
// server/api/v1/admin/role-templates/[id].put.ts
// server/api/v1/admin/role-templates/[id].delete.ts

// スタッフ権限管理API
// server/api/v1/admin/staff-permissions/index.get.ts
// server/api/v1/admin/staff-permissions/[staffId].get.ts
// server/api/v1/admin/staff-permissions/[staffId].put.ts

// 権限変更履歴API
// server/api/v1/admin/permission-logs/index.get.ts
// server/api/v1/admin/permission-logs/staff/[staffId].get.ts
```

## 実装計画

### フェーズ1: 基盤実装（2025年8月）

1. データベーススキーマの拡張
2. 権限モデルの実装
3. 権限チェックミドルウェアの強化
4. 基本的なAPIエンドポイントの実装

### フェーズ2: 管理画面実装（2025年9月）

1. ロールテンプレート管理画面の実装
2. スタッフ権限管理画面の実装
3. 権限変更履歴画面の実装

### フェーズ3: 統合とテスト（2025年9月〜10月）

1. 既存システムとの統合
2. 包括的なテスト
3. ドキュメント作成
4. スタッフトレーニング

## リスク評価

| リスク | 影響度 | 発生確率 | 対策 |
|------|--------|---------|------|
| 既存機能への影響 | 高 | 中 | 段階的な導入と徹底したテスト |
| パフォーマンス低下 | 中 | 低 | 権限キャッシュの実装 |
| 複雑性の増加 | 中 | 高 | 明確なドキュメントとトレーニング |
| 移行の困難さ | 高 | 中 | 後方互換性の維持と段階的移行 |

## 期待される効果

1. **細かな権限制御**: 機能ごとに詳細な権限設定が可能に
2. **柔軟な権限管理**: テナントやユーザーごとにカスタマイズ可能
3. **監査の容易さ**: 権限変更の履歴を追跡可能
4. **運用効率の向上**: 管理画面による簡単な権限設定
5. **セキュリティの向上**: 最小権限の原則に基づいた権限設定

## 結論

権限管理システムの強化により、hotel-saasシステムのセキュリティと運用効率が大幅に向上します。機能ベースの権限管理とロールテンプレートの導入により、より細かな権限制御と柔軟な権限管理が可能になります。段階的な実装計画により、リスクを最小限に抑えながら、システムの強化を進めます。
