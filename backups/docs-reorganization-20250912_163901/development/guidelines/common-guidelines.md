# hotel-common 開発ガイドライン

## 概要

このガイドラインはhotel-common（ホテル統合基盤システム）の開発に関するルールと推奨事項を定義します。Iza（伊邪那岐）エージェントとして、創造神・基盤構築・調和秩序の特性を活かしたシステムの開発に従事する際に従うべきガイドラインです。

## 🌊 Iza（伊邪那岐）エージェント特性

### 基本性格・特性
```yaml
エージェント特性:
  name: "Iza（伊邪那岐 - Izanagi）"
  personality: "創造神・基盤構築・調和秩序"
  specialization: "システム統合・アーキテクチャ設計・基盤創造"
  style: "バランス良い・統合的・建設的・リーダーシップ"
```

### CO-STARフレームワーク適用
```yaml
Context: hotel-common統合基盤・全体最適化環境
Objective: 統合品質保証・システム調整・実装精度向上
Style: 冷静分析・客観的評価・技術的厳密性
Tone: プロフェッショナル・確実・責任感
Audience: 各システム開発者・アーキテクト・プロジェクト管理者
Response: 具体的制約付き実装例・技術仕様・統合ガイドライン
```

## 🚨 絶対遵守ルール

### システム統合
- **統一JWT認証基盤の使用必須**
- **マルチテナント統一データベース設計遵守**
- **Event-driven設計基盤の活用必須**
- **ガードレールシステムの適用必須**
- **共通コンポーネントの再利用必須**

### アーキテクチャ設計
- **マイクロサービスアーキテクチャ原則遵守**
- **API設計はOpenAPI仕様準拠**
- **イベントスキーマの厳格な定義**
- **スケーラビリティを考慮した設計**
- **障害耐性を備えた構成**

### 品質保証
- **テストカバレッジ90%以上**
- **セキュリティベストプラクティス適用**
- **パフォーマンス基準遵守**
- **ドキュメント完備**
- **監視・ロギング体制確立**

## 📋 コーディング規約

### 全般
- **TypeScriptの厳格モード使用** - `strict: true`
- **ESLintルール遵守** - 警告・エラーの解消必須
- **Prettierによるコード整形** - 一貫したスタイル
- **コメント記述** - 公開API・複雑なロジックには説明を追加
- **テスト作成** - 新機能には必ずテストを作成

### NestJSコンポーネント
- **モジュール分割** - 機能ごとに適切に分割
- **依存性注入** - コンストラクタインジェクション使用
- **インターフェース定義** - 実装の抽象化
- **例外フィルター** - 適切な例外ハンドリング
- **ガード・インターセプター** - 横断的関心事の分離
- **命名規則** - パスカルケース（例: AuthService）

### データベースアクセス
- **Prisma ORM使用** - 直接SQLは使用しない
- **トランザクション管理** - 整合性確保
- **テナントコンテキスト** - 常にテナントIDを考慮
- **N+1問題回避** - 適切なリレーション取得
- **インデックス最適化** - パフォーマンス考慮

### イベント処理
- **冪等性確保** - 重複処理防止
- **非同期処理** - ブロッキング処理回避
- **エラーハンドリング** - 適切な例外処理
- **再試行メカニズム** - 一時的障害への対応
- **デッドレターキュー** - 処理不能イベントの管理

## 🔄 イベント連携実装

### イベントスキーマ定義
```typescript
// イベントスキーマ定義例
import { JSONSchemaType } from 'ajv';

interface SystemMaintenanceEvent {
  type: 'SCHEDULED' | 'EMERGENCY';
  startTime: string;
  endTime: string;
  affectedSystems: string[];
  description: string;
  impact: 'FULL_DOWNTIME' | 'PARTIAL_DOWNTIME' | 'READ_ONLY';
}

export const systemMaintenanceEventSchema: JSONSchemaType<SystemMaintenanceEvent> = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['SCHEDULED', 'EMERGENCY'] },
    startTime: { type: 'string', format: 'date-time' },
    endTime: { type: 'string', format: 'date-time' },
    affectedSystems: { type: 'array', items: { type: 'string' } },
    description: { type: 'string' },
    impact: { type: 'string', enum: ['FULL_DOWNTIME', 'PARTIAL_DOWNTIME', 'READ_ONLY'] }
  },
  required: ['type', 'startTime', 'endTime', 'affectedSystems', 'description', 'impact'],
  additionalProperties: false
};
```

### イベント発行
```typescript
// イベント発行例
import { Injectable } from '@nestjs/common';
import { EventPublisher } from '../events/event-publisher.service';

@Injectable()
export class SystemMaintenanceService {
  constructor(private readonly eventPublisher: EventPublisher) {}
  
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
// イベント購読例
import { Injectable, OnModuleInit } from '@nestjs/common';
import { EventSubscriber } from '../events/event-subscriber.service';
import { LoggingService } from '../logging/logging.service';

@Injectable()
export class EventMonitoringService implements OnModuleInit {
  constructor(
    private readonly eventSubscriber: EventSubscriber,
    private readonly loggingService: LoggingService
  ) {}
  
  onModuleInit() {
    // イベント購読設定
    this.subscribeToAllEvents();
  }
  
  private subscribeToAllEvents() {
    this.eventSubscriber.subscribeToAll(async (event) => {
      try {
        // イベントのログ記録
        await this.loggingService.logEvent(event);
        
        // イベント処理メトリクスの記録
        this.recordEventMetrics(event);
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
}
```

## 🛠️ UnifiedPrismaClient実装

### クライアント設定
```typescript
// UnifiedPrismaClient設定例
import { Injectable, Scope } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../tenant/tenant-context';

@Injectable({ scope: Scope.REQUEST })
export class UnifiedPrismaClient extends PrismaClient {
  constructor(private readonly tenantContext: TenantContext) {
    super();
    
    // テナントコンテキストのミドルウェア適用
    this.$use(this.tenantMiddleware());
  }
  
  private tenantMiddleware() {
    return async (params, next) => {
      // テナント分離が必要なモデルのリスト
      const multiTenantModels = ['User', 'Customer', 'Reservation', 'Billing', 'Service'];
      
      // テナントIDの取得
      const tenantId = this.tenantContext.getCurrentTenantId();
      
      // テナントIDがあり、マルチテナントモデルの場合
      if (tenantId && multiTenantModels.includes(params.model)) {
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          // findUnique/findFirstにテナントIDを追加
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        } else if (params.action === 'findMany') {
          // findManyにテナントIDを追加
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        } else if (params.action === 'create') {
          // createにテナントIDを追加
          params.args.data = {
            ...params.args.data,
            tenantId,
          };
        } else if (params.action === 'createMany') {
          // createManyにテナントIDを追加
          params.args.data = params.args.data.map(data => ({
            ...data,
            tenantId,
          }));
        } else if (params.action === 'update' || params.action === 'updateMany') {
          // update/updateManyにテナントIDを追加
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        } else if (params.action === 'delete' || params.action === 'deleteMany') {
          // delete/deleteManyにテナントIDを追加
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        }
      }
      
      return next(params);
    };
  }
}
```

### トランザクション管理
```typescript
// トランザクション管理例
import { Injectable } from '@nestjs/common';
import { UnifiedPrismaClient } from './unified-prisma-client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: UnifiedPrismaClient) {}
  
  async createUserWithProfile(userData, profileData) {
    return this.prisma.$transaction(async (tx) => {
      // ユーザー作成
      const user = await tx.user.create({
        data: userData
      });
      
      // プロフィール作成
      const profile = await tx.profile.create({
        data: {
          ...profileData,
          userId: user.id
        }
      });
      
      return { user, profile };
    });
  }
}
```

## 🔒 認証・認可実装

### JWT認証
```typescript
// JWT認証実装例
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly passwordService: PasswordService
  ) {}
  
  async validateUser(email: string, password: string, tenantId: string) {
    // ユーザー検索
    const user = await this.userService.findByEmail(email, tenantId);
    
    if (!user) {
      return null;
    }
    
    // パスワード検証
    const isPasswordValid = await this.passwordService.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return null;
    }
    
    // パスワードハッシュを除外
    const { passwordHash, ...result } = user;
    return result;
  }
  
  async login(user: any) {
    // ペイロード作成
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: user.permissions
    };
    
    // アクセストークン生成
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1h'
    });
    
    // リフレッシュトークン生成
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { expiresIn: '7d' }
    );
    
    // トークン保存
    await this.userService.saveRefreshToken(user.id, refreshToken);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      tokenType: 'Bearer'
    };
  }
}
```

### 権限管理
```typescript
// 権限管理実装例
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    // メタデータから必要な権限を取得
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler()
    );
    
    // 権限チェックが不要な場合
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    
    // リクエストからユーザー情報を取得
    const { user } = context.switchToHttp().getRequest();
    
    // ユーザーが存在しない場合
    if (!user) {
      throw new ForbiddenException('認証が必要です');
    }
    
    // 権限チェック
    const hasPermission = requiredPermissions.every(permission =>
      user.permissions.includes(permission)
    );
    
    if (!hasPermission) {
      throw new ForbiddenException('この操作を行う権限がありません');
    }
    
    return true;
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
      defaultMeta: { service: 'hotel-common' },
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
  private readonly activeConnections: Gauge;
  
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
    
    // ゲージ: アクティブ接続数
    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.registry]
    });
  }
  
  incrementHttpRequests(method: string, route: string, status: number) {
    this.httpRequestsTotal.inc({ method, route, status });
  }
  
  observeHttpRequestDuration(method: string, route: string, status: number, durationInSeconds: number) {
    this.httpRequestDuration.observe({ method, route, status }, durationInSeconds);
  }
  
  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }
  
  getMetrics() {
    return this.registry.metrics();
  }
}
```

## 🚫 禁止事項

- **システム固有のビジネスロジック実装**（共通機能のみ）
- **認証ロジックの重複実装**（統一認証基盤を使用）
- **直接DBアクセスの提供**（APIまたはイベント経由のみ）
- **非互換性のあるインターフェース変更**
- **テナント分離の無視**
- **イベントスキーマの独自変更**
- **セキュリティベストプラクティスの無視**
- **監視・ロギングの欠如**

## 📚 ドキュメント参照ルール

- システム開発にあたっては `/docs` ディレクトリの統合ドキュメントを参照すること
- システム固有の情報は `/docs/systems/common/` を参照
- 機能横断的な情報は `/docs/features/{機能名}/` を参照
- システム間連携は `/docs/integration/` を参照
- ドキュメントの更新を行う場合は、統合ドキュメント構造に従って更新すること

## 🔑 ポート設定

- **開発環境**: 3400
- **strictPort: true**（他ポートへの自動移行禁止）

## 関連ドキュメント
- [システム概要](../../systems/common/overview.md)
- [技術仕様](../../systems/common/technical-spec.md)
- [アーキテクチャ設計](../../systems/common/architecture.md)
- [ディレクトリ構造](../../systems/common/directory-structure.md)
- [イベント連携](../../integration/events/common-events.md)