# Prismaアダプター実装の次のステップ

## 現状の課題

Prismaアダプターを実装し、一部のコードを更新しましたが、まだ多くの課題が残っています。主な課題は以下の通りです：

1. **TypeScriptエラー**: 多数のTypeScriptエラーが発生しています（347件）。これらは主に以下の原因によるものです：
   - Prismaクライアントの参照がスネークケース・複数形に変更されたため
   - 一部のモデルで必須フィールド（id、updatedAtなど）が不足
   - インクルード・リレーション関連のエラー（例：`translations`プロパティが存在しない）

2. **ファイル構造の問題**: `src/database/unified-client.ts`と`src/database/unified-client-simple.ts`に構文エラーが多数あります。

3. **スキーマとコードの不一致**: Prismaスキーマで定義されているフィールドとコードで使用されているフィールドに不一致があります。

## 推奨される次のステップ

### 1. 優先度の高い修正

1. **Prismaアダプターの修正**:
   - `orderItem` → `order_item`の参照を修正
   - イベントハンドラーの型を修正（`$on`メソッド）

2. **重要なリポジトリの修正**:
   - `src/repositories/response-tree/response-node.repository.ts`
   - `src/repositories/response-tree/response-session.repository.ts`
   - `src/repositories/response-tree/response-tree.repository.ts`
   - `src/repositories/device/device-room.repository.ts`

3. **必須フィールドの追加**:
   - 作成操作で`id`と`updatedAt`フィールドを追加
   - 例：
     ```typescript
     data: {
       id: generateUuid(), // または適切なID生成関数
       updatedAt: new Date(),
       // 既存のフィールド
     }
     ```

### 2. 中期的な修正

1. **アダプター使用の徹底**:
   - 直接Prismaクライアントを使用している箇所をすべてアダプターに置き換え
   - `hotelDb.getClient()` → `hotelDb.getAdapter()`

2. **インクルード関連の修正**:
   - リレーションフィールドの参照を修正
   - 例：`translations`→`campaign_translations`

3. **統一クライアントの修正**:
   - `src/database/unified-client.ts`と`src/database/unified-client-simple.ts`の構文エラーを修正
   - アダプターを使用するように更新

### 3. 長期的な改善

1. **コードジェネレーター**:
   - Prismaスキーマからリポジトリとサービスのコードを自動生成するツールの開発
   - 命名規則の一貫性を確保

2. **テスト強化**:
   - 各モデルのCRUD操作のユニットテスト作成
   - アダプターのテスト

3. **ドキュメント整備**:
   - 開発者向けのガイドラインの充実
   - 新しいモデルを追加する際の手順の明確化

## 具体的な修正例

### Prismaアダプターの修正

```typescript
// src/database/prisma-adapter.ts
get orderItem() {
  return this.prisma.orderItem; // 修正前
}

// 修正後
get orderItem() {
  return this.prisma.order_item;
}

// イベントハンドラーの型修正
$on(eventType: string, callback: any) { // 修正前: eventType: any
  return this.prisma.$on(eventType, callback);
}
```

### リポジトリの修正例

```typescript
// src/repositories/response-tree/response-node.repository.ts
// 修正前
return hotelDb.getClient().responseNode.create({
  data: {
    treeId: treeId,
    // その他のフィールド
  }
});

// 修正後
return hotelDb.getAdapter().responseNode.create({
  data: {
    id: generateUuid(), // ID追加
    treeId: treeId,
    // その他のフィールド
    updatedAt: new Date(), // updatedAt追加
  }
});
```

### インクルード関連の修正例

```typescript
// src/integrations/campaigns/services.ts
// 修正前
const campaigns = await this.prismaClient.campaigns.findMany({
  include: {
    translations: true, // エラー: translationsプロパティは存在しない
  }
});

// 修正後
const campaigns = await this.prismaClient.campaigns.findMany({
  include: {
    campaign_translations: true, // 正しいリレーション名
  }
});
```

## 結論

Prismaアダプターの実装は、データベーススキーマとコードの整合性を維持するための重要なステップですが、まだ多くの修正が必要です。優先度の高い修正から順に対応し、段階的に改善していくことが重要です。また、将来的には自動化ツールやテストの強化を通じて、同様の問題が再発しないようにする必要があります。
