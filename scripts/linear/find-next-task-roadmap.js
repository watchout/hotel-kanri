#!/usr/bin/env node

/**
 * ロードマップ順序に基づいた次のタスク選択
 * 
 * 目的:
 * - SSOT_PROGRESS_MASTER.mdの順序を厳密に守る
 * - 完了済みタスクをスキップ
 * - 次の未完了タスクを正確に返す
 */

const { LinearClient } = require('@linear/sdk');
const fs = require('fs');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

// ロードマップの順序（Phase 1のみ）
const ROADMAP_ORDER = [
  // Week 1
  { order: 1, ssot: 'SSOT_SAAS_PERMISSION_SYSTEM', type: 'SSOT作成', status: 'Done' },
  { order: 1.5, ssot: 'SSOT_SAAS_STAFF_MANAGEMENT', type: 'SSOT作成', status: 'Done' },
  { order: 2, ssot: 'SSOT_SAAS_MULTITENANT', type: 'SSOT作成', status: 'Done' },
  { order: 3, ssot: 'SSOT_SAAS_MEDIA_MANAGEMENT', type: 'SSOT作成', status: 'Done' },
  { order: 4, ssot: 'SSOT_SAAS_MEDIA_MANAGEMENT', type: 'hotel-common実装', status: 'Todo' },
  
  // Week 2
  { order: 5, ssot: 'SSOT_SAAS_ORDER_MANAGEMENT', type: 'SSOT作成', status: 'Done' },
  { order: 6, ssot: 'SSOT_SAAS_MENU_MANAGEMENT', type: 'SSOT作成', status: 'Done' },
  { order: 7, ssot: 'SSOT_SAAS_ROOM_MANAGEMENT', type: 'SSOT作成', status: 'Done' },
  { order: 8, ssot: 'SSOT_SAAS_EMAIL_SYSTEM', type: 'SSOT作成', status: 'Done' },
  { order: 9, ssot: 'SSOT_SAAS_EMAIL_SYSTEM', type: 'hotel-common実装', status: 'Todo' },
  
  // Week 3
  { order: 10, ssot: 'SSOT_ADMIN_AI_SETTINGS', type: 'SSOT作成', status: 'Done' },
  { order: 11, ssot: 'SSOT_ADMIN_AI_SETTINGS', type: 'hotel-common実装', status: 'Todo' },
  { order: 12, ssot: 'SSOT_SAAS_ADMIN_AUTHENTICATION', type: 'SSOT作成', status: 'Done' },
  { order: 13, ssot: 'SSOT_ADMIN_AI_CONCIERGE', type: 'SSOT作成', status: 'Done' },
];

async function main() {
  console.log('🔍 ロードマップ順序に基づいた次のタスク選択\n');
  
  // Linearから全Issue取得
  const issues = await client.issues();
  
  const linearIssues = new Map();
  for await (const issue of issues.nodes) {
    const state = await issue.state;
    const key = issue.title;
    linearIssues.set(key, {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      state: state?.name || 'Backlog',
      priority: issue.priority || 0,
    });
  }
  
  console.log(`📊 Linear Issues: ${linearIssues.size}件\n`);
  console.log('【ロードマップ順序で確認】\n');
  
  let nextTask = null;
  
  for (const task of ROADMAP_ORDER) {
    const issueTitle = `[${task.type}] ${task.ssot}`;
    const linearIssue = linearIssues.get(issueTitle);
    
    const status = linearIssue ? linearIssue.state : 'Not in Linear';
    const isDone = status === 'Done' || status === 'Completed' || task.status === 'Done';
    const icon = isDone ? '✅' : '⏳';
    
    console.log(`${icon} [順位${task.order}] ${issueTitle}`);
    console.log(`   ロードマップ: ${task.status} | Linear: ${status}`);
    
    if (linearIssue) {
      console.log(`   Issue: ${linearIssue.identifier}\n`);
    } else {
      console.log(`   Issue: 未登録\n`);
    }
    
    // 次のタスクを見つける
    if (!nextTask && !isDone && linearIssue) {
      nextTask = {
        order: task.order,
        title: issueTitle,
        issue: linearIssue,
      };
    }
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
  
  if (nextTask) {
    console.log('🎯 【ロードマップ順序に基づく次のタスク】\n');
    console.log(`順位: ${nextTask.order}`);
    console.log(`Issue: ${nextTask.issue.identifier}`);
    console.log(`タイトル: ${nextTask.title}`);
    console.log(`State: ${nextTask.issue.state}`);
    console.log(`Priority: ${nextTask.issue.priority}`);
    console.log(`\n理由: ロードマップ順位${nextTask.order}の次の未完了タスク`);
  } else {
    console.log('✅ Phase 1のタスクは全て完了しています！');
  }
}

main();

