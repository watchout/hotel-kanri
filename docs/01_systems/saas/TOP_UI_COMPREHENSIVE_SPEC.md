# TOP UI 包括的機能仕様書

## 📋 概要

### **プロジェクト名**
Hotel SaaS TOP UI 包括的機能拡張

### **目的**
客室TV画面のTOPページを包括的なランチャー・情報ハブとして機能させ、ホテル滞在体験を大幅に向上させる。

### **スコープ**
- TOPページランチャー機能
- 観光案内（周辺情報）システム
- 館内施設予約システム
- 混雑予想機能

## 🎯 機能要件

### **Phase 1: TOPページ・ランチャー機能**

#### **F001: 外部アプリリンク機能**
**概要**: TOPページから外部アプリへの直接アクセス機能

**対象アプリ**:
- YouTube
- Netflix
- 天気アプリ
- ニュースアプリ
- その他動画配信サービス

**データベース設計**:
```prisma
model AppLink {
  id          Int      @id @default(autoincrement())
  name        String   // アプリ名
  packageName String   // Androidパッケージ名
  iconUrl     String?  // アイコンURL
  category    String   // カテゴリ（動画、天気、ニュース等）
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  placeId     Int?     // ホテル別設定
  
  place       Place?   @relation(fields: [placeId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**UI仕様**:
```typescript
interface AppLinkGrid {
  layout: 'grid' | 'list';
  itemsPerRow: 4 | 6 | 8;
  categories: {
    video: AppLink[];
    weather: AppLink[];
    news: AppLink[];
    utility: AppLink[];
  };
}
```

**受入条件**:
- [ ] TOPページにアプリリンクグリッド表示
- [ ] アプリアイコンタップで外部アプリ起動
- [ ] カテゴリ別表示・フィルタリング
- [ ] 管理画面でのアプリ管理機能

#### **F002: ホテル管理者によるアプリ選択機能**
**概要**: ホテル側で表示するアプリを選択・管理

**管理機能**:
- アプリの有効/無効切り替え
- 表示順序の変更
- カテゴリ設定
- アイコンのカスタマイズ

**API仕様**:
```typescript
// GET /api/v1/admin/app-links
interface AppLinkResponse {
  id: number;
  name: string;
  packageName: string;
  iconUrl: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
}

// PUT /api/v1/admin/app-links/[id]
interface AppLinkUpdateRequest {
  isActive?: boolean;
  sortOrder?: number;
  category?: string;
}
```

**受入条件**:
- [ ] 管理画面でのアプリ一覧表示
- [ ] 有効/無効の切り替え
- [ ] ドラッグ&ドロップでの順序変更
- [ ] カテゴリ設定機能

### **Phase 2: 観光案内（周辺情報）システム**

#### **F003: おすすめスポット管理機能**
**概要**: ホテル独自のおすすめスポット登録・管理

**データベース設計**:
```prisma
model TouristSpot {
  id          Int      @id @default(autoincrement())
  name        String   // スポット名
  description String?  // 説明
  category    String   // カテゴリ
  address     String   // 住所
  latitude    Float    // 緯度
  longitude   Float    // 経度
  walkingTime Int?     // 徒歩時間（分）
  imageUrl    String?  // 画像URL
  website     String?  // ウェブサイト
  phone       String?  // 電話番号
  
  // Google Maps連携情報
  googlePlaceId String? // Google Place ID
  googleRating  Float?  // Google評価
  googleReviews Int?    // レビュー数
  
  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)
  placeId     Int      // ホテルID
  
  place       Place    @relation(fields: [placeId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SpotCategory {
  id          Int      @id @default(autoincrement())
  name        String   // カテゴリ名
  iconName    String   // アイコン名
  color       String   // カテゴリ色
  sortOrder   Int      @default(0)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**カテゴリ例**:
- レストラン
- 観光地
- ショッピング
- 温泉
- 文化施設
- 自然スポット

**受入条件**:
- [ ] 管理画面でのスポット登録・編集
- [ ] カテゴリ別管理
- [ ] 画像アップロード機能
- [ ] 地図上での位置設定

#### **F004: リスト・マップ切り替え表示**
**概要**: 観光スポットをリスト形式とマップ形式で切り替え表示

**UI仕様**:
```typescript
interface TouristSpotView {
  viewMode: 'list' | 'map';
  selectedCategory: string | 'all';
  spots: TouristSpot[];
  mapCenter: {
    lat: number;
    lng: number;
  };
}

interface SpotListItem {
  id: number;
  name: string;
  category: string;
  walkingTime: number;
  googleRating: number;
  googleReviews: number;
  imageUrl: string;
  distance: number; // ホテルからの距離
}
```

**マップ機能**:
- Google Maps Embed API使用
- ホテル位置とスポット位置にピン表示
- ピンクリックで詳細情報表示
- 徒歩ルート表示

**受入条件**:
- [ ] リスト・マップ切り替えボタン
- [ ] カテゴリフィルタリング
- [ ] Google評価・レビュー数表示
- [ ] 徒歩時間・距離表示

#### **F005: Google Maps API連携**
**概要**: Google Maps APIとの連携（コスト最適化）

**API使用方針**:
```typescript
// コスト最適化のため段階的実装
interface GoogleMapsIntegration {
  phase1: {
    api: 'Google Maps Embed API'; // 無料枠内
    features: ['地図表示', 'ピン表示'];
    cost: 0;
  };
  
  phase2: {
    api: 'Google Places API'; // 有料
    features: ['評価取得', 'レビュー取得', '詳細情報'];
    estimatedCost: '月額¥5,000-15,000';
  };
  
  phase3: {
    api: 'Google Directions API'; // 有料
    features: ['ルート案内', '徒歩時間計算'];
    estimatedCost: '月額¥3,000-10,000';
  };
}
```

**コスト管理**:
- 月額¥20,000以下に抑制
- 使用量監視機能
- 超過時のアラート機能

**受入条件**:
- [ ] Google Maps Embed API実装
- [ ] 使用量監視機能
- [ ] コスト上限設定機能

### **Phase 3: 館内施設予約システム**

#### **F006: 予約可能施設管理**
**概要**: 館内施設の予約管理機能

**データベース設計**:
```prisma
model Facility {
  id          Int      @id @default(autoincrement())
  name        String   // 施設名
  description String?  // 説明
  category    String   // カテゴリ
  capacity    Int      // 収容人数
  duration    Int      // 標準利用時間（分）
  price       Int?     // 利用料金
  
  // 予約設定
  isReservable      Boolean @default(true)  // 予約可能か
  advanceBookingMin Int     @default(60)    // 何分前まで予約可能
  
  // 営業時間
  openTime    String   // 営業開始時間
  closeTime   String   // 営業終了時間
  
  placeId     Int      // ホテルID
  place       Place    @relation(fields: [placeId], references: [id])
  
  reservations FacilityReservation[]
  congestions  FacilityCongestion[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model FacilityReservation {
  id          Int      @id @default(autoincrement())
  facilityId  Int
  roomNumber  String   // 客室番号
  guestName   String?  // ゲスト名
  startTime   DateTime // 開始時間
  endTime     DateTime // 終了時間
  partySize   Int      // 利用人数
  status      String   @default("confirmed") // confirmed, cancelled
  
  facility    Facility @relation(fields: [facilityId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**予約対象施設**:
- 貸切風呂
- レストラン
- 会議室
- エステ
- カラオケ
- その他有料施設

**受入条件**:
- [ ] 施設管理画面
- [ ] 15分単位の予約スロット
- [ ] 当日予約制限（60分前まで）
- [ ] 予約確認・一覧表示

#### **F007: 予約インターフェース**
**概要**: 客室TVからの予約操作

**UI仕様**:
```typescript
interface ReservationFlow {
  step1: {
    screen: 'facility-selection';
    data: Facility[];
  };
  
  step2: {
    screen: 'time-selection';
    data: {
      facility: Facility;
      availableSlots: TimeSlot[];
    };
  };
  
  step3: {
    screen: 'party-size';
    data: {
      maxCapacity: number;
      selectedSize: number;
    };
  };
  
  step4: {
    screen: 'confirmation';
    data: ReservationSummary;
  };
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isRecommended: boolean;
}
```

**予約制限**:
- 1組あたり1日1回まで
- 当日予約のみ（60分前まで）
- キャンセル・変更はフロント連絡必須

**受入条件**:
- [ ] 4ステップ予約フロー
- [ ] リアルタイム空き状況表示
- [ ] 予約確認画面
- [ ] フロント連絡案内

### **Phase 4: 混雑予想機能**

#### **F008: 混雑予想データ管理**
**概要**: 予約不要施設の混雑予想管理

**データベース設計**:
```prisma
model FacilityCongestion {
  id          Int      @id @default(autoincrement())
  facilityId  Int
  date        DateTime // 対象日
  hour        Int      // 時間（0-23）
  level       String   // 混雑レベル（empty, normal, crowded）
  
  facility    Facility @relation(fields: [facilityId], references: [id])
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([facilityId, date, hour])
}
```

**混雑レベル**:
- `empty`: 空いている（緑色）
- `normal`: 普通（黄色）
- `crowded`: 混雑（赤色）

**受入条件**:
- [ ] 時間別混雑レベル設定
- [ ] 管理画面での一括設定
- [ ] 客室UIでの時間軸表示

#### **F009: リアルタイム混雑更新**
**概要**: ホテルスタッフによるリアルタイム混雑情報更新

**UI仕様**:
```typescript
interface CongestionManagement {
  facilityId: number;
  currentHour: number;
  currentLevel: 'empty' | 'normal' | 'crowded';
  
  quickUpdate: {
    oneHour: boolean;
    twoHours: boolean;
    restOfDay: boolean;
  };
}
```

**更新方法**:
- 管理画面からの手動更新
- モバイル対応（スタッフ用）
- 一括更新機能

**受入条件**:
- [ ] スタッフ向け簡単更新UI
- [ ] モバイル対応
- [ ] 更新履歴管理

## 🔧 技術仕様

### **外部API連携**

#### **Google Maps API**
```typescript
interface GoogleMapsConfig {
  embedApi: {
    key: string;
    usage: 'unlimited'; // 無料
    features: ['map-display', 'markers'];
  };
  
  placesApi: {
    key: string;
    monthlyBudget: 15000; // 円
    features: ['place-details', 'reviews'];
  };
  
  directionsApi: {
    key: string;
    monthlyBudget: 10000; // 円
    features: ['walking-routes', 'distance-matrix'];
  };
}
```

#### **外部アプリ連携**
```typescript
interface AppLaunchConfig {
  method: 'intent' | 'deeplink';
  
  apps: {
    youtube: {
      packageName: 'com.google.android.youtube.tv';
      fallbackUrl: 'https://youtube.com';
    };
    
    netflix: {
      packageName: 'com.netflix.ninja';
      fallbackUrl: 'https://netflix.com';
    };
    
    weather: {
      packageName: 'com.google.android.apps.weather';
      fallbackUrl: 'https://weather.com';
    };
  };
}
```

### **セキュリティ考慮事項**

#### **外部アプリ連携**
```typescript
interface SecurityMeasures {
  appLaunch: {
    whitelist: string[]; // 許可アプリのパッケージ名
    verification: boolean; // アプリ署名検証
    sandbox: boolean; // サンドボックス実行
  };
  
  mapApi: {
    keyRestriction: 'android-app'; // Android アプリ制限
    refererRestriction: string[]; // リファラー制限
    quotaLimit: number; // 使用量制限
  };
}
```

#### **ネットワーク制約**
- ホテルWiFiでの外部アプリ動作確認
- 帯域制限下での地図表示最適化
- オフライン時の代替表示

## 📈 実装フェーズ

### **Phase 1: 基盤整備 (2-3週間)**
- [ ] データベーススキーマ設計・実装
- [ ] 基本的なCRUD API実装
- [ ] 管理画面の基本機能

### **Phase 2: 外部連携 (2-3週間)**
- [ ] Google Maps Embed API連携
- [ ] 外部アプリ起動機能
- [ ] 基本的なUI実装

### **Phase 3: 予約システム (3-4週間)**
- [ ] 施設予約機能実装
- [ ] 混雑予想機能実装
- [ ] リアルタイム更新機能

### **Phase 4: 最適化・テスト (2-3週間)**
- [ ] パフォーマンス最適化
- [ ] セキュリティテスト
- [ ] 実機テスト・調整

## 🧪 テスト戦略

### **機能テスト**
- 外部アプリ起動テスト
- 地図表示・ピン機能テスト
- 予約フロー完全テスト
- 混雑表示更新テスト

### **統合テスト**
- Google Maps API連携テスト
- 複数施設同時予約テスト
- リアルタイム更新テスト

### **パフォーマンステスト**
- 地図読み込み速度テスト
- 大量データ表示テスト
- 同時予約処理テスト

## 💰 コスト見積もり（修正版）

### **Google Maps API 共有型コスト構造**

#### **スケールメリット活用方針**
```typescript
interface SharedApiCostStructure {
  strategy: 'shared-database-with-regional-clustering';
  
  costTiers: {
    tier1: {
      totalStores: '1-30店舗';
      monthlyApiCost: '¥1,000以下';
      perStoreCost: '¥33以下/店舗';
      features: ['基本地図', '観光スポット情報', '週1回評価更新'];
    };
    
    tier2: {
      totalStores: '31-50店舗';
      monthlyApiCost: '¥2,000';
      perStoreCost: '¥40-65/店舗';
      features: ['基本機能', 'リアルタイム評価', '詳細ルート案内'];
    };
    
    tier3: {
      totalStores: '51-100店舗';
      monthlyApiCost: '¥3,000';
      perStoreCost: '¥30-60/店舗';
      features: ['フル機能', '高頻度更新', 'プレミアム情報'];
    };
  };
}
```

#### **共有データベース設計**
```prisma
// 地域別共有観光情報
model RegionalTouristData {
  id              Int      @id @default(autoincrement())
  regionCode      String   // 地域コード（市区町村）
  spotName        String   // スポット名
  category        String   // カテゴリ
  googlePlaceId   String   // Google Place ID
  lastUpdated     DateTime // 最終更新日時
  updateFrequency String   // 更新頻度（daily, weekly, monthly）
  
  // 共有情報
  googleRating    Float?   // Google評価
  googleReviews   Int?     // レビュー数
  coordinates     Json     // 座標情報
  businessHours   Json     // 営業時間
  
  // 関連ホテル
  hotels          HotelTouristSpot[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([regionCode, googlePlaceId])
}

// ホテル固有の観光スポット設定
model HotelTouristSpot {
  id                    Int      @id @default(autoincrement())
  placeId              Int      // ホテルID
  regionalTouristDataId Int      // 共有データID
  
  // ホテル固有設定
  customName           String?  // カスタム名称
  customDescription    String?  // カスタム説明
  walkingTimeFromHotel Int?     // ホテルからの徒歩時間
  hotelRecommendation  String?  // ホテルからの推奨コメント
  displayOrder         Int      @default(0)
  isActive            Boolean  @default(true)
  
  place               Place    @relation(fields: [placeId], references: [id])
  regionalData        RegionalTouristData @relation(fields: [regionalTouristDataId], references: [id])
  
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  @@unique([placeId, regionalTouristDataId])
}
```

#### **API使用量最適化戦略**
```typescript
interface ApiOptimizationStrategy {
  // 地域クラスタリング
  regionalClustering: {
    method: 'municipality-based'; // 市区町村ベース
    shareRadius: '5km'; // 5km圏内のホテルは情報共有
    updateCoordination: 'round-robin'; // 順番に更新してコスト分散
  };
  
  // 更新頻度最適化
  updateFrequency: {
    basicInfo: 'monthly'; // 基本情報は月1回
    ratings: 'weekly'; // 評価は週1回
    businessHours: 'bi-weekly'; // 営業時間は2週間に1回
    seasonal: 'as-needed'; // 季節情報は必要時のみ
  };
  
  // キャッシュ戦略
  caching: {
    localCache: '7days'; // ローカルキャッシュ7日間
    cdnCache: '24hours'; // CDNキャッシュ24時間
    databaseCache: '1hour'; // DBキャッシュ1時間
  };
  
  // バッチ処理
  batchProcessing: {
    timeSlot: '03:00-05:00'; // 深夜帯にバッチ実行
    maxConcurrent: 5; // 同時実行数制限
    errorRetry: 3; // エラー時の再試行回数
  };
}
```

### **実装コスト構造**

#### **開発・運用コスト**
```typescript
interface TotalCostStructure {
  development: {
    initialDevelopment: '10-12週間';
    regionalDataSetup: '2-3週間';
    testing: '2週間';
  };
  
  monthlyOperatingCost: {
    apiCosts: {
      tier1: '¥1,000以下（30店舗まで）';
      tier2: '¥2,000（50店舗まで）';
      tier3: '¥3,000（100店舗まで）';
    };
    
    infrastructure: '¥3,000-5,000/月'; // サーバー・DB・CDN
    maintenance: '¥10,000-15,000/月'; // 保守・監視
    
    totalPerStore: {
      tier1: '¥500-650/店舗/月';
      tier2: '¥320-450/店舗/月';
      tier3: '¥180-280/店舗/月';
    };
  };
}
```

#### **収益性分析**
```typescript
interface ProfitabilityAnalysis {
  impact: {
    leisureStarter: {
      monthlyRevenue: 19800;
      additionalCost: 500; // 最大想定
      impactPercentage: 2.5; // 2.5%以下
      acceptable: true;
    };
    
    leisureProfessional: {
      monthlyRevenue: 49800;
      additionalCost: 400; // スケールメリット
      impactPercentage: 0.8; // 0.8%以下
      acceptable: true;
    };
    
    leisureEnterprise: {
      monthlyRevenue: 99800;
      additionalCost: 300; // 更なるスケールメリット
      impactPercentage: 0.3; // 0.3%以下
      acceptable: true;
    };
  };
  
  customerValue: {
    additionalFeatureValue: '¥5,000-10,000/月相当';
    competitiveAdvantage: 'high';
    customerSatisfactionImpact: '+15-25%';
    retentionImprovement: '+10-20%';
  };
}
```

### **段階的実装プラン**

#### **Phase 1: 基盤構築（無料機能）**
```
期間: 4-5週間
コスト: ¥0/月（開発コストのみ）

機能:
✅ Google Maps Embed API（無料）
✅ 基本的な地図表示
✅ ホテル独自観光情報登録
✅ 静的情報表示
✅ カテゴリ分類
```

#### **Phase 2: 共有データベース構築**
```
期間: 3-4週間
コスト: ¥1,000-3,000/月（全体）

機能:
✅ 地域別共有データベース
✅ Google Places API連携
✅ 週1回の自動更新
✅ 評価・レビュー表示
✅ 基本的なルート案内
```

#### **Phase 3: 高度機能追加**
```
期間: 2-3週間
コスト: 同上（スケールメリット内）

機能:
✅ リアルタイム混雑情報
✅ 詳細ルート案内
✅ 季節・イベント情報
✅ 多言語対応強化
✅ パーソナライズ機能
```

### **ROI分析（修正版）**

#### **顧客価値向上効果**
```
機能追加による価値:
- 観光案内機能: ¥5,000-8,000/月相当
- 施設予約機能: ¥3,000-5,000/月相当
- 混雑予想機能: ¥2,000-3,000/月相当

合計付加価値: ¥10,000-16,000/月
実際コスト: ¥300-650/月
ROI: 1,500-5,300%
```

この構造であれば、スケールメリットを最大限活用しながら、魅力的な機能を低コストで提供できます！

---

**作成日**: 2025年7月8日  
**バージョン**: 1.0  
**更新**: 初版作成 