# hotel-saas-rebuild パターン集

hotel-saasはNuxt 3ベースのフロントエンド + APIプロキシです。

## アーキテクチャ

```
hotel-saas-rebuild (Port 3101)
├── pages/           # フロントエンド
├── components/      # Vueコンポーネント
├── composables/     # 状態管理
└── server/
    └── api/         # hotel-common へのプロキシ
```

## 絶対禁止パターン

### ❌ Prisma直接使用
```typescript
// ❌ 禁止
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

### ❌ $fetch直接使用（Cookie転送されない）
```typescript
// ❌ 禁止
const data = await $fetch('http://localhost:3401/api/v1/xxx');
```

### ❌ index.*ファイル
```
// ❌ 禁止
server/api/v1/admin/tenants/index.get.ts
```

## 必須パターン

### ✅ callHotelCommonAPI使用
```typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';

export default defineEventHandler(async (event) => {
  const response = await callHotelCommonAPI(event, '/api/v1/admin/xxx', {
    method: 'GET'
  });
  return response;
});
```

### ✅ ゲストAPI用 ensureGuestContext
```typescript
import { ensureGuestContext } from '~/server/utils/guest-auth';

export default defineEventHandler(async (event) => {
  const { roomId, tenantId } = await ensureGuestContext(event);
  // ...
});
```

### ✅ 管理画面API用 認証チェック
```typescript
export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({ statusCode: 401, message: 'ログインが必要です' });
  }
  // ...
});
```

## ファイル命名規則

```
server/api/v1/admin/
├── tenants.get.ts           # GET /api/v1/admin/tenants
├── tenants.post.ts          # POST /api/v1/admin/tenants
├── tenants/
│   └── [id].get.ts          # GET /api/v1/admin/tenants/:id
│   └── [id].put.ts          # PUT /api/v1/admin/tenants/:id
└── switch-tenant.post.ts    # POST /api/v1/admin/switch-tenant
```

## URLパラメータ取得
```typescript
import { getRouterParam } from 'h3';

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id');
  // ...
});
```
