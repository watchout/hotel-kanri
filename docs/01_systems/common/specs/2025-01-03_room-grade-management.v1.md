# 客室グレード管理システム仕様書（料金分離版）

**Doc-ID**: SPEC-2025-01-03-001  
**Version**: v1.0  
**Status**: Approved  
**Owner**: 金子裕司  
**Linked-Docs**: ADR-2025-01-03-002  

---

## 概要
hotel-saas, hotel-member, hotel-pms統合データベースにおける客室グレード管理システムの仕様書。料金設定を専用システムに分離し、設備・サービス・容量管理に特化したシンプルな設計。

## 背景・目的
- 既存hotel-saas SQLiteスキーマとの整合性維持
- グレード別設備・サービス・容量管理の統一
- 料金システム分離による運用性向上
- システム横断でのグレード統一利用

## 要件

### 機能要件
- 客室グレードマスタ管理（設備・サービス特化）
- 会員グレードアクセス制御（料金以外）
- 料金システム連携インターフェース
- システム別グレード利用API

### 非機能要件
- 既存SQLiteスキーマとの互換性
- 料金システムとの疎結合
- マルチテナント対応
- 高可用性・拡張性

## 仕様詳細

### データベース設計

#### room_grades テーブル（客室グレードマスタ）
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
```

#### rooms テーブル拡張
```sql
ALTER TABLE rooms 
ADD COLUMN room_grade_id UUID REFERENCES room_grades(id),
ADD COLUMN grade_override_amenities JSONB,         -- 設備上書き
ADD COLUMN special_features JSONB DEFAULT '{}',    -- 客室固有特徴
ADD COLUMN view_type VARCHAR(50),                  -- 'ocean', 'city', 'garden'
ADD COLUMN accessibility_features JSONB DEFAULT '[]', -- バリアフリー対応
ADD COLUMN pricing_room_code VARCHAR(50);          -- 料金システム用客室識別子
```

#### member_grade_access テーブル（会員アクセス制御）
```sql
CREATE TABLE member_grade_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_grade_id UUID NOT NULL REFERENCES room_grades(id) ON DELETE CASCADE,
  member_rank_id VARCHAR(50) NOT NULL,    -- hotel-memberのrank_id
  
  -- アクセス制御（料金以外）
  access_type access_type_enum NOT NULL,  -- 'FULL', 'PRIORITY', 'RESTRICTED'
  priority_booking_hours INTEGER DEFAULT 0, -- 優先予約時間
  
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

## API仕様

### 料金システム連携API
```typescript
interface PricingSystemIntegration {
  // グレード識別子による料金取得
  async getRoomPrice(roomId: string, date: Date): Promise<PriceInfo>
  
  // 動的料金計算
  async calculateDynamicPrice(request: {
    grade_code: string
    occupancy_rate: number
    advance_days: number
    seasonal_factor: number
  }): Promise<DynamicPriceResponse>
}
```

### システム別利用API
```typescript
// hotel-saas での利用
interface ServiceAccessControl {
  async checkServiceAvailability(roomId: string, serviceType: string)
}

// hotel-member での利用
interface MemberGradeAccess {
  async getAccessibleGrades(memberId: string)
}
```

## 制約・前提条件
- 料金設定は専用システムで管理
- grade_codeによる料金システム連携
- 既存SQLiteスキーマとの互換性維持
- マルチテナント分離必須

## 関連技術判断
- [ADR-2025-01-03-002]: 料金システム分離アーキテクチャ判断

## 変更履歴
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| v1.0 | 2025-01-03 | 初版作成（既存設計書からの移行） | 金子裕司 |