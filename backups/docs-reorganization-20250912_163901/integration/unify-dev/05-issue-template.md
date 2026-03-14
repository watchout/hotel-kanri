# UNIFY-DEV Issue テンプレート

- 目的: DB名/ポート/ドメイン/起動手順の正準化（統合DB `hotel_unified_db`）
- ブランチ: `unify-dev/<scope>-<desc>`

## 修正内容
- [ ] DB名表記の統一（`hotel_unified_db`）
- [ ] ポート表記の統一（3100/3200(+8080)/3300(±3301), strictPort）
- [ ] devサブドメイン→ポートの統一（dev-app/dev-crm/dev-pms/dev-api）
- [ ] Nginx/PM2/ENV例の統一
- [ ] 移行・禁止事項の明記

## セルフチェック
```
grep -R -n "hotel_integrated" docs | cat
grep -R -nE "\b(3000|3001|3002|3003|3004)\b|proxy_pass.*300" docs | cat
grep -R -nE "DATABASE_URL|hotel_unified_db|3100|3200|3300|3301|8080|strictPort" docs | cat
```

## 受入基準
- 旧DB名/3000系URLが0件
- `DATABASE_URL` 例が統合DBを指す
- `/health` 手順の明記
