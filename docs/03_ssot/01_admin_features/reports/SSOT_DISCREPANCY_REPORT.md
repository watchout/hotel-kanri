# 🚨 SSOT実装不一致レポート

**作成日**: 2025-10-03  
**調査対象**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_core_features/`  
**調査方法**: 実際のPrismaスキーマ・ソースコードとの相互参照

---

## 📋 調査結果サマリー

| SSOT文書 | テーブル/モデル | SSOT記載 | 実際のPrisma | 状態 | 重大度 |
|---------|--------------|---------|-------------|------|--------|
| SSOT_SAAS_MENU_MANAGEMENT.md | menu_items | `menu_items` | **存在しない** | 🔴 **重大** | 最高 |
| SSOT_SAAS_MENU_MANAGEMENT.md | categories | `categories` | **存在しない** | 🔴 **重大** | 最高 |
| SSOT_SAAS_ORDER_MANAGEMENT.md | Order | `Order` | ✅ 存在 | ✅ 一致 | - |
| SSOT_SAAS_ORDER_MANAGEMENT.md | OrderItem | `OrderItem` | ✅ 存在 | ✅ 一致 | - |
| SSOT_SAAS_ROOM_MANAGEMENT.md | rooms | `rooms` | ✅ 存在 | ✅ 一致 | - |
| SSOT_SAAS_ROOM_MANAGEMENT.md | room_grades | `room_grades` | ✅ 存在 | ✅ 一致 | - |

---

## 🔴 重大な問題: メニュー関連テーブルが存在しない

### 問題1: `menu_items`テーブル

**SSOT記載**:
- ファイル: `SSOT_SAAS_MENU_MANAGEMENT.md`
- Line 115-180: 詳細なDDL定義
- Line 182-250: Prismaモデル定義

**実際のPrisma（hotel-common/prisma/schema.prisma）**:
```bash
$ grep -E "^model.*menu" /Users/kaneko/hotel-common/prisma/schema.prisma
# 結果: 該当なし
```

**結論**: ❌ **`menu_items`テーブル/モデルは存在しない**

---

### 問題2: `categories`テーブル

**SSOT記載**:
- ファイル: `SSOT_SAAS_MENU_MANAGEMENT.md`
- Line 286-360: 詳細なDDL定義
- Line 362-420: Prismaモデル定義

**実際のPrisma（hotel-common/prisma/schema.prisma）**:
```bash
$ grep -i "category\|categories" /Users/kaneko/hotel-common/prisma/schema.prisma | grep "^model"
model campaign_categories {
model campaign_category_relations {
```

**結論**: ❌ **`categories`テーブル/モデルは存在しない**
- `campaign_categories`は存在するが、これはキャンペーン機能用
- メニュー用の`categories`は存在しない

---

## ✅ 正しい実装が確認されたもの

### 1. Order（注文）

**SSOT記載**: `SSOT_SAAS_ORDER_MANAGEMENT.md` Line 148-180

**実際のPrisma**:
```prisma
model Order {
  id        Int               @id @default(autoincrement())
  tenantId  String
  roomId    String
  placeId   Int?
  status    String            @default("received")
  items     Json
  total     Int
  createdAt DateTime          @default(now())
  updatedAt DateTime
  paidAt    DateTime?
  isDeleted Boolean           @default(false)
  deletedAt DateTime?
  sessionId String?
  uuid      String?           @unique
  session   checkin_sessions? @relation(fields: [sessionId], references: [id])
  OrderItem OrderItem[]
  
  @@index([createdAt])
  @@index([isDeleted, paidAt])
  @@index([sessionId])
  @@index([tenantId])
}
```

**結論**: ✅ **完全一致**（細部の差異はあるが本質的に一致）

---

### 2. OrderItem（注文アイテム）

**SSOT記載**: `SSOT_SAAS_ORDER_MANAGEMENT.md` Line 244-280

**実際のPrisma**:
```prisma
model OrderItem {
  id          Int       @id @default(autoincrement())
  tenantId    String
  orderId     Int
  menuItemId  Int
  name        String
  price       Int
  quantity    Int
  status      String    @default("pending")
  notes       String?
  deliveredAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime
  deletedAt   DateTime?
  isDeleted   Boolean   @default(false)
  Order       Order     @relation(fields: [orderId], references: [id])
  
  @@index([isDeleted])
  @@index([orderId])
  @@index([tenantId])
}
```

**結論**: ✅ **完全一致**

**注意**: `menuItemId`フィールドは存在するが、外部キー制約はない（`menu_items`テーブルが存在しないため）

---

### 3. rooms（客室）

**SSOT記載**: `SSOT_SAAS_ROOM_MANAGEMENT.md` Line 127-172

**実際のPrisma**:
```prisma
model rooms {
  id          String    @id
  tenantId    String
  roomNumber  String
  roomType    String    // ← 🔴 注意: SSOT v3.0.0では削除予定
  floor       Int?
  status      String    @default("AVAILABLE")
  capacity    Int       @default(2)
  amenities   Json?
  notes       String?
  lastCleaned DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  deletedBy   String?

  @@unique([tenantId, roomNumber])
  @@index([floor])
  @@index([isDeleted])
  @@index([roomType])
  @@index([status])
  @@index([tenantId])
}
```

**結論**: ⚠️ **現状は一致しているが、SSOT v3.0.0ではマイグレーション予定**
- 現在: `roomType` (String) フィールド使用
- SSOT v3.0.0: `roomGradeId` (外部キー) に変更予定

---

### 4. room_grades（客室グレード）

**SSOT記載**: `SSOT_SAAS_ROOM_MANAGEMENT.md` Line 237-350

**実際のPrisma**:
```prisma
model room_grades {
  id                   String   @id
  tenant_id            String
  code                 String
  name                 String
  description          String?
  created_at           DateTime @default(now())
  updated_at           DateTime
  grade_name_en        String?
  grade_level          Int?
  default_capacity     Int?
  max_capacity         Int?
  room_size_sqm        Decimal? @db.Decimal
  standard_amenities   Json?
  premium_amenities    Json?
  included_services    Json?
  member_only          Boolean? @default(false)
  min_stay_nights      Int?
  advance_booking_days Int?
  display_order        Int?
  is_active            Boolean? @default(true)
  is_public            Boolean? @default(true)
  pricing_category     String?

  @@unique([tenant_id, code])
  @@index([display_order], map: "idx_room_grades_display_order")
  @@index([is_active], map: "idx_room_grades_is_active")
  @@index([is_public], map: "idx_room_grades_is_public")
  @@index([tenant_id])
}
```

**結論**: ✅ **完全一致**

---

## 🔍 APIパス・ファイル名の確認

### hotel-saas 実装状況

**実際に存在するAPIファイル**:
```
✅ /Users/kaneko/hotel-saas/server/api/v1/admin/orders.get.ts
✅ /Users/kaneko/hotel-saas/server/api/v1/admin/orders/
✅ /Users/kaneko/hotel-saas/server/api/v1/admin/room-grades/
✅ /Users/kaneko/hotel-saas/server/api/v1/admin/rooms/
✅ /Users/kaneko/hotel-saas/server/api/v1/admin/menu/        ← メニュー関連
✅ /Users/kaneko/hotel-saas/server/api/v1/order/menu.get.ts  ← メニュー取得API
```

**hotel-common 実装状況**:
```
✅ /Users/kaneko/hotel-common/src/routes/systems/saas/orders.routes.ts
✅ /Users/kaneko/hotel-common/src/routes/systems/common/room-grades.routes.ts
✅ /Users/kaneko/hotel-common/src/routes/systems/common/front-desk-rooms.routes.ts
❌ /Users/kaneko/hotel-common/src/routes/systems/*/menu*.routes.ts  ← 存在しない
```

---

## 📊 重複実装の可能性

### 1. メニュー管理機能

**SSOT記載**: 新規テーブル `menu_items`, `categories` を作成

**実際の実装**:
- ✅ hotel-saasに`/api/v1/admin/menu/`ディレクトリが存在
- ✅ hotel-saasに`/api/v1/order/menu.get.ts`が存在
- ❌ hotel-commonにメニューAPIルートが存在しない
- ❌ Prismaに`menu_items`/`categories`モデルが存在しない

**可能性の推測**:
1. **既存実装がモック**である可能性
2. **既存実装が別のデータ構造**を使用している可能性（Json等）
3. **SSOT作成時に既存実装を見落とした**可能性

**要調査**: hotel-saas の `/api/v1/order/menu.get.ts` の実装内容を確認する必要あり

---

### 2. 注文管理機能（OrderItem.menuItemId）

**問題**:
- `OrderItem`モデルに`menuItemId`フィールドが存在
- しかし`menu_items`テーブルが存在しない
- 外部キー制約もない

**現状の実装推測**:
- メニュー情報は`Order.items` (Json)に格納されている可能性
- `OrderItem.menuItemId`は識別子のみで、実体は別の場所

---

## 🎯 推奨アクション

### 最優先: hotel-saas のメニューAPI実装を調査

```bash
# 調査すべきファイル
/Users/kaneko/hotel-saas/server/api/v1/order/menu.get.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/menu/*
```

**調査項目**:
1. メニューデータはどこから取得しているか？
   - hotel-common API呼び出し？
   - モックデータ？
   - 別のテーブル（campaign_items等）？
2. データ構造は何か？
3. SSOTの`menu_items`テーブルと重複するか？

---

### 次に実施すべきこと

#### オプション1: 既存実装を活用

**条件**: hotel-saasのメニューAPIが動作している場合

**アクション**:
1. 既存のデータ構造を確認
2. SSOTを既存実装に合わせて修正
3. 重複を避ける

#### オプション2: SSOTに従って新規実装

**条件**: 既存実装がモック or 未完成の場合

**アクション**:
1. `menu_items`, `categories`テーブルを新規作成
2. hotel-commonにメニューAPIを実装
3. hotel-saasを新APIに接続

---

## ✅ 確認済み一致項目（問題なし）

| 項目 | SSOT | 実際 | 状態 |
|------|------|------|------|
| Order モデル | 定義済み | 存在 | ✅ 一致 |
| OrderItem モデル | 定義済み | 存在 | ✅ 一致 |
| rooms モデル | 定義済み | 存在 | ✅ 一致（マイグレーション予定） |
| room_grades モデル | 定義済み | 存在 | ✅ 完全一致 |
| device_rooms モデル | 定義済み | 存在 | ✅ 一致 |
| front-desk-rooms API | 定義済み | 存在 | ✅ 一致 |
| room-grades API | 定義済み | 存在 | ✅ 一致 |
| orders API | 定義済み | 存在 | ✅ 一致 |

---

## 📝 結論

### 🔴 重大な不一致（2件）

1. **`menu_items`テーブルが存在しない**
   - SSOT: 詳細な定義あり
   - 実際: モデルが存在しない

2. **`categories`テーブルが存在しない**
   - SSOT: 詳細な定義あり
   - 実際: モデルが存在しない（`campaign_categories`のみ）

### ✅ 一致している項目（7件）

- Order, OrderItem, rooms, room_grades, device_rooms
- front-desk-rooms API, room-grades API, orders API

### ⚠️ 要調査（1件）

- hotel-saasの既存メニューAPI実装（`/api/v1/order/menu.get.ts`等）

---

**次のステップ**: hotel-saasのメニューAPI実装を調査して、重複回避or統合の方針を決定する必要があります。

