# hotel-pms 技術仕様

## システム構成

### フロントエンド
- **フレームワーク**: Vue 3 + TypeScript
- **UI/UXライブラリ**: Vuetify / Quasar
- **状態管理**: Pinia
- **グラフ・可視化**: Chart.js / D3.js
- **デスクトップアプリ**: Electron (フロント用)
- **アプリケーション**:
  - ブラウザ版（管理画面用）: ポート3300
  - Electron版（フロントデスク用）: ポート3301

### バックエンド
- **フレームワーク**: Node.js + TypeScript + Express/NestJS
- **API設計**: RESTful + GraphQL
- **データベース**: PostgreSQL
- **ORM**: Prisma
- **キャッシュ**: Redis（キャッシュ、セッション管理）
- **認証**: JWT（hotel-common統一基盤）

### 外部連携
- **OTA API連携**: Booking.com, Expedia等
- **決済ゲートウェイ連携**: クレジットカード、電子決済
- **hotel-member API**: 顧客情報連携
- **hotel-saas API**: サービス連携

### デプロイメント
- **コンテナ化**: Docker
- **CI/CD**: GitHub Actions
- **環境**: 開発・ステージング・本番
- **デプロイ方式**: ブルー/グリーンデプロイメント

## アプリケーション構成

### ブラウザ版
```
hotel-pms-browser/
├── pages/                # ページコンポーネント
│   ├── dashboard/        # ダッシュボード
│   ├── reservations/     # 予約管理
│   ├── front-desk/       # フロント業務
│   ├── billing/          # 請求管理
│   ├── inventory/        # 在庫管理
│   ├── housekeeping/     # ハウスキーピング
│   └── reports/          # レポート
├── components/           # 再利用可能コンポーネント
│   ├── reservation/      # 予約関連
│   ├── guest/            # 顧客関連
│   ├── room/             # 部屋関連
│   ├── billing/          # 請求関連
│   └── ui/               # UI共通
├── composables/          # Vue Composition API関数
│   ├── useReservation.ts # 予約操作
│   ├── useGuest.ts       # 顧客操作
│   ├── useRoom.ts        # 部屋操作
│   └── useBilling.ts     # 請求操作
└── stores/               # Pinia状態管理
    ├── reservation.ts    # 予約状態
    ├── guest.ts          # 顧客状態
    ├── room.ts           # 部屋状態
    └── billing.ts        # 請求状態
```

### Electron版
```
hotel-pms-electron/
├── main/                 # メインプロセス
│   ├── index.ts          # エントリーポイント
│   ├── ipc.ts            # IPC通信
│   ├── menu.ts           # アプリメニュー
│   └── printer.ts        # 印刷機能
├── renderer/             # レンダラープロセス
│   ├── pages/            # ページコンポーネント
│   ├── components/       # 再利用可能コンポーネント
│   ├── composables/      # Vue Composition API関数
│   └── stores/           # Pinia状態管理
└── preload/              # プリロードスクリプト
    └── index.ts          # プリロード処理
```

### バックエンド
```
hotel-pms-server/
├── api/                  # APIエンドポイント
│   ├── reservations/     # 予約API
│   ├── guests/           # 顧客API
│   ├── rooms/            # 部屋API
│   ├── billing/          # 請求API
│   └── reports/          # レポートAPI
├── services/             # ビジネスロジック
│   ├── reservation.ts    # 予約サービス
│   ├── guest.ts          # 顧客サービス
│   ├── room.ts           # 部屋サービス
│   └── billing.ts        # 請求サービス
├── models/               # データモデル
│   ├── reservation.ts    # 予約モデル
│   ├── guest.ts          # 顧客モデル
│   ├── room.ts           # 部屋モデル
│   └── billing.ts        # 請求モデル
├── events/               # イベント処理
│   ├── publishers/       # イベント発行
│   ├── subscribers/      # イベント購読
│   └── handlers/         # イベントハンドラ
└── graphql/              # GraphQLスキーマ・リゾルバ
    ├── schema/           # GraphQLスキーマ
    └── resolvers/        # GraphQLリゾルバ
```

## データモデル

### 主要エンティティ

#### Reservation（予約）
```typescript
interface Reservation {
  id: string;            // 予約ID
  guestId: string;       // 顧客ID
  roomId: string;        // 部屋ID
  checkInDate: Date;     // チェックイン日
  checkOutDate: Date;    // チェックアウト日
  status: ReservationStatus; // 予約ステータス
  origin: ReservationOrigin; // 予約元
  adults: number;        // 大人人数
  children: number;      // 子供人数
  specialRequests: string; // 特別リクエスト
  totalAmount: number;   // 合計金額
  createdAt: Date;       // 作成日時
  updatedAt: Date;       // 更新日時
  tenantId: string;      // テナントID
}

enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELED = 'CANCELED',
  NO_SHOW = 'NO_SHOW'
}

enum ReservationOrigin {
  MEMBER = 'MEMBER',
  OTA = 'OTA',
  FRONT = 'FRONT',
  PHONE = 'PHONE',
  WALK_IN = 'WALK_IN'
}
```

#### Room（部屋）
```typescript
interface Room {
  id: string;            // 部屋ID
  number: string;        // 部屋番号
  typeId: string;        // 部屋タイプID
  status: RoomStatus;    // 部屋ステータス
  cleaningStatus: CleaningStatus; // 清掃ステータス
  floor: number;         // フロア
  features: string[];    // 設備
  notes: string;         // 備考
  createdAt: Date;       // 作成日時
  updatedAt: Date;       // 更新日時
  tenantId: string;      // テナントID
}

enum RoomStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  OUT_OF_ORDER = 'OUT_OF_ORDER',
  RESERVED = 'RESERVED'
}

enum CleaningStatus {
  CLEAN = 'CLEAN',
  DIRTY = 'DIRTY',
  CLEANING = 'CLEANING',
  INSPECTED = 'INSPECTED'
}
```

#### Billing（請求）
```typescript
interface Billing {
  id: string;            // 請求ID
  reservationId: string; // 予約ID
  guestId: string;       // 顧客ID
  items: BillingItem[];  // 請求項目
  totalAmount: number;   // 合計金額
  paidAmount: number;    // 支払済金額
  status: BillingStatus; // 請求ステータス
  paymentMethod: PaymentMethod; // 支払方法
  invoiceNumber: string; // 請求書番号
  createdAt: Date;       // 作成日時
  updatedAt: Date;       // 更新日時
  tenantId: string;      // テナントID
}

interface BillingItem {
  id: string;            // 請求項目ID
  description: string;   // 説明
  quantity: number;      // 数量
  unitPrice: number;     // 単価
  amount: number;        // 金額
  category: ItemCategory; // カテゴリ
  date: Date;            // 発生日
}

enum BillingStatus {
  OPEN = 'OPEN',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  CANCELED = 'CANCELED'
}

enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  ONLINE_PAYMENT = 'ONLINE_PAYMENT'
}

enum ItemCategory {
  ROOM = 'ROOM',
  SERVICE = 'SERVICE',
  TAX = 'TAX',
  DISCOUNT = 'DISCOUNT'
}
```

## API設計

### RESTful API

#### 予約API
- `GET /api/reservations` - 予約一覧取得
- `GET /api/reservations/:id` - 予約詳細取得
- `POST /api/reservations` - 予約作成
- `PUT /api/reservations/:id` - 予約更新
- `DELETE /api/reservations/:id` - 予約キャンセル
- `POST /api/reservations/:id/check-in` - チェックイン処理
- `POST /api/reservations/:id/check-out` - チェックアウト処理

#### 部屋API
- `GET /api/rooms` - 部屋一覧取得
- `GET /api/rooms/:id` - 部屋詳細取得
- `GET /api/rooms/availability` - 空室状況取得
- `PUT /api/rooms/:id/status` - 部屋ステータス更新
- `PUT /api/rooms/:id/cleaning` - 清掃ステータス更新

#### 請求API
- `GET /api/billings` - 請求一覧取得
- `GET /api/billings/:id` - 請求詳細取得
- `POST /api/billings` - 請求作成
- `PUT /api/billings/:id` - 請求更新
- `POST /api/billings/:id/payment` - 支払処理
- `GET /api/billings/:id/invoice` - 請求書生成

### GraphQL API

```graphql
type Query {
  # 予約関連
  reservations(filter: ReservationFilter): [Reservation!]!
  reservation(id: ID!): Reservation
  
  # 部屋関連
  rooms(filter: RoomFilter): [Room!]!
  room(id: ID!): Room
  roomAvailability(startDate: Date!, endDate: Date!): [RoomAvailability!]!
  
  # 請求関連
  billings(filter: BillingFilter): [Billing!]!
  billing(id: ID!): Billing
  
  # レポート関連
  revenueReport(startDate: Date!, endDate: Date!): RevenueReport!
  occupancyReport(startDate: Date!, endDate: Date!): OccupancyReport!
}

type Mutation {
  # 予約関連
  createReservation(input: CreateReservationInput!): Reservation!
  updateReservation(id: ID!, input: UpdateReservationInput!): Reservation!
  cancelReservation(id: ID!, reason: String): Reservation!
  checkInReservation(id: ID!): Reservation!
  checkOutReservation(id: ID!): Reservation!
  
  # 部屋関連
  updateRoomStatus(id: ID!, status: RoomStatus!): Room!
  updateCleaningStatus(id: ID!, status: CleaningStatus!): Room!
  
  # 請求関連
  createBilling(input: CreateBillingInput!): Billing!
  updateBilling(id: ID!, input: UpdateBillingInput!): Billing!
  addPayment(id: ID!, input: PaymentInput!): Billing!
}
```

## イベント連携

### 発行イベント
| イベント名 | 説明 | ペイロード |
|------------|------|----------|
| reservation.created | 予約作成 | { reservationId, customerId, roomId, dateRange, origin, ... } |
| reservation.updated | 予約更新 | { reservationId, changes, ... } |
| reservation.canceled | 予約キャンセル | { reservationId, reason, ... } |
| checkin_checkout.checked_in | チェックイン | { reservationId, customerId, roomId, timestamp } |
| checkin_checkout.checked_out | チェックアウト | { reservationId, customerId, roomId, timestamp } |
| billing.created | 請求作成 | { billingId, reservationId, items, total, ... } |
| billing.paid | 請求支払完了 | { billingId, paymentMethod, ... } |

### 購読イベント
| イベント名 | 説明 | 処理内容 |
|------------|------|----------|
| service.ordered | サービス注文 | 請求項目追加、ルームサービス手配 |
| service.canceled | サービスキャンセル | 請求項目削除 |
| customer.updated | 顧客情報更新 | 予約関連顧客情報更新 |
| member.status_changed | 会員ステータス変更 | 特典・料金プラン適用 |

## セキュリティ設計

### 認証・認可
- JWT認証（hotel-common統一基盤）
- ロールベースアクセス制御
  - ADMIN: 全権限
  - MANAGER: 管理権限
  - FRONT_DESK: フロント業務権限
  - HOUSEKEEPING: ハウスキーピング権限
  - READONLY: 参照のみ権限

### データ保護
- 個人情報の暗号化
- 転送時の暗号化（TLS 1.3）
- 保存時の暗号化（機密情報）

### 監査・ログ
- 操作ログの記録
- 変更履歴の保持
- アクセスログの監視

## 監視・ロギング

### メトリクス
- API応答時間
- エラー率
- リソース使用率
- 同時接続数
- トランザクション数

### ログ
- エラーログ
- アクセスログ
- 操作ログ
- システムログ

### アラート
- サービス停止
- 異常なエラー率
- リソース枯渇
- セキュリティ違反

## テスト要件

### 単体テスト
- フレームワーク: Vitest
- カバレッジ目標: 90%以上

### E2Eテスト
- フレームワーク: Playwright
- 重要フロー:
  - 予約作成〜チェックイン〜チェックアウト
  - 請求作成〜支払処理
  - 部屋在庫管理

### 負荷テスト
- 同時接続: 100ユーザー
- レスポンスタイム: 平均500ms以内

## 関連ドキュメント
- [システム概要](./overview.md)
- [UI/UX設計](./ui-ux-design.md)
- [ディレクトリ構造](./directory-structure.md)
- [開発ガイドライン](../../development/guidelines/pms-guidelines.md)
- [イベント連携](../../integration/events/pms-events.md)