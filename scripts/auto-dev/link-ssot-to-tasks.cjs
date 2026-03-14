#!/usr/bin/env node
/**
 * SSOTとPlaneタスクの自動紐付けスクリプト
 * 
 * タスク名からキーワードを抽出し、適切なSSOTを推測してPlaneに登録
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../..');

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

const planeApi = require('../plane/lib/plane-api-client.cjs');

// SSOTキーワードマッピング
const SSOT_KEYWORDS = {
  // 認証系
  'auth': 'SSOT_SAAS_ADMIN_AUTHENTICATION.md',
  'authentication': 'SSOT_SAAS_ADMIN_AUTHENTICATION.md',
  'login': 'SSOT_SAAS_ADMIN_AUTHENTICATION.md',
  'session': 'SSOT_SAAS_ADMIN_AUTHENTICATION.md',
  'device': 'SSOT_SAAS_DEVICE_AUTHENTICATION.md',
  'デバイス': 'SSOT_SAAS_DEVICE_AUTHENTICATION.md',
  
  // マルチテナント
  'tenant': 'SSOT_SAAS_MULTITENANT.md',
  'テナント': 'SSOT_SAAS_MULTITENANT.md',
  'switch-tenant': 'SSOT_SAAS_MULTITENANT.md',
  
  // データベース
  'database': 'SSOT_SAAS_DATABASE_SCHEMA.md',
  'db': 'SSOT_SAAS_DATABASE_SCHEMA.md',
  'schema': 'SSOT_SAAS_DATABASE_SCHEMA.md',
  'prisma': 'SSOT_SAAS_DATABASE_SCHEMA.md',
  
  // API
  'api': 'SSOT_API_REGISTRY.md',
  'endpoint': 'SSOT_API_REGISTRY.md',
  'routing': 'SSOT_API_REGISTRY.md',
  
  // メディア
  'media': 'SSOT_SAAS_MEDIA_MANAGEMENT.md',
  'image': 'SSOT_SAAS_MEDIA_MANAGEMENT.md',
  '画像': 'SSOT_SAAS_MEDIA_MANAGEMENT.md',
  
  // メール
  'email': 'SSOT_SAAS_EMAIL_SYSTEM.md',
  'mail': 'SSOT_SAAS_EMAIL_SYSTEM.md',
  'メール': 'SSOT_SAAS_EMAIL_SYSTEM.md',
  
  // 多言語
  'multilingual': 'SSOT_MULTILINGUAL_SYSTEM.md',
  'i18n': 'SSOT_MULTILINGUAL_SYSTEM.md',
  '多言語': 'SSOT_MULTILINGUAL_SYSTEM.md',
  
  // 品質
  'quality': 'SSOT_QUALITY_CHECKLIST.md',
  'test': 'SSOT_TEST_DEBUG_INFRASTRUCTURE.md',
  'テスト': 'SSOT_TEST_DEBUG_INFRASTRUCTURE.md',
  
  // ハンドオフ
  'handoff': 'SSOT_HANDOFF.md',
  'ハンドオフ': 'SSOT_HANDOFF.md',
  '通知': 'SSOT_HANDOFF.md',
  
  // UI/UX
  'ui': 'SSOT_UICTA.md',
  'cta': 'SSOT_UICTA.md',
  'ux': 'SSOT_UICTA.md',
  
  // ゲスト
  'guest': 'SSOT_GUEST_PAGE_REGISTRY.md',
  'ゲスト': 'SSOT_GUEST_PAGE_REGISTRY.md',
  'menu': 'SSOT_GUEST_PAGE_REGISTRY.md',
  'メニュー': 'SSOT_GUEST_PAGE_REGISTRY.md',
  
  // 価格
  'pricing': 'SSOT_PRICING_ENTITLEMENTS.md',
  'price': 'SSOT_PRICING_ENTITLEMENTS.md',
  '価格': 'SSOT_PRICING_ENTITLEMENTS.md',
  
  // 自動開発
  'auto-dev': 'SSOT_AUTO_DEV_SYSTEM.md',
  '自動開発': 'SSOT_AUTO_DEV_SYSTEM.md',
  'automation': 'SSOT_AUTO_DEV_SYSTEM.md',
  
  // マーケティング
  'marketing': 'SSOT_MARKETING_STRATEGY.md',
  'マーケ': 'SSOT_MARKETING_STRATEGY.md',
};

/**
 * 全SSOTファイルを取得
 */
function getAllSSOTFiles() {
  const ssotDir = path.join(ROOT, 'docs/03_ssot');
  const files = {};
  
  function scanDir(dir) {
    try {
      for (const file of fs.readdirSync(dir)) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !file.startsWith('_')) {
          scanDir(filePath);
        } else if (file.endsWith('.md') && file.startsWith('SSOT_')) {
          const relativePath = filePath.replace(ROOT + '/', '');
          files[file] = relativePath;
        }
      }
    } catch (e) {}
  }
  
  scanDir(ssotDir);
  return files;
}

/**
 * タスク名からSSOTを推測
 */
function guessSSOT(taskName, allSSOTs) {
  const nameLower = taskName.toLowerCase();
  
  // キーワードマッチング
  for (const [keyword, ssotFile] of Object.entries(SSOT_KEYWORDS)) {
    if (nameLower.includes(keyword.toLowerCase())) {
      // 実際のファイルパスを検索
      for (const [file, path] of Object.entries(allSSOTs)) {
        if (file === ssotFile || file.includes(ssotFile.replace('.md', ''))) {
          return path;
        }
      }
    }
  }
  
  // ファイル名の部分一致
  for (const [file, filePath] of Object.entries(allSSOTs)) {
    const fileNameLower = file.toLowerCase();
    const words = nameLower.split(/[\s\-_\[\]（）()]+/).filter(w => w.length > 2);
    
    for (const word of words) {
      if (fileNameLower.includes(word)) {
        return filePath;
      }
    }
  }
  
  return null;
}

/**
 * Planeタスクを更新
 */
async function updateTaskDescription(issueId, currentDescription, ssotPath) {
  // 既にssot:が含まれている場合はスキップ
  if (currentDescription && currentDescription.includes('ssot:')) {
    return false;
  }
  
  const newDescription = (currentDescription || '') + `\n\n---\nssot: ${ssotPath}`;
  
  const config = planeApi.getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/${issueId}/`;
  
  await planeApi.request('PATCH', endpoint, {
    description_html: newDescription.replace(/\n/g, '<br>')
  });
  
  return true;
}

/**
 * メイン処理
 */
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  SSOT ↔ Planeタスク 自動紐付け                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(dryRun ? '⚠️  DRY RUN モード（実際の更新なし）\n' : '');
  
  // 1. 全SSOTファイル取得
  console.log('📂 SSOTファイル取得中...');
  const allSSOTs = getAllSSOTFiles();
  console.log(`   ${Object.keys(allSSOTs).length} 件のSSOTファイル\n`);
  
  // 2. Planeタスク取得
  console.log('📋 Planeタスク取得中...');
  const config = planeApi.getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  const result = await planeApi.request('GET', endpoint);
  const issues = result.results || result;
  console.log(`   ${issues.length} 件のタスク\n`);
  
  // 3. 紐付け処理
  console.log('🔗 紐付け処理...\n');
  
  const results = {
    linked: [],
    alreadyLinked: [],
    noMatch: [],
    errors: []
  };
  
  for (const issue of issues) {
    const devMatch = issue.name.match(/\[DEV-(\d+)\]/);
    if (!devMatch) continue;
    
    const devId = `DEV-${devMatch[1]}`;
    const taskName = issue.name;
    
    // 既にssot:が含まれているか確認
    if (issue.description && issue.description.includes('ssot:')) {
      results.alreadyLinked.push({ devId, taskName });
      continue;
    }
    
    // SSOTを推測
    const ssotPath = guessSSOT(taskName, allSSOTs);
    
    if (ssotPath) {
      console.log(`✅ ${devId}: ${taskName.substring(0, 50)}`);
      console.log(`   → ${ssotPath}`);
      
      if (!dryRun) {
        try {
          await updateTaskDescription(issue.id, issue.description, ssotPath);
          results.linked.push({ devId, taskName, ssotPath });
        } catch (e) {
          console.log(`   ❌ 更新失敗: ${e.message}`);
          results.errors.push({ devId, error: e.message });
        }
      } else {
        results.linked.push({ devId, taskName, ssotPath });
      }
    } else {
      console.log(`❓ ${devId}: ${taskName.substring(0, 50)}`);
      console.log(`   → SSOTが見つかりません`);
      results.noMatch.push({ devId, taskName });
    }
  }
  
  // 4. 結果サマリー
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  結果サマリー                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`✅ 紐付け成功: ${results.linked.length} 件`);
  console.log(`📎 既に紐付け済み: ${results.alreadyLinked.length} 件`);
  console.log(`❓ マッチなし: ${results.noMatch.length} 件`);
  console.log(`❌ エラー: ${results.errors.length} 件`);
  
  if (results.noMatch.length > 0) {
    console.log('\n--- マッチしなかったタスク ---');
    for (const item of results.noMatch.slice(0, 10)) {
      console.log(`  ${item.devId}: ${item.taskName.substring(0, 60)}`);
    }
  }
  
  // 結果をJSON保存
  const resultPath = path.join(ROOT, 'evidence/auto-dev/ssot-link-result.json');
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 結果保存: ${resultPath}`);
}

main().catch(console.error);
