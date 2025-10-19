# データベース・Prisma統合マスタードキュメント

**最終更新**: 2025-09-01  
**ステータス**: ✅ 完全整合性確認済み  
**監査日時**: 2025-09-01T08:59:00.000Z

## 📊 現在の状態概要

### ✅ 整合性ステータス
- **データベーステーブル数**: 41個
- **Prismaモデル数**: 41個
- **一致率**: 100% (41/41)
- **不整合**: 0個
- **整合性**: ✅ **完全**

### 🗄️ データベース情報
- **データベース名**: `hotel_unified_db`
- **PostgreSQLバージョン**: 最新
- **接続ユーザー**: `hotel_app` (本番用), `kaneko` (開発用)
- **スキーマ**: `public`

## 📋 全テーブル一覧 (41個)

### 🏢 システム管理テーブル
1. **`DatabaseChangeLog`** - データベース変更履歴
2. **`SystemPlanRestrictions`** - システムプラン制限設定
3. **`Tenant`** - テナント（ホテル）管理
4. **`TenantSystemPlan`** - テナント別システムプラン
5. **`admin`** - 管理者アカウント
6. **`admin_log`** - 管理者操作ログ
7. **`schema_version`** - スキーマバージョン管理
8. **`system_event`** - システムイベントログ

> **📋 更新履歴 (2025年1月27日)**  
> **客室状態変更ログの詳細化対応** - hotel-common統合管理による更新  
> 詳細仕様: [客室状態変更ログ統合仕様書](../integration/specifications/room-operation-log-specification.md)  
> **v2.0対応**: 詳細アクション（ROOM_CLEANING_COMPLETE等）とevent_data構造の標準化

### 👥 ユーザー・認証テーブル
9. **`staff`** - スタッフアカウント
10. **`customers`** - 顧客情報
11. **`tenant_access_logs`** - テナントアクセスログ

### 🏨 ホテル運営テーブル
12. **`rooms`** - 客室管理
13. **`room_grades`** - 客室グレード
14. **`reservations`** - 予約管理
15. **`checkin_sessions`** - チェックインセッション
16. **`session_billings`** - セッション請求管理
17. **`room_memos`** - 客室メモ（新設, 可視性/カテゴリ/履歴対応）
18. **`room_memo_comments`** - 客室メモコメント
19. **`room_memo_status_logs`** - 客室メモ状態遷移履歴
20. **`room_memo_reads`** - 既読管理（設計済, Phase 2 実装）

### 📱 デバイス・コンテンツ管理テーブル
17. **`device_rooms`** - デバイス・客室紐付け
18. **`device_video_caches`** - デバイス動画キャッシュ
19. **`pages`** - ページコンテンツ
20. **`page_histories`** - ページ履歴

### 🛒 注文・決済テーブル
21. **`Order`** - 注文管理
22. **`OrderItem`** - 注文アイテム
23. **`transactions`** - 取引記録
24. **`payments`** - 決済情報

### 🎯 キャンペーン管理テーブル
25. **`campaigns`** - キャンペーン
26. **`campaign_categories`** - キャンペーンカテゴリ
27. **`campaign_category_relations`** - カテゴリ関連
28. **`campaign_items`** - キャンペーンアイテム
29. **`campaign_translations`** - キャンペーン翻訳
30. **`campaign_usage_logs`** - キャンペーン使用ログ

### 🤖 AI・応答システムテーブル
31. **`response_trees`** - 応答ツリー
32. **`response_nodes`** - 応答ノード
33. **`response_node_translations`** - 応答ノード翻訳
34. **`response_tree_sessions`** - 応答ツリーセッション
35. **`response_tree_versions`** - 応答ツリーバージョン
36. **`response_tree_history`** - 応答ツリー履歴
37. **`response_tree_mobile_links`** - モバイルリンク

### 🔔 通知・サービス管理テーブル
38. **`notification_templates`** - 通知テンプレート
39. **`tenant_services`** - テナントサービス
40. **`service_plan_restrictions`** - サービスプラン制限
41. **`service_usage_statistics`** - サービス使用統計

## 🔧 技術仕様

### Prismaスキーマ設定
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "./src/generated/prisma"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 接続設定
- **本番環境**: `postgresql://hotel_app:password@localhost:5432/hotel_unified_db`
- **開発環境**: `postgresql://kaneko@localhost:5432/hotel_unified_db`

### 命名規則
- **テーブル名**: PascalCase（歴史的テーブル）/ snake_case（新設）。Prismaでは@@mapで正規化
- **カラム名**: camelCase（Prisma）/ snake_case（DB）。Prismaで@mapを使用
- **Prismaモデル**: PascalCase
- **@@map指定**: 必要に応じて大文字小文字を正確に指定

### 📌 変更履歴（客室メモ追加・rooms.notes廃止）
> **更新履歴 (2025-09-10, hotel-common 統合管理による更新)**
> - `room_memos` 系テーブルを追加（カテゴリ: reservation/handover/lost_item/maintenance/cleaning/guest_request/other、可視性: public/private/role、role時は `visible_roles`）
> - `rooms.notes` は廃止方針。既存値は `room_memos` へ一括移行（最古メモ or 系列化）
> - `RoomMemo` 作成/更新/削除/ステータス変更/コメント追加時は `system_event` に `MEMO_*` を記録

## 📈 主要機能

### ✅ 実装済み機能
1. **チェックインセッション管理** - 客室滞在期間の管理
2. **セッション請求システム** - セッション単位での料金計算
3. **注文・決済統合** - Order, Transaction, Payment連携
4. **多言語対応** - キャンペーン・応答システムの翻訳
5. **デバイス管理** - 客室デバイスとコンテンツ配信
6. **階層権限管理** - テナント・スタッフ・顧客の権限制御
7. **ソフトデリート** - 全テーブルで論理削除対応

### 🔄 データフロー
```
チェックイン → セッション作成 → 注文受付 → 決済処理 → 請求生成 → チェックアウト
     ↓              ↓           ↓          ↓          ↓           ↓
  客室割当      セッション管理   Order    Transaction  SessionBilling  セッション終了
```

## 🛡️ セキュリティ・制約

### データ整合性
- **外部キー制約**: 適切に設定済み
- **インデックス**: パフォーマンス最適化済み
- **ユニーク制約**: 重複防止設定済み

### アクセス制御
- **テナント分離**: すべてのデータがテナントIDで分離
- **ソフトデリート**: 物理削除を避けて監査証跡を保持
- **権限管理**: 階層的なアクセス制御

## 📊 監査・メンテナンス

### 自動監査システム
```bash
# 整合性チェック
npx ts-node scripts/database-schema-audit.ts

# 不足テーブル作成
npx ts-node scripts/create-missing-tables.ts

# Prismaクライアント再生成
npx prisma generate
```

### 定期メンテナンス
- **日次**: 整合性監査実行
- **週次**: パフォーマンス分析
- **月次**: スキーマ最適化検討

## 🚀 API エンドポイント

### 管理API
- `GET /api/v1/admin/front-desk/rooms` - 客室管理
- `GET /api/v1/admin/front-desk/accounting` - 会計管理
- `POST /api/v1/auth/login` - スタッフログイン

### セッション管理API
- `POST /api/v1/sessions/checkin` - チェックインセッション作成
- `GET /api/v1/sessions/:id` - セッション詳細取得
- `POST /api/v1/sessions/:id/checkout` - チェックアウト処理

### 注文・決済API
- `POST /api/v1/orders` - 注文作成
- `GET /api/v1/orders/:id` - 注文詳細
- `POST /api/v1/payments` - 決済処理

## 📝 重要な設計原則

### 1. Prisma優先原則
- **すべてのDB操作はPrisma経由**
- **直接SQL操作は禁止**
- **スキーマ変更はPrismaマイグレーション使用**

### 2. テナント分離原則
- **すべてのデータにtenantId必須**
- **クロステナントアクセス禁止**
- **テナント別権限管理**

### 3. 監査証跡原則
- **ソフトデリート必須**
- **作成者・更新者記録**
- **変更履歴保持**

## 🔗 関連ドキュメント

### 現在有効なドキュメント
- `DATABASE_SCHEMA_CONSISTENCY_REPORT.md` - 最新の整合性レポート
- `database-schema-audit-report.json` - 詳細監査データ
- `DATABASE_SAFETY_RULES.md` - 安全運用ルール

### 統合・廃止予定ドキュメント
- 古いマイグレーション関連ドキュメント → このマスタードキュメントに統合
- 個別テーブル作成ドキュメント → 統合済み
- 不整合分析ドキュメント → 問題解決済みのため廃止

---

## 🎯 今後の方針

### 短期目標 (1-2週間)
- [ ] 他システム（hotel-pms, hotel-saas, hotel-member）との連携テスト
- [ ] パフォーマンス最適化
- [ ] 追加機能の実装

### 中期目標 (1-3ヶ月)
- [ ] 本格運用開始
- [ ] 監視・アラートシステム構築
- [ ] バックアップ・復旧手順確立

### 長期目標 (3-6ヶ月)
- [ ] スケーラビリティ向上
- [ ] 新機能追加
- [ ] 他地域展開対応

---

**このドキュメントは、hotel-commonプロジェクトのデータベース・Prisma統合の完全な現状を記録したマスタードキュメントです。すべての関連作業はこのドキュメントを基準として実施してください。**

