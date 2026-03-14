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
  
  // 1) 通常のID表記（STAFF-001 / STAFF-SEC-001 等）
  const re = /(STAFF(?:-SEC|-UI)?-\d{3})/g;

  // 2) 省略表記（例: STAFF-SEC-005/006）を展開
  const compactRe = /(STAFF(?:-SEC|-UI)?-)(\d{3})\/(\d{3})/g;

  for (const line of lines) {
    let m;
    // 通常表記
    while ((m = re.exec(line)) !== null) {
      ids.add(m[1]);
    }

    // 省略表記も同じ行から拾う
    while ((m = compactRe.exec(line)) !== null) {
      ids.add(`${m[1]}${m[2]}`);
      ids.add(`${m[1]}${m[3]}`);
    }
  }

  return Array.from(ids).sort();
}

function extractRequirementIdsFromOpenApiText(openapiText) {
  const acc = new Set();
  // openapi: staff-management.yaml には "STAFF-UI-001..021" のような範囲表現があるため、
  // ".." を含まない単体IDのみを抽出対象にする（範囲の展開は別スクリプトに委ねる）。
  const re = /(STAFF(?:-SEC|-UI)?-\d{3})(?!\.\.)/g;
  let m;
  while ((m = re.exec(openapiText)) !== null) {
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
