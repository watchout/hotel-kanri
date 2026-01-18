# AI駆動開発パイプライン - 短期実装計画

**作成日**: 2026-01-17  
**期間**: 2週間（10営業日）  
**目標**: SSOT → 実装プロンプト → Claude Code実行まで自動化

---

## 📊 全体スケジュール

```
Week 1: プロンプト自動生成
├── Day 1-2: SSOT解析エンジン
├── Day 3: タスク種別判定
├── Day 4-5: プロンプトテンプレート + 生成

Week 2: 監査 + 実装自動化
├── Day 6-7: プロンプト監査（3 LLM）
├── Day 8-9: Claude Code連携
└── Day 10: 統合テスト + ドキュメント
```

---

## 🎯 Day 1-2: SSOT解析エンジン

### 概要

| 項目 | 内容 |
|:-----|:-----|
| **目的** | SSOTファイルを構造化データに変換 |
| **方法** | ルールベース（正規表現）+ LLM補助 |
| **使用LLM** | Claude Sonnet（曖昧部分の解釈） |
| **成果物** | `scripts/prompt-generator/parse-ssot.cjs` |

### 入力/出力

```
入力: SSOT_GUEST_AI_HANDOFF.md（Markdownファイル）
      ↓
出力: {
        id: 'SSOT_GUEST_AI_HANDOFF',
        requirements: [...],
        api: [...],
        database: [...],
        ui: [...]
      }
```

### 抽出対象

| セクション | 抽出方法 | LLM使用 |
|:-----------|:---------|:-------:|
| 要件ID（HDF-001等） | 正規表現 `/[A-Z]{2,4}-\d{3}/g` | ❌ |
| Accept条件 | 正規表現 + 箇条書き解析 | ❌ |
| API仕様 | 表形式解析 | ❌ |
| DBスキーマ | コードブロック抽出 | ❌ |
| 曖昧な記述 | LLMで構造化 | ✅ |

### 実装コード（スケルトン）

```javascript
// scripts/prompt-generator/parse-ssot.cjs

const fs = require('fs');
const path = require('path');

// 正規表現パターン
const PATTERNS = {
  requirementId: /([A-Z]{2,4}-\d{3})/g,
  accept: /- Accept:?\s*\n((?:\s+- .+\n?)+)/gm,
  apiTable: /\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`?([^|`]+)`?\s*\|/g,
  codeBlock: /```(\w+)?\n([\s\S]+?)```/g
};

async function parseSSOT(ssotPath) {
  const content = fs.readFileSync(ssotPath, 'utf-8');
  
  return {
    id: extractId(content),
    requirements: extractRequirements(content),
    api: extractApiSpecs(content),
    database: extractDatabaseSchema(content),
    ui: extractUIRequirements(content),
    raw: content
  };
}

function extractRequirements(content) {
  const requirements = [];
  // 正規表現で要件IDを抽出
  // Accept条件を紐付け
  return requirements;
}

// ... 他の抽出関数

module.exports = { parseSSOT };
```

### テスト

```bash
# 実行
node scripts/prompt-generator/parse-ssot.cjs \
  docs/03_ssot/02_guest_features/ai_chat/SSOT_GUEST_AI_HANDOFF.md

# 期待出力
{
  "id": "SSOT_GUEST_AI_HANDOFF",
  "requirements": [
    { "id": "HDF-001", "name": "ハンドオフリクエスト作成", "accept": [...] }
  ],
  ...
}
```

---

## 🎯 Day 3: タスク種別判定

### 概要

| 項目 | 内容 |
|:-----|:-----|
| **目的** | タスクをAPI/UI/Full Stackに分類 |
| **方法** | ルールベース（キーワード判定） |
| **使用LLM** | なし |
| **成果物** | `scripts/prompt-generator/classify-task.cjs` |

### 分類ロジック

```javascript
// scripts/prompt-generator/classify-task.cjs

function classifyTask(parsedSSOT) {
  const indicators = {
    hasApi: parsedSSOT.api.length > 0,
    hasDatabase: parsedSSOT.database.length > 0,
    hasUI: parsedSSOT.ui.length > 0 || 
           parsedSSOT.raw.includes('## UI') ||
           parsedSSOT.raw.includes('画面')
  };

  // 分類
  if (indicators.hasApi && indicators.hasUI) {
    return {
      type: 'fullstack',
      agents: ['claude-code', 'codex'],
      splitStrategy: 'backend-frontend'
    };
  }
  
  if (indicators.hasUI && !indicators.hasApi) {
    return {
      type: 'ui-only',
      agents: ['codex'],
      splitStrategy: null
    };
  }
  
  return {
    type: 'api-only',
    agents: ['claude-code'],
    splitStrategy: null
  };
}

module.exports = { classifyTask };
```

### 出力例

```javascript
// API + UI の場合
{
  type: 'fullstack',
  agents: ['claude-code', 'codex'],
  splitStrategy: 'backend-frontend'
}

// APIのみの場合
{
  type: 'api-only',
  agents: ['claude-code'],
  splitStrategy: null
}
```

---

## 🎯 Day 4-5: プロンプトテンプレート + 生成

### 概要

| 項目 | 内容 |
|:-----|:-----|
| **目的** | SSOTからItem/Step構造のプロンプト生成 |
| **方法** | テンプレート + LLM（Item分割） |
| **使用LLM** | Claude Sonnet |
| **成果物** | `scripts/prompt-generator/generate-prompt.cjs` + `templates/` |

### テンプレート構造

```
scripts/prompt-generator/templates/
├── backend-api.template.md      # API実装用
├── backend-db.template.md       # DB/Prisma用
├── frontend-page.template.md    # ページ実装用
├── frontend-component.template.md # コンポーネント用
└── common-sections.template.md  # 共通セクション
```

### backend-api.template.md

```markdown
# {{TASK_ID}}: {{FEATURE_NAME}} - Backend API実装

## 必読SSOT
- {{SSOT_PATH}}

## 実装対象
{{#each requirements}}
- {{id}}: {{name}}
{{/each}}

---

## Item 1: ルートファイル作成

### Step 1: ファイル作成
`hotel-common-rebuild/src/routes/{{routeName}}.routes.ts` を作成

### Step 2: 基本構造
```typescript
import { Router } from 'express';
const router = Router();

// TODO: エンドポイント実装

export default router;
```

### 完了条件
- [ ] ファイルが作成されている
- [ ] ルーター登録されている

---

## Item 2: エンドポイント実装

{{#each api}}
### Step {{@index}}: {{method}} {{path}}
{{description}}

#### 実装
```typescript
router.{{lowercase method}}('{{path}}', async (req, res) => {
  // TODO: 実装
});
```

#### Accept条件
{{#each accept}}
- [ ] {{this}}
{{/each}}
{{/each}}

---

## Evidence取得

```bash
# 動作確認
{{#each api}}
curl -X {{method}} http://localhost:3401{{path}} \
  -H "Content-Type: application/json" \
  -d '{{sampleBody}}'
{{/each}}
```
```

### LLMによるItem分割

```javascript
// generate-prompt.cjs

async function generatePrompt(parsedSSOT, taskType) {
  // Step 1: テンプレート選択
  const template = selectTemplate(taskType);
  
  // Step 2: 基本変数展開
  let prompt = applyTemplate(template, parsedSSOT);
  
  // Step 3: LLMでItem/Step分割を最適化
  const optimizedPrompt = await callClaude(`
    以下のプロンプトを確認し、実装順序を最適化してください。
    依存関係を考慮してItem/Stepを並べ替えてください。
    
    ${prompt}
    
    ## 最適化ルール
    - DB → API → 登録 の順序
    - 依存するファイルは先に作成
    - 各Itemは独立してテスト可能に
  `, 'claude-sonnet-4-20250514');
  
  return optimizedPrompt;
}
```

### 使用するLLM API

| 処理 | モデル | 理由 |
|:-----|:-------|:-----|
| Item分割最適化 | Claude Sonnet | コスト効率 + 十分な精度 |
| 曖昧要件の明確化 | Claude Sonnet | 文脈理解 |

---

## 🎯 Day 6-7: プロンプト監査（3 LLM）

### 概要

| 項目 | 内容 |
|:-----|:-----|
| **目的** | 生成されたプロンプトの品質検証 |
| **方法** | 3つのLLMで多角的監査 |
| **使用LLM** | Claude Opus / GPT-4o / Claude Sonnet |
| **成果物** | `scripts/prompt-generator/audit-prompt.cjs` |

### 監査ペルソナ

| ペルソナ | モデル | 焦点 | コスト/回 |
|:---------|:-------|:-----|:---------|
| **SSOT Auditor** | Claude Opus | SSOT準拠・要件網羅 | $0.15 |
| **Security Auditor** | GPT-4o | セキュリティ・脆弱性 | $0.03 |
| **Ops Auditor** | Claude Sonnet | 実行可能性・運用 | $0.02 |

### 監査プロンプト

```javascript
const AUDIT_PROMPTS = {
  ssotCompliance: `
あなたはSSO準拠監査の専門家です。
以下のプロンプトがSSOTに100%準拠しているか検証してください。

## SSOT
{{SSOT_CONTENT}}

## 生成されたプロンプト
{{PROMPT_CONTENT}}

## チェック項目
1. [ ] 全ての要件ID（{{REQUIREMENT_IDS}}）が含まれている
2. [ ] 全てのAccept条件が含まれている
3. [ ] APIパスがSSOT定義と一致している
4. [ ] DBスキーマがSSOT定義と一致している

## 出力フォーマット（JSON）
{
  "score": 0-100,
  "passed": true/false,
  "issues": [
    { "severity": "high|medium|low", "description": "..." }
  ],
  "suggestions": [...]
}
`,

  security: `
あなたはセキュリティ監査の専門家です。
以下のプロンプトにセキュリティ上の問題がないか検証してください。

## プロンプト
{{PROMPT_CONTENT}}

## チェック項目
1. [ ] 入力検証が指示されている
2. [ ] 認証・認可が適切
3. [ ] SQLインジェクション対策
4. [ ] XSS対策
5. [ ] tenant_id分離

## 出力フォーマット（JSON）
{
  "score": 0-100,
  "passed": true/false,
  "vulnerabilities": [...],
  "recommendations": [...]
}
`,

  ops: `
あなたは運用・実行可能性の監査専門家です。
以下のプロンプトが実際に実行可能か検証してください。

## プロンプト
{{PROMPT_CONTENT}}

## チェック項目
1. [ ] ファイルパスが実在する形式
2. [ ] コマンドが実行可能
3. [ ] 依存関係が明確
4. [ ] エラーハンドリングがある

## 出力フォーマット（JSON）
{
  "score": 0-100,
  "passed": true/false,
  "executability_issues": [...],
  "improvements": [...]
}
`
};
```

### 監査フロー

```javascript
// audit-prompt.cjs

async function auditPrompt(prompt, ssot) {
  // 3つのLLMで並列監査
  const [ssotResult, securityResult, opsResult] = await Promise.all([
    callClaude(AUDIT_PROMPTS.ssotCompliance, 'claude-opus-4-20250514'),
    callGPT4o(AUDIT_PROMPTS.security),
    callClaude(AUDIT_PROMPTS.ops, 'claude-sonnet-4-20250514')
  ]);

  // スコア計算（重み付け）
  const weights = { ssot: 0.5, security: 0.3, ops: 0.2 };
  const totalScore = 
    ssotResult.score * weights.ssot +
    securityResult.score * weights.security +
    opsResult.score * weights.ops;

  return {
    passed: totalScore >= 80,
    score: Math.round(totalScore),
    details: {
      ssot: ssotResult,
      security: securityResult,
      ops: opsResult
    }
  };
}
```

### 自動修正ループ

```javascript
async function auditAndFix(prompt, ssot, maxIterations = 3) {
  let current = prompt;
  
  for (let i = 0; i < maxIterations; i++) {
    const result = await auditPrompt(current, ssot);
    
    if (result.passed) {
      return { success: true, prompt: current, iterations: i };
    }
    
    // 修正
    current = await fixPrompt(current, result.details);
  }
  
  return { success: false, requiresHumanReview: true };
}
```

---

## 🎯 Day 8-9: Claude Code連携

### 概要

| 項目 | 内容 |
|:-----|:-----|
| **目的** | 完成プロンプトをClaude Codeで実行 |
| **方法** | ヘッドレスモード（CLI） |
| **使用LLM** | Claude Code（内部でOpus相当） |
| **成果物** | `scripts/prompt-generator/run-implementation.cjs` |

### 実行フロー

```javascript
// run-implementation.cjs

const { execSync, spawn } = require('child_process');

async function runImplementation(promptPath, workingDir, options = {}) {
  const prompt = fs.readFileSync(promptPath, 'utf-8');
  
  console.log(`🚀 実装開始: ${promptPath}`);
  console.log(`📁 作業ディレクトリ: ${workingDir}`);
  
  try {
    // ヘッドレスモードで実行
    const result = execSync(
      `claude -p "${escapePrompt(prompt)}" --print`,
      {
        cwd: workingDir,
        encoding: 'utf-8',
        timeout: options.timeout || 600000, // 10分
        maxBuffer: 50 * 1024 * 1024,
        env: { ...process.env, CLAUDE_AUTO_APPROVE: 'true' }
      }
    );
    
    return {
      success: true,
      output: result,
      changedFiles: extractChangedFiles(result)
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.stdout || ''
    };
  }
}

function escapePrompt(prompt) {
  // シェル特殊文字をエスケープ
  return prompt
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}
```

### タスク種別による分岐

```javascript
async function executeByTaskType(taskId, prompts, taskType) {
  const results = {};
  
  if (taskType.type === 'fullstack') {
    // Backend (Claude Code)
    results.backend = await runImplementation(
      prompts.backend,
      './hotel-common-rebuild'
    );
    
    // Frontend (Codex/GPT-4o)
    results.frontend = await runCodex(
      prompts.frontend,
      './hotel-saas-rebuild'
    );
    
  } else if (taskType.type === 'api-only') {
    results.backend = await runImplementation(
      prompts.main,
      './hotel-common-rebuild'
    );
    
  } else if (taskType.type === 'ui-only') {
    results.frontend = await runCodex(
      prompts.main,
      './hotel-saas-rebuild'
    );
  }
  
  return results;
}
```

---

## 🎯 Day 10: 統合テスト + ドキュメント

### 統合テスト

```bash
# フルフロー実行
node scripts/prompt-generator/run-full-pipeline.cjs DEV-0171

# 期待される動作:
# 1. SSOT読み込み（既存）
# 2. 解析 → 構造化
# 3. タスク種別判定
# 4. プロンプト生成
# 5. 監査（3 LLM）→ 修正ループ
# 6. Claude Code実行
# 7. 結果出力
```

### 成果物一覧

```
scripts/prompt-generator/
├── parse-ssot.cjs           # SSOT解析
├── classify-task.cjs        # タスク分類
├── generate-prompt.cjs      # プロンプト生成
├── audit-prompt.cjs         # 監査（3 LLM）
├── run-implementation.cjs   # Claude Code実行
├── run-full-pipeline.cjs    # 統合スクリプト
├── templates/
│   ├── backend-api.template.md
│   ├── backend-db.template.md
│   └── frontend-page.template.md
└── lib/
    ├── llm-client.cjs       # LLM API統合クライアント
    └── utils.cjs            # ユーティリティ
```

---

## 📊 LLM使用量サマリー

### 1タスクあたりの使用量

| ステップ | モデル | 呼び出し回数 | コスト/回 | 合計 |
|:---------|:-------|:------------:|:----------|:-----|
| SSOT解析（補助） | Sonnet | 0-1 | $0.02 | $0.02 |
| プロンプト生成 | Sonnet | 1 | $0.03 | $0.03 |
| 監査1（SSOT） | Opus | 1-3 | $0.15 | $0.45 |
| 監査2（Security） | GPT-4o | 1-3 | $0.03 | $0.09 |
| 監査3（Ops） | Sonnet | 1-3 | $0.02 | $0.06 |
| 修正 | Sonnet | 0-2 | $0.03 | $0.06 |
| 実装 | Claude Code | 1 | $1.00 | $1.00 |
| **合計** | | **6-14** | | **$1.71** |

### 月間コスト試算

| タスク数/月 | LLMコスト | 人件費削減 | ROI |
|:------------|:----------|:-----------|:----|
| 50 | $85 (¥12,750) | ¥400,000 | 31x |
| 100 | $171 (¥25,650) | ¥800,000 | 31x |
| 200 | $342 (¥51,300) | ¥1,600,000 | 31x |

---

## 📋 日別チェックリスト

### Week 1

| 日 | タスク | 成果物 | 確認項目 |
|:---|:-------|:-------|:---------|
| 1 | SSOT解析（基本） | parse-ssot.cjs | [ ] 要件ID抽出 |
| 2 | SSOT解析（完成） | parse-ssot.cjs | [ ] API/DB抽出 |
| 3 | タスク分類 | classify-task.cjs | [ ] 3種別判定 |
| 4 | テンプレート | templates/*.md | [ ] 3種類 |
| 5 | プロンプト生成 | generate-prompt.cjs | [ ] LLM連携 |

### Week 2

| 日 | タスク | 成果物 | 確認項目 |
|:---|:-------|:-------|:---------|
| 6 | 監査プロンプト | audit-prompt.cjs | [ ] 3ペルソナ |
| 7 | 修正ループ | audit-prompt.cjs | [ ] 自動修正 |
| 8 | Claude Code連携 | run-implementation.cjs | [ ] ヘッドレス |
| 9 | Codex連携 | run-implementation.cjs | [ ] UI生成 |
| 10 | 統合テスト | run-full-pipeline.cjs | [ ] E2E動作 |

---

## 🚀 即座に開始可能

**Day 1のタスク**:

```bash
# ディレクトリ作成
mkdir -p scripts/prompt-generator/lib
mkdir -p scripts/prompt-generator/templates

# 最初のファイル作成
touch scripts/prompt-generator/parse-ssot.cjs
```

**開始しますか？**
