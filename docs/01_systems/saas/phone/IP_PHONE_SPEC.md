# IP内線電話システム拡張仕様書
*Status: draft — 2025-06-05*

## 1. 概要
ホテル客室からフロントデスクへの内線電話機能を拡張し、Androidスマホでの応対、複数ホテル対応、内線経由の注文処理機能を実装します。これにより、ホテル運営の効率化と柔軟な人員配置が可能になります。

## 2. 機能要件

| ID | カテゴリ | 内容 | DoD |
|----|----------|------|-----|
| **P-01** | モバイル対応 | Androidスマホでの内線受電 | バックグラウンドでも確実に着信通知 |
| **P-02** | ネットワーク | 異なるネットワーク間での通話対応 | 複数ホテル間でも安定した通話品質 |
| **P-03** | ホテル識別 | 着信元ホテル・部屋の識別表示 | オペレーターが瞬時に判別可能 |
| **P-04** | 注文処理 | 内線経由の注文処理機能 | 部屋番号選択から注文完了まで3ステップ以内 |
| **P-05** | 履歴管理 | 着信・通話履歴の管理画面表示 | 日時・部屋・内容で検索可能 |
| **P-06** | 音声文字起こし | 通話内容の自動文字起こし | 85%以上の認識精度 |

## 3. 技術仕様

### 3.1 フロントエンド
- 客室UI: WebRTCベースの通話インターフェース
- スタッフ用アプリ: 
  - 方式1: Android専用アプリ（推奨）
  - 方式2: PWA（Progressive Web App）+ 通知API
- 通話状態表示（通話中、保留、転送等）
- ホテル・部屋情報表示
- 注文入力インターフェース

### 3.2 バックエンド
- WebRTC/SIPシグナリングサーバー
- STUN/TURNサーバー（NAT越え対応）
- 通話録音・文字起こしサービス連携
- WebSocket通知システム
- マルチテナント対応データモデル

### 3.3 データモデル
```prisma
// ホテル情報（マルチテナント対応）
model Hotel {
  id            String    @id @default(uuid())
  name          String
  code          String    @unique
  address       String?
  phoneNumber   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // 関連付け
  rooms         Room[]
  callLogs      CallLog[]
  operators     Operator[]
}

// オペレーター情報
model Operator {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  deviceToken   String?   // モバイルプッシュ通知用
  isActive      Boolean   @default(true)
  hotelId       String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // 関連付け
  hotel         Hotel     @relation(fields: [hotelId], references: [id])
  callLogs      CallLog[] @relation("OperatorCalls")
}

// 通話履歴
model CallLog {
  id            String    @id @default(uuid())
  roomId        String
  hotelId       String
  operatorId    String?
  startTime     DateTime  @default(now())
  endTime       DateTime?
  duration      Int?      // 秒単位
  status        String    // "completed", "missed", "failed"
  recordingUrl  String?
  transcription String?   @db.Text
  orderCreated  Boolean   @default(false)
  
  // 関連付け
  room          Room      @relation(fields: [roomId], references: [id])
  hotel         Hotel     @relation(fields: [hotelId], references: [id])
  operator      Operator? @relation("OperatorCalls", fields: [operatorId], references: [id])
  order         Order?
}

// 電話注文
model Order {
  id            String    @id @default(uuid())
  callLogId     String?   @unique
  roomId        String
  createdAt     DateTime  @default(now())
  createdBy     String    // オペレーターID or "app"
  status        String    // "pending", "preparing", "delivered", etc.
  orderSource   String    @default("phone") // "phone" or "app"
  
  // 関連付け
  room          Room      @relation(fields: [roomId], references: [id])
  callLog       CallLog?  @relation(fields: [callLogId], references: [id])
  items         OrderItem[]
}
```

## 4. APIエンドポイント

```
# 内線通話API
get /api/v1/phone/status:
  response: { available: boolean, operatorCount: number }

post /api/v1/phone/call:
  body: { roomId: string }
  response: { callId: string, status: string }

# WebRTCシグナリング
ws /ws/signaling:
  events:
    - offer: { type: 'offer', sdp: string, callId: string, roomId: string, hotelId: string }
    - answer: { type: 'answer', sdp: string, callId: string }
    - ice-candidate: { candidate: RTCIceCandidate, callId: string }
    
# オペレーター管理API
post /api/v1/admin/phone/operators:
  body: { name: string, email: string, hotelIds: string[] }
  response: Operator

put /api/v1/admin/phone/operators/{id}/status:
  body: { isActive: boolean }
  response: { success: boolean }

# 通話履歴API
get /api/v1/admin/phone/calls:
  query: { hotelId?: string, from?: date, to?: date, roomId?: string }
  response: { items: CallLog[] }

get /api/v1/admin/phone/calls/{id}/transcript:
  response: { transcript: string, confidence: number }

# 電話注文API
post /api/v1/admin/orders/phone:
  body: { 
    callLogId: string,
    roomId: string,
    items: Array<{menuId: string, quantity: number, notes?: string}>
  }
  response: Order
```

## 5. クライアント要件

### 5.1 スタッフ用アプリ機能
- 高優先度の着信通知（バックグラウンド時も確実に通知）
- 着信時のホテル名・部屋番号表示
- 通話画面から注文入力画面への直接遷移
- 通話の録音・一時停止機能
- 通話履歴の閲覧

### 5.2 システム要件
- Android 10以上対応
- バックグラウンド実行許可
- マイク・スピーカーアクセス権限
- 通知許可（最高優先度）
- バッテリー最適化除外設定

## 6. ユーザーフロー

### 6.1 客室からの発信フロー
1. 客室UIで内線ボタンをタップ
2. 通話相手（フロント等）を選択
3. 発信中画面表示
4. 通話開始・会話
5. 通話終了

### 6.2 オペレーター受電フロー
1. 着信通知（ホテル名・部屋番号付き）
2. 応答・通話
3. 必要に応じて注文聴取
4. 通話終了
5. 注文入力画面に遷移（オプション）
6. 部屋番号確認→メニュー選択→数量入力→注文確定

## 7. 通話録音と文字起こし

### 7.1 録音機能
- 通話開始時に自動録音開始
- オペレーターによる録音一時停止・再開
- 通話終了時に録音ファイルをサーバーに転送

### 7.2 文字起こし機能
- 録音データからの非同期文字起こし処理
- 文字起こし結果は通話履歴と紐付けて保存
- 管理画面から文字データとして参照可能

## 8. 安全性とプライバシー

- 通話データの暗号化（SRTP/DTLS）
- 録音データのアクセス制限
- 文字起こしデータの保護
- 録音・文字起こしの開始時に自動アナウンス
- データ保持期間の設定（デフォルト30日）

## 9. 拡張性と将来計画

- 音声認識による自動注文処理
- AIによる応対品質の分析
- IVR（自動音声応答）システム連携
- ビデオ通話対応
- チャット機能統合 