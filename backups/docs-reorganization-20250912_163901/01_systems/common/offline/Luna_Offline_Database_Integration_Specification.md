# 🌙 Luna専用：オフライン・統合DB運用完全仕様書

**仕様書ID**: LUNA-OFFLINE-DB-SPEC-001  
**対象システム**: hotel-pms（Tsukuyomi）  
**作成日**: 2025年1月23日  
**管理者**: Iza（統合管理者）  
**準拠**: hotel-common統一基盤

---

## 🎯 **運用アーキテクチャ概要**

### **デュアルDB運用モデル**
```yaml
Primary Database (オンライン):
  - PostgreSQL: hotel_unified_db
  - 用途: 統合基盤・他システム連携・最新データ
  - 接続: hotel-common UnifiedPrismaClient

Secondary Database (オフライン):
  - SQLite + IndexedDB: ローカル保存
  - 用途: オフライン業務継続・高速アクセス
  - 管理: Drizzle ORM + hotel-pms独自実装
```

---

## 🔄 **１. データ同期システム仕様**

### **1.1 asyncQueue同期機構**（hotel-pms実装済み）
```typescript
interface SyncQueueItem {
  uuid: string;                    // 一意識別子
  model: string;                   // データモデル名
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;                    // 実際のデータ
  createdAt: Date;                 // 作成日時
  status: 'queued' | 'syncing' | 'synced' | 'failed';
  retries: number;                 // リトライ回数
  priority: 'high' | 'medium' | 'low'; // 優先度
}
```

### **1.2 同期トリガー**
```yaml
自動同期:
  - 通信復旧検知: navigator.onLine === true
  - 定期同期: 5分間隔
  - イベントベース: チェックアウト直後など重要処理

手動同期:
  - ユーザー操作: 「同期実行」ボタン
  - 管理者指示: 一括同期コマンド

緊急同期:
  - 重要データ: チェックイン/アウト、料金精算
  - 即座優先: status='high'でキュー最優先
```

### **1.3 同期データフロー**
```mermaid
graph TD
    A[PMS操作] --> B[ローカルDB保存]
    B --> C[asyncQueue格納]
    C --> D{通信状態}
    D -->|オンライン| E[PostgreSQL同期]
    D -->|オフライン| F[キュー保持]
    F --> G[通信復旧検知]
    G --> H[差分同期実行]
    E --> I[同期完了・キューから削除]
    H --> I
```

---

## 🏗️ **２. デュアルDB実装仕様**

### **2.1 hotel-common UnifiedPrismaClient統合**
```typescript
// hotel-pms/src/database/unified-connection.ts
import { UnifiedPrismaClient } from 'hotel-common'

export class PMSUnifiedDatabase {
  private unifiedClient: UnifiedPrismaClient
  private localDb: DrizzleDB // SQLite
  
  constructor() {
    this.unifiedClient = new UnifiedPrismaClient({
      datasource: {
        url: process.env.DATABASE_URL // PostgreSQL
      }
    })
  }
  
  // デュアル書き込み実装
  async createReservation(data: ReservationData) {
    const reservation = await Promise.allSettled([
      // 1. ローカル優先（高速・オフライン対応）
      this.localDb.insert(reservations).values(data),
      // 2. 統一基盤並行書き込み（他システム連携）
      this.unifiedClient.reservation.create({
        data: {
          ...data,
          tenantId: process.env.TENANT_ID,
          syncedAt: new Date(),
          originSystem: 'hotel-pms'
        }
      })
    ])
    
    return this.handleDualWriteResult(reservation)
  }
}
```

### **2.2 Drizzle ORM + Prisma共存**
```typescript
// 技術スタック共存戦略
interface DatabaseStrategy {
  primary: {
    orm: 'Prisma'
    database: 'PostgreSQL'
    client: 'UnifiedPrismaClient'
    purpose: '統合基盤・他システム連携'
  }
  
  secondary: {
    orm: 'Drizzle'
    database: 'SQLite'
    client: 'DrizzleDB'
    purpose: 'オフライン継続・高速アクセス'
  }
}
```

---

## 📱 **３. オフライン運用仕様**

### **3.1 オフライン対応機能**（hotel-pms実装済み）
```yaml
完全オフライン対応:
  ✅ チェックイン/アウト: ローカル完結
  ✅ 日報データ: IndexedDB保存
  ✅ 客室ステータス: キャッシュ更新
  ✅ アラート・通知ログ: 保留後送信
  ✅ 帳票・CSV出力: ローカル完結

制限機能（オンライン復旧後利用可能）:
  ❌ リアルタイム在庫確認
  ❌ 他システム連携データ取得
  ❌ 会員ポイント更新
```

### **3.2 オフライン認証システム**
```typescript
// hotel-common + hotel-pms統合認証
interface OfflineAuth {
  onlineAuth: {
    method: 'JWT'
    provider: 'hotel-common'
    duration: '8時間'
  }
  
  offlineAuth: {
    method: 'Local PIN'
    storage: 'IndexedDB encrypted'
    fallback: 'Cached JWT'
    permissions: 'limited' // 重要操作制限
  }
  
  hybridMode: {
    auto_switch: true
    recovery_sync: 'automatic'
    conflict_resolution: 'timestamp_priority'
  }
}
```

### **3.3 オフライン UI/UX**（hotel-pms実装済み）
```yaml
通知システム:
  🔌 オフライン中: 画面上部赤バナー常時表示
  🔁 復旧検知: 緑バナー「オンライン復旧・同期開始」
  ⚠️ 同期失敗: 通知アイコン + 詳細確認画面
  ✅ 同期完了: 緑チェック「全データ同期完了」

操作制限表示:
  - オフライン対応機能: 通常動作
  - 制限機能: グレーアウト + 「オフライン中のため使用不可」
  - 同期待ち: 「🔄 同期待ち」アイコン表示
```

---

## ⚔️ **４. データ競合・整合性管理**

### **4.1 競合解決アルゴリズム**（hotel-pms仕様統合）
```typescript
enum ConflictResolution {
  TIMESTAMP_PRIORITY = 'timestamp',  // 最新タイムスタンプ優先
  SYSTEM_PRIORITY = 'system',        // システム優先度
  MANUAL_RESOLUTION = 'manual'       // ユーザー判断
}

const CONFLICT_POLICY = {
  reservation_data: ConflictResolution.SYSTEM_PRIORITY,  // PMS優先
  customer_data: ConflictResolution.SYSTEM_PRIORITY,     // hotel-member優先
  room_status: ConflictResolution.TIMESTAMP_PRIORITY,    // 最新優先
  billing_data: ConflictResolution.MANUAL_RESOLUTION     // ユーザー確認
}
```

### **4.2 整合性チェックシステム**
```typescript
// hotel-common統合監視
interface DataIntegrityCheck {
  realtime: {
    method: 'CRC32_checksum'
    trigger: 'every_sync'
    auto_fix: 'format_errors_only'
  }
  
  daily: {
    method: 'full_data_comparison'
    scope: 'critical_data'
    report: 'management_dashboard'
  }
  
  weekly: {
    method: 'statistical_analysis'
    detection: 'anomaly_patterns'
    alert: 'admin_notification'
  }
}
```

---

## 🚨 **５. エラーハンドリング・復旧**

### **5.1 エラー分類・対応**（hotel-pms実装済み）
```yaml
通信断エラー:
  検知: navigator.onLine === false
  対応: オフライン模式に自動切替
  UI: 🔌「オフライン中」赤バナー常時表示

API同期失敗:
  原因: サーバーエラー(5xx)、タイムアウト
  対応: 最大3回リトライ（指数バックオフ）
  UI: ⚠️「同期エラー」通知 + 詳細確認画面

認証トークン失効:
  対応: ローカルPIN認証で業務継続
  復旧: サイレント再認証 + 差分同期
  UI: 🔑「セッション期限切れ・復旧時再認証」

ローカルDB障害:
  検知: IndexedDB/SQLite書き込み失敗
  対応: 再試行 → 再構築提案
  UI: 💾「保存エラー・データ修復」画面
```

### **5.2 自動復旧システム**
```typescript
// hotel-pms復旧フロー
class PMSRecoveryManager {
  async autoRecovery() {
    const recovery_steps = [
      { step: 1, action: 'connectivity_check', timeout: 30, retry: 3 },
      { step: 2, action: 'auth_validation', timeout: 15, retry: 2 },
      { step: 3, action: 'schema_sync', timeout: 60, retry: 1 },
      { step: 4, action: 'data_differential_sync', timeout: 300, retry: 5 },
      { step: 5, action: 'integrity_verification', timeout: 120, retry: 1 }
    ]
    
    for (const step of recovery_steps) {
      await this.executeRecoveryStep(step)
    }
  }
}
```

---

## 🔧 **６. 技術実装ガイド**

### **6.1 環境設定**
```bash
# 1. hotel-common統合
npm install ../hotel-common
npm install @prisma/client drizzle-orm sqlite3

# 2. 環境変数設定
cat > .env << 'EOF'
# PostgreSQL統一基盤
DATABASE_URL="postgresql://hotel_app:${DB_PASSWORD}@localhost:5432/hotel_unified_db"

# ローカルDB設定
LOCAL_DB_PATH="./data/pms-local.sqlite"
INDEXED_DB_NAME="TsukuyomiPMS"

# 認証設定
JWT_SECRET="hotel-common-shared-secret"
PIN_ENCRYPTION_KEY="pms-local-pin-key"

# 同期設定
SYNC_INTERVAL_MINUTES=5
MAX_RETRY_COUNT=3
OFFLINE_MODE_ENABLED=true
EOF
```

### **6.2 コア実装ファイル**
```yaml
必須実装ファイル:
  src/database/unified-connection.ts: UnifiedPrismaClient統合
  src/database/local-connection.ts: Drizzle SQLite設定
  src/sync/async-queue-manager.ts: 同期キュー管理
  src/auth/hybrid-auth.ts: オンライン/オフライン認証
  src/ui/offline-indicator.tsx: オフライン通知UI
  src/error/recovery-manager.ts: 自動復旧システム
```

---

## ✅ **７. 完了確認基準**

### **7.1 機能確認チェックリスト**
```yaml
デュアルDB運用:
  - [ ] PostgreSQL接続成功
  - [ ] SQLite/IndexedDBローカル保存成功
  - [ ] dual-write正常動作
  - [ ] 競合解決自動処理

オフライン運用:
  - [ ] 通信断時自動切替
  - [ ] チェックイン/アウト継続動作
  - [ ] オフライン認証（PIN）動作
  - [ ] 復旧時自動同期

UI/UX:
  - [ ] オフライン状態表示
  - [ ] 同期状況通知
  - [ ] エラー詳細確認画面
  - [ ] 手動同期ボタン動作
```

### **7.2 性能・安定性基準**
```yaml
性能要件:
  - ローカルDB応答: < 100ms
  - PostgreSQL同期: < 500ms
  - オフライン切替: < 3秒
  - 復旧時同期: < 30秒

安定性要件:
  - オフライン運用: 24時間以上
  - データ整合性: 99.9%以上
  - 同期成功率: 99.5%以上
  - 復旧成功率: 100%
```

---

## 🎯 **８. 実装优先順序**

### **Phase 1: 基盤統合（1週間）**
1. ✅ UnifiedPrismaClient統合
2. ✅ デュアルDB基本実装
3. ✅ 認証システム統合

### **Phase 2: オフライン強化（1週間）**
4. ✅ asyncQueue高度化
5. ✅ 競合解決アルゴリズム
6. ✅ エラーハンドリング完全化

### **Phase 3: 運用最適化（継続）**
7. ⚪ 性能チューニング
8. ⚪ 監視・アラート強化
9. ⚪ UI/UX改善

---

## 📞 **サポート・質問**

### **技術的問題**
- **UnifiedPrismaClient**: Iza（統合管理者）に即座連絡
- **オフライン認証**: hotel-common認証基盤仕様確認
- **競合解決**: データ整合性ポリシー確認

### **運用・仕様確認**
- **優先度判断**: ビジネス影響度に基づく相談
- **新機能要望**: システム統合全体への影響評価
- **緊急障害**: 即座報告・復旧優先

---

**🌙 Luna、この包括仕様に基づいてhotel-pms統合を完璧に実装してください！**

**最終更新**: 2025年1月23日  
**次回レビュー**: 実装完了後 