# {{TASK_ID}}: {{FEATURE_NAME}} - Backend API実装

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
- **メインSSOT**: `{{SSOT_PATH}}`
- **APIレジストリ**: `docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md`
- **ルーティング**: `docs/01_systems/saas/API_ROUTING_GUIDELINES.md`
- **命名規則**: `docs/standards/DATABASE_NAMING_STANDARD.md`

---

## 📋 実装対象

### 要件一覧
{{#each requirements}}
| ID | 名前 | タイプ | Accept条件 |
|:---|:-----|:-------|:-----------|
| {{id}} | {{name}} | {{type}} | {{accept.length}}件 |
{{/each}}

### API一覧
{{#each api}}
| Method | Path | 説明 |
|:-------|:-----|:-----|
| {{method}} | `{{path}}` | {{description}} |
{{/each}}

---

## Item 1: 事前調査（必須・15分）

### Step 1: SSOT確認
```bash
# SSOT読み込み
cat {{SSOT_PATH}}

# API定義を確認
grep -nE '^(GET|POST|PUT|PATCH|DELETE)' {{SSOT_PATH}}
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

{{#if database}}
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
{{/if}}

---

## Item 3: ルートファイル作成

### Step 1: ファイル作成
```bash
# ルートファイル作成
touch hotel-common-rebuild/src/routes/{{routeName}}.routes.ts
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
import {{routerName}}Router from '../routes/{{routeName}}.routes';

// 認証ミドルウェア前に登録（Guestの場合）
app.use('/api/v1/{{basePath}}', {{routerName}}Router);
```

**確認項目**:
- [ ] ファイルが作成された
- [ ] index.tsに登録された

---

## Item 4: エンドポイント実装

{{#each api}}
### Step {{add @index 1}}: {{method}} {{path}}

**説明**: {{description}}

**実装コード**:
```typescript
/**
 * {{description}}
 * @requires x-tenant-id header
 */
router.{{lowercase method}}('{{pathSuffix}}', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(401).json(
        createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です')
      );
    }

    {{#if hasBody}}
    const { {{bodyParams}} } = req.body;
    
    // バリデーション
    if (!{{requiredField}}) {
      return res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', '{{requiredField}}は必須です')
      );
    }
    {{/if}}

    {{#if hasParams}}
    const { {{params}} } = req.params;
    {{/if}}

    // TODO: 実装
    const result = await prisma.{{modelName}}.{{prismaMethod}}({
      where: { tenant_id: tenantId },
      // ...
    });

    return res.status({{statusCode}}).json(
      createSuccessResponse(result)
    );

  } catch (error) {
    console.error('[{{method}} {{path}}] Error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL_ERROR', 'サーバーエラーが発生しました')
    );
  }
});
```

**Accept条件**:
{{#each accept}}
- [ ] {{this}}
{{/each}}

{{/each}}

---

## Item 5: hotel-saasプロキシ実装

### Step 1: プロキシファイル作成
```bash
# Nitroルート作成
mkdir -p hotel-saas-rebuild/server/api/v1/{{basePath}}
touch hotel-saas-rebuild/server/api/v1/{{basePath}}/{{fileName}}.ts
```

### Step 2: プロキシ実装
```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';
import { ensureGuestContext } from '~/server/utils/guest-context';

export default defineEventHandler(async (event) => {
  // ゲスト認証（Guest APIの場合）
  const { roomId, tenantId } = await ensureGuestContext(event);

  // hotel-common API呼び出し
  const response = await callHotelCommonAPI(event, '/api/v1/{{basePath}}', {
    method: '{{method}}',
    headers: {
      'x-tenant-id': tenantId
    }{{#if hasBody}},
    body: await readBody(event){{/if}}
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
{{#each api}}
curl -X {{method}} http://localhost:3401{{path}} \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7" \
  {{#if sampleBody}}-d '{{sampleBody}}'{{/if}} | jq .

{{/each}}

# hotel-saas経由
{{#each api}}
curl -X {{method}} http://localhost:3101{{path}} \
  -H "Content-Type: application/json" | jq .

{{/each}}
```

### Step 3: Evidence保存
```bash
# ログ保存
mkdir -p evidence/{{TASK_ID}}
curl ... > evidence/{{TASK_ID}}/api-test.log 2>&1
```

---

## Item 7: テスト実行

### Step 1: 標準テスト実行
```bash
# ゲストAPI用
./scripts/test-standard-guest.sh 2>&1 | tee evidence/{{TASK_ID}}/test-standard.log

# 管理画面API用
./scripts/test-standard-admin.sh 2>&1 | tee evidence/{{TASK_ID}}/test-standard.log
```

### Step 2: 結果確認
```bash
# PASSを確認
grep -E "✅|❌|PASS|FAIL" evidence/{{TASK_ID}}/test-standard.log
```

**完了条件**:
- [ ] 標準テストがPASS
- [ ] Evidenceログが保存された

---

## Evidence取得

### Evidence 1: Commands & Logs
```bash
echo "=== 実行コマンド ===" > evidence/{{TASK_ID}}/commands.log
# 実行したコマンドと結果を記録
```

### Evidence 2: Files
```bash
ls -la hotel-common-rebuild/src/routes/{{routeName}}.routes.ts
ls -la hotel-saas-rebuild/server/api/v1/{{basePath}}/
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
{{#each requirements}}
- [ ] {{id}}: {{name}}
{{/each}}

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
## ✅ {{TASK_ID}} 完了報告

### 実装成果物
- `hotel-common-rebuild/src/routes/{{routeName}}.routes.ts`
- `hotel-saas-rebuild/server/api/v1/{{basePath}}/`

### テスト結果
- 標準テスト: ✅ PASS

### Evidence
- `evidence/{{TASK_ID}}/`

### 次のステップ
- PR作成 / マージ
```
