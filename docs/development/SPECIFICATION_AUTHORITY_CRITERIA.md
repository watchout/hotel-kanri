# 📏 仕様書権威性判定基準

**作成日**: 2025年1月19日  
**対象**: 全開発者・プロジェクトマネージャー  
**優先度**: 🔴 **最高優先度**  
**目的**: 仕様重複時の正式版判定基準の確立

---

## 🎯 **権威性判定の基本原則**

### **1. システム階層による優先順位**
```
🏛️ hotel-common（統合基盤） > 🌞 hotel-saas > 🌙 hotel-pms > ⚡ hotel-member
```

**理由**: 統合基盤が全システムの基盤となるため、最高権威を持つ

### **2. 機能範囲による優先順位**
```
🌐 システム間共有機能 > 🏢 システム固有機能 > 🔧 実装詳細
```

**理由**: 影響範囲が広い仕様ほど統一性が重要

### **3. 時系列による優先順位**
```
📅 最新作成日 > 📝 最新更新日 > 🗂️ 作成順序
```

**理由**: 最新の設計思想・要件を反映している

---

## 📊 **権威性判定マトリックス**

| 判定要素 | 重み | 判定基準 | スコア計算 |
|----------|------|----------|------------|
| **システム階層** | 40% | common=4, saas=3, pms=2, member=1 | 階層値 × 0.4 |
| **機能範囲** | 30% | 共有=3, 固有=2, 実装=1 | 範囲値 × 0.3 |
| **時系列** | 20% | 日数差による減衰 | (1 - 日数差/365) × 0.2 |
| **完成度** | 10% | 完全=3, 部分=2, 草案=1 | 完成度値 × 0.1 |

### **スコア計算例**
```typescript
// SuperAdmin設定管理の例
const memberSpec = {
  system: 1,        // member
  scope: 2,         // 固有機能
  days: 120,        // 120日前作成
  completeness: 3   // 完全仕様
};

const commonSpec = {
  system: 4,        // common
  scope: 3,         // 共有機能
  days: 1,          // 1日前作成
  completeness: 3   // 完全仕様
};

// スコア計算
memberScore = (1×0.4) + (2×0.3) + ((1-120/365)×0.2) + (3×0.1) = 1.37
commonScore = (4×0.4) + (3×0.3) + ((1-1/365)×0.2) + (3×0.1) = 2.79

// 結果: commonSpecが正式版
```

---

## 🔍 **具体的判定基準**

### **Case 1: システム間共有機能**

#### **判定ルール**
1. **hotel-common仕様が存在** → hotel-common が正式版
2. **hotel-common仕様が未作成** → 最も包括的な仕様が正式版
3. **同等レベル** → 最新作成・更新が正式版

#### **適用例: SuperAdmin設定管理**
```yaml
候補1: docs/01_systems/member/SYSTEM_ADMIN_SPEC.md
  - システム: member (スコア: 1)
  - 範囲: システム固有 (スコア: 2)
  - 作成: 4ヶ月前 (スコア: 0.67)
  - 完成度: 完全 (スコア: 3)
  - 総合スコア: 1.37

候補2: docs/systems/common/SUPERADMIN_AI_SETTINGS_EXTENSION_SPEC.md
  - システム: common (スコア: 4)
  - 範囲: システム間共有 (スコア: 3)
  - 作成: 1日前 (スコア: 0.99)
  - 完成度: 完全 (スコア: 3)
  - 総合スコア: 2.79

判定結果: common仕様が正式版 ✅
```

### **Case 2: API仕様**

#### **判定ルール**
1. **共通API** → hotel-common/api/ 配下が正式版
2. **システム固有API** → 各システム配下が正式版
3. **統合API** → 最も包括的な仕様が正式版

#### **適用例: 認証API**
```yaml
候補1: docs/01_systems/common/api/HYBRID_API_ARCHITECTURE.md
  - システム: common (スコア: 4)
  - 範囲: システム間共有 (スコア: 3)
  - API種別: 共通API
  - 判定: 正式版 ✅

候補2: docs/01_systems/saas/PHASE2_COMMON_API_ENDPOINTS.md
  - システム: saas (スコア: 3)
  - 範囲: 実装詳細 (スコア: 1)
  - API種別: 実装要求仕様
  - 判定: 実装ガイドに変更 ❌
```

### **Case 3: データベーススキーマ**

#### **判定ルール**
1. **共有テーブル** → hotel-common 配下が正式版
2. **システム固有テーブル** → 各システム配下が正式版
3. **拡張テーブル** → 基盤システムの仕様が正式版

#### **適用例: system_settings テーブル**
```yaml
基本仕様: docs/01_systems/member/SYSTEM_ADMIN_SPEC.md
拡張仕様: docs/systems/common/SUPERADMIN_AI_SETTINGS_EXTENSION_SPEC.md

判定基準:
1. テーブル種別: 共有テーブル
2. 拡張内容: AI・為替設定（システム間共有）
3. システム階層: common > member

判定結果: common拡張仕様が正式版 ✅
アクション: member仕様を参照形式に変更
```

---

## 🛠️ **権威性判定ツール**

### **自動判定スクリプト**
```typescript
// specification-authority-judge.ts
export class SpecificationAuthorityJudge {
  /**
   * 仕様書の権威性スコア計算
   */
  calculateAuthorityScore(spec: SpecificationFile): number {
    const systemScore = this.getSystemScore(spec.path);
    const scopeScore = this.getScopeScore(spec.content);
    const timeScore = this.getTimeScore(spec.createdAt, spec.updatedAt);
    const completenessScore = this.getCompletenessScore(spec.content);
    
    return (systemScore * 0.4) + 
           (scopeScore * 0.3) + 
           (timeScore * 0.2) + 
           (completenessScore * 0.1);
  }
  
  /**
   * 重複仕様の権威性判定
   */
  judgeAuthority(specs: SpecificationFile[]): AuthorityJudgment {
    const scores = specs.map(spec => ({
      spec,
      score: this.calculateAuthorityScore(spec),
      reasons: this.getJudgmentReasons(spec)
    }));
    
    const authoritative = scores.reduce((prev, current) => 
      prev.score > current.score ? prev : current
    );
    
    return {
      authoritativeSpec: authoritative.spec,
      score: authoritative.score,
      reasons: authoritative.reasons,
      alternatives: scores.filter(s => s !== authoritative),
      recommendations: this.generateRecommendations(scores)
    };
  }
  
  /**
   * システム階層スコア
   */
  private getSystemScore(path: string): number {
    if (path.includes('/common/')) return 4;
    if (path.includes('/saas/')) return 3;
    if (path.includes('/pms/')) return 2;
    if (path.includes('/member/')) return 1;
    return 0;
  }
  
  /**
   * 機能範囲スコア
   */
  private getScopeScore(content: string): number {
    const sharedKeywords = ['共有', 'shared', '統合', 'integration', 'common'];
    const specificKeywords = ['固有', 'specific', '専用', 'dedicated'];
    
    const sharedCount = sharedKeywords.reduce((count, keyword) => 
      count + (content.toLowerCase().includes(keyword) ? 1 : 0), 0);
    const specificCount = specificKeywords.reduce((count, keyword) => 
      count + (content.toLowerCase().includes(keyword) ? 1 : 0), 0);
    
    if (sharedCount > specificCount) return 3;
    if (specificCount > sharedCount) return 2;
    return 1;
  }
}
```

### **CLI実行例**
```bash
# 権威性判定実行
npx specification-authority-judge \
  --feature "SuperAdmin設定管理" \
  --specs "docs/01_systems/member/SYSTEM_ADMIN_SPEC.md,docs/systems/common/SUPERADMIN_AI_SETTINGS_EXTENSION_SPEC.md"

# 出力例
🏆 権威性判定結果:
正式版: docs/systems/common/SUPERADMIN_AI_SETTINGS_EXTENSION_SPEC.md
スコア: 2.79
理由:
  ✅ システム階層: common (最高権威)
  ✅ 機能範囲: システム間共有
  ✅ 時系列: 最新仕様
  ✅ 完成度: 完全仕様

推奨アクション:
  📝 member仕様を参照形式に変更
  🔗 マスター仕様へのリンク追加
  📋 実装固有事項のみ記載
```

---

## 📋 **判定基準適用プロセス**

### **Step 1: 重複検出**
```bash
# 重複仕様検出
npx specification-duplicate-detector \
  --scan-directory "docs/" \
  --output "duplication-report.json"
```

### **Step 2: 権威性判定**
```bash
# 各重複について権威性判定
for duplicate in duplication-report.json; do
  npx specification-authority-judge \
    --feature "$duplicate.feature" \
    --specs "$duplicate.specs"
done
```

### **Step 3: 統合実行**
```bash
# 判定結果に基づく自動統合
npx specification-consolidator \
  --judgment-results "authority-judgments.json" \
  --execute-consolidation
```

### **Step 4: 検証**
```bash
# 統合後の整合性確認
npx specification-consistency-checker \
  --verify-consolidation
```

---

## 🎯 **判定基準の運用ルール**

### **新規仕様作成時**
```markdown
1. 既存仕様の重複確認必須
2. 権威性判定ツールによる事前チェック
3. より権威性の高い仕様が存在する場合は拡張・参照形式で作成
4. 新規作成理由の明記必須
```

### **仕様変更時**
```markdown
1. 権威性の確認（正式版かどうか）
2. 影響範囲の分析
3. 関連仕様への波及確認
4. 変更承認プロセスの実行
```

### **仕様統合時**
```markdown
1. 権威性判定の実行
2. 統合方針の決定
3. 段階的統合の実行
4. 整合性確認・検証
```

---

## 🔄 **継続的改善**

### **判定基準の見直し**
```markdown
頻度: 四半期毎
観点:
  - 判定精度の検証
  - 重み付けの調整
  - 新規判定要素の追加
  - 運用効率の改善
```

### **ツールの改善**
```markdown
機能追加:
  - AI による内容分析
  - 自動統合機能
  - 影響範囲分析
  - 品質スコア算出
```

---

## ✅ **実装チェックリスト**

### **基準策定（今日中）**
- [ ] 権威性判定基準の確定
- [ ] 判定マトリックスの実装
- [ ] 判定ツールの基本実装
- [ ] 運用ルールの策定

### **ツール実装（1週間）**
- [ ] 自動判定スクリプト実装
- [ ] CLI ツール実装
- [ ] Git Hook 統合
- [ ] CI/CD パイプライン統合

### **運用開始（2週間）**
- [ ] 既存重複仕様の判定・統合
- [ ] 開発チームへの周知・教育
- [ ] 運用プロセスの確立
- [ ] 継続改善体制の構築

---

**⚠️ 重要**: 明確な判定基準により、仕様の権威性を客観的に決定し、開発チーム間の合意形成を効率化する。

**作成者**: hotel-kanri統合管理システム  
**承認**: システム統括責任者
