# MVP最短リリースプラン - 客室VOD入れ替え対応

**作成日**: 2025年7月8日  
**対象**: 実利用要望への最短対応プラン  
**目標**: 客室VOD入れ替えによるオーダーシステム導入

---

## 🎯 **MVP版 エコノミープラン仕様**

### **📋 機能範囲（最小構成）**

#### **✅ 含まれる機能**
```typescript
interface MVPEconomyPlan {
  coreFeatures: {
    // 客室オーダーシステム（既存・完成済み）
    roomServiceOrdering: '100%完成';
    kitchenManagement: '100%完成';
    frontDeskOperations: '100%完成';
    
    // TV統合UI（必須追加機能）
    tvTopInterface: 'NEW - 2週間で実装';
    appLauncher: 'NEW - 1週間で実装';
    
    // 基本管理機能（既存）
    adminDashboard: '100%完成';
    deviceManagement: '100%完成';
    orderAnalytics: '100%完成';
  };
  
  excludedFeatures: {
    // 将来リリースで追加予定
    aiConcierge: '除外（将来対応）';
    multiLanguageSupport: '除外（日本語のみ）';
    voiceInput: '除外（将来対応）';
    advancedAnalytics: '除外（基本統計のみ）';
  };
}
```

#### **❌ 除外する機能（将来追加）**
- AIコンシェルジュ機能
- 多言語対応（日本語のみ）
- 音声入力機能
- 高度な分析機能
- パーソナライゼーション

---

## 🚀 **最短実装プラン（2-3週間）**

### **Week 1: TV統合UI基盤実装**

#### **1.1 客室TV TOP画面作成**
```vue
<!-- pages/tv/index.vue - 新規作成 -->
<template>
  <div class="tv-top-screen h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- ヘッダー: ホテルロゴ + 時刻 -->
    <header class="flex justify-between items-center p-6 bg-white/80 backdrop-blur">
      <div class="flex items-center space-x-4">
        <img :src="hotelLogo" alt="ホテルロゴ" class="h-12" />
        <h1 class="text-2xl font-bold text-gray-800">{{ hotelName }}</h1>
      </div>
      <div class="text-xl font-medium text-gray-600">
        {{ currentTime }}
      </div>
    </header>

    <!-- メインコンテンツエリア -->
    <main class="flex-1 p-8">
      <div class="grid grid-cols-2 gap-8 h-full">
        <!-- 左側: ルームサービス -->
        <div class="bg-white rounded-2xl shadow-xl p-8 flex flex-col justify-center items-center">
          <Icon name="heroicons:shopping-bag" class="w-24 h-24 text-blue-600 mb-6" />
          <h2 class="text-3xl font-bold text-gray-800 mb-4">ルームサービス</h2>
          <p class="text-gray-600 text-center mb-8">お部屋でゆっくりお食事をお楽しみください</p>
          <button 
            @click="navigateToMenu"
            class="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-xl text-xl font-semibold transition-colors"
          >
            メニューを見る
          </button>
        </div>

        <!-- 右側: エンターテイメント -->
        <div class="bg-white rounded-2xl shadow-xl p-8">
          <h2 class="text-2xl font-bold text-gray-800 mb-6">エンターテイメント</h2>
          <div class="grid grid-cols-2 gap-4">
            <AppLauncherButton 
              v-for="app in entertainmentApps" 
              :key="app.id"
              :app="app"
              @launch="launchApp"
            />
          </div>
        </div>
      </div>
    </main>

    <!-- フッター: WiFi情報 -->
    <footer class="bg-white/80 backdrop-blur p-4 text-center">
      <p class="text-gray-600">WiFi: {{ wifiSSID }} | パスワード: {{ wifiPassword }}</p>
    </footer>
  </div>
</template>
```

#### **1.2 アプリランチャーコンポーネント**
```vue
<!-- components/tv/AppLauncherButton.vue - 新規作成 -->
<template>
  <button 
    @click="$emit('launch', app)"
    class="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 flex flex-col items-center transition-colors"
  >
    <img :src="app.icon" :alt="app.name" class="w-12 h-12 mb-2" />
    <span class="text-sm font-medium text-gray-800">{{ app.name }}</span>
  </button>
</template>

<script setup lang="ts">
interface App {
  id: string;
  name: string;
  icon: string;
  packageName: string;
}

defineProps<{
  app: App;
}>();

defineEmits<{
  launch: [app: App];
}>();
</script>
```

### **Week 2: アプリ統合機能実装**

#### **2.1 Google Play アプリデータベース**
```sql
-- prisma/schema.prisma に追加
model GooglePlayApp {
  id          String   @id @default(cuid())
  name        String
  packageName String   @unique
  icon        String
  category    String
  isApproved  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // ホテル別設定との関連
  hotelApps   HotelApp[]
}

model HotelApp {
  id        String   @id @default(cuid())
  hotelId   String
  appId     String
  isEnabled Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  
  app       GooglePlayApp @relation(fields: [appId], references: [id])
  
  @@unique([hotelId, appId])
}
```

#### **2.2 アプリ管理API**
```typescript
// server/api/v1/tv/apps.get.ts - 新規作成
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const hotelId = query.hotelId as string;

  // ホテルで有効化されているアプリを取得
  const hotelApps = await prisma.hotelApp.findMany({
    where: {
      hotelId,
      isEnabled: true,
    },
    include: {
      app: true,
    },
    orderBy: {
      sortOrder: 'asc',
    },
  });

  return {
    apps: hotelApps.map(ha => ({
      id: ha.app.id,
      name: ha.app.name,
      packageName: ha.app.packageName,
      icon: ha.app.icon,
      category: ha.app.category,
    })),
  };
});
```

#### **2.3 アプリ起動機能**
```typescript
// composables/useAppLauncher.ts - 新規作成
export const useAppLauncher = () => {
  const launchApp = async (app: App) => {
    try {
      // Android TV環境での アプリ起動
      if (process.client && 'Android' in window) {
        // Android WebView Interface
        (window as any).Android?.launchApp?.(app.packageName);
      } else {
        // フォールバック: Google Play Store へのリンク
        window.open(`https://play.google.com/store/apps/details?id=${app.packageName}`, '_blank');
      }
      
      // 利用統計の記録
      await $fetch('/api/v1/analytics/app-launch', {
        method: 'POST',
        body: {
          appId: app.id,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('アプリ起動エラー:', error);
    }
  };

  return {
    launchApp,
  };
};
```

### **Week 3: 統合テスト・デプロイ準備**

#### **3.1 TV画面最適化**
- 16:9 レイアウト調整
- リモコン操作対応
- フォントサイズ最適化（10フィート視聴距離）

#### **3.2 管理画面追加**
```vue
<!-- pages/admin/tv/apps.vue - 新規作成 -->
<template>
  <div class="admin-tv-apps">
    <h1 class="text-2xl font-bold mb-6">TV アプリ管理</h1>
    
    <!-- アプリ一覧 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="app in availableApps" 
        :key="app.id"
        class="bg-white rounded-lg shadow p-6"
      >
        <div class="flex items-center space-x-4 mb-4">
          <img :src="app.icon" :alt="app.name" class="w-12 h-12" />
          <div>
            <h3 class="font-semibold">{{ app.name }}</h3>
            <p class="text-sm text-gray-500">{{ app.category }}</p>
          </div>
        </div>
        
        <label class="flex items-center">
          <input 
            type="checkbox" 
            :checked="app.isEnabled"
            @change="toggleApp(app)"
            class="mr-2"
          />
          客室TVで表示する
        </label>
      </div>
    </div>
  </div>
</template>
```

---

## 📦 **MVP版 料金プラン（簡素化）**

### **🏨 BASIC プラン（MVP版エコノミー）**

```typescript
interface BasicPlan {
  name: 'BASIC（MVP版）';
  monthlyFee: '¥19,800/月';
  roomLimit: '20室まで';
  additionalRoomFee: '¥1,000/室';
  setupFee: '¥10,000/台';
  languages: ['ja', 'en']; // 日英対応
  
  includedFeatures: [
    '✅ 客室オーダーシステム',
    '✅ キッチン・配膳管理',
    '✅ フロント業務連携',
    '✅ TV統合インターフェース',
    '✅ アプリランチャー（YouTube、Netflix等）',
    '✅ 基本管理画面',
    '✅ 注文・売上統計',
    '✅ デバイス管理',
    '✅ 日英UI対応',
    '✅ 24/7サポート'
  ];
  
  excludedFeatures: [
    '❌ 15言語対応（アップグレード可能）',
    '❌ AIコンシェルジュ（将来追加予定）',
    '❌ 音声入力（将来追加予定）',
    '❌ 高度な分析（将来追加予定）'
  ];
}
```

### **🌐 MULTILINGUAL プラン（15言語対応）**

```typescript
interface MultilingualPlan {
  name: 'MULTILINGUAL（15言語対応）';
  monthlyFee: '¥22,800/月';
  roomLimit: '20室まで';
  additionalRoomFee: '¥1,000/室';
  setupFee: '¥10,000/台';
  languages: [
    'ja', 'en', 'ko', 'zh-CN', 'zh-TW',
    'th', 'vi', 'id', 'ms', 'tl',
    'es', 'fr', 'de', 'it', 'pt'
  ];
  
  includedFeatures: [
    '✅ BASIC プランの全機能',
    '✅ 15言語UI対応',
    '✅ 管理画面一括翻訳機能',
    '✅ バックグラウンド自動翻訳',
    '✅ 翻訳進捗管理',
    '✅ 翻訳費用込み（月¥150）',
    '✅ 多言語メニュー表示',
    '✅ 外国人ゲスト対応強化'
  ];
  
  translationSystem: {
    method: 'テキストベース一括翻訳';
    timing: '管理画面での登録・更新時';
    cost: '月¥150（Google Translate API）';
    languages: '15言語対応';
    realtime: false; // 音声対応は将来オプション
  };
  
  upgradeOptions: [
    '🤖 AIコンシェルジュ追加オプション（+¥10,000/月）',
    '🎤 音声対応追加オプション（+¥8,000/月）',
    '📊 高度な分析機能（+¥5,000/月）'
  ];
}
```

---

## ⚡ **技術的実装優先度**

### **🔴 最高優先度（Week 1-2）**
1. ✅ **TV TOP画面UI実装** - 既存技術で即実装可能
2. ✅ **アプリランチャー基本機能** - Google Play連携
3. ✅ **オーダーシステム統合** - 既存システム活用

### **🟡 中優先度（Week 3）**
4. ✅ **管理画面でのアプリ選択機能**
5. ✅ **利用統計・分析機能**
6. ✅ **Android TV最適化**

### **🟢 低優先度（将来リリース）**
7. 📅 **AIコンシェルジュ統合**
8. 📅 **多言語対応**
9. 📅 **音声入力機能**

---

## 🎯 **MVP版の競争優位性**

### **✅ 即座に提供可能な価値**
```
1. 客室VOD完全置き換え
   - 既存TV設備をそのまま活用
   - Google TV Streamer（¥16,000）で即座に導入可能

2. オーダーシステムの完全統合
   - 注文→調理→配膳→会計の一気通貫
   - キッチン効率化で人件費削減

3. エンターテイメント向上
   - YouTube、Netflix等への直接アクセス
   - 客室満足度の即座向上

4. 運用負荷最小化
   - 複雑なAI設定不要
   - 既存スタッフで即座に運用開始
```

### **📈 段階的アップグレード戦略**
```
Phase 1: BASIC プラン導入（2-3週間）
├── オーダーシステム + アプリランチャー
└── 基本的な客室体験向上

Phase 2: AI機能追加（+2-3ヶ月）
├── AIコンシェルジュオプション追加
└── より高度な顧客体験

Phase 3: 多言語対応（+1-2ヶ月）
├── インバウンド対応強化
└── グローバル対応完了
```

---

## 💰 **MVP版 ROI分析**

### **30室ホテルの場合**
```
【導入コスト】
基本料金: ¥19,800/月（20室まで）
追加端末: ¥1,000 × 10室 = ¥10,000/月（21-30室）
月額費用合計: ¥29,800/月

端末費用: ¥16,000 × 30台 = ¥480,000（初回のみ）
設定費用: ¥10,000 × 30台 = ¥300,000（初回のみ）

【削減効果（保守的見積もり）】
オーダー業務効率化: ¥150,000/月
配膳ミス削減: ¥50,000/月
客室満足度向上: ¥80,000/月
VOD契約費削減: ¥30,000/月

【純利益】
月間効果: ¥310,000 - ¥29,800 = ¥280,200/月
年間利益: ¥3,362,400
初期投資回収: 約2.8ヶ月
```

---

## 📋 **次回アクション（即座実行）**

### **今週開始可能**
1. ✅ **TV TOP画面プロトタイプ作成** (3日)
2. ✅ **アプリランチャー基本実装** (2日)
3. ✅ **Google Play アプリDB設計** (1日)

### **来週開始**
1. 🔄 **管理画面でのアプリ選択機能** (3日)
2. 🔄 **Android TV統合テスト** (2日)
3. 🔄 **顧客デモ環境準備** (2日)

### **最短リリース目標**
📅 **2週間後**: デモ環境完成  
📅 **3週間後**: 本番リリース準備完了  
📅 **4週間後**: 実際のホテルでの運用開始

---

**結論**: MVP版なら**既存技術で2-3週間での最短リリースが十分可能**です。実利用要望があるなら、この簡素化アプローチで迅速に価値提供を開始し、段階的に高度機能を追加していくのが最適戦略です。 