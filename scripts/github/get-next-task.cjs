#!/usr/bin/env node
/**
 * 次のタスク取得スクリプト（GitHub Projects V2 版）
 *
 * GitHub Projects のカスタムフィールドを使って次に着手すべきタスクを自動選択
 *
 * 選択基準（優先順位順）:
 * 1. Status = "Backlog"
 * 2. DEV番号昇順（DEV-0180 → DEV-0181 → ...）
 * 3. Phase順（Phase 1 → Phase 2 → Phase 3 → Phase 4）
 *
 * Usage:
 *   node get-next-task.cjs
 */

const ghApi = require('./lib/github-projects-client.cjs');

function main() {
  try {
    console.log('🔍 次のタスクを取得中...\n');

    const config = ghApi.getGitHubConfig();

    // 全 Issue 取得（open のみ = 未完了）
    const issues = ghApi.listIssues('open');

    console.log(`  全 open Issue: ${issues.length} 件`);

    // DEV番号解析 & ソート
    const parsed = issues
      .map(i => {
        const devNumber = ghApi.extractDevNumber(i.title);
        const devNum = devNumber ? parseInt(devNumber.replace('DEV-', ''), 10) : null;
        const phase = ghApi.extractPhase(i.title);
        return { issue: i, devNumber, devNum, phase };
      })
      .filter(x => x.devNum !== null) // DEV番号付きのみ
      .sort((a, b) => a.devNum - b.devNum);

    if (parsed.length === 0) {
      console.log('✅ DEV番号付きのBacklogタスクはありません\n');
      return;
    }

    // 次のタスク
    const next = parsed[0];

    console.log('🎯 次の推奨タスク:\n');
    console.log(`   ID: ${next.devNumber}`);
    console.log(`   Title: ${next.issue.title}`);
    console.log(`   Phase: ${next.phase || 'N/A'}`);
    console.log(`   URL: ${next.issue.html_url}`);
    console.log('');

    // 他の候補
    if (parsed.length > 1) {
      console.log('📋 他の候補タスク（参考）:\n');
      parsed.slice(1, 6).forEach(t => {
        console.log(`   ${t.devNumber}: ${t.issue.title.substring(0, 60)}`);
      });
      console.log('');
    }

    console.log(`📊 残りタスク: ${parsed.length} 件`);

  } catch (err) {
    console.error('❌ エラー:', err.message);
    process.exit(1);
  }
}

main();
