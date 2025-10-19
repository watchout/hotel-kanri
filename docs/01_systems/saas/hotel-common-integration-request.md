# hotel-common統合用データベース変更リクエスト

## 申請者情報

- **申請日**: 2025年8月20日
- **申請者**: hotel-saasチーム
- **優先度**: 中
- **希望実装期限**: 2025年9月10日

## 変更概要

本リクエストは、hotel-saasプロジェクトにおける以下の3つの主要な機能追加に伴うデータベース変更を申請します：

1. **商品マスタと販売データの分離**
   - 柔軟な価格設定（キャンペーン価格、会員価格）を可能にするため
   - 現在の商品=販売内容の一体構造から分離する

2. **ガチャメニュー機能の追加**
   - ランダムに商品が選ばれる新機能
   - Professional以上のプレミアム機能として提供

3. **プレミアム機能制限の実装**
   - Professional以上のプラン限定機能の管理
   - 既存のシークレットメニュー機能も含む

## 変更理由・背景

- **価格設定の柔軟性向上**: 現在の構造では同一商品の複数価格設定（キャンペーン価格、会員価格など）が困難
- **収益向上施策**: ガチャメニューによる付加価値提供と客単価向上
- **プラン差別化**: Professional以上のプランに価値を付加し、アップグレード促進

## 詳細変更内容

### 1. 商品マスタと販売データの分離

#### 1.1 MenuItem テーブル変更

**削除するフィールド**:
- `price`: Int - 価格情報をPriceRuleテーブルに移行
- `taxRate`: Int - 税率情報をPriceRuleテーブルに移行
- `costPrice`: Int? - 原価情報をPriceRuleテーブルに移行

#### 1.2 PriceRule テーブル追加

```prisma
model PriceRule {
  id              Int       @id @default(autoincrement())
  tenantId        String
  menuItemId      Int
  name            String    // ルール名称（例：「通常価格」「キャンペーン価格」）
  price           Decimal   // 税抜価格
  taxRate         Decimal   // 税率
  startDate       DateTime? // 適用開始日時
  endDate         DateTime? // 適用終了日時
  memberRankId    String?   // 会員ランク（nullの場合全会員対象）
  campaignId      String?   // キャンペーンID
  isDefault       Boolean   @default(false) // デフォルト価格フラグ
  priority        Int       @default(0) // 優先度（競合時に使用）
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  menuItem        MenuItem  @relation(fields: [menuItemId], references: [id])

  @@index([tenantId])
  @@index([menuItemId])
  @@index([isDefault])
  @@index([startDate, endDate])
  @@map("price_rules")
}
```

### 2. ガチャメニュー機能の追加

#### 2.1 GachaMenu テーブル追加

```prisma
model GachaMenu {
  id              Int             @id @default(autoincrement())
  tenantId        String
  name            String
  description     String?
  price           Decimal
  taxRate         Decimal         @default(10)
  imageUrl        String?
  isActive        Boolean         @default(true)
  startDate       DateTime?
  endDate         DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  tenant          Tenant          @relation(fields: [tenantId], references: [id])
  items           GachaMenuItem[]

  @@index([tenantId])
  @@index([isActive])
  @@map("gacha_menus")
}
```

#### 2.2 GachaMenuItem テーブル追加

```prisma
model GachaMenuItem {
  id              Int             @id @default(autoincrement())
  tenantId        String
  gachaMenuId     Int
  menuItemId      Int
  weight          Int             @default(100)
  isActive        Boolean         @default(true)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  tenant          Tenant          @relation(fields: [tenantId], references: [id])
  gachaMenu       GachaMenu       @relation(fields: [gachaMenuId], references: [id], onDelete: Cascade)
  menuItem        MenuItem        @relation(fields: [menuItemId], references: [id])

  @@unique([gachaMenuId, menuItemId])
  @@index([tenantId])
  @@index([gachaMenuId])
  @@index([menuItemId])
  @@map("gacha_menu_items")
}
```

#### 2.3 Order テーブル拡張

```prisma
model Order {
  // 既存フィールド
  isGachaOrder    Boolean         @default(false)
  // 他の既存フィールド
}
```

#### 2.4 OrderItem テーブル拡張

```prisma
model OrderItem {
  // 既存フィールド
  isGachaResult   Boolean         @default(false)
  gachaMenuId     Int?
  originalPrice   Decimal?
  // 他の既存フィールド
}
```

### 3. プレミアム機能制限の実装

#### 3.1 TenantSubscription テーブル拡張

```prisma
model TenantSubscription {
  // 既存フィールド
  planType          String    // "LEISURE_Economy", "LEISURE_Professional", "OmotenasuAI_Enterprise" など

  // プレミアム機能フラグ
  enableSecretMenu  Boolean   @default(false) // シークレットメニュー機能
  enableGachaMenu   Boolean   @default(false) // ガチャメニュー機能

  // 他の既存フィールド
}
```

## データ移行計画

### 1. 商品マスタと販売データの分離

```sql
-- 1. PriceRuleテーブルを作成
CREATE TABLE "price_rules" (
  "id" SERIAL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "menuItemId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "price" DECIMAL NOT NULL,
  "taxRate" DECIMAL NOT NULL,
  "startDate" TIMESTAMP,
  "endDate" TIMESTAMP,
  "memberRankId" TEXT,
  "campaignId" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE
);

-- 2. インデックスを作成
CREATE INDEX "price_rules_tenantId" ON "price_rules"("tenantId");
CREATE INDEX "price_rules_menuItemId" ON "price_rules"("menuItemId");
CREATE INDEX "price_rules_isDefault" ON "price_rules"("isDefault");
CREATE INDEX "price_rules_date_range" ON "price_rules"("startDate", "endDate");

-- 3. 既存のMenuItem.priceとMenuItem.taxRateからデフォルト価格ルールを生成
INSERT INTO "price_rules" ("tenantId", "menuItemId", "name", "price", "taxRate", "isDefault")
SELECT "tenantId", "id", '通常価格', "price", "taxRate", true
FROM "menu_items";

-- 4. MenuItem.price、MenuItem.taxRate、MenuItem.costPriceフィールドを削除
ALTER TABLE "menu_items" DROP COLUMN "price";
ALTER TABLE "menu_items" DROP COLUMN "taxRate";
ALTER TABLE "menu_items" DROP COLUMN "costPrice";
```

### 2. ガチャメニュー機能の追加

```sql
-- 1. GachaMenuテーブルを作成
CREATE TABLE "gacha_menus" (
  "id" SERIAL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "price" DECIMAL NOT NULL,
  "taxRate" DECIMAL NOT NULL DEFAULT 10,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "startDate" TIMESTAMP,
  "endDate" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);

-- 2. GachaMenuItemテーブルを作成
CREATE TABLE "gacha_menu_items" (
  "id" SERIAL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "gachaMenuId" INTEGER NOT NULL,
  "menuItemId" INTEGER NOT NULL,
  "weight" INTEGER NOT NULL DEFAULT 100,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  FOREIGN KEY ("gachaMenuId") REFERENCES "gacha_menus"("id") ON DELETE CASCADE,
  FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE CASCADE,
  UNIQUE("gachaMenuId", "menuItemId")
);

-- 3. インデックスを作成
CREATE INDEX "gacha_menus_tenantId" ON "gacha_menus"("tenantId");
CREATE INDEX "gacha_menus_isActive" ON "gacha_menus"("isActive");
CREATE INDEX "gacha_menu_items_tenantId" ON "gacha_menu_items"("tenantId");
CREATE INDEX "gacha_menu_items_gachaMenuId" ON "gacha_menu_items"("gachaMenuId");
CREATE INDEX "gacha_menu_items_menuItemId" ON "gacha_menu_items"("menuItemId");

-- 4. Orderテーブルを拡張
ALTER TABLE "orders" ADD COLUMN "isGachaOrder" BOOLEAN NOT NULL DEFAULT false;

-- 5. OrderItemテーブルを拡張
ALTER TABLE "order_items" ADD COLUMN "isGachaResult" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "order_items" ADD COLUMN "gachaMenuId" INTEGER;
ALTER TABLE "order_items" ADD COLUMN "originalPrice" DECIMAL;
```

### 3. プレミアム機能制限の実装

```sql
-- 1. TenantSubscriptionテーブルを拡張
ALTER TABLE "tenant_subscriptions" ADD COLUMN "enableSecretMenu" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenant_subscriptions" ADD COLUMN "enableGachaMenu" BOOLEAN NOT NULL DEFAULT false;

-- 2. Professional以上のプランに対してプレミアム機能を有効化
UPDATE "tenant_subscriptions"
SET "enableSecretMenu" = true, "enableGachaMenu" = true
WHERE "planType" LIKE '%Professional%'
   OR "planType" LIKE '%Enterprise%'
   OR "planType" LIKE '%Ultimate%';
```

## 影響範囲とリスク評価

### 影響を受けるシステム
- hotel-saas: 価格表示・注文処理・管理画面
- hotel-member: 会員価格連携（将来拡張）

### リスク評価
- **高リスク**: MenuItem.priceフィールドの削除（多数の参照箇所変更が必要）
- **中リスク**: 注文処理の変更（ガチャメニュー対応）
- **低リスク**: 新規テーブル追加、TenantSubscription拡張

## 検証計画

1. **単体テスト**: 各テーブルのCRUD操作、価格計算ロジック
2. **統合テスト**: 価格表示、注文処理、プラン制限
3. **E2Eテスト**: 管理画面操作、注文フロー

## ロールバック計画

1. **価格分離**: MenuItem.price/taxRate復元、PriceRuleテーブル削除
2. **ガチャ機能**: 新規テーブル削除、Order/OrderItem拡張フィールド削除
3. **プラン制限**: TenantSubscription拡張フィールド削除

## 承認依頼

本データベース変更リクエストについて、hotel-common統合のための承認をお願いいたします。

- [ ] 承認済み
- [ ] 条件付き承認
- [ ] 却下

コメント:
