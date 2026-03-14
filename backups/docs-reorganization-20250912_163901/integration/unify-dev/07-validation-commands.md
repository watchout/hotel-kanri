# UNIFY-DEV 検証コマンド集

## 横断grep（ローカル）
```
# saas
grep -R -n "hotel_integrated" /Users/kaneko/hotel-saas/docs | cat
# member
grep -R -n "hotel_integrated" /Users/kaneko/hotel-member/docs | cat
# pms
grep -R -n "hotel_integrated" /Users/kaneko/hotel-pms/docs | cat
# common
grep -R -n "hotel_integrated" /Users/kaneko/hotel-common/docs | cat
```

## 3000系URL/ポートの残存検出（価格等の数値は除外して人手確認）
```
grep -R -nE "\b(3000|3001|3002|3003|3004)\b|proxy_pass.*300" /Users/kaneko/hotel-common/docs | cat
grep -R -nE "http://localhost:3000|EXPOSE 3000" /Users/kaneko/hotel-saas/docs | cat
```

## 正準値の確認
```
grep -R -nE "DATABASE_URL|hotel_unified_db|3100|3200|3300|3301|8080|strictPort" /Users/kaneko/hotel-*/docs | cat
```

## No-Local-DB 検証
```
# .env群やスクリプトに localhost/127.0.0.1 を含むDB接続がないこと
grep -R -nE "postgresql://[^\s]*@(localhost|127\.0\.0\.1|\[::1\])" /Users/kaneko/hotel-*/{.env*,docs,scripts} 2>/dev/null | cat || true
```
