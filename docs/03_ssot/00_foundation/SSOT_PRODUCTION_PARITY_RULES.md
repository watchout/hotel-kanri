# 🚨 SSOT: 本番同等実装ルール（最高優先）

**Doc-ID**: SSOT-PROD-PARITY-001  
**バージョン**: 1.0.0  
**作成日**: 2025年10月4日  
**最終更新**: 2025年10月4日  
**ステータス**: 🔴 承認済み（最高権威）  
**優先度**: 🔴🔴🔴 **絶対遵守**  
**所有者**: Iza（統合管理者）

**⚠️ 重要**: このSSOTは**全システム・全AI開発者が最優先で遵守すべき基本原則**です。

**関連SSOT**:
- [SSOT_TEST_ENVIRONMENT.md](./SSOT_TEST_ENVIRONMENT.md) - テスト環境の正しい使い方
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント設計
- [SSOT_CREATION_RULES.md](../SSOT_CREATION_RULES.md) - SSOT作成時の必須チェック

---

## 📋 概要

### 目的
**開発環境と本番環境で同じ実装を保証する**ための絶対ルールを定義する。

### なぜこのSSOTが必要か

#### 🚨 過去の重大な問題

```typescript
// ❌ 実際にあった本番障害の原因コード
const tenantId = user.tenant_id || 'default';  // 開発では動く、本番で全滅
```

**結果**:
- 開発環境: `'default'`テナントが存在するため正常動作
- 本番環境: `'default'`テナントは存在せず、全機能が停止

**根本原因**:
- 本番同等の実装になっていない
- テスト用の固定値がハードコードされている
- 環境依存の実装が混入している

---

## ⚠️ 絶対禁止パターン（CRITICAL）

### 🔴 禁止1: テナントIDのハードコード

#### ❌ 絶対禁止
```typescript
// パターン1: 固定値フォールバック
const tenantId = user.tenant_id || 'default';
tenantId: session.tenant_id || 'default'

// パターン2: 直接指定
tenantId: 'default'
tenant_id: 'default'

// パターン3: 条件分岐
if (process.env.NODE_ENV === 'development') {
  tenantId = 'default';
}
```

#### ✅ 正しい実装
```typescript
// パターン1: エラーを返す
const tenantId = user.tenant_id || user.tenantId;
if (!tenantId) {
  throw createError({
    statusCode: 400,
    statusMessage: 'Tenant ID is required'
  });
}

// パターン2: セッションから必ず取得
const tenantId = req.session.tenant_id;
if (!tenantId) {
  return res.status(400).json({
    success: false,
    error: { code: 'MISSING_TENANT_ID', message: 'Tenant ID is required' }
  });
}

// パターン3: 環境変数のみ許可（テストスクリプト限定）
// ⚠️ API・業務ロジックでは使用禁止
const tenantId = process.env.TEST_TENANT_ID;  // テストスクリプトのみOK
```

---

### 🔴 禁止2: 環境分岐実装

#### ❌ 絶対禁止
```typescript
// パターン1: 環境による実装分岐
if (process.env.NODE_ENV === 'development') {
  // 開発環境だけの実装
  return mockData;
} else {
  // 本番環境の実装
  return await fetchRealData();
}

// パターン2: 環境による認証スキップ
if (process.env.NODE_ENV !== 'production') {
  // 認証をスキップ
  req.user = { id: 'mock-user', tenantId: 'default' };
  return next();
}

// パターン3: 開発環境だけRedis不使用
const sessionStore = process.env.NODE_ENV === 'production' 
  ? new RedisStore() 
  : new MemoryStore();
```

#### ✅ 正しい実装
```typescript
// パターン1: 環境変数で接続先のみ変更（実装は同じ）
const apiUrl = process.env.API_URL;  // 開発: localhost, 本番: production-url
const response = await fetch(apiUrl);  // 実装は同じ

// パターン2: 環証は常に必須
const user = await authenticate(req);
if (!user) {
  return res.status(401).json({ error: 'Authentication required' });
}

// パターン3: Redis統一（接続先だけ環境変数）
const redisUrl = process.env.REDIS_URL;  // 開発: localhost, 本番: production-redis
const sessionStore = new RedisStore({ url: redisUrl });
```

---

### 🔴 禁止3: モックデータの常時使用

#### ❌ 絶対禁止
```typescript
// パターン1: 常にモックを返す
export const getUser = async (id: string) => {
  // TODO: 実装する
  return {
    id: 'mock-user',
    tenantId: 'default',
    name: 'Test User'
  };
};

// パターン2: フラグでモック切り替え
const USE_MOCK = true;  // ハードコード
if (USE_MOCK) {
  return mockData;
}
```

#### ✅ 正しい実装
```typescript
// パターン1: 実装を完成させる
export const getUser = async (id: string) => {
  const user = await prisma.user.findUnique({
    where: { id }
  });
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

// パターン2: テストでのみモック使用
// tests/user.test.ts
vi.mock('./user-service', () => ({
  getUser: vi.fn().mockResolvedValue(mockUser)
}));
```

---

### 🔴 禁止4: DBスキーマのデフォルト値

#### ❌ 絶対禁止
```typescript
// Prisma schema
model Room {
  id        String   @id
  tenantId  String   @default("default")  // ❌ 本番で危険
  roomNumber String
}

// SQL
CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  tenant_id TEXT DEFAULT 'default',  -- ❌ 本番で危険
  room_number TEXT
);
```

#### ✅ 正しい実装
```typescript
// Prisma schema
model Room {
  id        String   @id
  tenantId  String   // デフォルト値なし＝必須
  roomNumber String
  
  @@index([tenantId])
}

// SQL
CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- 必須、デフォルトなし
  room_number TEXT
);

-- テストデータ投入時のみ明示的に指定
INSERT INTO rooms (id, tenant_id, room_number)
VALUES (uuid_generate_v4(), 'default', '101');
```

---

## ✅ 本番同等実装パターン

### パターン1: テナントID取得（認証済みAPI）

```typescript
// ❌ 間違い
export default defineEventHandler(async (event) => {
  const user = event.context.user;
  const tenantId = user?.tenant_id || 'default';  // ❌
  
  const data = await prisma.room.findMany({
    where: { tenantId }
  });
  return data;
});

// ✅ 正しい
export default defineEventHandler(async (event) => {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    });
  }
  
  const tenantId = user.tenant_id || user.tenantId;
  if (!tenantId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Tenant ID is required'
    });
  }
  
  const data = await prisma.room.findMany({
    where: { tenantId }
  });
  return data;
});
```

---

### パターン2: テナントID取得（ヘッダー経由）

```typescript
// ❌ 間違い
export default defineEventHandler(async (event) => {
  const tenantId = getHeader(event, 'X-Tenant-ID') || 'default';  // ❌
  // ...
});

// ✅ 正しい
export default defineEventHandler(async (event) => {
  const tenantId = getHeader(event, 'X-Tenant-ID');
  if (!tenantId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'X-Tenant-ID header is required'
    });
  }
  // ...
});
```

---

### パターン3: 環境変数の正しい使い方

```typescript
// ❌ 間違い
const config = {
  redis: process.env.NODE_ENV === 'production' 
    ? { host: 'redis-prod', port: 6379 }
    : null,  // 開発環境はRedis不使用 ❌
  tenantId: process.env.NODE_ENV === 'production'
    ? undefined
    : 'default'  // 開発環境だけ固定値 ❌
};

// ✅ 正しい
const config = {
  // 接続先だけ環境変数（実装は同じ）
  redisUrl: process.env.REDIS_URL,  // 開発: localhost, 本番: production
  databaseUrl: process.env.DATABASE_URL,
  apiUrl: process.env.API_URL,
  
  // テナントIDは環境変数に入れない（動的取得必須）
  // tenantId: ❌ 設定してはいけない
};
```

---

## 🔍 ハードコード検出方法

### 自動検出コマンド

```bash
# テナントIDハードコードを検出
grep -rn "tenantId.*['\"]default['\"]" --include="*.ts" --include="*.js" .
grep -rn "tenant_id.*['\"]default['\"]" --include="*.ts" --include="*.js" .

# 環境分岐を検出
grep -rn "NODE_ENV.*==.*['\"]development['\"]" --include="*.ts" --include="*.js" .
grep -rn "NODE_ENV.*===.*['\"]production['\"]" --include="*.ts" --include="*.js" .

# フォールバック || 'default' を検出
grep -rn "||.*['\"]default['\"]" --include="*.ts" --include="*.js" .
```

### 許可される例外

以下のファイルでのみ `'default'` の使用を許可：

#### ✅ 許可されるケース

1. **シードスクリプト**
   ```typescript
   // scripts/seed.ts - OK
   await prisma.room.create({
     data: {
       tenantId: 'default',  // ✅ テストデータ投入
       roomNumber: '101'
     }
   });
   ```

2. **テストコード**
   ```typescript
   // tests/room.test.ts - OK
   const mockUser = {
     id: 'test-user',
     tenantId: 'default'  // ✅ テスト用モック
   };
   ```

3. **SSOTドキュメント**
   ```markdown
   # SSOT_TEST_ENVIRONMENT.md - OK
   テナントID: `default`  <!-- ✅ ドキュメント内の説明 -->
   ```

#### ❌ 禁止されるケース

1. **API実装**
   ```typescript
   // server/api/rooms.get.ts - NG
   const tenantId = user.tenant_id || 'default';  // ❌
   ```

2. **ビジネスロジック**
   ```typescript
   // services/room-service.ts - NG
   if (!tenantId) tenantId = 'default';  // ❌
   ```

3. **ミドルウェア**
   ```typescript
   // middleware/auth.ts - NG
   req.tenantId = session.tenant_id || 'default';  // ❌
   ```

---

## 🧪 検証方法

### Phase 1: コードレビュー

```bash
# 1. ハードコード検出
npm run check:hardcode

# 2. 環境分岐検出
npm run check:env-branch

# 3. 型チェック
npm run type-check
```

### Phase 2: テスト実行

```typescript
// tests/production-parity.test.ts
describe('本番同等性チェック', () => {
  it('テナントIDなしでエラーを返すこと', async () => {
    const response = await request(app)
      .get('/api/rooms')
      .set('Authorization', 'Bearer valid-token');
      // X-Tenant-ID ヘッダーなし
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MISSING_TENANT_ID');
  });
  
  it('不正なテナントIDでエラーを返すこと', async () => {
    const response = await request(app)
      .get('/api/rooms')
      .set('Authorization', 'Bearer valid-token')
      .set('X-Tenant-ID', 'non-existent');
    
    expect(response.status).toBe(404);
  });
});
```

### Phase 3: 本番環境シミュレーション

```bash
# 環境変数を本番相当に設定してテスト
NODE_ENV=production \
REDIS_URL=redis://localhost:6379 \
DATABASE_URL=postgresql://localhost:5432/hotel_prod_test \
npm run test:integration
```

---

## 📊 実装チェックリスト

### 新規実装時の必須チェック

- [ ] **テナントID取得**: セッション/ヘッダーから動的取得
- [ ] **エラーハンドリング**: テナントIDがない場合は400エラー
- [ ] **フォールバック禁止**: `|| 'default'` を使用していない
- [ ] **環境分岐なし**: `NODE_ENV` による実装分岐なし
- [ ] **型安全性**: TypeScriptで`tenantId: string`（非nullableチェック）
- [ ] **テスト**: テナントIDなしケースのテスト追加

### 既存実装修正時の必須チェック

- [ ] **ハードコード検索**: `grep`で固定値を検索
- [ ] **修正箇所特定**: 問題のある全箇所をリストアップ
- [ ] **優先度判定**: Critical/High/Lowに分類
- [ ] **修正実施**: Criticalから順に修正
- [ ] **テスト実行**: 修正後の動作確認
- [ ] **レビュー**: 他の開発者による確認

---

## 🚫 SSOT作成時の必須チェック

### Phase 0: ハードコード検出（新規追加）

SSOT作成時、以下を**必ず実行**すること：

```bash
# 1. 対象機能のファイルを特定
find . -name "*room*" -type f

# 2. テナントIDハードコードを検索
grep -rn "tenantId.*'default'" room-service.ts
grep -rn "tenant_id.*'default'" room-service.ts

# 3. 検出結果をSSOTに記載
## ❌ 現在の実装の問題点

### 🔴 Critical: テナントIDハードコード
- **ファイル**: `/path/to/room-service.ts` (line 42)
- **コード**: `const tenantId = user.tenant_id || 'default'`
- **影響**: 本番環境で動作しない
- **修正必須**: セッションから動的取得に変更
```

### Phase 4: 本番同等性の明示（強化）

SSOTに以下セクションを**必ず追加**：

```markdown
## ⚠️ 本番同等実装の必須要件

### テナントID取得方法

✅ **正しい実装**:
```typescript
const tenantId = req.user.tenant_id;
if (!tenantId) {
  throw createError({ statusCode: 400, message: 'Tenant ID required' });
}
```

❌ **禁止されている実装**:
```typescript
const tenantId = req.user.tenant_id || 'default';  // ❌ 本番で動作しない
```

### 環境統一要件

- ✅ 開発・本番で同じ実装
- ✅ 環境変数で接続先のみ変更
- ❌ 環境分岐実装は禁止
```

---

## 📚 参考資料

### 関連SSOT
- [SSOT_TEST_ENVIRONMENT.md](./SSOT_TEST_ENVIRONMENT.md) - テスト環境の正しい使い方
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - テナント分離設計
- [SSOT_CREATION_RULES.md](../SSOT_CREATION_RULES.md) - SSOT作成ルール

### 実装例
- [hotel-saas/server/api/v1/admin/front-desk/billing-settings.get.ts](../../../../hotel-saas/server/api/v1/admin/front-desk/billing-settings.get.ts)
- [hotel-saas/lib/hotel-common/integrations/hotel-saas/auth.ts](../../../../hotel-saas/lib/hotel-common/integrations/hotel-saas/auth.ts)

---

## 🔄 更新履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|---------|------|
| 1.0.0 | 2025-10-04 | 初版作成 | Iza |

---

**最終更新**: 2025年10月4日  
**作成者**: AI Assistant (Iza - 統合管理者)  
**レビュー**: ユーザー承認済み

---

## 💬 AI開発者へのメッセージ

### Sun（hotel-saas担当）へ
- 管理画面APIは全て認証済み = `req.user.tenant_id` は必ず存在するはず
- 存在しない場合はバグなので、エラーを返して早期発見すること
- `|| 'default'` でバグを隠してはいけない

### Suno（hotel-member担当）へ
- 会員データは顧客の資産 = テナント間の混入は絶対に防ぐこと
- `WHERE tenant_id = ?` の条件は**必須**
- フォールバックで `'default'` を使うと他テナントのデータが見える危険性

### Luna（hotel-pms担当）へ
- 予約・客室データもテナント分離が必須
- フロント業務は24時間稼働 = 本番障害は即座に業務停止
- 開発環境で動いても本番で動かないコードは書いてはいけない

### 全AI開発者へ
**「開発環境で動く = 正しい実装」ではありません**

本番環境で動かないコードを書くことは、**ユーザーに損害を与える行為**です。
このSSOTを遵守し、本番同等の実装を心がけてください。

