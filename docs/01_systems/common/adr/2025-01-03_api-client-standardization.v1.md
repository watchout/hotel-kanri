# ADR-001: APIクライアント標準化アーキテクチャ判断

**Doc-ID**: ADR-2025-01-03-001  
**Version**: v1.0  
**Status**: Accepted  
**Owner**: 金子裕司  
**Linked-Docs**: SPEC-2025-01-03-002, SPEC-2025-01-03-003  

---

## ステータス
Accepted

## コンテキスト
hotel-common, hotel-member, hotel-pms, hotel-saasの4システム間でAPI通信を標準化する必要がある。既存の優秀な`HotelApiClient`と`HotelUnifiedApiClient`実装が存在するが、統一認証基盤統合、キャッシュ、リトライ、監視機能の追加が必要。

## 判断
既存実装を核とした拡張アプローチを採用し、以下の階層構造でAPIクライアント標準化を実装する：

### 採用アーキテクチャ
```
Application Layer (hotel-member, hotel-pms, hotel-saas)
           ↓
API Client Standardization Layer
├── Enhanced HotelApiClient (HTTP/REST)
├── Enhanced UnifiedClient (Prisma ORM)
└── Integration Management (System Routing)
           ↓
Transport Layer (HTTP/HTTPS, WebSocket, Redis PubSub)
```

### 主要コンポーネント

#### 1. EnhancedHotelApiClient
- JWT自動リフレッシュ機能
- Redis セッション統合
- インテリジェントリトライ
- サーキットブレーカー
- 分散レート制限
- APIパフォーマンス監視

#### 2. 統一認証統合
```typescript
export class EnhancedHotelApiClient extends HotelApiClient {
  private jwtManager: JwtManager
  private redisClient: HotelRedisClient
  
  private async ensureValidToken(): Promise<void> {
    if (this.isTokenExpiringSoon()) {
      await this.refreshToken()
    }
  }
  
  private async validateSession(): Promise<SessionInfo | null> {
    return await this.redisClient.getSession(
      this.config.tenantId, 
      this.config.userId
    )
  }
}
```

#### 3. インテリジェントリトライ・サーキットブレーカー
```typescript
export class RetryManager {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    endpoint: string
  ): Promise<T> {
    // 指数バックオフ + サーキットブレーカー
    // 失敗閾値: 5回、復旧タイムアウト: 60秒
  }
}
```

#### 4. Redis統合キャッシュ
```typescript
export class ApiCacheManager {
  async cachedRequest<T>(
    cacheKey: string,
    apiCall: () => Promise<T>,
    config: CacheConfig
  ): Promise<T> {
    // キャッシュファースト + バックグラウンドリフレッシュ
  }
}
```

## 理由

### 既存実装活用の利点
1. **実績のある基盤**: HotelApiClient、HotelUnifiedApiClientは既に安定稼働
2. **開発効率**: ゼロから構築するより50%以上の工数削減
3. **リスク軽減**: 既存機能への影響最小化

### 拡張機能の必要性
1. **統一認証統合**: JWT + Redis認証基盤との完全統合
2. **高可用性**: リトライ、サーキットブレーカーによる障害耐性
3. **パフォーマンス**: キャッシュ、レート制限による最適化
4. **監視**: リアルタイムメトリクス、アラート機能

### アーキテクチャ選択理由
1. **階層分離**: 関心の分離による保守性向上
2. **拡張性**: 新システム追加時の影響最小化
3. **テスタビリティ**: 各層の独立テスト可能

## 結果
この判断により期待される結果：

### 技術的効果
- API応答時間: 平均200ms以下、95%ile 500ms以下
- 認証成功率: 99.99%以上
- キャッシュヒット率: 85%以上
- エラー率: 0.1%以下

### 運用効果
- API統合時間: 各システム4時間以内
- 開発効率向上: 30%向上
- 運用コスト削減: 25%削減
- システム間データ整合性: 99.99%

### セキュリティ効果
- 相互TLS認証による通信暗号化
- API署名検証による改ざん防止
- 異常行動検知による脅威対応

## 代替案

### 案1: 完全新規実装
- **メリット**: 最新技術スタック、完全カスタマイズ
- **デメリット**: 開発期間長期化、既存機能への影響大
- **却下理由**: リスクが高く、既存実装の品質が十分高い

### 案2: 外部ライブラリ採用
- **メリット**: 開発工数削減、コミュニティサポート
- **デメリット**: カスタマイズ制限、ベンダーロックイン
- **却下理由**: ホテル業界特有の要件に対応困難

### 案3: マイクロサービス化
- **メリット**: 独立デプロイ、技術スタック自由度
- **デメリット**: 運用複雑化、ネットワークレイテンシ
- **却下理由**: 現段階では過剰設計

## 実装への影響

### コードへの影響
- 既存HotelApiClient継承による拡張
- 新規EnhancedHotelApiClientクラス追加
- システム別ファクトリーパターン拡張

### アーキテクチャへの影響
- 認証基盤との密結合
- Redis依存性追加
- 監視システム統合

### 運用への影響
- 新規監視メトリクス追加
- アラート設定更新
- 運用手順書更新

## 関連仕様
- [SPEC-2025-01-03-002]: 統一認証基盤仕様書
- [SPEC-2025-01-03-003]: APIクライアント標準化仕様書（作成予定）

## 変更履歴
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| v1.0 | 2025-01-03 | 初版作成（既存設計書からの移行） | 金子裕司 |