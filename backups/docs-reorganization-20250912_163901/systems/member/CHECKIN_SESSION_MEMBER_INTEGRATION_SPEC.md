# 🌸 hotel-member チェックインセッション会員統合仕様書

**対象システム**: hotel-member  
**担当AI**: Sakura（桜 - Cherry Blossom）  
**作成日**: 2025年1月19日  
**優先度**: 🔴 **緊急・高優先度**  
**実装期限**: 2025年2月1日

---

## 📋 **統合概要**

hotel-memberシステムにチェックインセッション管理機能を統合し、会員情報管理、ポイント管理、会員特典をセッション単位で正確に適用できるシステムを実現します。

### **Sakura（桜）エージェントとしての責務**
- **顧客第一**: 会員様の体験向上を最優先
- **おもてなし精神**: 細やかな配慮とパーソナライズ
- **成長志向**: 会員価値の継続的向上

---

## 🎯 **統合目標**

### **解決すべき問題**
1. **ポイント付与の曖昧性**: 予約単位のポイント管理による不正確性
2. **会員特典の適用漏れ**: セッション期間中の特典適用の不備
3. **会員履歴の分散**: 複数の宿泊セッションにまたがる履歴管理の複雑性

### **達成すべき効果**
1. **正確なポイント管理**: セッション単位での精密なポイント計算・付与
2. **適切な特典適用**: セッション期間中の会員特典の確実な適用
3. **統合された会員体験**: セッション横断での一貫した会員サービス

---

## 🔄 **会員システム統合設計**

### **1. セッション単位ポイント管理**

#### **従来のポイント付与フロー**
```
1. billing.paidイベント受信
2. 予約単位でのポイント計算
3. 会員ランクに基づく倍率適用
4. ポイント付与・履歴記録
```

#### **新しいポイント付与フロー**
```
1. 🆕 session.checked_outイベント受信
2. 🆕 セッション単位でのポイント計算
3. 🆕 セッション期間中の特典適用確認
4. 会員ランクに基づく倍率適用
5. 🆕 セッション単位ポイント付与・履歴記録
6. 🆕 session.points_awardedイベント発行
```

#### **セッションポイント計算ロジック**
```typescript
interface SessionPointCalculation {
  sessionId: string;
  customerId: string;
  membershipId: string;
  
  // セッション詳細
  sessionDuration: number; // 宿泊日数
  roomCharges: number;     // 宿泊料金
  serviceCharges: number;  // サービス料金
  totalAmount: number;     // 総額
  
  // 会員情報
  membershipRank: MembershipRank;
  currentPoints: number;
  
  // 特典・キャンペーン
  applicablePromotions: Promotion[];
  seasonalBonuses: SeasonalBonus[];
}

async function calculateSessionPoints(
  calculation: SessionPointCalculation
): Promise<{
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  appliedPromotions: string[];
  nextRankThreshold?: number;
}> {
  // 1. 基本ポイント計算（宿泊料金ベース）
  const baseRoomPoints = Math.floor(
    calculation.roomCharges * calculation.membershipRank.pointMultiplier / 100
  );
  
  // 2. サービス利用ポイント計算
  const baseServicePoints = Math.floor(
    calculation.serviceCharges * calculation.membershipRank.servicePointMultiplier / 100
  );
  
  const basePoints = baseRoomPoints + baseServicePoints;
  
  // 3. 宿泊日数ボーナス
  const durationBonus = calculation.sessionDuration >= 3 
    ? Math.floor(basePoints * 0.1) // 3泊以上で10%ボーナス
    : 0;
  
  // 4. 季節・キャンペーンボーナス
  let campaignBonus = 0;
  const appliedPromotions: string[] = [];
  
  for (const promotion of calculation.applicablePromotions) {
    if (isPromotionApplicable(promotion, calculation)) {
      campaignBonus += calculatePromotionBonus(promotion, basePoints);
      appliedPromotions.push(promotion.name);
    }
  }
  
  // 5. 会員ランクボーナス
  const rankBonus = calculation.membershipRank.level >= 3 
    ? Math.floor(basePoints * 0.05) // ゴールド以上で5%ボーナス
    : 0;
  
  const bonusPoints = durationBonus + campaignBonus + rankBonus;
  const totalPoints = basePoints + bonusPoints;
  
  // 6. 次のランクまでの必要ポイント計算
  const nextRankThreshold = calculateNextRankThreshold(
    calculation.membershipId,
    calculation.currentPoints + totalPoints
  );
  
  return {
    basePoints,
    bonusPoints,
    totalPoints,
    appliedPromotions,
    nextRankThreshold
  };
}
```

### **2. セッション会員特典管理**

#### **セッション期間中の特典適用**
```typescript
interface SessionMemberBenefits {
  sessionId: string;
  membershipId: string;
  membershipRank: MembershipRank;
  
  // 適用可能特典
  availableBenefits: MemberBenefit[];
  appliedBenefits: AppliedBenefit[];
  
  // 特典適用履歴
  benefitHistory: BenefitApplication[];
}

interface MemberBenefit {
  id: string;
  name: string;
  type: BenefitType; // 'room_upgrade' | 'late_checkout' | 'service_discount' | 'amenity'
  description: string;
  conditions: BenefitCondition[];
  value: BenefitValue;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number; // 利用回数制限
  rankRequirement: number; // 必要ランクレベル
}

interface AppliedBenefit {
  benefitId: string;
  sessionId: string;
  appliedAt: Date;
  appliedBy: string; // 'system' | 'staff' | 'member'
  value: number; // 適用された値（割引額、アップグレード価値等）
  status: 'active' | 'used' | 'expired';
}

async function applySessionBenefits(
  sessionId: string,
  membershipId: string
): Promise<SessionMemberBenefits> {
  // 1. セッション情報取得
  const session = await sessionApi.getSession(sessionId);
  const membership = await getMembership(membershipId);
  
  // 2. 適用可能特典の判定
  const availableBenefits = await getAvailableBenefits(
    membership.rankId,
    session.checkInAt,
    session.plannedCheckOut
  );
  
  // 3. 自動適用特典の処理
  const autoAppliedBenefits: AppliedBenefit[] = [];
  
  for (const benefit of availableBenefits) {
    if (benefit.autoApply && isBenefitApplicable(benefit, session, membership)) {
      const applied = await applyBenefit(sessionId, benefit);
      autoAppliedBenefits.push(applied);
      
      // 特典適用イベント発行
      await eventPublisher.publish('member.benefit_applied', {
        sessionId,
        membershipId,
        benefitId: benefit.id,
        benefitName: benefit.name,
        value: applied.value,
        appliedAt: applied.appliedAt.toISOString()
      });
    }
  }
  
  return {
    sessionId,
    membershipId,
    membershipRank: membership.rank,
    availableBenefits,
    appliedBenefits: autoAppliedBenefits,
    benefitHistory: []
  };
}
```

#### **特典種別と適用ロジック**

##### **部屋アップグレード特典**
```typescript
async function applyRoomUpgradeBenefit(
  sessionId: string,
  benefit: MemberBenefit
): Promise<AppliedBenefit> {
  const session = await sessionApi.getSession(sessionId);
  const availableUpgrades = await roomApi.getAvailableUpgrades(
    session.roomId,
    session.checkInAt,
    session.plannedCheckOut
  );
  
  if (availableUpgrades.length > 0) {
    const upgrade = availableUpgrades[0]; // 最良のアップグレード選択
    
    // 部屋変更処理
    await sessionApi.updateSession(sessionId, {
      roomId: upgrade.roomId,
      notes: `会員特典による部屋アップグレード: ${upgrade.roomType} → ${upgrade.upgradedRoomType}`
    });
    
    // 請求調整（アップグレード料金の免除）
    await sessionBillingApi.addDiscount(sessionId, {
      type: 'member_benefit',
      name: benefit.name,
      amount: upgrade.additionalCost,
      appliedTo: 'room'
    });
    
    return {
      benefitId: benefit.id,
      sessionId,
      appliedAt: new Date(),
      appliedBy: 'system',
      value: upgrade.additionalCost,
      status: 'active'
    };
  }
  
  throw new Error('No available room upgrades');
}
```

##### **レイトチェックアウト特典**
```typescript
async function applyLateCheckoutBenefit(
  sessionId: string,
  benefit: MemberBenefit
): Promise<AppliedBenefit> {
  const session = await sessionApi.getSession(sessionId);
  const extendedCheckout = new Date(session.plannedCheckOut);
  extendedCheckout.setHours(extendedCheckout.getHours() + benefit.value.hours);
  
  // セッション更新
  await sessionApi.updateSession(sessionId, {
    plannedCheckOut: extendedCheckout,
    notes: `会員特典によるレイトチェックアウト: ${benefit.value.hours}時間延長`
  });
  
  return {
    benefitId: benefit.id,
    sessionId,
    appliedAt: new Date(),
    appliedBy: 'system',
    value: benefit.value.hours,
    status: 'active'
  };
}
```

##### **サービス割引特典**
```typescript
async function applyServiceDiscountBenefit(
  sessionId: string,
  benefit: MemberBenefit,
  serviceOrderId: string
): Promise<AppliedBenefit> {
  const order = await serviceOrderApi.getOrder(serviceOrderId);
  const discountAmount = Math.floor(order.amount * benefit.value.discountRate);
  
  // セッション請求に割引追加
  await sessionBillingApi.addDiscount(sessionId, {
    type: 'member_benefit',
    name: benefit.name,
    amount: discountAmount,
    appliedTo: 'service',
    relatedOrderId: serviceOrderId
  });
  
  return {
    benefitId: benefit.id,
    sessionId,
    appliedAt: new Date(),
    appliedBy: 'system',
    value: discountAmount,
    status: 'used'
  };
}
```

### **3. セッション会員履歴管理**

#### **統合会員履歴モデル**
```typescript
interface MemberSessionHistory {
  id: string;
  membershipId: string;
  sessionId: string;
  sessionNumber: string;
  
  // セッション基本情報
  roomNumber: string;
  roomType: string;
  checkInAt: Date;
  checkOutAt: Date;
  duration: number;
  
  // 利用詳細
  totalAmount: number;
  roomCharges: number;
  serviceCharges: number;
  discounts: number;
  
  // ポイント情報
  pointsEarned: number;
  pointsUsed: number;
  pointBalance: number;
  
  // 特典適用
  appliedBenefits: AppliedBenefit[];
  benefitValue: number;
  
  // 評価・フィードバック
  rating?: number;
  feedback?: string;
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
}

async function createSessionHistory(
  sessionId: string
): Promise<MemberSessionHistory> {
  const session = await sessionApi.getSessionWithDetails(sessionId);
  const membership = await getMembershipByCustomerId(session.customerId);
  
  if (!membership) {
    throw new Error('No membership found for customer');
  }
  
  const sessionBilling = session.billings[0];
  const appliedBenefits = await getSessionBenefits(sessionId);
  const pointsData = await getSessionPoints(sessionId);
  
  const history: MemberSessionHistory = {
    id: generateId(),
    membershipId: membership.id,
    sessionId: session.id,
    sessionNumber: session.sessionNumber,
    
    roomNumber: session.room.roomNumber,
    roomType: session.room.roomType.name,
    checkInAt: session.checkInAt,
    checkOutAt: session.checkOutAt!,
    duration: calculateSessionDuration(session),
    
    totalAmount: sessionBilling.totalAmount,
    roomCharges: sessionBilling.roomCharges.reduce((sum, charge) => sum + charge.amount, 0),
    serviceCharges: sessionBilling.serviceCharges.reduce((sum, charge) => sum + charge.amount, 0),
    discounts: sessionBilling.discounts.reduce((sum, discount) => sum + discount.amount, 0),
    
    pointsEarned: pointsData.earned,
    pointsUsed: pointsData.used,
    pointBalance: pointsData.balance,
    
    appliedBenefits,
    benefitValue: appliedBenefits.reduce((sum, benefit) => sum + benefit.value, 0),
    
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await memberHistoryRepository.save(history);
  
  // 会員統計更新
  await updateMembershipStats(membership.id, history);
  
  return history;
}
```

---

## 🗄️ **データベース統合**

### **1. 会員関連テーブル拡張**

#### **membershipsテーブル拡張**
```sql
-- セッション関連統計カラム追加
ALTER TABLE memberships 
ADD COLUMN total_sessions INTEGER DEFAULT 0,
ADD COLUMN total_nights INTEGER DEFAULT 0,
ADD COLUMN total_spent DECIMAL(10,2) DEFAULT 0,
ADD COLUMN average_session_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN last_session_id UUID REFERENCES checkin_sessions(id),
ADD COLUMN last_session_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN preferred_room_type VARCHAR(50),
ADD COLUMN preferred_services JSONB DEFAULT '[]';

-- インデックス追加
CREATE INDEX idx_memberships_last_session ON memberships(last_session_id);
CREATE INDEX idx_memberships_last_session_date ON memberships(last_session_date);
```

#### **member_session_historyテーブル作成**
```sql
CREATE TABLE member_session_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_id UUID NOT NULL REFERENCES memberships(id),
    session_id UUID NOT NULL REFERENCES checkin_sessions(id),
    session_number VARCHAR(50) NOT NULL,
    
    -- セッション基本情報
    room_number VARCHAR(10) NOT NULL,
    room_type VARCHAR(50) NOT NULL,
    check_in_at TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL, -- 宿泊日数
    
    -- 利用詳細
    total_amount DECIMAL(10,2) NOT NULL,
    room_charges DECIMAL(10,2) NOT NULL,
    service_charges DECIMAL(10,2) NOT NULL,
    discounts DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- ポイント情報
    points_earned INTEGER NOT NULL DEFAULT 0,
    points_used INTEGER NOT NULL DEFAULT 0,
    point_balance INTEGER NOT NULL,
    
    -- 特典適用
    applied_benefits JSONB DEFAULT '[]',
    benefit_value DECIMAL(10,2) DEFAULT 0,
    
    -- 評価・フィードバック
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 制約
    UNIQUE(membership_id, session_id),
    INDEX(membership_id),
    INDEX(session_id),
    INDEX(check_in_at),
    INDEX(total_amount)
);
```

#### **member_session_benefitsテーブル作成**
```sql
CREATE TABLE member_session_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES checkin_sessions(id),
    membership_id UUID NOT NULL REFERENCES memberships(id),
    benefit_id UUID NOT NULL REFERENCES member_benefits(id),
    
    -- 適用詳細
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    applied_by VARCHAR(20) NOT NULL, -- 'system', 'staff', 'member'
    value DECIMAL(10,2) NOT NULL, -- 適用された値
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'used', 'expired'
    
    -- メタデータ
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 制約
    INDEX(session_id),
    INDEX(membership_id),
    INDEX(benefit_id),
    INDEX(applied_at)
);
```

### **2. ビュー作成**

#### **会員セッション統合ビュー**
```sql
CREATE VIEW member_session_overview AS
SELECT 
    msh.id as history_id,
    msh.session_number,
    msh.check_in_at,
    msh.check_out_at,
    msh.duration,
    msh.total_amount,
    msh.points_earned,
    
    -- 会員情報
    m.id as membership_id,
    c.first_name,
    c.last_name,
    c.email,
    mr.name as membership_rank,
    mr.level as rank_level,
    
    -- セッション情報
    cs.status as session_status,
    r.room_number,
    rt.name as room_type,
    
    -- 特典情報
    (SELECT COUNT(*) FROM member_session_benefits msb WHERE msb.session_id = msh.session_id) as benefit_count,
    msh.benefit_value,
    
    -- 評価情報
    msh.rating,
    msh.feedback

FROM member_session_history msh
LEFT JOIN memberships m ON msh.membership_id = m.id
LEFT JOIN customers c ON m.customer_id = c.id
LEFT JOIN membership_ranks mr ON m.rank_id = mr.id
LEFT JOIN checkin_sessions cs ON msh.session_id = cs.id
LEFT JOIN rooms r ON cs.room_id = r.id
LEFT JOIN room_types rt ON r.room_type_id = rt.id;
```

---

## 🔧 **API統合**

### **1. Member API拡張**

```typescript
// /api/members/* エンドポイント群の拡張

interface MemberApiExtension {
  // セッション会員情報取得
  'GET /api/members/session/:sessionId': {
    response: {
      membership: Membership;
      availableBenefits: MemberBenefit[];
      appliedBenefits: AppliedBenefit[];
      pointsPreview: {
        estimatedEarning: number;
        currentBalance: number;
        nextRankThreshold?: number;
      };
    };
  };
  
  // セッション特典適用
  'POST /api/members/session/:sessionId/benefits': {
    body: {
      benefitId: string;
      notes?: string;
    };
    response: AppliedBenefit;
  };
  
  // セッション履歴取得
  'GET /api/members/:membershipId/sessions': {
    query: {
      limit?: number;
      offset?: number;
      dateFrom?: string;
      dateTo?: string;
    };
    response: MemberSessionHistory[];
  };
  
  // セッションポイント計算
  'POST /api/members/session/:sessionId/calculate-points': {
    response: {
      basePoints: number;
      bonusPoints: number;
      totalPoints: number;
      appliedPromotions: string[];
      breakdown: PointCalculationBreakdown;
    };
  };
  
  // 会員統計取得
  'GET /api/members/:membershipId/stats': {
    query: {
      period?: 'month' | 'quarter' | 'year';
    };
    response: MembershipStats;
  };
}
```

### **2. イベント処理拡張**

```typescript
// セッション関連イベントハンドラー
class SessionMemberEventHandler {
  // セッション作成時の会員処理
  async handleSessionCreated(event: SessionCreatedEvent) {
    const { sessionId, customerId } = event.data;
    
    // 1. 会員情報確認
    const membership = await getMembershipByCustomerId(customerId);
    if (!membership) return; // 非会員の場合はスキップ
    
    // 2. セッション特典の自動適用
    await applySessionBenefits(sessionId, membership.id);
    
    // 3. 会員セッション開始イベント発行
    await eventPublisher.publish('member.session_started', {
      sessionId,
      membershipId: membership.id,
      rankLevel: membership.rank.level,
      availableBenefits: await getAvailableBenefits(membership.rankId)
    });
  }
  
  // セッションチェックアウト時の会員処理
  async handleSessionCheckedOut(event: SessionCheckedOutEvent) {
    const { sessionId, totalAmount } = event.data;
    
    const session = await sessionApi.getSession(sessionId);
    const membership = await getMembershipByCustomerId(session.customerId);
    if (!membership) return;
    
    // 1. ポイント計算・付与
    const pointsResult = await calculateAndAwardSessionPoints(sessionId, membership.id);
    
    // 2. セッション履歴作成
    const history = await createSessionHistory(sessionId);
    
    // 3. 会員統計更新
    await updateMembershipStats(membership.id, history);
    
    // 4. ランク評価
    await evaluateMembershipRank(membership.id);
    
    // 5. 会員セッション完了イベント発行
    await eventPublisher.publish('member.session_completed', {
      sessionId,
      membershipId: membership.id,
      pointsEarned: pointsResult.totalPoints,
      totalSpent: totalAmount,
      newRank: await getCurrentRank(membership.id)
    });
  }
  
  // サービス注文時の会員処理
  async handleServiceOrdered(event: ServiceOrderedEvent) {
    const { sessionId, serviceId, amount } = event.data;
    
    const session = await sessionApi.getSession(sessionId);
    const membership = await getMembershipByCustomerId(session.customerId);
    if (!membership) return;
    
    // 1. サービス割引特典の確認・適用
    const serviceBenefits = await getApplicableServiceBenefits(
      membership.id,
      serviceId
    );
    
    for (const benefit of serviceBenefits) {
      await applyServiceDiscountBenefit(sessionId, benefit, event.data.orderId);
    }
    
    // 2. サービス利用履歴更新
    await updateServiceUsageHistory(membership.id, serviceId, amount);
  }
}
```

---

## 📊 **会員分析機能統合**

### **1. セッション単位会員分析**

```typescript
interface MemberSessionAnalytics {
  // 会員セッション分析
  analyzeSessionPatterns(membershipId: string): Promise<{
    averageSessionValue: number;
    averageStayDuration: number;
    preferredRoomTypes: Array<{ type: string; frequency: number }>;
    preferredServices: Array<{ service: string; frequency: number }>;
    seasonalPatterns: Array<{ month: number; sessions: number; value: number }>;
    loyaltyTrend: Array<{ period: string; sessions: number; growth: number }>;
  }>;
  
  // 会員価値分析
  calculateMemberValue(membershipId: string): Promise<{
    lifetimeValue: number;
    averageSessionValue: number;
    pointsEarnedTotal: number;
    benefitsReceivedValue: number;
    predictedFutureValue: number;
    valueSegment: 'high' | 'medium' | 'low';
  }>;
  
  // 会員満足度分析
  analyzeMemberSatisfaction(membershipId: string): Promise<{
    averageRating: number;
    ratingTrend: Array<{ period: string; rating: number }>;
    feedbackSentiment: 'positive' | 'neutral' | 'negative';
    issueCategories: Array<{ category: string; frequency: number }>;
    improvementSuggestions: string[];
  }>;
}
```

### **2. 会員レコメンデーション**

```typescript
interface MemberRecommendationService {
  // セッション中のレコメンデーション
  getSessionRecommendations(sessionId: string): Promise<{
    services: Array<{
      serviceId: string;
      serviceName: string;
      reason: string;
      confidence: number;
      estimatedValue: number;
    }>;
    upgrades: Array<{
      upgradeType: string;
      description: string;
      additionalCost: number;
      memberDiscount?: number;
    }>;
    experiences: Array<{
      experienceId: string;
      title: string;
      description: string;
      personalizedReason: string;
    }>;
  }>;
  
  // 次回滞在レコメンデーション
  getNextStayRecommendations(membershipId: string): Promise<{
    recommendedDates: Array<{
      checkIn: Date;
      checkOut: Date;
      reason: string;
      specialOffers?: string[];
    }>;
    recommendedRooms: Array<{
      roomType: string;
      reason: string;
      memberBenefits: string[];
    }>;
    personalizedOffers: Array<{
      offerId: string;
      title: string;
      description: string;
      validUntil: Date;
      value: number;
    }>;
  }>;
}
```

---

## 🧪 **テスト戦略**

### **1. 会員統合テスト**

```typescript
describe('Member Session Integration', () => {
  test('should apply member benefits on session creation', async () => {
    const session = await createTestSession({
      customerId: 'premium-member-123',
      roomId: 'standard-room-456'
    });
    
    const benefits = await getSessionBenefits(session.id);
    expect(benefits).toContainEqual(
      expect.objectContaining({
        type: 'room_upgrade',
        status: 'active'
      })
    );
  });
  
  test('should calculate points correctly for session', async () => {
    const sessionId = 'test-session-123';
    const membershipId = 'gold-member-456';
    
    const pointsResult = await calculateSessionPoints({
      sessionId,
      membershipId,
      totalAmount: 50000,
      sessionDuration: 2
    });
    
    expect(pointsResult.totalPoints).toBeGreaterThan(0);
    expect(pointsResult.bonusPoints).toBeGreaterThan(0);
  });
  
  test('should create session history on checkout', async () => {
    const sessionId = 'test-session-789';
    
    await processSessionCheckout(sessionId);
    
    const history = await getSessionHistory(sessionId);
    expect(history).toBeDefined();
    expect(history.pointsEarned).toBeGreaterThan(0);
  });
});
```

---

## 📅 **実装スケジュール**

### **Week 1 (1/20-1/26)**
- [ ] データベーススキーマ拡張
- [ ] セッションポイント計算ロジック実装
- [ ] 基本イベントハンドラー実装

### **Week 2 (1/27-2/2)**
- [ ] 会員特典適用システム実装
- [ ] セッション履歴管理実装
- [ ] API拡張実装

### **Week 3 (2/3-2/9)**
- [ ] 会員分析機能実装
- [ ] レコメンデーション機能実装
- [ ] テスト実装・実行

---

## 🎯 **成功指標**

### **技術指標**
- [ ] ポイント計算精度: 100%
- [ ] 特典適用成功率: 99.9%以上
- [ ] 会員データ整合性: エラー0件

### **業務指標**
- [ ] 会員満足度: 10%向上
- [ ] 特典利用率: 30%向上
- [ ] 会員継続率: 15%向上

---

**Sakura（桜）として、おもてなしの心を持って会員様一人ひとりに最適化されたサービスを提供し、継続的な価値向上を実現します。**

---

**作成者**: Sakura（桜 - Cherry Blossom）  
**承認者**: hotel-memberチーム責任者  
**配布先**: hotel-memberチーム、関連システムチーム




