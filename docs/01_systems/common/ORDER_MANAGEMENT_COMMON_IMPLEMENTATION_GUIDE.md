=== hotel-common 注文管理システム 実装ガイド ===

【必読ドキュメント】
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/saas/MISSING_COMMON_APIS.md
★★☆ /Users/kaneko/hotel-kanri/docs/01_systems/saas/PHASE2_COMMON_API_ENDPOINTS.md
★☆☆ /Users/kaneko/hotel-kanri/docs/01_systems/saas/ORDER_MIGRATION_ANALYSIS.md

【重要】このドキュメントは簡潔な実装指示のみ記載。詳細仕様は上記必読ドキュメントを参照。

【実装順序】
Phase 1: 基盤API実装 (認証・セッション管理) (1-2日)
Phase 2: 注文管理API実装 (2-3日)
Phase 3: リアルタイム通知実装 (WebSocket) (2-3日)
Phase 4: 統計・管理API実装 (3-5日)
Phase 5: テスト・デプロイ (1-2日)

【重要な実装方針】
❌ 禁止事項:
- hotel-saasやhotel-pmsのファイルを直接編集
- 他システムのデータベースへの直接アクセス
- 認証機能の重複実装
- 個別システム固有のビジネスロジック実装

✅ 必須事項:
- RESTful API設計原則の遵守
- OpenAPI仕様書の作成・更新
- 統一認証システムとの連携
- エラーハンドリングとログ出力の標準化
- レスポンス形式の統一
- 既存の共通ライブラリ・ミドルウェアの活用

【Phase 1: 基盤API実装】

□ 1-1. 認証・セキュリティAPI実装
   エンドポイント: POST /api/v1/auth/login
   ⚠️ 既存認証システム活用、重複実装禁止

□ 1-2. トークン検証API実装
   エンドポイント: GET /api/v1/auth/validate-token
   ⚠️ 既存機能活用

□ 1-3. セッション管理API実装
   エンドポイント: POST /api/v1/sessions
   ⚠️ 詳細仕様は必読ドキュメント参照

□ 1-4. セッション取得API実装
   エンドポイント: GET /api/v1/sessions/by-room/{roomNumber}
   ⚠️ アクティブセッション取得機能

【Phase 2: 注文管理API実装】

□ 2-1. 注文作成API実装
   エンドポイント: POST /api/v1/orders
   ⚠️ セッション存在確認 + WebSocket通知

□ 2-2. 注文履歴取得API実装
   エンドポイント: GET /api/v1/orders/history
   ⚠️ ページネーション対応

□ 2-3. 注文詳細取得API実装
   エンドポイント: GET /api/v1/orders/{id}
   ⚠️ 詳細仕様は必読ドキュメント参照

□ 2-4. 注文ステータス更新API実装
   エンドポイント: PUT /api/v1/orders/{id}/status
   ⚠️ ステータス妥当性チェック + WebSocket通知

□ 2-5. メニュー取得API実装
   エンドポイント: GET /api/v1/menus/top
   ⚠️ テナント別メニュー取得

【Phase 3: リアルタイム通知実装】

□ 3-1. WebSocket接続管理
   ファイル: services/websocketService.js
   ⚠️ 詳細実装は必読ドキュメント参照

【Phase 4: 統計・管理API実装】

□ 4-1. ダッシュボード統計API実装
   エンドポイント: GET /api/v1/admin/dashboard/stats
   ⚠️ 詳細仕様は必読ドキュメント参照

□ 4-2. 月次注文数API実装
   エンドポイント: GET /api/v1/admin/orders/monthly-count
   ⚠️ 年月パラメータ対応

【実装チェックリスト】
□ Phase 1: 基盤API実装完了
□ Phase 2: 注文管理API実装完了
□ Phase 3: リアルタイム通知実装完了
□ Phase 4: 統計・管理API実装完了
□ Phase 5: テスト・デプロイ完了

【技術的詳細】
- API Base URL: http://localhost:3400 (開発環境)
- WebSocket Port: 8080
- 認証: Bearer Token
- レスポンス形式: { success: true/false, data/error: ... }
- 詳細仕様・DBスキーマ: 必読ドキュメント参照

作成日時: 2025年9月22日
対象システム: hotel-common
実装期限: 2025年10月15日
