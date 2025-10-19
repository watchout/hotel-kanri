# 📘 Single Source of Truth (SSOT) マスター管理表

**最終更新**: 2025年10月10日（ロードマップ統合版完成）  
**管理者**: 統合管理

このドキュメントは、hotel-kanriプロジェクト全体の**唯一の正式仕様書**を管理します。

---

## 🔗 重要リンク

### 📊 進捗管理・ロードマップ（唯一のファイル）
**[SSOT_PROGRESS_MASTER.md](./SSOT_PROGRESS_MASTER.md)** - 進捗管理とロードマップの統合ファイル

このファイルで確認できる内容：
- ✅ 全体進捗サマリー（実ファイルベース）
- ✅ Phase別進捗状況
- ✅ マイルストーン定義
- ✅ リスク管理
- ✅ 詳細進捗状況（カテゴリ別・実装状況付き）

> ⚠️ **重要**: 進捗管理・ロードマップはこのファイルのみで管理します。他のファイルで管理しないでください。

### 📐 SSOT作成ルール
**[SSOT_CREATION_RULES.md](./SSOT_CREATION_RULES.md)** - SSOT作成の完全ガイドライン

---

## 📋 目次

1. [SSOTとは](#ssoとは)
2. [ディレクトリ構成](#ディレクトリ構成)
3. [基盤SSOT（00_foundation/）](#基盤ssot00_foundation)
4. [管理画面SSOT（01_admin_features/）](#管理画面ssot01_admin_features)
5. [客室端末SSOT（02_guest_features/）](#客室端末ssot02_guest_features)
6. [ビジネス機能SSOT（03_business_features/）](#ビジネス機能ssot03_business_features)
7. [監視・ログSSO（04_monitoring/）](#監視ログssot04_monitoring)
8. [進捗サマリー](#進捗サマリー)
9. [作成予定順序](#作成予定順序)
10. [SSOT作成ルール](#ssot作成ルール)

---

## 📖 SSOTとは

- **目的**: 全開発者・AIエージェントが参照する統一仕様
- **原則**: 1つの機能 = 1つのSSOT
- **優先度**: SSOTが最高権威。矛盾がある場合はSSOTを信頼する
- **更新**: 実装前にSSOTを更新し、実装後にSSOTとの整合性を確認

### ステータス凡例

| 記号 | SSOT作成状態 | システム実装状態 |
|-----|------------|---------------|
| ✅ | 作成済み・確定 | 完全実装済み |
| 🟢 | - | 部分実装済み |
| 🟡 | - | 実装中 |
| ⏳ | 未作成 | - |
| ⭕ | - | 実装予定 |
| ❌ | - | 未実装 |
| - | - | 対象外 |

### 優先度凡例

| 記号 | 意味 | 実装タイミング |
|-----|------|-------------|
| 🔴 | 最高優先 | 即座実装必須 |
| 🟡 | 高優先 | 早期実装推奨 |
| 🟢 | 中優先 | 段階的実装 |

---

## 📁 ディレクトリ構成

```
/Users/kaneko/hotel-kanri/docs/03_ssot/
├── README.md                    # このファイル（マスター管理表）
├── 00_foundation/               # システム基盤（全機能の前提）
│   ├── SSOT_*.md               # 仕様書（正の情報源）
│   └── reports/                # レポート・検証結果・分析資料
├── 01_admin_features/           # 管理画面専用機能（Session認証）
│   ├── SSOT_*.md               # 仕様書（正の情報源）
│   └── reports/                # レポート・検証結果・実装ガイド
├── 02_guest_features/           # 客室端末専用機能（デバイス認証）
│   ├── SSOT_*.md               # 仕様書（正の情報源）
│   └── reports/                # レポート・検証結果（作成時に追加）
├── 03_business_features/        # 共通ビジネス機能
│   ├── SSOT_*.md               # 仕様書（正の情報源）
│   └── reports/                # レポート・検証結果（作成時に追加）
└── 04_monitoring/               # 監視・ログ
    ├── SSOT_*.md               # 仕様書（正の情報源）
    └── reports/                # レポート・検証結果（作成時に追加）
```

### 📊 仕様書とレポートの区別

| 種類 | 配置場所 | 命名規則 | 目的 |
|------|---------|---------|------|
| **仕様書（SSOT）** | 各セクション直下 | `SSOT_*.md` | システムの正の情報源 |
| **レポート類** | 各セクション内の`reports/` | `*_REPORT.md`<br>`*_VERIFICATION.md`<br>`*_GUIDE.md` | 検証結果・分析結果・実装ガイド |

**重要**: 矛盾がある場合は、常に**仕様書（SSOT）**を正とします。レポートは補助資料です。

---

## 🏗️ 基盤SSOT（00_foundation/）

**絶対パス**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/`

全機能の前提となる基盤仕様

| # | SSOT | 内容 | SSOT<br>状態 | 優先度 | 🌞<br>saas | 🌏<br>common | 🌙<br>pms | ⚡<br>member |
|:-:|:-----|:-----|:------:|:-----:|:-----:|:-------:|:----:|:------:|
| 0 | **STRATEGIC_VISION_GLOBAL_EXPANSION.md** | **グローバル展開戦略**<br>全システムの根幹方針<br>（日本・アジア・東南アジア中心、<br>中国・インド・アフリカ対応） | ✅ v1.0.0 | 🔴 | ✅ | ✅ | ✅ | ✅ |
| 1 | **SSOT_WORLD_CLASS_UI_DESIGN_PRINCIPLES.md** | **世界最高峰UIデザイン原則**<br>Netflix/Amazon/OpenAI/Google<br>日本の伝統色統合 | ✅ v1.0.0 | 🔴 | ✅ | ✅ | ✅ | ✅ |
| 1.5 | **SSOT_QUALITY_CHECKLIST.md** | **SSOT品質チェックリスト**<br>SSOT作成時必読<br>既存コード調査・命名規則・整合性確認 | ✅ v1.0.0 | 🔴 | ✅ | ✅ | ✅ | ✅ |
| 1.6 | **SSOT_IMPLEMENTATION_CHECKLIST.md** | **実装チェックリスト**<br>エラー防止・既存コード調査<br>ルーティング順序・SessionUser統一 | ✅ v1.0.0 | 🔴 | ✅ | ✅ | ✅ | ✅ |
| 1.7 | **SSOT_REQUIREMENT_ID_SYSTEM.md** | **要件ID管理システム**<br>実行可能な契約（テスト・型）<br>XXX-nnn形式・Accept定義・CIブロック | ✅ v1.0.0 | 🔴 | ✅ | ✅ | ✅ | ✅ |
| 2 | SSOT_SAAS_AUTHENTICATION.md | 認証システム全体 | ✅ | 🔴 | ✅ | ✅ | ⭕ | ⭕ |
| 3 | SSOT_SAAS_ADMIN_AUTHENTICATION.md | 管理画面認証 | ✅ | 🔴 | ✅ | ✅ | - | - |
| 4 | SSOT_SAAS_DEVICE_AUTHENTICATION.md | 客室端末認証 | ✅ | 🔴 | ✅ | ✅ | - | - |
| 5 | SSOT_DATABASE_MIGRATION_OPERATION.md | DBマイグレーション運用 | ✅ | 🔴 | 🟡 | 🟡 | ⭕ | ⭕ |
| 6 | SSOT_SAAS_MULTITENANT.md | マルチテナント基盤 | ✅ | 🔴 | ✅ | ✅ | ⭕ | ⭕ |
| 7 | SSOT_SAAS_DATABASE_SCHEMA.md | DBスキーマ統一 | ✅ | 🔴 | 🟢 | ✅ | ⭕ | ⭕ |
| 8 | SSOT_SAAS_SUPER_ADMIN.md | スーパーアドミン設計 | ⏳ | 🟡 | - | - | - | - |
| 9 | SSOT_SAAS_PERMISSION_SYSTEM.md | 権限管理（RBAC） | ⏳ | 🟡 | ❌ | ❌ | ❌ | ❌ |
| 10 | SSOT_SAAS_MEDIA_MANAGEMENT.md | メディア管理 | ⏳ | 🟡 | ⭕ | ⭕ | - | - |
| 11 | SSOT_SAAS_EMAIL_SYSTEM.md | メール送信システム | ⏳ | 🟡 | ❌ | ❌ | ❌ | ❌ |
| 12 | SSOT_SAAS_PAYMENT_INTEGRATION.md | 決済連携基盤 | ⏳ | 🟡 | ❌ | ❌ | ⭕ | - |
| 13 | SSOT_SAAS_SYSTEM_INTEGRATION.md | システム間連携基盤 | ⏳ | 🟡 | 🟢 | 🟢 | 🟡 | 🟡 |
| 14 | SSOT_MULTILINGUAL_SYSTEM.md | 多言語化システム | ✅ | 🟢 | ❌ | ❌ | ❌ | ❌ |
| 15 | SSOT_MULTICULTURAL_AI.md | 多文化おもてなしAI | ✅ | 🟢 | ❌ | ❌ | ❌ | ❌ |

**進捗**: 13/19 作成済み (68.4%)

---

## 🏨 管理画面SSOT（01_admin_features/）

**絶対パス**: `/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/`

🔐 スタッフが管理画面で使用する機能（Session認証必須）

### 📊 コア機能

| # | SSOT | 内容 | SSOT<br>状態 | 優先度 | 🌞<br>saas | 🌏<br>common | 作成順序 |
|:-:|:-----|:-----|:------:|:-----:|:-----:|:-------:|:-------:|
| 1 | SSOT_SAAS_DASHBOARD.md | ダッシュボード | ✅ | 🔴 | ✅ | ✅ | - |
| 2 | **ai_concierge/** | **AIコンシェルジュ管理（親子SSOT構成）** | - | 🔴 | - | - | **Phase 1-1** |
| 2-0 | ai_concierge/SSOT_ADMIN_AI_CONCIERGE_OVERVIEW.md | 全体概要（親SSOT）<br>アーキテクチャ・共通仕様 | ✅ v1.3.0 🌟100点 | 🔴 | 🟢 | ⭕ | ✅ 2025-10-09 |
| 2-1 | ai_concierge/SSOT_ADMIN_AI_KNOWLEDGE_BASE.md | 知識ベース管理 | ✅ v1.2.0 🌟100点 | 🔴 | 🟢 | ⭕ | ✅ 2025-10-09 |
| 2-2 | ai_concierge/SSOT_ADMIN_AI_PROVIDERS.md | LLMプロバイダー設定 | ✅ v1.2.0 🌟100点 | 🔴 | ❌ | ⭕ | ✅ 2025-10-09 |
| 2-3 | ai_concierge/SSOT_ADMIN_AI_CHARACTER.md | AIキャラクター設定 | ✅ v1.1.0 🌟120点 | 🔴 | 🟢 | ⭕ | ✅ 2025-10-09 |
| 2-4 | ai_concierge/SSOT_ADMIN_AI_CONVERSATIONS.md | 会話履歴 | ⏳ | 🟡 | 🟢 | ⭕ | Phase 2 |
| 2-5 | ai_concierge/SSOT_ADMIN_AI_CREDITS.md | クレジット管理 | ⏳ | 🟡 | 🟢 | ⭕ | Phase 2 |
| 2-6 | ai_concierge/SSOT_ADMIN_AI_DASHBOARD.md | ダッシュボード | ⏳ | 🟢 | 🟢 | ⭕ | Phase 2 |
| 2-7 | ai_concierge/SSOT_ADMIN_AI_MONITORING.md | 監視・分析 | ⏳ | 🟢 | ⚠️ | ⭕ | Phase 3 |
| 2-8 | ai_concierge/SSOT_ADMIN_AI_LIMITS.md | 利用制限設定 | ⏳ | 🟢 | ❌ | ⭕ | Phase 3 |
| 2-9 | ai_concierge/SSOT_ADMIN_AI_RESPONSE_TREE.md | 質問＆回答ツリー | ⏳ | 🟢 | 🟢 | ⭕ | Phase 3 |

### 🏨 オーダー管理

| # | SSOT | 内容 | SSOT<br>状態 | 優先度 | 🌞<br>saas | 🌏<br>common | 作成順序 |
|:-:|:-----|:-----|:------:|:-----:|:-----:|:-------:|:-------:|
| 3 | SSOT_SAAS_FRONT_DESK_OPERATIONS.md | フロント業務<br>（ダッシュボード/会計管理/<br>客室メモ/業務履歴） | ✅ | 🔴 | 🟢 | 🟢 | - |
| 4 | SSOT_SAAS_ORDER_MANAGEMENT.md | 注文管理<br>（注文一覧/キッチン用/配達用） | ✅ | 🔴 | ✅ | ✅ | - |
| 5 | SSOT_SAAS_MENU_MANAGEMENT.md | メニュー管理<br>（商品管理/カテゴリ管理/<br>ガチャメニュー） | ✅ | 🔴 | ✅ | ✅ | - |
| 6 | SSOT_ADMIN_STATISTICS_CORE.md | 統計・分析（基本統計）<br>（KPI/商品分析/客室分析/<br>時間帯分析/収益性分析） | ✅ | 🟡 | 🟢 | 🟢 | **Phase 2-1** ✅ |
| 7 | SSOT_ADMIN_STATISTICS_AI.md | 統計・分析（AI分析）<br>（異常検知/需要予測/<br>トレンド分析/推奨アクション） | ✅ | 🟢 | ❌ | ❌ | **Phase 3-5** ✅ |
| 8 | SSOT_ADMIN_STATISTICS_DELIVERY.md | 統計・分析（配信・A/Bテスト）<br>（AIコピー生成/配信スケジュール/<br>A/Bテスト/キャンペーン管理） | ✅ | 🟢 | ❌ | ❌ | **Phase 4-1** ✅ |

### 🎨 UIデザイン

| # | SSOT | 内容 | SSOT<br>状態 | 優先度 | 🌞<br>saas | 🌏<br>common | 作成順序 |
|:-:|:-----|:-----|:------:|:-----:|:-----:|:-------:|:-------:|
| 9 | SSOT_ADMIN_UI_DESIGN.md | UIデザイン・レイアウト管理<br>（テンプレート/ページ管理/<br>カスタムページ/ウィジェット） | ✅ v1.3.0 🌟100点 | 🔴 | 🟢 | ⭕ | **Phase 1-3** ✅ 2025-10-09 |

### 📱 コンテンツ

| # | SSOT | 内容 | SSOT<br>状態 | 優先度 | 🌞<br>saas | 🌏<br>common | 作成順序 |
|:-:|:-----|:-----|:------:|:-----:|:-----:|:-------:|:-------:|
| 10 | **SSOT_ADMIN_CONTENT_APPS.md** | **アプリ管理** | ⏳ | 🟡 | 🟢 | ⭕ | **Phase 3-1** |
| 11 | **SSOT_ADMIN_CAMPAIGNS.md** | **キャンペーン管理** | ⏳ | 🟡 | 🟢 | ⭕ | **Phase 2-4** |
| 12 | **SSOT_ADMIN_FACILITY_RESERVATION.md** | **館内施設予約管理** | ⏳ | 🟢 | ❌ | ❌ | **Phase 3-2** |

### ⚙️ システム設定

| # | SSOT | 内容 | SSOT<br>状態 | 優先度 | 🌞<br>saas | 🌏<br>common | 作成順序 |
|:-:|:-----|:-----|:------:|:-----:|:-----:|:-------:|:-------:|
| 13 | SSOT_ADMIN_BASIC_SETTINGS.md | 基本設定<br>（ホテル情報/会計設定/<br>支払い方法/表示制御） | ✅ v1.2.0 🌟100点 | 🔴 | 🟢 | 🟢 | **Phase 1-2** ✅ 2025-10-09 |
| 14 | SSOT_SAAS_ROOM_MANAGEMENT.md | 客室管理<br>（客室一覧/客室ランク/<br>デバイス管理） | ✅ | 🔴 | 🟢 | ✅ | - |
| 15 | **SSOT_ADMIN_BILLING.md** | **請求管理** | ⏳ | 🟡 | 🟢 | ⭕ | **Phase 2-5** |
| 16 | **SSOT_ADMIN_BUSINESS_MANAGEMENT.md** | **ビジネス管理**<br>（代理店/テナント/AIモデル/<br>料金設定/プラン制限）<br>※SuperAdmin専用 | ⏳ | 🟢 | ❌ | ❌ | **Phase 3-3** |
| 17 | **SSOT_ADMIN_AI_SETTINGS.md** | **AI設定**<br>（用途別モデル割当/<br>AIクレジット） | ⏳ | 🟡 | 🟢 | ⭕ | **Phase 2-3** |
| 18 | **SSOT_ADMIN_MULTILINGUAL.md** | **多言語設定** | ⏳ | 🟢 | ❌ | ❌ | **Phase 3-4** |

### 📋 システムログ

| # | SSOT | 内容 | SSOT<br>状態 | 優先度 | 🌞<br>saas | 🌏<br>common | 作成順序 |
|:-:|:-----|:-----|:------:|:-----:|:-----:|:-------:|:-------:|
| 19 | **SSOT_ADMIN_SYSTEM_LOGS.md** | **システムログ**<br>（統合ログ/認証/セキュリティ/<br>AI/課金/デバイス） | ⏳ | 🟡 | 🟢 | 🟢 | **Phase 2-2** |

### 💰 プラン・請求

| # | SSOT | 内容 | SSOT<br>状態 | 優先度 | 🌞<br>saas | 🌏<br>common | 作成順序 |
|:-:|:-----|:-----|:------:|:-----:|:-----:|:-------:|:-------:|
| 20 | **SSOT_ADMIN_PLAN_BILLING.md** | **プラン・請求情報** | ⏳ | 🟡 | 🟢 | ⭕ | **Phase 2-6** |

**進捗**: 11/20 作成済み (55.0%)

---

## 📱 客室端末SSOT（02_guest_features/）

**絶対パス**: `/Users/kaneko/hotel-kanri/docs/03_ssot/02_guest_features/`

📱 ゲストが客室端末で使用する機能（デバイス認証）

**⚠️ 重要**: 各SSOTは必ず対応する管理画面SSOTを参照すること

### Phase 1 - 必須機能（🔴 最高優先）

| # | SSOT | 内容 | SSOT<br>状態 | 参照する管理画面SSOT | 🌞<br>saas |
|:-:|:-----|:-----|:------:|:-----------------|:-----:|
| 1 | SSOT_GUEST_ROOM_SERVICE_UI.md | 客室ルームサービスUI全体 | ✅ | SSOT_SAAS_ORDER_MANAGEMENT.md<br>SSOT_SAAS_MENU_MANAGEMENT.md | ✅ |
| 2 | SSOT_GUEST_ORDER_FLOW.md | 注文フロー<br>（カート→確認→送信） | ⏳ | SSOT_SAAS_ORDER_MANAGEMENT.md | 🟢 |
| 3 | SSOT_GUEST_MENU_VIEW.md | メニュー閲覧・検索・フィルタ | ⏳ | SSOT_SAAS_MENU_MANAGEMENT.md | 🟢 |
| 4 | SSOT_GUEST_DEVICE_APP.md | WebViewアプリ<br>（Capacitor + Google TV） | ⏳ | SSOT_SAAS_DEVICE_AUTHENTICATION.md | 🟢 |

### Phase 2 - 重要機能（🟡 高優先）

| # | SSOT | 内容 | SSOT<br>状態 | 参照する管理画面SSOT | 🌞<br>saas |
|:-:|:-----|:-----|:------:|:-----------------|:-----:|
| 5 | SSOT_GUEST_CAMPAIGN_VIEW.md | キャンペーン表示<br>（ウェルカムムービー） | ⏳ | SSOT_ADMIN_CAMPAIGNS.md | ❌ |
| 6 | SSOT_GUEST_INFO_PORTAL.md | 情報ポータル<br>（館内案内・観光） | ⏳ | SSOT_ADMIN_UI_DESIGN.md | ❌ |
| 7 | SSOT_GUEST_AI_CHAT.md | AIコンシェルジュチャット | ⏳ | SSOT_ADMIN_AI_CONCIERGE.md | ❌ |

### Phase 3 - 追加機能（🟢 中優先）

| # | SSOT | 内容 | SSOT<br>状態 | 参照する管理画面SSOT | 🌞<br>saas |
|:-:|:-----|:-----|:------:|:-----------------|:-----:|
| 8 | SSOT_GUEST_APP_LAUNCHER.md | アプリ起動・初期化・<br>自動ログイン | ⏳ | SSOT_SAAS_DEVICE_AUTHENTICATION.md | ❌ |
| 9 | SSOT_GUEST_PAGE_ROUTING.md | ページ遷移・ナビゲーション・<br>リモコン操作 | ⏳ | - | ❌ |
| 10 | SSOT_GUEST_DEVICE_RESET.md | 端末リセット・初期化・<br>メンテナンス | ⏳ | SSOT_ADMIN_BASIC_SETTINGS.md | ❌ |

**進捗**: 1/10 作成済み (10.0%)

---

## 💼 ビジネス機能SSOT（03_business_features/）

**絶対パス**: `/Users/kaneko/hotel-kanri/docs/03_ssot/03_business_features/`

両方のユーザーに関わる付加価値機能

| # | SSOT | 内容 | SSOT<br>状態 | 優先度 | 🌞<br>saas | 🌏<br>common |
|:-:|:-----|:-----|:------:|:-----:|:-----:|:-------:|
| 1 | SSOT_SAAS_AI_CONCIERGE_GUEST.md | 客室AIチャット | ⏳ | 🟡 | ❌ | ❌ |
| 2 | SSOT_SAAS_AI_CONCIERGE_SETTINGS.md | AI基本設定 | ⏳ | 🟢 | ❌ | ❌ |
| 3 | SSOT_SAAS_AI_KNOWLEDGE_BASE.md | AIナレッジベース | ⏳ | 🟢 | ❌ | ❌ |
| 4 | SSOT_SAAS_SYSTEM_BASIC.md | システム基本設定 | ⏳ | 🟡 | 🟢 | 🟢 |

**進捗**: 0/4 作成済み (0.0%)

---

## 📊 監視・ログSSO（04_monitoring/）

**絶対パス**: `/Users/kaneko/hotel-kanri/docs/03_ssot/04_monitoring/`

運用・保守機能

| # | SSOT | 内容 | SSOT<br>状態 | 優先度 | 🌞<br>saas | 🌏<br>common |
|:-:|:-----|:-----|:------:|:-----:|:-----:|:-------:|
| 1 | SSOT_OPERATIONAL_LOG_ARCHITECTURE.md | 運用ログアーキテクチャ | ⏳ | 🟢 | 🟢 | 🟢 |
| 2 | SSOT_SAAS_AUDIT_LOG.md | 監査ログ基盤 | ⏳ | 🟢 | ❌ | ❌ |
| 3 | SSOT_SAAS_ERROR_HANDLING.md | エラーハンドリング | ⏳ | 🟢 | 🟢 | 🟢 |
| 4 | SSOT_SAAS_LOG_SYSTEM.md | ログシステム統合 | ⏳ | 🟢 | 🟢 | 🟢 |

**進捗**: 0/4 作成済み (0.0%)

---

## 📈 進捗サマリー

### 全体進捗

| カテゴリ | 作成済み | 未作成 | 合計 | 進捗率 |
|---------|---------|--------|------|--------|
| **00_foundation/** | 7 | 6 | 13 | 53.8% |
| **01_admin_features/** | 11 | 9 | 20 | 55.0% |
| **02_guest_features/** | 1 | 9 | 10 | 10.0% |
| **03_business_features/** | 0 | 4 | 4 | 0.0% |
| **04_monitoring/** | 0 | 4 | 4 | 0.0% |
| **合計** | **19** | **32** | **51** | **37.3%** |

### システム別実装状況

| システム | 完全実装 | 部分実装 | 実装中 | 実装予定 | 未実装 | 対象外 |
|---------|---------|---------|--------|---------|--------|--------|
| **🌞 hotel-saas** | 9 | 8 | 2 | 3 | 8 | 2 |
| **🌏 hotel-common** | 10 | 6 | 2 | 6 | 6 | 2 |
| **🌙 hotel-pms** | 0 | 3 | 2 | 8 | 5 | 14 |
| **⚡ hotel-member** | 0 | 2 | 2 | 6 | 6 | 16 |

---

## 🎯 作成予定順序

### 🔴 Phase 1 - 最高優先（即座実装が必要）

| 順序 | SSOT | 理由 | 想定工数 | 状態 |
|-----|------|------|---------|------|
| **1** | `SSOT_ADMIN_AI_CONCIERGE.md` | コア機能・実装済みUI多数・業務影響大 | 3-4日 | ✅ 完成 |
| **2** | `SSOT_ADMIN_BASIC_SETTINGS.md` | システムの基礎設定・全機能に影響 | 2-3日 | ✅ 完成<br>**(v1.2.0 - 100点)** |
| **3** | `SSOT_ADMIN_UI_DESIGN.md` | ページ管理・テンプレート・顧客体験に直結<br>**全管理画面SSOTから参照される基盤仕様** | 2-3日 | ✅ 完成<br>**(v1.3.0 - 100点)** |

### 🟡 Phase 2 - 高優先（早期実装が望ましい）

| 順序 | SSOT | 理由 | 想定工数 | 状態 |
|-----|------|------|---------|------|
| **4** | `SSOT_ADMIN_STATISTICS_CORE.md` | 経営判断・基本統計分析に必要 | 2-3日 | ✅ 完成<br>**(v1.1.0 - 120点満点)** |
| **5** | `SSOT_ADMIN_SYSTEM_LOGS.md` | 運用・監視・トラブルシューティングに必須 | 2-3日 | ⏳ 未作成 |
| **6** | `SSOT_ADMIN_AI_SETTINGS.md` | AI機能の拡張・最適化 | 1-2日 | ⏳ 未作成 |
| **7** | `SSOT_ADMIN_CAMPAIGNS.md` | マーケティング・売上向上 | 2-3日 | ⏳ 未作成 |
| **8** | `SSOT_ADMIN_BILLING.md` | 請求管理・売上管理 | 2-3日 | ⏳ 未作成 |
| **9** | `SSOT_ADMIN_PLAN_BILLING.md` | プラン・請求統合管理 | 2-3日 | ⏳ 未作成 |

### 🟢 Phase 3 - 中優先（段階的実装）

| 順序 | SSOT | 理由 | 想定工数 | 状態 |
|-----|------|------|---------|------|
| **10** | `SSOT_ADMIN_CONTENT_APPS.md` | アプリ管理・拡張機能 | 1-2日 | ⏳ 未作成 |
| **11** | `SSOT_ADMIN_FACILITY_RESERVATION.md` | 館内施設予約・付加価値 | 2-3日 | ⏳ 未作成 |
| **12** | `SSOT_ADMIN_BUSINESS_MANAGEMENT.md` | SuperAdmin専用・代理店管理 | 2-3日 | ⏳ 未作成 |
| **13** | `SSOT_ADMIN_MULTILINGUAL.md` | 多言語対応・国際化 | 2-3日 | ⏳ 未作成 |
| **14** | `SSOT_ADMIN_STATISTICS_AI.md` | AI分析・インサイト機能 | 2-3日 | ✅ 完成<br>**(v1.1.0 - 120点満点)** |

### 🟣 Phase 4 - 将来実装（付加価値機能）

| 順序 | SSOT | 理由 | 想定工数 | 状態 |
|-----|------|------|---------|------|
| **15** | `SSOT_ADMIN_STATISTICS_DELIVERY.md` | 配信スタジオ・A/Bテスト機能 | 2-3日 | ✅ 完成<br>**(v1.1.0 - 120点満点)** |

### 📅 推奨スケジュール

```
Week 1: Phase 1 (1-3)   - 基礎固め
Week 2: Phase 2前半 (4-6) - 運用・分析基盤
Week 3: Phase 2後半 (7-9) - ビジネス機能
Week 4: Phase 3 (10-13)  - 拡張機能
```

---

## ✅ SSOT作成ルール

### 基本原則

1. **テンプレート使用**: `/Users/kaneko/hotel-kanri/docs/templates/ssot-template.md`を使用
2. **唯一の正解**: 既存ドキュメントとの矛盾がある場合はSSOTが正
3. **連携更新**: SSOTを更新したら関連ドキュメントも更新
4. **実装前レビュー**: 実装前にSSOTのレビュー必須
5. **技術的正確性**: 想像ではなく、既存の決定事項と実装を基にする
6. **完全性**: API、DB、型定義、エラーハンドリング、テストを全て含む
7. **管理画面と客室端末の分離**: 混乱を避けるため、別々のSSOTとして作成

### 作成手順

**参照プロンプト**: `/Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md`

1. 実装状況の調査（ソースコード確認必須）
2. 既存ドキュメントの確認
3. データベーススキーマの確認
4. API仕様の確認
5. テンプレートに基づいた執筆
6. レビュー（`retest_new_ssot.md`に基づく）
7. 関連ドキュメントの更新

### SSOTが最高権威

- SSOTと他のドキュメントが矛盾する場合、**SSOTが正**
- 実装がSSOTと異なる場合、**実装をSSOTに合わせる**
- 古いドキュメントは参考程度、**SSOTを信頼する**

### 更新プロセス

1. 要件変更 → SSOTを更新
2. SSOT更新 → 関連ドキュメント更新
3. 実装完了 → SSOTとの整合性確認

### AIエージェント向けルール

- 実装前に必ずSSOTを確認
- SSOTに記載のない機能は実装禁止
- SSOTの更新提案は必ず人間の承認を得る

---

## 🔗 各システムからの参照方法

### hotel-saas (Sun担当)
```markdown
<!-- /Users/kaneko/hotel-saas/README.md から -->
- [管理画面認証SSOT](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md)
- [注文管理SSOT](/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_ORDER_MANAGEMENT.md)
```

### hotel-pms (Luna担当)
```markdown
<!-- /Users/kaneko/hotel-pms/docs/README.md から -->
- [認証基盤SSOT](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_AUTHENTICATION.md)
- [フロント業務SSOT](/Users/kaneko/hotel-kanri/docs/03_ssot/01_admin_features/SSOT_SAAS_FRONT_DESK_OPERATIONS.md)
```

### hotel-member (Suno担当)
```markdown
<!-- /Users/kaneko/hotel-member/README.md から -->
- [マルチテナントSSOT](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md)
- [権限管理SSOT](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_PERMISSION_SYSTEM.md)
```

### hotel-common (Iza担当)
```markdown
<!-- /Users/kaneko/hotel-common/README.md から -->
- [データベースSSOT](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md)
- [システム間連携SSOT](/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_SYSTEM_INTEGRATION.md)
```

---

## 📝 テンプレート

新しいSSOTを作成する際は、以下のテンプレートを使用してください：

**テンプレートパス**: `/Users/kaneko/hotel-kanri/docs/templates/ssot-template.md`

---

## 🎉 最新の更新

### 2025年10月13日 - グローバル展開戦略SSOT作成 🌏

**新規SSOT作成**:
- `STRATEGIC_VISION_GLOBAL_EXPANSION.md` (v1.0.0) ✅
  - 全システムの根幹となる戦略ビジョン文書
  - 日本・アジア・東南アジア圏を中心とした展開戦略
  - 中国・インド・東南アジア・アフリカ圏からのインバウンド対応方針
  - 各システム（hotel-saas/pms/member/common）のMVVを統合
  - 文化的配慮の詳細方針（宗教・食事・習慣・タブー）
  - グローバル展開ロードマップ（2025-2030年）

**統合内容**:
- 🌞 hotel-saas "Amaterasu" のVMV（唯一無二のおもてなし）
- 🌙 hotel-pms "Tsukuyomi" のVMV（経営の羅針盤）
- ⚡ hotel-member "Susanoo" のVMV（業界の競争力向上）
- 🌏 hotel-common "Izanagi" のVMV（統合基盤・創造神）

**文化的配慮の詳細**:
- イスラム教（ハラール・祈祷・ラマダン対応）
- ヒンドゥー教（ベジタリアン・牛肉除外）
- 仏教（精進料理・瞑想スペース）
- ユダヤ教（コーシャ・安息日）
- 文化的タブー（数字・色・ジェスチャー）

**市場展開計画**:
```
Phase 1 (2025年): 国内基盤確立
Phase 2 (2026-2027年): アジア展開（台湾・韓国・タイ・ベトナム・シンガポール・マレーシア・インドネシア）
Phase 3 (2028-2030年): アジア全域（中国・インド・UAE・サウジアラビア・フィリピン）
```

**技術的対応**:
- 15言語完全対応（文化的ニュアンス理解）
- 200+国の文化プロファイル
- AI駆動の文化理解・配慮の自動化

**.cursorrules統合**:
- 全AI開発者がこの戦略を常に参照するよう設定
- 機能開発時にグローバル展開を必ず意識
- 文化データのセンシティブな扱いを義務化

---

### 2025年10月7日 - 多文化おもてなしAIシステムSSO作成

**新規SSOT作成**:
- `SSOT_MULTICULTURAL_AI.md` (v1.0.0) ✅
  - 多文化おもてなしAIシステムの完全仕様
  - 7つの機能（文化的配慮AI、文化的コンテキストAI、文化的イベント対応AI、食文化インテリジェンスAI、視覚的文化適応AI、文化的言語ニュアンスAI、文化的ジェスチャー認識AI）
  - 集中方式アーキテクチャ（hotel-common + システム固有層）
  - 管理者による有効/無効設定、プラン別機能制限
  - 文化データベース（200+国の文化プロファイル）
  - OpenAI統合、学習機能、プライバシー保護
  - 段階的実装計画（14週間）

**特徴**:
- 単なる翻訳を超えた「文化に寄り添うおもてなし」を実現
- PROFESSIONAL以上のプランで利用可能
- 月間AIコスト: ¥40/ホテル（GPT-4o mini使用時）
- 宗教的配慮、食文化配慮、文化的タブー回避を自動化
- ゲストの文化的背景に応じたAI応答の最適化

---

### 2025年10月7日 - 多言語化システムSSO作成

**新規SSOT作成**:
- `SSOT_MULTILINGUAL_SYSTEM.md` (v1.0.0) ✅
  - 多言語化システムの完全仕様
  - 共通エンジン（hotel-common）+ システム固有層アーキテクチャ
  - 15言語対応、3層アーキテクチャ（静的UI/動的コンテンツ/AI生成）
  - データベース設計（ハイブリッド方式）
  - 翻訳実行フロー、UI/UX考慮事項
  - パフォーマンス最適化、品質管理、コスト管理
  - 段階的実装計画

**特徴**:
- DRY原則に基づく共通エンジン方式
- 97%のコスト削減（月¥5,000 → ¥150）
- 各機能実装時に多言語対応を組み込む戦略
- 15言語以上への拡張が容易な設計

---

### 2025年10月7日 - レポート類の整理

**レポート・検証結果の分離**:
- 各セクションに`reports/`ディレクトリを作成
- 仕様書（SSOT）とレポート類を明確に分離
- 以下のファイルを移動:
  - `00_foundation/reports/SCHEMA_CONSISTENCY_CHECK_REPORT.md`
  - `01_admin_features/reports/SSOT_DISCREPANCY_REPORT.md`
  - `01_admin_features/reports/SSOT_SAAS_MENU_MANAGEMENT_IMPLEMENTATION_VERIFICATION.md`
  - `01_admin_features/reports/SSOT_SAAS_MENU_MANAGEMENT_SAAS_IMPLEMENTATION_GUIDE.md`

**目的**: どれが仕様書でどれがレポートなのかを明確にし、混乱を防止

---

### 2025年10月6日 - 統計・分析機能SSOT 完成！

3つのSSOTに分割して作成しました：

1. **SSOT_ADMIN_STATISTICS_CORE.md** (v1.1.0) ✅
   - 基本統計機能（KPI、商品分析、客室分析、時間帯分析、収益性分析）
   - 既存実装状況の詳細調査
   - マイグレーション計画・トラブルシューティング完備

2. **SSOT_ADMIN_STATISTICS_AI.md** (v1.1.0) ✅
   - AI分析・インサイト機能（異常検知、需要予測、トレンド分析）
   - OpenAI API統合アーキテクチャ
   - クレジット管理システム

3. **SSOT_ADMIN_STATISTICS_DELIVERY.md** (v1.1.0) ✅
   - 配信スタジオ・A/Bテスト機能
   - AIコピー生成、統計的有意性判定（χ²検定）
   - キャンペーン管理

**全て「120点満点」品質で作成**：
- マイグレーション計画
- 監視・ロギング詳細
- トラブルシューティングガイド
- 実装時の注意事項
- パフォーマンス最適化チェックリスト
- セキュリティチェックリスト

---

**最終更新**: 2025年10月7日  
**管理者**: Iza（統合管理者）
