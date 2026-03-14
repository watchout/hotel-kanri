---
doc_id: SSOT-ADMIN-WEBHOOK-001
title: 通知Webhook設定
version: 2.1.0
status: draft
owner: 開発チーム
created_at: 2026-01-23
updated_at: 2026-02-02
scope:
  - hotel-common
  - hotel-saas
related_ssot:
  - SSOT-ADMIN-ORDER-001
  - SSOT-GUEST-HANDOFF-001
tickets:
  - DEV-0250
  - DEV-0310
risk_level: medium
requires_config: true
requires_tracking: true
---

# SSOT: 通知Webhook設定

**バージョン**: 2.1.0（DEV-0310: MVP仕様確定 + 管理画面通知）  
**最終更新**: 2026-02-02  
**ドキュメントID**: SSOT-ADMIN-WEBHOOK-001  
**タスクID**: DEV-0250, DEV-0310〜0314

---

## 概要

- **目的**: 新規注文やハンドオフリクエスト発生時にSlack等の外部サービスへ通知を送信し、スタッフの即時対応を可能にする
- **適用範囲**: hotel-common（Webhook送信）、hotel-saas（管理UI）
- **関連SSOT**:
  - `SSOT_SAAS_ORDER_MANAGEMENT.md`（注文管理）
  - `SSOT_GUEST_AI_HANDOFF.md`（ハンドオフ）
  - `SSOT_MARKETING_INTEGRATION.md`（Config First）

---

## 要件ID体系

- WH-001〜099: 機能要件
- WH-100〜199: 非機能要件
- WH-200〜299: UI/UX要件

---

## 機能要件（FR）

### WH-001: Webhook登録

- **説明**: テナントごとにWebhook URLを登録
- **Accept**:
  - 汎用Webhook URL（Slack, Discord, Teams等任意のURL）を登録可能
  - **MVP: 1件のみ登録可能**（将来: 最大5件）
  - Webhook名、URL、有効/無効を設定可能
  - URL検証（送信テスト）機能あり
  - httpsのみ許可

### WH-002: イベントトリガー設定

- **説明**: どのイベントでWebhookを発火するか設定
- **Accept**:
  - 新規注文（ORDER_CREATED）
  - ハンドオフリクエスト（HANDOFF_CREATED）
  - ハンドオフタイムアウト（HANDOFF_TIMEOUT）
  - イベントごとにオン/オフ設定可能

### WH-003: Webhook送信

- **説明**: イベント発生時にWebhookを送信
- **Accept**:
  - JSON形式でペイロード送信
  - Slack Block Kit形式に対応
  - 送信失敗時は3回リトライ（1秒、5秒、30秒間隔）
  - 送信結果をログに記録

### WH-004: 送信テスト

- **説明**: 登録したWebhookの動作確認
- **Accept**:
  - テストメッセージを送信
  - 成功/失敗をUIに表示
  - 失敗理由を表示（タイムアウト、URLエラー等）

### WH-005: 管理画面リアルタイム通知

- **説明**: 管理画面にリアルタイムで通知を表示
- **Accept**:
  - SSE（Server-Sent Events）でプッシュ配信
  - トースト通知（画面右上に5秒表示）
  - 通知バッジ（未読件数表示）
  - 通知クリックで該当画面に遷移

### WH-006: 通知一覧

- **説明**: 管理画面で通知履歴を確認
- **Accept**:
  - 最新50件を一覧表示
  - 既読/未読状態管理
  - イベントタイプでフィルタリング

### WH-007: 通知設定

- **説明**: 管理画面通知のオン/オフ設定
- **Accept**:
  - イベントタイプごとに通知オン/オフ
  - ブラウザ通知（デスクトップ通知）許可設定

---

## 非機能要件（NFR）

### WH-100: パフォーマンス

- Webhook送信: 非同期（メイン処理をブロックしない）
- タイムアウト: 10秒

### WH-101: セキュリティ

- Webhook URLはDBに暗号化保存
- URLはhttpsのみ許可
- ローカルホスト/プライベートIP禁止

### WH-102: 監査

- 全送信履歴を30日間保持
- 送信成功/失敗、レスポンスコードを記録

---

## API仕様

### エンドポイント一覧

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| GET | `/api/v1/admin/webhooks` | Webhook一覧取得 | Session認証 |
| POST | `/api/v1/admin/webhooks` | Webhook登録 | Session認証 |
| PUT | `/api/v1/admin/webhooks/:id` | Webhook更新 | Session認証 |
| DELETE | `/api/v1/admin/webhooks/:id` | Webhook削除 | Session認証 |
| POST | `/api/v1/admin/webhooks/:id/test` | テスト送信 | Session認証 |
| GET | `/api/v1/admin/webhooks/:id/logs` | 送信履歴取得 | Session認証 |
| GET | `/api/v1/admin/notifications/stream` | SSEストリーム接続 | Session認証 |
| GET | `/api/v1/admin/notifications` | 通知一覧取得 | Session認証 |
| PUT | `/api/v1/admin/notifications/:id/read` | 既読マーク | Session認証 |
| PUT | `/api/v1/admin/notifications/read-all` | 全て既読 | Session認証 |

### エラーコード

| コード | ステータス | 説明 |
|:-------|:-----------|:-----|
| `UNAUTHORIZED` | 401 | 認証されていない |
| `FORBIDDEN` | 403 | 権限がない |
| `NOT_FOUND` | 404 | Webhookが存在しない |
| `VALIDATION_ERROR` | 400 | バリデーションエラー |
| `INVALID_URL` | 400 | 無効なURL形式（httpsのみ許可） |
| `WEBHOOK_LIMIT_EXCEEDED` | 400 | Webhook登録上限超過（MVP: 1件） |
| `TEST_SEND_FAILED` | 500 | テスト送信失敗 |

### リクエスト/レスポンス詳細

```json
// POST /api/v1/admin/webhooks
// Request
{
  "name": "フロントデスク通知",
  "url": "https://hooks.slack.com/services/xxx/yyy/zzz",
  "events": ["ORDER_CREATED", "HANDOFF_CREATED", "HANDOFF_TIMEOUT"],
  "isEnabled": true
}

// Response
{
  "success": true,
  "data": {
    "id": "wh_abc123",
    "name": "フロントデスク通知",
    "url": "https://hooks.slack.com/services/xxx/***",
    "events": ["ORDER_CREATED", "HANDOFF_CREATED", "HANDOFF_TIMEOUT"],
    "isEnabled": true,
    "createdAt": "2026-01-23T15:00:00+09:00"
  }
}

// Webhook ペイロード（Slack Block Kit形式）
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🛎️ 新規注文"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*部屋番号*\n301号室"
        },
        {
          "type": "mrkdwn",
          "text": "*注文内容*\nビール x2, 枝豆 x1"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*合計*: ¥1,500"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "注文ID: ORD-2026012300001"
        }
      ]
    }
  ]
}
```

---

## データベース設計

### Prismaスキーマ

```prisma
model Webhook {
  id          String   @id @default(cuid()) @map("id")
  tenantId    String   @map("tenant_id")
  name        String   @map("name")
  url         String   @map("url")           // 暗号化保存
  events      String[] @map("events")        // ['ORDER_CREATED', 'HANDOFF_CREATED', ...]
  isEnabled   Boolean  @default(true) @map("is_enabled")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  // Relations
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  logs        WebhookLog[]
  
  @@index([tenantId], map: "idx_webhooks_tenant")
  @@map("webhooks")
}

model WebhookLog {
  id          String   @id @default(cuid()) @map("id")
  webhookId   String   @map("webhook_id")
  eventType   String   @map("event_type")
  payload     Json     @map("payload")
  statusCode  Int?     @map("status_code")
  responseBody String? @map("response_body")
  isSuccess   Boolean  @map("is_success")
  errorMessage String? @map("error_message")
  attemptCount Int     @default(1) @map("attempt_count")
  createdAt   DateTime @default(now()) @map("created_at")
  
  // Relations
  webhook     Webhook  @relation(fields: [webhookId], references: [id], onDelete: Cascade)
  
  @@index([webhookId, createdAt], map: "idx_webhook_logs_webhook_date")
  @@map("webhook_logs")
}

model AdminNotification {
  id          String   @id @default(cuid()) @map("id")
  tenantId    String   @map("tenant_id")
  eventType   String   @map("event_type")  // ORDER_CREATED, HANDOFF_CREATED, etc.
  title       String   @map("title")
  body        String   @map("body")
  data        Json?    @map("data")        // イベント関連データ（orderId, roomId等）
  isRead      Boolean  @default(false) @map("is_read")
  createdAt   DateTime @default(now()) @map("created_at")
  
  // Relations
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId, isRead, createdAt], map: "idx_admin_notifications_tenant_unread")
  @@map("admin_notifications")
}
```

---

## UI/UX要件

### WH-200: Webhook管理画面

- パス: `/admin/settings/webhooks`
- 一覧表示（名前、URL（マスク）、有効/無効、イベント数）
- 新規登録/編集モーダル
- 削除確認ダイアログ

### WH-201: Webhook編集フォーム

- 名前（必須、最大50文字）
- URL（必須、https://で始まる）
- イベント選択（チェックボックス）
- 有効/無効トグル
- テスト送信ボタン

### WH-202: 送信履歴

- 最新20件を表示
- 成功/失敗アイコン
- 送信日時、イベントタイプ、ステータスコード

### WH-203: 管理画面通知トースト

- 画面右上に表示
- 5秒後に自動消去（ホバー中は維持）
- クリックで該当画面に遷移
- イベントタイプ別アイコン（注文: 🛎️、ハンドオフ: 🙋）

### WH-204: 通知バッジ

- ヘッダーのベルアイコンに未読件数表示
- 最大99+表示
- クリックで通知ドロップダウン表示

### WH-205: 通知ドロップダウン

- 最新10件を表示
- 既読/未読で背景色区別
- 「すべて既読にする」ボタン
- 「すべて表示」リンク（通知一覧画面へ）

### WH-206: 通知一覧画面

- パス: `/admin/notifications`
- 最新50件を一覧表示
- イベントタイプでフィルタリング
- 既読/未読フィルタ

---

## Config設定（Marketing Injection対応）

| 設定項目 | カテゴリ | キー | デフォルト値 |
|:---------|:---------|:-----|:------------|
| 最大Webhook数 | webhook | max_webhooks | 5 |
| リトライ回数 | webhook | max_retries | 3 |
| タイムアウト秒 | webhook | timeout_seconds | 10 |
| ログ保持日数 | webhook | log_retention_days | 30 |

---

## Analytics追跡（Tracking by Default）

| イベント | analytics-id | 記録先 |
|:---------|:-------------|:-------|
| Webhook登録 | `webhook-create` | DB |
| Webhook送信成功 | `webhook-send-success` | DB |
| Webhook送信失敗 | `webhook-send-failure` | DB |
| テスト送信 | `webhook-test` | GA4 |

---

## 実装チェックリスト

### 🔴 MVP（DEV-0310スコープ）

#### Phase 1: データベース
- [ ] webhooks テーブル作成（マイグレーション）
- [ ] webhook_logs テーブル作成（マイグレーション）
- [ ] URL暗号化対応（encryption_key設定）

#### Phase 2: API（hotel-common）
- [ ] GET /api/v1/admin/webhooks（1件取得）
- [ ] POST /api/v1/admin/webhooks（登録）
- [ ] PUT /api/v1/admin/webhooks/:id（更新）
- [ ] DELETE /api/v1/admin/webhooks/:id（削除）
- [ ] POST /api/v1/admin/webhooks/:id/test（テスト送信）
- [ ] Webhook送信サービス実装（リトライ付き）

#### Phase 3: イベント発火
- [ ] 注文作成時のWebhook発火（ORDER_CREATED）
- [ ] ハンドオフ作成時のWebhook発火（HANDOFF_CREATED）
- [ ] ハンドオフタイムアウト時のWebhook発火（HANDOFF_TIMEOUT）

#### Phase 4: 管理画面通知API（hotel-common）
- [ ] admin_notifications テーブル作成
- [ ] SSEエンドポイント実装（/api/v1/admin/notifications/stream）
- [ ] 通知一覧API（GET /api/v1/admin/notifications）
- [ ] 既読API（PUT /api/v1/admin/notifications/:id/read）
- [ ] 全既読API（PUT /api/v1/admin/notifications/read-all）
- [ ] イベント発生時に通知レコード作成

#### Phase 5: 管理UI - Webhook設定（hotel-saas）
- [ ] プロキシAPI実装
- [ ] Webhook設定画面（/admin/settings/webhooks）
- [ ] 登録/編集フォーム
- [ ] テスト送信ボタン
- [ ] 成功/失敗フィードバック表示

#### Phase 6: 管理UI - リアルタイム通知（hotel-saas）
- [ ] SSE接続composable（useNotifications）
- [ ] トースト通知コンポーネント
- [ ] 通知バッジ（ヘッダー）
- [ ] 通知ドロップダウン
- [ ] 通知一覧画面（/admin/notifications）

#### Phase 7: テスト
- [ ] 単体テスト（API）
- [ ] 統合テスト（Webhook送信）
- [ ] 統合テスト（SSE通知）
- [ ] Evidence整備

### 🟡 Phase 2（将来対応）

- [ ] 複数Webhook登録（最大5件）
- [ ] 送信履歴ビューア（管理画面）
- [ ] カスタムペイロードテンプレート
- [ ] イベントごとの有効/無効設定

---

## ✅ Acceptance Criteria（DEV-0310）

### AC-001: Webhook登録

```gherkin
Given 管理者がWebhook設定画面にいる
When Webhook URLを入力して保存する
Then Webhookが登録される
  And URLが暗号化されてDBに保存される
```

### AC-002: Webhook送信（注文作成時）

```gherkin
Given Webhookが有効に設定されている
When ゲストが注文を作成する
Then 設定されたURLにWebhookが送信される
  And 送信結果がwebhook_logsに記録される
```

### AC-003: Webhook送信（ハンドオフ時）

```gherkin
Given Webhookが有効に設定されている
When ハンドオフリクエストが作成される
Then 設定されたURLにWebhookが送信される
```

### AC-004: テスト送信

```gherkin
Given Webhookが登録されている
When 管理者がテスト送信ボタンをクリック
Then テストメッセージが送信される
  And 成功/失敗がUIに表示される
```

### AC-005: リトライ

```gherkin
Given Webhook送信が失敗した
When リトライが実行される
Then 最大3回まで再試行される（1秒、5秒、30秒間隔）
  And 全リトライ失敗時はログに記録される
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-01-23 | 1.0.0 | 初版作成（DEV-0250: 通知Webhook設定） |
| 2026-02-02 | 2.0.0 | DEV-0310: MVP仕様確定（1件登録、汎用Webhook、履歴UIはPhase2） |
| 2026-02-02 | 2.1.0 | 管理画面リアルタイム通知機能追加（SSE、トースト、バッジ） |
