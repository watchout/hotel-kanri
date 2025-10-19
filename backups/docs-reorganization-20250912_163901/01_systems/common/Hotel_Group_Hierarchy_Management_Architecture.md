# 🏗️ ホテルグループ階層管理アーキテクチャ設計書
**Hotel Group Hierarchy Management Architecture**

**作成日**: 2025年1月21日  
**作成者**: Iza（伊邪那岐）統合管理者  
**要件提供**: Nami（伊邪那美）ミーティングボード統括  
**バージョン**: 1.0.0  
**対象**: hotel-common統合基盤 + 全3システム統合

---

## 📋 **要件整理サマリー**

### **🎯 Namiからの要件**
- **対応範囲**: 単独店舗 → メガチェーン（100店舗以上）
- **階層構造**: 4レベル（Group → Brand → Hotel → Department）
- **実例**: アパグループ、星野リゾート等の実際の事業構造対応
- **権限管理**: 階層レベル別のデータアクセス制御
- **柔軟性**: 完全統合型・ブランド別・完全分離型の選択可能

### **🔍 技術要件SWOT分析**

#### **✅ Strengths（強み）**
- **既存マルチテナント基盤**: tenant_id対応済み
- **統一JWT認証基盤**: システム間認証確立済み
- **Event-driven Architecture**: リアルタイム連携基盤
- **PostgreSQL + Prisma**: 拡張性・型安全性確保
- **監査ログシステム**: 完全なトレーサビリティ

#### **⚠️ Weaknesses（弱点）**
- **既存tenant_idとの整合性**: 店舗レベル前提の現在設計
- **大規模階層でのクエリ性能**: 100店舗以上での性能課題
- **既存3システムへの影響**: 段階移行の複雑性
- **管理画面の複雑化**: UI/UX設計の困難性

#### **🚀 Opportunities（機会）**
- **市場差別化**: 階層管理対応PMSは極めて少ない
- **事業拡張対応**: M&A・フランチャイズ展開完全対応
- **コンプライアンス強化**: グループ全体のデータガバナンス
- **運営効率化**: 階層別分析・レポート自動化

#### **🚨 Threats（脅威）**
- **実装複雑性**: 開発工数・バグリスクの増大
- **既存データ移行**: データ整合性・ダウンタイムリスク
- **パフォーマンス劣化**: 階層クエリによる応答速度低下
- **運用コスト増**: 管理・保守工数の増加

---

## 🏗️ **技術アーキテクチャ設計**

### **🗄️ データベース階層管理設計**

#### **Core階層管理テーブル**
```sql
-- 組織階層マスタ
CREATE TABLE organization_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_type organization_type_enum NOT NULL,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(100) NOT NULL, -- URL安全な識別子
  parent_id UUID REFERENCES organization_hierarchy(id),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  path TEXT NOT NULL, -- 階層パス: "group_id/brand_id/hotel_id"
  settings JSONB DEFAULT '{}',
  
  -- 統合基盤準拠フィールド
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  -- インデックス最適化
  CONSTRAINT unique_code_per_parent UNIQUE (parent_id, code),
  CONSTRAINT valid_hierarchy_path CHECK (
    (level = 1 AND parent_id IS NULL) OR
    (level > 1 AND parent_id IS NOT NULL)
  )
);

-- 組織タイプ定義
CREATE TYPE organization_type_enum AS ENUM (
  'GROUP',      -- レベル1: グループ（企業全体）
  'BRAND',      -- レベル2: ブランド（事業ライン）
  'HOTEL',      -- レベル3: 店舗（個別ホテル）
  'DEPARTMENT'  -- レベル4: 部門（フロント・清掃等）
);

-- テナント階層関係（既存tenantとの統合）
CREATE TABLE tenant_organization (
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  organization_id UUID NOT NULL REFERENCES organization_hierarchy(id),
  role VARCHAR(50) NOT NULL, -- 'PRIMARY', 'SECONDARY'
  effective_from TIMESTAMP DEFAULT NOW(),
  effective_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  PRIMARY KEY (tenant_id, organization_id)
);

-- データ共有ポリシー
CREATE TABLE data_sharing_policy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization_hierarchy(id),
  data_type data_type_enum NOT NULL,
  sharing_scope sharing_scope_enum NOT NULL,
  access_level access_level_enum NOT NULL,
  conditions JSONB DEFAULT '{}',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_policy_per_org_data UNIQUE (organization_id, data_type)
);

CREATE TYPE data_type_enum AS ENUM (
  'CUSTOMER', 'RESERVATION', 'ANALYTICS', 'FINANCIAL', 'STAFF', 'INVENTORY'
);

CREATE TYPE sharing_scope_enum AS ENUM (
  'GROUP', 'BRAND', 'HOTEL', 'DEPARTMENT', 'NONE'
);

CREATE TYPE access_level_enum AS ENUM (
  'FULL', 'READ_ONLY', 'ANALYTICS_ONLY', 'SUMMARY_ONLY'
);
```

#### **高性能インデックス戦略**
```sql
-- 階層パス検索最適化（Materialized Path Pattern）
CREATE INDEX idx_org_hierarchy_path ON organization_hierarchy USING GIST (path);
CREATE INDEX idx_org_hierarchy_level_type ON organization_hierarchy (level, organization_type);
CREATE INDEX idx_org_hierarchy_parent_children ON organization_hierarchy (parent_id, created_at);

-- テナント階層マッピング
CREATE INDEX idx_tenant_org_tenant ON tenant_organization (tenant_id);
CREATE INDEX idx_tenant_org_organization ON tenant_organization (organization_id);
CREATE INDEX idx_tenant_org_effective ON tenant_organization (effective_from, effective_until);

-- データ共有ポリシー検索
CREATE INDEX idx_data_sharing_org_data ON data_sharing_policy (organization_id, data_type);
```

### **🔐 階層別権限管理システム**

#### **拡張JWT Payload設計**
```typescript
interface HierarchicalJWTPayload extends JwtPayload {
  // 既存フィールド維持
  user_id: string
  tenant_id: string
  email: string
  role: UserRole
  level: number
  permissions: string[]
  
  // 階層管理拡張フィールド
  hierarchy_context: {
    organization_id: string        // ユーザーの所属組織ID
    organization_level: 1 | 2 | 3 | 4  // 組織階層レベル
    organization_type: 'GROUP' | 'BRAND' | 'HOTEL' | 'DEPARTMENT'
    access_scope: string[]         // アクセス可能な下位組織ID配列
    data_access_policies: {
      [dataType: string]: {
        scope: 'GROUP' | 'BRAND' | 'HOTEL' | 'DEPARTMENT'
        level: 'FULL' | 'READ_ONLY' | 'ANALYTICS_ONLY' | 'SUMMARY_ONLY'
      }
    }
  }
  
  // マルチテナントアクセス（グループ管理者用）
  accessible_tenants: string[]   // アクセス可能なtenant_id配列
}
```

#### **階層権限チェック関数**
```typescript
export class HierarchyPermissionManager {
  /**
   * ユーザーの階層アクセス権限をチェック
   */
  static async checkHierarchyAccess(
    userToken: HierarchicalJWTPayload,
    targetResourceTenantId: string,
    dataType: 'CUSTOMER' | 'RESERVATION' | 'ANALYTICS' | 'FINANCIAL',
    operation: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'
  ): Promise<boolean> {
    // 1. 階層スコープチェック
    const hasHierarchyAccess = await this.checkHierarchyScope(
      userToken.hierarchy_context.organization_id,
      targetResourceTenantId
    )
    
    // 2. データタイプ別権限チェック
    const dataAccessPolicy = userToken.hierarchy_context.data_access_policies[dataType]
    if (!dataAccessPolicy) return false
    
    // 3. 操作レベル権限チェック
    return this.checkOperationPermission(dataAccessPolicy.level, operation)
  }
  
  /**
   * 階層スコープ内のテナント一覧取得
   */
  static async getAccessibleTenants(
    organizationId: string,
    scopeLevel: 'GROUP' | 'BRAND' | 'HOTEL' | 'DEPARTMENT'
  ): Promise<string[]> {
    // Materialized Path Patternを使用した高速階層検索
    const query = `
      WITH RECURSIVE hierarchy_scope AS (
        SELECT id, path, level, organization_type
        FROM organization_hierarchy 
        WHERE id = $1
        
        UNION ALL
        
        SELECT oh.id, oh.path, oh.level, oh.organization_type
        FROM organization_hierarchy oh
        INNER JOIN hierarchy_scope hs ON oh.parent_id = hs.id
        WHERE oh.level <= (
          SELECT level + CASE 
            WHEN $2 = 'GROUP' THEN 3
            WHEN $2 = 'BRAND' THEN 2  
            WHEN $2 = 'HOTEL' THEN 1
            ELSE 0
          END
          FROM organization_hierarchy WHERE id = $1
        )
      )
      SELECT DISTINCT to_.tenant_id
      FROM hierarchy_scope hs
      INNER JOIN tenant_organization to_ ON hs.id = to_.organization_id
      WHERE to_.effective_until IS NULL OR to_.effective_until > NOW()
    `
    
    const result = await prisma.$queryRaw<{tenant_id: string}[]>`${query}`
    return result.map(r => r.tenant_id)
  }
}
```

### **🎨 管理画面・設定インターフェース**

#### **組織階層管理画面設計**
```typescript
interface HierarchyManagementUI {
  // 組織ツリービュー
  organizationTree: {
    component: 'TreeView'
    features: [
      'drag-drop-reorder',
      'context-menu-operations', 
      'bulk-selection',
      'search-filter'
    ]
    actions: {
      create: 'modal-form'
      edit: 'inline-edit'
      delete: 'confirmation-dialog'
      move: 'drag-drop'
    }
  }
  
  // データ共有ポリシー設定
  dataSharingConfig: {
    component: 'PolicyMatrix'
    dimensions: {
      rows: 'organization-levels'
      columns: 'data-types'
      cells: 'access-level-selector'
    }
    presets: [
      'complete-integration',  // 星野リゾート型
      'brand-separation',      // アパグループ型
      'hotel-independence'     // 単独店舗型
    ]
  }
  
  // 権限管理画面
  permissionManagement: {
    component: 'UserPermissionMatrix'
    features: [
      'role-based-templates',
      'individual-overrides',
      'effective-permission-preview',
      'audit-trail'
    ]
  }
}
```

#### **リアルタイム階層変更同期**
```typescript
export class HierarchyChangePublisher {
  /**
   * 階層変更をリアルタイム同期
   */
  static async publishHierarchyChange(
    changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE',
    organizationId: string,
    changes: any,
    userId: string
  ) {
    const event = {
      type: 'organization_hierarchy_changed',
      change_type: changeType,
      organization_id: organizationId,
      changes: changes,
      affected_systems: ['hotel-member', 'hotel-pms', 'hotel-saas'],
      priority: 'HIGH',
      timestamp: new Date().toISOString(),
      user_id: userId
    }
    
    // 各システムに即座同期
    await Promise.all([
      this.publishToSystem('hotel-member', event),
      this.publishToSystem('hotel-pms', event),  
      this.publishToSystem('hotel-saas', event)
    ])
    
    // キャッシュ無効化
    await RedisManager.invalidateHierarchyCache(organizationId)
  }
}
```

---

## 📊 **実装戦略・フェーズ計画**

### **Phase 1: 基盤構築（2週間）**
```
Week 1: データベース設計・実装
├── 階層管理テーブル作成・インデックス最適化
├── 既存tenantテーブルとの統合設計
├── データ移行スクリプト作成
└── 単体テスト・データ整合性確認

Week 2: 権限管理システム実装
├── 拡張JWT Payload実装・テスト
├── HierarchyPermissionManager実装
├── 階層スコープクエリ最適化
└── 認証フロー統合テスト
```

### **Phase 2: 管理機能実装（3週間）**
```
Week 3-4: 管理画面・API実装
├── 組織階層CRUD API開発
├── データ共有ポリシー設定API
├── TreeView組織管理画面実装
└── PolicyMatrix設定画面実装

Week 5: システム統合・同期
├── リアルタイム変更同期実装
├── 各システム（Sun・Suno・Luna）統合対応
├── Event-driven階層変更配信
└── 統合テスト・パフォーマンステスト
```

### **Phase 3: 運用最適化（1週間）**
```
Week 6: 最適化・監視
├── クエリパフォーマンス最適化
├── 階層変更監査ログ強化
├── 管理者向けダッシュボード実装
└── 運用マニュアル・ドキュメント整備
```

---

## 🎯 **運用パターン対応**

### **パターン1: 完全統合型（星野リゾート型）**
```json
{
  "organization_type": "GROUP",
  "data_sharing_policies": {
    "CUSTOMER": {
      "scope": "GROUP",
      "access_level": "FULL"
    },
    "RESERVATION": {
      "scope": "GROUP", 
      "access_level": "FULL"
    },
    "ANALYTICS": {
      "scope": "GROUP",
      "access_level": "FULL"
    }
  },
  "cross_brand_loyalty": true,
  "unified_pricing": true
}
```

### **パターン2: ブランド別管理型（アパグループ型）**
```json
{
  "organization_type": "BRAND",
  "data_sharing_policies": {
    "CUSTOMER": {
      "scope": "BRAND",
      "access_level": "FULL"
    },
    "RESERVATION": {
      "scope": "BRAND",
      "access_level": "FULL"  
    },
    "ANALYTICS": {
      "scope": "GROUP",
      "access_level": "SUMMARY_ONLY"
    }
  },
  "brand_independent_pricing": true,
  "separate_loyalty_programs": true
}
```

### **パターン3: 完全分離型（単独店舗型）**
```json
{
  "organization_type": "HOTEL",
  "data_sharing_policies": {
    "CUSTOMER": {
      "scope": "HOTEL",
      "access_level": "FULL"
    },
    "RESERVATION": {
      "scope": "HOTEL", 
      "access_level": "FULL"
    },
    "ANALYTICS": {
      "scope": "HOTEL",
      "access_level": "FULL"
    }
  },
  "independent_operation": true
}
```

---

## 📈 **パフォーマンス・スケーラビリティ対策**

### **大規模階層対応（100店舗以上）**
```typescript
// 階層クエリキャッシュ戦略
export class HierarchyQueryCache {
  private static CACHE_TTL = 300 // 5分
  
  /**
   * 階層アクセス可能テナント一覧（キャッシュ付き）
   */
  static async getAccessibleTenantsWithCache(
    organizationId: string,
    scopeLevel: string
  ): Promise<string[]> {
    const cacheKey = `hierarchy:tenants:${organizationId}:${scopeLevel}`
    
    // Redisキャッシュチェック
    const cached = await RedisManager.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }
    
    // DB取得
    const tenants = await HierarchyPermissionManager.getAccessibleTenants(
      organizationId, 
      scopeLevel
    )
    
    // キャッシュ保存
    await RedisManager.setex(cacheKey, this.CACHE_TTL, JSON.stringify(tenants))
    
    return tenants
  }
}

// 段階的データロード
export class HierarchyDataLoader {
  /**
   * 階層別段階ロード（大規模グループ対応）
   */
  static async loadHierarchyData(
    level: number,
    parentId?: string,
    limit: number = 50
  ): Promise<OrganizationNode[]> {
    return await prisma.organization_hierarchy.findMany({
      where: {
        level: level,
        parent_id: parentId,
        deleted_at: null
      },
      orderBy: [
        { name: 'asc' }
      ],
      take: limit,
      include: {
        _count: {
          select: { children: true }
        }
      }
    })
  }
}
```

---

## 🔍 **監査・コンプライアンス対応**

### **階層変更完全追跡**
```typescript
export class HierarchyAuditLog {
  /**
   * 階層変更の完全監査ログ
   */
  static async logHierarchyChange(
    operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE',
    organizationId: string,
    userId: string,
    beforeData?: any,
    afterData?: any,
    reason?: string
  ) {
    const auditEntry = {
      event_type: 'HIERARCHY_CHANGE',
      organization_id: organizationId,
      user_id: userId,
      operation: operation,
      before_state: beforeData,
      after_state: afterData,
      change_reason: reason,
      ip_address: this.getCurrentIP(),
      user_agent: this.getCurrentUserAgent(),
      timestamp: new Date(),
      
      // 影響範囲分析
      affected_children: await this.getAffectedChildren(organizationId),
      affected_tenants: await this.getAffectedTenants(organizationId),
      data_access_changes: await this.analyzeDataAccessChanges(beforeData, afterData)
    }
    
    // system_eventsテーブルに記録
    await prisma.system_event.create({
      data: {
        tenant_id: await this.getPrimaryTenantId(organizationId),
        user_id: userId,
        event_type: 'SYSTEM',
        source_system: 'hotel-common',
        entity_type: 'organization_hierarchy',
        entity_id: organizationId,
        action: operation,
        event_data: auditEntry
      }
    })
  }
}
```

---

## 🚀 **成功指標・測定項目**

### **技術指標**
- **階層クエリ応答速度**: 100ms以内（キャッシュ有効時）
- **大規模階層対応**: 1000店舗での5秒以内応答
- **同時ユーザー数**: 500ユーザー同時アクセス対応
- **データ整合性**: 99.99%維持

### **運用効率指標**
- **権限設定時間**: 従来比80%短縮
- **階層変更反映時間**: リアルタイム（10秒以内）
- **管理者作業効率**: 階層管理作業50%削減
- **エラー発生率**: 階層権限エラー90%削減

### **ビジネス指標**
- **新規グループ対応時間**: 1日以内セットアップ完了
- **M&A統合時間**: 1週間以内システム統合
- **コンプライアンス対応**: GDPR完全準拠
- **市場競争力**: 階層管理機能での差別化実現

---

**🌊 Iza（伊邪那岐）統合管理者として、この階層管理システムにより「単独店舗からメガチェーンまで」すべてのホテル事業形態に対応できる最強の統合基盤を創造いたします。Namiの「解像度100倍」要件に完全応える技術実装を実現し、ホテル業界の統合システムにおける革命的進化を推進いたします。** 