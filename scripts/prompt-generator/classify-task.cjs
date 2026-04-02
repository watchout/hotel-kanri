#!/usr/bin/env node
/**
 * タスク種別判定エンジン
 * 
 * 解析済みSSOTデータを元に、タスクをAPI/UI/Full Stackに分類し、
 * 適切な実装エージェント（Claude Code / Codex）を決定する。
 * 
 * Usage: node classify-task.cjs <SSOT_PATH>
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');
const { parseSSOT } = require('./parse-ssot.cjs');

// ===== 分類定義 =====

const TASK_TYPES = {
  FULLSTACK: 'fullstack',
  API_ONLY: 'api-only',
  UI_ONLY: 'ui-only',
  DB_ONLY: 'db-only',
  SSOT_ONLY: 'ssot-only'
};

const AGENTS = {
  CLAUDE_CODE: 'claude-code',
  CODEX: 'codex',
  MANUAL: 'manual'
};

// ===== 分類関数 =====

/**
 * タスクを分類
 * @param {Object} parsedSSOT - 解析済みSSOTデータ
 * @returns {Object} 分類結果
 */
function classifyTask(parsedSSOT) {
  // インジケータを計算
  const indicators = calculateIndicators(parsedSSOT);
  
  // タスクタイプを決定
  const taskType = determineTaskType(indicators);
  
  // エージェント割り当て
  const agents = assignAgents(taskType, indicators);
  
  // 分割戦略
  const splitStrategy = determineSplitStrategy(taskType, parsedSSOT);
  
  // 優先度スコア
  const priority = calculatePriority(parsedSSOT, indicators);
  
  // 推定工数
  const estimatedHours = estimateEffort(parsedSSOT, indicators);
  
  return {
    ssotId: parsedSSOT.id,
    taskType,
    agents,
    splitStrategy,
    priority,
    estimatedHours,
    indicators,
    
    // 推奨テンプレート
    templates: getRecommendedTemplates(taskType),
    
    // 実装順序
    implementationOrder: getImplementationOrder(taskType, parsedSSOT)
  };
}

/**
 * インジケータを計算
 */
function calculateIndicators(parsedSSOT) {
  return {
    // API
    hasApi: parsedSSOT.api.length > 0,
    apiCount: parsedSSOT.api.length,
    hasPostApi: parsedSSOT.api.some(a => a.method === 'POST'),
    hasCrudApi: hasCrudPattern(parsedSSOT.api),
    
    // データベース
    hasDatabase: parsedSSOT.database.length > 0,
    dbTableCount: parsedSSOT.database.length,
    hasPrismaSchema: parsedSSOT.database.some(d => d.type === 'prisma'),
    
    // UI
    hasUI: parsedSSOT.ui.hasUISection,
    uiRelevance: parsedSSOT.ui.uiRelevance,
    pageCount: parsedSSOT.ui.pages.length,
    componentCount: parsedSSOT.ui.components.length,
    
    // 要件
    requirementCount: parsedSSOT.requirements.length,
    frCount: parsedSSOT.requirements.filter(r => r.type === 'FR').length,
    nfrCount: parsedSSOT.requirements.filter(r => r.type === 'NFR').length,
    uiReqCount: parsedSSOT.requirements.filter(r => r.type === 'UI').length,
    
    // 複雑度
    complexity: calculateComplexity(parsedSSOT)
  };
}

/**
 * CRUDパターンを検出
 */
function hasCrudPattern(apis) {
  const methods = apis.map(a => a.method);
  const hasCreate = methods.includes('POST');
  const hasRead = methods.includes('GET');
  const hasUpdate = methods.includes('PUT') || methods.includes('PATCH');
  const hasDelete = methods.includes('DELETE');
  
  // 3つ以上揃っていればCRUD
  return [hasCreate, hasRead, hasUpdate, hasDelete].filter(Boolean).length >= 3;
}

/**
 * 複雑度を計算
 */
function calculateComplexity(parsedSSOT) {
  let score = 0;
  
  // 要件数
  score += parsedSSOT.requirements.length * 2;
  
  // API数
  score += parsedSSOT.api.length * 3;
  
  // DB数
  score += parsedSSOT.database.length * 5;
  
  // UI
  score += parsedSSOT.ui.pages.length * 4;
  score += parsedSSOT.ui.components.length * 2;
  
  // 複雑度レベル
  if (score > 50) return 'high';
  if (score > 20) return 'medium';
  return 'low';
}

/**
 * タスクタイプを決定
 */
function determineTaskType(indicators) {
  // Full Stack: API + UI両方
  if (indicators.hasApi && (indicators.hasUI || indicators.uiRelevance === 'high')) {
    return TASK_TYPES.FULLSTACK;
  }
  
  // API Only: APIのみ、UIなし
  if (indicators.hasApi && !indicators.hasUI && indicators.uiRelevance !== 'high') {
    return TASK_TYPES.API_ONLY;
  }
  
  // UI Only: UIのみ、APIなし
  if (!indicators.hasApi && (indicators.hasUI || indicators.uiRelevance === 'high')) {
    return TASK_TYPES.UI_ONLY;
  }
  
  // DB Only: DBのみ
  if (indicators.hasDatabase && !indicators.hasApi && !indicators.hasUI) {
    return TASK_TYPES.DB_ONLY;
  }
  
  // SSOT Only: 仕様のみ（実装なし）
  return TASK_TYPES.SSOT_ONLY;
}

/**
 * エージェントを割り当て
 */
function assignAgents(taskType, indicators) {
  switch (taskType) {
    case TASK_TYPES.FULLSTACK:
      return {
        backend: AGENTS.CLAUDE_CODE,
        frontend: indicators.complexity === 'high' ? AGENTS.CODEX : AGENTS.CLAUDE_CODE,
        primary: AGENTS.CLAUDE_CODE
      };
      
    case TASK_TYPES.API_ONLY:
    case TASK_TYPES.DB_ONLY:
      return {
        backend: AGENTS.CLAUDE_CODE,
        primary: AGENTS.CLAUDE_CODE
      };
      
    case TASK_TYPES.UI_ONLY:
      return {
        frontend: AGENTS.CODEX,
        primary: AGENTS.CODEX
      };
      
    default:
      return {
        primary: AGENTS.MANUAL
      };
  }
}

/**
 * 分割戦略を決定
 */
function determineSplitStrategy(taskType, parsedSSOT) {
  if (taskType !== TASK_TYPES.FULLSTACK) {
    return null;
  }
  
  // API数が多い場合は機能別分割
  if (parsedSSOT.api.length > 4) {
    return {
      type: 'feature-based',
      description: '機能ごとにBackend/Frontendを実装',
      phases: groupApisByResource(parsedSSOT.api)
    };
  }
  
  // デフォルトはBackend-Frontend分割
  return {
    type: 'backend-frontend',
    description: 'Backend完了後にFrontend実装',
    phases: [
      { name: 'backend', scope: 'hotel-common-rebuild' },
      { name: 'frontend', scope: 'hotel-saas-rebuild' }
    ]
  };
}

/**
 * APIをリソースごとにグループ化
 */
function groupApisByResource(apis) {
  const groups = {};
  
  apis.forEach(api => {
    // パスから第3セグメントを取得
    const segments = api.path.split('/').filter(Boolean);
    const resource = segments[2] || 'default';
    
    if (!groups[resource]) {
      groups[resource] = [];
    }
    groups[resource].push(api);
  });
  
  return Object.entries(groups).map(([resource, apis]) => ({
    name: resource,
    apis,
    scope: 'both'
  }));
}

/**
 * 優先度を計算
 */
function calculatePriority(parsedSSOT, indicators) {
  let score = 50; // 基準スコア
  
  // ビジネス要件があれば高優先
  if (parsedSSOT.requirements.some(r => r.type === 'BIZ')) {
    score += 20;
  }
  
  // NFRがあれば中優先
  if (indicators.nfrCount > 0) {
    score += 10;
  }
  
  // 複雑度による調整
  if (indicators.complexity === 'high') {
    score += 10; // 早めに着手
  }
  
  // スコアをP1-P4に変換
  if (score >= 80) return 'P1';
  if (score >= 60) return 'P2';
  if (score >= 40) return 'P3';
  return 'P4';
}

/**
 * 工数を推定
 */
function estimateEffort(parsedSSOT, indicators) {
  let hours = 0;
  
  // API実装: 2時間/エンドポイント
  hours += indicators.apiCount * 2;
  
  // DB実装: 3時間/テーブル
  hours += indicators.dbTableCount * 3;
  
  // UI実装: 4時間/ページ
  hours += indicators.pageCount * 4;
  hours += indicators.componentCount * 2;
  
  // テスト: 実装の30%
  hours *= 1.3;
  
  // 複雑度による調整
  if (indicators.complexity === 'high') {
    hours *= 1.5;
  } else if (indicators.complexity === 'medium') {
    hours *= 1.2;
  }
  
  return Math.ceil(hours);
}

/**
 * 推奨テンプレートを取得
 */
function getRecommendedTemplates(taskType) {
  const baseTemplates = ['common-sections.template.md'];
  
  switch (taskType) {
    case TASK_TYPES.FULLSTACK:
      return [
        'backend-api.template.md',
        'backend-db.template.md',
        'frontend-page.template.md',
        ...baseTemplates
      ];
      
    case TASK_TYPES.API_ONLY:
      return ['backend-api.template.md', ...baseTemplates];
      
    case TASK_TYPES.DB_ONLY:
      return ['backend-db.template.md', ...baseTemplates];
      
    case TASK_TYPES.UI_ONLY:
      return ['frontend-page.template.md', 'frontend-component.template.md', ...baseTemplates];
      
    default:
      return baseTemplates;
  }
}

/**
 * 実装順序を決定
 */
function getImplementationOrder(taskType, parsedSSOT) {
  const order = [];
  
  // 常にDB → API → UI の順
  if (parsedSSOT.database.length > 0) {
    order.push({
      phase: 'database',
      scope: 'hotel-common-rebuild',
      items: parsedSSOT.database.map(d => d.name)
    });
  }
  
  if (parsedSSOT.api.length > 0) {
    order.push({
      phase: 'api',
      scope: 'hotel-common-rebuild',
      items: parsedSSOT.api.map(a => `${a.method} ${a.path}`)
    });
    
    // プロキシ（hotel-saas）
    order.push({
      phase: 'api-proxy',
      scope: 'hotel-saas-rebuild',
      items: parsedSSOT.api.map(a => `${a.method} ${a.path}`)
    });
  }
  
  if (parsedSSOT.ui.pages.length > 0 || parsedSSOT.ui.components.length > 0) {
    order.push({
      phase: 'ui',
      scope: 'hotel-saas-rebuild',
      items: [
        ...parsedSSOT.ui.pages.map(p => `page: ${p}`),
        ...parsedSSOT.ui.components.map(c => `component: ${c}`)
      ]
    });
  }
  
  return order;
}

// ===== 出力 =====

function outputJSON(result) {
  console.log(JSON.stringify(result, null, 2));
}

function outputSummary(result) {
  console.log('='.repeat(60));
  console.log(`🔍 タスク分類結果: ${result.ssotId}`);
  console.log('='.repeat(60));
  
  console.log('\n📋 基本情報:');
  console.log(`   タスクタイプ: ${result.taskType}`);
  console.log(`   優先度: ${result.priority}`);
  console.log(`   推定工数: ${result.estimatedHours}時間`);
  console.log(`   複雑度: ${result.indicators.complexity}`);
  
  console.log('\n🤖 エージェント割り当て:');
  Object.entries(result.agents).forEach(([role, agent]) => {
    console.log(`   ${role}: ${agent}`);
  });
  
  if (result.splitStrategy) {
    console.log('\n📦 分割戦略:');
    console.log(`   タイプ: ${result.splitStrategy.type}`);
    console.log(`   説明: ${result.splitStrategy.description}`);
  }
  
  console.log('\n📝 推奨テンプレート:');
  result.templates.forEach(t => {
    console.log(`   - ${t}`);
  });
  
  console.log('\n🔢 実装順序:');
  result.implementationOrder.forEach((phase, i) => {
    console.log(`   ${i + 1}. ${phase.phase} (${phase.scope})`);
    phase.items.slice(0, 3).forEach(item => {
      console.log(`      - ${item}`);
    });
    if (phase.items.length > 3) {
      console.log(`      ... 他${phase.items.length - 3}件`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
}

// ===== CLI =====

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node classify-task.cjs <SSOT_PATH> [--json|--summary]');
    process.exit(1);
  }
  
  const ssotPath = args[0];
  const outputFormat = args.includes('--summary') ? 'summary' : 'json';
  
  if (!fs.existsSync(ssotPath)) {
    console.error(`❌ ファイルが見つかりません: ${ssotPath}`);
    process.exit(1);
  }
  
  try {
    // SSOTを解析
    const parsedSSOT = parseSSOT(ssotPath);
    
    // 分類
    const result = classifyTask(parsedSSOT);
    
    if (outputFormat === 'summary') {
      outputSummary(result);
    } else {
      outputJSON(result);
    }
    
  } catch (error) {
    console.error(`❌ 分類エラー: ${error.message}`);
    process.exit(1);
  }
}

// エクスポート
module.exports = { classifyTask, TASK_TYPES, AGENTS };

if (require.main === module) {
  main();
}
