🗂️ カテゴリ & タグ設計 — MVP

Last updated: 2025-05-08

⸻

1. 用語 & 前提

用語	定義
タグ (Tag)	商品に自由付与する語句。path を スラッシュ区切り (food/meal/sandwich) で階層を表現
カテゴリ (Category)	画面で閲覧する“棚”。検索キーとして Tag.path のプレフィックス を与え、ヒットした商品を並べる
パス (Tag Path)	L1/L2/L3 形式（大/中/小）。不足階層は省略可 (drink/coffee)
エイリアス (Alias)	表示名の多言語・同義語検索用キーワード


⸻

2. データモデル（Prisma）

model MenuItem {
  id       Int      @id @default(autoincrement())
  nameJa   String
  nameEn   String
  price    Int
  imageUrl String?
  tags     Tag[]    @relation("ItemTags", references: [id])
}

model Tag {
  id       Int      @id @default(autoincrement())
  path     String   // 例: "food/meal/sandwich"
  nameJa   String
  nameEn   String
  aliases  String[] @default([]) // 検索用
  items    MenuItem[] @relation("ItemTags")
  @@unique([path])
}

ツリー構造は不要。path を文字列で保持し、prefix 検索で階層を解決。

⸻

3. モックデータ例（/mocks/tag-data.json）

{
  "tags": [
    { "id": 1, "path": "food",                 "name_ja": "フード", "name_en": "Food" },
    { "id": 2, "path": "food/meal",            "name_ja": "食事",   "name_en": "Meal" },
    { "id": 3, "path": "food/meal/sandwich",  "name_ja": "サンドイッチ", "name_en": "Sandwich" }
  ],
  "items": [
    {
      "id": 101,
      "name_ja": "クラブサンドイッチ",
      "name_en": "Club Sandwich",
      "price": 900,
      "tagIds": [1, 2, 3]
    }
  ]
}


⸻

4. 検索ロジック

クエリ	SQL / Prisma 例
大カテゴリ food	WHERE path LIKE 'food/%'
中カテゴリ food/meal	WHERE path LIKE 'food/meal/%'
小カテゴリ完全一致	WHERE path = 'food/meal/sandwich'
エイリアス検索	Postgres: WHERE aliases @> '{burger}'

SQLite MVP では単純 LIKE、Postgres へ移行後は GIN Index で高速化。

⸻

5. API 変更点

Method	Path	Params	説明
GET	/api/v1/menus	?category=food/meal	path LIKE '{param}%' でフィルタ


⸻

6. Pinia ストア追加 API
	•	getLevel1Tags() : path の Level1 を distinct
	•	getChildren(path) : 指定 prefix の下位タグ一覧

⸻

7. UI 仕様

画面	要件
カテゴリタブ	Level1 を横スクロール
サブカテゴリ	Level2 を縦リスト/タブ
商品リスト	選択パス prefix でフィルタ → MenuCard グリッド

	•	タグの nameXX をラベルに使用

⸻

8. バリデーション・運用
	1.	Tag.path 衝突は Prisma @@unique で防止
	2.	Tag 名変更はレコード更新のみで OK
	3.	階層を増やす場合は path を延長

⸻

9. 未決事項（要 Issue 化）

ID	内容	優先度
U-01	並び順フィールド (sort) の導入	★★☆
U-02	カテゴリアイコン (iconUrl)	★☆☆
U-03	Hidden フラグ（非表示タグ）	★☆☆
U-04	全文検索 (MeiliSearch 連携)	☆☆☆


⸻

10. 実装 TODO (ラベル例)

ファイル	ラベル
prisma/schema.prisma 変更	db
server/api/menus.get.ts	backend
components/category/CategoryTabs.vue	ui
stores/tag.ts	state


⸻
