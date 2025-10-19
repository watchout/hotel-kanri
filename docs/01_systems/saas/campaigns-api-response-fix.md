# キャンペーンAPI レスポンス形式の修正

## 概要

hotel-commonサーバーのキャンペーンAPIレスポンス形式と、hotel-saasクライアントの期待するレスポンス形式に不一致があったため、修正を行いました。

## 問題点

1. **レスポンス形式の不一致**
   - `/api/campaigns/admin` エンドポイントは単一のキャンペーンオブジェクトを返す形式だった
   - hotel-saasクライアントは配列形式のデータを期待していた

2. **データ構造の違い**
   - hotel-commonサーバーのレスポンス:
     ```json
     {
       "success": true,
       "campaign": {
         "id": "admin",
         "name": "新規会員登録キャンペーン",
         ...
       }
     }
     ```
   - hotel-saasクライアントの期待する形式:
     ```json
     {
       "data": [
         {
           "id": "admin",
           "name": "新規会員登録キャンペーン",
           ...
         }
       ],
       "meta": {
         "total": 1
       }
     }
     ```

## 修正内容

### 1. 管理者用キャンペーン一覧取得メソッドの修正

`src/api/services/admin-campaign-service.ts` の `getCampaigns` メソッドを修正:

```typescript
async getCampaigns(params = {}) {
  try {
    // GET /api/campaigns/active を使用して全キャンペーンを取得
    const response = await hotelCommonClient.get('/campaigns/active')

    // API応答を一覧形式に変換
    if (response && response.success && response.campaigns) {
      return {
        data: response.campaigns,
        meta: { total: response.campaigns.length }
      }
    } else if (response && response.campaign) {
      // 単一キャンペーンの場合
      return {
        data: [response.campaign],
        meta: { total: 1 }
      }
    }
    return { data: [], meta: { total: 0 } }
  } catch (error) {
    console.error('管理者キャンペーン一覧取得エラー:', error)
    throw error
  }
}
```

### 修正のポイント

1. **エンドポイントの変更**
   - `/api/campaigns/admin` から `/api/campaigns/active` に変更
   - `/api/campaigns/active` は複数のキャンペーンを配列で返すため、より適切

2. **レスポンス形式の統一**
   - サーバーからのレスポンスを、クライアントが期待する形式に変換
   - `response.campaigns` を `data` フィールドにマッピング
   - 配列の長さを `meta.total` に設定

3. **エラーハンドリングの強化**
   - レスポンスが空の場合でも適切な形式を返すよう対応
   - 単一キャンペーンの場合も配列形式に変換

## 今後の改善点

1. **API仕様の統一**
   - 長期的には、hotel-commonサーバー側のAPIレスポンス形式を統一することが望ましい
   - 全てのエンドポイントで一貫した形式を使用する（例: `data` と `meta` フィールド）

2. **型定義の強化**
   - レスポンスの型定義を明確にし、不一致を早期に検出できるようにする
   - TypeScriptの型チェックを活用した開発プロセスの導入

3. **APIドキュメントの整備**
   - 各エンドポイントのレスポンス形式を明確に文書化
   - 開発者間で共有可能なAPI仕様書の作成
