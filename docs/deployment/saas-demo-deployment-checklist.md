# hotel-saas デモ環境デプロイチェックリスト

## 概要

このチェックリストは、hotel-saas（AIコンシェルジュシステム）のデモ環境をデプロイする前に確認すべき項目と、デプロイ後の検証手順をまとめたものです。このチェックリストに従うことで、スムーズなデプロイと問題の早期発見が可能になります。

## デプロイ前チェックリスト

### サーバー環境の確認

- [ ] サーバーのIPアドレスが確定している
- [ ] SSHアクセスが可能（deploy権限あり）
- [ ] ポート22, 80, 443, 3100が開放されている
- [ ] 十分なディスク容量がある（最低20GB）
- [ ] メモリが十分ある（最低4GB）

### リポジトリの確認

- [ ] hotel-saasリポジトリが存在する
- [ ] 最新のコードがmainブランチにマージされている
- [ ] package.jsonに必要な依存関係が記述されている
- [ ] ecosystem.config.jsが正しく設定されている
- [ ] .env.exampleファイルが存在する

### DNS設定の確認

- [ ] Cloudflareアカウントへのアクセス権がある
- [ ] omotenasuai.comドメインがCloudflareで管理されている
- [ ] CloudflareのAPIトークンが発行されている（Zone:DNSの編集権限）

### データベースの確認

- [ ] PostgreSQLのバージョンが14以上である
- [ ] Prismaスキーマが最新である
- [ ] マイグレーションファイルが正常である

## デプロイ手順

1. **デプロイスクリプトの実行**
   ```bash
   ./scripts/deploy/deploy-saas-demo.sh [サーバーIP] [CloudflareAPIトークン]
   ```

2. **スクリプトの動作確認**
   - スクリプトが正常に終了したことを確認
   - エラーメッセージがないことを確認
   - 出力されたデータベース情報を安全な場所に保存

## デプロイ後チェックリスト

### サービス起動の確認

- [ ] PM2でアプリケーションが起動している（`pm2 status`）
- [ ] Nginxが正常に稼働している（`systemctl status nginx`）
- [ ] PostgreSQLが正常に稼働している（`systemctl status postgresql`）

### ドメインアクセスの確認

- [ ] `https://dev-app.omotenasuai.com`にアクセスできる
- [ ] `https://dev-app.omotenasuai.com/health`が200 OKを返す
- [ ] ブラウザでSSL証明書エラーが表示されない

### アプリケーション機能の確認

- [ ] ログイン画面が表示される
- [ ] テストアカウントでログインできる
- [ ] サービスメニューが表示される
- [ ] サービス注文機能が動作する
- [ ] フィードバック機能が動作する

### セキュリティの確認

- [ ] SSL証明書が正しく設定されている
- [ ] 証明書の有効期限が十分に残っている（90日以上）
- [ ] 環境変数に機密情報が適切に設定されている
- [ ] 不要なポートが閉じられている（`netstat -tulpn`）

### パフォーマンスの確認

- [ ] ページ読み込み速度が2秒以内である
- [ ] API応答が500ms以内である
- [ ] サーバーリソース使用率が適正である（CPU, メモリ, ディスク）

## トラブルシューティング

### アプリケーションが起動しない

**症状**: PM2ステータスでエラー表示、またはアプリケーションにアクセスできない

**確認手順**:
1. ログを確認
   ```bash
   pm2 logs
   ```
2. 環境変数を確認
   ```bash
   cat /opt/omotenasuai/hotel-saas/.env
   ```

**解決策**:
1. 依存関係を再インストール
   ```bash
   cd /opt/omotenasuai/hotel-saas && npm ci
   ```
2. アプリケーションを再起動
   ```bash
   pm2 restart all
   ```

### SSL証明書エラー

**症状**: ブラウザでSSL証明書エラーが表示される

**確認手順**:
1. 証明書の状態を確認
   ```bash
   sudo certbot certificates
   ```

**解決策**:
1. 証明書を再取得
   ```bash
   sudo certbot --nginx -d dev-app.omotenasuai.com --force-renewal
   ```
2. Nginxを再起動
   ```bash
   sudo systemctl reload nginx
   ```

### データベース接続エラー

**症状**: アプリケーションログにデータベース接続エラーが表示される

**確認手順**:
1. PostgreSQLのステータス確認
   ```bash
   sudo systemctl status postgresql
   ```
2. データベース接続を確認
   ```bash
   sudo -u postgres psql -c "SELECT 1 FROM pg_database WHERE datname='hotel_saas'"
   ```

**解決策**:
1. PostgreSQLを再起動
   ```bash
   sudo systemctl restart postgresql
   ```
2. 環境変数を確認・修正
   ```bash
   nano /opt/omotenasuai/hotel-saas/.env
   ```

## デプロイ完了レポート

デプロイが完了したら、以下の情報を含むレポートを作成します：

1. デプロイ日時: 2025-09-12 HH:MM
2. サーバーIPアドレス: X.X.X.X
3. アクセスURL: https://dev-app.omotenasuai.com
4. 各サービスのステータス:
   - アプリケーション: 稼働中
   - Nginx: 稼働中
   - PostgreSQL: 稼働中
5. SSL証明書の有効期限: 2025-09-12
6. データベース情報:
   - DB名: hotel_saas
   - ユーザー名: hotel_saas
   - パスワード: ********（安全な場所に保管）
7. 発生した問題と解決策（あれば）:
   - 問題1: 説明
   - 解決策1: 説明

## 責任者

- **デプロイ責任者**: [役職名]
- **検証担当**: [役職名]
- **承認者**: [役職名]

---

本ドキュメントは定期的にレビューし、必要に応じて更新してください。最終更新日: 2025-09-12
