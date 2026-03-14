# データベース管理ドキュメント

**最終更新**: 2025-09-01  
**ステータス**: ✅ 完全整合性確認済み

このディレクトリには、hotel-commonプロジェクトのデータベース管理に関する統合ドキュメントが含まれています。

## 📋 主要ドキュメント

### 🎯 マスタードキュメント
- **[CURRENT_DATABASE_STATE_MASTER.md](./CURRENT_DATABASE_STATE_MASTER.md)** - 現在のデータベース・Prisma統合の完全な状態
- **[DATABASE_SCHEMA_CONSISTENCY_REPORT.md](./DATABASE_SCHEMA_CONSISTENCY_REPORT.md)** - 最新の整合性監査レポート
- **[database-schema-audit-report.json](./database-schema-audit-report.json)** - 詳細監査データ（JSON形式）

### 🛡️ 安全性とガイドライン
- **[DATABASE_SAFETY_RULES.md](./DATABASE_SAFETY_RULES.md)** - データベース操作の基本方針と禁止事項
- **[DATABASE_CONNECTION_GUIDE.md](./DATABASE_CONNECTION_GUIDE.md)** - データベース接続設定ガイド
- **[SQL_DIRECT_OPERATION_PREVENTION.md](./SQL_DIRECT_OPERATION_PREVENTION.md)** - 直接SQL操作の防止策

### 🔧 運用・開発ガイド
- **[prisma-development-rules.md](./prisma-development-rules.md)** - Prisma開発ルール
- **[prisma-adapter-usage-guide.md](./prisma-adapter-usage-guide.md)** - Prismaアダプター使用ガイド
- **[SOFT_DELETE_IMPLEMENTATION_GUIDE.md](./SOFT_DELETE_IMPLEMENTATION_GUIDE.md)** - ソフトデリート実装ガイド
- **[SOFT_DELETE_STATUS_REPORT.md](./SOFT_DELETE_STATUS_REPORT.md)** - ソフトデリート実装状況

### 📊 実装・テスト
- **[implementation-checklist.md](./implementation-checklist.md)** - 実装チェックリスト
- **[TEST_DATA_SETUP.md](./TEST_DATA_SETUP.md)** - テストデータセットアップガイド
- **[device-room-operations-guide.md](./device-room-operations-guide.md)** - デバイス・客室操作ガイド
- **[device-room-table-creation.md](./device-room-table-creation.md)** - デバイス・客室テーブル作成

### 📁 サブディレクトリ
- **[change-requests/](./change-requests/)** - データベース変更リクエスト
- **[design/](./design/)** - データベース設計ドキュメント
- **[migrations/](./migrations/)** - マイグレーション仕様
- **[archived/](./archived/)** - アーカイブされた古いドキュメント

## 🗄️ 現在のデータベース状態

### 基本情報
- **データベース名**: `hotel_unified_db`
- **テーブル数**: 41個
- **Prismaモデル数**: 41個
- **整合性**: ✅ 100% (41/41)

### 主要テーブル群
1. **システム管理** (8テーブル): Tenant, SystemPlanRestrictions, admin, etc.
2. **ユーザー・認証** (3テーブル): staff, customers, tenant_access_logs
3. **ホテル運営** (5テーブル): rooms, reservations, checkin_sessions, etc.
4. **デバイス・コンテンツ** (4テーブル): device_rooms, pages, etc.
5. **注文・決済** (4テーブル): Order, OrderItem, transactions, payments
6. **キャンペーン** (6テーブル): campaigns, campaign_categories, etc.
7. **AI・応答システム** (7テーブル): response_trees, response_nodes, etc.
8. **通知・サービス** (4テーブル): notification_templates, tenant_services, etc.

## 🔧 関連スクリプト

### 監査・メンテナンス
```bash
# 整合性監査
npx ts-node scripts/database-schema-audit.ts

# 不足テーブル作成
npx ts-node scripts/create-missing-tables.ts

# ドキュメント分析
npx ts-node scripts/analyze-database-docs.ts
```

### Prisma操作
```bash
# クライアント再生成
npx prisma generate

# スキーマフォーマット
npx prisma format

# データベース接続テスト
npx prisma db pull --preview-feature
```

### シードデータ
```bash
# テストデータ投入
npx ts-node scripts/seed-test-data.ts
```

## 🚀 API エンドポイント

### 管理API
- `GET /api/v1/admin/front-desk/rooms` - 客室管理
- `GET /api/v1/admin/front-desk/accounting` - 会計管理
- `POST /api/v1/auth/login` - スタッフログイン

### セッション管理
- `POST /api/v1/sessions/checkin` - チェックインセッション作成
- `GET /api/v1/sessions/:id` - セッション詳細
- `POST /api/v1/sessions/:id/checkout` - チェックアウト

### 注文・決済
- `POST /api/v1/orders` - 注文作成
- `GET /api/v1/orders/:id` - 注文詳細
- `POST /api/v1/payments` - 決済処理

## 📏 重要な設計原則

### 1. Prisma優先原則
- **すべてのDB操作はPrisma経由で実行**
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

## 🔄 開発フロー

### スキーマ変更
1. **Prismaスキーマ更新** (`prisma/schema.prisma`)
2. **整合性チェック** (`npx ts-node scripts/database-schema-audit.ts`)
3. **Prismaクライアント再生成** (`npx prisma generate`)
4. **テスト実行**
5. **本番適用**

### 新機能追加
1. **設計書作成** (design/ディレクトリ)
2. **スキーマ設計**
3. **API実装**
4. **テスト作成**
5. **ドキュメント更新**

## 🚨 トラブルシューティング

### 整合性エラー
```bash
# 1. 整合性チェック
npx ts-node scripts/database-schema-audit.ts

# 2. 不足テーブル作成
npx ts-node scripts/create-missing-tables.ts

# 3. Prismaクライアント再生成
npx prisma generate
```

### 接続エラー
1. **DATABASE_URL環境変数確認**
2. **PostgreSQLサーバー起動確認**
3. **ユーザー権限確認** (hotel_app, kaneko)

### パフォーマンス問題
1. **インデックス確認**
2. **クエリ最適化**
3. **統計情報更新**

## 📈 監視・メンテナンス

### 日次作業
- [ ] 整合性監査実行
- [ ] バックアップ確認
- [ ] パフォーマンス監視

### 週次作業
- [ ] 統計情報更新
- [ ] ログ分析
- [ ] 容量監視

### 月次作業
- [ ] スキーマ最適化検討
- [ ] インデックス見直し
- [ ] アーカイブ処理

## 🎯 今後の予定

### 短期 (1-2週間)
- [ ] 他システム連携テスト
- [ ] パフォーマンス最適化
- [ ] 監視システム構築

### 中期 (1-3ヶ月)
- [ ] 本格運用開始
- [ ] 自動化拡充
- [ ] 新機能追加

### 長期 (3-6ヶ月)
- [ ] スケーラビリティ向上
- [ ] 他地域展開対応
- [ ] AI機能強化

---

## 📞 サポート

問題や質問がある場合は、以下を参照してください：

1. **[CURRENT_DATABASE_STATE_MASTER.md](./CURRENT_DATABASE_STATE_MASTER.md)** - 現在の完全な状態
2. **[DATABASE_SAFETY_RULES.md](./DATABASE_SAFETY_RULES.md)** - 安全運用ルール
3. **整合性監査スクリプト** - 自動診断ツール

**重要**: すべてのデータベース操作は、このドキュメント群に記載された原則に従って実施してください。