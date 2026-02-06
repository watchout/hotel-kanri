# Auto Implementation Rule - Claude Code GitHub Actions

> Claude Code が GitHub Issue/PR から実装タスクを受け取った際の行動ルール

---

## 適用条件

このルールは以下の場合に適用される：
- GitHub Issue で `@claude` メンションされた場合
- GitHub PR で `@claude` メンションされた場合
- `claude-implement` / `claude-fix` ラベル付きIssueが作成された場合
- `workflow_dispatch` で手動トリガーされた場合

---

## 実装フロー（必須）

### Phase 0: コンテキスト理解（必須・2分）

```
1. CLAUDE.md を読む
2. Issue/PRの内容を理解する
3. 参照SSOTファイルを特定する
```

### Phase 1: SSOT読み込み（必須・5分）

```
1. Issue本文から「参照SSOT」パスを取得
2. SSOTファイルを全文読む
3. 要件ID（XXX-nnn形式）を全て抽出
4. Accept条件を全て抽出
5. 対象リポジトリを確認（hotel-common / hotel-saas / both）
```

**SSOTが見つからない場合**: 実装を中止し、Issueにコメントで報告

### Phase 2: 既存実装調査（必須・10分）

```
1. 同じディレクトリの既存ファイル3つ以上を確認
2. 命名規則・パターン・認証方式を把握
3. Prismaスキーマ確認（DB変更がある場合）
4. 関連SSOTの確認
```

### Phase 3: 実装（本体）

```
1. hotel-common-rebuild でAPI実装（必要な場合）
   - TDD: テストを先に書く
   - ルーティング: B方式（router相対 + app.use絶対）
   - 認証: sessionAuthMiddleware 準拠
   - tenant_id: 全クエリに必須

2. hotel-saas-rebuild でUI実装（必要な場合）
   - callHotelCommonAPI 必須（$fetch直接禁止）
   - Vuetify 3 コンポーネント使用
   - TypeScript strict モード
```

### Phase 4: 検証（必須・5分）

```
1. TypeScript型チェック通過
2. ビルド成功
3. テスト通過
4. 禁止パターン未検出
```

### Phase 5: PR作成＆報告

```
1. ブランチ作成（feature/DEV-XXXX）
2. コミット（SSOT参照を含む）
3. PR作成（テンプレートに従う）
4. 元のIssueにコメントで完了報告
```

---

## 禁止パターン（自動検出・違反時は実装中止）

```typescript
// ❌ hotel-saas で Prisma 直接使用
import { PrismaClient } from '@prisma/client';

// ❌ hotel-saas で $fetch 直接使用
const data = await $fetch('http://localhost:3401/...');

// ❌ フォールバック値
const tenantId = session.tenantId || 'default';

// ❌ 環境分岐
if (process.env.NODE_ENV === 'development') { ... }

// ❌ any 型
const data: any = ...;

// ❌ tenant_id なしクエリ
const orders = await prisma.order.findMany();
```

---

## 中断条件（実装を停止してIssueに報告）

1. **SSOT不在**: 参照SSOTが見つからない
2. **矛盾検出**: SSOT間、またはSSSTと既存実装の矛盾
3. **禁止パターン検出**: 上記の禁止パターンに該当
4. **型エラー5件以上**: 1ステップで5件以上の型エラー
5. **Prismaスキーマ変更**: DB変更は人間の承認が必要
6. **セキュリティ懸念**: 認証回避、tenant分離違反
7. **スコープ外**: Issueの要件を超える変更が必要

---

## Issue コメント報告フォーマット

### 実装開始時
```markdown
🤖 Claude Code が実装を開始します。

## 読み込んだSSO
- [SSOT名](パス)

## 実装計画
1. [ファイル1] - [変更内容]
2. [ファイル2] - [変更内容]

## 見積もり
- 変更ファイル数: N件
- 新規ファイル数: N件
```

### 実装完了時
```markdown
✅ 実装が完了しました。

## 作成したPR
- #XX [PR名]

## 変更内容
- [変更サマリー]

## チェックリスト
- [x] SSOT準拠
- [x] 禁止パターン未検出
- [x] TypeScript型チェック通過
- [x] テスト通過
```

### 中断時
```markdown
🚨 実装を中断しました。

## 中断理由
[理由の詳細]

## 必要なアクション
[人間に求めるアクション]
```
