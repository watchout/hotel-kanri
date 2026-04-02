=== hotel-saas ログシステム実装ガイド ===

【必読ドキュメント】
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/common/UNIFIED_LOG_SYSTEM_DESIGN.md
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/saas/ADMIN_CRUD_LOG_IMPLEMENTATION_GUIDE.md
★★☆ /Users/kaneko/hotel-kanri/docs/01_systems/saas/CURRENT_LOG_STATUS_MATRIX.md
★☆☆ /Users/kaneko/hotel-kanri/docs/architecture/UNIFIED_LOGGING_STANDARDS.md

【実装順序】
Phase 1: 既存audit_logs拡張（1-2日）
Phase 2: SaaS固有ログテーブル作成（3-4日）
Phase 3: hotel-common連携機能実装（5-7日）
Phase 4: 管理画面CRUD操作ログ強化（8-10日）
Phase 5: 統合テスト・パフォーマンス調整（11-14日）

【重要な実装方針】
✅ 必須事項
- 既存audit_logsテーブルを拡張（新カラム追加）
- hotel-commonへの共通ログ送信は非同期処理
- 管理画面のCUD操作は必ず記録（READ操作は除外）
- 高リスク操作は即座にアラート
- 業務コンテキスト（理由・承認者）を必ず記録

❌ 禁止事項
- 既存audit_logsテーブルの削除・大幅変更
- 同期的なhotel-common API呼び出し
- READ操作のログ記録
- パスワード等の機密情報記録
- 既存レポート機能への影響

【Phase 1: 既存audit_logs拡張】

□ audit_logsテーブルに新カラム追加
  □ operation_category VARCHAR(50) -- 'menu', 'order', 'staff', 'system'
  □ risk_level VARCHAR(20) -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  □ business_context JSONB -- 業務コンテキスト情報
  □ session_id VARCHAR(255) -- セッションID
  □ approval_required BOOLEAN -- 承認が必要な操作か
  □ approved_by UUID -- 承認者ID
  □ reason TEXT -- 操作理由

□ 既存データの互換性確保
  □ 新カラムはNULL許可で追加
  □ デフォルト値設定
  □ 既存トリガーの動作確認
  □ 既存レポートの動作確認

□ インデックス追加
  □ operation_category + created_at
  □ risk_level + created_at
  □ session_id
  □ approved_by + created_at

【Phase 2: SaaS固有ログテーブル作成】

□ AIクレジットログテーブル作成
CREATE TABLE ai_credit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES staff(id),
  operation VARCHAR(50) NOT NULL, -- 'USE', 'GRANT', 'ADJUST', 'EXPIRE'
  ai_function VARCHAR(100) NOT NULL, -- 'CONCIERGE_CHAT', 'MENU_RECOMMEND'
  credit_amount INTEGER NOT NULL, -- 使用・付与クレジット数
  balance_before INTEGER NOT NULL, -- 操作前残高
  balance_after INTEGER NOT NULL, -- 操作後残高
  request_details JSONB, -- AI機能の詳細
  response_details JSONB, -- AI応答の詳細
  cost_calculation JSONB, -- コスト計算詳細
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

□ 請求・課金ログテーブル作成
CREATE TABLE billing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  billing_period VARCHAR(20) NOT NULL, -- '2025-09'
  operation VARCHAR(50) NOT NULL, -- 'CALCULATE', 'GENERATE', 'PAYMENT', 'REFUND'
  amount DECIMAL(10,2), -- 金額
  currency VARCHAR(3) DEFAULT 'JPY', -- 通貨
  calculation_details JSONB, -- 計算詳細
  payment_method VARCHAR(50), -- 支払い方法
  payment_status VARCHAR(50), -- 支払い状況
  external_transaction_id VARCHAR(255), -- 外部決済ID
  error_details JSONB, -- エラー詳細
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

□ デバイス使用量ログテーブル作成
CREATE TABLE device_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  device_id UUID REFERENCES device_rooms(id),
  room_id VARCHAR(100), -- 部屋番号
  event_type VARCHAR(50) NOT NULL, -- 'CONNECT', 'DISCONNECT', 'HEARTBEAT'
  connection_quality INTEGER, -- 接続品質（1-5）
  session_duration_minutes INTEGER, -- セッション時間
  data_transferred_mb DECIMAL(10,2), -- 転送データ量
  error_count INTEGER DEFAULT 0, -- エラー回数
  device_info JSONB, -- デバイス情報
  network_info JSONB, -- ネットワーク情報
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

□ 各テーブルのインデックス作成
□ Row Level Security設定
□ 外部キー制約設定

【Phase 3: hotel-common連携機能実装】

□ 共通ログ送信クライアント実装
  □ 認証ログ送信機能
  □ セキュリティログ送信機能
  □ システム処理ログ送信機能
  □ システム間連携ログ送信機能

□ 非同期送信機能実装
  □ Redis Queue設定
  □ ワーカープロセス実装
  □ 失敗時リトライ機能
  □ 送信失敗時のローカル保存

□ 認証ログ統合
  □ ログイン成功時のログ送信
  □ ログイン失敗時のログ送信
  □ ログアウト時のログ送信
  □ トークンリフレッシュ時のログ送信

□ セキュリティログ統合
  □ 不正アクセス検知時のログ送信
  □ 権限外操作試行時のログ送信
  □ 異常操作検知時のログ送信
  □ ブルートフォース攻撃検知時のログ送信

【Phase 4: 管理画面CRUD操作ログ強化】

□ 統一ログ記録関数実装
function logAdminCRUDOperation(params: {
  tenantId: string;
  userId: string;
  tableName: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  recordId: string;
  oldValues?: object;
  newValues?: object;
  operationCategory: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  businessContext: object;
  reason?: string;
  approvedBy?: string;
  request: Request;
}) {
  // audit_logs拡張版への記録
  // 高リスク操作の場合はアラート送信
  // hotel-commonへのログ送信（必要に応じて）
}

□ 高リスク操作の特別処理
  □ CRITICAL/HIGHレベル操作の即座アラート
  □ 承認フロー必須操作の実装
  □ 操作理由入力の必須化
  □ 二段階認証の実装

□ 管理画面API修正
  □ メニュー管理API
  □ オーダー管理API
  □ スタッフ管理API
  □ システム設定API
  □ 会計処理API

□ 業務コンテキスト記録
  □ 操作理由の記録
  □ 承認者情報の記録
  □ 業務的背景の記録
  □ 関連データの記録

【Phase 5: 統合テスト・パフォーマンス調整】

□ 機能テスト
  □ CRUD操作ログ記録テスト
  □ hotel-common連携テスト
  □ アラート機能テスト
  □ 検索・分析機能テスト

□ パフォーマンステスト
  □ 大量CRUD操作テスト
  □ 同時アクセステスト
  □ ログ記録性能テスト
  □ hotel-common連携性能テスト

□ セキュリティテスト
  □ 不正アクセステスト
  □ 権限チェックテスト
  □ データ漏洩防止テスト
  □ アラート動作テスト

□ 既存機能への影響確認
  □ 既存レポート機能
  □ 既存分析機能
  □ 既存API性能
  □ 既存UI動作

【実装チェックリスト】

□ データベース変更
  □ audit_logs拡張完了
  □ SaaS固有テーブル作成完了
  □ インデックス作成完了
  □ 制約設定完了

□ ログ記録機能
  □ 統一ログ関数実装完了
  □ CRUD操作ログ実装完了
  □ 業務コンテキスト記録完了
  □ 高リスク操作処理完了

□ hotel-common連携
  □ 認証ログ送信完了
  □ セキュリティログ送信完了
  □ 非同期送信機能完了
  □ エラーハンドリング完了

□ SaaS固有ログ
  □ AIクレジットログ完了
  □ 請求ログ完了
  □ デバイス使用量ログ完了
  □ 分析機能完了

□ テスト
  □ 単体テスト完了
  □ 統合テスト完了
  □ パフォーマンステスト完了
  □ セキュリティテスト完了

【デプロイメント手順】

1. データベース変更適用
   - audit_logs拡張スクリプト実行
   - 新テーブル作成スクリプト実行
   - インデックス作成スクリプト実行

2. アプリケーション更新
   - ログ記録機能デプロイ
   - hotel-common連携機能デプロイ
   - 管理画面API更新デプロイ

3. 設定更新
   - hotel-common接続設定
   - Redis Queue設定
   - アラート設定

4. 動作確認
   - ログ記録動作確認
   - hotel-common連携確認
   - アラート動作確認

【技術的詳細】

★★★ 完全実装詳細: /Users/kaneko/hotel-kanri/docs/01_systems/saas/SAAS_TECHNICAL_IMPLEMENTATION_DETAILS.md

hotel-common連携:
- エンドポイント: https://common.hotel-system.com/api/v1/logs/*
- 認証方式: JWT Bearer Token（既存統一認証使用）
- 送信方式: 非同期（既存Redis Queue使用）
- リトライ: 最大3回、指数バックオフ

環境変数:
- COMMON_LOG_API_URL: hotel-common ログAPIのURL
- COMMON_LOG_API_TOKEN: 認証用JWTトークン
- REDIS_LOG_QUEUE_URL: Redis接続URL（既存統合Redis使用）
- LOG_ALERT_WEBHOOK_URL: アラート送信先URL

【重複実装禁止事項】
❌ JWT認証システムの新規実装
❌ 独自API認証ミドルウェア
❌ 独自データベース接続管理
❌ 独自Redis接続管理
❌ モック・フォールバック実装
❌ 独自エラーハンドリング基盤

【注意事項】

1. 既存audit_logsテーブルへの影響を最小化
2. 既存レポート・分析機能への互換性維持
3. パフォーマンス劣化の防止（非同期処理必須）
4. hotel-common連携の障害時対応
5. 機密情報の適切な保護

【完了報告】

実装完了後、以下を報告してください：
- 各Phaseの完了日時
- テスト結果サマリー
- パフォーマンス測定結果
- 既存機能への影響評価
- hotel-common連携状況
- 運用開始予定日
