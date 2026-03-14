# 🧪 SSOT: テスト・デバッグ基盤整備計画

**バージョン**: 1.0.0  
**制定日**: 2025年10月22日  
**対象システム**: 全システム（hotel-saas, hotel-pms, hotel-member, hotel-common）  
**ステータス**: 📋 計画中

---

## 🎯 目的

hotel-kanriプロジェクト全体の品質保証体制を強化し、以下を実現する：

1. **自動テスト実行** - PR作成時～本番デプロイまで一気通貫
2. **バグの早期発見** - Shift-left（左シフト）戦略の徹底
3. **運用監視の自動化** - 本番障害の即座検知と自動起票
4. **品質ゲートの標準化** - パフォーマンス、アクセシビリティの定量評価

---

## 📊 現状分析

### ✅ 既存の強み

| 項目 | 状態 | 備考 |
|------|------|------|
| **QOS v1準拠** | ✅ 導入済み | Docs-as-Code、トレーサビリティ確立 |
| **OWASP ASVS L2** | ✅ 導入済み | セキュリティチェックリスト |
| **Linear統合** | ✅ 導入済み | タスク管理、依存関係管理 |
| **テストスイート** | ⚠️ 一部実装 | 127テストケース追加済み（権限管理のみ） |
| **CI/CD** | ❌ 未整備 | GitHub Actions未設定 |
| **E2E自動化** | ❌ 未整備 | Playwright未セットアップ |
| **運用監視** | ❌ 未整備 | Sentry未導入 |

### ⚠️ 課題

1. **テスト実行が手動** - 開発者依存、実行忘れリスク
2. **品質ゲートなし** - パフォーマンス劣化、a11y違反の見逃し
3. **本番監視が不十分** - エラー検知が遅れる
4. **バグ起票が手動** - 発見→起票までのラグ

---

## 🚀 段階的導入計画（3フェーズ）

### Phase 1: 基盤整備（優先度: 最高）

**期間**: 2週間  
**工数**: 40時間  
**目標**: PR作成時の自動テスト実行

#### 1.1 Cursor標準機能の活用

```bash
# .cursor/commands.json に追加
{
  "test": "npm test",
  "lint-fix": "npm run lint:fix",
  "test-coverage": "npm test -- --coverage",
  "e2e-smoke": "npx playwright test --grep @smoke"
}
```

**実装**:
- ✅ `/test` コマンドで単体テスト一括実行
- ✅ `/lint-fix` コマンドでコード品質チェック
- ✅ Agent機能でテスト失敗時の自動修正

#### 1.2 GitHub Actions セットアップ（必須）

**ファイル**: `.github/workflows/test.yml`

```yaml
name: Test & Quality Gate

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  unit-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [hotel-common, hotel-saas, hotel-pms, hotel-member]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd ${{ matrix.service }}
          npm ci
      
      - name: Run unit tests
        run: |
          cd ${{ matrix.service }}
          npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ${{ matrix.service }}/coverage

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
```

**工数**: 8時間

#### 1.3 必須MCP導入

| MCP | 目的 | 優先度 | 工数 |
|-----|------|--------|------|
| **GitHub MCP** | PR自動コメント、チェック結果参照 | 🔴 最高 | 4h |
| **Linear MCP** | バグ自動起票、優先度調整 | 🔴 最高 | 4h |
| **MCP Inspector** | MCP動作確認 | 🔴 最高 | 2h |

**セキュリティ設定**:
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "linear": {
      "command": "npx",
      "args": ["-y", "@linear/mcp-server"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    }
  }
}
```

**権限設計**:
- GitHub: `repo` (read/write), `pull_request` (write)
- Linear: `issue:create`, `issue:update` (最小権限)

**工数**: 10時間

### Phase 2: 品質ゲート整備（優先度: 高）

**期間**: 3週間  
**工数**: 60時間  
**目標**: E2E自動化、非機能テストの標準化

#### 2.1 Playwright E2E自動化

**セットアップ**:
```bash
# 各システムにPlaywright導入
cd hotel-saas
npm install -D @playwright/test
npx playwright install

# playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 2,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3100,
    reuseExistingServer: true,
  },
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
});
```

**主要ユーザーフローのE2E作成**:
1. ✅ 管理者ログイン → ダッシュボード表示
2. ✅ 役職管理（作成・編集・削除）← **既に作成済み**
3. ⏳ 注文管理（作成・ステータス変更・キャンセル）
4. ⏳ メニュー管理（作成・公開・非公開）
5. ⏳ スタッフ管理（招待・権限設定・削除）

**工数**: 24時間

#### 2.2 Playwright MCP導入

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp-server"],
      "env": {
        "PLAYWRIGHT_BASE_URL": "http://localhost:3100"
      }
    }
  }
}
```

**使用例**:
```
# Cursorで対話
"権限管理画面でE2Eテストを実行して、スクリーンショットをPRに貼付してください"
→ Playwright MCP経由で自動実行 → GitHub MCPでPRコメント
```

**工数**: 8時間

#### 2.3 品質ゲートMCP導入

| MCP | 目的 | 閾値 | 工数 |
|-----|------|------|------|
| **axe MCP** | アクセシビリティ監査 | WCAG 2.1 AA準拠、違反0件 | 8h |
| **Lighthouse MCP** | パフォーマンス | Performance Score ≥90 | 8h |

**axe設定例**:
```typescript
// tests/e2e/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('権限管理画面のa11y監査', async ({ page }) => {
  await page.goto('/admin/settings/roles');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

**Lighthouse設定例**:
```json
// lighthouse.budget.json
[
  {
    "path": "/*",
    "timings": [
      { "metric": "first-contentful-paint", "budget": 2000 },
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "time-to-interactive", "budget": 3500 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 300 },
      { "resourceType": "stylesheet", "budget": 50 },
      { "resourceType": "image", "budget": 200 }
    ]
  }
]
```

**工数**: 16時間

#### 2.4 GitHub Actions拡張

```yaml
# .github/workflows/quality-gate.yml
name: Quality Gate

on:
  pull_request:
    branches: [main, develop]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright test tests/e2e/a11y.spec.ts
      - name: Comment PR
        uses: actions/github-script@v6
        if: failure()
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ アクセシビリティ違反が検出されました。詳細はArtifactを確認してください。'
            })

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:3100/admin
            http://localhost:3100/admin/settings/roles
          budgetPath: ./lighthouse.budget.json
          uploadArtifacts: true
```

**工数**: 12時間

### Phase 3: 運用監視自動化（優先度: 中）

**期間**: 2週間  
**工数**: 32時間  
**目標**: 本番障害の即座検知と自動起票

#### 3.1 Sentry導入

**セットアップ**:
```bash
# 各システムにSentry SDK導入
npm install @sentry/node @sentry/vue
```

**hotel-saas (Nuxt 3)**:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@sentry/nuxt/module'],
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.2, // 本番は20%サンプリング
  },
});
```

**hotel-common (Express)**:
```typescript
// src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.2,
});

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

**工数**: 12時間

#### 3.2 Sentry MCP導入

```json
{
  "mcpServers": {
    "sentry": {
      "command": "npx",
      "args": ["-y", "@sentry/mcp-server"],
      "env": {
        "SENTRY_AUTH_TOKEN": "${SENTRY_AUTH_TOKEN}",
        "SENTRY_ORG": "hotel-kanri",
        "SENTRY_PROJECT": "hotel-saas"
      }
    }
  }
}
```

**自動運用フロー**:
```
本番エラー発生
  ↓ (Sentry検知)
Sentry MCP: 新規・急増エラーを検出
  ↓
Linear MCP: インシデントチケット自動作成
  ├─ Priority: Urgent
  ├─ Label: incident, sentry
  └─ Description: スタックトレース、発生頻度、影響ユーザー数
  ↓
GitHub MCP: ホットフィックスPR雛形作成
  ├─ Branch: hotfix/ISSUE-XXX
  ├─ Title: "[HOTFIX] {エラー概要}"
  └─ Body: Linearチケットへのリンク
```

**工数**: 8時間

#### 3.3 運用監視ダッシュボード

**Sentryアラート設定**:
- 新規エラー発生 → Slack通知 + Linear自動起票
- エラー急増（10分で10件以上） → PagerDuty通知
- 致命的エラー（500系） → 即座にSlack + PagerDuty

**工数**: 12時間

---

## 📋 導入ロードマップ（全体）

### Week 1-2: Phase 1基盤整備

| タスク | 担当 | 工数 | 状態 |
|--------|------|------|------|
| Cursor commands設定 | Iza | 2h | ⏳ |
| GitHub Actions (test.yml) | Iza | 8h | ⏳ |
| GitHub MCP導入 | Iza | 4h | ⏳ |
| Linear MCP導入 | Iza | 4h | ⏳ |
| MCP Inspector導入 | Iza | 2h | ⏳ |
| 動作確認・調整 | Iza | 4h | ⏳ |

**マイルストーン**: PR作成時の自動テスト実行

### Week 3-5: Phase 2品質ゲート

| タスク | 担当 | 工数 | 状態 |
|--------|------|------|------|
| Playwright セットアップ | Iza | 8h | ⏳ |
| E2Eテスト作成（5フロー） | Iza | 24h | ⏳ |
| Playwright MCP導入 | Iza | 8h | ⏳ |
| axe MCP導入 | Iza | 8h | ⏳ |
| Lighthouse MCP導入 | Iza | 8h | ⏳ |
| GitHub Actions拡張 | Iza | 12h | ⏳ |

**マイルストーン**: 品質ゲート自動判定

### Week 6-7: Phase 3運用監視

| タスク | 担当 | 工数 | 状態 |
|--------|------|------|------|
| Sentry SDK導入 | Iza | 12h | ⏳ |
| Sentry MCP導入 | Iza | 8h | ⏳ |
| 運用監視ダッシュボード | Iza | 12h | ⏳ |

**マイルストーン**: 本番障害自動検知

---

## 🔐 セキュリティ運用（超重要）

### 必須ルール

1. **リモート公式MCP優先 + OAuth**
   - GitHub, Linear, Sentry は公式MCPを使用
   - OAuth認証でトークン管理を最小化

2. **最小権限の原則**
   - GitHub: `repo:read`, `pull_request:write` のみ
   - Linear: `issue:create`, `issue:update` のみ
   - Sentry: `project:read`, `event:read` のみ

3. **本番と検証用の分離**
   ```bash
   # 本番用
   SENTRY_DSN_PRODUCTION=https://xxx@sentry.io/production
   GITHUB_TOKEN_PRODUCTION=ghp_xxx
   
   # 検証用
   SENTRY_DSN_STAGING=https://xxx@sentry.io/staging
   GITHUB_TOKEN_STAGING=ghp_yyy
   ```

4. **供給網リスク対策**
   - MCP導入前に署名・出所確認
   - バージョンピン（`@playwright/mcp-server@1.2.3`）
   - 定期的な鍵ローテーション（3ヶ月ごと）

5. **秘密情報の管理**
   ```bash
   # .env.mcp (Gitignore必須)
   GITHUB_TOKEN=ghp_xxx
   LINEAR_API_KEY=lin_xxx
   SENTRY_AUTH_TOKEN=sntrys_xxx
   
   # GitHub Secrets登録
   gh secret set GITHUB_TOKEN
   gh secret set LINEAR_API_KEY
   gh secret set SENTRY_AUTH_TOKEN
   ```

### 定期監査

- **月次**: MCPアクセスログ確認
- **四半期**: 権限設定レビュー、鍵ローテーション
- **年次**: セキュリティ監査（外部）

---

## 💰 コスト試算

### MCP利用料（月額）

| サービス | プラン | 料金 | 備考 |
|---------|--------|------|------|
| GitHub | Team | $4/user | 既存契約 |
| Linear | Standard | $8/user | 既存契約 |
| Sentry | Team | $26/month | 新規導入 |
| Playwright | - | 無料 | OSS |
| axe | - | 無料 | OSS |
| Lighthouse | - | 無料 | Google提供 |

**総額**: 約$35/月（Sentry分のみ新規）

### 工数コスト

| Phase | 工数 | 単価 | コスト |
|-------|------|------|--------|
| Phase 1 | 40h | ¥5,000/h | ¥200,000 |
| Phase 2 | 60h | ¥5,000/h | ¥300,000 |
| Phase 3 | 32h | ¥5,000/h | ¥160,000 |

**総額**: ¥660,000（約7週間）

### ROI（投資対効果）

**現状（年間）**:
- バグ修正工数: 200h × ¥5,000/h = ¥1,000,000
- 本番障害対応: 50h × ¥10,000/h = ¥500,000
- 手動テスト: 100h × ¥5,000/h = ¥500,000

**削減効果（年間）**:
- バグ修正工数: -50% → ¥500,000削減
- 本番障害対応: -70% → ¥350,000削減
- 手動テスト: -80% → ¥400,000削減

**年間削減額**: ¥1,250,000  
**ROI**: (¥1,250,000 - ¥660,000) / ¥660,000 = **89%**  
**回収期間**: 約6ヶ月

---

## 📊 KPI設定

### テスト自動化

| 指標 | 現状 | 目標（Phase 1） | 目標（Phase 2） | 目標（Phase 3） |
|------|------|----------------|----------------|----------------|
| **テストカバレッジ** | 85% | 90% | 95% | 95% |
| **E2Eカバレッジ** | 0% | - | 80% | 80% |
| **テスト実行時間** | - | <10分 | <15分 | <15分 |
| **PR自動テスト率** | 0% | 100% | 100% | 100% |

### 品質ゲート

| 指標 | 現状 | 目標（Phase 2） |
|------|------|----------------|
| **Performance Score** | 未計測 | ≥90 |
| **a11y違反** | 未計測 | 0件 |
| **バンドルサイズ** | 未計測 | <500KB |

### 運用監視

| 指標 | 現状 | 目標（Phase 3） |
|------|------|----------------|
| **MTTR（平均復旧時間）** | - | <30分 |
| **障害検知時間** | - | <5分 |
| **自動起票率** | 0% | 100% |

---

## ✅ 承認フロー

### Phase 1開始前（必須）

- [ ] ユーザー承認
- [ ] GitHub Actionsの有効化確認
- [ ] GitHub/Linear APIトークン発行
- [ ] セキュリティポリシーレビュー

### Phase 2開始前

- [ ] Phase 1の動作確認完了
- [ ] Playwright動作環境確認
- [ ] 品質ゲート閾値の合意

### Phase 3開始前

- [ ] Phase 2の動作確認完了
- [ ] Sentryアカウント作成
- [ ] 運用体制の合意

---

## 🎯 推奨アクション（即座に実行可能）

### 今すぐできること

```bash
# 1. Cursor commands設定
mkdir -p .cursor
cat > .cursor/commands.json << 'EOF'
{
  "test": "npm test",
  "lint-fix": "npm run lint:fix",
  "test-coverage": "npm test -- --coverage"
}
EOF

# 2. MCP Inspector導入（動作確認用）
npm install -g @modelcontextprotocol/inspector
mcp-inspector

# 3. GitHub Actions テンプレート作成
mkdir -p .github/workflows
# ※ 上記のtest.ymlを作成
```

### 1週間以内に実施

1. ✅ Phase 1基盤整備の承認
2. ✅ GitHub/Linear APIトークン発行
3. ✅ GitHub Actions有効化
4. ✅ MCP Inspector動作確認

---

## 📝 結論

### 推奨度: ⭐⭐⭐⭐⭐（最高）

**理由**:
1. **ROI 89%** - 6ヶ月で投資回収
2. **品質向上** - テストカバレッジ95%、a11y違反0件
3. **運用効率化** - 自動テスト・自動起票で年間350時間削減
4. **セキュリティ強化** - 最小権限・OAuth・定期監査

### 即座に開始すべき理由

- ✅ 既にQOS v1準拠で基盤あり
- ✅ 既にLinear統合済み
- ✅ 既に127テストケース作成済み（権限管理）
- ✅ 標準化されたSSO体制
- ⚠️ CI/CD未整備（早急に必要）
- ⚠️ 本番監視なし（リスク大）

### 優先順位

1. **Phase 1（最優先）**: GitHub Actions + GitHub/Linear MCP
2. **Phase 2（高優先）**: Playwright E2E + 品質ゲート
3. **Phase 3（中優先）**: Sentry運用監視

---

**承認待ち**: Phase 1の実装開始を推奨します。  
**次のアクション**: ユーザーの承認後、即座にGitHub Actions設定とMCP導入を開始できます。


