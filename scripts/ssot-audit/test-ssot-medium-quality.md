# SSOT: セッションリセット機能

## 概要

ゲストがチェックアウト時にセッションをリセットする機能。
清掃スタッフがQRスキャンで実行可能。

## 要件

- REQ-001: フロントボタンからリセット可能
- REQ-002: 清掃QRスキャンでリセット
- REQ-003: カート・チャット・履歴を削除

## データベース

### テーブル: session_resets

| カラム | 型 | 説明 |
|:-------|:---|:-----|
| id | UUID | 主キー |
| room_id | UUID | 部屋ID |
| reset_type | VARCHAR | front_button / cleaning_qr |
| created_at | TIMESTAMP | 作成日時 |

## API

### POST /api/v1/admin/sessions/reset

リクエスト:
```json
{
  "room_id": "uuid",
  "reset_type": "front_button"
}
```

レスポンス:
```json
{
  "success": true,
  "message": "セッションをリセットしました"
}
```

## UI

- フロントデスク画面にリセットボタン
- QRコード生成機能

## 実装手順

1. DBテーブル作成
2. API実装
3. UI実装
