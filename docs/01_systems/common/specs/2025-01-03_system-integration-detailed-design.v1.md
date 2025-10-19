# システム間連携詳細設計仕様書

**Doc-ID**: SPEC-2025-01-03-003  
**Version**: v1.0  
**Status**: Approved  
**Owner**: 金子裕司  
**Linked-Docs**: ADR-2025-01-03-003, SPEC-2025-01-03-002  

---

## 概要
Event-driven連携基盤上で動作するhotel-saas、hotel-member、hotel-pmsの詳細な連携仕様。各システムの責任範囲・データ権限・競合解決・API仕様を包括的に規定。

## 背景・目的
- hotel-member: 顧客マスタ正本管理・会員機能専用
- hotel-pms: 予約一元管理・フロント業務中心
- hotel-saas: 参照権限・コンシェルジュ・注文管理

## 要件

### 機能要件
- システム責任マトリックスによる明確な役割分担
- リアルタイム・バッチ同期の適切な使い分け
- 自動・手動競合解決システム
- 包括的監視・ログシステム

### 非機能要件
- データ整合性: 99.99%
- API応答時間: 平均200ms以下
- システム間同期遅延: 10秒以内
- 可用性: 99.9%以上

## 仕様詳細

### システム責任マトリックス

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

### データ同期ルール

#### リアルタイム同期対象（Critical）
```typescript
interface CriticalRealtimeEvent {
  event_type: 'ota_reservation' | 'room_availability' | 'order_billing' | 'checkin_checkout'
  entity_id: string
  tenant_id: string
  source_system: string
  target_systems: string[]
  data: any
  timestamp: Date
  priority: 'CRITICAL'
}

// Critical：数秒単位同期必須
- OTA予約競合防止 (外部OTA → hotel-pms)
- 客室在庫・予約可能状況 (hotel-pms → hotel-member)
- 注文→請求連携 (hotel-saas → hotel-pms) 
- チェックイン/チェックアウト (hotel-pms → all systems)
```

#### バッチ同期対象（現実的頻度）
```typescript
// 日次バッチ（現実的な同期頻度）
- 顧客基本情報同期 (hotel-member ↔ hotel-pms) AM 6:00
- ポイント・ランク計算 (hotel-member → all systems) AM 3:00
- 売上集計 (hotel-pms → hotel-member) AM 4:00

// 週次バッチ（分析・最適化）
- 滞在傾向分析 (hotel-pms → hotel-member) 月曜 AM 2:00
- 人気サービス分析 (hotel-saas → hotel-member) 月曜 AM 3:00

// 月次バッチ（レポート・統計）
- 月次レポート生成 (all systems → hotel-pms) 1日 AM 1:00
- 年間統計更新 (hotel-pms → all systems) 1日 AM 2:00
```

### 競合解決システム

#### データ競合パターンと解決策
```yaml
顧客情報競合:
  自動解決条件:
    - 更新項目が重複しない場合 → 両方適用
    - PMS更新項目が許可範囲内 → 自動マージ
    - 更新時刻差が5分以内 → timestamp優先

  手動解決条件:
    - 重要項目（氏名・電話）の競合
    - 金額関連情報（ポイント・請求）の不整合
    - 同一項目への大幅変更（前値から50%以上変更）

予約競合:
  自動解決:
    - 予約時刻の早い方を優先
    - ダブルブッキング検知 → 即座にアラート
    - 在庫不足時 → 類似部屋への自動提案

  エスカレーション:
    - VIP顧客関連の競合
    - 高額予約の競合
    - 特別イベント日の競合
```

### ACID特性の分散実装

#### Atomicity (原子性)
```typescript
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

#### Consistency (一貫性)
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

## API仕様

### RESTful API エンドポイント設計

#### hotel-member API（顧客管理）
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

#### hotel-pms API（予約・宿泊管理）
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

#### hotel-saas API（サービス管理）
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

## 制約・前提条件
- Event-driven連携基盤の構築完了
- PostgreSQL統一基盤の稼働
- Redis Pub/Subシステムの準備
- 各システムの認証統合完了

## 関連技術判断
- [ADR-2025-01-03-003]: Event-driven vs REST API連携アーキテクチャ選択
- [SPEC-2025-01-03-002]: 統一認証基盤仕様書

## 変更履歴
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| v1.0 | 2025-01-03 | 初版作成（既存設計書からの移行） | 金子裕司 |

