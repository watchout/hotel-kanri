# Prismaの命名規則ガイド

## 概要

このドキュメントでは、hotel-commonプロジェクトにおけるPrismaの命名規則と、それに関連するコーディング規約について説明します。データベースとコードの整合性を維持するために、以下のガイドラインに従ってください。

## 命名規則

### データベーステーブル
- **命名規則**: スネークケース・複数形
- **例**: `campaigns`, `response_nodes`, `tenant_services`

### Prismaモデル
- **命名規則**: PascalCase・単数形
- **例**: `Campaign`, `ResponseNode`, `TenantService`
- **重要**: 必ず`@@map`ディレクティブを使用してテーブル名を明示的に指定する

### Prismaフィールド
- **命名規則**: camelCase
- **例**: `createdAt`, `tenantId`, `isActive`
- **注意**: データベースカラムはスネークケースですが、Prismaのフィールドはキャメルケースで自動的にマッピングされます

## コード内でのPrisma参照方法

### 推奨方法: アダプターの使用

```typescript
// アダプターを使用したPrismaクライアントの取得
const db = hotelDb.getAdapter();

// キャメルケース・単数形で参照可能
const campaigns = await db.campaign.findMany();
const nodes = await db.responseNode.findMany();

// トランザクション内でも同様
await db.$transaction(async (tx) => {
  await tx.campaign.create({...});
  await tx.responseNode.update({...});
});
```

### 直接Prismaクライアントを使用する場合

```typescript
// 直接Prismaクライアントを取得
const prisma = hotelDb.getClient();

// スネークケース・複数形で参照する必要がある
const campaigns = await prisma.campaigns.findMany();
const nodes = await prisma.response_nodes.findMany();

// トランザクション内でも同様
await prisma.$transaction(async (tx) => {
  await tx.campaigns.create({...});
  await tx.response_nodes.update({...});
});
```

## Prismaスキーマの記述例

```prisma
// 正しいモデル定義の例
model Campaign {
  id        String   @id
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime
  
  // テーブル名を明示的に指定
  @@map("campaigns")
}

model ResponseNode {
  id      String @id
  content String
  
  // テーブル名を明示的に指定
  @@map("response_nodes")
}
```

## 新しいモデルを追加する際の手順

1. Prismaスキーマにモデルを追加（PascalCase・単数形）
2. `@@map`ディレクティブでテーブル名を指定（スネークケース・複数形）
3. マイグレーションを作成・適用
4. アダプターに新しいモデルのマッピングを追加
   - `src/database/prisma-adapter.ts`を更新
   - `src/database/prisma.ts`のゲッターを追加

## 既存のコードを修正する際の注意点

- 直接Prismaクライアントを使用している箇所は、アダプターを使用するように変更することを推奨
- 一時的な対応として、`scripts/update-prisma-references.js`を使用して参照を一括更新することも可能

## トラブルシューティング

### エラー: Property 'campaign' does not exist on type 'PrismaClient'

**原因**: Prismaクライアントに対して古い命名規則（キャメルケース・単数形）でアクセスしている

**解決策**:
1. アダプターを使用する: `hotelDb.getAdapter().campaign`
2. 正しいテーブル名で参照する: `hotelDb.getClient().campaigns`

### エラー: Type 'campaigns' does not exist in schema

**原因**: Prismaスキーマで定義されていないモデルを参照している

**解決策**: Prismaスキーマを確認し、必要なモデルを追加する

## 参考資料

- [Prisma公式ドキュメント: モデルとテーブル名のマッピング](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#mapping-model-names-to-tables)
- [Prisma公式ドキュメント: フィールドとカラム名のマッピング](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#mapping-field-names-to-column-names)
