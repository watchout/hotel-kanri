# ソフトデリート実装ガイド

## 📋 概要

本ドキュメントでは、hotel-commonプロジェクトにおけるソフトデリート（論理削除）の実装ルールと標準的な実装方法について説明します。hotel-commonプロジェクトでは、データの整合性と履歴管理のため、基本的に**すべてのテーブルでソフトデリートを採用**しています。

## 🎯 基本方針

1. **すべてのテーブルでソフトデリートを実装する**
2. **物理削除は原則として行わない**
3. **一貫した命名規則とパターンを使用する**
4. **クエリでは常にソフトデリートされていないレコードのみを対象とする**

## 💾 スキーマ定義ルール

### 必須フィールド

すべてのテーブルには以下のフィールドを追加する必要があります：

```prisma
// Prismaスキーマ例
model ExampleTable {
  // 他のフィールド...
  
  // ソフトデリート用フィールド（必須）
  is_deleted Boolean   @default(false)
  deleted_at DateTime?
  deleted_by String?
}
```

### 命名規則

- `is_deleted`: 削除フラグ（Boolean型、デフォルト値はfalse）
- `deleted_at`: 削除日時（DateTime?型、nullableで削除時に設定）
- `deleted_by`: 削除者ID（String?型、nullableでユーザーIDまたはシステム名を設定）

### インデックス

パフォーマンス向上のため、以下のインデックスを設定することを推奨します：

```prisma
@@index([is_deleted])
```

頻繁に日付と組み合わせて検索する場合は複合インデックスも検討：

```prisma
@@index([is_deleted, created_at])
```

## 🔄 リポジトリ層の実装

### 基本的なCRUD操作

#### 検索・取得

```typescript
// 検索時は常にis_deleted=falseを条件に含める
async findAll(params: SearchParams) {
  return prisma.exampleTable.findMany({
    where: {
      ...params,
      is_deleted: false  // 必ず含める
    }
  });
}
```

#### 削除（ソフトデリート）

```typescript
async delete(id: string, userId: string) {
  return prisma.exampleTable.update({
    where: { id },
    data: {
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by: userId
    }
  });
}
```

### バッチ処理・一括操作

```typescript
async batchDelete(ids: string[], userId: string) {
  return prisma.exampleTable.updateMany({
    where: {
      id: { in: ids }
    },
    data: {
      is_deleted: true,
      deleted_at: new Date(),
      deleted_by: userId
    }
  });
}
```

## 🌐 APIエンドポイント実装

### RESTful API標準

- DELETE操作はソフトデリートを実装
- 物理削除が必要な場合は専用エンドポイントを作成

```typescript
// DELETE /api/v1/resources/:id
router.delete('/api/v1/resources/:id', async (req, res) => {
  try {
    // ソフトデリート実行
    await resourceService.delete(req.params.id, req.user.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    // エラーハンドリング
  }
});
```

### クエリパラメータ

削除済みレコードを含める特別なケースでは、クエリパラメータを使用：

```typescript
// GET /api/v1/resources?include_deleted=true
router.get('/api/v1/resources', async (req, res) => {
  const includeDeleted = req.query.include_deleted === 'true';
  const resources = await resourceService.findAll({ 
    is_deleted: includeDeleted ? undefined : false 
  });
  return res.json(resources);
});
```

## 🔍 ソフトデリートフィルタリング

### ミドルウェアの実装

一貫したソフトデリート対応を実現するため、Prismaミドルウェアを使用：

```typescript
// prisma/middleware.ts
prisma.$use(async (params, next) => {
  // findMany, findFirst, findUnique, count操作にソフトデリートフィルタを適用
  if (['findMany', 'findFirst', 'findUnique', 'count'].includes(params.action)) {
    // 明示的にis_deletedが指定されていない場合のみ適用
    if (params.args.where && params.args.where.is_deleted === undefined) {
      params.args.where = {
        ...params.args.where,
        is_deleted: false
      };
    }
  }
  return next(params);
});
```

## 🧪 テスト

### ソフトデリートのテスト

```typescript
// ソフトデリートのテスト例
describe('Soft Delete', () => {
  it('should mark record as deleted but keep it in database', async () => {
    // 削除実行
    await service.delete(testId, 'test-user');
    
    // 通常の検索では見つからない
    const result = await service.findById(testId);
    expect(result).toBeNull();
    
    // 直接DBを検索すると存在する
    const dbRecord = await prisma.exampleTable.findUnique({
      where: { id: testId }
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord.is_deleted).toBe(true);
    expect(dbRecord.deleted_at).not.toBeNull();
    expect(dbRecord.deleted_by).toBe('test-user');
  });
});
```

## 📊 現在の対応状況

### 対応済みテーブル

現在、以下のテーブルがソフトデリート対応済みです：

- `Order` - `isDeleted`と`deletedAt`フィールドあり
- `device_rooms` - `isActive`フィールドを使用（部分的対応）

### 未対応テーブル

以下のテーブルは優先的に対応が必要です：

- `campaigns`
- `response_trees`
- `pages`
- `customers`
- `reservations`

## 📝 今後の対応計画

1. **既存テーブルの対応**
   - すべての主要テーブルに`is_deleted`と`deleted_at`フィールドを追加
   - マイグレーションスクリプトの作成

2. **標準ミドルウェアの実装**
   - Prismaミドルウェアによる自動フィルタリング
   - 一貫したソフトデリート処理の実現

3. **APIエンドポイントの統一**
   - すべてのDELETEエンドポイントをソフトデリート対応に修正
   - 管理者向け復元機能の実装

## ⚠️ 注意事項

- 外部キー制約がある場合、関連レコードも適切に処理する必要があります
- パフォーマンスへの影響を考慮し、必要に応じてインデックスを設定してください
- 定期的なデータアーカイブ戦略を検討してください（長期間削除されたデータの扱い）

## 🔄 移行ガイド

既存のテーブルをソフトデリート対応にする手順：

1. スキーマに必要なフィールドを追加
2. マイグレーションを実行
3. リポジトリ層のクエリを更新
4. APIエンドポイントを更新
5. テストを実施

## 📚 参考資料

- [Prisma ミドルウェアドキュメント](https://www.prisma.io/docs/concepts/components/prisma-client/middleware)
- [データベース設計ベストプラクティス](https://docs/database/DATABASE_SAFETY_RULES.md)
- [データベーススキーマドキュメント](https://docs/database/DATABASE_SCHEMA_DOCUMENTATION.md)



