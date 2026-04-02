# テナントAPI修正仕様書

## 概要

hotel-commonのテナントAPIに問題があり、修正が必要です。現在、`/api/tenants`エンドポイントを呼び出すと以下のエラーが発生しています：

```
Invalid `this.prisma.tenant.findMany()` invocation in
/Users/kaneko/hotel-common/src/server/integration-server-extended.ts:136:50

Unknown argument `is_deleted`. Available options are marked with ?.
```

## 問題点

1. `is_deleted`フィールドがPrismaスキーマで定義されていないか、名前が異なる可能性があります
2. Prismaスキーマとコードの間で不整合が発生しています

## 修正案

### 1. Prismaスキーマの確認と修正

`schema.prisma`ファイルを確認し、`tenant`モデルの定義を確認します。`is_deleted`フィールドが存在しない場合は、以下のいずれかの対応が必要です：

#### 1.1 フィールド名の修正

`is_deleted`の代わりに使用されている可能性のあるフィールド名：
- `isDeleted`
- `deleted`
- `deletedAt` (null以外の値が入っている場合に削除済みと判断)

#### 1.2 フィールドの追加

フィールドが存在しない場合は、スキーマに追加します：

```prisma
model Tenant {
  // 既存のフィールド

  isDeleted Boolean @default(false)
  // または
  is_deleted Boolean @default(false)
}
```

### 2. APIコードの修正

`/Users/kaneko/hotel-common/src/server/integration-server-extended.ts`の136行目付近にあるコードを修正します：

#### 2.1 フィールド名が異なる場合

```typescript
const tenants = await this.prisma.tenant.findMany({
  where: {
    status: "active",
    isDeleted: false, // is_deletedをisDeletedに変更
  },
  select: {
    id: true,
    name: true,
    contactEmail: true,
    planType: true,
    createdAt: true
  }
})
```

#### 2.2 フィールドが存在しない場合

```typescript
const tenants = await this.prisma.tenant.findMany({
  where: {
    status: "active",
    // is_deleted条件を削除
  },
  select: {
    id: true,
    name: true,
    contactEmail: true,
    planType: true,
    createdAt: true
  }
})
```

### 3. テナント個別取得APIの追加

`/api/tenants/:id`エンドポイントも追加する必要があります：

```typescript
// テナント詳細
this.app.get('/api/tenants/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await this.prisma.tenant.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        planType: true,
        createdAt: true,
        // 必要に応じて追加のフィールド
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Tenant not found' });
    }

    return res.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return res.status(500).json({ error: 'DATABASE_ERROR', message: error.message });
  }
});
```

## 実装手順

1. hotel-commonリポジトリをクローンまたは更新
2. `schema.prisma`ファイルを確認し、`tenant`モデルの定義を確認
3. 上記の修正案に基づいてコードを修正
4. Prisma Clientを再生成（`npx prisma generate`）
5. サーバーを再起動
6. APIをテストして正常に動作することを確認

## テスト方法

```bash
# テナント一覧の取得
curl "http://localhost:3400/api/tenants"

# 特定のテナントの取得
curl "http://localhost:3400/api/tenants/tenant-001"
```

レスポンスが正常に返ることを確認します。

## 注意事項

- Prismaスキーマを変更した場合は、マイグレーションが必要になる可能性があります
- 既存のテナントデータがある場合は、データの整合性に注意してください
- APIの変更によって他の機能に影響がないか確認してください
