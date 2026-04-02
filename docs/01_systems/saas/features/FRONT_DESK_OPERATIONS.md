# フロント業務機能 要件定義書

## 📋 概要

### **プロジェクト名**
Hotel SaaS フロント業務機能（MVP版）

### **目的**
ホテルフロントスタッフが行う基本的なチェックイン・会計・チェックアウト業務をデジタル化し、効率的な客室管理を実現する。

### **スコープ**
- チェックイン処理（客室状態管理）
- 会計処理（注文明細・金額表示）
- チェックアウト処理（ルームサービス制限）
- Web領収書・レシート発行

## 🎯 ビジネス要件

### **解決したい課題**
1. **手作業による非効率性**: 紙ベースのチェックイン・アウト管理
2. **会計ミスのリスク**: 手計算による計算間違い
3. **客室状態の不透明性**: 利用可能客室の即座把握困難
4. **ルームサービス制御**: チェックアウト後の誤注文防止

### **達成目標**
1. **業務効率化**: チェックイン・アウト処理時間の50%短縮
2. **ミス削減**: 会計計算の自動化による人的ミス排除
3. **状態管理**: リアルタイム客室状態把握
4. **顧客体験向上**: QRコードによる領収書即時発行

## 📊 機能要件

### **フェーズ1: 基本フロント業務**

#### **F001: 客室状態管理**
**概要**: 客室の利用状態を管理するデータベーステーブルと機能

**データベース設計**:
```prisma
model RoomStatus {
  id          Int      @id @default(autoincrement())
  placeId     Int      @unique           // 既存のPlaceテーブルと関連付け
  status      String   @default("available")  // "available" | "occupied" | "checkout_pending"
  checkinAt   DateTime?                // チェックイン日時
  checkoutAt  DateTime?                // チェックアウト日時
  guestCount  Int?                     // 宿泊人数（将来拡張用）
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  place       Place    @relation(fields: [placeId], references: [id])
  
  @@index([status])
  @@index([placeId])
}

model Receipt {
  id          String   @id @default(uuid())
  placeId     Int                       // Place との関連
  receiptData Json                      // 領収書データ
  totalAmount Int                       // 合計金額
  createdAt   DateTime @default(now())
  isDeleted   Boolean  @default(false)
  place       Place    @relation(fields: [placeId], references: [id])
  
  @@index([placeId])
  @@index([createdAt])
}
```

**状態遷移**:
```
available (利用可能)
    ↓ チェックイン処理
occupied (利用中)
    ↓ 会計処理完了
checkout_pending (精算済み・チェックアウト待ち)
    ↓ チェックアウト処理
available (利用可能)
```

**受入条件**:
- [ ] 客室状態の正確な管理
- [ ] 状態遷移の整合性確保
- [ ] 既存Placeテーブルとの整合性

#### **F002: チェックイン処理**
**概要**: フロントスタッフによる客室チェックイン操作

**UI仕様**:
- 客室番号選択（ドロップダウンまたは検索）
- チェックイン日時（自動入力・手動調整可能）
- チェックイン実行ボタン

**API仕様**:
```typescript
// POST /api/v1/admin/front-desk/checkin
interface CheckinRequest {
  placeId: number;        // 既存のPlace IDを使用
  checkinAt?: string;     // ISO 8601 format, デフォルトは現在時刻
  guestCount?: number;    // 将来拡張用
}

interface CheckinResponse {
  success: boolean;
  roomStatus: {
    placeId: number;
    roomCode: string;     // Place.code (客室番号)
    status: 'occupied';
    checkinAt: string;
  };
  message: string;
}
```

**処理フロー**:
1. 客室の現在状態確認（available でない場合はエラー）
2. RoomStatus レコード作成/更新
3. 状態を `occupied` に変更
4. チェックイン日時記録

**受入条件**:
- [ ] 利用可能客室のみチェックイン可能
- [ ] チェックイン日時の正確な記録
- [ ] エラーハンドリング（重複チェックイン等）

#### **F003: 会計処理機能**
**概要**: 客室のルームサービス利用料金の集計と表示

**会計画面UI**:
```vue
<!-- 会計処理画面 -->
<div class="billing-screen">
  <!-- 客室選択 -->
  <div class="room-selector">
    <select v-model="selectedRoomId">
      <option value="">客室を選択してください</option>
      <option v-for="room in occupiedRooms" :value="room.roomId">
        {{ room.roomId }} ({{ formatDate(room.checkinAt) }})
      </option>
    </select>
  </div>
  
  <!-- 注文明細 -->
  <div v-if="billingData" class="billing-details">
    <h3>ご利用明細</h3>
    <div class="order-list">
      <div v-for="order in billingData.orders" class="order-item">
        <div class="order-header">
          注文日時: {{ formatDateTime(order.createdAt) }}
        </div>
        <div v-for="item in order.items" class="item-row">
          <span>{{ item.name }}</span>
          <span>{{ item.quantity }}点</span>
          <span>¥{{ item.price.toLocaleString() }}</span>
        </div>
      </div>
    </div>
    
    <!-- 合計金額 -->
    <div class="billing-summary">
      <div class="subtotal">小計: ¥{{ billingData.subtotal.toLocaleString() }}</div>
      <div class="tax">消費税: ¥{{ billingData.tax.toLocaleString() }}</div>
      <div class="total">合計: ¥{{ billingData.total.toLocaleString() }}</div>
    </div>
    
    <!-- 会計確定ボタン -->
    <button @click="confirmBilling" class="confirm-billing-btn">
      会計確定
    </button>
  </div>
</div>
```

**API仕様**:
```typescript
// GET /api/v1/admin/front-desk/billing/:roomId
interface BillingResponse {
  roomId: string;
  checkinAt: string;
  orders: Array<{
    id: number;
    createdAt: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    total: number;
  }>;
  subtotal: number;        // 税抜き合計
  tax: number;             // 消費税額
  total: number;           // 税込み合計
  receiptUrl?: string;     // 領収書URL（会計確定後）
}

// POST /api/v1/admin/front-desk/billing/:roomId/confirm
interface BillingConfirmResponse {
  success: boolean;
  receiptId: string;
  receiptUrl: string;      // QRコード表示用URL
  qrCodeUrl: string;       // QRコード画像URL
}
```

**受入条件**:
- [ ] 正確な金額計算（税込み・税抜き）
- [ ] 注文明細の完全な表示
- [ ] 会計確定後の状態変更

#### **F004: Web領収書・レシート機能**
**概要**: QRコードによるWeb領収書の発行システム

**領収書データ構造**:
```typescript
interface Receipt {
  id: string;              // ユニーク ID
  roomId: string;
  issueDate: string;       // 発行日時
  checkinDate: string;     // チェックイン日時
  orders: Array<{
    date: string;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  hotelInfo: {
    name: string;
    address: string;
    phone: string;
    registration: string;   // 登録番号
  };
}
```

**Web領収書ページ**:
```vue
<!-- /receipt/:receiptId -->
<template>
  <div class="receipt-page">
    <div class="receipt-header">
      <h1>ご利用明細書・領収書</h1>
      <div class="hotel-info">
        <h2>{{ receipt.hotelInfo.name }}</h2>
        <p>{{ receipt.hotelInfo.address }}</p>
        <p>TEL: {{ receipt.hotelInfo.phone }}</p>
      </div>
    </div>
    
    <div class="receipt-body">
      <div class="guest-info">
        <p>客室番号: {{ receipt.roomId }}</p>
        <p>チェックイン: {{ formatDate(receipt.checkinDate) }}</p>
        <p>発行日時: {{ formatDateTime(receipt.issueDate) }}</p>
      </div>
      
      <div class="order-details">
        <h3>ご利用明細</h3>
        <table>
          <thead>
            <tr>
              <th>日時</th>
              <th>商品名</th>
              <th>数量</th>
              <th>単価</th>
              <th>金額</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(order, orderIndex) in receipt.orders" :key="orderIndex">
              <td rowspan="order.items.length + 1">{{ formatDate(order.date) }}</td>
            </tr>
            <template v-for="(order, orderIndex) in receipt.orders" :key="orderIndex">
              <tr v-for="item in order.items" :key="item.name">
                <td>{{ item.name }}</td>
                <td>{{ item.quantity }}</td>
                <td>¥{{ item.unitPrice.toLocaleString() }}</td>
                <td>¥{{ item.amount.toLocaleString() }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      
      <div class="receipt-summary">
        <div class="subtotal">小計: ¥{{ receipt.subtotal.toLocaleString() }}</div>
        <div class="tax">消費税(10%): ¥{{ receipt.tax.toLocaleString() }}</div>
        <div class="total">合計: ¥{{ receipt.total.toLocaleString() }}</div>
      </div>
    </div>
    
    <div class="receipt-footer">
      <button @click="downloadPDF" class="download-btn">
        PDF形式でダウンロード
      </button>
      <p class="note">この領収書は正式な領収書として利用いただけます。</p>
    </div>
  </div>
</template>
```

**受入条件**:
- [ ] QRコードからのアクセス
- [ ] PDF ダウンロード機能
- [ ] モバイル対応レスポンシブ

#### **F005: チェックアウト処理**
**概要**: 会計確定後のチェックアウト操作とルームサービス制限

**チェックアウト処理**:
```typescript
// POST /api/v1/admin/front-desk/checkout/:roomId
interface CheckoutRequest {
  roomId: string;
  checkoutAt?: string; // デフォルトは現在時刻
}

interface CheckoutResponse {
  success: boolean;
  roomStatus: {
    roomId: string;
    status: 'available';
    checkoutAt: string;
  };
  message: string;
}
```

**ルームサービス制限機能**:
```typescript
// 注文API側での状態チェック追加
// /api/v1/orders/* での認証時
const roomStatus = await prisma.roomStatus.findUnique({
  where: { roomId: session.user.roomNumber }
});

if (!roomStatus || roomStatus.status !== 'occupied') {
  throw createError({
    statusCode: 403,
    message: 'この客室ではルームサービスをご利用いただけません'
  });
}
```

**受入条件**:
- [ ] 会計確定済み客室のみチェックアウト可能
- [ ] チェックアウト後のルームサービス注文拒否
- [ ] 客室状態の `available` への変更

### **フェーズ2: 拡張機能**

#### **F006: フロントダッシュボード**
**概要**: 客室状況の一覧表示とクイック操作

**ダッシュボード画面**:
```vue
<template>
  <div class="front-desk-dashboard">
    <h1>フロントダッシュボード</h1>
    
    <!-- サマリー情報 -->
    <div class="summary-cards">
      <div class="card">
        <h3>利用可能</h3>
        <span class="count">{{ availableRooms.length }}</span>
      </div>
      <div class="card">
        <h3>利用中</h3>
        <span class="count">{{ occupiedRooms.length }}</span>
      </div>
      <div class="card">
        <h3>精算済み</h3>
        <span class="count">{{ checkoutPendingRooms.length }}</span>
      </div>
    </div>
    
    <!-- 客室一覧 -->
    <div class="room-grid">
      <div 
        v-for="room in allRooms" 
        :key="room.roomId"
        :class="getRoomStatusClass(room.status)"
        class="room-card"
      >
        <div class="room-number">{{ room.roomId }}</div>
        <div class="room-status">{{ getStatusLabel(room.status) }}</div>
        <div v-if="room.checkinAt" class="checkin-time">
          {{ formatTime(room.checkinAt) }}〜
        </div>
        
        <!-- アクション ボタン -->
        <div class="room-actions">
          <button 
            v-if="room.status === 'available'"
            @click="checkin(room.roomId)"
            class="btn-checkin"
          >
            チェックイン
          </button>
          <button 
            v-if="room.status === 'occupied'"
            @click="showBilling(room.roomId)"
            class="btn-billing"
          >
            会計
          </button>
          <button 
            v-if="room.status === 'checkout_pending'"
            @click="checkout(room.roomId)"
            class="btn-checkout"
          >
            チェックアウト
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

**受入条件**:
- [ ] リアルタイム客室状態表示
- [ ] クイックアクションボタン
- [ ] 状態別の色分け表示

## 🔧 技術仕様

### **データベース マイグレーション**

```sql
-- 客室状態管理テーブル作成
CREATE TABLE RoomStatus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roomId TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    checkinAt DATETIME,
    checkoutAt DATETIME,
    guestCount INTEGER,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_room_status ON RoomStatus(status);
CREATE INDEX idx_room_id ON RoomStatus(roomId);

-- 領収書テーブル作成
CREATE TABLE Receipt (
    id TEXT PRIMARY KEY,
    roomId TEXT NOT NULL,
    receiptData JSON NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isDeleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_receipt_room ON Receipt(roomId);
CREATE INDEX idx_receipt_created ON Receipt(createdAt);
```

### **API エンドポイント一覧**

```typescript
// フロント業務 API
POST   /api/v1/admin/front-desk/checkin
GET    /api/v1/admin/front-desk/rooms          // 客室状態一覧
GET    /api/v1/admin/front-desk/billing/:roomId
POST   /api/v1/admin/front-desk/billing/:roomId/confirm
POST   /api/v1/admin/front-desk/checkout/:roomId

// 領収書 API
GET    /receipt/:receiptId                     // Web領収書表示
GET    /api/v1/receipt/:receiptId/pdf          // PDF ダウンロード
```

### **ルームサービス制限実装**

```typescript
// server/middleware/room-status-check.ts
export default defineEventHandler(async (event) => {
  // ルームサービス API の場合のみチェック
  if (!event.node.req.url?.startsWith('/api/v1/orders') && 
      !event.node.req.url?.startsWith('/api/v1/cart')) {
    return;
  }
  
  const session = await getServerSession(event);
  if (!session?.user?.roomNumber) return;
  
  // 客室状態確認
  const roomStatus = await prisma.roomStatus.findUnique({
    where: { roomId: session.user.roomNumber }
  });
  
  if (!roomStatus || roomStatus.status !== 'occupied') {
    throw createError({
      statusCode: 403,
      message: 'チェックアウト済みの客室ではルームサービスをご利用いただけません'
    });
  }
});
```

## 📈 実装フェーズ

### **Phase 1: 基盤構築 (2-3週間)**
- [ ] データベーステーブル作成
- [ ] 基本API実装
- [ ] 客室状態管理機能

### **Phase 2: 会計・領収書 (2-3週間)**
- [ ] 会計処理機能
- [ ] Web領収書システム
- [ ] QRコード生成・表示

### **Phase 3: フロントダッシュボード (1-2週間)**
- [ ] 客室状況一覧
- [ ] クイック操作機能
- [ ] リアルタイム更新

### **Phase 4: 統合・最適化 (1週間)**
- [ ] ルームサービス制限実装
- [ ] エラーハンドリング強化
- [ ] UI/UX改善

## 🧪 テスト戦略

### **単体テスト**
- [ ] 客室状態遷移ロジック
- [ ] 会計計算機能
- [ ] 領収書生成機能

### **統合テスト**
- [ ] チェックイン〜チェックアウトフロー
- [ ] ルームサービス制限機能
- [ ] 既存システムとの整合性

### **E2E テスト**
- [ ] フロントスタッフ業務フロー
- [ ] QRコード領収書システム
- [ ] モバイル端末での操作

## 📊 成功指標

### **業務効率指標**
- [ ] チェックイン処理時間 < 30秒
- [ ] 会計処理時間 < 1分
- [ ] チェックアウト処理時間 < 15秒

### **システム指標**
- [ ] API レスポンス時間 < 200ms
- [ ] 領収書表示速度 < 1秒
- [ ] システム稼働率 > 99.9%

### **ユーザビリティ指標**
- [ ] フロントスタッフ満足度 > 4.5/5
- [ ] 操作ミス発生率 < 1%
- [ ] 研修時間短縮 > 50%

---

## 📞 関連ドキュメント

- [商品原価・利益分析機能要件定義書](./COST_PROFIT_ANALYSIS.md)
- [統計・分析機能要件定義書](../statistics/REQUIREMENTS.md)
- [注文管理機能仕様書](../order/ORDER_FLOW_SPEC.md)

**更新履歴**
- 2024/XX/XX: 初版作成
- 2024/XX/XX: 領収書機能詳細化 