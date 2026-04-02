# hotel-pms イベント連携

hotel-pmsシステムは、他システムとの連携のためにイベントを発行・購読します。このドキュメントでは、hotel-pmsが発行および購読するイベントについて定義します。

## 発行イベント

hotel-pmsシステムは以下のイベントを発行します。

### reservation.created

予約が作成された時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "reservation.created",
  "version": "1.0",
  "timestamp": "2023-01-01T12:00:00Z",
  "data": {
    "reservationId": "res_12345",
    "customerId": "cust_6789",
    "roomId": "room_101",
    "roomTypeId": "rt_deluxe",
    "checkInDate": "2023-01-15T15:00:00Z",
    "checkOutDate": "2023-01-17T11:00:00Z",
    "adults": 2,
    "children": 1,
    "totalAmount": 30000,
    "currency": "JPY",
    "status": "CONFIRMED",
    "origin": "MEMBER",
    "specialRequests": "アレルギー対応の枕希望",
    "createdAt": "2023-01-01T12:00:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-pms",
    "correlationId": "corr_abc123",
    "userId": "user_staff1",
    "traceId": "trace_xyz789"
  }
}
```

#### 購読システム
- hotel-member: 予約履歴の更新、ポイント付与
- hotel-saas: 顧客体験パーソナライズ

### reservation.updated

予約が更新された時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "reservation.updated",
  "version": "1.0",
  "timestamp": "2023-01-02T09:30:00Z",
  "data": {
    "reservationId": "res_12345",
    "changes": {
      "checkInDate": {
        "old": "2023-01-15T15:00:00Z",
        "new": "2023-01-16T15:00:00Z"
      },
      "checkOutDate": {
        "old": "2023-01-17T11:00:00Z",
        "new": "2023-01-18T11:00:00Z"
      },
      "totalAmount": {
        "old": 30000,
        "new": 45000
      }
    },
    "status": "CONFIRMED",
    "updatedAt": "2023-01-02T09:30:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-pms",
    "correlationId": "corr_def456",
    "userId": "user_staff1",
    "traceId": "trace_abc123"
  }
}
```

#### 購読システム
- hotel-member: 予約履歴の更新
- hotel-saas: 顧客体験パーソナライズ更新

### reservation.canceled

予約がキャンセルされた時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "reservation.canceled",
  "version": "1.0",
  "timestamp": "2023-01-03T14:15:00Z",
  "data": {
    "reservationId": "res_12345",
    "reason": "顧客都合",
    "cancellationFee": 5000,
    "refundAmount": 25000,
    "status": "CANCELED",
    "canceledAt": "2023-01-03T14:15:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-pms",
    "correlationId": "corr_ghi789",
    "userId": "user_staff2",
    "traceId": "trace_def456"
  }
}
```

#### 購読システム
- hotel-member: 予約履歴の更新、キャンセルポリシー適用
- hotel-saas: 予約関連通知の停止

### checkin_checkout.checked_in

チェックインが完了した時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "checkin_checkout.checked_in",
  "version": "1.0",
  "timestamp": "2023-01-15T15:30:00Z",
  "data": {
    "reservationId": "res_12345",
    "customerId": "cust_6789",
    "roomId": "room_101",
    "roomNumber": "101",
    "checkInTime": "2023-01-15T15:30:00Z",
    "expectedCheckOutDate": "2023-01-17T11:00:00Z",
    "guestCount": {
      "adults": 2,
      "children": 1
    },
    "keyIssued": true,
    "specialRequests": "アレルギー対応の枕希望"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-pms",
    "correlationId": "corr_jkl012",
    "userId": "user_staff3",
    "traceId": "trace_ghi789"
  }
}
```

#### 購読システム
- hotel-saas: ウェルカムメッセージ送信、客室サービス有効化
- hotel-member: 滞在ステータス更新

### checkin_checkout.checked_out

チェックアウトが完了した時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "checkin_checkout.checked_out",
  "version": "1.0",
  "timestamp": "2023-01-17T10:45:00Z",
  "data": {
    "reservationId": "res_12345",
    "customerId": "cust_6789",
    "roomId": "room_101",
    "roomNumber": "101",
    "checkOutTime": "2023-01-17T10:45:00Z",
    "actualStayDuration": {
      "nights": 2,
      "hours": 19,
      "minutes": 15
    },
    "keyReturned": true,
    "roomStatus": "DIRTY"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-pms",
    "correlationId": "corr_mno345",
    "userId": "user_staff3",
    "traceId": "trace_jkl012"
  }
}
```

#### 購読システム
- hotel-saas: 客室サービス無効化、フィードバック依頼
- hotel-member: 滞在履歴更新、ポイント付与

### billing.created

請求が作成された時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "billing.created",
  "version": "1.0",
  "timestamp": "2023-01-15T16:00:00Z",
  "data": {
    "billingId": "bill_5678",
    "reservationId": "res_12345",
    "customerId": "cust_6789",
    "items": [
      {
        "description": "デラックスルーム 2泊",
        "quantity": 2,
        "unitPrice": 15000,
        "amount": 30000,
        "category": "ROOM",
        "taxIncluded": true
      },
      {
        "description": "朝食",
        "quantity": 4,
        "unitPrice": 2000,
        "amount": 8000,
        "category": "SERVICE",
        "taxIncluded": true
      }
    ],
    "totalAmount": 38000,
    "currency": "JPY",
    "status": "OPEN",
    "dueDate": "2023-01-17T11:00:00Z",
    "createdAt": "2023-01-15T16:00:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-pms",
    "correlationId": "corr_pqr678",
    "userId": "user_staff3",
    "traceId": "trace_mno345"
  }
}
```

#### 購読システム
- hotel-member: 請求履歴の更新
- hotel-saas: 請求情報の表示

### billing.paid

請求の支払いが完了した時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "billing.paid",
  "version": "1.0",
  "timestamp": "2023-01-17T10:30:00Z",
  "data": {
    "billingId": "bill_5678",
    "reservationId": "res_12345",
    "customerId": "cust_6789",
    "totalAmount": 38000,
    "paidAmount": 38000,
    "paymentMethod": "CREDIT_CARD",
    "paymentDetails": {
      "cardType": "VISA",
      "last4": "1234",
      "authorizationCode": "AUTH123"
    },
    "status": "PAID",
    "paidAt": "2023-01-17T10:30:00Z",
    "receiptNumber": "REC20230117-001"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-pms",
    "correlationId": "corr_stu901",
    "userId": "user_staff3",
    "traceId": "trace_pqr678"
  }
}
```

#### 購読システム
- hotel-member: 支払い履歴の更新、ポイント付与
- hotel-saas: 決済完了通知

## 購読イベント

hotel-pmsシステムは以下のイベントを購読します。

### service.ordered

サービスが注文された時に発行されるイベントを購読します。

#### ペイロード
```json
{
  "eventType": "service.ordered",
  "version": "1.0",
  "timestamp": "2023-01-16T19:00:00Z",
  "data": {
    "serviceOrderId": "so_9012",
    "reservationId": "res_12345",
    "roomId": "room_101",
    "customerId": "cust_6789",
    "items": [
      {
        "serviceId": "svc_dinner",
        "name": "ルームサービス（ディナー）",
        "quantity": 2,
        "unitPrice": 3000,
        "amount": 6000,
        "specialInstructions": "アレルギー：エビ"
      },
      {
        "serviceId": "svc_wine",
        "name": "赤ワイン",
        "quantity": 1,
        "unitPrice": 5000,
        "amount": 5000,
        "specialInstructions": ""
      }
    ],
    "totalAmount": 11000,
    "requestedDeliveryTime": "2023-01-16T20:00:00Z",
    "status": "ORDERED",
    "orderedAt": "2023-01-16T19:00:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-saas",
    "correlationId": "corr_vwx234",
    "userId": "user_guest1",
    "traceId": "trace_stu901"
  }
}
```

#### 処理内容
1. 予約情報の検証
2. 請求項目への追加
3. フロントスタッフへの通知
4. サービス提供指示

### service.canceled

サービスがキャンセルされた時に発行されるイベントを購読します。

#### ペイロード
```json
{
  "eventType": "service.canceled",
  "version": "1.0",
  "timestamp": "2023-01-16T19:10:00Z",
  "data": {
    "serviceOrderId": "so_9012",
    "reservationId": "res_12345",
    "reason": "注文ミス",
    "status": "CANCELED",
    "canceledAt": "2023-01-16T19:10:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-saas",
    "correlationId": "corr_yz0123",
    "userId": "user_guest1",
    "traceId": "trace_vwx234"
  }
}
```

#### 処理内容
1. 請求項目の削除
2. フロントスタッフへの通知
3. サービス提供キャンセル

### customer.updated

顧客情報が更新された時に発行されるイベントを購読します。

#### ペイロード
```json
{
  "eventType": "customer.updated",
  "version": "1.0",
  "timestamp": "2023-01-10T11:00:00Z",
  "data": {
    "customerId": "cust_6789",
    "changes": {
      "name": {
        "old": "山田 太郎",
        "new": "山田 次郎"
      },
      "phone": {
        "old": "090-1234-5678",
        "new": "090-8765-4321"
      },
      "address": {
        "old": "東京都新宿区新宿1-1-1",
        "new": "東京都新宿区新宿2-2-2"
      }
    },
    "updatedAt": "2023-01-10T11:00:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-member",
    "correlationId": "corr_abc456",
    "userId": "user_guest1",
    "traceId": "trace_yz0123"
  }
}
```

#### 処理内容
1. 予約関連顧客情報の更新
2. フロントスタッフへの通知（必要に応じて）

### member.status_changed

会員ステータスが変更された時に発行されるイベントを購読します。

#### ペイロード
```json
{
  "eventType": "member.status_changed",
  "version": "1.0",
  "timestamp": "2023-01-05T10:00:00Z",
  "data": {
    "customerId": "cust_6789",
    "oldStatus": "SILVER",
    "newStatus": "GOLD",
    "benefits": [
      "朝食無料",
      "レイトチェックアウト",
      "ルームアップグレード"
    ],
    "effectiveDate": "2023-01-05T00:00:00Z",
    "expiryDate": "2024-01-04T23:59:59Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-member",
    "correlationId": "corr_def789",
    "userId": "system",
    "traceId": "trace_abc456"
  }
}
```

#### 処理内容
1. 予約に会員特典を適用
2. 料金プランの更新
3. フロントスタッフへの通知

## イベント処理の実装

### イベント発行

```typescript
// 予約作成イベント発行例
import { EventPublisher } from '@hotel-common/events';

export class ReservationService {
  constructor(private eventPublisher: EventPublisher) {}
  
  async createReservation(reservationData) {
    // 予約データの保存
    const reservation = await this.reservationRepository.save(reservationData);
    
    // イベント発行
    await this.eventPublisher.publish('reservation.created', {
      reservationId: reservation.id,
      customerId: reservation.customerId,
      roomId: reservation.roomId,
      roomTypeId: reservation.roomTypeId,
      checkInDate: reservation.checkInDate,
      checkOutDate: reservation.checkOutDate,
      adults: reservation.adults,
      children: reservation.children,
      totalAmount: reservation.totalAmount,
      currency: reservation.currency,
      status: reservation.status,
      origin: reservation.origin,
      specialRequests: reservation.specialRequests,
      createdAt: reservation.createdAt
    });
    
    return reservation;
  }
}
```

### イベント購読

```typescript
// サービス注文イベント購読例
import { EventSubscriber } from '@hotel-common/events';
import { BillingService } from '../services/billing.service';
import { NotificationService } from '../services/notification.service';

export class ServiceEventHandler {
  constructor(
    private eventSubscriber: EventSubscriber,
    private billingService: BillingService,
    private notificationService: NotificationService
  ) {}
  
  initialize() {
    // サービス注文イベントの購読
    this.eventSubscriber.subscribe('service.ordered', async (event) => {
      try {
        const { serviceOrderId, reservationId, items, totalAmount } = event.data;
        
        // 予約の検証
        const reservation = await this.reservationRepository.findById(reservationId);
        if (!reservation || reservation.status !== 'CHECKED_IN') {
          throw new Error('有効な予約が見つかりません');
        }
        
        // 請求項目の追加
        await this.billingService.addServiceItems(reservationId, items, totalAmount);
        
        // フロントスタッフへの通知
        await this.notificationService.notifyStaff('サービス注文', {
          serviceOrderId,
          reservationId,
          roomNumber: reservation.roomNumber,
          items,
          requestedDeliveryTime: event.data.requestedDeliveryTime
        });
        
        // 処理完了ログ
        console.log(`サービス注文処理完了: ${serviceOrderId}`);
      } catch (error) {
        // エラーハンドリング
        console.error(`サービス注文処理エラー: ${error.message}`);
        // エラーログ記録
        // 再試行キューへの追加（必要に応じて）
      }
    });
  }
}
```

## イベントスキーマ管理

hotel-pmsシステムが発行・購読するすべてのイベントは、共通のスキーマ定義に従います。スキーマはJSON Schemaで定義され、バージョン管理されています。

### スキーマ例（reservation.created）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["eventType", "version", "timestamp", "data", "metadata"],
  "properties": {
    "eventType": {
      "type": "string",
      "enum": ["reservation.created"]
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "data": {
      "type": "object",
      "required": [
        "reservationId", 
        "customerId", 
        "roomId", 
        "checkInDate", 
        "checkOutDate", 
        "status", 
        "origin"
      ],
      "properties": {
        "reservationId": {
          "type": "string"
        },
        "customerId": {
          "type": "string"
        },
        "roomId": {
          "type": "string"
        },
        "roomTypeId": {
          "type": "string"
        },
        "checkInDate": {
          "type": "string",
          "format": "date-time"
        },
        "checkOutDate": {
          "type": "string",
          "format": "date-time"
        },
        "adults": {
          "type": "integer",
          "minimum": 1
        },
        "children": {
          "type": "integer",
          "minimum": 0
        },
        "totalAmount": {
          "type": "number",
          "minimum": 0
        },
        "currency": {
          "type": "string",
          "minLength": 3,
          "maxLength": 3
        },
        "status": {
          "type": "string",
          "enum": ["PENDING", "CONFIRMED", "CANCELED"]
        },
        "origin": {
          "type": "string",
          "enum": ["MEMBER", "OTA", "FRONT", "PHONE", "WALK_IN"]
        },
        "specialRequests": {
          "type": "string"
        },
        "createdAt": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "metadata": {
      "type": "object",
      "required": ["tenantId", "source"],
      "properties": {
        "tenantId": {
          "type": "string"
        },
        "source": {
          "type": "string",
          "enum": ["hotel-pms"]
        },
        "correlationId": {
          "type": "string"
        },
        "userId": {
          "type": "string"
        },
        "traceId": {
          "type": "string"
        }
      }
    }
  }
}
```

## 関連ドキュメント
- [イベント駆動アーキテクチャ概要](../event-driven-architecture.md)
- [hotel-saas イベント連携](./saas-events.md)
- [hotel-member イベント連携](./member-events.md)
- [hotel-common イベント連携](./common-events.md)