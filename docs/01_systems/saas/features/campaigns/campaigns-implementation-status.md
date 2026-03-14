# キャンペーン機能実装状況

## 概要

hotel-common側でキャンペーン管理APIの実装が完了し、統合DB（PostgreSQL）に接続して動作するようになりました。このドキュメントでは、現在の実装状況と今後の対応について説明します。

## 実装状況

### データベース

キャンペーン機能に関するデータベースの状況を確認しましたが、現在のスキーマ（prisma/schema.prisma）にはキャンペーン関連のテーブル定義が見つかりませんでした。hotel-common側で実装されたAPIは、統合DB（PostgreSQL）に接続していると報告されていますが、現在のスキーマには以下のテーブルが不足しています：

- `Campaign`（キャンペーンマスタ）
- `CampaignItem`（キャンペーン対象商品）
- `CampaignUsageLog`（キャンペーン使用履歴）
- `CampaignTranslation`（キャンペーン多言語）

これらのテーブルは、hotel-common側のデータベーススキーマに定義されている可能性がありますが、現在のhotel-saasリポジトリには含まれていません。

### API実装

hotel-common側で以下のAPIが実装完了しています：

#### キャンペーン管理API
- `GET /api/v1/admin/campaigns` - キャンペーン一覧取得
- `POST /api/v1/admin/campaigns` - キャンペーン作成
- `GET /api/v1/admin/campaigns/:id` - キャンペーン詳細取得
- `PUT /api/v1/admin/campaigns/:id` - キャンペーン更新
- `DELETE /api/v1/admin/campaigns/:id` - キャンペーン削除

#### 統計・分析API
- `GET /api/v1/admin/campaigns/:id/analytics` - キャンペーン効果分析
- `GET /api/v1/admin/campaigns/analytics/summary` - 全キャンペーン統計

#### 客室側API
- `GET /api/v1/campaigns/check` - キャンペーン適用確認
- `GET /api/v1/campaigns/active` - アクティブキャンペーン一覧
- `GET /api/v1/campaigns/by-category/:categoryCode` - カテゴリー別キャンペーン取得

#### ウェルカムスクリーンAPI
- `GET /api/v1/welcome-screen/config` - ウェルカムスクリーン設定取得
- `GET /api/v1/welcome-screen/should-show` - ウェルカムスクリーン表示判定
- `POST /api/v1/welcome-screen/mark-completed` - ウェルカムスクリーン完了マーク

### クライアント側実装

hotel-saas側での実装が必要な項目：

1. **APIクライアントの設定**
   - hotel-common APIへの接続設定
   - JWT認証トークンの設定

2. **サービスクラスの実装**
   - `CampaignService` - キャンペーン機能用
   - `WelcomeScreenService` - ウェルカムスクリーン機能用
   - `AdminCampaignService` - 管理者用キャンペーン管理機能用

3. **UI実装**
   - キャンペーン管理画面
   - 商品カードでのキャンペーン価格表示
   - ウェルカムスクリーン

## 今後の対応

### 1. データベーススキーマの確認

hotel-common側で実装されたデータベーススキーマを確認し、必要に応じてhotel-saasのスキーマに統合する必要があります。以下の手順を推奨します：

1. hotel-common側のスキーマ定義を入手
2. hotel-saasのスキーマと比較
3. 不足しているテーブル定義を追加
4. マイグレーションを実行

### 2. APIクライアントの実装

統合ガイドに従って、APIクライアントとサービスクラスを実装します：

```typescript
// src/api/hotel-common-client.ts
import axios from 'axios';

const hotelCommonClient = axios.create({
  baseURL: process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400/api/v1',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// リクエストインターセプター（JWT認証トークン付与）
hotelCommonClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default hotelCommonClient;
```

### 3. サービスクラスの実装

キャンペーン機能とウェルカムスクリーン機能を利用するためのサービスクラスを実装します。

### 4. UI実装

キャンペーン管理画面、商品カードでのキャンペーン価格表示、ウェルカムスクリーンを実装します。

## 課題と解決策

### 1. データベーススキーマの不一致

**課題**: hotel-saasのスキーマにキャンペーン関連のテーブル定義が含まれていない

**解決策**:
- hotel-common側のスキーマ定義を入手
- hotel-saasのスキーマに統合
- マイグレーションを実行

### 2. 環境設定の違い

**課題**: 開発環境と本番環境でのAPI接続設定が異なる

**解決策**:
- 環境変数を使用して接続設定を管理
- `.env`ファイルに`HOTEL_COMMON_API_URL`を設定

### 3. 認証トークンの管理

**課題**: APIリクエストには有効なJWTトークンが必要

**解決策**:
- 認証トークンをローカルストレージに保存
- APIクライアントのインターセプターでリクエストヘッダーに追加

## 結論

hotel-common側でキャンペーン管理APIの実装が完了しましたが、hotel-saas側での統合作業が必要です。特にデータベーススキーマの確認と統合が重要な課題となります。統合ガイドに従って、APIクライアント、サービスクラス、UIを実装することで、キャンペーン機能を有効化できます。
