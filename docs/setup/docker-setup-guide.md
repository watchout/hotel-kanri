# Docker環境セットアップガイド

このドキュメントでは、hotel-kanriプロジェクトのDocker環境セットアップ手順を説明します。

## 1. Docker Desktopのインストール

### macOS

1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)からインストーラーをダウンロード

2. ダウンロードしたDmgファイルを開き、Docker.appをApplicationsフォルダにドラッグ

3. Applicationsフォルダから Docker Desktop を起動

4. インストール完了後、ターミナルで以下のコマンドを実行して確認:
   ```bash
   docker --version
   docker compose version
   ```

### Windows

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)からインストーラーをダウンロード

2. インストーラーを実行し、指示に従ってインストール

3. WSL 2のインストールが求められる場合は、指示に従ってインストール

4. インストール完了後、コマンドプロンプトで以下のコマンドを実行して確認:
   ```bash
   docker --version
   docker compose version
   ```

## 2. Docker Composeを使用した開発環境の起動

1. プロジェクトのルートディレクトリに移動:
   ```bash
   cd /path/to/hotel-kanri
   ```

2. 開発環境を起動:
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

3. ログの確認:
   ```bash
   docker compose -f docker-compose.dev.yml logs -f
   ```

4. 環境の停止:
   ```bash
   docker compose -f docker-compose.dev.yml down
   ```

## 3. Docker環境の管理

### コンテナの確認
```bash
docker ps
```

### イメージの確認
```bash
docker images
```

### ボリュームの確認
```bash
docker volume ls
```

### コンテナ内でのコマンド実行
```bash
docker compose -f docker-compose.dev.yml exec web bash
```

## 4. トラブルシューティング

### ポートの競合
エラーメッセージ: `port is already allocated`

解決策:
```bash
# 使用中のポートを確認
lsof -i :3100
# プロセスを終了
kill -9 <PID>
```

### ボリュームの問題
データが永続化されない場合:
```bash
# ボリュームを削除して再作成
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

### パーミッションの問題
コンテナ内でファイル権限の問題が発生した場合:
```bash
# コンテナ内でコマンドを実行
docker compose -f docker-compose.dev.yml exec web chown -R node:node /app
```
