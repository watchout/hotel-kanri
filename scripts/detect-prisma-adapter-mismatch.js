#!/usr/bin/env node

/**
 * Prismaアダプターの不足を検出するスクリプト
 * 
 * このスクリプトは以下を検出します：
 * 1. Prismaスキーマで定義されているがアダプターが存在しないモデル
 * 2. コード内で直接PrismaClientを使用している箇所
 * 
 * 使用方法:
 *   node scripts/detect-prisma-adapter-mismatch.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { execSync } = require('child_process');

// 色の定義
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Prismaスキーマファイルのパス
const SCHEMA_PATH = path.resolve(process.cwd(), 'prisma/schema.prisma');

// アダプターディレクトリのパス
const ADAPTERS_DIR = path.resolve(process.cwd(), 'src/adapters');

// 結果を保存する変数
let errors = [];
let warnings = [];

/**
 * Prismaスキーマからモデルを抽出する
 * @returns {string[]} モデル名の配列
 */
function extractModelsFromSchema() {
  try {
    if (!fs.existsSync(SCHEMA_PATH)) {
      console.error(`${RED}Error: Prismaスキーマファイルが見つかりません: ${SCHEMA_PATH}${RESET}`);
      process.exit(1);
    }

    const schemaContent = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    const modelRegex = /model\s+(\w+)\s*\{/g;
    const models = [];
    let match;

    while ((match = modelRegex.exec(schemaContent)) !== null) {
      models.push(match[1]);
    }

    return models;
  } catch (error) {
    console.error(`${RED}Error: Prismaスキーマの解析中にエラーが発生しました: ${error.message}${RESET}`);
    process.exit(1);
  }
}

/**
 * アダプターファイルを検索する
 * @returns {string[]} アダプターファイルパスの配列
 */
function findAdapterFiles() {
  try {
    // アダプターディレクトリが存在しない場合は作成
    if (!fs.existsSync(ADAPTERS_DIR)) {
      console.warn(`${YELLOW}Warning: アダプターディレクトリが見つかりません: ${ADAPTERS_DIR}${RESET}`);
      return [];
    }

    // アダプターファイルを検索
    return glob.sync(path.join(ADAPTERS_DIR, '**/*.{ts,js}'));
  } catch (error) {
    console.error(`${RED}Error: アダプターファイルの検索中にエラーが発生しました: ${error.message}${RESET}`);
    process.exit(1);
  }
}

/**
 * アダプターファイルからモデル名を抽出する
 * @param {string[]} adapterFiles アダプターファイルパスの配列
 * @returns {string[]} アダプターが実装されているモデル名の配列
 */
function extractModelsFromAdapters(adapterFiles) {
  try {
    const implementedModels = new Set();

    adapterFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      
      // クラス名からモデル名を抽出 (例: UserAdapter -> User)
      const classRegex = /class\s+(\w+)Adapter/g;
      let match;
      
      while ((match = classRegex.exec(content)) !== null) {
        const adapterName = match[1];
        // モデル名はアダプター名から "Adapter" を削除したもの
        implementedModels.add(adapterName);
      }
      
      // Prismaの直接使用を検出 (例: prisma.user.findMany())
      const prismaUsageRegex = /prisma\.(\w+)\./g;
      while ((match = prismaUsageRegex.exec(content)) !== null) {
        const modelName = match[1];
        // 最初の文字を大文字に変換（user -> User）
        const capitalizedModelName = modelName.charAt(0).toUpperCase() + modelName.slice(1);
        implementedModels.add(capitalizedModelName);
      }
    });

    return Array.from(implementedModels);
  } catch (error) {
    console.error(`${RED}Error: アダプターファイルの解析中にエラーが発生しました: ${error.message}${RESET}`);
    process.exit(1);
  }
}

/**
 * 直接PrismaClientを使用しているファイルを検出する
 * @returns {Object[]} 違反ファイルの情報
 */
function detectDirectPrismaUsage() {
  try {
    // ESLintを使用して違反を検出
    const eslintCmd = 'npx eslint --no-eslintrc --parser @typescript-eslint/parser ' + 
                      '--plugin @typescript-eslint --rule "prisma-adapter-rule: 2" ' +
                      '--rulesdir scripts/eslint-rules ' +
                      'src/**/*.{ts,js} -f json';
    
    let eslintOutput;
    try {
      eslintOutput = execSync(eslintCmd, { encoding: 'utf-8' });
    } catch (error) {
      // ESLintがエラーを返した場合（違反がある場合）
      eslintOutput = error.stdout;
    }
    
    const results = JSON.parse(eslintOutput);
    const violations = [];
    
    results.forEach(result => {
      if (result.messages && result.messages.length > 0) {
        result.messages.forEach(message => {
          if (message.ruleId === 'prisma-adapter-rule') {
            violations.push({
              file: result.filePath,
              line: message.line,
              column: message.column,
              message: message.message
            });
          }
        });
      }
    });
    
    return violations;
  } catch (error) {
    console.error(`${RED}Error: ESLintの実行中にエラーが発生しました: ${error.message}${RESET}`);
    console.error('ESLintが正しくインストールされていることを確認してください。');
    return [];
  }
}

/**
 * メイン関数
 */
function main() {
  console.log('🔍 Prismaアダプターの不足を検出しています...');
  
  // Prismaスキーマからモデルを抽出
  const schemaModels = extractModelsFromSchema();
  console.log(`📊 Prismaスキーマで定義されているモデル: ${schemaModels.length}個`);
  
  // アダプターファイルを検索
  const adapterFiles = findAdapterFiles();
  console.log(`📁 アダプターファイル: ${adapterFiles.length}個`);
  
  // アダプターからモデルを抽出
  const implementedModels = extractModelsFromAdapters(adapterFiles);
  console.log(`🔧 アダプターが実装されているモデル: ${implementedModels.length}個`);
  
  // アダプターが不足しているモデルを検出
  const missingAdapters = schemaModels.filter(model => !implementedModels.includes(model));
  if (missingAdapters.length > 0) {
    console.log(`${YELLOW}⚠️ アダプターが不足しているモデル: ${missingAdapters.length}個${RESET}`);
    missingAdapters.forEach(model => {
      console.log(`   - ${model}`);
      warnings.push(`モデル '${model}' のアダプターが実装されていません`);
    });
  } else {
    console.log(`${GREEN}✅ すべてのモデルにアダプターが実装されています${RESET}`);
  }
  
  // 直接PrismaClientを使用しているファイルを検出
  const directUsageViolations = detectDirectPrismaUsage();
  if (directUsageViolations.length > 0) {
    console.log(`${RED}❌ 直接PrismaClientを使用しているファイル: ${directUsageViolations.length}個${RESET}`);
    directUsageViolations.forEach(violation => {
      const relativePath = path.relative(process.cwd(), violation.file);
      console.log(`   - ${relativePath}:${violation.line}:${violation.column} - ${violation.message}`);
      errors.push(`${relativePath}:${violation.line}:${violation.column} - ${violation.message}`);
    });
  } else {
    console.log(`${GREEN}✅ 直接PrismaClientを使用しているファイルはありません${RESET}`);
  }
  
  // 結果の表示
  console.log('\n📝 検証結果:');
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`${GREEN}✅ すべての検証に合格しました！${RESET}`);
    process.exit(0);
  } else {
    if (errors.length > 0) {
      console.log(`${RED}❌ エラー: ${errors.length}個${RESET}`);
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log(`${YELLOW}⚠️ 警告: ${warnings.length}個${RESET}`);
      warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    // エラーがある場合は終了コード1で終了
    if (errors.length > 0) {
      process.exit(1);
    }
    
    // 警告のみの場合は終了コード0で終了
    process.exit(0);
  }
}

// スクリプト実行
main();



