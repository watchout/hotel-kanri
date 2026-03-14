# 🎨 AI画像補正システム設計仕様書

**作成日**: 2025年1月19日  
**対象システム**: hotel-common（統合画像管理）  
**優先度**: 🔴 **高優先度**  
**実装担当**: 統合開発チーム

---

## 📋 **概要**

スマートフォンで撮影した画像を、カテゴリ別にプロフェッショナルレベルの品質に自動変換するAI画像補正システムの設計仕様書です。

### **🎯 目的**
- **品質向上**: スマホ撮影→プロレベル画像への自動変換
- **効率化**: 専門カメラマン不要での高品質画像作成
- **一貫性**: カテゴリ別最適化による統一された品質基準
- **コスト削減**: 撮影・編集コストの大幅削減

---

## 🏗️ **システム設計**

### **1. カテゴリ別AI補正設計**

#### **🍽️ オーダー（料理）用補正**
```typescript
interface FoodImageEnhancement {
  category: 'FOOD';
  enhancements: {
    // 色彩補正
    colorCorrection: {
      saturation: 1.3;        // 彩度向上
      warmth: 1.2;           // 暖色調整
      contrast: 1.15;        // コントラスト強化
    };
    
    // 照明最適化
    lighting: {
      shadowLift: 0.3;       // 影の持ち上げ
      highlightRecovery: 0.2; // ハイライト復元
      exposure: 'auto';       // 自動露出調整
    };
    
    // 料理特化処理
    foodSpecific: {
      steamEffect: true;      // 湯気エフェクト追加
      glossEnhancement: true; // 艶感向上
      textureSharpening: 1.4; // 食材テクスチャ強調
      plateCleanup: true;     // 皿周辺のクリーンアップ
    };
    
    // 背景処理
    background: {
      blur: 'subtle';         // 背景の軽いボケ
      noiseReduction: true;   // ノイズ除去
      colorHarmonization: true; // 背景色調和
    };
  };
}
```

#### **🏨 客室用補正**
```typescript
interface RoomImageEnhancement {
  category: 'ROOM';
  enhancements: {
    // 空間補正
    spatialCorrection: {
      perspectiveCorrection: true; // パースペクティブ補正
      verticalAlignment: true;     // 垂直線補正
      wideAngleDistortion: 'auto'; // 広角歪み補正
    };
    
    // 照明最適化
    lighting: {
      naturalLightBalance: true;   // 自然光バランス
      artificialLightWarmth: 1.1; // 人工照明の暖かさ
      shadowDetail: 0.4;          // 影部詳細強調
      windowBlowout: 'recover';   // 窓の白飛び復元
    };
    
    // 客室特化処理
    roomSpecific: {
      bedLinen: {
        whiteness: 1.2;           // リネンの白さ強調
        texture: 1.3;             // 質感向上
        wrinkleReduction: true;   // シワ軽減
      };
      furniture: {
        woodGrain: 1.2;           // 木目強調
        metalShine: 1.1;          // 金属光沢
        fabricTexture: 1.3;       // ファブリック質感
      };
      cleanliness: {
        dustRemoval: true;        // ホコリ除去
        stainReduction: true;     // シミ軽減
        surfacePolish: true;      // 表面磨き効果
      };
    };
    
    // 雰囲気作り
    ambiance: {
      cozyWarmth: 1.15;          // 居心地の良い暖かさ
      luxuryFilter: 'subtle';    // 高級感フィルター
      spaciousness: 1.1;         // 広々感演出
    };
  };
}
```

#### **🏛️ 館内施設用補正**
```typescript
interface FacilityImageEnhancement {
  category: 'FACILITY';
  enhancements: {
    // 建築補正
    architectural: {
      symmetryCorrection: true;    // 対称性補正
      lineAlignment: true;         // 線の整列
      proportionBalance: true;     // 比例バランス
    };
    
    // 照明・雰囲気
    lighting: {
      dramaticLighting: 1.2;      // ドラマチック照明
      architecturalHighlight: true; // 建築的ハイライト
      depthEnhancement: 1.3;      // 奥行き感強調
    };
    
    // 施設特化処理
    facilitySpecific: {
      lobby: {
        grandeur: 1.4;            // 壮大感演出
        marbleShine: 1.3;         // 大理石光沢
        chandelierSparkle: true;  // シャンデリア輝き
      };
      restaurant: {
        intimateAmbiance: 1.2;    // 親密な雰囲気
        tablewareShine: 1.3;      // 食器の輝き
        candlelightWarmth: 1.4;   // キャンドル光の暖かさ
      };
      spa: {
        tranquility: 1.3;         // 静寂感
        waterReflection: 1.4;     // 水面反射強調
        zenAtmosphere: true;      // 禅的雰囲気
      };
      gym: {
        energetic: 1.2;           // エネルギッシュ感
        equipmentShine: 1.3;      // 器具の光沢
        motivationalBrightness: 1.1; // やる気を起こす明るさ
      };
    };
  };
}
```

### **2. AI処理パイプライン**

```typescript
class AIImageEnhancementPipeline {
  async processImage(
    originalImage: Buffer,
    category: ImageCategory,
    options?: EnhancementOptions
  ): Promise<EnhancedImageResult> {
    
    // Step 1: 画像分析
    const analysis = await this.analyzeImage(originalImage);
    
    // Step 2: カテゴリ別設定取得
    const enhancementConfig = this.getEnhancementConfig(category, analysis);
    
    // Step 3: AI処理実行
    const processed = await this.executeAIProcessing(originalImage, enhancementConfig);
    
    // Step 4: 品質検証
    const qualityScore = await this.validateQuality(processed);
    
    // Step 5: 結果生成
    return {
      enhanced: processed,
      original: originalImage,
      metadata: {
        category,
        qualityScore,
        processingTime: Date.now() - startTime,
        appliedEnhancements: enhancementConfig,
        confidence: qualityScore
      }
    };
  }
  
  private async analyzeImage(image: Buffer): Promise<ImageAnalysis> {
    return {
      lighting: await this.analyzeLighting(image),
      composition: await this.analyzeComposition(image),
      colors: await this.analyzeColors(image),
      objects: await this.detectObjects(image),
      quality: await this.assessQuality(image)
    };
  }
}
```

### **3. API設計**

```typescript
// POST /api/v1/images/enhance
interface ImageEnhancementRequest {
  image: File;
  category: 'FOOD' | 'ROOM' | 'FACILITY';
  subcategory?: string; // 'lobby', 'restaurant', 'spa', etc.
  options?: {
    intensity: 'subtle' | 'moderate' | 'strong';
    preserveOriginal: boolean;
    generateVariations: boolean;
  };
}

interface ImageEnhancementResponse {
  success: boolean;
  data: {
    enhanced: {
      url: string;
      filename: string;
      size: number;
      dimensions: { width: number; height: number; };
    };
    original: {
      url: string;
      preserved: boolean;
    };
    variations?: Array<{
      style: string;
      url: string;
    }>;
    metadata: {
      category: string;
      qualityScore: number;
      processingTime: number;
      appliedEnhancements: string[];
      confidence: number;
    };
  };
}
```

---

## 🛠️ **技術実装**

### **1. AI処理エンジン**

#### **選択肢A: OpenAI DALL-E 3 + GPT-4 Vision**
```typescript
class OpenAIImageEnhancer {
  async enhanceImage(image: Buffer, category: string): Promise<Buffer> {
    // GPT-4 Visionで画像分析
    const analysis = await this.analyzeWithGPT4V(image, category);
    
    // DALL-E 3で画像生成・編集
    const enhanced = await this.enhanceWithDALLE3(image, analysis);
    
    return enhanced;
  }
}
```

#### **選択肢B: Stability AI + Replicate**
```typescript
class StabilityAIEnhancer {
  async enhanceImage(image: Buffer, category: string): Promise<Buffer> {
    // Stable Diffusion XLで画像補正
    const enhanced = await this.processWithSDXL(image, {
      prompt: this.generatePrompt(category),
      strength: 0.3, // 元画像を70%保持
      guidance_scale: 7.5
    });
    
    return enhanced;
  }
}
```

#### **選択肢C: Adobe Firefly API**
```typescript
class AdobeFireflyEnhancer {
  async enhanceImage(image: Buffer, category: string): Promise<Buffer> {
    // Adobe Fireflyで商用利用安全な画像処理
    const enhanced = await this.processWithFirefly(image, {
      style: this.getCategoryStyle(category),
      enhancement: 'professional'
    });
    
    return enhanced;
  }
}
```

### **2. 処理最適化**

```typescript
class ImageProcessingOptimizer {
  // バッチ処理
  async processBatch(images: ImageRequest[]): Promise<ImageResult[]> {
    const batches = this.createBatches(images, 5); // 5枚ずつ処理
    const results = [];
    
    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map(img => this.processImage(img))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
  
  // キャッシュ機能
  async getCachedOrProcess(imageHash: string, category: string): Promise<Buffer> {
    const cached = await this.cache.get(`${imageHash}-${category}`);
    if (cached) return cached;
    
    const processed = await this.processImage(imageHash, category);
    await this.cache.set(`${imageHash}-${category}`, processed, '7d');
    
    return processed;
  }
}
```

---

## 📊 **品質管理**

### **1. 品質評価指標**

```typescript
interface QualityMetrics {
  technical: {
    sharpness: number;      // 0-100: 鮮明度
    exposure: number;       // 0-100: 露出適正度
    colorBalance: number;   // 0-100: 色バランス
    noise: number;          // 0-100: ノイズレベル（低いほど良い）
  };
  
  aesthetic: {
    composition: number;    // 0-100: 構図の良さ
    lighting: number;       // 0-100: 照明の質
    appeal: number;         // 0-100: 視覚的魅力
  };
  
  category: {
    foodAppetizing: number; // 料理の美味しそう度
    roomComfort: number;    // 客室の快適そう度
    facilityLuxury: number; // 施設の高級感
  };
}
```

### **2. A/Bテスト機能**

```typescript
class ImageQualityTester {
  async runABTest(
    originalImage: Buffer,
    enhancedVariations: Buffer[],
    testGroup: string[]
  ): Promise<ABTestResult> {
    
    const results = await Promise.all(
      testGroup.map(userId => 
        this.getUserPreference(userId, originalImage, enhancedVariations)
      )
    );
    
    return this.analyzeResults(results);
  }
}
```

---

## 💰 **コスト管理**

### **1. 処理コスト最適化**

```typescript
interface CostOptimization {
  // 段階的処理
  tiers: {
    basic: {
      cost: 0.01;           // $0.01/image
      processing: 'fast';
      quality: 'good';
    };
    professional: {
      cost: 0.05;           // $0.05/image
      processing: 'detailed';
      quality: 'excellent';
    };
    premium: {
      cost: 0.10;           // $0.10/image
      processing: 'ai_enhanced';
      quality: 'exceptional';
    };
  };
  
  // 使用量制限
  limits: {
    daily: 100;             // 1日100枚まで
    monthly: 2000;          // 月2000枚まで
    perUser: 50;            // ユーザー1日50枚まで
  };
}
```

---

## 🚀 **実装ロードマップ**

### **Phase 1: 基盤構築（Week 1-2）**
- [ ] AI画像処理API選定・統合
- [ ] 基本的な画像補正パイプライン構築
- [ ] カテゴリ別設定システム実装

### **Phase 2: カテゴリ特化（Week 3-4）**
- [ ] 料理画像特化処理実装
- [ ] 客室画像特化処理実装
- [ ] 館内施設画像特化処理実装

### **Phase 3: 品質向上（Week 5-6）**
- [ ] 品質評価システム実装
- [ ] A/Bテスト機能実装
- [ ] ユーザーフィードバック収集

### **Phase 4: 最適化（Week 7-8）**
- [ ] パフォーマンス最適化
- [ ] コスト最適化
- [ ] 運用監視システム構築

---

## 🎯 **期待効果**

### **1. 品質向上**
- **画像品質**: スマホ撮影→プロレベル（品質スコア: 60→90）
- **一貫性**: カテゴリ別最適化による統一品質
- **効率性**: 撮影時間50%削減、編集時間90%削減

### **2. コスト削減**
- **人件費**: プロカメラマン不要（月額30万円→0円）
- **機材費**: 専門機材不要（初期投資100万円→0円）
- **時間コスト**: 撮影・編集時間の大幅短縮

### **3. 運用効率**
- **即時性**: 撮影→補正→公開が数分で完了
- **品質保証**: AI による一定品質の保証
- **スケーラビリティ**: 大量画像の一括処理対応

---

**作成者**: hotel-kanri統合管理システム  
**承認**: システム統括責任者  
**次回更新**: 実装進捗に応じて随時更新
