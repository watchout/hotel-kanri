import { globby } from 'globby';
import { readFile } from 'node:fs/promises';
import { describe, it, expect } from 'vitest';

describe('API proxy contract', () => {
  it('uses callHotelCommonAPI and forbids direct HTTP', async () => {
    const files = await globby(['server/api/**/*.{ts,js}']);
    let bad = [];
    for (const f of files) {
      const s = await readFile(f, 'utf8');
      if (!s.includes('callHotelCommonAPI(')) bad.push(`${f}: missing callHotelCommonAPI`);
      if (/(\$?fetch|axios)\s*\(/.test(s)) bad.push(`${f}: direct HTTP detected`);
      if (!/\/\*\*\s*@req:\s*REQ-API-/.test(s)) bad.push(`${f}: missing @req tag`);
    }
    expect(bad, bad.join('\n')).toHaveLength(0);
  });
});

