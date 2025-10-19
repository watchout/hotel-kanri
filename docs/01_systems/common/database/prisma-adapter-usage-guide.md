# Prismaアダプター使用ガイド

## 概要

Prismaアダプターは、データベースのテーブル名（スネークケース・複数形）とアプリケーションコードのモデル名（キャメルケース・単数形）の間の命名規則の違いを吸収するためのラッパーです。このガイドでは、Prismaアダプターの使い方と、既存コードの移行方法について説明します。

## 背景

Prismaスキーマに`@@map`ディレクティブを追加したことで、テーブル名とモデル名の間に以下のような命名規則の違いが生じました：

- データベース: `snake_case`、複数形（例: `response_trees`）
- アプリケーション: `camelCase`、単数形（例: `responseTree`）

この違いを吸収するために、Prismaアダプターを導入しました。

## 使用方法

### 基本的な使い方

```typescript
// 従来の方法（非推奨）
const result = await hotelDb.getClient().response_trees.findMany({
  where: { tenantId }
});

// 新しい方法（推奨）
const result = await hotelDb.getAdapter().responseTree.findMany({
  where: { tenantId }
});
```

### トランザクション内での使用

```typescript
// 従来の方法（非推奨）
await hotelDb.transaction(async (tx) => {
  const node = await tx.response_nodes.findUnique({ where: { id } });
  await tx.response_trees.update({ where: { id: node.treeId }, data: { /* ... */ } });
});

// 新しい方法（推奨）
await hotelDb.transaction(async (tx) => {
  const node = await tx.responseNode.findUnique({ where: { id } });
  await tx.responseTree.update({ where: { id: node.treeId }, data: { /* ... */ } });
});
```

## 利用可能なモデル

Prismaアダプターでは、以下のモデルにアクセスできます：

| アダプターのプロパティ名 | 実際のテーブル名 |
|----------------------|---------------|
| `page` | `pages` |
| `pageHistory` | `page_histories` |
| `responseNode` | `response_nodes` |
| `responseTree` | `response_trees` |
| `responseTreeVersion` | `response_tree_versions` |
| `responseTreeSession` | `response_tree_sessions` |
| `responseTreeMobileLink` | `response_tree_mobile_links` |
| `responseTreeHistory` | `response_tree_history` |
| `responseNodeTranslation` | `response_node_translations` |
| `campaign` | `campaigns` |
| `campaignCategory` | `campaign_categories` |
| `campaignCategoryRelation` | `campaign_category_relations` |
| `campaignItem` | `campaign_items` |
| `campaignTranslation` | `campaign_translations` |
| `campaignUsageLog` | `campaign_usage_logs` |
| `deviceVideoCache` | `device_video_caches` |
| `notificationTemplate` | `notification_templates` |
| `tenantAccessLog` | `tenant_access_logs` |
| `systemEvent` | `system_event` |
| `deviceRoom` | `device_rooms` |
| `order` | `order` |
| `orderItem` | `order_item` |
| `schemaVersion` | `schema_version` |
| `systemPlanRestrictions` | `system_plan_restrictions` |
| `tenantSystemPlan` | `tenant_system_plan` |

## 既存コードの移行

既存のコードをPrismaアダプターに移行するには、以下の手順に従ってください：

1. `hotelDb.getClient()` を `hotelDb.getAdapter()` に置き換える
2. テーブル名（スネークケース・複数形）をモデル名（キャメルケース・単数形）に置き換える
3. トランザクション内のコードも同様に変更する

### 移行例

```typescript
// 移行前
const nodes = await hotelDb.getClient().response_nodes.findMany({
  where: { treeId },
  include: { response_node_translations: true }
});

// 移行後
const nodes = await hotelDb.getAdapter().responseNode.findMany({
  where: { treeId },
  include: { responseNodeTranslation: true } // リレーション名も変更する必要がある場合があります
});
```

## 注意事項

### リレーション名の扱い

Prismaのスキーマ定義によっては、`include`や`select`で指定するリレーション名も変更が必要な場合があります。スキーマ定義を確認し、適切なリレーション名を使用してください。

```typescript
// 正しいリレーション名を使用する
const result = await hotelDb.getAdapter().responseNode.findMany({
  include: {
    responseNodeTranslation: true // スキーマ定義に合わせたリレーション名
  }
});
```

### 必須フィールドの追加

モデルの作成時には、スキーマで定義された必須フィールドをすべて指定する必要があります。

```typescript
// 必須フィールドを含める
const result = await hotelDb.getAdapter().responseTree.create({
  data: {
    id: uuidv4(), // IDを自動生成
    name: data.name,
    tenantId: data.tenantId,
    isActive: true,
    updatedAt: new Date(), // 必須フィールド
    createdAt: new Date() // 必須フィールド
  }
});
```

## トラブルシューティング

### エラー: Property 'xxx' does not exist on type 'PrismaAdapter'

このエラーは、Prismaアダプターに定義されていないプロパティにアクセスしようとした場合に発生します。

**解決策**: アダプターに定義されているプロパティ名を確認し、正しい名前を使用してください。

### エラー: Type '{ ... }' is not assignable to type '...'

このエラーは、モデルの作成時に必須フィールドが不足している場合に発生します。

**解決策**: スキーマ定義を確認し、必要なフィールドをすべて指定してください。特に `id`、`createdAt`、`updatedAt` などのフィールドに注意してください。

## ベストプラクティス

1. **常にアダプターを使用する**: 直接Prismaクライアントを使用せず、常にアダプターを通してアクセスしてください。
2. **必須フィールドを確認する**: モデル作成時には、スキーマ定義を確認して必須フィールドをすべて指定してください。
3. **IDの生成**: 文字列型のIDフィールドには `uuidv4()` を使用し、自動生成される数値型のIDフィールドは指定しないでください。
4. **日付フィールド**: `createdAt` と `updatedAt` フィールドには `new Date()` を使用してください。

## まとめ

Prismaアダプターを使用することで、データベースとアプリケーションコードの命名規則の違いを吸収し、一貫性のあるコードを書くことができます。既存のコードを移行する際は、上記のガイドラインに従って慎重に変更を行ってください。
