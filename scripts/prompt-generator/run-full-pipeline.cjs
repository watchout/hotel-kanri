#!/usr/bin/env node
/**
 * AI駆動開発パイプライン - 統合スクリプト
 * 
 * SSOT → 解析 → 分類 → プロンプト生成 → 監査 → 修正 → 出力
 * 
 * Usage: node run-full-pipeline.cjs <SSOT_PATH> [options]
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { parseSSOT } = require('./parse-ssot.cjs');
const { classifyTask } = require('./classify-task.cjs');
const { generatePrompt } = require('./generate-prompt.cjs');
const { PromptAuditor } = require('./audit-prompt.cjs');

// ===== パイプライン設定 =====

const PIPELINE_CONFIG = {
  // 監査を実行するか
  enableAudit: true,
  
  // 自動修正を実行するか
  enableAutoFix: true,
  
  // Dry Runモード（LLM呼び出しをスキップ）
  dryRun: false,
  
  // 出力ディレクトリ
  outputDir: 'prompts/generated',
  
  // ログディレクトリ
  logDir: 'logs/pipeline'
};

// ===== パイプライン実行 =====

async function runPipeline(ssotPath, options = {}) {
  const config = { ...PIPELINE_CONFIG, ...options };
  const startTime = Date.now();
  const results = {
    ssotPath,
    stages: {},
    errors: [],
    warnings: []
  };

  console.log('═'.repeat(60));
  console.log('🚀 AI駆動開発パイプライン開始');
  console.log('═'.repeat(60));
  console.log(`📄 SSOT: ${ssotPath}`);
  console.log(`⚙️  監査: ${config.enableAudit ? 'ON' : 'OFF'}`);
  console.log(`🔧 自動修正: ${config.enableAutoFix ? 'ON' : 'OFF'}`);
  console.log(`🧪 Dry Run: ${config.dryRun ? 'ON' : 'OFF'}`);
  console.log('─'.repeat(60));

  try {
    // ===== Stage 1: SSOT解析 =====
    console.log('\n📋 Stage 1: SSOT解析...');
    const parsed = parseSSOT(ssotPath);
    results.stages.parse = {
      success: true,
      requirementCount: parsed.requirements.length,
      apiCount: parsed.api.length,
      dbCount: parsed.database.length
    };
    console.log(`   ✅ 要件: ${parsed.requirements.length}件`);
    console.log(`   ✅ API: ${parsed.api.length}件`);
    console.log(`   ✅ DB: ${parsed.database.length}件`);

    // ===== Stage 2: タスク分類 =====
    console.log('\n🔍 Stage 2: タスク分類...');
    const classification = classifyTask(parsed);
    results.stages.classify = {
      success: true,
      taskType: classification.taskType,
      agents: classification.agents,
      estimatedHours: classification.estimatedHours,
      priority: classification.priority
    };
    console.log(`   ✅ タイプ: ${classification.taskType}`);
    console.log(`   ✅ 優先度: ${classification.priority}`);
    console.log(`   ✅ 工数: ${classification.estimatedHours}時間`);

    // ===== Stage 3: プロンプト生成 =====
    console.log('\n📝 Stage 3: プロンプト生成...');
    const taskId = options.taskId || `IMPL-${parsed.id.replace('SSOT_', '')}`;
    const generated = generatePrompt(parsed, taskId);
    results.stages.generate = {
      success: true,
      taskId: generated.taskId,
      promptLength: generated.finalPrompt.length,
      estimatedTokens: Math.ceil(generated.finalPrompt.length / 4),
      complianceCheck: generated.complianceCheck
    };
    console.log(`   ✅ タスクID: ${generated.taskId}`);
    console.log(`   ✅ 文字数: ${generated.finalPrompt.length.toLocaleString()}`);
    console.log(`   ✅ 推定トークン: ${Math.ceil(generated.finalPrompt.length / 4).toLocaleString()}`);
    
    // SSOT照合チェック結果
    console.log('\n📋 Stage 3.5: SSOT照合チェック...');
    const cc = generated.complianceCheck;
    if (cc.passed) {
      console.log(`   ✅ 全要件ID（${cc.totalRequirements}件）がプロンプトに含まれています`);
    } else {
      console.log(`   ⚠️ SSOT照合チェック: 問題あり`);
      if (cc.missingRequirements.length > 0) {
        console.log(`   ❌ 欠落している要件ID: ${cc.missingRequirements.join(', ')}`);
      }
      if (cc.missingAPIs.length > 0) {
        console.log(`   ❌ 欠落しているAPI: ${cc.missingAPIs.join(', ')}`);
      }
    }
    if (cc.warnings.length > 0) {
      cc.warnings.forEach(w => console.log(`   ⚠️ ${w}`));
    }

    let finalPrompt = generated.finalPrompt;
    let auditResult = null;

    // ===== Stage 4: 監査 =====
    if (config.enableAudit && !config.dryRun) {
      console.log('\n🔍 Stage 4: プロンプト監査...');
      
      const auditor = new PromptAuditor({ dryRun: config.dryRun });
      const ssotContent = fs.readFileSync(ssotPath, 'utf-8');

      if (config.enableAutoFix) {
        // 自動修正ループ
        auditResult = await auditor.auditAndFix(
          finalPrompt, 
          ssotContent, 
          parsed.requirements
        );
        finalPrompt = auditResult.finalPrompt;
        
        // SSOT単独スコアを取得
        const ssotScore = auditResult.auditResult?.ssotScore || 0;
        const passedBySSOT = auditResult.auditResult?.passedBySSOT || false;
        
        results.stages.audit = {
          success: auditResult.success,
          initialScore: auditResult.history[0]?.score || 0,
          finalScore: auditResult.finalScore,
          ssotScore: ssotScore,
          passedBySSOT: passedBySSOT,
          iterations: auditResult.iterations,
          cost: auditResult.cost
        };
        
        // ★ SSOT単独スコアを優先表示
        console.log(`   🎯 SSOT単独スコア: ${ssotScore}点 ${passedBySSOT ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   📊 総合スコア: ${auditResult.finalScore}点`);
        console.log(`   📊 修正回数: ${auditResult.iterations}回`);
        console.log(`   💰 コスト: $${auditResult.cost.totalCostUSD.toFixed(4)}`);
        
      } else {
        // 監査のみ
        auditResult = await auditor.audit(
          finalPrompt, 
          ssotContent, 
          parsed.requirements
        );
        
        results.stages.audit = {
          success: auditResult.passed,
          score: auditResult.totalScore,
          issues: auditResult.allIssues.length,
          cost: auditResult.cost
        };
        
        console.log(`   ${auditResult.passed ? '✅' : '⚠️'} スコア: ${auditResult.totalScore}点`);
        console.log(`   📊 問題数: ${auditResult.allIssues.length}件`);
        console.log(`   💰 コスト: $${auditResult.cost.totalCostUSD.toFixed(4)}`);
      }
    } else if (config.dryRun) {
      console.log('\n🔍 Stage 4: 監査（Dry Run - スキップ）');
      results.stages.audit = { skipped: true, reason: 'dry-run' };
    } else {
      console.log('\n🔍 Stage 4: 監査（無効）');
      results.stages.audit = { skipped: true, reason: 'disabled' };
    }

    // ===== Stage 5: 出力 =====
    console.log('\n💾 Stage 5: 出力...');
    
    // 出力ディレクトリ作成
    const outputDir = path.join(process.cwd(), config.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // プロンプト保存
    const promptFileName = `${taskId}-${path.basename(ssotPath, '.md').toLowerCase()}.md`;
    const promptPath = path.join(outputDir, promptFileName);
    fs.writeFileSync(promptPath, finalPrompt);
    
    // メタデータ保存
    const metaFileName = `${taskId}-meta.json`;
    const metaPath = path.join(outputDir, metaFileName);
    fs.writeFileSync(metaPath, JSON.stringify({
      taskId,
      ssotPath,
      classification: results.stages.classify,
      audit: results.stages.audit,
      generatedAt: new Date().toISOString(),
      promptPath
    }, null, 2));
    
    results.stages.output = {
      success: true,
      promptPath,
      metaPath
    };
    
    console.log(`   ✅ プロンプト: ${promptPath}`);
    console.log(`   ✅ メタデータ: ${metaPath}`);

    // ===== 完了 =====
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    results.success = true;
    results.elapsedSeconds = parseFloat(elapsedTime);
    results.finalPromptPath = promptPath;

    console.log('\n' + '═'.repeat(60));
    console.log('✅ パイプライン完了');
    console.log('═'.repeat(60));
    console.log(`   ⏱️  所要時間: ${elapsedTime}秒`);
    console.log(`   📄 出力: ${promptPath}`);
    
    if (auditResult?.cost) {
      console.log(`   💰 総コスト: $${auditResult.cost.totalCostUSD.toFixed(4)} (¥${auditResult.cost.totalCostJPY.toFixed(0)})`);
    }
    
    if (auditResult) {
      const ssotScore = auditResult.auditResult?.ssotScore || auditResult.ssotScore || 0;
      const passedBySSOT = auditResult.auditResult?.passedBySSOT || auditResult.passedBySSOT || false;
      
      if (passedBySSOT) {
        console.log('\n🎉 SSOT準拠合格！（95点以上）');
        console.log('   プロンプトはSSOTに十分準拠しています。');
      } else if (!auditResult.success) {
        console.log('\n⚠️ 注意: SSOT準拠基準（95点）に達していません。');
        console.log(`   現在のSSOTスコア: ${ssotScore}点`);
        console.log('   人間によるレビュー・修正を推奨します。');
      }
    }

    return results;

  } catch (error) {
    results.success = false;
    results.errors.push(error.message);
    console.error(`\n❌ パイプラインエラー: ${error.message}`);
    console.error(error.stack);
    return results;
  }
}

// ===== CLI =====

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node run-full-pipeline.cjs <SSOT_PATH> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --task-id <id>      タスクIDを指定');
    console.error('  --no-audit          監査をスキップ');
    console.error('  --no-fix            自動修正をスキップ');
    console.error('  --dry-run           LLM呼び出しをスキップ');
    console.error('  --output-dir <dir>  出力ディレクトリ');
    console.error('  --json              結果をJSON出力');
    console.error('');
    console.error('Examples:');
    console.error('  # 基本実行');
    console.error('  node run-full-pipeline.cjs docs/03_ssot/SSOT_XXX.md');
    console.error('');
    console.error('  # タスクID指定');
    console.error('  node run-full-pipeline.cjs docs/03_ssot/SSOT_XXX.md --task-id DEV-0200');
    console.error('');
    console.error('  # 監査なし（高速）');
    console.error('  node run-full-pipeline.cjs docs/03_ssot/SSOT_XXX.md --no-audit');
    process.exit(1);
  }

  const ssotPath = args[0];
  
  // オプション解析
  const options = {
    taskId: null,
    enableAudit: !args.includes('--no-audit'),
    enableAutoFix: !args.includes('--no-fix'),
    dryRun: args.includes('--dry-run'),
    outputJson: args.includes('--json')
  };

  const taskIdIdx = args.indexOf('--task-id');
  if (taskIdIdx !== -1 && args[taskIdIdx + 1]) {
    options.taskId = args[taskIdIdx + 1];
  }

  const outputDirIdx = args.indexOf('--output-dir');
  if (outputDirIdx !== -1 && args[outputDirIdx + 1]) {
    options.outputDir = args[outputDirIdx + 1];
  }

  // ファイル存在確認
  if (!fs.existsSync(ssotPath)) {
    console.error(`❌ SSOTファイルが見つかりません: ${ssotPath}`);
    process.exit(1);
  }

  // パイプライン実行
  const results = await runPipeline(ssotPath, options);

  // JSON出力
  if (options.outputJson) {
    console.log('\n--- JSON出力 ---');
    console.log(JSON.stringify(results, null, 2));
  }

  // 終了コード
  process.exit(results.success ? 0 : 1);
}

// エクスポート
module.exports = { runPipeline };

if (require.main === module) {
  main().catch(console.error);
}
