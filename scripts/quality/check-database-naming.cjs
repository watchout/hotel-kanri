#!/usr/bin/env node

/**
 * Prismaスキーマの命名規則チェックスクリプト
 * 
 * チェック項目:
 * 1. テーブル名: snake_case
 * 2. カラム名: snake_case
 * 3. Prismaモデル名: PascalCase
 * 4. Prismaフィールド名: camelCase + @map
 * 5. @@map ディレクティブの存在
 */

const fs = require('fs').promises;
const path = require('path');

async function checkDatabaseNaming(schemaPath) {
  console.log('🗄️  Prismaスキーマの命名規則チェック開始\n');
  console.log(`📄 対象: ${schemaPath}\n`);
  
  const schema = await fs.readFile(schemaPath, 'utf-8');
  const errors = [];
  const warnings = [];
  
  // モデル抽出
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let match;
  let modelCount = 0;
  
  while ((match = modelRegex.exec(schema)) !== null) {
    modelCount++;
    const modelName = match[1];
    const modelBody = match[2];
    
    console.log(`🔍 モデル: ${modelName}`);
    
    // 1. モデル名がPascalCaseか
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(modelName)) {
      errors.push({
        type: 'MODEL_NAME_CASE',
        model: modelName,
        message: `モデル名はPascalCaseである必要があります: ${modelName}`,
        suggestion: `例: UnifiedMedia, OrderItem`
      });
      console.log(`   ❌ モデル名: PascalCaseではありません`);
    } else {
      console.log(`   ✅ モデル名: PascalCase`);
    }
    
    // 2. @@map ディレクティブの存在確認
    const mapMatch = modelBody.match(/@@map\("([^"]+)"\)/);
    if (!mapMatch) {
      errors.push({
        type: 'MISSING_TABLE_MAP',
        model: modelName,
        message: `@@map ディレクティブが必要です`,
        suggestion: `@@map("${toSnakeCase(modelName)}")`
      });
      console.log(`   ❌ @@map: なし`);
    } else {
      const tableName = mapMatch[1];
      console.log(`   ✅ @@map: "${tableName}"`);
      
      // 3. テーブル名がsnake_caseか
      if (!/^[a-z][a-z0-9_]*$/.test(tableName)) {
        errors.push({
          type: 'TABLE_NAME_CASE',
          model: modelName,
          table: tableName,
          message: `テーブル名はsnake_caseである必要があります: ${tableName}`,
          suggestion: `例: unified_media, order_items`
        });
        console.log(`      ❌ テーブル名: snake_caseではありません`);
      } else {
        console.log(`      ✅ テーブル名: snake_case`);
      }
    }
    
    // 4. フィールドチェック
    const fieldRegex = /^\s*(\w+)\s+(\w+)(?:\?|\[\])?\s*(@map\("([^"]+)"\))?/gm;
    let fieldMatch;
    let fieldCount = 0;
    let fieldErrorCount = 0;
    
    while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const mapDirective = fieldMatch[3];
      const columnName = fieldMatch[4];
      
      // 特殊フィールドをスキップ
      if (fieldName.startsWith('@@') || fieldName.startsWith('_')) continue;
      
      fieldCount++;
      
      // フィールド名がcamelCaseか
      if (!/^[a-z][a-zA-Z0-9]*$/.test(fieldName)) {
        errors.push({
          type: 'FIELD_NAME_CASE',
          model: modelName,
          field: fieldName,
          message: `フィールド名はcamelCaseである必要があります: ${fieldName}`,
          suggestion: `例: tenantId, createdAt`
        });
        fieldErrorCount++;
      }
      
      // @mapディレクティブがあるか（idフィールド以外）
      if (!mapDirective && fieldName !== 'id') {
        warnings.push({
          type: 'MISSING_FIELD_MAP',
          model: modelName,
          field: fieldName,
          message: `@map ディレクティブの追加を推奨`,
          suggestion: `${fieldName} ${fieldType} @map("${toSnakeCase(fieldName)}")`
        });
        fieldErrorCount++;
      }
      
      // カラム名がsnake_caseか
      if (columnName && !/^[a-z][a-z0-9_]*$/.test(columnName)) {
        errors.push({
          type: 'COLUMN_NAME_CASE',
          model: modelName,
          field: fieldName,
          column: columnName,
          message: `カラム名はsnake_caseである必要があります: ${columnName}`,
          suggestion: `例: tenant_id, created_at`
        });
        fieldErrorCount++;
      }
    }
    
    if (fieldErrorCount === 0) {
      console.log(`   ✅ フィールド: ${fieldCount}件、全て適切`);
    } else {
      console.log(`   ⚠️  フィールド: ${fieldCount}件中${fieldErrorCount}件に問題`);
    }
    
    console.log('');
  }
  
  // 結果サマリー
  console.log('═'.repeat(60));
  console.log('📊 チェック結果サマリー\n');
  console.log(`総モデル数: ${modelCount}件`);
  console.log(`エラー: ${errors.length}件`);
  console.log(`警告: ${warnings.length}件\n`);
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ 全てのチェックに合格しました！\n');
    return { success: true, score: 100 };
  }
  
  // スコア算出
  const score = Math.max(0, 100 - (errors.length * 5) - (warnings.length * 1));
  console.log(`品質スコア: ${score}/100点\n`);
  
  if (score < 90) {
    console.log('⚠️  品質スコアが90点未満です。改善が必要です。\n');
  }
  
  // エラー詳細表示
  if (errors.length > 0) {
    console.log('❌ エラー一覧:\n');
    errors.forEach((error, index) => {
      console.log(`${index + 1}. [${error.type}] ${error.model}`);
      console.log(`   ${error.message}`);
      if (error.suggestion) {
        console.log(`   💡 提案: ${error.suggestion}`);
      }
      console.log('');
    });
  }
  
  // 警告詳細表示
  if (warnings.length > 0) {
    console.log('⚠️  警告一覧:\n');
    warnings.slice(0, 10).forEach((warning, index) => {
      console.log(`${index + 1}. [${warning.type}] ${warning.model}.${warning.field}`);
      console.log(`   ${warning.message}`);
      if (warning.suggestion) {
        console.log(`   💡 提案: ${warning.suggestion}`);
      }
      console.log('');
    });
    
    if (warnings.length > 10) {
      console.log(`   ... 他${warnings.length - 10}件の警告\n`);
    }
  }
  
  // 詳細レポート出力
  const reportPath = path.join(path.dirname(schemaPath), '../.cursor/database-naming-report.json');
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    schemaPath: schemaPath,
    totalModels: modelCount,
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

// ヘルパー関数: camelCase → snake_case
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
}

// スクリプト実行
if (require.main === module) {
  const schemaPath = process.argv[2] || path.join(__dirname, '../../hotel-common/prisma/schema.prisma');
  
  checkDatabaseNaming(schemaPath)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ エラーが発生しました:', error);
      process.exit(1);
    });
}

module.exports = { checkDatabaseNaming };

