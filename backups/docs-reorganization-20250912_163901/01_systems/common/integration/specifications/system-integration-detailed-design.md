# 🔗 システム間連携詳細設計書

**バージョン**: 2.1.0  
**策定日**: 2024年12月  
**更新日**: 2025年1月27日  
**基盤**: Event-driven連携基盤  
**対象システム**: hotel-saas、hotel-member、hotel-pms

> **📋 更新履歴 (v2.1.0 - 2025年1月27日)**  
> **客室状態変更ログ統合対応** - hotel-common統合管理による更新  
> - 詳細操作ログの標準化
> - PMS/SaaS側からのログ送信仕様追加  
> 詳細仕様: [客室状態変更ログ統合仕様書](room-operation-log-specification.md)

---

## 📋 **概要**

Event-driven連携基盤上で動作するホテル管理システム群の詳細な連携仕様を定義します。各システムの責任範囲・データ権限・競合解決・API仕様を包括的に規定します。

### **基本方針**[[memory:3369219]][[memory:3368959]]
- **hotel-member**: 顧客マスタ正本管理・会員機能専用
- **hotel-pms**: 予約一元管理・フロント業務中心
- **hotel-saas**: 参照権限・コンシェルジュ・注文管理

---

## 🏗️ **システム責任マトリックス**

### **データ管理責任**

| データ種別 | 主管理システム | 更新権限 | 参照権限 | 備考 |
|------------|----------------|----------|----------|------|
| **顧客基本情報** | hotel-member | hotel-member(全項目)<br/>hotel-pms(限定項目) | 全システム | 氏名・電話・住所のみPMS更新可 |
| **会員ランク・ポイント** | hotel-member | hotel-member | 全システム | PMS更新不可 |
| **配信設定・嗜好** | hotel-member | hotel-member | hotel-member<br/>hotel-saas | 個人情報保護 |
| **予約情報** | hotel-pms | hotel-pms<br/>hotel-member(新規予約) | 全システム | origin属性で予約元識別 |
| **チェックイン/アウト** | hotel-pms | hotel-pms | 全システム | PMS専用処理 |
| **部屋在庫・状態** | hotel-pms | hotel-pms | hotel-member<br/>hotel-pms | hotel-saas参照不可 |
| **注文・コンシェルジュ** | hotel-saas | hotel-saas | hotel-saas<br/>hotel-pms | 請求連携でPMS参照 |
| **売上・請求** | hotel-pms | hotel-pms | hotel-pms<br/>hotel-saas | 経理・分析用 |

### **機能責任分担**

#### **hotel-member (顧客管理特化)**
```yaml
主要機能:
  - 会員登録・管理
  - ポイント管理・交換
  - ランク判定・特典付与
  - 予約導線（会員向け）
  - マーケティング・配信管理
  - CRM・パーソナライゼーション

データ更新権限:
  - 顧客情報: 全項目更新可能
  - 会員ランク: 自動計算・手動調整
  - ポイント: 付与・利用・交換
  - 予約: 新規作成のみ（その後PMS管理）

Event発行:
  - customer.created/updated/rank_changed/points_changed
  - reservation.created (会員予約時)
```

#### **hotel-pms (予約・宿泊業務中心)**
```yaml
主要機能:
  - 予約一元管理
  - チェックイン/アウト処理
  - 部屋管理・在庫制御
  - フロント業務支援
  - OTA連携・外部予約取り込み
  - 請求・決済管理

データ更新権限:
  - 予約情報: 全項目更新可能
  - 顧客情報: 基本項目のみ（氏名・電話・住所）
  - 部屋状態: 全項目更新可能
  - チェックイン/アウト: 専用権限

Event発行:
  - reservation.updated/confirmed/cancelled
  - checkin_checkout.checked_in/checked_out/no_show
  - room.status_changed/maintenance_updated
  - customer.updated (限定項目のみ)
```

#### **hotel-saas (サービス・注文管理)**
```yaml
主要機能:
  - コンシェルジュサービス
  - ルームサービス・注文管理
  - 施設予約・アクティビティ
  - ゲスト向けアプリ・ポータル
  - サービス履歴・満足度管理

データ更新権限:
  - 注文情報: 全項目更新可能
  - サービス履歴: 作成・更新
  - 顧客嗜好: 参照のみ（更新はmember経由）

Event発行:
  - service.ordered/completed/cancelled
  - feedback.created/updated
```

---

## 🔄 **データ同期ルール**

### **リアルタイム同期対象**

#### **1. 顧客情報同期**
```typescript
// hotel-member → hotel-pms, hotel-saas
interface CustomerSyncRule {
  trigger: 'daily_batch_6am'  // リアルタイムから日次バッチに変更
  sync_fields: [
    'name', 'phone', 'address', 'email'  // ポイント・ランクは別バッチ
  ]
  pms_updatable_fields: [
    'name', 'phone', 'address' // 限定更新項目（変更なし）
  ]
  conflict_resolution: {
    simple_rule: '最終更新時刻優先',  // 複雑な競合解決を簡素化
    manual_review: '同一項目の大幅変更のみ'
  }
}
```

#### **2. 予約情報同期（Critical部分のみリアルタイム）**
```typescript
// hotel-pms ↔ hotel-member, hotel-saas
interface ReservationSyncRule {
  critical_realtime: [
    'ota_booking_conflict',  // OTA予約競合防止のみ
    'room_availability_check'  // 客室在庫確認のみ
  ]
  
  standard_sync: 'daily_batch_7am'  // その他は日次バッチ
  
  fields: [
    'reservation_id', 'customer_id', 'room_type', 'room_number',
    'checkin_date', 'checkout_date', 'status', 'total_amount',
    'origin', 'confirmation_code'
  ]
  
  simple_rules: {
    conflict_prevention: 'UNIQUE制約 + 楽観的ロック',
    batch_sync: '予約詳細変更は日次で十分'
  }
}
```

#### **3. チェックイン/アウト同期（Critical維持）**
```typescript
// hotel-pms → hotel-member, hotel-saas
interface CheckInOutSyncRule {
  trigger: 'checkin_checkout.checked_in/checked_out'
  priority: 'CRITICAL'
  realtime_sync: true  // 客室状況・請求確定のため必須
  
  immediate_effects: {
    room_status: 'auto_update_availability',  // 即座更新必須
    service_activation: 'enable_hotel_saas_services',  // 即座有効化
    billing_finalization: 'checkout時の請求確定'
  }
  
  batch_effects: {
    member_points: 'daily_batch_calculation',  // ポイント付与は日次で十分
    analytics_update: 'daily_stats_update'
  }
}
```

### **バッチ同期対象**

#### **売上・分析データ**
```typescript
interface AnalyticsSyncRule {
  schedule: 'daily_23:00'
  source: 'hotel-pms'
  targets: ['hotel-member', 'hotel-saas']
  data: {
    daily_revenue: 'room_charges + service_charges + taxes'
    occupancy_rate: 'occupied_rooms / total_available_rooms'
    customer_analytics: 'stay_patterns + spending_patterns'
  }
}
```

---

## ⚖️ **競合解決システム**

### **データ競合パターンと解決策**

#### **1. 顧客情報競合**
```yaml
シナリオ: hotel-memberとhotel-pmsで同時に顧客情報更新

自動解決条件:
  - 更新項目が重複しない場合 → 両方適用
  - PMS更新項目が許可範囲内 → 自動マージ
  - 更新時刻差が5分以内 → timestamp優先

手動解決条件:
  - 重要項目（氏名・電話）の競合
  - 金額関連情報（ポイント・請求）の不整合
  - 同一項目への大幅変更（前値から50%以上変更）

解決プロセス:
  1. 競合検知 → システムイベント発行
  2. 自動解決可能性判定
  3. 手動解決必要時 → 管理者通知
  4. 解決完了 → 全システム同期
```

#### **2. 予約競合**
```yaml
シナリオ: 同一部屋・同一日程での重複予約

自動解決:
  - 予約時刻の早い方を優先
  - ダブルブッキング検知 → 即座にアラート
  - 在庫不足時 → 類似部屋への自動提案

エスカレーション:
  - VIP顧客関連の競合
  - 高額予約の競合
  - 特別イベント日の競合
```

### **競合解決API**

#### **競合検知・解決エンドポイント**
```typescript
// 競合検知
POST /api/v2/conflicts/detect
{
  "entity_type": "customer" | "reservation" | "room",
  "entity_id": "string",
  "conflicting_updates": [
    {
      "system": "hotel-member",
      "timestamp": "2024-12-01T10:00:00Z",
      "fields": {"name": "田中太郎", "phone": "090-1234-5678"}
    },
    {
      "system": "hotel-pms", 
      "timestamp": "2024-12-01T10:02:00Z",
      "fields": {"name": "田中太郎", "phone": "080-9876-5432"}
    }
  ]
}

// 競合解決
POST /api/v2/conflicts/{conflict_id}/resolve
{
  "resolution_method": "manual" | "auto_merge" | "priority_based",
  "resolved_data": {
    "name": "田中太郎",
    "phone": "090-1234-5678", // 手動選択
    "resolution_reason": "顧客から電話で新番号確認済み"
  },
  "resolver_user_id": "admin-user-123"
}
```

---

## 🛡️ **データ整合性保証**

### **ACID特性の分散実装**

#### **Atomicity (原子性)**
```typescript
// トランザクション境界の定義
interface DistributedTransaction {
  transaction_id: string
  operations: [
    {
      system: "hotel-member",
      operation: "customer.update",
      data: {...}
    },
    {
      system: "hotel-pms", 
      operation: "reservation.update",
      data: {...}
    }
  ]
  commit_strategy: "two_phase_commit"
  timeout: 30000 // 30秒
}
```

#### **Consistency (一貫性)**
```yaml
整合性ルール:
  customer_points:
    - ポイント残高 >= 0
    - 利用ポイント <= 保有ポイント
    - ランク変更は履歴保持必須
  
  reservation_integrity:
    - チェックイン日 < チェックアウト日
    - 予約金額 >= 0
    - 部屋在庫との整合性保持
  
  room_availability:
    - 同一部屋の重複予約禁止
    - メンテナンス期間の予約禁止
    - 稼働率計算の正確性保証
```

#### **Isolation (独立性)**
```typescript
// 楽観的ロック実装
interface OptimisticLocking {
  version_field: "updated_at" | "version_number"
  conflict_detection: "timestamp_comparison"
  retry_strategy: {
    max_retries: 3
    backoff_delay: [100, 500, 1000] // ms
  }
}
```

#### **Durability (永続性)**
```yaml
永続化戦略:
  primary_storage: "PostgreSQL"
  event_log: "Redis Streams"
  backup_strategy: 
    - リアルタイムレプリケーション
    - 日次フルバックアップ
    - 週次クロスサイトバックアップ
  recovery_rpo: "< 1分" # Recovery Point Objective
  recovery_rto: "< 5分" # Recovery Time Objective
```

---

## 🔌 **システム間API仕様**

### **RESTful API エンドポイント設計**

#### **hotel-member API（顧客管理）**
```yaml
Base URL: https://member.hotel-system.com/api/v2

顧客管理:
  GET    /customers/{customer_id}           # 顧客情報取得
  PUT    /customers/{customer_id}           # 顧客情報更新
  POST   /customers                         # 新規顧客作成
  
会員機能:
  GET    /customers/{customer_id}/points    # ポイント残高
  POST   /customers/{customer_id}/points    # ポイント加算/減算
  GET    /customers/{customer_id}/rank      # 会員ランク情報
  PUT    /customers/{customer_id}/rank      # ランク手動調整

予約連携:
  POST   /reservations                      # 会員予約作成（PMS転送）
  GET    /reservations/customer/{customer_id} # 顧客予約履歴
```

#### **hotel-pms API（予約・宿泊管理）**
```yaml
Base URL: https://pms.hotel-system.com/api/v2

予約管理:
  GET    /reservations                      # 予約一覧
  GET    /reservations/{reservation_id}     # 予約詳細
  POST   /reservations                      # 新規予約作成
  PUT    /reservations/{reservation_id}     # 予約更新
  DELETE /reservations/{reservation_id}     # 予約キャンセル

チェックイン/アウト:
  POST   /reservations/{reservation_id}/checkin   # チェックイン
  POST   /reservations/{reservation_id}/checkout  # チェックアウト
  
部屋管理:
  GET    /rooms                             # 部屋一覧・在庫状況
  PUT    /rooms/{room_id}/status            # 部屋状態更新
  GET    /rooms/availability                # 空室状況検索

顧客情報（限定）:
  PUT    /customers/{customer_id}/basic     # 基本情報のみ更新
```

#### **hotel-saas API（サービス管理）**
```yaml
Base URL: https://saas.hotel-system.com/api/v2

サービス注文:
  POST   /orders                            # 新規注文
  GET    /orders/customer/{customer_id}     # 顧客注文履歴
  PUT    /orders/{order_id}/status          # 注文状況更新

コンシェルジュ:
  POST   /concierge/requests                # コンシェルジュ依頼
  GET    /concierge/services                # 提供サービス一覧
  
フィードバック:
  POST   /feedback                          # 満足度・レビュー投稿
  GET    /feedback/summary/{customer_id}    # 顧客フィードバック集計
```

### **統一レスポンス形式**

#### **成功レスポンス**
```json
{
  "success": true,
  "data": {
    // 実際のデータ
  },
  "metadata": {
    "timestamp": "2024-12-01T10:00:00Z",
    "source_system": "hotel-member",
    "request_id": "req-123456789",
    "version": "v2.1.0"
  }
}
```

#### **エラーレスポンス**
```json
{
  "success": false,
  "error": {
    "code": "CUSTOMER_NOT_FOUND",
    "message": "指定された顧客が見つかりません",
    "details": {
      "customer_id": "cust-123",
      "searched_systems": ["hotel-member", "hotel-pms"]
    },
    "retry_after": 5000,
    "documentation_url": "https://docs.hotel-system.com/errors/CUSTOMER_NOT_FOUND"
  },
  "metadata": {
    "timestamp": "2024-12-01T10:00:00Z",
    "source_system": "hotel-member",
    "request_id": "req-123456789"
  }
}
```

---

## 📊 **監視・メトリクス**

### **システム間連携監視指標**

#### **データ整合性監視**
```yaml
整合性チェック:
  customer_data_consistency:
    - hotel-memberとhotel-pmsの顧客情報一致率
    - 目標: 99.99%以上
    - チェック頻度: 5分間隔
  
  reservation_consistency:
    - 予約データの全システム同期率
    - 目標: 100%
    - 許容遅延: 10秒以内
  
  point_balance_accuracy:
    - ポイント残高の正確性
    - 目標: 100%（金銭的価値のため）
    - リアルタイム監視
```

#### **API パフォーマンス監視**
```yaml
応答時間:
  - 平均応答時間: < 200ms
  - 95%タイル応答時間: < 500ms
  - 99%タイル応答時間: < 1000ms

可用性:
  - 各システムアップタイム: 99.9%以上
  - システム間連携成功率: 99.99%以上
  
エラー率:
  - 全体エラー率: < 0.1%
  - 重要API（予約・決済）: < 0.01%
```

#### **ビジネスメトリクス**
```yaml
業務効率:
  - 手動同期作業時間: 前年比80%削減
  - データ不整合によるクレーム: 月間0件
  - 顧客対応スピード: 平均30%向上

顧客満足度:
  - システム起因の不満: < 1%
  - 情報整合性満足度: > 95%
  - サービス連携満足度: > 90%
```

---

## 🔄 **段階的実装計画**

### **Phase 1: 基盤連携（2週間）**
- [ ] 顧客情報の基本同期（member ↔ pms）
- [ ] 予約情報の基本同期（pms → member, saas）
- [ ] 基本的な競合検知機能
- [ ] 監視・ログ基盤

### **Phase 2: 高度連携（3週間）**
- [ ] チェックイン/アウト連携
- [ ] ポイント・ランク連携
- [ ] 自動競合解決システム
- [ ] 部屋在庫・状態同期

### **Phase 3: サービス連携（2週間）**
- [ ] hotel-saas注文連携
- [ ] コンシェルジュサービス連携
- [ ] フィードバック・満足度連携
- [ ] 分析データ連携

### **Phase 4: 最適化・監視（1週間）**
- [ ] パフォーマンスチューニング
- [ ] 監視アラート整備
- [ ] 運用手順書作成
- [ ] 障害復旧手順確立

---

## 🎯 **成功指標**

### **技術指標**
- **データ整合性**: 99.99%
- **API応答時間**: 平均200ms以下
- **システム間同期遅延**: 10秒以内
- **可用性**: 99.9%以上

### **ビジネス指標**
- **手動作業削減**: 80%以上
- **顧客対応速度向上**: 30%以上
- **データ不整合エラー**: 月間0件
- **顧客満足度**: 95%以上

### **運用指標**
- **障害対応時間**: 平均5分以内
- **システム保守時間**: 月間4時間以内
- **新機能開発速度**: 50%向上
- **運用コスト**: 30%削減

---

このシステム間連携詳細設計により、Event-driven連携基盤上で動作する統一的で信頼性の高いホテル管理システム群を実現します。 