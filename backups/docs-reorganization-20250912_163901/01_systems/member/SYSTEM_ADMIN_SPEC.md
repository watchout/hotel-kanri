# システム管理者機能 & ノーコードUI設計 仕様書

## 🔐 **権限レベル設計**

### SuperAdmin（システム全体管理者）
```
役割: SaaS運営側の最高管理者
対象: システム全体の設定・監視
アクセス: 全テナントの情報閲覧・操作可能
```

### Admin（ホテル管理者）  
```
役割: 各ホテルの運営管理者
対象: 自ホテル（テナント）の設定・運営
アクセス: 自テナント内のみ操作可能
```

### Staff（ホテルスタッフ）
```
役割: フロント・接客スタッフ
対象: 会員対応・ポイント付与等
アクセス: 限定的な操作のみ
```

### User（一般会員）
```
役割: ホテル宿泊客・会員
対象: 個人アカウント・ポイント確認
アクセス: 個人情報のみ
```

## ⚙️ **SuperAdmin設定管理機能**

### 🔑 **API・外部サービス設定**
```json
{
  "llm_settings": {
    "provider": "openai|anthropic|azure",
    "api_key": "encrypted_key",
    "model": "gpt-4|claude-3",
    "max_tokens": 1000,
    "temperature": 0.7,
    "enabled_features": ["chatbot", "recommendation", "translation"]
  },
  "smtp_settings": {
    "provider": "gmail|sendgrid|aws_ses",
    "host": "smtp.gmail.com",
    "port": 587,
    "username": "encrypted",
    "password": "encrypted",
    "encryption": "tls|ssl",
    "daily_limit": 10000
  },
  "storage_settings": {
    "provider": "aws_s3|gcp|azure",
    "bucket": "hotel-member-assets",
    "access_key": "encrypted",
    "secret_key": "encrypted",
    "region": "ap-northeast-1"
  }
}
```

### 📊 **システム監視設定**
```json
{
  "monitoring": {
    "error_notification": {
      "email": "admin@hotel-system.com",
      "slack_webhook": "encrypted_url",
      "threshold": "error_count > 100"
    },
    "performance_alert": {
      "response_time_threshold": "500ms",
      "memory_usage_threshold": "80%",
      "disk_usage_threshold": "90%"
    },
    "backup_settings": {
      "frequency": "daily|weekly",
      "retention_days": 30,
      "storage_location": "s3://backups/"
    }
  }
}
```

### 🏢 **テナント管理設定**
```json
{
  "tenant_defaults": {
    "max_users": 10000,
    "max_staff": 50,
    "storage_limit_gb": 10,
    "api_rate_limit": 1000,
    "features": ["points", "rewards", "analytics", "ui_builder"],
    "subscription_plan": "basic|pro|enterprise"
  },
  "billing_settings": {
    "currency": "JPY",
    "payment_provider": "stripe|paypal",
    "billing_cycle": "monthly|yearly",
    "trial_period_days": 14
  }
}
```

## 🎨 **ノーコードUI設計機能**

### 📱 **デザインシステム階層**
```
1. テーマ選択
   ├── Modern（モダン・ミニマル）
   ├── Classic（クラシック・エレガント）  
   ├── Luxury（高級感・ダーク）
   └── Friendly（親しみやすい・カラフル）

2. カラーパレット設定
   ├── Primary Color（メインカラー）
   ├── Secondary Color（サブカラー）
   ├── Accent Color（アクセントカラー）
   └── Text Color（テキストカラー）

3. タイポグラフィ
   ├── Font Family（日本語・英語対応）
   ├── Font Size Scale（見出し・本文・キャプション）
   └── Line Height（行間設定）

4. コンポーネント配置
   ├── ヘッダー（ロゴ・ナビゲーション）
   ├── メインエリア（カード・ボタン配置）
   ├── サイドバー（メニュー・情報表示）
   └── フッター（リンク・コピーライト）
```

### 🖼️ **カスタマイズ可能要素**
```json
{
  "branding": {
    "logo": "upload_image",
    "favicon": "upload_image", 
    "brand_name": "text_input",
    "tagline": "text_input",
    "brand_colors": {
      "primary": "#color_picker",
      "secondary": "#color_picker",
      "accent": "#color_picker"
    }
  },
  "layout": {
    "header_style": "fixed|static|hidden",
    "sidebar_position": "left|right|none",
    "content_width": "full|container|narrow",
    "card_style": "rounded|square|elevated",
    "button_style": "rounded|square|pill"
  },
  "content": {
    "welcome_message": "rich_text_editor",
    "point_display_format": "numeric|progress_bar|both",
    "reward_card_layout": "grid|list|carousel",
    "custom_pages": [
      {
        "path": "/about",
        "title": "ホテルについて", 
        "content": "rich_text_editor"
      }
    ]
  }
}
```

### 🔧 **UI Builder インターフェース**
```
左パネル: コンポーネント一覧
├── レイアウト（ヘッダー・フッター・セクション）
├── 表示要素（テキスト・画像・ボタン）
├── データ要素（ポイント表示・特典一覧・履歴）
└── インタラクション（フォーム・モーダル）

中央エリア: ライブプレビュー
├── デスクトップ表示
├── タブレット表示
└── スマートフォン表示

右パネル: プロパティ設定
├── スタイル設定（色・フォント・サイズ）
├── レイアウト設定（マージン・パディング）
└── 動作設定（リンク・イベント）
```

## 🗄️ **追加データベーステーブル設計**

### 📋 **system_settings**
```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,  -- 'llm', 'smtp', 'storage'
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,           -- 暗号化された値
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category, key)
);
```

### 🎨 **tenant_themes**  
```sql
CREATE TABLE tenant_themes (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    theme_name VARCHAR(50) NOT NULL,
    config JSON NOT NULL,         -- UI設定のJSON
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 📄 **custom_pages**
```sql
CREATE TABLE custom_pages (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    path VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,        -- リッチテキストHTML
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, path)
);
```

## 🔄 **実装フェーズ提案**

### Phase 1: SuperAdmin基盤
1. ✅ 権限システム実装
2. ✅ 設定管理API
3. ✅ 暗号化・セキュリティ

### Phase 2: UI Builder基本版  
1. ✅ テーマ選択機能
2. ✅ カラー・フォント設定
3. ✅ ロゴアップロード

### Phase 3: UI Builder上級版
1. ✅ ドラッグ&ドロップ
2. ✅ カスタムページ作成
3. ✅ リアルタイムプレビュー

### Phase 4: 高度な機能
1. ✅ LLMチャットボット統合
2. ✅ 多言語対応
3. ✅ A/Bテスト機能

## 🎯 **ビジネス要件（確定版）**

### 💰 **収益モデル**
- **基本プラン**: 会員システム機能のみ
- **プロプラン**: UI Builder + AI機能搭載
- **ターゲット**: 中小レジャーホテル
- **サポート**: 設定代行サービス（オプション）

### 🎨 **UI Builder仕様**
- **テンプレート**: 5-8パターン事前準備
  - Modern Hotel (モダン・ミニマル)
  - Classic Resort (クラシック・エレガント)
  - Luxury Spa (高級感・ダーク)
  - Family Lodge (親しみやすい・カラフル)
  - Business Hotel (シンプル・効率的)
- **履歴管理**: 過去設定へのロールバック機能
- **外部連携**: MVP時点では不要

## 🤖 **AIビルド機能（新機能）**

### 🎯 **AI自動UI生成**
```json
{
  "ai_prompts": {
    "hotel_description": "高級温泉リゾート、家族向け、ビジネス利用など",
    "target_audience": "20-30代カップル、ファミリー、ビジネス客",
    "brand_personality": "モダン、クラシック、ラグジュアリー、カジュアル",
    "color_preference": "暖色系、寒色系、ナチュラル、モノトーン"
  },
  "ai_output": {
    "color_palette": "自動生成カラーパレット",
    "typography": "推奨フォント組み合わせ",
    "layout_style": "最適レイアウト提案",
    "component_selection": "適切なUI要素選択"
  }
}
```

### 🔧 **AI機能詳細**
```
💬 自然言語入力
「高級温泉旅館らしい落ち着いたデザインで、60代以上のお客様にも使いやすく」
↓
🎨 自動デザイン生成
├── 和モダンカラーパレット
├── 大きめフォントサイズ
├── シンプルナビゲーション
└── 温泉をイメージした背景色

🔄 反復改善
「もう少し若い世代向けに」→ AIが調整提案
```

### 🛠️ **実装アーキテクチャ**
```json
{
  "ai_service": {
    "provider": "OpenAI GPT-4 / Claude",
    "model": "gpt-4-vision-preview",
    "prompt_engineering": "ホテル業界特化プロンプト",
    "output_format": "CSS variables + Component config"
  },
  "generation_flow": [
    "1. ユーザー入力分析",
    "2. ホテル業界ベストプラクティス適用", 
    "3. ブランドガイドライン生成",
    "4. CSSテーマ自動生成",
    "5. プレビュー表示"
  ]
}
```

## 🗄️ **追加データベーステーブル**

### 🤖 **ai_generations**
```sql
CREATE TABLE ai_generations (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    prompt TEXT NOT NULL,              -- ユーザーの入力
    generated_config JSON NOT NULL,    -- AI生成設定
    applied_config JSON,               -- 実際に適用した設定
    user_feedback INTEGER,             -- 1-5のフィードバック
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 📋 **theme_templates**
```sql
CREATE TABLE theme_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,     -- 'modern', 'classic', 'luxury'
    config JSON NOT NULL,              -- テンプレート設定
    preview_image_url TEXT,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 📚 **theme_history**
```sql
CREATE TABLE theme_history (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id),
    config JSON NOT NULL,              -- 設定スナップショット
    change_type VARCHAR(50),           -- 'manual', 'ai_generated', 'template'
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 **更新された実装フェーズ**

### Phase 1: SuperAdmin基盤 (2-3週間)
1. ✅ 権限システム実装
2. ✅ 設定管理API（暗号化）
3. ✅ テナント管理機能

### Phase 2: UI Builder基本版 (3-4週間)
1. ✅ テンプレート機能（5-8種類）
2. ✅ 手動カスタマイズ機能
3. ✅ 履歴・ロールバック機能

### Phase 3: AIビルド機能 (4-5週間) ⭐
1. ✅ AI プロンプト設計
2. ✅ 自動デザイン生成
3. ✅ 反復改善機能
4. ✅ ユーザーフィードバック収集

### Phase 4: 高度な機能 (2-3週間)
1. ✅ A/Bテスト機能
2. ✅ 使用統計・分析
3. ✅ 設定代行ツール

## 🤔 **AIビルド機能の詳細確認**

### **1. AI入力方式**
- **チャット形式**: 「和風で高級感のある...」
- **質問形式**: 「ホテルの特徴は？」「ターゲット客層は？」
- **画像アップ**: 「この雰囲気に近づけたい」

### **2. 生成レベル**
- **基本**: カラーパレット + フォント推奨
- **中級**: レイアウト構成 + コンポーネント選択  
- **上級**: カスタムCSS + アニメーション効果

### **3. 学習・改善**
- ユーザーフィードバックで精度向上
- ホテル業界トレンド反映
- A/Bテスト結果の自動学習

どの入力方式・生成レベルを最優先で実装したいですか？🤖 