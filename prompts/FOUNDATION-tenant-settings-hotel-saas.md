# [Foundation] tenant_settings プロキシ実装

**対象リポジトリ**: hotel-saas-rebuild  
**優先度**: 🔴 Urgent  
**前提**: hotel-common の tenant_settings API が完了していること

---

## 📋 概要

hotel-common に実装済みの tenant_settings API をプロキシするNuxt APIを実装する。

---

## 🚨 絶対禁止

- Prisma直接使用（hotel-saasでは禁止）
- $fetch直接使用（callHotelCommonAPIを使う）
- any型の使用

---

## 📚 参照

```bash
# 既存プロキシパターンの確認
cat server/utils/api-helpers.ts
cat server/api/v1/admin/menu/categories.get.ts
```

---

## 🔧 Item 0: 事前確認

### hotel-commonが起動していることを確認

```bash
curl -s http://localhost:3401/health | jq .
```

### hotel-common Settings APIが動作することを確認

```bash
# セッションCookieを取得してからテスト
curl http://localhost:3401/api/v1/admin/settings/handoff \
  -H "Cookie: session=YOUR_SESSION" | jq .success
```

期待: `true`

---

## 🔧 Item 1: ディレクトリ作成

```bash
mkdir -p server/api/v1/admin/settings
```

---

## 🔧 Item 2: カテゴリ一覧取得API

**ファイル**: `server/api/v1/admin/settings/[category].get.ts`

```typescript
import { defineEventHandler } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-helpers'

export default defineEventHandler(async (event) => {
  const category = event.context.params?.category
  
  if (!category) {
    throw createError({ statusCode: 400, message: 'category is required' })
  }
  
  return await callHotelCommonAPI(event, `/api/v1/admin/settings/${category}`, {
    method: 'GET'
  })
})
```

---

## 🔧 Item 3: 単一設定取得API

**ファイル**: `server/api/v1/admin/settings/[category]/[key].get.ts`

```typescript
import { defineEventHandler } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-helpers'

export default defineEventHandler(async (event) => {
  const category = event.context.params?.category
  const key = event.context.params?.key
  
  if (!category || !key) {
    throw createError({ statusCode: 400, message: 'category and key are required' })
  }
  
  return await callHotelCommonAPI(event, `/api/v1/admin/settings/${category}/${key}`, {
    method: 'GET'
  })
})
```

---

## 🔧 Item 4: 設定保存API

**ファイル**: `server/api/v1/admin/settings/[category]/[key].put.ts`

```typescript
import { defineEventHandler, readBody } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-helpers'

export default defineEventHandler(async (event) => {
  const category = event.context.params?.category
  const key = event.context.params?.key
  
  if (!category || !key) {
    throw createError({ statusCode: 400, message: 'category and key are required' })
  }
  
  const body = await readBody(event)
  
  return await callHotelCommonAPI(event, `/api/v1/admin/settings/${category}/${key}`, {
    method: 'PUT',
    body
  })
})
```

---

## 🔧 Item 5: 設定削除API

**ファイル**: `server/api/v1/admin/settings/[category]/[key].delete.ts`

```typescript
import { defineEventHandler } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-helpers'

export default defineEventHandler(async (event) => {
  const category = event.context.params?.category
  const key = event.context.params?.key
  
  if (!category || !key) {
    throw createError({ statusCode: 400, message: 'category and key are required' })
  }
  
  return await callHotelCommonAPI(event, `/api/v1/admin/settings/${category}/${key}`, {
    method: 'DELETE'
  })
})
```

---

## 🔧 Item 6: 動作確認

### サーバー起動

```bash
npm run dev
```

### hotel-saas経由でGETテスト

```bash
# ログインしてCookieを取得後
curl http://localhost:3101/api/v1/admin/settings/handoff \
  -H "Cookie: session=YOUR_SESSION" | jq .
```

### hotel-saas経由でPUTテスト

```bash
curl -X PUT http://localhost:3101/api/v1/admin/settings/handoff/timeout_seconds \
  -H "Content-Type: application/json" \
  -H "Cookie: session=YOUR_SESSION" \
  -d '{"value": 120}' | jq .
```

---

## 🔧 Item 7: 標準テスト

```bash
cd /Users/kaneko/hotel-kanri/scripts
./test-standard-admin.sh
echo "終了コード: $?"
```

---

## ✅ 完了チェックリスト

- [ ] `server/api/v1/admin/settings/[category].get.ts` 作成
- [ ] `server/api/v1/admin/settings/[category]/[key].get.ts` 作成
- [ ] `server/api/v1/admin/settings/[category]/[key].put.ts` 作成
- [ ] `server/api/v1/admin/settings/[category]/[key].delete.ts` 作成
- [ ] hotel-saas経由でGETが成功
- [ ] hotel-saas経由でPUTが成功
- [ ] 標準テストがパス

---

## 📝 完了報告

```markdown
## [Foundation] tenant_settings プロキシ完了報告

### 実装内容
- server/api/v1/admin/settings/[category].get.ts
- server/api/v1/admin/settings/[category]/[key].get.ts
- server/api/v1/admin/settings/[category]/[key].put.ts
- server/api/v1/admin/settings/[category]/[key].delete.ts

### Evidence
- GET成功ログ: (貼付)
- PUT成功ログ: (貼付)
- 標準テスト結果: exit 0

### 次のタスク
- [Foundation] Analytics基盤実装
```

---

## 🔗 Composable作成（任意）

管理画面で設定を簡単に取得するためのComposableを作成:

**ファイル**: `composables/useConfig.ts`

```typescript
export function useConfig() {
  const getConfig = async <T = unknown>(category: string, key: string): Promise<T | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: { value: T } }>(
        `/api/v1/admin/settings/${category}/${key}`
      )
      return response.success ? response.data.value : null
    } catch (error) {
      console.error(`[useConfig] Failed to get ${category}/${key}:`, error)
      return null
    }
  }
  
  const setConfig = async <T = unknown>(category: string, key: string, value: T): Promise<boolean> => {
    try {
      const response = await $fetch<{ success: boolean }>(
        `/api/v1/admin/settings/${category}/${key}`,
        {
          method: 'PUT',
          body: { value }
        }
      )
      return response.success
    } catch (error) {
      console.error(`[useConfig] Failed to set ${category}/${key}:`, error)
      return false
    }
  }
  
  return { getConfig, setConfig }
}
```

**使用例**:

```typescript
const { getConfig, setConfig } = useConfig()

// 取得
const timeout = await getConfig<number>('handoff', 'timeout_seconds')

// 更新
await setConfig('handoff', 'timeout_seconds', 90)
```
