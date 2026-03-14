# 🔧 Rebuild GitHub 運用標準（GH Operations）

最終更新: 2025-11-06  
目的: リビルド各リポジトリにおけるブランチ/PR/CI/Plane同期の運用を完全標準化し、誰がやっても同じ結果になるようにする。

---

## 0. リポジトリ方針（重要・結論）
- リビルドは「専用リポジトリ」方式を採用します（`hotel-saas-rebuild` / `hotel-common-rebuild`）。
- 既存リポ（`hotel-saas` / `hotel-common`）に直接ブランチを切ってリビルド開発は行いません。
- 完了後に「統合PR」で既存リポへ取り込む運用とします（統合はPhase 4）。

理由: 責務分離・安全性（既存と新規の完全分離）・監査容易性・同時起動（3101/3401）による比較検証のため。

---

## 1. 対象リポジトリと役割
- hotel-saas-rebuild: Nuxt3（Proxy/UI）。base=develop
- hotel-common-rebuild: Express/Prisma（API/DB）。base=develop
- hotel-kanri: 運用・SSOT・テンプレ管理（本リポ）。base=main

---

## 2. ブランチ戦略（厳守）
- main: 完成版（保護）
- develop: リビルド開発のデフォルト（PRのbase）
- feature/rebuild-<domain>-<short>: 機能開発用（短命）
- chore/com-XX-evidence: 遡及エビデンスPR（空コミット可）

---

## 3. リモート設定（origin必須）
```bash
# 例: hotel-common-rebuild
cd /Users/kaneko/hotel-common-rebuild
git remote -v            # origin 未設定なら追加
git remote add origin git@github.com:watchout/hotel-common-rebuild.git

# 例: hotel-saas-rebuild
cd /Users/kaneko/hotel-saas-rebuild
git remote add origin git@github.com:watchout/hotel-saas-rebuild.git
```

---

## 4. GitHub CLI使用ルール（gh-safe.sh 経由・gh auth login 禁止）

> ✅ GitHub操作は **必ず `gh-safe.sh` 経由** で行い、  
> ❌ `gh auth login` や `gh ...` の直接実行は行わないこと。
>
> 理由: `.env.mcp` に保存された `GH_TOKEN` / `GITHUB_TOKEN` を標準的に読み込み、  
> 認証状態を人間のローカル環境に依存させないため。

```bash
# ✅ 正しい例（標準ラッパーを使用）
cd /Users/kaneko/hotel-kanri/scripts/github
./gh-safe.sh health              # 接続確認
./gh-safe.sh pr view 9 --repo watchout/hotel-saas-rebuild

# ❌ NG例（禁止）
gh auth login                    # インタラクティブ認証は禁止
gh pr create ...                 # 直接のgh呼び出しは禁止
```

- `gh-safe.sh` の挙動:
  - `/Users/kaneko/hotel-kanri/.env.mcp` から `GH_TOKEN` or `GITHUB_TOKEN` を読み込み
  - `export GH_TOKEN=...` をセットしてから `gh ...` を実行
  - **どのAI/ユーザーが実行しても同じ認証状態** で動作する

> **運用ルール**:
> - AIにGitHub操作をさせる場合も、プロンプト上で **「ghではなく ./gh-safe.sh を使う」** と明示すること。
> - shellスクリプト内で `gh` を直接呼び出さないこと（`gh-safe.sh` 経由に置き換える）。

---

## 5. PR作成フロー（共通・最小ステップ）
```bash
# 例: hotel-common-rebuild / COM-52
cd /Users/kaneko/hotel-common-rebuild
git fetch --all
git checkout -B chore/com-52-evidence
git commit --allow-empty -m "chore: COM-52 遡及エビデンスPR（空コミット）"
git push -u origin chore/com-52-evidence

# PR作成（baseは develop）
gh pr create \
  --title "[COM-52] 遡及エビデンスPR" \
  --base develop \
  --body-file /Users/kaneko/hotel-kanri/.github/PULL_REQUEST_TEMPLATE.md
```

- PR本文 必須見出し: 参照SSOT / Plane / テスト・証跡 / CI
- Evidence（最低限）: コマンド生ログ＋終了コード、`crud-verify-results.txt` artifact URL、対象ファイルの `ls -la` / `sha256sum`、Git diff情報

---

## 6. CI 必須ジョブ（名前統一）
- evidence-check: PR本文の必須見出し検証
- ssot-compliance: SSOT整合
- crud-verify: artifact `crud-verify-results.txt` を必須
- lint-and-typecheck: `--max-warnings=0`
- build: ビルド検証
- security: npm audit / secret scan

ブランチ保護: 上記を Required に設定（対象: main, develop）

### 🔗 Branch Protection設定の適用（rebuild専用リポにも必須）

- 設定手順: `docs/setup/BRANCH_PROTECTION_SETUP.md`
- 対象リポジトリ:
  - `watchout/hotel-saas-rebuild`
  - `watchout/hotel-common-rebuild`

必須（Critical Gates・PRブロック）:
- evidence-check
- ssot-compliance
- crud-verify（artifact必須）
- lint-and-typecheck（--max-warnings=0）
- security（npm audit）

任意（Quality Improvement・警告のみ）:
- テストカバレッジ
- OpenAPI Lint

---

## 7. CRUD Verify（artifact必須）
- 成果物: `crud-verify-results.txt` をCI Artifactとしてアップロード
- PR本文にArtifactのURLを記載（抜粋も貼付）

---

## 8. Plane 同期ルール（唯一の進捗源）
- PR Open → Plane: Statusを Started / In Progress
- PR Merge（CI Green）→ Plane: Done + PR URL追記
- 逆方向ガード: Plane Done には PR URL + CI Green Evidence が必要

---

## 9. よくある失敗と対策
- origin未設定 → リモート追加（本書 3章）
- base=mainでPR作成 → base=developに修正（rebuild各リポ）
- PR本文が空 → evidence-checkでFail。テンプレを使用
- Artifact未添付 → crud-verifyでFail。アップロード必須

---

## 10. 運用チェックリスト（毎PR）
- [ ] base=develop（kanriのみmain）
- [ ] PR本文: 必須4見出し記載
- [ ] Evidence: コマンド生ログ/終了コード/時刻
- [ ] Artifact: crud-verify-results.txt（URL）
- [ ] CI: 6ジョブGreen
- [ ] Plane: PR Open時にStarted、Merge後にDone + PR URL

---

## 11. テンプレート適用（他リポにコピー）
- `.github/workflows/rebuild-pr-policy.yml`（templates/workflows 参照）
- `scripts/quality/pr-policy.cjs`（templates/scripts 参照）
- `.github/PULL_REQUEST_TEMPLATE.md`（本リポを流用）

> これらを各rebuildリポに配置すると、同じ処理が必ず実行されます。

---

## 付録: PR本文テンプレート（必須4見出し・例）

以下の見出しは evidence-check で自動検証されます。省略不可。

```markdown
## 📖 参照SSOT
- SSOT_XXX.md（読了）
- 要件ID: XXX-001, XXX-002

## 🎯 Plane Issue
- Issue: COM-52 (https://plane.arrowsworks.com/...)
- Status: In Progress → Done

## 🧪 テスト・証跡
- CRUD Verify: ✅ 全てパス
- Artifact: [crud-verify-results.txt](URL)
- 実行時刻: 2025-11-06 14:30:00
- 終了コード: 0

## 🤖 CI
- evidence-check: ✅
- ssot-compliance: ✅
- crud-verify: ✅
- lint-and-typecheck: ✅
- security: ✅
```


