#!/usr/bin/env node
/**
 * SSOT_PROGRESS_MASTER.md から Linear へのデータ移行スクリプト
 * 
 * 使用方法:
 * 1. Linear API キーを環境変数に設定
 *    export LINEAR_API_KEY="your_api_key_here"
 * 
 * 2. スクリプト実行
 *    node scripts/linear/migrate-to-linear.js
 * 
 * 3. ドライラン（実際には作成しない）
 *    node scripts/linear/migrate-to-linear.js --dry-run
 */

const fs = require('fs');
const path = require('path');

// Linear SDK を使用（要インストール: npm install @linear/sdk）
const { LinearClient } = require('@linear/sdk');

// 設定
const CONFIG = {
  LINEAR_API_KEY: process.env.LINEAR_API_KEY,
  PROGRESS_FILE: path.join(__dirname, '../../docs/03_ssot/SSOT_PROGRESS_MASTER.md'),
  DRY_RUN: process.argv.includes('--dry-run'),
};

// チームIDのマッピング（Linear上で作成後に更新）
const TEAM_ID = 'e7971fae-ad3b-434d-9477-9a22fc1c31a6'; // OmotenasuAI

// プロジェクトIDのマッピング（Linear上で作成後に更新）
const PROJECT_IDS = {
  'hotel-kanri': 'a8b70852-54f7-4be6-b9bc-f662baa318bc',
  'hotel-saas': '7500f252-c38c-41c1-9cd9-ff441d26e822',
  'hotel-common': '04bd20dc-59df-47f0-8ec4-f7f2d797b604',
  'hotel-pms': '80961f6d-9353-49f6-94aa-0648af7afee1',
  'hotel-member': '95726c16-6fed-4d8e-bd15-3756fb19adb6',
};

// ラベルIDのマッピング（Linear上で作成後に更新）
const LABEL_IDS = {
  // Phase
  'phase-0': 'd919be88-7f03-457c-8039-28d7568d5d91',
  'phase-1': 'e02e865c-abbf-43d9-9980-dd83e151db83',
  'phase-2': '0f44b3b8-cf14-476f-8bf6-bbcdae74cc8d',
  'phase-3': '4477472d-5c6e-4fd7-bba7-d6eb55196679',
  'phase-4': 'e044f3cd-0a9e-4a1c-86a0-e4f04db1ee6d',
  'phase-5': 'dae3177e-5827-444c-822a-6906ba8e9f79',
  
  // Type
  'ssot-creation': 'a7b7482d-fb46-4fe9-8ed8-d865931e308a',
  'implementation': '1a310bc4-ee15-4b43-bfb3-3941e9f1a26a',
  'version-up': '4709828d-cdcb-4f1a-bdf4-e14a74765db2',
  'bug-fix': 'ead2f036-6ee8-4df7-ac13-e07bbb7c3488',
  'documentation': '9fff3341-e069-4cb4-8849-e0515c93ae2d',
  
  // Category
  'api': '362e7394-2cb1-4f2d-9daf-71844e04c4e9',
  'ui': '5d20e5aa-dc03-44ef-a07f-08f23ed3cba3',
  'database': 'ff58cdcd-4fc1-4f09-a67a-709416d16c68',
  'infrastructure': 'e525407f-a195-4d9c-ae22-86671015a45b',
  'tooling': '224c07e4-1f5c-40ac-a0e0-46579597fb38',
  'integration': '6d3a9833-0436-49fb-9723-a81a8a45ba5e',
  'project-management': '8a1fa434-d953-43f7-9891-7da397e0f265',
};

/**
 * Markdownファイルからタスクを抽出
 */
function parseProgressFile() {
  const content = fs.readFileSync(CONFIG.PROGRESS_FILE, 'utf-8');
  const lines = content.split('\n');
  const tasks = [];
  
  let currentPhase = null;
  let currentWeek = null;
  let currentWeekName = null;
  let currentDates = null;
  let currentPriority = 'medium';
  
  // Phase 0を含むマーカー
  let insidePhase0 = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Phase検出
    const phaseMatch = line.match(/^### (Phase \d+):/);
    if (phaseMatch) {
      currentPhase = phaseMatch[1];
      insidePhase0 = (currentPhase === 'Phase 0');
      continue;
    }
    
    // Phase 0は除外（完了済み履歴）
    if (insidePhase0) continue;
    
    // Week検出（Phase 1〜5）
    const weekMatch = line.match(/^#### Week (\d+(?:-\d+)?)（(.+?)）: (.+?) (🔴|🟡|🟢)/);
    if (weekMatch) {
      currentWeek = `Week ${weekMatch[1]}`;
      currentDates = weekMatch[2];
      currentWeekName = weekMatch[3];
      currentPriority = parsePriority(weekMatch[4]);
      continue;
    }
    
    // Phase 0-A, 0-B形式の週検出（Phase 0専用、スキップ）
    if (line.match(/^#### Phase 0-[AB]/)) {
      insidePhase0 = true;
      continue;
    }
    
    // タスク行検出（| 数字 | または | 数字.数字 | で始まる行）
    const taskMatch = line.match(/^\|\s*([\d.]+)\s*\|\s*\*?\*?([^|]+?)\*?\*?\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*([✅❌⭕🟢🟡]+)/);
    if (taskMatch && currentPhase && !insidePhase0) {
      const [, order, name, type, assignee, estimate, status] = taskMatch;
      
      // バージョン情報を次のカラムから抽出（オプション）
      const versionMatch = line.match(/\|\s*([v\d.]+)\s*\|/);
      const version = versionMatch ? versionMatch[1] : null;
      
      const parsedStatus = parseStatus(status.trim());
      
      // オプション: 完了済みタスクを除外する場合はコメントアウトを外す
      // if (parsedStatus === 'completed') continue;
      
      tasks.push({
        phase: currentPhase,
        week: currentWeek || 'Week 0',
        weekName: currentWeekName || '',
        dates: currentDates || '',
        priority: currentPriority,
        order: parseFloat(order),
        name: name.trim(),
        type: type.trim(),
        assignee: assignee.trim(),
        estimate: parseEstimate(estimate.trim()),
        status: parsedStatus,
        version: version,
      });
    }
  }
  
  return tasks;
}

/**
 * 優先度をパース
 */
function parsePriority(text) {
  if (text.includes('🔴') || text.includes('最優先')) return 'critical';
  if (text.includes('🟡') || text.includes('高優先')) return 'high';
  if (text.includes('🟢') || text.includes('中優先')) return 'medium';
  return 'low';
}

/**
 * 工数をパース（日数 → ポイント変換: 1日 = 2ポイント）
 */
function parseEstimate(text) {
  const match = text.match(/(\d+)日/);
  if (!match) return 0;
  return parseInt(match[1]) * 2; // 1日 = 2ポイント (8時間)
}

/**
 * ステータスをパース
 */
function parseStatus(emoji) {
  if (emoji === '✅') return 'completed';
  if (emoji === '🟡' || emoji === '🟢') return 'in_progress';
  if (emoji === '⭕' || emoji === '❌') return 'todo';
  return 'backlog';
}

/**
 * タスクの種別からラベルとプロジェクトを決定
 */
function getLabelsAndProject(task) {
  const labels = [];
  let projectId = null;
  
  // Type
  if (task.type.includes('SSOT作成')) labels.push('ssot-creation');
  else if (task.type.includes('実装')) labels.push('implementation');
  else if (task.type.includes('バージョンアップ')) labels.push('version-up');
  else if (task.type.includes('ドキュメント')) labels.push('documentation');
  
  // Phase
  if (task.phase === 'Phase 0') labels.push('phase-0');
  else if (task.phase === 'Phase 1') labels.push('phase-1');
  else if (task.phase === 'Phase 2') labels.push('phase-2');
  else if (task.phase === 'Phase 3') labels.push('phase-3');
  else if (task.phase === 'Phase 4') labels.push('phase-4');
  else if (task.phase === 'Phase 5') labels.push('phase-5');
  
  // Project判定（タスク名から）
  if (task.type.includes('SSOT作成') || task.name.includes('LINEAR') || task.name.includes('ドキュメント')) {
    projectId = PROJECT_IDS['hotel-kanri'];
    labels.push('project-management');
  } else if (task.name.includes('SAAS') || task.assignee === 'Sun') {
    projectId = PROJECT_IDS['hotel-saas'];
    labels.push('ui');
  } else if (task.name.includes('COMMON') || task.assignee === 'Iza') {
    projectId = PROJECT_IDS['hotel-common'];
    labels.push('api');
  } else if (task.name.includes('PMS') || task.assignee === 'Luna') {
    projectId = PROJECT_IDS['hotel-pms'];
    labels.push('integration');
  } else if (task.name.includes('MEMBER') || task.assignee === 'Suno') {
    projectId = PROJECT_IDS['hotel-member'];
    labels.push('database');
  } else {
    // デフォルトはhotel-common
    projectId = PROJECT_IDS['hotel-common'];
    labels.push('api');
  }
  
  return { labels, projectId };
}

/**
 * Linear にタスクを作成
 */
async function createIssue(client, task) {
  const teamId = TEAM_ID; // 統一チーム
  const { labels, projectId } = getLabelsAndProject(task);
  const labelIds = labels.map(l => LABEL_IDS[l]).filter(Boolean);
  
  const issueData = {
    teamId,
    title: task.name,
    description: `
## 📋 タスク詳細

**Phase**: ${task.phase}
**Week**: ${task.week} - ${task.weekName}
**期間**: ${task.dates}
**担当**: ${task.assignee}
**種別**: ${task.type}
**工数見積もり**: ${task.estimate / 2}日 (${task.estimate}ポイント)
**バージョン**: ${task.version || 'N/A'}

---

## ✅ チェックリスト

- [ ] 関連ドキュメント確認
- [ ] 実装
- [ ] テスト
- [ ] SSOT準拠確認
- [ ] ドキュメント更新

---

## 📎 関連リンク

- SSOT: [リンク]
- 実装ファイル: [リンク]
    `.trim(),
    estimate: task.estimate,
    priority: getPriorityValue(task.priority),
    labelIds,
  };
  
  // プロジェクト設定
  if (projectId) {
    issueData.projectId = projectId;
  }
  
  // ステータス設定
  if (task.status === 'completed') {
    issueData.stateId = await getStateId(client, teamId, 'Done');
  } else if (task.status === 'in_progress') {
    issueData.stateId = await getStateId(client, teamId, 'In Progress');
  }
  
  if (CONFIG.DRY_RUN) {
    console.log('  [DRY RUN] Would create:', task.name);
    return { success: true };
  }
  
  try {
    const issue = await client.createIssue(issueData);
    return issue;
  } catch (error) {
    console.error(`❌ Error creating issue: ${task.name}`, error.message);
    return null;
  }
}

/**
 * 優先度の値を取得
 */
function getPriorityValue(priority) {
  const map = {
    'critical': 1,
    'high': 2,
    'medium': 3,
    'low': 4,
  };
  return map[priority] || 3;
}

/**
 * ステートIDを取得
 */
async function getStateId(client, teamId, stateName) {
  const states = await client.workflowStates({ filter: { team: { id: { eq: teamId } } } });
  const state = states.nodes.find(s => s.name === stateName);
  return state ? state.id : null;
}

/**
 * セットアップ確認
 */
function checkSetup() {
  const errors = [];
  
  if (!CONFIG.LINEAR_API_KEY) {
    errors.push('LINEAR_API_KEY environment variable is not set');
  }
  
  if (!fs.existsSync(CONFIG.PROGRESS_FILE)) {
    errors.push(`Progress file not found: ${CONFIG.PROGRESS_FILE}`);
  }
  
  // Team ID check
  if (!TEAM_ID) {
    errors.push('TEAM_ID not configured');
  }
  
  // Project IDs check
  const missingProjects = Object.entries(PROJECT_IDS).filter(([, id]) => !id).map(([name]) => name);
  if (missingProjects.length > 0) {
    errors.push(`Project IDs not configured: ${missingProjects.join(', ')}`);
  }
  
  // Label IDs check (warning only)
  const missingLabels = Object.entries(LABEL_IDS).filter(([, id]) => !id).map(([name]) => name);
  if (missingLabels.length > 0) {
    console.warn(`⚠️  Warning: Some labels not configured: ${missingLabels.join(', ')}`);
  }
  
  return errors;
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Linear Migration Script\n');
  
  // セットアップ確認
  const setupErrors = checkSetup();
  if (setupErrors.length > 0) {
    console.error('❌ Setup errors:');
    setupErrors.forEach(err => console.error(`   - ${err}`));
    console.error('\n📝 Please update TEAM_IDS, PROJECT_IDS, and LABEL_IDS in this script.\n');
    process.exit(1);
  }
  
  if (CONFIG.DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  // タスクをパース
  console.log('📖 Parsing SSOT_PROGRESS_MASTER.md...');
  const tasks = parseProgressFile();
  console.log(`   Found ${tasks.length} tasks\n`);
  
  // Linear クライアント初期化
  const client = new LinearClient({ apiKey: CONFIG.LINEAR_API_KEY });
  
  // タスクを作成
  console.log('📝 Creating issues in Linear...\n');
  
  let created = 0;
  let skipped = 0;
  
  for (const task of tasks) {
    console.log(`${task.phase} / ${task.week} - ${task.name}`);
    
    const issue = await createIssue(client, task);
    if (issue) {
      created++;
      console.log(`   ✅ Created`);
    } else {
      skipped++;
      console.log(`   ⏭️  Skipped`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total: ${tasks.length}`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  
  if (CONFIG.DRY_RUN) {
    console.log('\n✅ Dry run completed successfully');
  } else {
    console.log('\n✅ Migration completed successfully');
  }
}

// スクリプト実行
main().catch(error => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});

