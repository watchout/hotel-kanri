# 📱 メディアスライド表示機能実装仕様書

**Doc-ID**: SPEC-2025-010  
**Version**: 1.0  
**Status**: 🔴 **CRITICAL** - 即座実装必須  
**Owner**: 金子裕司  
**作成日**: 2025年1月28日  
**関連**: SPEC-2025-005, SPEC-2025-006, SPEC-2025-007, SPEC-2025-008, SPEC-2025-009

---

## 🎯 **実装目的**

### **課題**
- 現在のMenuCard.vueは登録された全メディアを強制表示
- メイン画像の概念が不明確
- 表示/非表示の制御ができない
- スライド表示の選択制御がない

### **解決策**
- メディア表示制御機能の追加
- メイン画像の明確な指定
- スライド表示対象の選択機能
- 表示順序の管理機能

---

## 🏗️ **システム分担**

### **hotel-common 担当範囲**
```yaml
データベース拡張:
  - unified_media テーブルにカラム追加
  - インデックス最適化
  
API拡張:
  - メディア更新API拡張
  - 一括更新API追加
  - フィルタリング機能追加
```

### **hotel-saas 担当範囲**
```yaml
フロントエンド修正:
  - MenuCard.vue ロジック修正
  - 管理画面UI実装
  
バックエンド修正:
  - 透明プロキシAPI拡張
  - 型定義更新
```

---

## 🔧 **hotel-common 実装仕様**

### **1. データベース拡張**

#### **unified_media テーブル拡張**
```sql
-- /Users/kaneko/hotel-common/prisma/migrations/add_media_display_controls.sql

ALTER TABLE "unified_media" 
ADD COLUMN "is_display_in_slide" BOOLEAN DEFAULT true,
ADD COLUMN "slide_order" INTEGER DEFAULT 0;

-- インデックス追加
CREATE INDEX "idx_unified_media_display_slide" 
ON "unified_media"("tenant_id", "entity_type", "entity_id", "is_display_in_slide", "slide_order");

-- 既存データの初期化
UPDATE "unified_media" 
SET "is_display_in_slide" = true, 
    "slide_order" = "display_order"
WHERE "is_display_in_slide" IS NULL;
```

#### **Prismaスキーマ更新**
```typescript
// /Users/kaneko/hotel-common/prisma/schema.prisma

model UnifiedMedia {
  // 既存フィールド...
  
  // 🆕 追加フィールド
  isDisplayInSlide Boolean @default(true) @map("is_display_in_slide")
  slideOrder       Int     @default(0) @map("slide_order")
  
  @@index([tenantId, entityType, entityId, isDisplayInSlide, slideOrder])
}
```

### **2. API拡張**

#### **メディア更新API拡張**
```typescript
// /Users/kaneko/hotel-common/src/routes/api/v1/media/[id].put.ts

interface MediaUpdateRequest {
  // 既存フィールド...
  
  // 🆕 追加フィールド
  is_display_in_slide?: boolean
  slide_order?: number
}

export default defineEventHandler(async (event) => {
  const mediaId = getRouterParam(event, 'id')
  const updates = await readBody(event)
  
  // バリデーション
  if (updates.is_primary && updates.is_display_in_slide === false) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Primary media must be displayed in slide'
    })
  }
  
  // メイン画像設定時の排他制御
  if (updates.is_primary) {
    await prisma.unifiedMedia.updateMany({
      where: {
        entityType: media.entityType,
        entityId: media.entityId,
        tenantId: media.tenantId,
        id: { not: mediaId }
      },
      data: { isPrimary: false }
    })
  }
  
  const updatedMedia = await prisma.unifiedMedia.update({
    where: { id: mediaId },
    data: {
      ...updates,
      updatedAt: new Date()
    }
  })
  
  return { success: true, media: updatedMedia }
})
```

#### **一括順序更新API**
```typescript
// /Users/kaneko/hotel-common/src/routes/api/v1/media/reorder.post.ts

interface MediaReorderRequest {
  entity_type: string
  entity_id: string
  media_orders: Array<{
    id: string
    slide_order: number
    is_display_in_slide: boolean
  }>
}

export default defineEventHandler(async (event) => {
  const { entity_type, entity_id, media_orders } = await readBody(event)
  const authUser = await verifyAuth(event)
  
  // トランザクション処理
  await prisma.$transaction(async (tx) => {
    for (const order of media_orders) {
      await tx.unifiedMedia.update({
        where: { id: order.id },
        data: {
          slideOrder: order.slide_order,
          isDisplayInSlide: order.is_display_in_slide,
          updatedAt: new Date()
        }
      })
    }
  })
  
  return { success: true }
})
```

#### **フィルタリング機能付きメディア取得API**
```typescript
// /Users/kaneko/hotel-common/src/routes/api/v1/media/index.get.ts 拡張

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  
  const whereClause = {
    entityType: query.entity_type as string,
    entityId: query.entity_id as string,
    tenantId: query.tenant_id as string,
    isActive: true,
    deletedAt: null,
    
    // 🆕 フィルタリング追加
    ...(query.slide_only === 'true' && {
      isDisplayInSlide: true
    })
  }
  
  const media = await prisma.unifiedMedia.findMany({
    where: whereClause,
    orderBy: [
      { isPrimary: 'desc' },
      { slideOrder: 'asc' },
      { displayOrder: 'asc' }
    ]
  })
  
  return {
    success: true,
    media: media.map(m => ({
      ...m,
      url: generatePublicUrl(m.filePath),
      thumbnailUrl: generateThumbnailUrl(m.filePath)
    }))
  }
})
```

---

## 🔧 **hotel-saas 実装仕様**

### **1. MenuCard.vue 修正**

#### **メディアフィルタリングロジック修正**
```vue
<!-- /Users/kaneko/hotel-saas/components/menu/MenuCard.vue -->

<script setup lang="ts">
// 🆕 修正: フィルタリング機能追加
const allMedia = computed(() => {
  const media: MediaItem[] = []

  // メイン画像（後方互換性）
  if (props.item.imageUrl && (!props.item.media || props.item.media.length === 0)) {
    media.push({
      id: 0,
      url: props.item.imageUrl,
      type: 'image',
      sortOrder: 0,
      isPrimary: true,
      isDisplayInSlide: true
    })
  }

  // 🆕 アクティブかつスライド表示対象のみ
  if (props.item.media && props.item.media.length > 0) {
    const slideMedia = props.item.media
      .filter(m => m.isActive && m.isDisplayInSlide)
      .sort((a, b) => a.slideOrder - b.slideOrder)
    
    media.push(...slideMedia)
  }

  return media
})

// 🆕 メイン画像取得
const primaryImage = computed(() => {
  // メイン画像を明確に取得
  const primary = props.item.media?.find(m => m.isPrimary && m.isActive)
  return primary?.url || props.item.imageUrl
})

// 🆕 スライド表示判定
const shouldShowSlide = computed(() => {
  return allMedia.value.length > 1
})
</script>

<template>
  <div class="menu-card">
    <!-- 🆕 条件分岐修正 -->
    
    <!-- スライド表示（複数メディア時） -->
    <div v-if="shouldShowSlide" class="relative h-40">
      <div class="absolute inset-0 flex transition-transform duration-300" :style="sliderStyle">
        <div v-for="media in allMedia" :key="media.id" class="w-full h-40 flex-shrink-0">
          <!-- 既存のスライド表示ロジック -->
        </div>
      </div>
      <!-- 既存のナビゲーション -->
    </div>

    <!-- 単一画像表示（メイン画像） -->
    <img
      v-else
      :src="primaryImage"
      :alt="getItemName"
      class="h-40 w-full object-cover"
    />
    
    <!-- 既存のカード内容 -->
  </div>
</template>
```

### **2. 管理画面UI実装**

#### **メディア管理コンポーネント**
```vue
<!-- /Users/kaneko/hotel-saas/components/admin/rooms/RoomGradeMediaManager.vue -->

<template>
  <div class="media-management">
    <!-- メイン画像設定セクション -->
    <div class="primary-image-section mb-6">
      <h4 class="text-lg font-semibold mb-3">メイン画像設定</h4>
      <p class="text-sm text-gray-600 mb-3">
        一覧表示やスライド非表示時に使用される代表画像を選択してください
      </p>
      
      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="media in activeMedia"
          :key="media.id"
          @click="setPrimary(media.id)"
          :class="[
            'relative cursor-pointer border-2 rounded-lg overflow-hidden',
            media.isPrimary ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
          ]"
        >
          <img :src="media.thumbnailUrl" class="w-full h-24 object-cover" />
          <div v-if="media.isPrimary" class="absolute top-1 right-1">
            <Icon name="heroicons:star-solid" class="w-5 h-5 text-yellow-400" />
          </div>
          <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center">
            {{ media.originalFilename }}
          </div>
        </div>
      </div>
    </div>

    <!-- スライド表示設定セクション -->
    <div class="slide-settings-section">
      <h4 class="text-lg font-semibold mb-3">スライド表示設定</h4>
      <p class="text-sm text-gray-600 mb-3">
        複数の画像・動画をスライド形式で表示する設定を行います
      </p>

      <!-- 全体制御 -->
      <div class="mb-4 p-4 bg-gray-50 rounded-lg">
        <label class="flex items-center">
          <input
            type="checkbox"
            v-model="enableSlideDisplay"
            class="mr-2"
          />
          <span class="font-medium">スライド表示を有効にする</span>
        </label>
        <p class="text-sm text-gray-600 mt-1">
          チェックを外すとメイン画像のみ表示されます
        </p>
      </div>

      <!-- メディア一覧 -->
      <div class="space-y-3">
        <div
          v-for="(media, index) in allMedia"
          :key="media.id"
          class="flex items-center p-4 border rounded-lg"
          :class="media.isActive ? 'bg-white' : 'bg-gray-50'"
        >
          <!-- サムネイル -->
          <img :src="media.thumbnailUrl" class="w-16 h-16 object-cover rounded mr-4" />
          
          <!-- ファイル情報 -->
          <div class="flex-1">
            <p class="font-medium">{{ media.originalFilename }}</p>
            <p class="text-sm text-gray-500">
              {{ media.type === 'video' ? '動画' : '画像' }} • {{ formatFileSize(media.fileSize) }}
            </p>
          </div>

          <!-- 制御 -->
          <div class="flex items-center space-x-4">
            <!-- 表示/非表示 -->
            <label class="flex items-center">
              <input
                type="checkbox"
                v-model="media.isActive"
                class="mr-2"
              />
              <span class="text-sm">表示</span>
            </label>

            <!-- スライド表示 -->
            <label class="flex items-center">
              <input
                type="checkbox"
                v-model="media.isDisplayInSlide"
                :disabled="!media.isActive || !enableSlideDisplay"
                class="mr-2"
              />
              <span class="text-sm">スライド</span>
            </label>

            <!-- 順序 -->
            <div class="flex items-center space-x-1">
              <button
                @click="moveUp(index)"
                :disabled="index === 0 || !media.isDisplayInSlide"
                class="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <Icon name="heroicons:chevron-up" class="w-4 h-4" />
              </button>
              <span class="text-sm w-6 text-center">{{ media.slideOrder }}</span>
              <button
                @click="moveDown(index)"
                :disabled="index === allMedia.length - 1 || !media.isDisplayInSlide"
                class="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                <Icon name="heroicons:chevron-down" class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- プレビュー -->
      <div class="mt-6 p-4 border rounded-lg">
        <h5 class="font-medium mb-3">プレビュー</h5>
        <div class="w-64 mx-auto">
          <MenuCard :item="previewItem" />
        </div>
      </div>

      <!-- 保存ボタン -->
      <div class="mt-6 flex justify-end space-x-3">
        <button
          @click="resetChanges"
          class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          リセット
        </button>
        <button
          @click="saveChanges"
          :disabled="isSaving"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Icon v-if="isSaving" name="heroicons:arrow-path" class="w-4 h-4 mr-2 animate-spin" />
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  roomGradeId: string
}

const props = defineProps<Props>()

// 既存Composable活用
const { fetchMedia, updateMedia, updateMediaOrder } = useRoomGradeMedia()

// 状態管理
const allMedia = ref<MediaRecord[]>([])
const enableSlideDisplay = ref(true)
const isSaving = ref(false)

// 計算プロパティ
const activeMedia = computed(() => 
  allMedia.value.filter(m => m.isActive)
)

const slideMedia = computed(() => 
  allMedia.value.filter(m => m.isActive && m.isDisplayInSlide)
)

const previewItem = computed(() => ({
  id: props.roomGradeId,
  name: 'プレビュー',
  media: slideMedia.value,
  imageUrl: activeMedia.value.find(m => m.isPrimary)?.url
}))

// メソッド
const loadMedia = async () => {
  try {
    allMedia.value = await fetchMedia(props.roomGradeId)
  } catch (error) {
    showErrorToast('メディア一覧の読み込みに失敗しました')
  }
}

const setPrimary = async (mediaId: string) => {
  try {
    await updateMedia(mediaId, { is_primary: true })
    showSuccessToast('メイン画像を設定しました')
    await loadMedia()
  } catch (error) {
    showErrorToast('メイン画像の設定に失敗しました')
  }
}

const moveUp = (index: number) => {
  if (index === 0) return
  
  const current = allMedia.value[index]
  const previous = allMedia.value[index - 1]
  
  // 順序を入れ替え
  const tempOrder = current.slideOrder
  current.slideOrder = previous.slideOrder
  previous.slideOrder = tempOrder
  
  // ソート
  allMedia.value.sort((a, b) => a.slideOrder - b.slideOrder)
}

const moveDown = (index: number) => {
  if (index === allMedia.value.length - 1) return
  
  const current = allMedia.value[index]
  const next = allMedia.value[index + 1]
  
  // 順序を入れ替え
  const tempOrder = current.slideOrder
  current.slideOrder = next.slideOrder
  next.slideOrder = tempOrder
  
  // ソート
  allMedia.value.sort((a, b) => a.slideOrder - b.slideOrder)
}

const saveChanges = async () => {
  isSaving.value = true
  
  try {
    // 一括更新
    await updateMediaOrder({
      entity_type: 'room_grade',
      entity_id: props.roomGradeId,
      media_orders: allMedia.value.map(m => ({
        id: m.id,
        slide_order: m.slideOrder,
        is_display_in_slide: m.isDisplayInSlide && enableSlideDisplay.value
      }))
    })
    
    showSuccessToast('設定を保存しました')
  } catch (error) {
    showErrorToast('保存に失敗しました')
  } finally {
    isSaving.value = false
  }
}

const resetChanges = () => {
  loadMedia()
}

// 初期化
onMounted(() => {
  loadMedia()
})
</script>
```

### **3. Composable拡張**

```typescript
// /Users/kaneko/hotel-saas/composables/useRoomGradeMedia.ts 拡張

export const useRoomGradeMedia = () => {
  // 既存機能...
  
  // 🆕 一括順序更新
  const updateMediaOrder = async (orderData: {
    entity_type: string
    entity_id: string
    media_orders: Array<{
      id: string
      slide_order: number
      is_display_in_slide: boolean
    }>
  }) => {
    try {
      const response = await $fetch('/api/v1/admin/media/reorder', {
        method: 'POST',
        body: orderData
      })
      return response
    } catch (error) {
      console.error('Media order update failed:', error)
      throw error
    }
  }
  
  // 🆕 スライド表示用メディア取得
  const fetchSlideMedia = async (entityType: string, entityId: string) => {
    try {
      const response = await $fetch(`/api/v1/admin/media`, {
        query: {
          entity_type: entityType,
          entity_id: entityId,
          slide_only: 'true'
        }
      })
      return response.media || []
    } catch (error) {
      console.error('Failed to fetch slide media:', error)
      return []
    }
  }
  
  return {
    // 既存機能
    uploadMedia,
    fetchMedia,
    updateMedia,
    deleteMedia,
    
    // 新機能
    updateMediaOrder,
    fetchSlideMedia
  }
}
```

### **4. 透明プロキシAPI拡張**

```typescript
// /Users/kaneko/hotel-saas/server/api/v1/admin/media/reorder.post.ts

export default defineEventHandler(async (event) => {
  const authUser = await verifyAuth(event)
  if (!authUser) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const body = await readBody(event)
    const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
    
    const response = await $fetch(`${hotelCommonApiUrl}/api/v1/media/reorder`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authUser.token}`,
        'Content-Type': 'application/json'
      },
      body: {
        ...body,
        tenant_id: authUser.tenantId
      }
    })

    return response
  } catch (error: any) {
    throw createError({
      statusCode: error.response?.status || 503,
      statusMessage: error.response?.data?.message || 'Media reorder failed'
    })
  }
})
```

---

## 📋 **実装チェックリスト**

### **hotel-common チーム**
```
Phase 1: データベース拡張（1日）
□ unified_media テーブルにカラム追加
□ インデックス作成
□ 既存データの初期化
□ Prismaスキーマ更新

Phase 2: API拡張（1日）  
□ メディア更新API拡張
□ 一括順序更新API作成
□ フィルタリング機能追加
□ バリデーション強化
```

### **hotel-saas チーム**
```
Phase 1: MenuCard.vue修正（1日）
□ メディアフィルタリングロジック修正
□ メイン画像取得ロジック追加
□ スライド表示判定修正
□ 後方互換性確保

Phase 2: 管理画面UI実装（2日）
□ RoomGradeMediaManager.vue作成
□ メイン画像設定UI
□ スライド表示設定UI  
□ プレビュー機能

Phase 3: API統合（0.5日）
□ useRoomGradeMedia.ts拡張
□ 透明プロキシAPI追加
□ 型定義更新
```

---

## 🎯 **総工数見積もり**

**hotel-common**: 2日  
**hotel-saas**: 3.5日  
**総工数**: 5.5日

**並行実装により実質4日で完了可能**

---

**この仕様により、メディア表示の完全な制御が可能になり、MenuCard.vueでの柔軟なスライド表示が実現できます。**

