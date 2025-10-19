# hotel-saas メニュー管理機能 実装指示書

**作成日**: 2025-10-06  
**対象SSOT**: `SSOT_SAAS_MENU_MANAGEMENT.md` (v2.2.0)  
**対象システム**: hotel-saas  
**担当AI**: Sun（天照大神）  
**実装優先度**: 🔴 最高（Phase 1）

---

## 📋 実装概要

hotel-commonのメニュー管理APIが完全実装済みであることを確認しました。次のステップとして、hotel-saasにプロキシAPIとComposableを実装します。

### 前提条件
- ✅ hotel-common: メニュー管理API完全実装済み（検証済み）
- ✅ データベース: menu_items, menu_categories テーブル存在確認済み
- ✅ 認証: UnifiedSessionMiddleware 実装済み
- ✅ APIパス: `/api/v1/admin/menu/*` 確定

---

## 🎯 実装目標

### 実装するもの
1. ✅ **Composable**: `useMenu.ts`（フロントエンド用）
2. ✅ **プロキシAPI**: 9エンドポイント（hotel-common への中継）
3. ✅ **型定義**: TypeScript型定義

### 実装しないもの
- ❌ UI画面（別タスク）
- ❌ データベース操作（hotel-commonが担当）
- ❌ ビジネスロジック（hotel-commonが担当）

---

## 📚 参照必須ドキュメント

### 1. SSOT（Single Source of Truth）
**ファイル**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md`

**重要セクション**:
- 📖 **API仕様**: 383-762行目
- 📖 **システム間連携**: 765-803行目
- 📖 **hotel-saas実装詳細**: 882-1117行目

### 2. hotel-common実装検証レポート
**ファイル**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT_IMPLEMENTATION_VERIFICATION.md`

**確認事項**:
- ✅ hotel-commonのAPI実装状況（100%完了）
- ✅ データベーススキーマ（完全準拠）
- ✅ 認証要件（Session認証必須）

### 3. 既存実装参考
**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/phone-order/menu.get.ts`

**参考ポイント**:
- 認証ヘッダーの構築方法
- hotel-commonへのAPI呼び出し方法
- エラーハンドリング

### 4. APIクライアント
**ファイル**: `/Users/kaneko/hotel-saas/server/utils/api-client.ts`

**確認事項**:
- ✅ `menuApi` 定義済み（327-389行目）
- ✅ `safeApiCall` ラッパー関数
- ✅ `apiClient` 基本関数

---

## 🚀 実装手順

### Phase 1: Composable実装（優先度: 最高）

#### ファイル: `/Users/kaneko/hotel-saas/composables/useMenu.ts`

**目的**: フロントエンドからメニュー管理APIを簡単に呼び出せるようにする

**実装内容**:

```typescript
/**
 * メニュー管理用Composable
 * SSOT: /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
 * 
 * ⚠️ 重要: このComposableは管理画面専用です
 * - Session認証必須
 * - スタッフのみ使用可能
 */

import type { Ref } from 'vue'

// ===== 型定義 =====

/**
 * メニューアイテム型
 */
export interface MenuItem {
  id: number
  tenantId: string
  nameJa: string
  nameEn?: string
  descriptionJa?: string
  descriptionEn?: string
  price: number
  cost?: number
  categoryId?: number
  imageUrl?: string
  isAvailable: boolean
  isFeatured: boolean
  isHidden: boolean
  displayOrder: number
  startTime?: string
  endTime?: string
  ageRestricted: boolean
  stockAvailable: boolean
  stockQuantity?: number
  lowStockThreshold: number
  tags: string[]
  images: string[]
  nutritionalInfo: Record<string, any>
  allergens: string[]
  createdAt: string
  updatedAt: string
  category?: MenuCategory
}

/**
 * メニューカテゴリ型
 */
export interface MenuCategory {
  id: number
  tenantId: string
  nameJa: string
  nameEn?: string
  descriptionJa?: string
  descriptionEn?: string
  parentId?: number
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  parent?: MenuCategory
  children?: MenuCategory[]
  menuItems?: MenuItem[]
}

/**
 * メニュー一覧取得パラメータ
 */
export interface GetMenuItemsParams {
  categoryId?: number
  isAvailable?: boolean
  isFeatured?: boolean
  search?: string
  page?: number
  limit?: number
}

/**
 * メニュー一覧レスポンス
 */
export interface GetMenuItemsResponse {
  menuItems: MenuItem[]
  total: number
  limit: number
  offset: number
}

/**
 * メニュー作成・更新データ
 */
export interface MenuItemInput {
  nameJa: string
  nameEn?: string
  descriptionJa?: string
  descriptionEn?: string
  price: number
  cost?: number
  categoryId?: number
  imageUrl?: string
  isAvailable?: boolean
  isFeatured?: boolean
  isHidden?: boolean
  displayOrder?: number
  startTime?: string
  endTime?: string
  ageRestricted?: boolean
  stockAvailable?: boolean
  stockQuantity?: number
  lowStockThreshold?: number
  tags?: string[]
  images?: string[]
  nutritionalInfo?: Record<string, any>
  allergens?: string[]
}

/**
 * カテゴリ作成・更新データ
 */
export interface MenuCategoryInput {
  nameJa: string
  nameEn?: string
  descriptionJa?: string
  descriptionEn?: string
  parentId?: number
  sortOrder?: number
  isActive?: boolean
}

// ===== Composable本体 =====

export const useMenu = () => {
  // 状態管理
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * エラーハンドリング共通処理
   */
  const handleError = (e: any, defaultMessage: string): never => {
    const errorMessage = e?.data?.error || e?.message || defaultMessage
    error.value = errorMessage
    console.error('[useMenu]', errorMessage, e)
    throw new Error(errorMessage)
  }

  // ===== メニューアイテムAPI =====

  /**
   * メニュー一覧取得
   * GET /api/v1/admin/menu/items
   */
  const getMenuItems = async (params?: GetMenuItemsParams): Promise<GetMenuItemsResponse> => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/v1/admin/menu/items', {
        method: 'GET',
        params: params as any
      })

      return response.data as GetMenuItemsResponse
    } catch (e: any) {
      handleError(e, 'メニュー一覧の取得に失敗しました')
    } finally {
      loading.value = false
    }
  }

  /**
   * メニュー詳細取得
   * GET /api/v1/admin/menu/items/:id
   */
  const getMenuItem = async (id: number): Promise<MenuItem> => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch(`/api/v1/admin/menu/items/${id}`, {
        method: 'GET'
      })

      return response.data as MenuItem
    } catch (e: any) {
      handleError(e, 'メニュー詳細の取得に失敗しました')
    } finally {
      loading.value = false
    }
  }

  /**
   * メニュー作成
   * POST /api/v1/admin/menu/items
   */
  const createMenuItem = async (data: MenuItemInput): Promise<MenuItem> => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/v1/admin/menu/items', {
        method: 'POST',
        body: data
      })

      return response.data as MenuItem
    } catch (e: any) {
      handleError(e, 'メニューの作成に失敗しました')
    } finally {
      loading.value = false
    }
  }

  /**
   * メニュー更新
   * PUT /api/v1/admin/menu/items/:id
   */
  const updateMenuItem = async (id: number, data: Partial<MenuItemInput>): Promise<MenuItem> => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch(`/api/v1/admin/menu/items/${id}`, {
        method: 'PUT',
        body: data
      })

      return response.data as MenuItem
    } catch (e: any) {
      handleError(e, 'メニューの更新に失敗しました')
    } finally {
      loading.value = false
    }
  }

  /**
   * メニュー削除（論理削除）
   * DELETE /api/v1/admin/menu/items/:id
   */
  const deleteMenuItem = async (id: number): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/v1/admin/menu/items/${id}`, {
        method: 'DELETE'
      })
    } catch (e: any) {
      handleError(e, 'メニューの削除に失敗しました')
    } finally {
      loading.value = false
    }
  }

  // ===== カテゴリAPI =====

  /**
   * カテゴリ一覧取得
   * GET /api/v1/admin/menu/categories
   */
  const getCategories = async (includeItems = false): Promise<MenuCategory[]> => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/v1/admin/menu/categories', {
        method: 'GET',
        params: {
          include_items: includeItems
        }
      })

      return response.data as MenuCategory[]
    } catch (e: any) {
      handleError(e, 'カテゴリ一覧の取得に失敗しました')
    } finally {
      loading.value = false
    }
  }

  /**
   * カテゴリ作成
   * POST /api/v1/admin/menu/categories
   */
  const createCategory = async (data: MenuCategoryInput): Promise<MenuCategory> => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch('/api/v1/admin/menu/categories', {
        method: 'POST',
        body: data
      })

      return response.data as MenuCategory
    } catch (e: any) {
      handleError(e, 'カテゴリの作成に失敗しました')
    } finally {
      loading.value = false
    }
  }

  /**
   * カテゴリ更新
   * PUT /api/v1/admin/menu/categories/:id
   */
  const updateCategory = async (id: number, data: Partial<MenuCategoryInput>): Promise<MenuCategory> => {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch(`/api/v1/admin/menu/categories/${id}`, {
        method: 'PUT',
        body: data
      })

      return response.data as MenuCategory
    } catch (e: any) {
      handleError(e, 'カテゴリの更新に失敗しました')
    } finally {
      loading.value = false
    }
  }

  /**
   * カテゴリ削除（論理削除）
   * DELETE /api/v1/admin/menu/categories/:id
   */
  const deleteCategory = async (id: number): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/v1/admin/menu/categories/${id}`, {
        method: 'DELETE'
      })
    } catch (e: any) {
      handleError(e, 'カテゴリの削除に失敗しました')
    } finally {
      loading.value = false
    }
  }

  // ===== 返却 =====

  return {
    // 状態
    loading: readonly(loading),
    error: readonly(error),

    // メニューアイテムAPI
    getMenuItems,
    getMenuItem,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,

    // カテゴリAPI
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory
  }
}
```

**実装のポイント**:
1. ✅ 完全な型定義（TypeScript strict mode対応）
2. ✅ エラーハンドリング統一
3. ✅ ローディング状態管理
4. ✅ readonly化（状態の直接変更を防止）
5. ✅ JSDocコメント完備

---

### Phase 2: プロキシAPI実装（優先度: 最高）

hotel-saasのプロキシAPIは、hotel-commonのAPIを中継するだけのシンプルな実装です。

#### 2.1 メニューアイテム一覧取得

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items.get.ts`

```typescript
/**
 * メニューアイテム一覧取得API（プロキシ）
 * SSOT: /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
 * 
 * hotel-common の GET /api/v1/admin/menu/items を中継
 */

import { menuApi } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  // 🔐 認証チェック
  const authUser = event.context.user
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    })
  }

  // テナントID取得
  const headersIn = getRequestHeaders(event)
  const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId

  if (!tenantId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'テナントIDが必要です'
    })
  }

  // クエリパラメータ取得
  const query = getQuery(event)

  // hotel-common へのリクエストヘッダー構築
  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'Authorization': `Bearer ${authUser.token}`
  }

  try {
    // hotel-common API呼び出し
    const response = await menuApi.getItems({
      headers: upstreamHeaders,
      ...query
    })

    return {
      success: true,
      data: response.data || response
    }
  } catch (error: any) {
    console.error('[menu/items.get] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'メニュー一覧の取得に失敗しました'
    })
  }
})
```

---

#### 2.2 メニューアイテム詳細取得

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items/[id].get.ts`

```typescript
/**
 * メニューアイテム詳細取得API（プロキシ）
 * SSOT: /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
 * 
 * hotel-common の GET /api/v1/admin/menu/items/:id を中継
 */

export default defineEventHandler(async (event) => {
  // 🔐 認証チェック
  const authUser = event.context.user
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    })
  }

  // パラメータ取得
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メニューIDが必要です'
    })
  }

  // テナントID取得
  const headersIn = getRequestHeaders(event)
  const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId

  // hotel-common へのリクエストヘッダー構築
  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'Authorization': `Bearer ${authUser.token}`
  }

  try {
    // hotel-common API呼び出し
    const response = await $fetch(`${process.env.COMMON_API_URL}/api/v1/admin/menu/items/${id}`, {
      method: 'GET',
      headers: upstreamHeaders
    })

    return {
      success: true,
      data: response.data || response
    }
  } catch (error: any) {
    console.error('[menu/items/[id].get] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'メニュー詳細の取得に失敗しました'
    })
  }
})
```

---

#### 2.3 メニューアイテム作成

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items.post.ts`

```typescript
/**
 * メニューアイテム作成API（プロキシ）
 * SSOT: /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
 * 
 * hotel-common の POST /api/v1/admin/menu/items を中継
 */

import { menuApi } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  // 🔐 認証チェック
  const authUser = event.context.user
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    })
  }

  // リクエストボディ取得
  const body = await readBody(event)

  // バリデーション
  if (!body.nameJa || body.price === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'nameJa と price は必須です'
    })
  }

  // テナントID取得
  const headersIn = getRequestHeaders(event)
  const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId

  // hotel-common へのリクエストヘッダー構築
  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'Authorization': `Bearer ${authUser.token}`
  }

  try {
    // hotel-common API呼び出し
    const response = await menuApi.createItem(body, upstreamHeaders)

    return {
      success: true,
      data: response.data || response
    }
  } catch (error: any) {
    console.error('[menu/items.post] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'メニューの作成に失敗しました'
    })
  }
})
```

---

#### 2.4 メニューアイテム更新

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items/[id].put.ts`

```typescript
/**
 * メニューアイテム更新API（プロキシ）
 * SSOT: /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
 * 
 * hotel-common の PUT /api/v1/admin/menu/items/:id を中継
 */

import { menuApi } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  // 🔐 認証チェック
  const authUser = event.context.user
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    })
  }

  // パラメータ取得
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メニューIDが必要です'
    })
  }

  // リクエストボディ取得
  const body = await readBody(event)

  // テナントID取得
  const headersIn = getRequestHeaders(event)
  const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId

  // hotel-common へのリクエストヘッダー構築
  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'Authorization': `Bearer ${authUser.token}`
  }

  try {
    // hotel-common API呼び出し
    const response = await menuApi.updateItem(id, body, upstreamHeaders)

    return {
      success: true,
      data: response.data || response
    }
  } catch (error: any) {
    console.error('[menu/items/[id].put] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'メニューの更新に失敗しました'
    })
  }
})
```

---

#### 2.5 メニューアイテム削除

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/items/[id].delete.ts`

```typescript
/**
 * メニューアイテム削除API（プロキシ）
 * SSOT: /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
 * 
 * hotel-common の DELETE /api/v1/admin/menu/items/:id を中継
 */

import { menuApi } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  // 🔐 認証チェック
  const authUser = event.context.user
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    })
  }

  // パラメータ取得
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メニューIDが必要です'
    })
  }

  // テナントID取得
  const headersIn = getRequestHeaders(event)
  const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId

  // hotel-common へのリクエストヘッダー構築
  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'Authorization': `Bearer ${authUser.token}`
  }

  try {
    // hotel-common API呼び出し
    const response = await menuApi.deleteItem(id, upstreamHeaders)

    return {
      success: true,
      data: response.data || response
    }
  } catch (error: any) {
    console.error('[menu/items/[id].delete] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'メニューの削除に失敗しました'
    })
  }
})
```

---

#### 2.6 カテゴリ一覧取得

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories.get.ts`

```typescript
/**
 * カテゴリ一覧取得API（プロキシ）
 * SSOT: /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
 * 
 * hotel-common の GET /api/v1/admin/menu/categories を中継
 */

import { menuApi } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  // 🔐 認証チェック
  const authUser = event.context.user
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    })
  }

  // テナントID取得
  const headersIn = getRequestHeaders(event)
  const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId

  // hotel-common へのリクエストヘッダー構築
  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'Authorization': `Bearer ${authUser.token}`
  }

  try {
    // hotel-common API呼び出し
    const response = await menuApi.getCategories(upstreamHeaders)

    return {
      success: true,
      data: response.data || response
    }
  } catch (error: any) {
    console.error('[menu/categories.get] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'カテゴリ一覧の取得に失敗しました'
    })
  }
})
```

---

#### 2.7 カテゴリ作成

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories.post.ts`

```typescript
/**
 * カテゴリ作成API（プロキシ）
 * SSOT: /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
 * 
 * hotel-common の POST /api/v1/admin/menu/categories を中継
 */

export default defineEventHandler(async (event) => {
  // 🔐 認証チェック
  const authUser = event.context.user
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    })
  }

  // リクエストボディ取得
  const body = await readBody(event)

  // バリデーション
  if (!body.nameJa) {
    throw createError({
      statusCode: 400,
      statusMessage: 'nameJa は必須です'
    })
  }

  // テナントID取得
  const headersIn = getRequestHeaders(event)
  const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId

  // hotel-common へのリクエストヘッダー構築
  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'Authorization': `Bearer ${authUser.token}`
  }

  try {
    // hotel-common API呼び出し
    const response = await $fetch(`${process.env.COMMON_API_URL}/api/v1/admin/menu/categories`, {
      method: 'POST',
      headers: upstreamHeaders,
      body
    })

    return {
      success: true,
      data: response.data || response
    }
  } catch (error: any) {
    console.error('[menu/categories.post] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'カテゴリの作成に失敗しました'
    })
  }
})
```

---

#### 2.8 カテゴリ更新

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories/[id].put.ts`

```typescript
/**
 * カテゴリ更新API（プロキシ）
 * SSOT: /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
 * 
 * hotel-common の PUT /api/v1/admin/menu/categories/:id を中継
 */

export default defineEventHandler(async (event) => {
  // 🔐 認証チェック
  const authUser = event.context.user
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    })
  }

  // パラメータ取得
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'カテゴリIDが必要です'
    })
  }

  // リクエストボディ取得
  const body = await readBody(event)

  // テナントID取得
  const headersIn = getRequestHeaders(event)
  const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId

  // hotel-common へのリクエストヘッダー構築
  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'Authorization': `Bearer ${authUser.token}`
  }

  try {
    // hotel-common API呼び出し
    const response = await $fetch(`${process.env.COMMON_API_URL}/api/v1/admin/menu/categories/${id}`, {
      method: 'PUT',
      headers: upstreamHeaders,
      body
    })

    return {
      success: true,
      data: response.data || response
    }
  } catch (error: any) {
    console.error('[menu/categories/[id].put] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'カテゴリの更新に失敗しました'
    })
  }
})
```

---

#### 2.9 カテゴリ削除

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/menu/categories/[id].delete.ts`

```typescript
/**
 * カテゴリ削除API（プロキシ）
 * SSOT: /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
 * 
 * hotel-common の DELETE /api/v1/admin/menu/categories/:id を中継
 */

export default defineEventHandler(async (event) => {
  // 🔐 認証チェック
  const authUser = event.context.user
  if (!authUser) {
    throw createError({
      statusCode: 401,
      statusMessage: 'ログインが必要です'
    })
  }

  // パラメータ取得
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'カテゴリIDが必要です'
    })
  }

  // テナントID取得
  const headersIn = getRequestHeaders(event)
  const tenantId = (headersIn['x-tenant-id'] as string) || authUser.tenantId

  // hotel-common へのリクエストヘッダー構築
  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId,
    'Authorization': `Bearer ${authUser.token}`
  }

  try {
    // hotel-common API呼び出し
    const response = await $fetch(`${process.env.COMMON_API_URL}/api/v1/admin/menu/categories/${id}`, {
      method: 'DELETE',
      headers: upstreamHeaders
    })

    return {
      success: true,
      data: response.data || response
    }
  } catch (error: any) {
    console.error('[menu/categories/[id].delete] エラー:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'カテゴリの削除に失敗しました'
    })
  }
})
```

---

## 📂 ディレクトリ構造（完成形）

```
/Users/kaneko/hotel-saas/
├── composables/
│   └── useMenu.ts                                    ✅ 新規作成
├── server/
│   ├── api/
│   │   └── v1/
│   │       └── admin/
│   │           └── menu/
│   │               ├── items.get.ts                  ✅ 新規作成
│   │               ├── items.post.ts                 ✅ 新規作成
│   │               ├── items/
│   │               │   ├── [id].get.ts              ✅ 新規作成
│   │               │   ├── [id].put.ts              ✅ 新規作成
│   │               │   └── [id].delete.ts           ✅ 新規作成
│   │               ├── categories.get.ts             ✅ 新規作成
│   │               ├── categories.post.ts            ✅ 新規作成
│   │               └── categories/
│   │                   ├── [id].put.ts              ✅ 新規作成
│   │                   └── [id].delete.ts           ✅ 新規作成
│   └── utils/
│       └── api-client.ts                             ✅ 既存（menuApi定義済み）
```

---

## ✅ 実装チェックリスト

### Phase 1: Composable
- [ ] `useMenu.ts` 作成
- [ ] 型定義完備
- [ ] エラーハンドリング実装
- [ ] JSDocコメント追加

### Phase 2: プロキシAPI（メニューアイテム）
- [ ] `items.get.ts` 作成
- [ ] `items.post.ts` 作成
- [ ] `items/[id].get.ts` 作成
- [ ] `items/[id].put.ts` 作成
- [ ] `items/[id].delete.ts` 作成

### Phase 3: プロキシAPI（カテゴリ）
- [ ] `categories.get.ts` 作成
- [ ] `categories.post.ts` 作成
- [ ] `categories/[id].put.ts` 作成
- [ ] `categories/[id].delete.ts` 作成

### Phase 4: 動作確認
- [ ] Composableの動作確認
- [ ] 各APIエンドポイントの動作確認
- [ ] エラーハンドリングの確認
- [ ] 認証の確認

---

## 🚨 重要な注意事項

### 1. 認証の徹底
```typescript
// ❌ 間違い：認証チェックなし
export default defineEventHandler(async (event) => {
  // 直接API呼び出し
})

// ✅ 正しい：必ず認証チェック
export default defineEventHandler(async (event) => {
  const authUser = event.context.user
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'ログインが必要です' })
  }
  // API呼び出し
})
```

### 2. テナントIDの必須化
```typescript
// ✅ 必ずテナントIDをヘッダーに含める
const upstreamHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'X-Tenant-ID': tenantId,  // 必須
  'Authorization': `Bearer ${authUser.token}`
}
```

### 3. エラーハンドリング
```typescript
// ✅ try-catch で必ずエラーをキャッチ
try {
  const response = await menuApi.getItems(...)
  return { success: true, data: response.data || response }
} catch (error: any) {
  console.error('[エンドポイント名] エラー:', error)
  throw createError({
    statusCode: error.statusCode || 500,
    statusMessage: error.message || 'デフォルトメッセージ'
  })
}
```

### 4. APIパスの統一
```typescript
// ✅ 正しい：/api/v1/admin/menu/*
'/api/v1/admin/menu/items'
'/api/v1/admin/menu/categories'

// ❌ 間違い：他のパス
'/api/v1/menu/items'  // adminが抜けている
'/api/v1/saas/menu/items'  // 古いパス
```

---

## 🧪 テスト方法

### 1. Composableのテスト

```typescript
// pages/admin/menu-test.vue
<script setup lang="ts">
const { loading, error, getMenuItems, createMenuItem } = useMenu()

// メニュー一覧取得テスト
const testGetItems = async () => {
  try {
    const result = await getMenuItems({ limit: 10 })
    console.log('メニュー一覧:', result)
  } catch (e) {
    console.error('エラー:', e)
  }
}

// メニュー作成テスト
const testCreateItem = async () => {
  try {
    const result = await createMenuItem({
      nameJa: 'テストメニュー',
      price: 1000
    })
    console.log('作成成功:', result)
  } catch (e) {
    console.error('エラー:', e)
  }
}
</script>

<template>
  <div>
    <h1>メニューAPI テスト</h1>
    <p v-if="loading">読み込み中...</p>
    <p v-if="error">エラー: {{ error }}</p>
    <button @click="testGetItems">一覧取得テスト</button>
    <button @click="testCreateItem">作成テスト</button>
  </div>
</template>
```

### 2. APIエンドポイントのテスト（curl）

```bash
# 1. メニュー一覧取得
curl -X GET "http://localhost:3100/api/v1/admin/menu/items" \
  -H "Cookie: hotel_session=YOUR_SESSION_ID" \
  -H "X-Tenant-ID: YOUR_TENANT_ID"

# 2. メニュー作成
curl -X POST "http://localhost:3100/api/v1/admin/menu/items" \
  -H "Cookie: hotel_session=YOUR_SESSION_ID" \
  -H "X-Tenant-ID: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "nameJa": "テストメニュー",
    "price": 1000
  }'

# 3. メニュー更新
curl -X PUT "http://localhost:3100/api/v1/admin/menu/items/1" \
  -H "Cookie: hotel_session=YOUR_SESSION_ID" \
  -H "X-Tenant-ID: YOUR_TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 1200
  }'

# 4. メニュー削除
curl -X DELETE "http://localhost:3100/api/v1/admin/menu/items/1" \
  -H "Cookie: hotel_session=YOUR_SESSION_ID" \
  -H "X-Tenant-ID: YOUR_TENANT_ID"
```

---

## 📊 実装完了後の確認事項

### 1. ファイル作成確認
- [ ] 10ファイルすべて作成完了
- [ ] ディレクトリ構造が正しい
- [ ] ファイル名が正しい

### 2. コード品質確認
- [ ] TypeScript型エラーなし
- [ ] ESLintエラーなし
- [ ] 認証チェック実装済み
- [ ] エラーハンドリング実装済み

### 3. 動作確認
- [ ] Composableが正常動作
- [ ] 全APIエンドポイントが正常応答
- [ ] 認証エラーが正しく返る
- [ ] hotel-commonとの連携が正常

---

## 🎯 実装完了の定義

以下がすべて完了したら実装完了とします：

1. ✅ `useMenu.ts` Composable実装完了
2. ✅ 9つのプロキシAPIエンドポイント実装完了
3. ✅ 型定義完備
4. ✅ エラーハンドリング実装
5. ✅ 動作確認完了
6. ✅ TypeScript型エラーなし
7. ✅ ESLintエラーなし

---

## 📚 参考資料

### 必読ドキュメント
1. **SSOT**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md`
2. **hotel-common検証レポート**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT_IMPLEMENTATION_VERIFICATION.md`

### 参考実装
1. **既存プロキシAPI**: `/Users/kaneko/hotel-saas/server/api/v1/admin/phone-order/menu.get.ts`
2. **APIクライアント**: `/Users/kaneko/hotel-saas/server/utils/api-client.ts`

### 関連SSOT
1. **認証**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md`
2. **マルチテナント**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md`

---

**実装開始前に必ず確認してください**:
1. ✅ hotel-commonが起動している（ポート3400）
2. ✅ hotel-saasが起動している（ポート3100）
3. ✅ データベースが起動している
4. ✅ Redisが起動している

**実装担当**: Sun（天照大神） - hotel-saas専門AI  
**実装期限**: 指定なし（品質優先）  
**実装方針**: SSOT完全準拠、段階的実装、動作確認徹底

---

**以上、hotel-saas メニュー管理機能 実装指示書**
