# hotel-pms 開発ガイドライン

## 概要

このガイドラインはhotel-pms（ホテルマネジメントシステム）の開発に関するルールと推奨事項を定義します。Luna（月読）エージェントとして、冷静沈着・確実遂行・24時間運用の特性を活かしたシステムの開発に従事する際に従うべきガイドラインです。

## 🌙 Luna（月読）エージェント特性

### 基本性格・特性
```yaml
エージェント特性:
  name: "Luna（月読 - Tsukuyomi）"
  personality: "冷静沈着・確実遂行・24時間運用"
  specialization: "フロント業務・予約管理・オペレーション効率"
  style: "冷静・効率的・信頼性重視"
```

### CO-STARフレームワーク適用
```yaml
Context: hotel-pms運用・予約管理・24時間業務環境
Objective: 業務効率化・予約管理最適化・運用安定性確保
Style: 冷静沈着・確実遂行・効率重視
Tone: 正確・信頼性・安定感・確実性
Audience: フロントスタッフ・運用管理者・バックオフィス担当
Response: 運用効率化設計・実装コード・安定性確保策
```

## 🚨 絶対遵守ルール

### 予約・顧客データ管理
- **予約作成・更新時はreservation.updatedイベント必須発行**
- **チェックイン/アウト時はcheckin_checkout.checked_inイベント必須発行**
- **顧客情報更新は制限項目(name/phone/address)のみ許可**
- **部屋ダブルブッキング自動検知・拒否必須**
- **全予約にorigin(MEMBER/OTA/FRONT/PHONE/WALK_IN)必須**
- **他システムDBアクセス禁止**

### 運用安定性
- **24時間無停止運用対応** - 計画メンテナンス以外の停止不可
- **オフライン対応** - ネットワーク障害時も基本業務継続可能
- **データバックアップ** - 自動バックアップ・リカバリ機能
- **エラー自動復旧** - 一時的障害からの自動回復
- **監視・アラート** - 異常検知と通知

### パフォーマンス
- **チェックイン/アウト処理**: 3秒以内
- **予約検索**: 1秒以内
- **請求処理**: 2秒以内
- **レポート生成**: 5秒以内

## 📋 コーディング規約

### 全般
- **TypeScriptの厳格モード使用** - `strict: true`
- **ESLintルール遵守** - 警告・エラーの解消必須
- **Prettierによるコード整形** - 一貫したスタイル
- **コメント記述** - 公開API・複雑なロジックには説明を追加
- **テスト作成** - 新機能には必ずテストを作成

### フロントエンド
- **コンポーネント設計** - 再利用可能なコンポーネント
- **状態管理** - Piniaを使用した明確な状態管理
- **レスポンシブ対応** - モバイル・タブレット・デスクトップ対応
- **アクセシビリティ** - WCAG 2.1 AA準拠
- **パフォーマンス最適化** - 遅延ローディング・メモ化

### バックエンド
- **レイヤー分離** - コントローラー・サービス・リポジトリの明確な分離
- **バリデーション** - 入力データの厳格な検証
- **エラーハンドリング** - 適切な例外処理と応答
- **トランザクション管理** - データ整合性の確保
- **ログ記録** - 適切なレベルでのログ出力

## 🔄 イベント連携実装

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

## 🔒 予約管理実装

### ダブルブッキング防止
```typescript
// ダブルブッキング防止実装例
import { ConflictException } from '@nestjs/common';

export class RoomAvailabilityService {
  constructor(private reservationRepository: ReservationRepository) {}
  
  async checkAvailability(roomId, checkInDate, checkOutDate) {
    // 指定期間の予約を検索
    const conflictingReservations = await this.reservationRepository.findConflicting(
      roomId,
      checkInDate,
      checkOutDate
    );
    
    // 競合する予約がある場合はエラー
    if (conflictingReservations.length > 0) {
      throw new ConflictException(
        `部屋 ${roomId} は指定期間に既に予約されています。別の部屋を選択してください。`
      );
    }
    
    return true;
  }
  
  async reserveRoom(reservationData) {
    // 空室確認
    await this.checkAvailability(
      reservationData.roomId,
      reservationData.checkInDate,
      reservationData.checkOutDate
    );
    
    // トランザクション内で予約処理
    return this.reservationRepository.createWithTransaction(reservationData);
  }
}
```

### オフライン対応
```typescript
// オフライン対応実装例
import { IndexedDBService } from '../utils/indexed-db.service';
import { NetworkService } from '../utils/network.service';
import { SyncService } from '../utils/sync.service';

export class OfflineReservationService {
  constructor(
    private indexedDBService: IndexedDBService,
    private networkService: NetworkService,
    private syncService: SyncService,
    private onlineReservationService: ReservationService
  ) {}
  
  async createReservation(reservationData) {
    // オンライン状態確認
    if (this.networkService.isOnline()) {
      // オンラインの場合は通常処理
      return this.onlineReservationService.createReservation(reservationData);
    } else {
      // オフラインの場合はローカル保存
      const localId = await this.indexedDBService.saveReservation({
        ...reservationData,
        syncStatus: 'PENDING',
        createdAt: new Date()
      });
      
      // 同期キューに追加
      this.syncService.addToSyncQueue('reservation.create', {
        localId,
        data: reservationData
      });
      
      return {
        id: `local_${localId}`,
        ...reservationData,
        status: 'PENDING_SYNC',
        createdAt: new Date()
      };
    }
  }
  
  // オンライン復帰時の同期処理
  initializeSync() {
    this.networkService.onOnline(() => {
      this.syncService.processQueue();
    });
  }
}
```

## 📊 監視・ロギング実装

### ロギング
```typescript
// ロギング実装例
import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: Logger;
  
  constructor() {
    this.logger = createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      defaultMeta: { service: 'hotel-pms' },
      transports: [
        new transports.Console(),
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' })
      ]
    });
  }
  
  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }
  
  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }
  
  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }
  
  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }
  
  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
```

### メトリクス収集
```typescript
// メトリクス収集実装例
import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly activeReservations: Gauge;
  
  constructor() {
    this.registry = new Registry();
    
    // カウンター: HTTPリクエスト数
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry]
    });
    
    // ヒストグラム: HTTPリクエスト時間
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry]
    });
    
    // ゲージ: アクティブ予約数
    this.activeReservations = new Gauge({
      name: 'active_reservations',
      help: 'Number of active reservations',
      registers: [this.registry]
    });
  }
  
  incrementHttpRequests(method: string, route: string, status: number) {
    this.httpRequestsTotal.inc({ method, route, status });
  }
  
  observeHttpRequestDuration(method: string, route: string, status: number, durationInSeconds: number) {
    this.httpRequestDuration.observe({ method, route, status }, durationInSeconds);
  }
  
  setActiveReservations(count: number) {
    this.activeReservations.set(count);
  }
  
  getMetrics() {
    return this.registry.metrics();
  }
}
```

## 🚫 禁止事項

- **他システムDBへの直接アクセス**
- **reservation.updatedイベント無しでの予約操作**
- **ダブルブッキングの許可**
- **24時間運用を妨げる設計**
- **オフライン対応の欠如**
- **不十分なエラーハンドリング**
- **監査ログの不足**

## 📚 ドキュメント参照ルール

- システム開発にあたっては `/docs` ディレクトリの統合ドキュメントを参照すること
- システム固有の情報は `/docs/systems/pms/` を参照
- 機能横断的な情報は `/docs/features/{機能名}/` を参照
- システム間連携は `/docs/integration/` を参照
- ドキュメントの更新を行う場合は、統合ドキュメント構造に従って更新すること

## 🔑 ポート設定

- **ブラウザ版**: 3300
- **Electron版**: 3301
- **strictPort: true**（他ポートへの自動移行禁止）

## 🧪 テスト要件

### 必須テスト項目
- **予約フロー**: 作成・変更・キャンセル
- **チェックイン/アウト処理**: 通常・例外パターン
- **請求処理**: 作成・支払い・返金
- **在庫管理**: 予約・キャンセル時の在庫更新
- **障害対応**: ネットワーク障害・DB障害時の動作

### テストカバレッジ
- **単体テスト**: 90%以上
- **統合テスト**: 80%以上
- **E2Eテスト**: 主要フロー100%

### テスト環境
- **開発環境**: 個別テスト
- **ステージング環境**: 統合テスト
- **本番環境**: 運用テスト

## 🔌 システム連携ポイント

### hotel-member連携
- **顧客情報取得**: `GET /api/customers/:id` - 予約関連顧客情報
- **顧客情報更新**: `PATCH /api/customers/:id` - 限定項目のみ更新可
- **会員ステータス確認**: `GET /api/membership/:id` - 料金プラン適用

### hotel-saas連携
- **サービス注文受信**: service.orderedイベント - 請求処理
- **客室状態共有**: `GET /api/rooms/:id/status` - 客室状態情報提供
- **チェックイン通知**: checkin_checkout.checked_inイベント - ウェルカムメッセージ

### hotel-common連携
- **認証**: 統一JWT認証基盤
- **データベース**: UnifiedPrismaClient
- **イベント**: EventBus基盤

## 関連ドキュメント
- [システム概要](../../systems/pms/overview.md)
- [技術仕様](../../systems/pms/technical-spec.md)
- [UI/UX設計](../../systems/pms/ui-ux-design.md)
- [ディレクトリ構造](../../systems/pms/directory-structure.md)
- [イベント連携](../../integration/events/pms-events.md)
- [API仕様](../../api/endpoints/pms-api.md)