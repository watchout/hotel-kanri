# 📱 シンプルメディア管理UI実装仕様書

**Doc-ID**: SPEC-2025-009  
**Version**: 1.0  
**Status**: 🔴 **CRITICAL** - 即座実装必須  
**Owner**: 金子裕司  
**作成日**: 2025年1月28日  
**関連**: SPEC-2025-005, SPEC-2025-006, SPEC-2025-007, SPEC-2025-008

---

## 🎯 **設計方針**

### **重複回避原則**
- **既存APIを100%活用** - 新規API作成なし
- **既存UIコンポーネント活用** - UiToast、ConfirmModal、Icon
- **既存Composable拡張** - useRoomGradeMedia.ts ベース
- **シンプル実装重視** - 複雑な機能は除外

### **実装スコープ**
```yaml
追加実装対象:
  - Vue コンポーネント: RoomGradeMediaManager.vue
  - Vue コンポーネント: MediaPreviewModal.vue  
  - Composable拡張: useRoomGradeMedia.ts (順序管理追加)
  - 管理画面統合: /admin/room-grades/[id] への組み込み

既存活用:
  - API: 全て既存エンドポイント使用
  - UI: UiToast、ConfirmModal、Icon、Tailwind CSS
  - 認証: 既存認証システム
```

---

## 🔧 **コンポーネント設計**

### **1. RoomGradeMediaManager.vue**

#### **基本構造**
```vue
<template>
  <div class="room-grade-media-manager">
    <!-- ヘッダー -->
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-lg font-semibold">客室画像・動画管理</h3>
      <button 
        @click="openFileDialog" 
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow"
      >
        <Icon name="heroicons:plus" class="w-4 h-4 mr-2" />
        ファイルを追加
      </button>
    </div>
    
    <!-- ファイル選択（非表示） -->
    <input 
      ref="fileInput" 
      type="file" 
      multiple 
      accept="image/*,video/*"
      @change="handleFileSelect"
      class="hidden"
    />
    
    <!-- アップロード進捗 -->
    <div v-if="isUploading" class="mb-6 p-4 bg-blue-50 rounded-lg">
      <div class="flex items-center mb-2">
        <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-2 animate-spin" />
        <span>アップロード中...</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div 
          class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
          :style="{ width: uploadProgress + '%' }"
        ></div>
      </div>
      <p class="text-sm text-gray-600 mt-1">{{ uploadProgress }}% 完了</p>
    </div>
    
    <!-- メディア一覧 -->
    <div v-if="mediaList.length === 0 && !isUploading" class="text-center py-12 text-gray-500">
      <Icon name="heroicons:photo" class="w-16 h-16 mx-auto mb-4 text-gray-300" />
      <p>画像・動画がまだありません</p>
      <p class="text-sm">「ファイルを追加」ボタンからアップロードしてください</p>
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div 
        v-for="(media, index) in mediaList" 
        :key="media.id"
        class="bg-white rounded-lg shadow-md overflow-hidden"
      >
        <!-- プレビュー画像 -->
        <div 
          class="relative aspect-video cursor-pointer group"
          @click="openPreviewModal(media, index)"
        >
          <img 
            :src="media.thumbnailUrl" 
            :alt="media.title || media.originalFilename"
            class="w-full h-full object-cover"
          />
          
          <!-- メイン画像バッジ -->
          <div v-if="media.isPrimary" class="absolute top-2 left-2">
            <span class="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
              <Icon name="heroicons:star-solid" class="w-3 h-3 mr-1" />
              メイン
            </span>
          </div>
          
          <!-- 動画アイコン -->
          <div v-if="media.mimeType?.startsWith('video/')" class="absolute inset-0 flex items-center justify-center">
            <Icon name="heroicons:play-circle" class="w-12 h-12 text-white opacity-80" />
          </div>
          
          <!-- ホバーオーバーレイ -->
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
            <Icon name="heroicons:eye" class="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        </div>
        
        <!-- ファイル情報 -->
        <div class="p-4">
          <p class="font-medium text-sm truncate mb-2">{{ media.originalFilename }}</p>
          <p class="text-xs text-gray-500 mb-3">{{ formatFileSize(media.fileSize) }}</p>
          
          <!-- 操作ボタン -->
          <div class="space-y-2">
            <!-- メイン画像設定 -->
            <button 
              @click="setPrimary(media.id)"
              :class="media.isPrimary ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
              class="w-full px-3 py-2 text-sm rounded flex items-center justify-center transition-colors"
            >
              <Icon name="heroicons:star" class="w-4 h-4 mr-1" />
              {{ media.isPrimary ? 'メイン画像' : 'メイン設定' }}
            </button>
            
            <!-- 順序変更 -->
            <div class="flex space-x-1">
              <button 
                @click="moveUp(index)" 
                :disabled="index === 0"
                class="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded flex items-center justify-center"
              >
                <Icon name="heroicons:chevron-up" class="w-3 h-3 mr-1" />
                上へ
              </button>
              
              <span class="flex items-center justify-center px-2 py-1 text-xs bg-gray-50 rounded min-w-[2rem]">
                {{ index + 1 }}
              </span>
              
              <button 
                @click="moveDown(index)" 
                :disabled="index === mediaList.length - 1"
                class="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded flex items-center justify-center"
              >
                <Icon name="heroicons:chevron-down" class="w-3 h-3 mr-1" />
                下へ
              </button>
            </div>
            
            <!-- 削除ボタン -->
            <button 
              @click="confirmDelete(media)"
              class="w-full px-3 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded flex items-center justify-center transition-colors"
            >
              <Icon name="heroicons:trash" class="w-4 h-4 mr-1" />
              削除
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- プレビューモーダル -->
    <MediaPreviewModal 
      v-if="showPreviewModal"
      :media="selectedMedia"
      :media-list="mediaList"
      :current-index="selectedIndex"
      @close="closePreviewModal"
      @update="handleMediaUpdate"
      @delete="handleMediaDelete"
      @navigate="handleNavigate"
    />
    
    <!-- 削除確認モーダル -->
    <ConfirmModal 
      :show="showDeleteConfirm"
      type="warning"
      title="メディア削除確認"
      :message="`「${deleteTarget?.originalFilename}」を削除しますか？この操作は取り消せません。`"
      @confirm="executeDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  roomGradeId: string
}

const props = defineProps<Props>()

// 既存Composable活用
const { uploadMedia, fetchMedia, updateMedia, deleteMedia } = useRoomGradeMedia()

// リアクティブデータ
const fileInput = ref<HTMLInputElement>()
const mediaList = ref<MediaRecord[]>([])
const isUploading = ref(false)
const uploadProgress = ref(0)

// モーダル関連
const showPreviewModal = ref(false)
const selectedMedia = ref<MediaRecord | null>(null)
const selectedIndex = ref(0)

// 削除確認関連
const showDeleteConfirm = ref(false)
const deleteTarget = ref<MediaRecord | null>(null)

// 初期データ読み込み
onMounted(async () => {
  await loadMedia()
})

// メディア一覧読み込み
const loadMedia = async () => {
  try {
    mediaList.value = await fetchMedia(props.roomGradeId)
  } catch (error) {
    showErrorToast('メディア一覧の読み込みに失敗しました')
  }
}

// ファイル選択ダイアログを開く
const openFileDialog = () => {
  fileInput.value?.click()
}

// ファイル選択時の処理
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  
  if (files.length === 0) return
  
  // ファイルサイズチェック
  const invalidFiles = files.filter(file => {
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const maxSize = isImage ? 5 * 1024 * 1024 : 50 * 1024 * 1024 // 5MB for images, 50MB for videos
    
    return file.size > maxSize
  })
  
  if (invalidFiles.length > 0) {
    showErrorToast('ファイルサイズが上限を超えています（画像:5MB、動画:50MB）')
    return
  }
  
  await uploadFiles(files)
  
  // ファイル選択をリセット
  target.value = ''
}

// ファイルアップロード処理
const uploadFiles = async (files: File[]) => {
  isUploading.value = true
  uploadProgress.value = 0
  
  try {
    // プログレス更新のシミュレーション
    const progressInterval = setInterval(() => {
      if (uploadProgress.value < 90) {
        uploadProgress.value += 10
      }
    }, 200)
    
    await uploadMedia(props.roomGradeId, files)
    
    clearInterval(progressInterval)
    uploadProgress.value = 100
    
    // 成功メッセージ
    showSuccessToast(`${files.length}件のファイルをアップロードしました`)
    
    // メディア一覧を再読み込み
    await loadMedia()
    
  } catch (error) {
    showErrorToast('アップロードに失敗しました')
  } finally {
    isUploading.value = false
    uploadProgress.value = 0
  }
}

// メイン画像設定
const setPrimary = async (mediaId: string) => {
  try {
    await updateMedia(mediaId, { is_primary: true })
    showSuccessToast('メイン画像を設定しました')
    await loadMedia()
  } catch (error) {
    showErrorToast('メイン画像の設定に失敗しました')
  }
}

// 順序変更（上へ）
const moveUp = async (index: number) => {
  if (index === 0) return
  
  const currentMedia = mediaList.value[index]
  const previousMedia = mediaList.value[index - 1]
  
  try {
    // 順序を入れ替え
    await updateMedia(currentMedia.id, { display_order: previousMedia.displayOrder })
    await updateMedia(previousMedia.id, { display_order: currentMedia.displayOrder })
    
    await loadMedia()
  } catch (error) {
    showErrorToast('順序変更に失敗しました')
  }
}

// 順序変更（下へ）
const moveDown = async (index: number) => {
  if (index === mediaList.value.length - 1) return
  
  const currentMedia = mediaList.value[index]
  const nextMedia = mediaList.value[index + 1]
  
  try {
    // 順序を入れ替え
    await updateMedia(currentMedia.id, { display_order: nextMedia.displayOrder })
    await updateMedia(nextMedia.id, { display_order: currentMedia.displayOrder })
    
    await loadMedia()
  } catch (error) {
    showErrorToast('順序変更に失敗しました')
  }
}

// プレビューモーダルを開く
const openPreviewModal = (media: MediaRecord, index: number) => {
  selectedMedia.value = media
  selectedIndex.value = index
  showPreviewModal.value = true
}

// プレビューモーダルを閉じる
const closePreviewModal = () => {
  showPreviewModal.value = false
  selectedMedia.value = null
}

// メディア更新処理
const handleMediaUpdate = async (updates: any) => {
  if (!selectedMedia.value) return
  
  try {
    await updateMedia(selectedMedia.value.id, updates)
    showSuccessToast('メディア情報を更新しました')
    await loadMedia()
    
    // モーダル内のデータも更新
    if (selectedMedia.value) {
      Object.assign(selectedMedia.value, updates)
    }
  } catch (error) {
    showErrorToast('更新に失敗しました')
  }
}

// メディア削除処理（モーダルから）
const handleMediaDelete = async (mediaId: string) => {
  try {
    await deleteMedia(mediaId)
    showSuccessToast('メディアを削除しました')
    await loadMedia()
    closePreviewModal()
  } catch (error) {
    showErrorToast('削除に失敗しました')
  }
}

// ナビゲーション処理
const handleNavigate = (direction: 'prev' | 'next') => {
  if (direction === 'prev' && selectedIndex.value > 0) {
    selectedIndex.value--
  } else if (direction === 'next' && selectedIndex.value < mediaList.value.length - 1) {
    selectedIndex.value++
  }
  
  selectedMedia.value = mediaList.value[selectedIndex.value]
}

// 削除確認
const confirmDelete = (media: MediaRecord) => {
  deleteTarget.value = media
  showDeleteConfirm.value = true
}

// 削除実行
const executeDelete = async () => {
  if (!deleteTarget.value) return
  
  try {
    await deleteMedia(deleteTarget.value.id)
    showSuccessToast('メディアを削除しました')
    await loadMedia()
  } catch (error) {
    showErrorToast('削除に失敗しました')
  } finally {
    cancelDelete()
  }
}

// 削除キャンセル
const cancelDelete = () => {
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

// ユーティリティ関数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 既存トーストシステム使用
const showSuccessToast = (message: string) => {
  // 既存のトーストシステムを使用
  // 実装は既存のuseToast()またはグローバルトーストシステムに依存
}

const showErrorToast = (message: string) => {
  // 既存のトーストシステムを使用
  // 実装は既存のuseToast()またはグローバルトーストシステムに依存
}
</script>
```

### **2. MediaPreviewModal.vue**

#### **基本構造**
```vue
<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" @click.self="$emit('close')">
    <div class="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full mx-4 flex flex-col">
      <!-- ヘッダー -->
      <div class="flex justify-between items-center p-4 border-b">
        <h3 class="text-lg font-semibold truncate">{{ media.originalFilename }}</h3>
        <div class="flex items-center space-x-2">
          <!-- ナビゲーション -->
          <button 
            @click="$emit('navigate', 'prev')"
            :disabled="currentIndex === 0"
            class="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="heroicons:chevron-left" class="w-5 h-5" />
          </button>
          
          <span class="text-sm text-gray-500">
            {{ currentIndex + 1 }} / {{ mediaList.length }}
          </span>
          
          <button 
            @click="$emit('navigate', 'next')"
            :disabled="currentIndex === mediaList.length - 1"
            class="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="heroicons:chevron-right" class="w-5 h-5" />
          </button>
          
          <!-- 閉じるボタン -->
          <button @click="$emit('close')" class="p-2 text-gray-500 hover:text-gray-700">
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <!-- コンテンツ -->
      <div class="flex flex-1 overflow-hidden">
        <!-- メディア表示エリア -->
        <div class="flex-1 flex items-center justify-center p-4 bg-gray-50">
          <img 
            v-if="!media.mimeType?.startsWith('video/')"
            :src="media.url || media.thumbnailUrl" 
            :alt="media.title || media.originalFilename"
            class="max-w-full max-h-full object-contain"
          />
          
          <video 
            v-else
            :src="media.url" 
            controls 
            class="max-w-full max-h-full"
          />
        </div>
        
        <!-- サイドパネル -->
        <div class="w-80 border-l bg-white p-4 overflow-y-auto">
          <!-- メタデータ編集 -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">タイトル</label>
              <input 
                v-model="editData.title"
                type="text" 
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="画像のタイトル"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <textarea 
                v-model="editData.description"
                rows="3"
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="画像の説明"
              ></textarea>
            </div>
            
            <!-- メイン画像設定 -->
            <div class="flex items-center">
              <input 
                id="isPrimary"
                v-model="editData.isPrimary"
                type="checkbox" 
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label for="isPrimary" class="ml-2 block text-sm text-gray-700">
                メイン画像として設定
              </label>
            </div>
          </div>
          
          <!-- ファイル情報 -->
          <div class="mt-6 pt-6 border-t">
            <h4 class="text-sm font-medium text-gray-700 mb-3">ファイル情報</h4>
            <dl class="space-y-2 text-sm">
              <div>
                <dt class="text-gray-500">ファイル名</dt>
                <dd class="font-medium break-all">{{ media.originalFilename }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">ファイルサイズ</dt>
                <dd>{{ formatFileSize(media.fileSize) }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">形式</dt>
                <dd>{{ media.mimeType }}</dd>
              </div>
              <div v-if="media.width && media.height">
                <dt class="text-gray-500">解像度</dt>
                <dd>{{ media.width }} × {{ media.height }}</dd>
              </div>
              <div>
                <dt class="text-gray-500">アップロード日時</dt>
                <dd>{{ formatDateTime(media.createdAt) }}</dd>
              </div>
            </dl>
          </div>
          
          <!-- 操作ボタン -->
          <div class="mt-6 pt-6 border-t space-y-3">
            <button 
              @click="saveChanges"
              class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              <Icon name="heroicons:check" class="w-4 h-4 mr-2" />
              変更を保存
            </button>
            
            <button 
              @click="confirmDelete"
              class="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              <Icon name="heroicons:trash" class="w-4 h-4 mr-2" />
              削除
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 削除確認モーダル -->
    <ConfirmModal 
      :show="showDeleteConfirm"
      type="warning"
      title="メディア削除確認"
      :message="`「${media.originalFilename}」を削除しますか？この操作は取り消せません。`"
      @confirm="executeDelete"
      @cancel="showDeleteConfirm = false"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  media: MediaRecord
  mediaList: MediaRecord[]
  currentIndex: number
}

interface Emits {
  (e: 'close'): void
  (e: 'update', updates: any): void
  (e: 'delete', mediaId: string): void
  (e: 'navigate', direction: 'prev' | 'next'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 編集データ
const editData = ref({
  title: props.media.title || '',
  description: props.media.description || '',
  isPrimary: props.media.isPrimary || false
})

// 削除確認
const showDeleteConfirm = ref(false)

// メディアが変更された時に編集データを更新
watch(() => props.media, (newMedia) => {
  editData.value = {
    title: newMedia.title || '',
    description: newMedia.description || '',
    isPrimary: newMedia.isPrimary || false
  }
}, { immediate: true })

// 変更を保存
const saveChanges = () => {
  emit('update', {
    title: editData.value.title,
    description: editData.value.description,
    is_primary: editData.value.isPrimary
  })
}

// 削除確認
const confirmDelete = () => {
  showDeleteConfirm.value = true
}

// 削除実行
const executeDelete = () => {
  emit('delete', props.media.id)
  showDeleteConfirm.value = false
}

// キーボードショートカット
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        emit('close')
        break
      case 'ArrowLeft':
        emit('navigate', 'prev')
        break
      case 'ArrowRight':
        emit('navigate', 'next')
        break
      case 'Delete':
        confirmDelete()
        break
      case 'Enter':
        if (event.ctrlKey || event.metaKey) {
          saveChanges()
        }
        break
    }
  }
  
  document.addEventListener('keydown', handleKeydown)
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
})

// ユーティリティ関数
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('ja-JP')
}
</script>
```

---

## 🔧 **Composable拡張**

### **useRoomGradeMedia.ts 拡張**

```typescript
// 既存のuseRoomGradeMedia.tsに順序管理機能を追加

export const useRoomGradeMedia = () => {
  // 既存の機能...
  const { uploadMedia, fetchMedia, updateMedia, deleteMedia } = useExistingRoomGradeMedia()
  
  // 順序管理機能を追加
  const updateMediaOrder = async (mediaList: MediaRecord[]) => {
    try {
      const updatePromises = mediaList.map((media, index) => 
        updateMedia(media.id, { display_order: index + 1 })
      )
      
      await Promise.all(updatePromises)
    } catch (error) {
      console.error('Media order update failed:', error)
      throw error
    }
  }
  
  const swapMediaOrder = async (mediaId1: string, mediaId2: string, order1: number, order2: number) => {
    try {
      await Promise.all([
        updateMedia(mediaId1, { display_order: order2 }),
        updateMedia(mediaId2, { display_order: order1 })
      ])
    } catch (error) {
      console.error('Media order swap failed:', error)
      throw error
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
    swapMediaOrder
  }
}
```

---

## 📱 **管理画面統合**

### **客室ランク管理画面への組み込み**

```vue
<!-- /pages/admin/room-grades/[id].vue -->
<template>
  <div class="admin-room-grade-detail">
    <!-- 既存の客室ランク情報 -->
    <div class="mb-8">
      <!-- 既存コンテンツ -->
    </div>
    
    <!-- メディア管理セクション -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <RoomGradeMediaManager :room-grade-id="roomGradeId" />
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const roomGradeId = route.params.id as string

// 既存の客室ランク管理ロジック...
</script>
```

---

## 📋 **実装チェックリスト**

### **Phase 1: コンポーネント作成 (2日)**
- [ ] `RoomGradeMediaManager.vue` 作成
- [ ] `MediaPreviewModal.vue` 作成
- [ ] 既存 `useRoomGradeMedia.ts` 拡張
- [ ] 型定義追加 (`MediaRecord` interface)

### **Phase 2: 管理画面統合 (1日)**
- [ ] 客室ランク管理画面への組み込み
- [ ] ルーティング設定
- [ ] 権限チェック統合

### **Phase 3: テスト・調整 (1日)**
- [ ] 機能テスト
- [ ] UI/UX調整
- [ ] エラーハンドリング確認
- [ ] レスポンシブ対応確認

---

## 🎯 **実装工数見積もり**

### **総工数: 4日**
- コンポーネント実装: 2日
- 統合・設定: 1日  
- テスト・調整: 1日

### **技術的優位性**
- **既存API 100%活用** - 新規API開発不要
- **既存UIシステム活用** - デザイン統一性確保
- **シンプル設計** - 保守性・拡張性確保
- **段階的実装** - リスク最小化

---

**この仕様により、既存システムとの重複を完全に避けながら、シンプルで使いやすいメディア管理機能を効率的に実装できます。**
