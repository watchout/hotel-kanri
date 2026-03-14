# Docker実装の次のステップ

**日付**: 2023年8月18日
**作成者**: hotel-kanri
**バージョン**: 1.0

このドキュメントでは、hotel-saasとhotel-commonのDocker化に関する次のステップをまとめます。

## 1. 現在の状況

hotel-saasとhotel-commonのDocker化に向けて、以下の作業を実施しました：

- Docker化アーキテクチャ設計
- Dockerfileの作成（hotel-saas, hotel-common）
- Docker Compose設定ファイルの作成
- サーバー環境のDocker設定
- GitHubコンテナレジストリの認証設定
- 手動デプロイスクリプトの作成
- 各種手順書の作成

現在、以下の課題が残っています：

- ローカル環境のDocker設定
- Dockerイメージのビルドとプッシュ
- 環境変数ファイルの読み込み問題
- GitHub Actionsによる自動デプロイの設定

## 2. 短期的なアクション（1-2日）

### 2.1. ローカル環境のDocker設定

1. **Dockerのインストール**
   - ローカル開発環境にDockerをインストールする
   - Docker Desktopを使用する場合は、[Docker Desktop](https://www.docker.com/products/docker-desktop)からダウンロードしてインストール
   - Linuxの場合は、適切なパッケージマネージャーを使用してインストール

2. **GitHubコンテナレジストリの認証設定**
   - GitHubトークンを作成し、`read:packages`と`write:packages`の権限を付与
   - `docker login ghcr.io`コマンドでログイン

### 2.2. Dockerイメージのビルドとプッシュ

1. **hotel-saasのDockerイメージをビルドしてプッシュ**
   - `cd /Users/kaneko/hotel-saas`
   - `docker build -t ghcr.io/watchout/hotel-saas:develop .`
   - `docker push ghcr.io/watchout/hotel-saas:develop`

2. **hotel-commonのDockerイメージをビルドしてプッシュ**
   - `cd /Users/kaneko/hotel-common`
   - `docker build -t ghcr.io/watchout/hotel-common:develop .`
   - `docker push ghcr.io/watchout/hotel-common:develop`

### 2.3. 環境変数ファイルの設定

1. **環境変数ファイルの確認**
   - サーバー上の`.env`ファイルの内容を確認
   - 必要な環境変数が設定されていることを確認

2. **Docker Compose実行時に環境変数ファイルを明示的に指定**
   - `--env-file`オプションを使用
   - `docker-compose -f config/docker/docker-compose.yml --env-file .env up -d`

### 2.4. 手動デプロイの実行

1. **修正した手動デプロイスクリプトの実行**
   - `./scripts/deploy/manual-docker-deploy.sh`
   - デプロイ結果の確認

## 3. 中期的なアクション（1-2週間）

### 3.1. GitHub Actionsによる自動デプロイの設定

1. **GitHub Actionsワークフローの修正**
   - workflow_dispatchトリガーの問題を解決
   - 環境変数の設定を確認

2. **GitHub Actionsワークフローのテスト**
   - 手動でワークフローをトリガー
   - デプロイ結果の確認

### 3.2. Nginx設定のDocker対応

1. **Nginx設定ファイルの作成**
   - `/opt/omotenasuai/hotel-kanri/config/nginx/default.conf`を作成
   - リバースプロキシ設定の追加

2. **Nginx設定のテスト**
   - `docker-compose -f config/docker/docker-compose.yml --env-file .env restart nginx`
   - Nginxログの確認

### 3.3. モニタリング設定

1. **ログ収集の設定**
   - Docker Composeファイルにログドライバーの設定を追加
   - ログローテーションの設定

2. **コンテナヘルスチェックの設定**
   - Dockerfileにヘルスチェックの設定を追加
   - Docker Composeファイルにヘルスチェックの設定を追加

## 4. 長期的なアクション（1ヶ月以上）

### 4.1. CI/CDパイプラインの完成

1. **テスト自動化の追加**
   - GitHub Actionsワークフローにテストステップを追加
   - テスト結果の通知設定

2. **デプロイ自動化の完成**
   - 本番環境へのデプロイフローの設定
   - ロールバック手順の自動化

### 4.2. Docker Swarmの検討

1. **Docker Swarmの設定**
   - 複数ノードでのクラスター構成
   - サービスのレプリケーション設定

2. **ロードバランシングの設定**
   - サービスディスカバリーの設定
   - ロードバランサーの設定

### 4.3. Kubernetesへの移行検討

1. **Kubernetes環境の構築**
   - マネージドKubernetesサービスの検討（EKS, GKE, AKSなど）
   - Kubernetesマニフェストの作成

2. **Kubernetesデプロイフローの設定**
   - CI/CDパイプラインの更新
   - Helmチャートの作成

## 5. 次のステップの優先順位

1. **ローカル環境のDocker設定**（高優先度）
   - Dockerのインストールと設定
   - GitHubコンテナレジストリの認証設定

2. **Dockerイメージのビルドとプッシュ**（高優先度）
   - hotel-saasとhotel-commonのDockerイメージをビルドしてプッシュ

3. **環境変数ファイルの設定**（高優先度）
   - 環境変数ファイルの確認と修正
   - Docker Compose実行時の環境変数ファイル指定

4. **手動デプロイの実行**（高優先度）
   - 修正した手動デプロイスクリプトの実行
   - デプロイ結果の確認

5. **GitHub Actionsによる自動デプロイの設定**（中優先度）
   - GitHub Actionsワークフローの修正
   - GitHub Actionsワークフローのテスト

6. **Nginx設定のDocker対応**（中優先度）
   - Nginx設定ファイルの作成
   - Nginx設定のテスト

7. **モニタリング設定**（低優先度）
   - ログ収集の設定
   - コンテナヘルスチェックの設定

## 6. 結論

hotel-saasとhotel-commonのDocker化の基本的な準備は整いましたが、実際のデプロイを成功させるためには、いくつかの課題を解決する必要があります。特に、ローカル環境のDocker設定、Dockerイメージのビルドとプッシュ、環境変数ファイルの設定が優先度の高い課題です。

これらの課題を解決することで、Docker化によって環境の一貫性、デプロイの信頼性、スケーラビリティが向上し、開発からテスト、本番までのフローが効率化されることが期待されます。