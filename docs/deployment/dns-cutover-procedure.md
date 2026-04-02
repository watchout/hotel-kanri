# 本番DNS切替手順書

## 概要
ADR-017 Step 6: VALUE-DOMAINでのAレコード設定による本番DNS切替。
ADR-001に基づくサーバー構成に準拠。

---

## 1. 現在のDNS設定（VALUE-DOMAIN管理）

### ステージング（設定済み）
| レコード | 値 | 用途 |
|:--|:--|:--|
| a stg-app | 163.44.117.60 | STGフロント |
| a stg-api | 163.44.117.60 | STG API |

### 本番（追加が必要）
| レコード | 値 | 用途 |
|:--|:--|:--|
| a app | 163.44.117.60 | 本番フロント（OmotenasuAI） |
| a api | 163.44.97.2 | 本番API（OmotenasuDB） |

---

## 2. サーバー構成（ADR-001準拠）

```
ユーザー → app.omotenasuai.com (163.44.117.60)
              │ hotel-saas-v2 (Nuxt SSR フロントエンド)
              │ Dokku管理
              │
              └→ api.omotenasuai.com (163.44.97.2)
                    │ hotel-common-v2 (API サーバー)
                    │ PostgreSQL (DB)
                    │ Redis / RabbitMQ
                    │ Dokku管理
```

---

## 3. 切替手順

### 事前準備
```
□ 本番サーバー（OmotenasuDB 163.44.97.2）にhotel-common-v2がデプロイ済み
□ 本番DBにマイグレーション適用済み
□ 本番DBにデモseed投入済み
□ 本番hotel-saas-v2のCORS_ORIGINに https://app.omotenasuai.com を設定
□ 本番hotel-common-v2のCORS_ORIGINに https://app.omotenasuai.com を設定
□ SSL証明書の準備（Dokku + Let's Encrypt）
```

### Step A: API先行（api.omotenasuai.com）

1. VALUE-DOMAINにログイン
2. omotenasuai.com のDNS設定を開く
3. 以下のAレコードを追加:
   ```
   a api 163.44.97.2
   ```
4. DNS伝播を待つ（通常5-30分）
5. 確認:
   ```bash
   dig api.omotenasuai.com +short
   # → 163.44.97.2

   curl -s https://api.omotenasuai.com/health
   # → {"status":"ok"}
   ```

### Step B: フロント後行（app.omotenasuai.com）

1. VALUE-DOMAINでAレコード追加:
   ```
   a app 163.44.117.60
   ```
2. DNS伝播を待つ
3. 確認:
   ```bash
   dig app.omotenasuai.com +short
   # → 163.44.117.60

   curl -s -o /dev/null -w "%{http_code}" https://app.omotenasuai.com
   # → 200 or 302
   ```

### Step C: SSL設定（Dokku Let's Encrypt）

```bash
# OmotenasuAI (163.44.117.60)
ssh omotenasu-dev
dokku letsencrypt:enable hotel-saas-v2
dokku domains:add hotel-saas-v2 app.omotenasuai.com

# OmotenasuDB (163.44.97.2)
ssh omotenasu-db
sudo dokku letsencrypt:enable hotel-common-v2
sudo dokku domains:add hotel-common-v2 api.omotenasuai.com
```

---

## 4. 切り戻し手順

DNS切替後に問題が発生した場合:

### 即時切り戻し
1. VALUE-DOMAINで追加したAレコードを削除
   ```
   # 削除: a app 163.44.117.60
   # 削除: a api 163.44.97.2
   ```
2. DNS TTLに依存（VALUE-DOMAINのデフォルトTTL確認）
3. 想定ダウンタイム: DNS伝播時間（5-30分）

### アプリケーション切り戻し
```bash
# 前のコミットにロールバック
ssh omotenasu-dev
dokku ps:restore hotel-saas-v2  # 前バージョンに戻す

ssh omotenasu-db
sudo dokku ps:restore hotel-common-v2
```

---

## 5. 確認チェックリスト

```
□ dig app.omotenasuai.com → 163.44.117.60
□ dig api.omotenasuai.com → 163.44.97.2
□ https://api.omotenasuai.com/health → 200
□ https://app.omotenasuai.com → 200/302
□ デモアカウントでログイン可能
□ メニュー表示正常
□ 注文フロー動作確認
```

---

## 改訂履歴

| 日付 | 内容 |
|------|------|
| 2026-03-31 | 初版: ADR-017 Step 6 に基づき策定 |
