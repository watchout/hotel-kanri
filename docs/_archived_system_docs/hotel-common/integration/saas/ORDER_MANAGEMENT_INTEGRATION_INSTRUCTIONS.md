# hotel-saas向け注文管理API統合指示書

**作成日**: 2025-09-30  
**対象システム**: hotel-saas  
**統合対象**: hotel-common注文管理API  
**実装完了日**: 2025-09-30  

## 概要

hotel-commonで注文管理APIの実装が完了しました。統一認証基盤に準拠した本格的なAPI実装となっており、hotel-saasからの統合が可能です。

## 参照すべきドキュメント（絶対パス）

### 1. 基本設計・仕様書
```
/Users/kaneko/hotel-kanri/docs/01_systems/common/CORRECTED_ORDER_IMPLEMENTATION_INSTRUCTIONS.md
/Users/kaneko/hotel-kanri/docs/01_systems/common/TECHNICAL_SPECIFICATIONS.md
/Users/kaneko/hotel-kanri/docs/01_systems/saas/ORDER_MANAGEMENT_COMMON_IMPLEMENTATION_GUIDE.md
```

### 2. 認証関連ドキュメント
```
/Users/kaneko/hotel-kanri/docs/01_systems/common/authentication/unified-authentication-infrastructure-design.md
/Users/kaneko/hotel-kanri/docs/01_systems/common/CODING_STANDARDS.md
```

### 3. プロジェクト全体ドキュメント
```
/Users/kaneko/hotel-kanri/docs/README.md
```

## 実装済みAPI一覧

### 認証API
- **POST** `/api/v1/auth/login` - ログイン・JWTトークン取得

### 注文管理API（全てJWT認証必須）
- **POST** `/api/v1/orders` - 注文作成
- **GET** `/api/v1/orders` - 注文一覧取得（ページネーション対応）
- **GET** `/api/v1/orders/:id` - 注文詳細取得
- **PUT** `/api/v1/orders/:id` - 注文更新
- **DELETE** `/api/v1/orders/:id` - 注文削除（論理削除）
- **GET** `/api/v1/orders/active-session/:roomId` - アクティブセッション注文取得
- **POST** `/api/v1/orders/session-summary` - セッション注文サマリー

## 実装ファイル（絶対パス）

### 1. 認証関連
```
/Users/kaneko/hotel-common/src/auth/middleware.ts
/Users/kaneko/hotel-common/src/routes/systems/common/auth.routes.ts
/Users/kaneko/hotel-common/src/utils/dev-token-generator.ts
```

### 2. 注文管理API
```
/Users/kaneko/hotel-common/src/routes/api/v1/orders/index.ts
/Users/kaneko/hotel-common/src/routes/api/v1/sessions/index.ts
```

### 3. 共通ユーティリティ
```
/Users/kaneko/hotel-common/src/database/prisma.ts
/Users/kaneko/hotel-common/src/utils/response-builder.ts
/Users/kaneko/hotel-common/src/utils/logger.ts
```

## 統合手順

### Step 1: 認証フローの実装

1. **ログインAPI呼び出し**
```bash
curl -X POST "http://localhost:3400/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@omotenasuai.com", "password": "admin123"}'
```

2. **レスポンス例**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 28800,
    "user": {
      "user_id": "00b6152e-d2b1-4783-a0d3-e09d06433778",
      "tenant_id": "default",
      "email": "admin@omotenasuai.com",
      "role": "admin"
    }
  }
}
```

### Step 2: 注文作成API呼び出し

```bash
curl -X POST "http://localhost:3400/api/v1/orders" \
  -H "Authorization: Bearer [ACCESS_TOKEN]" \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  -d '{
    "roomId": "101",
    "items": [
      {
        "menuItemId": 1,
        "name": "ハンバーガーセット",
        "price": 1200,
        "quantity": 2,
        "notes": "ポテト多め"
      }
    ]
  }'
```

### Step 3: 注文一覧取得

```bash
curl -X GET "http://localhost:3400/api/v1/orders?page=1&limit=20" \
  -H "Authorization: Bearer [ACCESS_TOKEN]" \
  -H "X-Tenant-ID: default"
```

## 重要な実装ポイント

### 1. 認証ヘッダー
- `Authorization: Bearer [JWT_TOKEN]` - 必須
- `X-Tenant-ID: [TENANT_ID]` - 必須（JWTのtenant_idと一致必要）

### 2. レスポンス形式
全てのAPIは`StandardResponseBuilder`による統一形式：
```json
{
  "success": true/false,
  "data": {...},
  "meta": {...},
  "timestamp": "2025-09-30T01:33:27.750Z",
  "request_id": "req-1759196007750-wmygia4y4v"
}
```

### 3. エラーハンドリング
```json
{
  "success": false,
  "error": {
    "code": "ORDER_CREATE_FAILED",
    "message": "注文作成に失敗しました",
    "details": "..."
  },
  "timestamp": "2025-09-30T01:33:27.750Z",
  "request_id": "req-1759196007750-wmygia4y4v"
}
```

## テスト用アカウント

```
Email: admin@omotenasuai.com
Password: admin123
Tenant ID: default
User ID: 00b6152e-d2b1-4783-a0d3-e09d06433778
```

## 動作確認済み機能

✅ **認証フロー**
- JWTトークン取得・検証
- テナント情報の正確な取得

✅ **注文管理CRUD**
- 注文作成（OrderItem自動作成含む）
- 注文一覧取得（ページネーション付き）
- 注文詳細取得（関連データ含む）
- 注文更新（ステータス変更等）

✅ **技術実装**
- `hotelDb`クライアントによるデータベース操作
- トランザクション処理
- 統一レスポンス形式
- エラーハンドリング・ログ出力

## 注意事項

1. **直接DB操作禁止**
   - 必ずhotel-commonのAPIを経由してデータ操作を行う
   - 直接PrismaクライアントやSQL操作は禁止

2. **認証の必須性**
   - 全ての注文管理APIは認証必須
   - 統一認証基盤に準拠したJWTトークンを使用

3. **テナント分離**
   - 必ず`X-Tenant-ID`ヘッダーを送信
   - JWTトークンの`tenant_id`と一致必要

4. **エラーハンドリング**
   - APIレスポンスの`success`フィールドを必ず確認
   - エラー時は`error.code`と`error.message`を参照

## 開発環境情報

- **hotel-common URL**: `http://localhost:3400`
- **データベース**: PostgreSQL (hotel_unified_db)
- **認証方式**: JWT (HS256)
- **レスポンス形式**: JSON (統一形式)

## 次のステップ

1. hotel-saasでの認証フロー実装
2. 注文管理画面からのAPI呼び出し実装
3. エラーハンドリングの実装
4. 統合テストの実施

---

**重要**: この実装は統一認証基盤とコーディング標準に完全準拠しています。hotel-saasでの実装時も同様の標準に従ってください。
