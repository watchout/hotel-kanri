#!/usr/bin/env node

/**
 * Linear Issue の全フィールドを確認
 */

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

async function main() {
  console.log('🔍 Linear Issue フィールド確認\n');
  
  // OMOAI-214を詳細取得
  const issue = await client.issue('OMOAI-214');
  
  console.log('Issue Object:');
  console.log(JSON.stringify(issue, null, 2));
  
  console.log('\n\nState情報:');
  if (issue.state) {
    const state = await issue.state;
    console.log('State:', state);
  } else {
    console.log('State: undefined');
  }
}

main().catch(console.error);







