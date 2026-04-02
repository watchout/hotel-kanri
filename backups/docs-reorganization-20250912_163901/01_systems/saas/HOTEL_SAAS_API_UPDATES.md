# hotel-saas API更新情報

## 最新更新 (2024-12-20)

### 新規実装API

| API | 説明 | ドキュメント | ステータス |
|-----|------|------------|---------|
| `POST /api/v1/orders` | オーダー作成API | [詳細ガイド](./orders/CREATE_ORDER_API_GUIDE.md) | ✅ 実装完了 |

## 認証情報

すべてのAPIは、認証が必要です。認証には以下のヘッダーを使用します：

```
Authorization: Bearer {JWT_TOKEN}
X-Tenant-ID: {TENANT_ID}
```

JWTトークンを取得するには、ログインAPIを使用します：

```
POST /api/v1/auth/login
```

**リクエスト例：**

```json
{
  "email": "professional@example.com",
  "password": "password123"
}
```

## 既知の問題と解決策

### JWT検証エラー: invalid signature

このエラーは、JWTトークンの署名が無効であることを示しています。以下の原因が考えられます：

1. **トークンの改ざん**: トークンが改ざんされている可能性があります。
2. **異なる環境のトークン**: 開発環境で取得したトークンを本番環境で使用するなど、環境が異なる場合に発生します。
3. **トークンの有効期限切れ**: トークンの有効期限が切れている可能性があります。

**解決策**:
- ログインAPIを使用して新しいトークンを取得してください。
- 正しい環境のAPIエンドポイントを使用していることを確認してください。
- トークンをそのまま使用し、改変しないようにしてください。

## 開発者向けリソース

- [オーダー作成APIガイド](./orders/CREATE_ORDER_API_GUIDE.md)
- [API統合チェックリスト](../migration/API_INTEGRATION_CHECKLIST.md)
- [API統合マスターチェックリスト](../migration/API_INTEGRATION_MASTER_CHECKLIST.md)

## サポート

APIの使用中に問題が発生した場合は、以下の情報を添えてサポートチームにお問い合わせください：

1. リクエストボディ（機密情報を除く）
2. エラーメッセージ
3. 発生時刻
4. 環境情報（開発/テスト/本番）

サポート連絡先: support@hotel-common.example.com
