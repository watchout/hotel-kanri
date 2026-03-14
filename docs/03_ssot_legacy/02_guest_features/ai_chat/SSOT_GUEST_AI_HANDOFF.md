# SSOT_GUEST_AI_HANDOFF.md

**バージョン**: 1.1.0  
**最終更新**: 2026-01-19  
**ドキュメントID**: SSOT-GUEST-HANDOFF-001

## 概要

- **目的**: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフへ引き継ぎ、対応できない場合は電話CTAを表示することで顧客満足度を維持する
- **適用範囲**: hotel-common（API）、hotel-saas（ゲストUI）、フロントデスクシステム（スタッフUI）
- **関連SSOT**:
  - `SSOT_SAAS_DEVICE_AUTHENTICATION.md`（ゲストデバイス認証）
  - `SSOT_SAAS_ADMIN_AUTHENTICATION.md`（スタッフSession認証）
  - `SSOT_API_REGISTRY.md`（API定義）
  - `SSOT_GUEST_AI_FAQ_AUTO_RESPONSE.md`（handoff呼び出し元）

## 要件ID体系

- HDF（HandoFF）-001〜099: 機能要件
- HDF-100〜199: 非機能要件
- HDF-200〜299: UI/UX要件
- HDF-300〜399: ビジネス要件

## 機能要件（FR）

### HDF-001: ハンドオフリクエスト作成

- **説明**: ゲストがAIチャットからスタッフ対応を要求できる
- **Accept**: 
  - tenantId、sessionId、roomId、channel、contextを含むリクエストが作成される
  - 作成と同時にフロントデスクへ通知が送信される
  - 60秒のタイムアウトタイマーが開始される

### HDF-002: スタッフ通知

- **説明**: フロントデスクスタッフにリアルタイムで通知を送信
- **Accept**:
  - フロントデスクPC/タブレットにポップアップ通知が表示される
  - ゲスト情報（部屋番号、氏名）と問い合わせ履歴が確認できる
  - 「対応中」「後で対応」の選択が可能
- **Phase**: Phase 2（MVPスコープ外）

### HDF-003: タイムアウト処理

- **説明**: 60秒以内にスタッフ応答がない場合の自動処理
- **Accept**:
  - カウントダウン表示が0になると電話CTAを表示
  - ハンドオフステータスが"TIMEOUT"に更新される
  - 内線番号が強調表示される

### HDF-004: 夜間自動無効化

- **説明**: 23:00-07:00の時間帯はハンドオフ機能を無効化
- **Accept**:
  - 指定時間帯はハンドオフボタンが非表示
  - 「夜間のため、緊急時のみフロントデスクまでお電話ください」を表示
- **Phase**: Phase 2（MVPスコープ外）

## 非機能要件（NFR）

### HDF-100: 性能要件

- API応答時間: 2秒以内（95パーセンタイル）
- 同時接続数: 最大100リクエスト/分
- 通知遅延: 1秒以内

### HDF-101: セキュリティ要件

- **ゲスト認証**: デバイス認証（device_rooms経由、`SSOT_SAAS_DEVICE_AUTHENTICATION.md`参照）
- **スタッフ認証**: Session認証（Redis + HttpOnly Cookie、`SSOT_SAAS_ADMIN_AUTHENTICATION.md`参照）
- レート制限: 1デバイスあたり10分間に3回まで
- 監査ログ: 90日間保持
- XSS対策: メッセージ内容のサニタイゼーション
- context最大サイズ: 10KB

### HDF-102: 可用性要件

- SLA: 99.9%（月次）
- 障害時フォールバック: 電話CTAを即座に表示
- バックアップ: 通知履歴の自動保存

## API仕様

### エンドポイント一覧

**ゲスト向けAPI（デバイス認証）**

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| POST | `/api/v1/guest/handoff/requests` | ハンドオフリクエストを作成 | デバイス認証 |
| GET | `/api/v1/guest/handoff/requests/:id` | 自分のリクエスト詳細を取得 | デバイス認証 |

**スタッフ向けAPI（Session認証）**

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| GET | `/api/v1/admin/handoff/requests` | リクエスト一覧を取得 | Session認証 |
| GET | `/api/v1/admin/handoff/requests/:id` | リクエスト詳細を取得 | Session認証 |
| PATCH | `/api/v1/admin/handoff/requests/:id/status` | ステータスを更新 | Session認証 |

### リクエスト/レスポンス詳細

```json
// POST /api/v1/guest/handoff/requests
// Request
{
  "sessionId": "chat_session_123",
  "channel": "front_desk",
  "context": {
    "lastMessages": [{
      "role": "user",
      "content": "予約の変更をしたい",
      "timestamp": "2024-01-01T10:00:00Z"
    }],
    "currentTopic": "reservation_change"
  }
}

// Response
{
  "success": true,
  "data": {
    "id": "handoff_789",
    "status": "pending",
    "createdAt": "2024-01-01T10:00:30Z",
    "estimatedWaitTime": 60,
    "fallbackPhoneNumber": "内線100"
  }
}
```

## データベース設計

### テーブル定義（Prisma Schema）

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
  
  // Relations
  tenant          Tenant           @relation(fields: [tenantId], references: [id])
  
  @@map("handoff_requests")
  @@index([tenantId], map: "idx_handoff_requests_tenant")
  @@index([status, createdAt], map: "idx_handoff_requests_status_created")
  @@index([roomId], map: "idx_handoff_requests_room")
  @@index([staffId], map: "idx_handoff_requests_staff")
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

## UI/UX要件

### HDF-200: 画面一覧

**ゲスト側（hotel-saas）**

1. ハンドオフ提案画面
2. 待機状態画面（60秒カウントダウン付き）
3. 電話CTA画面（内線番号強調表示）
4. エラー時フォールバック画面

**スタッフ側（Phase 2で開発）**

1. 通知ポップアップ
2. ゲスト情報・履歴表示モーダル
3. 管理画面（未対応一覧）

### HDF-201: 多言語対応

- 対応言語: 日本語、英語、中国語（簡体字）、韓国語
- 内線番号は数字で統一表示
- **Phase**: Phase 3（MVPスコープ外）

### HDF-202: アクセシビリティ

- WCAG AA準拠（コントラスト比4.5:1以上）
- 音声読み上げ対応（aria-live）
- キーボード操作可能
- 内線番号は24px以上のフォントサイズ

## ビジネス指標

### HDF-300: ROI

- **スタッフ時間削減**: 30%（月次目標）
- **顧客満足度向上**: NPS +5〜10ポイント
- **コスト削減効果**: 人件費 数千〜数万円/月

### HDF-301: KPI

| KPI | 目標値 | 測定方法 |
|-----|--------|----------|
| 問い合わせ対応時間削減 | 30%減少 | 平均対応時間の月次比較 |
| 顧客満足度（NPS） | +5ポイント | 四半期アンケート調査 |
| AI解決率 | 20%向上 | 総問い合わせ数に対するAI完結率 |
| ハンドオフ成功率 | 80%以上 | タイムアウト前のスタッフ応答率 |

## 実装チェックリスト

### 🔴 MVP（DEV-0170スコープ）

- [ ] HandoffRequestモデル作成（hotel-common）
- [ ] ゲスト向けAPI実装（POST/GET /api/v1/guest/handoff/requests）
- [ ] AIChatWidget.vueのhandleHandoff()実装
- [ ] 待機状態UI実装（60秒カウントダウン）
- [ ] 電話CTA表示（タイムアウト時）
- [ ] デバイス認証統合

### 🟡 Phase 2（MVPスコープ外）

- [ ] スタッフ向けAPI実装（/api/v1/admin/handoff/*）
- [ ] フロントデスク通知サービス実装
- [ ] スタッフ側UI開発（ポップアップ、管理画面）
- [ ] 夜間自動無効化機能（HDF-004）
- [ ] 監査ログ実装

### 🟢 Phase 3（将来）

- [ ] 多言語対応（HDF-201）
- [ ] パフォーマンステスト
- [ ] セキュリティテスト
- [ ] 運用マニュアル作成

## Config設定（Marketing Injection対応）

以下の設定値はConfig/DB管理とし、ハードコードしない：

| 設定項目 | デフォルト値 | 説明 |
|:---------|:------------|:-----|
| `handoff.timeout_seconds` | 60 | タイムアウト秒数 |
| `handoff.fallback_phone` | "内線100" | フォールバック電話番号 |
| `handoff.night_mode.start` | "23:00" | 夜間モード開始時刻 |
| `handoff.night_mode.end` | "07:00" | 夜間モード終了時刻 |

## Analytics追跡（Tracking by Default）

| イベント | analytics-id | 記録先 |
|:---------|:-------------|:-------|
| ハンドオフリクエスト作成 | `handoff-request-create` | DB必須 |
| 電話CTAクリック | `handoff-phone-cta-click` | DB必須 |
| タイムアウト発生 | `handoff-timeout` | DB必須 |
| スタッフ応答 | `handoff-staff-accept` | DB必須 |

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2024-01-01 | 1.0.0 | 初版作成 |
| 2026-01-19 | 1.1.0 | DEV-0171整合チェック: 認証方式修正（JWT→デバイス認証）、DB命名規則準拠（snake_case+@map+tenant_id）、APIパス設計（guest/admin分離）、MVP/Phase境界明確化、Marketing Injection対応追加 |
