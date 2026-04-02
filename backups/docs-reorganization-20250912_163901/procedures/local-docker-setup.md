# ローカル環境のDocker設定手順

**日付**: 2023年8月18日
**バージョン**: 1.0

このドキュメントでは、ローカル環境にDockerを設定し、hotel-saasとhotel-commonのDockerイメージをビルドしてプッシュする手順を説明します。

## 1. Dockerのインストール

### 1.1. macOSの場合

1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)をダウンロードしてインストールします。
2. インストール後、Docker Desktopを起動します。
3. ステータスバーのDockerアイコンが実行中（緑色）になっていることを確認します。

### 1.2. Linuxの場合

1. 以下のコマンドを実行してDockerをインストールします：

```bash
# 必要なパッケージのインストール
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common

# Dockerの公式GPGキーを追加
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

# Dockerのリポジトリを追加
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

# Dockerのインストール
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Docker Composeのインストール
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. ユーザーをdockerグループに追加して、sudo無しでDockerコマンドを実行できるようにします：

```bash
sudo usermod -aG docker $USER
```

3. ログアウトして再ログインするか、以下のコマンドを実行して変更を適用します：

```bash
newgrp docker
```

### 1.3. Windowsの場合

1. [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)をダウンロードしてインストールします。
2. WSL2のセットアップが必要な場合は、インストーラーの指示に従ってください。
3. インストール後、Docker Desktopを起動します。
4. タスクバーのDockerアイコンが実行中（緑色）になっていることを確認します。

## 2. GitHubコンテナレジストリの認証設定

### 2.1. GitHubトークンの作成

1. GitHubにログインします。
2. 右上のプロフィールアイコンをクリックし、「Settings」を選択します。
3. 左側のメニューから「Developer settings」をクリックします。
4. 「Personal access tokens」→「Tokens (classic)」を選択します。
5. 「Generate new token」→「Generate new token (classic)」をクリックします。
6. トークンの説明（Note）に「Docker Registry Access」などを入力します。
7. 以下のスコープを選択します：
   - `repo`（リポジトリアクセス用）
   - `read:packages`（パッケージ読み取り用）
   - `write:packages`（パッケージ書き込み用）
   - `delete:packages`（オプション：パッケージ削除用）
8. 「Generate token」をクリックします。
9. 生成されたトークンをコピーして安全な場所に保存します（このトークンは再表示できません）。

### 2.2. Dockerログイン

1. 以下のコマンドを実行して、GitHubコンテナレジストリにログインします：

```bash
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

2. ログインが成功したことを確認します：

```bash
Login Succeeded
```

## 3. Dockerイメージのビルドとプッシュ

### 3.1. 環境変数の設定

1. 以下の環境変数を設定します：

```bash
export DOCKER_REGISTRY=ghcr.io/watchout
export VERSION=develop  # または特定のバージョン/タグを指定
```

### 3.2. hotel-saasのDockerイメージをビルドしてプッシュ

1. hotel-saasディレクトリに移動します：

```bash
cd /Users/kaneko/hotel-saas
```

2. Dockerイメージをビルドします：

```bash
docker build -t ${DOCKER_REGISTRY}/hotel-saas:${VERSION} .
```

3. Dockerイメージをプッシュします：

```bash
docker push ${DOCKER_REGISTRY}/hotel-saas:${VERSION}
```

### 3.3. hotel-commonのDockerイメージをビルドしてプッシュ

1. hotel-commonディレクトリに移動します：

```bash
cd /Users/kaneko/hotel-common
```

2. Dockerイメージをビルドします：

```bash
docker build -t ${DOCKER_REGISTRY}/hotel-common:${VERSION} .
```

3. Dockerイメージをプッシュします：

```bash
docker push ${DOCKER_REGISTRY}/hotel-common:${VERSION}
```

## 4. スクリプトを使用したビルドとプッシュ

準備されたスクリプトを使用して、Dockerイメージのビルドとプッシュを一括で行うこともできます：

```bash
cd /Users/kaneko/hotel-kanri
./scripts/deploy/build-push-docker-images.sh
```

プロンプトに従って、GitHubユーザー名とトークンを入力します。

## 5. 確認

1. GitHubコンテナレジストリにプッシュされたイメージを確認します：

```bash
docker images | grep ${DOCKER_REGISTRY}
```

2. サーバー上でDockerイメージをプルして実行します：

```bash
cd /Users/kaneko/hotel-kanri
./scripts/deploy/manual-docker-deploy.sh
```

## 6. トラブルシューティング

### 6.1. 認証エラー

```
Error response from daemon: Get "https://ghcr.io/v2/": denied: denied
```

- GitHubトークンが正しいことを確認します。
- トークンに適切な権限（`read:packages`、`write:packages`）が付与されていることを確認します。
- 再度ログインを試みます：

```bash
docker logout ghcr.io
echo "YOUR_GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### 6.2. ビルドエラー

```
failed to build: exit status 1
```

- Dockerfileの内容を確認します。
- ビルドコンテキストに必要なファイルが含まれていることを確認します。
- ビルド時のエラーメッセージを確認して、具体的な問題を特定します。

### 6.3. プッシュエラー

```
denied: denied
```

- リポジトリの名前が正しいことを確認します。
- トークンに`write:packages`権限があることを確認します。
- リポジトリ名が小文字であることを確認します（GitHubパッケージは小文字のみをサポートします）。
