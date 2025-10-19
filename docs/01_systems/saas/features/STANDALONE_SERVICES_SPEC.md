# スタンドアロンサービス仕様書

## 概要
Hotel SaaSプラットフォームにおいて、会員システムとPMSを単体サービスとして提供するための設計仕様。

## サービス分離アーキテクチャ

### ドメイン構成
```
hotel-saas.com (メインサイト・マーケティング)
├── app.hotel-saas.com (Room Service統合)
├── members.hotel-saas.com (会員システム専用)
├── pms.hotel-saas.com (PMS専用)
└── admin.hotel-saas.com (統合管理画面)
```

### アクセス制御マトリクス
| サービス | ドメイン | 管理画面パス | 対象プラン |
|---------|----------|-------------|-----------|
| Room Service | app.hotel-saas.com | /admin/room-service | Economy, Professional, Enterprise |
| 会員システム | members.hotel-saas.com | /admin/members | Member-Only, Professional, Enterprise |
| PMS | pms.hotel-saas.com | /admin/pms | PMS-Only, Professional, Enterprise |
| 統合 | hotel-saas.com | /admin | Professional, Enterprise |

## 会員システム単体仕様

### 機能範囲
#### 顧客向け機能
- 会員登録・ログイン
- プロフィール管理
- ポイント残高確認
- 予約履歴閲覧
- 特典・クーポン利用
- お気に入り管理

#### 管理者向け機能
- 会員情報管理
- ポイント付与・調整
- セグメント管理
- キャンペーン配信
- 利用統計分析
- CSV出力

### データベース設計
```sql
-- 会員管理
CREATE TABLE members (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  birthday DATE,
  gender VARCHAR(10),
  membership_level VARCHAR(20) DEFAULT 'bronze',
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ポイント履歴
CREATE TABLE point_transactions (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  member_id VARCHAR(36) REFERENCES members(id),
  type VARCHAR(20) NOT NULL, -- 'earn', 'redeem', 'expire', 'adjust'
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 会員セグメント
CREATE TABLE member_segments (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  conditions JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 料金プラン
```
会員システム単体: ¥19,800/月
├── 会員数: 無制限
├── ポイントシステム
├── セグメント管理
├── 基本分析機能
└── メール配信（月1000通まで）

会員システム Pro: ¥29,800/月
├── 上記機能 + 
├── 高度な分析機能
├── A/Bテスト機能
├── メール配信無制限
└── API連携
```

## PMS単体仕様

### 機能範囲
#### 予約管理
- 客室在庫管理
- 予約受付・変更・キャンセル
- 料金設定・プラン管理
- オーバーブッキング制御
- 予約確認書発行

#### 宿泊管理
- チェックイン・チェックアウト
- 客室割当管理
- 宿泊者情報管理
- 追加サービス管理
- 清掃状況管理

#### 売上管理
- 日次売上集計
- 料金別売上分析
- 客室稼働率
- ADR・RevPAR分析
- 会計システム連携

### データベース設計
```sql
-- 客室管理
CREATE TABLE rooms (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  room_number VARCHAR(20) NOT NULL,
  room_type_id VARCHAR(36) REFERENCES room_types(id),
  status VARCHAR(20) DEFAULT 'available', -- available, occupied, maintenance, cleaning
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 客室タイプ
CREATE TABLE room_types (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  capacity INTEGER NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  description TEXT,
  amenities JSON
);

-- 予約管理
CREATE TABLE reservations (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255),
  guest_phone VARCHAR(20),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  room_type_id VARCHAR(36) REFERENCES room_types(id),
  room_id VARCHAR(36) REFERENCES rooms(id),
  adults INTEGER NOT NULL,
  children INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, checked_in, checked_out, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 料金プラン
```
PMS単体: ¥39,800/月
├── 客室数: 100室まで
├── 予約管理機能
├── 宿泊管理機能
├── 基本レポート
└── メール通知

PMS Pro: ¥59,800/月
├── 上記機能 +
├── 客室数無制限
├── 高度な分析機能
├── 外部OTA連携
├── 収益最適化機能
└── API連携
```

## 統合管理画面設計

### モジュラー構成
```typescript
// 管理画面ナビゲーション設定
const adminModules = {
  roomService: {
    name: 'ルームサービス',
    icon: 'heroicons:shopping-cart',
    path: '/admin/room-service',
    requiredPlans: ['economy', 'professional', 'enterprise'],
    subModules: [
      { name: 'メニュー管理', path: '/admin/menu' },
      { name: 'オーダー管理', path: '/admin/orders' },
      { name: 'デバイス管理', path: '/admin/devices' }
    ]
  },
  
  memberSystem: {
    name: '会員システム',
    icon: 'heroicons:users',
    path: '/admin/members',
    requiredPlans: ['member-only', 'professional', 'enterprise'],
    subModules: [
      { name: '会員管理', path: '/admin/members/list' },
      { name: 'ポイント管理', path: '/admin/members/points' },
      { name: 'セグメント', path: '/admin/members/segments' }
    ]
  },
  
  pmsSystem: {
    name: 'PMS',
    icon: 'heroicons:building-office',
    path: '/admin/pms',
    requiredPlans: ['pms-only', 'professional', 'enterprise'],
    subModules: [
      { name: '予約管理', path: '/admin/pms/reservations' },
      { name: '客室管理', path: '/admin/pms/rooms' },
      { name: '売上分析', path: '/admin/pms/analytics' }
    ]
  }
}
```

### 権限管理
```typescript
// 管理者権限設定
interface AdminRole {
  id: string
  name: string
  permissions: string[]
  modules: string[]
}

const adminRoles: AdminRole[] = [
  {
    id: 'room-service-admin',
    name: 'ルームサービス管理者',
    permissions: ['room-service:read', 'room-service:write'],
    modules: ['roomService']
  },
  {
    id: 'member-admin', 
    name: '会員システム管理者',
    permissions: ['members:read', 'members:write'],
    modules: ['memberSystem']
  },
  {
    id: 'pms-admin',
    name: 'PMS管理者', 
    permissions: ['pms:read', 'pms:write'],
    modules: ['pmsSystem']
  },
  {
    id: 'super-admin',
    name: 'スーパー管理者',
    permissions: ['*'],
    modules: ['roomService', 'memberSystem', 'pmsSystem']
  }
]
```

## 実装戦略

### Phase 1: 基盤準備
1. **サブドメイン設定**
   - DNS設定とSSL証明書
   - サブドメイン別ルーティング
   - セッション管理の分離

2. **データベース分離**
   - 機能別テーブル設計
   - テナント分離の実装
   - マイグレーション計画

### Phase 2: 会員システム実装
1. **フロントエンド開発**
   - 会員登録・ログイン画面
   - マイページ機能
   - ポイント管理画面

2. **バックエンド開発**
   - 会員管理API
   - ポイントシステム
   - セグメント機能

### Phase 3: PMS実装
1. **予約管理システム**
   - 予約受付機能
   - 客室管理機能
   - 在庫管理システム

2. **宿泊管理システム**
   - チェックイン・アウト
   - 客室状況管理
   - 売上管理機能

### Phase 4: 統合・最適化
1. **管理画面統合**
   - モジュラー設計実装
   - 権限管理システム
   - 統合ダッシュボード

2. **パフォーマンス最適化**
   - キャッシュ戦略
   - データベース最適化
   - 監視・アラート設定

## 運用・保守

### 監視項目
- サブドメイン別アクセス状況
- 機能別利用状況
- パフォーマンスメトリクス
- エラー率・応答時間

### サポート体制
- サービス別サポート窓口
- 機能別FAQ
- オンボーディング支援
- トレーニング資料

### 課金・請求
- サービス別料金計算
- 統合請求書発行
- プラン変更処理
- 使用量監視 