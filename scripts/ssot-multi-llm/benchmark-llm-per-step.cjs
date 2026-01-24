#!/usr/bin/env node
/**
 * 工程別LLMベンチマーク
 * 
 * 各工程（Tech, Marketing, UX, Synthesis, Audit）で
 * 複数LLMを実行し、精度とコストを比較する。
 * 
 * Usage: node benchmark-llm-per-step.cjs [--step <step>] [--dry-run]
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// LLMクライアント
const { LLMClient } = require('../prompt-generator/lib/llm-client.cjs');

// ===== 設定 =====

const CONFIG = {
  // 各工程で試すLLM（得意分野考慮）
  steps: {
    techArchitect: {
      name: 'Tech Architect（技術設計）',
      models: ['claude-sonnet-4-20250514', 'gpt-4o', 'gpt-4o-mini'],
      evaluator: 'gpt-4o', // 評価者（自己評価回避）
      criteria: ['API設計の完全性', 'DB設計の正確性', 'セキュリティ考慮', '実装可能性']
    },
    marketing: {
      name: 'Marketing Strategist（マーケティング）',
      models: ['gpt-4o', 'claude-sonnet-4-20250514', 'gpt-4o-mini'],
      evaluator: 'claude-sonnet-4-20250514',
      criteria: ['ROI明確性', 'KPI測定可能性', '競合分析', 'ビジネス価値']
    },
    uxOps: {
      name: 'UX/Ops Designer（UX・運用）',
      models: ['claude-sonnet-4-20250514', 'gpt-4o', 'gpt-4o-mini'],
      evaluator: 'gpt-4o',
      criteria: ['ユーザーフロー網羅性', 'エラーハンドリング', '運用考慮', 'アクセシビリティ']
    },
    synthesizer: {
      name: 'Synthesizer（統合）',
      models: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'gpt-4o'],
      evaluator: 'gpt-4o',
      criteria: ['矛盾なし', '要件ID完全', '構造の一貫性', '網羅性']
    },
    auditor: {
      name: 'Auditor（監査）',
      models: ['claude-opus-4-20250514', 'gpt-4o', 'claude-sonnet-4-20250514'],
      evaluator: 'claude-sonnet-4-20250514',
      criteria: ['指摘の妥当性', '漏れ検出率', '改善提案の具体性', 'セキュリティ観点']
    }
  },
  
  outputDir: path.join(__dirname, '../../evidence/llm-benchmark')
};

// ===== プロンプトテンプレート =====

const PROMPTS = {
  techArchitect: `あなたはシステムアーキテクトです。以下の機能について技術要件を定義してください。

## 対象機能
{{TASK}}

## 出力（Markdown）
### API設計
- エンドポイント一覧（Method, Path, 説明）
- 認証要件

### データベース設計
- テーブル定義（Prisma形式）
- インデックス

### セキュリティ要件
- 入力検証
- 認証・認可

### 実装チェックリスト
- [ ] 項目1
- [ ] 項目2`,

  marketing: `あなたはマーケティング戦略家です。以下の機能のビジネス価値を分析してください。

## 対象機能
{{TASK}}

## 出力（Markdown）
### ROI分析
- コスト削減効果
- 売上向上効果

### KPI設定
| KPI | 目標値 | 測定方法 |
|-----|--------|----------|

### 競合との差別化
- 主要競合の現状
- 差別化ポイント

### 推奨機能
- 必須機能
- あると良い機能`,

  uxOps: `あなたはUX/運用デザイナーです。以下の機能のユーザー体験と運用を設計してください。

## 対象機能
{{TASK}}

## 出力（Markdown）
### ユーザーフロー
1. ステップ1
2. ステップ2

### エラーハンドリング
| エラーケース | 対処法 | ユーザー表示 |
|--------------|--------|--------------|

### 運用設計
- 通常運用
- 障害時対応

### UI/UX要件
- 画面一覧
- アクセシビリティ`,

  synthesizer: `あなたはSSOT統合エージェントです。以下の3つの視点を統合してSSOTを作成してください。

## Tech視点
{{TECH}}

## Marketing視点
{{MARKETING}}

## UX視点
{{UX}}

## 出力（SSOT形式）
# SSOT_機能名

## 概要
## 要件ID体系
## 機能要件（FR）
## 非機能要件（NFR）
## API仕様
## データベース設計
## 変更履歴`,

  auditor: `あなたはSSOT監査の専門家です。以下のSSOTの品質を監査してください。

## SSOT
{{SSOT}}

## チェック項目
1. 要件ID完全性
2. Accept条件明確性
3. API定義完全性
4. 矛盾・重複
5. セキュリティ考慮

## 出力（JSON）
\`\`\`json
{
  "score": 0-100,
  "issues": [{"severity": "high|medium|low", "description": "..."}],
  "suggestions": ["..."]
}
\`\`\``,

  // 評価プロンプト
  evaluate: `あなたは品質評価の専門家です。以下の出力を評価してください。

## 評価対象
{{OUTPUT}}

## 評価基準
{{CRITERIA}}

## 出力（JSON）
以下のJSON形式で回答してください。
\`\`\`json
{
  "scores": {
    "criterion1": 0-100,
    "criterion2": 0-100,
    ...
  },
  "totalScore": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."]
}
\`\`\``
};

// ===== テストタスク =====

const TEST_TASK = `有人ハンドオフ機能

AIチャットで解決できない問い合わせを、スタッフに引き継ぐ機能。

MVP制約:
- 通知チャネル: フロントデスク通知のみ
- タイムアウト: 60秒で電話CTAを表示
- 対象: hotel-saas（ゲストUI）+ hotel-common（API）

既存実装:
- FAQアクション: type: 'handoff', channel: 'front_desk' 定義済み
- AIChatWidget.vue に handleHandoff() スタブあり`;

// ===== ベンチマーク実行 =====

class LLMBenchmark {
  constructor(options = {}) {
    this.llm = new LLMClient({ dryRun: options.dryRun || false });
    this.dryRun = options.dryRun || false;
    this.results = {};
  }

  /**
   * 単一工程のベンチマーク
   */
  async benchmarkStep(stepKey, task = TEST_TASK) {
    const step = CONFIG.steps[stepKey];
    if (!step) {
      throw new Error(`Unknown step: ${stepKey}`);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ${step.name} ベンチマーク`);
    console.log('='.repeat(60));

    const results = {
      step: stepKey,
      name: step.name,
      models: {},
      winner: null,
      timestamp: new Date().toISOString()
    };

    // 各モデルで実行
    for (const model of step.models) {
      console.log(`\n🔄 ${model} で実行中...`);
      
      try {
        const startTime = Date.now();
        
        // プロンプト準備
        const prompt = PROMPTS[stepKey].replace('{{TASK}}', task);
        
        // LLM呼び出し
        const response = await this._callLLM(model, prompt);
        
        const duration = (Date.now() - startTime) / 1000;
        
        console.log(`   ✅ 完了 (${duration.toFixed(1)}秒)`);
        
        // 評価
        console.log(`   📋 評価中 (${step.evaluator})...`);
        const evaluation = await this._evaluateOutput(
          response.content,
          step.criteria,
          step.evaluator
        );
        
        results.models[model] = {
          output: response.content.substring(0, 500) + '...',
          outputLength: response.content.length,
          duration,
          usage: response.usage,
          evaluation,
          cost: this._calculateModelCost(model, response.usage)
        };
        
        console.log(`   📈 スコア: ${evaluation.totalScore}点`);
        
      } catch (error) {
        console.error(`   ❌ エラー: ${error.message}`);
        results.models[model] = {
          error: error.message,
          evaluation: { totalScore: 0 }
        };
      }
    }

    // 勝者決定
    const winner = this._determineWinner(results.models);
    results.winner = winner;
    
    console.log(`\n🏆 勝者: ${winner.model} (${winner.score}点, $${winner.cost.toFixed(4)})`);

    this.results[stepKey] = results;
    return results;
  }

  /**
   * 全工程ベンチマーク
   */
  async benchmarkAll(task = TEST_TASK) {
    console.log('\n' + '█'.repeat(60));
    console.log('🔬 全工程LLMベンチマーク開始');
    console.log('█'.repeat(60));
    console.log(`タスク: ${task.substring(0, 50)}...`);

    const allResults = {};

    for (const stepKey of Object.keys(CONFIG.steps)) {
      allResults[stepKey] = await this.benchmarkStep(stepKey, task);
    }

    // サマリー
    this._printSummary(allResults);
    
    // 結果保存
    await this._saveResults(allResults);

    return allResults;
  }

  /**
   * LLM呼び出し（モデル自動判定）
   */
  async _callLLM(model, prompt) {
    if (model.startsWith('claude')) {
      return this.llm.callClaude(prompt, model);
    } else if (model.startsWith('gpt')) {
      return this.llm.callGPT(prompt, model);
    } else if (model.startsWith('gemini')) {
      return this.llm.callGemini(prompt, model);
    }
    throw new Error(`Unknown model: ${model}`);
  }

  /**
   * 出力を評価
   */
  async _evaluateOutput(output, criteria, evaluatorModel) {
    const criteriaText = criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
    
    const prompt = PROMPTS.evaluate
      .replace('{{OUTPUT}}', output.substring(0, 3000))
      .replace('{{CRITERIA}}', criteriaText);

    try {
      const response = await this._callLLM(evaluatorModel, prompt);
      
      // JSONパース
      const jsonMatch = response.content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // 直接パース試行
      return JSON.parse(response.content);
      
    } catch (error) {
      console.warn(`   ⚠️ 評価パース失敗: ${error.message}`);
      return {
        totalScore: 50,
        scores: {},
        strengths: [],
        weaknesses: ['評価パース失敗']
      };
    }
  }

  /**
   * モデルコスト計算
   */
  _calculateModelCost(model, usage) {
    const pricing = {
      'claude-opus-4-20250514': { input: 15, output: 75 },
      'claude-sonnet-4-20250514': { input: 3, output: 15 },
      'gpt-4o': { input: 2.5, output: 10 },
      'gpt-4o-mini': { input: 0.15, output: 0.6 },
      'gemini-1.5-pro-latest': { input: 1.25, output: 5 },
      'gemini-1.5-flash-latest': { input: 0.075, output: 0.3 }
    };

    const p = pricing[model] || { input: 0, output: 0 };
    const inputCost = (usage.inputTokens / 1000000) * p.input;
    const outputCost = (usage.outputTokens / 1000000) * p.output;
    return inputCost + outputCost;
  }

  /**
   * 勝者決定（スコア/コスト効率考慮）
   */
  _determineWinner(models) {
    let best = { model: null, score: 0, cost: Infinity, efficiency: 0 };

    for (const [model, data] of Object.entries(models)) {
      if (data.error) continue;
      
      const score = data.evaluation?.totalScore || 0;
      const cost = data.cost || 0.01;
      const efficiency = score / (cost * 100); // スコア/コスト

      // スコアが最高か、同点ならコスト効率で判定
      if (score > best.score || (score === best.score && efficiency > best.efficiency)) {
        best = { model, score, cost, efficiency };
      }
    }

    return best;
  }

  /**
   * サマリー出力
   */
  _printSummary(allResults) {
    console.log('\n' + '█'.repeat(60));
    console.log('📊 ベンチマーク結果サマリー');
    console.log('█'.repeat(60));

    console.log('\n| 工程 | 勝者 | スコア | コスト |');
    console.log('|:-----|:-----|:-------|:-------|');

    const optimalConfig = {};

    for (const [step, result] of Object.entries(allResults)) {
      const w = result.winner;
      console.log(`| ${result.name} | ${w.model} | ${w.score}点 | $${w.cost.toFixed(4)} |`);
      optimalConfig[step] = w.model;
    }

    console.log('\n📋 最適設定:');
    console.log(JSON.stringify(optimalConfig, null, 2));

    // 総コスト
    const costs = this.llm.getTotalCost();
    console.log(`\n💰 ベンチマーク総コスト: $${costs.totalCostUSD.toFixed(4)} (¥${costs.totalCostJPY.toFixed(0)})`);
  }

  /**
   * 結果保存
   */
  async _saveResults(allResults) {
    const outputDir = CONFIG.outputDir;
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-${timestamp}.json`;
    const filepath = path.join(outputDir, filename);

    const output = {
      timestamp: new Date().toISOString(),
      task: TEST_TASK.substring(0, 100),
      results: allResults,
      optimalConfig: {},
      totalCost: this.llm.getTotalCost()
    };

    // 最適設定抽出
    for (const [step, result] of Object.entries(allResults)) {
      output.optimalConfig[step] = result.winner.model;
    }

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`\n💾 結果保存: ${filepath}`);

    return filepath;
  }
}

// ===== CLI =====

async function main() {
  const args = process.argv.slice(2);
  
  const dryRun = args.includes('--dry-run');
  const stepIdx = args.indexOf('--step');
  const specificStep = stepIdx !== -1 ? args[stepIdx + 1] : null;

  if (args.includes('--help')) {
    console.log(`
工程別LLMベンチマーク

Usage: node benchmark-llm-per-step.cjs [options]

Options:
  --step <step>  特定工程のみ実行 (techArchitect, marketing, uxOps, synthesizer, auditor)
  --dry-run      LLM呼び出しをシミュレート
  --help         ヘルプ表示

Examples:
  # 全工程ベンチマーク
  node benchmark-llm-per-step.cjs

  # Tech Architectのみ
  node benchmark-llm-per-step.cjs --step techArchitect

  # Dry Run
  node benchmark-llm-per-step.cjs --dry-run
`);
    return;
  }

  const benchmark = new LLMBenchmark({ dryRun });

  try {
    if (specificStep) {
      await benchmark.benchmarkStep(specificStep);
    } else {
      await benchmark.benchmarkAll();
    }
  } catch (error) {
    console.error(`\n❌ エラー: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

module.exports = { LLMBenchmark, CONFIG, TEST_TASK };

if (require.main === module) {
  main();
}
