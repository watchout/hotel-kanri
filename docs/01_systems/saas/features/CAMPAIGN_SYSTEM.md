# キャンペーンシステム 要件定義書

## 📋 概要

### **プロジェクト名**
Hotel SaaS キャンペーン機能

### **目的**
期間限定・条件付きの商品割引キャンペーンにより、売上向上と顧客満足度向上を実現する。

### **スコープ**
- 商品別キャンペーン設定
- 期間・時間帯・曜日指定
- 割引率・割引額の設定
- 客室UI側での動的価格表示

## 🎯 ビジネス要件

### **解決したい課題**
1. **売上の時間帯格差**: ピーク時以外の注文数不足
2. **在庫商品の消化**: 期限が近い商品の効率的な販売
3. **マーケティング施策の実行**: 柔軟なプロモーション展開
4. **競合差別化**: 動的価格戦略による競争力向上

### **達成目標**
1. **売上平準化**: 非ピーク時間帯の注文増加
2. **在庫効率化**: 食材ロス削減
3. **顧客満足度向上**: お得感の提供
4. **運営効率化**: 自動価格調整による業務軽減

## 📊 機能要件

### **フェーズ1: 基本キャンペーン機能**

#### **F001: キャンペーンマスタ管理**
**概要**: キャンペーンの基本情報を管理

**データベース設計**:
```prisma
model Campaign {
  id          Int       @id @default(autoincrement())
  name        String                    // キャンペーン名
  description String?                   // 説明
  type        String                    // 'percentage' | 'fixed_amount'
  value       Int                       // 割引値（%の場合は整数、金額の場合は円）
  startDate   DateTime                  // 開始日時
  endDate     DateTime                  // 終了日時
  isActive    Boolean   @default(true)  // 有効フラグ

  // 時間帯・曜日制限
  timeRestrictions Json?               // 時間帯制限データ
  dayRestrictions  Json?               // 曜日制限データ

  // 条件設定
  minOrderAmount   Int?                // 最小注文金額
  maxUsageCount    Int?                // 最大使用回数
  currentUsageCount Int @default(0)   // 現在の使用回数

  // 管理情報
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  createdBy   String?                  // 作成者
  isDeleted   Boolean   @default(false)

  // リレーション
  items       CampaignItem[]           // 対象商品
  usageLogs   CampaignUsageLog[]       // 使用履歴

  @@index([isActive, startDate, endDate])
  @@index([isDeleted])
}

// キャンペーン対象商品
model CampaignItem {
  id         Int      @id @default(autoincrement())
  campaignId Int
  menuItemId Int

  // リレーション
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  menuItem   MenuItem @relation(fields: [menuItemId], references: [id])

  @@unique([campaignId, menuItemId])
  @@index([campaignId])
  @@index([menuItemId])
}

// キャンペーン使用履歴
model CampaignUsageLog {
  id         Int      @id @default(autoincrement())
  campaignId Int
  orderId    Int
  menuItemId Int
  roomId     String

  originalPrice    Int              // 元価格
  discountAmount   Int              // 割引額
  finalPrice       Int              // 最終価格

  createdAt  DateTime @default(now())

  // リレーション
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  order      Order    @relation(fields: [orderId], references: [id])
  menuItem   MenuItem @relation(fields: [menuItemId], references: [id])

  @@index([campaignId])
  @@index([orderId])
  @@index([createdAt])
}

// MenuItemモデルへの追加
model MenuItem {
  // 既存フィールド...

  // キャンペーン関連
  campaignItems CampaignItem[]
  usageLogs     CampaignUsageLog[]
}
```

**受入条件**:
- [ ] 複数キャンペーンの同時管理
- [ ] 期間・時間帯・曜日制限の正確な適用
- [ ] 使用回数制限の実装
- [ ] 論理削除による履歴保持

#### **F002: 時間帯・曜日制限機能**
**概要**: キャンペーンの適用時間を詳細に制御

**時間制限データ構造**:
```typescript
interface TimeRestrictions {
  // 時間帯制限（24時間形式）
  timeSlots: Array<{
    startTime: string;  // "07:00"
    endTime: string;    // "09:00"
  }>;

  // 曜日制限（0=日曜, 1=月曜, ..., 6=土曜）
  allowedDays: number[];  // [1, 2, 3, 4] = 月-木

  // 特定日除外
  excludeDates?: string[];  // ["2024-12-25", "2024-01-01"]
}
```

**適用ロジック**:
```typescript
function isCampaignActive(campaign: Campaign, currentTime: Date): boolean {
  // 基本期間チェック
  if (currentTime < campaign.startDate || currentTime > campaign.endDate) {
    return false;
  }

  // 時間帯チェック
  if (campaign.timeRestrictions) {
    const restrictions = JSON.parse(campaign.timeRestrictions) as TimeRestrictions;

    // 曜日チェック
    const dayOfWeek = currentTime.getDay();
    if (restrictions.allowedDays && !restrictions.allowedDays.includes(dayOfWeek)) {
      return false;
    }

    // 時間帯チェック
    const currentTimeStr = currentTime.toTimeString().slice(0, 5); // "HH:MM"
    const isInTimeSlot = restrictions.timeSlots.some(slot => {
      return currentTimeStr >= slot.startTime && currentTimeStr <= slot.endTime;
    });

    if (restrictions.timeSlots.length > 0 && !isInTimeSlot) {
      return false;
    }

    // 除外日チェック
    const currentDateStr = currentTime.toISOString().slice(0, 10);
    if (restrictions.excludeDates?.includes(currentDateStr)) {
      return false;
    }
  }

  // 使用回数チェック
  if (campaign.maxUsageCount && campaign.currentUsageCount >= campaign.maxUsageCount) {
    return false;
  }

  return campaign.isActive && !campaign.isDeleted;
}
```

**受入条件**:
- [ ] 複数時間帯の設定可能
- [ ] 曜日の柔軟な組み合わせ
- [ ] 特定日の除外機能
- [ ] リアルタイムでの適用判定

#### **F003: 管理画面でのキャンペーン作成・編集**
**概要**: 直感的なキャンペーン管理インターフェース

**UI仕様**:
```vue
<template>
  <div class="campaign-form">
    <!-- 基本情報 -->
    <div class="section">
      <h3>基本情報</h3>
      <div class="form-group">
        <label>キャンペーン名</label>
        <input v-model="form.name" placeholder="朝食タイムセール" />
      </div>

      <div class="form-group">
        <label>説明</label>
        <textarea v-model="form.description" placeholder="朝の時間限定でお得な価格！"></textarea>
      </div>
    </div>

    <!-- 割引設定 -->
    <div class="section">
      <h3>割引設定</h3>
      <div class="form-group">
        <label>割引タイプ</label>
        <select v-model="form.type">
          <option value="percentage">割引率 (%)</option>
          <option value="fixed_amount">割引額 (円)</option>
        </select>
      </div>

      <div class="form-group">
        <label>
          {{ form.type === 'percentage' ? '割引率' : '割引額' }}
        </label>
        <input
          v-model="form.value"
          type="number"
          :placeholder="form.type === 'percentage' ? '20' : '100'"
        />
        <span class="unit">
          {{ form.type === 'percentage' ? '%' : '円' }}
        </span>
      </div>
    </div>

    <!-- 期間設定 -->
    <div class="section">
      <h3>適用期間</h3>
      <div class="form-row">
        <div class="form-group">
          <label>開始日時</label>
          <input v-model="form.startDate" type="datetime-local" />
        </div>
        <div class="form-group">
          <label>終了日時</label>
          <input v-model="form.endDate" type="datetime-local" />
        </div>
      </div>
    </div>

    <!-- 時間帯制限 -->
    <div class="section">
      <h3>時間帯制限</h3>
      <div class="time-restrictions">
        <div v-for="(slot, index) in form.timeSlots" :key="index" class="time-slot">
          <input v-model="slot.startTime" type="time" />
          <span>〜</span>
          <input v-model="slot.endTime" type="time" />
          <button @click="removeTimeSlot(index)" class="btn-remove">削除</button>
        </div>
        <button @click="addTimeSlot" class="btn-add">時間帯追加</button>
      </div>
    </div>

    <!-- 曜日制限 -->
    <div class="section">
      <h3>曜日制限</h3>
      <div class="day-checkboxes">
        <label v-for="(day, index) in dayLabels" :key="index">
          <input
            type="checkbox"
            :value="index"
            v-model="form.allowedDays"
          />
          {{ day }}
        </label>
      </div>
    </div>

    <!-- 対象商品選択 -->
    <div class="section">
      <h3>対象商品</h3>
      <div class="product-selection">
        <!-- カテゴリ別商品選択UI -->
        <div v-for="category in categories" :key="category.id" class="category-group">
          <h4>{{ category.name_ja }}</h4>
          <div class="products">
            <label v-for="product in category.products" :key="product.id">
              <input
                type="checkbox"
                :value="product.id"
                v-model="form.selectedProducts"
              />
              <span>{{ product.name_ja }}</span>
              <span class="price">¥{{ product.price.toLocaleString() }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- 条件設定 -->
    <div class="section">
      <h3>適用条件</h3>
      <div class="form-group">
        <label>最小注文金額</label>
        <input v-model="form.minOrderAmount" type="number" placeholder="1000" />
        <span class="unit">円</span>
      </div>

      <div class="form-group">
        <label>最大使用回数</label>
        <input v-model="form.maxUsageCount" type="number" placeholder="100" />
        <span class="unit">回</span>
      </div>
    </div>

    <!-- プレビュー -->
    <div class="section">
      <h3>プレビュー</h3>
      <div class="preview">
        <div v-for="product in selectedProductsPreview" :key="product.id" class="preview-item">
          <span class="product-name">{{ product.name_ja }}</span>
          <span class="original-price">¥{{ product.price.toLocaleString() }}</span>
          <span class="arrow">→</span>
          <span class="campaign-price">¥{{ calculateCampaignPrice(product.price).toLocaleString() }}</span>
          <span class="discount">{{ calculateDiscountText() }}</span>
        </div>
      </div>
    </div>

    <!-- 保存ボタン -->
    <div class="form-actions">
      <button @click="saveCampaign" class="btn-primary">保存</button>
      <button @click="cancel" class="btn-secondary">キャンセル</button>
    </div>
  </div>
</template>

<script setup>
const form = ref({
  name: '',
  description: '',
  type: 'percentage',
  value: 0,
  startDate: '',
  endDate: '',
  timeSlots: [],
  allowedDays: [],
  selectedProducts: [],
  minOrderAmount: null,
  maxUsageCount: null
});

const dayLabels = ['日', '月', '火', '水', '木', '金', '土'];

const addTimeSlot = () => {
  form.value.timeSlots.push({ startTime: '', endTime: '' });
};

const removeTimeSlot = (index) => {
  form.value.timeSlots.splice(index, 1);
};

const calculateCampaignPrice = (originalPrice) => {
  if (form.value.type === 'percentage') {
    return Math.floor(originalPrice * (1 - form.value.value / 100));
  } else {
    return Math.max(0, originalPrice - form.value.value);
  }
};

const calculateDiscountText = () => {
  return form.value.type === 'percentage'
    ? `${form.value.value}%オフ`
    : `${form.value.value}円引き`;
};
</script>
```

**受入条件**:
- [ ] 直感的なUI/UX
- [ ] リアルタイムプレビュー
- [ ] バリデーション機能
- [ ] 一括商品選択機能

### **フェーズ2: 客室UI統合**

#### **F004: 動的価格表示機能**
**概要**: 客室UI側でキャンペーン価格をリアルタイム表示

**商品カード表示**:
```vue
<template>
  <div class="menu-item-card" :class="{ 'has-campaign': activeCampaign }">
    <!-- 商品基本情報 -->
    <div class="product-info">
      <h3>{{ item.name_ja }}</h3>
      <p>{{ item.description_ja }}</p>
    </div>

    <!-- 価格表示 -->
    <div class="price-section">
      <div v-if="activeCampaign" class="campaign-pricing">
        <!-- キャンペーンバッジ -->
        <div class="campaign-badge">
          <span class="badge-text">{{ campaignBadgeText }}</span>
        </div>

        <!-- 価格表示 -->
        <div class="price-display">
          <span class="original-price">¥{{ item.price.toLocaleString() }}</span>
          <span class="campaign-price">¥{{ campaignPrice.toLocaleString() }}</span>
        </div>

        <!-- 割引表示 -->
        <div class="discount-info">
          {{ discountText }}
        </div>

        <!-- 期間表示 -->
        <div class="campaign-period">
          {{ campaignPeriodText }}
        </div>
      </div>

      <div v-else class="normal-pricing">
        <span class="price">¥{{ item.price.toLocaleString() }}</span>
      </div>
    </div>

    <!-- 注文ボタン -->
    <button @click="addToCart" class="add-to-cart-btn">
      カートに追加
    </button>
  </div>
</template>

<script setup>
const props = defineProps(['item']);

// キャンペーン情報を取得
const { activeCampaign, campaignPrice, discountText } = await $fetch('/api/v1/campaigns/check', {
  params: { menuItemId: props.item.id }
});

const campaignBadgeText = computed(() => {
  if (!activeCampaign.value) return '';

  // 時間帯キャンペーンの場合
  if (activeCampaign.value.timeRestrictions) {
    return '期間限定';
  }

  return 'キャンペーン';
});

const campaignPeriodText = computed(() => {
  if (!activeCampaign.value) return '';

  const restrictions = activeCampaign.value.timeRestrictions;
  if (restrictions?.timeSlots?.length > 0) {
    const slot = restrictions.timeSlots[0];
    return `${slot.startTime}-${slot.endTime}限定`;
  }

  return `${formatDate(activeCampaign.value.endDate)}まで`;
});
</script>

<style scoped>
.has-campaign {
  border: 2px solid #ff6b6b;
  box-shadow: 0 4px 8px rgba(255, 107, 107, 0.2);
}

.campaign-badge {
  background: linear-gradient(45deg, #ff6b6b, #ff8e8e);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.original-price {
  text-decoration: line-through;
  color: #999;
  margin-right: 8px;
}

.campaign-price {
  color: #ff6b6b;
  font-weight: bold;
  font-size: 1.2em;
}

.discount-info {
  background: #ff6b6b;
  color: white;
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 11px;
  margin-top: 4px;
}

.campaign-period {
  color: #666;
  font-size: 11px;
  margin-top: 2px;
}
</style>
```

**受入条件**:
- [ ] リアルタイム価格更新
- [ ] 魅力的なキャンペーン表示
- [ ] 期間情報の明確な表示
- [ ] モバイル対応レスポンシブ

#### **F005: キャンペーン適用ロジック**
**概要**: 注文時のキャンペーン価格自動適用

**API実装**:
```typescript
// GET /api/v1/campaigns/check
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const menuItemId = parseInt(query.menuItemId as string);
  const currentTime = new Date();

  // 該当商品のアクティブなキャンペーンを取得
  const activeCampaigns = await prisma.campaign.findMany({
    where: {
      isActive: true,
      isDeleted: false,
      startDate: { lte: currentTime },
      endDate: { gte: currentTime },
      items: {
        some: { menuItemId }
      }
    },
    include: {
      items: true
    }
  });

  // 適用可能なキャンペーンを時間制限でフィルタ
  const applicableCampaigns = activeCampaigns.filter(campaign =>
    isCampaignActive(campaign, currentTime)
  );

  if (applicableCampaigns.length === 0) {
    return { activeCampaign: null, campaignPrice: null, discountText: null };
  }

  // 最も割引率の高いキャンペーンを選択
  const bestCampaign = applicableCampaigns.reduce((best, current) => {
    const bestDiscount = calculateDiscount(best, menuItem.price);
    const currentDiscount = calculateDiscount(current, menuItem.price);
    return currentDiscount > bestDiscount ? current : best;
  });

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId }
  });

  const campaignPrice = calculateCampaignPrice(bestCampaign, menuItem.price);
  const discountText = generateDiscountText(bestCampaign);

  return {
    activeCampaign: bestCampaign,
    campaignPrice,
    discountText
  };
});

// 注文時の価格適用
// POST /api/v1/orders
export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  // 各商品にキャンペーンを適用
  const processedItems = await Promise.all(
    body.items.map(async (item) => {
      const campaignInfo = await checkActiveCampaign(item.id);

      if (campaignInfo.activeCampaign) {
        // キャンペーン価格を適用
        item.originalPrice = item.price;
        item.price = campaignInfo.campaignPrice;
        item.campaignId = campaignInfo.activeCampaign.id;
        item.discountAmount = item.originalPrice - item.price;

        // 使用履歴を記録
        await prisma.campaignUsageLog.create({
          data: {
            campaignId: campaignInfo.activeCampaign.id,
            menuItemId: item.id,
            roomId: session.user.roomNumber,
            originalPrice: item.originalPrice,
            discountAmount: item.discountAmount,
            finalPrice: item.price
          }
        });

        // 使用回数を更新
        await prisma.campaign.update({
          where: { id: campaignInfo.activeCampaign.id },
          data: { currentUsageCount: { increment: item.quantity } }
        });
      }

      return item;
    })
  );

  // 注文を作成
  const order = await prisma.order.create({
    data: {
      roomId: session.user.roomNumber,
      items: JSON.stringify(processedItems),
      total: processedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      status: 'received'
    }
  });

  return { success: true, order };
});
```

**受入条件**:
- [ ] 複数キャンペーンの優先度制御
- [ ] 正確な割引計算
- [ ] 使用履歴の記録
- [ ] 使用回数制限の管理

## 🔧 技術仕様

### **API エンドポイント**

```typescript
// キャンペーン管理API (hotel-common側で実装済み)
GET    /api/v1/admin/campaigns                    // キャンペーン一覧
POST   /api/v1/admin/campaigns                    // キャンペーン作成
GET    /api/v1/admin/campaigns/:id                // キャンペーン詳細
PUT    /api/v1/admin/campaigns/:id                // キャンペーン更新
DELETE /api/v1/admin/campaigns/:id                // キャンペーン削除

// 統計・分析API (hotel-common側で実装済み)
GET    /api/v1/admin/campaigns/:id/analytics      // キャンペーン効果分析
GET    /api/v1/admin/campaigns/analytics/summary  // 全キャンペーン統計

// 客室側API (hotel-common側で実装済み)
GET    /api/v1/campaigns/check                    // キャンペーン適用確認
GET    /api/v1/campaigns/active                   // アクティブキャンペーン一覧
GET    /api/v1/campaigns/by-category/:categoryCode // カテゴリー別キャンペーン取得

// ウェルカムスクリーンAPI (hotel-common側で実装済み)
GET    /api/v1/welcome-screen/config              // ウェルカムスクリーン設定取得
GET    /api/v1/welcome-screen/should-show         // ウェルカムスクリーン表示判定
POST   /api/v1/welcome-screen/mark-completed      // ウェルカムスクリーン完了マーク
```

### **データベースマイグレーション**

```sql
-- キャンペーンテーブル作成
CREATE TABLE Campaign (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    value INTEGER NOT NULL,
    startDate DATETIME NOT NULL,
    endDate DATETIME NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT 1,
    timeRestrictions TEXT,
    dayRestrictions TEXT,
    minOrderAmount INTEGER,
    maxUsageCount INTEGER,
    currentUsageCount INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT,
    isDeleted BOOLEAN NOT NULL DEFAULT 0
);

-- キャンペーン商品テーブル
CREATE TABLE CampaignItem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaignId INTEGER NOT NULL,
    menuItemId INTEGER NOT NULL,
    FOREIGN KEY (campaignId) REFERENCES Campaign(id),
    FOREIGN KEY (menuItemId) REFERENCES MenuItem(id),
    UNIQUE(campaignId, menuItemId)
);

-- キャンペーン使用履歴テーブル
CREATE TABLE CampaignUsageLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaignId INTEGER NOT NULL,
    orderId INTEGER NOT NULL,
    menuItemId INTEGER NOT NULL,
    roomId TEXT NOT NULL,
    originalPrice INTEGER NOT NULL,
    discountAmount INTEGER NOT NULL,
    finalPrice INTEGER NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaignId) REFERENCES Campaign(id),
    FOREIGN KEY (orderId) REFERENCES Order(id),
    FOREIGN KEY (menuItemId) REFERENCES MenuItem(id)
);

-- インデックス作成
CREATE INDEX idx_campaign_active ON Campaign(isActive, startDate, endDate);
CREATE INDEX idx_campaign_deleted ON Campaign(isDeleted);
CREATE INDEX idx_campaign_item_campaign ON CampaignItem(campaignId);
CREATE INDEX idx_campaign_item_menu ON CampaignItem(menuItemId);
CREATE INDEX idx_campaign_usage_campaign ON CampaignUsageLog(campaignId);
CREATE INDEX idx_campaign_usage_created ON CampaignUsageLog(createdAt);
```

## 📈 実装フェーズ

### **Phase 1: 基盤構築 (確認中)**
- [?] データベーステーブル作成 - hotel-common側で実装済みと報告あるが、hotel-saasのスキーマには未反映
- [x] 基本API実装 - hotel-common側で実装済み
- [ ] キャンペーン管理画面 - hotel-saas側で実装予定

### **Phase 2: 適用ロジック (進行中)**
- [x] 時間制限ロジック実装 - hotel-common側で実装済み
- [ ] 客室UI価格表示修正 - hotel-saas側で実装予定
- [ ] 注文時適用処理 - hotel-saas側で実装予定

### **Phase 3: 分析・最適化 (未着手)**
- [ ] キャンペーン効果分析
- [ ] パフォーマンス最適化
- [ ] UI/UX改善

## 🧪 テスト戦略

### **重要テストケース**
- [ ] 時間帯制限の境界値テスト
- [ ] 複数キャンペーンの優先度テスト
- [ ] 使用回数制限のテスト
- [ ] 価格計算の正確性テスト

## 📊 成功指標

### **ビジネス指標**
- [ ] 非ピーク時間帯注文数 > 30%増加
- [ ] キャンペーン対象商品売上 > 50%増加
- [ ] 平均客単価の維持または向上
- [ ] 顧客満足度の向上

---

## 📞 関連ドキュメント

- [商品原価・利益分析機能要件定義書](./COST_PROFIT_ANALYSIS.md)
- [フロント業務機能要件定義書](./FRONT_DESK_OPERATIONS.md)
- [実装ロードマップ](./IMPLEMENTATION_ROADMAP.md)
- [キャンペーンAPI仕様書](../api/campaigns-api.md)
- [キャンペーンAPI統合ガイド](../api/campaigns-integration-guide.md)
- [キャンペーンAPI動作確認ガイド](../api/campaigns-verification-guide.md)

**更新履歴**
- 2024/XX/XX: 初版作成
- 2025/01/XX: hotel-common側API実装完了情報を追加
