# SSOT: 多文化おもてなしAIシステム（Multicultural Hospitality AI）

**作成日**: 2025-10-07  
**バージョン**: 1.2.0  
**ステータス**: ✅ 確定  
**優先度**: 🟢 中優先（Phase 4-5）  
**最終更新**: 2025-10-10

**関連SSOT**:
- [SSOT_MULTILINGUAL_SYSTEM.md](./SSOT_MULTILINGUAL_SYSTEM.md) - 多言語化システム（基盤）
- [SSOT_SAAS_MULTITENANT.md](./SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤
- [SSOT_ADMIN_AI_CONCIERGE.md](../01_admin_features/SSOT_ADMIN_AI_CONCIERGE.md) - AIコンシェルジュ管理

---

## 📋 目次

1. [概要](#概要)
2. [スコープ](#スコープ)
3. [技術スタック](#技術スタック)
4. [アーキテクチャ設計](#アーキテクチャ設計)
5. [データベース設計](#データベース設計)
6. [多文化AIエンジン（hotel-common）](#多文化aiエンジンhotel-common)
7. [管理画面設定UI](#管理画面設定ui)
8. [7つの機能](#7つの機能)
9. [プラン別機能制限](#プラン別機能制限)
10. [API仕様](#api仕様)
11. [システム固有層](#システム固有層)
12. [文化データベース](#文化データベース)
13. [AI統合](#ai統合)
14. [パフォーマンス最適化](#パフォーマンス最適化)
15. [セキュリティ・プライバシー](#セキュリティプライバシー)
16. [コスト管理](#コスト管理)
17. [実装タイミング](#実装タイミング)
18. [既存実装状況](#既存実装状況)
19. [マイグレーション計画](#マイグレーション計画)
20. [他機能実装時の必須ルール](#他機能実装時の必須ルール)

---

## 📖 概要

### 目的
単なる翻訳を超えた、**文化に寄り添うおもてなし**を実現する。ゲストの文化的背景（国籍、宗教、習慣、価値観）を理解し、AIを活用して自動的に適切な配慮を提供する。

### 基本方針
- **文化的配慮の自動化**: 宗教的配慮、食文化への配慮、文化的タブーの回避
- **コンテキスト理解**: コミュニケーションスタイルの最適化、文化的ニュアンスの理解
- **イベント対応**: 各国の祝日・イベント・記念日の自動認識
- **管理者制御**: ホテルごとに機能のON/OFF設定が可能
- **プライバシー尊重**: オプトイン方式、ゲストの選択を最優先

### 設計原則
1. **集中方式**: hotel-commonに多文化AIエンジンを構築、全システムから共通利用
2. **段階的導入**: 管理者が機能ごとに有効/無効を設定可能
3. **プラン別制限**: PROFESSIONAL以上で利用可能、ENTERPRISEで全機能解放
4. **ステレオタイプ回避**: 個別カスタマイズ機能、ゲストの選択を尊重
5. **透明性**: ゲストに対して文化的配慮の理由を明示

---

## 🎯 スコープ

### 対象システム
- ✅ **hotel-common**: 多文化AIエンジン（Core）、文化データベース、共通API
- ✅ **hotel-saas**: 管理画面設定UI、AIコンシェルジュ統合、メニュー配慮
- ✅ **hotel-pms**: 予約配慮、客室配慮、イベント通知
- ✅ **hotel-member**: 会員特典配慮、通知配慮

### 対象機能（7つの柱）

#### 1. 文化的配慮AI（Cultural Consideration AI）
- 宗教的配慮（ハラール、コーシャ、ベジタリアン等）
- 食文化への配慮（アレルギー、嗜好、調理方法）
- 文化的タブーの回避（数字、色、ジェスチャー等）

#### 2. 文化的コンテキストAI（Cultural Context AI）
- コミュニケーションスタイルの最適化
- 文化的ニュアンスの理解
- 敬語レベルの自動調整

#### 3. 文化的イベント対応AI（Cultural Event AI）
- 各国の祝日・イベント・記念日の自動認識
- 個人的記念日の認識（誕生日、結婚記念日）
- 適切なおもてなしの自動提案

#### 4. 食文化インテリジェンスAI（Culinary Cultural AI）
- 食材の文化的意味の理解
- 調理方法の文化的好み
- 文化的に適切なメニュー提案

#### 5. 視覚的文化適応AI（Visual Cultural Adaptation AI）
- 色彩の文化的最適化
- レイアウトの文化的最適化
- UIテーマの動的生成

#### 6. 文化的言語ニュアンスAI（Cultural Linguistic AI）
- 敬語レベルの自動調整
- 文化的慣用表現の変換
- 文化的コンテキストに応じた表現

#### 7. 文化的ジェスチャー認識AI（Cultural Gesture AI）
- ジェスチャーの文化的解釈
- スタッフ向けガイド生成
- 誤解を招くジェスチャーの警告

---

## 🛠️ 技術スタック

### フロントエンド
- **Vue 3 + Nuxt 3**: フレームワーク
- **TypeScript**: 型安全性
- **Tailwind CSS**: スタイリング

### バックエンド
- **hotel-common**: Express + TypeScript（多文化AIエンジン）
- **hotel-saas**: Nuxt 3 Server（プロキシ + 管理UI）
- **hotel-pms**: Express + TypeScript
- **hotel-member**: FastAPI + Python

### データベース・キャッシュ
- **PostgreSQL**: 文化プロファイル、設定、イベントデータ
- **Prisma**: ORM
- **Redis**: 文化プロファイルキャッシュ

### AI
- **OpenAI GPT-4o / GPT-4o mini**: 文化的コンテキスト理解、応答生成
- **レート制限**: Bottleneck（同時5リクエスト、200ms間隔）

---

## 🏗️ アーキテクチャ設計

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                    hotel-common                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │   多文化AIエンジン (CulturalIntelligenceEngine)        │ │
│  │                                                          │ │
│  │  ┌────────────────────────────────────────────────┐   │ │
│  │  │ 文化プロファイル管理                            │   │ │
│  │  │ - 国別文化データ取得                            │   │ │
│  │  │ - ゲスト個別カスタマイズ                        │   │ │
│  │  │ - 学習データ蓄積                                │   │ │
│  │  └────────────────────────────────────────────────┘   │ │
│  │                                                          │ │
│  │  ┌────────────────────────────────────────────────┐   │ │
│  │  │ 文化的配慮AI                                    │   │ │
│  │  │ - 宗教的配慮（ハラール、祈祷時間等）            │   │ │
│  │  │ - 食文化配慮（ベジタリアン、アレルギー等）      │   │ │
│  │  │ - 文化的タブー回避（数字、色、ジェスチャー）    │   │ │
│  │  └────────────────────────────────────────────────┘   │ │
│  │                                                          │ │
│  │  ┌────────────────────────────────────────────────┐   │ │
│  │  │ 文化的コンテキストAI                            │   │ │
│  │  │ - コミュニケーションスタイル最適化              │   │ │
│  │  │ - 文化的ニュアンス理解                          │   │ │
│  │  │ - AIプロンプト動的生成                          │   │ │
│  │  └────────────────────────────────────────────────┘   │ │
│  │                                                          │ │
│  │  ┌────────────────────────────────────────────────┐   │ │
│  │  │ 文化的イベント検出                              │   │ │
│  │  │ - 祝日・イベント自動認識                        │   │ │
│  │  │ - 個人記念日認識                                │   │ │
│  │  │ - おもてなし提案生成                            │   │ │
│  │  └────────────────────────────────────────────────┘   │ │
│  │                                                          │ │
│  │  ┌────────────────────────────────────────────────┐   │ │
│  │  │ 食文化インテリジェンス                          │   │ │
│  │  │ - 食材の文化的意味理解                          │   │ │
│  │  │ - 調理方法の文化的好み                          │   │ │
│  │  │ - メニュー提案最適化                            │   │ │
│  │  └────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         文化データベース                                 │ │
│  │  - 国別文化プロファイル（200+国）                       │ │
│  │  - 宗教別配慮事項                                       │ │
│  │  - 文化的イベントカレンダー                             │ │
│  │  - 食文化データベース                                   │ │
│  │  - ジェスチャー解釈データ                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         共通API                                          │ │
│  │  GET  /api/v1/cultural/profile/:guestId                 │ │
│  │  GET  /api/v1/cultural/events/:guestId                  │ │
│  │  GET  /api/v1/cultural/considerations/:guestId          │ │
│  │  POST /api/v1/cultural/ai/chat                          │ │
│  │  GET  /api/v1/cultural/menu-suggestions/:guestId        │ │
│  │  GET  /api/v1/cultural/settings/:tenantId               │ │
│  │  PUT  /api/v1/cultural/settings/:tenantId               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  hotel-saas   │     │  hotel-pms    │     │ hotel-member  │
│               │     │               │     │               │
│ ┌───────────┐ │     │ ┌───────────┐ │     │ ┌───────────┐ │
│ │ SaaS固有  │ │     │ │ PMS固有   │ │     │ │Member固有 │ │
│ │ 多文化層  │ │     │ │ 多文化層  │ │     │ │ 多文化層  │ │
│ │           │ │     │ │           │ │     │ │           │ │
│ │- 設定UI   │ │     │ │- 予約配慮 │ │     │ │- 会員配慮 │ │
│ │- AI応答   │ │     │ │- 客室配慮 │ │     │ │- 特典配慮 │ │
│ │- メニュー │ │     │ │- イベント │ │     │ │- 通知配慮 │ │
│ │- 施設配慮 │ │     │ │- 通知     │ │     │ │- メール   │ │
│ └───────────┘ │     │ └───────────┘ │     │ └───────────┘ │
└───────────────┘     └───────────────┘     └───────────────┘
```

---

## 🗄️ データベース設計

### 1. テナント別多文化AI設定テーブル

```sql
-- ========================================
-- テナント別多文化AI設定
-- ========================================

CREATE TABLE tenant_cultural_ai_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  
  -- 基本設定
  enabled BOOLEAN DEFAULT false,
  plan_level TEXT NOT NULL,  -- BASIC, PROFESSIONAL, ENTERPRISE, ULTIMATE
  
  -- 機能別有効化
  cultural_consideration_enabled BOOLEAN DEFAULT true,
  cultural_context_enabled BOOLEAN DEFAULT true,
  cultural_event_enabled BOOLEAN DEFAULT true,
  culinary_intelligence_enabled BOOLEAN DEFAULT true,
  visual_adaptation_enabled BOOLEAN DEFAULT false,  -- ENTERPRISE以上
  linguistic_nuance_enabled BOOLEAN DEFAULT true,
  gesture_recognition_enabled BOOLEAN DEFAULT false, -- ENTERPRISE以上
  
  -- AI設定
  ai_model TEXT DEFAULT 'gpt-4o-mini',  -- gpt-4o-mini, gpt-4o
  ai_temperature REAL DEFAULT 0.7,
  ai_max_tokens INTEGER DEFAULT 1000,
  
  -- 文化データベース設定
  supported_cultures TEXT[],  -- 空=全て対応
  custom_cultural_rules JSONB,
  
  -- 通知設定
  notify_staff_on_cultural_event BOOLEAN DEFAULT true,
  notify_guest_on_cultural_event BOOLEAN DEFAULT true,
  
  -- 学習設定
  enable_preference_learning BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_cultural_settings_tenant ON tenant_cultural_ai_settings(tenant_id);
CREATE INDEX idx_cultural_settings_enabled ON tenant_cultural_ai_settings(enabled);
```

### 2. 文化プロファイルテーブル

```sql
-- ========================================
-- 国別文化プロファイル（マスターデータ）
-- ========================================

CREATE TABLE cultural_profiles (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,  -- ISO 3166-1 alpha-2
  country_name TEXT NOT NULL,
  region TEXT,  -- Asia, Europe, Americas, Africa, Oceania, Middle_East
  
  -- 宗教的配慮
  primary_religions TEXT[],
  dietary_restrictions JSONB,  -- halal, kosher, vegetarian, vegan, etc.
  prayer_requirements JSONB,
  religious_holidays JSONB,
  
  -- コミュニケーションスタイル
  formality_level TEXT,  -- very_high, high, medium, low, very_low
  directness_level TEXT,  -- very_direct, direct, moderate, indirect, very_indirect
  preferred_tone TEXT,  -- formal, polite, friendly, casual
  use_honorifics BOOLEAN DEFAULT false,
  
  -- 文化的タブー
  unlucky_numbers INTEGER[],
  lucky_numbers INTEGER[],
  unlucky_colors TEXT[],
  lucky_colors TEXT[],
  taboo_topics TEXT[],
  taboo_gestures JSONB,
  taboo_gifts TEXT[],
  
  -- 食文化
  food_preferences JSONB,
  cooking_preferences JSONB,
  meal_customs JSONB,
  
  -- 視覚的好み
  color_preferences JSONB,
  layout_preferences JSONB,
  information_density TEXT,  -- high, medium, low
  
  -- メタデータ
  data_quality_score REAL DEFAULT 0.5,
  last_reviewed_at TIMESTAMP,
  reviewed_by TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cultural_profiles_country ON cultural_profiles(country_code);
CREATE INDEX idx_cultural_profiles_region ON cultural_profiles(region);
```

### 3. 文化的イベントテーブル

```sql
-- ========================================
-- 文化的イベント（祝日、記念日等）
-- ========================================

CREATE TABLE cultural_events (
  id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_name_local TEXT,  -- 現地語での名称
  event_type TEXT NOT NULL,  -- national_holiday, religious_holiday, festival, memorial_day
  
  -- 日付設定
  date_type TEXT NOT NULL,  -- fixed, lunar, relative, movable
  date_value TEXT,  -- 固定日付: "01-01", 旧暦: "lunar:1-1", 相対: "relative:easter+50"
  duration_days INTEGER DEFAULT 1,
  
  -- 重要度
  importance_level TEXT,  -- very_high, high, medium, low
  is_public_holiday BOOLEAN DEFAULT false,
  
  -- 文化的習慣
  customs JSONB,
  traditional_foods TEXT[],
  traditional_colors TEXT[],
  traditional_activities TEXT[],
  greetings TEXT[],
  
  -- ホテル対応
  hotel_actions JSONB,
  decoration_suggestions TEXT[],
  menu_suggestions TEXT[],
  gift_suggestions TEXT[],
  
  -- メタデータ
  description TEXT,
  cultural_significance TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cultural_events_country ON cultural_events(country_code);
CREATE INDEX idx_cultural_events_type ON cultural_events(event_type);
CREATE INDEX idx_cultural_events_importance ON cultural_events(importance_level);
```

### 4. ゲスト文化プロファイルテーブル

```sql
-- ========================================
-- ゲスト個別の文化プロファイル
-- ========================================

CREATE TABLE guest_cultural_profiles (
  id TEXT PRIMARY KEY,
  guest_id TEXT NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL,
  cultural_profile_id TEXT NOT NULL,
  
  -- 基本情報
  nationality TEXT NOT NULL,
  primary_language TEXT,
  secondary_languages TEXT[],
  
  -- 個別カスタマイズ
  dietary_restrictions JSONB,
  religious_requirements JSONB,
  communication_preferences JSONB,
  special_requests JSONB,
  
  -- オプトイン/アウト
  opt_in_cultural_ai BOOLEAN DEFAULT true,
  opt_in_event_notifications BOOLEAN DEFAULT true,
  opt_in_preference_learning BOOLEAN DEFAULT true,
  
  -- 学習データ
  interaction_history JSONB,
  preference_learning JSONB,
  feedback_scores JSONB,
  
  -- 個人的記念日
  personal_events JSONB,  -- birthday, anniversary, etc.
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (cultural_profile_id) REFERENCES cultural_profiles(id)
);

CREATE INDEX idx_guest_cultural_tenant ON guest_cultural_profiles(tenant_id);
CREATE INDEX idx_guest_cultural_guest ON guest_cultural_profiles(guest_id);
CREATE INDEX idx_guest_cultural_nationality ON guest_cultural_profiles(nationality);
```

### 5. 文化的配慮ログテーブル

```sql
-- ========================================
-- 文化的配慮の実行ログ
-- ========================================

CREATE TABLE cultural_consideration_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  guest_id TEXT NOT NULL,
  
  -- 配慮内容
  consideration_type TEXT NOT NULL,  -- dietary, religious, event, communication, etc.
  consideration_detail JSONB NOT NULL,
  
  -- AI判断
  ai_confidence_score REAL,
  ai_reasoning TEXT,
  
  -- 実行結果
  executed BOOLEAN DEFAULT false,
  execution_result TEXT,
  
  -- フィードバック
  guest_feedback_score INTEGER,  -- 1-5
  guest_feedback_comment TEXT,
  staff_feedback_score INTEGER,
  staff_feedback_comment TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_consideration_logs_tenant ON cultural_consideration_logs(tenant_id);
CREATE INDEX idx_consideration_logs_guest ON cultural_consideration_logs(guest_id);
CREATE INDEX idx_consideration_logs_type ON cultural_consideration_logs(consideration_type);
CREATE INDEX idx_consideration_logs_date ON cultural_consideration_logs(created_at);
```

### 6. 食文化データベーステーブル

```sql
-- ========================================
-- 食材の文化的意味データベース
-- ========================================

CREATE TABLE food_cultural_meanings (
  id TEXT PRIMARY KEY,
  food_item TEXT NOT NULL,
  country_code TEXT NOT NULL,
  
  -- 文化的意味
  cultural_meaning TEXT,
  symbolism TEXT,
  occasions TEXT[],
  
  -- 調理方法
  preferred_cooking_methods TEXT[],
  presentation_style TEXT,
  
  -- 禁忌
  taboos TEXT[],
  restrictions TEXT[],
  
  -- メタデータ
  description TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(food_item, country_code)
);

CREATE INDEX idx_food_meanings_item ON food_cultural_meanings(food_item);
CREATE INDEX idx_food_meanings_country ON food_cultural_meanings(country_code);
```

### Prismaスキーマ

```prisma
// ========================================
// hotel-common/prisma/schema.prisma
// ========================================

model TenantCulturalAiSetting {
  id                              String    @id @default(cuid())
  tenantId                        String    @unique @map("tenant_id")
  enabled                         Boolean   @default(false)
  planLevel                       String    @map("plan_level")
  
  // 機能別有効化
  culturalConsiderationEnabled    Boolean   @default(true) @map("cultural_consideration_enabled")
  culturalContextEnabled          Boolean   @default(true) @map("cultural_context_enabled")
  culturalEventEnabled            Boolean   @default(true) @map("cultural_event_enabled")
  culinaryIntelligenceEnabled     Boolean   @default(true) @map("culinary_intelligence_enabled")
  visualAdaptationEnabled         Boolean   @default(false) @map("visual_adaptation_enabled")
  linguisticNuanceEnabled         Boolean   @default(true) @map("linguistic_nuance_enabled")
  gestureRecognitionEnabled       Boolean   @default(false) @map("gesture_recognition_enabled")
  
  // AI設定
  aiModel                         String    @default("gpt-4o-mini") @map("ai_model")
  aiTemperature                   Float     @default(0.7) @map("ai_temperature")
  aiMaxTokens                     Int       @default(1000) @map("ai_max_tokens")
  
  // 文化データベース設定
  supportedCultures               String[]  @map("supported_cultures")
  customCulturalRules             Json?     @map("custom_cultural_rules")
  
  // 通知設定
  notifyStaffOnCulturalEvent      Boolean   @default(true) @map("notify_staff_on_cultural_event")
  notifyGuestOnCulturalEvent      Boolean   @default(true) @map("notify_guest_on_cultural_event")
  
  // 学習設定
  enablePreferenceLearning        Boolean   @default(true) @map("enable_preference_learning")
  
  createdAt                       DateTime  @default(now()) @map("created_at")
  updatedAt                       DateTime  @updatedAt @map("updated_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([enabled])
  @@map("tenant_cultural_ai_settings")
}

model CulturalProfile {
  id                  String    @id @default(cuid())
  countryCode         String    @unique @map("country_code")
  countryName         String    @map("country_name")
  region              String?
  
  // 宗教的配慮
  primaryReligions    String[]  @map("primary_religions")
  dietaryRestrictions Json?     @map("dietary_restrictions")
  prayerRequirements  Json?     @map("prayer_requirements")
  religiousHolidays   Json?     @map("religious_holidays")
  
  // コミュニケーションスタイル
  formalityLevel      String?   @map("formality_level")
  directnessLevel     String?   @map("directness_level")
  preferredTone       String?   @map("preferred_tone")
  useHonorifics       Boolean   @default(false) @map("use_honorifics")
  
  // 文化的タブー
  unluckyNumbers      Int[]     @map("unlucky_numbers")
  luckyNumbers        Int[]     @map("lucky_numbers")
  unluckyColors       String[]  @map("unlucky_colors")
  luckyColors         String[]  @map("lucky_colors")
  tabooTopics         String[]  @map("taboo_topics")
  tabooGestures       Json?     @map("taboo_gestures")
  tabooGifts          String[]  @map("taboo_gifts")
  
  // 食文化
  foodPreferences     Json?     @map("food_preferences")
  cookingPreferences  Json?     @map("cooking_preferences")
  mealCustoms         Json?     @map("meal_customs")
  
  // 視覚的好み
  colorPreferences    Json?     @map("color_preferences")
  layoutPreferences   Json?     @map("layout_preferences")
  informationDensity  String?   @map("information_density")
  
  // メタデータ
  dataQualityScore    Float     @default(0.5) @map("data_quality_score")
  lastReviewedAt      DateTime? @map("last_reviewed_at")
  reviewedBy          String?   @map("reviewed_by")
  
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  
  guestProfiles GuestCulturalProfile[]
  
  @@index([countryCode])
  @@index([region])
  @@map("cultural_profiles")
}

model CulturalEvent {
  id                    String    @id @default(cuid())
  countryCode           String    @map("country_code")
  eventName             String    @map("event_name")
  eventNameLocal        String?   @map("event_name_local")
  eventType             String    @map("event_type")
  
  // 日付設定
  dateType              String    @map("date_type")
  dateValue             String?   @map("date_value")
  durationDays          Int       @default(1) @map("duration_days")
  
  // 重要度
  importanceLevel       String?   @map("importance_level")
  isPublicHoliday       Boolean   @default(false) @map("is_public_holiday")
  
  // 文化的習慣
  customs               Json?
  traditionalFoods      String[]  @map("traditional_foods")
  traditionalColors     String[]  @map("traditional_colors")
  traditionalActivities String[]  @map("traditional_activities")
  greetings             String[]
  
  // ホテル対応
  hotelActions          Json?     @map("hotel_actions")
  decorationSuggestions String[]  @map("decoration_suggestions")
  menuSuggestions       String[]  @map("menu_suggestions")
  giftSuggestions       String[]  @map("gift_suggestions")
  
  // メタデータ
  description           String?
  culturalSignificance  String?   @map("cultural_significance")
  
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")
  
  @@index([countryCode])
  @@index([eventType])
  @@index([importanceLevel])
  @@map("cultural_events")
}

model GuestCulturalProfile {
  id                      String    @id @default(cuid())
  guestId                 String    @unique @map("guest_id")
  tenantId                String    @map("tenant_id")
  culturalProfileId       String    @map("cultural_profile_id")
  
  // 基本情報
  nationality             String
  primaryLanguage         String?   @map("primary_language")
  secondaryLanguages      String[]  @map("secondary_languages")
  
  // 個別カスタマイズ
  dietaryRestrictions     Json?     @map("dietary_restrictions")
  religiousRequirements   Json?     @map("religious_requirements")
  communicationPreferences Json?    @map("communication_preferences")
  specialRequests         Json?     @map("special_requests")
  
  // オプトイン/アウト
  optInCulturalAi         Boolean   @default(true) @map("opt_in_cultural_ai")
  optInEventNotifications Boolean   @default(true) @map("opt_in_event_notifications")
  optInPreferenceLearning Boolean   @default(true) @map("opt_in_preference_learning")
  
  // 学習データ
  interactionHistory      Json?     @map("interaction_history")
  preferenceLearning      Json?     @map("preference_learning")
  feedbackScores          Json?     @map("feedback_scores")
  
  // 個人的記念日
  personalEvents          Json?     @map("personal_events")
  
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")
  
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  culturalProfile CulturalProfile @relation(fields: [culturalProfileId], references: [id])
  
  @@index([tenantId])
  @@index([guestId])
  @@index([nationality])
  @@map("guest_cultural_profiles")
}

model CulturalConsiderationLog {
  id                    String    @id @default(cuid())
  tenantId              String    @map("tenant_id")
  guestId               String    @map("guest_id")
  
  // 配慮内容
  considerationType     String    @map("consideration_type")
  considerationDetail   Json      @map("consideration_detail")
  
  // AI判断
  aiConfidenceScore     Float?    @map("ai_confidence_score")
  aiReasoning           String?   @map("ai_reasoning")
  
  // 実行結果
  executed              Boolean   @default(false)
  executionResult       String?   @map("execution_result")
  
  // フィードバック
  guestFeedbackScore    Int?      @map("guest_feedback_score")
  guestFeedbackComment  String?   @map("guest_feedback_comment")
  staffFeedbackScore    Int?      @map("staff_feedback_score")
  staffFeedbackComment  String?   @map("staff_feedback_comment")
  
  createdAt             DateTime  @default(now()) @map("created_at")
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([guestId])
  @@index([considerationType])
  @@index([createdAt])
  @@map("cultural_consideration_logs")
}

model FoodCulturalMeaning {
  id                      String    @id @default(cuid())
  foodItem                String    @map("food_item")
  countryCode             String    @map("country_code")
  
  // 文化的意味
  culturalMeaning         String?   @map("cultural_meaning")
  symbolism               String?
  occasions               String[]
  
  // 調理方法
  preferredCookingMethods String[]  @map("preferred_cooking_methods")
  presentationStyle       String?   @map("presentation_style")
  
  // 禁忌
  taboos                  String[]
  restrictions            String[]
  
  // メタデータ
  description             String?
  
  createdAt               DateTime  @default(now()) @map("created_at")
  updatedAt               DateTime  @updatedAt @map("updated_at")
  
  @@unique([foodItem, countryCode])
  @@index([foodItem])
  @@index([countryCode])
  @@map("food_cultural_meanings")
}
```

---

## ⚙️ 多文化AIエンジン（hotel-common）

### CulturalIntelligenceEngine クラス

**ファイル**: `hotel-common/src/services/cultural-ai/CulturalIntelligenceEngine.ts`

```typescript
export interface CulturalIntelligenceConfig {
  aiModel: string
  aiTemperature: number
  aiMaxTokens: number
  enablePreferenceLearning: boolean
}

export class CulturalIntelligenceEngine {
  private prisma: PrismaClient
  private openai: OpenAI
  private redis: Redis
  private config: CulturalIntelligenceConfig
  
  constructor(config: CulturalIntelligenceConfig)
  
  // ========================================
  // 文化プロファイル管理
  // ========================================
  
  /**
   * ゲストの文化プロファイルを取得
   */
  async getCulturalProfile(guestId: string): Promise<CulturalProfile>
  
  /**
   * 文化プロファイルを作成（チェックイン時）
   */
  async createGuestCulturalProfile(
    guestId: string,
    tenantId: string,
    nationality: string,
    customizations?: any
  ): Promise<GuestCulturalProfile>
  
  // ========================================
  // 文化的配慮AI
  // ========================================
  
  /**
   * 宗教的配慮を取得
   */
  async getReligiousConsiderations(
    guestId: string
  ): Promise<ReligiousConsideration[]>
  
  /**
   * 食文化配慮を取得
   */
  async getDietaryConsiderations(
    guestId: string
  ): Promise<DietaryConsideration[]>
  
  /**
   * 文化的タブーを取得
   */
  async getCulturalTaboos(
    guestId: string
  ): Promise<CulturalTaboo[]>
  
  // ========================================
  // 文化的コンテキストAI
  // ========================================
  
  /**
   * 文化的に適切なAIシステムプロンプトを生成
   */
  async buildCulturalSystemPrompt(
    guestId: string,
    context: string
  ): Promise<string>
  
  /**
   * 文化的に適切なAI応答を生成
   */
  async generateCulturalResponse(
    message: string,
    guestId: string
  ): Promise<string>
  
  // ========================================
  // 文化的イベント検出
  // ========================================
  
  /**
   * 現在の文化的イベントを検出
   */
  async detectCulturalEvents(
    guestId: string,
    date?: Date
  ): Promise<CulturalEvent[]>
  
  /**
   * イベントに応じたおもてなしを提案
   */
  async suggestEventHospitality(
    guestId: string,
    event: CulturalEvent
  ): Promise<HospitalitySuggestion>
  
  // ========================================
  // 食文化インテリジェンス
  // ========================================
  
  /**
   * 文化的に適切なメニューを提案
   */
  async suggestCulturalMenu(
    guestId: string,
    availableItems: MenuItem[]
  ): Promise<MenuItem[]>
  
  /**
   * 食材の文化的意味を取得
   */
  async getFoodCulturalMeaning(
    foodItem: string,
    countryCode: string
  ): Promise<FoodCulturalMeaning | null>
  
  // ========================================
  // 学習・フィードバック
  // ========================================
  
  /**
   * ゲストのフィードバックを記録
   */
  async recordFeedback(
    logId: string,
    feedbackScore: number,
    feedbackComment?: string
  ): Promise<void>
  
  /**
   * 学習データを更新
   */
  async updatePreferenceLearning(
    guestId: string,
    interaction: any
  ): Promise<void>
}
```

---

## 🎛️ 管理画面設定UI

### 設定画面の実装

**ファイル**: `hotel-saas/pages/admin/settings/cultural-ai.vue`

実装内容は前述の提案通り（省略）

---

## 🎯 7つの機能

### 1. 文化的配慮AI（Cultural Consideration AI）

#### 宗教的配慮

```typescript
// 例: イスラム教徒のゲスト
const religiousConsiderations = {
  religion: 'Islam',
  dietary: {
    halal: true,
    pork: false,
    alcohol: false
  },
  prayer: {
    times: ['05:30', '13:00', '16:30', '19:00', '20:30'],
    qibla_direction: '西南西（292度）',
    prayer_mat_required: true
  },
  ramadan: {
    is_ramadan: false,  // 期間チェック
    fasting_hours: null
  },
  room_amenities: {
    quran: true,
    prayer_mat: true,
    qibla_arrow: true
  }
}
```

#### 食文化への配慮

```typescript
// 例: ベジタリアン・ヴィーガン対応
const dietaryConsiderations = {
  dietary_type: 'vegetarian',
  restrictions: {
    meat: false,
    fish: false,
    eggs: true,
    dairy: true
  },
  allergies: ['nuts', 'shellfish'],
  preferences: {
    organic: true,
    local_produce: true
  }
}
```

### 2. 文化的コンテキストAI（Cultural Context AI）

#### コミュニケーションスタイルの最適化

```typescript
// AIシステムプロンプトの動的生成
const buildSystemPrompt = (profile: CulturalProfile) => {
  const styles = {
    'Japan': {
      formality: 'very_high',
      tone: 'polite_humble',
      instructions: `
あなたは日本のホテルのAIコンシェルジュです。
日本人のお客様に対応しています。

対応方針:
- 非常に丁寧な敬語を使用してください
- 間接的で婉曲的な表現を心がけてください
- 詳細な説明を提供してください
- お客様の要望を先回りして察知してください
- 「恐れ入りますが」「申し訳ございませんが」などのクッション言葉を使用してください
      `
    },
    'USA': {
      formality: 'casual',
      tone: 'friendly',
      instructions: `
You are an AI concierge at a hotel in Japan.
You are assisting an American guest.

Guidelines:
- Use friendly and casual tone
- Be direct and straightforward
- Provide concise, bullet-point style information
- Focus on practical solutions
- Use simple, clear language
      `
    }
  }
  
  return styles[profile.countryCode] || styles['USA']
}
```

### 3. 文化的イベント対応AI（Cultural Event AI）

#### イベント検出とおもてなし提案

```typescript
// 例: 中国の春節
const eventDetection = {
  event: {
    name: '春節（旧正月）',
    name_local: '春节',
    date: '2025-01-29',
    duration: 7,
    importance: 'very_high'
  },
  hospitality_suggestions: {
    lobby_decoration: {
      items: ['red_lanterns', 'couplets', 'fu_character'],
      colors: ['red', 'gold']
    },
    welcome_gift: {
      item: 'red_envelope_with_chocolate',
      message: '新年快乐！恭喜发财！'
    },
    special_menu: {
      items: ['餃子', '魚料理', '年糕'],
      cultural_meaning: '餃子=富、魚=余裕、年糕=成長'
    },
    room_message: {
      display_on_tv: true,
      message: '新年快乐！祝您在新的一年里万事如意！'
    }
  }
}
```

### 4. 食文化インテリジェンスAI（Culinary Cultural AI）

#### 食材の文化的意味

```typescript
// 例: 魚の文化的意味
const foodMeaning = {
  food_item: 'fish',
  cultures: {
    'China': {
      meaning: 'prosperity',
      reason: '魚(yú)と余(yú)が同音',
      occasions: ['new_year', 'celebrations'],
      presentation: 'whole_fish_head_to_tail',
      taboo: 'dont_flip_fish'  // 船が転覆するイメージ
    },
    'Japan': {
      meaning: 'celebration',
      types: {
        'tai': 'auspicious',  // 鯛 = めでたい
        'buri': 'success'     // ブリ = 出世魚
      },
      occasions: ['celebrations', 'weddings']
    }
  }
}
```

### 5. 視覚的文化適応AI（Visual Cultural Adaptation AI）

#### 色彩の文化的最適化

```typescript
// UIテーマの動的生成
const generateCulturalTheme = (countryCode: string) => {
  const themes = {
    'CN': {  // 中国
      primaryColor: '#DC143C',  // 中国紅
      accentColor: '#FFD700',   // 金色
      backgroundColor: '#FFFFFF',
      luckyColors: ['red', 'gold', 'yellow'],
      unluckyColors: ['white', 'black']
    },
    'IN': {  // インド
      primaryColor: '#FF9933',  // サフラン
      accentColor: '#138808',   // 緑
      backgroundColor: '#FFFFFF',
      sacredColors: ['saffron', 'white', 'green']
    },
    'JP': {  // 日本
      primaryColor: '#E60012',  // 日の丸の赤
      accentColor: '#000080',   // 藍色
      backgroundColor: '#FFFFFF',
      traditionalColors: ['indigo', 'vermillion', 'white']
    }
  }
  
  return themes[countryCode] || themes['JP']
}
```

### 6. 文化的言語ニュアンスAI（Cultural Linguistic AI）

#### 文化的慣用表現の変換

```typescript
// 例: 「お疲れ様でした」の文化的変換
const culturalPhrases = {
  'Japan': {
    phrase: 'お疲れ様でした',
    context: 'end_of_day_greeting',
    cultural_equivalent: {
      'USA': 'Have a great evening!',
      'UK': 'Well done today!',
      'Germany': 'Feierabend!',
      'France': 'Bonne soirée!',
      'China': '辛苦了',
      'Korea': '수고하셨습니다'
    }
  }
}
```

### 7. 文化的ジェスチャー認識AI（Cultural Gesture AI）

#### ジェスチャーの文化的解釈

```typescript
// ジェスチャーデータベース
const gestureInterpretations = {
  'thumbs_up': {
    'USA': 'positive_approval',
    'Japan': 'positive_but_less_common',
    'Middle_East': 'offensive',
    'Greece': 'offensive'
  },
  'ok_sign': {  // 👌
    'USA': 'okay_good',
    'Japan': 'money',
    'Brazil': 'offensive',
    'France': 'zero_worthless'
  }
}
```

---

## 📊 プラン別機能制限

### 機能マトリクス

| 機能 | BASIC | PROFESSIONAL | ENTERPRISE | ULTIMATE |
|------|-------|--------------|------------|----------|
| **多文化おもてなしAI** | ❌ | ✅ | ✅ | ✅ |
| 文化的配慮AI | - | ✅ | ✅ | ✅ |
| 文化的コンテキストAI | - | ✅ | ✅ | ✅ |
| 文化的イベント対応AI | - | ✅ | ✅ | ✅ |
| 食文化インテリジェンスAI | - | ✅ | ✅ | ✅ |
| 文化的言語ニュアンスAI | - | ✅ | ✅ | ✅ |
| 視覚的文化適応AI | - | ❌ | ✅ | ✅ |
| 文化的ジェスチャー認識AI | - | ❌ | ✅ | ✅ |
| AIモデル | - | GPT-4o mini | GPT-4o mini/4o | GPT-4o |
| 対応文化数 | - | 全て | 全て | 全て |
| カスタム文化ルール | - | ❌ | ✅ | ✅ |
| 学習機能 | - | 基本 | 高度 | 最高度 |
| 月間AIクレジット | - | 10,000 | 50,000 | 無制限 |

### プラン判定ロジック

```typescript
// server/middleware/cultural-ai-access.ts
export const checkCulturalAiAccess = async (
  tenantId: string,
  feature: string
): Promise<boolean> => {
  const settings = await prisma.tenantCulturalAiSetting.findUnique({
    where: { tenantId }
  })
  
  if (!settings || !settings.enabled) {
    return false
  }
  
  const planLevel = settings.planLevel
  
  // プラン別機能制限
  const featureAccess = {
    'BASIC': [],
    'PROFESSIONAL': [
      'cultural_consideration',
      'cultural_context',
      'cultural_event',
      'culinary_intelligence',
      'linguistic_nuance'
    ],
    'ENTERPRISE': [
      'cultural_consideration',
      'cultural_context',
      'cultural_event',
      'culinary_intelligence',
      'linguistic_nuance',
      'visual_adaptation',
      'gesture_recognition'
    ],
    'ULTIMATE': [
      'cultural_consideration',
      'cultural_context',
      'cultural_event',
      'culinary_intelligence',
      'linguistic_nuance',
      'visual_adaptation',
      'gesture_recognition'
    ]
  }
  
  return featureAccess[planLevel]?.includes(feature) || false
}
```

---

## 🔌 API仕様

### 共通API（hotel-common）

**ベースURL**: `http://localhost:3400/api/v1/cultural`

#### 1. ゲストの文化プロファイルを取得

```
GET /api/v1/cultural/profile/:guestId
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "guestId": "guest_123",
    "nationality": "CN",
    "culturalProfile": {
      "countryName": "China",
      "primaryReligions": ["Buddhism", "Taoism", "None"],
      "communicationStyle": {
        "formality": "high",
        "directness": "indirect",
        "tone": "polite"
      },
      "culturalTaboos": {
        "unluckyNumbers": [4],
        "luckyNumbers": [8, 6, 9],
        "unluckyColors": ["white", "black"]
      }
    },
    "personalCustomizations": {
      "dietaryRestrictions": ["no_pork"],
      "preferences": ["spicy_food"]
    }
  }
}
```

#### 2. 文化的イベントを取得

```
GET /api/v1/cultural/events/:guestId?date=2025-01-29
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "eventName": "春節（旧正月）",
        "eventNameLocal": "春节",
        "date": "2025-01-29",
        "duration": 7,
        "importance": "very_high",
        "hospitalitySuggestions": {
          "lobbyDecoration": ["red_lanterns", "couplets"],
          "welcomeGift": "red_envelope_with_chocolate",
          "specialMenu": ["餃子", "魚料理", "年糕"],
          "greetings": ["新年快乐", "恭喜发财"]
        }
      }
    ]
  }
}
```

#### 3. 文化的配慮を取得

```
GET /api/v1/cultural/considerations/:guestId
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "religious": [
      {
        "type": "prayer_times",
        "details": {
          "times": ["05:30", "13:00", "16:30", "19:00", "20:30"],
          "qibla_direction": "西南西（292度）"
        }
      }
    ],
    "dietary": [
      {
        "type": "halal",
        "restrictions": ["pork", "alcohol"],
        "certifications_required": true
      }
    ],
    "cultural": [
      {
        "type": "room_number",
        "avoid": [4, 14, 24],
        "reason": "Number 4 sounds like 'death' in Chinese"
      }
    ]
  }
}
```

#### 4. 文化的AIチャット

```
POST /api/v1/cultural/ai/chat
```

**リクエストボディ**:
```json
{
  "guestId": "guest_123",
  "message": "おすすめの観光地を教えてください",
  "context": "concierge"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "response": "かしこまりました。お客様の文化的背景を考慮し、以下の観光地をおすすめいたします...",
    "culturalContext": {
      "appliedStyle": "polite_humble",
      "considerations": ["detailed_explanations", "indirect_suggestions"]
    }
  }
}
```

#### 5. メニュー提案を取得

```
GET /api/v1/cultural/menu-suggestions/:guestId
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "recommended": [
      {
        "itemId": "item_123",
        "name": "餃子",
        "culturalReason": "春節の伝統料理。富を象徴します。",
        "confidence": 0.9
      }
    ],
    "filtered": [
      {
        "itemId": "item_456",
        "name": "豚の角煮",
        "reason": "dietary_restriction_halal"
      }
    ]
  }
}
```

#### 6. 設定を取得

```
GET /api/v1/cultural/settings/:tenantId
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "planLevel": "PROFESSIONAL",
    "features": {
      "culturalConsideration": true,
      "culturalContext": true,
      "culturalEvent": true,
      "culinaryIntelligence": true,
      "visualAdaptation": false,
      "gestureRecognition": false
    },
    "aiSettings": {
      "model": "gpt-4o-mini",
      "temperature": 0.7
    }
  }
}
```

#### 7. 設定を更新

```
PUT /api/v1/cultural/settings/:tenantId
```

**リクエストボディ**:
```json
{
  "enabled": true,
  "culturalConsiderationEnabled": true,
  "culturalContextEnabled": true,
  "aiModel": "gpt-4o-mini",
  "aiTemperature": 0.7
}
```

---

## 🔧 システム固有層

### hotel-saas: Composable

**ファイル**: `hotel-saas/composables/useCulturalAI.ts`

```typescript
export const useCulturalAI = () => {
  /**
   * ゲストの文化プロファイルを取得
   */
  const getCulturalProfile = async (guestId: string) => {
    const response = await $fetch(
      `http://localhost:3400/api/v1/cultural/profile/${guestId}`
    )
    
    return response.success ? response.data : null
  }
  
  /**
   * 文化的に適切なAI応答を取得
   */
  const getCulturalAIResponse = async (
    guestId: string,
    message: string,
    context: string = 'concierge'
  ) => {
    const response = await $fetch(
      'http://localhost:3400/api/v1/cultural/ai/chat',
      {
        method: 'POST',
        body: { guestId, message, context }
      }
    )
    
    return response.success ? response.data.response : null
  }
  
  /**
   * 文化的イベントを取得
   */
  const getCulturalEvents = async (guestId: string, date?: Date) => {
    const params = date ? { date: date.toISOString().split('T')[0] } : {}
    
    const response = await $fetch(
      `http://localhost:3400/api/v1/cultural/events/${guestId}`,
      { params }
    )
    
    return response.success ? response.data.events : []
  }
  
  return {
    getCulturalProfile,
    getCulturalAIResponse,
    getCulturalEvents
  }
}
```

### hotel-pms: Service

**ファイル**: `hotel-pms/src/services/cultural-ai/PMSCulturalService.ts`

```typescript
export class PMSCulturalService {
  private commonApiUrl: string
  
  constructor() {
    this.commonApiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
  }
  
  /**
   * 予約時の文化的配慮を取得
   */
  async getReservationConsiderations(guestId: string) {
    const response = await axios.get(
      `${this.commonApiUrl}/api/v1/cultural/considerations/${guestId}`
    )
    
    return response.data.data
  }
  
  /**
   * 客室番号の文化的適切性をチェック
   */
  async checkRoomNumberCulturally(
    guestId: string,
    roomNumber: number
  ): Promise<boolean> {
    const profile = await this.getCulturalProfile(guestId)
    
    // 不吉な数字をチェック
    if (profile.culturalTaboos?.unluckyNumbers.includes(roomNumber)) {
      return false
    }
    
    return true
  }
}
```

### hotel-member: Service

**ファイル**: `hotel-member/app/services/cultural_ai/member_cultural_service.py`

```python
class MemberCulturalService:
    def __init__(self):
        self.common_api_url = os.getenv('HOTEL_COMMON_API_URL', 'http://localhost:3400')
    
    async def get_cultural_profile(self, guest_id: str) -> dict:
        """ゲストの文化プロファイルを取得"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.common_api_url}/api/v1/cultural/profile/{guest_id}"
            )
            data = response.json()
            return data.get('data', {})
    
    async def get_culturally_appropriate_benefits(
        self,
        guest_id: str,
        available_benefits: list
    ) -> list:
        """文化的に適切な会員特典を提案"""
        profile = await self.get_cultural_profile(guest_id)
        
        # 文化的タブーを考慮してフィルタリング
        filtered_benefits = []
        for benefit in available_benefits:
            if self._is_culturally_appropriate(benefit, profile):
                filtered_benefits.append(benefit)
        
        return filtered_benefits
```

---

## 📚 文化データベース

### 初期データの構築

**ファイル**: `hotel-common/prisma/seeds/cultural-profiles.ts`

```typescript
// 主要国の文化プロファイル初期データ
const culturalProfileSeeds = [
  {
    countryCode: 'CN',
    countryName: 'China',
    region: 'Asia',
    primaryReligions: ['Buddhism', 'Taoism', 'None'],
    dietaryRestrictions: {
      common: ['no_pork_for_muslims'],
      preferences: ['rice', 'noodles', 'tea']
    },
    formalityLevel: 'high',
    directnessLevel: 'indirect',
    preferredTone: 'polite',
    unluckyNumbers: [4],
    luckyNumbers: [8, 6, 9],
    unluckyColors: ['white', 'black'],
    luckyColors: ['red', 'gold', 'yellow']
  },
  {
    countryCode: 'SA',
    countryName: 'Saudi Arabia',
    region: 'Middle_East',
    primaryReligions: ['Islam'],
    dietaryRestrictions: {
      halal: true,
      no_pork: true,
      no_alcohol: true
    },
    prayerRequirements: {
      times_per_day: 5,
      qibla_direction_needed: true
    },
    formalityLevel: 'very_high',
    directnessLevel: 'moderate',
    preferredTone: 'formal'
  },
  // ... 他200+国のデータ
]
```

### 文化的イベントの初期データ

```typescript
const culturalEventSeeds = [
  {
    countryCode: 'CN',
    eventName: '春節（旧正月）',
    eventNameLocal: '春节',
    eventType: 'national_holiday',
    dateType: 'lunar',
    dateValue: 'lunar:1-1',
    durationDays: 7,
    importanceLevel: 'very_high',
    isPublicHoliday: true,
    traditionalFoods: ['餃子', '魚', '年糕', '春巻き'],
    traditionalColors: ['red', 'gold'],
    greetings: ['新年快乐', '恭喜发财'],
    hotelActions: {
      lobby_decoration: 'chinese_new_year_theme',
      welcome_gift: 'red_envelope_with_chocolate',
      special_menu: 'chinese_new_year_course'
    }
  },
  // ... 他数百のイベント
]
```

---

## 🤖 AI統合

### OpenAI統合

```typescript
// server/services/cultural-ai/openai-integration.ts
import OpenAI from 'openai'
import Bottleneck from 'bottleneck'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// レート制限（OpenAI: 500 requests/minute）
const limiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 200
})

export const generateCulturalResponse = async (
  systemPrompt: string,
  userMessage: string,
  temperature: number = 0.7,
  model: string = 'gpt-4o-mini'
): Promise<string> => {
  const response = await limiter.schedule(() =>
    openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature,
      max_tokens: 1000
    })
  )
  
  return response.choices[0]?.message?.content || ''
}
```

---

## ⚡ パフォーマンス最適化

### キャッシュ戦略

```typescript
// 文化プロファイルのキャッシュ
const getCachedCulturalProfile = async (guestId: string) => {
  const cacheKey = `cultural:profile:${guestId}`
  
  // 1. Redisキャッシュチェック（TTL: 24時間）
  const cached = await redis.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }
  
  // 2. データベースから取得
  const profile = await prisma.guestCulturalProfile.findUnique({
    where: { guestId },
    include: { culturalProfile: true }
  })
  
  // 3. キャッシュに保存
  await redis.setex(cacheKey, 86400, JSON.stringify(profile))
  
  return profile
}
```

---

## 🔒 セキュリティ・プライバシー

### プライバシー保護

```typescript
// オプトイン/アウト機能
const updatePrivacySettings = async (
  guestId: string,
  settings: {
    optInCulturalAi?: boolean
    optInEventNotifications?: boolean
    optInPreferenceLearning?: boolean
  }
) => {
  await prisma.guestCulturalProfile.update({
    where: { guestId },
    data: settings
  })
}

// データ削除（GDPR対応）
const deleteCulturalData = async (guestId: string) => {
  await prisma.guestCulturalProfile.delete({
    where: { guestId }
  })
  
  await prisma.culturalConsiderationLog.deleteMany({
    where: { guestId }
  })
}
```

---

## 💰 コスト管理

### AI APIコスト

**GPT-4o mini**: $0.150 per 1M input tokens, $0.600 per 1M output tokens  
**GPT-4o**: $5.00 per 1M input tokens, $15.00 per 1M output tokens

**計算例**:
```
1リクエスト:
- Input: 500 tokens (システムプロンプト + ユーザーメッセージ)
- Output: 300 tokens

GPT-4o mini:
- Input: 500 × $0.150 / 1M = $0.000075
- Output: 300 × $0.600 / 1M = $0.000180
- 合計: $0.000255 (約¥0.04)

月間1,000リクエスト: ¥40/ホテル
```

---

## ⏱️ 実装タイミング

### 段階的実装計画

```
Phase 0: 基盤整備（2週間）
├─ hotel-commonに多文化AIエンジン構築
├─ データベーステーブル作成
├─ 文化データベース初期データ投入
└─ 共通API実装

Phase 1: 管理画面設定UI（1週間）
├─ hotel-saasに設定画面実装
├─ プラン別機能制限実装
└─ テナント設定管理

Phase 2: 文化的配慮AI（2週間）
├─ 宗教的配慮実装
├─ 食文化配慮実装
└─ 文化的タブー回避実装

Phase 3: 文化的コンテキストAI（2週間）
├─ コミュニケーションスタイル最適化
├─ AIプロンプト動的生成
└─ AIコンシェルジュ統合

Phase 4: 文化的イベント対応AI（2週間）
├─ イベント検出実装
├─ おもてなし提案生成
└─ 通知機能実装

Phase 5: 食文化インテリジェンスAI（2週間）
├─ 食材の文化的意味データベース
├─ メニュー提案最適化
└─ 調理方法配慮

Phase 6: 高度機能（3週間）
├─ 視覚的文化適応AI
├─ 文化的言語ニュアンスAI
└─ 文化的ジェスチャー認識AI
```

**総工数**: 14週間

---

## 📝 詳細実装手順書

### Phase 0: 基盤整備（2週間）

#### Step 0-1: 実装前提条件チェック

```markdown
□ hotel-commonプロジェクトが正常に動作している
□ PostgreSQLが稼働している
□ Redisが稼働している
□ OpenAI APIキーが取得済み
□ Prismaがインストール済み
□ 多言語化SSOT（SSOT_MULTILINGUAL_SYSTEM.md）を読了
□ マルチテナントSSOT（SSOT_SAAS_MULTITENANT.md）を読了
```

#### Step 0-2: データベーステーブル作成

**所要時間**: 2-3時間

**作業ディレクトリ**: `/Users/kaneko/hotel-common`

```bash
# 1. Prismaスキーマに追加
cd /Users/kaneko/hotel-common
vi prisma/schema.prisma

# 2. 以下のモデルを追加（SSOTのPrismaスキーマセクションから）
# - TenantCulturalAiSetting
# - CulturalProfile
# - CulturalEvent
# - GuestCulturalProfile
# - CulturalConsiderationLog
# - FoodCulturalMeaning

# 3. マイグレーション作成
npx prisma migrate dev --name add_multicultural_ai_tables

# 4. マイグレーション確認
npx prisma migrate status

# 5. Prisma Client再生成
npx prisma generate
```

**検証**:
```bash
# テーブルが作成されたか確認
psql -U postgres -d hotel_db -c "\dt" | grep cultural
```

**期待結果**:
```
cultural_profiles
cultural_events
guest_cultural_profiles
cultural_consideration_logs
food_cultural_meanings
tenant_cultural_ai_settings
```

#### Step 0-3: 文化データベース初期データ作成

**所要時間**: 4-6時間

**ファイル**: `/Users/kaneko/hotel-common/prisma/seeds/cultural-profiles.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const culturalProfileSeeds = [
  {
    countryCode: 'JP',
    countryName: 'Japan',
    region: 'Asia',
    primaryReligions: ['Buddhism', 'Shinto', 'None'],
    dietaryRestrictions: {},
    formalityLevel: 'very_high',
    directnessLevel: 'very_indirect',
    preferredTone: 'polite',
    useHonorifics: true,
    unluckyNumbers: [4, 9],
    luckyNumbers: [7, 8],
    unluckyColors: [],
    luckyColors: ['red', 'white'],
    tabooTopics: ['money', 'politics', 'religion'],
    tabooGestures: {},
    tabooGifts: ['knives', 'clocks', 'white_flowers']
  },
  // ... 他200+国のデータ
]

async function seedCulturalProfiles() {
  console.log('🌍 Seeding cultural profiles...')
  
  for (const profile of culturalProfileSeeds) {
    await prisma.culturalProfile.upsert({
      where: { countryCode: profile.countryCode },
      update: profile,
      create: profile
    })
  }
  
  console.log('✅ Cultural profiles seeded!')
}

seedCulturalProfiles()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

**実行**:
```bash
# Seed実行
npx prisma db seed

# または直接実行
npx ts-node prisma/seeds/cultural-profiles.ts
```

**検証**:
```bash
# データが投入されたか確認
psql -U postgres -d hotel_db -c "SELECT COUNT(*) FROM cultural_profiles;"
```

**期待結果**: `200+` 件

#### Step 0-4: CulturalIntelligenceEngineクラス実装

**所要時間**: 1日

**ファイル**: `/Users/kaneko/hotel-common/src/services/cultural-ai/CulturalIntelligenceEngine.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import Redis from 'ioredis'
import Bottleneck from 'bottleneck'

export class CulturalIntelligenceEngine {
  private prisma: PrismaClient
  private openai: OpenAI
  private redis: Redis
  private limiter: Bottleneck
  
  constructor(config: CulturalIntelligenceConfig) {
    this.prisma = new PrismaClient()
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    this.redis = new Redis(process.env.REDIS_URL)
    
    // レート制限（OpenAI: 500 requests/minute）
    this.limiter = new Bottleneck({
      maxConcurrent: 5,
      minTime: 200
    })
  }
  
  // 実装内容はSSOTの「多文化AIエンジン」セクション参照
}
```

**実装手順**:
1. 基本クラス構造作成
2. 文化プロファイル管理メソッド実装
3. 文化的配慮AIメソッド実装
4. 文化的コンテキストAIメソッド実装
5. 文化的イベント検出メソッド実装
6. 食文化インテリジェンスメソッド実装

**テスト**:
```bash
# ユニットテスト実行
npm test src/services/cultural-ai/CulturalIntelligenceEngine.test.ts
```

#### Step 0-5: 共通API実装

**所要時間**: 2日

**ファイル**: `/Users/kaneko/hotel-common/src/routes/cultural-ai.routes.ts`

```typescript
import { Router } from 'express'
import { CulturalIntelligenceEngine } from '../services/cultural-ai/CulturalIntelligenceEngine'

const router = Router()
const culturalEngine = new CulturalIntelligenceEngine(config)

// GET /api/v1/cultural/profile/:guestId
router.get('/profile/:guestId', async (req, res) => {
  // 実装
})

// GET /api/v1/cultural/events/:guestId
router.get('/events/:guestId', async (req, res) => {
  // 実装
})

// ... 他5つのエンドポイント

export default router
```

**実装順序**:
1. `/profile/:guestId` - 文化プロファイル取得
2. `/events/:guestId` - 文化的イベント取得
3. `/considerations/:guestId` - 文化的配慮取得
4. `/ai/chat` - 文化的AIチャット
5. `/menu-suggestions/:guestId` - メニュー提案
6. `/settings/:tenantId` - 設定取得
7. `/settings/:tenantId` (PUT) - 設定更新

**テスト**:
```bash
# APIテスト実行
npm test src/routes/cultural-ai.routes.test.ts

# または手動テスト
curl http://localhost:3400/api/v1/cultural/profile/guest_123
```

---

### Phase 1: 管理画面設定UI（1週間）

#### Step 1-1: 設定画面コンポーネント作成

**所要時間**: 2日

**ファイル**: `/Users/kaneko/hotel-saas/pages/admin/settings/cultural-ai.vue`

```bash
cd /Users/kaneko/hotel-saas

# 1. ページファイル作成
mkdir -p pages/admin/settings
touch pages/admin/settings/cultural-ai.vue

# 2. 実装（SSOTの「管理画面設定UI」セクション参照）
vi pages/admin/settings/cultural-ai.vue
```

**実装内容**:
- 基本設定セクション
- 機能別設定セクション
- AI設定セクション
- 対応文化設定セクション
- 通知設定セクション
- 保存ボタン

**検証**:
```bash
# 開発サーバー起動
npm run dev

# ブラウザで確認
open http://localhost:3100/admin/settings/cultural-ai
```

#### Step 1-2: プラン別機能制限実装

**所要時間**: 1日

**ファイル**: `/Users/kaneko/hotel-saas/server/middleware/cultural-ai-access.ts`

```typescript
export const checkCulturalAiAccess = async (
  tenantId: string,
  feature: string
): Promise<boolean> => {
  // 実装（SSOTの「プラン別機能制限」セクション参照）
}
```

**テスト**:
```typescript
// BASICプランでは全機能アクセス不可
expect(await checkCulturalAiAccess('tenant_basic', 'cultural_consideration')).toBe(false)

// PROFESSIONALプランでは基本機能アクセス可
expect(await checkCulturalAiAccess('tenant_pro', 'cultural_consideration')).toBe(true)

// ENTERPRISEプランでは全機能アクセス可
expect(await checkCulturalAiAccess('tenant_ent', 'visual_adaptation')).toBe(true)
```

#### Step 1-3: テナント設定管理API実装

**所要時間**: 1日

**ファイル**: `/Users/kaneko/hotel-saas/server/api/v1/admin/cultural-ai/settings.put.ts`

```typescript
export default defineEventHandler(async (event) => {
  const tenantId = event.context.session.tenantId
  const body = await readBody(event)
  
  // hotel-commonのAPI呼び出し
  const response = await $fetch(
    `http://localhost:3400/api/v1/cultural/settings/${tenantId}`,
    {
      method: 'PUT',
      body
    }
  )
  
  return response
})
```

**テスト**:
```bash
# APIテスト
curl -X PUT http://localhost:3100/api/v1/admin/cultural-ai/settings \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "culturalConsiderationEnabled": true}'
```

---

### Phase 2: 文化的配慮AI（2週間）

#### Step 2-1: 宗教的配慮実装

**所要時間**: 3日

**実装箇所**:
1. `CulturalIntelligenceEngine.getReligiousConsiderations()`
2. 祈祷時間計算ロジック
3. ハラール・コーシャ判定ロジック
4. 客室アメニティ提案ロジック

**テスト**:
```typescript
const considerations = await culturalEngine.getReligiousConsiderations('guest_muslim')

expect(considerations).toContainEqual({
  religion: 'Islam',
  dietary: { halal: true, pork: false, alcohol: false },
  prayer: { times: expect.any(Array) }
})
```

#### Step 2-2: 食文化配慮実装

**所要時間**: 3日

**実装箇所**:
1. `CulturalIntelligenceEngine.getDietaryConsiderations()`
2. ベジタリアン・ヴィーガン判定
3. アレルギー情報管理
4. 食材フィルタリング

#### Step 2-3: 文化的タブー回避実装

**所要時間**: 3日

**実装箇所**:
1. `CulturalIntelligenceEngine.getCulturalTaboos()`
2. 不吉な数字チェック
3. 不吉な色チェック
4. タブートピック検出

---

### Phase 3: 文化的コンテキストAI（2週間）

#### Step 3-1: コミュニケーションスタイル最適化

**所要時間**: 4日

**実装箇所**:
1. `CulturalIntelligenceEngine.buildCulturalSystemPrompt()`
2. 国別プロンプトテンプレート作成
3. 敬語レベル調整ロジック
4. 直接性レベル調整ロジック

**テスト**:
```typescript
const prompt = await culturalEngine.buildCulturalSystemPrompt('guest_jp', 'concierge')

expect(prompt).toContain('非常に丁寧な敬語')
expect(prompt).toContain('間接的で婉曲的な表現')
```

#### Step 3-2: AIプロンプト動的生成

**所要時間**: 3日

#### Step 3-3: AIコンシェルジュ統合

**所要時間**: 3日

**実装箇所**:
- `/Users/kaneko/hotel-saas/composables/useAIConcierge.ts`に文化的コンテキスト統合

---

### Phase 4: 文化的イベント対応AI（2週間）

#### Step 4-1: イベント検出実装

**所要時間**: 4日

**実装箇所**:
1. `CulturalIntelligenceEngine.detectCulturalEvents()`
2. 旧暦計算ロジック
3. 相対日付計算ロジック（イースター等）
4. 個人記念日検出

#### Step 4-2: おもてなし提案生成

**所要時間**: 4日

**実装箇所**:
1. `CulturalIntelligenceEngine.suggestEventHospitality()`
2. デコレーション提案ロジック
3. メニュー提案ロジック
4. ギフト提案ロジック

#### Step 4-3: 通知機能実装

**所要時間**: 2日

**実装箇所**:
- スタッフ通知
- ゲスト通知
- 通知テンプレート

---

### Phase 5: 食文化インテリジェンスAI（2週間）

#### Step 5-1: 食材の文化的意味データベース

**所要時間**: 5日

**作業内容**:
1. `food_cultural_meanings`テーブルへのデータ投入
2. 主要食材200+件のデータ作成
3. 文化的意味の調査・記録

#### Step 5-2: メニュー提案最適化

**所要時間**: 4日

**実装箇所**:
1. `CulturalIntelligenceEngine.suggestCulturalMenu()`
2. 文化的フィルタリングロジック
3. スコアリングアルゴリズム

#### Step 5-3: 調理方法配慮

**所要時間**: 1日

---

### Phase 6: 高度機能（3週間）

#### Step 6-1: 視覚的文化適応AI

**所要時間**: 1週間

**実装箇所**:
1. UIテーマ動的生成
2. 色彩最適化
3. レイアウト最適化

#### Step 6-2: 文化的言語ニュアンスAI

**所要時間**: 1週間

**実装箇所**:
1. 慣用表現変換
2. 敬語レベル調整
3. 文化的コンテキスト変換

#### Step 6-3: 文化的ジェスチャー認識AI

**所要時間**: 1週間

**実装箇所**:
1. ジェスチャーデータベース
2. 解釈ロジック
3. スタッフガイド生成

---

## 🧪 テスト戦略

### 単体テスト（Unit Tests）

**対象**: 各メソッド・関数

**ツール**: Jest / Vitest

**カバレッジ目標**: 80%以上

**テストファイル配置**:
```
/Users/kaneko/hotel-common/src/services/cultural-ai/
├── CulturalIntelligenceEngine.ts
├── CulturalIntelligenceEngine.test.ts  ← 単体テスト
```

**実行**:
```bash
cd /Users/kaneko/hotel-common
npm test
```

**テストケース例**:
```typescript
describe('CulturalIntelligenceEngine', () => {
  describe('getCulturalProfile', () => {
    it('should return cultural profile for valid guest', async () => {
      const profile = await engine.getCulturalProfile('guest_123')
      expect(profile).toBeDefined()
      expect(profile.countryCode).toBe('JP')
    })
    
    it('should throw error for invalid guest', async () => {
      await expect(
        engine.getCulturalProfile('invalid')
      ).rejects.toThrow('Guest not found')
    })
    
    it('should use Redis cache', async () => {
      const spy = jest.spyOn(redis, 'get')
      await engine.getCulturalProfile('guest_123')
      expect(spy).toHaveBeenCalled()
    })
  })
  
  describe('getReligiousConsiderations', () => {
    it('should return prayer times for Muslim guest', async () => {
      const considerations = await engine.getReligiousConsiderations('guest_muslim')
      expect(considerations.prayer.times).toHaveLength(5)
    })
    
    it('should return halal requirements', async () => {
      const considerations = await engine.getReligiousConsiderations('guest_muslim')
      expect(considerations.dietary.halal).toBe(true)
      expect(considerations.dietary.pork).toBe(false)
    })
  })
  
  describe('detectCulturalEvents', () => {
    it('should detect Chinese New Year', async () => {
      const events = await engine.detectCulturalEvents('guest_cn', new Date('2025-01-29'))
      expect(events).toContainEqual(
        expect.objectContaining({ eventName: '春節（旧正月）' })
      )
    })
    
    it('should return empty array for no events', async () => {
      const events = await engine.detectCulturalEvents('guest_jp', new Date('2025-06-15'))
      expect(events).toEqual([])
    })
  })
})
```

---

### 統合テスト（Integration Tests）

**対象**: API + DB + Redis

**ツール**: Supertest

**テストファイル配置**:
```
/Users/kaneko/hotel-common/tests/integration/
├── cultural-ai.routes.test.ts  ← 統合テスト
```

**実行**:
```bash
cd /Users/kaneko/hotel-common
npm run test:integration
```

**テストケース例**:
```typescript
describe('Cultural AI API Integration', () => {
  beforeAll(async () => {
    // テストDB準備
    await prisma.$executeRaw`TRUNCATE TABLE guest_cultural_profiles CASCADE`
    await seedTestData()
  })
  
  describe('GET /api/v1/cultural/profile/:guestId', () => {
    it('should return 200 and cultural profile', async () => {
      const response = await request(app)
        .get('/api/v1/cultural/profile/guest_123')
        .expect(200)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.nationality).toBe('JP')
    })
    
    it('should return 404 for non-existent guest', async () => {
      await request(app)
        .get('/api/v1/cultural/profile/invalid')
        .expect(404)
    })
  })
  
  describe('POST /api/v1/cultural/ai/chat', () => {
    it('should generate culturally appropriate response', async () => {
      const response = await request(app)
        .post('/api/v1/cultural/ai/chat')
        .send({
          guestId: 'guest_jp',
          message: 'おすすめの観光地を教えてください',
          context: 'concierge'
        })
        .expect(200)
      
      expect(response.body.data.response).toContain('かしこまりました')
    })
  })
  
  describe('PUT /api/v1/cultural/settings/:tenantId', () => {
    it('should update tenant settings', async () => {
      const response = await request(app)
        .put('/api/v1/cultural/settings/tenant_123')
        .send({
          enabled: true,
          culturalConsiderationEnabled: true
        })
        .expect(200)
      
      expect(response.body.success).toBe(true)
    })
  })
})
```

---

### E2Eテスト（End-to-End Tests）

**対象**: フロントエンド + バックエンド + DB

**ツール**: Playwright / Cypress

**テストファイル配置**:
```
/Users/kaneko/hotel-saas/tests/e2e/
├── cultural-ai-settings.spec.ts  ← E2Eテスト
```

**実行**:
```bash
cd /Users/kaneko/hotel-saas
npm run test:e2e
```

**テストケース例**:
```typescript
describe('Cultural AI Settings E2E', () => {
  beforeEach(async () => {
    // ログイン
    await page.goto('http://localhost:3100/admin/login')
    await page.fill('[name="email"]', 'admin@test.com')
    await page.fill('[name="password"]', 'password')
    await page.click('button[type="submit"]')
  })
  
  it('should enable cultural AI feature', async () => {
    // 設定画面へ移動
    await page.goto('http://localhost:3100/admin/settings/cultural-ai')
    
    // 多文化AI機能を有効化
    await page.check('input[type="checkbox"][name="enabled"]')
    
    // 保存ボタンクリック
    await page.click('button:has-text("設定を保存")')
    
    // 成功メッセージ確認
    await expect(page.locator('.toast-success')).toContainText('設定を保存しました')
  })
  
  it('should show plan upgrade notice for BASIC plan', async () => {
    // BASIC planのテナントでログイン
    await loginAsBasicTenant()
    
    await page.goto('http://localhost:3100/admin/settings/cultural-ai')
    
    // アップグレード通知が表示されることを確認
    await expect(page.locator('.plan-upgrade-notice')).toBeVisible()
    await expect(page.locator('.plan-upgrade-notice')).toContainText('PROFESSIONALプラン以上')
  })
  
  it('should enable feature-specific settings', async () => {
    await page.goto('http://localhost:3100/admin/settings/cultural-ai')
    
    // 多文化AI有効化
    await page.check('input[name="enabled"]')
    
    // 文化的配慮AI有効化
    await page.check('input[name="culturalConsiderationEnabled"]')
    
    // 保存
    await page.click('button:has-text("設定を保存")')
    
    // リロードして設定が保持されているか確認
    await page.reload()
    await expect(page.locator('input[name="enabled"]')).toBeChecked()
    await expect(page.locator('input[name="culturalConsiderationEnabled"]')).toBeChecked()
  })
})
```

---

### パフォーマンステスト

**対象**: API応答時間、DB クエリ性能

**ツール**: Apache Bench / k6

**テストスクリプト**:
```bash
# API応答時間テスト
ab -n 1000 -c 10 http://localhost:3400/api/v1/cultural/profile/guest_123

# 期待結果: 平均応答時間 < 50ms
```

**k6スクリプト**:
```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 10,
  duration: '30s',
}

export default function () {
  const res = http.get('http://localhost:3400/api/v1/cultural/profile/guest_123')
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 50ms': (r) => r.timings.duration < 50,
  })
  
  sleep(1)
}
```

---

## 🚀 デプロイ戦略

### 開発環境デプロイ

**前提条件**:
```bash
□ PostgreSQL稼働中
□ Redis稼働中
□ OpenAI APIキー設定済み
□ 環境変数設定済み
```

**手順**:
```bash
# 1. hotel-commonデプロイ
cd /Users/kaneko/hotel-common
npm run build
npm run start

# 2. hotel-saasデプロイ
cd /Users/kaneko/hotel-saas
npm run build
npm run start

# 3. 動作確認
curl http://localhost:3400/api/v1/cultural/profile/guest_123
curl http://localhost:3100/admin/settings/cultural-ai
```

---

### ステージング環境デプロイ

**前提条件**:
```bash
□ ステージングDB準備完了
□ ステージングRedis準備完了
□ OpenAI APIキー（ステージング用）設定済み
□ SSL証明書設定済み
```

**手順**:
```bash
# 1. データベースマイグレーション
cd /Users/kaneko/hotel-common
DATABASE_URL="postgresql://user:pass@staging-db:5432/hotel_db" \
  npx prisma migrate deploy

# 2. Seed実行
DATABASE_URL="postgresql://user:pass@staging-db:5432/hotel_db" \
  npx prisma db seed

# 3. hotel-commonデプロイ
npm run build
pm2 start ecosystem.config.js --env staging

# 4. hotel-saasデプロイ
cd /Users/kaneko/hotel-saas
npm run build
pm2 start ecosystem.config.js --env staging

# 5. 動作確認
curl https://staging-api.hotel.com/api/v1/cultural/profile/guest_123
```

---

### 本番環境デプロイ

**前提条件**:
```bash
□ 本番DB準備完了
□ 本番Redis準備完了
□ OpenAI APIキー（本番用）設定済み
□ SSL証明書設定済み
□ バックアップ取得済み
□ ロールバック手順確認済み
□ 監視設定完了
```

**デプロイ手順**:

#### Step 1: バックアップ

```bash
# データベースバックアップ
pg_dump -U postgres -d hotel_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Redisバックアップ
redis-cli BGSAVE
```

#### Step 2: メンテナンスモード

```bash
# メンテナンスページ表示
touch /var/www/hotel-saas/maintenance.flag
```

#### Step 3: データベースマイグレーション

```bash
cd /Users/kaneko/hotel-common
DATABASE_URL="postgresql://user:pass@prod-db:5432/hotel_db" \
  npx prisma migrate deploy
```

#### Step 4: Seed実行（初回のみ）

```bash
DATABASE_URL="postgresql://user:pass@prod-db:5432/hotel_db" \
  npx prisma db seed
```

#### Step 5: hotel-commonデプロイ

```bash
cd /Users/kaneko/hotel-common
npm run build
pm2 reload hotel-common --update-env
```

#### Step 6: hotel-saasデプロイ

```bash
cd /Users/kaneko/hotel-saas
npm run build
pm2 reload hotel-saas --update-env
```

#### Step 7: 動作確認

```bash
# ヘルスチェック
curl https://api.hotel.com/health
curl https://hotel.com/health

# 文化AI API確認
curl https://api.hotel.com/api/v1/cultural/profile/guest_123
```

#### Step 8: メンテナンスモード解除

```bash
rm /var/www/hotel-saas/maintenance.flag
```

#### Step 9: 監視確認

```bash
# ログ確認
pm2 logs hotel-common --lines 100
pm2 logs hotel-saas --lines 100

# エラー監視
tail -f /var/log/hotel-common/error.log
tail -f /var/log/hotel-saas/error.log
```

---

## 🔙 ロールバック手順

### 緊急ロールバック（5分以内）

**トリガー**:
- 致命的なエラーが発生
- データ損失の危険性
- サービス停止

**手順**:

```bash
# 1. 即座にメンテナンスモード
touch /var/www/hotel-saas/maintenance.flag

# 2. 前バージョンに戻す
pm2 reload hotel-common --update-env
pm2 reload hotel-saas --update-env

# 3. データベースロールバック（必要な場合）
psql -U postgres -d hotel_db < backup_YYYYMMDD_HHMMSS.sql

# 4. 動作確認
curl https://api.hotel.com/health

# 5. メンテナンスモード解除
rm /var/www/hotel-saas/maintenance.flag
```

---

### 段階的ロールバック（30分以内）

**トリガー**:
- 軽微なバグ発見
- パフォーマンス劣化
- 一部機能の不具合

**手順**:

```bash
# 1. 問題の特定
pm2 logs hotel-common --lines 1000 | grep ERROR
pm2 logs hotel-saas --lines 1000 | grep ERROR

# 2. 該当機能の無効化
# hotel-commonで該当APIを無効化
# または hotel-saasで該当ページを無効化

# 3. 修正版デプロイ準備
# 修正 → テスト → 再デプロイ

# 4. 再デプロイ
pm2 reload hotel-common --update-env
pm2 reload hotel-saas --update-env
```

---

### データベースロールバック

**手順**:

```bash
# 1. 現在のデータをバックアップ
pg_dump -U postgres -d hotel_db > rollback_backup_$(date +%Y%m%d_%H%M%S).sql

# 2. マイグレーションを1つ戻す
cd /Users/kaneko/hotel-common
npx prisma migrate resolve --rolled-back add_multicultural_ai_tables

# 3. 前のマイグレーションを適用
npx prisma migrate deploy

# 4. Prisma Client再生成
npx prisma generate

# 5. アプリケーション再起動
pm2 reload hotel-common
pm2 reload hotel-saas
```

---

## 📊 既存実装状況

### ✅ 実装済み

- ❌ 多文化AIエンジン（未実装）
- ❌ 文化データベース（未実装）
- ❌ 管理画面設定UI（未実装）

### データベース

- ❌ `tenant_cultural_ai_settings` テーブル（未作成）
- ❌ `cultural_profiles` テーブル（未作成）
- ❌ `cultural_events` テーブル（未作成）
- ❌ `guest_cultural_profiles` テーブル（未作成）
- ❌ `cultural_consideration_logs` テーブル（未作成）
- ❌ `food_cultural_meanings` テーブル（未作成）

---

## 🔄 マイグレーション計画

### Phase 0: データベーステーブル作成

```bash
# hotel-common でマイグレーション作成
cd /Users/kaneko/hotel-common
npx prisma migrate dev --name add_multicultural_ai_tables
```

### Phase 1: 文化データベース初期データ投入

```bash
# Seed実行
npx prisma db seed
```

---

## 🚨 他機能実装時の必須ルール

### ⚠️ 重要: このセクションは全機能実装時に必ず確認すること

多文化おもてなしAIは**横断的な基盤機能**であり、ゲスト向け機能実装時に以下のルールを遵守する必要があります。

---

### 📋 実装前チェックリスト

新機能を実装する前に、以下を必ず確認してください：

```markdown
□ この機能はゲストが直接使用するか？
  └─ YES → 多文化AI対応を検討
  └─ NO  → このセクションはスキップ可能

□ ゲストの文化的背景によって対応を変える必要があるか？
  └─ YES → 多文化AI統合必須
  └─ NO  → 多言語化のみで対応

□ テナントの多文化AI設定を確認したか？
  └─ YES → 設定に応じて機能を有効化
  └─ NO  → 設定確認必須
```

---

## 🌐 多言語対応

### 概要

**多文化おもてなしAIシステム**は、15言語対応を実現するための基盤システムです。システム自体も多言語対応します。

**対応パターン**: 🟡 **軽量対応**（UIテキスト） + **将来計画**（コンテンツ翻訳）

**定義**:
- ✅ Phase 1: 静的UIテキスト（ボタン、ラベル、メッセージ等）を多言語化（`@nuxtjs/i18n`）
- ⭕ Phase 2以降: 文化データベースコンテンツの翻訳（`translations`テーブル使用を将来検討）
- ❌ Phase 1では`translations`テーブルは使用しない
- ❌ Phase 1では自動翻訳は実行しない

**適用理由**:
- 管理画面専用であり、スタッフが使用する機能
- 文化データベース（`cultural_profiles`、`cultural_events`等）は英語で運用開始
- ゲスト向けAI応答は`SSOT_MULTILINGUAL_SYSTEM.md`と連携して多言語化

---

### 対象範囲

#### Phase 1: UIテキストのみ

| 項目 | 対象 | 実装方式 |
|------|------|---------|
| 設定画面 | ボタン、ラベル、セクション見出し | `@nuxtjs/i18n` |
| エラーメッセージ | バリデーションエラー、API エラー | `@nuxtjs/i18n` |
| トースト通知 | 成功・失敗メッセージ | `@nuxtjs/i18n` |
| ダッシュボード | チャート凡例、統計ラベル | `@nuxtjs/i18n` |

#### Phase 2以降: 文化データベースコンテンツ（将来検討）

| 項目 | 対象フィールド | 実装方式 | 検討時期 |
|------|---------------|---------|---------|
| `cultural_profiles` | `taboo_topics`、`taboo_gifts` の説明 | `translations` | Phase 2 |
| `cultural_events` | `event_name`、`description`、`greetings` | `translations` | Phase 2 |
| `food_cultural_meanings` | `cultural_meaning`、`symbolism` | `translations` | Phase 2 |

**判断基準**: Phase 1実装完了後、以下のいずれかを満たす場合に実施
1. スタッフの多言語対応要望が複数件ある
2. グローバル展開が決定している
3. Product Ownerの承認を得ている

---

### 実装方式

#### @nuxtjs/i18n による静的テキスト多言語化

**実装箇所**: `/pages/admin/settings/cultural-ai.vue`

```vue
<template>
  <div>
    <!-- セクション見出し -->
    <h2>{{ $t('culturalAi.settings.title') }}</h2>
    
    <!-- 基本設定 -->
    <div>
      <label>
        <input type="checkbox" v-model="settings.enabled" />
        {{ $t('culturalAi.settings.enabledLabel') }}
      </label>
      <p class="text-sm text-gray-600">
        {{ $t('culturalAi.settings.enabledDescription') }}
      </p>
    </div>
    
    <!-- 機能別設定 -->
    <fieldset>
      <legend>{{ $t('culturalAi.features.title') }}</legend>
      
      <label>
        <input type="checkbox" v-model="settings.culturalConsiderationEnabled" />
        {{ $t('culturalAi.features.culturalConsideration') }}
      </label>
      
      <!-- ... 他6つの機能 -->
    </fieldset>
    
    <!-- 保存ボタン -->
    <button @click="saveSettings">
      {{ $t('culturalAi.settings.saveButton') }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { $t } = useI18n()

const saveSettings = async () => {
  try {
    await $fetch('/api/v1/admin/cultural-ai/settings', {
      method: 'PUT',
      body: settings.value
    })
    
    // 成功メッセージ
    toast.success($t('culturalAi.messages.saveSuccess'))
  } catch (error) {
    // エラーメッセージ
    toast.error($t('culturalAi.messages.saveError'))
  }
}
</script>
```

#### 翻訳ファイル

**ファイル**: `locales/ja/cultural-ai.json`

```json
{
  "culturalAi": {
    "settings": {
      "title": "多文化おもてなしAI設定",
      "enabledLabel": "多文化AIを有効化",
      "enabledDescription": "ゲストの文化的背景に応じた配慮を自動的に提供します",
      "saveButton": "設定を保存"
    },
    "features": {
      "title": "機能別設定",
      "culturalConsideration": "文化的配慮AI",
      "culturalContext": "文化的コンテキストAI",
      "culturalEvent": "文化的イベント対応AI",
      "culinaryIntelligence": "食文化インテリジェンスAI",
      "visualAdaptation": "視覚的文化適応AI",
      "linguisticNuance": "文化的言語ニュアンスAI",
      "gestureRecognition": "文化的ジェスチャー認識AI"
    },
    "messages": {
      "saveSuccess": "設定を保存しました",
      "saveError": "設定の保存に失敗しました"
    }
  }
}
```

**ファイル**: `locales/en/cultural-ai.json`

```json
{
  "culturalAi": {
    "settings": {
      "title": "Multicultural Hospitality AI Settings",
      "enabledLabel": "Enable Multicultural AI",
      "enabledDescription": "Automatically provide cultural considerations based on guest backgrounds",
      "saveButton": "Save Settings"
    },
    "features": {
      "title": "Feature Settings",
      "culturalConsideration": "Cultural Consideration AI",
      "culturalContext": "Cultural Context AI",
      "culturalEvent": "Cultural Event AI",
      "culinaryIntelligence": "Culinary Intelligence AI",
      "visualAdaptation": "Visual Adaptation AI",
      "linguisticNuance": "Linguistic Nuance AI",
      "gestureRecognition": "Gesture Recognition AI"
    },
    "messages": {
      "saveSuccess": "Settings saved successfully",
      "saveError": "Failed to save settings"
    }
  }
}
```

---

### Phase 2: 文化データベースコンテンツの多言語化（将来検討）

#### 前提条件

- ✅ Phase 1（UIテキスト多言語化）が完了している
- ✅ `SSOT_MULTILINGUAL_SYSTEM.md` Phase 1-2が完了している
- ✅ スタッフからの多言語対応要望がある
- ✅ Product Ownerの承認を得ている

#### 実装時期

Phase 2以降（Phase 1完了の3-6ヶ月後）

#### 対象テーブル

##### 1. cultural_events（文化的イベント）

**対象フィールド**:
- `event_name`（英語） → 15言語対応
- `description`（説明） → 15言語対応
- `greetings`（挨拶）→ 15言語対応

**translations テーブル連携**:

```sql
-- エンティティタイプ
entity_type = 'cultural_event'

-- フィールド名
field_name = 'event_name'    -- イベント名
field_name = 'description'   -- 説明
field_name = 'greeting'      -- 挨拶（配列の各要素）
```

**API拡張例**:

```typescript
// GET /api/v1/cultural/events/:guestId?lang=ko

{
  "success": true,
  "data": {
    "events": [
      {
        "eventName": "Spring Festival",  // 既存カラム（英語）
        "eventNameLocal": "春节",        // 既存カラム（現地語）
        
        // 新規: translations テーブルから取得
        "translations": {
          "event_name": {
            "ja": "春節（旧正月）",
            "en": "Spring Festival",
            "ko": "춘절",
            "zh-CN": "春节"
          },
          "description": {
            "ja": "旧暦の正月。中国で最も重要な祝日。",
            "en": "Lunar New Year. The most important holiday in China.",
            "ko": "음력 설날. 중국에서 가장 중요한 명절.",
            "zh-CN": "农历新年。中国最重要的节日。"
          }
        }
      }
    ]
  }
}
```

##### 2. cultural_profiles（国別文化プロファイル）

**対象フィールド**:
- `taboo_topics`（タブートピック） → 15言語対応
- `taboo_gifts`（タブーギフト） → 15言語対応

**translations テーブル連携**:

```sql
entity_type = 'cultural_profile'
field_name = 'taboo_topic'   -- タブートピック（配列の各要素）
field_name = 'taboo_gift'    -- タブーギフト（配列の各要素）
```

##### 3. food_cultural_meanings（食材の文化的意味）

**対象フィールド**:
- `cultural_meaning`（文化的意味） → 15言語対応
- `symbolism`（象徴） → 15言語対応

**translations テーブル連携**:

```sql
entity_type = 'food_cultural_meaning'
field_name = 'cultural_meaning'  -- 文化的意味
field_name = 'symbolism'         -- 象徴
```

#### マイグレーション計画（Phase 2実施時）

**Phase 2-1: 翻訳テーブル連携**

```sql
-- cultural_events の event_name を translations へ移行
INSERT INTO translations (tenant_id, entity_type, entity_id, language_code, field_name, translated_text, translation_method)
SELECT 
  'system',  -- システムマスターデータ
  'cultural_event',
  id::TEXT,
  'en',
  'event_name',
  event_name,
  'manual'
FROM cultural_events
WHERE event_name IS NOT NULL;
```

**Phase 2-2: 15言語への自動翻訳**

```typescript
// バックグラウンドジョブで実行
const events = await prisma.culturalEvent.findMany()

for (const event of events) {
  await translationEngine.translateToAllLanguages({
    entityType: 'cultural_event',
    entityId: event.id,
    fieldName: 'event_name',
    sourceText: event.eventName,
    sourceLang: 'en'
  })
}
```

#### 工数見積もり

- **Phase 2-1**: 翻訳テーブル連携実装 → 1-2週間
- **Phase 2-2**: 15言語自動翻訳 → 1週間
- **合計**: 2-3週間

---

### マイグレーション計画

#### Phase 1: UIテキスト多言語化（Week 1-2）

**担当**: hotel-saas (Sun AI)

**実装内容**:
- [ ] `@nuxtjs/i18n`セットアップ確認
- [ ] 翻訳ファイル作成（`locales/ja/cultural-ai.json`、`locales/en/cultural-ai.json`）
- [ ] 管理画面コンポーネント更新（`$t()`関数使用）
- [ ] 言語切り替えUI実装

**検証**:
- [ ] 日本語・英語表示確認
- [ ] エラーメッセージの多言語表示確認
- [ ] トースト通知の多言語表示確認

#### Phase 2: 文化データベースコンテンツ翻訳（Phase 2以降、条件付き）

**前提条件**:
- [ ] Phase 1完了
- [ ] `SSOT_MULTILINGUAL_SYSTEM.md` Phase 1-2完了
- [ ] スタッフ要望確認
- [ ] Product Owner承認

**担当**: hotel-common (Iza AI)

**実装内容**:
- [ ] `cultural_events` 翻訳連携
- [ ] `cultural_profiles` 翻訳連携
- [ ] `food_cultural_meanings` 翻訳連携
- [ ] API拡張（`translations`オブジェクト追加）
- [ ] バックグラウンド翻訳ジョブ実装

---

### 実装チェックリスト

#### Phase 1: UIテキスト多言語化

##### hotel-saas
- [ ] `@nuxtjs/i18n`セットアップ確認
- [ ] 翻訳ファイル作成
  - [ ] `locales/ja/cultural-ai.json`
  - [ ] `locales/en/cultural-ai.json`
- [ ] 管理画面コンポーネント更新
  - [ ] `/pages/admin/settings/cultural-ai.vue`
  - [ ] エラーメッセージ
  - [ ] トースト通知
- [ ] 言語切り替えUI実装
- [ ] テスト
  - [ ] 日本語表示確認
  - [ ] 英語表示確認
  - [ ] 言語切り替え動作確認

#### Phase 2: 文化データベースコンテンツ翻訳（将来）

##### hotel-common
- [ ] `translations`テーブル連携実装
  - [ ] `cultural_events`
  - [ ] `cultural_profiles`
  - [ ] `food_cultural_meanings`
- [ ] API拡張
  - [ ] `translations`オブジェクト追加
  - [ ] `?lang`パラメータ対応
- [ ] バックグラウンド翻訳ジョブ
  - [ ] 既存データの15言語翻訳
  - [ ] 新規データの自動翻訳
- [ ] テスト
  - [ ] 各言語での表示確認
  - [ ] フォールバック動作確認

---

### 注意事項

#### ⚠️ システムの役割分担

**多文化おもてなしAI** と **多言語化システム** は異なる役割を持ちます：

| システム | 役割 | 担当 |
|---------|------|------|
| **多文化おもてなしAI**<br>（このSSO） | 文化的配慮・コンテキスト理解<br>イベント検出・食文化理解 | AI による高度な文化理解 |
| **多言語化システム**<br>(`SSOT_MULTILINGUAL_SYSTEM.md`) | テキスト翻訳・言語切り替え<br>翻訳管理・品質保証 | 翻訳エンジン・データベース |

**連携方法**:

```
ゲストが日本語でAIに質問
  ↓
多文化おもてなしAI: ゲストの文化プロファイルを取得
  ↓
多文化おもてなしAI: 文化的に適切なシステムプロンプトを生成
  ↓
AIが応答生成
  ↓
多言語化システム: 応答をゲストの主言語に翻訳
  ↓
ゲストに表示
```

#### ⚠️ 文化データの初期言語

**Phase 1**:
- 文化データベース（`cultural_profiles`、`cultural_events`）は**英語で運用開始**
- スタッフが理解できればよい（管理画面専用）

**Phase 2以降**:
- 必要に応じて15言語対応を検討

---

### 詳細仕様

**完全な仕様**: [SSOT_MULTILINGUAL_SYSTEM.md](./SSOT_MULTILINGUAL_SYSTEM.md)

---

---

### 1️⃣ ゲスト向け機能実装時の必須ルール

#### ✅ 必須: 多文化AI設定の確認

```typescript
// 例: メニュー表示機能
export default defineEventHandler(async (event) => {
  const guestId = event.context.session.guestId
  const tenantId = event.context.session.tenantId
  
  // 1. ✅ 必須: 多文化AI設定を確認
  const culturalSettings = await prisma.tenantCulturalAiSetting.findUnique({
    where: { tenantId }
  })
  
  // 2. メニュー取得
  const menuItems = await prisma.menuItem.findMany({
    where: { tenantId },
    include: { translations: true }
  })
  
  // 3. ✅ 必須: 多文化AIが有効な場合、文化的配慮を適用
  if (culturalSettings?.enabled && culturalSettings.culinaryIntelligenceEnabled) {
    const culturalEngine = getCulturalIntelligenceEngine()
    
    // 文化的に適切なメニューをフィルタリング
    const filteredItems = await culturalEngine.suggestCulturalMenu(
      guestId,
      menuItems
    )
    
    return { success: true, data: filteredItems }
  }
  
  // 4. 多文化AIが無効な場合、通常のメニューを返す
  return { success: true, data: menuItems }
})
```

#### ✅ 必須: 文化的イベントの確認

```typescript
// 例: チェックイン時
export default defineEventHandler(async (event) => {
  const guestId = event.context.session.guestId
  const tenantId = event.context.session.tenantId
  
  // 1. 多文化AI設定を確認
  const culturalSettings = await prisma.tenantCulturalAiSetting.findUnique({
    where: { tenantId }
  })
  
  if (culturalSettings?.enabled && culturalSettings.culturalEventEnabled) {
    const culturalEngine = getCulturalIntelligenceEngine()
    
    // 2. ✅ 必須: 文化的イベントを検出
    const events = await culturalEngine.detectCulturalEvents(guestId)
    
    // 3. イベントがある場合、おもてなしを提案
    if (events.length > 0) {
      for (const event of events) {
        const hospitality = await culturalEngine.suggestEventHospitality(
          guestId,
          event
        )
        
        // スタッフに通知
        if (culturalSettings.notifyStaffOnCulturalEvent) {
          await notifyStaff(tenantId, hospitality)
        }
        
        // ゲストに通知
        if (culturalSettings.notifyGuestOnCulturalEvent) {
          await notifyGuest(guestId, event)
        }
      }
    }
  }
  
  return { success: true }
})
```

---

### 2️⃣ AIコンシェルジュ統合時の必須ルール

#### ✅ 必須: 文化的コンテキストの適用

```typescript
// 例: AIチャット機能
export default defineEventHandler(async (event) => {
  const { guestId, message } = await readBody(event)
  const tenantId = event.context.session.tenantId
  
  // 1. 多文化AI設定を確認
  const culturalSettings = await prisma.tenantCulturalAiSetting.findUnique({
    where: { tenantId }
  })
  
  // 2. ✅ 必須: 多文化AIが有効な場合、文化的コンテキストを適用
  if (culturalSettings?.enabled && culturalSettings.culturalContextEnabled) {
    const culturalEngine = getCulturalIntelligenceEngine()
    
    // 文化的に適切なAI応答を生成
    const response = await culturalEngine.generateCulturalResponse(
      message,
      guestId
    )
    
    return { success: true, data: { response } }
  }
  
  // 3. 多文化AIが無効な場合、通常のAI応答
  const response = await generateStandardAIResponse(message)
  
  return { success: true, data: { response } }
})
```

---

### 3️⃣ 客室配慮時の必須ルール

#### ✅ 必須: 文化的タブーの確認

```typescript
// 例: 客室割り当て（hotel-pms）
export const assignRoom = async (
  guestId: string,
  preferredRoomNumber: number
) => {
  // 1. 多文化AI設定を確認
  const culturalSettings = await getCulturalSettings(tenantId)
  
  if (culturalSettings?.enabled && culturalSettings.culturalConsiderationEnabled) {
    const culturalEngine = getCulturalIntelligenceEngine()
    
    // 2. ✅ 必須: 客室番号の文化的適切性をチェック
    const profile = await culturalEngine.getCulturalProfile(guestId)
    
    // 不吉な数字をチェック
    if (profile.culturalTaboos?.unluckyNumbers.includes(preferredRoomNumber)) {
      // 代替客室を提案
      const alternativeRoom = await findAlternativeRoom(
        preferredRoomNumber,
        profile.culturalTaboos.unluckyNumbers
      )
      
      return {
        assigned: false,
        reason: 'cultural_consideration',
        suggestion: alternativeRoom
      }
    }
  }
  
  // 3. 問題なければ割り当て
  return { assigned: true, roomNumber: preferredRoomNumber }
}
```

---

### 4️⃣ 通知・メール送信時の必須ルール

#### ✅ 必須: 文化的に適切な表現

```typescript
// 例: ウェルカムメール送信
export const sendWelcomeEmail = async (
  guestId: string,
  email: string
) => {
  // 1. 多文化AI設定を確認
  const culturalSettings = await getCulturalSettings(tenantId)
  
  if (culturalSettings?.enabled && culturalSettings.linguisticNuanceEnabled) {
    const culturalEngine = getCulturalIntelligenceEngine()
    
    // 2. ✅ 必須: 文化的に適切な挨拶を生成
    const profile = await culturalEngine.getCulturalProfile(guestId)
    const greeting = await culturalEngine.getCulturalGreeting(
      profile.countryCode,
      'welcome'
    )
    
    // 3. 文化的に適切なメールを送信
    await sendEmail({
      to: email,
      subject: greeting.subject,
      body: greeting.body
    })
  } else {
    // 標準メールを送信
    await sendStandardWelcomeEmail(email)
  }
}
```

---

### 5️⃣ テスト時の必須確認項目

```markdown
## 多文化AI対応のテストチェックリスト

### 設定確認
- [ ] テナントの多文化AI設定が正しく取得できるか
- [ ] プラン別機能制限が正しく動作するか
- [ ] 機能別有効/無効が正しく反映されるか

### 文化的配慮
- [ ] 宗教的配慮が正しく適用されるか
- [ ] 食文化配慮が正しく適用されるか
- [ ] 文化的タブーが正しく回避されるか

### 文化的コンテキスト
- [ ] AIのコミュニケーションスタイルが文化に応じて変わるか
- [ ] 敬語レベルが適切か
- [ ] 文化的ニュアンスが正しく理解されるか

### 文化的イベント
- [ ] イベントが正しく検出されるか
- [ ] おもてなし提案が適切か
- [ ] 通知が正しく送信されるか

### プライバシー
- [ ] オプトアウトが正しく機能するか
- [ ] データ削除が正しく実行されるか
```

---

### 6️⃣ よくある間違いと修正方法

#### ❌ 間違い1: 多文化AI設定を確認しない

```typescript
// ❌ 間違い: 設定確認なしで文化的配慮を適用
const filteredMenu = await culturalEngine.suggestCulturalMenu(guestId, menuItems)
```

**✅ 修正**:
```typescript
// 設定を確認してから適用
const settings = await getCulturalSettings(tenantId)
if (settings?.enabled && settings.culinaryIntelligenceEnabled) {
  const filteredMenu = await culturalEngine.suggestCulturalMenu(guestId, menuItems)
}
```

#### ❌ 間違い2: プラン制限を無視

```typescript
// ❌ 間違い: プラン制限を確認せずに高度機能を使用
const theme = await culturalEngine.generateVisualTheme(guestId)
```

**✅ 修正**:
```typescript
// プラン制限を確認
const hasAccess = await checkCulturalAiAccess(tenantId, 'visual_adaptation')
if (hasAccess) {
  const theme = await culturalEngine.generateVisualTheme(guestId)
}
```

---

## ✅ 実装チェックリスト

### hotel-common
- [ ] CulturalIntelligenceEngineクラス実装
- [ ] 共通API実装（7エンドポイント）
- [ ] 文化データベース初期データ投入
- [ ] OpenAI統合
- [ ] キャッシュ実装

### hotel-saas
- [ ] 管理画面設定UI実装
- [ ] useCulturalAI composable実装
- [ ] AIコンシェルジュ統合
- [ ] メニュー配慮実装

### hotel-pms
- [ ] PMSCulturalService実装
- [ ] 予約配慮実装
- [ ] 客室配慮実装
- [ ] イベント通知実装

### hotel-member
- [ ] MemberCulturalService実装
- [ ] 会員特典配慮実装
- [ ] 通知配慮実装

### データベース
- [ ] tenant_cultural_ai_settingsテーブル作成
- [ ] cultural_profilesテーブル作成
- [ ] cultural_eventsテーブル作成
- [ ] guest_cultural_profilesテーブル作成
- [ ] cultural_consideration_logsテーブル作成
- [ ] food_cultural_meaningsテーブル作成

### テスト
- [ ] 各文化プロファイルでの動作確認
- [ ] プラン別機能制限の確認
- [ ] AI応答の文化的適切性確認
- [ ] プライバシー設定の確認

---

## 🎯 成功基準

### 機能要件
- ✅ 200+国の文化プロファイル対応
- ✅ 7つの機能全て実装
- ✅ プラン別機能制限の実装
- ✅ 管理者による有効/無効設定
- ✅ ゲストのオプトイン/アウト機能

### 非機能要件
- ✅ AI応答生成: 2秒以内
- ✅ 文化プロファイル取得: 50ms以内（キャッシュヒット時）
- ✅ 月間AIコスト: ¥40/ホテル以内（GPT-4o mini使用時）

### 品質要件
- ✅ 文化的配慮の正確性: 90%以上
- ✅ ゲスト満足度: 4.5/5.0以上
- ✅ スタッフ満足度: 4.0/5.0以上

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.2.0 | 2025-10-10 | 多言語対応セクション追加（UIテキスト多言語化 + 将来のコンテンツ翻訳計画） |
| 1.1.0 | 2025-10-07 | 詳細実装手順書追加（Phase 0-6のステップバイステップ手順、テスト戦略、デプロイ戦略、ロールバック手順） |
| 1.0.0 | 2025-10-07 | 初版作成 |

---

**作成者**: Iza（統合管理者）  
**承認者**: -  
**次回レビュー予定**: 実装開始時
