#!/usr/bin/env node
/**
 * SSOT監査スクリプト（ハイブリッド構成）
 * 
 * Cursorで作成したSSOTをGPT-4o-miniで二重監査
 * 
 * 使い方:
 *   node audit-ssot.cjs <SSOTファイルパス>
 *   node audit-ssot.cjs docs/03_ssot/00_foundation/SSOT_EXAMPLE.md
 *   node audit-ssot.cjs docs/03_ssot/00_foundation/SSOT_EXAMPLE.md --model gpt-4o
 * 
 * @version 1.1.0
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

// ===== 設定 =====
const CONFIG = {
  models: {
    auditor1: 'gpt-4o-mini',  // 技術監査
    auditor2: 'gpt-4o-mini'   // 実装可能性監査
  },
  outputDir: path.join(__dirname, '../../evidence/ssot-audit')
};

// ===== チェックリスト =====
const CHECKLIST = {
  technical: [
    { id: 'T01', name: 'テーブル名がsnake_case', category: 'DB設計' },
    { id: 'T02', name: 'カラム名がsnake_case', category: 'DB設計' },
    { id: 'T03', name: 'Prisma @map使用', category: 'DB設計' },
    { id: 'T04', name: 'tenant_idインデックス', category: 'DB設計' },
    { id: 'T05', name: 'リレーション定義', category: 'DB設計' },
    { id: 'T06', name: 'パス形式 /api/v1/admin/', category: 'API設計' },
    { id: 'T07', name: '深いネストなし', category: 'API設計' },
    { id: 'T08', name: 'HTTP Method適切', category: 'API設計' },
    { id: 'T09', name: 'レスポンス形式統一', category: 'API設計' },
    { id: 'T10', name: 'エラーコード定義', category: 'API設計' },
    { id: 'T11', name: 'SessionUser形式', category: '認証' },
    { id: 'T12', name: 'tenant_id必須', category: '認証' },
    { id: 'T13', name: '権限チェック記述', category: '認証' },
    { id: 'T14', name: '認証エラーハンドリング', category: '認証' },
    { id: 'T15', name: 'セキュリティ要件', category: '認証' }
  ],
  implementability: [
    { id: 'I01', name: '要件ID体系（XXX-001）', category: '要件定義' },
    { id: 'I02', name: '全要件にID付与', category: '要件定義' },
    { id: 'I03', name: 'Accept条件明記', category: '要件定義' },
    { id: 'I04', name: 'Accept条件が検証可能', category: '要件定義' },
    { id: 'I05', name: '優先度明記', category: '要件定義' },
    { id: 'I06', name: '実装チェックリストあり', category: 'チェックリスト' },
    { id: 'I07', name: 'Phase分け明確', category: 'チェックリスト' },
    { id: 'I08', name: '各Phase完了条件', category: 'チェックリスト' },
    { id: 'I09', name: 'テストケース定義', category: 'チェックリスト' },
    { id: 'I10', name: 'エラーケース列挙', category: 'エラーハンドリング' },
    { id: 'I11', name: 'ユーザー表示メッセージ', category: 'エラーハンドリング' },
    { id: 'I12', name: '技術視点あり', category: '多視点' },
    { id: 'I13', name: 'ビジネス視点あり', category: '多視点' },
    { id: 'I14', name: 'UX視点あり', category: '多視点' },
    { id: 'I15', name: '変更履歴あり', category: 'ドキュメント' }
  ]
};

// ===== GPT呼び出し =====
async function callGPT(prompt, model = 'gpt-4o-mini') {
  const OpenAI = require('openai');
  const client = new OpenAI();
  
  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4096,
    temperature: 0.3
  });
  
  return {
    content: response.choices[0].message.content,
    usage: response.usage,
    cost: (response.usage.prompt_tokens / 1_000_000) * 0.15 +
          (response.usage.completion_tokens / 1_000_000) * 0.6
  };
}

// ===== 監査プロンプト =====
const PROMPTS = {
  technical: (ssot) => `あなたはSSOT技術監査エキスパートです。
以下のSSOTを技術的な観点から監査してください。

## 対象SSOT
${ssot}

## チェック項目
${CHECKLIST.technical.map(c => `- ${c.id}: ${c.name} (${c.category})`).join('\n')}

## 出力フォーマット（JSON厳守）
{
  "checklist": {
    "T01": { "pass": true, "comment": "" },
    "T02": { "pass": false, "comment": "camelCase使用箇所あり" }
  },
  "issues": [
    {
      "severity": "critical",
      "id": "T02",
      "title": "カラム名命名規則違反",
      "location": "### データベース設計",
      "description": "createdAtはcreated_atにすべき",
      "recommendation": "@map(\"created_at\")を追加"
    }
  ],
  "score": 42,
  "summary": "技術的な品質は概ね良好だが、命名規則に一部問題あり"
}

severity: critical（必須修正）、warning（推奨修正）、info（参考）
scoreは0-50点で評価`,

  implementability: (ssot) => `あなたはSSOT実装可能性監査エキスパートです。
以下のSSOTを実装可能性の観点から監査してください。

## 対象SSOT
${ssot}

## チェック項目
${CHECKLIST.implementability.map(c => `- ${c.id}: ${c.name} (${c.category})`).join('\n')}

## 出力フォーマット（JSON厳守）
{
  "checklist": {
    "I01": { "pass": true, "comment": "" },
    "I02": { "pass": false, "comment": "一部要件にIDなし" }
  },
  "issues": [
    {
      "severity": "critical",
      "id": "I03",
      "title": "Accept条件不足",
      "location": "### FR-003",
      "description": "Accept条件が定義されていない",
      "recommendation": "検証可能なAccept条件を追加"
    }
  ],
  "score": 38,
  "summary": "要件定義は明確だが、一部Accept条件が不足"
}

severity: critical（必須修正）、warning（推奨修正）、info（参考）
scoreは0-50点で評価`
};

// ===== 監査実行 =====
async function auditSSoT(ssotPath) {
  // SSOTファイル読み込み
  if (!fs.existsSync(ssotPath)) {
    console.error(`❌ ファイルが見つかりません: ${ssotPath}`);
    process.exit(1);
  }
  
  const ssotContent = fs.readFileSync(ssotPath, 'utf8');
  const ssotName = path.basename(ssotPath, '.md');
  
  console.log('████████████████████████████████████████████████████████████');
  console.log(`🔍 SSOT監査: ${ssotName}`);
  console.log('████████████████████████████████████████████████████████████');
  console.log(`\n📄 ファイル: ${ssotPath}`);
  console.log(`📏 サイズ: ${ssotContent.length.toLocaleString()}文字`);

  const results = {
    ssotName,
    ssotPath,
    timestamp: new Date().toISOString(),
    audits: {},
    totalScore: 0,
    totalCost: 0,
    issues: { critical: [], warning: [], info: [] }
  };

  // 監査1: 技術的観点
  console.log('\n🔧 監査1: 技術的観点（GPT-4o-mini）...');
  try {
    const tech = await callGPT(PROMPTS.technical(ssotContent), CONFIG.models.auditor1);
    const techResult = parseAuditResult(tech.content);
    results.audits.technical = techResult;
    results.totalCost += tech.cost;
    console.log(`   ✅ 完了 (スコア: ${techResult.score}/50, コスト: $${tech.cost.toFixed(4)})`);
    
    // 指摘事項を分類
    (techResult.issues || []).forEach(issue => {
      results.issues[issue.severity]?.push({ ...issue, audit: 'technical' });
    });
  } catch (error) {
    console.log(`   ⚠️ エラー: ${error.message}`);
    results.audits.technical = { error: error.message, score: 0 };
  }

  // 監査2: 実装可能性
  console.log('\n📋 監査2: 実装可能性（GPT-4o-mini）...');
  try {
    const impl = await callGPT(PROMPTS.implementability(ssotContent), CONFIG.models.auditor2);
    const implResult = parseAuditResult(impl.content);
    results.audits.implementability = implResult;
    results.totalCost += impl.cost;
    console.log(`   ✅ 完了 (スコア: ${implResult.score}/50, コスト: $${impl.cost.toFixed(4)})`);
    
    (implResult.issues || []).forEach(issue => {
      results.issues[issue.severity]?.push({ ...issue, audit: 'implementability' });
    });
  } catch (error) {
    console.log(`   ⚠️ エラー: ${error.message}`);
    results.audits.implementability = { error: error.message, score: 0 };
  }

  // 総合スコア
  results.totalScore = (results.audits.technical?.score || 0) + 
                       (results.audits.implementability?.score || 0);

  // サマリー表示
  console.log('\n');
  console.log('████████████████████████████████████████████████████████████');
  console.log('📊 監査結果サマリー');
  console.log('████████████████████████████████████████████████████████████');
  
  console.log(`\n📈 スコア: ${results.totalScore}/100`);
  console.log(`   技術的正確性: ${results.audits.technical?.score || 0}/50`);
  console.log(`   実装可能性: ${results.audits.implementability?.score || 0}/50`);
  
  console.log(`\n🚨 指摘事項:`);
  console.log(`   Critical: ${results.issues.critical.length}件`);
  console.log(`   Warning: ${results.issues.warning.length}件`);
  console.log(`   Info: ${results.issues.info.length}件`);
  
  console.log(`\n💰 コスト: $${results.totalCost.toFixed(4)}`);

  // Critical指摘を表示
  if (results.issues.critical.length > 0) {
    console.log('\n🔴 Critical（必須修正）:');
    results.issues.critical.forEach((issue, i) => {
      console.log(`   ${i + 1}. [${issue.id}] ${issue.title}`);
      console.log(`      ${issue.description}`);
      console.log(`      → ${issue.recommendation}`);
    });
  }

  // Warning指摘を表示
  if (results.issues.warning.length > 0) {
    console.log('\n🟡 Warning（推奨修正）:');
    results.issues.warning.forEach((issue, i) => {
      console.log(`   ${i + 1}. [${issue.id}] ${issue.title}`);
      console.log(`      → ${issue.recommendation}`);
    });
  }

  // 結果保存
  await saveResult(results, ssotName);

  // レポート生成
  await generateReport(results, ssotName);

  return results;
}

// ===== JSONパース =====
function parseAuditResult(raw) {
  try {
    const jsonMatch = raw.match(/```json\n?([\s\S]*?)\n?```/) || 
                      raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }
    return { score: 0, issues: [], error: 'JSON not found' };
  } catch (error) {
    return { score: 0, issues: [], error: error.message };
  }
}

// ===== 結果保存 =====
async function saveResult(results, ssotName) {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${ssotName}-${timestamp}.json`;
  const filepath = path.join(CONFIG.outputDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`\n💾 結果保存: ${filepath}`);
}

// ===== レポート生成 =====
async function generateReport(results, ssotName) {
  const reportPath = path.join(CONFIG.outputDir, `${ssotName}-AUDIT-REPORT.md`);
  
  const report = `# SSOT監査レポート: ${ssotName}

**監査日時**: ${new Date().toLocaleString('ja-JP')}  
**対象ファイル**: ${results.ssotPath}  
**総合スコア**: **${results.totalScore}/100**

---

## 📊 スコア内訳

| カテゴリ | スコア | 判定 |
|:---------|:-------|:-----|
| 技術的正確性 | ${results.audits.technical?.score || 0}/50 | ${getGrade(results.audits.technical?.score || 0, 50)} |
| 実装可能性 | ${results.audits.implementability?.score || 0}/50 | ${getGrade(results.audits.implementability?.score || 0, 50)} |
| **合計** | **${results.totalScore}/100** | **${getGrade(results.totalScore, 100)}** |

---

## 🚨 指摘事項

### 🔴 Critical（${results.issues.critical.length}件）- 必須修正

${results.issues.critical.length === 0 ? 'なし' : results.issues.critical.map((issue, i) => `
#### ${i + 1}. [${issue.id}] ${issue.title}
- **場所**: ${issue.location || '-'}
- **問題**: ${issue.description}
- **推奨**: ${issue.recommendation}
`).join('\n')}

### 🟡 Warning（${results.issues.warning.length}件）- 推奨修正

${results.issues.warning.length === 0 ? 'なし' : results.issues.warning.map((issue, i) => `
${i + 1}. [${issue.id}] ${issue.title}: ${issue.recommendation}
`).join('\n')}

### 🟢 Info（${results.issues.info.length}件）- 参考

${results.issues.info.length === 0 ? 'なし' : results.issues.info.map((issue, i) => `
${i + 1}. [${issue.id}] ${issue.title}
`).join('\n')}

---

## ✅ 次のアクション

${results.issues.critical.length > 0 ? `
1. **Critical指摘を修正**（${results.issues.critical.length}件）
   - Cursorで指摘箇所を修正
   - 再度監査を実行
` : ''}
${results.issues.warning.length > 0 ? `
2. **Warning指摘を検討**（${results.issues.warning.length}件）
   - 可能な限り対応
` : ''}
${results.totalScore >= 80 ? `
✅ スコア80点以上のため、プロンプト生成に進めます。
` : `
⚠️ スコア80点未満のため、修正を推奨します。
`}

---

## 💰 コスト

| 項目 | コスト |
|:-----|:-------|
| 技術監査（GPT-4o-mini） | $${(results.totalCost / 2).toFixed(4)} |
| 実装可能性監査（GPT-4o-mini） | $${(results.totalCost / 2).toFixed(4)} |
| **合計** | **$${results.totalCost.toFixed(4)}** |

---

*このレポートは自動生成されました。*
`;

  fs.writeFileSync(reportPath, report);
  console.log(`📄 レポート生成: ${reportPath}`);
}

function getGrade(score, max) {
  const percent = (score / max) * 100;
  if (percent >= 90) return '✅ 優秀';
  if (percent >= 80) return '✅ 良好';
  if (percent >= 60) return '🟡 要改善';
  return '🔴 要修正';
}

// ===== メイン =====
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使い方: node audit-ssot.cjs <SSOTファイルパス> [--model <model>]');
    console.log('例: node audit-ssot.cjs docs/03_ssot/00_foundation/SSOT_EXAMPLE.md');
    console.log('例: node audit-ssot.cjs docs/03_ssot/00_foundation/SSOT_EXAMPLE.md --model gpt-4o');
    process.exit(1);
  }

  const ssotPath = path.resolve(args[0]);
  
  // モデル引数解析
  const modelIdx = args.indexOf('--model');
  if (modelIdx !== -1 && args[modelIdx + 1]) {
    const model = args[modelIdx + 1];
    CONFIG.models.auditor1 = model;
    CONFIG.models.auditor2 = model;
    console.log(`📋 監査モデル: ${model}`);
  }
  
  await auditSSoT(ssotPath);
}

main().catch(console.error);
