# hotel-pms 客室操作ログ連携仕様書

**仕様書ID**: PMS-ROOM-LOG-SPEC-2025-01-27-001  
**対象システム**: hotel-pms  
**連携先**: hotel-common  
**バージョン**: v2.0  
**作成日**: 2025年1月27日  
**作成者**: hotel-common統合管理  
**ステータス**: 承認済み  

---

## 📋 変更履歴

| バージョン | 日付 | 変更者 | 変更内容 |
|-----------|------|--------|----------|
| v1.0 | 2024年12月 | 初期実装 | 基本的なPMS機能（ログ連携なし） |
| **v2.0** | **2025年1月27日** | **hotel-common** | **客室操作ログ自動送信機能の仕様化** |

---

## 🎯 概要

### 目的
hotel-pmsでの客室操作（清掃、メンテナンス、状態変更等）を自動的にhotel-commonに送信し、統一的なログ管理を実現する。

### 適用範囲
- フロントデスク業務での客室状態変更
- ハウスキーピング業務での清掃・メンテナンス
- 設備管理での修理・点検作業
- 緊急時の客室ブロック・解除

### 前提条件
- hotel-commonとのAPI連携が確立済み
- PMS側でスタッフ認証・権限管理が実装済み
- 客室マスタデータがhotel-commonと同期済み

---

## 🔄 ログ送信対象操作

### 必須送信操作
```typescript
// チェックイン・チェックアウト関連
'CHECKIN'                    // チェックイン処理
'CHECKOUT'                   // チェックアウト処理

// 清掃関連
'ROOM_CLEANING_START'        // 清掃開始
'ROOM_CLEANING_COMPLETE'     // 清掃完了
'ROOM_CLEANING_INSPECTION'   // 清掃点検
'ROOM_CLEANING_FAILED'       // 清掃不合格

// メンテナンス関連
'ROOM_MAINTENANCE_START'     // メンテナンス開始
'ROOM_MAINTENANCE_COMPLETE'  // メンテナンス完了
'ROOM_REPAIR_REQUEST'        // 修理依頼
'ROOM_REPAIR_COMPLETE'       // 修理完了

// 客室管理関連
'ROOM_BLOCK'                 // 客室ブロック
'ROOM_UNBLOCK'               // ブロック解除
'ROOM_OUT_OF_ORDER'          // 故障・利用不可
'ROOM_BACK_IN_SERVICE'       // サービス復帰
'ROOM_INSPECTION'            // 客室点検
```

### 推奨送信操作
```typescript
// 業務効率化
'ROOM_SETUP_COMPLETE'        // 客室準備完了
'ROOM_AMENITY_RESTOCK'       // アメニティ補充
'ROOM_DEEP_CLEANING'         // 特別清掃

// システム管理
'ROOM_STATUS_SYNC'           // 他システムとの状態同期
'ROOM_BULK_UPDATE'           // 一括状態更新
```

---

## 🔧 API連携仕様

### 基本設定
```typescript
// hotel-common API エンドポイント
const HOTEL_COMMON_API = {
  baseUrl: process.env.HOTEL_COMMON_API_URL || 'https://api.hotel-common.com',
  endpoints: {
    operationLogs: '/api/v1/logs/operations'
  },
  authentication: {
    type: 'Bearer',
    tokenSource: 'PMS_API_TOKEN' // 環境変数
  },
  timeout: 5000, // 5秒
  retryPolicy: {
    maxRetries: 3,
    backoffMs: 1000
  }
}
```

### ログ送信実装例
```typescript
// PMS側実装例
class PMSRoomOperationLogger {
  private apiClient: HotelCommonApiClient;
  
  constructor() {
    this.apiClient = new HotelCommonApiClient({
      baseUrl: HOTEL_COMMON_API.baseUrl,
      token: process.env.PMS_API_TOKEN
    });
  }
  
  /**
   * 客室操作ログ送信
   */
  async logRoomOperation(operation: RoomOperation): Promise<void> {
    try {
      const logData = {
        action: operation.action,
        target_type: 'room',
        target_id: operation.roomId,
        details: {
          room_id: operation.roomId,
          room_number: operation.roomNumber,
          old_status: operation.oldStatus,
          new_status: operation.newStatus,
          operation_reason: operation.reason,
          operation_category: this.categorizeOperation(operation.action),
          staff_id: operation.staffId,
          department: operation.department,
          actual_duration: operation.durationMinutes,
          quality_check: operation.qualityCheck,
          triggered_by_system: 'hotel-pms',
          timestamp: new Date().toISOString(),
          notes: operation.notes
        }
      };
      
      await this.apiClient.post('/api/v1/logs/operations', logData);
      
      console.log(`Room operation logged: ${operation.action} for room ${operation.roomNumber}`);
      
    } catch (error) {
      console.error('Failed to log room operation:', error);
      // エラー時は内部ログに記録（必須）
      await this.logToInternalStorage(operation, error);
    }
  }
  
  /**
   * 操作カテゴリ分類
   */
  private categorizeOperation(action: string): string {
    const categoryMap = {
      'ROOM_CLEANING_START': 'cleaning',
      'ROOM_CLEANING_COMPLETE': 'cleaning',
      'ROOM_CLEANING_INSPECTION': 'cleaning',
      'ROOM_CLEANING_FAILED': 'cleaning',
      'ROOM_MAINTENANCE_START': 'maintenance',
      'ROOM_MAINTENANCE_COMPLETE': 'maintenance',
      'ROOM_REPAIR_REQUEST': 'maintenance',
      'ROOM_REPAIR_COMPLETE': 'maintenance',
      'CHECKIN': 'guest_service',
      'CHECKOUT': 'guest_service',
      'ROOM_AMENITY_RESTOCK': 'guest_service',
      'ROOM_BLOCK': 'system',
      'ROOM_UNBLOCK': 'system',
      'ROOM_OUT_OF_ORDER': 'emergency',
      'ROOM_BACK_IN_SERVICE': 'system'
    };
    
    return categoryMap[action] || 'system';
  }
}
```

---

## 📊 送信データ仕様

### 必須フィールド
```typescript
interface PMSRoomOperationLog {
  // API基本情報
  action: string;              // 操作アクション
  target_type: 'room';         // 固定値
  target_id: string;           // 客室ID
  
  // details内必須フィールド
  details: {
    room_id: string;           // 客室ID
    room_number: string;       // 客室番号
    old_status: string;        // 変更前状態
    new_status: string;        // 変更後状態
    triggered_by_system: 'hotel-pms'; // 固定値
    timestamp: string;         // ISO 8601形式
  }
}
```

### 推奨フィールド
```typescript
interface PMSRoomOperationLogExtended extends PMSRoomOperationLog {
  details: PMSRoomOperationLog['details'] & {
    // 操作詳細
    operation_reason?: string;    // 操作理由
    operation_category?: string;  // 自動分類
    actual_duration?: number;     // 実際の所要時間（分）
    
    // スタッフ情報（v2.0）
    staff_id: string;            // スタッフID（必須）
    department?: string;         // 所属部署
    
    // 品質管理
    quality_check?: 'passed' | 'failed' | 'pending' | 'not_required';
    inspection_notes?: string;   // 検査メモ
    
    // 業務情報
    guest_impact?: boolean;      // 宿泊客への影響
    revenue_impact?: number;     // 売上影響額
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    
    // 追加情報
    notes?: string;              // 自由記述
    equipment_involved?: string[]; // 関連設備
  }
}
```

---

## 🔄 実装パターン

### パターン1: リアルタイム送信
```typescript
// 操作完了時に即座に送信
async function completeRoomCleaning(roomId: string, staffId: string) {
  // 1. PMS内部処理
  await updateRoomStatus(roomId, 'available');
  
  // 2. ログ送信
  await pmsLogger.logRoomOperation({
    action: 'ROOM_CLEANING_COMPLETE',
    roomId,
    roomNumber: await getRoomNumber(roomId),
    oldStatus: 'cleaning',
    newStatus: 'available',
    staffId,
    staffName: await getStaffName(staffId),
    department: 'housekeeping',
    qualityCheck: 'passed'
  });
}
```

### パターン2: バッチ送信
```typescript
// 定期的にまとめて送信（推奨: 5分間隔）
class PMSLogBatchSender {
  private pendingLogs: RoomOperation[] = [];
  
  constructor() {
    // 5分間隔でバッチ送信
    setInterval(() => this.sendBatch(), 5 * 60 * 1000);
  }
  
  addLog(operation: RoomOperation) {
    this.pendingLogs.push(operation);
  }
  
  async sendBatch() {
    if (this.pendingLogs.length === 0) return;
    
    const logs = [...this.pendingLogs];
    this.pendingLogs = [];
    
    for (const log of logs) {
      try {
        await pmsLogger.logRoomOperation(log);
      } catch (error) {
        // 失敗したログは次回リトライ
        this.pendingLogs.unshift(log);
      }
    }
  }
}
```

---

## 🚨 エラーハンドリング

### 送信失敗時の対応
```typescript
class PMSLogErrorHandler {
  private failedLogs: RoomOperation[] = [];
  
  async handleLogFailure(operation: RoomOperation, error: Error) {
    // 1. 内部ログに記録
    console.error(`Log send failed for room ${operation.roomNumber}:`, error);
    
    // 2. 失敗ログを保存
    this.failedLogs.push({
      ...operation,
      failedAt: new Date(),
      error: error.message
    });
    
    // 3. 重要操作の場合はアラート
    if (this.isCriticalOperation(operation.action)) {
      await this.sendAlert(`Critical room operation log failed: ${operation.action}`);
    }
    
    // 4. リトライスケジュール
    setTimeout(() => this.retryFailedLog(operation), 60000); // 1分後
  }
  
  private isCriticalOperation(action: string): boolean {
    return ['CHECKIN', 'CHECKOUT', 'ROOM_OUT_OF_ORDER', 'ROOM_BACK_IN_SERVICE'].includes(action);
  }
}
```

### ネットワーク障害時の対応
```typescript
// オフライン時のローカル保存
class PMSOfflineLogStorage {
  private localDb: IndexedDB;
  
  async storeOfflineLog(operation: RoomOperation) {
    await this.localDb.logs.add({
      ...operation,
      storedAt: new Date(),
      syncStatus: 'pending'
    });
  }
  
  async syncPendingLogs() {
    const pendingLogs = await this.localDb.logs
      .where('syncStatus')
      .equals('pending')
      .toArray();
    
    for (const log of pendingLogs) {
      try {
        await pmsLogger.logRoomOperation(log);
        await this.localDb.logs.update(log.id, { syncStatus: 'synced' });
      } catch (error) {
        console.error('Sync failed for log:', log.id, error);
      }
    }
  }
}
```

---

## 📈 監視・分析

### 送信状況監視
```typescript
// PMS管理画面での送信状況表示
interface LogSendingStats {
  totalSent: number;           // 総送信数
  successRate: number;         // 成功率
  averageResponseTime: number; // 平均応答時間
  failedLogs: number;          // 失敗ログ数
  lastSyncTime: Date;          // 最終同期時刻
}

class PMSLogMonitor {
  async getStats(): Promise<LogSendingStats> {
    // 送信統計を取得
    return {
      totalSent: await this.getTotalSentCount(),
      successRate: await this.getSuccessRate(),
      averageResponseTime: await this.getAverageResponseTime(),
      failedLogs: await this.getFailedLogCount(),
      lastSyncTime: await this.getLastSyncTime()
    };
  }
}
```

---

## 🔧 設定・導入

### 環境変数設定
```bash
# hotel-common API接続設定
HOTEL_COMMON_API_URL=https://api.hotel-common.com
PMS_API_TOKEN=your_pms_api_token_here

# ログ送信設定
ROOM_LOG_BATCH_INTERVAL=300000  # 5分（ミリ秒）
ROOM_LOG_RETRY_COUNT=3
ROOM_LOG_TIMEOUT=5000           # 5秒

# デバッグ設定
ROOM_LOG_DEBUG=false
ROOM_LOG_OFFLINE_STORAGE=true
```

### 初期設定手順
1. **API認証設定**: hotel-commonからPMS用APIトークンを取得
2. **客室マスタ同期**: 客室IDとroom_numberの対応確認
3. **スタッフマスタ同期**: staff_idとstaff_nameの対応確認
4. **テスト送信**: 開発環境での動作確認
5. **監視設定**: ログ送信状況の監視ダッシュボード設定

---

## 📅 実装スケジュール

### Phase 1: 基盤実装（2025年2月）
- [ ] API連携ライブラリ実装
- [ ] 基本ログ送信機能
- [ ] エラーハンドリング

### Phase 2: 業務機能統合（2025年3月）
- [ ] 清掃管理画面との連携
- [ ] メンテナンス管理との連携
- [ ] フロントデスク操作との連携

### Phase 3: 監視・分析機能（2025年4月）
- [ ] 送信状況監視
- [ ] 失敗ログ管理
- [ ] 統計レポート機能

---

## 🚨 注意事項

### セキュリティ
- APIトークンの安全な管理
- 個人情報（スタッフ名等）の暗号化送信
- 通信ログの適切な保護

### パフォーマンス
- 大量ログ送信時のAPI負荷対策
- バッチ送信サイズの最適化（推奨: 100件/回）
- タイムアウト設定の調整

### 運用
- ログ送信失敗時のアラート設定
- 定期的な同期状況確認
- hotel-commonとの仕様変更時の対応

---

**承認者**: hotel-common統合管理  
**承認日**: 2025年1月27日  
**次回見直し予定**: 2025年7月27日
