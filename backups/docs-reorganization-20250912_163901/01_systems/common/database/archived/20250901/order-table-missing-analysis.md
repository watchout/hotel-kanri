# Orderテーブル欠落問題の分析

## 問題概要

Orderテーブルが現在のデータベースに存在しないが、マイグレーションファイルには作成コードが含まれており、バックアップファイルにも存在していた。また、schema.prismaにはOrderモデルが定義されていない。

## 調査結果

### 1. マイグレーションファイルの確認

以下のマイグレーションファイルでOrderテーブルの作成が確認できました：

- `prisma/migrations/20250728005730_add_staff_management_system/migration.sql`
  ```sql
  -- CreateTable
  CREATE TABLE "Order" (
      "id" SERIAL NOT NULL,
      "tenantId" TEXT NOT NULL,
      "roomId" TEXT NOT NULL,
      "placeId" INTEGER,
      "status" TEXT NOT NULL DEFAULT 'received',
      "items" JSONB NOT NULL,
      "total" INTEGER NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      "paidAt" TIMESTAMP(3),
      "isDeleted" BOOLEAN NOT NULL DEFAULT false,
      "deletedAt" TIMESTAMP(3),

      CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
  );
  ```

- `prisma/migrations/20250809000000_add_is_deleted_to_order/migration.sql`
  ```sql
  -- AlterTable: Add isDeleted column to Order table
  ALTER TABLE "Order" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

  -- CreateIndex: Create index on isDeleted and paidAt columns for better performance
  CREATE INDEX "Order_isDeleted_paidAt_idx" ON "Order"("isDeleted", "paidAt");
  ```

### 2. バックアップデータベースの確認

`prisma/backups/db-backup-2025-08-11T09-47-40-348Z.sql`にはOrderテーブルの定義が存在します：

```sql
--
-- Name: Order; Type: TABLE; Schema: public; Owner: kaneko
--

CREATE TABLE public."Order" (
    id integer NOT NULL,
    "tenantId" text NOT NULL,
    "roomId" text NOT NULL,
    "placeId" integer,
    status text DEFAULT 'received'::text NOT NULL,
    items jsonb NOT NULL,
    total integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone
);
```

### 3. 現在のデータベース状態

現在のデータベースには`Order`テーブルが存在しません。以下のコマンドで確認しました：

```
psql -h 127.0.0.1 -p 5432 -U kaneko -d hotel_unified_db -c "\dt \"Order\"" -c "\dt \"OrderItem\""
```

結果：
```
Did not find any relation named ""Order"".
Did not find any relation named ""OrderItem"".
```

### 4. schema.prismaの状態

現在の`schema.prisma`ファイルにはOrderモデルが定義されていません。

## 考えられる原因

1. **マイグレーションの失敗**：マイグレーションが実行されたが、何らかの理由で失敗した可能性があります。

2. **データベースのリセット**：マイグレーション後にデータベースがリセットされ、Orderテーブルが削除された可能性があります。

3. **スキーマ同期の問題**：`schema.prisma`とデータベースの同期が取れていない可能性があります。

4. **手動削除**：何らかの理由でOrderテーブルが手動で削除された可能性があります。

5. **マイグレーションの適用漏れ**：マイグレーションが実際には適用されていない可能性があります。

## 解決策

1. **schema.prismaにOrderモデルを追加**：

```prisma
model Order {
  id         Int       @id @default(autoincrement())
  tenantId   String
  roomId     String
  placeId    Int?
  status     String    @default("received")
  items      Json
  total      Int
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  paidAt     DateTime?
  isDeleted  Boolean   @default(false)
  deletedAt  DateTime?
  
  @@index([isDeleted, paidAt])
  @@map("Order")
}

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
  updatedAt   DateTime  @updatedAt
  
  @@map("OrderItem")
}
```

2. **新しいマイグレーションファイルの作成**：

```sql
-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "placeId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'received',
    "items" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_isDeleted_paidAt_idx" ON "Order"("isDeleted", "paidAt");

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" SERIAL NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "menuItemId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- Insert record into DatabaseChangeLog
INSERT INTO "DatabaseChangeLog" ("changeType", "description", "details", "createdBy")
VALUES ('SCHEMA_CHANGE', 'Recreated Order and OrderItem tables', '{"tables": ["Order", "OrderItem"]}', 'system');
```

## 今後の対策

1. **マイグレーション適用の確認**：マイグレーション適用後に必ずテーブルの存在を確認する。

2. **スキーマ同期の定期チェック**：`schema.prisma`とデータベースの構造を定期的に比較し、不一致を検出する。

3. **バックアップの定期取得**：重要なデータベース変更前後にはバックアップを取得する。

4. **マイグレーション履歴の管理**：適用されたマイグレーションの履歴を明確に管理する。

5. **CI/CDでの検証**：デプロイ前にスキーマとデータベースの整合性を検証する。
