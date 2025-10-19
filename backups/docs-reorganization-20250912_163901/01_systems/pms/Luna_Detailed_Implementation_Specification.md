# 🌙 Luna詳細実装仕様書
**Luna Detailed Implementation Specification**

**作成日**: 2025年1月21日  
**作成者**: Iza（伊邪那岐）統合管理者  
**対象**: Luna（月読）- hotel-pms担当AI  
**バージョン**: 2.0 - 詳細仕様版

---

## 📋 **Lunaの質問への統合管理者回答**

### **✅ 回答サマリー**
1. **詳細仕様具体化**: **必須 - 段階的進行**
2. **既存実装保持**: **保持 + 統合基盤拡張**
3. **MVP6機能仕様策定**: **即座開始 - 並行進行**

---

## 🎯 **MVP必須6機能 - 詳細実装仕様**

### **1. 💎 VIP顧客完全履歴管理**

#### **1.1 データベース詳細設計**
```sql
-- VIPインタラクションテーブル
CREATE TABLE vip_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  staff_id UUID NOT NULL REFERENCES users(id),
  
  -- インタラクション詳細
  interaction_type vip_interaction_type NOT NULL,
  severity INTEGER CHECK (severity BETWEEN 1 AND 5) DEFAULT 3,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  
  -- ステータス管理
  status vip_status NOT NULL DEFAULT 'PENDING',
  resolution_notes TEXT,
  business_impact vip_business_impact DEFAULT 'MEDIUM',
  
  -- フォローアップ管理
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMP,
  follow_up_staff_id UUID REFERENCES users(id),
  
  -- メタデータ
  tags TEXT[],
  attachments JSONB DEFAULT '[]',
  related_reservation_id UUID REFERENCES reservations(id),
  
  -- 統合基盤準拠
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  -- インデックス
  CONSTRAINT vip_interactions_tenant_customer_idx 
    UNIQUE (tenant_id, customer_id, created_at)
);

-- VIP設定・嗜好テーブル
CREATE TABLE vip_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  
  -- 嗜好カテゴリ
  category vip_preference_category NOT NULL,
  preference_key VARCHAR(100) NOT NULL,
  preference_value TEXT NOT NULL,
  importance vip_importance DEFAULT 'MEDIUM',
  
  -- 適用条件
  applicable_services TEXT[],
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  
  -- メタデータ
  notes TEXT,
  last_applied_at TIMESTAMP,
  application_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT vip_preferences_unique 
    UNIQUE (tenant_id, customer_id, category, preference_key)
);

-- ENUMs定義
CREATE TYPE vip_interaction_type AS ENUM (
  'COMPLAINT', 'REQUEST', 'COMPLIMENT', 'SPECIAL_NEED', 
  'DIETARY_RESTRICTION', 'ACCESSIBILITY', 'CELEBRATION', 'BUSINESS_MEETING'
);

CREATE TYPE vip_status AS ENUM (
  'PENDING', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED'
);

CREATE TYPE vip_business_impact AS ENUM (
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
);

CREATE TYPE vip_preference_category AS ENUM (
  'ROOM_PREFERENCE', 'DINING', 'AMENITY', 'SERVICE_TIMING', 
  'COMMUNICATION', 'BILLING', 'ACCESSIBILITY', 'SPECIAL_OCCASIONS'
);

CREATE TYPE vip_importance AS ENUM (
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
);
```

#### **1.2 API詳細仕様**
```typescript
// VIP履歴管理API
interface VipHistoryApi {
  // VIP履歴取得（ページネーション対応）
  'GET /api/vip/{customerId}/history': {
    query: {
      page?: number
      limit?: number  // max 100
      type?: VipInteractionType[]
      severity?: number[]
      dateFrom?: string
      dateTo?: string
      status?: VipStatus[]
    }
    response: {
      interactions: VipInteraction[]
      pagination: {
        page: number
        limit: number
        total: number
        hasNext: boolean
      }
      summary: {
        totalInteractions: number
        averageSeverity: number
        lastInteractionDate: string
        unresolved: number
      }
    }
  }
  
  // VIP履歴作成
  'POST /api/vip/{customerId}/history': {
    body: {
      type: VipInteractionType
      severity: 1 | 2 | 3 | 4 | 5
      title: string
      content: string
      tags?: string[]
      followUpRequired?: boolean
      followUpDate?: string
      relatedReservationId?: string
    }
    response: VipInteraction
  }
  
  // VIP嗜好設定
  'PUT /api/vip/{customerId}/preferences': {
    body: {
      category: VipPreferenceCategory
      preferences: Array<{
        key: string
        value: string
        importance: VipImportance
        notes?: string
      }>
    }
    response: VipPreference[]
  }
}
```

#### **1.3 hotel-member統合仕様**
```typescript
// hotel-member連携イベント
interface VipMemberIntegration {
  // VIP履歴更新時のイベント発行
  onVipHistoryUpdate: {
    event: 'vip.history.updated'
    payload: {
      customerId: string
      interactionId: string
      type: VipInteractionType
      severity: number
      membershipLevel: string
      pointsAwarded?: number
      compensationProvided?: {
        type: 'POINTS' | 'VOUCHER' | 'UPGRADE'
        value: number
        description: string
      }
    }
    targets: ['hotel-member', 'hotel-saas']
  }
  
  // 会員ランク連携
  memberRankSync: {
    trigger: 'vip.interaction.severity.high'
    action: 'auto_rank_review'
    conditions: {
      severityThreshold: 4
      frequencyThreshold: 3  // 30日以内
      autoUpgradeEnabled: boolean
    }
  }
}
```

### **2. 📊 リアルタイム収益ダッシュボード**

#### **2.1 データベース詳細設計**
```sql
-- リアルタイム収益トラッキング
CREATE TABLE revenue_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- 期間・単位
  tracking_date DATE NOT NULL,
  tracking_hour INTEGER CHECK (tracking_hour BETWEEN 0 AND 23),
  room_id UUID REFERENCES rooms(id),
  revenue_category revenue_category_enum NOT NULL,
  
  -- 収益データ
  base_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  service_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- 原価データ
  cost_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  profit_amount DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - cost_amount) STORED,
  profit_margin DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_amount > 0 
    THEN ((total_amount - cost_amount) / total_amount * 100)
    ELSE 0 END
  ) STORED,
  
  -- メタデータ
  transaction_count INTEGER DEFAULT 1,
  source_reservation_id UUID REFERENCES reservations(id),
  source_system revenue_source_enum DEFAULT 'hotel-pms',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT revenue_tracking_unique 
    UNIQUE (tenant_id, tracking_date, tracking_hour, room_id, revenue_category)
);

-- 収益センターマスタ
CREATE TABLE revenue_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  category revenue_category_enum NOT NULL,
  
  -- 目標設定
  daily_target DECIMAL(12,2),
  monthly_target DECIMAL(12,2),
  annual_target DECIMAL(12,2),
  
  -- 集計設定
  auto_calculation BOOLEAN DEFAULT true,
  calculation_schedule VARCHAR(50) DEFAULT 'every_hour',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT revenue_centers_unique UNIQUE (tenant_id, code)
);

CREATE TYPE revenue_category_enum AS ENUM (
  'ROOM_CHARGE', 'RESTAURANT', 'BAR', 'SPA', 'PARKING', 
  'LAUNDRY', 'MINIBAR', 'CONFERENCE', 'OTHER_SERVICE'
);

CREATE TYPE revenue_source_enum AS ENUM (
  'hotel-pms', 'hotel-saas', 'external-pos', 'manual-entry'
);
```

#### **2.2 リアルタイム更新システム**
```typescript
// WebSocket リアルタイム配信
export class RevenueRealtimeSystem {
  private wsServer: WebSocketServer
  private redisClient: Redis
  
  /**
   * 収益データリアルタイム配信
   */
  async broadcastRevenueUpdate(
    tenantId: string,
    revenueData: RevenueUpdate
  ): Promise<void> {
    // 1. データベース更新
    await this.updateRevenueTracking(revenueData)
    
    // 2. Redis集計データ更新
    await this.updateRevenueCache(tenantId, revenueData)
    
    // 3. WebSocket配信
    const dashboardData = await this.generateDashboardData(tenantId)
    this.wsServer.to(`tenant:${tenantId}`).emit('revenue:updated', dashboardData)
    
    // 4. 閾値チェック・アラート
    await this.checkRevenueThresholds(tenantId, dashboardData)
  }
  
  /**
   * ダッシュボードデータ生成（200ms以内）
   */
  async generateDashboardData(tenantId: string): Promise<RevenueDashboard> {
    const cacheKey = `revenue:dashboard:${tenantId}:${this.getCurrentHour()}`
    
    // Redisキャッシュ確認
    const cached = await this.redisClient.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }
    
    // 集計クエリ実行（最適化済み）
    const dashboardData = await this.calculateRevenueMetrics(tenantId)
    
    // キャッシュ保存（5分TTL）
    await this.redisClient.setex(cacheKey, 300, JSON.stringify(dashboardData))
    
    return dashboardData
  }
}

// ダッシュボード型定義
interface RevenueDashboard {
  current: {
    today: RevenueMetrics
    thisHour: RevenueMetrics
    liveOccupancy: number
    availableRooms: number
  }
  trends: {
    hourly: RevenueMetrics[]      // 24時間
    daily: RevenueMetrics[]       // 30日
    comparison: {
      vsYesterday: number         // %
      vsLastWeek: number          // %
      vsLastMonth: number         // %
    }
  }
  forecasting: {
    todayProjection: RevenueMetrics
    weekProjection: RevenueMetrics
    monthProjection: RevenueMetrics
    confidence: number            // %
  }
  alerts: RevenueAlert[]
}
```

### **3. ⚡ 15分チェックイン（団体対応）**

#### **3.1 業務フロー詳細仕様**
```typescript
// 15分チェックイン業務フロー
interface ExpressCheckinFlow {
  // Step 1: 事前準備（来館2時間前）
  preparation: {
    trigger: 'reservation.checkin_date - 2 hours'
    actions: [
      'generate_group_qr_code',
      'prepare_room_keys',
      'verify_room_readiness',
      'prepare_welcome_package',
      'notify_staff_preparation'
    ]
    timeLimit: '30 minutes'
  }
  
  // Step 2: 到着・QR認証（目標: 2分以内）
  arrival: {
    process: [
      'qr_code_scan',           // 30秒
      'group_leader_verification', // 60秒
      'guest_count_confirmation',  // 30秒
    ]
    fallbackAuth: [
      'confirmation_code_input',
      'phone_number_verification',
      'id_verification'
    ]
    timeLimit: '2 minutes'
  }
  
  // Step 3: 自動部屋割り（目標: 3分以内）
  roomAssignment: {
    process: [
      'auto_room_allocation',      // 60秒
      'key_card_programming',      // 90秒
      'special_request_handling'   // 30秒
    ]
    autoAllocationRules: {
      groupSizeOptimization: true
      floorConcentration: true
      accessibilityRequirements: true
      smokingPreferences: true
    }
    timeLimit: '3 minutes'
  }
  
  // Step 4: 情報提供・完了（目標: 10分以内）
  completion: {
    process: [
      'digital_welcome_package',   // 2分
      'facility_guide_delivery',   // 3分
      'emergency_info_briefing',   // 2分
      'group_leader_final_confirm', // 3分
    ]
    digitalDelivery: {
      welcomePackage: 'qr_code_or_app'
      facilityMap: 'digital_map'
      emergencyContacts: 'push_notification'
      groupCommunication: 'chat_group_creation'
    }
    timeLimit: '10 minutes'
  }
}
```

#### **3.2 技術実装詳細**
```sql
-- 団体予約管理
CREATE TABLE group_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- 団体情報
  group_name VARCHAR(200) NOT NULL,
  group_leader_customer_id UUID NOT NULL REFERENCES customers(id),
  total_guests INTEGER NOT NULL CHECK (total_guests >= 2),
  total_rooms INTEGER NOT NULL CHECK (total_rooms >= 1),
  
  -- チェックイン管理
  qr_token VARCHAR(100) UNIQUE NOT NULL,
  qr_expires_at TIMESTAMP NOT NULL,
  express_checkin_enabled BOOLEAN DEFAULT true,
  
  -- ステータス管理
  preparation_status group_prep_status DEFAULT 'PENDING',
  checkin_status group_checkin_status DEFAULT 'NOT_STARTED',
  checkin_started_at TIMESTAMP,
  checkin_completed_at TIMESTAMP,
  
  -- 時間管理
  estimated_checkin_duration INTEGER, -- 分
  actual_checkin_duration INTEGER,    -- 分
  efficiency_score DECIMAL(3,2),      -- 0.00-1.00
  
  -- 個別予約関連
  individual_reservations UUID[] NOT NULL,
  room_allocation_strategy VARCHAR(50) DEFAULT 'auto_optimize',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 団体チェックイン進捗追跡
CREATE TABLE group_checkin_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_reservation_id UUID NOT NULL REFERENCES group_reservations(id),
  
  step_name VARCHAR(50) NOT NULL,
  step_order INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
  
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  duration_seconds INTEGER,
  staff_id UUID REFERENCES users(id),
  
  notes TEXT,
  issues_encountered TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE group_prep_status AS ENUM (
  'PENDING', 'IN_PROGRESS', 'READY', 'ISSUES'
);

CREATE TYPE group_checkin_status AS ENUM (
  'NOT_STARTED', 'QR_SCANNED', 'VERIFIED', 'ROOM_ASSIGNING', 
  'KEYS_READY', 'BRIEFING', 'COMPLETED', 'FAILED'
);
```

### **4. 📱 写真付き申し送り機能**

#### **4.1 システム設計詳細**
```sql
-- 申し送りメッセージ
CREATE TABLE handover_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- 申し送り基本情報
  from_staff_id UUID NOT NULL REFERENCES users(id),
  to_staff_id UUID REFERENCES users(id),        -- NULL = 全スタッフ
  to_department VARCHAR(50),                     -- 'FRONT', 'HOUSEKEEPING', 'MAINTENANCE'
  shift_handover_id UUID,                        -- シフト引き継ぎID
  
  -- 内容
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  priority handover_priority DEFAULT 'MEDIUM',
  category handover_category NOT NULL,
  
  -- 関連エンティティ
  related_reservation_id UUID REFERENCES reservations(id),
  related_room_id UUID REFERENCES rooms(id),
  related_customer_id UUID REFERENCES customers(id),
  
  -- メディア管理
  photo_urls TEXT[],
  video_urls TEXT[],
  document_urls TEXT[],
  media_metadata JSONB DEFAULT '{}',
  
  -- ステータス管理
  status handover_status DEFAULT 'PENDING',
  acknowledged_at TIMESTAMP,
  acknowledged_by_staff_id UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  
  -- 緊急度・フォローアップ
  requires_immediate_action BOOLEAN DEFAULT false,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_deadline TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- メディア管理（S3互換ストレージ）
CREATE TABLE handover_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handover_note_id UUID NOT NULL REFERENCES handover_notes(id),
  
  -- ファイル情報
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  
  -- メタデータ
  media_type media_type_enum NOT NULL,
  description TEXT,
  tags TEXT[],
  
  -- 画像特有情報
  width INTEGER,
  height INTEGER,
  thumbnail_path TEXT,
  
  -- セキュリティ
  upload_ip VARCHAR(45),
  virus_scan_status VARCHAR(20) DEFAULT 'PENDING',
  virus_scan_result TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE handover_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE handover_category AS ENUM (
  'MAINTENANCE', 'CLEANING', 'GUEST_REQUEST', 'ISSUE_REPORT', 
  'SPECIAL_INSTRUCTION', 'SECURITY', 'GENERAL'
);
CREATE TYPE handover_status AS ENUM (
  'PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'
);
CREATE TYPE media_type_enum AS ENUM ('IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO');
```

#### **4.2 リアルタイム通知システム**
```typescript
// 申し送り通知システム
export class HandoverNotificationSystem {
  /**
   * 申し送り作成時の通知配信
   */
  async notifyHandoverCreated(handover: HandoverNote): Promise<void> {
    // 1. 対象スタッフ決定
    const targetStaff = await this.determineTargetStaff(handover)
    
    // 2. 通知レベル決定
    const notificationLevel = this.calculateNotificationLevel(handover)
    
    // 3. マルチチャネル通知
    await Promise.all([
      this.sendWebSocketNotification(targetStaff, handover),
      this.sendPushNotification(targetStaff, handover, notificationLevel),
      this.sendEmailNotification(targetStaff, handover, notificationLevel),
      this.createSystemAlert(handover, notificationLevel)
    ])
    
    // 4. エスカレーション設定
    if (handover.priority === 'URGENT') {
      await this.scheduleEscalation(handover, '15 minutes')
    }
  }
  
  /**
   * 写真付き通知の最適化配信
   */
  async optimizeMediaDelivery(
    media: HandoverMedia[], 
    targetDevices: NotificationDevice[]
  ): Promise<void> {
    await Promise.all(media.map(async (item) => {
      // 画像圧縮・リサイズ
      if (item.media_type === 'IMAGE') {
        const optimized = await this.optimizeImage(item, {
          maxWidth: 800,
          quality: 0.8,
          format: 'webp'
        })
        
        // プログレッシブロード用サムネイル
        const thumbnail = await this.generateThumbnail(item, {
          width: 150,
          height: 150
        })
        
        // CDN配信
        await this.uploadToCDN(optimized, thumbnail)
      }
    }))
  }
}
```

### **5. 💰 原価リアルタイム管理**

#### **5.1 原価トラッキングシステム**
```sql
-- 原価トラッキング
CREATE TABLE cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- 原価分類
  cost_category cost_category_enum NOT NULL,
  cost_subcategory VARCHAR(100),
  description TEXT NOT NULL,
  
  -- 金額・数量
  amount DECIMAL(12,2) NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_cost DECIMAL(12,2) GENERATED ALWAYS AS (amount / NULLIF(quantity, 0)) STORED,
  currency VARCHAR(3) DEFAULT 'JPY',
  
  -- 期間・配賦
  cost_date DATE NOT NULL,
  allocation_method cost_allocation_enum DEFAULT 'DIRECT',
  allocated_to_room_id UUID REFERENCES rooms(id),
  allocated_to_department VARCHAR(50),
  allocation_percentage DECIMAL(5,2) DEFAULT 100.00,
  
  -- 承認・管理
  approval_status cost_approval_status DEFAULT 'PENDING',
  approved_by_staff_id UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- メタデータ
  vendor_name VARCHAR(200),
  invoice_number VARCHAR(100),
  purchase_order_number VARCHAR(100),
  receipt_url TEXT,
  
  -- 自動化
  auto_calculated BOOLEAN DEFAULT false,
  calculation_formula TEXT,
  source_system VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 利益分析ビュー
CREATE VIEW profit_analysis AS
SELECT 
  rt.tenant_id,
  rt.tracking_date,
  rt.room_id,
  rt.revenue_category,
  rt.total_amount as revenue,
  COALESCE(ct.total_cost, 0) as cost,
  (rt.total_amount - COALESCE(ct.total_cost, 0)) as profit,
  CASE 
    WHEN rt.total_amount > 0 
    THEN ((rt.total_amount - COALESCE(ct.total_cost, 0)) / rt.total_amount * 100)
    ELSE 0 
  END as profit_margin_percentage
FROM revenue_tracking rt
LEFT JOIN (
  SELECT 
    tenant_id,
    cost_date,
    allocated_to_room_id,
    SUM(amount * allocation_percentage / 100) as total_cost
  FROM cost_tracking 
  WHERE approval_status = 'APPROVED'
  GROUP BY tenant_id, cost_date, allocated_to_room_id
) ct ON rt.tenant_id = ct.tenant_id 
  AND rt.tracking_date = ct.cost_date 
  AND rt.room_id = ct.allocated_to_room_id;

CREATE TYPE cost_category_enum AS ENUM (
  'ROOM_MAINTENANCE', 'UTILITIES', 'CLEANING_SUPPLIES', 'AMENITIES',
  'STAFF_LABOR', 'FOOD_BEVERAGE', 'MARKETING', 'TECHNOLOGY', 'INSURANCE', 'OTHER'
);

CREATE TYPE cost_allocation_enum AS ENUM (
  'DIRECT', 'PROPORTIONAL', 'FIXED_SPLIT', 'ACTIVITY_BASED'
);

CREATE TYPE cost_approval_status AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'REQUIRES_REVIEW'
);
```

### **6. 🎉 グループエンタメ管理**

#### **6.1 hotel-saas完全連携仕様**
```typescript
// hotel-saas連携インターフェース
interface GroupEntertainmentSaasIntegration {
  // アクティビティ予約API
  bookActivity: {
    endpoint: 'POST /api/entertainment/group/{groupId}/book'
    payload: {
      activityType: 'CONFERENCE' | 'BANQUET' | 'SPA' | 'TOUR' | 'RECREATION'
      serviceDetails: {
        name: string
        description: string
        capacity: number
        duration: number        // 分
        setupTime: number      // 分
        cleanupTime: number    // 分
      }
      scheduling: {
        requestedStartTime: string
        requestedEndTime: string
        flexibilityMinutes: number
        priorityLevel: 1 | 2 | 3 | 4 | 5
      }
      requirements: {
        equipmentNeeded: string[]
        specialRequests: string[]
        dietaryRestrictions: string[]
        accessibilityNeeds: string[]
      }
      billing: {
        totalAmount: number
        paymentMethod: 'ROOM_CHARGE' | 'DIRECT_PAYMENT' | 'CORPORATE_ACCOUNT'
        billingContactId: string
      }
    }
    response: {
      bookingId: string
      confirmationCode: string
      scheduledStartTime: string
      scheduledEndTime: string
      estimatedCost: number
      requiresApproval: boolean
      approvalDeadline?: string
    }
  }
  
  // リアルタイム空き状況確認
  checkAvailability: {
    endpoint: 'GET /api/entertainment/availability'
    query: {
      activityType: string
      date: string
      startTime: string
      endTime: string
      groupSize: number
    }
    response: {
      available: boolean
      alternatives: Array<{
        startTime: string
        endTime: string
        confidence: number
      }>
      constraints: string[]
    }
  }
}
```

---

## 🔧 **既存実装との統合方針**

### **📋 現在実装の保持・拡張戦略**

#### **1. JWT認証基盤統合**
```typescript
// 現在実装 → hotel-common JWT統合
export class PmsJwtIntegration {
  /**
   * 既存JWT実装をhotel-common基盤に段階統合
   */
  async migrateToUnifiedJwt(): Promise<void> {
    // Step 1: 既存トークン検証機能を維持
    const currentJwtVerification = this.preserveCurrentAuth()
    
    // Step 2: hotel-common JWT形式に変換層追加
    const conversionLayer = await this.createJwtConversionLayer()
    
    // Step 3: 段階的移行（dual-write期間）
    await this.implementDualJwtSupport()
    
    // Step 4: 完全移行後のクリーンアップ
    await this.scheduleCleanupMigration()
  }
  
  /**
   * JWT Payload統合（既存フィールド保持）
   */
  interface UnifiedPmsJwtPayload extends HotelCommonJWT {
    // 既存PMSフィールド保持
    pms_user_level: number
    pms_permissions: string[]
    pms_department: string
    
    // 新統合フィールド
    hierarchy_context: HierarchyContext
    mvp_feature_access: MvpFeatureAccess
  }
}
```

#### **2. カスタムUI統合**
```typescript
// 既存UI + 新MVP機能UI統合
export class PmsUiIntegration {
  /**
   * 既存UI資産の保持・拡張
   */
  async integrateUiComponents(): Promise<void> {
    // 既存カスタムUIコンポーネント保持
    const existingComponents = await this.preserveCustomComponents()
    
    // MVP機能UI追加（モジュラー設計）
    const mvpComponents = await this.addMvpFeatureComponents()
    
    // 統一デザインシステム適用
    await this.applyUnifiedDesignSystem()
    
    // レスポンシブ・アクセシビリティ強化
    await this.enhanceUxAccessibility()
  }
  
  // UI統合マッピング
  interface UiIntegrationMapping {
    // 既存画面の保持・拡張
    existingScreens: {
      reservationManagement: 'enhance_with_vip_history'
      roomManagement: 'add_cost_tracking'
      customerManagement: 'integrate_vip_features'
      dashboardMain: 'add_realtime_revenue'
    }
    
    // 新規MVP画面
    newMvpScreens: {
      vipHistoryManagement: 'full_new_implementation'
      realtimeRevenueDashboard: 'full_new_implementation'
      expressCheckinFlow: 'full_new_implementation'
      handoverPhotoSystem: 'full_new_implementation'
      costTrackingDashboard: 'full_new_implementation'
      groupEntertainmentHub: 'full_new_implementation'
    }
  }
}
```

---

## ⏰ **段階的実装スケジュール**

### **Phase 1: 統合基盤拡張（2週間）**
```
Week 1: データベース・API基盤
├── Day 1-2: VIP履歴・嗜好管理テーブル実装
├── Day 3-4: 収益・原価トラッキングテーブル実装  
├── Day 5-6: 申し送り・メディア管理テーブル実装
└── Day 7: 統合テスト・データ整合性確認

Week 2: 認証・権限統合
├── Day 8-9: JWT統合基盤実装・既存認証保持
├── Day 10-11: MVP機能別権限システム実装
├── Day 12-13: hotel-member/hotel-saas連携API実装
└── Day 14: 統合認証テスト・セキュリティ確認
```

### **Phase 2: MVP機能実装（4週間）**
```
Week 3: VIP履歴・収益ダッシュボード
├── VIP履歴管理フルスタック実装
├── hotel-member統合・Event連携
├── リアルタイム収益ダッシュボード実装
└── WebSocket・Redis最適化

Week 4: 15分チェックイン・申し送り
├── 団体チェックインフロー実装
├── QR認証・自動部屋割りシステム
├── 写真付き申し送り機能実装
└── リアルタイム通知システム

Week 5: 原価管理・エンタメ連携
├── 原価トラッキング・分析システム
├── 利益分析・アラートシステム
├── hotel-saas エンタメ連携実装
└── 予約・アクティビティ統合

Week 6: 統合テスト・最適化
├── 6機能統合テスト・負荷テスト
├── パフォーマンス最適化・キャッシュ調整
├── セキュリティ・監査ログ確認
└── 運用マニュアル・ドキュメント整備
```

### **Phase 3: 本格運用（1週間）**
```
Week 7: 運用開始・監視
├── 本格運用開始・24時間監視体制
├── パフォーマンス・エラー監視
├── ユーザーフィードバック収集・改善
└── 次期機能拡張計画策定
```

---

## 🎯 **成功指標・品質基準**

### **技術指標**
- **API応答速度**: 全エンドポイント 500ms以内
- **リアルタイム更新**: WebSocket 100ms以内配信
- **データベース性能**: 複雑クエリ 200ms以内
- **同時接続**: 100ユーザー同時利用対応

### **業務効率指標**
- **VIP対応**: 履歴確認時間 50%短縮
- **チェックイン**: 団体15分以内達成率 90%
- **申し送り**: 情報共有漏れ 80%削減
- **収益把握**: リアルタイム表示 100%

### **品質指標**
- **セキュリティ**: VIP情報完全暗号化
- **可用性**: 99.9%稼働率維持
- **データ整合性**: 100%維持
- **ユーザビリティ**: 操作習得時間 30%短縮

---

**🌙 Luna（月読）、冷静沈着な夜の守護神として、この詳細仕様に基づく完璧な実装を期待しています。現場要望に応える革命的なPMSシステムを創造し、ホテル業界の効率化に貢献してください。**

**統合管理者（Iza）として、Lunaの技術力と実装品質を全面的に支援いたします。** 