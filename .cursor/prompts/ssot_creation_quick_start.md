# 🚀 SSOT作成クイックスタート

**目的**: SSOT作成を素早く開始するためのガイド

---

## 📋 SSOT作成の開始方法

### ステップ1: プロンプトを選択

**Phase 1（基盤SSOT）**:
```
/Users/kaneko/hotel-kanri/.cursor/prompts/ssot_creation_prompt_phase1.md
```

**Phase 2（コア機能SSOT）**:
```
/Users/kaneko/hotel-kanri/.cursor/prompts/ssot_creation_prompt_phase2.md
```

### ステップ2: 作成したいSSOTを指定

例:
```
「SSOT_SAAS_SUPER_ADMIN.mdを作成してください」
```

### ステップ3: AIが自動で実行

AIが以下を自動実行します：

1. **Phase 0: 準備**
   - 必須ドキュメント読み込み
   - 既存SSOT読み込み
   - 本番同等ルール確認

2. **Phase 1-3: 実装調査**
   - 既存ドキュメント読み込み
   - 実装ファイル読み込み
   - 差分分析
   - 本番同等性チェック

3. **Phase 4-7: SSOT記述**
   - SSOT記述
   - 必須要件明記
   - 既存SSOTとの整合性確認
   - 最終チェック

4. **レビュー**
   - `retest_new_ssot.md`でレビュー
   - 修正・完成

---

## 📊 Phase別SSOT一覧

### Phase 1（基盤SSOT）- 6件

1. ✅ SSOT_SAAS_SUPER_ADMIN.md（2日・Iza）
2. ✅ SSOT_ADMIN_SYSTEM_LOGS.md（2日・Iza）
3. ✅ SSOT_ADMIN_BILLING.md（2日・Luna）
4. ✅ SSOT_SAAS_PERMISSION_SYSTEM.md（3日・Iza）
5. ✅ SSOT_SAAS_MEDIA_MANAGEMENT.md（2日・Sun）
6. ✅ SSOT_SAAS_PAYMENT_INTEGRATION.md（2日・Iza）

### Phase 2（コア機能SSOT）- 10件

#### 管理画面（5件）
1. ✅ SSOT_ADMIN_CAMPAIGNS.md（2日・Sun）
2. ✅ SSOT_ADMIN_CONTENT_APPS.md（2日・Sun）
3. ✅ SSOT_ADMIN_AI_SETTINGS.md（2日・Sun）
4. ✅ SSOT_ADMIN_PLAN_BILLING.md（2日・Iza）
5. ✅ SSOT_SAAS_SYSTEM_INTEGRATION.md（3日・Iza）

#### 客室端末（5件）
6. ✅ SSOT_GUEST_ORDER_FLOW.md（2日・Sun）
7. ✅ SSOT_GUEST_MENU_VIEW.md（2日・Sun）
8. ✅ SSOT_GUEST_DEVICE_APP.md（3日・Sun）
9. ✅ SSOT_GUEST_CAMPAIGN_VIEW.md（2日・Sun）
10. ✅ SSOT_GUEST_INFO_PORTAL.md（2日・Sun）

### Phase 3（拡張機能SSOT）- 8件

1. ✅ SSOT_ADMIN_FACILITY_RESERVATION.md（2日・Sun）
2. ✅ SSOT_ADMIN_BUSINESS_MANAGEMENT.md（2日・Iza）
3. ✅ SSOT_ADMIN_MULTILINGUAL.md（2日・Sun）
4. ✅ SSOT_GUEST_AI_CHAT.md（2日・Sun）
5. ✅ SSOT_GUEST_APP_LAUNCHER.md（1日・Sun）
6. ✅ SSOT_GUEST_PAGE_ROUTING.md（1日・Sun）
7. ✅ SSOT_GUEST_DEVICE_RESET.md（1日・Sun）
8. ✅ SSOT_SAAS_EMAIL_SYSTEM.md（2日・Iza）

### Phase 4（運用・監視SSOT）- 4件

1. ✅ SSOT_SAAS_AUDIT_LOG.md（2日・Iza）
2. ✅ SSOT_SAAS_ERROR_HANDLING.md（1日・Iza）
3. ✅ SSOT_SAAS_LOG_SYSTEM.md（1日・Iza）
4. ✅ SSOT_OPERATIONAL_LOG_ARCHITECTURE.md（1日・Iza）

### Phase 5（ビジネス機能SSOT）- 4件

1. ✅ SSOT_SAAS_AI_CONCIERGE_GUEST.md（2日・Sun）
2. ✅ SSOT_SAAS_AI_CONCIERGE_SETTINGS.md（1日・Sun）
3. ✅ SSOT_SAAS_AI_KNOWLEDGE_BASE.md（2日・Sun）
4. ✅ SSOT_SAAS_SYSTEM_BASIC.md（1日・Iza）

---

## 🎯 推奨作成順序

### Week 1
1. SSOT_SAAS_SUPER_ADMIN.md
2. SSOT_ADMIN_SYSTEM_LOGS.md
3. SSOT_ADMIN_BILLING.md

### Week 2
4. SSOT_SAAS_PERMISSION_SYSTEM.md
5. SSOT_SAAS_MEDIA_MANAGEMENT.md
6. SSOT_SAAS_PAYMENT_INTEGRATION.md

### Week 3
7. SSOT_ADMIN_CAMPAIGNS.md
8. SSOT_ADMIN_CONTENT_APPS.md
9. SSOT_ADMIN_AI_SETTINGS.md

### Week 4以降
Phase 2-5を継続...

---

## 📚 参考資料

### 必須ドキュメント
- `/Users/kaneko/hotel-kanri/.cursor/prompts/write_new_ssot.md` - SSOT作成手順
- `/Users/kaneko/hotel-kanri/.cursor/prompts/retest_new_ssot.md` - SSOTレビュー
- `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_CREATION_RULES.md` - 作成ルール詳細

### ロードマップ
- `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md` - 進捗管理・ロードマップ統合（唯一のファイル）

### 実装状況
- `/Users/kaneko/hotel-kanri/docs/03_ssot/IMPLEMENTATION_STATUS_ANALYSIS.md` - 実装状況分析

---

## 💡 Tips

### 並行作業
- Phase 0（緊急修正）とSSO作成は並行可能
- 実装を待たずにSSOT作成を進めてOK

### 効率的な作成
1. 同じカテゴリのSSOTをまとめて作成
2. 関連SSOTを先に読み込む
3. テンプレートを活用

### 品質確保
1. 必ず実装コードを確認
2. 既存SSOTとの整合性を確認
3. レビューを必ず実施

---

**作成日**: 2025年10月7日  
**管理者**: Iza（統合管理者）

