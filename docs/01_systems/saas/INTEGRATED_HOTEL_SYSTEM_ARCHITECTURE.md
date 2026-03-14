# 総合ホテルシステム アーキテクチャ設計書

## 1. システム概要

### 1.1 システム構成
```
統合管理コンソール
├── AIコンシェルジュシステム（現在のシステム）
├── 会員・予約システム（新規開発）
└── PMS（Property Management System）（新規開発）
```

### 1.2 提供形態
- **単体提供**: 各システムを個別に提供
- **統合提供**: 全システムを連携して提供
- **段階的導入**: 必要なシステムから順次導入

## 2. データベース設計

### 2.1 共通データベース方式を採用
**理由**: 
- データ整合性の確保
- リアルタイム連携の実現
- 開発・運用コストの削減

### 2.2 テナント分離設計
```sql
-- 全テーブルにtenant_idを追加
-- Row Level Security (RLS) で完全分離
-- スキーマレベルでの分離も検討
```

### 2.3 主要テーブル設計
```sql
-- 既存テーブルの拡張
ALTER TABLE orders ADD COLUMN tenant_id VARCHAR(255);
ALTER TABLE menu_items ADD COLUMN tenant_id VARCHAR(255);
ALTER TABLE devices ADD COLUMN tenant_id VARCHAR(255);

-- 新規テーブル
CREATE TABLE guests (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  member_id VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  guest_id INTEGER REFERENCES guests(id),
  room_id INTEGER REFERENCES rooms(id),
  checkin_date DATE NOT NULL,
  checkout_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'confirmed',
  total_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 3. 管理画面設計

### 3.1 統合ダッシュボード
```vue
<!-- 統合管理画面のメイン構成 -->
<template>
  <div class="integrated-dashboard">
    <!-- 統合ヘッダー -->
    <UnifiedHeader />
    
    <!-- システム切り替えタブ -->
    <SystemTabs 
      :active-system="activeSystem"
      @switch="switchSystem"
    />
    
    <!-- 各システムの管理画面 -->
    <component :is="currentSystemComponent" />
    
    <!-- 統合サイドバー -->
    <IntegratedSidebar />
  </div>
</template>
```

### 3.2 システム別管理画面
- **AIコンシェルジュ**: 現在の管理画面を活用
- **会員・予約**: 新規開発（現在のUIデザインに準拠）
- **PMS**: 新規開発（現在のUIデザインに準拠）

## 4. API設計

### 4.1 統合API構成
```
/api/v1/
├── auth/          # 認証・認可
├── tenants/       # テナント管理
├── concierge/     # AIコンシェルジュ（既存）
├── members/       # 会員管理（新規）
├── reservations/  # 予約管理（新規）
├── pms/          # PMS機能（新規）
└── integration/   # システム間連携
```

### 4.2 認証・認可設計
```typescript
// JWT + Role-Based Access Control
interface UserToken {
  userId: string;
  tenantId: string;
  role: 'super_admin' | 'tenant_admin' | 'staff' | 'guest';
  permissions: string[];
  systems: ('concierge' | 'reservation' | 'pms')[];
}
```

## 5. 段階的実装計画

### Phase 1: マルチテナント基盤（1-2ヶ月）
- [ ] テナント管理機能の強化
- [ ] 認証システムの統合
- [ ] データベースのマルチテナント化
- [ ] 統合管理画面の基盤構築

### Phase 2: 会員・予約システム（3-4ヶ月）
- [ ] 会員管理機能
- [ ] 予約管理機能
- [ ] 決済システム連携
- [ ] 統合ダッシュボード

### Phase 3: PMS機能（4-6ヶ月）
- [ ] 客室管理
- [ ] 清掃管理
- [ ] 在庫管理
- [ ] レポート機能

### Phase 4: 高度な連携（6-8ヶ月）
- [ ] システム間データ連携
- [ ] 統合分析機能
- [ ] モバイルアプリ
- [ ] 外部システム連携

## 6. 技術的考慮事項

### 6.1 データベース移行
```bash
# SQLite → PostgreSQL移行
# 1. スキーマ変換
# 2. データ移行
# 3. アプリケーション修正
# 4. 段階的切り替え
```

### 6.2 パフォーマンス対策
- **データベース**: 適切なインデックス設計
- **API**: キャッシュ戦略（Redis）
- **フロントエンド**: 遅延読み込み、仮想スクロール

### 6.3 セキュリティ
- **データ分離**: Row Level Security
- **API認証**: JWT + OAuth2.0
- **通信暗号化**: HTTPS/WSS
- **監査ログ**: 全操作の記録

## 7. 運用・保守

### 7.1 モニタリング
- **アプリケーション**: APM（Application Performance Monitoring）
- **データベース**: クエリ性能監視
- **インフラ**: リソース使用率監視

### 7.2 バックアップ・復旧
- **データベース**: 定期バックアップ + Point-in-time Recovery
- **ファイル**: 分散ストレージ
- **設定**: Infrastructure as Code

## 8. コスト試算

### 8.1 開発コスト
- **Phase 1**: 200-300万円
- **Phase 2**: 400-600万円
- **Phase 3**: 500-700万円
- **Phase 4**: 300-400万円

### 8.2 運用コスト（月額）
- **インフラ**: 5-10万円
- **保守・運用**: 10-20万円
- **ライセンス**: 5-10万円

## 9. リスクと対策

### 9.1 技術的リスク
- **データ移行**: 段階的移行で最小化
- **性能劣化**: 事前性能テスト
- **セキュリティ**: 定期的セキュリティ監査

### 9.2 事業的リスク
- **開発遅延**: アジャイル開発で早期フィードバック
- **品質問題**: 自動テスト + 品質管理
- **運用負荷**: 運用自動化

## 10. 結論

現在のシステムを基盤として、段階的に機能を拡張していく**進化型アーキテクチャ**が最適です。

**推奨アプローチ**:
1. 現在のシステムのマルチテナント化
2. 会員・予約システムの段階的追加
3. PMS機能の統合
4. 高度な連携機能の実装

この方式により、**開発リスクを最小化**しながら、**総合ホテルシステム**を効率的に構築できます。 