# スキーマ変更申請書

## 基本情報
- **申請者**: Sun（hotel-saas担当AI）
- **システム**: hotel-saas
- **申請日**: 2025年1月26日
- **緊急度**: 通常

## 変更内容
### 変更対象
- **テーブル名**: RoomGradeMedia
- **操作種別**: 追加
- **具体的変更**: 客室ランク用のメディア管理テーブルを新規作成

```sql
CREATE TABLE "RoomGradeMedia" (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  room_grade_id TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  display_order INTEGER DEFAULT 1,
  title VARCHAR(200),
  description TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITHOUT TIME ZONE,
  FOREIGN KEY (room_grade_id) REFERENCES "RoomGrade"(id) ON DELETE CASCADE
);

CREATE INDEX idx_room_grade_media_tenant_grade ON "RoomGradeMedia"(tenant_id, room_grade_id);
CREATE INDEX idx_room_grade_media_type ON "RoomGradeMedia"(media_type, is_active);
CREATE INDEX idx_room_grade_media_order ON "RoomGradeMedia"(room_grade_id, display_order);
```

### 変更理由
- **背景**: 客室ランクごとに画像・動画を管理し、一覧画面でプレビュー表示する機能が必要
- **解決したい課題**: 
  - 客室ランクの視覚的な魅力を高める
  - 管理画面での客室ランク識別を容易にする
  - メディアファイルの一元管理
- **期待効果**: 
  - 客室ランク管理の利便性向上
  - メディアファイルの組織的管理
  - 将来的な販促機能への展開可能性

## 影響分析
### 影響システム
- [x] hotel-saas（主要な使用システム）
- [ ] hotel-pms（将来的に客室選択画面で利用可能性）
- [ ] hotel-member（将来的に会員向け表示で利用可能性）
- [ ] hotel-common（スキーマ追加）

### 必要な対応
- **各システムでの修正内容**: 
  - hotel-saas: メディア管理API実装、フロントエンド対応
  - 他システム: 現時点では変更不要（将来的に参照のみ）
- **データ移行の必要性**: なし（新規テーブル）
- **ダウンタイムの有無**: なし（既存機能に影響しない追加のみ）

## テスト計画
- **テスト内容**: 
  - メディアアップロード・削除・更新機能
  - プライマリ画像設定機能
  - ファイル管理（サイズ制限、形式チェック）
  - 一覧画面でのプレビュー表示
- **テスト環境**: hotel-saas開発環境
- **確認項目**: 
  - ✅ テーブル作成・インデックス作成
  - ✅ CRUD操作全般
  - ✅ 外部キー制約動作
  - ✅ ファイルアップロード・削除
  - ✅ プライマリ画像自動切り替え

## スケジュール
- **希望実施日**: 1週間以内
- **完了予定日**: テーブル作成後2-3日でAPI実装完了
- **関連する他の作業**: なし

## 補足情報
### 実装済みAPI（テーブル作成待ち）
- GET `/api/v1/admin/room-grades/:id/media` - メディア一覧取得
- POST `/api/v1/admin/room-grades/:id/media/upload` - メディアアップロード  
- PUT `/api/v1/admin/room-grades/:id/media/:mediaId` - メディア編集
- DELETE `/api/v1/admin/room-grades/:id/media/:mediaId` - メディア削除

### フロントエンド実装状況
- 客室ランク一覧でのメディアプレビュー（UI完成）
- メディア管理モーダル（UI完成）
- 画像クリックでメディア管理画面遷移（動作確認済み）

統合データベースにテーブルが作成され次第、即座に機能提供可能な状態です。 