# ⚡ 【即時移行】チェックインセッション管理システム 実装計画書

**作成日**: 2025年1月19日  
**移行方式**: **即時移行（開発段階対応）**  
**実装期間**: 2025年1月20日 〜 2025年2月9日（3週間）  
**優先度**: 🔴 **最高優先度**

---

## 🎯 **即時移行の実装戦略**

### **移行方式変更の理由**
- ✅ **開発段階の利点活用**: 複雑な並行運用ロジック不要
- ✅ **実装効率最大化**: 単一システムでの集中開発
- ✅ **テスト簡素化**: 移行期間中の複雑な状態管理が不要
- ✅ **早期問題解決**: 注文混在問題の即座解決

### **即時移行の前提条件**
- 🔧 **開発環境**: 本番データへの影響なし
- 🔧 **テスト環境**: 完全な検証環境
- 🔧 **バックアップ**: 完全なデータバックアップ
- 🔧 **ロールバック**: 即座復旧可能な体制

---

## 📅 **3週間実装スケジュール**

### **Week 1: 基盤実装週（1/20-1/26）**

#### **Day 1-2 (1/20-1/21): データベース基盤**
```yaml
Monday 1/20:
  AM: 
    - [ ] スキーマ設計最終確認
    - [ ] 開発環境データベース準備
    - [ ] 既存データバックアップ
  PM:
    - [ ] CheckinSessionテーブル作成
    - [ ] SessionBillingテーブル作成
    - [ ] インデックス・制約設定

Tuesday 1/21:
  AM:
    - [ ] 既存テーブル拡張（service_orders.session_id追加）
    - [ ] 監査ログテーブル作成
    - [ ] データ整合性制約設定
  PM:
    - [ ] 基本CRUD操作テスト
    - [ ] データベース性能テスト
    - [ ] 制約・トリガー動作確認
```

#### **Day 3-4 (1/22-1/23): API実装**
```yaml
Wednesday 1/22:
  AM:
    - [ ] セッション管理API実装
      - POST /api/sessions (作成)
      - GET /api/sessions/:id (取得)
      - PATCH /api/sessions/:id (更新)
  PM:
    - [ ] セッション検索API実装
      - GET /api/sessions/by-number/:number
      - GET /api/sessions/active-by-room/:roomId
      - GET /api/sessions/search

Thursday 1/23:
  AM:
    - [ ] セッション請求API実装
      - POST /api/session-billings
      - GET /api/session-billings/:id
      - PATCH /api/session-billings/:id
  PM:
    - [ ] イベント処理実装
      - session.created
      - session.checked_out
      - session.billing_updated
```

#### **Day 5-7 (1/24-1/26): データ移行・検証**
```yaml
Friday 1/24:
  AM:
    - [ ] 既存予約データからセッション生成スクリプト
    - [ ] 既存注文データのセッション紐付けスクリプト
    - [ ] データ移行テスト実行
  PM:
    - [ ] データ整合性検証
    - [ ] 移行データ品質確認
    - [ ] 移行ログ分析

Weekend 1/25-1/26:
  - [ ] 週末集中テスト
  - [ ] 性能テスト・負荷テスト
  - [ ] セキュリティテスト
  - [ ] Week 1完了確認
```

### **Week 2: システム統合週（1/27-2/2）**

#### **Day 1-2 (1/27-1/28): hotel-pms統合**
```yaml
Monday 1/27:
  AM:
    - [ ] チェックイン処理のセッション対応
    - [ ] セッション作成ロジック統合
    - [ ] 部屋状態管理連携
  PM:
    - [ ] チェックアウト処理のセッション対応
    - [ ] 最終請求計算ロジック
    - [ ] セッション完了処理

Tuesday 1/28:
  AM:
    - [ ] フロント画面のセッション表示
    - [ ] セッション管理UI実装
    - [ ] エラーハンドリング強化
  PM:
    - [ ] hotel-pms統合テスト
    - [ ] フロント業務フロー確認
    - [ ] Luna（月読）仕様適合確認
```

#### **Day 3-4 (1/29-1/30): hotel-saas統合**
```yaml
Wednesday 1/29:
  AM:
    - [ ] セッション番号による注文管理実装
    - [ ] 部屋番号→セッション番号マッピング
    - [ ] 既存注文処理の移行
  PM:
    - [ ] フロントエンドUI調整
    - [ ] セッション対応コンポーネント実装
    - [ ] 注文履歴表示の改良

Thursday 1/30:
  AM:
    - [ ] useSessionApi統合テスト
    - [ ] 型定義の実装確認
    - [ ] エラーハンドリング実装
  PM:
    - [ ] hotel-saas統合テスト
    - [ ] 注文フロー確認
    - [ ] UI/UX動作確認
```

#### **Day 5-7 (1/31-2/2): hotel-member統合**
```yaml
Friday 1/31:
  AM:
    - [ ] セッション単位ポイント管理実装
    - [ ] ポイント計算ロジック統合
    - [ ] 会員特典のセッション適用
  PM:
    - [ ] セッション履歴管理実装
    - [ ] 会員分析機能拡張
    - [ ] 特典適用ロジック確認

Weekend 2/1-2/2:
  - [ ] hotel-member統合テスト
  - [ ] Sakura（桜）仕様適合確認
  - [ ] 全システム統合テスト
  - [ ] Week 2完了確認
```

### **Week 3: 最終調整・デプロイ週（2/3-2/9）**

#### **Day 1-3 (2/3-2/5): 統合テスト・最適化**
```yaml
Monday 2/3:
  - [ ] 全システム統合テスト
  - [ ] エンドツーエンドテスト
  - [ ] 性能ベンチマーク

Tuesday 2/4:
  - [ ] 負荷テスト・ストレステスト
  - [ ] セキュリティテスト
  - [ ] データ整合性最終確認

Wednesday 2/5:
  - [ ] 性能最適化実装
  - [ ] メモリ使用量最適化
  - [ ] クエリ最適化
```

#### **Day 4-5 (2/6-2/7): 本番環境準備**
```yaml
Thursday 2/6:
  AM:
    - [ ] 本番環境データベース準備
    - [ ] 本番環境設定確認
    - [ ] デプロイスクリプト準備
  PM:
    - [ ] 本番データバックアップ
    - [ ] ロールバック手順確認
    - [ ] 緊急連絡体制確認

Friday 2/7:
  AM:
    - [ ] ステージング環境最終テスト
    - [ ] 本番環境デプロイリハーサル
    - [ ] 監視システム設定
  PM:
    - [ ] デプロイ前最終確認
    - [ ] チーム体制確認
    - [ ] 緊急時対応準備
```

#### **Day 6-7 (2/8-2/9): 本番デプロイ・運用開始**
```yaml
Saturday 2/8:
  - [ ] 本番環境デプロイ実行
  - [ ] システム動作確認
  - [ ] データ移行実行・確認
  - [ ] 全機能動作テスト

Sunday 2/9:
  - [ ] 運用監視開始
  - [ ] 性能監視確認
  - [ ] ユーザー受け入れテスト
  - [ ] プロジェクト完了確認
```

---

## 🛠️ **実装詳細**

### **データベース移行スクリプト**

#### **1. セッション生成スクリプト**
```sql
-- 既存予約からセッション生成
WITH session_data AS (
  SELECT 
    r.id as reservation_id,
    r.tenant_id,
    r.room_id,
    r.customer_id,
    r.check_in_date,
    r.check_out_date,
    r.status,
    rm.room_number,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    ROW_NUMBER() OVER (
      PARTITION BY rm.room_number, DATE(r.check_in_date) 
      ORDER BY r.created_at
    ) as sequence_num
  FROM reservations r
  JOIN rooms rm ON r.room_id = rm.id
  JOIN customers c ON r.customer_id = c.id
  WHERE r.check_in_date >= '2024-01-01'
)
INSERT INTO checkin_sessions (
  id,
  tenant_id,
  session_number,
  reservation_id,
  room_id,
  customer_id,
  guest_info,
  check_in_at,
  check_out_at,
  planned_check_out,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  sd.tenant_id,
  CONCAT(
    'R', REGEXP_REPLACE(sd.room_number, '[^0-9]', '', 'g'),
    '-', TO_CHAR(sd.check_in_date, 'YYYYMMDD'),
    '-', LPAD(sd.sequence_num::text, 3, '0')
  ),
  sd.reservation_id,
  sd.room_id,
  sd.customer_id,
  jsonb_build_object(
    'primaryGuest', jsonb_build_object(
      'firstName', sd.first_name,
      'lastName', sd.last_name,
      'email', sd.email,
      'phone', sd.phone
    ),
    'additionalGuests', '[]'::jsonb,
    'specialNeeds', '[]'::jsonb,
    'preferences', '{}'::jsonb
  ),
  sd.check_in_date,
  CASE 
    WHEN sd.status = 'CHECKED_OUT' THEN sd.check_out_date
    ELSE NULL 
  END,
  sd.check_out_date,
  CASE 
    WHEN sd.status = 'CHECKED_IN' THEN 'ACTIVE'
    WHEN sd.status = 'CHECKED_OUT' THEN 'CHECKED_OUT'
    ELSE 'CANCELED'
  END,
  NOW(),
  NOW()
FROM session_data sd;
```

#### **2. 注文データ移行スクリプト**
```sql
-- 既存注文のセッション紐付け
UPDATE service_orders so
SET session_id = (
  SELECT cs.id 
  FROM checkin_sessions cs
  JOIN reservations r ON cs.reservation_id = r.id
  WHERE r.room_id = so.room_id
    AND so.requested_at BETWEEN cs.check_in_at AND 
        COALESCE(cs.check_out_at, cs.planned_check_out)
  ORDER BY cs.check_in_at DESC
  LIMIT 1
)
WHERE so.session_id IS NULL 
  AND so.room_id IS NOT NULL
  AND so.requested_at >= '2024-01-01';

-- 移行結果確認
SELECT 
  COUNT(*) as total_orders,
  COUNT(session_id) as mapped_orders,
  COUNT(*) - COUNT(session_id) as unmapped_orders,
  ROUND(COUNT(session_id)::numeric / COUNT(*) * 100, 2) as mapping_rate
FROM service_orders
WHERE requested_at >= '2024-01-01';
```

#### **3. セッション請求生成スクリプト**
```sql
-- セッション請求データ生成
INSERT INTO session_billings (
  id,
  tenant_id,
  session_id,
  billing_number,
  room_charges,
  service_charges,
  taxes,
  discounts,
  subtotal_amount,
  tax_amount,
  total_amount,
  paid_amount,
  status,
  payment_method,
  payment_date,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  cs.tenant_id,
  cs.id,
  CONCAT('SB-', cs.session_number),
  
  -- 宿泊料金詳細
  jsonb_build_array(
    jsonb_build_object(
      'date', TO_CHAR(cs.check_in_at, 'YYYY-MM-DD'),
      'nights', COALESCE(
        EXTRACT(DAY FROM (cs.check_out_at - cs.check_in_at)),
        EXTRACT(DAY FROM (cs.planned_check_out - cs.check_in_at))
      ),
      'baseRate', COALESCE(b.total_amount, 0) / GREATEST(
        COALESCE(
          EXTRACT(DAY FROM (cs.check_out_at - cs.check_in_at)),
          EXTRACT(DAY FROM (cs.planned_check_out - cs.check_in_at))
        ), 1
      ),
      'amount', COALESCE(b.total_amount, 0)
    )
  ),
  
  -- サービス料金詳細
  COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'orderId', so.id,
        'serviceName', s.name,
        'category', s.category,
        'quantity', so.quantity,
        'unitPrice', so.amount / GREATEST(so.quantity, 1),
        'amount', so.amount,
        'orderedAt', so.requested_at
      )
    )
    FROM service_orders so
    JOIN services s ON so.service_id = s.id
    WHERE so.session_id = cs.id),
    '[]'::jsonb
  ),
  
  -- 税金詳細
  jsonb_build_array(
    jsonb_build_object(
      'type', 'consumption_tax',
      'rate', 0.1,
      'baseAmount', COALESCE(b.total_amount, 0) / 1.1,
      'taxAmount', COALESCE(b.total_amount, 0) - (COALESCE(b.total_amount, 0) / 1.1)
    )
  ),
  
  -- 割引詳細（初期値は空）
  '[]'::jsonb,
  
  -- 金額計算
  COALESCE(b.total_amount, 0) + COALESCE(service_total.amount, 0),
  (COALESCE(b.total_amount, 0) + COALESCE(service_total.amount, 0)) - 
    ((COALESCE(b.total_amount, 0) + COALESCE(service_total.amount, 0)) / 1.1),
  COALESCE(b.total_amount, 0) + COALESCE(service_total.amount, 0),
  COALESCE(b.paid_amount, 0),
  
  COALESCE(b.status, 'PENDING'),
  b.payment_method,
  b.payment_date,
  COALESCE(b.created_at, NOW()),
  NOW()
  
FROM checkin_sessions cs
LEFT JOIN billings b ON b.reservation_id = cs.reservation_id
LEFT JOIN (
  SELECT 
    session_id,
    SUM(amount) as amount
  FROM service_orders
  WHERE session_id IS NOT NULL
  GROUP BY session_id
) service_total ON service_total.session_id = cs.id;
```

### **API実装例**

#### **セッション作成API**
```typescript
// POST /api/sessions
export async function createSession(
  request: CreateSessionRequest
): Promise<CheckinSession> {
  const transactionId = generateTransactionId();
  
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. セッション番号生成
      const sessionNumber = await generateSessionNumber(
        request.roomId,
        request.checkInAt
      );
      
      // 2. セッション作成
      const session = await tx.checkinSession.create({
        data: {
          tenantId: request.tenantId,
          sessionNumber,
          reservationId: request.reservationId,
          roomId: request.roomId,
          customerId: request.customerId,
          guestInfo: request.guestInfo,
          checkInAt: request.checkInAt,
          plannedCheckOut: request.plannedCheckOut,
          status: 'ACTIVE',
          specialRequests: request.specialRequests,
          notes: request.notes
        },
        include: {
          reservation: true,
          room: true,
          customer: true
        }
      });
      
      // 3. 初期請求作成
      await tx.sessionBilling.create({
        data: {
          tenantId: session.tenantId,
          sessionId: session.id,
          billingNumber: `SB-${sessionNumber}`,
          roomCharges: [],
          serviceCharges: [],
          taxes: [],
          discounts: [],
          subtotalAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          paidAmount: 0,
          status: 'PENDING'
        }
      });
      
      // 4. 部屋状態更新
      await tx.room.update({
        where: { id: request.roomId },
        data: { status: 'OCCUPIED' }
      });
      
      // 5. イベント発行
      await publishEvent('session.created', {
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        roomId: session.roomId,
        customerId: session.customerId,
        checkInAt: session.checkInAt.toISOString(),
        guestInfo: session.guestInfo
      });
      
      return session;
    });
    
  } catch (error) {
    await logError(transactionId, 'SESSION_CREATION_FAILED', error);
    throw new SessionCreationError(
      `Failed to create session: ${error.message}`,
      { transactionId, originalError: error }
    );
  }
}
```

---

## 🧪 **テスト戦略**

### **単体テスト**
```typescript
describe('Session Management', () => {
  describe('Session Creation', () => {
    test('should create session with valid data', async () => {
      const request: CreateSessionRequest = {
        tenantId: 'tenant-123',
        reservationId: 'res-456',
        roomId: 'room-789',
        customerId: 'cust-101',
        guestInfo: mockGuestInfo,
        checkInAt: new Date(),
        plannedCheckOut: addDays(new Date(), 2)
      };
      
      const session = await createSession(request);
      
      expect(session).toBeDefined();
      expect(session.sessionNumber).toMatch(/^R\d+-\d{8}-\d{3}$/);
      expect(session.status).toBe('ACTIVE');
    });
    
    test('should handle duplicate session number', async () => {
      // 重複セッション番号のテスト
      const request = createMockRequest();
      
      await createSession(request);
      
      await expect(createSession(request))
        .rejects.toThrow('Session number already exists');
    });
  });
  
  describe('Data Migration', () => {
    test('should migrate existing orders to sessions', async () => {
      const orders = await createMockOrders();
      const session = await createMockSession();
      
      await migrateOrdersToSession(orders[0].roomId, session.id);
      
      const migratedOrders = await getOrdersBySession(session.id);
      expect(migratedOrders).toHaveLength(orders.length);
    });
  });
});
```

### **統合テスト**
```typescript
describe('System Integration', () => {
  test('should handle complete checkin flow', async () => {
    // 1. セッション作成
    const session = await createSession(mockRequest);
    
    // 2. サービス注文
    const order = await createServiceOrder(session.id, mockOrderData);
    
    // 3. 請求更新確認
    const billing = await getSessionBilling(session.id);
    expect(billing.serviceCharges).toHaveLength(1);
    
    // 4. チェックアウト
    const finalBilling = await checkoutSession(session.id, mockCheckoutData);
    expect(finalBilling.status).toBe('PAID');
  });
});
```

---

## 📊 **監視・品質保証**

### **リアルタイム監視**
```yaml
監視項目:
  - セッション作成成功率: > 99.9%
  - API応答時間: < 200ms
  - データベース接続数: < 80%
  - メモリ使用量: < 80%
  - エラー発生率: < 0.1%

アラート設定:
  - 成功率 < 99%: 即座アラート
  - 応答時間 > 500ms: 警告
  - エラー率 > 0.1%: 緊急アラート
```

### **品質チェックリスト**
```yaml
技術品質:
  - [ ] 全API動作確認
  - [ ] データ整合性100%
  - [ ] 性能基準クリア
  - [ ] セキュリティ基準クリア

業務品質:
  - [ ] チェックイン処理正常動作
  - [ ] 注文処理正常動作
  - [ ] 請求処理正常動作
  - [ ] 会員処理正常動作
```

---

## 🎯 **成功指標**

### **Week 1完了基準**
- [ ] データベーススキーマ実装完了
- [ ] 基本API実装完了
- [ ] データ移行スクリプト動作確認
- [ ] 基本機能テスト合格

### **Week 2完了基準**
- [ ] 全システム統合完了
- [ ] 統合テスト合格
- [ ] 性能基準クリア
- [ ] セキュリティテスト合格

### **Week 3完了基準**
- [ ] 本番環境デプロイ完了
- [ ] 全機能正常動作確認
- [ ] 運用監視開始
- [ ] プロジェクト完了

---

**即時移行により、3週間で確実にチェックインセッション管理システムを導入し、システムの信頼性と効率性を大幅に向上させます！**

---

**作成者**: hotel-kanri統合管理システム  
**承認者**: システム統括責任者  
**配布先**: hotel-commonチーム、全関係者




