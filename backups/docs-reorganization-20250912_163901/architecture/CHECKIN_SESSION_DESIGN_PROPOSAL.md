# 🏨 チェックインセッション管理システム 設計提案書

**作成日**: 2025年1月19日  
**対象システム**: hotel-common, hotel-pms, hotel-saas, hotel-member  
**優先度**: 🔴 **緊急・高優先度**

## 📋 **エグゼクティブサマリー**

現在のシステムにおいて、**同一部屋の異なる宿泊期間における注文・請求の混在問題**が発生しています。この問題を根本的に解決するため、ホテル業界標準の**チェックインセッション管理方式**を導入します。

### **解決される重大な問題**
- ❌ **注文混在リスク**: 前回宿泊者の注文が現在の宿泊者に表示される
- ❌ **会計エラー**: 異なる宿泊者の料金が合算される可能性
- ❌ **プライバシー漏洩**: 他の宿泊者の注文履歴が見える

### **期待される効果**
- ✅ **完全な注文分離**: 宿泊セッションごとの独立管理
- ✅ **正確な会計処理**: セッション単位での精密な料金計算
- ✅ **プライバシー保護**: セッション間の完全分離
- ✅ **運用効率向上**: 明確な識別システムによる業務効率化

---

## 🔍 **現状分析**

### **現在のデータ構造の問題点**

#### **1. 予約モデルの限界**
```prisma
model Reservation {
  id                String             @id @default(uuid())
  tenantId          String
  reservationNumber String
  customerId        String
  roomId            String
  checkInDate       DateTime
  checkOutDate      DateTime
  status            ReservationStatus  @default(CONFIRMED)
  // ...
}
```

**問題**: 予約と実際の宿泊セッションが1:1対応していない

#### **2. サービス注文の曖昧な帰属**
```prisma
model ServiceOrder {
  id                String             @id @default(uuid())
  serviceId         String
  roomId            String?            // ← 部屋番号のみで管理
  customerId        String?
  quantity          Int                @default(1)
  // ...
}
```

**問題**: 同じ部屋の異なる宿泊期間を区別できない

#### **3. 請求処理の混在リスク**
```prisma
model Billing {
  id                String             @id @default(uuid())
  tenantId          String
  reservationId     String             // ← 予約ベースの請求
  billingNumber     String
  totalAmount       Decimal
  // ...
}
```

**問題**: 予約単位の請求では、実際の宿泊セッションと乖離する

---

## 🎯 **新設計: チェックインセッション管理**

### **コア概念**

**チェックインセッション** = 実際のチェックインからチェックアウトまでの宿泊期間を独立管理する単位

### **1. チェックインセッションモデル**

```prisma
// 新規追加: チェックインセッション
model CheckinSession {
  id                String             @id @default(uuid())
  tenantId          String
  sessionNumber     String             // R104-20250119-001 形式
  reservationId     String             // 予約との紐付け
  roomId            String
  customerId        String
  
  // ゲスト情報（チェックイン時点での情報を保持）
  guestInfo         Json               // 主宿泊者＋同伴者情報
  adults            Int                @default(1)
  children          Int                @default(0)
  
  // セッション期間
  checkInAt         DateTime           // 実際のチェックイン時刻
  checkOutAt        DateTime?          // 実際のチェックアウト時刻
  plannedCheckOut   DateTime           // 予定チェックアウト時刻
  
  // セッション状態
  status            SessionStatus      @default(ACTIVE)
  
  // 特別情報
  specialRequests   String?
  notes             String?
  
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  // リレーション
  tenant            Tenant             @relation(fields: [tenantId], references: [id])
  reservation       Reservation        @relation(fields: [reservationId], references: [id])
  room              Room               @relation(fields: [roomId], references: [id])
  customer          Customer           @relation(fields: [customerId], references: [id])
  serviceOrders     ServiceOrder[]
  billings          SessionBilling[]
  
  @@unique([tenantId, sessionNumber])
  @@index([tenantId])
  @@index([roomId])
  @@index([customerId])
  @@index([checkInAt, checkOutAt])
  @@map("checkin_sessions")
}

enum SessionStatus {
  ACTIVE      // チェックイン済み・滞在中
  CHECKED_OUT // チェックアウト済み
  EXTENDED    // 延泊中
  CANCELED    // キャンセル（チェックイン前）
}
```

### **2. セッション番号体系**

**形式**: `{部屋番号}-{チェックイン日}-{連番}`

**例**:
- `R104-20250119-001` - 104号室、2025年1月19日、1回目のセッション
- `R104-20250119-002` - 104号室、2025年1月19日、2回目のセッション（同日の別予約）
- `R205-20250120-001` - 205号室、2025年1月20日、1回目のセッション

### **3. サービス注文の改良**

```prisma
model ServiceOrder {
  id                String             @id @default(uuid())
  sessionId         String             // セッションとの紐付け
  serviceId         String
  quantity          Int                @default(1)
  status            OrderStatus        @default(PENDING)
  requestedAt       DateTime           @default(now())
  completedAt       DateTime?
  amount            Decimal
  notes             String?
  
  // リレーション
  session           CheckinSession     @relation(fields: [sessionId], references: [id])
  service           Service            @relation(fields: [serviceId], references: [id])
  
  @@index([sessionId])
  @@index([serviceId])
  @@map("service_orders")
}
```

### **4. セッション単位の請求管理**

```prisma
model SessionBilling {
  id                String             @id @default(uuid())
  tenantId          String
  sessionId         String             // セッションとの紐付け
  billingNumber     String
  
  // 請求項目
  roomCharges       Json               // 宿泊料金詳細
  serviceCharges    Json               // サービス料金詳細
  taxes             Json               // 税金詳細
  discounts         Json               // 割引詳細
  
  // 金額
  subtotalAmount    Decimal            // 小計
  taxAmount         Decimal            // 税額
  totalAmount       Decimal            // 合計
  paidAmount        Decimal            @default(0)
  
  // 支払い情報
  status            BillingStatus      @default(PENDING)
  paymentMethod     PaymentMethod?
  paymentDate       DateTime?
  dueDate           DateTime?
  
  notes             String?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  // リレーション
  tenant            Tenant             @relation(fields: [tenantId], references: [id])
  session           CheckinSession     @relation(fields: [sessionId], references: [id])
  
  @@unique([tenantId, billingNumber])
  @@index([tenantId])
  @@index([sessionId])
  @@map("session_billings")
}
```

---

## 🔄 **システム間連携の改良**

### **1. イベント駆動アーキテクチャの拡張**

#### **新規イベント**
```typescript
// チェックインセッション関連イベント
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
}
```

### **2. API設計の改良**

#### **hotel-common API**
```typescript
// セッション管理API
interface SessionAPI {
  // セッション作成（チェックイン時）
  createSession(data: CreateSessionRequest): Promise<CheckinSession>;
  
  // セッション情報取得
  getSession(sessionId: string): Promise<CheckinSession>;
  getSessionByNumber(sessionNumber: string): Promise<CheckinSession>;
  getActiveSessionByRoom(roomId: string): Promise<CheckinSession | null>;
  
  // セッション更新
  updateSession(sessionId: string, data: UpdateSessionRequest): Promise<CheckinSession>;
  
  // チェックアウト処理
  checkoutSession(sessionId: string, data: CheckoutRequest): Promise<SessionBilling>;
  
  // セッション検索
  searchSessions(criteria: SessionSearchCriteria): Promise<CheckinSession[]>;
}
```

#### **hotel-saas API拡張**
```typescript
// セッション対応のサービス注文API
interface ServiceOrderAPI {
  // セッション単位でのサービス注文
  createOrder(sessionId: string, data: CreateOrderRequest): Promise<ServiceOrder>;
  
  // セッションの注文履歴取得
  getSessionOrders(sessionId: string): Promise<ServiceOrder[]>;
  
  // アクティブセッションの注文取得（部屋番号から）
  getActiveRoomOrders(roomNumber: string): Promise<ServiceOrder[]>;
}
```

---

## 📊 **データ移行戦略**

### **Phase 1: 基盤構築**
1. **データベーススキーマ拡張**
   - CheckinSessionテーブル追加
   - SessionBillingテーブル追加
   - 既存テーブルへのリレーション追加

2. **API実装**
   - セッション管理API実装
   - 既存APIとの並行運用

### **Phase 2: 段階移行**
1. **新規チェックインからセッション方式適用**
   - 2025年2月1日以降の新規チェックインはセッション管理
   - 既存の滞在中ゲストは従来方式継続

2. **フロントエンド対応**
   - hotel-saasでのセッション対応実装
   - 部屋番号 → セッション番号への切り替え

### **Phase 3: 完全移行**
1. **既存データの移行**
   - 過去の予約データからセッションデータ生成
   - 注文履歴のセッション紐付け

2. **旧システム廃止**
   - 従来の部屋番号ベース管理廃止
   - セッション管理への完全移行

---

## 🎯 **実装優先度**

### **🔴 緊急（1-2週間）**
1. **hotel-common**: セッション管理API実装
2. **hotel-pms**: チェックイン/アウト処理のセッション対応
3. **hotel-saas**: セッション番号による注文管理

### **🟡 高優先度（3-4週間）**
1. **hotel-member**: セッション単位のポイント管理
2. **請求システム**: セッション単位の請求処理
3. **レポート機能**: セッション単位の分析

### **🟢 中優先度（1-2ヶ月）**
1. **履歴管理**: 過去セッションの完全移行
2. **分析機能**: セッション単位の詳細分析
3. **最適化**: パフォーマンス改善

---

## 📈 **期待される効果**

### **データ整合性の向上**
- **100%の注文分離**: セッション単位での完全独立管理
- **正確な会計処理**: セッション単位での精密な料金計算
- **履歴の明確化**: 過去の宿泊との完全分離

### **運用効率の改善**
- **明確な識別**: `R104-20250119-001`形式での直感的識別
- **業務効率化**: フロントスタッフの作業効率向上
- **エラー削減**: 人的ミスの大幅削減

### **顧客体験の向上**
- **プライバシー保護**: 他の宿泊者情報の完全分離
- **正確な請求**: 自分の利用分のみの明確な請求
- **サービス品質**: 個別対応の質向上

### **システム拡張性**
- **連泊対応**: 同一セッションでの複数日管理
- **グループ予約**: 複数部屋の関連セッション管理
- **将来機能**: AIコンシェルジュとの連携強化

---

## ⚠️ **リスクと対策**

### **実装リスク**
- **リスク**: 既存システムへの影響
- **対策**: 段階的移行と並行運用期間の設定

### **データ移行リスク**
- **リスク**: 既存データの整合性
- **対策**: 詳細な移行計画とロールバック体制

### **運用リスク**
- **リスク**: スタッフの新システム習得
- **対策**: 段階的導入とトレーニング実施

---

## 📅 **実装スケジュール**

| フェーズ | 期間 | 主要タスク | 担当システム |
|---------|------|-----------|-------------|
| Phase 1 | 1-2週間 | 基盤構築・API実装 | hotel-common |
| Phase 2 | 2-3週間 | フロントエンド対応 | hotel-saas, hotel-pms |
| Phase 3 | 3-4週間 | 段階移行・テスト | 全システム |
| Phase 4 | 4-6週間 | 完全移行・最適化 | 全システム |

---

## 🎉 **結論**

チェックインセッション管理システムの導入により、**ホテル業界標準の宿泊管理**が実現され、システムの信頼性と顧客満足度が大幅に向上します。

**即座の実装開始**を強く推奨いたします。

---

**次のステップ**: 各システムチームへの実装依頼書配布と技術仕様の詳細調整

**作成者**: hotel-kanri統合管理システム  
**承認者**: 各システムチーム責任者  
**配布先**: hotel-common, hotel-pms, hotel-saas, hotel-member チーム




