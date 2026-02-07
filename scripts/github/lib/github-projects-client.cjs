#!/usr/bin/env node
/**
 * GitHub Projects V2 API Client - 標準化されたAPI接続ライブラリ
 *
 * 【重要】GitHub Projects に接続する際は、必ずこのライブラリを使用すること
 * - 認証: gh CLI 経由（ghp_xxx トークン不要）
 * - API: GitHub GraphQL API v4 + REST API v3
 *
 * Plane API Client と同等のインターフェースを提供
 *
 * @module github-projects-client
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ============================================================
// 設定
// ============================================================

const DEFAULTS = {
  owner: 'watchout',
  repo: 'hotel-kanri',
  projectNumber: 3,
};

/**
 * 環境変数を.env.mcpから読み込む（plane-api-client互換）
 */
function loadEnv() {
  const ROOT = path.resolve(__dirname, '../../..');
  const env = {};
  try {
    const envFilePath = path.join(ROOT, '.env.mcp');
    if (!fs.existsSync(envFilePath)) return env;
    const content = fs.readFileSync(envFilePath, 'utf8');
    for (let line of content.split(/\r?\n/)) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;
      if (line.endsWith('\\')) line = line.slice(0, -1).trim();
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      let value = match[2].trim();
      if (value.endsWith('\\')) value = value.slice(0, -1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1).trim();
      }
      env[match[1]] = value;
    }
  } catch { /* ignore */ }
  return env;
}

/**
 * GitHub設定を取得
 */
function getGitHubConfig() {
  const env = loadEnv();
  const get = (k) => (process.env[k] ?? env[k] ?? '');

  return {
    owner: get('GITHUB_OWNER') || DEFAULTS.owner,
    repo: get('GITHUB_REPO') || DEFAULTS.repo,
    projectNumber: parseInt(get('GITHUB_PROJECT_NUMBER') || DEFAULTS.projectNumber, 10),
  };
}

// ============================================================
// gh CLI ヘルパー（高速版）
// ============================================================

/**
 * GitHub REST API 呼び出し
 */
function restApi(method, endpoint, body) {
  try {
    const bodyArg = body ? ' --input -' : '';
    const methodArg = method === 'GET' ? '' : `-X ${method}`;
    const cmd = `gh api ${methodArg} "${endpoint}"${bodyArg}`;
    const result = execSync(cmd, {
      encoding: 'utf8',
      timeout: 15000,
      input: body ? JSON.stringify(body) : undefined,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return JSON.parse(result);
  } catch (err) {
    const stderr = err.stderr?.trim() || '';
    if (stderr.includes('rate limit')) {
      console.error('    ⏳ Rate limit hit - waiting 60s...');
      execSync('sleep 60');
      return restApi(method, endpoint, body);
    }
    throw new Error(`GitHub REST API Error: ${stderr.substring(0, 200)}`);
  }
}

/**
 * GitHub GraphQL API 呼び出し
 */
function graphql(query) {
  try {
    const escaped = query.replace(/'/g, "'\\''");
    const result = execSync(`gh api graphql -f query='${escaped}'`, {
      encoding: 'utf8',
      timeout: 15000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const parsed = JSON.parse(result);
    if (parsed.errors?.length) {
      throw new Error(`GraphQL Error: ${parsed.errors[0].message}`);
    }
    return parsed.data;
  } catch (err) {
    if (err.message?.includes('GraphQL Error')) throw err;
    const stderr = err.stderr?.trim() || '';
    if (stderr.includes('rate limit')) {
      console.error('    ⏳ Rate limit hit - waiting 60s...');
      execSync('sleep 60');
      return graphql(query);
    }
    throw new Error(`GitHub GraphQL Error: ${stderr.substring(0, 200)}`);
  }
}

// ============================================================
// プロジェクトメタデータキャッシュ
// ============================================================

let _projectMeta = null;

/**
 * プロジェクトメタデータ（ID, フィールド, ステータス選択肢）を取得・キャッシュ
 */
function getProjectMeta() {
  if (_projectMeta) return _projectMeta;

  const config = getGitHubConfig();
  const data = graphql(`
    {
      user(login: "${config.owner}") {
        projectV2(number: ${config.projectNumber}) {
          id
          fields(first: 30) {
            nodes {
              ... on ProjectV2Field { id name }
              ... on ProjectV2SingleSelectField { id name options { id name } }
            }
          }
        }
      }
    }
  `);

  const project = data.user.projectV2;
  const fields = {};
  const options = {};

  for (const f of project.fields.nodes) {
    fields[f.name] = f.id;
    if (f.options) {
      options[f.name] = {};
      for (const o of f.options) {
        options[f.name][o.name] = o.id;
      }
    }
  }

  _projectMeta = {
    projectId: project.id,
    fields,
    options,
  };
  return _projectMeta;
}

/** キャッシュクリア */
function clearCache() {
  _projectMeta = null;
}

// ============================================================
// Issue 操作（REST API）
// ============================================================

/**
 * Issue 一覧取得（全件）
 */
function listIssues(state = 'all', perPage = 100) {
  const config = getGitHubConfig();
  const allIssues = [];
  let page = 1;

  while (true) {
    const batch = restApi('GET',
      `/repos/${config.owner}/${config.repo}/issues?state=${state}&per_page=${perPage}&page=${page}&direction=asc`
    );
    if (!batch || batch.length === 0) break;
    // Pull Requests を除外
    allIssues.push(...batch.filter(i => !i.pull_request));
    if (batch.length < perPage) break;
    page++;
  }
  return allIssues;
}

/**
 * Issue を番号で取得
 */
function getIssue(issueNumber) {
  const config = getGitHubConfig();
  return restApi('GET', `/repos/${config.owner}/${config.repo}/issues/${issueNumber}`);
}

/**
 * Issue を作成
 */
function createIssue(data) {
  const config = getGitHubConfig();
  return restApi('POST', `/repos/${config.owner}/${config.repo}/issues`, data);
}

/**
 * Issue を更新
 */
function updateIssue(issueNumber, data) {
  const config = getGitHubConfig();
  return restApi('PATCH', `/repos/${config.owner}/${config.repo}/issues/${issueNumber}`, data);
}

/**
 * Issue をクローズ（Done相当）
 */
function closeIssue(issueNumber) {
  return updateIssue(issueNumber, { state: 'closed', state_reason: 'completed' });
}

// ============================================================
// Project Item 操作（GraphQL）
// ============================================================

/**
 * Issue を Project に追加
 * @returns {string} item ID
 */
function addToProject(issueNodeId) {
  const meta = getProjectMeta();
  const data = graphql(`
    mutation {
      addProjectV2ItemById(input: {
        projectId: "${meta.projectId}",
        contentId: "${issueNodeId}"
      }) {
        item { id }
      }
    }
  `);
  return data.addProjectV2ItemById?.item?.id;
}

/**
 * Project Item のフィールドを設定
 */
function setItemField(itemId, fieldName, value) {
  const meta = getProjectMeta();
  const fieldId = meta.fields[fieldName];
  if (!fieldId) throw new Error(`Field "${fieldName}" not found`);

  // SingleSelect の場合はオプションIDに変換
  if (meta.options[fieldName]) {
    const optionId = meta.options[fieldName][value];
    if (!optionId) throw new Error(`Option "${value}" not found for field "${fieldName}"`);
    graphql(`
      mutation {
        updateProjectV2ItemFieldValue(input: {
          projectId: "${meta.projectId}",
          itemId: "${itemId}",
          fieldId: "${fieldId}",
          value: { singleSelectOptionId: "${optionId}" }
        }) { projectV2Item { id } }
      }
    `);
  } else {
    // Text フィールド
    graphql(`
      mutation {
        updateProjectV2ItemFieldValue(input: {
          projectId: "${meta.projectId}",
          itemId: "${itemId}",
          fieldId: "${fieldId}",
          value: { text: "${value.replace(/"/g, '\\"')}" }
        }) { projectV2Item { id } }
      }
    `);
  }
}

/**
 * 複数フィールドを一括設定（1回のGraphQL呼び出し）
 */
function setItemFields(itemId, fieldsObj) {
  const meta = getProjectMeta();
  const mutations = [];

  for (const [fieldName, value] of Object.entries(fieldsObj)) {
    if (!value) continue;
    const fieldId = meta.fields[fieldName];
    if (!fieldId) continue;

    const alias = fieldName.replace(/\s/g, '_');

    if (meta.options[fieldName]) {
      const optionId = meta.options[fieldName][value];
      if (!optionId) continue;
      mutations.push(
        `${alias}: updateProjectV2ItemFieldValue(input: { projectId: "${meta.projectId}", itemId: "${itemId}", fieldId: "${fieldId}", value: { singleSelectOptionId: "${optionId}" } }) { projectV2Item { id } }`
      );
    } else {
      mutations.push(
        `${alias}: updateProjectV2ItemFieldValue(input: { projectId: "${meta.projectId}", itemId: "${itemId}", fieldId: "${fieldId}", value: { text: "${String(value).replace(/"/g, '\\"')}" } }) { projectV2Item { id } }`
      );
    }
  }

  if (mutations.length > 0) {
    graphql(`mutation { ${mutations.join('\n')} }`);
  }
}

/**
 * Project Items 一覧取得（全フィールド値つき）
 */
function listProjectItems(first = 100) {
  const config = getGitHubConfig();
  const meta = getProjectMeta();

  const data = graphql(`
    {
      user(login: "${config.owner}") {
        projectV2(number: ${config.projectNumber}) {
          items(first: ${first}) {
            nodes {
              id
              content {
                ... on Issue {
                  number
                  title
                  state
                  url
                }
              }
              fieldValues(first: 20) {
                nodes {
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field { ... on ProjectV2Field { name } }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field { ... on ProjectV2SingleSelectField { name } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `);

  return data.user.projectV2.items.nodes.map(item => {
    const fields = {};
    for (const fv of item.fieldValues?.nodes || []) {
      const name = fv.field?.name;
      if (name) {
        fields[name] = fv.text || fv.name || null;
      }
    }
    return {
      itemId: item.id,
      issue: item.content,
      fields,
    };
  });
}

// ============================================================
// 高レベル便利関数
// ============================================================

/**
 * DEV番号でIssueを検索
 * @param {string} devNumber - "DEV-0181" 形式
 * @returns {Object|null}
 */
function findByDevNumber(devNumber) {
  const issues = listIssues('all');
  return issues.find(i => i.title.includes(`[${devNumber}]`)) || null;
}

/**
 * タイトルの[DEV-XXXX]からDEV番号を抽出
 */
function extractDevNumber(title) {
  const match = title?.match(/\[DEV-(\d+)\]/);
  return match ? `DEV-${match[1]}` : null;
}

/**
 * タイトルの[Phase N]からPhase を抽出
 */
function extractPhase(title) {
  const match = title?.match(/\[Phase\s*(\d+)\]/i);
  if (match) return `Phase ${match[1]}`;
  if (title?.includes('[MVP]')) return 'Phase 1';
  return null;
}

/**
 * Project のステータス選択肢を取得
 */
function getStatusOptions() {
  const meta = getProjectMeta();
  return meta.options['Status'] || {};
}

// ============================================================
// エクスポート
// ============================================================

module.exports = {
  // 設定
  getGitHubConfig,
  loadEnv,
  clearCache,

  // 低レベルAPI
  restApi,
  graphql,

  // プロジェクトメタデータ
  getProjectMeta,

  // Issue操作
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  closeIssue,

  // Project操作
  addToProject,
  setItemField,
  setItemFields,
  listProjectItems,

  // 便利関数
  findByDevNumber,
  extractDevNumber,
  extractPhase,
  getStatusOptions,
};
