#!/usr/bin/env node
/**
 * 監査モデル比較検証スクリプト
 * 
 * 複数のLLMモデルでSSOT監査を実施し、精度とコストを比較
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

// ===== 比較対象モデル =====
const MODELS = {
  'gpt-4o-mini': {
    provider: 'openai',
    cost: 0.00015,  // $/1K input tokens
    description: '低コスト'
  },
  'gpt-4o': {
    provider: 'openai',
    cost: 0.0025,
    description: 'バランス'
  },
  'o3-mini': {
    provider: 'openai',
    cost: 0.0011,
    description: '推論特化'
  },
  'gpt-4.1-mini': {
    provider: 'openai',
    cost: 0.0004,
    description: '新世代mini'
  },
  'gemini-2.0-flash': {
    provider: 'google',
    cost: 0.00010,
    description: '高速低コスト'
  }
};

// ===== チェックリスト（簡易版） =====
const CHECKLIST = [
  { id: 'T01', name: 'テーブル名snake_case', weight: 2 },
  { id: 'T02', name: 'カラム名snake_case', weight: 2 },
  { id: 'T03', name: 'APIパス形式', weight: 2 },
  { id: 'T04', name: '要件ID定義', weight: 3 },
  { id: 'T05', name: 'Accept条件', weight: 3 },
  { id: 'T06', name: 'エラーハンドリング', weight: 2 },
  { id: 'T07', name: 'tenant_id考慮', weight: 3 },
  { id: 'T08', name: '具体的なコード例', weight: 2 },
  { id: 'T09', name: 'セキュリティ考慮', weight: 2 },
  { id: 'T10', name: '実装手順明確', weight: 2 }
];

// ===== API呼び出し =====
async function callOpenAI(prompt, model) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const startTime = Date.now();
  
  // o3-mini等の推論モデルはmax_completion_tokensを使用
  const isReasoningModel = model.startsWith('o1') || model.startsWith('o3');
  const tokenParam = isReasoningModel 
    ? { max_completion_tokens: 2000 }
    : { max_tokens: 2000 };
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: isReasoningModel ? 1 : 0.3,  // o3等はtemperature固定
      ...tokenParam
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const duration = Date.now() - startTime;
  
  return {
    content: data.choices[0].message.content,
    tokens: {
      input: data.usage.prompt_tokens,
      output: data.usage.completion_tokens
    },
    duration
  };
}

async function callGemini(prompt, model) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set');

  const startTime = Date.now();
  const modelName = model.replace('gemini-', 'gemini-');
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2000 }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const duration = Date.now() - startTime;
  
  return {
    content: data.candidates[0].content.parts[0].text,
    tokens: {
      input: data.usageMetadata?.promptTokenCount || 1000,
      output: data.usageMetadata?.candidatesTokenCount || 500
    },
    duration
  };
}

async function callLLM(prompt, model) {
  const config = MODELS[model];
  if (!config) throw new Error(`Unknown model: ${model}`);
  
  if (config.provider === 'openai') {
    return callOpenAI(prompt, model);
  } else if (config.provider === 'google') {
    return callGemini(prompt, model);
  }
  throw new Error(`Unknown provider: ${config.provider}`);
}

// ===== 監査プロンプト =====
function createAuditPrompt(ssotContent) {
  return `あなたはSSOT品質監査の専門家です。以下のSSOTを評価してください。

## 評価項目（各項目をPass/Failで判定）

${CHECKLIST.map(item => `- ${item.id}: ${item.name}（重み${item.weight}）`).join('\n')}

## SSOT内容
${ssotContent.substring(0, 8000)}

## 出力形式（JSON）
{
  "results": [
    {"id": "T01", "passed": true, "reason": "理由"},
    ...
  ],
  "summary": "総評（100文字以内）"
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

// ===== メイン =====
async function main() {
  console.log('████████████████████████████████████████████████████████████');
  console.log('📊 監査モデル比較検証');
  console.log('████████████████████████████████████████████████████████████\n');

  // テスト用SSOT（低品質版で差を検出）
  const args = process.argv.slice(2);
  const ssotPath = args[0] 
    ? path.resolve(args[0])
    : path.join(__dirname, 'test-ssot-low-quality.md');
  
  if (!fs.existsSync(ssotPath)) {
    console.error('テスト用SSOTが見つかりません:', ssotPath);
    process.exit(1);
  }
  
  const ssotContent = fs.readFileSync(ssotPath, 'utf8');
  const prompt = createAuditPrompt(ssotContent);
  
  console.log(`📄 テストSSO: ${path.basename(ssotPath)}`);
  console.log(`📏 サイズ: ${ssotContent.length} 文字\n`);

  const results = [];

  for (const [modelName, config] of Object.entries(MODELS)) {
    console.log(`\n🔄 ${modelName} で監査中...`);
    
    try {
      const response = await callLLM(prompt, modelName);
      
      // JSON抽出
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log(`  ⚠️ JSON解析失敗`);
        results.push({
          model: modelName,
          success: false,
          error: 'JSON parse failed'
        });
        continue;
      }
      
      const auditResult = JSON.parse(jsonMatch[0]);
      const score = calculateScore(auditResult.results);
      const cost = (response.tokens.input * config.cost / 1000) + 
                   (response.tokens.output * config.cost * 3 / 1000);
      
      console.log(`  ✅ スコア: ${score}/100`);
      console.log(`  ⏱️ 時間: ${response.duration}ms`);
      console.log(`  💰 コスト: $${cost.toFixed(4)}`);
      
      results.push({
        model: modelName,
        success: true,
        score,
        duration: response.duration,
        cost,
        tokens: response.tokens,
        summary: auditResult.summary
      });
      
    } catch (error) {
      console.log(`  ❌ エラー: ${error.message}`);
      results.push({
        model: modelName,
        success: false,
        error: error.message
      });
    }
    
    // レート制限対策
    await new Promise(r => setTimeout(r, 1000));
  }

  // 結果サマリー
  console.log('\n\n████████████████████████████████████████████████████████████');
  console.log('📊 結果サマリー');
  console.log('████████████████████████████████████████████████████████████\n');

  const successResults = results.filter(r => r.success);
  
  if (successResults.length === 0) {
    console.log('❌ 全てのモデルで失敗しました');
    return;
  }

  // スコア順でソート
  successResults.sort((a, b) => b.score - a.score);

  console.log('| モデル | スコア | 時間 | コスト | 効率 |');
  console.log('|:-------|:-------|:-----|:-------|:-----|');
  
  for (const r of successResults) {
    const efficiency = (r.score / (r.cost * 1000)).toFixed(1);
    console.log(`| ${r.model} | ${r.score}/100 | ${r.duration}ms | $${r.cost.toFixed(4)} | ${efficiency} |`);
  }

  // 推奨モデル
  console.log('\n📋 推奨');
  
  const bestAccuracy = successResults[0];
  console.log(`  🎯 精度重視: ${bestAccuracy.model} (${bestAccuracy.score}点)`);
  
  const bestCost = successResults.sort((a, b) => a.cost - b.cost)[0];
  console.log(`  💰 コスト重視: ${bestCost.model} ($${bestCost.cost.toFixed(4)})`);
  
  const bestEfficiency = successResults.sort((a, b) => 
    (b.score / b.cost) - (a.score / a.cost)
  )[0];
  console.log(`  ⚖️ バランス: ${bestEfficiency.model}`);

  // 結果保存
  const outputPath = path.join(__dirname, '../../evidence/audit-model-comparison.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    ssot: path.basename(ssotPath),
    results
  }, null, 2));
  
  console.log(`\n📄 結果保存: ${outputPath}`);
}

main().catch(console.error);
