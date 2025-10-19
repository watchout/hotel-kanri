# キャンペーンAPI統合方式変更に関する実際の実装状況

## 概要

hotel-common側でキャンペーンAPIの実装方式が変更される予定でしたが、実際の実装状況を確認したところ、現時点では従来のAPIエンドポイント構造が維持されていることが確認されました。

## 現在のエンドポイント構造

```
http://localhost:3400/api/v1/campaigns/...
http://localhost:3400/api/v1/admin/campaigns/...
```

## 利用可能なエンドポイント

サーバーからのレスポンスによると、以下のエンドポイントが利用可能です：

```
GET /health
GET /api/systems/status
POST /api/systems/:systemName/test
GET /api/database/test
GET /api/tenants
POST /api/auth/validate
GET /api/stats
GET /api/campaigns/active
GET /api/campaigns/:id
GET /api/campaigns/category/:categoryId
GET /api/hotel-member/integration/health
POST /api/hotel-member/hierarchy/auth/verify
POST /api/hotel-member/hierarchy/permissions/check-customer-access
POST /api/hotel-member/hierarchy/tenants/accessible
POST /api/hotel-member/hierarchy/permissions/check-membership-restrictions
POST /api/hotel-member/hierarchy/permissions/check-analytics-access
POST /api/hotel-member/hierarchy/user/permissions-detail
POST /api/hotel-member/hierarchy/permissions/batch-check
GET /api/hotel-member/hierarchy/health
```

## 対応方針

1. ベースURLを`/api/v1`に戻し、従来のエンドポイント構造を使用する
2. 各サービスクラスでコメントアウトされていたAPIコールを有効化する
3. 実際のAPIを使用するよう修正する

## 実装状況

以下のファイルを修正しました：

1. `src/api/hotel-common-client.ts`
   - ベースURLを`/api/campaigns`から`/api/v1`に戻す

2. `src/api/services/campaign-service.ts`
   - 各APIエンドポイントを元のパスに戻す
   - コメントを修正

3. `src/api/services/admin-campaign-service.ts`
   - モックデータを削除し、実際のAPIを使用するように変更
   - 各APIエンドポイントを元のパスに戻す

## 今後の対応

1. 今後、hotel-common側でAPI統合方式が変更された場合は、その時点で再度対応する
2. 定期的にAPIエンドポイントの可用性をチェックし、変更があれば速やかに対応する
