# Google Playアプリ選択機能 統合ガイド

## 概要

Google Playアプリ選択機能は、ホテルの客室TVシステムで利用可能なアプリを管理するための機能です。この機能は以下のコンポーネントで構成されています：

1. **管理者用インターフェース** - アプリの登録、編集、承認
2. **場所別設定** - 客室ごとのアプリ設定
3. **レイアウト統合** - レイアウトブロックとの連携
4. **クライアント表示** - TVシステム上での表示と起動

## システム構成

### データベース構造

この機能は以下のテーブルを使用します：

#### GooglePlayApp

アプリの基本情報を管理するテーブル

```prisma
model GooglePlayApp {
  id          String    @id @default(uuid())
  packageName String     @unique
  displayName String
  description String?
  iconUrl     String?
  category    String
  deepLinkUrl String?
  isEnabled   Boolean   @default(false)
  priority    Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  hotelApps   HotelApp[]
}
```

#### HotelApp

特定の場所（客室など）に対するアプリの設定を管理するテーブル

```prisma
model HotelApp {
  id          String    @id @default(uuid())
  placeId     Int
  appId       String
  customLabel String?
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  app         GooglePlayApp @relation(fields: [appId], references: [id])
}
```

#### LayoutAppBlock

レイアウトブロック別のアプリ設定を管理するテーブル

```prisma
model LayoutAppBlock {
  id             String    @id @default(uuid())
  layoutId       String
  blockId        String
  selectedApps   Json      // アプリIDの配列
  layout         String    @default("grid")  // grid, list, carousel
  showAppNames   Boolean   @default(true)
  showDescriptions Boolean @default(false)
  maxAppsDisplay Int       @default(8)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

### API構造

#### 管理者用API

- `GET /api/apps/google-play` - アプリ一覧取得
- `GET /api/apps/google-play/:id` - アプリ詳細取得
- `POST /api/apps/google-play` - アプリ登録
- `PUT /api/apps/google-play/:id` - アプリ更新
- `PATCH /api/apps/google-play/:id/approve` - アプリ承認/非承認

#### 場所別アプリ設定API

- `GET /api/places/:placeId/apps` - 場所別アプリ一覧取得
- `POST /api/places/:placeId/apps` - 場所別アプリ追加
- `PUT /api/places/:placeId/apps/:appId` - 場所別アプリ更新
- `DELETE /api/places/:placeId/apps/:appId` - 場所別アプリ削除

#### レイアウトブロック別アプリAPI

- `GET /api/layouts/:layoutId/blocks/:blockId/apps` - レイアウトブロック別アプリ設定取得
- `PUT /api/layouts/:layoutId/blocks/:blockId/apps` - レイアウトブロック別アプリ設定更新

#### クライアント用API

- `GET /api/client/places/:placeId/apps` - 利用可能アプリ一覧取得

## 実装詳細

### フロントエンド実装

#### 管理者ページ

1. **アプリ一覧ページ** (`pages/admin/content/google-play-apps.vue`)
   - アプリの一覧表示、検索、フィルタリング
   - 新規アプリの追加、編集、承認/非承認

2. **アプリ追加モーダル** (`components/admin/content/AddAppModal.vue`)
   - 新規アプリの登録フォーム

3. **アプリ編集モーダル** (`components/admin/content/EditAppModal.vue`)
   - 既存アプリの編集フォーム

4. **場所別アプリ設定ページ** (`pages/admin/content/place-apps/[placeId].vue`)
   - 特定の場所に対するアプリの設定

5. **レイアウトブロック設定コンポーネント** (`components/admin/layouts/AppBlockSettings.vue`)
   - レイアウトブロックのアプリ設定

#### クライアントページ

1. **アプリランチャーコンポーネント** (`components/client/GooglePlayAppLauncher.vue`)
   - アプリ一覧の表示と起動機能

2. **アプリ一覧ページ** (`pages/client/tv/apps.vue`)
   - 全画面アプリ一覧表示

### バックエンド実装

#### API実装

1. **アプリ管理API** (`server/api/apps/google-play/...`)
   - アプリのCRUD操作

2. **場所別アプリAPI** (`server/api/places/:placeId/apps/...`)
   - 場所ごとのアプリ設定

3. **レイアウトブロックAPI** (`server/api/layouts/:layoutId/blocks/:blockId/apps/...`)
   - レイアウトブロックごとのアプリ設定

4. **クライアントAPI** (`server/api/client/places/:placeId/apps.get.ts`)
   - クライアント用のアプリ取得

## 認証とセキュリティ

- 管理者用APIは`verifyAdminAuth`ミドルウェアで保護
- クライアント用APIは`verifyTenantAuth`ミドルウェアで保護
- 認証トークンはリクエストヘッダーに含める必要あり: `Authorization: Bearer <token>`

## 統合手順

1. データベースマイグレーションの実行
2. APIエンドポイントの実装
3. 管理者用インターフェースの実装
4. クライアント表示コンポーネントの実装
5. レイアウトエディタとの統合

## 注意事項

- アプリのパッケージ名は一意である必要があります
- アプリアイコンは外部URLから取得します
- Android TVでのアプリ起動にはネイティブブリッジが必要です
- パフォーマンス向上のため、クライアント側ではアプリ情報をキャッシュします

## 将来の拡張計画

1. **Google Play API連携** - Google Play Storeから直接アプリ情報を取得
2. **アプリ使用統計** - アプリの起動回数や使用時間の分析
3. **カスタムアプリ** - ホテル独自のアプリの登録と管理
4. **アプリグループ** - 関連アプリのグループ化と一括管理
