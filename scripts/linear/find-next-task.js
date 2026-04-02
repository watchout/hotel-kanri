#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

async function main() {
  console.log('🔍 次のタスクを検索中...\n');
  
  // 全Issueを取得
  const issues = await client.issues();
  
  const allIssues = [];
  for await (const issue of issues.nodes) {
    allIssues.push({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state?.name || 'Backlog',
      priority: issue.priority || 0,
      assignee: issue.assignee?.name || 'Unassigned',
    });
  }
  
  console.log(`📊 総Issue数: ${allIssues.length}件\n`);
  
  // タスク選択の優先順位
  console.log('【タスク選択ルール】');
  console.log('Priority 1: Status = Backlog/Spec Ready, Priority = 1, 依存なし, 自分担当');
  console.log('Priority 2: Status = Backlog/Spec Ready, Priority = 2, 依存なし');
  console.log('Priority 3: Status = Backlog, Priority = 3, 依存なし\n');
  
  // Priority 1タスクを検索
  const priority1Tasks = allIssues.filter(issue => 
    (issue.state === 'Backlog' || issue.state === 'Spec Ready') &&
    issue.priority === 1 &&
    issue.title.includes('[SSOT作成]')
  );
  
  console.log(`✅ Priority 1タスク: ${priority1Tasks.length}件\n`);
  
  if (priority1Tasks.length > 0) {
    console.log('【推奨タスク（Priority 1）】\n');
    priority1Tasks.slice(0, 5).forEach(task => {
      console.log(`${task.identifier}: ${task.title}`);
      console.log(`   State: ${task.state} | Priority: ${task.priority} | Assignee: ${task.assignee}\n`);
    });
  } else {
    console.log('⚠️  Priority 1タスクが見つかりません\n');
    
    // Priority 2タスクを検索
    const priority2Tasks = allIssues.filter(issue => 
      (issue.state === 'Backlog' || issue.state === 'Spec Ready') &&
      issue.priority === 2
    );
    
    console.log(`✅ Priority 2タスク: ${priority2Tasks.length}件\n`);
    
    if (priority2Tasks.length > 0) {
      console.log('【推奨タスク（Priority 2）】\n');
      priority2Tasks.slice(0, 5).forEach(task => {
        console.log(`${task.identifier}: ${task.title}`);
        console.log(`   State: ${task.state} | Priority: ${task.priority} | Assignee: ${task.assignee}\n`);
      });
    }
  }
  
  // 最初のタスクを推奨
  const recommendedTask = priority1Tasks[0] || allIssues.find(issue => 
    issue.state === 'Backlog' && issue.title.includes('[SSOT作成]')
  );
  
  if (recommendedTask) {
    console.log('\n🎯 【次にやるべきタスク】');
    console.log(`\n${recommendedTask.identifier}: ${recommendedTask.title}`);
    console.log(`State: ${recommendedTask.state}`);
    console.log(`Priority: ${recommendedTask.priority}`);
    console.log(`Assignee: ${recommendedTask.assignee}\n`);
  } else {
    console.log('\n⚠️  次のタスクが見つかりませんでした');
  }
}

main();
