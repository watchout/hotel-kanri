# 🛡️ GitHub品質ゲート設定完了サマリー

**実施日**: 2025年11月7日  
**対象リポジトリ**: hotel-saas-rebuild, hotel-common-rebuild  
**目的**: 品質ゲートの"抜け"を完全に防止

---

## 📋 前提条件

### アカウント種別による運用の違い

**現状**: `watchout`は**個人アカウント**（GitHub Organization未使用）

#### 個人アカウントの制約

- ❌ GitHub Team機能は使用不可
- ✅ CODEOWNERSは動作（個人指定のみ）
- ✅ Branch Protectionは動作
- ✅ 基本的な承認フローは機能

#### 現在の設定

```
CODEOWNERS:
  * @watchout  ← 個人指定（Team指定ではない）
```

#### Organization移行時の対応（Phase 2以降推奨）

Organization移行後、以下のTeamを作成予定：

- `@watchout-hotel/gatekeepers` - Gatekeeper承認者
- `@watchout-hotel/backend-team` - バックエンド開発者
- `@watchout-hotel/frontend-team` - フロントエンド開発者
- `@watchout-hotel/devops-team` - DevOps担当者
- `@watchout-hotel/security-team` - セキュリティ担当者
- `@watchout-hotel/database-team` - データベース担当者

**移行手順**: `/Users/kaneko/hotel-kanri/docs/rebuild/GATEKEEPER_OPERATIONS.md` 参照

---

## ✅ 完了した設定

### 1. CODEOWNERSファイル作成 ✅

**対象**:
- `/Users/kaneko/hotel-saas-rebuild/.github/CODEOWNERS`
- `/Users/kaneko/hotel-common-rebuild/.github/CODEOWNERS`

**内容**:
- デフォルト: 全ファイルは `@watchout/gatekeepers` の承認必須
- 追加レビュー: Backend/Frontend/DevOps/Security/Database Teamを適宜追加

**効果**:
- Gatekeeperの承認なしではマージ不可
- Branch Protectionで「Require review from Code Owners」をONにすることで強制適用

### 2. PR Base Branch チェック追加 ✅

**対象**:
- `/Users/kaneko/hotel-saas-rebuild/.github/workflows/ci.yml`
- `/Users/kaneko/hotel-common-rebuild/.github/workflows/ci.yml`

**追加内容**:
```yaml
pr-base-check:
  name: PR Base Branch Check
  runs-on: ubuntu-latest
  if: ${{ github.event_name == 'pull_request' }}
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

**効果**:
- `main`への直接PRを防止
- 全てのPRは`develop`をbaseとすることを強制

### 3. Quality Gate統括ジョブ強化 ✅

**変更内容**:
```yaml
quality-gate:
  name: Quality Gate
  runs-on: ubuntu-latest
  needs: [ pr-base-check, evidence-check, ssot-compliance, lint-and-typecheck, unit-tests, crud-verify, build, security ]
  if: always()
  steps:
    - name: Check all jobs passed
      run: |
        if [ "${{ contains(needs.*.result, 'failure') }}" == "true" ] || [ "${{ contains(needs.*.result, 'cancelled') }}" == "true" ]; then
          echo "❌ Quality gate failed"
          exit 1
        fi
        echo "✅ Quality gate passed - All checks successful"
```

**効果**:
- 全ての必須チェックを網羅（`pr-base-check`を追加）
- `if: always()`で全ジョブの結果を確実に集約
- failure/cancelledの両方を検出

### 4. CI並列最適化（concurrency設定）✅

**対象**:
- `/Users/kaneko/hotel-saas-rebuild/.github/workflows/ci.yml`
- `/Users/kaneko/hotel-common-rebuild/.github/workflows/ci.yml`

**追加内容**:
```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' || github.ref != 'refs/heads/main' }}
```

**効果**:
- 同じブランチの古いCI実行を自動キャンセル
- CI実行枠の節約（GitHub Actions並列制限への対応）
- CI結果の見やすさ向上

### 5. evidence-check実装の標準化 ✅

**リポジトリ間の実装差異を統一**:

| リポジトリ | 実装方法 | ファイル |
|-----------|---------|---------|
| **hotel-saas-rebuild** | `gh pr view`でPR本文取得 | インラインスクリプト |
| **hotel-common-rebuild** | `scripts/quality/evidence-check.cjs` | 標準スクリプト |

**標準化内容**:
- hotel-common-rebuildに`scripts/quality/evidence-check.cjs`を作成
- 両リポジトリで同じロジックを使用（GITHUB_EVENT_PATH経由）
- PR本文の必須セクション検証（参照SSOT/Linear/テスト・証跡/CI）

**注**: hotel-saas-rebuildは今後、hotel-common-rebuildと同じスクリプト方式への移行を推奨。

### 6. 設定ガイド・運用ガイド作成 ✅

**作成ファイル**:
- `/Users/kaneko/hotel-kanri/docs/rebuild/BRANCH_PROTECTION_SETUP.md` - Branch Protection設定手順
- `/Users/kaneko/hotel-kanri/docs/rebuild/GATEKEEPER_OPERATIONS.md` - Gatekeeper運用ガイド

**内容**:
- Branch Protection設定手順（GitHub UI操作）
- 必須ステータスチェック一覧
- CODEOWNERSの説明
- GitHub Team作成手順
- Gatekeeper承認フロー・タイムアウト・エスカレーション
- Phase別運用調整
- トラブルシューティング
- チェックリスト

---

## 🎯 必須ステータスチェック（Branch Protection設定）

以下を**全て**Branch Protectionの必須チェックに設定：

```
quality-gate           ← ★最重要（統括ジョブ、全8ジョブを集約）
pr-base-check          ← ★ブランチ戦略の強制（developのみ）
evidence-check         ← PR本文の必須セクション確認
ssot-compliance        ← SSOT参照・要件ID確認
lint-and-typecheck     ← 静的解析（警告0）
unit-tests             ← ユニットテスト
crud-verify            ← CRUD動作確認・Artifact保存
build                  ← ビルド成功確認
security               ← npm audit・Secret scan
```

**注**: `quality-gate`が全8ジョブの結果を集約するため、Branch Protectionでは`quality-gate`のみを必須にすることも可能です（個別ジョブが表示されない場合の保険として、全9件を必須に設定することを推奨）。

---

## 📋 次のアクション（ユーザー実施必須）

### 1. GitHub Team作成

https://github.com/orgs/watchout/teams で以下を作成：

- `gatekeepers` - Gatekeeper担当者
- `backend-team` - バックエンド開発者
- `frontend-team` - フロントエンド開発者
- `devops-team` - DevOps担当者
- `security-team` - セキュリティ担当者
- `database-team` - データベース担当者

### 2. Branch Protection設定（GitHub UI）

#### hotel-saas-rebuild

https://github.com/watchout/hotel-saas-rebuild/settings/branches

**develop ブランチ**:
- [ ] "Add rule" → Branch name pattern: `develop`
- [ ] Require a pull request before merging: ON
  - [ ] Require approvals: `1`
  - [ ] Dismiss stale pull request approvals: ON
  - [ ] Require review from Code Owners: ON
  - [ ] Require approval of the most recent reviewable push: ON
- [ ] Require status checks to pass before merging: ON
  - [ ] Require branches to be up to date: ON
  - [ ] 必須チェック7件追加（上記参照）
- [ ] Require conversation resolution: ON
- [ ] Require linear history: ON
- [ ] Do not allow bypassing: ON
- [ ] Restrict who can push: ON
  - [ ] Include administrators: OFF
  - [ ] Allow force pushes: **OFF**
  - [ ] Allow deletions: OFF
- [ ] "Create"

**main ブランチ**:
- [ ] 同様の手順を実施

#### hotel-common-rebuild

https://github.com/watchout/hotel-common-rebuild/settings/branches

- [ ] hotel-saas-rebuildと同じ手順を実施

### 3. 変更のコミット・プッシュ

```bash
# hotel-saas-rebuild
cd /Users/kaneko/hotel-saas-rebuild
git add .github/CODEOWNERS .github/workflows/ci.yml
git commit -m "chore: 品質ゲート強化 - CODEOWNERS, pr-base-check, quality-gate統括"
git push

# hotel-common-rebuild
cd /Users/kaneko/hotel-common-rebuild
git add .github/CODEOWNERS .github/workflows/ci.yml
git commit -m "chore: 品質ゲート強化 - CODEOWNERS, pr-base-check, quality-gate統括"
git push
```

### 4. 動作確認

#### テスト1: 間違ったbaseブランチでPR作成

```bash
cd /Users/kaneko/hotel-saas-rebuild
git checkout -b test/wrong-base
git commit --allow-empty -m "test: wrong base check"
git push -u origin test/wrong-base
gh pr create --base main --title "[TEST] Wrong base" --body "Test"
```

**期待結果**: `pr-base-check`ジョブが失敗

#### テスト2: 正しいbaseブランチでPR作成

```bash
gh pr create --base develop --title "[TEST] Correct base" --body "Test"
```

**期待結果**: `pr-base-check`ジョブが成功

#### テスト3: Branch Protection確認

1. 上記のテストPRでマージを試みる
2. **期待結果**: 
   - 必須チェックがパスしていない → マージ不可
   - CODEOWNERSの承認がない → マージ不可

---

## 📊 効果測定

### Before（設定前）

- ❌ 間違ったbaseブランチへのPRが可能
- ❌ Gatekeeper承認なしでマージ可能
- ❌ quality-gateジョブが全依存を網羅していない
- ❌ CODEOWNERSが未設定

### After（設定後）

- ✅ `develop`以外へのPRは自動拒否
- ✅ Gatekeeper承認なしではマージ不可
- ✅ quality-gateジョブが全依存（8件）を網羅
- ✅ CODEOWNERSで担当者を明確化

---

## 🔄 今後の運用

### PR作成時

1. ブランチ作成: `feature/com-XX-description`
2. PR作成: base=`develop`（自動チェック）
3. PR本文: テンプレートに従い、SSOT/要件ID/証跡を記載
4. CI実行: 全8ジョブ実行 → quality-gate統括
5. CODEOWNERS承認待ち: Gatekeeper + 追加レビュアー
6. マージ: 全条件を満たしてのみ可能

### Gatekeeper運用

- 全PRのレビュー・承認
- 証跡・品質の第三者チェック
- 不足項目の指摘・差し戻し

---

## 📚 関連ドキュメント

- **設定ガイド**: `/Users/kaneko/hotel-kanri/docs/rebuild/BRANCH_PROTECTION_SETUP.md`
- **運用ガイド**: `/Users/kaneko/hotel-kanri/docs/rebuild/GH_OPERATIONS.md`
- **Gatekeeper**: `/Users/kaneko/hotel-kanri/docs/rebuild/AGENT_PROMPT_GATEKEEPER.md`
- **CI/CD**: `/Users/kaneko/hotel-kanri/docs/rebuild/OPERATIONS.md`

