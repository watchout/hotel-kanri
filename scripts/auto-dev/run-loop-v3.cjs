#!/usr/bin/env node
/**
 * Auto-dev v3 連続実行ランナー（Plane → 次の親タスク → run-task-v3）
 *
 * 目的:
 * - SSOTが用意されている前提で、親タスク（末尾0）を順に処理し続ける
 * - PCを閉じても回すには、常時稼働環境（VPS/常時稼働Mac/tmux等）でこのスクリプトを動かす
 *
 * Usage:
 *   node scripts/auto-dev/run-loop-v3.cjs
 *   node scripts/auto-dev/run-loop-v3.cjs --once
 *   node scripts/auto-dev/run-loop-v3.cjs --max-tasks 10 --sleep-sec 60
 *   node scripts/auto-dev/run-loop-v3.cjs --no-discord
 *
 * @version 1.0.0
 */
/* eslint-disable no-console */

const { spawnSync } = require('child_process');
const path = require('path');

const planeApi = require('../plane/lib/plane-api-client.cjs');
const discord = require('./notify-discord.cjs');

const PLANE_STATES = {
  BACKLOG: '2564ad4a-abd6-4b05-9af0-2c3dcd28e2be',
  IN_PROGRESS: 'c576eed5-315c-44b9-a3cb-db67d73423b7',
  DONE: '86937979-4727-4ec9-81be-585f7aae981d',
};

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseDevNumberFromName(name) {
  const m = String(name || '').match(/\[DEV-(\d+)\]/i);
  return m ? Number(m[1]) : null;
}

function formatDevId(devNo) {
  return `DEV-${String(devNo).padStart(4, '0')}`;
}

function isParentDev(devNo) {
  if (!Number.isFinite(devNo)) return false;
  return devNo % 10 === 0;
}

async function listAllIssues() {
  const config = planeApi.getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  return planeApi.request('GET', endpoint);
}

function isBlocked(issue) {
  const blockedBy = issue?.blocked_by;
  return Array.isArray(blockedBy) && blockedBy.length > 0;
}

async function pickNextParentBacklogIssue() {
  const all = await listAllIssues();
  const issues = all.results || all;

  const candidates = (issues || [])
    .map((i) => ({ issue: i, devNo: parseDevNumberFromName(i?.name) }))
    .filter((x) => Number.isFinite(x.devNo))
    .filter((x) => isParentDev(x.devNo))
    // 進行中(=開発中)が存在する場合、Backlogより先に拾えるようにする
    // （devNo昇順のため、基本は親タスク順で進む）
    .filter((x) => x.issue?.state === PLANE_STATES.IN_PROGRESS || x.issue?.state === PLANE_STATES.BACKLOG)
    .filter((x) => x.issue?.state !== PLANE_STATES.DONE)
    .filter((x) => !isBlocked(x.issue))
    .sort((a, b) => a.devNo - b.devNo);

  return candidates.length > 0 ? candidates[0].issue : null;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const help = args.includes('--help') || args.includes('-h');
  const once = args.includes('--once');
  const idle = args.includes('--idle');
  const noDiscord = args.includes('--no-discord');

  const maxIdx = args.indexOf('--max-tasks');
  const maxTasks = maxIdx !== -1 && args[maxIdx + 1] ? Number(args[maxIdx + 1]) : 50;

  const sleepIdx = args.indexOf('--sleep-sec');
  const sleepSec = sleepIdx !== -1 && args[sleepIdx + 1] ? Number(args[sleepIdx + 1]) : 60;

  return {
    help,
    once,
    idle,
    noDiscord,
    maxTasks: Number.isFinite(maxTasks) ? maxTasks : 50,
    sleepSec: Number.isFinite(sleepSec) ? sleepSec : 60
  };
}

async function main() {
  const { help, once, idle, noDiscord, maxTasks, sleepSec } = parseArgs(process.argv);

  if (help) {
    console.log(`
auto-dev v3 loop (Plane → next parent → run-task-v3)

Usage:
  node scripts/auto-dev/run-loop-v3.cjs [options]

Options:
  --once         1件だけ実行して終了
  --idle         タスクが無い時も待機し続ける
  --max-tasks N  最大処理件数（default: 50）
  --sleep-sec N  ループ間隔（default: 60）
  --no-discord   Discord通知を無効化
  -h, --help     ヘルプ表示
`);
    process.exit(0);
  }

  const kanriDir = process.env.AUTODEV_KANRI_DIR || path.resolve(__dirname, '../..');

  console.log(`[${nowIso()}] 🚀 auto-dev v3 loop start`);
  console.log(`  once=${once} idle=${idle} maxTasks=${maxTasks} sleepSec=${sleepSec} noDiscord=${noDiscord}`);

  let processed = 0;

  let idleNotified = false;

  while (processed < maxTasks) {
    let next;
    try {
      next = await pickNextParentBacklogIssue();
    } catch (e) {
      const msg = `Planeから次タスク取得に失敗: ${String(e?.message || e)}`;
      console.error(msg);
      if (!noDiscord) {
        await discord.notifyHumanRequired('AUTO-DEV-V3', 'auto-dev v3', msg);
      }
      process.exit(1);
    }

    if (!next) {
      const msg = 'Backlog / In Progress の親タスク（末尾0）が見つかりません（またはBlockedです）';
      console.log(`[${nowIso()}] ℹ️ ${msg}`);
      if (!noDiscord && !idleNotified) {
        await discord.sendNotification('info', 'auto-dev v3: タスクなし', { message: msg });
        idleNotified = true;
      }
      if (!idle) process.exit(0);

      console.log(`[${nowIso()}] ⏳ idle sleep ${sleepSec}s`);
      await sleep(Math.max(1, sleepSec) * 1000);
      continue;
    }

    const devNo = parseDevNumberFromName(next.name);
    const taskId = formatDevId(devNo);

    console.log(`[${nowIso()}] 🔄 start: ${taskId} ${next.name}`);
    idleNotified = false;

    // run-task-v3 内でDiscord通知/Plane更新を行う
    const args = ['scripts/auto-dev/run-task-v3.cjs', taskId];
    if (noDiscord) args.push('--no-discord');

    const res = spawnSync('node', args, {
      cwd: kanriDir,
      encoding: 'utf8',
      timeout: 0, // 無制限（長時間実行を許容）
      stdio: 'inherit',
      env: { ...process.env },
    });

    const code = typeof res.status === 'number' ? res.status : 1;
    if (code !== 0) {
      console.log(`[${nowIso()}] 🛑 stop: ${taskId} (exit=${code})`);
      // STOP通知は run-task-v3 側が出す（重複回避）
      process.exit(code);
    }

    processed++;
    if (once) {
      console.log(`[${nowIso()}] ✅ once mode: done`);
      process.exit(0);
    }

    console.log(`[${nowIso()}] ⏳ sleep ${sleepSec}s`);
    await sleep(Math.max(1, sleepSec) * 1000);
  }

  console.log(`[${nowIso()}] ✅ reached maxTasks=${maxTasks}, exit`);
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ run-loop-v3 error:', e);
  process.exit(1);
});

