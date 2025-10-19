# 🏗️ 理想的システムアーキテクチャ設計書

**作成日**: 2025年9月17日  
**目的**: 根本的設計改革による保守可能なシステム構築  
**適用範囲**: hotel-saas, hotel-pms, hotel-member, hotel-common  
**設計思想**: DRY, SOLID, Clean Architecture

---

## 🎯 **設計基本原則**

### **1. 絶対遵守事項**

#### **✅ 必須原則**
1. **DRY原則**: Don't Repeat Yourself - 重複実装の完全排除
2. **単一責任原則**: 一つの機能は一箇所でのみ実装
3. **依存性逆転原則**: 抽象に依存、具体に依存しない
4. **関心の分離**: ビジネスロジック・インフラ・UI の完全分離

#### **❌ 絶対禁止事項**
1. **重複実装**: 同じ機能の複数箇所実装
2. **モック・フォールバック**: 一時的回避実装
3. **環境依存分岐**: 開発・本番で異なる動作
4. **TypeScriptエラー放置**: 型安全性の妥協

---

## 🏗️ **理想的システム構成**

### **アーキテクチャ概要**

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────┬─────────────────┬─────────────────────────┤
│   hotel-saas    │   hotel-pms     │   hotel-member          │
│  (AI Concierge) │ (Front Desk)    │ (Member Management)     │
└─────────────────┴─────────────────┴─────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   API Gateway     │
                    │  (Unified Entry)  │
                    └─────────┬─────────┘
                              │
┌─────────────────────────────▼─────────────────────────────────┐
│                 hotel-common (Core Infrastructure)            │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Authentication │   Business      │   Data Access           │
│  Authorization  │   Logic         │   Layer                 │
│  Logging        │   Services      │                         │
│  Monitoring     │                 │                         │
└─────────────────┴─────────────────┴─────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   PostgreSQL      │
                    │  (Unified DB)     │
                    └───────────────────┘
```

### **責任分離**

#### **hotel-common (Core Infrastructure)**
```typescript
interface HotelCommonResponsibilities {
  // 認証・認可 (統一実装)
  authentication: {
    jwt_service: "JWT生成・検証・管理";
    permission_service: "権限チェック・管理";
    session_service: "セッション管理";
  };
  
  // 共通ビジネスロジック
  business_services: {
    reservation_service: "予約管理";
    customer_service: "顧客管理";
    room_service: "客室管理";
    billing_service: "請求管理";
  };
  
  // インフラストラクチャ
  infrastructure: {
    database_service: "データアクセス";
    logging_service: "統一ログ";
    monitoring_service: "監視・メトリクス";
    notification_service: "通知管理";
  };
}
```

#### **hotel-saas (AI Concierge System)**
```typescript
interface HotelSaasResponsibilities {
  // SaaS固有機能のみ
  ai_services: {
    concierge_ai: "AIコンシェルジュ";
    order_management: "注文管理UI";
    menu_management: "メニュー管理";
  };
  
  // UI/UX
  user_interface: {
    customer_facing: "顧客向けUI";
    staff_dashboard: "スタッフダッシュボード";
    analytics_ui: "分析画面";
  };
  
  // hotel-commonを利用（実装しない）
  dependencies: {
    authentication: "hotel-common/auth";
    business_logic: "hotel-common/services";
    data_access: "hotel-common/data";
  };
}
```

#### **hotel-pms (Property Management System)**
```typescript
interface HotelPmsResponsibilities {
  // PMS固有機能のみ
  front_desk_services: {
    checkin_checkout: "チェックイン・アウト";
    room_assignment: "客室割り当て";
    housekeeping: "ハウスキーピング";
  };
  
  // オフライン対応
  offline_capabilities: {
    local_cache: "ローカルキャッシュ";
    sync_service: "同期サービス";
    offline_ui: "オフライン対応UI";
  };
  
  // hotel-commonを利用（実装しない）
  dependencies: {
    authentication: "hotel-common/auth";
    business_logic: "hotel-common/services";
    data_access: "hotel-common/data";
  };
}
```

#### **hotel-member (Member Management System)**
```typescript
interface HotelMemberResponsibilities {
  // Member固有機能のみ
  member_services: {
    membership_management: "会員管理";
    loyalty_program: "ポイント・特典";
    marketing_campaigns: "マーケティング";
  };
  
  // プライバシー強化
  privacy_features: {
    data_protection: "データ保護";
    consent_management: "同意管理";
    privacy_dashboard: "プライバシー設定";
  };
  
  // hotel-commonを利用（実装しない）
  dependencies: {
    authentication: "hotel-common/auth";
    business_logic: "hotel-common/services";
    data_access: "hotel-common/data";
  };
}
```

---

## 🔐 **統一認証アーキテクチャ**

### **認証フロー設計**

```typescript
// hotel-common/src/auth/UnifiedAuthService.ts
export class UnifiedAuthService {
  // JWT管理
  async generateToken(user: Staff, permissions: string[]): Promise<JWTToken>
  async validateToken(token: string): Promise<AuthResult>
  async refreshToken(refreshToken: string): Promise<JWTToken>
  
  // 権限管理
  async checkPermission(user: Staff, resource: string, action: string): Promise<boolean>
  async getUserPermissions(user: Staff): Promise<Permission[]>
  
  // セッション管理
  async createSession(user: Staff): Promise<Session>
  async validateSession(sessionId: string): Promise<Session | null>
  async destroySession(sessionId: string): Promise<void>
}

// hotel-common/src/middleware/AuthMiddleware.ts
export class AuthMiddleware {
  async authenticate(request: Request): Promise<AuthContext>
  async authorize(context: AuthContext, requiredPermissions: string[]): Promise<boolean>
  handleAuthError(error: AuthError): StandardErrorResponse
}
```

### **各システムでの利用**

```typescript
// hotel-saas/server/middleware/auth.ts
import { AuthMiddleware } from 'hotel-common/middleware'

export default defineEventHandler(async (event) => {
  const authMiddleware = new AuthMiddleware()
  event.context.auth = await authMiddleware.authenticate(event)
})

// hotel-saas/server/api/orders/create.post.ts
export default defineEventHandler(async (event) => {
  // 認証は自動完了済み
  const { user, permissions } = event.context.auth
  
  // 権限チェック（必要に応じて）
  if (!permissions.includes('order.create')) {
    throw createError({ statusCode: 403, statusMessage: 'Insufficient permissions' })
  }
  
  // ビジネスロジックに集中
  const order = await OrderService.create(body, user.tenantId)
  return { success: true, order }
})
```

---

## 📊 **データベース設計**

### **統一データベース構成**

```sql
-- 共通テーブル (hotel-common管理)
CREATE SCHEMA common;

-- 認証・認可
CREATE TABLE common.staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    -- 統一スタッフ情報
);

CREATE TABLE common.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    -- 権限定義
);

-- ビジネスデータ
CREATE TABLE common.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    -- 顧客情報
);

CREATE TABLE common.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    customer_id UUID REFERENCES common.customers(id),
    -- 予約情報
);

-- システム固有テーブル
CREATE SCHEMA saas;
CREATE SCHEMA pms;
CREATE SCHEMA member;

-- SaaS固有
CREATE TABLE saas.ai_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES common.customers(id),
    -- AIセッション情報
);

-- PMS固有
CREATE TABLE pms.housekeeping_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES common.rooms(id),
    -- ハウスキーピング情報
);

-- Member固有
CREATE TABLE member.loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES common.customers(id),
    -- ポイント情報
);
```

---

## 🔄 **API設計原則**

### **統一API仕様**

```typescript
// 統一レスポンス形式
interface StandardApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    request_id: string;
    tenant_id: string;
    system: string;
  };
}

// 統一エラーコード
enum ApiErrorCode {
  // 認証エラー
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  
  // ビジネスエラー
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  
  // システムエラー
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
```

### **API実装パターン**

```typescript
// hotel-common/src/controllers/BaseController.ts
export abstract class BaseController {
  protected async executeWithAuth<T>(
    event: H3Event,
    requiredPermissions: string[],
    handler: (context: AuthContext) => Promise<T>
  ): Promise<StandardApiResponse<T>> {
    try {
      // 認証チェック
      const auth = event.context.auth
      if (!auth.user) {
        throw new ApiError(ApiErrorCode.UNAUTHORIZED, 'Authentication required')
      }
      
      // 権限チェック
      const hasPermission = requiredPermissions.every(p => auth.permissions.includes(p))
      if (!hasPermission) {
        throw new ApiError(ApiErrorCode.INSUFFICIENT_PERMISSIONS, 'Insufficient permissions')
      }
      
      // ビジネスロジック実行
      const result = await handler(auth)
      
      return {
        success: true,
        data: result,
        meta: this.createMeta(event, auth.user.tenantId)
      }
    } catch (error) {
      return this.handleError(error, event)
    }
  }
}

// 各システムでの利用
// hotel-saas/server/api/orders/create.post.ts
class OrderController extends BaseController {
  async create(event: H3Event) {
    return this.executeWithAuth(
      event,
      ['order.create'],
      async (auth) => {
        const body = await readBody(event)
        return OrderService.create(body, auth.user.tenantId)
      }
    )
  }
}
```

---

## 🛠️ **開発ルール・プロセス**

### **1. ドキュメント遵守開発**

#### **実装前必須チェック**
```typescript
interface PreImplementationChecklist {
  documentation_review: [
    "該当機能の設計書は存在するか？",
    "設計書は最新版か？",
    "実装方針は設計書と一致するか？",
    "依存関係は明確に定義されているか？"
  ];
  
  duplication_check: [
    "同じ機能が既に実装されていないか？",
    "既存の共通機能を利用できないか？",
    "新規実装が本当に必要か？",
    "共通化できる部分はないか？"
  ];
  
  architecture_compliance: [
    "設計原則に従っているか？",
    "適切なレイヤーに実装しているか？",
    "依存関係は正しい方向か？",
    "テスト可能な設計か？"
  ];
}
```

### **2. モック・フォールバック禁止**

#### **禁止実装パターン**
```typescript
// ❌ 絶対禁止: モック・フォールバック実装
export async function getUserInfo(userId: string) {
  try {
    return await api.getUser(userId)
  } catch (error) {
    // ❌ フォールバック禁止
    return { id: userId, name: 'Unknown User' }
  }
}

// ❌ 絶対禁止: 環境依存分岐
export async function authenticate(token: string) {
  if (process.env.NODE_ENV === 'development') {
    // ❌ 開発環境での認証スキップ禁止
    return { user: mockUser }
  }
  return await validateToken(token)
}
```

#### **正しい実装パターン**
```typescript
// ✅ 正しい: エラーを適切に処理・伝播
export async function getUserInfo(userId: string): Promise<User> {
  try {
    return await api.getUser(userId)
  } catch (error) {
    // エラーを隠蔽せず、適切に処理
    logger.error('Failed to get user info', { userId, error })
    throw new ApiError(ApiErrorCode.RESOURCE_NOT_FOUND, `User not found: ${userId}`)
  }
}

// ✅ 正しい: 環境非依存の統一実装
export async function authenticate(token: string): Promise<AuthResult> {
  // 全環境で同じ認証フロー
  return await authService.validateToken(token)
}
```

### **3. 本番同等開発環境**

#### **環境統一要件**
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  hotel-common:
    environment:
      - NODE_ENV=development
      - JWT_SECRET=${JWT_SECRET} # 本番同等の秘密鍵
      - DATABASE_URL=${DATABASE_URL} # 本番同等のDB
      - REDIS_URL=${REDIS_URL} # 本番同等のRedis
    
  hotel-saas:
    environment:
      - NODE_ENV=development
      - COMMON_API_URL=http://hotel-common:3400 # 本番同等のAPI接続
      
  postgresql:
    image: postgres:15 # 本番同等のバージョン
    
  redis:
    image: redis:7 # 本番同等のバージョン
```

### **4. TypeScriptエラー完全解消**

#### **型安全性要件**
```typescript
// tsconfig.json (全プロジェクト統一)
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}

// 型定義の統一
// hotel-common/src/types/index.ts
export interface Staff {
  id: string;
  tenantId: string;
  email: string;
  // 完全な型定義
}

export interface AuthContext {
  user: Staff;
  permissions: string[];
  session: Session;
}
```

#### **エラー解消プロセス**
```bash
# 各モジュールでの必須チェック
cd hotel-common && npm run type-check
# ✅ Found 0 errors. 必須

cd hotel-saas && npm run type-check  
# ✅ Found 0 errors. 必須

cd hotel-pms && npm run type-check
# ✅ Found 0 errors. 必須

cd hotel-member && npm run type-check
# ✅ Found 0 errors. 必須
```

---

## 📋 **実装フェーズ計画**

### **Phase 1: 基盤構築 (1-2週間)**
1. **hotel-common基盤実装**
   - 統一認証サービス
   - 統一データアクセス
   - 統一エラーハンドリング

2. **TypeScriptエラー完全解消**
   - 全モジュールでエラー0件達成
   - 型定義の統一

### **Phase 2: システム統合 (2-3週間)**
1. **hotel-saas統合**
   - 既存認証 → hotel-common移行
   - API統合
   - 重複コード除去

2. **hotel-pms統合**
   - 認証システム実装
   - オフライン対応
   - 統合テスト

3. **hotel-member統合**
   - 認証システム実装
   - プライバシー機能
   - 統合テスト

### **Phase 3: 品質保証 (1週間)**
1. **統合テスト**
2. **パフォーマンステスト**
3. **セキュリティテスト**
4. **ドキュメント整備**

---

## 🎯 **成功指標**

### **技術指標**
- TypeScriptエラー: 0件 (全モジュール)
- コード重複率: 5%以下
- テストカバレッジ: 80%以上
- API応答時間: 200ms以下

### **品質指標**
- セキュリティ脆弱性: 0件
- 設計原則違反: 0件
- ドキュメント整合性: 100%
- 開発効率: 50%向上

**この理想的アーキテクチャにより、保守可能で拡張性の高いシステムを構築します。**
