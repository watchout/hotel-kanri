#!/usr/bin/env node
/**
 * 親タスク自動完了チェックスクリプト（GitHub Projects V2 版）
 *
 * 子タスクが全てクローズの場合、親タスクも自動的にクローズ＋Done
 *
 * 命名規則:
 * - 親タスク: [DEV-0160] (末尾が0)
 * - 子タスク: [DEV-0161]〜[DEV-0169] (末尾が1-9)
 *
 * Usage:
 *   node check-parent-completion.cjs [--dry-run]
 */

const ghApi = require('./lib/github-projects-client.cjs');

const DRY_RUN = process.argv.includes('--dry-run');

function main() {
  console.log('🔍 親タスク完了チェックを実行中...');
  if (DRY_RUN) {
    console.log('   (--dry-run: 実際の更新は行いません)\n');
  }
  console.log('');

  try {
    // 全Issue取得（open + closed）
    const allIssues = ghApi.listIssues('all');

    // DEV番号解析
    const withDev = allIssues
      .map(i => ({
        issue: i,
        devNum: (() => {
          const m = i.title.match(/\[DEV-(\d+)\]/);
          return m ? parseInt(m[1], 10) : null;
        })(),
      }))
      .filter(x => x.devNum !== null);

    // 親タスク（末尾が0）を抽出
    const parents = withDev.filter(x => x.devNum % 10 === 0);

    console.log(`📋 親タスク候補: ${parents.length} 件\n`);

    let updatedCount = 0;

    for (const parent of parents) {
      // 既にクローズ済みならスキップ
      if (parent.issue.state === 'closed') continue;

      // 子タスク（親+1 〜 親+9）を検索
      const children = withDev.filter(x =>
        x.devNum > parent.devNum && x.devNum < parent.devNum + 10
      );

      if (children.length === 0) continue;

      const closedChildren = children.filter(c => c.issue.state === 'closed');
      const allClosed = closedChildren.length === children.length;

      const devId = `DEV-${String(parent.devNum).padStart(4, '0')}`;
      console.log(`📦 ${devId}: ${parent.issue.title.substring(0, 60)}`);
      console.log(`   状態: ${parent.issue.state}`);
      console.log(`   子タスク: ${closedChildren.length}/${children.length} 完了`);

      if (allClosed) {
        console.log(`   ✅ 全子タスク完了 → 親をDoneに更新`);

        if (!DRY_RUN) {
          try {
            ghApi.closeIssue(parent.issue.number);
            console.log(`   ✅ Issue #${parent.issue.number} → closed`);

            // Project Status も更新
            try {
              const items = ghApi.listProjectItems(100);
              const item = items.find(it => it.issue?.number === parent.issue.number);
              if (item) {
                ghApi.setItemField(item.itemId, 'Status', 'Done');
                console.log(`   ✅ Project Status → Done`);
              }
            } catch { /* ignore */ }

            updatedCount++;
          } catch (e) {
            console.log(`   ❌ 更新失敗: ${e.message}`);
          }
        } else {
          console.log(`   (dry-run: 更新スキップ)`);
          updatedCount++;
        }
      } else {
        console.log(`   ⏳ 未完了の子タスクあり`);
      }
      console.log('');
    }

    console.log('---');
    console.log(`📊 結果: ${updatedCount} 件の親タスクを${DRY_RUN ? '更新予定' : '更新しました'}`);

  } catch (e) {
    console.error('❌ エラー:', e.message);
    process.exit(1);
  }
}

main();
