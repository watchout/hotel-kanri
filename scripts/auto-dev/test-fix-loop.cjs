const fs = require('fs');
const { spawnSync } = require('child_process');
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

const OpenAI = require('openai');
const client = new OpenAI();

// テスト用: 既存の完全なSSOTを使用
const SSOT_PATH = path.join(__dirname, '../../docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md');
const PASS_SCORE = 95;
const MAX_RETRIES = 3;

// AI評価（詳細フィードバック付き）- 全カテゴリから修正提案を強制取得
async function evaluateWithAI(content) {
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ 
      role: 'user', 
      content: `SSOTを評価し、**全ての減点カテゴリに対して**具体的な修正方法を報告してください。

## 評価観点（各20点）
1. structure: 構造の明確さ
2. technical: 技術仕様の具体性（API仕様、エラーレスポンス）
3. implementability: 実装可能性（DB設計、データ型）
4. errorHandling: エラー処理の網羅性（400/401/403/404/500）
5. testing: テスト・検証条件（正常系/異常系/エッジケース）

## 重要ルール
- **スコアが20点未満のカテゴリは、必ずfixesに具体的な修正内容を記載**
- fixesは「どこに」「何を」「どう追加するか」を具体的に（例: "## エラー処理セクションに、400 Bad Requestの場合のレスポンス例を追加"）
- 曖昧な表現禁止（"詳細を追加" → "handoff_requestsテーブルのstatus列のENUM定義に、各値の遷移条件を記載"）

## 出力形式（JSON）
{
  "scores": {
    "structure": { "score": 18, "deductions": ["具体的な減点理由"], "fixes": ["修正: どこに何を追加するか具体的に"] },
    "technical": { "score": 17, "deductions": ["具体的な減点理由"], "fixes": ["修正: どこに何を追加するか具体的に"] },
    "implementability": { "score": 16, "deductions": ["具体的な減点理由"], "fixes": ["修正: どこに何を追加するか具体的に"] },
    "errorHandling": { "score": 15, "deductions": ["具体的な減点理由"], "fixes": ["修正: どこに何を追加するか具体的に"] },
    "testing": { "score": 14, "deductions": ["具体的な減点理由"], "fixes": ["修正: どこに何を追加するか具体的に"] }
  },
  "total": 80
}

## SSOT（全文）
${content.substring(0, 15000)}`
    }],
    max_tokens: 3000,
    temperature: 0.2,
    response_format: { type: 'json_object' }
  });
  
  const result = JSON.parse(response.choices[0].message.content);
  
  // 全カテゴリから修正提案を収集
  const allFixes = [];
  for (const [cat, data] of Object.entries(result.scores)) {
    if (data.score < 20 && data.fixes && data.fixes.length > 0) {
      for (const fix of data.fixes) {
        allFixes.push({
          priority: 20 - data.score, // 低スコアほど優先
          section: cat,
          problem: (data.deductions || [])[0] || `${cat}の改善が必要`,
          fix: fix
        });
      }
    }
  }
  
  // 優先度順にソート
  allFixes.sort((a, b) => b.priority - a.priority);
  result.topFixes = allFixes;
  
  return result;
}

// GPT-4oで不足セクションのみ生成し、元ファイルに追記
async function fixWithLLM(fixes, currentContent) {
  // 各カテゴリ別に修正をグループ化
  const byCategory = {};
  for (const f of fixes) {
    if (!byCategory[f.section]) byCategory[f.section] = [];
    byCategory[f.section].push(f);
  }
  
  const fixSections = Object.entries(byCategory).map(([cat, items]) => {
    const catNames = {
      structure: '構造',
      technical: '技術仕様・API',
      implementability: '実装可能性・DB設計',
      errorHandling: 'エラー処理',
      testing: 'テストケース'
    };
    const fixes = items.map((f, i) => `  ${i + 1}. ${f.fix}`).join('\n');
    return `### ${catNames[cat] || cat}\n${fixes}`;
  }).join('\n\n');

  console.log('  GPT-4oで追加セクション生成中...（', Object.keys(byCategory).length, 'カテゴリ）');
  
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ 
        role: 'user', 
        content: `以下の指摘に基づいて、**追加すべきセクションのみ**をMarkdown形式で生成してください。

## 修正指示（カテゴリ別）
${fixSections}

## 生成ルール

1. **既存内容は出力しない** - 追加セクションのみ出力
2. 各セクションは ## または ### で始める
3. 以下のテンプレートを使用:

### エラーレスポンス（追加する場合）
\`\`\`markdown
## エラーレスポンス

| ステータス | エラーコード | 説明 | レスポンス例 |
|:-----------|:-------------|:-----|:-------------|
| 400 | INVALID_REQUEST | リクエストパラメータ不正 | \`{"success": false, "error": {"code": "INVALID_REQUEST", "message": "room_id is required"}}\` |
| 401 | UNAUTHORIZED | 認証エラー | \`{"success": false, "error": {"code": "UNAUTHORIZED", "message": "Session expired"}}\` |
| 403 | FORBIDDEN | 権限不足（他テナントリソースへのアクセス） | \`{"success": false, "error": {"code": "FORBIDDEN", "message": "Access denied to this resource"}}\` |
| 404 | NOT_FOUND | リソース不在 | \`{"success": false, "error": {"code": "NOT_FOUND", "message": "Handoff request not found"}}\` |
| 422 | UNPROCESSABLE_ENTITY | バリデーションエラー | \`{"success": false, "error": {"code": "VALIDATION_ERROR", "message": "status must be one of: pending, in_progress, resolved"}}\` |
| 500 | INTERNAL_ERROR | サーバーエラー | \`{"success": false, "error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}}\` |
\`\`\`

### テストケース（追加する場合）
\`\`\`markdown
## テストケース

### 正常系テスト
| ID | シナリオ | 前提条件 | 入力 | 期待結果 |
|:---|:---------|:---------|:-----|:---------|
| TC-001 | ハンドオフ作成成功 | 認証済みゲスト | POST /api/v1/guest/handoff, body: {room_id: "R001", message: "Help"} | 201, {handoff_id: "...", status: "pending"} |
| TC-002 | ハンドオフ一覧取得 | 認証済みスタッフ | GET /api/v1/admin/handoffs | 200, [{handoff_id, room_id, status, created_at}] |
| TC-003 | ステータス更新 | 認証済みスタッフ | PATCH /api/v1/admin/handoffs/:id, body: {status: "resolved"} | 200, {handoff_id, status: "resolved"} |

### 異常系テスト
| ID | シナリオ | 前提条件 | 入力 | 期待結果 |
|:---|:---------|:---------|:-----|:---------|
| TC-101 | room_id未指定 | 認証済み | POST /api/v1/guest/handoff, body: {message: "Help"} | 400, INVALID_REQUEST |
| TC-102 | 未認証アクセス | 未認証 | GET /api/v1/admin/handoffs | 401, UNAUTHORIZED |
| TC-103 | 他テナントアクセス | 認証済み（テナントA） | GET /api/v1/admin/handoffs/:id (テナントBのID) | 404, NOT_FOUND |
| TC-104 | 存在しないID | 認証済み | GET /api/v1/admin/handoffs/non-existent-id | 404, NOT_FOUND |
| TC-105 | 無効なステータス | 認証済み | PATCH /api/v1/admin/handoffs/:id, body: {status: "invalid"} | 422, VALIDATION_ERROR |

### エッジケーステスト
| ID | シナリオ | 前提条件 | 入力 | 期待結果 |
|:---|:---------|:---------|:-----|:---------|
| TC-201 | 長文メッセージ（1000文字） | 認証済み | message: "a".repeat(1000) | 201成功 または 400（上限超過） |
| TC-202 | 空文字メッセージ | 認証済み | message: "" | 400, INVALID_REQUEST |
| TC-203 | 同時リクエスト | 認証済み | 2件同時POST | 両方201成功（競合なし） |
| TC-204 | 特殊文字含むメッセージ | 認証済み | message: "<script>alert(1)</script>" | 201成功（サニタイズ済み） |
\`\`\`

### DB設計詳細（追加する場合）
\`\`\`markdown
### contextフィールドの詳細スキーマ

\`\`\`typescript
interface HandoffContext {
  device_info: {
    type: "tablet" | "smartphone" | "kiosk";
    os: string;        // 例: "iOS 17.0", "Android 14"
    browser?: string;  // 例: "Safari", "Chrome"
  };
  location: {
    room_id: string;
    floor?: string;    // 例: "3F"
    area?: string;     // 例: "ロビー", "レストラン"
  };
  conversation_history: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: string; // ISO 8601形式
  }>;
  metadata?: {
    language: string;  // 例: "ja", "en", "zh"
    urgency?: "low" | "medium" | "high";
  };
}
\`\`\`
\`\`\`

## 出力形式
追加すべきセクションのみをMarkdownで出力してください。
`
      }],
      max_tokens: 4000,
      temperature: 0.2
    });
    
    const additionalContent = response.choices[0].message.content;
    
    // Markdownコードブロックを除去
    let cleanContent = additionalContent;
    if (cleanContent.startsWith('```markdown')) {
      cleanContent = cleanContent.slice(11);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();
    
    // 元のファイルに追記
    const updatedContent = currentContent + '\n\n---\n\n' + cleanContent;
    fs.writeFileSync(SSOT_PATH, updatedContent);
    console.log('  追記完了: +', cleanContent.length, '文字 → 合計', updatedContent.length, '文字');
    
    return true;
  } catch (error) {
    console.log('  エラー:', error.message);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         AI減点理由を潰す修正ループテスト                       ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('対象:', SSOT_PATH);
  console.log('合格ライン:', PASS_SCORE, '点');
  console.log('');
  
  let retries = 0;
  let content = fs.readFileSync(SSOT_PATH, 'utf8');
  
  while (retries < MAX_RETRIES) {
    console.log(`\n━━━━━ ターン ${retries + 1}/${MAX_RETRIES} ━━━━━`);
    
    // AI評価
    console.log('  AI評価中...');
    const result = await evaluateWithAI(content);
    console.log(`  スコア: ${result.total}/100`);
    
    // 詳細表示
    for (const [cat, data] of Object.entries(result.scores)) {
      if (data.score < 18) {
        console.log(`  ${cat}: ${data.score}/20`);
        for (const d of (data.deductions || []).slice(0, 1)) {
          console.log(`    - ${d.substring(0, 80)}`);
        }
      }
    }
    
    if (result.total >= PASS_SCORE) {
      console.log('\n✅ 合格！スコア:', result.total);
      return;
    }
    
    // 修正提案
    const fixes = result.topFixes || [];
    if (fixes.length === 0) {
      console.log('  修正提案なし');
      // scoresから修正提案を生成
      for (const [cat, data] of Object.entries(result.scores)) {
        if (data.score < 18 && data.fixes) {
          for (const fix of data.fixes) {
            fixes.push({ section: cat, problem: data.deductions?.[0] || cat, fix });
          }
        }
      }
    }
    
    if (fixes.length === 0) {
      console.log('  修正方法不明、終了');
      break;
    }
    
    console.log(`  修正提案: ${fixes.length}件`);
    for (const f of fixes.slice(0, 3)) {
      console.log(`    - [${f.section}] ${(f.problem || '').substring(0, 40)}`);
    }
    
    await fixWithLLM(fixes, content);
    
    // 再読み込み
    content = fs.readFileSync(SSOT_PATH, 'utf8');
    retries++;
    
    console.log('  修正完了、再評価へ...');
  }
  
  // 最終評価
  console.log('\n━━━━━ 最終評価 ━━━━━');
  const finalResult = await evaluateWithAI(content);
  console.log(`最終スコア: ${finalResult.total}/100`);
  
  if (finalResult.total >= PASS_SCORE) {
    console.log('✅ 合格！');
  } else {
    console.log('❌ 合格ラインに到達できませんでした');
    console.log('残り減点:');
    for (const [cat, data] of Object.entries(finalResult.scores)) {
      if (data.score < 20) {
        console.log(`  ${cat}: ${data.score}/20 - ${(data.deductions || [])[0] || ''}`);
      }
    }
  }
}

main().catch(console.error);
