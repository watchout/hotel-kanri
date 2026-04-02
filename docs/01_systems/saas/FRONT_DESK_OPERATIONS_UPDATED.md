# フロント業務機能 実装計画書（更新版）

## 📋 概要

### **プロジェクト名**
Hotel SaaS フロント業務機能（既存システム統合版）

### **更新内容**
既存のPlace（客室）管理システムとの整合性を考慮し、データベース設計と実装方針を最適化

### **目的**
ホテルフロントスタッフが行う基本的なチェックイン・会計・チェックアウト業務をデジタル化し、効率的な客室管理を実現する。

## 🔄 **既存システムとの統合方針**

### **データベース統合アプローチ**
- 既存の `Place` モデルを活用（客室番号は `Place.code`）
- 新規 `RoomStatus` モデルで客室状態を管理
- `Order` テーブルとの連携で会計処理を実現

### **段階的実装戦略**

#### **Phase 1: コア機能（1週間）**
1. **データベースマイグレーション**（1日）
   - `RoomStatus` モデル追加
   - `Receipt` モデル追加
   - 既存 `Place` モデルとのリレーション設定

2. **フロントダッシュボード**（2-3日）
   - 客室状況一覧表示
   - 基本的な状態管理機能
   - クイック操作ボタン

3. **チェックイン/チェックアウト機能**（2-3日）
   - 客室状態の変更処理
   - バリデーション機能
   - エラーハンドリング

#### **Phase 2: 会計・領収書（1週間）**
4. **会計処理機能**（3-4日）
   - 注文明細の集計・表示
   - 税計算機能
   - 会計確定処理

5. **Web領収書システム**（3-4日）
   - Web領収書ページ
   - QRコード生成
   - PDF ダウンロード機能

#### **Phase 3: 統合・最適化（3-4日）**
6. **ルームサービス制限機能**（1-2日）
7. **統合テスト・バグ修正**（1-2日）
8. **UI/UX最適化**（1日）

## 🗄️ **更新されたデータベース設計**

```prisma
// 既存のPlaceモデルに追加するリレーション
model Place {
  // ... 既存のフィールド ...
  roomStatus RoomStatus?
  receipts   Receipt[]
}

// 新規追加モデル
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

## 🔧 **更新されたAPI設計**

### **フロント業務 API エンドポイント**

```typescript
// 客室一覧取得
GET    /api/v1/admin/front-desk/rooms
interface RoomsResponse {
  rooms: Array<{
    placeId: number;
    roomCode: string;        // Place.code
    roomName: string;        // Place.name
    status: 'available' | 'occupied' | 'checkout_pending';
    checkinAt?: string;
    guestCount?: number;
  }>;
}

// チェックイン処理
POST   /api/v1/admin/front-desk/checkin
interface CheckinRequest {
  placeId: number;           // 既存のPlace IDを使用
  checkinAt?: string;        // ISO 8601 format
  guestCount?: number;
}

// 会計処理
GET    /api/v1/admin/front-desk/billing/:placeId
interface BillingResponse {
  placeId: number;
  roomCode: string;          // Place.code
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
  subtotal: number;
  tax: number;
  total: number;
}

// 会計確定
POST   /api/v1/admin/front-desk/billing/:placeId/confirm

// チェックアウト処理
POST   /api/v1/admin/front-desk/checkout/:placeId

// Web領収書
GET    /receipt/:receiptId
```

## 📁 **ファイル構成**

```
pages/admin/front-desk/
├── index.vue                    # フロントダッシュボード
├── checkin.vue                  # チェックイン処理
├── billing.vue                  # 会計処理
└── checkout.vue                 # チェックアウト処理

server/api/v1/admin/front-desk/
├── rooms.get.ts                 # 客室一覧
├── checkin.post.ts              # チェックイン処理
├── billing/
│   ├── [placeId].get.ts         # 会計情報取得
│   └── [placeId]/confirm.post.ts # 会計確定
└── checkout.post.ts             # チェックアウト処理

pages/receipt/
└── [id].vue                     # Web領収書ページ

components/admin/front-desk/
├── RoomStatusCard.vue           # 客室状態カード
├── CheckinForm.vue              # チェックインフォーム
├── BillingDetails.vue           # 会計明細
└── ReceiptTemplate.vue          # 領収書テンプレート
```

## 🎯 **実装の優先順位**

### **最高優先度（必須機能）**
1. ✅ データベースマイグレーション
2. ✅ フロントダッシュボード（客室状況一覧）
3. ✅ チェックイン/チェックアウト処理
4. ✅ 会計処理（注文明細表示）

### **高優先度（重要機能）**
5. ⚠️ Web領収書システム
6. ⚠️ QRコード生成機能
7. ⚠️ ルームサービス制限機能

### **中優先度（拡張機能）**
8. 📋 PDF ダウンロード機能
9. 📋 リアルタイム更新機能
10. 📋 詳細な統計・分析機能

## 🔍 **実装時の注意事項**

### **既存システムとの整合性**
- `Place.code` を客室番号として使用
- 既存の注文管理システムとの連携を維持
- デバイス認証システムとの競合回避

### **データ整合性の確保**
- チェックアウト後の注文制限機能
- 重複チェックイン防止
- 状態遷移の整合性チェック

### **パフォーマンス考慮**
- 客室状況の効率的な取得
- 大量注文データの集計最適化
- リアルタイム更新の負荷軽減

## 📊 **テスト戦略**

### **単体テスト**
- [ ] 客室状態遷移ロジック
- [ ] 会計計算機能
- [ ] バリデーション機能

### **統合テスト**
- [ ] チェックイン〜チェックアウトフロー
- [ ] 既存注文システムとの連携
- [ ] データ整合性確認

### **E2E テスト**
- [ ] フロントスタッフ業務フロー
- [ ] モバイル端末での操作
- [ ] エラーハンドリング

## 🚀 **今後の拡張計画**

### **Phase 4: 高度な機能**
- 客室清掃状況管理
- 宿泊予約システムとの連携
- フロントスタッフのシフト管理

### **Phase 5: 分析・レポート**
- フロント業務効率分析
- 客室稼働率レポート
- 売上・利益分析連携

---

**更新履歴**
- 2024/12/06: 既存システム統合版として更新
- 2024/12/06: 実装優先度と段階的アプローチを追加 