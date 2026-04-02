# 🖼️ メディア管理統合移行計画書

**作成日**: 2025年1月19日  
**対象**: hotel-common統合基盤  
**移行対象**: hotel-saas、hotel-pms、hotel-member  
**優先度**: 🔴 **最高優先度**

---

## 📋 **移行戦略概要**

### **🎯 統合アプローチ**
既存の分散メディア管理を**段階的に統合**し、AI画像補正機能を含む統一基盤を構築します。

```typescript
// 統合移行戦略
interface MigrationStrategy {
  approach: 'GRADUAL_INTEGRATION';  // 段階的統合
  compatibility: 'BACKWARD_COMPATIBLE';  // 後方互換性維持
  downtime: 'ZERO_DOWNTIME';  // ゼロダウンタイム
  rollback: 'INSTANT_ROLLBACK';  // 即座ロールバック可能
}
```

---

## 🔄 **段階的移行計画**

### **Phase 1: 統合基盤構築（Week 1-2）**

#### **1.1 hotel-common統合API実装**
```typescript
// 統合メディアAPI（既存API互換）
interface UnifiedMediaAPI {
  // 既存hotel-saas互換
  'POST /api/v1/uploads/image': {
    compatibility: 'hotel-saas-full'
    enhancements: ['ai_enhancement', 'category_optimization']
    migration: 'transparent_proxy'
  }
  
  // 既存hotel-pms互換  
  'POST /api/pms/handover/media': {
    compatibility: 'hotel-pms-full'
    enhancements: ['unified_storage', 'cross_system_sharing']
    migration: 'transparent_proxy'
  }
  
  // 新統合エンドポイント
  'POST /api/unified/media/upload': {
    features: ['multi_system_support', 'ai_enhancement', 'smart_categorization']
    target_systems: ['saas', 'pms', 'member']
  }
}
```

#### **1.2 Docker統合ストレージ設定**
```yaml
# docker-compose.unified.yml 拡張
services:
  # 統合メディアストレージ
  common:
    volumes:
      - unified_media_storage:/app/uploads  # 統合ストレージ
      - /Users/kaneko/hotel-common:/app
      - common_node_modules:/app/node_modules
    environment:
      - MEDIA_STORAGE_PATH=/app/uploads
      - AI_ENHANCEMENT_ENABLED=true
      - CROSS_SYSTEM_SHARING=true

  saas:
    volumes:
      - unified_media_storage:/app/uploads  # 共有ストレージ
      - /Users/kaneko/hotel-saas:/app
    environment:
      - MEDIA_API_PROXY=http://common:3400/api/unified/media

  pms:
    volumes:
      - unified_media_storage:/app/uploads  # 共有ストレージ
      - /Users/kaneko/hotel-pms:/app
    environment:
      - MEDIA_API_PROXY=http://common:3400/api/unified/media

volumes:
  unified_media_storage:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/lib/hotel-unified/media
```

### **Phase 2: 透明プロキシ実装（Week 2-3）**

#### **2.1 既存API透明プロキシ**
```typescript
// hotel-saas透明プロキシ
export class SaaSMediaProxy {
  /**
   * 既存 /api/v1/uploads/image を透明プロキシ
   */
  async proxyImageUpload(req: Request): Promise<Response> {
    // 1. 既存リクエスト形式を維持
    const originalRequest = this.preserveOriginalFormat(req)
    
    // 2. 統合APIに転送（AI補正付き）
    const enhancedRequest = await this.addAiEnhancement(originalRequest, {
      category: this.detectImageCategory(req.file),
      autoEnhance: true,
      returnOriginalFormat: true
    })
    
    // 3. hotel-commonで処理
    const result = await this.callUnifiedAPI(enhancedRequest)
    
    // 4. 既存レスポンス形式で返却
    return this.formatAsOriginalResponse(result)
  }
}

// hotel-pms透明プロキシ
export class PMSMediaProxy {
  /**
   * 申し送りメディア透明プロキシ
   */
  async proxyHandoverMedia(req: Request): Promise<Response> {
    // 1. 申し送り特化処理
    const handoverContext = this.extractHandoverContext(req)
    
    // 2. 統合APIで処理（施設カテゴリ自動判定）
    const result = await this.callUnifiedAPI({
      ...req,
      metadata: {
        category: 'FACILITY',
        context: 'handover',
        autoEnhance: true,
        generateThumbnail: true
      }
    })
    
    // 3. 申し送りテーブル更新
    await this.updateHandoverMedia(handoverContext.noteId, result)
    
    return result
  }
}
```

#### **2.2 データ移行戦略**
```typescript
// ゼロダウンタイム移行
export class MediaMigrationService {
  /**
   * 既存メディアファイル段階移行
   */
  async migrateExistingMedia(): Promise<void> {
    // 1. hotel-saas既存ファイル移行
    await this.migrateSaaSMedia({
      sourcePath: '/uploads/info/',
      targetPath: '/unified/saas/',
      preserveUrls: true,
      addAiEnhancement: true
    })
    
    // 2. hotel-pms既存ファイル移行
    await this.migratePMSMedia({
      sourcePath: '/pms/handover/',
      targetPath: '/unified/pms/',
      preserveReferences: true,
      addMetadata: true
    })
    
    // 3. URL書き換え（透明）
    await this.updateMediaReferences()
  }
  
  /**
   * 段階的URL更新
   */
  async updateMediaReferences(): Promise<void> {
    // データベース内URL更新
    await this.updateDatabaseUrls()
    
    // キャッシュ更新
    await this.updateCacheUrls()
    
    // CDN更新
    await this.updateCdnUrls()
  }
}
```

### **Phase 3: AI機能統合（Week 3-4）**

#### **3.1 カテゴリ自動判定**
```typescript
// 既存システム別カテゴリ自動判定
export class CategoryAutoDetection {
  /**
   * アップロード元システムによる自動カテゴリ判定
   */
  async detectCategory(
    file: File, 
    sourceSystem: 'saas' | 'pms' | 'member',
    context?: any
  ): Promise<ImageCategory> {
    
    switch (sourceSystem) {
      case 'saas':
        // hotel-saas: 主に施設・キャンペーン画像
        return await this.detectSaaSCategory(file, context)
        
      case 'pms':
        // hotel-pms: 主に申し送り・メンテナンス画像
        return await this.detectPMSCategory(file, context)
        
      case 'member':
        // hotel-member: 主にプロフィール・イベント画像
        return await this.detectMemberCategory(file, context)
    }
  }
  
  private async detectSaaSCategory(file: File, context: any): Promise<ImageCategory> {
    // コンテキスト分析
    if (context?.endpoint?.includes('campaign')) return 'FACILITY'
    if (context?.endpoint?.includes('info')) return 'FACILITY'
    if (context?.filename?.includes('menu')) return 'FOOD'
    
    // AI画像分析
    return await this.aiCategoryDetection(file, ['FACILITY', 'FOOD'])
  }
  
  private async detectPMSCategory(file: File, context: any): Promise<ImageCategory> {
    // 申し送りコンテキスト
    if (context?.handoverCategory === 'MAINTENANCE') return 'FACILITY'
    if (context?.handoverCategory === 'CLEANING') return 'ROOM'
    
    // デフォルト施設カテゴリ
    return 'FACILITY'
  }
}
```

#### **3.2 システム別AI最適化**
```typescript
// システム別最適化設定
interface SystemOptimization {
  saas: {
    // キャンペーン・施設画像重視
    defaultCategory: 'FACILITY'
    aiEnhancement: {
      priority: ['luxury_filter', 'color_enhancement', 'sharpness']
      qualityTarget: 95
      processingTime: 'fast'
    }
    outputFormats: ['webp', 'jpg']
    thumbnailSizes: [150, 300, 800]
  }
  
  pms: {
    // 申し送り・記録画像重視
    defaultCategory: 'FACILITY'
    aiEnhancement: {
      priority: ['clarity_boost', 'noise_reduction', 'text_readability']
      qualityTarget: 90
      processingTime: 'standard'
    }
    outputFormats: ['jpg', 'png']
    thumbnailSizes: [150, 400]
  }
  
  member: {
    // プロフィール・イベント画像
    defaultCategory: 'GUEST'
    aiEnhancement: {
      priority: ['portrait_enhancement', 'background_blur']
      qualityTarget: 88
      processingTime: 'fast'
    }
    outputFormats: ['webp', 'jpg']
    thumbnailSizes: [100, 200, 400]
  }
}
```

### **Phase 4: 完全統合（Week 4-5）**

#### **4.1 統合API完全移行**
```typescript
// 完全統合後のAPI構造
export class UnifiedMediaSystem {
  /**
   * 全システム統合エンドポイント
   */
  async handleUnifiedUpload(req: UnifiedUploadRequest): Promise<UnifiedResponse> {
    // 1. システム認証・権限確認
    const systemAuth = await this.authenticateSystem(req.headers)
    
    // 2. カテゴリ自動判定
    const category = await this.detectCategory(req.file, systemAuth.system)
    
    // 3. AI補正実行
    const enhanced = await this.aiEnhancer.enhance(req.file, category)
    
    // 4. 統合ストレージ保存
    const stored = await this.unifiedStorage.save(enhanced)
    
    // 5. システム間共有設定
    await this.configureSharing(stored, systemAuth.system)
    
    // 6. 統一レスポンス
    return this.formatUnifiedResponse(stored)
  }
  
  /**
   * システム間メディア共有
   */
  async shareMedia(
    mediaId: string,
    fromSystem: SystemType,
    toSystems: SystemType[]
  ): Promise<ShareResult> {
    // 権限確認
    await this.verifySharePermissions(mediaId, fromSystem, toSystems)
    
    // 共有設定
    const shareConfig = await this.createShareConfiguration(mediaId, toSystems)
    
    // 通知配信
    await this.notifySystemsOfShare(shareConfig)
    
    return shareConfig
  }
}
```

---

## 🔧 **技術実装詳細**

### **統合データベース設計**
```sql
-- 統合メディア管理テーブル（既存テーブル統合）
CREATE TABLE unified_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- ファイル情報
  original_filename VARCHAR(255) NOT NULL,
  stored_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  
  -- 画像情報
  width INTEGER,
  height INTEGER,
  format VARCHAR(10),
  
  -- AI処理情報
  is_ai_enhanced BOOLEAN DEFAULT FALSE,
  enhancement_category image_category_enum,
  quality_score DECIMAL(3,2),
  processing_metadata JSONB,
  
  -- システム情報
  source_system system_type_enum NOT NULL,
  upload_context JSONB,
  
  -- 既存システム互換フィールド
  saas_info_article_id INTEGER,        -- hotel-saas互換
  pms_handover_note_id UUID,           -- hotel-pms互換
  member_profile_id UUID,              -- hotel-member互換
  
  -- 共有設定
  shared_with_systems system_type_enum[],
  access_level access_level_enum DEFAULT 'PRIVATE',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 既存テーブルとの関連付け
CREATE TABLE media_legacy_mapping (
  unified_media_id UUID NOT NULL REFERENCES unified_media(id),
  legacy_system system_type_enum NOT NULL,
  legacy_table_name VARCHAR(100) NOT NULL,
  legacy_record_id VARCHAR(100) NOT NULL,
  migration_date TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT media_legacy_mapping_unique 
    UNIQUE (legacy_system, legacy_table_name, legacy_record_id)
);
```

### **Docker統合設定**
```yaml
# 統合メディアストレージ設定
services:
  common:
    volumes:
      - unified_media:/app/uploads
      - ai_models:/app/ai-models
    environment:
      - UNIFIED_MEDIA_ENABLED=true
      - AI_ENHANCEMENT_ENABLED=true
      - CROSS_SYSTEM_SHARING=true

volumes:
  unified_media:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/lib/hotel-unified/media
  
  ai_models:
    driver: local
    driver_opts:
      type: none  
      o: bind
      device: /var/lib/hotel-unified/ai-models
```

---

## 📊 **移行スケジュール**

### **Week 1-2: 基盤構築**
- [ ] 統合データベーススキーマ実装
- [ ] hotel-common統合API実装
- [ ] Docker統合ストレージ設定
- [ ] 透明プロキシ実装

### **Week 3: 段階移行開始**
- [ ] hotel-saas透明プロキシ有効化
- [ ] hotel-pms透明プロキシ有効化
- [ ] 既存メディアファイル移行開始
- [ ] AI機能統合テスト

### **Week 4: AI機能統合**
- [ ] カテゴリ自動判定実装
- [ ] システム別最適化設定
- [ ] 品質評価システム実装
- [ ] パフォーマンス最適化

### **Week 5: 完全統合**
- [ ] 透明プロキシ→直接統合API移行
- [ ] システム間共有機能実装
- [ ] 監視・分析システム実装
- [ ] 運用マニュアル整備

---

## 🎯 **期待効果**

### **技術効果**
- **ストレージ統合**: 重複ファイル削除で50%容量削減
- **処理速度**: AI補正による品質向上（60→90スコア）
- **開発効率**: 統一API による開発時間50%短縮

### **運用効果**
- **品質統一**: 全システム統一品質保証
- **コスト削減**: インフラ統合で30%コスト削減
- **保守効率**: 一元管理で保守時間70%短縮

### **ビジネス効果**
- **顧客満足**: 高品質画像による魅力向上
- **競争優位**: AI補正による差別化
- **収益向上**: 予約・売上への直接的影響

---

**作成者**: hotel-kanri統合管理システム  
**承認**: システム統括責任者  
**関連文書**: UNIFIED_IMAGE_MANAGEMENT_SPEC.md, AI_IMAGE_ENHANCEMENT_SYSTEM_SPEC.md
