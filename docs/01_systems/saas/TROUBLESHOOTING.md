# トラブルシューティングガイド

## 1. 一般的な問題と解決策

### 1.1 メモリ関連の問題

#### 症状
- `JS heap out of memory` エラー
- サーバーの突然のクラッシュ
- Docker コンテナの `unhealthy` 状態

#### 解決策
- Node.jsのメモリ制限を増やす:
  ```bash
  NODE_OPTIONS="--max-old-space-size=8192" npm run dev
  ```
- `package.json` のスクリプトを修正:
  ```json
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=8192' nuxt dev"
  }
  ```
- Docker環境の場合、コンテナのメモリ制限を緩和:
  ```yaml
  services:
    app:
      deploy:
        resources:
          limits:
            memory: 2g
  ```

### 1.2 循環参照の問題

#### 症状
- 重複インポート警告
- `Duplicated imports` エラーメッセージ
- ビルドエラー

#### 解決策
- 単一のソースファイル（`db-service.ts`）に統合
- インポートパスを統一
- 循環参照を避けるため、ファイル間の相互参照を排除

### 1.3 接続リセットの問題

#### 症状
- `ERR_CONNECTION_RESET` エラー
- ブラウザでの接続タイムアウト
- サーバーが応答しない

#### 解決策
- プロセスを完全に終了して再起動:
  ```bash
  killall -9 node
  npm run dev
  ```
- ポートの競合がないか確認:
  ```bash
  lsof -i :3100
  ```
- 別のポートで試す:
  ```bash
  npm run dev -- --port 3200
  ```

## 2. 特定のエラーと対策

### 2.1 Prisma関連のエラー

#### 症状
- `PrismaClient is not defined` エラー
- データベース接続エラー
- `Cannot find module '@prisma/client'` エラー

#### 解決策
- `db-service.ts` のモック実装を確認
- 必要なモデルやメソッドが実装されているか確認
- インポートパスが正しいか確認

### 2.2 API呼び出しのエラー

#### 症状
- `404 Not Found` エラー
- `403 Forbidden` エラー
- API レスポンスが期待通りでない

#### 解決策
- hotel-common API が正しく実装されているか確認
- API エンドポイントのURLが正しいか確認
- 認証トークンが正しく設定されているか確認
- 環境変数 `HOTEL_COMMON_API_URL` が正しく設定されているか確認

### 2.3 ビルドエラー

#### 症状
- `Failed to run dependency scan` エラー
- `Could not resolve` エラー
- TypeScript コンパイルエラー

#### 解決策
- キャッシュをクリア:
  ```bash
  rm -rf .nuxt
  npm run dev
  ```
- 依存関係を再インストール:
  ```bash
  rm -rf node_modules
  npm install
  ```
- TypeScript の型定義を確認

## 3. デバッグ方法

### 3.1 サーバーログの確認

```bash
# 通常のログ
npm run dev

# 詳細なログ
DEBUG=* npm run dev

# Docker環境の場合
docker logs hotel-saas-partial
```

### 3.2 ブラウザデバッグ

- Chrome DevTools の Network タブでリクエスト/レスポンスを確認
- Console タブでエラーメッセージを確認
- Application タブでローカルストレージ、セッションストレージを確認

### 3.3 Node.js デバッグ

```bash
# インスペクタを有効にして起動
NODE_OPTIONS='--inspect' npm run dev

# Chrome で chrome://inspect にアクセス
```

## 4. 予防策

- コード変更前にバックアップを作成
- 段階的に変更を適用し、各ステップで動作確認
- 変更履歴を記録
- 重要なファイルの変更は慎重に行う

最終更新日: 2024-12-19
