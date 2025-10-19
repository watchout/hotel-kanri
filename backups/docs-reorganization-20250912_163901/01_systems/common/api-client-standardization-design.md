# APIクライアント標準化設計 (API Client Standardization Design)

**作成日**: 2024年12月28日  
**バージョン**: 2.0.0  
**対象システム**: hotel-common, hotel-member, hotel-pms, hotel-saas  
**基盤**: 既存 HotelApiClient + HotelUnifiedApiClient 拡張

## 1. 概要 (Overview)

### 1.1 設計方針
- **既存実装の活用**: 優秀な `HotelApiClient` と `HotelUnifiedApiClient` を核とする
- **統一認証基盤統合**: 新設計したJWT + Redis認証基盤との完全統合
- **高度化機能追加**: キャッシュ、リトライ、レート制限、監視機能
- **システム間セキュリティ**: API間通信の暗号化・認証強化

### 1.2 現状評価
- ✅ **HotelApiClient**: Axiosベース、JWT認証、統一レスポンス、エラーハンドリング完備
- ✅ **HotelUnifiedApiClient**: Prismaベース、ソーストラッキング、権限制御完備
- ✅ **システム別ファクトリー**: hotel-saas, hotel-member, hotel-pms専用クライアント
- 🔄 **拡張必要**: 認証統合、キャッシュ、監視、セキュリティ

## 2. アーキテクチャ設計 (Architecture Design)

### 2.1 階層構造

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  hotel-member    │    hotel-pms     │    hotel-saas        │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│               API Client Standardization Layer              │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │ Enhanced        │  │ Enhanced        │  │ Integration  ││
│  │ HotelApiClient  │  │ UnifiedClient   │  │ Management   ││
│  │                 │  │                 │  │              ││
│  │ - JWT Auth      │  │ - Prisma ORM    │  │ - System     ││
│  │ - Redis Cache   │  │ - Source Track  │  │   Routing    ││
│  │ - Rate Limiting │  │ - Field Control │  │ - Load       ││
│  │ - Retry Logic   │  │ - Event Log     │  │   Balancing  ││
│  │ - Monitoring    │  │ - Validation    │  │ - Circuit    ││
│  │                 │  │                 │  │   Breaker    ││
│  └─────────────────┘  └─────────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Transport Layer                          │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │ HTTP/HTTPS      │  │ WebSocket       │  │ Redis PubSub ││
│  │ - TLS 1.3       │  │ - Real-time     │  │ - Event      ││
│  │ - Certificate   │  │ - Bidirectional │  │   Streaming  ││
│  │   Validation    │  │ - Auto-reconnect│  │ - Queue      ││
│  │ - Compression   │  │                 │  │   Processing ││
│  └─────────────────┘  └─────────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 2.2 統一認証統合設計

#### 2.2.1 JWT統合拡張
```typescript
// src/api/enhanced-client.ts
import { JwtManager } from '../auth/jwt'
import { getRedisClient } from '../utils/redis'

export class EnhancedHotelApiClient extends HotelApiClient {
  private jwtManager: JwtManager
  private redisClient: HotelRedisClient
  
  constructor(config: EnhancedApiClientConfig) {
    super(config)
    this.jwtManager = new JwtManager()
    this.redisClient = getRedisClient()
    this.setupEnhancedAuth()
  }

  /**
   * 統一認証基盤との統合
   */
  private setupEnhancedAuth(): void {
    // リクエストインターセプター拡張
    this.client.interceptors.request.use(async (config) => {
      // JWT自動リフレッシュ
      await this.ensureValidToken()
      
      // Redis セッション確認
      const session = await this.validateSession()
      if (!session) {
        throw new Error('SESSION_EXPIRED')
      }
      
      // 統一認証ヘッダー設定
      config.headers['Authorization'] = `Bearer ${this.currentToken}`
      config.headers['X-Session-ID'] = session.session_id
      config.headers['X-Tenant-ID'] = this.config.tenantId
      config.headers['X-Source-System'] = this.config.sourceSystem
      
      return config
    })
  }

  /**
   * JWT自動リフレッシュ
   */
  private async ensureValidToken(): Promise<void> {
    if (this.isTokenExpiringSoon()) {
      await this.refreshToken()
    }
  }

  /**
   * Redisセッション検証
   */
  private async validateSession(): Promise<SessionInfo | null> {
    if (!this.config.tenantId || !this.config.userId) return null
    
    return await this.redisClient.getSession(
      this.config.tenantId, 
      this.config.userId
    )
  }
}
```

#### 2.2.2 システム間API認証
```typescript
export interface SystemApiCredentials {
  systemId: 'hotel-member' | 'hotel-pms' | 'hotel-saas' | 'hotel-common'
  apiKey: string
  secretKey: string
  tenantId: string
  permissions: string[]
}

export class SystemAuthenticationManager {
  /**
   * システム間通信用認証トークン生成
   */
  static generateSystemToken(credentials: SystemApiCredentials): string {
    const payload = {
      system_id: credentials.systemId,
      tenant_id: credentials.tenantId,
      permissions: credentials.permissions,
      type: 'system_auth',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15分
    }
    
    return JwtManager.generateSystemToken(payload, credentials.secretKey)
  }

  /**
   * システム間通信認証検証
   */
  static async verifySystemToken(
    token: string, 
    expectedSystemId: string
  ): Promise<boolean> {
    try {
      const decoded = JwtManager.verifySystemToken(token)
      return decoded.system_id === expectedSystemId
    } catch {
      return false
    }
  }
}
```

### 2.3 高度なエラーハンドリング

#### 2.3.1 インテリジェントリトライ
```typescript
export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  exponentialBackoff: boolean
  retryableErrors: string[]
  circuitBreakerThreshold: number
}

export class RetryManager {
  private retryConfig: RetryConfig
  private circuitBreakerState: Map<string, CircuitBreakerStatus> = new Map()

  /**
   * インテリジェントリトライ実行
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    const circuitStatus = this.getCircuitBreakerStatus(endpoint)
    
    if (circuitStatus === 'OPEN') {
      throw new Error('CIRCUIT_BREAKER_OPEN')
    }

    let attempt = 0
    let lastError: Error

    while (attempt < this.retryConfig.maxAttempts) {
      try {
        const result = await operation()
        this.recordSuccess(endpoint)
        return result
      } catch (error) {
        lastError = error as Error
        
        if (!this.isRetryableError(error)) {
          this.recordFailure(endpoint)
          throw error
        }

        attempt++
        if (attempt < this.retryConfig.maxAttempts) {
          await this.delay(this.calculateDelay(attempt))
        }
      }
    }

    this.recordFailure(endpoint)
    throw lastError!
  }

  /**
   * 指数バックオフ遅延計算
   */
  private calculateDelay(attempt: number): number {
    if (!this.retryConfig.exponentialBackoff) {
      return this.retryConfig.baseDelay
    }

    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1)
    return Math.min(delay, this.retryConfig.maxDelay)
  }
}
```

#### 2.3.2 サーキットブレーカー
```typescript
export type CircuitBreakerStatus = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerState {
  status: CircuitBreakerStatus
  failureCount: number
  lastFailureTime: Date
  nextAttemptTime: Date
}

export class CircuitBreakerManager {
  private static readonly FAILURE_THRESHOLD = 5
  private static readonly RECOVERY_TIMEOUT = 60000 // 1分
  private static readonly HALF_OPEN_MAX_CALLS = 3

  /**
   * エンドポイント別サーキットブレーカー状態管理
   */
  updateCircuitBreakerState(
    endpoint: string, 
    success: boolean
  ): CircuitBreakerStatus {
    const current = this.circuitBreakerState.get(endpoint) || {
      status: 'CLOSED' as CircuitBreakerStatus,
      failureCount: 0,
      lastFailureTime: new Date(),
      nextAttemptTime: new Date()
    }

    if (success) {
      // 成功時はリセット
      if (current.status === 'HALF_OPEN') {
        current.status = 'CLOSED'
      }
      current.failureCount = 0
    } else {
      // 失敗時は累積
      current.failureCount++
      current.lastFailureTime = new Date()

      if (current.failureCount >= CircuitBreakerManager.FAILURE_THRESHOLD) {
        current.status = 'OPEN'
        current.nextAttemptTime = new Date(
          Date.now() + CircuitBreakerManager.RECOVERY_TIMEOUT
        )
      }
    }

    // OPEN状態からの復旧チェック
    if (current.status === 'OPEN' && Date.now() > current.nextAttemptTime.getTime()) {
      current.status = 'HALF_OPEN'
    }

    this.circuitBreakerState.set(endpoint, current)
    return current.status
  }
}
```

### 2.4 Redis統合キャッシュシステム

#### 2.4.1 インテリジェントキャッシュ
```typescript
export interface CacheConfig {
  ttl: number // Time To Live (seconds)
  refreshThreshold: number // リフレッシュ閾値（TTLの%)
  strategy: 'cache-first' | 'cache-aside' | 'write-through'
  invalidationKeys: string[] // 関連キャッシュ無効化
}

export class ApiCacheManager {
  private redisClient: HotelRedisClient

  /**
   * キャッシュ統合API呼び出し
   */
  async cachedRequest<T>(
    cacheKey: string,
    apiCall: () => Promise<T>,
    config: CacheConfig
  ): Promise<T> {
    const cached = await this.getCachedData<T>(cacheKey)
    
    if (cached) {
      // バックグラウンドリフレッシュ
      if (this.shouldRefresh(cached, config)) {
        this.backgroundRefresh(cacheKey, apiCall, config)
      }
      return cached.data
    }

    // キャッシュミス時は直接API呼び出し
    const result = await apiCall()
    await this.setCachedData(cacheKey, result, config)
    return result
  }

  /**
   * 関連キャッシュ無効化
   */
  async invalidateRelatedCache(keys: string[]): Promise<void> {
    const pipeline = this.redisClient.pipeline()
    
    for (const key of keys) {
      const relatedKeys = await this.redisClient.getKeysByPattern(`cache:${key}*`)
      relatedKeys.forEach(k => pipeline.del(k))
    }
    
    await pipeline.exec()
  }

  /**
   * スマートキャッシュキー生成
   */
  generateCacheKey(
    endpoint: string,
    params: Record<string, any>,
    tenantId: string
  ): string {
    const paramHash = this.hashParams(params)
    return `api:${tenantId}:${endpoint}:${paramHash}`
  }
}
```

### 2.5 レート制限システム

#### 2.5.1 分散レート制限
```typescript
export interface RateLimitConfig {
  windowMs: number // 時間窓（ミリ秒）
  maxRequests: number // 最大リクエスト数
  burstAllowance: number // バースト許容量
  strategy: 'fixed-window' | 'sliding-window' | 'token-bucket'
}

export class DistributedRateLimiter {
  private redisClient: HotelRedisClient

  /**
   * 分散レート制限チェック
   */
  async checkRateLimit(
    identifier: string, // user_id, api_key, ip_address
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`
    const now = Date.now()
    
    switch (config.strategy) {
      case 'sliding-window':
        return await this.slidingWindowCheck(key, now, config)
      case 'token-bucket':
        return await this.tokenBucketCheck(key, now, config)
      default:
        return await this.fixedWindowCheck(key, now, config)
    }
  }

  /**
   * スライディングウィンドウレート制限
   */
  private async slidingWindowCheck(
    key: string,
    now: number,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const windowStart = now - config.windowMs
    
    // 古いエントリを削除
    await this.redisClient.zremrangebyscore(key, 0, windowStart)
    
    // 現在のリクエスト数取得
    const currentCount = await this.redisClient.zcard(key)
    
    if (currentCount >= config.maxRequests) {
      const oldestRequest = await this.redisClient.zrange(key, 0, 0, 'WITHSCORES')
      const resetTime = oldestRequest[1] ? Number(oldestRequest[1]) + config.windowMs : now + config.windowMs
      
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: new Date(resetTime),
        retryAfter: Math.ceil((resetTime - now) / 1000)
      }
    }

    // リクエスト記録
    await this.redisClient.zadd(key, now, `${now}-${Math.random()}`)
    await this.redisClient.expire(key, Math.ceil(config.windowMs / 1000))

    return {
      allowed: true,
      remainingRequests: config.maxRequests - currentCount - 1,
      resetTime: new Date(now + config.windowMs),
      retryAfter: 0
    }
  }
}

export interface RateLimitResult {
  allowed: boolean
  remainingRequests: number
  resetTime: Date
  retryAfter: number // seconds
}
```

### 2.6 統合監視・メトリクス

#### 2.6.1 APIパフォーマンス監視
```typescript
export interface ApiMetrics {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  requestSize: number
  responseSize: number
  timestamp: Date
  tenantId: string
  userId?: string
  errorDetails?: any
}

export class ApiMonitoringManager {
  private redisClient: HotelRedisClient

  /**
   * APIメトリクス記録
   */
  async recordApiMetrics(metrics: ApiMetrics): Promise<void> {
    const key = `metrics:api:${metrics.tenantId}:${new Date().toISOString().split('T')[0]}`
    
    // リアルタイムメトリクス記録
    await this.redisClient.pushToQueue(`metrics:realtime`, metrics)
    
    // 日次集計データ更新
    await this.updateDailyAggregates(metrics)
    
    // アラート条件チェック
    await this.checkAlertConditions(metrics)
  }

  /**
   * パフォーマンス集計
   */
  async getDailyMetrics(
    tenantId: string,
    date: Date
  ): Promise<DailyApiMetrics> {
    const key = `metrics:daily:${tenantId}:${date.toISOString().split('T')[0]}`
    const data = await this.redisClient.getCache(key)
    
    return data || {
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0,
      topEndpoints: [],
      slowestEndpoints: []
    }
  }

  /**
   * リアルタイムアラート
   */
  private async checkAlertConditions(metrics: ApiMetrics): Promise<void> {
    // レスポンス時間アラート
    if (metrics.responseTime > 5000) { // 5秒超過
      await this.sendAlert('SLOW_RESPONSE', {
        endpoint: metrics.endpoint,
        responseTime: metrics.responseTime,
        threshold: 5000
      })
    }

    // エラー率アラート
    if (metrics.statusCode >= 500) {
      await this.sendAlert('SERVER_ERROR', {
        endpoint: metrics.endpoint,
        statusCode: metrics.statusCode,
        errorDetails: metrics.errorDetails
      })
    }
  }
}

export interface DailyApiMetrics {
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  topEndpoints: Array<{ endpoint: string; count: number }>
  slowestEndpoints: Array<{ endpoint: string; avgTime: number }>
}
```

## 3. セキュリティ強化 (Security Enhancements)

### 3.1 API間通信暗号化

#### 3.1.1 相互TLS認証
```typescript
export interface MutualTLSConfig {
  clientCertPath: string
  clientKeyPath: string
  caCertPath: string
  serverName: string
  insecureSkipVerify: boolean
}

export class SecureApiClient extends EnhancedHotelApiClient {
  /**
   * 相互TLS設定
   */
  private setupMutualTLS(config: MutualTLSConfig): void {
    const httpsAgent = new https.Agent({
      cert: fs.readFileSync(config.clientCertPath),
      key: fs.readFileSync(config.clientKeyPath),
      ca: fs.readFileSync(config.caCertPath),
      servername: config.serverName,
      rejectUnauthorized: !config.insecureSkipVerify
    })

    this.client.defaults.httpsAgent = httpsAgent
  }

  /**
   * API署名検証
   */
  private signRequest(config: AxiosRequestConfig): void {
    const timestamp = Date.now().toString()
    const payload = `${config.method?.toUpperCase()}${config.url}${timestamp}${JSON.stringify(config.data || '')}`
    
    const signature = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(payload)
      .digest('hex')

    config.headers = {
      ...config.headers,
      'X-Timestamp': timestamp,
      'X-Signature': signature
    }
  }
}
```

### 3.2 セキュリティ監査ログ

#### 3.2.1 包括的監査ログ
```typescript
export interface SecurityAuditLog {
  eventType: 'API_ACCESS' | 'AUTH_FAILURE' | 'SUSPICIOUS_ACTIVITY'
  timestamp: Date
  userId?: string
  tenantId: string
  sourceSystem: string
  targetSystem: string
  action: string
  resource: string
  ipAddress: string
  userAgent: string
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED'
  riskScore: number
  details: Record<string, any>
}

export class SecurityAuditManager {
  /**
   * セキュリティイベント記録
   */
  async logSecurityEvent(auditLog: SecurityAuditLog): Promise<void> {
    // Redis Streams への記録
    await this.redisClient.xadd(
      'security:audit:stream',
      '*',
      'event', JSON.stringify(auditLog)
    )

    // 高リスクイベントの即座処理
    if (auditLog.riskScore > 80) {
      await this.handleHighRiskEvent(auditLog)
    }

    // 日次集計更新
    await this.updateSecurityMetrics(auditLog)
  }

  /**
   * 異常検知
   */
  async detectAnomalousActivity(
    userId: string,
    tenantId: string
  ): Promise<AnomalyDetectionResult> {
    const recentActivity = await this.getRecentActivity(userId, tenantId)
    
    // 複数の異常パターンチェック
    const anomalies = [
      this.checkUnusualAccessPatterns(recentActivity),
      this.checkRapidFireRequests(recentActivity),
      this.checkGeographicalAnomalies(recentActivity),
      this.checkPermissionEscalation(recentActivity)
    ].filter(a => a.detected)

    return {
      anomaliesDetected: anomalies.length > 0,
      riskScore: this.calculateRiskScore(anomalies),
      anomalies,
      recommendedActions: this.getRecommendedActions(anomalies)
    }
  }
}
```

## 4. 実装スケジュール (Implementation Schedule)

### 4.1 Phase 1: 基盤強化 (1週間)

#### Week 1: 認証統合・基盤強化
- **Day 1-2**: EnhancedHotelApiClient実装
  - JWT自動リフレッシュ機能
  - Redis セッション統合
  - 統一認証ヘッダー
- **Day 3-4**: エラーハンドリング強化
  - RetryManager実装
  - CircuitBreakerManager実装
  - インテリジェントリトライ
- **Day 5-7**: キャッシュシステム統合
  - ApiCacheManager実装
  - Redis統合キャッシュ
  - バックグラウンドリフレッシュ

### 4.2 Phase 2: 高度機能実装 (2週間)

#### Week 1: レート制限・監視
- **Day 1-3**: 分散レート制限システム
  - DistributedRateLimiter実装
  - スライディングウィンドウアルゴリズム
  - トークンバケットアルゴリズム
- **Day 4-7**: 監視・メトリクス
  - ApiMonitoringManager実装
  - リアルタイムメトリクス収集
  - アラートシステム

#### Week 2: セキュリティ強化
- **Day 1-4**: セキュリティ強化
  - 相互TLS認証
  - API署名検証
  - セキュリティ監査ログ
- **Day 5-7**: 異常検知システム
  - SecurityAuditManager実装
  - 異常行動検知アルゴリズム
  - リスクスコア計算

### 4.3 Phase 3: 統合・最適化 (1週間)

#### Week 1: システム統合・テスト
- **Day 1-3**: システム統合テスト
  - 3システム間API連携テスト
  - 負荷テスト・性能検証
  - セキュリティペネトレーションテスト
- **Day 4-5**: 最適化
  - パフォーマンスチューニング
  - メモリ使用量最適化
  - ネットワーク効率化
- **Day 6-7**: 運用準備
  - 監視ダッシュボード設定
  - アラート設定
  - 運用手順書作成

## 5. 成功指標・運用メトリクス (Success Metrics)

### 5.1 技術指標
- **API応答時間**: 平均200ms以下、95%ile 500ms以下
- **認証成功率**: 99.99%以上
- **キャッシュヒット率**: 85%以上
- **エラー率**: 0.1%以下
- **可用性**: 99.9%以上

### 5.2 セキュリティ指標
- **認証失敗検知**: 100%検知率
- **異常行動検知**: 95%以上検知率
- **セキュリティインシデント**: 月間0件
- **データ漏洩**: 0件

### 5.3 運用指標
- **API統合時間**: 各システム4時間以内
- **開発効率向上**: 30%向上
- **運用コスト削減**: 25%削減
- **システム間データ整合性**: 99.99%

---

**注意事項**:
1. この設計は既存の優秀な実装を基盤として拡張する
2. 段階的実装により既存システムへの影響を最小化
3. セキュリティと性能のバランスを重視
4. 運用監視機能を最初から組み込む 