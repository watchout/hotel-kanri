# データベースマイグレーション運用ガイド

**バージョン**: 1.1.0  
**最終更新**: 2025-10-03  
**SSOT準拠**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md`

---

## 📋 概要

このガイドは、hotel-commonプロジェクトにおけるPrismaマイグレーションの安全な実行方法を定めたものです。

### 基本方針

- **2ユーザー方式**: マイグレーション実行用（kaneko）とアプリケーション実行用（hotel_app）を分離
- **権限分離**: アプリケーションにはスキーマ変更権限を与えない
- **マイグレーション履歴の保持**: すべてのスキーマ変更はPrismaマイグレーションで管理

---

## 🔐 ユーザー構成

### kanekoユーザー（マイグレーション実行用）

- **役割**: マイグレーション実行専用
- **権限**: Superuser（全権限）
- **接続文字列**: `postgresql://kaneko@localhost:5432/hotel_unified_db`
- **使用タイミング**: 
  - マイグレーション作成（`npm run migrate:dev`）
  - マイグレーション適用（`npm run migrate:deploy`）
  - スキーマ確認（`npm run prisma:studio`）

### hotel_appユーザー（アプリケーション実行用）

- **役割**: アプリケーション実行専用
- **権限**: SELECT, INSERT, UPDATE, DELETE のみ
- **接続文字列**: `postgresql://hotel_app:password@localhost:5432/hotel_unified_db`
- **使用タイミング**: 
  - アプリケーション起動（`npm run dev`, `npm start`）
  - API実行時
  - 本番環境

---

## 🚀 使用方法

### 新規マイグレーション作成（開発環境）

```bash
# マイグレーション作成
npm run migrate:dev add_new_feature

# 例: デバイスアクセスログ追加
npm run migrate:dev add_device_access_log
```

**内部動作**:
1. kanekoユーザーでデータベースに接続
2. schema.prismaの変更を検出
3. マイグレーションファイルを生成
4. データベースに適用
5. Prismaクライアントを再生成

---

### マイグレーション適用（本番・ステージング環境）

```bash
# マイグレーション適用
npm run migrate:deploy

# バックアップ付き適用（推奨）
BACKUP=true npm run migrate:deploy
```

**内部動作**:
1. kanekoユーザーでデータベースに接続
2. 未適用のマイグレーションを検出
3. （本番環境の場合）確認プロンプト表示
4. （BACKUP=trueの場合）データベースバックアップ作成
5. マイグレーションを順次適用
6. Prismaクライアントを再生成

---

### マイグレーション状態確認

```bash
# マイグレーション状態を確認
npm run migrate:status
```

**表示内容**:
- 未適用のマイグレーション一覧
- データベース内のマイグレーション履歴（最新5件）
- テーブル統計

---

### Prisma Studio起動

```bash
# データベースGUIツール起動
npm run prisma:studio
```

kanekoユーザーで接続し、http://localhost:5555 でデータベースを確認できます。

---

## ⚠️ 重要な注意事項

### ✅ DO（推奨）

- ✅ マイグレーション作成・適用時は必ずkanekoユーザーを使用
- ✅ アプリケーション実行時は必ずhotel_appユーザーを使用
- ✅ 本番環境でのマイグレーション前にバックアップを取得
- ✅ マイグレーション名は意味のある名前を付ける
- ✅ schema.prismaの変更は必ずマイグレーションを作成

### ❌ DON'T（禁止）

- ❌ 直接SQLでテーブルを変更しない
- ❌ hotel_appユーザーでマイグレーションを実行しない
- ❌ 本番環境で`prisma migrate dev`を使用しない
- ❌ マイグレーションファイルを手動で編集しない
- ❌ マイグレーション履歴を削除しない

---

## 🔧 トラブルシューティング

### 問題1: 権限エラー

**エラー**: `ERROR: permission denied for schema public`

**原因**: hotel_appユーザーでマイグレーションを実行している

**解決策**:
```bash
# DATABASE_URL_MIGRATIONを使用してkanekoユーザーで実行
npm run migrate:deploy
```

---

### 問題2: マイグレーション履歴の不一致

**症状**: `Migration XXX has already been applied`

**解決策**:
```bash
# マイグレーション状態を確認
npm run migrate:status

# 必要に応じてマイグレーションを解決
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_migration_name
```

---

### 問題3: スキーマドリフト

**症状**: `Schema drift detected`

**解決策**:
```bash
# オプション1: データベースからスキーマを引き出す（推奨）
DATABASE_URL=$DATABASE_URL_MIGRATION npx prisma db pull

# オプション2: マイグレーションを適用
npm run migrate:deploy
```

---

## 📊 実装結果

### ✅ 完了した設定

| 項目 | 状態 |
|-----|------|
| hotel_appの権限 | ✅ SELECT, INSERT, UPDATE, DELETE 付与済み |
| 将来のテーブルへの権限 | ✅ 自動付与設定済み |
| マイグレーション履歴 | ✅ finished_at = NULL を修正済み |
| Prisma管理外SQL | ✅ バックアップ済み |
| 環境変数 | ✅ DATABASE_URL_MIGRATION 設定済み |
| マイグレーションスクリプト | ✅ 3つのスクリプト作成済み |
| npmスクリプト | ✅ 5つのコマンド追加済み |

---

## 🔗 関連ドキュメント

### SSOT文書
- [SSOT_DATABASE_MIGRATION_OPERATION.md](file:///Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_DATABASE_MIGRATION_OPERATION.md) - マイグレーション運用の詳細仕様

### スクリプト
- `scripts/migrate-dev.sh` - 開発環境用マイグレーション作成・適用
- `scripts/migrate-deploy.sh` - 本番環境用マイグレーション適用
- `scripts/migrate-status.sh` - マイグレーション状態確認

### Prisma公式ドキュメント
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Production troubleshooting](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)

---

## 📝 変更履歴

### v1.1.0 (2025-10-03)
- ✅ 2ユーザー方式（kaneko + hotel_app）の実装完了
- ✅ マイグレーション履歴の修復（finished_at = NULL を修正）
- ✅ 環境変数設定（DATABASE_URL_MIGRATION追加）
- ✅ Prisma管理外SQLファイルのバックアップ
- ✅ マイグレーション実行スクリプト3種作成
- ✅ npmスクリプト5種追加
- ✅ 運用ガイド作成

---

**作成者**: Iza（統合管理者）  
**SSOT準拠バージョン**: v1.1.0


