# 🔐 PMS権限管理システム詳細仕様

## 📋 **概要**

ホテル別にカスタマイズ可能な役職・権限設定システムをPMSに実装する。

## 🎯 **要件**

### **基本要件**
- ホテル（tenant）ごとに独立した役職・権限設定
- デフォルト役職設定の提供
- 柔軟な権限マトリックス管理
- スタッフへの役職割り当て機能

### **ユースケース**
```
支配人: 全システム権限設定・管理
フロント: 予約・チェックイン業務権限
清掃スタッフ: 客室状況確認権限
キッチン: 注文確認権限
営繕担当: 設備管理権限
事務員: 売上データ確認権限
```

## 🗃️ **データベース設計**

### **Position（役職）テーブル**
```sql
CREATE TABLE positions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);
```

### **Permission（権限）テーブル**
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY,
  system VARCHAR(50) NOT NULL, -- 'hotel-pms', 'hotel-member', 'hotel-saas'
  resource VARCHAR(100) NOT NULL, -- 'reservation', 'customer', 'order'
  action VARCHAR(100) NOT NULL, -- 'view', 'create', 'update', 'delete'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **PositionPermission（役職権限関連）テーブル**
```sql
CREATE TABLE position_permissions (
  id UUID PRIMARY KEY,
  position_id UUID REFERENCES positions(id),
  permission_id UUID REFERENCES permissions(id),
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(position_id, permission_id)
);
```

### **StaffPosition（スタッフ役職割り当て）テーブル**
```sql
CREATE TABLE staff_positions (
  id UUID PRIMARY KEY,
  staff_id UUID NOT NULL, -- hotel-pmsのstaffテーブル参照
  position_id UUID REFERENCES positions(id),
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID NOT NULL, -- 割り当て実行者
  is_active BOOLEAN DEFAULT true,
  UNIQUE(staff_id, position_id) WHERE is_active = true
);
```

## 🎨 **UI設計**

### **1. 役職管理画面**
```
PATH: /admin/positions
権限: 支配人レベル（level 4-5）のみ

機能:
- 役職一覧表示
- 役職追加・編集・削除
- 役職の有効/無効切り替え
```

### **2. 権限マトリックス画面**
```
PATH: /admin/positions/:id/permissions
権限: 支配人レベル（level 4-5）のみ

機能:
- 役職別権限マトリックス表示
- システム別権限の一括設定
- 個別権限のON/OFF切り替え
```

### **3. スタッフ役職割り当て画面**
```
PATH: /admin/staff-positions
権限: 主任レベル（level 3-5）

機能:
- スタッフ一覧と現在の役職表示
- 役職割り当て・変更
- 割り当て履歴表示
```

## 🔧 **API設計**

### **役職管理API**
```typescript
// 役職一覧取得
GET /api/admin/positions
Response: Position[]

// 役職作成
POST /api/admin/positions
Body: { name, description, level }

// 役職更新
PUT /api/admin/positions/:id
Body: { name, description, level, is_active }

// 役職削除
DELETE /api/admin/positions/:id
```

### **権限管理API**
```typescript
// 利用可能権限一覧
GET /api/admin/permissions
Response: Permission[]

// 役職権限取得
GET /api/admin/positions/:id/permissions
Response: PositionPermission[]

// 役職権限更新
PUT /api/admin/positions/:id/permissions
Body: { permissions: { permission_id, granted }[] }
```

### **スタッフ役職API**
```typescript
// スタッフ役職一覧
GET /api/admin/staff-positions
Response: StaffPosition[]

// スタッフ役職割り当て
POST /api/admin/staff-positions
Body: { staff_id, position_id }

// スタッフ役職変更
PUT /api/admin/staff-positions/:staff_id
Body: { position_id }
```

## 📊 **デフォルトデータ**

### **デフォルト役職**
```typescript
const defaultPositions = [
  { name: '支配人', level: 5, description: '全権限' },
  { name: 'フロント主任', level: 4, description: 'フロント業務管理' },
  { name: 'フロントスタッフ', level: 3, description: '基本フロント業務' },
  { name: '清掃スタッフ', level: 2, description: '客室管理' },
  { name: 'キッチンスタッフ', level: 2, description: '注文対応' },
  { name: '営繕担当', level: 2, description: '設備管理' },
  { name: '事務員', level: 3, description: '事務処理' },
  { name: '研修生', level: 1, description: '参照権限のみ' }
];
```

### **デフォルト権限マッピング**
```typescript
const defaultPermissions = {
  'hotel-pms': [
    { resource: 'reservation', actions: ['view', 'create', 'update', 'cancel'] },
    { resource: 'checkin', actions: ['execute'] },
    { resource: 'checkout', actions: ['execute'] },
    { resource: 'room_status', actions: ['view', 'update'] },
    { resource: 'billing', actions: ['view', 'modify'] },
    { resource: 'reports', actions: ['view', 'export'] },
    { resource: 'system_settings', actions: ['view', 'update'] }
  ],
  'hotel-member': [
    { resource: 'customer', actions: ['view', 'create', 'update'] },
    { resource: 'points', actions: ['view', 'award', 'redeem'] },
    { resource: 'membership', actions: ['view', 'upgrade'] }
  ],
  'hotel-saas': [
    { resource: 'order', actions: ['view', 'create', 'update', 'cancel'] },
    { resource: 'service', actions: ['view', 'configure'] },
    { resource: 'menu', actions: ['view', 'update'] }
  ]
};
```

## 🔐 **セキュリティ仕様**

### **権限チェック機能**
```typescript
// 権限チェックヘルパー関数
async function hasPermission(
  staffId: string, 
  system: string, 
  resource: string, 
  action: string
): Promise<boolean>

// 使用例
if (!await hasPermission(staffId, 'hotel-pms', 'reservation', 'cancel')) {
  throw new Error('権限がありません');
}
```

### **操作ログ**
```sql
CREATE TABLE permission_logs (
  id UUID PRIMARY KEY,
  staff_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(100),
  result VARCHAR(20), -- 'success', 'denied'
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🧪 **実装優先度**

### **Phase 1: 基本機能**
1. データベーステーブル作成
2. デフォルトデータ投入
3. 基本API実装
4. 権限チェック機能

### **Phase 2: UI実装**
1. 役職管理画面
2. 権限マトリックス画面
3. スタッフ割り当て画面

### **Phase 3: 統合・最適化**
1. 他システムとの権限連携
2. 操作ログ機能
3. 権限継承機能

## 📝 **Luna実装時の注意点**

1. **tenant_id必須**: 全権限操作でマルチテナント対応
2. **レベル互換性**: 既存level(1-5)フィールドとの整合性維持
3. **セキュリティ**: 権限昇格防止の実装
4. **パフォーマンス**: 権限チェックの高速化（キャッシュ機能）
5. **監査**: 権限変更の完全な履歴記録

## 🔄 **既存システムとの統合**

### **JWT連携**
```typescript
// JWTペイロードに権限情報を含める
interface JWTPayload {
  staff_id: string;
  tenant_id: string;
  positions: {
    id: string;
    name: string;
    level: number;
    permissions: string[];
  }[];
}
```

### **他システム権限確認**
```typescript
// hotel-commonライブラリで権限確認
import { checkPermission } from 'hotel-common';

const hasAccess = await checkPermission(
  jwtToken, 
  'hotel-member', 
  'customer', 
  'view'
);
``` 