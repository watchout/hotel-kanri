const { LinearClient } = require('@linear/sdk');
const fs = require('fs');

// 設定
const CONFIG = {
  LINEAR_API_KEY: process.env.LINEAR_API_KEY,
  MATRIX_DATA_FILE: __dirname + '/matrix-data.json',
  DRY_RUN: process.argv.includes('--dry-run'),
};

// Linear IDs
const TEAM_ID = 'e7971fae-ad3b-434d-9477-9a22fc1c31a6'; // OmotenasuAI

const PROJECT_IDS = {
  '00_foundation': 'a8b70852-54f7-4be6-b9bc-f662baa318bc', // hotel-kanri
  '01_admin_features': '7500f252-c38c-41c1-9cd9-ff441d26e822', // hotel-saas
  '02_guest_features': '7500f252-c38c-41c1-9cd9-ff441d26e822', // hotel-saas
  '03_business_features': '04bd20dc-59df-47f0-8ec4-f7f2d797b604', // hotel-common
  '04_monitoring': '04bd20dc-59df-47f0-8ec4-f7f2d797b604', // hotel-common
};

const LABEL_IDS = {
  'ssot-creation': 'a7b7482d-fb46-4fe9-8ed8-d865931e308a',
  'implementation': '1a310bc4-ee15-4b43-bfb3-3941e9f1a26a',
  'api': '362e7394-2cb1-4f2d-9daf-71844e04c4e9',
  'ui': '5d20e5aa-dc03-44ef-a07f-08f23ed3cba3',
  'database': 'ff58cdcd-4fc1-4f09-a67a-709416d16c68',
};

/**
 * Linear Stateを取得
 */
async function getStateId(client, teamId, stateName) {
  const states = await client.workflowStates({
    filter: {
      team: { id: { eq: teamId } },
      name: { eq: stateName }
    }
  });
  
  if (states.nodes.length > 0) {
    return states.nodes[0].id;
  }
  
  return null;
}

/**
 * ステータスをLinear Stateにマッピング
 */
function mapStatus(status) {
  const mapping = {
    'completed': 'Done',
    'in_progress': 'In Progress',
    'todo': 'Todo',
    'na': null, // Issue作成しない
  };
  
  return mapping[status] || 'Todo';
}

/**
 * カテゴリからラベルを決定
 */
function getCategoryLabels(category) {
  const labels = [];
  
  if (category === '00_foundation') {
    labels.push('database');
  } else if (category === '01_admin_features') {
    labels.push('ui');
  } else if (category === '02_guest_features') {
    labels.push('ui');
  } else if (category === '03_business_features') {
    labels.push('api');
  } else if (category === '04_monitoring') {
    labels.push('database');
  }
  
  return labels.map(l => LABEL_IDS[l]).filter(Boolean);
}

/**
 * Issueを作成
 */
async function createIssue(client, ssot, phase, type) {
  const projectId = PROJECT_IDS[ssot.category];
  const labelIds = [
    ...getCategoryLabels(ssot.category),
    type === 'ssot-creation' ? LABEL_IDS['ssot-creation'] : LABEL_IDS['implementation'],
  ];
  
  let status, title, description;
  
  if (phase === 'ssot-creation') {
    status = ssot.ssotCreation;
    title = `[SSOT作成] ${ssot.name.replace('.md', '')}`;
    description = `
## 📋 SSOT作成タスク

**SSOT名**: ${ssot.name}
**カテゴリ**: ${ssot.category}
**備考**: ${ssot.remark}

---

## ✅ タスク内容

- SSOTファイル作成
- データベース設計
- API設計
- UI設計
    `.trim();
  } else if (phase === 'saas-implementation') {
    status = ssot.saasImplementation;
    title = `[hotel-saas実装] ${ssot.name.replace('.md', '')}`;
    description = `
## 📋 hotel-saas実装タスク

**SSOT名**: ${ssot.name}
**カテゴリ**: ${ssot.category}
**備考**: ${ssot.remark}

---

## ✅ タスク内容

- hotel-saasでの実装
- UIコンポーネント作成
- Composables実装
- Pages実装
    `.trim();
  } else if (phase === 'common-implementation') {
    status = ssot.commonImplementation;
    title = `[hotel-common実装] ${ssot.name.replace('.md', '')}`;
    description = `
## 📋 hotel-common実装タスク

**SSOT名**: ${ssot.name}
**カテゴリ**: ${ssot.category}
**備考**: ${ssot.remark}

---

## ✅ タスク内容

- hotel-commonでの実装
- API実装
- データベースマイグレーション
- サービス層実装
    `.trim();
  }
  
  // na (対象外) の場合はスキップ
  if (status === 'na') {
    return { success: true, skipped: true };
  }
  
  const stateName = mapStatus(status);
  const stateId = await getStateId(client, TEAM_ID, stateName);
  
  const issueData = {
    teamId: TEAM_ID,
    projectId,
    title,
    description,
    labelIds,
  };
  
  if (stateId) {
    issueData.stateId = stateId;
  }
  
  if (CONFIG.DRY_RUN) {
    console.log(`  [DRY RUN] Would create: ${title} (${stateName})`);
    return { success: true };
  }
  
  try {
    const result = await client.createIssue(issueData);
    return { success: result.success, issueId: result._issue?.id };
  } catch (error) {
    console.error(`❌ Error creating ${title}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log('🚀 Matrix to Linear Migration\n');
  
  if (CONFIG.DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  // マトリックスデータを読み込み
  const ssots = JSON.parse(fs.readFileSync(CONFIG.MATRIX_DATA_FILE, 'utf-8'));
  console.log(`📖 Loaded ${ssots.length} SSOTs from matrix\n`);
  
  const client = new LinearClient({ apiKey: CONFIG.LINEAR_API_KEY });
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  console.log('📝 Creating issues...\n');
  
  for (const ssot of ssots) {
    console.log(`Processing: ${ssot.name}`);
    
    // 1. SSOT作成Issue
    const ssotResult = await createIssue(client, ssot, 'ssot-creation', 'ssot-creation');
    if (ssotResult.success) {
      if (ssotResult.skipped) {
        skipped++;
      } else {
        created++;
      }
    } else {
      failed++;
    }
    
    // 2. hotel-saas実装Issue
    const saasResult = await createIssue(client, ssot, 'saas-implementation', 'implementation');
    if (saasResult.success) {
      if (saasResult.skipped) {
        skipped++;
      } else {
        created++;
      }
    } else {
      failed++;
    }
    
    // 3. hotel-common実装Issue
    const commonResult = await createIssue(client, ssot, 'common-implementation', 'implementation');
    if (commonResult.success) {
      if (commonResult.skipped) {
        skipped++;
      } else {
        created++;
      }
    } else {
      failed++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Total SSOTs: ${ssots.length}`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  
  if (CONFIG.DRY_RUN) {
    console.log('\n✅ Dry run completed successfully');
  } else {
    console.log('\n✅ Migration completed successfully');
  }
}

// 実行
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

