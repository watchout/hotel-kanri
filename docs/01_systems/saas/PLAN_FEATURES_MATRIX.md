# 📋 プラン別機能制限マトリックス

## 概要
各プランで利用可能な機能を明確に定義し、実装時の判断基準とする。

---

## 🏢 OmotenasuAI プラン

### Economy (¥29,800/月 - 30室まで)
| 機能カテゴリ | 機能名 | 利用可否 | 制限内容 |
|-------------|-------|---------|----------|
| **基本機能** | 客室オーダーシステム | ✅ | フル機能 |
| | キッチン管理 | ✅ | フル機能 |
| | フロント管理 | ✅ | 基本機能のみ |
| | 会計・レシート | ✅ | フル機能 |
| **AI機能** | AIコンシェルジュ | ✅ | 月100回まで |
| | AI音声応答 | ❌ | Professional以上 |
| | 多言語対応 | ✅ | 3言語（日英中） |
| **TV機能** | 基本TV画面 | ✅ | フル機能 |
| | アプリランチャー | ✅ | 基本アプリのみ |
| | 観光案内 | ✅ | 基本情報のみ |
| **管理機能** | 基本分析レポート | ✅ | 月次のみ |
| | 高度分析 | ❌ | Professional以上 |
| | API連携 | ❌ | Professional以上 |
| | カスタマイズ | ❌ | Professional以上 |

### Professional (¥79,800/月 - 80室まで)
| 機能カテゴリ | 機能名 | 利用可否 | 制限内容 |
|-------------|-------|---------|----------|
| **基本機能** | 全Economy機能 | ✅ | フル機能 |
| **AI機能** | AIコンシェルジュ | ✅ | 月500回まで |
| | AI音声応答 | ✅ | 月200回まで |
| | 多言語対応 | ✅ | 10言語 |
| | AI分析・最適化 | ✅ | フル機能 |
| **TV機能** | プレミアムアプリ | ✅ | Netflix, YouTube等 |
| | 高度観光案内 | ✅ | リアルタイム情報 |
| | 館内施設予約 | ✅ | フル機能 |
| **管理機能** | 高度分析レポート | ✅ | リアルタイム |
| | PMS連携 | ✅ | 基本連携 |
| | 外部API連携 | ✅ | 月1000回まで |
| | 基本カスタマイズ | ✅ | テーマ・ロゴ変更 |

### Enterprise (¥139,800/月 - 200室まで)
| 機能カテゴリ | 機能名 | 利用可否 | 制限内容 |
|-------------|-------|---------|----------|
| **基本機能** | 全Professional機能 | ✅ | フル機能 |
| **AI機能** | AIコンシェルジュ | ✅ | 無制限 |
| | AI音声応答 | ✅ | 無制限 |
| | 多言語対応 | ✅ | 15言語 |
| | カスタムAIモデル | ✅ | フル機能 |
| **管理機能** | 完全カスタマイズ | ✅ | フル機能 |
| | 高度PMS連携 | ✅ | 双方向同期 |
| | 無制限API | ✅ | 無制限 |
| | 専任サポート | ✅ | 24時間対応 |
| | SLA保証 | ✅ | 99.9% |

---

## 🏨 LEISURE プラン

### Economy (¥19,800/月 - 20室まで)
| 機能カテゴリ | 機能名 | 利用可否 | 制限内容 |
|-------------|-------|---------|----------|
| **基本機能** | 客室オーダーシステム | ✅ | フル機能 |
| | レジャー特化UI | ✅ | カップル向けデザイン |
| | プライベート配慮 | ✅ | 非対面サービス |
| **AI機能** | AIコンシェルジュ | ✅ | 月50回まで |
| | 多言語対応 | ✅ | 2言語（日英） |
| **特化機能** | デートスポット案内 | ✅ | 基本情報 |
| | 記念日サービス | ✅ | 基本機能 |
| | SNS連携 | ❌ | Professional以上 |

### Professional (¥49,800/月 - 50室まで)
| 機能カテゴリ | 機能名 | 利用可否 | 制限内容 |
|-------------|-------|---------|----------|
| **基本機能** | 全Economy機能 | ✅ | フル機能 |
| **AI機能** | AIコンシェルジュ | ✅ | 月300回まで |
| | 多言語対応 | ✅ | 5言語 |
| **特化機能** | SNS連携 | ✅ | Instagram, TikTok |
| | 高度デート提案 | ✅ | AI分析による |
| | VIP顧客管理 | ✅ | フル機能 |

### Enterprise (¥99,800/月 - 100室まで)
| 機能カテゴリ | 機能名 | 利用可否 | 制限内容 |
|-------------|-------|---------|----------|
| **基本機能** | 全Professional機能 | ✅ | フル機能 |
| **特化機能** | 完全カスタマイズ | ✅ | ブランド特化 |
| | 高度分析 | ✅ | 顧客行動分析 |
| | 専任サポート | ✅ | レジャー特化 |

---

## 🛠️ 実装における機能制御

### コード例
```typescript
// composables/usePlanRestrictions.ts
export const usePlanRestrictions = () => {
  const tenant = useTenant()
  
  const checkFeature = (feature: string): boolean => {
    const plan = `${tenant.value?.planCategory}-${tenant.value?.planType}`
    
    const features = {
      'omotenasuai-economy': [
        'basic_order', 'kitchen_management', 'basic_ai', 'basic_tv'
      ],
      'omotenasuai-professional': [
        'basic_order', 'kitchen_management', 'basic_ai', 'basic_tv',
        'ai_voice', 'advanced_analytics', 'pms_integration', 'api_access'
      ],
      'omotenasuai-enterprise': [
        'basic_order', 'kitchen_management', 'basic_ai', 'basic_tv',
        'ai_voice', 'advanced_analytics', 'pms_integration', 'api_access',
        'custom_ai', 'unlimited_api', 'sla_guarantee'
      ],
      'leisure-economy': [
        'basic_order', 'leisure_ui', 'private_service', 'basic_ai'
      ],
      'leisure-professional': [
        'basic_order', 'leisure_ui', 'private_service', 'basic_ai',
        'sns_integration', 'vip_management', 'advanced_dating'
      ],
      'leisure-enterprise': [
        'basic_order', 'leisure_ui', 'private_service', 'basic_ai',
        'sns_integration', 'vip_management', 'advanced_dating',
        'full_customization', 'behavior_analytics'
      ]
    }
    
    return features[plan]?.includes(feature) || false
  }
  
  const getAiLimit = (): number => {
    const plan = `${tenant.value?.planCategory}-${tenant.value?.planType}`
    const limits = {
      'omotenasuai-economy': 100,
      'omotenasuai-professional': 500,
      'omotenasuai-enterprise': -1, // 無制限
      'leisure-economy': 50,
      'leisure-professional': 300,
      'leisure-enterprise': -1
    }
    return limits[plan] || 0
  }
  
  return { checkFeature, getAiLimit }
}
```

---

## 💰 代理店経由の支払い構造

### **代理店が支払う形で問題ありません！**

#### 支払いフロー
1. **代理店 → 当社**: 月額料金全額支払い
2. **当社 → 代理店**: マージン分を翌月支払い
3. **顧客**: 代理店に支払い（代理店の裁量）

#### メリット
- **当社**: 確実な売上確保、代理店との信頼関係
- **代理店**: 顧客との直接関係、価格設定の自由度
- **顧客**: 代理店からのサポート、価格交渉可能

#### 実装例
```typescript
// 請求処理
const billingFlow = {
  // 1. 代理店から当社への請求
  agentToBilling: {
    amount: tenant.monthlyPrice, // 全額
    dueDate: '毎月1日',
    paymentMethod: '銀行振込/クレカ'
  },
  
  // 2. 当社から代理店への支払い
  commissionPayment: {
    amount: tenant.monthlyPrice * tenant.agentCommissionRate,
    paymentDate: '毎月15日',
    paymentMethod: '銀行振込'
  }
}
```

---

## 🚀 最短実装の次ステップ

### 今週中に完了
1. **プラン制限システム**: 機能チェック実装
2. **代理店管理画面**: 基本CRUD
3. **テナント登録**: 代理店経由対応
4. **請求システム**: 基本設計

### 来週完了
1. **既存店舗の移行**: テナント化
2. **代理店ポータル**: ダッシュボード
3. **支払いフロー**: 自動化

これで**導入を待っている店舗**への最短対応が可能になります！ 