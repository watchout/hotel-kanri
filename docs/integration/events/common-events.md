# hotel-common イベント連携

hotel-commonシステムは、他システム間の連携をサポートするためのイベントを発行・購読します。このドキュメントでは、hotel-commonが発行および購読するイベントについて定義します。

## 発行イベント

hotel-commonシステムは以下のイベントを発行します。

### system.maintenance

システムメンテナンス通知を発行するイベントです。

#### ペイロード
```json
{
  "eventType": "system.maintenance",
  "version": "1.0",
  "timestamp": "2023-01-01T12:00:00Z",
  "data": {
    "type": "SCHEDULED",
    "startTime": "2023-01-05T02:00:00Z",
    "endTime": "2023-01-05T04:00:00Z",
    "affectedSystems": ["hotel-saas", "hotel-pms", "hotel-member"],
    "description": "定期メンテナンスのためシステムが一時的に利用できません",
    "impact": "FULL_DOWNTIME"
  },
  "metadata": {
    "tenantId": "all",
    "source": "hotel-common",
    "correlationId": "maint_123",
    "userId": "admin_user",
    "traceId": "trace_abc"
  }
}
```

#### 購読システム
- 全システム: メンテナンス通知の表示、ユーザー通知

### system.error

システムエラー通知を発行するイベントです。

#### ペイロード
```json
{
  "eventType": "system.error",
  "version": "1.0",
  "timestamp": "2023-01-01T15:30:00Z",
  "data": {
    "errorType": "DATABASE_CONNECTION",
    "message": "データベース接続エラーが発生しました",
    "severity": "CRITICAL",
    "source": "database-service",
    "affectedSystems": ["hotel-pms"],
    "errorId": "err_456",
    "stackTrace": "...",
    "recoveryStatus": "IN_PROGRESS"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-common",
    "correlationId": "err_corr_456",
    "traceId": "trace_def"
  }
}
```

#### 購読システム
- 全システム: エラー処理、フォールバック処理の実行

### auth.user_created

ユーザー作成時に発行するイベントです。

#### ペイロード
```json
{
  "eventType": "auth.user_created",
  "version": "1.0",
  "timestamp": "2023-01-02T10:00:00Z",
  "data": {
    "userId": "user_789",
    "email": "user@example.com",
    "role": "MANAGER",
    "permissions": ["read:customers", "write:reservations"],
    "tenantId": "tenant_001",
    "createdAt": "2023-01-02T10:00:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-common",
    "correlationId": "user_corr_789",
    "userId": "admin_user",
    "traceId": "trace_ghi"
  }
}
```

#### 購読システム
- 全システム: ユーザー情報のキャッシュ更新、アクセス権限の設定

### auth.permissions_changed

ユーザーの権限変更時に発行するイベントです。

#### ペイロード
```json
{
  "eventType": "auth.permissions_changed",
  "version": "1.0",
  "timestamp": "2023-01-03T14:15:00Z",
  "data": {
    "userId": "user_789",
    "oldPermissions": ["read:customers", "write:reservations"],
    "newPermissions": ["read:customers", "write:reservations", "read:billing"],
    "changedBy": "admin_user",
    "reason": "役割の変更による権限の追加",
    "changedAt": "2023-01-03T14:15:00Z"
  },
  "metadata": {
    "tenantId": "tenant_001",
    "source": "hotel-common",
    "correlationId": "perm_corr_123",
    "userId": "admin_user",
    "traceId": "trace_jkl"
  }
}
```

#### 購読システム
- 全システム: 権限情報のキャッシュ更新、アクセス制御の更新

### db.schema_updated

データベーススキーマ更新時に発行するイベントです。

#### ペイロード
```json
{
  "eventType": "db.schema_updated",
  "version": "1.0",
  "timestamp": "2023-01-04T09:30:00Z",
  "data": {
    "migrationId": "20230104093000",
    "description": "顧客テーブルに preferences フィールドを追加",
    "affectedTables": ["customers"],
    "changes": [
      {
        "table": "customers",
        "type": "ADD_COLUMN",
        "column": "preferences",
        "dataType": "jsonb"
      }
    ],
    "appliedAt": "2023-01-04T09:30:00Z"
  },
  "metadata": {
    "tenantId": "all",
    "source": "hotel-common",
    "correlationId": "migration_123",
    "userId": "system",
    "traceId": "trace_mno"
  }
}
```

#### 購読システム
- 全システム: スキーマキャッシュの更新、ORM設定の更新

## 購読イベント

hotel-commonシステムは全システムから発行されるすべてのイベントを購読し、監視・ロギング・分析を行います。主な処理内容は以下の通りです。

### イベント監視

- イベント配信の確認
- イベント処理のステータス追跡
- 処理時間の測定
- エラー率の監視
- キュー長のモニタリング

### イベントログ

- すべてのイベントの記録
- イベント履歴の保持
- 監査目的のログ管理
- イベント検索・フィルタリング

### イベント分析

- イベントパターンの分析
- システム間連携の最適化提案
- ボトルネックの特定
- パフォーマンス改善提案

## イベント処理の実装

### イベントブローカー設定

```typescript
// イベントブローカー設定例
import { EventBrokerFactory, BrokerType } from '@hotel-common/events';

export const configureEventBroker = () => {
  const broker = EventBrokerFactory.create({
    type: BrokerType.RABBITMQ,
    connection: {
      host: process.env.RABBITMQ_HOST || 'localhost',
      port: parseInt(process.env.RABBITMQ_PORT || '5672'),
      username: process.env.RABBITMQ_USER,
      password: process.env.RABBITMQ_PASSWORD,
      vhost: process.env.RABBITMQ_VHOST || '/',
    },
    exchanges: [
      { name: 'system', type: 'topic', durable: true },
      { name: 'auth', type: 'topic', durable: true },
      { name: 'db', type: 'topic', durable: true },
    ],
    queues: [
      { 
        name: 'system_maintenance_notifications',
        bindings: [{ exchange: 'system', routingKey: 'system.maintenance' }]
      },
      {
        name: 'system_error_notifications',
        bindings: [{ exchange: 'system', routingKey: 'system.error' }]
      },
      // 他のキュー設定
    ]
  });
  
  return broker;
};
```

### イベント発行

```typescript
// システムメンテナンス通知イベント発行例
import { EventPublisher } from '@hotel-common/events';

export class SystemMaintenanceService {
  constructor(private eventPublisher: EventPublisher) {}
  
  async scheduleSystemMaintenance(maintenanceData) {
    // メンテナンス情報の保存
    const maintenance = await this.maintenanceRepository.save(maintenanceData);
    
    // イベント発行
    await this.eventPublisher.publish('system.maintenance', {
      type: maintenance.type,
      startTime: maintenance.startTime,
      endTime: maintenance.endTime,
      affectedSystems: maintenance.affectedSystems,
      description: maintenance.description,
      impact: maintenance.impact
    });
    
    return maintenance;
  }
}
```

### イベント購読

```typescript
// すべてのイベントを監視・ロギングする例
import { EventSubscriber } from '@hotel-common/events';
import { LoggingService } from '@hotel-common/monitoring';

export class EventMonitoringService {
  constructor(
    private eventSubscriber: EventSubscriber,
    private loggingService: LoggingService
  ) {}
  
  initialize() {
    // すべてのイベントを購読
    this.eventSubscriber.subscribeToAll(async (event) => {
      try {
        // イベントのログ記録
        await this.loggingService.logEvent(event);
        
        // イベント処理メトリクスの記録
        this.recordEventMetrics(event);
        
        // イベント分析
        await this.analyzeEvent(event);
      } catch (error) {
        // エラーハンドリング
        await this.loggingService.logError('イベント処理エラー', {
          eventType: event.eventType,
          error: error.message,
          stack: error.stack
        });
      }
    });
  }
  
  private recordEventMetrics(event) {
    // メトリクス記録ロジック
  }
  
  private async analyzeEvent(event) {
    // イベント分析ロジック
  }
}
```

## 関連ドキュメント
- [イベント駆動アーキテクチャ概要](../event-driven-architecture.md)
- [hotel-saas イベント連携](./saas-events.md)
- [hotel-pms イベント連携](./pms-events.md)
- [hotel-member イベント連携](./member-events.md)