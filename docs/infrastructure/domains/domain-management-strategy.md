# ドメイン運用戦略

## 概要

本ドキュメントでは、omotenasuai.comプロジェクトのドメイン運用戦略について記載します。サブドメイン構成、DNS設定、SSL証明書管理など、ドメイン関連の運用方針を定義します。

## サブドメイン構成

### 本番環境

- **メインサイト**: `www.omotenasuai.com`
- **SaaS**: `saas.omotenasuai.com`
- **PMS**: `pms.omotenasuai.com`
- **会員システム**: `member.omotenasuai.com`
- **API**: `api.omotenasuai.com`

### 開発環境

- **開発サーバー**: `dev.omotenasuai.com`
- **SaaS開発**: `saas.dev.omotenasuai.com`
- **PMS開発**: `pms.dev.omotenasuai.com`
- **会員システム開発**: `member.dev.omotenasuai.com`
- **API開発**: `api.dev.omotenasuai.com`

### テスト環境

- **テストサーバー**: `test.omotenasuai.com`
- **SaaSテスト**: `saas.test.omotenasuai.com`
- **PMSテスト**: `pms.test.omotenasuai.com`
- **会員システムテスト**: `member.test.omotenasuai.com`
- **APIテスト**: `api.test.omotenasuai.com`

## DNS設定

### DNSプロバイダー

- 主要プロバイダー: Cloudflare
- バックアッププロバイダー: Route53 (AWS)

### レコード設定

- **Aレコード**: 各サーバーのIPアドレスを指定
- **CNAMEレコード**: サブドメインの設定
- **MXレコード**: メールサーバー設定
- **TXTレコード**: SPF、DKIM、DMARC設定
- **SRVレコード**: 特定サービスのポート指定

### DNSキャッシュ管理

- TTL設定: 3600秒（1時間）
- 緊急時TTL: 300秒（5分）- 変更適用を迅速化する場合

## SSL証明書管理

### 証明書プロバイダー

- Let's Encrypt（自動更新）
- Cloudflare SSL（Cloudflare利用時）

### 証明書更新プロセス

1. 証明書の有効期限を監視（90日前から警告）
2. 自動更新スクリプトの実行（60日前）
3. 更新失敗時の手動対応プロセス
4. 更新後の動作確認

### 証明書配備

- Nginx/Apache設定への証明書パス設定
- 証明書チェーンの正確な構成
- OCSP Staplingの有効化
- HTTP/2対応の確認

## セキュリティ設定

### HTTPS強制

- HTTPからHTTPSへのリダイレクト設定
- HSTS（HTTP Strict Transport Security）の有効化
- プリロードリスト登録の検討

### その他のセキュリティヘッダー

- Content-Security-Policy
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection

## 監視と通知

### 監視項目

- ドメイン有効期限（30日前から警告）
- SSL証明書有効期限（30日前から警告）
- DNS伝播状況
- HTTPS接続性能

### 通知設定

- メール通知: admin@omotenasuai.com
- Slack通知: #infra-alerts チャンネル
- 緊急時SMS通知: 運用担当者

## 障害対応

### DNSフェイルオーバー

1. プライマリDNSプロバイダー障害検出
2. セカンダリDNSプロバイダーへの切り替え手順
3. 復旧後の同期プロセス

### SSL証明書緊急更新

1. 証明書問題の検出
2. 代替証明書の緊急発行手順
3. 新証明書の配備と検証

## 運用チェックリスト

### 定期チェック（月次）

- [ ] ドメイン有効期限確認
- [ ] SSL証明書有効期限確認
- [ ] DNSレコード整合性確認
- [ ] セキュリティヘッダー確認
- [ ] リダイレクト設定確認

### 変更管理

- ドメイン設定変更時の承認フロー
- 変更履歴の記録
- 変更後の検証プロセス

## 責任者

- **ドメイン管理責任者**: インフラチームリーダー
- **SSL証明書管理**: セキュリティ担当
- **DNS設定管理**: インフラエンジニア

---

本ドキュメントは定期的にレビューし、必要に応じて更新してください。最終更新日: 2025-09-12