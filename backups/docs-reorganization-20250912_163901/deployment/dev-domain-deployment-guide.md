# 開発サーバードメイン設定ガイド

## 概要

本ドキュメントでは、開発サーバーに対してドメイン設定を適用する手順について説明します。このガイドに従うことで、開発環境でも本番環境に近い形でドメインを設定し、環境間の一貫性を確保することができます。

## 前提条件

- Ubuntu 22.04 LTSが稼働する開発サーバー
- サーバーへのSSHアクセス権限（deploy権限）
- Cloudflare APIトークン（DNS設定用）
- 以下のポートが開放されていること:
  - 80 (HTTP)
  - 443 (HTTPS)

## 準備作業

### 1. DNSレコードの設定

Cloudflareダッシュボードで以下のDNSレコードを設定します：

| タイプ | 名前 | コンテンツ | TTL | プロキシ状態 |
|-------|------|----------|-----|------------|
| A | dev | 開発サーバーIP | 自動 | DNS のみ |
| A | *.dev | 開発サーバーIP | 自動 | DNS のみ |

### 2. Cloudflare APIトークンの取得

1. Cloudflareダッシュボードにログイン
2. 「プロファイル」→「APIトークン」を選択
3. 「トークンを作成」をクリック
4. 「ゾーンDNS編集」テンプレートを選択
5. ゾーンリソースを「omotenasuai.com」に限定
6. トークンを作成し、安全な場所に保存

## デプロイ手順

### 1. スクリプトの準備

以下のコマンドで、デプロイスクリプトを実行可能にします：

```bash
chmod +x scripts/deploy/setup-dev-domains.sh
```

### 2. 環境変数の設定

Cloudflare APIトークンを環境変数に設定します：

```bash
export CLOUDFLARE_API_TOKEN="your-api-token-here"
```

### 3. スクリプトの実行

以下のコマンドでスクリプトを実行します：

```bash
./scripts/deploy/setup-dev-domains.sh <開発サーバーIP>
```

例：
```bash
./scripts/deploy/setup-dev-domains.sh 192.168.1.100
```

### 4. デプロイ確認

スクリプトが正常に完了したら、以下のURLにアクセスして動作確認を行います：

- https://dev.omotenasuai.com/health
- https://saas.dev.omotenasuai.com/health
- https://pms.dev.omotenasuai.com/health
- https://member.dev.omotenasuai.com/health
- https://api.dev.omotenasuai.com/health

各URLが「OK」を返せば、設定は成功です。

## 詳細な設定内容

スクリプトは以下の設定を行います：

### 1. 必要なパッケージのインストール

- nginx: Webサーバー
- certbot: SSL証明書取得ツール
- python3-certbot-dns-cloudflare: CloudflareでのDNS認証用プラグイン

### 2. SSL証明書の取得

Let's Encryptを使用してワイルドカード証明書を取得します：
- 対象ドメイン: dev.omotenasuai.com, *.dev.omotenasuai.com
- 認証方法: DNS-01（Cloudflare API経由）

### 3. Nginx設定の作成

以下のドメイン用の設定ファイルを作成します：
- dev.omotenasuai.com (メインドメイン)
- saas.dev.omotenasuai.com (SaaS)
- pms.dev.omotenasuai.com (PMS)
- member.dev.omotenasuai.com (会員システム)
- api.dev.omotenasuai.com (API)

各設定ファイルには以下の内容が含まれます：
- HTTPからHTTPSへのリダイレクト
- SSL証明書の設定
- バックエンドサービスへのプロキシ設定
- ヘルスチェックエンドポイント

### 4. 証明書自動更新の設定

毎日深夜3時にcertbotによる証明書の自動更新チェックを行います。
更新が行われた場合は、Nginxを自動的に再読み込みします。

### 5. 環境変数の更新

各サービスの.envファイルを更新し、新しいドメイン設定を反映します：
- BASE_URL: 各サービスのベースURL
- API_URL: API呼び出し用のURL

## トラブルシューティング

### SSL証明書の問題

**症状**: 証明書エラーが表示される

**解決策**:
1. 証明書の状態を確認
   ```bash
   sudo certbot certificates
   ```
2. 必要に応じて証明書を再取得
   ```bash
   sudo certbot certonly --dns-cloudflare --dns-cloudflare-credentials ~/cloudflare.ini -d dev.omotenasuai.com -d *.dev.omotenasuai.com --force-renewal
   ```

### Nginx設定の問題

**症状**: 502 Bad Gateway エラー

**解決策**:
1. Nginx設定の構文チェック
   ```bash
   sudo nginx -t
   ```
2. バックエンドサービスの起動確認
   ```bash
   pm2 status
   ```
3. ポート設定の確認
   ```bash
   netstat -tulpn | grep LISTEN
   ```

### DNS解決の問題

**症状**: ドメインが解決されない

**解決策**:
1. DNSレコードの設定を確認
   ```bash
   dig dev.omotenasuai.com
   dig saas.dev.omotenasuai.com
   ```
2. DNSキャッシュのクリア
   ```bash
   sudo systemd-resolve --flush-caches
   ```

## 責任者

- **実装責任者**: インフラチーム
- **レビュー担当**: セキュリティ担当
- **承認者**: プロジェクトマネージャー

---

本ドキュメントは定期的にレビューし、必要に応じて更新してください。最終更新日: YYYY-MM-DD