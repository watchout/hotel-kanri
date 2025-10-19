# 開発サーバーSSL設定実施報告

## 概要

本ドキュメントでは、開発サーバー環境に対するドメイン設定とSSL証明書の適用作業について報告します。

## 実施内容

### 1. 現状確認

開発サーバー環境のDNS設定とDokkuの設定を確認しました。

#### DNS設定

現在の開発サーバー向けサブドメインは以下の通りです：

| タイプ | 名前 | コンテンツ | 備考 |
|-------|------|----------|------|
| A | dev-all | 163.44.117.60 | 開発サーバー全体 |
| A | dev-app | 163.44.117.60 | SaaSアプリケーション開発環境 |
| A | dev-pms | 163.44.117.60 | PMS開発環境 |
| A | dev-crm | 163.44.117.60 | CRM開発環境 |
| A | dev-api | 163.44.117.60 | API開発環境 |

#### Dokku設定（変更前）

Dokkuアプリケーションのドメイン設定は以下の通りでした：

- hotel-common: `hotel-common.dev.omotenasuai.com`
- hotel-saas: `hotel-saas.dev.omotenasuai.com`

### 2. 実施作業

#### 2.1 Dokkuアプリケーションの登録

残りのアプリケーションをDokkuに登録しました：

```bash
sudo dokku apps:create hotel-pms
sudo dokku apps:create hotel-member
```

#### 2.2 ドメイン設定の変更

各アプリケーションのドメイン設定を実際のDNS設定に合わせて変更しました：

```bash
dokku domains:set hotel-common dev-api.omotenasuai.com
dokku domains:set hotel-saas dev-app.omotenasuai.com
dokku domains:set hotel-pms dev-pms.omotenasuai.com
dokku domains:set hotel-member dev-crm.omotenasuai.com
```

#### 2.3 必要なパッケージのインストール

SSL証明書取得に必要なパッケージをインストールしました：

```bash
sudo apt-get install -y python3-certbot-dns-cloudflare
```

#### 2.4 SSL証明書の取得

各アプリケーションに対してLet's Encrypt証明書を取得しました：

```bash
sudo dokku letsencrypt:set hotel-common email admin@omotenasuai.com
sudo dokku letsencrypt:set hotel-saas email admin@omotenasuai.com
sudo dokku letsencrypt:set hotel-pms email admin@omotenasuai.com
sudo dokku letsencrypt:set hotel-member email admin@omotenasuai.com

sudo dokku letsencrypt:enable hotel-common
sudo dokku letsencrypt:enable hotel-saas
sudo dokku letsencrypt:enable hotel-pms
sudo dokku letsencrypt:enable hotel-member
```

#### 2.5 証明書自動更新の設定

証明書の自動更新を設定しました：

```bash
sudo dokku letsencrypt:cron-job --add
```

自動更新の設定は以下のようにdokkuユーザーのcrontabに追加されました：

```
24 6 * * * dokku letsencrypt:auto-renew &>> /var/log/dokku/letsencrypt.log
```

この設定により、毎日午前6時24分にLet's Encrypt証明書の自動更新チェックが実行されます。

### 3. 設定結果

#### 3.1 ドメイン設定

現在のドメイン設定は以下の通りです：

| アプリケーション | ドメイン |
|--------------|--------|
| hotel-common | dev-api.omotenasuai.com |
| hotel-saas | dev-app.omotenasuai.com |
| hotel-pms | dev-pms.omotenasuai.com |
| hotel-member | dev-crm.omotenasuai.com |

#### 3.2 SSL証明書

各アプリケーションに対してSSL証明書が取得されました。証明書の有効期限は以下の通りです：

- dev-api.omotenasuai.com: 2025年11月19日まで
- dev-app.omotenasuai.com: 2025年11月19日まで
- dev-pms.omotenasuai.com: 2025年11月19日まで
- dev-crm.omotenasuai.com: 2025年11月19日まで

#### 3.3 自動更新の確認

自動更新ログ（/var/log/dokku/letsencrypt.log）を確認したところ、証明書の自動更新チェックが正常に実行されていることが確認できました：

```
=====> Auto-renewing all apps...
       hotel-common still has 59d, 9h, 5m, 16s days left before renewal
       hotel-saas still has 59d, 9h, 7m, 52s days left before renewal
       hotel-pms still has 59d, 9h, 9m, 21s days left before renewal
       hotel-member still has 59d, 9h, 9m, 49s days left before renewal
=====> Finished auto-renewal
```

証明書は有効期限の30日前から自動的に更新されるため、手動での更新作業は不要です。

### 4. 今後の課題

1. **アプリケーションのデプロイ**
   - 現在、アプリケーションはまだデプロイされていません。
   - デプロイ手順を確立し、各アプリケーションをデプロイする必要があります。

2. **環境変数の設定**
   - 各アプリケーションの環境変数を設定する必要があります。
   - 特にAPIのエンドポイントなどの設定が重要です。

3. **ドキュメントの整理**
   - 古い情報や不一致のあるドキュメントを更新する必要があります。
   - 特に「dev-server-domain-implementation-plan.md」と実際の設定の不一致を解消する必要があります。

## 結論

開発サーバー環境に対するドメイン設定とSSL証明書の適用作業は正常に完了しました。各アプリケーションに対して適切なドメインが設定され、SSL証明書も取得されています。また、証明書の自動更新も正しく設定されており、有効期限の30日前から自動的に更新されるため、手動での更新作業は不要です。今後はアプリケーションのデプロイと環境変数の設定を進める必要があります。

---

作成日: 2025年8月22日
作成者: 管理者