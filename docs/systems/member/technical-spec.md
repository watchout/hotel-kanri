# hotel-member 技術仕様

## システム構成

### フロントエンド
- **フレームワーク**: Nuxt 3 + Vue 3
- **スタイル**: Tailwind CSS
- **状態管理**: Pinia
- **フォーム**: vee-validate + yup
- **アクセシビリティ**: ARIA対応
- **ポート**: 8080

### バックエンド
- **フレームワーク**: FastAPI + Python
- **API設計**: RESTful API
- **データベース**: PostgreSQL
- **ORM**: SQLAlchemy + Prisma
- **認証**: JWT（hotel-common統一基盤）
- **バリデーション**: Pydantic
- **ポート**: 3200

### 外部連携
- **メール配信サービス**: SendGrid/Mailchimp
- **SMS配信サービス**: Twilio
- **分析ツール連携**: Google Analytics/Mixpanel
- **hotel-pms API**: 予約・宿泊履歴連携
- **hotel-saas API**: サービス利用履歴連携

### デプロイメント
- **コンテナ化**: Docker
- **CI/CD**: GitHub Actions
- **環境**: 開発・ステージング・本番
- **デプロイ方式**: ブルー/グリーンデプロイメント

## アプリケーション構成

### バックエンド構成
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
│   └── utils/            # ユーティリティ
│       ├── encryption.py # 暗号化
│       └── validators.py # バリデーター
├── tests/                # テストコード
│   ├── api/              # APIテスト
│   ├── services/         # サービステスト
│   └── conftest.py       # テスト設定
└── alembic/              # マイグレーション
    ├── versions/         # マイグレーションファイル
    └── env.py            # Alembic環境
```

### フロントエンド構成
```
nuxt-frontend/
├── pages/                # ページコンポーネント
│   ├── index.vue         # ダッシュボード
│   ├── customers/        # 顧客管理
│   ├── members/          # 会員管理
│   ├── points/           # ポイント管理
│   ├── segments/         # セグメント管理
│   └── campaigns/        # キャンペーン管理
├── components/           # 再利用可能コンポーネント
│   ├── ui/               # UIコンポーネント
│   ├── customer/         # 顧客コンポーネント
│   ├── member/           # 会員コンポーネント
│   └── point/            # ポイントコンポーネント
├── composables/          # Vue Composition API関数
│   ├── useCustomer.ts    # 顧客関連
│   ├── useMember.ts      # 会員関連
│   └── usePoint.ts       # ポイント関連
├── stores/               # Pinia状態管理
│   ├── customer.ts       # 顧客ストア
│   ├── member.ts         # 会員ストア
│   └── point.ts          # ポイントストア
├── api/                  # APIクライアント
│   ├── client.ts         # 共通クライアント
│   ├── customer.ts       # 顧客API
│   └── member.ts         # 会員API
├── utils/                # ユーティリティ
│   ├── formatters.ts     # フォーマッター
│   └── validators.ts     # バリデーター
├── assets/               # 静的アセット
│   ├── css/              # スタイル
│   └── images/           # 画像
└── middleware/           # Nuxtミドルウェア
    ├── auth.ts           # 認証
    └── permissions.ts    # 権限
```

## データモデル

### 主要エンティティ

#### Customer（顧客）
```typescript
interface Customer {
  id: string;            // 顧客ID
  tenantId: string;      // テナントID
  firstName: string;     // 名
  lastName: string;      // 姓
  email: string;         // メールアドレス
  phone: string;         // 電話番号
  address: string;       // 住所
  birthDate: Date;       // 生年月日
  gender: Gender;        // 性別
  preferences: JSON;     // 好み（JSON形式）
  notes: string;         // 備考
  status: CustomerStatus; // ステータス
  createdAt: Date;       // 作成日時
  updatedAt: Date;       // 更新日時
  deletedAt: Date;       // 削除日時（論理削除）
}

enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY'
}

enum CustomerStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED'
}
```

#### Membership（会員）
```typescript
interface Membership {
  id: string;            // 会員ID
  tenantId: string;      // テナントID
  customerId: string;    // 顧客ID
  membershipNumber: string; // 会員番号
  rankId: string;        // ランクID
  joinDate: Date;        // 入会日
  expiryDate: Date;      // 有効期限
  status: MembershipStatus; // ステータス
  totalPoints: number;   // 累計ポイント
  availablePoints: number; // 利用可能ポイント
  totalSpent: number;    // 累計支出額
  lastActivity: Date;    // 最終アクティビティ日時
  createdAt: Date;       // 作成日時
  updatedAt: Date;       // 更新日時
}

enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED'
}
```

#### MembershipRank（会員ランク）
```typescript
interface MembershipRank {
  id: string;            // ランクID
  tenantId: string;      // テナントID
  name: string;          // ランク名
  description: string;   // 説明
  pointMultiplier: number; // ポイント倍率
  minimumSpend: number;  // 最低支出額
  minimumStays: number;  // 最低宿泊数
  benefits: string[];    // 特典リスト
  createdAt: Date;       // 作成日時
  updatedAt: Date;       // 更新日時
}
```

#### Point（ポイント）
```typescript
interface Point {
  id: string;            // ポイントID
  tenantId: string;      // テナントID
  membershipId: string;  // 会員ID
  amount: number;        // ポイント数
  type: PointType;       // タイプ
  status: PointStatus;   // ステータス
  source: PointSource;   // 発生源
  sourceId: string;      // 発生源ID
  description: string;   // 説明
  expiryDate: Date;      // 有効期限
  createdAt: Date;       // 作成日時
  updatedAt: Date;       // 更新日時
}

enum PointType {
  EARNED = 'EARNED',
  REDEEMED = 'REDEEMED',
  ADJUSTED = 'ADJUSTED',
  EXPIRED = 'EXPIRED'
}

enum PointStatus {
  ACTIVE = 'ACTIVE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING'
}

enum PointSource {
  STAY = 'STAY',
  PURCHASE = 'PURCHASE',
  CAMPAIGN = 'CAMPAIGN',
  MANUAL = 'MANUAL',
  SYSTEM = 'SYSTEM'
}
```

## API設計

### RESTful API

#### 顧客API
- `GET /api/customers` - 顧客一覧取得
- `GET /api/customers/:id` - 顧客詳細取得
- `POST /api/customers` - 顧客作成
- `PUT /api/customers/:id` - 顧客更新
- `DELETE /api/customers/:id` - 顧客削除（論理削除）
- `GET /api/customers/:id/history` - 顧客履歴取得
- `GET /api/customers/:id/preferences` - 顧客好み取得
- `PUT /api/customers/:id/preferences` - 顧客好み更新

#### 会員API
- `GET /api/memberships` - 会員一覧取得
- `GET /api/memberships/:id` - 会員詳細取得
- `POST /api/memberships` - 会員登録
- `PUT /api/memberships/:id` - 会員情報更新
- `PUT /api/memberships/:id/rank` - 会員ランク更新
- `GET /api/memberships/:id/benefits` - 会員特典取得
- `GET /api/membership-ranks` - 会員ランク一覧取得
- `POST /api/membership-ranks` - 会員ランク作成
- `PUT /api/membership-ranks/:id` - 会員ランク更新

#### ポイントAPI
- `GET /api/memberships/:id/points` - ポイント残高取得
- `GET /api/memberships/:id/points/history` - ポイント履歴取得
- `POST /api/memberships/:id/points/add` - ポイント追加
- `POST /api/memberships/:id/points/redeem` - ポイント使用
- `POST /api/memberships/:id/points/adjust` - ポイント調整
- `GET /api/points/expiring` - 失効予定ポイント取得

#### セグメントAPI
- `GET /api/segments` - セグメント一覧取得
- `GET /api/segments/:id` - セグメント詳細取得
- `POST /api/segments` - セグメント作成
- `PUT /api/segments/:id` - セグメント更新
- `DELETE /api/segments/:id` - セグメント削除
- `GET /api/segments/:id/customers` - セグメント顧客取得
- `POST /api/segments/:id/run` - セグメント実行

#### キャンペーンAPI
- `GET /api/campaigns` - キャンペーン一覧取得
- `GET /api/campaigns/:id` - キャンペーン詳細取得
- `POST /api/campaigns` - キャンペーン作成
- `PUT /api/campaigns/:id` - キャンペーン更新
- `DELETE /api/campaigns/:id` - キャンペーン削除
- `POST /api/campaigns/:id/activate` - キャンペーン有効化
- `POST /api/campaigns/:id/deactivate` - キャンペーン無効化

## イベント連携

### 発行イベント
| イベント名 | 説明 | ペイロード |
|------------|------|----------|
| customer.created | 顧客作成 | { customerId, name, email, phone, ... } |
| customer.updated | 顧客情報更新 | { customerId, changes, ... } |
| member.registered | 会員登録 | { customerId, membershipId, level, ... } |
| member.status_changed | 会員ステータス変更 | { customerId, oldStatus, newStatus, reason } |
| points.added | ポイント追加 | { customerId, points, reason, balance } |
| points.used | ポイント使用 | { customerId, points, reason, balance } |

### 購読イベント
| イベント名 | 説明 | 処理内容 |
|------------|------|----------|
| reservation.created | 予約作成 | 顧客情報更新、ポイント予約 |
| reservation.canceled | 予約キャンセル | ポイント予約キャンセル |
| checkin_checkout.checked_in | チェックイン | 顧客ステータス更新 |
| checkin_checkout.checked_out | チェックアウト | ポイント付与、顧客履歴更新 |
| billing.paid | 請求支払完了 | ポイント付与、顧客支出履歴更新 |
| feedback.submitted | フィードバック送信 | 顧客フィードバック記録 |

## セキュリティ設計

### 認証・認可
- JWT認証（hotel-common統一基盤）
- ロールベースアクセス制御
  - ADMIN: 全権限
  - MANAGER: 管理権限
  - STAFF: 限定権限
  - READONLY: 参照のみ権限

### データ保護
- 個人情報の暗号化
  - メールアドレス、電話番号、住所等の機密情報
  - AES-256暗号化
- 転送時の暗号化（TLS 1.3）
- 保存時の暗号化（機密情報）
- データマスキング（ログ・表示時）

### アクセス制御
- テナント分離（tenant_id必須）
- 最小権限の原則
- アクセスログ記録
- 監査証跡

## パフォーマンス最適化

### データベース最適化
- インデックス最適化
- クエリキャッシュ
- 読み取り/書き込み分離
- バッチ処理の最適化

### アプリケーション最適化
- API応答キャッシュ
- N+1問題の回避
- 非同期処理
- バックグラウンドジョブ

### フロントエンド最適化
- コンポーネントの遅延ローディング
- 仮想スクロール
- 画像最適化
- バンドルサイズ最適化

## 監視・ロギング

### メトリクス
- API応答時間
- エラー率
- アクティブユーザー数
- リソース使用率

### ログ
- エラーログ
- アクセスログ
- 監査ログ
- パフォーマンスログ

### アラート
- サービス停止
- 異常なエラー率
- セキュリティ違反
- リソース枯渇

## テスト要件

### 単体テスト
- フレームワーク: pytest / Vitest
- カバレッジ目標: 90%以上

### 統合テスト
- フレームワーク: pytest / Jest
- API統合テスト
- サービス間連携テスト

### E2Eテスト
- フレームワーク: Cypress
- 主要ユーザーフロー:
  - 顧客登録〜会員登録〜ポイント付与
  - セグメント作成〜顧客抽出
  - キャンペーン作成〜実行

### セキュリティテスト
- 認証バイパステスト
- 権限昇格テスト
- SQLインジェクションテスト
- XSSテスト
- CSRFテスト

## 関連ドキュメント
- [システム概要](./overview.md)
- [UI/UX設計](./ui-ux-design.md)
- [ディレクトリ構造](./directory-structure.md)
- [開発ガイドライン](../../development/guidelines/member-guidelines.md)
- [イベント連携](../../integration/events/member-events.md)