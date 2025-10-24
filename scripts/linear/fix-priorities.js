#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

async function main() {
  console.log('🔧 Priority修正を開始します...\n');
  
  const issues = await client.issues();
  
  let fixCount = 0;
  
  for await (const issue of issues.nodes) {
    let targetPriority = null;
    
    if (issue.title.includes('[SSOT作成]')) {
      targetPriority = 1;
    } else if (issue.title.includes('[hotel-common実装]')) {
      targetPriority = 2;
    } else if (issue.title.includes('[hotel-saas実装]')) {
      targetPriority = 3;
    }
    
    if (targetPriority !== null && issue.priority !== targetPriority) {
      try {
        await client.updateIssue(issue.id, {
          priority: targetPriority,
        });
        console.log(`✅ ${issue.identifier}: Priority ${issue.priority} → ${targetPriority}`);
        fixCount++;
      } catch (error) {
        console.error(`❌ ${issue.identifier}: エラー - ${error.message}`);
      }
    }
  }
  
  console.log(`\n📊 修正完了: ${fixCount}件`);
}

main();
