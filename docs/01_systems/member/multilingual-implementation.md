---
⚠️ **このドキュメントは非推奨です（DEPRECATED）**

**最新の仕様**: このドキュメントの内容は古くなっています。  
**参照すべきドキュメント**:
- **仕様書**: [SSOT_MULTILINGUAL_SYSTEM.md](/docs/03_ssot/00_foundation/SSOT_MULTILINGUAL_SYSTEM.md)
- **実装ガイド**: [MULTILINGUAL_IMPLEMENTATION_GUIDE.md](/docs/03_ssot/00_foundation/MULTILINGUAL_IMPLEMENTATION_GUIDE.md)

**理由**: 多言語化システムはSSOT（Single Source of Truth）として統一管理されています。  
このドキュメントは履歴保存のために残されていますが、実装時は上記のSSOTドキュメントを参照してください。

**最終更新**: 2025-10-07（非推奨化）

---

# hotel-member 多言語対応実装指示書

## 📋 概要

hotel-common多言語基盤完成に伴い、hotel-memberシステムの多言語対応を実装してください。

---

## 🎯 実装対象範囲

### **✅ 最優先実装（Phase 1）**
1. **会員登録・ログイン画面**
2. **ポイント確認・履歴表示**
3. **特典・優待案内**
4. **プライバシー設定**
5. **プロフィール編集**

### **❌ 実装対象外**
- 管理者向け顧客管理画面
- マーケティング分析・レポート
- データ管理・設定画面

---

## 🔧 技術実装手順

### **Step 1: hotel-common統合**

#### **1. 依存関係追加**
```bash
cd hotel-member
npm install /Users/kaneko/hotel-common
```

#### **2. FastAPI統合設定**
```python
# hotel-member/src/i18n/setup.py
from hotel_common.i18n import RuntimeTranslationSystem, TranslationConfig

class MemberI18nManager:
    def __init__(self):
        self.i18n = RuntimeTranslationSystem(
            TranslationConfig(
                default_language='ja',
                supported_languages=['ja', 'en', 'zh-CN', 'zh-TW', 'ko']
            )
        )
    
    def translate(self, key: str, language: str = 'ja', **params) -> str:
        self.i18n.set_language(language)
        return self.i18n.t(key, params)
    
    def get_user_language(self, user_id: str) -> str:
        # データベースから取得またはブラウザ設定
        return self.get_user_preference(user_id) or 'ja'

# グローバルインスタンス
i18n_manager = MemberI18nManager()
```

#### **3. Nuxt.js フロントエンド統合**
```typescript
// hotel-member/frontend/plugins/i18n.ts
import { createI18nInstance } from 'hotel-common/i18n'

export default defineNuxtPlugin(() => {
  const i18n = createI18nInstance({
    defaultLanguage: 'ja',
    supportedLanguages: ['ja', 'en', 'zh-CN', 'zh-TW', 'ko']
  })

  return {
    provide: {
      t: i18n.t.bind(i18n),
      setLanguage: i18n.setLanguage.bind(i18n),
      getCurrentLanguage: i18n.getCurrentLanguage.bind(i18n)
    }
  }
})
```

### **Step 2: 会員登録・ログイン多言語化**

#### **フロントエンド実装**
```vue
<!-- hotel-member/frontend/pages/register.vue -->
<template>
  <div class="register-form">
    <LanguageSwitcher />
    
    <h1>{{ $t('business.guest.guest_name') }}</h1>
    
    <form @submit="handleRegister">
      <div class="form-group">
        <label>{{ $t('ui.labels.name') }}</label>
        <input 
          v-model="form.name"
          :placeholder="$t('ui.placeholders.enter_name')"
          required
        />
      </div>
      
      <div class="form-group">
        <label>{{ $t('ui.labels.email') }}</label>
        <input 
          v-model="form.email"
          :placeholder="$t('ui.placeholders.enter_email')"
          type="email"
          required
        />
      </div>
      
      <div class="form-group">
        <label>{{ $t('ui.labels.phone') }}</label>
        <input 
          v-model="form.phone"
          :placeholder="$t('ui.placeholders.enter_phone')"
          required
        />
      </div>
      
      <button type="submit">
        {{ $t('ui.buttons.confirm') }}
      </button>
    </form>
  </div>
</template>

<script setup>
const { $t, $getCurrentLanguage } = useNuxtApp()

const form = reactive({
  name: '',
  email: '',
  phone: '',
  language: $getCurrentLanguage()
})

const handleRegister = async () => {
  try {
    const response = await $fetch('/api/v1/members/register', {
      method: 'POST',
      body: {
        ...form,
        preferred_language: $getCurrentLanguage()
      }
    })
    
    // 成功メッセージ
    showNotification($t('messages.success.registration_completed'))
  } catch (error) {
    showNotification($t('messages.error.registration_failed'))
  }
}
</script>
```

#### **バックエンドAPI多言語対応**
```python
# hotel-member/src/api/v1/members.py
from fastapi import APIRouter, Depends, Request
from src.i18n.setup import i18n_manager

router = APIRouter()

@router.post("/register")
async def register_member(request: Request, member_data: MemberCreate):
    try:
        # ユーザー言語設定取得
        user_language = request.headers.get('Accept-Language', 'ja')
        
        # 会員登録処理
        new_member = await create_member(member_data)
        
        # 言語設定保存
        await save_user_language_preference(new_member.id, user_language)
        
        # 多言語応答
        return {
            "success": True,
            "message": i18n_manager.translate(
                'messages.success.registration_completed', 
                user_language
            ),
            "data": new_member
        }
        
    except Exception as e:
        return {
            "success": False,
            "message": i18n_manager.translate(
                'messages.error.registration_failed', 
                user_language
            )
        }
```

### **Step 3: ポイント・履歴画面多言語化**

#### **ポイント履歴コンポーネント**
```vue
<!-- hotel-member/frontend/components/PointHistory.vue -->
<template>
  <div class="point-history">
    <h2>{{ $t('business.service.loyalty_points') }}</h2>
    
    <div class="current-points">
      <span class="label">{{ $t('ui.labels.total') }}</span>
      <span class="amount">{{ formatPoints(currentPoints) }}</span>
    </div>
    
    <div class="history-list">
      <div 
        v-for="transaction in pointHistory" 
        :key="transaction.id"
        class="history-item"
      >
        <div class="date">{{ formatDate(transaction.date) }}</div>
        <div class="description">{{ getTransactionDescription(transaction) }}</div>
        <div class="points" :class="{ positive: transaction.points > 0 }">
          {{ formatPoints(transaction.points) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { LANGUAGE_CONFIGS } from 'hotel-common/i18n/config'

const { $t, $getCurrentLanguage } = useNuxtApp()

const formatDate = (date: string) => {
  const language = $getCurrentLanguage()
  const config = LANGUAGE_CONFIGS[language]
  return new Date(date).toLocaleDateString(language, {
    dateStyle: 'medium'
  })
}

const formatPoints = (points: number) => {
  return `${points.toLocaleString()} ${$t('business.service.points')}`
}

const getTransactionDescription = (transaction: any) => {
  const descriptionMap = {
    'checkin': $t('business.reservation.check_in_date'),
    'purchase': $t('business.service.room_service'),
    'bonus': $t('business.service.special_bonus')
  }
  
  return descriptionMap[transaction.type] || transaction.description
}
</script>
```

### **Step 4: プライバシー設定多言語化**

#### **言語設定保存**
```vue
<!-- hotel-member/frontend/pages/settings/privacy.vue -->
<template>
  <div class="privacy-settings">
    <h1>{{ $t('content.legal.privacy_policy') }}</h1>
    
    <div class="setting-group">
      <h3>{{ $t('ui.labels.language') }}</h3>
      <select v-model="userSettings.language" @change="updateLanguage">
        <option 
          v-for="lang in supportedLanguages" 
          :key="lang" 
          :value="lang"
        >
          {{ getLanguageName(lang) }}
        </option>
      </select>
    </div>
    
    <div class="setting-group">
      <h3>{{ $t('business.guest.preferences') }}</h3>
      
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          v-model="userSettings.emailNotifications"
        />
        {{ $t('ui.navigation.notifications') }}
      </label>
      
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          v-model="userSettings.smsNotifications"
        />
        {{ $t('business.guest.sms_notifications') }}
      </label>
    </div>
    
    <button @click="saveSettings">
      {{ $t('ui.buttons.save') }}
    </button>
  </div>
</template>

<script setup>
import { LANGUAGE_CONFIGS } from 'hotel-common/i18n/config'

const { $t, $setLanguage } = useNuxtApp()

const userSettings = reactive({
  language: 'ja',
  emailNotifications: true,
  smsNotifications: false
})

const updateLanguage = async (event) => {
  const newLanguage = event.target.value
  await $setLanguage(newLanguage)
  
  // サーバーに言語設定保存
  await $fetch('/api/v1/members/settings/language', {
    method: 'PUT',
    body: { language: newLanguage }
  })
}

const saveSettings = async () => {
  try {
    await $fetch('/api/v1/members/settings/privacy', {
      method: 'PUT',
      body: userSettings
    })
    
    showNotification($t('messages.success.profile_updated'))
  } catch (error) {
    showNotification($t('messages.error.update_failed'))
  }
}
</script>
```

### **Step 5: JWT統合での言語継承**

#### **認証ミドルウェア**
```python
# hotel-member/src/middleware/auth.py
from hotel_common.i18n.runtime import UserTokenWithLanguage
import jwt

async def authenticate_with_language(token: str) -> UserTokenWithLanguage:
    try:
        # JWTデコード
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        
        # 言語設定を含むトークン作成
        user_token = UserTokenWithLanguage(
            userId=decoded['userId'],
            language=decoded.get('language', 'ja'),
            tenantId=decoded.get('tenantId'),
            roles=decoded.get('roles', []),
            exp=decoded['exp'],
            iat=decoded['iat']
        )
        
        # i18nシステムに言語設定
        i18n_manager.i18n.set_language(user_token.language)
        
        return user_token
        
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## 📊 実装優先度・工数目安

| 機能 | 優先度 | 実装工数 | 備考 |
|------|--------|----------|------|
| **会員登録・ログイン** | 最高 | 2-3日 | フロント・API両方 |
| **ポイント履歴表示** | 高 | 2日 | 日付・通貨フォーマット |
| **プライバシー設定** | 高 | 1-2日 | 言語設定保存 |
| **プロフィール編集** | 中 | 1日 | 基本情報編集 |
| **JWT統合** | 中 | 1日 | 言語設定継承 |

**総工数目安: 7-9日**

---

## ✅ 実装完了チェックリスト

### **基本機能**
- [ ] hotel-common依存関係追加
- [ ] FastAPI i18n統合
- [ ] Nuxt.js フロントエンド統合
- [ ] 言語切り替えUI

### **会員機能**
- [ ] 会員登録多言語化
- [ ] ログイン画面多言語化
- [ ] ポイント履歴多言語表示
- [ ] プライバシー設定多言語化

### **統合機能**
- [ ] JWT言語設定統合
- [ ] ユーザー言語設定保存
- [ ] システム間言語継承

### **テスト**
- [ ] 5言語表示テスト
- [ ] 会員登録フローテスト
- [ ] ポイント表示テスト
- [ ] 言語設定保存テスト

---

## 🆘 サポート・質問

実装中の技術的質問：

1. **hotel-common統合**: Iza（統合管理者）
2. **FastAPI統合**: Python特有の実装方法
3. **Prisma ORM**: 多言語データ設計

**実装開始日**: 承認後即座  
**完了目標**: Phase 1機能完成

---

*作成者: Iza (統合管理者)*  
*対象システム: hotel-member*  
*実装フェーズ: Phase 2.5 多言語対応* 