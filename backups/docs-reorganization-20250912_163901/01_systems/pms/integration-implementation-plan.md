# 🚀 統合システム実装計画書

## OmotenasuAI PMS "Tsukuyomi" 連携実装ロードマップ

**基準日**: 2024年12月  
**基盤**: 連携管理者回答済み質問書（integration-requirements-questions.md）

---

## 🎯 **Phase 1: 基盤実装（2週間）**

### **1-1. hotel-common基盤構築（最優先）**

#### 実装必須項目
```typescript
// 1. 共通データスキーマ（Zod）
export const GuestDataSchema = z.object({
  user_id: z.string().uuid(),
  name: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  rank_id: z.number(),
  current_points: z.number(),
  total_stays: z.number()
});

// 2. JWT認証基盤
interface JWTPayload {
  user_id: string;
  role: 'staff' | 'manager' | 'admin' | 'owner';
  permissions: string[];
  hotel_group_id: string;
  exp: number;        // 8時間
  refresh_exp: number; // 30日
}

// 3. 統一APIレスポンス
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

#### 実装スケジュール
- **Week 1**: 基本スキーマ + JWT認証システム
- **Week 2**: API統一フォーマット + エラーコード体系

### **1-2. 予約統合API設計（PMS中心構成）**

#### API エンドポイント設計
```
// PMS主管理（hotel-pms）
POST   /api/v1/reservations          - 予約作成（全チャネル対応）
GET    /api/v1/reservations/{id}     - 予約詳細
PUT    /api/v1/reservations/{id}     - 予約更新
DELETE /api/v1/reservations/{id}     - キャンセル

// hotel-member連携
GET    /api/v1/members/{id}/reservations  - 会員予約履歴
POST   /api/v1/members/reservations       - 会員経由予約作成

// hotel-saas連携  
PATCH  /api/v1/reservations/{id}/services - 付帯サービス追加
```

---

## 🔄 **Phase 2: データ同期実装（3週間）**

### **2-1. Event-driven基盤構築**

#### Pub/Sub イベント設計
```typescript
// リアルタイム同期対象イベント
enum EventType {
  RESERVATION_CREATED = 'reservation.created',
  RESERVATION_UPDATED = 'reservation.updated', 
  CHECKIN_COMPLETED = 'checkin.completed',
  CHECKOUT_COMPLETED = 'checkout.completed',
  GUEST_UPDATED = 'guest.updated',
  POINTS_CHANGED = 'points.changed'
}

interface SystemEvent {
  id: string;
  type: EventType;
  source_system: 'hotel-pms' | 'hotel-member' | 'hotel-saas';
  payload: any;
  timestamp: Date;
  correlation_id: string;
}
```

### **2-2. オフライン同期システム**

#### SQLite同期キュー（PMS側）
```sql
-- 同期待ちキューテーブル
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,  -- JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'queued',  -- queued/syncing/synced/failed
  retry_count INTEGER DEFAULT 0,
  last_error TEXT
);

-- 顧客データキャッシュ
CREATE TABLE guest_cache (
  user_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,      -- JSON
  synced_at DATETIME,
  cache_version TEXT
);
```

---

## ⚔️ **Phase 3: 競合解決システム（2週間）**

### **3-1. データ競合検知・解決**

#### 競合解決アルゴリズム
```typescript
interface ConflictResolution {
  conflict_id: string;
  field: string;
  local_value: any;
  remote_value: any;
  local_timestamp: Date;
  remote_timestamp: Date;
  resolution_strategy: 'auto' | 'manual';
  priority_system: string;
}

// 自動解決ルール
const AUTO_RESOLUTION_RULES = {
  'guest.name': 'latest_timestamp',
  'guest.phone': 'latest_timestamp', 
  'reservation.amount': 'manual_required',
  'reservation.dates': 'manual_required',
  'points.balance': 'hotel_member_priority'
};
```

---

## 🧪 **Phase 4: テスト・品質保証（2週間）**

### **4-1. 統合テスト環境構築**

#### テストテナント
```yaml
# テストテナント情報
test_tenant:
  id: "default"
  name: "テストホテルグループ"
  environment: "development"
  database: "hotel_unified_db"
  api_endpoint: "http://localhost:3400/api/v1"
```

#### テストシナリオ
```yaml
# E2Eテストシナリオ
test_scenarios:
  - name: "会員予約～チェックアウト完全フロー"
    steps:
      1. hotel-member: 会員ログイン
      2. hotel-member: 予約作成
      3. hotel-pms: 予約確認・チェックイン
      4. hotel-saas: 付帯サービス注文
      5. hotel-pms: チェックアウト・会計
      6. hotel-member: ポイント加算確認
      
  - name: "オフライン復旧同期テスト"
    steps:
      1. hotel-pms: ネットワーク切断
      2. hotel-pms: ローカル操作（チェックイン等）
      3. hotel-member: 外部からの会員情報更新
      4. hotel-pms: ネットワーク復旧
      5. 全システム: 差分同期確認
```

---

## 📋 **実装優先度マトリックス**

| 項目 | 緊急度 | 重要度 | 実装期間 | 依存関係 |
|------|--------|--------|----------|----------|
| hotel-common基盤 | 🔥高 | 🔥高 | 2週間 | - |
| JWT認証統合 | 🔥高 | 🔥高 | 1週間 | hotel-common |
| 予約統合API | 🔥高 | 🔥高 | 2週間 | hotel-common |
| Event-driven基盤 | 🟡中 | 🔥高 | 2週間 | 予約API |
| オフライン同期 | 🟡中 | 🔥高 | 3週間 | Event基盤 |
| 競合解決システム | 🟢低 | 🟡中 | 2週間 | 同期基盤 |
| 統合テスト環境 | 🟡中 | 🟡中 | 2週間 | 全基盤 |

---

## 🎯 **週次マイルストーン**

### **Week 1-2: hotel-common + JWT基盤**
- [ ] TypeScript + Zod スキーマ定義
- [ ] JWT認証ライブラリ実装
- [ ] 統一APIレスポンス形式
- [ ] エラーコード体系

### **Week 3-4: 予約統合API**
- [ ] PMS予約管理API実装
- [ ] hotel-member連携API
- [ ] hotel-saas連携API
- [ ] API統合テスト

### **Week 5-7: Event-driven + 同期**
- [ ] Pub/Subイベント基盤
- [ ] リアルタイム同期実装
- [ ] オフライン同期キュー
- [ ] 差分同期アルゴリズム

### **Week 8-9: 競合解決**
- [ ] 競合検知システム
- [ ] 自動解決ルール
- [ ] 手動解決UI
- [ ] 競合ログ・監査

### **Week 10-11: テスト・統合**
- [ ] E2Eテストシナリオ
- [ ] 負荷・パフォーマンステスト
- [ ] 統合環境構築
- [ ] 運用手順書作成

---

## ⚠️ **要調整事項（緊急）**

### **各システム担当者との調整必要**
1. **hotel-member担当**:
   - 予約機能の切り替えタイミング
   - 会員データ同期APIの詳細仕様
   - 認証統合の移行計画

2. **hotel-saas担当**:
   - 注文データとPMS連携仕様
   - WebSocket実装の調整
   - オフライン時の協調動作

3. **全体調整**:
   - 緊急時エスカレーション体制
   - リリース順序・タイミング
   - 統合テスト環境の構築

---

## 📞 **次週アクション**

### **即座実行（今週）**
1. **hotel-common基盤プロジェクト作成**
2. **各システム担当者とのキックオフMTG**
3. **統合開発環境の準備**

### **来週着手**
1. **TypeScript + Zod スキーマ実装**
2. **JWT認証基盤実装**
3. **API設計ドキュメント詳細化**

---

**📝 更新履歴**:
- 2024年12月: 連携管理者回答に基づく実装計画策定
- 要調整事項の解決に応じて随時更新予定

--- 