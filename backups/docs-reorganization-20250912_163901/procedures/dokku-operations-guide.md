# Dokku運用管理ガイド

**日付**: 2023年8月18日
**作成者**: hotel-kanri
**バージョン**: 1.0

このガイドでは、Dokkuを使用したhotel-saasとhotel-commonアプリケーションの運用管理手順を説明します。

## 1. 日常的な運用タスク

### 1.1. アプリケーションの状態確認

```bash
# サーバーに接続
ssh admin@163.44.117.60

# アプリケーションの状態確認
dokku ps:report

# 特定アプリケーションの詳細確認
dokku ps:report hotel-saas
dokku ps:report hotel-common
```

### 1.2. ログの確認

```bash
# 最新のログを表示
dokku logs hotel-saas
dokku logs hotel-common

# リアルタイムログの表示
dokku logs hotel-saas -t

# 行数を指定してログを表示
dokku logs hotel-saas -n 100
```

### 1.3. リソース使用状況の確認

```bash
# リソース制限の確認
dokku resource:report

# メモリ使用状況の確認
free -m

# ディスク使用状況の確認
df -h
```

## 2. デプロイ管理

### 2.1. 新バージョンのデプロイ

```bash
# ローカルマシンで実行
cd /Users/kaneko/hotel-saas

# 変更をコミット
git add .
git commit -m "Update: 新機能の追加"

# Dokkuへのデプロイ
git push dokku main
```

### 2.2. デプロイ履歴の確認

```bash
# サーバーで実行
dokku git:report hotel-saas
```

### 2.3. ロールバック

```bash
# 以前のデプロイへのロールバック
dokku ps:rebuild hotel-saas
```

### 2.4. 手動デプロイ

```bash
# サーバーで実行
dokku git:from-image hotel-saas ghcr.io/watchout/hotel-saas:v1.0.0
```

## 3. スケーリング管理

### 3.1. 水平スケーリング

```bash
# コンテナ数の増加
dokku ps:scale hotel-saas web=3
dokku ps:scale hotel-common web=2

# スケーリング状態の確認
dokku ps:report
```

### 3.2. 垂直スケーリング

```bash
# メモリ制限の変更
dokku resource:limit --memory 2G hotel-saas

# CPU制限の変更
dokku resource:limit --cpu 2 hotel-saas

# リソース設定の確認
dokku resource:report hotel-saas
```

## 4. データベース管理

### 4.1. バックアップ

```bash
# 手動バックアップ
dokku postgres:export hotel_unified_db > /opt/dokku/data/backups/hotel_unified_db_$(date +%Y%m%d).sql

# バックアップの確認
ls -la /opt/dokku/data/backups/
```

### 4.2. リストア

```bash
# データベースのリストア
dokku postgres:import hotel_unified_db < /opt/dokku/data/backups/hotel_unified_db_20230818.sql
```

### 4.3. 情報確認

```bash
# データベース情報の確認
dokku postgres:info hotel_unified_db

# 接続情報の確認
dokku postgres:info hotel_unified_db --single-info DSN
```

### 4.4. メンテナンス

```bash
# データベースの再起動
dokku postgres:restart hotel_unified_db

# データベースのアップグレード
dokku postgres:upgrade hotel_unified_db
```

## 5. SSL証明書管理

### 5.1. 証明書の更新

```bash
# 手動更新
dokku letsencrypt:auto-renew

# 更新状態の確認
dokku letsencrypt:list
```

### 5.2. 証明書の再発行

```bash
# 証明書の再発行
dokku letsencrypt:disable hotel-saas
dokku letsencrypt:enable hotel-saas
```

## 6. 監視とアラート

### 6.1. Prometheusの設定

```bash
# Prometheusの起動
dokku prometheus:start

# エクスポーターの追加
dokku prometheus:enable hotel-saas
dokku prometheus:enable hotel-common

# 監視状態の確認
dokku prometheus:report
```

### 6.2. Grafanaの設定

```bash
# Grafanaプラグインのインストール（オプション）
sudo dokku plugin:install https://github.com/dokku/dokku-grafana.git grafana

# Grafanaの起動
dokku grafana:start

# Grafanaの設定
dokku grafana:link prometheus
```

### 6.3. アラートの設定

```bash
# Alertmanagerプラグインのインストール（オプション）
sudo dokku plugin:install https://github.com/dokku/dokku-alertmanager.git alertmanager

# アラートルールの設定
dokku alertmanager:set-rule hotel-saas "alert HighMemoryUsage if (container_memory_usage_bytes > 900000000)"
```

## 7. バックアップと災害復旧

### 7.1. 定期バックアップの設定

```bash
# cronジョブの設定
sudo crontab -e

# 以下を追加
0 2 * * * dokku postgres:export hotel_unified_db > /opt/dokku/data/backups/hotel_unified_db_$(date +\%Y\%m\%d).sql
```

### 7.2. バックアップの外部保存

```bash
# AWS S3へのバックアップ転送
sudo apt-get install -y awscli
aws configure

# S3への転送スクリプト
cat > /opt/dokku/backup-to-s3.sh << 'EOF'
#!/bin/bash
BACKUP_FILE="/opt/dokku/data/backups/hotel_unified_db_$(date +%Y%m%d).sql"
dokku postgres:export hotel_unified_db > $BACKUP_FILE
aws s3 cp $BACKUP_FILE s3://omotenasuai-backups/
EOF

sudo chmod +x /opt/dokku/backup-to-s3.sh
```

### 7.3. 災害復旧計画

1. **新サーバーへの復旧手順**:
   - Dokkuの新規インストール
   - データベースバックアップのリストア
   - アプリケーションの再デプロイ

2. **復旧テスト**:
   - 定期的な復旧テストの実施
   - 復旧時間の測定と改善

## 8. パフォーマンスチューニング

### 8.1. Nginxの設定

```bash
# Nginxの設定カスタマイズ
dokku nginx:set hotel-saas client-max-body-size 50m
dokku nginx:set hotel-saas proxy-read-timeout 60s

# 設定の反映
dokku proxy:build-config hotel-saas
```

### 8.2. アプリケーションのチューニング

```bash
# 環境変数によるチューニング
dokku config:set hotel-saas NODE_OPTIONS="--max-old-space-size=1024"
```

### 8.3. キャッシュの設定

```bash
# Redisキャッシュの設定
dokku redis:info hotel_redis
```

## 9. セキュリティ管理

### 9.1. 定期的なアップデート

```bash
# システムの更新
sudo apt-get update
sudo apt-get upgrade -y

# Dokkuの更新
dokku plugin:update --all
```

### 9.2. セキュリティ監査

```bash
# 開いているポートの確認
sudo netstat -tulpn

# プロセスの確認
ps aux

# ログインの監査
last
```

### 9.3. ファイアウォールの管理

```bash
# UFWの状態確認
sudo ufw status

# ルールの追加
sudo ufw allow from 192.168.1.0/24 to any port 22
```

## 10. CI/CD連携

### 10.1. GitHub Actionsとの連携

```yaml
# .github/workflows/deploy-to-dokku.yml
name: Deploy to Dokku

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Deploy to Dokku
        uses: dokku/github-action@master
        with:
          git_remote_url: 'ssh://dokku@163.44.117.60:22/hotel-saas'
          ssh_private_key: ${{ secrets.DOKKU_SSH_PRIVATE_KEY }}
```

### 10.2. 自動テストの設定

```yaml
# テスト後にデプロイを実行
jobs:
  test:
    # テストジョブの設定
    
  deploy:
    needs: test
    # デプロイジョブの設定
```

## 11. トラブルシューティング

### 11.1. 一般的な問題と解決策

1. **デプロイ失敗**:
   ```bash
   dokku logs hotel-saas
   dokku repo:purge-cache hotel-saas
   ```

2. **アプリケーションがクラッシュ**:
   ```bash
   dokku logs hotel-saas
   dokku ps:restart hotel-saas
   ```

3. **メモリ不足**:
   ```bash
   dokku resource:limit --memory 2G hotel-saas
   ```

4. **ディスク容量不足**:
   ```bash
   dokku cleanup
   ```

5. **データベース接続エラー**:
   ```bash
   dokku postgres:info hotel_unified_db
   dokku postgres:restart hotel_unified_db
   ```

### 11.2. ログ分析

```bash
# エラーログの抽出
dokku logs hotel-saas | grep ERROR

# 特定の時間帯のログ
dokku logs hotel-saas | grep "2023-08-18"
```

### 11.3. デバッグモード

```bash
# デバッグモードの有効化
dokku config:set hotel-saas DEBUG=true
dokku ps:restart hotel-saas
```

## 12. ドキュメント管理

### 12.1. 設定のエクスポート

```bash
# アプリケーション設定のエクスポート
dokku config:export hotel-saas > /opt/dokku/data/configs/hotel-saas-config.txt

# データベース設定のエクスポート
dokku postgres:info hotel_unified_db > /opt/dokku/data/configs/hotel-unified-db-info.txt
```

### 12.2. 変更履歴の記録

```bash
# 変更履歴ファイルの作成
cat > /opt/dokku/data/changelog.md << 'EOF'
# 変更履歴

## 2023-08-18
- Dokkuをインストール
- hotel-saasとhotel-commonをデプロイ

## 2023-08-19
- スケーリング設定を変更
- バックアップスクリプトを追加
EOF
```

## 13. 結論

このガイドに従って、Dokkuを使用したhotel-saasとhotel-commonアプリケーションの運用管理を行うことで、安定したサービス提供が可能になります。定期的なメンテナンスと監視を行い、問題が発生した場合は迅速に対応することが重要です。
