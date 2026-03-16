=== hotel-saas Phase 0 緊急修正指示書 ===
最終更新: 2025年10月13日
担当: Sun（hotel-saas管理AI）+ Iza（統合管理）
期間: 3日間

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

4. hotel-common Phase 0-A 完了報告
   - hotel-commonは既にJWT完全削除・Session認証完了済み
   - hotel-saasも同様にSession認証に統一する

---

## 🎯 修正タスク一覧（Phase 0-B）

### Task 4: JWT認証の残骸削除（2日）

#### 📊 現状把握（修正前）

```bash
cd /Users/kaneko/hotel-saas
grep -rn "jwt\|JWT\|jsonwebtoken" --include="*.ts" --include="*.js" --include="*.vue" \
  pages/ server/ composables/ middleware/ | grep -v "\.nuxt" | wc -l
```

**検出数**: 約53ファイル

#### ❌ 削除対象（明確な指示）

**4-1. JWT認証ミドルウェアを完全削除**
- ファイル: `server/middleware/auth.ts`, `middleware/auth.ts`
- 削除内容:
  - `import jwt from 'jsonwebtoken'` の削除
  - `jwt.verify()` を使用している認証ロジック全て
  - JWT関連のエラーハンドリング
- ✅ 正しい実装: Session認証ミドルウェアに置き換え
  ```typescript
  // セッションIDからユーザー情報を取得
  const sessionId = getCookie(event, 'hotel_session');
  if (!sessionId) {
    throw createError({
      statusCode: 401,
      message: '認証が必要です'
    });
  }
  
  const session = await getSession(sessionId); // hotel-common API経由
  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      message: 'セッションが無効です'
    });
  }
  
  event.context.session = session;
  ```

**4-2. JWT関連のComposablesを削除**
- ファイル: `composables/useAuth.ts`, `composables/useJWT.ts`
- 削除内容:
  - JWT生成・検証ロジック全て
  - `useAuth()` 内のJWT関連コード
- ✅ 正しい実装: Session認証APIに置き換え
  ```typescript
  // composables/useAuth.ts
  export const useAuth = () => {
    const login = async (email: string, password: string) => {
      // hotel-common APIでSession認証
      const { data } = await $fetch('/api/v1/admin/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      
      // セッションIDはHttpOnly Cookieで自動設定される
      return data;
    };
    
    const logout = async () => {
      await $fetch('/api/v1/admin/auth/logout', {
        method: 'POST'
      });
    };
    
    return { login, logout };
  };
  ```

**4-3. JWT関連のAPI Routesを削除**
- ファイル: `server/api/auth/jwt-*.ts`, `server/api/auth/refresh.ts`
- 削除内容:
  - JWT生成エンドポイント
  - JWTリフレッシュエンドポイント
  - JWT検証エンドポイント
- ✅ 正しい実装: Session認証エンドポイントに置き換え（hotel-common経由）

**4-4. JWTストレージ関連コードを削除**
- ファイル: `composables/useStorage.ts`, `utils/jwt-storage.ts`
- 削除内容:
  - `localStorage.setItem('jwt_token', ...)` 等
  - `sessionStorage` へのJWT保存
  - Cookieへの手動JWT保存
- 理由: Session認証ではHttpOnly Cookieが自動管理される

**4-5. JWT関連の型定義を削除**
- ファイル: `types/auth.ts`, `types/jwt.ts`
- 削除内容:
  - `JWTPayload`, `JWTOptions`, `TokenPair` 等の型定義

**4-6. JWT関連のVueコンポーネントを修正**
- ファイル: `pages/login.vue`, `pages/admin/dashboard.vue` 等
- 削除内容:
  - JWT取得・保存ロジック
  - JWTヘッダー設定
- ✅ 正しい実装: Session認証API呼び出しのみ（Cookieは自動）

#### 🔍 検出コマンド（実行前確認）

```bash
cd /Users/kaneko/hotel-saas
grep -rn "jwt\|JWT\|jsonwebtoken" --include="*.ts" --include="*.js" --include="*.vue" \
  pages/ server/ composables/ middleware/ | grep -v "\.nuxt"
```

#### ✅ 完了確認（実行後確認）

```bash
cd /Users/kaneko/hotel-saas
grep -rn "jwt\|JWT\|jsonwebtoken" --include="*.ts" --include="*.js" --include="*.vue" \
  pages/ server/ composables/ middleware/ | grep -v "\.nuxt"
```

**期待結果**: 0件（検出なし）

---

### Task 5: 環境分岐コード削除（1日）

#### 📊 現状把握（修正前）

```bash
cd /Users/kaneko/hotel-saas
grep -rn "process\.env\.NODE_ENV" --include="*.ts" --include="*.js" --include="*.vue" \
  pages/ server/ composables/ middleware/ | grep -v "\.nuxt"
```

**検出数**: 約6ファイル

#### ❌ 削除対象

- `process.env.NODE_ENV`による分岐処理
- 開発環境専用の実装パターン（例: モックデータ返却）
- 本番環境専用の実装パターン

#### ✅ 正しい実装

```typescript
// ❌ 間違い（削除対象）
if (process.env.NODE_ENV === 'development') {
  return mockData; // 開発環境でモックデータ
}

// ✅ 正しい実装
// 開発・本番で同じロジック
// 接続先は環境変数で制御（設定値のみ）
const apiBaseUrl = process.env.HOTEL_COMMON_API_URL; // これはOK
const { data } = await $fetch(`${apiBaseUrl}/api/v1/admin/tenants`);
return data;
```

#### 🔍 検出コマンド

```bash
cd /Users/kaneko/hotel-saas
grep -rn "process\.env\.NODE_ENV" --include="*.ts" --include="*.js" --include="*.vue" \
  pages/ server/ composables/ middleware/ | grep -v "\.nuxt"
```

#### ✅ 完了確認

```bash
cd /Users/kaneko/hotel-saas
grep -rn "process\.env\.NODE_ENV" --include="*.ts" --include="*.js" --include="*.vue" \
  pages/ server/ composables/ middleware/ | grep -v "\.nuxt"
```

**期待結果**: 0件（検出なし）

---

### Task 6: テナントIDハードコード削除（2日）

#### 📊 現状把握（修正前）

```bash
cd /Users/kaneko/hotel-saas
grep -rn "default.*tenant\|tenant.*default\|'default'" --include="*.ts" --include="*.js" --include="*.vue" \
  pages/ server/ composables/ middleware/ | grep -i tenant | grep -v "\.nuxt"
```

**検出数**: 約13ファイル

#### ❌ 削除対象

- `'default-tenant'`, `'default'` などのハードコード値
- テナントIDのフォールバック値（`||`, `??` 演算子）
- `tenantId || 'default'` パターン

#### ✅ 正しい実装

```typescript
// ❌ 間違い（削除対象）
const tenantId = session.tenantId || 'default';
const tenantId = user?.tenantId ?? 'default';

// ❌ 間違い（削除対象）
if (process.env.NODE_ENV === 'development') {
  tenantId = 'default';
}

// ✅ 正しい実装
const tenantId = session.tenantId;
if (!tenantId) {
  throw createError({
    statusCode: 400,
    message: 'テナントIDが取得できません'
  });
}

// ✅ 正しい実装（APIプロキシ）
const tenantId = event.context.session.tenantId;
if (!tenantId) {
  throw createError({
    statusCode: 401,
    message: '認証が必要です'
  });
}

// hotel-common APIにテナントIDを渡す
const { data } = await $fetch(`http://localhost:3400/api/v1/admin/orders`, {
  params: { tenantId } // クエリパラメータで渡す
});
```

#### 🔍 検出コマンド

```bash
cd /Users/kaneko/hotel-saas
grep -rn "default.*tenant\|tenant.*default\|'default'" --include="*.ts" --include="*.js" --include="*.vue" \
  pages/ server/ composables/ middleware/ | grep -i tenant | grep -v "\.nuxt"
```

#### ✅ 完了確認

```bash
cd /Users/kaneko/hotel-saas
grep -rn "default.*tenant\|tenant.*default\|'default'" --include="*.ts" --include="*.js" --include="*.vue" \
  pages/ server/ composables/ middleware/ | grep -i tenant | grep -v "\.nuxt"
```

**期待結果**: 0件（検出なし）

---

## ☑️ hotel-saas 完了チェックリスト

修正完了後、以下を**必ず**実行してください：

```markdown
□ Task 4: JWT認証の残骸削除
  □ JWT認証ミドルウェア削除
  □ JWT関連Composables削除
  □ JWT関連API Routes削除
  □ JWTストレージコード削除
  □ JWT型定義削除
  □ VueコンポーネントのJWT削除
  □ grep確認: JWT関連0件

□ Task 5: 環境分岐コード削除
  □ NODE_ENV分岐削除
  □ 開発専用コード削除
  □ grep確認: 環境分岐0件

□ Task 6: テナントIDハードコード削除
  □ 'default' ハードコード削除
  □ フォールバック値削除
  □ 環境分岐内のハードコード削除
  □ grep確認: ハードコード0件

□ 最終確認
  □ npm run lint（エラー0件）
  □ npm run build（成功）
  □ npm run dev（起動成功）
  □ 型エラー0件
  □ ログインフロー動作確認
```

---

## 📊 進捗報告フォーマット

修正完了後、以下のフォーマットで報告してください：

```markdown
## Phase 0-B: hotel-saas修正 完了報告

### Task 4: JWT認証の残骸削除
- [x] 完了
- 削除ファイル数: X件
- 修正ファイル数: Y件
- grep確認結果: 0件

### Task 5: 環境分岐コード削除
- [x] 完了
- 修正ファイル数: Z件
- grep確認結果: 0件

### Task 6: テナントIDハードコード削除
- [x] 完了
- 修正ファイル数: W件
- grep確認結果: 0件

### 最終確認
- [x] lint: エラー0件
- [x] build: 成功
- [x] dev: 起動成功
- [x] 型エラー: 0件
- [x] ログインフロー: 動作確認完了

hotel-saas Phase 0-B 修正完了しました。
Phase 0 全体が完了しました。
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

4. **「hotel-saasだけ独自実装」という判断**
   - hotel-commonが既にSession認証完了
   - hotel-saasも必ず同じ方式に統一

### ✅ 正しい判断基準

- **SSOT（仕様書）に記載があるか？**
  - Yes → 実装を維持・修正
  - No → 完全削除

- **hotel-commonと整合性が取れているか？**
  - hotel-commonはSession認証
  - hotel-saasも必ずSession認証

---

## 🔗 関連ドキュメント

- SSOT一覧: `/Users/kaneko/hotel-kanri/docs/03_ssot/README.md`
- 進捗管理: `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md`
- 実装ガードレール: `/Users/kaneko/hotel-kanri/.cursor/prompts/ssot_implementation_guard.md`
- hotel-common Phase 0-A完了報告: （上記参照）

---

## 🎯 Phase 0-B 修正の全体像

```
Phase 0-A（完了）: hotel-common修正
  ✅ JWT認証削除（112件→0件）
  ✅ Session認証に移行
  ✅ 環境分岐削除
  ✅ テナントIDハードコード明示化
  ↓
Phase 0-B（次）: hotel-saas修正
  ⏳ JWT認証削除（53ファイル）
  ⏳ Session認証に移行
  ⏳ 環境分岐削除（6ファイル）
  ⏳ テナントIDハードコード削除（13ファイル）
  ↓
Phase 0 完了
  → Phase 1（基盤完成）へ
```

---

以上、hotel-saas Phase 0-B 緊急修正指示書

