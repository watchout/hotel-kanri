/**
 * Vercel Serverless Function - Dashboard API
 */

// Plane API設定
const PLANE_HOST = process.env.PLANE_API_HOST_URL || '';
const PLANE_API_KEY = process.env.PLANE_API_KEY || '';
const PLANE_WORKSPACE = process.env.PLANE_WORKSPACE_SLUG || '';
const PLANE_PROJECT = process.env.PLANE_PROJECT_ID || '';

// GitHub API設定
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPOS = [
  { owner: 'watchout', repo: 'hotel-kanri', short: 'K' },
  { owner: 'watchout', repo: 'hotel-common-rebuild', short: 'C' },
  { owner: 'watchout', repo: 'hotel-saas-rebuild', short: 'S' }
];

// SSOTキーワードマッピング
const SSOT_KEYWORDS = {
  'auth': 'SSOT_SAAS_ADMIN_AUTHENTICATION',
  'login': 'SSOT_SAAS_ADMIN_AUTHENTICATION',
  'device': 'SSOT_SAAS_DEVICE_AUTHENTICATION',
  'デバイス': 'SSOT_SAAS_DEVICE_AUTHENTICATION',
  'tenant': 'SSOT_SAAS_MULTITENANT',
  'テナント': 'SSOT_SAAS_MULTITENANT',
  'db確認': 'SSOT_SAAS_DATABASE_SCHEMA',
  'api実装': 'SSOT_API_REGISTRY',
  'テスト': 'SSOT_TEST_DEBUG_INFRASTRUCTURE',
  'evidence': 'SSOT_TEST_DEBUG_INFRASTRUCTURE',
  'ui実装': 'SSOT_UICTA',
  '管理ui': 'SSOT_UICTA',
  'ゲストui': 'SSOT_UICTA',
  'guest': 'SSOT_GUEST_PAGE_REGISTRY',
  'ゲスト': 'SSOT_GUEST_PAGE_REGISTRY',
  'メニュー': 'SSOT_GUEST_PAGE_REGISTRY',
  '多言語': 'SSOT_MULTILINGUAL_SYSTEM',
};

// Plane APIリクエスト (fetch版)
async function planeRequest(endpoint) {
  const baseUrl = PLANE_HOST.startsWith('http') ? PLANE_HOST : `https://${PLANE_HOST}`;
  const url = `${baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': PLANE_API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Plane API error: ${response.status}`);
  }
  
  return response.json();
}

// GitHub APIリクエスト
async function githubRequest(endpoint) {
  if (!GITHUB_TOKEN) return null;
  
  const url = `https://api.github.com${endpoint}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  
  if (!response.ok) return null;
  return response.json();
}

// GitHub コミット履歴取得
async function getGitHistory() {
  if (!GITHUB_TOKEN) return [];
  
  const commits = [];
  for (const { owner, repo, short } of GITHUB_REPOS) {
    try {
      const data = await githubRequest(`/repos/${owner}/${repo}/commits?per_page=20`);
      if (data) {
        for (const c of data) {
          const devMatch = c.commit.message.match(/DEV-(\d+)/i);
          commits.push({
            repo: short,
            hash: c.sha.substring(0, 7),
            message: c.commit.message.split('\n')[0].substring(0, 50),
            date: c.commit.author.date,
            devId: devMatch ? `DEV-${devMatch[1]}` : null
          });
        }
      }
    } catch (e) {}
  }
  return commits.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50);
}

// GitHub PR一覧取得
async function getPRs() {
  if (!GITHUB_TOKEN) return {};
  
  const result = {};
  for (const { owner, repo, short } of GITHUB_REPOS) {
    try {
      const prs = await githubRequest(`/repos/${owner}/${repo}/pulls?state=all&per_page=10`);
      if (prs) {
        result[short] = await Promise.all(prs.map(async (pr) => {
          // CI状態取得
          let checks = [];
          try {
            const checkData = await githubRequest(`/repos/${owner}/${repo}/commits/${pr.head.sha}/check-runs`);
            if (checkData && checkData.check_runs) {
              checks = checkData.check_runs.slice(0, 5).map(c => ({
                name: c.name,
                state: c.conclusion || c.status
              }));
            }
          } catch (e) {}
          
          const devMatch = pr.title.match(/DEV-(\d+)/i) || pr.head.ref.match(/dev-(\d+)/i);
          return {
            number: pr.number,
            title: pr.title.substring(0, 50),
            branch: pr.head.ref,
            state: pr.state,
            url: pr.html_url,
            devId: devMatch ? `DEV-${devMatch[1]}` : null,
            checks
          };
        }));
      }
    } catch (e) {}
  }
  return result;
}

// States取得
async function getStates() {
  try {
    const endpoint = `/api/v1/workspaces/${PLANE_WORKSPACE}/projects/${PLANE_PROJECT}/states/`;
    const result = await planeRequest(endpoint);
    const states = {};
    for (const state of (result.results || result || [])) {
      states[state.id] = state.name;
    }
    return states;
  } catch (e) {
    return {};
  }
}

// Tasks取得
async function getTasks() {
  try {
    const states = await getStates();
    const endpoint = `/api/v1/workspaces/${PLANE_WORKSPACE}/projects/${PLANE_PROJECT}/issues/`;
    const result = await planeRequest(endpoint);
    const issues = result.results || result || [];
    
    return issues.filter(issue => {
      const match = issue.name.match(/\[DEV-(\d+)\]/);
      return match && parseInt(match[1]) >= 100;
    }).map(issue => {
      const devMatch = issue.name.match(/\[DEV-(\d+)\]/);
      const stateId = issue.state;
      const stateName = states[stateId] || 'Unknown';
      let ssotPath = null;
      const ssotMatch = (issue.description || '').match(/ssot:\s*([^\s\n]+)/i);
      if (ssotMatch) ssotPath = ssotMatch[1];
      
      // キーワードからSSOT推測
      let guessedSSOT = null;
      const nameLower = issue.name.toLowerCase();
      for (const [keyword, ssotPrefix] of Object.entries(SSOT_KEYWORDS)) {
        if (nameLower.includes(keyword.toLowerCase())) {
          guessedSSOT = ssotPrefix;
          break;
        }
      }
      
      return {
        id: devMatch ? `DEV-${devMatch[1]}` : issue.name,
        name: issue.name.replace(/\[DEV-\d+\]\s*/, '').replace(/\[COM-\d+\]\s*/, '').trim(),
        state: stateName,
        priority: issue.priority,
        ssotPath: ssotPath,
        ssotGuessed: guessedSSOT,
        updatedAt: issue.updated_at
      };
    }).sort((a, b) => {
      const aNum = parseInt(a.id.replace('DEV-', ''));
      const bNum = parseInt(b.id.replace('DEV-', ''));
      return aNum - bNum;
    });
  } catch (error) {
    console.error('getTasks error:', error);
    return [];
  }
}

// Handler
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const [tasks, gitHistory, prs] = await Promise.all([
      getTasks(),
      getGitHistory(),
      getPRs()
    ]);
    
    // タスクにGit履歴とPRをマッピング
    const taskGitMap = {};
    const taskPRMap = {};
    
    for (const commit of gitHistory) {
      if (commit.devId) {
        if (!taskGitMap[commit.devId]) taskGitMap[commit.devId] = [];
        taskGitMap[commit.devId].push(commit);
      }
    }
    
    for (const [repo, prList] of Object.entries(prs)) {
      for (const pr of prList) {
        if (pr.devId) {
          if (!taskPRMap[pr.devId]) taskPRMap[pr.devId] = [];
          taskPRMap[pr.devId].push({ ...pr, repo });
        }
      }
    }
    
    const enrichedTasks = tasks.map(task => ({
      ...task,
      commits: taskGitMap[task.id]?.slice(0, 5) || [],
      prs: taskPRMap[task.id] || []
    }));
    
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      hasGitHub: !!GITHUB_TOKEN,
      stats: {
        total: tasks.length,
        done: tasks.filter(t => t.state === 'Done').length,
        inProgress: tasks.filter(t => t.state === 'In Progress').length,
        backlog: tasks.filter(t => t.state === 'Backlog').length
      },
      tasks: enrichedTasks,
      gitHistory: gitHistory.slice(0, 30),
      prs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
