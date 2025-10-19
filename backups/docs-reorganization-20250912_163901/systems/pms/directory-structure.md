# hotel-pms ディレクトリ構造

hotel-pmsプロジェクトは以下のディレクトリ構造で構成されています。

## 全体構成

```
hotel-pms/
├── browser/            # ブラウザ版
├── electron/           # Electron版（フロント用）
├── server/             # バックエンド
├── prisma/             # Prismaスキーマ・マイグレーション
├── common/             # 共通モジュール
├── docs/               # ドキュメント
├── scripts/            # スクリプト
└── config/             # 設定ファイル
```

## ブラウザ版

```
browser/
├── public/             # 静的ファイル
│   ├── favicon.ico     # ファビコン
│   ├── fonts/          # フォント
│   └── images/         # 画像
├── src/                # ソースコード
│   ├── pages/          # ページコンポーネント
│   │   ├── dashboard/  # ダッシュボード
│   │   ├── reservations/ # 予約管理
│   │   ├── front-desk/ # フロント業務
│   │   ├── billing/    # 請求管理
│   │   ├── inventory/  # 在庫管理
│   │   ├── housekeeping/ # ハウスキーピング
│   │   └── reports/    # レポート
│   ├── components/     # 再利用可能コンポーネント
│   │   ├── reservation/ # 予約関連
│   │   ├── guest/      # 顧客関連
│   │   ├── room/       # 部屋関連
│   │   ├── billing/    # 請求関連
│   │   └── ui/         # UI共通
│   ├── composables/    # Vue Composition API関数
│   │   ├── useReservation.ts # 予約操作
│   │   ├── useGuest.ts # 顧客操作
│   │   ├── useRoom.ts  # 部屋操作
│   │   └── useBilling.ts # 請求操作
│   ├── stores/         # Pinia状態管理
│   │   ├── reservation.ts # 予約状態
│   │   ├── guest.ts    # 顧客状態
│   │   ├── room.ts     # 部屋状態
│   │   └── billing.ts  # 請求状態
│   ├── api/            # APIクライアント
│   │   ├── client.ts   # 共通クライアント
│   │   ├── reservation.ts # 予約API
│   │   ├── guest.ts    # 顧客API
│   │   └── billing.ts  # 請求API
│   ├── utils/          # ユーティリティ
│   │   ├── date.ts     # 日付操作
│   │   ├── format.ts   # フォーマット
│   │   └── validation.ts # バリデーション
│   ├── types/          # 型定義
│   │   ├── reservation.ts # 予約型
│   │   ├── guest.ts    # 顧客型
│   │   └── billing.ts  # 請求型
│   ├── assets/         # アセット
│   │   ├── styles/     # スタイル
│   │   └── icons/      # アイコン
│   ├── plugins/        # Vueプラグイン
│   ├── router/         # Vueルーター
│   ├── i18n/           # 国際化
│   ├── App.vue         # ルートコンポーネント
│   ├── main.ts         # エントリーポイント
│   └── vite-env.d.ts   # Vite型定義
├── tests/              # テスト
│   ├── unit/           # 単体テスト
│   └── e2e/            # E2Eテスト
├── index.html          # HTMLテンプレート
├── tsconfig.json       # TypeScript設定
├── vite.config.ts      # Vite設定
└── package.json        # パッケージ設定
```

## Electron版

```
electron/
├── src/                # ソースコード
│   ├── main/           # メインプロセス
│   │   ├── index.ts    # エントリーポイント
│   │   ├── ipc.ts      # IPC通信
│   │   ├── menu.ts     # アプリメニュー
│   │   └── printer.ts  # 印刷機能
│   ├── renderer/       # レンダラープロセス
│   │   ├── pages/      # ページコンポーネント
│   │   ├── components/ # 再利用可能コンポーネント
│   │   ├── composables/ # Vue Composition API関数
│   │   ├── stores/     # Pinia状態管理
│   │   ├── api/        # APIクライアント
│   │   ├── utils/      # ユーティリティ
│   │   ├── types/      # 型定義
│   │   ├── assets/     # アセット
│   │   ├── plugins/    # Vueプラグイン
│   │   ├── router/     # Vueルーター
│   │   ├── i18n/       # 国際化
│   │   ├── App.vue     # ルートコンポーネント
│   │   └── main.ts     # エントリーポイント
│   └── preload/        # プリロードスクリプト
│       └── index.ts    # プリロード処理
├── resources/          # リソース
│   ├── icon.icns       # macOSアイコン
│   ├── icon.ico        # Windowsアイコン
│   └── installers/     # インストーラー設定
├── tests/              # テスト
│   ├── unit/           # 単体テスト
│   └── e2e/            # E2Eテスト
├── tsconfig.json       # TypeScript設定
├── electron-builder.json # Electron Builder設定
└── package.json        # パッケージ設定
```

## バックエンド

```
server/
├── src/                # ソースコード
│   ├── api/            # APIエンドポイント
│   │   ├── reservations/ # 予約API
│   │   │   ├── controller.ts # コントローラー
│   │   │   ├── routes.ts   # ルート
│   │   │   └── validation.ts # バリデーション
│   │   ├── guests/     # 顧客API
│   │   ├── rooms/      # 部屋API
│   │   ├── billing/    # 請求API
│   │   └── reports/    # レポートAPI
│   ├── services/       # ビジネスロジック
│   │   ├── reservation.ts # 予約サービス
│   │   ├── guest.ts    # 顧客サービス
│   │   ├── room.ts     # 部屋サービス
│   │   └── billing.ts  # 請求サービス
│   ├── models/         # データモデル
│   │   ├── reservation.ts # 予約モデル
│   │   ├── guest.ts    # 顧客モデル
│   │   ├── room.ts     # 部屋モデル
│   │   └── billing.ts  # 請求モデル
│   ├── events/         # イベント処理
│   │   ├── publishers/ # イベント発行
│   │   │   ├── reservation.ts # 予約イベント
│   │   │   ├── checkin-checkout.ts # チェックイン/アウト
│   │   │   └── billing.ts # 請求イベント
│   │   ├── subscribers/ # イベント購読
│   │   │   ├── service.ts # サービスイベント
│   │   │   └── customer.ts # 顧客イベント
│   │   └── handlers/   # イベントハンドラ
│   ├── graphql/        # GraphQLスキーマ・リゾルバ
│   │   ├── schema/     # GraphQLスキーマ
│   │   │   ├── reservation.ts # 予約スキーマ
│   │   │   ├── room.ts # 部屋スキーマ
│   │   │   └── billing.ts # 請求スキーマ
│   │   └── resolvers/  # GraphQLリゾルバ
│   │       ├── reservation.ts # 予約リゾルバ
│   │       ├── room.ts # 部屋リゾルバ
│   │       └── billing.ts # 請求リゾルバ
│   ├── middleware/     # ミドルウェア
│   │   ├── auth.ts     # 認証
│   │   ├── error.ts    # エラーハンドリング
│   │   └── logging.ts  # ロギング
│   ├── utils/          # ユーティリティ
│   │   ├── date.ts     # 日付操作
│   │   ├── format.ts   # フォーマット
│   │   └── validation.ts # バリデーション
│   ├── config/         # 設定
│   │   ├── database.ts # データベース設定
│   │   ├── server.ts   # サーバー設定
│   │   └── logger.ts   # ロガー設定
│   ├── types/          # 型定義
│   ├── app.ts          # アプリケーション設定
│   └── index.ts        # エントリーポイント
├── tests/              # テスト
│   ├── unit/           # 単体テスト
│   ├── integration/    # 統合テスト
│   └── e2e/            # E2Eテスト
├── tsconfig.json       # TypeScript設定
└── package.json        # パッケージ設定
```

## Prisma

```
prisma/
├── schema.prisma       # Prismaスキーマ
├── migrations/         # マイグレーション
└── seed.ts             # シードデータ
```

## 共通モジュール

```
common/
├── src/                # ソースコード
│   ├── types/          # 共通型定義
│   │   ├── reservation.ts # 予約型
│   │   ├── guest.ts    # 顧客型
│   │   ├── room.ts     # 部屋型
│   │   └── billing.ts  # 請求型
│   ├── constants/      # 定数
│   │   ├── status.ts   # ステータス定数
│   │   └── events.ts   # イベント定数
│   ├── utils/          # ユーティリティ
│   │   ├── date.ts     # 日付操作
│   │   └── format.ts   # フォーマット
│   └── validation/     # バリデーション
│       ├── reservation.ts # 予約バリデーション
│       └── billing.ts  # 請求バリデーション
├── tests/              # テスト
├── tsconfig.json       # TypeScript設定
└── package.json        # パッケージ設定
```

## スクリプト

```
scripts/
├── build/              # ビルドスクリプト
│   ├── browser.js      # ブラウザビルド
│   ├── electron.js     # Electronビルド
│   └── server.js       # サーバービルド
├── deploy/             # デプロイスクリプト
├── db/                 # データベーススクリプト
│   ├── backup.js       # バックアップ
│   └── restore.js      # リストア
└── test/               # テストスクリプト
```

## 設定ファイル

```
config/
├── development/        # 開発環境設定
│   ├── browser.json    # ブラウザ設定
│   ├── electron.json   # Electron設定
│   └── server.json     # サーバー設定
├── staging/            # ステージング環境設定
└── production/         # 本番環境設定
```

## 命名規則

### ファイル名
- **コンポーネント**: パスカルケース（例: ReservationCard.vue）
- **ユーティリティ/サービス**: キャメルケース（例: dateUtils.ts）
- **設定ファイル**: ケバブケース（例: vite-config.ts）

### 変数/関数名
- **変数**: キャメルケース（例: reservationData）
- **関数**: キャメルケース（例: createReservation）
- **コンポーネント**: パスカルケース（例: ReservationList）
- **定数**: 大文字スネークケース（例: MAX_GUESTS）

### CSS
- **クラス名**: BEM方式（例: reservation-card__title--active）
- **変数**: ケバブケース（例: --primary-color）

## コーディング規約

### Vue
- 単一ファイルコンポーネント（SFC）
- Composition API優先
- Props型定義必須
- Emitイベント定義必須

### TypeScript
- 厳格モード（strict: true）
- インターフェース/型定義必須
- any型の使用禁止
- 非同期処理はPromise/async-await

### CSS
- SCSSプリプロセッサ
- 変数による色・サイズ定義
- レスポンシブミックスイン
- コンポーネントスコープスタイル

## 関連ドキュメント
- [システム概要](./overview.md)
- [技術仕様](./technical-spec.md)
- [UI/UX設計](./ui-ux-design.md)
- [開発ガイドライン](../../development/guidelines/pms-guidelines.md)