# 🍱 メニュー管理機能 開発タスク

## 1. 概要

ホテル客室向けメニュー管理システムを実装します。カテゴリ管理、メニュー管理、セットメニュー、在庫管理、期間限定商品などの機能を含みます。

## 2. データモデル拡張

### 2.1 Prismaスキーマ拡張

```prisma
// MenuItem拡張
model MenuItem {
  id              Int           @id @default(autoincrement())
  name_ja         String
  name_en         String
  description_ja  String?
  description_en  String?
  price           Int
  categoryId      Int
  imageUrl        String?
  stockAvailable  Boolean       @default(true)
  stockQty        Int?          // 数量管理用（nullは無制限）
  isSecret        Boolean       @default(false) // 裏メニューフラグ
  secretCode      String?       // 6文字のアクセスコード
  isSet           Boolean       @default(false) // セットメニューフラグ
  isFeatured      Boolean       @default(false) // おすすめフラグ
  showFrom        DateTime?     // 表示開始日時
  showTo          DateTime?     // 表示終了日時
  isPreview       Boolean       @default(false) // 事前公開フラグ
  showRankingDay  Boolean       @default(true)  // 日間ランキング表示
  showRankingWeek Boolean       @default(true)  // 週間ランキング表示
  showRankingMonth Boolean      @default(true)  // 月間ランキング表示
  order           Int           @default(0)     // 表示順
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  isDeleted       Boolean       @default(false)
  deletedAt       DateTime?
  
  // リレーション
  category        Category      @relation(fields: [categoryId], references: [id])
  assets          MenuAsset[]   // 画像・動画
  tags            Tag[]         // タグ（多対多）
  comboDetails    ComboMeta?    // セットメニュー詳細
  childItems      MenuComboItem[] @relation("ParentMenuItem") // 子アイテム
  parentSets      MenuComboItem[] @relation("ChildMenuItem")  // 親アイテム
}

// タグモデル
model Tag {
  id          Int        @id @default(autoincrement())
  path        String     // 階層パス（例: food/main/sandwich）
  name_ja     String
  name_en     String
  aliases     String[]   // 検索用キーワード
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  // リレーション
  menuItems   MenuItem[]

  @@unique([path])
}

// セットメニュー詳細
model ComboMeta {
  id            Int       @id
  menuItem      MenuItem  @relation(fields: [id], references: [id])
  structureType String    // 'CATEGORY' or 'FIXED'
  categoryTagId Int?      // カテゴリ選択型の場合のタグID
  fixedItemId   Int?      // 固定アイテム型の場合のアイテムID
  requiredOpts  Json?     // 必須選択肢
  addonOpts     Json?     // 追加選択肢
  
  @@index([categoryTagId])
  @@index([fixedItemId])
}

// セットメニュー中間テーブル
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
  @@index([parentId])
  @@index([childId])
}

// メニュー画像・動画
model MenuAsset {
  id          Int       @id @default(autoincrement())
  menuItemId  Int
  url         String
  type        String    // 'IMAGE' or 'VIDEO'
  order       Int       @default(0)
  createdAt   DateTime  @default(now())
  
  // リレーション
  menuItem    MenuItem  @relation(fields: [menuItemId], references: [id])
  
  @@index([menuItemId])
}

// 在庫更新履歴
model StockUpdateLog {
  id           Int      @id @default(autoincrement())
  menuItemId   Int
  oldQuantity  Int?
  newQuantity  Int?
  updatedBy    String
  reason       String?  // 更新理由
  createdAt    DateTime @default(now())
  
  @@index([menuItemId])
  @@index([createdAt])
}
```

## 3. 開発タスク一覧

| ID    | 内容                                | 優先度 | DoD                          |
|-------|-------------------------------------|--------|------------------------------|
| MX-1  | Tag & MenuCombo Prismaスキーマ拡張  | 高     | migrate dev OK               |
| MX-2  | Combo編集UI (必須/追加オプション)   | 高     | UX ≥ 4/5                    |
| MX-3  | 裏メニューコード認証フロー実装      | 中     | Playwright テスト緑          |
| MX-4  | 複数画像・動画アップローダー実装    | 中     | 画像3+動画1 保存OK           |
| MX-5  | ランキング設定 API/UI実装           | 中     | TTL cache 30m確認            |
| MX-6  | SetMenu構造タイプ選択UI実装         | 高     | 選択→保存→客室UI正常         |
| MX-7  | ランキング集計Cron Job実装(6時間毎) | 中     | Redis key更新・CI緑          |
| MX-8  | 在庫管理システム実装                | 高     | 注文→在庫減→SOLD OUT表示     |
| MX-9  | 表示期間制御とプレビュー表示        | 低     | 時間切替で表示/非表示動作確認 |
| MX-10 | タグ階層管理UI実装                  | 中     | パス保存・階層表示確認       |

## 4. UI実装詳細

### 4.1 メニュー管理画面拡張

1. **基本情報タブ**
   - メニュー名（日/英）
   - 価格
   - 説明（日/英）
   - カテゴリ選択
   - 表示順
   - 有効/無効切替

2. **セットメニュータブ**（isSet=trueの場合表示）
   - 構造タイプ選択（カテゴリ型/固定アイテム型）
   - カテゴリ型：カテゴリ/タグ選択UI
   - 固定アイテム型：メニューアイテム選択UI
   - 必須オプション設定（ドラッグ並べ替え可能なリスト）
   - 追加オプション設定（価格差分入力フィールド付き）

3. **在庫・表示タブ**
   - 在庫数管理（有限/無制限切替）
   - 表示期間設定（日時選択）
   - プレビューフラグ切替
   - 裏メニュー設定（シークレットコード生成）
   - おすすめフラグ切替
   - ランキング表示設定（日/週/月）

4. **メディアタブ**
   - 複数画像アップロード（ドラッグ&ドロップ対応）
   - 動画アップロード
   - メディア順序並べ替え
   - プレビュー表示

### 4.2 タグ管理画面

1. **タグ階層管理UI**
   - パス入力（L1/L2/L3形式）
   - 名称入力（日/英）
   - エイリアス追加フィールド
   - ツリービュー表示

### 4.3 ランキング設定画面

1. **ランキング管理**
   - 集計期間設定（日/週/月）
   - 手動ランキング調整
   - 最終更新時間表示
   - 次回更新予定時間表示

## 5. API実装詳細

### 5.1 管理者API

```
GET    /api/v1/admin/menu                - メニュー一覧取得
POST   /api/v1/admin/menu                - 新規メニュー作成
GET    /api/v1/admin/menu/:id            - メニュー詳細取得
PUT    /api/v1/admin/menu/:id            - メニュー更新
DELETE /api/v1/admin/menu/:id            - メニュー削除
POST   /api/v1/admin/menu/:id/assets     - メディアアップロード
PUT    /api/v1/admin/menu/:id/assets/:aid - メディア順序更新
DELETE /api/v1/admin/menu/:id/assets/:aid - メディア削除
POST   /api/v1/admin/menu/:id/stock      - 在庫数更新

GET    /api/v1/admin/tags                - タグ一覧取得
POST   /api/v1/admin/tags                - 新規タグ作成
PUT    /api/v1/admin/tags/:id            - タグ更新
DELETE /api/v1/admin/tags/:id            - タグ削除
```

### 5.2 客室UI用API

```
GET    /api/v1/menus                     - メニュー一覧取得
GET    /api/v1/menus?category=food/main  - カテゴリフィルタ
GET    /api/v1/menus?featured=true       - おすすめ商品取得
GET    /api/v1/menus?ranking=day|week|month - ランキング取得
POST   /api/v1/menus/secret              - シークレットコード認証
GET    /api/v1/menus/:id                 - メニュー詳細取得
GET    /api/v1/tags                      - タグ一覧取得
```

### 5.3 バッチ処理API

```
POST   /api/_cron/ranking                - ランキング再計算（6時間毎）
POST   /api/_cron/menu-visibility        - 表示期間による表示/非表示切替（1時間毎）
```

## 6. 実装順序

1. **データベースマイグレーション**
   - Prismaスキーマ拡張
   - マイグレーション実行

2. **基本API実装**
   - CRUD操作API
   - タグ管理API

3. **UI実装**
   - 基本メニュー管理画面拡張
   - セットメニュー編集UI
   - タグ管理UI

4. **高度な機能実装**
   - 在庫管理システム
   - 裏メニュー認証フロー
   - ランキングシステム
   - 表示期間制御

5. **バッチ処理**
   - ランキング再計算Cron
   - 表示期間チェックCron

## 7. 注意点・制約事項

1. **MVPスコープ**
   - 複数画像・動画対応は必須
   - ランキング機能は6時間ごとの更新で対応
   - 在庫数管理はMVPでも実装

2. **将来拡張**
   - 会員限定価格やVIP用裏メニューは今回実装
   - 多言語対応は現在日英のみ、将来的に拡張予定

3. **パフォーマンス**
   - ランキングはRedisキャッシュ（TTL 30分）を活用
   - 画像最適化処理を実装（サイズ・形式変換）

4. **セキュリティ**
   - 裏メニューコードは安全な生成方法を採用
   - 画像アップロードのバリデーション強化 