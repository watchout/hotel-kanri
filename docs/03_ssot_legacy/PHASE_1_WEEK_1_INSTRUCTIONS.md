# 📋 Phase 1 Week 1: 権限・メディア基盤 実装指示書

**期間**: 2025-10-15 〜 10-21（7日間）  
**目標**: 権限管理システムとメディア管理基盤の完成  
**優先度**: 🔴 **最優先**（全管理機能の前提条件）  
**担当**: Iza（権限・マルチテナント）、Sun（メディア管理）

---

## 📖 必読ドキュメント

### 全タスク共通
1. **SSOT_PROGRESS_MASTER.md**
   - パス: `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md`
   - Phase 1の全体像とタスク依存関係

2. **Phase 0完了レポート**
   - パス: `/Users/kaneko/hotel-kanri/docs/03_ssot/PHASE_0_COMPLETION_REPORT.md`
   - 前フェーズの成果と教訓

### タスク別必読SSOT
- **Task 1 (PERMISSION_SYSTEM)**: SSOT未作成 → **先に作成が必要**
- **Task 2 (MULTITENANT)**: `SSOT_SAAS_MULTITENANT.md` (v1.5.0)
- **Task 3-4 (MEDIA_MANAGEMENT)**: SSOT未作成 → **先に作成が必要**

---

## 🎯 Week 1 タスク一覧

| # | 項目 | 種別 | 担当 | 工数 | 依存関係 | 状態 |
|:-:|:-----|:----:|:----:|:----:|:---------|:----:|
| **1** | **PERMISSION_SYSTEM** | SSOT+実装 | Iza | 4日 | なし（最優先） | ❌ |
| **2** | MULTITENANT v1.6.0 | バージョンアップ | Iza | 1日 | Task 1完了後 | ❌ |
| **3** | MEDIA_MANAGEMENT | SSOT作成 | Sun | 2日 | Task 1と並行可 | ❌ |
| **4** | MEDIA_MANAGEMENT | 実装 | Sun | 3日 | Task 3完了後 | ❌ |

**Week 1 進捗**: 0/4 (0.0%)

---

## 🔴 Task 1: PERMISSION_SYSTEM（権限管理システム）実装

**担当**: Iza  
**工数**: 4日間  
**優先度**: 🔴 **最優先**（全管理機能の前提条件）  
**重要性**: このシステムが完成しないと、Phase 1 Week 2以降の全ての管理機能が実装できません

### 📋 実装ステップ

#### Step 1: SSOT作成（Day 1 午前）

**ファイル**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_PERMISSION_SYSTEM.md`

**必須項目**:

```markdown
# SSOT: 権限管理システム（Permission System）

**バージョン**: 1.0.0  
**作成日**: 2025-10-15  
**最終更新**: 2025-10-15  
**ステータス**: 🟢 策定完了  
**実装状況**: hotel-saas v0.0 / hotel-common v0.0

## 📋 概要

### 目的
- 管理者の権限を一元管理
- 画面・機能単位でアクセス制御
- ロール（役割）ベースの権限管理

### スコープ
- ✅ ロール定義（オーナー、マネージャー、スタッフ等）
- ✅ 権限定義（画面・機能単位）
- ✅ ロール-権限のマッピング
- ✅ ユーザー-ロールのマッピング
- ✅ 権限チェックミドルウェア
- ✅ 権限チェックComposable
- ❌ 動的権限（Phase 3以降）
- ❌ 組織階層権限（Phase 3以降）

## 🗄️ データベース設計

### テーブル構成

#### 1. roles（ロール）
```prisma
model Role {
  id          String   @id @default(uuid()) @map("role_id")
  tenantId    String   @map("tenant_id")
  name        String   // "オーナー"、"マネージャー"、"スタッフ"
  code        String   // "OWNER"、"MANAGER"、"STAFF"
  description String?
  priority    Int      // 優先度（数値が大きいほど権限強い）
  isSystem    Boolean  @default(false) @map("is_system") // システムロール
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  permissions RolePermission[]
  users       UserRole[]

  @@unique([tenantId, code])
  @@map("roles")
}
```

#### 2. permissions（権限）
```prisma
model Permission {
  id          String   @id @default(uuid()) @map("permission_id")
  name        String   // "注文管理"、"メニュー管理"
  code        String   @unique // "ORDER_MANAGE"、"MENU_MANAGE"
  category    String   // "ORDER"、"MENU"、"ROOM"、"STAFF"
  description String?
  isSystem    Boolean  @default(true) @map("is_system")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  roles       RolePermission[]

  @@map("permissions")
}
```

#### 3. role_permissions（ロール-権限マッピング）
```prisma
model RolePermission {
  roleId       String   @map("role_id")
  permissionId String   @map("permission_id")
  createdAt    DateTime @default(now()) @map("created_at")

  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}
```

#### 4. user_roles（ユーザー-ロールマッピング）
```prisma
model UserRole {
  userId    String   @map("user_id")
  roleId    String   @map("role_id")
  tenantId  String   @map("tenant_id")
  createdAt DateTime @default(now()) @map("created_at")

  role      Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_roles")
}
```

### マイグレーション順序
1. `permissions` テーブル作成
2. `roles` テーブル作成
3. `role_permissions` テーブル作成
4. `user_roles` テーブル作成
5. システム権限・ロールの初期データ投入

## 🔧 API設計

### hotel-common API

#### 1. 権限チェックAPI
```typescript
GET /api/v1/permissions/check
Query: { tenantId, userId, permissionCode }
Response: { hasPermission: boolean }
```

#### 2. ユーザー権限一覧取得
```typescript
GET /api/v1/permissions/user/:userId
Query: { tenantId }
Response: { permissions: Permission[], roles: Role[] }
```

#### 3. ロール一覧取得
```typescript
GET /api/v1/roles
Query: { tenantId }
Response: { roles: Role[] }
```

#### 4. ロール作成
```typescript
POST /api/v1/roles
Body: { tenantId, name, code, description, priority, permissionIds }
Response: { role: Role }
```

#### 5. ロール-権限更新
```typescript
PUT /api/v1/roles/:roleId/permissions
Body: { permissionIds: string[] }
Response: { success: boolean }
```

#### 6. ユーザー-ロール割り当て
```typescript
POST /api/v1/users/:userId/roles
Body: { tenantId, roleIds: string[] }
Response: { success: boolean }
```

### hotel-saas API（プロキシ）

全てhotel-common APIを呼び出すプロキシとして実装。

## 🎨 フロントエンド設計

### Composable: `usePermissions()`

```typescript
// composables/usePermissions.ts
export const usePermissions = () => {
  const hasPermission = async (permissionCode: string): Promise<boolean> => {
    // セッションからテナントID・ユーザーIDを取得
    // hotel-common APIで権限チェック
  };

  const hasAnyPermission = async (permissionCodes: string[]): Promise<boolean> => {
    // いずれかの権限を持っているかチェック
  };

  const hasAllPermissions = async (permissionCodes: string[]): Promise<boolean> => {
    // 全ての権限を持っているかチェック
  };

  return { hasPermission, hasAnyPermission, hasAllPermissions };
};
```

### Middleware: `permission.ts`

```typescript
// middleware/permission.ts
export default defineNuxtRouteMiddleware(async (to, from) => {
  const requiredPermission = to.meta.permission as string | undefined;
  
  if (!requiredPermission) {
    return; // 権限不要なページ
  }

  const { hasPermission } = usePermissions();
  const allowed = await hasPermission(requiredPermission);

  if (!allowed) {
    return navigateTo('/admin/forbidden');
  }
});
```

### ページ定義例

```vue
<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'permission'],
  permission: 'ORDER_MANAGE' // 必要な権限
});
</script>
```

## 📊 初期データ

### システム権限
- ORDER_VIEW: 注文閲覧
- ORDER_MANAGE: 注文管理
- MENU_VIEW: メニュー閲覧
- MENU_MANAGE: メニュー管理
- ROOM_VIEW: 客室閲覧
- ROOM_MANAGE: 客室管理
- STAFF_VIEW: スタッフ閲覧
- STAFF_MANAGE: スタッフ管理
- SYSTEM_MANAGE: システム設定管理

### システムロール
- OWNER: オーナー（全権限）
- MANAGER: マネージャー（SYSTEM_MANAGE以外）
- STAFF: スタッフ（VIEW系のみ）

## ⚠️ 制約事項

1. **テナント分離必須**: 全てのロール・権限はテナントIDで分離
2. **システムロール保護**: isSystem=trueのロールは削除・編集不可
3. **権限キャッシュ**: ユーザー権限は5分間キャッシュ（Redis）
4. **優先度管理**: ロールのpriorityで権限の強さを管理
```

---

#### Step 2: データベース実装（Day 1 午後 〜 Day 2 午前）

**担当システム**: hotel-common

##### 2-1. Prismaスキーマ更新

**ファイル**: `/Users/kaneko/hotel-common/prisma/schema.prisma`

**追加内容**:
- SSOTの4テーブル定義を追加
- `@@map`ディレクティブでsnake_case指定必須
- リレーション設定

##### 2-2. マイグレーション作成

```bash
cd /Users/kaneko/hotel-common
npx prisma migrate dev --name add_permission_system
```

##### 2-3. 初期データ投入

**ファイル**: `/Users/kaneko/hotel-common/prisma/seeds/permissions.ts`

```typescript
// システム権限の投入
const permissions = [
  { name: '注文閲覧', code: 'ORDER_VIEW', category: 'ORDER' },
  { name: '注文管理', code: 'ORDER_MANAGE', category: 'ORDER' },
  // ... 他の権限
];

// システムロールの投入
const roles = [
  { name: 'オーナー', code: 'OWNER', priority: 100, isSystem: true },
  { name: 'マネージャー', code: 'MANAGER', priority: 50, isSystem: true },
  { name: 'スタッフ', code: 'STAFF', priority: 10, isSystem: true },
];

// ロール-権限のマッピング
```

---

#### Step 3: hotel-common API実装（Day 2 午後 〜 Day 3）

##### 3-1. 権限チェックサービス

**ファイル**: `/Users/kaneko/hotel-common/src/services/permission.service.ts`

```typescript
export class PermissionService {
  async checkPermission(
    tenantId: string,
    userId: string,
    permissionCode: string
  ): Promise<boolean> {
    // 1. キャッシュ確認（Redis）
    // 2. ユーザーのロール取得
    // 3. ロールの権限取得
    // 4. 権限コード照合
    // 5. キャッシュ保存
  }

  async getUserPermissions(
    tenantId: string,
    userId: string
  ): Promise<{ permissions: Permission[], roles: Role[] }> {
    // ユーザーの全権限・ロール取得
  }
}
```

##### 3-2. API Routes実装

**ディレクトリ**: `/Users/kaneko/hotel-common/src/routes/permissions/`

実装ファイル:
- `check.get.ts` - 権限チェック
- `user-permissions.get.ts` - ユーザー権限一覧
- `roles.get.ts` - ロール一覧
- `roles.post.ts` - ロール作成
- `role-permissions.put.ts` - ロール-権限更新
- `user-roles.post.ts` - ユーザー-ロール割り当て

**全APIで必須**:
- ✅ テナントID検証
- ✅ 認証チェック（Session）
- ✅ エラーハンドリング
- ✅ ログ出力

---

#### Step 4: hotel-saas実装（Day 4）

##### 4-1. Composable実装

**ファイル**: `/Users/kaneko/hotel-saas/composables/usePermissions.ts`

```typescript
export const usePermissions = () => {
  const hasPermission = async (permissionCode: string): Promise<boolean> => {
    try {
      const { data } = await $fetch('/api/v1/permissions/check', {
        params: { permissionCode }
      });
      return data.hasPermission;
    } catch (error) {
      console.error('権限チェックエラー:', error);
      return false;
    }
  };

  // ... 他のメソッド
};
```

##### 4-2. Middleware実装

**ファイル**: `/Users/kaneko/hotel-saas/middleware/permission.ts`

```typescript
export default defineNuxtRouteMiddleware(async (to, from) => {
  const requiredPermission = to.meta.permission as string | undefined;
  
  if (!requiredPermission) {
    return;
  }

  const { hasPermission } = usePermissions();
  const allowed = await hasPermission(requiredPermission);

  if (!allowed) {
    return navigateTo('/admin/forbidden');
  }
});
```

##### 4-3. 管理画面への適用

**対象ページ**:
- `/pages/admin/orders/**` → `permission: 'ORDER_MANAGE'`
- `/pages/admin/menu/**` → `permission: 'MENU_MANAGE'`
- `/pages/admin/rooms/**` → `permission: 'ROOM_MANAGE'`
- `/pages/admin/staff/**` → `permission: 'STAFF_MANAGE'`
- `/pages/admin/system/**` → `permission: 'SYSTEM_MANAGE'`

**各ページに追加**:
```vue
<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'permission'],
  permission: 'ORDER_MANAGE' // 適切な権限コード
});
</script>
```

##### 4-4. 権限管理画面作成

**ファイル**: `/Users/kaneko/hotel-saas/pages/admin/system/permissions.vue`

**機能**:
- ロール一覧表示
- ロール作成・編集
- ロール-権限マッピング編集
- スタッフへのロール割り当て

---

#### Step 5: テスト・検証（Day 4 午後）

##### 5-1. 単体テスト

```bash
# hotel-common
cd /Users/kaneko/hotel-common
npm run test -- src/services/permission.service.test.ts

# hotel-saas
cd /Users/kaneko/hotel-saas
npm run test -- composables/usePermissions.test.ts
```

##### 5-2. 統合テスト

**テストシナリオ**:
1. オーナーロールは全権限アクセス可能
2. マネージャーロールはSYSTEM_MANAGE以外アクセス可能
3. スタッフロールはVIEW系のみアクセス可能
4. 権限なしユーザーは403エラー

##### 5-3. 動作確認

```bash
# hotel-common起動
cd /Users/kaneko/hotel-common
npm run dev

# hotel-saas起動
cd /Users/kaneko/hotel-saas
npm run dev
```

**確認項目**:
- [ ] ロール作成・編集が正常動作
- [ ] 権限チェックが正常動作
- [ ] ページアクセス制御が正常動作
- [ ] テナント分離が正常動作
- [ ] キャッシュが正常動作

---

### Task 1 完了条件

- [ ] SSOT作成完了（v1.0.0）
- [ ] データベーステーブル作成完了
- [ ] 初期データ投入完了
- [ ] hotel-common API実装完了
- [ ] hotel-saas Composable/Middleware実装完了
- [ ] 権限管理画面作成完了
- [ ] **単体テスト完了**（15テストケース全合格）
- [ ] **ブラウザ目視テスト完了**（10テストケース全合格） ← NEW!
- [ ] 動作確認完了
- [ ] ドキュメント更新完了

**📋 ブラウザ目視テスト項目**: `/Users/kaneko/hotel-kanri/docs/03_ssot/PERMISSION_SYSTEM_BROWSER_TEST.md`

---

## 🟡 Task 2: MULTITENANT v1.6.0 バージョンアップ

**担当**: Iza  
**工数**: 1日間  
**依存**: Task 1完了後に着手  
**目的**: 権限システム統合、テナント管理強化

### 📋 実装内容

#### 2-1. SSOT更新

**ファイル**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md`

**変更内容**:
- バージョン: v1.5.0 → **v1.6.0**
- 追加機能: 権限システムとの統合
- テナント作成時に自動的にシステムロール作成
- テナント削除時にロール・権限も削除

#### 2-2. hotel-common実装

**ファイル**: `/Users/kaneko/hotel-common/src/services/tenant.service.ts`

```typescript
export class TenantService {
  async createTenant(data: CreateTenantDto): Promise<Tenant> {
    // 1. テナント作成
    const tenant = await prisma.tenant.create({ data });
    
    // 2. システムロール自動作成（NEW）
    await this.createSystemRoles(tenant.id);
    
    // 3. 初期管理者にオーナーロール割り当て（NEW）
    await this.assignOwnerRole(tenant.id, data.adminUserId);
    
    return tenant;
  }

  async deleteTenant(tenantId: string): Promise<void> {
    // 1. ロール・権限削除（NEW）
    await prisma.role.deleteMany({ where: { tenantId } });
    
    // 2. テナント削除
    await prisma.tenant.delete({ where: { id: tenantId } });
  }

  private async createSystemRoles(tenantId: string): Promise<void> {
    // オーナー、マネージャー、スタッフロールを作成
  }
}
```

#### 2-3. テスト

**確認項目**:
- [ ] テナント作成時にシステムロール自動作成
- [ ] テナント削除時にロール・権限も削除
- [ ] 初期管理者にオーナーロール割り当て

### Task 2 完了条件

- [ ] SSOT更新完了（v1.6.0）
- [ ] hotel-common実装完了
- [ ] hotel-saas実装完了（必要に応じて）
- [ ] テスト完了
- [ ] 動作確認完了

---

## 🟡 Task 3: MEDIA_MANAGEMENT SSOT作成

**担当**: Sun  
**工数**: 2日間  
**依存**: Task 1と並行作業可能  
**目的**: 画像・動画管理の仕様策定

### 📋 作成内容

#### 3-1. SSOT作成

**ファイル**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_MEDIA_MANAGEMENT.md`

**必須項目**:

```markdown
# SSOT: メディア管理（Media Management）

**バージョン**: 1.0.0  
**作成日**: 2025-10-XX  
**ステータス**: 🟢 策定完了  
**実装状況**: hotel-saas v0.0 / hotel-common v0.0

## 📋 概要

### 目的
- 画像・動画の一元管理
- メニュー画像、キャンペーン画像等の管理
- AIコンシェルジュ用メディア管理

### スコープ
- ✅ 画像アップロード（JPG, PNG, WebP）
- ✅ 動画アップロード（MP4）
- ✅ サムネイル自動生成
- ✅ メディアタグ管理
- ✅ メディアカテゴリ管理
- ✅ ストレージ管理（S3 or ローカル）
- ❌ 画像編集機能（Phase 3以降）
- ❌ 動画編集機能（Phase 3以降）

## 🗄️ データベース設計

### media テーブル
```prisma
model Media {
  id          String   @id @default(uuid()) @map("media_id")
  tenantId    String   @map("tenant_id")
  fileName    String   @map("file_name")
  fileType    String   @map("file_type") // "image/jpeg", "video/mp4"
  fileSize    Int      @map("file_size") // bytes
  width       Int?     // 画像の幅
  height      Int?     // 画像の高さ
  duration    Int?     // 動画の長さ（秒）
  url         String   // アクセスURL
  thumbnailUrl String? @map("thumbnail_url")
  category    String   // "menu", "campaign", "ai", "other"
  tags        String[] // タグ配列
  createdBy   String   @map("created_by")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("media")
}
```

## 🔧 API設計

### 1. メディアアップロード
```typescript
POST /api/v1/media/upload
Content-Type: multipart/form-data
Body: { file, category, tags }
Response: { media: Media }
```

### 2. メディア一覧取得
```typescript
GET /api/v1/media
Query: { tenantId, category?, tags?, page, limit }
Response: { media: Media[], total: number }
```

### 3. メディア削除
```typescript
DELETE /api/v1/media/:mediaId
Response: { success: boolean }
```

## 📦 ストレージ設計

### ファイルパス構造
```
/media/{tenantId}/{category}/{year}/{month}/{uuid}.{ext}
/media/thumbnails/{tenantId}/{category}/{year}/{month}/{uuid}_thumb.{ext}
```

### ストレージプロバイダー
- 開発環境: ローカルストレージ（`/public/uploads/`）
- 本番環境: AWS S3 or 互換ストレージ

## ⚠️ 制約事項

1. **ファイルサイズ制限**: 
   - 画像: 最大10MB
   - 動画: 最大100MB
2. **対応フォーマット**:
   - 画像: JPG, PNG, WebP
   - 動画: MP4
3. **サムネイル**: 自動生成（200x200px）
4. **権限**: MEDIA_MANAGE権限必須
```

#### 3-2. レビュー・承認

**レビュアー**: Iza（統合管理）

**確認項目**:
- [ ] データベース設計の妥当性
- [ ] API設計の妥当性
- [ ] ストレージ設計の妥当性
- [ ] 権限システムとの統合
- [ ] テナント分離の実装

### Task 3 完了条件

- [ ] SSOT作成完了（v1.0.0）
- [ ] レビュー完了
- [ ] 承認完了

---

## 🟡 Task 4: MEDIA_MANAGEMENT 実装

**担当**: Sun  
**工数**: 3日間  
**依存**: Task 3完了後に着手  
**目的**: メディア管理機能の実装

### 📋 実装ステップ

#### 4-1. データベース実装（Day 1 午前）

**ファイル**: `/Users/kaneko/hotel-common/prisma/schema.prisma`

- `media`テーブル追加
- マイグレーション実行

#### 4-2. hotel-common API実装（Day 1 午後 〜 Day 2）

**ディレクトリ**: `/Users/kaneko/hotel-common/src/routes/media/`

実装ファイル:
- `upload.post.ts` - アップロード処理
- `list.get.ts` - 一覧取得
- `delete.delete.ts` - 削除処理

**実装内容**:
- ファイルアップロード処理
- サムネイル自動生成（Sharp.js使用）
- ストレージ保存（ローカル or S3）
- データベース登録

#### 4-3. hotel-saas実装（Day 2 午後 〜 Day 3）

**Composable**: `/Users/kaneko/hotel-saas/composables/useMedia.ts`

```typescript
export const useMedia = () => {
  const uploadMedia = async (file: File, category: string, tags: string[]) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('tags', JSON.stringify(tags));

    return await $fetch('/api/v1/media/upload', {
      method: 'POST',
      body: formData
    });
  };

  const getMedia = async (params: MediaQuery) => {
    return await $fetch('/api/v1/media', { params });
  };

  return { uploadMedia, getMedia };
};
```

**管理画面**: `/Users/kaneko/hotel-saas/pages/admin/media/index.vue`

**機能**:
- メディアアップロード
- メディア一覧表示（グリッド表示）
- メディア削除
- カテゴリ・タグフィルター

#### 4-4. テスト・検証（Day 3 午後）

**確認項目**:
- [ ] 画像アップロード正常動作
- [ ] 動画アップロード正常動作
- [ ] サムネイル自動生成
- [ ] ファイルサイズ制限
- [ ] 権限チェック動作
- [ ] テナント分離動作

### Task 4 完了条件

- [ ] データベーステーブル作成完了
- [ ] hotel-common API実装完了
- [ ] hotel-saas実装完了
- [ ] 管理画面作成完了
- [ ] テスト完了
- [ ] 動作確認完了

---

## ✅ Week 1 完了条件

### 必須条件

- [ ] **Task 1: PERMISSION_SYSTEM 完了**
  - [ ] SSOT v1.0.0 作成完了
  - [ ] hotel-common/saas実装完了
  - [ ] 全管理画面で権限チェック動作
  
- [ ] **Task 2: MULTITENANT v1.6.0 完了**
  - [ ] SSOT v1.6.0 更新完了
  - [ ] 権限システム統合完了
  
- [ ] **Task 3: MEDIA_MANAGEMENT SSOT 完了**
  - [ ] SSOT v1.0.0 作成完了
  - [ ] レビュー・承認完了
  
- [ ] **Task 4: MEDIA_MANAGEMENT 実装完了**
  - [ ] hotel-common/saas実装完了
  - [ ] 管理画面作成完了

### 品質条件

- [ ] 全APIでエラーハンドリング実装
- [ ] 全APIでテナントID検証実装
- [ ] 全APIでSession認証チェック実装
- [ ] ログ出力実装
- [ ] テスト実装・実行完了

### ドキュメント条件

- [ ] SSOT更新完了
- [ ] 進捗管理マスター更新完了
- [ ] 実装状況記録完了

---

## 📊 進捗報告フォーマット

Week 1完了後、以下のフォーマットで報告してください：

```markdown
## Phase 1 Week 1 完了報告

### Task 1: PERMISSION_SYSTEM
- [x] 完了
- SSOT: v1.0.0
- hotel-saas実装: v1.0.0
- hotel-common実装: v1.0.0

### Task 2: MULTITENANT v1.6.0
- [x] 完了
- SSOT: v1.6.0
- hotel-saas実装: v1.6.0
- hotel-common実装: v1.6.0

### Task 3: MEDIA_MANAGEMENT SSOT
- [x] 完了
- SSOT: v1.0.0

### Task 4: MEDIA_MANAGEMENT 実装
- [x] 完了
- hotel-saas実装: v1.0.0
- hotel-common実装: v1.0.0

### 動作確認
- [x] 権限システム動作確認完了
- [x] メディア管理動作確認完了
- [x] テナント分離確認完了

Phase 1 Week 1 完了しました。Week 2に進みます。
```

---

## 🔗 関連ドキュメント

- **進捗管理マスター**: `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md`
- **Phase 0完了レポート**: `/Users/kaneko/hotel-kanri/docs/03_ssot/PHASE_0_COMPLETION_REPORT.md`
- **SSOT一覧**: `/Users/kaneko/hotel-kanri/docs/03_ssot/README.md`
- **実装ガードレール**: `/Users/kaneko/hotel-kanri/.cursor/prompts/ssot_implementation_guard.md`

---

**Phase 1 Week 1 実装指示書**  
**作成日**: 2025年10月13日  
**作成者**: 統合管理（Iza）  
**バージョン**: 1.0.0

