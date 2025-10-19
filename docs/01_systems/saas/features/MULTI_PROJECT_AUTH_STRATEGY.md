# マルチプロジェクト認証戦略設計書

## 1. プロジェクト構成

### 推奨構成
```
/hotel-saas      (AIコンシェルジュ・注文システム)
/hotel-member    (会員・予約システム)
/hotel-pms       (PMS・客室管理システム)
```

## 2. 認証アーキテクチャ

### Option A: 統合認証サービス（推奨）

```typescript
// 共通認証ライブラリ
// packages/auth-lib/index.ts
export interface AuthUser {
  id: string
  tenantId: string
  email: string
  role: string
  systemAccess: ('concierge' | 'member' | 'pms')[]
}

export class AuthService {
  async validateToken(token: string): Promise<AuthUser | null> {
    // JWT検証 + Redis セッション確認
  }
  
  async login(email: string, password: string): Promise<{ token: string, user: AuthUser }> {
    // 統合認証処理
  }
}
```

### Option B: 独立認証（シンプル）

```typescript
// 各プロジェクトで独立した認証
// hotel-saas/server/api/auth/[...].ts
export default NuxtAuthHandler({
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // hotel-saas固有の認証ロジック
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { tenant: true }
        })
        
        if (user && user.systemAccess.includes('concierge')) {
          return {
            id: user.id,
            tenantId: user.tenant.id,
            email: user.email,
            role: user.role
          }
        }
        return null
      }
    })
  ]
})
```

## 3. データベース分離戦略

### 共通データベース + Row Level Security
```sql
-- テナント分離用のRLS設定
CREATE POLICY tenant_isolation ON orders
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id'));

-- 各プロジェクトでテナントIDを設定
-- hotel-saas/server/middleware/tenant.ts
export default defineEventHandler(async (event) => {
  const user = await getServerSession(event)
  if (user?.tenantId) {
    await prisma.$executeRaw`SET app.current_tenant_id = ${user.tenantId}`
  }
})
```

### システム別テーブル設計
```sql
-- hotel-saas専用テーブル
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  room_id VARCHAR(100),
  status VARCHAR(50),
  items JSON,
  total INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- hotel-member専用テーブル
CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  membership_level VARCHAR(50),
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- hotel-pms専用テーブル
CREATE TABLE pms_rooms (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  room_number VARCHAR(10),
  room_type VARCHAR(50),
  status VARCHAR(50),
  rate DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 4. 実装手順

### Phase 1: データベース移行（1週間）
```bash
# 1. PostgreSQL環境構築
docker-compose up -d postgres

# 2. Prismaスキーマ更新
# prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

# 3. 既存データ移行
npm run db:migrate-from-sqlite
```

### Phase 2: 認証システム統合（1週間）
```typescript
// 統合認証ミドルウェア
// shared/middleware/auth.ts
export const createAuthMiddleware = (systemName: string) => {
  return defineEventHandler(async (event) => {
    const session = await getServerSession(event)
    
    if (!session) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }
    
    // システムアクセス権限チェック
    if (!session.user.systemAccess.includes(systemName)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }
    
    // テナントコンテキスト設定
    event.context.tenantId = session.user.tenantId
    event.context.user = session.user
  })
}
```

### Phase 3: 各プロジェクト実装（2-3週間）
```typescript
// hotel-member/server/api/members/index.get.ts
export default defineEventHandler(async (event) => {
  const tenantId = event.context.tenantId
  
  const members = await prisma.member.findMany({
    where: { tenantId }
  })
  
  return { members }
})
```

## 5. 利点と考慮事項

### 利点
- **開発効率**: 各システムを独立して開発可能
- **スケーラビリティ**: システムごとに独立したデプロイ・スケーリング
- **保守性**: 機能ごとの責任分離
- **チーム分割**: 専門チームでの並行開発

### 考慮事項
- **データ整合性**: システム間でのデータ整合性管理
- **認証複雑性**: 統合認証の実装コスト
- **運用コスト**: 複数プロジェクトの運用管理
- **デプロイ複雑性**: 複数システムの同期デプロイ

## 6. 推奨事項

### 短期的（MVP）
- **Option B（独立認証）** を採用
- 共通データベースで Row Level Security使用
- 各プロジェクトで独立した認証実装

### 長期的（スケール）
- **Option A（統合認証）** への移行
- マイクロサービス化の検討
- API Gateway導入

## 7. 実装例

### 独立認証の実装
```typescript
// hotel-saas/nuxt.config.ts
export default defineNuxtConfig({
  auth: {
    baseURL: process.env.AUTH_ORIGIN,
    provider: {
      type: 'authjs'
    }
  },
  runtimeConfig: {
    authSecret: process.env.NUXT_AUTH_SECRET,
    public: {
      authUrl: process.env.NUXT_PUBLIC_AUTH_URL
    }
  }
})

// hotel-member/nuxt.config.ts
export default defineNuxtConfig({
  auth: {
    baseURL: process.env.AUTH_ORIGIN,
    provider: {
      type: 'authjs'
    }
  },
  // 同様の設定
})
```

### 共通データベースアクセス
```typescript
// shared/prisma/client.ts
import { PrismaClient } from '@prisma/client'

export const createPrismaClient = (tenantId?: string) => {
  const prisma = new PrismaClient()
  
  if (tenantId) {
    // テナント分離の自動適用
    return prisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            if (args.where) {
              args.where = { ...args.where, tenantId }
            } else {
              args.where = { tenantId }
            }
            return query(args)
          }
        }
      }
    })
  }
  
  return prisma
}
```

この設計により、各システムを独立して開発しながら、データの整合性と認証の統一性を保つことができます。 