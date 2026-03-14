# ガチャメニュー結果表示タイプ追加の変更申請

## 概要
ガチャメニュー機能に「結果表示タイプ」の設定を追加し、ガチャの結果をすぐに表示するか、商品が届くまで非表示にするかを選択できるようにします。

## 変更内容

### GachaMenuテーブルに新しいフィールドを追加

```prisma
model GachaMenu {
  // 既存フィールド
  id              Int       @id @default(autoincrement())
  tenantId        String
  name            String
  description     String?
  price           Decimal
  taxRate         Decimal
  imageUrl        String?
  isActive        Boolean   @default(true)
  startDate       DateTime?
  endDate         DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // 追加するフィールド
  resultDisplayType String   @default("immediate") // "immediate" または "surprise"

  // リレーション
  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  items           GachaMenuItem[]

  // インデックス
  @@index([tenantId])
  @@index([isActive])
  @@map("gacha_menus")
}
```

## 変更理由
ガチャメニューの醍醐味として、注文した商品が届くまで何が当たったかわからない「サプライズ」タイプのガチャを提供したいというユーザー要望があります。現在のシステムでは、ガチャを引いた時点で結果が表示されますが、この変更により、ホテルの運営方針に応じて結果表示方法を選択できるようになります。

## 影響範囲
- `GachaMenu`テーブルにカラム追加
- ガチャメニュー作成・編集画面のUI変更
- ガチャ実行APIの動作変更（結果表示タイプに応じて返すデータを制御）

## リスク評価
- **低リスク**: デフォルト値が設定されているため、既存のガチャメニューは「immediate」（即時表示）モードとして動作します。
- 既存機能への影響は最小限で、後方互換性が保たれます。

## 実装計画
1. hotel-common統合DBへの変更申請
2. スキーマ変更後、管理画面UIの更新
3. ガチャ実行APIの更新
4. フロントエンドの表示ロジック更新

## 申請者
AI開発チーム

## 申請日
2025年8月1日
