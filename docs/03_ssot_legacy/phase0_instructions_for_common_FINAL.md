=== hotel-common Phase 0 緊急修正指示書 ===
最終更新: 2025年10月13日
担当: Iza（hotel-common管理AI）
期間: 2日間

---

## 📖 必読ドキュメント（★★★必須）

1. SSOT_SAAS_ADMIN_AUTHENTICATION.md（★★★）
   - パス: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md`
   - 認証方式: Session認証（Redis + HttpOnly Cookie）のみ
   - JWT認証は**完全廃止**

2. SSOT_PRODUCTION_PARITY_RULES.md（★★★）
   - パス: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_PRODUCTION_PARITY_RULES.md`
   - 環境分岐禁止
   - 開発・本番で同一実装必須

3. SSOT_SAAS_MULTITENANT.md（★★★）
   - パス: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md`
   - テナントIDハードコード禁止
   - フォールバック値禁止

---

## 🎯 修正タスク一覧（Phase 0-A）

### Task 1: JWT認証の残骸削除（1日）

#### ❌ 削除対象（明確な指示）

**1-1. Admin API のJWT実装を完全削除**
- ファイル: `src/admin/admin-api.ts`
- 削除内容:
  - `import * as jwt from 'jsonwebtoken'` の削除
  - `jwt.verify()` を使用している認証ロジックの削除（18-31行目）
  - `jwt.sign()` を使用しているトークン生成ロジックの削除（58-62行目）
  - JWT関連の型定義・インターフェース
- ✅ 正しい実装: セッションベースの認証に置き換え
  ```typescript
  // セッションIDからユーザー情報を取得
  const session = await getSession(sessionId);
  if (!session || !session.user) {
    throw new Error('認証が必要です');
  }
  ```

**1-2. hotel-saas統合のJWT実装を完全削除**
- ファイル: `src/integrations/hotel-saas/index.ts`
- 削除内容:
  - `import jwt from 'jsonwebtoken'` の削除
  - `JwtManager`クラス全体の削除（6-47行目）
  - `generateTokenPair()`, `verifyAccessToken()` メソッドの削除
- 理由: hotel-saasとhotel-common間の通信はAPI呼び出しのみ、JWTは不要

**1-3. 開発用トークン生成ツールを完全削除**
- ファイル: `src/utils/dev-token-generator.ts`
- 削除内容: **ファイル全体を削除**
- 理由: 
  - JWT認証が廃止されたため不要
  - 開発環境でも本番と同じセッション認証を使用（本番同等性原則）

**1-4. JWT関連の型定義を削除**
- ファイル: `src/auth/types.ts`
  - 削除: `HierarchicalJWTPayload`, `JWTOptions` 型定義
- ファイル: `src/hierarchy/types.ts`
  - 削除: `HierarchicalJWTPayload` 型定義

**1-5. JWT関連のコメント・ドキュメントを削除**
- 「JWT廃止済み」などのコメントも削除
- 新規開発者の混乱を避けるため、JWT関連の記述は一切残さない

#### 🔍 検出コマンド（実行前確認）

```bash
cd /Users/kaneko/hotel-common
grep -rn "jwt\|JWT\|jsonwebtoken" --include="*.ts" --include="*.js" src/ routes/ middleware/
```

#### ✅ 完了確認（実行後確認）

```bash
cd /Users/kaneko/hotel-common
# JWT関連の残骸が0件であることを確認
grep -rn "jwt\|JWT\|jsonwebtoken" --include="*.ts" --include="*.js" src/ routes/ middleware/
```

**期待結果**: 0件（検出なし）

---

### Task 2: 環境分岐コード削除（0.5日）

#### ❌ 削除対象

- `process.env.NODE_ENV`による分岐処理
- 開発環境専用の実装パターン
- 本番環境専用の実装パターン

#### ✅ 正しい実装

```typescript
// ❌ 間違い（削除対象）
if (process.env.NODE_ENV === 'development') {
  tenantId = 'default';
}

// ✅ 正しい実装
// 接続先は環境変数で制御、ロジックは同一
const dbUrl = process.env.DATABASE_URL; // これはOK（設定値のみ）
const tenantId = session.tenantId; // ロジックは環境問わず同一
```

#### 🔍 検出コマンド

```bash
cd /Users/kaneko/hotel-common
grep -rn "process\.env\.NODE_ENV" --include="*.ts" --include="*.js" src/ routes/ middleware/
```

#### ✅ 完了確認

```bash
cd /Users/kaneko/hotel-common
# 環境分岐が0件であることを確認
grep -rn "process\.env\.NODE_ENV" --include="*.ts" --include="*.js" src/ routes/ middleware/
```

**期待結果**: 0件（検出なし）

---

### Task 3: テナントIDハードコード削除（0.5日）

#### ❌ 削除対象

- `default-tenant`, `'default'` などのハードコード値
- テナントIDのフォールバック値（`||`, `??` 演算子）
- `tenantId || 'default'` パターン

#### ✅ 正しい実装

```typescript
// ❌ 間違い（削除対象）
const tenantId = session.tenantId || 'default';
const tenantId = user?.tenantId ?? 'default';

// ✅ 正しい実装
const tenantId = session.tenantId;
if (!tenantId) {
  throw new Error('テナントIDが取得できません');
}
```

#### 🔍 検出コマンド

```bash
cd /Users/kaneko/hotel-common
grep -rn "default.*tenant\|tenant.*default\|'default'" --include="*.ts" --include="*.js" src/ routes/ middleware/ | grep -i tenant
```

#### ✅ 完了確認

```bash
cd /Users/kaneko/hotel-common
# ハードコードが0件であることを確認
grep -rn "default.*tenant\|tenant.*default\|'default'" --include="*.ts" --include="*.js" src/ routes/ middleware/ | grep -i tenant
```

**期待結果**: 0件（検出なし）

---

## ☑️ hotel-common 完了チェックリスト

修正完了後、以下を**必ず**実行してください：

```markdown
□ Task 1: JWT認証の残骸削除
  □ Admin API (`src/admin/admin-api.ts`) のJWT削除
  □ hotel-saas統合 (`src/integrations/hotel-saas/index.ts`) のJWT削除
  □ 開発ツール (`src/utils/dev-token-generator.ts`) 削除
  □ JWT型定義削除 (`src/auth/types.ts`, `src/hierarchy/types.ts`)
  □ JWTコメント削除
  □ grep確認: JWT関連0件

□ Task 2: 環境分岐コード削除
  □ NODE_ENV分岐削除
  □ grep確認: 環境分岐0件

□ Task 3: テナントIDハードコード削除
  □ 'default' ハードコード削除
  □ フォールバック値削除
  □ grep確認: ハードコード0件

□ 最終確認
  □ npm run lint（エラー0件）
  □ npm run build（成功）
  □ 型エラー0件
```

---

## 📊 進捗報告フォーマット

修正完了後、以下のフォーマットで報告してください：

```markdown
## Phase 0-A: hotel-common修正 完了報告

### Task 1: JWT認証の残骸削除
- [x] 完了
- 削除ファイル数: X件
- 修正ファイル数: Y件
- grep確認結果: 0件

### Task 2: 環境分岐コード削除
- [x] 完了
- 修正ファイル数: Z件
- grep確認結果: 0件

### Task 3: テナントIDハードコード削除
- [x] 完了
- 修正ファイル数: W件
- grep確認結果: 0件

### 最終確認
- [x] lint: エラー0件
- [x] build: 成功
- [x] 型エラー: 0件

hotel-common Phase 0-A 修正完了しました。
hotel-saas Phase 0-B 修正を開始してください。
```

---

## ⚠️ 重要な注意事項

### 🚫 絶対禁止パターン

1. **「動いてるから残す」という判断**
   - 仕様書（SSOT）に記載がなければ削除
   - 古い実装は完全に削除

2. **「念のため残す」という判断**
   - コメントアウトで残すことも禁止
   - 履歴はGitで管理

3. **「後で使うかも」という判断**
   - 必要になったら再実装
   - 不要なコードは即座に削除

### ✅ 正しい判断基準

- **SSOT（仕様書）に記載があるか？**
  - Yes → 実装を維持・修正
  - No → 完全削除

---

## 🔗 関連ドキュメント

- SSOT一覧: `/Users/kaneko/hotel-kanri/docs/03_ssot/README.md`
- 進捗管理: `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md`
- 実装ガードレール: `/Users/kaneko/hotel-kanri/.cursor/prompts/ssot_implementation_guard.md`

---

以上、hotel-common Phase 0-A 緊急修正指示書

