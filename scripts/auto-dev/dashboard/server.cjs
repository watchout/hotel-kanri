#!/usr/bin/env node
/**
 * 自動開発ダッシュボード v2.1
 * 
 * タスク・SSOT・実装状態・GitHub履歴を可視化
 * 
 * @version 2.1.0
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 3500;
const ROOT = path.join(__dirname, '../../..');

// 環境変数読み込み
const envPath = path.join(ROOT, '.env.mcp');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim();
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key.trim()] = value;
    }
  });
}

let planeApi;
try {
  planeApi = require('../../plane/lib/plane-api-client.cjs');
} catch (e) {}

let statesCache = null;

async function getPlaneStates() {
  if (statesCache) return statesCache;
  try {
    const config = planeApi.getPlaneConfig();
    const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/states/`;
    const result = await planeApi.request('GET', endpoint);
    statesCache = {};
    for (const state of (result.results || result)) {
      statesCache[state.id] = state.name;
    }
    return statesCache;
  } catch (e) {
    return {};
  }
}

async function getTasks() {
  try {
    if (!planeApi) return [];
    const states = await getPlaneStates();
    const config = planeApi.getPlaneConfig();
    const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
    const result = await planeApi.request('GET', endpoint);
    const issues = result.results || result;
    
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
      
      return {
        id: devMatch ? `DEV-${devMatch[1]}` : issue.name,
        name: issue.name.replace(/\[DEV-\d+\]\s*/, '').replace(/\[COM-\d+\]\s*/, '').trim(),
        state: stateName,
        priority: issue.priority,
        description: issue.description_stripped || '',
        ssotPath,
        updatedAt: issue.updated_at,
        planeId: issue.id
      };
    }).sort((a, b) => {
      const aNum = parseInt(a.id.replace('DEV-', ''));
      const bNum = parseInt(b.id.replace('DEV-', ''));
      return aNum - bNum;
    });
  } catch (error) {
    return [];
  }
}

// SSOTキーワードマッピング（タスク名からSSOTを推測）
const SSOT_KEYWORDS = {
  'auth': 'SSOT_SAAS_ADMIN_AUTHENTICATION',
  'login': 'SSOT_SAAS_ADMIN_AUTHENTICATION',
  'session': 'SSOT_SAAS_ADMIN_AUTHENTICATION',
  'device': 'SSOT_SAAS_DEVICE_AUTHENTICATION',
  'デバイス': 'SSOT_SAAS_DEVICE_AUTHENTICATION',
  'tenant': 'SSOT_SAAS_MULTITENANT',
  'テナント': 'SSOT_SAAS_MULTITENANT',
  'database': 'SSOT_SAAS_DATABASE_SCHEMA',
  'db確認': 'SSOT_SAAS_DATABASE_SCHEMA',
  'api実装': 'SSOT_API_REGISTRY',
  'api/バックエンド': 'SSOT_API_REGISTRY',
  'endpoint': 'SSOT_API_REGISTRY',
  'media': 'SSOT_SAAS_MEDIA_MANAGEMENT',
  '画像': 'SSOT_SAAS_MEDIA_MANAGEMENT',
  'email': 'SSOT_SAAS_EMAIL_SYSTEM',
  'メール': 'SSOT_SAAS_EMAIL_SYSTEM',
  'multilingual': 'SSOT_MULTILINGUAL_SYSTEM',
  '多言語': 'SSOT_MULTILINGUAL_SYSTEM',
  'テスト': 'SSOT_TEST_DEBUG_INFRASTRUCTURE',
  'evidence': 'SSOT_TEST_DEBUG_INFRASTRUCTURE',
  'ui実装': 'SSOT_UICTA',
  '管理ui': 'SSOT_UICTA',
  'ゲストui': 'SSOT_UICTA',
  'cta': 'SSOT_UICTA',
  'guest': 'SSOT_GUEST_PAGE_REGISTRY',
  'ゲスト': 'SSOT_GUEST_PAGE_REGISTRY',
  'メニュー': 'SSOT_GUEST_PAGE_REGISTRY',
  'pricing': 'SSOT_PRICING_ENTITLEMENTS',
  '価格': 'SSOT_PRICING_ENTITLEMENTS',
  'quality': 'SSOT_QUALITY_CHECKLIST',
  '品質': 'SSOT_QUALITY_CHECKLIST',
};

function getSSOTFiles() {
  const ssotDir = path.join(ROOT, 'docs/03_ssot');
  const ssotFiles = {};
  const allSSOTs = [];
  
  function scanDir(dir) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.startsWith('_')) {
          scanDir(filePath);
        } else if (file.endsWith('.md') && file.startsWith('SSOT_')) {
          const relativePath = filePath.replace(ROOT + '/', '');
          allSSOTs.push({ path: relativePath, name: file, modifiedAt: stat.mtime });
          
          // DEV番号で紐付け
          const devMatch = file.match(/DEV[_-]?(\d+)/i);
          if (devMatch) {
            ssotFiles[`DEV-${devMatch[1]}`] = { path: relativePath, name: file, modifiedAt: stat.mtime };
          }
        }
      }
    } catch (e) {}
  }
  scanDir(ssotDir);
  return { byDevId: ssotFiles, all: allSSOTs };
}

// タスク名からSSOTを推測
function guessSSOTForTask(taskName, allSSOTs) {
  const nameLower = taskName.toLowerCase();
  
  // キーワードマッチング（優先度順）
  for (const [keyword, ssotPrefix] of Object.entries(SSOT_KEYWORDS)) {
    if (nameLower.includes(keyword.toLowerCase())) {
      const matched = allSSOTs.find(s => s.name.includes(ssotPrefix));
      if (matched) return matched;
    }
  }
  
  return null;
}

function getAuditResults() {
  const auditDir = path.join(ROOT, 'evidence/ssot-audit');
  const results = {};
  try {
    const files = fs.readdirSync(auditDir).filter(f => f.endsWith('.json')).sort((a, b) => b.localeCompare(a));
    for (const file of files) {
      const content = JSON.parse(fs.readFileSync(path.join(auditDir, file), 'utf8'));
      const devMatch = file.match(/DEV[_-]?(\d+)/i);
      if (devMatch) {
        const devId = `DEV-${devMatch[1]}`;
        if (!results[devId]) {
          results[devId] = { score: content.score || content.finalScore || 0, date: content.timestamp };
        }
      }
    }
  } catch (e) {}
  return results;
}

function getGitHubStatus() {
  const repos = [
    { name: 'hotel-common-rebuild', path: '/Users/kaneko/hotel-common-rebuild' },
    { name: 'hotel-saas-rebuild', path: '/Users/kaneko/hotel-saas-rebuild' },
    { name: 'hotel-kanri', path: ROOT }
  ];
  const status = {};
  for (const repo of repos) {
    try {
      const prs = execSync(`cd "${repo.path}" && gh pr list --limit 10 --json number,title,state,headRefName,url,statusCheckRollup 2>/dev/null || echo "[]"`, { encoding: 'utf8' });
      status[repo.name] = { prs: JSON.parse(prs).map(pr => ({
        number: pr.number, title: pr.title, state: pr.state, branch: pr.headRefName, url: pr.url,
        checks: pr.statusCheckRollup?.map(c => ({ name: c.name || c.context, state: c.conclusion || c.state })) || []
      }))};
    } catch (e) {
      status[repo.name] = { prs: [] };
    }
  }
  return status;
}

function getGitHistory() {
  const repos = [
    { name: 'hotel-common-rebuild', path: '/Users/kaneko/hotel-common-rebuild' },
    { name: 'hotel-saas-rebuild', path: '/Users/kaneko/hotel-saas-rebuild' },
    { name: 'hotel-kanri', path: ROOT }
  ];
  const history = [];
  for (const repo of repos) {
    try {
      const log = execSync(`cd "${repo.path}" && git log --oneline --date=short --format="%h|%s|%ad|%an" -30 2>/dev/null`, { encoding: 'utf8' });
      for (const line of log.trim().split('\n').filter(l => l)) {
        const [hash, message, date, author] = line.split('|');
        const devMatch = message.match(/DEV-(\d+)/i);
        history.push({ repo: repo.name, hash, message, date, author, devId: devMatch ? `DEV-${devMatch[1]}` : null });
      }
    } catch (e) {}
  }
  return history.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100);
}

function getImplementationStatus() {
  const repos = [
    { name: 'hotel-common-rebuild', path: '/Users/kaneko/hotel-common-rebuild' },
    { name: 'hotel-saas-rebuild', path: '/Users/kaneko/hotel-saas-rebuild' }
  ];
  const status = [];
  for (const repo of repos) {
    try {
      const log = execSync(`cd "${repo.path}" && git log -1 --format="%H|%s|%ar" 2>/dev/null`, { encoding: 'utf8' }).trim();
      const [hash, message, timeAgo] = log.split('|');
      const changes = execSync(`cd "${repo.path}" && git status --porcelain 2>/dev/null | wc -l`, { encoding: 'utf8' }).trim();
      const branch = execSync(`cd "${repo.path}" && git branch --show-current 2>/dev/null`, { encoding: 'utf8' }).trim();
      status.push({ repo: repo.name, branch, lastCommit: { hash: hash?.substring(0, 7), message, timeAgo }, uncommittedChanges: parseInt(changes) || 0 });
    } catch (e) {
      status.push({ repo: repo.name, error: e.message });
    }
  }
  return status;
}

function getQueueStatus() {
  try {
    const queuePath = path.join(ROOT, 'task-queue.json');
    if (fs.existsSync(queuePath)) {
      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      return { pending: queue.queue?.length || 0, processing: queue.processing, completed: queue.completed?.length || 0, failed: queue.failed?.length || 0, tasks: queue.queue || [] };
    }
  } catch (e) {}
  return { pending: 0, processing: null, completed: 0, failed: 0, tasks: [] };
}

function getRecentLogs() {
  const logsDir = path.join(ROOT, 'evidence/auto-dev/logs');
  try {
    return fs.readdirSync(logsDir).filter(f => f.endsWith('.json')).sort((a, b) => b.localeCompare(a)).slice(0, 20).map(f => {
      const content = JSON.parse(fs.readFileSync(path.join(logsDir, f), 'utf8'));
      const devMatch = f.match(/DEV-(\d+)/i);
      return { file: f, taskId: devMatch ? `DEV-${devMatch[1]}` : content.taskId, startTime: content.startTime, status: content.logs?.find(l => l.level === 'error') ? 'error' : 'success', logCount: content.logs?.length || 0 };
    });
  } catch (e) {
    return [];
  }
}

async function handleAPI(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const [tasksData, implData, queueData, logsData, gitHistory, githubStatus] = await Promise.all([
      getTasks(), Promise.resolve(getImplementationStatus()), Promise.resolve(getQueueStatus()),
      Promise.resolve(getRecentLogs()), Promise.resolve(getGitHistory()), Promise.resolve(getGitHubStatus())
    ]);
    
    const ssotData = getSSOTFiles();
    const auditResults = getAuditResults();
    
    // タスクごとにGit履歴、PR、ログをマッピング
    const taskGitMap = {};
    const taskPRMap = {};
    const taskLogMap = {};
    
    for (const commit of gitHistory) {
      if (commit.devId) {
        if (!taskGitMap[commit.devId]) taskGitMap[commit.devId] = [];
        taskGitMap[commit.devId].push(commit);
      }
    }
    
    for (const [repo, info] of Object.entries(githubStatus)) {
      for (const pr of info.prs || []) {
        const devMatch = pr.title.match(/DEV-(\d+)/i) || pr.branch.match(/dev-(\d+)/i);
        if (devMatch) {
          const devId = `DEV-${devMatch[1]}`;
          if (!taskPRMap[devId]) taskPRMap[devId] = [];
          taskPRMap[devId].push({ ...pr, repo });
        }
      }
    }
    
    for (const log of logsData) {
      if (log.taskId) {
        if (!taskLogMap[log.taskId]) taskLogMap[log.taskId] = [];
        taskLogMap[log.taskId].push(log);
      }
    }
    
    const enrichedTasks = tasksData.map(task => {
      // SSOT検索: 1. DEV番号で検索、2. キーワードで推測
      let ssot = ssotData.byDevId[task.id] || null;
      if (!ssot) {
        ssot = guessSSOTForTask(task.name, ssotData.all);
      }
      
      return {
        ...task,
        ssot: ssot,
        audit: auditResults[task.id] || null,
        commits: taskGitMap[task.id]?.slice(0, 5) || [],
        prs: taskPRMap[task.id] || [],
        logs: taskLogMap[task.id]?.slice(0, 3) || []
      };
    });
    
    res.end(JSON.stringify({
      tasks: enrichedTasks,
      implementation: implData,
      queue: queueData,
      logs: logsData,
      gitHistory,
      github: githubStatus,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}

const HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>hotel-kanri 自動開発ダッシュボード</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; font-size: 13px; }
    .container { max-width: 1800px; margin: 0 auto; padding: 12px; }
    h1 { text-align: center; margin-bottom: 12px; color: #58a6ff; font-size: 1.4em; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 10px 16px; background: #161b22; border-radius: 8px; }
    .controls { display: flex; gap: 12px; align-items: center; }
    .toggle-btn { background: #21262d; color: #c9d1d9; border: 1px solid #30363d; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85em; }
    .toggle-btn.active { background: #238636; border-color: #238636; color: #fff; }
    .toggle-btn:hover { background: #30363d; }
    .tabs { display: flex; gap: 6px; margin-bottom: 12px; }
    .tab { padding: 6px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 6px; cursor: pointer; color: #c9d1d9; font-size: 0.85em; }
    .tab.active { background: #238636; border-color: #238636; color: #fff; }
    .panel { display: none; }
    .panel.active { display: block; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
    .card-header { padding: 10px 14px; background: #21262d; border-bottom: 1px solid #30363d; font-weight: 600; font-size: 0.9em; display: flex; justify-content: space-between; align-items: center; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #21262d; vertical-align: top; }
    th { background: #161b22; color: #8b949e; font-weight: 500; font-size: 0.8em; text-transform: uppercase; position: sticky; top: 0; }
    tr:hover { background: #1c2128; }
    tr.done { opacity: 0.6; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 10px; font-size: 0.75em; font-weight: 500; }
    .badge-done { background: #238636; color: #fff; }
    .badge-progress { background: #9e6a03; color: #fff; }
    .badge-backlog { background: #484f58; color: #fff; }
    .badge-success { background: #238636; color: #fff; }
    .badge-error { background: #da3633; color: #fff; }
    .task-id { font-family: 'SF Mono', Monaco, monospace; color: #58a6ff; font-size: 0.85em; white-space: nowrap; }
    .link { color: #58a6ff; text-decoration: none; cursor: pointer; }
    .link:hover { text-decoration: underline; }
    .no-data { color: #6e7681; font-style: italic; }
    .score { font-weight: 600; }
    .score-high { color: #238636; }
    .score-mid { color: #9e6a03; }
    .score-low { color: #da3633; }
    .commit-hash { font-family: 'SF Mono', Monaco, monospace; color: #58a6ff; font-size: 0.8em; }
    .repo-badge { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 0.7em; margin-right: 4px; }
    .repo-common { background: #1f6feb; color: #fff; }
    .repo-saas { background: #a371f7; color: #fff; }
    .repo-kanri { background: #238636; color: #fff; }
    .stats { display: flex; gap: 20px; }
    .stat { text-align: center; }
    .stat-value { font-size: 1.5em; font-weight: bold; color: #58a6ff; }
    .stat-label { color: #8b949e; font-size: 0.8em; }
    .refresh-btn { background: #238636; color: #fff; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8em; }
    .updated { color: #8b949e; font-size: 0.8em; margin-right: 10px; }
    .pr-link { display: inline-flex; align-items: center; gap: 4px; margin-right: 6px; }
    .check { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
    .check-success { background: #238636; }
    .check-failure { background: #da3633; }
    .check-pending { background: #9e6a03; }
    .mini-list { margin: 0; padding: 0; list-style: none; }
    .mini-list li { margin-bottom: 3px; font-size: 0.85em; display: flex; align-items: center; gap: 4px; }
    .priority { font-size: 0.75em; padding: 1px 5px; border-radius: 3px; }
    .priority-urgent { background: #da3633; color: #fff; }
    .priority-high { background: #db6d28; color: #fff; }
    .priority-medium { background: #9e6a03; color: #fff; }
    .priority-low { background: #484f58; color: #fff; }
    .date { color: #8b949e; font-size: 0.8em; white-space: nowrap; }
    .task-name { max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .expand-cell { max-width: 200px; }
    .scroll-table { max-height: 70vh; overflow-y: auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏨 hotel-kanri 自動開発ダッシュボード</h1>
      <div class="controls">
        <button class="toggle-btn" id="toggle-done" onclick="toggleDone()">✓ 完了済みを表示</button>
        <span class="updated" id="updated"></span>
        <button class="refresh-btn" onclick="loadData()">🔄 更新</button>
      </div>
    </div>
    
    <div class="tabs">
      <div class="tab active" data-panel="tasks">📋 タスク一覧</div>
      <div class="tab" data-panel="github">🔀 GitHub履歴</div>
      <div class="tab" data-panel="prs">📦 PR/CI状態</div>
      <div class="tab" data-panel="logs">📝 実行ログ</div>
    </div>
    
    <div class="panel active" id="panel-tasks">
      <div class="card">
        <div class="card-header">
          <span>タスク一覧</span>
          <div class="stats">
            <div class="stat"><span class="stat-value" id="stat-done">-</span><span class="stat-label"> Done</span></div>
            <div class="stat"><span class="stat-value" id="stat-progress">-</span><span class="stat-label"> In Progress</span></div>
            <div class="stat"><span class="stat-value" id="stat-backlog">-</span><span class="stat-label"> Backlog</span></div>
          </div>
        </div>
        <div class="scroll-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>タスク名</th>
                <th>状態</th>
                <th>SSOT</th>
                <th>監査</th>
                <th>Git履歴</th>
                <th>PR/CI</th>
                <th>ログ</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody id="tasks-body"></tbody>
          </table>
        </div>
      </div>
      
      <div class="card">
        <div class="card-header">リポジトリ状態</div>
        <table>
          <thead><tr><th>リポジトリ</th><th>ブランチ</th><th>最新コミット</th><th>未コミット</th></tr></thead>
          <tbody id="impl-body"></tbody>
        </table>
      </div>
    </div>
    
    <div class="panel" id="panel-github">
      <div class="card">
        <div class="card-header">Git コミット履歴</div>
        <div class="scroll-table">
          <table>
            <thead><tr><th>リポ</th><th>ハッシュ</th><th>メッセージ</th><th>日付</th><th>タスク</th></tr></thead>
            <tbody id="git-body"></tbody>
          </table>
        </div>
      </div>
    </div>
    
    <div class="panel" id="panel-prs">
      <div class="card">
        <div class="card-header">Pull Requests & CI</div>
        <table>
          <thead><tr><th>リポ</th><th>#</th><th>タイトル</th><th>ブランチ</th><th>状態</th><th>CI</th></tr></thead>
          <tbody id="prs-body"></tbody>
        </table>
      </div>
    </div>
    
    <div class="panel" id="panel-logs">
      <div class="card">
        <div class="card-header">
          <span>タスクキュー</span>
          <div><span id="queue-pending">-</span> 待機 / <span id="queue-completed">-</span> 完了 / <span id="queue-failed">-</span> 失敗</div>
        </div>
        <div id="queue-processing" style="padding: 10px;"></div>
      </div>
      <div class="card">
        <div class="card-header">実行ログ</div>
        <table>
          <thead><tr><th>タスク</th><th>開始時刻</th><th>状態</th><th>ログ数</th></tr></thead>
          <tbody id="logs-body"></tbody>
        </table>
      </div>
    </div>
  </div>
  
  <script>
    let showDone = false;
    let allData = null;
    
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.panel).classList.add('active');
      });
    });
    
    function toggleDone() {
      showDone = !showDone;
      document.getElementById('toggle-done').classList.toggle('active', showDone);
      renderTasks();
    }
    
    function getStateBadge(state) {
      const l = state.toLowerCase();
      if (l === 'done') return '<span class="badge badge-done">Done</span>';
      if (l === 'in progress') return '<span class="badge badge-progress">In Progress</span>';
      if (l === 'backlog') return '<span class="badge badge-backlog">Backlog</span>';
      return '<span class="badge">' + state + '</span>';
    }
    
    function getScoreClass(s) { return s >= 95 ? 'score-high' : s >= 80 ? 'score-mid' : 'score-low'; }
    function getRepoBadge(r) {
      if (r.includes('common')) return '<span class="repo-badge repo-common">C</span>';
      if (r.includes('saas')) return '<span class="repo-badge repo-saas">S</span>';
      return '<span class="repo-badge repo-kanri">K</span>';
    }
    function formatDate(d) { return d ? new Date(d).toLocaleDateString('ja-JP') : '-'; }
    function formatDateTime(d) { return d ? new Date(d).toLocaleString('ja-JP', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '-'; }
    
    function renderTasks() {
      if (!allData) return;
      const tasks = showDone ? allData.tasks : allData.tasks.filter(t => t.state.toLowerCase() !== 'done');
      
      const done = allData.tasks.filter(t => t.state.toLowerCase() === 'done').length;
      const progress = allData.tasks.filter(t => t.state.toLowerCase() === 'in progress').length;
      const backlog = allData.tasks.filter(t => t.state.toLowerCase() === 'backlog').length;
      document.getElementById('stat-done').textContent = done;
      document.getElementById('stat-progress').textContent = progress;
      document.getElementById('stat-backlog').textContent = backlog;
      
      const html = tasks.map(t => {
        const isDone = t.state.toLowerCase() === 'done';
        
        // SSOT（GitHubで開く）
        const ssotCell = t.ssot 
          ? '<a class="link" href="https://github.com/watchout/hotel-kanri/blob/main/' + t.ssot.path + '" target="_blank">📄 ' + t.ssot.name.replace('SSOT_','').replace('.md','').substring(0,15) + '</a>'
          : '<span class="no-data">未定義</span>';
        
        // 監査
        const auditCell = t.audit ? '<span class="score ' + getScoreClass(t.audit.score) + '">' + t.audit.score + '</span>' : '<span class="no-data">-</span>';
        
        // Git履歴
        let gitCell = '<span class="no-data">-</span>';
        if (t.commits.length > 0) {
          gitCell = '<ul class="mini-list">' + t.commits.slice(0,3).map(c => 
            '<li>' + getRepoBadge(c.repo) + '<span class="commit-hash">' + c.hash + '</span> ' + c.message.substring(0,20) + '</li>'
          ).join('') + '</ul>';
        }
        
        // PR/CI
        let prCell = '<span class="no-data">-</span>';
        if (t.prs.length > 0) {
          prCell = t.prs.map(pr => {
            const checks = pr.checks.slice(0,3).map(c => '<span class="check check-' + (c.state?.toLowerCase() === 'success' ? 'success' : c.state?.toLowerCase() === 'failure' ? 'failure' : 'pending') + '" title="' + c.name + '"></span>').join('');
            return '<span class="pr-link">' + getRepoBadge(pr.repo) + '<a class="link" href="' + pr.url + '" target="_blank">#' + pr.number + '</a>' + checks + '</span>';
          }).join('');
        }
        
        // ログ
        let logCell = '<span class="no-data">-</span>';
        if (t.logs.length > 0) {
          logCell = t.logs.map(l => '<span class="badge badge-' + l.status + '">' + l.status + '</span>').join(' ');
        }
        
        return '<tr class="' + (isDone ? 'done' : '') + '">' +
          '<td class="task-id">' + t.id + '</td>' +
          '<td class="task-name" title="' + t.name + '">' + t.name.substring(0,35) + (t.name.length > 35 ? '...' : '') + '</td>' +
          '<td>' + getStateBadge(t.state) + '</td>' +
          '<td>' + ssotCell + '</td>' +
          '<td>' + auditCell + '</td>' +
          '<td class="expand-cell">' + gitCell + '</td>' +
          '<td class="expand-cell">' + prCell + '</td>' +
          '<td>' + logCell + '</td>' +
          '<td class="date">' + formatDate(t.updatedAt) + '</td>' +
          '</tr>';
      }).join('');
      document.getElementById('tasks-body').innerHTML = html || '<tr><td colspan="9" class="no-data">タスクなし</td></tr>';
    }
    
    async function loadData() {
      try {
        const res = await fetch('/api/dashboard');
        allData = await res.json();
        document.getElementById('updated').textContent = '更新: ' + formatDateTime(allData.updatedAt);
        
        renderTasks();
        
        // リポジトリ
        document.getElementById('impl-body').innerHTML = allData.implementation.map(r => 
          '<tr><td>' + getRepoBadge(r.repo) + r.repo + '</td><td>' + (r.branch||'-') + '</td><td><span class="commit-hash">' + (r.lastCommit?.hash||'-') + '</span> ' + (r.lastCommit?.message||'').substring(0,40) + '</td><td>' + (r.uncommittedChanges > 0 ? '<span style="color:#da3633;">' + r.uncommittedChanges + '</span>' : '✓') + '</td></tr>'
        ).join('');
        
        // Git履歴
        document.getElementById('git-body').innerHTML = allData.gitHistory.slice(0,50).map(c => 
          '<tr><td>' + getRepoBadge(c.repo) + '</td><td class="commit-hash">' + c.hash + '</td><td>' + c.message.substring(0,60) + '</td><td class="date">' + c.date + '</td><td>' + (c.devId ? '<span class="task-id">' + c.devId + '</span>' : '-') + '</td></tr>'
        ).join('') || '<tr><td colspan="5" class="no-data">履歴なし</td></tr>';
        
        // PR
        let prsHtml = '';
        for (const [repo, info] of Object.entries(allData.github)) {
          for (const pr of info.prs || []) {
            const checks = pr.checks.map(c => '<span class="check check-' + (c.state?.toLowerCase() === 'success' ? 'success' : c.state?.toLowerCase() === 'failure' ? 'failure' : 'pending') + '" title="' + c.name + ': ' + c.state + '"></span>').join('');
            prsHtml += '<tr><td>' + getRepoBadge(repo) + '</td><td><a class="link" href="' + pr.url + '" target="_blank">#' + pr.number + '</a></td><td>' + pr.title.substring(0,40) + '</td><td>' + pr.branch + '</td><td>' + (pr.state === 'OPEN' ? '<span class="badge badge-progress">Open</span>' : '<span class="badge badge-done">Merged</span>') + '</td><td>' + checks + '</td></tr>';
          }
        }
        document.getElementById('prs-body').innerHTML = prsHtml || '<tr><td colspan="6" class="no-data">PRなし</td></tr>';
        
        // キュー
        document.getElementById('queue-pending').textContent = allData.queue.pending;
        document.getElementById('queue-completed').textContent = allData.queue.completed;
        document.getElementById('queue-failed').textContent = allData.queue.failed;
        document.getElementById('queue-processing').innerHTML = allData.queue.processing ? '⏳ 処理中: <strong>' + allData.queue.processing + '</strong>' : '<span class="no-data">処理中のタスクなし</span>';
        
        // ログ
        document.getElementById('logs-body').innerHTML = allData.logs.map(l => 
          '<tr><td class="task-id">' + (l.taskId||'-') + '</td><td class="date">' + formatDateTime(l.startTime) + '</td><td><span class="badge badge-' + l.status + '">' + l.status + '</span></td><td>' + l.logCount + '</td></tr>'
        ).join('') || '<tr><td colspan="4" class="no-data">ログなし</td></tr>';
        
      } catch (e) { console.error(e); }
    }
    
    loadData();
    setInterval(loadData, 30000);
  </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) {
    await handleAPI(req, res);
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.end(HTML);
  }
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🏨 hotel-kanri 自動開発ダッシュボード v2.1              ║
╠══════════════════════════════════════════════════════════╣
║  URL: http://localhost:${PORT}                            ║
╚══════════════════════════════════════════════════════════╝
`);
});
