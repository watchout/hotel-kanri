# 🚨 【緊急実装依頼】チェックインセッション管理システム実装要請書

**宛先**: hotel-commonチーム  
**発信者**: hotel-kanri統合管理システム  
**作成日**: 2025年1月19日  
**優先度**: 🔴 **最高優先度・緊急対応**  
**期限**: 2025年2月1日（2週間以内）

---

## 📢 **緊急実装要請の背景**

現在、システム全体で**重大なデータ整合性問題**が発生しています：

### **🚨 発生中の重大問題**
1. **注文混在エラー**: 同じ部屋の前回宿泊者の注文が現在の宿泊者に表示
2. **会計処理エラー**: 異なる宿泊者の料金が合算される可能性
3. **プライバシー漏洩**: 他の宿泊者の注文履歴が見える状態

### **🎯 解決方法**
**チェックインセッション管理システム**の緊急実装により根本解決

---

## 📋 **hotel-commonチームへの実装依頼内容**

### **1. データベーススキーマ拡張**

#### **A. CheckinSessionテーブル追加**
```sql
-- チェックインセッション管理テーブル
CREATE TABLE checkin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    session_number VARCHAR(50) NOT NULL, -- R104-20250119-001 形式
    reservation_id UUID NOT NULL REFERENCES reservations(id),
    room_id UUID NOT NULL REFERENCES rooms(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    
    -- ゲスト情報（チェックイン時点）
    guest_info JSONB NOT NULL, -- 主宿泊者＋同伴者情報
    adults INTEGER NOT NULL DEFAULT 1,
    children INTEGER NOT NULL DEFAULT 0,
    
    -- セッション期間
    check_in_at TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_at TIMESTAMP WITH TIME ZONE,
    planned_check_out TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- セッション状態
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CHECKED_OUT, EXTENDED, CANCELED
    
    -- 特別情報
    special_requests TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 制約
    UNIQUE(tenant_id, session_number),
    INDEX(tenant_id),
    INDEX(room_id),
    INDEX(customer_id),
    INDEX(check_in_at, check_out_at)
);
```

#### **B. SessionBillingテーブル追加**
```sql
-- セッション単位請求管理テーブル
CREATE TABLE session_billings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    session_id UUID NOT NULL REFERENCES checkin_sessions(id),
    billing_number VARCHAR(50) NOT NULL,
    
    -- 請求項目詳細
    room_charges JSONB NOT NULL DEFAULT '{}', -- 宿泊料金詳細
    service_charges JSONB NOT NULL DEFAULT '{}', -- サービス料金詳細
    taxes JSONB NOT NULL DEFAULT '{}', -- 税金詳細
    discounts JSONB NOT NULL DEFAULT '{}', -- 割引詳細
    
    -- 金額
    subtotal_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- 支払い情報
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PARTIAL, PAID, OVERDUE, CANCELED, REFUNDED
    payment_method VARCHAR(20), -- CASH, CREDIT_CARD, BANK_TRANSFER, POINTS, OTHER
    payment_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 制約
    UNIQUE(tenant_id, billing_number),
    INDEX(tenant_id),
    INDEX(session_id)
);
```

#### **C. ServiceOrderテーブル修正**
```sql
-- 既存のservice_ordersテーブルにsession_id追加
ALTER TABLE service_orders 
ADD COLUMN session_id UUID REFERENCES checkin_sessions(id);

-- 新しいインデックス追加
CREATE INDEX idx_service_orders_session_id ON service_orders(session_id);

-- 既存のroom_id, customer_idは段階移行のため一時的に保持
```

### **2. API実装**

#### **A. セッション管理API**
```typescript
// /api/sessions/* エンドポイント群

interface SessionAPI {
  // セッション作成（チェックイン時）
  'POST /api/sessions': {
    body: CreateSessionRequest;
    response: CheckinSession;
  };
  
  // セッション情報取得
  'GET /api/sessions/:sessionId': {
    response: CheckinSession;
  };
  
  // セッション番号による取得
  'GET /api/sessions/by-number/:sessionNumber': {
    response: CheckinSession;
  };
  
  // 部屋のアクティブセッション取得
  'GET /api/sessions/active-by-room/:roomId': {
    response: CheckinSession | null;
  };
  
  // セッション更新
  'PATCH /api/sessions/:sessionId': {
    body: UpdateSessionRequest;
    response: CheckinSession;
  };
  
  // チェックアウト処理
  'POST /api/sessions/:sessionId/checkout': {
    body: CheckoutRequest;
    response: SessionBilling;
  };
  
  // セッション検索
  'GET /api/sessions/search': {
    query: SessionSearchCriteria;
    response: CheckinSession[];
  };
}
```

#### **B. セッション請求API**
```typescript
// /api/session-billings/* エンドポイント群

interface SessionBillingAPI {
  // セッション請求作成
  'POST /api/session-billings': {
    body: CreateSessionBillingRequest;
    response: SessionBilling;
  };
  
  // セッション請求取得
  'GET /api/session-billings/:billingId': {
    response: SessionBilling;
  };
  
  // セッションの請求一覧
  'GET /api/session-billings/by-session/:sessionId': {
    response: SessionBilling[];
  };
  
  // 請求項目追加（サービス注文時）
  'POST /api/session-billings/:billingId/add-service': {
    body: AddServiceChargeRequest;
    response: SessionBilling;
  };
  
  // 支払い処理
  'POST /api/session-billings/:billingId/payment': {
    body: PaymentRequest;
    response: SessionBilling;
  };
}
```

### **3. イベント拡張**

#### **A. 新規イベント定義**
```typescript
// セッション関連イベント
interface SessionEvents {
  'session.created': {
    sessionId: string;
    sessionNumber: string;
    roomId: string;
    customerId: string;
    checkInAt: string;
    guestInfo: GuestInfo;
  };
  
  'session.checked_out': {
    sessionId: string;
    sessionNumber: string;
    checkOutAt: string;
    totalAmount: number;
    finalBilling: SessionBilling;
  };
  
  'session.extended': {
    sessionId: string;
    newCheckOutDate: string;
    additionalNights: number;
  };
  
  'session.service_ordered': {
    sessionId: string;
    orderId: string;
    serviceId: string;
    amount: number;
    requestedAt: string;
  };
  
  'session.billing_updated': {
    sessionId: string;
    billingId: string;
    totalAmount: number;
    paidAmount: number;
    status: string;
  };
}
```

### **4. TypeScript型定義**

#### **A. セッション関連型**
```typescript
// types/session.ts
export interface CheckinSession {
  id: string;
  tenantId: string;
  sessionNumber: string; // R104-20250119-001
  reservationId: string;
  roomId: string;
  customerId: string;
  
  guestInfo: GuestInfo;
  adults: number;
  children: number;
  
  checkInAt: Date;
  checkOutAt?: Date;
  plannedCheckOut: Date;
  
  status: SessionStatus;
  specialRequests?: string;
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
  
  // リレーション
  reservation?: Reservation;
  room?: Room;
  customer?: Customer;
  serviceOrders?: ServiceOrder[];
  billings?: SessionBilling[];
}

export interface GuestInfo {
  primaryGuest: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  additionalGuests: Array<{
    firstName: string;
    lastName: string;
    age?: number;
    relationship?: string;
  }>;
  specialNeeds?: string[];
  preferences?: Record<string, any>;
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  CHECKED_OUT = 'CHECKED_OUT',
  EXTENDED = 'EXTENDED',
  CANCELED = 'CANCELED'
}

export interface SessionBilling {
  id: string;
  tenantId: string;
  sessionId: string;
  billingNumber: string;
  
  roomCharges: RoomChargeDetail[];
  serviceCharges: ServiceChargeDetail[];
  taxes: TaxDetail[];
  discounts: DiscountDetail[];
  
  subtotalAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  
  status: BillingStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: Date;
  dueDate?: Date;
  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🎯 **実装スケジュール**

### **Week 1 (1/20-1/26)**
- [ ] データベーススキーマ設計・レビュー
- [ ] 基本API実装（CRUD操作）
- [ ] 型定義・インターフェース作成

### **Week 2 (1/27-2/2)**
- [ ] セッション管理ロジック実装
- [ ] イベント発行・購読実装
- [ ] 単体テスト・統合テスト
- [ ] API仕様書作成

### **Week 3 (2/3-2/9) - 統合テスト**
- [ ] hotel-saas, hotel-pmsとの連携テスト
- [ ] パフォーマンステスト
- [ ] セキュリティテスト

---

## 📊 **成功指標**

### **技術指標**
- [ ] セッション作成・取得API応答時間 < 200ms
- [ ] 同時セッション処理能力 > 100セッション/秒
- [ ] データ整合性エラー = 0件

### **業務指標**
- [ ] 注文混在エラー = 0件
- [ ] 会計処理エラー = 0件
- [ ] セッション識別精度 = 100%

---

## 🔧 **技術要件**

### **パフォーマンス要件**
- セッション作成: < 200ms
- セッション検索: < 100ms
- 請求計算: < 500ms

### **可用性要件**
- 稼働率: 99.9%以上
- 障害復旧時間: < 5分

### **セキュリティ要件**
- セッション間データ完全分離
- 個人情報暗号化
- アクセスログ記録

---

## 🤝 **他システムとの連携**

### **hotel-saas側の準備**
- セッション番号による注文管理への切り替え
- 部屋番号 → セッション番号のマッピング
- フロントエンドUIの調整

### **hotel-pms側の準備**
- チェックイン時のセッション作成連携
- チェックアウト時のセッション完了処理
- 請求システムとの統合

### **hotel-member側の準備**
- セッション単位のポイント管理
- 会員特典のセッション適用

---

## 📞 **サポート体制**

### **実装サポート**
- **技術相談**: hotel-kanri統合管理システム
- **仕様確認**: 設計提案書参照
- **緊急対応**: 24時間サポート体制

### **テスト環境**
- **開発環境**: 即座に利用可能
- **ステージング環境**: 統合テスト用
- **本番環境**: 段階的デプロイ

---

## ⚡ **緊急性の強調**

### **なぜ緊急なのか**
1. **顧客影響**: 現在進行形でデータ混在が発生
2. **信頼性**: ホテル運営の根幹に関わる問題
3. **競合優位性**: 業界標準への準拠が急務

### **遅延のリスク**
- 顧客満足度の継続的低下
- データ整合性問題の拡大
- システム信頼性の失墜

---

## 🎉 **実装完了後の効果**

### **即座の効果**
- ✅ 注文混在エラーの完全解消
- ✅ 正確な会計処理の実現
- ✅ プライバシー保護の強化

### **長期的効果**
- ✅ システム拡張性の大幅向上
- ✅ 運用効率の改善
- ✅ 顧客満足度の向上

---

## 📋 **次のアクション**

### **hotel-commonチーム**
1. **即座**: 本依頼書の確認・承認
2. **24時間以内**: 実装計画の策定
3. **48時間以内**: 開発開始

### **他システムチーム**
1. **並行準備**: 各システムの対応準備
2. **連携調整**: API仕様の確認・調整
3. **テスト準備**: 統合テスト環境の準備

---

**この実装により、ホテル業界標準の宿泊セッション管理が実現され、システム全体の信頼性が大幅に向上します。**

**緊急対応をお願いいたします！**

---

**作成者**: hotel-kanri統合管理システム  
**承認者**: システム統括責任者  
**配布先**: hotel-commonチーム、関連システムチーム  
**連絡先**: 緊急時24時間対応窓口




