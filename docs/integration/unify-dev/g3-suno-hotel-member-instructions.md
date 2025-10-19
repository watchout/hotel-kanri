# G3フェーズ指示書：Suno（hotel-member担当）

## 目的
hotel-member（API・UI）を開発サーバー環境に統合DB設定で適用し、正常稼働を確認する。

## 前提条件
- G2フェーズが完了していること
- hotel-memberのローカル環境で統合DBへの接続が確認済みであること
- GitHub Actionsによるデプロイ機構が整備されていること

## 作業内容

### 1. 環境変数設定の更新

#### API（FastAPI）の`.env.production`

```bash
# 統合DB設定
UNIFY_ENV=dev
DATABASE_URL=postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db

# ポート設定
PORT=3200

# その他の必要な環境変数
NODE_ENV=production
JWT_SECRET=<共通JWT_SECRET>
```

#### UI（Nuxt）の`.env.production`

```bash
# 環境設定
UNIFY_ENV=dev
NODE_ENV=production

# ポート設定
PORT=8080

# API接続設定
API_URL=http://localhost:3200
```

> **注意**: 実際のパスワードやシークレットは安全に管理し、コードにコミットしないでください。

### 2. PM2設定の確認・更新

#### API用の`ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'hotel-member-api',
      script: 'uvicorn main:app --host 0.0.0.0 --port 3200',
      cwd: '/opt/omotenasuai/hotel-member/fastapi-backend',
      env: {
        PORT: 3200,
        NODE_ENV: 'production',
        UNIFY_ENV: 'dev',
        DATABASE_URL: 'postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db'
      },
      log_date_format: '2025-09-12 HH:mm:ss Z',
      error_file: '/opt/omotenasuai/logs/hotel-member-api-error.log',
      out_file: '/opt/omotenasuai/logs/hotel-member-api-out.log'
    }
  ]
};
```

#### UI用の`ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'hotel-member-ui',
      script: '.output/server/index.mjs',
      cwd: '/opt/omotenasuai/hotel-member/nuxt-frontend',
      env: {
        PORT: 8080,
        NODE_ENV: 'production',
        UNIFY_ENV: 'dev',
        API_URL: 'http://localhost:3200'
      },
      log_date_format: '2025-09-12 HH:mm:ss Z',
      error_file: '/opt/omotenasuai/logs/hotel-member-ui-error.log',
      out_file: '/opt/omotenasuai/logs/hotel-member-ui-out.log'
    }
  ]
};
```

### 3. デプロイの実施

hotel-kanriリポジトリのGitHub Actionsを使用してデプロイを実施します：

1. hotel-kanriリポジトリの`config/versions.json`を更新
2. GitHub Actionsのワークフロー（`deploy-dev.yml`）を実行
3. デプロイログを確認

### 4. デプロイ後の検証

以下の項目を検証してください：

1. **API ヘルスチェック**
   ```bash
   curl -f https://dev-crm.omotenasuai.com/health
   ```

2. **UI アクセス**
   - ブラウザで`https://dev-crm.omotenasuai.com`にアクセスし、正常表示を確認

3. **Common API連携**
   ```bash
   curl -f https://dev-crm.omotenasuai.com/api/common-test
   ```

4. **データベース接続**
   - ログイン機能を確認
   - 会員情報の表示・更新を確認

### 5. 報告書作成

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

1. API・UIの両方をデプロイする必要があります
2. デプロイ前に他チームと調整してください
3. 問題発生時は速やかに統合管理者（Iza）に報告してください
4. 旧設定のバックアップを取得してください
5. パスワード等の機密情報をコードにコミットしないでください

## 成功基準

1. hotel-member API・UIが開発サーバー上で正常稼働していること
2. 統合DB（hotel_unified_db）に接続していること
3. API: ポート3200、UI: ポート8080で稼働していること
4. サブドメイン（dev-crm.omotenasuai.com）からアクセスできること
5. Common APIとの連携が正常に動作すること

以上の指示に従い、G3フェーズを計画的に実施してください。不明点があれば統合管理者（Iza）に相談してください。
