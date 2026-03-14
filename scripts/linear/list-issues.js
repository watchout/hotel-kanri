#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

async function main() {
  const issues = await client.issues();
  
  console.log('📋 Linear Issues:\n');
  
  let count = 0;
  for await (const issue of issues.nodes) {
    console.log(`${issue.identifier}: ${issue.title} (Priority: ${issue.priority}, State: ${issue.state?.name})`);
    count++;
    if (count >= 10) break; // 最初の10件のみ表示
  }
  
  console.log(`\n... 他 ${count}件以上のIssue`);
}

main();
