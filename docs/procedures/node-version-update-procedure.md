# Node.jsバージョンアップデート手順

## 概要

このドキュメントでは、開発サーバーのNode.jsバージョンを安全にアップデートするための手順を定義します。Node.jsのバージョンアップは、アプリケーションの互換性に影響を与える可能性があるため、慎重に行う必要があります。

## 前提条件

- サーバーへの管理者アクセス権限
- デプロイユーザー（deploy）のパスワードまたはSSH鍵
- アプリケーションのバックアップ

## アップデート手順

### 1. 事前準備

1. **アップデート計画の通知**
   - チームメンバーにアップデート予定を通知
   - アップデートのタイムウィンドウを設定（低トラフィック時間帯を推奨）

2. **現在の環境の確認**
   ```bash
   # 現在のNode.jsバージョンを確認
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "node -v"
   
   # 現在のnpmバージョンを確認
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "npm -v"
   ```

3. **アプリケーションのバックアップ**
   ```bash
   # アプリケーションディレクトリのバックアップ
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "sudo mkdir -p /opt/backups/$(date +%Y%m%d) && sudo cp -r /opt/omotenasuai /opt/backups/$(date +%Y%m%d)/"
   ```

### 2. Node.jsのアップデート

1. **Node.jsリポジトリの追加**
   ```bash
   # Node.js 20.xリポジトリの追加
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
   ```

2. **Node.jsのインストール**
   ```bash
   # Node.jsパッケージのインストール
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "sudo apt-get install -y nodejs"
   ```

3. **バージョンの確認**
   ```bash
   # 新しいNode.jsバージョンの確認
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "node -v"
   
   # 新しいnpmバージョンの確認
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "npm -v"
   ```

### 3. アプリケーションの再構築

1. **依存関係の再インストール**
   ```bash
   # hotel-saasの依存関係を再インストール
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "cd /opt/omotenasuai/hotel-saas && rm -rf node_modules package-lock.json && npm install"
   
   # hotel-commonの依存関係を再インストール
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "cd /opt/omotenasuai/hotel-common && rm -rf node_modules package-lock.json && npm install"
   ```

2. **アプリケーションのビルド**
   ```bash
   # hotel-saasのビルド
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "cd /opt/omotenasuai/hotel-saas && npm run build"
   
   # hotel-commonのビルド
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "cd /opt/omotenasuai/hotel-common && npm run build"
   ```

3. **サービスの再起動**
   ```bash
   # PM2サービスの再起動
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "pm2 restart all"
   ```

### 4. 検証

1. **アプリケーションの動作確認**
   ```bash
   # hotel-saasのヘルスチェック
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "curl -f http://localhost:3100/health || echo 'Health check failed'"
   
   # hotel-commonのヘルスチェック
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "curl -f http://localhost:3400/health || echo 'Health check failed'"
   ```

2. **ログの確認**
   ```bash
   # PM2ログの確認
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "pm2 logs --lines 100"
   ```

### 5. 問題発生時のロールバック

アップデート後に問題が発生した場合は、以下の手順でロールバックします：

1. **以前のNode.jsバージョンの再インストール**
   ```bash
   # 以前のNode.jsバージョンのリポジトリを追加
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
   
   # 以前のNode.jsバージョンをインストール
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "sudo apt-get install -y nodejs"
   ```

2. **バックアップからの復元**
   ```bash
   # アプリケーションディレクトリの復元
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "sudo rm -rf /opt/omotenasuai && sudo cp -r /opt/backups/$(date +%Y%m%d)/omotenasuai /opt/"
   ```

3. **サービスの再起動**
   ```bash
   # PM2サービスの再起動
   ssh -i ~/.ssh/hotel_demo_deploy deploy@163.44.117.60 "pm2 restart all"
   ```

## 注意事項

1. **互換性の確認**
   - アプリケーションがNode.js 20.xと互換性があることを事前に確認する
   - package.jsonの"engines"フィールドを確認する

2. **依存パッケージの確認**
   - 一部の依存パッケージはNode.jsバージョンに依存する場合がある
   - 特に`node-sass`や`node-gyp`に依存するパッケージに注意

3. **環境変数の設定**
   - 必要に応じて環境変数を調整する
   - `NODE_OPTIONS`などの設定を確認

## 完了報告

アップデートが完了したら、以下の情報を含む完了報告を作成します：

1. アップデート前後のNode.jsバージョン
2. アップデートの所要時間
3. 発生した問題とその解決方法
4. 検証結果

## 参考リンク

- [Node.js公式ドキュメント](https://nodejs.org/en/docs/)
- [Node.jsリリースノート](https://nodejs.org/en/blog/release/)
- [Node.js互換性テーブル](https://node.green/)
