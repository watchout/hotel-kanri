# 🏨 客室管理システム間連携詳細設計書（根本的見直し版）
**Room Management Cross-System Integration Design - Revised**

**作成日**: 2025年1月22日（根本的見直し）  
**更新日**: 2025年1月27日（操作ログ仕様追加）  
**責任者**: 🌊 Iza（統合管理者）  
**重要な指摘**: 各システムが主管理システムとして単独動作する必要性  
**新設計思想**: Full CRUD権限 + リアルタイム同期 + 競合解決

> **📋 更新履歴 (2025年1月27日)**  
> **客室状態変更ログ統合仕様の追加** - hotel-common統合管理による更新  
> 詳細仕様: [客室状態変更ログ統合仕様書](integration/specifications/room-operation-log-specification.md)

> **📋 更新履歴 (2025年9月10日)**  
> **客室メモ仕様の追加** - hotel-common統合管理による更新（カテゴリ/可視性/履歴/WSイベント）

---

## 💡 **設計思想の根本的転換**

### **❌ 従来の誤った設計思想**
```typescript
// 間違った前提（PMSありき設計）
interface WrongAssumption {
  premise: "常にPMSが存在し、主管理を行う";
  member_role: "予約導線のみの限定機能";
  saas_role: "参照専用のサービス提供";
  problem: "単独導入時に機能不全を起こす";
}
```

### **✅ 正しい設計思想（ユーザー指摘）**
```typescript
// 正しい前提（システム独立運用）
interface CorrectDesignPhilosophy {
  saas_only: "客室追加・変更・削除 + 注文管理の完全運用";
  member_only: "予約 + 客室 + 料金プラン + 予約マスタの完全管理";
  pms_main: "フロント業務 + 全機能統合の完全運用";
  
  integration_mode: "3システム連携時は全てから操作可能";
  sync_strategy: "統一DB + リアルタイム同期 + 競合解決";
  core_principle: "どこからでも操作可能、常に同期状態";
}
```

---

## 🏗️ **新・客室管理権限マトリックス（Full CRUD）**

### **📊 完全権限マトリックス**

| 操作カテゴリ | hotel-saas | hotel-member | hotel-pms | 同期方式 |
|-------------|------------|--------------|-----------|----------|
| **🏨 客室マスタ管理** |
| 客室追加 | ✅ **Full権限** | ✅ **Full権限** | ✅ **Full権限** | リアルタイム同期 |
| 客室情報更新 | ✅ **Full権限** | ✅ **Full権限** | ✅ **Full権限** | リアルタイム同期 |
| 客室削除 | ✅ **Full権限** | ✅ **Full権限** | ✅ **Full権限** | 安全削除チェック |
| 客室状態管理 | ✅ **Full権限** | ✅ **Full権限** | ✅ **Full権限** | リアルタイム同期 |
| **💰 料金管理** |
| 基本料金設定 | ✅ **Full権限** | ✅ **Full権限** | ✅ **Full権限** | リアルタイム同期 |
| 季節料金 | ✅ **Full権限** | ✅ **Full権限** | ✅ **Full権限** | リアルタイム同期 |
| 会員価格 | ❌ 機能外 | ✅ **Full権限** | ✅ **Full権限** | リアルタイム同期 |
| サービス料金 | ✅ **Full権限** | ❌ 機能外 | ✅ **Full権限** | リアルタイム同期 |
| **📅 予約管理** |
| 予約作成 | ✅ **Full権限** | ✅ **Full権限** | ✅ **Full権限** | リアルタイム同期 |
| 予約変更 | ✅ **Full権限** | ✅ **Full権限** | ✅ **Full権限** | リアルタイム同期 |
| 予約削除 | ✅ **Full権限** | ✅ **Full権限** | ✅ **Full権限** | 安全削除チェック |
| チェックイン/アウト | ❌ 機能外 | ✅ **Full権限** | ✅ **Full権限** | リアルタイム同期 |

### **🎯 システム別主要機能分担**

#### **🏪 hotel-saas（サービス特化運用）**
```typescript
interface SaaSFullOperation {
  // 客室管理（サービス提供視点）
  room_management: {
    create: "サービス提供可能な客室追加",
    update: "設備・アメニティ・サービス対応情報",
    delete: "サービス提供終了・改装等",
    status: "清掃状況・サービス準備状況"
  },
  
  // 料金管理（サービス連動）
  pricing: {
    base_rates: "基本宿泊料金設定",
    service_bundles: "サービス込み料金パッケージ",
    seasonal_rates: "季節・イベント連動料金"
  },
  
  // 予約管理（ゲスト向け）
  reservation: {
    guest_booking: "ゲストからの直接予約",
    service_reservation: "サービス付き予約",
    modification: "予約変更・追加サービス"
  }
}
```

#### **🎯 hotel-member（会員特化運用）**
```typescript
interface MemberFullOperation {
  // 客室管理（会員価値視点）
  room_management: {
    create: "会員向け客室・ランク別アクセス設定",
    update: "会員特典・ポイント対象設備",
    delete: "会員アクセス制限・代替案提示",
    status: "会員予約優先度管理"
  },
  
  // 料金管理（会員価格）
  pricing: {
    member_rates: "ランク別会員価格設定",
    point_discounts: "ポイント利用料金計算",
    loyalty_pricing: "長期会員優待価格"
  },
  
  // 予約管理（会員サービス）
  reservation: {
    member_booking: "会員専用予約・優先予約",
    loyalty_benefits: "ランク特典自動適用",
    history_management: "宿泊履歴・リピート管理"
  }
}
```

#### **💼 hotel-pms（統合業務運用）**
```typescript
interface PMSFullOperation {
  // 客室管理（運営視点）
  room_management: {
    create: "物理的客室追加・運用設定",
    update: "メンテナンス・設備更新",
    delete: "廃止・用途変更・安全削除",
    status: "リアルタイム稼働状況管理"
  },
  
  // 料金管理（収益最適化）
  pricing: {
    dynamic_pricing: "需要連動価格設定",
    revenue_optimization: "収益最適化料金",
    cost_management: "原価・利益率管理"
  },
  
  // 予約管理（統合オペレーション）
  reservation: {
    all_channel_booking: "全チャネル予約統合",
    front_desk_operation: "フロント直接操作",
    ota_integration: "OTA連携・在庫管理"
  }
}
```

---

## 🔄 **統一データベース + リアルタイム同期設計**

### **📊 同期戦略**

#### **1. 同時操作競合解決**
```typescript
interface ConcurrentOperationStrategy {
  // タイムスタンプベース楽観的ロック
  optimistic_locking: {
    field: "updated_at",
    conflict_detection: "millisecond_precision",
    resolution: "business_rule_priority"
  },
  
  // ビジネスルール優先度
  business_priority: {
    // 緊急度・重要度による自動解決
    emergency_operations: "PMSからの緊急ブロック",
    revenue_impact: "料金設定はPMS > Member > SaaS",
    customer_service: "予約関連はMember > PMS > SaaS",
    operational: "状態管理はPMS > SaaS > Member"
  },
  
  // 手動解決が必要なケース
  manual_resolution: {
    triggers: [
      "同一フィールドの大幅変更（料金50%以上変動等）",
      "重要フィールドの競合（客室番号・capacity等）",
      "顧客影響大（予約済み客室の削除等）"
    ]
  }
}
```

#### **2. リアルタイム同期イベント**

> **📋 更新履歴 (2025年1月27日)**  
> **客室状態変更ログの詳細化対応** - hotel-common統合管理による更新  
> 詳細仕様: [客室状態変更ログ統合仕様書](integration/specifications/room-operation-log-specification.md)

```typescript
// 全システム共通の操作イベント
interface UniversalRoomEvent {
  event_type: 'room.created' | 'room.updated' | 'room.deleted' | 'room.status_changed'
  source_system: 'hotel-saas' | 'hotel-member' | 'hotel-pms'
  tenant_id: string
  room_id: string
  
  // v2.0: 詳細アクション対応
  action: 'ROOM_CLEANING_START' | 'ROOM_CLEANING_COMPLETE' | 'ROOM_MAINTENANCE_START' | 
          'ROOM_MAINTENANCE_COMPLETE' | 'ROOM_BLOCK' | 'ROOM_UNBLOCK' | 'ROOM_OUT_OF_ORDER' |
          'ROOM_BACK_IN_SERVICE' | 'ROOM_INSPECTION' | 'ROOM_SETUP_COMPLETE' | 
          'ROOM_AMENITY_RESTOCK' | 'ROOM_DEEP_CLEANING' | 'UPDATE_STATUS'
  
  operation_context: {
    operation_type: 'emergency' | 'scheduled' | 'routine' | 'customer_triggered'
    operation_category: 'cleaning' | 'maintenance' | 'guest_service' | 'system' | 'emergency'
    business_justification: string
    expected_impact: 'low' | 'medium' | 'high' | 'critical'
    operator_id: string
    department?: string
    actual_duration?: number  // 実際の所要時間（分）
    quality_check?: 'passed' | 'failed' | 'pending' | 'not_required'
  }
  
  sync_requirements: {
    real_time_systems: string[]  // 即座同期対象
    batch_systems: string[]      // バッチ同期可能
    notification_required: boolean
  }
  
  rollback_info: {
    reversible: boolean
    rollback_procedure: string
    affected_reservations: number
  }
}
```

```typescript
// 客室メモ関連イベント（Phase 2 で配信開始）
type RoomMemoEventType =
  | 'MEMO_CREATED'
  | 'MEMO_UPDATED'
  | 'MEMO_STATUS_CHANGED'
  | 'MEMO_COMMENT_ADDED'
  | 'MEMO_DELETED'

interface RoomMemoEvent {
  event_type: RoomMemoEventType
  tenant_id: string
  room_id: string
  memo_id: string
  correlation_id: string
  sequence?: number
  timestamp: string
  data: {
    category: 'reservation' | 'handover' | 'lost_item' | 'maintenance' | 'cleaning' | 'guest_request' | 'other'
    visibility: 'public' | 'private' | 'role'
    visible_roles?: string[]
    status?: 'pending' | 'in_progress' | 'completed'
    priority?: 'low' | 'normal' | 'high' | 'urgent'
    created_by_staff_id?: string
    assigned_to_staff_id?: string
  }
}
```

**可視性/権限**
- `visibility = public`：同一テナント内の権限保持者に公開
- `visibility = private`：作成者および管理権限者のみ
- `visibility = role`：`visible_roles` に一致する役割のみ（例: `front`, `cleaning`, `maintenance`, `manager`）

#### **v2.0 客室操作ログ統合対応 (2025年1月27日追加)**

**詳細な客室操作アクション**:
- 清掃関連: `ROOM_CLEANING_START`, `ROOM_CLEANING_COMPLETE`, `ROOM_CLEANING_INSPECTION`, `ROOM_CLEANING_FAILED`
- メンテナンス関連: `ROOM_MAINTENANCE_START`, `ROOM_MAINTENANCE_COMPLETE`, `ROOM_REPAIR_REQUEST`, `ROOM_REPAIR_COMPLETE`
- 客室管理関連: `ROOM_BLOCK`, `ROOM_UNBLOCK`, `ROOM_OUT_OF_ORDER`, `ROOM_BACK_IN_SERVICE`
- 業務操作関連: `ROOM_INSPECTION`, `ROOM_SETUP_COMPLETE`, `ROOM_AMENITY_RESTOCK`, `ROOM_DEEP_CLEANING`

**統合ログ管理**: 全システムからの客室操作が統一的にログ記録され、リアルタイム同期される

### **🛡️ 安全削除・重要操作チェック**

#### **削除時の統合チェックシステム**
```typescript
interface SafeDeletionProtocol {
  // マルチシステム横断チェック
  cross_system_validation: {
    hotel_saas: {
      active_orders: "進行中の注文・サービスチェック",
      scheduled_services: "予定されているサービスチェック",
      guest_in_room: "現在の客室利用状況"
    },
    
    hotel_member: {
      future_reservations: "会員の将来予約チェック",
      loyalty_commitments: "会員特典・約束事項チェック",
      points_tied_bookings: "ポイント利用予約チェック"
    },
    
    hotel_pms: {
      maintenance_schedule: "メンテナンス予定チェック",
      financial_commitments: "財務的コミットメントチェック",
      regulatory_requirements: "法的要件・消防法等チェック"
    }
  },
  
  // 段階的削除プロセス
  staged_deletion: {
    phase_1: "新規予約停止（全システム）",
    phase_2: "既存予約の移行・変更（顧客合意）",
    phase_3: "進行中サービスの完了・移行",
    phase_4: "最終確認・物理的削除実行"
  },
  
  // 緊急削除（安全上の理由）
  emergency_deletion: {
    triggers: ["安全上の問題", "法的要求", "緊急メンテナンス"],
    override_checks: true,
    immediate_notification: "全関係者・顧客",
    compensation_protocol: "自動代替案提示・補償"
  }
}
```

---

## 🎯 **システム別運用シナリオ**

### **📱 Scenario 1: SaaSのみ運用店舗**
```typescript
interface SaaSOnlyOperation {
  use_case: "カフェ併設の小規模宿泊施設・ゲストハウス"
  
  room_operations: {
    add_room: "新しいドミトリーベッド・個室追加",
    manage_amenities: "WiFi・共用設備・サービス設定",
    pricing: "シンプルな固定料金・サービス込み料金",
    booking: "ゲスト直接予約・サービス連動予約"
  }
  
  integration_benefits: {
    unified_database: "将来的なMember/PMS追加時に完全引き継ぎ",
    event_driven: "他システム導入時の自動連携",
    scalability: "成長に合わせた機能拡張"
  }
}
```

### **🎯 Scenario 2: Memberのみ運用店舗**
```typescript
interface MemberOnlyOperation {
  use_case: "会員制リゾート・長期滞在型宿泊施設"
  
  full_operations: {
    room_management: "会員ランク別客室・特典設定",
    pricing_strategy: "複雑な会員価格・ポイント料金",
    reservation_system: "会員専用予約・履歴管理",
    loyalty_program: "滞在ポイント・特典管理"
  }
  
  member_specific_features: {
    room_allocation: "ランクベース客室自動割当",
    dynamic_pricing: "会員履歴ベース価格最適化",
    personalized_service: "過去履歴ベースのサービス提案"
  }
}
```

### **💼 Scenario 3: 3システム統合運用**
```typescript
interface IntegratedOperation {
  use_case: "大型ホテル・フルサービスリゾート"
  
  seamless_operation: {
    any_system_access: "どのシステムからでも全操作可能",
    real_time_sync: "操作と同時に全システム反映",
    role_based_ui: "システム別に最適化されたインターフェース",
    unified_reporting: "全システムの統合レポート・分析"
  }
  
  advanced_features: {
    cross_system_workflow: "SaaS注文 → Member履歴 → PMS請求の自動フロー",
    intelligent_routing: "最適システムへの自動処理振り分け",
    predictive_management: "3システムデータ統合による予測・最適化"
  }
}
```

---

## 📊 **実装戦略・技術アーキテクチャ**

### **🚀 技術実装アプローチ**

#### **1. データベース設計（変更なし）**
```sql
-- 統一PostgreSQLスキーマは現在のまま維持
-- どのシステムからも同一テーブルへフルアクセス
-- ソーストラッキングで操作元を記録

-- 例: roomテーブル
CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  room_number VARCHAR NOT NULL,
  room_type VARCHAR NOT NULL,
  
  -- 全システム更新可能フィールド
  amenities JSONB DEFAULT '{}',
  base_price DECIMAL(10,2),
  capacity INTEGER,
  status room_status DEFAULT 'AVAILABLE',
  
  -- ソーストラッキング（操作履歴）
  origin_system VARCHAR NOT NULL,
  updated_by_system VARCHAR NOT NULL,
  synced_at TIMESTAMP DEFAULT NOW(),
  
  -- 標準監査フィールド
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

#### **2. API設計（統一エンドポイント）**
```typescript
// 各システム共通のRoom Management API
interface UnifiedRoomAPI {
  // CRUD操作（全システム共通）
  'POST /api/v2/rooms': CreateRoomRequest
  'GET /api/v2/rooms': GetRoomsRequest  
  'PUT /api/v2/rooms/{id}': UpdateRoomRequest
  'DELETE /api/v2/rooms/{id}': DeleteRoomRequest
  
  // システム特化エンドポイント
  'GET /api/v2/rooms/saas-context': GetRoomsForServiceRequest
  'GET /api/v2/rooms/member-pricing': GetRoomsWithMemberRatesRequest
  'GET /api/v2/rooms/pms-operations': GetRoomsOperationalStatusRequest
}

// リクエスト共通フォーマット
interface BaseRoomRequest {
  tenant_id: string
  operation_context: {
    source_system: 'hotel-saas' | 'hotel-member' | 'hotel-pms'
    operation_reason: string
    expected_impact: 'low' | 'medium' | 'high' | 'critical'
  }
}
```

#### **3. Event-driven同期（強化）**
```typescript
// 統一イベントパブリッシャー
class UniversalRoomEventPublisher {
  static async publishRoomChange(
    event_type: RoomEventType,
    source_system: SystemType,
    room_data: Room,
    change_context: ChangeContext
  ) {
    // 1. 即座に全システムに配信
    await this.broadcastToAllSystems(event_type, room_data)
    
    // 2. 競合チェック・解決
    const conflicts = await this.detectConflicts(room_data)
    if (conflicts.length > 0) {
      await this.resolveConflicts(conflicts, change_context)
    }
    
    // 3. 監査ログ記録
    await this.auditLog(event_type, source_system, room_data)
  }
}
```

---

## ✨ **新設計の革新性・優位性**

### **🌟 従来システムとの差別化**
1. **True Universal Access**: どのシステムからでも完全操作可能
2. **Business-Context Aware Sync**: ビジネス文脈を理解した同期
3. **Graceful Conflict Resolution**: 自動 + 手動のハイブリッド競合解決
4. **Staged Safety Operations**: 段階的な安全操作（削除等）
5. **Future-Proof Architecture**: システム追加・削除に完全対応

### **💰 事業価値**
- **導入柔軟性**: 1システムから段階的導入可能
- **運用継続性**: システム障害時も他システムで継続
- **データ資産保護**: 統一DBでデータ損失なし
- **スケーラビリティ**: 事業成長に合わせた拡張性
- **ROI最大化**: 段階的投資で即座に効果実現

---

## 🎯 **修正された実装計画**

### **🚀 Phase 1: Full CRUD実装（3週間）**
- **Week 1**: 各システムでのRoom Management API完全実装
- **Week 2**: 統一Event-driven同期システム実装
- **Week 3**: 競合解決・安全削除システム実装

### **🔄 Phase 2: 単独運用テスト（2週間）**
- **Week 4**: SaaSのみ、Memberのみ運用テスト
- **Week 5**: 3システム統合運用テスト

### **🌟 Phase 3: 最適化・監視（1週間）**
- **Week 6**: パフォーマンス最適化・監視システム完成

---

**✅ ユーザーの指摘を完全に反映した新設計:**

1. **✅ SaaSのみ**: 客室追加・変更・削除の完全機能
2. **✅ Memberのみ**: 予約・客室・料金プランの完全管理
3. **✅ 統一DB**: どこからでも操作、常に同期状態
4. **✅ Full CRUD**: 全システムから全操作可能

**この設計により、真に柔軟で拡張性の高いホテル管理基盤を実現します！** 