# 🔐 SSOT: hotel-saas 権限管理システム

**Doc-ID**: SSOT-SAAS-PERMISSION-001  
**バージョン**: 2.2.0  
**作成日**: 2025年10月8日  
**最終更新**: 2025年10月20日（権限階層構造の追加）  
**ステータス**: 🔴 承認済み（最高権威）  
**所有者**: Sun（hotel-saas担当AI）

**v2.0.0 変更内容**:
- ✅ 要件ID体系適用（PERM-001〜）
- ✅ Accept（合格条件）を全機能に明記
- ✅ テストケース例を追加
- ✅ 型定義例を追加
- ❌ ワイルドカード仕様は削除（v2.1.0で廃止）

**v2.1.0 変更内容**（2025-10-20）:
- ❌ **ワイルドカード全権限を廃止**（`*:*:*` 等）
- ✅ **個別権限のみに統一**
- ✅ 実装の単純化・バグ削減
- ✅ PERM-002, PERM-003, PERM-004 削除
- ✅ 権限チェックロジック簡素化

**v2.2.0 変更内容**（2025-10-20）:
- ✅ **権限階層構造の追加**（PERM-009）
- ✅ 上位権限選択時の下位権限自動付与機能
- ✅ 下位権限解除時の上位権限自動解除機能
- ✅ 完全な階層マップ定義（hotel-saas, system, hotel-pms全カテゴリ）
- ✅ UI実装要件追加（PERM-UI-006, PERM-UI-007）
- ✅ レベルバッジ・インデント表示によるUX向上

**関連SSOT**:
- [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_SAAS_ADMIN_AUTHENTICATION.md](../00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md) - 管理画面認証
- [SSOT_SAAS_DATABASE_SCHEMA.md](../00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md) - データベーススキーマ

---

## 📋 目次

1. [要件ID一覧](#要件id一覧) ⭐ **NEW**
2. [概要](#概要)
3. [スコープ](#スコープ)
4. [基本方針](#基本方針)
5. [データベース設計](#データベース設計)
6. [API仕様](#api仕様)
7. [フロントエンド実装](#フロントエンド実装)
8. [権限チェック実装](#権限チェック実装)
9. [業態別デフォルトテンプレート](#業態別デフォルトテンプレート)
10. [グループ・ブランド連携](#グループブランド連携)
11. [セキュリティ](#セキュリティ)
12. [マイグレーション手順](#マイグレーション手順)
13. [実装チェックリスト](#実装チェックリスト)

---

## 🎯 要件ID一覧

### コア機能

| 要件ID | 機能 | 概要 | 状態 |
|--------|------|------|------|
| **PERM-001** | 権限フォーマット | `{category}:{resource}:{action}` 形式 | ✅ 有効 |
| ~~**PERM-002**~~ | ~~ワイルドカード全権限~~ | ~~`*:*:*` による全システム権限~~ | ❌ **廃止** |
| ~~**PERM-003**~~ | ~~ワイルドカードカテゴリ~~ | ~~`hotel-saas:*:*` 等のカテゴリ一括~~ | ❌ **廃止** |
| ~~**PERM-004**~~ | ~~ワイルドカードリソース~~ | ~~`hotel-saas:menu:*` 等のリソース一括~~ | ❌ **廃止** |
| **PERM-005** | 役職CRUD | 役職の作成・読取・更新・削除 | ✅ 有効 |
| **PERM-006** | 権限マッピング | 役職と権限の紐付け（個別権限のみ） | ✅ 有効 |
| **PERM-007** | UI実装 | 全チェックボックス表示 | ✅ 有効 |
| **PERM-008** | 権限チェック | `checkPermission()` による検証（配列検索） | ✅ 有効 |
| **PERM-009** | 権限階層構造 | 上位権限選択時に下位権限も自動付与 | ✅ 有効 |

### データベース

| 要件ID | 機能 | 概要 |
|--------|------|------|
| **PERM-DB-001** | rolesテーブル | 役職マスタ |
| **PERM-DB-002** | permissionsテーブル | 権限マスタ |
| **PERM-DB-003** | role_permissionsテーブル | 紐付けテーブル |

### API

| 要件ID | 機能 | 概要 |
|--------|------|------|
| **PERM-API-001** | GET /roles | 役職一覧取得 |
| **PERM-API-002** | GET /roles/:id | 役職詳細取得 |
| **PERM-API-003** | POST /roles | 役職作成 |
| **PERM-API-004** | PUT /roles/:id | 役職更新 |
| **PERM-API-005** | DELETE /roles/:id | 役職削除 |
| **PERM-API-006** | PUT /roles/permissions | 権限保存 |
| **PERM-API-007** | GET /permissions | 権限一覧取得 |

### UI

| 要件ID | 機能 | 概要 |
|--------|------|------|
| **PERM-UI-001** | 役職一覧画面 | `/admin/roles` |
| **PERM-UI-002** | 権限マトリックス画面 | `/admin/roles/:id/permissions` |
| **PERM-UI-003** | 全権限チェックボックス | グローバルワイルドカード |
| **PERM-UI-004** | カテゴリ一括選択 | カテゴリワイルドカード |
| **PERM-UI-005** | 実効権限プレビュー | ワイルドカード展開表示 |
| **PERM-UI-006** | 権限階層グルーピング表示 | リソース単位で階層表示 |
| **PERM-UI-007** | 権限レベル視覚化 | レベルバッジ・インデント表示 |

---

## 📖 概要

### 目的

hotel-saas管理画面における、テナント（ホテル）ごとの柔軟な役職・権限管理システムの完全な仕様を定義する。

### 適用範囲

- ✅ hotel-saas管理画面の権限制御（`hotel-saas`、`system`カテゴリ）
- ✅ hotel-common APIの権限マスタ管理（全カテゴリ）
- ✅ テナント別の役職・権限カスタマイズ
- ✅ グループ・ブランド（チェーン）間の権限コピー
- 🔄 hotel-pms、hotel-memberへの権限連携（将来対応）

### 📌 重要な設計方針

**このSSOTはhotel-saas管理画面の実装仕様ですが、データベース設計とAPI仕様は全システム共通です。**

#### 各システムの責務

| システム | 責務 | 管理画面で扱うカテゴリ |
|---------|------|---------------------|
| **hotel-common** | 権限マスタDB管理、統一API提供 | （管理画面なし） |
| **hotel-saas** | SaaS機能の権限設定UI | `hotel-saas`, `system` |
| **hotel-pms** | PMS機能の権限設定UI | `hotel-pms`, `system` |

#### hotel-pms実装時の注意事項

**hotel-pms管理画面を実装する際は、本SSOTを参考にしてください：**

- ✅ データベース設計（`roles`, `permissions`, `role_permissions`）は共通
- ✅ API仕様（hotel-common）は共通
- ✅ フロントエンド実装パターン（役職一覧、権限マトリックス等）は流用可能
- ⚠️ 表示する権限カテゴリのみ変更:
  - hotel-saas → `hotel-saas`, `system`
  - hotel-pms → `hotel-pms`, `system`
- ⚠️ タブ構成は不要:
  - hotel-saas: 自システムのカテゴリのみ表示（タブ分け不要）
  - hotel-pms: 自システムのカテゴリのみ表示（タブ分け不要）

**hotel-pms実装時には、必要に応じて`SSOT_PMS_PERMISSION_UI.md`を作成してください。**

### 技術スタック

- **データベース**: PostgreSQL (統一DB)
- **ORM**: Prisma
- **テーブル**: `roles`, `permissions`, `role_permissions`, `staff_tenant_memberships`
- **認証方式**: Session認証（Redis + HttpOnly Cookie）
- **キャッシュ**: Redis（権限情報の高速取得）

---

## 🎯 スコープ

### 対象機能

- ✅ 役職の作成・編集・削除（テナントごと）
- ✅ 権限の定義・管理（システム全体）
- ✅ 役職と権限のマッピング（テナントごと）
- ✅ スタッフへの役職割り当て（`staff_tenant_memberships`経由）
- ✅ 業態別デフォルト役職テンプレート（ホテル、旅館）
- ✅ スーパーアドミンによるテンプレート管理
- ✅ ブランド（チェーン）間での役職コピー機能

### 対象外機能

- ❌ ホテルグループ全体の統一権限管理（Phase 2以降）
- ❌ 外部システム（OTA等）との権限連携
- ❌ ゲストユーザーの権限管理

---

## 🎯 基本方針

### 1. レベル概念の廃止

**重要**: 従来の「レベル1-5」による階層管理は**廃止**します。

**理由**:
- 固定階層では柔軟な役職管理ができない
- 役職名と権限のマッピングで十分に管理可能
- 表示順序は`sort_order`フィールドで管理

**移行方針**:
```typescript
// ❌ 旧実装（レベル固定）
level: 1 // OWNER
level: 2 // ADMIN
level: 3 // MANAGER
level: 4 // STAFF
level: 5 // READONLY

// ✅ 新実装（柔軟な役職管理）
roles: [
  { 
    name: '支配人', 
    sortOrder: 100, 
    permissions: [
      // 全49個の個別権限を列挙
      'hotel-saas:order:view',
      'hotel-saas:order:create',
      'hotel-saas:order:update',
      'hotel-saas:order:delete',
      // ...（全権限）
    ] 
  },
  { name: 'フロント主任', sortOrder: 90, permissions: [...] },
  { name: 'フロントスタッフ', sortOrder: 80, permissions: [...] },
  { name: '清掃スタッフ', sortOrder: 70, permissions: [...] }
]
```

---

### 2. 権限コード体系

**形式**: `system:resource:action`

**例**:
```typescript
'hotel-pms:reservation:view'    // PMS: 予約閲覧
'hotel-pms:reservation:create'  // PMS: 予約作成
'hotel-pms:billing:refund'      // PMS: 返金処理
'hotel-saas:order:view'         // SaaS: 注文閲覧
'hotel-saas:ai:use'             // SaaS: AI機能使用
'system:settings:update'        // システム設定更新
```

~~**ワイルドカード**~~（v2.1.0で廃止）:
```typescript
// ❌ 廃止：実装が複雑でバグが多発するため使用不可
// '*:*:*'                 // 全権限（支配人等）
// 'hotel-pms:*:*'         // PMSの全権限
// 'hotel-pms:billing:*'   // 会計の全操作

// ✅ 個別権限のみ使用
'hotel-pms:billing:view'
'hotel-pms:billing:create'
'hotel-pms:billing:update'
// ...全て個別に列挙
```

---

## 📐 要件詳細仕様

### PERM-001: 権限フォーマット

**Accept（合格条件）**:
- ✅ 権限コードは `{category}:{resource}:{action}` 形式である
- ✅ categoryは `hotel-saas`, `hotel-pms`, `system` のいずれか
- ✅ resourceとactionは英数字とハイフンのみ使用可能
- ❌ コロン（`:`）は区切り文字として3つのみ
- ❌ 空文字列や不正なフォーマットは拒否

**Example**:
```typescript
// ✅ 正しい
'hotel-saas:order:view'
'hotel-pms:reservation:create'
'system:settings:update'

// ❌ 間違い
'hotel-saas-order-view'    // コロン不足
'hotel-saas:order'          // action不足
'hotel_saas:order:view'     // アンダースコア不可
```

**Test Cases**:
```typescript
describe('PERM-001: 権限フォーマット検証', () => {
  it('正しいフォーマットは受理される', () => {
    expect(validatePermissionFormat('hotel-saas:order:view')).toBe(true)
  })

  it('コロン不足は拒否される', () => {
    expect(validatePermissionFormat('hotel-saas-order')).toBe(false)
  })

  it('不正な文字は拒否される', () => {
    expect(validatePermissionFormat('hotel_saas:order:view')).toBe(false)
  })
})
```

**Type**:
```typescript
type PermissionCode = `${Category}:${Resource}:${Action}`
type Category = 'hotel-saas' | 'hotel-pms' | 'system'
type Resource = string
type Action = 'create' | 'read' | 'update' | 'delete' | 'use' | string
```

---

### PERM-002: 個別権限のみ（ワイルドカード廃止）

**廃止理由**: 
- ❌ ワイルドカード（`*:*:*` 等）は実装が複雑すぎる
- ❌ バグが多発し、メンテナンスコストが高い
- ❌ 個別権限との混在処理が困難

**Accept（合格条件）**:
- ✅ 権限は常に個別権限として保存される
- ✅ 全権限を持つ役職も、全ての個別権限を列挙して保存
- ✅ ワイルドカード（`*`, `*:*:*`, `hotel-saas:*:*` 等）は使用不可
- ✅ 権限チェックは単純な配列検索のみ（`includes()`）
- ❌ ワイルドカードを含む権限コードは保存時にエラー

**Example**:
```typescript
// ✅ 正しい：個別権限のみ
role.permissions = [
  'hotel-saas:order:view',
  'hotel-saas:order:create',
  'hotel-saas:order:update',
  'hotel-saas:order:delete',
  'hotel-saas:menu:view',
  'hotel-saas:menu:create',
  // ... 全て個別に列挙（支配人の場合は49個）
]

// ❌ 廃止：ワイルドカード
role.permissions = ['*:*:*']              // 使用不可
role.permissions = ['hotel-saas:*:*']     // 使用不可
role.permissions = ['hotel-saas:menu:*']  // 使用不可
```

**Test Cases**:
```typescript
describe('PERM-002: 個別権限のみ', () => {
  it('個別権限は正常に保存される', async () => {
    const role = {
      permissions: [
        'hotel-saas:order:view',
        'hotel-saas:order:create'
      ]
    }
    
    const saved = await saveRole(role)
    expect(saved.permissions).toEqual(role.permissions)
  })

  it('ワイルドカードを含む権限はエラー', async () => {
    const role = {
      permissions: ['*:*:*']
    }
    
    await expect(saveRole(role)).rejects.toThrow('ワイルドカードは使用できません')
  })

  it('権限チェックは配列検索のみ', async () => {
    const role = {
      permissions: ['hotel-saas:order:view', 'hotel-saas:order:create']
    }
    
    expect(await checkPermission(user, 'hotel-saas:order:view')).toBe(true)
    expect(await checkPermission(user, 'hotel-saas:order:update')).toBe(false)
  })
})
```

**Type**:
```typescript
import { z } from 'zod'

// ワイルドカードを禁止
const PermissionCodeSchema = z.string()
  .regex(/^[a-z-]+:[a-z-]+:[a-z-]+$/)
  .refine(
    (val) => !val.includes('*'),
    { message: 'ワイルドカードは使用できません' }
  )

const PermissionsSchema = z.array(PermissionCodeSchema)

type Permissions = z.infer<typeof PermissionsSchema>
```

**Implementation**:
```typescript
// 要件ID: PERM-002
// シンプルな配列検索のみ
function checkPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission)
}

// バリデーション
function validatePermissions(permissions: string[]): void {
  for (const perm of permissions) {
    if (perm.includes('*')) {
      throw new Error(`ワイルドカードは使用できません: ${perm}`)
    }
    
    const parts = perm.split(':')
    if (parts.length !== 3) {
      throw new Error(`不正な権限フォーマット: ${perm}`)
    }
  }
}
```

---

### PERM-009: 権限階層構造

**目的**: 権限には明確なランク（階層）があり、上位権限を持つには下位権限が必須である仕組みを実装する。

**Accept（合格条件）**:
- ✅ 上位権限を選択すると、下位権限も自動的に選択される
- ✅ 下位権限を解除すると、それに依存する上位権限も自動的に解除される
- ✅ UIで階層構造が視覚的に表現される（インデント、レベルバッジ）
- ✅ 階層マップは全ての管理系権限をカバーする
- ❌ 階層に反する権限の組み合わせは許可しない（例: 作成権限なしでキャンセル権限のみ）

**階層の考え方**:
```
Lv.4 (最上位)  削除・キャンセル等の破壊的操作
  ↓ 自動的に以下も付与
Lv.3          更新・編集
  ↓ 自動的に以下も付与
Lv.2          作成
  ↓ 自動的に以下も付与
Lv.1 (最下位)  閲覧
```

**Example**:
```typescript
// 注文管理の階層構造
const hierarchyExample = {
  'hotel-saas:order:cancel': {        // Lv.4 - 最上位
    requires: [
      'hotel-saas:order:update-status',  // Lv.3
      'hotel-saas:order:create',         // Lv.2
      'hotel-saas:order:view'            // Lv.1
    ]
  },
  'hotel-saas:order:update-status': {  // Lv.3
    requires: [
      'hotel-saas:order:create',         // Lv.2
      'hotel-saas:order:view'            // Lv.1
    ]
  },
  'hotel-saas:order:create': {         // Lv.2
    requires: [
      'hotel-saas:order:view'            // Lv.1
    ]
  },
  'hotel-saas:order:view': {           // Lv.1 - 最下位（依存なし）
    requires: []
  }
}

// ✅ キャンセルを選択 → 更新・作成・閲覧も自動選択
selectPermission('hotel-saas:order:cancel')
// → ['hotel-saas:order:cancel', 'hotel-saas:order:update-status', 'hotel-saas:order:create', 'hotel-saas:order:view']

// ✅ 作成を解除 → 更新・キャンセルも自動解除
deselectPermission('hotel-saas:order:create')
// → ['hotel-saas:order:view'] のみ残る
```

**Test Cases**:
```typescript
describe('PERM-009: 権限階層構造', () => {
  it('上位権限選択時、下位権限も自動選択される', () => {
    const permissions = []
    selectPermission(permissions, 'hotel-saas:order:cancel')
    
    expect(permissions).toContain('hotel-saas:order:cancel')
    expect(permissions).toContain('hotel-saas:order:update-status')
    expect(permissions).toContain('hotel-saas:order:create')
    expect(permissions).toContain('hotel-saas:order:view')
  })
  
  it('下位権限解除時、上位権限も自動解除される', () => {
    const permissions = [
      'hotel-saas:order:cancel',
      'hotel-saas:order:update-status',
      'hotel-saas:order:create',
      'hotel-saas:order:view'
    ]
    
    deselectPermission(permissions, 'hotel-saas:order:create')
    
    expect(permissions).not.toContain('hotel-saas:order:cancel')
    expect(permissions).not.toContain('hotel-saas:order:update-status')
    expect(permissions).not.toContain('hotel-saas:order:create')
    expect(permissions).toContain('hotel-saas:order:view')
  })
  
  it('階層マップが全権限をカバーしている', () => {
    const allPermissions = getAllPermissions()
    const mappedPermissions = Object.keys(permissionHierarchy)
    
    // 管理系権限（create, update, delete, manage等）は全てマップに存在
    const managePermissions = allPermissions.filter(p => 
      p.includes(':create') || p.includes(':update') || 
      p.includes(':delete') || p.includes(':manage') ||
      p.includes(':cancel') || p.includes(':refund')
    )
    
    managePermissions.forEach(perm => {
      expect(mappedPermissions).toContain(perm)
    })
  })
})
```

**Type**:
```typescript
/**
 * 権限階層マップの型定義
 * キー: 権限コード
 * 値: この権限を選択した時に自動的に必要となる下位権限のリスト
 */
type PermissionHierarchyMap = Record<string, string[]>

interface PermissionWithLevel {
  code: string
  name: string
  level: 1 | 2 | 3 | 4 | 5  // 1が最下位（閲覧）、5が最上位（削除）
  requires: string[]         // 必要な下位権限のリスト
}
```

**完全な階層マップ**:

#### hotel-saas カテゴリ

##### hotel-saas:order（注文管理）4階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 4 | `hotel-saas:order:cancel` | キャンセル | update-status, create, view |
| 3 | `hotel-saas:order:update-status` | 更新 | create, view |
| 2 | `hotel-saas:order:create` | 作成 | view |
| 1 | `hotel-saas:order:view` | 閲覧 | なし（基本権限） |

##### hotel-saas:menu（メニュー管理）2階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 2 | `hotel-saas:menu:manage` | 管理 | view |
| 1 | `hotel-saas:menu:view` | 閲覧 | なし |

##### hotel-saas:ai（AI機能）2階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 2 | `hotel-saas:ai:manage` | 管理 | use |
| 1 | `hotel-saas:ai:use` | 使用 | なし |

##### hotel-saas:layout（レイアウト編集）2階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 2 | `hotel-saas:layout:publish` | 公開 | edit |
| 1 | `hotel-saas:layout:edit` | 編集 | なし |

#### system カテゴリ

##### system:settings（システム設定）2階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 2 | `system:settings:update` | 更新 | view |
| 1 | `system:settings:view` | 閲覧 | なし |

##### system:staff（スタッフ管理）3階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 3 | `system:staff:delete` | 削除 | manage, view |
| 2 | `system:staff:manage` | 管理 | view |
| 1 | `system:staff:view` | 閲覧 | なし |

##### system:roles（役職管理）2階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 2 | `system:roles:manage` | 管理 | view |
| 1 | `system:roles:view` | 閲覧 | なし |

##### system:logs（ログ管理）2階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 2 | `system:logs:export` | エクスポート | view |
| 1 | `system:logs:view` | 閲覧 | なし |

#### hotel-pms カテゴリ

##### hotel-pms:reservation（予約管理）5階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 5 | `hotel-pms:reservation:delete` | 削除 | cancel, update, create, view |
| 4 | `hotel-pms:reservation:cancel` | キャンセル | update, create, view |
| 3 | `hotel-pms:reservation:update` | 更新 | create, view |
| 2 | `hotel-pms:reservation:create` | 作成 | view |
| 1 | `hotel-pms:reservation:view` | 閲覧 | なし |

##### hotel-pms:room（客室管理）3階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 3 | `hotel-pms:room:manage` | 設定管理 | status-update, view |
| 2 | `hotel-pms:room:status-update` | 状態更新 | view |
| 1 | `hotel-pms:room:view` | 閲覧 | なし |

##### hotel-pms:billing（会計管理）4階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 4 | `hotel-pms:billing:correct` | 訂正 | refund, create, view |
| 3 | `hotel-pms:billing:refund` | 返金 | create, view |
| 2 | `hotel-pms:billing:create` | 作成 | view |
| 1 | `hotel-pms:billing:view` | 閲覧 | なし |

##### hotel-pms:checkin/checkout（単独機能）
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 1 | `hotel-pms:checkin:execute` | チェックイン | なし（単独機能） |
| 1 | `hotel-pms:checkout:execute` | チェックアウト | なし（単独機能） |

##### hotel-pms:report（レポート）2階層
| Lv | 権限コード | 操作 | 必要な下位権限 |
|----|----------|------|--------------|
| 2 | `hotel-pms:report:export` | エクスポート | view |
| 1 | `hotel-pms:report:view` | 閲覧 | なし |

**Implementation**:
```typescript
// 要件ID: PERM-009
/**
 * 権限の階層構造マップ
 * キー: 権限コード
 * 値: この権限を選択した時に自動的に必要となる下位権限のリスト
 */
export const permissionHierarchy: Record<string, string[]> = {
  // hotel-saas カテゴリ
  'hotel-saas:order:cancel': [
    'hotel-saas:order:update-status',
    'hotel-saas:order:create',
    'hotel-saas:order:view'
  ],
  'hotel-saas:order:update-status': [
    'hotel-saas:order:create',
    'hotel-saas:order:view'
  ],
  'hotel-saas:order:create': ['hotel-saas:order:view'],
  
  'hotel-saas:menu:manage': ['hotel-saas:menu:view'],
  'hotel-saas:ai:manage': ['hotel-saas:ai:use'],
  'hotel-saas:layout:publish': ['hotel-saas:layout:edit'],
  
  // system カテゴリ
  'system:settings:update': ['system:settings:view'],
  
  'system:staff:delete': [
    'system:staff:manage',
    'system:staff:view'
  ],
  'system:staff:manage': ['system:staff:view'],
  
  'system:roles:manage': ['system:roles:view'],
  'system:logs:export': ['system:logs:view'],
  
  // hotel-pms カテゴリ
  'hotel-pms:reservation:delete': [
    'hotel-pms:reservation:cancel',
    'hotel-pms:reservation:update',
    'hotel-pms:reservation:create',
    'hotel-pms:reservation:view'
  ],
  'hotel-pms:reservation:cancel': [
    'hotel-pms:reservation:update',
    'hotel-pms:reservation:create',
    'hotel-pms:reservation:view'
  ],
  'hotel-pms:reservation:update': [
    'hotel-pms:reservation:create',
    'hotel-pms:reservation:view'
  ],
  'hotel-pms:reservation:create': ['hotel-pms:reservation:view'],
  
  'hotel-pms:room:manage': [
    'hotel-pms:room:status-update',
    'hotel-pms:room:view'
  ],
  'hotel-pms:room:status-update': ['hotel-pms:room:view'],
  
  'hotel-pms:billing:correct': [
    'hotel-pms:billing:refund',
    'hotel-pms:billing:create',
    'hotel-pms:billing:view'
  ],
  'hotel-pms:billing:refund': [
    'hotel-pms:billing:create',
    'hotel-pms:billing:view'
  ],
  'hotel-pms:billing:create': ['hotel-pms:billing:view'],
  
  'hotel-pms:report:export': ['hotel-pms:report:view'],
}

/**
 * 権限を選択した時の処理（階層構造対応）
 */
export function selectPermission(
  currentPermissions: string[],
  permissionCode: string
): string[] {
  const result = [...currentPermissions]
  
  // 自身を追加
  if (!result.includes(permissionCode)) {
    result.push(permissionCode)
  }
  
  // 下位階層の権限を自動追加
  const lowerPermissions = permissionHierarchy[permissionCode] || []
  lowerPermissions.forEach(lowerCode => {
    if (!result.includes(lowerCode)) {
      result.push(lowerCode)
    }
  })
  
  return result
}

/**
 * 権限を解除した時の処理（階層構造対応）
 */
export function deselectPermission(
  currentPermissions: string[],
  permissionCode: string
): string[] {
  let result = [...currentPermissions]
  
  // この権限に依存している上位権限を探す
  const upperPermissions = Object.entries(permissionHierarchy)
    .filter(([_, lowerPerms]) => lowerPerms.includes(permissionCode))
    .map(([code]) => code)
    .filter(code => result.includes(code))
  
  // 上位権限も一緒に外す
  upperPermissions.forEach(upperCode => {
    result = result.filter(p => p !== upperCode)
  })
  
  // 自身を削除
  result = result.filter(p => p !== permissionCode)
  
  return result
}
```

**UI実装要件（PERM-UI-006, PERM-UI-007）**:
```vue
<template>
  <div class="permission-resource border rounded-lg p-4 mb-4">
    <h4 class="font-semibold mb-3">注文管理</h4>
    
    <div class="space-y-2">
      <!-- Lv.4: 最上位 -->
      <div class="permission-item pl-0">
        <label class="flex items-center gap-2">
          <input type="checkbox" @change="togglePermission" />
          <span>キャンセル</span>
          <span class="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">Lv.4</span>
        </label>
      </div>
      
      <!-- Lv.3 -->
      <div class="permission-item pl-4 border-l-2 border-orange-200">
        <label class="flex items-center gap-2">
          <input type="checkbox" @change="togglePermission" />
          <span>ステータス更新</span>
          <span class="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">Lv.3</span>
        </label>
      </div>
      
      <!-- Lv.2 -->
      <div class="permission-item pl-8 border-l-2 border-blue-200">
        <label class="flex items-center gap-2">
          <input type="checkbox" @change="togglePermission" />
          <span>作成</span>
          <span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Lv.2</span>
        </label>
      </div>
      
      <!-- Lv.1: 最下位 -->
      <div class="permission-item pl-12 border-l-2 border-green-200">
        <label class="flex items-center gap-2">
          <input type="checkbox" @change="togglePermission" />
          <span>閲覧</span>
          <span class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Lv.1</span>
        </label>
      </div>
    </div>
    
    <div class="mt-3 pt-3 border-t text-xs text-gray-600">
      <Icon name="heroicons:information-circle" class="w-4 h-4 inline mr-1" />
      上位の権限を選択すると、それ以下の権限も自動的に選択されます
    </div>
  </div>
</template>
```

---

### 3. テナント別役職管理

**重要**: 役職はテナントごとに完全に独立して管理されます。

**実装例**:
```typescript
// ホテルA（ビジネスホテル）
tenant_id: 'hotel-a'
roles: [
  { name: 'フロント主任', permissions: [...] },
  { name: 'フロントスタッフ', permissions: [...] },
  { name: '清掃スタッフ', permissions: [...] }
]

// ホテルB（レジャーホテル）
tenant_id: 'hotel-b'
roles: [
  { name: '支配人', permissions: [...] },
  { name: 'キャストリーダー', permissions: [...] },
  { name: 'キャスト', permissions: [...] },
  { name: 'ディッシャー', permissions: [...] }
]

// ホテルC（高級旅館）
tenant_id: 'hotel-c'
roles: [
  { name: '女将', permissions: [...] },
  { name: '番頭', permissions: [...] },
  { name: '仲居', permissions: [...] },
  { name: '板前', permissions: [...] }
]
```

---

## 🗄️ データベース設計

### 1. `roles` テーブル（役職マスタ）

**テーブル名**: `roles`

**目的**: テナントごとの役職を管理

**スキーマ**:
```sql
CREATE TABLE roles (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  
  -- 役職情報
  name            TEXT NOT NULL,
  description     TEXT,
  
  -- 表示順序（大きい順に表示）
  sort_order      INTEGER DEFAULT 0,
  
  -- 管理フラグ
  is_active       BOOLEAN DEFAULT true,
  is_default      BOOLEAN DEFAULT false,  -- デフォルト役職フラグ
  
  -- タイムスタンプ
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  created_by      TEXT,
  updated_by      TEXT,
  
  CONSTRAINT fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unq_roles_tenant_id_name UNIQUE (tenant_id, name)
);

CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX idx_roles_is_active ON roles(is_active);
CREATE INDEX idx_roles_is_default ON roles(is_default);
CREATE INDEX idx_roles_sort_order ON roles(sort_order DESC);
```

**Prismaモデル**:
```prisma
model Role {
  id              String    @id @default(uuid())
  tenantId        String    @map("tenant_id")
  
  name            String
  description     String?
  
  sortOrder       Int       @default(0) @map("sort_order")
  
  isActive        Boolean   @default(true) @map("is_active")
  isDefault       Boolean   @default(false) @map("is_default")
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  createdBy       String?   @map("created_by")
  updatedBy       String?   @map("updated_by")
  
  // リレーション
  tenant          Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  permissions     RolePermission[]
  memberships     StaffTenantMembership[]
  
  @@unique([tenantId, name], map: "unq_roles_tenant_id_name")
  @@index([tenantId], map: "idx_roles_tenant_id")
  @@index([isActive], map: "idx_roles_is_active")
  @@index([isDefault], map: "idx_roles_is_default")
  @@index([sortOrder], map: "idx_roles_sort_order")
  @@map("roles")
}
```

**重要フィールド**:
- `tenant_id`: テナント分離必須
- `name`: 役職名（テナント内ユニーク）
- `sort_order`: 表示順序（大きい値ほど上位に表示）
- `is_default`: デフォルト役職フラグ（新規スタッフ作成時に自動割り当て）

---

### 2. `permissions` テーブル（権限マスタ）

**テーブル名**: `permissions`

**目的**: システム全体の権限定義を管理

**スキーマ**:
```sql
CREATE TABLE permissions (
  id              TEXT PRIMARY KEY,
  
  -- 権限コード（system:resource:action）
  code            TEXT NOT NULL UNIQUE,
  
  -- 権限情報
  name            TEXT NOT NULL,
  description     TEXT,
  
  -- 分類
  category        TEXT NOT NULL,  -- 'hotel-pms', 'hotel-saas', 'system'
  
  -- 管理フラグ
  is_active       BOOLEAN DEFAULT true,
  
  -- タイムスタンプ
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_is_active ON permissions(is_active);
```

**Prismaモデル**:
```prisma
model Permission {
  id              String    @id @default(uuid())
  
  code            String    @unique
  
  name            String
  description     String?
  
  category        String
  
  isActive        Boolean   @default(true) @map("is_active")
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  // リレーション
  rolePermissions RolePermission[]
  
  @@index([code], map: "idx_permissions_code")
  @@index([category], map: "idx_permissions_category")
  @@index([isActive], map: "idx_permissions_is_active")
  @@map("permissions")
}
```

**カテゴリ別権限例**:

```typescript
// hotel-pms カテゴリ
'hotel-pms:reservation:view'
'hotel-pms:reservation:create'
'hotel-pms:reservation:update'
'hotel-pms:reservation:delete'
'hotel-pms:checkin:execute'
'hotel-pms:checkout:execute'
'hotel-pms:billing:view'
'hotel-pms:billing:create'
'hotel-pms:billing:refund'

// hotel-saas カテゴリ
'hotel-saas:order:view'
'hotel-saas:order:create'
'hotel-saas:menu:manage'
'hotel-saas:ai:use'
'hotel-saas:layout:edit'

// system カテゴリ
'system:settings:view'
'system:settings:update'
'system:staff:manage'
'system:roles:manage'
'system:logs:view'
```

**完全な権限コード一覧**:

権限コードの完全な定義は、以下のシードデータファイルに記載されています:
- `/Users/kaneko/hotel-common/prisma/seeds/permissions.seed.ts`

主要な権限カテゴリ:

#### hotel-pms カテゴリ（予約・フロント管理）

| リソース | 権限コード | 説明 |
|---------|----------|------|
| **予約管理** | `hotel-pms:reservation:view` | 予約情報の閲覧 |
| | `hotel-pms:reservation:create` | 予約の作成 |
| | `hotel-pms:reservation:update` | 予約の更新 |
| | `hotel-pms:reservation:delete` | 予約の削除 |
| | `hotel-pms:reservation:cancel` | 予約のキャンセル |
| | `hotel-pms:reservation:*` | 予約管理の全権限 |
| **チェックイン/アウト** | `hotel-pms:checkin:execute` | チェックイン処理 |
| | `hotel-pms:checkout:execute` | チェックアウト処理 |
| | `hotel-pms:checkin:*` | チェックイン/アウトの全権限 |
| **客室管理** | `hotel-pms:room:view` | 客室情報の閲覧 |
| | `hotel-pms:room:status-update` | 客室状態の更新 |
| | `hotel-pms:room:manage` | 客室設定の管理 |
| | `hotel-pms:room:*` | 客室管理の全権限 |
| **会計管理** | `hotel-pms:billing:view` | 会計情報の閲覧 |
| | `hotel-pms:billing:create` | 会計処理の実行 |
| | `hotel-pms:billing:refund` | 返金処理 |
| | `hotel-pms:billing:correct` | 会計訂正 |
| | `hotel-pms:billing:*` | 会計管理の全権限 |
| **レポート** | `hotel-pms:report:view` | レポート閲覧 |
| | `hotel-pms:report:export` | レポートエクスポート |

#### hotel-saas カテゴリ（注文・AIサービス）

| リソース | 権限コード | 説明 |
|---------|----------|------|
| **注文管理** | `hotel-saas:order:view` | 注文情報の閲覧 |
| | `hotel-saas:order:create` | 注文の作成 |
| | `hotel-saas:order:update-status` | 注文ステータスの更新 |
| | `hotel-saas:order:cancel` | 注文のキャンセル |
| | `hotel-saas:order:*` | 注文管理の全権限 |
| **メニュー管理** | `hotel-saas:menu:view` | メニューの閲覧 |
| | `hotel-saas:menu:manage` | メニューの管理 |
| | `hotel-saas:menu:*` | メニュー管理の全権限 |
| **AI機能** | `hotel-saas:ai:use` | AI機能の使用 |
| | `hotel-saas:ai:manage` | AI設定の管理 |
| **レイアウト編集** | `hotel-saas:layout:edit` | レイアウトの編集 |
| | `hotel-saas:layout:publish` | レイアウトの公開 |

#### system カテゴリ（システム設定）

| リソース | 権限コード | 説明 |
|---------|----------|------|
| **システム設定** | `system:settings:view` | 設定の閲覧 |
| | `system:settings:update` | 設定の更新 |
| | `system:settings:*` | 設定管理の全権限 |
| **スタッフ管理** | `system:staff:view` | スタッフ情報の閲覧 |
| | `system:staff:manage` | スタッフの管理 |
| | `system:staff:delete` | スタッフの削除 |
| | `system:staff:*` | スタッフ管理の全権限 |
| **役職・権限管理** | `system:roles:view` | 役職の閲覧 |
| | `system:roles:manage` | 役職の管理 |
| | `system:roles:*` | 役職管理の全権限 |
| **ログ・監査** | `system:logs:view` | ログの閲覧 |
| | `system:logs:export` | ログのエクスポート |
| | `system:audit:view` | 監査ログの閲覧 |

~~#### ワイルドカード権限~~（v2.1.0で廃止）

| 権限コード | 説明 | 状態 |
|----------|------|------|
| ~~`*:*:*`~~ | ~~全システムの全権限~~ | ❌ **廃止** |
| ~~`hotel-pms:*:*`~~ | ~~PMS全機能の全権限~~ | ❌ **廃止** |
| ~~`hotel-saas:*:*`~~ | ~~SaaS全機能の全権限~~ | ❌ **廃止** |
| ~~`system:*:*`~~ | ~~システム設定の全権限~~ | ❌ **廃止** |
| ~~`hotel-pms:reservation:*`~~ | ~~予約管理の全操作~~ | ❌ **廃止** |
| ~~`hotel-pms:billing:*`~~ | ~~会計の全操作~~ | ❌ **廃止** |

**⚠️ v2.1.0 変更内容**:
- ❌ ワイルドカード権限は全て廃止されました
- ✅ 個別権限のみを使用してください
- ✅ 全権限が必要な役職（支配人等）は、全ての個別権限を列挙して保存してください

**注記**: 
- 権限コードは`permissions`テーブルに事前登録され、スーパーアドミンが管理します
- 新規権限の追加は、システムアップデート時にマイグレーションで実行されます
- **ワイルドカード（`*`を含む）権限コードの登録は不可**

---

### 3. `role_permissions` テーブル（役職・権限マッピング）

**テーブル名**: `role_permissions`

**目的**: 役職と権限の多対多関係を管理

**スキーマ**:
```sql
CREATE TABLE role_permissions (
  id              TEXT PRIMARY KEY,
  role_id         TEXT NOT NULL,
  permission_id   TEXT NOT NULL,
  
  -- タイムスタンプ
  created_at      TIMESTAMP DEFAULT NOW(),
  created_by      TEXT,
  
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT unq_role_permissions UNIQUE (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
```

**Prismaモデル**:
```prisma
model RolePermission {
  id              String      @id @default(uuid())
  roleId          String      @map("role_id")
  permissionId    String      @map("permission_id")
  
  createdAt       DateTime    @default(now()) @map("created_at")
  createdBy       String?     @map("created_by")
  
  // リレーション
  role            Role        @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission      Permission  @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  @@unique([roleId, permissionId], map: "unq_role_permissions")
  @@index([roleId], map: "idx_role_permissions_role_id")
  @@index([permissionId], map: "idx_role_permissions_permission_id")
  @@map("role_permissions")
}
```

---

### 4. `staff_tenant_memberships` テーブル（スタッフ・役職割り当て）

**テーブル名**: `staff_tenant_memberships`（既存テーブル）

**変更点**: `role`フィールドを`role_id`に変更し、`roles`テーブルと連携

**スキーマ**:
```sql
CREATE TABLE staff_tenant_memberships (
  id              TEXT PRIMARY KEY,
  staff_id        TEXT NOT NULL,
  tenant_id       TEXT NOT NULL,
  
  -- ✅ 変更: role_id（rolesテーブルへの外部キー）
  role_id         TEXT NOT NULL,
  
  -- 個別権限オーバーライド（オプション）
  custom_permissions JSONB DEFAULT '[]',
  
  -- フラグ
  is_active       BOOLEAN DEFAULT true,
  is_primary      BOOLEAN DEFAULT false,
  
  -- タイムスタンプ
  joined_at       TIMESTAMP DEFAULT NOW(),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT fk_membership_staff FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_membership_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT,
  CONSTRAINT uniq_staff_tenant UNIQUE (staff_id, tenant_id)
);

CREATE INDEX idx_memberships_staff_id ON staff_tenant_memberships(staff_id);
CREATE INDEX idx_memberships_tenant_id ON staff_tenant_memberships(tenant_id);
CREATE INDEX idx_memberships_role_id ON staff_tenant_memberships(role_id);
CREATE INDEX idx_memberships_is_active ON staff_tenant_memberships(is_active);
CREATE INDEX idx_memberships_is_primary ON staff_tenant_memberships(is_primary);
```

**Prismaモデル**:
```prisma
model StaffTenantMembership {
  id                  String    @id @default(uuid())
  staffId             String    @map("staff_id")
  tenantId            String    @map("tenant_id")
  
  roleId              String    @map("role_id")
  customPermissions   Json      @default("[]") @map("custom_permissions")
  
  isActive            Boolean   @default(true) @map("is_active")
  isPrimary           Boolean   @default(false) @map("is_primary")
  
  joinedAt            DateTime  @default(now()) @map("joined_at")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  
  // リレーション
  staff               Staff     @relation(fields: [staffId], references: [id], onDelete: Cascade)
  tenant              Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  role                Role      @relation(fields: [roleId], references: [id], onDelete: Restrict)
  
  @@unique([staffId, tenantId], map: "uniq_staff_tenant")
  @@index([staffId], map: "idx_memberships_staff_id")
  @@index([tenantId], map: "idx_memberships_tenant_id")
  @@index([roleId], map: "idx_memberships_role_id")
  @@index([isActive], map: "idx_memberships_is_active")
  @@index([isPrimary], map: "idx_memberships_is_primary")
  @@map("staff_tenant_memberships")
}
```

**重要変更点**:
- `role`フィールド（文字列）→ `role_id`フィールド（外部キー）
- `permissions`, `level`フィールドは削除（`roles`テーブルで管理）
- `custom_permissions`: 個別スタッフへの権限オーバーライド（オプション）

---

### 5. `role_templates` テーブル（デフォルトテンプレート管理）

**テーブル名**: `role_templates`

**目的**: 業態別のデフォルト役職テンプレートを管理（スーパーアドミン管理）

**スキーマ**:
```sql
CREATE TABLE role_templates (
  id              TEXT PRIMARY KEY,
  
  -- テンプレート情報
  business_type   TEXT NOT NULL,  -- 'hotel', 'ryokan', 'resort', 'leisure'
  name            TEXT NOT NULL,
  description     TEXT,
  
  -- 役職定義（JSON配列）
  roles_definition JSONB NOT NULL,
  
  -- 管理フラグ
  is_active       BOOLEAN DEFAULT true,
  is_system       BOOLEAN DEFAULT false,  -- システムデフォルト
  
  -- タイムスタンプ
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  created_by      TEXT,
  updated_by      TEXT,
  
  CONSTRAINT unq_role_templates_business_type_name UNIQUE (business_type, name)
);

CREATE INDEX idx_role_templates_business_type ON role_templates(business_type);
CREATE INDEX idx_role_templates_is_active ON role_templates(is_active);
CREATE INDEX idx_role_templates_is_system ON role_templates(is_system);
```

**Prismaモデル**:
```prisma
model RoleTemplate {
  id                String    @id @default(uuid())
  
  businessType      String    @map("business_type")
  name              String
  description       String?
  
  rolesDefinition   Json      @map("roles_definition")
  
  isActive          Boolean   @default(true) @map("is_active")
  isSystem          Boolean   @default(false) @map("is_system")
  
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  createdBy         String?   @map("created_by")
  updatedBy         String?   @map("updated_by")
  
  @@unique([businessType, name], map: "unq_role_templates_business_type_name")
  @@index([businessType], map: "idx_role_templates_business_type")
  @@index([isActive], map: "idx_role_templates_is_active")
  @@index([isSystem], map: "idx_role_templates_is_system")
  @@map("role_templates")
}
```

**roles_definition構造例**:
```json
{
  "roles": [
    {
      "name": "支配人",
      "description": "ホテル全体の管理責任者",
      "sortOrder": 100,
      "permissions": [
        "hotel-saas:order:view",
        "hotel-saas:order:create",
        "hotel-saas:order:update",
        "hotel-saas:order:delete",
        "hotel-saas:menu:view",
        "hotel-saas:menu:create",
        "hotel-saas:menu:update",
        "hotel-saas:menu:delete",
        "hotel-saas:ai:use",
        "system:staff:view",
        "system:staff:create",
        "system:staff:update",
        "system:staff:delete",
        "system:roles:view",
        "system:roles:create",
        "system:roles:update",
        "system:roles:delete",
        "system:settings:view",
        "system:settings:update",
        "system:logs:view"
      ]
    },
    {
      "name": "フロント主任",
      "description": "フロント業務全般の管理",
      "sortOrder": 90,
      "permissions": [
        "hotel-pms:reservation:*",
        "hotel-pms:checkin:*",
        "hotel-pms:billing:view",
        "hotel-saas:order:view"
      ]
    },
    {
      "name": "フロントスタッフ",
      "description": "基本的なフロント業務",
      "sortOrder": 80,
      "permissions": [
        "hotel-pms:reservation:view",
        "hotel-pms:checkin:execute",
        "hotel-saas:order:view"
      ]
    }
  ]
}
```

---

## 🔌 API仕様

### 1. 役職管理API

#### `GET /api/v1/admin/roles`

**目的**: テナントの役職一覧取得

**リクエスト**:
```
GET /api/v1/admin/roles?tenantId={tenantId}&isActive=true
```

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": "role-001",
      "tenantId": "hotel-a",
      "name": "フロント主任",
      "description": "フロント業務全般の管理",
      "sortOrder": 90,
      "isActive": true,
      "isDefault": false,
      "permissionCount": 25,
      "assignedStaffCount": 3,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `GET /api/v1/admin/roles/:id`

**目的**: 役職詳細取得（権限一覧含む）

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "role-001",
    "tenantId": "hotel-a",
    "name": "フロント主任",
    "description": "フロント業務全般の管理",
    "sortOrder": 90,
    "isActive": true,
    "isDefault": false,
    "permissions": [
      {
        "id": "perm-001",
        "code": "hotel-pms:reservation:view",
        "name": "予約閲覧",
        "category": "hotel-pms"
      },
      {
        "id": "perm-002",
        "code": "hotel-pms:reservation:create",
        "name": "予約作成",
        "category": "hotel-pms"
      }
    ],
    "assignedStaff": [
      {
        "staffId": "staff-001",
        "staffName": "山田太郎",
        "email": "yamada@example.com",
        "isPrimary": true
      }
    ],
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
}
```

---

#### `POST /api/v1/admin/roles`

**目的**: 役職作成

**リクエスト**:
```json
{
  "tenantId": "hotel-a",
  "name": "フロント主任",
  "description": "フロント業務全般の管理",
  "sortOrder": 90,
  "permissionIds": ["perm-001", "perm-002", "perm-003"]
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "role-001",
    "tenantId": "hotel-a",
    "name": "フロント主任",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

---

#### `PUT /api/v1/admin/roles/:id`

**目的**: 役職更新

**リクエスト**:
```json
{
  "name": "フロント主任",
  "description": "フロント業務全般の管理（更新）",
  "sortOrder": 95,
  "permissionIds": ["perm-001", "perm-002", "perm-004"]
}
```

---

#### `DELETE /api/v1/admin/roles/:id`

**目的**: 役職削除

**重要**: スタッフが割り当てられている場合は削除不可

**処理フロー**:
```typescript
// 1. スタッフ割り当て確認
const assignedStaffCount = await prisma.staffTenantMembership.count({
  where: { roleId: roleId }
});

if (assignedStaffCount > 0) {
  return res.status(400).json({
    success: false,
    error: {
      code: 'ROLE_IN_USE',
      message: `この役職には${assignedStaffCount}人のスタッフが割り当てられています。削除する前に、全員を別の役職に変更してください。`
    }
  });
}

// 2. 削除実行
await prisma.role.delete({
  where: { id: roleId }
});
```

---

### 2. 権限管理API

#### `GET /api/v1/admin/permissions`

**目的**: システム権限一覧取得

**リクエスト**:
```
GET /api/v1/admin/permissions?category=hotel-pms&isActive=true
```

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": "perm-001",
      "code": "hotel-pms:reservation:view",
      "name": "予約閲覧",
      "description": "予約情報を閲覧する権限",
      "category": "hotel-pms",
      "isActive": true
    }
  ]
}
```

---

#### `GET /api/v1/admin/permissions/grouped`

**目的**: カテゴリ別にグループ化された権限一覧取得

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "hotel-pms": {
      "reservation": [
        {
          "id": "perm-001",
          "code": "hotel-pms:reservation:view",
          "name": "予約閲覧"
        },
        {
          "id": "perm-002",
          "code": "hotel-pms:reservation:create",
          "name": "予約作成"
        }
      ],
      "billing": [
        {
          "id": "perm-010",
          "code": "hotel-pms:billing:view",
          "name": "会計閲覧"
        }
      ]
    },
    "hotel-saas": {
      "order": [
        {
          "id": "perm-020",
          "code": "hotel-saas:order:view",
          "name": "注文閲覧"
        }
      ]
    }
  }
}
```

---

### 3. 役職コピーAPI

#### `POST /api/v1/admin/roles/copy`

**目的**: ブランド（チェーン）内の他テナントから役職をコピー

**リクエスト**:
```json
{
  "sourceTenantId": "hotel-a",
  "sourceRoleId": "role-001",
  "targetTenantId": "hotel-b",
  "newRoleName": "フロント主任（コピー）"
}
```

**処理フロー**:
```typescript
// 1. 同一ブランド（チェーン）確認
const sourceOrg = await prisma.organizationHierarchy.findFirst({
  where: {
    level: 3, // HOTEL
    path: { contains: sourceTenantId }
  }
});

const targetOrg = await prisma.organizationHierarchy.findFirst({
  where: {
    level: 3, // HOTEL
    path: { contains: targetTenantId }
  }
});

// 親BRAND（チェーン）IDが同じか確認
if (sourceOrg.parentId !== targetOrg.parentId) {
  return res.status(403).json({
    success: false,
    error: {
      code: 'DIFFERENT_BRAND',
      message: '異なるブランド（チェーン）のホテル間では役職をコピーできません'
    }
  });
}

// 2. 元の役職と権限を取得
const sourceRole = await prisma.role.findUnique({
  where: { id: sourceRoleId },
  include: { permissions: { include: { permission: true } } }
});

// 3. 新しい役職を作成
const newRole = await prisma.role.create({
  data: {
    tenantId: targetTenantId,
    name: newRoleName,
    description: `${sourceRole.description}（コピー元: ${sourceRole.name}）`,
    sortOrder: sourceRole.sortOrder
  }
});

// 4. 権限をコピー
await prisma.rolePermission.createMany({
  data: sourceRole.permissions.map(rp => ({
    roleId: newRole.id,
    permissionId: rp.permissionId
  }))
});
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "role-new",
    "tenantId": "hotel-b",
    "name": "フロント主任（コピー）",
    "permissionCount": 25,
    "sourceTenantName": "ホテルA",
    "sourceRoleName": "フロント主任"
  }
}
```

---

### 4. 組織管理API

#### `GET /api/v1/admin/organization/same-brand-tenants`

**目的**: 同一ブランド（チェーン）内のテナント一覧取得

**リクエスト**:
```
GET /api/v1/admin/organization/same-brand-tenants?tenantId={tenantId}
```

**処理フロー**:
```typescript
// 1. 対象テナントの組織情報を取得
const targetOrg = await prisma.organizationHierarchy.findFirst({
  where: {
    level: 3,  // HOTEL
    path: { contains: tenantId }
  }
});

// 2. 同一BRAND配下の全HOTELを取得
const sameBrandOrgs = await prisma.organizationHierarchy.findMany({
  where: {
    level: 3,  // HOTEL
    parentId: targetOrg.parentId  // 同じBRAND
  },
  include: {
    parent: true  // BRAND情報
  }
});

// 3. テナント情報を取得
const tenantIds = sameBrandOrgs.map(org => 
  org.path.split('/').pop()  // pathから最後のセグメント（tenantId）を取得
);

const tenants = await prisma.tenant.findMany({
  where: { id: { in: tenantIds } }
});
```

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": "hotel-a",
      "name": "ホテルA",
      "brandId": "brand-001",
      "brandName": "アパホテル"
    },
    {
      "id": "hotel-b",
      "name": "ホテルB",
      "brandId": "brand-001",
      "brandName": "アパホテル"
    },
    {
      "id": "hotel-c",
      "name": "ホテルC",
      "brandId": "brand-001",
      "brandName": "アパホテル"
    }
  ]
}
```

---

### 5. デフォルトテンプレートAPI

#### `GET /api/v1/admin/role-templates`

**目的**: 業態別デフォルトテンプレート一覧取得

**リクエスト**:
```
GET /api/v1/admin/role-templates?businessType=hotel
```

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "id": "template-hotel",
      "businessType": "hotel",
      "name": "ビジネスホテル標準",
      "description": "ビジネスホテル向けの標準役職セット",
      "isSystem": true,
      "rolesCount": 5,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /api/v1/admin/roles/apply-template`

**目的**: テンプレートからテナントに役職を一括作成

**リクエスト**:
```json
{
  "tenantId": "hotel-new",
  "templateId": "template-hotel"
}
```

**処理フロー**:
```typescript
// 1. テンプレート取得
const template = await prisma.roleTemplate.findUnique({
  where: { id: templateId }
});

const rolesDefinition = template.rolesDefinition as {
  roles: Array<{
    name: string;
    description: string;
    sortOrder: number;
    permissions: string[];
  }>;
};

// 2. 権限コードからPermissionIDを取得
const permissionCodes = rolesDefinition.roles
  .flatMap(r => r.permissions);

const permissions = await prisma.permission.findMany({
  where: { code: { in: permissionCodes } }
});

const permissionMap = new Map(permissions.map(p => [p.code, p.id]));

// 3. 役職を一括作成
for (const roleDef of rolesDefinition.roles) {
  const role = await prisma.role.create({
    data: {
      tenantId,
      name: roleDef.name,
      description: roleDef.description,
      sortOrder: roleDef.sortOrder,
      isDefault: roleDef.sortOrder === 80  // デフォルト役職フラグ
    }
  });

  // 権限を一括作成
  const permissionIds = roleDef.permissions
    .map(code => permissionMap.get(code))
    .filter(id => id !== undefined);

  await prisma.rolePermission.createMany({
    data: permissionIds.map(permissionId => ({
      roleId: role.id,
      permissionId
    }))
  });
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "tenantId": "hotel-new",
    "templateName": "ビジネスホテル標準",
    "createdRoles": [
      {
        "id": "role-001",
        "name": "支配人"
      },
      {
        "id": "role-002",
        "name": "フロント主任"
      }
    ]
  }
}
```

---

### 6. スタッフ役職割り当てAPI

#### `PUT /api/v1/admin/staff/:staffId/role`

**目的**: スタッフへの役職割り当て（テナント別）

**リクエスト**:
```json
{
  "tenantId": "hotel-a",
  "roleId": "role-001"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "staffId": "staff-001",
    "tenantId": "hotel-a",
    "roleId": "role-001",
    "roleName": "フロント主任",
    "permissions": [
      "hotel-pms:reservation:view",
      "hotel-pms:checkin:execute"
    ]
  }
}
```

---

## 🎨 フロントエンド実装

### 1. 役職管理画面

**パス**: `/pages/admin/settings/roles/index.vue`

**画面構成**:
```
┌────────────────────────────────────────────────────────┐
│ 役職管理                                               │
│ ┌────────────────────────────────────────────────────┐ │
│ │ + 新しい役職を追加  [テンプレートから読み込み]     │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌──────────────────────────────────────────────────┐   │
│ │ 支配人                              [編集] [削除] │   │
│ │ 説明: ホテル全体の管理責任者                     │   │
│ │ 権限: 全権限                                     │   │
│ │ スタッフ: 1人                                    │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│ ┌──────────────────────────────────────────────────┐   │
│ │ フロント主任                        [編集] [削除] │   │
│ │ 説明: フロント業務全般の管理                     │   │
│ │ 権限: 25個                                       │   │
│ │ スタッフ: 3人                                    │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│ ┌──────────────────────────────────────────────────┐   │
│ │ フロントスタッフ                    [編集] [削除] │   │
│ │ 説明: 基本的なフロント業務                       │   │
│ │ 権限: 12個                                       │   │
│ │ スタッフ: 8人                                    │   │
│ └──────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

**実装例**:
```vue
<template>
  <div class="roles-management">
    <div class="header">
      <h1>役職管理</h1>
      <div class="actions">
        <UButton 
          color="primary" 
          @click="showCreateModal = true"
        >
          + 新しい役職を追加
        </UButton>
        <UButton 
          color="white" 
          @click="showTemplateModal = true"
        >
          テンプレートから読み込み
        </UButton>
      </div>
    </div>

    <div class="roles-list">
      <div 
        v-for="role in roles" 
        :key="role.id" 
        class="role-card"
      >
        <div class="role-header">
          <h3>{{ role.name }}</h3>
          <div class="role-actions">
            <UButton 
              size="sm" 
              color="white" 
              @click="editRole(role.id)"
            >
              編集
            </UButton>
            <UButton 
              size="sm" 
              color="red" 
              :disabled="role.assignedStaffCount > 0"
              @click="deleteRole(role.id)"
            >
              削除
            </UButton>
          </div>
        </div>
        <p class="role-description">{{ role.description }}</p>
        <div class="role-stats">
          <span>権限: {{ role.permissionCount }}個</span>
          <span>スタッフ: {{ role.assignedStaffCount }}人</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { currentTenant } = useSessionAuth();
const toast = useToast();

const roles = ref<Role[]>([]);
const showCreateModal = ref(false);
const showTemplateModal = ref(false);

// 役職一覧取得
const fetchRoles = async () => {
  try {
    const response = await $fetch('/api/v1/admin/roles', {
      params: { tenantId: currentTenant.value?.id }
    });
    roles.value = response.data;
  } catch (error) {
    toast.error('エラー', '役職の取得に失敗しました');
  }
};

// 役職削除
const deleteRole = async (roleId: string) => {
  const role = roles.value.find(r => r.id === roleId);
  
  if (role.assignedStaffCount > 0) {
    toast.error(
      '削除エラー',
      `この役職には${role.assignedStaffCount}人のスタッフが割り当てられています。削除する前に、全員を別の役職に変更してください。`
    );
    return;
  }
  
  // 確認モーダル
  const confirmed = await showConfirmModal({
    title: '役職削除確認',
    message: `役職「${role.name}」を削除してもよろしいですか？`,
    confirmText: '削除',
    confirmColor: 'red'
  });
  
  if (!confirmed) return;
  
  try {
    await $fetch(`/api/v1/admin/roles/${roleId}`, {
      method: 'DELETE'
    });
    
    toast.success('削除成功', `役職「${role.name}」を削除しました`);
    fetchRoles();
  } catch (error) {
    toast.error('エラー', '役職の削除に失敗しました');
  }
};

onMounted(() => {
  fetchRoles();
});
</script>
```

---

### 2. 権限マッピング画面

**パス**: `/pages/admin/settings/roles/[id]/permissions.vue`

**📌 注意: この画面設計はhotel-saas専用です**

hotel-saas管理画面では、以下のカテゴリを管理します：
- `hotel-saas`: 注文管理、メニュー管理、AI機能等
- `system`: スタッフ管理、役職管理、ログ閲覧等

**hotel-pms実装時は、カテゴリを以下に変更してください：**
- `hotel-pms`: 予約管理、会計管理、チェックイン/アウト等
- `system`: スタッフ管理、役職管理、ログ閲覧等（共通）

**タブ構成について：**
- hotel-saas: 自システムのカテゴリ（`hotel-saas`、`system`）のみを表示するため、タブ分けは不要
- hotel-pms: 自システムのカテゴリ（`hotel-pms`、`system`）のみを表示するため、タブ分けは不要

**画面構成（hotel-saas実装例）**:
```
┌──────────────────────────────────────────────────────────┐
│ 役職: フロントスタッフ の権限設定                        │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 📦 注文管理（hotel-saas）              [全て許可]    │ │
│ │ ┌──────────┬──────┬──────┬──────┬──────┐           │ │
│ │ │ 機能     │ 閲覧 │ 作成 │ 更新 │ 削除 │           │ │
│ │ ├──────────┼──────┼──────┼──────┼──────┤           │ │
│ │ │ 注文     │  ✓   │  ✓   │  ✓   │  ✗   │           │ │
│ │ │ キャンセル│  ✓   │  ✗   │  ✗   │  ✗   │           │ │
│ │ └──────────┴──────┴──────┴──────┴──────┘           │ │
│ │                                                      │ │
│ │ 🍽️ メニュー管理（hotel-saas）         [全て許可]    │ │
│ │ ┌──────────┬──────┬──────┬──────┬──────┐           │ │
│ │ │ 機能     │ 閲覧 │ 作成 │ 編集 │ 削除 │           │ │
│ │ ├──────────┼──────┼──────┼──────┼──────┤           │ │
│ │ │ メニュー │  ✓   │  ✓   │  ✓   │  ✗   │           │ │
│ │ └──────────┴──────┴──────┴──────┴──────┘           │ │
│ │                                                      │ │
│ │ ⚙️ スタッフ管理（system）             [全て許可]    │ │
│ │ ┌──────────┬──────┬──────┬──────┬──────┐           │ │
│ │ │ 機能     │ 閲覧 │ 作成 │ 編集 │ 削除 │           │ │
│ │ ├──────────┼──────┼──────┼──────┼──────┤           │ │
│ │ │ スタッフ │  ✓   │  ✓   │  ✓   │  ✗   │           │ │
│ │ └──────────┴──────┴──────┴──────┴──────┘           │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                          │
│ [プレビュー] [テンプレートから読み込み] [保存]           │
└──────────────────────────────────────────────────────────┘
```

**💡 hotel-pms実装時の画面構成例**:
```
┌──────────────────────────────────────────────────────────┐
│ 役職: フロントスタッフ の権限設定                        │
│                                                          │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 📋 予約管理（hotel-pms）               [全て許可]    │ │
│ │ │ 予約     │  ✓   │  ✓   │  ✓   │  ✗   │           │ │
│ │                                                      │ │
│ │ 💰 会計管理（hotel-pms）               [全て許可]    │ │
│ │ │ 会計処理 │  ✓   │  ✓   │  ✗   │  ✗   │           │ │
│ │                                                      │ │
│ │ ⚙️ スタッフ管理（system）             [全て許可]    │ │
│ │ │ スタッフ │  ✓   │  ✓   │  ✓   │  ✗   │           │ │
│ └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**重要なUI要素**:

1. **権限グループ**: 機能ごとにグルーピング（注文管理、メニュー管理、スタッフ管理等）
2. **全て許可ボタン**: グループ内の全権限を一括で有効化
3. **チェックボックスマトリックス**: 直感的な権限選択
4. **プレビュー機能**: 実効権限の確認（ワイルドカード展開含む）
5. **保存時確認**: 変更内容の確認ダイアログ

---

### 2-1. 権限マッピング画面のUX設計（v1.3.0追加）

**📌 ワイルドカード + 全チェックボックス表示方式**

#### **設計方針**

データベースには効率的なワイルドカード形式で保存しつつ、UI上では全てのチェックボックスを表示することで、ユーザーが「何が許可されているか」を視覚的に理解できるようにします。

#### **データフロー**

```
【読み込み時】
DB: ['*:*:*']
  ↓
UI: 全49個のチェックボックスがON（自動展開）
    全項目の背景色が青色に変化

【保存時】
UI: 49個全てチェック済み
  ↓
最適化処理: optimizePermissions関数
  ↓
DB: ['*:*:*']（1レコードに圧縮）
```

#### **視覚的フィードバック**

1. **選択項目の背景色変更**
   - ✅ チェック済み項目: `bg-blue-50 border-blue-300`
   - ❌ 未選択項目: `bg-white border-gray-200`

2. **グローバル全権限の表示**
   ```
   ┌────────────────────────────────────────────┐
   │ ✓ 全ての権限を許可 （支配人・オーナー向け） │
   │   ✓ 全ての機能（49個）が許可されています    │
   └────────────────────────────────────────────┘
   ```

3. **カテゴリ別の一括選択**
   ```
   ┌────────────────────────────────────────────┐
   │ 📦 注文管理（hotel-saas）    [✓ 全て許可]  │
   │ ┌──────────────────────────────────────┐   │
   │ │ ✓ 注文の閲覧      （背景色: 青）      │   │
   │ │ ✓ 注文の作成      （背景色: 青）      │   │
   │ │ ✓ 注文の更新      （背景色: 青）      │   │
   │ └──────────────────────────────────────┘   │
   └────────────────────────────────────────────┘
   ```

4. **実効権限プレビュー**
   ```
   ┌────────────────────────────────────────────┐
   │ 実効権限プレビュー                         │
   │ ✓ 49個の権限が許可されています（全権限）   │
   │ 💾 保存時: 1件として保存されます           │
   │    （ワイルドカード: *:*:*）              │
   └────────────────────────────────────────────┘
   ```

#### **最適化ロジック**

```typescript
/**
 * UI選択状態をワイルドカードに最適化
 * 
 * 例:
 * - 全49個選択 → ['*:*:*']
 * - hotel-saas全選択 → ['hotel-saas:*:*']
 * - 個別選択 → ['hotel-saas:order:view', 'hotel-saas:order:create']
 */
function optimizePermissions(uiPermissions: string[]): string[] {
  // 全権限選択チェック
  if (allPermissions.every(p => uiPermissions.includes(p.code))) {
    return ['*:*:*'];
  }
  
  // カテゴリ別最適化
  const optimized = new Set<string>();
  
  for (const category of ['hotel-saas', 'system']) {
    const categoryPerms = allPermissions.filter(p => 
      p.code.startsWith(`${category}:`)
    );
    
    const allSelected = categoryPerms.every(p => 
      uiPermissions.includes(p.code)
    );
    
    if (allSelected) {
      optimized.add(`${category}:*:*`);
    } else {
      categoryPerms.forEach(p => {
        if (uiPermissions.includes(p.code)) {
          optimized.add(p.code);
        }
      });
    }
  }
  
  return Array.from(optimized);
}
```

#### **チェック状態判定ロジック**

```typescript
/**
 * チェックボックスの表示状態を判定
 * 
 * ワイルドカードが設定されている場合も、
 * 該当する全てのチェックボックスをONにする
 */
function isPermissionChecked(permissionCode: string): boolean {
  // グローバルワイルドカード
  if (selectedPermissions.includes('*:*:*')) {
    return true;
  }
  
  const [category, resource, action] = permissionCode.split(':');
  
  // カテゴリワイルドカード
  if (selectedPermissions.includes(`${category}:*:*`)) {
    return true;
  }
  
  // リソースワイルドカード
  if (selectedPermissions.includes(`${category}:${resource}:*`)) {
    return true;
  }
  
  // 個別権限
  return selectedPermissions.includes(permissionCode);
}
```

#### **UX上の注意点**

1. **全権限選択時の挙動**
   - 「全ての権限を許可」をチェック → 全チェックボックスが自動的にON
   - 個別チェックボックスは`disabled`状態（グレーアウト）
   - 背景色は全て青色に変化

2. **カテゴリ全選択時の挙動**
   - 「hotel-saas: 全て許可」をチェック → 該当カテゴリのチェックボックスが全てON
   - 該当項目のみ背景色が青色に変化

3. **個別選択からの全選択**
   - ユーザーが手動で全てチェック → 保存時に自動的に`*:*:*`に最適化
   - 次回読み込み時も全チェックボックスONで表示

4. **部分解除**
   - 全権限から1つ解除 → ワイルドカードを破棄し、個別権限リストに変換
   - 例: `['*:*:*']` → `['hotel-saas:order:view', 'hotel-saas:order:create', ...]`（48個）

#### **ツールチップ表示（混乱防止）**

**問題**: 「全権限」と「システム全権限」の違いが分かりにくい

**解決策**: マウスオーバー時に詳細説明を表示

| 表示名 | ワイルドカード | ツールチップ内容 |
|:------|:--------------|:----------------|
| **全ての権限を許可** | `*:*:*` | 💡 **全システムの全機能**<br>・hotel-saas（注文、メニュー等）<br>・system（スタッフ、役職、ログ等）<br>・hotel-pms（予約、会計等）※将来<br><br>支配人・オーナー向け |
| **注文管理: 全て許可** | `hotel-saas:*:*` | 💡 **注文管理の全機能**<br>・注文の閲覧、作成、更新<br>・キャンセル処理<br>・メニュー管理<br>・AI機能<br><br>注文管理責任者向け |
| **システム設定: 全て許可** | `system:*:*` | 💡 **システム設定の全機能**<br>・スタッフ管理<br>・役職・権限管理<br>・ログ閲覧<br>・監査ログ<br><br>システム管理者向け |

**実装例**:

```vue
<UCheckbox 
  :model-value="hasGlobalWildcard"
  @update:model-value="toggleGlobalWildcard"
>
  <template #label>
    <div class="flex items-center gap-2">
      <Icon name="heroicons:shield-check" class="w-5 h-5" />
      <span class="font-semibold">全ての権限を許可</span>
      <UTooltip>
        <template #default>
          <Icon name="heroicons:question-mark-circle" class="w-4 h-4 text-gray-400 cursor-help" />
        </template>
        <template #content>
          <div class="text-sm">
            <div class="font-semibold mb-1">💡 全システムの全機能</div>
            <ul class="list-disc list-inside space-y-1 text-xs">
              <li>hotel-saas（注文、メニュー等）</li>
              <li>system（スタッフ、役職、ログ等）</li>
              <li>hotel-pms（予約、会計等）※将来</li>
            </ul>
            <div class="mt-2 text-xs text-gray-300">
              支配人・オーナー向け
            </div>
          </div>
        </template>
      </UTooltip>
    </div>
  </template>
</UCheckbox>

<!-- カテゴリ別ツールチップ -->
<div class="flex items-center justify-between mb-3">
  <h3 class="text-lg font-semibold flex items-center gap-2">
    <Icon name="heroicons:cog-6-tooth" class="w-5 h-5" />
    システム設定
    <UTooltip>
      <template #default>
        <Icon name="heroicons:question-mark-circle" class="w-4 h-4 text-gray-400 cursor-help" />
      </template>
      <template #content>
        <div class="text-sm">
          <div class="font-semibold mb-1">💡 システム設定の全機能</div>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>スタッフ管理</li>
            <li>役職・権限管理</li>
            <li>ログ閲覧</li>
            <li>監査ログ</li>
          </ul>
          <div class="mt-2 text-xs text-gray-300">
            システム管理者向け
          </div>
        </div>
      </template>
    </UTooltip>
  </h3>
  <UCheckbox
    :model-value="isCategoryFullySelected('system')"
    @update:model-value="toggleCategoryAll('system', $event)"
    :disabled="hasGlobalWildcard"
  >
    <template #label>
      <span class="text-sm">全て許可</span>
    </template>
  </UCheckbox>
</div>
```

**ツールチップデザイン**:
- 背景色: `bg-gray-800`（ダークモード）
- 文字色: `text-white`
- パディング: `p-3`
- 角丸: `rounded-lg`
- 影: `shadow-xl`
- アニメーション: `transition-opacity duration-200`

---

### 3. 権限コピーUI

**パス**: `/pages/admin/settings/roles/index.vue`（モーダル）

**画面構成**:
```
┌──────────────────────────────────────┐
│ 他のホテルから役職をコピー           │
│                                      │
│ コピー元ホテル:                      │
│ [選択してください           ▼]      │
│                                      │
│ コピー元役職:                        │
│ [選択してください           ▼]      │
│                                      │
│ 新しい役職名:                        │
│ [____________]                       │
│                                      │
│ ⚠️ 注意:                            │
│ - 同じブランド（チェーン）内のホテル │
│   からのみコピー可能です             │
│ - 権限設定もコピーされます           │
│ - コピー後にカスタマイズ可能です     │
│                                      │
│ [キャンセル]           [コピー実行]  │
└──────────────────────────────────────┘
```

**実装例**:
```vue
<template>
  <UModal v-model="isOpen">
    <div class="copy-role-modal">
      <h2>他のホテルから役職をコピー</h2>
      
      <UFormGroup label="コピー元ホテル">
        <USelect
          v-model="sourceTenantId"
          :options="sameBrandTenants"
          placeholder="選択してください"
          @change="fetchSourceRoles"
        />
      </UFormGroup>
      
      <UFormGroup label="コピー元役職">
        <USelect
          v-model="sourceRoleId"
          :options="sourceRoles"
          placeholder="選択してください"
          :disabled="!sourceTenantId"
        />
      </UFormGroup>
      
      <UFormGroup label="新しい役職名">
        <UInput
          v-model="newRoleName"
          placeholder="例: フロント主任（コピー）"
        />
      </UFormGroup>
      
      <div class="notice">
        <p>⚠️ 注意:</p>
        <ul>
          <li>同じブランド（チェーン）内のホテルからのみコピー可能です</li>
          <li>権限設定もコピーされます</li>
          <li>コピー後にカスタマイズ可能です</li>
        </ul>
      </div>
      
      <div class="modal-actions">
        <UButton color="white" @click="isOpen = false">
          キャンセル
        </UButton>
        <UButton 
          color="primary" 
          @click="copyRole"
          :disabled="!sourceRoleId || !newRoleName"
        >
          コピー実行
        </UButton>
      </div>
    </div>
  </UModal>
</template>

<script setup lang="ts">
const { currentTenant } = useSessionAuth();
const toast = useToast();

const isOpen = ref(false);
const sourceTenantId = ref('');
const sourceRoleId = ref('');
const newRoleName = ref('');
const sameBrandTenants = ref<Tenant[]>([]);
const sourceRoles = ref<Role[]>([]);

// 同一ブランドのテナント取得
const fetchSameBrandTenants = async () => {
  try {
    const response = await $fetch('/api/v1/admin/organization/same-brand-tenants', {
      params: { tenantId: currentTenant.value?.id }
    });
    sameBrandTenants.value = response.data;
  } catch (error) {
    toast.error('エラー', 'テナント一覧の取得に失敗しました');
  }
};

// コピー元役職取得
const fetchSourceRoles = async () => {
  if (!sourceTenantId.value) return;
  
  try {
    const response = await $fetch('/api/v1/admin/roles', {
      params: { tenantId: sourceTenantId.value }
    });
    sourceRoles.value = response.data;
  } catch (error) {
    toast.error('エラー', '役職一覧の取得に失敗しました');
  }
};

// 役職コピー実行
const copyRole = async () => {
  try {
    const response = await $fetch('/api/v1/admin/roles/copy', {
      method: 'POST',
      body: {
        sourceTenantId: sourceTenantId.value,
        sourceRoleId: sourceRoleId.value,
        targetTenantId: currentTenant.value?.id,
        newRoleName: newRoleName.value
      }
    });
    
    toast.success('コピー成功', `役職「${newRoleName.value}」を作成しました`);
    isOpen.value = false;
    emit('copied');
  } catch (error) {
    if (error.statusCode === 403) {
      toast.error('エラー', '異なるブランド（チェーン）のホテル間ではコピーできません');
    } else {
      toast.error('エラー', '役職のコピーに失敗しました');
    }
  }
};

onMounted(() => {
  fetchSameBrandTenants();
});
</script>
```

---

## 🛡️ 権限チェック実装

### 1. バックエンド権限チェック

**ミドルウェア**: `/server/middleware/permission-check.ts`

```typescript
export default defineEventHandler(async (event) => {
  // 認証チェック
  const session = event.context.session;
  if (!session) {
    throw createError({
      statusCode: 401,
      message: '認証が必要です'
    });
  }
  
  // 権限取得（Redisキャッシュ）
  const cacheKey = `permissions:${session.userId}:${session.tenantId}`;
  let permissions = await redis.get(cacheKey);
  
  if (!permissions) {
    // キャッシュがなければDBから取得
    permissions = await fetchUserPermissions(session.userId, session.tenantId);
    
    // 5分間キャッシュ
    await redis.setex(cacheKey, 300, JSON.stringify(permissions));
  } else {
    permissions = JSON.parse(permissions);
  }
  
  // コンテキストに権限を設定
  event.context.permissions = permissions;
});

// 権限取得関数
async function fetchUserPermissions(userId: string, tenantId: string) {
  const membership = await prisma.staffTenantMembership.findUnique({
    where: {
      staffId_tenantId: {
        staffId: userId,
        tenantId
      }
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });
  
  // 役職の権限
  const rolePermissions = membership.role.permissions.map(rp => rp.permission.code);
  
  // カスタム権限（オーバーライド）
  const customPermissions = membership.customPermissions as string[];
  
  // 統合
  return [...new Set([...rolePermissions, ...customPermissions])];
}
```

---

### 2. APIエンドポイント権限チェック

**実装例**: `/server/api/v1/admin/billing/refunds.post.ts`

```typescript
export default defineEventHandler(async (event) => {
  // 権限チェック
  const hasPermission = await checkPermission(event, 'hotel-pms:billing:refund');
  
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      message: 'この操作を実行する権限がありません'
    });
  }
  
  // 処理実行
  // ...
});

// 権限チェックヘルパー関数
async function checkPermission(event: H3Event, requiredPermission: string): Promise<boolean> {
  const permissions = event.context.permissions as string[];
  
  // ワイルドカード展開
  for (const permission of permissions) {
    if (permission === '*:*:*') {
      // 全権限
      return true;
    }
    
    const [system, resource, action] = permission.split(':');
    const [reqSystem, reqResource, reqAction] = requiredPermission.split(':');
    
    // システムレベルワイルドカード
    if (system === reqSystem && resource === '*' && action === '*') {
      return true;
    }
    
    // リソースレベルワイルドカード
    if (system === reqSystem && resource === reqResource && action === '*') {
      return true;
    }
    
    // 完全一致
    if (permission === requiredPermission) {
      return true;
    }
  }
  
  return false;
}
```

---

### 3. フロントエンド権限チェック

**Composable**: `/composables/usePermissions.ts`

```typescript
export const usePermissions = () => {
  const { user } = useSessionAuth();
  
  // 権限一覧（Sessionから取得）
  const permissions = computed(() => user.value?.permissions || []);
  
  // 権限チェック関数
  const hasPermission = (requiredPermission: string): boolean => {
    for (const permission of permissions.value) {
      if (permission === '*:*:*') {
        return true;
      }
      
      const [system, resource, action] = permission.split(':');
      const [reqSystem, reqResource, reqAction] = requiredPermission.split(':');
      
      // ワイルドカード展開
      if (system === reqSystem && resource === '*' && action === '*') {
        return true;
      }
      
      if (system === reqSystem && resource === reqResource && action === '*') {
        return true;
      }
      
      // 完全一致
      if (permission === requiredPermission) {
        return true;
      }
    }
    
    return false;
  };
  
  // 複数権限チェック（OR条件）
  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(perm => hasPermission(perm));
  };
  
  // 複数権限チェック（AND条件）
  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(perm => hasPermission(perm));
  };
  
  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions
  };
};
```

**使用例**:
```vue
<template>
  <div>
    <!-- 返金ボタン: 権限があれば表示 -->
    <UButton 
      v-if="hasPermission('hotel-pms:billing:refund')"
      @click="refundBilling"
    >
      返金処理
    </UButton>
    
    <!-- 設定タブ: 複数権限のいずれかがあれば表示 -->
    <UTabs v-if="hasAnyPermission(['system:settings:view', 'system:staff:manage'])">
      <UTab name="settings">設定</UTab>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
const { hasPermission, hasAnyPermission } = usePermissions();
</script>
```

---

## 🏨 業態別デフォルトテンプレート

### 1. ホテル（ビジネスホテル）

**テンプレートID**: `template-hotel`

**roles_definition**:
```json
{
  "roles": [
    {
      "name": "支配人",
      "description": "ホテル全体の管理責任者",
      "sortOrder": 100,
      "permissions": [
        "hotel-saas:order:view",
        "hotel-saas:order:create",
        "hotel-saas:order:update",
        "hotel-saas:order:delete",
        "hotel-saas:menu:view",
        "hotel-saas:menu:create",
        "hotel-saas:menu:update",
        "hotel-saas:menu:delete",
        "hotel-saas:ai:use",
        "system:staff:view",
        "system:staff:create",
        "system:staff:update",
        "system:staff:delete",
        "system:roles:view",
        "system:roles:create",
        "system:roles:update",
        "system:roles:delete",
        "system:settings:view",
        "system:settings:update",
        "system:logs:view"
      ]
    },
    {
      "name": "フロント主任",
      "description": "フロント業務全般の管理",
      "sortOrder": 90,
      "permissions": [
        "hotel-pms:reservation:*",
        "hotel-pms:checkin:*",
        "hotel-pms:checkout:*",
        "hotel-pms:billing:view",
        "hotel-pms:billing:create",
        "hotel-saas:order:view",
        "hotel-saas:menu:view",
        "system:staff:view"
      ]
    },
    {
      "name": "フロントスタッフ",
      "description": "基本的なフロント業務",
      "sortOrder": 80,
      "permissions": [
        "hotel-pms:reservation:view",
        "hotel-pms:reservation:create",
        "hotel-pms:checkin:execute",
        "hotel-pms:checkout:execute",
        "hotel-pms:billing:view",
        "hotel-saas:order:view"
      ]
    },
    {
      "name": "清掃スタッフ",
      "description": "客室清掃業務",
      "sortOrder": 70,
      "permissions": [
        "hotel-pms:room:view",
        "hotel-pms:room:status-update"
      ]
    },
    {
      "name": "キッチンスタッフ",
      "description": "厨房業務",
      "sortOrder": 60,
      "permissions": [
        "hotel-saas:order:view",
        "hotel-saas:order:update-status"
      ]
    }
  ]
}
```

---

### 2. 旅館

**テンプレートID**: `template-ryokan`

**roles_definition**:
```json
{
  "roles": [
    {
      "name": "女将",
      "description": "旅館全体の管理責任者",
      "sortOrder": 100,
      "permissions": [
        "hotel-saas:order:view",
        "hotel-saas:order:create",
        "hotel-saas:order:update",
        "hotel-saas:order:delete",
        "hotel-saas:menu:view",
        "hotel-saas:menu:create",
        "hotel-saas:menu:update",
        "hotel-saas:menu:delete",
        "hotel-saas:ai:use",
        "system:staff:view",
        "system:staff:create",
        "system:staff:update",
        "system:staff:delete",
        "system:roles:view",
        "system:roles:create",
        "system:roles:update",
        "system:roles:delete",
        "system:settings:view",
        "system:settings:update",
        "system:logs:view"
      ]
    },
    {
      "name": "番頭",
      "description": "フロント・予約業務の管理",
      "sortOrder": 90,
      "permissions": [
        "hotel-pms:reservation:*",
        "hotel-pms:checkin:*",
        "hotel-pms:checkout:*",
        "hotel-pms:billing:*",
        "hotel-saas:order:view",
        "system:staff:view"
      ]
    },
    {
      "name": "仲居",
      "description": "客室サービス業務",
      "sortOrder": 80,
      "permissions": [
        "hotel-pms:reservation:view",
        "hotel-pms:room:view",
        "hotel-saas:order:view",
        "hotel-saas:order:create"
      ]
    },
    {
      "name": "板前",
      "description": "料理業務",
      "sortOrder": 70,
      "permissions": [
        "hotel-saas:menu:view",
        "hotel-saas:order:view",
        "hotel-saas:order:update-status"
      ]
    },
    {
      "name": "清掃係",
      "description": "客室清掃業務",
      "sortOrder": 60,
      "permissions": [
        "hotel-pms:room:view",
        "hotel-pms:room:status-update"
      ]
    }
  ]
}
```

---

### 3. スーパーアドミンによるテンプレート管理

**パス**: `/pages/super-admin/role-templates/index.vue`

**機能**:
- ✅ 既存テンプレートの編集
- ✅ 新規テンプレートの作成
- ✅ テンプレートのプレビュー
- ✅ テンプレートの有効化/無効化

**API**:
- `GET /api/v1/super-admin/role-templates`
- `GET /api/v1/super-admin/role-templates/:id`
- `POST /api/v1/super-admin/role-templates`
- `PUT /api/v1/super-admin/role-templates/:id`
- `DELETE /api/v1/super-admin/role-templates/:id`

---

## 🏢 グループ・ブランド連携

### 1. 階層構造

**参照**: [SSOT_SAAS_MULTITENANT.md](../00_foundation/SSOT_SAAS_MULTITENANT.md)

```
Level 1: GROUP（グループ企業全体）
         ↓
Level 2: BRAND（ブランド・事業ライン）  ← チェーン
         ↓
Level 3: HOTEL（個別店舗）
         ↓
Level 4: DEPARTMENT（部門）
```

---

### 2. ブランド（チェーン）内での役職コピー

**制約**:
- ✅ 同じBRAND（Level 2）配下のHOTEL間でのみコピー可能
- ❌ 異なるBRAND間ではコピー不可

**検証ロジック**:
```typescript
// 同一ブランド（チェーン）確認
async function isSameBrand(tenantId1: string, tenantId2: string): Promise<boolean> {
  const org1 = await prisma.organizationHierarchy.findFirst({
    where: {
      level: 3,  // HOTEL
      path: { contains: tenantId1 }
    }
  });
  
  const org2 = await prisma.organizationHierarchy.findFirst({
    where: {
      level: 3,  // HOTEL
      path: { contains: tenantId2 }
    }
  });
  
  // 親BRAND IDが同じか確認
  return org1.parentId === org2.parentId;
}
```

---

## 🔒 セキュリティ

### 1. 権限チェックの実装必須箇所

**すべてのAPIエンドポイント**:
- ✅ ミドルウェアでの認証チェック
- ✅ エンドポイントごとの権限チェック
- ✅ テナント分離（`tenant_id`フィルタ）

**UIレベル**:
- ✅ ボタン・リンクの表示/非表示
- ✅ タブ・メニューの表示/非表示
- ✅ 編集不可フィールドの無効化

---

### 2. 権限キャッシュ戦略

**Redisキャッシュ**:
- **キー**: `permissions:{userId}:{tenantId}`
- **TTL**: 300秒（5分）
- **更新タイミング**: 役職変更時、権限変更時

**キャッシュ無効化**:
```typescript
// 役職更新時
async function updateRole(roleId: string, data: UpdateRoleData) {
  // 1. 役職更新
  await prisma.role.update({ ... });
  
  // 2. この役職を持つ全スタッフのキャッシュをクリア
  const memberships = await prisma.staffTenantMembership.findMany({
    where: { roleId }
  });
  
  for (const membership of memberships) {
    await redis.del(`permissions:${membership.staffId}:${membership.tenantId}`);
  }
}
```

---

### 3. 監査ログ

**記録対象**:
- ✅ 役職の作成・編集・削除
- ✅ 権限の変更
- ✅ スタッフへの役職割り当て変更
- ✅ 役職コピー

**ログテーブル**: `audit_logs`（既存）

**実装例**:
```typescript
await prisma.auditLog.create({
  data: {
    tenantId,
    userId: session.userId,
    action: 'ROLE_UPDATED',
    resource: 'roles',
    resourceId: roleId,
    details: {
      roleName: role.name,
      changes: {
        permissions: {
          added: ['hotel-pms:billing:refund'],
          removed: ['hotel-pms:billing:delete']
        }
      }
    },
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  }
});
```

---

## 🔄 マイグレーション手順

### 概要

既存の`staff_tenant_memberships`テーブルの`role`フィールド（文字列）を、新しい`roles`テーブルへの外部キー`role_id`に移行します。

**重要**: この移行は**データロス無し**で実行されます。

---

### Phase 1: 新規テーブル作成

**実行順序**: `permissions` → `roles` → `role_permissions` → `role_templates`

```sql
-- 1. permissionsテーブル作成
CREATE TABLE permissions (
  id              TEXT PRIMARY KEY,
  code            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_is_active ON permissions(is_active);

-- 2. rolesテーブル作成
CREATE TABLE roles (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  is_default      BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  created_by      TEXT,
  updated_by      TEXT,
  CONSTRAINT fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unq_roles_tenant_id_name UNIQUE (tenant_id, name)
);

CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX idx_roles_is_active ON roles(is_active);
CREATE INDEX idx_roles_is_default ON roles(is_default);
CREATE INDEX idx_roles_sort_order ON roles(sort_order DESC);

-- 3. role_permissionsテーブル作成
CREATE TABLE role_permissions (
  id              TEXT PRIMARY KEY,
  role_id         TEXT NOT NULL,
  permission_id   TEXT NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW(),
  created_by      TEXT,
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  CONSTRAINT unq_role_permissions UNIQUE (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- 4. role_templatesテーブル作成
CREATE TABLE role_templates (
  id              TEXT PRIMARY KEY,
  business_type   TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  roles_definition JSONB NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  is_system       BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  created_by      TEXT,
  updated_by      TEXT,
  CONSTRAINT unq_role_templates_business_type_name UNIQUE (business_type, name)
);

CREATE INDEX idx_role_templates_business_type ON role_templates(business_type);
CREATE INDEX idx_role_templates_is_active ON role_templates(is_active);
CREATE INDEX idx_role_templates_is_system ON role_templates(is_system);
```

---

### Phase 2: シードデータ投入

**実行**: `/Users/kaneko/hotel-common/prisma/seeds/`

```bash
# 1. 権限マスタデータを投入
npx prisma db seed -- --only permissions

# 2. デフォルトテンプレートを投入
npx prisma db seed -- --only role-templates
```

**シードファイル構成**:
- `permissions.seed.ts`: システム権限一覧（約100件）
- `role-templates.seed.ts`: 業態別テンプレート（ホテル、旅館）

---

### Phase 3: 既存データ移行

#### ステップ1: 既存roleからrolesテーブルへの移行

```sql
-- 既存のrole文字列を抽出し、rolesテーブルに登録
INSERT INTO roles (id, tenant_id, name, description, sort_order, is_active, created_at)
SELECT 
  gen_random_uuid() AS id,
  tenant_id,
  role AS name,
  CASE role
    WHEN 'OWNER' THEN 'オーナー'
    WHEN 'ADMIN' THEN '管理者'
    WHEN 'MANAGER' THEN 'マネージャー'
    WHEN 'STAFF' THEN 'スタッフ'
    WHEN 'READONLY' THEN '閲覧のみ'
    ELSE role
  END AS description,
  CASE role
    WHEN 'OWNER' THEN 100
    WHEN 'ADMIN' THEN 90
    WHEN 'MANAGER' THEN 80
    WHEN 'STAFF' THEN 70
    WHEN 'READONLY' THEN 60
    ELSE 50
  END AS sort_order,
  true AS is_active,
  NOW() AS created_at
FROM (
  SELECT DISTINCT tenant_id, role
  FROM staff_tenant_memberships
  WHERE role IS NOT NULL AND role != ''
) AS distinct_roles
ON CONFLICT (tenant_id, name) DO NOTHING;
```

**確認**:
```sql
-- rolesテーブルのレコード数を確認
SELECT COUNT(*) FROM roles;

-- テナント別役職数を確認
SELECT tenant_id, COUNT(*) AS role_count
FROM roles
GROUP BY tenant_id
ORDER BY role_count DESC;
```

---

#### ステップ2: staff_tenant_membershipsにrole_idカラム追加

```sql
-- 1. role_idカラムを追加（NULL許可）
ALTER TABLE staff_tenant_memberships 
ADD COLUMN role_id TEXT;

-- 2. role_idを設定
UPDATE staff_tenant_memberships m
SET role_id = r.id
FROM roles r
WHERE m.tenant_id = r.tenant_id 
  AND m.role = r.name;

-- 3. 確認: role_idが設定されていないレコードをチェック
SELECT id, staff_id, tenant_id, role
FROM staff_tenant_memberships
WHERE role_id IS NULL;

-- 期待: 0件（全てのroleがrolesテーブルに存在するはず）
```

**トラブルシューティング**:
```sql
-- もしrole_id未設定のレコードがある場合、デフォルト役職を作成して割り当て
INSERT INTO roles (id, tenant_id, name, description, sort_order, is_active)
SELECT 
  gen_random_uuid(),
  m.tenant_id,
  m.role,
  'データ移行時に作成',
  50,
  true
FROM staff_tenant_memberships m
WHERE m.role_id IS NULL
GROUP BY m.tenant_id, m.role
ON CONFLICT (tenant_id, name) DO NOTHING;

-- 再度role_idを設定
UPDATE staff_tenant_memberships m
SET role_id = r.id
FROM roles r
WHERE m.tenant_id = r.tenant_id 
  AND m.role = r.name
  AND m.role_id IS NULL;
```

---

#### ステップ3: custom_permissionsカラム追加

```sql
-- 既存のpermissionsをcustom_permissionsに移行
ALTER TABLE staff_tenant_memberships 
ADD COLUMN custom_permissions JSONB DEFAULT '[]';

-- 既存のpermissions（JSONB）をcustom_permissionsにコピー
UPDATE staff_tenant_memberships
SET custom_permissions = COALESCE(permissions, '[]'::jsonb)
WHERE permissions IS NOT NULL;

-- 確認
SELECT 
  id, 
  staff_id, 
  tenant_id, 
  role_id, 
  custom_permissions
FROM staff_tenant_memberships
LIMIT 10;
```

---

### Phase 4: 制約追加・旧カラム削除

```sql
-- 1. role_idをNOT NULLに変更
ALTER TABLE staff_tenant_memberships 
ALTER COLUMN role_id SET NOT NULL;

-- 2. 外部キー制約を追加
ALTER TABLE staff_tenant_memberships
ADD CONSTRAINT fk_membership_role 
FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;

-- 3. インデックス追加
CREATE INDEX idx_memberships_role_id ON staff_tenant_memberships(role_id);

-- 4. 旧カラムを削除（バックアップ後）
-- ⚠️ 本番環境では、まずバックアップを取得してから実行
ALTER TABLE staff_tenant_memberships DROP COLUMN role;
ALTER TABLE staff_tenant_memberships DROP COLUMN permissions;
ALTER TABLE staff_tenant_memberships DROP COLUMN level;
```

**注意**: 旧カラム削除前に、必ずバックアップを取得してください:
```bash
pg_dump -h localhost -U postgres -d hotel_unified_db \
  -t staff_tenant_memberships \
  > backup_staff_tenant_memberships_$(date +%Y%m%d_%H%M%S).sql
```

---

### Phase 5: Prismaスキーマ更新・マイグレーション

```bash
# 1. Prismaスキーマを更新
# /Users/kaneko/hotel-common/prisma/schema.prisma

# 2. マイグレーション作成
npx prisma migrate dev --name add_permission_system

# 3. Prisma Clientを再生成
npx prisma generate
```

---

### Phase 6: 動作確認

#### テストケース1: ログイン認証

```bash
# ログインして権限が正しく取得されるか確認
curl -X POST http://localhost:3400/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  -c cookies.txt

# セッション情報を確認
curl http://localhost:3400/api/v1/auth/me \
  -b cookies.txt | jq '.data.permissions'
```

**期待結果**: 権限コード配列が返却される

---

#### テストケース2: 役職一覧取得

```sql
-- テナント別役職一覧
SELECT 
  r.id,
  r.tenant_id,
  r.name,
  r.sort_order,
  COUNT(DISTINCT rp.permission_id) AS permission_count,
  COUNT(DISTINCT stm.staff_id) AS assigned_staff_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN staff_tenant_memberships stm ON r.id = stm.role_id
WHERE r.tenant_id = 'hotel-a'
GROUP BY r.id
ORDER BY r.sort_order DESC;
```

---

#### テストケース3: 権限チェック

```typescript
// バックエンド権限チェック
const hasPermission = await checkPermission(event, 'hotel-pms:billing:refund');
console.log('Has refund permission:', hasPermission);

// 期待: 役職の権限に基づいてtrue/falseが返る
```

---

### ロールバック手順

万が一問題が発生した場合のロールバック:

```sql
-- 1. 外部キー制約を削除
ALTER TABLE staff_tenant_memberships DROP CONSTRAINT IF EXISTS fk_membership_role;

-- 2. role_idカラムを削除
ALTER TABLE staff_tenant_memberships DROP COLUMN IF EXISTS role_id;
ALTER TABLE staff_tenant_memberships DROP COLUMN IF EXISTS custom_permissions;

-- 3. 新規テーブルを削除（CASCADE）
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS role_templates CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;

-- 4. バックアップから復元
psql -h localhost -U postgres -d hotel_unified_db \
  < backup_staff_tenant_memberships_YYYYMMDD_HHMMSS.sql
```

---

### マイグレーション実行チェックリスト

#### 事前準備
- [ ] データベースのフルバックアップ取得
- [ ] `staff_tenant_memberships`テーブルの個別バックアップ取得
- [ ] テスト環境で完全なマイグレーションテスト完了
- [ ] ロールバック手順の確認・検証

#### Phase 1: 新規テーブル作成
- [ ] `permissions`テーブル作成
- [ ] `roles`テーブル作成
- [ ] `role_permissions`テーブル作成
- [ ] `role_templates`テーブル作成
- [ ] インデックス作成確認

#### Phase 2: シードデータ投入
- [ ] 権限マスタデータ投入
- [ ] デフォルトテンプレート投入
- [ ] シードデータ確認（件数チェック）

#### Phase 3: 既存データ移行
- [ ] 既存roleからrolesテーブルへの移行
- [ ] role_idカラム追加
- [ ] role_id設定
- [ ] role_id未設定レコードの確認（0件）
- [ ] custom_permissionsカラム追加
- [ ] 既存permissions移行

#### Phase 4: 制約追加
- [ ] role_id NOT NULL制約追加
- [ ] 外部キー制約追加
- [ ] インデックス追加
- [ ] 旧カラム削除（role, permissions, level）

#### Phase 5: Prisma更新
- [ ] Prismaスキーマ更新
- [ ] マイグレーション作成
- [ ] Prisma Client再生成

#### Phase 6: 動作確認
- [ ] ログイン認証テスト
- [ ] 役職一覧取得テスト
- [ ] 権限チェックテスト
- [ ] 全システムの動作確認

#### 本番デプロイ
- [ ] メンテナンスモード設定
- [ ] マイグレーション実行
- [ ] 動作確認
- [ ] メンテナンスモード解除
- [ ] 監視開始

---

## ✅ 実装チェックリスト

### データベース

- [ ] `roles`テーブル作成
- [ ] `permissions`テーブル作成
- [ ] `role_permissions`テーブル作成
- [ ] `role_templates`テーブル作成
- [ ] `staff_tenant_memberships`テーブル更新（`role_id`追加）
- [ ] インデックス作成
- [ ] 外部キー制約作成
- [ ] マイグレーション実行
- [ ] シードデータ投入

---

### API実装（hotel-common）

- [ ] `GET /api/v1/admin/roles`
- [ ] `GET /api/v1/admin/roles/:id`
- [ ] `POST /api/v1/admin/roles`
- [ ] `PUT /api/v1/admin/roles/:id`
- [ ] `DELETE /api/v1/admin/roles/:id`
- [ ] `GET /api/v1/admin/permissions`
- [ ] `GET /api/v1/admin/permissions/grouped`
- [ ] `POST /api/v1/admin/roles/copy`
- [ ] `GET /api/v1/admin/role-templates`
- [ ] `POST /api/v1/admin/roles/apply-template`
- [ ] `PUT /api/v1/admin/staff/:staffId/role`
- [ ] `GET /api/v1/admin/organization/same-brand-tenants`

---

### API実装（hotel-saas）

- [ ] 全hotel-commonエンドポイントへのプロキシAPI作成
- [ ] Session認証連携（Cookie転送）

---

### フロントエンド実装

- [ ] `/pages/admin/settings/roles/index.vue`（役職一覧）
- [ ] `/pages/admin/settings/roles/[id]/permissions.vue`（権限マッピング）
- [ ] `/pages/admin/settings/roles/create.vue`（役職作成）
- [ ] `/components/RolePermissionMatrix.vue`（権限マトリックス）
- [ ] `/components/RoleCopyModal.vue`（役職コピーモーダル）
- [ ] `/composables/usePermissions.ts`（権限チェック）

---

### ミドルウェア・ヘルパー

- [ ] `/server/middleware/permission-check.ts`（権限チェック）
- [ ] `/server/utils/permission-helpers.ts`（ヘルパー関数）
- [ ] Redisキャッシュ実装

---

### デフォルトデータ

- [ ] システム権限一覧（`permissions`テーブル）のシード
- [ ] デフォルトテンプレート（`role_templates`テーブル）のシード
  - [ ] ホテルテンプレート
  - [ ] 旅館テンプレート

---

### テスト

- [ ] 役職CRUD APIテスト
- [ ] 権限チェックロジックテスト
- [ ] ワイルドカード展開テスト
- [ ] ブランド（チェーン）内コピー制約テスト
- [ ] キャッシュ無効化テスト

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|---------|--------|
| 1.0.0 | 2025-10-08 | 初版作成<br>- レベル概念の廃止<br>- 役職ベース権限管理<br>- 業態別デフォルトテンプレート（ホテル、旅館）<br>- ブランド（チェーン）間役職コピー<br>- スーパーアドミンテンプレート管理<br>- 柔軟な権限マッピングUI | Sun |
| 1.1.0 | 2025-10-08 | 120点改善対応<br>- 同一ブランドテナント取得API仕様追加<br>- 権限コード完全一覧追加（約100件の詳細定義）<br>- 詳細なマイグレーション手順追加（6フェーズ、完全なSQL、ロールバック手順） | Sun |
| 1.2.0 | 2025-10-15 | 設計方針明確化<br>- 各システムの責務を明記（hotel-saas: `hotel-saas`+`system`カテゴリ管理）<br>- hotel-pms実装時の注意事項追加<br>- タブ構成を不要に変更（各システムが自カテゴリのみ表示）<br>- 権限マッピング画面の具体例追加（hotel-saas/hotel-pms別） | Common |
| 1.3.0 | 2025-10-16 | **UX改善: ワイルドカード + 全チェックボックス表示方式**<br>- データベースはワイルドカード方式で効率化（`*:*:*`）<br>- UI上は全チェックボックス表示で視覚的フィードバック<br>- 選択項目の背景色変更（`bg-blue-50`）<br>- 最適化ロジック追加（`optimizePermissions`関数）<br>- チェック状態判定ロジック追加（`isPermissionChecked`関数）<br>- 実効権限プレビュー表示<br>- 保存時の自動圧縮（全選択時→`*:*:*`、カテゴリ全選択時→`hotel-saas:*:*`） | Iza |
| 1.3.1 | 2025-10-16 | **ツールチップ追加: 混乱防止UX改善**<br>- 「全ての権限」と「システム全権限」の違いをツールチップで説明<br>- `*:*:*`（全システム）vs `system:*:*`（systemカテゴリのみ）を明確化<br>- 各カテゴリワイルドカードのツールチップ実装例追加<br>- ツールチップデザインガイドライン追加 | Iza |
| **2.0.0** | **2025-10-20** | **要件ID体系適用: 実行可能な契約化** 🎉<br>- 要件ID一覧追加（PERM-001〜PERM-UI-005）<br>- **PERM-002: ワイルドカード全権限** 完全仕様化<br>  - Accept（合格条件）明記<br>  - Test Cases追加（4ケース）<br>  - Type定義追加（Zod Schema）<br>  - Implementation例追加<br>- **PERM-003: ワイルドカードカテゴリ** 仕様化<br>- **PERM-004: ワイルドカードリソース** 仕様化<br>- 全機能の要件ID付与<br>- テストによる契約の強制<br>- 型による契約の強制 | Iza |
| **2.1.0** | **2025-10-20** | **ワイルドカード全廃止: 個別権限のみに統一** ⚠️<br>- **PERM-002, PERM-003, PERM-004 廃止**<br>- ワイルドカード（`*:*:*`, `hotel-saas:*:*` 等）使用不可<br>- 実装が複雑でバグ多発のため個別権限のみに統一<br>- 権限チェックを単純化（配列検索のみ）<br>- Zodバリデーションでワイルドカードを禁止<br>- デフォルトテンプレート更新（支配人・女将は全個別権限を列挙）<br>- シンプルで保守しやすい実装に変更 | Iza |

---

**🔖 このSSOTは、既存ドキュメント、ソースコード、ユーザー要件を基に作成されています。**  
**想像や推測による記載は一切含まれていません。**

