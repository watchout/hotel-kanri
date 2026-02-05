#!/usr/bin/env node
/**
 * タスク⇔SSOT 双方向紐付けチェック
 * 
 * 機能:
 * 1. 全SSOTのtickets:フィールドを収集
 * 2. Plane APIから全タスクのSSOT参照を取得
 * 3. 双方向の整合性をチェック
 * 
 * 使い方:
 *   node scripts/quality/check-task-ssot-bidirectional.cjs
 *   node scripts/quality/check-task-ssot-bidirectional.cjs --json  # JSON出力
 *   node scripts/quality/check-task-ssot-bidirectional.cjs --fix   # 修正提案を表示
 * 
 * 環境変数（.env.mcpから自動読み込み）:
 *   PLANE_API_HOST_URL, PLANE_API_KEY, PLANE_WORKSPACE_SLUG, PLANE_PROJECT_ID
 */

const fs = require('fs');
const path = require('path');
const { getPlaneConfig, request } = require('../plane/lib/plane-api-client.cjs');

// 定数
const SSOT_ROOT = path.resolve(__dirname, '../../docs/03_ssot');
const REPORT_PATH = path.resolve(__dirname, '../../.cursor/task-ssot-bidirectional-report.json');

/**
 * YAML Front Matterを解析
 * @param {string} content - Markdownファイルの内容
 * @returns {Object|null} パースしたFront Matter
 */
function parseYamlFrontMatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  
  const yaml = match[1];
  const result = {};
  
  // tickets: の解析
  const ticketsMatch = yaml.match(/tickets:\s*\n((?:\s+-\s+.+\n)*)/);
  if (ticketsMatch) {
    const ticketLines = ticketsMatch[1].match(/-\s+([^\s#]+)/g) || [];
    result.tickets = ticketLines.map(line => {
      const m = line.match(/-\s+([^\s#]+)/);
      return m ? m[1] : null;
    }).filter(Boolean);
  } else {
    // tickets: [] の形式もチェック
    const emptyTicketsMatch = yaml.match(/tickets:\s*\[\s*\]/);
    result.tickets = emptyTicketsMatch ? [] : null;
  }
  
  // doc_id の解析
  const docIdMatch = yaml.match(/doc_id:\s*(.+)/);
  result.docId = docIdMatch ? docIdMatch[1].trim() : null;
  
  // title の解析
  const titleMatch = yaml.match(/title:\s*(.+)/);
  result.title = titleMatch ? titleMatch[1].trim() : null;
  
  return result;
}

/**
 * SSOTファイルを再帰的にスキャン
 * @returns {Array} SSOTファイル情報の配列
 */
function scanSSOTFiles() {
  const ssotFiles = [];
  
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // _archived_progress などは除外
        if (!entry.name.startsWith('_')) {
          scanDir(fullPath);
        }
      } else if (entry.name.startsWith('SSOT_') && entry.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const frontMatter = parseYamlFrontMatter(content);
          const relativePath = path.relative(path.resolve(__dirname, '../..'), fullPath);
          
          ssotFiles.push({
            path: relativePath,
            fileName: entry.name,
            tickets: frontMatter?.tickets || [],
            docId: frontMatter?.docId || null,
            title: frontMatter?.title || entry.name.replace('SSOT_', '').replace('.md', ''),
            hasFrontMatter: !!frontMatter,
          });
        } catch (err) {
          console.warn(`⚠️  ${entry.name} の読み込みに失敗: ${err.message}`);
        }
      }
    }
  }
  
  scanDir(SSOT_ROOT);
  return ssotFiles;
}

/**
 * タスクのDescriptionからSSOT参照を抽出
 * @param {string} description - タスクの説明
 * @returns {Array} SSOT参照パスの配列
 */
function extractSSOTReferences(description) {
  if (!description) return [];
  
  const references = [];
  
  // ssot: パターン
  const ssotPattern = /ssot:\s*(docs\/03_ssot\/[^\s\n]+\.md)/gi;
  let match;
  while ((match = ssotPattern.exec(description)) !== null) {
    references.push(match[1]);
  }
  
  // SSOT: パターン（大文字）
  const ssotPatternUpper = /SSOT:\s*(docs\/03_ssot\/[^\s\n]+\.md)/gi;
  while ((match = ssotPatternUpper.exec(description)) !== null) {
    references.push(match[1]);
  }
  
  // 直接パス参照
  const directPattern = /docs\/03_ssot\/[^\s\n\)]+\.md/gi;
  while ((match = directPattern.exec(description)) !== null) {
    if (!references.includes(match[0])) {
      references.push(match[0]);
    }
  }
  
  return [...new Set(references)];
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
      const ssotRefs = extractSSOTReferences(issue.description_html || issue.description || '');
      
      return {
        id: issue.id,
        name: issue.name,
        devNumber,
        state: issue.state_detail?.name || issue.state || 'Unknown',
        ssotReferences: ssotRefs,
        hasSSSOTRef: ssotRefs.length > 0,
      };
    });
  } catch (err) {
    console.error(`❌ Plane API Error: ${err.message}`);
    return [];
  }
}

/**
 * 双方向整合性チェック
 * @param {Array} ssotFiles - SSOTファイル情報
 * @param {Array} tasks - タスク情報
 * @returns {Object} チェック結果
 */
function checkBidirectional(ssotFiles, tasks) {
  const result = {
    errors: [],      // 不整合（両方向の紐付けが不一致）
    warnings: [],    // 警告（片方向のみ、または空）
    ok: [],          // 正常
    stats: {
      totalSSOT: ssotFiles.length,
      totalTasks: tasks.length,
      ssotWithTickets: 0,
      ssotWithoutTickets: 0,
      tasksWithSSOT: 0,
      tasksWithoutSSOT: 0,
      bidirectionalMatches: 0,
    },
  };
  
  // SSOTのtickets → タスクへのマッピング
  const ssotToTasks = new Map();
  for (const ssot of ssotFiles) {
    ssotToTasks.set(ssot.path, ssot.tickets);
    if (ssot.tickets.length > 0) {
      result.stats.ssotWithTickets++;
    } else {
      result.stats.ssotWithoutTickets++;
    }
  }
  
  // タスクのSSO参照 → SSOTへのマッピング
  const taskToSSOT = new Map();
  for (const task of tasks) {
    if (task.devNumber) {
      taskToSSOT.set(task.devNumber, task.ssotReferences);
    }
    if (task.hasSSSOTRef) {
      result.stats.tasksWithSSOT++;
    } else {
      result.stats.tasksWithoutSSOT++;
    }
  }
  
  // チェック1: SSOT → タスク（tickets:に記載されたタスクがSSO参照を持つか）
  for (const ssot of ssotFiles) {
    if (ssot.tickets.length === 0) {
      result.warnings.push({
        type: 'ssot_no_tickets',
        ssot: ssot.path,
        message: `tickets: が空です`,
      });
      continue;
    }
    
    for (const ticketId of ssot.tickets) {
      const task = tasks.find(t => t.devNumber === ticketId);
      
      if (!task) {
        result.warnings.push({
          type: 'ticket_not_found',
          ssot: ssot.path,
          ticketId,
          message: `タスク ${ticketId} がPlaneに存在しません`,
        });
        continue;
      }
      
      // タスクがこのSSOTを参照しているか
      const taskRefsSSOT = task.ssotReferences.some(ref => 
        ref.includes(ssot.fileName) || ssot.path.includes(ref.replace('docs/', ''))
      );
      
      if (!taskRefsSSOT) {
        result.errors.push({
          type: 'ssot_to_task_mismatch',
          ssot: ssot.path,
          ticketId,
          taskName: task.name,
          message: `SSOT→タスク紐付けあり、タスク→SSOT参照なし`,
          fix: `タスク ${ticketId} の説明に ssot: ${ssot.path} を追加`,
        });
      } else {
        result.stats.bidirectionalMatches++;
        result.ok.push({
          ssot: ssot.path,
          ticketId,
          taskName: task.name,
        });
      }
    }
  }
  
  // チェック2: タスク → SSOT（SSOT参照を持つタスクがSSOTのtickets:に含まれるか）
  for (const task of tasks) {
    if (!task.devNumber) continue;
    if (task.ssotReferences.length === 0) {
      // Backlog以外でSSO参照なしは警告
      if (task.state !== 'Backlog' && task.state !== 'Cancelled') {
        result.warnings.push({
          type: 'task_no_ssot',
          taskId: task.devNumber,
          taskName: task.name,
          state: task.state,
          message: `SSOT参照がありません`,
        });
      }
      continue;
    }
    
    for (const ssotRef of task.ssotReferences) {
      const ssot = ssotFiles.find(s => 
        ssotRef.includes(s.fileName) || s.path.includes(ssotRef.replace('docs/', ''))
      );
      
      if (!ssot) {
        result.warnings.push({
          type: 'ssot_not_found',
          taskId: task.devNumber,
          ssotRef,
          message: `参照先SSOT ${ssotRef} が存在しません`,
        });
        continue;
      }
      
      // SSOTがこのタスクをtickets:に持っているか
      const ssotHasTicket = ssot.tickets.includes(task.devNumber);
      
      if (!ssotHasTicket) {
        // すでにエラーとして報告済みでないか確認
        const alreadyReported = result.errors.some(e => 
          e.ssot === ssot.path && e.ticketId === task.devNumber
        );
        
        if (!alreadyReported) {
          result.errors.push({
            type: 'task_to_ssot_mismatch',
            taskId: task.devNumber,
            taskName: task.name,
            ssot: ssot.path,
            message: `タスク→SSOT参照あり、SSOT→タスク紐付けなし`,
            fix: `${ssot.path} の tickets: に ${task.devNumber} を追加`,
          });
        }
      }
    }
  }
  
  return result;
}

/**
 * レポートを出力
 * @param {Object} result - チェック結果
 * @param {boolean} jsonOutput - JSON出力するか
 * @param {boolean} showFix - 修正提案を表示するか
 */
function printReport(result, jsonOutput, showFix) {
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  
  console.log('\n=== タスク⇔SSOT 双方向紐付けチェック結果 ===\n');
  
  // 統計
  console.log('📊 統計:');
  console.log(`   SSOT総数: ${result.stats.totalSSOT}`);
  console.log(`     - tickets設定あり: ${result.stats.ssotWithTickets}`);
  console.log(`     - tickets設定なし: ${result.stats.ssotWithoutTickets}`);
  console.log(`   タスク総数: ${result.stats.totalTasks}`);
  console.log(`     - SSOT参照あり: ${result.stats.tasksWithSSOT}`);
  console.log(`     - SSOT参照なし: ${result.stats.tasksWithoutSSOT}`);
  console.log(`   双方向整合: ${result.stats.bidirectionalMatches}件\n`);
  
  // エラー
  if (result.errors.length > 0) {
    console.log(`🔴 不整合: ${result.errors.length}件`);
    for (const err of result.errors) {
      console.log(`   - ${err.message}`);
      if (err.ssot) console.log(`     SSOT: ${err.ssot}`);
      if (err.ticketId) console.log(`     タスク: ${err.ticketId}`);
      if (showFix && err.fix) console.log(`     修正: ${err.fix}`);
    }
    console.log();
  }
  
  // 警告
  if (result.warnings.length > 0) {
    console.log(`🟡 警告: ${result.warnings.length}件`);
    for (const warn of result.warnings.slice(0, 10)) {
      console.log(`   - ${warn.message}`);
      if (warn.ssot) console.log(`     SSOT: ${warn.ssot}`);
      if (warn.taskId) console.log(`     タスク: ${warn.taskId}`);
    }
    if (result.warnings.length > 10) {
      console.log(`   ... 他 ${result.warnings.length - 10}件`);
    }
    console.log();
  }
  
  // 正常
  console.log(`🟢 正常: ${result.ok.length}件\n`);
  
  // スコア計算
  const total = result.errors.length + result.warnings.length + result.ok.length;
  const score = total > 0 ? Math.round((result.ok.length / total) * 100) : 100;
  console.log(`📈 スコア: ${score}/100\n`);
  
  // 終了コード決定
  if (result.errors.length > 0) {
    console.log('❌ 不整合があります。修正が必要です。');
    console.log('   --fix オプションで修正提案を表示できます。\n');
  } else if (result.warnings.length > 0) {
    console.log('⚠️  警告があります。確認を推奨します。\n');
  } else {
    console.log('✅ 全ての紐付けが正常です。\n');
  }
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const showFix = args.includes('--fix');
  
  if (!jsonOutput) {
    console.log('🔍 タスク⇔SSOT 双方向紐付けチェック開始...\n');
  }
  
  // SSOTスキャン
  if (!jsonOutput) console.log('📁 SSOTファイルをスキャン中...');
  const ssotFiles = scanSSOTFiles();
  if (!jsonOutput) console.log(`   ${ssotFiles.length}件のSSOTを検出\n`);
  
  // Planeタスク取得
  if (!jsonOutput) console.log('📥 Planeからタスクを取得中...');
  const tasks = await fetchPlaneTasks();
  if (!jsonOutput) console.log(`   ${tasks.length}件のタスクを取得\n`);
  
  // 双方向チェック
  if (!jsonOutput) console.log('🔄 双方向整合性をチェック中...');
  const result = checkBidirectional(ssotFiles, tasks);
  
  // レポート保存
  try {
    const reportDir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    fs.writeFileSync(REPORT_PATH, JSON.stringify(result, null, 2));
    if (!jsonOutput) console.log(`📝 レポートを保存: ${REPORT_PATH}\n`);
  } catch (err) {
    if (!jsonOutput) console.warn(`⚠️  レポート保存失敗: ${err.message}\n`);
  }
  
  // レポート出力
  printReport(result, jsonOutput, showFix);
  
  // 終了コード
  if (result.errors.length > 0) {
    process.exit(1);
  } else if (result.warnings.length > 0) {
    process.exit(0); // 警告のみはパス
  } else {
    process.exit(0);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
