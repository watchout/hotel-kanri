#!/usr/bin/env node
/**
 * SSOTのtickets:フィールドを自動補完
 * 
 * PlaneタスクのSSOT参照を解析し、対応するSSOTのtickets:フィールドに
 * タスクIDを追加します。
 * 
 * 使い方:
 *   node scripts/migration/backfill-ssot-tickets.cjs --dry-run  # 変更プレビュー
 *   node scripts/migration/backfill-ssot-tickets.cjs --apply    # 実際に適用
 * 
 * 環境変数（.env.mcpから自動読み込み）:
 *   PLANE_API_HOST_URL, PLANE_API_KEY, PLANE_WORKSPACE_SLUG, PLANE_PROJECT_ID
 */

const fs = require('fs');
const path = require('path');
const { getPlaneConfig, request } = require('../plane/lib/plane-api-client.cjs');

// 定数
const SSOT_ROOT = path.resolve(__dirname, '../../docs/03_ssot');

/**
 * YAML Front Matterを解析
 * @param {string} content - Markdownファイルの内容
 * @returns {Object} { hasFrontMatter, tickets, frontMatterEnd }
 */
function parseFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return { hasFrontMatter: false, tickets: [], frontMatterEnd: 0 };
  }
  
  const yaml = match[1];
  const frontMatterEnd = match[0].length;
  
  // tickets: の解析
  const ticketsMatch = yaml.match(/tickets:\s*\n((?:\s+-\s+[^\n]+\n)*)/);
  let tickets = [];
  
  if (ticketsMatch) {
    const ticketLines = ticketsMatch[1].match(/-\s+([^\s#\n]+)/g) || [];
    tickets = ticketLines.map(line => {
      const m = line.match(/-\s+([^\s#\n]+)/);
      return m ? m[1] : null;
    }).filter(Boolean);
  } else {
    // tickets: [] の形式もチェック
    const emptyTicketsMatch = yaml.match(/tickets:\s*\[\s*\]/);
    if (emptyTicketsMatch) {
      tickets = [];
    }
  }
  
  return { hasFrontMatter: true, tickets, frontMatterEnd, yaml };
}

/**
 * SSOTファイルを再帰的にスキャン
 * @returns {Map} ファイル名 → { path, content, tickets }
 */
function scanSSOTFiles() {
  const ssotMap = new Map();
  
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('_')) {
          scanDir(fullPath);
        }
      } else if (entry.name.startsWith('SSOT_') && entry.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const frontMatter = parseFrontMatter(content);
          const relativePath = path.relative(path.resolve(__dirname, '../..'), fullPath);
          
          ssotMap.set(entry.name, {
            path: relativePath,
            fullPath,
            content,
            tickets: frontMatter.tickets,
            hasFrontMatter: frontMatter.hasFrontMatter,
          });
        } catch (err) {
          console.warn(`⚠️  ${entry.name} の読み込みに失敗: ${err.message}`);
        }
      }
    }
  }
  
  scanDir(SSOT_ROOT);
  return ssotMap;
}

/**
 * タスクのDescriptionからSSOT参照を抽出
 * @param {string} description - タスクの説明
 * @returns {Array} SSOTファイル名の配列
 */
function extractSSOTFileNames(description) {
  if (!description) return [];
  
  const fileNames = [];
  
  // SSOT_*.md パターン
  const pattern = /SSOT_[A-Z0-9_-]+\.md/gi;
  let match;
  while ((match = pattern.exec(description)) !== null) {
    fileNames.push(match[0]);
  }
  
  return [...new Set(fileNames)];
}

/**
 * タスク名からDEV番号を抽出
 * @param {string} name - タスク名
 * @returns {string|null} DEV番号（例: DEV-0175）
 */
function extractDevNumber(name) {
  if (!name) return null;
  const match = name.match(/\[DEV-(\d+)\]/);
  return match ? `DEV-${match[1].padStart(4, '0')}` : null;
}

/**
 * Plane APIから全タスクを取得
 * @returns {Promise<Array>} タスク情報の配列
 */
async function fetchPlaneTasks() {
  const config = getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  
  try {
    const response = await request('GET', endpoint);
    const issues = response.results || response;
    
    return issues.map(issue => {
      const devNumber = extractDevNumber(issue.name);
      const ssotFileNames = extractSSOTFileNames(issue.description_html || issue.description || '');
      
      return {
        id: issue.id,
        name: issue.name,
        devNumber,
        ssotFileNames,
      };
    }).filter(t => t.devNumber && t.ssotFileNames.length > 0);
  } catch (err) {
    console.error(`❌ Plane API Error: ${err.message}`);
    return [];
  }
}

/**
 * tickets:フィールドを更新
 * @param {string} content - 元のファイル内容
 * @param {Array} newTickets - 追加するチケットID
 * @returns {string} 更新後のファイル内容
 */
function updateTicketsField(content, newTickets) {
  const frontMatterMatch = content.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (!frontMatterMatch) {
    console.warn('⚠️  YAML Front Matterが見つかりません');
    return content;
  }
  
  let yaml = frontMatterMatch[2];
  
  // 既存のtickets:を探す
  const ticketsPattern = /tickets:\s*(?:\[\s*\]|\n(?:\s+-\s+[^\n]+\n)*)/;
  const ticketsMatch = yaml.match(ticketsPattern);
  
  // 新しいtickets:を構築
  const ticketsYaml = `tickets:\n${newTickets.map(t => `  - ${t}`).join('\n')}\n`;
  
  if (ticketsMatch) {
    // 既存のtickets:を置換
    yaml = yaml.replace(ticketsPattern, ticketsYaml);
  } else {
    // tickets:がない場合は追加
    yaml = yaml.trim() + '\n' + ticketsYaml;
  }
  
  return frontMatterMatch[1] + yaml + frontMatterMatch[3] + content.slice(frontMatterMatch[0].length);
}

/**
 * 変更を計算
 * @param {Map} ssotMap - SSOTファイル情報
 * @param {Array} tasks - タスク情報
 * @returns {Array} 変更リスト
 */
function calculateChanges(ssotMap, tasks) {
  const changes = [];
  
  // タスク → SSOT の紐付けを収集
  const ssotToTasks = new Map();
  
  for (const task of tasks) {
    for (const ssotFileName of task.ssotFileNames) {
      if (!ssotToTasks.has(ssotFileName)) {
        ssotToTasks.set(ssotFileName, []);
      }
      if (!ssotToTasks.get(ssotFileName).includes(task.devNumber)) {
        ssotToTasks.get(ssotFileName).push(task.devNumber);
      }
    }
  }
  
  // 各SSOTについて変更を計算
  for (const [ssotFileName, taskIds] of ssotToTasks) {
    const ssot = ssotMap.get(ssotFileName);
    
    if (!ssot) {
      console.warn(`⚠️  SSOT ${ssotFileName} が見つかりません`);
      continue;
    }
    
    // 新規追加するタスクIDを計算
    const existingTickets = ssot.tickets || [];
    const newTickets = taskIds.filter(t => !existingTickets.includes(t));
    
    if (newTickets.length > 0) {
      const allTickets = [...new Set([...existingTickets, ...taskIds])].sort();
      
      changes.push({
        ssotFileName,
        ssotPath: ssot.path,
        fullPath: ssot.fullPath,
        existingTickets,
        newTickets,
        allTickets,
        content: ssot.content,
      });
    }
  }
  
  return changes;
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const apply = args.includes('--apply');
  
  if (!dryRun && !apply) {
    console.log('使い方:');
    console.log('  node scripts/migration/backfill-ssot-tickets.cjs --dry-run  # プレビュー');
    console.log('  node scripts/migration/backfill-ssot-tickets.cjs --apply    # 適用');
    process.exit(0);
  }
  
  console.log('🔍 SSOT tickets: 補完ツール\n');
  console.log(`モード: ${dryRun ? '🔍 DRY-RUN（プレビューのみ）' : '✏️  APPLY（実際に変更）'}\n`);
  
  // SSOTスキャン
  console.log('📁 SSOTファイルをスキャン中...');
  const ssotMap = scanSSOTFiles();
  console.log(`   ${ssotMap.size}件のSSOTを検出\n`);
  
  // Planeタスク取得
  console.log('📥 Planeからタスクを取得中...');
  const tasks = await fetchPlaneTasks();
  console.log(`   ${tasks.length}件のSSO参照付きタスクを検出\n`);
  
  if (tasks.length === 0) {
    console.log('⚠️  SSOT参照を持つタスクが見つかりません');
    process.exit(0);
  }
  
  // 変更計算
  console.log('🔄 変更を計算中...');
  const changes = calculateChanges(ssotMap, tasks);
  console.log(`   ${changes.length}件のSSOTに変更が必要\n`);
  
  if (changes.length === 0) {
    console.log('✅ 全てのSSOTは最新です。変更は不要です。');
    process.exit(0);
  }
  
  // 変更内容を表示
  console.log('=== 変更内容 ===\n');
  
  for (const change of changes) {
    console.log(`📄 ${change.ssotFileName}`);
    console.log(`   パス: ${change.ssotPath}`);
    console.log(`   既存tickets: ${change.existingTickets.length > 0 ? change.existingTickets.join(', ') : '(なし)'}`);
    console.log(`   追加: ${change.newTickets.join(', ')}`);
    console.log(`   → 更新後: ${change.allTickets.join(', ')}`);
    console.log();
  }
  
  // 適用
  if (apply) {
    console.log('=== 変更を適用中 ===\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const change of changes) {
      try {
        const newContent = updateTicketsField(change.content, change.allTickets);
        fs.writeFileSync(change.fullPath, newContent, 'utf8');
        console.log(`✅ ${change.ssotFileName} を更新しました`);
        successCount++;
      } catch (err) {
        console.error(`❌ ${change.ssotFileName} の更新に失敗: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n=== 完了 ===`);
    console.log(`成功: ${successCount}件`);
    console.log(`失敗: ${errorCount}件`);
    
    if (errorCount > 0) {
      process.exit(1);
    }
  } else {
    console.log('💡 実際に適用するには --apply オプションを使用してください');
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
