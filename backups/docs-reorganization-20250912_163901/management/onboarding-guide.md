# hotel-kanriリポジトリ オンボーディングガイド

## はじめに

このドキュメントは、hotel-kanriリポジトリの目的、構成、使用方法について新しいチームメンバーに説明するためのオンボーディングガイドです。hotel-kanriリポジトリは、omotenasuai.comプロジェクト全体の管理、設定、ドキュメントを一元的に管理するためのリポジトリです。

## リポジトリの目的

hotel-kanriリポジトリは以下の目的で作成されました：

1. **プロジェクト全体のドキュメントの一元管理**
   - アーキテクチャ設計
   - API仕様
   - 開発ルール
   - 運用手順

2. **共通設定ファイルの管理**
   - Nginx設定
   - Docker設定
   - PM2設定
   - 環境変数テンプレート

3. **運用スクリプトの管理**
   - デプロイスクリプト
   - バックアップスクリプト
   - 監視スクリプト

4. **開発プロセスの標準化**
   - PRテンプレート
   - Issueテンプレート
   - CI/CD設定

## リポジトリ構成

```
hotel-kanri/
├── .github/                  # GitHub関連設定
│   ├── ISSUE_TEMPLATE/       # Issueテンプレート
│   └── workflows/            # GitHub Actions設定
├── docs/                     # ドキュメント
│   ├── architecture/         # アーキテクチャ設計
│   ├── infrastructure/       # インフラ関連
│   │   ├── network/          # ネットワーク設定
│   │   ├── servers/          # サーバー設定
│   │   └── domains/          # ドメイン設定
│   ├── development/          # 開発ルール
│   ├── deployment/           # デプロイ手順
│   ├── api/                  # API仕様
│   ├── db/                   # データベース設計
│   ├── features/             # 機能仕様
│   ├── management/           # 管理体制
│   ├── operations/           # 運用手順
│   ├── rules/                # 開発ルール
│   ├── spec/                 # 機能仕様
│   ├── systems/              # システム設計
│   └── templates/            # ドキュメントテンプレート
├── config/                   # 設定ファイル
│   ├── nginx/                # Nginx設定
│   ├── docker/               # Docker設定
│   └── pm2/                  # PM2設定
├── scripts/                  # 運用スクリプト
│   ├── deploy/               # デプロイスクリプト
│   ├── backup/               # バックアップスクリプト
│   └── monitoring/           # 監視スクリプト
└── templates/                # テンプレート
    ├── env/                  # 環境変数テンプレート
    └── docs/                 # ドキュメントテンプレート
```

## 主要ドキュメント

以下は、まず最初に読むべき重要なドキュメントです：

1. [マスタールール](../rules/hotel-kanri-master-rules.md) - 全システム共通の最上位ルール
2. [システム統合アーキテクチャ](../architecture/system-integration.md) - システム間連携設計
3. [統一データベーススキーマ](../db/schema.prisma) - 共通データモデル
4. [API仕様](../api/openapi.yaml) - OpenAPI形式のAPI定義
5. [イベント駆動アーキテクチャ](../spec/event-driven-architecture.md) - イベント連携設計
6. [アクセス制御ポリシー](access-control-policy.md) - リポジトリのアクセス権限設定

## 開発ワークフロー

### ドキュメント更新フロー

1. **ドキュメント更新の提案**
   - Issueを作成（ドキュメント更新テンプレートを使用）
   - 変更内容と理由を明記

2. **ブランチ作成**
   - `feature/doc-更新内容` という命名規則でブランチを作成
   - developブランチから分岐

3. **変更の実施**
   - 関連するドキュメントを更新
   - コミットメッセージは「docs: 更新内容の簡潔な説明」の形式

4. **Pull Request (PR)の作成**
   - PRテンプレートに従って必要情報を記入
   - レビュアーをアサイン

5. **レビュープロセス**
   - 指定されたレビュアーによるレビュー
   - 必要に応じて修正

6. **マージ**
   - レビュー承認後、管理者がマージを実施
   - 関連するIssueをクローズ

7. **通知**
   - チームへの変更通知（Slack等）

### 設定ファイル更新フロー

1. **設定変更の提案**
   - Issueを作成
   - 変更内容と理由を明記

2. **ブランチ作成**
   - `feature/config-更新内容` という命名規則でブランチを作成

3. **変更の実施**
   - 関連する設定ファイルを更新
   - コミットメッセージは「config: 更新内容の簡潔な説明」の形式

4. **テスト**
   - CI/CDパイプラインによる自動テスト
   - 必要に応じてローカルでのテスト

5. **Pull Request (PR)の作成**
   - PRテンプレートに従って必要情報を記入
   - レビュアーをアサイン

6. **レビュープロセス**
   - 指定されたレビュアーによるレビュー
   - 必要に応じて修正

7. **マージ**
   - レビュー承認後、管理者がマージを実施
   - 関連するIssueをクローズ

## 環境構成

hotel-kanriリポジトリは以下の環境で使用されます：

### 開発環境

- **ドメイン**: dev.omotenasuai.com
- **サブドメイン**:
  - SaaS: saas.dev.omotenasuai.com
  - PMS: pms.dev.omotenasuai.com
  - 会員システム: member.dev.omotenasuai.com
  - API: api.dev.omotenasuai.com

### テスト環境

- **ドメイン**: test.omotenasuai.com
- **サブドメイン**:
  - SaaS: saas.test.omotenasuai.com
  - PMS: pms.test.omotenasuai.com
  - 会員システム: member.test.omotenasuai.com
  - API: api.test.omotenasuai.com

### 本番環境

- **ドメイン**: www.omotenasuai.com
- **サブドメイン**:
  - SaaS: saas.omotenasuai.com
  - PMS: pms.omotenasuai.com
  - 会員システム: member.omotenasuai.com
  - API: api.omotenasuai.com

## リポジトリのセットアップ

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/example/hotel-kanri.git
   cd hotel-kanri
   ```

2. **ブランチの確認**
   ```bash
   git branch -a
   ```

3. **developブランチへの切り替え**
   ```bash
   git checkout develop
   ```

## よくある質問（FAQ）

### Q: このリポジトリと他のリポジトリ（hotel-common, hotel-saas等）との関係は？

A: hotel-kanriはプロジェクト全体の管理・ドキュメントリポジトリであり、他のリポジトリはそれぞれの機能を実装するためのリポジトリです。hotel-kanriで定義されたルールやドキュメントは、他のすべてのリポジトリに適用されます。

### Q: ドキュメントを更新する際の承認フローは？

A: ドキュメント更新はIssue作成→ブランチ作成→変更実施→PRの作成→レビュー→マージというフローで行います。詳細は「ドキュメント更新フロー」セクションを参照してください。

### Q: 環境変数はどのように管理されていますか？

A: 環境変数は各環境ごとに`.env`ファイルで管理されています。テンプレートは`templates/env/.env.template`にあります。実際の環境変数ファイルはGitにコミットされず、各環境のサーバーで管理されています。

### Q: CI/CDパイプラインはどのように設定されていますか？

A: CI/CDパイプラインはGitHub Actionsで設定されています。設定ファイルは`.github/workflows/`ディレクトリにあります。主に以下の検証が行われます：
- ドキュメント検証（Markdownリンター、リンク切れチェック、スペルチェック）
- スクリプト検証（シェルチェック、シンタックスチェック）
- 設定ファイル検証（Nginx、Docker Compose、PM2）

## サポート

質問や問題がある場合は、以下の方法でサポートを受けることができます：

1. **Issue作成**: リポジトリのIssueを作成
2. **Slack**: #hotel-kanri チャンネルで質問
3. **メール**: support@omotenasuai.com

## 参考リンク

- [プロジェクトWiki](https://example.com/wiki)
- [開発環境アクセス方法](https://example.com/dev-access)
- [CI/CD詳細ドキュメント](https://example.com/cicd)

---

本ドキュメントは定期的にレビューし、必要に応じて更新してください。最終更新日: YYYY-MM-DD