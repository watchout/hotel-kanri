#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

// ロードマップの順序（SSOT_PROGRESS_MASTER.mdから）
const ROADMAP_ORDER = [
  // Phase 1 Week 1
  { order: 1, title: '[SSOT作成] SSOT_SAAS_PERMISSION_SYSTEM', phase: 'Phase 1 Week 1', priority: 1 },
  { order: 1.5, title: '[SSOT作成] SSOT_SAAS_STAFF_MANAGEMENT', phase: 'Phase 1 Week 1', priority: 1 },
  { order: 2, title: '[SSOT作成] SSOT_SAAS_MULTITENANT', phase: 'Phase 1 Week 1', priority: 1 },
  { order: 3, title: '[SSOT作成] SSOT_SAAS_MEDIA_MANAGEMENT', phase: 'Phase 1 Week 1', priority: 1 },
  { order: 4, title: '[hotel-common実装] SSOT_SAAS_MEDIA_MANAGEMENT', phase: 'Phase 1 Week 1', priority: 2 },
  
  // Phase 1 Week 2
  { order: 5, title: '[SSOT作成] SSOT_SAAS_ORDER_MANAGEMENT', phase: 'Phase 1 Week 2', priority: 1 },
  { order: 6, title: '[SSOT作成] SSOT_SAAS_MENU_MANAGEMENT', phase: 'Phase 1 Week 2', priority: 1 },
  { order: 7, title: '[SSOT作成] SSOT_SAAS_ROOM_MANAGEMENT', phase: 'Phase 1 Week 2', priority: 1 },
  { order: 8, title: '[SSOT作成] SSOT_SAAS_EMAIL_SYSTEM', phase: 'Phase 1 Week 2', priority: 1 },
  { order: 9, title: '[hotel-common実装] SSOT_SAAS_EMAIL_SYSTEM', phase: 'Phase 1 Week 2', priority: 2 },
];

async function main() {
  console.log('🔍 ロードマップとLinearの同期状況を確認中...\n');
  
  // Linearから全Issue取得
  const issues = await client.issues();
  
  const linearIssues = [];
  for await (const issue of issues.nodes) {
    linearIssues.push({
      identifier: issue.identifier,
      title: issue.title,
      priority: issue.priority || 0,
      state: issue.state?.name || 'Backlog',
    });
  }
  
  console.log(`📊 Linear Issues: ${linearIssues.length}件\n`);
  
  // ロードマップとの比較
  console.log('【ロードマップ vs Linear 比較】\n');
  
  let matchCount = 0;
  let mismatchCount = 0;
  
  ROADMAP_ORDER.forEach(roadmapTask => {
    const linearIssue = linearIssues.find(issue => issue.title === roadmapTask.title);
    
    if (!linearIssue) {
      console.log(`❌ Linear未登録: [順位${roadmapTask.order}] ${roadmapTask.title}`);
      mismatchCount++;
    } else {
      const priorityMatch = linearIssue.priority === roadmapTask.priority;
      const icon = priorityMatch ? '✅' : '⚠️';
      
      console.log(`${icon} [順位${roadmapTask.order}] ${roadmapTask.title}`);
      console.log(`   ロードマップ: Priority ${roadmapTask.priority} | Linear: Priority ${linearIssue.priority} (${linearIssue.identifier})\n`);
      
      if (priorityMatch) {
        matchCount++;
      } else {
        mismatchCount++;
      }
    }
  });
  
  console.log('\n📊 同期状況サマリー:');
  console.log(`   - ✅ 一致: ${matchCount}件`);
  console.log(`   - ❌ 不一致: ${mismatchCount}件`);
  console.log(`   - 同期率: ${Math.round(matchCount / ROADMAP_ORDER.length * 100)}%`);
  
  console.log('\n💡 結論:');
  if (matchCount === ROADMAP_ORDER.length) {
    console.log('   ✅ ロードマップとLinearは完全に同期しています！');
  } else {
    console.log('   ⚠️  ロードマップの順序がLinearに反映されていません');
    console.log('   推奨: Priorityと依存関係を設定してロードマップ順序を管理');
  }
}

main();
