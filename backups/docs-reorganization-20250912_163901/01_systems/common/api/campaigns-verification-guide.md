# キャンペーンAPI動作確認ガイド

## 概要

このガイドでは、キャンペーンAPIの動作確認方法について説明します。APIエンドポイントが正常に機能していることを確認するための手順とテストスクリプトの使用方法を紹介します。

## 前提条件

- サーバーが起動していること
- データベースが正しく設定されていること
- 必要な環境変数が設定されていること

## テストスクリプトの使用方法

プロジェクトルートディレクトリに`api-test.sh`というテストスクリプトを用意しています。このスクリプトを使用して、各APIエンドポイントの動作を確認できます。

```bash
# スクリプトに実行権限を付与
chmod +x api-test.sh

# スクリプトを実行
./api-test.sh
```

## テストされるエンドポイント

### 管理者API

1. **キャンペーン一覧取得**
   - エンドポイント: `GET /api/v1/admin/campaigns`
   - 期待される結果: キャンペーン一覧が返される

2. **キャンペーン作成**
   - エンドポイント: `POST /api/v1/admin/campaigns`
   - 期待される結果: 新しいキャンペーンが作成され、IDが返される

3. **キャンペーン詳細取得**
   - エンドポイント: `GET /api/v1/admin/campaigns/:id`
   - 期待される結果: 指定されたIDのキャンペーン詳細が返される

4. **キャンペーン更新**
   - エンドポイント: `PUT /api/v1/admin/campaigns/:id`
   - 期待される結果: キャンペーンが更新され、更新後のデータが返される

5. **キャンペーン削除**
   - エンドポイント: `DELETE /api/v1/admin/campaigns/:id`
   - 期待される結果: キャンペーンが削除され、204ステータスコードが返される

### クライアントAPI

1. **アクティブなキャンペーン一覧取得**
   - エンドポイント: `GET /api/v1/campaigns/active`
   - 期待される結果: アクティブなキャンペーン一覧が返される

2. **カテゴリ別キャンペーン一覧取得**
   - エンドポイント: `GET /api/v1/campaigns/categories/:code`
   - 期待される結果: 指定されたカテゴリのキャンペーン一覧が返される

## 手動テスト方法

テストスクリプトを使用せずに手動でAPIをテストする場合は、以下のcurlコマンドを使用できます。

### 管理者API - キャンペーン一覧取得

```bash
curl -X GET \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  "http://localhost:3400/api/v1/admin/campaigns?page=1&limit=10"
```

### 管理者API - キャンペーン作成

```bash
curl -X POST \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SUMMER2025",
    "name": "夏のキャンペーン",
    "description": "夏の特別セール",
    "startDate": "2025-06-01T00:00:00.000Z",
    "endDate": "2025-08-31T23:59:59.999Z",
    "status": "ACTIVE",
    "displayType": "BANNER",
    "displayPriority": 100,
    "ctaType": "BUTTON",
    "ctaText": "詳細を見る",
    "discountType": "PERCENTAGE",
    "discountValue": 10,
    "minOrderAmount": 5000,
    "maxUsageCount": 1000,
    "perUserLimit": 1
  }' \
  "http://localhost:3400/api/v1/admin/campaigns"
```

## パフォーマンステスト

APIのパフォーマンスを測定するには、以下のコマンドを使用できます：

```bash
# 10回のリクエストを送信し、レスポンス時間を測定
for i in {1..10}; do
  time curl -s -o /dev/null -H "Authorization: Bearer <JWT_TOKEN>" \
    "http://localhost:3400/api/v1/campaigns/active?language=ja"
done
```

目標は95%のリクエストが300ms以内に応答することです。

## トラブルシューティング

1. **認証エラー (401)**
   - JWTトークンが有効であることを確認
   - トークンの形式が正しいことを確認（Bearer プレフィックスを含む）

2. **リソースが見つからないエラー (404)**
   - URLが正しいことを確認
   - リソースIDが存在することを確認

3. **サーバーエラー (500)**
   - サーバーログを確認
   - データベース接続が正常であることを確認

## 連絡先

テストに関する質問やサポートが必要な場合は、hotel-common開発チームにお問い合わせください。
