# 🤖 AIエージェント遵守強制戦略

**対象**: hotel-saas、hotel-member、hotel-pms担当AIエージェント  
**課題**: AIは人間と異なり、記憶・理解・学習の仕組みが根本的に違う  
**解決**: AIの特性に特化した自動遵守強制システム

---

## 🎯 **AIエージェントの特性と課題**

### **❌ 人間向け戦略が通用しない理由**

| 人間向け戦略 | AIでの問題 | 根本原因 |
|--------------|------------|----------|
| **理解度テスト** | テスト自体が無意味 | AIは「理解」ではなく「パターン認識」 |
| **対面説明会** | 実施不可能 | AIには「対面」概念が存在しない |
| **継続的記憶** | conversation終了で消失 | 永続メモリの制限 |
| **組織文化醸成** | 文化概念が存在しない | AIには社会性・文化の概念がない |
| **自発的遵守** | 自発性の概念がない | ルールベース動作のみ |

### **✅ AIエージェントの動作特性**

```yaml
AIの動作原理:
  基本動作: ルールベース + パターンマッチング
  記憶範囲: conversation内のみ（短期記憶）
  学習能力: 個別conversation内のみ（永続学習なし）
  判断基準: 明示的ルール + 学習データパターン
  
動作制約:
  - conversation間でのメモリ共有不可
  - 抽象的ルールの解釈に限界
  - 文脈依存の判断が困難
  - 複雑な推論チェーンでエラー発生
```

---

## 🔧 **AI特化遵守強制システム**

### **1. Cursor Rules 統合システム**

#### **各プロジェクトの.cursor/rules強制配布**
```typescript
// hotel-member/.cursor/rules
export const HOTEL_MEMBER_AI_RULES = `
# 🏨 hotel-member AI担当者 必須遵守ルール

## データベース操作の絶対ルール
- 全テーブルに tenant_id 必須（例外なし）
- 顧客情報更新時は origin_system, updated_by_system, synced_at 必須
- ポイント操作は必ず履歴テーブルに記録
- 会員ランク変更時は rank_history テーブル更新必須

## Event-driven連携の絶対ルール  
- 顧客情報変更時は customer.updated イベント必須発行
- イベント発行時は HotelEventPublisher.publishEvent() 使用必須
- hotel-pms更新可能項目: name, phone, address のみ
- ポイント・ランク情報はhotel-pms更新禁止

## API実装の絶対ルール
- レスポンス形式: { success: boolean, data: any, metadata: any }
- エラー時: { success: false, error: { code, message, details } }
- 全APIにJWT認証必須（/health除く）
- hotel-common統一エラーコード使用必須

## 実装禁止事項
- 直接SQL実行（Prisma ORM必須）
- tenant_id なしのクエリ実行
- 他システムDBへの直接アクセス
- Redis Streams以外のイベント通信

## 質問時の必須確認
- 上記ルール違反の可能性がある場合は必ず確認質問
- 不明な場合は hotel-common 設計書を参照要求
- 実装前に影響システムを明確化
`

// hotel-pms/.cursor/rules  
export const HOTEL_PMS_AI_RULES = `
# 🏨 hotel-pms AI担当者 必須遵守ルール

## 予約管理の絶対ルール
- 全予約に origin (MEMBER/OTA/FRONT/PHONE/WALK_IN) 必須
- 予約変更時は reservation.updated イベント必須発行
- チェックイン/アウト時は checkin_checkout イベント必須
- 部屋ダブルブッキングの自動検知・拒否必須

## 顧客情報の制限ルール
- 更新可能項目: name, phone, address のみ
- ポイント・ランク・配信設定の更新禁止
- 顧客情報更新時は hotel-member への同期必須
- 重要項目変更時は手動確認フロー必須

## 部屋・在庫管理ルール
- 部屋状態変更時は room.status_changed イベント必須
- メンテナンス期間中の予約自動拒否
- 在庫計算は常にリアルタイム更新
- 予約キャンセル時の在庫即座回復

## システム間連携ルール
- hotel-member: 限定的顧客情報更新のみ
- hotel-saas: 読み取り専用（注文情報除く）
- 売上データは他システムから参照可能にする
`

// hotel-saas/.cursor/rules
export const HOTEL_SAAS_AI_RULES = `
# 🏨 hotel-saas AI担当者 必須遵守ルール

## データアクセス制限ルール
- 顧客情報: 参照のみ（更新は hotel-member 経由）
- 予約情報: 参照のみ（更新は hotel-pms 経由）
- 部屋在庫: アクセス禁止（予約情報から推測）
- 注文・サービス情報: 全権限

## 注文・サービス管理ルール
- 注文作成時は service.ordered イベント必須発行
- hotel-pms への請求連携必須
- コンシェルジュ依頼の履歴保存必須
- 顧客フィードバック情報の蓄積・分析

## API実装制限
- 他システムDBへの直接書き込み禁止
- Event-driven連携以外での他システム操作禁止
- 決済処理は hotel-pms 経由必須
- 顧客個人情報は最小限アクセス
`
```

### **2. Memory System 活用**

#### **システム設計メモリの強制注入**
```typescript
// AIエージェント起動時の自動メモリ注入
interface AIAgentMemoryInjection {
  system_role: "hotel-member" | "hotel-pms" | "hotel-saas"
  mandatory_memories: [
    {
      id: "core_architecture_rules"
      content: "PostgreSQL統一基盤・Event-driven連携・システム間権限分離の絶対遵守"
      priority: "critical"
      reference: "docs/system-integration-detailed-design.md"
    },
    {
      id: "database_schema_compliance" 
      content: "tenant_id必須・ソーストラッキング必須・Prisma ORM専用"
      priority: "critical"
      reference: "docs/postgresql-unified-schema.md"
    },
    {
      id: "event_driven_rules"
      content: "データ変更時イベント発行必須・Redis Streams専用・競合解決ルール遵守"
      priority: "critical" 
      reference: "docs/event-driven-architecture-design.md"
    }
  ]
  
  conversation_triggers: [
    "データベース操作時",
    "API実装時", 
    "システム間連携時",
    "エラーハンドリング時"
  ]
}
```

### **3. 自動検証・強制停止システム**

#### **リアルタイム実装チェック**
```typescript
// AIエージェントの実装提案を自動検証
interface AIImplementationValidator {
  
  // 危険な実装パターンの自動検知
  dangerous_patterns: [
    {
      pattern: /直接SQL|raw\s+query|execute\s*\(/i
      message: "🚨 直接SQL実行禁止！Prisma ORM必須です"
      action: "implementation_block"
      reference: "PostgreSQL統一基盤設計"
    },
    {
      pattern: /tenant_id\s*(?!.*where)/i  
      message: "🚨 tenant_id条件なしクエリ禁止！"
      action: "implementation_block"
      reference: "マルチテナント設計"
    },
    {
      pattern: /(?:customer|reservation).*update.*(?!event)/i
      message: "🚨 データ更新時のイベント発行が未実装！"
      action: "warning_with_fix_suggestion"
      reference: "Event-driven連携基盤"
    }
  ]
  
  // 必須実装パターンの検証
  required_patterns: [
    {
      context: "customer_data_update"
      required: /HotelEventPublisher\.publishEvent.*customer\.updated/
      message: "顧客データ更新時はcustomer.updatedイベント必須"
    },
    {
      context: "api_response"
      required: /success.*data.*metadata/
      message: "統一レスポンス形式 { success, data, metadata } 必須"
    }
  ]
  
  auto_actions: {
    implementation_block: "提案実装を強制停止・修正要求"
    warning_with_fix: "警告表示・修正例提示"
    reference_injection: "関連設計書の自動表示"
  }
}
```

### **4. プロンプト強制システム**

#### **System Promptの強制上書き**
```yaml
# AIエージェントの基本動作プロンプト強制設定
system_prompt_override: |
  あなたは hotel-{SYSTEM_NAME} の専門AIエージェントです。
  
  🚨 絶対遵守ルール（違反時は実装停止）:
  1. データベース操作: 全クエリにtenant_id必須・Prisma ORM専用
  2. イベント発行: データ変更時は対応イベント必須発行
  3. API実装: 統一レスポンス形式・エラーハンドリング必須
  4. システム間連携: 権限分離・競合解決ルール遵守
  
  🔍 実装前必須確認:
  - hotel-common設計書との整合性
  - 他システムへの影響範囲
  - Event-driven連携の必要性
  - データ整合性・競合リスク
  
  📚 参照必須文書:
  - docs/system-integration-detailed-design.md
  - docs/event-driven-architecture-design.md  
  - docs/postgresql-unified-schema.md
  
  ❌ 実装禁止事項:
  - 設計書に記載のない独自実装
  - 他システムDBへの直接アクセス
  - tenant_idなしのクエリ
  - イベント発行なしのデータ更新
  
  不明な点は必ず設計書確認・質問してください。
```

---

## 🔄 **自動監視・修正システム**

### **1. 継続的監視ボット**

#### **GitHub Bot統合**
```typescript
// hotel-common-compliance-bot
interface ComplianceBot {
  monitoring_scope: [
    "pull_request_creation",
    "code_diff_analysis", 
    "commit_message_scan",
    "file_change_detection"
  ]
  
  ai_specific_checks: {
    rule_compliance: {
      check: "Cursor rules参照確認"
      action: "PRコメントでルール再通知"
    }
    
    memory_injection: {
      check: "設計メモリ注入確認" 
      action: "conversation開始時メモリ強制セット"
    }
    
    dangerous_pattern: {
      check: "禁止実装パターン検知"
      action: "PR自動ブロック・修正指示"
    }
    
    required_pattern: {
      check: "必須実装パターン確認"
      action: "不足項目の自動指摘・実装例提示"
    }
  }
  
  escalation: {
    severe_violation: "human_developer_notification"
    repeated_violation: "ai_agent_reset_suggestion"
    system_risk: "emergency_stop"
  }
}
```

### **2. 自動修正・ガイドシステム**

#### **実装修正の自動提案**
```typescript
// AIエージェント向け自動修正システム
interface AutoFixSuggestion {
  
  // 典型的な違反パターンと修正例
  common_violations: [
    {
      violation_type: "missing_tenant_id"
      detection: /\.findMany\(\s*\{(?!.*tenant_id)/
      auto_fix: `
        // ❌ 違反例
        const customers = await prisma.customer.findMany({
          where: { name: "田中" }
        })
        
        // ✅ 修正例  
        const customers = await prisma.customer.findMany({
          where: { 
            tenant_id: tenantId,  // 必須追加
            name: "田中" 
          }
        })
      `
    },
    {
      violation_type: "missing_event_publish"
      detection: /customer.*update(?!.*publishEvent)/
      auto_fix: `
        // ❌ 違反例
        await prisma.customer.update({ data: updatedData })
        
        // ✅ 修正例
        const updatedCustomer = await prisma.customer.update({ data: updatedData })
        
        // イベント発行必須
        await eventPublisher.publishEvent({
          type: 'customer',
          action: 'updated', 
          data: updatedCustomer,
          // ... その他必須フィールド
        })
      `
    }
  ]
  
  contextual_guidance: {
    show_relevant_docs: true
    provide_code_examples: true
    explain_business_impact: true
    suggest_testing_approach: true
  }
}
```

---

## 📋 **AI担当者別強制ルールセット**

### **hotel-member AI 強制ルール**
```typescript
const HOTEL_MEMBER_ENFORCEMENT = {
  absolute_rules: [
    "顧客情報変更時はcustomer.updatedイベント必須発行",
    "ポイント操作は履歴テーブル記録必須", 
    "hotel-pms更新権限は name/phone/address のみ",
    "ランク変更時はrank_historyテーブル更新必須"
  ],
  
  automatic_checks: [
    "customer update without event → BLOCK",
    "point operation without history → BLOCK", 
    "unauthorized field update to PMS → BLOCK",
    "rank change without history → BLOCK"
  ],
  
  memory_injection: "customer master management rules",
  cursor_rules_path: "hotel-member/.cursor/rules"
}
```

### **hotel-pms AI 強制ルール** 
```typescript
const HOTEL_PMS_ENFORCEMENT = {
  absolute_rules: [
    "予約作成・更新時はreservation.updatedイベント必須",
    "チェックイン/アウト時はcheckin_checkout.checked_inイベント必須",
    "顧客情報更新は制限項目のみ許可",
    "部屋ダブルブッキング自動検知・拒否必須"
  ],
  
  automatic_checks: [
    "reservation without event → BLOCK",
    "checkin without event → BLOCK",
    "unauthorized customer field update → BLOCK", 
    "double booking attempt → BLOCK"
  ],
  
  memory_injection: "reservation central management rules",
  cursor_rules_path: "hotel-pms/.cursor/rules"
}
```

### **hotel-saas AI 強制ルール**
```typescript
const HOTEL_SAAS_ENFORCEMENT = {
  absolute_rules: [
    "顧客・予約情報は参照のみ（更新禁止）",
    "注文作成時はservice.orderedイベント必須", 
    "他システムDBへの直接書き込み禁止",
    "請求連携はhotel-pms経由必須"
  ],
  
  automatic_checks: [
    "customer/reservation write operation → BLOCK",
    "service order without event → BLOCK",
    "direct DB write to other systems → BLOCK",
    "payment bypass → BLOCK"
  ],
  
  memory_injection: "read-only + service management rules",
  cursor_rules_path: "hotel-saas/.cursor/rules"
}
```

---

## 🎯 **AI遵守強制の成功指標**

### **技術指標**
```yaml
自動検知率:
  - 危険パターン検知率: 100%
  - 必須パターン不足検知率: 95%以上
  - 設計書参照促進率: 90%以上

自動修正率:
  - 自動修正提案適用率: 80%以上
  - 修正後再違反率: < 5%
  - AIエージェント学習効果: 向上傾向

遵守継続性:
  - conversation間でのルール継続率: 90%以上
  - 設計変更時の自動追従率: 95%以上
  - 新AIエージェント対応時間: < 1時間
```

### **業務効果指標**
```yaml
実装品質:
  - 設計違反による実装修正: 80%削減
  - システム間連携エラー: 95%削減
  - データ整合性エラー: 99%削減

開発効率:
  - AI実装速度: 30%向上（ルール明確化により）
  - 手戻り作業時間: 70%削減
  - 新機能開発リードタイム: 40%短縮
```

---

## 🚀 **実装優先順位**

### **Phase 1: 緊急実装（今すぐ）**
1. **Cursor Rules強制配布** → 各プロジェクトの.cursor/rulesファイル作成
2. **Memory強制注入** → 設計ルールの自動メモリセット
3. **危険パターン検知** → 実装ブロック機能

### **Phase 2: 自動化強化（1週間）**
1. **GitHub Bot統合** → PR自動チェック・修正提案
2. **自動修正システム** → 典型違反の自動修正提示
3. **継続監視** → conversation跨ぎ監視

### **Phase 3: 最適化（2週間）**
1. **学習効果測定** → AIエージェント改善傾向分析
2. **ルール最適化** → 効果的なルールセット調整
3. **完全自動化** → 人間介入なしの遵守強制

---

この**AI特化遵守強制システム**により、人間ではなくAIエージェントが担当する場合でも、設計書・仕様書の完全な遵守を自動的に実現します。 