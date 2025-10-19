# UNIFY-DEV PR テンプレート

## 概要
- 目的: ドキュメント正準化（統合DB/ポート/ドメイン/起動手順）
- 対象: <ファイル一覧>

## 変更点
- <要約>

## 検証
```
# 旧記載の検出
grep -R -n "hotel_integrated" docs | cat || true
grep -R -nE "\b(3000|3001|3002|3003|3004)\b|proxy_pass.*300" docs | cat || true
# 正準値の明記確認
grep -R -nE "DATABASE_URL|hotel_unified_db|3100|3200|3300|3301|8080|strictPort" docs | cat || true
```
- /health 手順が明記されているか: [ ] Yes

## 影響範囲
- ドキュメントのみ/設定例のみ（コード変更なし）

## ロールバック
- 当該ファイルの差し戻しで可
