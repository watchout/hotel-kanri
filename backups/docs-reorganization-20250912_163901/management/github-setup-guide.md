# GitHub設定ガイド

## 概要

本ドキュメントでは、hotel-kanriリポジトリおよび関連リポジトリのGitHub設定手順について説明します。アクセス権限、保護ブランチ、チーム設定などの具体的な手順を記載しています。

## 前提条件

- GitHubの管理者権限を持っていること
- アクセス制御ポリシー（[access-control-policy.md](access-control-policy.md)）を理解していること

## チーム設定

### チームの作成

1. GitHubの組織ページにアクセス
2. 「Teams」タブをクリック
3. 「New team」ボタンをクリック
4. 以下のチームを作成：

| チーム名 | 説明 | 親チーム |
|---------|------|---------|
| administrators | プロジェクト管理者チーム | なし |
| developers | 開発者チーム | なし |
| reviewers | レビュアーチーム | なし |
| qa | QAチーム | なし |
| deployers | デプロイ担当チーム | なし |
| viewers | 閲覧者チーム | なし |

### チームメンバーの追加

各チームに適切なメンバーを追加します：

1. チーム名をクリック
2. 「Members」タブをクリック
3. 「Add a member」ボタンをクリック
4. ユーザー名またはメールアドレスを入力して追加

## リポジトリアクセス設定

### hotel-kanriリポジトリ

1. hotel-kanriリポジトリのページにアクセス
2. 「Settings」タブをクリック
3. 「Manage access」をクリック
4. 「Add teams or people」ボタンをクリック
5. 以下の権限を設定：

| チーム | アクセスレベル |
|-------|--------------|
| administrators | Admin |
| developers | Write |
| reviewers | Write |
| qa | Read |
| deployers | Write |
| viewers | Read |

### hotel-commonリポジトリ

同様の手順で、hotel-commonリポジトリにも以下の権限を設定：

| チーム | アクセスレベル |
|-------|--------------|
| administrators | Admin |
| developers | Write |
| reviewers | Write |
| qa | Read |
| deployers | Write |
| viewers | Read |

### hotel-saasリポジトリ

| チーム | アクセスレベル |
|-------|--------------|
| administrators | Admin |
| developers (SaaS開発チーム) | Write |
| reviewers | Write |
| qa | Read |
| deployers | Write |
| viewers | Read |

### hotel-pmsリポジトリ

| チーム | アクセスレベル |
|-------|--------------|
| administrators | Admin |
| developers (PMS開発チーム) | Write |
| reviewers | Write |
| qa | Read |
| deployers | Write |
| viewers | Read |

### hotel-memberリポジトリ

| チーム | アクセスレベル |
|-------|--------------|
| administrators | Admin |
| developers (Member開発チーム) | Write |
| reviewers | Write |
| qa | Read |
| deployers | Write |
| viewers | Read |

## ブランチ保護設定

### mainブランチの保護

1. リポジトリの「Settings」タブをクリック
2. 「Branches」をクリック
3. 「Branch protection rules」セクションで「Add rule」をクリック
4. 以下の設定を行う：
   - Branch name pattern: `main`
   - Require pull request reviews before merging: チェック
     - Required approving reviews: 1
   - Require status checks to pass before merging: チェック
     - Status checks that are required: 
       - `document-validation`
       - `script-validation`
       - `config-validation`
   - Require linear history: チェック
   - Include administrators: チェック
   - Restrict who can push to matching branches: チェック
     - 「administrators」チームを選択

### developブランチの保護

同様の手順で、developブランチにも以下の保護設定を行う：

- Branch name pattern: `develop`
- Require pull request reviews before merging: チェック
  - Required approving reviews: 1
- Require status checks to pass before merging: チェック
- Allow force pushes: チェックなし
- Allow deletions: チェックなし

### productionブランチの保護（該当する場合）

- Branch name pattern: `production`
- Require pull request reviews before merging: チェック
  - Required approving reviews: 2
- Require status checks to pass before merging: チェック
- Require conversation resolution before merging: チェック
- Restrict who can push to matching branches: チェック
  - 「administrators」と「deployers」チームを選択

## デフォルトブランチの設定

1. リポジトリの「Settings」タブをクリック
2. 「Branches」をクリック
3. 「Default branch」セクションで「Switch to another branch」をクリック
4. `develop`ブランチを選択して「Update」をクリック

## Webhook設定

### Slack通知Webhook

1. リポジトリの「Settings」タブをクリック
2. 「Webhooks」をクリック
3. 「Add webhook」ボタンをクリック
4. 以下の設定を行う：
   - Payload URL: Slack Incoming WebhookのURL
   - Content type: `application/json`
   - Secret: 適切なシークレットを設定
   - イベント選択: 
     - Pull requests
     - Issues
     - Discussions
     - Workflow runs

## シークレット設定

### GitHub Actions用シークレット

1. リポジトリの「Settings」タブをクリック
2. 「Secrets and variables」→「Actions」をクリック
3. 「New repository secret」ボタンをクリック
4. 以下のシークレットを追加：
   - `SLACK_WEBHOOK_URL`: Slack通知用WebhookのURL

## Issue・PRテンプレートの確認

1. リポジトリの`.github`ディレクトリに以下のファイルが存在することを確認：
   - `ISSUE_TEMPLATE/feature_request.md`
   - `ISSUE_TEMPLATE/bug_report.md`
   - `ISSUE_TEMPLATE/document_update.md`
   - `ISSUE_TEMPLATE/config.yml`
   - `PULL_REQUEST_TEMPLATE.md`

2. 必要に応じて内容を調整

## GitHub Actionsの有効化

1. リポジトリの「Settings」タブをクリック
2. 「Actions」→「General」をクリック
3. 「Allow all actions and reusable workflows」を選択
4. 「Save」ボタンをクリック

## 検証手順

設定完了後、以下の検証を行います：

### アクセス権限の検証

1. 各チームのメンバーとして異なるアカウントでログイン
2. 期待される操作（読み取り、書き込み、管理）が可能かを確認

### ブランチ保護の検証

1. 保護されたブランチに直接プッシュを試みる（失敗するはず）
2. PRを作成し、レビュー承認なしでマージを試みる（失敗するはず）
3. PRを作成し、レビュー承認後にマージを試みる（成功するはず）

### CI/CDの検証

1. ドキュメントを変更してPRを作成
2. GitHub Actionsが正常に実行されることを確認
3. ステータスチェックが保護ブランチのマージ条件として機能することを確認

## トラブルシューティング

### アクセス権限の問題

**症状**: メンバーが期待される操作を実行できない

**解決策**:
1. チームメンバーシップを確認
2. リポジトリの権限設定を確認
3. 組織の設定でベースとなる権限が制限されていないか確認

### ブランチ保護の問題

**症状**: 保護設定が期待通りに機能しない

**解決策**:
1. ブランチ保護ルールの設定を確認
2. 管理者がルールを回避していないか確認
3. ステータスチェックが正しく設定されているか確認

### GitHub Actions関連の問題

**症状**: ワークフローが実行されない

**解決策**:
1. ワークフローファイルの構文を確認
2. リポジトリでActionsが有効になっているか確認
3. 必要なシークレットが設定されているか確認

## 責任者

- **GitHub設定責任者**: [役職名]
- **レビュー担当**: [役職名]
- **承認者**: [役職名]

---

本ドキュメントは定期的にレビューし、必要に応じて更新してください。最終更新日: YYYY-MM-DD