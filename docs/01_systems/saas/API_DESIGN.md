# 統計・分析機能 API設計書

## 📋 概要

### **目的**
Hotel SaaS統計・分析機能のRESTful API仕様を定義し、フロントエンドとバックエンド間のインターフェースを明確にする。

### **APIベースURL**
```
/api/v1/admin/statistics/
```

### **認証方式**
- JWT Bearer Token
- 管理者権限必須
- セッション管理

## 🔌 API エンドポイント一覧

### **実装済みAPI**

| エンドポイント | メソッド | 概要 | 実装状況 |
|-------------|--------|------|----------|
| `/kpis` | GET | KPI統計取得 | ✅ 完了 |
| `/popular-products` | GET | 人気商品ランキング | ✅ 完了 |

### **実装予定API**

| エンドポイント | メソッド | 概要 | 実装状況 |
|-------------|--------|------|----------|
| `/time-analysis` | GET | 時間帯別分析 | 🚧 予定 |
| `/room-analysis` | GET | 客室別分析 | 🚧 予定 |
| `/cross-sell-analysis` | GET | クロスセル分析 | 🚧 予定 |
| `/forecast` | GET | 予測分析 | 🚧 予定 |
| `/export/csv` | GET | CSV エクスポート | 🚧 予定 |

## 📊 API詳細仕様

### **1. KPI統計取得 API**

#### **基本情報**
```
GET /api/v1/admin/statistics/kpis
```

#### **概要**
指定期間のKPI（重要業績評価指標）データを取得する。

#### **クエリパラメータ**
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `period` | string | No | "7" | 分析期間（日数）: "7", "30", "90" |

#### **リクエスト例**
```http
GET /api/v1/admin/statistics/kpis?period=30
Authorization: Bearer <JWT_TOKEN>
```

#### **レスポンス**
```typescript
interface KpisResponse {
  totalOrders: number        // 総注文数
  totalRevenue: number       // 総売上（円）
  averageOrderValue: number  // 平均客単価（円）
  activeRooms: number        // アクティブ客室数
}
```

#### **レスポンス例**
```json
{
  "totalOrders": 245,
  "totalRevenue": 127500,
  "averageOrderValue": 520,
  "activeRooms": 18
}
```

#### **エラーレスポンス**
```typescript
interface ErrorResponse {
  statusCode: number
  statusMessage: string
  error?: string
}
```

#### **ステータスコード**
| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 400 | 不正なパラメータ |
| 401 | 認証エラー |
| 403 | 権限不足 |
| 500 | サーバーエラー |

---

### **2. 人気商品ランキング API**

#### **基本情報**
```
GET /api/v1/admin/statistics/popular-products
```

#### **概要**
指定期間の人気商品ランキングを注文数順で取得する。

#### **クエリパラメータ**
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `period` | string | No | "7" | 分析期間（日数）: "7", "30", "90" |
| `limit` | number | No | 10 | 取得件数（最大50） |
| `sortBy` | string | No | "orderCount" | ソート基準: "orderCount", "revenue" |

#### **リクエスト例**
```http
GET /api/v1/admin/statistics/popular-products?period=30&limit=5&sortBy=revenue
Authorization: Bearer <JWT_TOKEN>
```

#### **レスポンス**
```typescript
interface PopularProduct {
  id: number              // 商品ID
  name: string            // 商品名（日本語優先）
  orderCount: number      // 注文数量の合計
  revenue: number         // 売上貢献度（円）
  orderFrequency: number  // 注文頻度（注文回数）
  categoryName?: string   // カテゴリー名
  averagePrice: number    // 平均単価
}

type PopularProductsResponse = PopularProduct[]
```

#### **レスポンス例**
```json
[
  {
    "id": 1,
    "name": "コーヒー",
    "orderCount": 85,
    "revenue": 25500,
    "orderFrequency": 42,
    "categoryName": "飲み物",
    "averagePrice": 300
  },
  {
    "id": 2,
    "name": "サンドイッチセット",
    "orderCount": 34,
    "revenue": 20400,
    "orderFrequency": 28,
    "categoryName": "軽食",
    "averagePrice": 600
  }
]
```

---

### **3. 時間帯別分析 API** 🚧 実装予定

#### **基本情報**
```
GET /api/v1/admin/statistics/time-analysis
```

#### **概要**
時間帯別・曜日別の注文パターンを分析する。

#### **クエリパラメータ**
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `period` | string | No | "7" | 分析期間（日数） |
| `groupBy` | string | No | "hour" | グループ化: "hour", "dayOfWeek", "month" |
| `timezone` | string | No | "Asia/Tokyo" | タイムゾーン |

#### **レスポンス**
```typescript
interface TimeAnalysisResponse {
  timeSlots: Array<{
    period: string          // "0-1", "Monday", "2024-01" など
    orderCount: number      // 注文数
    revenue: number         // 売上
    averageOrderValue: number // 平均客単価
    popularProducts: PopularProduct[] // 人気商品トップ3
  }>
  peakHours: number[]       // ピーク時間帯
  insights: {
    trends: {
      growth: number        // 成長率（%）
      seasonality: number   // 季節性指数
    }
    recommendations: string[] // 推奨事項
  }
}
```

---

### **4. 客室別分析 API** 🚧 実装予定

#### **基本情報**
```
GET /api/v1/admin/statistics/room-analysis
```

#### **概要**
客室・プレイスタイプ別の注文傾向を分析する。

#### **クエリパラメータ**
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `period` | string | No | "7" | 分析期間（日数） |
| `placeTypeId` | number | No | - | 特定プレイスタイプのフィルタ |
| `includeInactive` | boolean | No | false | 非アクティブ客室を含むか |

#### **レスポンス**
```typescript
interface RoomAnalysisResponse {
  roomStats: Array<{
    roomId: string
    roomName: string
    placeType: string
    orderCount: number
    revenue: number
    averageOrderValue: number
    lastOrderDate: string
    utilizationRate: number  // 利用率
  }>
  placeTypeComparison: Array<{
    placeTypeId: number
    placeTypeName: string
    averageRevenue: number
    orderFrequency: number
    customerSatisfaction?: number
  }>
  insights: {
    topPerformingRooms: string[]
    underperformingRooms: string[]
    recommendations: string[]
  }
}
```

---

### **5. クロスセル分析 API** 🚧 実装予定

#### **基本情報**
```
GET /api/v1/admin/statistics/cross-sell-analysis
```

#### **概要**
商品の組み合わせ購入パターンとレコメンドを分析する。

#### **クエリパラメータ**
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `period` | string | No | "30" | 分析期間（日数） |
| `minSupport` | number | No | 0.01 | 最小支持度 |
| `minConfidence` | number | No | 0.1 | 最小信頼度 |
| `targetProductId` | number | No | - | 特定商品の関連商品分析 |

#### **レスポンス**
```typescript
interface CrossSellAnalysisResponse {
  associationRules: Array<{
    antecedent: number[]     // 条件商品ID配列
    consequent: number[]     // 結論商品ID配列
    support: number          // 支持度
    confidence: number       // 信頼度
    lift: number            // リフト値
    productNames: {
      antecedent: string[]
      consequent: string[]
    }
  }>
  recommendations: Array<{
    productId: number
    productName: string
    recommendedWith: Array<{
      productId: number
      productName: string
      probability: number
    }>
  }>
  basketAnalysis: {
    averageBasketSize: number
    topCombinations: Array<{
      products: string[]
      frequency: number
      revenue: number
    }>
  }
}
```

---

### **6. CSV エクスポート API** 🚧 実装予定

#### **基本情報**
```
GET /api/v1/admin/statistics/export/csv
```

#### **概要**
統計データをCSV形式でエクスポートする。

#### **クエリパラメータ**
| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| `type` | string | Yes | - | エクスポート種類: "kpis", "products", "rooms", "orders" |
| `period` | string | No | "30" | 分析期間（日数） |
| `format` | string | No | "csv" | 出力形式: "csv", "xlsx" |

#### **レスポンス**
```typescript
// Content-Type: text/csv または application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
// Content-Disposition: attachment; filename="statistics_export_YYYYMMDD.csv"

// CSV例（人気商品の場合）
"商品ID","商品名","注文数","売上","平均単価"
"1","コーヒー","85","25500","300"
"2","サンドイッチセット","34","20400","600"
```

## 🔒 認証・認可

### **認証ヘッダー**
```http
Authorization: Bearer <JWT_TOKEN>
```

### **権限要件**
- 全エンドポイント: 管理者権限必須
- JWTトークンに`isAdmin: true`が含まれている必要がある

### **認証エラー処理**
```typescript
// 401 Unauthorized
{
  "statusCode": 401,
  "statusMessage": "認証が必要です"
}

// 403 Forbidden
{
  "statusCode": 403,
  "statusMessage": "管理者権限が必要です"
}
```

## 📊 レート制限

### **制限設定**
| エンドポイント | 制限 | 期間 |
|-------------|------|------|
| 全エンドポイント | 100リクエスト | 1分間 |
| エクスポートAPI | 5リクエスト | 1分間 |

### **制限超過時のレスポンス**
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "statusCode": 429,
  "statusMessage": "リクエスト制限を超過しました。しばらく待ってから再試行してください。"
}
```

## 🔍 キャッシュ戦略

### **キャッシュ設定**
| データ種類 | キャッシュ期間 | 更新条件 |
|-----------|-------------|----------|
| KPI統計 | 5分 | 新規注文時 |
| 人気商品 | 10分 | 商品更新時 |
| 時間帯分析 | 1時間 | 日次バッチ |

### **キャッシュヘッダー**
```http
Cache-Control: max-age=300, private
ETag: "abc123"
Last-Modified: Wed, 21 Oct 2024 07:28:00 GMT
```

## 📈 監視・ログ

### **アクセスログ**
```typescript
interface ApiAccessLog {
  timestamp: string
  method: string
  path: string
  userId: string
  ipAddress: string
  userAgent: string
  responseTime: number
  statusCode: number
  requestId: string
}
```

### **エラーログ**
```typescript
interface ApiErrorLog {
  timestamp: string
  requestId: string
  error: {
    message: string
    stack: string
    code: string
  }
  request: {
    method: string
    path: string
    params: object
    userId: string
  }
}
```

### **パフォーマンス監視**
- レスポンス時間追跡
- エラー率監視
- API使用量統計
- リソース使用量監視

## 🧪 テスト仕様

### **APIテストケース**
```typescript
describe('Statistics API', () => {
  describe('GET /kpis', () => {
    test('正常系: 期間指定でKPIを取得', async () => {
      const response = await api.get('/kpis?period=7')
      expect(response.status).toBe(200)
      expect(response.data).toMatchSchema(KpisResponseSchema)
    })

    test('異常系: 不正な期間パラメータ', async () => {
      const response = await api.get('/kpis?period=invalid')
      expect(response.status).toBe(400)
    })

    test('認証エラー: トークンなし', async () => {
      const response = await api.get('/kpis', { headers: {} })
      expect(response.status).toBe(401)
    })
  })
})
```

### **負荷テスト**
```typescript
// K6 負荷テストスクリプト例
import http from 'k6/http'
import { check } from 'k6'

export let options = {
  stages: [
    { duration: '2m', target: 10 },  // 2分間で10ユーザーまで増加
    { duration: '5m', target: 10 },  // 5分間10ユーザー維持
    { duration: '2m', target: 0 },   // 2分間で0まで減少
  ]
}

export default function() {
let response = http.get('http://localhost:3100/api/v1/admin/statistics/kpis', {
    headers: { 'Authorization': `Bearer ${__ENV.JWT_TOKEN}` }
  })

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })
}
```

## 📚 SDKとクライアントライブラリ

### **TypeScript SDK例**
```typescript
// 将来実装予定のSDK
class StatisticsApiClient {
  constructor(private baseUrl: string, private token: string) {}

  async getKpis(period: '7' | '30' | '90' = '7'): Promise<KpisResponse> {
    const response = await fetch(`${this.baseUrl}/kpis?period=${period}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    })
    return response.json()
  }

  async getPopularProducts(options?: {
    period?: '7' | '30' | '90'
    limit?: number
    sortBy?: 'orderCount' | 'revenue'
  }): Promise<PopularProduct[]> {
    const params = new URLSearchParams(options as any)
    const response = await fetch(`${this.baseUrl}/popular-products?${params}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    })
    return response.json()
  }
}
```

---

## 📝 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|----------|
| 2024/XX/XX | v1.0 | 初版作成 |
| 2024/XX/XX | v1.1 | KPI・人気商品API実装完了 |
| 2024/XX/XX | v1.2 | 時間帯分析API仕様追加 |
