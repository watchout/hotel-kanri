# SSOT_DEV-0190_DND_FREQUENCY_CONTROL.md

**バージョン**: 1.0.0  
**最終更新**: 2026-01-23  
**ドキュメントID**: SSOT-GUEST-DND-001  
**タスクID**: DEV-0190（親）, DEV-0191〜0194（サブタスク）

---

## 概要

- **目的**: 夜間（23:00-07:00）は能動的通知を完全停止し、通常時間帯も静的表示のみ・最大2回に制限することで、ゲストの快適性を確保する
- **適用範囲**: hotel-common（API）、hotel-saas（ゲストUI）
- **関連SSOT**:
  - `SSOT_SAAS_DEVICE_AUTHENTICATION.md`（デバイス認証）
  - `SSOT_MARKETING_INTEGRATION.md`（Config First / Tracking by Default）
  - `SSOT_GUEST_AI_HANDOFF.md`（ハンドオフ）

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
  - 時間帯は`tenant_settings`で設定可能

### DND-002: 通常時間帯の頻度制御

- **説明**: 通常時間帯（07:00-23:00）でも過度な通知を防止
- **Accept**:
  - 同一セッション内で最大2回まで推奨・通知を表示
  - 3回目以降は静的表示のみ（ユーザー操作がない限り非表示）
  - カウントはセッション単位でリセット
  - 回数制限は`tenant_settings`で設定可能

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
  - セッションリセット時にデフォルト値にリセット
  - ゲストは手動でDNDをオン/オフ可能

---

## 非機能要件（NFR）

### DND-100: パフォーマンス

- DND状態チェック: 10ms以内
- 頻度カウント更新: 50ms以内

### DND-101: 設定の柔軟性

- 時間帯はテナントごとに設定可能
- 回数制限はテナントごとに設定可能
- 全設定は`tenant_settings`経由で管理（Config First）

### DND-102: 監査ログ

- DND状態変更時にログ記録
- 頻度制限による非表示をログ記録

---

## API仕様

### エンドポイント一覧

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| GET | `/api/v1/guest/dnd/status` | 現在のDND状態を取得 | デバイス認証 |
| PUT | `/api/v1/guest/dnd/status` | DND状態を更新 | デバイス認証 |
| GET | `/api/v1/guest/notifications/limit` | 残り通知回数を取得 | デバイス認証 |

### リクエスト/レスポンス詳細

```json
// GET /api/v1/guest/dnd/status
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
// Request
{
  "isDndEnabled": true
}

// Response
{
  "success": true,
  "data": {
    "isDndEnabled": true,
    "updatedAt": "2026-01-23T15:00:00+09:00"
  }
}

// GET /api/v1/guest/notifications/limit
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

```prisma
model DeviceRoom {
  // ... 既存フィールド
  
  // DND設定（追加）
  dndEnabled       Boolean   @default(false) @map("dnd_enabled")
  notificationCount Int      @default(0) @map("notification_count")
  lastNotificationAt DateTime? @map("last_notification_at")
  
  @@map("device_rooms")
}
```

### tenant_settings（既存テーブル利用）

```typescript
// category: 'dnd'
// keys:
// - quiet_mode_start: "23:00"
// - quiet_mode_end: "07:00"
// - max_notifications_per_session: 2
// - default_dnd_enabled: false
```

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
| Quietモード開始 | dnd | quiet_mode_start | "23:00" |
| Quietモード終了 | dnd | quiet_mode_end | "07:00" |
| 最大通知回数 | dnd | max_notifications_per_session | 2 |
| デフォルトDND状態 | dnd | default_dnd_enabled | false |

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

- [ ] device_rooms テーブルにDNDフィールド追加（マイグレーション）
- [ ] tenant_settings にDND設定シード
- [ ] GET /api/v1/guest/dnd/status 実装
- [ ] PUT /api/v1/guest/dnd/status 実装
- [ ] GET /api/v1/guest/notifications/limit 実装
- [ ] Quietモード判定ロジック実装
- [ ] 頻度カウントロジック実装
- [ ] hotel-saas プロキシ実装
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
