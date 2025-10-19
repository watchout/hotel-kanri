# 🌙 hotel-pms チェックインセッション統合仕様書

**対象システム**: hotel-pms  
**担当AI**: Luna（月読 - Tsukuyomi）  
**作成日**: 2025年1月19日  
**優先度**: 🔴 **緊急・高優先度**  
**実装期限**: 2025年2月1日

---

## 📋 **統合概要**

hotel-pmsシステムにチェックインセッション管理機能を統合し、予約管理からフロント業務、請求処理まで一貫したセッション単位の管理を実現します。

### **Luna（月読）エージェントとしての責務**
- **冷静沈着**: 24時間無停止運用を維持しながらの段階的統合
- **確実遂行**: データ整合性を保証した確実な実装
- **効率重視**: フロント業務の効率化を最優先

---

## 🎯 **統合目標**

### **解決すべき問題**
1. **予約とセッションの乖離**: 予約情報と実際の宿泊セッションの不一致
2. **フロント業務の非効率**: 部屋番号ベースの曖昧な管理
3. **請求処理の複雑性**: 複数の宿泊期間にまたがる請求の混在

### **達成すべき効果**
1. **正確なセッション管理**: チェックイン時の自動セッション作成
2. **効率的なフロント業務**: セッション番号による明確な識別
3. **精密な請求処理**: セッション単位での正確な料金計算

---

## 🔄 **システム統合設計**

### **1. チェックインフロー改良**

#### **従来のフロー**
```
1. 予約情報の検索・確認
2. 顧客情報の確認・更新
3. 部屋割り当て・鍵発行
4. チェックイン処理実行
5. checkin_checkout.checked_inイベント発行
```

#### **新しいフロー**
```
1. 予約情報の検索・確認
2. 顧客情報の確認・更新
3. 部屋割り当て・鍵発行
4. 🆕 チェックインセッション作成
5. チェックイン処理実行
6. 🆕 session.createdイベント発行
7. checkin_checkout.checked_inイベント発行（互換性維持）
```

#### **セッション作成処理**
```typescript
interface CheckinProcessRequest {
  reservationId: string;
  roomId: string;
  customerId: string;
  guestInfo: GuestInfo;
  actualCheckInTime: Date;
  specialRequests?: string;
  frontDeskNotes?: string;
}

async function processCheckin(request: CheckinProcessRequest): Promise<{
  session: CheckinSession;
  billing: SessionBilling;
}> {
  // 1. セッション番号生成
  const sessionNumber = generateSessionNumber(
    request.roomId, 
    request.actualCheckInTime
  );
  
  // 2. セッション作成
  const session = await sessionApi.createSession({
    reservationId: request.reservationId,
    roomId: request.roomId,
    customerId: request.customerId,
    guestInfo: request.guestInfo,
    checkInAt: request.actualCheckInTime,
    plannedCheckOut: reservation.checkOutDate,
    specialRequests: request.specialRequests,
    notes: request.frontDeskNotes
  });
  
  // 3. 初期請求作成
  const billing = await createInitialBilling(session);
  
  // 4. 部屋状態更新
  await updateRoomStatus(request.roomId, 'OCCUPIED');
  
  // 5. イベント発行
  await eventPublisher.publish('session.created', {
    sessionId: session.id,
    sessionNumber: session.sessionNumber,
    roomId: request.roomId,
    customerId: request.customerId,
    checkInAt: request.actualCheckInTime.toISOString(),
    guestInfo: request.guestInfo
  });
  
  return { session, billing };
}
```

### **2. チェックアウトフロー改良**

#### **従来のフロー**
```
1. 宿泊料金・追加料金の計算
2. 請求書作成
3. 決済処理
4. チェックアウト処理実行
5. checkin_checkout.checked_outイベント発行
6. billing.paidイベント発行
```

#### **新しいフロー**
```
1. 🆕 セッション請求の最終計算
2. 🆕 サービス注文の最終確認
3. 決済処理
4. 🆕 セッションチェックアウト処理
5. チェックアウト処理実行
6. 🆕 session.checked_outイベント発行
7. checkin_checkout.checked_outイベント発行（互換性維持）
8. billing.paidイベント発行
```

#### **セッションチェックアウト処理**
```typescript
interface CheckoutProcessRequest {
  sessionId: string;
  actualCheckOutTime: Date;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  frontDeskNotes?: string;
}

async function processCheckout(request: CheckoutProcessRequest): Promise<{
  session: CheckinSession;
  finalBilling: SessionBilling;
}> {
  // 1. セッション情報取得
  const session = await sessionApi.getSession(request.sessionId);
  
  // 2. 最終請求計算
  const finalBilling = await calculateFinalBilling(session.id);
  
  // 3. 支払い処理
  await processFinalPayment(finalBilling.id, {
    paymentMethod: request.paymentMethod,
    paidAmount: request.paidAmount
  });
  
  // 4. セッションチェックアウト
  const checkedOutSession = await sessionApi.checkoutSession(request.sessionId, {
    checkOutAt: request.actualCheckOutTime,
    finalBilling: {
      paymentMethod: request.paymentMethod,
      paidAmount: request.paidAmount,
      notes: request.frontDeskNotes
    }
  });
  
  // 5. 部屋状態更新
  await updateRoomStatus(session.roomId, 'CLEANING');
  
  // 6. イベント発行
  await eventPublisher.publish('session.checked_out', {
    sessionId: session.id,
    sessionNumber: session.sessionNumber,
    checkOutAt: request.actualCheckOutTime.toISOString(),
    totalAmount: finalBilling.totalAmount,
    finalBilling
  });
  
  return { session: checkedOutSession, finalBilling };
}
```

### **3. サービス注文連携**

#### **サービス注文イベント処理**
```typescript
// service.orderedイベントの処理改良
async function handleServiceOrdered(event: ServiceOrderedEvent) {
  try {
    // 1. 部屋番号からアクティブセッション取得
    const session = await sessionApi.getActiveSessionByRoom(event.data.roomId);
    
    if (!session) {
      throw new Error(`No active session found for room ${event.data.roomId}`);
    }
    
    // 2. セッション請求に追加
    await sessionBillingApi.addServiceCharge(session.id, {
      orderId: event.data.orderId,
      serviceId: event.data.serviceId,
      serviceName: event.data.serviceName,
      quantity: event.data.quantity,
      unitPrice: event.data.unitPrice,
      amount: event.data.amount,
      orderedAt: new Date(event.data.orderedAt)
    });
    
    // 3. セッション請求更新イベント発行
    await eventPublisher.publish('session.billing_updated', {
      sessionId: session.id,
      billingId: session.billings[0].id,
      totalAmount: updatedBilling.totalAmount,
      paidAmount: updatedBilling.paidAmount,
      status: updatedBilling.status
    });
    
  } catch (error) {
    console.error('Failed to process service order:', error);
    // エラーハンドリング・リトライ処理
  }
}
```

---

## 🗄️ **データベース統合**

### **1. 既存テーブルの拡張**

#### **reservationsテーブル**
```sql
-- セッション関連カラム追加
ALTER TABLE reservations 
ADD COLUMN active_session_id UUID REFERENCES checkin_sessions(id),
ADD COLUMN session_count INTEGER DEFAULT 0; -- 同一予約での複数セッション対応

-- インデックス追加
CREATE INDEX idx_reservations_active_session ON reservations(active_session_id);
```

#### **billingsテーブル**
```sql
-- セッション請求との関連付け
ALTER TABLE billings 
ADD COLUMN session_billing_id UUID REFERENCES session_billings(id);

-- 段階移行のため、既存のreservation_idは保持
CREATE INDEX idx_billings_session_billing ON billings(session_billing_id);
```

### **2. ビュー作成**

#### **セッション統合ビュー**
```sql
CREATE VIEW session_overview AS
SELECT 
  cs.id as session_id,
  cs.session_number,
  cs.status as session_status,
  cs.check_in_at,
  cs.check_out_at,
  cs.planned_check_out,
  
  -- 予約情報
  r.reservation_number,
  r.status as reservation_status,
  r.origin as reservation_origin,
  
  -- 部屋情報
  rm.room_number,
  rt.name as room_type,
  rg.name as room_grade,
  
  -- 顧客情報
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.member_id,
  
  -- 請求情報
  sb.billing_number as session_billing_number,
  sb.total_amount,
  sb.paid_amount,
  sb.status as billing_status,
  
  -- 注文情報
  (SELECT COUNT(*) FROM service_orders so WHERE so.session_id = cs.id) as order_count,
  (SELECT SUM(so.amount) FROM service_orders so WHERE so.session_id = cs.id) as service_total

FROM checkin_sessions cs
LEFT JOIN reservations r ON cs.reservation_id = r.id
LEFT JOIN rooms rm ON cs.room_id = rm.id
LEFT JOIN room_types rt ON rm.room_type_id = rt.id
LEFT JOIN room_grades rg ON rm.room_grade_id = rg.id
LEFT JOIN customers c ON cs.customer_id = c.id
LEFT JOIN session_billings sb ON sb.session_id = cs.id;
```

---

## 🖥️ **フロントエンド統合**

### **1. チェックイン画面の改良**

#### **セッション情報表示コンポーネント**
```vue
<template>
  <div class="session-info-card">
    <div class="session-header">
      <h3>セッション情報</h3>
      <span class="session-number">{{ sessionNumber }}</span>
    </div>
    
    <div class="session-details">
      <div class="detail-row">
        <label>部屋番号:</label>
        <span>{{ roomNumber }}</span>
      </div>
      <div class="detail-row">
        <label>チェックイン:</label>
        <span>{{ formatDateTime(checkInAt) }}</span>
      </div>
      <div class="detail-row">
        <label>予定チェックアウト:</label>
        <span>{{ formatDateTime(plannedCheckOut) }}</span>
      </div>
      <div class="detail-row">
        <label>宿泊者:</label>
        <span>{{ guestInfo.primaryGuest.firstName }} {{ guestInfo.primaryGuest.lastName }}</span>
      </div>
      <div class="detail-row" v-if="guestInfo.additionalGuests.length > 0">
        <label>同伴者:</label>
        <span>{{ guestInfo.additionalGuests.length }}名</span>
      </div>
    </div>
    
    <div class="session-status">
      <span :class="['status-badge', statusClass]">
        {{ statusText }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CheckinSession } from '~/types/checkin-session'

interface Props {
  session: CheckinSession
}

const props = defineProps<Props>()

const sessionNumber = computed(() => props.session.sessionNumber)
const roomNumber = computed(() => props.session.room?.roomNumber || 'N/A')
const checkInAt = computed(() => props.session.checkInAt)
const plannedCheckOut = computed(() => props.session.plannedCheckOut)
const guestInfo = computed(() => props.session.guestInfo)

const statusClass = computed(() => {
  switch (props.session.status) {
    case 'ACTIVE': return 'status-active'
    case 'EXTENDED': return 'status-extended'
    case 'CHECKED_OUT': return 'status-checked-out'
    case 'CANCELED': return 'status-canceled'
    default: return 'status-unknown'
  }
})

const statusText = computed(() => {
  switch (props.session.status) {
    case 'ACTIVE': return '滞在中'
    case 'EXTENDED': return '延泊中'
    case 'CHECKED_OUT': return 'チェックアウト済み'
    case 'CANCELED': return 'キャンセル'
    default: return '不明'
  }
})

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}
</script>
```

#### **チェックイン処理コンポーネント**
```vue
<template>
  <div class="checkin-process">
    <form @submit.prevent="processCheckin">
      <div class="form-section">
        <h3>ゲスト情報確認</h3>
        <GuestInfoForm v-model="guestInfo" />
      </div>
      
      <div class="form-section">
        <h3>チェックイン詳細</h3>
        <div class="form-row">
          <label>実際のチェックイン時刻:</label>
          <input 
            type="datetime-local" 
            v-model="actualCheckInTime"
            required
          />
        </div>
        <div class="form-row">
          <label>特別リクエスト:</label>
          <textarea v-model="specialRequests" rows="3"></textarea>
        </div>
        <div class="form-row">
          <label>フロントデスクメモ:</label>
          <textarea v-model="frontDeskNotes" rows="2"></textarea>
        </div>
      </div>
      
      <div class="form-actions">
        <button type="button" @click="cancel">キャンセル</button>
        <button type="submit" :disabled="processing">
          {{ processing ? '処理中...' : 'チェックイン実行' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { Reservation, GuestInfo } from '~/types/checkin-session'

interface Props {
  reservation: Reservation
}

const props = defineProps<Props>()
const emit = defineEmits<{
  success: [session: CheckinSession]
  cancel: []
}>()

const { processCheckin: apiProcessCheckin } = usePmsApi()

const processing = ref(false)
const actualCheckInTime = ref(new Date().toISOString().slice(0, 16))
const specialRequests = ref(props.reservation.specialRequests || '')
const frontDeskNotes = ref('')

const guestInfo = ref<GuestInfo>({
  primaryGuest: {
    firstName: props.reservation.customer?.firstName || '',
    lastName: props.reservation.customer?.lastName || '',
    email: props.reservation.customer?.email || '',
    phone: props.reservation.customer?.phone || ''
  },
  additionalGuests: [],
  specialNeeds: [],
  preferences: {}
})

const processCheckin = async () => {
  processing.value = true
  
  try {
    const result = await apiProcessCheckin({
      reservationId: props.reservation.id,
      roomId: props.reservation.roomId,
      customerId: props.reservation.customerId,
      guestInfo: guestInfo.value,
      actualCheckInTime: new Date(actualCheckInTime.value),
      specialRequests: specialRequests.value,
      frontDeskNotes: frontDeskNotes.value
    })
    
    emit('success', result.session)
  } catch (error) {
    console.error('Checkin failed:', error)
    // エラーハンドリング
  } finally {
    processing.value = false
  }
}

const cancel = () => {
  emit('cancel')
}
</script>
```

### **2. セッション管理画面**

#### **アクティブセッション一覧**
```vue
<template>
  <div class="active-sessions">
    <div class="sessions-header">
      <h2>アクティブセッション</h2>
      <div class="sessions-stats">
        <span>総セッション数: {{ sessions.length }}</span>
        <span>チェックアウト予定: {{ todayCheckouts }}</span>
      </div>
    </div>
    
    <div class="sessions-grid">
      <div 
        v-for="session in sessions" 
        :key="session.id"
        class="session-card"
        @click="selectSession(session)"
      >
        <div class="session-card-header">
          <span class="session-number">{{ session.sessionNumber }}</span>
          <span :class="['session-status', session.status.toLowerCase()]">
            {{ getStatusText(session.status) }}
          </span>
        </div>
        
        <div class="session-card-body">
          <div class="guest-info">
            <strong>{{ session.guestInfo.primaryGuest.firstName }} {{ session.guestInfo.primaryGuest.lastName }}</strong>
            <span v-if="session.guestInfo.additionalGuests.length > 0">
              +{{ session.guestInfo.additionalGuests.length }}名
            </span>
          </div>
          
          <div class="room-info">
            部屋: {{ session.room?.roomNumber }}
          </div>
          
          <div class="timing-info">
            <div>チェックイン: {{ formatDate(session.checkInAt) }}</div>
            <div>予定チェックアウト: {{ formatDate(session.plannedCheckOut) }}</div>
          </div>
          
          <div class="billing-info" v-if="session.billings?.[0]">
            <span>請求額: ¥{{ session.billings[0].totalAmount.toLocaleString() }}</span>
            <span>支払済: ¥{{ session.billings[0].paidAmount.toLocaleString() }}</span>
          </div>
        </div>
        
        <div class="session-card-actions">
          <button @click.stop="viewOrders(session)">注文履歴</button>
          <button @click.stop="viewBilling(session)">請求詳細</button>
          <button 
            v-if="canCheckout(session)"
            @click.stop="initiateCheckout(session)"
            class="checkout-btn"
          >
            チェックアウト
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CheckinSession } from '~/types/checkin-session'

const { searchSessions } = useSessionApi()

const sessions = ref<CheckinSession[]>([])
const loading = ref(false)

const todayCheckouts = computed(() => {
  const today = new Date().toDateString()
  return sessions.value.filter(s => 
    new Date(s.plannedCheckOut).toDateString() === today
  ).length
})

const loadActiveSessions = async () => {
  loading.value = true
  try {
    sessions.value = await searchSessions({
      status: 'ACTIVE',
      limit: 100
    })
  } catch (error) {
    console.error('Failed to load sessions:', error)
  } finally {
    loading.value = false
  }
}

const getStatusText = (status: string) => {
  const statusMap = {
    'ACTIVE': '滞在中',
    'EXTENDED': '延泊中',
    'CHECKED_OUT': 'チェックアウト済み',
    'CANCELED': 'キャンセル'
  }
  return statusMap[status] || status
}

const canCheckout = (session: CheckinSession) => {
  return session.status === 'ACTIVE' || session.status === 'EXTENDED'
}

const selectSession = (session: CheckinSession) => {
  // セッション詳細画面へ遷移
  navigateTo(`/sessions/${session.id}`)
}

const viewOrders = (session: CheckinSession) => {
  // 注文履歴画面へ遷移
  navigateTo(`/sessions/${session.id}/orders`)
}

const viewBilling = (session: CheckinSession) => {
  // 請求詳細画面へ遷移
  navigateTo(`/sessions/${session.id}/billing`)
}

const initiateCheckout = (session: CheckinSession) => {
  // チェックアウト処理画面へ遷移
  navigateTo(`/sessions/${session.id}/checkout`)
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

onMounted(() => {
  loadActiveSessions()
})

// 定期的な更新
const refreshInterval = setInterval(loadActiveSessions, 30000) // 30秒ごと

onUnmounted(() => {
  clearInterval(refreshInterval)
})
</script>
```

---

## 🔧 **API統合**

### **1. PMS API拡張**

```typescript
// /api/pms/* エンドポイント群の拡張

interface PmsApiExtension {
  // チェックイン処理
  'POST /api/pms/checkin': {
    body: CheckinProcessRequest;
    response: {
      session: CheckinSession;
      billing: SessionBilling;
    };
  };
  
  // チェックアウト処理
  'POST /api/pms/checkout': {
    body: CheckoutProcessRequest;
    response: {
      session: CheckinSession;
      finalBilling: SessionBilling;
    };
  };
  
  // セッション延泊処理
  'POST /api/pms/sessions/:sessionId/extend': {
    body: {
      newCheckOutDate: Date;
      additionalNights: number;
      notes?: string;
    };
    response: CheckinSession;
  };
  
  // 部屋状況取得（セッション情報含む）
  'GET /api/pms/rooms/status': {
    query: {
      floor?: number;
      roomType?: string;
      date?: string;
    };
    response: Array<{
      room: Room;
      activeSession?: CheckinSession;
      nextReservation?: Reservation;
      status: RoomStatus;
    }>;
  };
}
```

### **2. GraphQL統合**

```graphql
# セッション管理用GraphQLスキーマ拡張

type CheckinSession {
  id: ID!
  sessionNumber: String!
  reservation: Reservation!
  room: Room!
  customer: Customer!
  guestInfo: GuestInfo!
  checkInAt: DateTime!
  checkOutAt: DateTime
  plannedCheckOut: DateTime!
  status: SessionStatus!
  serviceOrders: [ServiceOrder!]!
  billings: [SessionBilling!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type GuestInfo {
  primaryGuest: PrimaryGuest!
  additionalGuests: [AdditionalGuest!]!
  specialNeeds: [String!]
  preferences: JSON
}

type SessionBilling {
  id: ID!
  sessionNumber: String!
  billingNumber: String!
  roomCharges: [RoomCharge!]!
  serviceCharges: [ServiceCharge!]!
  taxes: [TaxDetail!]!
  discounts: [DiscountDetail!]!
  subtotalAmount: Float!
  taxAmount: Float!
  totalAmount: Float!
  paidAmount: Float!
  status: BillingStatus!
  paymentMethod: PaymentMethod
  paymentDate: DateTime
  dueDate: DateTime
}

extend type Query {
  # セッション取得
  session(id: ID!): CheckinSession
  sessionByNumber(sessionNumber: String!): CheckinSession
  activeSessionByRoom(roomId: ID!): CheckinSession
  
  # セッション検索
  sessions(
    status: SessionStatus
    roomId: ID
    customerId: ID
    checkInDateFrom: DateTime
    checkInDateTo: DateTime
    limit: Int = 50
    offset: Int = 0
  ): [CheckinSession!]!
  
  # セッション統計
  sessionStats(
    dateFrom: DateTime!
    dateTo: DateTime!
  ): SessionStats!
}

extend type Mutation {
  # チェックイン処理
  processCheckin(input: CheckinProcessInput!): CheckinProcessResult!
  
  # チェックアウト処理
  processCheckout(input: CheckoutProcessInput!): CheckoutProcessResult!
  
  # セッション延泊
  extendSession(
    sessionId: ID!
    newCheckOutDate: DateTime!
    additionalNights: Int!
  ): CheckinSession!
  
  # セッション更新
  updateSession(
    sessionId: ID!
    input: UpdateSessionInput!
  ): CheckinSession!
}

extend type Subscription {
  # セッション状態変更
  sessionUpdated(sessionId: ID): CheckinSession!
  
  # 新規セッション作成
  sessionCreated: CheckinSession!
  
  # セッション請求更新
  sessionBillingUpdated(sessionId: ID): SessionBilling!
}
```

---

## 📊 **レポート機能統合**

### **1. セッション単位レポート**

```typescript
interface SessionReportService {
  // 日次セッションレポート
  generateDailySessionReport(date: Date): Promise<{
    totalSessions: number;
    activeSessionsStart: number;
    activeSessionsEnd: number;
    checkins: number;
    checkouts: number;
    extensions: number;
    averageStayDuration: number;
    occupancyRate: number;
    revenue: {
      room: number;
      service: number;
      total: number;
    };
  }>;
  
  // セッション収益分析
  analyzeSessionRevenue(
    dateFrom: Date,
    dateTo: Date
  ): Promise<{
    totalRevenue: number;
    averageRevenuePerSession: number;
    roomRevenue: number;
    serviceRevenue: number;
    revenueByRoomType: Record<string, number>;
    revenueByServiceCategory: Record<string, number>;
  }>;
  
  // セッション期間分析
  analyzeSessionDuration(
    dateFrom: Date,
    dateTo: Date
  ): Promise<{
    averageDuration: number;
    durationDistribution: Record<string, number>;
    extensionRate: number;
    earlyCheckoutRate: number;
  }>;
}
```

---

## 🧪 **テスト戦略**

### **1. 単体テスト**

```typescript
// セッション作成テスト
describe('Session Creation', () => {
  test('should create session with valid data', async () => {
    const request: CheckinProcessRequest = {
      reservationId: 'res-123',
      roomId: 'room-456',
      customerId: 'cust-789',
      guestInfo: mockGuestInfo,
      actualCheckInTime: new Date(),
      specialRequests: 'Late checkout'
    };
    
    const result = await processCheckin(request);
    
    expect(result.session).toBeDefined();
    expect(result.session.sessionNumber).toMatch(/^R\d+-\d{8}-\d{3}$/);
    expect(result.billing).toBeDefined();
  });
  
  test('should handle duplicate session creation', async () => {
    // 重複セッション作成のテスト
  });
});

// セッション請求テスト
describe('Session Billing', () => {
  test('should calculate billing correctly', async () => {
    // 請求計算の正確性テスト
  });
  
  test('should handle service order additions', async () => {
    // サービス注文追加時の請求更新テスト
  });
});
```

### **2. 統合テスト**

```typescript
// システム間連携テスト
describe('System Integration', () => {
  test('should sync with hotel-saas orders', async () => {
    // hotel-saasからの注文イベント処理テスト
  });
  
  test('should sync with hotel-member points', async () => {
    // hotel-memberとのポイント連携テスト
  });
});
```

---

## 📅 **実装スケジュール**

### **Week 1 (1/20-1/26)**
- [ ] データベーススキーマ拡張
- [ ] 基本API実装（セッション作成・取得）
- [ ] イベント処理実装

### **Week 2 (1/27-2/2)**
- [ ] チェックイン・チェックアウト処理統合
- [ ] フロントエンド画面実装
- [ ] GraphQL統合

### **Week 3 (2/3-2/9)**
- [ ] レポート機能統合
- [ ] テスト実装・実行
- [ ] パフォーマンス最適化

---

## 🎯 **成功指標**

### **技術指標**
- [ ] セッション作成成功率: 99.9%以上
- [ ] チェックイン処理時間: < 30秒
- [ ] データ整合性エラー: 0件

### **業務指標**
- [ ] フロント業務効率: 20%向上
- [ ] 請求エラー: 90%削減
- [ ] 顧客満足度: 向上

---

**Luna（月読）として、冷静沈着に確実な実装を遂行し、24時間無停止運用を維持しながらシステムの信頼性向上を実現します。**

---

**作成者**: Luna（月読 - Tsukuyomi）  
**承認者**: hotel-pmsチーム責任者  
**配布先**: hotel-pmsチーム、関連システムチーム




