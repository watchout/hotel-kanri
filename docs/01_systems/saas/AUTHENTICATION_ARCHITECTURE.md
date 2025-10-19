# 🔒 Hotel-SaaS 認証アーキテクチャ仕様書

> ⚠️ **重要な変更通知** ⚠️
> 
> **変更日**: 2025年10月1日  
> **変更内容**: JWT認証からセッション認証への移行決定  
> **旧方針**: 「絶対変更禁止」を撤回

---

## 🔄 **新しい認証仕様**

**統一認証仕様書を参照してください**:
👉 `/docs/AUTHENTICATION_MASTER_SPECIFICATION.md`

## 📚 **歴史的記録（参考用）**

<details>
<summary>🔍 旧方針の詳細（廃止済み - クリックで展開）</summary>

### **旧方針: Composable-Based Design（useApiClient）**（廃止済み）

```typescript
// ❌ 廃止された実装パターン
export default defineEventHandler(async (event) => {
  const { apiClient } = useApiClient();

  // JWTトークンは自動付与される
  const result = await apiClient('/api/v1/admin/orders', {
    method: 'GET',
    params: getQuery(event)
  });

  return result;
});
```

### **旧禁止事項**（撤回済み）

1. **ミドルウェア方式の復活禁止**（撤回済み）
   - `server/middleware/` での認証処理
   - 複雑な認証ロジック

2. **直接Prisma接続禁止**（撤回済み）
   - hotel-saas内でのデータベース直接アクセス
   - 独自認証システムの作成

3. **認証方式の変更提案禁止**（撤回済み）
   - 「もっと良い方法がある」等の提案
   - パフォーマンス理由での変更

</details>

### **旧必須実装パターン**（廃止済み）

#### **1. フロントエンド認証**（廃止済み）
```typescript
// ❌ 廃止: composables/useJwtAuth.ts を使用
const { signIn, signOut, token, user } = useJwtAuth();
```

#### **2. サーバーサイドAPI**（廃止済み）
```typescript
// ❌ 廃止: composables/useApiClient.ts を使用
const { apiClient } = useApiClient();
const result = await apiClient('/api/endpoint');
```

### **3. 管理画面でのAPI呼び出し**
```typescript
// ❌ 間違った方法（認証ヘッダーなし）
const response = await $fetch('/api/v1/admin/orders');

// ✅ 正しい方法（認証ヘッダー自動付与 + エラーハンドリング）
const { authenticatedFetch } = useApiClient();
try {
  const response = await authenticatedFetch('/api/v1/admin/orders');
  // 成功時の処理
} catch (error: any) {
  // エラー時はログアウトせず、適切なメッセージを表示
  if (error?.statusCode === 401) {
    console.warn('🔐 認証エラーが発生しました。');
  } else {
    console.warn('⚠️ データの取得に失敗しました。');
  }
}
```

### **4. 認証フロー**
1. フロントエンド → `useJwtAuth.signIn()` → JWTトークン取得・保存
2. API呼び出し → `useApiClient()` → 自動トークン付与 → hotel-common接続
3. ログアウト → `useJwtAuth.signOut()` → トークン削除

## 🎊 **メリット（変更理由なし）**

- ✅ **シンプル**: 複雑なミドルウェアなし
- ✅ **高速**: 不要な処理なし
- ✅ **保守性**: 問題箇所の特定が容易
- ✅ **実証済み**: パフォーマンス向上確認済み

## 📋 **今後のAPI開発ルール**

1. **必ずこの方式を使用**
2. **他の方式の提案禁止**
3. **変更理由の検討禁止**
4. **この文書を参照して実装**

---

**作成日**: 2025年1月26日
**最終更新**: 2025年1月26日
**変更履歴**:
- 2025年1月26日: 自動ログアウト機能を削除、エラーハンドリングをコンポーネント側に移行
- ルートガードによるセッション検証を追加
