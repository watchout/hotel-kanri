# 統合データベースサービス実装ガイド

## 1. 概要

`db-service.ts`は、hotel-saasからhotel-common APIへの移行期間中に使用する一時的なモック実装です。このファイルは、Prismaクライアントのインターフェースをエミュレートし、アプリケーションが正常に動作するために必要な最小限のデータを提供します。

## 2. 基本構造

```typescript
// server/utils/db-service.ts
export const prisma = {
  // モックメソッド
};

export const unifiedClient = {
  getClient: () => prisma,
  // その他のメソッド
};

export function getUnifiedPrisma() {
  return prisma;
}

export default prisma;
```

## 3. 互換レイヤー

以下の3つのファイルは、既存コードとの互換性を維持するための一時的なレイヤーです：

```typescript
// server/utils/prisma.ts
import * as dbService from './db-service';
export const prisma = dbService.prisma;
export const unifiedClient = dbService.unifiedClient;
export default dbService.prisma;
```

```typescript
// server/utils/unified-prisma.ts
import * as dbService from './db-service';
export const unifiedClient = dbService.unifiedClient;
export const getUnifiedPrisma = dbService.getUnifiedPrisma;
export default dbService.unifiedClient;
```

```typescript
// server/utils/db-mock.ts
import * as dbService from './db-service';
export const prisma = dbService.prisma;
export const unifiedClient = dbService.unifiedClient;
export const getUnifiedPrisma = dbService.getUnifiedPrisma;
export default dbService.prisma;
```

## 4. モック実装の拡張方法

新しいモデルやメソッドが必要な場合は、`db-service.ts`に追加します：

```typescript
// モックデータの追加
const mockCategories = [
  {
    id: 'category-1',
    name: 'Food',
    displayOrder: 1
  }
];

// モデルの追加
export const prisma = {
  // 既存のモデル...

  // 新しいモデル
  category: {
    findMany: async () => mockCategories,
    findUnique: async (params) => {
      if (params?.where?.id) {
        return mockCategories.find(cat => cat.id === params.where.id) || null;
      }
      return null;
    }
  }
};
```

## 5. API移行の例

モックから実際のAPI呼び出しへの移行例：

```typescript
// Before (モック使用)
const categories = await prisma.category.findMany();

// After (API使用)
const response = await $fetch(`${process.env.HOTEL_COMMON_API_URL}/categories`);
const categories = response.data;
```

## 6. サービスレイヤーの導入

より良い抽象化のために、サービスレイヤーを導入することを推奨します：

```typescript
// services/categoryService.ts
export async function getCategories() {
  const hotelCommonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400/api/v1';

  try {
    const response = await $fetch(`${hotelCommonApiUrl}/categories`);
    return response.data || [];
  } catch (error) {
    console.error('カテゴリ取得エラー:', error);
    return [];
  }
}

// 使用例
const categories = await getCategories();
```

## 7. 注意事項

- モックデータは最小限にし、必要なプロパティのみを含める
- 実際のデータ構造をできるだけ模倣する
- 本番環境では必ずhotel-common APIを使用する
- モックはあくまで一時的な対応であり、最終的には削除される

## 8. 移行計画

1. 現在: モック実装による緊急安定化（Phase 1）
2. 次のステップ: 重要APIの移行（Phase 2）
3. 最終目標: 完全なhotel-common API移行（Phase 3）

最終更新日: 2024-12-19
