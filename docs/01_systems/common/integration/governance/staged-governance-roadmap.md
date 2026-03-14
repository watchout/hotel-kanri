# 段階的ガバナンス移行ロードマップ

**移行スケジュールと監視体制の統合設計**

---

## 🎯 **基本方針**

既存システム（hotel-saas、hotel-member）の開発を**止めることなく**、段階的に統一基盤への移行と監視強化を実現する。

### **監視レベルの段階設定**
- **Level 0（Legacy）**: 監視なし・既存ルール維持
- **Level 1（Transition）**: 軽微な警告・非ブロッキング
- **Level 2（Standard）**: 標準監視・一部ブロッキング  
- **Level 3（Strict）**: 厳格監視・全面適用

---

## 📅 **段階的移行スケジュール**

### **Phase 1: 基盤準備期間（完了済み）**
**期間**: 2024年12月  
**対象**: hotel-common基盤整備  
**監視レベル**: すべて Level 0

**✅ 完了事項**:
- PostgreSQL統一基盤構築
- API統合仕様書策定  
- 開発制御ドキュメント作成

**監視設定**:
```typescript
const governanceConfig = {
  "hotel-saas": { level: 0, monitoring: false },
  "hotel-member": { level: 0, monitoring: false },
  "hotel-pms": { level: 0, monitoring: false },
  "hotel-common": { level: 3, monitoring: true }
}
```

---

### **Phase 2a: hotel-pms新規開発期間**
**期間**: 2025年1月〜2月  
**対象**: hotel-pms（新規なので最初から統一基盤準拠）  
**監視レベル**: hotel-pms のみ Level 3、他は Level 0

**🎯 方針**:
- hotel-pmsは最初から**完全準拠**で開発
- 既存システムは**従来通り開発継続**
- 統一基盤との連携インターフェースのみ段階実装

**監視設定**:
```typescript
const governanceConfig = {
  "hotel-saas": { level: 0, monitoring: false, notes: "独自開発継続" },
  "hotel-member": { level: 0, monitoring: false, notes: "PostgreSQL移行中" },
  "hotel-pms": { level: 3, monitoring: true, notes: "統一基盤完全準拠" },
  "hotel-common": { level: 3, monitoring: true }
}
```

**hotel-pms開発制御**:
```typescript
// hotel-pmsのみ厳格適用
{
  "api-format": "enforce", // 統一API形式必須
  "error-handling": "enforce", // 統一エラーコード必須
  "authentication": "enforce", // JWT認証必須
  "database": "enforce", // PostgreSQL + Prisma必須
  "source-tracking": "enforce" // ソーストラッキング必須
}
```

---

### **Phase 2b: hotel-member移行準備期間**
**期間**: 2025年2月〜3月  
**対象**: hotel-member（PostgreSQL移行完了→統一基盤移行）  
**監視レベル**: hotel-member を Level 1 に段階昇格

**🎯 方針**:
- PostgreSQL移行完了後、統一基盤への段階移行開始
- **非ブロッキング警告**から開始
- 重要なAPIのみ段階的に統一形式採用

**監視設定**:
```typescript
const governanceConfig = {
  "hotel-saas": { level: 0, monitoring: false },
  "hotel-member": { 
    level: 1, 
    monitoring: true, 
    mode: "warning-only",
    notes: "段階移行中・開発継続"
  },
  "hotel-pms": { level: 3, monitoring: true },
  "hotel-common": { level: 3, monitoring: true }
}
```

**hotel-member段階制御**:
```typescript
{
  "api-format": "warn", // 警告のみ・ブロックしない
  "error-handling": "warn", 
  "authentication": "transitioning", // JWT移行並行作業
  "database": "migrated", // PostgreSQL移行完了
  "source-tracking": "optional" // 新規作成時のみ適用
}
```

---

### **Phase 3: hotel-saas移行期間**
**期間**: 2025年3月〜4月  
**対象**: hotel-saas（SQLite→PostgreSQL + 統一基盤移行）  
**監視レベル**: hotel-saas を Level 1 に段階昇格

**🎯 方針**:
- hotel-memberの移行ノウハウを活用
- SQLiteからPostgreSQLへのデータ移行
- 段階的な統一API採用

**監視設定**:
```typescript
const governanceConfig = {
  "hotel-saas": { 
    level: 1, 
    monitoring: true, 
    mode: "warning-only",
    notes: "SQLite→PostgreSQL移行中"
  },
  "hotel-member": { level: 2, monitoring: true, notes: "統一基盤移行中" },
  "hotel-pms": { level: 3, monitoring: true },
  "hotel-common": { level: 3, monitoring: true }
}
```

---

### **Phase 4: 統一基盤完全適用期間**
**期間**: 2025年4月〜5月  
**対象**: 全システムLevel 2以上に統一  
**監視レベル**: 段階的にLevel 3へ統一

**🎯 方針**:
- 全システムが統一基盤準拠完了
- 厳格な監視体制への段階移行
- 運用体制の確立

**最終監視設定**:
```typescript
const governanceConfig = {
  "hotel-saas": { level: 3, monitoring: true, notes: "統一基盤完全準拠" },
  "hotel-member": { level: 3, monitoring: true, notes: "統一基盤完全準拠" },
  "hotel-pms": { level: 3, monitoring: true, notes: "統一基盤完全準拠" },
  "hotel-common": { level: 3, monitoring: true }
}
```

---

## 🛡️ **段階別監視機構**

### **Level 0: Legacy Mode（監視なし）**
```typescript
{
  enforcement: false,
  warnings: false,
  blocking: false,
  notes: "既存開発方式継続・移行準備のみ"
}
```

### **Level 1: Transition Mode（警告のみ）**
```typescript
{
  enforcement: false,
  warnings: true,
  blocking: false,
  checkpoints: [
    "api-format-deviation",
    "error-handling-inconsistency", 
    "authentication-mismatch"
  ],
  action: "log-only" // ログ出力・開発継続
}
```

### **Level 2: Standard Mode（一部ブロッキング）**
```typescript
{
  enforcement: true,
  warnings: true,
  blocking: "critical-only",
  checkpoints: [
    "security-violations", // セキュリティ違反のみブロック
    "data-corruption-risk", // データ破損リスクのみブロック
    "breaking-changes" // 破壊的変更のみブロック
  ],
  action: "selective-block"
}
```

### **Level 3: Strict Mode（完全監視）**
```typescript
{
  enforcement: true,
  warnings: true,
  blocking: true,
  checkpoints: [
    "api-format-compliance",
    "error-handling-standard",
    "authentication-unified",
    "database-schema-compliance",
    "source-tracking-mandatory"
  ],
  action: "full-enforcement"
}
```

---

## 🔧 **実装方針**

### **1. 設定駆動型監視システム**
```typescript
// hotel-common/src/governance/config.ts
export interface SystemGovernanceConfig {
  systemId: 'hotel-saas' | 'hotel-member' | 'hotel-pms';
  level: 0 | 1 | 2 | 3;
  monitoring: boolean;
  mode?: 'warning-only' | 'selective-block' | 'full-enforcement';
  checkpoints: string[];
  exemptions?: string[]; // 移行期間中の例外項目
}

// 動的設定変更可能
export function updateGovernanceLevel(
  systemId: string, 
  newLevel: number, 
  effectiveDate: Date
) {
  // 段階的レベル変更の実装
}
```

### **2. 非破壊的監視ツール**
```bash
# 既存開発を止めない軽量チェック
npm run governance-check --system=hotel-member --level=1 --mode=warn
# → 警告出力・処理継続

npm run governance-check --system=hotel-pms --level=3 --mode=enforce  
# → 違反時はcommit/pushブロック
```

### **3. 移行支援ツール**
```typescript
// 自動移行支援機能
export class MigrationAssistant {
  static async analyzeSystem(systemPath: string) {
    // 現在の実装状況分析
    // 移行必要項目の特定
    // 移行コスト見積もり
  }
  
  static async generateMigrationPlan(systemId: string) {
    // 段階的移行計画自動生成
    // 影響度別優先順位付け
    // ロールバック計画含む
  }
}
```

---

## 📊 **移行進捗トラッキング**

### **進捗メトリクス**
```typescript
interface SystemMigrationMetrics {
  systemId: string;
  currentLevel: number;
  targetLevel: number;
  compliance: {
    apiFormat: number;        // 0-100%
    errorHandling: number;    // 0-100%
    authentication: number;   // 0-100%
    database: number;         // 0-100%
    sourceTracking: number;   // 0-100%
  };
  timeline: {
    estimated: Date;
    actual?: Date;
  };
}
```

### **リスク監視**
```typescript
interface MigrationRisk {
  systemId: string;
  riskType: 'breaking-change' | 'data-loss' | 'downtime' | 'integration-failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationPlan: string;
  contingencyPlan: string;
}
```

---

## 🚨 **緊急時プロトコル**

### **移行中断時の対応**
```typescript
// 移行中に重大問題が発生した場合
export class EmergencyRollback {
  static async rollbackToLevel(systemId: string, targetLevel: number) {
    // 1. 監視レベルの即座降格
    // 2. 旧設定への復帰
    // 3. 影響範囲の確認
    // 4. 再移行計画の策定
  }
}
```

### **システム間影響の最小化**
- 各システムの監視レベルは**独立管理**
- 一つのシステムの移行失敗が他に波及しない設計
- hotel-commonは常に安定レベル維持

---

**重要**: この段階的アプローチにより、**既存システムの開発を一切止めることなく**、着実に統一基盤への移行と品質向上を実現します。 