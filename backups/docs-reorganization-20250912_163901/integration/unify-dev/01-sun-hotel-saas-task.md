# UNIFY-DEV 指示書（hotel-saas｜Sun 担当）

## 目的
- ドキュメントのDB名・ポート・移行記述を正準化し、統合DB `hotel_unified_db` 前提へ統一。

## ブランチ
- `unify-dev/saas-docs-db-and-ports`

## 修正対象（優先順）
1) `docs/development-setup.md`
   - `hotel_integrated` → `hotel_unified_db`（全箇所）
   - `PORT=3100` と `strictPort: true` を明記
2) `docs/database-integration-spec.md`
   - `process.env.DB_NAME || 'hotel_integrated'` を撤廃（単一DB前提）
   - `createdb/psql/pg_dump/pg_restore` 例の `hotel_integrated` を整理（`hotel_unified_db`基準に）
3) `docs/database/POSTGRESQL_MIGRATION_PLAN.md`
   - `hotel_saas` 固有例を `hotel_unified_db` に統一
   - 「統合DBへ一度だけ deploy」「reset/force-reset 禁止」を追記
4) `http://localhost:3000` などを 3100 へ統一（価格3000は除外）
   - 例: `docs/statistics/API_DESIGN.md`, `docs/features/TV_LAYOUT_EDITOR_SPEC.md`, `docs/features/LAYOUT_MANAGEMENT_SYSTEM.md` など

## ENV例（文中例は統一）
```
DATABASE_URL=postgresql://hotel_app:${DB_PASSWORD}@<HOST>:5432/hotel_unified_db
PORT=3100
NODE_ENV=development
```

## セルフチェック
```
grep -R -n "hotel_integrated" docs | cat
grep -R -nE "http://localhost:3000|EXPOSE 3000" docs | cat
grep -R -nE "DATABASE_URL|hotel_unified_db|3100|strictPort" docs | cat
```

## 受入基準
- `hotel_integrated` が 0 件
- `localhost:3000` / `EXPOSE 3000` が 0 件（必要なら3100へ）
- 全 `DATABASE_URL` 例が `hotel_unified_db`
- `/health` 手順の明記（3100）

## 追加: No-Local-DB 運用
- `.env`/環境変数の `DATABASE_URL` は統合DBのみを指す（`localhost`/`127.0.0.1`/`::1` 禁止）
- `scripts/verify-db-url.sh` を追加し、`dev`/`start` にプリフックで実行
  - 例: `"dev": "bash scripts/verify-db-url.sh && nuxt dev --port 3100 --strictPort"`
- `/health` ルート未実装の場合は暫定で G2 側が `/api/health` を参照（将来 `/health` を実装）
