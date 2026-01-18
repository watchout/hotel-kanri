# AI駆動開発パイプライン - 残タスク一覧

**最終更新**: 2026-01-17  
**目的**: 完全自動化に必要な残作業の可視化

---

## 📊 完成度サマリー

```
┌─────────────────────────────────────────────────────────────────┐
│ Stage 1: SSOT生成          [██████████] 100% ✅ 完成            │
│ Stage 2: プロンプト生成    [░░░░░░░░░░]   0%                    │
│ Stage 3: プロンプト監査    [░░░░░░░░░░]   0%                    │
│ Stage 4: プロンプト修正    [░░░░░░░░░░]   0%                    │
│ Stage 5: プロンプト完成    [░░░░░░░░░░]   0%                    │
│ Stage 6: 実装(Claude/Codex)[░░░░░░░░░░]   0%                    │
│ Stage 7: 実装監査          [░░░░░░░░░░]   0%                    │
│ Stage 8: 自動修正          [░░░░░░░░░░]   0%                    │
│ Stage 9: テスト            [██░░░░░░░░]  20% (標準テストあり)   │
│ Stage 10: PR/CI            [████░░░░░░]  40% (CI一部あり)       │
│ Stage 11: マージ           [░░░░░░░░░░]   0%                    │
│ Stage 12: Plane更新        [██████░░░░]  60% (API連携あり)      │
├─────────────────────────────────────────────────────────────────┤
│ 全体完成度: 18%                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Phase 1: プロンプト自動生成（優先度：最高）

**目標**: SSOTを読み込み、実装プロンプトを自動生成

### Task 1-1: SSOT解析エンジン
**工数**: 2日

```javascript
// 入力: SSOT_FEATURE.md
// 出力: 構造化データ
{
  requirements: [
    { id: 'HDF-001', type: 'FR', description: '...', accept: [...] },
    { id: 'HDF-100', type: 'NFR', description: '...', accept: [...] }
  ],
  api: [
    { method: 'POST', path: '/api/v1/handoff/requests', description: '...' }
  ],
  database: [
    { table: 'handoff_requests', columns: [...] }
  ],
  ui: [
    { page: '/handoff', components: [...] }
  ]
}
```

**実装内容**:
- [ ] Markdownパーサー（marked + カスタム拡張）
- [ ] 要件ID抽出（正規表現）
- [ ] Accept条件抽出
- [ ] API仕様抽出
- [ ] DB設計抽出
- [ ] UI要件抽出

---

### Task 1-2: タスク種別判定ロジック
**工数**: 1日

```javascript
function classifyTask(ssotData) {
  const indicators = {
    api: ssotData.api.length > 0,
    database: ssotData.database.length > 0,
    ui: ssotData.ui.length > 0
  };
  
  if (indicators.api && indicators.ui) return 'fullstack';
  if (indicators.ui) return 'ui-only';
  if (indicators.api) return 'api-only';
  return 'logic';
}
```

**実装内容**:
- [ ] API/DB/UI判定
- [ ] Claude Code / Codex 振り分け
- [ ] Full Stack時の分割ポイント特定

---

### Task 1-3: プロンプトテンプレート設計
**工数**: 2日

**テンプレート種別**:
- [ ] `backend-api.template.md` - API実装用
- [ ] `backend-db.template.md` - DB/Prisma用
- [ ] `frontend-page.template.md` - ページ実装用
- [ ] `frontend-component.template.md` - コンポーネント用
- [ ] `fullstack.template.md` - 統合用

**テンプレート構造**:
```markdown
## 必読SSOT
{{SSOT_PATH}}

## 実装対象
{{REQUIREMENTS_LIST}}

## Item 1: {{STEP_NAME}}
### Step 1: {{ACTION}}
{{INSTRUCTIONS}}

### 完了条件
{{ACCEPT_CONDITIONS}}

## Evidence取得
{{EVIDENCE_INSTRUCTIONS}}
```

---

### Task 1-4: プロンプト生成スクリプト
**工数**: 2日

```javascript
// scripts/prompt-generator/generate-prompt.cjs
async function generatePrompt(taskId, ssotPath) {
  // 1. SSOT読み込み・解析
  const ssotData = await parseSSOT(ssotPath);
  
  // 2. タスク種別判定
  const taskType = classifyTask(ssotData);
  
  // 3. テンプレート選択
  const templates = selectTemplates(taskType);
  
  // 4. プロンプト生成
  const prompts = templates.map(t => 
    applyTemplate(t, ssotData)
  );
  
  // 5. 保存
  await savePrompts(taskId, prompts);
  
  return prompts;
}
```

**実装内容**:
- [ ] CLIインターフェース
- [ ] テンプレートエンジン
- [ ] 変数展開
- [ ] 出力ファイル管理

---

## 🔍 Phase 2: プロンプト監査（優先度：高）

**目標**: 3つのLLMでプロンプト品質を検証

### Task 2-1: 監査プロンプト設計
**工数**: 1日

```javascript
const AUDIT_PROMPTS = {
  ssotCompliance: `
    以下のプロンプトがSSOTに準拠しているか検証してください。
    
    ## SSOT
    {{SSOT_CONTENT}}
    
    ## 生成されたプロンプト
    {{PROMPT_CONTENT}}
    
    ## チェック項目
    - [ ] 全ての要件IDが含まれているか
    - [ ] Accept条件が明確か
    - [ ] ファイルパスが実在するか
    ...
  `,
  security: `...`,
  uxOps: `...`
};
```

---

### Task 2-2: マルチLLM監査エンジン
**工数**: 2日

```javascript
async function auditPrompt(prompt, ssot) {
  const auditors = [
    { name: 'SSOT Compliance', model: 'claude-opus', prompt: AUDIT_PROMPTS.ssotCompliance },
    { name: 'Security', model: 'gpt-4o', prompt: AUDIT_PROMPTS.security },
    { name: 'UX/Ops', model: 'claude-sonnet', prompt: AUDIT_PROMPTS.uxOps }
  ];
  
  const results = await Promise.all(
    auditors.map(a => runAudit(a, prompt, ssot))
  );
  
  return aggregateResults(results);
}
```

---

### Task 2-3: 監査スコア計算ロジック
**工数**: 1日

```javascript
function calculateAuditScore(results) {
  const weights = {
    ssotCompliance: 0.5,  // 50%
    security: 0.3,        // 30%
    uxOps: 0.2            // 20%
  };
  
  let totalScore = 0;
  for (const [key, result] of Object.entries(results)) {
    totalScore += result.score * weights[key];
  }
  
  return {
    score: Math.round(totalScore),
    passed: totalScore >= 80,
    details: results
  };
}
```

---

### Task 2-4: 自動修正ループ
**工数**: 2日

```javascript
async function auditAndFixLoop(prompt, ssot, maxIterations = 3) {
  let currentPrompt = prompt;
  let iteration = 0;
  
  while (iteration < maxIterations) {
    const auditResult = await auditPrompt(currentPrompt, ssot);
    
    if (auditResult.passed) {
      return { success: true, prompt: currentPrompt, iterations: iteration };
    }
    
    // 修正
    currentPrompt = await fixPrompt(currentPrompt, auditResult);
    iteration++;
  }
  
  // 3回失敗 → 人間エスカレーション
  return { success: false, prompt: currentPrompt, requiresHumanReview: true };
}
```

---

## 🔧 Phase 3: 実装自動化（優先度：高）

**目標**: Claude Code / Codex で自動実装

### Task 3-1: Claude Code連携（ヘッドレスモード）
**工数**: 2日

**重要**: Claude Codeは**ヘッドレスモード**で自動化実行可能

```bash
# ヘッドレスモード（自動化向け）
claude -p "プロンプト内容" --print --output-format json

# ファイルからプロンプト読み込み
claude -p "$(cat prompts/DEV-0171/implementation.md)" --print

# 作業ディレクトリ指定
cd /path/to/project && claude -p "$(cat prompt.md)" --print
```

```javascript
const { execSync, spawn } = require('child_process');
const path = require('path');

async function runClaudeCode(promptPath, workingDir, options = {}) {
  const prompt = fs.readFileSync(promptPath, 'utf-8');
  
  // ヘッドレスモードで実行
  const result = execSync(
    `claude -p "${prompt.replace(/"/g, '\\"')}" --print --output-format json`,
    {
      cwd: workingDir,
      encoding: 'utf-8',
      timeout: options.timeout || 600000, // 10分
      maxBuffer: 50 * 1024 * 1024 // 50MB
    }
  );
  
  return JSON.parse(result);
}

// ストリーミング版（長時間タスク用）
async function runClaudeCodeStream(promptPath, workingDir, onOutput) {
  const prompt = fs.readFileSync(promptPath, 'utf-8');
  
  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['-p', prompt, '--print'], {
      cwd: workingDir,
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
      onOutput?.(data.toString());
    });
    
    proc.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`Claude Code exited with code ${code}`));
    });
  });
}
```

**実装内容**:
- [ ] ヘッドレスモード呼び出し
- [ ] プロンプトエスケープ処理
- [ ] ストリーミング出力対応
- [ ] タイムアウト管理（10分デフォルト）
- [ ] エラーハンドリング
- [ ] 出力パース（JSON/テキスト）

---

### Task 3-2: Codex連携（UI用）
**工数**: 2日

```javascript
async function runCodex(promptPath, workingDir, designSystem) {
  const OpenAI = require('openai');
  const client = new OpenAI();
  
  const prompt = fs.readFileSync(promptPath, 'utf-8');
  
  // Codex API呼び出し
  const response = await client.chat.completions.create({
    model: 'gpt-4o',  // Codex相当
    messages: [
      { role: 'system', content: CODEX_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    tools: [{ type: 'code_interpreter' }]
  });
  
  return parseCodexOutput(response);
}
```

---

### Task 3-3: タスク振り分けオーケストレーター
**工数**: 2日

```javascript
async function executeImplementation(taskId, prompts) {
  const results = {};
  
  for (const prompt of prompts) {
    if (prompt.target === 'backend') {
      results.backend = await runClaudeCode(
        prompt.path,
        './hotel-common-rebuild'
      );
    } else if (prompt.target === 'frontend') {
      results.frontend = await runCodex(
        prompt.path,
        './hotel-saas-rebuild',
        { framework: 'vue', ui: 'vuetify' }
      );
    }
  }
  
  return results;
}
```

---

### Task 3-4: 実装監査エンジン
**工数**: 2日

```javascript
async function auditImplementation(changedFiles, ssot) {
  const auditors = [
    { name: 'SSOT Compliance', focus: 'requirement_coverage' },
    { name: 'Security', focus: 'vulnerabilities' },
    { name: 'Best Practice', focus: 'code_quality' }
  ];
  
  // 変更ファイルを読み込んで監査
  const fileContents = await readChangedFiles(changedFiles);
  
  return Promise.all(
    auditors.map(a => runCodeAudit(a, fileContents, ssot))
  );
}
```

---

## 🧪 Phase 4: テスト自動化（優先度：中）

### Task 4-1: 標準テスト拡張
**工数**: 1日

**既存**:
- `test-standard-admin.sh` ✅
- `test-standard-guest.sh` ✅

**追加**:
- [ ] `test-standard-integration.sh`
- [ ] `test-standard-e2e.sh`

---

### Task 4-2: ビジュアルリグレッションテスト
**工数**: 2日

```javascript
// Playwright + pixelmatch
async function runVisualTests(config) {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  
  for (const page of config.pages) {
    for (const viewport of config.viewports) {
      const screenshot = await captureScreenshot(browser, page, viewport);
      const baseline = loadBaseline(page, viewport);
      
      if (baseline) {
        const diff = compareImages(baseline, screenshot);
        if (diff > config.threshold) {
          reportVisualDiff(page, viewport, diff);
        }
      } else {
        saveAsBaseline(page, viewport, screenshot);
      }
    }
  }
}
```

---

### Task 4-3: テスト結果レポーター
**工数**: 1日

```javascript
function generateTestReport(results) {
  return {
    summary: {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length
    },
    details: results,
    evidence: {
      screenshots: results.flatMap(r => r.screenshots || []),
      logs: results.flatMap(r => r.logs || [])
    }
  };
}
```

---

## 🚀 Phase 5: CI/CD連携（優先度：中）

### Task 5-1: PR自動作成
**工数**: 1日

```javascript
async function createPR(taskId, changes) {
  const { execSync } = require('child_process');
  
  // ブランチ作成
  execSync(`git checkout -b feat/${taskId}`);
  
  // コミット
  execSync(`git add -A`);
  execSync(`git commit -m "feat(${taskId}): Auto-generated implementation"`);
  
  // PR作成
  const prUrl = execSync(`
    gh pr create \
      --title "[${taskId}] Auto-generated" \
      --body-file ${generatePRBody(taskId, changes)}
  `);
  
  return prUrl;
}
```

---

### Task 5-2: CI結果監視
**工数**: 1日

```javascript
async function waitForCI(prNumber, timeout = 600) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout * 1000) {
    const status = await getCheckStatus(prNumber);
    
    if (status === 'success') return { passed: true };
    if (status === 'failure') return { passed: false, logs: await getCILogs(prNumber) };
    
    await sleep(30000); // 30秒待機
  }
  
  return { passed: false, timeout: true };
}
```

---

### Task 5-3: 自動マージ判定
**工数**: 1日

```javascript
async function autoMerge(prNumber, conditions) {
  const pr = await getPRDetails(prNumber);
  
  const canMerge = 
    pr.ciPassed &&
    pr.auditScore >= conditions.minAuditScore &&
    pr.testCoverage >= conditions.minCoverage &&
    !pr.hasSecurityIssues;
  
  if (canMerge) {
    await mergePR(prNumber, { method: 'squash' });
    return { merged: true };
  } else {
    await requestHumanReview(prNumber);
    return { merged: false, reason: 'Conditions not met' };
  }
}
```

---

### Task 5-4: Plane自動更新
**工数**: 0.5日

```javascript
async function updatePlaneStatus(taskId, result) {
  const planeApi = require('./plane-api-client');
  
  if (result.merged) {
    await planeApi.updateIssue(taskId, {
      state: 'Done',
      comment: generateCompletionComment(result)
    });
  } else if (result.requiresHumanReview) {
    await planeApi.updateIssue(taskId, {
      state: 'In Review',
      comment: generateReviewComment(result)
    });
  }
}
```

---

## 📊 全タスクサマリー

### 工数一覧

| Phase | タスク | 工数 | 優先度 |
|:------|:-------|:-----|:-------|
| **Phase 1** | SSOT解析エンジン | 2日 | 🔴 最高 |
| | タスク種別判定 | 1日 | 🔴 最高 |
| | プロンプトテンプレート | 2日 | 🔴 最高 |
| | プロンプト生成スクリプト | 2日 | 🔴 最高 |
| **Phase 2** | 監査プロンプト設計 | 1日 | 🟠 高 |
| | マルチLLM監査エンジン | 2日 | 🟠 高 |
| | 監査スコア計算 | 1日 | 🟠 高 |
| | 自動修正ループ | 2日 | 🟠 高 |
| **Phase 3** | Claude Code連携 | 2日 | 🟠 高 |
| | Codex連携 | 2日 | 🟠 高 |
| | オーケストレーター | 2日 | 🟠 高 |
| | 実装監査エンジン | 2日 | 🟠 高 |
| **Phase 4** | 標準テスト拡張 | 1日 | 🟡 中 |
| | ビジュアルテスト | 2日 | 🟡 中 |
| | テストレポーター | 1日 | 🟡 中 |
| **Phase 5** | PR自動作成 | 1日 | 🟡 中 |
| | CI結果監視 | 1日 | 🟡 中 |
| | 自動マージ判定 | 1日 | 🟡 中 |
| | Plane自動更新 | 0.5日 | 🟡 中 |
| **合計** | | **28.5日** | |

---

### 優先順位ロードマップ

```
Week 1-2: Phase 1（プロンプト生成）
  ├ SSOT解析エンジン
  ├ タスク種別判定
  ├ テンプレート設計
  └ 生成スクリプト

Week 3-4: Phase 2（プロンプト監査）
  ├ 監査プロンプト
  ├ マルチLLM監査
  ├ スコア計算
  └ 修正ループ

Week 5-6: Phase 3（実装自動化）
  ├ Claude Code連携
  ├ Codex連携
  ├ オーケストレーター
  └ 実装監査

Week 7-8: Phase 4-5（テスト・CI/CD）
  ├ テスト拡張
  ├ ビジュアルテスト
  ├ PR自動作成
  ├ CI監視
  └ 自動マージ
```

---

### クイックスタート（最小構成）

**2週間で動くものを作る場合**:

| 日 | タスク | 成果物 |
|:---|:-------|:-------|
| 1-2 | SSOT解析エンジン | `parse-ssot.cjs` |
| 3 | タスク種別判定 | `classify-task.cjs` |
| 4-5 | テンプレート設計 | `templates/*.md` |
| 6-7 | プロンプト生成 | `generate-prompt.cjs` |
| 8-9 | 監査エンジン（簡易版） | `audit-prompt.cjs` |
| 10-11 | Claude Code連携 | `run-claude-code.cjs` |
| 12-13 | 統合テスト | 動作確認 |
| 14 | ドキュメント整備 | README更新 |

---

## 次のアクション

1. **今すぐ**: Phase 1-Task 1-1（SSOT解析エンジン）から開始
2. **1週間後**: Phase 1完了、動くデモ
3. **2週間後**: Phase 2完了、監査ループ動作
4. **1ヶ月後**: Phase 3完了、実装自動化
5. **2ヶ月後**: 全Phase完了、完全自動化

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|:-----|:-----------|:---------|
| 2026-01-17 | 1.0.0 | 初版作成 |
