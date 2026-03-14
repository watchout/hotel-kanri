# セキュリティルール

**常時適用**: これらのルールは全てのコード変更に適用されます。

## 絶対禁止

### 1. ハードコードされた秘密情報
```typescript
// ❌ 禁止
const apiKey = 'sk-xxx123';
const password = 'secret';

// ✅ 環境変数を使用
const apiKey = process.env.API_KEY;
```

### 2. console.log での機密情報出力
```typescript
// ❌ 禁止
console.log('User password:', user.password);
console.log('Session:', session);

// ✅ 必要最小限のログ
console.log('[API] Request received:', { userId: user.id });
```

### 3. SQLインジェクション脆弱性
```typescript
// ❌ 禁止（Prisma以外でのクエリ構築）
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ Prismaを使用（パラメータ化されたクエリ）
const user = await prisma.user.findUnique({ where: { id: userId } });
```

### 4. 未検証の入力
```typescript
// ❌ 禁止
const { id } = req.params;
await prisma.item.delete({ where: { id } });

// ✅ 入力検証
const { id } = req.params;
if (!id || typeof id !== 'string') {
  return res.status(400).json({ error: 'Invalid ID' });
}
```

## 必須事項

### 1. 認証チェック
全ての保護されたAPIに認証チェックを実装

### 2. テナント分離
全クエリにtenant_idフィルタを適用

### 3. 404ポリシー
他テナントのリソースアクセスは404を返す（403ではない）

### 4. HttpOnly Cookie
セッションCookieはHttpOnlyを設定

## 自動検出コマンド

```bash
# 秘密情報のハードコード
grep -rn "password\s*=\s*['\"]" --include="*.ts"
grep -rn "apiKey\s*=\s*['\"]" --include="*.ts"

# console.log
grep -rn "console.log" --include="*.ts"
```
