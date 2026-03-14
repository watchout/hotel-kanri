# SSOT_DEV-0210_REQUIRED_LOGGING.md

**バージョン**: 1.0.0  
**最終更新**: 2026-01-23  
**ドキュメントID**: SSOT-FOUNDATION-LOG-001  
**タスクID**: DEV-0210（親）, DEV-0211〜0214（サブタスク）

---

## 概要

- **目的**: MVP段階で必須となる3つのログイベント（ANSWER_SHOWN, LINK_CLICK, HANDOFF_TRIGGERED）を確実に記録し、KPI測定の基盤を構築する
- **適用範囲**: hotel-common（ログ記録）、hotel-saas（イベント発火）
- **関連SSOT**:
  - `SSOT_MARKETING_INTEGRATION.md`（Tracking by Default）
  - `SSOT_GUEST_AI_FAQ_AUTO_RESPONSE.md`（FAQ自動応答）
  - `SSOT_GUEST_AI_HANDOFF.md`（ハンドオフ）

---

## 要件ID体系

- LOG-001〜099: 機能要件
- LOG-100〜199: 非機能要件

---

## 機能要件（FR）

### LOG-001: ANSWER_SHOWN イベント

- **説明**: AIがFAQ回答を表示した時点で記録
- **Accept**:
  - テナントID、セッションID、部屋ID、質問内容、回答ID、タイムスタンプを記録
  - 同一質問でも毎回記録（重複許可）
  - レスポンス内での記録（非同期可）

### LOG-002: LINK_CLICK イベント

- **説明**: AI回答内のディープリンクがクリックされた時点で記録
- **Accept**:
  - テナントID、セッションID、リンクURL、リンクタイプ、元の回答IDを記録
  - クリック位置（回答内の何番目のリンクか）も記録
  - フロントエンドからのイベント送信

### LOG-003: HANDOFF_TRIGGERED イベント

- **説明**: ハンドオフがトリガーされた時点で記録
- **Accept**:
  - テナントID、セッションID、部屋ID、トリガー理由、ハンドオフリクエストIDを記録
  - 既存のHandoffRequest作成と連動

### LOG-004: ログエクスポート

- **説明**: 管理者がログをCSV/JSON形式でエクスポート可能
- **Accept**:
  - 日付範囲指定可能
  - イベントタイプでフィルタ可能
  - 最大10万件までエクスポート

---

## 非機能要件（NFR）

### LOG-100: パフォーマンス

- ログ記録: 100ms以内（非同期処理可）
- ログ取得: 1秒以内（1000件まで）

### LOG-101: データ保持

- ログ保持期間: 90日（デフォルト）
- テナントごとに設定可能

### LOG-102: 整合性

- ログはイミュータブル（更新・削除不可）
- 論理削除のみ許可

---

## API仕様

### エンドポイント一覧

**ログ記録API（内部用 / hotel-saas → hotel-common）**

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| POST | `/api/v1/internal/logs/events` | イベントログを記録 | 内部認証 |

**管理API**

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| GET | `/api/v1/admin/logs/events` | イベントログ一覧取得 | Session認証 |
| GET | `/api/v1/admin/logs/events/export` | ログエクスポート | Session認証 |
| GET | `/api/v1/admin/logs/summary` | ログサマリー取得 | Session認証 |

### リクエスト/レスポンス詳細

```json
// POST /api/v1/internal/logs/events
// Request
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

// Response
{
  "success": true,
  "data": {
    "id": "log_abc123",
    "eventType": "ANSWER_SHOWN",
    "createdAt": "2026-01-23T15:00:00+09:00"
  }
}

// GET /api/v1/admin/logs/summary
// Response
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

---

## データベース設計

### Prismaスキーマ

```prisma
model EventLog {
  id          String   @id @default(cuid()) @map("id")
  tenantId    String   @map("tenant_id")
  eventType   String   @map("event_type")  // 'ANSWER_SHOWN' | 'LINK_CLICK' | 'HANDOFF_TRIGGERED'
  sessionId   String?  @map("session_id")
  roomId      String?  @map("room_id")
  metadata    Json     @map("metadata")
  createdAt   DateTime @default(now()) @map("created_at")
  
  // Relations
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId, eventType, createdAt], map: "idx_event_logs_tenant_type_date")
  @@index([sessionId], map: "idx_event_logs_session")
  @@map("event_logs")
}

enum EventType {
  ANSWER_SHOWN
  LINK_CLICK
  HANDOFF_TRIGGERED
  
  @@map("event_type")
}
```

---

## フロントエンド実装

### イベント発火箇所

```typescript
// ANSWER_SHOWN: AIChatWidget.vue
// FAQ回答表示時に発火
async function onAnswerDisplayed(answer: FaqAnswer) {
  await logEvent('ANSWER_SHOWN', {
    questionText: currentQuestion.value,
    answerId: answer.id,
    answerCategory: answer.category
  })
}

// LINK_CLICK: AIChatWidget.vue
// ディープリンククリック時に発火
async function onLinkClick(url: string, linkIndex: number, answerId: string) {
  await logEvent('LINK_CLICK', {
    linkUrl: url,
    linkIndex,
    answerId
  })
}

// HANDOFF_TRIGGERED: 既存のhandoff.routes.tsで記録
```

### logEvent ユーティリティ

```typescript
// composables/useEventLog.ts
export function useEventLog() {
  const logEvent = async (
    eventType: 'ANSWER_SHOWN' | 'LINK_CLICK' | 'HANDOFF_TRIGGERED',
    metadata: Record<string, unknown>
  ) => {
    try {
      await $fetch('/api/v1/internal/logs/events', {
        method: 'POST',
        body: { eventType, metadata }
      })
    } catch (error) {
      console.warn('[EventLog] Failed to log event:', error)
      // ログ失敗はサイレントに処理（UXを阻害しない）
    }
  }
  
  return { logEvent }
}
```

---

## Config設定（Marketing Injection対応）

| 設定項目 | カテゴリ | キー | デフォルト値 |
|:---------|:---------|:-----|:------------|
| ログ保持日数 | logging | retention_days | 90 |
| ログ有効化 | logging | enabled | true |

---

## 実装チェックリスト

### 🔴 MVP（DEV-0210スコープ）

- [ ] EventLog テーブル作成（マイグレーション）
- [ ] POST /api/v1/internal/logs/events 実装
- [ ] GET /api/v1/admin/logs/events 実装
- [ ] GET /api/v1/admin/logs/summary 実装
- [ ] hotel-saas プロキシ実装
- [ ] useEventLog composable 作成
- [ ] AIChatWidget.vue にログ発火追加
- [ ] テスト: 3イベントが正常に記録される

### 🟡 Phase 2

- [ ] GET /api/v1/admin/logs/events/export 実装
- [ ] 詳細なログ分析ダッシュボード

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2026-01-23 | 1.0.0 | 初版作成（DEV-0210: 必須ログ3イベント） |
