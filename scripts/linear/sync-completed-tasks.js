#!/usr/bin/env node

/**
 * 完了済みタスクをLinearでDoneに更新
 */

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

// ロードマップで完了済みのタスク
const COMPLETED_TASKS = [
  'OMOAI-213', // [SSOT作成] SSOT_SAAS_PERMISSION_SYSTEM
  'OMOAI-214', // [SSOT作成] SSOT_SAAS_STAFF_MANAGEMENT (既に更新済み)
  'OMOAI-215', // [SSOT作成] SSOT_SAAS_MULTITENANT
  'OMOAI-216', // [SSOT作成] SSOT_SAAS_MEDIA_MANAGEMENT
  'OMOAI-218', // [SSOT作成] SSOT_SAAS_ORDER_MANAGEMENT
  'OMOAI-219', // [SSOT作成] SSOT_SAAS_MENU_MANAGEMENT
  'OMOAI-220', // [SSOT作成] SSOT_SAAS_ROOM_MANAGEMENT
  'OMOAI-221', // [SSOT作成] SSOT_SAAS_EMAIL_SYSTEM
  'OMOAI-223', // [SSOT作成] SSOT_SAAS_ADMIN_AUTHENTICATION
  'OMOAI-224', // [SSOT作成] SSOT_ADMIN_AI_CONCIERGE
];

async function main() {
  console.log('🔄 完了済みタスクをLinearでDoneに更新します...\n');
  
  // Doneステート取得
  const states = await client.workflowStates({ 
    filter: { team: { key: { eq: 'OMOAI' } } } 
  });
  
  let doneStateId = null;
  for await (const state of states.nodes) {
    if (state.name === 'Done') {
      doneStateId = state.id;
      break;
    }
  }
  
  if (!doneStateId) {
    console.error('❌ Doneステートが見つかりません');
    process.exit(1);
  }
  
  let updateCount = 0;
  let skipCount = 0;
  
  for (const issueIdentifier of COMPLETED_TASKS) {
    try {
      const issue = await client.issue(issueIdentifier);
      
      if (issue.state?.name === 'Done') {
        console.log(`⏭️  ${issueIdentifier}: 既にDone - スキップ`);
        skipCount++;
        continue;
      }
      
      await client.updateIssue(issue.id, {
        stateId: doneStateId,
      });
      
      console.log(`✅ ${issueIdentifier}: ${issue.title} → Done`);
      updateCount++;
      
    } catch (error) {
      console.error(`❌ ${issueIdentifier}: エラー - ${error.message}`);
    }
  }
  
  console.log(`\n📊 更新完了:`);
  console.log(`   - 更新: ${updateCount}件`);
  console.log(`   - スキップ: ${skipCount}件`);
  console.log(`\n理由: ロードマップで完了済みのタスクをLinearに反映`);
}

main();







