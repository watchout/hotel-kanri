#!/usr/bin/env node
/**
 * Plane API Client - 標準化されたAPI接続ライブラリ
 * 
 * 【重要】Plane APIに接続する際は、必ずこのライブラリを使用すること
 * - 認証: x-api-key ヘッダー（Authorization: Bearerは使用禁止）
 * - エンドポイント: /api/v1/workspaces/{ws}/projects/{proj}/...
 * 
 * @module plane-api-client
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * 環境変数を.env.mcpから読み込む
 * @returns {Object} 環境変数オブジェクト
 */
function loadEnv() {
  const ROOT = path.resolve(__dirname, '../../..');
  const env = {};
  try {
    const content = fs.readFileSync(path.join(ROOT, '.env.mcp'), 'utf8');
    const lines = content.split(/\r?\n/);
    
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;
      
      // 末尾の \ を削除（継続行の処理）
      if (line.endsWith('\\')) line = line.slice(0, -1).trim();
      
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      
      let value = match[2].trim();
      // 末尾の \ を再度削除
      if (value.endsWith('\\')) value = value.slice(0, -1).trim();
      // クォートを削除
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1).trim();
      }
      
      env[match[1]] = value;
    }
  } catch (err) {
    console.error('⚠️  .env.mcpの読み込みに失敗しました:', err.message);
  }
  return env;
}

/**
 * Plane API設定を取得
 * @returns {Object} { host, apiKey, workspace, projectId }
 * @throws {Error} 必須設定が不足している場合
 */
function getPlaneConfig() {
  const env = loadEnv();
  
  let host = env.PLANE_API_HOST_URL || '';
  if (host && !/^https?:\/\//i.test(host)) {
    host = 'https://' + host;
  }
  
  const apiKey = env.PLANE_API_KEY || '';
  const workspace = env.PLANE_WORKSPACE_SLUG || env.PLANE_WORKSPACE_ID || '';
  const projectId = env.PLANE_PROJECT_ID || '';
  
  if (!host) {
    throw new Error('❌ PLANE_API_HOST_URL が設定されていません');
  }
  if (!apiKey) {
    throw new Error('❌ PLANE_API_KEY が設定されていません');
  }
  if (!workspace) {
    throw new Error('❌ PLANE_WORKSPACE_SLUG が設定されていません');
  }
  if (!projectId) {
    throw new Error('❌ PLANE_PROJECT_ID が設定されていません');
  }
  
  return { host, apiKey, workspace, projectId };
}

/**
 * HTTPリクエストを実行（低レベルAPI）
 * @param {string} method - HTTPメソッド
 * @param {string} url - 完全なURL
 * @param {Object} headers - リクエストヘッダー
 * @param {string} [body] - リクエストボディ（JSON文字列）
 * @returns {Promise<{code: number, body: string, err?: string}>}
 */
function httpRequest(method, url, headers, body) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const options = {
      method,
      headers,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ code: res.statusCode, body: data }));
    });
    
    req.on('error', (err) => resolve({ err: String(err) }));
    
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Plane APIリクエストを実行（標準化されたAPI）
 * 
 * 【重要】このメソッドは必ず以下の仕様に従います：
 * - 認証ヘッダー: x-api-key
 * - Content-Type: application/json
 * - エンドポイント: /api/v1/workspaces/{ws}/projects/{proj}/...
 * 
 * @param {string} method - HTTPメソッド（GET, POST, PATCH, DELETE等）
 * @param {string} endpoint - エンドポイント（/api/v1/... から始まる相対パス）
 * @param {Object} [data] - リクエストボディ（自動的にJSON文字列化）
 * @returns {Promise<Object>} レスポンスJSON
 * @throws {Error} APIエラーまたはネットワークエラー
 */
async function request(method, endpoint, data = null) {
  const config = getPlaneConfig();
  
  // エンドポイントの正規化
  let normalizedEndpoint = endpoint;
  if (!normalizedEndpoint.startsWith('/')) {
    normalizedEndpoint = '/' + normalizedEndpoint;
  }
  
  const url = config.host + normalizedEndpoint;
  
  // 【必須】x-api-key ヘッダーを使用
  const headers = {
    'x-api-key': config.apiKey,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  const body = data ? JSON.stringify(data) : null;
  
  const response = await httpRequest(method, url, headers, body);
  
  if (response.err) {
    throw new Error(`Plane API Error: ${response.err}`);
  }
  
  if (!response.code || response.code < 200 || response.code >= 300) {
    const errorBody = response.body || 'No response body';
    throw new Error(`Plane API Error: HTTP ${response.code} - ${errorBody}`);
  }
  
  try {
    return JSON.parse(response.body);
  } catch (err) {
    // 空レスポンスの場合（204 No Content等）
    if (!response.body || response.body.trim() === '') {
      return {};
    }
    throw new Error(`Plane API Error: Invalid JSON response - ${err.message}`);
  }
}

/**
 * Issueを取得
 * @param {string} issueId - Issue ID
 * @returns {Promise<Object>}
 */
async function getIssue(issueId) {
  const config = getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/${issueId}/`;
  return request('GET', endpoint);
}

/**
 * Issueを作成
 * @param {Object} issueData - Issue作成データ
 * @returns {Promise<Object>}
 */
async function createIssue(issueData) {
  const config = getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  return request('POST', endpoint, issueData);
}

/**
 * Issueを更新
 * @param {string} issueId - Issue ID
 * @param {Object} updateData - 更新データ
 * @returns {Promise<Object>}
 */
async function updateIssue(issueId, updateData) {
  const config = getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/${issueId}/`;
  return request('PATCH', endpoint, updateData);
}

/**
 * Issueを削除
 * @param {string} issueId - Issue ID
 * @returns {Promise<Object>}
 */
async function deleteIssue(issueId) {
  const config = getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/${issueId}/`;
  return request('DELETE', endpoint);
}

/**
 * ラベルを作成
 * @param {Object} labelData - ラベル作成データ
 * @returns {Promise<Object>}
 */
async function createLabel(labelData) {
  const config = getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/labels/`;
  return request('POST', endpoint, labelData);
}

/**
 * Stateを取得
 * @returns {Promise<Array>}
 */
async function getStates() {
  const config = getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/states/`;
  return request('GET', endpoint);
}

// 設定を初期化時に取得
const initialConfig = getPlaneConfig();

module.exports = {
  // 設定
  getPlaneConfig,
  loadEnv,
  PLANE_API_HOST_URL: initialConfig.host,
  PLANE_API_KEY: initialConfig.apiKey,
  PLANE_WORKSPACE_SLUG: initialConfig.workspace,
  PLANE_PROJECT_ID: initialConfig.projectId,
  
  // 汎用API
  request,
  
  // Issue操作
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
  
  // その他
  createLabel,
  getStates,
};

