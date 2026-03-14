# SSOT_有人ハンドオフ機能.md

## 概要
- **目的**: AIチャットでは対応困難な問い合わせを、60秒以内にスタッフへ引き継ぎ、対応できない場合は電話CTAを表示することで顧客満足度を維持する
- **適用範囲**: hotel-common（API）、hotel-saas（ゲストUI）、フロントデスクシステム（スタッフUI）
- **関連SSOT**: SSOT_AIチャット機能.md、SSOT_ゲスト認証.md、SSOT_スタッフ管理.md

## 要件ID体系
- HDF（HandoFF）-001〜099: 機能要件
- HDF-100〜199: 非機能要件
- HDF-200〜299: UI/UX要件
- HDF-300〜399: ビジネス要件

## 機能要件（FR）

### HDF-001: ハンドオフリクエスト作成
- **説明**: ゲストがAIチャットからスタッフ対応を要求できる
- **Accept**: 
  - sessionId、guestId、channel、contextを含むリクエストが作成される
  - 作成と同時にフロントデスクへ通知が送信される
  - 60秒のタイムアウトタイマーが開始される

### HDF-002: スタッフ通知
- **説明**: フロントデスクスタッフにリアルタイムで通知を送信
- **Accept**:
  - フロントデスクPC/タブレットにポップアップ通知が表示される
  - ゲスト情報（部屋番号、氏名）と問い合わせ履歴が確認できる
  - 「対応中」「後で対応」の選択が可能

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

## 非機能要件（NFR）

### HDF-100: 性能要件
- API応答時間: 2秒以内（95パーセンタイル）
- 同時接続数: 最大100リクエスト/分
- 通知遅延: 1秒以内

### HDF-101: セキュリティ要件
- ゲスト認証: JWTトークンによる識別
- レート制限: 1ゲストあたり10分間に3回まで
- 監査ログ: 90日間保持
- XSS対策: メッセージ内容のサニタイゼーション
- context最大サイズ: 10KB

### HDF-102: 可用性要件
- SLA: 99.9%（月次）
- 障害時フォールバック: 電話CTAを即座に表示
- バックアップ: 通知履歴の自動保存

## API仕様

### エンドポイント一覧

| HTTP Method | Path | 説明 | 認証 |
|------------|------|------|------|
| POST | `/api/v1/handoff/requests` | ハンドオフリクエストを作成 | ゲスト |
| GET | `/api/v1/handoff/requests/:id` | ハンドオフリクエストの詳細を取得 | ゲスト/スタッフ |
| PATCH | `/api/v1/handoff/requests/:id/status` | ステータスを更新 | スタッフ |
| GET | `/api/v1/handoff/requests` | リクエスト一覧を取得 | スタッフ |

### リクエスト/レスポンス詳細

```json
// POST /api/v1/handoff/requests
// Request
{
  "sessionId": "chat_session_123",
  "guestId": "guest_456",
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
  "id": "handoff_789",
  "status": "pending",
  "createdAt": "2024-01-01T10:00:30Z",
  "estimatedWaitTime": 60,
  "fallbackPhoneNumber": "内線100"
}
```

## データベース設計

### テーブル定義（Prisma Schema）

```prisma
model HandoffRequest {
  id              String           @id @default(cuid())
  sessionId       String
  guestId         String
  channel         String           @default("front_desk")
  status          HandoffStatus    @default(PENDING)
  context         Json
  staffId         String?
  createdAt       DateTime         @default(now())
  acceptedAt      DateTime?
  completedAt     DateTime?
  timeoutAt       DateTime
  
  // Relations
  guest           Guest            @relation(fields: [guestId], references: [id])
  staff           Staff?           @relation(fields: [staffId], references: [id])
  chatSession     ChatSession      @relation(fields: [sessionId], references: [id])
  
  @@index([status, createdAt])
  @@index([guestId])
  @@index([staffId])
}

enum HandoffStatus {
  PENDING     // 待機中
  ACCEPTED    // スタッフが対応開始
  COMPLETED   // 対応完了
  TIMEOUT     // タイムアウト
  CANCELLED   // キャンセル
}
```

## UI/UX要件

### HDF-200: 画面一覧

**ゲスト側（hotel-saas）**
1. ハンドオフ提案画面
2. 待機状態画面（60秒カウントダウン付き）
3. 電話CTA画面（内線番号強調表示）
4. エラー時フォールバック画面

**スタッフ側（新規開発）**
1. 通知ポップアップ
2. ゲスト情報・履歴表示モーダル
3. 管理画面（未対応一覧）

### HDF-201: 多言語対応
- 対応言語: 日本語、英語、中国語（簡体字）、韓国語
- 内線番号は数字で統一表示

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

### Phase 1: 基本機能実装（2週間）
- [ ] HandoffRequestモデル作成（hotel-common）
- [ ] ハンドオフCRUD API実装
- [ ] AIChatWidget.vueのhandleHandoff()実装
- [ ] 待機状態UI実装（カウントダウン付き）
- [ ] 基本的な認証・認可実装

### Phase 2: 通知・運用機能（2週間）
- [ ] フロントデスク通知サービス実装
- [ ] スタッフ側UI開発（ポップアップ、管理画面）
- [ ] タイムアウト処理実装
- [ ] 夜間自動無効化機能
- [ ] 監査ログ実装

### Phase 3: 品質向上・最適化（1週間）
- [ ] エラーハンドリング強化
- [ ] 多言語対応
- [ ] パフォーマンステスト
- [ ] セキュリティテスト
- [ ] E2Eテストシナリオ作成
- [ ] 運用マニュアル作成

## 変更履歴
| 日付 | バージョン | 変更内容 |
|------|------------|----------|
| 2024-01-01 | 1.0 | 初版作成 |