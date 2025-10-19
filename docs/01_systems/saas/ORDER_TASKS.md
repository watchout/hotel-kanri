---
title: Phase-A – Order System
version: 1.1
---

# CONTEXT
INCLUDE docs/MVP_OVERVIEW.md

# GOAL
客室 UI → キッチン／配膳 UI → リアルタイム進捗 まで **オーダー機能全体** を完成させる

# TASK LIST
| ID  | 内容                             | DoD                       |
|-----|----------------------------------|---------------------------|
| A-1 | Prisma schema & migrate (SQLite) | migrate dev OK            |
| A-2 | `POST /orders` API + Zod         | Vitest 201/400/401        |
| A-3 | deviceToken HMAC util            | 100 % cov                 |
| A-4 | 客室 `/orders` UI + Pinia        | UX ≥ 4/5                  |
| A-5 | キッチン `/orders/manage` UI     | status 更新 → WS 確認     |
| A-6 | 配膳 `/delivery/manage` UI       | delivering→done           |
| A-7 | WebSocket broadcast              | latency < 1 s             |
| A-8 | Playwright E2E (room→done)       | 緑                        |

> **Note**  
> Phase‑A 完了時点で"客室→キッチン→配膳"のフローが E2E で通ることがゴール。

## 追加実装タスク (2025-05-16)

### 配膳チェック機能

- [ ] **配膳管理画面UI拡張**
  - [ ] 各注文アイテムにチェックボックス追加
  - [ ] チェック状態に応じたスタイル変更 
  - [ ] 全アイテムチェック時のみ「配膳完了」ボタン有効化

- [ ] **配膳チェック状態管理**
  - [ ] 注文アイテムのチェック状態管理（Vue Reactive）
  - [ ] 全チェック確認ロジック実装
  - [ ] チェック状態のローカルストレージへの保存（任意）

### キッチンポジション対応

- [ ] **カテゴリフィルター実装**
  - [ ] カテゴリフィルターUI追加
  - [ ] 複数選択機能実装
  - [ ] フィルター状態の保存機能実装

- [ ] **注文アイテムとカテゴリ紐付け**
  - [ ] 注文アイテムにカテゴリ情報表示
  - [ ] カテゴリ別フィルタリングロジック実装

## サンプル実装コード

### 配膳チェック機能

```vue
<!-- 配膳アイテムチェックコンポーネント -->
<template>
  <div class="mb-4">
    <div 
      v-for="(item, index) in orderItems" 
      :key="index"
      class="flex items-center p-3 mb-2 rounded border"
      :class="item.checked ? 'bg-green-50 border-green-500' : 'border-gray-300'"
    >
      <div class="flex-grow">
        <div class="font-bold">{{ item.name }}</div>
        <div class="text-sm">数量: {{ item.quantity }}</div>
      </div>
      
      <label class="flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          v-model="item.checked" 
          class="h-5 w-5 text-green-600"
          @change="updateCheckedStatus"
        >
        <span class="ml-2 text-sm">
          {{ item.checked ? '提供済み' : '未提供' }}
        </span>
      </label>
    </div>
    
    <button 
      class="w-full p-2 mt-4 rounded text-white"
      :class="allItemsChecked ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'"
      :disabled="!allItemsChecked"
      @click="completeDelivery"
    >
      配膳完了
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  order: Object,
});

const orderItems = ref(
  props.order.items.map(item => ({
    ...item,
    checked: false
  }))
);

const allItemsChecked = computed(() => {
  return orderItems.value.every(item => item.checked);
});

function updateCheckedStatus() {
  // ローカルストレージに保存する場合はここに実装
}

function completeDelivery() {
  if (allItemsChecked.value) {
    // ステータス更新APIを呼び出す
  }
}
</script>
```

### キッチンポジション対応

```vue
<!-- カテゴリフィルターコンポーネント -->
<template>
  <div class="mb-6">
    <h3 class="text-lg font-semibold mb-2">ポジションフィルター</h3>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="category in categories"
        :key="category.id"
        @click="toggleCategory(category.id)"
        class="px-3 py-1 rounded text-sm"
        :class="isSelected(category.id) 
          ? 'bg-indigo-600 text-white' 
          : 'bg-gray-200 text-gray-800 hover:bg-gray-300'"
      >
        {{ category.name }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const categories = ref([
  { id: 1, name: '前菜・サラダ' },
  { id: 2, name: 'メインディッシュ' },
  { id: 3, name: 'デザート' },
  { id: 4, name: 'ドリンク' },
]);

const selectedCategories = ref([]);

// ローカルストレージから読み込み
onMounted(() => {
  const saved = localStorage.getItem('selectedCategories');
  if (saved) {
    selectedCategories.value = JSON.parse(saved);
  } else {
    // デフォルトですべて選択
    selectedCategories.value = categories.value.map(c => c.id);
  }
});

// 変更時に保存
watch(selectedCategories, (newVal) => {
  localStorage.setItem('selectedCategories', JSON.stringify(newVal));
}, { deep: true });

function toggleCategory(id) {
  const index = selectedCategories.value.indexOf(id);
  if (index === -1) {
    selectedCategories.value.push(id);
  } else {
    selectedCategories.value.splice(index, 1);
  }
}

function isSelected(id) {
  return selectedCategories.value.includes(id);
}

// 親コンポーネントに選択されたカテゴリを公開
defineExpose({ selectedCategories });
</script>
```