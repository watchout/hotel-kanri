# hotel-saas ディレクトリ構造

hotel-saasプロジェクトは以下のディレクトリ構造で構成されています。

```
hotel-saas/
├── pages/              # ページコンポーネント
│   ├── index.vue       # ホーム画面
│   ├── services/       # サービス関連ページ
│   ├── profile/        # プロフィール関連ページ
│   ├── feedback/       # フィードバック関連ページ
│   └── settings/       # 設定関連ページ
├── components/         # 再利用可能コンポーネント
│   ├── ui/             # 基本UIコンポーネント
│   ├── services/       # サービス関連コンポーネント
│   ├── feedback/       # フィードバック関連コンポーネント
│   └── layout/         # レイアウトコンポーネント
├── composables/        # Vue Composition API関数
│   ├── useServices.ts  # サービス関連ロジック
│   ├── useCustomer.ts  # 顧客情報関連ロジック
│   ├── useOrders.ts    # 注文関連ロジック
│   └── useFeedback.ts  # フィードバック関連ロジック
├── stores/             # Pinia状態管理
│   ├── services.ts     # サービス状態
│   ├── customer.ts     # 顧客情報状態
│   ├── orders.ts       # 注文状態
│   └── ui.ts           # UI状態（テーマ等）
├── server/             # APIエンドポイント
│   ├── api/            # REST API
│   │   ├── services/   # サービス関連API
│   │   ├── orders/     # 注文関連API
│   │   └── feedback/   # フィードバック関連API
│   ├── middleware/     # サーバーミドルウェア
│   └── events/         # イベント処理
├── prisma/             # Prismaスキーマ・マイグレーション
│   ├── schema.prisma   # データベーススキーマ
│   └── migrations/     # マイグレーションファイル
├── public/             # 静的ファイル
│   ├── images/         # 画像ファイル
│   ├── icons/          # アイコン
│   └── locales/        # 多言語ファイル
├── assets/             # アセット（コンパイル対象）
│   ├── css/            # スタイルシート
│   └── images/         # 画像アセット
├── plugins/            # Nuxtプラグイン
├── middleware/         # ルートミドルウェア
├── layouts/            # レイアウト
├── utils/              # ユーティリティ関数
├── types/              # TypeScript型定義
└── tests/              # テストファイル
    ├── unit/           # 単体テスト
    └── e2e/            # E2Eテスト
```

## 主要ディレクトリの役割

### pages/
Nuxtのファイルベースルーティングに基づくページコンポーネントを格納します。各ファイルは対応するURLパスでアクセス可能なページを表します。

### components/
再利用可能なVueコンポーネントを格納します。機能やカテゴリごとにサブディレクトリに分類されています。

### composables/
Vue Composition APIを使用した再利用可能なロジックを格納します。これらのフックはアプリケーション全体で共有されるビジネスロジックを提供します。

### stores/
Piniaを使用した状態管理ストアを格納します。アプリケーションの状態は機能ごとに分割されています。

### server/
サーバーサイドのコードを格納します。APIエンドポイント、ミドルウェア、イベント処理などが含まれます。

### prisma/
Prisma ORMの設定とデータベースマイグレーションを格納します。

### public/
ブラウザから直接アクセス可能な静的ファイルを格納します。

### assets/
ビルドプロセスで処理される静的アセットを格納します。

## 命名規則

- **ファイル名**: キャメルケース（composables, utils）またはケバブケース（components, pages）
- **コンポーネント**: パスカルケース（例: ServiceCard.vue）
- **関数**: キャメルケース（例: useCustomerData）
- **定数**: 大文字スネークケース（例: API_ENDPOINT）
- **型定義**: パスカルケース（例: CustomerData）

## 関連ドキュメント
- [技術仕様](./technical-spec.md)
- [開発ガイドライン](../../development/guidelines/saas-guidelines.md)