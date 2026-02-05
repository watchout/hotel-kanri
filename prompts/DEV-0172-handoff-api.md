# DEV-0172: ハンドオフAPI実装

**タスクID**: DEV-0172  
**タイプ**: 実装  
**優先度**: High  
**依存**: DEV-0171（完了済み）

---

## 📋 概要

AIチャットからスタッフへ問い合わせを引き継ぐ「ハンドオフ」機能のゲスト向けAPIを実装する。

---

## 🎯 ゴール

1. ゲストがハンドオフリクエストを作成できる（POST）
2. ゲストが自分のリクエスト状態を確認できる（GET）
3. hotel-saas経由でAPIにアクセスできる

---

## 🚨 絶対禁止（CRITICAL）

```
❌ Prisma直接使用（hotel-saasで）
❌ $fetch直接使用（hotel-saasで）
❌ any型の使用
❌ tenant_idなしのクエリ
❌ ハードコードされたタイムアウト値（Config化必須）
❌ SSOTに定義されていないエンドポイント追加
```

---

## 📚 参照SSOT（必ず読むこと）

1. `/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md`
2. `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md`
3. `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md`

---

## 🔧 Item 0: 事前調査（実装前に必ず実行）

### Step 0-1: Prismaスキーマ確認

```bash
cat /Users/kaneko/hotel-common-rebuild/prisma/schema.prisma | grep -A 30 "model HandoffRequest"
```

**確認項目**:
- [ ] HandoffRequestモデルが存在する
- [ ] HandoffStatusのenumが存在する
- [ ] tenant_idフィールドがある
- [ ] Tenantへのリレーションがある

### Step 0-2: 既存ルーター構造確認

```bash
ls -la /Users/kaneko/hotel-common-rebuild/src/routes/guest/
```

**確認項目**:
- [ ] guest/ディレクトリ構造を把握
- [ ] 既存のゲストAPIパターンを確認

### Step 0-3: hotel-saasプロキシパターン確認

```bash
cat /Users/kaneko/hotel-saas-rebuild/server/api/v1/guest/orders/active.get.ts
```

**確認項目**:
- [ ] ensureGuestContextの使い方
- [ ] callHotelCommonAPIの使い方
- [ ] x-tenant-id, x-room-idヘッダーの渡し方

---

## 🔧 Item 1: hotel-common ルーター実装

### Step 1-1: ルートファイル作成

**ファイル**: `/Users/kaneko/hotel-common-rebuild/src/routes/guest/handoff.routes.ts`

```typescript
import { Router, Request, Response } from 'express'
import { PrismaClient, HandoffStatus } from '@prisma/client'
import { createSuccessResponse, createErrorResponse } from '../../utils/response'
import { getRequiredHeader } from '../../utils/headers'

const router = Router()
const prisma = new PrismaClient()

// Config（将来的にはDBから取得）
const HANDOFF_CONFIG = {
  timeoutSeconds: 60,
  fallbackPhone: '内線100',
  maxContextSize: 10 * 1024 // 10KB
}

/**
 * POST /api/v1/guest/handoff/requests
 * ハンドオフリクエストを作成
 */
router.post('/requests', async (req: Request, res: Response) => {
  try {
    const tenantId = getRequiredHeader(req, 'x-tenant-id')
    const roomId = getRequiredHeader(req, 'x-room-id')
    
    const { sessionId, channel = 'front_desk', context } = req.body
    
    // バリデーション
    if (!sessionId) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'sessionId is required'))
    }
    
    // context サイズチェック
    const contextSize = JSON.stringify(context || {}).length
    if (contextSize > HANDOFF_CONFIG.maxContextSize) {
      return res.status(400).json(createErrorResponse('CONTEXT_TOO_LARGE', `context exceeds ${HANDOFF_CONFIG.maxContextSize} bytes`))
    }
    
    // タイムアウト時刻を計算
    const timeoutAt = new Date()
    timeoutAt.setSeconds(timeoutAt.getSeconds() + HANDOFF_CONFIG.timeoutSeconds)
    
    // リクエスト作成
    const handoffRequest = await prisma.handoffRequest.create({
      data: {
        tenantId,
        roomId,
        sessionId,
        channel,
        context: context || {},
        status: HandoffStatus.PENDING,
        timeoutAt
      }
    })
    
    return res.status(201).json(createSuccessResponse({
      id: handoffRequest.id,
      status: handoffRequest.status.toLowerCase(),
      createdAt: handoffRequest.createdAt.toISOString(),
      estimatedWaitTime: HANDOFF_CONFIG.timeoutSeconds,
      fallbackPhoneNumber: HANDOFF_CONFIG.fallbackPhone
    }))
    
  } catch (error: any) {
    if (error.message === 'MISSING_HEADER') {
      return res.status(400).json(createErrorResponse('MISSING_HEADER', error.headerName))
    }
    console.error('Handoff create error:', error)
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create handoff request'))
  }
})

/**
 * GET /api/v1/guest/handoff/requests/:id
 * 自分のリクエスト詳細を取得
 */
router.get('/requests/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getRequiredHeader(req, 'x-tenant-id')
    const roomId = getRequiredHeader(req, 'x-room-id')
    const { id } = req.params
    
    const handoffRequest = await prisma.handoffRequest.findFirst({
      where: {
        id,
        tenantId,
        roomId // 自分の部屋のリクエストのみ
      }
    })
    
    if (!handoffRequest) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', 'Handoff request not found'))
    }
    
    // タイムアウトチェック
    const now = new Date()
    let status = handoffRequest.status
    if (status === HandoffStatus.PENDING && now >= handoffRequest.timeoutAt) {
      // タイムアウト更新
      await prisma.handoffRequest.update({
        where: { id },
        data: { status: HandoffStatus.TIMEOUT }
      })
      status = HandoffStatus.TIMEOUT
    }
    
    return res.json(createSuccessResponse({
      id: handoffRequest.id,
      status: status.toLowerCase(),
      createdAt: handoffRequest.createdAt.toISOString(),
      timeoutAt: handoffRequest.timeoutAt.toISOString(),
      acceptedAt: handoffRequest.acceptedAt?.toISOString() || null,
      completedAt: handoffRequest.completedAt?.toISOString() || null,
      fallbackPhoneNumber: HANDOFF_CONFIG.fallbackPhone
    }))
    
  } catch (error: any) {
    if (error.message === 'MISSING_HEADER') {
      return res.status(400).json(createErrorResponse('MISSING_HEADER', error.headerName))
    }
    console.error('Handoff get error:', error)
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get handoff request'))
  }
})

export default router
```

### Step 1-2: ルーター登録

**ファイル**: `/Users/kaneko/hotel-common-rebuild/src/server/index.ts`

認証ミドルウェア（authMiddleware）**より前**に追加:

```typescript
import handoffGuestRouter from '../routes/guest/handoff.routes'

// Guest API（認証ミドルウェア外）
app.use('/api/v1/guest/handoff', handoffGuestRouter)
```

### Step 1-3: ビルド確認

```bash
cd /Users/kaneko/hotel-common-rebuild
npm run build
```

**確認項目**:
- [ ] TypeScriptエラーがない
- [ ] ビルドが成功する

---

## 🔧 Item 2: hotel-saas プロキシ実装

### Step 2-1: POSTプロキシ作成

**ファイル**: `/Users/kaneko/hotel-saas-rebuild/server/api/v1/guest/handoff/requests.post.ts`

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

### Step 2-2: GETプロキシ作成

**ファイル**: `/Users/kaneko/hotel-saas-rebuild/server/api/v1/guest/handoff/requests/[id].get.ts`

```typescript
import { defineEventHandler } from 'h3'
import { callHotelCommonAPI } from '~/server/utils/api-helpers'
import { ensureGuestContext } from '~/server/utils/guest-helpers'

export default defineEventHandler(async (event) => {
  const { tenantId, roomId } = await ensureGuestContext(event)
  const id = event.context.params?.id
  
  return await callHotelCommonAPI(event, `/api/v1/guest/handoff/requests/${id}`, {
    method: 'GET',
    headers: {
      'x-tenant-id': tenantId,
      'x-room-id': roomId
    }
  })
})
```

### Step 2-3: ディレクトリ作成確認

```bash
mkdir -p /Users/kaneko/hotel-saas-rebuild/server/api/v1/guest/handoff/requests
```

---

## 🔧 Item 3: マイグレーション実行

### Step 3-1: マイグレーション生成

```bash
cd /Users/kaneko/hotel-common-rebuild
npx prisma migrate dev --name add_handoff_tables
```

### Step 3-2: クライアント生成

```bash
npx prisma generate
```

**確認項目**:
- [ ] マイグレーションが成功
- [ ] handoff_requestsテーブルが作成された

---

## 🔧 Item 4: 動作確認

### Step 4-1: サーバー起動

```bash
# ターミナル1: hotel-common
cd /Users/kaneko/hotel-common-rebuild
npm run dev

# ターミナル2: hotel-saas
cd /Users/kaneko/hotel-saas-rebuild
npm run dev
```

### Step 4-2: hotel-common直接テスト

```bash
# POST - ハンドオフリクエスト作成
curl -X POST http://localhost:3401/api/v1/guest/handoff/requests \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
  -H "x-room-id: room-test-001" \
  -d '{
    "sessionId": "chat_session_test_001",
    "channel": "front_desk",
    "context": {
      "lastMessages": [{"role": "user", "content": "予約変更したい"}],
      "currentTopic": "reservation"
    }
  }' | jq .
```

**期待レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "status": "pending",
    "createdAt": "...",
    "estimatedWaitTime": 60,
    "fallbackPhoneNumber": "内線100"
  }
}
```

### Step 4-3: GET確認

```bash
# 上記で取得したIDを使用
HANDOFF_ID="<上記レスポンスのid>"

curl http://localhost:3401/api/v1/guest/handoff/requests/$HANDOFF_ID \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
  -H "x-room-id: room-test-001" | jq .
```

### Step 4-4: hotel-saas経由テスト

```bash
# hotel-saas経由でPOST（デバイス認証が必要な場合はCookie設定）
curl -X POST http://localhost:3101/api/v1/guest/handoff/requests \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
  -d '{
    "sessionId": "chat_session_test_002",
    "channel": "front_desk",
    "context": {"currentTopic": "room_service"}
  }' | jq .
```

---

## 🔧 Item 5: エラーケース確認

### Step 5-1: バリデーションエラー

```bash
# sessionIdなし
curl -X POST http://localhost:3401/api/v1/guest/handoff/requests \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
  -H "x-room-id: room-test-001" \
  -d '{"channel": "front_desk"}' | jq .
```

**期待**: 400 VALIDATION_ERROR

### Step 5-2: 認証エラー

```bash
# x-tenant-idなし
curl -X POST http://localhost:3401/api/v1/guest/handoff/requests \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test"}' | jq .
```

**期待**: 400 MISSING_HEADER

### Step 5-3: 存在しないID

```bash
curl http://localhost:3401/api/v1/guest/handoff/requests/nonexistent-id \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
  -H "x-room-id: room-test-001" | jq .
```

**期待**: 404 NOT_FOUND

---

## ✅ 完了チェックリスト

### 実装確認
- [ ] handoff.routes.ts が作成された
- [ ] index.ts にルーター登録された
- [ ] hotel-saas プロキシが作成された（POST/GET）
- [ ] TypeScriptエラーがない

### 動作確認
- [ ] POST /api/v1/guest/handoff/requests が201を返す
- [ ] GET /api/v1/guest/handoff/requests/:id が200を返す
- [ ] hotel-saas経由でもアクセス可能
- [ ] バリデーションエラーが正しく返る

### SSOT準拠
- [ ] APIパスがSSOT_API_REGISTRY.mdと一致
- [ ] レスポンス形式が { success: true, data: {...} }
- [ ] タイムアウト値がConfig化されている

---

## 📝 完了報告フォーマット

```markdown
## DEV-0172 完了報告

### 実装内容
- hotel-common: handoff.routes.ts（POST/GET）
- hotel-saas: プロキシ2ファイル
- マイグレーション: add_handoff_tables

### Evidence
- POST成功ログ: (ここに貼り付け)
- GET成功ログ: (ここに貼り付け)
- エラーケースログ: (ここに貼り付け)

### テスト結果
- [ ] 全テストPass

### 次のタスク
- DEV-0173: UI実装（AIChatWidget連携）
```

---

## ⚠️ エラー時の対処

### ビルドエラー
```bash
# 依存関係の再インストール
cd /Users/kaneko/hotel-common-rebuild
rm -rf node_modules
npm install
npm run build
```

### マイグレーションエラー
```bash
# スキーマ確認
npx prisma validate
# DBリセット（開発環境のみ）
npx prisma migrate reset
```

### 実装中断基準
以下の場合は**ユーザーに確認**してから続行:
- SSOTに定義されていない機能追加が必要な場合
- 既存APIの変更が必要な場合
- セキュリティに関わる判断が必要な場合
