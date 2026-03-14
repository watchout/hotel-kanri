#!/usr/bin/env node
/**
 * DEV番号重複の解消スクリプト
 *
 * 方針:
 * - 重複DEV番号が存在する場合、created_at が新しいIssue（= 2026-01-02〜01-03で作られた側）を再採番
 * - 古い側はDEV番号を維持
 *
 * 安全策:
 * - DRY_RUN=1 の場合、変更内容を表示するだけで更新しない
 *
 * 注意:
 * - Plane APIは標準クライアント（plane-api-client.cjs）を必ず使用
 */

const planeApi = require('./lib/plane-api-client.cjs');

function extractDevNosFromName(name) {
  if (typeof name !== 'string') return [];
  const out = [];
  const re = /\[DEV-(\d+)\]/g;
  let m;
  while ((m = re.exec(name))) out.push(Number(m[1]));
  return out;
}

function formatDevTag(devNo) {
  return `[DEV-${String(devNo).padStart(4, '0')}]`;
}

function replaceDevTagInName(name, fromDevNo, toDevNo) {
  const from = new RegExp(`\\[DEV-${String(fromDevNo).padStart(4, '0')}\\]`);
  // 旧表記がゼロ埋め無しの場合も吸収
  const fromAlt = new RegExp(`\\[DEV-${fromDevNo}\\]`);
  const to = formatDevTag(toDevNo);
  if (from.test(name)) return name.replace(from, to);
  if (fromAlt.test(name)) return name.replace(fromAlt, to);
  // fallback: 1件目だけ置換
  return name.replace(/\[DEV-\d+\]/, to);
}

async function listAllIssues() {
  const config = planeApi.getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  const resp = await planeApi.request('GET', endpoint);
  return resp.results || resp;
}

async function main() {
  const dryRun = process.env.DRY_RUN === '1';

  const issues = await listAllIssues();
  const devMap = new Map(); // devNo -> issues[]
  let maxDev = 0;

  for (const i of issues) {
    const devNos = extractDevNosFromName(i.name);
    for (const devNo of devNos) {
      if (!devMap.has(devNo)) devMap.set(devNo, []);
      devMap.get(devNo).push({
        id: i.id,
        name: i.name,
        created_at: i.created_at || null,
        updated_at: i.updated_at || null,
        sequence_id: i.sequence_id,
      });
      if (devNo > maxDev) maxDev = devNo;
    }
  }

  const duplicates = [...devMap.entries()]
    .filter(([_, arr]) => arr.length > 1)
    .sort((a, b) => a[0] - b[0]);

  if (duplicates.length === 0) {
    console.log('✅ DEV重複はありません（0件）');
    return;
  }

  // 再採番は maxDev+1 から連番
  let nextDev = maxDev + 1;

  const changes = [];
  for (const [devNo, arr] of duplicates) {
    const sorted = [...arr].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const keep = sorted[0];
    const reassign = sorted.slice(1);

    for (const r of reassign) {
      const newDev = nextDev++;
      const newName = replaceDevTagInName(r.name, devNo, newDev);
      changes.push({
        fromDev: devNo,
        keep: { id: keep.id, name: keep.name, created_at: keep.created_at },
        change: { id: r.id, oldName: r.name, created_at: r.created_at, newDev, newName },
      });
    }
  }

  console.log(JSON.stringify({ ok: true, dryRun, maxDev, planned: changes }, null, 2));

  if (dryRun) {
    console.log('\n🟡 DRY_RUN=1 のため更新は行いません');
    return;
  }

  for (const c of changes) {
    process.stdout.write(`update ${c.change.id}: ${c.change.oldName} -> ${c.change.newName} ... `);
    await planeApi.updateIssue(c.change.id, { name: c.change.newName });
    console.log('OK');
    // rate limit対策
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\n✅ 更新完了: ${changes.length}件`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ エラー:', err.message || err);
    process.exit(1);
  });
}


