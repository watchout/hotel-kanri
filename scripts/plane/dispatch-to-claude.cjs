#!/usr/bin/env node
/**
 * dispatch-to-claude.cjs
 * 
 * Planeタスクを GitHub Issue として作成し、Claude Code に自動実装を依頼する
 * 
 * 使い方:
 *   node scripts/plane/dispatch-to-claude.cjs DEV-0170
 *   node scripts/plane/dispatch-to-claude.cjs DEV-0170 --fix    # バグ修正モード
 *   node scripts/plane/dispatch-to-claude.cjs DEV-0170 --dry-run # ドライラン
 * 
 * 前提:
 *   - gh CLI がインストール済み
 *   - GitHub認証済み（gh auth login）
 *   - Plane API接続可能（.env.mcp設定済み）
 */

const { execSync } = require('child_process');
const path = require('path');

// Plane API Client
const planeApiPath = path.join(__dirname, 'lib', 'plane-api-client.cjs');
const planeApi = require(planeApiPath);

// ─────────────────────────────────────────────
// 引数パース
// ─────────────────────────────────────────────
const args = process.argv.slice(2);
const taskId = args.find(a => !a.startsWith('--'));
const isFix = args.includes('--fix');
const isDryRun = args.includes('--dry-run');
const repo = 'watchout/hotel-kanri';

if (!taskId) {
  console.error('❌ タスクIDを指定してください');
  console.error('   使い方: node dispatch-to-claude.cjs DEV-0170');
  console.error('   オプション:');
  console.error('     --fix      バグ修正モード');
  console.error('     --dry-run  ドライラン（実際には作成しない）');
  process.exit(1);
}

// ─────────────────────────────────────────────
// メイン処理
// ─────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 Plane タスク ${taskId} を取得中...\n`);

  // 1. Planeからタスク情報を取得
  let issue;
  try {
    issue = await planeApi.getIssue(taskId);
  } catch (err) {
    console.error(`❌ タスク ${taskId} の取得に失敗しました:`, err.message);
    process.exit(1);
  }

  const taskName = issue.name || issue.title || taskId;
  const taskDesc = issue.description_stripped || issue.description || '';
  
  // 2. SSOTパスを抽出（Description内の docs/03_ssot/ パスを検索）
  const ssotMatch = taskDesc.match(/docs\/03_ssot\/[^\s)]+\.md/);
  const ssotPath = ssotMatch ? ssotMatch[0] : '（Issueで指定してください）';

  // 3. 対象リポジトリを推定
  let targetRepo = 'both（API + UI）';
  const descLower = taskDesc.toLowerCase();
  if (descLower.includes('hotel-common') && !descLower.includes('hotel-saas')) {
    targetRepo = 'hotel-common-rebuild（API実装）';
  } else if (descLower.includes('hotel-saas') && !descLower.includes('hotel-common')) {
    targetRepo = 'hotel-saas-rebuild（UI実装）';
  }

  // 4. ラベル決定
  const label = isFix ? 'claude-fix' : 'claude-implement';
  const prefix = isFix ? '[FIX]' : '[IMPL]';

  // 5. Issue本文を構成
  const issueTitle = `${prefix} ${taskId}: ${taskName}`;
  const issueBody = `## Claude Code 自動${isFix ? 'バグ修正' : '実装'}依頼

@claude 以下のタスクを${isFix ? '修正' : '実装'}してください。

### タスク情報
- **Plane タスクID**: ${taskId}
- **タスク名**: ${taskName}
- **参照SSOT**: ${ssotPath}
- **対象リポジトリ**: ${targetRepo}

### Plane タスク詳細
${taskDesc || '（説明なし）'}

### 実装要件
${isFix ? `
- バグの原因を特定し修正してください
- 関連するテストがあれば修正・追加してください
` : `
- SSOTの要件を100%実装してください
- Accept条件を全て満たしてください
- テストを追加してください
`}

### Accept条件
- [ ] SSOT準拠
- [ ] 禁止パターン未検出
- [ ] TypeScript型チェック通過
- [ ] テスト通過
- [ ] PR作成完了
`;

  // 6. 確認表示
  console.log('─'.repeat(60));
  console.log(`📋 タイトル: ${issueTitle}`);
  console.log(`🏷️  ラベル: ${label}`);
  console.log(`📄 SSOT: ${ssotPath}`);
  console.log(`🎯 対象: ${targetRepo}`);
  console.log('─'.repeat(60));
  console.log('\n📝 Issue本文:');
  console.log(issueBody);
  console.log('─'.repeat(60));

  if (isDryRun) {
    console.log('\n🏃 ドライラン: Issue は作成されませんでした');
    return;
  }

  // 7. GitHub Issue作成
  console.log('\n📤 GitHub Issue を作成中...');
  try {
    // ラベルが存在しない場合は作成
    try {
      execSync(`gh label create "${label}" --repo ${repo} --color 7057ff --description "Claude Code ${isFix ? 'バグ修正' : '自動実装'}依頼" 2>/dev/null`, { stdio: 'pipe' });
    } catch {
      // ラベルが既に存在する場合はスキップ
    }

    const result = execSync(
      `gh issue create --repo ${repo} --title "${issueTitle.replace(/"/g, '\\"')}" --label "${label}" --body "$(cat <<'ISSUE_BODY_EOF'
${issueBody}
ISSUE_BODY_EOF
)"`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );

    console.log(`\n✅ Issue 作成完了: ${result.trim()}`);
    console.log(`\n🤖 Claude Code が自動的に実装を開始します（1-2分後）`);
  } catch (err) {
    console.error('❌ Issue作成に失敗しました:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
