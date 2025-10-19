# キャンペーン機能 引き継ぎチェックリスト

## 実装完了項目

- [x] キャンペーン機能のディレクトリ構造
- [x] 型定義とZodスキーマ（types.ts）
- [x] 定数定義（constants.ts）
- [x] キャッシュ機能（cache.ts）
- [x] ユーティリティ関数（utils.ts）
- [x] サービス層（services.ts）
- [x] ウェルカムスクリーン機能（welcome-screen-service.ts）
- [x] バリデーション関数（validators.ts）
- [x] 管理者向けAPI（admin-api.ts）
- [x] 管理者向けカテゴリーAPI（admin-category-api.ts）
- [x] クライアント向けAPI（client-api.ts）
- [x] エクスポート用ファイル（index.ts）
- [x] 統合サーバーへのルーター追加（integration.ts）
- [x] テストコード（__tests__/）
- [x] APIドキュメント（docs/api/campaigns-api.md）
- [x] 統合ガイド（docs/api/campaigns-integration-guide.md）

## 統合手順

1. hotel-commonサーバーを起動する
   ```
   npm run start-integration-server
   ```

2. hotel-saas側でAPIクライアントを設定する
   ```typescript
   import axios from 'axios';

   const hotelCommonClient = axios.create({
     baseURL: process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400/api/v1',
     timeout: 5000
   });
   ```

3. キャンペーン機能を使用する
   ```typescript
   // アクティブなキャンペーン一覧を取得
   const campaigns = await hotelCommonClient.get('/campaigns/active');
   ```

## データベース

キャンペーン関連のテーブルは既にデータベーススキーマに含まれています：

- `Campaign`
- `CampaignItem`
- `CampaignUsageLog`
- `CampaignCategory`
- `CampaignCategoryRelation`
- `CampaignTranslation`
- `DeviceVideoCache`

## 注意事項

1. **認証**: すべてのAPIリクエストには有効なJWTトークンが必要です。
2. **パフォーマンス**: 頻繁に変更されないデータはキャッシュすることで、パフォーマンスを向上させることができます。
3. **多言語対応**: 多言語対応が必要な場合は、APIリクエスト時に適切な言語コードを指定してください。

## 連絡先

実装に関する質問やサポートが必要な場合は、hotel-common開発チームにお問い合わせください。
