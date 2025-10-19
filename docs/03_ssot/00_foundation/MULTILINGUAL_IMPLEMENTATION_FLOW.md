# 多言語化システム 実装フロー

**作成日**: 2025-10-07  
**バージョン**: 1.0.0  
**対象**: 開発者（Sun, Luna, Suno, Iza）  
**前提知識**: [SSOT_MULTILINGUAL_SYSTEM.md](./SSOT_MULTILINGUAL_SYSTEM.md)を必ず先に読むこと

**関連ドキュメント**:
- [SSOT_MULTILINGUAL_SYSTEM.md](./SSOT_MULTILINGUAL_SYSTEM.md) - 多言語化システム仕様（必読）
- [MULTILINGUAL_IMPLEMENTATION_GUIDE.md](./MULTILINGUAL_IMPLEMENTATION_GUIDE.md) - 実装ガイド

---

## 📋 目次

1. [実装フロー全体像](#実装フロー全体像)
2. [Phase 1: 翻訳テーブル作成](#phase-1-翻訳テーブル作成)
3. [Phase 2: 既存データ移行](#phase-2-既存データ移行)
4. [Phase 3: 翻訳エンジン実装](#phase-3-翻訳エンジン実装)
5. [Phase 4: API実装](#phase-4-api実装)
6. [Phase 5: フロントエンド実装](#phase-5-フロントエンド実装)
7. [Phase 6: 15言語拡張](#phase-6-15言語拡張)
8. [Phase 7: 既存カラム削除](#phase-7-既存カラム削除)
9. [各担当者の作業内容](#各担当者の作業内容)

---

## 🎯 実装フロー全体像

```
Phase 1: 翻訳テーブル作成（1週間）
  ↓
Phase 2: 既存データ移行（1週間）
  ↓
Phase 3: 翻訳エンジン実装（2週間）
  ↓
Phase 4: API実装（2週間）
  ↓
Phase 5: フロントエンド実装（3週間）
  ↓
Phase 6: 15言語拡張（2-3週間）
  ↓
Phase 7: 既存カラム削除（3-6ヶ月後）
```

**総期間**: 約10-12週間（既存カラム削除を除く）

---

## 📅 Phase 1: 翻訳テーブル作成（1週間）

### 🎯 目的
多言語化の基盤となるデータベーステーブルを作成

### 👤 担当者
**Iza（統合管理者）** - hotel-common担当

### ✅ 作業内容

#### 1. Prismaスキーマ更新

```prisma
// hotel-common/prisma/schema.prisma

model Translation {
  id               String   @id @default(uuid())
  tenantId         String   @map("tenant_id")
  entityType       String   @map("entity_type")
  entityId         String   @map("entity_id")
  languageCode     String   @map("language_code")
  fieldName        String   @map("field_name")
  translatedText   String   @map("translated_text") @db.Text
  translationMethod String  @map("translation_method")
  qualityScore     Float?   @map("quality_score")
  reviewStatus     String   @default("pending") @map("review_status")
  reviewedBy       String?  @map("reviewed_by")
  reviewedAt       DateTime? @map("reviewed_at")
  translationCost  Float?   @map("translation_cost")
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, entityType, entityId, languageCode, fieldName])
  @@index([tenantId, entityType, entityId])
  @@index([tenantId, languageCode])
  @@index([entityType, entityId])
  @@map("translations")
}

model TranslationJob {
  id              String   @id @default(uuid())
  tenantId        String   @map("tenant_id")
  entityType      String   @map("entity_type")
  entityId        String   @map("entity_id")
  sourceLanguage  String   @map("source_language")
  targetLanguages String[] @map("target_languages")
  sourceTexts     Json     @map("source_texts")
  status          String   @default("pending")
  totalTasks      Int      @default(0) @map("total_tasks")
  completedTasks  Int      @default(0) @map("completed_tasks")
  failedTasks     Int      @default(0) @map("failed_tasks")
  totalCost       Float    @default(0) @map("total_cost")
  errorDetails    Json?    @map("error_details")
  startedAt       DateTime? @map("started_at")
  completedAt     DateTime? @map("completed_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId, status])
  @@index([entityType, entityId])
  @@map("translation_jobs")
}

model TranslationHistory {
  id              String   @id @default(uuid())
  translationId   String   @map("translation_id")
  previousText    String   @map("previous_text") @db.Text
  newText         String   @map("new_text") @db.Text
  changedBy       String   @map("changed_by")
  changeReason    String?  @map("change_reason")
  createdAt       DateTime @default(now()) @map("created_at")
  
  translation Translation @relation(fields: [translationId], references: [id], onDelete: Cascade)
  
  @@index([translationId])
  @@index([createdAt])
  @@map("translation_history")
}
```

#### 2. マイグレーション実行

```bash
cd hotel-common
npx prisma migrate dev --name add_multilingual_tables
npx prisma generate
```

#### 3. 動作確認

```typescript
// hotel-common/scripts/test-translation-tables.ts
import { prisma } from '../src/lib/prisma'

async function testTables() {
  // テストデータ挿入
  const translation = await prisma.translation.create({
    data: {
      tenantId: 'test-tenant',
      entityType: 'menu_item',
      entityId: '123',
      languageCode: 'ja',
      fieldName: 'name',
      translatedText: 'テスト商品',
      translationMethod: 'manual'
    }
  })
  
  console.log('✅ Translation created:', translation)
  
  // テストデータ削除
  await prisma.translation.delete({ where: { id: translation.id } })
  console.log('✅ Test completed successfully')
}

testTables()
```

### ✅ 完了条件
- [ ] Prismaスキーマ更新完了
- [ ] マイグレーション実行成功
- [ ] テストデータの挿入・削除が正常動作
- [ ] 複合ユニーク制約が機能している

---

## 📅 Phase 2: 既存データ移行（1週間）

### 🎯 目的
既存の`name_ja`, `name_en`等のカラムから翻訳テーブルへデータを移行

### 👤 担当者
**Iza（統合管理者）** - hotel-common担当

### ✅ 作業内容

#### 1. 移行スクリプト作成

```typescript
// hotel-common/scripts/migrate-existing-translations.ts
import { prisma } from '../src/lib/prisma'

async function migrateExistingTranslations() {
  console.log('🚀 Starting translation migration...')
  
  // 1. menu_items の name_ja, name_en を移行
  console.log('📦 Migrating menu_items...')
  const menuItems = await prisma.menuItem.findMany({
    where: {
      OR: [
        { nameJa: { not: null } },
        { nameEn: { not: null } },
        { descriptionJa: { not: null } },
        { descriptionEn: { not: null } }
      ]
    }
  })
  
  for (const item of menuItems) {
    // 日本語 name
    if (item.nameJa) {
      await prisma.translation.upsert({
        where: {
          tenantId_entityType_entityId_languageCode_fieldName: {
            tenantId: item.tenantId,
            entityType: 'menu_item',
            entityId: String(item.id),
            languageCode: 'ja',
            fieldName: 'name'
          }
        },
        create: {
          tenantId: item.tenantId,
          entityType: 'menu_item',
          entityId: String(item.id),
          languageCode: 'ja',
          fieldName: 'name',
          translatedText: item.nameJa,
          translationMethod: 'manual'
        },
        update: {
          translatedText: item.nameJa
        }
      })
    }
    
    // 英語 name
    if (item.nameEn) {
      await prisma.translation.upsert({
        where: {
          tenantId_entityType_entityId_languageCode_fieldName: {
            tenantId: item.tenantId,
            entityType: 'menu_item',
            entityId: String(item.id),
            languageCode: 'en',
            fieldName: 'name'
          }
        },
        create: {
          tenantId: item.tenantId,
          entityType: 'menu_item',
          entityId: String(item.id),
          languageCode: 'en',
          fieldName: 'name',
          translatedText: item.nameEn,
          translationMethod: 'manual'
        },
        update: {
          translatedText: item.nameEn
        }
      })
    }
    
    // description も同様に処理
    // ...
  }
  
  console.log(`✅ Migrated ${menuItems.length} menu items`)
  
  // 2. menu_categories を移行
  console.log('📦 Migrating menu_categories...')
  // 同様の処理
  
  // 3. room_grades を移行
  console.log('📦 Migrating room_grades...')
  // 同様の処理
  
  console.log('🎉 Migration completed successfully!')
}

migrateExistingTranslations()
```

#### 2. 移行実行

```bash
cd hotel-common
npm run migrate:translations
```

#### 3. データ検証

```typescript
// hotel-common/scripts/verify-migration.ts
import { prisma } from '../src/lib/prisma'

async function verifyMigration() {
  // menu_items の件数確認
  const menuItemsCount = await prisma.menuItem.count({
    where: {
      OR: [
        { nameJa: { not: null } },
        { nameEn: { not: null } }
      ]
    }
  })
  
  const translationsCount = await prisma.translation.count({
    where: {
      entityType: 'menu_item',
      fieldName: 'name'
    }
  })
  
  console.log(`Menu items with translations: ${menuItemsCount}`)
  console.log(`Translation records: ${translationsCount}`)
  
  if (translationsCount >= menuItemsCount) {
    console.log('✅ Migration verified successfully')
  } else {
    console.error('❌ Migration incomplete!')
  }
}

verifyMigration()
```

### ✅ 完了条件
- [ ] 移行スクリプト作成完了
- [ ] 全データの移行完了
- [ ] データ検証スクリプト実行成功
- [ ] 既存データと翻訳テーブルのデータが一致

---

## 📅 Phase 3: 翻訳エンジン実装（2週間）

### 🎯 目的
Google Cloud Translation APIを使用した翻訳エンジンを実装

### 👤 担当者
**Iza（統合管理者）** - hotel-common担当

### ✅ 作業内容

#### 1. TranslationEngineクラス実装

```typescript
// hotel-common/src/services/i18n/translation-engine.ts
import { TranslationServiceClient } from '@google-cloud/translate'
import { prisma } from '../../lib/prisma'
import { redis } from '../../lib/redis'

export class TranslationEngine {
  private client: TranslationServiceClient
  private projectId: string
  
  constructor() {
    this.client = new TranslationServiceClient()
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID!
  }
  
  /**
   * エンティティ全体を翻訳（バックグラウンドジョブ作成）
   */
  async translateEntity(
    entityType: string,
    entityId: string,
    sourceLanguage: string,
    sourceTexts: Record<string, string>,
    targetLanguages: string[]
  ): Promise<string> {
    const tenantId = await this.getTenantIdFromEntity(entityType, entityId)
    
    // 翻訳ジョブを作成
    const job = await prisma.translationJob.create({
      data: {
        tenantId,
        entityType,
        entityId,
        sourceLanguage,
        targetLanguages,
        sourceTexts,
        status: 'pending',
        totalTasks: targetLanguages.length * Object.keys(sourceTexts).length
      }
    })
    
    // バックグラウンドで翻訳を実行
    this.processTranslationJob(job.id).catch(console.error)
    
    return job.id
  }
  
  /**
   * 翻訳ジョブを処理
   */
  private async processTranslationJob(jobId: string) {
    const job = await prisma.translationJob.findUnique({
      where: { id: jobId }
    })
    
    if (!job) return
    
    await prisma.translationJob.update({
      where: { id: jobId },
      data: { status: 'processing', startedAt: new Date() }
    })
    
    let completedTasks = 0
    let failedTasks = 0
    let totalCost = 0
    
    const sourceTexts = job.sourceTexts as Record<string, string>
    
    for (const targetLang of job.targetLanguages) {
      for (const [fieldName, sourceText] of Object.entries(sourceTexts)) {
        try {
          // Google Translate API で翻訳
          const [response] = await this.client.translateText({
            parent: `projects/${this.projectId}/locations/global`,
            contents: [sourceText],
            mimeType: 'text/plain',
            sourceLanguageCode: job.sourceLanguage,
            targetLanguageCode: targetLang
          })
          
          const translatedText = response.translations?.[0]?.translatedText
          
          if (translatedText) {
            // 翻訳結果を保存
            await prisma.translation.upsert({
              where: {
                tenantId_entityType_entityId_languageCode_fieldName: {
                  tenantId: job.tenantId,
                  entityType: job.entityType,
                  entityId: job.entityId,
                  languageCode: targetLang,
                  fieldName
                }
              },
              create: {
                tenantId: job.tenantId,
                entityType: job.entityType,
                entityId: job.entityId,
                languageCode: targetLang,
                fieldName,
                translatedText,
                translationMethod: 'google_translate',
                qualityScore: 0.8
              },
              update: {
                translatedText,
                translationMethod: 'google_translate',
                qualityScore: 0.8
              }
            })
            
            // キャッシュを無効化
            const cacheKey = `translations:${job.entityType}:${job.entityId}:${targetLang}`
            await redis.del(cacheKey)
            
            completedTasks++
            
            // コスト計算（文字数ベース）
            const charCount = sourceText.length
            const cost = (charCount / 1000000) * 20 // $20 per 1M characters
            totalCost += cost
          }
        } catch (error) {
          console.error(`Translation failed for ${fieldName} to ${targetLang}:`, error)
          failedTasks++
        }
      }
    }
    
    // ジョブステータス更新
    await prisma.translationJob.update({
      where: { id: jobId },
      data: {
        status: failedTasks === 0 ? 'completed' : 'partial',
        completedTasks,
        failedTasks,
        totalCost,
        completedAt: new Date()
      }
    })
  }
  
  /**
   * 翻訳を取得（キャッシュ付き）
   */
  async getTranslation(
    entityType: string,
    entityId: string,
    languageCode: string,
    fieldName: string
  ): Promise<string | null> {
    // キャッシュ確認
    const cacheKey = `translation:${entityType}:${entityId}:${languageCode}:${fieldName}`
    const cached = await redis.get(cacheKey)
    
    if (cached) {
      return cached
    }
    
    // データベースから取得
    const translation = await prisma.translation.findFirst({
      where: {
        entityType,
        entityId,
        languageCode,
        fieldName
      }
    })
    
    if (translation) {
      // キャッシュに保存（24時間）
      await redis.setex(cacheKey, 86400, translation.translatedText)
      return translation.translatedText
    }
    
    return null
  }
  
  private async getTenantIdFromEntity(
    entityType: string,
    entityId: string
  ): Promise<string> {
    // エンティティタイプに応じてテナントIDを取得
    // 実装は省略
    return 'tenant-id'
  }
}

export const translationEngine = new TranslationEngine()
```

#### 2. 環境変数設定

```bash
# hotel-common/.env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

#### 3. テスト実装

```typescript
// hotel-common/src/services/i18n/__tests__/translation-engine.test.ts
import { translationEngine } from '../translation-engine'

describe('TranslationEngine', () => {
  it('should translate entity', async () => {
    const jobId = await translationEngine.translateEntity(
      'menu_item',
      '123',
      'ja',
      { name: 'テスト商品', description: 'これはテストです' },
      ['en', 'ko']
    )
    
    expect(jobId).toBeDefined()
  })
  
  it('should get translation with cache', async () => {
    const translation = await translationEngine.getTranslation(
      'menu_item',
      '123',
      'en',
      'name'
    )
    
    expect(translation).toBe('Test Product')
  })
})
```

### ✅ 完了条件
- [ ] TranslationEngineクラス実装完了
- [ ] Google Cloud Translation API統合完了
- [ ] Redisキャッシュ実装完了
- [ ] ユニットテスト実装完了
- [ ] テスト実行成功

---

## 📅 Phase 4: API実装（2週間）

### 🎯 目的
翻訳機能を提供するAPIエンドポイントを実装

### 👤 担当者
**Iza（統合管理者）** - hotel-common担当

### ✅ 作業内容

#### 1. 翻訳取得API

```typescript
// hotel-common/src/routes/translations/entity.get.ts
import { defineEventHandler, getQuery } from 'h3'
import { translationEngine } from '../../services/i18n/translation-engine'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { type, id, lang } = query
  
  if (!type || !id || !lang) {
    throw createError({
      statusCode: 400,
      message: 'Missing required parameters: type, id, lang'
    })
  }
  
  // エンティティに関連する全フィールドの翻訳を取得
  const translations = await prisma.translation.findMany({
    where: {
      entityType: type as string,
      entityId: id as string,
      languageCode: lang as string
    }
  })
  
  // フィールド名をキーとしたオブジェクトに変換
  const translationMap: Record<string, string> = {}
  translations.forEach(t => {
    translationMap[t.fieldName] = t.translatedText
  })
  
  return {
    success: true,
    data: translationMap
  }
})
```

#### 2. 翻訳実行API

```typescript
// hotel-common/src/routes/translations/translate.post.ts
import { defineEventHandler, readBody } from 'h3'
import { translationEngine } from '../../services/i18n/translation-engine'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const {
    entity_type,
    entity_id,
    source_language,
    source_texts,
    target_languages,
    auto_translate = true
  } = body
  
  if (!auto_translate) {
    return { success: true, message: 'Auto-translate disabled' }
  }
  
  const jobId = await translationEngine.translateEntity(
    entity_type,
    entity_id,
    source_language,
    source_texts,
    target_languages
  )
  
  return {
    success: true,
    data: { jobId }
  }
})
```

#### 3. 翻訳ジョブ進捗API

```typescript
// hotel-common/src/routes/translations/jobs/[jobId]/progress.get.ts
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const jobId = event.context.params?.jobId
  
  const job = await prisma.translationJob.findUnique({
    where: { id: jobId }
  })
  
  if (!job) {
    throw createError({
      statusCode: 404,
      message: 'Translation job not found'
    })
  }
  
  return {
    success: true,
    data: {
      status: job.status,
      totalTasks: job.totalTasks,
      completedTasks: job.completedTasks,
      failedTasks: job.failedTasks,
      progress: Math.round((job.completedTasks / job.totalTasks) * 100)
    }
  }
})
```

### ✅ 完了条件
- [ ] 翻訳取得API実装完了
- [ ] 翻訳実行API実装完了
- [ ] 翻訳ジョブ進捗API実装完了
- [ ] APIテスト実装完了
- [ ] Postmanでの動作確認完了

---

## 📅 Phase 5: フロントエンド実装（3週間）

### 🎯 目的
各システムのフロントエンドで多言語対応を実装

### 👤 担当者
- **Sun（hotel-saas担当）**
- **Luna（hotel-pms担当）**
- **Suno（hotel-member担当）**

### ✅ 作業内容（hotel-saas例）

#### 1. i18n設定

```typescript
// hotel-saas/nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    locales: [
      { code: 'ja', iso: 'ja-JP', file: 'ja.json', name: '日本語' },
      { code: 'en', iso: 'en-US', file: 'en.json', name: 'English' },
      { code: 'ko', iso: 'ko-KR', file: 'ko.json', name: '한국어' },
      { code: 'zh-CN', iso: 'zh-CN', file: 'zh-CN.json', name: '简体中文' },
      { code: 'zh-TW', iso: 'zh-TW', file: 'zh-TW.json', name: '繁體中文' }
    ],
    defaultLocale: 'ja',
    langDir: 'locales/',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'hotel_language',
      alwaysRedirect: false
    }
  }
})
```

#### 2. 言語切り替えコンポーネント

```vue
<!-- hotel-saas/components/LanguageSwitcher.vue -->
<template>
  <div class="language-switcher">
    <button
      v-for="locale in availableLocales"
      :key="locale.code"
      @click="switchLanguage(locale.code)"
      :class="{ active: currentLocale === locale.code }"
      class="language-button"
    >
      {{ locale.flag }} {{ locale.name }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

const availableLocales = computed(() => [
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' }
])

const currentLocale = computed(() => locale.value)

const switchLanguage = async (newLocale: string) => {
  await setLocale(newLocale)
  
  // Cookie保存
  const cookie = useCookie('hotel_language', {
    maxAge: 365 * 24 * 60 * 60 // 1年
  })
  cookie.value = newLocale
}
</script>
```

#### 3. 翻訳ファイル作成

```json
// hotel-saas/locales/ja.json
{
  "ui": {
    "buttons": {
      "add": "追加",
      "edit": "編集",
      "delete": "削除",
      "save": "保存",
      "cancel": "キャンセル"
    },
    "messages": {
      "no_data": "データがありません",
      "loading": "読み込み中...",
      "success": "成功しました",
      "error": "エラーが発生しました"
    }
  },
  "menu": {
    "title": "メニュー",
    "add_item": "商品を追加",
    "edit_item": "商品を編集"
  }
}

// hotel-saas/locales/en.json
{
  "ui": {
    "buttons": {
      "add": "Add",
      "edit": "Edit",
      "delete": "Delete",
      "save": "Save",
      "cancel": "Cancel"
    },
    "messages": {
      "no_data": "No data available",
      "loading": "Loading...",
      "success": "Success",
      "error": "An error occurred"
    }
  },
  "menu": {
    "title": "Menu",
    "add_item": "Add Item",
    "edit_item": "Edit Item"
  }
}
```

#### 4. 管理画面の多言語入力UI

```vue
<!-- hotel-saas/pages/admin/menu/items/create.vue -->
<template>
  <div class="admin-create-form">
    <h1>{{ $t('menu.add_item') }}</h1>
    
    <form @submit.prevent="handleSubmit">
      <!-- 日本語入力 -->
      <div class="form-section">
        <h2>基本情報（日本語）</h2>
        
        <div class="form-group">
          <label>商品名（日本語）*</label>
          <input v-model="form.name_ja" type="text" required />
        </div>
        
        <div class="form-group">
          <label>説明（日本語）</label>
          <textarea v-model="form.description_ja" />
        </div>
      </div>
      
      <!-- 自動翻訳オプション -->
      <div class="form-section">
        <h2>多言語対応</h2>
        
        <label class="checkbox-label">
          <input v-model="form.auto_translate" type="checkbox" checked />
          <span>保存時に自動的に15言語へ翻訳する</span>
        </label>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="$router.back()" class="btn-secondary">
          {{ $t('ui.buttons.cancel') }}
        </button>
        <button type="submit" class="btn-primary" :disabled="isSubmitting">
          {{ isSubmitting ? $t('ui.messages.loading') : $t('ui.buttons.save') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const form = ref({
  name_ja: '',
  description_ja: '',
  price: 0,
  auto_translate: true
})

const isSubmitting = ref(false)

const handleSubmit = async () => {
  isSubmitting.value = true
  
  try {
    const response = await $fetch('/api/v1/admin/menu/items/create', {
      method: 'POST',
      body: form.value
    })
    
    if (response.success) {
      toast.success($t('ui.messages.success'))
      await navigateTo('/admin/menu/items')
    }
  } catch (error) {
    toast.error($t('ui.messages.error'))
  } finally {
    isSubmitting.value = false
  }
}
</script>
```

### ✅ 完了条件
- [ ] i18n設定完了
- [ ] 言語切り替えコンポーネント実装完了
- [ ] 翻訳ファイル作成完了（15言語）
- [ ] 管理画面の多言語入力UI実装完了
- [ ] 客室端末の言語切り替え実装完了
- [ ] 全画面で翻訳キー化完了

---

## 📅 Phase 6: 15言語拡張（2-3週間）

### 🎯 目的
既存データを残り13言語へ翻訳

### 👤 担当者
**Iza（統合管理者）** - hotel-common担当

### ✅ 作業内容

#### 1. 一括翻訳スクリプト作成

```typescript
// hotel-common/scripts/translate-all-entities.ts
import { prisma } from '../src/lib/prisma'
import { translationEngine } from '../src/services/i18n/translation-engine'

async function translateAllEntities() {
  console.log('🚀 Starting bulk translation...')
  
  const targetLanguages = [
    'ko', 'zh-CN', 'zh-TW', 'th', 'vi', 'id', 'ms', 'tl',
    'es', 'fr', 'de', 'it', 'pt'
  ]
  
  // 1. menu_items を翻訳
  const menuItems = await prisma.menuItem.findMany()
  
  for (const item of menuItems) {
    // 日本語翻訳を取得
    const jaTranslations = await prisma.translation.findMany({
      where: {
        entityType: 'menu_item',
        entityId: String(item.id),
        languageCode: 'ja'
      }
    })
    
    if (jaTranslations.length === 0) continue
    
    const sourceTexts: Record<string, string> = {}
    jaTranslations.forEach(t => {
      sourceTexts[t.fieldName] = t.translatedText
    })
    
    // 翻訳ジョブを作成
    await translationEngine.translateEntity(
      'menu_item',
      String(item.id),
      'ja',
      sourceTexts,
      targetLanguages
    )
    
    console.log(`✅ Queued translation for menu_item ${item.id}`)
  }
  
  // 2. menu_categories を翻訳
  // 同様の処理
  
  // 3. room_grades を翻訳
  // 同様の処理
  
  console.log('🎉 Bulk translation queued successfully!')
}

translateAllEntities()
```

#### 2. 翻訳実行

```bash
cd hotel-common
npm run translate:all
```

#### 3. 進捗監視

```typescript
// hotel-common/scripts/monitor-translation-progress.ts
import { prisma } from '../src/lib/prisma'

async function monitorProgress() {
  const jobs = await prisma.translationJob.findMany({
    where: {
      status: { in: ['pending', 'processing'] }
    }
  })
  
  console.log(`📊 Active jobs: ${jobs.length}`)
  
  for (const job of jobs) {
    const progress = Math.round((job.completedTasks / job.totalTasks) * 100)
    console.log(`  Job ${job.id}: ${progress}% (${job.completedTasks}/${job.totalTasks})`)
  }
}

// 10秒ごとに進捗を表示
setInterval(monitorProgress, 10000)
```

### ✅ 完了条件
- [ ] 一括翻訳スクリプト作成完了
- [ ] 全エンティティの翻訳ジョブ作成完了
- [ ] 翻訳完了（成功率95%以上）
- [ ] 全言語での表示確認完了
- [ ] 翻訳品質レビュー完了

---

## 📅 Phase 7: 既存カラム削除（3-6ヶ月後）

### 🎯 目的
既存の`name_ja`, `name_en`等のカラムを削除

### 👤 担当者
**Iza（統合管理者）** - hotel-common担当

### ⚠️ 注意事項
- **十分な移行期間（3-6ヶ月）を確保**
- **全システムが翻訳テーブルを使用していることを確認**
- **バックアップを必ず取得**

### ✅ 作業内容

#### 1. 使用状況確認

```bash
# 既存カラムの参照を検索
cd hotel-kanri
grep -r "nameJa" .
grep -r "nameEn" .
grep -r "name_ja" .
grep -r "name_en" .
```

#### 2. 非推奨化（Phase 3で実施済み）

```sql
COMMENT ON COLUMN menu_items.name_ja IS 
  '⚠️ DEPRECATED: translationsテーブルを使用してください';
```

#### 3. カラム削除

```sql
-- ========================================
-- 既存カラム削除（十分な移行期間後）
-- ========================================

BEGIN;

ALTER TABLE menu_items 
  DROP COLUMN name_ja,
  DROP COLUMN name_en,
  DROP COLUMN description_ja,
  DROP COLUMN description_en;

ALTER TABLE menu_categories
  DROP COLUMN name_ja,
  DROP COLUMN name_en,
  DROP COLUMN description_ja,
  DROP COLUMN description_en;

ALTER TABLE room_grades
  DROP COLUMN grade_name_en;

COMMIT;
```

### ✅ 完了条件
- [ ] 既存カラムの参照がゼロ
- [ ] バックアップ取得完了
- [ ] カラム削除実行完了
- [ ] 全機能の動作確認完了

---

## 👥 各担当者の作業内容

### 🌊 Iza（統合管理者）- hotel-common担当

| Phase | 作業内容 | 期間 |
|-------|---------|------|
| Phase 1 | 翻訳テーブル作成 | 1週間 |
| Phase 2 | 既存データ移行 | 1週間 |
| Phase 3 | 翻訳エンジン実装 | 2週間 |
| Phase 4 | API実装 | 2週間 |
| Phase 6 | 15言語拡張 | 2-3週間 |
| Phase 7 | 既存カラム削除 | 1週間 |

**総期間**: 約9-10週間

### ☀️ Sun（hotel-saas担当）

| Phase | 作業内容 | 期間 |
|-------|---------|------|
| Phase 5 | i18n設定 | 3日 |
| Phase 5 | 言語切り替えUI | 3日 |
| Phase 5 | 翻訳ファイル作成（15言語） | 1週間 |
| Phase 5 | 管理画面の多言語入力UI | 1週間 |
| Phase 5 | 客室端末の言語切り替え | 4日 |

**総期間**: 約3週間

### 🌙 Luna（hotel-pms担当）

| Phase | 作業内容 | 期間 |
|-------|---------|------|
| Phase 5 | i18n設定 | 3日 |
| Phase 5 | 言語切り替えUI | 3日 |
| Phase 5 | 翻訳ファイル作成（15言語） | 1週間 |
| Phase 5 | チェックイン端末の多言語対応 | 1週間 |
| Phase 5 | フロントUIの多言語対応 | 4日 |

**総期間**: 約3週間

### ⚡ Suno（hotel-member担当）

| Phase | 作業内容 | 期間 |
|-------|---------|------|
| Phase 5 | i18n設定（FastAPI） | 3日 |
| Phase 5 | 言語切り替えUI | 3日 |
| Phase 5 | 翻訳ファイル作成（15言語） | 1週間 |
| Phase 5 | 会員画面の多言語対応 | 1週間 |

**総期間**: 約3週間

---

## 📊 進捗管理

### チェックリスト

```markdown
## Phase 1: 翻訳テーブル作成
- [ ] Prismaスキーマ更新
- [ ] マイグレーション実行
- [ ] 動作確認

## Phase 2: 既存データ移行
- [ ] 移行スクリプト作成
- [ ] 移行実行
- [ ] データ検証

## Phase 3: 翻訳エンジン実装
- [ ] TranslationEngineクラス実装
- [ ] Google Cloud Translation API統合
- [ ] Redisキャッシュ実装
- [ ] ユニットテスト実装

## Phase 4: API実装
- [ ] 翻訳取得API
- [ ] 翻訳実行API
- [ ] 翻訳ジョブ進捗API
- [ ] APIテスト実装

## Phase 5: フロントエンド実装
### hotel-saas
- [ ] i18n設定
- [ ] 言語切り替えコンポーネント
- [ ] 翻訳ファイル作成（15言語）
- [ ] 管理画面の多言語入力UI
- [ ] 客室端末の言語切り替え

### hotel-pms
- [ ] i18n設定
- [ ] 言語切り替えコンポーネント
- [ ] 翻訳ファイル作成（15言語）
- [ ] チェックイン端末の多言語対応
- [ ] フロントUIの多言語対応

### hotel-member
- [ ] i18n設定（FastAPI）
- [ ] 言語切り替えコンポーネント
- [ ] 翻訳ファイル作成（15言語）
- [ ] 会員画面の多言語対応

## Phase 6: 15言語拡張
- [ ] 一括翻訳スクリプト作成
- [ ] 全エンティティの翻訳ジョブ作成
- [ ] 翻訳完了確認
- [ ] 全言語での表示確認
- [ ] 翻訳品質レビュー

## Phase 7: 既存カラム削除
- [ ] 既存カラムの参照確認
- [ ] バックアップ取得
- [ ] カラム削除実行
- [ ] 全機能の動作確認
```

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-10-07 | 初版作成 |

---

**作成者**: Iza（統合管理者）  
**承認者**: -  
**次回レビュー予定**: Phase 1開始時

