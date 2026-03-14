<template>
  <div class="operation-layout">
    <!-- 運用モード専用レイアウト - サイドバーなし -->
    <slot />
  </div>
</template>

<script setup lang="ts">
// 運用モード専用レイアウト
// サイドバーやヘッダーを一切表示しない
</script>

<style>
/* 運用モード専用レイアウト - スクロール完全有効化 */
.operation-layout {
  width: 100vw !important;
  min-height: 100vh !important;
  height: auto !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  position: relative !important;
}

/* グローバルサイドバーの強制非表示 */
:global(.sidebar),
:global(.admin-sidebar),
:global(.navigation),
:global(.nav-sidebar) {
  display: none !important;
}

/* 全体のスクロール強制有効化 */
:global(html) {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  height: auto !important;
  scroll-behavior: smooth !important;
}

:global(body) {
  margin: 0 !important;
  padding: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  height: auto !important;
  min-height: 100vh !important;
}

:global(#__nuxt) {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  height: auto !important;
  min-height: 100vh !important;
}

/* 運用モード時の強制スクロール */
:global(.operation-container) {
  overflow-y: auto !important;
  overflow-x: hidden !important;
  height: auto !important;
  min-height: 100vh !important;
  touch-action: pan-y !important;
}
</style>
