#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

async function main() {
  const issueId = process.argv[2];
  
  if (!issueId) {
    console.error('Usage: node close-completed-issue.js <issue-identifier>');
    process.exit(1);
  }
  
  console.log(`🔄 Issue ${issueId} をクローズします...\n`);
  
  // Issue取得
  const issue = await client.issue(issueId);
  
  console.log(`Issue: ${issue.title}`);
  console.log(`現在のState: ${issue.state?.name || 'Unknown'}\n`);
  
  // Doneステートを取得
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
  
  // Issueを更新
  await client.updateIssue(issue.id, {
    stateId: doneStateId,
  });
  
  console.log(`✅ ${issueId} をDoneに更新しました`);
  console.log(`\n理由: SSOTは既に作成済み（2025-10-19）`);
}

main();
