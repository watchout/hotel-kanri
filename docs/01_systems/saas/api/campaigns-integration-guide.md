# キャンペーンAPI統合ガイド

## 概要

本ドキュメントは、hotel-common側で実装されたキャンペーンAPIをhotel-saasプロジェクトに統合するためのガイドです。キャンペーン機能とウェルカムスクリーン機能の統合方法について説明します。

## 前提条件

- hotel-common APIサーバーが稼働していること
- hotel-saasプロジェクトからhotel-common APIへのネットワークアクセスが可能であること
- JWT認証トークンが適切に設定されていること

## 統合手順

### 1. APIクライアントの設定

以下のコードを使用して、hotel-common APIクライアントを設定します。

```typescript
// src/api/hotel-common-client.ts
import axios from 'axios';

const hotelCommonClient = axios.create({
  baseURL: process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400/api/v1',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// リクエストインターセプター（JWT認証トークン付与）
hotelCommonClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default hotelCommonClient;
```

### 2. キャンペーンサービスの実装

キャンペーン機能を利用するためのサービスクラスを実装します。

```typescript
// src/services/campaign-service.ts
import hotelCommonClient from '../api/hotel-common-client';

export class CampaignService {
  // アクティブなキャンペーン一覧を取得
  async getActiveCampaigns(language = 'ja') {
    try {
      const response = await hotelCommonClient.get('/campaigns/active', {
        params: { language }
      });
      return response.data.data;
    } catch (error) {
      console.error('キャンペーン取得エラー:', error);
      throw error;
    }
  }

  // カテゴリー別キャンペーン取得
  async getCampaignsByCategory(categoryCode, language = 'ja') {
    try {
      const response = await hotelCommonClient.get(`/campaigns/by-category/${categoryCode}`, {
        params: { language }
      });
      return response.data.data;
    } catch (error) {
      console.error('カテゴリー別キャンペーン取得エラー:', error);
      throw error;
    }
  }

  // キャンペーン適用チェック
  async checkCampaignApplicability(productId, categoryCode, orderAmount) {
    try {
      const response = await hotelCommonClient.get('/campaigns/check', {
        params: { productId, categoryCode, orderAmount }
      });
      return response.data.data;
    } catch (error) {
      console.error('キャンペーン適用チェックエラー:', error);
      throw error;
    }
  }
}
```

### 3. ウェルカムスクリーンサービスの実装

ウェルカムスクリーン機能を利用するためのサービスクラスを実装します。

```typescript
// src/services/welcome-screen-service.ts
import hotelCommonClient from '../api/hotel-common-client';

export class WelcomeScreenService {
  // ウェルカムスクリーン設定取得
  async getWelcomeScreenConfig(language = 'ja') {
    try {
      const response = await hotelCommonClient.get('/welcome-screen/config', {
        params: { language }
      });
      return response.data.data;
    } catch (error) {
      console.error('ウェルカムスクリーン設定取得エラー:', error);
      throw error;
    }
  }

  // ウェルカムスクリーン表示判定
  async shouldShowWelcomeScreen(deviceId) {
    try {
      const response = await hotelCommonClient.get('/welcome-screen/should-show', {
        params: { deviceId }
      });
      return response.data.data.shouldShow;
    } catch (error) {
      console.error('ウェルカムスクリーン表示判定エラー:', error);
      return false; // エラー時はデフォルトで表示しない
    }
  }

  // ウェルカムスクリーン完了マーク
  async markWelcomeScreenCompleted(deviceId) {
    try {
      await hotelCommonClient.post('/welcome-screen/mark-completed', { deviceId });
      return true;
    } catch (error) {
      console.error('ウェルカムスクリーン完了マークエラー:', error);
      throw error;
    }
  }
}
```

### 4. 管理者用キャンペーン管理サービスの実装

管理者向けのキャンペーン管理機能を利用するためのサービスクラスを実装します。

```typescript
// src/services/admin-campaign-service.ts
import hotelCommonClient from '../api/hotel-common-client';

export class AdminCampaignService {
  // キャンペーン一覧取得
  async getCampaigns(params = {}) {
    try {
      const response = await hotelCommonClient.get('/admin/campaigns', { params });
      return response.data;
    } catch (error) {
      console.error('管理者キャンペーン一覧取得エラー:', error);
      throw error;
    }
  }

  // キャンペーン詳細取得
  async getCampaignById(id) {
    try {
      const response = await hotelCommonClient.get(`/admin/campaigns/${id}`);
      return response.data.data;
    } catch (error) {
      console.error('管理者キャンペーン詳細取得エラー:', error);
      throw error;
    }
  }

  // キャンペーン作成
  async createCampaign(data) {
    try {
      const response = await hotelCommonClient.post('/admin/campaigns', data);
      return response.data.data;
    } catch (error) {
      console.error('管理者キャンペーン作成エラー:', error);
      throw error;
    }
  }

  // キャンペーン更新
  async updateCampaign(id, data) {
    try {
      const response = await hotelCommonClient.put(`/admin/campaigns/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error('管理者キャンペーン更新エラー:', error);
      throw error;
    }
  }

  // キャンペーン削除
  async deleteCampaign(id) {
    try {
      await hotelCommonClient.delete(`/admin/campaigns/${id}`);
      return true;
    } catch (error) {
      console.error('管理者キャンペーン削除エラー:', error);
      throw error;
    }
  }
}
```

## 実装例

### 1. フロントエンドでのキャンペーン表示

以下は、キャンペーン一覧を表示するVueコンポーネントの実装例です。

```vue
<template>
  <div>
    <h2>キャンペーン一覧</h2>
    <div v-if="loading">読み込み中...</div>
    <div v-else-if="error">エラーが発生しました</div>
    <div v-else>
      <div v-for="campaign in campaigns" :key="campaign.id" class="campaign-card">
        <h3>{{ campaign.name }}</h3>
        <p>{{ campaign.description }}</p>
        <p>期間: {{ formatDate(campaign.startDate) }} 〜 {{ formatDate(campaign.endDate) }}</p>
        <button @click="applyCampaign(campaign)">{{ campaign.ctaText || '適用する' }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { CampaignService } from '../services/campaign-service';

export default {
  data() {
    return {
      campaigns: [],
      loading: true,
      error: null
    };
  },
  async created() {
    const campaignService = new CampaignService();
    try {
      this.campaigns = await campaignService.getActiveCampaigns();
      this.loading = false;
    } catch (error) {
      this.error = error;
      this.loading = false;
    }
  },
  methods: {
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('ja-JP');
    },
    applyCampaign(campaign) {
      // キャンペーン適用ロジック
      console.log('キャンペーン適用:', campaign);
    }
  }
};
</script>
```

### 2. 商品カードでのキャンペーン価格表示

以下は、商品カードにキャンペーン価格を表示するVueコンポーネントの実装例です。

```vue
<template>
  <div class="menu-item-card" :class="{ 'has-campaign': campaignInfo?.activeCampaign }">
    <div class="product-info">
      <h3>{{ item.name }}</h3>
      <p>{{ item.description }}</p>
    </div>

    <div class="price-section">
      <div v-if="campaignInfo?.activeCampaign" class="campaign-pricing">
        <div class="campaign-badge">
          <span class="badge-text">{{ getCampaignBadgeText() }}</span>
        </div>

        <div class="price-display">
          <span class="original-price">¥{{ item.price.toLocaleString() }}</span>
          <span class="campaign-price">¥{{ campaignInfo.campaignPrice.toLocaleString() }}</span>
        </div>

        <div class="discount-info">
          {{ campaignInfo.discountText }}
        </div>
      </div>

      <div v-else class="normal-pricing">
        <span class="price">¥{{ item.price.toLocaleString() }}</span>
      </div>
    </div>

    <button @click="addToCart" class="add-to-cart-btn">
      カートに追加
    </button>
  </div>
</template>

<script>
import { CampaignService } from '../services/campaign-service';

export default {
  props: {
    item: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      campaignInfo: null,
      loading: true
    };
  },

  async created() {
    await this.checkCampaign();
  },

  methods: {
    async checkCampaign() {
      try {
        const campaignService = new CampaignService();
        this.campaignInfo = await campaignService.checkCampaignApplicability(
          this.item.id,
          this.item.categoryCode
        );
        this.loading = false;
      } catch (error) {
        console.error('キャンペーンチェックエラー:', error);
        this.loading = false;
      }
    },

    getCampaignBadgeText() {
      const campaign = this.campaignInfo?.activeCampaign;
      if (!campaign) return '';

      if (campaign.timeRestrictions?.timeSlots?.length > 0) {
        return '時間限定';
      }

      return 'キャンペーン';
    },

    addToCart() {
      // カートに追加するロジック
      // キャンペーン価格がある場合は、その価格を使用
      const price = this.campaignInfo?.campaignPrice || this.item.price;
      const campaignId = this.campaignInfo?.activeCampaign?.id;

      this.$emit('add-to-cart', {
        ...this.item,
        price,
        campaignId,
        originalPrice: this.item.price
      });
    }
  }
};
</script>

<style scoped>
.has-campaign {
  border: 2px solid #ff6b6b;
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
</style>
```

### 3. ウェルカムスクリーンの実装

以下は、ウェルカムスクリーンを実装するVueコンポーネントの例です。

```vue
<template>
  <div v-if="showWelcomeScreen" class="welcome-screen">
    <div class="welcome-content">
      <h1>{{ welcomeConfig.title }}</h1>
      <p>{{ welcomeConfig.description }}</p>
      <img v-if="welcomeConfig.imageUrl" :src="welcomeConfig.imageUrl" alt="Welcome" class="welcome-image">
      <button @click="closeWelcomeScreen" class="welcome-button">
        {{ welcomeConfig.buttonText }}
      </button>
    </div>
  </div>
</template>

<script>
import { WelcomeScreenService } from '../services/welcome-screen-service';
import { v4 as uuidv4 } from 'uuid';

export default {
  data() {
    return {
      showWelcomeScreen: false,
      welcomeConfig: {
        title: 'ようこそ',
        description: 'ホテルサービスへようこそ',
        buttonText: '始める',
        imageUrl: ''
      },
      deviceId: ''
    };
  },

  async created() {
    // デバイスIDを取得または生成
    this.deviceId = localStorage.getItem('device_id') || uuidv4();
    localStorage.setItem('device_id', this.deviceId);

    const welcomeScreenService = new WelcomeScreenService();

    try {
      // 設定を取得
      this.welcomeConfig = await welcomeScreenService.getWelcomeScreenConfig();

      // 表示判定
      this.showWelcomeScreen = await welcomeScreenService.shouldShowWelcomeScreen(this.deviceId);
    } catch (error) {
      console.error('ウェルカムスクリーン初期化エラー:', error);
    }
  },

  methods: {
    async closeWelcomeScreen() {
      try {
        const welcomeScreenService = new WelcomeScreenService();
        await welcomeScreenService.markWelcomeScreenCompleted(this.deviceId);
        this.showWelcomeScreen = false;
      } catch (error) {
        console.error('ウェルカムスクリーン完了マークエラー:', error);
      }
    }
  }
};
</script>

<style scoped>
.welcome-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.welcome-content {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 80%;
  text-align: center;
}

.welcome-image {
  max-width: 100%;
  margin: 1rem 0;
}

.welcome-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}
</style>
```

## 環境設定

### 1. 環境変数の設定

`.env`ファイルに以下の設定を追加します：

```
# hotel-common API接続設定
HOTEL_COMMON_API_URL=http://localhost:3400/api/v1
```

本番環境や開発環境に応じて、適切なURLを設定してください。

### 2. hotel-commonサーバーの起動

統合DBを使用するには、以下のコマンドでhotel-commonの実サーバーを起動してください：

```bash
./start-real-campaign-server.sh
```

## 注意事項

1. **認証**: すべてのAPIリクエストには有効なJWTトークンが必要です。
2. **エラーハンドリング**: APIエラーを適切に処理してください。
3. **多言語対応**: 言語パラメータを指定することで、多言語対応が可能です。
4. **キャッシュ**: パフォーマンス向上のため、頻繁に変更されないデータはクライアント側でキャッシュすることを検討してください。

## トラブルシューティング

### 1. 認証エラー

認証エラーが発生する場合は、以下を確認してください：

- JWTトークンが有効であること
- トークンの有効期限が切れていないこと
- リクエストヘッダーに正しく`Authorization: Bearer <token>`が設定されていること

### 2. API接続エラー

API接続エラーが発生する場合は、以下を確認してください：

- hotel-common APIサーバーが起動していること
- 環境変数`HOTEL_COMMON_API_URL`が正しく設定されていること
- ネットワーク接続が正常であること

### 3. データ不整合

データ不整合が発生する場合は、以下を確認してください：

- キャンペーンの開始日時と終了日時が正しく設定されていること
- 時間帯制限が正しく設定されていること
- サーバー時間（UTC）とクライアント時間の差異を考慮すること
