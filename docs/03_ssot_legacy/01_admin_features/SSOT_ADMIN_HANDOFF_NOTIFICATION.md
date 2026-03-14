# SSOT_ADMIN_HANDOFF_NOTIFICATION.md

**バージョン**: 1.0.0
**最終更新**: 2026-01-24
**ドキュメントID**: SSOT-ADMIN-HANDOFF-001
**ステータス**: ✅ 確定

---

## 📋 概要

### 目的

ゲストからのハンドオフリクエストを受けて、スタッフへリアルタイム通知を送信し、60秒以内の迅速な対応を実現する。

### スコープ

- **対象システム**: hotel-common（API）、hotel-saas（Admin UI）
- **対象ユーザー**: フロントデスクスタッフ（Session認証）
- **関連タスク**: [DEV-0172] [COM-246] 通知チャネル＆ハンドオフAPI実装

### 関連SSOT

- `SSOT_GUEST_AI_HANDOFF.md`（ゲスト側ハンドオフ、データベース設計）
- `SSOT_SAAS_ADMIN_AUTHENTICATION.md`（Session認証）
- `SSOT_SAAS_MULTITENANT.md`（マルチテナント設計）
- `SSOT_API_REGISTRY.md`（API定義）

---

## 🎯 要件ID一覧

### 機能要件（HDF-ADM）

| ID | 説明 | 優先度 |
|:---|:-----|:-------|
| HDF-ADM-001 | ハンドオフリクエスト一覧取得 | 🔴 必須 |
| HDF-ADM-002 | ハンドオフリクエスト詳細取得 | 🔴 必須 |
| HDF-ADM-003 | ハンドオフステータス更新 | 🔴 必須 |
| HDF-ADM-004 | リアルタイム通知（WebSocket） | 🟡 Phase 2 |
| HDF-ADM-005 | 未対応リクエストの自動リマインド | 🟢 Phase 3 |

### 非機能要件（HDF-ADM-NFR）

| ID | 説明 | 優先度 |
|:---|:-----|:-------|
| HDF-ADM-NFR-001 | API応答時間2秒以内 | 🔴 必須 |
| HDF-ADM-NFR-002 | 通知遅延1秒以内 | 🟡 Phase 2 |
| HDF-ADM-NFR-003 | 同時接続100スタッフ対応 | 🟡 Phase 2 |
| HDF-ADM-NFR-004 | 監査ログ90日保持 | 🔴 必須 |

---

## 🗄️ データベース設計

### テーブル定義

**注**: `handoff_requests`テーブルは`SSOT_GUEST_AI_HANDOFF.md`で定義済み。
このSSOTではスタッフ操作に関連するカラムのみ記載。

```prisma
model HandoffRequest {
  id              String           @id @default(cuid()) @map("id")
  tenantId        String           @map("tenant_id")
  sessionId       String           @map("session_id")
  roomId          String           @map("room_id")
  channel         String           @default("front_desk") @map("channel")
  status          HandoffStatus    @default(PENDING) @map("status")
  context         Json             @map("context")

  // スタッフ操作関連（このSSOTで使用）
  staffId         String?          @map("staff_id")
  acceptedAt      DateTime?        @map("accepted_at")
  completedAt     DateTime?        @map("completed_at")
  notes           String?          @map("notes")  // スタッフメモ

  createdAt       DateTime         @default(now()) @map("created_at")
  timeoutAt       DateTime         @map("timeout_at")

  // Relations
  tenant          Tenant           @relation(fields: [tenantId], references: [id])
  staff           Staff?           @relation(fields: [staffId], references: [id])

  @@map("handoff_requests")
  @@index([tenantId], map: "idx_handoff_requests_tenant")
  @@index([status, createdAt], map: "idx_handoff_requests_status_created")
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

### 新規テーブル: 通知ログ

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

---

## 🔌 API設計

### エンドポイント一覧

**スタッフ向けAPI（Session認証必須）**

| Method | Path | 説明 | 認証 |
|:-------|:-----|:-----|:-----|
| GET | `/api/v1/admin/handoff/requests` | リクエスト一覧取得 | Session |
| GET | `/api/v1/admin/handoff/requests/:id` | リクエスト詳細取得 | Session |
| PATCH | `/api/v1/admin/handoff/requests/:id/status` | ステータス更新 | Session |

### API詳細仕様

#### 1. リクエスト一覧取得

**エンドポイント**: `GET /api/v1/admin/handoff/requests`

**クエリパラメータ**:
```typescript
interface GetHandoffRequestsQuery {
  status?: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'TIMEOUT' | 'CANCELLED'
  roomId?: string
  staffId?: string
  fromDate?: string  // ISO 8601形式
  toDate?: string    // ISO 8601形式
  limit?: number     // デフォルト: 50
  offset?: number    // デフォルト: 0
}
```

**レスポンス**:
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
          "lastMessages": [
            {
              "role": "user",
              "content": "予約の変更をしたい",
              "timestamp": "2026-01-24T10:00:00Z"
            },
            {
              "role": "assistant",
              "content": "予約変更の詳細をスタッフが確認いたします",
              "timestamp": "2026-01-24T10:00:15Z"
            }
          ],
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

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "認証が必要です"
  }
}
```

#### 2. リクエスト詳細取得

**エンドポイント**: `GET /api/v1/admin/handoff/requests/:id`

**パスパラメータ**:
- `id`: ハンドオフリクエストID

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "handoff_789",
    "tenantId": "tenant_123",
    "sessionId": "chat_session_456",
    "roomId": "room_101",
    "channel": "front_desk",
    "status": "ACCEPTED",
    "context": {
      "lastMessages": [...],
      "currentTopic": "reservation_change",
      "guestInfo": {
        "roomNumber": "101",
        "guestName": "山田太郎",
        "checkinDate": "2026-01-20",
        "checkoutDate": "2026-01-25"
      }
    },
    "staffId": "staff_456",
    "staffName": "佐藤花子",
    "createdAt": "2026-01-24T10:00:30Z",
    "acceptedAt": "2026-01-24T10:00:45Z",
    "completedAt": null,
    "timeoutAt": "2026-01-24T10:01:30Z",
    "notes": "予約変更対応中"
  }
}
```

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "リクエストが見つかりません"
  }
}
```

#### 3. ステータス更新

**エンドポイント**: `PATCH /api/v1/admin/handoff/requests/:id/status`

**パスパラメータ**:
- `id`: ハンドオフリクエストID

**リクエストボディ**:
```json
{
  "status": "ACCEPTED",
  "notes": "予約変更対応を開始します"
}
```

**バリデーション**:
- `status`: 必須、`ACCEPTED` | `COMPLETED` | `CANCELLED`のいずれか
- `notes`: オプション、最大1000文字

**ステータス遷移ルール**:
```
PENDING → ACCEPTED | CANCELLED | TIMEOUT
ACCEPTED → COMPLETED | CANCELLED
TIMEOUT → (変更不可)
COMPLETED → (変更不可)
CANCELLED → (変更不可)
```

**レスポンス**:
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

**エラーレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "ステータスを COMPLETED から ACCEPTED に変更できません"
  }
}
```

---

## 🎨 UI設計

### 画面一覧

| 画面名 | パス | 説明 |
|:-------|:-----|:-----|
| ハンドオフ管理画面 | `/admin/handoff` | リクエスト一覧とステータス管理 |
| ハンドオフ詳細モーダル | - | リクエスト詳細表示と操作 |
| 通知ポップアップ | - | 新規リクエスト通知 |

### 画面仕様

#### 1. ハンドオフ管理画面（/admin/handoff）

**コンポーネント構成**:
```
pages/admin/handoff/index.vue
├─ components/admin/handoff/HandoffRequestList.vue
│  ├─ components/admin/handoff/HandoffRequestCard.vue
│  └─ components/admin/handoff/HandoffStatusBadge.vue
└─ components/admin/handoff/HandoffDetailModal.vue
```

**レイアウト**:
```
┌─────────────────────────────────────────────────┐
│ ハンドオフ管理                                    │
├─────────────────────────────────────────────────┤
│ [未対応: 3] [対応中: 2] [完了: 15] [タイムアウト: 1]│
├─────────────────────────────────────────────────┤
│ フィルタ: [ステータス▼] [部屋番号] [検索]         │
├─────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────┐   │
│ │ 🔴 未対応 | 101号室 | 山田太郎 | 45秒前      │   │
│ │ 「予約の変更をしたい」                        │   │
│ │ [詳細] [対応開始]                            │   │
│ └───────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────┐   │
│ │ 🟡 対応中 | 203号室 | 佐藤花子 | 5分前       │   │
│ │ 「チェックアウト時間の延長」                   │   │
│ │ [詳細] [完了]                                │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**機能要件**:
- リクエスト一覧をステータス別にタブ表示
- 未対応リクエストを上位に表示（createdAt降順）
- リアルタイム更新（Phase 2: WebSocket、Phase 1: 5秒ポーリング）
- クリックで詳細モーダル表示

#### 2. ハンドオフ詳細モーダル

**レイアウト**:
```
┌─────────────────────────────────────────────────┐
│ ハンドオフ詳細                            [×]   │
├─────────────────────────────────────────────────┤
│ ゲスト情報                                       │
│ 部屋番号: 101号室                                │
│ 氏名: 山田太郎                                   │
│ チェックイン: 2026-01-20                         │
│ チェックアウト: 2026-01-25                       │
├─────────────────────────────────────────────────┤
│ 会話履歴                                        │
│ ┌───────────────────────────────────────────┐   │
│ │ ゲスト: 予約の変更をしたい (10:00)           │   │
│ │ AI: 予約変更の詳細を確認します (10:00)       │   │
│ │ AI: スタッフが対応いたします (10:00)         │   │
│ └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│ メモ                                            │
│ ┌───────────────────────────────────────────┐   │
│ │ [スタッフメモを入力]                         │   │
│ └───────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│               [対応開始] [キャンセル]            │
└─────────────────────────────────────────────────┘
```

**機能要件**:
- ゲスト情報と会話履歴を表示
- スタッフメモの入力・保存
- ステータス更新ボタン（状態に応じて変化）

#### 3. 通知ポップアップ（Phase 2）

**レイアウト**:
```
┌─────────────────────────────────────┐
│ 🔔 新規ハンドオフリクエスト          │
├─────────────────────────────────────┤
│ 101号室 山田太郎様                   │
│ 「予約の変更をしたい」               │
│                                     │
│      [詳細を見る] [後で対応]         │
└─────────────────────────────────────┘
```

**機能要件**:
- 画面右下に5秒間表示
- クリックで詳細モーダル表示
- 「後で対応」でポップアップを閉じる
- WebSocket接続時のみ表示（Phase 2）

---

## 🔔 通知チャネル設計

### Phase 1: ポーリング方式（MVP）

**仕様**:
- フロントエンドが5秒間隔で`GET /api/v1/admin/handoff/requests?status=PENDING`をポーリング
- 新規リクエストがあればリストに追加
- ブラウザ通知API使用（Permission必要）

**実装**:
```typescript
// composables/useHandoffPolling.ts
export const useHandoffPolling = () => {
  const interval = ref<NodeJS.Timeout | null>(null)
  const requests = ref<HandoffRequest[]>([])

  const startPolling = () => {
    interval.value = setInterval(async () => {
      const res = await $fetch('/api/v1/admin/handoff/requests', {
        params: { status: 'PENDING', limit: 50 }
      })

      if (res.success) {
        const newRequests = res.data.requests.filter(
          req => !requests.value.find(r => r.id === req.id)
        )

        if (newRequests.length > 0) {
          requests.value.push(...newRequests)
          showBrowserNotification(newRequests)
        }
      }
    }, 5000)
  }

  const stopPolling = () => {
    if (interval.value) {
      clearInterval(interval.value)
    }
  }

  return { requests, startPolling, stopPolling }
}
```

### Phase 2: WebSocket方式（推奨）

**アーキテクチャ**:
```
[ゲスト] → POST /api/v1/guest/handoff/requests
           ↓
    [hotel-common] → handoff_requests INSERT
           ↓
    [WebSocketサーバー] → 該当テナントの接続中スタッフへブロードキャスト
           ↓
    [スタッフブラウザ] → ポップアップ表示
```

**WebSocketイベント定義**:

| イベント名 | 方向 | ペイロード |
|:----------|:-----|:----------|
| `handoff:new` | Server → Client | `{ handoffRequest: HandoffRequest }` |
| `handoff:updated` | Server → Client | `{ handoffRequest: HandoffRequest }` |
| `handoff:subscribe` | Client → Server | `{ tenantId: string }` |
| `handoff:unsubscribe` | Client → Server | `{ tenantId: string }` |

**実装**:
```typescript
// server/websocket/handoff.ts
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 3402 })

const connections = new Map<string, Set<WebSocket>>()

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString())

    if (msg.type === 'handoff:subscribe') {
      const tenantId = msg.payload.tenantId
      if (!connections.has(tenantId)) {
        connections.set(tenantId, new Set())
      }
      connections.get(tenantId)!.add(ws)
    }
  })
})

export const broadcastHandoffRequest = (
  tenantId: string,
  handoffRequest: HandoffRequest
) => {
  const clients = connections.get(tenantId)
  if (!clients) return

  const message = JSON.stringify({
    type: 'handoff:new',
    payload: { handoffRequest }
  })

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}
```

---

## ✅ Accept（合格条件）

### Phase 1（MVP）

#### HDF-ADM-001: リクエスト一覧取得

- [ ] `GET /api/v1/admin/handoff/requests`が実装されている
- [ ] ステータス、部屋番号、期間でフィルタリングできる
- [ ] テナント分離が正しく機能している（他テナントのリクエストは取得不可）
- [ ] ページネーション（limit/offset）が動作する
- [ ] レスポンス形式が仕様通り

#### HDF-ADM-002: リクエスト詳細取得

- [ ] `GET /api/v1/admin/handoff/requests/:id`が実装されている
- [ ] 会話履歴が正しく取得できる
- [ ] ゲスト情報（部屋番号、氏名）が表示される
- [ ] 他テナントのリクエストは404を返す

#### HDF-ADM-003: ステータス更新

- [ ] `PATCH /api/v1/admin/handoff/requests/:id/status`が実装されている
- [ ] ステータス遷移ルールが守られている
- [ ] スタッフIDが自動的に記録される
- [ ] タイムスタンプ（acceptedAt/completedAt）が正しく更新される
- [ ] スタッフメモが保存される

#### UI

- [ ] ハンドオフ管理画面（/admin/handoff）が表示される
- [ ] リクエスト一覧がステータス別に表示される
- [ ] 詳細モーダルが表示される
- [ ] ステータス更新ボタンが機能する
- [ ] ポーリング（5秒間隔）が動作する

#### セキュリティ

- [ ] Session認証が必須
- [ ] テナント分離が完全（他テナントのデータにアクセス不可）
- [ ] 監査ログが記録される

#### パフォーマンス

- [ ] API応答時間が2秒以内（95パーセンタイル）
- [ ] 一覧取得が50件まで対応

### Phase 2（WebSocket）

- [ ] WebSocketサーバーが起動する
- [ ] スタッフがテナント別に接続できる
- [ ] 新規リクエスト時にリアルタイム通知が届く
- [ ] 通知ポップアップが表示される
- [ ] 通知遅延が1秒以内

---

## 🛠️ 実装チェックリスト

### Phase 1（MVP）

#### hotel-common（API）

- [ ] `src/routes/api/v1/admin/handoff/requests.get.ts`作成
- [ ] `src/routes/api/v1/admin/handoff/requests/[id].get.ts`作成
- [ ] `src/routes/api/v1/admin/handoff/requests/[id]/status.patch.ts`作成
- [ ] `src/services/handoff-admin.service.ts`作成
- [ ] ルーター登録（`src/routes/api/v1/admin/index.ts`）
- [ ] 監査ログ実装
- [ ] ユニットテスト作成

#### hotel-saas（Admin UI）

- [ ] `pages/admin/handoff/index.vue`作成
- [ ] `components/admin/handoff/HandoffRequestList.vue`作成
- [ ] `components/admin/handoff/HandoffRequestCard.vue`作成
- [ ] `components/admin/handoff/HandoffStatusBadge.vue`作成
- [ ] `components/admin/handoff/HandoffDetailModal.vue`作成
- [ ] `composables/useHandoffPolling.ts`作成
- [ ] `composables/useHandoffRequests.ts`作成
- [ ] API統合テスト

### Phase 2（WebSocket）

- [ ] WebSocketサーバー構築（hotel-common）
- [ ] `server/websocket/handoff.ts`実装
- [ ] `composables/useHandoffWebSocket.ts`作成
- [ ] 通知ポップアップコンポーネント作成
- [ ] 接続・切断・再接続処理実装
- [ ] WebSocket統合テスト

---

## 📊 Config設定（Marketing Injection対応）

| 設定項目 | デフォルト値 | 説明 |
|:---------|:------------|:-----|
| `handoff.admin.polling_interval` | 5000 | ポーリング間隔（ミリ秒） |
| `handoff.admin.page_size` | 50 | 一覧取得のデフォルト件数 |
| `handoff.admin.websocket_url` | `ws://localhost:3402` | WebSocketサーバーURL |
| `handoff.admin.notification_sound` | true | 通知音を鳴らすか |

---

## 📈 Analytics追跡（Tracking by Default）

| イベント | analytics-id | 記録先 |
|:---------|:-------------|:-------|
| リクエスト一覧表示 | `handoff-admin-list-view` | DB必須 |
| リクエスト詳細表示 | `handoff-admin-detail-view` | DB必須 |
| ステータス更新 | `handoff-admin-status-update` | DB必須 |
| 通知受信 | `handoff-admin-notification-received` | DB必須 |
| 通知クリック | `handoff-admin-notification-click` | DB必須 |

---

## 🔗 関連ドキュメント

- `SSOT_GUEST_AI_HANDOFF.md`（ゲスト側ハンドオフ機能）
- `SSOT_SAAS_ADMIN_AUTHENTICATION.md`（Session認証）
- `SSOT_SAAS_MULTITENANT.md`（マルチテナント設計）
- `SSOT_API_REGISTRY.md`（APIエンドポイント一元管理）

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2026-01-24 | 1.0.0 | 初版作成（DEV-0172: 通知チャネル＆ハンドオフAPI実装） |

---

**作成者**: Claude Sonnet 4.5
**レビュー**: -
**承認**: -
