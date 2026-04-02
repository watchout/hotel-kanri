# SSOT: テストデータベース操作ポリシー

**ドキュメントID**: `SSOT_TEST_DATABASE_POLICY`  
**バージョン**: `v1.0.0`  
**最終更新**: 2025-10-22  
**ステータス**: 🟢 承認済み  
**関連SSOT**: 
- `SSOT_SAAS_ADMIN_AUTHENTICATION.md`
- `SSOT_TEST_DEBUG_INFRASTRUCTURE.md`

---

## 📋 目次

1. [概要](#概要)
2. [背景：なぜこのポリシーが必要か](#背景なぜこのポリシーが必要か)
3. [基本方針](#基本方針)
4. [許可される操作](#許可される操作)
5. [禁止される操作](#禁止される操作)
6. [テスト実装ガイドライン](#テスト実装ガイドライン)
7. [違反時の対応](#違反時の対応)

---

## 概要

hotel-kanriプロジェクトでは、**本番データベースの保護**を最優先とし、以下の原則を厳守します：

```
✅ テストからのDB参照（READ）は許可
❌ テストからのDB変更（CREATE/UPDATE/DELETE）は禁止
```

### 重要性レベル

| 項目 | レベル |
|------|--------|
| **セキュリティ** | 🔴 **CRITICAL** |
| **データ整合性** | 🔴 **CRITICAL** |
| **運用安定性** | 🔴 **CRITICAL** |

---

## 背景：なぜこのポリシーが必要か

### 🚨 発生したインシデント（2025-10-22）

**事象**：
- テストコード（`permission.service.test.ts`）が本番DBに接続
- `staff_tenant_memberships`テーブルのデータを`deleteMany`で削除
- `owner@test.omotenasuai.com`を含む全スタッフのテナント紐付けが消失
- ログイン不可能になる重大障害が発生

**根本原因**：
1. テスト用DBと本番DBの分離がない
2. テストコードがDB変更操作（DELETE）を実行
3. WHERE句が不十分で全データ削除のリスク

**影響範囲**：
- 🔴 全スタッフのログイン不可
- 🔴 テナント紐付けデータの消失
- 🟡 手動復旧が必要（30分の作業時間）

### 教訓

```
「テスト用DBを作成すると混乱する」という懸念は正しかった。
しかし、本番DBへの書き込みは更に危険だった。

解決策：本番DBへの参照のみ許可、変更は一切禁止。
```

---

## 基本方針

### 原則1: READ ONLY

```typescript
// ✅ 許可：データの読み取り
const users = await prisma.staff.findMany();
const count = await prisma.role.count();

// ❌ 禁止：データの変更
await prisma.staff.create({ data: {...} });      // 禁止
await prisma.role.update({ where: {...} });      // 禁止
await prisma.staffTenantMembership.deleteMany(); // 禁止
```

### 原則2: 既存データの活用

テストは**SSOTで定義された既存アカウント**を使用します。

**参照**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md`

| アカウント | 用途 |
|-----------|------|
| `admin@omotenasuai.com` | 管理者権限テスト |
| `owner@test.omotenasuai.com` | オーナー権限テスト |
| `staff@test.omotenasuai.com` | スタッフ権限テスト |

### 原則3: テストデータの永続化禁止

テストで一時的に作成したデータは、テスト終了後に削除する必要があります。

```typescript
// ❌ 禁止パターン：テスト終了後もDBに残る
afterAll(async () => {
  await prisma.$disconnect(); // データが残る
});

// ⚠️ 例外：READ ONLYなのでクリーンアップ不要
// テストはデータを読むだけなので、afterAllは接続切断のみでOK
```

---

## 許可される操作

### ✅ Prisma READ操作

```typescript
// 1. findMany - 複数レコード取得
const roles = await prisma.role.findMany({
  where: { tenantId: 'test-tenant-001' }
});

// 2. findUnique - 単一レコード取得
const user = await prisma.staff.findUnique({
  where: { email: 'admin@omotenasuai.com' }
});

// 3. findFirst - 最初の1件取得
const tenant = await prisma.tenant.findFirst({
  where: { name: { contains: 'テスト' } }
});

// 4. count - 件数カウント
const roleCount = await prisma.role.count({
  where: { tenantId: 'test-tenant-001' }
});

// 5. aggregate - 集計
const stats = await prisma.role.aggregate({
  _count: { id: true },
  _max: { sortOrder: true }
});
```

### ✅ API経由の操作（hotel-commonのAPI）

```typescript
// APIテストは問題なし（hotel-commonが責任を持つ）
const response = await request(API_BASE_URL)
  .get('/api/v1/admin/roles')
  .set('Cookie', testSessionCookie)
  .query({ tenantId: 'test-tenant-001' });

expect(response.status).toBe(200);
```

**理由**: APIは適切な認証・認可・バリデーションを実装しているため、安全。

---

## 禁止される操作

### ❌ Prisma WRITE操作

```typescript
// 1. create - レコード作成
await prisma.staff.create({ 
  data: { email: 'test@example.com' } 
}); // ❌ 禁止

// 2. createMany - 複数レコード作成
await prisma.role.createMany({ 
  data: [...] 
}); // ❌ 禁止

// 3. update - レコード更新
await prisma.role.update({ 
  where: { id: 'xxx' }, 
  data: { name: '更新' } 
}); // ❌ 禁止

// 4. updateMany - 複数レコード更新
await prisma.role.updateMany({ 
  data: { isActive: false } 
}); // ❌ 禁止

// 5. delete - レコード削除
await prisma.staff.delete({ 
  where: { id: 'xxx' } 
}); // ❌ 禁止

// 6. deleteMany - 複数レコード削除
await prisma.staffTenantMembership.deleteMany({ 
  where: { tenantId: 'test-tenant-001' } 
}); // ❌ 禁止

// 7. upsert - 作成または更新
await prisma.role.upsert({ 
  where: { id: 'xxx' }, 
  create: {...}, 
  update: {...} 
}); // ❌ 禁止
```

### ❌ 直接SQL実行

```typescript
// 直接SQL実行は絶対禁止
await prisma.$executeRaw`DELETE FROM staff_tenant_memberships`; // ❌ 禁止
await prisma.$queryRaw`UPDATE roles SET name = 'xxx'`;         // ❌ 禁止
```

### ❌ トランザクション内でのWRITE操作

```typescript
// トランザクション内でもWRITE操作は禁止
await prisma.$transaction(async (tx) => {
  await tx.role.create({ data: {...} }); // ❌ 禁止
  await tx.staff.update({ where: {...} }); // ❌ 禁止
});
```

---

## テスト実装ガイドライン

### 1. 単体テスト（Unit Test）

**目的**: ビジネスロジックの検証

```typescript
// ✅ 推奨：モックを使用
jest.mock('../prisma');
const mockPrisma = {
  role: {
    findMany: jest.fn().mockResolvedValue([...])
  }
};

// ✅ 許可：READ操作のみ
const roles = await prisma.role.findMany({ where: { tenantId: 'test-tenant-001' } });
expect(roles.length).toBeGreaterThan(0);
```

### 2. APIテスト（Integration Test）

**目的**: API動作の検証

```typescript
describe('役職API統合テスト', () => {
  let testSessionCookie: string;

  beforeAll(async () => {
    // 実認証（SSOT準拠）
    const loginResponse = await request(API_BASE_URL)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@omotenasuai.com',
        password: 'admin123',
        tenantId: 'test-tenant-001',
      });
    
    testSessionCookie = `hotel-session-id=${loginResponse.body.data.sessionId}`;
  });

  it('役職一覧取得', async () => {
    const response = await request(API_BASE_URL)
      .get('/api/v1/admin/roles')
      .set('Cookie', testSessionCookie)
      .query({ tenantId: 'test-tenant-001' });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  afterAll(async () => {
    // ✅ 接続切断のみ（データは残る）
    await prisma.$disconnect();
  });
});
```

### 3. E2Eテスト（End-to-End Test）

**目的**: ユーザーフローの検証

```typescript
// Playwright使用
test('役職管理画面で役職一覧が表示される', async ({ page }) => {
  // 1. ログイン
  await page.goto('http://localhost:3100/admin/login');
  await page.fill('input[type="email"]', 'owner@test.omotenasuai.com');
  await page.fill('input[type="password"]', 'owner123');
  await page.click('button[type="submit"]');

  // 2. 役職管理画面へ遷移
  await page.goto('http://localhost:3100/admin/settings/roles');

  // 3. 役職が表示されることを確認
  const roleList = await page.locator('[data-testid="role-list"]');
  await expect(roleList).toBeVisible();
});
```

**重要**: E2Eテストは画面操作のみで、DBには一切触れません。

---

## 違反時の対応

### 検出方法

#### 1. コードレビュー

全てのPRで以下をチェック：

```bash
# テストファイルでのWRITE操作を検出
grep -r "\.create\|\.update\|\.delete\|\.createMany\|\.updateMany\|\.deleteMany\|\.upsert" \
  src/**/__tests__/*.test.ts
```

#### 2. 自動チェック（ESLint）

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.property.name=/^(create|update|delete|createMany|updateMany|deleteMany|upsert)$/]',
        message: 'テストコード内でのDB変更操作は禁止です。READ操作のみ使用してください。'
      }
    ]
  }
};
```

#### 3. CI/CDでの検証

```yaml
# .github/workflows/ci.yml
- name: テストDB操作ポリシー検証
  run: |
    if grep -r "\.create\|\.update\|\.delete" src/**/__tests__/*.test.ts; then
      echo "❌ テストコードでDB変更操作が検出されました"
      exit 1
    fi
```

### 違反発覚時の対応フロー

```
Step 1: PRをブロック
  ↓
Step 2: 違反箇所の修正を依頼
  - WRITE操作を削除
  - READ操作またはモックに置き換え
  ↓
Step 3: 再レビュー
  ↓
Step 4: 承認・マージ
```

---

## よくある質問（FAQ）

### Q1: テストデータが必要な場合はどうする？

**A**: SSOTで定義された既存アカウント・テナントを使用してください。

```typescript
// ❌ 新規データ作成
await prisma.tenant.create({ data: { name: 'テスト用' } });

// ✅ 既存データ使用
const tenant = await prisma.tenant.findUnique({
  where: { id: 'test-tenant-001' }
});
```

### Q2: APIテストで新規データが必要な場合は？

**A**: APIを叩いて作成し、テスト終了後にAPIで削除してください。

```typescript
// ✅ API経由での作成・削除
let createdRoleId: string;

it('役職作成APIテスト', async () => {
  const response = await request(API_BASE_URL)
    .post('/api/v1/admin/roles')
    .set('Cookie', testSessionCookie)
    .send({ name: 'テスト役職', tenantId: 'test-tenant-001' });
  
  createdRoleId = response.body.data.id;
  expect(response.status).toBe(201);
});

afterAll(async () => {
  // API経由で削除
  if (createdRoleId) {
    await request(API_BASE_URL)
      .delete(`/api/v1/admin/roles/${createdRoleId}`)
      .set('Cookie', testSessionCookie)
      .query({ tenantId: 'test-tenant-001' });
  }
});
```

### Q3: パフォーマンステストでDB変更が必要な場合は？

**A**: パフォーマンステストは専用環境で実施してください。本番DBは使用禁止です。

---

## 関連ドキュメント

- **SSOT_SAAS_ADMIN_AUTHENTICATION.md**: テストアカウント定義
- **SSOT_TEST_DEBUG_INFRASTRUCTURE.md**: テスト環境全体設計
- **DATABASE_NAMING_STANDARD.md**: データベース命名規則
- **API_ROUTING_GUIDELINES.md**: API設計ガイドライン

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 担当 |
|-----------|------|----------|------|
| v1.0.0 | 2025-10-22 | 初版作成（インシデント対応） | Luna |

---

## 承認

| 役割 | 承認者 | 承認日 |
|------|--------|--------|
| プロジェクトオーナー | User | 2025-10-22 |
| アーキテクト | Luna | 2025-10-22 |

---

**このポリシーは全開発者・全AIに適用されます。違反は重大なセキュリティインシデントとして扱われます。**

