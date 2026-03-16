# タスク自動実行システム

## 📋 概要

Claude Codeに「DEV-0170を実行」と指示するだけで、子タスクを順に実行し、フロー全体を自動でこなすシステム。

**設計書（SSOT）**:
- [SSOT_AUTO_DEV_SYSTEM.md](../../docs/03_ssot/00_foundation/SSOT_AUTO_DEV_SYSTEM.md) - 自動開発システム
- [SSOT_MULTI_LLM_PAIR_PROGRAMMING.md](../../docs/03_ssot/00_foundation/SSOT_MULTI_LLM_PAIR_PROGRAMMING.md) - マルチLLMペアプログラミング

---

## 🚀 クイックスタート（5分で開始）

### Step 1: 前提条件確認

```bash
# Node.js 18以上
node --version

# スクリプト動作確認
node scripts/auto-dev/queue-manager.cjs help
```

### Step 2: 環境変数設定

`.env.mcp` に追加（必要に応じて）:
```bash
# Plane同期用
PLANE_API_KEY=xxxx
PLANE_WORKSPACE_SLUG=xxxx
PLANE_PROJECT_ID=xxxx

# マルチLLM用（オプション）
ANTHROPIC_API_KEY=xxxx
OPENAI_API_KEY=xxxx
GOOGLE_API_KEY=xxxx
```

### Step 3: 統合テスト

```bash
node scripts/auto-dev/test-auto-dev-system.cjs
# → 全17テストがPassすればOK
```

### Step 4: タスク同期・実行

```bash
# Planeからタスク同期
node scripts/auto-dev/sync-plane-to-queue.cjs

# キュー確認
node scripts/auto-dev/queue-manager.cjs list

# Claude.aiに依頼（Maxプラン必須）
# 「scripts/auto-dev/claude-background-runner.md の手順に従って
#   task-queue.json のタスクを処理してください」
```

---

## 🌙 バックグラウンド自動開発

PCを閉じても開発が継続する、SSOTベースの完全自動開発体制。

---

## 🧠 Auto-dev v3（STOP-only / diff-only）

`scripts/auto-dev/run-task-v3.cjs` は、**「止まるのは重大条件だけ」**に寄せた実行器です。
LLMは採点ループではなく、**失敗時の修正パッチ（unified diff）生成**にだけ使います。

### 使い方（親タスク起点）

```bash
# 計画表示（Planeから親→子を解決して一覧表示するだけ）
node scripts/auto-dev/run-task-v3.cjs DEV-0170 --dry-run

# 実行（SSOT→Prompt→diff適用→静的ゲート→標準テスト→PR→Plane Done）
node scripts/auto-dev/run-task-v3.cjs DEV-0170

# STOPした実行を再開
node scripts/auto-dev/run-task-v3.cjs DEV-0170 --resume
```

### 連続実行（SSOTが揃っている前提で次々処理）

PlaneのBacklogから「親タスク（末尾0）」を取り、順に処理します。

```bash
# 連続実行（最大50件、60秒間隔）
node scripts/auto-dev/run-loop-v3.cjs

# 1件だけ実行
node scripts/auto-dev/run-loop-v3.cjs --once

# 上限/間隔を変更
node scripts/auto-dev/run-loop-v3.cjs --max-tasks 200 --sleep-sec 30

# 常時稼働（タスクが無い時も待機し続ける）
node scripts/auto-dev/run-loop-v3.cjs --idle --sleep-sec 60
```

### kanriのPR混入を防ぐ（重要）

v3はデフォルトで **PR作成対象を `common,saas` のみに限定**しています（`hotel-kanri` の差分をPRに混ぜない）。

必要なら環境変数で変更できます：

```bash
# PR作成対象repoを明示（デフォルト: common,saas）
export AUTODEV_V3_PR_REPOS="common,saas"

# 例: kanriもPR対象に含める（推奨しません。kanriがcleanな専用環境の時だけ）
export AUTODEV_V3_PR_REPOS="kanri,common,saas"
```

また、SSOTは事前作成する運用を前提に、v3は **SSOT系サブタスクの実装をスキップ**します（PR汚染防止）。

```bash
# SSOT系サブタスクも実装したい場合（通常は不要）
export AUTODEV_V3_SKIP_SSOT_SUBTASKS=0
```

### Claude Code Web（Max）で“クラウド常時実行”する（推奨）

Claude Code on the web は **Maxユーザーが利用可能**で、セッションがクラウドで継続します（PCを閉じても実行継続）。
公式: `https://code.claude.com/docs/en/claude-code-on-the-web`

#### Step 1: GitHub連携

1. `claude.ai/code` を開く
2. GitHubアカウントを接続
3. Claude GitHub Appを以下のリポジトリにインストール:
   - `hotel-kanri`
   - `hotel-common-rebuild`
   - `hotel-saas-rebuild`

#### Step 2: Environment作成

Environment設定画面で以下を登録:

```bash
# Plane API（必須）
PLANE_API_HOST_URL=https://your-plane-host.com
PLANE_API_KEY=plane_xxxxxxxxxxxxxxxx
PLANE_WORKSPACE_SLUG=co
PLANE_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Discord通知（必須）
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxx/xxxx

# テストはCIに任せる（クラウド環境ではサーバー起動が困難なため）
AUTODEV_V3_SKIP_TESTS=1

# PR対象（kanriを除外）
AUTODEV_V3_PR_REPOS=common,saas

# SSOTサブタスクはスキップ（人間が作成済み前提）
AUTODEV_V3_SKIP_SSOT_SUBTASKS=1

# 依存関係を自動インストール（オプション）
AUTODEV_INSTALL_DEPS=1
```

**Network access**: `Full` に設定（Plane/Discord/GitHub API用）

#### Step 3: セッション開始

SessionStartフック（`.claude/settings.json`）が自動で以下を実行:
- `hotel-common-rebuild` と `hotel-saas-rebuild` をクローン
- 環境変数を永続化

#### Step 4: 実行コマンド

Claude Code Webのセッションで以下を実行:

```bash
# 連続実行（タスクがなくても待機し続ける）
node scripts/auto-dev/run-loop-v3.cjs --idle --sleep-sec 60
```

#### 環境変数一覧

| 変数 | 目的 | デフォルト |
|:-----|:-----|:-----------|
| `AUTODEV_V3_SKIP_TESTS` | 標準テストをスキップ（CIに任せる） | `0`（実行） |
| `AUTODEV_V3_SKIP_SSOT_SUBTASKS` | SSOT系サブタスクをスキップ | `1`（スキップ） |
| `AUTODEV_V3_PR_REPOS` | PR作成対象リポジトリ（カンマ区切り） | `common,saas` |
| `AUTODEV_V3_REQUIRE_SSOT_LINK` | ssot:リンク必須 | `1`（必須） |
| `AUTODEV_KANRI_DIR` | hotel-kanriのパス | カレントディレクトリ |
| `AUTODEV_COMMON_DIR` | hotel-common-rebuildのパス | `../hotel-common-rebuild` |
| `AUTODEV_SAAS_DIR` | hotel-saas-rebuildのパス | `../hotel-saas-rebuild` |
| `AUTODEV_INSTALL_DEPS` | 依存関係を自動インストール | `0` |

ポイント:
- **テストはCIに任せる**（`AUTODEV_V3_SKIP_TESTS=1`）→ PRマージ前にGitHub ActionsのCRUD Verificationでテスト
- **SSOT系サブタスクはスキップ**（デフォルト）→ SSOTは人間が作成し、Planeに `ssot:` を設定しておく運用が安定
- **PR作成対象はデフォルトで `common,saas` のみ**（kanriの差分混入を防止）

### PCを閉じても回す（ローカルサーバーで回す）

**重要**: PCを閉じても動かすには、常時稼働する実行環境が必要です（VPS / 常時稼働Mac 等）。

#### 方法A: 自分のサーバー（VPS/常時稼働Mac）で `claude` + `tmux`

1) サーバーに `git`, `node`, `gh`, `claude` を導入  
2) `hotel-kanri` / `hotel-common-rebuild` / `hotel-saas-rebuild` をクローン  
3) `.env.mcp` をサーバーに配置（Plane/GitHub/Discord等。ファイルはgitignoreのまま）  
4) `tmux` で `run-loop-v3.cjs` を起動し、デタッチ

```bash
tmux new -s auto-dev
cd /Users/kaneko/hotel-kanri
node scripts/auto-dev/run-loop-v3.cjs --max-tasks 999999 --sleep-sec 60
# detach: Ctrl+b → d
```

#### 方法B: Claude.ai Background（GitHub連携）

Claude.ai側は「リポジトリ編集＋PR作成」をバックグラウンドで継続できます。  
ただし **Plane連携やローカル統合テスト（server起動が必要なテスト）は、Secrets/実行環境の制約で別途設計**が必要です。

### STOP条件（例外対応のみ人間が見る）

- **SSOT不在**（親SSOTが特定できない）
- **作業ツリーがdirty**（common/saas）
- **git apply不能**（パッチ適用不能）
- **禁止パターン検出**（any / tenant fallback / saas Prisma / saas $fetch直 / routing違反 など）
- **build失敗**（`npm run build`）
- **標準テストFAIL**（`test-standard-*.sh` がリトライ上限）

STOP時はDiscordに「止まった理由・次の一手・resumeコマンド」を通知し、`state.json` とログを保存します。

### Evidence（保存場所）

実行ログは `evidence/auto-dev/v3/<TASK_ID>/<RUN_ID>/` に出力されます。

- `state.json`: STOP/RESUME用の状態（stage、PR URL、テストログ、失敗理由など）
- `events.jsonl`: 時系列イベントログ（ダッシュボード用）
- `prompts/`: 生成されたサブタスクプロンプト
- `patches/`: 適用したunified diff
- `gates/`: 静的ゲート結果（forbidden/build等）
- `tests/`: 標準テストのログ

### 注意（推奨運用）

- v3は **common/saasの作業ツリーがclean** であることを前提にします（汚れていたらSTOP）
- テスト前提（server起動/デバイス認証seed等）が未成立の場合はSTOPします
- 長時間回す場合は **常時稼働環境（Claude.ai Background / self-hosted runner / VPS / 常時稼働Mac）** に載せて運用してください

### タスクキュー管理

```bash
# 1. Planeからタスクを同期
node scripts/auto-dev/sync-plane-to-queue.cjs

# 2. キュー確認
node scripts/auto-dev/queue-manager.cjs list

# 3. Claude.ai に以下を依頼
#    「scripts/auto-dev/claude-background-runner.md の手順に従って
#     task-queue.json のタスクを処理してください」
```

### タスクキュー管理

```bash
# タスク追加（SSOT必須）
node queue-manager.cjs add DEV-0175 --ssot docs/03_ssot/01_admin_features/SSOT_XXX.md

# キュー一覧
node queue-manager.cjs list

# 次のタスク確認
node queue-manager.cjs next

# タスク処理開始
node queue-manager.cjs start DEV-0175

# タスク完了
node queue-manager.cjs complete DEV-0175 --prUrl https://github.com/xxx/pr/123

# Planeから同期
node sync-plane-to-queue.cjs
```

### 品質ゲート（統一基準）

| チェック | 合格基準 | リトライ | 未達時 |
|:---------|:---------|:---------|:-------|
| SSOT監査 | 95点以上 | 最大3回 | 自動修正 |
| プロンプト監査 | 95点以上 | 最大3回 | 自動修正 |
| テスト | 100% Pass | 最大3回 | 自動修正 |
| CI品質ゲート | All Pass | 最大3回 | 自動修正 |

**注意**: 3回修正しても基準未達の場合、人間にエスカレートされます。

### CI失敗時の自動修正

1. CI失敗 → PRにコメント自動追加
2. Claude.aiが失敗を検知
3. 自動修正 → コミット → 再テスト
4. 3回失敗 → 人間にエスカレート（`needs-human-review`ラベル）

### マルチLLMペアプログラミング

複数LLMを組み合わせて品質を向上:

#### 方法1: APIベース（スクリプト内でAPI呼び出し）

```bash
# 並列コードレビュー（GPT-4o + Gemini）
node multi-llm-pair-programming.cjs review src/routes/xxx.ts --ssot docs/03_ssot/...

# マルチLLM SSOT監査（Claude + GPT-4o + Gemini 投票）
node multi-llm-pair-programming.cjs audit docs/03_ssot/... src/routes/xxx.ts

# ペアプログラミング生成（Claude + GPT-4o）
node multi-llm-pair-programming.cjs generate docs/03_ssot/...
```

#### 方法2: CLIベース（claude + codex コマンド）

```bash
# フル ペアプログラミング フロー
./pair-program-cli.sh full docs/03_ssot/01_admin_features/SSOT_XXX.md

# 既存コードをレビュー
./pair-program-cli.sh review src/routes/xxx.ts docs/03_ssot/.../SSOT_XXX.md

# 3ラウンド反復改善
./pair-program-cli.sh iterate src/routes/xxx.ts 3

# CLIツール確認
./pair-program-cli.sh check
```

#### 比較

| 方法 | LLM構成 | 特徴 |
|:-----|:--------|:-----|
| **APIベース** | Claude + GPT-4o + Gemini | 並列実行、投票方式、コスト計算 |
| **CLIベース** | claude + codex コマンド | リアルタイム対話、コンテキスト継続 |

| 機能 | LLM構成 | 判定基準 |
|:-----|:--------|:---------|
| 並列レビュー | GPT-4o + Gemini | 85点以上 |
| SSOT監査 | Claude + GPT-4o + Gemini | 3中2以上Pass |
| ペアプログラミング | Claude(Driver) + GPT-4o(Navigator) | - |

### 関連ファイル

- `task-queue.json` - タスクキュー
- `queue-manager.cjs` - キュー管理スクリプト
- `sync-plane-to-queue.cjs` - Plane同期
- `claude-background-runner.md` - Claude.ai用実行プロンプト
- `multi-llm-pair-programming.cjs` - マルチLLMペアプログラミング
- `notify-discord.cjs` - Discord通知
- `dashboard/server.cjs` - Webダッシュボード
- `.github/workflows/auto-fix-notification.yml` - CI失敗通知

---

## 📢 Discord通知（v2.2.0）

タスク状態やエラーをDiscordに自動通知。

### 通知タイプ

| タイプ | 説明 |
|:-------|:-----|
| `task_start` | タスク開始 |
| `task_complete` | タスク完了（PR URL付き） |
| `ssot_missing` | SSOT未定義（手動作成が必要） |
| `human_required` | 人間の介入が必要 |
| `error` | エラー発生 |

### 設定

`.env.mcp` に追加：

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxxxx/yyyyy
```

### テスト

```bash
node scripts/auto-dev/notify-discord.cjs --test
```

---

## 📊 Webダッシュボード（v2.2.0）

タスク・SSOT・実装状態を一目で確認。

### 起動

```bash
node scripts/auto-dev/dashboard/server.cjs
# ブラウザで http://localhost:3500 を開く
```

### 表示内容

- **タスク一覧**: Planeのタスク（状態、SSOT有無）
- **リポジトリ状態**: hotel-common, hotel-saasの最新コミット、未コミット変更
- **タスクキュー**: 待機中・完了・失敗のタスク数
- **最新ログ**: 実行ログの履歴

---

## 🔄 実行フロー（v2.0.0）

```
DEV-0170を実行
    ↓
┌─────────────────────────────────────────────────────────┐
│ 1. 親タスク情報取得（Plane API）                        │
│ 2. 子タスク一覧取得                                     │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ 各子タスクについて繰り返し:                             │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ a. タスクをIn Progressに                            │ │
│ │ b. SSOT確認                                         │ │
│ │    └→ 未存在なら Claude Codeで生成                  │ │
│ │ c. SSOT監査（マルチLLM）                             │ │
│ │    ├→ Gemini + GPT-4o 並列実行                     │ │
│ │    ├→ AND合成（両方Passのみ合格）                  │ │
│ │    └→ スコア95未満なら修正ループ                   │ │
│ │ d. 修正ループ（最大3回）                            │ │
│ │    └→ Claude Codeで修正 → GPT-4oで再監査           │ │
│ │ e. プロンプト生成                                   │ │
│ │ f. プロンプト監査                                   │ │
│ │    └→ 80点未満なら自動補強                         │ │
│ │ g. 実装（ハイブリッドCLI: Cursor Agent優先）        │ │
│ │ h. テスト実行                                       │ │
│ │    └→ 失敗なら修正（Cursor Agent優先）→再テスト    │ │
│ │ i. PR作成                                           │ │
│ │ j. タスクをDoneに                                   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│ 3. 全子タスク完了なら親タスクもDone                     │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 使い方

### 基本コマンド

```bash
# タスク実行
node scripts/auto-dev/run-task.cjs DEV-0170

# ドライラン（実際の変更なし）
node scripts/auto-dev/run-task.cjs DEV-0170 --dry-run
```

### Claude Codeから実行

```bash
claude
```

起動後：
```
DEV-0170を実行してください。
scripts/auto-dev/run-task.cjs を使用します。
```

または：
```
以下のコマンドを実行してください:
node scripts/auto-dev/run-task.cjs DEV-0170
```

---

## 📊 自動リトライ（統一: 最大3回）

| 状況 | リトライ回数 | 動作 |
|:-----|:-------------|:-----|
| SSOT未存在 | 1回 | Claude Codeで生成→監査へ |
| SSOT監査スコア < 95 | 最大3回 | Claude Codeで修正→マルチLLM再監査 |
| プロンプト監査スコア < 95 | 最大3回 | Claude Codeで修正→再監査 |
| テスト失敗 | 最大3回 | Claude Codeで修正→再テスト |
| リトライ上限到達 | - | 停止して人間にエスカレート |

---

## 📁 出力

### ログ

```
evidence/auto-dev/logs/DEV-0170-2026-01-21T...json
```

### 内容

```json
{
  "taskId": "DEV-0170",
  "startTime": "2026-01-21T...",
  "endTime": "2026-01-21T...",
  "logs": [
    { "timestamp": "...", "level": "step", "message": "サブタスク開始: DEV-0172" },
    { "timestamp": "...", "level": "success", "message": "監査スコア: 85/100" },
    ...
  ]
}
```

---

## ⚙️ 設定

`run-task.cjs`の`CONFIG`で調整可能：

```javascript
const CONFIG = {
  maxRetries: 3,              // 最大リトライ回数
  auditPassScore: 95,         // SSOT監査合格スコア（95点以上）
  promptAuditPassScore: 80,   // プロンプト監査合格スコア
  evidenceDir: '...',         // Evidence保存先
  logsDir: '...',             // ログ保存先
  ssotDir: '...'              // SSOT保存先
};

// 監査モデル: Gemini + GPT-4o（AND合成）
// - 両モデルがPassした項目のみ合格
// - 最も厳格な品質担保
```

---

## 🔀 ハイブリッドCLI（v2.1.0）

Claude CLI（無制限）とCursor Agent CLI（クレジット制）を使い分け、コスト効率と品質を両立。

### 役割分担

| タスク種別 | 使用CLI | 理由 |
|:-----------|:--------|:-----|
| SSOT生成 | Claude | 長文・複雑な構造化 |
| SSOT監査 | Claude | 品質判断・減点理由分析 |
| プロンプト生成 | Claude | 詳細な指示作成 |
| **実装** | **Cursor Agent** | .cursorrules認識、IDE統合 |
| **テスト修正** | **Cursor Agent** | 軽量・高速 |
| 複雑なバグ修正 | Claude | 深い分析が必要 |

### セットアップ

```bash
# 1. Cursor Agent CLIインストール（初回のみ）
curl https://cursor.com/install -fsS | bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 2. ログイン
agent login

# 3. 動作確認
agent status
```

### 作業ディレクトリ自動判定

タスク名から適切なリポジトリを自動選択：

| キーワード | 作業ディレクトリ |
|:-----------|:-----------------|
| API, backend, routes, common | hotel-common-rebuild |
| UI, frontend, page, 画面 | hotel-saas-rebuild |
| SSOT, 設計, 仕様, 整理 | hotel-kanri |

### Full Stack実装

タスク名に「実装」「MVP」「機能」などが含まれる場合、**両方のリポジトリで順次実行**：

```
1. hotel-common-rebuild → API実装
2. hotel-saas-rebuild → フロントエンド実装
```

### 自動フォールバック

Cursor Agent未ログイン時は自動的にClaude CLIにフォールバックします。

---

## 🔧 依存

- Node.js 18+
- Claude Code CLI（認証済み）
- Cursor Agent CLI（オプション、ログイン推奨）
- OpenAI API Key（.env.mcp）
- Plane API（.env.mcp）
- gh CLI（認証済み）

---

## 🚨 注意事項

1. **Claude Code認証**
   - 事前に`claude`コマンドで認証を済ませておく

2. **Git状態**
   - 未コミットの変更がない状態で実行推奨

3. **API制限**
   - OpenAI APIのRate Limitに注意
   - 大量のタスクを連続実行する場合は間隔を空ける

4. **エラー時**
   - ログを確認して手動で対応
   - 途中から再開する場合は完了済みタスクをスキップ

---

## 📚 関連

### 設計書（SSOT）
- [SSOT_AUTO_DEV_SYSTEM.md](../../docs/03_ssot/00_foundation/SSOT_AUTO_DEV_SYSTEM.md) - 自動開発システム全体
- [SSOT_MULTI_LLM_PAIR_PROGRAMMING.md](../../docs/03_ssot/00_foundation/SSOT_MULTI_LLM_PAIR_PROGRAMMING.md) - マルチLLMペアプログラミング

### 関連スクリプト
- [SSOT監査システム](../ssot-audit/README.md)
- [プロンプト生成](../prompt-generator/README.md)
- [Plane API](../plane/README_PLANE_API.md)### 実行プロンプト
- [claude-background-runner.md](./claude-background-runner.md) - Claude.ai用バックグラウンド実行プロンプト