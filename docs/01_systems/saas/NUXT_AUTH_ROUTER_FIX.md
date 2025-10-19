# Nuxt Auth Router エラー修正ガイド

## 問題の概要

Nuxt Authプラグイン（@sidebase/nuxt-auth）を使用している際に、以下のようなVue Routerの警告が大量に発生する問題が確認されました：

```
[Vue Router warn]: No match found for location with path "/api/auth/session"
```

この問題は、Nuxt Authプラグインが内部的に `/api/auth/session` エンドポイントにリクエストを送信しているにもかかわらず、そのルートがアプリケーションに存在しないために発生します。

## 原因

Nuxt Authプラグインは、Auth.js（旧NextAuth）をベースにしており、以下のエンドポイントを期待します：

1. `/api/auth/session` - セッション情報の取得
2. `/api/auth/csrf` - CSRFトークンの取得
3. `/api/auth/providers` - 認証プロバイダー一覧の取得

これらのエンドポイントが存在しない場合、Vue Routerは警告を出力します。

## 解決策

以下のダミーエンドポイントを作成することで問題を解決しました：

### 1. `/api/auth/session` エンドポイント

```typescript
// server/api/auth/session.get.ts
import { defineEventHandler } from 'h3';

export default defineEventHandler(async () => {
  // ダミーのセッションレスポンスを返す
  return {
    user: null,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
});
```

### 2. `/api/auth/csrf` エンドポイント

```typescript
// server/api/auth/csrf.get.ts
import { defineEventHandler } from 'h3';
import { randomBytes } from 'crypto';

export default defineEventHandler(async () => {
  // ランダムなCSRFトークンを生成
  const csrfToken = randomBytes(32).toString('hex');

  return {
    csrfToken
  };
});
```

### 3. `/api/auth/providers` エンドポイント

```typescript
// server/api/auth/providers.get.ts
import { defineEventHandler } from 'h3';

export default defineEventHandler(async () => {
  // ダミーの認証プロバイダー情報を返す
  return {
    credentials: {
      id: "credentials",
      name: "Credentials",
      type: "credentials",
      signinUrl: "/api/auth/signin/credentials",
      callbackUrl: "/api/auth/callback/credentials"
    }
  };
});
```

## 検証方法

以下のコマンドで各エンドポイントの動作を確認できます：

```bash
# セッション情報の取得
curl http://localhost:3100/api/auth/session

# CSRFトークンの取得
curl http://localhost:3100/api/auth/csrf

# プロバイダー一覧の取得
curl http://localhost:3100/api/auth/providers
```

## 注意点

- これらのエンドポイントは、実際の認証機能を提供するものではなく、Vue Routerの警告を抑制するためのダミーエンドポイントです。
- 実際の認証処理は、hotel-commonの統合認証システムを使用します。
- 将来的にNuxt Authの設定を変更する場合は、これらのエンドポイントも更新する必要があるかもしれません。

## 関連ファイル

- `server/api/auth/session.get.ts`
- `server/api/auth/csrf.get.ts`
- `server/api/auth/providers.get.ts`
- `nuxt.config.ts` (auth設定)

## 更新日

2025年8月21日
