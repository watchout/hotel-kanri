# 統一認証基盤仕様書

**Doc-ID**: SPEC-2025-01-03-002  
**Version**: v1.0  
**Status**: Approved  
**Owner**: 金子裕司  
**Linked-Docs**: ADR-2025-01-03-001  

---

## 概要
hotel-common, hotel-member, hotel-pms, hotel-saasの4システム間でSSO（Single Sign-On）を実現する統一認証基盤の仕様書。JWT + Redis による高性能・拡張性を確保し、段階的移行により既存システムへの影響を最小化。

## 背景・目的
- 3つのホテル管理システムの認証基盤統一
- SSO による利便性向上とセキュリティ強化
- JWT + Redis による高性能・拡張性の確保
- 段階的移行による既存システムへの影響最小化

## 要件

### 機能要件
- JWT ベースの認証システム
- Redis セッション管理
- マルチテナント対応
- 相互TLS認証（システム間通信）
- レート制限・異常検知
- 包括的監査ログ

### 非機能要件
- 認証成功率: 99.99%以上
- API応答時間: 平均200ms以下
- 可用性: 99.9%以上
- セキュリティ: 最新標準準拠

## 仕様詳細

### アーキテクチャ設計

#### システム構成
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  hotel-member   │    │   hotel-pms     │    │   hotel-saas    │
│    (Port:3200)  │    │   (Port:3300)   │    │   (Port:3100)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │         JWT Token Validation                │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                  ┌──────────────▼──────────────┐
                  │      hotel-common           │
                  │    (Port:3400)              │
                  │                             │
                  │  ┌─────────────────────────┐│
                  │  │   JWT Auth Service      ││
                  │  │  - Token Generation     ││
                  │  │  - Token Validation     ││
                  │  │  - User Management      ││
                  │  │  - Permission Control   ││
                  │  └─────────────────────────┘│
                  │                             │
                  │  ┌─────────────────────────┐│
                  │  │   Redis Session Store   ││
                  │  │  - Session Management   ││
                  │  │  - Token Blacklist      ││
                  │  │  - Rate Limiting        ││
                  │  │  - Cache Layer          ││
                  │  └─────────────────────────┘│
                  └─────────────────────────────┘
```

### JWT トークン設計

#### アクセストークン構造
```json
{
  "user_id": "uuid-v4",
  "tenant_id": "uuid-v4", 
  "email": "user@hotel.com",
  "role": "admin|manager|staff|readonly",
  "level": 1-5,
  "permissions": ["reservation.read", "customer.write"],
  "iat": 1703750400,
  "exp": 1703779200,
  "jti": "token-uuid"
}
```

#### リフレッシュトークン構造
```json
{
  "user_id": "uuid-v4",
  "tenant_id": "uuid-v4",
  "type": "refresh", 
  "jti": "refresh-uuid",
  "iat": 1703750400,
  "exp": 1706342400
}
```

### 技術仕様

#### JWT設定
- **Access Token 有効期限**: 8時間
- **Refresh Token 有効期限**: 30日  
- **Algorithm**: HS256 (将来的にRS256対応検討)
- **Secret Key**: 環境変数 `JWT_SECRET`, `JWT_REFRESH_SECRET`

#### Redis設定
- **Session TTL**: Access Token と同期 (8時間)
- **Key Pattern**: `hotel:session:{tenant_id}:{user_id}`
- **Blacklist Pattern**: `hotel:blacklist:{jti}`
- **Rate Limit Pattern**: `hotel:ratelimit:{tenant_id}:{user_id}`

#### セキュリティ仕様
- **パスワードハッシュ化**: PBKDF2 (10,000 iterations, SHA-512)
- **レート制限**: ログイン試行 5回/15分（IP単位）
- **セッション管理**: 異常検知・強制ログアウト機能

## API仕様

### 認証エンドポイント

#### ログイン API
```
POST /auth/login
Content-Type: application/json

Request:
{
  "email": "user@hotel.com",
  "password": "password123",
  "tenant_id": "uuid",
  "remember_me": false
}

Response:
{
  "success": true,
  "data": {
    "access_token": "jwt-token",
    "refresh_token": "refresh-token", 
    "expires_in": 28800,
    "token_type": "Bearer",
    "user": {
      "id": "uuid",
      "email": "user@hotel.com",
      "name": "ユーザー名",
      "role": "staff",
      "level": 3,
      "tenant_id": "uuid"
    }
  }
}
```

#### トークン検証 API
```
POST /auth/verify
Authorization: Bearer {access_token}
X-Tenant-ID: {tenant_id}

Response:
{
  "success": true,
  "data": {
    "valid": true,
    "user": { /* user info */ },
    "permissions": ["permission.list"],
    "expires_at": "2024-12-28T15:30:00Z"
  }
}
```

#### トークンリフレッシュ API
```
POST /auth/refresh
Content-Type: application/json

Request:
{
  "refresh_token": "refresh-jwt-token"
}

Response:
{
  "success": true,
  "data": {
    "access_token": "new-jwt-token",
    "refresh_token": "new-refresh-token",
    "expires_in": 28800
  }
}
```

## 制約・前提条件
- hotel-common を認証基盤の中心に配置
- UUIDベースのユーザーID統一
- マルチテナント対応必須
- 段階的移行による既存システム保護

## 関連技術判断
- [ADR-2025-01-03-001]: JWT vs Session Cookie アーキテクチャ選択

## 変更履歴
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| v1.0 | 2025-01-03 | 初版作成（既存設計書からの移行） | 金子裕司 |