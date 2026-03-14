# DEV-0203: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフ

**タスクタイプ**: fullstack
**推定工数**: 27時間
**生成日時**: 2026-01-18T00:30:51.296Z

---

## 🚨 【自動挿入】実装中断の基準（全タスク共通）

**絶対ルール**: 以下の場合、実装を即座に停止してユーザーに報告する

### 必須停止トリガー（Layer 1）
1. **SSOT照合失敗（0件）** or **SSOT複数一致**
   - grep -nE でSSO**T**定義を検索したが0件、または2件以上
2. **ルーティング不一致**
   - `/api/v1/admin` 形式外
   - 深いネスト（`/api/v1/admin/[親]/[id]/[子]/[id]`）
   - 二重`/api`（`/api/api/`）
   - `index.*`ファイル（hotel-saas）
3. **システム境界違反**
   - hotel-commonにNitro構成（`server/api/`）存在
   - hotel-saasでPrisma直接使用
   - hotel-saasで`$fetch`直接使用（Cookie未転送）
4. **依存ファイル非実在・未生成**
5. **型エラー連鎖（>5件/1ステップ）**
6. **Prismaスキーマ変更・直接SQL**
7. **tenant_idフォールバック/環境分岐**
8. **矛盾の発見**
9. **エラー原因不明（15分以上）**

---

# DEV-0203: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフ - Backend API実装

## 🚨 重要：実装中断の基準（必読）

**絶対ルール**: 以下の場合、実装を即座に停止してユーザーに報告する

### 必須停止トリガー（Layer 1）
1. SSOT照合失敗（0件）or SSOT複数一致
2. ルーティング不一致（深いネスト/二重付与/index.*ファイル）
3. システム境界違反（saasでPrisma直/saasで$fetch直）
4. 依存ファイル非実在
5. 型エラー連鎖（>5件）
6. Prismaスキーマ変更
7. tenant_idフォールバック/環境分岐
8. エラー原因不明（15分以上）

---

## 📖 必読SSOT

| ドキュメント | パス |
|:------------|:-----|
| **メインSSOT** | `docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md` |
| **APIレジストリ** | `docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md` |
| **ルーティング** | `docs/01_systems/saas/API_ROUTING_GUIDELINES.md` |
| **命名規則** | `docs/standards/DATABASE_NAMING_STANDARD.md` |

---

## 📋 実装対象

### 要件一覧（12件）

| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-001 | ハンドオフリクエスト作成 | FR | sessionId、guestId、channel、contextを含むリクエストが作成される, 作 |
| HDF-002 | スタッフ通知 | FR | フロントデスクPC/タブレットにポップアップ通知が表示される, ゲスト情報（部屋番号、氏名）と問い合 |
| HDF-003 | タイムアウト処理 | FR | カウントダウン表示が0になると電話CTAを表示, ハンドオフステータスが"TIMEOUT"に更新され |
| HDF-004 | 夜間自動無効化 | FR | 指定時間帯はハンドオフボタンが非表示, 「夜間のため、緊急時のみフロントデスクまでお電話ください」を |
| HDF-100 | 性能要件 | NFR |  |
| HDF-101 | セキュリティ要件 | NFR |  |
| HDF-102 | 可用性要件 | NFR |  |
| HDF-200 | 画面一覧 | UI |  |
| HDF-201 | 多言語対応 | UI |  |
| HDF-202 | アクセシビリティ | UI |  |
| HDF-300 | ROI | BIZ |  |
| HDF-301 | KPI | BIZ |  |


### API一覧（4件）

| Method | Path | 説明 |
|:-------|:-----|:-----|
| POST | `/api/v1/handoff/requests` | ハンドオフリクエストを作成 |
| GET | `/api/v1/handoff/requests/:id` | ハンドオフリクエストの詳細を取得 |
| PATCH | `/api/v1/handoff/requests/:id/status` | ステータスを更新 |
| GET | `/api/v1/handoff/requests` | リクエスト一覧を取得 |


---

## Item 1: 事前調査（必須・15分）

### Step 1: SSOT確認
```bash
# SSOT読み込み
cat docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md

# API定義を確認
grep -nE '^(GET|POST|PUT|PATCH|DELETE)' docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md
```

### Step 2: 既存実装調査
```bash
# 類似ルートファイル確認
ls -la hotel-common-rebuild/src/routes/

# 命名パターン確認
head -50 hotel-common-rebuild/src/routes/guest-orders.routes.ts
```

### Step 3: 完了条件
- [ ] 全要件ID（12件）を把握した
- [ ] 全APIエンドポイント（4件）を把握した
- [ ] Accept条件を把握した
- [ ] 既存実装の命名規則を確認した

---

## Item 2: ルートファイル作成

### Step 1: ファイル作成
```bash
touch hotel-common-rebuild/src/routes/handoff.routes.ts
```

### Step 2: 基本構造
```typescript
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { 
  createSuccessResponse, 
  createErrorResponse 
} from '../utils/response-helpers';

const router = Router();


/**
 * POST /api/v1/handoff/requests
 * ハンドオフリクエストを作成
 */
router.post('/requests', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です'));
    }
    const body = req.body;

    // TODO: ビジネスロジック実装
    const result = await prisma.handoff.create({
      where: { tenant_id: tenantId }
    });

    return res.status(201).json(createSuccessResponse(result));
  } catch (error) {
    console.error('/api/v1/handoff/requests エラー:', error);
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'サーバーエラー'));
  }
});


/**
 * GET /api/v1/handoff/requests/:id
 * ハンドオフリクエストの詳細を取得
 */
router.get('/requests/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です'));
    }
    const { id } = req.params;

    // TODO: ビジネスロジック実装
    const result = await prisma.handoff.findMany({
      where: { tenant_id: tenantId }
    });

    return res.status(200).json(createSuccessResponse(result));
  } catch (error) {
    console.error('/api/v1/handoff/requests/:id エラー:', error);
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'サーバーエラー'));
  }
});


/**
 * PATCH /api/v1/handoff/requests/:id/status
 * ステータスを更新
 */
router.patch('/requests/:id/status', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です'));
    }
    const { id } = req.params;
    const body = req.body;

    // TODO: ビジネスロジック実装
    const result = await prisma.handoff.update({
      where: { tenant_id: tenantId }
    });

    return res.status(200).json(createSuccessResponse(result));
  } catch (error) {
    console.error('/api/v1/handoff/requests/:id/status エラー:', error);
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'サーバーエラー'));
  }
});


/**
 * GET /api/v1/handoff/requests
 * リクエスト一覧を取得
 */
router.get('/requests', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です'));
    }

    // TODO: ビジネスロジック実装
    const result = await prisma.handoff.findMany({
      where: { tenant_id: tenantId }
    });

    return res.status(200).json(createSuccessResponse(result));
  } catch (error) {
    console.error('/api/v1/handoff/requests エラー:', error);
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'サーバーエラー'));
  }
});

export default router;
```

### Step 3: ルーター登録
`hotel-common-rebuild/src/server/index.ts` に追加:

```typescript
import handoffRouter from '../routes/handoff.routes';

// 認証ミドルウェア前に登録（Guestの場合）
app.use('/api/v1/handoff', handoffRouter);
```

### Step 4: 完了条件
- [ ] `handoff.routes.ts` が作成された
- [ ] `index.ts` にルーター登録された
- [ ] TypeScript型エラーがない

---

## Item 3: hotel-saasプロキシ実装

### Step 1: プロキシファイル作成
```bash
mkdir -p hotel-saas-rebuild/server/api/v1/handoff
```

### Step 2: 各エンドポイントのプロキシ作成


### POST /api/v1/handoff/requests

ファイル: `server/api/v1/handoffrequests.post.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';
import { ensureGuestContext } from '~/server/utils/guest-context';

export default defineEventHandler(async (event) => {
  const { tenantId } = await ensureGuestContext(event);
  
  const response = await callHotelCommonAPI(event, '/api/v1/handoff/requests', {
    method: 'POST',
    headers: { 'x-tenant-id': tenantId },
    body: await readBody(event)
  });
  
  return response;
});
```


### GET /api/v1/handoff/requests/:id

ファイル: `server/api/v1/handoffrequests/[id].get.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';
import { ensureGuestContext } from '~/server/utils/guest-context';

export default defineEventHandler(async (event) => {
  const { tenantId } = await ensureGuestContext(event);
  
  const response = await callHotelCommonAPI(event, '/api/v1/handoff/requests/:id', {
    method: 'GET',
    headers: { 'x-tenant-id': tenantId }
  });
  
  return response;
});
```


### PATCH /api/v1/handoff/requests/:id/status

ファイル: `server/api/v1/handoffrequests/[id]/status.patch.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';
import { ensureGuestContext } from '~/server/utils/guest-context';

export default defineEventHandler(async (event) => {
  const { tenantId } = await ensureGuestContext(event);
  
  const response = await callHotelCommonAPI(event, '/api/v1/handoff/requests/:id/status', {
    method: 'PATCH',
    headers: { 'x-tenant-id': tenantId },
    body: await readBody(event)
  });
  
  return response;
});
```


### GET /api/v1/handoff/requests

ファイル: `server/api/v1/handoffrequests.get.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';
import { ensureGuestContext } from '~/server/utils/guest-context';

export default defineEventHandler(async (event) => {
  const { tenantId } = await ensureGuestContext(event);
  
  const response = await callHotelCommonAPI(event, '/api/v1/handoff/requests', {
    method: 'GET',
    headers: { 'x-tenant-id': tenantId }
  });
  
  return response;
});
```

### Step 3: 完了条件
- [ ] 全プロキシファイルが作成された
- [ ] `callHotelCommonAPI` を使用している
- [ ] `$fetch` 直接使用がない
- [ ] `x-tenant-id` ヘッダーを付与している

---

## Item 4: 動作確認

### Step 1: サーバー起動
```bash
# hotel-common
cd hotel-common-rebuild && npm run dev &

# hotel-saas
cd hotel-saas-rebuild && npm run dev &
```

### Step 2: API動作確認

```bash
# POST /api/v1/handoff/requests
curl -s -X POST http://localhost:3401/api/v1/handoff/requests \
  -H 'x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7' \
  -H 'Content-Type: application/json' \
  -d '{"key": "value"}' | jq .
```

```bash
# GET /api/v1/handoff/requests/:id
curl -s http://localhost:3401/api/v1/handoff/requests/1 \
  -H 'x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7' | jq .
```

```bash
# PATCH /api/v1/handoff/requests/:id/status
curl -s -X PATCH http://localhost:3401/api/v1/handoff/requests/1/status \
  -H 'x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7' \
  -H 'Content-Type: application/json' \
  -d '{"key": "value"}' | jq .
```

```bash
# GET /api/v1/handoff/requests
curl -s http://localhost:3401/api/v1/handoff/requests \
  -H 'x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7' | jq .
```

### Step 3: 完了条件
- [ ] hotel-common直接で正常レスポンス
- [ ] hotel-saas経由で正常レスポンス
- [ ] エラーケースも確認

---

## Item 5: テスト実行

### Step 1: 標準テスト
```bash
# ゲストAPI用
./scripts/test-standard-guest.sh 2>&1 | tee evidence/DEV-0203/test.log

# または管理画面API用
./scripts/test-standard-admin.sh 2>&1 | tee evidence/DEV-0203/test.log
```

### Step 2: Evidence保存
```bash
mkdir -p evidence/DEV-0203
echo "=== DEV-0203 Evidence ===" > evidence/DEV-0203/commands.log
git status --short >> evidence/DEV-0203/commands.log
ls -la hotel-common-rebuild/src/routes/handoff.routes.ts >> evidence/DEV-0203/commands.log
```

### Step 3: 完了条件
- [ ] 標準テストがPASS
- [ ] Evidenceログが保存された

---

## ✅ 最終チェックリスト

### 実装
- [ ] HDF-001: ハンドオフリクエスト作成
- [ ] HDF-002: スタッフ通知
- [ ] HDF-003: タイムアウト処理
- [ ] HDF-004: 夜間自動無効化
- [ ] HDF-100: 性能要件
- [ ] HDF-101: セキュリティ要件
- [ ] HDF-102: 可用性要件
- [ ] HDF-200: 画面一覧
- [ ] HDF-201: 多言語対応
- [ ] HDF-202: アクセシビリティ
- [ ] HDF-300: ROI
- [ ] HDF-301: KPI

### 品質
- [ ] TypeScript型エラーなし
- [ ] Prisma直接使用なし（hotel-saas）
- [ ] `$fetch`直接使用なし
- [ ] tenant_idフィルタあり
- [ ] エラーハンドリング実装

### テスト
- [ ] 標準テストPASS
- [ ] 手動API確認完了
- [ ] Evidence保存完了

---

## 📝 完了報告テンプレート

```markdown
## ✅ DEV-0203 完了報告

### 参照SSOT
- docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md

### 実装成果物
- `hotel-common-rebuild/src/routes/handoff.routes.ts`
- `hotel-saas-rebuild/server/api/v1/handoff/`

### テスト結果
- 標準テスト: ✅ PASS

### Evidence
- `evidence/DEV-0203/`
```
