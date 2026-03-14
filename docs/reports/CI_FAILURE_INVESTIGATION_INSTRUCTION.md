# CI失敗原因調査指示書

## 🎯 調査目的

PR #5 が GitHub Actions CI でブロックされている原因を特定し、解決策を提示する。

---

## 📋 調査対象のワークフロー

以下の4つのワークフローが失敗していると推測される：

### 1. `ci.yml` - CI - Quality Gate
**チェック内容**:
- ops-policy-lint: ポリシー違反検出
- ssot-compliance: SSOT準拠チェック
- typescript-check: 型エラー検出
- eslint: コード品質
- unit-tests: 単体テスト
- route-order: ルーティング順序検証

**ファイルパス**: `.github/workflows/ci.yml`

---

### 2. `ssot-compliance.yml` - SSOT準拠チェック
**チェック内容**:
- PR本文からSSOT参照を抽出
- 要件ID（XXX-nnn）の存在確認
- GitHub CLI + check-ssot-citations.cjs

**ファイルパス**: `.github/workflows/ssot-compliance.yml`

---

### 3. `qos-gatekeeper.yml` - QOS Gatekeeper
**チェック内容**:
- PR本文の必須リンク検証（SSOT規格、ADR、Linear）
- OpenAPI Lint（Spectral）
- SSOT requirements coverage
- Semgrep（セキュリティスキャン）

**ファイルパス**: `.github/workflows/qos-gatekeeper.yml`

---

### 4. `ops-policy-lint.yml` - OPS Policy Lint
**チェック内容**:
- ops/policy.yml の整合性チェック
- 進捗管理ルールの検証

**ファイルパス**: `.github/workflows/ops-policy-lint.yml`

---

## 🔍 調査手順

### Step 1: PR #5 の最新コミットを確認

```bash
cd /Users/kaneko/hotel-kanri
gh pr view 5 --json headRefOid,commits
```

**確認ポイント**:
- 最新コミットSHA
- コミット数
- ブランチ名: `chore/qos-gatekeeper`

---

### Step 2: PR #5 のチェック実行状況を確認

```bash
gh pr checks 5
```

**確認ポイント**:
- どのチェックが `fail` しているか
- どのチェックが `pass` しているか
- どのチェックが `skipping` しているか

---

### Step 3: 失敗しているワークフローのログを取得

失敗している各ワークフローについて：

```bash
# 最新の実行を取得
gh run list --workflow=<workflow-name>.yml --branch chore/qos-gatekeeper --limit 1 --json databaseId

# ログを取得
gh run view <run-id> --log-failed
```

**確認ポイント**:
- エラーメッセージ
- 失敗したステップ
- エラーの種類（構文エラー、ロジックエラー、環境エラー等）

---

### Step 4: 過去の成功PR（PR #2）と比較

```bash
# PR #2 の情報を取得
gh pr view 2 --json headRefOid,mergedAt,state

# PR #2 のチェック実行を確認
gh api repos/watchout/hotel-kanri/commits/<commit-sha>/check-runs
```

**比較ポイント**:
- PR #2 で成功したチェック vs PR #5 で失敗しているチェック
- ワークフローファイルの差分
- PR本文の形式の違い

---

### Step 5: ワークフローファイルの構文チェック

```bash
# 各ワークフローファイルを読み込み
cat .github/workflows/ci.yml
cat .github/workflows/ssot-compliance.yml
cat .github/workflows/qos-gatekeeper.yml
cat .github/workflows/ops-policy-lint.yml
```

**確認ポイント**:
- YAML構文エラー
- 重複定義
- トリガー条件（`on:` セクション）
- 必須パラメータの欠落

---

### Step 6: PR #5 の本文内容を確認

```bash
gh pr view 5 --json body
```

**確認ポイント**:
- SSOT参照が記載されているか（`docs/03_ssot/`）
- 要件ID（XXX-nnn形式）が記載されているか
- 必須リンクが全て含まれているか：
  - `docs/03_ssot/00_foundation/SSOT_STANDARDS_INDEX.md`
  - `docs/prompts/QOS_V1_PROMPT_KIT.md`
  - `docs/03_ssot/`
  - `docs/adr/ADR-`
  - `Linear`

---

### Step 7: 関連スクリプトの存在確認

```bash
# 必須スクリプトが存在するか確認
ls -la scripts/check-ssot-citations.cjs
ls -la scripts/check-requirement-coverage.cjs
ls -la ops/scripts/validate-policy.js
ls -la scripts/quality/check-route-order.cjs
```

**確認ポイント**:
- ファイルが存在するか
- 実行権限があるか
- 正しい拡張子か（`.js` vs `.cjs`）

---

### Step 8: Spectral ruleset の存在確認

```bash
ls -la .spectral.yaml
cat .spectral.yaml
```

**確認ポイント**:
- `.spectral.yaml` が存在するか
- 構文エラーがないか
- 存在しないルールを参照していないか

---

## 📊 期待される出力

### 調査レポート形式

```markdown
# CI失敗原因調査レポート

## 実行日時
YYYY-MM-DD HH:MM:SS

## 調査対象
- PR番号: #5
- ブランチ: chore/qos-gatekeeper
- 最新コミット: <sha>

## 失敗しているチェック

### 1. <workflow-name>
- **ステータス**: fail
- **実行ID**: <run-id>
- **エラーメッセージ**: 
  ```
  <error-message>
  ```
- **原因**: <root-cause>
- **解決策**: <solution>

### 2. <workflow-name>
（以下同様）

## 成功しているチェック
- <list-of-passing-checks>

## 比較分析（PR #2 vs PR #5）
- **差分**: <differences>
- **影響**: <impact>

## 推奨される対応
1. <action-1>
2. <action-2>
3. <action-3>

## 補足情報
- <additional-notes>
```

---

## 🚨 よくあるエラーパターン

### Pattern 1: ワークフローファイル構文エラー
```
Error: workflow file syntax error
```
**原因**: YAML構文エラー、重複定義
**確認方法**: ワークフローファイルを読み込んで構文チェック

---

### Pattern 2: スクリプト not found
```
Error: Cannot find module 'scripts/xxx.js'
```
**原因**: ファイル名の不一致（`.js` vs `.cjs`）
**確認方法**: スクリプトの存在と拡張子を確認

---

### Pattern 3: PR本文の必須項目不足
```
❌ Missing: docs/03_ssot/
```
**原因**: PR本文に必須リンクが記載されていない
**確認方法**: PR本文を確認

---

### Pattern 4: Spectral ruleset エラー
```
No ruleset has been found
```
**原因**: `.spectral.yaml` が存在しない、または構文エラー
**確認方法**: `.spectral.yaml` の存在と内容を確認

---

### Pattern 5: ESM/CommonJS 問題
```
ReferenceError: require is not defined in ES module scope
```
**原因**: `package.json` に `"type": "module"` があり、`.js` ファイルがESMとして解釈される
**確認方法**: スクリプトの拡張子を `.cjs` に変更

---

## 🎯 調査完了条件

以下が全て満たされたら調査完了：

- [ ] 失敗しているチェックを全て特定
- [ ] 各チェックの失敗原因を特定
- [ ] 各失敗に対する解決策を提示
- [ ] PR #2（成功例）との差分を分析
- [ ] 推奨される対応手順を作成

---

## 📎 参考情報

### リポジトリ情報
- **リポジトリ**: watchout/hotel-kanri
- **ブランチ**: chore/qos-gatekeeper
- **PR**: #5

### 過去の成功PR
- **PR #2**: MERGED (2025-10-24T01:50:48Z)
- **タイトル**: Chore/qos gatekeeper

### 最近の修正コミット
- `bb82a19`: fix(ci): Fix broken workflow files (quality.yml, spellcheck.yml)
- `e56bb46`: feat(ci): Add Spectral ruleset for OpenAPI linting
- `1e2d867`: fix(ci): Rename check-ssot-citations.js to .cjs for CommonJS compatibility
- `d6bc43a`: chore(ci): Standardize CI job names and enforce branch protection

---

## 💡 追加調査項目（オプション）

時間があれば以下も調査：

1. GitHub Actions の実行履歴（全体）
   ```bash
   gh run list --limit 20
   ```

2. Branch Protection の設定確認
   ```bash
   gh api repos/watchout/hotel-kanri/branches/main/protection
   ```

3. Repository の Actions 設定確認
   ```bash
   gh api repos/watchout/hotel-kanri --jq '.permissions'
   ```

---

## 📝 調査実行コマンド（まとめ）

```bash
# 環境確認
cd /Users/kaneko/hotel-kanri
pwd

# PR #5 情報取得
gh pr view 5 --json headRefOid,commits,body,state

# チェック状況確認
gh pr checks 5

# 各ワークフローの最新実行確認
for workflow in ci ssot-compliance qos-gatekeeper ops-policy-lint; do
  echo "=== $workflow.yml ==="
  gh run list --workflow=$workflow.yml --branch chore/qos-gatekeeper --limit 1 --json databaseId,status,conclusion
done

# 失敗ログ取得（run-id は上記で取得）
# gh run view <run-id> --log-failed

# スクリプト存在確認
ls -la scripts/*.cjs ops/scripts/*.js .spectral.yaml

# ワークフローファイル構文確認
for file in .github/workflows/{ci,ssot-compliance,qos-gatekeeper,ops-policy-lint}.yml; do
  echo "=== $file ==="
  head -30 "$file"
done
```

---

この指示書に従って調査を実行し、結果を報告してください。

