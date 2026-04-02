#!/usr/bin/env node
/**
 * Plane Issue description_html 内のDEV番号参照を置換するスクリプト
 *
 * 対象:
 * - 2026-01-02〜01-03に作成されたIssue（今回の再採番対象側を想定）
 *
 * 置換:
 * - DEV-0410〜DEV-0423 → DEV-0428〜DEV-0441
 *
 * 安全策:
 * - DRY_RUN=1（デフォルト）: 変更案を表示するだけで更新しない
 * - APPLY=1: 実際にPlaneへ更新する
 */

const planeApi = require('./lib/plane-api-client.cjs');

const DRY_RUN = process.env.DRY_RUN !== '0'; // default true
const APPLY = process.env.APPLY === '1';

const CREATED_FROM = new Date('2026-01-02T00:00:00.000Z');
const CREATED_TO = new Date('2026-01-04T00:00:00.000Z'); // 01-02/01-03を包含

// 0410..0423 -> 0428..0441（今回の実適用ログに基づく）
const MAP = new Map([
  [410, 428],
  [411, 429],
  [412, 430],
  [413, 431],
  [414, 432],
  [415, 433],
  [416, 434],
  [417, 435],
  [418, 436],
  [419, 437],
  [420, 438],
  [421, 439],
  [422, 440],
  [423, 441],
]);

function pad4(n) {
  return String(n).padStart(4, '0');
}

function buildRegexForOldDev(oldDevNo) {
  // DEV-0412 / DEV-412 / DEV-000412 のような表記ゆれも吸収
  return new RegExp(`DEV-0*${oldDevNo}\\b`, 'g');
}

function applyReplacement(html) {
  let out = html;
  const applied = [];
  for (const [oldNo, newNo] of MAP.entries()) {
    const re = buildRegexForOldDev(oldNo);
    const before = out;
    out = out.replace(re, `DEV-${pad4(newNo)}`);
    if (out !== before) {
      applied.push({ from: `DEV-${pad4(oldNo)}`, to: `DEV-${pad4(newNo)}` });
    }
  }
  return { out, applied };
}

async function listAllIssues() {
  const config = planeApi.getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  const resp = await planeApi.request('GET', endpoint);
  return resp.results || resp;
}

async function main() {
  const issues = await listAllIssues();

  const targets = issues.filter(i => {
    const createdAt = i.created_at ? new Date(i.created_at) : null;
    if (!createdAt) return false;
    return createdAt >= CREATED_FROM && createdAt < CREATED_TO;
  });

  const plans = [];

  for (const t of targets) {
    const full = await planeApi.getIssue(t.id);
    const html = (full.description_html || '').toString();
    if (!html) continue;

    const { out, applied } = applyReplacement(html);
    if (applied.length === 0) continue;

    plans.push({
      id: t.id,
      name: t.name,
      created_at: t.created_at,
      replacements: applied,
      before_preview: html.slice(0, 260),
      after_preview: out.slice(0, 260),
      updated_html: out,
    });

    await new Promise(r => setTimeout(r, 120));
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun: DRY_RUN,
    apply: APPLY,
    window: { from: CREATED_FROM.toISOString(), to: CREATED_TO.toISOString() },
    scanned: targets.length,
    changeCount: plans.length,
    plans: plans.map(p => ({
      id: p.id,
      name: p.name,
      created_at: p.created_at,
      replacements: p.replacements,
      before_preview: p.before_preview,
      after_preview: p.after_preview,
    })),
  }, null, 2));

  if (DRY_RUN && !APPLY) {
    console.log('\n🟡 DRY RUN: 更新は行いません（APPLY=1 で適用）');
    return;
  }

  if (!APPLY) {
    console.log('\n🟡 APPLY=1 が指定されていないため更新は行いません');
    return;
  }

  for (const p of plans) {
    process.stdout.write(`update description ${p.id} (${p.name}) ... `);
    await planeApi.updateIssue(p.id, { description_html: p.updated_html });
    console.log('OK');
    await new Promise(r => setTimeout(r, 250));
  }

  console.log(`\n✅ 更新完了: ${plans.length}件`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('❌ エラー:', err.message || err);
    process.exit(1);
  });
}


