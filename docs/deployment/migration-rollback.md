# DBマイグレーション運用手順・ロールバック

## 概要

`prisma db push` から `prisma migrate` への移行に伴う運用手順。
ADR-017 Step 1 で策定。

---

## 1. マイグレーション方式

### 開発時（ローカル）

```bash
cd /path/to/hotel-common-rebuild

# 新しいマイグレーション作成（スキーマ変更後）
npx prisma migrate dev --name <migration_name>

# 命名規則: 動詞_対象 （例: add_staff_table, alter_orders_add_status）
```

### ステージング・本番デプロイ時

```bash
# マイグレーション適用（冪等・安全）
npx prisma migrate deploy
```

`prisma migrate deploy` は：
- 未適用のマイグレーションのみを順番に適用
- `_prisma_migrations` テーブルで適用済みを管理
- 対話的なプロンプトなし（CI/CD安全）

---

## 2. ステージングDBのベースライン化

ステージング環境は `prisma db push` で作成されたDBのため、
`prisma migrate` への移行時にベースライン設定が必要。

### 手順

```bash
# 1. ステージングDBに _prisma_migrations テーブルがないことを確認
psql -h <host> -U <user> -d <db> -c "SELECT * FROM _prisma_migrations;"

# 2. ベースラインを適用（既存スキーマをマイグレーション済みとしてマーク）
npx prisma migrate resolve --applied 0001_initial_schema

# 3. 状態確認
npx prisma migrate status
# → "Database schema is up to date!" と表示されること
```

### 注意事項
- `prisma migrate resolve --applied` はSQLを実行せず、`_prisma_migrations`に記録のみ
- 既存のテーブル・データに影響なし
- 実行前にDBバックアップを取得すること

---

## 3. ロールバック手順

### 3.1 マイグレーション適用前に戻す（推奨）

**前提**: マイグレーション適用前にバックアップを取得済み

```bash
# 1. バックアップ取得（マイグレーション前に必ず実行）
pg_dump -h <host> -U <user> -d <db> -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump

# 2. 問題発生時：バックアップからリストア
pg_restore -h <host> -U <user> -d <db> --clean --if-exists backup_YYYYMMDD_HHMMSS.dump
```

### 3.2 特定のマイグレーションを手動で巻き戻す

Prismaには自動ロールバック機能がないため、手動でDOWNスクリプトを実行する。

```bash
# 1. ロールバックSQLを実行（マイグレーションごとに用意）
psql -h <host> -U <user> -d <db> -f prisma/migrations/<migration_name>/rollback.sql

# 2. _prisma_migrationsテーブルから該当レコードを削除
psql -h <host> -U <user> -d <db> -c \
  "DELETE FROM _prisma_migrations WHERE migration_name = '<migration_name>';"

# 3. 状態確認
npx prisma migrate status
```

### 3.3 ロールバックSQLの作成ルール

今後のマイグレーションでは、`migration.sql` と対になる `rollback.sql` を作成する。

| migration.sql | rollback.sql |
|:---|:---|
| CREATE TABLE xxx | DROP TABLE IF EXISTS xxx |
| ALTER TABLE ADD COLUMN | ALTER TABLE DROP COLUMN |
| CREATE INDEX | DROP INDEX IF EXISTS |
| ALTER TABLE ADD CONSTRAINT | ALTER TABLE DROP CONSTRAINT |

**初期マイグレーション (`0001_initial_schema`) のロールバック**:
全テーブルのDROPになるため、pg_dumpからのリストアを使用する。

---

## 4. 本番デプロイフロー

### デプロイ前チェックリスト

```
□ マイグレーションファイルがmainブランチにマージ済み
□ ステージングで migrate deploy テスト済み
□ rollback.sql を作成済み（該当する場合）
□ DBバックアップを取得済み
```

### デプロイ手順

```bash
# 1. バックアップ取得
pg_dump -h <host> -U <user> -d <db> -Fc -f pre_deploy_$(date +%Y%m%d_%H%M%S).dump

# 2. マイグレーション適用
npx prisma migrate deploy

# 3. 適用結果確認
npx prisma migrate status

# 4. アプリケーション再起動
# (Docker/PM2等の環境に応じて)

# 5. ヘルスチェック
curl -s https://api.omotenasuai.com/health | jq .
```

### 問題発生時

```bash
# 1. アプリケーション停止
# 2. バックアップからリストア
pg_restore -h <host> -U <user> -d <db> --clean --if-exists pre_deploy_YYYYMMDD_HHMMSS.dump
# 3. アプリケーション再起動（旧バージョンのコードで）
```

---

## 5. npm scripts（hotel-common-rebuild）

`package.json` に以下を追加する：

```json
{
  "scripts": {
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:migrate:status": "prisma migrate status",
    "db:migrate:reset": "prisma migrate reset",
    "db:backup": "pg_dump -Fc -f backup_$(date +%Y%m%d_%H%M%S).dump $DATABASE_URL"
  }
}
```

---

## 6. CI/CD統合

GitHub Actions での自動マイグレーション（deploy-common.yml）:

```yaml
- name: Run database migrations
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

`prisma db push` の呼び出しは全て `prisma migrate deploy` に置き換える。

---

## 改訂履歴

| 日付 | 内容 |
|------|------|
| 2026-03-30 | 初版: ADR-017 Step 1 に基づき策定 |
