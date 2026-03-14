#!/usr/bin/env node
/**
 * マルチLLM監査テスト: 複数モデルで監査し精度向上を検証
 */

const { LLMClient } = require('./lib/llm-client.cjs');
const fs = require('fs');

const TEST_PROMPT = fs.readFileSync('prompts/generated/BATCH-FAQ2-ssot_guest_ai_faq_auto_response.md', 'utf-8');
const TEST_SSOT = fs.readFileSync('docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_FAQ_AUTO_RESPONSE.md', 'utf-8');

const AUDIT_PROMPT = `あなたはSSOT準拠監査官です。
以下のプロンプトがSSOTの要件を100%満たしているか厳密に評価してください。

## 評価基準
- 要件ID（XXX-nnn）が全て含まれているか
- Accept条件が全て実装指示に含まれているか
- API仕様が正確か
- DBスキーマが正確か

## SSOT（正）
${TEST_SSOT.substring(0, 5000)}

## 生成プロンプト（評価対象）
${TEST_PROMPT.substring(0, 5000)}

## 出力形式（厳守）
必ず以下のJSON形式のみで回答。説明不要。
{"score": 0から100の整数, "issues": ["問題点"], "summary": "要約"}`;

function extractScore(content) {
  if (!content) return null;
  const match = content.match(/"score"\s*:\s*(\d+)/);
  return match ? parseInt(match[1]) : null;
}

async function main() {
  console.log('═'.repeat(55));
  console.log('🧪 マルチLLM監査テスト: 多角的チェックの精度検証');
  console.log('═'.repeat(55));
  
  const client = new LLMClient();
  const results = {};
  
  console.log('\n📋 各LLMでSSOT監査を実行...\n');
  
  // Claude Opus
  console.log('   🔍 Claude Opus...');
  try {
    const r = await client.callClaude(AUDIT_PROMPT, 'claude-opus-4-20250514', { maxTokens: 1500 });
    results['Claude Opus'] = extractScore(r.content);
    console.log(`      → ${results['Claude Opus']}点`);
  } catch (e) {
    console.log(`      ❌ ${e.message.split('\n')[0]}`);
    results['Claude Opus'] = null;
  }
  
  // GPT-4o
  console.log('   🔍 GPT-4o...');
  try {
    const r = await client.callGPT(AUDIT_PROMPT, 'gpt-4o', { maxTokens: 1500 });
    results['GPT-4o'] = extractScore(r.content);
    console.log(`      → ${results['GPT-4o']}点`);
  } catch (e) {
    console.log(`      ❌ ${e.message.split('\n')[0]}`);
    results['GPT-4o'] = null;
  }
  
  // Claude Sonnet
  console.log('   🔍 Claude Sonnet...');
  try {
    const r = await client.callClaude(AUDIT_PROMPT, 'claude-sonnet-4-20250514', { maxTokens: 1500 });
    results['Claude Sonnet'] = extractScore(r.content);
    console.log(`      → ${results['Claude Sonnet']}点`);
  } catch (e) {
    console.log(`      ❌ ${e.message.split('\n')[0]}`);
    results['Claude Sonnet'] = null;
  }
  
  console.log('\n' + '═'.repeat(55));
  console.log('📊 結果比較');
  console.log('═'.repeat(55));
  
  console.log('\n| モデル | スコア |');
  console.log('|:-------|-------:|');
  Object.entries(results).forEach(([model, score]) => {
    console.log(`| ${model} | ${score !== null ? score + '点' : 'エラー'} |`);
  });
  
  // 有効なスコアのみで統計
  const validScores = Object.values(results).filter(s => s !== null);
  if (validScores.length >= 2) {
    const avg = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    const max = Math.max(...validScores);
    const min = Math.min(...validScores);
    const variance = validScores.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / validScores.length;
    const stdDev = Math.sqrt(variance);
    
    console.log('\n### 統計');
    console.log(`| 指標 | 値 |`);
    console.log(`|:-----|:---|`);
    console.log(`| 平均スコア | ${avg.toFixed(1)}点 |`);
    console.log(`| 最高/最低 | ${max}点 / ${min}点 |`);
    console.log(`| 標準偏差 | ${stdDev.toFixed(1)} |`);
    console.log(`| バラつき | ${max - min}点 |`);
    
    // 推奨戦略
    console.log('\n### 💡 推奨戦略');
    if (stdDev < 10) {
      console.log('✅ スコアの一致度が高い → マルチLLM平均で安定した評価可能');
    } else {
      console.log('⚠️ スコアにバラつき → 重み付け平均または最高スコア採用を推奨');
    }
    
    // マルチLLMのメリット
    console.log('\n### 🎯 マルチLLM監査のメリット');
    console.log('1. 単一LLMの偏りを排除');
    console.log('2. 複数視点での品質チェック');
    console.log('3. スコアの信頼性向上（外れ値検出）');
  }
  
  // コスト
  const cost = client.getTotalCost();
  console.log(`\n💰 テストコスト: $${cost.totalCostUSD.toFixed(4)}`);
}

main().catch(console.error);
