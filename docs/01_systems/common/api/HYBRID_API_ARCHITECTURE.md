# ハイブリッドAPI アーキテクチャ仕様書

## 📋 概要

hotel-commonは、ハイブリッドAPIアーキテクチャを採用し、共通機能と専用機能を効率的に管理します。

## 🏗️ アーキテクチャ設計

### システム構成

```
hotel-common/
├── 共通API (Common APIs)
│   ├── 認証・認可 (Authentication & Authorization)
│   ├── 操作ログ (Operation Logs)
│   ├── 会計機能 (Accounting)
│   └── ページ管理 (Page Management)
│
└── 専用API (Dedicated APIs)
    ├── SaaS専用 (hotel-saas specific)
    ├── PMS専用 (hotel-pms specific)
    └── Member専用 (hotel-member specific)
```

## 🔗 API エンドポイント一覧

### 共通API (Common APIs)

#### 認証・認可
- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/logout` - ログアウト
- `POST /api/v1/auth/refresh` - トークン更新
- `POST /api/v1/auth/validate` - トークン検証

#### 操作ログ
- `GET /api/v1/logs/operations` - 操作ログ一覧取得
- `GET /api/v1/logs/operations/:id` - 操作ログ詳細取得
- `POST /api/v1/logs/operations` - 操作ログ記録
- `POST /api/v1/logs/operations/search` - 操作ログ検索
- `GET /api/v1/logs/operations/export` - 操作ログエクスポート

#### 会計機能
- `GET /api/v1/accounting/invoices` - 請求書一覧取得
- `POST /api/v1/accounting/invoices` - 請求書作成
- `GET /api/v1/accounting/invoices/:id` - 請求書詳細取得
- `POST /api/v1/accounting/payments` - 決済記録
- `GET /api/v1/accounting/payments` - 決済履歴取得
- `GET /api/v1/accounting/reports` - 会計レポート取得

#### ページ管理
- `GET /api/v1/pages` - ページ一覧取得
- `POST /api/v1/pages` - ページ作成
- `GET /api/v1/pages/:id` - ページ詳細取得
- `PUT /api/v1/pages/:id` - ページ更新
- `DELETE /api/v1/pages/:id` - ページ削除

### 専用API (Dedicated APIs)

#### SaaS専用 (hotel-saas)
- `GET /api/v1/admin/summary` - 管理画面サマリー
- `GET /api/v1/admin/orders` - 管理者オーダー一覧
- `GET /api/v1/orders/history` - オーダー履歴
- `POST /api/v1/orders` - オーダー作成
- `GET /api/v1/devices/status` - デバイス状態確認

#### PMS専用 (hotel-pms)
- `GET /api/v1/reservations` - 予約一覧取得
- `POST /api/v1/reservations` - 予約作成
- `GET /api/v1/rooms` - 部屋一覧取得
- `PUT /api/v1/rooms/:id` - 部屋情報更新

#### Member専用 (hotel-member)
- `GET /api/v1/response-tree` - レスポンスツリー取得
- `POST /api/v1/response-tree` - レスポンスツリー作成

## 📊 統一レスポンス形式

### 成功レスポンス
```json
{
  "success": true,
  "data": {
    // 実際のデータ
  },
  "meta": {
    // メタデータ（オプション）
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 100,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  },
  "timestamp": "2025-08-27T07:00:00.000Z",
  "request_id": "req-1756280000000-abc123"
}
```

### エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "バリデーションエラーが発生しました",
    "details": {
      // エラー詳細（オプション）
    }
  },
  "timestamp": "2025-08-27T07:00:00.000Z",
  "request_id": "req-1756280000000-abc123"
}
```

## 🔐 認証・認可

### JWT トークン
- **アクセストークン**: 8時間有効
- **リフレッシュトークン**: 30日間有効

### 権限レベル
- `STAFF`: 一般スタッフ
- `ADMIN`: 管理者
- `SUPER_ADMIN`: システム管理者
- `MANAGER`: マネージャー
- `OWNER`: オーナー
- `SYSTEM`: システム

## 📝 ログ記録

### 操作ログ
すべてのAPI操作は自動的に記録されます：
- ユーザー情報
- 操作内容
- 対象リソース
- IPアドレス
- ユーザーエージェント
- タイムスタンプ

### システムイベント
重要なシステムイベントは`system_event`テーブルに記録されます。

## 🔄 エラーハンドリング

### 標準エラーコード
- `VALIDATION_ERROR`: バリデーションエラー
- `AUTHENTICATION_ERROR`: 認証エラー
- `AUTHORIZATION_ERROR`: 認可エラー
- `NOT_FOUND`: リソースが見つからない
- `INTERNAL_ERROR`: 内部サーバーエラー
- `RATE_LIMIT_EXCEEDED`: レート制限超過

## 🚀 パフォーマンス

### キャッシュ戦略
- Redis を使用したセッション管理
- 頻繁にアクセスされるデータのキャッシュ

### ページネーション
- デフォルト: 20件/ページ
- 最大: 100件/ページ

## 🔧 開発ガイド

### 新しいAPIの追加
1. 適切なシステムディレクトリを選択 (`systems/saas`, `systems/pms`, `systems/member`, `systems/common`)
2. `ResponseHelper` を使用して統一レスポンス形式を実装
3. 適切な認証ミドルウェアを適用
4. 操作ログを記録

### 例: 新しいAPIエンドポイント
```typescript
import { ResponseHelper } from '../../../standards/api-response-standards';

router.get('/api/v1/example', authMiddleware, async (req: Request, res: Response) => {
  try {
    const data = await getExampleData();
    ResponseHelper.sendSuccess(res, { items: data });
  } catch (error) {
    ResponseHelper.sendInternalError(res, 'データ取得に失敗しました');
  }
});
```

## 📈 モニタリング

### ヘルスチェック
- `GET /health` - システム全体の健康状態
- `GET /api/monitoring/dashboard` - 詳細な監視情報

### システム接続状況
- hotel-saas: `http://localhost:3100`
- hotel-member: `http://localhost:3200`
- hotel-pms: `http://localhost:3300`

## 🔄 更新履歴

### v1.0.0 (2025-08-27)
- ハイブリッドAPIアーキテクチャの実装
- 統一レスポンス形式の導入
- 共通API（操作ログ、会計機能）の実装
- 既存専用APIの標準化
- システム別ディレクトリ構成の導入
