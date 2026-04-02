# 📐 SSOT作成指示書 - Phase 2（AI実行可能版）

**対象**: Phase 2の10件のSSOT作成  
**期間**: 3週間  
**担当**: Sun、Iza  
**作成日**: 2025年10月7日  
**バージョン**: 3.0.0（AI実行可能版）

---

## 📖 この指示書を受け取ったAIへ

### あなたがすべきこと

1. **この指示書を最初から最後まで読む**
   - 読み終わったら「指示書読了」と報告
   - 不明点があれば質問

2. **作成するSSOTを確認**
   - ユーザーから指定されたSSOT名を確認
   - 該当SSOTのセクションを読む

3. **7フェーズプロセスを実行**
   - Phase 0: 準備（必須ドキュメント読み込み）
   - Phase 1-3: 実装調査・差分分析
   - Phase 4-7: SSOT記述・レビュー

4. **各フェーズ完了後に報告**
   - 進捗報告ファイルに記録
   - ユーザーに報告

### 絶対に守ること

- ❌ 指示書を読まずに作業開始しない
- ❌ 実装コードを読まずにSSOTを書かない
- ❌ 既存SSOTを読まずにSSOTを書かない
- ❌ 推測や想像でSSOTを書かない
- ❌ 実装されていない機能を「実装済み」と書かない
- ✅ 必ず実装コードを確認してから記述
- ✅ 既存SSOTとの整合性を確認
- ✅ 不明点は質問する

### 報告先

**進捗報告**: `/Users/kaneko/hotel-kanri/docs/03_ssot/ssot_creation_progress_phase2.md`  
**質問・確認事項**: ユーザーとのチャット

---

## 🎯 Phase 2で作成するSSO

### 管理画面機能（5件）

1. **SSOT_ADMIN_CAMPAIGNS.md**
   - **担当**: Sun
   - **工数**: 2日
   - **優先度**: 🟡 高
   - **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_CAMPAIGNS.md`

2. **SSOT_ADMIN_CONTENT_APPS.md**
   - **担当**: Sun
   - **工数**: 2日
   - **優先度**: 🟡 高
   - **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_CONTENT_APPS.md`

3. **SSOT_ADMIN_AI_SETTINGS.md**
   - **担当**: Sun
   - **工数**: 2日
   - **優先度**: 🟡 高
   - **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_AI_SETTINGS.md`

4. **SSOT_ADMIN_PLAN_BILLING.md**
   - **担当**: Iza
   - **工数**: 2日
   - **優先度**: 🟡 高
   - **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_PLAN_BILLING.md`

5. **SSOT_SAAS_SYSTEM_INTEGRATION.md**
   - **担当**: Iza
   - **工数**: 3日
   - **優先度**: 🟡 高
   - **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_SYSTEM_INTEGRATION.md`

### 客室端末機能（5件）

6. **SSOT_GUEST_ORDER_FLOW.md**
   - **担当**: Sun
   - **工数**: 2日
   - **優先度**: 🔴 最高
   - **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_GUEST_ORDER_FLOW.md`

7. **SSOT_GUEST_MENU_VIEW.md**
   - **担当**: Sun
   - **工数**: 2日
   - **優先度**: 🔴 最高
   - **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_GUEST_MENU_VIEW.md`

8. **SSOT_GUEST_DEVICE_APP.md**
   - **担当**: Sun
   - **工数**: 3日
   - **優先度**: 🔴 最高
   - **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_GUEST_DEVICE_APP.md`

9. **SSOT_GUEST_CAMPAIGN_VIEW.md**
   - **担当**: Sun
   - **工数**: 2日
   - **優先度**: 🟡 高
   - **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_GUEST_CAMPAIGN_VIEW.md`

10. **SSOT_GUEST_INFO_PORTAL.md**
    - **担当**: Sun
    - **工数**: 2日
    - **優先度**: 🟡 高
    - **保存先**: `/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_GUEST_INFO_PORTAL.md`

---

## 📋 SSOT作成の7フェーズプロセス

**Phase 1の指示書と同じプロセスを使用**:
```
/Users/kaneko/hotel-kanri/.cursor/prompts/ssot_creation_instructions_phase1_v2.md
```

詳細な手順は上記ファイルを参照してください。

---

## 🔍 重要: 客室端末SSOTの注意事項

### 管理画面SSOTとの関係

客室端末機能は、管理画面で設定された内容を**表示・実行**する機能です。

**必ず以下のSSOTを先に読むこと**:
```
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_ORDER_MANAGEMENT.md
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_AI_CONCIERGE.md
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_CAMPAIGNS.md
```

### データの流れ

```
管理画面（hotel-saas/admin）
  ↓ 設定・登録
hotel-common（データベース）
  ↓ 取得・表示
客室端末（hotel-saas/room）
```

### 客室端末SSOTに含めるべき内容

1. **表示仕様**
   - どのデータをどう表示するか
   - UI/UXの詳細

2. **操作仕様**
   - ユーザーがどう操作するか
   - 操作後の挙動

3. **デバイス認証**
   - MAC/IP アドレス認証
   - ログイン不要

4. **データ取得**
   - hotel-commonからのデータ取得
   - キャッシュ戦略

---

## 📋 各SSOT作成の詳細

### 1. SSOT_ADMIN_CAMPAIGNS.md

**担当**: Sun  
**工数**: 2日  
**優先度**: 🟡 高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/admin/campaigns/
/Users/kaneko/hotel-saas/server/api/v1/admin/campaigns/
/Users/kaneko/hotel-saas/composables/useCampaigns.ts
```

**hotel-common実装ファイル**:
```
/Users/kaneko/hotel-common/src/services/CampaignService.ts
/Users/kaneko/hotel-common/src/routes/campaigns.ts
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ campaigns
  ├─ campaign_rules
  └─ campaign_logs
```

#### SSOT記載内容

1. **キャンペーン管理（CRUD）**
2. **キャンペーンルール設定**
3. **キャンペーン配信スケジュール**
4. **キャンペーン効果測定**
5. **ウェルカムムービー管理**

---

### 2. SSOT_ADMIN_CONTENT_APPS.md

**担当**: Sun  
**工数**: 2日  
**優先度**: 🟡 高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/admin/content-apps/
/Users/kaneko/hotel-saas/server/api/v1/admin/content-apps/
/Users/kaneko/hotel-saas/composables/useContentApps.ts
```

**hotel-common実装ファイル**:
```
/Users/kaneko/hotel-common/src/services/ContentAppService.ts
/Users/kaneko/hotel-common/src/routes/content-apps.ts
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ content_apps
  └─ app_settings
```

#### SSOT記載内容

1. **コンテンツアプリ管理**
2. **アプリ設定**
3. **アプリ配信**
4. **アプリ統計**

---

### 3. SSOT_ADMIN_AI_SETTINGS.md

**担当**: Sun  
**工数**: 2日  
**優先度**: 🟡 高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/admin/ai-settings/
/Users/kaneko/hotel-saas/server/api/v1/admin/ai-settings/
/Users/kaneko/hotel-saas/composables/useAISettings.ts
```

**hotel-common実装ファイル**:
```
/Users/kaneko/hotel-common/src/services/AISettingsService.ts
/Users/kaneko/hotel-common/src/routes/ai-settings.ts
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ ai_settings
  ├─ ai_prompts
  └─ ai_knowledge_base
```

#### SSOT記載内容

1. **AI設定管理**
2. **プロンプト管理**
3. **ナレッジベース管理**
4. **AI応答設定**

---

### 4. SSOT_ADMIN_PLAN_BILLING.md

**担当**: Iza  
**工数**: 2日  
**優先度**: 🟡 高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/admin/plan-billing/
/Users/kaneko/hotel-saas/server/api/v1/admin/plan-billing/
/Users/kaneko/hotel-saas/composables/usePlanBilling.ts
```

**hotel-common実装ファイル**:
```
/Users/kaneko/hotel-common/src/services/PlanBillingService.ts
/Users/kaneko/hotel-common/src/routes/plan-billing.ts
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ subscription_plans
  ├─ tenant_subscriptions
  └─ billing_history
```

#### SSOT記載内容

1. **プラン管理**
2. **サブスクリプション管理**
3. **請求履歴**
4. **プラン変更**

---

### 5. SSOT_SAAS_SYSTEM_INTEGRATION.md

**担当**: Iza  
**工数**: 3日  
**優先度**: 🟡 高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/server/api/v1/integration/
/Users/kaneko/hotel-saas/composables/useIntegration.ts
```

**hotel-common実装ファイル**:
```
/Users/kaneko/hotel-common/src/services/IntegrationService.ts
/Users/kaneko/hotel-common/src/routes/integration.ts
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ integrations
  ├─ integration_logs
  └─ webhooks
```

#### SSOT記載内容

1. **外部システム連携**
2. **Webhook管理**
3. **API連携**
4. **連携ログ**

---

### 6. SSOT_GUEST_ORDER_FLOW.md

**担当**: Sun  
**工数**: 2日  
**優先度**: 🔴 最高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/room/[roomNumber]/order/
/Users/kaneko/hotel-saas/server/api/v1/order/
/Users/kaneko/hotel-saas/composables/useGuestOrder.ts
```

**関連SSOT**:
```
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_ORDER_MANAGEMENT.md
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
```

#### SSOT記載内容

1. **注文フロー（ゲスト視点）**
2. **メニュー表示**
3. **カート機能**
4. **注文確定**
5. **注文履歴表示**

---

### 7. SSOT_GUEST_MENU_VIEW.md

**担当**: Sun  
**工数**: 2日  
**優先度**: 🔴 最高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/room/[roomNumber]/menu/
/Users/kaneko/hotel-saas/server/api/v1/menu/
/Users/kaneko/hotel-saas/composables/useGuestMenu.ts
```

**関連SSOT**:
```
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md
```

#### SSOT記載内容

1. **メニュー表示（ゲスト視点）**
2. **カテゴリ表示**
3. **商品詳細表示**
4. **画像表示**
5. **価格表示**

---

### 8. SSOT_GUEST_DEVICE_APP.md

**担当**: Sun  
**工数**: 3日  
**優先度**: 🔴 最高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/room/[roomNumber]/
/Users/kaneko/hotel-saas/server/api/v1/devices/
/Users/kaneko/hotel-saas/composables/useGuestDevice.ts
/Users/kaneko/hotel-saas/middleware/device-auth.ts
```

**関連SSOT**:
```
/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md
```

#### SSOT記載内容

1. **デバイス認証（MAC/IP）**
2. **トップページ**
3. **ナビゲーション**
4. **全画面モード**
5. **デバイスリセット**

---

### 9. SSOT_GUEST_CAMPAIGN_VIEW.md

**担当**: Sun  
**工数**: 2日  
**優先度**: 🟡 高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/room/[roomNumber]/campaigns/
/Users/kaneko/hotel-saas/server/api/v1/campaigns/
/Users/kaneko/hotel-saas/composables/useGuestCampaigns.ts
```

**関連SSOT**:
```
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_CAMPAIGNS.md
```

#### SSOT記載内容

1. **キャンペーン表示（ゲスト視点）**
2. **ウェルカムムービー表示**
3. **キャンペーン詳細表示**
4. **キャンペーン適用**

---

### 10. SSOT_GUEST_INFO_PORTAL.md

**担当**: Sun  
**工数**: 2日  
**優先度**: 🟡 高

#### 調査対象

**hotel-saas実装ファイル**:
```
/Users/kaneko/hotel-saas/pages/room/[roomNumber]/info/
/Users/kaneko/hotel-saas/server/api/v1/info/
/Users/kaneko/hotel-saas/composables/useGuestInfo.ts
```

#### SSOT記載内容

1. **施設情報表示**
2. **周辺情報表示**
3. **お知らせ表示**
4. **よくある質問表示**

---

## 🎯 重要な注意事項

### 必ず守ること

1. **実装コードを必ず読む**
   - 推測や想像でSSOTを書かない
   - 実際のコードを確認してから記述

2. **関連SSOTを必ず読む**
   - 特に客室端末SSOTは管理画面SSOTに依存
   - 整合性を確認

3. **既存SSOTとの整合性を確認**
   - 認証システム
   - マルチテナント
   - データベーススキーマ

4. **本番同等ルールを遵守**
   - 環境分岐コード禁止
   - フォールバック実装禁止
   - ハードコード値禁止

5. **不明点は質問する**
   - 推測で書かない
   - 必ずユーザーに確認

6. **各フェーズ完了後に報告**
   - 進捗報告ファイルに記録
   - ユーザーに報告

---

**作成日**: 2025年10月7日  
**管理者**: Iza（統合管理者）  
**バージョン**: 3.0.0（AI実行可能版）

