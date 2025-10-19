以下をそのまま docs/SET_MENU_SPEC.md や Issue コメントに貼れば、
Cursor / Devin / 他の開発者が読んで実装できるレベル まで落とし込んであります。
（罫線外は説明なのでコピペ不要です）

⸻

🍱 セットメニュー仕様 – MVP

_Last updated: 2025-05-18_

---

## 1. 用語定義

| 用語 | 定義 |
|------|------|
| 単品メニュー (Single) | 1つの料理／ドリンク。MenuItem |
| セットメニュー (Combo) | 複数の単品を束ねた商品。ComboItem |
| 子アイテム (Child) | セットに含まれる単品。childIds で列挙 |
| 必須選択 (Required Option) | セット購入時に必ず1つ選ぶ項目（例：ドリンク：Hot/Cold） |
| 追加選択 (Add-on Option) | 追加料金で選べる項目（例：ポテトLサイズ +¥200） |
| 構造タイプ (Structure Type) | セットの構成方法を定義（カテゴリ型 or 固定アイテム型） |

## 2. 構造タイプ

セットメニューは以下の2種類の構造タイプを持ちます：

### 2.1 カテゴリ型 (CATEGORY)

- 特定のカテゴリ・タグから1つのアイテムを客室が選択
- 選択が必須（未選択の場合はカートに追加不可）
- 例：ランチセットの「メイン料理をお選びください」

### 2.2 固定アイテム型 (FIXED)

- 特定の単品メニューが固定で含まれる
- 客室側での選択は不要
- 例：朝食セットに「トースト」が固定で含まれる

## 3. データモデル（Prisma）

model MenuItem {
  id              Int       @id @default(autoincrement())
  name_ja         String
  name_en         String
  price           Int
  categoryId      Int
  imageUrl        String?
  tags            String[]  @default([])
  isSet           Boolean   @default(false)
  comboMeta       ComboMeta? @relation(fields: [id], references: [id])
}

model ComboMeta {
  id            Int       @id
  menuItem      MenuItem  @relation(fields: [id], references: [id])
  structureType String    // 'CATEGORY' or 'FIXED'
  categoryTagId Int?      // カテゴリ選択型の場合のタグID
  fixedItemId   Int?      // 固定アイテム型の場合のアイテムID
  requiredOpts  Json?     // 必須選択肢 { key, label, choices:[{labelJa,en, priceDiff}] }
  addonOpts     Json?     // 追加選択肢 { 同上 }
  
  @@index([categoryTagId])
  @@index([fixedItemId])
}

model MenuComboItem {
  id          Int       @id @default(autoincrement())
  parentId    Int       // 親メニューID
  childId     Int       // 子メニューID
  quantity    Int       @default(1)
  order       Int       @default(0)
  
  // リレーション
  parent      MenuItem  @relation("ParentMenuItem", fields: [parentId], references: [id])
  child       MenuItem  @relation("ChildMenuItem", fields: [childId], references: [id])
  
  @@unique([parentId, childId])
}

SQLite ➡︎ MySQL/Postgres にそのまま移行可。

⸻

4. モック JSON 例（/mocks/menu-data.json）

{
  "categories": [
    { "id": 3, "name_ja": "セット", "name_en": "Sets" }
  ],
  "items": [
    { 
      "id": 301, 
      "categoryId": 3, 
      "name_ja": "モーニングセット",
      "name_en": "Morning Set", 
      "price": 1200, 
      "tags": [], 
      "isSet": true,
      "structureType": "CATEGORY",
      "categoryTagId": 5,
      "requiredOpts": [
        {
          "key": "drink",
          "label_ja": "ドリンクを選択",
          "label_en": "Choose a drink",
          "choices": [
            { "id": "hot", "label_ja": "ホット", "label_en": "Hot", "price": 0 },
            { "id": "ice", "label_ja": "アイス", "label_en": "Iced", "price": 0 }
          ]
        }
      ],
      "addonOpts": [
        {
          "key": "potato",
          "label_ja": "ポテトをサイズアップ",
          "label_en": "Upgrade fries size",
          "choices": [
            { "id": "l", "label_ja": "Lサイズ +¥200", "label_en": "Size L +¥200", "price": 200 }
          ]
        }
      ]
    },
    {
      "id": 302,
      "categoryId": 3,
      "name_ja": "ブレックファーストセット",
      "name_en": "Breakfast Set",
      "price": 1000,
      "tags": [],
      "isSet": true,
      "structureType": "FIXED",
      "fixedItemId": 101,
      "requiredOpts": [
        {
          "key": "egg",
          "label_ja": "卵の調理法",
          "label_en": "Egg style",
          "choices": [
            { "id": "scrambled", "label_ja": "スクランブル", "label_en": "Scrambled", "price": 0 },
            { "id": "fried", "label_ja": "目玉焼き", "label_en": "Fried", "price": 0 }
          ]
        }
      ],
      "addonOpts": []
    }
  ]
}


⸻

5. API 仕様差分

Method	Path	Body/Query	変更点
GET	/api/v1/menus	–	単品 + isSet: true のアイテムを同列で返す
POST	/api/v1/orders	{ items:[{ menuId, qty, opts?, selectedItemId? }] }	opts に選択結果、selectedItemId にCATEGORYタイプの場合の選択アイテムIDを含める


⸻

6. Pinia ストア拡張

stores/menu.ts
	•	getCombos() : isSet=true の一覧
	•	getComboChildren(id) : childIds→単品取得
	•	getAvailableItemsForCategory(tagId: number): MenuItem[] : カテゴリに含まれる選択可能商品取得

stores/order.ts

type CartItem = {
  menuId: number
  qty: number
  opts?: Record<string, string>   // key: 選択肢key, value: choice id
  selectedItemId?: number // CATEGORY型の場合の選択アイテムID
}


⸻

7. UI 仕様

画面	要件
メニュー一覧	セットには 📦 セットバッジを表示
数量入力	セットも単品と同じ +/- UI（価格はオプション反映後に再計算）
CATEGORY型セット	追加時に選択モーダルを表示、カテゴリ内商品から1つ選択必須
FIXED型セット	カード内にサブキャプションとして固定商品名を表示
オプション選択ダイアログ	- requiredOptsがある場合、必須選択ドロップダウン- addonOptsはチェックボックス／ラジオ- 合計金額を随時更新
注文概要	セット+オプションを展開表示例: モーニングセット (ホットコーヒー選択, ポテト:L) ×1


⸻

8. バリデーション
	1.	CATEGORY型の場合は選択必須（未選択ならカート追加不可）
	2.	requiredOptsが未選択の場合はcart.add()を拒否
	3.	同一セット・同一オプション内容・同一選択商品は同じ行にまとめてqty++
	4.	選択商品の在庫も確認

⸻

9. 今回スコープ外
	•	在庫連動・時間帯別価格
	•	セット内の カスタム変更 (例: 単品を他商品へ差換え)
	•	クーポン・割引計算

⸻

10. 実装 TODO (Devin / Cursor 用ラベル)

ファイル	ラベル
schemas/combo-meta.ts	type
components/menu/MenuCard.vue	ui
components/order/OptionPicker.vue	ui
components/order/CategorySelector.vue	ui
stores/menu.ts / order.ts	state
API モック (server/api/menu.get.ts)	backend


⸻

Last updated: 2025-05-08

⸻
