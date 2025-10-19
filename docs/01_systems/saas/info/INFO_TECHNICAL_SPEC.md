---
title: インフォメーション機能 技術実装仕様書
version: 1.0
date: 2025-01-27
status: 技術仕様確定中
---

# インフォメーション機能 技術実装仕様書

## 1. アーキテクチャ概要

### 1.1 システム構成
```
[フロントエンド]
├── 客室UI (Vue 3 + Nuxt 3)
│   ├── インフォメーション一覧・詳細画面
│   └── 多言語切替・検索機能
└── 管理画面 (Vue 3 + Nuxt 3)
    ├── ドラッグ&ドロップエディタ
    ├── 承認ワークフロー
    └── 権限管理

[バックエンド]
├── API Layer (Nitro)
│   ├── コンテンツAPI
│   ├── 翻訳API
│   └── メディア管理API
├── データ層 (Prisma + SQLite)
│   ├── 記事・翻訳データ
│   ├── メディアファイル管理
│   └── 権限・ワークフロー管理
└── ストレージ層
    ├── データベース (SQLite)
    └── メディアファイル (ローカルファイルシステム)
```

### 1.2 技術スタック
- **フロントエンド**: Vue 3 Composition API, Nuxt 3, TypeScript
- **UI Framework**: Tailwind CSS, Headless UI
- **エディタ**: GrapesJS または Builder.io SDK
- **バックエンド**: Nitro (Nuxt Server), Prisma ORM
- **データベース**: SQLite (開発・本番)
- **翻訳**: DeepL API (優先), OpenAI GPT-4 (フォールバック)
- **ファイル処理**: Sharp.js (画像), FFmpeg (動画)
- **認証**: JWT + セッション管理
- **キャッシュ**: Redis (メモリキャッシュ)

## 2. ドラッグ&ドロップエディタ実装

### 2.1 エディタ選定
#### **候補1: GrapesJS**
```typescript
// package.json
{
  "dependencies": {
    "grapesjs": "^0.20.4",
    "grapesjs-preset-webpage": "^1.0.3",
    "grapesjs-blocks-basic": "^1.0.2"
  }
}

// components/admin/ContentEditor.vue
import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'

const editor = grapesjs.init({
  container: '#gjs',
  plugins: ['gjs-blocks-basic', 'gjs-preset-webpage'],
  storageManager: false,
  blockManager: {
    appendTo: '#blocks',
    blocks: [
      {
        id: 'text',
        label: 'テキスト',
        content: '<div data-gjs-type="text">テキストを入力</div>'
      },
      {
        id: 'image',
        label: '画像',
        content: '<img src="https://via.placeholder.com/300x200" />'
      }
    ]
  }
})
```

#### **候補2: Builder.io SDK**
```typescript
// Builder.ioの統合例
import { builder, Builder } from '@builder.io/sdk'

Builder.register('insertMenu', {
  name: 'Hotel Info Component',
  inputs: [
    { name: 'title', type: 'string' },
    { name: 'content', type: 'richText' },
    { name: 'image', type: 'file' }
  ]
})
```

### 2.2 カスタムコンポーネント
```typescript
// エディタ用コンポーネント定義
const hotelComponents = [
  {
    id: 'hotel-header',
    label: 'ホテルヘッダー',
    template: `
      <div class="hotel-header bg-gray-100 p-6">
        <h1 class="text-2xl font-bold" data-editable="title">タイトル</h1>
        <p class="text-gray-600" data-editable="subtitle">サブタイトル</p>
      </div>
    `
  },
  {
    id: 'facility-card',
    label: '施設カード',
    template: `
      <div class="facility-card border rounded-lg p-4">
        <img src="" alt="" class="w-full h-48 object-cover rounded" data-editable="image" />
        <h3 class="text-lg font-semibold mt-2" data-editable="title">施設名</h3>
        <p class="text-gray-600" data-editable="description">説明文</p>
      </div>
    `
  }
]
```

### 2.3 リアルタイムプレビュー
```typescript
// composables/useContentEditor.ts
export const useContentEditor = () => {
  const editorRef = ref(null)
  const currentContent = ref('')

  const initEditor = () => {
    const editor = grapesjs.init({
      container: editorRef.value,
      height: '600px',
      storageManager: false,
      canvas: {
        styles: ['/css/tailwind.css'] // Tailwind CSSを適用
      }
    })

    // リアルタイムプレビュー更新
    editor.on('component:update', () => {
      currentContent.value = editor.getHtml()
    })

    return editor
  }

  return { initEditor, currentContent }
}
```

## 3. 多言語・翻訳システム

### 3.1 翻訳サービス統合
```typescript
// server/utils/translation.ts
import { Configuration, OpenAIApi } from 'openai'

interface TranslationService {
  translate(text: string, targetLang: string): Promise<string>
}

class DeepLTranslator implements TranslationService {
  async translate(text: string, targetLang: string): Promise<string> {
    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang.toUpperCase()
      })
    })

    const result = await response.json()
    return result.translations[0].text
  }
}

class OpenAITranslator implements TranslationService {
  private openai: OpenAIApi

  constructor() {
    this.openai = new OpenAIApi(new Configuration({
      apiKey: process.env.OPENAI_API_KEY
    }))
  }

  async translate(text: string, targetLang: string): Promise<string> {
    const prompt = `Translate the following hotel information to ${targetLang}:\n\n${text}`

    const response = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000
    })

    return response.data.choices[0].message?.content || text
  }
}

// フォールバック機能付き翻訳サービス
export class TranslationManager {
  private services: TranslationService[]

  constructor() {
    this.services = [
      new DeepLTranslator(),
      new OpenAITranslator()
    ]
  }

  async translate(text: string, targetLang: string): Promise<string> {
    for (const service of this.services) {
      try {
        return await service.translate(text, targetLang)
      } catch (error) {
        console.warn('Translation service failed, trying next:', error)
        continue
      }
    }

    // すべて失敗した場合は元のテキストを返す
    return text
  }
}
```

### 3.2 翻訳品質管理
```typescript
// server/utils/translationQuality.ts
export class TranslationQualityManager {
  private hotelTerms = new Map([
    ['フロント', 'Front Desk'],
    ['ルームサービス', 'Room Service'],
    ['コンシェルジュ', 'Concierge'],
    ['スパ', 'Spa'],
    ['フィットネス', 'Fitness Center']
  ])

  // 用語統一チェック
  checkTermConsistency(originalText: string, translatedText: string): boolean {
    for (const [japanese, english] of this.hotelTerms) {
      if (originalText.includes(japanese) && !translatedText.includes(english)) {
        return false
      }
    }
    return true
  }

  // 翻訳結果の後処理
  postProcessTranslation(text: string, targetLang: string): string {
    if (targetLang === 'en') {
      // 固有名詞の統一
      text = text.replace(/Hotel Name/g, process.env.HOTEL_NAME || 'Our Hotel')
      // 通貨表記の統一
      text = text.replace(/¥(\d+)/g, '¥$1 (approx. $' + (parseInt('$1') * 0.007).toFixed(0) + ')')
    }
    return text
  }
}
```

## 4. ファイル管理システム

### 4.1 メディアアップロード
```typescript
// server/api/uploads/media.post.ts
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  const form = await readMultipartFormData(event)
  const file = form?.find(item => item.name === 'file')

  if (!file) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ファイルが見つかりません'
    })
  }

  // ファイルサイズチェック
  const maxSize = file.type?.startsWith('image/') ? 5 * 1024 * 1024 : 50 * 1024 * 1024
  if (file.data.length > maxSize) {
    throw createError({
      statusCode: 413,
      statusMessage: 'ファイルサイズが上限を超えています'
    })
  }

  // ファイル名生成
  const timestamp = Date.now()
  const ext = path.extname(file.filename || '')
  const filename = `${timestamp}${ext}`
  const filepath = `uploads/info/${filename}`

  // 画像の場合は圧縮・リサイズ
  if (file.type?.startsWith('image/')) {
    const optimizedBuffer = await sharp(file.data)
      .resize(1920, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()

    await fs.writeFile(filepath, optimizedBuffer)
  } else {
    await fs.writeFile(filepath, file.data)
  }

  // データベースに記録
  const mediaFile = await prisma.infoMediaFile.create({
    data: {
      fileName: file.filename || filename,
      filePath: filepath,
      fileSize: file.data.length,
      mimeType: file.type || 'application/octet-stream',
      fileType: file.type?.startsWith('image/') ? 'image' : 'video'
    }
  })

  return {
    id: mediaFile.id,
    url: `/${filepath}`,
    filename: mediaFile.fileName,
    size: mediaFile.fileSize
  }
})
```

### 4.2 動画処理
```typescript
// server/utils/videoProcessor.ts
import ffmpeg from 'fluent-ffmpeg'
import { promises as fs } from 'fs'

export class VideoProcessor {
  static async optimizeVideo(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('1280x720')
        .videoBitrate('1000k')
        .audioBitrate('128k')
        .format('mp4')
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath)
    })
  }

  static async generateThumbnail(videoPath: string, thumbnailPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['50%'],
          filename: 'thumbnail.jpg',
          folder: path.dirname(thumbnailPath),
          size: '320x240'
        })
        .on('end', resolve)
        .on('error', reject)
    })
  }
}
```

## 5. キャッシュ・パフォーマンス最適化

### 5.1 Redis キャッシュ
```typescript
// server/utils/cache.ts
import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
})

export class CacheManager {
  static async get<T>(key: string): Promise<T | null> {
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  static async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value))
  }

  static async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }

  // コンテンツ特有のキャッシュ
  static async cacheArticle(article: any): Promise<void> {
    await Promise.all([
      this.set(`article:${article.id}`, article, 3600),
      this.set(`article:slug:${article.slug}`, article, 3600)
    ])
  }

  static async invalidateArticle(articleId: number): Promise<void> {
    await this.invalidate(`article:${articleId}*`)
  }
}
```

### 5.2 画像最適化
```typescript
// composables/useImageOptimization.ts
export const useImageOptimization = () => {
  const generateSrcSet = (basePath: string) => {
    const sizes = [320, 640, 1024, 1920]
    return sizes
      .map(size => `${basePath}?w=${size} ${size}w`)
      .join(', ')
  }

  const generateSizes = () => {
    return '(max-width: 320px) 280px, (max-width: 640px) 600px, (max-width: 1024px) 980px, 1920px'
  }

  return { generateSrcSet, generateSizes }
}
```

## 6. セキュリティ実装

### 6.1 HTMLサニタイゼーション
```typescript
// server/utils/sanitizer.ts
import DOMPurify from 'dompurify'
import { JSDOM } from 'jsdom'

const window = new JSDOM('').window
const purify = DOMPurify(window)

export class ContentSanitizer {
  static sanitizeHTML(html: string): string {
    return purify.sanitize(html, {
      ALLOWED_TAGS: [
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'img', 'video', 'audio', 'source',
        'a', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li',
        'table', 'thead', 'tbody', 'tr', 'th', 'td'
      ],
      ALLOWED_ATTR: [
        'class', 'id', 'src', 'alt', 'href', 'title',
        'width', 'height', 'controls', 'autoplay', 'loop'
      ],
      FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover']
    })
  }

  static validateCSS(css: string): string {
    // 危険なCSS関数を除去
    const dangerous = [
      'expression', 'javascript:', 'vbscript:',
      'data:', 'import', '@import'
    ]

    let safeCss = css
    dangerous.forEach(pattern => {
      safeCss = safeCss.replace(new RegExp(pattern, 'gi'), '')
    })

    return safeCss
  }
}
```

### 6.2 権限チェックミドルウェア
```typescript
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  if (event.node.req.url?.startsWith('/api/admin/')) {
    const token = getCookie(event, 'auth-token') || getHeader(event, 'authorization')?.replace('Bearer ', '')

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: '認証が必要です'
      })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      event.context.user = decoded

      // 権限チェック
      const requiredRole = getRequiredRole(event.node.req.url)
      if (requiredRole && !hasPermission(decoded.role, requiredRole)) {
        throw createError({
          statusCode: 403,
          statusMessage: '権限がありません'
        })
      }
    } catch (error) {
      throw createError({
        statusCode: 401,
        statusMessage: '無効なトークンです'
      })
    }
  }
})

function hasPermission(userRole: string, requiredRole: string): boolean {
  const hierarchy = {
    'admin': 3,    // 支配人
    'front': 2,    // フロント
    'kitchen': 1   // キッチン
  }

  return (hierarchy[userRole] || 0) >= (hierarchy[requiredRole] || 0)
}
```

## 7. データベース最適化

### 7.1 インデックス戦略
```sql
-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_info_article_category_status ON InfoArticle(category, status);
CREATE INDEX idx_info_article_lang_featured ON InfoArticle(lang, featured);
CREATE INDEX idx_info_article_display_period ON InfoArticle(startAt, endAt);
CREATE INDEX idx_info_media_article_type ON InfoMediaFile(articleId, fileType);
CREATE INDEX idx_info_translation_article_lang ON InfoTranslation(articleId, lang);

-- 全文検索用のFTSテーブル
CREATE VIRTUAL TABLE InfoArticleFTS USING fts5(
  title, content, category, tags,
  content='InfoArticle',
  content_rowid='id'
);

-- FTSトリガー
CREATE TRIGGER InfoArticle_ai AFTER INSERT ON InfoArticle BEGIN
  INSERT INTO InfoArticleFTS(rowid, title, content, category, tags)
  VALUES (new.id, new.title, new.content, new.category, new.tags);
END;
```

### 7.2 データベース接続プール
```typescript
// server/utils/database.ts
import { PrismaClient } from '@prisma/client'

class DatabaseManager {
  private static instance: PrismaClient

  public static getInstance(): PrismaClient {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new PrismaClient({
        log: ['error', 'warn'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      })
    }
    return DatabaseManager.instance
  }

  public static async disconnect(): Promise<void> {
    if (DatabaseManager.instance) {
      await DatabaseManager.instance.$disconnect()
    }
  }
}

export const prisma = DatabaseManager.getInstance()
```

## 8. モニタリング・ログ

### 8.1 パフォーマンス監視
```typescript
// server/middleware/monitoring.ts
export default defineEventHandler(async (event) => {
  const start = process.hrtime.bigint()

  event.node.res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1000000 // ms

    // メトリクス記録
    console.log({
      timestamp: new Date().toISOString(),
      method: event.node.req.method,
      url: event.node.req.url,
      statusCode: event.node.res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      userAgent: getHeader(event, 'user-agent')
    })

    // 遅いリクエストの警告
    if (duration > 3000) {
      console.warn(`Slow request detected: ${event.node.req.url} took ${duration.toFixed(2)}ms`)
    }
  })
})
```

### 8.2 エラートラッキング
```typescript
// server/utils/errorHandler.ts
export class ErrorTracker {
  static logError(error: Error, context: any = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
      level: 'error'
    }

    // ファイルログ
    console.error(JSON.stringify(errorLog))

    // 将来的に外部サービス（Sentry等）に送信
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error, { extra: context })
    }
  }
}
```

## 9. テスト戦略

### 9.1 ユニットテスト
```typescript
// tests/utils/translation.test.ts
import { describe, it, expect, vi } from 'vitest'
import { TranslationManager } from '~/server/utils/translation'

describe('TranslationManager', () => {
  it('should translate text successfully', async () => {
    const manager = new TranslationManager()
    const result = await manager.translate('こんにちは', 'en')

    expect(result).toBe('Hello')
  })

  it('should fallback on service failure', async () => {
    // モックサービスを作成してテスト
    const mockService = vi.fn().mockRejectedValue(new Error('Service down'))
    const manager = new TranslationManager()

    // フォールバック動作をテスト
  })
})
```

### 9.2 E2Eテスト
```typescript
// tests/e2e/content-management.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Content Management', () => {
  test('should create and publish article', async ({ page }) => {
    // ログイン
    await page.goto('/admin/login')
    await page.fill('[data-testid=username]', 'admin')
    await page.fill('[data-testid=password]', 'password')
    await page.click('[data-testid=login-button]')

    // 記事作成
    await page.goto('/admin/info/create')
    await page.fill('[data-testid=title]', 'テスト記事')
    await page.fill('[data-testid=content]', 'テスト内容')

    // 公開
    await page.click('[data-testid=publish-button]')

    // 確認
    await expect(page.locator('[data-testid=success-message]')).toBeVisible()
  })
})
```

## 10. デプロイメント・CI/CD

### 10.1 Docker設定
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションコピー
COPY . .

# ビルド
RUN npm run build

# Sharp用のライブラリ
RUN apk add --no-cache libc6-compat

EXPOSE 3100

CMD ["npm", "start"]
```

### 10.2 環境設定
```bash
# .env.production
DATABASE_URL="postgresql://hotel_app:${DB_PASSWORD}@localhost:5432/hotel_unified_db"
DEEPL_API_KEY="your_deepl_key"
OPENAI_API_KEY="your_openai_key"
JWT_SECRET="your_jwt_secret"
REDIS_HOST="localhost"
REDIS_PORT="6379"
NODE_ENV="production"
```

この技術仕様書により、インフォメーション機能の実装に必要な具体的な技術詳細が明確になりました。各コンポーネントの実装方法、パフォーマンス最適化、セキュリティ対策、監視・運用方法まで網羅的にカバーしています。
