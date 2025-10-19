# バックエンド基盤要件定義

## 1. システム構成

### 1.1 基本アーキテクチャ
- マイクロサービスアーキテクチャ
  - 注文管理サービス
  - ユーザー管理サービス
  - AIコンシェルジュサービス
  - VoIPサービス

### 1.2 技術要件
- WebSocket対応
- REST API
- OpenAPI (Swagger) 準拠
- コンテナ化（Docker）

## 2. 機能要件

### 2.1 注文管理システム
- WebSocketによるリアルタイム注文通知
- 注文状態管理（Pending→Cooking→Ready）
- 提供時間帯制御
- メニュー管理

### 2.2 認証・認可
- ロールベースアクセス制御（RBAC）
  - ゲスト
  - フロント
  - キッチン
  - サーバー
  - 管理者

### 2.3 データベース設計
- 注文テーブル
- メニューテーブル
- ユーザーテーブル
- 部屋情報テーブル

## 3. 非機能要件

### 3.1 性能要件
- 同時500リクエスト/秒の処理
- P95レスポンスタイム3秒以内
- WebSocket接続数1000以上

### 3.2 セキュリティ要件
- OWASP Top10対策
- HTTPS対応
- WAF実装
- レート制限実装

### 3.3 監視・ロギング
- アプリケーションログ
- アクセスログ
- エラーログ
- パフォーマンスメトリクス

## 4. API エンドポイント（主要なもの）

### 4.1 注文関連
- POST /api/v1/orders
- GET /api/v1/orders/{orderId}
- PATCH /api/v1/orders/{orderId}/status
- WebSocket /ws/orders

### 4.2 メニュー関連
- GET /api/v1/menus
- POST /api/v1/menus
- PUT /api/v1/menus/{menuId}

### 4.3 認証関連
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- GET /api/v1/auth/me 