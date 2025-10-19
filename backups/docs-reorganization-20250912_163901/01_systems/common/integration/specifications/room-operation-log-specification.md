# 客室状態変更ログ統合仕様書

**仕様書ID**: ROOM-LOG-SPEC-2025-01-27-001  
**バージョン**: v2.0  
**作成日**: 2025年1月27日  
**更新日**: 2025年1月27日  
**作成者**: hotel-common統合管理  
**ステータス**: 承認済み  

---

## 📋 変更履歴

| バージョン | 日付 | 変更者 | 変更内容 |
|-----------|------|--------|----------|
| v1.0 | 2024年12月 | 初期実装 | 基本的な操作ログ機能（UPDATE_STATUS中心） |
| **v2.0** | **2025年1月27日** | **hotel-common** | **客室状態変更ログの包括的仕様化・PMS/SaaS連携対応** |

---

## 🎯 概要

### 背景・課題
従来の実装では客室状態更新時に `action: 'UPDATE_STATUS'` として一律記録していたため、以下の課題がありました：

- **業務的意味の不明確性**: チェックイン/チェックアウトと単純な状態変更の区別が困難
- **詳細情報の不足**: 操作理由、影響度、所要時間等の業務情報が不足
- **PMS統合時の課題**: PMS側での手動ログ保存の仕様が不明確
- **分析・可視化の困難**: 客室稼働状況やメンテナンス履歴の分析が困難

### 改善方針
1. **アクション体系の詳細化**: 業務的意味を明確にした詳細アクション定義
2. **event_data構造の標準化**: 統一された詳細情報スキーマ
3. **システム間連携の明確化**: PMS/SaaS側からのログ送信仕様
4. **分析・可視化対応**: 業務分析に必要な情報の体系化

---

## 🏗️ アクション体系（v2.0拡張版）

### 従来のアクション（v1.0 - 継続使用）
```typescript
enum LegacyActions {
  'CHECKIN' = 'チェックイン',
  'CHECKOUT' = 'チェックアウト', 
  'UPDATE_STATUS' = '状態更新',  // ※廃止予定・後方互換のみ
  'RESERVATION_CREATE' = '予約作成',
  'RESERVATION_UPDATE' = '予約更新',
  'RESERVATION_CANCEL' = '予約キャンセル'
}
```

### 新規詳細アクション（v2.0追加）
```typescript
enum RoomOperationActions {
  // === 客室清掃関連 ===
  'ROOM_CLEANING_START' = '清掃開始',
  'ROOM_CLEANING_COMPLETE' = '清掃完了',
  'ROOM_CLEANING_INSPECTION' = '清掃点検',
  'ROOM_CLEANING_FAILED' = '清掃不合格',
  
  // === メンテナンス関連 ===
  'ROOM_MAINTENANCE_START' = 'メンテナンス開始',
  'ROOM_MAINTENANCE_COMPLETE' = 'メンテナンス完了',
  'ROOM_REPAIR_REQUEST' = '修理依頼',
  'ROOM_REPAIR_COMPLETE' = '修理完了',
  
  // === 客室ブロック関連 ===
  'ROOM_BLOCK' = '客室ブロック',
  'ROOM_UNBLOCK' = 'ブロック解除',
  'ROOM_OUT_OF_ORDER' = '故障・利用不可',
  'ROOM_BACK_IN_SERVICE' = 'サービス復帰',
  
  // === 業務操作関連 ===
  'ROOM_INSPECTION' = '客室点検',
  'ROOM_SETUP_COMPLETE' = '客室準備完了',
  'ROOM_AMENITY_RESTOCK' = 'アメニティ補充',
  'ROOM_DEEP_CLEANING' = '特別清掃',
  
  // === システム連携 ===
  'ROOM_STATUS_SYNC' = 'システム間状態同期',
  'ROOM_BULK_UPDATE' = '一括状態更新'
}
```

---

## 📊 event_data 標準スキーマ（v2.0）

### 基本構造
```typescript
interface RoomOperationEventData {
  // === 基本情報（必須） ===
  room_id: string;              // 客室ID
  room_number: string;          // 客室番号
  old_status: string;           // 変更前状態
  new_status: string;           // 変更後状態
  timestamp: string;            // ISO 8601形式
  
  // === 操作詳細（推奨） ===
  operation_reason?: string;    // 操作理由
  operation_category?: 'cleaning' | 'maintenance' | 'guest_service' | 'system' | 'emergency';
  estimated_duration?: number;  // 予想所要時間（分）
  actual_duration?: number;     // 実際の所要時間（分）
  
  // === 業務影響情報 ===
  guest_impact?: boolean;       // 宿泊客への影響有無
  revenue_impact?: number;      // 売上への影響額（円）
  booking_blocked?: boolean;    // 予約受付停止フラグ
  
  // === 作業者情報 ===
  staff_id: string;            // 作業者ID（必須）
  department?: string;         // 担当部署
  
  // === システム連携情報 ===
  triggered_by_system: string; // 'hotel-pms' | 'hotel-saas' | 'hotel-member' | 'hotel-common'
  sync_required?: boolean;     // 他システムへの同期要否
  sync_targets?: string[];     // 同期対象システム
  
  // === 品質・検査情報 ===
  quality_check?: 'passed' | 'failed' | 'pending' | 'not_required';
  inspection_notes?: string;   // 検査メモ
  photo_urls?: string[];       // 写真URL（清掃前後等）
  
  // === 追加メタデータ ===
  notes?: string;              // 自由記述メモ
  tags?: string[];             // 分類タグ
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  
  // === v1.0互換情報（廃止予定） ===
  maintenance_reason?: string; // ※v1.0互換・operation_reasonに統合予定
}
```

### 状態別推奨フィールド
```typescript
// 清掃関連操作時
interface CleaningEventData extends RoomOperationEventData {
  operation_category: 'cleaning';
  quality_check: 'passed' | 'failed' | 'pending';
  cleaning_type?: 'standard' | 'deep' | 'checkout' | 'maintenance';
  supplies_used?: string[];
}

// メンテナンス関連操作時
interface MaintenanceEventData extends RoomOperationEventData {
  operation_category: 'maintenance';
  maintenance_type?: 'preventive' | 'corrective' | 'emergency';
  equipment_involved?: string[];
  vendor_info?: {
    company: string;
    contact: string;
    cost?: number;
  };
}
```

---

## 🔄 システム間連携仕様

### hotel-pms → hotel-common
```typescript
// PMS側からのログ送信API
POST /api/v1/logs/operations
Authorization: Bearer {pms_token}
Content-Type: application/json

{
  "action": "ROOM_CLEANING_COMPLETE",
  "target_type": "room",
  "target_id": "room-123",
  "details": {
    "room_id": "room-123",
    "room_number": "101",
    "old_status": "cleaning",
    "new_status": "available",
    "operation_reason": "チェックアウト後清掃完了",
    "operation_category": "cleaning",
    "cleaning_type": "checkout",
    "quality_check": "passed",
    "staff_id": "staff-456",
    "department": "housekeeping",
    "actual_duration": 45,
    "triggered_by_system": "hotel-pms",
    "timestamp": "2025-01-27T10:30:00Z"
  }
}
```

### hotel-saas → hotel-common
```typescript
// SaaS側からのサービス関連ログ
POST /api/v1/logs/operations
Authorization: Bearer {saas_token}
Content-Type: application/json

{
  "action": "ROOM_AMENITY_RESTOCK",
  "target_type": "room", 
  "target_id": "room-789",
  "details": {
    "room_id": "room-789",
    "room_number": "205",
    "old_status": "occupied",
    "new_status": "occupied",
    "operation_reason": "ゲストリクエストによるアメニティ補充",
    "operation_category": "guest_service",
    "staff_id": "staff-789",
    "department": "concierge",
    "guest_impact": false,
    "triggered_by_system": "hotel-saas",
    "timestamp": "2025-01-27T14:15:00Z"
  }
}
```

---

## 📈 分析・可視化対応

### 推奨分析項目
```typescript
interface RoomOperationAnalytics {
  // 稼働状況分析
  occupancy_rate: number;           // 稼働率
  cleaning_efficiency: number;     // 清掃効率（時間/部屋）
  maintenance_frequency: number;   // メンテナンス頻度
  
  // 品質管理
  quality_pass_rate: number;       // 品質合格率
  rework_rate: number;             // やり直し率
  guest_complaint_correlation: number; // 苦情相関性
  
  // コスト分析
  operational_cost_per_room: number;   // 部屋あたり運営コスト
  maintenance_cost_trend: number[];   // メンテナンスコスト推移
  revenue_loss_by_downtime: number;   // ダウンタイムによる売上損失
}
```

### 可視化推奨項目
1. **リアルタイム客室状況ダッシュボード**
2. **清掃・メンテナンス進捗管理**
3. **品質管理レポート**
4. **コスト分析レポート**
5. **予測メンテナンススケジュール**

---

## 🔧 実装ガイドライン

### hotel-common側対応
1. **操作ログAPI拡張**: 新規アクション対応
2. **バリデーション強化**: event_data構造検証
3. **分析API提供**: 統計・レポート機能
4. **ドキュメント整備**: API仕様書更新

### hotel-pms側対応
1. **ログ送信機能**: 客室操作時の自動ログ送信
2. **詳細情報収集**: 作業者・品質情報の入力UI
3. **同期機能**: hotel-commonとのリアルタイム同期
4. **レポート機能**: PMS独自の分析機能

### hotel-saas側対応
1. **サービスログ**: ゲスト向けサービス操作のログ化
2. **連携API**: hotel-commonへのログ送信
3. **ゲスト影響分析**: サービス品質との相関分析
4. **モバイル対応**: タブレット等での現場入力

---

## 📅 移行スケジュール

### Phase 1: 仕様策定・ドキュメント整備（2025年1月）
- [x] 統合仕様書作成
- [ ] 各システム向け仕様書更新
- [ ] API仕様書更新

### Phase 2: hotel-common基盤整備（2025年2月）
- [ ] 新規アクション対応
- [ ] event_dataバリデーション
- [ ] 分析API開発

### Phase 3: 各システム実装（2025年3月-4月）
- [ ] hotel-pms: ログ送信機能
- [ ] hotel-saas: サービスログ機能
- [ ] hotel-member: 必要に応じて対応

### Phase 4: 分析・可視化機能（2025年5月）
- [ ] ダッシュボード開発
- [ ] レポート機能
- [ ] 予測分析機能

---

## 🚨 注意事項・制約

### 後方互換性
- v1.0の `UPDATE_STATUS` は当面継続サポート
- 段階的移行により既存システムへの影響を最小化

### セキュリティ
- 個人情報の取り扱いに注意
- システム間通信の認証・暗号化必須

### パフォーマンス
- 大量ログ生成時のDB負荷対策
- リアルタイム同期の負荷分散

### 運用
- ログ保存期間の設定（推奨: 3年）
- 定期的なデータアーカイブ
- 異常値検知・アラート機能

---

**承認者**: hotel-common統合管理  
**承認日**: 2025年1月27日  
**次回見直し予定**: 2025年7月27日
