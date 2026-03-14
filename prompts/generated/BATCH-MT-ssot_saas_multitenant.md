# BATCH-MT: SAAS MULTITENANT

**タスクタイプ**: fullstack
**推定工数**: 55時間
**生成日時**: 2026-01-19T22:28:16.148Z

---

# 共通セクション テンプレート

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

## 📖 【自動挿入】必読ドキュメント

### 基盤SSOT（必須）
| ドキュメント | パス | 用途 |
|:------------|:-----|:-----|
| APIレジストリ | `docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md` | エンドポイント定義 |
| ルーティング | `docs/01_systems/saas/API_ROUTING_GUIDELINES.md` | ルーティング規則 |
| DB命名規則 | `docs/standards/DATABASE_NAMING_STANDARD.md` | テーブル・カラム命名 |
| 認証SSOT | `docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md` | Session認証 |
| マルチテナント | `docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md` | テナント分離 |

### 実装ガイド
| ドキュメント | パス | 用途 |
|:------------|:-----|:-----|
| 実装ガード | `.cursor/prompts/ssot_implementation_guard.md` | エラー対応 |
| 実装チェック | `.cursor/prompts/implement_from_ssot.md` | 実装フロー |

---

## ✅ 【自動挿入】禁止パターンチェックリスト

### hotel-saas（プロキシ層）での禁止
```typescript
// ❌ Prisma直接使用
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ❌ $fetch直接使用（Cookie未転送）
const data = await $fetch('http://localhost:3401/api/...');

// ❌ tenant_idフォールバック
const tenantId = session.tenantId || 'default';

// ❌ 環境分岐
if (process.env.NODE_ENV === 'development') { ... }
```

### 正しいパターン
```typescript
// ✅ callHotelCommonAPI使用（Cookie自動転送）
import { callHotelCommonAPI } from '~/server/utils/api-client';
const response = await callHotelCommonAPI(event, '/api/v1/...', { method: 'GET' });

// ✅ tenant_idは必須
if (!tenantId) {
  throw createError({ statusCode: 401, message: 'テナントIDが必要です' });
}
```

---

## 📋 【自動挿入】完了条件テンプレート

### Evidence 1: Commands & Logs
```bash
echo "=== BATCH-MT 実行ログ ===" > evidence/BATCH-MT/commands.log

# 実行したコマンドを記録
echo "$ npm run dev" >> evidence/BATCH-MT/commands.log
echo "Exit code: $?" >> evidence/BATCH-MT/commands.log
```

### Evidence 2: Files
```bash
echo "=== 作成/変更ファイル ===" > evidence/BATCH-MT/files.log
git status --short >> evidence/BATCH-MT/files.log
ls -la <作成ファイル> >> evidence/BATCH-MT/files.log
```

### Evidence 3: Git
```bash
echo "=== Git状態 ===" > evidence/BATCH-MT/git.log
git branch --show-current >> evidence/BATCH-MT/git.log
git log --oneline -3 >> evidence/BATCH-MT/git.log
```

### Evidence 4: Test
```bash
echo "=== テスト結果 ===" > evidence/BATCH-MT/test.log
./scripts/test-standard-guest.sh >> evidence/BATCH-MT/test.log 2>&1
# または
./scripts/test-standard-admin.sh >> evidence/BATCH-MT/test.log 2>&1
```

---

## 📝 【自動挿入】完了報告フォーマット

```markdown
## ✅ BATCH-MT 完了報告

### 参照SSOT
- docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md

### 実装成果物
| ファイル | 変更内容 |
|:---------|:---------|
| `path/to/file.ts` | 新規作成 |

### テスト結果
| テスト | 結果 |
|:-------|:-----|
| 標準テスト | ✅ PASS |
| 手動確認 | ✅ OK |

### Evidence
- `evidence/BATCH-MT/commands.log`
- `evidence/BATCH-MT/files.log`
- `evidence/BATCH-MT/git.log`
- `evidence/BATCH-MT/test.log`

### 次のステップ
- [ ] PR作成
- [ ] CI確認
- [ ] マージ
- [ ] Plane更新
```

---

## 🔧 【自動挿入】トラブルシューティング

### 401 Unauthorized
```bash
# 原因: セッション切れ or Cookie未転送
# 対処:
curl -c /tmp/cookies.txt -X POST http://localhost:3401/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@test.omotenasuai.com","password":"owner123"}'

curl -b /tmp/cookies.txt <API_URL>
```

### 404 Not Found
```bash
# 原因: ルーター未登録 or パス不一致
# 対処:
# 1. src/server/index.ts でルーター登録確認
grep -n "app.use" hotel-common-rebuild/src/server/index.ts

# 2. パス一致確認
grep -rn "/api/v1/<path>" hotel-common-rebuild/src/
```

### 500 Internal Server Error
```bash
# 原因: サーバー側エラー
# 対処:
# 1. サーバーログ確認
tail -50 <server_log>

# 2. Prismaエラーの場合
cd hotel-common-rebuild && npx prisma generate
```

### EADDRINUSE
```bash
# 原因: ポート使用中
# 対処:
lsof -i :3401 | grep LISTEN
kill -9 <PID>
```


---

# BATCH-MT: SAAS MULTITENANT - Backend API実装

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
| **メインSSOT** | `docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md` |
| **APIレジストリ** | `docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md` |
| **ルーティング** | `docs/01_systems/saas/API_ROUTING_GUIDELINES.md` |
| **命名規則** | `docs/standards/DATABASE_NAMING_STANDARD.md` |

---

## 📋 実装対象

### 要件一覧（0件）

_（要件なし）_

### API一覧（4件）

| Method | Path | 説明 |
|:-------|:-----|:-----|
| POST | `/api/v1/auth/switch-tenant`` | コードブロックから抽出 |
| POST | `/api/v1/auth/switch-tenant`）` | コードブロックから抽出 |
| POST | `/api/v1/auth/set-primary-tenant`` | コードブロックから抽出 |
| GET | `/api/v1/tenants/:id`` | コードブロックから抽出 |


### データベーススキーマ

```prisma
model Tenant {
  id                       String                     @id
  name                     String                     // ホテル名
  domain                   String?                    @unique // サブドメイン
  planType                 String?                    // プランタイプ
  status                   String                     @default("active") // active, suspended, deleted
  contactEmail             String?
  createdAt                DateTime                   @default(now())
  features                 String[]                   // 有効機能リスト
  settings                 Json?                      // テナント固有設定
  is_deleted               Boolean                    @default(false)
  
  // リレーション
  TenantSystemPlan         TenantSystemPlan[]
  authLogs                 AuthLogs[]
  billingLogs              BillingLogs[]
  
  @@index([is_deleted])
  @@map("tenants")
}

model TenantSystemPlan {
  id                     String                 @id
  tenantId               String
  systemType             String                 // "hotel-saas", "hotel-pms", "hotel-member"
  planId                 String
  startDate              DateTime               @default(now())
  endDate                DateTime?
  isActive               Boolean                @default(true)
  monthlyPrice           Int
  createdAt              DateTime               @default(now())
  updatedAt              DateTime
  is_deleted             Boolean                @default(false)
  
  SystemPlanRestrictions SystemPlanRestrictions @relation(fields: [planId], references: [id])
  Tenant                 Tenant                 @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, systemType])
  @@index([tenantId])
  @@index([systemType])
  @@index([isActive])
  @@map("tenant_system_plan")
}

model SystemPlanRestrictions {
  id                       String             @id
  systemType               String             // "hotel-saas", "hotel-pms", "hotel-member"
  businessType             String             // "leisure", "omotenasuai"
  planType                 String             // "economy", "professional", "enterprise"
  planCategory             String             // 細分化カテゴリ
  monthlyPrice             Int
  maxDevices               Int                @default(30)
  enableAiConcierge        Boolean            @default(false)
  enableMultilingual       Boolean            @default(false)
  enableLayoutEditor       Boolean            @default(false)
  maxMonthlyOrders         Int                @default(1000)
  maxMonthlyAiRequests     Int                @default(0)
  maxStorageGB             Float              @default(5.0)
  
  TenantSystemPlan         TenantSystemPlan[]
  
  @@unique([systemType, businessType, planType, planCategory])
  @@map("system_plan_restrictions")
}

model staff {
  id                String    @id @default(cuid())
  email             String    @unique                    -- ✅ グローバルユニーク
  name              String
  passwordHash      String?   @map("password_hash")
  failedLoginCount  Int       @default(0) @map("failed_login_count")
  lastLoginAt       DateTime? @map("last_login_at")
  lockedUntil       DateTime? @map("locked_until")
  isActive          Boolean   @default(true) @map("is_active")
  isDeleted         Boolean   @default(false) @map("is_deleted")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  
  // リレーション
  memberships       StaffTenantMembership[]  -- ✅ 所属テナント一覧
  
  @@index([email])
  @@index([isActive], map: "idx_staff_is_active")
  @@index([isDeleted], map: "idx_staff_is_deleted")
  @@map("staff")
}

model StaffTenantMembership {
  id              String    @id @default(cuid())
  staffId         String    @map("staff_id")
  tenantId        String    @map("tenant_id")
  role            String
  permissions     Json      @default("[]")
  level           Int?
  isActive        Boolean   @default(true) @map("is_active")
  isPrimary       Boolean   @default(false) @map("is_primary")
  joinedAt        DateTime  @default(now()) @map("joined_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  // リレーション
  staff           Staff     @relation(fields: [staffId], references: [id], onDelete: Cascade)
  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([staffId, tenantId], map: "uniq_staff_tenant")
  @@index([staffId], map: "idx_memberships_staff_id")
  @@index([tenantId], map: "idx_memberships_tenant_id")
  @@index([isActive], map: "idx_memberships_is_active")
  @@index([isPrimary], map: "idx_memberships_is_primary")
  @@map("staff_tenant_memberships")
}

```

### Accept条件（完了基準）

_（Accept条件なし）_

---

## Item 1: 事前調査（必須・15分）

### Step 1: SSOT確認
```bash
# SSOT読み込み
cat docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md

# API定義を確認
grep -nE '^(GET|POST|PUT|PATCH|DELETE)' docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md
```

### Step 2: 既存実装調査
```bash
# 類似ルートファイル確認
ls -la hotel-common-rebuild/src/routes/

# 命名パターン確認
head -50 hotel-common-rebuild/src/routes/guest-orders.routes.ts
```

### Step 3: 完了条件
- [ ] 全要件ID（0件）を把握した
- [ ] 全APIエンドポイント（4件）を把握した
- [ ] Accept条件を把握した
- [ ] 既存実装の命名規則を確認した

---

## Item 2: ルートファイル作成

### Step 1: ファイル作成
```bash
touch hotel-common-rebuild/src/routes/multitenant.routes.ts
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
 * POST /api/v1/auth/switch-tenant`
 * コードブロックから抽出
 */
router.post('/switch-tenant`', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です'));
    }
    const body = req.body;

    // TODO: ビジネスロジック実装
    const result = await prisma.tenant.create({
      where: { tenant_id: tenantId }
    });

    return res.status(201).json(createSuccessResponse(result));
  } catch (error) {
    console.error('/api/v1/auth/switch-tenant` エラー:', error);
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'サーバーエラー'));
  }
});


/**
 * POST /api/v1/auth/switch-tenant`）
 * コードブロックから抽出
 */
router.post('/switch-tenant`）', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です'));
    }
    const body = req.body;

    // TODO: ビジネスロジック実装
    const result = await prisma.tenant.create({
      where: { tenant_id: tenantId }
    });

    return res.status(201).json(createSuccessResponse(result));
  } catch (error) {
    console.error('/api/v1/auth/switch-tenant`） エラー:', error);
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'サーバーエラー'));
  }
});


/**
 * POST /api/v1/auth/set-primary-tenant`
 * コードブロックから抽出
 */
router.post('/set-primary-tenant`', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です'));
    }
    const body = req.body;

    // TODO: ビジネスロジック実装
    const result = await prisma.tenant.create({
      where: { tenant_id: tenantId }
    });

    return res.status(201).json(createSuccessResponse(result));
  } catch (error) {
    console.error('/api/v1/auth/set-primary-tenant` エラー:', error);
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'サーバーエラー'));
  }
});


/**
 * GET /api/v1/tenants/:id`
 * コードブロックから抽出
 */
router.get('/api/v1/tenants/:id`', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です'));
    }
    const { id } = req.params;

    // TODO: ビジネスロジック実装
    const result = await prisma.tenant.findMany({
      where: { tenant_id: tenantId }
    });

    return res.status(200).json(createSuccessResponse(result));
  } catch (error) {
    console.error('/api/v1/tenants/:id` エラー:', error);
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'サーバーエラー'));
  }
});

export default router;
```

### Step 3: ルーター登録
`hotel-common-rebuild/src/server/index.ts` に追加:

```typescript
import multitenantRouter from '../routes/multitenant.routes';

// 認証ミドルウェア前に登録（Guestの場合）
app.use('/api/v1/auth', multitenantRouter);
```

### Step 4: 完了条件
- [ ] `multitenant.routes.ts` が作成された
- [ ] `index.ts` にルーター登録された
- [ ] TypeScript型エラーがない

---

## Item 3: hotel-saasプロキシ実装

### Step 1: プロキシファイル作成
```bash
mkdir -p hotel-saas-rebuild/server/api/v1/auth
```

### Step 2: 各エンドポイントのプロキシ作成


### POST /api/v1/auth/switch-tenant`

ファイル: `server/api/v1/auth/switch-tenant`.post.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';
import { ensureGuestContext } from '~/server/utils/guest-context';

export default defineEventHandler(async (event) => {
  const { tenantId } = await ensureGuestContext(event);

  const response = await callHotelCommonAPI(event, `/api/v1/auth/switch-tenant``, {
    method: 'POST',
    headers: { 'x-tenant-id': tenantId },
    body: await readBody(event)
  });
  
  return response;
});
```


### POST /api/v1/auth/switch-tenant`）

ファイル: `server/api/v1/auth/switch-tenant`）.post.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';
import { ensureGuestContext } from '~/server/utils/guest-context';

export default defineEventHandler(async (event) => {
  const { tenantId } = await ensureGuestContext(event);

  const response = await callHotelCommonAPI(event, `/api/v1/auth/switch-tenant`）`, {
    method: 'POST',
    headers: { 'x-tenant-id': tenantId },
    body: await readBody(event)
  });
  
  return response;
});
```


### POST /api/v1/auth/set-primary-tenant`

ファイル: `server/api/v1/auth/set-primary-tenant`.post.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';
import { ensureGuestContext } from '~/server/utils/guest-context';

export default defineEventHandler(async (event) => {
  const { tenantId } = await ensureGuestContext(event);

  const response = await callHotelCommonAPI(event, `/api/v1/auth/set-primary-tenant``, {
    method: 'POST',
    headers: { 'x-tenant-id': tenantId },
    body: await readBody(event)
  });
  
  return response;
});
```


### GET /api/v1/tenants/:id`

ファイル: `server/api/v1/auth/api/v1/tenants/[id]`.get.ts`

```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';
import { ensureGuestContext } from '~/server/utils/guest-context';
import { getRouterParam } from 'h3';

export default defineEventHandler(async (event) => {
  const { tenantId } = await ensureGuestContext(event);

  const id = getRouterParam(event, 'id');

  const response = await callHotelCommonAPI(event, `/api/v1/tenants/${id}``, {
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
# POST /api/v1/auth/switch-tenant`
curl -s -X POST http://localhost:3401/api/v1/auth/switch-tenant` \
  -H 'x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7' \
  -H 'Content-Type: application/json' \
  -d '{"key": "value"}' | jq .
```

```bash
# POST /api/v1/auth/switch-tenant`）
curl -s -X POST http://localhost:3401/api/v1/auth/switch-tenant`） \
  -H 'x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7' \
  -H 'Content-Type: application/json' \
  -d '{"key": "value"}' | jq .
```

```bash
# POST /api/v1/auth/set-primary-tenant`
curl -s -X POST http://localhost:3401/api/v1/auth/set-primary-tenant` \
  -H 'x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7' \
  -H 'Content-Type: application/json' \
  -d '{"key": "value"}' | jq .
```

```bash
# GET /api/v1/tenants/:id`
curl -s http://localhost:3401/api/v1/tenants/1` \
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
./scripts/test-standard-guest.sh 2>&1 | tee evidence/BATCH-MT/test.log

# または管理画面API用
./scripts/test-standard-admin.sh 2>&1 | tee evidence/BATCH-MT/test.log
```

### Step 2: Evidence保存
```bash
mkdir -p evidence/BATCH-MT
echo "=== BATCH-MT Evidence ===" > evidence/BATCH-MT/commands.log
git status --short >> evidence/BATCH-MT/commands.log
ls -la hotel-common-rebuild/src/routes/multitenant.routes.ts >> evidence/BATCH-MT/commands.log
```

### Step 3: 完了条件
- [ ] 標準テストがPASS
- [ ] Evidenceログが保存された

---

## ✅ 最終チェックリスト

### 実装
- [ ] 要件なし

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
## ✅ BATCH-MT 完了報告

### 参照SSOT
- docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md

### 実装成果物
- `hotel-common-rebuild/src/routes/multitenant.routes.ts`
- `hotel-saas-rebuild/server/api/v1/auth/`

### テスト結果
- 標準テスト: ✅ PASS

### Evidence
- `evidence/BATCH-MT/`
```
