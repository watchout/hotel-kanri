# BATCH-003: GENERIC RESOURCES API

**タスクタイプ**: ssot-only
**推定工数**: 6時間
**生成日時**: 2026-01-18T06:34:42.816Z

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
echo "=== BATCH-003 実行ログ ===" > evidence/BATCH-003/commands.log

# 実行したコマンドを記録
echo "$ npm run dev" >> evidence/BATCH-003/commands.log
echo "Exit code: $?" >> evidence/BATCH-003/commands.log
```

### Evidence 2: Files
```bash
echo "=== 作成/変更ファイル ===" > evidence/BATCH-003/files.log
git status --short >> evidence/BATCH-003/files.log
ls -la <作成ファイル> >> evidence/BATCH-003/files.log
```

### Evidence 3: Git
```bash
echo "=== Git状態 ===" > evidence/BATCH-003/git.log
git branch --show-current >> evidence/BATCH-003/git.log
git log --oneline -3 >> evidence/BATCH-003/git.log
```

### Evidence 4: Test
```bash
echo "=== テスト結果 ===" > evidence/BATCH-003/test.log
./scripts/test-standard-guest.sh >> evidence/BATCH-003/test.log 2>&1
# または
./scripts/test-standard-admin.sh >> evidence/BATCH-003/test.log 2>&1
```

---

## 📝 【自動挿入】完了報告フォーマット

```markdown
## ✅ BATCH-003 完了報告

### 参照SSOT
- docs/03_ssot/00_foundation/SSOT_GENERIC_RESOURCES_API.md

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
- `evidence/BATCH-003/commands.log`
- `evidence/BATCH-003/files.log`
- `evidence/BATCH-003/git.log`
- `evidence/BATCH-003/test.log`

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

