#!/usr/bin/env node

/**
 * Linear Issueを機能単位Full-Stack方式に変換
 * 
 * 変更内容:
 * - [hotel-common実装] + [hotel-saas実装] → [実装（Full-Stack）]
 * - 1つのIssueで両システムを実装
 */

const { LinearClient } = require('@linear/sdk');

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const client = new LinearClient({ apiKey: LINEAR_API_KEY });

async function convertToFullStack() {
  console.log('🔄 Linear Issueを機能単位Full-Stack方式に変換します\n');
  
  // 全Issue取得
  const issues = await client.issues();
  
  const conversions = [];
  
  // hotel-common実装とhotel-saas実装のペアを探す
  const commonTasks = [];
  const saasTasks = [];
  
  for await (const issue of issues.nodes) {
    const state = await issue.state;
    const title = issue.title;
    
    if (title.includes('[hotel-common実装]')) {
      const ssotName = title.replace('[hotel-common実装] ', '');
      commonTasks.push({
        id: issue.id,
        identifier: issue.identifier,
        title: title,
        ssotName: ssotName,
        state: state?.name || 'Backlog',
        description: issue.description || ''
      });
    } else if (title.includes('[hotel-saas実装]')) {
      const ssotName = title.replace('[hotel-saas実装] ', '');
      saasTasks.push({
        id: issue.id,
        identifier: issue.identifier,
        title: title,
        ssotName: ssotName,
        state: state?.name || 'Backlog',
        description: issue.description || ''
      });
    }
  }
  
  console.log(`📊 検出:)`);
  console.log(`   - hotel-common実装: ${commonTasks.length}件`);
  console.log(`   - hotel-saas実装: ${saasTasks.length}件\n`);
  
  // ペアを見つける
  for (const commonTask of commonTasks) {
    const saasTask = saasTasks.find(t => t.ssotName === commonTask.ssotName);
    
    if (saasTask) {
      conversions.push({
        ssotName: commonTask.ssotName,
        commonTask: commonTask,
        saasTask: saasTask
      });
    }
  }
  
  console.log(`🔗 ペア検出: ${conversions.length}件\n`);
  
  // 変換実行
  for (const conversion of conversions) {
    console.log(`📝 ${conversion.ssotName}:`);
    console.log(`   Common: ${conversion.commonTask.identifier} (${conversion.commonTask.state})`);
    console.log(`   Saas: ${conversion.saasTask.identifier} (${conversion.saasTask.state})`);
    
    // 1. hotel-common実装のタイトルを変更
    const newTitle = `[実装（Full-Stack）] ${conversion.ssotName}`;
    const newDescription = `# 実装タスク（Full-Stack方式）

## 対象SSOT
- ${conversion.ssotName}

## 実装範囲
- ✅ hotel-common実装（API基盤・DB層）
- ✅ hotel-saas実装（プロキシ・UI層）

## 実装順序
1. hotel-common実装
   - Prismaスキーマ更新
   - サービス層実装
   - API実装
   - テスト
   
2. hotel-saas実装
   - プロキシAPI実装
   - UIコンポーネント実装
   - 手動UIテスト

## チェックリスト
- [ ] SSOT読了
- [ ] 既存実装調査完了
- [ ] hotel-common実装完了
- [ ] hotel-common APIテスト合格
- [ ] hotel-saas実装完了
- [ ] hotel-saas 手動UIテスト合格
- [ ] トレーサビリティマトリクス更新
- [ ] Linear Issue更新（Done）

---

**元のタスク**:
- hotel-common: ${conversion.commonTask.identifier}
- hotel-saas: ${conversion.saasTask.identifier}（統合済み）
`;
    
    await client.updateIssue(conversion.commonTask.id, {
      title: newTitle,
      description: newDescription
    });
    
    console.log(`   ✅ ${conversion.commonTask.identifier}: タイトル・説明を更新`);
    
    // 2. hotel-saas実装をCancelledに変更（統合済み）
    const cancelledStates = await client.workflowStates({ 
      filter: { team: { key: { eq: 'OMOAI' } } } 
    });
    
    let cancelledStateId = null;
    for await (const state of cancelledStates.nodes) {
      if (state.name === 'Canceled' || state.type === 'canceled') {
        cancelledStateId = state.id;
        break;
      }
    }
    
    if (cancelledStateId) {
      await client.updateIssue(conversion.saasTask.id, {
        stateId: cancelledStateId,
        description: `# 統合済み

このタスクは ${conversion.commonTask.identifier} に統合されました。

**理由**: 機能単位Full-Stack方式への移行

**新しいタスク**: ${conversion.commonTask.identifier}
`
      });
      
      console.log(`   ✅ ${conversion.saasTask.identifier}: Cancelledに変更（統合済み）\n`);
    }
  }
  
  console.log('═'.repeat(60));
  console.log(`✅ 変換完了: ${conversions.length}件\n`);
  console.log('📊 新体制:');
  console.log(`   - [実装（Full-Stack）]: ${conversions.length}件`);
  console.log(`   - [hotel-saas実装]（統合済み）: ${conversions.length}件\n`);
  
  return conversions;
}

// スクリプト実行
if (require.main === module) {
  convertToFullStack()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ エラーが発生しました:', error);
      process.exit(1);
    });
}

module.exports = { convertToFullStack };







