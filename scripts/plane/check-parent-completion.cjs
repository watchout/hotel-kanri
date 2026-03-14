#!/usr/bin/env node
/**
 * 親タスク自動完了チェックスクリプト
 * 
 * 子タスクが全て完了した場合、親タスクを自動的にDoneに更新する
 * 
 * 命名規則:
 * - 親タスク: [DEV-0160] ... (末尾が0)
 * - 子タスク: [DEV-0161], [DEV-0162], ... [DEV-0169] (末尾が1-9)
 * 
 * 使用方法:
 *   node check-parent-completion.cjs [--dry-run]
 */

const planeApi = require('./lib/plane-api-client.cjs');

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  console.log('🔍 親タスク完了チェックを実行中...');
  if (DRY_RUN) {
    console.log('   (--dry-run: 実際の更新は行いません)\n');
  }
  console.log('');

  try {
    // States を取得
    const statesRes = await planeApi.getStates();
    const states = statesRes.results || [];
    const doneState = states.find(s => s.name === 'Done');
    
    if (!doneState) {
      console.error('❌ Done state が見つかりません');
      process.exit(1);
    }

    // 全タスクを取得
    const res = await planeApi.request('GET', 
      '/api/v1/workspaces/co/projects/7e187231-3f93-44cd-9892-a9322ebd4312/issues/?per_page=500&expand=state');
    const issues = res.results || [];

    // DEV番号を抽出する関数
    const extractDevNumber = (name) => {
      const match = name?.match(/\[DEV-(\d+)\]/);
      return match ? parseInt(match[1]) : null;
    };

    // 親タスク（末尾が0）を抽出
    const parentTasks = issues.filter(i => {
      const devNum = extractDevNumber(i.name);
      return devNum !== null && devNum % 10 === 0;
    });

    // state名を取得するヘルパー関数
    const getStateName = (issue) => {
      if (typeof issue.state === 'object' && issue.state?.name) {
        return issue.state.name;
      }
      return '不明';
    };

    console.log(`📋 親タスク候補: ${parentTasks.length}件\n`);

    let updatedCount = 0;

    for (const parent of parentTasks) {
      const parentDevNum = extractDevNumber(parent.name);
      const parentStateName = getStateName(parent);

      // 既にDoneなら スキップ
      if (parentStateName === 'Done') {
        continue;
      }

      // 子タスク（親+1 〜 親+9）を検索
      const childTasks = issues.filter(i => {
        const devNum = extractDevNumber(i.name);
        return devNum !== null && 
               devNum > parentDevNum && 
               devNum < parentDevNum + 10;
      });

      if (childTasks.length === 0) {
        // 子タスクがない親はスキップ
        continue;
      }

      // 子タスクが全てDoneか確認
      const allChildrenDone = childTasks.every(c => 
        getStateName(c) === 'Done'
      );

      const doneChildren = childTasks.filter(c => getStateName(c) === 'Done').length;

      console.log(`📦 DEV-${String(parentDevNum).padStart(4, '0')}: ${parent.name?.slice(0, 50)}`);
      console.log(`   状態: ${parentStateName}`);
      console.log(`   子タスク: ${doneChildren}/${childTasks.length} 完了`);

      if (allChildrenDone) {
        console.log(`   ✅ 全子タスク完了 → 親をDoneに更新`);
        
        if (!DRY_RUN) {
          try {
            await planeApi.request('PATCH',
              `/api/v1/workspaces/co/projects/7e187231-3f93-44cd-9892-a9322ebd4312/issues/${parent.id}/`,
              { state: doneState.id }
            );
            console.log(`   ✅ 更新完了`);
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
    console.log(`📊 結果: ${updatedCount}件の親タスクを${DRY_RUN ? '更新予定' : '更新しました'}`);

  } catch (e) {
    console.error('❌ エラー:', e.message);
    process.exit(1);
  }
}

main();
