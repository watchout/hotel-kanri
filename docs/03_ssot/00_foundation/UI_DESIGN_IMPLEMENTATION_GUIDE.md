# 世界最高峰UIデザイン実装ガイド

**作成日**: 2025-10-14  
**最終更新**: 2025-10-14  
**バージョン**: 1.0.0  
**参照SSOT**: [SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md](./SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md)

---

## 🎯 このガイドの目的

開発者がSSOTのUIデザイン原則を実際のコードに適用するための具体的な実装手順を提供します。

---

## ✅ 完了した設定

### 1. Tailwind CSS設定 ✅

すべてのシステムでTailwind設定を更新しました：

- ✅ **hotel-saas**: `/Users/kaneko/hotel-saas/tailwind.config.js`
- ✅ **hotel-pms**: `/Users/kaneko/hotel-pms/tailwind.config.js`
- ✅ **hotel-member**: `/Users/kaneko/hotel-member/tailwind.config.js`

### 2. CSS変数定義 ✅

- ✅ **hotel-saas**: `/Users/kaneko/hotel-saas/assets/css/_behavioral-colors.css`

---

## 🎨 カラー使用ガイド

### Tailwindクラスでの使用

```vue
<!-- プライマリーボタン -->
<button class="bg-primary-500 hover:bg-primary-600 text-white">
  ボタン
</button>

<!-- アクセントボタン -->
<button class="bg-accent-500 hover:bg-accent-600 text-white">
  重要なアクション
</button>

<!-- 成功メッセージ -->
<div class="bg-success-50 text-success-700 border border-success-200">
  成功しました
</div>

<!-- 警告 -->
<div class="bg-warning-50 text-warning-700 border border-warning-200">
  注意してください
</div>
```

### CSS変数での使用

```css
.custom-button {
  background-color: var(--color-primary);
  color: white;
}

.custom-button:hover {
  background-color: var(--color-primary-hover);
}

.card {
  background-color: var(--color-neutral-bg);
  box-shadow: var(--shadow-card);
  transition: var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-card-hover);
}
```

---

## 🧩 コンポーネント実装例

### 1. Netflix型カード（商品表示）

```vue
<template>
  <div class="category-section">
    <h2 class="text-2xl font-bold mb-4 text-primary-800">
      人気のルームサービス
    </h2>
    
    <!-- 横スクロールカルーセル -->
    <div class="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
      <div
        v-for="item in items"
        :key="item.id"
        class="card min-w-[280px] bg-white rounded-xl shadow-card
               hover:scale-105 hover:shadow-card-hover 
               transition-all duration-300 cursor-pointer"
        @click="selectItem(item)"
      >
        <!-- 画像 -->
        <img 
          :src="item.image" 
          :alt="item.name"
          class="w-full h-48 object-cover rounded-t-xl"
          loading="lazy"
        />
        
        <!-- コンテンツ -->
        <div class="p-4">
          <h3 class="text-lg font-semibold text-primary-800 mb-2">
            {{ item.name }}
          </h3>
          <p class="text-sm text-gray-600 mb-3">
            {{ item.description }}
          </p>
          <div class="flex justify-between items-center">
            <span class="text-2xl font-bold text-accent-500">
              ¥{{ item.price.toLocaleString() }}
            </span>
            <button class="px-4 py-2 bg-primary-500 hover:bg-primary-600 
                           text-white rounded-lg transition-colors">
              注文
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* スクロールバーを隠す */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
```

### 2. OpenAI型チャット

```vue
<template>
  <div class="chat-container h-screen flex flex-col bg-neutral-50">
    <!-- ヘッダー -->
    <div class="border-b border-gray-200 p-4 bg-white">
      <h1 class="text-xl font-semibold text-primary-800">AIコンシェルジュ</h1>
    </div>

    <!-- メッセージエリア -->
    <div class="flex-1 overflow-y-auto p-6 space-y-6">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'"
        class="animate-fade-in"
      >
        <div
          :class="[
            'max-w-2xl p-4 rounded-2xl',
            msg.role === 'user'
              ? 'bg-primary-500 text-white'
              : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
          ]"
        >
          <!-- ストリーミング表示対応 -->
          <div v-if="msg.streaming" class="flex items-center gap-2">
            <span>{{ msg.content }}</span>
            <span class="animate-pulse">▊</span>
          </div>
          <div v-else v-html="renderMarkdown(msg.content)"></div>
        </div>
      </div>
      
      <!-- タイピングインジケーター -->
      <div v-if="isTyping" class="flex justify-start">
        <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div class="flex gap-1">
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
            <span class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 入力エリア -->
    <div class="border-t border-gray-200 p-4 bg-white">
      <div class="max-w-4xl mx-auto flex gap-4">
        <input
          v-model="input"
          @keyup.enter="sendMessage"
          class="flex-1 p-3 border border-gray-300 rounded-lg
                 focus:ring-2 focus:ring-primary-500 focus:border-transparent
                 transition-all"
          placeholder="メッセージを入力..."
          :disabled="isTyping"
        />
        <button
          @click="sendMessage"
          :disabled="!input.trim() || isTyping"
          class="px-6 py-3 bg-accent-500 hover:bg-accent-600 
                 text-white rounded-lg transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          送信
        </button>
      </div>
    </div>
  </div>
</template>
```

### 3. Material Design 3 管理画面

```vue
<template>
  <div class="admin-layout flex h-screen bg-neutral-50">
    <!-- サイドバー -->
    <aside class="w-64 bg-white border-r border-gray-200 flex flex-col">
      <!-- ロゴ -->
      <div class="p-4 border-b border-gray-200">
        <h1 class="text-xl font-bold text-primary-800">Hotel SaaS</h1>
      </div>
      
      <!-- ナビゲーション -->
      <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
        <a
          v-for="item in navItems"
          :key="item.path"
          :href="item.path"
          :class="[
            'flex items-center gap-3 p-3 rounded-lg transition-colors',
            isActive(item.path)
              ? 'bg-primary-50 text-primary-700'
              : 'text-gray-700 hover:bg-neutral-100'
          ]"
        >
          <Icon :name="item.icon" class="w-5 h-5" />
          <span class="font-medium">{{ item.label }}</span>
        </a>
      </nav>
    </aside>

    <!-- メインコンテンツ -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- トップバー -->
      <header class="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-primary-800">{{ pageTitle }}</h2>
        <div class="flex items-center gap-4">
          <!-- 通知 -->
          <button class="relative p-2 text-gray-600 hover:text-primary-600 rounded-lg hover:bg-neutral-100">
            <Icon name="heroicons:bell" class="w-6 h-6" />
            <span class="absolute top-1 right-1 w-2 h-2 bg-accent-500 rounded-full"></span>
          </button>
          <!-- プロフィール -->
          <button class="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-100">
            <div class="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center">
              A
            </div>
          </button>
        </div>
      </header>

      <!-- コンテンツエリア -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- ダッシュボードカード -->
          <div class="card bg-white rounded-lg shadow-card p-6 
                      hover:shadow-card-hover transition-shadow">
            <div class="flex justify-between items-start mb-4">
              <h3 class="text-lg font-semibold text-primary-800">今日の注文</h3>
              <Icon name="heroicons:shopping-cart" class="w-6 h-6 text-primary-500" />
            </div>
            <p class="text-4xl font-bold text-accent-500">42</p>
            <p class="text-sm text-success-600 mt-2">↑ 12% vs 昨日</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
```

---

## 🎭 アニメーション使用例

### Tailwindクラス

```vue
<!-- フェードイン -->
<div class="animate-fade-in">...</div>

<!-- スライドイン -->
<div class="animate-slide-in">...</div>

<!-- スケールイン -->
<div class="animate-scale-in">...</div>
```

### カスタムアニメーション

```vue
<style scoped>
.card-enter-active {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
```

---

## 📱 レスポンシブデザイン

```vue
<template>
  <!-- グリッドレイアウト -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    <!-- カード -->
  </div>

  <!-- フレックスボックス -->
  <div class="flex flex-col md:flex-row gap-4">
    <!-- コンテンツ -->
  </div>

  <!-- テキストサイズ -->
  <h1 class="text-2xl md:text-3xl lg:text-4xl">タイトル</h1>

  <!-- パディング -->
  <div class="p-4 md:p-6 lg:p-8">
    <!-- コンテンツ -->
  </div>
</template>
```

---

## ♿ アクセシビリティ

### 必須要素

```vue
<template>
  <!-- ボタン -->
  <button
    class="..."
    aria-label="削除"
    @click="deleteItem"
  >
    <Icon name="heroicons:trash" />
  </button>

  <!-- フォーム -->
  <label for="email" class="block text-sm font-medium text-gray-700">
    メールアドレス
  </label>
  <input
    id="email"
    type="email"
    class="..."
    aria-describedby="email-error"
  />
  <p id="email-error" class="text-sm text-accent-600">
    メールアドレスが無効です
  </p>

  <!-- フォーカス表示 -->
  <button class="focus:ring-2 focus:ring-primary-500 focus:outline-none">
    ボタン
  </button>
</template>
```

---

## 🚀 次のステップ

1. ✅ Tailwind設定完了
2. ✅ CSS変数定義完了
3. ⏳ 基本コンポーネントライブラリ作成
4. ⏳ Storybook設定
5. ⏳ 既存コンポーネントの段階的移行

---

**作成者**: Iza（統合管理者）  
**参照**: [SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md](./SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md)

