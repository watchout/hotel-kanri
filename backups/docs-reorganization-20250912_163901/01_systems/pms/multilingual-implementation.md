# hotel-pms 多言語対応実装指示書

## 📋 概要

hotel-common多言語基盤完成に伴い、hotel-pmsシステムの多言語対応を実装してください。

---

## 🎯 実装対象範囲

### **✅ 最優先実装（Phase 1）**
1. **チェックイン端末UI** (100%完全翻訳)
2. **フロントUI（ゲスト対面部分）**
3. **緊急時表示・避難誘導**
4. **基本施設案内**
5. **Walk-in客対応画面**

### **❌ 実装対象外**
- 管理画面（売上・予算管理）
- VIP管理・顧客履歴詳細
- 勤怠管理画面
- マーケティング分析
- リネン画面詳細（基本指示のみ翻訳）

---

## 🔧 技術実装手順

### **Step 1: hotel-common統合**

#### **1. 依存関係追加**
```bash
cd hotel-pms
npm install ../hotel-common
```

#### **2. Vue 3統合設定**
```typescript
// hotel-pms/src/plugins/i18n.ts
import { createI18nInstance } from 'hotel-common/i18n'
import { createApp } from 'vue'

export const i18n = createI18nInstance({
  defaultLanguage: 'ja',
  supportedLanguages: ['ja', 'en', 'zh-CN', 'zh-TW', 'ko']
})

// Vue 3アプリケーション統合
export function setupI18n(app: any) {
  app.config.globalProperties.$t = i18n.t.bind(i18n)
  app.config.globalProperties.$setLanguage = i18n.setLanguage.bind(i18n)
  app.config.globalProperties.$getCurrentLanguage = i18n.getCurrentLanguage.bind(i18n)
  
  return app
}

// Pinia統合
export const useI18nStore = defineStore('i18n', () => {
  const currentLanguage = ref('ja')
  
  const setLanguage = async (language: string) => {
    await i18n.setLanguage(language)
    currentLanguage.value = language
  }
  
  const t = (key: string, params?: any) => {
    return i18n.t(key, params)
  }
  
  return { currentLanguage, setLanguage, t }
})
```

### **Step 2: チェックイン端末UI多言語化**

#### **セルフチェックイン画面**
```vue
<!-- hotel-pms/src/components/SelfCheckinTerminal.vue -->
<template>
  <div class="checkin-terminal">
    <!-- 言語選択（最初に表示） -->
    <div v-if="step === 'language'" class="language-selection">
      <h1 class="welcome-title">
        <div>Welcome / ようこそ</div>
        <div>欢迎 / 歡迎 / 환영합니다</div>
      </h1>
      
      <div class="language-buttons">
        <button 
          v-for="lang in supportedLanguages"
          :key="lang"
          @click="selectLanguage(lang)"
          class="language-btn"
        >
          <div class="flag">{{ getLanguageFlag(lang) }}</div>
          <div class="name">{{ getLanguageName(lang) }}</div>
        </button>
      </div>
    </div>
    
    <!-- チェックイン手続き画面 -->
    <div v-else-if="step === 'checkin'" class="checkin-process">
      <h1>{{ $t('ui.titles.checkin_process') }}</h1>
      
      <div class="step-indicator">
        <div class="step" :class="{ active: currentStep >= 1 }">
          {{ $t('ui.labels.reservation') }}
        </div>
        <div class="step" :class="{ active: currentStep >= 2 }">
          {{ $t('business.guest.identification') }}
        </div>
        <div class="step" :class="{ active: currentStep >= 3 }">
          {{ $t('ui.titles.confirmation') }}
        </div>
      </div>
      
      <!-- Step 1: 予約確認 -->
      <div v-if="currentStep === 1" class="reservation-lookup">
        <h2>{{ $t('content.instructions.enter_reservation_number') }}</h2>
        
        <div class="input-methods">
          <button @click="inputMethod = 'qr'" class="method-btn">
            <div class="icon">📱</div>
            <div class="label">{{ $t('content.instructions.scan_qr_code') }}</div>
          </button>
          
          <button @click="inputMethod = 'manual'" class="method-btn">
            <div class="icon">⌨️</div>
            <div class="label">{{ $t('ui.labels.manual_input') }}</div>
          </button>
        </div>
        
        <div v-if="inputMethod === 'manual'" class="manual-input">
          <input 
            v-model="reservationNumber"
            :placeholder="$t('ui.placeholders.search_reservation')"
            class="reservation-input"
          />
          <button @click="lookupReservation" class="lookup-btn">
            {{ $t('ui.buttons.search') }}
          </button>
        </div>
      </div>
      
      <!-- Step 2: 身分証確認 -->
      <div v-if="currentStep === 2" class="id-verification">
        <h2>{{ $t('content.instructions.verify_identification') }}</h2>
        <div class="id-scanner">
          <!-- ID scan interface -->
          <div class="scan-area">
            <div class="scan-instruction">
              {{ $t('content.instructions.place_id_on_scanner') }}
            </div>
          </div>
        </div>
      </div>
      
      <!-- Step 3: 確認画面 -->
      <div v-if="currentStep === 3" class="confirmation">
        <h2>{{ $t('content.instructions.confirm_guest_details') }}</h2>
        
        <div class="guest-details">
          <div class="detail-row">
            <span class="label">{{ $t('business.guest.guest_name') }}:</span>
            <span class="value">{{ guestInfo.name }}</span>
          </div>
          <div class="detail-row">
            <span class="label">{{ $t('business.reservation.room_type') }}:</span>
            <span class="value">{{ $t(`rooms.${guestInfo.roomType}`) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">{{ $t('business.reservation.check_in_date') }}:</span>
            <span class="value">{{ formatDate(guestInfo.checkinDate) }}</span>
          </div>
        </div>
        
        <button @click="completeCheckin" class="complete-btn">
          {{ $t('ui.buttons.checkin') }}
        </button>
      </div>
    </div>
    
    <!-- 完了画面 -->
    <div v-else-if="step === 'completed'" class="completion">
      <div class="success-icon">✅</div>
      <h1>{{ $t('messages.success.checkin_completed') }}</h1>
      
      <div class="room-info">
        <h2>{{ $t('ui.labels.room') }}: {{ assignedRoom }}</h2>
        <div class="key-info">
          {{ $t('content.instructions.room_key_issued') }}
        </div>
      </div>
      
      <div class="amenities-info">
        <h3>{{ $t('content.descriptions.room_amenities') }}</h3>
        <ul>
          <li>{{ $t('amenities.wifi') }}: Hotel_Guest</li>
          <li>{{ $t('amenities.breakfast') }}: 7:00-10:00</li>
          <li>{{ $t('amenities.checkin_time') }}: 24:00</li>
        </ul>
      </div>
      
      <button @click="startNew" class="new-checkin-btn">
        {{ $t('ui.buttons.new_checkin') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { LANGUAGE_CONFIGS } from 'hotel-common/i18n/config'
import { useI18nStore } from '../plugins/i18n'

const i18nStore = useI18nStore()
const { t: $t, setLanguage: $setLanguage } = i18nStore

const step = ref('language')
const currentStep = ref(1)
const inputMethod = ref('')
const reservationNumber = ref('')
const guestInfo = ref({})
const assignedRoom = ref('')

const supportedLanguages = ['ja', 'en', 'zh-CN', 'zh-TW', 'ko']

const selectLanguage = async (language: string) => {
  await $setLanguage(language)
  step.value = 'checkin'
}

const getLanguageFlag = (lang: string) => {
  return LANGUAGE_CONFIGS[lang]?.flag || '🌐'
}

const getLanguageName = (lang: string) => {
  return LANGUAGE_CONFIGS[lang]?.nativeName || lang
}

const formatDate = (date: string) => {
  const currentLang = i18nStore.currentLanguage
  return new Date(date).toLocaleDateString(currentLang, {
    dateStyle: 'full'
  })
}

const lookupReservation = async () => {
  try {
    const response = await fetch(`/api/reservations/${reservationNumber.value}`)
    guestInfo.value = await response.json()
    currentStep.value = 2
  } catch (error) {
    // エラーハンドリング
    alert($t('messages.error.reservation_not_found'))
  }
}

const completeCheckin = async () => {
  try {
    const response = await fetch('/api/checkin/complete', {
      method: 'POST',
      body: JSON.stringify({
        reservationNumber: reservationNumber.value,
        language: i18nStore.currentLanguage
      })
    })
    
    const result = await response.json()
    assignedRoom.value = result.roomNumber
    step.value = 'completed'
    
  } catch (error) {
    alert($t('messages.error.checkin_failed'))
  }
}

const startNew = () => {
  // 新しいチェックイン開始
  step.value = 'language'
  currentStep.value = 1
  reservationNumber.value = ''
  guestInfo.value = {}
}
</script>

<style scoped>
.checkin-terminal {
  /* 44px以上のタッチボタン */
  --min-touch-size: 44px;
}

.language-btn {
  min-width: var(--min-touch-size);
  min-height: var(--min-touch-size);
  margin: 8px;
  padding: 12px 24px;
  font-size: 18px;
}

.method-btn, .lookup-btn, .complete-btn {
  min-height: var(--min-touch-size);
  font-size: 16px;
  padding: 12px 24px;
}
</style>
```

### **Step 3: 緊急時表示多言語化**

#### **緊急時案内システム**
```vue
<!-- hotel-pms/src/components/EmergencyDisplay.vue -->
<template>
  <div class="emergency-display" :class="{ active: emergencyActive }">
    <div class="emergency-header">
      <div class="alert-icon">🚨</div>
      <h1 class="emergency-title">
        {{ $t('emergency.alert_title') }}
      </h1>
    </div>
    
    <div class="emergency-content">
      <div class="instruction-block" v-for="instruction in emergencyInstructions" :key="instruction.id">
        <div class="step-number">{{ instruction.step }}</div>
        <div class="instruction-text">{{ $t(instruction.textKey) }}</div>
        <div class="instruction-icon">{{ instruction.icon }}</div>
      </div>
    </div>
    
    <div class="emergency-contacts">
      <h2>{{ $t('emergency.contact_information') }}</h2>
      <div class="contact-list">
        <div class="contact-item">
          <span class="label">{{ $t('emergency.front_desk') }}:</span>
          <span class="number">内線 0</span>
        </div>
        <div class="contact-item">
          <span class="label">{{ $t('emergency.fire_department') }}:</span>
          <span class="number">119</span>
        </div>
        <div class="contact-item">
          <span class="label">{{ $t('emergency.police') }}:</span>
          <span class="number">110</span>
        </div>
      </div>
    </div>
    
    <!-- 全言語同時表示 -->
    <div class="multilingual-display">
      <div v-for="lang in emergencyLanguages" :key="lang" class="lang-block">
        <div class="lang-title">{{ getLanguageFlag(lang) }}</div>
        <div class="evacuation-text">
          {{ getEmergencyText(lang) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { LANGUAGE_CONFIGS } from 'hotel-common/i18n/config'

const emergencyActive = ref(false)
const emergencyLanguages = ['ja', 'en', 'zh-CN', 'ko']

const emergencyInstructions = [
  { step: 1, textKey: 'emergency.stay_calm', icon: '🧘' },
  { step: 2, textKey: 'emergency.follow_staff', icon: '👥' },
  { step: 3, textKey: 'emergency.use_stairs', icon: '🚶' },
  { step: 4, textKey: 'emergency.gather_point', icon: '🏢' }
]

const getEmergencyText = (language: string) => {
  const emergencyTexts = {
    'ja': '非常時です。慌てずにスタッフの指示に従って避難してください。',
    'en': 'Emergency. Stay calm and follow staff instructions for evacuation.',
    'zh-CN': '紧急情况。请保持冷静，按照工作人员指示撤离。',
    'ko': '비상사태입니다. 침착하게 직원의 지시에 따라 대피하세요.'
  }
  return emergencyTexts[language] || emergencyTexts['ja']
}

// 緊急時自動言語切り替え
const activateEmergency = () => {
  emergencyActive.value = true
  
  // 全言語で同時案内
  announceInAllLanguages()
}

const announceInAllLanguages = () => {
  emergencyLanguages.forEach((lang, index) => {
    setTimeout(() => {
      playEmergencyAnnouncement(lang)
    }, index * 5000) // 5秒間隔で各言語アナウンス
  })
}
</script>
```

### **Step 4: フロントUI多言語化**

#### **フロントデスク画面**
```vue
<!-- hotel-pms/src/views/FrontDesk.vue -->
<template>
  <div class="front-desk">
    <header class="desk-header">
      <div class="logo">{{ $t('business.hotel.front_desk') }}</div>
      <LanguageSwitcher />
      <div class="current-time">{{ currentTime }}</div>
    </header>
    
    <div class="desk-layout">
      <!-- 左側: 本日のチェックイン -->
      <section class="today-checkins">
        <h2>{{ $t('business.reservation.todays_checkins') }}</h2>
        <div class="checkin-list">
          <div 
            v-for="guest in todaysCheckins" 
            :key="guest.id"
            class="guest-card"
            @click="selectGuest(guest)"
          >
            <div class="guest-name">{{ guest.name }}</div>
            <div class="room-info">
              {{ $t('ui.labels.room') }} {{ guest.roomNumber }}
            </div>
            <div class="checkin-time">
              {{ formatTime(guest.expectedCheckin) }}
            </div>
            <div class="status" :class="guest.status">
              {{ $t(`status.${guest.status}`) }}
            </div>
          </div>
        </div>
      </section>
      
      <!-- 中央: 選択中ゲスト情報 -->
      <section class="guest-details" v-if="selectedGuest">
        <h2>{{ $t('business.guest.guest_information') }}</h2>
        
        <div class="guest-info">
          <div class="info-row">
            <span class="label">{{ $t('business.guest.guest_name') }}:</span>
            <span class="value">{{ selectedGuest.name }}</span>
          </div>
          <div class="info-row">
            <span class="label">{{ $t('business.guest.contact_information') }}:</span>
            <span class="value">{{ selectedGuest.phone }}</span>
          </div>
          <div class="info-row">
            <span class="label">{{ $t('business.guest.loyalty_member') }}:</span>
            <span class="value">
              {{ selectedGuest.loyaltyLevel ? $t(`loyalty.${selectedGuest.loyaltyLevel}`) : $t('ui.labels.none') }}
            </span>
          </div>
          <div class="info-row">
            <span class="label">{{ $t('business.guest.preferences') }}:</span>
            <span class="value">{{ getGuestPreferences(selectedGuest) }}</span>
          </div>
        </div>
        
        <div class="action-buttons">
          <button @click="startCheckin" class="action-btn primary">
            {{ $t('ui.buttons.checkin') }}
          </button>
          <button @click="viewDetails" class="action-btn secondary">
            {{ $t('ui.buttons.view_details') }}
          </button>
          <button @click="contactGuest" class="action-btn secondary">
            {{ $t('ui.buttons.contact') }}
          </button>
        </div>
      </section>
      
      <!-- 右側: Walk-in客対応 -->
      <section class="walkin-guest">
        <h2>{{ $t('business.reservation.walk_in_guest') }}</h2>
        
        <div class="walkin-form">
          <div class="form-group">
            <label>{{ $t('business.guest.guest_name') }}</label>
            <input v-model="walkinGuest.name" :placeholder="$t('ui.placeholders.enter_name')" />
          </div>
          
          <div class="form-group">
            <label>{{ $t('business.guest.contact_information') }}</label>
            <input v-model="walkinGuest.phone" :placeholder="$t('ui.placeholders.enter_phone')" />
          </div>
          
          <div class="form-group">
            <label>{{ $t('business.reservation.room_type') }}</label>
            <select v-model="walkinGuest.roomType">
              <option value="">{{ $t('ui.placeholders.select_room') }}</option>
              <option v-for="room in availableRooms" :key="room.type" :value="room.type">
                {{ $t(`rooms.${room.type}`) }} - {{ formatPrice(room.price) }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>{{ $t('business.reservation.check_out_date') }}</label>
            <input type="date" v-model="walkinGuest.checkoutDate" />
          </div>
          
          <button @click="createWalkinReservation" class="create-btn">
            {{ $t('ui.buttons.create_reservation') }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { useI18nStore } from '../plugins/i18n'
import { LANGUAGE_CONFIGS } from 'hotel-common/i18n/config'

const i18nStore = useI18nStore()
const { t: $t } = i18nStore

const selectedGuest = ref(null)
const walkinGuest = reactive({
  name: '',
  phone: '',
  roomType: '',
  checkoutDate: ''
})

const formatTime = (time: string) => {
  const currentLang = i18nStore.currentLanguage
  return new Date(time).toLocaleTimeString(currentLang, {
    timeStyle: 'short'
  })
}

const formatPrice = (price: number) => {
  const currentLang = i18nStore.currentLanguage
  const config = LANGUAGE_CONFIGS[currentLang]
  return config.currencyFormat.replace('{amount}', price.toLocaleString())
}

const getGuestPreferences = (guest: any) => {
  const preferences = []
  if (guest.nonSmoking) preferences.push($t('preferences.non_smoking'))
  if (guest.highFloor) preferences.push($t('preferences.high_floor'))
  if (guest.quietRoom) preferences.push($t('preferences.quiet_room'))
  
  return preferences.length > 0 ? preferences.join(', ') : $t('ui.labels.none')
}

const startCheckin = async () => {
  try {
    // チェックイン処理
    const response = await fetch(`/api/checkin/start/${selectedGuest.value.id}`, {
      method: 'POST',
      headers: {
        'Accept-Language': i18nStore.currentLanguage
      }
    })
    
    const result = await response.json()
    
    showNotification($t('messages.success.checkin_started'))
  } catch (error) {
    showNotification($t('messages.error.checkin_failed'))
  }
}

const createWalkinReservation = async () => {
  try {
    const response = await fetch('/api/reservations/walkin', {
      method: 'POST',
      body: JSON.stringify({
        ...walkinGuest,
        language: i18nStore.currentLanguage
      }),
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': i18nStore.currentLanguage
      }
    })
    
    const result = await response.json()
    
    showNotification($t('messages.success.reservation_created'))
    
    // フォームリセット
    Object.keys(walkinGuest).forEach(key => {
      walkinGuest[key] = ''
    })
    
  } catch (error) {
    showNotification($t('messages.error.reservation_failed'))
  }
}
</script>
```

---

## 📊 実装優先度・工数目安

| 機能 | 優先度 | 実装工数 | 備考 |
|------|--------|----------|------|
| **チェックイン端末** | 最高 | 4-5日 | 44px以上ボタン・多言語UI |
| **緊急時表示** | 最高 | 1-2日 | 安全優先・全言語同時表示 |
| **フロントUI** | 高 | 3-4日 | ゲスト対面部分のみ |
| **Walk-in対応** | 高 | 2-3日 | hotel-member連携調整 |
| **JWT統合** | 中 | 1日 | 言語設定継承 |

**総工数目安: 11-15日**

---

## ✅ 実装完了チェックリスト

### **基本機能**
- [ ] hotel-common依存関係追加
- [ ] Vue 3 i18n統合
- [ ] Pinia状態管理統合
- [ ] 言語切り替えUI（44px以上）

### **チェックイン端末**
- [ ] 5言語選択画面
- [ ] QRスキャン多言語対応
- [ ] 身分証認証多言語表示
- [ ] 完了画面多言語化

### **緊急時システム**
- [ ] 緊急時多言語表示
- [ ] 避難誘導多言語音声
- [ ] 連絡先多言語表示

### **フロント業務**
- [ ] ゲスト情報多言語表示
- [ ] Walk-in客対応多言語化
- [ ] 予約作成多言語化

### **統合機能**
- [ ] JWT言語設定統合
- [ ] hotel-member連携調整
- [ ] システム間言語継承

### **テスト**
- [ ] 5言語表示テスト
- [ ] チェックイン端末フローテスト
- [ ] 緊急時表示テスト
- [ ] フロント業務テスト
- [ ] タッチパネル操作性テスト

---

## 🆘 サポート・質問

実装中の技術的質問：

1. **hotel-common統合**: Iza（統合管理者）
2. **Vue 3統合**: フレームワーク固有実装
3. **hotel-member連携**: Walk-in客の会員システム統合
4. **緊急時システム**: 安全要件・法的要求

**実装開始日**: 承認後即座  
**完了目標**: Phase 1機能完成

---

*作成者: Iza (統合管理者)*  
*対象システム: hotel-pms*  
*実装フェーズ: Phase 2.5 多言語対応* 