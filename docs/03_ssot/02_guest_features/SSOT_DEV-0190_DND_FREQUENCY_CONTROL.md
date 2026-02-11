# SSOT_DEV-0190_DND_FREQUENCY_CONTROL.md

**バージョン**: 1.1.0
**最終更新**: 2026-02-11
**ドキュメントID**: SSOT-GUEST-DND-001
**タスクID**: DEV-0190（親）, DEV-0191〜0194（サブタスク）

---

## 概要

- **目的**: 夜間（23:00-07:00）は能動的通知を完全停止し、通常時間帯も静的表示のみ・最大2回に制限することで、ゲストの快適性を確保する
- **適用範囲**: hotel-common（API）、hotel-saas（ゲストUI）
- **関連SSOT**:
  - `SSOT_SAAS_DEVICE_AUTHENTICATION.md`（デバイス認証・ensureGuestContext）
  - `SSOT_MARKETING_INTEGRATION.md`（Config First / tenant_settings テーブル定義）
  - `SSOT_GUEST_AI_HANDOFF.md`（ハンドオフ）
  - `SSOT_DEV-0180_SESSION_RESET.md`（セッションリセット連携）

---

## 要件ID体系

- DND-001〜099: 機能要件
- DND-100〜199: 非機能要件
- DND-200〜299: UI/UX要件

---

## 機能要件（FR）

### DND-001: Quietモード（夜間DND）

- **説明**: 23:00-07:00の時間帯は能動的な通知・推奨を完全停止
- **Accept**:
  - 指定時間帯はポップアップ、プッシュ通知、音声通知を一切行わない
  - ゲストが自発的にアクセスした場合のみコンテンツを表示
  - Quietモード中もAIチャットは利用可能（ゲスト起点の操作）
  - 時間帯は`tenant_settings`テーブル（category: `dnd`）で設定可能

### DND-002: 通常時間帯の頻度制御

- **説明**: 通常時間帯（07:00-23:00）でも過度な通知を防止
- **Accept**:
  - 同一セッション内で最大2回まで推奨・通知を表示
  - 3回目以降は静的表示のみ（ユーザー操作がない限り非表示）
  - カウントはセッション単位でリセット
  - 回数制限は`tenant_settings`テーブル（category: `dnd`）で設定可能

### DND-003: 静的表示モード

- **説明**: 能動的な通知の代わりに控えめな表示
- **Accept**:
  - バナー/ポップアップではなくアイコンバッジのみ
  - アニメーション・音声なし
  - ゲストがタップ/クリックした場合のみ詳細表示

### DND-004: DND状態の永続化

- **説明**: デバイス単位でDND設定を保持
- **Accept**:
  - `device_rooms`テーブルにDND設定を保存
  - セッションリセット時にデフォルト値にリセット（→ 連携セクション参照）
  - ゲストは手動でDNDをオン/オフ可能

---

## 非機能要件（NFR）

### DND-100: パフォーマンス

- DND状態チェック: 10ms以内
- 頻度カウント更新: 50ms以内

### DND-101: 設定の柔軟性

- 時間帯はテナントごとに設定可能
- 回数制限はテナントごとに設定可能
- 全設定は`tenant_settings`テーブル経由で管理（Config First）

### DND-102: 監査ログ

- DND状態変更時にログ記録
- 頻度制限による非表示をログ記録

---

## API仕様

### 認証方式

全エンドポイントはデバイス認証を使用する。

**hotel-saas 側**: `ensureGuestContext(event)` を使用して `{ tenantId, roomId, deviceId }` を取得する。
**hotel-common 側**: hotel-saas からプロキシされたリクエストのヘッダーで認証情報を受け取る。

| ヘッダー | 説明 | 設定元 |
|:---------|:-----|:-------|
| `x-tenant-id` | テナントID | ensureGuestContext → callHotelCommonAPI |
| `x-device-id` | デバイスID | ensureGuestContext → callHotelCommonAPI |

> **注**: `ensureGuestContext` は IP → device-status API でデバイスを解決し、`tenantId`, `roomId`, `deviceId` を返す。
> DND API では `deviceId` でデバイスを特定する（同一部屋に複数デバイスが存在する場合に対応）。

### エンドポイント一覧

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| GET | `/api/v1/guest/dnd/status` | 現在のDND状態を取得 | デバイス認証 |
| PUT | `/api/v1/guest/dnd/status` | DND状態を更新 | デバイス認証 |
| GET | `/api/v1/guest/notifications/limit` | 残り通知回数を取得 | デバイス認証 |

### リクエスト/レスポンス詳細

```json
// GET /api/v1/guest/dnd/status
// Headers: x-tenant-id, x-device-id
// Response
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

// PUT /api/v1/guest/dnd/status
// Headers: x-tenant-id, x-device-id
// Request
{
  "isDndEnabled": true
}

// Response（GET と同一形式。PUTの後にGETを追加で呼ぶ必要がない）
{
  "success": true,
  "data": {
    "isQuietMode": false,
    "isDndEnabled": true,
    "quietModeStart": "23:00",
    "quietModeEnd": "07:00",
    "currentTime": "2026-01-23T15:00:00+09:00"
  }
}

// GET /api/v1/guest/notifications/limit
// Headers: x-tenant-id, x-device-id
// Response
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

---

## データベース設計

### device_rooms テーブル拡張

> **注**: 実装上のPrismaモデル名は `device_rooms`（既存テーブルの慣例に従う）。

```prisma
model device_rooms {
  // ... 既存フィールド

  // DEV-0190: DND/頻度制御
  dndEnabled         Boolean   @default(false) @map("dnd_enabled")
  notificationCount  Int       @default(0) @map("notification_count")
  lastNotificationAt DateTime? @map("last_notification_at")

  @@map("device_rooms")
}
```

### tenant_settings テーブル（新規作成）

`SSOT_MARKETING_INTEGRATION.md` で定義された共通設定テーブルを使用する。
DND 以外にも ai_character, campaigns, pricing, display, eta, billing 等のカテゴリで利用される。

```prisma
model tenant_settings {
  id        Int      @id @default(autoincrement())
  tenantId  String   @map("tenant_id") @db.Uuid
  category  String   // 'dnd' | 'ai_character' | 'campaigns' | 'pricing' | 'display' | ...
  key       String
  value     Json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, category, key])
  @@index([tenantId, category])
  @@map("tenant_settings")
}
```

#### DND用シードデータ

| tenant_id | category | key | value |
|:----------|:---------|:----|:------|
| (各テナント) | dnd | quiet_mode_start | `"23:00"` |
| (各テナント) | dnd | quiet_mode_end | `"07:00"` |
| (各テナント) | dnd | max_notifications_per_session | `2` |
| (各テナント) | dnd | default_dnd_enabled | `false` |

#### 設定取得パターン

```typescript
// DndService内での取得例
async getTenantSettings(tenantId: string): Promise<TenantDndSettings> {
  const rows = await prisma.tenant_settings.findMany({
    where: { tenantId, category: 'dnd' },
  });

  // rows → キーバリューからオブジェクトに変換
  // 見つからないキーはデフォルト値を使用
  return {
    quiet_mode_start: findValue(rows, 'quiet_mode_start', '23:00'),
    quiet_mode_end: findValue(rows, 'quiet_mode_end', '07:00'),
    max_notifications_per_session: findValue(rows, 'max_notifications_per_session', 2),
    default_dnd_enabled: findValue(rows, 'default_dnd_enabled', false),
  };
}
```

---

## セッションリセット連携（DND-004）

セッションリセット（DEV-0180）実行時に、DND状態と通知カウントをデフォルト値にリセットする。

### 呼び出し経路

```
セッションリセット実行
  → DeviceResetService.executeAdminReset() / executeTokenReset()
  → デバイスのセッションワイプ完了後
  → dndService.resetNotificationCount(tenantId, deviceId)
```

### リセット内容

| フィールド | リセット後の値 |
|:-----------|:--------------|
| `dndEnabled` | `false`（または `tenant_settings.default_dnd_enabled` の値） |
| `notificationCount` | `0` |
| `lastNotificationAt` | `null` |

---

## hotel-saas プロキシ実装パターン

全ゲストAPIは `ensureGuestContext` を使用してデバイス認証を実施する。

```typescript
// server/api/v1/guest/dnd/status.get.ts
import { ensureGuestContext } from '~/server/utils/guest-helpers'
import { callHotelCommonAPI } from '~/server/utils/api-client'

export default defineEventHandler(async (event) => {
  const { tenantId, deviceId } = await ensureGuestContext(event)

  return callHotelCommonAPI(event, '/api/v1/guest/dnd/status', {
    method: 'GET',
    headers: {
      'x-tenant-id': tenantId,
      'x-device-id': deviceId,
    },
  })
})
```

> **注**: `ensureGuestContext` は現在 `{ tenantId, roomId }` を返す。
> DEV-0192 の実装時に `deviceId` も返すよう拡張が必要（device-status API は既に deviceId を返している）。

---

## UI/UX要件

### DND-200: DND状態表示

- ヘッダーにDNDアイコン（月マーク）を表示
- Quietモード中は「おやすみモード」と表示
- タップでDND設定画面へ遷移

### DND-201: 通知頻度インジケーター

- 残り通知回数を視覚的に表示（任意）
- 制限到達時は「後でまた」メッセージ

### DND-202: 設定画面

- DND手動オン/オフトグル
- 現在のQuietモード時間帯表示（読み取り専用）

---

## Config設定（Marketing Injection対応）

| 設定項目 | カテゴリ | キー | デフォルト値 |
|:---------|:---------|:-----|:------------|
| Quietモード開始 | dnd | quiet_mode_start | `"23:00"` |
| Quietモード終了 | dnd | quiet_mode_end | `"07:00"` |
| 最大通知回数 | dnd | max_notifications_per_session | `2` |
| デフォルトDND状態 | dnd | default_dnd_enabled | `false` |

---

## Analytics追跡（Tracking by Default）

| イベント | analytics-id | 記録先 |
|:---------|:-------------|:-------|
| DND有効化 | `dnd-enable` | DB必須 |
| DND無効化 | `dnd-disable` | DB必須 |
| 通知制限到達 | `notification-limit-reached` | DB必須 |
| Quietモード開始 | `quiet-mode-start` | GA4 |

---

## 実装チェックリスト

### 🔴 MVP（DEV-0190スコープ）

- [ ] tenant_settings テーブル新規作成（マイグレーション）
- [ ] device_rooms テーブルにDNDフィールド追加（マイグレーション）
- [ ] tenant_settings にDND設定シードデータ投入
- [ ] ensureGuestContext を拡張し deviceId も返す
- [ ] GET /api/v1/guest/dnd/status 実装
- [ ] PUT /api/v1/guest/dnd/status 実装
- [ ] GET /api/v1/guest/notifications/limit 実装
- [ ] Quietモード判定ロジック実装（tenant_settings から設定取得）
- [ ] 頻度カウントロジック実装
- [ ] hotel-saas プロキシ実装（ensureGuestContext 使用）
- [ ] セッションリセット連携（resetNotificationCount 呼び出し）
- [ ] UI: DNDアイコン表示
- [ ] UI: 設定トグル

### 🟡 Phase 2

- [ ] 詳細な頻度制御（カテゴリ別）
- [ ] ゲスト好みの学習

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-01-23 | 1.0.0 | 初版作成（DEV-0190: DND/頻度制御） |
| 2026-02-11 | 1.1.0 | DEV-0191 整合チェック反映: tenant_settings テーブル定義追加、API認証方式明確化（ensureGuestContext + x-device-id）、PUT レスポンスをGET同一形式に統一、セッションリセット連携追加、Prismaモデル名注記追加 |
