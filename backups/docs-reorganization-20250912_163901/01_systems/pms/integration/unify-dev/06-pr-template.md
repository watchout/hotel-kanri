# UNIFY-DEV: hotel-pms ドキュメントのDB/ポート/手順の統一

## 変更点の要約
- 対象: `docs/test-tenant-configuration.md`
- 変更: DBユーザーを`hotel_app`に統一、ENV例追記（`DATABASE_URL`/`PORT`）、3300/3301と`strictPort: true`明記、`/health`手順追加

## 検証ログ（grep）
```
# 旧DB名
0件（出力なし）

# 3000系URL/ポート（価格等は除外でOK）
docs/pricing_examples.md: 価格例の数値としての3000のみ検出

# 正準値の記載
- test-tenant-configuration.md に hotel_unified_db / DATABASE_URL / 3300 / 3301 / strictPort を確認
```

## /health 手順
- ブラウザ版（Vite）: http://localhost:3300/health
- Electron版: http://localhost:3301/health（HTTPを有効化している場合。無効時はアプリ内診断UI）

## 影響範囲
- ドキュメントのみ

## ロールバック方法
- 当該ファイル `docs/test-tenant-configuration.md` を差し戻し
