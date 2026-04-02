# マルチプロジェクト連携設計書

## 1. プロジェクト構成と連携方式

### 1.1 推奨プロジェクト構成
```
/hotel-saas       (AIコンシェルジュ・注文システム)
/hotel-member     (会員・予約システム)
/hotel-pms        (PMS・客室管理システム)
/hotel-common     (共通ライブラリ)
```

### 1.2 連携アーキテクチャ
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   hotel-saas    │ │  hotel-member   │ │   hotel-pms     │
│   :3100         │ │    :3200        │ │    :3300        │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                ┌────────────▼────────────┐
                │   共通PostgreSQL DB     │
                │   (テナント分離)        │
                └─────────────────────────┘
```

## 2. データベース連携設計

### 2.1 共通データベーススキーマ
```sql
-- 共通テーブル（全システムで使用）
CREATE TABLE tenants (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active'
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  system_access TEXT[] -- ['concierge', 'member', 'pms']
);

-- hotel-saas専用テーブル
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  room_id VARCHAR(100) NOT NULL,
  guest_id INTEGER REFERENCES guests(id),
  status VARCHAR(50) DEFAULT 'received',
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- hotel-member専用テーブル
CREATE TABLE guests (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  member_id VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  guest_id INTEGER REFERENCES guests(id),
  room_id VARCHAR(100) NOT NULL,
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',
  total_amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- hotel-pms専用テーブル
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  room_number VARCHAR(20) NOT NULL,
  room_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'available', -- available, occupied, maintenance
  current_guest_id INTEGER REFERENCES guests(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE housekeeping_tasks (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) REFERENCES tenants(id),
  room_id INTEGER REFERENCES rooms(id),
  task_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  assigned_to VARCHAR(255),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 Row Level Security (RLS) 設定
```sql
-- テナント分離のためのRLS設定
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_orders ON orders
  USING (tenant_id = current_setting('app.current_tenant'));

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_guests ON guests
  USING (tenant_id = current_setting('app.current_tenant'));

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_reservations ON reservations
  USING (tenant_id = current_setting('app.current_tenant'));
```

## 3. API連携設計

### 3.1 共通API仕様
```typescript
// 共通レスポンス形式
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  meta?: {
    tenant_id: string
    timestamp: string
    request_id: string
  }
}

// 共通認証ヘッダー
interface AuthHeaders {
  'Authorization': `Bearer ${string}`
  'X-Tenant-ID': string
  'X-Request-ID': string
}
```

### 3.2 システム間API呼び出し
```typescript
// hotel-common/src/api-client.ts
export class HotelApiClient {
  constructor(
    private baseUrl: string,
    private tenantId: string,
    private authToken: string
  ) {}

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`,
      'X-Tenant-ID': this.tenantId,
      'X-Request-ID': crypto.randomUUID(),
      ...options.headers
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    })

    return response.json()
  }
}

// 使用例
const memberApi = new HotelApiClient('http://localhost:3200', tenantId, token)
const guestData = await memberApi.request<Guest>('/api/v1/guests/123')
```

### 3.3 リアルタイム連携（WebSocket）
```typescript
// hotel-common/src/websocket-client.ts
export class HotelWebSocketClient {
  private connections: Map<string, WebSocket> = new Map()

  connect(systemName: string, url: string, tenantId: string) {
    const ws = new WebSocket(`${url}?tenant=${tenantId}`)
    
    ws.onopen = () => {
      console.log(`Connected to ${systemName}`)
    }
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      this.handleMessage(systemName, data)
    }
    
    this.connections.set(systemName, ws)
  }

  private handleMessage(system: string, data: any) {
    // システム間イベントの処理
    switch (data.type) {
      case 'guest_checkin':
        this.broadcastToSystems('guest_checkin', data, ['saas', 'pms'])
        break
      case 'order_completed':
        this.broadcastToSystems('order_completed', data, ['member', 'pms'])
        break
      case 'room_status_change':
        this.broadcastToSystems('room_status_change', data, ['saas', 'member'])
        break
    }
  }
}
```

## 4. 認証・認可連携

### 4.1 統合認証サービス
```typescript
// hotel-common/src/auth-service.ts
export interface AuthUser {
  id: string
  tenantId: string
  email: string
  role: string
  systemAccess: SystemAccess[]
  permissions: Permission[]
}

export interface SystemAccess {
  system: 'concierge' | 'member' | 'pms'
  level: 'read' | 'write' | 'admin'
}

export class AuthService {
  async validateToken(token: string): Promise<AuthUser | null> {
    // JWT検証 + データベース確認
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: true,
        permissions: true
      }
    })

    if (!user || !user.tenant || user.tenant.status !== 'active') {
      return null
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      systemAccess: user.systemAccess,
      permissions: user.permissions
    }
  }

  async login(email: string, password: string): Promise<{
    token: string
    user: AuthUser
  }> {
    // 認証処理
    const user = await this.authenticateUser(email, password)
    const token = this.generateToken(user)
    
    return { token, user }
  }
}
```

### 4.2 システム別認証ミドルウェア
```typescript
// hotel-saas/server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  // 認証が必要なパスのチェック
  if (!event.node.req.url?.startsWith('/api/v1/')) {
    return
  }

  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authorization header required'
    })
  }

  const token = authHeader.substring(7)
  const authService = new AuthService()
  const user = await authService.validateToken(token)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid token'
    })
  }

  // システムアクセス権限チェック
  const hasAccess = user.systemAccess.some(
    access => access.system === 'concierge'
  )

  if (!hasAccess) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Access denied for this system'
    })
  }

  // テナントIDをコンテキストに設定
  event.context.auth = { user, tenantId: user.tenantId }
  
  // データベース接続にテナントIDを設定
  await prisma.$executeRaw`SET app.current_tenant = ${user.tenantId}`
})
```

## 5. 実装手順

### 5.1 Phase 1: 基盤準備（1-2週間）
```bash
# 1. 共通ライブラリプロジェクトの作成
mkdir hotel-common
cd hotel-common
npm init -y
npm install typescript @types/node

# 2. データベース移行
# SQLiteからPostgreSQLへの移行
# テナント分離の実装

# 3. 共通認証システムの実装
# JWT + Redis セッション管理
```

### 5.2 Phase 2: システム分離（2-3週間）
```bash
# 1. hotel-memberプロジェクトの作成
mkdir hotel-member
cd hotel-member
npx nuxi@latest init .

# 2. hotel-pmsプロジェクトの作成
mkdir hotel-pms
cd hotel-pms
npx nuxi@latest init .

# 3. 既存システムの移行
# hotel-saasの機能分離
```

### 5.3 Phase 3: 連携実装（3-4週間）
```bash
# 1. API連携の実装
# システム間通信の実装

# 2. WebSocket連携の実装
# リアルタイム同期の実装

# 3. 統合テストの実装
# E2Eテストの作成
```

## 6. 運用・監視

### 6.1 ログ集約
```typescript
// hotel-common/src/logger.ts
export class HotelLogger {
  static log(system: string, level: string, message: string, meta?: any) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      system,
      level,
      message,
      meta,
      tenantId: getCurrentTenantId()
    }
    
    // ログ集約システムに送信
    this.sendToLogAggregator(logEntry)
  }
}
```

### 6.2 ヘルスチェック
```typescript
// 各システムのヘルスチェック
export default defineEventHandler(async (event) => {
  const health = {
    system: 'hotel-saas',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      external_apis: await checkExternalApis()
    }
  }
  
  return health
})
```

## 7. セキュリティ考慮事項

### 7.1 テナント分離
- Row Level Security (RLS) による完全分離
- APIレベルでのテナントID検証
- ファイルアップロードのテナント分離

### 7.2 システム間通信
- 内部API用の専用認証トークン
- HTTPS通信の強制
- レート制限の実装

### 7.3 データ保護
- 個人情報の暗号化
- 監査ログの実装
- GDPR対応のデータ削除機能

この設計により、各システムを独立して開発・運用しながら、必要に応じて連携できる柔軟なアーキテクチャを実現できます。 