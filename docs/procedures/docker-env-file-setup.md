# Docker環境変数ファイル設定手順

**日付**: 2023年8月18日
**バージョン**: 1.0

このドキュメントでは、Docker Composeで環境変数ファイル（.env）を正しく読み込むための設定手順を説明します。

## 1. 環境変数ファイルの問題

Docker Composeを実行する際に、以下のような警告メッセージが表示される場合があります：

```
time="2025-08-18T10:53:46+09:00" level=warning msg="The \"DB_USER\" variable is not set. Defaulting to a blank string."
time="2025-08-18T10:53:46+09:00" level=warning msg="The \"DB_PASSWORD\" variable is not set. Defaulting to a blank string."
```

これは、Docker Composeが`.env`ファイルを正しく読み込めていないことを示しています。

## 2. 環境変数ファイルの確認

### 2.1. 環境変数ファイルの存在確認

1. サーバー上で環境変数ファイルが存在することを確認します：

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "ls -la /opt/omotenasuai/hotel-kanri/.env"
```

2. 環境変数ファイルの内容を確認します：

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "cat /opt/omotenasuai/hotel-kanri/.env"
```

3. 以下の環境変数が設定されていることを確認します：
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `REDIS_PASSWORD`
   - `RABBITMQ_USER`
   - `RABBITMQ_PASSWORD`
   - `JWT_SECRET`
   - `NODE_ENV`
   - `BASE_URL`
   - `DOCKER_REGISTRY`
   - `SAAS_VERSION`
   - `COMMON_VERSION`

### 2.2. 環境変数ファイルの形式確認

1. 環境変数ファイルの形式が正しいことを確認します：
   - 各行が`KEY=VALUE`の形式になっていること
   - 余分な空白がないこと
   - 引用符が正しく使用されていること

2. 必要に応じて、環境変数ファイルを修正します：

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "vi /opt/omotenasuai/hotel-kanri/.env"
```

## 3. Docker Composeでの環境変数ファイルの指定

### 3.1. `--env-file`オプションの使用

1. Docker Compose実行時に`--env-file`オプションを使用して環境変数ファイルを明示的に指定します：

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "cd /opt/omotenasuai/hotel-kanri && sudo docker-compose -f config/docker/docker-compose.yml --env-file .env pull"
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "cd /opt/omotenasuai/hotel-kanri && sudo docker-compose -f config/docker/docker-compose.yml --env-file .env up -d"
```

### 3.2. 環境変数の直接指定

1. 環境変数を直接Docker Composeコマンドに渡す方法もあります：

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "cd /opt/omotenasuai/hotel-kanri && sudo DB_USER=hotel_app DB_PASSWORD=xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9 DB_NAME=hotel_unified_db REDIS_PASSWORD=r3d1sP@ssw0rd RABBITMQ_USER=hotel_app RABBITMQ_PASSWORD=r@bb1tMQP@ss JWT_SECRET=OSQAiP2pbm3kwyKBNnP7ZkoKOgg0P/aGb7sU8c9XSHMMIZaTcBriWxexQA2gweMDgFLFoRs5+caCLbT0jnxW7g== NODE_ENV=production BASE_URL=https://dev-app.omotenasuai.com DOCKER_REGISTRY=ghcr.io/watchout SAAS_VERSION=develop COMMON_VERSION=develop docker-compose -f config/docker/docker-compose.yml up -d"
```

## 4. Docker Composeファイルの修正

### 4.1. 環境変数の直接指定

1. Docker Composeファイル内で環境変数を直接指定することもできます：

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "vi /opt/omotenasuai/hotel-kanri/config/docker/docker-compose.yml"
```

2. 以下のように修正します：

```yaml
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_USER: hotel_app  # 直接指定
      POSTGRES_PASSWORD: xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9  # 直接指定
      POSTGRES_DB: hotel_unified_db  # 直接指定
    # ...

  hotel-saas:
    image: ghcr.io/watchout/hotel-saas:develop  # 直接指定
    environment:
      NODE_ENV: production  # 直接指定
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: hotel_app  # 直接指定
      DB_PASSWORD: xwJM6BoQPtiSSNVU7cgzI6L6qg6ncyJ9  # 直接指定
      DB_NAME: hotel_unified_db  # 直接指定
      # ...
```

### 4.2. env_fileディレクティブの使用

1. Docker Composeファイル内で`env_file`ディレクティブを使用することもできます：

```yaml
services:
  postgres:
    image: postgres:14
    env_file:
      - .env
    # ...

  hotel-saas:
    image: ${DOCKER_REGISTRY}/hotel-saas:${SAAS_VERSION}
    env_file:
      - .env
    # ...
```

## 5. 環境変数ファイルの配置場所

1. Docker Composeファイルと同じディレクトリに環境変数ファイルを配置することで、自動的に読み込まれる場合があります：

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "cp /opt/omotenasuai/hotel-kanri/.env /opt/omotenasuai/hotel-kanri/config/docker/.env"
```

2. Docker Compose実行時に、カレントディレクトリを変更します：

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "cd /opt/omotenasuai/hotel-kanri/config/docker && sudo docker-compose -f docker-compose.yml pull"
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "cd /opt/omotenasuai/hotel-kanri/config/docker && sudo docker-compose -f docker-compose.yml up -d"
```

## 6. スクリプトの修正

1. `manual-docker-deploy.sh`スクリプトを修正して、環境変数ファイルを明示的に指定するようにします：

```bash
cd /Users/kaneko/hotel-kanri
vi scripts/deploy/manual-docker-deploy.sh
```

2. Docker Compose実行部分を以下のように修正します：

```bash
echo "=== Docker Composeの実行 ==="
cd /opt/omotenasuai/hotel-kanri
if [ -f config/docker/docker-compose.yml ]; then
  echo "Docker Composeを実行しています..."
  echo "${SERVER_PASSWORD}" | sudo -S docker-compose -f config/docker/docker-compose.yml --env-file .env pull || echo "Dockerイメージのプルに失敗しましたが続行します"
  echo "${SERVER_PASSWORD}" | sudo -S docker-compose -f config/docker/docker-compose.yml --env-file .env up -d || echo "Docker Composeの起動に失敗しました"
else
  echo "docker-compose.ymlファイルが見つかりません"
fi
```

## 7. 確認

1. 修正後、Docker Composeを再実行して環境変数が正しく読み込まれることを確認します：

```bash
ssh -i ~/.ssh/id_ed25519 admin@163.44.117.60 "cd /opt/omotenasuai/hotel-kanri && sudo docker-compose -f config/docker/docker-compose.yml --env-file .env config"
```

2. 出力に環境変数が正しく展開されていることを確認します。
