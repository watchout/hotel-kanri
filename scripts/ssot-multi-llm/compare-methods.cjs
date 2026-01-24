#!/usr/bin/env node
/**
 * SSOT作成方法の比較検証スクリプト
 * 
 * 4つの方法でSSOTを作成し、精度とコストを比較
 * 
 * Usage: node compare-methods.cjs "機能の説明"
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// LLMクライアント
let LLMClient;
try {
  LLMClient = require('../prompt-generator/lib/llm-client.cjs');
} catch (e) {
  console.error('LLMクライアントの読み込みに失敗:', e.message);
  process.exit(1);
}

// ===== 設定 =====

const CONFIG = {
  outputDir: path.join(__dirname, '../../prompts/generated/compare'),
  models: {
    opus: 'claude-opus-4-20250514',
    sonnet: 'claude-sonnet-4-20250514',
    gpt4o: 'gpt-4o',
    gemini: 'gemini-pro'
  }
};

// ===== プロンプトテンプレート =====

const PERSONA_PROMPTS = {
  tech: `あなたはシニアソフトウェアアーキテクトです。
以下の機能について、技術的な観点からSSOT（仕様書）を作成してください。

必須セクション:
1. 概要（目的、スコープ）
2. 機能要件（REQ-xxx形式のID付き、Accept条件付き）
3. API仕様（Method, Path, Request/Response）
4. データベーススキーマ（Prisma形式）
5. 非機能要件（パフォーマンス、セキュリティ）

機能: {{FEATURE}}`,

  marketing: `あなたはプロダクトマーケティングマネージャーです。
以下のSSOT（仕様書）をマーケティング視点でレビュー・拡張してください。

追加すべき観点:
1. ユーザー価値・ベネフィット
2. 計測すべきKPI（analytics-id）
3. A/Bテスト可能なポイント
4. 将来の拡張性
5. Config化すべき項目（ハードコード禁止）

現在のSSOT:
{{CURRENT_SSOT}}`,

  uxops: `あなたはUX/オペレーションデザイナーです。
以下のSSOT（仕様書）をUX/運用視点でレビュー・拡張してください。

追加すべき観点:
1. ユーザーフロー・画面遷移
2. エラーハンドリング・エッジケース
3. 運用手順・監視ポイント
4. アクセシビリティ
5. 多言語対応

現在のSSOT:
{{CURRENT_SSOT}}`,

  synthesizer: `あなたはテクニカルライターです。
以下の3つの視点からの入力を統合し、一貫性のある高品質なSSOT（仕様書）を作成してください。

統合ルール:
1. 重複を排除
2. 矛盾を解消（技術視点を優先）
3. 要件IDを連番で振り直し
4. Accept条件を全要件に付与
5. MVP/将来Phaseを明確に区分

技術視点:
{{TECH_DRAFT}}

マーケ視点:
{{MARKETING_DRAFT}}

UX/Ops視点:
{{UX_DRAFT}}`
};

const EVALUATOR_PROMPT = `あなたはSSOT品質評価の専門家です。
以下のSSOTを評価し、100点満点でスコアを付けてください。

評価基準:
1. 要件ID完全性（全要件にIDあり）: 20点
2. Accept条件明確性（各要件に条件あり）: 20点
3. API定義完全性（Method/Path/説明）: 15点
4. DB定義完全性（モデル/フィールド）: 15点
5. MVP/Phase区分の明確さ: 10点
6. 矛盾・重複がない: 10点
7. マーケ視点（計測/Config化）: 5点
8. UX視点（エラーハンドリング）: 5点

出力形式:
SCORE: [数値]
BREAKDOWN:
- 要件ID完全性: X/20
- Accept条件明確性: X/20
- API定義完全性: X/15
- DB定義完全性: X/15
- MVP/Phase区分: X/10
- 矛盾・重複なし: X/10
- マーケ視点: X/5
- UX視点: X/5
COMMENTS: [改善点]

評価対象SSOT:
{{SSOT}}`;

// ===== ユーティリティ =====

function log(message, level = 'INFO') {
  const emoji = { INFO: 'ℹ️', WARN: '⚠️', ERROR: '❌', SUCCESS: '✅', STEP: '➡️' }[level] || 'ℹ️';
  console.log(`${emoji} ${message}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ===== 方法別SSOT生成 =====

/**
 * 方法A: 現状（各ペルソナ単一LLM）
 */
async function methodA_Current(feature, client) {
  log('方法A: 現状（各ペルソナ単一LLM）', 'STEP');
  const startTime = Date.now();
  let totalCost = 0;
  
  // Step 1: Tech (Opus)
  log('  Tech Architect (Opus)...');
  const techResult = await client.call(
    CONFIG.models.opus,
    PERSONA_PROMPTS.tech.replace('{{FEATURE}}', feature)
  );
  totalCost += techResult.cost || 0;
  
  // Step 2: Marketing (GPT-4o)
  log('  Marketing Strategist (GPT-4o)...');
  const marketingResult = await client.call(
    CONFIG.models.gpt4o,
    PERSONA_PROMPTS.marketing.replace('{{CURRENT_SSOT}}', techResult.content)
  );
  totalCost += marketingResult.cost || 0;
  
  // Step 3: UX/Ops (Sonnet)
  log('  UX/Ops Designer (Sonnet)...');
  const uxResult = await client.call(
    CONFIG.models.sonnet,
    PERSONA_PROMPTS.uxops.replace('{{CURRENT_SSOT}}', marketingResult.content)
  );
  totalCost += uxResult.cost || 0;
  
  // Step 4: Synthesizer (Opus)
  log('  Synthesizer (Opus)...');
  const finalResult = await client.call(
    CONFIG.models.opus,
    PERSONA_PROMPTS.synthesizer
      .replace('{{TECH_DRAFT}}', techResult.content)
      .replace('{{MARKETING_DRAFT}}', marketingResult.content)
      .replace('{{UX_DRAFT}}', uxResult.content)
  );
  totalCost += finalResult.cost || 0;
  
  return {
    method: 'A: 現状（単一LLM）',
    ssot: finalResult.content,
    duration: (Date.now() - startTime) / 1000,
    cost: totalCost,
    apiCalls: 4
  };
}

/**
 * 方法B: 各ペルソナ内マルチLLM（高精度）
 */
async function methodB_MultiInPersona(feature, client) {
  log('方法B: 各ペルソナ内マルチLLM', 'STEP');
  const startTime = Date.now();
  let totalCost = 0;
  
  // Step 1: Tech (3 LLM並列)
  log('  Tech Architect (Opus + GPT-4o + Sonnet)...');
  const [techOpus, techGPT, techSonnet] = await Promise.all([
    client.call(CONFIG.models.opus, PERSONA_PROMPTS.tech.replace('{{FEATURE}}', feature)),
    client.call(CONFIG.models.gpt4o, PERSONA_PROMPTS.tech.replace('{{FEATURE}}', feature)),
    client.call(CONFIG.models.sonnet, PERSONA_PROMPTS.tech.replace('{{FEATURE}}', feature))
  ]);
  totalCost += (techOpus.cost || 0) + (techGPT.cost || 0) + (techSonnet.cost || 0);
  
  // Tech統合
  const techMergePrompt = `以下3つの技術仕様を統合し、最も完全なものを作成:
1) ${techOpus.content.substring(0, 2000)}
2) ${techGPT.content.substring(0, 2000)}
3) ${techSonnet.content.substring(0, 2000)}`;
  const techMerged = await client.call(CONFIG.models.opus, techMergePrompt);
  totalCost += techMerged.cost || 0;
  
  // Step 2: Marketing (3 LLM並列)
  log('  Marketing (GPT-4o + Opus + Sonnet)...');
  const [mktGPT, mktOpus, mktSonnet] = await Promise.all([
    client.call(CONFIG.models.gpt4o, PERSONA_PROMPTS.marketing.replace('{{CURRENT_SSOT}}', techMerged.content)),
    client.call(CONFIG.models.opus, PERSONA_PROMPTS.marketing.replace('{{CURRENT_SSOT}}', techMerged.content)),
    client.call(CONFIG.models.sonnet, PERSONA_PROMPTS.marketing.replace('{{CURRENT_SSOT}}', techMerged.content))
  ]);
  totalCost += (mktGPT.cost || 0) + (mktOpus.cost || 0) + (mktSonnet.cost || 0);
  
  // Marketing統合
  const mktMergePrompt = `以下3つのマーケ視点を統合:
1) ${mktGPT.content.substring(0, 2000)}
2) ${mktOpus.content.substring(0, 2000)}
3) ${mktSonnet.content.substring(0, 2000)}`;
  const mktMerged = await client.call(CONFIG.models.gpt4o, mktMergePrompt);
  totalCost += mktMerged.cost || 0;
  
  // Step 3: UX/Ops (3 LLM並列)
  log('  UX/Ops (Sonnet + GPT-4o + Opus)...');
  const [uxSonnet, uxGPT, uxOpus] = await Promise.all([
    client.call(CONFIG.models.sonnet, PERSONA_PROMPTS.uxops.replace('{{CURRENT_SSOT}}', mktMerged.content)),
    client.call(CONFIG.models.gpt4o, PERSONA_PROMPTS.uxops.replace('{{CURRENT_SSOT}}', mktMerged.content)),
    client.call(CONFIG.models.opus, PERSONA_PROMPTS.uxops.replace('{{CURRENT_SSOT}}', mktMerged.content))
  ]);
  totalCost += (uxSonnet.cost || 0) + (uxGPT.cost || 0) + (uxOpus.cost || 0);
  
  // UX統合
  const uxMergePrompt = `以下3つのUX/Ops視点を統合:
1) ${uxSonnet.content.substring(0, 2000)}
2) ${uxGPT.content.substring(0, 2000)}
3) ${uxOpus.content.substring(0, 2000)}`;
  const uxMerged = await client.call(CONFIG.models.sonnet, uxMergePrompt);
  totalCost += uxMerged.cost || 0;
  
  // Step 4: Final Synthesis
  log('  Final Synthesis (Opus)...');
  const finalResult = await client.call(
    CONFIG.models.opus,
    PERSONA_PROMPTS.synthesizer
      .replace('{{TECH_DRAFT}}', techMerged.content)
      .replace('{{MARKETING_DRAFT}}', mktMerged.content)
      .replace('{{UX_DRAFT}}', uxMerged.content)
  );
  totalCost += finalResult.cost || 0;
  
  return {
    method: 'B: 各ペルソナ内マルチLLM',
    ssot: finalResult.content,
    duration: (Date.now() - startTime) / 1000,
    cost: totalCost,
    apiCalls: 13
  };
}

/**
 * 方法C: クロスレビュー方式
 */
async function methodC_CrossReview(feature, client) {
  log('方法C: クロスレビュー方式', 'STEP');
  const startTime = Date.now();
  let totalCost = 0;
  
  // Step 1: Tech (Opus) + GPT-4oレビュー
  log('  Tech (Opus) + GPT-4oレビュー...');
  const techDraft = await client.call(
    CONFIG.models.opus,
    PERSONA_PROMPTS.tech.replace('{{FEATURE}}', feature)
  );
  totalCost += techDraft.cost || 0;
  
  const techReview = await client.call(
    CONFIG.models.gpt4o,
    `以下のSSOTをレビューし、改善点を指摘してください:\n${techDraft.content}`
  );
  totalCost += techReview.cost || 0;
  
  const techFinal = await client.call(
    CONFIG.models.opus,
    `以下のレビューを反映してSSOTを改善:\nオリジナル:\n${techDraft.content}\nレビュー:\n${techReview.content}`
  );
  totalCost += techFinal.cost || 0;
  
  // Step 2: Marketing (GPT-4o) + Opusレビュー
  log('  Marketing (GPT-4o) + Opusレビュー...');
  const mktDraft = await client.call(
    CONFIG.models.gpt4o,
    PERSONA_PROMPTS.marketing.replace('{{CURRENT_SSOT}}', techFinal.content)
  );
  totalCost += mktDraft.cost || 0;
  
  const mktReview = await client.call(
    CONFIG.models.opus,
    `以下のマーケ視点をレビュー:\n${mktDraft.content}`
  );
  totalCost += mktReview.cost || 0;
  
  const mktFinal = await client.call(
    CONFIG.models.gpt4o,
    `レビューを反映:\n${mktDraft.content}\nレビュー:\n${mktReview.content}`
  );
  totalCost += mktFinal.cost || 0;
  
  // Step 3: UX/Ops (Sonnet) + GPT-4oレビュー
  log('  UX/Ops (Sonnet) + GPT-4oレビュー...');
  const uxDraft = await client.call(
    CONFIG.models.sonnet,
    PERSONA_PROMPTS.uxops.replace('{{CURRENT_SSOT}}', mktFinal.content)
  );
  totalCost += uxDraft.cost || 0;
  
  const uxReview = await client.call(
    CONFIG.models.gpt4o,
    `以下のUX/Ops視点をレビュー:\n${uxDraft.content}`
  );
  totalCost += uxReview.cost || 0;
  
  const uxFinal = await client.call(
    CONFIG.models.sonnet,
    `レビューを反映:\n${uxDraft.content}\nレビュー:\n${uxReview.content}`
  );
  totalCost += uxFinal.cost || 0;
  
  // Step 4: Synthesizer
  log('  Synthesizer (Opus)...');
  const finalResult = await client.call(
    CONFIG.models.opus,
    PERSONA_PROMPTS.synthesizer
      .replace('{{TECH_DRAFT}}', techFinal.content)
      .replace('{{MARKETING_DRAFT}}', mktFinal.content)
      .replace('{{UX_DRAFT}}', uxFinal.content)
  );
  totalCost += finalResult.cost || 0;
  
  return {
    method: 'C: クロスレビュー',
    ssot: finalResult.content,
    duration: (Date.now() - startTime) / 1000,
    cost: totalCost,
    apiCalls: 10
  };
}

/**
 * 方法D: 統合後監査のみ
 */
async function methodD_PostAudit(feature, client) {
  log('方法D: 統合後監査のみ', 'STEP');
  const startTime = Date.now();
  let totalCost = 0;
  
  // 現状と同じ流れでSSoT作成
  const techResult = await client.call(
    CONFIG.models.opus,
    PERSONA_PROMPTS.tech.replace('{{FEATURE}}', feature)
  );
  totalCost += techResult.cost || 0;
  
  const marketingResult = await client.call(
    CONFIG.models.gpt4o,
    PERSONA_PROMPTS.marketing.replace('{{CURRENT_SSOT}}', techResult.content)
  );
  totalCost += marketingResult.cost || 0;
  
  const uxResult = await client.call(
    CONFIG.models.sonnet,
    PERSONA_PROMPTS.uxops.replace('{{CURRENT_SSOT}}', marketingResult.content)
  );
  totalCost += uxResult.cost || 0;
  
  const synthesized = await client.call(
    CONFIG.models.opus,
    PERSONA_PROMPTS.synthesizer
      .replace('{{TECH_DRAFT}}', techResult.content)
      .replace('{{MARKETING_DRAFT}}', marketingResult.content)
      .replace('{{UX_DRAFT}}', uxResult.content)
  );
  totalCost += synthesized.cost || 0;
  
  // 追加: 3 LLMで監査
  log('  3 LLM監査...');
  const [auditOpus, auditGPT, auditSonnet] = await Promise.all([
    client.call(CONFIG.models.opus, `SSOTを監査し問題点を指摘:\n${synthesized.content}`),
    client.call(CONFIG.models.gpt4o, `SSOTを監査し問題点を指摘:\n${synthesized.content}`),
    client.call(CONFIG.models.sonnet, `SSOTを監査し問題点を指摘:\n${synthesized.content}`)
  ]);
  totalCost += (auditOpus.cost || 0) + (auditGPT.cost || 0) + (auditSonnet.cost || 0);
  
  // 監査結果を反映
  log('  監査結果を反映...');
  const finalResult = await client.call(
    CONFIG.models.opus,
    `以下のSSOTを監査結果に基づき改善:
SSOT: ${synthesized.content}
監査1: ${auditOpus.content.substring(0, 1000)}
監査2: ${auditGPT.content.substring(0, 1000)}
監査3: ${auditSonnet.content.substring(0, 1000)}`
  );
  totalCost += finalResult.cost || 0;
  
  return {
    method: 'D: 統合後監査',
    ssot: finalResult.content,
    duration: (Date.now() - startTime) / 1000,
    cost: totalCost,
    apiCalls: 8
  };
}

// ===== 評価 =====

async function evaluateSSoT(ssot, client) {
  const prompt = EVALUATOR_PROMPT.replace('{{SSOT}}', ssot.substring(0, 8000));
  
  const result = await client.call(CONFIG.models.opus, prompt);
  
  // スコア抽出
  const scoreMatch = result.content.match(/SCORE:\s*(\d+)/);
  const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
  
  return {
    score,
    evaluation: result.content,
    cost: result.cost || 0
  };
}

// ===== メイン =====

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
SSOT作成方法の比較検証

Usage: node compare-methods.cjs "機能の説明"

Example:
  node compare-methods.cjs "AIチャットで対応困難な問い合わせをスタッフに引き継ぐハンドオフ機能"
`);
    process.exit(0);
  }
  
  const feature = args.join(' ');
  
  console.log('═'.repeat(60));
  console.log('🔬 SSOT作成方法の比較検証');
  console.log('═'.repeat(60));
  console.log(`機能: ${feature}`);
  console.log('');
  
  // LLMクライアント初期化
  const client = new LLMClient();
  
  ensureDir(CONFIG.outputDir);
  
  const results = [];
  
  try {
    // 方法A: 現状
    const resultA = await methodA_Current(feature, client);
    results.push(resultA);
    log(`方法A完了: ${resultA.duration.toFixed(1)}秒, $${resultA.cost.toFixed(4)}`, 'SUCCESS');
    
    // 方法B: 各ペルソナ内マルチLLM（コストが高いのでオプション）
    if (args.includes('--full')) {
      const resultB = await methodB_MultiInPersona(feature, client);
      results.push(resultB);
      log(`方法B完了: ${resultB.duration.toFixed(1)}秒, $${resultB.cost.toFixed(4)}`, 'SUCCESS');
    }
    
    // 方法C: クロスレビュー
    const resultC = await methodC_CrossReview(feature, client);
    results.push(resultC);
    log(`方法C完了: ${resultC.duration.toFixed(1)}秒, $${resultC.cost.toFixed(4)}`, 'SUCCESS');
    
    // 方法D: 統合後監査
    const resultD = await methodD_PostAudit(feature, client);
    results.push(resultD);
    log(`方法D完了: ${resultD.duration.toFixed(1)}秒, $${resultD.cost.toFixed(4)}`, 'SUCCESS');
    
    // 評価
    console.log('\n' + '─'.repeat(60));
    console.log('📊 品質評価中...');
    console.log('─'.repeat(60));
    
    for (const result of results) {
      log(`${result.method} を評価中...`);
      const evaluation = await evaluateSSoT(result.ssot, client);
      result.score = evaluation.score;
      result.evaluationCost = evaluation.cost;
      result.evaluation = evaluation.evaluation;
    }
    
    // 結果保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(CONFIG.outputDir, `compare_${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    
    // レポート出力
    console.log('\n' + '═'.repeat(60));
    console.log('📊 比較結果');
    console.log('═'.repeat(60));
    
    console.log('\n| 方法 | スコア | コスト | 時間 | API呼出 |');
    console.log('|:-----|:-------|:-------|:-----|:--------|');
    
    results.forEach(r => {
      console.log(`| ${r.method} | ${r.score}点 | $${r.cost.toFixed(2)} | ${r.duration.toFixed(1)}秒 | ${r.apiCalls}回 |`);
    });
    
    // 効率計算
    console.log('\n📈 効率分析（スコア/コスト）:');
    results.forEach(r => {
      const efficiency = r.score / r.cost;
      console.log(`  ${r.method}: ${efficiency.toFixed(1)} 点/$`);
    });
    
    console.log(`\n📁 詳細レポート: ${reportPath}`);
    
  } catch (error) {
    console.error(`\n❌ エラー: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { methodA_Current, methodB_MultiInPersona, methodC_CrossReview, methodD_PostAudit };

if (require.main === module) {
  main();
}
