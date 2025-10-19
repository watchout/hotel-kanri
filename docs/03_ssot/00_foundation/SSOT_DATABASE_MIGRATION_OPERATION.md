# SSOT: データベースマイグレーション運用ガイド

**作成日**: 2025-10-02  
**最終更新**: 2025-10-02  
**バージョン**: 1.1.0  
**ステータス**: ✅ 確定（既存ユーザー活用版）  
**優先度**: 🔴 最優先（Phase 0）

**関連SSOT**:
- [SSOT_SAAS_DATABASE_SCHEMA.md](./SSOT_SAAS_DATABASE_SCHEMA.md) - データベーススキーマ統一
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤

---

## 📋 目次

1. [概要](#概要)
2. [現状の問題](#現状の問題)
3. [権限エラーの原因と対策](#権限エラーの原因と対策)
4. [マイグレーション運用フロー](#マイグレーション運用フロー)
5. [環境別設定](#環境別設定)
6. [トラブルシューティング](#トラブルシューティング)
7. [ベストプラクティス](#ベストプラクティス)

---

## 📖 概要

### 目的
Prismaマイグレーションを安全・確実に実行し、スキーマドリフトを防ぐための運用手順を確立する。

### 基本方針
- **Prismaを唯一のデータベースアクセス手段とする**
- **直接的なSQL操作は原則として禁止**
- **スキーマ変更はマイグレーションを通じてのみ実施**
- **環境ごとに適切な権限を設定**

---

## 🚨 現状の問題

### 発見された主要な問題

#### 1. 権限エラーの頻発
**症状**: マイグレーション実行時に権限エラーが発生し、スムーズなマイグレーションができない

**原因**:
- アプリケーション用DBユーザーにスキーマ変更権限がない
- マイグレーション用DBユーザーと実行時DBユーザーが混在
- 環境変数の設定が不適切

---

#### 2. スキーマドリフト（不一致）
**症状**: Prismaスキーマと実際のデータベースの構造が一致しない

**原因**:
- 直接SQLでのテーブル変更
- マイグレーション失敗後の不完全な状態
- マイグレーション履歴の不整合

---

#### 3. 同名マイグレーションの存在
**症状**: 同じ日に同じ名前のマイグレーションが複数存在

**発見事例**:
```
20250731020156_add_tenant_service_management
20250731123000_add_tenant_service_management  ← 同名
```

**影響**: マイグレーション履歴の追跡が困難

---

#### 4. テーブルの削除と再作成
**症状**: シャドウデータベースとの不整合

**発見事例**:
- `service_usage_statistics`テーブルが削除されて再作成
- Staffテーブルの`password_hash`フィールドの不一致

---

#### 5. SQLファイルの直接配置
**症状**: マイグレーションディレクトリ内に`.sql`ファイルが直接配置されている

**発見事例**:
```
prisma/migrations/
  ├─ 20250916_001_create_memo_shared_tables.sql  ← Prisma管理外
  ├─ 20250916_002_create_memo_indexes.sql       ← Prisma管理外
  └─ add_media_display_controls.sql             ← Prisma管理外
```

**影響**: Prismaのマイグレーション履歴に記録されない

---

## 🔐 権限エラーの原因と対策

### 問題の詳細

現在の環境では、**すべての操作を同じDBユーザーで実行**しているため、以下のジレンマが発生：

```
パターンA: app_user（最小権限）を使用
  ✅ セキュリティ: 高い
  ❌ マイグレーション: 実行不可（スキーマ変更権限がない）

パターンB: migration_user（全権限）を使用
  ✅ マイグレーション: 実行可能
  ❌ セキュリティ: 低い（アプリが全権限を持つのは危険）
```

---

### 解決策: 2ユーザー方式

#### ユーザー1: migration_user（マイグレーション専用）

**hotel-commonでの実装**:
- 実際のユーザー: `kaneko`（既存Superuser）
- 新規作成不要

**用途**: マイグレーション実行時のみ使用

**権限**:
```sql
-- kanekoユーザーはSuperuserのため全権限を保有
-- 追加の権限付与は不要
```

**使用タイミング**:
- ✅ `npx prisma migrate dev`
- ✅ `npx prisma migrate deploy`
- ✅ `npx prisma db push`
- ✅ スキーマ変更作業

---

#### ユーザー2: app_user（アプリケーション実行用）

**hotel-commonでの実装**:
- 実際のユーザー: `hotel_app`（既存）
- 新規作成不要、権限追加のみ必要

**用途**: アプリケーション実行時に使用

**権限**:
```sql
-- データ操作のみ（スキーマ変更不可）
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hotel_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO hotel_app;

-- 将来作成されるテーブルにも自動付与
ALTER DEFAULT PRIVILEGES FOR ROLE kaneko IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hotel_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kaneko IN SCHEMA public 
  GRANT USAGE ON SEQUENCES TO hotel_app;
```

**使用タイミング**:
- ✅ アプリケーション起動時
- ✅ API実行時
- ✅ 本番環境

---

### PostgreSQLユーザー設定手順

#### hotel-common実装版（既存ユーザー活用）

**前提**:
- ✅ `kaneko`ユーザー: 既存（Superuser）→ migration_user役
- ✅ `hotel_app`ユーザー: 既存 → app_user役
- 🔧 hotel_appに権限追加のみ必要

---

#### ステップ1: データベースに接続

```bash
# PostgreSQLに管理者として接続
psql -U postgres -d hotel_unified_db
```

---

#### ステップ2: hotel_app（app_user役）に権限追加

```sql
-- 既存テーブルへの権限付与
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hotel_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO hotel_app;

-- 将来kanekoが作成するテーブルにも自動付与
ALTER DEFAULT PRIVILEGES FOR ROLE kaneko IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hotel_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kaneko IN SCHEMA public 
  GRANT USAGE ON SEQUENCES TO hotel_app;
```

---

#### ステップ3: 権限確認

```sql
-- kanekoの権限確認（Superuserであることを確認）
\du kaneko

-- hotel_appの権限確認
\du hotel_app

-- テーブル権限確認（hotel_appがアクセス可能か）
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'staff' AND grantee = 'hotel_app';
```

---

#### ステップ4: マイグレーション履歴の修復（hotel-common固有）

```sql
-- finished_at が NULL のマイグレーションを修正
UPDATE _prisma_migrations 
SET finished_at = NOW() 
WHERE finished_at IS NULL;

-- 確認
SELECT migration_name, finished_at 
FROM _prisma_migrations 
WHERE finished_at IS NULL;
```

---

## 🔄 マイグレーション運用フロー

### フロー1: 新規マイグレーション作成

#### ステップ1: スキーマ編集
```bash
# schema.prismaを編集
vim prisma/schema.prisma
```

---

#### ステップ2: マイグレーション生成

```bash
# 環境変数をkaneko（migration_user役）に設定
export DATABASE_URL="postgresql://kaneko@localhost:5432/hotel_unified_db"

# マイグレーション生成
npx prisma migrate dev --name descriptive_name

# 例: デバイスアクセスログテーブル追加
npx prisma migrate dev --name add_device_access_log
```

**命名規則**:
- ✅ 良い例: `add_device_access_log`, `update_staff_schema`, `remove_deprecated_fields`
- ❌ 悪い例: `migration1`, `test`, `fix`

---

#### ステップ3: マイグレーションファイル確認

```bash
# 生成されたマイグレーションファイルを確認
cat prisma/migrations/YYYYMMDDHHMMSS_descriptive_name/migration.sql
```

**確認ポイント**:
- ✅ SQL文が正しいか
- ✅ 意図しない`DROP TABLE`がないか
- ✅ データ損失のリスクがないか
- ✅ インデックスが適切か

---

#### ステップ4: レビュー

```bash
# Gitでマイグレーションファイルをステージング
git add prisma/migrations/YYYYMMDDHHMMSS_descriptive_name/
git add prisma/schema.prisma

# コミット
git commit -m "feat: add device access log table"
```

**レビュー項目**:
- マイグレーション内容の妥当性
- パフォーマンスへの影響
- ダウンタイムの有無
- ロールバック計画

---

### フロー2: 既存環境へのマイグレーション適用

#### ステップ1: バックアップ

```bash
# データベースバックアップ
pg_dump -U postgres hotel_unified_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

**重要**: 本番環境では必ずバックアップを取得

---

#### ステップ2: マイグレーション適用

```bash
# 環境変数をkaneko（migration_user役）に設定
export DATABASE_URL="postgresql://kaneko@localhost:5432/hotel_unified_db"

# マイグレーション適用
npx prisma migrate deploy
```

**`migrate deploy`の特徴**:
- シャドウデータベース不要
- 本番環境向け
- エラー時に停止（安全）

---

#### ステップ3: Prismaクライアント再生成

```bash
# Prismaクライアント生成
npx prisma generate
```

---

#### ステップ4: アプリケーション再起動

```bash
# アプリケーションをhotel_app（app_user役）で起動
export DATABASE_URL="postgresql://hotel_app:password@localhost:5432/hotel_unified_db"

# アプリケーション起動
npm run start
```

---

### フロー3: スキーマドリフト解消

**症状**: `prisma validate`でエラーが発生

```bash
# スキーマ検証
npx prisma validate

# エラー例
Error: P1014: The underlying table for model `DeviceRoom` does not exist.
```

---

#### 解消手順

##### オプション1: データベースからスキーマを引き出す（推奨）

```bash
# 現在のデータベース構造を取得
npx prisma db pull

# 差分を確認
git diff prisma/schema.prisma

# 問題がなければコミット
git add prisma/schema.prisma
git commit -m "fix: sync schema with database"
```

---

##### オプション2: スキーマをデータベースに強制適用（危険）

```bash
# ⚠️ 警告: データ損失の可能性あり
# 開発環境のみで使用

# スキーマを強制的にデータベースに適用
npx prisma db push --accept-data-loss
```

**注意**: 本番環境では絶対に使用しないこと

---

##### オプション3: マイグレーションリセット（開発環境のみ）

```bash
# ⚠️ 警告: 全データが削除されます
# 開発環境のみで使用

# マイグレーション履歴とデータをすべてリセット
npx prisma migrate reset
```

---

## 🌐 環境別設定

### 開発環境（Local）

**DATABASE_URL設定**:
```bash
# .env.development（hotel-common）
# マイグレーション用
DATABASE_URL_MIGRATION=postgresql://kaneko@localhost:5432/hotel_unified_db

# アプリケーション用
DATABASE_URL=postgresql://hotel_app:password@localhost:5432/hotel_unified_db
```

**特徴**:
- kanekoユーザーを使用（スキーマ変更自由）
- `prisma migrate dev`を使用
- データ損失のリスクは許容

---

### ステージング環境（Staging）

**DATABASE_URL設定**:
```bash
# マイグレーション実行時
DATABASE_URL_MIGRATION="postgresql://migration_user:staging_migration_password@staging-db:5432/hotel_staging"

# アプリケーション実行時
DATABASE_URL="postgresql://app_user:staging_app_password@staging-db:5432/hotel_staging"
```

**特徴**:
- マイグレーション時のみmigration_user
- アプリ実行時はapp_user
- `prisma migrate deploy`を使用
- 本番環境のリハーサル

---

### 本番環境（Production）

**DATABASE_URL設定**:
```bash
# マイグレーション実行時（デプロイ時のみ）
DATABASE_URL_MIGRATION="postgresql://migration_user:prod_migration_password@prod-db:5432/hotel_prod"

# アプリケーション実行時
DATABASE_URL="postgresql://app_user:prod_app_password@prod-db:5432/hotel_prod"
```

**特徴**:
- アプリはapp_userのみ使用
- migration_userは厳重に管理
- `prisma migrate deploy`を使用
- ダウンタイム最小化

---

### 環境変数管理

```bash
# hotel-common/.env
NODE_ENV=development

# マイグレーション用（開発時のみ使用）
DATABASE_URL_MIGRATION=postgresql://kaneko@localhost:5432/hotel_unified_db

# アプリケーション用（実行時に使用）
DATABASE_URL=postgresql://hotel_app:password@localhost:5432/hotel_unified_db
```

**切り替え方法**:
```bash
# マイグレーション実行時
export DATABASE_URL=$DATABASE_URL_MIGRATION
npx prisma migrate deploy

# アプリケーション起動時
export DATABASE_URL=postgresql://hotel_app:password@localhost:5432/hotel_unified_db
npm run start
```

---

## 🔧 トラブルシューティング

### 問題1: 権限エラー

**エラーメッセージ**:
```
ERROR: permission denied for schema public
```

**原因**: hotel_app（app_user役）でマイグレーションを実行している

**解決策**:
```bash
# DATABASE_URLをkaneko（migration_user役）に変更
export DATABASE_URL="postgresql://kaneko@localhost:5432/hotel_unified_db"
npx prisma migrate deploy
```

---

### 問題2: シャドウデータベースエラー

**エラーメッセージ**:
```
P3006: Migration failed to apply cleanly to the shadow database
```

**原因**: 
- マイグレーション履歴の不整合
- 同名マイグレーションの存在
- テーブルの削除と再作成

**解決策**:
```bash
# オプション1: シャドウデータベースを無効化
npx prisma migrate deploy  # シャドウDB不要

# オプション2: マイグレーションをリセット（開発環境のみ）
npx prisma migrate reset

# オプション3: 問題のあるマイグレーションを削除して再作成
rm -rf prisma/migrations/YYYYMMDDHHMMSS_problematic_migration/
npx prisma migrate dev --name fixed_migration
```

---

### 問題3: マイグレーション履歴の不一致

**症状**: `_prisma_migrations`テーブルとファイルが一致しない

**確認方法**:
```sql
-- マイグレーション履歴確認
SELECT migration_name, finished_at, rolled_back_at 
FROM _prisma_migrations 
ORDER BY finished_at DESC;
```

**解決策**:
```bash
# オプション1: マイグレーション状態をリセット
npx prisma migrate resolve --applied YYYYMMDDHHMMSS_migration_name

# オプション2: 失敗したマイグレーションをロールバック
npx prisma migrate resolve --rolled-back YYYYMMDDHHMMSS_migration_name
```

---

### 問題4: 直接SQLファイルの処理

**症状**: `prisma/migrations/`に`.sql`ファイルが直接配置されている

**発見事例**:
```
prisma/migrations/
  ├─ 20250916_001_create_memo_shared_tables.sql
  ├─ 20250916_002_create_memo_indexes.sql
  └─ add_media_display_controls.sql
```

**問題**: これらはPrismaのマイグレーション管理外

**解決策**:
```bash
# 1. Prismaマイグレーションとして正式に作成
npx prisma migrate dev --name create_memo_shared_tables --create-only

# 2. 生成されたmigration.sqlに内容をコピー
cat 20250916_001_create_memo_shared_tables.sql > \
  prisma/migrations/YYYYMMDDHHMMSS_create_memo_shared_tables/migration.sql

# 3. マイグレーション適用
npx prisma migrate deploy

# 4. 古いSQLファイルを削除
rm 20250916_001_create_memo_shared_tables.sql
```

---

### 問題5: 同名マイグレーションの存在

**症状**: 同じ名前のマイグレーションが複数存在

**発見事例**:
```
20250731020156_add_tenant_service_management
20250731123000_add_tenant_service_management
```

**解決策**:
```bash
# 1. どちらが正しいか確認
cat prisma/migrations/20250731020156_add_tenant_service_management/migration.sql
cat prisma/migrations/20250731123000_add_tenant_service_management/migration.sql

# 2. 不要な方をバックアップして削除
mv prisma/migrations/20250731020156_add_tenant_service_management \
   prisma/migrations_backup/

# 3. 残った方の名前を変更
mv prisma/migrations/20250731123000_add_tenant_service_management \
   prisma/migrations/20250731123000_add_tenant_service_management_consolidated
```

---

## ✅ ベストプラクティス

### 1. マイグレーション作成時

✅ **DO（推奨）**:
- 意味のある名前を付ける
- 1つのマイグレーションで1つの変更を行う
- マイグレーション前にバックアップ
- 生成されたSQLを必ず確認
- チームメンバーにレビューを依頼

❌ **DON'T（禁止）**:
- 同じ日に同じ名前のマイグレーションを作成
- テーブルの削除と再作成を同日に実行
- 確認せずにマイグレーションを適用
- 本番環境で`prisma migrate dev`を使用
- 本番環境で`prisma migrate reset`を使用

---

### 2. マイグレーション適用時

✅ **DO（推奨）**:
- 本番環境では`prisma migrate deploy`を使用
- 適用前にバックアップを取得
- ステージング環境で事前テスト
- ダウンタイムを計画
- ロールバック手順を準備

❌ **DON'T（禁止）**:
- app_userでマイグレーションを実行
- バックアップなしで本番適用
- 複数のマイグレーションを同時適用

---

### 3. 権限管理

✅ **DO（推奨）**:
- マイグレーション実行時はkaneko（migration_user役）
- アプリケーション実行時はhotel_app（app_user役）
- パスワードは環境変数で管理
- 本番環境のmigration_user相当のパスワードは厳重に管理

❌ **DON'T（禁止）**:
- すべての操作をkaneko（Superuser）で実行
- パスワードをコードにハードコード
- kanekoユーザーをアプリケーション実行時に使用

---

### 4. スキーマ管理

✅ **DO（推奨）**:
- Prismaを唯一のスキーマ変更手段とする
- schema.prismaをGitで管理
- マイグレーションファイルをGitで管理
- 定期的にスキーマ検証を実行

❌ **DON'T（禁止）**:
- 直接SQLでテーブルを変更
- schema.prismaを手動で編集（データベースから引き出す場合を除く）
- マイグレーションファイルを手動で編集
- マイグレーションファイルを削除

---

### 5. 命名規則

**マイグレーション名**:
- ✅ `add_device_access_log` - 何を追加するか明確
- ✅ `update_staff_password_hash` - 何を更新するか明確
- ✅ `remove_deprecated_session_fields` - 何を削除するか明確
- ❌ `migration_20251002` - 何をするか不明
- ❌ `fix` - 何を修正するか不明
- ❌ `test` - テスト用は避ける

**テーブル名**:
- PostgreSQL: `snake_case` (例: `device_access_logs`)
- Prismaモデル: `PascalCase` (例: `DeviceAccessLog`)

---

## 📊 運用チェックリスト

### 日次チェック

- [ ] マイグレーション実行エラーがないか確認
- [ ] アプリケーションログに権限エラーがないか確認

### 週次チェック

- [ ] スキーマドリフトがないか検証
- [ ] バックアップが正常に取得されているか確認
- [ ] マイグレーション履歴が一貫しているか確認

### 月次チェック

- [ ] 不要なマイグレーションバックアップを削除
- [ ] データベースユーザーの権限を再確認
- [ ] マイグレーション運用のレビュー

---

## 🔗 関連ドキュメント

### 既存ドキュメント
- `/Users/kaneko/hotel-kanri/docs/01_systems/common/database/SQL_DIRECT_OPERATION_PREVENTION.md` - SQL直接操作禁止ポリシー
- `/Users/kaneko/hotel-kanri/docs/01_systems/common/database/archived/20250901/migration-issue-analysis.md` - マイグレーション問題分析

### Prisma公式ドキュメント
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Shadow Database](https://www.prisma.io/docs/concepts/components/prisma-migrate/shadow-database)
- [Troubleshooting Prisma Migrate](https://www.prisma.io/docs/guides/migrate/troubleshooting-prisma-migrate)

### 関連ドキュメント
- [SSOT_SAAS_DATABASE_SCHEMA.md](./SSOT_SAAS_DATABASE_SCHEMA.md) - データベーススキーマ統一
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SCHEMA_CONSISTENCY_CHECK_REPORT.md](./SCHEMA_CONSISTENCY_CHECK_REPORT.md) - スキーマ整合性チェックレポート（2025-10-02）

---

**最終更新**: 2025年10月2日  
**作成者**: Iza（統合管理者）  
**レビュー**: 実施済み（既存ユーザー活用版に更新）  
**承認**: 未実施

---

## 📝 更新履歴

### v1.1.0 - 2025-10-02
- **既存ユーザー活用版に変更**
  - migration_user役 → `kaneko`（既存Superuser）
  - app_user役 → `hotel_app`（既存、権限追加必要）
  - hotel-common固有のマイグレーション履歴修復手順を追加
  - 新規ユーザー作成手順を既存ユーザー権限追加手順に変更

### v1.0.0 - 2025-10-02
- 初版作成
- 2ユーザー方式の提案（新規ユーザー作成版）

