# UNIFY-DEV 指示書（hotel-pms｜Luna 担当）

## 目的
- ドキュメントのDBユーザー・ポート・ヘルス表記を正準化し、統合DB `hotel_unified_db` 前提へ統一。

## ブランチ
- `unify-dev/pms-docs-db-and-ports`

## 修正対象
1) `docs/test-tenant-configuration.md`
   - DBユーザー例: `postgres` → `hotel_app`（postgresは備考へ）
   - 3300/3301 と `strictPort: true` を明記
2) `/health` 確認手順の明記（3300。Electron 3301は注記）

## ENV例（文中例は統一）
```
DATABASE_URL=postgresql://hotel_app:${DB_PASSWORD}@<HOST>:5432/hotel_unified_db
PORT=3300
```

## セルフチェック
```
grep -R -nE "DATABASE_URL|hotel_unified_db|3300|3301|strictPort" docs | cat
```

## 受入基準
- DBユーザー例が `hotel_app`
- 3300/3301 と `strictPort: true` が明記
- `/health` 手順の明記（3300）

## 追加: No-Local-DB 運用
- `.env`/環境変数の `DATABASE_URL` は統合DBのみを指す（`localhost`/`127.0.0.1`/`::1` 禁止）
- `scripts/verify-db-url.sh` を Browser/Electron の起動前に必ず実行
