# SSOT: 要件ID管理システム（実行可能な契約）

**作成日**: 2025-10-14  
**最終更新**: 2025-10-14  
**バージョン**: 1.0.0  
**ステータス**: ✅ 確定  
**優先度**: 🔴 最高（全SSOT必須）

---

## 📋 このSSOTの目的

**"仕様を文章のままにしない / 実行可能な契約(=テストと型)にする"**

### 核心コンセプト

```
SSOT（文章）→ 要件ID → テスト → 型 → CIブロック
  ↓
"勝手実装"をほぼ0にする
```

---

## 🎯 要件ID命名規則

### 基本フォーマット

```
[カテゴリ]-[機能コード]-[連番]

例:
- AUTH-001: 認証系の要件1番
- PERM-001: 権限系の要件1番
- MENU-001: メニュー系の要件1番
- API-001: API系の要件1番
- UI-001: UI系の要件1番
- DB-001: データベース系の要件1番
```

### カテゴリ一覧

| カテゴリ | コード | 説明 | 例 |
|---------|--------|------|-----|
| **認証** | AUTH | ログイン・セッション・トークン | AUTH-001 |
| **権限** | PERM | RBAC・権限チェック | PERM-001 |
| **データベース** | DB | スキーマ・マイグレーション | DB-001 |
| **API** | API | エンドポイント・リクエスト/レスポンス | API-001 |
| **UI** | UI | 画面・コンポーネント・レイアウト | UI-001 |
| **メニュー** | MENU | 料理・飲料・カテゴリ | MENU-001 |
| **注文** | ORDER | 注文フロー・カート・決済 | ORDER-001 |
| **予約** | RESV | 予約管理・客室管理 | RESV-001 |
| **会員** | MEMBER | 顧客情報・ポイント | MEMBER-001 |
| **AI** | AI | AIコンシェルジュ・レコメンド | AI-001 |
| **通知** | NOTIF | メール・プッシュ・SMS | NOTIF-001 |
| **決済** | PAY | 決済連携・請求 | PAY-001 |
| **多言語** | I18N | 翻訳・ロケール | I18N-001 |
| **パフォーマンス** | PERF | 速度・キャッシュ | PERF-001 |
| **セキュリティ** | SEC | XSS・CSRF・SQLインジェクション | SEC-001 |
| **テスト** | TEST | テストケース・カバレッジ | TEST-001 |

---

## ✅ 要件の記述フォーマット

### テンプレート

```markdown
## [要件ID] 要件タイトル

**Accept（合格条件）**:
- ✅ [具体的な合格条件1]
- ✅ [具体的な合格条件2]
- ❌ [失敗条件]

**Input（入力）**:
- [入力パラメータ]

**Output（出力）**:
- Success: [成功時のレスポンス]
- Error: [エラー時のレスポンス]

**Test Cases（テストケース）**:
```typescript
// 合格条件をそのままテストに
describe('[要件ID]', () => {
  it('should [合格条件1]', async () => {
    // テストコード
  })
})
```

**Type（型定義）**:
```typescript
// 型で契約を強制
type RequestType = {
  // 型定義
}
```
```

---

## 📝 実例：会員登録SSOT

### 実際の書き方

```markdown
# SSOT: 会員登録システム

## AUTH-001 メールアドレスは必須・形式検証

**Accept（合格条件）**:
- ✅ 有効なメールアドレス（RFC 5322準拠）は受理される
- ✅ 空文字列は `400 {"code":"REQUIRED_FIELD","field":"email"}` で拒否
- ✅ 形式違反は `400 {"code":"INVALID_EMAIL"}` で拒否
- ❌ `test@` は無効（ドメイン不足）
- ❌ `@example.com` は無効（ローカル部不足）

**Input**:
```typescript
{
  email: string
}
```

**Output**:
- Success: `200 { "success": true }`
- Error: `400 { "code": "INVALID_EMAIL", "message": "メールアドレスの形式が正しくありません" }`

**Test Cases**:
```typescript
describe('AUTH-001: メールアドレス検証', () => {
  it('有効なメールは受理される', async () => {
    const result = await register({ email: 'test@example.com' })
    expect(result.status).toBe(200)
  })

  it('形式違反は400エラー', async () => {
    const result = await register({ email: 'invalid' })
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('INVALID_EMAIL')
  })

  it('空文字列は400エラー', async () => {
    const result = await register({ email: '' })
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('REQUIRED_FIELD')
  })
})
```

**Type（Zod/TypeScript）**:
```typescript
import { z } from 'zod'

const RegisterSchema = z.object({
  email: z.string()
    .min(1, { message: "REQUIRED_FIELD" })
    .email({ message: "INVALID_EMAIL" })
})

type RegisterInput = z.infer<typeof RegisterSchema>
```

---

## AUTH-002 パスワードは12〜64文字

**Accept（合格条件）**:
- ✅ 12文字〜64文字は受理される
- ❌ 11文字以下は `400 {"code":"PASSWORD_TOO_SHORT"}` で拒否
- ❌ 65文字以上は `400 {"code":"PASSWORD_TOO_LONG"}` で拒否

**Test Cases**:
```typescript
describe('AUTH-002: パスワード長検証', () => {
  it('12文字は成功', async () => {
    const result = await register({ password: 'a'.repeat(12) })
    expect(result.status).toBe(200)
  })

  it('64文字は成功', async () => {
    const result = await register({ password: 'a'.repeat(64) })
    expect(result.status).toBe(200)
  })

  it('11文字は失敗', async () => {
    const result = await register({ password: 'a'.repeat(11) })
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('PASSWORD_TOO_SHORT')
  })

  it('65文字は失敗', async () => {
    const result = await register({ password: 'a'.repeat(65) })
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('PASSWORD_TOO_LONG')
  })
})
```

**Type**:
```typescript
const PasswordSchema = z.string()
  .min(12, { message: "PASSWORD_TOO_SHORT" })
  .max(64, { message: "PASSWORD_TOO_LONG" })
```
```

---

## 🤖 Cursor用ガードプロンプト

### テンプレート

```markdown
# 実装前必須チェック（要件ID体系）

あなたは実装前に必ず SSOT を読み、対象要件IDを列挙し、合格条件を要約してから着手する。

## 手順

1. **SSOT の該当セクション見出しと要件ID (XXX-nnn) を列挙**
2. **各IDの合格条件を箇条書きで再掲**
3. **変更計画(ファイル一覧/関数名/非互換の有無)を出す**
4. **仕様に無い振る舞いは "Out of scope" に入れて拒否**
5. **着手前に「実装プラン」と「テストプラン」を出力**

## 出力フォーマット

```markdown
### Coverage（対象要件ID）
- AUTH-001: メールアドレス検証
- AUTH-002: パスワード長検証

### Accept（合格条件）
- ✅ (AUTH-001) 有効なメールは受理される
- ❌ (AUTH-001) 形式違反は400エラー
- ✅ (AUTH-002) 12〜64文字は受理される
- ❌ (AUTH-002) 11文字以下/65文字以上は400エラー

### Plan（実装計画）
- File: `/server/api/auth/register.post.ts`
- Function: `registerUser(input: RegisterInput)`
- 非互換: なし（新規API）

### Tests（テスト計画）
- [ ] AUTH-001: メールアドレス検証（3ケース）
- [ ] AUTH-002: パスワード長検証（4ケース）
- [ ] E2E: 会員登録フロー全体

### Out of scope（対象外）
- パスワード強度チェック（AUTH-003で実装予定）
- メール送信（NOTIF-001で実装予定）
```

## 実装開始前の確認

以下に全て「YES」で答えられるか確認してください：

- [ ] SSOTを読んだか？
- [ ] 要件IDを列挙したか？
- [ ] 合格条件を理解したか？
- [ ] テストプランを作成したか？
- [ ] Out of scopeを明確にしたか？

**1つでも「NO」がある場合は実装を開始しない。**
```

---

## 📋 PRテンプレート

### `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## 目的
Issue: #

## SSOT参照（必須）
- [ ] **読了したSSO**: `docs/03_ssot/XX_category/SSOT_XXX.md` @ `<commit-hash>`
- [ ] **対象要件ID**: AUTH-001, AUTH-002
- [ ] **Out of scope**: なし / （あれば記入）

## 実装内容

### Coverage（対象要件ID）
- AUTH-001: [要件の概要]
- AUTH-002: [要件の概要]

### 変更ファイル
- [ ] `/server/api/auth/register.post.ts`
- [ ] `/types/auth.ts`
- [ ] `/tests/auth.test.ts`

## テスト（必須）
- [ ] **単体テスト**: AUTH-001/AUTH-002 の合格条件をカバー
  - [ ] AUTH-001: 3ケース（有効/形式違反/空文字列）
  - [ ] AUTH-002: 4ケース（12文字/64文字/11文字/65文字）
- [ ] **E2E テスト**: 該当ユーザストーリーを再現
- [ ] **カバレッジ閾値**: >= 85%

## 型安全性
- [ ] TypeScript strict モード（エラー0件）
- [ ] Zod/JSON Schema で入力検証
- [ ] OpenAPI スキーマ更新（該当する場合）

## スクリーンショット（UI変更がある場合）
[画像を添付]

## チェックリスト
- [ ] SSOT に記載されていない機能を追加していない
- [ ] 合格条件を全てテストでカバーしている
- [ ] 型定義が仕様と一致している
- [ ] CI が全て通っている

## レビュアーへの注意事項
[特記事項があれば]
```

---

## 🔧 CI/CDブロック実装

### 1. `.github/workflows/ci.yml`

```yaml
name: CI
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      
      - name: Install dependencies
        run: npm ci
      
      - name: 型チェック
        run: npm run typecheck
      
      - name: Lint
        run: npm run lint
      
      - name: 単体テスト + カバレッジ閾値
        run: npm run test -- --coverage --watch=false
        env:
          COVERAGE_THRESHOLD: 85
      
      - name: E2Eテスト
        run: npm run test:e2e
      
      - name: SSOT準拠チェック（要件ID必須）
        run: node scripts/check-ssot-citations.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
```

---

### 2. `scripts/check-ssot-citations.js`

```javascript
#!/usr/bin/env node

/**
 * SSOT準拠チェック（要件ID必須）
 * 
 * PRに以下が含まれているかチェック：
 * 1. SSOT参照（docs/03_ssot/へのパス）
 * 2. 要件ID（XXX-nnn形式）
 * 3. Out of scope の記載
 */

const fs = require('fs');
const { execSync } = require('child_process');

// GitHub PR本文を取得（環境変数 or gh CLI）
let prBody = '';

if (process.env.GITHUB_TOKEN && process.env.PR_NUMBER) {
  // GitHub Actionsから実行
  const cmd = `gh pr view ${process.env.PR_NUMBER} --json body -q .body`;
  prBody = execSync(cmd, { encoding: 'utf-8' });
} else if (process.env.GITHUB_PR_BODY) {
  // 環境変数から取得
  prBody = process.env.GITHUB_PR_BODY;
} else {
  console.error('❌ PR本文を取得できません');
  process.exit(1);
}

// チェック1: SSOT参照があるか
const hasSSOT = /docs\/03_ssot\/[a-zA-Z0-9_/]+\.md/.test(prBody);

// チェック2: 要件ID（XXX-nnn形式）があるか
const requirementIds = prBody.match(/[A-Z]+-\d{3}/g);
const hasIds = requirementIds && requirementIds.length > 0;

// チェック3: Out of scope の記載があるか
const hasOutOfScope = /Out of scope/i.test(prBody);

// 結果判定
const errors = [];

if (!hasSSOT) {
  errors.push('❌ SSOT参照が見つかりません。PRテンプレートの「読了したSSO」を記入してください。');
}

if (!hasIds) {
  errors.push('❌ 要件ID（XXX-nnn形式）が見つかりません。対象要件IDを記入してください。');
}

if (!hasOutOfScope) {
  errors.push('⚠️  Out of scope の記載がありません。対象外の機能を明記してください。');
}

// エラーがあれば失敗
if (errors.length > 0) {
  console.error('\n🚨 SSOT準拠チェック失敗\n');
  errors.forEach(err => console.error(err));
  console.error('\n詳細: https://github.com/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_REQUIREMENT_ID_SYSTEM.md\n');
  process.exit(1);
}

// 成功
console.log('✅ SSOT準拠チェック成功');
console.log(`   - SSOT参照: 確認済み`);
console.log(`   - 要件ID: ${requirementIds.join(', ')}`);
console.log(`   - Out of scope: 記載済み`);
```

---

### 3. `package.json` にスクリプト追加

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "check:ssot": "node scripts/check-ssot-citations.js"
  }
}
```

---

## 🎯 型で契約を強制

### Zod による実行時検証

```typescript
// types/auth.ts
import { z } from 'zod'

/**
 * AUTH-001: メールアドレス検証
 * AUTH-002: パスワード長検証
 */
export const RegisterSchema = z.object({
  email: z.string()
    .min(1, { message: "REQUIRED_FIELD" })
    .email({ message: "INVALID_EMAIL" }),
  password: z.string()
    .min(12, { message: "PASSWORD_TOO_SHORT" })
    .max(64, { message: "PASSWORD_TOO_LONG" })
})

export type RegisterInput = z.infer<typeof RegisterSchema>

// API実装
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // 要件ID: AUTH-001, AUTH-002
  const validation = RegisterSchema.safeParse(body)
  
  if (!validation.success) {
    const error = validation.error.errors[0]
    throw createError({
      statusCode: 400,
      message: error.message
    })
  }
  
  // 実装...
})
```

---

## 📊 既存SSOTへの適用計画

### Phase 1: 最優先SSOT（実装中）

| SSOT | 要件ID接頭辞 | 対応期限 |
|------|-------------|---------|
| SSOT_SAAS_PERMISSION_SYSTEM.md | PERM- | 即時 |
| SSOT_SAAS_AUTHENTICATION.md | AUTH- | 今週 |
| SSOT_DATABASE_SCHEMA.md | DB- | 今週 |

### Phase 2: 実装済みSSO

| SSOT | 要件ID接頭辞 | 対応期限 |
|------|-------------|---------|
| SSOT_SAAS_DASHBOARD.md | UI- | 来週 |
| AI コンシェルジュ系 | AI- | 来週 |

### Phase 3: 全SSOT

- 順次、要件ID体系を適用
- CI/CDブロックを段階的に強化

---

## 🎯 期待される効果

| 指標 | Before | After | 改善率 |
|------|--------|-------|--------|
| **勝手実装** | 60% | <5% | **92%削減** |
| **仕様逸脱** | 40% | <5% | **88%削減** |
| **テストカバレッジ** | 30% | >85% | **約3倍向上** |
| **型エラー** | 多発 | ほぼゼロ | **大幅削減** |
| **PRレビュー時間** | 60分 | 20分 | **3倍速** |
| **バグ検知タイミング** | 本番後 | CI段階 | **早期発見** |

---

## 📚 関連ドキュメント

- [SSOT_QUALITY_CHECKLIST.md](./SSOT_QUALITY_CHECKLIST.md) - SSOT作成時品質チェック
- [SSOT_IMPLEMENTATION_CHECKLIST.md](./SSOT_IMPLEMENTATION_CHECKLIST.md) - 実装時チェック
- [DATABASE_NAMING_STANDARD.md](../../standards/DATABASE_NAMING_STANDARD.md) - DB命名規則
- [API_ROUTING_GUIDELINES.md](../../01_systems/saas/API_ROUTING_GUIDELINES.md) - APIルーティング

---

**作成者**: Iza（統合管理者）  
**外部アドバイザー**: 品質管理エキスパート  
**最終更新**: 2025-10-14  
**バージョン**: 1.0.0

