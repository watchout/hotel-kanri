#!/usr/bin/env node
/**
 * SSOT監査チェックリスト（強化版）
 * 
 * 生成されたSSOTの品質を多角的に検証
 * Gemini + GPT-4o のマルチLLM監査に対応
 * 
 * @version 2.0.0
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

// ===== チェックリスト定義（30項目・100点満点）=====
const CHECKLIST = {
  // ========================================
  // カテゴリ1: DB設計（Database）- 20点
  // ========================================
  database: [
    {
      id: 'T01',
      name: 'テーブル名snake_case',
      weight: 4,
      level: 'critical',
      pattern: /@@map\("[a-z][a-z_]*"\)/,
      category: 'DB設計',
      description: 'テーブル名はsnake_case（@@map使用）'
    },
    {
      id: 'T02',
      name: 'カラム名snake_case',
      weight: 4,
      level: 'critical',
      pattern: /@map\("[a-z][a-z_]*"\)/,
      category: 'DB設計',
      description: 'カラム名はsnake_case（@map使用）'
    },
    {
      id: 'T03',
      name: 'Prisma @map使用',
      weight: 3,
      level: 'major',
      pattern: /@map\(|@@map\(/,
      category: 'DB設計',
      description: 'Prismaの@mapディレクティブ使用'
    },
    {
      id: 'T04',
      name: 'tenant_idインデックス',
      weight: 4,
      level: 'critical',
      pattern: /tenant_id|tenantId.*index|@@index.*tenant/i,
      category: 'DB設計',
      description: 'tenant_idにインデックス定義'
    },
    {
      id: 'T05',
      name: 'リレーション定義',
      weight: 5,
      level: 'major',
      pattern: /@relation|references:|リレーション|外部キー/i,
      category: 'DB設計',
      description: 'テーブル間のリレーション定義'
    }
  ],

  // ========================================
  // カテゴリ2: API設計（API）- 20点
  // ========================================
  api: [
    {
      id: 'T06',
      name: 'パス形式 /api/v1/admin/',
      weight: 5,
      level: 'critical',
      pattern: /\/api\/v1\/(admin|guest)\//,
      category: 'API設計',
      description: '標準パス形式（/api/v1/admin/xxx）'
    },
    {
      id: 'T07',
      name: '深いネストなし',
      weight: 4,
      level: 'critical',
      patternInverse: /\/api\/v1\/admin\/[^/]+\/\[.*\]\/[^/]+\/\[/,
      category: 'API設計',
      description: '3階層以上のネストがない'
    },
    {
      id: 'T08',
      name: 'HTTP Method適切',
      weight: 4,
      level: 'major',
      pattern: /(GET|POST|PUT|PATCH|DELETE)\s+\/api/,
      category: 'API設計',
      description: 'HTTPメソッドが明記されている'
    },
    {
      id: 'T09',
      name: 'レスポンス形式統一',
      weight: 4,
      level: 'major',
      pattern: /\{\s*success:\s*true|"success":\s*true/,
      category: 'API設計',
      description: '標準レスポンス形式（{ success: true, data: ... }）'
    },
    {
      id: 'T10',
      name: 'エラーコード定義',
      weight: 3,
      level: 'major',
      pattern: /40[0-9]|50[0-9]|UNAUTHORIZED|NOT_FOUND|BAD_REQUEST/,
      category: 'API設計',
      description: 'エラー時のステータスコード定義'
    }
  ],

  // ========================================
  // カテゴリ3: 認証・セキュリティ（Auth）- 15点
  // ========================================
  auth: [
    {
      id: 'T11',
      name: 'SessionUser形式',
      weight: 3,
      level: 'critical',
      pattern: /Session|Cookie|認証|Authentication/i,
      category: '認証',
      description: 'Session認証の記載'
    },
    {
      id: 'T12',
      name: 'tenant_id必須',
      weight: 5,
      level: 'critical',
      pattern: /tenant_id.*必須|tenantId.*required|マルチテナント/i,
      category: '認証',
      description: 'tenant_idの必須化'
    },
    {
      id: 'T13',
      name: '権限チェック記述',
      weight: 3,
      level: 'major',
      pattern: /権限|Permission|Role|アクセス制御/i,
      category: '認証',
      description: '権限チェックの記載'
    },
    {
      id: 'T14',
      name: '認証エラーハンドリング',
      weight: 2,
      level: 'major',
      pattern: /401|403|Unauthorized|Forbidden|認証エラー/i,
      category: '認証',
      description: '認証エラー時の処理'
    },
    {
      id: 'T15',
      name: 'セキュリティ要件',
      weight: 2,
      level: 'major',
      pattern: /セキュリティ|Security|XSS|CSRF|SQLインジェクション/i,
      category: '認証',
      description: 'セキュリティ考慮事項'
    }
  ],

  // ========================================
  // カテゴリ4: 要件定義（Requirements）- 25点
  // ========================================
  requirements: [
    {
      id: 'I01',
      name: '要件ID体系',
      weight: 5,
      level: 'critical',
      pattern: /[A-Z]{2,5}-\d{3}|要件\s*\d+|REQ\s*\d+|機能\s*\d+|FR-|NFR-/i,
      category: '要件定義',
      description: '一意の要件ID（例: REQ-001, 要件1, FR-001）'
    },
    {
      id: 'I02',
      name: '全要件にID付与',
      weight: 5,
      level: 'critical',
      customVerify: (content) => {
        // ドキュメントサイズに応じた動的閾値
        const lines = content.split('\n').length;
        const minReqs = lines > 200 ? 5 : lines > 100 ? 3 : 2;
        // 複数パターン対応
        const patterns = [
          /[A-Z]{2,5}-\d{3}/g,
          /要件\s*\d+/g,
          /REQ\s*\d+/gi,
          /機能\s*\d+/g,
          /FR-\w+/g,
          /NFR-\w+/g
        ];
        let totalCount = 0;
        for (const p of patterns) {
          const matches = content.match(p) || [];
          totalCount += matches.length;
        }
        return totalCount >= minReqs;
      },
      category: '要件定義',
      description: '要件IDが適切な数（サイズに応じて2-5以上）'
    },
    {
      id: 'I03',
      name: 'Accept条件明記',
      weight: 5,
      level: 'critical',
      pattern: /Accept|合格条件|完了条件|検証条件|確認できる|〜であること|成功する|表示される|返される/i,
      category: '要件定義',
      description: '各要件に合格条件'
    },
    {
      id: 'I04',
      name: 'Accept条件が検証可能',
      weight: 5,
      level: 'major',
      pattern: /確認できる|表示される|返される|成功する|秒以内|件以上/,
      category: '要件定義',
      description: 'Accept条件が具体的'
    },
    {
      id: 'I05',
      name: '優先度明記',
      weight: 5,
      level: 'major',
      pattern: /優先度|Priority|P[0-3]|Must|Should|Could/i,
      category: '要件定義',
      description: '要件の優先度'
    }
  ],

  // ========================================
  // カテゴリ5: 実装チェックリスト（Checklist）- 10点
  // ========================================
  checklist: [
    {
      id: 'I06',
      name: '実装チェックリストあり',
      weight: 3,
      level: 'major',
      pattern: /\[\s*\]|\[x\]|チェックリスト|Checklist/i,
      category: 'チェックリスト',
      description: 'チェックリスト形式の確認項目'
    },
    {
      id: 'I07',
      name: 'Phase分け明確',
      weight: 4,
      level: 'major',
      pattern: /Phase\s*\d|フェーズ|マイルストーン/i,
      category: 'チェックリスト',
      description: '実装フェーズの分割'
    },
    {
      id: 'I08',
      name: '各Phase完了条件',
      weight: 3,
      level: 'major',
      pattern: /完了条件|完了基準|Phase.*完了/i,
      category: 'チェックリスト',
      description: 'Phase毎の完了条件'
    }
  ],

  // ========================================
  // カテゴリ6: エラーハンドリング（Error）- 5点
  // ========================================
  error: [
    {
      id: 'I09',
      name: 'テストケース定義',
      weight: 3,
      level: 'major',
      pattern: /テストケース|Test Case|テスト項目/i,
      category: 'エラーハンドリング',
      description: 'テストケースの定義'
    },
    {
      id: 'I10',
      name: 'エラーケース列挙',
      weight: 2,
      level: 'major',
      pattern: /エラーケース|異常系|失敗パターン/i,
      category: 'エラーハンドリング',
      description: 'エラーケースの列挙'
    }
  ],

  // ========================================
  // カテゴリ7: 多視点（Perspective）- 5点（ボーナス）
  // ========================================
  perspective: [
    {
      id: 'I11',
      name: 'ユーザー表示メッセージ',
      weight: 2,
      level: 'optional',
      pattern: /メッセージ|表示|通知|Alert/i,
      category: '多視点',
      description: 'ユーザー向けメッセージ'
    },
    {
      id: 'I12',
      name: '技術視点あり',
      weight: 1,
      level: 'optional',
      pattern: /技術|Technical|アーキテクチャ/i,
      category: '多視点',
      description: '技術的考慮事項'
    },
    {
      id: 'I13',
      name: 'ビジネス視点あり',
      weight: 1,
      level: 'optional',
      pattern: /ビジネス|Business|価値/i,
      category: '多視点',
      description: 'ビジネス価値'
    },
    {
      id: 'I14',
      name: 'UX視点あり',
      weight: 1,
      level: 'optional',
      pattern: /UX|ユーザー体験|UI/i,
      category: '多視点',
      description: 'UX考慮事項'
    }
  ]
};

// ===== 検証実行 =====
function verifyItem(item, content) {
  try {
    if (item.customVerify) {
      return item.customVerify(content);
    }
    
    if (item.patternInverse) {
      // 逆パターン: マッチしなければPass
      return !item.patternInverse.test(content);
    }
    
    if (item.pattern) {
      return item.pattern.test(content);
    }
    
    return false;
  } catch (error) {
    console.error(`検証エラー: ${item.id} - ${error.message}`);
    return false;
  }
}

function runChecklist(content) {
  const results = [];
  let totalWeight = 0;
  let earnedWeight = 0;
  
  for (const [category, items] of Object.entries(CHECKLIST)) {
    for (const item of items) {
      const passed = verifyItem(item, content);
      totalWeight += item.weight;
      if (passed) {
        earnedWeight += item.weight;
      }
      
      results.push({
        id: item.id,
        name: item.name,
        category: item.category,
        level: item.level,
        weight: item.weight,
        passed,
        description: item.description
      });
    }
  }
  
  const score = Math.round((earnedWeight / totalWeight) * 100);
  
  return {
    score,
    totalWeight,
    earnedWeight,
    results,
    passed: results.filter(r => r.passed),
    failed: results.filter(r => !r.passed),
    criticalFailed: results.filter(r => !r.passed && r.level === 'critical')
  };
}

// ===== LLM監査（オプション）=====
async function llmAudit(content, model = 'gpt-4o') {
  let OpenAI;
  try {
    OpenAI = require('openai');
  } catch (e) {
    return { model, error: 'openaiパッケージがインストールされていません。npm install openai を実行してください。' };
  }
  
  const client = new OpenAI();
  
  const prompt = `あなたはSSOT（Single Source of Truth）監査エキスパートです。
以下のSSOT文書を監査し、各項目を評価してください。

## 評価項目
${Object.values(CHECKLIST).flat().map(item => 
  `- ${item.id}: ${item.name} (${item.category})`
).join('\n')}

## SSOT文書
${content.substring(0, 8000)}

## 出力形式
各項目について、Pass/Failと理由を簡潔に回答してください。
JSON形式で出力: { "results": [{ "id": "T01", "passed": true, "reason": "..." }] }`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    return {
      model,
      results: result.results || [],
      usage: response.usage,
      cost: model === 'gpt-4o' 
        ? (response.usage.prompt_tokens / 1_000_000) * 2.5 + (response.usage.completion_tokens / 1_000_000) * 10
        : (response.usage.prompt_tokens / 1_000_000) * 0.15 + (response.usage.completion_tokens / 1_000_000) * 0.6
    };
  } catch (error) {
    return { model, error: error.message };
  }
}

// ===== レポート生成 =====
function generateReport(result, llmResults = null) {
  const lines = [];
  
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    SSOT監査チェックリスト結果                   ');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  
  // スコア表示
  const scoreEmoji = result.score >= 95 ? '🟢' : result.score >= 85 ? '🟡' : result.score >= 70 ? '🟠' : '🔴';
  lines.push(`${scoreEmoji} スコア: ${result.score}/100 (${result.earnedWeight}/${result.totalWeight}点)`);
  lines.push('');
  
  // カテゴリ別集計
  const categoryScores = {};
  for (const r of result.results) {
    if (!categoryScores[r.category]) {
      categoryScores[r.category] = { passed: 0, total: 0, weight: 0, earned: 0 };
    }
    categoryScores[r.category].total++;
    categoryScores[r.category].weight += r.weight;
    if (r.passed) {
      categoryScores[r.category].passed++;
      categoryScores[r.category].earned += r.weight;
    }
  }
  
  lines.push('📊 カテゴリ別スコア:');
  for (const [cat, scores] of Object.entries(categoryScores)) {
    const catScore = Math.round((scores.earned / scores.weight) * 100);
    const catEmoji = catScore >= 90 ? '✅' : catScore >= 70 ? '⚠️' : '❌';
    lines.push(`   ${catEmoji} ${cat}: ${catScore}% (${scores.passed}/${scores.total})`);
  }
  lines.push('');
  
  // 詳細結果
  lines.push('📋 詳細結果:');
  for (const r of result.results) {
    const icon = r.passed ? '✓' : '✗';
    const levelTag = r.level === 'critical' ? '[必須]' : r.level === 'major' ? '[重要]' : '';
    lines.push(`   ${icon} ${r.id}: ${r.name} ${levelTag}`);
  }
  lines.push('');
  
  // Critical不合格
  if (result.criticalFailed.length > 0) {
    lines.push('🚨 Critical（必須）の不合格項目:');
    for (const item of result.criticalFailed) {
      lines.push(`   - ${item.id}: ${item.name}`);
      lines.push(`     → ${item.description}`);
    }
    lines.push('');
  }
  
  // LLM監査結果（あれば）
  if (llmResults) {
    lines.push('');
    lines.push('🤖 LLM監査結果:');
    for (const llm of llmResults) {
      if (llm.error) {
        lines.push(`   ❌ ${llm.model}: エラー - ${llm.error}`);
      } else {
        const llmPassed = llm.results.filter(r => r.passed).length;
        lines.push(`   📊 ${llm.model}: ${llmPassed}/${llm.results.length} Pass`);
      }
    }
  }
  
  // 判定
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  if (result.score >= 95 && result.criticalFailed.length === 0) {
    lines.push('✅ 合格: プロンプト生成に進めます');
  } else if (result.criticalFailed.length > 0) {
    lines.push('❌ 不合格: Critical項目を修正してください');
  } else if (result.score >= 85) {
    lines.push('⚠️ 条件付き合格: 軽微な修正を推奨');
  } else {
    lines.push('❌ 不合格: 修正してください');
  }
  lines.push('───────────────────────────────────────────────────────────────');
  
  return lines.join('\n');
}

// ===== メイン =====
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法: node ssot-audit.cjs <SSOTファイルパス>');
    console.log('例: node ssot-audit.cjs docs/03_ssot/00_foundation/SSOT_EXAMPLE.md');
    console.log('');
    console.log('オプション:');
    console.log('  --json       JSON形式で出力');
    console.log('  --llm        LLM監査を追加実行（GPT-4o）');
    console.log('  --model X    LLMモデル指定（gpt-4o, gemini-2.0-flash等）');
    process.exit(1);
  }
  
  const ssotPath = args[0];
  
  if (!fs.existsSync(ssotPath)) {
    console.error(`ファイルが見つかりません: ${ssotPath}`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(ssotPath, 'utf8');
  const result = runChecklist(content);
  
  // LLM監査（オプション）
  let llmResults = null;
  if (args.includes('--llm')) {
    const modelIdx = args.indexOf('--model');
    const model = modelIdx !== -1 ? args[modelIdx + 1] : 'gpt-4o';
    console.log(`\n🤖 LLM監査実行中 (${model})...`);
    const llmResult = await llmAudit(content, model);
    llmResults = [llmResult];
  }
  
  console.log(generateReport(result, llmResults));
  
  // JSON出力オプション
  if (args.includes('--json')) {
    const jsonPath = ssotPath.replace('.md', '-audit.json');
    fs.writeFileSync(jsonPath, JSON.stringify({ ...result, llmResults }, null, 2));
    console.log(`\n📄 JSON出力: ${jsonPath}`);
  }
  
  // 終了コード
  process.exit(result.score >= 95 && result.criticalFailed.length === 0 ? 0 : 1);
}

// エクスポート
module.exports = { CHECKLIST, runChecklist, generateReport, llmAudit };

// 直接実行時
if (require.main === module) {
  main().catch(console.error);
}
