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

# hotel-saas 多言語対応実装指示書

## 📋 概要

hotel-common多言語基盤が完成しました。hotel-saasシステムへの統合実装を開始してください。

---

## 🎯 実装対象範囲

### **✅ 最優先実装（Phase 1）**
1. **AIコンシェルジュ多言語対応**
2. **注文システム（ゲスト向け画面）**
3. **施設・サービス案内**
4. **FAQ・サポート機能**

### **❌ 実装対象外**
- 管理画面（売上・分析）
- 注文管理（スタッフ向け）
- システム設定

---

## 🔧 技術実装手順

### **Step 1: hotel-common統合**

#### **1. 依存関係追加**
```bash
cd hotel-saas
npm install /Users/kaneko/hotel-common
```

#### **2. 基本設定**
```typescript
// hotel-saas/src/plugins/i18n.ts
import { createI18nInstance } from 'hotel-common/i18n'

export const i18n = createI18nInstance({
  defaultLanguage: 'ja',
  supportedLanguages: ['ja', 'en', 'zh-CN', 'zh-TW', 'ko']
})

// Nuxt.js統合
export default defineNuxtPlugin(() => {
  return {
    provide: {
      t: i18n.t.bind(i18n),
      setLanguage: i18n.setLanguage.bind(i18n)
    }
  }
})
```

### **Step 2: UI翻訳実装**

#### **既存コードの置き換え**
```vue
<!-- Before: 直接日本語 -->
<template>
  <div>
    <h1>注文システム</h1>
    <button>注文する</button>
    <p>注文が完了しました</p>
  </div>
</template>

<!-- After: 翻訳キー使用 -->
<template>
  <div>
    <h1>{{ $t('business.service.room_service') }}</h1>
    <button>{{ $t('ui.buttons.reserve') }}</button>
    <p>{{ $t('messages.success.reservation_confirmed') }}</p>
  </div>
</template>
```

#### **言語切り替えコンポーネント**
```vue
<!-- hotel-saas/src/components/LanguageSwitcher.vue -->
<template>
  <div class="language-switcher">
    <button 
      v-for="lang in supportedLanguages" 
      :key="lang"
      @click="switchLanguage(lang)"
      :class="{ active: currentLanguage === lang }"
    >
      {{ getLanguageFlag(lang) }} {{ getLanguageName(lang) }}
    </button>
  </div>
</template>

<script setup>
import { LANGUAGE_CONFIGS } from 'hotel-common/i18n/config'

const { $t, $setLanguage } = useNuxtApp()

const currentLanguage = ref('ja')
const supportedLanguages = ['ja', 'en', 'zh-CN', 'zh-TW', 'ko']

const switchLanguage = async (language: string) => {
  await $setLanguage(language)
  currentLanguage.value = language
}

const getLanguageFlag = (lang: string) => {
  return LANGUAGE_CONFIGS[lang]?.flag || '🌐'
}

const getLanguageName = (lang: string) => {
  return LANGUAGE_CONFIGS[lang]?.nativeName || lang
}
</script>
```

### **Step 3: AIコンシェルジュ多言語対応**

#### **AI直接多言語応答**
```typescript
// hotel-saas/src/services/ai-concierge.ts
import { getGlobalI18nInstance } from 'hotel-common/i18n'

export class AIConciergeMulitlingual {
  private i18n = getGlobalI18nInstance()

  async generateResponse(
    userMessage: string, 
    userLanguage?: string
  ): Promise<string> {
    const language = userLanguage || this.i18n.getCurrentLanguage()
    
    // 静的応答（FAQ等）
    const staticResponse = this.getStaticResponse(userMessage, language)
    if (staticResponse) {
      return staticResponse
    }

    // AI動的生成
    return await this.generateAIResponse(userMessage, language)
  }

  private getStaticResponse(message: string, language: string): string | null {
    // よくある質問は静的翻訳で即座に回答
    const faqMap = {
      'wifi': this.i18n.t('content.help.wifi_connection'),
      'room service': this.i18n.t('content.help.room_service'),
      'checkout': this.i18n.t('content.help.how_to_checkout')
    }

    for (const [keyword, response] of Object.entries(faqMap)) {
      if (message.toLowerCase().includes(keyword)) {
        return response
      }
    }

    return null
  }

  private async generateAIResponse(message: string, language: string): Promise<string> {
    const systemPrompt = this.getSystemPrompt(language)
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7
    })

    return response.choices[0]?.message?.content || this.i18n.t('messages.error.server_error')
  }

  private getSystemPrompt(language: string): string {
    const prompts = {
      'ja': 'あなたは日本のホテルのコンシェルジュです。丁寧で親切な日本語で応答してください。',
      'en': 'You are a hotel concierge in Japan. Respond in polite and helpful English.',
      'zh-CN': '您是日本酒店的礼宾员。请用礼貌和有用的简体中文回答。',
      'zh-TW': '您是日本酒店的禮賓員。請用禮貌和有用的繁體中文回答。',
      'ko': '당신은 일본 호텔의 컨시어지입니다. 정중하고 도움이 되는 한국어로 응답해 주세요.'
    }

    return prompts[language] || prompts['ja']
  }
}
```

### **Step 4: JWT統合での言語継承**

#### **認証時言語設定保存**
```typescript
// hotel-saas/src/middleware/auth.ts
import { createTokenWithLanguage } from 'hotel-common/i18n/runtime'

export const authMiddleware = defineNuxtRouteMiddleware((to) => {
  const token = useCookie('auth-token')
  
  if (token.value) {
    // トークンから言語設定を復元
    const decoded = jwt.decode(token.value) as any
    if (decoded?.language) {
      const { $setLanguage } = useNuxtApp()
      $setLanguage(decoded.language)
    }
  }
})

// ログイン時に言語設定をトークンに含める
export const loginWithLanguage = async (credentials: any) => {
  const { $getCurrentLanguage } = useNuxtApp()
  const currentLanguage = $getCurrentLanguage()

  const baseToken = await authenticateUser(credentials)
  const tokenWithLanguage = createTokenWithLanguage(baseToken, currentLanguage)
  
  const jwt = generateJWT(tokenWithLanguage)
  const authCookie = useCookie('auth-token')
  authCookie.value = jwt
}
```

---

## 📊 実装優先度・工数目安

| 機能 | 優先度 | 実装工数 | 備考 |
|------|--------|----------|------|
| **基本UI翻訳** | 最高 | 2-3日 | 注文画面・案内画面 |
| **言語切り替え** | 最高 | 1日 | 右上フラグボタン |
| **AIコンシェルジュ** | 高 | 3-4日 | 静的+AI動的対応 |
| **FAQ翻訳** | 中 | 1-2日 | 施設案内・サービス説明 |
| **JWT統合** | 中 | 1日 | 言語設定の自動継承 |

**総工数目安: 8-11日**

---

## ✅ 実装完了チェックリスト

### **基本機能**
- [ ] hotel-common依存関係追加
- [ ] i18nプラグイン設定
- [ ] 言語切り替えUI実装
- [ ] 既存日本語→翻訳キー置き換え

### **AIコンシェルジュ**
- [ ] 静的FAQ応答多言語対応
- [ ] AI動的応答多言語プロンプト
- [ ] 言語検出・切り替え機能

### **統合機能**
- [ ] JWT言語設定統合
- [ ] システム間言語継承
- [ ] エラーハンドリング多言語化

### **テスト**
- [ ] 5言語表示テスト
- [ ] 言語切り替えテスト
- [ ] AIコンシェルジュ応答テスト
- [ ] パフォーマンステスト（0.05秒以内）

---

## 🆘 サポート・質問

実装中に技術的な質問や統合に関する問題が発生した場合：

1. **hotel-common関連**: Iza（統合管理者）にエスカレーション
2. **AI実装関連**: 既存AIコンシェルジュとの統合方法
3. **Nuxt.js統合**: フレームワーク固有の実装

**実装開始日**: 承認後即座  
**完了目標**: Phase 1機能完成

---

*作成者: Iza (統合管理者)*  
*対象システム: hotel-saas*  
*実装フェーズ: Phase 2.5 多言語対応* 