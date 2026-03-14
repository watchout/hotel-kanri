#!/usr/bin/env node
/**
 * マルチLLM統合ベンチマーク
 * 
 * 各工程で3つのLLMを並列実行し、統合することで
 * 単一LLMより精度が上がるかを検証する。
 * 
 * Usage: node benchmark-multi-llm-merge.cjs [--step <step>]
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { LLMClient } = require('../prompt-generator/lib/llm-client.cjs');

// ===== 設定 =====

const CONFIG = {
  // 各工程の設定
  steps: {
    techArchitect: {
      name: 'Tech Architect（技術設計）',
      generators: ['claude-sonnet-4-20250514', 'gpt-4o', 'gpt-4o-mini'],
      merger: 'claude-sonnet-4-20250514',
      evaluator: 'gpt-4o',
      singleBest: 'claude-sonnet-4-20250514', // 前回の単一ベスト
      singleBestScore: 90
    },
    marketing: {
      name: 'Marketing Strategist（マーケティング）',
      generators: ['claude-sonnet-4-20250514', 'gpt-4o', 'gpt-4o-mini'],
      merger: 'gpt-4o',
      evaluator: 'claude-sonnet-4-20250514',
      singleBest: 'claude-sonnet-4-20250514',
      singleBestScore: 86
    },
    uxOps: {
      name: 'UX/Ops Designer（UX・運用）',
      generators: ['claude-sonnet-4-20250514', 'gpt-4o', 'gpt-4o-mini'],
      merger: 'claude-sonnet-4-20250514',
      evaluator: 'gpt-4o',
      singleBest: 'claude-sonnet-4-20250514',
      singleBestScore: 91
    }
  },
  
  outputDir: path.join(__dirname, '../../evidence/llm-benchmark')
};

// ===== プロンプト =====

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

  // 統合プロンプト
  merge: `あなたは要件統合の専門家です。以下の3つのLLMからの出力を統合し、最も完全で高品質な成果物を作成してください。

## 統合ルール
1. 各出力の良い部分を取り入れる
2. 重複を排除
3. 矛盾があれば最も合理的な方を採用
4. 抜け漏れを補完
5. 構造を統一

## 出力A（LLM 1）
{{OUTPUT_A}}

## 出力B（LLM 2）
{{OUTPUT_B}}

## 出力C（LLM 3）
{{OUTPUT_C}}

## 出力
上記3つを統合した最終版をMarkdownで出力してください。`,

  // 評価プロンプト
  evaluate: `あなたは品質評価の専門家です。以下の出力を評価してください。

## 評価対象
{{OUTPUT}}

## 評価基準
1. 完全性（全ての要素が含まれているか）
2. 正確性（技術的に正しいか）
3. 実用性（実装可能か）
4. 構造性（整理されているか）

## 出力（JSON）
\`\`\`json
{
  "scores": {
    "completeness": 0-100,
    "accuracy": 0-100,
    "practicality": 0-100,
    "structure": 0-100
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

// ===== ベンチマーク =====

class MultiLLMBenchmark {
  constructor(options = {}) {
    this.llm = new LLMClient({ dryRun: options.dryRun || false });
    this.results = {};
  }

  /**
   * 単一工程のマルチLLM統合ベンチマーク
   */
  async benchmarkStep(stepKey, task = TEST_TASK) {
    const step = CONFIG.steps[stepKey];
    if (!step) {
      throw new Error(`Unknown step: ${stepKey}`);
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🔬 ${step.name} マルチLLM統合ベンチマーク`);
    console.log('═'.repeat(60));

    const results = {
      step: stepKey,
      name: step.name,
      singleBest: {
        model: step.singleBest,
        score: step.singleBestScore
      },
      multiLLM: {},
      comparison: null,
      timestamp: new Date().toISOString()
    };

    // Step 1: 3つのLLMで並列生成
    console.log('\n📝 Step 1: 3つのLLMで並列生成...');
    const prompt = PROMPTS[stepKey].replace('{{TASK}}', task);
    
    const outputs = {};
    const startTime = Date.now();

    // 並列実行
    const promises = step.generators.map(async (model) => {
      console.log(`   🔄 ${model} 実行中...`);
      try {
        const response = await this._callLLM(model, prompt);
        console.log(`   ✅ ${model} 完了`);
        return { model, content: response.content, usage: response.usage };
      } catch (error) {
        console.log(`   ❌ ${model} エラー: ${error.message}`);
        return { model, error: error.message };
      }
    });

    const generatedOutputs = await Promise.all(promises);
    
    for (const output of generatedOutputs) {
      if (!output.error) {
        outputs[output.model] = output;
      }
    }

    const generationTime = (Date.now() - startTime) / 1000;
    console.log(`   ⏱️ 生成時間: ${generationTime.toFixed(1)}秒`);

    // Step 2: 統合
    console.log('\n🔄 Step 2: 3つの出力を統合...');
    const mergeStartTime = Date.now();
    
    const outputKeys = Object.keys(outputs);
    if (outputKeys.length < 2) {
      console.log('   ⚠️ 有効な出力が2つ未満のため統合スキップ');
      return results;
    }

    const mergePrompt = PROMPTS.merge
      .replace('{{OUTPUT_A}}', outputs[outputKeys[0]]?.content?.substring(0, 2000) || '')
      .replace('{{OUTPUT_B}}', outputs[outputKeys[1]]?.content?.substring(0, 2000) || '')
      .replace('{{OUTPUT_C}}', outputs[outputKeys[2]]?.content?.substring(0, 2000) || '(なし)');

    console.log(`   🔄 ${step.merger} で統合中...`);
    const mergedResponse = await this._callLLM(step.merger, mergePrompt);
    const mergeTime = (Date.now() - mergeStartTime) / 1000;
    console.log(`   ✅ 統合完了 (${mergeTime.toFixed(1)}秒)`);

    // Step 3: 評価
    console.log('\n📊 Step 3: 統合結果を評価...');
    
    const evalPrompt = PROMPTS.evaluate.replace('{{OUTPUT}}', mergedResponse.content.substring(0, 3000));
    console.log(`   📋 ${step.evaluator} で評価中...`);
    
    const evalResponse = await this._callLLM(step.evaluator, evalPrompt);
    const evaluation = this._parseEvaluation(evalResponse.content);
    
    console.log(`   📈 統合版スコア: ${evaluation.totalScore}点`);

    // 結果まとめ
    results.multiLLM = {
      generators: step.generators,
      merger: step.merger,
      mergedScore: evaluation.totalScore,
      evaluation,
      generationTime,
      mergeTime,
      totalTime: generationTime + mergeTime
    };

    // 比較
    const improvement = evaluation.totalScore - step.singleBestScore;
    results.comparison = {
      singleBestScore: step.singleBestScore,
      multiLLMScore: evaluation.totalScore,
      improvement,
      improved: improvement > 0
    };

    console.log('\n' + '─'.repeat(60));
    console.log('📊 比較結果:');
    console.log(`   単一LLM (${step.singleBest}): ${step.singleBestScore}点`);
    console.log(`   マルチLLM統合: ${evaluation.totalScore}点`);
    console.log(`   差分: ${improvement > 0 ? '+' : ''}${improvement}点 ${improvement > 0 ? '✅ 向上' : improvement < 0 ? '❌ 低下' : '→ 同等'}`);

    this.results[stepKey] = results;
    return results;
  }

  /**
   * 全工程ベンチマーク
   */
  async benchmarkAll(task = TEST_TASK) {
    console.log('\n' + '█'.repeat(60));
    console.log('🔬 マルチLLM統合ベンチマーク（全工程）');
    console.log('█'.repeat(60));

    const allResults = {};

    for (const stepKey of Object.keys(CONFIG.steps)) {
      allResults[stepKey] = await this.benchmarkStep(stepKey, task);
    }

    // サマリー
    this._printSummary(allResults);
    
    // 保存
    await this._saveResults(allResults);

    return allResults;
  }

  /**
   * LLM呼び出し
   */
  async _callLLM(model, prompt) {
    if (model.startsWith('claude')) {
      return this.llm.callClaude(prompt, model);
    } else if (model.startsWith('gpt')) {
      return this.llm.callGPT(prompt, model);
    }
    throw new Error(`Unknown model: ${model}`);
  }

  /**
   * 評価結果パース
   */
  _parseEvaluation(content) {
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      return JSON.parse(content);
    } catch (error) {
      console.warn(`   ⚠️ 評価パース失敗: ${error.message}`);
      return { totalScore: 50, scores: {} };
    }
  }

  /**
   * サマリー出力
   */
  _printSummary(allResults) {
    console.log('\n' + '█'.repeat(60));
    console.log('📊 マルチLLM統合ベンチマーク結果');
    console.log('█'.repeat(60));

    console.log('\n| 工程 | 単一LLM | マルチLLM | 差分 | 結果 |');
    console.log('|:-----|:--------|:----------|:-----|:-----|');

    let totalImprovement = 0;
    let improvedCount = 0;

    for (const [step, result] of Object.entries(allResults)) {
      if (!result.comparison) continue;
      
      const c = result.comparison;
      const icon = c.improved ? '✅' : c.improvement < 0 ? '❌' : '→';
      console.log(`| ${result.name} | ${c.singleBestScore}点 | ${c.multiLLMScore}点 | ${c.improvement > 0 ? '+' : ''}${c.improvement} | ${icon} |`);
      
      totalImprovement += c.improvement;
      if (c.improved) improvedCount++;
    }

    const stepCount = Object.keys(allResults).length;
    console.log('\n📈 総合:');
    console.log(`   改善した工程: ${improvedCount}/${stepCount}`);
    console.log(`   平均改善: ${(totalImprovement / stepCount).toFixed(1)}点`);

    // コスト
    const costs = this.llm.getTotalCost();
    console.log(`\n💰 総コスト: $${costs.totalCostUSD.toFixed(4)} (¥${costs.totalCostJPY.toFixed(0)})`);
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
    const filepath = path.join(outputDir, `multi-llm-benchmark-${timestamp}.json`);

    fs.writeFileSync(filepath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results: allResults,
      totalCost: this.llm.getTotalCost()
    }, null, 2));

    console.log(`\n💾 結果保存: ${filepath}`);
  }
}

// ===== CLI =====

async function main() {
  const args = process.argv.slice(2);
  
  const stepIdx = args.indexOf('--step');
  const specificStep = stepIdx !== -1 ? args[stepIdx + 1] : null;

  if (args.includes('--help')) {
    console.log(`
マルチLLM統合ベンチマーク

Usage: node benchmark-multi-llm-merge.cjs [options]

Options:
  --step <step>  特定工程のみ (techArchitect, marketing, uxOps)
  --help         ヘルプ

Examples:
  node benchmark-multi-llm-merge.cjs
  node benchmark-multi-llm-merge.cjs --step techArchitect
`);
    return;
  }

  const benchmark = new MultiLLMBenchmark();

  try {
    if (specificStep) {
      await benchmark.benchmarkStep(specificStep);
    } else {
      await benchmark.benchmarkAll();
    }
  } catch (error) {
    console.error(`\n❌ エラー: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { MultiLLMBenchmark };

if (require.main === module) {
  main();
}
