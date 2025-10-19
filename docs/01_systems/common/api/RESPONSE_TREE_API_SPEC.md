# レスポンスツリーAPI仕様書

*作成日: 2025-08-05*
*バージョン: 1.0.0*

## 概要

AIコンシェルジュ機能のTV向け質問選択型インターフェース実装のためのAPI仕様書です。このAPIは、TV向けインターフェースとスマホ向けインターフェースの両方で使用され、質問と回答を階層構造で管理するための「レスポンスツリー」機能を提供します。

## 基本情報

- **ベースURL**: `/api/v1/ai/response-tree`
- **認証**: JWT認証
- **データ形式**: JSON
- **エラーレスポンス**:
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "エラーメッセージ"
    }
  }
  ```

## エンドポイント一覧

### 1. レスポンスツリー管理API

#### 1.1 アクティブなレスポンスツリー一覧取得

- **エンドポイント**: `GET /api/v1/ai/response-tree`
- **説明**: テナントに紐づくアクティブなレスポンスツリーの一覧を取得します
- **クエリパラメータ**:
  - `tenantId`: テナントID（省略時は認証情報から取得）
  - `language`: 言語コード（デフォルト: `ja`）
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "tree_id_1",
        "name": "ホテルサービス案内",
        "description": "ホテル内のサービスに関する質問と回答",
        "version": 1,
        "publishedAt": "2025-07-15T10:30:00Z"
      },
      {
        "id": "tree_id_2",
        "name": "観光案内",
        "description": "周辺の観光スポットに関する質問と回答",
        "version": 2,
        "publishedAt": "2025-07-20T14:45:00Z"
      }
    ]
  }
  ```

#### 1.2 レスポンスツリー詳細取得

- **エンドポイント**: `GET /api/v1/ai/response-tree/:treeId`
- **説明**: 指定されたレスポンスツリーの詳細情報を取得します
- **パスパラメータ**:
  - `treeId`: レスポンスツリーID
- **クエリパラメータ**:
  - `language`: 言語コード（デフォルト: `ja`）
  - `includeNodes`: ルートノードを含めるかどうか（デフォルト: `false`）
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "id": "tree_id_1",
      "name": "ホテルサービス案内",
      "description": "ホテル内のサービスに関する質問と回答",
      "version": 1,
      "publishedAt": "2025-07-15T10:30:00Z",
      "rootNodes": [
        {
          "id": "node_id_1",
          "type": "category",
          "title": "客室サービス",
          "description": "客室内で利用できるサービス",
          "icon": "room_service",
          "order": 1,
          "isRoot": true
        },
        {
          "id": "node_id_2",
          "type": "category",
          "title": "施設案内",
          "description": "ホテル内の施設案内",
          "icon": "hotel",
          "order": 2,
          "isRoot": true
        }
      ]
    }
  }
  ```

### 2. レスポンスノード管理API

#### 2.1 ノード詳細取得

- **エンドポイント**: `GET /api/v1/ai/response-tree/nodes/:nodeId`
- **説明**: 指定されたノードの詳細情報を取得します
- **パスパラメータ**:
  - `nodeId`: ノードID
- **クエリパラメータ**:
  - `language`: 言語コード（デフォルト: `ja`）
  - `includeChildren`: 子ノードを含めるかどうか（デフォルト: `true`）
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "id": "node_id_1",
      "treeId": "tree_id_1",
      "type": "category",
      "title": "客室サービス",
      "description": "客室内で利用できるサービス",
      "icon": "room_service",
      "order": 1,
      "isRoot": true,
      "children": [
        {
          "id": "node_id_3",
          "type": "question",
          "title": "ルームサービスの注文方法は？",
          "description": "ルームサービスの注文方法について",
          "icon": "restaurant",
          "order": 1,
          "answer": {
            "text": "ルームサービスは客室内の電話から「9」をダイヤルしてご注文いただけます。または、テレビのメニューからもご注文可能です。",
            "media": [
              {
                "type": "image",
                "url": "/images/room-service.jpg",
                "caption": "ルームサービスメニュー"
              }
            ],
            "relatedQuestions": [
              {
                "nodeId": "node_id_4",
                "title": "ルームサービスの営業時間は？"
              }
            ]
          }
        },
        {
          "id": "node_id_4",
          "type": "question",
          "title": "ルームサービスの営業時間は？",
          "description": "ルームサービスの利用可能時間",
          "icon": "schedule",
          "order": 2,
          "answer": {
            "text": "ルームサービスは24時間ご利用いただけます。深夜0時から朝6時までは限定メニューとなります。",
            "relatedQuestions": [
              {
                "nodeId": "node_id_3",
                "title": "ルームサービスの注文方法は？"
              }
            ]
          }
        }
      ]
    }
  }
  ```

#### 2.2 子ノード一覧取得

- **エンドポイント**: `GET /api/v1/ai/response-tree/nodes/:nodeId/children`
- **説明**: 指定されたノードの子ノード一覧を取得します
- **パスパラメータ**:
  - `nodeId`: 親ノードID
- **クエリパラメータ**:
  - `language`: 言語コード（デフォルト: `ja`）
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "node_id_3",
        "type": "question",
        "title": "ルームサービスの注文方法は？",
        "description": "ルームサービスの注文方法について",
        "icon": "restaurant",
        "order": 1
      },
      {
        "id": "node_id_4",
        "type": "question",
        "title": "ルームサービスの営業時間は？",
        "description": "ルームサービスの利用可能時間",
        "icon": "schedule",
        "order": 2
      }
    ]
  }
  ```

#### 2.3 ノード検索

- **エンドポイント**: `GET /api/v1/ai/response-tree/search`
- **説明**: キーワードに基づいてノードを検索します
- **クエリパラメータ**:
  - `treeId`: レスポンスツリーID（省略可）
  - `query`: 検索キーワード（必須）
  - `language`: 言語コード（デフォルト: `ja`）
  - `limit`: 取得する最大件数（デフォルト: `10`）
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "node_id_3",
        "treeId": "tree_id_1",
        "type": "question",
        "title": "ルームサービスの注文方法は？",
        "description": "ルームサービスの注文方法について",
        "icon": "restaurant",
        "relevance": 0.95
      },
      {
        "id": "node_id_4",
        "treeId": "tree_id_1",
        "type": "question",
        "title": "ルームサービスの営業時間は？",
        "description": "ルームサービスの利用可能時間",
        "icon": "schedule",
        "relevance": 0.85
      }
    ]
  }
  ```

### 3. セッション管理API

#### 3.1 セッション開始

- **エンドポイント**: `POST /api/v1/ai/response-tree/sessions`
- **説明**: 新しい対話セッションを開始します
- **リクエスト**:
  ```json
  {
    "deviceId": "device_123",
    "roomId": "room_456",
    "language": "ja",
    "interfaceType": "tv" // "tv" または "mobile"
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "session_789",
      "startedAt": "2025-08-05T10:15:30Z",
      "language": "ja",
      "interfaceType": "tv",
      "initialNodes": [
        {
          "id": "node_id_1",
          "type": "category",
          "title": "客室サービス",
          "description": "客室内で利用できるサービス",
          "icon": "room_service",
          "order": 1
        },
        {
          "id": "node_id_2",
          "type": "category",
          "title": "施設案内",
          "description": "ホテル内の施設案内",
          "icon": "hotel",
          "order": 2
        }
      ]
    }
  }
  ```

#### 3.2 セッション状態取得

- **エンドポイント**: `GET /api/v1/ai/response-tree/sessions/:sessionId`
- **説明**: 現在の対話セッションの状態を取得します
- **パスパラメータ**:
  - `sessionId`: セッションID
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "session_789",
      "startedAt": "2025-08-05T10:15:30Z",
      "lastActivityAt": "2025-08-05T10:20:45Z",
      "language": "ja",
      "interfaceType": "tv",
      "currentNodeId": "node_id_3",
      "history": [
        {
          "nodeId": "node_id_1",
          "title": "客室サービス",
          "timestamp": "2025-08-05T10:16:10Z"
        },
        {
          "nodeId": "node_id_3",
          "title": "ルームサービスの注文方法は？",
          "timestamp": "2025-08-05T10:18:22Z"
        }
      ]
    }
  }
  ```

#### 3.3 セッション更新

- **エンドポイント**: `PUT /api/v1/ai/response-tree/sessions/:sessionId`
- **説明**: 対話セッションの状態を更新します
- **パスパラメータ**:
  - `sessionId`: セッションID
- **リクエスト**:
  ```json
  {
    "currentNodeId": "node_id_4",
    "action": "select_node"
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "session_789",
      "currentNodeId": "node_id_4",
      "lastActivityAt": "2025-08-05T10:22:15Z",
      "node": {
        "id": "node_id_4",
        "type": "question",
        "title": "ルームサービスの営業時間は？",
        "description": "ルームサービスの利用可能時間",
        "icon": "schedule",
        "answer": {
          "text": "ルームサービスは24時間ご利用いただけます。深夜0時から朝6時までは限定メニューとなります。",
          "relatedQuestions": [
            {
              "nodeId": "node_id_3",
              "title": "ルームサービスの注文方法は？"
            }
          ]
        }
      }
    }
  }
  ```

#### 3.4 セッション終了

- **エンドポイント**: `DELETE /api/v1/ai/response-tree/sessions/:sessionId`
- **説明**: 対話セッションを終了します
- **パスパラメータ**:
  - `sessionId`: セッションID
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "sessionId": "session_789",
      "startedAt": "2025-08-05T10:15:30Z",
      "endedAt": "2025-08-05T10:30:00Z",
      "duration": 870
    }
  }
  ```

### 4. モバイル連携API

#### 4.1 QRコード生成

- **エンドポイント**: `POST /api/v1/ai/response-tree/mobile-link`
- **説明**: モバイル連携用のQRコード情報を生成します
- **リクエスト**:
  ```json
  {
    "sessionId": "session_789",
    "deviceId": "device_123",
    "roomId": "room_456"
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "linkId": "link_abc123",
      "linkCode": "ABCDEF",
      "qrCodeUrl": "/api/v1/ai/response-tree/qrcode/ABCDEF",
      "expiresAt": "2025-08-05T11:15:30Z"
    }
  }
  ```

#### 4.2 モバイル連携確認

- **エンドポイント**: `GET /api/v1/ai/response-tree/mobile-link/:linkCode`
- **説明**: モバイル連携コードの有効性を確認します
- **パスパラメータ**:
  - `linkCode`: 連携コード
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "linkId": "link_abc123",
      "sessionId": "session_789",
      "deviceId": "device_123",
      "roomId": "room_456",
      "isValid": true,
      "expiresAt": "2025-08-05T11:15:30Z"
    }
  }
  ```

#### 4.3 モバイル連携実行

- **エンドポイント**: `POST /api/v1/ai/response-tree/mobile-link/:linkCode/connect`
- **説明**: モバイル端末とTVの連携を実行します
- **パスパラメータ**:
  - `linkCode`: 連携コード
- **リクエスト**:
  ```json
  {
    "userId": "user_123",
    "deviceInfo": {
      "type": "smartphone",
      "os": "iOS",
      "osVersion": "16.5",
      "model": "iPhone 14"
    }
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "linkId": "link_abc123",
      "sessionId": "session_789",
      "connectionId": "conn_xyz789",
      "status": "connected",
      "connectedAt": "2025-08-05T10:45:30Z"
    }
  }
  ```

### 5. 管理者向けAPI

#### 5.1 レスポンスツリー作成

- **エンドポイント**: `POST /api/v1/admin/response-tree`
- **説明**: 新しいレスポンスツリーを作成します
- **リクエスト**:
  ```json
  {
    "name": "新しい案内ツリー",
    "description": "ホテルの新サービスに関する案内",
    "tenantId": "tenant_001",
    "isActive": false
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "id": "tree_id_3",
      "name": "新しい案内ツリー",
      "description": "ホテルの新サービスに関する案内",
      "tenantId": "tenant_001",
      "isActive": false,
      "createdAt": "2025-08-05T11:00:00Z",
      "version": 1
    }
  }
  ```

#### 5.2 レスポンスツリー更新

- **エンドポイント**: `PUT /api/v1/admin/response-tree/:treeId`
- **説明**: 既存のレスポンスツリーを更新します
- **パスパラメータ**:
  - `treeId`: レスポンスツリーID
- **リクエスト**:
  ```json
  {
    "name": "更新された案内ツリー",
    "description": "ホテルの新サービスに関する更新情報",
    "isActive": true
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "id": "tree_id_3",
      "name": "更新された案内ツリー",
      "description": "ホテルの新サービスに関する更新情報",
      "tenantId": "tenant_001",
      "isActive": true,
      "updatedAt": "2025-08-05T11:30:00Z",
      "version": 1
    }
  }
  ```

#### 5.3 レスポンスツリー公開

- **エンドポイント**: `POST /api/v1/admin/response-tree/:treeId/publish`
- **説明**: レスポンスツリーを公開状態に変更します
- **パスパラメータ**:
  - `treeId`: レスポンスツリーID
- **リクエスト**:
  ```json
  {
    "comment": "新サービス情報を追加"
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "id": "tree_id_3",
      "name": "更新された案内ツリー",
      "isActive": true,
      "publishedAt": "2025-08-05T12:00:00Z",
      "version": 2,
      "versionId": "version_id_2"
    }
  }
  ```

#### 5.4 ノード作成

- **エンドポイント**: `POST /api/v1/admin/response-tree/:treeId/nodes`
- **説明**: 新しいノードを作成します
- **パスパラメータ**:
  - `treeId`: レスポンスツリーID
- **リクエスト**:
  ```json
  {
    "type": "question",
    "title": "新しいサービスの利用方法は？",
    "description": "新サービスの利用手順について",
    "icon": "new_service",
    "parentId": "node_id_2",
    "order": 3,
    "answer": {
      "text": "新サービスは客室内のタブレットから予約いただけます。詳しくはフロントまでお問い合わせください。",
      "media": [
        {
          "type": "image",
          "url": "/images/new-service.jpg",
          "caption": "新サービスの案内"
        }
      ]
    },
    "translations": [
      {
        "language": "en",
        "title": "How to use the new service?",
        "answer": {
          "text": "You can book the new service from the tablet in your room. For more details, please contact the front desk."
        }
      }
    ]
  }
  ```
- **レスポンス**:
  ```json
  {
    "success": true,
    "data": {
      "id": "node_id_5",
      "treeId": "tree_id_3",
      "type": "question",
      "title": "新しいサービスの利用方法は？",
      "description": "新サービスの利用手順について",
      "icon": "new_service",
      "parentId": "node_id_2",
      "order": 3,
      "createdAt": "2025-08-05T12:15:00Z"
    }
  }
  ```

## エラーコード

| コード | 説明 |
|--------|------|
| `TREE_NOT_FOUND` | 指定されたレスポンスツリーが見つかりません |
| `NODE_NOT_FOUND` | 指定されたノードが見つかりません |
| `SESSION_NOT_FOUND` | 指定されたセッションが見つかりません |
| `SESSION_EXPIRED` | セッションの有効期限が切れています |
| `INVALID_LINK_CODE` | 無効な連携コードです |
| `LINK_EXPIRED` | 連携コードの有効期限が切れています |
| `UNAUTHORIZED` | 認証エラー |
| `FORBIDDEN` | 権限エラー |
| `VALIDATION_ERROR` | リクエストパラメータが不正です |
| `INTERNAL_ERROR` | 内部エラー |

## データモデル

### レスポンスツリー

```typescript
interface ResponseTree {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string; // ISO 8601形式
  updatedAt: string; // ISO 8601形式
  publishedAt?: string; // ISO 8601形式
  version: number;
}
```

### レスポンスノード

```typescript
interface ResponseNode {
  id: string;
  treeId: string;
  type: 'category' | 'question';
  title: string;
  description?: string;
  icon?: string;
  order: number;
  parentId?: string;
  isRoot: boolean;
  answer?: {
    text: string;
    media?: Array<{
      type: 'image' | 'video' | 'audio';
      url: string;
      caption?: string;
    }>;
    relatedQuestions?: Array<{
      nodeId: string;
      title: string;
    }>;
  };
}
```

### セッション

```typescript
interface Session {
  sessionId: string;
  deviceId?: string;
  roomId?: string;
  startedAt: string; // ISO 8601形式
  endedAt?: string; // ISO 8601形式
  lastActivityAt: string; // ISO 8601形式
  language: string;
  interfaceType: 'tv' | 'mobile';
  currentNodeId?: string;
  history: Array<{
    nodeId: string;
    title: string;
    timestamp: string; // ISO 8601形式
  }>;
}
```

### モバイル連携

```typescript
interface MobileLink {
  linkId: string;
  sessionId: string;
  linkCode: string;
  deviceId: string;
  roomId: string;
  createdAt: string; // ISO 8601形式
  expiresAt: string; // ISO 8601形式
  isValid: boolean;
  connectionId?: string;
  status?: 'pending' | 'connected' | 'expired';
  connectedAt?: string; // ISO 8601形式
}
```

## 実装上の注意点

1. **テナント分離**: すべてのAPIはテナントIDによる分離を考慮する必要があります。
2. **多言語対応**: 言語コードに基づいて適切な翻訳を返す必要があります。
3. **キャッシュ**: 頻繁にアクセスされるツリーやノードはキャッシュを検討してください。
4. **セキュリティ**: 管理者向けAPIは適切な認可チェックを実装してください。
5. **パフォーマンス**: 大規模なツリーの場合、ページネーションや部分的な読み込みを検討してください。
6. **WebSocket**: リアルタイム連携が必要な場合はWebSocketの使用を検討してください。

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-08-05 | 初版作成 |