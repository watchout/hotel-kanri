# Linear + GitHub 統合ガイド

**作成日**: 2025年10月20日  
**バージョン**: v1.0.0  
**対象**: hotel-kanriプロジェクト全体

---

## 📋 目次

1. [概要](#概要)
2. [Linear側の設定](#linear側の設定)
3. [GitHub側の設定](#github側の設定)
4. [使い方](#使い方)
5. [トラブルシューティング](#トラブルシューティング)

---

## 🎯 概要

### 統合によって実現されること

| 機能 | 説明 | 効果 |
|------|------|------|
| **自動Issue更新** | PR作成時にLinear Issueのステータスが自動更新 | ⏱️ 手動更新不要 |
| **自動Issueクローズ** | PRマージ時にLinear Issueが自動クローズ | 🎯 二重管理回避 |
| **Commit連携** | CommitメッセージからLinear Issueを自動リンク | 🔗 トレーサビリティ向上 |
| **PR連携** | Linear IssueからGitHub PRへのリンク | 📊 一元管理 |

---

## 🔧 Linear側の設定

### Step 1: Integrations画面を開く

```
1. 左下の自分のアイコンをクリック
2. "Workspace settings" を選択
3. 左メニュー → "Integrations" をクリック
```

### Step 2: GitHub Integrationを追加

```
1. "GitHub" を探してクリック
2. "Add integration" または "Install" ボタンをクリック
```

### Step 3: GitHubでの認証

```
1. GitHubのログイン画面が表示されます
2. GitHubアカウントでログイン
3. リポジトリへのアクセス許可を求められます
```

### Step 4: リポジトリの選択

```
1. "Select repositories" を選択
2. "watchout/hotel-kanri" を選択
3. "Install & Authorize" をクリック
```

### Step 5: 統合確認

```
1. Integrationsページに戻る
2. "GitHub" が "Connected" と表示されていることを確認
3. "Configure" ボタンで詳細設定を確認
```

---

## 🐙 GitHub側の設定

### PR Templateの更新

`.github/PULL_REQUEST_TEMPLATE.md` に以下が含まれていることを確認：

```markdown
## 🔗 Linear Issue（必須）

**Closes LIN-XXX**

> ⚠️ **必須**: `Closes LIN-XXX` 形式で記載してください（PRマージ時に自動クローズ）
```

✅ **既に設定済み** (2025年10月20日)

---

## 📖 使い方

### 1. Linear Issueの作成

```
1. Linearで新しいIssueを作成
2. Issue IDをメモ（例: LIN-123）
3. Issueのステータスを "Dev Ready" に変更
```

### 2. ブランチの作成

```bash
# Linear Issue IDを含むブランチ名を推奨
git checkout -b feature/LIN-123-implement-user-auth
```

### 3. Commitメッセージ

```bash
# Commitメッセージに Linear Issue ID を含める
git commit -m "feat: Implement user authentication (LIN-123)"
```

**推奨フォーマット**:
```
<type>: <description> (LIN-XXX)

例:
- feat: Add login page (LIN-123)
- fix: Resolve authentication bug (LIN-456)
- docs: Update API documentation (LIN-789)
```

### 4. PR作成

```markdown
# Pull Request

## 🔗 Linear Issue（必須）

**Closes LIN-123**

## 📋 SSOT参照（必須）

- [x] **読了したSSO**: `docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md` @ `a1b2c3d`
- [x] **対象要件ID**: AUTH-001, AUTH-002
- [x] **Out of scope**: パスワード強度チェック（AUTH-010で実装予定）

## 📝 変更内容

...
```

### 5. PR作成後の自動処理

✅ **Linear側で自動実行される処理**:

1. **Issueステータス更新**: "Dev Ready" → "PR Open"
2. **PR URLリンク**: Linear IssueにGitHub PR URLが自動追加
3. **コメント追加**: "PR created: #123" がLinear Issueに追加

### 6. PRマージ後の自動処理

✅ **Linear側で自動実行される処理**:

1. **Issueステータス更新**: "PR Open" → "Done"
2. **完了日時記録**: 自動的に完了日時が記録
3. **コメント追加**: "PR merged: #123" がLinear Issueに追加

---

## 🔑 キーワード一覧

### Issueをクローズするキーワード

PRの**本文**または**Commitメッセージ**に以下を含めると、マージ時に自動クローズ：

| キーワード | 例 | 説明 |
|-----------|-----|------|
| `Closes` | `Closes LIN-123` | 最も一般的 ✅ |
| `Fixes` | `Fixes LIN-123` | Bug修正時 |
| `Resolves` | `Resolves LIN-123` | 問題解決時 |

### Issueをリンクするキーワード（クローズはしない）

| キーワード | 例 | 説明 |
|-----------|-----|------|
| `LIN-XXX` | `Related to LIN-123` | リンクのみ |
| `Refs` | `Refs LIN-123` | 参照のみ |
| `See` | `See LIN-123` | 参照のみ |

### 複数Issueの指定

```markdown
# 複数のIssueをクローズ
Closes LIN-123, LIN-456, LIN-789

# または
Closes LIN-123
Closes LIN-456
Closes LIN-789
```

---

## 🔄 ワークフロー例

### 通常の開発フロー

```
1. Linear: Issue作成 (LIN-123)
   ↓ ステータス: Backlog

2. Linear: ステータス変更
   ↓ ステータス: Dev Ready

3. Git: ブランチ作成
   ↓ git checkout -b feature/LIN-123-xxx

4. Git: 開発 + Commit
   ↓ git commit -m "feat: xxx (LIN-123)"

5. GitHub: PR作成（"Closes LIN-123" を含む）
   ↓ Linear自動更新: Dev Ready → PR Open

6. GitHub: レビュー + CI/CD
   ↓ 全チェック合格

7. GitHub: PRマージ
   ↓ Linear自動更新: PR Open → Done
   ✅ 完了！
```

### Bug修正フロー

```
1. Linear: Bug Issue作成 (LIN-456)
   ↓ ステータス: Backlog
   ↓ Label: Type: Bug

2. Linear: ステータス変更
   ↓ ステータス: Dev Ready

3. Git: ブランチ作成
   ↓ git checkout -b fix/LIN-456-xxx

4. Git: 修正 + Commit
   ↓ git commit -m "fix: Resolve xxx (LIN-456)"

5. GitHub: PR作成（"Fixes LIN-456" を含む）
   ↓ Linear自動更新: Dev Ready → PR Open

6. GitHub: レビュー + CI/CD
   ↓ 全チェック合格

7. GitHub: PRマージ
   ↓ Linear自動更新: PR Open → Done
   ✅ Bug修正完了！
```

---

## 🚨 トラブルシューティング

### Issue IDが認識されない

**症状**: PRマージしてもLinear Issueがクローズされない

**原因と対処**:

1. ✅ **キーワードの確認**
   ```
   ❌ Close LIN-123  (スペルミス)
   ✅ Closes LIN-123 (正しい)
   ```

2. ✅ **Issue IDの確認**
   ```
   ❌ LIN 123      (スペースあり)
   ❌ lin-123      (小文字)
   ✅ LIN-123      (正しい)
   ```

3. ✅ **記載場所の確認**
   ```
   ✅ PR本文に記載
   ✅ Commitメッセージに記載
   ❌ PRタイトルのみ（効果なし）
   ```

### GitHub連携が切れている

**症状**: PR作成してもLinearが更新されない

**確認方法**:
```
1. Linear → Workspace Settings → Integrations
2. GitHub が "Connected" になっているか確認
3. "Disconnected" の場合は再接続
```

**再接続手順**:
```
1. "Reconnect" ボタンをクリック
2. GitHubで再認証
3. リポジトリのアクセス許可を再確認
```

### 自動更新が遅い

**症状**: PRマージから5分以上経ってもLinearが更新されない

**原因**: Linear APIの遅延（通常1-2分）

**対処**:
```
1. 5分待つ（通常は自動更新される）
2. Linearページをリフレッシュ
3. それでも更新されない場合は手動で更新
```

---

## 📊 統合状況の確認

### Linear側で確認

```
1. Issueを開く
2. 右側のサイドバーに "GitHub" セクションがあることを確認
3. PRへのリンクが表示されていることを確認
```

### GitHub側で確認

```
1. PRを開く
2. 右側のサイドバーに "Linear" マークがあることを確認
3. Issueへのリンクが表示されていることを確認
```

---

## 🎯 ベストプラクティス

### 1. ブランチ命名規則

```bash
# 推奨: Linear Issue IDを含める
feature/LIN-123-user-authentication
fix/LIN-456-login-bug
docs/LIN-789-api-documentation

# 非推奨
feature/user-auth  (Issue IDなし)
```

### 2. Commitメッセージ

```bash
# 推奨: 明確な説明 + Issue ID
git commit -m "feat: Add JWT authentication (LIN-123)"
git commit -m "fix: Resolve null pointer error in login (LIN-456)"

# 非推奨
git commit -m "update"
git commit -m "fix bug"
```

### 3. PRの粒度

```
✅ 1 Issue = 1 PR（推奨）
- 明確な対応関係
- レビューしやすい
- 自動クローズが確実

⚠️ 1 PR = 複数 Issues（場合による）
- 密接に関連する場合のみ
- PR本文に全Issue IDを記載
```

### 4. Issueステータス管理

```
開発開始前: Backlog → Dev Ready
PR作成後: Dev Ready → PR Open (自動)
PRマージ後: PR Open → Done (自動)

⚠️ 手動でステータスを変更しない
（自動更新に任せる）
```

---

## 📚 参考資料

- **Linear公式ドキュメント**: https://linear.app/docs/github
- **GitHub公式ドキュメント**: https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue
- **hotel-kanri PR Template**: `.github/PULL_REQUEST_TEMPLATE.md`
- **Linear Setup Guide**: `docs/setup/LINEAR_SETUP_GUIDE.md`

---

## ✅ チェックリスト

### 初回設定時

- [ ] Linear側でGitHub Integration設定完了
- [ ] GitHubリポジトリ接続完了
- [ ] PR Template更新完了
- [ ] テストPRで動作確認完了

### 日常運用時

- [ ] Linear IssueにIDが付与されている
- [ ] ブランチ名にIssue IDを含めた
- [ ] CommitメッセージにIssue IDを含めた
- [ ] PR本文に `Closes LIN-XXX` を記載した
- [ ] PRマージ後にLinear Issueが自動クローズされた

---

**最終更新**: 2025年10月20日  
**バージョン**: v1.0.0  
**管理者**: Iza (統合管理者)

