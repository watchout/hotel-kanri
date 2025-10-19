# 商品原価・利益分析機能 要件定義書

## 📋 概要

### **プロジェクト名**
Hotel SaaS 商品原価・利益分析機能

### **目的**
商品の材料費（原価）管理により利益分析を可能にし、戦略的な商品構成とマーケティング施策の実現を支援する。

### **スコープ**
- 商品マスタへの原価フィールド追加
- 利益計算機能の実装
- 利益ベースの商品分析機能
- 客室UI側での利益率向上施策

## 🎯 ビジネス要件

### **解決したい課題**
1. **利益構造の不透明性**: 売上は見えるが、実際の利益がわからない
2. **戦略的商品推奨の欠如**: 売れ筋と利益貢献商品の乖離
3. **マーケティング効果測定**: 利益率向上施策の効果が測定できない

### **達成目標**
1. **利益の可視化**: 商品別・カテゴリ別の利益分析
2. **戦略的商品構成**: 利益率の高い商品の効果的な露出
3. **収益最大化**: 売上と利益のバランス最適化

## 📊 機能要件

### **フェーズ1: 原価管理機能**

#### **F001: 商品原価フィールド追加**
**概要**: MenuItemテーブルに原価フィールドを追加

**データベース拡張**:
```prisma
model MenuItem {
  // 既存フィールド
  id               Int             @id @default(autoincrement())
  name_ja          String
  price            Int             // 販売価格（税込）
  taxRate          Int             @default(10)
  
  // 新規追加フィールド
  costPrice        Int?            // 原価（税込・材料費のみ）
  
  // その他既存フィールド...
}
```

**受入条件**:
- [ ] 原価は税込価格で入力可能
- [ ] 原価は任意項目（NULL許可）
- [ ] 既存データに影響なし
- [ ] マイグレーション正常実行

#### **F002: 管理画面での原価入力**
**概要**: 商品登録・編集画面に原価入力フィールドを追加

**UI仕様**:
- 原価入力フィールド（数値、円単位）
- 利益額の自動計算表示
- 利益率の自動計算表示

**計算式**:
```javascript
利益額 = 販売価格 - 原価
利益率 = (利益額 / 販売価格) × 100
```

**受入条件**:
- [ ] 原価入力時のリアルタイム計算
- [ ] バリデーション（負の値不可）
- [ ] 既存の登録・編集フローに統合

### **フェーズ2: 利益分析機能**

#### **F003: 利益ベース商品分析**
**概要**: 現在の商品分析に利益軸を追加

**分析軸の追加**:
1. **売上ベース分析**（既存）
   - 注文数ランキング
   - 売上貢献度ランキング

2. **利益ベース分析**（新規）
   - 利益額ランキング
   - 利益率ランキング
   - 利益貢献度ランキング

**API拡張**:
```typescript
// /api/v1/admin/statistics/popular-products.get.ts 拡張
interface ProductAnalysis {
  // 既存フィールド
  totalOrders: number
  totalRevenue: number
  
  // 新規追加フィールド
  totalProfit?: number      // 総利益額
  averageProfitMargin?: number  // 平均利益率
  profitContribution?: number   // 利益貢献度
}
```

**受入条件**:
- [ ] 利益データの正確な計算
- [ ] 原価未設定商品の適切な除外
- [ ] 既存分析機能への影響なし
- [ ] Chart.jsグラフでの可視化

#### **F004: 利益分析ダッシュボード**
**概要**: 統計ダッシュボードに利益KPIを追加

**追加KPI**:
- 総利益額
- 平均利益率
- 利益成長率

**受入条件**:
- [ ] KPI統計APIの拡張
- [ ] ダッシュボードUIへの統合
- [ ] 期間指定での利益分析

### **フェーズ3: 利益率向上施策**

#### **F005: 客室UI側利益最適化**
**概要**: 利益率の高い商品の戦略的露出

**実装施策**:
1. **高利益率商品の優先表示**
   - 利益率閾値以上の商品にバッジ表示
   - カテゴリ内での高利益率商品の上位表示

2. **おすすめ商品システム**
   - 利益率と売れ筋のバランスによる推奨
   - セット商品での高利益率アイテム組み込み

3. **動的価格表示**
   - 高利益率商品の「お得」表示
   - 利益貢献度による表示優先度調整

**受入条件**:
- [ ] 管理画面での利益率閾値設定
- [ ] 客室UIでの適切な商品露出
- [ ] A/Bテスト可能な実装

## 🔧 技術仕様

### **データベース設計**

```sql
-- Migration: Add cost price to MenuItem
ALTER TABLE MenuItem ADD COLUMN costPrice INTEGER;

-- インデックス追加（利益分析の高速化）
CREATE INDEX idx_menuitem_costprice ON MenuItem(costPrice);
CREATE INDEX idx_menuitem_price_cost ON MenuItem(price, costPrice);
```

### **API仕様**

#### **商品分析API拡張**
```typescript
// GET /api/v1/admin/statistics/popular-products
interface ProductAnalysisResponse {
  products: {
    id: number
    name: string
    totalOrders: number
    totalRevenue: number
    totalProfit: number | null      // 新規
    profitMargin: number | null     // 新規
    profitRank: number | null       // 新規
  }[]
  summary: {
    totalRevenue: number
    totalProfit: number             // 新規
    averageProfitMargin: number     // 新規
    profitableProductsCount: number // 新規
  }
}
```

#### **KPI統計API拡張**
```typescript
// GET /api/v1/admin/statistics/kpis
interface KPIResponse {
  // 既存フィールド
  totalOrders: number
  totalRevenue: number
  
  // 新規追加フィールド
  totalProfit: number
  averageProfitMargin: number
  profitGrowthRate: number
}
```

### **フロントエンド実装**

#### **管理画面: 商品登録・編集**
```vue
<!-- 原価入力フィールド -->
<div class="mb-4">
  <label class="block text-sm font-medium text-gray-700">
    原価 (税込)
  </label>
  <div class="mt-1 relative rounded-md shadow-sm">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <span class="text-gray-500 sm:text-sm">¥</span>
    </div>
    <input
      v-model="form.costPrice"
      type="number"
      min="0"
      class="pl-7 block w-full rounded-md border-gray-300"
      placeholder="0"
    />
  </div>
  
  <!-- 利益計算表示 -->
  <div v-if="form.price && form.costPrice" class="mt-2 text-sm text-gray-600">
    <div>利益額: ¥{{ (form.price - form.costPrice).toLocaleString() }}</div>
    <div>利益率: {{ ((form.price - form.costPrice) / form.price * 100).toFixed(1) }}%</div>
  </div>
</div>
```

#### **分析画面: 利益軸切り替え**
```vue
<!-- 分析軸選択 -->
<div class="mb-6">
  <div class="flex space-x-4">
    <button
      @click="analysisType = 'revenue'"
      :class="analysisType === 'revenue' ? 'bg-blue-600 text-white' : 'bg-gray-200'"
      class="px-4 py-2 rounded-md"
    >
      売上ベース
    </button>
    <button
      @click="analysisType = 'profit'"
      :class="analysisType === 'profit' ? 'bg-green-600 text-white' : 'bg-gray-200'"
      class="px-4 py-2 rounded-md"
    >
      利益ベース
    </button>
  </div>
</div>

<!-- グラフ表示 -->
<canvas ref="analysisChart"></canvas>
```

## 📈 実装フェーズ

### **Phase 1: 基盤整備 (1-2週間)**
- [ ] データベースマイグレーション
- [ ] 商品管理画面の原価フィールド追加
- [ ] 基本的な利益計算機能

### **Phase 2: 分析機能 (2-3週間)**
- [ ] 利益分析API実装
- [ ] 統計ダッシュボード拡張
- [ ] 利益ベースのグラフ・レポート

### **Phase 3: 利益最適化 (3-4週間)**
- [ ] 客室UI側の利益率施策
- [ ] おすすめ商品システム
- [ ] A/Bテスト基盤

## 🧪 テスト戦略

### **単体テスト**
- [ ] 利益計算ロジックの検証
- [ ] 原価データの正確性確認
- [ ] API レスポンスの形式確認

### **統合テスト**
- [ ] フロントエンド・バックエンド連携
- [ ] 既存機能への影響確認
- [ ] パフォーマンステスト

### **E2Eテスト**
- [ ] 商品登録から分析までのフロー
- [ ] 利益率施策の効果測定
- [ ] ユーザビリティテスト

## 📊 成功指標

### **技術指標**
- [ ] 原価データ入力率 > 80%
- [ ] 利益分析ページの表示速度 < 500ms
- [ ] 既存機能のパフォーマンス影響 < 5%

### **ビジネス指標**
- [ ] 高利益率商品の注文増加率 > 15%
- [ ] 全体利益率の改善 > 5%
- [ ] 利益分析機能の利用率 > 60%

---

## 📞 関連ドキュメント

- [統計・分析機能要件定義書](./docs/statistics/REQUIREMENTS.md)
- [商品管理機能開発タスク](./docs/admin/MENU_TASKS.md)
- [フロント業務機能要件定義書](./docs/features/FRONT_DESK_OPERATIONS.md)

**更新履歴**
- 2024/XX/XX: 初版作成
- 2024/XX/XX: API仕様詳細化 