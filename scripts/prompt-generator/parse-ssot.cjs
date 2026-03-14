#!/usr/bin/env node
/**
 * SSOT解析エンジン
 * 
 * SSOTファイル（Markdown）を解析し、構造化データに変換する。
 * プロンプト自動生成の第一ステップ。
 * 
 * Usage: node parse-ssot.cjs <SSOT_PATH>
 * 
 * @version 1.0.0
 */

const fs = require('fs');
const path = require('path');

// ===== 正規表現パターン =====

const PATTERNS = {
  // 要件ID: HDF-001, ORD-002, etc.
  requirementId: /^###?\s+([A-Z]{2,4}-\d{3}):\s*(.+)$/gm,
  
  // Accept条件（箇条書き）
  acceptBlock: /- \*?\*?Accept\*?\*?:?\s*\n((?:\s+- .+\n?)+)/gi,
  acceptItem: /^\s+- (.+)$/gm,
  
  // API仕様テーブル
  apiTableRow: /\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`?([^|`]+)`?\s*\|\s*([^|]+)\s*\|/gi,
  
  // コードブロック
  codeBlock: /```(\w+)?\n([\s\S]+?)```/g,
  
  // セクション見出し
  sectionH2: /^## (.+)$/gm,
  sectionH3: /^### (.+)$/gm,
  
  // Prismaスキーマ
  prismaModel: /model\s+(\w+)\s*\{([^}]+)\}/g,
  
  // UI関連キーワード
  uiKeywords: /画面|ページ|コンポーネント|UI|フロントエンド|Vue|React/gi
};

// ===== 解析関数 =====

/**
 * SSOTファイルを解析して構造化データに変換
 * @param {string} ssotPath - SSOTファイルのパス
 * @returns {Object} 構造化されたSSOTデータ
 */
function parseSSOT(ssotPath) {
  const content = fs.readFileSync(ssotPath, 'utf-8');
  const fileName = path.basename(ssotPath, '.md');
  
  return {
    id: fileName,
    path: ssotPath,
    parsedAt: new Date().toISOString(),
    
    // メタデータ
    meta: extractMeta(content),
    
    // 要件
    requirements: extractRequirements(content),
    
    // API仕様
    api: extractApiSpecs(content),
    
    // データベース
    database: extractDatabaseSchema(content),
    
    // UI要件
    ui: extractUIRequirements(content),
    
    // セクション構造
    sections: extractSections(content),
    
    // 生のコンテンツ（LLM補助用）
    raw: content
  };
}

/**
 * メタデータ抽出（概要セクション）
 */
function extractMeta(content) {
  const meta = {
    purpose: null,
    scope: null,
    relatedSSOT: []
  };
  
  // 概要セクションを探す
  const overviewMatch = content.match(/## 概要\n([\s\S]+?)(?=\n## |$)/);
  if (overviewMatch) {
    const overviewText = overviewMatch[1];
    
    // 目的
    const purposeMatch = overviewText.match(/- \*?\*?目的\*?\*?:\s*(.+)/);
    if (purposeMatch) meta.purpose = purposeMatch[1].trim();
    
    // 適用範囲
    const scopeMatch = overviewText.match(/- \*?\*?適用範囲\*?\*?:\s*(.+)/);
    if (scopeMatch) meta.scope = scopeMatch[1].trim();
    
    // 関連SSOT
    const relatedMatch = overviewText.match(/- \*?\*?関連SSOT\*?\*?:\s*(.+)/);
    if (relatedMatch) {
      meta.relatedSSOT = relatedMatch[1].split(/[,、]/).map(s => s.trim());
    }
  }
  
  return meta;
}

/**
 * 要件抽出（FR/NFR）
 */
function extractRequirements(content) {
  const requirements = [];
  
  // 要件IDと名前を抽出
  let match;
  const idPattern = /^###?\s+([A-Z]{2,4}-\d{3}):\s*(.+)$/gm;
  
  while ((match = idPattern.exec(content)) !== null) {
    const id = match[1];
    const name = match[2].trim();
    const position = match.index;
    
    // 要件タイプ判定
    const type = determineRequirementType(id, content, position);
    
    // Accept条件を探す（この要件の後ろ）
    const accept = extractAcceptConditions(content, position);
    
    // 説明を探す
    const description = extractDescription(content, position);
    
    requirements.push({
      id,
      name,
      type,
      description,
      accept,
      position
    });
  }
  
  return requirements;
}

/**
 * 要件タイプを判定
 */
function determineRequirementType(id, content, position) {
  // IDの数値部分で判定
  const numPart = parseInt(id.split('-')[1], 10);
  
  if (numPart < 100) return 'FR';      // 機能要件
  if (numPart < 200) return 'NFR';     // 非機能要件
  if (numPart < 300) return 'UI';      // UI要件
  if (numPart < 400) return 'BIZ';     // ビジネス要件
  
  // コンテキストからも判定
  const beforeText = content.substring(Math.max(0, position - 200), position);
  if (beforeText.includes('機能要件') || beforeText.includes('FR')) return 'FR';
  if (beforeText.includes('非機能要件') || beforeText.includes('NFR')) return 'NFR';
  
  return 'FR'; // デフォルト
}

/**
 * Accept条件を抽出
 */
function extractAcceptConditions(content, startPosition) {
  const conditions = [];
  
  // startPosition以降でAcceptブロックを探す
  const afterText = content.substring(startPosition, startPosition + 2000);
  
  const acceptMatch = afterText.match(/- \*?\*?Accept\*?\*?:?\s*\n((?:\s+- .+\n?)+)/i);
  if (acceptMatch) {
    const items = acceptMatch[1].match(/^\s+- (.+)$/gm);
    if (items) {
      items.forEach(item => {
        const cleaned = item.replace(/^\s+- /, '').trim();
        if (cleaned) conditions.push(cleaned);
      });
    }
  }
  
  return conditions;
}

/**
 * 説明を抽出
 */
function extractDescription(content, position) {
  const afterText = content.substring(position, position + 1000);
  
  const descMatch = afterText.match(/- \*?\*?説明\*?\*?:\s*(.+)/);
  if (descMatch) return descMatch[1].trim();
  
  return null;
}

/**
 * API仕様を抽出
 */
function extractApiSpecs(content) {
  const apis = [];
  
  // テーブル形式のAPI定義を探す
  const tablePattern = /\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`?([^|`]+)`?\s*\|\s*([^|]+)\s*\|/gi;
  
  let match;
  while ((match = tablePattern.exec(content)) !== null) {
    apis.push({
      method: match[1].toUpperCase(),
      path: match[2].trim(),
      description: match[3].trim()
    });
  }
  
  // コードブロック内のAPI定義も探す
  const codeBlockPattern = /```(?:json|javascript|typescript)?\n([\s\S]+?)```/g;
  while ((match = codeBlockPattern.exec(content)) !== null) {
    const code = match[1];
    
    // リクエスト/レスポンス例を探す
    if (code.includes('POST') || code.includes('GET')) {
      const pathMatch = code.match(/(GET|POST|PUT|PATCH|DELETE)\s+([^\s\n]+)/);
      if (pathMatch && !apis.find(a => a.path === pathMatch[2])) {
        apis.push({
          method: pathMatch[1],
          path: pathMatch[2],
          description: 'コードブロックから抽出',
          example: code
        });
      }
    }
  }
  
  return apis;
}

/**
 * データベーススキーマを抽出
 */
function extractDatabaseSchema(content) {
  const schemas = [];
  
  // Prismaモデルを探す
  const modelPattern = /model\s+(\w+)\s*\{([^}]+)\}/g;
  
  let match;
  while ((match = modelPattern.exec(content)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    // フィールドを抽出
    const fields = [];
    const fieldPattern = /(\w+)\s+(\w+)(\?)?(\s+@\w+.*)?/g;
    let fieldMatch;
    
    while ((fieldMatch = fieldPattern.exec(modelBody)) !== null) {
      fields.push({
        name: fieldMatch[1],
        type: fieldMatch[2],
        optional: !!fieldMatch[3],
        attributes: fieldMatch[4] ? fieldMatch[4].trim() : null
      });
    }
    
    schemas.push({
      type: 'prisma',
      name: modelName,
      fields
    });
  }
  
  // テーブル定義（Markdown表）も探す
  const tableDefPattern = /### テーブル:\s*`?(\w+)`?\n\n\|[^|]+\|[^|]+\|[^|]+\|\n\|[-:| ]+\|\n((?:\|[^\n]+\|\n?)+)/g;
  
  while ((match = tableDefPattern.exec(content)) !== null) {
    const tableName = match[1];
    const rows = match[2].trim().split('\n');
    
    const columns = rows.map(row => {
      const cells = row.split('|').filter(c => c.trim());
      if (cells.length >= 2) {
        return {
          name: cells[0].trim(),
          type: cells[1].trim(),
          description: cells[2] ? cells[2].trim() : null
        };
      }
      return null;
    }).filter(Boolean);
    
    schemas.push({
      type: 'table',
      name: tableName,
      columns
    });
  }
  
  return schemas;
}

/**
 * UI要件を抽出
 */
function extractUIRequirements(content) {
  const ui = {
    pages: [],
    components: [],
    hasUISection: false
  };
  
  // UIセクションの存在確認
  if (content.match(/## UI|## 画面|## フロントエンド/)) {
    ui.hasUISection = true;
  }
  
  // ページパスを探す
  const pagePattern = /`?\/?([a-z0-9-/]+(?:\[[\w]+\])?)`?\s*(?:ページ|画面)/gi;
  let match;
  while ((match = pagePattern.exec(content)) !== null) {
    const pagePath = match[1];
    if (!ui.pages.includes(pagePath)) {
      ui.pages.push(pagePath);
    }
  }
  
  // コンポーネント名を探す
  const componentPattern = /`?([A-Z][a-zA-Z]+(?:Widget|Component|Dialog|Modal|Form|Button))`?/g;
  while ((match = componentPattern.exec(content)) !== null) {
    const componentName = match[1];
    if (!ui.components.includes(componentName)) {
      ui.components.push(componentName);
    }
  }
  
  // UIキーワードの出現回数
  const uiKeywordCount = (content.match(PATTERNS.uiKeywords) || []).length;
  ui.uiRelevance = uiKeywordCount > 5 ? 'high' : uiKeywordCount > 0 ? 'medium' : 'low';
  
  return ui;
}

/**
 * セクション構造を抽出
 */
function extractSections(content) {
  const sections = [];
  
  const h2Pattern = /^## (.+)$/gm;
  let match;
  
  while ((match = h2Pattern.exec(content)) !== null) {
    sections.push({
      level: 2,
      title: match[1].trim(),
      position: match.index
    });
  }
  
  return sections;
}

// ===== 出力フォーマット =====

/**
 * 解析結果をJSON出力
 */
function outputJSON(parsed) {
  console.log(JSON.stringify(parsed, null, 2));
}

/**
 * 解析結果をサマリー出力
 */
function outputSummary(parsed) {
  console.log('='.repeat(60));
  console.log(`📄 SSOT解析結果: ${parsed.id}`);
  console.log('='.repeat(60));
  
  console.log('\n📋 メタデータ:');
  console.log(`   目的: ${parsed.meta.purpose || '未定義'}`);
  console.log(`   範囲: ${parsed.meta.scope || '未定義'}`);
  
  console.log('\n📝 要件:');
  console.log(`   総数: ${parsed.requirements.length}`);
  const byType = {};
  parsed.requirements.forEach(r => {
    byType[r.type] = (byType[r.type] || 0) + 1;
  });
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   - ${type}: ${count}件`);
  });
  
  console.log('\n🌐 API:');
  console.log(`   エンドポイント数: ${parsed.api.length}`);
  parsed.api.slice(0, 5).forEach(api => {
    console.log(`   - ${api.method} ${api.path}`);
  });
  if (parsed.api.length > 5) {
    console.log(`   ... 他${parsed.api.length - 5}件`);
  }
  
  console.log('\n💾 データベース:');
  console.log(`   スキーマ数: ${parsed.database.length}`);
  parsed.database.forEach(schema => {
    console.log(`   - ${schema.name} (${schema.type})`);
  });
  
  console.log('\n🎨 UI:');
  console.log(`   UI関連度: ${parsed.ui.uiRelevance}`);
  console.log(`   ページ数: ${parsed.ui.pages.length}`);
  console.log(`   コンポーネント数: ${parsed.ui.components.length}`);
  
  console.log('\n📑 セクション:');
  parsed.sections.forEach(s => {
    console.log(`   - ${s.title}`);
  });
  
  console.log('\n' + '='.repeat(60));
}

// ===== CLI =====

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node parse-ssot.cjs <SSOT_PATH> [--json|--summary]');
    console.error('');
    console.error('Options:');
    console.error('  --json     JSON形式で出力（デフォルト）');
    console.error('  --summary  サマリー形式で出力');
    process.exit(1);
  }
  
  const ssotPath = args[0];
  const outputFormat = args.includes('--summary') ? 'summary' : 'json';
  
  if (!fs.existsSync(ssotPath)) {
    console.error(`❌ ファイルが見つかりません: ${ssotPath}`);
    process.exit(1);
  }
  
  try {
    const parsed = parseSSOT(ssotPath);
    
    if (outputFormat === 'summary') {
      outputSummary(parsed);
    } else {
      outputJSON(parsed);
    }
    
  } catch (error) {
    console.error(`❌ 解析エラー: ${error.message}`);
    process.exit(1);
  }
}

// エクスポート（他のスクリプトから使用可能）
module.exports = { parseSSOT, extractRequirements, extractApiSpecs };

// CLI実行
if (require.main === module) {
  main();
}
