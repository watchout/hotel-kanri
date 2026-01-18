#!/usr/bin/env node
/**
 * プロンプト生成エンジン
 * 
 * 解析済みSSOTとタスク分類を元に、
 * Claude Code/Codex用の実装プロンプトを生成する。
 * 
 * Usage: node generate-prompt.cjs <SSOT_PATH> [--output <path>]
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { parseSSOT } = require('./parse-ssot.cjs');
const { classifyTask, TASK_TYPES } = require('./classify-task.cjs');

// ===== テンプレート読み込み =====

const TEMPLATES_DIR = path.join(__dirname, 'templates');

function loadTemplate(name) {
  const templatePath = path.join(TEMPLATES_DIR, name);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`テンプレートが見つかりません: ${name}`);
  }
  return fs.readFileSync(templatePath, 'utf-8');
}

// ===== テンプレート変数展開 =====

/**
 * Handlebars風の変数展開
 */
function expandTemplate(template, variables) {
  let result = template;
  
  // 単純変数展開: {{VAR}}
  Object.entries(variables).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
  });
  
  // 配列ループ展開: {{#each items}}...{{/each}}
  result = expandEachBlocks(result, variables);
  
  // 条件展開: {{#if condition}}...{{/if}}
  result = expandIfBlocks(result, variables);
  
  return result;
}

function expandEachBlocks(template, variables) {
  const eachPattern = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  
  return template.replace(eachPattern, (match, arrayName, innerTemplate) => {
    const array = variables[arrayName];
    if (!Array.isArray(array)) return '';
    
    return array.map((item, index) => {
      let expanded = innerTemplate;
      
      // @index展開
      expanded = expanded.replace(/\{\{@index\}\}/g, String(index));
      expanded = expanded.replace(/\{\{add @index 1\}\}/g, String(index + 1));
      
      // オブジェクトのプロパティ展開
      if (typeof item === 'object') {
        Object.entries(item).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          expanded = expanded.replace(regex, String(value || ''));
          
          // ネストしたプロパティ
          if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([subKey, subValue]) => {
              const subRegex = new RegExp(`{{${key}.${subKey}}}`, 'g');
              expanded = expanded.replace(subRegex, String(subValue || ''));
            });
          }
          
          // 配列の長さ
          if (Array.isArray(value)) {
            const lenRegex = new RegExp(`{{${key}.length}}`, 'g');
            expanded = expanded.replace(lenRegex, String(value.length));
          }
        });
        
        // {{this}} 展開（オブジェクト全体）
        expanded = expanded.replace(/\{\{this\}\}/g, JSON.stringify(item));
      } else {
        // プリミティブ値
        expanded = expanded.replace(/\{\{this\}\}/g, String(item));
      }
      
      return expanded;
    }).join('\n');
  });
}

function expandIfBlocks(template, variables) {
  const ifPattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  
  return template.replace(ifPattern, (match, conditionName, innerTemplate) => {
    const condition = variables[conditionName];
    if (condition) {
      return innerTemplate;
    }
    return '';
  });
}

// ===== プロンプト生成 =====

/**
 * メインのプロンプト生成関数
 */
function generatePrompt(parsedSSOT, taskId = null) {
  // タスク分類
  const classification = classifyTask(parsedSSOT);
  
  // タスクID決定
  const effectiveTaskId = taskId || `IMPL-${parsedSSOT.id.replace('SSOT_', '')}`;
  
  // テンプレート選択
  const templates = selectTemplates(classification);
  
  // 変数準備
  const variables = prepareVariables(parsedSSOT, classification, effectiveTaskId);
  
  // プロンプト生成
  const prompts = {};
  
  templates.forEach(templateName => {
    try {
      const template = loadTemplate(templateName);
      prompts[templateName] = expandTemplate(template, variables);
    } catch (error) {
      console.warn(`⚠️ テンプレート展開失敗: ${templateName} - ${error.message}`);
    }
  });
  
  // 最終プロンプト組み立て
  const finalPrompt = assembleFinalPrompt(prompts, classification, variables);
  
  return {
    taskId: effectiveTaskId,
    ssotId: parsedSSOT.id,
    classification,
    prompts,
    finalPrompt,
    variables,
    generatedAt: new Date().toISOString()
  };
}

/**
 * テンプレート選択
 */
function selectTemplates(classification) {
  const templates = ['common-sections.template.md'];
  
  switch (classification.taskType) {
    case TASK_TYPES.FULLSTACK:
      templates.push('backend-api.template.md');
      break;
    case TASK_TYPES.API_ONLY:
      templates.push('backend-api.template.md');
      break;
    case TASK_TYPES.UI_ONLY:
      // frontend-page.template.md（未作成の場合はスキップ）
      break;
    case TASK_TYPES.DB_ONLY:
      // backend-db.template.md（未作成の場合はスキップ）
      break;
  }
  
  return templates;
}

/**
 * 変数準備
 */
function prepareVariables(parsedSSOT, classification, taskId) {
  // ルート名を推定
  const routeName = deriveRouteName(parsedSSOT);
  const routerName = toCamelCase(routeName);
  const basePath = deriveBasePath(parsedSSOT);
  const featureName = deriveFeatureName(parsedSSOT);
  
  return {
    // 基本情報
    TASK_ID: taskId,
    FEATURE_NAME: featureName,
    SSOT_PATH: parsedSSOT.path,
    
    // ルーティング
    routeName,
    routerName,
    basePath,
    fileName: routeName,
    
    // 要件
    requirements: parsedSSOT.requirements.map(r => ({
      ...r,
      accept: r.accept || []
    })),
    
    // API
    api: parsedSSOT.api.map(a => ({
      ...a,
      lowercase: a.method.toLowerCase(),
      pathSuffix: extractPathSuffix(a.path, basePath),
      hasBody: ['POST', 'PUT', 'PATCH'].includes(a.method),
      hasParams: a.path.includes(':'),
      params: extractParams(a.path),
      statusCode: a.method === 'POST' ? 201 : 200,
      modelName: routeName.replace(/-/g, '_'),
      prismaMethod: derivePrismaMethod(a.method),
      sampleBody: deriveSampleBody(a.method)
    })),
    
    // データベース
    database: parsedSSOT.database,
    hasDatabase: parsedSSOT.database.length > 0,
    
    // UI
    ui: parsedSSOT.ui,
    hasUI: parsedSSOT.ui.hasUISection,
    
    // 分類
    taskType: classification.taskType,
    agents: classification.agents,
    estimatedHours: classification.estimatedHours
  };
}

/**
 * ルート名を導出
 */
function deriveRouteName(parsedSSOT) {
  // SSOTのIDからルート名を推定
  // SSOT_GUEST_AI_HANDOFF -> handoff
  const id = parsedSSOT.id;
  const parts = id.replace('SSOT_', '').toLowerCase().split('_');
  
  // 最後の部分を使用
  return parts[parts.length - 1];
}

/**
 * ベースパスを導出
 */
function deriveBasePath(parsedSSOT) {
  if (parsedSSOT.api.length > 0) {
    const firstPath = parsedSSOT.api[0].path;
    // /api/v1/handoff/requests -> handoff
    const match = firstPath.match(/\/api\/v1\/([^/]+)/);
    if (match) return match[1];
  }
  return deriveRouteName(parsedSSOT);
}

/**
 * 機能名を導出
 */
function deriveFeatureName(parsedSSOT) {
  if (parsedSSOT.meta.purpose) {
    // 目的の最初の20文字
    return parsedSSOT.meta.purpose.substring(0, 30);
  }
  return parsedSSOT.id.replace('SSOT_', '').replace(/_/g, ' ');
}

/**
 * パスサフィックスを抽出
 */
function extractPathSuffix(fullPath, basePath) {
  // /api/v1/handoff/requests/:id -> /:id
  const basePattern = new RegExp(`/api/v1/${basePath}/?`);
  return fullPath.replace(basePattern, '/') || '/';
}

/**
 * パスパラメータを抽出
 */
function extractParams(path) {
  const matches = path.match(/:(\w+)/g);
  if (!matches) return '';
  return matches.map(m => m.replace(':', '')).join(', ');
}

/**
 * Prismaメソッドを導出
 */
function derivePrismaMethod(httpMethod) {
  switch (httpMethod) {
    case 'GET': return 'findMany';
    case 'POST': return 'create';
    case 'PUT': return 'update';
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'findMany';
  }
}

/**
 * サンプルボディを生成
 */
function deriveSampleBody(httpMethod) {
  if (['POST', 'PUT', 'PATCH'].includes(httpMethod)) {
    return '{"key": "value"}';
  }
  return '';
}

/**
 * キャメルケースに変換
 */
function toCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * 最終プロンプトを組み立て
 */
function assembleFinalPrompt(prompts, classification, variables) {
  let final = '';
  
  // ヘッダー
  final += `# ${variables.TASK_ID}: ${variables.FEATURE_NAME}\n\n`;
  final += `**タスクタイプ**: ${classification.taskType}\n`;
  final += `**推定工数**: ${classification.estimatedHours}時間\n`;
  final += `**生成日時**: ${new Date().toISOString()}\n\n`;
  final += '---\n\n';
  
  // 各テンプレートを結合
  if (prompts['common-sections.template.md']) {
    // 共通セクションから必要な部分だけ抽出
    const commonSections = prompts['common-sections.template.md'];
    const haltSection = commonSections.match(/## 🚨 【自動挿入】実装中断の基準[\s\S]*?---/);
    if (haltSection) {
      final += haltSection[0] + '\n\n';
    }
  }
  
  // メインテンプレート
  if (prompts['backend-api.template.md']) {
    final += prompts['backend-api.template.md'];
  }
  
  return final;
}

// ===== 出力 =====

function outputJSON(result) {
  console.log(JSON.stringify(result, null, 2));
}

function outputPrompt(result) {
  console.log(result.finalPrompt);
}

function outputSummary(result) {
  console.log('='.repeat(60));
  console.log(`📝 プロンプト生成結果: ${result.taskId}`);
  console.log('='.repeat(60));
  
  console.log('\n📋 生成情報:');
  console.log(`   SSOT: ${result.ssotId}`);
  console.log(`   タスクタイプ: ${result.classification.taskType}`);
  console.log(`   推定工数: ${result.classification.estimatedHours}時間`);
  
  console.log('\n📄 使用テンプレート:');
  Object.keys(result.prompts).forEach(name => {
    console.log(`   - ${name}`);
  });
  
  console.log('\n📊 変数:');
  console.log(`   ルート名: ${result.variables.routeName}`);
  console.log(`   ベースパス: ${result.variables.basePath}`);
  console.log(`   API数: ${result.variables.api.length}`);
  console.log(`   要件数: ${result.variables.requirements.length}`);
  
  console.log('\n📏 プロンプト長:');
  console.log(`   総文字数: ${result.finalPrompt.length.toLocaleString()}`);
  console.log(`   推定トークン: ${Math.ceil(result.finalPrompt.length / 4).toLocaleString()}`);
  
  console.log('\n' + '='.repeat(60));
}

function savePrompt(result, outputPath) {
  fs.writeFileSync(outputPath, result.finalPrompt);
  console.log(`✅ プロンプトを保存しました: ${outputPath}`);
}

// ===== CLI =====

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node generate-prompt.cjs <SSOT_PATH> [options]');
    console.error('');
    console.error('Options:');
    console.error('  --json       JSON形式で出力');
    console.error('  --summary    サマリー形式で出力');
    console.error('  --prompt     プロンプトのみ出力（デフォルト）');
    console.error('  --output <path>  ファイルに保存');
    console.error('  --task-id <id>   タスクIDを指定');
    process.exit(1);
  }
  
  const ssotPath = args[0];
  const outputFormat = args.includes('--json') ? 'json' : 
                       args.includes('--summary') ? 'summary' : 'prompt';
  
  // オプション解析
  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : null;
  
  const taskIdIdx = args.indexOf('--task-id');
  const taskId = taskIdIdx !== -1 ? args[taskIdIdx + 1] : null;
  
  if (!fs.existsSync(ssotPath)) {
    console.error(`❌ ファイルが見つかりません: ${ssotPath}`);
    process.exit(1);
  }
  
  try {
    // SSOT解析
    const parsedSSOT = parseSSOT(ssotPath);
    
    // プロンプト生成
    const result = generatePrompt(parsedSSOT, taskId);
    
    // 出力
    if (outputPath) {
      savePrompt(result, outputPath);
    }
    
    switch (outputFormat) {
      case 'json':
        outputJSON(result);
        break;
      case 'summary':
        outputSummary(result);
        break;
      default:
        outputPrompt(result);
    }
    
  } catch (error) {
    console.error(`❌ 生成エラー: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// エクスポート
module.exports = { generatePrompt };

if (require.main === module) {
  main();
}
