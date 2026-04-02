# JWTトークン仕様書 (JWT Token Specification)

**作成日**: 2024年12月28日  
**バージョン**: 1.0.0  
**対象**: hotel-common統一認証基盤

## 1. JWT設定仕様

### 1.1 基本設定
- **Algorithm**: HS256 (将来RS256対応予定)
- **Access Token TTL**: 8時間
- **Refresh Token TTL**: 30日
- **Secret管理**: 環境変数 (`JWT_SECRET`, `JWT_REFRESH_SECRET`)

### 1.2 統一JWTクレーム構造

```typescript
interface HotelJWTPayload {
  // RFC 7519 標準クレーム
  iss: "hotel-common-auth"           // 発行者
  sub: string                        // ユーザーID (UUID)
  aud: ["hotel-member", "hotel-pms", "hotel-saas"] // 対象システム
  exp: number                        // 有効期限 (Unix timestamp)
  iat: number                        // 発行時刻
  jti: string                        // JWT ID (Redis管理用)

  // Hotel System専用クレーム
  tenant_id: string                  // テナントUUID
  email: string                      // ユーザーメールアドレス
  role: "STAFF"|"MANAGER"|"ADMIN"|"OWNER"|"SYSTEM"
  level: 1|2|3|4|5                  // 権限レベル
  permissions: string[]              // 詳細権限配列

  // システム間連携クレーム
  origin_system: "hotel-common"|"hotel-member"|"hotel-pms"|"hotel-saas"
  source_systems: string[]          // アクセス可能システム

  // セッション管理クレーム
  session_id: string                 // Redisセッション識別子
  device_id?: string                 // デバイス識別子
  ip_address?: string                // 発行時IPアドレス
}
```

## 2. システム間通信JWT

```typescript
interface SystemJWTPayload {
  iss: "hotel-common-system"
  sub: string                        // システムID
  aud: string[]                      // 対象システム
  exp: number                        // 15分後 (短期間)
  iat: number
  jti: string

  system_id: "hotel-member"|"hotel-pms"|"hotel-saas"|"hotel-common"
  tenant_id: string                  // 対象テナント
  permissions: string[]              // システム権限
  api_version: "v2"
}
```

## 3. トークン失効・更新戦略

### 3.1 Redisブラックリスト管理
- **キーパターン**: `hotel:blacklist:{jti}`
- **TTL**: JWTの有効期限まで
- **用途**: ログアウト時、強制無効化時

### 3.2 リフレッシュトークン戦略
- **Rotation**: リフレッシュ時に新しいリフレッシュトークンを発行
- **家族検知**: 不正使用検知時は全トークン無効化
- **Redis保存**: `hotel:refresh:{user_id}:{jti}`

## 4. 実装例

### 4.1 アクセストークン生成
```typescript
const payload: HotelJWTPayload = {
  iss: "hotel-common-auth",
  sub: "user-uuid-12345",
  aud: ["hotel-member", "hotel-pms", "hotel-saas"],
  exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60),
  iat: Math.floor(Date.now() / 1000),
  jti: crypto.randomUUID(),
  
  tenant_id: "tenant-uuid-abcde",
  email: "user@hotel.com",
  role: "STAFF",
  level: 3,
  permissions: ["reservation.read", "customer.read"],
  
  origin_system: "hotel-common",
  source_systems: ["hotel-member", "hotel-pms", "hotel-saas"],
  
  session_id: "session-uuid-fghij"
}
```

### 4.2 検証実装
```typescript
export function verifyJWT(token: string): HotelJWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as HotelJWTPayload
    
    // ブラックリスト確認
    const isBlacklisted = await redis.exists(`hotel:blacklist:${decoded.jti}`)
    if (isBlacklisted) return null
    
    return decoded
  } catch (error) {
    return null
  }
}
```

## 5. セキュリティ考慮事項

### 5.1 秘密鍵管理
- 定期ローテーション (年1回)
- 環境別秘密鍵
- 安全な保存（Vault等）

### 5.2 攻撃対策
- JWT Bombing: サイズ制限 (8KB)
- Replay Attack: jti + 時刻検証
- JWKS攻撃: none算法無効化

---

**実装チェックリスト**:
- [ ] JWT生成・検証関数実装
- [ ] Redis統合実装
- [ ] ブラックリスト機能実装
- [ ] セキュリティテスト実施 