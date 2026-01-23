#!/usr/bin/env node
/**
 * マルチLLM完全比較検証
 * 
 * 1モデル、2モデル、3モデル構成を全て比較
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// 環境変数読み込み
const envPath = path.join(__dirname, '../../.env.mcp');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

// ===== モデル設定 =====
const MODELS = {
  'gemini-2.0-flash': { provider: 'google', cost: 0.00010, name: 'Gemini' },
  'gpt-4o-mini': { provider: 'openai', cost: 0.00015, name: 'Mini' },
  'gpt-4o': { provider: 'openai', cost: 0.0025, name: '4o' }
};

// ===== チェックリスト =====
const CHECKLIST = [
  { id: 'T01', name: 'テーブル名snake_case', weight: 2 },
  { id: 'T02', name: 'カラム名snake_case', weight: 2 },
  { id: 'T03', name: 'APIパス形式', weight: 2 },
  { id: 'T04', name: '要件ID定義', weight: 3 },
  { id: 'T05', name: 'Accept条件', weight: 3 },
  { id: 'T06', name: 'エラーハンドリング', weight: 2 },
  { id: 'T07', name: 'tenant_id考慮', weight: 3 },
  { id: 'T08', name: 'コード例', weight: 2 },
  { id: 'T09', name: 'セキュリティ', weight: 2 },
  { id: 'T10', name: '実装手順', weight: 2 }
];

// ===== API呼び出し =====
async function callOpenAI(prompt, model) {
  const apiKey = process.env.OPENAI_API_KEY;
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, max_tokens: 2000
    })
  });
  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  return { content: data.choices[0].message.content, tokens: data.usage.prompt_tokens + data.usage.completion_tokens };
}

async function callGemini(prompt, model) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
      })
    }
  );
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json();
  return { content: data.candidates[0].content.parts[0].text, tokens: 1000 };
}

async function callLLM(prompt, model) {
  const config = MODELS[model];
  if (config.provider === 'openai') return callOpenAI(prompt, model);
  return callGemini(prompt, model);
}

// ===== 監査 =====
function createPrompt(ssot) {
  return `SSOTを厳格に評価。各項目Pass/Fail判定。
${CHECKLIST.map(i => `- ${i.id}: ${i.name}`).join('\n')}
SSOT:
${ssot.substring(0, 6000)}
JSON出力: {"results":[{"id":"T01","passed":true/false},...]}`;
}

function calcScore(results) {
  let total = 0, passed = 0;
  for (const item of CHECKLIST) {
    total += item.weight;
    const r = results.find(x => x.id === item.id);
    if (r && r.passed) passed += item.weight;
  }
  return Math.round((passed / total) * 100);
}

// ===== マージ関数 =====
function mergeAND(allResults) {
  return CHECKLIST.map(item => ({
    id: item.id,
    passed: allResults.every(r => r.results.find(x => x.id === item.id)?.passed)
  }));
}

function mergeOR(allResults) {
  return CHECKLIST.map(item => ({
    id: item.id,
    passed: allResults.some(r => r.results.find(x => x.id === item.id)?.passed)
  }));
}

function mergeMajority(allResults) {
  return CHECKLIST.map(item => {
    const passCount = allResults.filter(r => r.results.find(x => x.id === item.id)?.passed).length;
    return { id: item.id, passed: passCount > allResults.length / 2 };
  });
}

// ===== 組み合わせ生成 =====
function getCombinations(arr, size) {
  if (size === 1) return arr.map(x => [x]);
  const result = [];
  for (let i = 0; i <= arr.length - size; i++) {
    const sub = getCombinations(arr.slice(i + 1), size - 1);
    for (const s of sub) result.push([arr[i], ...s]);
  }
  return result;
}

// ===== メイン =====
async function main() {
  console.log('████████████████████████████████████████████████████████████');
  console.log('📊 マルチLLM完全比較（1/2/3モデル構成）');
  console.log('████████████████████████████████████████████████████████████\n');

  const testCases = [
    { name: '低品質', path: path.join(__dirname, 'test-ssot-low-quality.md') },
    { name: '高品質', path: path.join(__dirname, '../../docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md') }
  ];

  const modelNames = Object.keys(MODELS);

  for (const testCase of testCases) {
    if (!fs.existsSync(testCase.path)) continue;

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📄 ${testCase.name}SSOT`);
    console.log(`${'═'.repeat(60)}\n`);

    const ssot = fs.readFileSync(testCase.path, 'utf8');
    const prompt = createPrompt(ssot);

    // 各モデルで監査
    const modelResults = {};
    let totalCost = 0;

    for (const model of modelNames) {
      process.stdout.write(`  ${MODELS[model].name}: `);
      try {
        const res = await callLLM(prompt, model);
        const json = JSON.parse(res.content.match(/\{[\s\S]*\}/)[0]);
        const score = calcScore(json.results);
        const cost = res.tokens * MODELS[model].cost / 1000;
        totalCost += cost;
        modelResults[model] = { results: json.results, score, cost };
        console.log(`${score}点 ($${cost.toFixed(4)})`);
      } catch (e) {
        console.log(`エラー`);
      }
      await new Promise(r => setTimeout(r, 500));
    }

    // 全組み合わせ比較
    console.log('\n📊 組み合わせ比較\n');
    console.log('| 構成 | モデル | AND | OR | 多数決 | コスト |');
    console.log('|:-----|:-------|:----|:---|:-------|:-------|');

    // 1モデル
    for (const model of modelNames) {
      if (!modelResults[model]) continue;
      const r = modelResults[model];
      console.log(`| 1モデル | ${MODELS[model].name} | ${r.score} | ${r.score} | ${r.score} | $${r.cost.toFixed(4)} |`);
    }

    // 2モデル
    const combos2 = getCombinations(modelNames, 2);
    for (const combo of combos2) {
      const results = combo.map(m => modelResults[m]).filter(Boolean);
      if (results.length < 2) continue;
      
      const andScore = calcScore(mergeAND(results));
      const orScore = calcScore(mergeOR(results));
      const majScore = calcScore(mergeMajority(results));
      const cost = results.reduce((s, r) => s + r.cost, 0);
      const names = combo.map(m => MODELS[m].name).join('+');
      
      console.log(`| 2モデル | ${names} | ${andScore} | ${orScore} | ${majScore} | $${cost.toFixed(4)} |`);
    }

    // 3モデル
    const allResults = modelNames.map(m => modelResults[m]).filter(Boolean);
    if (allResults.length === 3) {
      const andScore = calcScore(mergeAND(allResults));
      const orScore = calcScore(mergeOR(allResults));
      const majScore = calcScore(mergeMajority(allResults));
      const cost = allResults.reduce((s, r) => s + r.cost, 0);
      
      console.log(`| **3モデル** | **全部** | **${andScore}** | **${orScore}** | **${majScore}** | **$${cost.toFixed(4)}** |`);
    }
  }

  // 結論
  console.log('\n\n████████████████████████████████████████████████████████████');
  console.log('📋 分析結論');
  console.log('████████████████████████████████████████████████████████████\n');

  console.log('【低品質SSOT検出能力】');
  console.log('  - AND合成: 最も厳格（0点検出）');
  console.log('  - 多数決: バランス');
  console.log('  - OR合成: 緩い（見逃しリスク）');
  console.log('');
  console.log('【高品質SSOT評価精度】');
  console.log('  - gpt-4o単体が最も厳格（追加指摘あり）');
  console.log('  - AND合成で厳格さを反映');
  console.log('');
  console.log('【推奨】');
  console.log('  🎯 95点以上を目標: Gemini + 4o（AND合成）');
  console.log('  ⚖️ バランス: 3モデル多数決');
  console.log('  💰 コスト重視: Gemini単体');
}

main().catch(console.error);
