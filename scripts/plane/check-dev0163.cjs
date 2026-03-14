const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.mcp') });
const planeApi = require('./lib/plane-api-client.cjs');

async function main() {
  try {
    // Issue一覧取得
    const issues = await planeApi.listIssues();
    const dev0163 = issues.find(i => i.sequence_id === 163);
    if (dev0163) {
      console.log('DEV-0163 found:');
      console.log('  ID:', dev0163.id);
      console.log('  Name:', dev0163.name);
      console.log('  State:', dev0163.state_detail?.name || 'Unknown');
    } else {
      console.log('DEV-0163 not found in issues');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}
main();
