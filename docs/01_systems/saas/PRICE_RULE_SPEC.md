# 商品マスタと販売データ分離仕様書

## 1. 概要

商品マスタと販売データを分離することで、キャンペーン価格や会員価格など複数の価格体系に対応します。これにより、同一商品に対して複数の価格設定を柔軟に行うことが可能になります。

## 2. 目的

- キャンペーン時の価格設定を柔軟に行えるようにする
- 会員ランク別の価格設定を可能にする
- 期間限定価格の設定を容易にする
- データ管理の一貫性を向上させる

## 3. データモデル

### 3.1 MenuItem テーブル（既存・変更）

商品マスタテーブルから価格関連情報を分離し、基本情報のみを保持します。

```prisma
model MenuItem {
  id               Int             @id @default(autoincrement())
  tenantId         String
  name             String          // 商品名
  nameJa           String          // 商品名（日本語）
  description      String?         // 説明
  descriptionJa    String?         // 説明（日本語）
  categoryId       Int?            // カテゴリID
  imageUrl         String?         // 画像URL
  stockAvailable   Boolean         @default(true)  // 在庫あり/なし
  stockQty         Int?            // 在庫数量
  isSecret         Boolean         @default(false) // 裏メニューフラグ
  secretCode       String?         // 裏メニューコード
  isSet            Boolean         @default(false) // セットメニューフラグ
  isFeatured       Boolean         @default(false) // おすすめフラグ
  showFrom         DateTime?       // 表示開始日時
  showTo           DateTime?       // 表示終了日時
  isPreview        Boolean         @default(false) // プレビューフラグ
  showRankingDay   Boolean         @default(true)  // 日間ランキング表示
  showRankingWeek  Boolean         @default(true)  // 週間ランキング表示
  showRankingMonth Boolean         @default(true)  // 月間ランキング表示
  sortOrder        Int             @default(0)     // 表示順
  categoryOrder    Int             @default(0)     // カテゴリ内表示順
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  // 削除されるフィールド
  // price            Int             // 価格
  // taxRate          Int             @default(10)  // 税率
  // costPrice        Int?            // 原価

  // リレーション
  tenant           Tenant          @relation(fields: [tenantId], references: [id])
  category         Category?       @relation(fields: [categoryId], references: [id])
  orderItems       OrderItem[]
  priceRules       PriceRule[]     // 新規リレーション
}
```

### 3.2 PriceRule テーブル（新規）

販売データを管理する新しいテーブルです。

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

## 4. 機能詳細

### 4.1 価格ルール管理

- 商品ごとに複数の価格ルールを設定可能
- 各価格ルールに適用期間を設定可能
- 会員ランクごとの価格設定が可能
- キャンペーンに紐づく価格設定が可能
- デフォルト価格を指定可能

### 4.2 価格決定ロジック

商品の表示価格は以下の優先順位で決定されます：

1. 現在適用中（startDate ≤ 現在時刻 ≤ endDate）
2. 会員ランク一致（ログインユーザーの会員ランクに一致）
3. キャンペーン適用中（関連キャンペーンが有効）
4. 優先度（priority値が高いもの）
5. デフォルト価格（isDefault = true）

```javascript
async function getApplicablePrice(menuItemId, userId = null, now = new Date()) {
  // ユーザーの会員ランクを取得（ログイン済みの場合）
  let memberRankId = null;
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { memberRankId: true }
    });
    memberRankId = user?.memberRankId;
  }

  // 適用可能な価格ルールを検索
  const priceRules = await prisma.priceRule.findMany({
    where: {
      menuItemId,
      AND: [
        { OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ]},
        { OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]}
      ],
      OR: [
        { memberRankId: null },
        { memberRankId: memberRankId }
      ]
    },
    orderBy: [
      { memberRankId: memberRankId ? 'desc' : 'asc' },
      { priority: 'desc' },
      { isDefault: 'desc' }
    ]
  });

  // 最適な価格ルールを返す
  return priceRules[0] || null;
}
```

### 4.3 管理画面機能

- 商品編集画面に価格ルール管理セクションを追加
- 価格ルール一覧表示
- 新規価格ルール追加
- 既存価格ルール編集・削除
- 期間設定用のカレンダーUI
- 会員ランク選択UI
- キャンペーン連携UI

### 4.4 フロントエンド表示

- 通常価格と割引価格の表示
- 期間限定価格の表示（「期間限定」バッジ付き）
- 会員価格の表示（会員ランク表示付き）
- キャンペーン価格の表示（キャンペーン名表示付き）

## 5. 移行計画

### 5.1 データ移行手順

1. 新しいPriceRuleテーブルを作成
2. 既存のMenuItem.priceとMenuItem.taxRateからデフォルト価格ルールを生成
3. MenuItem.priceとMenuItem.taxRateフィールドを削除（または非推奨化）

```javascript
// 移行スクリプト例
async function migrateMenuItemPrices() {
  const menuItems = await prisma.menuItem.findMany();

  for (const item of menuItems) {
    await prisma.priceRule.create({
      data: {
        tenantId: item.tenantId,
        menuItemId: item.id,
        name: '通常価格',
        price: item.price,
        taxRate: item.taxRate || 10,
        isDefault: true,
        priority: 0
      }
    });
  }

  console.log(`${menuItems.length}件の商品価格を移行しました`);
}
```

### 5.2 API変更

- 商品取得APIを更新し、適用価格を含める
- 価格ルール管理APIを追加
- 価格計算ロジックをサーバーサイドに実装

## 6. テスト計画

### 6.1 単体テスト

- 価格ルール取得ロジックのテスト
- 優先度計算ロジックのテスト
- 期間適用ロジックのテスト

### 6.2 統合テスト

- 商品取得APIと価格表示の整合性テスト
- 注文処理と価格計算の整合性テスト
- キャンペーンと価格連携のテスト

## 7. 将来拡張予定

- 数量割引（まとめ買い割引）
- クーポン連携
- 時間帯別価格設定（ランチタイム価格など）
- 曜日別価格設定
