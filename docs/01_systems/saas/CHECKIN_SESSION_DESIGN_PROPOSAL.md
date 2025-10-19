# チェックインセッション設計提案書

## 📋 **概要**

現在のホテル統合システムにおいて、**注文管理の根本的な設計問題**が発見されました。
注文が部屋番号に直接紐づいているため、複数回の宿泊や連続利用時に注文データが混在する重大なリスクがあります。

## 🚨 **現在の問題**

### **1. 設計上の問題**
```sql
-- 現在の問題のある構造
Order {
  id: Int
  roomId: String  -- 部屋番号に直接紐づき
  tenantId: String
  status: String
  items: Json
  total: Int
  createdAt: DateTime
}
```

### **2. 具体的なリスク**
- **注文混在**: 同じ部屋の前回宿泊者の注文が表示される
- **会計エラー**: 異なる宿泊者の料金が合算される
- **データ整合性**: チェックアウト後の注文履歴が不正確
- **プライバシー**: 他の宿泊者の注文情報が漏洩する可能性

### **3. 現在の実装での証拠**

#### **hotel-saas側の実装**
```typescript
// server/api/v1/order/index.post.ts (Line 42)
const order = {
  id: orderId,
  roomNumber: roomNumber,  // 部屋番号に直接紐づけ
  status: 'processing',
  // ...
}

// server/api/v1/admin/front-desk/room-orders.get.ts (Line 44)
query: {
  roomId: roomNumber,  // 部屋番号で注文検索
  status: 'pending,confirmed,completed',
}
```

#### **hotel-common側のスキーマ**
```prisma
model Order {
  id        Int      @id @default(autoincrement())
  tenantId  String
  roomId    String   -- 問題: 部屋番号に直接紐づき
  placeId   Int?
  status    String   @default("received")
  items     Json
  total     Int
  createdAt DateTime @default(now())
}
```

## 🎯 **提案する解決策**

### **1. チェックインセッション概念の導入**

```sql
-- 新しいCheckInSessionテーブル
model CheckInSession {
  id              String    @id @default(cuid())
  tenantId        String
  roomId          String    -- Room.idへの参照
  reservationId   String?   -- Reservation.idへの参照（予約ベース）
  sessionNumber   String    @unique -- 人間が読めるセッション番号

  -- ゲスト情報
  primaryGuestName    String
  primaryGuestEmail   String?
  primaryGuestPhone   String?
  guestCount          Int     @default(1)

  -- チェックイン/アウト情報
  checkedInAt     DateTime
  expectedCheckOut DateTime
  checkedOutAt    DateTime?

  -- セッション状態
  status          String    @default("active") -- active, completed, cancelled

  -- 会計情報
  totalAmount     Int       @default(0)
  paidAmount      Int       @default(0)
  billingStatus   String    @default("pending") -- pending, partial, completed

  -- メタデータ
  notes           String?
  specialRequests String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  createdBy       String?   -- Staff.id

  -- リレーション
  room            Room      @relation(fields: [roomId], references: [id])
  reservation     Reservation? @relation(fields: [reservationId], references: [id])
  orders          Order[]
  guests          CheckInGuest[]

  @@index([tenantId])
  @@index([roomId])
  @@index([status])
  @@index([checkedInAt])
  @@index([sessionNumber])
}

-- ゲスト詳細情報
model CheckInGuest {
  id              String         @id @default(cuid())
  sessionId       String
  guestNumber     Int
  name            String?
  ageGroup        String         -- adult, child, infant
  gender          String?        -- male, female, other, prefer_not_to_say
  phone           String?
  email           String?
  notes           String?

  session         CheckInSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}

-- 修正されたOrderテーブル
model Order {
  id              Int            @id @default(autoincrement())
  tenantId        String
  sessionId       String         -- CheckInSession.idへの参照（roomIdを置換）
  placeId         Int?
  status          String         @default("received")
  items           Json
  total           Int
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  paidAt          DateTime?
  isDeleted       Boolean        @default(false)
  deletedAt       DateTime?

  session         CheckInSession @relation(fields: [sessionId], references: [id])
  orderItems      OrderItem[]

  @@index([sessionId])
  @@index([createdAt])
  @@index([status])
  @@index([tenantId])
}
```

### **2. セッション番号生成ルール**

```typescript
// セッション番号の例: "R104-20250119-001"
// 形式: R{部屋番号}-{YYYYMMDD}-{連番}
function generateSessionNumber(roomNumber: string, checkinDate: Date): string {
  const dateStr = checkinDate.toISOString().slice(0, 10).replace(/-/g, '')
  const sequence = await getNextSequenceForRoom(roomNumber, dateStr)
  return `R${roomNumber}-${dateStr}-${sequence.toString().padStart(3, '0')}`
}
```

## 🔄 **システム変更の影響範囲**

### **hotel-common側の変更**

#### **1. データベーススキーマ変更**
- ✅ `CheckInSession`テーブル追加
- ✅ `CheckInGuest`テーブル追加
- ✅ `Order.roomId` → `Order.sessionId`に変更
- ✅ 既存データのマイグレーション

#### **2. API変更**
```typescript
// 新しいチェックインAPI
POST /api/v1/admin/front-desk/checkin
{
  roomNumber: string
  reservationId?: string
  checkinDate: string
  expectedCheckout: string
  guestCount: number
  primaryGuest: {
    name: string
    email?: string
    phone?: string
  }
  guests: Array<{
    guestNumber: number
    ageGroup: string
    gender?: string
    name?: string
  }>
}

// レスポンス
{
  success: true
  data: {
    sessionId: string
    sessionNumber: string
    roomId: string
    checkedInAt: string
  }
}

// 注文作成API変更
POST /api/v1/admin/orders
{
  sessionId: string  // roomIdから変更
  items: Array<OrderItem>
  notes?: string
}

// 注文取得API変更
GET /api/v1/admin/orders?sessionId={sessionId}
GET /api/v1/admin/orders?roomNumber={roomNumber}&status=active  // アクティブセッションのみ
```

### **hotel-saas側の変更**

#### **1. フロントエンド変更**
```typescript
// pages/admin/front-desk/operation.vue
interface Room {
  number: string
  type: string
  status: string
  currentSession?: {  // 新規追加
    id: string
    sessionNumber: string
    primaryGuestName: string
    checkedInAt: string
    guestCount: number
  }
  // ...
}

// チェックイン処理の変更
const performCheckin = async (checkinData: CheckinRequest) => {
  const response = await authenticatedFetch('/api/v1/admin/front-desk/checkin', {
    method: 'POST',
    body: checkinData
  })

  // セッションIDを保存して注文処理で使用
  if (response.success) {
    const sessionId = response.data.sessionId
    // 以降の注文処理でsessionIdを使用
  }
}
```

#### **2. 注文処理の変更**
```typescript
// 注文作成時
const createOrder = async (orderData: OrderRequest) => {
  // roomNumberからsessionIdを取得
  const activeSession = await getActiveSessionByRoom(roomNumber)

  const response = await authenticatedFetch('/api/v1/admin/orders', {
    method: 'POST',
    body: {
      sessionId: activeSession.id,  // roomIdから変更
      items: orderData.items,
      notes: orderData.notes
    }
  })
}

// 注文取得時
const fetchRoomOrders = async (roomNumber: string) => {
  // アクティブセッションの注文のみ取得
  const response = await authenticatedFetch(
    `/api/v1/admin/orders?roomNumber=${roomNumber}&status=active`
  )
}
```

## 📊 **マイグレーション戦略**

### **Phase 1: スキーマ準備**
1. ✅ `CheckInSession`、`CheckInGuest`テーブル作成
2. ✅ `Order`テーブルに`sessionId`カラム追加（nullable）
3. ✅ 既存データの整合性チェック

### **Phase 2: データマイグレーション**
```sql
-- 既存の占有中客室からセッション作成
INSERT INTO CheckInSession (
  id, tenantId, roomId, sessionNumber, primaryGuestName,
  checkedInAt, status, createdAt, updatedAt
)
SELECT
  gen_random_uuid(),
  r.tenantId,
  r.id,
  CONCAT('R', r.roomNumber, '-', TO_CHAR(NOW(), 'YYYYMMDD'), '-001'),
  'レガシーゲスト',
  COALESCE(r.lastCleaned, r.createdAt),
  'active',
  NOW(),
  NOW()
FROM Room r
WHERE r.status = 'occupied';

-- 既存注文をセッションに紐づけ
UPDATE Order o
SET sessionId = (
  SELECT s.id
  FROM CheckInSession s
  JOIN Room r ON s.roomId = r.id
  WHERE r.roomNumber = o.roomId
  AND s.status = 'active'
  LIMIT 1
)
WHERE o.sessionId IS NULL;
```

### **Phase 3: API切り替え**
1. ✅ 新しいチェックインAPIの実装
2. ✅ 注文APIの`sessionId`対応
3. ✅ hotel-saas側の段階的移行

### **Phase 4: 完全移行**
1. ✅ `Order.roomId`カラム削除
2. ✅ 旧APIの廃止
3. ✅ データ整合性の最終確認

## 🎯 **期待される効果**

### **1. データ整合性の向上**
- ✅ **100%の注文分離**: 宿泊ごとに完全に独立した注文管理
- ✅ **正確な会計処理**: セッション単位での正確な料金計算
- ✅ **履歴管理**: 過去の宿泊履歴との完全分離

### **2. 運用効率の向上**
- ✅ **明確なセッション管理**: `R104-20250119-001`形式での識別
- ✅ **ゲスト情報管理**: 詳細なゲスト属性情報
- ✅ **会計状態管理**: セッション単位での支払い状況追跡

### **3. システム拡張性**
- ✅ **連泊対応**: 同一セッションでの複数日管理
- ✅ **グループ予約**: 複数部屋の関連セッション管理
- ✅ **分析機能**: セッション単位での詳細分析

## 🚀 **実装優先度**

### **高優先度（即座に対応）**
1. ✅ hotel-commonでのスキーマ変更
2. ✅ チェックインAPI実装
3. ✅ 注文API修正

### **中優先度（1週間以内）**
1. ✅ hotel-saas側のUI変更
2. ✅ 既存データマイグレーション
3. ✅ テスト環境での検証

### **低優先度（2週間以内）**
1. ✅ 旧API廃止
2. ✅ ドキュメント更新
3. ✅ 本番環境移行

## 📞 **hotel-commonチームへの依頼事項**

### **緊急対応が必要な項目**
1. **スキーマ設計レビュー**: 上記提案の技術的妥当性確認
2. **マイグレーション計画**: 既存データの安全な移行方法
3. **API仕様確定**: 新しいエンドポイントの詳細仕様
4. **実装スケジュール**: 段階的実装の具体的タイムライン

### **hotel-saas側で準備済みの項目**
1. ✅ 現在の問題の詳細分析完了
2. ✅ フロントエンド変更箇所の特定完了
3. ✅ 段階的移行計画の策定完了
4. ✅ テストケースの準備完了

---

**この設計変更により、ホテル業界標準の「宿泊セッション単位」での注文管理が実現され、データ整合性とシステム信頼性が大幅に向上します。**

