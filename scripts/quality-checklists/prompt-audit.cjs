#!/usr/bin/env node
/**
 * プロンプト監査チェックリスト
 * 
 * 実装AIに渡すプロンプトの品質を検証
 * ハッカソンノウハウ: 明確な指示 = 明確な成果物
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ===== チェックリスト定義 =====
const CHECKLIST = {
  // ========================================
  // カテゴリ1: 構造（Structure）- 25点
  // ========================================
  structure: [
    {
      id: 'P01',
      name: 'Item/Step階層構造',
      weight: 10,
      level: 'critical',
      verify: 'regex',
      pattern: /Item\s*\d+[\s\S]*Step\s*\d+|##\s*Item\s*\d+/im,
      description: '明確な階層構造（Item > Step）',
      failMessage: 'Item/Step構造がありません。階層的に指示を分割してください。'
    },
    {
      id: 'P02',
      name: '事前調査Item',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /事前調査|調査|確認.*Item|Item.*調査|Phase\s*0|Item\s*0/i,
      description: '実装前の調査ステップ',
      failMessage: '事前調査ステップがありません。'
    },
    {
      id: 'P03',
      name: '複数の実装Item',
      weight: 5,
      level: 'major',
      verify: 'custom',
      customVerify: (content) => {
        const items = content.match(/Item\s*\d+/gi) || [];
        return items.length >= 3;
      },
      description: '3つ以上の実装ステップ',
      failMessage: 'Itemが3つ未満です。'
    },
    {
      id: 'P04',
      name: 'テスト/検証Item',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /テスト|検証|確認.*Item|Item.*テスト|Item.*検証/i,
      description: 'テスト・検証ステップ',
      failMessage: 'テスト/検証ステップがありません。'
    }
  ],

  // ========================================
  // カテゴリ2: ツール指示（Tools）- 25点
  // ========================================
  tools: [
    {
      id: 'P05',
      name: 'bashコマンド例',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /```bash[\s\S]*?```/,
      description: '実行すべきコマンドの具体例',
      failMessage: 'bashコマンド例がありません。'
    },
    {
      id: 'P06',
      name: '具体的ファイルパス',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /\/Users\/|src\/|server\/|\.ts|\.vue|\.cjs/,
      description: '操作対象の具体的なパス',
      failMessage: '具体的なファイルパスがありません。'
    },
    {
      id: 'P07',
      name: 'ファイル操作指示',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /read_file|write|search_replace|cat\s+|vim\s+|code\s+/i,
      description: 'ファイル読み書きの指示',
      failMessage: 'ファイル操作指示がありません。'
    },
    {
      id: 'P08',
      name: 'curl/APIテスト指示',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /curl\s+-|fetch\(|API.*テスト|http:\/\/localhost/i,
      description: 'API動作確認のコマンド',
      failMessage: 'APIテスト指示がありません。'
    },
    {
      id: 'P09',
      name: '検証コマンド',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /npm\s+run\s+|npx\s+|node\s+|bash\s+scripts\//,
      description: 'ビルド・テストコマンド',
      failMessage: '検証コマンドがありません。'
    }
  ],

  // ========================================
  // カテゴリ3: チェックリスト（Checklist）- 20点
  // ========================================
  checklist: [
    {
      id: 'P10',
      name: '各Itemにチェックリスト',
      weight: 10,
      level: 'critical',
      verify: 'custom',
      customVerify: (content) => {
        const checkboxes = content.match(/\[\s*\]|\[x\]/gi) || [];
        return checkboxes.length >= 5;
      },
      description: '確認項目のチェックボックス（5個以上）',
      failMessage: 'チェックリスト（[ ]）が5個未満です。'
    },
    {
      id: 'P11',
      name: '完了報告フォーマット',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /完了報告|報告フォーマット|##.*報告|Evidence/i,
      description: '完了時の報告テンプレート',
      failMessage: '完了報告フォーマットがありません。'
    },
    {
      id: 'P12',
      name: 'Evidence取得指示',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /Evidence|証跡|ログ保存|スクリーンショット/i,
      description: '証跡取得の指示',
      failMessage: 'Evidence取得指示がありません。'
    }
  ],

  // ========================================
  // カテゴリ4: ガードレール（Guardrails）- 20点
  // ========================================
  guardrails: [
    {
      id: 'P13',
      name: 'SSOT参照明示',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /SSOT|docs\/03_ssot|Single Source of Truth/i,
      description: '参照すべきSSOTの明示',
      failMessage: 'SSOT参照がありません。'
    },
    {
      id: 'P14',
      name: '不可侵ルール',
      weight: 5,
      level: 'critical',
      verify: 'regex',
      pattern: /禁止|絶対禁止|CRITICAL|不可侵|やってはいけない/i,
      description: '絶対に守るべきルール',
      failMessage: '不可侵ルールがありません。'
    },
    {
      id: 'P15',
      name: 'エラー対処フロー',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /エラー.*場合|失敗.*場合|対処|トラブルシューティング/i,
      description: 'エラー発生時の対応手順',
      failMessage: 'エラー対処フローがありません。'
    },
    {
      id: 'P16',
      name: '実装中断基準',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /中断|停止|ユーザー.*確認|承認.*待/i,
      description: '実装を止めるべき条件',
      failMessage: '実装中断基準がありません。'
    }
  ],

  // ========================================
  // カテゴリ5: PR/最終（PR）- 10点
  // ========================================
  pr: [
    {
      id: 'P17',
      name: 'PRテンプレート',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /PR|Pull Request|gh\s+pr\s+create/i,
      description: 'PR作成の指示',
      failMessage: 'PRテンプレートがありません。'
    },
    {
      id: 'P18',
      name: 'コミットメッセージ指示',
      weight: 5,
      level: 'major',
      verify: 'regex',
      pattern: /git\s+commit|コミット.*メッセージ|feat:|fix:/i,
      description: 'コミットメッセージの形式',
      failMessage: 'コミットメッセージ指示がありません。'
    }
  ],

  // ========================================
  // カテゴリ6: 品質向上（Quality）- ボーナス10点
  // ========================================
  quality: [
    {
      id: 'P19',
      name: 'タイムボックス',
      weight: 3,
      level: 'optional',
      verify: 'regex',
      pattern: /\d+分|時間|タイムアウト|制限時間/,
      description: '各ステップの時間目安',
      failMessage: 'タイムボックスがありません。'
    },
    {
      id: 'P20',
      name: '成功例/失敗例',
      weight: 4,
      level: 'optional',
      verify: 'regex',
      pattern: /成功例|失敗例|✅.*✗|Good.*Bad|正しい.*間違い/i,
      description: '具体的な例示',
      failMessage: '成功例/失敗例がありません。'
    },
    {
      id: 'P21',
      name: '依存関係明示',
      weight: 3,
      level: 'optional',
      verify: 'regex',
      pattern: /依存|前提|事前に|〜の後に|〜が完了してから/i,
      description: 'ステップ間の依存関係',
      failMessage: '依存関係が明示されていません。'
    }
  ]
};

// ===== 検証実行 =====
function verifyItem(item, content) {
  try {
    if (item.verify === 'regex') {
      return item.pattern.test(content);
    } else if (item.verify === 'custom') {
      return item.customVerify(content);
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
        category,
        level: item.level,
        weight: item.weight,
        passed,
        message: passed ? '✅ Pass' : `❌ ${item.failMessage}`
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

// ===== レポート生成 =====
function generateReport(result) {
  const lines = [];
  
  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    プロンプト監査チェックリスト結果              ');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  
  // スコア表示
  const scoreEmoji = result.score >= 85 ? '🟢' : result.score >= 70 ? '🟡' : result.score >= 50 ? '🟠' : '🔴';
  lines.push(`${scoreEmoji} スコア: ${result.score}/100 (${result.earnedWeight}/${result.totalWeight}点)`);
  lines.push('');
  
  // カテゴリ別結果
  const categories = {
    structure: '構造',
    tools: 'ツール指示',
    checklist: 'チェックリスト',
    guardrails: 'ガードレール',
    pr: 'PR/最終',
    quality: '品質向上'
  };
  
  for (const [cat, label] of Object.entries(categories)) {
    const catResults = result.results.filter(r => r.category === cat);
    const catPassed = catResults.filter(r => r.passed).length;
    const catTotal = catResults.length;
    const catEmoji = catPassed === catTotal ? '✅' : catPassed >= catTotal * 0.5 ? '⚠️' : '❌';
    
    lines.push(`${catEmoji} ${label}: ${catPassed}/${catTotal}`);
    
    for (const item of catResults) {
      const icon = item.passed ? '  ✓' : '  ✗';
      const levelTag = item.level === 'critical' ? '[必須]' : item.level === 'major' ? '[重要]' : '';
      lines.push(`   ${icon} ${item.id}: ${item.name} ${levelTag}`);
    }
    lines.push('');
  }
  
  // 不合格項目
  if (result.criticalFailed.length > 0) {
    lines.push('');
    lines.push('🚨 Critical（必須）の不合格項目:');
    for (const item of result.criticalFailed) {
      lines.push(`   - ${item.id}: ${item.name}`);
      lines.push(`     → ${item.message}`);
    }
  }
  
  // 自動補完提案
  if (result.failed.length > 0) {
    lines.push('');
    lines.push('💡 自動補完可能な項目:');
    const autoFixable = result.failed.filter(f => 
      ['P05', 'P08', 'P10', 'P11', 'P12', 'P17'].includes(f.id)
    );
    for (const item of autoFixable) {
      lines.push(`   - ${item.id}: ${item.name}`);
    }
  }
  
  // 判定
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  if (result.score >= 85 && result.criticalFailed.length === 0) {
    lines.push('✅ 合格: 実装AIに渡せます');
  } else if (result.criticalFailed.length > 0) {
    lines.push('❌ 不合格: Critical項目を修正してください');
  } else if (result.score >= 70) {
    lines.push('⚠️ 条件付き合格: 軽微な修正を推奨');
  } else {
    lines.push('❌ 不合格: 修正してください');
  }
  lines.push('───────────────────────────────────────────────────────────────');
  
  return lines.join('\n');
}

// ===== 自動補完 =====
function autoComplete(content, failedItems) {
  let enhanced = content;
  
  for (const item of failedItems) {
    switch (item.id) {
      case 'P05': // bashコマンド例
        enhanced += `

## 実行コマンド例

\`\`\`bash
# サーバー起動確認
curl -s http://localhost:3401/health | jq .

# ログイン
curl -s -c /tmp/cookies.txt -X POST http://localhost:3101/api/v1/admin/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"owner@test.omotenasuai.com","password":"owner123"}' | jq .
\`\`\`
`;
        break;
        
      case 'P10': // チェックリスト
        enhanced += `

## チェックリスト

- [ ] SSOTを読了した
- [ ] 既存実装を確認した
- [ ] 実装完了した
- [ ] テストを実行した
- [ ] エラーがないことを確認した
`;
        break;
        
      case 'P11': // 完了報告
        enhanced += `

## 完了報告フォーマット

\`\`\`markdown
## 完了報告

### 実装内容
- 

### Evidence
- 実行ログ: 
- スクリーンショット: 

### テスト結果
- [ ] 全テストPass
\`\`\`
`;
        break;
        
      case 'P12': // Evidence
        enhanced += `

## Evidence取得指示

1. 実行コマンドと出力をコピー
2. 終了コードを記録 (\`echo $?\`)
3. git statusの結果を保存
4. PRに貼り付け
`;
        break;
    }
  }
  
  return enhanced;
}

// ===== メイン =====
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法: node prompt-audit.cjs <プロンプトファイルパス>');
    console.log('例: node prompt-audit.cjs prompts/generated/DEV-0170.md');
    console.log('');
    console.log('オプション:');
    console.log('  --json       JSON形式で出力');
    console.log('  --fix        不足項目を自動補完');
    process.exit(1);
  }
  
  const promptPath = args[0];
  
  if (!fs.existsSync(promptPath)) {
    console.error(`ファイルが見つかりません: ${promptPath}`);
    process.exit(1);
  }
  
  let content = fs.readFileSync(promptPath, 'utf8');
  const result = runChecklist(content);
  
  console.log(generateReport(result));
  
  // 自動補完オプション
  if (args.includes('--fix') && result.failed.length > 0) {
    const enhanced = autoComplete(content, result.failed);
    const fixedPath = promptPath.replace('.md', '-fixed.md');
    fs.writeFileSync(fixedPath, enhanced);
    console.log(`\n🔧 自動補完版を出力: ${fixedPath}`);
  }
  
  // JSON出力オプション
  if (args.includes('--json')) {
    const jsonPath = promptPath.replace('.md', '-audit.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 JSON出力: ${jsonPath}`);
  }
  
  // 終了コード
  process.exit(result.score >= 85 && result.criticalFailed.length === 0 ? 0 : 1);
}

// ===== LLM監査（オプション）=====
async function llmAuditPrompt(content, model = 'gpt-4o') {
  let OpenAI;
  try {
    OpenAI = require('openai');
  } catch (e) {
    return { model, error: 'openaiパッケージがインストールされていません。' };
  }
  
  const client = new OpenAI();
  
  const prompt = `あなたは実装プロンプト監査エキスパートです。
以下のプロンプトを監査し、各項目を評価してください。

## 評価項目
1. 構造が明確か（Item/Step階層）
2. 具体的なコマンド・ファイルパスがあるか
3. チェックリスト（[ ]形式）があるか
4. エラー対処フローがあるか
5. SSOT参照があるか
6. 不可侵ルール（禁止事項）があるか
7. PRテンプレートがあるか
8. 曖昧な表現（「適切に」「よしなに」等）がないか

## プロンプト
${content.substring(0, 6000)}

## 出力形式
JSON形式で出力:
{
  "score": 0-100,
  "issues": ["問題1", "問題2"],
  "suggestions": ["提案1", "提案2"]
}`;

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });
    
    const result = JSON.parse(response.choices[0].message.content);
    return {
      model,
      score: result.score || 0,
      issues: result.issues || [],
      suggestions: result.suggestions || [],
      usage: response.usage,
      cost: model === 'gpt-4o' 
        ? (response.usage.prompt_tokens / 1_000_000) * 2.5 + (response.usage.completion_tokens / 1_000_000) * 10
        : (response.usage.prompt_tokens / 1_000_000) * 0.15 + (response.usage.completion_tokens / 1_000_000) * 0.6
    };
  } catch (error) {
    return { model, error: error.message };
  }
}

// ===== マルチLLMプロンプト監査 =====
async function multiLLMAuditPrompt(content) {
  // regex監査
  const regexResult = runChecklist(content);
  
  // LLM監査（GPT-4o）
  let llmResult = null;
  try {
    llmResult = await llmAuditPrompt(content, 'gpt-4o');
  } catch (e) {
    // LLMが使えない場合はregexのみ
  }
  
  // スコア統合（AND合成: 両方のスコアの低い方）
  const regexScore = regexResult.score;
  const llmScore = llmResult?.score || regexScore;
  const andScore = Math.min(regexScore, llmScore);
  
  return {
    andScore,
    regexResult,
    llmResult,
    issues: llmResult?.issues || [],
    suggestions: llmResult?.suggestions || []
  };
}

// エクスポート
module.exports = { CHECKLIST, runChecklist, generateReport, autoComplete, llmAuditPrompt, multiLLMAuditPrompt };

// 直接実行時
if (require.main === module) {
  main().catch(console.error);
}
