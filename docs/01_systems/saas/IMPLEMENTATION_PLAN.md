# プレイス管理機能 実装計画書

## 実装概要

プレイス管理機能をPhase 1として実装し、既存のデバイス管理機能を統合する。

## 実装順序

### Task 1: データベース基盤構築 ⏱️ 30分
- [x] Prismaスキーマ更新（完了）
- [ ] データベーススキーマ適用
- [ ] Prismaクライアント再生成

### Task 2: データ移行 ⏱️ 45分
- [ ] 移行スクリプト作成
- [ ] バックアップ作成
- [ ] データ移行実行
- [ ] 整合性チェック

### Task 3: プレイスタイプ管理API ⏱️ 60分
- [ ] API エンドポイント作成
  - [ ] `GET /api/admin/place-types` - 一覧取得
  - [ ] `POST /api/admin/place-types` - 作成
  - [ ] `GET /api/admin/place-types/:id` - 詳細取得
  - [ ] `PUT /api/admin/place-types/:id` - 更新
  - [ ] `DELETE /api/admin/place-types/:id` - 削除
  - [ ] `PUT /api/admin/place-types/reorder` - 並び替え

### Task 4: プレイス管理API ⏱️ 90分
- [ ] API エンドポイント作成
  - [ ] `GET /api/admin/places` - 一覧取得（フィルタ・検索対応）
  - [ ] `POST /api/admin/places` - 作成
  - [ ] `GET /api/admin/places/:id` - 詳細取得
  - [ ] `PUT /api/admin/places/:id` - 更新
  - [ ] `DELETE /api/admin/places/:id` - 削除
  - [ ] `PUT /api/admin/places/bulk` - 一括更新

### Task 5: プレイスグループ管理API ⏱️ 75分
- [ ] API エンドポイント作成
  - [ ] `GET /api/admin/place-groups` - 一覧取得
  - [ ] `POST /api/admin/place-groups` - 作成
  - [ ] `GET /api/admin/place-groups/:id` - 詳細取得
  - [ ] `PUT /api/admin/place-groups/:id` - 更新
  - [ ] `DELETE /api/admin/place-groups/:id` - 削除
  - [ ] `POST /api/admin/place-groups/:id/members` - メンバー追加
  - [ ] `DELETE /api/admin/place-groups/:id/members/:placeId` - メンバー削除

### Task 6: プレイスタイプ管理画面 ⏱️ 120分
- [ ] 一覧画面 (`/admin/place-types`)
  - [ ] テーブル表示
  - [ ] 作成ボタン
  - [ ] 編集・削除アクション
  - [ ] 並び替え機能
- [ ] 作成・編集モーダル
  - [ ] フォームバリデーション
  - [ ] カラーピッカー
  - [ ] アイコン選択

### Task 7: プレイス管理画面 ⏱️ 180分
- [ ] 一覧画面 (`/admin/places`)
  - [ ] テーブル表示
  - [ ] フィルタリング（タイプ、グループ、状態）
  - [ ] 検索機能
  - [ ] ページネーション
  - [ ] 一括操作
- [ ] 作成・編集画面
  - [ ] 基本情報フォーム
  - [ ] 属性設定（JSON編集）
  - [ ] グループ選択
  - [ ] デバイス関連付け

### Task 8: プレイスグループ管理画面 ⏱️ 90分
- [ ] 一覧画面 (`/admin/place-groups`)
  - [ ] テーブル表示
  - [ ] 作成・編集・削除
- [ ] メンバー管理画面
  - [ ] プレイス選択
  - [ ] 追加・削除機能

### Task 9: サイドバーメニュー統合 ⏱️ 30分
- [ ] 既存デバイス管理メニューを削除
- [ ] プレイス管理メニューを追加
- [ ] アイコン・ラベル設定

### Task 10: 既存機能の動作確認 ⏱️ 60分
- [ ] デバイス認証機能
- [ ] 注文機能
- [ ] 管理画面の基本動作

## ファイル構成

### API ファイル
```
server/api/admin/
├── place-types/
│   ├── index.get.ts          # 一覧取得
│   ├── index.post.ts         # 作成
│   ├── [id].get.ts           # 詳細取得
│   ├── [id].put.ts           # 更新
│   ├── [id].delete.ts        # 削除
│   └── reorder.put.ts        # 並び替え
├── places/
│   ├── index.get.ts          # 一覧取得
│   ├── index.post.ts         # 作成
│   ├── [id].get.ts           # 詳細取得
│   ├── [id].put.ts           # 更新
│   ├── [id].delete.ts        # 削除
│   └── bulk.put.ts           # 一括更新
└── place-groups/
    ├── index.get.ts          # 一覧取得
    ├── index.post.ts         # 作成
    ├── [id].get.ts           # 詳細取得
    ├── [id].put.ts           # 更新
    ├── [id].delete.ts        # 削除
    └── [id]/
        └── members/
            ├── index.post.ts # メンバー追加
            └── [placeId].delete.ts # メンバー削除
```

### 管理画面ファイル
```
pages/admin/
├── place-types.vue          # プレイスタイプ管理
├── places/
│   ├── index.vue            # プレイス一覧
│   ├── create.vue           # プレイス作成
│   └── [id]/
│       └── edit.vue         # プレイス編集
└── place-groups/
    ├── index.vue            # グループ一覧
    └── [id]/
        └── members.vue      # メンバー管理
```

### コンポーネントファイル
```
components/admin/
├── place-types/
│   ├── PlaceTypeList.vue
│   ├── PlaceTypeForm.vue
│   └── PlaceTypeReorder.vue
├── places/
│   ├── PlaceList.vue
│   ├── PlaceForm.vue
│   ├── PlaceFilter.vue
│   ├── PlaceSearch.vue
│   └── PlaceBulkActions.vue
└── place-groups/
    ├── PlaceGroupList.vue
    ├── PlaceGroupForm.vue
    └── PlaceGroupMembers.vue
```

### ユーティリティファイル
```
utils/
├── place-types.ts           # プレイスタイプ関連ユーティリティ
├── places.ts                # プレイス関連ユーティリティ
└── place-groups.ts          # グループ関連ユーティリティ

types/
├── place-types.ts           # プレイスタイプ型定義
├── places.ts                # プレイス型定義
└── place-groups.ts          # グループ型定義
```

## 技術仕様

### バリデーション
```typescript
// プレイスタイプ
interface PlaceTypeValidation {
  name: string (required, unique, max: 50)
  description?: string (max: 200)
  color?: string (hex color format)
  icon?: string (max: 50)
  order: number (min: 0)
}

// プレイス
interface PlaceValidation {
  code: string (required, unique, max: 20)
  name: string (required, max: 100)
  placeTypeId: number (required, exists)
  description?: string (max: 500)
  attributes?: object (valid JSON)
  floor?: number (min: 1, max: 100)
  capacity?: number (min: 1, max: 1000)
  area?: number (min: 0.1, max: 10000)
}

// プレイスグループ
interface PlaceGroupValidation {
  name: string (required, max: 50)
  description?: string (max: 200)
  color?: string (hex color format)
  order: number (min: 0)
}
```

### エラーハンドリング
```typescript
// 共通エラーレスポンス
interface ApiError {
  error: string
  message: string
  details?: any
  timestamp: string
}

// エラーコード
enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}
```

### レスポンス形式
```typescript
// 一覧取得レスポンス
interface ListResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  filters?: any
}

// 単一取得レスポンス
interface SingleResponse<T> {
  data: T
}

// 作成・更新レスポンス
interface MutationResponse<T> {
  data: T
  message: string
}
```

## テスト計画

### 単体テスト
- [ ] API エンドポイントのテスト
- [ ] バリデーション機能のテスト
- [ ] データベース操作のテスト

### 結合テスト
- [ ] 画面とAPIの連携テスト
- [ ] データ移行の整合性テスト
- [ ] 既存機能との互換性テスト

### E2Eテスト
- [ ] 管理画面の操作フローテスト
- [ ] エラーハンドリングのテスト
- [ ] パフォーマンステスト

## リスク管理

### 高リスク項目
1. **データ移行の失敗**
   - 対策: 事前バックアップ、段階的移行、ロールバック手順
2. **既存機能への影響**
   - 対策: 十分なテスト、段階的リリース
3. **パフォーマンス劣化**
   - 対策: インデックス最適化、クエリ最適化

### 中リスク項目
1. **UI/UXの複雑化**
   - 対策: ユーザビリティテスト、段階的機能追加
2. **データ整合性の問題**
   - 対策: 制約設定、バリデーション強化

## 成功指標

### 機能指標
- [ ] 全API エンドポイントが正常動作
- [ ] 管理画面での基本操作が完了
- [ ] データ移行が100%完了

### 品質指標
- [ ] テストカバレッジ80%以上
- [ ] レスポンス時間500ms以内
- [ ] エラー率1%以下

### ユーザビリティ指標
- [ ] 管理画面の操作が直感的
- [ ] エラーメッセージが分かりやすい
- [ ] ヘルプドキュメントが充実

## 次フェーズへの準備

### Phase 2 準備項目
- [ ] 統計・分析機能の要件定義
- [ ] レポート機能の設計
- [ ] パフォーマンス最適化計画

### 技術的負債の解消
- [ ] コードの最適化
- [ ] ドキュメントの整備
- [ ] テストの充実 