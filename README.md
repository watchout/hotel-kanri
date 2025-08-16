# hotel-kanri - ホテル統合システム管理リポジトリ

## 概要

hotel-kanriは、omotenasuai.comプロジェクトの管理、設定、ドキュメントを一元的に管理するためのリポジトリです。このリポジトリは、以下の4つのシステムの開発環境の一貫性を確保し、ローカル→開発→本番の環境間のトラブルを最小化することを目的としています：

- **hotel-saas**: ホテル客室AIコンシェルジュ（顧客体験・サービス提供）
- **hotel-pms**: ホテルマネジメントシステム（予約・フロント業務）
- **hotel-member**: ホテル顧客管理システム（会員・CRM）
- **hotel-common**: 上記3つの統合システム（共通基盤）

## AIエージェント

各システムは専用のAIエージェントによって開発支援されます：

- **Sun（天照）**: hotel-saas担当 - 明るく温かい、顧客体験重視
- **Luna（月読）**: hotel-pms担当 - 冷静沈着、24時間運用対応
- **Suno（須佐之男）**: hotel-member担当 - 力強い、セキュリティ重視
- **Iza（伊邪那岐）**: hotel-common担当 - 創造神、統合管理者

## ディレクトリ構造

```
hotel-kanri/
├── .cursor/                  # Cursor AI設定
│   └── rules/                # 統合ルール
├── .github/                  # GitHub設定
│   ├── workflows/            # GitHub Actions
│   ├── ISSUE_TEMPLATE/       # Issue テンプレート
│   └── PULL_REQUEST_TEMPLATE.md # PR テンプレート
├── docs/                     # ドキュメント
│   ├── architecture/         # アーキテクチャ設計
│   ├── api/                  # API仕様
│   ├── db/                   # データベース設計
│   ├── deployment/           # デプロイ手順
│   ├── development/          # 開発ルール
│   ├── infrastructure/       # インフラ関連
│   │   ├── domains/          # ドメイン設定
│   │   ├── network/          # ネットワーク設定
│   │   └── servers/          # サーバー設定
│   ├── management/           # 管理体制
│   ├── migration/            # 移行関連
│   ├── roadmap/              # 開発ロードマップ
│   ├── rules/                # 開発ルール
│   └── spec/                 # 機能仕様
├── config/                   # 設定ファイル
│   ├── nginx/                # Nginx設定
│   ├── docker/               # Docker設定
│   └── pm2/                  # PM2設定
├── scripts/                  # 運用スクリプト
│   ├── deploy/               # デプロイスクリプト
│   ├── backup/               # バックアップスクリプト
│   ├── monitoring/           # 監視スクリプト
│   └── migrate/              # 移行スクリプト
├── templates/                # テンプレート
│   ├── env/                  # 環境変数テンプレート
│   └── docs/                 # ドキュメントテンプレート
└── README.md                 # 本ファイル
```

## 主要ドキュメント

### システム設計

- [システム統合アーキテクチャ](docs/architecture/system-integration.md) - システム間連携設計
- [イベント駆動アーキテクチャ](docs/integration/event-driven-architecture.md) - イベント連携設計
- [統一データベーススキーマ](docs/db/schema.prisma) - 共通データモデル

### 開発ルール

- [マスタールール](docs/rules/hotel-kanri-master-rules.md) - 全システム共通の最上位ルール
- [開発ルールとドキュメント標準](docs/development/development-rules-and-documentation-standards.md) - 開発標準
- [実装承認プロセス](docs/rules/implementation-approval-process.md) - 実装前の承認フロー

### システム固有ルール

- [hotel-saas ルール](docs/rules/hotel-saas-rules.md) - AIコンシェルジュ開発ルール
- [hotel-pms ルール](docs/rules/hotel-pms-rules.md) - PMS開発ルール
- [hotel-member ルール](docs/rules/hotel-member-rules.md) - 顧客管理システム開発ルール
- [hotel-common ルール](docs/rules/hotel-common-rules.md) - 統合基盤開発ルール
- [AIエージェントガイドライン](docs/rules/ai-agent-guidelines.md) - AIエージェント行動指針

### 管理・運用

- [リポジトリ管理体制](docs/management/repository-management-structure.md) - リポジトリ構成と管理フロー
- [アクセス制御ポリシー](docs/management/access-control-policy.md) - 権限管理ポリシー
- [オンボーディングガイド](docs/management/onboarding-guide.md) - 新メンバー向けガイド
- [現在のロードマップ](docs/roadmap/current-roadmap.md) - 開発計画とマイルストーン

### インフラストラクチャ

- [ドメイン運用戦略](docs/infrastructure/domains/domain-management-strategy.md) - サブドメイン構成と管理
- [開発サーバードメイン実装計画](docs/infrastructure/domains/dev-server-domain-implementation-plan.md) - 開発環境のドメイン設定
- [ネットワーク設定](docs/infrastructure/network/network-configuration.md) - ネットワーク構成
- [サーバー設定](docs/infrastructure/servers/server-configuration.md) - サーバー構成

## 開発プロセス

1. 各システムは独自のリポジトリで開発
2. 共通ルールとドキュメントはhotel-kanriで管理
3. 統合テストとデプロイはhotel-commonで実施
4. 各システムのAIエージェントは専用のルールに従って開発支援

## 技術スタック

- **フロントエンド**: Vue 3 + TypeScript + Tailwind CSS
- **バックエンド**: Node.js + TypeScript + Express/NestJS
- **データベース**: PostgreSQL
- **ORM**: Prisma
- **認証**: JWT
- **イベント連携**: RabbitMQ/Kafka
- **コンテナ化**: Docker
- **CI/CD**: GitHub Actions

## 開発環境セットアップ

```bash
# 各システムのクローン
git clone https://github.com/example/hotel-saas.git
git clone https://github.com/example/hotel-pms.git
git clone https://github.com/example/hotel-member.git
git clone https://github.com/example/hotel-common.git
git clone https://github.com/example/hotel-kanri.git

# 統合ルールの適用
cp -r hotel-kanri/.cursor/rules hotel-saas/.cursor/
cp -r hotel-kanri/.cursor/rules hotel-pms/.cursor/
cp -r hotel-kanri/.cursor/rules hotel-member/.cursor/
cp -r hotel-kanri/.cursor/rules hotel-common/.cursor/
```

## ポート設定

- **hotel-saas**: 3100
- **hotel-member**: 3200 + 8080
- **hotel-pms-browser**: 3300
- **hotel-pms-electron**: 3301
- **hotel-common**: 3400

## CI/CD

hotel-kanriリポジトリには以下のCI/CDが設定されています：

- **ドキュメント検証**: Markdownの構文チェックとリンク検証
- **スクリプト検証**: シェルスクリプトの構文チェック
- **設定ファイル検証**: 設定ファイルのフォーマット検証
- **ブランチ保護チェック**: ブランチ保護ルールの適用確認

## 貢献方法

1. 開発ルールとドキュメント標準を確認
2. 変更用のブランチを作成
3. 変更を実施
4. Pull Requestを作成
5. レビューと承認を経てマージ

## 連絡先

プロジェクト管理チーム: [管理者のメールアドレス]