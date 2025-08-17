# GitHub Actions トラブルシューティングガイド

**日付**: 2023年8月17日
**作成者**: hotel-kanri

## 概要

このガイドは、GitHub Actionsによるデプロイが失敗した場合のトラブルシューティング手順を提供します。短絡的な解決策ではなく、根本的な問題解決を目指します。

## トラブルシューティングの基本手順

### 1. 問題の特定

#### GitHub Actionsのログ確認
```bash
# GitHubのリポジトリページでActionsタブを開き、失敗したワークフローを確認
# または、GitHub CLIを使用してログを取得
gh run view [RUN_ID] --log
```

#### 一般的なエラーパターンの確認
- SSH認証エラー
- 権限エラー
- ビルドエラー
- 依存関係エラー
- 環境変数の問題

### 2. SSH認証問題の解決

#### SSH鍵の確認
```bash
# ローカルでSSH鍵が正しく生成されているか確認
ls -la ~/.ssh/hotel_demo_deploy*

# 公開鍵の内容を確認
cat ~/.ssh/hotel_demo_deploy.pub
```

#### GitHub Secretsの確認
1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」を開く
2. `DEPLOY_SSH_KEY`が存在することを確認
3. 必要に応じて再設定：
   ```bash
   # 秘密鍵の内容をコピー
   cat ~/.ssh/hotel_demo_deploy
   
   # コピーした内容をGitHub Secretsに貼り付け
   ```

#### サーバー側の認証確認
```bash
# サーバーにSSH接続
ssh omotenasu-dev

# deployユーザーの公開鍵が正しく設定されているか確認
sudo cat /home/deploy/.ssh/authorized_keys

# 必要に応じて公開鍵を追加
echo "ssh-rsa AAAA..." | sudo tee -a /home/deploy/.ssh/authorized_keys
```

### 3. Git設定の問題解決

#### safe.directory設定の確認
```bash
# サーバーにSSH接続
ssh omotenasu-dev

# deployユーザーのGit設定を確認
sudo -u deploy git config --global --list | grep safe.directory

# 必要に応じて設定を追加
sudo -u deploy git config --global --add safe.directory /opt/omotenasuai/hotel-saas
```

#### Gitリポジトリの状態確認
```bash
# サーバーにSSH接続
ssh omotenasu-dev

# リポジトリディレクトリに移動
cd /opt/omotenasuai/hotel-saas

# リポジトリの状態を確認
sudo -u deploy git status
sudo -u deploy git remote -v
```

### 4. 環境問題の解決

#### Node.jsバージョンの確認
```bash
# サーバーにSSH接続
ssh omotenasu-dev

# Node.jsバージョンを確認
node -v

# 必要に応じてバージョンをアップグレード
# (Node.jsアップグレード手順は別途文書化)
```

#### 依存関係の確認
```bash
# サーバーにSSH接続
ssh omotenasu-dev

# リポジトリディレクトリに移動
cd /opt/omotenasuai/hotel-saas

# package.jsonを確認
cat package.json

# 依存関係をクリーンインストール
sudo -u deploy npm ci --legacy-peer-deps || sudo -u deploy npm install --legacy-peer-deps
```

### 5. ワークフロー設定の修正

#### ワークフローファイルの確認
```bash
# ローカルでワークフローファイルを確認
cat .github/workflows/deploy-dev.yml
```

一般的な修正点：
- SSH接続設定
- Gitリポジトリ設定
- ビルドコマンド
- 環境変数設定

#### ワークフローの修正と検証
1. 問題を特定したら、ワークフローファイルを修正
2. 修正をコミットしてプッシュ
3. 小さな変更をテスト用にプッシュしてワークフローをトリガー
4. ログを確認して問題が解決したか確認

## 具体的なエラーと解決策

### エラー: "ssh: no key found"
- **原因**: SSH秘密鍵の形式が正しくない、または内容が不完全
- **解決策**: 
  1. 秘密鍵を正しい形式で再生成
  2. GitHub Secretsを更新

### エラー: "Permission denied (publickey)"
- **原因**: サーバー側に公開鍵が正しく設定されていない
- **解決策**:
  1. サーバーの`authorized_keys`ファイルを確認
  2. 公開鍵を追加

### エラー: "fatal: could not read Username"
- **原因**: GitリポジトリのURLがHTTPSで、認証情報がない
- **解決策**:
  1. リポジトリURLをSSH形式に変更
  2. デプロイキーを設定

### エラー: "fatal: not a git repository"
- **原因**: リポジトリが正しくクローンされていない
- **解決策**:
  1. ワークフローでリポジトリをクローンするステップを確認
  2. ディレクトリパスが正しいか確認

### エラー: "npm ERR! code ELIFECYCLE"
- **原因**: ビルドプロセスの失敗
- **解決策**:
  1. ローカルでビルドを試行して同じエラーが発生するか確認
  2. 依存関係を更新

## 検証手順

問題を解決した後、以下の手順で検証します：

1. 小さな変更（コメントの追加など）をリポジトリにプッシュ
2. GitHub Actionsのワークフローが自動的に実行されることを確認
3. ワークフローが成功することを確認
4. サーバーに変更が反映されていることを確認:
   ```bash
   ssh omotenasu-dev
   cd /opt/omotenasuai/hotel-saas
   git log -1  # 最新のコミットを確認
   ```

## 緊急時の対応（最終手段）

GitHub Actionsの問題が即座に解決できない場合の一時的な対応:

1. 開発責任者の承認を得る
2. 手動デプロイの手順に従う（`docs/procedures/manual-deployment-procedure.md`参照）
3. 手動デプロイ後、必ずGitHub Actionsの問題解決に取り組む
4. 問題解決後、再度GitHub Actions経由でデプロイを実行し、正常に動作することを確認

**注意**: この緊急対応は最終手段であり、根本的な問題解決を回避するものではありません。
