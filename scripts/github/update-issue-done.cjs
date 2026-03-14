#!/usr/bin/env node
/**
 * Issue を Done に更新するスクリプト（GitHub Projects V2 版）
 *
 * GitHub Issue をクローズし、Project の Status を "Done" に設定
 *
 * Usage:
 *   node update-issue-done.cjs DEV-0181 DEV-0210 DEV-0190
 */

const ghApi = require('./lib/github-projects-client.cjs');

function main() {
  const devIds = process.argv.slice(2).filter(a => /^DEV-\d+$/i.test(a));

  if (devIds.length === 0) {
    console.log('Usage: node update-issue-done.cjs DEV-0181 DEV-0210 DEV-0190');
    process.exit(1);
  }

  try {
    const config = ghApi.getGitHubConfig();
    const issues = ghApi.listIssues('open');

    for (const devId of devIds) {
      const issue = issues.find(i => i.title.includes(`[${devId}]`));

      if (!issue) {
        console.log(`❌ ${devId} が見つかりません（既にクローズ済み？）`);
        continue;
      }

      console.log(`📌 ${devId}: ${issue.title}`);
      console.log(`   Issue: #${issue.number} (${issue.state})`);

      // Issue をクローズ
      ghApi.closeIssue(issue.number);
      console.log(`   ✅ Issue #${issue.number} → closed`);

      // Project の Status を "Done" に設定
      try {
        const items = ghApi.listProjectItems(100);
        const item = items.find(it => it.issue?.number === issue.number);
        if (item) {
          ghApi.setItemField(item.itemId, 'Status', 'Done');
          console.log(`   ✅ Project Status → Done`);
        }
      } catch (e) {
        console.log(`   ⚠️ Project Status 更新失敗: ${e.message}`);
      }

      console.log('');
    }
  } catch (err) {
    console.error('❌ エラー:', err.message);
    process.exit(1);
  }
}

main();
