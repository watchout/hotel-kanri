# Prisma開発ルール

**作成日**: 2025年8月20日  
**最終更新**: 2025年8月20日  
**ステータス**: 強制適用  
**適用範囲**: 全システム（hotel-saas, hotel-pms, hotel-member, hotel-common）  

## 1. 目的

このドキュメントは、Prismaを使用したデータベースアクセスにおける開発ルールを定義し、データベースの不整合によるエラーを防止することを目的としています。

## 2. 背景

現在、以下の問題が発生しています：

- Prismaスキーマと型定義の不一致によるランタイムエラー
- 直接PrismaClientを使用することによる一貫性のない実装
- データベースアクセスコードの重複と保守性の低下
- アダプターレイヤーの欠如によるテスト困難性

## 3. 基本原則

### 3.1 アダプターパターンの採用

すべてのデータベースアクセスは、アダプターレイヤーを介して行うこと。直接PrismaClientを使用することは禁止します。

### 3.2 スキーマ整合性の確保

Prismaスキーマと生成される型定義の整合性を常に確保すること。スキーマ変更後は必ず型定義を再生成し、テストを実行すること。

### 3.3 命名規則の遵守

[命名規則ドキュメント](./prisma-naming-conventions.md)に定義された規則に従ってモデル、フィールド、リレーションを命名すること。

### 3.4 トランザクション管理

複数のデータベース操作が論理的に一つの単位である場合は、必ずトランザクションを使用すること。

## 4. 実装パターン

### 4.1 アダプターレイヤーの実装

```typescript
// src/adapters/prisma.adapter.ts
import { PrismaClient } from '@prisma/client';

// シングルトンインスタンス
export const prisma = new PrismaClient();

// ユーザーアダプター
export class UserAdapter {
  // 検索メソッド
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }
  
  // 作成メソッド
  async create(data: { name: string; email: string }) {
    return prisma.user.create({ data });
  }
  
  // 更新メソッド
  async update(id: string, data: { name?: string; email?: string }) {
    return prisma.user.update({
      where: { id },
      data
    });
  }
  
  // 削除メソッド
  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }
  
  // トランザクションを使用した複合操作
  async createWithProfile(userData: { name: string; email: string }, profileData: { bio: string }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: userData });
      const profile = await tx.profile.create({
        data: {
          ...profileData,
          userId: user.id
        }
      });
      return { user, profile };
    });
  }
}
```

### 4.2 サービスレイヤーでの使用

```typescript
// src/services/user.service.ts
import { UserAdapter } from '../adapters/prisma.adapter';

export class UserService {
  private userAdapter = new UserAdapter();
  
  async getUserById(id: string) {
    const user = await this.userAdapter.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
  
  async registerUser(name: string, email: string, bio: string) {
    try {
      return await this.userAdapter.createWithProfile({ name, email }, { bio });
    } catch (error) {
      // エラーハンドリング
      throw new Error(`Failed to register user: ${error.message}`);
    }
  }
}
```

## 5. 禁止事項

以下の実装パターンは明示的に禁止します：

1. **直接PrismaClientの使用**: すべてのデータベースアクセスはアダプターを介して行うこと
   ```typescript
   // ❌ 禁止
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   const user = await prisma.user.findUnique({ where: { id } });
   
   // ✅ 正しい実装
   import { UserAdapter } from '../adapters/prisma.adapter';
   const userAdapter = new UserAdapter();
   const user = await userAdapter.findById(id);
   ```

2. **スキーマ変更後の型定義未更新**: スキーマ変更後は必ず`prisma generate`を実行すること
   ```bash
   # スキーマ変更後に必ず実行
   npx prisma generate
   ```

3. **トランザクション未使用**: 複数の操作は必ずトランザクションで囲むこと
   ```typescript
   // ❌ 禁止
   const user = await prisma.user.create({ data: userData });
   const profile = await prisma.profile.create({ data: { ...profileData, userId: user.id } });
   
   // ✅ 正しい実装
   await prisma.$transaction(async (tx) => {
     const user = await tx.user.create({ data: userData });
     const profile = await tx.profile.create({ data: { ...profileData, userId: user.id } });
     return { user, profile };
   });
   ```

4. **命名規則違反**: 定義された命名規則に従わないモデル・フィールド名
   ```prisma
   // ❌ 禁止
   model user {
     ID        String   @id @default(uuid())
     user_name String
     EMAIL     String   @unique
   }
   
   // ✅ 正しい実装
   model User {
     id        String   @id @default(uuid())
     userName  String
     email     String   @unique
   }
   ```

## 6. 自動チェック

以下の自動チェックを導入しています：

1. **pre-commitフック**: コミット前にPrismaスキーマと型定義の整合性をチェック
2. **ESLintルール**: 直接PrismaClientを使用していないかチェック
3. **CI/CD検証**: GitHub Actionsでの自動チェック

## 7. 関連ツール

1. **prisma:validate**: スキーマと型定義の整合性をチェック
   ```bash
   npm run prisma:validate
   ```

2. **prisma:check-adapter**: アダプターレイヤーの不足を検出
   ```bash
   npm run prisma:check-adapter
   ```

## 8. 参考リソース

- [Prisma公式ドキュメント](https://www.prisma.io/docs/)
- [命名規則ドキュメント](./prisma-naming-conventions.md)
- [アダプターパターン実装例](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)



