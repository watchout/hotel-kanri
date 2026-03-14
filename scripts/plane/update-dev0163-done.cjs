const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.mcp') });
const planeApi = require('./lib/plane-api-client.cjs');

const DONE_STATE_ID = '86937979-4727-4ec9-81be-585f7aae981d';

async function main() {
  try {
    // 全Issues取得
    const config = planeApi.getPlaneConfig();
    const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
    const response = await planeApi.request('GET', endpoint);
    const issues = response.results || response;
    
    // DEV-0163を検索
    const dev0163 = issues.find(i => i.name?.includes('[DEV-0163]') || i.sequence_id === 163);
    
    if (!dev0163) {
      console.log('❌ DEV-0163 が見つかりません');
      process.exit(1);
    }
    
    console.log('📌 DEV-0163 found:');
    console.log('  ID:', dev0163.id);
    console.log('  Name:', dev0163.name);
    console.log('  Current State:', dev0163.state);
    
    // Doneに更新
    const result = await planeApi.updateIssue(dev0163.id, { state: DONE_STATE_ID });
    console.log('\n✅ DEV-0163 を Done に更新しました');
  } catch (err) {
    console.error('❌ エラー:', err.message);
    process.exit(1);
  }
}

main();
