# GitHub SecretsとDokkuデプロイキーの設定ガイド

このドキュメントでは、GitHub ActionsからDokkuへのデプロイに必要なSecretsとデプロイキーの設定方法について説明します。

## 必要なGitHub Secrets

GitHub Actionsでのデプロイに必要な以下のSecretsを設定します：

1. `DOKKU_HOST`: DokkuサーバーのIPアドレスまたはホスト名
2. `DOKKU_DEPLOY_KEY`: SSHデプロイキー（秘密鍵）

## デプロイキーの生成と設定手順

### 1. SSHキーペアの生成

ローカルマシンで以下のコマンドを実行して、デプロイ用のSSHキーペアを生成します：

```bash
# キーペアを生成
ssh-keygen -t ed25519 -f dokku_deploy_key -N ""

# 公開鍵を表示
cat dokku_deploy_key.pub

# 秘密鍵を表示
cat dokku_deploy_key
```

### 2. Dokkuサーバーに公開鍵を登録

生成した公開鍵をDokkuサーバーに登録します：

```bash
# 公開鍵をDokkuサーバーに登録
cat dokku_deploy_key.pub | ssh admin@<サーバーIP> "sudo dokku ssh-keys:add github_actions"
```

### 3. GitHub Secretsの設定

1. GitHubリポジトリのページに移動します。

2. 「Settings」タブをクリックします。

3. 左側のメニューから「Secrets and variables」→「Actions」を選択します。

4. 「New repository secret」ボタンをクリックします。

5. 以下のSecretsを追加します：

   a. `DOKKU_HOST`
      - Name: DOKKU_HOST
      - Value: Dokkuサーバーのホスト名またはIPアドレス（例：163.44.117.60）

   b. `DOKKU_DEPLOY_KEY`
      - Name: DOKKU_DEPLOY_KEY
      - Value: 生成した秘密鍵の内容（dokku_deploy_keyファイルの内容）
        - 秘密鍵の内容は、`cat dokku_deploy_key`コマンドで表示されるテキスト全体をコピーします。
        - 必ず改行を含めた全体をコピーしてください。

### 4. 複数アプリケーション用のSecrets設定（オプション）

hotel-saasとhotel-commonのように複数のアプリケーションを別々にデプロイする場合は、アプリケーションごとに異なるSecretsを設定することも可能です：

1. `DOKKU_SAAS_HOST` / `DOKKU_COMMON_HOST`: 各アプリケーションのDokkuホスト
2. `DOKKU_SAAS_APP` / `DOKKU_COMMON_APP`: Dokkuアプリケーション名
3. `DOKKU_SAAS_DEPLOY_KEY` / `DOKKU_COMMON_DEPLOY_KEY`: デプロイキー

この場合、GitHub Actionsのワークフローファイルも適宜修正してください。

## GitHub Actionsワークフローファイルの確認

`.github/workflows/deploy-saas.yml`と`.github/workflows/deploy-common.yml`ファイルが正しく設定されていることを確認してください。

例：
```yaml
name: Deploy hotel-saas
on:
  push:
    branches: [ "main" ]
    paths:
      - 'hotel-saas/**'
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Add dokku remote
        run: git remote add dokku dokku@${{ secrets.DOKKU_HOST }}:hotel-saas
      - name: Push to dokku
        env:
          GIT_SSH_COMMAND: 'ssh -o StrictHostKeyChecking=no -i ~/.ssh/id_ed25519'
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.DOKKU_DEPLOY_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          git push dokku HEAD:refs/heads/master
```

## セキュリティに関する注意事項

- 生成したSSH秘密鍵（dokku_deploy_key）は安全に保管し、必要がなくなったら削除してください。
- GitHub Secretsに保存された情報は暗号化されますが、ワークフローログでは一部の情報が表示される可能性があるため注意してください。
- デプロイキーには最小限の権限のみを付与し、定期的にローテーションすることをお勧めします。
