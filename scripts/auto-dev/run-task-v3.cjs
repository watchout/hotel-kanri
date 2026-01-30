#!/usr/bin/env node
/**
 * Auto-dev v3（STOP時だけ人間介入）
 *
 * 目的:
 * - 親タスク1回の起動で、子タスクを連結して最後まで自動実行する
 * - 通常は静的ゲートで自動進行し、STOPするのは重大条件だけに限定する
 * - LLMは採点ループではなく、失敗時の修正パッチ（unified diff生成）に寄せる
 *
 * Usage:
 *   node scripts/auto-dev/run-task-v3.cjs DEV-0170
 *   node scripts/auto-dev/run-task-v3.cjs DEV-0170 --dry-run
 *   node scripts/auto-dev/run-task-v3.cjs DEV-0170 --resume
 *
 * NOTE:
 * - v2（run-task.cjs）は残し、v3は別入口で提供する
 *
 * @version 3.0.0
 */
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// Discord通知モジュール（STOP通知/開始/完了通知で使用）
const discord = require('./notify-discord.cjs');

// Plane API（標準クライアント）
const planeApi = require('../plane/lib/plane-api-client.cjs');

// SSOT監査（静的チェックリスト）
let ssotAuditChecklist = null;
try {
  ssotAuditChecklist = require('../quality-checklists/ssot-audit.cjs');
} catch (e) {
  // v3は後続フェーズで必須化する。現時点では警告のみ。
  ssotAuditChecklist = null;
}

// プロンプト監査（静的チェックリスト + autoComplete）
let promptAuditChecklist = null;
try {
  promptAuditChecklist = require('../quality-checklists/prompt-audit.cjs');
} catch (e) {
  promptAuditChecklist = null;
}

// ===== 環境変数読み込み（.env.mcp）=====
const envPath = path.join(__dirname, '../../.env.mcp');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = String(line || '').trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;

    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  });
}

// ===== 設定 =====
// NOTE: 実行環境（ローカル/VPS/Claude環境等）でパスが変わるため、環境変数で上書き可能にする
const KANRI_DIR = process.env.AUTODEV_KANRI_DIR || path.resolve(__dirname, '../..');
const COMMON_DIR = process.env.AUTODEV_COMMON_DIR || path.resolve(KANRI_DIR, '../hotel-common-rebuild');
const SAAS_DIR = process.env.AUTODEV_SAAS_DIR || path.resolve(KANRI_DIR, '../hotel-saas-rebuild');

const CONFIG = {
  version: '3.0.0',
  maxRetries: 3,
  discordNotify: true,
  evidenceBaseDir: path.join(KANRI_DIR, 'evidence/auto-dev/v3'),
  repos: {
    kanri: KANRI_DIR,
    common: COMMON_DIR,
    saas: SAAS_DIR
  },
  // PR対象repo（カンマ区切り）
  // 例: "common,saas"（デフォルト） / "kanri,common,saas"
  prRepos: String(process.env.AUTODEV_V3_PR_REPOS || 'common,saas')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  // SSOT系サブタスクは「SSOTが事前に用意される」前提なら実装をスキップ（PR汚染防止）
  skipSsotSubTasks: (process.env.AUTODEV_V3_SKIP_SSOT_SUBTASKS || '1') !== '0'
};

const PLANE_STATES = {
  BACKLOG: '2564ad4a-abd6-4b05-9af0-2c3dcd28e2be',
  IN_PROGRESS: 'c576eed5-315c-44b9-a3cb-db67d73423b7',
  DONE: '86937979-4727-4ec9-81be-585f7aae981d'
};

// ===== ユーティリティ =====
function nowIso() {
  return new Date().toISOString();
}

function safeRunId(iso) {
  // ディレクトリ名として安全な形にする（: と . を置換）
  return String(iso).replace(/[:.]/g, '-');
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
}

function writeText(filePath, text) {
  fs.writeFileSync(filePath, String(text ?? ''), 'utf8');
}

function stripAnsi(s) {
  return String(s ?? '').replace(
    // eslint-disable-next-line no-control-regex
    /\u001b\[[0-9;]*m/g,
    ''
  );
}

// ===== SSOT監査（v3: 適用範囲を動的にN/A）=====
function detectSsotAspects(content) {
  const s = String(content || '');
  return {
    hasDb:
      /```prisma/i.test(s) ||
      /@@map\(/.test(s) ||
      /@map\(/.test(s) ||
      /\bmodel\s+\w+\s*\{/.test(s),
    hasApi:
      /\/api\/v1\/(admin|guest)\//.test(s) ||
      /(GET|POST|PUT|PATCH|DELETE)\s+\/api\/v1\//.test(s) ||
      /API仕様|エンドポイント一覧/.test(s),
    hasUi: /UI設計|画面一覧|フロントエンド|Nuxt|Vue|コンポーネント/.test(s),
    mentionsTenant: /tenant_id|tenantId|tenantid/i.test(s),
    mentionsMultiTenant: /マルチテナント|multi-tenant/i.test(s)
  };
}

function rerankSsotAuditResult({ rawResult, aspects }) {
  if (!rawResult || !Array.isArray(rawResult.results)) {
    return rawResult;
  }

  const excludeCategories = new Set();
  if (!aspects.hasDb) excludeCategories.add('DB設計');
  if (!aspects.hasApi) excludeCategories.add('API設計');

  const kept = [];
  const excluded = [];
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const r0 of rawResult.results) {
    // v3補正: 既存SSOTの表現揺れを吸収（採点ではなくSTOP回避が目的）
    // - T12（tenant_id必須）は tenantId/tenant_id 言及でもPass扱いにする
    const r =
      r0?.id === 'T12' && r0.passed === false && (aspects.mentionsTenant || aspects.mentionsMultiTenant)
        ? { ...r0, passed: true, overriddenByV3: true }
        : r0;

    if (excludeCategories.has(r.category)) {
      excluded.push({ ...r, na: true });
      continue;
    }
    kept.push({ ...r, na: false });
    totalWeight += r.weight;
    if (r.passed) earnedWeight += r.weight;
  }

  // totalWeight=0 は防御（全部除外された等）
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 100;
  const criticalFailed = kept.filter((r) => !r.passed && r.level === 'critical');

  return {
    ...rawResult,
    score,
    totalWeight,
    earnedWeight,
    results: [...kept, ...excluded],
    passed: kept.filter((r) => r.passed),
    failed: kept.filter((r) => !r.passed),
    criticalFailed,
    dynamic: {
      aspects,
      excludedCategories: [...excludeCategories]
    }
  };
}

function runSsotAuditDynamic({ ssotPath, runDir }) {
  if (!ssotAuditChecklist?.runChecklist) {
    return {
      ok: true,
      skipped: true,
      reason: 'ssot-audit.cjs が読み込めないためスキップ'
    };
  }
  const content = fs.readFileSync(ssotPath, 'utf8');
  const aspects = detectSsotAspects(content);
  const raw = ssotAuditChecklist.runChecklist(content);
  const dynamic = rerankSsotAuditResult({ rawResult: raw, aspects });

  const outDir = path.join(runDir, 'ssot-audit');
  ensureDir(outDir);
  const outPath = path.join(outDir, `${path.basename(ssotPath, '.md')}-audit.dynamic.json`);
  writeJson(outPath, dynamic);

  // v3方針: SSOT監査は「採点ループ」ではなく STOP条件（最小の静的ゲート）に寄せる
  // - scoreはログ用に残す（ダッシュボード表示用）
  // - STOP判定は「v3で定義した必須アイテム」のFailのみ
  const stopCriticalIds = new Set([
    // 要件の骨格（最重要）
    'I01', // 要件ID体系
    'I02', // 全要件にID付与
    'I03', // Accept条件明記
    // API基本（APIがある場合）
    'T06', // /api/v1/ 形式
    'T07', // 深いネストなし
    // DB基本（DBスキーマがある場合）
    'T01', // @@map snake_case
    'T02' // @map snake_case
  ]);

  const stopFailed = (dynamic.results || [])
    .filter((r) => !r.na)
    .filter((r) => stopCriticalIds.has(r.id))
    .filter((r) => r.passed === false);

  // API/DBが「ない」SSOTは、対応カテゴリが除外されるため stopFailed に入らない
  const passed = stopFailed.length === 0;

  return {
    ok: passed,
    reportPath: outPath,
    summary: {
      score: dynamic.score,
      totalWeight: dynamic.totalWeight,
      earnedWeight: dynamic.earnedWeight,
      criticalFailed: (dynamic.criticalFailed || []).map((x) => ({ id: x.id, name: x.name, category: x.category })),
      dynamic: dynamic.dynamic,
      gate: { rule: 'stopCriticalIds', stopFailed }
    }
  };
}

function exec(cmd, options = {}) {
  const { cwd, timeoutMs = 120000, allowFailure = false } = options;
  try {
    const output = execSync(cmd, {
      cwd,
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { ok: true, code: 0, stdout: output, stderr: '' };
  } catch (e) {
    const stdout = e?.stdout ? String(e.stdout) : '';
    const stderr = e?.stderr ? String(e.stderr) : e?.message ? String(e.message) : '';
    const code = typeof e?.status === 'number' ? e.status : 1;
    if (!allowFailure) {
      return { ok: false, code, stdout, stderr };
    }
    return { ok: true, code, stdout, stderr, failed: true };
  }
}

// ===== v3 ロガー（events.jsonl + console）=====
class V3Logger {
  constructor(runDir, taskId) {
    this.taskId = taskId;
    this.runDir = runDir;
    this.eventsPath = path.join(runDir, 'events.jsonl');
    ensureDir(runDir);
    if (!fs.existsSync(this.eventsPath)) {
      writeText(this.eventsPath, '');
    }
  }

  event(level, type, message, data = null) {
    const entry = {
      ts: nowIso(),
      level,
      type,
      taskId: this.taskId,
      message,
      data
    };
    fs.appendFileSync(this.eventsPath, JSON.stringify(entry) + '\n');
    const prefix =
      {
        info: 'ℹ️',
        success: '✅',
        warn: '⚠️',
        error: '🚨',
        step: '🔄'
      }[level] || '•';
    console.log(`${prefix} ${message}`);
    if (data) {
      console.log(`   ${JSON.stringify(data)}`);
    }
  }

  info(type, message, data) {
    this.event('info', type, message, data);
  }

  step(type, message, data) {
    this.event('step', type, message, data);
  }

  success(type, message, data) {
    this.event('success', type, message, data);
  }

  warn(type, message, data) {
    this.event('warn', type, message, data);
  }

  error(type, message, data) {
    this.event('error', type, message, data);
  }
}

// ===== state.json（STOP/RESUME）=====
function getTaskRootDir(taskId) {
  return path.join(CONFIG.evidenceBaseDir, taskId);
}

function getRunDir(taskId, runId) {
  return path.join(getTaskRootDir(taskId), runId);
}

function listRunDirs(taskId) {
  const root = getTaskRootDir(taskId);
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(root, d.name))
    .sort(); // 文字列ソート（runIdはISOベースなので時系列順になる）
}

function getLatestRunDir(taskId) {
  const dirs = listRunDirs(taskId);
  if (dirs.length === 0) return null;
  return dirs[dirs.length - 1];
}

function findLatestStoppedRunDir(taskId) {
  const dirs = listRunDirs(taskId).slice().sort().reverse();
  for (const dir of dirs) {
    const st = loadState(dir);
    if (st && st.status === 'stopped') return dir;
  }
  return null;
}

function loadState(runDir) {
  const statePath = path.join(runDir, 'state.json');
  if (!fs.existsSync(statePath)) return null;
  return readJson(statePath);
}

function saveState(runDir, state) {
  const statePath = path.join(runDir, 'state.json');
  state.updatedAt = nowIso();
  writeJson(statePath, state);
  return statePath;
}

function buildInitialState({ taskId, runId, dryRun, parentIssue, subIssues }) {
  return {
    version: CONFIG.version,
    taskId,
    runId,
    startedAt: nowIso(),
    updatedAt: nowIso(),
    status: 'running', // running | stopped | done
    mode: { dryRun: !!dryRun },
    parent: {
      taskId,
      issueId: parentIssue?.id ?? null,
      name: parentIssue?.name ?? null,
      sequenceId: parentIssue?.sequence_id ?? null
    },
    subTasks: (subIssues || []).map((i) => ({
      taskId: extractDevId(i?.name) || null,
      issueId: i?.id ?? null,
      name: i?.name ?? null,
      plan: {
        type: null, // ssot | backend | frontend | test | unknown
        targetRepos: [], // ['kanri'|'common'|'saas']
        ssotPaths: [] // 親SSOT（必要に応じて後でサブセット化）
      },
      status: 'pending', // pending | running | done | stopped | skipped
      stage: 'init', // init | prompt | impl | gate | test | pr | done
      attempts: {
        promptFix: 0,
        patch: 0,
        gateFix: 0,
        testFix: 0
      },
      artifacts: {
        promptPath: null,
        patches: [],
        gateLogs: [],
        testLogs: [],
        prUrls: []
      },
      stop: null,
      lastError: null
    })),
    cursor: {
      subTaskIndex: 0,
      stage: 'init'
    },
    artifacts: {
      runDir: null,
      prByRepo: {},
      ssotPaths: []
    },
    lastError: null,
    stop: null
  };
}

function setStop(state, stopInfo) {
  state.status = 'stopped';
  state.stop = {
    ...stopInfo,
    at: nowIso(),
    resumeCommand: `node scripts/auto-dev/run-task-v3.cjs ${state.taskId} --resume`
  };
}

async function stopAndExit({ state, runDir, logger, taskId, taskName, reason, actionRequired, details = null }) {
  setStop(state, { reason, actionRequired });
  saveState(runDir, state);
  logger.error('stop', reason, { actionRequired, ...(details || {}) });

  if (CONFIG.discordNotify) {
    const msg = [
      actionRequired || '(actionRequiredなし)',
      '',
      `runDir: \`${runDir}\``,
      `resume: \`${state.stop.resumeCommand}\``
    ].join('\n');
    await discord.notifyHumanRequired(taskId, taskName || taskId, msg);
  }
  process.exit(1);
}

async function updatePlaneIssueStateSafe({ logger, issueId, stateId, label }) {
  if (!issueId) return { ok: false, skipped: true, reason: 'issueIdなし' };
  try {
    await planeApi.updateIssue(issueId, { state: stateId });
    logger.success('plane', `Plane更新: ${label}`, { issueId, stateId });
    return { ok: true };
  } catch (e) {
    logger.warn('plane', `Plane更新失敗: ${label}`, { issueId, stateId, error: String(e?.message || e) });
    return { ok: false, error: String(e?.message || e) };
  }
}

// ===== Plane / Task解決 =====
function extractDevId(name) {
  const m = String(name || '').match(/\bDEV-(\d{3,6})\b/i);
  return m ? `DEV-${m[1].padStart(4, '0')}` : null;
}

function parseDevNumberFromName(name) {
  const m = String(name || '').match(/\[DEV-(\d+)\]/i);
  return m ? Number(m[1]) : null;
}

async function listAllIssues() {
  const config = planeApi.getPlaneConfig();
  const endpoint = `/api/v1/workspaces/${config.workspace}/projects/${config.projectId}/issues/`;
  return planeApi.request('GET', endpoint);
}

async function getIssueByDevId(taskId) {
  const devNo = Number(String(taskId).replace(/^DEV-/i, ''));
  const allIssuesResult = await listAllIssues();
  const allIssues = allIssuesResult.results || allIssuesResult;
  const issue = allIssues.find((i) => parseDevNumberFromName(i.name) === devNo);
  if (!issue) {
    throw new Error(`Plane: タスクが見つかりません: ${taskId}`);
  }
  return issue;
}

async function getSubIssues(parentIssue) {
  const allIssuesResult = await listAllIssues();
  const allIssues = allIssuesResult.results || allIssuesResult;

  // 1) parentリレーションがあればそれを優先
  const byParent = allIssues.filter((i) => i.parent === parentIssue.id);
  if (byParent.length > 0) {
    return byParent
      .slice()
      .sort((a, b) => (parseDevNumberFromName(a.name) || 0) - (parseDevNumberFromName(b.name) || 0));
  }

  // 2) フォールバック: DEV-0170 -> 0171..0179 をレンジ抽出
  const parentDev = parseDevNumberFromName(parentIssue.name);
  if (!parentDev) return [];
  const rangeStart = parentDev + 1;
  const rangeEnd = parentDev + 9;
  return allIssues
    .filter((i) => {
      const n = parseDevNumberFromName(i.name);
      return n && n >= rangeStart && n <= rangeEnd;
    })
    .sort((a, b) => (parseDevNumberFromName(a.name) || 0) - (parseDevNumberFromName(b.name) || 0));
}

// ===== SSOT解決（親タスク単位）=====
function listMarkdownFilesRecursive(dirPath) {
  const results = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.isFile() && full.endsWith('.md')) {
        results.push(full);
      }
    }
  }
  return results;
}

function extractAllIdsFromText(text) {
  const s = String(text || '');
  const devIds = new Set((s.match(/\bDEV-\d{3,6}\b/gi) || []).map((x) => x.toUpperCase()));
  const comIds = new Set((s.match(/\bCOM-\d{1,6}\b/gi) || []).map((x) => x.toUpperCase()));
  return { devIds: [...devIds], comIds: [...comIds] };
}

function buildSsotSearchNeedles({ parentTaskId, parentIssueName, subIssueNames }) {
  const allText = [parentTaskId, parentIssueName, ...(subIssueNames || [])].filter(Boolean).join('\n');
  const { devIds, comIds } = extractAllIdsFromText(allText);

  const primaryDevId = String(parentTaskId || '').toUpperCase();

  const keywordHints = new Set();
  const lower = allText.toLowerCase();

  // 英数キーワード
  (lower.match(/[a-z0-9][a-z0-9_-]{2,}/g) || []).forEach((w) => keywordHints.add(w));

  // 重要キーワード（日本語）
  const jpHints = [
    'ハンドオフ',
    '通知',
    '電話',
    '証跡',
    'テスト',
    '要件',
    '監査',
    '画面',
    'API',
    // 0180系: セッションリセット運用
    'セッション',
    'リセット',
    '清掃',
    'QR'
  ];
  jpHints.forEach((k) => {
    if (allText.includes(k)) keywordHints.add(k);
  });

  // よく使う英語キーワード（小文字）
  ['handoff', 'notification', 'notify', 'phone', 'cta', 'guest', 'admin', 'ui', 'api'].forEach((k) => {
    if (lower.includes(k)) keywordHints.add(k);
  });

  return { primaryDevId, devIds, comIds, keywordHints: [...keywordHints] };
}

function scoreSsotCandidate({ filePath, content, needles }) {
  let score = 0;
  const base = path.basename(filePath);
  const lowerBase = base.toLowerCase();
  const lowerContent = String(content || '').toLowerCase();
  const upperBase = base.toUpperCase();

  if (base.startsWith('SSOT_')) score += 1;

  // DEV/COMの一致（強い）
  for (const devId of needles.devIds) {
    if (!devId) continue;
    if (String(content).includes(devId)) score += devId === needles.primaryDevId ? 1000 : 200;
  }
  for (const comId of needles.comIds) {
    if (!comId) continue;
    if (String(content).includes(comId)) score += 100;
  }

  // キーワード一致（弱い）
  for (const k of needles.keywordHints) {
    if (!k) continue;
    const kLower = String(k).toLowerCase();
    if (lowerBase.includes(kLower)) score += 50;
    if (lowerContent.includes(kLower)) score += 10;
  }

  // 重要なSSOTを優先（0170系の実績ファイル名）
  const highPriority = [
    'SSOT_GUEST_AI_HANDOFF.MD',
    'SSOT_ADMIN_HANDOFF_NOTIFICATION.MD',
    'SSOT_GUEST_HANDOFF_PHONE_CTA_UI.MD'
  ];
  const is0170Series =
    /^DEV-017\d$/i.test(String(needles.primaryDevId || '')) ||
    (needles.comIds || []).map((x) => String(x || '').toUpperCase()).includes('COM-246') ||
    (needles.keywordHints || []).some((k) => {
      const s = String(k || '').toLowerCase();
      return s === 'handoff' || k === 'ハンドオフ';
    });
  if (is0170Series && highPriority.includes(base.toUpperCase())) score += 500;

  // ノイズ抑制（親SSOT解決では、Dev専用/内部/基盤は優先度を下げる）
  // NOTE: DEVタスク運用では SSOT_DEV-**** が主SSOTになることも多いため、ここでは減点しない
  if (upperBase.startsWith('SSOT__')) score -= 300;
  if (filePath.includes(`${path.sep}00_foundation${path.sep}`)) score -= 200;

  // ただし、特徴量としてのカテゴリ（admin/guest）を少し加点
  if (filePath.includes(`${path.sep}01_admin_features${path.sep}`)) score += 50;
  if (filePath.includes(`${path.sep}02_guest_features${path.sep}`)) score += 50;

  return score;
}

function resolveParentSsotPaths({ parentTaskId, parentIssueName, subIssues }) {
  const ssotRoot = path.join(CONFIG.repos.kanri, 'docs/03_ssot');
  const files = listMarkdownFilesRecursive(ssotRoot).filter((p) => path.basename(p).startsWith('SSOT_'));
  const needles = buildSsotSearchNeedles({
    parentTaskId,
    parentIssueName,
    subIssueNames: (subIssues || []).map((i) => i?.name).filter(Boolean)
  });

  const scored = [];
  for (const filePath of files) {
    let content = '';
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }
    const score = scoreSsotCandidate({ filePath, content, needles });
    if (score > 0) {
      scored.push({ filePath, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, 3).map((x) => x.filePath);
  return { selected, scoredTop: scored.slice(0, 10), needles };
}

// ===== サブタスク分類（repo選択）=====
function classifySubTaskName(name) {
  const s = String(name || '').toLowerCase();

  // Test/Evidence
  if (
    s.includes('test') ||
    s.includes('evidence') ||
    s.includes('証跡') ||
    s.includes('検証') ||
    s.includes('qa')
  ) {
    return 'test';
  }

  // UI/Frontend
  if (
    s.includes('ui') ||
    s.includes('画面') ||
    s.includes('フロント') ||
    s.includes('frontend') ||
    s.includes('nuxt') ||
    s.includes('vue') ||
    s.includes('component') ||
    s.includes('cta')
  ) {
    return 'frontend';
  }

  // Backend/API/DB
  if (
    s.includes('api') ||
    s.includes('backend') ||
    s.includes('db') ||
    s.includes('prisma') ||
    s.includes('route') ||
    s.includes('server') ||
    s.includes('通知') ||
    s.includes('channel')
  ) {
    return 'backend';
  }

  // SSOT/Design
  if (s.includes('ssot') || s.includes('要件') || s.includes('設計') || s.includes('仕様') || s.includes('整理')) {
    return 'ssot';
  }

  return 'unknown';
}

function selectTargetReposForType(type, name) {
  const s = String(name || '').toLowerCase();
  if (type === 'ssot') return ['kanri'];
  if (type === 'frontend') return ['saas'];
  if (type === 'backend') {
    // backendは基本common。proxyが絡む場合はsaasも入れる（暫定ルール）
    const repos = ['common'];
    if (s.includes('proxy') || s.includes('saas') || s.includes('admin ui')) repos.push('saas');
    return repos;
  }
  if (type === 'test') return ['kanri'];
  return ['kanri'];
}

function callClaudePrint({ prompt, cwd, model = 'opus', timeoutMs = 10 * 60 * 1000, yolo = false }) {
  const args = ['--print', '--model', model];
  if (yolo) args.push('--dangerously-skip-permissions');
  const result = spawnSync('claude', args, {
    cwd,
    input: prompt,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: { ...process.env }
  });

  const stdout = String(result.stdout || '');
  const stderr = String(result.stderr || '');
  const code = typeof result.status === 'number' ? result.status : 1;

  return {
    ok: code === 0,
    code,
    stdout,
    stderr,
    combined: [stdout, stderr].filter(Boolean).join('\n')
  };
}

// ===== Prompt生成 & Gate =====
function buildSubTaskPrompt({ parent, subTask, ssotPaths, targetRepos }) {
  const taskId = subTask.taskId || 'DEV-????';
  const title = subTask.name || '';
  const ssotList = (ssotPaths || []).map((p) => `- \`${p}\``).join('\n');
  const repos = (targetRepos || []).map((r) => `- ${r}: \`${CONFIG.repos[r]}\``).join('\n');

  // 目的/範囲/禁止/Accept/Evidence を必ず入れる（prompt-auditのcriticalを満たす）
  return `# 実装指示（Auto-dev v3 / diff-only）

タスク: **${taskId}**
タイトル: ${title}
親タスク: ${parent.taskId} / ${parent.name}

## 参照SSOT（必読）
${ssotList || '- （未解決）'}

## 対象リポジトリ（作業ディレクトリ）
${repos || '- （未確定）'}

---

## 🚨 不可侵ルール（CRITICAL / 絶対禁止）
- 禁止: \`any\` の導入
- 禁止: tenant_id のフォールバック（例: \`tenantId || "default"\`, \`tenantId ?? "default"\`）
- 禁止: hotel-saas 側で Prisma を直接使用
- 禁止: hotel-saas 側で \`$fetch\` 直叩き（Cookie未転送）→ 必ず \`callHotelCommonAPI(event, ...)\`
- 禁止: 深いネストのAPI（\`/api/v1/admin/[親]/[id]/[子]/[id]\`）
- 禁止: \`index.*\` 形式の Nitro API ファイル
- 禁止: システム境界違反（saas→DB直、commonにNitro構成など）

## ✅ 成功条件（Accept）
- [ ] SSOTの要件ID/Accept を満たす実装になっている
- [ ] 静的ゲート（型/ビルド/禁止パターン）がPASS
- [ ] 標準テストがPASS
  - 管理画面: \`bash /Users/kaneko/hotel-kanri/scripts/test-standard-admin.sh\`
  - ゲスト画面: \`bash /Users/kaneko/hotel-kanri/scripts/test-standard-guest.sh\`

## 🧾 Evidence（証跡）
- [ ] 実行したコマンドと終了コード（\`echo $?\`）を記録
- [ ] \`git status\` / \`git diff\` を保存
- [ ] テストログを保存

---

## 出力ルール（このタスクは diff-only）
**必ず unified diff だけを出力してください。**
- 先頭は \`diff --git\` で始める
- 追加説明・Markdownコードフェンス・箇条書きは禁止
- パッチが \`git apply --check\` で適用できること

---

## Item 1: 事前調査（必須）
### Step 1: SSOT読了
- [ ] 上記SSOTを最後まで読む（\`read_file\` 相当）
- [ ] 対象の要件IDとAcceptを抜き出す

### Step 2: 既存実装調査（最低15分）
- [ ] 対象repoで関連コードを検索（\`rg\`）
- [ ] 既存のAPI/画面/ルート配置ルールを確認

## Item 2: 実装（diff作成）
### Step 1: 変更箇所の特定
- [ ] 変更対象ファイルを洗い出す（\`git ls-files\` / \`rg\`）

### Step 2: unified diff を作成
- [ ] 必要最小限の差分で実装する

## Item 3: 静的ゲート（必須）
### Step 1: 禁止パターン検出
- [ ] any/tenant fallback/Prisma直/\\$fetch直 を検出してゼロにする

### Step 2: build/typecheck
- [ ] \`npm run build\`（対象repo）を実行

## Item 4: テスト（必須）
### Step 1: 標準テスト実行
- [ ] \`bash /Users/kaneko/hotel-kanri/scripts/test-standard-admin.sh\` or \`test-standard-guest.sh\`

### Step 2: curlでAPI確認（該当する場合）
- [ ] ログイン → API → 期待レスポンス確認

\`\`\`bash
# 例: 管理画面ログイン（Session Cookie保存）
curl -s -c /tmp/cookies.txt -X POST http://localhost:3101/api/v1/admin/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"owner@test.omotenasuai.com","password":"owner123"}' | jq .

# 例: API呼び出し（Cookie使用）
curl -s -b /tmp/cookies.txt http://localhost:3401/api/v1/admin/tenants | jq .
\`\`\`

## Item 5: PR作成（変更がある場合）
### Step 1: 変更確認
- [ ] \`git status\` と \`git diff\` を確認

### Step 2: PR作成（指示がある場合）
- [ ] \`gh pr create\` でPR作成

## エラー時の対処フロー
- エラーが出たら実装を中断し、原因とログを整理してから修正する
- テストFAILはログを保存し、失敗箇所に対して最小パッチで再挑戦する

## 実装中断基準（STOP）
- [ ] SSOT矛盾/未定義、依存ファイル不在、禁止パターン混入、テストFAIL（リトライ枯渇）→ 中断して報告

## 完了報告フォーマット
\`\`\`markdown
## 完了報告

### 実装内容
- 

### Evidence
- 実行ログ:
- テストログ:
- git diff:

### テスト結果
- [ ] PASS
\`\`\`
`;
}

function runPromptGateAndFix({ promptText, runDir, subTaskId, logger }) {
  if (!promptAuditChecklist?.runChecklist) {
    return {
      ok: true,
      skipped: true,
      reason: 'prompt-audit.cjs が読み込めないためスキップ',
      promptText
    };
  }

  const promptsDir = path.join(runDir, 'prompts');
  ensureDir(promptsDir);
  const auditsDir = path.join(runDir, 'prompt-audit');
  ensureDir(auditsDir);

  const promptPath = path.join(promptsDir, `${subTaskId}.md`);
  writeText(promptPath, promptText);

  const runAudit = (content, label) => {
    const result = promptAuditChecklist.runChecklist(content);
    const outPath = path.join(auditsDir, `${subTaskId}.${label}.audit.json`);
    writeJson(outPath, result);
    return { result, outPath };
  };

  // 1) 初回監査
  let current = promptText;
  let audit1 = runAudit(current, 'v3');
  logger.info('prompt-audit', `Prompt監査: ${subTaskId}`, {
    score: audit1.result.score,
    criticalFailed: audit1.result.criticalFailed?.map((x) => x.id),
    report: audit1.outPath
  });

  // v3方針: STOP判定は criticalFailed のみ（scoreはログ用）
  if ((audit1.result.criticalFailed || []).length === 0) {
    return { ok: true, promptPath, promptText: current, auditPath: audit1.outPath, audit: audit1.result };
  }

  // 2) autoComplete（静的）
  current = promptAuditChecklist.autoComplete(current, audit1.result.failed || []);
  writeText(promptPath, current);
  const audit2 = runAudit(current, 'v3.autocomplete');
  logger.info('prompt-audit', `Prompt自動補完後監査: ${subTaskId}`, {
    score: audit2.result.score,
    criticalFailed: audit2.result.criticalFailed?.map((x) => x.id),
    report: audit2.outPath
  });
  if ((audit2.result.criticalFailed || []).length === 0) {
    return { ok: true, promptPath, promptText: current, auditPath: audit2.outPath, audit: audit2.result };
  }

  // 3) まだcriticalが残る場合は LLM でプロンプトを修正（必要時のみ）
  //    ここではclaude --print を利用して「修正済みプロンプト全文」を生成する
  const fixerPrompt = [
    'あなたは実装プロンプトの修正者です。',
    '次のプロンプト監査で Critical fail が出ないように、プロンプト本文を修正してください。',
    '',
    '制約:',
    '- 出力は修正後のプロンプト全文のみ（説明は禁止）',
    '- Item/Step 構造、bashコードブロック、具体ファイルパス、SSOT参照、不可侵ルール、チェックリスト、テスト/検証、PR/Evidence、エラー対処/中断基準を必ず含める',
    '',
    'Critical Failed IDs:',
    (audit2.result.criticalFailed || []).map((x) => `- ${x.id}: ${x.name}`).join('\n'),
    '',
    'PROMPT:',
    current
  ].join('\n');

  const llm = callClaudePrint({ prompt: fixerPrompt, cwd: CONFIG.repos.kanri });
  if (!llm.ok || !llm.stdout.trim()) {
    return {
      ok: false,
      promptPath,
      promptText: current,
      error: `LLMによるプロンプト修正に失敗: code=${llm.code}`,
      llmOutput: llm.combined
    };
  }

  current = llm.stdout.trim();
  writeText(promptPath, current);
  const audit3 = runAudit(current, 'v3.llmfix');
  logger.info('prompt-audit', `Prompt LLM修正後監査: ${subTaskId}`, {
    score: audit3.result.score,
    criticalFailed: audit3.result.criticalFailed?.map((x) => x.id),
    report: audit3.outPath
  });

  const ok = (audit3.result.criticalFailed || []).length === 0;
  return {
    ok,
    promptPath,
    promptText: current,
    auditPath: audit3.outPath,
    audit: audit3.result,
    llmFixUsed: true
  };
}

// ===== Diff生成 → git apply → 静的ゲート =====
function extractUnifiedDiffText(output) {
  const text = String(output || '').trim();
  const idx = text.indexOf('diff --git ');
  if (idx === -1) return null;
  let diff = text.slice(idx).trim();

  // 余計なmarkdown fenceが紛れた場合の除去（末尾のみ）
  diff = diff.replace(/\n```[\s\S]*$/m, '').trim();
  return diff.startsWith('diff --git ') ? diff : null;
}

function getRepoPath(repoKey) {
  const repoPath = CONFIG.repos[repoKey];
  if (!repoPath) throw new Error(`未知のrepoKey: ${repoKey}`);
  return repoPath;
}

function gitPorcelainStatus(repoPath) {
  const r = exec('git status --porcelain', { cwd: repoPath, timeoutMs: 60000 });
  return (r.stdout || '').trim();
}

function gitDiffNameOnly(repoPath) {
  const r = exec('git diff --name-only', { cwd: repoPath, timeoutMs: 60000 });
  return (r.stdout || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function writePatchArtifact({ runDir, subTaskId, repoKey, attempt, patchText }) {
  const outDir = path.join(runDir, 'patches');
  ensureDir(outDir);
  const outPath = path.join(outDir, `${subTaskId}.${repoKey}.attempt${attempt}.patch`);
  writeText(outPath, patchText);
  return outPath;
}

function gitApplyCheck(repoPath, patchPath) {
  return exec(`git apply --check "${patchPath}"`, { cwd: repoPath, timeoutMs: 60000 });
}

function gitApply(repoPath, patchPath) {
  return exec(`git apply "${patchPath}"`, { cwd: repoPath, timeoutMs: 60000 });
}

function runForbiddenPatternGate({ repoKey, repoPath, changedFiles }) {
  const errors = [];
  const warnings = [];

  // ファイルパスベースの禁止（Nitro index.* 等）
  if (repoKey === 'saas') {
    for (const rel of changedFiles) {
      const base = path.basename(rel);
      const isAdminOrGuestApi =
        rel.startsWith('server/api/v1/admin/') || rel.startsWith('server/api/v1/guest/');
      if (isAdminOrGuestApi && base.startsWith('index.')) {
        errors.push({ type: 'routing', file: rel, message: 'Nitro APIで index.* は禁止（フラット構造）' });
      }
    }
  }

  // コンテンツベースの禁止
  for (const rel of changedFiles) {
    const full = path.join(repoPath, rel);
    if (!fs.existsSync(full)) continue;
    const ext = path.extname(rel);
    if (!['.ts', '.tsx', '.js', '.cjs', '.vue', '.md'].includes(ext)) continue;
    let content = '';
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }

    // any（導入禁止）
    if (/(^|\W)any(\W|$)/.test(content) && (/:\s*any\b/.test(content) || /\bas any\b/.test(content))) {
      errors.push({ type: 'forbidden', file: rel, message: '`any` 型の導入は禁止' });
    }

    // tenant fallback（default）
    if (/tenantId\s*\|\|\s*['"]default['"]/.test(content) || /tenantId\s*\?\?\s*['"]default['"]/.test(content)) {
      errors.push({ type: 'forbidden', file: rel, message: 'tenantId のフォールバック(default)は禁止' });
    }

    // Prisma in saas
    if (repoKey === 'saas') {
      if (/from\s+['"]@prisma\/client['"]/.test(content) || /new\s+PrismaClient\b/.test(content)) {
        errors.push({ type: 'boundary', file: rel, message: 'hotel-saasでPrisma直接使用は禁止' });
      }
      if (/\$fetch\s*\(/.test(content)) {
        const allow = rel.includes('server/utils/api-client');
        if (!allow) {
          errors.push({ type: 'auth', file: rel, message: 'hotel-saasで $fetch 直叩きは禁止（callHotelCommonAPIを使用）' });
        }
      }
    }

    // $fetch direct in non-saasは警告（状況により許容）
    if (repoKey !== 'saas' && /\$fetch\s*\(/.test(content)) {
      warnings.push({ type: 'warn', file: rel, message: '$fetch が含まれています（必要性を確認）' });
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

function runBuildGate({ repoKey, repoPath }) {
  const buildCmdByRepo = {
    common: 'npm run build',
    saas: 'npm run build'
  };
  const cmd = buildCmdByRepo[repoKey];
  if (!cmd) return { ok: true, skipped: true };

  const r = exec(cmd, { cwd: repoPath, timeoutMs: 10 * 60 * 1000, allowFailure: true });
  if (r.failed) {
    return { ok: false, cmd, stdout: r.stdout, stderr: r.stderr };
  }
  return { ok: true, cmd, stdout: r.stdout, stderr: r.stderr };
}

function runStaticGates({ repoKey, repoPath }) {
  const changedFiles = gitDiffNameOnly(repoPath);
  if (changedFiles.length === 0) {
    return { ok: false, reason: 'diff-empty', changedFiles };
  }

  const forbidden = runForbiddenPatternGate({ repoKey, repoPath, changedFiles });
  if (!forbidden.ok) {
    return { ok: false, reason: 'forbidden', changedFiles, forbidden };
  }

  const build = runBuildGate({ repoKey, repoPath });
  if (!build.ok) {
    return { ok: false, reason: 'build', changedFiles, build };
  }

  return { ok: true, changedFiles, forbidden, build };
}

function determineTestTypesFromState(state) {
  const types = new Set();
  const parentName = String(state?.parent?.name || '');
  const allNames = [parentName, ...(state?.subTasks || []).map((t) => t.name || '')].join('\n').toLowerCase();

  // ゲストUI/APIが含まれるなら guest
  if (allNames.includes('guest') || allNames.includes('ゲスト') || allNames.includes('menu') || allNames.includes('ai')) {
    types.add('guest');
  }
  // 管理画面/通知/tenant切替等が含まれるなら admin
  if (
    allNames.includes('admin') ||
    allNames.includes('管理') ||
    allNames.includes('通知') ||
    allNames.includes('switch-tenant') ||
    allNames.includes('auth')
  ) {
    types.add('admin');
  }

  // 何も判定できない場合は guest をデフォルト
  if (types.size === 0) types.add('guest');

  return [...types];
}

function runStandardTest({ testType, runDir, attempt }) {
  const scriptByType = {
    admin: path.join(CONFIG.repos.kanri, 'scripts/test-standard-admin.sh'),
    guest: path.join(CONFIG.repos.kanri, 'scripts/test-standard-guest.sh')
  };
  const scriptPath = scriptByType[testType];
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    return { ok: false, stage: 'test', error: `テストスクリプトが見つかりません: ${testType}`, scriptPath };
  }

  const testsDir = path.join(runDir, 'tests');
  ensureDir(testsDir);
  const logPath = path.join(testsDir, `${testType}.attempt${attempt}.log`);

  const res = spawnSync('bash', [scriptPath], {
    cwd: CONFIG.repos.kanri,
    encoding: 'utf8',
    timeout: 15 * 60 * 1000,
    env: { ...process.env }
  });

  const stdout = String(res.stdout || '');
  const stderr = String(res.stderr || '');
  const exitCode = typeof res.status === 'number' ? res.status : 1;

  writeText(
    logPath,
    [
      `=== test-standard-${testType} ===`,
      `startedAt: ${nowIso()}`,
      `exitCode: ${exitCode}`,
      '',
      '=== STDOUT ===',
      stdout,
      '',
      '=== STDERR ===',
      stderr
    ].join('\n')
  );

  return { ok: exitCode === 0, testType, exitCode, logPath, stdout, stderr };
}

function detectPrereqFailure(testOutputCombined) {
  const s = String(testOutputCombined || '');
  if (s.includes('が起動していません')) {
    return { prereq: true, reason: 'server-not-running' };
  }
  if (s.includes('デバイス認証失敗')) {
    return { prereq: true, reason: 'device-auth-missing' };
  }
  return { prereq: false, reason: null };
}

// ===== PR作成（repoごと）=====
function parseStatusPathsFromPorcelain(porcelain) {
  const lines = String(porcelain || '')
    .split('\n')
    .map((l) => l.trimEnd())
    .filter(Boolean);
  const paths = [];
  for (const line of lines) {
    // format examples:
    // "M  file"
    // "?? file"
    // "R  old -> new"
    const m = line.match(/^[ MADRCU?!]{1,2}\s+(.+)$/);
    if (!m) continue;
    const raw = m[1];
    const arrow = raw.split('->').map((s) => s.trim());
    const p = arrow.length === 2 ? arrow[1] : raw;
    if (p) paths.push(p);
  }
  return paths;
}

function shouldExcludeFromCommit(relPath) {
  const p = relPath.replace(/\\/g, '/');
  const excludePrefixes = [
    'evidence/',
    'logs/',
    '.nuxt/',
    'node_modules/',
    '.playwright-mcp/',
    '.cursor/',
    '.claude/'
  ];
  if (excludePrefixes.some((pre) => p.startsWith(pre))) return true;
  // 生成物/一時ファイル
  if (p.endsWith('.log') || p.endsWith('.tmp')) return true;
  return false;
}

function stageRelevantChanges(repoPath) {
  const status = gitPorcelainStatus(repoPath);
  const allPaths = parseStatusPathsFromPorcelain(status);
  const addPaths = allPaths.filter((p) => !shouldExcludeFromCommit(p));

  if (addPaths.length === 0) {
    return { ok: true, staged: 0, skippedAll: true };
  }

  for (const p of addPaths) {
    // quoting: git add -- "path"
    const r = exec(`git add -- "${p.replace(/"/g, '\\"')}"`, { cwd: repoPath, timeoutMs: 60000 });
    if (!r.ok) {
      return { ok: false, error: `git add 失敗: ${p}`, details: { stdout: r.stdout, stderr: r.stderr } };
    }
  }

  return { ok: true, staged: addPaths.length, skipped: allPaths.length - addPaths.length };
}

function ensureBranch(repoPath, branchName) {
  // checkout -b 失敗時は既存ブランチにcheckout
  const r1 = exec(`git checkout -b "${branchName}"`, { cwd: repoPath, timeoutMs: 60000, allowFailure: true });
  if (r1.failed) {
    const r2 = exec(`git checkout "${branchName}"`, { cwd: repoPath, timeoutMs: 60000 });
    if (!r2.ok) {
      return { ok: false, error: 'git checkout 失敗', details: { stdout: r2.stdout, stderr: r2.stderr } };
    }
  }
  return { ok: true };
}

function commitIfNeeded(repoPath, message) {
  const diff = exec('git diff --cached --name-only', { cwd: repoPath, timeoutMs: 60000 });
  const hasStaged = diff.ok && String(diff.stdout || '').trim().length > 0;
  if (!hasStaged) return { ok: true, skipped: true };

  const r = exec(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: repoPath, timeoutMs: 60000, allowFailure: true });
  if (r.failed) {
    // nothing to commit 等
    const combined = `${r.stdout}\n${r.stderr}`;
    if (combined.includes('nothing to commit') || combined.includes('nothing added')) {
      return { ok: true, skipped: true };
    }
    return { ok: false, error: 'git commit 失敗', details: { stdout: r.stdout, stderr: r.stderr } };
  }
  return { ok: true, skipped: false };
}

function detectDefaultBaseBranch(repoPath) {
  const r = exec('git symbolic-ref refs/remotes/origin/HEAD', { cwd: repoPath, timeoutMs: 60000, allowFailure: true });
  const s = String(r.stdout || '').trim();
  const m = s.match(/refs\/remotes\/origin\/(.+)$/);
  return m ? m[1] : 'main';
}

function pushBranch(repoPath, branchName) {
  const r = exec(`git push -u origin "${branchName}"`, { cwd: repoPath, timeoutMs: 5 * 60 * 1000, allowFailure: true });
  if (r.failed) {
    return { ok: false, error: 'git push 失敗', details: { stdout: r.stdout, stderr: r.stderr } };
  }
  return { ok: true };
}

function createPullRequest(repoPath, { title, body, baseBranch }) {
  const res = spawnSync('gh', ['pr', 'create', '--title', title, '--body', body, '--base', baseBranch], {
    cwd: repoPath,
    encoding: 'utf8',
    timeout: 2 * 60 * 1000,
    env: { ...process.env }
  });
  const stdout = String(res.stdout || '');
  const stderr = String(res.stderr || '');
  const code = typeof res.status === 'number' ? res.status : 1;
  if (code !== 0) {
    return { ok: false, error: 'gh pr create 失敗', details: { stdout, stderr, code } };
  }
  const url = (stdout.match(/https?:\/\/\S+/) || [null])[0];
  return { ok: true, url, raw: stdout };
}

function buildPatchRequestPrompt({ subTaskId, repoKey, repoPath, promptText, attempt, extraContext }) {
  const lines = [];
  lines.push('あなたはunified diff生成専用の実装者です。');
  lines.push(`対象repo: ${repoKey}`);
  lines.push(`作業ディレクトリ: ${repoPath}`);
  lines.push(`サブタスク: ${subTaskId}`);
  lines.push('');
  lines.push('必須: 出力はunified diffのみ（diff --git から開始）。説明は禁止。');
  lines.push('必須: パッチはこのrepoの相対パスのみを含める（他repoのパスを混ぜない）。');
  lines.push('必須: 禁止事項（any/tenant fallback/saas Prisma/$fetch直/深いネスト/index.*）を守る。');
  lines.push('');
  if (attempt > 1) {
    lines.push(`これは再試行です（attempt ${attempt}）。直前の失敗を踏まえて最小差分で修正してください。`);
    lines.push('');
  }
  if (extraContext) {
    lines.push('---');
    lines.push('失敗/追加コンテキスト:');
    lines.push(String(extraContext).slice(0, 8000));
    lines.push('---');
  }
  lines.push('---');
  lines.push('実装プロンプト:');
  lines.push(promptText);
  return lines.join('\n');
}

function generateAndApplyPatchWithFixLoop({
  repoKey,
  subTaskId,
  basePromptText,
  runDir,
  logger,
  maxRetries,
  initialExtraContext = null
}) {
  const repoPath = getRepoPath(repoKey);
  let extraContext = initialExtraContext;

  // 生成→適用→ゲート を最大maxRetries回
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logger.step('patch', `Patch生成: ${subTaskId} (${repoKey}) attempt ${attempt}/${maxRetries}`);

    const patchPrompt = buildPatchRequestPrompt({
      subTaskId,
      repoKey,
      repoPath,
      promptText: basePromptText,
      attempt,
      extraContext
    });
    const llm = callClaudePrint({ prompt: patchPrompt, cwd: repoPath, yolo: true, timeoutMs: 20 * 60 * 1000 });
    const diff = extractUnifiedDiffText(llm.stdout);
    if (!llm.ok || !diff) {
      const msg = `unified diffの生成に失敗（code=${llm.code}）`;
      logger.warn('patch', msg, { stderr: llm.stderr?.slice(0, 500), stdout: llm.stdout?.slice(0, 500) });
      if (attempt === maxRetries) {
        return { ok: false, stage: 'generate', error: msg, llmOutput: llm.combined };
      }
      extraContext = `unified diff生成に失敗しました。次は必ず diff --git から始まるunified diffのみを出力してください。\n(code=${llm.code})\n${llm.stderr?.slice(0, 1000) || ''}`;
      continue;
    }

    const patchPath = writePatchArtifact({ runDir, subTaskId, repoKey, attempt, patchText: diff });
    logger.info('patch', 'patchを保存', { patchPath });

    const check = gitApplyCheck(repoPath, patchPath);
    if (!check.ok) {
      const msg = 'git apply --check に失敗';
      logger.warn('patch', msg, { stderr: check.stderr?.slice(0, 1000), stdout: check.stdout?.slice(0, 1000) });
      if (attempt === maxRetries) {
        return { ok: false, stage: 'apply-check', error: msg, details: { stdout: check.stdout, stderr: check.stderr, patchPath } };
      }
      extraContext = `git apply --check が失敗しました。現在のrepo状態に適用可能なunified diffを再生成してください。\n---\n${check.stderr || check.stdout}\n---\n直前パッチ: ${patchPath}`;
      continue;
    }

    const applied = gitApply(repoPath, patchPath);
    if (!applied.ok) {
      const msg = 'git apply に失敗';
      logger.warn('patch', msg, { stderr: applied.stderr?.slice(0, 1000), stdout: applied.stdout?.slice(0, 1000) });
      if (attempt === maxRetries) {
        return { ok: false, stage: 'apply', error: msg, details: { stdout: applied.stdout, stderr: applied.stderr, patchPath } };
      }
      extraContext = `git apply が失敗しました。適用可能なunified diffを再生成してください。\n---\n${applied.stderr || applied.stdout}\n---\n直前パッチ: ${patchPath}`;
      continue;
    }

    logger.success('patch', 'patch適用成功', { repoKey, subTaskId, patchPath });

    // 静的ゲート
    logger.step('gate', `静的ゲート: ${subTaskId} (${repoKey})`);
    const gate = runStaticGates({ repoKey, repoPath });
    const gatesDir = path.join(runDir, 'gates');
    ensureDir(gatesDir);
    const gatePath = path.join(gatesDir, `${subTaskId}.${repoKey}.attempt${attempt}.gate.json`);
    writeJson(gatePath, gate);

    if (gate.ok) {
      logger.success('gate', '静的ゲートPASS', { repoKey, gatePath, changedFiles: gate.changedFiles });
      return { ok: true, patchPath, gatePath, gate };
    }

    // ゲートFAIL: LLMに修正パッチを再生成させる（次のattemptで反映）
    const failureContext = [
      `gate.reason=${gate.reason}`,
      gate.reason === 'forbidden' ? JSON.stringify(gate.forbidden?.errors || []) : '',
      gate.reason === 'build' ? stripAnsi(gate.build?.stderr || gate.build?.stdout || '') : ''
    ]
      .filter(Boolean)
      .join('\n');

    logger.warn('gate', '静的ゲートFAIL（次attemptで修正パッチを生成）', { repoKey, gatePath, reason: gate.reason });

    extraContext = `直前の静的ゲート失敗:\n${failureContext}\n\n直前パッチ: ${patchPath}\nゲートレポート: ${gatePath}`;
    // ここで continue して次attemptへ（extraContextを渡して生成）
  }

  return { ok: false, stage: 'gate', error: '静的ゲートがリトライ上限に達しました' };
}

// ===== CLI =====
function parseArgs(argv) {
  const args = argv.slice(2);
  const taskId = args[0];
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');
  const noDiscord = args.includes('--no-discord');
  return { taskId, dryRun, resume, noDiscord };
}

// ===== 実行（ここから）=====
async function main() {
  const { taskId, dryRun, resume, noDiscord } = parseArgs(process.argv);

  if (!taskId || taskId.startsWith('-')) {
    console.log('');
    console.log('Auto-dev v3');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/auto-dev/run-task-v3.cjs DEV-0170');
    console.log('  node scripts/auto-dev/run-task-v3.cjs DEV-0170 --dry-run');
    console.log('  node scripts/auto-dev/run-task-v3.cjs DEV-0170 --resume');
    console.log('');
    process.exit(1);
  }

  CONFIG.discordNotify = CONFIG.discordNotify && !noDiscord;

  // runDir / state を確定
  let runDir;
  let state;
  let runId;

  if (resume) {
    runDir = findLatestStoppedRunDir(taskId) || getLatestRunDir(taskId);
    if (!runDir) {
      console.error(`❌ RESUME対象の実行履歴がありません: ${taskId}`);
      process.exit(1);
    }
    state = loadState(runDir);
    if (!state) {
      console.error(`❌ state.json が見つかりません: ${runDir}`);
      process.exit(1);
    }
    runId = state.runId;
  } else {
    runId = safeRunId(nowIso());
    runDir = getRunDir(taskId, runId);
    ensureDir(runDir);
  }

  const logger = new V3Logger(runDir, taskId);
  logger.step('init', `v3開始: ${taskId}${dryRun ? ' (dry-run)' : ''}${resume ? ' (resume)' : ''}`, {
    runDir
  });

  if (resume && state) {
    if (state.mode?.dryRun) {
      logger.error('resume', 'dry-runの実行履歴はresumeできません（新規実行してください）', {
        lastRunDir: runDir
      });
      process.exit(1);
    }
    if (state.status === 'done') {
      logger.success('resume', '既に完了しているため何もしません', { lastRunDir: runDir });
      process.exit(0);
    }
    if (state.status === 'stopped') {
      state.status = 'running';
      state.stop = null;
      state.resumedAt = nowIso();
      saveState(runDir, state);
      logger.success('resume', '再開: stateをrunningに更新', { stage: state.cursor?.stage || null, runDir });
    }
  }

  // Plane取得
  let parentIssue;
  let subIssues;
  try {
    parentIssue = await getIssueByDevId(taskId);
    subIssues = await getSubIssues(parentIssue);
  } catch (e) {
    logger.error('plane', 'Plane取得に失敗', { error: String(e?.message || e) });
    process.exit(1);
  }

  // タスク開始: PlaneをIn Progressへ（ベストエフォート） + Discord通知
  if (!dryRun) {
    logger.step('plane', 'Planeステータス更新（In Progress）…');
    await updatePlaneIssueStateSafe({
      logger,
      issueId: parentIssue?.id,
      stateId: PLANE_STATES.IN_PROGRESS,
      label: `parent ${taskId} start`
    });
    for (const si of subIssues || []) {
      await updatePlaneIssueStateSafe({
        logger,
        issueId: si?.id,
        stateId: PLANE_STATES.IN_PROGRESS,
        label: `subTask start (${extractDevId(si?.name) || si?.id})`
      });
    }

    if (CONFIG.discordNotify) {
      try {
        await discord.notifyTaskStart(taskId, parentIssue?.name || taskId);
      } catch {
        // no-op
      }
    }
  }

  if (!state) {
    state = buildInitialState({ taskId, runId, dryRun, parentIssue, subIssues });
    state.artifacts.runDir = runDir;
    saveState(runDir, state);
  } else {
    // resume時にdry-runを上書きしない（安全側）
    state.mode = { ...(state.mode || {}), dryRun: !!(state.mode?.dryRun) };
    saveState(runDir, state);
  }

  // SSOT解決（親タスク単位で1回だけ）
  if (!Array.isArray(state.artifacts.ssotPaths) || state.artifacts.ssotPaths.length === 0) {
    logger.step('ssot-resolve', '親SSOTを解決中…');
    const resolved = resolveParentSsotPaths({
      parentTaskId: taskId,
      parentIssueName: parentIssue?.name,
      subIssues
    });
    state.artifacts.ssotPaths = resolved.selected;
    saveState(runDir, state);
    if (resolved.selected.length === 0) {
      await stopAndExit({
        state,
        runDir,
        logger,
        taskId,
        taskName: state.parent.name || taskId,
        reason: 'SSOT不在',
        actionRequired: `親タスクに紐づくSSOTが特定できません。\n- 対応: Planeに ssot: を追加する、またはSSOT側に ${taskId} / 子タスクID の参照を追記\n- top候補: ${(resolved.scoredTop || []).slice(0, 5).map((x) => x.filePath).join(', ')}`,
        details: { needles: resolved.needles, top10: resolved.scoredTop }
      });
    }
    logger.success('ssot-resolve', '親SSOTを解決', {
      selected: resolved.selected,
      top10: resolved.scoredTop
    });
  }

  // サブタスクごとのrepo計画を作成（dry-run/実行共通）
  state.subTasks.forEach((t) => {
    const type = classifySubTaskName(t.name);
    const targetRepos = selectTargetReposForType(type, t.name);
    t.plan = t.plan || { type: null, targetRepos: [], ssotPaths: [] };
    t.plan.type = type;
    t.plan.targetRepos = targetRepos;
    t.plan.ssotPaths = Array.isArray(state.artifacts.ssotPaths) ? state.artifacts.ssotPaths : [];
  });
  saveState(runDir, state);

  // v3: まずは計画表示（--dry-run）
  if (dryRun) {
    logger.info('dry-run', '実行計画', {
      parent: { id: state.parent.taskId, name: state.parent.name },
      ssotPaths: state.artifacts.ssotPaths,
      subTasks: state.subTasks.map((t) => ({
        id: t.taskId,
        name: t.name,
        type: t.plan?.type,
        targetRepos: t.plan?.targetRepos
      }))
    });
    state.status = 'done';
    saveState(runDir, state);
    logger.success('done', 'dry-run完了（実処理なし）');
    process.exit(0);
  }

  // ===== v3: resume用の段階管理 =====
  const STAGES = ['init', 'ssot-audit', 'prompt', 'impl', 'tests', 'pr', 'done'];
  const stageIndex = (s) => {
    const idx = STAGES.indexOf(String(s || 'init'));
    return idx === -1 ? 0 : idx;
  };
  state.cursor = state.cursor || { subTaskIndex: 0, stage: 'init' };
  if (!state.cursor.stage) state.cursor.stage = 'init';
  saveState(runDir, state);

  // SSOT監査（v3動的N/A）
  if (stageIndex(state.cursor.stage) <= stageIndex('ssot-audit')) {
    state.cursor.stage = 'ssot-audit';
    saveState(runDir, state);

    if (Array.isArray(state.artifacts.ssotPaths) && state.artifacts.ssotPaths.length > 0) {
      for (const ssotPath of state.artifacts.ssotPaths) {
        logger.step('ssot-audit', `SSOT監査（動的）: ${path.basename(ssotPath)}`);
        const audit = runSsotAuditDynamic({ ssotPath, runDir });
        if (audit.skipped) {
          logger.warn('ssot-audit', 'SSOT監査をスキップ', audit);
          continue;
        }
        logger.info('ssot-audit', 'SSOT監査サマリー', audit.summary);
        if (!audit.ok) {
          await stopAndExit({
            state,
            runDir,
            logger,
            taskId,
            taskName: state.parent.name || taskId,
            reason: 'SSOT監査FAIL（動的）',
            actionRequired: `SSOTを修正してください。\n- 対象: ${ssotPath}\n- レポート: ${audit.reportPath}`
          });
        }
      }
    }

    state.cursor.stage = 'prompt';
    saveState(runDir, state);
  }

  // プロンプト生成→監査→自動補完（必要時のみLLM修正）
  if (stageIndex(state.cursor.stage) <= stageIndex('prompt')) {
    state.cursor.stage = 'prompt';
    saveState(runDir, state);

    logger.step('prompt', 'サブタスクごとのプロンプトを生成/監査…');
    for (const subTask of state.subTasks) {
      const subTaskId = subTask.taskId || 'DEV-????';
      const promptText = buildSubTaskPrompt({
        parent: state.parent,
        subTask,
        ssotPaths: subTask.plan?.ssotPaths || state.artifacts.ssotPaths,
        targetRepos: subTask.plan?.targetRepos || []
      });

      const gate = runPromptGateAndFix({ promptText, runDir, subTaskId, logger });
      subTask.artifacts = subTask.artifacts || {};
      subTask.artifacts.promptPath = gate.promptPath || null;
      subTask.lastError = gate.ok ? null : gate.error || 'prompt gate failed';
      saveState(runDir, state);

      if (gate.skipped) {
        logger.warn('prompt', `Prompt監査スキップ: ${subTaskId}`, gate);
        continue;
      }
      if (!gate.ok) {
        await stopAndExit({
          state,
          runDir,
          logger,
          taskId,
          taskName: state.parent.name || taskId,
          reason: 'PromptゲートFAIL',
          actionRequired: `Promptの自動修正に失敗しました。\n- subTask: ${subTaskId}\n- prompt: ${gate.promptPath}\n- error: ${gate.error || 'unknown'}\n- llmOutput: ${String(gate.llmOutput || '').slice(0, 1000)}`
        });
      }
    }

    state.cursor.stage = 'impl';
    saveState(runDir, state);
  }

  // 対象repo集合（tests/prでも使用）
  const reposToTouch = new Set();
  for (const subTask of state.subTasks) {
    if (subTask.plan?.type === 'test') continue;
    if (CONFIG.skipSsotSubTasks && subTask.plan?.type === 'ssot') continue;
    for (const repoKey of subTask.plan?.targetRepos || []) reposToTouch.add(repoKey);
  }

  // 実装（diff-only）→ git apply → 静的ゲート（build/禁止パターン）
  if (stageIndex(state.cursor.stage) <= stageIndex('impl')) {
    state.cursor.stage = 'impl';
    saveState(runDir, state);

    logger.step('impl', 'diff生成→apply→静的ゲート…');

    // 事前に repo の状態を確認（common/saasは原則クリーン必須）
    for (const repoKey of reposToTouch) {
      const repoPath = getRepoPath(repoKey);
      if (!fs.existsSync(repoPath)) {
        await stopAndExit({
          state,
          runDir,
          logger,
          taskId,
          taskName: state.parent.name || taskId,
          reason: 'repo不在',
          actionRequired: `対象repoが見つからないため停止します。\n- repo: ${repoKey}\n- expectedPath: ${repoPath}\n\n対処:\n- リポジトリをcloneする\n- もしくは環境変数で場所を指定する（例）\n  - AUTODEV_COMMON_DIR\n  - AUTODEV_SAAS_DIR\n  - AUTODEV_KANRI_DIR`
        });
      }
      const status = gitPorcelainStatus(repoPath);
      if (status) {
        if (repoKey === 'kanri') {
          logger.warn('preflight', 'hotel-kanri がdirtyですが続行します（v3は専用環境での実行を推奨）', {
            repoKey,
            repoPath,
            status: status.split('\n').slice(0, 20)
          });
        } else {
          await stopAndExit({
            state,
            runDir,
            logger,
            taskId,
            taskName: state.parent.name || taskId,
            reason: '作業ツリーがdirty',
            actionRequired: `対象repoがdirtyのため停止します。\n- repo: ${repoKey} (${repoPath})\n- 先に作業ツリーをクリーンにしてください（stash/commit/resetなど）。\n---\n${status}`
          });
        }
      }
    }

    for (const subTask of state.subTasks) {
      const subTaskId = subTask.taskId || 'DEV-????';
      const type = subTask.plan?.type || 'unknown';
      if (type === 'test') continue;
      if (CONFIG.skipSsotSubTasks && type === 'ssot') {
        subTask.status = 'skipped';
        subTask.stage = 'done';
        saveState(runDir, state);
        logger.info('impl', `skip ssot subTask: ${subTaskId}`);
        continue;
      }

      // resume時: 既に静的ゲートまで完了しているサブタスクはスキップ
      if (subTask.stage === 'gate') {
        logger.info('impl', `skip: ${subTaskId}（既にgateまで完了）`);
        continue;
      }

      subTask.status = 'running';
      subTask.stage = 'impl';
      saveState(runDir, state);

      const promptPath = subTask.artifacts?.promptPath;
      if (!promptPath || !fs.existsSync(promptPath)) {
        await stopAndExit({
          state,
          runDir,
          logger,
          taskId,
          taskName: state.parent.name || taskId,
          reason: 'prompt不在',
          actionRequired: `promptが見つかりません。\n- subTask: ${subTaskId}\n- promptPath: ${promptPath || '(null)'}`
        });
      }
      const basePromptText = fs.readFileSync(promptPath, 'utf8');

      for (const repoKey of subTask.plan?.targetRepos || []) {
        const result = generateAndApplyPatchWithFixLoop({
          repoKey,
          subTaskId,
          basePromptText,
          runDir,
          logger,
          maxRetries: CONFIG.maxRetries
        });

        subTask.artifacts = subTask.artifacts || { patches: [], gateLogs: [], testLogs: [], prUrls: [] };
        if (result.patchPath) subTask.artifacts.patches.push(result.patchPath);
        if (result.gatePath) subTask.artifacts.gateLogs.push(result.gatePath);
        saveState(runDir, state);

        if (!result.ok) {
          await stopAndExit({
            state,
            runDir,
            logger,
            taskId,
            taskName: state.parent.name || taskId,
            reason: '実装/静的ゲートFAIL',
            actionRequired: [
              `subTask: ${subTaskId}`,
              `repo: ${repoKey}`,
              `stage: ${result.stage || 'unknown'}`,
              `error: ${result.error || 'unknown'}`,
              result.details ? `details: ${JSON.stringify(result.details).slice(0, 2000)}` : '',
              result.llmOutput ? `llmOutput: ${String(result.llmOutput).slice(0, 2000)}` : ''
            ]
              .filter(Boolean)
              .join('\n')
          });
        }
      }

      subTask.stage = 'gate';
      subTask.status = 'pending';
      saveState(runDir, state);
    }

    state.cursor.stage = 'tests';
    saveState(runDir, state);
  }

  // 標準テスト → 修正 → 再テスト（最大3回）
  if (stageIndex(state.cursor.stage) <= stageIndex('tests')) {
    state.cursor.stage = 'tests';
    saveState(runDir, state);

    logger.step('tests', '標準テスト（admin/guest）→修正→再テスト…');
    const testTypes = determineTestTypesFromState(state);
    const reposToFix = [...reposToTouch].filter((r) => r !== 'kanri');
    state.tests = state.tests || {};

    for (const testType of testTypes) {
      if (state.tests?.[testType]?.passed) {
        logger.info('tests', `skip: test-standard-${testType}（既にPASS済み）`, state.tests[testType]);
        continue;
      }

      let passed = false;
      for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
        logger.step('tests', `test-standard-${testType}: attempt ${attempt}/${CONFIG.maxRetries}`);
        const testRun = runStandardTest({ testType, runDir, attempt });
        state.artifacts.testLogs = state.artifacts.testLogs || [];
        state.artifacts.testLogs.push(testRun.logPath);
        saveState(runDir, state);

        if (testRun.ok) {
          logger.success('tests', `test-standard-${testType} PASS`, { logPath: testRun.logPath });
          state.tests[testType] = { passed: true, passedAt: nowIso(), logs: [...new Set(state.artifacts.testLogs)] };
          saveState(runDir, state);
          passed = true;
          break;
        }

        logger.warn('tests', `test-standard-${testType} FAIL`, { logPath: testRun.logPath, exitCode: testRun.exitCode });

        const prereq = detectPrereqFailure([testRun.stdout, testRun.stderr].join('\n'));
        if (prereq.prereq) {
          await stopAndExit({
            state,
            runDir,
            logger,
            taskId,
            taskName: state.parent.name || taskId,
            reason: `標準テスト前提条件FAIL(${prereq.reason})`,
            actionRequired: `標準テストが前提条件で失敗しました（自動修正不可）。\n- test: ${testType}\n- log: ${testRun.logPath}\n- まず hotel-common-rebuild / hotel-saas-rebuild の起動、またはデバイス認証のseedを確認してください。`
          });
        }

        // テストFAIL時: 変更がある repo から修正パッチを試す（LLM）
        const combined = [testRun.stdout, testRun.stderr].join('\n');
        for (const repoKey of reposToFix) {
          logger.step('tests-fix', `テスト修正パッチ生成: ${repoKey} (attempt ${attempt})`);

          const fixBasePrompt = [
            `# テスト失敗修正（Auto-dev v3）`,
            ``,
            `目的: test-standard-${testType}.sh をPASSさせる`,
            `制約: any禁止 / tenant fallback禁止 / (saas)Prisma禁止 / (saas)$fetch直禁止`,
            ``,
            `## テストログ`,
            combined.substring(0, 12000),
            ``,
            `## 追加指示`,
            `- 最小差分で修正する`,
            `- 既存仕様（SSOT）を破らない`,
            `- unified diffのみを出力する`
          ].join('\n');

          const fix = generateAndApplyPatchWithFixLoop({
            repoKey,
            subTaskId: `TESTFIX-${testType.toUpperCase()}-${attempt}`,
            basePromptText: fixBasePrompt,
            runDir,
            logger,
            maxRetries: CONFIG.maxRetries,
            initialExtraContext: `直前テストFAIL（test=${testType}, attempt=${attempt}）\nlog: ${testRun.logPath}`
          });

          if (!fix.ok) {
            logger.warn('tests-fix', `修正パッチ失敗: ${repoKey}`, { stage: fix.stage, error: fix.error });
            continue;
          }
          logger.success('tests-fix', `修正パッチ適用: ${repoKey}`, { patchPath: fix.patchPath, gatePath: fix.gatePath });
        }
        // 次attemptでテストを再実行
      }

      if (!passed) {
        await stopAndExit({
          state,
          runDir,
          logger,
          taskId,
          taskName: state.parent.name || taskId,
          reason: `標準テストFAIL（${testType}）`,
          actionRequired: `標準テストがリトライ上限に達しました。\n- test: ${testType}\n- logs: ${(state.artifacts.testLogs || []).slice(-3).join(', ')}`
        });
      }
    }

    state.cursor.stage = 'pr';
    saveState(runDir, state);
  }

  // PR作成（repoごと）: 変更のあるrepoだけ
  if (stageIndex(state.cursor.stage) <= stageIndex('pr')) {
    state.cursor.stage = 'pr';
    saveState(runDir, state);

    logger.step('pr', 'repoごとにPR作成…');
    const branchName = `feature/${String(taskId).toLowerCase()}-v3`;

    state.artifacts.prByRepo = state.artifacts.prByRepo || {};

    const prRepoAllow = new Set(CONFIG.prRepos || []);
    for (const repoKey of [...reposToTouch].filter((r) => prRepoAllow.has(r))) {
      if (state.artifacts.prByRepo[repoKey]) {
        logger.info('pr', `skip: PR作成済み ${repoKey}`, { url: state.artifacts.prByRepo[repoKey] });
        continue;
      }

      const repoPath = getRepoPath(repoKey);
      const status = gitPorcelainStatus(repoPath);
      if (!status) {
        logger.info('pr', `変更なし: ${repoKey}（PRスキップ）`);
        continue;
      }

      logger.step('pr', `PR準備: ${repoKey}`);
      const checkout = ensureBranch(repoPath, branchName);
      if (!checkout.ok) {
        await stopAndExit({
          state,
          runDir,
          logger,
          taskId,
          taskName: state.parent.name || taskId,
          reason: 'git checkout 失敗',
          actionRequired: `${repoKey}: ${checkout.error}`,
          details: { repoKey, checkout }
        });
      }

      const staged = stageRelevantChanges(repoPath);
      if (!staged.ok) {
        await stopAndExit({
          state,
          runDir,
          logger,
          taskId,
          taskName: state.parent.name || taskId,
          reason: 'git add 失敗',
          actionRequired: `${repoKey}: ${staged.error}`,
          details: { repoKey, staged }
        });
      }

      const commitMsg = `feat(${taskId}): auto-dev v3`;
      const committed = commitIfNeeded(repoPath, commitMsg);
      if (!committed.ok) {
        await stopAndExit({
          state,
          runDir,
          logger,
          taskId,
          taskName: state.parent.name || taskId,
          reason: 'git commit 失敗',
          actionRequired: `${repoKey}: ${committed.error}`,
          details: { repoKey, committed }
        });
      }

      const pushed = pushBranch(repoPath, branchName);
      if (!pushed.ok) {
        await stopAndExit({
          state,
          runDir,
          logger,
          taskId,
          taskName: state.parent.name || taskId,
          reason: 'git push 失敗',
          actionRequired: `${repoKey}: ${pushed.error}`,
          details: { repoKey, pushed }
        });
      }

      const baseBranch = detectDefaultBaseBranch(repoPath);
      const prTitle = `[${taskId}] auto-dev v3 (${repoKey})`;
      const prBody = [
        '## Summary',
        `- auto-dev v3 により ${taskId} を自動実行した差分`,
        '',
        '## SSOT',
        ...(state.artifacts.ssotPaths || []).map((p) => `- ${p}`),
        '',
        '## Test',
        ...(state.artifacts.testLogs || []).map((p) => `- ${p}`),
        '',
        '## Evidence',
        `- runDir: ${runDir}`,
        '',
        '## Notes',
        '- generated by scripts/auto-dev/run-task-v3.cjs'
      ].join('\n');

      const pr = createPullRequest(repoPath, { title: prTitle, body: prBody, baseBranch });
      if (!pr.ok) {
        await stopAndExit({
          state,
          runDir,
          logger,
          taskId,
          taskName: state.parent.name || taskId,
          reason: 'gh pr create 失敗',
          actionRequired: `${repoKey}: ${pr.error}\n${pr.details?.stderr || ''}`,
          details: { repoKey, pr }
        });
      }

      state.artifacts.prByRepo[repoKey] = pr.url;
      saveState(runDir, state);
      logger.success('pr', `PR作成: ${repoKey}`, { url: pr.url });
    }

    state.cursor.stage = 'done';
    saveState(runDir, state);
  }

  // 完了
  state.status = 'done';
  state.completedAt = nowIso();
  state.subTasks.forEach((t) => {
    t.status = 'done';
    t.stage = 'done';
  });
  saveState(runDir, state);

  // Plane更新（Done）: 失敗してもSTOPはしない（警告として残す）
  logger.step('plane', 'Planeステータス更新（Done）…');
  state.planeUpdate = state.planeUpdate || { done: false, results: [] };
  const planeResults = [];

  // 子タスクをDone
  for (const t of state.subTasks || []) {
    if (!t.issueId) continue;
    const r = await updatePlaneIssueStateSafe({
      logger,
      issueId: t.issueId,
      stateId: PLANE_STATES.DONE,
      label: `subTask ${t.taskId}`
    });
    planeResults.push({ taskId: t.taskId, issueId: t.issueId, ...r });
  }
  // 親タスクもDone（子が揃っている前提）
  if (state.parent?.issueId) {
    const r = await updatePlaneIssueStateSafe({
      logger,
      issueId: state.parent.issueId,
      stateId: PLANE_STATES.DONE,
      label: `parent ${state.parent.taskId}`
    });
    planeResults.push({ taskId: state.parent.taskId, issueId: state.parent.issueId, ...r });
  }
  state.planeUpdate = { done: true, at: nowIso(), results: planeResults };
  saveState(runDir, state);

  logger.success('done', 'v3完了', { prByRepo: state.artifacts.prByRepo, runDir });

  if (CONFIG.discordNotify) {
    const fields = Object.entries(state.artifacts.prByRepo || {}).map(([repoKey, url]) => ({
      name: `PR (${repoKey})`,
      value: url || '(urlなし)',
      inline: false
    }));
    await discord.sendNotification('task_complete', 'v3完了', {
      taskId,
      message: state.parent.name || taskId,
      fields
    });
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('🚨 v3実行エラー:', e);
  process.exit(1);
});

