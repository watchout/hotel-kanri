---
name: tdd
description: テスト駆動開発を開始します
---

# /tdd コマンド

テスト駆動開発（TDD）ワークフローを開始します。

## 使い方

```
/tdd [機能名 or SSOT名]
```

例:
```
/tdd 注文作成API
/tdd SSOT_GUEST_AI_HANDOFF
```

## TDDサイクル

### 1. RED（テスト作成）

```typescript
describe('POST /api/v1/admin/orders', () => {
  it('should return 401 without session', async () => {
    const res = await request(app).post('/api/v1/admin/orders');
    expect(res.status).toBe(401);
  });

  it('should return 404 for other tenant', async () => {
    // ...
  });

  it('should create order with valid input', async () => {
    // ...
  });
});
```

### 2. GREEN（最小実装）

テストを通すための最小限のコードを書く。

### 3. REFACTOR（改善）

コードを整理し、テストが引き続き通ることを確認。

## hotel-kanri用テストパターン

### API単体テスト
```bash
cd /Users/kaneko/hotel-common-rebuild
npm run test:unit
```

### 統合テスト
```bash
cd /Users/kaneko/hotel-kanri/scripts
./test-standard-admin.sh  # 管理画面
./test-standard-guest.sh  # ゲスト画面
```

## テストケース設計

| カテゴリ | テスト内容 | 優先度 |
|:--------|:----------|:-------|
| 認証 | 未認証で401 | High |
| 権限 | 他テナントで404 | High |
| 正常系 | 作成/更新/削除成功 | Medium |
| 境界値 | 空文字/上限値 | Low |

## 参照ドキュメント

- agents/tdd-guide.md
