#!/usr/bin/env node
/*
 * SSOT要件IDカバレッジチェック（CommonJS版）
 * - docs/03_ssot/requirements.md の対応表（対象のみ）
 * - docs/03_ssot/openapi/staff-management.yaml（operation description）
 * に含まれる STAFF-*** ID の対応を機械検証（対象範囲に限定）
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const MAP_FILE = path.resolve(__dirname, '..', 'docs/03_ssot/requirements.md');
const OPENAPI_FILE = path.resolve(__dirname, '..', 'docs/03_ssot/openapi/staff-management.yaml');

function readText(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function extractRequirementIdsFromMap(text) {
  const ids = new Set();
  const lines = text.split(/\r?\n/);
  // 例:
  // - "| STAFF-001 | ... |"
  // - "| STAFF-SEC-005/006 | ... |" -> STAFF-SEC-005, STAFF-SEC-006
  for (const line of lines) {
    const re = /(STAFF(?:-SEC|-UI)?-)(\d{3})(?:\/(\d{3}))?/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      ids.add(`${m[1]}${m[2]}`);
      if (m[3]) {
        ids.add(`${m[1]}${m[3]}`);
      }
    }
  }
  return Array.from(ids).sort();
}

function extractRequirementIdsFromOpenAPI(openapi) {
  const acc = new Set();
  const paths = openapi.paths || {};
  for (const p of Object.keys(paths)) {
    const item = paths[p];
    for (const method of Object.keys(item)) {
      const op = item[method];
      const desc = (op && op.description) || '';
      const re = /(STAFF(?:-SEC|-UI)?-\d{3})/g;
      let m;
      while ((m = re.exec(desc)) !== null) {
        acc.add(m[1]);
      }
    }
  }
  return Array.from(acc).sort();
}

function main() {
  const mapText = readText(MAP_FILE);
  const targetIds = extractRequirementIdsFromMap(mapText);

  const openapiText = readText(OPENAPI_FILE);
  const openapiDoc = yaml.load(openapiText);
  const openapiIds = extractRequirementIdsFromOpenAPI(openapiDoc);

  const ssotOnly = targetIds.filter((id) => !openapiIds.includes(id));
  const openapiOnly = openapiIds.filter((id) => !targetIds.includes(id));

  if (ssotOnly.length === 0 && openapiOnly.length === 0) {
    console.log('✅ 要件IDカバレッジ: 100%');
    console.log(`   - 総ID数: ${targetIds.length}`);
    process.exit(0);
  }

  console.error('\n🚨 要件IDカバレッジ不足');
  if (ssotOnly.length > 0) {
    console.error(`❌ OpenAPIに不足: ${ssotOnly.join(', ')}`);
  }
  if (openapiOnly.length > 0) {
    console.error(`❌ requirementsに未マップ: ${openapiOnly.join(', ')}`);
  }
  process.exit(1);
}

main();
