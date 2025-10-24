#!/usr/bin/env node
/*
 * SSOT要件IDカバレッジチェック
 * - SSOT_SAAS_STAFF_MANAGEMENT.md（要件ID）
 * - docs/03_ssot/openapi/staff-management.yaml（operation description）
 * に含まれる STAFF-*** ID の対応を機械検証
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SSOT_FILE = path.resolve(__dirname, '..', 'docs/03_ssot/01_admin_features/SSOT_SAAS_STAFF_MANAGEMENT.md');
const OPENAPI_FILE = path.resolve(__dirname, '..', 'docs/03_ssot/openapi/staff-management.yaml');

function readText(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function extractRequirementIdsFromSSOT(text) {
  const ids = new Set();
  const re = /(STAFF(?:-SEC|-UI)?-\d{3})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    ids.add(m[1]);
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
  const ssotText = readText(SSOT_FILE);
  const ssotIds = extractRequirementIdsFromSSOT(ssotText);

  const openapiText = readText(OPENAPI_FILE);
  const openapiDoc = yaml.load(openapiText);
  const openapiIds = extractRequirementIdsFromOpenAPI(openapiDoc);

  const ssotOnly = ssotIds.filter((id) => !openapiIds.includes(id));
  const openapiOnly = openapiIds.filter((id) => !ssotIds.includes(id));

  if (ssotOnly.length === 0 && openapiOnly.length === 0) {
    console.log('✅ 要件IDカバレッジ: 100%');
    console.log(`   - 総ID数: ${ssotIds.length}`);
    process.exit(0);
  }

  console.error('\n🚨 要件IDカバレッジ不足');
  if (ssotOnly.length > 0) {
    console.error(`❌ OpenAPIに不足: ${ssotOnly.join(', ')}`);
  }
  if (openapiOnly.length > 0) {
    console.error(`❌ SSOTに不足: ${openapiOnly.join(', ')}`);
  }
  process.exit(1);
}

main();


