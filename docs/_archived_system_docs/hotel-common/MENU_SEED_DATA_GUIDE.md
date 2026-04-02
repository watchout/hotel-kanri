# メニューシードデータガイド

## 概要

hotel-commonシステムのオーダー機能用メニュー・カテゴリのベースデータを作成するためのガイドです。

## 作成日

2025-10-10

## データ構造

### メニューカテゴリ（MenuCategory）

階層構造を持つメニューカテゴリ：

#### メインカテゴリ（4種類）

1. **お食事** (Food)
2. **お飲み物** (Drinks)  
3. **デザート** (Desserts)
4. **アルコール** (Alcoholic Beverages)

#### サブカテゴリ（5種類）

- **朝食** (Breakfast) - お食事配下
- **ランチ** (Lunch) - お食事配下
- **ディナー** (Dinner) - お食事配下
- **コーヒー・紅茶** (Coffee & Tea) - お飲み物配下
- **ソフトドリンク** (Soft Drinks) - お飲み物配下

### メニュー項目（MenuItem）

合計26種類のメニュー項目が登録されます：

#### 朝食メニュー（3品）
- アメリカンブレックファスト - ¥2,800
- 和朝食 - ¥2,500
- エッグベネディクト - ¥2,200 ★注目

#### ランチメニュー（4品）
- ビーフカレー - ¥1,800 ★注目
- スパゲッティカルボナーラ - ¥1,600
- ハンバーガーセット - ¥2,000
- シーザーサラダ - ¥1,400

#### ディナーメニュー（4品）
- ビーフステーキ（200g） - ¥5,800 ★注目
- グリルサーモン - ¥3,800
- マルゲリータピザ - ¥2,200
- 海鮮リゾット - ¥2,800

#### コーヒー・紅茶（4品）
- ブレンドコーヒー - ¥600
- カフェラテ - ¥750
- 紅茶（ダージリン） - ¥650
- 抹茶ラテ - ¥850

#### ソフトドリンク（3品）
- オレンジジュース - ¥700
- コーラ - ¥500
- ミネラルウォーター - ¥400

#### デザート（4品）
- ティラミス - ¥900 ★注目
- チーズケーキ - ¥850
- アイスクリーム（3種） - ¥750
- フルーツプレート - ¥1,200

#### アルコール（4品）
- ビール（生） - ¥900 🔞
- ハイボール - ¥800 🔞
- 赤ワイン（グラス） - ¥1,000 🔞
- 日本酒（冷酒） - ¥1,200 🔞

## 使用方法

### 1. シードデータの投入

```bash
# npm scriptを使用（推奨）
npm run seed:menu

# または直接実行
npx ts-node scripts/seed-menu-data.ts
```

### 2. データの確認

```bash
# 確認スクリプトを実行
node check-menu-data.js
```

## データの特徴

### 多言語対応
- 日本語（nameJa, descriptionJa）
- 英語（nameEn, descriptionEn）

### メニュー属性
- **価格管理**: 販売価格（price）と原価（cost）を記録
- **在庫管理**: 在庫有無フラグと在庫数を管理可能
- **表示制御**: 
  - `isAvailable`: 販売中/販売停止
  - `isFeatured`: 注目メニュー（★マーク）
  - `displayOrder`: 表示順序
- **年齢制限**: アルコール商品には`ageRestricted: true`を設定
- **アレルゲン情報**: 配列形式で登録（卵、小麦、乳、魚、など）
- **タグ**: 検索・フィルタリング用のタグ

### テナント対応
- システム内の全テナントに対して自動的にデータを作成
- 各テナント独立したメニュー管理が可能

## 重要な注意事項

### 既存データの保護
- スクリプトは既存のカテゴリが存在する場合、そのテナントのデータ作成をスキップします
- データの重複作成を防ぎます

### マルチテナント対応
- 各テナントごとに独立したメニューセットが作成されます
- テナントIDで完全に分離されています

### ソフトデリート対応
- `isDeleted`フラグで論理削除に対応
- 削除データも履歴として保持されます

## データベーススキーマ

### テーブル構造

```sql
-- メニューカテゴリ
menu_categories (
  id              SERIAL PRIMARY KEY,
  tenant_id       TEXT NOT NULL,
  name_ja         VARCHAR(255) NOT NULL,
  name_en         VARCHAR(255),
  description_ja  TEXT,
  description_en  TEXT,
  parent_id       INTEGER REFERENCES menu_categories(id),
  sort_order      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW(),
  is_deleted      BOOLEAN DEFAULT false,
  deleted_at      TIMESTAMP,
  deleted_by      TEXT
)

-- メニュー項目
menu_items (
  id                SERIAL PRIMARY KEY,
  tenant_id         TEXT NOT NULL,
  name_ja           VARCHAR(255) NOT NULL,
  name_en           VARCHAR(255),
  description_ja    TEXT,
  description_en    TEXT,
  price             INTEGER NOT NULL,
  cost              INTEGER DEFAULT 0,
  category_id       INTEGER REFERENCES menu_categories(id),
  image_url         VARCHAR(500),
  is_available      BOOLEAN DEFAULT true,
  is_featured       BOOLEAN DEFAULT false,
  is_hidden         BOOLEAN DEFAULT false,
  display_order     INTEGER DEFAULT 0,
  start_time        TIME,
  end_time          TIME,
  age_restricted    BOOLEAN DEFAULT false,
  stock_available   BOOLEAN DEFAULT true,
  stock_quantity    INTEGER,
  low_stock_threshold INTEGER DEFAULT 5,
  tags              JSON DEFAULT '[]',
  images            JSON DEFAULT '[]',
  nutritional_info  JSON DEFAULT '{}',
  allergens         JSON DEFAULT '[]',
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW(),
  is_deleted        BOOLEAN DEFAULT false,
  deleted_at        TIMESTAMP,
  deleted_by        TEXT
)
```

## カスタマイズ方法

### メニュー項目の追加

`scripts/seed-menu-data.ts`を編集して、新しいメニュー項目を追加できます：

```typescript
const newItems = [
  {
    nameJa: '新メニュー',
    nameEn: 'New Menu',
    descriptionJa: '説明',
    descriptionEn: 'Description',
    price: 1500,
    cost: 600,
    categoryId: categoryId, // カテゴリID
    tags: ['タグ1', 'タグ2'],
    allergens: ['アレルゲン1'],
    isFeatured: false // 注目メニューにする場合はtrue
  }
];
```

### カテゴリの追加

メインカテゴリやサブカテゴリを追加する場合も同様にスクリプトを編集します。

## トラブルシューティング

### エラー: テナントが見つかりません

```bash
# テナントを先に作成してください
npm run seed:tenants
```

### エラー: 既にデータが存在します

既存データがある場合は自動的にスキップされます。再作成したい場合は、既存データを削除してから実行してください。

### データの削除

```sql
-- 特定のテナントのメニューデータを削除（論理削除）
UPDATE menu_items SET is_deleted = true WHERE tenant_id = 'テナントID';
UPDATE menu_categories SET is_deleted = true WHERE tenant_id = 'テナントID';

-- 物理削除（注意: データが完全に失われます）
DELETE FROM menu_items WHERE tenant_id = 'テナントID';
DELETE FROM menu_categories WHERE tenant_id = 'テナントID';
```

## 関連ファイル

- `/scripts/seed-menu-data.ts` - シードデータ投入スクリプト
- `/check-menu-data.js` - データ確認スクリプト
- `/prisma/schema.prisma` - データベーススキーマ定義
- `/prisma/migrations_manual/CREATE_MENU_TABLES.sql` - テーブル作成SQL

## 更新履歴

- 2025-10-10: 初版作成（メニュー26品目、カテゴリ9種類）

