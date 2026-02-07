#!/usr/bin/env node
/**
 * 自動開発システム - 接続確認スクリプト
 * 
 * 全サービスとの接続状況を確認し、問題があれば報告する
 * 
 * Usage: node check-connections.cjs
 * 
 * @version 1.0.0
 */

const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 環境変数読み込み
const envPath = path.join(__dirname, '../../.env.mcp');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return;
    
    const key = line.substring(0, eqIndex).trim();
    let value = line.substring(eqIndex + 1).trim();
    
    // クォートを削除
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    
    process.env[key] = value;
  });
}

// ===== ユーティリティ =====

function log(service, status, message) {
  const emoji = status === 'OK' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${emoji} ${service.padEnd(15)} ${message}`);
}

async function httpGet(url, headers = {}) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const options = {
      method: 'GET',
      headers,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ code: res.statusCode, body: data }));
    });
    
    req.on('error', (err) => resolve({ error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'タイムアウト' });
    });
    req.end();
  });
}

// ===== 接続チェック =====

async function checkPlaneAPI() {
  let host = process.env.PLANE_API_HOST_URL || '';
  const apiKey = process.env.PLANE_API_KEY;
  const workspace = process.env.PLANE_WORKSPACE_SLUG;
  const projectId = process.env.PLANE_PROJECT_ID;
  
  if (!host || !apiKey || !workspace || !projectId) {
    log('Plane API', 'ERROR', '環境変数が不足しています');
    return false;
  }
  
  // https:// がなければ追加
  if (!/^https?:\/\//i.test(host)) {
    host = 'https://' + host;
  }
  
  const url = `${host}/api/v1/workspaces/${workspace}/projects/${projectId}/issues/?per_page=1`;
  const result = await httpGet(url, { 'x-api-key': apiKey });
  
  if (result.error) {
    log('Plane API', 'ERROR', result.error);
    return false;
  }
  
  if (result.code === 200) {
    try {
      const data = JSON.parse(result.body);
      const count = data.count || (data.results || data).length;
      log('Plane API', 'OK', `接続成功 (${count}件のIssue)`);
      return true;
    } catch (e) {
      log('Plane API', 'WARN', 'レスポンス解析エラー');
      return true;
    }
  } else {
    log('Plane API', 'ERROR', `HTTP ${result.code}`);
    return false;
  }
}

async function checkOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    log('OpenAI', 'WARN', '環境変数が未設定（監査機能が制限されます）');
    return false;
  }
  
  const result = await httpGet('https://api.openai.com/v1/models', {
    'Authorization': `Bearer ${apiKey}`
  });
  
  if (result.error) {
    log('OpenAI', 'ERROR', result.error);
    return false;
  }
  
  if (result.code === 200) {
    log('OpenAI', 'OK', '接続成功');
    return true;
  } else {
    log('OpenAI', 'ERROR', `HTTP ${result.code}`);
    return false;
  }
}

async function checkGoogleAI() {
  const apiKey = process.env.GOOGLE_API_KEY;
  
  if (!apiKey) {
    log('Google AI', 'WARN', '環境変数が未設定（監査機能が制限されます）');
    return false;
  }
  
  const result = await httpGet(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  
  if (result.error) {
    log('Google AI', 'ERROR', result.error);
    return false;
  }
  
  if (result.code === 200) {
    log('Google AI', 'OK', '接続成功');
    return true;
  } else {
    log('Google AI', 'ERROR', `HTTP ${result.code}`);
    return false;
  }
}

async function checkGitHub() {
  try {
    const result = execSync('gh api user --jq ".login"', { encoding: 'utf8', timeout: 10000 });
    log('GitHub', 'OK', `接続成功 (${result.trim()})`);
    return true;
  } catch (error) {
    log('GitHub', 'ERROR', 'gh CLI認証エラー');
    return false;
  }
}

async function checkClaudeCLI() {
  try {
    const result = execSync('claude --version', { encoding: 'utf8', timeout: 10000 });
    log('Claude CLI', 'OK', `${result.trim()}`);
    return true;
  } catch (error) {
    log('Claude CLI', 'WARN', '未インストール（バックグラウンド実行のみ使用可）');
    return false;
  }
}

function checkTaskQueue() {
  const queuePath = path.join(__dirname, '../../task-queue.json');
  
  if (!fs.existsSync(queuePath)) {
    log('Task Queue', 'WARN', 'task-queue.json が存在しません');
    return false;
  }
  
  try {
    const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    const pending = queue.queue?.length || 0;
    const processing = queue.processing ? 1 : 0;
    const completed = queue.completed?.length || 0;
    
    log('Task Queue', 'OK', `待機: ${pending}, 処理中: ${processing}, 完了: ${completed}`);
    return true;
  } catch (error) {
    log('Task Queue', 'ERROR', `読み込みエラー: ${error.message}`);
    return false;
  }
}

// ===== メイン =====

async function main() {
  console.log('');
  console.log('━'.repeat(60));
  console.log('🔌 自動開発システム - 接続確認');
  console.log('━'.repeat(60));
  console.log('');
  
  const results = {};
  
  // 必須サービス
  console.log('【必須サービス】');
  results.plane = await checkPlaneAPI();
  results.github = await checkGitHub();
  results.queue = checkTaskQueue();
  
  console.log('');
  console.log('【オプションサービス】');
  results.openai = await checkOpenAI();
  results.google = await checkGoogleAI();
  results.claude = await checkClaudeCLI();
  
  console.log('');
  console.log('━'.repeat(60));
  
  // サマリー
  const critical = results.plane && results.github;
  const optional = results.openai || results.google;
  
  if (critical && optional) {
    console.log('✅ 全サービス接続OK - 自動開発を開始できます');
  } else if (critical) {
    console.log('⚠️ 必須サービスOK、オプションサービスに問題あり');
    console.log('   → マルチLLM監査が制限されますが、自動開発は可能です');
  } else {
    console.log('❌ 必須サービスに問題があります');
    console.log('   → 自動開発を開始できません。上記エラーを解消してください');
    process.exit(1);
  }
  
  console.log('━'.repeat(60));
  console.log('');
  
  // 次のアクション
  if (critical) {
    console.log('📋 次のステップ:');
    console.log('');
    console.log('1. Planeからタスク同期:');
    console.log('   node scripts/auto-dev/sync-plane-to-queue.cjs');
    console.log('');
    console.log('2. 自動開発開始:');
    console.log('   node scripts/auto-dev/run-task.cjs DEV-XXXX');
    console.log('');
  }
}

main().catch(error => {
  console.error('❌ エラー:', error.message);
  process.exit(1);
});
