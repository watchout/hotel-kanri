# スマートテンプレート＋AI支援設計

## 基本方針
- **AI支援はオプション機能**：すべて手動でも操作可能
- **段階的支援**：ユーザーが必要な分だけAIを活用
- **完全な制御権**：最終的な決定は必ずユーザー

## UI設計

### 1. テンプレート選択画面
```vue
<template>
  <div class="template-selection">
    <div class="template-grid">
      <div v-for="template in templates" class="template-card">
        <div class="template-preview">
          <img :src="template.preview" />
        </div>
        <div class="template-info">
          <h3>{{ template.name }}</h3>
          <p>{{ template.description }}</p>
        </div>
        <div class="creation-options">
          <button @click="createWithAI(template)" class="ai-button">
            <Icon name="heroicons:sparkles" />
            AI支援で作成
          </button>
          <button @click="createManually(template)" class="manual-button">
            <Icon name="heroicons:pencil" />
            手動で作成
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 2. AI支援モードの設定
```vue
<template>
  <div class="ai-assistance-config">
    <h3>AI支援レベル設定</h3>
    
    <div class="assistance-levels">
      <label class="level-option">
        <input type="radio" v-model="aiLevel" value="minimal" />
        <div class="level-info">
          <h4>最小限</h4>
          <p>既存データの自動入力のみ</p>
        </div>
      </label>
      
      <label class="level-option">
        <input type="radio" v-model="aiLevel" value="moderate" />
        <div class="level-info">
          <h4>適度</h4>
          <p>テキスト・レイアウト提案</p>
        </div>
      </label>
      
      <label class="level-option">
        <input type="radio" v-model="aiLevel" value="extensive" />
        <div class="level-info">
          <h4>最大限</h4>
          <p>全自動生成＋提案</p>
        </div>
      </label>
    </div>
    
    <div class="manual-override">
      <label>
        <input type="checkbox" v-model="manualOverride" />
        すべて手動で調整可能にする
      </label>
    </div>
  </div>
</template>
```

### 3. エディタ統合（AI提案＋手動調整）
```vue
<template>
  <div class="smart-editor">
    <!-- 通常のノーコードエディタ -->
    <NoCodeEditor 
      :blocks="blocks"
      :ai-suggestions="aiSuggestions"
      @update="handleUpdate"
    />
    
    <!-- AI支援パネル（オプション） -->
    <div v-if="showAIPanel" class="ai-panel">
      <h3>AI提案</h3>
      
      <div class="suggestions">
        <div v-for="suggestion in aiSuggestions" class="suggestion">
          <div class="suggestion-preview">
            <component :is="suggestion.component" v-bind="suggestion.props" />
          </div>
          <div class="suggestion-actions">
            <button @click="applySuggestion(suggestion)">
              適用
            </button>
            <button @click="customizeSuggestion(suggestion)">
              カスタマイズ
            </button>
            <button @click="dismissSuggestion(suggestion)">
              却下
            </button>
          </div>
        </div>
      </div>
      
      <div class="ai-controls">
        <button @click="generateMoreSuggestions">
          他の提案を生成
        </button>
        <button @click="showAIPanel = false">
          AI支援を無効化
        </button>
      </div>
    </div>
  </div>
</template>
```

## 実装フェーズ

### Phase 1: 基本テンプレート（1週間）
```typescript
const basicTemplates = [
  {
    id: 'facility-guide',
    name: '館内施設案内',
    description: '施設情報を効果的に紹介',
    blocks: [
      { type: 'hero', props: { title: '館内施設のご案内' } },
      { type: 'facility-grid', props: { autoFill: true } },
      { type: 'contact-info', props: {} }
    ],
    aiPrompts: {
      title: '魅力的な施設案内タイトルを提案',
      description: '各施設の特徴を簡潔に説明'
    }
  },
  {
    id: 'campaign-page',
    name: 'キャンペーン告知',
    description: '期間限定オファーを魅力的に紹介',
    blocks: [
      { type: 'campaign-hero', props: { showCountdown: true } },
      { type: 'offer-details', props: {} },
      { type: 'cta-button', props: { text: '今すぐ予約' } }
    ]
  }
]
```

### Phase 2: AI支援機能（1週間）
```typescript
interface AIAssistant {
  generateText(prompt: string, context: any): Promise<string>
  suggestLayout(purpose: string, content: any[]): Promise<LayoutSuggestion[]>
  optimizeContent(existing: any, metrics: any): Promise<OptimizationSuggestion[]>
  translateContent(content: string, targetLang: string): Promise<string>
}

// 実装例：シンプルなAI支援
const aiAssistant = {
  async generateText(prompt: string, context: any) {
    // 実際のAI APIを呼び出す代わりに、テンプレートベースで生成
    const templates = {
      'facility-title': [
        '心地よい時間をお過ごしください',
        '充実した施設でおもてなし',
        '特別な体験をご提供'
      ],
      'campaign-description': [
        '期間限定の特別オファー',
        'お得なキャンペーン実施中',
        '今だけの特別価格'
      ]
    }
    
    return templates[prompt]?.[Math.floor(Math.random() * templates[prompt].length)] || ''
  }
}
```

### Phase 3: 高度な機能（1週間）
```typescript
interface SmartBlock {
  type: string
  props: any
  aiEnhanced: boolean
  autoUpdate: boolean
  conditions: DisplayCondition[]
}

// 例：スマートな館内施設ブロック
const smartFacilityBlock = {
  type: 'smart-facility-grid',
  props: {
    autoFill: true,
    smartFiltering: true,
    seasonalHighlight: true
  },
  aiEnhanced: true,
  autoUpdate: true,
  conditions: [
    {
      type: 'season',
      operator: 'equals',
      value: 'summer',
      action: 'highlight',
      target: 'pool'
    }
  ]
}
```

## 手動操作の保証

### 1. 完全な編集権限
- AIが生成した内容もすべて編集可能
- ブロックの追加・削除・移動が自由
- プロパティの細かい調整が可能

### 2. AI無効化オプション
```typescript
interface UserPreferences {
  disableAI: boolean
  showAISuggestions: boolean
  autoApplySuggestions: boolean
  manualApprovalRequired: boolean
}
```

### 3. 段階的な支援
```typescript
const assistanceLevels = {
  none: {
    suggestions: false,
    autoFill: false,
    generation: false
  },
  dataOnly: {
    suggestions: false,
    autoFill: true,  // 既存データの自動入力のみ
    generation: false
  },
  suggestions: {
    suggestions: true,
    autoFill: true,
    generation: false,
    requireApproval: true
  },
  full: {
    suggestions: true,
    autoFill: true,
    generation: true,
    requireApproval: false
  }
}
```

## 利点

### 効率性
- テンプレートで素早いページ作成
- 既存データの自動活用
- AI支援による作業時間短縮

### 柔軟性
- 完全な手動制御
- 段階的なAI支援
- カスタマイズの自由度

### 学習コスト
- 直感的なテンプレート選択
- 段階的な機能習得
- 既存のノーコードエディタ活用

この設計により、AIを活用したい場合は効率的に、手動で細かく調整したい場合は完全な制御権を持って作業できます。 