# [Foundation] tenant_settings 基盤実装

**対象リポジトリ**: hotel-common-rebuild  
**優先度**: 🔴 Urgent（全機能の基盤）  
**SSOT**: `docs/03_ssot/00_foundation/SSOT_MARKETING_INTEGRATION.md`

---

## 📋 概要

Marketing Injection の「Config First」ルールを実現するための設定管理基盤を実装する。
これにより、テナントごとの設定値をハードコードせずDB管理できるようになる。

**依存タスク**（この基盤完了後に実装可能になる）:
- DEV-0172/0173: ハンドオフ設定（timeout_seconds, fallback_phone）
- AI機能: AIキャラクター設定（welcome_message, personality）
- 全機能: テナント固有の設定値

---

## 🚨 絶対禁止

- any型の使用
- tenant_idなしのクエリ
- ハードコードされた設定値（このタスクで解消する側）
- SSOTに定義されていないエンドポイント追加

---

## 📚 参照SSOT

```bash
cat /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_MARKETING_INTEGRATION.md
cat /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md
```

---

## 🔧 Item 1: Prismaスキーマ追加

**ファイル**: `prisma/schema.prisma`

末尾に追加:

```prisma
/// テナント設定（Config First対応）
/// Marketing Injection: ハードコード禁止のための設定管理
model TenantSettings {
  id        Int      @id @default(autoincrement())
  tenantId  String   @map("tenant_id")
  category  String   @map("category")    // 'handoff' | 'ai_character' | 'campaigns' | 'pricing' | 'display'
  key       String   @map("key")
  value     Json     @map("value")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, category, key], map: "idx_tenant_settings_unique")
  @@index([tenantId], map: "idx_tenant_settings_tenant")
  @@index([category], map: "idx_tenant_settings_category")
  @@map("tenant_settings")
}
```

**Tenantモデルにリレーション追加**:

```prisma
model Tenant {
  // ... 既存フィールド
  
  // 追加
  settings  TenantSettings[]
}
```

---

## 🔧 Item 2: マイグレーション実行

```bash
npx prisma migrate dev --name add_tenant_settings
npx prisma generate
```

---

## 🔧 Item 3: Config Serviceの作成

**ファイル**: `src/services/config.service.ts`

```typescript
import prisma from '../lib/prisma'
import { getRedisClient } from '../lib/redis'

const CACHE_TTL_SECONDS = 60

export interface ConfigValue {
  category: string
  key: string
  value: unknown
}

/**
 * テナント設定を取得（Redis キャッシュ付き）
 * 
 * @param tenantId - テナントID
 * @param category - カテゴリ（'handoff', 'ai_character', 'pricing', etc.）
 * @param key - 設定キー
 * @returns 設定値（見つからない場合はnull）
 */
export async function getConfig<T = unknown>(
  tenantId: string,
  category: string,
  key: string
): Promise<T | null> {
  const cacheKey = `config:${tenantId}:${category}:${key}`
  
  try {
    // 1. Redisから取得
    const redis = getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached) as T
    }
  } catch (error) {
    console.warn('[ConfigService] Redis cache miss or error:', error)
  }
  
  // 2. DBから取得
  const setting = await prisma.tenantSettings.findUnique({
    where: {
      tenantId_category_key: {
        tenantId,
        category,
        key
      }
    }
  })
  
  if (!setting) {
    return null
  }
  
  // 3. キャッシュ保存
  try {
    const redis = getRedisClient()
    await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(setting.value))
  } catch (error) {
    console.warn('[ConfigService] Redis cache write error:', error)
  }
  
  return setting.value as T
}

/**
 * テナント設定を保存（キャッシュ無効化付き）
 */
export async function setConfig(
  tenantId: string,
  category: string,
  key: string,
  value: unknown
): Promise<ConfigValue> {
  const cacheKey = `config:${tenantId}:${category}:${key}`
  
  // 1. DB更新（upsert）
  const setting = await prisma.tenantSettings.upsert({
    where: {
      tenantId_category_key: {
        tenantId,
        category,
        key
      }
    },
    update: {
      value: value as object
    },
    create: {
      tenantId,
      category,
      key,
      value: value as object
    }
  })
  
  // 2. キャッシュ無効化
  try {
    const redis = getRedisClient()
    await redis.del(cacheKey)
  } catch (error) {
    console.warn('[ConfigService] Redis cache delete error:', error)
  }
  
  return {
    category: setting.category,
    key: setting.key,
    value: setting.value
  }
}

/**
 * カテゴリ内の全設定を取得
 */
export async function getConfigsByCategory(
  tenantId: string,
  category: string
): Promise<ConfigValue[]> {
  const settings = await prisma.tenantSettings.findMany({
    where: { tenantId, category },
    orderBy: { key: 'asc' }
  })
  
  return settings.map(s => ({
    category: s.category,
    key: s.key,
    value: s.value
  }))
}

/**
 * 設定を削除
 */
export async function deleteConfig(
  tenantId: string,
  category: string,
  key: string
): Promise<void> {
  const cacheKey = `config:${tenantId}:${category}:${key}`
  
  await prisma.tenantSettings.delete({
    where: {
      tenantId_category_key: {
        tenantId,
        category,
        key
      }
    }
  })
  
  try {
    const redis = getRedisClient()
    await redis.del(cacheKey)
  } catch (error) {
    console.warn('[ConfigService] Redis cache delete error:', error)
  }
}
```

---

## 🔧 Item 4: Admin API Router作成

**ファイル**: `src/routes/admin/settings.routes.ts`

```typescript
import { Router, Request, Response } from 'express'
import { createSuccessResponse, createErrorResponse } from '../../utils/response-helpers'
import { getConfig, setConfig, getConfigsByCategory, deleteConfig } from '../../services/config.service'

const router = Router()

/**
 * GET /api/v1/admin/settings/:category
 * カテゴリ内の全設定を取得
 */
router.get('/:category', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenantId
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Tenant context required'))
    }
    
    const { category } = req.params
    const settings = await getConfigsByCategory(tenantId, category)
    
    return res.json(createSuccessResponse({
      category,
      settings
    }))
  } catch (error: unknown) {
    console.error('[Settings API] Get category error:', error)
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get settings'))
  }
})

/**
 * GET /api/v1/admin/settings/:category/:key
 * 単一設定を取得
 */
router.get('/:category/:key', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenantId
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Tenant context required'))
    }
    
    const { category, key } = req.params
    const value = await getConfig(tenantId, category, key)
    
    if (value === null) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', `Setting not found: ${category}/${key}`))
    }
    
    return res.json(createSuccessResponse({
      category,
      key,
      value
    }))
  } catch (error: unknown) {
    console.error('[Settings API] Get setting error:', error)
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get setting'))
  }
})

/**
 * PUT /api/v1/admin/settings/:category/:key
 * 設定を保存（作成または更新）
 */
router.put('/:category/:key', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenantId
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Tenant context required'))
    }
    
    const { category, key } = req.params
    const { value } = req.body
    
    if (value === undefined) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'value is required'))
    }
    
    const result = await setConfig(tenantId, category, key, value)
    
    return res.json(createSuccessResponse(result))
  } catch (error: unknown) {
    console.error('[Settings API] Set setting error:', error)
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to save setting'))
  }
})

/**
 * DELETE /api/v1/admin/settings/:category/:key
 * 設定を削除
 */
router.delete('/:category/:key', async (req: Request, res: Response) => {
  try {
    const tenantId = req.context?.tenantId
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Tenant context required'))
    }
    
    const { category, key } = req.params
    
    await deleteConfig(tenantId, category, key)
    
    return res.json(createSuccessResponse({ deleted: true }))
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return res.status(404).json(createErrorResponse('NOT_FOUND', `Setting not found: ${category}/${key}`))
    }
    console.error('[Settings API] Delete setting error:', error)
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to delete setting'))
  }
})

export default router
```

---

## 🔧 Item 5: ルーター登録

**ファイル**: `src/server/index.ts`

authMiddleware **の後** に追加（Admin API）:

```typescript
import settingsRouter from '../routes/admin/settings.routes'

// Admin API（認証必須）
app.use('/api/v1/admin/settings', settingsRouter)
```

---

## 🔧 Item 6: デフォルト設定のシード

**ファイル**: `prisma/seed-config.ts`（新規作成）

```typescript
import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

const DEFAULT_CONFIGS = [
  // Handoff設定
  { category: 'handoff', key: 'timeout_seconds', value: 60 },
  { category: 'handoff', key: 'fallback_phone', value: '内線100' },
  { category: 'handoff', key: 'max_context_size', value: 10240 },
  
  // AI Character設定
  { category: 'ai_character', key: 'name', value: 'おもてなしAI' },
  { category: 'ai_character', key: 'welcome_message', value: 'いらっしゃいませ！ご用件をお聞かせください。' },
  
  // Display設定
  { category: 'display', key: 'business_hours', value: { start: '07:00', end: '23:00' } },
]

async function seedConfigs(tenantId: string) {
  console.log(`Seeding configs for tenant: ${tenantId}`)
  
  for (const config of DEFAULT_CONFIGS) {
    await prisma.tenantSettings.upsert({
      where: {
        tenantId_category_key: {
          tenantId,
          category: config.category,
          key: config.key
        }
      },
      update: {},
      create: {
        tenantId,
        category: config.category,
        key: config.key,
        value: config.value as object
      }
    })
    console.log(`  ✓ ${config.category}/${config.key}`)
  }
}

async function main() {
  // テスト用テナントにシード
  const testTenantId = 'tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7'
  await seedConfigs(testTenantId)
  console.log('✅ Config seed completed')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

実行:
```bash
npx ts-node prisma/seed-config.ts
```

---

## 🔧 Item 7: ビルド確認

```bash
npm run build
```

エラーがないことを確認。

---

## 🔧 Item 8: 動作確認

### サーバー起動

```bash
npm run dev
```

### GET テスト（カテゴリ一覧）

```bash
curl http://localhost:3401/api/v1/admin/settings/handoff \
  -H "Cookie: session=YOUR_SESSION_COOKIE" | jq .
```

### GET テスト（単一設定）

```bash
curl http://localhost:3401/api/v1/admin/settings/handoff/timeout_seconds \
  -H "Cookie: session=YOUR_SESSION_COOKIE" | jq .
```

### PUT テスト（設定更新）

```bash
curl -X PUT http://localhost:3401/api/v1/admin/settings/handoff/timeout_seconds \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION_COOKIE" \
  -d '{"value": 90}' | jq .
```

---

## ✅ 完了チェックリスト

- [ ] `prisma/schema.prisma` にTenantSettingsモデル追加
- [ ] Tenantモデルにsettingsリレーション追加
- [ ] マイグレーション成功
- [ ] `src/services/config.service.ts` 作成
- [ ] `src/routes/admin/settings.routes.ts` 作成
- [ ] `src/server/index.ts` にルーター登録
- [ ] ビルド成功（TypeScriptエラーなし）
- [ ] シードデータ投入成功
- [ ] GET API（カテゴリ）が 200 を返す
- [ ] GET API（単一）が 200 を返す
- [ ] PUT API が 200 を返す

---

## 📝 完了報告

```markdown
## [Foundation] tenant_settings 完了報告

### 実装内容
- TenantSettingsモデル（Prisma）
- config.service.ts（getConfig/setConfig + Redis キャッシュ）
- settings.routes.ts（CRUD API）
- シードデータ

### Evidence
- マイグレーション成功ログ: (貼付)
- GET API成功ログ: (貼付)
- PUT API成功ログ: (貼付)

### 次のタスク
- [Foundation] Analytics基盤実装
- DEV-0172/0173のConfig参照への修正
```

---

## 🔗 この基盤を使う側の修正例

**handoff.routes.ts の修正（DEV-0172）**:

```typescript
// Before（ハードコード）
const HANDOFF_CONFIG = {
  timeoutSeconds: 60,
  fallbackPhone: '内線100'
}

// After（Config参照）
import { getConfig } from '../../services/config.service'

const timeoutSeconds = await getConfig<number>(tenantId, 'handoff', 'timeout_seconds') ?? 60
const fallbackPhone = await getConfig<string>(tenantId, 'handoff', 'fallback_phone') ?? '内線100'
```
