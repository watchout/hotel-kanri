# omotenasuai.com 開発・デプロイワークフロー

このドキュメントでは、omotenasuai.comシステムの開発からデプロイまでの標準的なワークフローを定義します。

## 開発環境構成

### 1. ローカル開発環境

- **目的**: 個々の開発者による機能開発、バグ修正
- **構成**: Docker + Docker Compose
- **URL**: localhost:3100/3200/3300/3400
- **データ**: 開発用サンプルデータ

### 2. 開発サーバー環境

- **目的**: 統合テスト、他の開発者との共有
- **サーバー**: ConoHa VPS (163.44.117.60)
- **URL**: dev-all.omotenasuai.com, dev-app.omotenasuai.com, etc.
- **データ**: 開発用共有データセット

### 3. 本番環境

- **目的**: 実サービス提供
- **サーバー**: Core-X (163.44.176.23) + さくらクラウド（将来計画）
- **URL**: all.omotenasuai.com, app.omotenasuai.com, etc.
- **データ**: 本番データ

## 標準開発ワークフロー

### 1. ローカル開発

1. **環境準備**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   cp env.example .env
   # .envファイルを編集
   docker-compose up -d
   ```

2. **機能開発**
   - ブランチ命名規則: `feature/<機能名>` または `fix/<バグ名>`
   - コミットメッセージ規則: `<type>: <description>`
     - type: feat, fix, docs, style, refactor, test, chore

3. **ローカルテスト**
   ```bash
   # ユニットテスト
   npm run test
   
   # リント
   npm run lint
   ```

4. **プルリクエスト作成**
   - GitHubでプルリクエストを作成
   - レビュー依頼

### 2. 開発サーバーへのデプロイ

1. **コードのマージ**
   - プルリクエストのレビュー完了後、mainブランチにマージ

2. **開発サーバーへのデプロイ**
   ```bash
   # 開発サーバーにSSH接続
   ssh admin@163.44.117.60
   
   # プロジェクトディレクトリに移動
   cd ~/projects/<project-name>
   
   # 最新コードの取得
   git pull origin main
   
   # 依存関係のインストール
   npm ci
   
   # ビルド
   npm run build
   
   # アプリケーション再起動
   pm2 reload <app-name>
   ```

3. **開発サーバーでのテスト**
   - 各サブドメイン（dev-all.omotenasuai.com, dev-app.omotenasuai.com等）でのテスト
   - 統合テストの実施
   - クロスブラウザテスト

### 3. 本番環境へのデプロイ

1. **リリースブランチの作成**
   ```bash
   git checkout -b release/vX.Y.Z
   # 必要に応じてバージョン番号更新
   git commit -am "chore: bump version to vX.Y.Z"
   git tag vX.Y.Z
   git push origin release/vX.Y.Z --tags
   ```

2. **本番環境へのデプロイ**
   ```bash
   # 本番サーバーにSSH接続
   ssh admin@<production-server>
   
   # プロジェクトディレクトリに移動
   cd ~/projects/<project-name>
   
   # リリースブランチをチェックアウト
   git fetch
   git checkout vX.Y.Z
   
   # 依存関係のインストール
   npm ci --production
   
   # ビルド
   npm run build
   
   # アプリケーション再起動
   pm2 reload <app-name>
   ```

3. **本番環境の検証**
   - 動作確認
   - パフォーマンス監視
   - エラー監視

## Docker環境の利用

### ローカル開発

```bash
# 開発環境の起動
docker-compose up -d

# 開発中のログ確認
docker-compose logs -f app

# テスト実行
docker-compose exec app npm run test

# コンテナ内でのコマンド実行
docker-compose exec app <command>
```

### 開発サーバー

開発サーバーでは、以下のいずれかの方法でアプリケーションを実行します：

1. **PM2による直接実行**
   ```bash
   pm2 start dist/index.js --name <app-name>
   ```

2. **Dockerコンテナでの実行**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
   ```

選択する方法は、各プロジェクトのREADMEまたはデプロイドキュメントを参照してください。

### 本番環境

本番環境では、安定性と性能を重視した設定を使用します：

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## データベースマイグレーション

### ローカル開発

```bash
# マイグレーション実行
npm run migrate

# 開発用シードデータ投入
npm run seed
```

### 開発サーバー

```bash
# マイグレーション実行
npm run migrate:dev
```

### 本番環境

```bash
# マイグレーションの確認（ドライラン）
npm run migrate:prod -- --dry-run

# マイグレーション実行
npm run migrate:prod
```

## 環境変数管理

各環境で適切な環境変数を設定することが重要です：

```
project/
├── .env.local     # ローカル環境用（Gitにコミットしない）
├── .env.development  # 開発サーバー用
└── .env.production   # 本番環境用（機密情報は含めない）
```

## ドメイン設定

### 開発サーバー

開発サーバーでは、`dev-`プレフィックスを持つサブドメインを使用します：

- dev-all.omotenasuai.com
- dev-app.omotenasuai.com
- dev-pms.omotenasuai.com
- dev-crm.omotenasuai.com
- dev-api.omotenasuai.com

### 本番環境

本番環境では、プレフィックスなしのサブドメインを使用します：

- all.omotenasuai.com
- app.omotenasuai.com
- pms.omotenasuai.com
- crm.omotenasuai.com
- api.omotenasuai.com

## トラブルシューティング

### ローカル環境

- Docker関連の問題: `docker-compose down -v && docker-compose up -d`
- ポート競合: 各システムは固定ポート（saas=3100 / member=3200(+8080) / pms=3300(±3301) / common=3400）を使用し、vite.config.tsでは`strictPort: true`を設定して他ポートへの自動移行を禁止。ポートが使用中の場合は、既存プロセスを停止してから起動する
- データベース接続エラー: `DATABASE_URL`の確認

### 開発サーバー

- アプリケーションエラー: `pm2 logs <app-name>`
- Nginxエラー: `sudo tail -f /var/log/nginx/error.log`
- データベース接続: `psql -h 163.44.97.2 -U hotel_app -d <database_name>`

### 本番環境

- サーバーステータス: `pm2 status`
- アプリケーションログ: `pm2 logs <app-name>`
- システムリソース: `htop`

## セキュリティ注意事項

1. 本番環境の認証情報をローカルや開発環境に保存しない
2. 機密情報はGitリポジトリにコミットしない
3. 本番環境へのアクセス権限は必要最小限に制限
4. デプロイスクリプトは慎重にレビューする
5. 本番データベースへの直接アクセスは緊急時のみ

## 継続的インテグレーション/デプロイ（CI/CD）

将来的には、以下のCI/CDパイプラインの導入を検討します：

1. GitHub Actionsによる自動テスト
2. 開発サーバーへの自動デプロイ
3. 本番環境への手動承認デプロイ

## 定期メンテナンス

1. 週次: セキュリティアップデート、ログローテーション
2. 月次: パフォーマンス分析、リソース使用状況確認
3. 四半期: バックアップ検証、復旧テスト