# マルチテナントルール

**常時適用**: テナント分離は最優先のセキュリティ要件です。

## 絶対ルール

### 1. 全クエリにtenant_idフィルタ必須

```typescript
// ✅ 正しい
const items = await prisma.item.findMany({
  where: { tenantId: authUser.tenantId }
});

// ❌ 禁止
const items = await prisma.item.findMany();
```

### 2. フォールバック値禁止

```typescript
// ❌ 禁止
const tenantId = session.tenantId || 'default';
const tenantId = session.tenantId ?? 'default';

// ✅ 正しい
if (!session.tenantId) {
  throw new Error('テナントIDが必要です');
}
```

### 3. 環境分岐禁止

```typescript
// ❌ 禁止
if (process.env.NODE_ENV === 'development') {
  tenantId = 'default';
}

// ✅ 開発・本番で同じロジック
```

### 4. 404ポリシー（列挙耐性）

```typescript
// 他テナントのリソース → 404（403ではない）
if (!resource || resource.tenantId !== authUser.tenantId) {
  return res.status(404).json({ error: 'Not found' });
}
```

## 違反検出コマンド

```bash
# フォールバック値
grep -rn "|| 'default'" --include="*.ts"
grep -rn "?? 'default'" --include="*.ts"

# 環境分岐
grep -rn "NODE_ENV" --include="*.ts"

# tenant_idなしクエリ
grep -rn "findMany()" --include="*.ts"
```

## 違反時の対応

1. 実装を即座に停止
2. SSOT_SAAS_MULTITENANT.md を再確認
3. 正しいパターンで再実装
