#!/usr/bin/env node
/**
 * PR作成時にPlaneのステータスを自動更新
 * Usage: node update-plane-from-pr.cjs <PR_TITLE> <PR_URL> <ACTION>
 * 
 * ACTION:
 *   - opened: In Progress → In Review
 *   - merged: In Review → Done
 *   - closed: In Review → Backlog
 */

const path = require('path');

// 環境変数読み込み
require('dotenv').config({ path: path.join(__dirname, '../../.env.mcp') });

const PLANE_API_HOST = process.env.PLANE_API_HOST_URL;
const PLANE_API_KEY = process.env.PLANE_API_KEY;
const WORKSPACE = 'co';
const PROJECT_ID = '7e187231-3f93-44cd-9892-a9322ebd4312';

// State IDs (プロジェクト固有)
const STATES = {
  BACKLOG: '2564ad4a-abd6-4b05-9af0-2c3dcd28e2be',
  IN_PROGRESS: 'c576eed5-315c-44b9-a3cb-db67d73423b7',
  IN_REVIEW: 'a1234567-xxxx-xxxx-xxxx-xxxxxxxxxxxx', // TODO: 実際のIDに更新
  DONE: '86937979-4727-4ec9-81be-585f7aae981d'
};

async function extractDevId(prTitle) {
  const match = prTitle.match(/DEV-(\d+)/i);
  return match ? `DEV-${match[1]}` : null;
}

async function findIssueByDevId(devId) {
  const url = `${PLANE_API_HOST}/api/v1/workspaces/${WORKSPACE}/projects/${PROJECT_ID}/issues/`;
  
  const response = await fetch(url, {
    headers: { 'x-api-key': PLANE_API_KEY }
  });
  
  if (!response.ok) {
    throw new Error(`Plane API error: ${response.status}`);
  }
  
  const data = await response.json();
  const issues = data.results || data;
  
  return issues.find(issue => 
    issue.name?.includes(devId) || 
    issue.sequence_id?.toString() === devId.replace('DEV-', '')
  );
}

async function updateIssueState(issueId, newStateId, prUrl) {
  const url = `${PLANE_API_HOST}/api/v1/workspaces/${WORKSPACE}/projects/${PROJECT_ID}/issues/${issueId}/`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'x-api-key': PLANE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      state: newStateId,
      // PRリンクを説明に追加（オプション）
    })
  });
  
  if (!response.ok) {
    throw new Error(`Update failed: ${response.status}`);
  }
  
  return await response.json();
}

async function main() {
  const [,, prTitle, prUrl, action] = process.argv;
  
  if (!prTitle || !action) {
    console.error('Usage: node update-plane-from-pr.cjs <PR_TITLE> <PR_URL> <ACTION>');
    process.exit(1);
  }
  
  console.log(`🔄 Processing: ${prTitle}`);
  console.log(`   Action: ${action}`);
  
  // DEV-XXXX抽出
  const devId = await extractDevId(prTitle);
  if (!devId) {
    console.log('ℹ️  No DEV-XXXX found in PR title, skipping Plane update');
    process.exit(0);
  }
  
  console.log(`   Task ID: ${devId}`);
  
  // Issue検索
  const issue = await findIssueByDevId(devId);
  if (!issue) {
    console.log(`⚠️  Issue not found for ${devId}`);
    process.exit(0);
  }
  
  console.log(`   Issue: ${issue.name}`);
  
  // アクションに応じたステート更新
  let newStateId;
  switch (action) {
    case 'opened':
      newStateId = STATES.IN_REVIEW;
      break;
    case 'merged':
      newStateId = STATES.DONE;
      break;
    case 'closed':
      newStateId = STATES.BACKLOG;
      break;
    default:
      console.log(`ℹ️  Unknown action: ${action}`);
      process.exit(0);
  }
  
  // 更新実行
  try {
    await updateIssueState(issue.id, newStateId, prUrl);
    console.log(`✅ Updated ${devId} state`);
  } catch (error) {
    console.error(`❌ Failed to update: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
