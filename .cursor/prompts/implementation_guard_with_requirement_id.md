# 実装前必須チェック（要件ID体系）

**最優先ルール**: 実装前に必ず SSOT を読み、対象要件IDを列挙し、合格条件を要約してから着手する。

---

## 🚨 実装開始前の必須手順

### Step 1: SSOT確認

```bash
# 該当するSSOTを読み込む
cat /Users/kaneko/hotel-kanri/docs/03_ssot/XX_category/SSOT_XXX.md
```

### Step 2: 要件ID抽出

SSOTから該当する要件ID（XXX-nnn形式）を全て抽出する

**要件IDフォーマット**:
- `AUTH-001`: 認証系
- `PERM-001`: 権限系
- `DB-001`: データベース系
- `API-001`: API系
- `UI-001`: UI系
- その他（詳細は SSOT_REQUIREMENT_ID_SYSTEM.md 参照）

### Step 3: 合格条件の理解

各要件IDの **Accept（合格条件）** を確認・理解する

### Step 4: 実装プラン・テストプランの作成

以下のフォーマットで出力する

---

## 📋 出力フォーマット（必須）

```markdown
## 実装前チェック完了報告

### Coverage（対象要件ID）
- AUTH-001: メールアドレス必須・形式検証
- AUTH-002: パスワード長検証（12〜64文字）

### Accept（合格条件）
#### AUTH-001
- ✅ 有効なメールアドレス（RFC 5322準拠）は受理される
- ❌ 空文字列は `400 {"code":"REQUIRED_FIELD","field":"email"}` で拒否
- ❌ 形式違反は `400 {"code":"INVALID_EMAIL"}` で拒否

#### AUTH-002
- ✅ 12文字〜64文字は受理される
- ❌ 11文字以下は `400 {"code":"PASSWORD_TOO_SHORT"}` で拒否
- ❌ 65文字以上は `400 {"code":"PASSWORD_TOO_LONG"}` で拒否

### Plan（実装計画）
- **File**: `/server/api/auth/register.post.ts`
- **Function**: `registerUser(input: RegisterInput)`
- **非互換**: なし（新規API）
- **依存関係**: Zod, Prisma

### Tests（テスト計画）
- [ ] **AUTH-001**: メールアドレス検証（3ケース）
  - [ ] 有効なメールは受理される
  - [ ] 形式違反は400エラー（INVALID_EMAIL）
  - [ ] 空文字列は400エラー（REQUIRED_FIELD）
- [ ] **AUTH-002**: パスワード長検証（4ケース）
  - [ ] 12文字は成功
  - [ ] 64文字は成功
  - [ ] 11文字は失敗（PASSWORD_TOO_SHORT）
  - [ ] 65文字は失敗（PASSWORD_TOO_LONG）
- [ ] **E2E**: 会員登録フロー全体

### Out of scope（対象外）
- パスワード強度チェック（AUTH-003で実装予定）
- メール送信機能（NOTIF-001で実装予定）
- ソーシャルログイン（AUTH-010で実装予定）

---

## 実装開始の確認

以下に全て「YES」で答えられますか？

- [ ] SSOTを読んだか？
- [ ] 要件IDを列挙したか？
- [ ] 合格条件を理解したか？
- [ ] 実装プランを作成したか？
- [ ] テストプランを作成したか？
- [ ] Out of scopeを明確にしたか？

**1つでも「NO」がある場合は実装を開始しない。**

実装を開始してよろしいでしょうか？
```

---

## 🎯 実装時の必須ルール

### 1. 型で契約を強制

```typescript
import { z } from 'zod'

/**
 * 要件ID: AUTH-001, AUTH-002
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
```

### 2. テストは合格条件をそのまま実装

```typescript
/**
 * 要件ID: AUTH-001
 * Accept: 有効なメールは受理される
 */
describe('AUTH-001: メールアドレス検証', () => {
  it('有効なメールは受理される', async () => {
    const result = await register({ email: 'test@example.com' })
    expect(result.status).toBe(200)
  })

  it('形式違反は400エラー（INVALID_EMAIL）', async () => {
    const result = await register({ email: 'invalid' })
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('INVALID_EMAIL')
  })

  it('空文字列は400エラー（REQUIRED_FIELD）', async () => {
    const result = await register({ email: '' })
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('REQUIRED_FIELD')
  })
})
```

### 3. コメントに要件IDを記載

```typescript
// 要件ID: AUTH-001
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  // 要件ID: AUTH-001, AUTH-002
  const validation = RegisterSchema.safeParse(body)
  
  if (!validation.success) {
    const error = validation.error.errors[0]
    // Accept: 形式違反は400エラー
    throw createError({
      statusCode: 400,
      message: error.message
    })
  }
  
  // 実装...
})
```

---

## ❌ 絶対禁止パターン

### 禁止1: 仕様にない振る舞いの実装

```typescript
// ❌ 禁止: SSOTに記載がない
if (email.includes('admin')) {
  throw new Error('管理者用メールは使用できません')
}

// ✅ 正しい: SSOTに記載がある場合のみ実装
// または Out of scope に明記してユーザーに確認
```

### 禁止2: 合格条件と異なるエラーコード

```typescript
// ❌ 禁止: Accept と異なるエラーコード
throw createError({
  statusCode: 400,
  message: 'EMAIL_ERROR' // ← SSOTには "INVALID_EMAIL" と記載
})

// ✅ 正しい: Accept 通りのエラーコード
throw createError({
  statusCode: 400,
  message: 'INVALID_EMAIL'
})
```

### 禁止3: テストがない実装

```typescript
// ❌ 禁止: 実装だけしてテストなし

// ✅ 正しい: 合格条件をテストでカバー
describe('AUTH-001', () => {
  // Accept の全条件をテスト
})
```

---

## 🎯 実装完了後の報告フォーマット

```markdown
## 実装完了報告

### 実装した要件ID
- AUTH-001: メールアドレス検証 ✅
- AUTH-002: パスワード長検証 ✅

### 実装したファイル
- `/server/api/auth/register.post.ts` ✅
- `/types/auth.ts` ✅
- `/tests/api/auth.test.ts` ✅

### テスト結果
- AUTH-001: 3ケース全て合格 ✅
- AUTH-002: 4ケース全て合格 ✅
- E2E: 会員登録フロー成功 ✅
- カバレッジ: 92% (閾値85%クリア) ✅

### 型チェック
- TypeScript strict: エラー0件 ✅
- Lint: エラー0件 ✅

### CIステータス
- [ ] SSOT準拠チェック: 実行待ち
- [ ] 単体テスト: 実行待ち
- [ ] E2Eテスト: 実行待ち

---

## 次のステップ
PR作成時に以下を記入してください：
1. 読了したSSO: docs/03_ssot/.../SSOT_XXX.md
2. 対象要件ID: AUTH-001, AUTH-002
3. Out of scope: （記載した内容）
```

---

## 📚 参照ドキュメント

1. **要件ID体系**
   - `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_REQUIREMENT_ID_SYSTEM.md`

2. **SSOT作成チェックリスト**
   - `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md`

3. **実装チェックリスト**
   - `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_IMPLEMENTATION_CHECKLIST.md`

4. **PRテンプレート**
   - `/Users/kaneko/hotel-kanri/.github/PULL_REQUEST_TEMPLATE.md`

---

## 🤖 AIへの指示

**あなたは実装前に必ずこのガードプロンプトに従い、要件IDを列挙してから実装を開始してください。**

1. SSOTを読む
2. 要件IDを抽出
3. 合格条件を要約
4. 実装プラン・テストプランを出力
5. ユーザーの承認を得る
6. 実装開始

**この手順を飛ばすことは許されません。**

---

**作成者**: Iza（統合管理者）  
**最終更新**: 2025-10-14  
**バージョン**: 1.0.0






