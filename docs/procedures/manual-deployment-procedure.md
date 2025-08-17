# 手動デプロイ手順書

## 概要
この文書は、GitHub Actionsによる自動デプロイが機能しない場合に、手動でhotel-saasアプリケーションをデプロイするための手順を記載しています。

## 前提条件
- 開発サーバーへのSSHアクセス権限
- adminユーザーのsudoパスワード
- hotel-saasリポジトリへのアクセス権限

## 手順

### 1. 開発サーバーへのSSH接続
```bash
ssh omotenasu-dev
```

### 2. hotel-saasディレクトリに移動
```bash
cd /opt/omotenasuai/hotel-saas
```

### 3. リポジトリの安全なディレクトリとして登録
```bash
sudo git config --global --add safe.directory /opt/omotenasuai/hotel-saas
```

### 4. 最新の変更を取得
```bash
sudo -u deploy git fetch origin
```

### 5. mainブランチに切り替え
```bash
sudo -u deploy git checkout main
```

### 6. 最新の変更を適用
```bash
sudo -u deploy git pull origin main
```

### 7. 依存関係のインストール
```bash
cd /opt/omotenasuai/hotel-saas
sudo -u deploy npm install --legacy-peer-deps
```

### 8. アプリケーションのビルド
```bash
sudo -u deploy npm run build
```

### 9. 環境変数の確認
```bash
sudo -u deploy cat .env
```

環境変数ファイルが存在しない場合は作成します：
```bash
sudo -u deploy cp .env.example .env
sudo -u deploy echo "DATABASE_URL=postgresql://hotel_app:xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9@localhost:5432/hotel_unified_db" >> .env
sudo -u deploy echo "JWT_SECRET=OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g==" >> .env
sudo -u deploy echo "PORT=3100" >> .env
sudo -u deploy echo "NODE_ENV=development" >> .env
sudo -u deploy echo "BASE_URL=https://dev-app.omotenasuai.com" >> .env
```

### 10. PM2でアプリケーションを起動/再起動
```bash
sudo -u deploy pm2 start ecosystem.config.js --only hotel-saas --env development || sudo -u deploy pm2 restart hotel-saas
```

### 11. アプリケーションの状態確認
```bash
sudo -u deploy pm2 status
```

### 12. ヘルスチェック
```bash
curl -f http://localhost:3100/health
```

## トラブルシューティング

### 1. リポジトリのアクセス権限エラー
エラーメッセージ: `fatal: detected dubious ownership in repository at '/opt/omotenasuai/hotel-saas'`

解決策:
```bash
sudo git config --global --add safe.directory /opt/omotenasuai/hotel-saas
```

### 2. SSH認証エラー
エラーメッセージ: `Host key verification failed.`

解決策:
```bash
# ローカルマシンで実行
ssh-keygen -f ~/.ssh/known_hosts -R github.com
```

### 3. ビルドエラー
エラーメッセージ: `[nuxi] ERROR Nuxt Build Error: [vite:css] [postcss] Cannot use 'import.meta' outside a module`

解決策:
1. 問題のあるファイルを確認
2. ファイル末尾の余分な文字（%など）を削除
3. 必要に応じてnuxt.config.tsのCSS設定を修正

### 4. Node.jsバージョンの互換性エラー
エラーメッセージ: `npm warn EBADENGINE Unsupported engine { package: '@sidebase/nuxt-auth@1.0.0', required: { node: '>=20', ... }`

解決策:
```bash
# Node.jsをアップグレード
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # バージョン確認
```

## 注意事項
- 手動デプロイは緊急時のみ使用し、通常はGitHub Actionsを使用すること
- 手動デプロイを行った場合は、必ずhotel-saasチームに通知すること
- 手動で変更を加えた場合は、必ず変更内容をドキュメント化すること
