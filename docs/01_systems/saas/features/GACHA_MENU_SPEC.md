# ガチャメニュー機能仕様書

## 1. 概要

ガチャメニュー機能は、顧客がランダムに選ばれる商品を注文できる機能です。Professional以上のプランで利用可能なプレミアム機能として提供されます。

## 2. 目的

- 顧客に新しい注文体験を提供
- 在庫管理の柔軟性向上
- 特定商品の販売促進

## 3. データモデル

### 3.1 GachaMenuテーブル
```prisma
model GachaMenu {
  id              Int       @id @default(autoincrement())
  tenantId        String
  name            String    // ガチャ名称
  description     String?   // 説明
  price           Decimal   // ガチャ実行価格
  taxRate         Decimal   // 税率
  imageUrl        String?   // ガチャ画像
  isActive        Boolean   @default(true) // 有効/無効
  startDate       DateTime? // 提供開始日時
  endDate         DateTime? // 提供終了日時
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  items           GachaMenuItem[]
}
```

### 3.2 GachaMenuItemテーブル
```prisma
model GachaMenuItem {
  id              Int       @id @default(autoincrement())
  tenantId        String
  gachaMenuId     Int
  menuItemId      Int
  weight          Int       @default(100) // 出現確率の重み（高いほど出やすい）
  isActive        Boolean   @default(true) // 有効/無効（在庫切れ等で無効化可能）
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  gachaMenu       GachaMenu @relation(fields: [gachaMenuId], references: [id])
  menuItem        MenuItem  @relation(fields: [menuItemId], references: [id])
}
```

## 4. 機能詳細

### 4.1 ガチャメニュー作成
- 管理者がガチャメニューを作成
- 名称、説明、価格、画像などを設定
- 提供期間の設定（オプション）

### 4.2 ガチャ対象商品登録
- 既存のメニューアイテムからガチャ対象商品を選択
- **デフォルトは全ての登録商品が同じ確率（weight=100）**
- 複数の商品をガチャに含めることが可能

### 4.3 確率設定
- 各商品の出現確率を「重み（weight）」で調整可能
- 重みが高いほど出現確率が高くなる
- 例：商品A（weight=200）、商品B（weight=100）の場合、商品Aが出る確率は商品Bの2倍
- **在庫状況に応じて管理画面から任意で確率を変更可能**

### 4.4 顧客向けUI
- ガチャメニュー一覧表示
- ガチャ実行ボタン
- ガチャ結果表示（アニメーション効果付き）
- 結果商品のカートへの追加

### 4.5 キッチン・スタッフ向け表示
- **オーダー管理画面では実際に提供する商品名で表示**
- **商品名の後ろに「（ガチャメニュー）」と表示**
- 例：「和牛ステーキ（ガチャメニュー）」

## 5. ガチャ実行フロー

1. 顧客がガチャメニューを選択
2. ガチャ実行ボタンをタップ
3. サーバーサイドで確率計算を実行
   ```javascript
   function selectRandomItem(gachaItems) {
     // 全アイテムの重みの合計を計算
     const totalWeight = gachaItems.reduce((sum, item) => sum + item.weight, 0);

     // 0～totalWeight-1の範囲でランダムな数値を生成
     const randomValue = Math.floor(Math.random() * totalWeight);

     // 重みに基づいてアイテムを選択
     let weightSum = 0;
     for (const item of gachaItems) {
       weightSum += item.weight;
       if (randomValue < weightSum) {
         return item;
       }
     }

     // 万が一のためのフォールバック
     return gachaItems[0];
   }
   ```
4. 選ばれた商品を結果として返却
5. 結果をアニメーションで表示
6. 顧客が注文を確定

## 6. 管理画面機能

### 6.1 ガチャメニュー管理
- ガチャメニュー一覧表示
- 新規作成、編集、削除機能
- 有効/無効切り替え

### 6.2 ガチャ対象商品管理
- ガチャに含める商品の追加/削除
- **確率（重み）の設定**
  - スライダーUIで直感的に設定可能
  - 数値入力も可能
  - 全商品の確率を均等にするリセットボタン
- 商品ごとの有効/無効切り替え

### 6.3 在庫連動機能
- **在庫状況に応じた確率自動調整機能（オプション）**
- 在庫が少ない商品は自動的に確率を下げる設定
- 在庫切れ商品の自動除外設定

## 7. オーダー処理

### 7.1 注文データ構造
```javascript
{
  id: "order_123",
  items: [
    {
      id: "item_456",
      name: "和牛ステーキ",
      price: 3000,
      quantity: 1,
      isGachaResult: true,  // ガチャ結果フラグ
      gachaMenuId: "gacha_789",  // 元のガチャメニューID
      gachaMenuName: "シェフのおすすめガチャ"  // ガチャメニュー名
    }
  ],
  // その他の注文情報
}
```

### 7.2 キッチン表示
- オーダー管理画面では実際の商品名で表示
- **商品名の後に「（ガチャメニュー）」と表示**
- ガチャ由来の注文は視覚的に区別（アイコンや色分け）

### 7.3 会計処理
- ガチャメニューの価格で会計処理
- レシートにはガチャメニュー名と実際の提供商品名を両方表示

## 8. 分析・レポート

### 8.1 ガチャ実行統計
- ガチャメニューごとの実行回数
- 時間帯別、曜日別の実行統計
- 商品別の当選回数と確率

### 8.2 売上分析
- ガチャメニューによる売上集計
- 通常メニューとの売上比較
- 顧客層分析

## 9. 制限事項

- Professional以上のプランでのみ利用可能
- 1つのガチャに含められる商品数は最大30個まで
- アレルギー情報は必ず表示（食品安全のため）

## 10. 将来拡張予定

- 期間限定ガチャの自動スケジュール機能
- 会員ランクによる特別ガチャ
- ガチャ結果共有機能（SNS連携）

## 11. 技術要件

- ランダム選択はサーバーサイドで実行（公平性担保）
- 確率操作の監査ログを保存
- パフォーマンス要件：ガチャ実行から結果表示まで1秒以内
