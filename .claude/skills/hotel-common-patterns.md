# hotel-common-rebuild パターン集

hotel-commonはExpress + TypeScriptベースのAPI基盤・DB層です。

## アーキテクチャ

```
hotel-common-rebuild (Port 3401)
├── src/
│   ├── server/index.ts      # エントリーポイント
│   ├── routes/              # APIルーター
│   ├── services/            # ビジネスロジック
│   ├── utils/               # ユーティリティ
│   └── types/               # 型定義
└── prisma/
    └── schema.prisma        # DBスキーマ
```

## ルーティング規則（B方式）

### ✅ 正しいパターン
```typescript
// router側: 相対パス
const router = express.Router();
router.get('/', getAllItems);        // 相対パス
router.get('/:id', getItemById);     // 相対パス
router.post('/', createItem);        // 相対パス

// app側: 絶対パス
app.use('/api/v1/admin/items', itemsRouter);
```

### ❌ 禁止パターン（二重付与の原因）
```typescript
// ❌ router側で絶対パス
router.get('/api/v1/admin/items', getAllItems);
```

## 認証ミドルウェアの順序

```typescript
// 1. 認証不要ルート（先に登録）
app.get('/health', healthCheck);
app.use('/api/v1/admin/auth', authRouter);

// 2. 認証ミドルウェア
app.use('/api', sessionAuthMiddleware);

// 3. 保護されたルート
app.use('/api/v1/admin/tenants', tenantsRouter);
app.use('/api/v1/admin/menus', menusRouter);
```

## マルチテナント必須パターン

### ✅ 全クエリにtenant_idフィルタ
```typescript
const items = await prisma.item.findMany({
  where: {
    tenantId: authUser.tenantId,  // 必須
    // 他の条件
  }
});
```

### ✅ 作成時にtenant_id付与
```typescript
const newItem = await prisma.item.create({
  data: {
    ...input,
    tenantId: authUser.tenantId,  // 必須
  }
});
```

### ✅ 404ポリシー（列挙耐性）
```typescript
const item = await prisma.item.findUnique({
  where: { id }
});

// 不在または他テナント → 404
if (!item || item.tenantId !== authUser.tenantId) {
  return res.status(404).json(createErrorResponse('NOT_FOUND', 'リソースが見つかりません'));
}
```

## レスポンスヘルパー

```typescript
import { createSuccessResponse, createErrorResponse } from '../utils/response-helpers';

// 成功
return res.status(200).json(createSuccessResponse(data));

// エラー
return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'メッセージ'));
```

## Prisma命名規則

```prisma
model Item {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")  // snake_case
  itemName  String   @map("item_name")  // snake_case
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("items")  // テーブル名もsnake_case
}
```
