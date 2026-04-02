# Hotel SaaS 機能実装ロードマップ

## 📋 概要

### **対象機能**
1. **商品原価・利益分析機能**: 戦略的なマーケティング施策の基盤構築
2. **フロント業務機能**: チェックイン・会計・チェックアウトのデジタル化
3. **キャンペーン機能**: 期間限定・条件付きの商品割引システム

### **実装優先度と理由**

#### **優先度 A: 商品原価機能（Phase 1）**
**理由**: 既存の統計分析システムとの親和性が高く、影響範囲が限定的
- データベース変更が最小限（MenuItemテーブルの1フィールド追加）
- 既存APIの拡張のみで実装可能
- フロント業務機能の基盤として利益データが必要

#### **優先度 B: フロント業務機能**
**理由**: システム全体への影響が大きく、慎重な設計と実装が必要
- 新規テーブル作成とミドルウェア実装
- 既存認証システムとの統合
- 客室状態管理による注文制限ロジック

#### **優先度 C: キャンペーン機能**
**理由**: マーケティング強化のための追加機能、基本システムの安定後に実装
- 複雑な時間制限ロジック
- 既存注文システムとの密接な統合
- 利益分析機能と連携した効果測定

## 🗓️ 実装スケジュール (8週間)

### **第1週 - 第2週: 商品原価機能 Phase 1**

#### **Week 1: データベース基盤**
- [ ] **Day 1-2**: Prismaスキーマ更新とマイグレーション作成
- [ ] **Day 3-4**: 商品管理画面への原価フィールド追加
- [ ] **Day 5**: 基本的な利益計算機能とバリデーション

#### **Week 2: 分析機能拡張**
- [ ] **Day 1-2**: 商品分析APIの利益データ対応
- [ ] **Day 3-4**: 統計ダッシュボードの利益KPI追加
- [ ] **Day 5**: テスト実装とデバッグ

### **第3週 - 第5週: フロント業務機能 Phase 1**

#### **Week 3: 基盤構築**
- [ ] **Day 1-2**: データベーステーブル設計と作成
- [ ] **Day 3-4**: 客室状態管理API実装
- [ ] **Day 5**: チェックイン・チェックアウトAPI実装

#### **Week 4: 会計システム**
- [ ] **Day 1-2**: 会計処理API実装
- [ ] **Day 3-4**: Web領収書システム構築
- [ ] **Day 5**: QRコード生成とPDF出力機能

#### **Week 5: 統合とUI**
- [ ] **Day 1-2**: フロントダッシュボード実装
- [ ] **Day 3-4**: ルームサービス制限ミドルウェア
- [ ] **Day 5**: E2Eテストと統合テスト

### **第6週 - 第7週: キャンペーン機能 Phase 1**

#### **Week 6: キャンペーン基盤**
- [ ] **Day 1-2**: キャンペーンテーブル作成とマイグレーション
- [ ] **Day 3-4**: キャンペーン管理API実装
- [ ] **Day 5**: 時間制限ロジック実装

#### **Week 7: 客室UI統合**
- [ ] **Day 1-2**: 動的価格表示機能
- [ ] **Day 3-4**: 注文時キャンペーン適用処理
- [ ] **Day 5**: キャンペーン管理画面UI

### **第8週: 統合・最適化・利益最適化機能**
- [ ] **Day 1-2**: 全機能の統合テスト
- [ ] **Day 3**: 客室UI側の利益率向上施策
- [ ] **Day 4**: おすすめ商品システム実装
- [ ] **Day 5**: 全体テストと調整

## 📊 詳細実装計画

### **商品原価機能 実装詳細**

#### **データベース変更**
```sql
-- Migration: 20240XXX_add_cost_price_to_menu_item.sql
ALTER TABLE MenuItem ADD COLUMN costPrice INTEGER;
CREATE INDEX idx_menuitem_costprice ON MenuItem(costPrice);
```

#### **API拡張タスク**
```typescript
// 1. 商品管理API拡張
// server/api/v1/admin/menu/index.post.ts
// server/api/v1/admin/menu/[id].put.ts

// 2. 商品分析API拡張  
// server/api/v1/admin/statistics/popular-products.get.ts

// 3. KPI統計API拡張
// server/api/v1/admin/statistics/kpis.get.ts
```

#### **フロントエンド更新**
```vue
<!-- 1. 商品登録・編集フォーム -->
<!-- pages/admin/menu/index.vue -->
<!-- pages/admin/menu/[id]/edit.vue -->

<!-- 2. 商品分析画面 -->
<!-- pages/admin/statistics/popular-products.vue -->

<!-- 3. ダッシュボード -->
<!-- pages/admin/statistics/index.vue -->
```

### **フロント業務機能 実装詳細**

#### **新規テーブル作成**
```sql
-- Migration: 20240XXX_create_room_status_table.sql
CREATE TABLE RoomStatus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    roomId TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    checkinAt DATETIME,
    checkoutAt DATETIME,
    guestCount INTEGER,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migration: 20240XXX_create_receipt_table.sql
CREATE TABLE Receipt (
    id TEXT PRIMARY KEY,
    roomId TEXT NOT NULL,
    receiptData JSON NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isDeleted BOOLEAN NOT NULL DEFAULT FALSE
);
```

#### **新規API作成**
```typescript
// フロント業務API
server/api/v1/admin/front-desk/
├── checkin.post.ts
├── rooms.get.ts
├── billing/
│   └── [roomId].get.ts
│   └── [roomId]/
│       └── confirm.post.ts
└── checkout/
    └── [roomId].post.ts

// 領収書API
server/api/v1/receipt/
├── [receiptId].get.ts
└── [receiptId]/
    └── pdf.get.ts
```

#### **フロントエンド新規作成**
```vue
<!-- フロント業務画面 -->
pages/admin/front-desk/
├── index.vue          <!-- ダッシュボード -->
├── checkin.vue        <!-- チェックイン -->
├── billing.vue        <!-- 会計処理 -->
└── checkout.vue       <!-- チェックアウト -->

<!-- 領収書表示 -->
pages/receipt/
└── [receiptId].vue    <!-- Web領収書 -->
```

#### **ミドルウェア実装**
```typescript
// ルームサービス制限
server/middleware/room-status-check.ts

// 客室状態同期
server/middleware/room-sync.ts
```

### **キャンペーン機能 実装詳細**

#### **データベース変更**
```sql
-- Migration: 20240XXX_create_campaign_tables.sql
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

CREATE TABLE CampaignItem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaignId INTEGER NOT NULL,
    menuItemId INTEGER NOT NULL,
    FOREIGN KEY (campaignId) REFERENCES Campaign(id),
    FOREIGN KEY (menuItemId) REFERENCES MenuItem(id),
    UNIQUE(campaignId, menuItemId)
);

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
```

#### **キャンペーン API 作成**
```typescript
// キャンペーン管理API
server/api/v1/admin/campaigns/
├── index.get.ts           <!-- キャンペーン一覧 -->
├── index.post.ts          <!-- キャンペーン作成 -->
├── [id].get.ts            <!-- キャンペーン詳細 -->
├── [id].put.ts            <!-- キャンペーン更新 -->
├── [id].delete.ts         <!-- キャンペーン削除 -->
└── [id]/
    └── analytics.get.ts   <!-- キャンペーン効果分析 -->

// 客室側API
server/api/v1/campaigns/
├── check.get.ts           <!-- キャンペーン適用確認 -->
└── active.get.ts          <!-- アクティブキャンペーン一覧 -->
```

#### **フロントエンド新規作成**
```vue
<!-- キャンペーン管理画面 -->
pages/admin/campaigns/
├── index.vue              <!-- キャンペーン一覧 -->
├── create.vue             <!-- キャンペーン作成 -->
├── [id]/
│   ├── edit.vue           <!-- キャンペーン編集 -->
│   └── analytics.vue      <!-- 効果分析 -->

<!-- 客室UI更新 -->
components/MenuItemCard.vue <!-- 動的価格表示対応 -->
```

#### **注文システム拡張**
```typescript
// 注文時キャンペーン適用処理
server/api/v1/orders/index.post.ts
<!-- キャンペーン価格計算ロジック追加 -->

// 既存Order関連テーブル拡張
<!-- CampaignUsageLog リレーション追加 -->
```

## ⚠️ 実装時の注意点

### **データベース管理**
- **厳格なマイグレーション管理**: 既存データへの影響を最小限に
- **バックアップ必須**: 実装前の完全なデータベースバックアップ
- **段階的リリース**: 機能単位での段階的な本番投入

### **既存機能への影響**
- **統計分析システム**: 利益データ追加時の既存レポートへの影響確認
- **注文システム**: ルームサービス制限によるユーザー体験の変化
- **認証システム**: 客室状態管理と既存認証の整合性

### **パフォーマンス考慮**
- **インデックス最適化**: 新規フィールドへの適切なインデックス設定
- **キャッシュ戦略**: 頻繁にアクセスされる客室状態データのキャッシュ
- **クエリ最適化**: 利益計算を含む統計クエリの最適化

### **キャンペーン機能特有の注意点**
- **時間制限の正確性**: タイムゾーン考慮とリアルタイム判定
- **価格整合性**: キャンペーン適用時の税込み計算精度
- **並行処理**: 使用回数制限時の競合状態対策
- **データ整合性**: 注文後のキャンペーン変更によるデータ不整合防止

## 🧪 テスト戦略

### **テスト優先度**

#### **クリティカル（優先度A）**
- [ ] 会計計算ロジックの正確性
- [ ] 客室状態遷移の整合性
- [ ] ルームサービス制限の動作
- [ ] データマイグレーションの安全性

#### **重要（優先度B）**
- [ ] 利益分析データの精度
- [ ] 領収書生成機能
- [ ] UI/UXの一貫性
- [ ] パフォーマンス要件

#### **通常（優先度C）**
- [ ] エラーメッセージの適切性
- [ ] ログ出力の充実
- [ ] ドキュメント整合性

### **キャンペーン機能テスト優先度**

#### **クリティカル（優先度A）**
- [ ] 時間制限ロジックの境界値テスト
- [ ] 複数キャンペーン適用時の優先度テスト
- [ ] 使用回数制限の並行処理テスト
- [ ] 価格計算の精度テスト

#### **重要（優先度B）**
- [ ] キャンペーン管理画面の操作性テスト
- [ ] 客室UI価格表示の動的更新テスト
- [ ] キャンペーン効果分析の正確性
- [ ] モバイルデバイスでの表示テスト

### **テスト環境構築**
```bash
# テストデータ作成スクリプト
npm run seed:test-data

# 統合テスト実行
npm run test:integration

# E2Eテスト実行
npm run test:e2e

# パフォーマンステスト
npm run test:performance
```

## 📈 成功指標とモニタリング

### **技術指標**
- [ ] API レスポンス時間: < 200ms
- [ ] データベースクエリパフォーマンス: 改善前比 < 5%劣化
- [ ] システム稼働率: > 99.9%
- [ ] メモリ使用量: 増加 < 10%

### **ビジネス指標**
- [ ] フロント業務効率: 処理時間 50%短縮
- [ ] 原価データ入力率: > 80%
- [ ] 利益分析機能使用率: > 60%
- [ ] 領収書発行率: > 90%

### **モニタリング設定**
```typescript
// パフォーマンス監視
server/middleware/performance-monitor.ts

// エラー追跡
server/middleware/error-tracker.ts

// ビジネスメトリクス
server/api/v1/admin/metrics/
├── performance.get.ts
├── business.get.ts
└── usage.get.ts
```

### **キャンペーン機能指標**
- [ ] キャンペーン作成・管理時間: < 5分
- [ ] 価格計算処理時間: < 100ms
- [ ] キャンペーン適用率: > 70%
- [ ] 非ピーク時間帯売上向上: > 30%

### **統合ビジネス指標**
- [ ] フロント業務効率: 処理時間 50%短縮
- [ ] 原価データ入力率: > 80%
- [ ] 利益分析機能使用率: > 60%
- [ ] 領収書発行率: > 90%
- [ ] キャンペーン効果によるLTV向上: > 15%

## 🔄 リスク管理

### **技術リスク**

#### **高リスク**
- **データベース整合性**: 既存データとの不整合
- **パフォーマンス劣化**: 大量データでの処理速度低下
- **認証システム干渉**: 既存認証ロジックとの競合

**対策**:
- 段階的リリースとロールバック準備
- 負荷テストの徹底実施
- 認証フローの詳細テスト

#### **中リスク**
- **UI/UX 不整合**: 既存画面との操作性の乖離
- **API 仕様変更**: 既存クライアントへの影響
- **データ移行失敗**: 旧システムからの移行時エラー

**対策**:
- デザインシステムの一貫性確保
- API バージョニング戦略
- 移行テストの反復実施

### **ビジネスリスク**

#### **運用リスク**
- **スタッフ教育不足**: 新システムの操作ミス
- **システム依存度**: 障害時の業務停止
- **データ消失**: 重要な会計データの損失

**対策**:
- 操作マニュアル整備と研修実施
- フォールバック手順の策定
- 自動バックアップシステム強化

#### **キャンペーン機能固有リスク**

#### **技術リスク**
- **価格計算バグ**: 顧客に損失を与える可能性
- **時間制限の誤判定**: 無効なキャンペーン適用
- **パフォーマンス劣化**: 複雑なクエリによる応答速度低下

**対策**:
- 価格計算の二重チェックシステム
- 時間制限ロジックの単体テスト徹底
- クエリ最適化とキャッシュ戦略

#### **ビジネスリスク**
- **利益圧迫**: 過度な割引による収益悪化
- **顧客混乱**: 複雑なキャンペーン条件
- **運用負荷**: キャンペーン管理の複雑化

**対策**:
- 利益率を考慮したキャンペーン設計支援
- シンプルで分かりやすいUI設計
- 自動化による運用効率化

## 📚 関連ドキュメント

### **設計ドキュメント**
- [商品原価・利益分析機能要件定義書](./COST_PROFIT_ANALYSIS.md)
- [フロント業務機能要件定義書](./FRONT_DESK_OPERATIONS.md)
- [統計・分析機能要件定義書](../statistics/REQUIREMENTS.md)

### **技術ドキュメント**
- [データベース設計](../database/SCHEMA_DESIGN.md)
- [API 仕様書](../api/API_SPECIFICATIONS.md)
- [セキュリティガイドライン](../security/SECURITY_GUIDELINES.md)

### **運用ドキュメント**
- [デプロイメント手順](../deployment/DEPLOYMENT_GUIDE.md)
- [モニタリング設定](../monitoring/MONITORING_SETUP.md)
- [トラブルシューティング](../troubleshooting/TROUBLESHOOTING_GUIDE.md)

---

## 📞 クーポン管理システムについて

### **推奨アプローチ**

**MVP段階**: Hotel SaaS側でシンプルな固定割引機能
```typescript
interface SimpleDiscount {
  type: 'percentage' | 'fixed_amount';
  value: number;
  condition?: {
    minOrderAmount?: number;
    applicableCategories?: number[];
  };
}
```

**将来拡張**: メンバーシップシステムとの統合
- Hotel SaaS: リアルタイム在庫・注文処理
- メンバーシップ: 顧客情報・複雑なキャンペーン管理
- API連携: クーポン検証とポイント連携

**実装優先度**: フェーズ3（基本機能実装後）

---

## 📞 キャンペーン vs クーポン比較分析

### **提案理由**

#### **キャンペーンのメリット**
1. **シンプルな顧客体験**: 商品を見た瞬間に割引価格が分かる
2. **管理コストの軽減**: コード発行・配布・回収の手間がない
3. **戦略的価格設定**: 時間帯・曜日・季節による柔軟な価格戦略
4. **効果測定の容易さ**: 期間・商品別の明確な効果分析

#### **ホテル業界での有効性**
- **朝食タイムセール**: 7:00-9:00限定で朝食メニュー20%オフ
- **深夜割引**: 22:00以降のルームサービス全品15%オフ
- **平日限定**: 月-木曜日の特定商品¥100引き
- **季節メニュー**: 期間限定メニューの特別価格設定

### **クーポンとの使い分け**

**キャンペーン（推奨）**:
- 時間帯・期間限定の価格戦略
- 特定商品の売上促進
- 在庫消化・季節対応

**クーポン（将来検討）**:
- 顧客ロイヤルティプログラム
- 特別な記念日・イベント
- リピート促進施策

---

**更新履歴**
- 2024/XX/XX: 初版作成
- 2024/XX/XX: クーポン管理方針追加
- 2024/XX/XX: キャンペーン機能追加、8週間スケジュールに拡張 