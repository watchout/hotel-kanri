<template>
  <div>
    <slot />
  </div>
</template>

<style>
/* レシート専用のグローバルスタイル */
@media print {
  .download-actions {
    display: none !important;
  }
  
  body {
    margin: 0;
    padding: 0;
  }
  
  .receipt-page {
    background: white !important;
    padding: 0 !important;
  }
  
  .receipt-container {
    max-width: none !important;
    margin: 0 !important;
    border: none !important;
    box-shadow: none !important;
  }
}
</style>
