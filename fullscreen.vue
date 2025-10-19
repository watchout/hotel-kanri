<template>
  <div class="fullscreen-layout">
    <slot />
  </div>
</template>

<style>
/* 全画面レイアウト - サイドバーなし */
html, body {
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  width: 100vw !important;
  height: 100vh !important;
}

.fullscreen-layout {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: 10000;
}

/* 管理画面要素を強制非表示 */
.admin-layout,
.admin-sidebar,
.sidebar,
nav,
aside,
[class*="sidebar"],
[class*="nav"],
[id*="sidebar"],
[id*="nav"],
.layout-sidebar,
.nuxt-layout-sidebar {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
  overflow: hidden !important;
  position: absolute !important;
  left: -9999px !important;
}
</style>
