# 📋 hotel-saas PERMISSION_SYSTEM実装指示書

**作成日**: 2025年10月14日  
**対象**: hotel-saas（Sun担当）  
**前提**: hotel-common PERMISSION_SYSTEM API実装完了（v0.5）  
**目標**: hotel-saas側の権限管理機能完全実装  
**工数**: 2日間（Day 3-4）

---

## 🎯 実装概要

### 完了済み（hotel-common）
- ✅ PermissionService実装（7メソッド）
- ✅ API Routes実装（6エンドポイント）
- ✅ 単体テスト完了（15テスト合格）
- ✅ 実動作確認完了

### これから実装（hotel-saas）
- 🔵 Composable: `usePermissions.ts`
- 🔵 Middleware: `permission.ts`
- 🔵 APIプロキシ: 6エンドポイント
- 🔵 既存ページへの権限チェック追加
- 🔵 権限管理画面: `permissions.vue`
- 🔵 403エラーページ: `forbidden.vue`

---

## 📖 必読ドキュメント

### 実装開始前に必ず読むこと

1. **SSOT**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_PERMISSION_SYSTEM.md`
   - 特に「フロントエンド設計（hotel-saas）」セクション（L719-L930）
   - 「実装チェックリスト」セクション（L1610-L1650）

2. **マルチテナントSSO**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md`
   - テナントID検証の必須要件

3. **Session認証SSOT**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md`
   - Session認証の実装状況

---

## 📋 実装順序

### Step 1: 基盤実装

1. Composable実装 + 単体テスト
2. Middleware実装 + テスト
3. APIプロキシ実装（6エンドポイント）
4. 既存ページへの権限チェック追加

### Step 2: 画面実装 + テスト

1. サイドバーメニュー追加（権限管理リンク）
2. 権限管理画面実装
3. 403エラーページ実装
4. 動作確認（APIテスト + 手動UIテスト）

---

## 📝 Step 1: 基盤実装

### 1-1. Composable実装

#### ファイル作成

```bash
touch /Users/kaneko/hotel-saas/composables/usePermissions.ts
```

#### 実装内容

**ファイル**: `/Users/kaneko/hotel-saas/composables/usePermissions.ts`

```typescript
/**
 * SSOT: SSOT_PERMISSION_SYSTEM.md v1.0.0
 * 権限チェックComposable
 * 
 * 【重要】
 * - hotel-commonのAPIをプロキシ経由で呼び出す
 * - Session認証が前提（Cookieに hotel-session-id が必要）
 * - エラー時はfalse/空配列を返す（ユーザーに影響を与えない）
 */

export const usePermissions = () => {
  /**
   * 単一権限チェック
   * @param permissionCode 権限コード（例: "ORDER_MANAGE"）
   * @returns 権限があればtrue
   */
  const hasPermission = async (permissionCode: string): Promise<boolean> => {
    try {
      const response = await $fetch<{ hasPermission: boolean }>('/api/v1/permissions/check', {
        params: { permission_code: permissionCode }
      });
      return response.hasPermission;
    } catch (error) {
      console.error('[usePermissions] hasPermission error:', error);
      return false; // エラー時は権限なしとして扱う
    }
  };

  /**
   * いずれか1つの権限チェック
   * @param permissionCodes 権限コード配列
   * @returns いずれか1つでも権限があればtrue
   */
  const hasAnyPermission = async (permissionCodes: string[]): Promise<boolean> => {
    try {
      const results = await Promise.all(
        permissionCodes.map(code => hasPermission(code))
      );
      return results.some(result => result === true);
    } catch (error) {
      console.error('[usePermissions] hasAnyPermission error:', error);
      return false;
    }
  };

  /**
   * 全ての権限チェック
   * @param permissionCodes 権限コード配列
   * @returns 全ての権限があればtrue
   */
  const hasAllPermissions = async (permissionCodes: string[]): Promise<boolean> => {
    try {
      const results = await Promise.all(
        permissionCodes.map(code => hasPermission(code))
      );
      return results.every(result => result === true);
    } catch (error) {
      console.error('[usePermissions] hasAllPermissions error:', error);
      return false;
    }
  };

  /**
   * ユーザー権限一覧取得
   * @returns 権限コード配列
   */
  const getUserPermissions = async (): Promise<string[]> => {
    try {
      const response = await $fetch<{ permissions: string[] }>('/api/v1/permissions/user-permissions');
      return response.permissions;
    } catch (error) {
      console.error('[usePermissions] getUserPermissions error:', error);
      return [];
    }
  };

  /**
   * UIコンポーネント用: 権限に応じて要素を表示/非表示
   * @param permissionCode 権限コード
   * @returns Reactive boolean
   */
  const canAccess = async (permissionCode: string) => {
    return await hasPermission(permissionCode);
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getUserPermissions,
    canAccess
  };
};
```

#### 単体テスト

**ファイル**: `/Users/kaneko/hotel-saas/composables/__tests__/usePermissions.test.ts`

```typescript
import { describe, test, expect, vi } from 'vitest';
import { usePermissions } from '../usePermissions';

// $fetchのモック
global.$fetch = vi.fn();

describe('usePermissions', () => {
  test('hasPermission: 権限あり', async () => {
    (global.$fetch as any).mockResolvedValue({ hasPermission: true });
    
    const { hasPermission } = usePermissions();
    const result = await hasPermission('ORDER_MANAGE');
    
    expect(result).toBe(true);
  });

  test('hasPermission: 権限なし', async () => {
    (global.$fetch as any).mockResolvedValue({ hasPermission: false });
    
    const { hasPermission } = usePermissions();
    const result = await hasPermission('SYSTEM_MANAGE');
    
    expect(result).toBe(false);
  });

  test('hasAnyPermission: いずれか1つ権限あり', async () => {
    (global.$fetch as any).mockImplementation((url, options) => {
      if (options?.params?.permission_code === 'ORDER_MANAGE') {
        return Promise.resolve({ hasPermission: true });
      }
      return Promise.resolve({ hasPermission: false });
    });
    
    const { hasAnyPermission } = usePermissions();
    const result = await hasAnyPermission(['ORDER_MANAGE', 'SYSTEM_MANAGE']);
    
    expect(result).toBe(true);
  });

  test('hasAllPermissions: 全て権限あり', async () => {
    (global.$fetch as any).mockResolvedValue({ hasPermission: true });
    
    const { hasAllPermissions } = usePermissions();
    const result = await hasAllPermissions(['ORDER_MANAGE', 'MENU_MANAGE']);
    
    expect(result).toBe(true);
  });

  test('getUserPermissions: 権限一覧取得', async () => {
    (global.$fetch as any).mockResolvedValue({
      permissions: ['ORDER_VIEW', 'MENU_VIEW']
    });
    
    const { getUserPermissions } = usePermissions();
    const result = await getUserPermissions();
    
    expect(result).toEqual(['ORDER_VIEW', 'MENU_VIEW']);
  });

  test('エラー時: falseを返す', async () => {
    (global.$fetch as any).mockRejectedValue(new Error('API Error'));
    
    const { hasPermission } = usePermissions();
    const result = await hasPermission('ORDER_MANAGE');
    
    expect(result).toBe(false);
  });
});
```

---

### 1-2. Middleware実装

#### ファイル作成

```bash
touch /Users/kaneko/hotel-saas/middleware/permission.ts
```

#### 実装内容

**ファイル**: `/Users/kaneko/hotel-saas/middleware/permission.ts`

```typescript
/**
 * SSOT: SSOT_PERMISSION_SYSTEM.md v1.0.0
 * 権限チェックMiddleware
 * 
 * 【使用方法】
 * ページで以下のように設定:
 * definePageMeta({
 *   middleware: ['auth', 'permission'],
 *   permission: 'ORDER_MANAGE'
 * });
 * 
 * 【重要】
 * - auth middlewareは「認証チェックのみ」を行う
 * - permission middlewareは「権限チェックのみ」を行う
 * - 権限なし時は /admin/forbidden へリダイレクト（ログインページではない）
 */

export default defineNuxtRouteMiddleware(async (to, from) => {
  // 権限チェックが必要なルートかどうか
  const requiredPermission = to.meta.permission as string | undefined;
  
  // 権限チェック不要の場合はスキップ
  if (!requiredPermission) {
    return;
  }

  // 権限チェック実行
  const { hasPermission } = usePermissions();
  
  try {
    const allowed = await hasPermission(requiredPermission);

    if (!allowed) {
      console.warn(`[Permission Middleware] アクセス拒否: ${requiredPermission} required for ${to.path}`);
      return navigateTo('/admin/forbidden');
    }
  } catch (error) {
    console.error('[Permission Middleware] Error:', error);
    // エラー時も403ページへ
    return navigateTo('/admin/forbidden');
  }
});
```

---

### 1-3. APIプロキシ実装

#### ディレクトリ作成

```bash
mkdir -p /Users/kaneko/hotel-saas/server/api/v1/permissions
mkdir -p /Users/kaneko/hotel-saas/server/api/v1/roles
mkdir -p /Users/kaneko/hotel-saas/server/api/v1/users
```

#### API 1: 権限チェック

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/permissions/check.get.ts`

```typescript
/**
 * SSOT: SSOT_PERMISSION_SYSTEM.md v1.0.0
 * 権限チェックAPIプロキシ
 * GET /api/v1/permissions/check?permission_code=ORDER_MANAGE
 */

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const cookie = getHeader(event, 'cookie') || '';

  try {
    const response = await $fetch('http://localhost:3400/api/v1/permissions/check', {
      params: query,
      headers: { cookie }
    });

    return response;
  } catch (error: any) {
    console.error('[Proxy] Permission check error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || '権限チェックに失敗しました'
    });
  }
});
```

#### API 2: ユーザー権限一覧取得

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/permissions/user-permissions.get.ts`

```typescript
/**
 * SSOT: SSOT_PERMISSION_SYSTEM.md v1.0.0
 * ユーザー権限一覧取得APIプロキシ
 * GET /api/v1/permissions/user-permissions
 */

export default defineEventHandler(async (event) => {
  const cookie = getHeader(event, 'cookie') || '';

  try {
    const response = await $fetch('http://localhost:3400/api/v1/permissions/user-permissions', {
      headers: { cookie }
    });

    return response;
  } catch (error: any) {
    console.error('[Proxy] User permissions error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'ユーザー権限の取得に失敗しました'
    });
  }
});
```

#### API 3: ロール一覧取得

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/permissions/roles.get.ts`

```typescript
/**
 * SSOT: SSOT_PERMISSION_SYSTEM.md v1.0.0
 * ロール一覧取得APIプロキシ
 * GET /api/v1/permissions/roles
 */

export default defineEventHandler(async (event) => {
  const cookie = getHeader(event, 'cookie') || '';

  try {
    const response = await $fetch('http://localhost:3400/api/v1/permissions/roles', {
      headers: { cookie }
    });

    return response;
  } catch (error: any) {
    console.error('[Proxy] Roles list error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'ロール一覧の取得に失敗しました'
    });
  }
});
```

#### API 4: ロール作成

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/permissions/roles.post.ts`

```typescript
/**
 * SSOT: SSOT_PERMISSION_SYSTEM.md v1.0.0
 * ロール作成APIプロキシ
 * POST /api/v1/permissions/roles
 */

export default defineEventHandler(async (event) => {
  const cookie = getHeader(event, 'cookie') || '';
  const body = await readBody(event);

  try {
    const response = await $fetch('http://localhost:3400/api/v1/permissions/roles', {
      method: 'POST',
      headers: { 
        cookie,
        'Content-Type': 'application/json'
      },
      body
    });

    return response;
  } catch (error: any) {
    console.error('[Proxy] Create role error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'ロールの作成に失敗しました'
    });
  }
});
```

#### API 5: ロール-権限更新

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/permissions/role-permissions.put.ts`

```typescript
/**
 * SSOT: SSOT_PERMISSION_SYSTEM.md v1.0.0
 * ロール-権限更新APIプロキシ
 * PUT /api/v1/permissions/role-permissions
 */

export default defineEventHandler(async (event) => {
  const cookie = getHeader(event, 'cookie') || '';
  const body = await readBody(event);

  try {
    const response = await $fetch('http://localhost:3400/api/v1/permissions/role-permissions', {
      method: 'PUT',
      headers: { 
        cookie,
        'Content-Type': 'application/json'
      },
      body
    });

    return response;
  } catch (error: any) {
    console.error('[Proxy] Update role permissions error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'ロール権限の更新に失敗しました'
    });
  }
});
```

#### API 6: ユーザー-ロール割り当て

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/permissions/user-roles.post.ts`

```typescript
/**
 * SSOT: SSOT_PERMISSION_SYSTEM.md v1.0.0
 * ユーザー-ロール割り当てAPIプロキシ
 * POST /api/v1/permissions/user-roles
 */

export default defineEventHandler(async (event) => {
  const cookie = getHeader(event, 'cookie') || '';
  const body = await readBody(event);

  try {
    const response = await $fetch('http://localhost:3400/api/v1/permissions/user-roles', {
      method: 'POST',
      headers: { 
        cookie,
        'Content-Type': 'application/json'
      },
      body
    });

    return response;
  } catch (error: any) {
    console.error('[Proxy] Assign user roles error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'ユーザーロールの割り当てに失敗しました'
    });
  }
});
```

---

### 1-4. 既存ページへの権限チェック追加

#### 対象ページ

| ページ | 権限コード |
|--------|-----------|
| `/pages/admin/orders/**/*.vue` | `ORDER_MANAGE` |
| `/pages/admin/menu/**/*.vue` | `MENU_MANAGE` |
| `/pages/admin/rooms/**/*.vue` | `ROOM_MANAGE` |
| `/pages/admin/staff/**/*.vue` | `STAFF_MANAGE` |
| `/pages/admin/system/**/*.vue` | `SYSTEM_MANAGE` |

#### 追加方法

各ページの`<script setup>`セクションに以下を追加：

```vue
<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'permission'],
  permission: 'ORDER_MANAGE' // ← 適切な権限コードに変更
});

// ... 既存のコード
</script>
```

#### 例: `/pages/admin/orders/index.vue`

```vue
<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'permission'],
  permission: 'ORDER_MANAGE'
});

// ... 既存のコード
</script>
```

---

## 📝 Step 2: 画面実装 + テスト

### 2-1. サイドバーメニュー追加

#### 修正対象ファイル

**ファイル**: `/Users/kaneko/hotel-saas/components/admin/AdminSidebar.vue`

#### 修正箇所

システム設定セクション内（L884-L893付近）の「多言語設定」の**後に**以下を追加：

```vue
<!-- 多言語設定 -->
<NuxtLink
  to="/admin/settings/multilingual"
  :class="linkClass('/admin/settings/multilingual', 2)"
>
  <span class="mr-3">🌐</span>
  多言語設定
</NuxtLink>

<!-- 権限管理（NEW!） -->
<NuxtLink
  to="/admin/system/permissions"
  :class="linkClass('/admin/system/permissions', 2)"
>
  <span class="mr-3">👥</span>
  権限管理
</NuxtLink>
```

#### 展開状態の自動制御

`onMounted`内（L1334-L1343付近）に以下を追加：

```typescript
if (newPath.startsWith('/admin/system/permissions')) {
  expandedSections.value.settings = true
}
```

**追加場所**: `if (newPath.startsWith('/admin/settings') || newPath.startsWith('/admin/billing'))` の直後

---

### 2-2. 権限管理画面実装

#### ファイル作成

```bash
touch /Users/kaneko/hotel-saas/pages/admin/system/permissions.vue
```

#### 実装内容

**ファイル**: `/Users/kaneko/hotel-saas/pages/admin/system/permissions.vue`

```vue
<template>
  <div class="permissions-page">
    <h1>権限管理</h1>

    <!-- ロール一覧 -->
    <section class="roles-section">
      <div class="section-header">
        <h2>ロール一覧</h2>
        <button @click="openCreateRoleDialog" class="btn-primary">
          ロール作成
        </button>
      </div>

      <div class="roles-grid">
        <div
          v-for="role in roles"
          :key="role.id"
          class="role-card"
        >
          <div class="role-header">
            <h3>{{ role.name }}</h3>
            <span class="role-priority">優先度: {{ role.priority }}</span>
          </div>
          <p class="role-description">{{ role.description }}</p>
          <div class="role-permissions">
            <strong>権限数:</strong> {{ role.permissions.length }}
          </div>
          <div class="role-actions">
            <button @click="editRole(role)" class="btn-secondary">編集</button>
            <button
              v-if="!role.isSystem"
              @click="deleteRole(role.id)"
              class="btn-danger"
            >
              削除
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ロール作成/編集ダイアログ -->
    <dialog ref="roleDialog" class="role-dialog">
      <form @submit.prevent="saveRole">
        <h3>{{ isEditMode ? 'ロール編集' : 'ロール作成' }}</h3>

        <div class="form-group">
          <label>ロール名</label>
          <input v-model="editingRole.name" required />
        </div>

        <div class="form-group">
          <label>ロールコード</label>
          <input v-model="editingRole.code" required :disabled="isEditMode" />
        </div>

        <div class="form-group">
          <label>説明</label>
          <textarea v-model="editingRole.description"></textarea>
        </div>

        <div class="form-group">
          <label>優先度</label>
          <input type="number" v-model.number="editingRole.priority" required />
        </div>

        <div class="form-group">
          <label>権限</label>
          <div class="permissions-checklist">
            <div
              v-for="permission in allPermissions"
              :key="permission.id"
              class="permission-item"
            >
              <input
                type="checkbox"
                :id="`perm-${permission.id}`"
                :value="permission.id"
                v-model="editingRole.permissionIds"
              />
              <label :for="`perm-${permission.id}`">
                {{ permission.name }} ({{ permission.code }})
              </label>
            </div>
          </div>
        </div>

        <div class="dialog-actions">
          <button type="submit" class="btn-primary">保存</button>
          <button type="button" @click="closeRoleDialog" class="btn-secondary">
            キャンセル
          </button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth', 'permission'],
  permission: 'PERMISSION_MANAGE'
});

interface Permission {
  id: string;
  name: string;
  code: string;
  category: string;
}

interface Role {
  id: string;
  name: string;
  code: string;
  description: string;
  priority: number;
  isSystem: boolean;
  permissions: Permission[];
}

// State
const roles = ref<Role[]>([]);
const allPermissions = ref<Permission[]>([]);
const roleDialog = ref<HTMLDialogElement>();
const isEditMode = ref(false);
const editingRole = ref({
  id: '',
  name: '',
  code: '',
  description: '',
  priority: 50,
  permissionIds: [] as string[]
});

// Fetch data
const fetchRoles = async () => {
  try {
    const response = await $fetch('/api/v1/permissions/roles');
    roles.value = response.roles;
  } catch (error) {
    console.error('ロール取得エラー:', error);
  }
};

const fetchPermissions = async () => {
  try {
    // TODO: 全権限取得APIを実装する必要がある
    // 仮実装: hotel-commonに GET /api/v1/permissions を追加
    allPermissions.value = [
      { id: '1', name: '注文閲覧', code: 'ORDER_VIEW', category: 'ORDER' },
      { id: '2', name: '注文管理', code: 'ORDER_MANAGE', category: 'ORDER' },
      { id: '3', name: 'メニュー閲覧', code: 'MENU_VIEW', category: 'MENU' },
      { id: '4', name: 'メニュー管理', code: 'MENU_MANAGE', category: 'MENU' },
      { id: '5', name: '客室閲覧', code: 'ROOM_VIEW', category: 'ROOM' },
      { id: '6', name: '客室管理', code: 'ROOM_MANAGE', category: 'ROOM' },
      { id: '7', name: 'スタッフ閲覧', code: 'STAFF_VIEW', category: 'STAFF' },
      { id: '8', name: 'スタッフ管理', code: 'STAFF_MANAGE', category: 'STAFF' },
      { id: '9', name: 'システム管理', code: 'SYSTEM_MANAGE', category: 'SYSTEM' },
      { id: '10', name: '権限管理', code: 'PERMISSION_MANAGE', category: 'SYSTEM' }
    ];
  } catch (error) {
    console.error('権限取得エラー:', error);
  }
};

// Dialog operations
const openCreateRoleDialog = () => {
  isEditMode.value = false;
  editingRole.value = {
    id: '',
    name: '',
    code: '',
    description: '',
    priority: 50,
    permissionIds: []
  };
  roleDialog.value?.showModal();
};

const editRole = (role: Role) => {
  isEditMode.value = true;
  editingRole.value = {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description || '',
    priority: role.priority,
    permissionIds: role.permissions.map(p => p.id)
  };
  roleDialog.value?.showModal();
};

const closeRoleDialog = () => {
  roleDialog.value?.close();
};

const saveRole = async () => {
  try {
    if (isEditMode.value) {
      // ロール-権限更新
      await $fetch('/api/v1/permissions/role-permissions', {
        method: 'PUT',
        body: {
          role_id: editingRole.value.id,
          permission_ids: editingRole.value.permissionIds
        }
      });
    } else {
      // ロール作成
      const newRole = await $fetch('/api/v1/permissions/roles', {
        method: 'POST',
        body: {
          name: editingRole.value.name,
          code: editingRole.value.code,
          description: editingRole.value.description,
          priority: editingRole.value.priority
        }
      });

      // ロール-権限割り当て
      await $fetch('/api/v1/permissions/role-permissions', {
        method: 'PUT',
        body: {
          role_id: newRole.role.id,
          permission_ids: editingRole.value.permissionIds
        }
      });
    }

    closeRoleDialog();
    await fetchRoles();
  } catch (error) {
    console.error('ロール保存エラー:', error);
    alert('ロールの保存に失敗しました');
  }
};

const deleteRole = async (roleId: string) => {
  if (!confirm('このロールを削除してもよろしいですか？')) {
    return;
  }

  try {
    // TODO: ロール削除APIを実装する必要がある
    // await $fetch(`/api/v1/permissions/roles/${roleId}`, { method: 'DELETE' });
    // await fetchRoles();
    alert('ロール削除機能は未実装です');
  } catch (error) {
    console.error('ロール削除エラー:', error);
    alert('ロールの削除に失敗しました');
  }
};

// Initialize
onMounted(() => {
  fetchRoles();
  fetchPermissions();
});
</script>

<style scoped>
.permissions-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.role-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: white;
}

.role-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.role-priority {
  font-size: 0.9em;
  color: #666;
}

.role-description {
  color: #666;
  margin-bottom: 10px;
}

.role-permissions {
  margin-bottom: 15px;
}

.role-actions {
  display: flex;
  gap: 10px;
}

.role-dialog {
  border: none;
  border-radius: 8px;
  padding: 30px;
  max-width: 600px;
  width: 90%;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.permissions-checklist {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
}

.permission-item {
  display: flex;
  align-items: center;
  padding: 5px 0;
}

.permission-item input {
  margin-right: 10px;
  width: auto;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #545b62;
}

.btn-danger {
  background: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-danger:hover {
  background: #c82333;
}
</style>
```

---

### 2-3. 403エラーページ実装

#### ファイル作成

```bash
touch /Users/kaneko/hotel-saas/pages/admin/forbidden.vue
```

#### 実装内容

**ファイル**: `/Users/kaneko/hotel-saas/pages/admin/forbidden.vue`

```vue
<template>
  <div class="forbidden-page">
    <div class="forbidden-content">
      <div class="forbidden-icon">🔒</div>
      <h1>403 - アクセス権限がありません</h1>
      <p>この機能へのアクセス権限がありません。</p>
      <p class="help-text">
        アクセスが必要な場合は、管理者にお問い合わせください。
      </p>
      <div class="actions">
        <NuxtLink to="/admin" class="btn-primary">
          管理画面トップへ戻る
        </NuxtLink>
        <button @click="goBack" class="btn-secondary">
          前のページへ戻る
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 権限チェック不要のページなので、middleware指定なし

const router = useRouter();

const goBack = () => {
  router.back();
};
</script>

<style scoped>
.forbidden-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f5f5f5;
}

.forbidden-content {
  text-align: center;
  padding: 40px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 500px;
}

.forbidden-icon {
  font-size: 80px;
  margin-bottom: 20px;
}

h1 {
  font-size: 24px;
  color: #dc3545;
  margin-bottom: 10px;
}

p {
  color: #666;
  margin-bottom: 10px;
}

.help-text {
  font-size: 0.9em;
  color: #999;
  margin-bottom: 30px;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-primary {
  background: #007bff;
  color: white;
  text-decoration: none;
  padding: 10px 20px;
  border-radius: 4px;
  display: inline-block;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: #545b62;
}
</style>
```

---

### 2-4. 動作確認

#### APIテスト（必須）

**テストドキュメント**: `/Users/kaneko/hotel-kanri/docs/03_ssot/PERMISSION_SYSTEM_BROWSER_TEST.md`

**内容**: `curl`コマンドによるAPIテスト（全10テストケース）

**実施方法**:
```bash
# 1. hotel-common起動
cd /Users/kaneko/hotel-common
npm run dev

# 2. テストドキュメントのcurlコマンドを順次実行
# Test 1: ログイン + セッション取得
# Test 2: 権限チェックAPI
# Test 3: ユーザー権限一覧取得API
# ...（Test 10まで）
```

#### 手動UIテスト（必須）

**目的**: 画面表示と基本操作の確認

**手順**:
```bash
# 1. hotel-saas起動
cd /Users/kaneko/hotel-saas
npm run dev

# 2. ブラウザでアクセス
open http://localhost:3100/admin/login
```

**確認項目**:
1. ✅ **OWNERロールでのテスト**
   - ログイン: `owner@test.omotenasuai.com` / `owner123`
   - サイドバーから「システム設定 > 権限管理」をクリック
   - 権限管理画面が表示される
   - ロール一覧（OWNER、MANAGER、STAFF）が表示される
   - ロール作成ダイアログが開く

2. ✅ **STAFFロールでのテスト**
   - ログイン: `staff@test.omotenasuai.com` / `staff123`
   - サイドバーから「システム設定 > 権限管理」をクリック
   - `/admin/forbidden`（403エラーページ）にリダイレクトされる
   - エラーメッセージが表示される

3. ✅ **MANAGERロールでのテスト**
   - ログイン: `manager@test.omotenasuai.com` / `manager123`
   - サイドバーから「システム設定 > 権限管理」をクリック
   - 権限管理画面が表示される（PERMISSION_MANAGEあり）

---

## ✅ 完了条件

### 実装完了

- [ ] Composable実装完了（`usePermissions.ts`）
- [ ] Middleware実装完了（`permission.ts`）
- [ ] APIプロキシ実装完了（6エンドポイント）
- [ ] 既存ページへの権限チェック追加完了
- [ ] サイドバーメニュー追加完了（`AdminSidebar.vue`）
- [ ] 権限管理画面実装完了（`permissions.vue`）
- [ ] 403エラーページ実装完了（`forbidden.vue`）

### テスト完了

- [ ] 単体テスト合格（Composable）
- [ ] APIテスト合格（10テストケース）
- [ ] 手動UIテスト合格（3ロール確認）
- [ ] 動作確認完了

### SSOT準拠確認

- [ ] SSOT_PERMISSION_SYSTEM.md v1.0.0 完全準拠
- [ ] 実装チェックリスト全項目完了

---

## 📊 実装完了報告フォーマット

```markdown
## ✅ hotel-saas PERMISSION_SYSTEM実装完了報告

### 実装日
2025-10-XX

### 実装者
hotel-saas担当者（Sun）

### 実装完了項目
✅ Composable実装（usePermissions.ts）
✅ Middleware実装（permission.ts）
✅ APIプロキシ実装（6エンドポイント）
✅ 既存ページへの権限チェック追加
✅ サイドバーメニュー追加（AdminSidebar.vue）
✅ 権限管理画面実装（permissions.vue）
✅ 403エラーページ実装（forbidden.vue）

### テスト結果
- 単体テスト: 6/6テスト合格
- APIテスト: 10/10テストケース合格
- 手動UIテスト: 3/3ロール確認完了

### 発見された問題
[問題があれば記載、なければ「なし」]

### 備考
[その他気づいた点があれば記載]
```

---

## 🔗 関連ドキュメント

- **SSOT**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_PERMISSION_SYSTEM.md`
- **Week 1指示書**: `/Users/kaneko/hotel-kanri/docs/03_ssot/PHASE_1_WEEK_1_INSTRUCTIONS.md`
- **ブラウザ目視テスト**: `/Users/kaneko/hotel-kanri/docs/03_ssot/PERMISSION_SYSTEM_BROWSER_TEST.md`
- **進捗管理**: `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md`

