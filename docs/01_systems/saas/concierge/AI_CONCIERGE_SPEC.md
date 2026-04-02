# AIコンシェルジュ機能仕様書
*Status: draft — 2025-06-01*

## 1. 概要
ホテル客室向けAIコンシェルジュ機能は、宿泊客が施設情報や周辺観光情報などを簡単に得られるようにするチャットインターフェースです。客室TOPページからアクセス可能で、多言語対応し、カスタマイズされた回答を提供します。

## 2. 機能要件

| ID | カテゴリ | 内容 | DoD |
|----|----------|------|-----|
| **C-01** | 基本機能 | チャットボット形式のAIコンシェルジュ | 自然な対話が可能 |
| **C-02** | 知識ベース | RAG方式での情報提供 | アップロード資料に基づく回答 |
| **C-03** | 多言語対応 | 旅行客Top10言語対応 | 各言語で適切な応答 |
| **C-04** | UI | 客室TOPページのアイコンメニューに統合 | 視認性と使いやすさの確認 |
| **C-05** | コンテンツ管理 | 管理画面からの資料アップロード | PDF/テキスト/画像対応 |
| **C-06** | 利用制限 | 時間/回数による制限機能 | コスト管理効果の確認 |
| **C-07** | 分析機能 | 会話ログの保存と分析 | インサイト抽出可能 |

## 3. 技術仕様

### 3.1 フロントエンド
- チャットボットUIコンポーネント（Nuxt 3）
- WebSocket接続によるリアルタイム対話
- 多言語切替インターフェース
- 将来的に3Dアバター表示（MVPでは対象外）

### 3.2 バックエンド
- 外部AIサービス連携（OpenAI API等）
- RAGアーキテクチャ実装
  - ベクトルデータベースでのドキュメント保存
  - 埋め込みモデルによる検索
- 会話履歴管理API
- 利用制限ロジック

### 3.3 データモデル
```prisma
// AIコンシェルジュ関連モデル
model AiKnowledgeBase {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  fileType    String   // "pdf", "text", "image"
  filePath    String
  language    String   @default("ja")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  vectorized  Boolean  @default(false)
}

model AiConversation {
  id          Int      @id @default(autoincrement())
  sessionId   String   // 会話セッションID
  roomId      String?  // 関連する部屋ID（オプション）
  deviceId    Int?     // 関連するデバイスID
  startedAt   DateTime @default(now())
  endedAt     DateTime?
  language    String   @default("ja")
  
  // 関連付け
  messages    AiMessage[]
  device      DeviceRoom? @relation(fields: [deviceId], references: [id])
}

model AiMessage {
  id            Int      @id @default(autoincrement())
  conversationId Int
  role          String   // "user" or "assistant"
  content       String   @db.Text
  timestamp     DateTime @default(now())
  
  // 関連付け
  conversation  AiConversation @relation(fields: [conversationId], references: [id])
}

model AiUsageLimit {
  id           Int      @id @default(autoincrement())
  deviceType   String?  // デバイスタイプに応じた制限
  maxQueriesPerHour Int
  maxQueriesPerDay  Int
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

## 4. APIエンドポイント

```
# AIコンシェルジュAPI
post /api/v1/concierge/chat:
  body: { 
    message: string, 
    sessionId?: string,
    language?: string 
  }
  response: { 
    answer: string, 
    sessionId: string,
    remainingQueries: number
  }

# 管理者用API
get /api/v1/admin/concierge/knowledge:
  response: { items: AiKnowledgeBase[] }

post /api/v1/admin/concierge/knowledge:
  body: FormData // ファイルアップロード
  response: AiKnowledgeBase

get /api/v1/admin/concierge/conversations:
  query: { from?: date, to?: date, roomId?: string }
  response: { items: AiConversation[] }

get /api/v1/admin/concierge/insights:
  response: { 
    topQuestions: Array<{question: string, count: number}>,
    languageDistribution: Array<{language: string, count: number}>,
    averageQueriesPerRoom: number,
    estimatedStaffHoursSaved: number
  }

post /api/v1/admin/concierge/limits:
  body: AiUsageLimit
  response: AiUsageLimit
```

## 5. 多言語対応

対応言語（旅行客TOP10）:
1. 日本語
2. 英語
3. 中国語（簡体字）
4. 中国語（繁体字）
5. 韓国語
6. タイ語
7. スペイン語
8. フランス語
9. ドイツ語
10. イタリア語

## 6. ユーザーフロー

1. 客室TOPページでAIコンシェルジュアイコンをタップ
2. チャットインターフェースが表示される
3. 言語選択（オプション）
4. 質問入力
5. リアルタイムで回答表示
6. 会話継続または終了

## 7. 管理者フロー

1. 管理画面でAIコンシェルジュ設定にアクセス
2. ホテル情報のアップロード（PDF、テキスト、画像）
3. 会話ログとインサイトの確認
4. 利用制限の設定
5. （将来的に）回答内容の編集・カスタマイズ

## 8. MVP範囲と今後の拡張

### MVP範囲
- チャットボット形式のUI
- 基本的な施設・観光情報の回答機能
- シンプルな管理画面
- 会話ログの保存
- 基本的な利用制限

### 将来拡張
- 3Dアバターによる対話
- 個人予約情報との連携
- 回答内容のカスタマイズ機能
- より高度なインサイト分析
- ホテルサービスの予約連携

## 9. 開発スケジュール案

| フェーズ | 内容 | 期間 |
|---------|------|------|
| 要件定義 | 詳細仕様の確定 | 1週間 |
| UI/UX設計 | チャットインターフェース設計 | 2週間 |
| バックエンド開発 | AI連携とRAG実装 | 3週間 |
| フロントエンド開発 | チャットUIとTOP統合 | 2週間 |
| 管理画面開発 | コンテンツ管理機能 | 2週間 |
| テスト | 機能・性能テスト | 2週間 |
| MVP展開 | 初期リリース | 1週間 |

## 10. 技術的考慮事項

- AIサービスの応答時間（目標: 2秒以内）
- ベクトルDBの選定（Pinecone, Qdrant, Weaviateなど）
- コスト管理（APIコール数の最適化）
- データプライバシー（個人情報の扱い）
- 言語処理の精度 