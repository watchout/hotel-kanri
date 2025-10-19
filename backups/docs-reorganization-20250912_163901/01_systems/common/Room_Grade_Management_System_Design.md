# 🏨 客室グレード管理システム詳細設計書（料金分離版）
**Room Grade Management System Design - Pricing Separated**

**作成日**: 2025年1月22日（料金分離対応）  
**責任者**: 🌊 Iza（統合管理者）  
**対象**: hotel-saas, hotel-member, hotel-pms 統合データベース  
**重要な変更**: 料金設定は専用システムで管理、グレードは設備・サービス特化

---

## 🎯 **設計方針・要件（料金分離版）**

### **核心要件**
1. **既存hotel-saas互換性**: SQLiteスキーマとの整合性維持
2. **グレード別管理**: **設備・サービス・容量**に特化した管理
3. **料金システム分離**: 料金は専用システムで管理、グレードIDで連携
4. **システム横断**: SaaS/Member/PMS全システムで統一利用

### **🔄 設計変更点**
```diff
❌ 削除: 複雑な料金設定・動的料金ルール
✅ 保持: グレード別設備・サービス・容量管理
✅ 追加: 料金システム連携用のgrage_id
✅ 簡素化: 運用しやすいシンプル構造
```

---

## 🗄️ **データベース設計（簡素化版）**

### **1. Room Grade Master テーブル（料金除外）**

#### **room_grades（客室グレードマスタ - 設備特化）**
```sql
CREATE TABLE room_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- グレード基本情報
  grade_code VARCHAR(50) NOT NULL,        -- 'STD', 'DLX', 'STE', 'VIP'
  grade_name VARCHAR(100) NOT NULL,       -- 'スタンダード', 'デラックス', 'スイート'
  grade_name_en VARCHAR(100),             -- 多言語対応
  description TEXT,                       -- グレード詳細説明
  grade_level INTEGER NOT NULL,           -- 1=最下位, 5=最上位
  
  -- 🚫 料金設定削除（専用システムで管理）
  -- base_price_* フィールドは全て削除
  
  -- 容量・設備（物理的特徴）
  default_capacity INTEGER NOT NULL DEFAULT 2,
  max_capacity INTEGER NOT NULL DEFAULT 4,
  room_size_sqm DECIMAL(6,2),             -- 部屋面積（平方メートル）
  
  -- グレード専用設備・サービス
  standard_amenities JSONB DEFAULT '[]',  -- ['Wi-Fi', 'TV', 'エアコン']
  premium_amenities JSONB DEFAULT '[]',   -- ['バルコニー', 'ジャグジー']
  included_services JSONB DEFAULT '[]',   -- ['朝食', 'ラウンジアクセス']
  
  -- ビジネスルール（料金以外）
  member_only BOOLEAN DEFAULT false,       -- 会員専用グレード
  min_stay_nights INTEGER DEFAULT 1,      -- 最低宿泊日数
  advance_booking_days INTEGER DEFAULT 0, -- 事前予約必要日数
  
  -- 表示・運用設定
  display_order INTEGER DEFAULT 1,        -- 表示順序
  is_active BOOLEAN DEFAULT true,         -- 販売中フラグ
  is_public BOOLEAN DEFAULT true,         -- 公開フラグ
  
  -- 料金システム連携
  pricing_category VARCHAR(50),           -- 料金システムでのカテゴリ識別子
  
  -- 統合基盤準拠フィールド
  origin_system VARCHAR(50) DEFAULT 'hotel-common',
  synced_at TIMESTAMP DEFAULT NOW(),
  updated_by_system VARCHAR(50) DEFAULT 'hotel-common',
  
  -- 監査フィールド
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  -- 制約・インデックス
  CONSTRAINT unique_grade_per_tenant UNIQUE (tenant_id, grade_code),
  CONSTRAINT valid_grade_level CHECK (grade_level BETWEEN 1 AND 5),
  CONSTRAINT valid_capacity CHECK (max_capacity >= default_capacity)
);

CREATE INDEX idx_room_grades_tenant_level ON room_grades(tenant_id, grade_level);
CREATE INDEX idx_room_grades_active ON room_grades(tenant_id, is_active, is_public);
CREATE INDEX idx_room_grades_pricing ON room_grades(tenant_id, pricing_category);
```

### **2. Room テーブル拡張（料金フィールド除外）**

#### **rooms（既存テーブル拡張 - 料金分離版）**
```sql
-- 既存roomテーブルに以下フィールド追加
ALTER TABLE rooms 
ADD COLUMN room_grade_id UUID REFERENCES room_grades(id),
-- 🚫 料金オーバーライド削除（専用システムで管理）
-- ADD COLUMN grade_override_price DECIMAL(10,2),  -- 削除
ADD COLUMN grade_override_amenities JSONB,         -- 設備上書き
ADD COLUMN special_features JSONB DEFAULT '{}',    -- 客室固有特徴
ADD COLUMN view_type VARCHAR(50),                  -- 'ocean', 'city', 'garden'
ADD COLUMN accessibility_features JSONB DEFAULT '[]', -- バリアフリー対応
ADD COLUMN pricing_room_code VARCHAR(50);          -- 料金システム用客室識別子

-- インデックス追加
CREATE INDEX idx_rooms_grade ON rooms(tenant_id, room_grade_id);
CREATE INDEX idx_rooms_grade_status ON rooms(tenant_id, room_grade_id, status);
CREATE INDEX idx_rooms_pricing_code ON rooms(tenant_id, pricing_room_code);
```

### **3. 🚫 料金関連テーブル削除**

```sql
-- 以下のテーブルは専用料金システムで管理
-- ❌ room_grade_pricing_rules テーブル削除
-- ❌ 複雑な料金計算ロジック削除
-- ❌ 季節料金・動的料金管理削除
```

### **4. Member Grade Access Control（簡素化）**

#### **member_grade_access（会員グレードアクセス制御 - 料金分離版）**
```sql
CREATE TABLE member_grade_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_grade_id UUID NOT NULL REFERENCES room_grades(id) ON DELETE CASCADE,
  member_rank_id VARCHAR(50) NOT NULL,    -- hotel-memberのrank_id
  
  -- アクセス制御（料金以外）
  access_type access_type_enum NOT NULL,  -- 'FULL', 'PRIORITY', 'RESTRICTED'
  priority_booking_hours INTEGER DEFAULT 0, -- 優先予約時間
  
  -- 🚫 料金関連削除（専用システムで管理）
  -- discount_percentage DECIMAL(5,2) DEFAULT 0.00,  -- 削除
  
  -- サービス制限
  max_bookings_per_month INTEGER,
  min_stay_override INTEGER,              -- 最低宿泊日数上書き
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_grade_rank_access UNIQUE (tenant_id, room_grade_id, member_rank_id)
);

CREATE TYPE access_type_enum AS ENUM ('FULL', 'PRIORITY', 'RESTRICTED', 'BLOCKED');
```

---

## 🔗 **料金システム連携設計**

### **📊 Grade ID ベース連携**

#### **料金システム連携ポイント**
```typescript
// room_gradeと料金システムの連携
interface PricingSystemIntegration {
  // 1. グレード識別子による料金取得
  async getRoomPrice(roomId: string, date: Date): Promise<PriceInfo> {
    // A. 客室からグレード取得
    const room = await db.room.findUnique({
      where: { id: roomId },
      include: { room_grade: true }
    })
    
    // B. 料金システムAPI呼び出し
    const pricing = await pricingSystemApi.getPrice({
      grade_code: room.room_grade.grade_code,
      room_code: room.pricing_room_code,
      date: date,
      tenant_id: room.tenant_id
    })
    
    return {
      base_price: pricing.base_price,
      final_price: pricing.calculated_price,
      pricing_rules: pricing.applied_rules,
      grade_info: room.room_grade  // 設備情報
    }
  }
}
```

#### **専用料金システムとの連携API**
```typescript
// 料金システム側インターフェース（将来実装）
interface PricingSystemAPI {
  // グレードベース料金取得
  getPrice(request: {
    grade_code: string    // 'STD', 'DLX', 'STE'
    room_code: string     // 個別客室識別子
    date: Date           // 料金計算対象日
    tenant_id: string    // テナント
    guest_type?: 'member' | 'general'  // ゲストタイプ
    member_rank?: string // 会員ランク
  }): Promise<PriceResponse>
  
  // 在庫連動料金計算
  calculateDynamicPrice(request: {
    grade_code: string
    occupancy_rate: number
    advance_days: number
    seasonal_factor: number
  }): Promise<DynamicPriceResponse>
}
```

---

## 🚀 **実装フェーズ計画（簡素化版）**

### **Phase 1: 基盤構築（1週間）**
```
✅ room_grades テーブル作成（料金フィールド除外）
✅ rooms テーブル拡張（pricing_room_code追加）
✅ 基本グレードデータ投入（STD・DLX・STE）
✅ Prismaスキーマ更新・型生成
```

### **Phase 2: 設備・サービス管理（1週間）**
```
✅ Grade Amenity Management API実装
✅ 会員アクセス制御実装（料金以外）
✅ システム別インターフェース作成
✅ SQLite → PostgreSQL移行
```

### **Phase 3: 料金システム連携準備（将来）**
```
🔄 料金システム連携API設計
🔄 grade_code ベース料金取得実装
🔄 動的料金連携テスト
🔄 統合テスト・パフォーマンス最適化
```

---

## 🔄 **システム別利用方法（料金分離版）**

### **🏪 hotel-saas での利用**

#### **グレード別サービス管理（料金システム連携）**
```typescript
// サービス利用判定（料金は別途取得）
interface ServiceAccessControl {
  async checkServiceAvailability(roomId: string, serviceType: string) {
    // 1. 客室グレード取得
    const room = await db.room.findUnique({
      where: { id: roomId },
      include: { room_grade: true }
    })
    
    // 2. グレード設備・サービス確認
    const availableServices = room.room_grade.included_services
    const hasAccess = availableServices.includes(serviceType)
    
    // 3. 料金は専用システムから取得
    const servicePrice = await pricingSystemApi.getServicePrice({
      service_type: serviceType,
      grade_code: room.room_grade.grade_code,
      included: hasAccess
    })
    
    return {
      available: hasAccess,
      pricing: servicePrice,
      grade_level: room.room_grade.grade_level
    }
  }
}
```

### **🎯 hotel-member での利用**

#### **会員特典・アクセス制御（料金は分離）**
```typescript
// 会員グレードアクセス管理
interface MemberGradeAccess {
  async getAccessibleGrades(memberId: string) {
    // 1. 会員情報取得
    const member = await getMemberInfo(memberId)
    
    // 2. アクセス可能グレード確認
    const accessibleGrades = await db.member_grade_access.findMany({
      where: {
        tenant_id: member.tenant_id,
        member_rank_id: member.rank_id,
        is_active: true
      },
      include: { room_grade: true }
    })
    
    // 3. 料金は専用システムで計算
    const gradesWithPricing = await Promise.all(
      accessibleGrades.map(async (grade) => {
        const pricing = await pricingSystemApi.getMemberPrice({
          grade_code: grade.room_grade.grade_code,
          member_rank: member.rank_id
        })
        
        return {
          grade: grade.room_grade,
          access: grade,
          pricing: pricing  // 専用システムから取得
        }
      })
    )
    
    return gradesWithPricing
  }
}
```

---

## ✅ **今回の統合処置について**

### **🎯 必要な統合作業**

**1. 基本統合（すぐ実施）:**
```sql
-- room_grades テーブル作成（料金なし）
-- rooms テーブル拡張（room_grade_id追加）
-- 基本グレードデータ投入
```

**2. 料金システム連携準備（将来）:**
```sql
-- pricing_room_code フィールド追加
-- grade_code 標準化
-- 料金システムAPI連携コード実装
```

### **🔄 段階的統合戦略**

**Week 1: 基本グレード管理**
- room_grades テーブル作成
- 設備・サービス管理機能
- hotel-saas SQLite移行準備

**Week 2-3: システム統合**
- 各システムでのグレード利用実装
- member_grade_access実装
- データ移行実行

**将来: 料金システム連携**
- 専用料金システム完成後
- grade_id ベース料金取得API
- 統合テスト・運用開始

---

## 💡 **この簡素化設計の利点**

### **🌟 メリット**
1. **運用性**: シンプルで理解しやすい構造
2. **拡張性**: 料金システム独立により柔軟な料金戦略
3. **保守性**: 関心の分離により保守コスト削減
4. **開発速度**: 複雑な料金ロジックなしで迅速実装

### **🔗 料金システム連携**
- **疎結合**: gradeとpricingの独立性確保
- **再利用性**: 他プロジェクトでの料金システム再利用可能
- **専門性**: 料金の専門チームによる高度な機能実現

---

**✅ 料金設定を専用システムに分離することで、客室グレード管理がシンプルで実用的になります。今回は基本的なグレード統合に集中し、料金システムは別途ご相談いただくのが最適なアプローチです！** 