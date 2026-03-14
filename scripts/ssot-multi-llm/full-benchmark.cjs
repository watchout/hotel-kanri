#!/usr/bin/env node
/**
 * 本格LLMベンチマーク
 * 
 * 複数パターン × 複数タスク × 複数回の統計的検証
 * 
 * Usage: node full-benchmark.cjs [--dry-run]
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { LLMClient } = require('../prompt-generator/lib/llm-client.cjs');

// ===== 設定 =====

const CONFIG = {
  // 実行回数（各パターン×タスク）
  runsPerCombination: 3,
  
  // LLM組み合わせパターン
  patterns: {
    A: {
      name: 'Sonnet + GPT-4o + mini（バランス）',
      generators: ['claude-sonnet-4-20250514', 'gpt-4o', 'gpt-4o-mini'],
      merger: 'claude-sonnet-4-20250514'
    },
    B: {
      name: 'Sonnet + GPT-4o + Opus（高品質）',
      generators: ['claude-sonnet-4-20250514', 'gpt-4o', 'claude-opus-4-20250514'],
      merger: 'claude-opus-4-20250514'
    },
    C: {
      name: 'Sonnet + mini + mini（低コスト）',
      generators: ['claude-sonnet-4-20250514', 'gpt-4o-mini', 'gpt-4o-mini'],
      merger: 'claude-sonnet-4-20250514'
    },
    D: {
      name: 'Single Best（ベースライン）',
      generators: ['claude-sonnet-4-20250514'],
      merger: null,
      isSingle: true
    }
  },
  
  // テストタスク
  tasks: {
    handoff: {
      name: 'ハンドオフ機能',
      description: `有人ハンドオフ機能

AIチャットで解決できない問い合わせを、スタッフに引き継ぐ機能。

MVP制約:
- 通知チャネル: フロントデスク通知のみ
- タイムアウト: 60秒で電話CTAを表示
- 対象: hotel-saas（ゲストUI）+ hotel-common（API）`
    },
    orderManagement: {
      name: '注文管理機能',
      description: `ルームサービス注文管理

ゲストがスマホから料理・アメニティを注文し、スタッフが処理する機能。

要件:
- メニュー表示・カート・注文確定
- 注文ステータス管理（受付→調理中→配達中→完了）
- テナント別メニュー設定`
    },
    auth: {
      name: '認証機能',
      description: `管理画面認証

ホテルスタッフがSaaS管理画面にログインする機能。

要件:
- Email/Passwordログイン
- Session認証（Redis + Cookie）
- テナント切り替え
- ロールベースアクセス制御`
    }
  },
  
  // 工程
  steps: {
    techArchitect: {
      name: 'Tech Architect',
      evaluator: 'gpt-4o',
      prompt: `あなたはシステムアーキテクトです。以下の機能について技術要件を定義してください。

## 対象機能
{{TASK}}

## 出力（Markdown）
### API設計
- エンドポイント一覧（Method, Path, 説明）
- 認証要件

### データベース設計
- テーブル定義（Prisma形式）

### セキュリティ要件
- 入力検証
- 認証・認可

### 実装チェックリスト`
    },
    marketing: {
      name: 'Marketing',
      evaluator: 'claude-sonnet-4-20250514',
      prompt: `あなたはマーケティング戦略家です。以下の機能のビジネス価値を分析してください。

## 対象機能
{{TASK}}

## 出力（Markdown）
### ROI分析
### KPI設定
### 競合との差別化
### 推奨機能`
    }
  },
  
  outputDir: path.join(__dirname, '../../evidence/llm-benchmark/full')
};

// ===== プロンプト =====

const MERGE_PROMPT = `あなたは要件統合の専門家です。以下の複数のLLM出力を統合し、最も完全な成果物を作成してください。

## 統合ルール
1. 各出力の良い部分を取り入れる
2. 重複を排除
3. 矛盾は最も合理的な方を採用
4. 抜け漏れを補完

{{OUTPUTS}}

## 出力
統合した最終版をMarkdownで出力してください。`;

const EVAL_PROMPT = `あなたは品質評価の専門家です。以下の出力を100点満点で評価してください。

## 評価対象
{{OUTPUT}}

## 評価基準
1. 完全性（25点）: 必要な要素が全て含まれているか
2. 正確性（25点）: 技術的に正しいか
3. 実用性（25点）: 実装可能か
4. 構造性（25点）: 整理されているか

## 出力（JSON形式のみ、説明不要）
\`\`\`json
{"totalScore": 0-100, "completeness": 0-25, "accuracy": 0-25, "practicality": 0-25, "structure": 0-25}
\`\`\``;

// ===== ベンチマーク =====

class FullBenchmark {
  constructor(options = {}) {
    this.llm = new LLMClient({ dryRun: options.dryRun || false });
    this.dryRun = options.dryRun || false;
    this.results = [];
  }

  async run() {
    console.log('\n' + '█'.repeat(60));
    console.log('🔬 本格LLMベンチマーク開始');
    console.log('█'.repeat(60));
    
    const totalCombinations = 
      Object.keys(CONFIG.patterns).length * 
      Object.keys(CONFIG.tasks).length * 
      Object.keys(CONFIG.steps).length *
      CONFIG.runsPerCombination;
    
    console.log(`\n📊 検証規模:`);
    console.log(`   パターン: ${Object.keys(CONFIG.patterns).length}`);
    console.log(`   タスク: ${Object.keys(CONFIG.tasks).length}`);
    console.log(`   工程: ${Object.keys(CONFIG.steps).length}`);
    console.log(`   実行回数: ${CONFIG.runsPerCombination}`);
    console.log(`   総実行数: ${totalCombinations}`);
    console.log(`   推定時間: ${Math.round(totalCombinations * 30 / 60)}分`);
    
    let completed = 0;
    
    // 各工程
    for (const [stepKey, step] of Object.entries(CONFIG.steps)) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📋 工程: ${step.name}`);
      console.log('═'.repeat(60));
      
      // 各タスク
      for (const [taskKey, task] of Object.entries(CONFIG.tasks)) {
        console.log(`\n  📝 タスク: ${task.name}`);
        
        // 各パターン
        for (const [patternKey, pattern] of Object.entries(CONFIG.patterns)) {
          const scores = [];
          
          // 複数回実行
          for (let run = 1; run <= CONFIG.runsPerCombination; run++) {
            completed++;
            const progress = ((completed / totalCombinations) * 100).toFixed(0);
            process.stdout.write(`\r    [${progress}%] ${pattern.name} - Run ${run}/${CONFIG.runsPerCombination}...`);
            
            try {
              const score = await this._runSingle(step, task, pattern);
              scores.push(score);
            } catch (error) {
              console.log(` ❌ ${error.message}`);
              scores.push(0);
            }
          }
          
          // 平均計算
          const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          const stdDev = Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length);
          
          console.log(`\r    ✅ ${pattern.name}: ${avgScore.toFixed(1)}点 (±${stdDev.toFixed(1)})           `);
          
          this.results.push({
            step: stepKey,
            task: taskKey,
            pattern: patternKey,
            patternName: pattern.name,
            scores,
            avgScore,
            stdDev,
            isSingle: pattern.isSingle || false
          });
        }
      }
    }
    
    // サマリー
    this._printSummary();
    
    // 保存
    await this._saveResults();
    
    return this.results;
  }

  async _runSingle(step, task, pattern) {
    const prompt = step.prompt.replace('{{TASK}}', task.description);
    
    if (pattern.isSingle) {
      // 単一LLM
      const response = await this._callLLM(pattern.generators[0], prompt);
      return await this._evaluate(response.content, step.evaluator);
    }
    
    // マルチLLM
    const outputs = await Promise.all(
      pattern.generators.map(model => this._callLLM(model, prompt).catch(() => null))
    );
    
    const validOutputs = outputs.filter(o => o !== null);
    if (validOutputs.length === 0) return 0;
    
    // 統合
    const mergeInput = validOutputs.map((o, i) => `## 出力${i + 1}\n${o.content.substring(0, 1500)}`).join('\n\n');
    const mergePrompt = MERGE_PROMPT.replace('{{OUTPUTS}}', mergeInput);
    const merged = await this._callLLM(pattern.merger, mergePrompt);
    
    // 評価
    return await this._evaluate(merged.content, step.evaluator);
  }

  async _callLLM(model, prompt) {
    if (model.startsWith('claude')) {
      return this.llm.callClaude(prompt, model);
    } else if (model.startsWith('gpt')) {
      return this.llm.callGPT(prompt, model);
    }
    throw new Error(`Unknown model: ${model}`);
  }

  async _evaluate(output, evaluator) {
    const prompt = EVAL_PROMPT.replace('{{OUTPUT}}', output.substring(0, 2000));
    const response = await this._callLLM(evaluator, prompt);
    
    try {
      const match = response.content.match(/```json\n?([\s\S]*?)\n?```/) || 
                    response.content.match(/\{[\s\S]*"totalScore"[\s\S]*\}/);
      if (match) {
        const json = JSON.parse(match[1] || match[0]);
        return json.totalScore || 50;
      }
    } catch (e) {
      // パース失敗
    }
    return 50;
  }

  _printSummary() {
    console.log('\n' + '█'.repeat(60));
    console.log('📊 ベンチマーク結果サマリー');
    console.log('█'.repeat(60));
    
    // 工程×パターン別の平均
    const summary = {};
    
    for (const r of this.results) {
      const key = `${r.step}_${r.pattern}`;
      if (!summary[key]) {
        summary[key] = { step: r.step, pattern: r.pattern, name: r.patternName, scores: [], isSingle: r.isSingle };
      }
      summary[key].scores.push(r.avgScore);
    }
    
    // 工程ごとに出力
    const steps = [...new Set(this.results.map(r => r.step))];
    
    for (const step of steps) {
      console.log(`\n### ${CONFIG.steps[step].name}`);
      console.log('| パターン | 平均スコア | vs ベースライン |');
      console.log('|:---------|:-----------|:----------------|');
      
      const stepResults = Object.values(summary).filter(s => s.step === step);
      const baseline = stepResults.find(s => s.isSingle);
      const baselineScore = baseline ? baseline.scores.reduce((a, b) => a + b, 0) / baseline.scores.length : 0;
      
      stepResults.sort((a, b) => {
        const avgA = a.scores.reduce((x, y) => x + y, 0) / a.scores.length;
        const avgB = b.scores.reduce((x, y) => x + y, 0) / b.scores.length;
        return avgB - avgA;
      });
      
      for (const s of stepResults) {
        const avg = s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
        const diff = avg - baselineScore;
        const diffStr = s.isSingle ? '(ベースライン)' : 
                        diff > 0 ? `+${diff.toFixed(1)}点 ✅` : 
                        diff < 0 ? `${diff.toFixed(1)}点 ❌` : '±0';
        console.log(`| ${s.name} | ${avg.toFixed(1)}点 | ${diffStr} |`);
      }
    }
    
    // 総合推奨
    console.log('\n### 🎯 推奨設定');
    
    for (const step of steps) {
      const stepResults = Object.values(summary).filter(s => s.step === step && !s.isSingle);
      if (stepResults.length === 0) continue;
      
      let best = null;
      let bestScore = 0;
      
      for (const s of stepResults) {
        const avg = s.scores.reduce((a, b) => a + b, 0) / s.scores.length;
        if (avg > bestScore) {
          bestScore = avg;
          best = s;
        }
      }
      
      const baseline = Object.values(summary).find(s => s.step === step && s.isSingle);
      const baselineScore = baseline ? baseline.scores.reduce((a, b) => a + b, 0) / baseline.scores.length : 0;
      
      if (bestScore > baselineScore) {
        console.log(`- **${CONFIG.steps[step].name}**: ${best.name} (+${(bestScore - baselineScore).toFixed(1)}点)`);
      } else {
        console.log(`- **${CONFIG.steps[step].name}**: Single Best推奨（マルチ効果なし）`);
      }
    }
    
    // コスト
    const costs = this.llm.getTotalCost();
    console.log(`\n💰 総コスト: $${costs.totalCostUSD.toFixed(2)} (¥${costs.totalCostJPY.toFixed(0)})`);
  }

  async _saveResults() {
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = path.join(CONFIG.outputDir, `full-benchmark-${timestamp}.json`);
    
    fs.writeFileSync(filepath, JSON.stringify({
      timestamp: new Date().toISOString(),
      config: {
        runsPerCombination: CONFIG.runsPerCombination,
        patterns: Object.keys(CONFIG.patterns),
        tasks: Object.keys(CONFIG.tasks),
        steps: Object.keys(CONFIG.steps)
      },
      results: this.results,
      totalCost: this.llm.getTotalCost()
    }, null, 2));
    
    console.log(`\n💾 結果保存: ${filepath}`);
  }
}

// ===== CLI =====

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  if (args.includes('--help')) {
    console.log(`
本格LLMベンチマーク

Usage: node full-benchmark.cjs [options]

Options:
  --dry-run  シミュレート実行
  --help     ヘルプ
`);
    return;
  }
  
  const benchmark = new FullBenchmark({ dryRun });
  
  try {
    await benchmark.run();
  } catch (error) {
    console.error(`\n❌ エラー: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { FullBenchmark };

if (require.main === module) {
  main();
}
