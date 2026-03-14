# 🖼️ 統合画像管理システム設計仕様書

**作成日**: 2025年1月19日  
**対象システム**: hotel-common（統合基盤）  
**優先度**: 🔴 **最高優先度**  
**実装担当**: 統合開発チーム

---

## 📋 **概要**

hotel-saas、hotel-pms、hotel-member間で統一された画像管理を提供する統合システムの設計仕様書です。AI画像補正機能を含む包括的な画像管理ソリューションを提供します。

---

## 🏗️ **システム設計**

### **1. 統合アーキテクチャ**

```typescript
// 統合画像管理API
interface UnifiedImageManagementAPI {
  // 基本操作
  upload(file: File, metadata: ImageMetadata): Promise<ImageResponse>;
  get(imageId: string, options?: GetOptions): Promise<ImageData>;
  update(imageId: string, updates: ImageUpdates): Promise<ImageResponse>;
  delete(imageId: string): Promise<DeleteResponse>;
  
  // AI補正機能
  enhance(imageId: string, category: ImageCategory): Promise<EnhancedImageResponse>;
  
  // システム間共有
  share(imageId: string, targetSystems: SystemType[]): Promise<ShareResponse>;
  getShared(systemId: string, filters?: ShareFilters): Promise<SharedImagesResponse>;
  
  // バッチ処理
  batchProcess(operations: BatchOperation[]): Promise<BatchResponse>;
}
```

### **2. データベース設計**

```sql
-- 統合画像管理テーブル
CREATE TABLE unified_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- ファイル情報
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  
  -- 画像情報
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  format VARCHAR(10) NOT NULL,
  color_space VARCHAR(20),
  
  -- メタデータ
  title VARCHAR(255),
  description TEXT,
  alt_text VARCHAR(500),
  tags TEXT[],
  category image_category_enum NOT NULL,
  subcategory VARCHAR(100),
  
  -- AI処理情報
  is_ai_enhanced BOOLEAN DEFAULT FALSE,
  enhancement_version VARCHAR(20),
  quality_score DECIMAL(3,2),
  processing_metadata JSONB,
  
  -- システム情報
  uploaded_by UUID NOT NULL,
  upload_system system_type_enum NOT NULL,
  upload_ip VARCHAR(45),
  
  -- セキュリティ
  virus_scan_status VARCHAR(20) DEFAULT 'PENDING',
  virus_scan_result TEXT,
  access_level access_level_enum DEFAULT 'PRIVATE',
  
  -- バージョン管理
  version INTEGER DEFAULT 1,
  parent_image_id UUID REFERENCES unified_images(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- 画像共有管理
CREATE TABLE image_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES unified_images(id),
  source_system system_type_enum NOT NULL,
  target_system system_type_enum NOT NULL,
  share_type share_type_enum NOT NULL,
  permissions JSONB NOT NULL,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 画像処理履歴
CREATE TABLE image_processing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL REFERENCES unified_images(id),
  operation_type VARCHAR(50) NOT NULL,
  parameters JSONB,
  result_metadata JSONB,
  processing_time INTEGER, -- milliseconds
  success BOOLEAN NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ENUM定義
CREATE TYPE image_category_enum AS ENUM (
  'FOOD', 'ROOM', 'FACILITY', 'STAFF', 'GUEST', 'DOCUMENT', 'OTHER'
);

CREATE TYPE system_type_enum AS ENUM (
  'HOTEL_SAAS', 'HOTEL_PMS', 'HOTEL_MEMBER', 'HOTEL_COMMON'
);

CREATE TYPE access_level_enum AS ENUM (
  'PUBLIC', 'INTERNAL', 'PRIVATE', 'RESTRICTED'
);

CREATE TYPE share_type_enum AS ENUM (
  'READ_ONLY', 'READ_WRITE', 'REFERENCE', 'COPY'
);
```

### **3. ストレージ戦略**

```typescript
interface StorageStrategy {
  // 階層化ストレージ
  tiers: {
    hot: {
      storage: 'local_ssd';
      retention: '30_days';
      access: 'immediate';
      cost: 'high';
    };
    warm: {
      storage: 's3_standard';
      retention: '1_year';
      access: 'fast';
      cost: 'medium';
    };
    cold: {
      storage: 's3_glacier';
      retention: 'permanent';
      access: 'archive';
      cost: 'low';
    };
  };
  
  // 自動階層移動
  lifecycle: {
    hotToCold: '30_days';
    warmToCold: '365_days';
    deleteAfter: 'never'; // ホテル業界では画像は永続保存
  };
}
```

---

## 🤖 **AI画像補正統合**

### **1. 統合処理パイプライン**

```typescript
class UnifiedImageProcessor {
  async processImage(
    imageId: string,
    category: ImageCategory,
    options: ProcessingOptions = {}
  ): Promise<ProcessedImageResult> {
    
    // 1. 画像取得
    const image = await this.getImage(imageId);
    
    // 2. AI補正実行
    const enhanced = await this.aiEnhancer.enhance(image.buffer, category, options);
    
    // 3. 新バージョンとして保存
    const newVersion = await this.saveAsNewVersion(imageId, enhanced);
    
    // 4. メタデータ更新
    await this.updateMetadata(newVersion.id, {
      is_ai_enhanced: true,
      enhancement_version: this.aiEnhancer.version,
      quality_score: enhanced.qualityScore,
      processing_metadata: enhanced.metadata
    });
    
    // 5. 処理履歴記録
    await this.recordProcessingHistory(imageId, 'AI_ENHANCEMENT', {
      category,
      options,
      result: enhanced.metadata
    });
    
    return newVersion;
  }
}
```

### **2. カテゴリ別最適化設定**

```typescript
interface CategoryOptimization {
  FOOD: {
    aiModel: 'food_specialist_v2';
    enhancements: ['color_boost', 'steam_effect', 'texture_enhance'];
    qualityTarget: 95;
    processingTime: 'fast';
  };
  
  ROOM: {
    aiModel: 'interior_specialist_v2';
    enhancements: ['perspective_fix', 'lighting_balance', 'cleanliness_boost'];
    qualityTarget: 90;
    processingTime: 'standard';
  };
  
  FACILITY: {
    aiModel: 'architecture_specialist_v2';
    enhancements: ['symmetry_fix', 'dramatic_lighting', 'luxury_filter'];
    qualityTarget: 92;
    processingTime: 'detailed';
  };
}
```

---

## 🔗 **システム間連携**

### **1. API統合設計**

```typescript
// hotel-saas統合
class SaaSImageIntegration {
  async uploadCampaignImage(file: File): Promise<ImageResponse> {
    return await this.unifiedAPI.upload(file, {
      category: 'FACILITY',
      system: 'HOTEL_SAAS',
      access_level: 'PUBLIC',
      auto_enhance: true
    });
  }
  
  async getOptimizedImages(filters: ImageFilters): Promise<ImageData[]> {
    return await this.unifiedAPI.getShared('HOTEL_SAAS', {
      ...filters,
      enhanced_only: true
    });
  }
}

// hotel-pms統合
class PMSImageIntegration {
  async uploadHandoverPhoto(file: File, handoverId: string): Promise<ImageResponse> {
    return await this.unifiedAPI.upload(file, {
      category: 'FACILITY',
      system: 'HOTEL_PMS',
      reference_id: handoverId,
      access_level: 'INTERNAL',
      auto_enhance: true
    });
  }
  
  async shareWithSaaS(imageId: string): Promise<ShareResponse> {
    return await this.unifiedAPI.share(imageId, ['HOTEL_SAAS'], {
      type: 'READ_ONLY',
      expires_at: null // 永続共有
    });
  }
}
```

### **2. 権限管理**

```typescript
interface AccessControl {
  // システム別権限
  systemPermissions: {
    HOTEL_SAAS: ['upload', 'read', 'enhance', 'share_public'];
    HOTEL_PMS: ['upload', 'read', 'update', 'enhance', 'share_internal'];
    HOTEL_MEMBER: ['read', 'reference'];
    HOTEL_COMMON: ['admin', 'all'];
  };
  
  // カテゴリ別制限
  categoryRestrictions: {
    FOOD: {
      upload: ['HOTEL_SAAS', 'HOTEL_PMS'];
      view: ['all'];
      enhance: ['HOTEL_SAAS'];
    };
    ROOM: {
      upload: ['HOTEL_PMS'];
      view: ['HOTEL_SAAS', 'HOTEL_PMS'];
      enhance: ['HOTEL_PMS'];
    };
  };
}
```

---

## 📊 **監視・分析**

### **1. パフォーマンス監視**

```typescript
interface PerformanceMetrics {
  // 処理性能
  processing: {
    averageUploadTime: number;    // ms
    averageEnhancementTime: number; // ms
    throughput: number;           // images/hour
    errorRate: number;            // %
  };
  
  // ストレージ使用量
  storage: {
    totalSize: number;            // bytes
    byCategory: Record<string, number>;
    bySystem: Record<string, number>;
    growthRate: number;           // bytes/day
  };
  
  // AI処理統計
  aiProcessing: {
    enhancementRequests: number;
    successRate: number;          // %
    averageQualityImprovement: number; // score difference
    costPerImage: number;         // USD
  };
}
```

### **2. 品質分析**

```typescript
class QualityAnalytics {
  async generateQualityReport(): Promise<QualityReport> {
    return {
      overall: {
        averageQualityScore: await this.getAverageQuality(),
        enhancementEffectiveness: await this.getEnhancementStats(),
        userSatisfaction: await this.getUserFeedback()
      },
      
      byCategory: {
        FOOD: await this.getCategoryStats('FOOD'),
        ROOM: await this.getCategoryStats('ROOM'),
        FACILITY: await this.getCategoryStats('FACILITY')
      },
      
      trends: {
        qualityTrend: await this.getQualityTrend('30d'),
        usageTrend: await this.getUsageTrend('30d'),
        costTrend: await this.getCostTrend('30d')
      }
    };
  }
}
```

---

## 💰 **コスト最適化**

### **1. 使用量制御**

```typescript
interface UsageControl {
  // テナント別制限
  tenantLimits: {
    daily_uploads: 500;
    monthly_storage: '10GB';
    ai_enhancements: 200;
    api_calls: 10000;
  };
  
  // 自動最適化
  optimization: {
    autoCompress: true;           // 自動圧縮
    duplicateDetection: true;     // 重複検出
    unusedCleanup: '90d';        // 未使用画像削除
    formatOptimization: true;     // フォーマット最適化
  };
}
```

### **2. コスト監視**

```typescript
class CostMonitoring {
  async calculateMonthlyCost(): Promise<CostBreakdown> {
    return {
      storage: {
        local: await this.getLocalStorageCost(),
        s3: await this.getS3Cost(),
        cdn: await this.getCDNCost()
      },
      
      processing: {
        aiEnhancement: await this.getAIProcessingCost(),
        imageProcessing: await this.getImageProcessingCost(),
        thumbnailGeneration: await this.getThumbnailCost()
      },
      
      bandwidth: {
        upload: await this.getUploadBandwidthCost(),
        download: await this.getDownloadBandwidthCost(),
        cdn: await this.getCDNBandwidthCost()
      },
      
      total: 0 // 自動計算
    };
  }
}
```

---

## 🚀 **実装計画**

### **Phase 1: 基盤構築（Week 1-2）**
- [ ] 統合データベーススキーマ実装
- [ ] 基本API実装（CRUD操作）
- [ ] ストレージ統合

### **Phase 2: AI統合（Week 3-4）**
- [ ] AI画像補正システム統合
- [ ] カテゴリ別処理パイプライン実装
- [ ] 品質評価システム実装

### **Phase 3: システム統合（Week 5-6）**
- [ ] hotel-saas統合
- [ ] hotel-pms統合
- [ ] hotel-member統合

### **Phase 4: 最適化・監視（Week 7-8）**
- [ ] パフォーマンス最適化
- [ ] 監視システム実装
- [ ] コスト最適化実装

---

## 🎯 **期待効果**

### **1. 統合効果**
- **重複排除**: 同一画像の重複保存防止
- **一元管理**: 全システムの画像を統一管理
- **品質向上**: AI補正による一貫した高品質

### **2. 運用効率**
- **開発効率**: 各システムでの個別実装不要
- **保守効率**: 統一されたメンテナンス
- **コスト削減**: インフラ・運用コストの最適化

### **3. ビジネス価値**
- **顧客満足**: 高品質画像による魅力向上
- **競争優位**: AI補正による差別化
- **収益向上**: 予約・売上への直接的影響

---

**作成者**: hotel-kanri統合管理システム  
**承認**: システム統括責任者  
**関連文書**: AI_IMAGE_ENHANCEMENT_SYSTEM_SPEC.md
