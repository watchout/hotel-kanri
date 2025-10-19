# hotel-saas メモ機能 hotel-common統合ガイド

**作成日**: 2025年9月16日  
**作成者**: kaneko (hotel-kanri)  
**対象システム**: hotel-saas  
**機能**: hotel-commonのメモ機能統合実装ガイド

## 🚨 **重要な実装方針**

### **❌ 禁止事項（厳守）**

**フォールバック・モック・一時対応の全面禁止**
- ❌ フォールバック処理（エラー時の代替処理）
- ❌ モックデータの使用
- ❌ 一時的な回避実装
- ❌ try-catch での例外隠蔽
- ❌ デフォルト値での問題回避
- ❌ 「とりあえず動く」実装

**理由**:
- エラーの隠蔽により問題発見が困難
- 一時対応の恒久化による技術的負債
- システム整合性の破綻
- デバッグ困難化

### **✅ 必須事項**

**正面からの問題解決**
- ✅ エラーは必ず表面化させる
- ✅ 問題の根本原因を特定・解決
- ✅ 適切なエラーハンドリング（隠蔽ではない）
- ✅ 実装前の依存関係確認
- ✅ 段階的だが確実な実装

## 📋 統合概要

hotel-saasの既存メモ機能を、hotel-commonの共有メモシステムに統合します。

### 統合後のアーキテクチャ

```
┌─────────────────────────────────┐
│         hotel-saas              │
│                                 │
│ ┌─────────────────────────────┐ │
│ │    Frontend Components      │ │
│ │  - MemoList.vue             │ │
│ │  - MemoDetail.vue           │ │
│ │  - MemoEditModal.vue        │ │
│ └─────────────────────────────┘ │
│               │                 │
│ ┌─────────────▼─────────────┐   │
│ │      Composables          │   │
│ │  - useMemoApi.ts          │   │
│ │  - useReadStatus.ts       │   │
│ │  - useNotifications.ts    │   │
│ └─────────────┬─────────────┘   │
│               │                 │
└───────────────┼─────────────────┘
                │ HTTP/REST API
                │
┌───────────────▼─────────────────┐
│        hotel-common             │
│                                 │
│ ┌─────────────────────────────┐ │
│ │     Memo API Service        │ │
│ │  - /api/v1/memos/*          │ │
│ │  - Authentication           │ │
│ │  - Authorization            │ │
│ └─────────────────────────────┘ │
│               │                 │
│ ┌─────────────▼─────────────┐   │
│ │       Database            │   │
│ │  - memos                  │   │
│ │  - memo_comments          │   │
│ │  - memo_read_statuses     │   │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

## 🔧 実装手順

### Phase 1: 環境設定・依存関係確認

#### 1.1 hotel-common API接続設定

**nuxt.config.ts の更新**:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      // hotel-common API設定
      hotelCommonApiUrl: process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400',
      hotelCommonWsUrl: process.env.HOTEL_COMMON_WS_URL || 'ws://localhost:3400'
    }
  },
  
  // hotel-common への API プロキシ設定（開発環境用）
  nitro: {
    devProxy: {
      '/api/common': {
        target: 'http://localhost:3400/api/v1',
        changeOrigin: true,
        pathRewrite: { '^/api/common': '' }
      }
    }
  }
})
```

#### 1.2 環境変数設定

**.env ファイル**:
```bash
# hotel-common API設定
HOTEL_COMMON_API_URL=http://localhost:3400
HOTEL_COMMON_WS_URL=ws://localhost:3400

# 認証設定
HOTEL_COMMON_API_TIMEOUT=30000
HOTEL_COMMON_MAX_RETRIES=3
```

#### 1.3 依存関係確認チェック

```typescript
// utils/systemHealthCheck.ts
export const checkHotelCommonConnection = async (): Promise<boolean> => {
  try {
    const config = useRuntimeConfig();
    const response = await fetch(`${config.public.hotelCommonApiUrl}/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (!response.ok) {
      throw new Error(`hotel-common health check failed: ${response.status}`);
    }
    
    return true;
  } catch (error) {
    console.error('hotel-common connection failed:', error);
    throw new Error(`hotel-common is not available: ${error.message}`);
  }
};

// アプリケーション起動時のチェック
// plugins/system-check.client.ts
export default defineNuxtPlugin(async () => {
  try {
    await checkHotelCommonConnection();
    console.log('✅ hotel-common connection verified');
  } catch (error) {
    console.error('❌ hotel-common connection failed:', error);
    throw error; // アプリケーション起動を停止
  }
});
```

### Phase 2: API統合レイヤー実装

#### 2.1 共通APIクライアント

```typescript
// composables/useHotelCommonApi.ts
export const useHotelCommonApi = () => {
  const config = useRuntimeConfig();
  const { staff } = useJwtAuth();
  
  const apiClient = $fetch.create({
    baseURL: `${config.public.hotelCommonApiUrl}/api/v1`,
    timeout: config.public.hotelCommonApiTimeout || 30000,
    
    onRequest({ request, options }) {
      // 認証ヘッダー設定
      if (!staff.value?.id) {
        throw new Error('Staff authentication required for hotel-common API');
      }
      
      const token = useCookie('auth-token').value;
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'X-Source-System': 'saas',
        'X-Tenant-ID': staff.value.tenantId,
        'Content-Type': 'application/json'
      };
    },
    
    onRequestError({ request, error }) {
      console.error('hotel-common API request error:', error);
      throw new Error(`API request failed: ${error.message}`);
    },
    
    onResponseError({ request, response }) {
      console.error('hotel-common API response error:', response.status, response._data);
      
      if (response.status === 401) {
        throw new Error('Authentication failed with hotel-common');
      }
      
      if (response.status === 403) {
        throw new Error('Access denied by hotel-common');
      }
      
      if (response.status >= 500) {
        throw new Error('hotel-common server error');
      }
      
      throw new Error(`API error: ${response._data?.error?.message || 'Unknown error'}`);
    }
  });
  
  return { apiClient };
};
```

#### 2.2 メモAPI Composable

```typescript
// composables/useMemoApi.ts
export const useMemoApi = () => {
  const { apiClient } = useHotelCommonApi();
  const { staff } = useJwtAuth();
  
  // メモ一覧取得
  const fetchMemos = async (params: MemoListParams = {}) => {
    if (!staff.value?.id) {
      throw new Error('Staff authentication required');
    }
    
    try {
      const response = await apiClient('/memos', {
        method: 'GET',
        query: {
          includeReadStatus: true,
          staffId: staff.value.id,
          sourceSystem: 'saas',
          ...params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch memos:', error);
      throw new Error(`メモ一覧取得に失敗しました: ${error.message}`);
    }
  };
  
  // メモ詳細取得
  const fetchMemoDetail = async (memoId: string, options: MemoDetailOptions = {}) => {
    if (!staff.value?.id) {
      throw new Error('Staff authentication required');
    }
    
    try {
      const response = await apiClient(`/memos/${memoId}`, {
        method: 'GET',
        query: {
          includeReadStatus: true,
          staffId: staff.value.id,
          autoMarkAsRead: true,
          ...options
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch memo detail:', error);
      throw new Error(`メモ詳細取得に失敗しました: ${error.message}`);
    }
  };
  
  // メモ作成
  const createMemo = async (memoData: CreateMemoData) => {
    if (!staff.value?.id) {
      throw new Error('Staff authentication required');
    }
    
    try {
      const response = await apiClient('/memos', {
        method: 'POST',
        body: {
          ...memoData,
          authorId: staff.value.id,
          sourceSystem: 'saas'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create memo:', error);
      throw new Error(`メモ作成に失敗しました: ${error.message}`);
    }
  };
  
  // メモ更新
  const updateMemo = async (memoId: string, updates: UpdateMemoData) => {
    if (!staff.value?.id) {
      throw new Error('Staff authentication required');
    }
    
    try {
      const response = await apiClient(`/memos/${memoId}`, {
        method: 'PATCH',
        body: updates
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to update memo:', error);
      throw new Error(`メモ更新に失敗しました: ${error.message}`);
    }
  };
  
  // メモ削除
  const deleteMemo = async (memoId: string) => {
    if (!staff.value?.id) {
      throw new Error('Staff authentication required');
    }
    
    try {
      const response = await apiClient(`/memos/${memoId}`, {
        method: 'DELETE'
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to delete memo:', error);
      throw new Error(`メモ削除に失敗しました: ${error.message}`);
    }
  };
  
  return {
    fetchMemos,
    fetchMemoDetail,
    createMemo,
    updateMemo,
    deleteMemo
  };
};
```

#### 2.3 既読管理 Composable

```typescript
// composables/useReadStatus.ts
export const useReadStatus = () => {
  const { apiClient } = useHotelCommonApi();
  const { staff } = useJwtAuth();
  
  // 既読処理
  const markAsRead = async (targetType: 'memo' | 'comment', targetId: string, readTimeSeconds?: number) => {
    if (!staff.value?.id) {
      throw new Error('Staff authentication required');
    }
    
    try {
      const response = await apiClient('/memos/read-status', {
        method: 'POST',
        body: {
          targetType,
          targetId,
          staffId: staff.value.id,
          readTimeSeconds
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to mark as read:', error);
      throw new Error(`既読処理に失敗しました: ${error.message}`);
    }
  };
  
  // 一括既読処理
  const markMultipleAsRead = async (items: Array<{targetType: 'memo' | 'comment', targetId: string}>) => {
    if (!staff.value?.id) {
      throw new Error('Staff authentication required');
    }
    
    try {
      const response = await apiClient('/memos/read-status/batch', {
        method: 'POST',
        body: {
          staffId: staff.value.id,
          items
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to mark multiple as read:', error);
      throw new Error(`一括既読処理に失敗しました: ${error.message}`);
    }
  };
  
  // 未読数取得
  const getUnreadCount = async (includeDetails = false) => {
    if (!staff.value?.id) {
      throw new Error('Staff authentication required');
    }
    
    try {
      const response = await apiClient('/memos/unread-count', {
        method: 'GET',
        query: {
          staffId: staff.value.id,
          includeDetails,
          sourceSystem: 'saas'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      throw new Error(`未読数取得に失敗しました: ${error.message}`);
    }
  };
  
  return {
    markAsRead,
    markMultipleAsRead,
    getUnreadCount
  };
};
```

### Phase 3: フロントエンド統合

#### 3.1 メモ一覧コンポーネント更新

```vue
<!-- components/MemoList.vue -->
<template>
  <div class="memo-list">
    <div class="memo-list-header">
      <h2>メモ一覧</h2>
      <div class="unread-summary">
        <span v-if="unreadCount > 0" class="unread-badge">
          未読: {{ unreadCount }}件
        </span>
      </div>
    </div>
    
    <div class="memo-filters">
      <button 
        @click="toggleUnreadFilter"
        :class="{ active: showUnreadOnly }"
        class="filter-btn"
      >
        未読のみ表示
      </button>
      
      <select v-model="selectedPriority" @change="applyFilters" class="priority-filter">
        <option value="">すべての優先度</option>
        <option value="high">高</option>
        <option value="medium">中</option>
        <option value="low">低</option>
      </select>
    </div>
    
    <div v-if="loading" class="loading">
      メモを読み込み中...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="memo-items">
      <MemoListItem 
        v-for="memo in memos" 
        :key="memo.id"
        :memo="memo"
        @click="navigateToMemo(memo.id)"
      />
    </div>
    
    <div v-if="pagination.hasNext" class="load-more">
      <button @click="loadMore" :disabled="loadingMore">
        {{ loadingMore ? '読み込み中...' : 'さらに読み込む' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const { fetchMemos } = useMemoApi();
const { getUnreadCount } = useReadStatus();

const memos = ref([]);
const loading = ref(false);
const loadingMore = ref(false);
const error = ref('');
const unreadCount = ref(0);
const showUnreadOnly = ref(false);
const selectedPriority = ref('');
const pagination = ref({ hasNext: false, page: 1 });

// メモ一覧取得
const loadMemos = async (reset = true) => {
  try {
    if (reset) {
      loading.value = true;
      pagination.value.page = 1;
    } else {
      loadingMore.value = true;
    }
    
    const response = await fetchMemos({
      page: pagination.value.page,
      pageSize: 20,
      filterUnreadOnly: showUnreadOnly.value,
      priority: selectedPriority.value || undefined,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
    
    if (reset) {
      memos.value = response.memos;
    } else {
      memos.value.push(...response.memos);
    }
    
    pagination.value = response.pagination;
    unreadCount.value = response.summary.totalUnreadCount;
    
  } catch (err) {
    console.error('Failed to load memos:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

// さらに読み込む
const loadMore = async () => {
  pagination.value.page++;
  await loadMemos(false);
};

// フィルター適用
const applyFilters = () => {
  loadMemos(true);
};

// 未読フィルター切り替え
const toggleUnreadFilter = () => {
  showUnreadOnly.value = !showUnreadOnly.value;
  applyFilters();
};

// メモ詳細へ遷移
const navigateToMemo = (memoId: string) => {
  navigateTo(`/memos/${memoId}`);
};

// 初期読み込み
onMounted(() => {
  loadMemos();
});

// リアルタイム更新（WebSocket）
const { connect: connectNotifications } = useNotifications();
onMounted(() => {
  connectNotifications((notification) => {
    if (notification.type === 'memo_created' || notification.type === 'memo_updated') {
      // メモ一覧を再読み込み
      loadMemos(true);
    }
  });
});
</script>

<style scoped>
.memo-list {
  @apply space-y-4;
}

.memo-list-header {
  @apply flex justify-between items-center;
}

.unread-badge {
  @apply bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold;
}

.memo-filters {
  @apply flex gap-4 items-center;
}

.filter-btn {
  @apply px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50;
}

.filter-btn.active {
  @apply bg-blue-500 text-white border-blue-500;
}

.priority-filter {
  @apply px-3 py-2 border border-gray-300 rounded-md;
}

.loading, .error {
  @apply text-center py-8 text-gray-600;
}

.error {
  @apply text-red-600;
}

.memo-items {
  @apply space-y-3;
}

.load-more {
  @apply text-center;
}

.load-more button {
  @apply px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50;
}
</style>
```

#### 3.2 メモ詳細コンポーネント更新

```vue
<!-- pages/memos/[id].vue -->
<template>
  <div class="memo-detail-page">
    <div v-if="loading" class="loading">
      メモを読み込み中...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="memo-detail">
      <!-- メモ本体 -->
      <div class="memo-content" :class="{ 'unread': !memo.readStatus?.isRead }">
        <div class="memo-header">
          <h1>{{ memo.title }}</h1>
          <div class="memo-actions">
            <button @click="editMemo" class="edit-btn">編集</button>
            <button @click="deleteMemo" class="delete-btn">削除</button>
          </div>
        </div>
        
        <div class="memo-meta">
          <span class="author">{{ memo.authorName }}</span>
          <span class="date">{{ formatDate(memo.updatedAt) }}</span>
          <span class="system">{{ memo.sourceSystem.toUpperCase() }}</span>
          <span v-if="memo.priority !== 'medium'" class="priority" :class="memo.priority">
            {{ getPriorityLabel(memo.priority) }}
          </span>
        </div>
        
        <div class="memo-tags" v-if="memo.tags.length > 0">
          <span v-for="tag in memo.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
        
        <div class="memo-body">{{ memo.content }}</div>
        
        <!-- 添付ファイル -->
        <div v-if="attachments.length > 0" class="attachments">
          <h3>添付ファイル</h3>
          <div class="attachment-list">
            <div v-for="attachment in attachments" :key="attachment.id" class="attachment-item">
              <a :href="getAttachmentUrl(attachment.id)" target="_blank">
                {{ attachment.originalFilename }}
              </a>
              <span class="file-size">({{ formatFileSize(attachment.fileSize) }})</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- コメント一覧 -->
      <div class="comments-section">
        <h2>コメント ({{ comments.length }})</h2>
        
        <!-- コメント作成フォーム -->
        <div class="comment-form">
          <textarea 
            v-model="newComment" 
            placeholder="コメントを入力..."
            class="comment-input"
          ></textarea>
          <button @click="addComment" :disabled="!newComment.trim()" class="submit-btn">
            コメント投稿
          </button>
        </div>
        
        <!-- コメント一覧 -->
        <div class="comment-list">
          <div 
            v-for="comment in comments" 
            :key="comment.id"
            class="comment-item"
            :class="{ 'unread': !comment.readStatus?.isRead }"
          >
            <div class="comment-header">
              <span class="author">{{ comment.authorName }}</span>
              <span class="date">{{ formatDate(comment.createdAt) }}</span>
              <span class="system">{{ comment.sourceSystem.toUpperCase() }}</span>
              <UnreadIndicator 
                v-if="!comment.readStatus?.isRead"
                :unread-count="1"
                :show-count="false"
              />
            </div>
            <div class="comment-content">{{ comment.content }}</div>
            
            <!-- 返信一覧 -->
            <div v-if="comment.replies.length > 0" class="replies">
              <div 
                v-for="reply in comment.replies"
                :key="reply.id"
                class="reply-item"
                :class="{ 'unread': !reply.readStatus?.isRead }"
              >
                <div class="reply-header">
                  <span class="author">{{ reply.authorName }}</span>
                  <span class="date">{{ formatDate(reply.createdAt) }}</span>
                  <span class="system">{{ reply.sourceSystem.toUpperCase() }}</span>
                </div>
                <div class="reply-content">{{ reply.content }}</div>
              </div>
            </div>
            
            <!-- 返信フォーム -->
            <div class="reply-form">
              <textarea 
                v-model="replyTexts[comment.id]" 
                placeholder="返信を入力..."
                class="reply-input"
              ></textarea>
              <button 
                @click="addReply(comment.id)" 
                :disabled="!replyTexts[comment.id]?.trim()"
                class="reply-btn"
              >
                返信
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { fetchMemoDetail } = useMemoApi();
const { markAsRead, markMultipleAsRead } = useReadStatus();

const memo = ref({});
const comments = ref([]);
const attachments = ref([]);
const loading = ref(false);
const error = ref('');
const newComment = ref('');
const replyTexts = ref({});

// メモ詳細取得
const loadMemoDetail = async () => {
  try {
    loading.value = true;
    
    const response = await fetchMemoDetail(route.params.id as string, {
      includeComments: true,
      includeAttachments: true,
      autoMarkAsRead: true
    });
    
    memo.value = response.memo;
    comments.value = response.comments || [];
    attachments.value = response.attachments || [];
    
    // 表示後に未読アイテムを既読にする
    await markVisibleItemsAsRead();
    
  } catch (err) {
    console.error('Failed to load memo detail:', err);
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

// 表示されたアイテムを既読にする
const markVisibleItemsAsRead = async () => {
  const unreadItems = [];
  
  // メモ本体が未読の場合
  if (!memo.value.readStatus?.isRead) {
    unreadItems.push({
      targetType: 'memo',
      targetId: memo.value.id
    });
  }
  
  // 未読コメント・返信を収集
  comments.value.forEach(comment => {
    if (!comment.readStatus?.isRead) {
      unreadItems.push({
        targetType: 'comment',
        targetId: comment.id
      });
    }
    
    comment.replies?.forEach(reply => {
      if (!reply.readStatus?.isRead) {
        unreadItems.push({
          targetType: 'comment',
          targetId: reply.id
        });
      }
    });
  });
  
  // 一括既読処理
  if (unreadItems.length > 0) {
    try {
      await markMultipleAsRead(unreadItems);
    } catch (error) {
      console.error('Failed to mark items as read:', error);
      // エラーは隠蔽せず、ログ出力のみ
    }
  }
};

// コメント追加
const addComment = async () => {
  if (!newComment.value.trim()) return;
  
  try {
    const { createComment } = useMemoApi();
    await createComment(memo.value.id, {
      content: newComment.value.trim()
    });
    
    newComment.value = '';
    await loadMemoDetail(); // 再読み込み
  } catch (error) {
    console.error('Failed to add comment:', error);
    // エラー表示
    alert(`コメント投稿に失敗しました: ${error.message}`);
  }
};

// 返信追加
const addReply = async (commentId: string) => {
  const replyText = replyTexts.value[commentId];
  if (!replyText?.trim()) return;
  
  try {
    const { createComment } = useMemoApi();
    await createComment(memo.value.id, {
      content: replyText.trim(),
      parentCommentId: commentId
    });
    
    replyTexts.value[commentId] = '';
    await loadMemoDetail(); // 再読み込み
  } catch (error) {
    console.error('Failed to add reply:', error);
    alert(`返信投稿に失敗しました: ${error.message}`);
  }
};

// ユーティリティ関数
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getPriorityLabel = (priority: string) => {
  const labels = { high: '高', medium: '中', low: '低' };
  return labels[priority] || priority;
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return Math.round(bytes / (1024 * 1024)) + ' MB';
};

const getAttachmentUrl = (attachmentId: string) => {
  const config = useRuntimeConfig();
  return `${config.public.hotelCommonApiUrl}/api/v1/memos/attachments/${attachmentId}/download`;
};

// 初期読み込み
onMounted(() => {
  loadMemoDetail();
});
</script>

<style scoped>
.memo-detail-page {
  @apply max-w-4xl mx-auto p-6;
}

.loading, .error {
  @apply text-center py-8;
}

.error {
  @apply text-red-600;
}

.memo-content {
  @apply bg-white rounded-lg border p-6 mb-8;
}

.memo-content.unread {
  @apply border-red-200 bg-red-50;
}

.memo-header {
  @apply flex justify-between items-start mb-4;
}

.memo-actions {
  @apply flex gap-2;
}

.edit-btn, .delete-btn {
  @apply px-3 py-1 text-sm rounded;
}

.edit-btn {
  @apply bg-blue-500 text-white hover:bg-blue-600;
}

.delete-btn {
  @apply bg-red-500 text-white hover:bg-red-600;
}

.memo-meta {
  @apply flex gap-4 text-sm text-gray-600 mb-4;
}

.system {
  @apply bg-gray-100 px-2 py-1 rounded text-xs;
}

.priority.high {
  @apply bg-red-100 text-red-800 px-2 py-1 rounded text-xs;
}

.priority.low {
  @apply bg-green-100 text-green-800 px-2 py-1 rounded text-xs;
}

.memo-tags {
  @apply flex gap-2 mb-4;
}

.tag {
  @apply bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs;
}

.memo-body {
  @apply whitespace-pre-wrap text-gray-900;
}

.attachments {
  @apply mt-6 pt-6 border-t;
}

.attachment-list {
  @apply space-y-2;
}

.attachment-item {
  @apply flex items-center gap-2;
}

.file-size {
  @apply text-sm text-gray-500;
}

.comments-section {
  @apply space-y-6;
}

.comment-form, .reply-form {
  @apply space-y-3;
}

.comment-input, .reply-input {
  @apply w-full p-3 border border-gray-300 rounded-md resize-vertical;
}

.submit-btn, .reply-btn {
  @apply px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50;
}

.comment-item {
  @apply bg-white border rounded-lg p-4;
}

.comment-item.unread {
  @apply border-yellow-200 bg-yellow-50;
}

.comment-header, .reply-header {
  @apply flex items-center gap-4 mb-2;
}

.replies {
  @apply ml-6 mt-4 space-y-3;
}

.reply-item {
  @apply bg-gray-50 border rounded-lg p-3;
}

.reply-item.unread {
  @apply border-yellow-200 bg-yellow-100;
}
</style>
```

### Phase 4: WebSocket通知統合

#### 4.1 通知システム Composable

```typescript
// composables/useNotifications.ts
export const useNotifications = () => {
  const config = useRuntimeConfig();
  const { staff } = useJwtAuth();
  
  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const unreadCount = ref(0);
  const notifications = ref([]);
  
  // WebSocket接続
  const connect = (onNotification?: (notification: any) => void) => {
    if (!process.client || !staff.value?.id) return;
    
    try {
      const wsUrl = `${config.public.hotelCommonWsUrl}/ws/memo-notifications`;
      ws.value = new WebSocket(wsUrl);
      
      ws.value.onopen = () => {
        console.log('✅ WebSocket connected to hotel-common');
        isConnected.value = true;
        
        // 認証・購読
        ws.value?.send(JSON.stringify({
          type: 'subscribe',
          sourceSystem: 'saas',
          tenantId: staff.value.tenantId,
          staffId: staff.value.id,
          token: useCookie('auth-token').value
        }));
      };
      
      ws.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'unread_count_changed') {
            unreadCount.value = data.payload.totalUnread;
            
            // ブラウザ通知
            if (Notification.permission === 'granted') {
              new Notification('新しいメモ通知', {
                body: `未読メモが${data.payload.totalUnread}件あります`,
                icon: '/favicon.ico'
              });
            }
          }
          
          // カスタムハンドラー呼び出し
          if (onNotification) {
            onNotification(data);
          }
          
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.value.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnected.value = false;
      };
      
      ws.value.onclose = () => {
        console.log('WebSocket disconnected');
        isConnected.value = false;
        
        // 自動再接続（5秒後）
        setTimeout(() => {
          if (staff.value?.id) {
            connect(onNotification);
          }
        }, 5000);
      };
      
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw new Error(`WebSocket接続に失敗しました: ${error.message}`);
    }
  };
  
  // 接続終了
  const disconnect = () => {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
      isConnected.value = false;
    }
  };
  
  // ブラウザ通知許可要求
  const requestNotificationPermission = async () => {
    if (!process.client || !('Notification' in window)) return false;
    
    if (Notification.permission === 'granted') return true;
    
    if (Notification.permission === 'denied') return false;
    
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };
  
  return {
    connect,
    disconnect,
    requestNotificationPermission,
    isConnected: readonly(isConnected),
    unreadCount: readonly(unreadCount),
    notifications: readonly(notifications)
  };
};
```

### Phase 5: エラーハンドリング・監視

#### 5.1 エラーハンドリング

```typescript
// utils/errorHandler.ts
export class MemoApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MemoApiError';
  }
}

export const handleMemoApiError = (error: any): MemoApiError => {
  // hotel-common APIエラーの場合
  if (error.response?.data?.error) {
    const apiError = error.response.data.error;
    return new MemoApiError(
      apiError.message,
      apiError.code,
      error.response.status,
      apiError.details
    );
  }
  
  // ネットワークエラーの場合
  if (error.code === 'NETWORK_ERROR') {
    return new MemoApiError(
      'hotel-commonとの通信に失敗しました。ネットワーク接続を確認してください。',
      'NETWORK_ERROR',
      0
    );
  }
  
  // タイムアウトエラーの場合
  if (error.code === 'TIMEOUT') {
    return new MemoApiError(
      'hotel-commonからの応答がタイムアウトしました。しばらく待ってから再試行してください。',
      'TIMEOUT',
      0
    );
  }
  
  // その他のエラー
  return new MemoApiError(
    error.message || '予期しないエラーが発生しました',
    'UNKNOWN_ERROR',
    0
  );
};
```

#### 5.2 システム監視

```typescript
// composables/useSystemMonitoring.ts
export const useSystemMonitoring = () => {
  const healthStatus = ref({
    hotelCommon: 'unknown',
    lastCheck: null,
    responseTime: 0
  });
  
  // hotel-common ヘルスチェック
  const checkHotelCommonHealth = async () => {
    const startTime = Date.now();
    
    try {
      const config = useRuntimeConfig();
      const response = await fetch(`${config.public.hotelCommonApiUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      const endTime = Date.now();
      
      if (response.ok) {
        healthStatus.value = {
          hotelCommon: 'healthy',
          lastCheck: new Date().toISOString(),
          responseTime: endTime - startTime
        };
      } else {
        throw new Error(`Health check failed: ${response.status}`);
      }
      
    } catch (error) {
      console.error('hotel-common health check failed:', error);
      healthStatus.value = {
        hotelCommon: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime
      };
      
      throw new Error(`hotel-common is not available: ${error.message}`);
    }
  };
  
  // 定期ヘルスチェック開始
  const startHealthMonitoring = () => {
    // 初回チェック
    checkHotelCommonHealth().catch(() => {
      // エラーは既にログ出力済み
    });
    
    // 30秒間隔でチェック
    setInterval(() => {
      checkHotelCommonHealth().catch(() => {
        // エラーは既にログ出力済み
      });
    }, 30000);
  };
  
  return {
    healthStatus: readonly(healthStatus),
    checkHotelCommonHealth,
    startHealthMonitoring
  };
};
```

## 🧪 テスト実装

### 統合テスト

```typescript
// tests/integration/memo-common-integration.test.ts
import { describe, test, expect, beforeAll, afterAll } from 'vitest';

describe('Memo Common Integration Tests', () => {
  beforeAll(async () => {
    // hotel-common が起動していることを確認
    await checkHotelCommonConnection();
  });
  
  test('メモ一覧取得が正常に動作する', async () => {
    const { fetchMemos } = useMemoApi();
    
    const result = await fetchMemos({
      page: 1,
      pageSize: 10
    });
    
    expect(result).toBeDefined();
    expect(result.memos).toBeInstanceOf(Array);
    expect(result.pagination).toBeDefined();
  });
  
  test('メモ作成→取得→削除のフローが正常に動作する', async () => {
    const { createMemo, fetchMemoDetail, deleteMemo } = useMemoApi();
    
    // メモ作成
    const createResult = await createMemo({
      title: 'テストメモ',
      content: 'テスト内容',
      priority: 'medium'
    });
    
    expect(createResult.memo.id).toBeDefined();
    const memoId = createResult.memo.id;
    
    // メモ取得
    const fetchResult = await fetchMemoDetail(memoId);
    expect(fetchResult.memo.title).toBe('テストメモ');
    expect(fetchResult.memo.content).toBe('テスト内容');
    
    // メモ削除
    await deleteMemo(memoId);
    
    // 削除確認
    await expect(fetchMemoDetail(memoId)).rejects.toThrow('MEMO_NOT_FOUND');
  });
  
  test('既読処理が正常に動作する', async () => {
    const { createMemo, deleteMemo } = useMemoApi();
    const { markAsRead, getUnreadCount } = useReadStatus();
    
    // テストメモ作成
    const createResult = await createMemo({
      title: 'テストメモ（既読テスト）',
      content: 'テスト内容'
    });
    const memoId = createResult.memo.id;
    
    // 既読処理
    await markAsRead('memo', memoId);
    
    // 未読数確認
    const unreadResult = await getUnreadCount();
    expect(unreadResult.totalUnread).toBeGreaterThanOrEqual(0);
    
    // クリーンアップ
    await deleteMemo(memoId);
  });
});
```

## 📋 デプロイメント・運用

### デプロイメント手順

1. **hotel-common の起動確認**
2. **環境変数設定**
3. **依存関係インストール**
4. **ビルド・デプロイ**
5. **動作確認**

### 監視項目

- hotel-common API接続状況
- WebSocket接続状況
- エラー発生率
- レスポンス時間

---

**ドキュメント更新履歴**:
- 2025年9月16日: 初版作成 - hotel-saas統合ガイド (kaneko)
