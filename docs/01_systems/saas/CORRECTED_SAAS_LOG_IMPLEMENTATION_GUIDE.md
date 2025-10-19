=== 【修正版】hotel-saas ログシステム実装ガイド ===

🚨 **重要**: 前版の実装ガイドは統一アーキテクチャに反する内容でした。
本ガイドが正式版です。

【統一アーキテクチャの原則】
✅ 全ログテーブル: hotel_unified_db（hotel-common管理）
✅ SaaSの役割: 統一Prismaクライアント経由でログ記録
❌ SaaS内でのテーブル作成: 絶対禁止

【必読ドキュメント】
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/common/integration/rules/unified-database-management-rules.md
★★★ /Users/kaneko/hotel-kanri/docs/01_systems/common/integration/specifications/unified-prisma-client-specification.md
★★☆ /Users/kaneko/hotel-kanri/docs/01_systems/saas/ADMIN_CRUD_LOG_IMPLEMENTATION_GUIDE.md

【実装順序】
Phase 1: 統一Prismaクライアント導入（1-3日）
Phase 2: 既存audit_logs拡張カラム使用（4-6日）
Phase 3: 新規ログテーブルへの記録実装（7-10日）
Phase 4: 管理画面CRUD操作ログ強化（11-13日）
Phase 5: 統合テスト・パフォーマンス調整（14日）

【重要な実装方針】
✅ 必須事項
- 統一Prismaクライアント使用（hotel-common配布）
- hotel_unified_db内のテーブルのみ使用
- モック実装（db-service.ts）から段階的移行
- 管理画面のCUD操作は必ず記録（READ操作は除外）
- 高リスク操作は即座にアラート

❌ 絶対禁止事項
- SaaS内でのテーブル作成
- 独自Prismaクライアント使用
- 独自データベース接続
- 既存audit_logsテーブルの削除・大幅変更
- 同期的なログ記録処理

【Phase 1: 統一Prismaクライアント導入】

□ 現状確認
  □ 現在のdb-service.tsモック実装の確認
  □ hotel-commonとの接続状況確認
  □ 統一Prismaクライアントの入手

□ 段階的移行準備
  □ 統一Prismaクライアントのインストール
  □ 環境変数設定（HOTEL_UNIFIED_DB_URL）
  □ 接続テスト実行

□ モック実装の段階的置き換え
  □ 認証関連機能から開始
  □ テナント情報取得機能
  □ 基本CRUD操作

【Phase 2: 既存audit_logs拡張カラム使用】

□ hotel-commonチームとの連携確認
  □ audit_logs拡張カラムの追加状況確認
  □ 新カラム仕様の確認
    - operation_category VARCHAR(50)
    - risk_level VARCHAR(20)
    - business_context JSONB
    - session_id VARCHAR(255)
    - approval_required BOOLEAN
    - approved_by UUID
    - reason TEXT

□ 拡張audit_logsへの記録実装
  □ 統一ログ記録関数実装
  □ 業務コンテキスト記録機能
  □ 高リスク操作判定機能

【Phase 3: 新規ログテーブルへの記録実装】

□ hotel-commonチームとの連携確認
  □ 新規ログテーブルの作成状況確認
    - auth_logs（認証ログ）
    - ai_operation_logs（AIクレジット・操作ログ）
    - billing_logs（請求・課金ログ）
    - device_usage_logs（デバイス使用量ログ）
    - security_logs（セキュリティログ）

□ 各ログテーブルへの記録実装
  □ AIクレジットログ記録機能
    ```typescript
    await prisma.ai_operation_logs.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        operation: 'USE',
        ai_function: 'CONCIERGE_CHAT',
        credit_amount: 5,
        balance_before: 100,
        balance_after: 95,
        request_details: {...},
        response_details: {...}
      }
    })
    ```

  □ 請求ログ記録機能
    ```typescript
    await prisma.billing_logs.create({
      data: {
        tenant_id: tenantId,
        billing_period: '2025-09',
        operation: 'CALCULATE',
        amount: 15000.00,
        currency: 'JPY',
        calculation_details: {...}
      }
    })
    ```

  □ デバイス使用量ログ記録機能
    ```typescript
    await prisma.device_usage_logs.create({
      data: {
        tenant_id: tenantId,
        device_id: deviceId,
        room_id: '101',
        event_type: 'CONNECT',
        session_duration_minutes: 30,
        connection_quality: 4
      }
    })
    ```

【Phase 4: 管理画面CRUD操作ログ強化】

□ 統一ログ記録関数実装
```typescript
async function logAdminCRUDOperation(params: {
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
  // 統一Prismaクライアント使用
  const prisma = getUnifiedPrisma()
  
  // 拡張audit_logsへの記録
  await prisma.audit_logs.create({
    data: {
      tenant_id: params.tenantId,
      table_name: params.tableName,
      operation: params.operation,
      record_id: params.recordId,
      user_id: params.userId,
      old_values: params.oldValues,
      new_values: params.newValues,
      // 拡張カラム使用
      operation_category: params.operationCategory,
      risk_level: params.riskLevel,
      business_context: params.businessContext,
      session_id: extractSessionId(params.request),
      approval_required: ['HIGH', 'CRITICAL'].includes(params.riskLevel),
      approved_by: params.approvedBy,
      reason: params.reason,
      ip_address: getClientIP(params.request),
      user_agent: getHeader(params.request, 'user-agent')
    }
  })
  
  // 高リスク操作の場合はアラート
  if (['HIGH', 'CRITICAL'].includes(params.riskLevel)) {
    await sendHighRiskAlert(params)
  }
}
```

□ 管理画面API修正
  □ メニュー管理API（CREATE/UPDATE/DELETE）
  □ オーダー管理API（CREATE/UPDATE/DELETE）
  □ スタッフ管理API（CREATE/UPDATE/DELETE）
  □ システム設定API（UPDATE）
  □ 会計処理API（CREATE/UPDATE）

【Phase 5: 統合テスト・パフォーマンス調整】

□ 統一Prismaクライアント動作確認
  □ 接続テスト
  □ CRUD操作テスト
  □ トランザクションテスト

□ ログ記録機能テスト
  □ audit_logs拡張カラム記録テスト
  □ 新規ログテーブル記録テスト
  □ 高リスク操作アラートテスト

□ パフォーマンステスト
  □ 大量CRUD操作テスト
  □ 同時アクセステスト
  □ ログ記録性能テスト

【実装チェックリスト】

□ 統一アーキテクチャ準拠
  □ 統一Prismaクライアント導入完了
  □ hotel_unified_dbへの接続確認
  □ SaaS内テーブル作成なし確認

□ ログ記録機能
  □ audit_logs拡張カラム使用完了
  □ 新規ログテーブル記録完了
  □ 統一ログ関数実装完了

□ 管理画面CRUD強化
  □ 全CRUD操作ログ記録完了
  □ 高リスク操作処理完了
  □ 業務コンテキスト記録完了

□ テスト
  □ 統一Prismaクライアントテスト完了
  □ ログ記録機能テスト完了
  □ パフォーマンステスト完了

【重複実装禁止事項】
❌ 独自テーブル作成
❌ 独自Prismaクライアント
❌ 独自データベース接続管理
❌ モック・フォールバック実装継続
❌ 独自認証システム
❌ 独自Redis接続管理

【hotel-commonチームとの連携事項】

以下はhotel-commonチームが実装する内容です：
✅ 全ログテーブルの作成・管理
✅ audit_logs拡張カラム追加
✅ 統一Prismaクライアント更新・配布
✅ Row Level Security設定
✅ インデックス・制約設定

【完了報告】

実装完了後、以下を報告してください：
- 統一Prismaクライアント導入状況
- モック実装からの移行状況
- ログ記録機能動作確認結果
- パフォーマンス測定結果
- 既存機能への影響評価
