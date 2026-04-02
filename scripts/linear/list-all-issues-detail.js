#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

async function main() {
  console.log('📋 Linear Issues 詳細リスト\n');
  
  const issues = await client.issues();
  
  const byPhase = {};
  
  for await (const issue of issues.nodes) {
    const title = issue.title;
    
    // SSOTタイトルを抽出
    let ssotName = '';
    if (title.includes('[SSOT作成]')) {
      ssotName = title.replace('[SSOT作成] ', '');
    } else if (title.includes('[hotel-common実装]')) {
      ssotName = title.replace('[hotel-common実装] ', '');
    } else if (title.includes('[hotel-saas実装]')) {
      ssotName = title.replace('[hotel-saas実装] ', '');
    }
    
    if (!byPhase[ssotName]) {
      byPhase[ssotName] = [];
    }
    
    byPhase[ssotName].push({
      identifier: issue.identifier,
      title: issue.title,
      priority: issue.priority || 0,
      state: issue.state?.name || 'Backlog',
    });
  }
  
  // Phase 1のタスクを確認
  const phase1Tasks = [
    'SSOT_SAAS_PERMISSION_SYSTEM',
    'SSOT_SAAS_STAFF_MANAGEMENT',
    'SSOT_SAAS_MULTITENANT',
    'SSOT_SAAS_MEDIA_MANAGEMENT',
    'SSOT_SAAS_ORDER_MANAGEMENT',
    'SSOT_SAAS_MENU_MANAGEMENT',
    'SSOT_SAAS_ROOM_MANAGEMENT',
    'SSOT_SAAS_EMAIL_SYSTEM',
    'SSOT_ADMIN_AI_SETTINGS',
    'SSOT_SAAS_ADMIN_AUTHENTICATION',
    'SSOT_ADMIN_AI_CONCIERGE',
  ];
  
  console.log('【Phase 1タスクのLinear登録状況】\n');
  
  phase1Tasks.forEach(taskName => {
    const issues = byPhase[taskName];
    if (issues && issues.length > 0) {
      console.log(`✅ ${taskName}:`);
      issues.forEach(issue => {
        console.log(`   ${issue.identifier}: ${issue.title} (P${issue.priority}, ${issue.state})`);
      });
    } else {
      console.log(`❌ ${taskName}: 未登録`);
    }
    console.log('');
  });
}

main();
