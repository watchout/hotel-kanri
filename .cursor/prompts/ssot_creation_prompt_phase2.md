# 📐 SSOT作成プロンプト - Phase 2（コア機能SSOT）

**対象**: Phase 2の10件のSSOT作成  
**期間**: 3週間  
**担当**: Sun、Iza

---

## 🎯 Phase 2で作成するSSO

### 管理画面機能（5件）
1. **SSOT_ADMIN_CAMPAIGNS.md**（2日・Sun）
2. **SSOT_ADMIN_CONTENT_APPS.md**（2日・Sun）
3. **SSOT_ADMIN_AI_SETTINGS.md**（2日・Sun）
4. **SSOT_ADMIN_PLAN_BILLING.md**（2日・Iza）
5. **SSOT_SAAS_SYSTEM_INTEGRATION.md**（3日・Iza）

### 客室端末機能（5件）
6. **SSOT_GUEST_ORDER_FLOW.md**（2日・Sun）
7. **SSOT_GUEST_MENU_VIEW.md**（2日・Sun）
8. **SSOT_GUEST_DEVICE_APP.md**（3日・Sun）
9. **SSOT_GUEST_CAMPAIGN_VIEW.md**（2日・Sun）
10. **SSOT_GUEST_INFO_PORTAL.md**（2日・Sun）

---

## 📋 SSOT作成手順（Phase 1と同じ）

### Phase 0: 準備

1. **必須ドキュメント読み込み**
   ```
   /Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md
   /Users/kaneko/hotel-kanri/.cursor/prompts/retest_new_ssot.md
   ```

2. **既存SSOT読み込み**
   ```
   /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/
   /Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/
   ```

3. **関連SSOT確認**（客室端末は管理画面SSOTに依存）
   ```
   SSOT_SAAS_ORDER_MANAGEMENT.md
   SSOT_SAAS_MENU_MANAGEMENT.md
   SSOT_ADMIN_AI_CONCIERGE.md
   SSOT_ADMIN_CAMPAIGNS.md
   ```

---

## 🔍 SSOT 1: SSOT_ADMIN_CAMPAIGNS.md

**担当**: Sun  
**優先度**: 🟡 High  
**工数**: 2日

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/admin/campaigns/
  （存在する場合）

/Users/kaneko/hotel-saas/server/api/v1/admin/campaigns/
  （存在する場合）
```

#### 実装ファイル（hotel-common）
```
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ campaigns
  ├─ campaign_rules
  └─ campaign_logs
```

### SSOT記載内容

1. キャンペーン管理（CRUD）
2. キャンペーンルール設定
3. キャンペーン配信スケジュール
4. キャンペーン効果測定
5. ウェルカムムービー管理

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_CAMPAIGNS.md
```

---

## 🔍 SSOT 2: SSOT_ADMIN_CONTENT_APPS.md

**担当**: Sun  
**優先度**: 🟡 High  
**工数**: 2日

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/admin/apps/
  （存在する場合）
```

### SSOT記載内容

1. アプリ管理（CRUD）
2. アプリカテゴリ管理
3. アプリ表示順序管理
4. アプリ公開設定

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_CONTENT_APPS.md
```

---

## 🔍 SSOT 3: SSOT_ADMIN_AI_SETTINGS.md

**担当**: Sun  
**優先度**: 🟡 High  
**工数**: 2日

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/admin/ai/settings/
  （存在する場合）
```

### SSOT記載内容

1. AI設定管理
2. 用途別モデル割当
3. AIクレジット管理
4. AI使用状況モニタリング

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_AI_SETTINGS.md
```

---

## 🔍 SSOT 4: SSOT_ADMIN_PLAN_BILLING.md

**担当**: Iza  
**優先度**: 🟡 High  
**工数**: 2日

### 調査対象

#### 実装ファイル（hotel-common）
```
/Users/kaneko/hotel-common/prisma/schema.prisma
  ├─ TenantSystemPlan
  ├─ SystemPlanRestrictions
  └─ BillingLogs
```

### SSOT記載内容

1. プラン管理
2. 請求情報管理
3. プラン制限の適用
4. 請求履歴

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_ADMIN_PLAN_BILLING.md
```

---

## 🔍 SSOT 5: SSOT_SAAS_SYSTEM_INTEGRATION.md

**担当**: Iza  
**優先度**: 🟡 High  
**工数**: 3日

### 調査対象

#### 実装ファイル（hotel-common）
```
/Users/kaneko/hotel-common/src/routes/systems/
  ├─ common/
  ├─ saas/
  ├─ pms/
  └─ member/
```

### SSOT記載内容

1. システム間連携基盤
2. API統合
3. イベント駆動連携
4. データ同期

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_SYSTEM_INTEGRATION.md
```

---

## 🔍 SSOT 6: SSOT_GUEST_ORDER_FLOW.md

**担当**: Sun  
**優先度**: 🟡 High  
**工数**: 2日

### ⚠️ 重要: 管理画面SSOTを必ず参照

**参照SSOT**:
```
SSOT_SAAS_ORDER_MANAGEMENT.md
SSOT_SAAS_MENU_MANAGEMENT.md
```

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/index.vue
  （客室端末トップページ）

/Users/kaneko/hotel-saas/pages/order/
  （注文関連ページ）
```

### SSOT記載内容

1. 注文フロー（カート→確認→送信）
2. カート管理
3. 注文確認画面
4. 注文完了画面
5. 注文履歴表示

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_GUEST_ORDER_FLOW.md
```

---

## 🔍 SSOT 7: SSOT_GUEST_MENU_VIEW.md

**担当**: Sun  
**優先度**: 🟡 High  
**工数**: 2日

### ⚠️ 重要: 管理画面SSOTを必ず参照

**参照SSOT**:
```
SSOT_SAAS_MENU_MANAGEMENT.md
```

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/menu/
  （メニュー閲覧ページ）
```

### SSOT記載内容

1. メニュー閲覧
2. メニュー検索
3. メニューフィルタ
4. カテゴリ別表示
5. おすすめメニュー表示

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_GUEST_MENU_VIEW.md
```

---

## 🔍 SSOT 8: SSOT_GUEST_DEVICE_APP.md

**担当**: Sun  
**優先度**: 🟡 High  
**工数**: 3日

### ⚠️ 重要: デバイス認証SSOTを必ず参照

**参照SSOT**:
```
SSOT_SAAS_DEVICE_AUTHENTICATION.md
```

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/
  （客室端末全体）

/Users/kaneko/hotel-saas/middleware/device-guard.ts
```

### SSOT記載内容

1. WebViewアプリ（Capacitor + Google TV）
2. デバイス認証フロー
3. 自動ログイン
4. アプリ起動・初期化
5. リモコン操作対応

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_GUEST_DEVICE_APP.md
```

---

## 🔍 SSOT 9: SSOT_GUEST_CAMPAIGN_VIEW.md

**担当**: Sun  
**優先度**: 🟡 High  
**工数**: 2日

### ⚠️ 重要: 管理画面SSOTを必ず参照

**参照SSOT**:
```
SSOT_ADMIN_CAMPAIGNS.md
```

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/campaigns/
  （キャンペーン表示ページ）
```

### SSOT記載内容

1. キャンペーン表示
2. ウェルカムムービー再生
3. キャンペーン詳細表示

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_GUEST_CAMPAIGN_VIEW.md
```

---

## 🔍 SSOT 10: SSOT_GUEST_INFO_PORTAL.md

**担当**: Sun  
**優先度**: 🟡 High  
**工数**: 2日

### ⚠️ 重要: UI設計SSOTを必ず参照

**参照SSOT**:
```
SSOT_ADMIN_UI_DESIGN.md
```

### 調査対象

#### 実装ファイル（hotel-saas）
```
/Users/kaneko/hotel-saas/pages/info/
  （情報ポータルページ）
```

### SSOT記載内容

1. 情報ポータル
2. 館内案内
3. 観光情報
4. WiFi情報
5. 施設情報

### 保存先
```
/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/SSOT_GUEST_INFO_PORTAL.md
```

---

## ⚠️ 客室端末SSOT作成時の注意点

### 必ず管理画面SSOTを参照

客室端末SSOTは、対応する管理画面SSOTに依存します：

| 客室端末SSOT | 参照する管理画面SSOT |
|:-----------|:------------------|
| SSOT_GUEST_ORDER_FLOW.md | SSOT_SAAS_ORDER_MANAGEMENT.md |
| SSOT_GUEST_MENU_VIEW.md | SSOT_SAAS_MENU_MANAGEMENT.md |
| SSOT_GUEST_DEVICE_APP.md | SSOT_SAAS_DEVICE_AUTHENTICATION.md |
| SSOT_GUEST_CAMPAIGN_VIEW.md | SSOT_ADMIN_CAMPAIGNS.md |
| SSOT_GUEST_INFO_PORTAL.md | SSOT_ADMIN_UI_DESIGN.md |

### 整合性確保

- データ構造は管理画面SSOTと同じ
- API仕様は管理画面SSOTと同じ
- 表示内容のみが異なる

---

## ✅ Phase 2完了チェックリスト

- [ ] 10件のSSOT作成完了
- [ ] 全SSOTがIzaレビュー合格
- [ ] 管理画面SSOTと客室端末SSOTの整合性確認
- [ ] 関連ドキュメント更新完了

---

**作成日**: 2025年10月7日  
**管理者**: Iza（統合管理者）  
**対象Phase**: Phase 2（コア機能SSOT）

