# UNIFY-DEV 統合DB一本化・環境整備基準（統括版）

## 1. 目的と範囲
- 目的: 4プロジェクト（hotel-saas / hotel-member / hotel-pms / hotel-common）でデータベース・ポート・ドメイン・起動手順を統一し、整合性を100%にする
- 範囲: ドキュメント・ENV・Nginx・PM2・マイグレーションの運用基準（開発環境）

## 2. カノニカル決定（正）
- 統合DB名: `hotel_unified_db`
- DBユーザー（開発）: `hotel_app`（将来 `omotenasuai` へ移行可。現段階は `hotel_app` を基準）
- ポート規約（strictPort: true）
  - hotel-saas: 3100
  - hotel-member: 3200（API 3200 / フロント 8080）
  - hotel-pms: 3300（Electron 3301）
- サブドメイン（dev） → ポート
  - dev-app.omotenasuai.com → 3100（saas）
  - dev-crm.omotenasuai.com → 3200（member）
  - dev-pms.omotenasuai.com → 3300（pms）
  - dev-api.omotenasuai.com → 共通API（必要時）

## 3. 環境変数（例・開発）
```
# 単一DB（統合）
DATABASE_URL=postgresql://hotel_app:${DB_PASSWORD}@<DB_HOST>:5432/hotel_unified_db

# ポート
SAAS_PORT=3100
MEMBER_PORT=3200
MEMBER_UI_PORT=8080
PMS_PORT=3300
PMS_ELECTRON_PORT=3301

# JWT/共通
JWT_SECRET=<generate>
NODE_ENV=development
```

## 4. マイグレーション運用
- 統一スキーマを単一DBに一度だけ適用（hotel-common基準）。各プロジェクトは同一DBを参照
- 変更は `prisma migrate dev`（開発）/ `prisma migrate deploy`（CI/CD）
- リセット・強制上書きは禁止（下記「禁止事項」参照）

## 5. 起動・プロセス管理
- PM2で各サービスをポート分離起動
- ENV から `DATABASE_URL` を注入し、全サービス同一DBに接続
- Nginxは上記サブドメイン→ポートへリバースプロキシ

## 6. 検証・ヘルス
- /health のHTTP 200を3系統で確認（3100/3200/3300）
- Nginx越し（dev-*.omotenasuai.com）でも 200 を確認

## 7. 禁止事項（開発でも厳守）
- `npx prisma migrate reset` の安易な実行
- `prisma db push --force-reset` の使用
- 本番・共有DBへの破壊的操作（DROP/TRUNCATE/DELETE all 等）
- マルチDB（saas/member/pmsの個別DB）への接続・新規導入

## 8. 受入基準（PRごと）
- 文字列チェック
  - `hotel_integrated` がリポジトリ内で 0 件
  - 3000–3004 のポート記載を 3100/3200/3300/3301/8080 に統一
- 接続先統一
  - すべての `DATABASE_URL` 例が `hotel_unified_db` を指す
- 実行確認
  - ローカルで migrate → 3サービス起動 → `/health` 200（直アクセス/プロキシの双方）

## 9. ロールバック・バックアップ
- 変更前にENV/PM2/Nginxをバックアップ
- DBは `pg_dump` によるダンプを作成
- 問題があれば ENV 差し戻し→ `pm2 reload` → Nginx設定を戻す

## 10. タスクブレークダウン（担当AI）
- Sun（hotel-saas）
  - docs の `hotel_integrated` → `hotel_unified_db` 置換/文脈修正
  - 3100/strictPort 記載の統一、ENV例の再整備
- Suno（hotel-member）
  - `DATABASE_URL` 例を `hotel_unified_db` に統一
  - 3200/8080・ヘルス表記の統一
- Luna（hotel-pms）
  - DBユーザー例を `hotel_app` へ統一
  - 3300/3301・strictPort を明記
- Iza（hotel-common）
  - devドメイン/Nginx例の 3000–3004 → 3100/3200/3300 への更新
  - PM2運用と `DATABASE_URL` 明記、統合DB名の規範化

## 11. 同期ゲート（Release管理）
- G1: 本基準の承認
- G2: ローカル統合テスト緑（3サービス /health OK）
- G3: 開発サーバ適用ドライラン緑（ENV→PM2→Nginx→/health OK）
- G4: 旧DB（あれば）バックアップ作成→DROP実施（誤接続防止）

## 12. 補足
- 将来的に DBユーザーを `omotenasuai` 等へ移行する場合も、本基準（単一 `hotel_unified_db`）は維持する
- すべての変更はPRで行い、上記受入基準に基づいてレビュー・承認する
