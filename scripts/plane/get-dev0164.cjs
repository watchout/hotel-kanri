const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.mcp') });
const planeApi = require('./lib/plane-api-client.cjs');

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
    
    // Get states for mapping
    const statesRes = await planeApi.getStates();
    const states = Array.isArray(statesRes) ? statesRes : (statesRes.results || []);
    const stateMap = {};
    states.forEach(s => stateMap[s.id] = s.name);
    
    console.log('=== DEV-0164 ===');
    console.log('ID:', dev0164.id);
    console.log('Name:', dev0164.name);
    console.log('State:', stateMap[dev0164.state] || dev0164.state);
    console.log('Description:', dev0164.description || '(なし)');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
