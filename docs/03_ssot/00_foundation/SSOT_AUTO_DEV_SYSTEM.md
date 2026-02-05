# SSOT: 自動開発システム（Auto Dev System）

**作成日**: 2026-01-27  
**最終更新**: 2026-01-28  
**バージョン**: 1.1.0  
**ステータス**: ✅ 確定  
**優先度**: 🟡 高（開発効率化の基盤）

---

## 📋 このSSOTの目的

**PCを閉じても開発が継続する、SSOTベースの完全自動開発体制を定義する。**

### 解決する課題

1. **開発の中断**: PCを閉じると開発が止まる
2. **品質のブレ**: バイブコーディングで品質が不安定
3. **手動介入の多さ**: CI失敗時の対応が手動

### 提供する価値

- ✅ 24時間365日の自動開発
- ✅ SSOTベースの品質担保
- ✅ マルチLLMによる多角的レビュー
- ✅ CI失敗時の自動修正

---

## 🏗️ システムアーキテクチャ

### 全体フロー

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: タスク発火                                          │
│   Plane Issue → sync-plane-to-queue.cjs → task-queue.json  │
│   または: queue-manager.cjs add → task-queue.json          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: Claude.ai バックグラウンド実行                      │
│   task-queue.json → Claude.ai Max → SSOT読み込み → 実装    │
│   （PCを閉じても継続）                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: マルチLLMペアプログラミング（オプション）            │
│   Claude（Driver）→ Codex（Navigator）→ Claude（修正）     │
│   または: GPT-4o + Gemini 並列レビュー                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: PR作成 → CI品質ゲート                               │
│   PR作成 → Critical Gates → Pass/Fail                       │
│   Fail → auto-fix-notification.yml → Claude.ai修正         │
│   3回失敗 → 人間にエスカレート（needs-human-review）         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: マージ → Plane更新                                  │
│   手動マージ → Plane Issue → Done                           │
└─────────────────────────────────────────────────────────────┘
```

### コンポーネント図

```
scripts/auto-dev/
├── task-queue.json              # タスクキュー（待機/処理中/完了/失敗）
├── queue-manager.cjs            # キュー管理CLI
├── sync-plane-to-queue.cjs      # Plane → キュー同期
├── run-task.cjs                 # タスク実行オーケストレーター
├── notify-discord.cjs           # Discord通知モジュール ★NEW
├── claude-background-runner.md  # Claude.ai用実行プロンプト
├── multi-llm-pair-programming.cjs # APIベースマルチLLM
├── pair-program-cli.sh          # CLIベースペアプログラミング
├── test-auto-dev-system.cjs     # 統合テスト
├── dashboard/server.cjs         # Webダッシュボード ★NEW
└── README.md                    # ドキュメント

.github/workflows/
└── auto-fix-notification.yml    # CI失敗時の自動通知
```

---

## 📦 コンポーネント詳細

### AUTODEV-001: タスクキュー管理

**ファイル**: `task-queue.json`, `queue-manager.cjs`

**目的**: タスクの状態管理（待機→処理中→完了/失敗）

**データ構造**:
```json
{
  "version": "1.0.0",
  "queue": [
    {
      "id": "DEV-0175",
      "priority": 1,
      "status": "pending",
      "ssot": "docs/03_ssot/01_admin_features/SSOT_XXX.md",
      "planeIssueId": "uuid",
      "createdAt": "2026-01-27T00:00:00Z",
      "retryCount": 0
    }
  ],
  "processing": null,
  "completed": [],
  "failed": [],
  "config": {
    "maxRetries": 3,
    "ssotRequired": true,
    "autoPlaneSync": true
  }
}
```

**CLI コマンド**:
```bash
# タスク追加（SSOT必須）
node queue-manager.cjs add DEV-0175 --ssot docs/03_ssot/.../SSOT_XXX.md

# キュー一覧
node queue-manager.cjs list

# 次のタスク確認
node queue-manager.cjs next

# タスク処理開始
node queue-manager.cjs start DEV-0175

# タスク完了
node queue-manager.cjs complete DEV-0175 --prUrl https://github.com/.../pr/123

# タスク失敗
node queue-manager.cjs fail DEV-0175 --reason "CI failed"

# 統計
node queue-manager.cjs stats
```

**Accept条件**:
- ✅ `queue-manager.cjs help` が正常動作
- ✅ `queue-manager.cjs list` がキュー状態を表示
- ✅ SSOT未指定時にエラー
- ✅ 存在しないSSOT指定時にエラー

---

### AUTODEV-002: Plane同期

**ファイル**: `sync-plane-to-queue.cjs`

**目的**: PlaneのBacklogタスクをtask-queue.jsonに自動同期

**処理フロー**:
```
1. Plane APIでBacklog状態のIssueを取得
2. DEV番号（[DEV-XXXX]）を抽出
3. Description内のSSOTパスを抽出
4. SSOT存在確認（なければスキップ）
5. 優先度計算（Phase順 + DEV番号順）
6. task-queue.json に追加
```

**コマンド**:
```bash
# Backlogタスクを同期
node sync-plane-to-queue.cjs

# 確認のみ（実際には同期しない）
node sync-plane-to-queue.cjs --dry-run

# 全タスクを表示
node sync-plane-to-queue.cjs --all
```

**Accept条件**:
- ✅ Backlog状態のIssueのみ同期
- ✅ SSOT未定義のIssueはスキップ（警告表示）
- ✅ 既にキューにあるタスクは重複追加しない
- ✅ 優先度順（Phase → DEV番号）でソート

---

### AUTODEV-003: バックグラウンド実行

**ファイル**: `claude-background-runner.md`

**目的**: Claude.ai Maxのバックグラウンドタスク機能で自動実行

**実行プロンプト**:
```markdown
このリポジトリ（hotel-kanri）に接続し、
scripts/auto-dev/claude-background-runner.md の手順に従って
task-queue.json のタスクを処理してください。
```

**処理ステップ**:
1. タスクキュー確認
2. 次のタスク取得・開始
3. SSOT読み込み（必須）
4. 既存実装調査（15分）
5. ブランチ作成
6. 実装（要件ID順）
7. テスト実行
8. コミット・PR作成
9. タスク完了・次へ

**Accept条件**:
- ✅ SSOT未読で実装しない
- ✅ 要件IDをコード内コメントに記載
- ✅ PR本文にSSOT参照を含む
- ✅ PCを閉じても処理継続

---

### AUTODEV-004: CI失敗検知

**ファイル**: `.github/workflows/auto-fix-notification.yml`

**目的**: CI失敗時にPRにコメントを追加し、自動修正をトリガー

**処理フロー**:
```
CI失敗
  ↓
workflow_run トリガー
  ↓
PR情報取得
  ↓
失敗ジョブのログ取得
  ↓
リトライ回数確認（< 3回）
  ↓
PRにコメント追加
  - 失敗サマリー
  - 修正手順
  - Claude.ai用プロンプト
```

**Accept条件**:
- ✅ CI失敗時にPRコメントが自動追加
- ✅ リトライ回数がコメントに表示
- ✅ 失敗ジョブへのリンクを含む

---

### AUTODEV-005: 自動リトライ

**目的**: CI失敗時に最大3回まで自動修正を試行

**処理フロー**:
```
CI失敗（1回目）
  ↓
PRコメント「🔄 CI修正リクエスト (1/3)」
  ↓
Claude.aiが修正・プッシュ
  ↓
CI再実行
  ↓
成功 → 完了
失敗 → 2回目リトライ
  ↓
（最大3回まで）
```

**Accept条件**:
- ✅ リトライ回数がカウントされる
- ✅ 3回目までリトライ可能
- ✅ 成功時に「✅ CI修正完了」コメント

---

### AUTODEV-006: 人間エスカレート

**目的**: 3回失敗したら人間のレビューを要求

**処理**:
```
3回目失敗
  ↓
PRコメント「⚠️ 人間のレビューが必要です」
  ↓
ラベル「needs-human-review」を追加
```

**Accept条件**:
- ✅ 3回失敗でエスカレートコメント
- ✅ `needs-human-review`ラベルが付与
- ✅ 自動修正が停止

---

### AUTODEV-007: Discord通知システム

**ファイル**: `notify-discord.cjs`

**目的**: 自動開発プロセスの重要イベントをDiscordに通知し、可視性を向上

**通知タイプ**:

| タイプ | 発火条件 | 色 | アイコン |
|:-------|:---------|:---|:---------|
| `task_start` | タスク処理開始時 | 紫 | 🚀 |
| `task_complete` | タスク処理完了時 | 緑 | 🎉 |
| `ssot_missing` | SSOT未定義検出時 | 赤 | 📄❌ |
| `human_required` | 人的対応必要時（監査/テスト失敗） | 黄 | ⚠️ |
| `error` | サブタスク失敗時 | 赤 | 🚨 |
| `info` | 一般情報 | 青 | ℹ️ |

**Webhookメッセージ構造**:
```json
{
  "embeds": [{
    "title": "🚀 タスク開始: DEV-0175",
    "description": "セッションリセット機能の実装を開始します",
    "color": 9823334,
    "fields": [
      { "name": "タスクID", "value": "DEV-0175", "inline": true },
      { "name": "SSOT", "value": "SSOT_XXX.md", "inline": true }
    ],
    "timestamp": "2026-01-28T10:00:00Z"
  }]
}
```

**使用方法**:

```javascript
// モジュールとして使用
const discord = require('./notify-discord.cjs');

// タスク開始通知
await discord.notifyTaskStart('DEV-0175', { ssot: 'SSOT_XXX.md' });

// タスク完了通知
await discord.notifyTaskComplete('DEV-0175', { prUrl: 'https://...' });

// SSOT欠落通知
await discord.notifySSOTMissing('DEV-0175', { taskName: 'セッションリセット' });

// 人的対応要求
await discord.notifyHumanRequired('DEV-0175', { reason: '監査3回失敗' });

// エラー通知
await discord.notifyError('DEV-0175', { step: 'test', error: 'テスト失敗' });
```

```bash
# CLIとして使用（テスト用）
node notify-discord.cjs --type info --title "テスト" --message "テストメッセージ"
```

**run-task.cjs 統合**:

```javascript
// run-task.cjs 内での使用
const discord = require('./notify-discord.cjs');

// タスク開始時
await discord.notifyTaskStart(taskId, { ssot: ssotPath });

// SSOT欠落時（自動生成OFFの場合）
if (!ssotExists && !CONFIG.ssotAutoGenerate) {
  await discord.notifySSOTMissing(taskId, { taskName });
  return; // 処理停止
}

// 品質ゲート失敗時
if (auditScore < 95 && retryCount >= 3) {
  await discord.notifyHumanRequired(taskId, { reason: '監査3回失敗' });
}

// タスク完了時
await discord.notifyTaskComplete(taskId, { prUrl });
```

**Accept条件**:
- ✅ 全通知タイプが正常送信される
- ✅ Webhook未設定時にエラーにならない（警告のみ）
- ✅ 通知にタスクID、タイムスタンプが含まれる
- ✅ run-task.cjs から正常に呼び出せる

---

### AUTODEV-008: Webダッシュボード

**ファイル**: `dashboard/server.cjs`

**目的**: タスク状況、SSOT紐付け、Git履歴、CI状態を一覧表示

**URL**: `http://localhost:3500`

**表示内容**:

| タブ | 内容 |
|:-----|:-----|
| タスク一覧 | DEV番号、状態、SSOT、監査スコア、PR/CI、ログ |
| Git履歴 | 3リポジトリのコミット履歴 |
| PR/CI | PRリスト、CIチェック結果 |
| ログ | 自動開発実行ログ |

**機能**:
- ✅ 完了済みタスク表示切替
- ✅ SSOTリンク（GitHub）
- ✅ PR/CIステータス表示
- ✅ 監査スコア表示
- ✅ タスク名からのSSOT自動推測

**起動方法**:
```bash
node scripts/auto-dev/dashboard/server.cjs
# → http://localhost:3500
```

**Accept条件**:
- ✅ タスク一覧が正常表示
- ✅ SSOTリンクがGitHubで開く
- ✅ 完了済みタスク表示切替が動作
- ✅ Git履歴、PR/CI情報が取得できる

---

### AUTODEV-009: Discord Bot連携（将来対応）

**ステータス**: 🔮 将来対応

**目的**: Discord返信でタスク操作を可能にする

**計画機能**:
```
Discord返信: "continue DEV-0175"
  ↓
Bot → run-task.cjs 再開
  ↓
処理継続 → 通知
```

**想定コマンド**:
| コマンド | 動作 |
|:---------|:-----|
| `continue DEV-XXXX` | タスク処理再開 |
| `skip DEV-XXXX` | タスクスキップ |
| `status` | 現在の処理状況 |
| `queue` | キュー一覧 |

**Accept条件**:
- 🔮 Bot招待・認証が完了
- 🔮 メッセージ受信・解析が動作
- 🔮 run-task.cjs との連携が動作

---

## 🔧 環境要件（Prerequisites）

### 必須

| 要件 | バージョン | 用途 |
|------|-----------|------|
| Node.js | 18+ | スクリプト実行 |
| Claude Max | サブスク | バックグラウンドタスク |
| GitHub | - | リポジトリ・PR管理 |
| Plane | - | タスク管理 |

### オプション（通知・マルチLLM）

| 要件 | 用途 |
|------|------|
| DISCORD_WEBHOOK_URL | Discord通知（推奨） |
| ANTHROPIC_API_KEY | Claude API（監査） |
| OPENAI_API_KEY | GPT-4o（レビュー・監査） |
| GOOGLE_API_KEY | Gemini（レビュー・監査） |
| claude CLI | CLIペアプログラミング |
| codex CLI | CLIペアプログラミング |

---

## 🚀 セットアップ手順

### Step 1: 前提条件確認

```bash
# Node.js バージョン確認
node --version  # 18以上

# スクリプト動作確認
cd /Users/kaneko/hotel-kanri
node scripts/auto-dev/queue-manager.cjs help

# CLIツール確認（オプション）
./scripts/auto-dev/pair-program-cli.sh check
```

### Step 2: 環境変数設定

`.env.mcp` に追加:
```bash
# 必須（Plane同期用）
PLANE_API_KEY=xxxx
PLANE_WORKSPACE_SLUG=xxxx
PLANE_PROJECT_ID=xxxx

# オプション（マルチLLM用）
ANTHROPIC_API_KEY=xxxx
OPENAI_API_KEY=xxxx
GOOGLE_API_KEY=xxxx
```

### Step 3: Plane同期テスト

```bash
# 確認のみ
node scripts/auto-dev/sync-plane-to-queue.cjs --dry-run

# 実際に同期
node scripts/auto-dev/sync-plane-to-queue.cjs

# キュー確認
node scripts/auto-dev/queue-manager.cjs list
```

### Step 4: 統合テスト

```bash
node scripts/auto-dev/test-auto-dev-system.cjs
```

**期待結果**: 全17テストがPass

### Step 5: Claude.aiでバックグラウンド実行

1. Claude.ai（Max プラン）にアクセス
2. GitHubリポジトリ（hotel-kanri）を接続
3. 以下を依頼:

```
scripts/auto-dev/claude-background-runner.md の手順に従って
task-queue.json のタスクを処理してください。
```

4. PCを閉じてもOK
5. PR完成通知を待つ

---

## 📊 運用フロー

### 日常運用

```
1. Planeでタスク作成（Backlog, [DEV-XXXX]形式, SSOT参照必須）
2. Plane同期（自動 or 手動）
   node scripts/auto-dev/sync-plane-to-queue.cjs
3. Claude.aiに依頼
4. PRが作成される（自動）
5. CIが実行される（自動）
6. 失敗時は自動修正（最大3回）
7. 成功したらマージ（手動）
8. Plane更新（自動）
```

### 夜間バッチ

```
1. 夜間にtask-queue.jsonに複数タスクを積む
2. Claude.aiに「全タスクを処理して」と依頼
3. 朝起きたらPRが複数作成されている
4. レビュー・マージ
```

---

## 🛡️ 品質ゲート

### 品質基準（統一）

| チェック | 基準 | リトライ | 未達時の動作 |
|----------|------|----------|-------------|
| SSOT監査 | 95点以上 | 最大3回 | Claude Codeで自動修正 |
| プロンプト監査 | 95点以上 | 最大3回 | Claude Codeで自動修正 |
| テスト | 100% Pass | 最大3回 | Claude Codeで自動修正 |
| CI品質ゲート | All Pass | 最大3回 | PRコメント→自動修正 |

### 自動チェック項目

| チェック | タイミング | 必須 |
|----------|-----------|------|
| SSOT読み込み | 実装前 | Yes |
| 要件ID抽出 | 実装前 | Yes |
| 単体テスト | PR前 | Yes |
| 統合テスト | PR前 | Yes |
| CI品質ゲート | PR後 | Yes |
| マルチLLM監査 | PR前 | No |

### 品質未達時のフロー

```
品質チェック → 未達
    ↓
🔄 自動修正（Claude Code）
    ↓
再チェック → 未達
    ↓
🔄 自動修正（2回目）
    ↓
再チェック → 未達
    ↓
🔄 自動修正（3回目）
    ↓
再チェック → 未達
    ↓
❌ 停止 + 人間にエスカレート
```

### 禁止パターン

```typescript
// ❌ SSOT未読で実装
// ❌ 要件IDなしで実装
// ❌ hotel-saasでPrisma直接使用
// ❌ フォールバック値（|| 'default'）
// ❌ 環境分岐（if NODE_ENV === 'development'）
```

---

## 🔥 トラブルシューティング

### Q: Plane同期でタスクが取得できない

```bash
# Plane APIの動作確認
cd /Users/kaneko/hotel-kanri/scripts/plane
node get-next-task.cjs
```

- 環境変数（PLANE_API_KEY等）を確認
- Plane IssueがBacklog状態か確認
- DEV番号（[DEV-XXXX]）が含まれているか確認

### Q: SSOT未定義でスキップされる

- Plane IssueのDescriptionにSSOTパスを記載
- 形式: `docs/03_ssot/.../SSOT_XXX.md`
- SSOTファイルが実際に存在するか確認

### Q: CI失敗コメントが追加されない

- `auto-fix-notification.yml`のpermissionsを確認
- workflow_runトリガーが正しく設定されているか確認
- PRがopen状態か確認

### Q: 3回失敗してもエスカレートされない

- リトライカウントのコメントパターンを確認
- `needs-human-review`ラベルが存在するか確認

---

## 📋 要件ID一覧

| ID | 要件 | ステータス |
|----|------|-----------|
| AUTODEV-001 | タスクキュー管理 | ✅ 実装済み |
| AUTODEV-002 | Plane同期 | ✅ 実装済み |
| AUTODEV-003 | バックグラウンド実行 | ✅ 実装済み |
| AUTODEV-004 | CI失敗検知 | ✅ 実装済み |
| AUTODEV-005 | 自動リトライ | ✅ 実装済み |
| AUTODEV-006 | 人間エスカレート | ✅ 実装済み |
| AUTODEV-007 | Discord通知システム | ✅ 実装済み |
| AUTODEV-008 | Webダッシュボード | ✅ 実装済み |
| AUTODEV-009 | Discord Bot連携 | 🔮 将来対応 |

---

## 📚 関連ドキュメント

- [SSOT_MULTI_LLM_PAIR_PROGRAMMING.md](./SSOT_MULTI_LLM_PAIR_PROGRAMMING.md) - マルチLLMペアプログラミング
- [auto-dev/README.md](/scripts/auto-dev/README.md) - スクリプトドキュメント
- [claude-background-runner.md](/scripts/auto-dev/claude-background-runner.md) - Claude.ai用プロンプト
- [notify-discord.cjs](/scripts/auto-dev/notify-discord.cjs) - Discord通知モジュール
- [dashboard/server.cjs](/scripts/auto-dev/dashboard/server.cjs) - Webダッシュボード

---

## 📝 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|----------|
| 1.0.0 | 2026-01-27 | 初版作成 |
| 1.1.0 | 2026-01-28 | Discord通知(AUTODEV-007)、Webダッシュボード(AUTODEV-008)追加 |
