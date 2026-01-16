# 有人ハンドオフ機能 技術要件定義書

## API設計

### エンドポイント一覧

| HTTP Method | Path | 説明 |
|------------|------|------|
| POST | `/api/v1/handoff/requests` | ハンドオフリクエストを作成 |
| GET | `/api/v1/handoff/requests/:id` | ハンドオフリクエストの詳細を取得 |
| PATCH | `/api/v1/handoff/requests/:id/status` | ハンドオフリクエストのステータスを更新 |
| GET | `/api/v1/handoff/requests` | ハンドオフリクエスト一覧を取得（スタッフ用） |

### リクエスト/レスポンス形式

#### POST `/api/v1/handoff/requests`
```json
// Request
{
  "sessionId": "chat_session_123",
  "guestId": "guest_456",
  "channel": "front_desk",
  "context": {
    "lastMessages": [
      {
        "role": "user",
        "content": "予約の変更をしたい",
        "timestamp": "2024-01-01T10:00:00Z"
      }
    ],
    "currentTopic": "reservation_change"
  }
}

// Response
{
  "id": "handoff_789",
  "status": "pending",
  "createdAt": "2024-01-01T10:00:30Z",
  "estimatedWaitTime": 60
}
```

#### PATCH `/api/v1/handoff/requests/:id/status`
```json
// Request
{
  "status": "accepted",
  "staffId": "staff_123"
}

// Response
{
  "id": "handoff_789",
  "status": "accepted",
  "staffId": "staff_123",
  "acceptedAt": "2024-01-01T10:01:00Z"
}
```

## データベース設計

### Prismaスキーマ例

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

model HandoffNotification {
  id              String           @id @default(cuid())
  handoffId       String
  notificationType String          // "created", "timeout_warning", "timeout"
  sentAt          DateTime         @default(now())
  
  handoffRequest  HandoffRequest   @relation(fields: [handoffId], references: [id])
  
  @@index([handoffId])
}
```

## システム間連携

### 役割分担

#### hotel-common (API)
- ハンドオフリクエストのCRUD操作
- スタッフへの通知処理
- タイムアウト処理（バックグラウンドジョブ）
- セッション情報の管理

#### hotel-saas (ゲストUI)
- AIChatWidget.vue内でのハンドオフ処理
- タイムアウト時の電話CTA表示
- リアルタイム状態更新（ポーリング or WebSocket）

### 認証・認可要件

- **ゲスト認証**: JWTトークンによるゲスト識別
- **スタッフ認証**: 別途スタッフ用認証システムと連携
- **権限管理**: 
  - ゲスト: 自身のハンドオフリクエストのみアクセス可
  - スタッフ: 全てのハンドオフリクエストにアクセス可

## セキュリティ要件

### 入力検証
- sessionId: 存在するセッションIDかつ要求者のセッション
- channel: 許可されたチャネル値（現在は "front_desk" のみ）
- context: 最大サイズ制限（例: 10KB）
- XSS対策: メッセージ内容のサニタイゼーション

### 認証・認可
- APIレベル: Bearer tokenによる認証
- リクエストレベル: guestIdとtokenの整合性チェック
- レート制限: 1ゲストあたり10分間に3回まで

### 監査ログ
- 全てのハンドオフリクエスト作成をログ記録
- スタッフのアクション（accept/complete）をログ記録
- ログ保持期間: 90日間

## 実装チェックリスト

### hotel-common
- [ ] HandoffRequestモデルの作成（Prisma）
- [ ] ハンドオフリクエストCRUD APIの実装
- [ ] フロントデスク通知サービスの実装
- [ ] タイムアウト処理用バックグラウンドジョブの実装
- [ ] 認証ミドルウェアの更新
- [ ] レート制限の実装
- [ ] 監査ログの実装

### hotel-saas
- [ ] AIChatWidget.vueのhandleHandoff()実装
- [ ] ハンドオフ待機中UIの実装
- [ ] 60秒タイマー処理の実装
- [ ] タイムアウト時の電話CTA表示
- [ ] ステータス更新のポーリング処理
- [ ] エラーハンドリングとリトライ処理

### 共通
- [ ] APIクライアントの実装（hotel-saas → hotel-common）
- [ ] エラーメッセージの国際化対応
- [ ] E2Eテストシナリオの作成
- [ ] パフォーマンステスト（同時接続数）
- [ ] セキュリティテスト（入力検証、認証）