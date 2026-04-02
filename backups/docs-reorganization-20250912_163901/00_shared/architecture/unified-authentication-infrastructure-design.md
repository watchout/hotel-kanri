# 統一認証基盤設計 (Unified Authentication Infrastructure)

**作成日**: 2024年12月28日  
**バージョン**: 1.0.0  
**対象システム**: hotel-common, hotel-member, hotel-pms, hotel-saas

## 1. 概要 (Overview)

### 1.1 目的
- 3つのホテル管理システム（hotel-member, hotel-pms, hotel-saas）の認証基盤を統一
- SSO（Single Sign-On）による利便性向上とセキュリティ強化
- JWT + Redis による高性能・拡張性の確保
- 段階的移行による既存システムへの影響最小化

### 1.2 設計方針
- **hotel-common** を認証基盤の中心に配置
- **既存システムを段階的に移行** （破壊的変更を避ける）
- **UUIDベースのユーザーID統一** （システム間の一意性確保）
- **マルチテナント対応** （複数ホテル・グループ対応）
- **セキュリティファースト** （最新のセキュリティ標準準拠）

## 2. アーキテクチャ設計 (Architecture Design)

### 2.1 システム構成

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
                                 │
                         ┌───────▼───────┐
                         │  PostgreSQL   │
                         │    Database   │
                         │  (Multi-tenant)│
                         └───────────────┘
```

### 2.2 認証フロー

#### 2.2.1 ログインフロー
```
1. User → hotel-member/pms/saas: Login Request
2. System → hotel-common: Authentication Request
3. hotel-common → PostgreSQL: User Validation
4. hotel-common → Redis: Session Creation
5. hotel-common → System: JWT Token Pair (Access + Refresh)
6. System → User: Login Success with Tokens
```

#### 2.2.2 API認証フロー
```
1. Client → Any System: API Request with Bearer Token
2. System → hotel-common: Token Validation Request
3. hotel-common → Redis: Session Check
4. hotel-common → System: User Info + Permissions
5. System: Permission Check
6. System → Client: API Response
```

### 2.3 JWT トークン設計

#### 2.3.1 アクセストークン構造
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

#### 2.3.2 リフレッシュトークン構造
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

## 3. 技術仕様 (Technical Specifications)

### 3.1 JWT設定
- **Access Token 有効期限**: 8時間
- **Refresh Token 有効期限**: 30日  
- **Algorithm**: HS256 (将来的にRS256対応検討)
- **Secret Key**: 環境変数 `JWT_SECRET`, `JWT_REFRESH_SECRET`

### 3.2 Redis設定
- **Session TTL**: Access Token と同期 (8時間)
- **Key Pattern**: `hotel:session:{tenant_id}:{user_id}`
- **Blacklist Pattern**: `hotel:blacklist:{jti}`
- **Rate Limit Pattern**: `hotel:ratelimit:{tenant_id}:{user_id}`

### 3.3 セキュリティ仕様

#### 3.3.1 パスワードポリシー
- **最小長**: 8文字
- **複雑性**: 英数字+特殊文字必須
- **ハッシュ化**: PBKDF2 (10,000 iterations, SHA-512)
- **Salt**: 16バイトランダム

#### 3.3.2 セッション管理
- **同時ログイン制限**: テナント設定により制御
- **異常検知**: 異なるIP・デバイスからのアクセス監視
- **セッション無効化**: パスワード変更時、管理者による強制ログアウト

#### 3.3.3 レート制限
- **ログイン試行**: 5回/15分（IP単位）
- **API呼び出し**: 1000回/時間（ユーザー単位）
- **失敗時ペナルティ**: 指数バックオフ

## 4. SSO実装設計 (Single Sign-On Implementation)

### 4.1 SSO方式
- **Internal SSO**: hotel-common経由のTokenベース認証
- **External SSO**: 将来的にSAML 2.0/OpenID Connect対応予定

### 4.2 SSO実装フロー

#### 4.2.1 初回ログイン
```
1. User → hotel-member: Login
2. hotel-member → hotel-common: Authentication
3. hotel-common: JWT Token Generation + Redis Session
4. hotel-member: Login Success
5. User → hotel-pms: Access with Valid Session
6. hotel-pms → hotel-common: Token Validation
7. hotel-pms: Auto Login (SSO Success)
```

#### 4.2.2 トークンリフレッシュ
```
1. System: Access Token Expiry Detection
2. System → hotel-common: Refresh Token Request
3. hotel-common: Refresh Token Validation
4. hotel-common: New Access Token Generation
5. hotel-common → System: New Token Pair
6. System: Seamless User Experience (No Re-login)
```

### 4.3 Cross-Domain Cookie設定
```javascript
// SSO Cookie 設定
{
  name: 'hotel_sso_session',
  httpOnly: true,
  secure: true, // HTTPS必須
  sameSite: 'none', // Cross-domain対応
  domain: '.hotel-domain.com', // 共通ドメイン
  maxAge: 8 * 60 * 60 * 1000 // 8時間
}
```

## 5. 段階移行戦略 (Migration Strategy)

### 5.1 移行フェーズ

#### Phase 1: 基盤準備 (2週間)
- **Week 1**: hotel-common 認証サービス完成
  - JWT Manager 実装
  - Redis Session Store 実装
  - User Management API 実装
- **Week 2**: 統合テスト・セキュリティ検証
  - セキュリティテスト（侵入テスト）
  - パフォーマンステスト
  - フェイルオーバーテスト

#### Phase 2: 段階統合 (4週間)
- **Week 1-2**: hotel-member 統合
  - 既存認証システムとの並行稼働
  - 新規ユーザーからhotel-common認証適用
  - 既存ユーザーの段階移行
- **Week 3-4**: hotel-saas 統合
  - hotel-memberとの連携テスト
  - SSO動作確認
  - 障害時フォールバック機能確認

#### Phase 3: 完全統合 (2週間)  
- **Week 1**: hotel-pms 統合
  - 3システム完全連携
  - SSO機能フル稼働
- **Week 2**: 旧認証システム廃止
  - データ移行完了
  - 監視・アラート設定
  - 運用マニュアル整備

### 5.2 リスク軽減策

#### 5.2.1 データ保護
- **段階移行**: 既存認証システムと並行稼働期間を設ける
- **自動バックアップ**: 移行前後のデータバックアップ
- **ロールバック計画**: 各フェーズでのロールバック手順準備

#### 5.2.2 サービス継続性
- **フェイルオーバー**: hotel-common障害時の各システム独立稼働
- **監視強化**: 移行期間中の24時間監視体制
- **緊急対応**: 障害時の即座対応チーム編成

## 6. API設計 (API Design)

### 6.1 認証エンドポイント

#### 6.1.1 ログイン API
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

#### 6.1.2 トークン検証 API
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

#### 6.1.3 トークンリフレッシュ API
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

### 6.2 ユーザー管理エンドポイント

#### 6.2.1 ユーザー作成 API
```
POST /users
Authorization: Bearer {admin_token}
Content-Type: application/json

Request:
{
  "email": "newuser@hotel.com",
  "password": "password123",
  "name": "新規ユーザー",
  "role": "staff",
  "level": 2,
  "permissions": ["reservation.read", "customer.read"]
}
```

#### 6.2.2 権限チェック API
```
POST /auth/permission-check
Authorization: Bearer {access_token}
Content-Type: application/json

Request:
{
  "action": "reservation.create",
  "resource": "reservation",
  "resource_id": "uuid"
}

Response:
{
  "success": true,
  "data": {
    "allowed": true,
    "reason": "User has required permission"
  }
}
```

## 7. セキュリティ強化策 (Security Enhancements)

### 7.1 攻撃対策

#### 7.1.1 ブルートフォース攻撃
- **実装**: Redis Rate Limitingによる制御
- **設定**: 5回失敗で15分ロック
- **監視**: 異常試行の即座検知・アラート

#### 7.1.2 JWT攻撃
- **Token Rotation**: アクセス時に新しいトークン発行
- **Blacklist機能**: 無効化トークンのRedis管理
- **署名検証**: 厳格なJWT署名検証

#### 7.1.3 セッション攻撃
- **Session Fixation**: ログイン時にSession ID変更
- **Session Hijacking**: IP/User-Agent変化検知
- **CSRF**: SameSite Cookie + CSRF Token

### 7.2 監査・ログ

#### 7.2.1 認証ログ
```json
{
  "event_type": "auth.login.success",
  "user_id": "uuid",
  "tenant_id": "uuid", 
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2024-12-28T10:30:00Z",
  "session_id": "session-uuid"
}
```

#### 7.2.2 操作ログ
```json
{
  "event_type": "api.reservation.create",
  "user_id": "uuid",
  "tenant_id": "uuid",
  "action": "CREATE",
  "resource": "reservation",
  "resource_id": "uuid",
  "ip_address": "192.168.1.100",
  "timestamp": "2024-12-28T10:30:00Z"
}
```

### 7.3 コンプライアンス対応
- **GDPR対応**: データ保護・削除権対応
- **PCI DSS**: 決済関連データの厳格保護
- **SOC 2**: セキュリティ統制の実装
- **ISO 27001**: 情報セキュリティ管理システム準拠

## 8. パフォーマンス最適化 (Performance Optimization)

### 8.1 キャッシュ戦略
- **Redis Session Cache**: 8時間TTL
- **User Permission Cache**: 1時間TTL
- **Token Validation Cache**: 5分TTL
- **Rate Limit Counter**: 実時間更新

### 8.2 データベース最適化
- **Connection Pooling**: Prismaの接続プール活用
- **Index Strategy**: tenant_id, user_id, email複合インデックス
- **Query Optimization**: N+1問題の回避

### 8.3 スケーラビリティ
- **Horizontal Scaling**: hotel-common複数インスタンス対応
- **Load Balancing**: nginx/HAProxyによる負荷分散
- **Redis Cluster**: 大規模展開時のRedisクラスター構成

## 9. 監視・運用 (Monitoring & Operations)

### 9.1 メトリクス監視
- **認証成功率**: >99.9%
- **Token検証レスポンス時間**: <50ms
- **Redis接続レスポンス時間**: <10ms
- **エラー率**: <0.1%

### 9.2 アラート設定
- **認証失敗急増**: 5分間で100回超過
- **Token検証エラー**: 1分間で50回超過
- **Redis接続エラー**: 即座
- **異常IP検知**: 即座

### 9.3 運用手順
- **定期パスワード更新**: 90日周期推奨
- **Token Secret Rotation**: 年1回
- **セキュリティ監査**: 四半期ごと
- **災害復旧テスト**: 半年ごと

## 10. 実装スケジュール (Implementation Schedule)

### 10.1 詳細スケジュール

| Week | Task | Deliverables |
|------|------|-------------|
| 1 | hotel-common JWT Service実装 | JWT Manager完成 |
| 2 | Redis Session Store実装 | Session Management完成 |
| 3 | User Management API実装 | CRUD API完成 |
| 4 | セキュリティテスト | 脆弱性検証完了 |
| 5-6 | hotel-member統合 | Member系SSO完成 |
| 7-8 | hotel-saas統合 | Saas系SSO完成 |
| 9-10 | hotel-pms統合 | PMS系SSO完成 |
| 11-12 | 最終テスト・運用移行 | 本格運用開始 |

### 10.2 成功指標
- **可用性**: 99.9%以上
- **レスポンス時間**: API <200ms, SSO <500ms
- **セキュリティ**: 重大脆弱性0件
- **ユーザー満足度**: SSO利便性向上90%以上

---

**注意事項**:
1. このドキュメントは実装前の設計仕様です
2. 実装中に仕様変更が発生する可能性があります
3. セキュリティ要件は最新の脅威情報に基づき更新されます
4. 移行スケジュールはシステム状況により調整される場合があります 