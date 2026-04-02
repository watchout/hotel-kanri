# メモ機能既読未読 フロントエンド実装ガイド

**作成日**: 2025年9月16日  
**作成者**: kaneko (hotel-kanri)  
**対象システム**: hotel-saas  
**機能**: メモ機能既読未読ステータス フロントエンド実装

## 🚨 **重要な実装方針**

### **❌ 禁止事項（厳守）**

**フォールバック・モック・一時対応の全面禁止**
- ❌ フォールバック処理（エラー時の代替処理）
- ❌ モックデータの使用
- ❌ 一時的な回避実装
- ❌ try-catch での例外隠蔽
- ❌ デフォルト値での問題回避
- ❌ 「とりあえず動く」実装

## 📋 実装概要

Vue.js + Nuxt.js でのメモ既読未読機能の実装ガイドです。

## 🔧 Composables

### useReadStatus.ts

```typescript
// composables/useReadStatus.ts
export const useReadStatus = () => {
  const { $api } = useNuxtApp();
  const { staff } = useJwtAuth();

  // 既読処理
  const markAsRead = async (targetType: 'memo' | 'comment' | 'reply', targetId: string) => {
    if (!staff.value?.id) {
      throw new Error('Staff authentication required');
    }

    try {
      const response = await $api.post('/api/v1/memos/read-status', {
        targetType,
        targetId,
        staffId: staff.value.id
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to mark as read:', error);
      throw new Error(`既読処理に失敗しました: ${error.message}`);
    }
  };

  // 未読数取得
  const getUnreadCount = async (includeDetails = false) => {
    if (!staff.value?.id) {
      throw new Error('Staff authentication required');
    }

    try {
      const response = await $api.get('/api/v1/memos/unread-count', {
        params: {
          staffId: staff.value.id,
          includeDetails
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
    getUnreadCount
  };
};
```

## 🎨 Components

### UnreadIndicator.vue

```vue
<template>
  <div v-if="unreadCount > 0" class="unread-indicator">
    <Icon name="unread" class="text-red-500" />
    <span class="unread-count">{{ unreadCount }}</span>
  </div>
</template>

<script setup lang="ts">
interface Props {
  unreadCount: number;
  showCount?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showCount: true
});
</script>

<style scoped>
.unread-indicator {
  @apply flex items-center gap-1 text-red-500;
}

.unread-count {
  @apply text-xs font-bold bg-red-500 text-white rounded-full px-2 py-1 min-w-[20px] text-center;
}
</style>
```

### MemoListItem.vue

```vue
<template>
  <div 
    class="memo-item"
    :class="{ 'has-unread': hasUnreadContent }"
    @click="navigateToMemo"
  >
    <div class="memo-header">
      <h3 class="memo-title">{{ memo.title }}</h3>
      <UnreadIndicator 
        v-if="hasUnreadContent"
        :unread-count="totalUnreadCount"
      />
    </div>
    
    <div class="memo-meta">
      <span class="author">{{ memo.authorName }}</span>
      <span class="date">{{ formatDate(memo.updatedAt) }}</span>
    </div>
    
    <p class="memo-preview">{{ memo.content.substring(0, 100) }}...</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  memo: {
    id: string;
    title: string;
    content: string;
    authorName: string;
    updatedAt: string;
    readStatus?: {
      isRead: boolean;
      hasUnreadComments: boolean;
      hasUnreadReplies: boolean;
      totalUnreadCount: number;
    };
  };
}

const props = defineProps<Props>();

const hasUnreadContent = computed(() => {
  if (!props.memo.readStatus) return false;
  return props.memo.readStatus.totalUnreadCount > 0;
});

const totalUnreadCount = computed(() => {
  return props.memo.readStatus?.totalUnreadCount || 0;
});

const navigateToMemo = () => {
  navigateTo(`/memos/${props.memo.id}`);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ja-JP');
};
</script>

<style scoped>
.memo-item {
  @apply p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors;
}

.memo-item.has-unread {
  @apply border-red-200 bg-red-50;
}

.memo-header {
  @apply flex justify-between items-start mb-2;
}

.memo-title {
  @apply text-lg font-semibold text-gray-900;
}

.memo-meta {
  @apply flex gap-4 text-sm text-gray-600 mb-2;
}

.memo-preview {
  @apply text-gray-700 text-sm;
}
</style>
```

## 📄 Pages

### pages/memos/index.vue

```vue
<template>
  <div class="memos-page">
    <div class="page-header">
      <h1>メモ一覧</h1>
      <div class="unread-summary">
        <span>未読: {{ unreadSummary.totalUnread }}件</span>
      </div>
    </div>

    <div class="filters">
      <button 
        @click="toggleUnreadFilter"
        :class="{ active: showUnreadOnly }"
        class="filter-btn"
      >
        未読のみ表示
      </button>
    </div>

    <div class="memo-list">
      <MemoListItem 
        v-for="memo in memos" 
        :key="memo.id"
        :memo="memo"
      />
    </div>

    <div v-if="loading" class="loading">
      読み込み中...
    </div>
  </div>
</template>

<script setup lang="ts">
const { $api } = useNuxtApp();
const { staff } = useJwtAuth();
const { getUnreadCount } = useReadStatus();

const memos = ref([]);
const loading = ref(false);
const showUnreadOnly = ref(false);
const unreadSummary = ref({ totalUnread: 0 });

// メモ一覧取得
const fetchMemos = async () => {
  if (!staff.value?.id) {
    throw new Error('Staff authentication required');
  }

  loading.value = true;
  
  try {
    const response = await $api.get('/api/v1/memos', {
      params: {
        includeReadStatus: true,
        staffId: staff.value.id,
        filterUnreadOnly: showUnreadOnly.value
      }
    });
    
    memos.value = response.data.memos;
    unreadSummary.value = response.data.summary;
  } catch (error) {
    console.error('Failed to fetch memos:', error);
    throw new Error(`メモ取得に失敗しました: ${error.message}`);
  } finally {
    loading.value = false;
  }
};

// 未読フィルター切り替え
const toggleUnreadFilter = () => {
  showUnreadOnly.value = !showUnreadOnly.value;
  fetchMemos();
};

// 初期読み込み
onMounted(() => {
  fetchMemos();
});

// リアルタイム更新（WebSocket）
const ws = ref(null);
onMounted(() => {
  ws.value = new WebSocket('ws://localhost:3000/ws/memo-notifications');
  
  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'unread_count_changed') {
      // 未読数が変更された場合、リストを再取得
      fetchMemos();
    }
  };
});

onUnmounted(() => {
  if (ws.value) {
    ws.value.close();
  }
});
</script>

<style scoped>
.page-header {
  @apply flex justify-between items-center mb-6;
}

.unread-summary {
  @apply text-sm text-gray-600;
}

.filters {
  @apply mb-4;
}

.filter-btn {
  @apply px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50;
}

.filter-btn.active {
  @apply bg-blue-500 text-white border-blue-500;
}

.memo-list {
  @apply space-y-4;
}

.loading {
  @apply text-center py-4 text-gray-600;
}
</style>
```

### pages/memos/[id].vue

```vue
<template>
  <div class="memo-detail-page">
    <div class="memo-content" :class="{ 'unread': !memo.readStatus?.isRead }">
      <h1>{{ memo.title }}</h1>
      <div class="memo-meta">
        <span>{{ memo.authorName }}</span>
        <span>{{ formatDate(memo.updatedAt) }}</span>
      </div>
      <div class="memo-body">{{ memo.content }}</div>
    </div>

    <div class="comments-section">
      <h2>コメント</h2>
      
      <div 
        v-for="comment in comments" 
        :key="comment.id"
        class="comment-item"
        :class="{ 'unread': !comment.readStatus?.isRead }"
      >
        <div class="comment-header">
          <span class="author">{{ comment.authorName }}</span>
          <span class="date">{{ formatDate(comment.createdAt) }}</span>
          <UnreadIndicator 
            v-if="!comment.readStatus?.isRead"
            :unread-count="1"
            :show-count="false"
          />
        </div>
        <div class="comment-content">{{ comment.content }}</div>
        
        <!-- レス一覧 -->
        <div class="replies">
          <div 
            v-for="reply in comment.replies"
            :key="reply.id"
            class="reply-item"
            :class="{ 'unread': !reply.readStatus?.isRead }"
          >
            <div class="reply-header">
              <span class="author">{{ reply.authorName }}</span>
              <span class="date">{{ formatDate(reply.createdAt) }}</span>
              <UnreadIndicator 
                v-if="!reply.readStatus?.isRead"
                :unread-count="1"
                :show-count="false"
              />
            </div>
            <div class="reply-content">{{ reply.content }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const { $api } = useNuxtApp();
const { staff } = useJwtAuth();
const { markAsRead } = useReadStatus();

const memo = ref({});
const comments = ref([]);

// メモ詳細取得
const fetchMemoDetail = async () => {
  if (!staff.value?.id) {
    throw new Error('Staff authentication required');
  }

  try {
    const response = await $api.get(`/api/v1/memos/${route.params.id}`, {
      params: {
        includeReadStatus: true,
        staffId: staff.value.id,
        autoMarkAsRead: true // 自動既読処理
      }
    });
    
    memo.value = response.data.memo;
    comments.value = response.data.comments;
  } catch (error) {
    console.error('Failed to fetch memo detail:', error);
    throw new Error(`メモ詳細取得に失敗しました: ${error.message}`);
  }
};

// 画面表示時の自動既読処理
const markVisibleItemsAsRead = async () => {
  const unreadItems = [];
  
  // メモ本体が未読の場合
  if (!memo.value.readStatus?.isRead) {
    unreadItems.push({
      targetType: 'memo',
      targetId: memo.value.id
    });
  }
  
  // 未読コメント・レスを収集
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
          targetType: 'reply',
          targetId: reply.id
        });
      }
    });
  });
  
  // 一括既読処理
  if (unreadItems.length > 0) {
    try {
      await $api.post('/api/v1/memos/read-status/batch', {
        staffId: staff.value.id,
        items: unreadItems
      });
    } catch (error) {
      console.error('Failed to mark items as read:', error);
      // エラーは隠蔽せず、ユーザーに通知
      throw new Error(`既読処理に失敗しました: ${error.message}`);
    }
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ja-JP');
};

// 初期読み込み
onMounted(async () => {
  await fetchMemoDetail();
  
  // 画面表示後に既読処理
  nextTick(() => {
    markVisibleItemsAsRead();
  });
});
</script>

<style scoped>
.memo-content {
  @apply mb-8 p-6 bg-white rounded-lg border;
}

.memo-content.unread {
  @apply border-red-200 bg-red-50;
}

.memo-meta {
  @apply flex gap-4 text-sm text-gray-600 mb-4;
}

.memo-body {
  @apply text-gray-900 whitespace-pre-wrap;
}

.comments-section {
  @apply space-y-4;
}

.comment-item {
  @apply p-4 bg-white rounded-lg border;
}

.comment-item.unread {
  @apply border-yellow-200 bg-yellow-50;
}

.comment-header {
  @apply flex items-center gap-4 mb-2;
}

.reply-item {
  @apply ml-8 mt-4 p-3 bg-gray-50 rounded-lg border;
}

.reply-item.unread {
  @apply border-yellow-200 bg-yellow-100;
}

.author {
  @apply font-semibold text-gray-900;
}

.date {
  @apply text-sm text-gray-600;
}
</style>
```

## 🔔 通知システム

### useNotifications.ts

```typescript
// composables/useNotifications.ts
export const useNotifications = () => {
  const ws = ref(null);
  const unreadCount = ref(0);

  const connect = () => {
    if (!process.client) return;

    ws.value = new WebSocket('ws://localhost:3000/ws/memo-notifications');
    
    ws.value.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.value.onmessage = (event) => {
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
    };
    
    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.value.onclose = () => {
      console.log('WebSocket disconnected');
      // 再接続
      setTimeout(connect, 5000);
    };
  };

  const disconnect = () => {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
  };

  return {
    connect,
    disconnect,
    unreadCount: readonly(unreadCount)
  };
};
```

## 🎯 実装チェックリスト

### Phase 1: 基本機能
- [ ] `useReadStatus` composable作成
- [ ] `UnreadIndicator` コンポーネント作成
- [ ] メモ一覧での未読表示
- [ ] メモ詳細での自動既読処理

### Phase 2: 高度な機能
- [ ] WebSocket通知システム
- [ ] 一括既読処理
- [ ] 未読フィルター機能
- [ ] ブラウザ通知

### Phase 3: 最適化
- [ ] パフォーマンス最適化
- [ ] エラーハンドリング強化
- [ ] テスト実装

---

**ドキュメント更新履歴**:
- 2025年9月16日: 初版作成 (kaneko)
