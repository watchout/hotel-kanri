# 個別機能の統合CMS組み込み設計

## 概要
既存の個別機能を統合CMSの機能ブロックとして組み込み、スライド型表示システムで統一的に管理・表示する

## 機能ブロック化戦略

### 1. 注文システム → 注文ブロック
```typescript
interface OrderBlock {
  type: 'order-system'
  props: {
    displayMode: 'menu' | 'category' | 'featured' | 'search'
    categories: number[]
    showPrices: boolean
    showImages: boolean
    quickOrder: boolean
    cartPreview: boolean
    maxItems: number
  }
  
  // デバイス別最適化
  tv: {
    fullScreen: true
    touchOptimized: true
    largeButtons: true
    autoAdvance: false
  }
  web: {
    modalMode: true
    sidebarCart: true
    filterBar: true
  }
  mobile: {
    swipeGestures: true
    bottomSheet: true
    quickAdd: true
  }
}
```

### 2. AIコンシェルジュ → AIチャットブロック
```typescript
interface AIConciergeBlock {
  type: 'ai-concierge'
  props: {
    characterId: string
    welcomeMessage: string
    suggestedQuestions: string[]
    showAvatar: boolean
    compactMode: boolean
    autoGreeting: boolean
  }
  
  tv: {
    voiceEnabled: true
    largeText: true
    autoRead: true
    gestureControl: true
  }
  web: {
    floatingWidget: true
    expandable: true
    historyView: true
  }
  mobile: {
    fullScreenMode: true
    voiceInput: true
    hapticFeedback: true
  }
}
```

### 3. 館内施設管理 → 施設案内ブロック
```typescript
interface FacilityBlock {
  type: 'facility-guide'
  props: {
    facilityTypes: string[]
    displayMode: 'grid' | 'list' | 'carousel' | 'map'
    showHours: boolean
    showImages: boolean
    showBooking: boolean
    showReviews: boolean
    filterByAvailability: boolean
  }
  
  tv: {
    slideshow: true
    autoRotate: true
    largeImages: true
    simplifiedInfo: true
  }
  web: {
    interactiveMap: true
    detailModal: true
    bookingIntegration: true
  }
  mobile: {
    swipeCards: true
    locationServices: true
    quickCall: true
  }
}
```

### 4. 統計・分析 → 統計表示ブロック
```typescript
interface StatisticsBlock {
  type: 'statistics-display'
  props: {
    chartType: 'bar' | 'line' | 'pie' | 'kpi'
    dataSource: string
    timeRange: string
    showRealtime: boolean
    publicView: boolean
    animatedCharts: boolean
  }
  
  tv: {
    dashboardMode: true
    autoRefresh: true
    largeNumbers: true
    colorCoded: true
  }
  web: {
    interactive: true
    drillDown: true
    exportOptions: true
  }
  mobile: {
    swipeCharts: true
    summaryView: true
    notifications: true
  }
}
```

### 5. フロント業務 → 予約・サービスブロック
```typescript
interface ServiceBlock {
  type: 'service-booking'
  props: {
    serviceTypes: string[]
    timeSlots: boolean
    instantBooking: boolean
    showAvailability: boolean
    requiresApproval: boolean
    showPricing: boolean
  }
  
  tv: {
    touchFriendly: true
    largeCalendar: true
    confirmationScreen: true
  }
  web: {
    calendarView: true
    multiSelect: true
    paymentIntegration: true
  }
  mobile: {
    quickBooking: true
    pushNotifications: true
    locationBased: true
  }
}
```

## 統合管理システム

### 1. 統一管理画面
```vue
<template>
  <div class="integrated-admin">
    <!-- 機能選択タブ -->
    <div class="function-tabs">
      <button 
        v-for="func in functions" 
        :key="func.id"
        :class="{ active: currentFunction === func.id }"
        @click="switchFunction(func.id)"
      >
        <Icon :name="func.icon" />
        {{ func.name }}
      </button>
    </div>
    
    <!-- 機能別管理パネル -->
    <div class="function-panel">
      <!-- 注文システム管理 -->
      <div v-if="currentFunction === 'order'" class="order-management">
        <h3>注文システム設定</h3>
        <div class="settings-grid">
          <div class="setting-group">
            <label>表示カテゴリ</label>
            <CategorySelector v-model="orderSettings.categories" />
          </div>
          <div class="setting-group">
            <label>クイック注文</label>
            <input type="checkbox" v-model="orderSettings.quickOrder" />
          </div>
          <div class="setting-group">
            <label>カート表示</label>
            <select v-model="orderSettings.cartDisplay">
              <option value="sidebar">サイドバー</option>
              <option value="modal">モーダル</option>
              <option value="bottom">下部固定</option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- AIコンシェルジュ管理 -->
      <div v-if="currentFunction === 'ai'" class="ai-management">
        <h3>AIコンシェルジュ設定</h3>
        <div class="settings-grid">
          <div class="setting-group">
            <label>キャラクター</label>
            <CharacterSelector v-model="aiSettings.characterId" />
          </div>
          <div class="setting-group">
            <label>ウェルカムメッセージ</label>
            <textarea v-model="aiSettings.welcomeMessage" />
          </div>
          <div class="setting-group">
            <label>提案質問</label>
            <SuggestionEditor v-model="aiSettings.suggestedQuestions" />
          </div>
        </div>
      </div>
      
      <!-- 施設案内管理 -->
      <div v-if="currentFunction === 'facility'" class="facility-management">
        <h3>施設案内設定</h3>
        <div class="settings-grid">
          <div class="setting-group">
            <label>表示施設</label>
            <FacilitySelector v-model="facilitySettings.facilityTypes" />
          </div>
          <div class="setting-group">
            <label>表示形式</label>
            <select v-model="facilitySettings.displayMode">
              <option value="grid">グリッド</option>
              <option value="list">リスト</option>
              <option value="carousel">カルーセル</option>
              <option value="map">マップ</option>
            </select>
          </div>
          <div class="setting-group">
            <label>予約機能</label>
            <input type="checkbox" v-model="facilitySettings.showBooking" />
          </div>
        </div>
      </div>
    </div>
    
    <!-- プレビューエリア -->
    <div class="preview-area">
      <div class="device-preview">
        <component 
          :is="getCurrentFunctionComponent()"
          v-bind="getCurrentSettings()"
          :preview-mode="true"
        />
      </div>
    </div>
  </div>
</template>
```

### 2. データ統合API
```typescript
// 統合データ取得API
export const integratedDataAPI = {
  // 注文データ
  async getOrderData(params: OrderParams) {
    return await $fetch('/api/v1/integrated/order', { params })
  },
  
  // AIコンシェルジュデータ
  async getAIData(params: AIParams) {
    return await $fetch('/api/v1/integrated/ai-concierge', { params })
  },
  
  // 施設データ
  async getFacilityData(params: FacilityParams) {
    return await $fetch('/api/v1/integrated/facilities', { params })
  },
  
  // 統計データ
  async getStatisticsData(params: StatsParams) {
    return await $fetch('/api/v1/integrated/statistics', { params })
  },
  
  // 予約データ
  async getBookingData(params: BookingParams) {
    return await $fetch('/api/v1/integrated/bookings', { params })
  }
}
```

## スライド型表示での統合

### 1. TV表示統合例
```vue
<template>
  <div class="tv-integrated-display">
    <!-- スライド1: ウェルカム + AIコンシェルジュ -->
    <div class="slide welcome-slide">
      <div class="welcome-section">
        <h1>ようこそ</h1>
        <p>AI客室コンシェルジュがお手伝いします</p>
      </div>
      <div class="ai-section">
        <AIConciergeBlock 
          :character-id="'default'"
          :compact-mode="true"
          :auto-greeting="true"
          :tv-optimized="true"
        />
      </div>
    </div>
    
    <!-- スライド2: 館内施設案内 -->
    <div class="slide facility-slide">
      <FacilityBlock 
        :facility-types="['restaurant', 'spa', 'gym']"
        :display-mode="'carousel'"
        :show-images="true"
        :tv-optimized="true"
      />
    </div>
    
    <!-- スライド3: メニュー注文 -->
    <div class="slide order-slide">
      <OrderBlock 
        :display-mode="'featured'"
        :categories="[1, 2, 3]"
        :quick-order="true"
        :tv-optimized="true"
      />
    </div>
    
    <!-- スライド4: サービス予約 -->
    <div class="slide service-slide">
      <ServiceBlock 
        :service-types="['spa', 'restaurant', 'housekeeping']"
        :instant-booking="true"
        :tv-optimized="true"
      />
    </div>
  </div>
</template>
```

### 2. Web表示統合例
```vue
<template>
  <div class="web-integrated-display">
    <!-- セクション1: ヒーロー + AI -->
    <section class="hero-section">
      <div class="hero-content">
        <h1>AI客室コンシェルジュ</h1>
        <p>24時間いつでもお手伝いします</p>
      </div>
      <div class="ai-widget">
        <AIConciergeBlock 
          :floating-widget="true"
          :expandable="true"
          :web-optimized="true"
        />
      </div>
    </section>
    
    <!-- セクション2: 施設案内 -->
    <section class="facility-section">
      <FacilityBlock 
        :display-mode="'grid'"
        :interactive-map="true"
        :booking-integration="true"
        :web-optimized="true"
      />
    </section>
    
    <!-- セクション3: 注文システム -->
    <section class="order-section">
      <OrderBlock 
        :modal-mode="true"
        :sidebar-cart="true"
        :filter-bar="true"
        :web-optimized="true"
      />
    </section>
  </div>
</template>
```

## 実装フェーズ

### Phase 1: 基本統合（1週間）
- [ ] 注文ブロックの基本実装
- [ ] AIコンシェルジュブロックの基本実装
- [ ] 施設案内ブロックの基本実装
- [ ] 統合管理画面の基本構造

### Phase 2: 機能拡張（1週間）
- [ ] 統計表示ブロック
- [ ] 予約・サービスブロック
- [ ] デバイス別最適化
- [ ] データ統合API

### Phase 3: 高度な統合（1週間）
- [ ] クロス機能連携（注文→統計、予約→施設案内）
- [ ] リアルタイム更新
- [ ] パフォーマンス最適化
- [ ] 分析・改善機能

## 統合の利点

### 管理効率
- 一つの画面で全機能を管理
- 統一されたUI/UX
- 設定の一元化

### ユーザー体験
- 一貫したデザイン
- スムーズな機能間移動
- デバイス最適化

### 開発効率
- コードの再利用
- 統一されたAPI
- 保守性の向上

この統合により、既存の個別機能を活かしながら、より使いやすく管理しやすいシステムになります。 