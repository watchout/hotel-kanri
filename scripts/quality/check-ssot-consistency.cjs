#!/usr/bin/env node

/**
 * SSOT間整合性チェックスクリプト
 * 
 * チェック項目:
 * 1. 用語の統一性（tenant_id vs tenantId）
 * 2. APIパスの一貫性
 * 3. 認証方式の統一性
 * 4. データ型の統一性
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

// 用語の標準定義
const TERM_STANDARDS = {
  'tenant_id vs tenantId': {
    context: 'database',
    patterns: [/\btenant_id\b/g, /\btenantId\b/g],
    standard: 'tenant_id',  // データベースカラム名
    prismaStandard: 'tenantId',  // Prismaフィールド名
    description: 'データベース: tenant_id、Prismaフィールド: tenantId'
  },
  'user_id vs userId': {
    context: 'database',
    patterns: [/\buser_id\b/g, /\buserId\b/g],
    standard: 'user_id',
    prismaStandard: 'userId',
    description: 'データベース: user_id、Prismaフィールド: userId'
  },
  'スタッフ vs 管理者': {
    context: 'terminology',
    patterns: [/\bスタッフ\b/g, /\b管理者\b/g],
    standard: 'スタッフ',
    description: 'システム内の用語統一'
  },
  'ロール vs 役割': {
    context: 'terminology',
    patterns: [/\bロール\b/g, /\b役割\b/g],
    standard: 'ロール',
    description: 'システム内の用語統一'
  },
  'パーミッション vs 権限': {
    context: 'terminology',
    patterns: [/\bパーミッション\b/g, /\b権限\b/g],
    standard: '権限',
    description: 'システム内の用語統一'
  }
};

// 認証方式の標準
const AUTH_STANDARDS = {
  'Session認証': {
    patterns: [/Session認証/gi, /Redis.*Cookie/gi, /HttpOnly.*Cookie/gi],
    standard: true,
    description: '推奨認証方式'
  },
  'JWT認証': {
    patterns: [/JWT認証/gi, /Bearer.*token/gi],
    standard: false,
    description: '非推奨認証方式（過去の仕様）'
  }
};

async function checkSsotConsistency() {
  console.log('🔍 SSOT間整合性チェック開始\n');
  
  const ssotDir = path.join(__dirname, '../../docs/03_ssot');
  
  // 現行SSOTのみをチェック対象に（参考資料・履歴は除外）
  const SSOT_DIRECTORIES = [
    '00_foundation',      // 基盤SSOT
    '01_admin_features',  // 管理機能SSOT
    '02_guest_features',  // ゲスト機能SSOT
    '03_integration',     // 統合SSOT
    'openapi',            // OpenAPI仕様
  ];
  
  let ssotFiles = [];
  for (const dir of SSOT_DIRECTORIES) {
    const dirPath = path.join(ssotDir, dir);
    try {
      const files = await glob(`${dirPath}/**/*.{md,yaml,yml}`);
      ssotFiles.push(...files);
    } catch (err) {
      // ディレクトリが存在しない場合はスキップ
      console.log(`⚠️  ${dir} ディレクトリが存在しません（スキップ）`);
    }
  }
  
  // SSOT_PROGRESS_MASTER.md も含める（進捗管理の唯一の真実）
  const progressMaster = path.join(ssotDir, 'SSOT_PROGRESS_MASTER.md');
  try {
    await fs.access(progressMaster);
    ssotFiles.push(progressMaster);
  } catch (err) {
    // ファイルが存在しない場合はスキップ
  }
  
  console.log(`📊 対象SSOT数: ${ssotFiles.length}件`);
  console.log(`📁 チェック対象ディレクトリ: ${SSOT_DIRECTORIES.join(', ')}\n`);
  
  const ssots = [];
  for (const file of ssotFiles) {
    const content = await fs.readFile(file, 'utf-8');
    ssots.push({
      file: path.relative(ssotDir, file),
      fullPath: file,
      content: content
    });
  }
  
  const errors = [];
  const warnings = [];
  
  // 1. 用語の統一性チェック
  console.log('📝 用語の統一性チェック...\n');
  
  for (const [termName, config] of Object.entries(TERM_STANDARDS)) {
    const usage = {};
    
    for (const ssot of ssots) {
      for (let i = 0; i < config.patterns.length; i++) {
        const pattern = config.patterns[i];
        const matches = ssot.content.match(pattern) || [];
        
        if (matches.length > 0) {
          const term = matches[0];
          if (!usage[term]) usage[term] = [];
          usage[term].push({ file: ssot.file, count: matches.length });
        }
      }
    }
    
    // 複数の表記が混在している場合は警告
    const uniqueTerms = Object.keys(usage);
    if (uniqueTerms.length > 1) {
      // データベース用語の場合、文脈を考慮
      if (config.context === 'database') {
        // Prismaスキーマ内ではcamelCase、それ以外ではsnake_caseが許容される
        const hasBothContexts = uniqueTerms.some(t => t.includes('_')) && 
                                uniqueTerms.some(t => !t.includes('_'));
        
        if (hasBothContexts) {
          // 許容範囲内（Prismaとデータベースの使い分け）
          console.log(`✅ ${termName}: 文脈別の使い分けを検出（適切）`);
          console.log(`   - データベース: ${config.standard}`);
          console.log(`   - Prisma: ${config.prismaStandard}`);
        }
      } else {
        warnings.push({
          type: 'TERM_INCONSISTENCY',
          term: termName,
          standard: config.standard,
          usage: usage,
          message: `用語の不統一: ${termName}`,
          description: config.description
        });
        
        console.log(`⚠️  ${termName}:`);
        for (const [term, files] of Object.entries(usage)) {
          console.log(`   - "${term}": ${files.length}ファイル（合計${files.reduce((sum, f) => sum + f.count, 0)}回）`);
        }
        console.log(`   推奨: "${config.standard}"\n`);
      }
    } else if (uniqueTerms.length === 1) {
      console.log(`✅ ${termName}: 統一されています（"${uniqueTerms[0]}"）\n`);
    }
  }
  
  // 2. APIパスの一貫性チェック
  console.log('🌐 APIパスの一貫性チェック...\n');
  
  const apiPaths = {};
  const apiPathRegex = /(?:POST|GET|PUT|DELETE|PATCH)\s+`([^`]+)`/g;
  
  for (const ssot of ssots) {
    let match;
    while ((match = apiPathRegex.exec(ssot.content)) !== null) {
      const apiPath = match[1];
      if (!apiPaths[apiPath]) apiPaths[apiPath] = [];
      apiPaths[apiPath].push(ssot.file);
    }
  }
  
  console.log(`   検出されたAPIパス数: ${Object.keys(apiPaths).length}件\n`);
  
  // 類似パスの検出（表記ゆれ）
  const pathVariations = {};
  for (const [apiPath, files] of Object.entries(apiPaths)) {
    const normalized = apiPath.toLowerCase().replace(/[-_]/g, '');
    if (!pathVariations[normalized]) pathVariations[normalized] = [];
    pathVariations[normalized].push({ path: apiPath, files });
  }
  
  let variationCount = 0;
  for (const [normalized, variations] of Object.entries(pathVariations)) {
    if (variations.length > 1) {
      variationCount++;
      warnings.push({
        type: 'API_PATH_VARIATION',
        normalized: normalized,
        variations: variations,
        message: `APIパスの表記ゆれの可能性`
      });
      
      console.log(`⚠️  表記ゆれの可能性:`);
      for (const variation of variations) {
        console.log(`   - "${variation.path}"`);
        console.log(`     使用: ${variation.files.join(', ')}`);
      }
      console.log('');
    }
  }
  
  if (variationCount === 0) {
    console.log(`✅ APIパスの表記ゆれは検出されませんでした\n`);
  }
  
  // 3. 認証方式の統一性チェック
  console.log('🔐 認証方式の統一性チェック...\n');
  
  const authUsage = {};
  
  for (const ssot of ssots) {
    for (const [method, config] of Object.entries(AUTH_STANDARDS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(ssot.content)) {
          if (!authUsage[method]) authUsage[method] = [];
          authUsage[method].push(ssot.file);
          break;
        }
      }
    }
  }
  
  // 非推奨認証方式の使用チェック
  if (authUsage['JWT認証'] && authUsage['JWT認証'].length > 0) {
    // 現行SSOTのみをチェック対象にしているため、
    // 検出された場合は全て現行SSOTでの使用
    errors.push({
      type: 'DEPRECATED_AUTH_METHOD',
      method: 'JWT認証',
      files: authUsage['JWT認証'],
      message: `非推奨の認証方式（JWT認証）が現行SSOTで使用されています`
    });
    
    console.log(`❌ 非推奨の認証方式（JWT認証）が現行SSOTで検出されました:`);
    console.log(`   使用ファイル数: ${authUsage['JWT認証'].length}件`);
    authUsage['JWT認証'].slice(0, 5).forEach(file => {
      console.log(`   - ${file}`);
    });
    if (authUsage['JWT認証'].length > 5) {
      console.log(`   ... 他${authUsage['JWT認証'].length - 5}件`);
    }
    console.log('');
  }
  
  if (authUsage['Session認証']) {
    console.log(`✅ 推奨認証方式（Session認証）: ${authUsage['Session認証'].length}件\n`);
  }
  
  // 4. 結果サマリー
  console.log('═'.repeat(60));
  console.log('📊 チェック結果サマリー\n');
  console.log(`総SSOT数: ${ssots.length}件`);
  console.log(`エラー: ${errors.length}件`);
  console.log(`警告: ${warnings.length}件\n`);
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ 全てのチェックに合格しました！\n');
    return { success: true, score: 100 };
  }
  
  // スコア算出
  const score = Math.max(0, 100 - (errors.length * 10) - (warnings.length * 2));
  console.log(`品質スコア: ${score}/100点\n`);
  
  if (score < 90) {
    console.log('⚠️  品質スコアが90点未満です。改善が必要です。\n');
  }
  
  // 詳細レポート出力
  const reportPath = path.join(__dirname, '../../.cursor/ssot-consistency-report.json');
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalSsots: ssots.length,
    errors: errors,
    warnings: warnings,
    score: score
  }, null, 2));
  
  console.log(`📄 詳細レポート: ${reportPath}\n`);
  
  return {
    success: errors.length === 0,
    score: score,
    errors: errors,
    warnings: warnings
  };
}

// スクリプト実行
if (require.main === module) {
  checkSsotConsistency()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ エラーが発生しました:', error);
      process.exit(1);
    });
}

module.exports = { checkSsotConsistency };

