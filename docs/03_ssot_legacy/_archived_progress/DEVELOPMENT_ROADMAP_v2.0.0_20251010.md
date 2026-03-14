# 🗺️ hotel-kanri 開発ロードマップ

**作成日**: 2025年10月7日  
**最終更新**: 2025年10月10日  
**バージョン**: 2.0.0  
**管理者**: Iza（統合管理者）  
**目的**: 問題解決を最優先し、システムを100%稼働させる

---

## 📝 変更履歴

### v2.0.0 (2025-10-07)
- 実装コード調査完了版
- Phase 0で緊急修正を追加（JWT残骸、環境分岐コード、テナントIDハードコード）
- 問題解決を最優先する構成に変更
- 実装状況評価（85点/100点）を追加

### v1.0.0 (2025-10-07)
- 初版作成（アーカイブ済み: `_archived_progress/DEVELOPMENT_ROADMAP_v1.0.0_20251007.md`）
- 一般的な開発計画として作成

---

## 📋 目次

1. [現状分析サマリー](#現状分析サマリー)
2. [Phase 0: 緊急修正](#phase-0-緊急修正1週間)
3. [Phase 1: 基盤SSOT作成・実装](#phase-1-基盤ssot作成実装2週間)
4. [Phase 2: コア機能SSOT作成・実装](#phase-2-コア機能ssot作成実装3週間)
5. [Phase 3: 拡張機能SSOT作成・実装](#phase-3-拡張機能ssot作成実装2週間)
6. [Phase 4: 運用・監視完成](#phase-4-運用監視完成1週間)
7. [Phase 5: ビジネス機能完成](#phase-5-ビジネス機能完成1週間)
8. [マイルストーン定義](#マイルストーン定義)
9. [リスク管理](#リスク管理)
10. [進捗管理](#進捗管理)

---

## 📊 現状分析サマリー

### 実装状況評価: **85点 / 100点**

#### ✅ 優れている点（+85点）
- Session認証の実装が正しい
- Redis実装が正しい（SimpleRedis削除済み）
- データベーススキーマが正しい
- マルチテナント対応が正しい
- チェックインセッション対応済み

#### ❌ 改善が必要な点（-15点）
- JWT認証の残骸（53ファイル）- 🔴 Critical
- 環境分岐コード（6ファイル）- 🟡 High
- テナントIDハードコード（13ファイル）- 🟡 High

### MVP稼働可能性
**現状**: ⚠️ **条件付きで稼働可能**  
**Phase 0完了後**: ✅ **完全稼働可能**

**詳細**: [IMPLEMENTATION_STATUS_ANALYSIS.md](/Users/kaneko/hotel-kanri/docs/03_ssot/IMPLEMENTATION_STATUS_ANALYSIS.md)

---

## 🚨 Phase 0: 緊急修正（1週間）

**目標**: システムを完全稼働可能な状態にする  
**優先度**: 🔴 最高  
**期間**: 5営業日

### 機能1: JWT認証の残骸削除

**問題**: 53ファイルでJWT認証コードが残存  
**影響**: Session認証が正しく動作しない可能性  
**優先度**: 🔴 Critical

#### hotel-saas実装フロー

**担当**: Sun（hotel-saas担当AI）  
**工数**: 3日

##### ステップ1: API修正（2日）

**修正対象ファイル**:
```
/server/api/v1/order/
  ├─ create.post.ts
  ├─ place.post.ts
  └─ menu.get.ts

/server/api/v1/admin/menu/
  ├─ items.get.ts
  ├─ items.post.ts
  ├─ items/[id].get.ts
  ├─ items/[id].put.ts
  ├─ items/[id].delete.ts
  ├─ categories.get.ts
  ├─ categories.post.ts
  ├─ categories/[id].put.ts
  └─ categories/[id].delete.ts

/server/api/v1/admin/devices/
  ├─ list.get.ts
  ├─ create.post.ts
  ├─ [id].get.ts
  ├─ [id].put.ts
  ├─ access-logs/index.get.ts
  ├─ stats/summary.get.ts
  ├─ stats/access.get.ts
  └─ stats/ranking.get.ts

/server/api/v1/admin/front-desk/
  ├─ rooms.get.ts
  ├─ room-orders.get.ts
  ├─ accounting.get.ts
  ├─ billing.post.ts
  ├─ billing-settings.get.ts
  ├─ checkin.post.ts
  └─ checkout.post.ts

/server/api/v1/admin/room-grades/
  ├─ [id].put.ts
  ├─ [id].delete.ts
  ├─ create.post.ts
  ├─ reorder.patch.ts
  └─ [id]/media/index.get.ts

/server/api/v1/memos/
  ├─ index.get.ts
  ├─ index.post.ts
  ├─ [id].get.ts
  ├─ [id].patch.ts
  ├─ [id].delete.ts
  └─ [id]/comments.post.ts

その他:
  ├─ /server/api/v1/admin/categories/list.get.ts
  ├─ /server/api/v1/admin/rooms/[roomNumber]/logs.get.ts
  ├─ /server/api/v1/admin/phone-order/menu.get.ts
  ├─ /server/api/v1/admin/phone-order/create.post.ts
  ├─ /server/api/v1/admin/operation-logs.get.ts
  ├─ /server/api/v1/admin/tenant/current.get.ts
  ├─ /server/api/v1/admin/pages/top/content.ts
  ├─ /server/api/v1/admin/pages/top/publish.ts
  ├─ /server/api/v1/admin/media/reorder.post.ts
  ├─ /server/api/v1/menu/items.get.ts
  ├─ /server/api/v1/menu/categories.get.ts
  ├─ /server/api/v1/media-proxy.get.ts
  ├─ /server/api/v1/media/proxy/[...path].get.ts
  ├─ /server/api/v1/devices/client-ip.get.ts
  ├─ /server/api/v1/devices/check-status.post.ts
  └─ /server/api/v1/pages/top.ts
```

**修正内容**:
```typescript
// ❌ 削除
const response = await $fetch(`${hotelCommonApiUrl}/api/v1/xxx`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${user.token}`,  // ← 削除
    'Content-Type': 'application/json',
    'X-Tenant-ID': user.tenant_id || user.tenantId
  },
  body: data
})

// ✅ 修正後
const response = await $fetch(`${hotelCommonApiUrl}/api/v1/xxx`, {
  method: 'POST',
  credentials: 'include',  // ← Cookie自動送信
  headers: {
    'Content-Type': 'application/json'
  },
  body: data
})
```

##### ステップ2: ユーティリティ修正（0.5日）

**修正対象ファイル**:
```
/server/utils/
  ├─ api-client.ts
  └─ api-context.ts
```

**修正内容**:
- JWT認証関連のコードを削除
- Session認証（Cookie）に統一

##### ステップ3: 動作確認（0.5日）

**確認項目**:
- [ ] ログイン → Cookie設定確認
- [ ] 注文作成 → hotel-common API呼び出し確認
- [ ] メニュー取得 → hotel-common API呼び出し確認
- [ ] デバイス管理 → hotel-common API呼び出し確認
- [ ] フロント業務 → hotel-common API呼び出し確認

#### hotel-common実装フロー

**担当**: Iza（統合管理者）  
**工数**: 0日（修正不要）

**確認事項**:
- ✅ Session認証は正しく実装済み
- ✅ Redis実装は正しい
- ✅ 修正不要

#### 検証・テスト

**担当**: Iza  
**工数**: 0.5日

**テスト項目**:
- [ ] ログイン → セッション作成確認
- [ ] API呼び出し → Cookie自動送信確認
- [ ] Redis確認 → セッションデータ確認
- [ ] ログアウト → セッション削除確認

---

### 機能2: 環境分岐コード削除

**問題**: 6ファイルで環境分岐コードが存在  
**影響**: 本番同等性違反、開発・本番で動作が異なる  
**優先度**: 🟡 High

#### hotel-saas実装フロー

**担当**: Iza（統合管理者）  
**工数**: 1日

##### ステップ1: 環境分岐コード削除（0.5日）

**修正対象ファイル**:
```
/server/middleware/tenant-context.ts
/server/api/v1/admin/system/system-settings.post.ts
/server/api/v1/orders/active.get.ts
/server/api/health.get.ts
/server/utils/auth.ts
/server/api/v1/integration/session-sync.post.ts
```

**修正内容**:
```typescript
// ❌ 削除
if (process.env.NODE_ENV === 'development') {
  // 開発環境専用の処理
  return mockData
}

// ✅ 修正後: 環境変数で接続先のみ変更
const apiUrl = process.env.HOTEL_COMMON_API_URL || 'http://localhost:3400'
const response = await $fetch(`${apiUrl}/api/v1/xxx`, {
  credentials: 'include'
})
```

##### ステップ2: 動作確認（0.5日）

**確認項目**:
- [ ] 開発環境で動作確認
- [ ] 本番環境で動作確認（同じコードで動作）

#### hotel-common実装フロー

**担当**: Iza  
**工数**: 0日（修正不要）

#### 検証・テスト

**担当**: Iza  
**工数**: 0.5日

---

### 機能3: テナントIDハードコード削除

**問題**: 13ファイルでテナントIDハードコードが存在  
**影響**: 本番環境で'default'テナント不在時に全機能停止  
**優先度**: 🟡 High

#### hotel-saas実装フロー

**担当**: Sun  
**工数**: 1日

##### ステップ1: ハードコード削除（0.5日）

**修正対象ファイル**:
```
/server/api/v1/admin/pages/top/content.ts
/server/api/v1/admin/pages/top/publish.ts
/server/api/v1/admin/room-grades/reorder.patch.ts
/server/api/v1/admin/room-grades/create.post.ts
/server/api/v1/admin/room-grades/[id].delete.ts
/server/api/v1/memos.post.ts
/server/api/v1/memos.get.ts
/server/api/v1/memos/[id].patch.ts
/server/api/v1/memos/[id].get.ts
/server/api/v1/memos/[id].delete.ts
/server/api/v1/memos/[id]/comments.post.ts
/server/api/v1/media/proxy/[...path].get.ts
/server/api/v1/pages/top.ts
```

**修正内容**:
```typescript
// ❌ 削除
const tenantId = user.tenant_id || 'default'
const tenantId = session.tenantId ?? 'default'

// ✅ 修正後
const tenantId = user.tenant_id
if (!tenantId) {
  throw createError({
    statusCode: 400,
    message: 'テナントIDが取得できません'
  })
}
```

##### ステップ2: 動作確認（0.5日）

**確認項目**:
- [ ] テナントID取得確認
- [ ] エラーハンドリング確認

#### hotel-common実装フロー

**担当**: Iza  
**工数**: 0日（修正不要）

#### 検証・テスト

**担当**: Iza  
**工数**: 0.5日

---

### Phase 0 完了基準

- [ ] JWT認証の残骸削除完了（53ファイル）
- [ ] 環境分岐コード削除完了（6ファイル）
- [ ] テナントIDハードコード削除完了（13ファイル）
- [ ] 全機能の動作確認完了
- [ ] ログイン → 注文作成 → メニュー取得の一連の流れが正常動作

### Phase 0 完了後の状態

**稼働率**: **90%** - システムが完全稼働可能  
**評価**: **100点 / 100点**

---

## 🏗️ Phase 1: 基盤SSOT作成・実装（2週間）

**目標**: システムの土台を完全に固める  
**期間**: 10営業日

### 機能1: SSOT_SAAS_SUPER_ADMIN.md

**優先度**: 🟡 High  
**工数**: 2日（SSOT作成1日 + 実装確認1日）

#### SSOT作成フロー

**担当**: Iza  
**工数**: 1日

##### ステップ1: 既存実装調査（0.3日）

**調査対象**:
```
/Users/kaneko/hotel-saas/pages/admin/super-admin/
  ├─ index.vue
  ├─ dashboard.vue
  ├─ analytics.vue
  ├─ security.vue
  └─ settings.vue
```

**確認項目**:
- [ ] 実装済み機能の洗い出し
- [ ] API仕様の確認
- [ ] データベーススキーマの確認

##### ステップ2: SSOT作成（0.5日）

**テンプレート**: `/Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md`

**記載内容**:
- スーパーアドミン機能の完全仕様
- 代理店管理
- テナント管理
- AIモデル管理
- 料金設定
- プラン制限

##### ステップ3: レビュー（0.2日）

**レビュー**: `/Users/kaneko/hotel-kanri/.cursor/prompts/retest_new_ssot.md`

#### hotel-saas実装フロー

**担当**: Iza  
**工数**: 0.5日（実装済みのため確認のみ）

##### ステップ1: 実装確認（0.5日）

**確認項目**:
- [ ] SSOTと実装の整合性確認
- [ ] 不足機能の洗い出し

#### hotel-common実装フロー

**担当**: Iza  
**工数**: 0.5日（API確認）

##### ステップ1: API確認（0.5日）

**確認項目**:
- [ ] スーパーアドミンAPI実装確認
- [ ] 権限チェック確認

#### 検証・テスト

**担当**: Iza  
**工数**: 0.5日

**テスト項目**:
- [ ] スーパーアドミンログイン
- [ ] 代理店管理機能
- [ ] テナント管理機能

---

### 機能2: SSOT_ADMIN_SYSTEM_LOGS.md

**優先度**: 🔴 High  
**工数**: 2日

#### SSOT作成フロー

**担当**: Iza  
**工数**: 1日

##### ステップ1: 既存実装調査（0.3日）

**調査対象**:
```
/Users/kaneko/hotel-saas/pages/admin/logs/
  ├─ index.vue
  ├─ auth.vue
  ├─ security.vue
  ├─ ai.vue
  ├─ billing.vue
  └─ device.vue
```

##### ステップ2: SSOT作成（0.5日）

**記載内容**:
- 統合ログ管理
- 認証ログ
- セキュリティログ
- AIログ
- 課金ログ
- デバイスログ

##### ステップ3: レビュー（0.2日)

#### hotel-saas実装フロー

**担当**: Iza  
**工数**: 0.5日

#### hotel-common実装フロー

**担当**: Iza  
**工数**: 0.5日

#### 検証・テスト

**担当**: Iza  
**工数**: 0.5日

---

### 機能3: SSOT_ADMIN_BILLING.md

**優先度**: 🟡 High  
**工数**: 2日

#### SSOT作成フロー

**担当**: Luna  
**工数**: 1日

##### ステップ1: 既存実装調査（0.3日）

**調査対象**:
```
/Users/kaneko/hotel-saas/pages/admin/front-desk/
  ├─ billing.vue
  └─ accounting.vue
```

##### ステップ2: SSOT作成（0.5日）

**記載内容**:
- 請求管理
- 会計管理
- 売上管理
- 領収書発行

##### ステップ3: レビュー（0.2日）

#### hotel-saas実装フロー

**担当**: Luna  
**工数**: 0.5日

#### hotel-common実装フロー

**担当**: Iza  
**工数**: 0.5日

#### 検証・テスト

**担当**: Luna  
**工数**: 0.5日

---

### 機能4: SSOT_SAAS_PERMISSION_SYSTEM.md

**優先度**: 🟡 High  
**工数**: 3日

#### SSOT作成フロー

**担当**: Iza  
**工数**: 1.5日

##### ステップ1: 設計（0.5日）

**設計内容**:
- RBAC（Role-Based Access Control）
- 権限レベル定義
- 権限チェック機構

##### ステップ2: SSOT作成（0.8日）

**記載内容**:
- 権限管理システム全体
- ロール定義
- 権限定義
- 権限チェックAPI

##### ステップ3: レビュー（0.2日）

#### hotel-saas実装フロー

**担当**: Iza  
**工数**: 0.5日（未実装）

##### ステップ1: ミドルウェア実装（0.5日）

**実装内容**:
- 権限チェックミドルウェア
- ロールチェック機能

#### hotel-common実装フロー

**担当**: Iza  
**工数**: 1日（未実装）

##### ステップ1: 権限管理API実装（1日）

**実装内容**:
- 権限チェックAPI
- ロール管理API

#### 検証・テスト

**担当**: Iza  
**工数**: 0.5日

---

### 機能5: SSOT_SAAS_MEDIA_MANAGEMENT.md

**優先度**: 🟡 High  
**工数**: 2日

#### SSOT作成フロー

**担当**: Sun  
**工数**: 1日

#### hotel-saas実装フロー

**担当**: Sun  
**工数**: 0.5日

#### hotel-common実装フロー

**担当**: Iza  
**工数**: 0.5日

#### 検証・テスト

**担当**: Sun  
**工数**: 0.5日

---

### 機能6: SSOT_SAAS_PAYMENT_INTEGRATION.md

**優先度**: 🟡 High  
**工数**: 2日

#### SSOT作成フロー

**担当**: Iza  
**工数**: 1日

#### hotel-saas実装フロー

**担当**: Iza  
**工数**: 0.5日

#### hotel-common実装フロー

**担当**: Iza  
**工数**: 0.5日

#### 検証・テスト

**担当**: Iza  
**工数**: 0.5日

---

### Phase 1 完了基準

- [ ] 6件のSSOT作成完了
- [ ] 全SSOTがIzaレビュー合格
- [ ] 基盤機能が完全稼働
- [ ] 稼働率92%達成

---

## 🏨 Phase 2: コア機能SSOT作成・実装（3週間）

**目標**: 主要業務機能を完全稼働させる  
**期間**: 15営業日

### 機能1: SSOT_ADMIN_CAMPAIGNS.md

**優先度**: 🟡 High  
**工数**: 2日

#### SSOT作成フロー

**担当**: Sun  
**工数**: 1日

#### hotel-saas実装フロー

**担当**: Sun  
**工数**: 0.5日

#### hotel-common実装フロー

**担当**: Iza  
**工数**: 0.5日

#### 検証・テスト

**担当**: Sun  
**工数**: 0.5日

---

### 機能2: SSOT_ADMIN_CONTENT_APPS.md

**優先度**: 🟡 High  
**工数**: 2日

---

### 機能3: SSOT_ADMIN_AI_SETTINGS.md

**優先度**: 🟡 High  
**工数**: 2日

---

### 機能4: SSOT_ADMIN_PLAN_BILLING.md

**優先度**: 🟡 High  
**工数**: 2日

---

### 機能5: SSOT_SAAS_SYSTEM_INTEGRATION.md

**優先度**: 🟡 High  
**工数**: 3日

---

### 機能6-10: 客室端末SSOT（5件）

**優先度**: 🟡 High  
**工数**: 10日（各2日）

- SSOT_GUEST_ORDER_FLOW.md
- SSOT_GUEST_MENU_VIEW.md
- SSOT_GUEST_DEVICE_APP.md
- SSOT_GUEST_CAMPAIGN_VIEW.md
- SSOT_GUEST_INFO_PORTAL.md

---

### Phase 2 完了基準

- [ ] 10件のSSOT作成完了
- [ ] 全SSOTがIzaレビュー合格
- [ ] コア機能が完全稼働
- [ ] 客室端末フル機能稼働
- [ ] 稼働率95%達成

---

## 🎨 Phase 3: 拡張機能SSOT作成・実装（2週間）

**目標**: 付加価値機能・AI機能を完全稼働  
**期間**: 10営業日

### 機能1-8: 拡張機能SSOT（8件）

**工数**: 13日（並行作業で10日）

- SSOT_ADMIN_FACILITY_RESERVATION.md（2日）
- SSOT_ADMIN_BUSINESS_MANAGEMENT.md（2日）
- SSOT_ADMIN_MULTILINGUAL.md（2日）
- SSOT_GUEST_AI_CHAT.md（2日）
- SSOT_GUEST_APP_LAUNCHER.md（1日）
- SSOT_GUEST_PAGE_ROUTING.md（1日）
- SSOT_GUEST_DEVICE_RESET.md（1日）
- SSOT_SAAS_EMAIL_SYSTEM.md（2日）

---

### Phase 3 完了基準

- [ ] 8件のSSOT作成完了
- [ ] 全SSOTがIzaレビュー合格
- [ ] 拡張機能が完全稼働
- [ ] 稼働率97%達成

---

## 📊 Phase 4: 運用・監視完成（1週間）

**目標**: 運用・監視・ログ機能を完全稼働  
**期間**: 5営業日

### 機能1-4: 運用・監視SSOT（4件）

**工数**: 5日

- SSOT_SAAS_AUDIT_LOG.md（2日）
- SSOT_SAAS_ERROR_HANDLING.md（1日）
- SSOT_SAAS_LOG_SYSTEM.md（1日）
- SSOT_OPERATIONAL_LOG_ARCHITECTURE.md（1日）

---

### Phase 4 完了基準

- [ ] 4件のSSOT作成完了
- [ ] 全SSOTがIzaレビュー合格
- [ ] 運用・監視が完全稼働
- [ ] 稼働率98%達成

---

## 🎉 Phase 5: ビジネス機能完成（1週間）

**目標**: 残りのビジネス機能を完全稼働  
**期間**: 5営業日

### 機能1-4: ビジネス機能SSOT（4件）

**工数**: 6日（並行作業で5日）

- SSOT_SAAS_AI_CONCIERGE_GUEST.md（2日）
- SSOT_SAAS_AI_CONCIERGE_SETTINGS.md（1日）
- SSOT_SAAS_AI_KNOWLEDGE_BASE.md（2日）
- SSOT_SAAS_SYSTEM_BASIC.md（1日）

---

### Phase 5 完了基準

- [ ] 4件のSSOT作成完了
- [ ] 全SSOTがIzaレビュー合格
- [ ] ビジネス機能が完全稼働
- [ ] **🎉 稼働率100%達成！**

---

## 📅 マイルストーン定義

### M0: Phase 0完了（緊急修正完了）

**目標日**: 2025年10月14日（1週間後）  
**状態**: ⏳ 未達成

**達成内容**:
- ✅ JWT認証の残骸削除（53ファイル）
- ✅ 環境分岐コード削除（6ファイル）
- ✅ テナントIDハードコード削除（13ファイル）
- ✅ 全機能の動作確認完了

**稼働率**: **90%** - システムが完全稼働可能  
**評価**: **100点 / 100点**

---

### M1: Phase 1完了（基盤完成）

**目標日**: 2025年10月28日（3週間後）  
**状態**: ⏳ 未達成

**達成内容**:
- ✅ スーパーアドミン
- ✅ システムログ
- ✅ 請求管理
- ✅ 権限管理
- ✅ メディア管理
- ✅ 決済連携

**稼働率**: **92%** - システムの土台が完全に固まる

---

### M2: Phase 2完了（コア機能完成）

**目標日**: 2025年11月18日（6週間後）  
**状態**: ⏳ 未達成

**達成内容**:
- ✅ キャンペーン管理
- ✅ アプリ管理
- ✅ AI設定管理
- ✅ プラン・請求統合
- ✅ システム間連携完全稼働
- ✅ 客室端末フル機能

**稼働率**: **95%** - 主要業務が完全に回る

---

### M3: Phase 3完了（拡張機能完成）

**目標日**: 2025年12月2日（8週間後）  
**状態**: ⏳ 未達成

**達成内容**:
- ✅ 館内施設予約
- ✅ ビジネス管理
- ✅ 多言語設定
- ✅ 客室端末AIチャット
- ✅ 客室端末拡張機能
- ✅ メール送信

**稼働率**: **97%** - 付加価値機能が完全稼働

---

### M4: Phase 4完了（運用・監視完成）

**目標日**: 2025年12月9日（9週間後）  
**状態**: ⏳ 未達成

**達成内容**:
- ✅ 監査ログ
- ✅ エラーハンドリング
- ✅ ログシステム統合
- ✅ 運用ログアーキテクチャ

**稼働率**: **98%** - システム運用が完全に回る

---

### M5: Phase 5完了（システム100%稼働）

**目標日**: 2025年12月16日（10週間後）  
**状態**: ⏳ 未達成

**達成内容**:
- ✅ 客室AIコンシェルジュ完全稼働
- ✅ AI基本設定
- ✅ AIナレッジベース
- ✅ システム基本設定統合

**稼働率**: **🎉 100%** - 全機能完全稼働！

---

## 📊 工数見積もり

### Phase別工数サマリー

| Phase | SSOT数 | 合計工数 | 並行作業後 | 期間 | 担当AI数 |
|:-----:|:------:|:--------:|:----------:|:----:|:--------:|
| **Phase 0** | 0 | 5日 | 5日 | 1週間 | 2名 |
| **Phase 1** | 6 | 13日 | 10日 | 2週間 | 3名 |
| **Phase 2** | 10 | 22日 | 15日 | 3週間 | 2名 |
| **Phase 3** | 8 | 13日 | 10日 | 2週間 | 2名 |
| **Phase 4** | 4 | 5日 | 5日 | 1週間 | 1名 |
| **Phase 5** | 4 | 6日 | 5日 | 1週間 | 2名 |
| **合計** | **32** | **64日** | **50日** | **10週間** | - |

### 担当AI別工数

| 担当AI | Phase 0 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | 合計 |
|:------:|:-------:|:-------:|:-------:|:-------:|:-------:|:-------:|:----:|
| **Sun** | 3日 | 2日 | 12日 | 9日 | - | 3日 | **29日** |
| **Luna** | - | 2日 | - | - | - | - | **2日** |
| **Suno** | - | - | - | - | - | - | **0日** |
| **Iza** | 2日 | 9日 | 10日 | 4日 | 5日 | 2日 | **32日** |

---

## ⚠️ リスク管理

### 🔴 Critical リスク

#### リスク1: Phase 0の遅延

**発生確率**: 🟡 中（30%）  
**影響度**: 🔴 Critical  
**症状**: JWT認証の残骸削除が予想以上に時間がかかる

**対策**:
1. 1日ごとに進捗確認
2. 問題発生時は即座にIzaに報告
3. 必要に応じてペア作業

**責任者**: Sun + Iza

---

#### リスク2: 実装とSSOTの乖離

**発生確率**: 🟡 中（25%）  
**影響度**: 🔴 Critical  
**症状**: SSOT作成後、実装が大幅に異なることが判明

**対策**:
1. SSOT作成前に必ず実装コード確認
2. Phase 2以降も実装コード確認を継続
3. 差分が発見された場合は即座に修正

**責任者**: 各担当AI + Iza

---

### 🟡 High リスク

#### リスク3: 工数オーバー

**発生確率**: 🟡 中（40%）  
**影響度**: 🟡 High  
**症状**: 想定より時間がかかる

**対策**:
1. バッファ確保（各Phaseに20%）
2. 優先順位明確化（遅延時は優先度の低いSSOTを後回し）
3. 並行作業の活用
4. 週次レビュー

**責任者**: Iza

---

## 📈 進捗管理

### 週次レビュー

**実施日**: 毎週月曜日  
**参加者**: Sun、Luna、Suno、Iza  
**内容**:
1. 前週の進捗確認
2. 今週の目標設定
3. リスク・課題の共有
4. 工数・スケジュールの調整

### 月次レビュー

**実施日**: 毎月第1月曜日  
**参加者**: Sun、Luna、Suno、Iza + ユーザー  
**内容**:
1. 前月の進捗確認
2. マイルストーン達成状況
3. 稼働率確認
4. 次月の計画調整

---

## 🎯 成功基準

### Phase 0完了基準

- [ ] JWT認証の残骸削除完了（53ファイル）
- [ ] 環境分岐コード削除完了（6ファイル）
- [ ] テナントIDハードコード削除完了（13ファイル）
- [ ] 全機能の動作確認完了
- [ ] 稼働率90%達成
- [ ] 評価100点/100点達成

### Phase 1完了基準

- [ ] 6件のSSOT作成完了
- [ ] 全SSOTがIzaレビュー合格
- [ ] 基盤機能が完全稼働
- [ ] 稼働率92%達成

### Phase 2完了基準

- [ ] 10件のSSOT作成完了
- [ ] 全SSOTがIzaレビュー合格
- [ ] コア機能が完全稼働
- [ ] 客室端末フル機能稼働
- [ ] 稼働率95%達成

### Phase 3完了基準

- [ ] 8件のSSOT作成完了
- [ ] 全SSOTがIzaレビュー合格
- [ ] 拡張機能が完全稼働
- [ ] 稼働率97%達成

### Phase 4完了基準

- [ ] 4件のSSOT作成完了
- [ ] 全SSOTがIzaレビュー合格
- [ ] 運用・監視が完全稼働
- [ ] 稼働率98%達成

### Phase 5完了基準

- [ ] 4件のSSOT作成完了
- [ ] 全SSOTがIzaレビュー合格
- [ ] ビジネス機能が完全稼働
- [ ] **🎉 稼働率100%達成！**

---

## 📚 参考資料

- [IMPLEMENTATION_STATUS_ANALYSIS.md](/Users/kaneko/hotel-kanri/docs/03_ssot/IMPLEMENTATION_STATUS_ANALYSIS.md) - 実装状況分析
- [CRITICAL_ISSUES_REPORT.md](/Users/kaneko/hotel-kanri/docs/03_ssot/CRITICAL_ISSUES_REPORT.md) - 重大な問題点レポート
- [SSOT_CREATION_LIST_REVISED.md](/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_LIST_REVISED.md) - SSOT作成リスト
- [SSOT_CREATION_RULES.md](/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md) - SSOT作成ルール
- [write_new_ssot.md](/Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md) - SSOT作成プロンプト
- [retest_new_ssot.md](/Users/kaneko/hotel-kanri/.cursor/prompts/retest_new_ssot.md) - SSOTレビュープロンプト

---

## 🎉 最終目標

**2025年12月16日（10週間後）**:
- ✅ Phase 0-5完了
- ✅ 全32件のSSOT作成完了
- ✅ システム100%稼働達成
- ✅ 全機能が完全に動作
- ✅ 運用・監視が完全稼働
- ✅ hotel-kanriプロジェクト完成！

---

**最終更新**: 2025年10月7日  
**作成者**: Iza（統合管理者）  
**バージョン**: 2.0.0（実装コード調査完了版）  
**次回更新**: Phase 0完了後（2025年10月14日予定）
