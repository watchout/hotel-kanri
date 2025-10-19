# キャンペーン機能統合ガイド

## 概要

このドキュメントは、キャンペーン管理機能をhotel-saasシステムに統合するためのガイドです。hotel-common側で実装されたAPIを活用して、hotel-saas側でキャンペーン機能を実装する方法を説明します。

## 前提条件

- hotel-commonサーバーが稼働していること
- 統合APIサーバーが拡張版（`integration-server-extended.ts`）を使用していること
- JWT認証が正しく設定されていること

## 統合手順

### 1. API接続設定

hotel-saas側でhotel-common APIに接続するための設定を行います。

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
    const token = localStorage.getItem('auth_token');
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

hotel-saas側でキャンペーンAPIを呼び出すサービスを実装します。

```typescript
// src/services/campaign-service.ts
import hotelCommonClient from '../api/hotel-common-client';

export class CampaignService {
  // アクティブなキャンペーン一覧を取得
  async getActiveCampaigns(lang = 'ja') {
    const response = await hotelCommonClient.get('/campaigns/active', {
      params: { lang }
    });
    return response.data.data;
  }

  // カテゴリー別キャンペーン取得
  async getCampaignsByCategory(categoryCode: string, lang = 'ja') {
    const response = await hotelCommonClient.get(`/campaigns/by-category/${categoryCode}`, {
      params: { lang }
    });
    return response.data.data;
  }

  // キャンペーン適用チェック
  async checkCampaignApplicability(params: {
    productId?: string;
    categoryCode?: string;
    orderAmount: number;
  }) {
    const response = await hotelCommonClient.get('/campaigns/check', {
      params
    });
    return response.data.data;
  }

  // ウェルカムスクリーン設定取得
  async getWelcomeScreenConfig(lang = 'ja') {
    const response = await hotelCommonClient.get('/welcome-screen/config', {
      params: { lang }
    });
    return response.data.data;
  }

  // ウェルカムスクリーン表示判定
  async shouldShowWelcomeScreen(deviceId: string) {
    const response = await hotelCommonClient.get('/welcome-screen/should-show', {
      params: { deviceId }
    });
    return response.data.data.shouldShow;
  }

  // ウェルカムスクリーン完了マーク
  async markWelcomeScreenCompleted(deviceId: string) {
    const response = await hotelCommonClient.post('/welcome-screen/mark-completed', {
      deviceId
    });
    return response.data.data;
  }
}

export default new CampaignService();
```

### 3. 管理者向けキャンペーン管理インターフェースの実装

hotel-saas側で管理者向けのキャンペーン管理画面を実装します。

```typescript
// src/services/admin-campaign-service.ts
import hotelCommonClient from '../api/hotel-common-client';
import { CampaignCreateInput, CampaignUpdateInput } from '../types/campaign';

export class AdminCampaignService {
  // キャンペーン一覧取得
  async getCampaigns(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    displayType?: string;
    search?: string;
  }) {
    const response = await hotelCommonClient.get('/admin/campaigns', {
      params
    });
    return response.data;
  }

  // キャンペーン詳細取得
  async getCampaignById(id: string) {
    const response = await hotelCommonClient.get(`/admin/campaigns/${id}`);
    return response.data.data;
  }

  // キャンペーン作成
  async createCampaign(data: CampaignCreateInput) {
    const response = await hotelCommonClient.post('/admin/campaigns', data);
    return response.data.data;
  }

  // キャンペーン更新
  async updateCampaign(id: string, data: CampaignUpdateInput) {
    const response = await hotelCommonClient.put(`/admin/campaigns/${id}`, data);
    return response.data.data;
  }

  // キャンペーン削除
  async deleteCampaign(id: string) {
    await hotelCommonClient.delete(`/admin/campaigns/${id}`);
    return true;
  }

  // キャンペーン分析取得
  async getCampaignAnalytics(id: string) {
    const response = await hotelCommonClient.get(`/admin/campaigns/${id}/analytics`);
    return response.data.data;
  }

  // キャンペーン分析サマリー取得
  async getCampaignAnalyticsSummary() {
    const response = await hotelCommonClient.get('/admin/campaigns/analytics/summary');
    return response.data.data;
  }

  // カテゴリー一覧取得
  async getCategories(params: { page?: number; limit?: number }) {
    const response = await hotelCommonClient.get('/admin/campaign-categories', {
      params
    });
    return response.data;
  }

  // カテゴリー作成
  async createCategory(data: { code: string; name: string; description?: string }) {
    const response = await hotelCommonClient.post('/admin/campaign-categories', data);
    return response.data.data;
  }

  // カテゴリー更新
  async updateCategory(id: string, data: { name?: string; description?: string }) {
    const response = await hotelCommonClient.put(`/admin/campaign-categories/${id}`, data);
    return response.data.data;
  }

  // カテゴリー削除
  async deleteCategory(id: string) {
    await hotelCommonClient.delete(`/admin/campaign-categories/${id}`);
    return true;
  }
}

export default new AdminCampaignService();
```

### 4. フロントエンドコンポーネントの実装例

#### ウェルカムスクリーンコンポーネント

```jsx
// src/components/WelcomeScreen.jsx
import React, { useEffect, useState } from 'react';
import campaignService from '../services/campaign-service';

const WelcomeScreen = () => {
  const [config, setConfig] = useState(null);
  const [shouldShow, setShouldShow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const deviceId = localStorage.getItem('device_id') || generateDeviceId();
    
    const loadWelcomeScreen = async () => {
      try {
        // ウェルカムスクリーン設定取得
        const configData = await campaignService.getWelcomeScreenConfig();
        setConfig(configData);
        
        // 表示判定
        if (configData.enabled) {
          const showScreen = await campaignService.shouldShowWelcomeScreen(deviceId);
          setShouldShow(showScreen);
        }
      } catch (error) {
        console.error('Failed to load welcome screen:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadWelcomeScreen();
  }, []);
  
  const handleClose = async () => {
    const deviceId = localStorage.getItem('device_id');
    if (deviceId) {
      await campaignService.markWelcomeScreenCompleted(deviceId);
    }
    setShouldShow(false);
  };
  
  // デバイスIDの生成
  const generateDeviceId = () => {
    const deviceId = 'device_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('device_id', deviceId);
    return deviceId;
  };
  
  if (isLoading || !shouldShow || !config) {
    return null;
  }
  
  return (
    <div className="welcome-screen-overlay">
      <div className="welcome-screen-content">
        <h2>{config.title}</h2>
        <p>{config.message}</p>
        
        {config.imageUrl && (
          <img src={config.imageUrl} alt="Welcome" />
        )}
        
        {config.videoUrl && (
          <video controls autoPlay>
            <source src={config.videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
        
        <button onClick={handleClose}>{config.buttonText}</button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
```

#### キャンペーンバナーコンポーネント

```jsx
// src/components/CampaignBanner.jsx
import React, { useEffect, useState } from 'react';
import campaignService from '../services/campaign-service';

const CampaignBanner = ({ categoryCode }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        let campaignData;
        
        if (categoryCode) {
          // カテゴリー別キャンペーン取得
          campaignData = await campaignService.getCampaignsByCategory(categoryCode);
        } else {
          // アクティブなキャンペーン一覧取得
          campaignData = await campaignService.getActiveCampaigns();
        }
        
        setCampaigns(campaignData.filter(campaign => campaign.displayType === 'BANNER'));
      } catch (error) {
        console.error('Failed to load campaigns:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCampaigns();
  }, [categoryCode]);
  
  if (isLoading) {
    return <div>Loading campaigns...</div>;
  }
  
  if (campaigns.length === 0) {
    return null;
  }
  
  return (
    <div className="campaign-banner-container">
      {campaigns.map(campaign => (
        <div key={campaign.id} className="campaign-banner">
          <h3>{campaign.name}</h3>
          {campaign.description && <p>{campaign.description}</p>}
          <div className="campaign-period">
            {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CampaignBanner;
```

## エラーハンドリング

APIからのエラーレスポンスを適切に処理するためのユーティリティ関数を実装します。

```typescript
// src/utils/api-error-handler.ts
import { AxiosError } from 'axios';

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export function handleApiError(error: AxiosError<ApiErrorResponse>) {
  if (error.response) {
    // APIからのエラーレスポンス
    const errorData = error.response.data;
    
    // エラーコードに応じた処理
    switch (errorData.error.code) {
      case 'VALIDATION_ERROR':
        return {
          message: 'Validation error',
          details: errorData.error.details,
          type: 'validation'
        };
      case 'NOT_FOUND':
        return {
          message: 'Resource not found',
          type: 'not_found'
        };
      case 'UNAUTHORIZED':
        // 認証エラーの場合、ログイン画面にリダイレクト
        window.location.href = '/login';
        return {
          message: 'Authentication required',
          type: 'auth'
        };
      case 'FORBIDDEN':
        return {
          message: 'Permission denied',
          type: 'permission'
        };
      default:
        return {
          message: errorData.error.message || 'An error occurred',
          type: 'server'
        };
    }
  } else if (error.request) {
    // リクエストは送信されたがレスポンスがない
    return {
      message: 'No response from server',
      type: 'network'
    };
  } else {
    // リクエスト設定中にエラーが発生
    return {
      message: error.message,
      type: 'request'
    };
  }
}
```

## パフォーマンス最適化

キャンペーンデータのキャッシュを実装して、APIリクエストを最小限に抑えます。

```typescript
// src/utils/campaign-cache.ts
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class CampaignCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5分

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // キャッシュの有効期限をチェック
    if (Date.now() - item.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

export default new CampaignCache();
```

## 注意事項

1. **認証トークン**: hotel-commonサーバーへのリクエストには有効なJWTトークンが必要です。
2. **エラーハンドリング**: APIからのエラーレスポンスを適切に処理してください。
3. **キャッシュ**: 頻繁に変更されないデータはクライアント側でキャッシュすることで、パフォーマンスを向上させることができます。
4. **言語対応**: 多言語対応が必要な場合は、APIリクエスト時に適切な言語コードを指定してください。

## トラブルシューティング

1. **認証エラー**: JWTトークンが有効であることを確認してください。
2. **接続エラー**: hotel-commonサーバーが稼働していることを確認してください。
3. **データが古い**: クライアント側のキャッシュをクリアしてみてください。
4. **パフォーマンス問題**: 不要なAPIリクエストを減らし、データをキャッシュすることで改善できます。

## 連絡先

統合に関する質問やサポートが必要な場合は、hotel-common開発チームにお問い合わせください。
