## 最小DB移行ランブック（rebuild版）

### 目的
- Prismaでスキーマを適用し、データは「データのみ」で移送する最小手順。
- ローカル→（将来）開発サーバー→本番の順に同一手順で展開。

### 前提
- 新コード: `/Users/kaneko/hotel-common-rebuild`
- DB名（恒久）: `hotel_common`
- スキーマはPrisma Migrateで作成・管理（SQL直編集禁止）

---

### A. ローカルのデータバックアップ（実施済み例あり）
- 推奨: pg_dump（Custom形式, データのみ）またはCSV一括出力（フォールバック）

1) pg_dump（推奨／サーバーとpg_dumpのメジャー一致が必要）
```bash
BACKUP_DIR="/Users/kaneko/hotel-common-rebuild/backups"
mkdir -p "$BACKUP_DIR"
DUMP_FILE="$BACKUP_DIR/hotel_common_data_$(date +%Y%m%d_%H%M%S).dump"
pg_dump -U kaneko -h localhost -d hotel_common \
  -Fc --data-only --no-privileges --no-owner \
  -f "$DUMP_FILE"
```

2) CSVエクスポート（フォールバック）
```bash
/Users/kaneko/hotel-kanri/tmp/db_audit/export_csv.sh hotel_common
# 出力例: /Users/kaneko/hotel-common-rebuild/backups/csv_YYYYMMDD_HHMMSS/*.csv
```

---

### B. 新環境（サーバー）への初期化手順（準備後に実行）
1) DB作成・接続設定
```bash
createdb -U <USER> -h <HOST> hotel_common
cd /path/to/hotel-common-rebuild
echo "DATABASE_URL=postgresql://<USER>:<PASS>@<HOST>:5432/hotel_common" > .env
```

2) Prismaでスキーマ適用
```bash
cd /path/to/hotel-common-rebuild
npx prisma migrate deploy
npx prisma migrate status
```

3) データ復元（いずれか）
- pg_restore（データのみダンプ）
```bash
pg_restore -U <USER> -h <HOST> -d hotel_common -a /path/to/hotel_common_data_YYYYMMDD_HHMMSS.dump
```
- CSVからの復元（例）
```bash
for f in /path/to/csv_YYYYMMDD_HHMMSS/*.csv; do \
  tbl=$(basename "$f" .csv); \
  psql -U <USER> -h <HOST> -d hotel_common -c "\\copy \"$tbl\" FROM '$f' WITH (FORMAT csv, HEADER true)"; \
done
```

4) 検算・スモーク
```sql
-- 件数サンプル
SELECT 'rooms' tbl, COUNT(*) FROM rooms
UNION ALL SELECT 'room_grades', COUNT(*) FROM room_grades
UNION ALL SELECT 'menu_items', COUNT(*) FROM menu_items;

-- CRUDスモーク（例: room_grades）
INSERT INTO room_grades (id, tenant_id, code, name, created_at, updated_at)
VALUES ('smk1','default','SMK-1','Smoke',now(),now());
UPDATE room_grades SET name='Smoke-OK' WHERE id='smk1';
DELETE FROM room_grades WHERE id='smk1';
```

---

### 注意事項
- スキーマ変更は必ずPrisma Migrateで実施（直SQL禁止）
- 環境差は接続情報のみ。手順は全環境で同一。
- データ復元は原則「データのみ」。スキーマはMigrateで統一。





