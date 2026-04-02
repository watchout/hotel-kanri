# Dockerインストールガイド

このガイドでは、hotel-kanriプロジェクトのために必要なDockerとDocker Composeのインストール手順を説明します。

## macOSへのインストール

### Docker Desktop for Mac

1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)からインストーラーをダウンロードします。

2. ダウンロードしたDmgファイルをダブルクリックして開きます。

3. Docker.appをApplicationsフォルダにドラッグします。

4. Applicationsフォルダから Docker Desktop を起動します。

5. 初回起動時に必要な権限を付与してください。

6. インストールが完了したら、ターミナルで以下のコマンドを実行して確認します：

```bash
docker --version
docker compose version
```

### Homebrewを使用したインストール（代替方法）

1. まだHomebrewがインストールされていない場合は、以下のコマンドでインストールします：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. Dockerをインストールします：

```bash
brew install --cask docker
```

3. Docker Desktopを起動します：

```bash
open /Applications/Docker.app
```

## Windowsへのインストール

### Docker Desktop for Windows

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)からインストーラーをダウンロードします。

2. インストーラーを実行し、指示に従ってインストールします。

3. WSL 2のインストールが求められる場合は、指示に従ってインストールします。

4. インストールが完了したら、コマンドプロンプトで以下のコマンドを実行して確認します：

```bash
docker --version
docker compose version
```

## Linuxへのインストール

### Ubuntu

1. 古いバージョンをアンインストールします（存在する場合）：

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```

2. 必要なパッケージをインストールします：

```bash
sudo apt-get update
sudo apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

3. Dockerの公式GPGキーを追加します：

```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

4. リポジトリを設定します：

```bash
echo \
  "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

5. Dockerをインストールします：

```bash
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io
```

6. Docker Composeをインストールします：

```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

7. インストールを確認します：

```bash
docker --version
docker-compose --version
```

8. 非rootユーザーでDockerを使用できるようにします：

```bash
sudo usermod -aG docker $USER
```

9. 変更を適用するためにログアウトして再ログインします。

## インストール後の確認

Dockerが正しくインストールされたことを確認するために、以下のコマンドを実行します：

```bash
# Dockerデーモンが実行中か確認
docker info

# Hello Worldイメージを実行
docker run hello-world
```

## Docker Composeの使用

プロジェクトのルートディレクトリで以下のコマンドを実行して、開発環境を起動します：

```bash
# 開発環境を起動
docker compose -f docker-compose.dev.yml up -d

# ログを確認
docker compose -f docker-compose.dev.yml logs -f

# 環境を停止
docker compose -f docker-compose.dev.yml down
```

## トラブルシューティング

### 「docker: command not found」エラー

- Dockerが正しくインストールされていることを確認してください。
- PATHに追加されていない場合は、シェルの設定ファイル（.bashrc、.zshrc等）を確認してください。

### 権限エラー

```bash
# Linuxの場合、以下のコマンドでDockerグループにユーザーを追加
sudo usermod -aG docker $USER

# 変更を適用するためにログアウトして再ログイン
```

### Docker Desktopが起動しない

- マシンの再起動を試してください。
- Docker Desktopを完全にアンインストールして再インストールしてください。

### ポートの競合

```bash
# 使用中のポートを確認
lsof -i :3100

# プロセスを終了
kill -9 <PID>
```
