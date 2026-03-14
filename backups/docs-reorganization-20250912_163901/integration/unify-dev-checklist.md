# UNIFY-DEV 進行チェックリスト（統括）

- [ ] G1: 基準書・ブリーフ承認（unify-dev-spec / dev-deploy-blueprint）
- [ ] Sun（saas）PR: DB名/ポート/移行注記の統一（grep基準合格）
- [ ] Suno（member）PR: DB名/ポート/ヘルス統一（grep基準合格）
- [ ] Luna（pms）PR: DBユーザー/ポート/strictPort（grep基準合格）
- [ ] Iza（common）PR: devドメイン/pm2/nginx/ports統一（grep基準合格）
- [ ] G2: ローカル統合テスト（単一 `hotel_unified_db`、3100/3200/3300 で /health 200）
- [ ] G3: 開発サーバ適用（ENV→PM2→Nginx→/health 緑）
- [ ] G4: 旧DBバックアップ作成 → DROP 実施
- [ ] 完了レポート共有（差分・grep結果・ヘルス・ロールバック）
