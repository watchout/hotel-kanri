#!/usr/bin/env node
/**
 * 次のタスク取得スクリプト（標準フロー）
 * 
 * ロードマップに従って、次に着手すべきタスクを自動選択する
 * 
 * 選択基準（優先順位順）:
 * 1. State = "Backlog"
 * 2. 依存関係なし（Blocked byなし）
 * 3. Phase順（Phase 1 → Phase 2 → Phase 3 → Phase 4）
 * 4. sequence_id昇順（同じPhase内では番号が小さい順）
 */

const planeApi = require('./lib/plane-api-client.cjs');

async function getNextTask() {
  try {
    console.log('🔍 次のタスクを取得中...\n');
    
    // 1. Statesマッピング取得
    const statesResponse = await planeApi.getStates();
    const states = Array.isArray(statesResponse) ? statesResponse : (statesResponse.results || []);
    const stateMap = {};
    states.forEach(s => stateMap[s.id] = s.name);
    
    const backlogStateId = states.find(s => s.name === 'Backlog')?.id;
    
    if (!backlogStateId) {
      throw new Error('Backlog stateが見つかりません');
    }
    
    // 2. 全Issues取得
    const config = planeApi.getPlaneConfig();
    const issuesEndpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
    const response = await planeApi.request('GET', issuesEndpoint);
    const issues = response.results || response;
    
    // 3. Backlogで依存関係なしのタスクを抽出
    const backlogIssues = issues.filter(i => {
      // Backlogのみ
      if (i.state !== backlogStateId) return false;
      
      // 依存関係チェック（Descriptionに"Blocked by"がないこと）
      const hasBlocker = i.description?.includes('Blocked by') || false;
      if (hasBlocker) return false;
      
      return true;
    });
    
    // 4. Phase順 → sequence_id昇順でソート
    const sortedIssues = backlogIssues.sort((a, b) => {
      // Phase番号を抽出
      const phaseA = a.name?.match(/\[Phase (\d+)\]/)?.[1] || '999';
      const phaseB = b.name?.match(/\[Phase (\d+)\]/)?.[1] || '999';
      
      if (phaseA !== phaseB) {
        return parseInt(phaseA) - parseInt(phaseB);
      }
      
      // 同じPhaseならsequence_id順
      return a.sequence_id - b.sequence_id;
    });
    
    // 5. 結果表示
    if (sortedIssues.length === 0) {
      console.log('✅ Backlogのタスクはありません（全て完了または依存関係でブロック中）\n');
      return null;
    }
    
    // 次のタスク（最優先）
    const nextTask = sortedIssues[0];
    console.log('🎯 次の推奨タスク:\n');
    console.log(`   ID: COM-${nextTask.sequence_id}`);
    console.log(`   Title: ${nextTask.name}`);
    console.log(`   State: ${stateMap[nextTask.state]}`);
    console.log(`   URL: https://plane.arrowsworks.com/${planeApi.PLANE_WORKSPACE_SLUG}/projects/${planeApi.PLANE_PROJECT_ID}/issues/${nextTask.id}`);
    console.log('');
    
    // 他の候補（参考情報）
    if (sortedIssues.length > 1) {
      console.log('📋 他の候補タスク（参考）:\n');
      sortedIssues.slice(1, 6).forEach(task => {
        console.log(`   COM-${task.sequence_id}: ${task.name}`);
      });
      console.log('');
    }
    
    return nextTask;
    
  } catch (err) {
    console.error('❌ エラー:', err.message);
    throw err;
  }
}

// 実行
if (require.main === module) {
  getNextTask()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { getNextTask };

