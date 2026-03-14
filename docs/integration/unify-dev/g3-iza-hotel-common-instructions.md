# G3フェーズ指示書：Iza（hotel-common担当）

## 目的
hotel-commonを開発サーバー環境に統合DB設定で適用し、全サービスの統合環境を整備する。統合管理者として、G3フェーズ全体の調整・検証も担当する。

## 前提条件
- G2フェーズが完了していること
- hotel-commonのローカル環境で統合DBへの接続が確認済みであること
- GitHub Actionsによるデプロイ機構が整備されていること
- Nginx設定が整備されていること

## 作業内容

### 1. 環境変数設定の更新

`.env.production`ファイルを以下の内容で更新してください：

```bash
# 統合DB設定
UNIFY_ENV=dev
DATABASE_URL=postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db

# ポート設定
PORT=3400

# その他の必要な環境変数
NODE_ENV=production
JWT_SECRET=<共通JWT_SECRET>

# CORS設定
ALLOWED_ORIGINS=https://dev-app.omotenasuai.com,https://dev-crm.omotenasuai.com,https://dev-pms.omotenasuai.com
```

> **注意**: 実際のパスワードやシークレットは安全に管理し、コードにコミットしないでください。

### 2. PM2設定の確認・更新

`ecosystem.config.js`ファイルを確認し、以下の設定が含まれていることを確認してください：

```javascript
module.exports = {
  apps: [
    {
      name: 'hotel-common',
      script: '.output/server/index.mjs',
      env: {
        PORT: 3400,
        NODE_ENV: 'production',
        UNIFY_ENV: 'dev',
        DATABASE_URL: 'postgresql://hotel_app:<PASSWORD>@163.44.97.2:5432/hotel_unified_db',
        JWT_SECRET: '<共通JWT_SECRET>',
        ALLOWED_ORIGINS: 'https://dev-app.omotenasuai.com,https://dev-crm.omotenasuai.com,https://dev-pms.omotenasuai.com'
      },
      log_date_format: '2025-09-12 HH:mm:ss Z',
      error_file: '/opt/omotenasuai/logs/hotel-common-error.log',
      out_file: '/opt/omotenasuai/logs/hotel-common-out.log'
    }
  ]
};
```

### 3. Nginx設定の確認・更新

Nginx設定を確認し、以下のサブドメインマッピングが正しく設定されていることを確認してください：

```nginx
# dev-api.omotenasuai.com (Common API)
server {
    listen 443 ssl;
    server_name dev-api.omotenasuai.com;
    
    # SSL設定
    ssl_certificate /etc/letsencrypt/live/omotenasuai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/omotenasuai.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3400;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# dev-app.omotenasuai.com (SaaS)
server {
    listen 443 ssl;
    server_name dev-app.omotenasuai.com;
    
    # SSL設定
    ssl_certificate /etc/letsencrypt/live/omotenasuai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/omotenasuai.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# dev-crm.omotenasuai.com (Member)
server {
    listen 443 ssl;
    server_name dev-crm.omotenasuai.com;
    
    # SSL設定
    ssl_certificate /etc/letsencrypt/live/omotenasuai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/omotenasuai.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8080;  # Member UI
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api/ {
        proxy_pass http://localhost:3200;  # Member API
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# dev-pms.omotenasuai.com (PMS)
server {
    listen 443 ssl;
    server_name dev-pms.omotenasuai.com;
    
    # SSL設定
    ssl_certificate /etc/letsencrypt/live/omotenasuai.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/omotenasuai.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. 統合DBの確認・準備

開発サーバー上の統合DBを確認し、必要に応じて準備してください：

```bash
# PostgreSQLに接続
psql -h 163.44.97.2 -U postgres

# hotel_unified_dbの存在確認
\l

# 存在しない場合は作成
CREATE DATABASE hotel_unified_db;

# hotel_appユーザーの存在確認
\du

# 存在しない場合は作成
CREATE USER hotel_app WITH PASSWORD '<PASSWORD>';

# 権限付与
GRANT ALL PRIVILEGES ON DATABASE hotel_unified_db TO hotel_app;
```

### 5. デプロイの実施

hotel-kanriリポジトリのGitHub Actionsを使用してデプロイを実施します：

1. hotel-kanriリポジトリの`config/versions.json`を更新
2. GitHub Actionsのワークフロー（`deploy-dev.yml`）を実行
3. デプロイログを確認

### 6. デプロイ後の検証

以下の項目を検証してください：

1. **ヘルスチェック**
   ```bash
   curl -f https://dev-api.omotenasuai.com/api/health
   ```

2. **CORS設定**
   - 各サービスからのAPIリクエストが正常に処理されることを確認

3. **データベース接続**
   - マスターデータの取得・更新を確認

### 7. 統合検証

全サービスの統合検証を実施してください：

1. **各サービスのヘルスチェック**
   ```bash
   curl -f https://dev-api.omotenasuai.com/api/health
   curl -f https://dev-app.omotenasuai.com/api/health
   curl -f https://dev-crm.omotenasuai.com/health
   curl -f https://dev-pms.omotenasuai.com/health
   ```

2. **サービス間連携**
   - SaaS → Common API連携
   - Member → Common API連携
   - PMS → Common API連携

3. **認証連携**
   - JWT認証の動作確認

### 8. 統合報告書作成

G3フェーズ全体の実施結果を統合報告書としてまとめてください。報告書には以下の内容を含めてください：

1. 各サービスのデプロイ状況
2. 統合DB接続状況
3. サブドメイン・ポート設定状況
4. サービス間連携の検証結果
5. 発生した問題と解決策
6. G4フェーズ（旧DB整理）への準備状況

## タイムライン

1. 準備（環境変数・PM2設定・Nginx設定更新）: 0.5日
2. 統合DB確認・準備: 0.5日
3. デプロイ実施: 0.5日
4. 検証・統合検証: 1日
5. 統合報告書作成: 0.5日

## 注意事項

1. 統合管理者として、他チームのデプロイ調整を行ってください
2. 問題発生時は速やかに対応し、必要に応じて全体MTGを招集してください
3. 旧設定のバックアップを取得してください
4. パスワード等の機密情報をコードにコミットしないでください
5. 各サービスのデプロイ順序を調整してください（推奨順序: Common → Member → PMS → SaaS）

## 成功基準

1. hotel-commonが開発サーバー上で正常稼働していること
2. 統合DB（hotel_unified_db）に接続していること
3. ポート3400で稼働していること
4. サブドメイン（dev-api.omotenasuai.com）からアクセスできること
5. 全サービスとの連携が正常に動作すること
6. Nginx設定が正しく機能していること

以上の指示に従い、G3フェーズを計画的に実施してください。統合管理者として、G3フェーズ全体の成功に責任を持ってください。
