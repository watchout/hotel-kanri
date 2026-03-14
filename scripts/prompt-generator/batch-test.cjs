#!/usr/bin/env node
/**
 * バッチテスト: 複数SSOTで95点達成率を検証
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// テスト対象SSOT（異なるタイプから選択）
const TEST_SSOTS = [
  // 認証系
  'docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md',
  'docs/03_ssot/00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md',
  
  // API/データベース系
  'docs/03_ssot/00_foundation/SSOT_GENERIC_RESOURCES_API.md',
  'docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md',
  
  // ゲスト機能
  'docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_FAQ_AUTO_RESPONSE.md',
  'docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md',
  
  // 管理機能
  'docs/03_ssot/01_admin_features/SSOT_SAAS_MENU_MANAGEMENT.md',
  'docs/03_ssot/00_foundation/SSOT_SAAS_STAFF_MANAGEMENT.md',
  
  // マルチテナント/多言語
  'docs/03_ssot/00_foundation/SSOT_SAAS_MULTITENANT.md',
  'docs/03_ssot/00_foundation/SSOT_MULTILINGUAL_SYSTEM.md',
];

async function runBatchTest() {
  console.log('═'.repeat(60));
  console.log('🧪 バッチテスト開始: SSOT準拠95点達成率検証');
  console.log('═'.repeat(60));
  console.log(`📊 テスト対象: ${TEST_SSOTS.length}件`);
  console.log('');
  
  const results = [];
  let passed = 0;
  let failed = 0;
  let errors = 0;
  
  for (let i = 0; i < TEST_SSOTS.length; i++) {
    const ssotPath = TEST_SSOTS[i];
    const ssotName = path.basename(ssotPath, '.md');
    const taskId = `BATCH-${String(i + 1).padStart(3, '0')}`;
    
    console.log(`\n[${i + 1}/${TEST_SSOTS.length}] ${ssotName}`);
    console.log('─'.repeat(50));
    
    // SSOTファイルの存在確認
    if (!fs.existsSync(ssotPath)) {
      console.log(`   ⚠️ ファイルが存在しません: ${ssotPath}`);
      errors++;
      results.push({ ssot: ssotName, status: 'NOT_FOUND', score: 0 });
      continue;
    }
    
    try {
      // パイプライン実行（監査のみ、自動修正なし）
      const startTime = Date.now();
      const output = execSync(
        `node scripts/prompt-generator/run-full-pipeline.cjs "${ssotPath}" --task-id ${taskId}`,
        { 
          encoding: 'utf-8',
          timeout: 300000, // 5分タイムアウト
          maxBuffer: 10 * 1024 * 1024
        }
      );
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      // スコア抽出
      const ssotScoreMatch = output.match(/SSOT単独スコア:\s*(\d+)点/);
      const passMatch = output.match(/SSOT単独スコア:\s*\d+点\s*(✅|❌)\s*(PASS|FAIL)/);
      
      const ssotScore = ssotScoreMatch ? parseInt(ssotScoreMatch[1]) : 0;
      const isPassed = passMatch && passMatch[2] === 'PASS';
      
      if (isPassed) {
        console.log(`   ✅ PASS - SSOTスコア: ${ssotScore}点 (${elapsed}s)`);
        passed++;
      } else {
        console.log(`   ❌ FAIL - SSOTスコア: ${ssotScore}点 (${elapsed}s)`);
        failed++;
      }
      
      results.push({ 
        ssot: ssotName, 
        status: isPassed ? 'PASS' : 'FAIL', 
        score: ssotScore,
        time: elapsed
      });
      
    } catch (error) {
      console.log(`   ⚠️ エラー: ${error.message.split('\n')[0]}`);
      errors++;
      results.push({ ssot: ssotName, status: 'ERROR', score: 0 });
    }
  }
  
  // 結果サマリー
  console.log('\n' + '═'.repeat(60));
  console.log('📊 バッチテスト結果');
  console.log('═'.repeat(60));
  
  const passRate = ((passed / TEST_SSOTS.length) * 100).toFixed(1);
  const avgScore = results.filter(r => r.score > 0).reduce((a, b) => a + b.score, 0) / 
                   results.filter(r => r.score > 0).length || 0;
  
  console.log(`\n| 指標 | 値 |`);
  console.log(`|:-----|:---|`);
  console.log(`| テスト総数 | ${TEST_SSOTS.length}件 |`);
  console.log(`| ✅ PASS | ${passed}件 |`);
  console.log(`| ❌ FAIL | ${failed}件 |`);
  console.log(`| ⚠️ ERROR | ${errors}件 |`);
  console.log(`| **合格率** | **${passRate}%** |`);
  console.log(`| 平均スコア | ${avgScore.toFixed(1)}点 |`);
  
  console.log('\n### 詳細結果\n');
  console.log('| SSOT | 状態 | スコア |');
  console.log('|:-----|:-----|:-------|');
  results.forEach(r => {
    const statusIcon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`| ${r.ssot} | ${statusIcon} ${r.status} | ${r.score}点 |`);
  });
  
  // 結論
  console.log('\n' + '═'.repeat(60));
  if (passed === TEST_SSOTS.length) {
    console.log('🎉 全SSOT合格！理論値確定：95点達成可能');
  } else if (passRate >= 80) {
    console.log(`✅ 高い合格率（${passRate}%）：ほぼ理論値確定`);
  } else {
    console.log(`⚠️ 合格率${passRate}%：さらなる改善が必要`);
  }
  console.log('═'.repeat(60));
  
  return { passed, failed, errors, passRate, avgScore, results };
}

runBatchTest().catch(console.error);
