# ソフトデリート対応状況レポート

## 📋 概要

本ドキュメントでは、hotel-commonプロジェクトにおける各テーブルのソフトデリート対応状況を報告します。プロジェクトの方針として、すべてのテーブルでソフトデリート（論理削除）を実装することが決定されています。

## 🔍 調査結果

### ソフトデリート対応パターン

現在、プロジェクト内では以下の3つのパターンでソフトデリートが実装されています：

1. **完全対応** - `is_deleted`と`deleted_at`フィールドを持つ
2. **部分対応** - `isActive`または`status`フィールドのみで対応
3. **未対応** - 削除関連フィールドなし（物理削除のみ）

### テーブル別対応状況

| テーブル名 | 対応状況 | 実装方法 | 備考 |
|------------|----------|----------|------|
| Order | ✅ 完全対応 | `isDeleted`, `deletedAt` | インデックスあり |
| OrderItem | ❌ 未対応 | - | 親テーブル(Order)のカスケード削除 |
| device_rooms | ⚠️ 部分対応 | `isActive` | アクティブフラグのみ |
| campaigns | ⚠️ 部分対応 | `status` | ステータス値で管理 (`ENDED`) |
| response_trees | ⚠️ 部分対応 | `isActive`, `isPublished` | 複数フラグで状態管理 |
| response_tree_sessions | ⚠️ 部分対応 | `isComplete`, `endedAt` | 完了フラグで管理 |
| pages | ⚠️ 部分対応 | `IsPublished` | 公開状態のみ管理 |
| room_grades | ⚠️ 部分対応 | `is_active`, `status` | ステータスと複数フラグ |
| staff | ⚠️ 部分対応 | `is_active` | アクティブフラグのみ |
| admin | ⚠️ 部分対応 | `is_active` | アクティブフラグのみ |
| Tenant | ⚠️ 部分対応 | `status` | ステータス値で管理 |
| customers | ❌ 未対応 | - | 物理削除のみ |
| reservations | ❌ 未対応 | - | 物理削除のみ |
| campaign_items | ❌ 未対応 | - | 親テーブルのカスケード削除 |
| campaign_translations | ❌ 未対応 | - | 親テーブルのカスケード削除 |
| response_nodes | ❌ 未対応 | - | 親テーブルのカスケード削除 |
| TenantSystemPlan | ❌ 未対応 | - | 親テーブルのカスケード削除 |

### API実装状況

| エンドポイント | 対応状況 | 実装方法 | 備考 |
|---------------|----------|----------|------|
| DELETE /api/v1/room-grades/:id | ⚠️ 部分対応 | ステータス更新 | `status: 'archived'`に設定 |
| DELETE /api/v1/rooms/:id | ⚠️ 部分対応 | ステータス更新 | 詳細不明 |
| DELETE /api/v1/reservations/:id | ❌ 未対応 | 物理削除 | 物理削除を実行 |
| DELETE /api/v1/devices/:id/deactivate | ✅ 対応 | `isActive: false` | 論理削除 |
| DELETE /api/v1/devices/:id | ❌ 未対応 | 物理削除 | 物理削除を実行 |
| DELETE /response-tree/sessions/:sessionId | ⚠️ 部分対応 | セッション終了 | `endedAt`を設定 |

## 🚨 優先対応が必要なテーブル

以下のテーブルは、データの重要性と削除頻度から優先的にソフトデリート対応が必要です：

1. **customers** - 顧客データは重要なため、完全なソフトデリート対応が必要
2. **reservations** - 予約履歴は監査のため保持すべき
3. **campaigns** - マーケティングデータの履歴管理のため完全対応が必要
4. **response_trees** - AIコンシェルジュの応答ツリーは重要な知的財産

## 📝 推奨実装方針

### 1. 標準化されたフィールド構成

すべてのテーブルに以下のフィールドを追加：

```prisma
is_deleted Boolean   @default(false)
deleted_at DateTime?
deleted_by String?
```

### 2. 既存フィールドとの整合性

- `isActive`や`status`フィールドがある場合、`is_deleted`との関係を明確に定義
- 例：`is_deleted = true`の場合は常に`isActive = false`とする

### 3. マイグレーション計画

1. 優先度の高いテーブルから順次対応
2. 既存のデータに影響を与えないよう注意（デフォルト値の設定）
3. 関連するリポジトリとサービス層のコードも更新

## 🔄 移行手順

1. Prismaスキーマに必要なフィールドを追加
2. マイグレーションファイルを生成・適用
3. リポジトリ層のクエリを更新
4. APIエンドポイントの実装を更新
5. テストを実施

## ⚠️ 注意事項

- 外部キー制約がある場合、関連レコードの削除処理も考慮する必要があります
- 既存のクエリが`isActive`や`status`フィールドに依存している場合、互換性を維持する必要があります
- パフォーマンスへの影響を考慮し、適切なインデックスを設定してください

## 📊 完了基準

1. すべての主要テーブルが標準化されたソフトデリート対応を完了
2. すべてのDELETEエンドポイントがソフトデリートを実装
3. 一貫したクエリフィルタリングが実装されていること
4. テストケースが追加されていること



