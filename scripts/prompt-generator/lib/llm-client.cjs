#!/usr/bin/env node
/**
 * LLM APIクライアント
 * 
 * 複数のLLM（Claude, GPT-4o, Gemini）を統一的に扱う。
 * コスト計算とログ記録を含む。
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ===== API設定 =====

const API_CONFIG = {
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1/messages',
    version: '2023-06-01'
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1/chat/completions'
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models'
  }
};

// ===== コスト設定（USD/1M tokens）=====

const COST_PER_1M = {
  // Anthropic
  'claude-opus-4-20250514': { input: 15.00, output: 75.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  
  // Google
  'gemini-1.5-pro-latest': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash-latest': { input: 0.075, output: 0.30 }
};

// ===== 環境変数読み込み =====

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.mcp');
  
  try {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
      });
    }
  } catch (error) {
    // 読み込めなくても続行（dry-run対応）
    console.warn(`⚠️ .env.mcp読み込みスキップ: ${error.code || error.message}`);
  }
}

// 初期化時に環境変数を読み込み（エラーは無視）
try {
  loadEnv();
} catch (e) {
  // 無視
}

// ===== LLMクライアントクラス =====

class LLMClient {
  constructor(options = {}) {
    this.costLog = [];
    this.logPath = options.logPath || null;
    this.dryRun = options.dryRun || false;
  }

  /**
   * Anthropic Claude API呼び出し
   */
  async callClaude(prompt, model = 'claude-sonnet-4-20250514', options = {}) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY が設定されていません');
    }

    if (this.dryRun) {
      return this._dryRunResponse('claude', model, prompt);
    }

    const body = {
      model,
      max_tokens: options.maxTokens || 4096,
      messages: [{ role: 'user', content: prompt }]
    };

    if (options.system) {
      body.system = options.system;
    }

    const response = await fetch(API_CONFIG.anthropic.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_CONFIG.anthropic.version
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    // コスト計算
    const usage = {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0
    };
    this._logCost('anthropic', model, usage);

    return {
      content: data.content[0].text,
      model,
      usage
    };
  }

  /**
   * OpenAI GPT API呼び出し
   */
  async callGPT(prompt, model = 'gpt-4o', options = {}) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY が設定されていません');
    }

    if (this.dryRun) {
      return this._dryRunResponse('openai', model, prompt);
    }

    const body = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 4096
    };

    if (options.system) {
      body.messages.unshift({ role: 'system', content: options.system });
    }

    const response = await fetch(API_CONFIG.openai.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GPT API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    const usage = {
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0
    };
    this._logCost('openai', model, usage);

    return {
      content: data.choices[0].message.content,
      model,
      usage
    };
  }

  /**
   * Google Gemini API呼び出し
   */
  async callGemini(prompt, model = 'gemini-1.5-pro-latest', options = {}) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY が設定されていません');
    }

    if (this.dryRun) {
      return this._dryRunResponse('google', model, prompt);
    }

    const url = `${API_CONFIG.google.baseUrl}/${model}:generateContent?key=${apiKey}`;
    
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: options.maxTokens || 4096
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    const usage = {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0
    };
    this._logCost('google', model, usage);

    return {
      content: data.candidates[0].content.parts[0].text,
      model,
      usage
    };
  }

  /**
   * 汎用呼び出し（プロバイダ自動判定）
   */
  async call(prompt, model, options = {}) {
    if (model.startsWith('claude')) {
      return this.callClaude(prompt, model, options);
    } else if (model.startsWith('gpt')) {
      return this.callGPT(prompt, model, options);
    } else if (model.startsWith('gemini')) {
      return this.callGemini(prompt, model, options);
    } else {
      throw new Error(`不明なモデル: ${model}`);
    }
  }

  /**
   * 並列呼び出し
   */
  async callParallel(calls) {
    const results = await Promise.all(
      calls.map(({ prompt, model, options }) => 
        this.call(prompt, model, options || {})
          .catch(error => ({ error: error.message, model }))
      )
    );
    return results;
  }

  /**
   * Dry Run用レスポンス
   */
  _dryRunResponse(provider, model, prompt) {
    const estimatedTokens = Math.ceil(prompt.length / 4);
    return {
      content: `[DRY RUN] ${provider}/${model} - 入力 ${estimatedTokens} tokens`,
      model,
      usage: {
        inputTokens: estimatedTokens,
        outputTokens: 500
      },
      dryRun: true
    };
  }

  /**
   * コストを計算・記録
   */
  _logCost(provider, model, usage) {
    const rates = COST_PER_1M[model] || { input: 0, output: 0 };
    
    const inputCost = (usage.inputTokens / 1000000) * rates.input;
    const outputCost = (usage.outputTokens / 1000000) * rates.output;
    const totalCost = inputCost + outputCost;
    
    const entry = {
      timestamp: new Date().toISOString(),
      provider,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      inputCostUSD: inputCost,
      outputCostUSD: outputCost,
      totalCostUSD: totalCost,
      totalCostJPY: totalCost * 150
    };
    
    this.costLog.push(entry);
  }

  /**
   * 累計コストを取得
   */
  getTotalCost() {
    const totals = {
      inputTokens: 0,
      outputTokens: 0,
      totalCostUSD: 0,
      totalCostJPY: 0,
      byModel: {}
    };
    
    this.costLog.forEach(entry => {
      totals.inputTokens += entry.inputTokens;
      totals.outputTokens += entry.outputTokens;
      totals.totalCostUSD += entry.totalCostUSD;
      totals.totalCostJPY += entry.totalCostJPY;
      
      if (!totals.byModel[entry.model]) {
        totals.byModel[entry.model] = { calls: 0, costUSD: 0 };
      }
      totals.byModel[entry.model].calls++;
      totals.byModel[entry.model].costUSD += entry.totalCostUSD;
    });
    
    return totals;
  }

  /**
   * コストログを保存
   */
  saveCostLog(filePath) {
    const totals = this.getTotalCost();
    const output = {
      summary: totals,
      details: this.costLog
    };
    
    fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
    return output;
  }

  /**
   * コストサマリーを出力
   */
  printCostSummary() {
    const totals = this.getTotalCost();
    
    console.log('\n💰 LLM使用コストサマリー:');
    console.log(`   総入力トークン: ${totals.inputTokens.toLocaleString()}`);
    console.log(`   総出力トークン: ${totals.outputTokens.toLocaleString()}`);
    console.log(`   総コスト: $${totals.totalCostUSD.toFixed(4)} (¥${totals.totalCostJPY.toFixed(0)})`);
    
    console.log('\n   モデル別:');
    Object.entries(totals.byModel).forEach(([model, data]) => {
      console.log(`   - ${model}: ${data.calls}回, $${data.costUSD.toFixed(4)}`);
    });
  }
}

// ===== エクスポート =====

module.exports = {
  LLMClient,
  COST_PER_1M,
  
  // ショートカット
  createClient: (options) => new LLMClient(options)
};

// ===== CLI テスト =====

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    console.log('🧪 LLMクライアントテスト（Dry Run）...\n');
    
    const client = new LLMClient({ dryRun: true });
    
    // Claude
    const claude = await client.callClaude('テストプロンプト', 'claude-sonnet-4-20250514');
    console.log('Claude:', claude.content);
    
    // GPT
    const gpt = await client.callGPT('テストプロンプト', 'gpt-4o');
    console.log('GPT:', gpt.content);
    
    // Gemini
    const gemini = await client.callGemini('テストプロンプト', 'gemini-1.5-pro-latest');
    console.log('Gemini:', gemini.content);
    
    // コストサマリー
    client.printCostSummary();
    
    console.log('\n✅ テスト完了');
  } else {
    console.log('Usage: node llm-client.cjs --test');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
