# hotel-common API実装計画書

## 概要

hotel-saasをhotel-commonのAPIに完全に統合するために、hotel-common側で不足しているAPIを実装する必要があります。このドキュメントでは、実装すべきAPIの優先順位と計画を示します。

## 優先度の高いAPI

以下のAPIは、hotel-saasの基本機能に必要であり、最優先で実装する必要があります：

### 1. 認証・テナント系API

| API | 説明 | 実装状況 | 修正内容 |
|-----|------|---------|---------|
| `POST /api/v1/auth/login` | ログイン処理 | 未実装 | [AUTH_API_FIX.md](./AUTH_API_FIX.md) |
| `POST /api/v1/auth/validate-token` | トークン検証 | 実装済み（`/api/auth/validate`） | パスの修正 |
| `POST /api/v1/auth/refresh` | トークン更新 | 未実装 | [AUTH_API_FIX.md](./AUTH_API_FIX.md) |
| `GET /api/tenants` | テナント一覧取得 | 実装済み（エラーあり） | [TENANT_API_FIX.md](./TENANT_API_FIX.md) |
| `GET /api/tenants/:id` | テナント情報取得 | 未実装 | [TENANT_API_FIX.md](./TENANT_API_FIX.md) |

### 2. オーダー系API

| API | 説明 | 実装状況 | 修正内容 |
|-----|------|---------|---------|
| `GET /api/v1/orders/history` | 注文履歴 | 未実装 | [ORDER_API_FIX.md](./ORDER_API_FIX.md) |
| `POST /api/v1/orders` | 注文作成 | 未実装 | [ORDER_API_FIX.md](./ORDER_API_FIX.md) |
| `GET /api/v1/orders/active` | アクティブ注文 | 未実装 | 実装予定 |
| `GET /api/v1/orders/:id` | 注文詳細 | 未実装 | 実装予定 |
| `PUT /api/v1/orders/:id/status` | 注文ステータス更新 | 未実装 | 実装予定 |
| `GET /api/v1/order/menu` | メニュー一覧 | 未実装 | 実装予定 |

## 実装手順

### フェーズ1: 認証・テナント系API

1. **テナントAPI修正**
   - `GET /api/tenants`のエラーを修正
   - `GET /api/tenants/:id`を実装

2. **認証API実装**
   - `POST /api/v1/auth/login`を実装
   - `POST /api/v1/auth/refresh`を実装
   - `POST /api/auth/validate`を`/api/v1/auth/validate-token`にも対応

### フェーズ2: オーダー系API

1. **オーダー履歴API実装**
   - `GET /api/v1/orders/history`を実装

2. **オーダー作成API実装**
   - `POST /api/v1/orders`を実装

3. **その他オーダー系API実装**
   - `GET /api/v1/orders/active`を実装
   - `GET /api/v1/orders/:id`を実装
   - `PUT /api/v1/orders/:id/status`を実装
   - `GET /api/v1/order/menu`を実装

### フェーズ3: 管理画面系API

1. **ダッシュボードAPI実装**
   - `GET /api/v1/admin/summary`を実装
   - `GET /api/v1/admin/dashboard/stats`を実装
   - `GET /api/v1/admin/devices/count`を実装
   - `GET /api/v1/admin/orders/monthly-count`を実装

## テスト計画

各APIの実装後、以下のテストを実施します：

1. **単体テスト**
   - 各APIの正常系・異常系のテスト
   - バリデーションのテスト
   - エラーハンドリングのテスト

2. **統合テスト**
   - hotel-saasからのAPI呼び出しテスト
   - 認証フローのテスト
   - エンドツーエンドのテスト

3. **パフォーマンステスト**
   - 負荷テスト
   - レスポンスタイムの測定

## 実装スケジュール

| フェーズ | タスク | 予定時間 |
|---------|------|---------|
| 1 | テナントAPI修正 | 4時間 |
| 1 | 認証API実装 | 8時間 |
| 2 | オーダー履歴API実装 | 4時間 |
| 2 | オーダー作成API実装 | 6時間 |
| 2 | その他オーダー系API実装 | 12時間 |
| 3 | 管理画面系API実装 | 16時間 |
| - | テスト | 16時間 |
| **合計** | | **66時間** |

## 注意事項

- 各APIの実装時には、セキュリティ、パフォーマンス、エラーハンドリングに注意してください
- 既存のデータベーススキーマとの整合性を確認してください
- APIの変更によって他の機能に影響がないか確認してください
- 実装後は必ずテストを行い、動作を確認してください
