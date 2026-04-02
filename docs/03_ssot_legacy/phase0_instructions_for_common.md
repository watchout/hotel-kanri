# 🔧 Phase 0 修正指示書 - hotel-common

**対象システム**: hotel-common  
**担当AI**: Iza  
**期間**: 0.5日  
**優先度**: 🟢 低（確認のみ）

---

## 📋 修正概要

### 確認内容
1. **Redis実装の確認**（✅ 既に正しい）
2. **Session認証の確認**（✅ 既に正しい）
3. **環境分岐コードの確認**（一部修正必要）

### 結論
**hotel-commonは大部分が正しく実装済み**

---

## ✅ 確認1: Redis実装（修正不要）

### 現在の実装状況

**ファイル**: `/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts`

**実装内容**:
```typescript
// ✅ 正しい実装: RealRedis使用
class RealRedis implements RedisLike {
  private client: RedisClientType | null = null;

  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.client = createClient({ url: redisUrl });
      
      this.client.on('error', (err) => {
        console.error('[hotel-common] Redis接続エラー:', err);
      });
      
      await this.client.connect();
      console.log('[hotel-common] Redis接続成功:', redisUrl);
    }
    return this.client;
  }
}

const redis: RedisLike = new RealRedis();
```

### 確認結果
- ✅ SimpleRedisは削除済み
- ✅ 実Redisを使用
- ✅ 開発・本番共通の実装
- ✅ 修正不要

---

## ✅ 確認2: Session認証（修正不要）

### 現在の実装状況

**ファイル**: `/Users/kaneko/hotel-common/src/auth/SessionAuthService.ts`

**実装内容**:
```typescript
// ✅ 正しい実装: Session認証
export class SessionAuthService {
  /**
   * セッション作成
   */
  async createSession(user: {
    user_id: string;
    tenant_id: string;
    email: string;
    role: string;
    level: number;
    permissions: string[];
    accessibleTenants: Array<{
      id: string;
      name: string;
      isPrimary: boolean;
    }>;
    currentTenant: {
      id: string;
      name: string;
    };
  }): Promise<string> {
    try {
      const sessionId = this.generateSecureSessionId();
      const sessionData: SessionUser = {
        user_id: user.user_id,
        tenant_id: user.tenant_id,
        email: user.email,
        role: user.role as SessionUser['role'],
        level: user.level,
        permissions: user.permissions,
        accessibleTenants: user.accessibleTenants,
        currentTenant: user.currentTenant,
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString()
      };

      // セッションをRedisに保存（1時間有効）
      await redis.setex(
        `hotel:session:${sessionId}`,
        3600,
        JSON.stringify(sessionData)
      );

      return sessionId;
    } catch (error) {
      logger.error('セッション作成エラー:', error);
      throw new Error('セッション作成に失敗しました');
    }
  }

  /**
   * セッション検証
   */
  async validateSession(sessionId: string): Promise<SessionUser | null> {
    try {
      if (!sessionId) {
        return null;
      }

      const sessionData = await redis.get(`hotel:session:${sessionId}`);
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData) as SessionUser;

      // セッション更新（最終アクセス時刻更新 + TTL延長）
      session.last_accessed = new Date().toISOString();
      await redis.setex(
        `hotel:session:${sessionId}`,
        3600,
        JSON.stringify(session)
      );

      return session;
    } catch (error) {
      logger.error('セッション検証エラー:', error);
      return null;
    }
  }
}
```

### 確認結果
- ✅ Session認証が正しく実装されている
- ✅ Redis Key形式: `hotel:session:{sessionId}`
- ✅ TTL: 3600秒（1時間）
- ✅ セッション自動延長機能あり
- ✅ 修正不要

---

## ✅ 確認3: データベーススキーマ（修正不要）

### 現在の実装状況

**ファイル**: `/Users/kaneko/hotel-common/prisma/schema.prisma`

**実装内容**:
```prisma
// ✅ 正しい実装: sessionId対応済み
model Order {
  id        Int               @id @default(autoincrement())
  tenantId  String
  roomId    String
  placeId   Int?
  status    String            @default("received")
  items     Json
  total     Int
  createdAt DateTime          @default(now())
  updatedAt DateTime
  paidAt    DateTime?
  isDeleted Boolean           @default(false)
  deletedAt DateTime?
  sessionId String?           // ✅ sessionId追加済み
  uuid      String?           @unique
  session   checkin_sessions? @relation(fields: [sessionId], references: [id])
  OrderItem OrderItem[]

  @@index([sessionId])  // ✅ インデックスあり
  @@map("orders")
}

// ✅ 正しい実装: checkin_sessionsテーブル
model checkin_sessions {
  id             String    @id @default(cuid())
  tenantId       String    @map("tenant_id")
  roomId         String    @map("room_id")
  guestName      String?   @map("guest_name")
  checkInTime    DateTime  @map("check_in_time")
  checkOutTime   DateTime? @map("check_out_time")
  status         String    @default("active")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  Order          Order[]

  @@index([tenantId])
  @@index([roomId])
  @@index([status])
  @@map("checkin_sessions")
}

// ✅ 正しい実装: staff_tenant_memberships
model staff_tenant_memberships {
  id         String   @id @default(cuid())
  staff_id   String
  tenant_id  String
  role       String   @default("staff")
  level      Int      @default(4)
  permissions Json    @default("[]")
  is_primary Boolean  @default(false)
  is_active  Boolean  @default(true)
  joined_at  DateTime @default(now())
  left_at    DateTime?
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  staff  staff  @relation(fields: [staff_id], references: [id])
  tenant Tenant @relation(fields: [tenant_id], references: [id])

  @@unique([staff_id, tenant_id])
  @@index([staff_id])
  @@index([tenant_id])
  @@index([is_primary])
}
```

### 確認結果
- ✅ Orderテーブルに`sessionId`フィールドあり
- ✅ checkin_sessionsテーブルあり
- ✅ staff_tenant_membershipsテーブルあり（マルチテナント対応）
- ✅ 修正不要

---

## 🚨 修正1: 環境分岐コードの確認（一部修正必要）

### 調査対象ファイル

hotel-saasで環境分岐が検出されたファイルのうち、hotel-commonに関連する可能性があるもの：

```
/Users/kaneko/hotel-saas/server/middleware/tenant-context.ts
/Users/kaneko/hotel-saas/server/api/v1/admin/system/system-settings.post.ts
/Users/kaneko/hotel-saas/server/api/v1/orders/active.get.ts
/Users/kaneko/hotel-saas/server/api/health.get.ts
/Users/kaneko/hotel-saas/server/utils/auth.ts
/Users/kaneko/hotel-saas/server/api/v1/integration/session-sync.post.ts
```

### 確認内容

**hotel-common側で環境分岐コードがあるか確認**:

```bash
# hotel-common内で環境分岐を検索
grep -rn "NODE_ENV.*development" /Users/kaneko/hotel-common/src/
```

### 確認結果（想定）

hotel-commonでは環境分岐コードは少ないと予想されます。
もし発見された場合は、以下のパターンで修正：

#### ❌ 削除するコード
```typescript
if (process.env.NODE_ENV === 'development') {
  // 開発環境専用の処理
  return mockData
}
```

#### ✅ 修正後のコード
```typescript
// 環境変数で接続先のみ変更、ロジックは同一
const databaseUrl = process.env.DATABASE_URL
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
```

---

## 📋 作業手順

### Day 1: 確認作業（0.5日 = 4時間）

#### 午前（2時間）

1. **Redis実装の確認**（30分）
   - [ ] SessionAuthService.tsの確認
   - [ ] RealRedis実装の確認
   - [ ] SimpleRedis削除の確認

2. **Session認証の確認**（30分）
   - [ ] セッション作成機能の確認
   - [ ] セッション検証機能の確認
   - [ ] セッション削除機能の確認

3. **データベーススキーマの確認**（30分）
   - [ ] Orderテーブルの確認
   - [ ] checkin_sessionsテーブルの確認
   - [ ] staff_tenant_membershipsテーブルの確認

4. **環境分岐コードの検索**（30分）
   - [ ] `NODE_ENV`での検索
   - [ ] 環境分岐コードの有無確認

#### 午後（2時間）

5. **環境分岐コードの修正**（1時間）
   - 発見された場合のみ修正

6. **動作確認**（1時間）
   - [ ] Redis接続確認
   - [ ] セッション作成・検証確認
   - [ ] hotel-saasからのAPI呼び出し確認

---

## ✅ 確認完了チェックリスト

### Redis実装
- [ ] RealRedis実装確認
- [ ] SimpleRedis削除確認
- [ ] Redis接続確認

### Session認証
- [ ] セッション作成機能確認
- [ ] セッション検証機能確認
- [ ] セッション削除機能確認
- [ ] TTL設定確認

### データベーススキーマ
- [ ] Orderテーブル確認
- [ ] checkin_sessionsテーブル確認
- [ ] staff_tenant_membershipsテーブル確認

### 環境分岐コード
- [ ] 環境分岐コードの検索
- [ ] 発見された場合は修正
- [ ] 修正後の動作確認

---

## 📊 進捗報告

### 完了報告

**報告先**: Iza（統合管理者）

**報告内容**:
- ✅ Redis実装確認完了
- ✅ Session認証確認完了
- ✅ データベーススキーマ確認完了
- ✅ 環境分岐コード確認完了
- ✅ hotel-commonは修正不要（または軽微な修正のみ）

---

## 🎉 結論

**hotel-commonは既に正しく実装されている**

- ✅ Redis実装: 正しい
- ✅ Session認証: 正しい
- ✅ データベーススキーマ: 正しい
- ✅ マルチテナント対応: 正しい
- ✅ チェックインセッション対応: 正しい

**Phase 0での修正は不要（または軽微な確認のみ）**

---

**作成日**: 2025年10月7日  
**担当AI**: Iza（統合管理者）  
**承認者**: Iza（統合管理者）

