# UNIFY-DEV 概要（統括用）

## 目的
- 4プロジェクト（saas/member/pms/common）のDB/ポート/ドメイン/起動手順を正準化し、単一DB `hotel_unified_db` で統一運用する。

## 正準（開発）
- DB名: `hotel_unified_db`
- DBユーザー: `hotel_app`（将来移行可）
- ポート: saas 3100 / member 3200(+8080) / pms 3300(±3301)（strictPort:true）
- devサブドメイン → ポート: dev-app→3100 / dev-crm→3200 / dev-pms→3300 / dev-api→共通API

## 同期ゲート
- G1: 基準・手順の承認
- G2: ローカル統合DBでのローカル統合テスト（単一DBで3サービス /health 緑）
- G3: 開発サーバ適用（開発統合DBへ接続、ENV→PM2→Nginx→/health 緑）
- G4: 旧DBバックアップ → DROP（誤接続防止）

## 進め方
- 各AIが各自リポでドキュメント整備→PR→統括レビュー。
- 受入後にローカル統合テスト→サーバ適用→旧DB整理。

## ポリシー: 2層統合DB（ローカル/開発）
- 目的: ローカル開発と開発サーバ運用を分離しつつ、名称/スキーマを統一する。
- 定義:
  - ローカル統合DB: `postgresql://hotel_app:***@127.0.0.1:5432/hotel_unified_db`
  - 開発統合DB: `postgresql://hotel_app:***@163.44.97.2:5432/hotel_unified_db`（ホスト値はインフラに準拠）
- 起動前ガード: 各リポに `scripts/verify-db-url.sh` を導入し、環境変数 `UNIFY_ENV` に応じて接続先を検証する。
  - `UNIFY_ENV=local` → ホストは `localhost/127.0.0.1/::1` のみ許可
  - `UNIFY_ENV=dev`   → ホストは `163.44.97.2`（またはサーバ内`127.0.0.1`）を許可
  - サンプル: `hotel-kanri/scripts/unify-dev/verify-db-url.sh`

## G2 におけるDB接続方法（ローカル統合DB）
- ローカルPostgreSQLに `hotel_unified_db` / `hotel_app` を作成し、`DATABASE_URL` をローカル統合DBに設定して実行する。
  - 例: `export DATABASE_URL="postgresql://hotel_app:<LOCAL_DB_PASSWORD>@127.0.0.1:5432/hotel_unified_db"`
  - 既定 `UNIFY_ENV=local`

## G3 におけるDB接続方法（開発統合DB）
- 開発サーバの統合DBに接続し、PM2/Nginxと併せて適用する。
  - 例: `export DATABASE_URL="postgresql://hotel_app:<DEV_DB_PASSWORD>@163.44.97.2:5432/hotel_unified_db"`
  - サーバ内からは `127.0.0.1` を利用する場合あり（実インフラに従う）。

## 参照
- 基準: `docs/integration/unify-dev-spec.md`
- デプロイ: `docs/deployment/dev-deploy-blueprint-unify-dev.md`
- チェックリスト: `docs/integration/unify-dev-checklist.md`
