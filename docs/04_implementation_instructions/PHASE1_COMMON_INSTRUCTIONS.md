# Phase 1: hotel-common-rebuild 連続実行指示

**生成日**: 2026-02-05
**対象ブランチ**: 新規ブランチを作成して実装
**実行モード**: 連続実行（1タスク完了 → 次タスクへ自動進行）

---

## 実行ルール

### TDD強制
- **テスト先行**: 各機能の実装前に必ずテストを書く
- テストファイル: `tests/` ディレクトリに配置
- テスト実行: `npm test` (GitHub ActionsでPostgreSQL + Redis付きで自動実行)

### 停止条件（以下のいずれかに該当したら即座に停止して報告）
1. **CORE/CONTRACT層の不明点**: 仕様が曖昧で判断できない
2. **矛盾の検出**: SSOT内または既存コードとの矛盾
3. **破壊的変更**: 既存APIの互換性を壊す変更が必要
4. **セキュリティ懸念**: 認証・認可・データ漏洩リスク
5. **マルチテナント違反**: tenant_idフィルタの欠如

### 進行ルール
- DETAIL層の判断は自律的に進む（相談不要）
- 各タスク完了時にコミット
- 全タスク完了後にプッシュ

---

## タスク1: DEV-0181 - 客室端末セッションリセット（API側）

### 1.1 概要
管理画面とQRコードから客室端末のセッションをリセットする機能のAPI実装。

### 1.2 データベース設計（Prisma）

```prisma
// prisma/schema.prisma に追加

model device_reset_tokens {
  id           String    @id @default(uuid())
  tenantId     String    @map("tenant_id")
  deviceId     String    @map("device_id")
  roomId       String    @map("room_id")
  token        String    @unique
  tokenHash    String    @map("token_hash")
  expiresAt    DateTime  @map("expires_at")
  isUsed       Boolean   @default(false) @map("is_used")
  usedAt       DateTime? @map("used_at")
  usedBy       String?   @map("used_by")
  createdBy    String    @map("created_by")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@unique([tenantId, deviceId, token])
  @@index([tenantId])
  @@index([deviceId])
  @@index([token])
  @@index([expiresAt])
  @@index([isUsed])
  @@map("device_reset_tokens")
}

model device_reset_logs {
  id               String    @id @default(uuid())
  tenantId         String    @map("tenant_id")
  deviceId         String    @map("device_id")
  roomId           String    @map("room_id")
  resetMethod      String    @map("reset_method")  // 'admin_panel' | 'qr_code'
  executedBy       String    @map("executed_by")
  executedByName   String?   @map("executed_by_name")
  tokenId          String?   @map("token_id")
  status           String    // 'success' | 'failed'
  errorMessage     String?   @map("error_message")
  executedAt       DateTime  @default(now()) @map("executed_at")

  @@index([tenantId])
  @@index([deviceId])
  @@index([executedAt])
  @@index([resetMethod])
  @@index([status])
  @@map("device_reset_logs")
}
```

### 1.3 API実装

#### API 1-1: デバイスリセット（管理画面用）
- **Path**: `POST /api/v1/admin/devices/:deviceId/reset`
- **認証**: Session認証 + 権限 `device:reset`
- **処理**:
  1. deviceId存在確認（tenant_idフィルタ必須）
  2. WebSocketでDEVICE_RESETイベント配信
  3. device_reset_logsにログ記録
- **レスポンス**:
```json
{
  "success": true,
  "data": {
    "deviceId": "uuid",
    "roomId": "101",
    "resetMethod": "admin_panel",
    "executedBy": "staff-uuid",
    "executedAt": "2026-01-24T10:30:00Z",
    "logId": "log-uuid"
  }
}
```

#### API 1-2: リセットトークン生成
- **Path**: `POST /api/v1/admin/devices/:deviceId/reset-token`
- **認証**: Session認証 + 権限 `device:generate-reset-token`
- **処理**:
  1. JWT生成（有効期限15分、payload: tenantId, deviceId, roomId）
  2. SHA-256ハッシュをDBに保存
  3. QRコードURL生成
- **レスポンス**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "tokenId": "token-uuid",
    "deviceId": "device-uuid",
    "roomId": "101",
    "expiresAt": "2026-01-24T10:45:00Z",
    "qrCodeUrl": "https://hotel-saas/device-reset?token=..."
  }
}
```

#### API 1-3: トークン検証＋リセット実行
- **Path**: `POST /api/v1/devices/reset-by-token`
- **認証**: トークンベース（JWT検証）
- **処理**:
  1. JWT検証（署名、有効期限）
  2. DB照合（未使用、tenant_id一致）
  3. WebSocketでDEVICE_RESETイベント配信
  4. トークンを使用済みに更新
  5. ログ記録
- **エラーコード**: `TOKEN_EXPIRED`, `INVALID_TOKEN`, `TOKEN_ALREADY_USED`

#### API 1-4: リセットログ一覧
- **Path**: `GET /api/v1/admin/devices/reset-logs`
- **認証**: Session認証 + 権限 `device:view-logs`
- **クエリ**: page, limit, roomId, resetMethod, from, to
- **レスポンス**: ページネーション付きログ一覧

### 1.4 WebSocketイベント

```typescript
// DEVICE_RESET イベント
{
  event: 'DEVICE_RESET',
  data: {
    deviceId: string,
    roomId: string,
    resetMethod: 'admin_panel' | 'qr_code',
    executedBy: string,
    executedAt: string
  }
}
```

### 1.5 実装ファイル一覧

```
src/
├── services/device/
│   ├── device-reset-token.service.ts  # トークン生成・検証
│   └── device-reset.service.ts        # リセット処理・ログ記録
└── routes/api/v1/
    ├── admin/devices/
    │   ├── [deviceId]/
    │   │   ├── reset.post.ts         # 管理画面リセット
    │   │   └── reset-token.post.ts   # トークン生成
    │   └── reset-logs.get.ts         # ログ一覧
    └── devices/
        └── reset-by-token.post.ts    # QRコードリセット
```

### 1.6 テスト要件

```typescript
// tests/device-reset.test.ts
describe('Device Reset API', () => {
  describe('POST /api/v1/admin/devices/:deviceId/reset', () => {
    it('should reset device with valid permission')
    it('should reject without device:reset permission')
    it('should return 404 for non-existent device')
    it('should filter by tenant_id')
  })

  describe('POST /api/v1/admin/devices/:deviceId/reset-token', () => {
    it('should generate valid JWT token')
    it('should set 15-minute expiry')
    it('should store token hash in DB')
  })

  describe('POST /api/v1/devices/reset-by-token', () => {
    it('should validate and execute reset')
    it('should reject expired token')
    it('should reject used token')
    it('should mark token as used after success')
  })
})
```

---

## タスク2: DEV-0210 - 必須ログ3イベント

### 2.1 概要
ANSWER_SHOWN, LINK_CLICK, HANDOFF_TRIGGERED の3イベントを記録するログ基盤。

### 2.2 データベース設計

```prisma
// prisma/schema.prisma に追加

model EventLog {
  id          String   @id @default(cuid()) @map("id")
  tenantId    String   @map("tenant_id")
  eventType   String   @map("event_type")  // 'ANSWER_SHOWN' | 'LINK_CLICK' | 'HANDOFF_TRIGGERED'
  sessionId   String?  @map("session_id")
  roomId      String?  @map("room_id")
  metadata    Json     @map("metadata")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([tenantId, eventType, createdAt], map: "idx_event_logs_tenant_type_date")
  @@index([sessionId], map: "idx_event_logs_session")
  @@map("event_logs")
}
```

### 2.3 API実装

#### API 2-1: イベントログ記録（内部用）
- **Path**: `POST /api/v1/internal/logs/events`
- **認証**: 内部認証（X-Internal-Key）
- **リクエスト**:
```json
{
  "eventType": "ANSWER_SHOWN",
  "sessionId": "chat_session_123",
  "roomId": "room-001",
  "metadata": {
    "questionText": "WiFiのパスワードは？",
    "answerId": "faq_wifi_001",
    "answerCategory": "facility"
  }
}
```
- **処理**: ログをDBに保存（非同期可、100ms以内）

#### API 2-2: イベントログ一覧取得
- **Path**: `GET /api/v1/admin/logs/events`
- **認証**: Session認証
- **クエリ**: page, limit, eventType, from, to, sessionId

#### API 2-3: ログサマリー取得
- **Path**: `GET /api/v1/admin/logs/summary`
- **認証**: Session認証
- **レスポンス**:
```json
{
  "success": true,
  "data": {
    "period": "2026-01-23",
    "summary": {
      "ANSWER_SHOWN": 150,
      "LINK_CLICK": 45,
      "HANDOFF_TRIGGERED": 8
    },
    "conversionRate": {
      "answerToClick": 0.30,
      "answerToHandoff": 0.053
    }
  }
}
```

### 2.4 実装ファイル一覧

```
src/
├── services/logging/
│   └── event-log.service.ts          # ログ記録・取得
└── routes/api/v1/
    ├── internal/logs/
    │   └── events.post.ts            # イベント記録
    └── admin/logs/
        ├── events.get.ts             # ログ一覧
        └── summary.get.ts            # サマリー
```

### 2.5 テスト要件

```typescript
// tests/event-log.test.ts
describe('Event Log API', () => {
  describe('POST /api/v1/internal/logs/events', () => {
    it('should record ANSWER_SHOWN event')
    it('should record LINK_CLICK event')
    it('should record HANDOFF_TRIGGERED event')
    it('should complete within 100ms')
  })

  describe('GET /api/v1/admin/logs/summary', () => {
    it('should return event counts')
    it('should calculate conversion rates')
  })
})
```

---

## タスク3: DEV-0190 - DND/頻度制御

### 3.1 概要
夜間Quietモード（23:00-07:00通知停止）と通常時間帯の頻度制御（最大2回）。

### 3.2 データベース設計

```prisma
// device_rooms テーブルに追加フィールド
model DeviceRoom {
  // ... 既存フィールド

  dndEnabled       Boolean   @default(false) @map("dnd_enabled")
  notificationCount Int      @default(0) @map("notification_count")
  lastNotificationAt DateTime? @map("last_notification_at")
}
```

### 3.3 tenant_settings シード

```typescript
// category: 'dnd'
// keys:
// - quiet_mode_start: "23:00"
// - quiet_mode_end: "07:00"
// - max_notifications_per_session: 2
// - default_dnd_enabled: false
```

### 3.4 API実装

#### API 3-1: DND状態取得
- **Path**: `GET /api/v1/guest/dnd/status`
- **認証**: デバイス認証
- **レスポンス**:
```json
{
  "success": true,
  "data": {
    "isQuietMode": true,
    "isDndEnabled": false,
    "quietModeStart": "23:00",
    "quietModeEnd": "07:00",
    "currentTime": "2026-01-23T02:30:00+09:00"
  }
}
```

#### API 3-2: DND状態更新
- **Path**: `PUT /api/v1/guest/dnd/status`
- **認証**: デバイス認証
- **リクエスト**: `{ "isDndEnabled": true }`

#### API 3-3: 残り通知回数取得
- **Path**: `GET /api/v1/guest/notifications/limit`
- **認証**: デバイス認証
- **レスポンス**:
```json
{
  "success": true,
  "data": {
    "maxNotifications": 2,
    "usedNotifications": 1,
    "remainingNotifications": 1,
    "isLimitReached": false
  }
}
```

### 3.5 Quietモード判定ロジック

```typescript
function isQuietMode(tenantSettings: TenantSettings): boolean {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  const [startHour, startMin] = tenantSettings.quiet_mode_start.split(':').map(Number)
  const [endHour, endMin] = tenantSettings.quiet_mode_end.split(':').map(Number)
  const startTime = startHour * 60 + startMin  // 23:00 = 1380
  const endTime = endHour * 60 + endMin        // 07:00 = 420

  // 23:00-07:00 のような日をまたぐ場合
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime
  }
  return currentTime >= startTime && currentTime < endTime
}
```

### 3.6 実装ファイル一覧

```
src/
├── services/dnd/
│   ├── dnd.service.ts                # DND状態管理
│   └── notification-limit.service.ts # 頻度制御
└── routes/api/v1/guest/
    ├── dnd/
    │   └── status.ts                 # GET/PUT
    └── notifications/
        └── limit.get.ts              # 残り回数
```

### 3.7 テスト要件

```typescript
// tests/dnd.test.ts
describe('DND API', () => {
  describe('GET /api/v1/guest/dnd/status', () => {
    it('should return isQuietMode=true during 23:00-07:00')
    it('should return isQuietMode=false during 07:00-23:00')
    it('should respect tenant-specific settings')
  })

  describe('PUT /api/v1/guest/dnd/status', () => {
    it('should update dndEnabled flag')
    it('should persist to device_rooms')
  })

  describe('GET /api/v1/guest/notifications/limit', () => {
    it('should return remaining count')
    it('should indicate isLimitReached when count >= max')
  })
})
```

---

## 実行チェックリスト

### タスク1: DEV-0181
- [ ] マイグレーション: `npx prisma migrate dev --name add_device_reset_tables`
- [ ] DeviceResetTokenService 実装
- [ ] DeviceResetService 実装
- [ ] API 4エンドポイント実装
- [ ] WebSocket DEVICE_RESET イベント実装
- [ ] テスト作成・実行
- [ ] コミット

### タスク2: DEV-0210
- [ ] マイグレーション: `npx prisma migrate dev --name add_event_logs`
- [ ] EventLogService 実装
- [ ] API 3エンドポイント実装
- [ ] テスト作成・実行
- [ ] コミット

### タスク3: DEV-0190
- [ ] マイグレーション: device_rooms 拡張
- [ ] tenant_settings シード追加
- [ ] DndService 実装
- [ ] NotificationLimitService 実装
- [ ] API 3エンドポイント実装
- [ ] テスト作成・実行
- [ ] コミット

### 完了後
- [ ] 全テスト通過確認
- [ ] プッシュ

---

## 注意事項

1. **マルチテナント必須**: 全クエリに `WHERE tenant_id = ?` を含める
2. **フォールバック禁止**: `|| 'default'` や `?? 'default'` を使わない
3. **エラーは404**: 他テナントのリソースアクセスは404を返す（403ではない）
4. **ログはイミュータブル**: EventLogの更新・削除は禁止
