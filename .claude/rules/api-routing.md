# APIルーティングルール

**常時適用**: 一貫したAPI設計を維持します。

## エンドポイント命名

### 基本形式
```
/api/v1/admin/[resource]
/api/v1/guest/[resource]
```

### 例
```
GET    /api/v1/admin/tenants
POST   /api/v1/admin/tenants
GET    /api/v1/admin/tenants/:id
PUT    /api/v1/admin/tenants/:id
DELETE /api/v1/admin/tenants/:id
```

## hotel-common（Express）: B方式

### ✅ 正しいパターン
```typescript
// router側: 相対パス
const router = express.Router();
router.get('/', getAllItems);
router.get('/:id', getItemById);

// app側: 絶対パス
app.use('/api/v1/admin/items', itemsRouter);
```

### ❌ 禁止パターン
```typescript
// 二重付与の原因
router.get('/api/v1/admin/items', getAllItems);
```

## hotel-saas（Nitro）: ファイルベース

### ✅ 正しいパターン
```
server/api/v1/admin/
├── tenants.get.ts     # GET /api/v1/admin/tenants
├── tenants.post.ts    # POST /api/v1/admin/tenants
└── tenants/
    ├── [id].get.ts    # GET /api/v1/admin/tenants/:id
    └── [id].put.ts    # PUT /api/v1/admin/tenants/:id
```

### ❌ 禁止パターン
```
# index.*ファイル禁止
server/api/v1/admin/tenants/index.get.ts

# 深いネスト禁止
server/api/v1/admin/tenants/[id]/items/[itemId].get.ts
```

## 認証ミドルウェアの順序

```typescript
// 1. 認証不要（先に登録）
app.get('/health', healthCheck);
app.use('/api/v1/admin/auth', authRouter);

// 2. 認証ミドルウェア
app.use('/api', sessionAuthMiddleware);

// 3. 保護されたルート
app.use('/api/v1/admin/tenants', tenantsRouter);
```

## 違反検出コマンド

```bash
# 二重付与
grep -R '/api/api/' src/

# index.*ファイル
find server/api -name "index.*"
```
