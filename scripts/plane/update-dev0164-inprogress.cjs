const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.mcp') });
const planeApi = require('./lib/plane-api-client.cjs');

const IN_PROGRESS_STATE_ID = 'c576eed5-315c-44b9-a3cb-db67d73423b7';

async function main() {
  try {
    const config = planeApi.getPlaneConfig();
    const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
    const response = await planeApi.request('GET', endpoint);
    const issues = response.results || response;
    
    const dev0164 = issues.find(i => i.name?.includes('[DEV-0164]') || i.sequence_id === 164);
    if (!dev0164) {
      console.log('DEV-0164 not found');
      process.exit(1);
    }
    
    await planeApi.updateIssue(dev0164.id, { state: IN_PROGRESS_STATE_ID });
    console.log('✅ DEV-0164 を In Progress に更新しました');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
