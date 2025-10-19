# デバイス管理機能デプロイガイド
*Version: 1.0 — 2025-07-XX*

## 1. 概要

本ガイドでは、hotel-saasプロジェクトのデバイス管理機能を本番環境にデプロイする手順について説明します。デプロイには、サーバーサイド設定、デバイス初期設定、テスト、モニタリングの各ステップが含まれます。

## 2. 前提条件

### 2.1 サーバー環境

- Node.js 16.x以上
- PostgreSQL 13.x以上
- Redis 6.x以上（WebSocketメッセージングに使用）
- Nginx 1.20.x以上（リバースプロキシとして）

### 2.2 デバイス環境

- Google TVストリーマー（Android 10以上）
- DO（デバイスオーナー）モード有効化
- ADB（Android Debug Bridge）
- TestDPC（Android Enterprise テスト用Device Policy Controller）

### 2.3 ネットワーク環境

- 安定したWi-Fi環境
- デバイスとサーバー間の通信が可能なネットワーク設定
- WebSocket通信が許可されたファイアウォール設定

## 3. デプロイ手順

### 3.1 サーバーサイド設定

#### 3.1.1 環境変数の設定

`.env`ファイルに以下の環境変数を設定します：

```
# デバイス管理関連設定
DEVICE_PIN_CODE=1234                  # 設定画面アクセス用PINコード
DEVICE_RESET_ENABLED=true             # デバイスリセット機能の有効化
DEVICE_MONITOR_INTERVAL=300000        # デバイスモニタリング間隔（ミリ秒）

# WebSocket関連設定
WS_ENABLED=true                       # WebSocket機能の有効化
WS_PATH=/ws                           # WebSocketエンドポイントパス
WS_PING_INTERVAL=30000                # WebSocketのPING間隔（ミリ秒）
WS_PING_TIMEOUT=10000                 # WebSocketのPINGタイムアウト（ミリ秒）

# Redis設定（WebSocketメッセージング用）
REDIS_URL=redis://localhost:6379      # RedisサーバーURL
REDIS_PREFIX=hotel-saas:              # Redisキープレフィックス
```

#### 3.1.2 Nginxの設定

WebSocketをサポートするNginx設定例：

```nginx
server {
    listen 80;
    server_name example.com;

    # HTTPSへリダイレクト
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com;

    # SSL設定
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 静的ファイル
    location /static/ {
        alias /path/to/hotel-saas/public/;
        expires 30d;
    }

    # WebSocket接続
    location /ws {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400; # 24時間
    }

    # API・アプリケーション
    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3.1.3 アプリケーションのビルドとデプロイ

```bash
# 依存関係のインストール
npm ci

# 本番用ビルド
npm run build

# PM2でアプリケーションを起動
pm2 start ecosystem.config.js --env production
```

### 3.2 デバイス初期設定

#### 3.2.1 デバイスのDOモード有効化

1. デバイスを工場出荷状態にリセット
2. 初期設定画面で「QRコードをスキャン」を選択
3. Android Enterprise QRコードをスキャン
4. デバイス管理者として「TestDPC」を選択
5. 初期設定を完了

#### 3.2.2 デバイスの初期設定スクリプト実行

```bash
# デバイスに接続
adb connect <デバイスIP>:5555

# 初期設定スクリプトを実行
./scripts/device/setup_device.sh <デバイスIP>
```

#### 3.2.3 デバイスの登録

1. 管理画面にログイン
2. 「デバイス管理」メニューを選択
3. 「デバイス追加」ボタンをクリック
4. 部屋番号、IPアドレス、MACアドレスを入力
5. 「追加」ボタンをクリック

### 3.3 テストと検証

#### 3.3.1 基本機能テスト

```bash
# テストスクリプトを実行
./scripts/test/run_tests.sh http://<サーバーIP>:3100 <デバイスIP>
```

#### 3.3.2 WebSocket接続テスト

```bash
# WebSocket接続テスト
node scripts/test/test_websocket.js ws://<サーバーIP>:3100/ws listen
```

#### 3.3.3 チェックイン・チェックアウトテスト

1. 管理画面で「フロント業務」メニューを選択
2. テスト用の部屋でチェックイン操作を実行
3. デバイスでウェルカム画面が表示されることを確認
4. 管理画面でチェックアウト操作を実行
5. デバイスでデータがリセットされることを確認

#### 3.3.4 隠しコマンドテスト

1. デバイスでTVモードを表示
2. リモコンで隠しコマンドシーケンス（↑↑↓↓←→←→Enter）を入力
3. PINコード入力画面が表示されることを確認
4. 正しいPINコードを入力
5. 設定画面が表示されることを確認

### 3.4 モニタリングとメンテナンス

#### 3.4.1 デバイスモニタリング

```bash
# デバイスのステータスを確認
./scripts/device/monitor_devices.sh <デバイスIP>
```

#### 3.4.2 ログモニタリング

```bash
# アプリケーションログの確認
pm2 logs

# Nginxアクセスログの確認
tail -f /var/log/nginx/access.log

# Nginxエラーログの確認
tail -f /var/log/nginx/error.log
```

#### 3.4.3 定期的なメンテナンス

```bash
# デバイスの定期リセット（cronで設定）
0 3 * * * /path/to/hotel-saas/scripts/device/reset_device.sh <デバイスIP> >> /var/log/device_reset.log 2>&1
```

## 4. トラブルシューティング

### 4.1 WebSocket接続エラー

#### 症状
- デバイスがWebSocketサーバーに接続できない
- リアルタイム通知が機能しない

#### 対処法
1. Nginxの設定を確認（WebSocketプロキシ設定）
2. ファイアウォール設定を確認
3. サーバーのWebSocketミドルウェアが有効か確認
4. クライアント側のWebSocket接続コードを確認

### 4.2 デバイスリセット失敗

#### 症状
- チェックアウト時にデバイスデータがリセットされない
- ADBコマンドがエラーを返す

#### 対処法
1. ADB接続を確認（`adb devices`）
2. デバイスがDOモードになっているか確認
3. リセットスクリプトの実行権限を確認
4. クライアント側リセットのフォールバックが機能しているか確認

### 4.3 隠しコマンドが動作しない

#### 症状
- キーシーケンスを入力しても設定画面が表示されない
- PINコード入力画面が表示されない

#### 対処法
1. TVモードであることを確認
2. リモコン操作プラグインが正しく読み込まれているか確認
3. コンソールでエラーがないか確認
4. キーシーケンスを正確に入力しているか確認

## 5. セキュリティ対策

### 5.1 PINコード管理

- 定期的にPINコードを変更する
- PINコードは環境変数で管理し、ソースコードにハードコードしない
- PINコード入力試行回数を制限する

### 5.2 ネットワークセキュリティ

- デバイスとサーバー間の通信はHTTPS/WSSを使用
- 内部ネットワークでデバイスを分離
- 必要なポートのみを開放

### 5.3 データセキュリティ

- チェックアウト時に確実にデータを削除
- 個人情報は必要最小限のみをデバイスに保存
- 定期的なデータリセットを実施

## 6. 運用ガイドライン

### 6.1 日常運用

- 毎日の動作確認
- ログの定期確認
- デバイスのステータス監視

### 6.2 トラブル対応

- 一次対応フロー
- エスカレーションルール
- 緊急連絡先リスト

### 6.3 定期メンテナンス

- 週次デバイスリセット
- 月次ソフトウェア更新
- 四半期ごとのセキュリティ監査

## 7. 付録

### 7.1 コマンドリファレンス

```bash
# デバイス初期設定
./scripts/device/setup_device.sh <デバイスIP>

# デバイスリセット
./scripts/device/reset_device.sh <デバイスIP>

# デバイスモニタリング
./scripts/device/monitor_devices.sh <デバイスIP>

# テスト実行
./scripts/test/run_tests.sh <サーバーURL> <デバイスIP>
```

### 7.2 環境変数リファレンス

| 環境変数 | 説明 | デフォルト値 |
|---------|------|------------|
| DEVICE_PIN_CODE | 設定画面アクセス用PINコード | 1234 |
| DEVICE_RESET_ENABLED | デバイスリセット機能の有効化 | true |
| DEVICE_MONITOR_INTERVAL | デバイスモニタリング間隔（ミリ秒） | 300000 |
| WS_ENABLED | WebSocket機能の有効化 | true |
| WS_PATH | WebSocketエンドポイントパス | /ws |
| WS_PING_INTERVAL | WebSocketのPING間隔（ミリ秒） | 30000 |
| WS_PING_TIMEOUT | WebSocketのPINGタイムアウト（ミリ秒） | 10000 |
| REDIS_URL | RedisサーバーURL | redis://localhost:6379 |
| REDIS_PREFIX | Redisキープレフィックス | hotel-saas: |

## 更新履歴
- 2025-07-XX: 初版作成
