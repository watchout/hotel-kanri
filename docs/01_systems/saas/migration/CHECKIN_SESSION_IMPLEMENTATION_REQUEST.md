# hotel-commonチーム 緊急実装依頼書

## 🚨 **緊急度: 高**

**件名**: チェックインセッション機能の実装依頼
**依頼者**: hotel-saasチーム
**作成日**: 2025年1月19日
**期限**: 2025年1月26日（1週間以内）

## 📋 **依頼概要**

現在のシステムにおいて、**注文管理の根本的な設計欠陥**が発見されました。
注文が部屋番号に直接紐づいているため、複数回宿泊時の注文混在リスクがあります。

**詳細資料**: `docs/architecture/CHECKIN_SESSION_DESIGN_PROPOSAL.md`

## 🎯 **実装依頼内容**

### **Phase 1: データベーススキーマ変更（最優先）**

#### **1. 新テーブル作成**
```sql
-- CheckInSessionテーブル
CREATE TABLE "CheckInSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "reservationId" TEXT,
  "sessionNumber" TEXT NOT NULL UNIQUE,

  "primaryGuestName" TEXT NOT NULL,
  "primaryGuestEmail" TEXT,
  "primaryGuestPhone" TEXT,
  "guestCount" INTEGER NOT NULL DEFAULT 1,

  "checkedInAt" TIMESTAMP(3) NOT NULL,
  "expectedCheckOut" TIMESTAMP(3) NOT NULL,
  "checkedOutAt" TIMESTAMP(3),

  "status" TEXT NOT NULL DEFAULT 'active',
  "totalAmount" INTEGER NOT NULL DEFAULT 0,
  "paidAmount" INTEGER NOT NULL DEFAULT 0,
  "billingStatus" TEXT NOT NULL DEFAULT 'pending',

  "notes" TEXT,
  "specialRequests" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT,

  CONSTRAINT "CheckInSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CheckInSession_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- インデックス作成
CREATE INDEX "CheckInSession_tenantId_idx" ON "CheckInSession"("tenantId");
CREATE INDEX "CheckInSession_roomId_idx" ON "CheckInSession"("roomId");
CREATE INDEX "CheckInSession_status_idx" ON "CheckInSession"("status");
CREATE INDEX "CheckInSession_checkedInAt_idx" ON "CheckInSession"("checkedInAt");
CREATE INDEX "CheckInSession_sessionNumber_idx" ON "CheckInSession"("sessionNumber");

-- CheckInGuestテーブル
CREATE TABLE "CheckInGuest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionId" TEXT NOT NULL,
  "guestNumber" INTEGER NOT NULL,
  "name" TEXT,
  "ageGroup" TEXT NOT NULL,
  "gender" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,

  CONSTRAINT "CheckInGuest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CheckInSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CheckInGuest_sessionId_idx" ON "CheckInGuest"("sessionId");
```

#### **2. Orderテーブル変更**
```sql
-- sessionIdカラム追加（nullable）
ALTER TABLE "Order" ADD COLUMN "sessionId" TEXT;

-- 外部キー制約追加（マイグレーション後）
-- ALTER TABLE "Order" ADD CONSTRAINT "Order_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CheckInSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- インデックス追加
CREATE INDEX "Order_sessionId_idx" ON "Order"("sessionId");
```

### **Phase 2: API実装（高優先）**

#### **1. チェックインAPI**
```typescript
// POST /api/v1/admin/front-desk/checkin
interface CheckinRequest {
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
    ageGroup: 'adult' | 'child' | 'infant'
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say'
    name?: string
    phone?: string
    email?: string
    notes?: string
  }>
  notes?: string
  specialRequests?: string
}

interface CheckinResponse {
  success: true
  data: {
    sessionId: string
    sessionNumber: string
    roomId: string
    checkedInAt: string
    expectedCheckOut: string
  }
}
```

#### **2. 注文API修正**
```typescript
// POST /api/v1/admin/orders - sessionId対応
interface OrderRequest {
  sessionId: string  // roomIdから変更
  items: Array<{
    menuItemId: number
    quantity: number
    price: number
    notes?: string
  }>
  notes?: string
}

// GET /api/v1/admin/orders - 複数検索方法対応
// ?sessionId={sessionId}           - 特定セッションの注文
// ?roomNumber={roomNumber}         - 部屋のアクティブセッション注文
// ?roomNumber={roomNumber}&all=true - 部屋の全セッション注文
```

#### **3. セッション管理API**
```typescript
// GET /api/v1/admin/front-desk/sessions
// ?roomNumber={roomNumber}  - 部屋のアクティブセッション
// ?status=active           - 全アクティブセッション
// ?date={YYYY-MM-DD}       - 特定日のセッション

// PUT /api/v1/admin/front-desk/sessions/{sessionId}/checkout
interface CheckoutRequest {
  checkoutDate: string
  finalAmount?: number
  notes?: string
}

// GET /api/v1/admin/front-desk/sessions/{sessionId}
// セッション詳細情報（ゲスト情報、注文履歴含む）
```

### **Phase 3: データマイグレーション（中優先）**

#### **マイグレーションスクリプト**
```sql
-- 1. 既存の占有中客室からセッション作成
INSERT INTO "CheckInSession" (
  "id", "tenantId", "roomId", "sessionNumber", "primaryGuestName",
  "checkedInAt", "expectedCheckOut", "status", "createdAt", "updatedAt"
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
  NOW(),
  NOW()
FROM "Room" r
WHERE r."status" = 'occupied';

-- 2. 既存注文をセッションに紐づけ
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

-- 3. 孤立した注文の処理（セッションがない注文）
-- これらは過去の注文として別途処理が必要
```

## 🔧 **hotel-saas側の準備状況**

### **✅ 完了済み**
1. 現在の問題の詳細分析
2. 新しい設計の技術仕様策定
3. フロントエンド変更箇所の特定
4. 段階的移行計画の作成

### **🔄 実装準備中**
1. チェックインフォームのUI変更
2. 注文処理ロジックの修正
3. 会計処理の`sessionId`対応
4. 運用モード画面の表示変更

## ⏰ **実装スケジュール提案**

### **Week 1 (1/19-1/26)**
- **Day 1-2**: スキーマ変更・テーブル作成
- **Day 3-4**: チェックインAPI実装
- **Day 5-6**: 注文API修正
- **Day 7**: テスト環境での動作確認

### **Week 2 (1/27-2/2)**
- **Day 1-3**: データマイグレーション実行
- **Day 4-5**: hotel-saas側の統合テスト
- **Day 6-7**: 本番環境への段階的適用

## 🚨 **緊急対応が必要な理由**

### **1. データ整合性リスク**
- 現在も注文混在が発生している可能性
- 会計処理での金額エラーリスク
- 顧客プライバシー情報の漏洩リスク

### **2. 運用への影響**
- フロントスタッフの混乱
- 顧客からのクレーム発生
- システムへの信頼性低下

### **3. 法的コンプライアンス**
- 個人情報保護法への抵触リスク
- 会計処理の正確性要求
- 監査対応での問題発生

## 📞 **連絡・調整事項**

### **技術的な質問・相談**
- Slackチャンネル: `#hotel-common-dev`
- 緊急時: 直接連絡（電話・メール）

### **進捗報告**
- 毎日17:00に進捗報告
- 問題発生時は即座に連絡
- 完了時は動作確認結果も含めて報告

### **テスト環境**
- hotel-common: `http://localhost:3400`
- hotel-saas: `http://localhost:3100`
- 統合テスト用データベース: 準備済み

## 🎯 **成功基準**

### **機能要件**
- ✅ チェックイン時にセッションIDが発行される
- ✅ 注文がセッションIDに正しく紐づく
- ✅ 部屋番号での注文検索が正常動作
- ✅ チェックアウト処理が正常完了

### **性能要件**
- ✅ API応答時間: 300ms以内
- ✅ データベース整合性: 100%
- ✅ 既存データの移行: エラー0件

### **運用要件**
- ✅ フロントスタッフの操作に変更なし
- ✅ 既存の会計処理フローを維持
- ✅ ダウンタイム: 最大30分以内

---

**この実装により、ホテル業界標準の宿泊セッション管理が実現され、システムの信頼性と顧客満足度が大幅に向上します。**

**緊急対応をお願いいたします！** 🙏

