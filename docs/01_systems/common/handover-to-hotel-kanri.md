# hotel-kanriリポジトリへの引き継ぎ書

## 1. 概要

本ドキュメントは、omotenasuai.comプロジェクトの管理体制をhotel-kanriリポジトリに移行するための引き継ぎ内容を記載しています。hotel-kanriリポジトリは、プロジェクト全体の管理、設定、ドキュメントを一元的に管理するためのリポジトリとして機能します。

## 2. 移行対象ドキュメント

以下のドキュメントをhotel-kanriリポジトリに移行してください：

1. **開発ルールとドキュメント標準**
   - ファイル: `docs/development-rules-and-documentation-standards.md`
   - 内容: プロジェクト全体の開発ルール、ドキュメント化の標準とテンプレート

2. **現在のロードマップ**
   - ファイル: `docs/roadmap/current-roadmap.md`
   - 内容: 開発計画、マイルストーン、優先度マトリックス

3. **リポジトリ管理体制**
   - ファイル: `docs/management/repository-management-structure.md`
   - 内容: リポジトリ構成、環境構成、管理フロー、権限管理

4. **ドメイン運用戦略**
   - ファイル: `docs/domain-management-strategy.md`
   - 内容: サブドメイン構成、DNS設定、SSL証明書管理

5. **開発サーバードメイン実装計画**
   - ファイル: `docs/dev-server-domain-implementation-plan.md`
   - 内容: 開発サーバーへのドメイン適用手順

## 3. ディレクトリ構造

hotel-kanriリポジトリでは、以下のディレクトリ構造を採用してください：

```
hotel-kanri/
├── docs/                      # ドキュメント
│   ├── architecture/          # アーキテクチャ設計
│   ├── infrastructure/        # インフラ関連
│   │   ├── network/           # ネットワーク設定
│   │   ├── servers/           # サーバー設定
│   │   └── domains/           # ドメイン設定
│   ├── development/           # 開発ルール
│   ├── deployment/            # デプロイ手順
│   ├── roadmap/               # 開発ロードマップ
│   └── management/            # 管理体制
├── config/                    # 設定ファイル
│   ├── nginx/                 # Nginx設定
│   ├── docker/                # Docker設定
│   └── pm2/                   # PM2設定
├── scripts/                   # 運用スクリプト
│   ├── deploy/                # デプロイスクリプト
│   ├── backup/                # バックアップスクリプト
│   └── monitoring/            # 監視スクリプト
└── templates/                 # テンプレート
    ├── env/                   # 環境変数テンプレート
    └── docs/                  # ドキュメントテンプレート
```

## 4. 移行手順

1. **hotel-kanriリポジトリの作成**
   ```bash
   mkdir hotel-kanri
   cd hotel-kanri
   git init
   ```

2. **ディレクトリ構造の作成**
   ```bash
   mkdir -p docs/{architecture,infrastructure/{network,servers,domains},development,deployment,roadmap,management}
   mkdir -p config/{nginx,docker,pm2}
   mkdir -p scripts/{deploy,backup,monitoring}
   mkdir -p templates/{env,docs}
   ```

3. **ドキュメントの移行**
   ```bash
   # hotel-commonからドキュメントをコピー
   cp /Users/kaneko/hotel-common/docs/development-rules-and-documentation-standards.md docs/development/
   cp /Users/kaneko/hotel-common/docs/roadmap/current-roadmap.md docs/roadmap/
   cp /Users/kaneko/hotel-common/docs/management/repository-management-structure.md docs/management/
   cp /Users/kaneko/hotel-common/docs/domain-management-strategy.md docs/infrastructure/domains/
   cp /Users/kaneko/hotel-common/docs/dev-server-domain-implementation-plan.md docs/infrastructure/domains/
   ```

4. **README.mdの作成**
   ```bash
   # リポジトリのREADME.mdを作成
   touch README.md
   ```

5. **初回コミット**
   ```bash
   git add .
   git commit -m "Initial commit: Setup hotel-kanri repository structure"
   ```

6. **リモートリポジトリの設定**
   ```bash
   git remote add origin <hotel-kanri-repository-url>
   git push -u origin main
   ```

## 5. 権限設定

1. **リポジトリアクセス権**
   - 管理者: 書き込み・マージ権限
   - 開発者: 読み取り権限のみ
   - 必要に応じてPR作成権限を付与

2. **ブランチ保護**
   - mainブランチへの直接プッシュを禁止
   - PRにはレビュー承認を必須に設定

## 6. 運用ルール

1. **ドキュメント更新フロー**
   - ドキュメント更新の提案: PR作成
   - レビュー: 管理者によるレビュー
   - 承認・マージ: 管理者が実施
   - 通知: チームへの変更通知

2. **設定ファイル管理**
   - 環境固有の設定は環境変数で管理
   - 共通設定はGitで管理
   - 機密情報は.envファイルで管理（Gitにコミットしない）

3. **定期的なレビュー**
   - 月次: ドキュメント更新状況の確認
   - 四半期: 管理体制全体のレビュー

## 7. 次のステップ

1. **hotel-kanriリポジトリの作成と初期設定**
   - GitHubまたは社内Gitサーバーでリポジトリ作成
   - 初期ディレクトリ構造のセットアップ

2. **ドキュメントの移行**
   - 既存ドキュメントの移行
   - 必要に応じた更新・拡充

3. **チームへの共有**
   - 新リポジトリの目的と使用方法の説明
   - アクセス権の付与

4. **CI/CD設定**
   - ドキュメント検証の自動化
   - デプロイスクリプトのテスト

## 8. 注意事項

1. **移行期間中の二重管理**
   - 移行完了までは両リポジトリで更新を同期
   - 移行完了後は明示的にhotel-commonからドキュメントを削除

2. **参照先の更新**
   - 他のリポジトリからの参照を更新
   - チーム内での周知徹底

3. **バージョン管理**
   - 設定ファイルやスクリプトにはバージョン番号を付与
   - 変更履歴を明確に記録

---

この引き継ぎ書に基づいて、hotel-kanriリポジトリへの移行を進めてください。移行後は、プロジェクト全体の管理・運用をhotel-kanriリポジトリを中心に行うことで、一貫性のある開発プロセスを維持できます。