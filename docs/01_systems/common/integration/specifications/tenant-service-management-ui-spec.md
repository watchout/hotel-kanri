# 🏢 テナントサービス管理画面仕様書

**作成日**: 2025年8月1日  
**バージョン**: 1.0.0  
**対象システム**: hotel-common 統合管理画面  
**優先度**: saasデモリリース後に実装

## 1. 基本情報

**目的**: グループ・チェーン・個別ホテルの階層構造に対応したサービス管理を提供する  
**対象ユーザー**: Adminテーブルに登録された管理者（階層別の権限を持つ）  
**主要機能**: 階層別のサービス管理、プラン設定、利用状況確認

## 2. 管理者権限レベル

1. **スーパー管理者（superadmin）**:
   - すべてのグループ、チェーン、ホテルのデータにアクセス可能
   - すべての機能を利用可能
   - システム全体の設定変更が可能

2. **グループ管理者（groupadmin）**:
   - 特定のグループとその配下のチェーン、ホテルのデータにアクセス可能
   - グループ全体のサービス設定、統計情報の閲覧が可能

3. **チェーン管理者（chainadmin）**:
   - 特定のチェーンとその配下のホテルのデータにアクセス可能
   - チェーン内のサービス設定、統計情報の閲覧が可能

4. **ホテル管理者（hoteladmin）**:
   - 特定のホテルのデータのみアクセス可能
   - ホテル単位のサービス設定、統計情報の閲覧が可能

## 3. 画面構成

### 3.1 ログイン画面
- 管理者メールアドレスとパスワードによる認証
- JWT認証トークンの発行（階層情報を含む）

### 3.2 ダッシュボード
- 管理者の権限レベルに応じた情報表示
- 階層別のサービス利用状況サマリー
- アラートや通知の表示

### 3.3 階層管理画面
- 組織階層のツリービュー表示
- グループ、チェーン、ホテル、部門の階層関係の表示・管理
- 権限に応じた編集機能

### 3.4 テナントサービス管理画面
1. **サービス一覧**:
   - 階層フィルター（グループ、チェーン、ホテル別）
   - サービスタイプフィルター（hotel-saas, hotel-pms, hotel-member）
   - ステータスフィルター（有効、無効）

2. **サービス詳細・編集**:
   - サービスの基本情報表示
   - プラン情報（economy, professional, enterprise, ultimate）
   - 業態情報（一般ホテル向け、レジャー向け、海外向け）
   - ステータス変更機能

3. **一括操作機能**:
   - 階層単位での一括サービス有効化/無効化
   - 階層単位でのプラン一括変更
   - 適用範囲選択（直接管理下のみ/すべての子階層を含む）

### 3.5 利用統計画面
- 階層別の利用統計グラフ
- サービス別の利用状況
- 期間指定によるトレンド表示
- エクスポート機能

### 3.6 請求管理画面
- 階層別の請求情報
- サービス別の料金内訳
- 支払い状況管理
- 請求書生成・ダウンロード機能

## 4. データモデル連携

### 4.1 管理者認証
```typescript
interface AdminAuth {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  adminLevel: 'superadmin' | 'groupadmin' | 'chainadmin' | 'hoteladmin';
  organizationId?: string; // 所属する組織ID（superadmin以外）
  lastLoginAt: Date;
}
```

### 4.2 階層アクセス管理
```typescript
interface HierarchicalAccess {
  adminId: string;
  organizationId: string;
  organizationType: 'GROUP' | 'BRAND' | 'HOTEL' | 'DEPARTMENT';
  accessLevel: 'FULL' | 'READ_ONLY' | 'MANAGE_ONLY';
}
```

### 4.3 テナントサービス表示・管理
```typescript
interface TenantServiceManagement {
  // 表示データ
  tenantId: string;
  tenantName: string;
  organizationPath: string; // "Group/Brand/Hotel"形式
  services: {
    serviceType: 'hotel-saas' | 'hotel-pms' | 'hotel-member';
    businessType: 'general' | 'leisure' | 'overseas';
    planType: 'economy' | 'professional' | 'enterprise' | 'ultimate';
    isActive: boolean;
    activatedAt: Date;
    monthlyPrice: number;
  }[];
  
  // 操作API
  updateService(serviceId: string, planType: string, isActive: boolean): Promise<boolean>;
  addService(serviceType: string, businessType: string, planType: string, isActive: boolean): Promise<boolean>;
  bulkUpdateServices(organizationId: string, updates: ServiceUpdate[], includeChildren: boolean): Promise<BulkUpdateResult>;
}
```

## 5. API仕様

### 5.1 認証API
- `POST /api/admin/auth/login`: 管理者ログイン
- `GET /api/admin/auth/me`: 現在のログイン情報取得

### 5.2 階層管理API
- `GET /api/admin/organizations`: 組織階層取得
- `GET /api/admin/organizations/:id`: 特定組織の詳細取得
- `GET /api/admin/organizations/:id/children`: 子組織一覧取得

### 5.3 テナントサービス管理API
- `GET /api/admin/organizations/:id/tenants`: 組織配下のテナント一覧取得
- `GET /api/admin/tenant-services/:tenantId`: テナントのサービス一覧取得
- `POST /api/admin/tenant-services/:tenantId`: テナントにサービス追加
- `PUT /api/admin/tenant-services/:tenantId/:serviceId`: テナントのサービス更新
- `POST /api/admin/organizations/:id/bulk-update`: 組織配下のサービス一括更新

### 5.4 利用統計API
- `GET /api/admin/statistics/organizations/:id`: 組織の利用統計取得
- `GET /api/admin/statistics/services/:serviceType`: サービス別統計取得
- `GET /api/admin/statistics/billing`: 請求統計取得

## 6. セキュリティ要件

- JWT認証による保護（階層情報を含む）
- 階層ベースのアクセス制御
- 操作ログの記録
- 重要操作の監査証跡
- CSRF保護
- XSS対策

## 7. UI/UX要件

- レスポンシブデザイン
- 階層構造の視覚的表現（ツリービュー）
- フィルタリングとソート機能
- 一括操作のための選択機能
- ダークモード対応
- 多言語対応（日本語・英語）

## 8. 実装フェーズ

1. **フェーズ1**: 基本認証と階層表示
   - 管理者ログイン機能
   - 階層構造の表示
   - 基本的なテナント一覧表示

2. **フェーズ2**: テナントサービス管理
   - テナント別サービス表示・編集
   - サービス追加機能
   - 基本的な統計表示

3. **フェーズ3**: 階層別一括管理
   - 組織単位の一括操作機能
   - 高度な統計・分析機能
   - 請求管理機能

4. **フェーズ4**: 高度な機能と最適化
   - パフォーマンス最適化
   - 高度なレポート機能
   - API連携機能の拡張

## 9. 既存システムとの連携

### 9.1 hotel-common連携
- 既存の階層管理システムとの統合
- JWT拡張による階層アクセス制御

### 9.2 各サービスとの連携
- hotel-saas: サービス利用状況の取得と設定反映
- hotel-pms: 予約・運営データの階層別表示
- hotel-member: 顧客データの階層別アクセス制御

## 10. 注意事項・制約

- saasデモリリース後に実装を開始
- 既存の管理画面との整合性を維持
- 段階的な機能追加による影響を最小化
- 大規模グループ（100店舗以上）でのパフォーマンス考慮

## 11. 今後の拡張性

- 代理店管理機能との統合
- AIによる利用分析・推奨機能
- モバイルアプリ対応
- 外部システム連携API拡張