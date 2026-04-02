# G3フェーズ指示書：Luna（hotel-pms担当）

## 目的
hotel-pmsを開発サーバー環境に統合DB設定で適用し、正常稼働を確認する。

## 前提条件
- G2フェーズが完了していること
- hotel-pmsのローカル環境で統合DBへの接続が確認済みであること
- GitHub Actionsによるデプロイ機構が整備されていること
- オフライン機能を考慮した設計が実装されていること

## 作業内容

### 1. 環境変数設定の更新

`.env.production`ファイルを以下の内容で更新してください：

```bash
# 統合DB設定
UNIFY_ENV=dev
DATABASE_URL=postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db

# ポート設定
PORT=3300
ELECTRON_PORT=3301

# その他の必要な環境変数
NODE_ENV=production
JWT_SECRET=<共通JWT_SECRET>

# オフライン設定
OFFLINE_SYNC_INTERVAL=300000  # 5分間隔
```

> **注意**: 実際のパスワードやシークレットは安全に管理し、コードにコミットしないでください。

### 2. PM2設定の確認・更新

`ecosystem.config.js`ファイルを確認し、以下の設定が含まれていることを確認してください：

```javascript
module.exports = {
  apps: [
    {
      name: 'hotel-pms',
      script: '.output/server/index.mjs',
      env: {
        PORT: 3300,
        NODE_ENV: 'production',
        UNIFY_ENV: 'dev',
        DATABASE_URL: 'postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/opt/omotenasuai/logs/hotel-pms-error.log',
      out_file: '/opt/omotenasuai/logs/hotel-pms-out.log'
    }
  ]
};
```

### 3. オフライン機能の確認

オフライン機能が開発サーバー環境でも正常に動作するよう、以下の点を確認してください：

1. クライアントサイドキューの設定
2. イベント同期メカニズムの設定
3. オフライン→オンライン復帰時の同期処理

### 4. デプロイの実施

hotel-kanriリポジトリのGitHub Actionsを使用してデプロイを実施します：

1. hotel-kanriリポジトリの`config/versions.json`を更新
2. GitHub Actionsのワークフロー（`deploy-dev.yml`）を実行
3. デプロイログを確認

### 5. デプロイ後の検証

以下の項目を検証してください：

1. **ヘルスチェック**
   ```bash
   curl -f https://dev-pms.omotenasuai.com/health
   ```

2. **サブドメインアクセス**
   - ブラウザで`https://dev-pms.omotenasuai.com`にアクセスし、正常表示を確認

3. **Common API連携**
   ```bash
   curl -f https://dev-pms.omotenasuai.com/api/common-test
   ```

4. **データベース接続**
   - ログイン機能を確認
   - 予約情報の表示・更新を確認

5. **オフライン機能**
   - ネットワーク切断時の動作確認
   - 復帰後の同期確認

### 6. 報告書作成

G3フェーズの実施結果を報告書としてまとめてください。報告書には以下の内容を含めてください：

1. デプロイ日時
2. デプロイしたバージョン
3. 環境変数設定（パスワード除く）
4. PM2プロセス状態
5. ヘルスチェック結果
6. オフライン機能の動作確認結果
7. 発生した問題と解決策
8. 次のステップ（G4準備）

## タイムライン

1. 準備（環境変数・PM2設定更新）: 0.5日
2. オフライン機能確認: 0.5日
3. デプロイ実施: 0.5日
4. 検証: 0.5日
5. 報告書作成: 0.5日

## 注意事項

1. オフライン機能は特に重点的に検証してください
2. デプロイ前に他チームと調整してください
3. 問題発生時は速やかに統合管理者（Iza）に報告してください
4. 旧設定のバックアップを取得してください
5. パスワード等の機密情報をコードにコミットしないでください

## 成功基準

1. hotel-pmsが開発サーバー上で正常稼働していること
2. 統合DB（hotel_unified_db）に接続していること
3. ポート3300で稼働していること
4. サブドメイン（dev-pms.omotenasuai.com）からアクセスできること
5. Common APIとの連携が正常に動作すること
6. オフライン機能が正常に動作すること

以上の指示に従い、G3フェーズを計画的に実施してください。不明点があれば統合管理者（Iza）に相談してください。
