# hotel-member ディレクトリ構造

hotel-memberプロジェクトは以下のディレクトリ構造で構成されています。

## 全体構成

```
hotel-member/
├── fastapi-backend/      # Python FastAPI バックエンド
├── nuxt-frontend/        # Nuxt.js フロントエンド
├── prisma/               # Prismaスキーマ・マイグレーション
├── scripts/              # 自動化スクリプト
├── logs/                 # ログファイル
└── docs/                 # ドキュメント
```

## バックエンド

```
fastapi-backend/
├── app/                  # アプリケーションコード
│   ├── main.py           # エントリーポイント
│   ├── api/              # APIエンドポイント
│   │   ├── v1/           # APIバージョン1
│   │   │   ├── customers.py  # 顧客API
│   │   │   ├── members.py    # 会員API
│   │   │   ├── points.py     # ポイントAPI
│   │   │   └── campaigns.py  # キャンペーンAPI
│   │   └── deps.py       # 依存関係
│   ├── core/             # コア機能
│   │   ├── config.py     # 設定
│   │   ├── security.py   # セキュリティ
│   │   └── events.py     # イベント処理
│   ├── db/               # データベース
│   │   ├── session.py    # DBセッション
│   │   └── base.py       # ベースモデル
│   ├── models/           # SQLAlchemyモデル
│   │   ├── customer.py   # 顧客モデル
│   │   ├── membership.py # 会員モデル
│   │   ├── point.py      # ポイントモデル
│   │   └── campaign.py   # キャンペーンモデル
│   ├── schemas/          # Pydanticスキーマ
│   │   ├── customer.py   # 顧客スキーマ
│   │   ├── membership.py # 会員スキーマ
│   │   ├── point.py      # ポイントスキーマ
│   │   └── campaign.py   # キャンペーンスキーマ
│   ├── services/         # ビジネスロジック
│   │   ├── customer.py   # 顧客サービス
│   │   ├── membership.py # 会員サービス
│   │   ├── point.py      # ポイントサービス
│   │   └── campaign.py   # キャンペーンサービス
│   ├── events/           # イベント処理
│   │   ├── publishers/   # イベント発行
│   │   │   ├── customer.py  # 顧客イベント
│   │   │   ├── member.py    # 会員イベント
│   │   │   └── point.py     # ポイントイベント
│   │   ├── subscribers/  # イベント購読
│   │   │   ├── reservation.py  # 予約イベント
│   │   │   ├── checkin.py      # チェックインイベント
│   │   │   └── billing.py      # 請求イベント
│   │   └── handlers/     # イベントハンドラ
│   └── utils/            # ユーティリティ
│       ├── encryption.py # 暗号化
│       ├── validators.py # バリデーター
│       └── logging.py    # ロギング
├── tests/                # テストコード
│   ├── api/              # APIテスト
│   │   ├── test_customers.py  # 顧客APIテスト
│   │   ├── test_members.py    # 会員APIテスト
│   │   └── test_points.py     # ポイントAPIテスト
│   ├── services/         # サービステスト
│   │   ├── test_customer.py   # 顧客サービステスト
│   │   ├── test_membership.py # 会員サービステスト
│   │   └── test_point.py      # ポイントサービステスト
│   ├── events/           # イベントテスト
│   │   ├── test_publishers.py  # 発行テスト
│   │   └── test_subscribers.py # 購読テスト
│   └── conftest.py       # テスト設定
├── alembic/              # マイグレーション
│   ├── versions/         # マイグレーションファイル
│   └── env.py            # Alembic環境
├── pyproject.toml        # Pythonプロジェクト設定
├── poetry.lock           # 依存関係ロック
├── Dockerfile            # Dockerファイル
└── .env.example          # 環境変数サンプル
```

## フロントエンド

```
nuxt-frontend/
├── pages/                # ページコンポーネント
│   ├── index.vue         # ダッシュボード
│   ├── customers/        # 顧客管理
│   │   ├── index.vue     # 顧客一覧
│   │   ├── [id].vue      # 顧客詳細
│   │   ├── create.vue    # 顧客作成
│   │   └── import.vue    # 顧客インポート
│   ├── members/          # 会員管理
│   │   ├── index.vue     # 会員一覧
│   │   ├── [id].vue      # 会員詳細
│   │   ├── ranks/        # ランク管理
│   │   └── benefits/     # 特典管理
│   ├── points/           # ポイント管理
│   │   ├── index.vue     # ポイント概要
│   │   ├── add.vue       # ポイント付与
│   │   ├── redeem.vue    # ポイント使用
│   │   └── history.vue   # ポイント履歴
│   ├── segments/         # セグメント管理
│   │   ├── index.vue     # セグメント一覧
│   │   ├── [id].vue      # セグメント詳細
│   │   └── builder.vue   # セグメントビルダー
│   └── campaigns/        # キャンペーン管理
│       ├── index.vue     # キャンペーン一覧
│       ├── [id].vue      # キャンペーン詳細
│       └── create.vue    # キャンペーン作成
├── components/           # 再利用可能コンポーネント
│   ├── ui/               # UIコンポーネント
│   │   ├── Button.vue    # ボタン
│   │   ├── Card.vue      # カード
│   │   ├── Table.vue     # テーブル
│   │   └── Modal.vue     # モーダル
│   ├── customer/         # 顧客コンポーネント
│   │   ├── CustomerForm.vue    # 顧客フォーム
│   │   ├── CustomerCard.vue    # 顧客カード
│   │   └── CustomerHistory.vue # 顧客履歴
│   ├── member/           # 会員コンポーネント
│   │   ├── MembershipForm.vue  # 会員フォーム
│   │   ├── RankBadge.vue       # ランクバッジ
│   │   └── BenefitsList.vue    # 特典リスト
│   └── point/            # ポイントコンポーネント
│       ├── PointBalance.vue    # ポイント残高
│       ├── PointHistory.vue    # ポイント履歴
│       └── PointForm.vue       # ポイントフォーム
├── composables/          # Vue Composition API関数
│   ├── useCustomer.ts    # 顧客関連
│   ├── useMember.ts      # 会員関連
│   ├── usePoint.ts       # ポイント関連
│   ├── useSegment.ts     # セグメント関連
│   └── useCampaign.ts    # キャンペーン関連
├── stores/               # Pinia状態管理
│   ├── customer.ts       # 顧客ストア
│   ├── member.ts         # 会員ストア
│   ├── point.ts          # ポイントストア
│   ├── segment.ts        # セグメントストア
│   └── campaign.ts       # キャンペーンストア
├── api/                  # APIクライアント
│   ├── client.ts         # 共通クライアント
│   ├── customer.ts       # 顧客API
│   ├── member.ts         # 会員API
│   ├── point.ts          # ポイントAPI
│   ├── segment.ts        # セグメントAPI
│   └── campaign.ts       # キャンペーンAPI
├── utils/                # ユーティリティ
│   ├── formatters.ts     # フォーマッター
│   ├── validators.ts     # バリデーター
│   ├── security.ts       # セキュリティ
│   └── date.ts           # 日付ユーティリティ
├── assets/               # 静的アセット
│   ├── css/              # スタイル
│   │   ├── main.css      # メインスタイル
│   │   └── tailwind.css  # Tailwindスタイル
│   └── images/           # 画像
│       ├── logo.svg      # ロゴ
│       └── icons/        # アイコン
├── middleware/           # Nuxtミドルウェア
│   ├── auth.ts           # 認証
│   └── permissions.ts    # 権限
├── plugins/              # Nuxtプラグイン
│   ├── api.ts            # APIプラグイン
│   └── security.ts       # セキュリティプラグイン
├── tests/                # テストコード
│   ├── unit/             # 単体テスト
│   │   ├── components/   # コンポーネントテスト
│   │   └── stores/       # ストアテスト
│   └── e2e/              # E2Eテスト
│       ├── customer.spec.ts  # 顧客E2Eテスト
│       └── member.spec.ts    # 会員E2Eテスト
├── nuxt.config.ts        # Nuxt設定
├── tailwind.config.js    # Tailwind設定
├── tsconfig.json         # TypeScript設定
├── package.json          # パッケージ設定
└── Dockerfile            # Dockerファイル
```

## Prisma

```
prisma/
├── schema.prisma         # Prismaスキーマ
├── migrations/           # マイグレーション
│   ├── 20230101000000_init/  # 初期マイグレーション
│   │   └── migration.sql     # SQLマイグレーション
│   └── migration_lock.toml   # マイグレーションロック
└── seed.ts               # シードデータ
```

## スクリプト

```
scripts/
├── setup/                # セットアップスクリプト
│   ├── init-db.sh        # DB初期化
│   └── seed-data.sh      # データシード
├── backup/               # バックアップスクリプト
│   ├── backup-db.sh      # DB自動バックアップ
│   └── restore-db.sh     # DB復元
├── deploy/               # デプロイスクリプト
│   ├── deploy-backend.sh # バックエンドデプロイ
│   └── deploy-frontend.sh # フロントエンドデプロイ
└── utils/                # ユーティリティスクリプト
    ├── encrypt-data.py   # データ暗号化
    └── audit-log.py      # 監査ログ抽出
```

## ログ

```
logs/
├── api/                  # APIログ
│   ├── access.log        # アクセスログ
│   └── error.log         # エラーログ
├── audit/                # 監査ログ
│   ├── data_access.log   # データアクセスログ
│   └── admin_actions.log # 管理者操作ログ
└── system/               # システムログ
    ├── app.log           # アプリケーションログ
    └── performance.log   # パフォーマンスログ
```

## ドキュメント

```
docs/
├── api/                  # API仕様
│   ├── openapi.yaml      # OpenAPI仕様
│   └── examples/         # APIサンプル
├── security/             # セキュリティドキュメント
│   ├── data_protection.md # データ保護
│   └── access_control.md # アクセス制御
├── development/          # 開発ガイド
│   ├── setup.md          # セットアップガイド
│   └── coding_standards.md # コーディング規約
└── user/                 # ユーザーガイド
    ├── admin_manual.md   # 管理者マニュアル
    └── operations.md     # 運用マニュアル
```

## 命名規則

### ファイル名
- **Pythonファイル**: スネークケース（例: customer_service.py）
- **TypeScriptファイル**: キャメルケース（例: customerApi.ts）
- **Vueコンポーネント**: パスカルケース（例: CustomerCard.vue）
- **設定ファイル**: ケバブケース（例: nuxt-config.ts）

### 変数/関数名
- **Python**: スネークケース（例: get_customer_by_id）
- **TypeScript/JavaScript**: キャメルケース（例: getCustomerById）
- **コンポーネント名**: パスカルケース（例: CustomerList）
- **定数**: 大文字スネークケース（例: MAX_POINTS_PER_TRANSACTION）

### データベース
- **テーブル名**: スネークケース、複数形（例: customers, membership_ranks）
- **カラム名**: スネークケース（例: first_name, created_at）
- **インデックス**: idx_{テーブル名}_{カラム名}（例: idx_customers_email）
- **外部キー**: fk_{テーブル名}_{参照テーブル名}（例: fk_points_memberships）

## コーディング規約

### Python (FastAPI)
- PEP 8準拠
- 型ヒント必須
- ドキュメント文字列（docstring）必須
- 依存性注入パターン
- 例外処理の明示化

### TypeScript (Nuxt/Vue)
- ESLint + Prettier準拠
- 厳格モード（strict: true）
- インターフェース定義必須
- コンポーネントProps型定義
- Composition API優先

### セキュリティ規約
- テナントIDチェック必須
- 入力値検証必須
- SQLインジェクション防止
- XSS対策
- CSRF対策
- 機密データマスキング

## 関連ドキュメント
- [システム概要](./overview.md)
- [技術仕様](./technical-spec.md)
- [UI/UX設計](./ui-ux-design.md)
- [開発ガイドライン](../../development/guidelines/member-guidelines.md)