# 多言語化システム 実装ガイド

**作成日**: 2025-10-07  
**バージョン**: 1.0.0  
**対象**: 開発者（Sun, Luna, Suno, Iza）  
**前提知識**: [SSOT_MULTILINGUAL_SYSTEM.md](./SSOT_MULTILINGUAL_SYSTEM.md)を必ず先に読むこと

**関連ドキュメント**:
- [SSOT_MULTILINGUAL_SYSTEM.md](./SSOT_MULTILINGUAL_SYSTEM.md) - 多言語化システム仕様（必読）
- [DATABASE_NAMING_STANDARD.md](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md) - 命名規則
- [API_ROUTING_GUIDELINES.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md) - APIルーティング

---

## 📋 目次

1. [他機能実装時の必須ルール](#他機能実装時の必須ルール)
2. [UI/UX考慮事項](#uiux考慮事項)
3. [フォーマット処理](#フォーマット処理)
4. [検索・ソート](#検索ソート)
5. [通知・メール](#通知メール)
6. [SEO対応](#seo対応)
7. [サンプルコード集](#サンプルコード集)
8. [トラブルシューティング](#トラブルシューティング)
9. [よくある間違いと修正方法](#よくある間違いと修正方法)

---

## 🚨 他機能実装時の必須ルール

### ⚠️ 重要: このセクションは全機能実装時に必ず確認すること

多言語化は**横断的な基盤機能**であり、全ての機能実装時に以下のルールを遵守する必要があります。

---

### 📋 実装前チェックリスト

新機能を実装する前に、以下を必ず確認してください：

```markdown
□ この機能にユーザー向けテキストが含まれるか？
  └─ YES → 多言語対応必須
  └─ NO  → このセクションはスキップ可能

□ データベースに保存するテキストフィールドがあるか？
  └─ YES → translationsテーブル使用必須
  └─ NO  → 静的UIテキストのみ（i18nファイル）

□ 管理画面でテキストを編集する機能があるか？
  └─ YES → 自動翻訳機能の組み込み必須
  └─ NO  → 表示のみ（翻訳取得のみ）
```

---

### 1️⃣ データベーステーブル設計時の必須ルール

#### ❌ 禁止パターン

```sql
-- ❌ 絶対禁止: 言語別カラムを追加
CREATE TABLE new_feature_items (
  id TEXT PRIMARY KEY,
  name_ja TEXT,
  name_en TEXT,
  name_ko TEXT,
  -- ... 15言語分のカラム（禁止！）
);
```

**理由**:
- 言語追加時にスキーマ変更が必要
- カラム数が爆発（15言語 × 複数フィールド）
- NULL値が多い
- 拡張性がない
- バックグラウンド翻訳の実装が複雑化

#### ✅ 正しいパターン

```sql
-- ベーステーブル（言語非依存データ）
CREATE TABLE new_feature_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  price INTEGER,
  image_url TEXT,
  
  -- 言語依存データは含めない
  -- 翻訳はtranslationsテーブルで管理
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 翻訳はtranslationsテーブルで管理（統一）
-- entity_type='new_feature_item', entity_id='{id}', field_name='name'
```

---

### 2️⃣ Prismaスキーマ定義時の必須ルール

#### ✅ 正しいパターン

```prisma
model NewFeatureItem {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  price     Int
  imageUrl  String?  @map("image_url")
  
  // ❌ 言語別フィールドは追加しない
  // nameJa, nameEn 等は禁止
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@map("new_feature_items")
}

// 翻訳はTranslationモデルで管理（統一）
```

---

### 3️⃣ API実装時の必須ルール

#### hotel-common: データ作成API

```typescript
// ✅ 必須: 自動翻訳オプションを含める
interface CreateNewFeatureItemRequest {
  name_ja: string
  description_ja?: string
  price: number
  auto_translate?: boolean  // ✅ 必須: デフォルトtrue
}

// POST /api/v1/admin/new-feature/items/create.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name_ja, description_ja, price, auto_translate = true } = body
  
  // 1. アイテムを作成
  const item = await prisma.newFeatureItem.create({
    data: {
      tenantId: event.context.session.tenantId,
      price
    }
  })
  
  // 2. 日本語翻訳を保存（translationsテーブル）
  await prisma.translation.create({
    data: {
      tenantId: event.context.session.tenantId,
      entityType: 'new_feature_item',
      entityId: item.id,
      languageCode: 'ja',
      fieldName: 'name',
      translatedText: name_ja,
      translationMethod: 'manual'
    }
  })
  
  if (description_ja) {
    await prisma.translation.create({
      data: {
        tenantId: event.context.session.tenantId,
        entityType: 'new_feature_item',
        entityId: item.id,
        languageCode: 'ja',
        fieldName: 'description',
        translatedText: description_ja,
        translationMethod: 'manual'
      }
    })
  }
  
  // 3. ✅ 必須: 自動翻訳が有効な場合、翻訳ジョブを作成
  if (auto_translate) {
    const engine = getTranslationEngine()
    const sourceTexts: Record<string, string> = { name: name_ja }
    if (description_ja) sourceTexts.description = description_ja
    
    const jobId = await engine.translateEntity(
      'new_feature_item',
      item.id,
      'ja',
      sourceTexts,
      ['en', 'ko', 'zh-CN', 'zh-TW', 'th', 'vi', 'id', 'ms', 'tl', 'es', 'fr', 'de', 'it', 'pt']
    )
    
    return { success: true, data: { id: item.id, translationJobId: jobId } }
  }
  
  return { success: true, data: { id: item.id } }
})
```

#### hotel-common: データ取得API

```typescript
// ✅ 必須: 言語パラメータを受け取る
// GET /api/v1/guest/new-feature/items/list.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const languageCode = query.lang as string || 'ja'
  const tenantId = event.context.session.tenantId
  
  // 1. アイテムを取得
  const items = await prisma.newFeatureItem.findMany({
    where: { tenantId }
  })
  
  // 2. 翻訳を取得（一括）
  const itemIds = items.map(item => item.id)
  const translations = await prisma.translation.findMany({
    where: {
      entityType: 'new_feature_item',
      entityId: { in: itemIds },
      languageCode
    }
  })
  
  // 3. フォールバック処理
  const translationMap = new Map<string, Map<string, string>>()
  translations.forEach(t => {
    if (!translationMap.has(t.entityId)) {
      translationMap.set(t.entityId, new Map())
    }
    translationMap.get(t.entityId)!.set(t.fieldName, t.translatedText)
  })
  
  // 4. データ結合
  const itemsWithTranslations = await Promise.all(
    items.map(async (item) => {
      let itemTranslations = translationMap.get(item.id)
      
      // フォールバック: 指定言語がない場合
      if (!itemTranslations || itemTranslations.size === 0) {
        // 英語を試す
        const enTranslations = await prisma.translation.findMany({
          where: {
            entityType: 'new_feature_item',
            entityId: item.id,
            languageCode: 'en'
          }
        })
        
        if (enTranslations.length > 0) {
          itemTranslations = new Map()
          enTranslations.forEach(t => itemTranslations!.set(t.fieldName, t.translatedText))
        } else {
          // 日本語を試す
          const jaTranslations = await prisma.translation.findMany({
            where: {
              entityType: 'new_feature_item',
              entityId: item.id,
              languageCode: 'ja'
            }
          })
          itemTranslations = new Map()
          jaTranslations.forEach(t => itemTranslations!.set(t.fieldName, t.translatedText))
        }
      }
      
      return {
        id: item.id,
        name: itemTranslations?.get('name') || '[Translation Missing]',
        description: itemTranslations?.get('description') || '',
        price: item.price,
        imageUrl: item.imageUrl
      }
    })
  )
  
  return { success: true, data: itemsWithTranslations }
})
```

#### hotel-saas: プロキシAPI

```typescript
// ✅ 必須: 言語パラメータを転送
// GET /api/v1/guest/new-feature/items/list.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  
  const response = await $fetch(
    'http://localhost:3400/api/v1/guest/new-feature/items/list',
    {
      params: query,  // ✅ 必須: langパラメータを転送
      credentials: 'include',
      headers: {
        cookie: event.node.req.headers.cookie || ''
      }
    }
  )
  
  return response
})
```

---

### 4️⃣ フロントエンド実装時の必須ルール

#### ❌ 禁止パターン

```vue
<template>
  <!-- ❌ 絶対禁止: 直接日本語を書く -->
  <h1>新機能</h1>
  <button>追加</button>
  <p>データがありません</p>
</template>
```

#### ✅ 正しいパターン

```vue
<template>
  <div class="new-feature-page">
    <!-- ✅ 必須: 静的テキストは翻訳キーを使用 -->
    <h1>{{ $t('newFeature.title') }}</h1>
    <button>{{ $t('ui.buttons.add') }}</button>
    
    <!-- ✅ 必須: 動的コンテンツは翻訳済みデータを表示 -->
    <div v-for="item in items" :key="item.id" class="item">
      <h3>{{ item.name }}</h3>
      <p>{{ item.description }}</p>
      <span>{{ formatPrice(item.price) }}</span>
    </div>
    
    <!-- ✅ 必須: メッセージも翻訳キー -->
    <p v-if="items.length === 0">{{ $t('ui.messages.no_data') }}</p>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const { formatPrice } = useLocaleFormat()

// ✅ 必須: 現在の言語を含めてAPIリクエスト
const { data: items } = await useFetch('/api/v1/guest/new-feature/items/list', {
  params: { lang: locale.value }
})
</script>
```

#### 翻訳ファイルの作成（必須）

```json
// locales/ja/newFeature.json
{
  "title": "新機能",
  "description": "新機能の説明",
  "buttons": {
    "create": "作成",
    "edit": "編集",
    "delete": "削除"
  },
  "labels": {
    "name": "名前",
    "description": "説明",
    "price": "価格"
  },
  "messages": {
    "created": "作成しました",
    "updated": "更新しました",
    "deleted": "削除しました"
  }
}

// locales/en/newFeature.json
{
  "title": "New Feature",
  "description": "Description of new feature",
  "buttons": {
    "create": "Create",
    "edit": "Edit",
    "delete": "Delete"
  },
  "labels": {
    "name": "Name",
    "description": "Description",
    "price": "Price"
  },
  "messages": {
    "created": "Created successfully",
    "updated": "Updated successfully",
    "deleted": "Deleted successfully"
  }
}
```

---

### 5️⃣ 管理画面実装時の必須ルール

#### ✅ 必須: 多言語入力UI

```vue
<template>
  <div class="admin-create-form">
    <h1>{{ $t('admin.newFeature.create.title') }}</h1>
    
    <!-- ✅ 必須: 日本語入力（ベース言語） -->
    <div class="form-section">
      <h2>基本情報（日本語）</h2>
      
      <div class="form-group">
        <label>名前（日本語）*</label>
        <input v-model="form.name_ja" type="text" required />
      </div>
      
      <div class="form-group">
        <label>説明（日本語）</label>
        <textarea v-model="form.description_ja" />
      </div>
    </div>
    
    <!-- ✅ 必須: 自動翻訳オプション -->
    <div class="form-section">
      <h2>多言語対応</h2>
      
      <div class="translation-option">
        <label class="checkbox-label">
          <input v-model="form.auto_translate" type="checkbox" checked />
          <span>保存時に自動的に15言語へ翻訳する</span>
        </label>
        <p class="help-text">
          バックグラウンドで翻訳が実行されます（約1-2分）。
          翻訳完了後、各言語の内容を確認・修正できます。
        </p>
      </div>
      
      <!-- ✅ 推奨: 翻訳対象言語の表示 -->
      <div v-if="form.auto_translate" class="target-languages">
        <p class="label">翻訳対象言語（14言語）</p>
        <div class="language-chips">
          <span v-for="lang in targetLanguages" :key="lang.code" class="chip">
            {{ lang.flag }} {{ lang.name }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- ✅ 必須: 保存ボタン -->
    <div class="form-actions">
      <button type="button" @click="$router.back()" class="btn-secondary">
        キャンセル
      </button>
      <button type="submit" @click="handleSubmit" class="btn-primary" :disabled="isSubmitting">
        <Icon v-if="isSubmitting" name="heroicons:arrow-path" class="animate-spin" />
        {{ isSubmitting ? '保存中...' : '保存して翻訳を開始' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const form = ref({
  name_ja: '',
  description_ja: '',
  price: 0,
  auto_translate: true  // ✅ 必須: デフォルトでtrue
})

const targetLanguages = [
  { code: 'en', name: '英語', flag: '🇺🇸' },
  { code: 'ko', name: '韓国語', flag: '🇰🇷' },
  { code: 'zh-CN', name: '中国語（簡体字）', flag: '🇨🇳' },
  { code: 'zh-TW', name: '中国語（繁体字）', flag: '🇹🇼' },
  { code: 'th', name: 'タイ語', flag: '🇹🇭' },
  { code: 'vi', name: 'ベトナム語', flag: '🇻🇳' },
  { code: 'id', name: 'インドネシア語', flag: '🇮🇩' },
  { code: 'ms', name: 'マレー語', flag: '🇲🇾' },
  { code: 'tl', name: 'フィリピン語', flag: '🇵🇭' },
  { code: 'es', name: 'スペイン語', flag: '🇪🇸' },
  { code: 'fr', name: 'フランス語', flag: '🇫🇷' },
  { code: 'de', name: 'ドイツ語', flag: '🇩🇪' },
  { code: 'it', name: 'イタリア語', flag: '🇮🇹' },
  { code: 'pt', name: 'ポルトガル語', flag: '🇵🇹' }
]

const isSubmitting = ref(false)

const handleSubmit = async () => {
  isSubmitting.value = true
  
  try {
    const response = await $fetch('/api/v1/admin/new-feature/items/create', {
      method: 'POST',
      body: {
        name_ja: form.value.name_ja,
        description_ja: form.value.description_ja,
        price: form.value.price,
        auto_translate: form.value.auto_translate  // ✅ 必須: 送信
      }
    })
    
    if (response.success) {
      toast.success('作成しました', '翻訳をバックグラウンドで実行中です')
      
      // ✅ 推奨: 翻訳進捗の監視
      if (response.data.translationJobId) {
        watchTranslationProgress(response.data.translationJobId)
      }
      
      await navigateTo('/admin/new-feature/items')
    }
  } catch (error) {
    toast.error('作成に失敗しました', error.message)
  } finally {
    isSubmitting.value = false
  }
}

// 翻訳進捗監視（推奨）
const watchTranslationProgress = (jobId: string) => {
  const eventSource = new EventSource(`/api/v1/translations/jobs/${jobId}/progress`)
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data)
    
    if (data.status === 'completed') {
      toast.success('翻訳完了', `${data.completedTasks}/${data.totalTasks}件の翻訳が完了しました`)
      eventSource.close()
    } else if (data.status === 'failed') {
      toast.error('翻訳失敗', '一部の翻訳に失敗しました')
      eventSource.close()
    }
  }
  
  eventSource.onerror = () => {
    eventSource.close()
  }
}
</script>
```

---

### 6️⃣ テスト時の必須確認項目

```markdown
## 多言語対応のテストチェックリスト

### データベース
- [ ] translationsテーブルにデータが正しく保存されているか
- [ ] entity_type, entity_id, language_code, field_nameが正しいか
- [ ] 複合ユニーク制約が機能しているか

### API
- [ ] 作成時に自動翻訳ジョブが作成されるか
- [ ] langパラメータで言語を指定できるか
- [ ] 翻訳がない場合、フォールバックが機能するか
- [ ] 翻訳ジョブの進捗を取得できるか

### フロントエンド
- [ ] 全ての表示テキストが翻訳キー化されているか
- [ ] 言語切り替えで表示が変わるか
- [ ] 翻訳がない場合、フォールバックが表示されるか
- [ ] 管理画面で自動翻訳オプションが表示されるか

### 各言語での表示確認
- [ ] 日本語で正しく表示されるか
- [ ] 英語で正しく表示されるか
- [ ] 韓国語で正しく表示されるか
- [ ] 中国語（簡体字）で正しく表示されるか
- [ ] 中国語（繁体字）で正しく表示されるか
- [ ] タイ語で正しく表示されるか（フォント確認）
```

---

## 🎨 UI/UX考慮事項

### 1. テキスト長の変動対応

**問題**: 言語によってテキスト長が大きく変わる

**解決策**:
- 動的レイアウト（`min-width`, `max-width`）
- 省略形の提供（モバイル用）
- 言語別フォントサイズ調整

```vue
<style scoped>
.action-button {
  min-width: 120px;
  padding: 12px 24px;
  white-space: nowrap;
}

.action-button.long-text {
  min-width: 160px;
  font-size: 0.9em;
}

/* 言語別フォントサイズ調整 */
:lang(th), :lang(vi), :lang(id) {
  font-size: 1.05em;
}

:lang(zh), :lang(ja), :lang(ko) {
  letter-spacing: 0.02em;
}
</style>
```

### 2. RTL（右から左）言語対応

**対象言語**: アラビア語、ヘブライ語（将来対応）

```vue
<template>
  <div :dir="direction" :lang="locale">
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { locale } = useI18n()
const direction = computed(() => {
  const rtlLanguages = ['ar', 'he']
  return rtlLanguages.includes(locale.value) ? 'rtl' : 'ltr'
})
</script>

<style>
[dir="rtl"] .menu-item {
  text-align: right;
}

/* 論理プロパティを使用（推奨） */
.menu-item {
  padding-inline-start: 16px;
  padding-inline-end: 8px;
}
</style>
```

### 3. フォント最適化

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  app: {
    head: {
      link: [
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&display=swap' }
      ]
    }
  }
})
```

---

## 📊 フォーマット処理

### 日付・時刻・数値のフォーマット

```typescript
// composables/useLocaleFormat.ts
export const useLocaleFormat = () => {
  const { locale } = useI18n()
  
  const formatDate = (date: Date | string, format: 'short' | 'long' = 'short') => {
    const d = typeof date === 'string' ? new Date(date) : date
    const options: Intl.DateTimeFormatOptions = format === 'short'
      ? { year: 'numeric', month: '2-digit', day: '2-digit' }
      : { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
    
    return new Intl.DateTimeFormat(locale.value, options).format(d)
  }
  
  const formatPrice = (amount: number, currency: string = 'JPY') => {
    return new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(amount)
  }
  
  const formatNumber = (value: number, decimals: number = 0) => {
    return new Intl.NumberFormat(locale.value, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value)
  }
  
  return { formatDate, formatPrice, formatNumber }
}
```

**使用例**:
```vue
<template>
  <div>
    <!-- 日本語: 2025年10月7日 月曜日 -->
    <!-- 英語: Monday, October 7, 2025 -->
    <p>{{ formatDate(order.createdAt, 'long') }}</p>
    
    <!-- 日本語: ¥3,500 -->
    <!-- 英語: ¥3,500 -->
    <p>{{ formatPrice(order.total) }}</p>
  </div>
</template>

<script setup lang="ts">
const { formatDate, formatPrice } = useLocaleFormat()
</script>
```

---

## 🔍 検索・ソート

### 多言語全文検索

```typescript
// server/utils/multilingual-search.ts
export class MultilingualSearch {
  static async searchItems(
    query: string,
    language: string,
    tenantId: string,
    entityType: string
  ) {
    // PostgreSQL全文検索（言語別）
    const results = await prisma.$queryRaw`
      SELECT 
        t.entity_id,
        t.translated_text,
        ts_rank(
          to_tsvector(${this.getTextSearchConfig(language)}, t.translated_text),
          plainto_tsquery(${this.getTextSearchConfig(language)}, ${query})
        ) AS rank
      FROM translations t
      WHERE 
        t.tenant_id = ${tenantId}
        AND t.entity_type = ${entityType}
        AND t.language_code = ${language}
        AND to_tsvector(${this.getTextSearchConfig(language)}, t.translated_text)
            @@ plainto_tsquery(${this.getTextSearchConfig(language)}, ${query})
      ORDER BY rank DESC
      LIMIT 50
    `
    
    return results
  }
  
  private static getTextSearchConfig(language: string): string {
    const configs: Record<string, string> = {
      'en': 'english',
      'es': 'spanish',
      'fr': 'french',
      'de': 'german',
      'it': 'italian',
      'pt': 'portuguese',
      'default': 'simple'
    }
    
    return configs[language] || configs['default']
  }
}
```

---

## 📧 通知・メール

### メール送信の多言語対応

```typescript
// server/services/email-service.ts
export class EmailService {
  async sendOrderConfirmation(
    order: Order,
    customerEmail: string,
    language: string
  ) {
    // メールテンプレートを言語別に取得
    const template = await this.getEmailTemplate('order_confirmation', language)
    
    const subject = this.replacePlaceholders(template.subject, {
      order_number: order.orderNumber
    })
    
    const body = this.replacePlaceholders(template.body, {
      customer_name: order.customerName,
      order_number: order.orderNumber,
      total_amount: this.formatPrice(order.total, language),
      order_date: this.formatDate(order.createdAt, language)
    })
    
    await this.sendEmail({
      to: customerEmail,
      subject,
      html: body
    })
  }
  
  private async getEmailTemplate(templateType: string, language: string) {
    const template = await prisma.translation.findFirst({
      where: {
        entityType: 'email_template',
        entityId: templateType,
        languageCode: language,
        fieldName: 'subject'
      }
    })
    
    const bodyTemplate = await prisma.translation.findFirst({
      where: {
        entityType: 'email_template',
        entityId: templateType,
        languageCode: language,
        fieldName: 'body'
      }
    })
    
    if (!template || !bodyTemplate) {
      // フォールバック: 日本語
      return this.getEmailTemplate(templateType, 'ja')
    }
    
    return {
      subject: template.translatedText,
      body: bodyTemplate.translatedText
    }
  }
  
  private replacePlaceholders(text: string, data: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match
    })
  }
}
```

---

## 🌍 SEO対応

### 言語別のメタタグ設定

```typescript
// composables/useSEO.ts
export const useSEO = () => {
  const { locale } = useI18n()
  const route = useRoute()
  
  const setLocalizedMeta = (meta: {
    title: Record<string, string>
    description: Record<string, string>
  }) => {
    const currentLang = locale.value
    
    useHead({
      title: meta.title[currentLang] || meta.title['ja'],
      meta: [
        {
          name: 'description',
          content: meta.description[currentLang] || meta.description['ja']
        },
        {
          property: 'og:title',
          content: meta.title[currentLang] || meta.title['ja']
        },
        {
          property: 'og:locale',
          content: getOGLocale(currentLang)
        }
      ],
      link: [
        // hreflang タグ（言語別URL）
        ...generateHreflangTags(route.path)
      ]
    })
  }
  
  const generateHreflangTags = (path: string) => {
    const languages = ['ja', 'en', 'ko', 'zh-CN', 'zh-TW']
    
    return languages.map(lang => ({
      rel: 'alternate',
      hreflang: lang,
      href: `https://example.com/${lang}${path}`
    }))
  }
  
  const getOGLocale = (lang: string): string => {
    const localeMap: Record<string, string> = {
      'ja': 'ja_JP',
      'en': 'en_US',
      'ko': 'ko_KR',
      'zh-CN': 'zh_CN',
      'zh-TW': 'zh_TW'
    }
    return localeMap[lang] || 'ja_JP'
  }
  
  return { setLocalizedMeta }
}
```

---

## 📦 サンプルコード集

### 完全な実装例: メニュー商品

#### 1. データベーステーブル（既存）

```sql
-- menu_itemsテーブルは既存のまま
-- translationsテーブルで多言語管理
```

#### 2. hotel-common API実装

```typescript
// hotel-common/src/routes/admin/menu/items/create.post.ts
import { defineEventHandler, readBody } from 'h3'
import { prisma } from '~/lib/prisma'
import { getTranslationEngine } from '~/services/i18n'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { 
    name_ja, 
    description_ja, 
    allergen_info_ja,
    price, 
    category_id,
    auto_translate = true 
  } = body
  
  const tenantId = event.context.session.tenantId
  
  // 1. メニュー商品を作成
  const item = await prisma.menuItem.create({
    data: {
      tenantId,
      price,
      categoryId: category_id
    }
  })
  
  // 2. 日本語翻訳を保存
  await Promise.all([
    prisma.translation.create({
      data: {
        tenantId,
        entityType: 'menu_item',
        entityId: String(item.id),
        languageCode: 'ja',
        fieldName: 'name',
        translatedText: name_ja,
        translationMethod: 'manual'
      }
    }),
    description_ja && prisma.translation.create({
      data: {
        tenantId,
        entityType: 'menu_item',
        entityId: String(item.id),
        languageCode: 'ja',
        fieldName: 'description',
        translatedText: description_ja,
        translationMethod: 'manual'
      }
    }),
    allergen_info_ja && prisma.translation.create({
      data: {
        tenantId,
        entityType: 'menu_item',
        entityId: String(item.id),
        languageCode: 'ja',
        fieldName: 'allergen_info',
        translatedText: allergen_info_ja,
        translationMethod: 'manual'
      }
    })
  ].filter(Boolean))
  
  // 3. 自動翻訳ジョブを作成
  let jobId: string | undefined
  if (auto_translate) {
    const engine = getTranslationEngine()
    const sourceTexts: Record<string, string> = { name: name_ja }
    if (description_ja) sourceTexts.description = description_ja
    if (allergen_info_ja) sourceTexts.allergen_info = allergen_info_ja
    
    jobId = await engine.translateEntity(
      'menu_item',
      String(item.id),
      'ja',
      sourceTexts,
      ['en', 'ko', 'zh-CN', 'zh-TW', 'th', 'vi', 'id', 'ms', 'tl', 'es', 'fr', 'de', 'it', 'pt']
    )
  }
  
  return { 
    success: true, 
    data: { 
      id: item.id, 
      translationJobId: jobId 
    } 
  }
})
```

#### 3. hotel-saas プロキシAPI

```typescript
// hotel-saas/server/api/v1/admin/menu/items/create.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  const response = await $fetch(
    'http://localhost:3400/api/v1/admin/menu/items/create',
    {
      method: 'POST',
      body,
      credentials: 'include',
      headers: {
        cookie: event.node.req.headers.cookie || ''
      }
    }
  )
  
  return response
})
```

#### 4. hotel-saas フロントエンド

```vue
<!-- hotel-saas/pages/admin/menu/items/create.vue -->
<template>
  <div class="admin-page">
    <h1>{{ $t('admin.menu.create.title') }}</h1>
    
    <form @submit.prevent="handleSubmit" class="form">
      <div class="form-section">
        <h2>基本情報（日本語）</h2>
        
        <div class="form-group">
          <label>商品名（日本語）*</label>
          <input v-model="form.name_ja" type="text" required />
        </div>
        
        <div class="form-group">
          <label>説明（日本語）</label>
          <textarea v-model="form.description_ja" rows="4" />
        </div>
        
        <div class="form-group">
          <label>アレルギー情報（日本語）</label>
          <input v-model="form.allergen_info_ja" type="text" />
        </div>
        
        <div class="form-group">
          <label>価格*</label>
          <input v-model.number="form.price" type="number" required />
        </div>
      </div>
      
      <div class="form-section">
        <h2>多言語対応</h2>
        
        <label class="checkbox-label">
          <input v-model="form.auto_translate" type="checkbox" />
          <span>保存時に自動的に15言語へ翻訳する</span>
        </label>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="$router.back()" class="btn-secondary">
          キャンセル
        </button>
        <button type="submit" class="btn-primary" :disabled="isSubmitting">
          {{ isSubmitting ? '保存中...' : '保存' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const form = ref({
  name_ja: '',
  description_ja: '',
  allergen_info_ja: '',
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
      toast.success('作成しました')
      await navigateTo('/admin/menu/items')
    }
  } catch (error) {
    toast.error('作成に失敗しました', error.message)
  } finally {
    isSubmitting.value = false
  }
}
</script>
```

---

## 🔧 トラブルシューティング

### 問題1: 翻訳が表示されない

**症状**: 言語を切り替えても翻訳が表示されず、`[Translation Missing]`が表示される

**原因と解決策**:

```typescript
// 1. データベース確認
const translations = await prisma.translation.findMany({
  where: { 
    entityType: 'menu_item',
    entityId: '123',
    languageCode: 'ko' 
  }
})
console.log('Translations:', translations)
// → 空配列の場合: 翻訳データが存在しない

// 2. 翻訳ジョブの状態確認
const job = await prisma.translationJob.findFirst({
  where: {
    entityType: 'menu_item',
    entityId: '123'
  },
  orderBy: { createdAt: 'desc' }
})
console.log('Job status:', job?.status)
console.log('Error details:', job?.errorDetails)
// → status='failed'の場合: 翻訳ジョブが失敗

// 3. 手動で翻訳を再実行
const engine = getTranslationEngine()
await engine.translateEntity(
  'menu_item',
  '123',
  'ja',
  { name: '商品名', description: '説明' },
  ['ko']  // 失敗した言語のみ
)
```

### 問題2: 翻訳ジョブが完了しない

**症状**: 翻訳ジョブのstatusが`pending`のまま変わらない

**原因と解決策**:

```typescript
// 1. バックグラウンドワーカーの状態確認
// hotel-common のログを確認
// → ワーカーが起動していない可能性

// 2. 手動でジョブを処理
import { TranslationJobProcessor } from '~/services/i18n/job-processor'

const processor = new TranslationJobProcessor()
await processor.processJob('job_abc123')

// 3. Google Translate API の認証確認
// .env ファイルを確認
// GOOGLE_TRANSLATE_API_KEY=your_api_key_here
```

### 問題3: フォールバックが機能しない

**症状**: 韓国語翻訳がない場合に英語が表示されず、空白になる

**原因と解決策**:

```typescript
// API側でフォールバック処理を実装
const getTranslationWithFallback = async (
  entityType: string,
  entityId: string,
  fieldName: string,
  languageCode: string
): Promise<string> => {
  // 1. 指定言語を試す
  let translation = await prisma.translation.findFirst({
    where: { entityType, entityId, languageCode, fieldName }
  })
  
  if (translation) return translation.translatedText
  
  // 2. 英語を試す
  if (languageCode !== 'en') {
    translation = await prisma.translation.findFirst({
      where: { entityType, entityId, languageCode: 'en', fieldName }
    })
    if (translation) return translation.translatedText
  }
  
  // 3. 日本語を試す
  if (languageCode !== 'ja') {
    translation = await prisma.translation.findFirst({
      where: { entityType, entityId, languageCode: 'ja', fieldName }
    })
    if (translation) return translation.translatedText
  }
  
  return '[Translation Missing]'
}
```

### 問題4: キャッシュが更新されない

**症状**: 翻訳を更新したのに古い翻訳が表示され続ける

**原因と解決策**:

```typescript
// 翻訳更新時にキャッシュを無効化
const updateTranslation = async (
  translationId: string,
  newText: string
) => {
  const translation = await prisma.translation.update({
    where: { id: translationId },
    data: { translatedText: newText }
  })
  
  // ✅ キャッシュ無効化
  const cacheKey = `translations:${translation.entityType}:${translation.entityId}:${translation.languageCode}`
  await redis.del(cacheKey)
  
  return translation
}
```

---

## ❌ よくある間違いと修正方法

### 間違い1: 言語別カラムを追加

```sql
-- ❌ 間違い
ALTER TABLE items ADD COLUMN name_en TEXT;
ALTER TABLE items ADD COLUMN name_ko TEXT;
```

**✅ 修正**:
```sql
-- translationsテーブルを使用
INSERT INTO translations (entity_type, entity_id, language_code, field_name, translated_text)
VALUES ('item', '123', 'en', 'name', 'Item Name');
```

### 間違い2: 直接日本語を書く

```vue
<!-- ❌ 間違い -->
<h1>メニュー</h1>
```

**✅ 修正**:
```vue
<!-- 翻訳キーを使用 -->
<h1>{{ $t('menu.title') }}</h1>
```

### 間違い3: 言語パラメータを忘れる

```typescript
// ❌ 間違い
const items = await $fetch('/api/v1/guest/items')
```

**✅ 修正**:
```typescript
// 言語パラメータを含める
const { locale } = useI18n()
const items = await $fetch('/api/v1/guest/items', {
  params: { lang: locale.value }
})
```

### 間違い4: 自動翻訳オプションを忘れる

```typescript
// ❌ 間違い: 自動翻訳オプションなし
await $fetch('/api/v1/admin/items/create', {
  method: 'POST',
  body: { name_ja: '商品名', description_ja: '説明' }
})
```

**✅ 修正**:
```typescript
// 自動翻訳オプションを含める
await $fetch('/api/v1/admin/items/create', {
  method: 'POST',
  body: {
    name_ja: '商品名',
    description_ja: '説明',
    auto_translate: true  // ✅ 追加
  }
})
```

### 間違い5: entity_idの型不一致

```typescript
// ❌ 間違い: Int型のIDを数値で保存
await prisma.translation.create({
  data: {
    entityType: 'menu_item',
    entityId: 123,  // ← 数値（エラー）
    ...
  }
})
```

**✅ 修正**:
```typescript
// Int型のIDは文字列化して保存
await prisma.translation.create({
  data: {
    entityType: 'menu_item',
    entityId: String(123),  // ← 文字列化
    ...
  }
})
```

---

## 📋 実装時の質問フロー

```
新機能を実装する
    ↓
ユーザー向けテキストがある？
    ↓ YES
データベースに保存する？
    ↓ YES
translationsテーブルを使用
    ↓
管理画面で編集する？
    ↓ YES
自動翻訳UIを実装
    ↓
客室端末で表示する？
    ↓ YES
言語切り替え対応
    ↓
テスト実施
    ↓
完了
```

---

## 📚 参考資料

### 公式ドキュメント
- [Google Cloud Translation API](https://cloud.google.com/translate/docs)
- [Nuxt I18n](https://i18n.nuxtjs.org/)
- [PostgreSQL Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)

### 内部ドキュメント
- [SSOT_MULTILINGUAL_SYSTEM.md](./SSOT_MULTILINGUAL_SYSTEM.md) - 多言語化システム仕様
- [DATABASE_NAMING_STANDARD.md](/Users/kaneko/hotel-kanri/docs/standards/DATABASE_NAMING_STANDARD.md) - 命名規則
- [API_ROUTING_GUIDELINES.md](/Users/kaneko/hotel-kanri/docs/01_systems/saas/API_ROUTING_GUIDELINES.md) - APIルーティング

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-10-07 | 初版作成（SSOT_MULTILINGUAL_SYSTEM.md v2.0.0から分離） |

---

**作成者**: Iza（統合管理者）  
**承認者**: -  
**次回レビュー予定**: Phase 1実装開始時

