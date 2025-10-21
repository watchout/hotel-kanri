#!/usr/bin/env node

/**
 * ロードマップをLinearに同期するスクリプト
 * 
 * 目的:
 * - SSOT_PROGRESS_MASTER.mdの順序をLinearに反映
 * - Cycle、Priority、依存関係を設定
 * - AIが正しい順序でタスクを選択できるようにする
 * 
 * 使用:
 * LINEAR_API_KEY=xxx node scripts/linear/sync-roadmap-to-linear.js
 */

const { LinearClient } = require('@linear/sdk');
const fs = require('fs');

// ==========================================
// 設定
// ==========================================

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

if (!LINEAR_API_KEY) {
  console.error('❌ エラー: LINEAR_API_KEY環境変数が設定されていません');
  process.exit(1);
}

const client = new LinearClient({ apiKey: LINEAR_API_KEY });

// ==========================================
// ロードマップの順序定義（Phase 1のみ）
// ==========================================

const ROADMAP = {
  'Phase 1 Week 1': {
    cycleStart: '2025-10-15',
    cycleEnd: '2025-10-21',
    tasks: [
      { order: 1, title: 'SSOT_SAAS_PERMISSION_SYSTEM', type: 'SSOT作成', priority: 1, status: 'Done' },
      { order: 1.5, title: 'SSOT_SAAS_STAFF_MANAGEMENT', type: 'SSOT作成', priority: 1, status: 'Backlog' },
      { order: 2, title: 'SSOT_SAAS_MULTITENANT', type: 'SSOT作成', priority: 1, status: 'Done' },
      { order: 3, title: 'SSOT_SAAS_MEDIA_MANAGEMENT', type: 'SSOT作成', priority: 1, status: 'Done' },
      { order: 4, title: 'SSOT_SAAS_MEDIA_MANAGEMENT', type: 'hotel-common実装', priority: 2, status: 'Backlog', blockedBy: 'SSOT_SAAS_MEDIA_MANAGEMENT:SSOT作成' },
    ],
  },
  'Phase 1 Week 2': {
    cycleStart: '2025-10-22',
    cycleEnd: '2025-10-28',
    tasks: [
      { order: 5, title: 'SSOT_SAAS_ORDER_MANAGEMENT', type: 'SSOT作成', priority: 1, status: 'Done' },
      { order: 6, title: 'SSOT_SAAS_MENU_MANAGEMENT', type: 'SSOT作成', priority: 1, status: 'Done' },
      { order: 7, title: 'SSOT_SAAS_ROOM_MANAGEMENT', type: 'SSOT作成', priority: 1, status: 'Done' },
      { order: 8, title: 'SSOT_SAAS_EMAIL_SYSTEM', type: 'SSOT作成', priority: 1, status: 'Done' },
      { order: 9, title: 'SSOT_SAAS_EMAIL_SYSTEM', type: 'hotel-common実装', priority: 2, status: 'Backlog', blockedBy: 'SSOT_SAAS_EMAIL_SYSTEM:SSOT作成' },
    ],
  },
  'Phase 1 Week 3': {
    cycleStart: '2025-10-29',
    cycleEnd: '2025-11-04',
    tasks: [
      { order: 10, title: 'SSOT_ADMIN_AI_SETTINGS', type: 'SSOT作成', priority: 1, status: 'Done' },
      { order: 11, title: 'SSOT_ADMIN_AI_SETTINGS', type: 'hotel-common実装', priority: 2, status: 'Backlog', blockedBy: 'SSOT_ADMIN_AI_SETTINGS:SSOT作成' },
      { order: 12, title: 'SSOT_SAAS_ADMIN_AUTHENTICATION', type: 'SSOT作成', priority: 1, status: 'Done' },
      { order: 13, title: 'SSOT_ADMIN_AI_CONCIERGE', type: 'SSOT作成', priority: 1, status: 'Done' },
    ],
  },
};

// ==========================================
// 同期処理
// ==========================================

async function syncRoadmap() {
  console.log('🔄 ロードマップをLinearに同期します...\n');
  
  // Step 1: 既存Issueを取得
  console.log('Step 1: 既存Issueを取得中...');
  const issues = await client.issues();
  
  const existingIssues = new Map();
  for await (const issue of issues.nodes) {
    const key = `${issue.title}`;
    existingIssues.set(key, {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      state: issue.state?.name || 'Backlog',
    });
  }
  
  console.log(`✅ ${existingIssues.size}件のIssueを取得しました\n`);
  
  // Step 2: Teamを取得
  console.log('Step 2: Teamを取得中...');
  const teams = await client.teams();
  let teamId = null;
  for await (const team of teams.nodes) {
    if (team.name === 'omotenasu-ai' || team.key === 'OMOAI') {
      teamId = team.id;
      console.log(`✅ Team: ${team.name} (${team.key})\n`);
      break;
    }
  }
  
  if (!teamId) {
    console.error('❌ エラー: omotenasu-ai Teamが見つかりません');
    return;
  }
  
  // Step 3: Phase別に同期
  let updateCount = 0;
  let createCount = 0;
  let skipCount = 0;
  
  for (const [phaseName, phaseData] of Object.entries(ROADMAP)) {
    console.log(`\n📅 ${phaseName} の同期中...`);
    
    for (const task of phaseData.tasks) {
      const issueTitle = `[${task.type}] ${task.title}`;
      const existing = existingIssues.get(issueTitle);
      
      if (existing) {
        // 既存Issueを更新
        try {
          await client.updateIssue(existing.id, {
            priority: task.priority,
            // stateは既存のまま維持（手動変更を尊重）
          });
          console.log(`  ✅ 更新: ${issueTitle} (Priority ${task.priority})`);
          updateCount++;
        } catch (error) {
          console.error(`  ❌ 更新エラー: ${issueTitle} - ${error.message}`);
        }
      } else {
        // 新規Issue作成（今回はスキップ）
        console.log(`  ⚠️  未登録: ${issueTitle}`);
        skipCount++;
      }
    }
  }
  
  console.log(`\n📊 同期完了:`);
  console.log(`   - 更新: ${updateCount}件`);
  console.log(`   - 作成: ${createCount}件`);
  console.log(`   - スキップ: ${skipCount}件`);
  
  console.log(`\n💡 次のステップ:`);
  console.log(`   1. Linearで各タスクのCycleを設定`);
  console.log(`   2. 依存関係（Blocked by）を設定`);
  console.log(`   3. AIが次のタスクを選択できるようになります`);
}

// ==========================================
// メイン処理
// ==========================================

async function main() {
  try {
    await syncRoadmap();
    console.log('\n✅ ロードマップ同期が完了しました！');
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();

