# 🚀 UIエディタシステム API仕様書（キャンペーン機能統合版）

**作成日**: 2025年1月16日  
**更新日**: 2025年1月16日  
**バージョン**: 2.0 - キャンペーン機能統合版

---

## 🎯 概要

### **対象機能**
1. **固定ページAPI**: 館内施設・観光案内・画面操作ガイド・アンケート
2. **自由ページAPI**: ブロック編集システム・AI生成
3. **キャンペーンAPI**: CRUD操作・表示制御・分析機能
4. **プラン制限API**: Economy/Professional別機能制限
5. **多言語対応API**: 自動翻訳・言語切替

---

## 📋 API エンドポイント一覧

### **1. 館内施設API**

#### **GET /api/v1/facilities**
施設一覧取得

**クエリパラメータ:**
```typescript
interface FacilitiesQuery {
  category?: 'restaurant' | 'spa' | 'fitness' | 'conference' | 'shop' | 'other';
  featured?: boolean;
  include_congestion?: boolean;
  language?: string;
}
```

**レスポンス:**
```typescript
interface FacilitiesResponse {
  success: boolean;
  data: {
    facilities: Array<{
      id: number;
      name: string;
      category: string;
      description: string;
      main_image: string;
      gallery_images: string[];
      operating_hours: Record<string, any>;
      phone_number?: string;
      extension_number?: string;
      location_description: string;
      floor_number?: number;
      has_pricing: boolean;
      pricing_info?: Record<string, any>;
      accepts_reservations: boolean;
      reservation_contact?: {
        phone?: string;
        email?: string;
        url?: string;
      };
      has_congestion_prediction: boolean;
      current_congestion?: number; // 1-5
      congestion_forecast?: Array<{
        hour: number;
        level: number;
      }>;
      is_featured: boolean;
    }>;
    total: number;
  };
}
```

#### **POST /api/v1/admin/facilities**
施設作成

**リクエストボディ:**
```typescript
interface CreateFacilityRequest {
  name_ja: string;
  name_en?: string;
  category: string;
  description_ja?: string;
  description_en?: string;
  main_image?: string;
  gallery_images?: string[];
  operating_hours?: Record<string, any>;
  phone_number?: string;
  extension_number?: string;
  location_description_ja?: string;
  location_description_en?: string;
  floor_number?: number;
  has_pricing?: boolean;
  pricing_info?: Record<string, any>;
  accepts_reservations?: boolean;
  reservation_phone?: string;
  reservation_email?: string;
  reservation_url?: string;
  has_congestion_prediction?: boolean;
  is_featured?: boolean;
  sort_order?: number;
}
```

#### **PUT /api/v1/admin/facilities/{id}**
施設更新

#### **DELETE /api/v1/admin/facilities/{id}**
施設削除

#### **POST /api/v1/admin/facilities/{id}/congestion**
混雑予想データ更新

**リクエストボディ:**
```typescript
interface UpdateCongestionRequest {
  schedule: Array<{
    day_of_week: number; // 0-6
    hour: number; // 0-23
    congestion_level: number; // 1-5
  }>;
}
```

### **2. 観光案内API**

#### **GET /api/v1/tourism-spots**
観光スポット一覧取得

**クエリパラメータ:**
```typescript
interface TourismSpotsQuery {
  category?: 'temple' | 'nature' | 'shopping' | 'restaurant' | 'entertainment' | 'historical' | 'other';
  featured?: boolean;
  max_distance?: number; // km
  language?: string;
}
```

**レスポンス:**
```typescript
interface TourismSpotsResponse {
  success: boolean;
  data: {
    spots: Array<{
      id: number;
      name: string;
      category: string;
      description: string;
      address: string;
      latitude?: number;
      longitude?: number;
      main_image: string;
      gallery_images: string[];
      access_description: string;
      distance_from_hotel: number;
      estimated_travel_time: number;
      transportation_options: Record<string, any>;
      website_url?: string;
      phone_number?: string;
      opening_hours?: Record<string, any>;
      admission_fee_info?: Record<string, any>;
      qr_code_url?: string;
      mobile_detail_url?: string;
      is_ai_generated: boolean;
      is_featured: boolean;
    }>;
    total: number;
  };
}
```

#### **POST /api/v1/admin/tourism-spots**
観光スポット作成

#### **PUT /api/v1/admin/tourism-spots/{id}**
観光スポット更新

#### **DELETE /api/v1/admin/tourism-spots/{id}**
観光スポット削除

#### **POST /api/v1/admin/tourism-spots/ai-generate**
AI自動生成

**リクエストボディ:**
```typescript
interface AIGenerateTourismRequest {
  area_description: string;
  preferred_categories?: string[];
  max_spots?: number;
  language?: string;
}
```

### **3. 画面操作ガイドAPI**

#### **GET /api/v1/guide-pages**
ガイドページ一覧取得

#### **POST /api/v1/admin/guide-pages**
ガイドページ作成

**リクエストボディ:**
```typescript
interface CreateGuidePageRequest {
  title_ja: string;
  title_en?: string;
  content_type: 'text' | 'video' | 'step_by_step';
  content_ja?: string;
  content_en?: string;
  video_url?: string;
  video_thumbnail?: string;
  video_duration?: number;
  steps_data?: Array<{
    step_number: number;
    title: string;
    description: string;
    image?: string;
    video?: string;
  }>;
  sort_order?: number;
}
```

### **4. アンケートシステムAPI**

#### **GET /api/v1/surveys**
アンケートフォーム一覧取得

#### **GET /api/v1/surveys/{id}**
アンケートフォーム詳細取得

#### **POST /api/v1/surveys/{id}/respond**
アンケート回答提出

**リクエストボディ:**
```typescript
interface SubmitSurveyResponse {
  room_id: string;
  device_id?: number;
  response_data: Record<string, any>;
}
```

**レスポンス:**
```typescript
interface SubmitSurveyResult {
  success: boolean;
  data: {
    response_id: number;
    reward_granted: boolean;
    reward_info?: {
      type: string;
      description: string;
      order_id?: number;
      discount_code?: string;
    };
  };
}
```

#### **POST /api/v1/admin/surveys**
アンケートフォーム作成

#### **GET /api/v1/admin/surveys/{id}/analytics**
アンケート分析データ取得

### **5. 自由ページ（インフォメーション）API**

#### **GET /api/v1/info-pages**
インフォメーションページ一覧取得

#### **GET /api/v1/info-pages/{slug}**
インフォメーションページ詳細取得

#### **POST /api/v1/admin/info-pages**
インフォメーションページ作成

**リクエストボディ:**
```typescript
interface CreateInfoPageRequest {
  slug: string;
  title_ja: string;
  title_en?: string;
  blocks_data: Array<{
    id: string;
    type: string; // 'text', 'image', 'video', 'gallery', 'button', 'spacer'
    content: Record<string, any>;
    styles?: Record<string, any>;
  }>;
  meta_description_ja?: string;
  meta_description_en?: string;
  featured_image?: string;
  is_featured?: boolean;
  status?: 'draft' | 'published';
}
```

#### **POST /api/v1/admin/info-pages/ai-generate**
AI自動生成

**リクエストボディ:**
```typescript
interface AIGenerateInfoPageRequest {
  prompt: string;
  page_type?: string;
  target_audience?: string;
  language?: string;
  include_images?: boolean;
}
```

**レスポンス:**
```typescript
interface AIGenerateInfoPageResponse {
  success: boolean;
  data: {
    title_ja: string;
    title_en?: string;
    blocks_data: Array<{
      id: string;
      type: string;
      content: Record<string, any>;
    }>;
    meta_description_ja?: string;
    meta_description_en?: string;
    suggested_images?: string[];
  };
}
```

### **6. キャンペーンAPI**

#### **GET /api/v1/campaigns/active**
アクティブキャンペーン取得

**クエリパラメータ:**
```typescript
interface ActiveCampaignsQuery {
  slot?: 'top_page_hero' | 'auto_slideshow' | 'welcome_screen';
  language?: string;
  device_type?: 'tv' | 'tablet' | 'mobile';
}
```

**レスポンス:**
```typescript
interface ActiveCampaignsResponse {
  success: boolean;
  data: {
    campaigns: Array<{
      id: number;
      title: string;
      description: string;
      main_image: string;
      mobile_image?: string;
      video_url?: string;
      cta_text: string;
      cta_type: string;
      cta_target_id?: number;
      cta_target_url?: string;
      display_priority: number;
    }>;
    slot_config: {
      max_campaigns: number;
      auto_rotation: boolean;
      rotation_interval: number;
    };
  };
}
```

#### **POST /api/v1/campaigns/{id}/track-impression**
キャンペーン表示トラッキング

**リクエストボディ:**
```typescript
interface TrackImpressionRequest {
  device_type: 'tv' | 'tablet' | 'mobile';
  room_id?: string;
}
```

#### **POST /api/v1/campaigns/{id}/track-click**
キャンペーンクリックトラッキング

#### **GET /api/v1/admin/campaigns**
キャンペーン一覧取得（管理画面）

#### **POST /api/v1/admin/campaigns**
キャンペーン作成

**リクエストボディ:**
```typescript
interface CreateCampaignRequest {
  title_ja: string;
  title_en?: string;
  description_ja?: string;
  description_en?: string;
  main_image: string; // 16:9必須
  mobile_image?: string;
  video_url?: string; // Professional plan以上
  cta_text_ja: string;
  cta_text_en?: string;
  cta_type: 'room_service' | 'facility' | 'tourism' | 'survey' | 'menu_category' | 'menu_item' | 'external_url';
  cta_target_id?: number;
  cta_target_url?: string;
  display_start: string; // ISO datetime
  display_end: string; // ISO datetime
  time_restrictions?: {
    allowed_hours?: Array<{
      start: string; // "HH:MM"
      end: string;   // "HH:MM"
    }>;
    allowed_days?: number[]; // 0-6
    exclude_dates?: string[]; // "YYYY-MM-DD"
  };
  display_priority?: number;
  translations?: Array<{
    language_code: string;
    title: string;
    description?: string;
    cta_text: string;
  }>;
}
```

#### **GET /api/v1/admin/campaigns/{id}/analytics**
キャンペーン分析データ取得

**レスポンス:**
```typescript
interface CampaignAnalyticsResponse {
  success: boolean;
  data: {
    summary: {
      total_impressions: number;
      total_clicks: number;
      ctr: number;
      peak_hour: number;
      best_device_type: string;
    };
    daily_stats: Array<{
      date: string;
      impressions: number;
      clicks: number;
      ctr: number;
    }>;
    device_breakdown: {
      tv: { impressions: number; clicks: number; };
      tablet: { impressions: number; clicks: number; };
      mobile: { impressions: number; clicks: number; };
    };
    hourly_breakdown: Array<{
      hour: number;
      impressions: number;
      clicks: number;
    }>;
  };
}
```

### **7. 初回チェックイン画面API**

#### **GET /api/v1/welcome-screen/config**
ようこそ画面設定取得

**レスポンス:**
```typescript
interface WelcomeScreenConfigResponse {
  success: boolean;
  data: {
    is_enabled: boolean;
    welcome_video_url?: string;
    video_thumbnail?: string;
    video_duration?: number;
    auto_play: boolean;
    show_skip_button: boolean;
    show_campaign_digest: boolean;
    campaign_digest: Array<{
      id: number;
      title: string;
      image: string;
      cta_text: string;
    }>;
    show_service_guide: boolean;
    service_guide_items: Array<{
      title: string;
      description: string;
      icon: string;
    }>;
  };
}
```

#### **GET /api/v1/welcome-screen/should-show**
初回画面表示判定

**クエリパラメータ:**
```typescript
interface ShouldShowWelcomeQuery {
  device_id: number;
  room_id: string;
}
```

**レスポンス:**
```typescript
interface ShouldShowWelcomeResponse {
  success: boolean;
  data: {
    should_show: boolean;
    session_id?: string;
    reason?: 'first_time' | 'new_session' | 'already_shown';
  };
}
```

#### **POST /api/v1/welcome-screen/mark-completed**
初回画面完了マーク

**リクエストボディ:**
```typescript
interface MarkWelcomeCompletedRequest {
  device_id: number;
  room_id: string;
  session_id: string;
  completion_type: 'watched_complete' | 'skipped' | 'interrupted';
}
```

### **8. プラン制限API**

#### **GET /api/v1/plan/restrictions**
現在プランの制限取得

**レスポンス:**
```typescript
interface PlanRestrictionsResponse {
  success: boolean;
  data: {
    plan_type: string;
    plan_category: string;
    restrictions: {
      max_info_pages: number;
      current_info_pages: number;
      enable_ai_generation: boolean;
      enable_layout_editor: boolean;
      max_campaign_display: number;
      current_campaign_display: number;
      enable_campaign_video: boolean;
      enable_campaign_analytics: boolean;
      enable_facility_congestion: boolean;
      enable_tourism_ai_generation: boolean;
      enable_survey_rewards: boolean;
    };
    upgrade_options?: Array<{
      plan_type: string;
      plan_category: string;
      monthly_price: number;
      benefits: string[];
    }>;
  };
}
```

#### **POST /api/v1/plan/check-action**
操作実行可否チェック

**リクエストボディ:**
```typescript
interface CheckActionRequest {
  action: 'create_info_page' | 'create_campaign' | 'enable_ai_generation' | 'upload_campaign_video';
  additional_data?: Record<string, any>;
}
```

**レスポンス:**
```typescript
interface CheckActionResponse {
  success: boolean;
  data: {
    allowed: boolean;
    reason?: string;
    current_usage?: number;
    limit?: number;
    upgrade_required?: {
      recommended_plan: string;
      benefits: string[];
    };
  };
}
```

### **9. 多言語対応API**

#### **POST /api/v1/translations/auto-translate**
自動翻訳実行

**リクエストボディ:**
```typescript
interface AutoTranslateRequest {
  source_text: string;
  source_language: string;
  target_languages: string[];
  content_type?: 'plain' | 'html' | 'json';
}
```

**レスポンス:**
```typescript
interface AutoTranslateResponse {
  success: boolean;
  data: {
    translations: Record<string, string>; // language_code -> translated_text
    detected_language?: string;
    confidence_scores?: Record<string, number>;
  };
}
```

#### **GET /api/v1/languages/supported**
サポート言語一覧取得

### **10. 共通API**

#### **POST /api/v1/uploads/image**
画像アップロード

**リクエスト:**
- Content-Type: multipart/form-data
- フィールド: file, category?, alt_text?

**レスポンス:**
```typescript
interface ImageUploadResponse {
  success: boolean;
  data: {
    filename: string;
    url: string;
    size: number;
    dimensions?: {
      width: number;
      height: number;
    };
    alt_text?: string;
  };
}
```

#### **POST /api/v1/uploads/video**
動画アップロード

#### **GET /api/v1/analytics/dashboard**
ダッシュボード統計データ取得

**レスポンス:**
```typescript
interface DashboardAnalyticsResponse {
  success: boolean;
  data: {
    overview: {
      total_page_views: number;
      total_campaigns: number;
      active_campaigns: number;
      total_survey_responses: number;
    };
    popular_content: Array<{
      type: 'facility' | 'tourism' | 'campaign' | 'info_page';
      title: string;
      views: number;
      engagement_rate: number;
    }>;
    recent_activity: Array<{
      type: string;
      description: string;
      timestamp: string;
    }>;
  };
}
```

---

## 🔒 認証・権限

### **認証方式**
- 管理画面API: Bearer token認証
- 客室側API: Device authentication（既存システム）
- プラン制限: テナント別制限チェック

### **権限レベル**
```typescript
enum Permission {
  // 固定ページ
  VIEW_FACILITIES = 'view_facilities',
  MANAGE_FACILITIES = 'manage_facilities',
  VIEW_TOURISM = 'view_tourism',
  MANAGE_TOURISM = 'manage_tourism',
  
  // キャンペーン
  VIEW_CAMPAIGNS = 'view_campaigns',
  MANAGE_CAMPAIGNS = 'manage_campaigns',
  VIEW_CAMPAIGN_ANALYTICS = 'view_campaign_analytics',
  
  // AI機能
  USE_AI_GENERATION = 'use_ai_generation',
  
  // プラン管理
  CHANGE_PLAN = 'change_plan',
  VIEW_PLAN_USAGE = 'view_plan_usage'
}
```

---

## ⚡ パフォーマンス最適化

### **キャッシュ戦略**
```typescript
interface CacheConfig {
  // キャンペーン表示データ: 5分
  active_campaigns: { ttl: 300, key: 'campaigns:active:{tenant_id}' };
  
  // 施設一覧: 30分
  facilities_list: { ttl: 1800, key: 'facilities:list:{tenant_id}' };
  
  // 観光スポット: 1時間
  tourism_spots: { ttl: 3600, key: 'tourism:spots:{tenant_id}' };
  
  // プラン制限: 15分
  plan_restrictions: { ttl: 900, key: 'plan:restrictions:{tenant_id}' };
}
```

### **レート制限**
```typescript
interface RateLimit {
  // AI生成API
  ai_generation: { requests: 10, window: 3600 }; // 10回/時間
  
  // 画像アップロード
  image_upload: { requests: 100, window: 3600 }; // 100回/時間
  
  // 自動翻訳
  auto_translate: { requests: 50, window: 3600 }; // 50回/時間
}
```

---

## 🚨 エラーハンドリング

### **標準エラーレスポンス**
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    suggestion?: string;
  };
}
```

### **プラン制限エラー**
```typescript
interface PlanLimitError extends ErrorResponse {
  error: {
    code: 'PLAN_LIMIT_EXCEEDED';
    message: string;
    details: {
      limit_type: string;
      current_usage: number;
      limit: number;
      plan_type: string;
    };
    suggestion: 'プロフェッショナルプランにアップグレードすると制限が解除されます';
  };
}
```

---

## 📊 API実装優先度

### **Phase 1 (MVP)**
1. キャンペーン基本API (GET /campaigns/active, POST /admin/campaigns)
2. 固定ページ基本API (館内施設・観光案内の基本CRUD)
3. プラン制限API (制限チェック機能)

### **Phase 2**
1. アンケートシステムAPI
2. 自由ページAPI (ブロック編集)
3. 初回チェックイン画面API

### **Phase 3**
1. AI生成API
2. キャンペーン分析API
3. 多言語自動翻訳API 