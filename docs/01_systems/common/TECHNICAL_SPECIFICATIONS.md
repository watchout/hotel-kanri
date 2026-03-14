=== hotel-common 技術仕様書 ===

【対象】hotel-commonチーム
【種別】技術仕様・設計書
【作成日】2025年9月29日

【システム概要】
hotel-commonは統一データベース・API基盤として、hotel-saas、hotel-pmsからの
注文管理・セッション管理リクエストを処理する。

【データベース設計】

**1. checkin_sessions テーブル**
```sql
-- 既存テーブル（確認済み）
model checkin_sessions {
  id                String    @id
  tenant_id         String
  session_number    String    @unique
  reservation_id    String?
  room_id           String
  guest_info        Json
  adults            Int       @default(1)
  children          Int       @default(0)
  check_in_at       DateTime
  check_out_at      DateTime?
  planned_check_out DateTime
  status            String    @default("ACTIVE")
  special_requests  String?
  notes             String?
  created_at        DateTime  @default(now())
  updated_at        DateTime
  
  // リレーション
  orders            Order[]

  @@index([check_in_at])
  @@index([room_id])
  @@index([session_number])
  @@index([status])
  @@index([tenant_id])
}
```

**2. Order テーブル**
```sql
-- 既存テーブル（外部キー制約設定済み）
model Order {
  id        Int         @id @default(autoincrement())
  tenantId  String
  roomId    String
  placeId   Int?
  status    String      @default("received")
  items     Json
  total     Int
  createdAt DateTime    @default(now())
  updatedAt DateTime
  paidAt    DateTime?
  isDeleted Boolean     @default(false)
  deletedAt DateTime?
  sessionId String?
  uuid      String?     @unique
  
  // リレーション（設定済み）
  session   checkin_sessions? @relation(fields: [sessionId], references: [id])
  OrderItem OrderItem[]

  @@index([createdAt])
  @@index([isDeleted, paidAt])
  @@index([sessionId])
  @@index([status])
  @@index([tenantId])
}
```

**3. OrderItem テーブル**
```sql
-- 既存テーブル
model OrderItem {
  id          Int       @id @default(autoincrement())
  tenantId    String
  orderId     Int
  menuItemId  Int
  name        String
  price       Int
  quantity    Int
  status      String    @default("pending")
  notes       String?
  deliveredAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime
  deleted_at  DateTime?
  deleted_by  String?
  is_deleted  Boolean   @default(false)
  Order       Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([is_deleted])
  @@index([orderId])
  @@index([status])
  @@index([tenantId])
}
```

【API設計仕様】

**1. 注文管理API**

**POST /api/v1/orders**
- 目的: 新規注文作成
- 認証: 必須 (authenticateToken middleware)
- リクエスト形式:
```typescript
interface CreateOrderRequest {
  sessionId?: string;        // セッションID（推奨）
  roomId?: string;          // 部屋ID（sessionIdがない場合必須）
  items: OrderItem[];       // 注文アイテム配列
  notes?: string;           // 特記事項
}

interface OrderItem {
  menuItemId: number;       // メニューアイテムID
  name: string;            // アイテム名
  price: number;           // 単価
  quantity: number;        // 数量
  notes?: string;          // アイテム別特記事項
}
```

- レスポンス形式:
```typescript
interface CreateOrderResponse {
  success: boolean;
  data: {
    id: number;
    tenantId: string;
    roomId: string;
    sessionId?: string;
    status: string;
    total: number;
    createdAt: string;
  };
}
```

**GET /api/v1/orders/by-session/:sessionId**
- 目的: セッション別注文取得
- 認証: 必須
- パラメータ: sessionId (string)

**GET /api/v1/orders/by-room/:roomId**
- 目的: 部屋別注文取得
- 認証: 必須
- パラメータ: roomId (string)

**PUT /api/v1/orders/:id/status**
- 目的: 注文ステータス更新
- 認証: 必須
- リクエスト: { "status": "cooking|ready|delivering|completed" }

**2. セッション管理API**

**POST /api/v1/sessions**
- 目的: 新規チェックインセッション作成
- 認証: 必須
- リクエスト形式:
```typescript
interface CreateSessionRequest {
  roomId: string;                    // 部屋ID
  primaryGuestName: string;          // 主宿泊者名
  primaryGuestEmail?: string;        // 主宿泊者メール
  primaryGuestPhone?: string;        // 主宿泊者電話
  guestCount?: number;              // 宿泊者数（デフォルト: 1）
  checkedInAt: string;              // チェックイン時刻（ISO string）
  expectedCheckOut: string;         // 予定チェックアウト時刻
  notes?: string;                   // 備考
  specialRequests?: string;         // 特別リクエスト
}
```

**GET /api/v1/sessions/by-room/:roomId**
- 目的: 部屋別アクティブセッション取得
- 認証: 必須
- パラメータ: roomId (string)

**GET /api/v1/sessions/:id**
- 目的: セッション詳細取得
- 認証: 必須
- パラメータ: id (string)

**PUT /api/v1/sessions/:id/checkout**
- 目的: チェックアウト処理
- 認証: 必須
- リクエスト: { "checkOutAt": "ISO string (optional)" }

【認証・セキュリティ仕様】

**1. JWT認証**
- ミドルウェア: `authenticateToken` (既存)
- 場所: `/Users/kaneko/hotel-common/src/auth/middleware.ts`
- 要求ヘッダー:
  - `Authorization: Bearer {token}`
  - `X-Tenant-ID: {tenantId}` (必要に応じて)

**2. テナント分離**
- 全てのデータアクセスでtenantIdによる分離
- クロステナントアクセス防止

**3. 入力検証**
- 必須フィールドの存在確認
- データ型・形式の検証
- SQLインジェクション対策（Prisma使用）

【エラーハンドリング仕様】

**1. 標準エラーレスポンス**
```typescript
interface ErrorResponse {
  success: false;
  error: string;        // ユーザー向けエラーメッセージ
  details?: string;     // 開発者向け詳細情報
  errorId?: string;     // エラー追跡ID
}
```

**2. HTTPステータスコード**
- 200: 成功
- 201: 作成成功
- 400: 不正なリクエスト
- 401: 認証エラー
- 404: リソースが見つからない
- 500: 内部サーバーエラー

**3. ログ出力**
- HotelLogger使用
- エラー発生時の詳細ログ
- トランザクションIDによる追跡

【パフォーマンス仕様】

**1. データベース**
- 適切なインデックス設定済み
- トランザクション使用（30秒タイムアウト）
- ReadCommitted分離レベル

**2. API応答時間**
- 目標: 95%のリクエストが500ms以内
- タイムアウト: 30秒

【統合仕様】

**1. hotel-saas連携**
- ベースURL: http://localhost:3400 (開発環境)
- CORS設定: hotel-saasからのアクセス許可
- 認証: JWT Bearer Token

**2. WebSocket通知**
- 注文作成時の通知（実装予定）
- ステータス更新時の通知（実装予定）

【開発・テスト仕様】

**1. 開発環境**
- Node.js + TypeScript
- Express.js + Prisma
- Jest (テストフレームワーク)

**2. テスト要件**
- 単体テスト: 各API関数
- 統合テスト: API エンドポイント
- カバレッジ: 80%以上

**3. 品質保証**
- TypeScript型チェック
- ESLint静的解析
- Prettier コード整形

作成者: システム設計担当
承認者: hotel-commonチームリーダー
更新日: 2025年9月29日

