const api = require('./lib/plane-api-client.cjs');
const DONE_STATE = '86937979-4727-4ec9-81be-585f7aae981d';

(async () => {
  try {
    const config = api.getPlaneConfig();
    const issuesEndpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
    const response = await api.request('GET', issuesEndpoint);
    const issues = response.results || response;
    
    const dev0162 = issues.find(i => i.name.includes('[DEV-0162]'));
    if (dev0162) {
      await api.updateIssue(dev0162.id, { state: DONE_STATE });
      console.log('✅ DEV-0162 → Done');
    } else {
      console.log('DEV-0162 not found');
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
