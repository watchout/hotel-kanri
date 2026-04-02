# 認証API（ログイン）の問題

## 概要

hotel-common側の認証API（ログイン）が、仕様書に記載されていない追加フィールドを要求しています。

## 問題詳細

### 仕様書の記述

`docs/integration/AUTH_INTEGRATION_SPEC.md`および`docs/auth-integration-spec.md`では、ログインAPIのリクエスト形式は以下のように記述されています：

```
Client->>Server: POST /api/v1/auth/login {email, password}
```

また、実装例の`login`関数も以下のように記述されています：

```typescript
async login(email: string, password: string, deviceInfo?: DeviceInfo): Promise<AuthResult>
```

### 実際の動作

実際にhotel-common側のログインAPI（`POST /api/v1/auth/login`）を呼び出すと、以下のエラーが返されます：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "必須フィールドが不足しています"
  },
  "timestamp": "2025-08-25T06:33:07.345Z",
  "request_id": "req-1756103587345-udi31qnmai"
}
```

このエラーは、仕様書に記載されていない追加のフィールドが必要であることを示しています。

## 解決策の提案

1. hotel-common側の開発者に、ログインAPIが期待する正確なリクエスト形式を確認する
2. 仕様書を更新して、必要なすべてのフィールドを明記する
3. hotel-saas側のコードを更新して、必要なすべてのフィールドを含めるようにする

## 影響範囲

- hotel-saas側のログイン機能
- hotel-saas側の認証関連機能全般
- hotel-commonとの統合認証システム

## 優先度

**高**：認証は基本的な機能であり、これが正しく動作しないとシステム全体に影響します。
