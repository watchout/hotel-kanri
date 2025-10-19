# スライド型表示システム設計

## 概要
TVの16:9画面に最適化されたスライド型表示と、Web・モバイル向けの縦スクロール表示を統合したレスポンシブシステム

## デバイス別表示戦略

### 1. TV表示（16:9 スライド型）
```typescript
interface TVSlideConfig {
  aspectRatio: '16:9'
  slideSize: {
    width: 1920,
    height: 1080
  }
  navigation: 'auto' | 'touch' | 'remote'
  autoAdvance: boolean
  duration: number // 秒
  transition: 'slide' | 'fade' | 'zoom'
}

const tvSlideLayout = {
  container: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden'
  },
  slide: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  }
}
```

### 2. Web表示（縦スクロール）
```typescript
interface WebScrollConfig {
  sectionHeight: 'auto' | 'viewport'
  scrollBehavior: 'smooth' | 'auto'
  stickyNavigation: boolean
  parallaxEffect: boolean
}

const webScrollLayout = {
  container: {
    width: '100%',
    minHeight: '100vh',
    overflowY: 'auto'
  },
  section: {
    width: '100%',
    minHeight: '100vh',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  }
}
```

### 3. モバイル表示（縦型最適化）
```typescript
interface MobileConfig {
  orientation: 'portrait'
  touchOptimized: boolean
  swipeNavigation: boolean
  compactLayout: boolean
}

const mobileLayout = {
  container: {
    width: '100vw',
    minHeight: '100vh',
    padding: '1rem'
  },
  card: {
    width: '100%',
    marginBottom: '1rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  }
}
```

## エディタ統合

### 1. マルチデバイスプレビュー
```vue
<template>
  <div class="multi-device-editor">
    <!-- デバイス選択タブ -->
    <div class="device-tabs">
      <button 
        v-for="device in devices" 
        :key="device.id"
        :class="{ active: currentDevice === device.id }"
        @click="switchDevice(device.id)"
      >
        <Icon :name="device.icon" />
        {{ device.name }}
      </button>
    </div>
    
    <!-- プレビューエリア -->
    <div class="preview-area">
      <div :class="getDeviceClass(currentDevice)">
        <component 
          :is="getDisplayComponent(currentDevice)"
          :blocks="blocks"
          :config="getDeviceConfig(currentDevice)"
        />
      </div>
    </div>
    
    <!-- 編集パネル -->
    <div class="edit-panel">
      <div class="device-specific-settings">
        <h3>{{ currentDeviceName }}設定</h3>
        
        <!-- TV設定 -->
        <div v-if="currentDevice === 'tv'" class="tv-settings">
          <label>
            スライド自動切り替え
            <input type="checkbox" v-model="tvConfig.autoAdvance" />
          </label>
          <label>
            切り替え間隔（秒）
            <input type="number" v-model="tvConfig.duration" min="3" max="30" />
          </label>
          <label>
            トランジション効果
            <select v-model="tvConfig.transition">
              <option value="slide">スライド</option>
              <option value="fade">フェード</option>
              <option value="zoom">ズーム</option>
            </select>
          </label>
        </div>
        
        <!-- Web設定 -->
        <div v-if="currentDevice === 'web'" class="web-settings">
          <label>
            セクション高さ
            <select v-model="webConfig.sectionHeight">
              <option value="auto">自動</option>
              <option value="viewport">画面サイズ</option>
            </select>
          </label>
          <label>
            スムーススクロール
            <input type="checkbox" v-model="webConfig.scrollBehavior" />
          </label>
        </div>
        
        <!-- モバイル設定 -->
        <div v-if="currentDevice === 'mobile'" class="mobile-settings">
          <label>
            スワイプナビゲーション
            <input type="checkbox" v-model="mobileConfig.swipeNavigation" />
          </label>
          <label>
            コンパクトレイアウト
            <input type="checkbox" v-model="mobileConfig.compactLayout" />
          </label>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 2. レスポンシブブロック設計
```typescript
interface ResponsiveBlock {
  id: string
  type: string
  content: any
  
  // デバイス別設定
  tv: TVBlockConfig
  web: WebBlockConfig
  mobile: MobileBlockConfig
  
  // 共通設定
  common: {
    priority: number
    visibility: boolean
    animation: string
  }
}

interface TVBlockConfig {
  slidePosition: number
  fullScreen: boolean
  autoAdvance: boolean
  duration: number
}

interface WebBlockConfig {
  sectionBreak: boolean
  stickyPosition: boolean
  parallax: boolean
}

interface MobileBlockConfig {
  stackOrder: number
  collapsible: boolean
  swipeable: boolean
}
```

## Canva連携システム

### 1. Canvaインポート機能
```typescript
interface CanvaIntegration {
  importDesign(canvaUrl: string): Promise<CanvaDesign>
  convertToBlocks(design: CanvaDesign): Promise<ResponsiveBlock[]>
  syncUpdates(designId: string): Promise<void>
}

interface CanvaDesign {
  id: string
  title: string
  pages: CanvaPage[]
  assets: CanvaAsset[]
  fonts: CanvaFont[]
}

interface CanvaPage {
  id: string
  elements: CanvaElement[]
  background: CanvaBackground
  size: { width: number, height: number }
}

// 実装例
const canvaIntegration = {
  async importDesign(canvaUrl: string) {
    // Canva APIを使用してデザインを取得
    const response = await fetch(`/api/canva/import?url=${encodeURIComponent(canvaUrl)}`)
    return await response.json()
  },
  
  async convertToBlocks(design: CanvaDesign) {
    const blocks: ResponsiveBlock[] = []
    
    design.pages.forEach((page, index) => {
      // TV用スライドとして変換
      const tvBlock = {
        id: `slide-${index}`,
        type: 'slide',
        content: this.convertCanvaPageToSlide(page),
        tv: {
          slidePosition: index,
          fullScreen: true,
          autoAdvance: true,
          duration: 10
        },
        web: {
          sectionBreak: true,
          stickyPosition: false,
          parallax: false
        },
        mobile: {
          stackOrder: index,
          collapsible: false,
          swipeable: true
        }
      }
      
      blocks.push(tvBlock)
    })
    
    return blocks
  }
}
```

### 2. 自動変換ロジック
```typescript
interface ConversionRules {
  tv: {
    aspectRatio: '16:9'
    maxTextSize: number
    minFontSize: number
    safeArea: { top: number, bottom: number, left: number, right: number }
  }
  web: {
    maxWidth: number
    responsiveBreakpoints: number[]
    sectionPadding: number
  }
  mobile: {
    maxWidth: number
    touchTargetSize: number
    stackLayout: boolean
  }
}

const conversionRules = {
  tv: {
    aspectRatio: '16:9',
    maxTextSize: 72,
    minFontSize: 24,
    safeArea: { top: 60, bottom: 60, left: 80, right: 80 }
  },
  web: {
    maxWidth: 1200,
    responsiveBreakpoints: [768, 1024, 1440],
    sectionPadding: 32
  },
  mobile: {
    maxWidth: 414,
    touchTargetSize: 44,
    stackLayout: true
  }
}
```

## 表示コンポーネント

### 1. TVスライド表示
```vue
<template>
  <div class="tv-slide-container">
    <div 
      class="slide-wrapper"
      :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
    >
      <div 
        v-for="(block, index) in blocks" 
        :key="block.id"
        class="slide"
        :class="{ active: currentSlide === index }"
      >
        <component 
          :is="getBlockComponent(block.type)"
          v-bind="block.content"
          :tv-optimized="true"
        />
      </div>
    </div>
    
    <!-- ナビゲーション -->
    <div class="slide-navigation">
      <button @click="prevSlide">
        <Icon name="heroicons:chevron-left" />
      </button>
      <div class="slide-indicators">
        <span 
          v-for="(_, index) in blocks"
          :key="index"
          :class="{ active: currentSlide === index }"
          @click="goToSlide(index)"
        />
      </div>
      <button @click="nextSlide">
        <Icon name="heroicons:chevron-right" />
      </button>
    </div>
    
    <!-- 自動進行プログレスバー -->
    <div v-if="autoAdvance" class="progress-bar">
      <div 
        class="progress-fill"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>

<script setup>
const currentSlide = ref(0)
const autoAdvance = ref(true)
const duration = ref(10) // 秒
const progress = ref(0)

let autoTimer = null
let progressTimer = null

const startAutoAdvance = () => {
  if (!autoAdvance.value) return
  
  progress.value = 0
  progressTimer = setInterval(() => {
    progress.value += (100 / (duration.value * 10))
    if (progress.value >= 100) {
      clearInterval(progressTimer)
      nextSlide()
    }
  }, 100)
}

const nextSlide = () => {
  currentSlide.value = (currentSlide.value + 1) % blocks.value.length
  startAutoAdvance()
}

onMounted(() => {
  startAutoAdvance()
})
</script>
```

### 2. Web縦スクロール表示
```vue
<template>
  <div class="web-scroll-container">
    <div 
      v-for="(block, index) in blocks" 
      :key="block.id"
      class="section"
      :class="{ 'full-height': block.web.sectionHeight === 'viewport' }"
    >
      <component 
        :is="getBlockComponent(block.type)"
        v-bind="block.content"
        :web-optimized="true"
      />
    </div>
    
    <!-- スクロールナビゲーション -->
    <div class="scroll-navigation">
      <a 
        v-for="(block, index) in blocks"
        :key="block.id"
        :href="`#section-${index}`"
        class="nav-dot"
        :class="{ active: currentSection === index }"
      />
    </div>
  </div>
</template>
```

### 3. モバイル縦型表示
```vue
<template>
  <div class="mobile-container">
    <div 
      v-for="(block, index) in blocks" 
      :key="block.id"
      class="mobile-card"
      :class="{ collapsible: block.mobile.collapsible }"
    >
      <component 
        :is="getBlockComponent(block.type)"
        v-bind="block.content"
        :mobile-optimized="true"
      />
    </div>
  </div>
</template>
```

## 実装フェーズ

### Phase 1: 基本スライドシステム（1週間）
- TV用16:9スライド表示
- Web用縦スクロール表示
- モバイル用縦型レイアウト
- デバイス自動判定

### Phase 2: エディタ統合（1週間）
- マルチデバイスプレビュー
- デバイス別設定パネル
- レスポンシブブロック編集

### Phase 3: Canva連携（1週間）
- Canvaインポート機能
- 自動変換システム
- 同期更新機能

この設計により、PowerPointやCanvaのような直感的な操作で、TVに最適化されたスライド型コンテンツを作成し、同時にWebやモバイルでも最適な表示が可能になります。 