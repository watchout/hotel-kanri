# AIビルド機能 - 技術仕様書

## 🏗️ **システムアーキテクチャ**

### **🔄 処理フロー**
```
1. ユーザー入力 → 2. AI分析 → 3. デザイン生成 → 4. プレビュー → 5. 適用・保存
```

### **🛠️ 技術スタック**
```json
{
  "ai_service": {
    "primary": "OpenAI GPT-4 Turbo",
    "fallback": "Claude 3.5 Sonnet", 
    "vision": "GPT-4 Vision (画像解析)",
    "cost_optimization": "質問形式メイン + AI最小限使用"
  },
  "prompt_management": {
    "framework": "LangChain / Promptfoo",
    "versioning": "A/Bテスト対応プロンプト管理",
    "caching": "Redis (同様質問の結果キャッシュ)"
  },
  "css_generation": {
    "engine": "CSS Variables + Tailwind Classes",
    "validation": "PostCSS + Stylelint",
    "preview": "Iframe Sandbox"
  }
}
```

## 🎨 **デザインシステム設計**

### **📋 テンプレートベース設計**
```javascript
// 基本テンプレート構造
const baseTemplate = {
  // 色彩設定
  colors: {
    primary: "#variable",
    secondary: "#variable", 
    accent: "#variable",
    text: "#variable",
    background: "#variable"
  },
  
  // タイポグラフィ
  typography: {
    headingFont: "font-family",
    bodyFont: "font-family", 
    fontSizes: "scale-system",
    lineHeights: "ratio-system"
  },
  
  // レイアウト・スペーシング
  layout: {
    containerWidth: "max-width",
    borderRadius: "radius-scale",
    shadows: "elevation-system",
    spacing: "spacing-scale"
  },
  
  // コンポーネントスタイル
  components: {
    buttons: "style-variants",
    cards: "style-variants",
    forms: "style-variants"
  }
};
```

### **🎯 AI生成ロジック**
```javascript
// Step 1: ユーザー入力解析
const parseUserInput = (input) => {
  return {
    hotelType: extractHotelType(input),      // "luxury", "family", "business"
    targetAge: extractTargetAge(input),      // "young", "middle", "senior" 
    atmosphere: extractAtmosphere(input),    // "modern", "traditional", "cozy"
    colorPreference: extractColors(input)    // "warm", "cool", "neutral"
  };
};

// Step 2: ホテル業界知識適用
const applyHotelExpertise = (userProfile) => {
  const expertiseMap = {
    "luxury-senior": {
      colors: ["#2c3e50", "#8b7355", "#f8f6f0"],
      fonts: ["serif", "elegant"],
      layout: "spacious",
      accessibility: "high-contrast"
    },
    "family-young": {
      colors: ["#3498db", "#2ecc71", "#f39c12"], 
      fonts: ["sans-serif", "friendly"],
      layout: "playful",
      accessibility: "colorful-safe"
    }
    // ... 他のパターン
  };
  
  return expertiseMap[`${userProfile.hotelType}-${userProfile.targetAge}`];
};

// Step 3: CSS生成
const generateCSS = (designSpec) => {
  return `
    :root {
      --color-primary: ${designSpec.colors[0]};
      --color-secondary: ${designSpec.colors[1]};
      --color-accent: ${designSpec.colors[2]};
      --font-heading: ${designSpec.fonts[0]};
      --font-body: ${designSpec.fonts[1]};
      --border-radius: ${designSpec.layout.borderRadius};
    }
  `;
};
```

## 🔧 **実装アプローチ**

### **Phase 1: 質問ベースAI (推奨初期実装)**
```typescript
interface AIQuestionnaireFlow {
  questions: {
    hotelType: "ホテルの種類は？",
    targetGuests: "主なお客様層は？",
    brandImage: "目指すブランドイメージは？", 
    colorPreference: "好みの色調は？"
  };
  
  aiPrompt: `
    ホテル: ${answers.hotelType}
    客層: ${answers.targetGuests}  
    ブランド: ${answers.brandImage}
    色調: ${answers.colorPreference}
    
    上記情報に基づき、以下のJSON形式でデザイン設定を生成してください：
    {
      "colors": {"primary": "#hex", "secondary": "#hex"},
      "typography": {"heading": "font-name", "body": "font-name"},
      "layout": {"style": "modern|classic|luxury"}
    }
  `;
}
```

### **Phase 2: フリーテキストAI**
```typescript
interface AIFreeformFlow {
  userInput: string; // "60代向け温泉旅館で落ち着いた雰囲気"
  
  aiPrompt: `
    以下のホテル要件を分析し、適切なデザイン設定を提案してください：
    
    要件: ${userInput}
    
    ホテル業界のベストプラクティスを考慮し、
    アクセシビリティと変換率最適化を重視した設計にしてください。
  `;
}
```

## 📊 **品質管理・最適化**

### **🎯 A/Bテストシステム**
```javascript
const abTestConfig = {
  prompts: {
    version_a: "詳細質問ベース",
    version_b: "簡単質問ベース", 
    version_c: "フリーテキスト"
  },
  
  metrics: {
    user_satisfaction: "1-5点評価",
    time_to_complete: "設定完了時間",
    design_adoption_rate: "AI提案の採用率"
  }
};
```

### **💰 コスト最適化**
```javascript
const costOptimization = {
  caching: {
    similar_requests: "類似要求の結果キャッシュ",
    template_matching: "テンプレート優先、AI補完",
    redis_ttl: "24時間キャッシュ"
  },
  
  tiered_processing: {
    basic: "テンプレート選択のみ",
    pro: "AI カスタマイズ",
    enterprise: "完全AI生成"
  }
};
```

## 🗂️ **データベース拡張**

### **🤖 ai_prompts (プロンプト管理)**
```sql
CREATE TABLE ai_prompts (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL,      -- "v1.0", "v1.1"
    prompt_type VARCHAR(50) NOT NULL,  -- "questionnaire", "freeform"
    prompt_text TEXT NOT NULL,
    success_rate DECIMAL(4,2),         -- A/Bテスト結果
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **📈 ai_analytics (AI使用分析)**
```sql
CREATE TABLE ai_analytics (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES groups(id),
    prompt_version VARCHAR(20),
    user_input TEXT,
    generated_output JSON,
    user_rating INTEGER,              -- 1-5
    completion_time_seconds INTEGER,
    was_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🚀 **実装優先度 提案**

### **🥇 最優先 (Phase 1)**
- ✅ 質問ベースAI (4-5質問)
- ✅ 基本テンプレート (5種類)
- ✅ プレビュー機能

### **🥈 次優先 (Phase 2)**  
- ✅ フリーテキスト入力
- ✅ AI学習・改善システム
- ✅ 履歴・ロールバック

### **🥉 将来実装 (Phase 3)**
- ✅ 画像ベース入力
- ✅ リアルタイム調整
- ✅ 高度なアニメーション

この技術方針で開発を進めますか？特に重視したい機能や技術的な懸念があれば教えてください！ 