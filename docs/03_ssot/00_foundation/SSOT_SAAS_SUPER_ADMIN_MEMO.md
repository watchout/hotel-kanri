# SSOT_SAAS_SUPER_ADMIN.md 作成メモ

**作成予定日**: 未定  
**優先度**: 🟡 高  
**ステータス**: 📝 メモ段階

---

## 📋 スーパーアドミンSSOTに含めるべき内容

このメモは、SSOT_SAAS_SUPER_ADMIN.md作成時の参考資料です。

---

## 🎯 スーパーアドミン画面の概要

### 目的
システム全体の基幹設定を管理するための総合管理画面

### 対象ユーザー
- システム管理者（我々）
- スーパーアドミン権限を持つユーザー

### アクセス方法
- 独立したサブドメインまたは特別なパス
- 高度な認証（2FA推奨）

---

## 📊 主要機能

### 1. テナント管理機能

#### テナントCRUD
- **テナント作成API**: `POST /api/v1/tenants`
  ```typescript
  router.post('/tenants', async (req, res) => {
    const { name, domain, planType, contactEmail } = req.body
    
    // バリデーション
    if (!name || !domain || !planType) {
      return res.status(400).json({ error: 'Required fields missing' })
    }
    
    // テナント作成
    const tenant = await prisma.tenant.create({
      data: {
        id: `tenant-${generateUuid()}`,
        name,
        domain,
        planType,
        contactEmail,
        status: 'active'
      }
    })
    
    return res.json({ success: true, data: tenant })
  })
  ```

- **テナント更新API**: `PUT /api/v1/tenants/:id`
- **テナント削除API**: `DELETE /api/v1/tenants/:id`
- **テナント一覧API**: `GET /api/v1/tenants`
- **テナント詳細API**: `GET /api/v1/tenants/:id`

#### テナント登録フロー
- ウィザード形式のUI
- 基本情報入力
- プラン選択
- 初期設定
- 確認・作成

#### テナント状態管理
- active（有効）
- suspended（一時停止）
- deleted（削除済み）

---

### 2. 料金プラン管理機能

#### プランマスター管理
- **プラン作成API**: `POST /api/v1/plans`
- **プラン更新API**: `PUT /api/v1/plans/:id`
- **プラン削除API**: `DELETE /api/v1/plans/:id`
- **プラン一覧API**: `GET /api/v1/plans`

#### プラン定義
```typescript
interface Plan {
  id: string
  systemType: 'hotel-saas' | 'hotel-pms' | 'hotel-member'
  businessType: 'leisure' | 'omotenasuai'
  planType: 'economy' | 'professional' | 'enterprise'
  planCategory: string
  
  // 料金設定
  monthlyPrice: number
  
  // 機能制限
  maxDevices: number
  enableAiConcierge: boolean
  enableMultilingual: boolean
  enableLayoutEditor: boolean
  maxMonthlyOrders: number
  maxMonthlyAiRequests: number
  maxStorageGB: number
  
  // その他
  displayName: string
  description: string
  isActive: boolean
}
```

#### プラン変更フロー
- テナントに対するプラン適用
- プラン変更時の影響確認
- 段階的なロールアウト
- ダウングレード時のデータ保持

---

### 3. AI管理機能

#### AIモデル管理
- 利用可能なモデル一覧
- モデル切り替え
- モデル設定（temperature、max_tokens等）
- モデルごとのコスト設定

#### クレジット管理
- テナントごとのクレジット割り当て
- クレジット消費量追跡
- クレジット補充
- クレジット消費履歴

#### AI使用統計
- テナントごとのAI使用量
- モデルごとの使用統計
- コスト分析
- 異常検知

---

### 4. 使用量モニタリング機能

#### 監視項目
- デバイス数
- 注文数
- AI使用量（トークン数）
- ストレージ使用量
- API呼び出し数

#### リアルタイムダッシュボード
- テナントごとの使用状況
- 制限値に対する使用率
- トレンド分析
- コスト予測

---

### 5. アラート機能

#### アラート種類
- 使用量上限到達（90%、100%）
- 異常な使用パターン検知
- セキュリティアラート
- システムエラー
- 支払い遅延

#### 通知方法
- メール通知
- Slack通知
- SMS通知（緊急時）
- 管理画面内通知

#### アラート設定
- 閾値設定
- 通知先設定
- 通知頻度設定
- アラートの優先度

---

### 6. システム全体設定

#### グローバル設定
- デフォルトプラン設定
- システム全体の機能ON/OFF
- メンテナンスモード
- APIレート制限

#### セキュリティ設定
- パスワードポリシー
- セッションタイムアウト
- IPホワイトリスト
- 2FA強制

---

## 🗄️ データベース設計

### 主要テーブル

#### tenants
- マルチテナントSSOTで定義済み
- スーパーアドミンから管理

#### system_plan_restrictions
- マルチテナントSSOTで定義済み
- スーパーアドミンから動的に編集可能

#### super_admin_users（新規）
```prisma
model SuperAdminUser {
  id                String    @id @default(uuid())
  email             String    @unique
  password_hash     String
  name              String
  role              String    // 'super_admin', 'admin'
  is_active         Boolean   @default(true)
  last_login_at     DateTime?
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  
  @@map("super_admin_users")
}
```

#### tenant_usage_logs（新規）
```prisma
model TenantUsageLog {
  id                String    @id @default(uuid())
  tenant_id         String
  date              DateTime  @db.Date
  device_count      Int
  order_count       Int
  ai_token_count    Int
  storage_gb        Float
  api_call_count    Int
  created_at        DateTime  @default(now())
  
  tenant            Tenant    @relation(fields: [tenant_id], references: [id])
  
  @@unique([tenant_id, date])
  @@map("tenant_usage_logs")
}
```

#### ai_credit_transactions（新規）
```prisma
model AiCreditTransaction {
  id                String    @id @default(uuid())
  tenant_id         String
  amount            Int       // クレジット量（正：追加、負：消費）
  type              String    // 'allocation', 'consumption', 'refund'
  description       String?
  model_name        String?
  token_count       Int?
  created_at        DateTime  @default(now())
  
  tenant            Tenant    @relation(fields: [tenant_id], references: [id])
  
  @@map("ai_credit_transactions")
}
```

#### system_alerts（新規）
```prisma
model SystemAlert {
  id                String    @id @default(uuid())
  tenant_id         String?   // nullの場合はシステム全体のアラート
  alert_type        String    // 'usage_limit', 'security', 'payment', etc.
  severity          String    // 'low', 'medium', 'high', 'critical'
  title             String
  message           String
  is_resolved       Boolean   @default(false)
  resolved_at       DateTime?
  resolved_by       String?
  created_at        DateTime  @default(now())
  
  tenant            Tenant?   @relation(fields: [tenant_id], references: [id])
  
  @@map("system_alerts")
}
```

---

## 🔌 API設計

### 認証
- スーパーアドミン専用の認証エンドポイント
- 2FA対応
- セッション管理

### エンドポイント一覧

#### テナント管理
- `GET /api/v1/super-admin/tenants` - テナント一覧
- `GET /api/v1/super-admin/tenants/:id` - テナント詳細
- `POST /api/v1/super-admin/tenants` - テナント作成
- `PUT /api/v1/super-admin/tenants/:id` - テナント更新
- `DELETE /api/v1/super-admin/tenants/:id` - テナント削除

#### プラン管理
- `GET /api/v1/super-admin/plans` - プラン一覧
- `GET /api/v1/super-admin/plans/:id` - プラン詳細
- `POST /api/v1/super-admin/plans` - プラン作成
- `PUT /api/v1/super-admin/plans/:id` - プラン更新
- `DELETE /api/v1/super-admin/plans/:id` - プラン削除
- `POST /api/v1/super-admin/tenants/:id/change-plan` - プラン変更

#### AI管理
- `GET /api/v1/super-admin/ai/models` - AIモデル一覧
- `PUT /api/v1/super-admin/ai/models/:id` - モデル設定更新
- `GET /api/v1/super-admin/ai/credits/:tenantId` - クレジット残高
- `POST /api/v1/super-admin/ai/credits/allocate` - クレジット割り当て
- `GET /api/v1/super-admin/ai/usage/:tenantId` - 使用統計

#### 使用量監視
- `GET /api/v1/super-admin/usage/overview` - 全体概要
- `GET /api/v1/super-admin/usage/:tenantId` - テナント別使用量
- `GET /api/v1/super-admin/usage/:tenantId/history` - 使用履歴

#### アラート管理
- `GET /api/v1/super-admin/alerts` - アラート一覧
- `GET /api/v1/super-admin/alerts/:id` - アラート詳細
- `POST /api/v1/super-admin/alerts/:id/resolve` - アラート解決

---

## 🎨 UI/UX設計

### レイアウト
- サイドバーナビゲーション
- ダッシュボードトップ
- 詳細画面
- モーダル/ドロワー

### 画面一覧
1. ダッシュボード（全体概要）
2. テナント管理
   - テナント一覧
   - テナント詳細
   - テナント作成/編集
3. プラン管理
   - プラン一覧
   - プラン作成/編集
4. AI管理
   - モデル管理
   - クレジット管理
   - 使用統計
5. 使用量監視
   - リアルタイムダッシュボード
   - 履歴グラフ
6. アラート管理
   - アラート一覧
   - アラート詳細
7. システム設定
   - グローバル設定
   - セキュリティ設定

---

## 🔒 セキュリティ

### 認証・認可
- スーパーアドミン専用認証
- 2FA必須
- IPホワイトリスト
- セッションタイムアウト（15分）

### 監査ログ
- 全操作を記録
- 変更前後の値を保存
- 操作者の記録
- タイムスタンプ

### データ保護
- 機密情報の暗号化
- アクセス制御
- データバックアップ

---

## 🚀 実装優先度

### Phase 1: 必須機能（最優先）
- [ ] スーパーアドミン認証
- [ ] テナント管理（CRUD）
- [ ] プラン管理（CRUD）
- [ ] 基本的な使用量監視

### Phase 2: 重要機能（高優先度）
- [ ] プラン変更フロー
- [ ] アラート機能
- [ ] AI管理（基本）

### Phase 3: 拡張機能（中優先度）
- [ ] AIクレジット管理
- [ ] 詳細な使用量分析
- [ ] レポート機能

### Phase 4: 高度な機能（低優先度）
- [ ] 予測分析
- [ ] 自動スケーリング
- [ ] カスタムアラート

---

## 🔗 関連SSOT

- [SSOT_SAAS_MULTITENANT](./SSOT_SAAS_MULTITENANT.md) - マルチテナント基盤（技術的仕組み）
- [SSOT_SAAS_BILLING](../01_core_features/SSOT_SAAS_BILLING.md) - 請求管理（作成予定）
- [SSOT_SAAS_PERMISSION_SYSTEM](./SSOT_SAAS_PERMISSION_SYSTEM.md) - 権限管理（作成予定）
- [SSOT_SAAS_AUDIT_LOG](../03_monitoring/SSOT_SAAS_AUDIT_LOG.md) - 監査ログ（作成予定）

---

## 📝 メモ

- スーパーアドミン画面は独立したサブドメインで運用する可能性あり
- 各システム（SaaS、PMS、Member）の管理画面とは完全に分離
- hotel-commonに基盤APIを実装し、hotel-saasまたは独立アプリでUIを提供
- セキュリティは最重要事項として設計

---

**このメモを元に、SSOT_SAAS_SUPER_ADMIN.mdを作成してください**

