#!/usr/bin/env node
/**
 * Sonnet精度テスト: Opusと同じ95点が出るか検証
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
${TEST_SSOT.substring(0, 6000)}

## 生成プロンプト（評価対象）
${TEST_PROMPT.substring(0, 6000)}

## 出力形式（厳守）
以下のJSON形式のみで回答:
{"score": 0-100の整数, "issues": ["問題点1"], "summary": "一文"}`;

async function testModel(client, model) {
  console.log(`\n🔍 ${model} でテスト中...`);
  const start = Date.now();
  
  try {
    const response = await client.callClaude(AUDIT_PROMPT, model, { maxTokens: 2000 });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    
    // response.content からスコア抽出
    const content = response.content || '';
    const scoreMatch = content.match(/"score"\s*:\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
    
    console.log(`   スコア: ${score}点`);
    console.log(`   時間: ${elapsed}秒`);
    
    return { model, score, time: elapsed };
  } catch (e) {
    console.log(`   ❌ エラー: ${e.message.split('\n')[0]}`);
    return { model, score: 0, time: 0, error: e.message };
  }
}

async function main() {
  console.log('═'.repeat(50));
  console.log('🧪 Sonnet vs Opus 精度比較テスト');
  console.log('═'.repeat(50));
  
  const client = new LLMClient();
  
  const opus = await testModel(client, 'claude-opus-4-20250514');
  const sonnet = await testModel(client, 'claude-sonnet-4-20250514');
  
  console.log('\n' + '═'.repeat(50));
  console.log('📊 結果比較');
  console.log('═'.repeat(50));
  console.log(`| モデル | スコア | 時間 |`);
  console.log(`|:-------|-------:|-----:|`);
  console.log(`| Opus | ${opus.score}点 | ${opus.time}s |`);
  console.log(`| Sonnet | ${sonnet.score}点 | ${sonnet.time}s |`);
  console.log(`| **差分** | **${opus.score - sonnet.score}点** | - |`);
  
  // コスト計算
  const cost = client.getTotalCost();
  console.log(`\n💰 テストコスト: $${cost.totalCostUSD.toFixed(4)}`);
  
  if (Math.abs(opus.score - sonnet.score) <= 5) {
    console.log('\n✅ 精度差5点以内: Sonnetへの切り替え推奨');
  } else {
    console.log('\n⚠️ 精度差が大きい: Opus維持を推奨');
  }
}

main().catch(console.error);
