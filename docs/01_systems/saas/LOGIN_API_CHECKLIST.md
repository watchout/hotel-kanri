# 🔐 ログインAPI統合チェックリスト

## 📋 概要

このチェックリストは、ログインAPI (`POST /api/v1/auth/login`) の統合作業を追跡するためのものです。

## 🔍 API仕様

| 項目 | 詳細 |
|-----|------|
| **エンドポイント** | `POST /api/v1/auth/login` |
| **リクエスト形式** | JSON |
| **認証要件** | 不要（公開API） |
| **リクエストパラメータ** | email, password, roomNumber（オプション） |
| **レスポンス形式** | JSON |
| **成功レスポンス** | `{ success: true, accessToken: string, user: object, tenant: object }` |
| **エラーレスポンス** | `{ success: false, message: string }` |

## ✅ 統合チェックリスト

### 1. 分析フェーズ

- [x] hotel-common側のログインAPIが実装されているか確認
- [x] 現在のPrismaベースの実装を確認（`server/api/v1/auth/login.post.ts`）
- [x] リクエスト・レスポンスの形式の違いを特定
- [x] 必要なデータ変換を計画

### 2. 実装フェーズ

- [x] `server/utils/api-client.ts`にログインAPIメソッドを追加
  ```typescript
  // 実装例
  export const authApi = {
    // 既存のメソッド
    ...
    // 新規追加
    login: (credentials) => ofetch.post('/api/v1/auth/login', { body: credentials })
  }
  ```
- [x] `server/api/v1/auth/login.post.v2.ts`を作成
- [x] Prisma呼び出しをAPI呼び出しに置き換え
- [x] データ形式の変換処理を実装
- [x] エラーハンドリングとフォールバック処理を実装
- [x] テスト用API `server/api/v1/auth/test-login.post.ts`を作成

### 3. テストフェーズ

- [ ] 正常系テスト：有効な認証情報でログイン
  - [ ] professional@example.com / professional123
  - [ ] economy@example.com / economy123
- [ ] 異常系テスト：無効な認証情報でログイン
  - [ ] 存在しないユーザー
  - [ ] パスワード間違い
- [ ] API接続エラー時のフォールバック動作確認
- [ ] レスポンス時間の測定

テスト方法：
```bash
# テストエンドポイントを使用したテスト

curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"professional@example.com","password":"professional123"}' \
  http://localhost:3100/api/v1/auth/test-login

# 直接v2エンドポイントを呼び出すテスト

curl -X POST -H "Content-Type: application/json" \
  -d '{"email":"professional@example.com","password":"professional123","testMode":"direct"}' \
  http://localhost:3100/api/v1/auth/test-login
```

### 4. 目視確認フェーズ

- [ ] 管理画面ログインページにアクセス: http://localhost:3100/admin/login
- [ ] 有効な認証情報でログインフォームを送信
- [ ] ログイン成功後、ダッシュボードが表示されることを確認
- [ ] ユーザー情報が正しく表示されていることを確認
- [ ] 無効な認証情報でエラーメッセージが適切に表示されることを確認
- [ ] ログアウト・再ログインのフローが正常に動作することを確認

### 5. デプロイフェーズ

- [ ] 変更をコミット
- [ ] 本番環境に適用
- [ ] 動作監視

## 📝 注意事項

1. **統合モードの考慮**:
   - `INTEGRATION_MODE=FULL`の場合は完全にhotel-common APIに依存
   - `INTEGRATION_MODE=PARTIAL`の場合はフォールバック処理を実装

2. **トークン管理**:
   - hotel-common APIから返されるJWTトークンの形式を確認
   - トークンの保存方法（Cookie vs LocalStorage）を統一

3. **エラーハンドリング**:
   - APIが利用できない場合のフォールバック処理
   - ユーザーフレンドリーなエラーメッセージ表示

## 🔄 進捗状況

| ステップ | 状態 | 完了日 | 担当者 | 備考 |
|---------|------|-------|-------|------|
| 分析 | ✅ 完了 | 2025-08-23 | AI | hotel-common側のログインAPIが実装中であることを確認、フォールバック処理が必要 |
| 実装 | ✅ 完了 | 2025-08-23 | AI | `login.post.v2.ts`と`test-login.post.ts`を実装 |
| テスト | ⏳ 進行中 | - | - | テストエンドポイントは実装済み、動作確認中 |
| 目視確認 | 📝 未着手 | - | - | - |
| デプロイ | 📝 未着手 | - | - | - |

## 📋 関連リソース

- 現在の実装: `server/api/v1/auth/login.post.ts`
- 新実装予定: `server/api/v1/auth/login.post.v2.ts`
- APIクライアント: `server/utils/api-client.ts`
- 認証サービス: `server/utils/authService.v2.ts`

---

**作成日**: 2025-08-23
**更新日**: 2025-08-23
**実装者**: AI
