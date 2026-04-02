# UNIFY-DEV 指示書（hotel-member｜Suno 担当）

## 目的
- ドキュメントのDB名・ポート・ヘルス表記を正準化し、統合DB `hotel_unified_db` 前提へ統一。

## ブランチ
- `unify-dev/member-docs-db-and-ports`

## 修正対象
1) `docs/INTEGRATION_QUESTIONS.md`
   - `hotel_integrated` → `hotel_unified_db`
2) フロント/ポート表記の統一
   - `http://localhost:3001` → `http://localhost:8080`
   - 規約: API 3200 / フロント 8080
3) `/health` or `/api/health` の表記を現行実装に合わせ一貫化

## ENV例（文中例は統一）
```
DATABASE_URL=postgresql://hotel_app:${DB_PASSWORD}@<HOST>:5432/hotel_unified_db
PORT=3200
MEMBER_UI_PORT=8080
```

## セルフチェック
```
grep -R -n "hotel_integrated" docs | cat
grep -R -nE "http://localhost:3001\b" docs | cat
grep -R -nE "DATABASE_URL|hotel_unified_db|3200|8080|/health" docs | cat
```

## 受入基準
- `hotel_integrated` が 0 件
- 3001 のフロントURLが 0 件（8080へ統一）
- 全 `DATABASE_URL` 例が `hotel_unified_db`
- ヘルス表記の一貫性（3200）

## 追加: No-Local-DB 運用
- `.env`/環境変数の `DATABASE_URL` は統合DBのみを指す（`localhost`/`127.0.0.1`/`::1` 禁止）
- `scripts/verify-db-url.sh` をAPI側起動前に必ず実行
  - 例: `"dev": "bash scripts/verify-db-url.sh && node ./server.js"`（実プロジェクトの起動コマンドに合わせる）
