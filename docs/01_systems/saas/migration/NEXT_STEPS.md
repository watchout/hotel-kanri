# 次のステップ

## 概要

hotel-saasをhotel-commonのAPIに完全に統合するための次のステップを示します。現在、hotel-common側にいくつかのAPIが不足しているため、それらを実装する必要があります。

## 1. hotel-common側の実装

以下のAPIをhotel-common側で実装する必要があります：

### 優先度の高いAPI

- **認証・テナント系API**
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `GET /api/tenants/:id`
  - `GET /api/tenants`の修正（現在エラーあり）

- **オーダー系API**
  - `GET /api/v1/orders/history`
  - `POST /api/v1/orders`
  - `GET /api/v1/orders/active`
  - `GET /api/v1/orders/:id`
  - `PUT /api/v1/orders/:id/status`

詳細な実装仕様は以下のドキュメントを参照してください：
- [テナントAPI修正仕様書](./api-fixes/TENANT_API_FIX.md)
- [認証API修正仕様書](./api-fixes/AUTH_API_FIX.md)
- [オーダーAPI修正仕様書](./api-fixes/ORDER_API_FIX.md)
- [API実装計画書](./api-fixes/IMPLEMENTATION_PLAN.md)

## 2. hotel-saas側の対応

hotel-common側でAPIが実装された後、hotel-saas側で以下の対応を行います：

1. **APIクライアント層の更新**
   - 新しく実装されたAPIに対応するメソッドを追加または更新

2. **モックデータの削除**
   - `server/utils/db-service.ts`のモック実装を段階的に削除
   - 代わりにAPIクライアント層を使用するように変更

3. **APIテスト**
   - 各APIの統合テストを実施
   - 正常に動作することを確認

4. **フロントエンド機能の確認**
   - 各機能がAPIを使用して正常に動作することを確認
   - 必要に応じてフロントエンドのコードを修正

## 3. 段階的な移行

以下の順序で段階的に移行を進めます：

1. **フェーズ1: 認証・テナント系API**
   - ログインAPI
   - トークン更新API
   - テナント情報取得API

2. **フェーズ2: オーダー系API**
   - オーダー履歴API
   - オーダー作成API
   - アクティブオーダーAPI
   - オーダー詳細API
   - オーダーステータス更新API

3. **フェーズ3: 管理画面系API**
   - ダッシュボード統計API
   - デバイス数API
   - 月次オーダー数API

## 4. 移行完了後の作業

1. **パフォーマンス最適化**
   - APIの呼び出し回数を最小限に抑える
   - キャッシュの活用

2. **エラーハンドリングの強化**
   - API呼び出しエラーの適切な処理
   - フォールバック処理の実装

3. **ドキュメントの更新**
   - API統合の詳細を記録
   - 開発者向けガイドの更新

4. **テスト自動化**
   - 統合テストの自動化
   - CI/CDパイプラインの構築

## 5. 長期的な計画

1. **Prismaの完全な削除**
   - hotel-saasからPrisma関連のコードを完全に削除
   - データベースアクセスは全てhotel-common APIを通じて行う

2. **マイクロサービス化**
   - 機能ごとにAPIをさらに分割
   - スケーラビリティの向上

3. **パフォーマンスモニタリング**
   - API呼び出しのパフォーマンスを監視
   - ボトルネックの特定と改善
