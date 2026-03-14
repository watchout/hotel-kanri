# バグ知識ベース

過去に遭遇したバグと解決策を記録します。

---

## BUG-001: Cookie転送されない問題

**発生日**: 2024-11
**システム**: hotel-saas → hotel-common

### 症状
- hotel-saasからhotel-commonへのAPI呼び出しで401エラー
- ブラウザでは動くがサーバー間通信で失敗

### 原因
`$fetch`直接使用ではサーバー間でCookieが転送されない。

### 解決策
`callHotelCommonAPI`を使用する。
```typescript
// ❌ 禁止
const data = await $fetch('http://localhost:3401/api/v1/xxx');

// ✅ 正しい
const data = await callHotelCommonAPI(event, '/api/v1/xxx', { method: 'GET' });
```

---

## BUG-002: 二重パス付与

**発生日**: 2024-11
**システム**: hotel-common

### 症状
- `/api/api/v1/admin/xxx` というパスになる
- 404エラー

### 原因
A方式とB方式の混在。

### 解決策
B方式に統一。
```typescript
// router側: 相対パス
router.get('/', handler);

// app側: 絶対パス
app.use('/api/v1/admin/xxx', router);
```

---

## BUG-003: 他テナントデータ漏洩

**発生日**: 2024-10
**システム**: hotel-common

### 症状
- 異なるテナントのデータが取得できてしまう

### 原因
`tenant_id`フィルタの欠落。

### 解決策
全クエリに`tenantId: authUser.tenantId`を追加。

---

## テンプレート

```markdown
## BUG-XXX: [タイトル]

**発生日**: YYYY-MM
**システム**: [hotel-saas / hotel-common / etc]

### 症状
[何が起きたか]

### 原因
[なぜ起きたか]

### 解決策
[どう直したか]
```
