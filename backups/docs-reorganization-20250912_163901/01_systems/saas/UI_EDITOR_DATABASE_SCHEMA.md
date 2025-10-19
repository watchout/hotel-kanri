# 📊 UIエディタシステム データベーススキーマ設計書（キャンペーン機能統合版）

**作成日**: 2025年1月16日  
**更新日**: 2025年1月16日  
**バージョン**: 2.0 - キャンペーン機能統合版

---

## 🎯 概要

### **対象機能**
1. **固定ページ（4種）**: 館内施設・観光案内・画面操作ガイド・アンケート
2. **自由ページ（インフォメーション）**: ブロック編集システム
3. **キャンペーン機能**: TOPページ表示・自動スライド・初回画面対応
4. **AIコンテンツ生成**: 自由ページの自動生成機能
5. **プラン制限**: Economy/Professional別機能制限

### **設計原則**
- 既存のOrderシステムとの完全分離
- マルチテナント対応準備
- 段階的実装対応
- 多言語対応基盤

---

## 🗄️ データベーススキーマ

### **1. 固定ページマスタ**

#### **fixed_pages (固定ページ定義)**
```sql
CREATE TABLE fixed_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_type TEXT NOT NULL UNIQUE, -- 'facilities', 'tourism', 'guide', 'survey'
  display_name_ja TEXT NOT NULL,
  display_name_en TEXT NOT NULL,
  description TEXT,
  icon_name TEXT, -- heroicons名
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 初期データ
INSERT INTO fixed_pages (page_type, display_name_ja, display_name_en, icon_name) VALUES
('facilities', '館内施設', 'Facilities', 'heroicons:building-storefront'),
('tourism', '観光案内', 'Tourism Guide', 'heroicons:map'),
('guide', '画面操作ガイド', 'Usage Guide', 'heroicons:question-mark-circle'),
('survey', 'アンケート', 'Survey', 'heroicons:document-text');
```

#### **fixed_page_settings (固定ページ設定)**
```sql
CREATE TABLE fixed_page_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT, -- 将来のマルチテナント対応
  page_type TEXT NOT NULL,
  
  -- デザイン設定
  background_color TEXT DEFAULT '#ffffff',
  background_image TEXT,
  header_color TEXT DEFAULT '#1f2937',
  header_text_color TEXT DEFAULT '#ffffff',
  footer_color TEXT DEFAULT '#f3f4f6',
  
  -- 表示設定
  is_active BOOLEAN DEFAULT true,
  custom_css TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, page_type),
  FOREIGN KEY (page_type) REFERENCES fixed_pages(page_type)
);
```

### **2. 館内施設ページ**

#### **facilities (施設マスタ)**
```sql
CREATE TABLE facilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  name_ja TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL, -- 'restaurant', 'spa', 'fitness', 'conference', 'shop', 'other'
  description_ja TEXT,
  description_en TEXT,
  
  -- 画像・メディア
  main_image TEXT,
  gallery_images JSON, -- 配列形式
  
  -- 営業情報
  operating_hours JSON, -- 曜日別営業時間
  phone_number TEXT,
  extension_number TEXT,
  location_description_ja TEXT,
  location_description_en TEXT,
  floor_number INTEGER,
  
  -- 料金情報
  has_pricing BOOLEAN DEFAULT false,
  pricing_info JSON, -- 料金体系
  
  -- 予約情報
  accepts_reservations BOOLEAN DEFAULT false,
  reservation_phone TEXT,
  reservation_email TEXT,
  reservation_url TEXT,
  
  -- 混雑予想
  has_congestion_prediction BOOLEAN DEFAULT false,
  congestion_data JSON, -- 時間帯別混雑度
  
  -- 表示制御
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_facilities_tenant (tenant_id),
  INDEX idx_facilities_category (category),
  INDEX idx_facilities_active (is_active)
);
```

#### **facility_congestion_schedule (混雑予想スケジュール)**
```sql
CREATE TABLE facility_congestion_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_id INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=日曜, 6=土曜
  hour INTEGER NOT NULL, -- 0-23時
  congestion_level INTEGER NOT NULL, -- 1=空いている, 5=非常に混雑
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(facility_id, day_of_week, hour),
  FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
  INDEX idx_congestion_facility (facility_id),
  INDEX idx_congestion_time (day_of_week, hour)
);
```

### **3. 観光案内ページ**

#### **tourism_spots (観光スポット)**
```sql
CREATE TABLE tourism_spots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  name_ja TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL, -- 'temple', 'nature', 'shopping', 'restaurant', 'entertainment', 'historical', 'other'
  description_ja TEXT,
  description_en TEXT,
  
  -- 位置情報
  address_ja TEXT,
  address_en TEXT,
  latitude REAL,
  longitude REAL,
  
  -- アクセス情報
  access_description_ja TEXT,
  access_description_en TEXT,
  distance_from_hotel REAL, -- km
  estimated_travel_time INTEGER, -- 分
  transportation_options JSON, -- 交通手段情報
  
  -- 画像・メディア
  main_image TEXT,
  gallery_images JSON,
  
  -- 詳細情報
  website_url TEXT,
  phone_number TEXT,
  opening_hours JSON,
  admission_fee_info JSON,
  
  -- QRコード（モバイル用詳細ページ）
  qr_code_url TEXT,
  mobile_detail_url TEXT,
  
  -- AI生成フラグ
  is_ai_generated BOOLEAN DEFAULT false,
  ai_generation_prompt TEXT,
  ai_generation_date DATETIME,
  
  -- 表示制御
  is_active BOOLEAN DEFAULT true,
  featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tourism_tenant (tenant_id),
  INDEX idx_tourism_category (category),
  INDEX idx_tourism_featured (featured),
  INDEX idx_tourism_active (is_active)
);
```

### **4. 画面操作ガイドページ**

#### **guide_pages (ガイドページ)**
```sql
CREATE TABLE guide_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  title_ja TEXT NOT NULL,
  title_en TEXT,
  content_type TEXT NOT NULL, -- 'text', 'video', 'step_by_step'
  
  -- コンテンツ
  content_ja TEXT, -- HTMLまたはテキスト
  content_en TEXT,
  
  -- 動画コンテンツ
  video_url TEXT,
  video_thumbnail TEXT,
  video_duration INTEGER, -- 秒
  
  -- ステップバイステップガイド
  steps_data JSON, -- ステップ形式の場合
  
  -- 表示制御
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_guide_tenant (tenant_id),
  INDEX idx_guide_active (is_active)
);
```

### **5. アンケートシステム**

#### **survey_forms (アンケートフォーム)**
```sql
CREATE TABLE survey_forms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  title_ja TEXT NOT NULL,
  title_en TEXT,
  description_ja TEXT,
  description_en TEXT,
  
  -- フォーム設定
  form_structure JSON NOT NULL, -- 質問項目の構造
  
  -- 表示期間
  start_date DATETIME,
  end_date DATETIME,
  
  -- 特典設定
  has_reward BOOLEAN DEFAULT false,
  reward_type TEXT, -- 'discount', 'point', 'gift'
  reward_config JSON, -- 特典の詳細設定
  
  -- 表示制御
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_survey_tenant (tenant_id),
  INDEX idx_survey_period (start_date, end_date),
  INDEX idx_survey_active (is_active)
);
```

#### **survey_responses (アンケート回答)**
```sql
CREATE TABLE survey_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id INTEGER NOT NULL,
  room_id TEXT, -- 回答した客室
  device_id INTEGER,
  
  -- 回答データ
  response_data JSON NOT NULL,
  
  -- 特典付与状況
  reward_granted BOOLEAN DEFAULT false,
  reward_order_id INTEGER, -- 特典として生成された注文ID
  
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (form_id) REFERENCES survey_forms(id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES DeviceRoom(id),
  INDEX idx_response_form (form_id),
  INDEX idx_response_submitted (submitted_at)
);
```

### **6. 自由ページ（インフォメーション）**

#### **info_pages (インフォメーションページ)**
```sql
CREATE TABLE info_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  slug TEXT NOT NULL UNIQUE,
  title_ja TEXT NOT NULL,
  title_en TEXT,
  
  -- ブロック構造
  blocks_data JSON NOT NULL, -- ブロック編集システムのデータ
  
  -- AI生成情報
  is_ai_generated BOOLEAN DEFAULT false,
  ai_generation_prompt TEXT,
  ai_generated_at DATETIME,
  ai_last_updated DATETIME,
  
  -- プラン制限（Economy: 最大3ページ）
  plan_level TEXT DEFAULT 'economy', -- 'economy', 'professional'
  
  -- SEO・メタデータ
  meta_description_ja TEXT,
  meta_description_en TEXT,
  featured_image TEXT,
  
  -- 表示制御
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  published_at DATETIME,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_info_tenant (tenant_id),
  INDEX idx_info_status (status),
  INDEX idx_info_featured (is_featured),
  INDEX idx_info_ai_generated (is_ai_generated)
);
```

### **7. キャンペーン機能**

#### **campaigns (キャンペーンマスタ)**
```sql
CREATE TABLE campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  title_ja TEXT NOT NULL,
  title_en TEXT,
  description_ja TEXT,
  description_en TEXT,
  
  -- ビジュアル素材
  main_image TEXT NOT NULL, -- 16:9必須
  mobile_image TEXT, -- モバイル用画像
  video_url TEXT, -- 動画素材（プロフェッショナルプラン以上）
  
  -- CTA設定
  cta_text_ja TEXT NOT NULL,
  cta_text_en TEXT,
  cta_type TEXT NOT NULL, -- 'room_service', 'facility', 'tourism', 'survey', 'menu_category', 'menu_item', 'external_url'
  cta_target_id INTEGER, -- 遷移先ID（カテゴリ、商品、施設等）
  cta_target_url TEXT, -- 外部URL
  
  -- 表示期間・時間制限
  display_start DATETIME NOT NULL,
  display_end DATETIME NOT NULL,
  time_restrictions JSON, -- 表示時間帯制限
  
  -- 表示制御
  is_active BOOLEAN DEFAULT true,
  display_priority INTEGER DEFAULT 1, -- 表示優先度
  
  -- プラン制限対応
  plan_level TEXT DEFAULT 'economy', -- Economy: 静止画のみ, Professional: 動画対応
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_campaigns_tenant (tenant_id),
  INDEX idx_campaigns_period (display_start, display_end),
  INDEX idx_campaigns_active (is_active),
  INDEX idx_campaigns_priority (display_priority)
);
```

#### **campaign_translations (キャンペーン多言語)**
```sql
CREATE TABLE campaign_translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  language_code TEXT NOT NULL, -- 'ja', 'en', 'ko', 'zh-cn', etc.
  title TEXT NOT NULL,
  description TEXT,
  cta_text TEXT NOT NULL,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(campaign_id, language_code),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  INDEX idx_campaign_translations (campaign_id, language_code)
);
```

#### **campaign_display_slots (キャンペーン表示スロット)**
```sql
CREATE TABLE campaign_display_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  slot_name TEXT NOT NULL, -- 'top_page_hero', 'auto_slideshow', 'welcome_screen'
  
  -- 表示設定
  max_campaigns INTEGER DEFAULT 3, -- Economy: 3件, Professional: 無制限
  auto_rotation BOOLEAN DEFAULT true,
  rotation_interval INTEGER DEFAULT 5, -- 秒
  
  -- アクティブキャンペーン
  active_campaign_ids JSON, -- 表示中のキャンペーンID配列
  
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(tenant_id, slot_name),
  INDEX idx_slots_tenant (tenant_id)
);
```

#### **campaign_analytics (キャンペーン分析)**
```sql
CREATE TABLE campaign_analytics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  date DATE NOT NULL,
  
  -- 表示・クリック統計
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0.0, -- Click Through Rate
  
  -- デバイス別統計
  tv_impressions INTEGER DEFAULT 0,
  tablet_impressions INTEGER DEFAULT 0,
  mobile_impressions INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(campaign_id, date),
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  INDEX idx_analytics_campaign (campaign_id),
  INDEX idx_analytics_date (date)
);
```

### **8. 初回チェックイン画面**

#### **welcome_screen_settings (ようこそ画面設定)**
```sql
CREATE TABLE welcome_screen_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT UNIQUE,
  
  -- 動画設定
  welcome_video_url TEXT,
  video_thumbnail TEXT,
  video_duration INTEGER, -- 秒
  auto_play BOOLEAN DEFAULT true,
  show_skip_button BOOLEAN DEFAULT true,
  
  -- キャンペーンダイジェスト設定
  show_campaign_digest BOOLEAN DEFAULT true,
  max_campaigns_display INTEGER DEFAULT 3,
  
  -- サービスガイド設定
  show_service_guide BOOLEAN DEFAULT true,
  service_guide_items JSON, -- 表示するサービス一覧
  
  -- 表示制御
  is_enabled BOOLEAN DEFAULT true,
  session_based_display BOOLEAN DEFAULT true, -- セッション単位表示
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_welcome_tenant (tenant_id)
);
```

#### **device_session_logs (デバイスセッション管理)**
```sql
CREATE TABLE device_session_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL,
  room_id TEXT NOT NULL,
  session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  session_end DATETIME,
  
  -- 初回画面表示履歴
  welcome_screen_shown BOOLEAN DEFAULT false,
  welcome_screen_shown_at DATETIME,
  welcome_screen_completed BOOLEAN DEFAULT false,
  
  FOREIGN KEY (device_id) REFERENCES DeviceRoom(id),
  INDEX idx_session_device (device_id),
  INDEX idx_session_room (room_id),
  INDEX idx_session_welcome (welcome_screen_shown)
);
```

### **9. プラン制限管理**

#### **plan_feature_restrictions (プラン機能制限)**
```sql
CREATE TABLE plan_feature_restrictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_type TEXT NOT NULL, -- 'economy', 'professional'
  plan_category TEXT NOT NULL, -- 'omotenasuai', 'leisure'
  
  -- UIエディタ機能制限
  max_info_pages INTEGER DEFAULT 3,
  enable_ai_generation BOOLEAN DEFAULT false,
  enable_layout_editor BOOLEAN DEFAULT false,
  
  -- キャンペーン機能制限
  max_campaign_display INTEGER DEFAULT 3,
  enable_campaign_video BOOLEAN DEFAULT false,
  enable_campaign_analytics BOOLEAN DEFAULT false,
  
  -- 固定ページ制限
  enable_facility_congestion BOOLEAN DEFAULT false,
  enable_tourism_ai_generation BOOLEAN DEFAULT false,
  enable_survey_rewards BOOLEAN DEFAULT false,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(plan_type, plan_category),
  INDEX idx_restrictions_plan (plan_type, plan_category)
);

-- 初期データ
INSERT INTO plan_feature_restrictions 
(plan_type, plan_category, max_info_pages, enable_ai_generation, max_campaign_display, enable_campaign_video) 
VALUES 
('economy', 'omotenasuai', 3, false, 3, false),
('economy', 'leisure', 3, false, 3, false),
('professional', 'omotenasuai', -1, true, -1, true),
('professional', 'leisure', -1, true, -1, true);
```

---

## 🔧 インデックス最適化

### **パフォーマンス重要インデックス**
```sql
-- キャンペーン表示最適化
CREATE INDEX idx_campaign_display_optimization 
ON campaigns (tenant_id, is_active, display_start, display_end, display_priority);

-- 施設検索最適化
CREATE INDEX idx_facility_search_optimization 
ON facilities (tenant_id, is_active, category, featured);

-- 観光スポット地理検索最適化
CREATE INDEX idx_tourism_location_optimization 
ON tourism_spots (tenant_id, is_active, latitude, longitude);

-- アンケート分析最適化
CREATE INDEX idx_survey_analytics_optimization 
ON survey_responses (form_id, submitted_at);

-- インフォメーション管理最適化
CREATE INDEX idx_info_management_optimization 
ON info_pages (tenant_id, status, is_featured, is_ai_generated);
```

---

## 📋 マイグレーション戦略

### **Phase 1: 基盤テーブル作成**
1. 固定ページマスタ・設定テーブル
2. プラン制限管理テーブル
3. キャンペーン基本テーブル

### **Phase 2: 各機能テーブル追加**
1. 館内施設・観光案内テーブル
2. ガイドページ・アンケートテーブル
3. インフォメーションページテーブル

### **Phase 3: 高度機能テーブル**
1. 初回画面・セッション管理
2. キャンペーン分析・多言語テーブル
3. AI生成関連テーブル

---

## ⚠️ 実装時の注意点

### **既存システムとの分離**
- OrderシステムのテーブルとUIエディタテーブルは完全分離
- 共通参照は外部キー制約を使わず、アプリケーションレベルで管理
- 新機能によるパフォーマンス影響を最小限に抑制

### **マルチテナント準備**
- 全テーブルに`tenant_id`カラム配置
- 将来のRow Level Security実装準備
- テナント別データ分離設計

### **プラン制限の実装**
- 機能制限はアプリケーションレベルで実装
- データベースレベルでの制限は避ける
- 制限超過時の適切なエラーハンドリング 