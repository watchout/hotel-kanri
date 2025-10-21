#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

async function main() {
  const issues = await client.issues();
  
  for await (const issue of issues.nodes) {
    if (issue.title.includes('STAFF_MANAGEMENT')) {
      console.log(`\n🎯 【ロードマップ順位1.5: 次にやるべきタスク】\n`);
      console.log(`${issue.identifier}: ${issue.title}`);
      console.log(`State: ${issue.state?.name || 'Backlog'}`);
      console.log(`Priority: ${issue.priority || 0}`);
      console.log(`Assignee: ${issue.assignee?.name || 'Unassigned'}`);
      console.log(`\n理由: 🚨重大な抜け発見 - 権限システムと連携する基盤機能`);
      return;
    }
  }
  
  console.log('❌ SSOT_SAAS_STAFF_MANAGEMENT が見つかりません');
}

main();
