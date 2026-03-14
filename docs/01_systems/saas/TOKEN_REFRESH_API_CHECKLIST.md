# トークン更新API統合チェックリスト

## 概要

このドキュメントは、トークン更新API（`POST /api/v1/auth/refresh`）のhotel-common APIへの統合プロセスを追跡するためのチェックリストです。

## API仕様

**エンドポイント**: `POST /api/v1/auth/refresh`

**リクエスト**:
```json
{
  "refreshToken": "string"
}
```

**レスポンス**:
```json
{
  "success": true,
  "accessToken": "string",
  "message": "トークンが正常に更新されました"
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": "エラーメッセージ"
}
```

## 統合チェックリスト

### 1. APIクライアント層の実装

- [x] `api-client.ts`にトークン更新メソッドを追加
- [x] エラーハンドリングとフォールバック処理を実装

### 2. サーバーサイド実装

- [x] `server/api/v1/auth/refresh.post.v2.ts`を作成
- [x] hotel-common APIの呼び出しを実装
- [x] フォールバック処理を実装
- [ ] 本番環境でのテスト

### 3. テスト

- [x] テスト用APIエンドポイント`test-refresh.post.ts`を作成
- [ ] 単体テストを実行
- [ ] 統合テストを実行
- [ ] ブラウザでのリフレッシュフローをテスト

### 4. ドキュメント

- [x] チェックリストの作成
- [ ] API統合マスターチェックリストの更新
- [ ] 実装の詳細ドキュメントの作成

### 5. デプロイ

- [ ] ステージング環境でのテスト
- [ ] 本番環境への適用

## 依存関係

- `authApi.refreshToken` メソッド
- JWT検証ロジック
- 認証サービス（`authService.v2.ts`）

## 注意事項

- リフレッシュトークンの有効期限は7日間
- アクセストークンの有効期限は24時間
- hotel-common APIが利用できない場合は、モック実装にフォールバック
- 本番環境では、必ずhotel-common APIを使用する必要がある
