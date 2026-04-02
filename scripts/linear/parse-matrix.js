const fs = require('fs');

/**
 * SSOT_PROGRESS_MASTER.mdのマトリックスセクションを解析
 * 各SSOTの進捗状態（SSOT作成、saas実装、common実装）を抽出
 */

const PROGRESS_FILE = '../../docs/03_ssot/SSOT_PROGRESS_MASTER.md';

// ステータス絵文字のマッピング
const STATUS_MAP = {
  '✅': 'completed',      // 完全実装
  '🟢': 'in_progress',    // 部分実装
  '🟡': 'in_progress',    // 実装中
  '⭕': 'todo',           // 実装予定
  '❌': 'todo',           // 未実装/未着手
  '-': 'na',              // 対象外
};

function parseMatrix() {
  const content = fs.readFileSync(PROGRESS_FILE, 'utf-8');
  const lines = content.split('\n');
  
  const ssots = [];
  let currentCategory = null;
  let inMatrixSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // マトリックスセクションの開始検出
    if (line.match(/^## 📊 詳細進捗状況（既存SSOT一覧）/)) {
      inMatrixSection = true;
      continue;
    }
    
    // マトリックスセクションの終了検出
    if (inMatrixSection && line.match(/^## 🎯 次のアクション/)) {
      break;
    }
    
    if (!inMatrixSection) continue;
    
    // カテゴリ検出
    const categoryMatch = line.match(/^### ([\w_]+)\/（(.+?)）/);
    if (categoryMatch) {
      currentCategory = {
        name: categoryMatch[1],
        description: categoryMatch[2],
      };
      continue;
    }
    
    // SSOTデータ行の検出
    // パターン1: | # | SSOT名 | SSOT作成 | hotel-saas実装 | hotel-common実装 | 備考 |
    // パターン2: | # | SSOT名 | SSOT作成 | hotel-saas実装 | 備考 | (guest_featuresのみ)
    
    const columns = line.split('|').map(c => c.trim()).filter(c => c);
    
    if (columns.length >= 4 && columns[0].match(/^\d+$/) && currentCategory) {
      const number = parseInt(columns[0]);
      const name = columns[1];
      const ssotStatus = columns[2];
      const saasStatus = columns[3];
      
      // 5列目がステータス絵文字ならcommon実装、それ以外なら備考
      let commonStatus = null;
      let remark = '';
      
      if (columns.length >= 5) {
        if (columns[4].match(/^[✅🟢🟡⭕❌\-]+$/)) {
          // 5列目がステータス → common実装あり
          commonStatus = columns[4];
          remark = columns[5] || '';
        } else {
          // 5列目が備考 → common実装なし
          remark = columns[4];
        }
      }
      
      ssots.push({
        category: currentCategory.name,
        number: number,
        name: name,
        ssotCreation: STATUS_MAP[ssotStatus] || 'todo',
        saasImplementation: STATUS_MAP[saasStatus] || 'todo',
        commonImplementation: commonStatus ? (STATUS_MAP[commonStatus] || 'todo') : 'na',
        remark: remark,
      });
    }
  }
  
  return ssots;
}

// 統計情報を出力
function printStats(ssots) {
  console.log('📊 マトリックス解析結果\n');
  console.log('総SSOT数:', ssots.length, '件\n');
  
  // カテゴリ別集計
  const byCategory = {};
  ssots.forEach(ssot => {
    if (!byCategory[ssot.category]) {
      byCategory[ssot.category] = 0;
    }
    byCategory[ssot.category]++;
  });
  
  console.log('カテゴリ別:');
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}件`);
  });
  
  // Issue数を計算
  let totalIssues = 0;
  ssots.forEach(ssot => {
    // SSOT作成
    if (ssot.ssotCreation !== 'na') totalIssues++;
    
    // saas実装
    if (ssot.saasImplementation !== 'na') totalIssues++;
    
    // common実装
    if (ssot.commonImplementation !== 'na') totalIssues++;
  });
  
  console.log('\n作成すべきIssue総数:', totalIssues, '件');
  
  // ステータス別集計
  const statusCounts = {
    ssotCreation: { completed: 0, in_progress: 0, todo: 0 },
    saasImplementation: { completed: 0, in_progress: 0, todo: 0 },
    commonImplementation: { completed: 0, in_progress: 0, todo: 0 },
  };
  
  ssots.forEach(ssot => {
    if (ssot.ssotCreation !== 'na') {
      statusCounts.ssotCreation[ssot.ssotCreation]++;
    }
    if (ssot.saasImplementation !== 'na') {
      statusCounts.saasImplementation[ssot.saasImplementation]++;
    }
    if (ssot.commonImplementation !== 'na') {
      statusCounts.commonImplementation[ssot.commonImplementation]++;
    }
  });
  
  console.log('\nステータス別:');
  console.log('  SSOT作成:');
  console.log(`    完了: ${statusCounts.ssotCreation.completed}件`);
  console.log(`    進行中: ${statusCounts.ssotCreation.in_progress}件`);
  console.log(`    未着手: ${statusCounts.ssotCreation.todo}件`);
  
  console.log('  hotel-saas実装:');
  console.log(`    完了: ${statusCounts.saasImplementation.completed}件`);
  console.log(`    進行中: ${statusCounts.saasImplementation.in_progress}件`);
  console.log(`    未着手: ${statusCounts.saasImplementation.todo}件`);
  
  console.log('  hotel-common実装:');
  console.log(`    完了: ${statusCounts.commonImplementation.completed}件`);
  console.log(`    進行中: ${statusCounts.commonImplementation.in_progress}件`);
  console.log(`    未着手: ${statusCounts.commonImplementation.todo}件`);
}

// メイン実行
if (require.main === module) {
  try {
    const ssots = parseMatrix();
    printStats(ssots);
    
    // JSONとして出力（他のスクリプトから利用可能）
    console.log('\n📄 JSON出力: matrix-data.json');
    fs.writeFileSync(
      __dirname + '/matrix-data.json',
      JSON.stringify(ssots, null, 2)
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = { parseMatrix };

