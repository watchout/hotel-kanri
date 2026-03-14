<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- ヘッダー -->
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <NuxtLink to="/" class="flex items-center">
                <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mr-2">H</div>

                <span class="text-xl font-bold text-gray-800">Hotel SaaS</span>
              </NuxtLink>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <NuxtLink to="/info" class="text-blue-600 border-b-2 border-blue-600 px-3 py-2 text-sm font-medium">

              インフォメーション
            </NuxtLink>
            <NuxtLink to="/order" class="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
              オーダー
            </NuxtLink>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- フッター -->
    <footer class="bg-white border-t border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex justify-between items-center">
          <div class="text-sm text-gray-500">
            <p>© {{ new Date().getFullYear() }} Hotel SaaS. All rights reserved.</p>
          </div>
          <div class="flex space-x-4">
            <NuxtLink to="/contact" class="text-gray-500 hover:text-gray-700">
              お問い合わせ
            </NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import LanguageSwitcher from '~/components/LanguageSwitcher.vue'
import { useLocale } from '~/composables/useLocale'

const { t } = useLocale()
</script>
