# チェックインセッション管理 - SSOT（Single Source of Truth）

**Doc-ID**: SSOT-2025-001  
**Version**: 1.0.0  
**Status**: Active  
**Owner**: hotel-kanri統合プロジェクト  
**Last Updated**: 2025-10-01  
**対象システム**: hotel-saas, hotel-pms, hotel-common

---

## 0. プロジェクト概要（Product Brief）

- **プロダクト名**: チェックインセッション管理システム
- **一言の価値訴求（USP）**: 客室タブレットでの安全で継続的なチェックイン体験を実現
- **主要ユーザー/ステークホルダー**: 
  - ホテル宿泊客（客室タブレット利用者）
  - フロントスタッフ（セッション管理・監視）
  - システム管理者（セキュリティ・監査）
- **KPI/成功指標**: 
  - セッション生成成功率 99.9%
  - 不正アクセス検知率 100%
  - セッション有効期限内の正常終了率 95%以上
- **対象プラットフォーム**: Web（客室タブレット）, Web管理画面
- **想定リリース段階**: MVP → β → 本番

---

## 1. 要求定義（Business → System）

### ユーザーストーリー

#### US-001: 客室でのチェックイン開始
```gherkin
Given: 宿泊客が客室に入室した
When: 客室タブレットでチェックイン画面を開く
Then: 固有のセッションIDが発行され、安全にチェックイン操作が開始できる
```

#### US-002: セッションの自動有効期限管理
```gherkin
Given: チェックインセッションが開始された
When: 指定時間（デフォルト1時間）が経過する
Then: セッションは自動的に無効化され、再認証が必要になる
```

#### US-003: デバイス固有のセッション管理
```gherkin
Given: 客室タブレット（デバイスA）でセッションが開始された
When: 同じ客室の別デバイス（デバイスB）からアクセスを試みる
Then: 既存セッションが無効化され、新しいセッションが発行される
```

#### US-004: システム間セッション引き渡し
```gherkin
Given: hotel-saasでチェックインセッションが作成された
When: hotel-pmsでルームサービス注文などの操作が必要になる
Then: セッション情報が安全に引き渡され、ユーザーは再認証なしで操作できる
```

#### US-005: セッションの強制終了（スタッフ操作）
```gherkin
Given: フロントスタッフが管理画面を開いている
When: 特定の客室セッションを強制終了する
Then: 該当セッションは即座に無効化され、タブレットは再認証画面に遷移する
```

### ユースケース一覧

| ID | タイトル | 主要アクター | サマリ |
|----|---------|-------------|--------|
| UC-001 | セッション作成 | 客室タブレット | 客室入室時に新規セッションを発行 |
| UC-002 | セッション検証 | hotel-saas/pms | APIリクエスト時にセッション有効性を確認 |
| UC-003 | セッション更新 | 客室タブレット | 有効期限を延長（アクティビティ検知時） |
| UC-004 | セッション終了 | 客室タブレット/システム | 明示的な終了または自動期限切れ |
| UC-005 | セッション引き渡し | システム間 | hotel-saas → hotel-pms へのセッション情報転送 |
| UC-006 | セッション監視 | フロントスタッフ | アクティブセッション一覧表示・強制終了 |

### 非機能要件（NFR）

#### パフォーマンス
- セッション作成: P95 < 100ms
- セッション検証: P95 < 50ms
- 同時セッション数: 最大500（ホテル客室数想定）
- データベース接続プール: 最小10、最大50

#### 可用性
- SLA: 99.9%（月間ダウンタイム < 43分）
- RTO（Recovery Time Objective）: 5分
- RPO（Recovery Point Objective）: 1分（トランザクションログバックアップ）

#### セキュリティ
- セッションID: ULID（推測不可能、時系列ソート可能）
- 通信: HTTPS/TLS 1.3必須
- セッション固定攻撃対策: デバイス変更時は新規セッション発行
- CSRF対策: SameSite=Strict Cookieまたはトークンベース
- 監査ログ: 全セッション操作を記録（作成・更新・終了・強制終了）
- Rate Limiting: 同一IPから1分間に10回まで

#### 運用
- 監視: APM（Application Performance Monitoring）
- ログ: 構造化JSON、traceId必須
- アラート: 
  - セッション作成失敗率 > 1%
  - 不正アクセス検知
  - データベース接続エラー
- バックアップ: PostgreSQL WALアーカイブ、日次フルバックアップ

#### 法令/規約
- 個人情報保護法: セッションに個人情報を含めない（IDのみ）
- ホテル利用規約: セッション利用に関する同意取得

---

## 2. ドメインモデル（概念設計）

### 主要ドメイン用語集（Glossary）

| 用語 | 定義 | 備考 |
|-----|------|------|
| CheckinSession | 客室でのチェックイン体験を管理する一時的なセッション | 有効期限あり |
| Tenant | ホテルグループまたは個別ホテル | マルチテナント対応 |
| Room | 客室 | 物理的な部屋 |
| Device | 客室タブレットなどのデバイス | device_idで識別 |
| SessionStatus | セッションの状態 | active/expired/terminated |
| SessionHandoff | システム間でのセッション引き渡し | hotel-saas ⇄ hotel-pms |

### ドメインオブジェクト一覧

#### CheckinSession（集約ルート）
- **責務**: チェックインセッションのライフサイクル管理
- **属性**: id, tenant_id, room_id, device_id, status, expires_at, created_at, updated_at
- **振る舞い**:
  - `create()`: 新規セッション作成
  - `validate()`: セッション有効性検証
  - `extend()`: 有効期限延長
  - `terminate()`: セッション終了
  - `isExpired()`: 期限切れ判定
  - `handoff()`: システム間引き渡し

#### Tenant
- **責務**: テナント（ホテル）情報管理
- **属性**: id, name, settings
- **関係**: 1テナント : N セッション

#### Room
- **責務**: 客室情報管理
- **属性**: id, tenant_id, room_number, status
- **関係**: 1客室 : 1アクティブセッション（同時）

### 関係図

```
Tenant (1) ----< (N) CheckinSession
Room (1) ----< (N) CheckinSession
CheckinSession (1) ---- (1) Device（論理的関連）
```

### 集約境界（Aggregate）

- **CheckinSession集約**: CheckinSessionがルートエンティティ
  - 整合性境界: 1セッション内の状態遷移は必ずアトミック
  - トランザクション境界: セッション作成・更新・終了は1トランザクション
  - 外部参照: tenant_id, room_idは外部キー参照のみ

### ユースケース→ドメインの対応表

| ユースケース | ドメインオブジェクト | 主要メソッド |
|-------------|-------------------|-------------|
| UC-001 セッション作成 | CheckinSession | create() |
| UC-002 セッション検証 | CheckinSession | validate(), isExpired() |
| UC-003 セッション更新 | CheckinSession | extend() |
| UC-004 セッション終了 | CheckinSession | terminate() |
| UC-005 セッション引き渡し | CheckinSession | handoff() |
| UC-006 セッション監視 | CheckinSession | list(), terminate() |

---

## 3. データモデル（論理・物理設計）

### 3.1 命名規約

- **DB**: snake_case（テーブル: `checkin_sessions`, PK: `id`, FK: `_id`）
- **API/JSON**: camelCase（例: `sessionId`, `deviceId`, `expiresAt`）
- **ID方針**: ULID（ソート安定・分散生成容易・26文字）
- **タイムスタンプ**: 
  - `created_at` (timestamptz, NOT NULL)
  - `updated_at` (timestamptz, NOT NULL)
  - `deleted_at` (timestamptz, NULL) - ソフトデリート
- **マルチテナント**: 全テーブルに `tenant_id` (ulid, FK tenants.id) 必須
- **全クエリ**: `WHERE tenant_id = :tenant_id` 必須（Row Level Security推奨）

### 3.2 エンティティ定義

#### Entity: CheckinSession

**説明**: 客室でのチェックイン体験を管理する一時的なセッション

**テーブル**: `checkin_sessions`

**フィールド一覧**:

| フィールド名 | 型 | NULL | デフォルト | 制約 | 説明 |
|-------------|-----|------|-----------|------|------|
| id | ulid | NOT NULL | - | PRIMARY KEY | セッションID（ULID） |
| tenant_id | ulid | NOT NULL | - | FK tenants.id, INDEX | テナントID |
| room_id | integer | NOT NULL | - | FK rooms.id, INDEX | 客室ID |
| device_id | varchar(255) | NOT NULL | - | INDEX | デバイス識別子（UUID/fingerprint） |
| status | text | NOT NULL | 'active' | CHECK IN ('active', 'expired', 'terminated') | セッション状態 |
| expires_at | timestamptz | NOT NULL | - | CHECK (expires_at > created_at) | 有効期限 |
| metadata | jsonb | NULL | NULL | - | 追加メタデータ（デバイス情報等） |
| created_at | timestamptz | NOT NULL | now() | - | 作成日時 |
| updated_at | timestamptz | NOT NULL | now() | - | 更新日時 |
| deleted_at | timestamptz | NULL | NULL | - | 削除日時（ソフトデリート） |

**制約/インデックス**:
```sql
-- 主キー
PRIMARY KEY (id)

-- 外部キー
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE

-- インデックス
CREATE INDEX idx_checkin_sessions_tenant_id ON checkin_sessions(tenant_id);
CREATE INDEX idx_checkin_sessions_room_id ON checkin_sessions(room_id);
CREATE INDEX idx_checkin_sessions_device_id ON checkin_sessions(device_id);
CREATE INDEX idx_checkin_sessions_status ON checkin_sessions(status);
CREATE INDEX idx_checkin_sessions_expires_at ON checkin_sessions(expires_at);

-- 複合インデックス（検索最適化）
CREATE INDEX idx_checkin_sessions_tenant_room_status 
  ON checkin_sessions(tenant_id, room_id, status) 
  WHERE deleted_at IS NULL;

-- ユニーク制約（1客室に1アクティブセッション）
CREATE UNIQUE INDEX idx_checkin_sessions_unique_active_room 
  ON checkin_sessions(tenant_id, room_id) 
  WHERE status = 'active' AND deleted_at IS NULL;
```

**バリデーションルール**:
- `expires_at` は `created_at` より未来
- `status` は列挙値のみ
- `device_id` は 1-255文字
- `tenant_id` と `room_id` の組み合わせが有効（tenants.rooms に存在）

**サンプルレコード**:
```sql
INSERT INTO checkin_sessions (id, tenant_id, room_id, device_id, status, expires_at, metadata, created_at, updated_at) VALUES
('01JBQX7K4M6N8P9Q0R1S2T3U4V', '01JBQW1A2B3C4D5E6F7G8H9J0K', 101, 'device-tablet-101-fingerprint-abc123', 'active', '2025-10-01 15:00:00+00', '{"device_type": "tablet", "os": "android", "app_version": "1.0.0"}', '2025-10-01 14:00:00+00', '2025-10-01 14:00:00+00'),
('01JBQX8L5N7O9P0Q1R2S3T4U5W', '01JBQW1A2B3C4D5E6F7G8H9J0K', 102, 'device-tablet-102-fingerprint-xyz789', 'active', '2025-10-01 16:00:00+00', '{"device_type": "tablet", "os": "android", "app_version": "1.0.0"}', '2025-10-01 15:00:00+00', '2025-10-01 15:00:00+00'),
('01JBQX9M6O8P0Q1R2S3T4U5V6X', '01JBQW1A2B3C4D5E6F7G8H9J0K', 103, 'device-tablet-103-fingerprint-def456', 'expired', '2025-10-01 13:00:00+00', '{"device_type": "tablet", "os": "android", "app_version": "1.0.0"}', '2025-10-01 12:00:00+00', '2025-10-01 13:00:00+00');
```

### 3.3 リレーション一覧

- **Tenant 1:N CheckinSession** （外部キー: checkin_sessions.tenant_id）
- **Room 1:N CheckinSession** （外部キー: checkin_sessions.room_id）

### 3.4 データ保持ポリシー

- **アクティブセッション**: 有効期限まで保持
- **期限切れセッション**: ハードデリートは30日後（監査ログ保持期間）
- **削除セッション**: ソフトデリート（deleted_at にタイムスタンプ）、物理削除は90日後

---

## 4. API設計（Webサーバー ⇄ DB/APIサーバー）

### 4.1 全体方針

- **インターフェース**: REST（将来 GraphQL 拡張可）
- **バージョニング**: `/api/v1/...`（後方互換を原則）
- **認証**:
  - フロント→API: JWT（アクセストークン短命15分, リフレッシュトークンHTTPOnly）
  - サービス間: 署名付きサービスキー（HMAC-SHA256）
- **認可**: RBAC（role: guest/staff/admin）
- **レスポンス形式**: JSON（Content-Type: application/json; charset=utf-8）
- **エラーフォーマット**:
```json
{
  "error": {
    "code": "SESSION_EXPIRED",
    "message": "セッションの有効期限が切れています",
    "details": {
      "sessionId": "01JBQX7K4M6N8P9Q0R1S2T3U4V",
      "expiredAt": "2025-10-01T15:00:00Z"
    }
  },
  "traceId": "01JBQXABC123DEF456GHI789JK"
}
```

### 4.2 エンドポイント定義

#### 4.2.1 セッション作成

**Name**: Create Checkin Session  
**Method/Path**: `POST /api/v1/checkin/sessions`  
**Auth**: Bearer JWT / Role: guest+  
**Request Headers**:
```
Authorization: Bearer <JWT>
Content-Type: application/json
X-Tenant-ID: <ULID>
```

**Request Body**:
```typescript
{
  "roomId": 101,                    // integer, 必須
  "deviceId": "device-abc123",       // string(1-255), 必須
  "expiresIn": 3600                  // integer(秒), 任意, デフォルト: 3600
}
```

**200 Success Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "01JBQX7K4M6N8P9Q0R1S2T3U4V",
    "tenantId": "01JBQW1A2B3C4D5E6F7G8H9J0K",
    "roomId": 101,
    "deviceId": "device-abc123",
    "status": "active",
    "expiresAt": "2025-10-01T15:00:00Z",
    "createdAt": "2025-10-01T14:00:00Z"
  },
  "traceId": "01JBQXABC123DEF456GHI789JK"
}
```

**Error Responses**:
- `400 BAD_REQUEST`: バリデーションエラー
  - `INVALID_ROOM_ID`: 客室IDが無効
  - `INVALID_DEVICE_ID`: デバイスIDが無効
  - `INVALID_EXPIRES_IN`: 有効期限が範囲外（60-86400秒）
- `401 UNAUTHORIZED`: 認証エラー
- `403 FORBIDDEN`: 権限不足
- `409 CONFLICT`: セッション重複（同一客室に既存アクティブセッション）
- `500 INTERNAL_SERVER_ERROR`: サーバーエラー

**Notes**:
- 同一客室に既存アクティブセッションがある場合、古いセッションは自動的に`terminated`に更新
- `expiresIn`は60秒〜24時間（86400秒）の範囲で指定可能

---

#### 4.2.2 セッション検証

**Name**: Validate Checkin Session  
**Method/Path**: `GET /api/v1/checkin/sessions/:sessionId/validate`  
**Auth**: Bearer JWT / Role: guest+  

**Request Headers**:
```
Authorization: Bearer <JWT>
X-Tenant-ID: <ULID>
```

**Path Parameters**:
- `sessionId`: string (ULID), 必須

**200 Success Response**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "sessionId": "01JBQX7K4M6N8P9Q0R1S2T3U4V",
    "status": "active",
    "expiresAt": "2025-10-01T15:00:00Z",
    "remainingSeconds": 2400
  },
  "traceId": "01JBQXABC123DEF456GHI789JK"
}
```

**Error Responses**:
- `400 BAD_REQUEST`: 
  - `INVALID_SESSION_ID`: セッションIDが無効な形式
- `401 UNAUTHORIZED`: 認証エラー
- `404 NOT_FOUND`: 
  - `SESSION_NOT_FOUND`: セッションが存在しない
- `410 GONE`:
  - `SESSION_EXPIRED`: セッションが期限切れ
  - `SESSION_TERMINATED`: セッションが終了済み

---

#### 4.2.3 セッション更新（有効期限延長）

**Name**: Extend Checkin Session  
**Method/Path**: `PATCH /api/v1/checkin/sessions/:sessionId/extend`  
**Auth**: Bearer JWT / Role: guest+  

**Request Body**:
```typescript
{
  "expiresIn": 3600  // integer(秒), 必須, 60-86400
}
```

**200 Success Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "01JBQX7K4M6N8P9Q0R1S2T3U4V",
    "expiresAt": "2025-10-01T16:00:00Z",
    "updatedAt": "2025-10-01T15:00:00Z"
  },
  "traceId": "01JBQXABC123DEF456GHI789JK"
}
```

**Error Responses**:
- `400 BAD_REQUEST`: 
  - `INVALID_EXPIRES_IN`: 有効期限が範囲外
- `404 NOT_FOUND`: セッションが存在しない
- `410 GONE`: セッションが既に期限切れ/終了済み

---

#### 4.2.4 セッション終了

**Name**: Terminate Checkin Session  
**Method/Path**: `DELETE /api/v1/checkin/sessions/:sessionId`  
**Auth**: Bearer JWT / Role: guest+  

**200 Success Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "01JBQX7K4M6N8P9Q0R1S2T3U4V",
    "status": "terminated",
    "terminatedAt": "2025-10-01T15:30:00Z"
  },
  "traceId": "01JBQXABC123DEF456GHI789JK"
}
```

---

#### 4.2.5 セッション一覧取得（スタッフ用）

**Name**: List Checkin Sessions  
**Method/Path**: `GET /api/v1/checkin/sessions`  
**Auth**: Bearer JWT / Role: staff+  

**Query Parameters**:
```
status: string, 任意, enum(active/expired/terminated/all), デフォルト: active
roomId: integer, 任意
page: integer, 任意, デフォルト: 1
limit: integer, 任意, デフォルト: 50, 最大: 100
```

**200 Success Response**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "sessionId": "01JBQX7K4M6N8P9Q0R1S2T3U4V",
        "roomId": 101,
        "deviceId": "device-abc123",
        "status": "active",
        "expiresAt": "2025-10-01T15:00:00Z",
        "createdAt": "2025-10-01T14:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 125,
      "totalPages": 3
    }
  },
  "traceId": "01JBQXABC123DEF456GHI789JK"
}
```

---

#### 4.2.6 セッション引き渡し（システム間）

**Name**: Handoff Checkin Session  
**Method/Path**: `POST /api/v1/checkin/sessions/:sessionId/handoff`  
**Auth**: Service Key (HMAC) / Role: system  

**Request Headers**:
```
Authorization: ServiceKey <HMAC-SHA256-SIGNATURE>
X-Source-System: hotel-saas
X-Target-System: hotel-pms
X-Tenant-ID: <ULID>
Content-Type: application/json
```

**Request Body**:
```typescript
{
  "targetSystem": "hotel-pms",  // string, 必須
  "metadata": {                 // object, 任意
    "purpose": "room_service",
    "redirectUrl": "/room-service/menu"
  }
}
```

**200 Success Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "01JBQX7K4M6N8P9Q0R1S2T3U4V",
    "tenantId": "01JBQW1A2B3C4D5E6F7G8H9J0K",
    "roomId": 101,
    "expiresAt": "2025-10-01T15:00:00Z",
    "handoffToken": "<JWT-TOKEN>",  // 引き渡し専用短命トークン（5分有効）
    "targetUrl": "https://pms.example.com/api/v1/checkin/sessions/receive"
  },
  "traceId": "01JBQXABC123DEF456GHI789JK"
}
```

**Notes**:
- システム間認証はHMAC-SHA256署名を使用
- handoffTokenは5分間有効な使い捨てトークン
- 引き渡し先システムはこのトークンを使ってセッション情報を取得

---

### 4.3 エラーコード一覧

| コード | HTTPステータス | 説明 | 対処方法 |
|--------|---------------|------|---------|
| INVALID_SESSION_ID | 400 | セッションIDの形式が無効 | ULID形式で再送 |
| INVALID_ROOM_ID | 400 | 客室IDが無効 | 有効な客室IDを指定 |
| INVALID_DEVICE_ID | 400 | デバイスIDが無効 | 1-255文字で指定 |
| INVALID_EXPIRES_IN | 400 | 有効期限が範囲外 | 60-86400秒で指定 |
| UNAUTHORIZED | 401 | 認証失敗 | 正しいJWTを提供 |
| FORBIDDEN | 403 | 権限不足 | 必要な権限を取得 |
| SESSION_NOT_FOUND | 404 | セッションが存在しない | 正しいセッションIDを確認 |
| SESSION_CONFLICT | 409 | セッション重複 | 既存セッションを終了後に再作成 |
| SESSION_EXPIRED | 410 | セッションが期限切れ | 新規セッションを作成 |
| SESSION_TERMINATED | 410 | セッションが終了済み | 新規セッションを作成 |
| INTERNAL_SERVER_ERROR | 500 | サーバーエラー | サポートに連絡 |

---

## 5. システム間連携仕様

### 5.1 hotel-saas → hotel-pms セッション引き渡し

**シーケンス図**:
```
Client(Tablet)  hotel-saas-API  hotel-pms-API
     |                |               |
     |--POST /handoff->|              |
     |                |--validate---->|
     |                |<--OK----------|
     |<--handoffToken-|               |
     |                                |
     |--GET /receive (with token)---->|
     |<--session data----------------|
```

**データ契約**:
```typescript
interface SessionHandoffRequest {
  sessionId: string;           // ULID
  targetSystem: 'hotel-pms' | 'hotel-saas';
  metadata?: Record<string, any>;
}

interface SessionHandoffResponse {
  sessionId: string;           // ULID
  tenantId: string;            // ULID
  roomId: number;
  expiresAt: string;           // ISO 8601
  handoffToken: string;        // JWT, 5分有効
  targetUrl: string;
}

interface SessionReceiveRequest {
  handoffToken: string;        // JWT
}

interface SessionReceiveResponse {
  sessionId: string;
  tenantId: string;
  roomId: number;
  deviceId: string;
  status: 'active';
  expiresAt: string;
  metadata?: Record<string, any>;
}
```

### 5.2 セキュリティ要件

- **HMAC署名検証**: すべてのシステム間APIリクエスト
- **短命トークン**: handoffTokenは5分間のみ有効、1回使い切り
- **リプレイ攻撃対策**: nonce + タイムスタンプ検証
- **TLS必須**: システム間通信はTLS 1.3以上

---

## 6. 共通型定義（TypeScript）

**ファイルパス**: `types/shared.ts`

```typescript
/**
 * チェックインセッション - 共通型定義
 * 
 * この型定義は hotel-saas, hotel-pms, hotel-common で共有される
 * SSOT: docs/SSOT_CHECKIN_SESSIONS.md
 */

/** セッションステータス */
export type SessionStatus = 'active' | 'expired' | 'terminated';

/** セッションエンティティ */
export interface CheckinSession {
  /** セッションID (ULID) */
  sessionId: string;
  
  /** テナントID (ULID) */
  tenantId: string;
  
  /** 客室ID */
  roomId: number;
  
  /** デバイス識別子 */
  deviceId: string;
  
  /** セッション状態 */
  status: SessionStatus;
  
  /** 有効期限 (ISO 8601) */
  expiresAt: string;
  
  /** メタデータ */
  metadata?: Record<string, any>;
  
  /** 作成日時 (ISO 8601) */
  createdAt: string;
  
  /** 更新日時 (ISO 8601) */
  updatedAt: string;
}

/** セッション作成リクエスト */
export interface CreateSessionRequest {
  /** 客室ID */
  roomId: number;
  
  /** デバイス識別子 (1-255文字) */
  deviceId: string;
  
  /** 有効期限（秒） 60-86400 */
  expiresIn?: number;
}

/** セッション作成レスポンス */
export interface CreateSessionResponse {
  success: true;
  data: CheckinSession;
  traceId: string;
}

/** セッション検証レスポンス */
export interface ValidateSessionResponse {
  success: true;
  data: {
    valid: boolean;
    sessionId: string;
    status: SessionStatus;
    expiresAt: string;
    remainingSeconds: number;
  };
  traceId: string;
}

/** セッション引き渡しリクエスト */
export interface SessionHandoffRequest {
  targetSystem: 'hotel-pms' | 'hotel-saas';
  metadata?: Record<string, any>;
}

/** セッション引き渡しレスポンス */
export interface SessionHandoffResponse {
  success: true;
  data: {
    sessionId: string;
    tenantId: string;
    roomId: number;
    expiresAt: string;
    handoffToken: string;
    targetUrl: string;
  };
  traceId: string;
}

/** エラーレスポンス */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  traceId: string;
}

/** APIレスポンス共通型 */
export type ApiResponse<T> = 
  | { success: true; data: T; traceId: string }
  | ErrorResponse;
```

---

## 7. テスト設計

### 7.1 受入基準

#### TC-001: セッション作成（正常系）
- **Given**: 有効な客室ID、デバイスID、JWTトークンが提供される
- **When**: POST /api/v1/checkin/sessions を呼び出す
- **Then**: 
  - HTTPステータス 200
  - レスポンスに有効なセッションIDが含まれる
  - データベースにレコードが作成される
  - status = 'active'

#### TC-002: セッション作成（重複セッション）
- **Given**: 客室101に既存アクティブセッションが存在する
- **When**: 同じ客室で新規セッション作成を試みる
- **Then**: 
  - 既存セッションは自動的にstatusが'terminated'に更新される
  - 新規セッションが作成される
  - HTTPステータス 200

#### TC-003: セッション検証（期限切れ）
- **Given**: 有効期限を過ぎたセッションIDが提供される
- **When**: GET /api/v1/checkin/sessions/:id/validate を呼び出す
- **Then**: 
  - HTTPステータス 410 GONE
  - エラーコード 'SESSION_EXPIRED'

#### TC-004: セッション引き渡し（システム間）
- **Given**: hotel-saasでアクティブなセッションが存在する
- **When**: POST /api/v1/checkin/sessions/:id/handoff を呼び出す
- **Then**: 
  - handoffToken（5分有効）が発行される
  - hotel-pmsがこのトークンでセッション情報を取得できる
  - トークンは1回のみ使用可能

### 7.2 テストケース（Jest/Supertest例）

```typescript
import request from 'supertest';
import { app } from '../app';
import { ulid } from 'ulid';

describe('POST /api/v1/checkin/sessions', () => {
  it('正常系: セッションを作成できる', async () => {
    const tenantId = ulid();
    const roomId = 101;
    const deviceId = `device-${ulid()}`;
    
    const response = await request(app)
      .post('/api/v1/checkin/sessions')
      .set('Authorization', `Bearer ${validJWT}`)
      .set('X-Tenant-ID', tenantId)
      .send({
        roomId,
        deviceId,
        expiresIn: 3600
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      sessionId: expect.stringMatching(/^01[0-9A-Z]{24}$/),
      tenantId,
      roomId,
      deviceId,
      status: 'active'
    });
  });
  
  it('異常系: 無効な客室IDでエラー', async () => {
    const response = await request(app)
      .post('/api/v1/checkin/sessions')
      .set('Authorization', `Bearer ${validJWT}`)
      .set('X-Tenant-ID', ulid())
      .send({
        roomId: -1,
        deviceId: 'device-123'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ROOM_ID');
  });
});

describe('GET /api/v1/checkin/sessions/:id/validate', () => {
  it('正常系: 有効なセッションを検証できる', async () => {
    const sessionId = await createTestSession();
    
    const response = await request(app)
      .get(`/api/v1/checkin/sessions/${sessionId}/validate`)
      .set('Authorization', `Bearer ${validJWT}`)
      .set('X-Tenant-ID', testTenantId);
    
    expect(response.status).toBe(200);
    expect(response.body.data.valid).toBe(true);
    expect(response.body.data.status).toBe('active');
  });
  
  it('異常系: 期限切れセッションで410エラー', async () => {
    const expiredSessionId = await createExpiredSession();
    
    const response = await request(app)
      .get(`/api/v1/checkin/sessions/${expiredSessionId}/validate`)
      .set('Authorization', `Bearer ${validJWT}`)
      .set('X-Tenant-ID', testTenantId);
    
    expect(response.status).toBe(410);
    expect(response.body.error.code).toBe('SESSION_EXPIRED');
  });
});
```

---

## 8. セキュリティ & 監査

### 8.1 セキュリティ対策

#### JWT管理
- **アクセストークン**: 15分有効、短命
- **リフレッシュトークン**: HttpOnly Cookie、SameSite=Strict、7日有効
- **トークン失効**: Redis blacklistで管理

#### RBAC（Role-Based Access Control）

| Role | 権限 | 説明 |
|------|-----|------|
| guest | セッション作成・検証・更新・終了（自分のみ） | 宿泊客 |
| staff | 全セッション閲覧・強制終了 | フロントスタッフ |
| admin | 全操作 + 監査ログ閲覧 | システム管理者 |
| system | システム間API（handoff等） | サービス間通信 |

#### 入力バリデーション
- **サーバー側必須**: すべての入力をサーバー側で検証
- **型検証**: Zod/Joi等のスキーマバリデーションライブラリ使用
- **SQLインジェクション対策**: Prisma ORM使用（パラメータ化クエリ）
- **XSS対策**: 出力エスケープ、Content-Security-Policy ヘッダ

### 8.2 監査ログ

**テーブル**: `audit_logs`

```sql
CREATE TABLE audit_logs (
  id ulid PRIMARY KEY,
  tenant_id ulid NOT NULL,
  entity_type text NOT NULL,  -- 'checkin_session'
  entity_id ulid NOT NULL,     -- session_id
  action text NOT NULL,        -- 'created', 'updated', 'terminated', 'validated'
  actor_id ulid,               -- user_id or 'system'
  actor_type text,             -- 'guest', 'staff', 'admin', 'system'
  metadata jsonb,              -- 変更内容等
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

**記録対象イベント**:
- セッション作成
- セッション検証（失敗時のみ）
- セッション更新
- セッション終了（明示的/自動）
- セッション引き渡し
- セッション強制終了（スタッフ操作）

---

## 9. 運用・SRE

### 9.1 ログ設計

**構造化JSON形式**:
```json
{
  "timestamp": "2025-10-01T14:00:00.123Z",
  "level": "info",
  "service": "hotel-saas",
  "traceId": "01JBQXABC123DEF456GHI789JK",
  "action": "create_session",
  "sessionId": "01JBQX7K4M6N8P9Q0R1S2T3U4V",
  "tenantId": "01JBQW1A2B3C4D5E6F7G8H9J0K",
  "roomId": 101,
  "duration": 45,
  "status": "success"
}
```

### 9.2 モニタリング指標

| メトリクス | 閾値 | アラート |
|-----------|------|---------|
| セッション作成成功率 | < 99% | Critical |
| セッション作成P95レイテンシ | > 200ms | Warning |
| アクティブセッション数 | > 600 | Warning |
| 期限切れセッション処理遅延 | > 60秒 | Warning |
| API エラー率 | > 1% | Critical |
| データベース接続エラー | > 0 | Critical |

### 9.3 バックアップ/リストア

- **PostgreSQL WAL アーカイブ**: 継続的
- **フルバックアップ**: 日次（深夜3:00 JST）
- **保持期間**: 30日間
- **リストア手順**: `docs/operations/restore-procedure.md`

### 9.4 定期メンテナンス

**期限切れセッションのクリーンアップ**:
```sql
-- 期限切れから30日経過したセッションをハードデリート
DELETE FROM checkin_sessions 
WHERE status IN ('expired', 'terminated') 
  AND updated_at < NOW() - INTERVAL '30 days';
```

**Cronジョブ**: 毎日午前4:00実行

---

## 10. AIエージェント用プロンプト

### 10.1 実装生成プロンプト

```
役割: あなたは hotel-kanri プロジェクトの実装エンジニアです。

前提:
- SSOT: docs/SSOT_CHECKIN_SESSIONS.md を唯一の仕様として厳守
- 技術スタック: Nuxt 3, TypeScript, Prisma ORM, PostgreSQL
- 命名規約: DB=snake_case, API/Code=camelCase
- マルチテナント: 全クエリに tenant_id 必須

タスク: セッション作成APIエンドポイントを実装してください

出力:
1. Prisma スキーマ定義
2. API ハンドラー実装 (server/api/v1/checkin/sessions/index.post.ts)
3. バリデーションスキーマ (Zod)
4. テストコード (Jest)
5. マイグレーションSQL

制約:
- SSOT から逸脱しない
- エラーハンドリング必須
- 監査ログ記録必須
- traceId 必須
```

### 10.2 テスト生成プロンプト

```
役割: あなたは hotel-kanri プロジェクトのQAエンジニアです。

前提: SSOT セクション7「テスト設計」に基づいてテストを作成

タスク: セッション作成APIの完全なテストスイートを作成

含めるべきテストケース:
- 正常系: 成功パターン
- 異常系: バリデーションエラー全パターン
- 境界値: expiresIn の最小/最大値
- セキュリティ: 認証・認可エラー
- 並行性: 同時リクエスト時の挙動

出力フォーマット: Jest + Supertest
```

---

## 11. マイグレーションSQL

**ファイル**: `migrations/001_create_checkin_sessions.sql`

```sql
-- =====================================================
-- Migration: Create checkin_sessions table
-- SSOT: docs/SSOT_CHECKIN_SESSIONS.md
-- Version: 1.0.0
-- Date: 2025-10-01
-- =====================================================

-- Create checkin_sessions table
CREATE TABLE IF NOT EXISTS checkin_sessions (
  id text PRIMARY KEY,  -- ULID
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id integer NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  device_id varchar(255) NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated')),
  expires_at timestamptz NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  
  CONSTRAINT chk_expires_at_future CHECK (expires_at > created_at)
);

-- Indexes
CREATE INDEX idx_checkin_sessions_tenant_id ON checkin_sessions(tenant_id);
CREATE INDEX idx_checkin_sessions_room_id ON checkin_sessions(room_id);
CREATE INDEX idx_checkin_sessions_device_id ON checkin_sessions(device_id);
CREATE INDEX idx_checkin_sessions_status ON checkin_sessions(status);
CREATE INDEX idx_checkin_sessions_expires_at ON checkin_sessions(expires_at);

-- Composite index for common queries
CREATE INDEX idx_checkin_sessions_tenant_room_status 
  ON checkin_sessions(tenant_id, room_id, status) 
  WHERE deleted_at IS NULL;

-- Unique constraint: 1 active session per room
CREATE UNIQUE INDEX idx_checkin_sessions_unique_active_room 
  ON checkin_sessions(tenant_id, room_id) 
  WHERE status = 'active' AND deleted_at IS NULL;

-- Trigger: Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_checkin_sessions_updated_at
  BEFORE UPDATE ON checkin_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE checkin_sessions IS 'チェックインセッション管理テーブル';
COMMENT ON COLUMN checkin_sessions.id IS 'セッションID (ULID)';
COMMENT ON COLUMN checkin_sessions.tenant_id IS 'テナントID';
COMMENT ON COLUMN checkin_sessions.room_id IS '客室ID';
COMMENT ON COLUMN checkin_sessions.device_id IS 'デバイス識別子';
COMMENT ON COLUMN checkin_sessions.status IS 'セッション状態: active, expired, terminated';
COMMENT ON COLUMN checkin_sessions.expires_at IS 'セッション有効期限';
COMMENT ON COLUMN checkin_sessions.metadata IS 'メタデータ（デバイス情報等）';

-- =====================================================
-- Rollback script
-- =====================================================
-- DROP TRIGGER IF EXISTS trigger_checkin_sessions_updated_at ON checkin_sessions;
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP TABLE IF EXISTS checkin_sessions CASCADE;
```

---

## 12. チェックリスト

### 実装前チェック
- [ ] SSOT を全て読み、理解した
- [ ] データモデルとAPIの整合性を確認した
- [ ] マルチテナント対応（tenant_id）を確認した
- [ ] セキュリティ要件を理解した

### 実装中チェック
- [ ] 命名規約に従っている（DB: snake_case, API: camelCase）
- [ ] バリデーションをサーバー側で実装した
- [ ] エラーハンドリングを実装した
- [ ] traceId を全レスポンスに付与した
- [ ] 監査ログを記録している

### 実装後チェック
- [ ] テストが全て通過した（正常系・異常系・境界値）
- [ ] マイグレーションが成功した
- [ ] ロールバックスクリプトをテストした
- [ ] API ドキュメント（OpenAPI）を更新した
- [ ] 型定義（types/shared.ts）を更新した
- [ ] パフォーマンステストを実施した（P95 < 目標値）

---

## 付録A: Prisma スキーマ

```prisma
// This is your Prisma schema file for checkin_sessions
// SSOT: docs/SSOT_CHECKIN_SESSIONS.md

model CheckinSession {
  id         String    @id @default(cuid()) // ULID in production
  tenantId   String    @map("tenant_id")
  roomId     Int       @map("room_id")
  deviceId   String    @map("device_id") @db.VarChar(255)
  status     SessionStatus @default(active)
  expiresAt  DateTime  @map("expires_at") @db.Timestamptz(6)
  metadata   Json?
  createdAt  DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt  DateTime  @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt  DateTime? @map("deleted_at") @db.Timestamptz(6)

  // Relations
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  room   Room   @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([roomId])
  @@index([deviceId])
  @@index([status])
  @@index([expiresAt])
  @@index([tenantId, roomId, status], name: "idx_tenant_room_status")
  @@unique([tenantId, roomId], name: "idx_unique_active_room", where: { status: active, deletedAt: null })
  @@map("checkin_sessions")
}

enum SessionStatus {
  active
  expired
  terminated
}
```

---

## 付録B: OpenAPI 3.1 仕様

```yaml
openapi: 3.1.0
info:
  title: Checkin Sessions API
  version: 1.0.0
  description: チェックインセッション管理API
servers:
  - url: https://api.hotel-kanri.com/api/v1
    description: 本番環境
  - url: https://api-staging.hotel-kanri.com/api/v1
    description: ステージング環境

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    
  schemas:
    CheckinSession:
      type: object
      required:
        - sessionId
        - tenantId
        - roomId
        - deviceId
        - status
        - expiresAt
        - createdAt
      properties:
        sessionId:
          type: string
          pattern: '^01[0-9A-Z]{24}$'
          example: '01JBQX7K4M6N8P9Q0R1S2T3U4V'
        tenantId:
          type: string
          pattern: '^01[0-9A-Z]{24}$'
          example: '01JBQW1A2B3C4D5E6F7G8H9J0K'
        roomId:
          type: integer
          minimum: 1
          example: 101
        deviceId:
          type: string
          minLength: 1
          maxLength: 255
          example: 'device-tablet-101-abc123'
        status:
          type: string
          enum: [active, expired, terminated]
          example: 'active'
        expiresAt:
          type: string
          format: date-time
          example: '2025-10-01T15:00:00Z'
        metadata:
          type: object
          additionalProperties: true
          nullable: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    
    CreateSessionRequest:
      type: object
      required:
        - roomId
        - deviceId
      properties:
        roomId:
          type: integer
          minimum: 1
        deviceId:
          type: string
          minLength: 1
          maxLength: 255
        expiresIn:
          type: integer
          minimum: 60
          maximum: 86400
          default: 3600
    
    ErrorResponse:
      type: object
      required:
        - error
        - traceId
      properties:
        error:
          type: object
          required:
            - code
            - message
          properties:
            code:
              type: string
              example: 'SESSION_EXPIRED'
            message:
              type: string
              example: 'セッションの有効期限が切れています'
            details:
              type: object
              additionalProperties: true
        traceId:
          type: string
          pattern: '^01[0-9A-Z]{24}$'

security:
  - bearerAuth: []

paths:
  /checkin/sessions:
    post:
      summary: セッション作成
      operationId: createCheckinSession
      tags:
        - Checkin Sessions
      parameters:
        - name: X-Tenant-ID
          in: header
          required: true
          schema:
            type: string
            pattern: '^01[0-9A-Z]{24}$'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateSessionRequest'
      responses:
        '200':
          description: セッション作成成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    $ref: '#/components/schemas/CheckinSession'
                  traceId:
                    type: string
        '400':
          description: バリデーションエラー
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'
        '401':
          description: 認証エラー
        '409':
          description: セッション重複
    
    get:
      summary: セッション一覧取得
      operationId: listCheckinSessions
      tags:
        - Checkin Sessions
      security:
        - bearerAuth: []
      parameters:
        - name: X-Tenant-ID
          in: header
          required: true
          schema:
            type: string
        - name: status
          in: query
          schema:
            type: string
            enum: [active, expired, terminated, all]
            default: active
        - name: roomId
          in: query
          schema:
            type: integer
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 50
      responses:
        '200':
          description: セッション一覧
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: object
                    properties:
                      items:
                        type: array
                        items:
                          $ref: '#/components/schemas/CheckinSession'
                      pagination:
                        type: object
                        properties:
                          page:
                            type: integer
                          limit:
                            type: integer
                          total:
                            type: integer
                          totalPages:
                            type: integer
                  traceId:
                    type: string
  
  /checkin/sessions/{sessionId}/validate:
    get:
      summary: セッション検証
      operationId: validateCheckinSession
      tags:
        - Checkin Sessions
      parameters:
        - name: X-Tenant-ID
          in: header
          required: true
          schema:
            type: string
        - name: sessionId
          in: path
          required: true
          schema:
            type: string
            pattern: '^01[0-9A-Z]{24}$'
      responses:
        '200':
          description: セッション有効
        '404':
          description: セッションが存在しない
        '410':
          description: セッション期限切れ/終了済み
```

---

## 変更履歴

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-10-01 | 初版作成 | hotel-kanri統合プロジェクト |

---

**このドキュメントは hotel-kanri プロジェクトにおける checkin_sessions 機能の唯一の真実（SSOT）です。**  
**すべての実装・テスト・ドキュメントはこのSSOTに基づいて作成されます。**

