# 🏨 客室メモ管理API仕様書

**最終更新**: 2025-09-14  
**対象システム**: hotel-common統合APIサーバー  
**ベースURL**: `http://localhost:3400`  
**認証**: JWT Bearer Token必須

---

## 📋 概要

客室メモ機能は、ホテルスタッフ間での客室に関する情報共有・引継ぎを効率化するシステムです。清掃状況、メンテナンス要求、ゲストリクエスト、紛失物などの情報を体系的に管理できます。

### 主要機能
- 客室別メモの作成・更新・削除
- カテゴリ別分類（引継ぎ、清掃、メンテナンス等）
- 優先度設定（低・通常・高・緊急）
- ステータス管理（保留・進行中・完了）
- 可視性制御（公開・非公開・役職限定）
- コメント機能（スレッド形式）
- 操作履歴の自動記録

---

## 🗄️ データベース構造

### メインテーブル

#### `room_memos` テーブル
```sql
CREATE TABLE room_memos (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  room_id             TEXT NOT NULL,
  category            TEXT NOT NULL,
  visibility          TEXT DEFAULT 'public',
  visible_roles       TEXT[] DEFAULT '{}',
  content             TEXT NOT NULL,
  status              TEXT DEFAULT 'pending',
  priority            TEXT DEFAULT 'normal',
  due_date            TIMESTAMP,
  created_by_staff_id TEXT NOT NULL,
  assigned_to_staff_id TEXT,
  updated_by_staff_id TEXT,
  is_deleted          BOOLEAN DEFAULT false,
  deleted_at          TIMESTAMP,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `room_memo_comments` テーブル
```sql
CREATE TABLE room_memo_comments (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,
  memo_id             TEXT NOT NULL,
  parent_comment_id   TEXT,
  content             TEXT NOT NULL,
  comment_type        TEXT DEFAULT 'comment',
  status_from         TEXT,
  status_to           TEXT,
  created_by_staff_id TEXT NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `room_memo_status_logs` テーブル
```sql
CREATE TABLE room_memo_status_logs (
  tenant_id           TEXT NOT NULL,
  memo_id             TEXT NOT NULL,
  status_from         TEXT NOT NULL,
  status_to           TEXT NOT NULL,
  comment             TEXT,
  changed_by_staff_id TEXT NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `room_memo_reads` テーブル
```sql
CREATE TABLE room_memo_reads (
  id        TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  memo_id   TEXT NOT NULL,
  staff_id  TEXT NOT NULL,
  read_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, memo_id, staff_id)
);
```

---

## 🔗 API エンドポイント一覧

### 1. メモ管理API

#### 1.1 メモ一覧取得
```http
GET /api/v1/admin/room-memos
Authorization: Bearer {accessToken}
```

**クエリパラメータ**:
- `room_number` (string, optional): 客室番号で絞り込み
- `room_id` (string, optional): 客室IDで絞り込み
- `status` (enum, optional): ステータス絞り込み
  - `pending` | `in_progress` | `completed`
- `category` (enum, optional): カテゴリ絞り込み
  - `reservation` | `handover` | `lost_item` | `maintenance` | `cleaning` | `guest_request` | `other`
- `visibility` (enum, optional): 可視性絞り込み
  - `public` | `private` | `role`
- `page` (number, default: 1): ページ番号
- `limit` (number, default: 20): 1ページあたりの件数

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "memos": [
      {
        "id": "memo-001",
        "room_id": "room-123",
        "room_number": "101",
        "category": "handover",
        "visibility": "public",
        "visible_roles": [],
        "content": "引継ぎ: リネン不足、補充依頼済み",
        "status": "in_progress",
        "priority": "normal",
        "due_date": null,
        "created_at": "2025-09-10T09:00:00Z",
        "updated_at": "2025-09-10T09:05:00Z",
        "created_by": { "id": "staff-1" },
        "assigned_to": { "id": "staff-2" }
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 1,
    "total_pages": 1
  }
}
```

#### 1.2 メモ作成
```http
POST /api/v1/admin/room-memos
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**リクエストボディ**:
```json
{
  "room_number": "101",
  "category": "handover",
  "visibility": "public",
  "visible_roles": [],
  "content": "引継ぎ: リネン不足、補充依頼",
  "priority": "normal",
  "due_date": null,
  "assigned_to_staff_id": "staff-2"
}
```

**フィールド説明**:
- `room_number` (string, required): 客室番号
- `category` (enum, default: 'handover'): カテゴリ
- `visibility` (enum, default: 'public'): 可視性
- `visible_roles` (array, default: []): 可視対象役職（visibility='role'時のみ）
- `content` (string, required): メモ内容
- `priority` (enum, default: 'normal'): 優先度
- `due_date` (datetime, optional): 期限日時
- `assigned_to_staff_id` (string, optional): 担当者ID

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "memo_id": "memo-001"
  }
}
```

#### 1.3 メモ更新
```http
PUT /api/v1/admin/room-memos/{id}
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**リクエストボディ**:
```json
{
  "content": "補充依頼→対応中に更新",
  "priority": "high",
  "due_date": "2025-09-11T12:00:00Z",
  "visibility": "role",
  "visible_roles": ["front", "manager"]
}
```

#### 1.4 ステータス変更
```http
PUT /api/v1/admin/room-memos/{id}/status
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**リクエストボディ**:
```json
{
  "status": "completed",
  "comment": "対応完了しました"
}
```

#### 1.5 メモ削除（論理削除）
```http
DELETE /api/v1/admin/room-memos/{id}
Authorization: Bearer {accessToken}
```

### 2. コメント管理API

#### 2.1 コメント一覧取得
```http
GET /api/v1/admin/room-memos/{id}/comments
Authorization: Bearer {accessToken}
```

#### 2.2 コメント追加
```http
POST /api/v1/admin/room-memos/{id}/comments
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**リクエストボディ**:
```json
{
  "content": "確認しました。対応します。",
  "parent_comment_id": "comment-001"
}
```

---

## 📊 列挙型定義

### カテゴリ (Category)
- `reservation`: 予約関連
- `handover`: 引継ぎ
- `lost_item`: 紛失物
- `maintenance`: メンテナンス
- `cleaning`: 清掃
- `guest_request`: ゲストリクエスト
- `other`: その他

### ステータス (Status)
- `pending`: 保留中
- `in_progress`: 進行中
- `completed`: 完了

### 優先度 (Priority)
- `low`: 低
- `normal`: 通常
- `high`: 高
- `urgent`: 緊急

### 可視性 (Visibility)
- `public`: 全員に公開
- `private`: 作成者のみ
- `role`: 指定役職のみ

---

## 🔐 認証・認可

### 認証方式
- JWT Bearer Token認証
- テナント境界の自動適用

### 権限レベル
- **管理者**: 全メモの作成・更新・削除
- **スタッフ**: 自分が作成したメモの更新・削除
- **閲覧者**: メモの閲覧のみ

### テナント分離
- 全てのAPIでテナント境界が自動適用
- 他テナントのデータへのアクセス不可

---

## 📝 操作ログ

全ての操作は`system_event`テーブルに自動記録されます：

### 記録される操作
- `MEMO_CREATED`: メモ作成
- `MEMO_UPDATED`: メモ更新
- `MEMO_STATUS_CHANGED`: ステータス変更
- `MEMO_COMMENT_ADDED`: コメント追加
- `MEMO_DELETED`: メモ削除

### ログ形式例
```json
{
  "event_type": "USER_OPERATION",
  "source_system": "hotel-common",
  "target_system": "hotel-common",
  "entity_type": "room_memo",
  "entity_id": "memo-001",
  "action": "MEMO_CREATED",
  "event_data": {
    "room_id": "room-123",
    "memo_id": "memo-001",
    "category": "handover",
    "visibility": "public",
    "priority": "normal"
  },
  "status": "COMPLETED"
}
```

---

## ⚠️ エラーハンドリング

### 標準エラーレスポンス
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "指定された客室が見つかりません"
  },
  "timestamp": "2025-09-14T12:00:00Z",
  "request_id": "req-uuid"
}
```

### 主要エラーコード
- `VALIDATION_ERROR`: 入力値検証エラー
- `NOT_FOUND`: リソースが見つからない
- `UNAUTHORIZED`: 認証エラー
- `FORBIDDEN`: 権限不足
- `INTERNAL_SERVER_ERROR`: サーバー内部エラー

---

## 🚀 hotel-saas実装ガイド

### フロントエンド実装のポイント

#### 1. 認証トークンの管理
```javascript
// APIクライアント設定例
const apiClient = {
  baseURL: 'http://localhost:3400',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
}
```

#### 2. メモ一覧の取得・表示
```javascript
// 客室別メモ一覧取得
async function getRoomMemos(roomNumber, filters = {}) {
  const params = new URLSearchParams({
    room_number: roomNumber,
    ...filters
  })
  
  const response = await fetch(`${apiClient.baseURL}/api/v1/admin/room-memos?${params}`, {
    headers: apiClient.headers
  })
  
  return response.json()
}

// 使用例
const memos = await getRoomMemos('101', {
  status: 'pending',
  category: 'handover'
})
```

#### 3. メモ作成フォーム
```javascript
// メモ作成
async function createMemo(memoData) {
  const response = await fetch(`${apiClient.baseURL}/api/v1/admin/room-memos`, {
    method: 'POST',
    headers: apiClient.headers,
    body: JSON.stringify(memoData)
  })
  
  return response.json()
}

// 使用例
const newMemo = await createMemo({
  room_number: '101',
  category: 'maintenance',
  content: 'エアコンの調子が悪いとの報告',
  priority: 'high',
  assigned_to_staff_id: 'staff-maintenance-001'
})
```

#### 4. リアルタイム更新（推奨）
```javascript
// WebSocket接続でリアルタイム更新
const ws = new WebSocket('ws://localhost:3400/ws/room-memos')

ws.onmessage = (event) => {
  const update = JSON.parse(event.data)
  
  switch(update.type) {
    case 'MEMO_CREATED':
      // 新しいメモを画面に追加
      addMemoToList(update.memo)
      break
    case 'MEMO_UPDATED':
      // メモを更新
      updateMemoInList(update.memo)
      break
    case 'MEMO_STATUS_CHANGED':
      // ステータス変更を反映
      updateMemoStatus(update.memo_id, update.status)
      break
  }
}
```

### UI/UX設計のポイント

#### 1. メモ一覧画面
- **フィルタリング**: カテゴリ、ステータス、優先度での絞り込み
- **ソート**: 作成日時、優先度、期限日での並び替え
- **視覚的表示**: 優先度に応じた色分け、期限切れの警告表示
- **バッジ表示**: 未読コメント数、ステータス表示

#### 2. メモ作成・編集フォーム
- **客室選択**: ドロップダウンまたは検索機能
- **カテゴリ選択**: アイコン付きボタン形式
- **優先度設定**: 色分けされたラジオボタン
- **担当者割り当て**: スタッフ検索・選択機能
- **期限設定**: カレンダーピッカー

#### 3. メモ詳細画面
- **コメントスレッド**: チャット形式の表示
- **ステータス変更**: ワンクリック操作
- **履歴表示**: 変更履歴のタイムライン表示
- **添付ファイル**: 画像・ドキュメントの表示（将来拡張）

### 実装時の注意点

#### 1. エラーハンドリング
```javascript
// 統一エラーハンドリング
async function handleApiCall(apiFunction) {
  try {
    const result = await apiFunction()
    if (!result.success) {
      throw new Error(result.error.message)
    }
    return result.data
  } catch (error) {
    // ユーザーフレンドリーなエラーメッセージ表示
    showErrorNotification(error.message)
    console.error('API Error:', error)
  }
}
```

#### 2. パフォーマンス最適化
- **ページネーション**: 大量データの効率的な読み込み
- **キャッシュ戦略**: 頻繁にアクセスするデータのローカルキャッシュ
- **遅延読み込み**: 詳細データの必要時読み込み

#### 3. アクセシビリティ
- **キーボード操作**: 全機能のキーボードアクセス対応
- **スクリーンリーダー**: 適切なARIAラベルの設定
- **色覚対応**: 色以外の視覚的手がかりの提供

---

## 📈 今後の拡張予定

### Phase 2: 高度な機能
- **添付ファイル機能**: 画像・ドキュメントの添付
- **テンプレート機能**: よく使用するメモのテンプレート化
- **通知機能**: メール・プッシュ通知の送信
- **分析機能**: メモの傾向分析・レポート生成

### Phase 3: 統合機能
- **PMS連携**: 予約システムとの連携
- **清掃管理**: 清掃スケジュールとの統合
- **メンテナンス**: 設備管理システムとの連携
- **モバイルアプリ**: スマートフォン専用アプリの提供

---

**このドキュメントは実装状況に応じて随時更新されます。**
