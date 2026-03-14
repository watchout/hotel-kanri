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
const { 
  generateContextSection, 
  generateHooksChecklist,
  loadMemory 
} = require('./lib/context-loader.cjs');

// ===== テンプレート読み込み =====

const TEMPLATES_DIR = path.join(__dirname, 'templates');

function loadTemplate(name) {
  const templatePath = path.join(TEMPLATES_DIR, name);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`テンプレートが見つかりません: ${name}`);
  }
  return fs.readFileSync(templatePath, 'utf-8');
}

// ===== ヘルパー関数 =====

const HELPERS = {
  lowercase: (str) => String(str).toLowerCase(),
  uppercase: (str) => String(str).toUpperCase(),
  add: (a, b) => Number(a) + Number(b),
  eq: (a, b) => a === b,
  ne: (a, b) => a !== b,
  gt: (a, b) => a > b,
  lt: (a, b) => a < b,
  json: (obj) => JSON.stringify(obj, null, 2),
  first: (arr) => Array.isArray(arr) ? arr[0] : null,
  last: (arr) => Array.isArray(arr) ? arr[arr.length - 1] : null,
  join: (arr, sep) => Array.isArray(arr) ? arr.join(sep || ', ') : ''
};

// ===== テンプレート変数展開 =====

/**
 * Handlebars風の変数展開（改良版）
 */
function expandTemplate(template, variables) {
  let result = template;
  
  // 1. ヘルパー関数展開: {{lowercase VAR}} or {{add @index 1}}
  result = expandHelpers(result, variables);
  
  // 2. 配列ループ展開: {{#each items}}...{{/each}}
  result = expandEachBlocks(result, variables);
  
  // 3. 条件展開: {{#if condition}}...{{/if}}
  result = expandIfBlocks(result, variables);
  
  // 4. 単純変数展開: {{VAR}}
  Object.entries(variables).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }
  });
  
  // 5. 残った未展開変数を空文字に置換（警告付き）
  result = cleanupUnexpandedVars(result);
  
  return result;
}

/**
 * ヘルパー関数展開
 */
function expandHelpers(template, variables) {
  // {{helperName arg1 arg2}} パターン
  const helperPattern = /\{\{(\w+)\s+([^}]+)\}\}/g;
  
  return template.replace(helperPattern, (match, helperName, argsStr) => {
    const helper = HELPERS[helperName];
    if (!helper) {
      // ヘルパーではない（単純変数）→ そのまま返す
      return match;
    }
    
    // 引数を解析
    const args = argsStr.trim().split(/\s+/).map(arg => {
      // 変数参照の場合
      if (arg.startsWith('@')) {
        return arg; // @index等はそのまま
      }
      // 数値
      if (!isNaN(arg)) {
        return Number(arg);
      }
      // 変数参照
      if (variables[arg] !== undefined) {
        return variables[arg];
      }
      // 文字列リテラル
      return arg;
    });
    
    try {
      return String(helper(...args));
    } catch (e) {
      return match;
    }
  });
}

/**
 * 未展開変数をクリーンアップ
 */
function cleanupUnexpandedVars(template) {
  // {{xxx}} パターンで残っているものを検出
  const unexpanded = template.match(/\{\{[^}]+\}\}/g) || [];
  
  // 警告対象（ただし #each, #if, /each, /if は除外）
  const warnings = unexpanded.filter(v => 
    !v.includes('#') && 
    !v.includes('/') && 
    !v.includes('@')
  );
  
  if (warnings.length > 0) {
    // デバッグ用（本番では無効化）
    // console.warn(`⚠️ 未展開変数: ${warnings.slice(0, 5).join(', ')}`);
  }
  
  // 未展開変数を適切なプレースホルダーに置換
  let result = template;
  
  // router.{{lowercase method}} → router.post 等に変換（コンテキストから推測）
  result = result.replace(/router\.\{\{lowercase method\}\}/g, 'router.post');
  result = result.replace(/\{\{lowercase method\}\}/g, 'post');
  result = result.replace(/\{\{method\}\}/g, 'POST');
  
  // 残りの未展開変数は削除（コードブロック内のプレースホルダーとして残さない）
  result = result.replace(/\{\{[^}]+\}\}/g, '');
  
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
  
  // SSOT照合チェック（100%準拠確認）
  const complianceCheck = verifySSOTCompliance(finalPrompt, parsedSSOT);
  
  return {
    taskId: effectiveTaskId,
    ssotId: parsedSSOT.id,
    classification,
    prompts,
    finalPrompt,
    variables,
    generatedAt: new Date().toISOString(),
    complianceCheck
  };
}

/**
 * SSOT照合チェック - プロンプトがSSOTに100%準拠しているか確認
 */
function verifySSOTCompliance(prompt, parsedSSOT) {
  const result = {
    passed: true,
    totalRequirements: parsedSSOT.requirements.length,
    missingRequirements: [],
    missingAPIs: [],
    missingSchemas: [],
    warnings: []
  };
  
  // 1. 全要件IDがプロンプトに含まれているか
  parsedSSOT.requirements.forEach(req => {
    if (!prompt.includes(req.id)) {
      result.passed = false;
      result.missingRequirements.push(req.id);
    }
  });
  
  // 2. 全APIパスがプロンプトに含まれているか
  parsedSSOT.api.forEach(api => {
    if (!prompt.includes(api.path)) {
      result.passed = false;
      result.missingAPIs.push(`${api.method} ${api.path}`);
    }
  });
  
  // 3. 全DBスキーマ名がプロンプトに含まれているか
  parsedSSOT.database.forEach(schema => {
    if (!prompt.includes(schema.name)) {
      result.warnings.push(`スキーマ "${schema.name}" がプロンプトに含まれていない可能性`);
    }
  });
  
  // 4. Accept条件が含まれているか（サンプリングチェック）
  const sampleRequirements = parsedSSOT.requirements.slice(0, 3);
  sampleRequirements.forEach(req => {
    if (req.accept && req.accept.length > 0) {
      const firstAccept = req.accept[0].substring(0, 30); // 最初の30文字
      if (!prompt.includes(firstAccept)) {
        result.warnings.push(`${req.id}のAccept条件が完全に含まれていない可能性`);
      }
    }
  });
  
  return result;
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
 * 変数準備（改良版）
 */
function prepareVariables(parsedSSOT, classification, taskId) {
  // ルート名を推定
  const routeName = deriveRouteName(parsedSSOT);
  const routerName = toCamelCase(routeName);
  const basePath = deriveBasePath(parsedSSOT);
  const featureName = deriveFeatureName(parsedSSOT);
  
  // APIリストを拡張
  const apiList = parsedSSOT.api.map(a => ({
    ...a,
    lowercase: a.method.toLowerCase(),
    pathSuffix: extractPathSuffix(a.path, basePath),
    hasBody: ['POST', 'PUT', 'PATCH'].includes(a.method),
    hasParams: a.path.includes(':'),
    params: extractParams(a.path),
    statusCode: a.method === 'POST' ? 201 : 200,
    // ★修正: SSOTから抽出したPrismaモデル名を使用（最初のモデルをデフォルト）
    modelName: derivePrismaModelName(parsedSSOT.database, routeName),
    prismaMethod: derivePrismaMethod(a.method),
    sampleBody: deriveSampleBody(a.method)
  }));

  // 生成済みコンテンツ
  const generatedContent = {
    // 要件テーブル
    REQUIREMENTS_TABLE: generateRequirementsTable(parsedSSOT.requirements),
    
    // APIテーブル
    API_TABLE: generateAPITable(apiList),
    
    // API実装コード
    API_IMPLEMENTATIONS: generateAPIImplementations(apiList, routeName),
    
    // プロキシ実装
    PROXY_IMPLEMENTATIONS: generateProxyImplementations(apiList, basePath),
    
    // curlコマンド
    CURL_COMMANDS: generateCurlCommands(apiList, basePath),
    
    // 要件チェックリスト
    REQUIREMENTS_CHECKLIST: generateRequirementsChecklist(parsedSSOT.requirements),
    
    // Prismaスキーマ（完全版）
    PRISMA_SCHEMA: generatePrismaSchema(parsedSSOT.database),
    
    // Accept条件一覧
    ACCEPT_CONDITIONS: generateAcceptConditionsList(parsedSSOT.requirements)
  };
  
  return {
    // 基本情報
    TASK_ID: taskId,
    FEATURE_NAME: featureName,
    SSOT_PATH: parsedSSOT.path,
    
    // カウント
    requirementCount: parsedSSOT.requirements.length,
    apiCount: parsedSSOT.api.length,
    
    // ルーティング
    routeName,
    routerName,
    basePath,
    fileName: routeName,
    
    // 生成済みコンテンツ
    ...generatedContent,
    
    // 要件
    requirements: parsedSSOT.requirements.map(r => ({
      ...r,
      accept: r.accept || []
    })),
    
    // API
    api: apiList,
    
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
 * 要件テーブル生成
 */
function generateRequirementsTable(requirements) {
  if (requirements.length === 0) return '_（要件なし）_';
  
  let table = '| ID | 名前 | タイプ | Accept条件 |\n';
  table += '|:---|:-----|:-------|:-----------|\n';
  
  requirements.forEach(r => {
    const accept = Array.isArray(r.accept) ? r.accept.join(', ') : (r.accept || '-');
    table += `| ${r.id} | ${r.name} | ${r.type} | ${accept.substring(0, 50)} |\n`;
  });
  
  return table;
}

/**
 * APIテーブル生成
 */
function generateAPITable(apiList) {
  if (apiList.length === 0) return '_（APIなし）_';
  
  let table = '| Method | Path | 説明 |\n';
  table += '|:-------|:-----|:-----|\n';
  
  apiList.forEach(a => {
    table += `| ${a.method} | \`${a.path}\` | ${a.description || '-'} |\n`;
  });
  
  return table;
}

/**
 * API実装コード生成
 */
function generateAPIImplementations(apiList, routeName) {
  if (apiList.length === 0) return '// TODO: API実装';
  
  return apiList.map(api => {
    const method = api.method.toLowerCase();
    const pathSuffix = api.pathSuffix || '/';
    const hasParams = api.hasParams;
    const params = api.params || [];
    
    let code = `
/**
 * ${api.method} ${api.path}
 * ${api.description || ''}
 */
router.${method}('${pathSuffix}', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(401).json(createErrorResponse('UNAUTHORIZED', 'テナントIDが必要です'));
    }
`;

    if (hasParams && params.length > 0) {
      code += `    const { ${params.join(', ')} } = req.params;\n`;
    }
    
    if (api.hasBody) {
      code += `    const body = req.body;\n`;
    }

    // Prisma操作
    code += `
    // TODO: ビジネスロジック実装
    const result = await prisma.${api.modelName}.${api.prismaMethod}({
      where: { tenant_id: tenantId }
    });

    return res.status(${api.statusCode}).json(createSuccessResponse(result));
  } catch (error) {
    console.error('${api.path} エラー:', error);
    return res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'サーバーエラー'));
  }
});`;
    
    return code;
  }).join('\n\n');
}

/**
 * プロキシ実装生成
 */
function generateProxyImplementations(apiList, basePath) {
  if (apiList.length === 0) return '// TODO: プロキシ実装';
  
  return apiList.map(api => {
    const method = api.method.toLowerCase();
    // パスサフィックスをNitroファイル名形式に変換
    // /:id -> /[id]
    const pathSuffix = api.pathSuffix || '/';
    const fileName = pathSuffix
      .replace(/^\//, '')
      .replace(/:(\w+)/g, '[$1]') || 'index';
    const safeFileName = fileName;
    
    // ★修正: URLパラメータを置換するコードを生成
    const hasParams = api.hasParams;
    const params = api.params || [];
    let paramExtraction = '';
    let resolvedPath = api.path;
    
    if (hasParams && params.length > 0) {
      // getRouterParamでパラメータを取得
      paramExtraction = params.map(p => `  const ${p} = getRouterParam(event, '${p}');`).join('\n');
      // パスのパラメータを実際の値で置換
      params.forEach(p => {
        resolvedPath = resolvedPath.replace(`:${p}`, `\${${p}}`);
      });
    }
    
    return `
### ${api.method} ${api.path}

ファイル: \`server/api/v1/${basePath}/${safeFileName}.${method}.ts\`

\`\`\`typescript
import { callHotelCommonAPI } from '~/server/utils/api-client';
import { ensureGuestContext } from '~/server/utils/guest-context';${hasParams ? `
import { getRouterParam } from 'h3';` : ''}

export default defineEventHandler(async (event) => {
  const { tenantId } = await ensureGuestContext(event);
${paramExtraction ? '\n' + paramExtraction + '\n' : ''}
  const response = await callHotelCommonAPI(event, \`${resolvedPath}\`, {
    method: '${api.method}',
    headers: { 'x-tenant-id': tenantId }${api.hasBody ? ',\n    body: await readBody(event)' : ''}
  });
  
  return response;
});
\`\`\``;
  }).join('\n\n');
}

/**
 * curlコマンド生成
 */
function generateCurlCommands(apiList, basePath) {
  if (apiList.length === 0) return '# TODO: curlコマンド';
  
  return apiList.map(api => {
    const path = api.path.replace(/:(\w+)/g, '1'); // パラメータを1に置換
    let cmd = `# ${api.method} ${api.path}\ncurl -s`;
    
    if (api.method !== 'GET') {
      cmd += ` -X ${api.method}`;
    }
    
    cmd += ` http://localhost:3401${path}`;
    cmd += ` \\\n  -H 'x-tenant-id: tenant-003bc06e-4ea0-4f93-9ce2-bf56dfe237b7'`;
    
    if (api.hasBody) {
      cmd += ` \\\n  -H 'Content-Type: application/json'`;
      cmd += ` \\\n  -d '{"key": "value"}'`;
    }
    
    cmd += ' | jq .';
    
    return '```bash\n' + cmd + '\n```';
  }).join('\n\n');
}

/**
 * 要件チェックリスト生成
 */
function generateRequirementsChecklist(requirements) {
  if (requirements.length === 0) return '- [ ] 要件なし';
  
  return requirements.map(r => `- [ ] ${r.id}: ${r.name}`).join('\n');
}

/**
 * Prismaスキーマ生成（完全版）
 */
function generatePrismaSchema(database) {
  if (!database || database.length === 0) return '// スキーマ定義なし';
  
  let schema = '```prisma\n';
  
  database.forEach(item => {
    if (item.type === 'enum') {
      schema += `enum ${item.name} {\n`;
      item.values.forEach(v => {
        schema += `  ${v}\n`;
      });
      schema += '}\n\n';
    } else if (item.type === 'prisma' && item.raw) {
      schema += item.raw + '\n\n';
    } else if (item.type === 'prisma' && item.fields) {
      schema += `model ${item.name} {\n`;
      item.fields.forEach(f => {
        const opt = f.optional ? '?' : '';
        const attr = f.attributes ? ` ${f.attributes}` : '';
        schema += `  ${f.name}  ${f.type}${opt}${attr}\n`;
      });
      schema += '}\n\n';
    }
  });
  
  schema += '```';
  return schema;
}

/**
 * Accept条件一覧生成
 */
function generateAcceptConditionsList(requirements) {
  const lines = [];
  
  requirements.forEach(req => {
    if (req.accept && req.accept.length > 0) {
      lines.push(`### ${req.id}: ${req.name}`);
      lines.push('');
      req.accept.forEach(a => {
        lines.push(`- [ ] ${a}`);
      });
      lines.push('');
    }
  });
  
  return lines.length > 0 ? lines.join('\n') : '_（Accept条件なし）_';
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
  if (!matches) return [];
  return matches.map(m => m.replace(':', ''));
}

/**
 * Prismaモデル名を導出（SSOTから抽出）
 * ★修正: SSOTのPrismaスキーマからモデル名を取得
 */
function derivePrismaModelName(database, fallbackRouteName) {
  // SSOTのdatabaseからPrismaモデルを探す
  const prismaModels = database.filter(d => d.type === 'prisma');
  if (prismaModels.length > 0) {
    // 最初のモデル名を使用（lowerCamelCase形式に変換）
    const modelName = prismaModels[0].name;
    // PascalCase -> lowerCamelCase (e.g., HandoffRequest -> handoffRequest)
    return modelName.charAt(0).toLowerCase() + modelName.slice(1);
  }
  // フォールバック: ルート名を使用
  return fallbackRouteName.replace(/-/g, '_');
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
 * 最終プロンプトを組み立て（Context統合版）
 */
function assembleFinalPrompt(prompts, classification, variables) {
  let final = '';
  
  // ヘッダー
  final += `# ${variables.TASK_ID}: ${variables.FEATURE_NAME}\n\n`;
  final += `**タスクタイプ**: ${classification.taskType}\n`;
  final += `**推定工数**: ${classification.estimatedHours}時間\n`;
  final += `**生成日時**: ${new Date().toISOString()}\n\n`;
  final += '---\n\n';
  
  // ★ Agents/Skills/Rules/Memory コンテキスト挿入
  try {
    const contextSection = generateContextSection(
      classification.taskType,
      deriveTargetSystem(variables),
      extractKeywords(variables)
    );
    if (contextSection) {
      final += contextSection;
      final += '\n---\n\n';
    }
  } catch (e) {
    console.warn('⚠️ コンテキスト生成スキップ:', e.message);
  }
  
  // 共通セクション全体を含める（重要！）
  if (prompts['common-sections.template.md']) {
    final += prompts['common-sections.template.md'];
    final += '\n\n---\n\n';
  }
  
  // メインテンプレート
  if (prompts['backend-api.template.md']) {
    final += prompts['backend-api.template.md'];
  }
  
  // ★ Hooksチェックリスト挿入
  try {
    const hooksChecklist = generateHooksChecklist();
    if (hooksChecklist) {
      final += '\n\n---\n\n';
      final += hooksChecklist;
    }
  } catch (e) {
    console.warn('⚠️ Hooksチェックリスト生成スキップ:', e.message);
  }
  
  return final;
}

/**
 * ターゲットシステムを推定
 */
function deriveTargetSystem(variables) {
  // basePath からシステムを推定
  if (variables.basePath) {
    if (variables.basePath.includes('admin')) {
      return 'hotel-saas-rebuild';
    }
    if (variables.basePath.includes('guest') || variables.basePath.includes('ai')) {
      return 'hotel-common-rebuild';
    }
  }
  return 'hotel-common-rebuild'; // デフォルト
}

/**
 * キーワードを抽出（Memory検索用）
 */
function extractKeywords(variables) {
  const keywords = [];
  
  // ルート名
  if (variables.routeName) {
    keywords.push(variables.routeName);
  }
  
  // 機能名から単語を抽出
  if (variables.FEATURE_NAME) {
    const words = variables.FEATURE_NAME.split(/[\s_-]+/);
    keywords.push(...words.filter(w => w.length > 2));
  }
  
  // 要件IDから機能カテゴリを抽出
  if (variables.requirements && variables.requirements.length > 0) {
    const firstReq = variables.requirements[0];
    if (firstReq.id) {
      const prefix = firstReq.id.split('-')[0];
      keywords.push(prefix);
    }
  }
  
  return keywords;
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
