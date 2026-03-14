# マルチテナント必須ルール

hotel-kanriはマルチテナントSaaSです。テナント分離は**最優先のセキュリティ要件**です。

## 絶対ルール

### 1. 全クエリにtenant_idフィルタ必須

```typescript
// ✅ 正しい
const items = await prisma.item.findMany({
  where: { tenantId: authUser.tenantId }
});

// ❌ 禁止（全テナントのデータが取得される）
const items = await prisma.item.findMany();
```

### 2. フォールバック値禁止

```typescript
// ❌ 禁止パターン
const tenantId = session.tenantId || 'default';
const tenantId = session.tenantId ?? 'default';

// ✅ 正しい
const tenantId = session.tenantId;
if (!tenantId) {
  throw new Error('テナントIDが取得できません');
}
```

### 3. 環境分岐禁止

```typescript
// ❌ 禁止パターン
if (process.env.NODE_ENV === 'development') {
  tenantId = 'default';
}

// ✅ 正しい（開発・本番で同じロジック）
const tenantId = session.tenantId;
```

### 4. 404ポリシー（列挙耐性）

```typescript
// 他テナントのリソースにアクセスした場合
// ❌ 禁止: 403 Forbidden（存在がバレる）
// ✅ 正しい: 404 Not Found（存在を隠す）

if (!resource || resource.tenantId !== authUser.tenantId) {
  return res.status(404).json(createErrorResponse('NOT_FOUND', 'リソースが見つかりません'));
}
```

## チェックリスト

### 新規API実装時
- [ ] findMany/findFirst に tenant_id フィルタがあるか
- [ ] create に tenant_id を付与しているか
- [ ] update/delete で tenant_id チェックをしているか
- [ ] 他テナントアクセス時に 404 を返しているか

### コードレビュー時
- [ ] フォールバック値（'default' 等）がないか
- [ ] 環境分岐（NODE_ENV）がないか
- [ ] tenant_id なしクエリがないか

## 自動検出コマンド

```bash
# フォールバック値の検出
grep -rn "|| 'default'" --include="*.ts"
grep -rn "?? 'default'" --include="*.ts"

# 環境分岐の検出
grep -rn "NODE_ENV" --include="*.ts"

# tenant_idなしクエリの検出（要目視確認）
grep -rn "findMany()" --include="*.ts"
grep -rn "findFirst()" --include="*.ts"
```

## 違反時の対応

1. **即座に実装を停止**
2. **SSOTを再確認**
   - `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md`
3. **正しいパターンで再実装**
4. **テストで検証**
