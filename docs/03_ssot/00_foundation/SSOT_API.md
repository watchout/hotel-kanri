## ✅ SSOT作成完了

[DEV-0172] [COM-246] 通知チャネル＆ハンドオフAPI実装のSSOTを作成しました。

### 📄 作成ファイル

**`/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_HANDOFF_NOTIFICATION.md`**

### 📋 概要

このSSOTは、ゲストからのハンドオフリクエストを受けてスタッフへリアルタイム通知を送信し、60秒以内の迅速な対応を実現するスタッフ向け管理機能の仕様書です。

### 🎯 主な内容

1. **概要**
   - 目的: ゲストのハンドオフリクエストへのスタッフ対応
   - 対象システム: hotel-common（API）、hotel-saas（Admin UI）
   - 関連SSOT: SSOT_GUEST_AI_HANDOFF.md（ゲスト側機能）

2. **要件ID一覧（REQ-XXX形式）**
   - HDF-ADM-001〜005: 機能要件
   - HDF-ADM-NFR-001〜004: 非機能要件

3. **データベース設計**
   - `handoff_requests`テーブル（既存）のスタッフ操作関連カラム
   - `handoff_notification_logs`テーブル（新規）
   - 全てsnake_case、@mapディレクティブ使用

4. **API設計**
   - `GET /api/v1/admin/handoff/requests` - リクエスト一覧取得
   - `GET /api/v1/admin/handoff/requests/:id` - リクエスト詳細取得
   - `PATCH /api/v1/admin/handoff/requests/:id/status` - ステータス更新
   - 全てSession認証、詳細なリクエスト/レスポンス仕様

5. **UI設計**
   - ハンドオフ管理画面（/admin/handoff）
   - ハンドオフ詳細モーダル
   - 通知ポップアップ（Phase 2）
   - ワイヤーフレーム付き

6. **通知チャネル設計**
   - Phase 1: ポーリング方式（5秒間隔、MVP）
   - Phase 2: WebSocket方式（リアルタイム、推奨）
   - 実装コード例付き

7. **Accept（合格条件）**
   - API機能別の詳細なテスト条件
   - UI動作確認項目
   - セキュリティ要件
   - パフォーマンス要件

### ✨ 品質基準準拠

- ✅ テーブル名・カラム名はsnake_case
- ✅ APIパスは /api/v1/admin/[resource] 形式
- ✅ 全ての要件にAccept条件を定義
- ✅ Session認証方式を使用
- ✅ マルチテナント設計（tenant_id必須）
- ✅ Marketing Injection対応（Config設定）
- ✅ Analytics追跡（Tracking by Default）
- ✅ 既存SSOT（SSOT_GUEST_AI_HANDOFF.md）との整合性

### 📊 実装範囲

**Phase 1（MVP - DEV-0172スコープ）**
- スタッフ向けAPI実装（3エンドポイント）
- 管理画面UI実装
- ポーリング方式の通知

**Phase 2（将来）**
- WebSocketによるリアルタイム通知
- 通知ポップアップ
- 夜間自動無効化

このSSOTに基づいて実装を開始してよろしいでしょうか？
