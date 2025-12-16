#!/usr/bin/env node
/*
 * SSOT要件IDカバレッジチェック（CIでnpm install不要なCommonJS版）
 *
 * 目的:
 * - SSOT側の要件ID（docs/03_ssot/requirements.md）に記載されたIDが、
 *   OpenAPI（docs/03_ssot/openapi/staff-management.yaml）にも必ず含まれることを検証する。
 *
 * 制約:
 * - GitHub Actions上ではこのスクリプト単体で実行されるため、外部依存（js-yaml等）は使わない。
 */

const fs = require('fs');
const path = require('path');

const MAP_FILE = path.resolve(__dirname, '..', 'docs/03_ssot_legacy/requirements.md');
const OPENAPI_FILE = path.resolve(__dirname, '..', 'docs/03_ssot_legacy/openapi/staff-management.yaml');

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

function extractRequirementIdsFromOpenApiText(text) {
  const acc = new Set();
  const re = /(STAFF(?:-SEC|-UI)?-\d{3})/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    acc.add(m[1]);
  }
  return Array.from(acc).sort();
}

function main() {
  const mapText = readText(MAP_FILE);
  const targetIds = extractRequirementIdsFromMap(mapText);

  const openapiText = readText(OPENAPI_FILE);
  const openapiIds = extractRequirementIdsFromOpenApiText(openapiText);

  const ssotOnly = targetIds.filter((id) => !openapiIds.includes(id));
  const openapiOnly = openapiIds.filter((id) => !targetIds.includes(id));

  if (ssotOnly.length === 0) {
    console.log('✅ 要件IDカバレッジ: SSOT -> OpenAPI OK');
    console.log(`   - SSOT ID数: ${targetIds.length}`);
    console.log(`   - OpenAPI ID数: ${openapiIds.length}`);
    if (openapiOnly.length > 0) {
      console.log(`⚠️  OpenAPIのみ（参考）: ${openapiOnly.join(', ')}`);
    }
    process.exit(0);
  }

  console.error('\n🚨 要件IDカバレッジ不足（SSOTにあるがOpenAPIにない）');
  console.error(`❌ OpenAPIに不足: ${ssotOnly.join(', ')}`);

  if (openapiOnly.length > 0) {
    console.error(`\n参考: OpenAPIのみ: ${openapiOnly.join(', ')}`);
  }

  process.exit(1);
}

main();
