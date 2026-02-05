# DEV-0172 Part 1: hotel-common ハンドオフAPI実装

**対象リポジトリ**: hotel-common-rebuild  
**タスクID**: DEV-0172 (Part 1/2)

---

## 📋 概要

AIチャットからスタッフへ問い合わせを引き継ぐ「ハンドオフ」機能のゲスト向けAPIを実装する。

---

## 🚨 絶対禁止

- any型の使用
- tenant_idなしのクエリ
- ハードコードされたタイムアウト値
- SSOTに定義されていないエンドポイント追加

---

## 📚 参照SSOT

このファイルを読んでから作業開始:

```bash
cat /Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md
cat /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md
```

---

## 🔧 Item 0: 事前確認

### Step 0-1: Prismaスキーマ確認

```bash
grep -A 30 "model HandoffRequest" prisma/schema.prisma
```

**確認項目**:
- [ ] HandoffRequestモデルが存在する
- [ ] tenant_idフィールドがある
- [ ] HandoffStatus enumが存在する

### Step 0-2: マイグレーション実行（未実行の場合）

```bash
npx prisma migrate dev --name add_handoff_tables
npx prisma generate
```

---

## 🔧 Item 1: ルートファイル作成

**ファイル**: `src/routes/guest/handoff.routes.ts`

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
  maxContextSize: 10 * 1024
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
    
    if (!sessionId) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'sessionId is required'))
    }
    
    const contextSize = JSON.stringify(context || {}).length
    if (contextSize > HANDOFF_CONFIG.maxContextSize) {
      return res.status(400).json(createErrorResponse('CONTEXT_TOO_LARGE', `context exceeds ${HANDOFF_CONFIG.maxContextSize} bytes`))
    }
    
    const timeoutAt = new Date()
    timeoutAt.setSeconds(timeoutAt.getSeconds() + HANDOFF_CONFIG.timeoutSeconds)
    
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
      where: { id, tenantId, roomId }
    })
    
    if (!handoffRequest) {
      return res.status(404).json(createErrorResponse('NOT_FOUND', 'Handoff request not found'))
    }
    
    const now = new Date()
    let status = handoffRequest.status
    if (status === HandoffStatus.PENDING && now >= handoffRequest.timeoutAt) {
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

---

## 🔧 Item 2: ルーター登録

**ファイル**: `src/server/index.ts`

authMiddleware **より前** に追加:

```typescript
import handoffGuestRouter from '../routes/guest/handoff.routes'

// Guest API（認証ミドルウェア外）- authMiddlewareより前に配置
app.use('/api/v1/guest/handoff', handoffGuestRouter)
```

---

## 🔧 Item 3: ビルド確認

```bash
npm run build
```

エラーがないことを確認。

---

## 🔧 Item 4: 動作確認

### サーバー起動

```bash
npm run dev
```

### POST テスト

```bash
curl -X POST http://localhost:3401/api/v1/guest/handoff/requests \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
  -H "x-room-id: room-test-001" \
  -d '{
    "sessionId": "chat_session_test_001",
    "channel": "front_desk",
    "context": {"currentTopic": "reservation"}
  }' | jq .
```

**期待**: `{ "success": true, "data": { "id": "...", "status": "pending", ... } }`

### GET テスト

```bash
# 上記で取得したIDを使用
curl http://localhost:3401/api/v1/guest/handoff/requests/YOUR_ID \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
  -H "x-room-id: room-test-001" | jq .
```

---

## ✅ 完了チェックリスト

- [ ] `src/routes/guest/handoff.routes.ts` 作成
- [ ] `src/server/index.ts` にルーター登録
- [ ] ビルド成功（TypeScriptエラーなし）
- [ ] POST API が 201 を返す
- [ ] GET API が 200 を返す
- [ ] バリデーションエラーが正しく返る

---

## 📝 完了報告

```markdown
## DEV-0172 Part 1 完了報告

### 実装内容
- handoff.routes.ts（POST/GET）
- index.ts ルーター登録

### Evidence
- POST成功ログ: (貼付)
- GET成功ログ: (貼付)

### 次のタスク
- DEV-0172 Part 2: hotel-saas プロキシ実装
```
