# DEV-0200: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフ

**タスクタイプ**: fullstack
**推定工数**: 27時間
**生成日時**: 2026-01-18T00:02:44.751Z

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

# DEV-0200: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフ - Backend API実装

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
- **メインSSOT**: `docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md`
- **APIレジストリ**: `docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md`
- **ルーティング**: `docs/01_systems/saas/API_ROUTING_GUIDELINES.md`
- **命名規則**: `docs/standards/DATABASE_NAMING_STANDARD.md`

---

## 📋 実装対象

### 要件一覧

| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-001 | ハンドオフリクエスト作成 | FR | 3件 |


| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-002 | スタッフ通知 | FR | 3件 |


| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-003 | タイムアウト処理 | FR | 3件 |


| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-004 | 夜間自動無効化 | FR | 2件 |


| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-100 | 性能要件 | NFR | 0件 |


| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-101 | セキュリティ要件 | NFR | 0件 |


| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-102 | 可用性要件 | NFR | 0件 |


| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-200 | 画面一覧 | UI | 0件 |


| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-201 | 多言語対応 | UI | 0件 |


| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-202 | アクセシビリティ | UI | 0件 |


| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-300 | ROI | BIZ | 0件 |


| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| HDF-301 | KPI | BIZ | 0件 |


### API一覧

| Method | Path | 説明 |
|:-------|:-----|:-----|
| POST | `/api/v1/handoff/requests` | ハンドオフリクエストを作成 |


| Method | Path | 説明 |
|:-------|:-----|:-----|
| GET | `/api/v1/handoff/requests/:id` | ハンドオフリクエストの詳細を取得 |


| Method | Path | 説明 |
|:-------|:-----|:-----|
| PATCH | `/api/v1/handoff/requests/:id/status` | ステータスを更新 |


| Method | Path | 説明 |
|:-------|:-----|:-----|
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

**確認項目**:
- [ ] 全要件IDを把握した
- [ ] 全APIエンドポイントを把握した
- [ ] Accept条件を把握した

### Step 2: 既存実装調査
```bash
# 類似ルートファイル確認
ls -la hotel-common-rebuild/src/routes/

# 命名パターン確認
head -50 hotel-common-rebuild/src/routes/guest-orders.routes.ts
```

**確認項目**:
- [ ] 命名規則を把握した（`xxx.routes.ts`形式）
- [ ] 認証ミドルウェアの配置を確認した

### Step 3: スコープ判定
- [ ] 実装対象のファイル一覧を決定した
- [ ] 実装順序を決定した

---

## Item 2: データベース実装（DB定義がある場合）


### Step 1: Prismaスキーマ確認
```bash
# 現在のスキーマ確認
cat hotel-common-rebuild/prisma/schema.prisma | grep -A 20 "model {{database.0.name}}"
```

**⚠️ 注意**: Prismaスキーマ変更が必要な場合は**実装停止**し、ユーザーに報告

### Step 2: マイグレーション（必要な場合のみ）
```bash
cd hotel-common-rebuild

# スキーマ変更後
npx prisma migrate dev --name add_{{lowercase database.0.name}}_table

# クライアント生成
npx prisma generate
```


---

## Item 3: ルートファイル作成

### Step 1: ファイル作成
```bash
# ルートファイル作成
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

// TODO: エンドポイント実装

export default router;
```

### Step 3: ルーター登録
`hotel-common-rebuild/src/server/index.ts` に追加:

```typescript
import handoffRouter from '../routes/handoff.routes';

// 認証ミドルウェア前に登録（Guestの場合）
app.use('/api/v1/handoff', handoffRouter);
```

**確認項目**:
- [ ] ファイルが作成された
- [ ] index.tsに登録された

---

## Item 4: エンドポイント実装


### Step 1: POST /api/v1/handoff/requests

**説明**: ハンドオフリクエストを作成

**実装コード**:
```typescript
/**
 * ハンドオフリクエストを作成
 * @requires x-tenant-id header
 */
router.{{lowercase method}}('/requests', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(401).json(
        createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です')
      );
    }

    

    

    // TODO: 実装
    const result = await prisma.handoff.create({
      where: { tenant_id: tenantId },
      // ...
    });

    return res.status(201).json(
      createSuccessResponse(result)
    );

  } catch (error) {
    console.error('[POST /api/v1/handoff/requests] Error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました')
    );
  }
});
```

**Accept条件**:
{{#each accept}}
- [ ] {"method":"POST","path":"/api/v1/handoff/requests","description":"ハンドオフリクエストを作成","lowercase":"post","pathSuffix":"/requests","hasBody":true,"hasParams":false,"params":"","statusCode":201,"modelName":"handoff","prismaMethod":"create","sampleBody":"{\"key\": \"value\"}"}


### Step 2: GET /api/v1/handoff/requests/:id

**説明**: ハンドオフリクエストの詳細を取得

**実装コード**:
```typescript
/**
 * ハンドオフリクエストの詳細を取得
 * @requires x-tenant-id header
 */
router.{{lowercase method}}('/requests/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(401).json(
        createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です')
      );
    }

    

    

    // TODO: 実装
    const result = await prisma.handoff.findMany({
      where: { tenant_id: tenantId },
      // ...
    });

    return res.status(200).json(
      createSuccessResponse(result)
    );

  } catch (error) {
    console.error('[GET /api/v1/handoff/requests/:id] Error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました')
    );
  }
});
```

**Accept条件**:
{{#each accept}}
- [ ] {"method":"GET","path":"/api/v1/handoff/requests/:id","description":"ハンドオフリクエストの詳細を取得","lowercase":"get","pathSuffix":"/requests/:id","hasBody":false,"hasParams":true,"params":"id","statusCode":200,"modelName":"handoff","prismaMethod":"findMany","sampleBody":""}


### Step 3: PATCH /api/v1/handoff/requests/:id/status

**説明**: ステータスを更新

**実装コード**:
```typescript
/**
 * ステータスを更新
 * @requires x-tenant-id header
 */
router.{{lowercase method}}('/requests/:id/status', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(401).json(
        createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です')
      );
    }

    

    

    // TODO: 実装
    const result = await prisma.handoff.update({
      where: { tenant_id: tenantId },
      // ...
    });

    return res.status(200).json(
      createSuccessResponse(result)
    );

  } catch (error) {
    console.error('[PATCH /api/v1/handoff/requests/:id/status] Error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました')
    );
  }
});
```

**Accept条件**:
{{#each accept}}
- [ ] {"method":"PATCH","path":"/api/v1/handoff/requests/:id/status","description":"ステータスを更新","lowercase":"patch","pathSuffix":"/requests/:id/status","hasBody":true,"hasParams":true,"params":"id","statusCode":200,"modelName":"handoff","prismaMethod":"update","sampleBody":"{\"key\": \"value\"}"}


### Step 4: GET /api/v1/handoff/requests

**説明**: リクエスト一覧を取得

**実装コード**:
```typescript
/**
 * リクエスト一覧を取得
 * @requires x-tenant-id header
 */
router.{{lowercase method}}('/requests', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(401).json(
        createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です')
      );
    }

    

    

    // TODO: 実装
    const result = await prisma.handoff.findMany({
      where: { tenant_id: tenantId },
      // ...
    });

    return res.status(200).json(
      createSuccessResponse(result)
    );

  } catch (error) {
    console.error('[GET /api/v1/handoff/requests] Error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました')
    );
  }
});
```

**Accept条件**:
{{#each accept}}
- [ ] {"method":"GET","path":"/api/v1/handoff/requests","description":"リクエスト一覧を取得","lowercase":"get","pathSuffix":"/requests","hasBody":false,"hasParams":false,"params":"","statusCode":200,"modelName":"handoff","prismaMethod":"findMany","sampleBody":""}


{{/each}}

---

## Item 5: hotel-saasプロキシ実装

### Step 1: プロキシファイル作成
```bash
# Nitroルート作成
mkdir -p hotel-saas-rebuild/server/api/v1/handoff
touch hotel-saas-rebuild/server/api/v1/handoff/handoff.ts
```

### Step 2: プロキシ実装
```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';
import { ensureGuestContext } from '~/server/utils/guest-context';

export default defineEventHandler(async (event) => {
  // ゲスト認証（Guest APIの場合）
  const { roomId, tenantId } = await ensureGuestContext(event);

  // hotel-common API呼び出し
  const response = await callHotelCommonAPI(event, '/api/v1/handoff', {
    method: '{{method}}',
    headers: {
      'x-tenant-id': tenantId
    }
  });

  return response;
});
```

**確認項目**:
- [ ] `callHotelCommonAPI`を使用している
- [ ] `x-tenant-id`ヘッダーを付与している
- [ ] `$fetch`直接使用していない

---

## Item 6: 動作確認

### Step 1: サーバー起動
```bash
# hotel-common
cd hotel-common-rebuild && npm run dev &

# hotel-saas
cd hotel-saas-rebuild && npm run dev &
```

### Step 2: API動作確認
```bash
# hotel-common直接

curl -X POST http://localhost:3401/api/v1/handoff/requests \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
   | jq .



curl -X GET http://localhost:3401/api/v1/handoff/requests/:id \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
   | jq .



curl -X PATCH http://localhost:3401/api/v1/handoff/requests/:id/status \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
   | jq .



curl -X GET http://localhost:3401/api/v1/handoff/requests \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
   | jq .



# hotel-saas経由

curl -X POST http://localhost:3101/api/v1/handoff/requests \
  -H "Content-Type: application/json" | jq .



curl -X GET http://localhost:3101/api/v1/handoff/requests/:id \
  -H "Content-Type: application/json" | jq .



curl -X PATCH http://localhost:3101/api/v1/handoff/requests/:id/status \
  -H "Content-Type: application/json" | jq .



curl -X GET http://localhost:3101/api/v1/handoff/requests \
  -H "Content-Type: application/json" | jq .


```

### Step 3: Evidence保存
```bash
# ログ保存
mkdir -p evidence/DEV-0200
curl ... > evidence/DEV-0200/api-test.log 2>&1
```

---

## Item 7: テスト実行

### Step 1: 標準テスト実行
```bash
# ゲストAPI用
./scripts/test-standard-guest.sh 2>&1 | tee evidence/DEV-0200/test-standard.log

# 管理画面API用
./scripts/test-standard-admin.sh 2>&1 | tee evidence/DEV-0200/test-standard.log
```

### Step 2: 結果確認
```bash
# PASSを確認
grep -E "✅|❌|PASS|FAIL" evidence/DEV-0200/test-standard.log
```

**完了条件**:
- [ ] 標準テストがPASS
- [ ] Evidenceログが保存された

---

## Evidence取得

### Evidence 1: Commands & Logs
```bash
echo "=== 実行コマンド ===" > evidence/DEV-0200/commands.log
# 実行したコマンドと結果を記録
```

### Evidence 2: Files
```bash
ls -la hotel-common-rebuild/src/routes/handoff.routes.ts
ls -la hotel-saas-rebuild/server/api/v1/handoff/
git status --short
```

### Evidence 3: Git
```bash
git branch --show-current
git log --oneline -1
```

---

## ✅ 完了チェックリスト

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


### テスト
- [ ] 標準テストPASS
- [ ] Evidence保存完了

### コード品質
- [ ] TypeScript型エラーなし
- [ ] Prisma直接使用なし（hotel-saas）
- [ ] `$fetch`直接使用なし
- [ ] tenant_idフィルタあり

---

## 📝 完了報告テンプレート

```markdown
## ✅ DEV-0200 完了報告

### 実装成果物
- `hotel-common-rebuild/src/routes/handoff.routes.ts`
- `hotel-saas-rebuild/server/api/v1/handoff/`

### テスト結果
- 標準テスト: ✅ PASS

### Evidence
- `evidence/DEV-0200/`

### 次のステップ
- PR作成 / マージ
```
