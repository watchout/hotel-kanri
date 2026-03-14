# Dokkuインストールガイド

**日付**: 2023年8月18日
**作成者**: hotel-kanri
**バージョン**: 1.0

このガイドでは、サーバーにDokkuをインストールし、基本的な設定を行う手順を説明します。

## 1. 前提条件

- Ubuntu 22.04 LTSサーバー
- rootまたはsudo権限を持つユーザー
- 最小2GB RAM、20GB ディスク容量
- インターネット接続

## 2. Dokkuのインストール

### 2.1. サーバーに接続

```bash
ssh admin@163.44.117.60
```

### 2.2. システムの更新

```bash
sudo apt-get update
sudo apt-get upgrade -y
```

### 2.3. Dokkuのインストール

```bash
# Dokkuのインストールスクリプトをダウンロード
wget https://raw.githubusercontent.com/dokku/dokku/v0.30.6/bootstrap.sh

# インストールスクリプトを実行
sudo DOKKU_TAG=v0.30.6 bash bootstrap.sh
```

### 2.4. Webセットアップの完了

1. ブラウザで `http://163.44.117.60` にアクセス
2. 表示されるフォームに公開SSHキーを入力
   - ローカルマシンの `~/.ssh/id_ed25519.pub` の内容をコピー
3. ホスト名を `dev.omotenasuai.com` に設定
4. 「Finish Setup」ボタンをクリック

## 3. 必要なプラグインのインストール

### 3.1. PostgreSQLプラグイン

```bash
sudo dokku plugin:install https://github.com/dokku/dokku-postgres.git postgres
```

### 3.2. Redisプラグイン

```bash
sudo dokku plugin:install https://github.com/dokku/dokku-redis.git redis
```

### 3.3. RabbitMQプラグイン

```bash
sudo dokku plugin:install https://github.com/dokku/dokku-rabbitmq.git rabbitmq
```

### 3.4. Let's Encryptプラグイン

```bash
sudo dokku plugin:install https://github.com/dokku/dokku-letsencrypt.git
```

### 3.5. Prometheusプラグイン（モニタリング用・オプション）

```bash
sudo dokku plugin:install https://github.com/dokku/dokku-prometheus.git prometheus
```

## 4. Dokkuの基本設定

### 4.1. グローバル設定

```bash
# デプロイ時のNode.jsバージョンを設定
dokku config:set --global DOKKU_NODEJS_VERSION=20.x

# Let's Encrypt用のメールアドレスを設定
dokku config:set --global DOKKU_LETSENCRYPT_EMAIL=admin@omotenasuai.com

# デフォルトのドメイン設定
dokku domains:set-global omotenasuai.com
```

### 4.2. デプロイユーザーの設定

```bash
# deployユーザーにDokkuへのアクセス権を付与
sudo usermod -aG dokku deploy
```

### 4.3. ストレージディレクトリの作成

```bash
# 永続データ用のディレクトリを作成
sudo mkdir -p /opt/dokku/data
sudo chown -R dokku:dokku /opt/dokku/data
```

## 5. サービスの作成

### 5.1. PostgreSQLサービスの作成

```bash
# データベースサービスの作成
dokku postgres:create hotel_unified_db

# データベースの設定
dokku postgres:connect hotel_unified_db
# ここでSQLコマンドを実行してデータベースを初期化

# バックアップディレクトリの設定
dokku postgres:backup-set-encryption hotel_unified_db ENCRYPTION_KEY
```

### 5.2. Redisサービスの作成

```bash
# Redisサービスの作成
dokku redis:create hotel_redis

# Redisのパスワード設定
dokku redis:info hotel_redis
```

### 5.3. RabbitMQサービスの作成

```bash
# RabbitMQサービスの作成
dokku rabbitmq:create hotel_rabbitmq

# RabbitMQの管理者パスワード設定
dokku rabbitmq:info hotel_rabbitmq
```

## 6. ネットワーク設定

### 6.1. プロキシ設定

```bash
# グローバルプロキシ設定
dokku proxy:set-global nginx
```

### 6.2. SSL設定

```bash
# Let's Encryptの自動更新設定
dokku letsencrypt:cron-job --add
```

## 7. セキュリティ設定

### 7.1. ファイアウォール設定

```bash
# UFWの有効化
sudo ufw enable

# 必要なポートの開放
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# ステータス確認
sudo ufw status
```

### 7.2. SSH設定の強化

```bash
# SSHの設定ファイルを編集
sudo nano /etc/ssh/sshd_config

# 以下の設定を変更または追加
# PasswordAuthentication no
# PermitRootLogin no
# PubkeyAuthentication yes

# SSH設定の再読み込み
sudo systemctl reload sshd
```

## 8. インストール確認

### 8.1. Dokkuのバージョン確認

```bash
dokku version
```

### 8.2. プラグインの確認

```bash
dokku plugin:list
```

### 8.3. サービスの確認

```bash
dokku postgres:list
dokku redis:list
dokku rabbitmq:list
```

## 9. トラブルシューティング

### 9.1. ログの確認

```bash
# Dokkuのログ
dokku logs

# システムログ
sudo journalctl -u dokku-installer
```

### 9.2. 一般的な問題

1. **ポートの競合**: 既存のサービスが80/443ポートを使用している場合
   ```bash
   sudo netstat -tulpn | grep -E ':(80|443)'
   ```

2. **ディスク容量不足**:
   ```bash
   df -h
   ```

3. **メモリ不足**:
   ```bash
   free -m
   ```

4. **権限の問題**:
   ```bash
   sudo chown -R dokku:dokku /home/dokku
   ```

## 10. 次のステップ

Dokkuのインストールが完了したら、次のステップに進みます：

1. アプリケーションの作成
2. 環境変数の設定
3. アプリケーションのデプロイ

詳細な手順については、「Dokkuアプリケーション設定ガイド」を参照してください。
