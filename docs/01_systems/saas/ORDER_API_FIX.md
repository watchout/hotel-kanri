# オーダー作成API修正仕様書

## 概要

hotel-commonにオーダー作成API（`POST /api/v1/orders`）が実装されていないため、新規に実装する必要があります。このAPIは、hotel-saasからのオーダー作成リクエストを処理し、統合データベースに保存する役割を担います。

## API仕様

### エンドポイント

```
POST /api/v1/orders
```

### 認証要件

このAPIは認証が必要です。リクエストには以下のヘッダーが必要です：

```
Authorization: Bearer {JWT_TOKEN}
```

### リクエストボディ

```json
{
  "roomId": "room-101",
  "items": [
    {
      "menuId": "menu-001",
      "name": "ハンバーガー",
      "price": 1500,
      "quantity": 2,
      "options": [
        {
          "id": "option-001",
          "name": "チーズ追加",
          "price": 200
        }
      ]
    },
    {
      "menuId": "menu-002",
      "name": "フライドポテト",
      "price": 500,
      "quantity": 1,
      "options": []
    }
  ],
  "specialInstructions": "ケチャップ多めでお願いします",
  "paymentMethod": "room-charge",
  "deviceId": "device-001",
  "source": "room-tablet"
}
```

### レスポンス形式

```json
{
  "success": true,
  "order": {
    "id": "order-001",
    "roomId": "room-101",
    "status": "pending",
    "totalAmount": 3700,
    "createdAt": "2025-08-01T12:00:00.000Z",
    "updatedAt": "2025-08-01T12:00:00.000Z",
    "items": [
      {
        "id": "item-001",
        "menuId": "menu-001",
        "name": "ハンバーガー",
        "price": 1500,
        "quantity": 2,
        "totalPrice": 3000,
        "options": [
          {
            "id": "option-001",
            "name": "チーズ追加",
            "price": 200
          }
        ]
      },
      {
        "id": "item-002",
        "menuId": "menu-002",
        "name": "フライドポテト",
        "price": 500,
        "quantity": 1,
        "totalPrice": 500,
        "options": []
      }
    ],
    "specialInstructions": "ケチャップ多めでお願いします",
    "paymentMethod": "room-charge",
    "deviceId": "device-001",
    "source": "room-tablet"
  }
}
```

## 実装方法

### 1. モデルの確認

以下のモデルがPrismaスキーマに存在することを確認します：

- `Order`
- `OrderItem`
- `OrderItemOption`

存在しない場合は、以下のようなスキーマを追加します：

```prisma
model Order {
  id                String      @id @default(uuid())
  roomId            String
  status            String      @default("pending")
  totalAmount       Float
  specialInstructions String?
  paymentMethod     String
  deviceId          String?
  source            String?
  items             OrderItem[]
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
}

model OrderItem {
  id                String            @id @default(uuid())
  orderId           String
  menuId            String
  name              String
  price             Float
  quantity          Int
  totalPrice        Float
  options           OrderItemOption[]
  order             Order             @relation(fields: [orderId], references: [id])
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
}

model OrderItemOption {
  id                String    @id @default(uuid())
  orderItemId       String
  optionId          String
  name              String
  price             Float
  orderItem         OrderItem @relation(fields: [orderItemId], references: [id])
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

### 2. APIエンドポイントの実装

`/Users/kaneko/hotel-common/src/server/integration-server-extended.ts`に以下のコードを追加します：

```typescript
// オーダー作成
this.app.post('/api/v1/orders', async (req, res) => {
  try {
    // リクエストボディのバリデーション
    const { roomId, items, specialInstructions, paymentMethod, deviceId, source } = req.body;

    // 必須パラメータのチェック
    if (!roomId) {
      return res.status(400).json({ success: false, error: '部屋IDは必須です' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: '少なくとも1つのアイテムが必要です' });
    }

    if (!paymentMethod) {
      return res.status(400).json({ success: false, error: '支払い方法は必須です' });
    }

    // 合計金額の計算
    let totalAmount = 0;

    // トランザクション開始
    const order = await this.prisma.$transaction(async (prisma) => {
      // オーダーの作成
      const order = await prisma.order.create({
        data: {
          roomId,
          status: 'pending',
          totalAmount: 0, // 仮の値（後で更新）
          specialInstructions: specialInstructions || '',
          paymentMethod,
          deviceId: deviceId || null,
          source: source || null,
        },
      });

      // オーダーアイテムの作成
      for (const item of items) {
        const { menuId, name, price, quantity, options } = item;

        // アイテムの合計金額
        const itemTotalPrice = price * quantity;
        totalAmount += itemTotalPrice;

        // オーダーアイテムの作成
        const orderItem = await prisma.orderItem.create({
          data: {
            orderId: order.id,
            menuId,
            name,
            price,
            quantity,
            totalPrice: itemTotalPrice,
          },
        });

        // オプションがある場合は作成
        if (options && Array.isArray(options)) {
          for (const option of options) {
            const { id: optionId, name: optionName, price: optionPrice } = option;

            await prisma.orderItemOption.create({
              data: {
                orderItemId: orderItem.id,
                optionId,
                name: optionName,
                price: optionPrice,
              },
            });

            // オプション価格を合計に加算
            totalAmount += optionPrice;
          }
        }
      }

      // 合計金額を更新
      return prisma.order.update({
        where: { id: order.id },
        data: { totalAmount },
        include: {
          items: {
            include: {
              options: true,
            },
          },
        },
      });
    });

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ success: false, error: 'オーダーの作成中にエラーが発生しました' });
  }
});
```

### 3. オーダー履歴APIの実装

オーダー履歴を取得するAPIも実装します：

```typescript
// オーダー履歴
this.app.get('/api/v1/orders/history', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, from, to, roomId } = req.query;

    // 部屋IDは必須
    if (!roomId) {
      return res.status(400).json({ success: false, error: '部屋番号が必要です' });
    }

    // フィルター条件の構築
    const where: any = {
      roomId: roomId as string,
    };

    // ステータスでフィルタリング
    if (status) {
      where.status = status;
    }

    // 日付範囲でフィルタリング
    if (from || to) {
      where.createdAt = {};

      if (from) {
        where.createdAt.gte = new Date(from as string);
      }

      if (to) {
        where.createdAt.lte = new Date(to as string);
      }
    }

    // ページネーションの計算
    const pageNumber = parseInt(page as string, 10);
    const pageSize = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * pageSize;

    // オーダーの取得
    const [orders, totalCount] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              options: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    // ページネーション情報
    const totalPages = Math.ceil(totalCount / pageSize);

    return res.json({
      success: true,
      orders,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        totalItems: totalCount,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    return res.status(500).json({ success: false, error: 'オーダー履歴の取得中にエラーが発生しました' });
  }
});
```

## 実装手順

1. hotel-commonリポジトリをクローンまたは更新
2. `schema.prisma`ファイルを確認し、必要なモデルが存在するか確認
3. 存在しない場合は、モデルを追加してマイグレーションを実行
4. 上記のAPIコードを実装
5. サーバーを再起動
6. APIをテストして正常に動作することを確認

## テスト方法

### オーダー作成APIのテスト

```bash
curl -X POST "http://localhost:3400/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -d '{
    "roomId": "room-101",
    "items": [
      {
        "menuId": "menu-001",
        "name": "ハンバーガー",
        "price": 1500,
        "quantity": 2,
        "options": [
          {
            "id": "option-001",
            "name": "チーズ追加",
            "price": 200
          }
        ]
      }
    ],
    "paymentMethod": "room-charge"
  }'
```

### オーダー履歴APIのテスト

```bash
curl "http://localhost:3400/api/v1/orders/history?roomId=room-101&page=1&limit=10&status=completed"
```

## 注意事項

- トランザクションを使用して、オーダーとアイテムの作成が原子的に行われるようにしてください
- 認証とアクセス制御を適切に実装してください
- エラーハンドリングを適切に行い、クライアントに分かりやすいエラーメッセージを返してください
- パフォーマンスを考慮して、必要に応じてインデックスを追加してください
