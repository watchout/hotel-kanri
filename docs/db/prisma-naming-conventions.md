# Prisma命名規則

> ⚠️ **非推奨（DEPRECATED）**  
> このドキュメントは古いバージョンです。  
> **最新版はこちら**: [DATABASE_NAMING_STANDARD.md](../standards/DATABASE_NAMING_STANDARD.md) v3.0.0  
> 策定日: 2025-10-03

**作成日**: 2025年8月20日  
**最終更新**: 2025年8月20日  
**旧ステータス**: ~~強制適用~~  
**適用範囲**: 全システム（hotel-saas, hotel-pms, hotel-member, hotel-common）

---

> ⚠️ **重要な変更点**  
> - データベースカラム名は`snake_case`必須（PostgreSQL標準）
> - Prismaフィールドは`camelCase`で`@map`ディレクティブ必須
> - 既存テーブルは現状維持（混在を許容）  

## 1. 目的

このドキュメントは、Prismaスキーマにおけるモデル、フィールド、リレーション、および関連するコードの命名規則を定義し、一貫性のある実装を促進することを目的としています。

## 2. モデル命名規則

### 2.1 基本ルール

- モデル名は**パスカルケース**（PascalCase）を使用
- 単数形を使用（例: `User` ではなく `Users` ではない）
- 明確で説明的な名前を使用
- プレフィックスやサフィックスは避ける（例外: 特定のドメイン固有のプレフィックスは許可）

### 2.2 例

```prisma
// ✅ 良い例
model User { ... }
model ReservationDetail { ... }
model PaymentTransaction { ... }

// ❌ 悪い例
model users { ... }           // 複数形、小文字
model tbl_customer { ... }    // プレフィックス
model UserTable { ... }       // サフィックス
```

## 3. フィールド命名規則

### 3.1 基本ルール

- フィールド名は**キャメルケース**（camelCase）を使用
- 明確で説明的な名前を使用
- 型を名前に含めない（例: `userString` ではなく `user`）
- ブール型フィールドは `is`、`has`、`can` などのプレフィックスを使用

### 3.2 ID・主キー

- 主キーは `id` を使用
- 外部キーは `{関連モデル名}Id` の形式を使用（キャメルケース）

### 3.3 日時フィールド

- 作成日時: `createdAt`
- 更新日時: `updatedAt`
- 削除日時（ソフトデリート）: `deletedAt`

### 3.4 例

```prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  firstName     String
  lastName      String
  isActive      Boolean   @default(true)
  hasVerified   Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?
  profileId     String?   @unique
  profile       Profile?  @relation(fields: [profileId], references: [id])
  reservations  Reservation[]
}
```

## 4. リレーション命名規則

### 4.1 基本ルール

- リレーションフィールド名は関連するモデルの名前を反映
- 一対一: 単数形の関連モデル名（例: `profile`）
- 一対多: 複数形の関連モデル名（例: `reservations`）
- 多対多: 複数形の関連モデル名（例: `categories`）

### 4.2 例

```prisma
model User {
  id           String        @id @default(uuid())
  profile      Profile?      // 一対一
  reservations Reservation[] // 一対多
}

model Profile {
  id     String @id @default(uuid())
  user   User   @relation(fields: [userId], references: [id])
  userId String @unique
}

model Reservation {
  id     String @id @default(uuid())
  user   User   @relation(fields: [userId], references: [id])
  userId String
}

model Post {
  id         String     @id @default(uuid())
  categories Category[] @relation("PostToCategory") // 多対多
}

model Category {
  id    String @id @default(uuid())
  posts Post[] @relation("PostToCategory") // 多対多
}
```

## 5. 中間テーブル命名規則

### 5.1 基本ルール

- 中間テーブル名は関連する両方のモデル名を結合（アルファベット順）
- 明示的に中間テーブルを定義する場合は、`_` プレフィックスは使用しない

### 5.2 例

```prisma
// 暗黙的な中間テーブル（Prismaが自動生成）
model Post {
  id         String     @id @default(uuid())
  categories Category[] // _PostToCategory という中間テーブルが自動生成される
}

model Category {
  id    String @id @default(uuid())
  posts Post[]
}

// 明示的な中間テーブル
model PostCategory {
  post       Post     @relation(fields: [postId], references: [id])
  postId     String
  category   Category @relation(fields: [categoryId], references: [id])
  categoryId String
  assignedAt DateTime @default(now())

  @@id([postId, categoryId])
}
```

## 6. 列挙型命名規則

### 6.1 基本ルール

- 列挙型名は**パスカルケース**（PascalCase）を使用
- 列挙値は**スネークケースの大文字**（UPPER_SNAKE_CASE）を使用

### 6.2 例

```prisma
enum UserRole {
  ADMIN
  STAFF
  GUEST
}

enum ReservationStatus {
  PENDING
  CONFIRMED
  CHECKED_IN
  CHECKED_OUT
  CANCELLED
}
```

## 7. アダプターレイヤー命名規則

### 7.1 基本ルール

- アダプタークラス名は `{モデル名}Adapter` の形式を使用
- メソッド名は操作を明確に表す動詞から始める
  - 取得: `findById`, `findAll`, `findByEmail` など
  - 作成: `create`, `createMany` など
  - 更新: `update`, `updateMany` など
  - 削除: `delete`, `deleteMany` など

### 7.2 例

```typescript
export class UserAdapter {
  async findById(id: string) { ... }
  async findByEmail(email: string) { ... }
  async findAll(options?: { limit?: number; offset?: number }) { ... }
  async create(data: CreateUserDto) { ... }
  async update(id: string, data: UpdateUserDto) { ... }
  async delete(id: string) { ... }
}
```

## 8. ファイル構造と命名規則

### 8.1 基本ルール

- Prismaスキーマファイル: `prisma/schema.prisma`
- アダプターファイル: `src/adapters/{モデル名}.adapter.ts` または `src/adapters/prisma/{モデル名}.adapter.ts`
- DTOファイル: `src/dto/{モデル名}.dto.ts`

### 8.2 例

```
src/
├── adapters/
│   ├── prisma.adapter.ts      // 基本アダプター（シングルトンPrismaClient）
│   ├── user.adapter.ts        // ユーザーアダプター
│   └── reservation.adapter.ts // 予約アダプター
├── dto/
│   ├── user.dto.ts            // ユーザー関連DTO
│   └── reservation.dto.ts     // 予約関連DTO
└── services/
    ├── user.service.ts        // ユーザーサービス
    └── reservation.service.ts // 予約サービス
```

## 9. マイグレーション命名規則

### 9.1 基本ルール

- マイグレーション名は操作内容を明確に表す
- 形式: `{操作}_{対象}_{詳細}`
- 操作例: `add`, `create`, `update`, `remove`, `rename`

### 9.2 例

```bash
# マイグレーション作成コマンド例
npx prisma migrate dev --name add_user_email_verification
npx prisma migrate dev --name create_reservation_table
npx prisma migrate dev --name update_payment_fields
npx prisma migrate dev --name remove_deprecated_columns
```

## 10. 参考リソース

- [Prisma公式ドキュメント - モデル定義](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model)
- [Prisma公式ドキュメント - リレーション](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [開発ルールドキュメント](./prisma-development-rules.md)



