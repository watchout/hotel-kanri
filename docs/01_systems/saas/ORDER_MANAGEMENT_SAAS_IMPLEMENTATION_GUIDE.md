=== hotel-saas 注文管理システム 実装ガイド ===

【必読ドキュメント】
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/saas/ORDER_MIGRATION_ANALYSIS.md
★★☆ /Users/kaneko/hotel-kanri/docs/01_systems/saas/API_INTEGRATION_CHECKLIST.md
★☆☆ /Users/kaneko/hotel-kanri/composables/useSessionApi.ts

【重要】このドキュメントは簡潔な実装指示のみ記載。詳細仕様は上記必読ドキュメントを参照。

【実装順序】
Phase 1: セッション対応注文API実装 (1-2日)
Phase 2: フロントエンド修正・統合 (2-3日)
Phase 3: リアルタイム通知実装 (3-5日)
Phase 4: テスト・デプロイ (1-2日)

【重要な実装方針】
❌ 禁止事項:
- Prismaを直接使用したDB操作
- 部屋番号ベースの注文処理（既存互換性除く）
- hotel-commonのAPIエンドポイント実装（権限外）
- 認証・APIクライアント機能の重複実装
- 独自の認証ヘルパー関数の作成
- 個別のhotel-common API呼び出し実装

✅ 必須事項:
- 全ての注文処理をhotel-common API経由で実行
- セッションIDベースの注文管理への段階的移行
- 既存フローとの互換性維持（フォールバック実装）
- エラーハンドリングとタイムアウト処理の実装
- 既存の共通ライブラリ・ヘルパーの必須使用:
  * server/utils/authService.v2.ts (認証関連)
  * composables/useSessionApi.ts (セッション管理)
  * 既存のauthenticatedFetch関数 (認証付きAPI呼び出し)
- 新機能実装前の既存共通機能確認

【Phase 1: セッション対応注文API実装】

□ 1-1. 共通APIクライアント拡張
   ファイル: server/utils/api-client.ts
   ⚠️ 既存authService.v2.tsを拡張、重複実装禁止
   
□ 1-2. 共通認証ヘルパー活用
   ファイル: server/utils/authService.v2.ts
   ⚠️ 既存機能必須使用、独自実装禁止

□ 1-3. 注文作成APIエンドポイント修正
   ファイル: server/api/v1/order/index.post.ts
   ⚠️ 既存共通機能必須使用、詳細は必読ドキュメント参照

【Phase 2: フロントエンド修正・統合】

□ 2-1. 電話注文処理修正 (Line 3408-3422)
   ⚠️ useSessionApi()活用、詳細は必読ドキュメント参照

□ 2-2. 会計確認処理修正 (Line 3926-3943)
   ⚠️ authenticatedFetch使用、重複実装禁止

□ 2-3. 注文表示UI改善 (Line 130-136)
   ⚠️ セッション情報表示追加

【Phase 3: リアルタイム通知実装】

□ 3-1. WebSocket接続設定
   ファイル: composables/useOrderNotifications.ts (新規作成)
   ⚠️ 詳細実装は必読ドキュメント参照

□ 3-2. 注文ステータス更新処理
   ファイル: server/api/v1/orders/[id]/status.put.ts (新規作成)
   ⚠️ 既存authService.v2.ts必須使用

【Phase 4: テスト・デプロイ】

□ 4-1. 統合テスト実行
   ⚠️ テスト詳細は必読ドキュメント参照

□ 4-2. フロントエンド動作確認
   URL: http://localhost:3100/admin/front-desk/operation

□ 4-3. エラーハンドリングテスト
   ⚠️ hotel-common API停止時等の動作確認

【実装チェックリスト】
□ Phase 1: セッション対応注文API実装完了
□ Phase 2: フロントエンド修正・統合完了
□ Phase 3: リアルタイム通知実装完了
□ Phase 4: テスト・デプロイ完了

【技術的詳細】
- API Base URL: http://localhost:3400 (開発環境)
- WebSocket URL: ws://localhost:3400/ws/orders
- 認証: Authorization: Bearer {token}
- 詳細仕様: 必読ドキュメント参照

作成日時: 2025年9月22日
対象システム: hotel-saas
実装期限: 2025年10月15日
