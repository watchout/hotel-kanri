#!/usr/bin/env node

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

// Phase 1タスク（ロードマップ順）
const PHASE1_TASKS = [
  // Week 1
  { order: 1, title: 'SSOT_SAAS_PERMISSION_SYSTEM', type: 'SSOT作成', priority: 1, project: 'hotel-kanri', assignee: 'Iza', status: 'Done' },
  { order: 1.5, title: 'SSOT_SAAS_STAFF_MANAGEMENT', type: 'SSOT作成', priority: 1, project: 'hotel-kanri', assignee: 'Iza', status: 'Backlog' },
  { order: 2, title: 'SSOT_SAAS_MULTITENANT', type: 'SSOT作成', priority: 1, project: 'hotel-kanri', assignee: 'Iza', status: 'Done' },
  { order: 3, title: 'SSOT_SAAS_MEDIA_MANAGEMENT', type: 'SSOT作成', priority: 1, project: 'hotel-kanri', assignee: 'Sun', status: 'Done' },
  { order: 4, title: 'SSOT_SAAS_MEDIA_MANAGEMENT', type: 'hotel-common実装', priority: 2, project: 'hotel-common', assignee: 'Sun', status: 'Backlog' },
  
  // Week 2
  { order: 5, title: 'SSOT_SAAS_ORDER_MANAGEMENT', type: 'SSOT作成', priority: 1, project: 'hotel-kanri', assignee: 'Luna', status: 'Done' },
  { order: 6, title: 'SSOT_SAAS_MENU_MANAGEMENT', type: 'SSOT作成', priority: 1, project: 'hotel-kanri', assignee: 'Luna', status: 'Done' },
  { order: 7, title: 'SSOT_SAAS_ROOM_MANAGEMENT', type: 'SSOT作成', priority: 1, project: 'hotel-kanri', assignee: 'Suno', status: 'Done' },
  { order: 8, title: 'SSOT_SAAS_EMAIL_SYSTEM', type: 'SSOT作成', priority: 1, project: 'hotel-kanri', assignee: 'Iza', status: 'Done' },
  { order: 9, title: 'SSOT_SAAS_EMAIL_SYSTEM', type: 'hotel-common実装', priority: 2, project: 'hotel-common', assignee: 'Iza', status: 'Backlog' },
  
  // Week 3
  // SSOT_ADMIN_AI_SETTINGS は既に登録済みなのでスキップ
  { order: 12, title: 'SSOT_SAAS_ADMIN_AUTHENTICATION', type: 'SSOT作成', priority: 1, project: 'hotel-kanri', assignee: 'Iza', status: 'Done' },
  { order: 13, title: 'SSOT_ADMIN_AI_CONCIERGE', type: 'SSOT作成', priority: 1, project: 'hotel-kanri', assignee: 'Sun', status: 'Done' },
];

async function main() {
  console.log('📝 Phase 1タスクをLinearに登録します...\n');
  
  // Teamを取得
  const teams = await client.teams();
  let teamId = null;
  for await (const team of teams.nodes) {
    if (team.key === 'OMOAI') {
      teamId = team.id;
      break;
    }
  }
  
  if (!teamId) {
    console.error('❌ エラー: Team not found');
    return;
  }
  
  // Projectsを取得
  const projects = await client.projects();
  const projectMap = new Map();
  for await (const project of projects.nodes) {
    projectMap.set(project.name, project.id);
  }
  
  console.log(`📊 Projects: ${Array.from(projectMap.keys()).join(', ')}\n`);
  
  let createdCount = 0;
  
  for (const task of PHASE1_TASKS) {
    const issueTitle = `[${task.type}] ${task.title}`;
    const projectId = projectMap.get(task.project);
    
    if (!projectId) {
      console.log(`⚠️  Project not found: ${task.project} - スキップ`);
      continue;
    }
    
    try {
      const created = await client.createIssue({
        teamId: teamId,
        title: issueTitle,
        priority: task.priority,
        projectId: projectId,
        // stateはデフォルト（Backlog）
      });
      
      console.log(`✅ 作成: [順位${task.order}] ${issueTitle} (P${task.priority})`);
      createdCount++;
      
      // 完了済みタスクは状態を更新
      if (task.status === 'Done') {
        const states = await client.workflowStates({ filter: { team: { id: { eq: teamId } } } });
        let doneStateId = null;
        for await (const state of states.nodes) {
          if (state.name === 'Done') {
            doneStateId = state.id;
            break;
          }
        }
        
        if (doneStateId) {
          await client.updateIssue((await created).issue.id, {
            stateId: doneStateId,
          });
          console.log(`   ✅ 状態をDoneに変更`);
        }
      }
      
    } catch (error) {
      console.error(`❌ 作成エラー: ${issueTitle} - ${error.message}`);
    }
  }
  
  console.log(`\n📊 作成完了: ${createdCount}件`);
  console.log(`\n💡 次のステップ:`);
  console.log(`   1. Linearで各タスクのCycleを設定`);
  console.log(`   2. 依存関係を設定（SSOT作成 → common実装）`);
  console.log(`   3. 次のタスクを選択できるようになります`);
}

main();







