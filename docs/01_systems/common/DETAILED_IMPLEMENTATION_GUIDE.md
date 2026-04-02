=== hotel-common 詳細実装ガイド ===

【対象】hotel-commonチーム
【作成日】2025年9月29日
【前提】IMPLEMENTATION_CLARIFICATION_RESPONSE.md の回答に基づく

【実装対象ファイル】
- 主要: `/Users/kaneko/hotel-common/src/routes/api/v1/orders/index.ts`
- 補助: `/Users/kaneko/hotel-common/src/routes/api/v1/sessions/index.ts`
- テスト: `/Users/kaneko/hotel-common/src/__tests__/orders-api.test.ts`

【Phase 1: 既存実装の修正】

## 1-1. Prismaクライアント修正

**現在の問題**:
```typescript
// 問題のあるコード
import { PrismaClient } from '../../../generated/prisma';
const prisma = new PrismaClient();
```

**修正後**:
```typescript
// 正しいコード
import { hotelDb } from '../../../database/prisma';

// 使用例
const order = await hotelDb.order.create({
  data: {
    tenantId: req.user.tenantId,
    roomId: sessionId ? session.room_id : roomId,
    sessionId: sessionId,
    status: 'received',
    items: JSON.stringify(items),
    total: total,
    updatedAt: new Date()
  }
});
```

## 1-2. レスポンス形式統一

**修正対象**: 全てのAPI レスポンス

**Before**:
```typescript
res.status(201).json({
  success: true,
  data: order
});
```

**After**:
```typescript
import { StandardResponseBuilder } from '../../../utils/response-builder';

res.status(201).json(
  StandardResponseBuilder.success(order, 'Order created successfully')
);
```

## 1-3. エラーハンドリング強化

**修正対象**: 全てのtry-catchブロック

**Before**:
```typescript
} catch (error: any) {
  console.error('注文作成エラー:', error);
  res.status(500).json({
    success: false,
    error: '注文作成に失敗しました',
    details: error.message
  });
}
```

**After**:
```typescript
} catch (error: any) {
  const traceId = `order_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 構造化ログ出力
  console.error(`[${traceId}] Order creation failed:`, {
    error: error.message,
    stack: error.stack,
    requestBody: req.body,
    userId: req.user?.userId,
    tenantId: req.user?.tenantId,
    timestamp: new Date().toISOString()
  });
  
  // 標準エラーレスポンス
  res.status(500).json(
    StandardResponseBuilder.error(
      '注文作成に失敗しました',
      process.env.NODE_ENV === 'development' ? error.message : undefined,
      traceId
    )
  );
}
```

【Phase 2: 機能追加実装】

## 2-1. 注文一覧取得API追加

**新規エンドポイント**: `GET /api/v1/orders`

```typescript
/**
 * GET /api/v1/orders - 注文一覧取得（管理者・スタッフ用）
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      roomId, 
      sessionId,
      startDate,
      endDate 
    } = req.query;
    
    // 権限チェック
    if (!['admin', 'staff', 'manager'].includes(req.user.role)) {
      return res.status(403).json(
        StandardResponseBuilder.error('権限がありません')
      );
    }
    
    // クエリ条件構築
    const where: any = {
      tenantId: req.user.tenantId,
      isDeleted: false
    };
    
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (sessionId) where.sessionId = sessionId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    
    // ページネーション計算
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
    
    // データ取得
    const [orders, totalCount] = await Promise.all([
      hotelDb.order.findMany({
        where,
        include: {
          OrderItem: {
            where: { is_deleted: false }
          },
          session: {
            select: {
              id: true,
              session_number: true,
              guest_info: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      hotelDb.order.count({ where })
    ]);
    
    // レスポンス構築
    const response = {
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    };
    
    res.json(
      StandardResponseBuilder.success(response, 'Orders retrieved successfully')
    );
    
  } catch (error: any) {
    const traceId = `orders_list_error_${Date.now()}`;
    console.error(`[${traceId}] Orders list retrieval failed:`, error);
    
    res.status(500).json(
      StandardResponseBuilder.error(
        '注文一覧取得に失敗しました',
        process.env.NODE_ENV === 'development' ? error.message : undefined,
        traceId
      )
    );
  }
});
```

## 2-2. 注文削除API追加（論理削除）

**新規エンドポイント**: `DELETE /api/v1/orders/:id`

```typescript
/**
 * DELETE /api/v1/orders/:id - 注文削除（論理削除）
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // 権限チェック
    if (!['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json(
        StandardResponseBuilder.error('削除権限がありません')
      );
    }
    
    // 注文存在確認
    const existingOrder = await hotelDb.order.findFirst({
      where: {
        id: parseInt(id),
        tenantId: req.user.tenantId,
        isDeleted: false
      }
    });
    
    if (!existingOrder) {
      return res.status(404).json(
        StandardResponseBuilder.error('注文が見つかりません')
      );
    }
    
    // 削除可能状態チェック
    if (['completed', 'delivered'].includes(existingOrder.status)) {
      return res.status(400).json(
        StandardResponseBuilder.error('完了済みの注文は削除できません')
      );
    }
    
    // 論理削除実行
    const deletedOrder = await hotelDb.$transaction(async (tx) => {
      // 注文を論理削除
      const order = await tx.order.update({
        where: { id: parseInt(id) },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          status: 'cancelled',
          updatedAt: new Date()
        }
      });
      
      // 注文アイテムも論理削除
      await tx.orderItem.updateMany({
        where: { orderId: parseInt(id) },
        data: {
          is_deleted: true,
          deleted_at: new Date(),
          deleted_by: req.user.userId,
          updatedAt: new Date()
        }
      });
      
      return order;
    });
    
    // 削除ログ記録
    console.log(`Order deleted: ${id} by ${req.user.userId}, reason: ${reason || 'Not specified'}`);
    
    res.json(
      StandardResponseBuilder.success(
        { id: deletedOrder.id, status: deletedOrder.status },
        'Order deleted successfully'
      )
    );
    
  } catch (error: any) {
    const traceId = `order_delete_error_${Date.now()}`;
    console.error(`[${traceId}] Order deletion failed:`, error);
    
    res.status(500).json(
      StandardResponseBuilder.error(
        '注文削除に失敗しました',
        process.env.NODE_ENV === 'development' ? error.message : undefined,
        traceId
      )
    );
  }
});
```

【Phase 3: WebSocket通知機能】

## 3-1. WebSocket通知サービス統合

```typescript
// WebSocket通知用インポート
import { NotificationService } from '../../../notifications/notification-service';

// 注文作成後の通知
const notifyOrderCreated = async (order: any) => {
  try {
    const notificationService = NotificationService.getInstance();
    
    // 管理者・キッチンスタッフに通知
    await notificationService.broadcast({
      type: 'ORDER_CREATED',
      tenantId: order.tenantId,
      data: {
        orderId: order.id,
        roomId: order.roomId,
        sessionId: order.sessionId,
        total: order.total,
        itemCount: JSON.parse(order.items).length,
        timestamp: new Date().toISOString()
      },
      recipients: ['admin', 'kitchen', 'manager']
    });
    
    console.log(`WebSocket notification sent for order: ${order.id}`);
  } catch (error) {
    console.warn('WebSocket notification failed:', error);
    // 通知失敗は注文作成の成功を阻害しない
  }
};

// 注文ステータス更新後の通知
const notifyOrderStatusUpdate = async (order: any, oldStatus: string) => {
  try {
    const notificationService = NotificationService.getInstance();
    
    await notificationService.broadcast({
      type: 'ORDER_STATUS_UPDATED',
      tenantId: order.tenantId,
      data: {
        orderId: order.id,
        roomId: order.roomId,
        sessionId: order.sessionId,
        oldStatus,
        newStatus: order.status,
        timestamp: new Date().toISOString()
      },
      recipients: ['admin', 'staff', 'room'] // 客室にも通知
    });
    
  } catch (error) {
    console.warn('Status update notification failed:', error);
  }
};
```

【Phase 4: テスト実装】

## 4-1. 単体テストファイル作成

**ファイル**: `/Users/kaneko/hotel-common/src/__tests__/orders-api.test.ts`

```typescript
import request from 'supertest';
import { app } from '../server/integration-server';
import { hotelDb } from '../database/prisma';

describe('Orders API', () => {
  let authToken: string;
  let testTenantId: string;
  let testSessionId: string;

  beforeAll(async () => {
    // テスト用認証トークン取得
    authToken = 'test-jwt-token';
    testTenantId = 'test-tenant-id';
    
    // テスト用セッション作成
    const session = await hotelDb.checkin_sessions.create({
      data: {
        id: 'test-session-id',
        tenant_id: testTenantId,
        room_id: '101',
        session_number: '101-20250929-001',
        guest_info: JSON.stringify({ primary: { name: 'Test Guest' } }),
        check_in_at: new Date(),
        planned_check_out: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    testSessionId = session.id;
  });

  afterAll(async () => {
    // テストデータクリーンアップ
    await hotelDb.orderItem.deleteMany({
      where: { tenantId: testTenantId }
    });
    await hotelDb.order.deleteMany({
      where: { tenantId: testTenantId }
    });
    await hotelDb.checkin_sessions.deleteMany({
      where: { tenant_id: testTenantId }
    });
  });

  describe('POST /api/v1/orders', () => {
    test('正常系: セッションIDでの注文作成', async () => {
      const orderData = {
        sessionId: testSessionId,
        items: [
          {
            menuItemId: 1,
            name: 'テスト商品',
            price: 1000,
            quantity: 2,
            notes: 'テスト用'
          }
        ],
        notes: '特記事項'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.total).toBe(2000);
      expect(response.body.data.sessionId).toBe(testSessionId);
    });

    test('異常系: 認証エラー', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .send({ items: [] })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('異常系: 不正なリクエスト', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ items: [] })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('アイテム');
    });
  });

  describe('GET /api/v1/orders/by-session/:sessionId', () => {
    test('正常系: セッション別注文取得', async () => {
      const response = await request(app)
        .get(`/api/v1/orders/by-session/${testSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});
```

【実装チェックリスト】

**Phase 1: 基本修正**
□ Prismaクライアント修正完了
□ レスポンス形式統一完了
□ エラーハンドリング強化完了
□ 既存機能動作確認完了

**Phase 2: 機能追加**
□ 注文一覧取得API実装完了
□ 注文削除API実装完了
□ 権限チェック機能実装完了
□ ページネーション機能実装完了

**Phase 3: 通知機能**
□ WebSocket通知統合完了
□ 注文作成通知実装完了
□ ステータス更新通知実装完了

**Phase 4: テスト**
□ 単体テスト実装完了
□ 統合テスト実行完了
□ カバレッジ80%以上達成
□ hotel-saas連携テスト成功

作成者: システム設計担当
対象: hotel-commonチーム

