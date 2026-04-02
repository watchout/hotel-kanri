# hotel-member イベント連携

hotel-memberシステムは、他システムとの連携のためにイベントを発行・購読します。このドキュメントでは、hotel-memberが発行および購読するイベントについて定義します。

## 発行イベント

hotel-memberシステムは以下のイベントを発行します。

### customer.created

顧客が作成された時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "customer.created",
  "version": "1.0",
  "timestamp": "2023-01-01T12:00:00Z",
  "data": {
    "customerId": "cust_12345",
    "firstName": "太郎",
    "lastName": "山田",
    "email": "taro.yamada@example.com",
    "phone": "090-1234-5678",
    "address": "東京都新宿区新宿1-1-1",
    "birthDate": "1980-01-01",
    "gender": "MALE",
    "preferences": {
      "roomPreference": "NON_SMOKING",
      "bedPreference": "KING",
      "dietaryRestrictions": ["VEGETARIAN"]
    },
    "status": "ACTIVE",
    "createdAt": "2023-01-01T12:00:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-member",
    "correlationId": "corr_abc123",
    "userId": "user_admin1",
    "traceId": "trace_xyz789"
  }
}
```

#### 購読システム
- hotel-pms: 顧客情報の同期
- hotel-saas: パーソナライズ設定の初期化

### customer.updated

顧客情報が更新された時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "customer.updated",
  "version": "1.0",
  "timestamp": "2023-01-02T09:30:00Z",
  "data": {
    "customerId": "cust_12345",
    "changes": {
      "phone": {
        "old": "090-1234-5678",
        "new": "090-8765-4321"
      },
      "address": {
        "old": "東京都新宿区新宿1-1-1",
        "new": "東京都渋谷区渋谷2-2-2"
      },
      "preferences": {
        "old": {
          "roomPreference": "NON_SMOKING",
          "bedPreference": "KING",
          "dietaryRestrictions": ["VEGETARIAN"]
        },
        "new": {
          "roomPreference": "NON_SMOKING",
          "bedPreference": "TWIN",
          "dietaryRestrictions": ["VEGETARIAN", "GLUTEN_FREE"]
        }
      }
    },
    "updatedAt": "2023-01-02T09:30:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-member",
    "correlationId": "corr_def456",
    "userId": "user_staff1",
    "traceId": "trace_abc123"
  }
}
```

#### 購読システム
- hotel-pms: 顧客情報の更新
- hotel-saas: パーソナライズ設定の更新

### member.registered

会員登録が完了した時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "member.registered",
  "version": "1.0",
  "timestamp": "2023-01-03T14:15:00Z",
  "data": {
    "customerId": "cust_12345",
    "membershipId": "mem_6789",
    "membershipNumber": "M20230103-001",
    "rankId": "rank_silver",
    "rankName": "シルバー",
    "joinDate": "2023-01-03T14:15:00Z",
    "expiryDate": "2024-01-03T23:59:59Z",
    "initialPoints": 1000,
    "benefits": [
      "朝食10%割引",
      "レイトチェックアウト（12時まで）",
      "ウェルカムドリンク"
    ],
    "status": "ACTIVE",
    "registeredAt": "2023-01-03T14:15:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-member",
    "correlationId": "corr_ghi789",
    "userId": "user_staff2",
    "traceId": "trace_def456"
  }
}
```

#### 購読システム
- hotel-pms: 会員情報の同期、特典適用準備
- hotel-saas: 会員向けサービス有効化

### member.status_changed

会員ステータスが変更された時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "member.status_changed",
  "version": "1.0",
  "timestamp": "2023-01-15T10:00:00Z",
  "data": {
    "customerId": "cust_12345",
    "membershipId": "mem_6789",
    "oldStatus": {
      "rankId": "rank_silver",
      "rankName": "シルバー",
      "benefits": [
        "朝食10%割引",
        "レイトチェックアウト（12時まで）",
        "ウェルカムドリンク"
      ]
    },
    "newStatus": {
      "rankId": "rank_gold",
      "rankName": "ゴールド",
      "benefits": [
        "朝食無料",
        "レイトチェックアウト（14時まで）",
        "ウェルカムドリンク",
        "ルームアップグレード（空室時）"
      ]
    },
    "reason": "STAY_COUNT_THRESHOLD",
    "effectiveDate": "2023-01-15T00:00:00Z",
    "changedAt": "2023-01-15T10:00:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-member",
    "correlationId": "corr_jkl012",
    "userId": "system",
    "traceId": "trace_ghi789"
  }
}
```

#### 購読システム
- hotel-pms: 会員特典の更新
- hotel-saas: パーソナライズ設定の更新、特典表示の更新

### points.added

ポイントが追加された時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "points.added",
  "version": "1.0",
  "timestamp": "2023-01-20T18:30:00Z",
  "data": {
    "pointId": "point_2345",
    "customerId": "cust_12345",
    "membershipId": "mem_6789",
    "amount": 500,
    "type": "EARNED",
    "source": "STAY",
    "sourceId": "res_7890",
    "description": "宿泊ポイント（2泊）",
    "balance": 1500,
    "expiryDate": "2024-01-20T23:59:59Z",
    "addedAt": "2023-01-20T18:30:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-member",
    "correlationId": "corr_mno345",
    "userId": "user_staff3",
    "traceId": "trace_jkl012"
  }
}
```

#### 購読システム
- hotel-pms: ポイント残高の同期
- hotel-saas: ポイント獲得通知

### points.used

ポイントが使用された時に発行されるイベントです。

#### ペイロード
```json
{
  "eventType": "points.used",
  "version": "1.0",
  "timestamp": "2023-01-25T12:45:00Z",
  "data": {
    "pointId": "point_3456",
    "customerId": "cust_12345",
    "membershipId": "mem_6789",
    "amount": 300,
    "type": "REDEEMED",
    "source": "SERVICE",
    "sourceId": "service_456",
    "description": "スパ利用（ポイント交換）",
    "balance": 1200,
    "usedAt": "2023-01-25T12:45:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-member",
    "correlationId": "corr_pqr678",
    "userId": "user_staff3",
    "traceId": "trace_mno345"
  }
}
```

#### 購読システム
- hotel-pms: ポイント残高の同期、請求処理
- hotel-saas: ポイント使用通知

## 購読イベント

hotel-memberシステムは以下のイベントを購読します。

### reservation.created

予約が作成された時に発行されるイベントを購読します。

#### ペイロード
```json
{
  "eventType": "reservation.created",
  "version": "1.0",
  "timestamp": "2023-01-10T15:00:00Z",
  "data": {
    "reservationId": "res_7890",
    "customerId": "cust_12345",
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
    "createdAt": "2023-01-10T15:00:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-pms",
    "correlationId": "corr_stu901",
    "userId": "user_guest1",
    "traceId": "trace_pqr678"
  }
}
```

#### 処理内容
1. 顧客情報の更新（最新の予約情報）
2. 予約ポイントの予約（確定前）
3. 会員ステータスの確認（特典適用）
4. 予約履歴の記録

### reservation.canceled

予約がキャンセルされた時に発行されるイベントを購読します。

#### ペイロード
```json
{
  "eventType": "reservation.canceled",
  "version": "1.0",
  "timestamp": "2023-01-12T09:00:00Z",
  "data": {
    "reservationId": "res_7890",
    "reason": "顧客都合",
    "cancellationFee": 5000,
    "refundAmount": 25000,
    "status": "CANCELED",
    "canceledAt": "2023-01-12T09:00:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-pms",
    "correlationId": "corr_vwx234",
    "userId": "user_guest1",
    "traceId": "trace_stu901"
  }
}
```

#### 処理内容
1. 予約ポイントのキャンセル
2. 顧客履歴の更新
3. キャンセル履歴の記録

### checkin_checkout.checked_in

チェックインが完了した時に発行されるイベントを購読します。

#### ペイロード
```json
{
  "eventType": "checkin_checkout.checked_in",
  "version": "1.0",
  "timestamp": "2023-01-15T15:30:00Z",
  "data": {
    "reservationId": "res_7890",
    "customerId": "cust_12345",
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
    "correlationId": "corr_yz0123",
    "userId": "user_staff3",
    "traceId": "trace_vwx234"
  }
}
```

#### 処理内容
1. 顧客ステータスの更新（滞在中）
2. 会員特典の適用確認
3. 滞在履歴の記録開始

### checkin_checkout.checked_out

チェックアウトが完了した時に発行されるイベントを購読します。

#### ペイロード
```json
{
  "eventType": "checkin_checkout.checked_out",
  "version": "1.0",
  "timestamp": "2023-01-17T10:45:00Z",
  "data": {
    "reservationId": "res_7890",
    "customerId": "cust_12345",
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
    "correlationId": "corr_abc456",
    "userId": "user_staff3",
    "traceId": "trace_yz0123"
  }
}
```

#### 処理内容
1. 顧客ステータスの更新（滞在終了）
2. 滞在履歴の完了記録
3. 会員ステータスの再評価（必要に応じて）
4. ポイント付与の準備

### billing.paid

請求の支払いが完了した時に発行されるイベントを購読します。

#### ペイロード
```json
{
  "eventType": "billing.paid",
  "version": "1.0",
  "timestamp": "2023-01-17T10:30:00Z",
  "data": {
    "billingId": "bill_5678",
    "reservationId": "res_7890",
    "customerId": "cust_12345",
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
    "correlationId": "corr_def789",
    "userId": "user_staff3",
    "traceId": "trace_abc456"
  }
}
```

#### 処理内容
1. ポイント付与（支払額に基づく）
2. 顧客支出履歴の更新
3. 会員ステータスの再評価（支出額に基づく）
4. 次回予約促進キャンペーンの検討

### feedback.submitted

フィードバックが送信された時に発行されるイベントを購読します。

#### ペイロード
```json
{
  "eventType": "feedback.submitted",
  "version": "1.0",
  "timestamp": "2023-01-18T09:15:00Z",
  "data": {
    "feedbackId": "fb_1234",
    "reservationId": "res_7890",
    "customerId": "cust_12345",
    "ratings": {
      "overall": 4,
      "cleanliness": 5,
      "service": 4,
      "comfort": 4,
      "location": 3,
      "value": 4
    },
    "comments": "全体的に満足しています。スタッフの対応が特に良かったです。ただ、周辺が少し騒がしかったです。",
    "tags": ["GOOD_SERVICE", "FRIENDLY_STAFF", "NOISY_SURROUNDINGS"],
    "submittedAt": "2023-01-18T09:15:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-saas",
    "correlationId": "corr_ghi012",
    "userId": "user_guest1",
    "traceId": "trace_def789"
  }
}
```

#### 処理内容
1. 顧客フィードバック履歴の記録
2. 顧客嗜好情報の更新
3. フィードバックに基づくボーナスポイントの検討
4. 顧客満足度分析の更新

## イベント処理の実装

### イベント発行

```python
# 顧客作成イベント発行例
from app.core.events import EventPublisher
from app.models.customer import Customer

class CustomerService:
    def __init__(self, event_publisher: EventPublisher):
        self.event_publisher = event_publisher
    
    async def create_customer(self, customer_data):
        # 顧客データの保存
        customer = await Customer.create(**customer_data)
        
        # イベント発行
        await self.event_publisher.publish("customer.created", {
            "customerId": customer.id,
            "firstName": customer.first_name,
            "lastName": customer.last_name,
            "email": customer.email,
            "phone": customer.phone,
            "address": customer.address,
            "birthDate": customer.birth_date.isoformat() if customer.birth_date else None,
            "gender": customer.gender,
            "preferences": customer.preferences,
            "status": customer.status,
            "createdAt": customer.created_at.isoformat()
        })
        
        return customer
```

### イベント購読

```python
# 請求支払いイベント購読例
from app.core.events import EventSubscriber
from app.services.point_service import PointService
from app.services.membership_service import MembershipService

class BillingEventHandler:
    def __init__(
        self,
        event_subscriber: EventSubscriber,
        point_service: PointService,
        membership_service: MembershipService
    ):
        self.event_subscriber = event_subscriber
        self.point_service = point_service
        self.membership_service = membership_service
    
    async def initialize(self):
        # 請求支払いイベントの購読
        await self.event_subscriber.subscribe("billing.paid", self.handle_billing_paid)
    
    async def handle_billing_paid(self, event):
        try:
            data = event["data"]
            customer_id = data["customerId"]
            total_amount = data["totalAmount"]
            reservation_id = data["reservationId"]
            
            # 会員情報の取得
            membership = await self.membership_service.get_membership_by_customer_id(customer_id)
            
            if membership:
                # ポイント付与
                point_multiplier = membership.rank.point_multiplier
                points_to_add = int(total_amount * point_multiplier / 100)  # 例: 100円で1ポイント × ランク倍率
                
                await self.point_service.add_points(
                    membership_id=membership.id,
                    amount=points_to_add,
                    source="STAY",
                    source_id=reservation_id,
                    description=f"宿泊料金 {total_amount}円"
                )
                
                # 会員ステータスの再評価
                await self.membership_service.evaluate_status(membership.id)
                
                # 顧客支出履歴の更新
                await self.membership_service.update_spending(
                    membership_id=membership.id,
                    amount=total_amount
                )
            
        except Exception as e:
            # エラーハンドリング
            print(f"請求支払いイベント処理エラー: {str(e)}")
            # エラーログ記録
            # 再試行キューへの追加（必要に応じて）
```

## イベントスキーマ管理

hotel-memberシステムが発行・購読するすべてのイベントは、共通のスキーマ定義に従います。スキーマはJSON Schemaで定義され、バージョン管理されています。

### スキーマ例（customer.created）

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["eventType", "version", "timestamp", "data", "metadata"],
  "properties": {
    "eventType": {
      "type": "string",
      "enum": ["customer.created"]
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
        "customerId", 
        "firstName", 
        "lastName", 
        "email", 
        "status", 
        "createdAt"
      ],
      "properties": {
        "customerId": {
          "type": "string"
        },
        "firstName": {
          "type": "string"
        },
        "lastName": {
          "type": "string"
        },
        "email": {
          "type": "string",
          "format": "email"
        },
        "phone": {
          "type": "string"
        },
        "address": {
          "type": "string"
        },
        "birthDate": {
          "type": ["string", "null"],
          "format": "date"
        },
        "gender": {
          "type": "string",
          "enum": ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]
        },
        "preferences": {
          "type": "object"
        },
        "status": {
          "type": "string",
          "enum": ["ACTIVE", "INACTIVE", "BLOCKED"]
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
          "enum": ["hotel-member"]
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
- [hotel-pms イベント連携](./pms-events.md)
- [hotel-common イベント連携](./common-events.md)