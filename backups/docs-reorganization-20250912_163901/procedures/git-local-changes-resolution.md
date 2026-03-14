# Gitローカル変更の解決手順

**日付**: 2023年8月17日
**作成者**: hotel-kanri

## 概要

このドキュメントは、開発サーバー上のGitリポジトリにローカルな変更が残っており、GitHub Actionsによるデプロイが失敗する場合の解決手順を提供します。

## 問題の詳細

GitHub Actionsのデプロイログで以下のようなエラーが発生している場合、サーバー上のリポジトリにコミットされていないローカルな変更があることが原因です：

```
error: Your local changes to the following files would be overwritten by merge:
	assets/css/billing-fix.css
	layouts/fullscreen.vue
	layouts/info.vue
	layouts/receipt.vue
	nuxt.config.ts
	package-lock.json
	package.json
Please commit your changes or stash them before you merge.
Aborting
```

## 解決手順

### 1. 現在の変更状態を確認

まず、サーバー上のリポジトリの状態を確認します：

```bash
ssh omotenasu-dev
cd /opt/omotenasuai/hotel-saas
git status
```

### 2. 変更内容の確認（オプション）

変更内容を確認したい場合は以下のコマンドを実行します：

```bash
git diff
```

### 3. 解決方法の選択

ローカルな変更の処理には以下の3つの方法があります：

#### A. 変更を破棄する（推奨）

GitHub上の最新の変更を優先する場合は、ローカルな変更を破棄します：

```bash
git reset --hard HEAD
git clean -fd  # 追跡されていないファイルも削除
```

#### B. 変更をスタッシュする

変更を一時的に退避させたい場合は、スタッシュを使用します：

```bash
git stash save "一時的に変更を退避"
```

後で必要になった場合は以下のコマンドで復元できます：

```bash
git stash list  # スタッシュの一覧を表示
git stash apply stash@{0}  # 最新のスタッシュを適用
```

#### C. 変更をコミットする

変更を維持したい場合は、ローカルブランチにコミットします：

```bash
git checkout -b local-changes
git add .
git commit -m "ローカルな変更を保存"
git checkout main
```

### 4. 最新の変更を取得

ローカルな変更を処理した後、リモートリポジトリから最新の変更を取得します：

```bash
git pull origin main
```

### 5. デプロイの再試行

GitHub Actionsのワークフローを手動で再実行するか、小さな変更をプッシュしてワークフローをトリガーします。

## 注意事項

- **データ損失の可能性**: `git reset --hard`や`git clean -fd`を実行すると、コミットされていない変更は永久に失われます。重要な変更がある場合は、実行前に必ずバックアップを取ってください。

- **権限の確認**: コマンドを実行する前に、適切な権限（`deploy`ユーザー）でログインしていることを確認してください。

## 再発防止策

1. サーバー上でファイルを直接編集しないでください。すべての変更はGitHubリポジトリを通じて行い、GitHub Actionsでデプロイしてください。

2. 緊急時にサーバー上で直接変更を行った場合は、変更をコミットしてGitHubにプッシュするか、作業完了後に変更を破棄してください。

3. デプロイスクリプトを改善し、デプロイ前にローカルな変更を自動的に検出して警告するか、適切に処理するようにしてください。
