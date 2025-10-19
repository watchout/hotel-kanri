# G3フェーズ指示書：Sun（hotel-saas担当）

## 目的
hotel-saasを開発サーバー環境に統合DB設定で適用し、正常稼働を確認する。

## 前提条件
- G2フェーズが完了していること
- hotel-saasのローカル環境で統合DBへの接続が確認済みであること
- GitHub Actionsによるデプロイ機構が整備されていること

## 作業内容

### 1. 環境変数設定の更新

`.env.production`ファイルを以下の内容で更新してください：

```bash
# 統合DB設定
UNIFY_ENV=dev
DATABASE_URL=postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db

# ポート設定
PORT=3100

# その他の必要な環境変数
NODE_ENV=production
```

> **注意**: 実際のパスワードは安全に管理し、コードにコミットしないでください。

### 2. PM2設定の確認・更新

`ecosystem.config.js`ファイルを確認し、以下の設定が含まれていることを確認してください：

```javascript
module.exports = {
  apps: [
    {
      name: 'hotel-saas',
      script: '.output/server/index.mjs',
      env: {
        PORT: 3100,
        NODE_ENV: 'production',
        UNIFY_ENV: 'dev',
        DATABASE_URL: 'postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db'
      },
      log_date_format: '2025-09-12 HH:mm:ss Z',
      error_file: '/opt/omotenasuai/logs/hotel-saas-error.log',
      out_file: '/opt/omotenasuai/logs/hotel-saas-out.log'
    }
  ]
};
```

### 3. ビルドスクリプトの確認

現在発生しているビルドエラー（CSSの`import.meta`エラー、Vueファイルの末尾の`%`記号）に対応するため、必要に応じてビルドスクリプトを修正してください。

### 4. デプロイの実施

hotel-kanriリポジトリのGitHub Actionsを使用してデプロイを実施します：

1. hotel-kanriリポジトリの`config/versions.json`を更新
2. GitHub Actionsのワークフロー（`deploy-dev.yml`）を実行
3. デプロイログを確認

### 5. デプロイ後の検証

以下の項目を検証してください：

1. **ヘルスチェック**
   ```bash
   curl -f https://dev-app.omotenasuai.com/api/health
   ```

2. **サブドメインアクセス**
   - ブラウザで`https://dev-app.omotenasuai.com`にアクセスし、正常表示を確認

3. **Common API連携**
   ```bash
   curl -f https://dev-app.omotenasuai.com/api/common-test
   ```

4. **データベース接続**
   - ログインや商品表示など、DBアクセスを伴う機能を確認

### 6. 報告書作成

G3フェーズの実施結果を報告書としてまとめてください。報告書には以下の内容を含めてください：

1. デプロイ日時
2. デプロイしたバージョン
3. 環境変数設定（パスワード除く）
4. PM2プロセス状態
5. ヘルスチェック結果
6. 発生した問題と解決策
7. 次のステップ（G4準備）

## タイムライン

1. 準備（環境変数・PM2設定更新）: 0.5日
2. デプロイ実施: 0.5日
3. 検証: 0.5日
4. 報告書作成: 0.5日

## 注意事項

1. デプロイ前に他チームと調整してください
2. 問題発生時は速やかに統合管理者（Iza）に報告してください
3. 旧設定のバックアップを取得してください
4. パスワード等の機密情報をコードにコミットしないでください

## 成功基準

1. hotel-saasが開発サーバー上で正常稼働していること
2. 統合DB（hotel_unified_db）に接続していること
3. ポート3100で稼働していること
4. サブドメイン（dev-app.omotenasuai.com）からアクセスできること
5. Common APIとの連携が正常に動作すること

以上の指示に従い、G3フェーズを計画的に実施してください。不明点があれば統合管理者（Iza）に相談してください。
