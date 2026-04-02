# テーブル名統一マイグレーション計画

**作成日**: 2025-10-03  
**実施日**: 2025-10-03  
**状態**: ✅ **完了**  
**目的**: レガシーPascalCaseテーブル名をsnake_caseに統一  
**影響範囲**: `Order`, `OrderItem` テーブル

---

## ✅ 実施結果

| ステップ | 状態 | 実施時刻 | 備考 |
|---------|------|---------|------|
| Step 1: データ件数確認 | ✅ 完了 | 2025-10-03 | Order: 1件、OrderItem: 1件 |
| Step 2: バックアップ作成 | ✅ 完了 | 2025-10-03 | CSV形式で保存 |
| Step 3: テーブル名変更 | ✅ 完了 | 2025-10-03 | `Order` → `orders`, `OrderItem` → `order_items` |
| Step 4: Prismaスキーマ更新 | ✅ 完了 | 2025-10-03 | `@@map`ディレクティブ追加 |
| Step 5: Prisma Client再生成 | ✅ 完了 | 2025-10-03 | 型定義正常生成 |
| Step 6: データ整合性確認 | ✅ 完了 | 2025-10-03 | 外部キー制約維持確認 |
| Step 7: 最終確認 | ✅ 完了 | 2025-10-03 | 旧テーブル名不存在確認 |

**実施担当**: kaneko  
**所要時間**: 約15分

---

---

## 📊 対象テーブル

| 現在のテーブル名 | 変更後のテーブル名 | データ件数確認 |
|---------------|-----------------|--------------|
| `Order` | `orders` | 要確認 |
| `OrderItem` | `order_items` | 要確認 |

---

## 🔧 マイグレーション手順

### Step 1: データ件数確認

```sql
-- データ件数を確認
SELECT 'Order' as table_name, COUNT(*) as count FROM "Order"
UNION ALL
SELECT 'OrderItem' as table_name, COUNT(*) as count FROM "OrderItem";
```

### Step 2: バックアップ作成

```bash
# データベース全体のバックアップ
pg_dump -U kaneko -d hotel_unified_db -F c -b -v -f "/Users/kaneko/hotel-kanri/backups/db_backup_before_table_rename_$(date +%Y%m%d_%H%M%S).backup"

# 対象テーブルのみのバックアップ（念のため）
pg_dump -U kaneko -d hotel_unified_db -t '"Order"' -t '"OrderItem"' -F c -f "/Users/kaneko/hotel-kanri/backups/order_tables_backup_$(date +%Y%m%d_%H%M%S).backup"
```

### Step 3: テーブル名変更（PostgreSQL）

```sql
-- トランザクション開始
BEGIN;

-- テーブル名変更
ALTER TABLE "Order" RENAME TO "orders";
ALTER TABLE "OrderItem" RENAME TO "order_items";

-- インデックス名も変更（自動で変更されるが、明示的に確認）
-- Prismaが生成したインデックスは自動的にリネームされる

-- 確認
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('orders', 'order_items');

-- 問題なければコミット
COMMIT;

-- 問題があればロールバック
-- ROLLBACK;
```

### Step 4: Prismaスキーマ更新

**ファイル**: `/Users/kaneko/hotel-common/prisma/schema.prisma`

```prisma
// 変更前
model Order {
  // ...
  @@index([tenantId])
  // @@map なし → デフォルトで"Order"テーブル
}

model OrderItem {
  // ...
  @@index([orderId])
  // @@map なし → デフォルトで"OrderItem"テーブル
}
```

```prisma
// 変更後
model Order {
  // ...
  
  @@map("orders")  // ← 追加
  @@index([tenantId])
}

model OrderItem {
  // ...
  
  @@map("order_items")  // ← 追加
  @@index([orderId])
}
```

### Step 5: Prisma Clientの再生成

```bash
cd /Users/kaneko/hotel-common
npx prisma generate
```

### Step 6: アプリケーション動作確認

```bash
# hotel-commonのAPIサーバー起動
cd /Users/kaneko/hotel-common
npm run dev

# 別ターミナルで動作確認
curl -X GET "http://localhost:3400/api/v1/admin/orders" \
  -H "Cookie: session_id=YOUR_SESSION_ID"

# 注文作成テスト
curl -X POST "http://localhost:3400/api/v1/admin/orders" \
  -H "Content-Type: application/json" \
  -H "Cookie: session_id=YOUR_SESSION_ID" \
  -d '{"roomId": "test", "items": [], "total": 0}'
```

### Step 7: hotel-saasの動作確認

```bash
# hotel-saasのサーバー起動
cd /Users/kaneko/hotel-saas
npm run dev

# 管理画面で注文一覧表示確認
# ブラウザで http://localhost:3100/admin にアクセス
```

---

## ⚠️ リスクと注意点

### 高リスク要因
1. **外部キー制約**: `OrderItem`は`Order`を参照
   - PostgreSQLは自動的に更新するが、念のため確認必要
2. **アプリケーション停止時間**: マイグレーション中はAPI停止
3. **Prisma Client再生成**: 型定義が変わるためビルド必要

### 軽減策
1. ✅ **本番前にローカル環境で完全テスト**
2. ✅ **バックアップ必須**
3. ✅ **トランザクション内で実行（即座にロールバック可能）**
4. ✅ **メンテナンスウィンドウ設定**

---

## 🧪 検証チェックリスト

### データベースレベル
- [ ] テーブル名が`orders`, `order_items`に変更されている
- [ ] データ件数が変更前後で一致
- [ ] インデックスが正しく存在
- [ ] 外部キー制約が維持されている
- [ ] シーケンスが正しく動作

### Prismaレベル
- [ ] `npx prisma generate`がエラーなく完了
- [ ] 型定義ファイルが正しく生成
- [ ] `prisma.order.findMany()`が動作

### アプリケーションレベル
- [ ] hotel-common: 注文一覧取得API
- [ ] hotel-common: 注文作成API
- [ ] hotel-common: 注文更新API
- [ ] hotel-saas: 管理画面で注文表示
- [ ] hotel-saas: ダッシュボードの統計表示

---

## 🔄 ロールバック手順

もし問題が発生した場合：

```sql
BEGIN;

-- テーブル名を元に戻す
ALTER TABLE "orders" RENAME TO "Order";
ALTER TABLE "order_items" RENAME TO "OrderItem";

-- 確認
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('Order', 'OrderItem');

COMMIT;
```

その後、Prismaスキーマの`@@map`を削除し、再度`npx prisma generate`を実行。

---

## 📅 実施タイミング

**推奨**: 
- ローカル開発環境: 即座に実施可能
- 本番環境: メンテナンスウィンドウ設定後

**所要時間見積もり**:
- データベース操作: 5分以内
- Prisma Client再生成: 2分
- 動作確認: 15分
- **合計: 約30分**

---

## ✅ 完了後の確認

```sql
-- 最終確認
SELECT 
  tablename,
  schemaname
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('orders', 'order_items', 'Order', 'OrderItem')
ORDER BY tablename;

-- 期待される結果:
-- orders | public
-- order_items | public
-- (Order, OrderItemは表示されないこと)
```

---

**このマイグレーション計画で進めてよろしいでしょうか？**

