#!/usr/bin/env node
/**
 * マルチLLM監査検証スクリプト
 * 
 * 複数のLLMで監査し、結果をマージして精度向上を検証
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
  'gemini-2.0-flash': { provider: 'google', cost: 0.00010 },
  'gpt-4o-mini': { provider: 'openai', cost: 0.00015 },
  'gpt-4o': { provider: 'openai', cost: 0.0025 }
};

// ===== チェックリスト =====
const CHECKLIST = [
  { id: 'T01', name: 'テーブル名snake_case', weight: 2 },
  { id: 'T02', name: 'カラム名snake_case', weight: 2 },
  { id: 'T03', name: 'APIパス形式 /api/v1/admin/', weight: 2 },
  { id: 'T04', name: '要件ID定義(REQ-XXX)', weight: 3 },
  { id: 'T05', name: 'Accept条件明確', weight: 3 },
  { id: 'T06', name: 'エラーハンドリング定義', weight: 2 },
  { id: 'T07', name: 'tenant_id考慮', weight: 3 },
  { id: 'T08', name: '具体的なコード例', weight: 2 },
  { id: 'T09', name: 'セキュリティ考慮', weight: 2 },
  { id: 'T10', name: '実装手順明確', weight: 2 }
];

// ===== API呼び出し =====
async function callOpenAI(prompt, model) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    tokens: data.usage.prompt_tokens + data.usage.completion_tokens
  };
}

async function callGemini(prompt, model) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set');

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
  return {
    content: data.candidates[0].content.parts[0].text,
    tokens: (data.usageMetadata?.promptTokenCount || 500) + (data.usageMetadata?.candidatesTokenCount || 500)
  };
}

async function callLLM(prompt, model) {
  const config = MODELS[model];
  if (config.provider === 'openai') return callOpenAI(prompt, model);
  if (config.provider === 'google') return callGemini(prompt, model);
  throw new Error(`Unknown provider`);
}

// ===== 監査プロンプト =====
function createAuditPrompt(ssotContent) {
  return `あなたはSSOT品質監査の専門家です。以下のSSOTを厳格に評価してください。

## 評価項目（各項目をPass/Failで判定、厳格に）

${CHECKLIST.map(item => `- ${item.id}: ${item.name}（重み${item.weight}）`).join('\n')}

## 判定基準
- Pass: 明確に記載されている
- Fail: 記載なし、曖昧、または不十分

## SSOT内容
${ssotContent.substring(0, 8000)}

## 出力形式（JSON）
{
  "results": [
    {"id": "T01", "passed": true/false, "reason": "判定理由（具体的に）"},
    ...
  ],
  "issues": ["指摘事項1", "指摘事項2", ...]
}

JSONのみを出力してください。`;
}

// ===== スコア計算 =====
function calculateScore(results) {
  let totalWeight = 0;
  let passedWeight = 0;
  
  for (const item of CHECKLIST) {
    totalWeight += item.weight;
    const result = results.find(r => r.id === item.id);
    if (result && result.passed) {
      passedWeight += item.weight;
    }
  }
  
  return Math.round((passedWeight / totalWeight) * 100);
}

// ===== 結果マージ =====
function mergeResultsAND(allResults) {
  // AND合成: 全モデルがPassの場合のみPass
  const merged = CHECKLIST.map(item => {
    const allPassed = allResults.every(r => {
      const found = r.results.find(x => x.id === item.id);
      return found && found.passed;
    });
    return { id: item.id, passed: allPassed };
  });
  return merged;
}

function mergeResultsOR(allResults) {
  // OR合成: いずれかのモデルがPassならPass
  const merged = CHECKLIST.map(item => {
    const anyPassed = allResults.some(r => {
      const found = r.results.find(x => x.id === item.id);
      return found && found.passed;
    });
    return { id: item.id, passed: anyPassed };
  });
  return merged;
}

function mergeResultsMAJORITY(allResults) {
  // 多数決: 過半数がPassならPass
  const merged = CHECKLIST.map(item => {
    const passCount = allResults.filter(r => {
      const found = r.results.find(x => x.id === item.id);
      return found && found.passed;
    }).length;
    return { id: item.id, passed: passCount > allResults.length / 2 };
  });
  return merged;
}

// ===== メイン =====
async function main() {
  console.log('████████████████████████████████████████████████████████████');
  console.log('📊 マルチLLM監査検証');
  console.log('████████████████████████████████████████████████████████████\n');

  // テスト用SSOT
  const testCases = [
    { name: '低品質', path: path.join(__dirname, 'test-ssot-low-quality.md') },
    { name: '高品質', path: path.join(__dirname, '../../docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md') }
  ];

  for (const testCase of testCases) {
    if (!fs.existsSync(testCase.path)) {
      console.log(`⚠️ ${testCase.name}: ファイルなし`);
      continue;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📄 テストケース: ${testCase.name}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    const ssotContent = fs.readFileSync(testCase.path, 'utf8');
    const prompt = createAuditPrompt(ssotContent);

    const modelResults = [];
    let totalCost = 0;
    let totalTime = 0;

    // 各モデルで監査
    for (const [modelName, config] of Object.entries(MODELS)) {
      console.log(`🔄 ${modelName} で監査中...`);
      const startTime = Date.now();
      
      try {
        const response = await callLLM(prompt, modelName);
        const duration = Date.now() - startTime;
        totalTime += duration;
        
        const cost = response.tokens * config.cost / 1000;
        totalCost += cost;

        const jsonMatch = response.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.log(`  ⚠️ JSON解析失敗`);
          continue;
        }

        const auditResult = JSON.parse(jsonMatch[0]);
        const score = calculateScore(auditResult.results);
        
        console.log(`  ✅ スコア: ${score}/100 (${duration}ms, $${cost.toFixed(4)})`);
        
        modelResults.push({
          model: modelName,
          score,
          results: auditResult.results,
          issues: auditResult.issues || []
        });

      } catch (error) {
        console.log(`  ❌ エラー: ${error.message}`);
      }
      
      await new Promise(r => setTimeout(r, 500));
    }

    if (modelResults.length < 2) {
      console.log('\n⚠️ 2つ以上のモデル結果が必要です');
      continue;
    }

    // マージ結果
    console.log('\n📊 マージ結果比較\n');
    
    const andMerged = mergeResultsAND(modelResults);
    const orMerged = mergeResultsOR(modelResults);
    const majorityMerged = mergeResultsMAJORITY(modelResults);

    const andScore = calculateScore(andMerged);
    const orScore = calculateScore(orMerged);
    const majorityScore = calculateScore(majorityMerged);
    const avgScore = Math.round(modelResults.reduce((s, r) => s + r.score, 0) / modelResults.length);

    console.log('| 方式 | スコア | 特徴 |');
    console.log('|:-----|:-------|:-----|');
    for (const r of modelResults) {
      console.log(`| ${r.model}（単体） | ${r.score}/100 | 単一モデル |`);
    }
    console.log(`| **平均** | ${avgScore}/100 | 単純平均 |`);
    console.log(`| **AND合成** | ${andScore}/100 | 全員Pass→Pass（厳格） |`);
    console.log(`| **OR合成** | ${orScore}/100 | 誰かPass→Pass（緩い） |`);
    console.log(`| **多数決** | ${majorityScore}/100 | 過半数Pass→Pass |`);

    // 指摘事項の統合
    const allIssues = new Set();
    for (const r of modelResults) {
      for (const issue of r.issues) {
        allIssues.add(issue);
      }
    }

    if (allIssues.size > 0) {
      console.log('\n📋 統合指摘事項（全モデルから）\n');
      let i = 1;
      for (const issue of allIssues) {
        console.log(`${i}. ${issue}`);
        i++;
      }
    }

    console.log(`\n💰 合計コスト: $${totalCost.toFixed(4)}`);
    console.log(`⏱️ 合計時間: ${totalTime}ms`);
  }

  // 結論
  console.log('\n\n████████████████████████████████████████████████████████████');
  console.log('📋 結論');
  console.log('████████████████████████████████████████████████████████████\n');
  
  console.log('【推奨構成】');
  console.log('');
  console.log('🎯 品質重視: AND合成（gemini-2.0-flash + gpt-4o-mini）');
  console.log('   → 両モデルがPassした項目のみ合格、厳格な品質管理');
  console.log('');
  console.log('⚖️ バランス: 多数決（gemini-2.0-flash + gpt-4o-mini + gpt-4o）');
  console.log('   → 過半数の合意で判定、適度な厳格さ');
  console.log('');
  console.log('💰 コスト重視: gemini-2.0-flash 単体');
  console.log('   → 最速・最低コスト、精度は単体相当');
}

main().catch(console.error);
