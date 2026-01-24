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

| ドキュメント | パス |
|:------------|:-----|
| **メインSSOT** | `{{SSOT_PATH}}` |
| **APIレジストリ** | `docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md` |
| **ルーティング** | `docs/01_systems/saas/API_ROUTING_GUIDELINES.md` |
| **命名規則** | `docs/standards/DATABASE_NAMING_STANDARD.md` |

---

## 📋 実装対象

### 要件一覧（{{requirementCount}}件）

{{REQUIREMENTS_TABLE}}

### API一覧（{{apiCount}}件）

{{API_TABLE}}

### データベーススキーマ

{{PRISMA_SCHEMA}}

### Accept条件（完了基準）

{{ACCEPT_CONDITIONS}}

---

## Item 1: 事前調査（必須・15分）

### Step 1: SSOT確認
```bash
# SSOT読み込み
cat {{SSOT_PATH}}

# API定義を確認
grep -nE '^(GET|POST|PUT|PATCH|DELETE)' {{SSOT_PATH}}
```

### Step 2: 既存実装調査
```bash
# 類似ルートファイル確認
ls -la hotel-common-rebuild/src/routes/

# 命名パターン確認
head -50 hotel-common-rebuild/src/routes/guest-orders.routes.ts
```

### Step 3: 完了条件
- [ ] 全要件ID（{{requirementCount}}件）を把握した
- [ ] 全APIエンドポイント（{{apiCount}}件）を把握した
- [ ] Accept条件を把握した
- [ ] 既存実装の命名規則を確認した

---

## Item 2: ルートファイル作成

### Step 1: ファイル作成
```bash
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

{{API_IMPLEMENTATIONS}}

export default router;
```

### Step 3: ルーター登録
`hotel-common-rebuild/src/server/index.ts` に追加:

```typescript
import {{routerName}}Router from '../routes/{{routeName}}.routes';

// 認証ミドルウェア前に登録（Guestの場合）
app.use('/api/v1/{{basePath}}', {{routerName}}Router);
```

### Step 4: 完了条件
- [ ] `{{routeName}}.routes.ts` が作成された
- [ ] `index.ts` にルーター登録された
- [ ] TypeScript型エラーがない

---

## Item 3: hotel-saasプロキシ実装

### Step 1: プロキシファイル作成
```bash
mkdir -p hotel-saas-rebuild/server/api/v1/{{basePath}}
```

### Step 2: 各エンドポイントのプロキシ作成

{{PROXY_IMPLEMENTATIONS}}

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

{{CURL_COMMANDS}}

### Step 3: 完了条件
- [ ] hotel-common直接で正常レスポンス
- [ ] hotel-saas経由で正常レスポンス
- [ ] エラーケースも確認

---

## Item 5: テスト実行

### Step 1: 標準テスト
```bash
# ゲストAPI用
./scripts/test-standard-guest.sh 2>&1 | tee evidence/{{TASK_ID}}/test.log

# または管理画面API用
./scripts/test-standard-admin.sh 2>&1 | tee evidence/{{TASK_ID}}/test.log
```

### Step 2: Evidence保存
```bash
mkdir -p evidence/{{TASK_ID}}
echo "=== {{TASK_ID}} Evidence ===" > evidence/{{TASK_ID}}/commands.log
git status --short >> evidence/{{TASK_ID}}/commands.log
ls -la hotel-common-rebuild/src/routes/{{routeName}}.routes.ts >> evidence/{{TASK_ID}}/commands.log
```

### Step 3: 完了条件
- [ ] 標準テストがPASS
- [ ] Evidenceログが保存された

---

## ✅ 最終チェックリスト

### 実装
{{REQUIREMENTS_CHECKLIST}}

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
## ✅ {{TASK_ID}} 完了報告

### 参照SSOT
- {{SSOT_PATH}}

### 実装成果物
- `hotel-common-rebuild/src/routes/{{routeName}}.routes.ts`
- `hotel-saas-rebuild/server/api/v1/{{basePath}}/`

### テスト結果
- 標準テスト: ✅ PASS

### Evidence
- `evidence/{{TASK_ID}}/`
```
