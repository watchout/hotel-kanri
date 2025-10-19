#!/usr/bin/env node
/**
 * Linear から Markdown への週次エクスポートスクリプト
 * 
 * 使用方法:
 * 1. Linear API キーを環境変数に設定
 *    export LINEAR_API_KEY="your_api_key_here"
 * 
 * 2. スクリプト実行（デフォルト: 週次レポート）
 *    node scripts/linear/export-from-linear.js
 * 
 * 3. 全体エクスポート
 *    node scripts/linear/export-from-linear.js --full
 */

const fs = require('fs');
const path = require('path');
const { LinearClient } = require('@linear/sdk');

// 設定
const CONFIG = {
  LINEAR_API_KEY: process.env.LINEAR_API_KEY,
  OUTPUT_DIR: path.join(__dirname, '../../docs/03_ssot/_linear_exports'),
  FULL_EXPORT: process.argv.includes('--full'),
};

/**
 * Linear から全Issues取得
 */
async function fetchAllIssues(client) {
  console.log('📥 Fetching issues from Linear...');
  
  const issues = await client.issues({
    includeArchived: false,
    orderBy: 'createdAt',
  });
  
  console.log(`   Found ${issues.nodes.length} issues\n`);
  return issues.nodes;
}

/**
 * 現在のサイクルのIssues取得
 */
async function fetchCurrentCycleIssues(client) {
  console.log('📥 Fetching current cycle issues from Linear...');
  
  // 全チームの現在のサイクルを取得
  const teams = await client.teams();
  const allIssues = [];
  
  for (const team of teams.nodes) {
    const cycles = await client.cycles({
      filter: {
        team: { id: { eq: team.id } },
        isActive: { eq: true },
      },
    });
    
    if (cycles.nodes.length > 0) {
      const currentCycle = cycles.nodes[0];
      const issues = await currentCycle.issues();
      allIssues.push(...issues.nodes);
    }
  }
  
  console.log(`   Found ${allIssues.length} issues in current cycle\n`);
  return allIssues;
}

/**
 * Issues を Phase/Week でグループ化
 */
function groupIssues(issues) {
  const grouped = {};
  
  issues.forEach(issue => {
    // プロジェクト名（Phase）を取得
    const projectName = issue.project?.name || 'No Project';
    
    if (!grouped[projectName]) {
      grouped[projectName] = {};
    }
    
    // サイクル名（Week）を取得
    const cycleName = issue.cycle?.name || 'No Cycle';
    
    if (!grouped[projectName][cycleName]) {
      grouped[projectName][cycleName] = [];
    }
    
    grouped[projectName][cycleName].push(issue);
  });
  
  return grouped;
}

/**
 * ステータスを絵文字に変換
 */
function statusToEmoji(state) {
  if (!state) return '⏳';
  
  const name = state.name.toLowerCase();
  if (name.includes('done') || name.includes('completed')) return '✅';
  if (name.includes('progress')) return '🟡';
  if (name.includes('blocked')) return '🔴';
  if (name.includes('todo')) return '⏳';
  return '⭕';
}

/**
 * 優先度を絵文字に変換
 */
function priorityToEmoji(priority) {
  if (priority === 1) return '🔴';
  if (priority === 2) return '🟡';
  if (priority === 3) return '🟢';
  return '⚪';
}

/**
 * Markdown テーブル行を生成
 */
function generateTableRow(issue, index) {
  const status = statusToEmoji(issue.state);
  const priority = priorityToEmoji(issue.priority);
  const assignee = issue.assignee?.name || 'Unassigned';
  const estimate = issue.estimate ? `${issue.estimate / 2}日` : '-';
  const labels = issue.labels.nodes.map(l => l.name).join(', ') || '-';
  
  return `| ${index} | ${issue.title} | ${assignee} | ${estimate} | ${status} | ${priority} | ${labels} |`;
}

/**
 * 週次レポート生成
 */
function generateWeeklyReport(issues) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  let markdown = `# 📊 Linear 週次進捗レポート\n\n`;
  markdown += `**生成日**: ${year}-${month}-${day}\n`;
  markdown += `**データソース**: Linear API\n\n`;
  markdown += `---\n\n`;
  
  // Phase/Week別にグループ化
  const grouped = groupIssues(issues);
  
  Object.entries(grouped).forEach(([phase, weeks]) => {
    markdown += `## ${phase}\n\n`;
    
    Object.entries(weeks).forEach(([week, issueList]) => {
      markdown += `### ${week}\n\n`;
      
      // 統計情報
      const total = issueList.length;
      const completed = issueList.filter(i => statusToEmoji(i.state) === '✅').length;
      const inProgress = issueList.filter(i => statusToEmoji(i.state) === '🟡').length;
      const todo = issueList.filter(i => statusToEmoji(i.state) === '⏳' || statusToEmoji(i.state) === '⭕').length;
      const blocked = issueList.filter(i => statusToEmoji(i.state) === '🔴').length;
      
      markdown += `**進捗**: ${completed}/${total} (${Math.round(completed / total * 100)}%)\n\n`;
      markdown += `| 状態 | 件数 |\n`;
      markdown += `|:-----|:----:|\n`;
      markdown += `| ✅ 完了 | ${completed} |\n`;
      markdown += `| 🟡 進行中 | ${inProgress} |\n`;
      markdown += `| ⏳ Todo | ${todo} |\n`;
      if (blocked > 0) {
        markdown += `| 🔴 ブロック | ${blocked} |\n`;
      }
      markdown += `\n`;
      
      // タスク一覧
      markdown += `| # | タスク | 担当 | 工数 | 状態 | 優先度 | ラベル |\n`;
      markdown += `|:-:|:-------|:-----|:----:|:----:|:------:|:-------|\n`;
      
      issueList.forEach((issue, idx) => {
        markdown += generateTableRow(issue, idx + 1) + '\n';
      });
      
      markdown += `\n`;
    });
  });
  
  // サマリー
  const totalIssues = issues.length;
  const completedIssues = issues.filter(i => statusToEmoji(i.state) === '✅').length;
  
  markdown += `## 📈 サマリー\n\n`;
  markdown += `- **総タスク数**: ${totalIssues}\n`;
  markdown += `- **完了**: ${completedIssues}\n`;
  markdown += `- **完了率**: ${Math.round(completedIssues / totalIssues * 100)}%\n`;
  
  return markdown;
}

/**
 * 全体エクスポート生成（SSOT_PROGRESS_MASTER.md 形式）
 */
function generateFullExport(issues) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  let markdown = `# 📊 SSOT作成進捗管理マスター（Linear Export）\n\n`;
  markdown += `**エクスポート日**: ${year}-${month}-${day}\n`;
  markdown += `**データソース**: Linear API\n`;
  markdown += `**自動生成**: このファイルは自動生成されます。編集しないでください。\n\n`;
  markdown += `> ⚠️ **重要**: Linearが唯一の進捗管理ツールです。このファイルは参照用です。\n\n`;
  markdown += `---\n\n`;
  
  // Phase/Week別にグループ化
  const grouped = groupIssues(issues);
  
  Object.entries(grouped).sort().forEach(([phase, weeks]) => {
    markdown += `## ${phase}\n\n`;
    
    const phaseIssues = Object.values(weeks).flat();
    const phaseTotal = phaseIssues.length;
    const phaseCompleted = phaseIssues.filter(i => statusToEmoji(i.state) === '✅').length;
    
    markdown += `**期間**: [Linear参照]\n`;
    markdown += `**進捗**: ${phaseCompleted}/${phaseTotal} (**${Math.round(phaseCompleted / phaseTotal * 100)}%**)\n\n`;
    
    Object.entries(weeks).sort().forEach(([week, issueList]) => {
      markdown += `### ${week}\n\n`;
      
      markdown += `| # | タスク | 種別 | 担当 | 工数 | 状態 | バージョン | Linear |\n`;
      markdown += `|:-:|:-------|:-----|:-----|:----:|:----:|:----------:|:-------|\n`;
      
      issueList.forEach((issue, idx) => {
        const status = statusToEmoji(issue.state);
        const assignee = issue.assignee?.name || 'TBD';
        const estimate = issue.estimate ? `${issue.estimate / 2}日` : '-';
        const type = issue.labels.nodes.find(l => l.name.includes('ssot') || l.name.includes('implementation'))?.name || '-';
        const version = issue.title.match(/v[\d.]+/)?.[0] || '-';
        const url = issue.url;
        
        markdown += `| ${idx + 1} | ${issue.title} | ${type} | ${assignee} | ${estimate} | ${status} | ${version} | [Link](${url}) |\n`;
      });
      
      markdown += `\n`;
    });
    
    markdown += `---\n\n`;
  });
  
  return markdown;
}

/**
 * ファイル保存
 */
function saveMarkdown(markdown, filename) {
  // 出力ディレクトリ作成
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }
  
  const filepath = path.join(CONFIG.OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, markdown, 'utf-8');
  
  console.log(`✅ Saved: ${filepath}`);
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Linear Export Script\n');
  
  if (!CONFIG.LINEAR_API_KEY) {
    console.error('❌ LINEAR_API_KEY environment variable is not set');
    process.exit(1);
  }
  
  // Linear クライアント初期化
  const client = new LinearClient({ apiKey: CONFIG.LINEAR_API_KEY });
  
  // Issues取得
  const issues = CONFIG.FULL_EXPORT
    ? await fetchAllIssues(client)
    : await fetchCurrentCycleIssues(client);
  
  if (issues.length === 0) {
    console.log('⚠️  No issues found');
    return;
  }
  
  // Markdown生成
  console.log('📝 Generating Markdown...');
  
  const markdown = CONFIG.FULL_EXPORT
    ? generateFullExport(issues)
    : generateWeeklyReport(issues);
  
  // ファイル保存
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const filename = CONFIG.FULL_EXPORT
    ? `PROGRESS_FULL_${year}${month}${day}.md`
    : `PROGRESS_WEEKLY_${year}${month}${day}.md`;
  
  saveMarkdown(markdown, filename);
  
  console.log('\n✅ Export completed successfully');
}

// スクリプト実行
main().catch(error => {
  console.error('\n❌ Export failed:', error);
  process.exit(1);
});

