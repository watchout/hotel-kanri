# 開発サーバーデプロイチェックリスト

## 概要

本ドキュメントは、開発サーバーへのドメイン設定のデプロイ前に確認すべき項目と、デプロイ後の検証手順をまとめたチェックリストです。このチェックリストに従うことで、スムーズなデプロイと問題の早期発見が可能になります。

## デプロイ前チェックリスト

### サーバー環境の確認

- [ ] サーバーのIPアドレスが正しく設定されている
- [ ] SSHアクセスが可能である
- [ ] `deploy`ユーザーがsudoers権限を持っている
- [ ] サーバーに十分なディスク容量がある（最低10GB以上）
- [ ] 必要なポート（80, 443）が開放されている

### DNS設定の確認

- [ ] Cloudflareで以下のDNSレコードが設定されている
  - [ ] `dev.omotenasuai.com` -> 開発サーバーIP
  - [ ] `*.dev.omotenasuai.com` -> 開発サーバーIP
- [ ] DNSレコードの伝播が完了している（digコマンドで確認）
- [ ] CloudflareのAPIトークンが発行され、適切な権限が付与されている

### 必要なパッケージの確認

- [ ] サーバーにNginxがインストールされている（または自動インストール可能）
- [ ] サーバーにCertbotがインストールされている（または自動インストール可能）
- [ ] サーバーにPython3がインストールされている

### アプリケーション環境の確認

- [ ] 各サービス（hotel-common, hotel-saas, hotel-pms, hotel-member）がデプロイされている
- [ ] 各サービスが指定されたポートで起動している
  - [ ] hotel-common: 3400
  - [ ] hotel-saas: 3100
  - [ ] hotel-pms: 3300
  - [ ] hotel-member: 3200
- [ ] 各サービスの環境変数ファイル（.env）が存在する

## デプロイ手順

1. **デプロイスクリプトの実行**
   ```bash
   ./scripts/deploy/deploy-dev-domain-config.sh [サーバーIP] [CloudflareAPIトークン]
   ```

2. **スクリプトの動作確認**
   - スクリプトが正常に終了したことを確認
   - エラーメッセージがないことを確認

## デプロイ後チェックリスト

### ドメインアクセスの確認

- [ ] `https://dev.omotenasuai.com` にアクセスできる
- [ ] `https://saas.dev.omotenasuai.com` にアクセスできる
- [ ] `https://pms.dev.omotenasuai.com` にアクセスできる
- [ ] `https://member.dev.omotenasuai.com` にアクセスできる
- [ ] `https://api.dev.omotenasuai.com` にアクセスできる

### SSL証明書の確認

- [ ] 各ドメインでSSL証明書が正しく設定されている
- [ ] ブラウザでアクセスした際に証明書エラーが表示されない
- [ ] 証明書の有効期限が十分に残っている（90日以上）

### Nginx設定の確認

- [ ] Nginxの設定ファイルが正しく生成されている
  - [ ] `/etc/nginx/conf.d/dev.omotenasuai.com.conf`
  - [ ] `/etc/nginx/conf.d/saas.dev.omotenasuai.com.conf`
  - [ ] `/etc/nginx/conf.d/pms.dev.omotenasuai.com.conf`
  - [ ] `/etc/nginx/conf.d/member.dev.omotenasuai.com.conf`
  - [ ] `/etc/nginx/conf.d/api.dev.omotenasuai.com.conf`
- [ ] Nginxの設定テストが成功する（`sudo nginx -t`）
- [ ] Nginxが正常に稼働している（`systemctl status nginx`）

### リダイレクトの確認

- [ ] HTTPからHTTPSへのリダイレクトが機能している
  - [ ] `http://dev.omotenasuai.com` -> `https://dev.omotenasuai.com`
  - [ ] `http://saas.dev.omotenasuai.com` -> `https://saas.dev.omotenasuai.com`
  - [ ] `http://pms.dev.omotenasuai.com` -> `https://pms.dev.omotenasuai.com`
  - [ ] `http://member.dev.omotenasuai.com` -> `https://member.dev.omotenasuai.com`
  - [ ] `http://api.dev.omotenasuai.com` -> `https://api.dev.omotenasuai.com`

### アプリケーションの確認

- [ ] 各サービスのヘルスチェックエンドポイントが正常に応答する
  - [ ] `https://dev.omotenasuai.com/health` -> 200 OK
  - [ ] `https://saas.dev.omotenasuai.com/health` -> 200 OK
  - [ ] `https://pms.dev.omotenasuai.com/health` -> 200 OK
  - [ ] `https://member.dev.omotenasuai.com/health` -> 200 OK
  - [ ] `https://api.dev.omotenasuai.com/health` -> 200 OK
- [ ] 各サービスの主要機能が正常に動作する
  - [ ] ログイン機能
  - [ ] データ取得機能
  - [ ] API呼び出し

### 環境変数の確認

- [ ] 各サービスの環境変数が更新されている
  - [ ] `BASE_URL`が新しいドメインに設定されている
  - [ ] `API_URL`が`https://api.dev.omotenasuai.com`に設定されている

### 証明書自動更新の確認

- [ ] Certbotの自動更新が設定されている（`crontab -l`で確認）
- [ ] 自動更新後のNginx再読み込みが設定されている

## トラブルシューティング

### SSL証明書の問題

**症状**: 証明書エラーが表示される

**確認手順**:
1. 証明書の状態を確認
   ```bash
   sudo certbot certificates
   ```
2. 証明書ファイルの存在を確認
   ```bash
   ls -la /etc/letsencrypt/live/dev.omotenasuai.com/
   ```

**解決策**:
1. 証明書を再取得
   ```bash
   sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials ~/cloudflare.ini -d dev.omotenasuai.com -d *.dev.omotenasuai.com --force-renewal
   ```
2. Nginxを再起動
   ```bash
   sudo systemctl reload nginx
   ```

### Nginx設定の問題

**症状**: 502 Bad Gateway エラー

**確認手順**:
1. Nginxのエラーログを確認
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```
2. Nginxの設定を確認
   ```bash
   sudo nginx -t
   ```

**解決策**:
1. バックエンドサービスの起動状態を確認
   ```bash
   pm2 status
   ```
2. Nginx設定を修正
   ```bash
   sudo nano /etc/nginx/conf.d/[問題のドメイン].conf
   ```
3. Nginxを再起動
   ```bash
   sudo systemctl reload nginx
   ```

### アプリケーションの問題

**症状**: アプリケーションが正常に動作しない

**確認手順**:
1. アプリケーションのログを確認
   ```bash
   pm2 logs
   ```
2. 環境変数を確認
   ```bash
   cat /opt/omotenasuai/[サービス名]/.env
   ```

**解決策**:
1. 環境変数を修正
   ```bash
   nano /opt/omotenasuai/[サービス名]/.env
   ```
2. アプリケーションを再起動
   ```bash
   pm2 restart [サービス名]
   ```

## デプロイ完了報告

デプロイが完了したら、以下の情報を含む報告を行います：

1. デプロイ日時
2. デプロイしたサーバーのIPアドレス
3. 設定したドメイン一覧
4. 各ドメインのアクセス確認結果
5. 発生した問題と解決策（あれば）
6. 証明書の有効期限

## 責任者

- **デプロイ責任者**: [役職名]
- **検証担当**: [役職名]
- **承認者**: [役職名]

---

本ドキュメントは定期的にレビューし、必要に応じて更新してください。最終更新日: 2025-09-12