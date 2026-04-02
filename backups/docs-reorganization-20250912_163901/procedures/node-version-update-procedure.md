# Node.jsバージョンアップグレード手順

**日付**: 2023年8月17日
**作成者**: hotel-kanri

## 1. 背景と目的

hotel-saasのデプロイ失敗の根本的な原因は、サーバー上のNode.jsバージョン（v18.20.8）が、依存パッケージが要求するバージョン（v20以上）を満たしていないことです。この問題を解決するために、サーバー上のNode.jsをバージョン20以上にアップグレードする必要があります。

## 2. 前提条件

- サーバーへのSSHアクセス権限
- `deploy`ユーザーまたは`admin`ユーザーとしてのログイン
- インターネット接続（nvmとNode.jsのダウンロードのため）

## 3. アップグレード手順

### 3.1. 手動実行

以下の手順で、サーバー上のNode.jsをバージョン20にアップグレードします：

1. サーバーにSSH接続します：
   ```bash
   ssh omotenasu-dev # または ssh deploy@163.44.117.60 -i ~/.ssh/hotel_demo_deploy
   ```

2. `hotel-kanri`リポジトリをクローンまたは更新します：
   ```bash
   if [ ! -d "/opt/omotenasuai/hotel-kanri" ]; then
     git clone git@github.com:watchout/hotel-kanri.git /opt/omotenasuai/hotel-kanri
   else
     cd /opt/omotenasuai/hotel-kanri
     git pull origin develop
   fi
   ```

3. アップグレードスクリプトを実行します：
   ```bash
   cd /opt/omotenasuai/hotel-kanri
   bash scripts/server/upgrade-nodejs.sh
   ```

4. アップグレードが完了したことを確認します：
   ```bash
   node -v # v20.x.x が表示されることを確認
   ```

### 3.2. GitHub Actions経由での実行

GitHub Actionsを使用して、サーバー上のNode.jsをアップグレードすることもできます：

1. GitHubのリポジトリページで「Actions」タブを開きます。
2. 「サーバー設定更新」ワークフローを選択します。
3. 「Run workflow」ボタンをクリックします。
4. 以下のパラメータを設定します：
   - スクリプト: `scripts/server/upgrade-nodejs.sh`
5. 「Run workflow」ボタンをクリックして実行します。

## 4. アップグレード後の確認

アップグレード後、以下の点を確認してください：

1. Node.jsのバージョンが20以上になっていることを確認します：
   ```bash
   node -v
   ```

2. npm（Node Package Manager）のバージョンも確認します：
   ```bash
   npm -v
   ```

3. PM2が正常に動作していることを確認します：
   ```bash
   pm2 status
   ```

4. アプリケーションが正常に起動していることを確認します：
   ```bash
   curl -f http://localhost:3100/health # hotel-saas
   curl -f http://localhost:3400/health # hotel-common
   ```

## 5. トラブルシューティング

アップグレード中に問題が発生した場合は、以下の対処法を試してください：

1. **nvmのインストールに失敗した場合**：
   - nvmの公式ドキュメントを参照し、手動でインストールしてください。
   - または、Node.jsの公式パッケージを使用してインストールしてください。

2. **依存関係のインストールに失敗した場合**：
   - `npm cache clean --force`を実行してnpmのキャッシュをクリアしてください。
   - `npm install --legacy-peer-deps`を再度実行してください。

3. **PM2の再起動に失敗した場合**：
   - `pm2 delete all`を実行して既存のプロセスをすべて削除してください。
   - `pm2 start ecosystem.config.js`を実行して、すべてのプロセスを再起動してください。

## 6. 注意事項

- Node.jsのメジャーバージョンアップグレードは、依存パッケージとの互換性に影響を与える可能性があります。
- アップグレード前に、重要なデータのバックアップを取ることをお勧めします。
- アップグレード後、すべてのアプリケーションが正常に動作することを確認してください。
- 問題が発生した場合は、以前のバージョンに戻すことも検討してください。

## 7. 参考リンク

- [nvm（Node Version Manager）の公式ドキュメント](https://github.com/nvm-sh/nvm)
- [Node.js公式ウェブサイト](https://nodejs.org/)
- [PM2公式ドキュメント](https://pm2.keymetrics.io/docs/usage/quick-start/)