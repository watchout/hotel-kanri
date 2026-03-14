import { globby } from 'globby';
import fs from 'node:fs/promises';

const openapi = await fs.readFile('docs/ssot/openapi.yaml', 'utf8').catch(()=>'');
const pathLit = (s) => (s.match(/callHotelCommonAPI\(.*?,\s*['"](.*?)['"]/s)||[])[1];

const files = await globby(['server/api/**/*.{ts,js}']);
let failed = false;

for (const f of files) {
  const s = await fs.readFile(f, 'utf8');
  const p = pathLit(s);
  if (!p) continue;
  if (!openapi.includes(`\n  ${p}:`) && !openapi.includes(`\n${p}:`)) {
    console.error(`[NG] ${f}: OpenAPIにパス ${p} が見つかりません（SSOT不整合）`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log('OK: すべてのAPIパスはOpenAPIに定義されています。');

