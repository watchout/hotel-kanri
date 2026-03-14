#!/usr/bin/env node

/**
 * package.jsonにPrisma関連のスクリプトを追加するスクリプト
 * 
 * このスクリプトは以下を行います：
 * 1. package.jsonを読み込む
 * 2. Prisma関連のスクリプトを追加
 * 3. 更新されたpackage.jsonを保存
 * 
 * 使用方法:
 *   node scripts/update-package-json.js
 */

const fs = require('fs');
const path = require('path');

// 色の定義
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// package.jsonのパス
const PACKAGE_JSON_PATH = path.resolve(process.cwd(), 'package.json');

/**
 * package.jsonを読み込む
 * @returns {Object} package.jsonの内容
 */
function readPackageJson() {
  try {
    if (!fs.existsSync(PACKAGE_JSON_PATH)) {
      console.error(`${RED}Error: package.jsonが見つかりません: ${PACKAGE_JSON_PATH}${RESET}`);
      process.exit(1);
    }

    const packageJsonContent = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8');
    return JSON.parse(packageJsonContent);
  } catch (error) {
    console.error(`${RED}Error: package.jsonの解析中にエラーが発生しました: ${error.message}${RESET}`);
    process.exit(1);
  }
}

/**
 * package.jsonを更新する
 * @param {Object} packageJson package.jsonの内容
 */
function updatePackageJson(packageJson) {
  try {
    // scriptsプロパティがない場合は作成
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    // Prisma関連のスクリプトを追加
    const prismaScripts = {
      "prisma:validate": "npx prisma validate",
      "prisma:format": "npx prisma format",
      "prisma:generate": "npx prisma generate",
      "prisma:check-adapter": "node scripts/detect-prisma-adapter-mismatch.js",
      "prisma:setup-hooks": "chmod +x scripts/setup-git-hooks.sh && ./scripts/setup-git-hooks.sh",
      "lint:prisma": "eslint --no-eslintrc --parser @typescript-eslint/parser --plugin @typescript-eslint --rule \"prisma-adapter-rule: 2\" --rulesdir scripts/eslint-rules src/**/*.{ts,js}"
    };

    // 既存のスクリプトを上書きしないように確認
    let hasChanges = false;
    for (const [key, value] of Object.entries(prismaScripts)) {
      if (!packageJson.scripts[key]) {
        packageJson.scripts[key] = value;
        hasChanges = true;
      } else if (packageJson.scripts[key] !== value) {
        console.log(`${YELLOW}Warning: スクリプト '${key}' は既に存在します。上書きしません。${RESET}`);
      }
    }

    if (!hasChanges) {
      console.log(`${YELLOW}変更はありません。すべてのスクリプトは既に存在します。${RESET}`);
      return false;
    }

    // 更新されたpackage.jsonを保存
    fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));
    return true;
  } catch (error) {
    console.error(`${RED}Error: package.jsonの更新中にエラーが発生しました: ${error.message}${RESET}`);
    process.exit(1);
  }
}

/**
 * メイン関数
 */
function main() {
  console.log('📦 package.jsonにPrisma関連のスクリプトを追加しています...');
  
  // package.jsonを読み込む
  const packageJson = readPackageJson();
  
  // package.jsonを更新する
  const updated = updatePackageJson(packageJson);
  
  if (updated) {
    console.log(`${GREEN}✅ package.jsonが更新されました。${RESET}`);
    console.log('以下のスクリプトが追加されました:');
    console.log('  - prisma:validate: Prismaスキーマを検証');
    console.log('  - prisma:format: Prismaスキーマをフォーマット');
    console.log('  - prisma:generate: Prismaクライアントを生成');
    console.log('  - prisma:check-adapter: アダプターの不足を検出');
    console.log('  - prisma:setup-hooks: Git Hooksを設定');
    console.log('  - lint:prisma: Prismaアダプターパターンの使用を検証');
  } else {
    console.log(`${GREEN}✅ 変更はありません。${RESET}`);
  }
  
  console.log('\n使用方法:');
  console.log('  npm run prisma:validate     # Prismaスキーマを検証');
  console.log('  npm run prisma:check-adapter # アダプターの不足を検出');
  console.log('  npm run prisma:setup-hooks  # Git Hooksを設定');
  console.log('  npm run lint:prisma         # Prismaアダプターパターンの使用を検証');
}

// スクリプト実行
main();



