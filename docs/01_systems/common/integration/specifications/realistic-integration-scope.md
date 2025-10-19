# 🎯 現実的統合範囲定義書（Realistic Integration Scope）

**策定日**: 2025年1月25日  
**目的**: 過剰設計を排除し、真に必要な統合のみに絞った実用的指針  
**基盤**: 統一PostgreSQLデータベース + 最小限API統合

---

## 🔍 **現実性分析結果**

### **❌ 過剰設計の問題点**
- **ミリ秒レベルの競合解決**: 現実的に不要
- **全データのリアルタイム同期**: コスト過大・効果薄
- **複雑なEvent-driven全面適用**: メンテナンス困難

### **✅ 実用的アプローチ**
- **統一PostgreSQL**: データ保存の一元化
- **必要最小限のAPI統合**: Critical業務のみ
- **段階的実装**: 効果の高い部分から順次

---

## ⚡ **Critical：数秒単位同期が必要**

### **1. OTA予約競合防止**
**必要理由**: 楽天トラベル・じゃらん等の外部予約サイトからの同時予約防止
```typescript
interface OTAConflictPrevention {
  trigger: '予約リクエスト受信時'
  response_time: '< 3秒'
  mechanism: '楽観的ロック + 在庫チェック'
  
  implementation: {
    db_level: 'UNIQUE制約 + トランザクション'
    api_level: '在庫確認 → 仮予約 → 確定'
    conflict_resolution: '先着順 + 類似部屋提案'
  }
}
```

### **2. 客室在庫・予約可能状況**
**必要理由**: 予約受付可否の即座判定・売上機会損失防止
```typescript
interface RoomAvailabilitySync {
  trigger: '客室状況変更時'
  sync_targets: ['予約可能数', '清掃状況', 'メンテナンス状況']
  response_time: '< 5秒'
  
  critical_events: [
    'チェックアウト完了 → 清掃待ち',
    '清掃完了 → 予約可能',
    'メンテナンス開始 → 予約不可',
    '緊急ブロック → 即座予約停止'
  ]
}
```

### **3. 外部システム連携（最小限Event-driven）**
**必要理由**: 外部API呼び出し・非同期処理のみ
```typescript
interface MinimalEventDriven {
  external_api_calls: {
    email_notifications: 'メール送信サービス',
    sms_alerts: 'SMS送信サービス', 
    ota_webhooks: '外部予約サイト通知'
  },
  
  implementation: 'シンプルなWebhook',
  complexity: '最小限',
  
  // 統一DBで解決される項目（Event-driven不要）
  internal_sync: {
    order_billing: '統一DBトランザクション',
    room_availability: '直接DB参照',
    customer_data: '統一DBのため同期不要'
  }
}
```

### **4. チェックイン/アウト処理**
**必要理由**: 客室状況・請求確定・オペレーション連携
```typescript
interface CheckInOutSync {
  trigger: 'チェックイン・チェックアウト実行時'
  response_time: '< 5秒'
  
  checkin_effects: [
    '客室状況: 利用中に変更',
    'hotel-saasサービス: 有効化',
    '請求: 宿泊料金確定'
  ],
  
  checkout_effects: [
    '客室状況: 清掃待ちに変更', 
    'hotel-saasサービス: 無効化',
    '請求: 最終計算・確定',
    'ポイント: 付与処理（バッチ可）'
  ]
}
```

---

## 📅 **日次バッチで十分**

### **1. 顧客基本情報同期**
**現実的な更新頻度**: 数時間〜数日に1回
```typescript
interface CustomerDataBatchSync {
  schedule: '毎日 AM 6:00'
  trigger: '前日変更分の一括同期'
  
  sync_fields: [
    'name', 'phone', 'address', 'email',
    'preferences', 'member_notes'
  ],
  
  conflict_resolution: '最終更新時刻優先'
}
```

### **2. ポイント・ランク計算**
**現実的な計算頻度**: 日次で十分
```typescript
interface PointsRankBatchSync {
  schedule: '毎日 AM 3:00'
  calculation_basis: '前日宿泊・利用実績'
  
  batch_processing: [
    'ポイント付与計算',
    'ランク変更判定',
    '会員特典更新',
    'キャンペーン適用'
  ]
}
```

### **3. 分析・レポートデータ**
**現実的な更新頻度**: 日次〜月次
```typescript
interface AnalyticsBatchSync {
  daily: '売上集計・稼働率計算',
  weekly: '顧客行動分析・人気サービス',
  monthly: '月次レポート・ランキング更新'
}
```

---

## 🔧 **実装アプローチ**

### **Phase 1: 最小限の安全性（2週間）**
```typescript
interface MinimumSafetyImplementation {
  楽観的ロック: 'updated_at フィールドでの基本チェック',
  権限制御: 'システム別更新可能フィールド制限',
  基本API統合: 'OTA予約競合防止のみ'
}
```

### **Phase 2: Critical業務のリアルタイム化（4週間）**
```typescript
interface CriticalRealtimeImplementation {
  客室在庫同期: '予約可能状況のリアルタイム更新',
  注文請求連携: 'hotel-saas → hotel-pms 即座反映',
  チェックイン_アウト: '客室状況・請求の即座更新'
}
```

### **Phase 3: バッチ最適化（2週間）**
```typescript
interface BatchOptimization {
  顧客情報: '日次バッチ同期',
  ポイント計算: '日次バッチ処理',
  分析データ: '段階的バッチ処理'
}
```

---

## 📊 **成功指標**

### **技術指標**
- **OTA予約競合**: 0件/月
- **客室在庫同期遅延**: < 5秒
- **注文請求連携**: < 10秒
- **システム稼働率**: > 99.5%

### **ビジネス指標**
- **ダブルブッキング**: 0件/月
- **請求漏れ**: 0件/月  
- **オペレーション効率**: 時間短縮30%
- **システム保守コスト**: 50%削減

---

## 🎯 **結論**

**統一PostgreSQLベース + 必要最小限のAPI統合**により、過剰な複雑性を避けつつ、真に必要な業務要件を満たすシステム統合を実現します。

---

## 🚫 **除外項目（不要と判断）**

### **JWT認証統合**
**除外理由**: 
- セキュリティ上、適度なログイン頻度は必要
- 実装コストに対する業務改善効果が限定的  
- 実際の要望が明確でない段階での実装は非効率
- 要望が上がった時点で対応すれば十分

**現状維持**: 各システムの既存認証方式を継続

---

**重点**: 「作り込み過ぎない、実用性重視の統合」（JWT認証統合除く） 