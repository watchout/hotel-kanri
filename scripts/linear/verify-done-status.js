#!/usr/bin/env node

/**
 * Linearで完了済みタスクのステータスを直接確認
 */

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

const TASK_IDS = [
  'OMOAI-213',
  'OMOAI-214',
  'OMOAI-215',
  'OMOAI-216',
  'OMOAI-218',
  'OMOAI-219',
  'OMOAI-220',
  'OMOAI-221',
  'OMOAI-223',
  'OMOAI-224',
];

async function main() {
  console.log('🔍 Linear Issue ステータス確認\n');
  
  let doneCount = 0;
  let otherCount = 0;
  
  for (const issueId of TASK_IDS) {
    const issue = await client.issue(issueId);
    const state = await issue.state;
    const stateName = state?.name || 'Unknown';
    const icon = stateName === 'Done' ? '✅' : '⏳';
    
    console.log(`${icon} ${issueId}: ${stateName}`);
    console.log(`   ${issue.title}\n`);
    
    if (stateName === 'Done') {
      doneCount++;
    } else {
      otherCount++;
    }
  }
  
  console.log('📊 集計:');
  console.log(`   Done: ${doneCount}件`);
  console.log(`   その他: ${otherCount}件`);
}

main();

