# 開発サーバーデプロイブリーフ（UNIFY-DEV）

## 1. 目的
- 統合DB `hotel_unified_db` を前提に、hotel-saas/member/pms を開発サーバーへ安全にデプロイ
- ENV/PM2/Nginx/DBの一貫構成を確立し、誤接続とドリフトを防止

## 2. サーバーディレクトリ構成（提案）
```
/opt/omotenasuai/
  hotel-saas/
  hotel-member/
  hotel-pms/
  hotel-common/   # 共通スクリプト・テンプレ
  env/            # .env（600）
  logs/
  backups/
```

ローカルMacでのソース配置（参考・本書は運用手順のみに影響しない）
```
/Users/kaneko/hotel-saas
/Users/kaneko/hotel-member
/Users/kaneko/hotel-pms
/Users/kaneko/hotel-common
```

## 3. ENV（共通）
```
# DB
DATABASE_URL=postgresql://hotel_app:${DB_PASSWORD}@163.44.97.2:5432/hotel_unified_db

# 各サービス
SAAS_PORT=3100
MEMBER_PORT=3200
MEMBER_UI_PORT=8080
PMS_PORT=3300
PMS_ELECTRON_PORT=3301

# JWT
JWT_SECRET=<generate>
NODE_ENV=development
```

## 4. PM2（例）
```json
{
  "apps": [
    { "name": "hotel-saas:dev",   "cwd": "/opt/omotenasuai/hotel-saas",   "script": "pnpm", "args": "run dev", "env": { "PORT": 3100, "DATABASE_URL": "${DATABASE_URL}", "NODE_ENV": "development" } },
    { "name": "hotel-member:dev", "cwd": "/opt/omotenasuai/hotel-member", "script": "pnpm", "args": "run dev", "env": { "PORT": 3200, "DATABASE_URL": "${DATABASE_URL}", "NODE_ENV": "development" } },
    { "name": "hotel-pms:dev",    "cwd": "/opt/omotenasuai/hotel-pms",    "script": "pnpm", "args": "run dev", "env": { "PORT": 3300, "DATABASE_URL": "${DATABASE_URL}", "NODE_ENV": "development" } }
  ]
}
```

## 5. Nginx（devドメイン → ポート）
- dev-app.omotenasuai.com → 3100
- dev-crm.omotenasuai.com → 3200
- dev-pms.omotenasuai.com → 3300
- dev-api.omotenasuai.com → 共通API（必要時）

## 6. マイグレーション
- `hotel_unified_db` に対して一度だけ `prisma migrate deploy`（必要なシステムで）
- 変更管理はPR/レビューで実施

## 7. ヘルスチェック
```
curl -I http://127.0.0.1:3100/health
curl -I http://127.0.0.1:3200/health
curl -I http://127.0.0.1:3300/health
```
- Nginx越しに `https://dev-*.omotenasuai.com/health` で200確認

## 8. バックアップ / ロールバック
- DB: `pg_dump` を `backups/` に保存
- Nginx/PM2/ENV: 変更前にファイルコピー
- 失敗時: ENV差し戻し → `pm2 reload` → `nginx -s reload`、必要に応じDBリストア

## 9. 実行手順（ゲート連動）
1) G1: 基準書承認（unify-dev-spec）
2) G2: ローカル統合テスト緑
3) G3: サーバーにENV投入 → `pm2 start|reload` → Nginx反映 → /health緑
4) G4: 旧DB（存在時）バックアップ → DROP

## 10. 運用メモ
- .envは600、プロセスはPM2、ログは `logs/` に集約
- ドキュメントのDB名・ポート・ドメイン記載は本ブリーフに準拠
```