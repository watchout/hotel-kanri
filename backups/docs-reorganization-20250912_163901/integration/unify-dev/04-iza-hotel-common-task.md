# UNIFY-DEV 指示書（hotel-common｜Iza 担当）

## 目的
- devドメイン→ポート・Nginx例・PM2/ENV例を現行正準（3100/3200/3300 + 統合DB）へ統一。

## ブランチ
- `unify-dev/common-dev-domain-and-pm2-docs`

## 修正対象（3000→3100/3200/3300）
1) `docs/domain-management-strategy.md`
   - `proxy_pass http://localhost:3000/3001` → `3100/3200`
2) `docs/conoha-vps-setup-guide.md`
   - `proxy_pass http://localhost:3000` → `3100`
   - `curl http://localhost:3000` → `3100`
3) `docs/dev-server-domain-implementation-plan.md`
   - dev-*.omotenasuai.com のマッピング 3000–3004 → 3100/3200/3300
   - `proxy_pass` と `pm2 start --port` の例も同様に更新
4) `docs/deployment-workflow.md`
   - 3000–3004 のURL/表記を 3100/3200/3300 に置換
5) `docs/api-specs/*openapi.yaml`
   - 各サービスの `servers[].url` を 3100/3200/3300 に
6) 追記
   - PM2/ENV例に `DATABASE_URL（hotel_unified_db）` を明記

## セルフチェック
```
grep -R -nE "\b(3000|3001|3002|3003|3004)\b|proxy_pass.*300" docs | cat
grep -R -nE "DATABASE_URL|hotel_unified_db|3100|3200|3300" docs | cat
```

## 受入基準
- 3000–3004 のURL/ポート例なし（説明上の数値以外）
- `proxy_pass` が 3100/3200/3300 に統一
- `DATABASE_URL` 例が `hotel_unified_db` を明記

## 追加: No-Local-DB の明文化
- `docs/integration/unify-dev/00-overview.md` に No-Local-DB 方針を記載（統合DBのみ許可、localhost禁止、起動前検証導入）
- G2/G3 ドキュメント内の接続例は、すべて統合DB（直結 or SSHトンネル）に統一
