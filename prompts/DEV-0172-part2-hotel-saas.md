# DEV-0172 Part 2: hotel-saas ハンドオフAPIプロキシ実装

**対象リポジトリ**: hotel-saas-rebuild  
**タスクID**: DEV-0172 (Part 2/2)  
**前提**: Part 1（hotel-common API）が完了していること

---

## 📋 概要

hotel-common に実装済みのハンドオフAPIをプロキシするNuxt APIを実装する。

---

## 🚨 絶対禁止

- Prisma直接使用（hotel-saasでは禁止）
- $fetch直接使用（callHotelCommonAPIを使う）
- any型の使用

---

## 📚 参照

```bash
# 既存プロキシパターンの確認
cat server/api/v1/guest/orders/active.get.ts
cat server/utils/guest-helpers.ts
cat server/utils/api-helpers.ts
```

---

## 🔧 Item 0: 事前確認

### Step 0-1: hotel-commonが起動していることを確認

```bash
curl -s http://localhost:3401/health | jq .
```

### Step 0-2: hotel-common APIが動作することを確認

```bash
curl -X POST http://localhost:3401/api/v1/guest/handoff/requests \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
  -H "x-room-id: room-test-001" \
  -d '{"sessionId": "test"}' | jq .success
```

期待: `true`

---

## 🔧 Item 1: ディレクトリ作成

```bash
mkdir -p server/api/v1/guest/handoff/requests
```

---

## 🔧 Item 2: POSTプロキシ作成

**ファイル**: `server/api/v1/guest/handoff/requests.post.ts`

```typescript
import { defineEventHandler, readBody } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-helpers'
import { ensureGuestContext } from '~/server/utils/guest-helpers'

export default defineEventHandler(async (event) => {
  const { tenantId, roomId } = await ensureGuestContext(event)
  const body = await readBody(event)
  
  return await callHotelCommonAPI(event, '/api/v1/guest/handoff/requests', {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
      'x-room-id': roomId
    },
    body
  })
})
```

---

## 🔧 Item 3: GETプロキシ作成

**ファイル**: `server/api/v1/guest/handoff/requests/[id].get.ts`

```typescript
import { defineEventHandler } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-helpers'
import { ensureGuestContext } from '~/server/utils/guest-helpers'

export default defineEventHandler(async (event) => {
  const { tenantId, roomId } = await ensureGuestContext(event)
  const id = event.context.params?.id
  
  if (!id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }
  
  return await callHotelCommonAPI(event, `/api/v1/guest/handoff/requests/${id}`, {
    method: 'GET',
    headers: {
      'x-tenant-id': tenantId,
      'x-room-id': roomId
    }
  })
})
```

---

## 🔧 Item 4: 動作確認

### サーバー起動

```bash
npm run dev
```

### hotel-saas経由でPOSTテスト

```bash
curl -X POST http://localhost:3101/api/v1/guest/handoff/requests \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
  -d '{
    "sessionId": "chat_session_saas_test",
    "channel": "front_desk",
    "context": {"currentTopic": "test"}
  }' | jq .
```

### hotel-saas経由でGETテスト

```bash
# 上記で取得したIDを使用
curl http://localhost:3101/api/v1/guest/handoff/requests/YOUR_ID \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" | jq .
```

---

## 🔧 Item 5: 標準テスト

```bash
cd /Users/kaneko/hotel-kanri/scripts
./test-standard-guest.sh
echo "終了コード: $?"
```

---

## ✅ 完了チェックリスト

- [ ] `server/api/v1/guest/handoff/requests.post.ts` 作成
- [ ] `server/api/v1/guest/handoff/requests/[id].get.ts` 作成
- [ ] hotel-saas経由でPOSTが成功
- [ ] hotel-saas経由でGETが成功
- [ ] 標準テストがパス

---

## 📝 完了報告

```markdown
## DEV-0172 Part 2 完了報告

### 実装内容
- server/api/v1/guest/handoff/requests.post.ts
- server/api/v1/guest/handoff/requests/[id].get.ts

### Evidence
- POST成功ログ: (貼付)
- GET成功ログ: (貼付)
- 標準テスト結果: exit 0

### 次のタスク
- DEV-0173: UI実装（AIChatWidget連携）
```
