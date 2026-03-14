# 📊 SSOT作成リスト（全面見直し版）

**作成日**: 2025年10月3日  
**管理者**: Iza（統合管理者）  
**基準**: 実装済み機能の実態調査に基づく正確なリスト

---

## 📋 目次

1. [見直しの背景](#見直しの背景)
2. [調査結果サマリー](#調査結果サマリー)
3. [SSOT作成リスト（改訂版）](#ssot作成リスト改訂版)
4. [優先順位マトリックス](#優先順位マトリックス)
5. [次のアクション](#次のアクション)

---

## 🔍 見直しの背景

### 問題点

従来の`SSOT_IMPLEMENTATION_STATUS.md`には以下の問題がありました：

1. **実装済み機能がSSOTリストに含まれていない**
   - AIコンシェルジュ（OpenAI連携済み）
   - コンテンツ管理（apps, 記事、施設情報）
   - ログ管理（AI, 認証, セキュリティ等）
   - 統計・分析機能（利益分析、時間分析等）
   - キャンペーン管理（実装済み）
   - タグ管理（実装済み）
   - レイアウト管理（実装済み）
   - テンプレート管理（実装済み）

2. **実装されていない機能がリストに含まれている**
   - 予約管理（PMSの機能、SaaSは対象外）
   - チェックイン/アウト（PMSの機能、SaaSは対象外）
   - 顧客管理（Memberの機能、SaaSは対象外）

3. **カテゴリ分けが実態と合っていない**
   - AI機能が「ビジネス機能」に分類されているが、実態はコア機能
   - フロント業務が「コア機能」だが、SaaSでは管理機能の一部

### 調査方法

- `/pages/admin/` 配下のディレクトリ・ファイル全確認
- 既存SSOT文書の精査
- 実装済み機能の棚卸し

---

## 📊 調査結果サマリー

### hotel-saas実装済み機能（ディレクトリベース）

```
✅ 認証・セッション管理
✅ ダッシュボード（統計サマリー）
✅ デバイス管理（客室端末）
✅ 注文管理（Order Management）
✅ メニュー管理（Menu + Categories）
✅ 客室管理（Rooms + Room Grades）
✅ フロント業務（会計、領収書、客室メモ）
✅ 請求管理（Billing）
✅ AIコンシェルジュ（character, knowledge, response, monitoring）
✅ キャンペーン管理（Campaigns）
✅ タグ管理（Tags）
✅ コンテンツ管理（Info: 記事、施設、観光、WiFi）
✅ レイアウト管理（Layouts + Widget Editor）
✅ テンプレート管理（Templates Editor）
✅ 統計・分析（利益分析、客室利用分析、時間分析等）
✅ ログ管理（AI, 認証, セキュリティ, デバイス, 運用）
✅ システム設定（基本設定、ホテル情報、決済方法等）
✅ キッチン管理（Kitchen Orders）
✅ 配送管理（Delivery）
✅ ガチャメニュー（Gacha Menus）
✅ エージェント管理（Agents）
✅ スーパーアドミン（Dashboard, Analytics, Security, Settings）
```

### 実装されていない（または他システムの機能）

```
❌ 予約管理（Reservation） → hotel-pms の機能
❌ チェックイン/アウト → hotel-pms の機能
❌ 顧客管理（Customer） → hotel-member の機能
❌ 会員ランク → hotel-member の機能
```

---

## 📝 SSOT作成リスト（改訂版）

### 00_foundation/ - システム基盤（12件）

| # | SSOT名 | 状態 | 優先度 | 対象システム | 備考 |
|:-:|:-------|:----:|:-----:|:-----------|:-----|
| 1 | **AUTHENTICATION** | ✅ 確定 | 🔴 最高 | saas, common | Session/JWT認証 |
| 2 | **ADMIN_AUTHENTICATION** | ✅ 確定 | 🔴 最高 | saas, common | スタッフログイン |
| 3 | **DEVICE_AUTHENTICATION** | ✅ 確定 | 🔴 最高 | saas, common | MAC/IP認証 |
| 4 | **DATABASE_MIGRATION_OPERATION** | ✅ 確定 | 🔴 最高 | 全システム | 権限分離必須 |
| 5 | **MULTITENANT** | ✅ 確定 | 🔴 最高 | saas, common | サブドメイン廃止 |
| 6 | **DATABASE_SCHEMA** | ✅ 確定 | 🔴 最高 | 全システム | v2.0完了 |
| 7 | **SUPER_ADMIN** | ❌ 未作成 | 🟡 高 | saas | **実装済み・SSOT化必要** |
| 8 | **PERMISSION_SYSTEM** | ❌ 未作成 | 🟡 高 | 全システム | RBAC実装必要 |
| 9 | **MEDIA_MANAGEMENT** | ❌ 未作成 | 🟡 高 | saas, common | 画像・動画管理 |
| 10 | **EMAIL_SYSTEM** | ❌ 未作成 | 🟢 中 | common | メール送信 |
| 11 | **PAYMENT_INTEGRATION** | ❌ 未作成 | 🟡 高 | common, pms | 決済連携基盤 |
| 12 | **SYSTEM_INTEGRATION** | ❌ 未作成 | 🟡 高 | 全システム | システム間連携 |

**進捗**: 6/12 (50.0%)

---

### 01_core_features/ - コア機能（15件）← **大幅追加**

| # | SSOT名 | 状態 | 優先度 | 対象システム | 備考 |
|:-:|:-------|:----:|:-----:|:-----------|:-----|
| 1 | **DASHBOARD** | ✅ 確定 | 🔴 最高 | saas, common | 統計ダッシュボード |
| 2 | **ROOM_SERVICE_GUEST** | ✅ 確定 | 🔴 最高 | saas | 客室ルームサービスUI |
| 3 | **ORDER_MANAGEMENT** | ✅ 確定 | 🔴 最高 | saas, common | 注文管理システム |
| 4 | **MENU_MANAGEMENT** | ✅ 確定 | 🔴 最高 | saas, common | メニュー管理 |
| 5 | **ROOM_MANAGEMENT** | ✅ 確定 | 🔴 最高 | saas, common | 客室管理（v3.0.0・120点） |
| 6 | **FRONT_DESK_OPERATIONS** | ❌ 未作成 | 🟡 高 | saas, common | **実装済み・SSOT化必要** |
| 7 | **BILLING** | ❌ 未作成 | 🟡 高 | saas, common | **実装済み・SSOT化必要** |
| 8 | **KITCHEN_MANAGEMENT** | ❌ 未作成 | 🟢 中 | saas | **実装済み・SSOT化必要** |
| 9 | **DELIVERY_MANAGEMENT** | ❌ 未作成 | 🟢 中 | saas | **実装済み・SSOT化必要** |
| 10 | **DEVICE_MANAGEMENT** | ❌ 未作成 | 🟡 高 | saas, common | **実装済み・SSOT化必要** |
| 11 | **STATISTICS_ANALYTICS** | ❌ 未作成 | 🟡 高 | saas, common | **実装済み・SSOT化必要** |
| 12 | **LOG_MANAGEMENT** | ❌ 未作成 | 🟢 中 | saas, common | **実装済み・SSOT化必要** |
| 13 | **SYSTEM_SETTINGS** | ❌ 未作成 | 🟡 高 | saas | **実装済み・SSOT化必要** |
| 14 | **GACHA_MENU** | ❌ 未作成 | 🟢 低 | saas | **実装済み・SSOT化必要** |
| 15 | **AGENTS_MANAGEMENT** | ❌ 未作成 | 🟢 低 | saas | **実装済み・SSOT化必要** |

**進捗**: 5/15 (33.3%)  
**新規追加**: 8件（Kitchen, Delivery, Device, Statistics, Log, Settings, Gacha, Agents）

---

### 02_business_features/ - ビジネス機能（10件）← **大幅追加**

| # | SSOT名 | 状態 | 優先度 | 対象システム | 備考 |
|:-:|:-------|:----:|:-----:|:-----------|:-----|
| 1 | **AI_CONCIERGE_GUEST** | ❌ 未作成 | 🔴 最高 | saas, common | **実装済み・SSOT化必要** |
| 2 | **AI_CONCIERGE_SETTINGS** | ❌ 未作成 | 🟡 高 | saas | **実装済み・SSOT化必要** |
| 3 | **AI_KNOWLEDGE_BASE** | ❌ 未作成 | 🟡 高 | saas, common | **実装済み・SSOT化必要** |
| 4 | **AI_MONITORING** | ❌ 未作成 | 🟢 中 | saas | **実装済み・SSOT化必要** |
| 5 | **CAMPAIGN_MANAGEMENT** | ❌ 未作成 | 🟡 高 | saas, common | **実装済み・SSOT化必要** |
| 6 | **TAG_MANAGEMENT** | ❌ 未作成 | 🟢 中 | saas | **実装済み・SSOT化必要** |
| 7 | **CONTENT_MANAGEMENT** | ❌ 未作成 | 🟡 高 | saas | **実装済み・SSOT化必要** |
| 8 | **LAYOUT_MANAGEMENT** | ❌ 未作成 | 🟡 高 | saas | **実装済み・SSOT化必要** |
| 9 | **TEMPLATE_MANAGEMENT** | ❌ 未作成 | 🟢 中 | saas | **実装済み・SSOT化必要** |
| 10 | **CHECKIN_SESSIONS** | ✅ 存在 | 🟢 中 | saas, pms | **旧SSOT・見直し必要** |

**進捗**: 0/10 (0.0%)  
**新規追加**: 9件（AI系4件、キャンペーン、タグ、コンテンツ、レイアウト、テンプレート）

---

### 03_monitoring/ - 監視・ログ（3件）

| # | SSOT名 | 状態 | 優先度 | 対象システム | 備考 |
|:-:|:-------|:----:|:-----:|:-----------|:-----|
| 1 | **AUDIT_LOG** | ❌ 未作成 | 🟢 中 | 全システム | 監査ログ基盤 |
| 2 | **ERROR_HANDLING** | ❌ 未作成 | 🟢 中 | 全システム | エラーハンドリング統一 |
| 3 | **LOG_SYSTEM** | ❌ 未作成 | 🟢 中 | 全システム | ログシステム統合 |

**進捗**: 0/3 (0.0%)

---

### ❌ リストから除外（他システムの機能）

以下はhotel-saasのSSOTリストから**除外**します：

| SSOT名 | 理由 | 担当システム |
|:------|:-----|:-----------|
| **RESERVATION** | 予約管理はPMSの機能 | hotel-pms |
| **CHECK_IN_OUT** | チェックイン/アウトはPMSの機能 | hotel-pms |
| **CUSTOMER_MANAGEMENT** | 顧客管理はMemberの機能 | hotel-member |

---

## 📊 全体サマリー（改訂版）

### カテゴリ別

| カテゴリ | 確定済み | 未作成 | 合計 | 進捗率 |
|---------|---------|--------|------|--------|
| **00_foundation** | 6 | 6 | 12 | **50.0%** |
| **01_core_features** | 5 | 10 | 15 | **33.3%** |
| **02_business_features** | 0 | 10 | 10 | **0.0%** |
| **03_monitoring** | 0 | 3 | 3 | **0.0%** |
| **合計** | **11** | **29** | **40** | **27.5%** |

### 状態別

| 状態 | 件数 | 割合 |
|-----|------|------|
| ✅ 確定済み | 11 | 27.5% |
| ❌ 未作成（実装済み） | 21 | 52.5% |
| ❌ 未作成（未実装） | 8 | 20.0% |
| **合計** | **40** | **100.0%** |

### 重要な発見

1. **実装済みだがSSOT未作成が21件**
   - これらは最優先でSSOT化が必要
   - 実装は完了しているため、仕様を確認しながら文書化

2. **未実装でSSOT未作成が8件**
   - 実装計画とともにSSOT作成が必要

3. **除外すべき機能が3件**
   - hotel-pms/hotel-memberの担当領域

---

## 🎯 優先順位マトリックス

### 🔴 最優先（次の5件を順次作成）

| 順位 | SSOT名 | 理由 | 予定工数 |
|:---:|:------|:-----|:------:|
| 1 | **FRONT_DESK_OPERATIONS** | フロント業務の中核、実装済み | 2日 |
| 2 | **BILLING** | 会計・請求管理、実装済み | 1.5日 |
| 3 | **AI_CONCIERGE_GUEST** | OpenAI連携済み、顧客体験の中核 | 2日 |
| 4 | **DEVICE_MANAGEMENT** | 客室端末管理、実装済み | 1.5日 |
| 5 | **STATISTICS_ANALYTICS** | 統計・分析機能、実装済み | 2日 |

### 🟡 高優先（次の10件）

| 順位 | SSOT名 | 理由 | 予定工数 |
|:---:|:------|:-----|:------:|
| 6 | **SUPER_ADMIN** | スーパーアドミン機能、実装済み | 1.5日 |
| 7 | **SYSTEM_SETTINGS** | システム設定、実装済み | 1日 |
| 8 | **CAMPAIGN_MANAGEMENT** | キャンペーン管理、実装済み | 1.5日 |
| 9 | **CONTENT_MANAGEMENT** | コンテンツ管理、実装済み | 2日 |
| 10 | **LAYOUT_MANAGEMENT** | レイアウト管理、実装済み | 1.5日 |
| 11 | **AI_KNOWLEDGE_BASE** | AIナレッジベース、実装済み | 1.5日 |
| 12 | **AI_CONCIERGE_SETTINGS** | AI設定、実装済み | 1日 |
| 13 | **LOG_MANAGEMENT** | ログ管理、実装済み | 1.5日 |
| 14 | **KITCHEN_MANAGEMENT** | キッチン管理、実装済み | 1日 |
| 15 | **DELIVERY_MANAGEMENT** | 配送管理、実装済み | 1日 |

### 🟢 中優先（次の7件）

| 順位 | SSOT名 | 理由 | 予定工数 |
|:---:|:------|:-----|:------:|
| 16 | **MEDIA_MANAGEMENT** | 画像・動画管理、未実装 | 2日 |
| 17 | **PERMISSION_SYSTEM** | RBAC、未実装 | 2日 |
| 18 | **PAYMENT_INTEGRATION** | 決済連携、未実装 | 2日 |
| 19 | **SYSTEM_INTEGRATION** | システム間連携、部分実装 | 2日 |
| 20 | **TAG_MANAGEMENT** | タグ管理、実装済み | 1日 |
| 21 | **TEMPLATE_MANAGEMENT** | テンプレート管理、実装済み | 1日 |
| 22 | **AI_MONITORING** | AI監視、実装済み | 1日 |

### 🟢 低優先（次の6件）

| 順位 | SSOT名 | 理由 | 予定工数 |
|:---:|:------|:-----|:------:|
| 23 | **GACHA_MENU** | ガチャメニュー、実装済み | 1日 |
| 24 | **AGENTS_MANAGEMENT** | エージェント管理、実装済み | 1日 |
| 25 | **EMAIL_SYSTEM** | メール送信、未実装 | 1.5日 |
| 26 | **AUDIT_LOG** | 監査ログ、未実装 | 1.5日 |
| 27 | **ERROR_HANDLING** | エラーハンドリング、部分実装 | 1日 |
| 28 | **LOG_SYSTEM** | ログシステム統合、部分実装 | 1日 |

---

## 🚀 次のアクション

### Phase 1: 最優先5件の作成（10日間）

```
1. SSOT_SAAS_FRONT_DESK_OPERATIONS.md
2. SSOT_SAAS_BILLING.md
3. SSOT_SAAS_AI_CONCIERGE_GUEST.md
4. SSOT_SAAS_DEVICE_MANAGEMENT.md
5. SSOT_SAAS_STATISTICS_ANALYTICS.md
```

### Phase 2: 高優先10件の作成（14日間）

```
6-15. 上記高優先リストの順次作成
```

### Phase 3: 中優先以降（随時）

```
16-28. 上記中・低優先リストの順次作成
```

---

## 📋 SSOT作成時の遵守ルール

1. **`/Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md`を厳守**
2. **既存実装の完全調査**
   - ページファイル
   - APIエンドポイント
   - データベーステーブル
   - Composables/Utils
3. **システム間連携の明記**
4. **120点レベルの完璧なドキュメント**
5. **`/Users/kaneko/hotel-kanri/.cursor/prompts/retest_new_ssot.md`でレビュー**

---

## 📝 更新履歴

| 日付 | 更新内容 | 担当 |
|------|---------|------|
| 2025-10-03 | 初版作成・実装済み機能の全面棚卸し | Iza |

---

**最終更新**: 2025年10月3日  
**作成者**: Iza（統合管理者）  
**次回更新**: Phase 1完了後（2週間後）


