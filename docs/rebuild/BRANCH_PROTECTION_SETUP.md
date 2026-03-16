# 🛡️ Branch Protection 設定ガイド

**最終更新**: 2025年11月7日  
**対象リポジトリ**: hotel-saas-rebuild, hotel-common-rebuild  
**目的**: 品質ゲートの"抜け"を完全に防止する

---

## 🎯 設定対象ブランチ

- `develop` - リビルド開発のデフォルト（PRのbase）
- `main` - 完成版（最終統合用）

---

## ✅ 必須設定項目

### 1. Require a pull request before merging

- ✅ **Require approvals**: `1`
- ✅ **Dismiss stale pull request approvals when new commits are pushed**: ON
- ✅ **Require review from Code Owners**: ON
- ✅ **Require approval of the most recent reviewable push**: ON

### 2. Require status checks to pass before merging

- ✅ **Require branches to be up to date before merging**: ON

#### 必須ステータスチェック（★重要）

以下を**全て**必須に設定：

```
quality-gate           ← ★最重要（統括ジョブ）
evidence-check
ssot-compliance
crud-verify
lint-and-typecheck
security
```

**注意**: 個別ジョブが表示されない場合があるため、**`quality-gate`は必須**

### 3. Require conversation resolution before merging

- ✅ **ON** - 全てのコメントを解決必須

### 4. Require signed commits

- ⚠️ **任意** - プロジェクト方針に従う

### 5. Require linear history

- ✅ **ON** - マージコミットを禁止、Squash/Rebaseのみ許可

### 6. Require deployments to succeed before merging

- ❌ **OFF** - デプロイは別フロー

### 7. Lock branch

- ❌ **OFF** - 開発中は不要

### 8. Do not allow bypassing the above settings

- ✅ **ON** - 管理者も例外なし

### 9. Restrict who can push to matching branches

- ✅ **ON** - Gatekeepersのみpush許可
- ✅ **Include administrators**: OFF（管理者も制約対象）
- ✅ **Allow force pushes**: **OFF**（必須）
- ✅ **Allow deletions**: OFF

---

## 🔧 設定手順（GitHub UI）

### hotel-saas-rebuild

1. https://github.com/watchout/hotel-saas-rebuild/settings/branches に移動

2. `develop` ブランチの "Add rule" をクリック

3. Branch name pattern: `develop`

4. 上記の必須設定項目を全てON

5. 必須ステータスチェックを追加：
   - 検索ボックスで `quality-gate` を検索して追加
   - 同様に `evidence-check`, `ssot-compliance`, `crud-verify`, `lint-and-typecheck`, `security` を追加

6. "Create" をクリック

7. 同様に `main` ブランチも設定

### hotel-common-rebuild

1. https://github.com/watchout/hotel-common-rebuild/settings/branches に移動

2. 上記と同じ手順を実施

---

## 📝 CODEOWNERS 設定

### 1. CODEOWNERSファイル作成

**hotel-saas-rebuild/.github/CODEOWNERS**:

```
# Rebuild Project - Gatekeeper必須レビュー
* @watchout/gatekeepers

# 特定ディレクトリの追加ルール
/server/api/** @watchout/backend-team
/pages/** @watchout/frontend-team
/.github/workflows/** @watchout/devops-team
```

**hotel-common-rebuild/.github/CODEOWNERS**:

```
# Rebuild Project - Gatekeeper必須レビュー
* @watchout/gatekeepers

# 特定ディレクトリの追加ルール
/src/routes/** @watchout/backend-team
/prisma/** @watchout/database-team
/.github/workflows/** @watchout/devops-team
```

### 2. GitHub Team作成

1. https://github.com/orgs/watchout/teams に移動

2. "New team" をクリック

3. Team name: `gatekeepers`

4. メンバー追加（Gatekeeperロールの担当者）

5. 同様に `backend-team`, `frontend-team`, `devops-team`, `database-team` を作成

---

## 🎯 PR Base Branch 固定

### 1. PR作成時の自動チェック

**ci.yml に追加**:

```yaml
pr-base-check:
  name: PR Base Branch Check
  runs-on: ubuntu-latest
  if: github.event_name == 'pull_request'
  steps:
    - name: Verify PR base is develop
      run: |
        BASE_BRANCH="${{ github.event.pull_request.base.ref }}"
        if [ "$BASE_BRANCH" != "develop" ]; then
          echo "❌ PRのbaseブランチは'develop'である必要があります。現在: $BASE_BRANCH"
          exit 1
        fi
        echo "✅ PRのbaseブランチは'develop'です"
```

### 2. 品質チェックスクリプト

**scripts/quality/pr-policy.cjs**:

```javascript
#!/usr/bin/env node
const fs = require('fs');

const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.log('⏭️  GitHub Event外での実行（ローカル）');
  process.exit(0);
}

const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
const baseBranch = event.pull_request?.base?.ref;

if (baseBranch !== 'develop') {
  console.error(`❌ PRのbaseブランチは'develop'である必要があります。現在: ${baseBranch}`);
  process.exit(1);
}

console.log('✅ PRのbaseブランチは'develop'です');
```

---

## 📊 確認方法

### 設定確認

```bash
# GitHub CLI（推奨）
gh repo view watchout/hotel-saas-rebuild --json branchProtectionRules

# または手動確認
open https://github.com/watchout/hotel-saas-rebuild/settings/branches
```

### テスト

```bash
# 1. develop以外へのPRを試す（失敗するはず）
git checkout -b test/wrong-base
git push -u origin test/wrong-base
gh pr create --base main --title "[TEST] Wrong base" --body "Test"
# → pr-base-check ジョブが失敗するはず

# 2. 必須チェックなしでマージを試す（失敗するはず）
# → "Required status checks have not passed"エラーが出るはず

# 3. CODEOWNERSなしでマージを試す（失敗するはず）
# → "Review required from code owners"エラーが出るはず
```

---

## 🚨 トラブルシューティング

### 問題1: 必須チェックが表示されない

**原因**: CIが一度も実行されていない

**解決策**:
1. PRを1つ作成してCIを実行
2. CI完了後、再度Branch Protection設定を開く
3. ステータスチェック一覧に表示されるようになる

### 問題2: quality-gateが見つからない

**原因**: ci.ymlに`quality-gate`ジョブがない

**確認**:
```bash
grep -n "quality-gate:" .github/workflows/ci.yml
```

**追加（必要な場合）**:
```yaml
quality-gate:
  name: Quality Gate (Summary)
  runs-on: ubuntu-latest
  needs: [evidence-check, ssot-compliance, lint-and-typecheck, crud-verify, security, build]
  if: always()
  steps:
    - name: Check all jobs passed
      run: |
        if [ "${{ contains(needs.*.result, 'failure') }}" == "true" ]; then
          echo "❌ Quality gate failed"
          exit 1
        fi
        echo "✅ Quality gate passed"
```

### 問題3: force-pushが禁止されない

**確認**: Branch Protection設定で以下をOFF

- "Allow force pushes" → **OFF**
- "Allow deletions" → **OFF**

---

## 📋 チェックリスト

### hotel-saas-rebuild

- [ ] `develop` ブランチ保護設定完了
- [ ] `main` ブランチ保護設定完了
- [ ] 必須ステータスチェック6件追加
- [ ] CODEOWNERSファイル作成
- [ ] GitHub Team作成
- [ ] pr-base-check追加
- [ ] 設定確認完了
- [ ] テスト実施完了

### hotel-common-rebuild

- [ ] `develop` ブランチ保護設定完了
- [ ] `main` ブランチ保護設定完了
- [ ] 必須ステータスチェック6件追加
- [ ] CODEOWNERSファイル作成
- [ ] GitHub Team作成
- [ ] pr-base-check追加
- [ ] 設定確認完了
- [ ] テスト実施完了

---

## 📚 関連ドキュメント

- **運用ガイド**: `/Users/kaneko/hotel-kanri/docs/rebuild/GH_OPERATIONS.md`
- **CI/CD**: `/Users/kaneko/hotel-kanri/docs/rebuild/OPERATIONS.md`
- **Gatekeeper**: `/Users/kaneko/hotel-kanri/docs/rebuild/AGENT_PROMPT_GATEKEEPER.md`

