# メモ機能 システム間共有仕様書

**作成日**: 2025年9月16日  
**作成者**: kaneko (hotel-kanri)  
**対象システム**: hotel-common (中核), hotel-saas, hotel-pms  
**機能**: メモ機能のシステム間共有設計

## 🚨 **重要な実装方針**

### **❌ 禁止事項（厳守）**

**フォールバック・モック・一時対応の全面禁止**
- ❌ フォールバック処理（エラー時の代替処理）
- ❌ モックデータの使用
- ❌ 一時的な回避実装
- ❌ try-catch での例外隠蔽
- ❌ デフォルト値での問題回避
- ❌ 「とりあえず動く」実装

**理由**:
- エラーの隠蔽により問題発見が困難
- 一時対応の恒久化による技術的負債
- システム整合性の破綻
- デバッグ困難化

### **✅ 必須事項**

**正面からの問題解決**
- ✅ エラーは必ず表面化させる
- ✅ 問題の根本原因を特定・解決
- ✅ 適切なエラーハンドリング（隠蔽ではない）
- ✅ 実装前の依存関係確認
- ✅ 段階的だが確実な実装

## 📋 概要

メモ機能を `hotel-common` を中核として、`hotel-saas` と `hotel-pms` の両方からアクセス可能な共有システムとして設計します。

## 🏗️ システム構成

### アーキテクチャ概要

```
┌─────────────────┐    ┌─────────────────┐
│   hotel-saas    │    │   hotel-pms     │
│                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Memo UI     │ │    │ │ Memo UI     │ │
│ │ Components  │ │    │ │ Components  │ │
│ └─────────────┘ │    │ └─────────────┘ │
│        │        │    │        │        │
└────────┼────────┘    └────────┼────────┘
         │                      │
         │   HTTP/REST API      │
         │                      │
    ┌────▼──────────────────────▼────┐
    │        hotel-common            │
    │                                │
    │ ┌────────────────────────────┐ │
    │ │     Memo API Service       │ │
    │ │  - CRUD Operations         │ │
    │ │  - Read Status Management  │ │
    │ │  - Real-time Notifications │ │
    │ └────────────────────────────┘ │
    │                │               │
    │ ┌──────────────▼─────────────┐ │
    │ │      Database              │ │
    │ │  - memos                   │ │
    │ │  - memo_comments           │ │
    │ │  - memo_replies            │ │
    │ │  - memo_read_statuses      │ │
    │ │  - comment_read_statuses   │ │
    │ │  - reply_read_statuses     │ │
    │ └────────────────────────────┘ │
    └─────────────────────────────────┘
```

## 🔐 認証・認可統合

### 統一認証フロー

```typescript
// hotel-common での認証検証
interface MemoAccessRequest {
  staffId: string;        // 統一スタッフID
  tenantId: string;       // テナントID
  sourceSystem: 'saas' | 'pms'; // 呼び出し元システム
  action: 'read' | 'write' | 'delete'; // 操作種別
}

const validateMemoAccess = async (request: MemoAccessRequest): Promise<boolean> => {
  // 1. スタッフの存在確認
  const staff = await getStaffById(request.staffId);
  if (!staff) {
    throw new Error('Staff not found');
  }
  
  // 2. テナント権限確認
  if (staff.tenantId !== request.tenantId) {
    throw new Error('Tenant access denied');
  }
  
  // 3. システム別権限確認
  const hasPermission = await checkSystemPermission(
    request.staffId, 
    request.sourceSystem, 
    request.action
  );
  
  if (!hasPermission) {
    throw new Error('Insufficient permissions');
  }
  
  return true;
};
```

### システム別権限マトリックス

| 操作 | hotel-saas | hotel-pms | 必要権限レベル |
|------|------------|-----------|----------------|
| メモ閲覧 | ✅ | ✅ | baseLevel 1以上 |
| メモ作成 | ✅ | ✅ | baseLevel 2以上 |
| メモ編集 | ✅ | ✅ | 作成者 or baseLevel 3以上 |
| メモ削除 | ✅ | ✅ | 作成者 or baseLevel 4以上 |
| コメント作成 | ✅ | ✅ | baseLevel 1以上 |
| 既読管理 | ✅ | ✅ | 自分のステータスのみ |

## 📡 API設計

### 共通APIエンドポイント (hotel-common)

#### ベースURL
```
hotel-common: http://localhost:3400/api/v1/memos
```

#### 認証ヘッダー
```http
Authorization: Bearer <JWT_TOKEN>
X-Source-System: saas|pms
X-Tenant-ID: <TENANT_UUID>
```

#### 主要エンドポイント

```typescript
// メモ一覧取得（システム間共通）
GET /api/v1/memos
Query Parameters:
- includeReadStatus: boolean
- staffId: string (UUID)
- sourceSystem: 'saas' | 'pms'
- page: number
- pageSize: number
- filterUnreadOnly: boolean

// メモ作成（システム間共通）
POST /api/v1/memos
Body: {
  title: string;
  content: string;
  authorId: string; // staffId
  sourceSystem: 'saas' | 'pms';
  tenantId: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
}

// 既読処理（システム間共通）
POST /api/v1/memos/read-status
Body: {
  targetType: 'memo' | 'comment' | 'reply';
  targetId: string;
  staffId: string;
  sourceSystem: 'saas' | 'pms';
}
```

## 🗄️ データベース設計（hotel-common）

### 拡張されたテーブル設計

```sql
-- メモテーブル（システム情報追加）
CREATE TABLE memos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL, -- staff.id
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    tags JSONB DEFAULT '[]',
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL, -- staff.id
    updated_by UUID,
    
    CONSTRAINT fk_memos_tenant_id FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_memos_author_id FOREIGN KEY (author_id) REFERENCES staff(id),
    CONSTRAINT fk_memos_created_by FOREIGN KEY (created_by) REFERENCES staff(id),
    CONSTRAINT fk_memos_updated_by FOREIGN KEY (updated_by) REFERENCES staff(id)
);

-- 既読ステータステーブル（システム情報追加）
CREATE TABLE memo_read_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL CHECK (source_system IN ('saas', 'pms')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    last_content_hash VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_memo_read_statuses_memo_id 
        FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_read_statuses_staff_id 
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
    CONSTRAINT uq_memo_read_statuses_memo_staff_system 
        UNIQUE(memo_id, staff_id, source_system)
);
```

### システム間データ同期

```sql
-- システム間でのメモアクセス履歴
CREATE TABLE memo_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memo_id UUID NOT NULL,
    staff_id UUID NOT NULL,
    source_system VARCHAR(10) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'read', 'create', 'update', 'delete'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_memo_access_logs_memo_id 
        FOREIGN KEY (memo_id) REFERENCES memos(id) ON DELETE CASCADE,
    CONSTRAINT fk_memo_access_logs_staff_id 
        FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_memo_access_logs_memo_system ON memo_access_logs(memo_id, source_system);
CREATE INDEX idx_memo_access_logs_staff_system ON memo_access_logs(staff_id, source_system);
CREATE INDEX idx_memo_access_logs_created_at ON memo_access_logs(created_at DESC);
```

## 🔄 リアルタイム同期

### WebSocket通知システム

```typescript
// hotel-common でのWebSocket管理
interface MemoNotification {
  type: 'memo_created' | 'memo_updated' | 'memo_deleted' | 'comment_added' | 'unread_count_changed';
  tenantId: string;
  targetSystems: ('saas' | 'pms')[];
  payload: {
    memoId?: string;
    staffId?: string;
    changes?: any;
    unreadCount?: number;
  };
}

const broadcastToSystems = (notification: MemoNotification) => {
  notification.targetSystems.forEach(system => {
    const clients = getConnectedClients(system, notification.tenantId);
    clients.forEach(client => {
      client.send(JSON.stringify(notification));
    });
  });
};
```

### システム別WebSocket接続

```typescript
// hotel-saas での接続
const connectToMemoNotifications = () => {
  const ws = new WebSocket('ws://localhost:3400/ws/memo-notifications');
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      sourceSystem: 'saas',
      tenantId: currentTenant.id,
      staffId: currentStaff.id,
      token: authToken
    }));
  };
};

// hotel-pms での接続（同様の実装）
const connectToMemoNotifications = () => {
  const ws = new WebSocket('ws://localhost:3400/ws/memo-notifications');
  
  ws.onopen = () => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      sourceSystem: 'pms',
      tenantId: currentTenant.id,
      staffId: currentStaff.id,
      token: authToken
    }));
  };
};
```

## 🎨 フロントエンド統合

### hotel-saas での実装

```typescript
// composables/useMemoApi.ts (hotel-saas)
export const useMemoApi = () => {
  const config = useRuntimeConfig();
  const commonApiBase = config.public.hotelCommonApiUrl; // http://localhost:3400

  const fetchMemos = async (params: MemoListParams) => {
    try {
      const response = await $fetch(`${commonApiBase}/api/v1/memos`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Source-System': 'saas',
          'X-Tenant-ID': currentTenant.id
        },
        query: {
          ...params,
          sourceSystem: 'saas'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to fetch memos from common API:', error);
      throw new Error(`メモ取得に失敗しました: ${error.message}`);
    }
  };

  return { fetchMemos };
};
```

### hotel-pms での実装

```typescript
// utils/memoApi.js (hotel-pms)
export const memoApi = {
  async fetchMemos(params) {
    try {
      const response = await fetch(`${HOTEL_COMMON_API_URL}/api/v1/memos`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Source-System': 'pms',
          'X-Tenant-ID': currentTenant.id,
          'Content-Type': 'application/json'
        },
        query: new URLSearchParams({
          ...params,
          sourceSystem: 'pms'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch memos from common API:', error);
      throw new Error(`メモ取得に失敗しました: ${error.message}`);
    }
  }
};
```

## 🧪 システム間テスト

### 統合テストケース

```typescript
describe('Memo System Integration Tests', () => {
  test('SaaSで作成したメモがPMSから閲覧できる', async () => {
    // 1. hotel-saas でメモ作成
    const memo = await saasApi.createMemo({
      title: 'テストメモ',
      content: 'SaaSから作成',
      sourceSystem: 'saas'
    });
    
    // 2. hotel-pms でメモ取得
    const memos = await pmsApi.fetchMemos({
      sourceSystem: 'pms'
    });
    
    // 3. 作成したメモが含まれていることを確認
    const foundMemo = memos.find(m => m.id === memo.id);
    expect(foundMemo).toBeDefined();
    expect(foundMemo.title).toBe('テストメモ');
  });
  
  test('PMSで既読にしたメモがSaaSでも既読になる', async () => {
    // 1. メモ作成
    const memo = await commonApi.createMemo({
      title: 'テストメモ',
      content: 'テスト内容'
    });
    
    // 2. PMS側で既読処理
    await pmsApi.markAsRead({
      targetType: 'memo',
      targetId: memo.id,
      sourceSystem: 'pms'
    });
    
    // 3. SaaS側で既読ステータス確認
    const readStatus = await saasApi.getReadStatus({
      targetType: 'memo',
      targetId: memo.id,
      sourceSystem: 'saas'
    });
    
    expect(readStatus.isRead).toBe(true);
  });
});
```

## 📊 パフォーマンス考慮事項

### システム間通信最適化

```typescript
// バッチ処理による効率化
const batchMemoOperations = async (operations: MemoOperation[]) => {
  // 同一システムからの操作をまとめて処理
  const groupedOps = operations.reduce((acc, op) => {
    if (!acc[op.sourceSystem]) {
      acc[op.sourceSystem] = [];
    }
    acc[op.sourceSystem].push(op);
    return acc;
  }, {} as Record<string, MemoOperation[]>);
  
  // 並列処理で各システムの操作を実行
  const results = await Promise.all(
    Object.entries(groupedOps).map(([system, ops]) =>
      processMemoOperations(system as 'saas' | 'pms', ops)
    )
  );
  
  return results.flat();
};
```

### キャッシュ戦略

```typescript
// Redis を使用したシステム間キャッシュ
const getMemoWithCache = async (memoId: string, sourceSystem: string) => {
  const cacheKey = `memo:${memoId}:${sourceSystem}`;
  
  // キャッシュから取得
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // データベースから取得
  const memo = await getMemoFromDB(memoId);
  
  // 全システム用にキャッシュ（5分間）
  await Promise.all([
    redis.setex(`memo:${memoId}:saas`, 300, JSON.stringify(memo)),
    redis.setex(`memo:${memoId}:pms`, 300, JSON.stringify(memo))
  ]);
  
  return memo;
};
```

## 🚀 デプロイメント戦略

### 段階的デプロイ

**Phase 1: hotel-common 基盤構築**
1. データベーススキーマ作成
2. 基本API実装
3. 認証・認可システム統合

**Phase 2: hotel-saas 統合**
1. 既存メモ機能の移行
2. 共通API呼び出しに変更
3. WebSocket通知統合

**Phase 3: hotel-pms 統合**
1. メモ機能の新規実装
2. 共通API統合
3. UI/UX実装

**Phase 4: 最適化・監視**
1. パフォーマンス最適化
2. 監視システム構築
3. 運用ドキュメント整備

## 📝 運用・保守

### 監視項目

- システム間API呼び出し成功率
- レスポンス時間（システム別）
- WebSocket接続数（システム別）
- データベース負荷
- キャッシュヒット率

### 障害対応

```typescript
// システム障害時の対応
const handleSystemFailure = (failedSystem: 'saas' | 'pms') => {
  // 1. 障害システムからの接続を一時停止
  disconnectSystem(failedSystem);
  
  // 2. 他システムには正常サービス継続
  const activeSystem = failedSystem === 'saas' ? 'pms' : 'saas';
  maintainService(activeSystem);
  
  // 3. 障害ログ記録
  logSystemFailure(failedSystem, new Date());
  
  // 4. 復旧後の同期処理準備
  prepareSyncOnRecovery(failedSystem);
};
```

---

**ドキュメント更新履歴**:
- 2025年9月16日: 初版作成 - システム間共有設計 (kaneko)
