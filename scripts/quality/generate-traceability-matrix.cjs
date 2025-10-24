#!/usr/bin/env node

/**
 * トレーサビリティマトリクス自動生成スクリプト
 * 
 * 目的: 要求(FR/SSOT) → 設計(ADR) → 実装 → テスト(QAS) のマトリクスを自動生成
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

async function generateTraceabilityMatrix() {
  console.log('🔗 トレーサビリティマトリクス生成開始\n');
  
  const baseDir = path.join(__dirname, '../..');
  
  // 1. SSOTから要件IDを抽出
  console.log('📋 Step 1: SSOTから要件IDを抽出...\n');
  const ssotDir = path.join(baseDir, 'docs/03_ssot');
  const ssotFiles = await glob(`${ssotDir}/**/*.md`);
  
  const requirements = [];
  
  for (const file of ssotFiles) {
    const content = await fs.readFile(file, 'utf-8');
    const ssotName = path.basename(file, '.md');
    
    // 要件ID抽出（XXX-nnn形式）
    const reqIdRegex = /##\s+([A-Z]+-\d{3})[:\s]+(.+)/g;
    let match;
    
    while ((match = reqIdRegex.exec(content)) !== null) {
      const reqId = match[1];
      const reqTitle = match[2].trim();
      
      requirements.push({
        id: reqId,
        title: reqTitle,
        ssot: ssotName,
        ssotFile: path.relative(baseDir, file),
        adr: [],
        implementation: [],
        tests: [],
        qas: []
      });
    }
  }
  
  console.log(`   検出された要件ID: ${requirements.length}件\n`);
  
  // 2. ADRから関連要件を抽出
  console.log('📝 Step 2: ADRから関連要件を抽出...\n');
  const adrDir = path.join(baseDir, 'docs/adr');
  try {
    const adrFiles = await glob(`${adrDir}/ADR-*.md`);
    
    for (const file of adrFiles) {
      if (file.includes('template')) continue;
      
      const content = await fs.readFile(file, 'utf-8');
      const adrName = path.basename(file, '.md');
      
      // 関連要件ID抽出
      const relatedRegex = /関連要件ID.*?\[([A-Z]+-\d{3})/g;
      let match;
      
      while ((match = relatedRegex.exec(content)) !== null) {
        const reqId = match[1];
        const req = requirements.find(r => r.id === reqId);
        if (req) {
          req.adr.push(adrName);
        }
      }
    }
    
    console.log(`   検出されたADR: ${adrFiles.length}件\n`);
  } catch (error) {
    console.log(`   ADRディレクトリが空、またはエラー\n`);
  }
  
  // 3. 実装ファイルから要件IDをコメントで抽出
  console.log('💻 Step 3: 実装ファイルから要件IDを抽出...\n');
  
  const implDirs = [
    path.join(baseDir, '../hotel-saas/server/api'),
    path.join(baseDir, '../hotel-saas/pages'),
    path.join(baseDir, '../hotel-common/src/routes'),
  ];
  
  let implFileCount = 0;
  
  for (const dir of implDirs) {
    try {
      const implFiles = await glob(`${dir}/**/*.{ts,vue}`);
      
      for (const file of implFiles) {
        const content = await fs.readFile(file, 'utf-8');
        
        // コメント内の要件ID抽出（例: // REQ: AUTH-001）
        const reqCommentRegex = /\/\/\s*(?:REQ|要件):?\s*([A-Z]+-\d{3})/g;
        let match;
        
        while ((match = reqCommentRegex.exec(content)) !== null) {
          const reqId = match[1];
          const req = requirements.find(r => r.id === reqId);
          if (req) {
            const relPath = file.replace(/.*\/(hotel-[^/]+)\//, '$1/');
            if (!req.implementation.includes(relPath)) {
              req.implementation.push(relPath);
            }
          }
        }
      }
      
      implFileCount += implFiles.length;
    } catch (error) {
      // ディレクトリが存在しない場合はスキップ
    }
  }
  
  console.log(`   スキャンした実装ファイル: ${implFileCount}件\n`);
  
  // 4. QASから関連要件を抽出
  console.log('🎯 Step 4: QASから関連要件を抽出...\n');
  const qasFile = path.join(baseDir, 'docs/03_ssot/00_foundation/NFR-QAS.md');
  
  try {
    const content = await fs.readFile(qasFile, 'utf-8');
    
    // QAS ID抽出
    const qasRegex = /##\s+(QAS-[A-Z]+-\d{3}):/g;
    let match;
    
    while ((match = qasRegex.exec(content)) !== null) {
      const qasId = match[1];
      
      // 関連要件抽出
      const sectionStart = match.index;
      const nextSection = content.indexOf('\n## ', sectionStart + 1);
      const section = content.substring(sectionStart, nextSection > 0 ? nextSection : content.length);
      
      const relatedRegex = /関連要件.*?FR-([A-Z]+-\d{3})/g;
      let relMatch;
      
      while ((relMatch = relatedRegex.exec(section)) !== null) {
        const reqId = relMatch[1];
        const req = requirements.find(r => r.id === reqId);
        if (req) {
          req.qas.push(qasId);
        }
      }
    }
    
    console.log(`   検出されたQAS: ${(content.match(/## QAS-/g) || []).length}件\n`);
  } catch (error) {
    console.log(`   QASファイルなし、またはエラー\n`);
  }
  
  // 5. マトリクス生成
  console.log('📊 Step 5: トレーサビリティマトリクス生成...\n');
  
  let markdown = `# 🔗 トレーサビリティマトリクス

**生成日時**: ${new Date().toISOString()}  
**総要件数**: ${requirements.length}件

---

## 📋 マトリクス

| 要件ID | タイトル | SSOT | ADR | 実装 | QAS | 完全性 |
|:-------|:--------|:-----|:----|:-----|:----|:------:|
`;

  for (const req of requirements) {
    const completeness = calculateCompleteness(req);
    const icon = completeness >= 75 ? '✅' : completeness >= 50 ? '🟡' : '❌';
    
    markdown += `| ${req.id} | ${req.title} | [${req.ssot}](../${req.ssotFile}) | ${formatList(req.adr)} | ${formatList(req.implementation)} | ${formatList(req.qas)} | ${icon} ${completeness}% |\n`;
  }
  
  markdown += `\n---

## 📊 統計

### 完全性分布

- ✅ 完全（75%以上）: ${requirements.filter(r => calculateCompleteness(r) >= 75).length}件
- 🟡 部分的（50-74%）: ${requirements.filter(r => calculateCompleteness(r) >= 50 && calculateCompleteness(r) < 75).length}件
- ❌ 不完全（50%未満）: ${requirements.filter(r => calculateCompleteness(r) < 50).length}件

### カテゴリ別

`;

  const categories = {};
  for (const req of requirements) {
    const category = req.id.split('-')[0];
    if (!categories[category]) categories[category] = 0;
    categories[category]++;
  }
  
  for (const [category, count] of Object.entries(categories)) {
    markdown += `- ${category}: ${count}件\n`;
  }
  
  markdown += `
---

## 🎯 改善優先度

### High Priority（完全性50%未満）

`;

  const lowCompleteness = requirements.filter(r => calculateCompleteness(r) < 50);
  for (const req of lowCompleteness.slice(0, 10)) {
    markdown += `- **${req.id}**: ${req.title}\n`;
    markdown += `  - SSOT: ${req.ssot}\n`;
    markdown += `  - 不足: ${getMissingElements(req).join(', ')}\n\n`;
  }
  
  markdown += `
---

## 📚 凡例

- **要件ID**: XXX-nnn形式（例: AUTH-001）
- **SSOT**: 要件を定義したSSOT
- **ADR**: 関連する技術的意思決定
- **実装**: 要件を実装したファイル
- **QAS**: 関連する品質属性シナリオ
- **完全性**: トレーサビリティの完全性（0-100%）
  - 100%: SSOT + ADR + 実装 + QAS 全て存在
  - 75%: 3要素存在
  - 50%: 2要素存在
  - 25%: 1要素存在

---

ここまで読み込んだらまず「traceability-matrix.md 読了」と表示すること
`;
  
  // ファイル出力
  const outputPath = path.join(baseDir, 'docs/traceability-matrix.md');
  await fs.writeFile(outputPath, markdown);
  
  console.log(`✅ トレーサビリティマトリクス生成完了\n`);
  console.log(`📄 出力先: ${outputPath}\n`);
  console.log(`📊 総要件数: ${requirements.length}件`);
  console.log(`   - ✅ 完全（75%以上）: ${requirements.filter(r => calculateCompleteness(r) >= 75).length}件`);
  console.log(`   - 🟡 部分的（50-74%）: ${requirements.filter(r => calculateCompleteness(r) >= 50 && calculateCompleteness(r) < 75).length}件`);
  console.log(`   - ❌ 不完全（50%未満）: ${requirements.filter(r => calculateCompleteness(r) < 50).length}件\n`);
  
  return {
    total: requirements.length,
    outputPath: outputPath,
    requirements: requirements
  };
}

// ヘルパー関数: 完全性算出
function calculateCompleteness(req) {
  let score = 25; // SSOT存在（必須）
  if (req.adr.length > 0) score += 25;
  if (req.implementation.length > 0) score += 25;
  if (req.qas.length > 0) score += 25;
  return score;
}

// ヘルパー関数: リストフォーマット
function formatList(items) {
  if (items.length === 0) return '-';
  if (items.length === 1) return items[0];
  return `${items.length}件`;
}

// ヘルパー関数: 不足要素の取得
function getMissingElements(req) {
  const missing = [];
  if (req.adr.length === 0) missing.push('ADR');
  if (req.implementation.length === 0) missing.push('実装');
  if (req.qas.length === 0) missing.push('QAS');
  return missing;
}

// スクリプト実行
if (require.main === module) {
  generateTraceabilityMatrix()
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ エラーが発生しました:', error);
      process.exit(1);
    });
}

module.exports = { generateTraceabilityMatrix };







