# AIコンシェルジュ レスポンスツリーAPI仕様書

## 概要
本ドキュメントは、AIコンシェルジュ機能のTV向け質問選択型インターフェースで使用するレスポンスツリーAPIの仕様を定義します。これらのAPIはhotel-common側で実装され、hotel-saasから利用されます。

## 前提条件
- ResponseTree、ResponseNode、ResponseNodeTranslation、ResponseTreeVersionモデルがhotel-commonのデータベースに既に存在していること
- 多言語対応が必要であること
- TVとモバイルデバイス間のセッション同期が必要であること

## API一覧

### 1. レスポンスツリー取得API

#### リクエスト
```
GET /api/v1/concierge/response-tree
```

**クエリパラメータ**
- `language` (オプション): 言語コード（例: ja, en, zh-CN）。デフォルトは 'ja'

#### レスポンス
```json
{
  "success": true,
  "data": {
    "id": "tree-id",
    "name": "ツリー名",
    "description": "ツリーの説明",
    "version": 1,
    "publishedAt": "2025-08-10T00:00:00Z",
    "nodes": [
      {
        "id": "node-id",
        "type": "category",
        "title": "カテゴリー名",
        "description": "カテゴリーの説明",
        "icon": "icon-name",
        "order": 1,
        "isRoot": true,
        "children": [
          {
            "id": "child-node-id",
            "type": "question",
            "title": "質問タイトル",
            "description": "質問の説明",
            "icon": "question-icon",
            "order": 1,
            "isRoot": false,
            "answer": {
              "text": "回答テキスト",
              "media": [
                {
                  "type": "image",
                  "url": "https://example.com/image.jpg",
                  "caption": "画像キャプション"
                }
              ],
              "relatedQuestions": ["related-question-id-1", "related-question-id-2"]
            },
            "children": []
          }
        ]
      }
    ]
  }
}
```

### 2. 特定ノード取得API

#### リクエスト
```
GET /api/v1/concierge/response-tree/node/{nodeId}
```

**パスパラメータ**
- `nodeId`: ノードID

**クエリパラメータ**
- `language` (オプション): 言語コード（例: ja, en, zh-CN）。デフォルトは 'ja'
- `includeChildren` (オプション): 子ノードを含めるかどうか。デフォルトは true

#### レスポンス
```json
{
  "success": true,
  "data": {
    "id": "node-id",
    "type": "question",
    "title": "質問タイトル",
    "description": "質問の説明",
    "icon": "question-icon",
    "order": 1,
    "isRoot": false,
    "answer": {
      "text": "回答テキスト",
      "media": [
        {
          "type": "image",
          "url": "https://example.com/image.jpg",
          "caption": "画像キャプション"
        }
      ],
      "relatedQuestions": [
        {
          "id": "related-question-id-1",
          "title": "関連質問1"
        },
        {
          "id": "related-question-id-2",
          "title": "関連質問2"
        }
      ]
    },
    "children": [
      {
        "id": "child-node-id",
        "type": "question",
        "title": "子質問タイトル",
        "icon": "question-icon",
        "order": 1
      }
    ],
    "breadcrumbs": [
      {
        "id": "root-node-id",
        "title": "ルートカテゴリー"
      },
      {
        "id": "parent-node-id",
        "title": "親カテゴリー"
      }
    ]
  }
}
```

### 3. レスポンスツリー検索API

#### リクエスト
```
POST /api/v1/concierge/response-tree/search
```

**リクエストボディ**
```json
{
  "query": "検索キーワード",
  "language": "ja"
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "node-id-1",
        "type": "question",
        "title": "検索結果の質問1",
        "breadcrumbs": [
          {
            "id": "root-node-id",
            "title": "ルートカテゴリー"
          }
        ],
        "highlight": "検索キーワードを含む<em>質問</em>テキスト"
      },
      {
        "id": "node-id-2",
        "type": "question",
        "title": "検索結果の質問2",
        "breadcrumbs": [
          {
            "id": "root-node-id",
            "title": "ルートカテゴリー"
          },
          {
            "id": "parent-node-id",
            "title": "親カテゴリー"
          }
        ],
        "highlight": "<em>検索キーワード</em>を含む回答テキスト"
      }
    ],
    "total": 2
  }
}
```

### 4. セッション作成/更新API

#### リクエスト
```
POST /api/v1/concierge/session
```

**リクエストボディ**
```json
{
  "sessionId": "既存セッションID（新規作成時は省略）",
  "deviceId": "デバイスID",
  "language": "ja",
  "currentNodeId": "現在表示中のノードID"
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "sessionId": "生成されたセッションID",
    "deviceId": "デバイスID",
    "language": "ja",
    "currentNodeId": "現在表示中のノードID",
    "createdAt": "2025-08-10T00:00:00Z",
    "updatedAt": "2025-08-10T00:00:00Z",
    "qrCode": "QRコード用のデータURI（Base64）"
  }
}
```

### 5. セッション取得API

#### リクエスト
```
GET /api/v1/concierge/session/{sessionId}
```

**パスパラメータ**
- `sessionId`: セッションID

#### レスポンス
```json
{
  "success": true,
  "data": {
    "sessionId": "セッションID",
    "deviceId": "デバイスID",
    "language": "ja",
    "currentNodeId": "現在表示中のノードID",
    "createdAt": "2025-08-10T00:00:00Z",
    "updatedAt": "2025-08-10T00:00:00Z",
    "messages": [
      {
        "id": "message-id-1",
        "role": "user",
        "content": "ユーザーメッセージ",
        "timestamp": "2025-08-10T00:01:00Z"
      },
      {
        "id": "message-id-2",
        "role": "assistant",
        "content": "アシスタントの回答",
        "timestamp": "2025-08-10T00:01:05Z"
      }
    ]
  }
}
```

### 6. QRセッション取得API

#### リクエスト
```
GET /api/v1/concierge/qr-session/{sessionId}
```

**パスパラメータ**
- `sessionId`: セッションID

#### レスポンス
```json
{
  "success": true,
  "data": {
    "sessionId": "セッションID",
    "language": "ja",
    "currentNodeId": "現在表示中のノードID",
    "currentNode": {
      "id": "node-id",
      "type": "question",
      "title": "質問タイトル",
      "description": "質問の説明",
      "answer": {
        "text": "回答テキスト"
      }
    },
    "messages": [
      {
        "id": "message-id-1",
        "role": "user",
        "content": "ユーザーメッセージ",
        "timestamp": "2025-08-10T00:01:00Z"
      },
      {
        "id": "message-id-2",
        "role": "assistant",
        "content": "アシスタントの回答",
        "timestamp": "2025-08-10T00:01:05Z"
      }
    ]
  }
}
```

### 7. セッションメッセージ追加API

#### リクエスト
```
POST /api/v1/concierge/session/message
```

**リクエストボディ**
```json
{
  "sessionId": "セッションID",
  "role": "user",
  "content": "メッセージ内容"
}
```

#### レスポンス
```json
{
  "success": true,
  "data": {
    "id": "生成されたメッセージID",
    "sessionId": "セッションID",
    "role": "user",
    "content": "メッセージ内容",
    "timestamp": "2025-08-10T00:02:00Z"
  }
}
```

## エラーレスポンス

すべてのAPIは、エラー発生時に以下の形式でレスポンスを返します：

```json
{
  "success": false,
  "message": "エラーメッセージ",
  "error": "詳細エラー情報（開発環境のみ）"
}
```

## ステータスコード

- 200: 成功
- 400: リクエスト不正
- 404: リソースが見つからない
- 500: サーバーエラー

## 認証・認可

これらのAPIは、hotel-common側で認証・認可の仕組みを実装します。具体的な認証方式はhotel-commonの既存の仕組みに従います。

## 備考

1. 本APIは、AIコンシェルジュ機能のTV向け質問選択型インターフェースおよびモバイル連携機能で使用されます。
2. レスポンスツリーの管理機能（作成・編集・削除）は別のAdmin APIで提供されます。
3. セッションデータは一定期間後に自動的に削除される仕組みを実装します。
