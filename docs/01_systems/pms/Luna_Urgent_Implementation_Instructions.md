# 🌙 Luna（月読）緊急実装指示書
**統合実装中止・新仕様統合への即座切り替え指示**

## 🚨 最優先緊急事項

### **即座実行事項**
```
1. 現在の統合実装作業を一時停止
2. 本指示書の新仕様を統合アーキテクチャに反映
3. MVP必須6機能を統合基盤設計に組み込み
4. 統合完了後に機能実装開始
```

---

## 📋 新仕様統合要求

### **MVP必須6機能（現場要望）**
以下の機能を統合アーキテクチャに完全組み込み必須：

#### **1. 💎 VIP顧客完全履歴管理**
- **統合要件**: hotel-member完全連携
- **新API**: `/api/vip/{customerId}/history` 
- **Event**: `vip.history.updated`
- **DB拡張**: `vip_interactions`, `vip_preferences`

#### **2. 📊 リアルタイム収益ダッシュボード**
- **統合要件**: WebSocket統合基盤
- **新API**: `/api/revenue/realtime`
- **Event**: `revenue.updated`, `dashboard.refresh`
- **DB拡張**: `revenue_tracking`, `cost_centers`

#### **3. ⚡ 15分チェックイン（団体対応）**
- **統合要件**: QR処理基盤 + hotel-member連携
- **新API**: `/api/checkin/group/{qrCode}`
- **Event**: `group.checkin.started`, `group.checkin.completed`
- **DB拡張**: `group_reservations`, `qr_checkin_tokens`

#### **4. 📱 写真付き申し送り機能**
- **統合要件**: メディア管理基盤 + 通知統合
- **新API**: `/api/handover/photo`, `/api/notifications/staff`
- **Event**: `handover.created`, `notification.sent`
- **DB拡張**: `handover_notes`, `media_attachments`

#### **5. 💰 原価リアルタイム管理**
- **統合要件**: 分析エンジン統合基盤
- **新API**: `/api/cost/tracking`, `/api/profit/analysis`
- **Event**: `cost.updated`, `profit.calculated`
- **DB拡張**: `cost_tracking`, `profit_margins`

#### **6. 🎉 グループエンタメ管理**
- **統合要件**: hotel-saas完全連携
- **新API**: `/api/entertainment/group`, `/api/bookings/activity`
- **Event**: `entertainment.booked`, `activity.confirmed`
- **DB拡張**: `group_activities`, `entertainment_bookings`

---

## 🏗️ 統合アーキテクチャ変更要求

### **データベース設計変更**
```sql
-- 追加必須テーブル（Prismaスキーマ統合）
model VipInteraction {
  id String @id @default(cuid())
  customerId String
  interactionType String
  details Json
  timestamp DateTime @default(now())
  staffId String
  @@map("vip_interactions")
}

model RevenueTracking {
  id String @id @default(cuid())
  roomId String
  date DateTime
  revenue Decimal
  costs Decimal
  profit Decimal
  @@map("revenue_tracking")
}

model GroupReservation {
  id String @id @default(cuid())
  groupLeaderId String
  totalGuests Int
  qrToken String @unique
  checkInStatus String
  @@map("group_reservations")
}

model HandoverNote {
  id String @id @default(cuid())
  fromStaffId String
  toStaffId String
  content String
  photoUrls String[]
  priority String
  timestamp DateTime @default(now())
  @@map("handover_notes")
}

model CostTracking {
  id String @id @default(cuid())
  category String
  amount Decimal
  date DateTime
  description String
  @@map("cost_tracking")
}

model EntertainmentBooking {
  id String @id @default(cuid())
  groupId String
  activityType String
  bookingTime DateTime
  status String
  @@map("entertainment_bookings")
}
```

### **Event System拡張**
```typescript
// 新規Event定義（hotel-common統合）
interface PmsExtendedEvents {
  'vip.history.updated': VipHistoryEvent;
  'revenue.updated': RevenueUpdateEvent;
  'group.checkin.started': GroupCheckinEvent;
  'handover.created': HandoverEvent;
  'cost.updated': CostUpdateEvent;
  'entertainment.booked': EntertainmentEvent;
}
```

### **API統合要件**
```typescript
// hotel-common統合API基盤準拠
interface PmsExtendedApi {
  // VIP機能
  '/api/vip/{customerId}/history': GET | POST;
  '/api/vip/{customerId}/preferences': GET | PUT;
  
  // 収益管理
  '/api/revenue/realtime': GET;
  '/api/revenue/dashboard': GET;
  
  // グループチェックイン
  '/api/checkin/group/{qrCode}': POST;
  '/api/checkin/group/{groupId}/status': GET;
  
  // 申し送り
  '/api/handover/create': POST;
  '/api/handover/photo/upload': POST;
  '/api/notifications/staff': GET | POST;
  
  // 原価管理
  '/api/cost/tracking': GET | POST;
  '/api/profit/analysis/{period}': GET;
  
  // エンタメ連携
  '/api/entertainment/group': GET | POST;
  '/api/entertainment/booking/{bookingId}': GET | PUT | DELETE;
}
```

---

## ⚡ 実装優先順位

### **Phase 1: 統合基盤拡張（即座開始）**
```
Week 1-2: 統合アーキテクチャ設計変更
├── DB拡張スキーマ設計
├── Event System拡張
├── API統合基盤拡張
└── hotel-member/hotel-saas連携設計
```

### **Phase 2: MVP必須機能実装**
```
Week 3-4: 緊急度最高の3機能
├── VIP顧客履歴管理 (12日)
├── リアルタイム収益ダッシュボード (15日)
└── 15分チェックイン（団体）(20日)

Week 5-6: 残り3機能
├── 写真付き申し送り (8日)
├── 原価リアルタイム管理 (25日)
└── グループエンタメ管理 (18日)
```

---

## 🔐 セキュリティ・品質要件

### **データ保護強化**
- 全VIP情報は暗号化必須
- 写真データはS3互換ストレージ
- アクセスログ完全記録
- GDPR準拠のデータ管理

### **パフォーマンス要件**
- リアルタイムダッシュボード: 200ms以内
- グループチェックイン: 15分以内完了
- VIP履歴検索: 500ms以内
- 申し送り通知: 即座配信

---

## 📊 工数・スケジュール調整

### **統合作業への追加工数**
```
追加設計・実装: +45日
├── DB設計拡張: 8日
├── API統合拡張: 12日
├── Event System拡張: 8日
├── セキュリティ強化: 7日
└── 6機能実装: 110日（並行実装）
```

### **クリティカルパス**
```
最短実装ルート（並行処理）:
統合基盤拡張 (2週間) → MVP3機能 (3週間) → 残り3機能 (3週間)
= 総期間: 8週間
```

---

## 🎯 成功指標

### **技術指標**
- [ ] 統合API応答速度: 全て500ms以内
- [ ] Event配信遅延: 100ms以内
- [ ] DB処理速度: クエリ200ms以内
- [ ] WebSocket接続: 99.9%稼働率

### **現場満足度指標**
- [ ] VIP対応時間: 50%短縮
- [ ] チェックイン効率: 15分達成率90%
- [ ] 申し送り漏れ: ゼロ実現
- [ ] 収益把握: リアルタイム100%

---

## 🚨 重要注意事項

### **絶対遵守事項**
1. **統合品質維持**: hotel-common基盤準拠絶対
2. **Event-driven遵守**: 全機能でEvent必須発行
3. **セキュリティ最優先**: VIP・個人情報保護
4. **パフォーマンス保証**: リアルタイム要件必達

### **緊急連絡体制**
- **技術課題**: Iza（統合管理者）即座連絡
- **現場要望**: Nami（ミーティングボード）経由
- **品質問題**: 開発チーム全体緊急招集

---

**🌙 Luna、冷静沈着な夜の守護神として、この緊急仕様変更を完璧に統合し、現場の期待に応える最高品質のPMSシステムを創造してください。**

**現場の声が込められたこの6機能が、ホテル業務の革命的効率化を実現します。** 