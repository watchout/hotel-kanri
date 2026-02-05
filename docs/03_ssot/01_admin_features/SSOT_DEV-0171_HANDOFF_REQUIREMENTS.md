# SSOT_DEV-0171_HANDOFF_REQUIREMENTS.md

**バージョン**: 1.0.0  
**最終更新**: 2026-01-25  
**ドキュメントID**: SSOT-DEV-0171-001  
**ステータス**: ✅ 確定  

---

## 📋 概要

### 目的とスコープ

[COM-246] ハンドオフ機能の要件整理・運用フロー策定・SSOT整合性チェックを完了し、以下の実装準備を整える。
- **対象システム**: hotel-common（API）、hotel-saas（ゲスト/管理UI）
- **主要成果物**:
  1. **SSOT_GUEST_AI_HANDOFF.md**: ゲスト側ハンドオフ機能仕様。ゲストがAIチャットからスタッフへのハンドオフを要求する際の仕様を詳細に記述。
  2. **SSOT_ADMIN_HANDOFF_NOTIFICATION.md**: スタッフ側通知機能仕様。スタッフがハンドオフリクエストを受け取る際の通知方法とその仕様を記述。
  3. **SSOT__SSOT.md**: 整合性チェック報告書 + 実装ガイド。全体の整合性を確認し、実装に必要なガイドラインを提供。
- **タスクID**: DEV-0171
- **関連タスク**:
  - DEV-0172: 通知チャネル＆ハンドオフAPI実装
  - DEV-0173: UI実装（通知→電話CTA導線）
  - DEV-0174: ハンドオフ機能テストとEvidence整備

### 関連SSOT

| ドキュメント | バージョン | パス | 説明 |
|:------------|:----------|:-----|:-----|
| SSOT_GUEST_AI_HANDOFF.md | v1.1.0 | `/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_GUEST_AI_HANDOFF.md` | ゲスト側ハンドオフ機能仕様 |
| SSOT_ADMIN_HANDOFF_NOTIFICATION.md | v1.0.0 | `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_HANDOFF_NOTIFICATION.md` | スタッフ側通知機能仕様 |
| SSOT_SAAS_DEVICE_AUTHENTICATION.md | - | `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md` | ゲストデバイス認証 |
| SSOT_SAAS_ADMIN_AUTHENTICATION.md | - | `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md` | スタッフSession認証 |
| SSOT_SAAS_MULTITENANT.md | - | `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md` | マルチテナント設計 |
| SSOT_API_REGISTRY.md | - | `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_API_REGISTRY.md` | APIエンドポイント一元管理 |
| SSOT__SSOT.md | - | `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT__SSOT.md` | SSOT整合性チェック報告書 |

---

## 🎯 要件ID一覧

### 機能要件（HDF-REQ）

| ID | 説明 | 優先度 | 担当タスク |
|:---|:-----|:-------|:-----------|
| HDF-REQ-001 | SSOT整合性チェック実施 | 🔴 必須 | DEV-0171 |
| HDF-REQ-002 | ゲスト側ハンドオフ機能仕様策定 | 🔴 必須 | DEV-0171 |
| HDF-REQ-003 | スタッフ側通知機能仕様策定 | 🔴 必須 | DEV-0171 |
| HDF-REQ-004 | データベース設計（handoff_requests） | 🔴 必須 | DEV-0171 |
| HDF-REQ-005 | API設計（ゲスト/スタッフ） | 🔴 必須 | DEV-0171 |
| HDF-REQ-006 | UI/UX設計（ゲスト/スタッフ） | 🔴 必須 | DEV-0171 |
| HDF-REQ-007 | 実装ガイド作成 | 🔴 必須 | DEV-0171 |
| HDF-REQ-008 | Accept条件定義 | 🔴 必須 | DEV-0171 |

### 非機能要件（HDF-REQ-NFR）

| ID | 説明 | 優先度 |
|:---|:-----|:-------|
| HDF-REQ-NFR-001 | データベース命名規則準拠（snake_case） | 🔴 必須 |
| HDF-REQ-NFR-002 | APIパス設計準拠（/api/v1/{guest\|admin}） | 🔴 必須 |
| HDF-REQ-NFR-003 | マルチテナント分離（tenant_id必須） | 🔴 必須 |
| HDF-REQ-NFR-004 | 認証方式準拠（デバイス/Session） | 🔴 必須 |
| HDF-REQ-NFR-005 | Marketing Injection対応 | 🔴 必須 |
| HDF-REQ-NFR-006 | Analytics追跡（Tracking by Default） | 🔴 必須 |

---

## 🗄️ データベース設計

### テーブル定義

#### handoff_requests（ハンドオフリクエスト）

```prisma
model HandoffRequest {
  id              String           @id @default(cuid()) @map("id")
  tenantId        String           @map("tenant_id")
  sessionId       String           @map("session_id")
  roomId          String           @map("room_id")
  channel         String           @default("front_desk") @map("channel")
  status          HandoffStatus    @default(PENDING) @map("status")
  context         Json             @map("context")
  staffId         String?          @map("staff_id")
  createdAt       DateTime         @default(now()) @map("created_at")
  acceptedAt      DateTime?        @map("accepted_at")
  completedAt     DateTime?        @map("completed_at")
  timeoutAt       DateTime         @map("timeout_at")
  notes           String?          @map("notes")

  // Relations
  tenant          Tenant           @relation(fields: [tenantId], references: [id])
  staff           Staff?           @relation(fields: [staffId], references: [id])

  @@map("handoff_requests")
  @@index([tenantId], map: "idx_handoff_requests_tenant")
  @@index([status, createdAt], map: "idx_handoff_requests_status_created")
  @@index([roomId], map: "idx_handoff_requests_room")
  @@index([staffId], map: "idx_handoff_requests_staff")
  @@index([tenantId, status], map: "idx_handoff_requests_tenant_status")
}

enum HandoffStatus {
  PENDING     // 待機中
  ACCEPTED    // スタッフが対応開始
  COMPLETED   // 対応完了
  TIMEOUT     // タイムアウト
  CANCELLED   // キャンセル

  @@map("handoff_status")
}
```

#### handoff_notification_logs（通知ログ）

```prisma
model HandoffNotificationLog {
  id              String           @id @default(cuid()) @map("id")
  tenantId        String           @map("tenant_id")
  handoffId       String           @map("handoff_id")
  channel         NotificationChannel @map("channel")
  status          String           @map("status")  // "sent", "delivered", "failed"
  sentAt          DateTime         @default(now()) @map("sent_at")
  deliveredAt     DateTime?        @map("delivered_at")
  errorMessage    String?          @map("error_message")

  // Relations
  tenant          Tenant           @relation(fields: [tenantId], references: [id])
  handoffRequest  HandoffRequest   @relation(fields: [handoffId], references: [id])

  @@map("handoff_notification_logs")
  @@index([tenantId], map: "idx_handoff_notification_logs_tenant")
  @@index([handoffId], map: "idx_handoff_notification_logs_handoff")
  @@index([sentAt], map: "idx_handoff_notification_logs_sent_at")
}

enum NotificationChannel {
  WEBSOCKET    // WebSocket（リアルタイム）
  POLLING      // ポーリング（フォールバック）
  EMAIL        // メール（Phase 3）
  SMS          // SMS（Phase 3）

  @@map("notification_channel")
}
```

### データベース命名規則チェックリスト

- [x] テーブル名: snake_case + 複数形
- [x] カラム名: snake_case
- [x] Prismaモデル: PascalCase
- [x] `@map` 使用（全カラム）
- [x] `@@map` 使用（テーブル名）
- [x] `tenant_id` 必須
- [x] `@default(cuid())` でID生成

### contextフィールドの構造
```json
{
  "device_info": {
    "type": "string", // デバイスタイプ（例: "tablet"）
    "os": "string"    // OS情報（例: "iOS 17"）
  },
  "location": {
    "room_id": "string", // 部屋ID（例: "R001"）
    "floor": "string"    // 階情報（例: "3F"）
  },
  "conversation_history": [
    {
      "role": "string",    // 役割（例: "user"）
      "content": "string", // メッセージ内容
      "timestamp": "string" // タイムスタンプ（ISO 8601形式）
    }
  ]
}
```

---

## 🔌 API設計

### エンドポイント一覧

#### ゲスト向けAPI（デバイス認証）

| Method | Path | 説明 | 認証 |
|:-------|:-----|:-----|:-----|
| POST | `/api/v1/guest/handoff/requests` | ハンドオフリクエスト作成 | デバイス認証 |
| GET | `/api/v1/guest/handoff/requests/:id` | 自分のリクエスト詳細取得 | デバイス認証 |

#### スタッフ向けAPI（Session認証）

| Method | Path | 説明 | 認証 |
|:-------|:-----|:-----|:-----|
| GET | `/api/v1/admin/handoff/requests` | リクエスト一覧取得 | Session認証 |
| GET | `/api/v1/admin/handoff/requests/:id` | リクエスト詳細取得 | Session認証 |
| PATCH | `/api/v1/admin/handoff/requests/:id/status` | ステータス更新 | Session認証 |

### APIパス設計チェックリスト

- [x] `/api/v1/{guest|admin}` 形式
- [x] フラット構造（動的パラメータ1階層のみ）
- [x] `index.*` ファイル不使用
- [x] 深いネスト回避

### OpenAPI 3.0 スキーマ定義

```yaml
openapi: 3.0.0
info:
  title: Handoff API
  version: 1.0.0
  description: ハンドオフ機能API

paths:
  /api/v1/guest/handoff/requests:
    post:
      summary: ハンドオフリクエスト作成
      tags:
        - Guest Handoff
      security:
        - DeviceAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - sessionId
                - channel
                - context
              properties:
                sessionId:
                  type: string
                  description: AIチャットセッションID
                  example: "chat_session_123"
                channel:
                  type: string
                  enum: [front_desk, concierge]
                  description: ハンドオフ先チャネル
                  example: "front_desk"
                context:
                  type: object
                  description: チャット履歴とコンテキスト
                  properties:
                    lastMessages:
                      type: array
                      items:
                        type: object
                        properties:
                          role:
                            type: string
                            enum: [user, assistant]
                          content:
                            type: string
                          timestamp:
                            type: string
                            format: date-time
                    currentTopic:
                      type: string
      responses:
        '201':
          description: リクエスト作成成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                    example: true
                  data:
                    type: object
                    properties:
                      id:
                        type: string
                        example: "handoff_789"
                      status:
                        type: string
                        enum: [PENDING, ACCEPTED, COMPLETED, TIMEOUT, CANCELLED]
                        example: "PENDING"
                      createdAt:
                        type: string
                        format: date-time
                      estimatedWaitTime:
                        type: integer
                        description: 推定待ち時間（秒）
                        example: 60
                      fallbackPhoneNumber:
                        type: string
                        example: "内線100"
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '500':
          $ref: '#/components/responses/InternalServerError'

  /api/v1/guest/handoff/requests/{id}:
    get:
      summary: 自分のリクエスト詳細取得
      tags:
        - Guest Handoff
      security:
        - DeviceAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
          description: ハンドオフリクエストID
      responses:
        '200':
          description: 取得成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/HandoffRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/admin/handoff/requests:
    get:
      summary: リクエスト一覧取得
      tags:
        - Admin Handoff
      security:
        - SessionAuth: []
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [PENDING, ACCEPTED, COMPLETED, TIMEOUT, CANCELLED]
        - name: roomId
          in: query
          schema:
            type: string
        - name: staffId
          in: query
          schema:
            type: string
        - name: fromDate
          in: query
          schema:
            type: string
            format: date-time
        - name: toDate
          in: query
          schema:
            type: string
            format: date-time
        - name: limit
          in: query
          schema:
            type: integer
            default: 50
            minimum: 1
            maximum: 100
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
            minimum: 0
      responses:
        '200':
          description: 取得成功
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
                      requests:
                        type: array
                        items:
                          $ref: '#/components/schemas/HandoffRequest'
                      total:
                        type: integer
                      limit:
                        type: integer
                      offset:
                        type: integer
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'

  /api/v1/admin/handoff/requests/{id}:
    get:
      summary: リクエスト詳細取得
      tags:
        - Admin Handoff
      security:
        - SessionAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: 取得成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/HandoffRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'

  /api/v1/admin/handoff/requests/{id}/status:
    patch:
      summary: ステータス更新
      tags:
        - Admin Handoff
      security:
        - SessionAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - status
              properties:
                status:
                  type: string
                  enum: [ACCEPTED, COMPLETED, CANCELLED]
                notes:
                  type: string
      responses:
        '200':
          description: 更新成功
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    $ref: '#/components/schemas/HandoffRequest'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '404':
          $ref: '#/components/responses/NotFound'
        '422':
          $ref: '#/components/responses/UnprocessableEntity'

components:
  schemas:
    HandoffRequest:
      type: object
      properties:
        id:
          type: string
        tenantId:
          type: string
        sessionId:
          type: string
        roomId:
          type: string
        channel:
          type: string
          enum: [front_desk, concierge]
        status:
          type: string
          enum: [PENDING, ACCEPTED, COMPLETED, TIMEOUT, CANCELLED]
        context:
          type: object
        staffId:
          type: string
          nullable: true
        createdAt:
          type: string
          format: date-time
        acceptedAt:
          type: string
          format: date-time
          nullable: true
        completedAt:
          type: string
          format: date-time
          nullable: true
        timeoutAt:
          type: string
          format: date-time
        notes:
          type: string
          nullable: true

  responses:
    BadRequest:
      description: バリデーションエラー
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                type: object
                properties:
                  code:
                    type: string
                    example: "VALIDATION_ERROR"
                  message:
                    type: string
                    example: "入力内容に誤りがあります"
                  details:
                    type: object

    Unauthorized:
      description: 認証エラー
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                type: object
                properties:
                  code:
                    type: string
                    example: "UNAUTHORIZED"
                  message:
                    type: string
                    example: "認証が必要です"
                  details:
                    type: string

    Forbidden:
      description: 権限不足エラー
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                type: object
                properties:
                  code:
                    type: string
                    example: "FORBIDDEN"
                  message:
                    type: string
                    example: "アクセス権限がありません"
                  details:
                    type: string

    NotFound:
      description: リソース不在エラー
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                type: object
                properties:
                  code:
                    type: string
                    example: "NOT_FOUND"
                  message:
                    type: string
                    example: "リソースが見つかりません"
                  details:
                    type: string

    UnprocessableEntity:
      description: ビジネスロジックエラー
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                type: object
                properties:
                  code:
                    type: string
                    example: "INVALID_STATUS_TRANSITION"
                  message:
                    type: string
                    example: "このステータスへの変更はできません"
                  details:
                    type: string

    InternalServerError:
      description: サーバーエラー
      content:
        application/json:
          schema:
            type: object
            properties:
              success:
                type: boolean
                example: false
              error:
                type: object
                properties:
                  code:
                    type: string
                    example: "INTERNAL_SERVER_ERROR"
                  message:
                    type: string
                    example: "サーバーエラーが発生しました"
                  details:
                    type: string

  securitySchemes:
    DeviceAuth:
      type: apiKey
      in: cookie
      name: device_session
      description: デバイス認証Cookie

    SessionAuth:
      type: apiKey
      in: cookie
      name: connect.sid
      description: スタッフセッションCookie（HttpOnly）
```

### リクエスト/レスポンス例

#### POST /api/v1/guest/handoff/requests

**Request**:
```json
{
  "sessionId": "chat_session_123",
  "channel": "front_desk",
  "context": {
    "lastMessages": [{
      "role": "user",
      "content": "予約の変更をしたい",
      "timestamp": "2026-01-24T10:00:00Z"
    }],
    "currentTopic": "reservation_change"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "handoff_789",
    "status": "pending",
    "createdAt": "2026-01-24T10:00:30Z",
    "estimatedWaitTime": 60,
    "fallbackPhoneNumber": "内線100"
  }
}
```

#### GET /api/v1/admin/handoff/requests

**Query Parameters**:
```typescript
interface GetHandoffRequestsQuery {
  status?: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'TIMEOUT' | 'CANCELLED'
  roomId?: string
  staffId?: string
  fromDate?: string  // ISO 8601
  toDate?: string    // ISO 8601
  limit?: number     // default: 50
  offset?: number    // default: 0
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "handoff_789",
        "tenantId": "tenant_123",
        "sessionId": "chat_session_456",
        "roomId": "room_101",
        "channel": "front_desk",
        "status": "PENDING",
        "context": {
          "lastMessages": [...],
          "currentTopic": "reservation_change",
          "guestInfo": {
            "roomNumber": "101",
            "guestName": "山田太郎"
          }
        },
        "staffId": null,
        "createdAt": "2026-01-24T10:00:30Z",
        "acceptedAt": null,
        "completedAt": null,
        "timeoutAt": "2026-01-24T10:01:30Z",
        "notes": null
      }
    ],
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

#### PATCH /api/v1/admin/handoff/requests/:id/status

**Request**:
```json
{
  "status": "ACCEPTED",
  "notes": "予約変更対応を開始します"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "handoff_789",
    "status": "ACCEPTED",
    "acceptedAt": "2026-01-24T10:00:45Z",
    "staffId": "staff_456",
    "notes": "予約変更対応を開始します"
  }
}
```

**ステータス遷移ルール**:
```
PENDING → ACCEPTED | CANCELLED | TIMEOUT
ACCEPTED → COMPLETED | CANCELLED
TIMEOUT → (変更不可)
COMPLETED → (変更不可)
CANCELLED → (変更不可)
```

### エラー処理

全APIエンドポイントは以下のエラーケースを適切に処理すること：

#### 認証エラー（401 Unauthorized）

**発生条件**:
- セッションが存在しない
- セッションの有効期限が切れている
- デバイス認証トークンが無効

**レスポンス例**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です",
    "details": "セッションが無効または期限切れです"
  }
}
```

**クライアント対応**:
- ゲスト: ログイン画面へリダイレクト
- スタッフ: ログイン画面へリダイレクト

#### 権限不足エラー（403 Forbidden）

**発生条件**:
- 他のテナントのリソースへアクセス
- 権限のないAPIエンドポイントへアクセス
- スタッフ権限が不足している場合

**レスポンス例**:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "アクセス権限がありません",
    "details": "このリソースへのアクセスは許可されていません"
  }
}
```

**クライアント対応**:
- エラーメッセージを表示
- ダッシュボードへリダイレクト

#### リソース不在エラー（404 Not Found）

**発生条件**:
- 指定されたIDのリソースが存在しない
- 他のテナントのリソースを要求（列挙耐性）
- 削除済みのリソースへアクセス

**レスポンス例**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "リソースが見つかりません",
    "details": "指定されたハンドオフリクエストは存在しません"
  }
}
```

**クライアント対応**:
- エラーメッセージを表示
- 一覧画面へリダイレクト

**重要**: セキュリティ上、他テナントのリソースアクセスは必ず404を返すこと（403ではない）。これにより、リソースの存在を推測される列挙攻撃を防ぐ。

#### バリデーションエラー（400 Bad Request）

**発生条件**:
- 必須パラメータが不足
- パラメータの型が不正
- パラメータの値が範囲外

**レスポンス例**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": {
      "sessionId": "sessionIdは必須です",
      "channel": "channelは'front_desk'または'concierge'である必要があります"
    }
  }
}
```

**クライアント対応**:
- フォームのバリデーションエラーを表示
- ユーザーに修正を促す

#### ビジネスロジックエラー（422 Unprocessable Entity）

**発生条件**:
- ステータス遷移ルール違反
- タイムアウト後の操作
- 重複リクエスト

**レスポンス例**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "このステータスへの変更はできません",
    "details": "COMPLETED状態のリクエストは変更できません"
  }
}
```

**クライアント対応**:
- エラーメッセージを表示
- 画面をリフレッシュ

#### サーバーエラー（500 Internal Server Error）

**発生条件**:
- データベース接続エラー
- 予期しない例外
- 外部APIタイムアウト

**レスポンス例**:
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "サーバーエラーが発生しました",
    "details": "しばらくしてから再度お試しください"
  }
}
```

**クライアント対応**:
- エラーメッセージを表示
- リトライボタンを表示
- フォールバック（電話CTA）へ誘導

#### タイムアウトエラー（408 Request Timeout）

**発生条件**:
- APIリクエストが30秒以上応答なし
- データベースクエリタイムアウト

**レスポンス例**:
```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT",
    "message": "リクエストがタイムアウトしました",
    "details": "もう一度お試しください"
  }
}
```

**クライアント対応**:
- エラーメッセージを表示
- 自動リトライ（最大3回）
- フォールバック（電話CTA）へ誘導

---

## テストケース

### 正常系
| ID | シナリオ | 入力 | 期待結果 |
|:---|:---------|:-----|:---------|
| TC-001 | ハンドオフ作成成功 | room_id: "R001", message: "Help" | 201, handoff_id返却 |
| TC-002 | ハンドオフ一覧取得 | tenant_id: "T001" | 200, 配列返却 |
| TC-003 | ステータス更新 | handoff_id: "H001", status: "resolved" | 200, 更新完了 |

### 異常系
| ID | シナリオ | 入力 | 期待結果 |
|:---|:---------|:-----|:---------|
| TC-101 | room_id未指定 | message: "Help" | 400, INVALID_REQUEST |
| TC-102 | 認証なし | (セッションなし) | 401, UNAUTHORIZED |
| TC-103 | 他テナントアクセス | handoff_id: "他テナント" | 404, NOT_FOUND |
| TC-104 | 存在しないID | handoff_id: "XXX" | 404, NOT_FOUND |
| TC-105 | 権限不足 | handoff_id: "H002" | 403, FORBIDDEN |

### エッジケース
| ID | シナリオ | 入力 | 期待結果 |
|:---|:---------|:-----|:---------|
| TC-201 | 長文メッセージ | message: "1000文字..." | 201 または 400 |
| TC-202 | 同時リクエスト | 2件同時作成 | 両方成功 |
| TC-203 | 大量リクエスト | 1000件同時作成 | サーバーが耐えられる |

---

## 🎨 UI設計

### ゲスト側画面一覧（hotel-saas）

| 画面名 | パス | 説明 |
|:-------|:-----|:-----|
| AIチャット（ハンドオフボタン付き） | `/guest/chat` | AI対応困難時にハンドオフ提案 |
| 待機状態画面 | - | 60秒カウントダウン表示 |
| 電話CTA画面 | - | タイムアウト時、内線番号強調表示 |
| エラー時フォールバック画面 | - | API障害時、即座に電話CTA表示 |

### スタッフ側画面一覧（hotel-saas）

| 画面名 | パス | 説明 |
|:-------|:-----|:-----|
| ハンドオフ管理画面 | `/admin/handoff` | リクエスト一覧とステータス管理 |
| ハンドオフ詳細モーダル | - | リクエスト詳細表示と操作 |
| 通知ポップアップ（Phase 2） | - | 新規リクエスト通知 |

### UI/UX要件

#### HDF-UX-001: カウントダウン表示

- 60秒のカウントダウンタイマー
- 残り10秒以下で赤色強調表示
- タイムアウト時に自動的に電話CTAへ遷移

#### HDF-UX-002: 電話CTA

- 内線番号を24px以上のフォントサイズで強調表示