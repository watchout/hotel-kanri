# チェックインセッション移行戦略

## 🎯 **移行目標**

現在の`roomId`ベース注文管理から`sessionId`ベース注文管理への**無停止段階的移行**を実現する。

## 📅 **移行スケジュール**

### **Phase 1: 基盤準備 (Week 1: 1/19-1/26)**

#### **Day 1-2: hotel-common側基盤実装**
- ✅ `CheckInSession`、`CheckInGuest`テーブル作成
- ✅ `Order.sessionId`カラム追加（nullable）
- ✅ 基本的なCRUD API実装

#### **Day 3-4: hotel-saas側準備**
- ✅ 型定義追加 (`types/checkin-session.ts`)
- ✅ セッションAPI実装 (`composables/useSessionApi.ts`)
- ✅ 既存コードの互換性確認

#### **Day 5-7: 統合テスト**
- ✅ 新APIの動作確認
- ✅ 既存機能の動作確認
- ✅ データ整合性テスト

### **Phase 2: 並行運用開始 (Week 2: 1/27-2/2)**

#### **Day 1-2: 新チェックインフロー実装**
```typescript
// 新しいチェックインフロー
const processCheckinSubmit = async () => {
  try {
    // 新APIを使用
    const { checkin } = useSessionApi()
    const response = await checkin({
      roomNumber: checkinRoom.value.number,
      checkinDate: checkinForm.value.checkinDate,
      expectedCheckout: checkinForm.value.checkoutDate,
      guestCount: checkinForm.value.guestCount,
      primaryGuest: {
        name: checkinForm.value.guests[0]?.name || '宿泊者',
        email: checkinForm.value.guests[0]?.email,
        phone: checkinForm.value.guests[0]?.phone
      },
      guests: checkinForm.value.guests
    })

    // セッション情報をローカル状態に保存
    const room = rooms.value.find(r => r.number === checkinRoom.value!.number)
    if (room) {
      room.status = 'occupied'
      room.currentSession = {
        id: response.data.sessionId,
        sessionNumber: response.data.sessionNumber,
        checkedInAt: response.data.checkedInAt,
        // ...
      }
    }
  } catch (error) {
    // フォールバック: 既存APIを使用
    console.warn('新APIが利用できません。既存APIを使用します。')
    // 既存のチェックイン処理を実行
  }
}
```

#### **Day 3-4: 注文処理の段階的移行**
```typescript
// 注文作成の段階的移行
const createOrder = async (orderData: any) => {
  try {
    // Step 1: アクティブセッションを取得
    const { getActiveSessionByRoom } = useSessionApi()
    const activeSession = await getActiveSessionByRoom(roomNumber)

    if (activeSession) {
      // Step 2: セッションベース注文作成
      const { createSessionOrder } = useSessionApi()
      return await createSessionOrder({
        sessionId: activeSession.id,
        items: orderData.items,
        notes: orderData.notes
      })
    } else {
      // Step 3: フォールバック - 既存API使用
      console.warn('アクティブセッションが見つかりません。既存APIを使用します。')
      return await $fetch('/api/v1/order', {
        method: 'POST',
        body: {
          roomNumber: roomNumber,
          items: orderData.items,
          notes: orderData.notes
        }
      })
    }
  } catch (error) {
    // エラー時も既存APIにフォールバック
    console.error('セッション注文作成エラー:', error)
    throw error
  }
}
```

#### **Day 5-7: 会計処理の移行**
```typescript
// 会計処理の段階的移行
const processPayment = async () => {
  try {
    const { getActiveSessionByRoom } = useSessionApi()
    const activeSession = await getActiveSessionByRoom(room.value)

    if (activeSession) {
      // セッションベース会計処理
      const { processSessionBilling } = useSessionBilling()
      return await processSessionBilling(activeSession.id, {
        paymentMethod: selectedPaymentMethod.value,
        receivedAmount: receivedAmount.value,
        includeCheckout: true
      })
    } else {
      // 既存の会計処理
      return await authenticatedFetch('/api/v1/admin/front-desk/billing', {
        method: 'POST',
        body: {
          roomNumber: room.value,
          paymentMethod: selectedPaymentMethod.value,
          receivedAmount: receivedAmount.value,
          includeCheckout: true
        }
      })
    }
  } catch (error) {
    console.error('会計処理エラー:', error)
    throw error
  }
}
```

### **Phase 3: データマイグレーション (Week 3: 2/3-2/9)**

#### **Step 1: 既存データの分析**
```sql
-- 現在の占有中客室数
SELECT COUNT(*) FROM "Room" WHERE "status" = 'occupied';

-- 未払い注文数
SELECT COUNT(*) FROM "Order" WHERE "sessionId" IS NULL;

-- データ整合性チェック
SELECT
  r."roomNumber",
  COUNT(o."id") as order_count,
  SUM(o."total") as total_amount
FROM "Room" r
LEFT JOIN "Order" o ON r."roomNumber" = o."roomId"
WHERE r."status" = 'occupied'
GROUP BY r."roomNumber";
```

#### **Step 2: セッション作成マイグレーション**
```sql
-- 占有中客室からセッション作成
INSERT INTO "CheckInSession" (
  "id", "tenantId", "roomId", "sessionNumber",
  "primaryGuestName", "checkedInAt", "expectedCheckOut",
  "status", "guestCount", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  r."tenantId",
  r."id",
  CONCAT('R', r."roomNumber", '-', TO_CHAR(NOW(), 'YYYYMMDD'), '-001'),
  'レガシーゲスト',
  COALESCE(r."lastCleaned", r."createdAt"),
  COALESCE(r."lastCleaned", r."createdAt") + INTERVAL '1 day',
  'active',
  1,
  NOW(),
  NOW()
FROM "Room" r
WHERE r."status" = 'occupied'
AND NOT EXISTS (
  SELECT 1 FROM "CheckInSession" s
  WHERE s."roomId" = r."id" AND s."status" = 'active'
);
```

#### **Step 3: 注文データの紐づけ**
```sql
-- 既存注文をセッションに紐づけ
UPDATE "Order" o
SET "sessionId" = (
  SELECT s."id"
  FROM "CheckInSession" s
  JOIN "Room" r ON s."roomId" = r."id"
  WHERE r."roomNumber" = o."roomId"
  AND s."status" = 'active'
  LIMIT 1
)
WHERE o."sessionId" IS NULL
AND EXISTS (
  SELECT 1 FROM "CheckInSession" s
  JOIN "Room" r ON s."roomId" = r."id"
  WHERE r."roomNumber" = o."roomId"
  AND s."status" = 'active'
);
```

### **Phase 4: 完全移行 (Week 4: 2/10-2/16)**

#### **Day 1-3: 新フローの強制適用**
```typescript
// 環境変数による制御
const USE_SESSION_FLOW = process.env.USE_SESSION_FLOW === 'true'

if (USE_SESSION_FLOW) {
  // セッションフローのみ使用
  const response = await checkin(checkinData)
} else {
  // 既存フローも並行使用
  try {
    const response = await checkin(checkinData)
  } catch {
    const response = await legacyCheckin(checkinData)
  }
}
```

#### **Day 4-5: 旧APIの段階的廃止**
```typescript
// 旧APIに警告を追加
export default defineEventHandler(async (event) => {
  console.warn('⚠️ DEPRECATED: このAPIは廃止予定です。新しいセッションAPIを使用してください。')

  // 既存の処理...
})
```

#### **Day 6-7: 完全移行とクリーンアップ**
```sql
-- roomIdカラムの削除（最終段階）
ALTER TABLE "Order" DROP COLUMN "roomId";

-- 旧APIファイルの削除
-- server/api/v1/admin/front-desk/room-orders.get.ts.disabled
-- server/api/v1/order/index.post.ts.disabled
```

## 🛡️ **リスク軽減策**

### **1. データ整合性保証**
```sql
-- 制約追加（段階的）
-- Phase 2: nullable制約
ALTER TABLE "Order" ADD CONSTRAINT "Order_sessionId_check"
CHECK ("sessionId" IS NOT NULL OR "roomId" IS NOT NULL);

-- Phase 4: 完全制約
ALTER TABLE "Order" ADD CONSTRAINT "Order_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "CheckInSession" ("id");
```

### **2. ロールバック計画**
```bash
# 緊急時のロールバック手順
# 1. 環境変数でフォールバック有効化
export USE_SESSION_FLOW=false

# 2. データベースの状態復元
# セッションテーブルは残し、Order.roomIdを復活
ALTER TABLE "Order" ADD COLUMN "roomId" TEXT;
UPDATE "Order" o SET "roomId" = (
  SELECT r."roomNumber" FROM "CheckInSession" s
  JOIN "Room" r ON s."roomId" = r."id"
  WHERE s."id" = o."sessionId"
);
```

### **3. 監視とアラート**
```typescript
// 移行状況の監視
const migrationMetrics = {
  sessionBasedOrders: 0,
  legacyOrders: 0,
  errors: 0
}

// アラート条件
if (migrationMetrics.errors > 10) {
  // Slack通知 + 自動ロールバック検討
}
```

## 📊 **成功指標**

### **Phase 1完了基準**
- ✅ 新APIの正常動作確認
- ✅ 既存機能の動作確認
- ✅ テストカバレッジ80%以上

### **Phase 2完了基準**
- ✅ 新チェックインの成功率95%以上
- ✅ 注文作成の成功率95%以上
- ✅ データ整合性エラー0件

### **Phase 3完了基準**
- ✅ 全既存データのマイグレーション完了
- ✅ セッション紐づけ率100%
- ✅ 孤立注文0件

### **Phase 4完了基準**
- ✅ 新フローの使用率100%
- ✅ 旧API使用率0%
- ✅ システム安定性確認

## 🔧 **実装チェックリスト**

### **hotel-common側**
- [ ] CheckInSessionテーブル作成
- [ ] CheckInGuestテーブル作成
- [ ] Order.sessionIdカラム追加
- [ ] チェックインAPI実装
- [ ] セッション管理API実装
- [ ] 注文API修正
- [ ] マイグレーションスクリプト作成

### **hotel-saas側**
- [x] 型定義作成 (`types/checkin-session.ts`)
- [x] セッションAPI実装 (`composables/useSessionApi.ts`)
- [ ] チェックインフォーム修正
- [ ] 注文処理修正
- [ ] 会計処理修正
- [ ] 運用モード画面修正

### **テスト・検証**
- [ ] 単体テスト作成
- [ ] 統合テスト実行
- [ ] 負荷テスト実行
- [ ] データ整合性テスト
- [ ] ロールバックテスト

## 📞 **緊急連絡体制**

### **移行責任者**
- hotel-commonチーム: [担当者名]
- hotel-saasチーム: [担当者名]

### **エスカレーション**
1. **Level 1**: 軽微な問題 → Slack `#migration-support`
2. **Level 2**: 重要な問題 → 電話連絡 + Slack
3. **Level 3**: 緊急事態 → 即座にロールバック実行

---

**この段階的移行により、サービス停止なしでチェックインセッション機能を導入し、システムの信頼性と顧客満足度を向上させます。**

