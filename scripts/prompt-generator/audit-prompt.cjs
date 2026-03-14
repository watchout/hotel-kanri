#!/usr/bin/env node
/**
 * プロンプト監査エンジン（3 LLM）
 * 
 * 生成されたプロンプトを3つのLLMペルソナで多角的に監査し、
 * 品質スコアを算出、問題があれば自動修正を試みる。
 * 
 * ペルソナ:
 * 1. SSOT Auditor (Claude Opus) - 要件網羅・SSOT準拠
 * 2. Security Auditor (GPT-4o) - セキュリティ・脆弱性
 * 3. Ops Auditor (Claude Sonnet) - 実行可能性・運用
 * 
 * Usage: node audit-prompt.cjs <PROMPT_PATH> <SSOT_PATH> [options]
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { LLMClient } = require('./lib/llm-client.cjs');
const { parseSSOT } = require('./parse-ssot.cjs');

// ===== 監査設定 =====

const AUDIT_CONFIG = {
  // 合格基準スコア（100点満点）
  passThreshold: 80,
  
  // 最大修正ループ回数
  maxFixIterations: 3,
  
  // 重み付け
  weights: {
    ssot: 0.50,      // SSOT準拠: 50%
    security: 0.30,  // セキュリティ: 30%
    ops: 0.20        // 運用: 20%
  },
  
  // モデル設定
  models: {
    ssot: 'claude-opus-4-20250514',
    security: 'gpt-4o',
    ops: 'claude-sonnet-4-20250514',
    fix: 'claude-sonnet-4-20250514'
  }
};

// ===== 監査プロンプトテンプレート =====

const AUDIT_PROMPTS = {
  /**
   * SSOT Auditor - 要件網羅・SSOT準拠チェック
   */
  ssot: `あなたはSSO準拠監査の専門家です。
以下のプロンプトがSSOTに100%準拠しているか検証してください。

## SSOT内容
\`\`\`markdown
{{SSOT_CONTENT}}
\`\`\`

## 生成されたプロンプト
\`\`\`markdown
{{PROMPT_CONTENT}}
\`\`\`

## 抽出された要件ID
{{REQUIREMENT_IDS}}

## チェック項目

### 1. 要件網羅性
- [ ] 全ての要件ID（{{REQUIREMENT_COUNT}}件）がプロンプトに含まれている
- [ ] 各要件のAccept条件が含まれている
- [ ] 要件の説明が正確に反映されている

### 2. API仕様一致
- [ ] APIパスがSSOT定義と完全一致
- [ ] HTTPメソッドが正しい
- [ ] リクエスト/レスポンス形式が正しい

### 3. DB設計一致
- [ ] テーブル名がSSOT定義と一致
- [ ] カラム定義が正しい
- [ ] 命名規則（snake_case）が守られている

### 4. 禁止パターン不在
- [ ] Prisma直接使用の指示がない（hotel-saas）
- [ ] $fetch直接使用の指示がない
- [ ] tenant_idフォールバックがない

## 出力フォーマット（JSON）
以下のJSON形式で回答してください。余計な説明は不要です。

\`\`\`json
{
  "score": 0-100,
  "passed": true/false,
  "checklist": {
    "requirementsCovered": { "passed": true/false, "missing": ["ID1", "ID2"] },
    "apiMatch": { "passed": true/false, "issues": [] },
    "dbMatch": { "passed": true/false, "issues": [] },
    "noProhibitedPatterns": { "passed": true/false, "found": [] }
  },
  "issues": [
    { "severity": "high|medium|low", "category": "requirements|api|db|pattern", "description": "..." }
  ],
  "suggestions": ["改善提案1", "改善提案2"]
}
\`\`\``,

  /**
   * Security Auditor - セキュリティチェック
   */
  security: `あなたはセキュリティ監査の専門家です。
以下の実装プロンプトにセキュリティ上の問題がないか検証してください。

## プロンプト内容
\`\`\`markdown
{{PROMPT_CONTENT}}
\`\`\`

## チェック項目

### 1. 認証・認可
- [ ] 認証チェックが明示されている
- [ ] 権限チェックが適切
- [ ] セッション管理が安全

### 2. 入力検証
- [ ] ユーザー入力のバリデーションが指示されている
- [ ] SQLインジェクション対策（Prisma使用）
- [ ] XSS対策（出力エスケープ）

### 3. テナント分離
- [ ] tenant_idによるデータ分離が明示
- [ ] クロステナントアクセス防止
- [ ] 列挙攻撃対策（404返却）

### 4. データ保護
- [ ] 機密データの取り扱いが適切
- [ ] ログ出力に機密情報を含まない
- [ ] エラーメッセージが情報漏洩しない

## 出力フォーマット（JSON）
以下のJSON形式で回答してください。余計な説明は不要です。

\`\`\`json
{
  "score": 0-100,
  "passed": true/false,
  "checklist": {
    "authentication": { "passed": true/false, "issues": [] },
    "inputValidation": { "passed": true/false, "issues": [] },
    "tenantIsolation": { "passed": true/false, "issues": [] },
    "dataProtection": { "passed": true/false, "issues": [] }
  },
  "vulnerabilities": [
    { "severity": "critical|high|medium|low", "type": "...", "description": "...", "recommendation": "..." }
  ],
  "recommendations": ["推奨事項1", "推奨事項2"]
}
\`\`\``,

  /**
   * Ops Auditor - 実行可能性・運用チェック
   */
  ops: `あなたは運用・実行可能性の監査専門家です。
以下の実装プロンプトが実際に実行可能か検証してください。

## プロンプト内容
\`\`\`markdown
{{PROMPT_CONTENT}}
\`\`\`

## チェック項目

### 1. ファイルパス
- [ ] ファイルパスが実在する形式
- [ ] ディレクトリ構造が正しい
- [ ] 命名規則が一貫している

### 2. コマンド実行可能性
- [ ] bashコマンドが正しい構文
- [ ] 環境変数が適切に設定されている前提
- [ ] エラーハンドリングがある

### 3. 依存関係
- [ ] 必要なモジュール/ライブラリが明示
- [ ] インポートパスが正しい
- [ ] 循環依存がない

### 4. テスト可能性
- [ ] テスト手順が明確
- [ ] 確認コマンドが提供されている
- [ ] Evidence取得方法が明示

### 5. Item/Step構造
- [ ] 段階的な指示になっている
- [ ] 各Itemが独立して実行可能
- [ ] 完了条件が明確

## 出力フォーマット（JSON）
以下のJSON形式で回答してください。余計な説明は不要です。

\`\`\`json
{
  "score": 0-100,
  "passed": true/false,
  "checklist": {
    "filePaths": { "passed": true/false, "issues": [] },
    "commands": { "passed": true/false, "issues": [] },
    "dependencies": { "passed": true/false, "issues": [] },
    "testability": { "passed": true/false, "issues": [] },
    "structure": { "passed": true/false, "issues": [] }
  },
  "executabilityIssues": [
    { "severity": "high|medium|low", "type": "...", "description": "...", "fix": "..." }
  ],
  "improvements": ["改善案1", "改善案2"]
}
\`\`\``,

  /**
   * 修正プロンプト
   */
  fix: `あなたはプロンプト修正の専門家です。
以下の監査結果に基づいて、プロンプトを修正してください。

## 元のプロンプト
\`\`\`markdown
{{PROMPT_CONTENT}}
\`\`\`

## 監査結果

### SSOT準拠監査
{{SSOT_AUDIT_RESULT}}

### セキュリティ監査
{{SECURITY_AUDIT_RESULT}}

### 運用監査
{{OPS_AUDIT_RESULT}}

## 修正指示
1. 指摘されたissuesを全て解消してください
2. suggestionsを可能な限り反映してください
3. 元のプロンプトの構造は維持してください
4. 修正箇所には <!-- FIXED --> コメントを付けてください

## 出力
修正後のプロンプト全文をマークダウン形式で出力してください。`
};

// ===== 監査クラス =====

class PromptAuditor {
  constructor(options = {}) {
    this.llm = new LLMClient({
      dryRun: options.dryRun || false,
      logPath: options.logPath
    });
    this.config = { ...AUDIT_CONFIG, ...options };
  }

  /**
   * プロンプトを監査
   */
  async audit(promptContent, ssotContent, requirements = []) {
    console.log('🔍 プロンプト監査開始...\n');
    
    // 要件ID一覧
    const requirementIds = requirements.map(r => r.id).join(', ');
    
    // 変数を展開
    const variables = {
      PROMPT_CONTENT: promptContent,
      SSOT_CONTENT: ssotContent,
      REQUIREMENT_IDS: requirementIds,
      REQUIREMENT_COUNT: requirements.length
    };

    // 3つのLLMで並列監査
    console.log('📋 3つのペルソナで監査中...');
    
    const [ssotResult, securityResult, opsResult] = await Promise.all([
      this._auditSSOT(variables),
      this._auditSecurity(variables),
      this._auditOps(variables)
    ]);

    // 結果を統合
    const aggregated = this._aggregateResults(ssotResult, securityResult, opsResult);
    
    return aggregated;
  }

  /**
   * SSOT準拠監査
   */
  async _auditSSOT(variables) {
    console.log('  1️⃣ SSOT Auditor (Claude Opus)...');
    
    const prompt = this._expandTemplate(AUDIT_PROMPTS.ssot, variables);
    
    try {
      const response = await this.llm.callClaude(prompt, this.config.models.ssot);
      return this._parseAuditResponse(response.content, 'ssot');
    } catch (error) {
      console.error(`  ❌ SSOT監査エラー: ${error.message}`);
      return this._defaultAuditResult('ssot', error.message);
    }
  }

  /**
   * セキュリティ監査
   */
  async _auditSecurity(variables) {
    console.log('  2️⃣ Security Auditor (GPT-4o)...');
    
    const prompt = this._expandTemplate(AUDIT_PROMPTS.security, variables);
    
    try {
      const response = await this.llm.callGPT(prompt, this.config.models.security);
      return this._parseAuditResponse(response.content, 'security');
    } catch (error) {
      console.error(`  ❌ セキュリティ監査エラー: ${error.message}`);
      return this._defaultAuditResult('security', error.message);
    }
  }

  /**
   * 運用監査
   */
  async _auditOps(variables) {
    console.log('  3️⃣ Ops Auditor (Claude Sonnet)...');
    
    const prompt = this._expandTemplate(AUDIT_PROMPTS.ops, variables);
    
    try {
      const response = await this.llm.callClaude(prompt, this.config.models.ops);
      return this._parseAuditResponse(response.content, 'ops');
    } catch (error) {
      console.error(`  ❌ 運用監査エラー: ${error.message}`);
      return this._defaultAuditResult('ops', error.message);
    }
  }

  /**
   * 監査レスポンスをパース
   */
  _parseAuditResponse(content, type) {
    try {
      // JSONブロックを抽出
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return {
          type,
          ...JSON.parse(jsonMatch[1]),
          raw: content
        };
      }
      
      // JSONブロックがない場合は直接パース
      const parsed = JSON.parse(content);
      return { type, ...parsed, raw: content };
      
    } catch (error) {
      console.warn(`  ⚠️ ${type}のJSONパース失敗、デフォルト値使用`);
      return {
        type,
        score: 50,
        passed: false,
        parseError: error.message,
        raw: content
      };
    }
  }

  /**
   * デフォルト監査結果
   */
  _defaultAuditResult(type, error) {
    return {
      type,
      score: 0,
      passed: false,
      error,
      issues: [{ severity: 'high', description: `監査実行エラー: ${error}` }]
    };
  }

  /**
   * 結果を統合
   */
  _aggregateResults(ssotResult, securityResult, opsResult) {
    const weights = this.config.weights;
    
    // 重み付きスコア計算
    const weightedScore = 
      (ssotResult.score || 0) * weights.ssot +
      (securityResult.score || 0) * weights.security +
      (opsResult.score || 0) * weights.ops;
    
    const totalScore = Math.round(weightedScore);
    const passed = totalScore >= this.config.passThreshold;
    
    // 全てのissuesを収集
    const allIssues = [
      ...(ssotResult.issues || []).map(i => ({ ...i, source: 'ssot' })),
      ...(securityResult.vulnerabilities || securityResult.issues || []).map(i => ({ ...i, source: 'security' })),
      ...(opsResult.executabilityIssues || opsResult.issues || []).map(i => ({ ...i, source: 'ops' }))
    ];
    
    // 重大度でソート
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    allIssues.sort((a, b) => 
      (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4)
    );
    
    return {
      totalScore,
      passed,
      threshold: this.config.passThreshold,
      
      details: {
        ssot: {
          score: ssotResult.score || 0,
          weight: weights.ssot,
          passed: ssotResult.passed,
          checklist: ssotResult.checklist,
          issues: ssotResult.issues || [],
          suggestions: ssotResult.suggestions || []
        },
        security: {
          score: securityResult.score || 0,
          weight: weights.security,
          passed: securityResult.passed,
          checklist: securityResult.checklist,
          vulnerabilities: securityResult.vulnerabilities || [],
          recommendations: securityResult.recommendations || []
        },
        ops: {
          score: opsResult.score || 0,
          weight: weights.ops,
          passed: opsResult.passed,
          checklist: opsResult.checklist,
          issues: opsResult.executabilityIssues || [],
          improvements: opsResult.improvements || []
        }
      },
      
      allIssues,
      criticalIssues: allIssues.filter(i => i.severity === 'critical' || i.severity === 'high'),
      
      cost: this.llm.getTotalCost()
    };
  }

  /**
   * 自動修正ループ
   */
  async auditAndFix(promptContent, ssotContent, requirements = []) {
    let currentPrompt = promptContent;
    let iteration = 0;
    const history = [];
    
    while (iteration < this.config.maxFixIterations) {
      console.log(`\n🔄 監査ループ ${iteration + 1}/${this.config.maxFixIterations}`);
      
      // 監査
      const auditResult = await this.audit(currentPrompt, ssotContent, requirements);
      history.push({
        iteration,
        score: auditResult.totalScore,
        passed: auditResult.passed,
        issues: auditResult.allIssues.length
      });
      
      // 合格なら終了
      if (auditResult.passed) {
        console.log(`\n✅ 監査合格！スコア: ${auditResult.totalScore}点`);
        return {
          success: true,
          finalPrompt: currentPrompt,
          finalScore: auditResult.totalScore,
          iterations: iteration + 1,
          history,
          auditResult,
          cost: this.llm.getTotalCost()
        };
      }
      
      // 修正
      console.log(`\n📝 修正中... (現在スコア: ${auditResult.totalScore}点)`);
      currentPrompt = await this._fixPrompt(currentPrompt, auditResult);
      iteration++;
    }
    
    // 最大回数到達
    const finalAudit = await this.audit(currentPrompt, ssotContent, requirements);
    
    return {
      success: finalAudit.passed,
      finalPrompt: currentPrompt,
      finalScore: finalAudit.totalScore,
      iterations: iteration,
      history,
      auditResult: finalAudit,
      requiresHumanReview: !finalAudit.passed,
      cost: this.llm.getTotalCost()
    };
  }

  /**
   * プロンプトを修正
   */
  async _fixPrompt(promptContent, auditResult) {
    const variables = {
      PROMPT_CONTENT: promptContent,
      SSOT_AUDIT_RESULT: JSON.stringify(auditResult.details.ssot, null, 2),
      SECURITY_AUDIT_RESULT: JSON.stringify(auditResult.details.security, null, 2),
      OPS_AUDIT_RESULT: JSON.stringify(auditResult.details.ops, null, 2)
    };
    
    const prompt = this._expandTemplate(AUDIT_PROMPTS.fix, variables);
    
    try {
      const response = await this.llm.callClaude(prompt, this.config.models.fix, {
        maxTokens: 8192
      });
      
      // マークダウンブロックを抽出
      const mdMatch = response.content.match(/```markdown\n?([\s\S]*?)\n?```/);
      if (mdMatch) {
        return mdMatch[1];
      }
      
      // そのまま返す
      return response.content;
      
    } catch (error) {
      console.error(`  ❌ 修正エラー: ${error.message}`);
      return promptContent; // 元のまま
    }
  }

  /**
   * テンプレート展開
   */
  _expandTemplate(template, variables) {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });
    return result;
  }

  /**
   * コストサマリーを表示
   */
  printCostSummary() {
    this.llm.printCostSummary();
  }
}

// ===== 出力関数 =====

function outputJSON(result) {
  console.log(JSON.stringify(result, null, 2));
}

function outputSummary(result) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 監査結果サマリー');
  console.log('='.repeat(60));
  
  // 総合スコア
  const passIcon = result.passed ? '✅' : '❌';
  console.log(`\n${passIcon} 総合スコア: ${result.totalScore}点 / 100点（基準: ${result.threshold}点）`);
  
  // 詳細スコア
  console.log('\n📋 詳細スコア:');
  console.log(`   SSOT準拠:     ${result.details.ssot.score}点 (×${result.details.ssot.weight * 100}%)`);
  console.log(`   セキュリティ: ${result.details.security.score}点 (×${result.details.security.weight * 100}%)`);
  console.log(`   運用:         ${result.details.ops.score}点 (×${result.details.ops.weight * 100}%)`);
  
  // 重大な問題
  if (result.criticalIssues.length > 0) {
    console.log('\n🚨 重大な問題:');
    result.criticalIssues.slice(0, 5).forEach((issue, i) => {
      console.log(`   ${i + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`);
    });
    if (result.criticalIssues.length > 5) {
      console.log(`   ... 他${result.criticalIssues.length - 5}件`);
    }
  }
  
  // 問題総数
  console.log(`\n📈 問題総数: ${result.allIssues.length}件`);
  const bySource = {};
  result.allIssues.forEach(i => {
    bySource[i.source] = (bySource[i.source] || 0) + 1;
  });
  Object.entries(bySource).forEach(([source, count]) => {
    console.log(`   - ${source}: ${count}件`);
  });
  
  // コスト
  if (result.cost) {
    console.log(`\n💰 監査コスト: $${result.cost.totalCostUSD.toFixed(4)} (¥${result.cost.totalCostJPY.toFixed(0)})`);
  }
  
  console.log('\n' + '='.repeat(60));
}

function outputFixSummary(result) {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 自動修正結果サマリー');
  console.log('='.repeat(60));
  
  const successIcon = result.success ? '✅' : '⚠️';
  console.log(`\n${successIcon} 結果: ${result.success ? '成功' : '要人間レビュー'}`);
  console.log(`   最終スコア: ${result.finalScore}点`);
  console.log(`   実行回数: ${result.iterations}回`);
  
  // 履歴
  console.log('\n📈 スコア推移:');
  result.history.forEach((h, i) => {
    const icon = h.passed ? '✅' : '⏳';
    console.log(`   ${icon} ループ${i + 1}: ${h.score}点 (問題${h.issues}件)`);
  });
  
  // コスト
  if (result.cost) {
    console.log(`\n💰 総コスト: $${result.cost.totalCostUSD.toFixed(4)} (¥${result.cost.totalCostJPY.toFixed(0)})`);
  }
  
  if (result.requiresHumanReview) {
    console.log('\n⚠️ 自動修正では合格基準に達しませんでした。');
    console.log('   人間によるレビュー・修正が必要です。');
  }
  
  console.log('\n' + '='.repeat(60));
}

// ===== CLI =====

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2 && !args.includes('--test')) {
    console.error('Usage: node audit-prompt.cjs <PROMPT_PATH> <SSOT_PATH> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --json        JSON形式で出力');
    console.error('  --summary     サマリー形式で出力（デフォルト）');
    console.error('  --fix         自動修正ループを実行');
    console.error('  --dry-run     LLM呼び出しをシミュレート');
    console.error('  --output <path>  修正後プロンプトを保存');
    console.error('  --test        テストモード（dry-run）');
    process.exit(1);
  }
  
  // テストモード
  if (args.includes('--test')) {
    console.log('🧪 監査エンジンテスト（Dry Run）...\n');
    
    const auditor = new PromptAuditor({ dryRun: true });
    
    const testPrompt = '# テストプロンプト\nItem 1: テスト';
    const testSSOT = '# テストSSOT\n## 要件\nREQ-001: テスト要件';
    
    const result = await auditor.audit(testPrompt, testSSOT, [{ id: 'REQ-001' }]);
    outputSummary(result);
    auditor.printCostSummary();
    
    console.log('\n✅ テスト完了');
    return;
  }
  
  const promptPath = args[0];
  const ssotPath = args[1];
  
  const outputFormat = args.includes('--json') ? 'json' : 'summary';
  const doFix = args.includes('--fix');
  const dryRun = args.includes('--dry-run');
  
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : null;
  
  // ファイル存在確認
  if (!fs.existsSync(promptPath)) {
    console.error(`❌ プロンプトファイルが見つかりません: ${promptPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(ssotPath)) {
    console.error(`❌ SSOTファイルが見つかりません: ${ssotPath}`);
    process.exit(1);
  }
  
  try {
    // ファイル読み込み
    const promptContent = fs.readFileSync(promptPath, 'utf-8');
    const ssotContent = fs.readFileSync(ssotPath, 'utf-8');
    
    // SSOT解析
    const parsedSSOT = parseSSOT(ssotPath);
    
    // 監査実行
    const auditor = new PromptAuditor({ dryRun });
    
    let result;
    if (doFix) {
      result = await auditor.auditAndFix(promptContent, ssotContent, parsedSSOT.requirements);
      
      // 修正後プロンプトを保存
      if (outputPath && result.finalPrompt) {
        fs.writeFileSync(outputPath, result.finalPrompt);
        console.log(`\n✅ 修正後プロンプトを保存: ${outputPath}`);
      }
      
      if (outputFormat === 'json') {
        outputJSON(result);
      } else {
        outputFixSummary(result);
      }
    } else {
      result = await auditor.audit(promptContent, ssotContent, parsedSSOT.requirements);
      
      if (outputFormat === 'json') {
        outputJSON(result);
      } else {
        outputSummary(result);
      }
    }
    
    auditor.printCostSummary();
    
    // 終了コード
    process.exit(result.passed || result.success ? 0 : 1);
    
  } catch (error) {
    console.error(`❌ 監査エラー: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// エクスポート
module.exports = { PromptAuditor, AUDIT_CONFIG };

if (require.main === module) {
  main().catch(console.error);
}
