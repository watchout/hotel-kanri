# MCP セットアップガイド

**最終更新**: 2025-10-21  
**対象**: hotel-kanri + 4リポジトリ（saas/common/pms/member）

---

## 🚀 クイックスタート

### Step 1: 環境変数ファイル作成
```bash
cd /Users/kaneko/hotel-kanri
cp .env.mcp.example .env.mcp
```

### Step 2: トークン設定
```bash
vi .env.mcp
```

### Step 3: Cursor再起動

### Step 4: 動作確認
```
/roadmap  → Linear MCPでロードマップ取得
```

---

## 🔑 トークン取得方法

### 1. Linear API Key（既に設定済みの場合）

**確認方法:**
1. https://linear.app/settings/api にアクセス
2. 「Personal API Keys」セクションを確認
3. 既存キーの確認:
   - 「View」ボタンをクリック → キーをコピー
   - または「Create new key」で新規作成

**設定:**
```bash
# .env.mcp に記入
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**権限確認:**
- ✅ Read/Write (Issue, Project, Comment)
- ⚠️ Admin権限は不要（最小権限の原則）

---

### 2. GitHub Token（複数リポジトリ対応）

**取得方法:**
1. https://github.com/settings/tokens にアクセス
2. 「Generate new token」→「Generate new token (classic)」
3. 権限選択:
   - ✅ **repo** (Full control of private repositories)
     - repo:status
     - repo_deployment
     - public_repo
     - repo:invite
4. 「Generate token」をクリック
5. トークンをコピー（**一度しか表示されない**）

**設定:**
```bash
# .env.mcp に記入
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**複数リポジトリの扱い:**
```
✅ GitHub MCPは1つのトークンで全リポジトリにアクセス可能

使用時にリポジトリを指定:
- 「hotel-saasリポジトリにPR作成」
- 「hotel-commonのIssue一覧」
- 「hotel-pmsの最新コミット確認」

対象リポジトリ:
1. kaneko/hotel-kanri   - 統合管理・SSOT
2. kaneko/hotel-saas    - SaaS管理画面
3. kaneko/hotel-common  - API基盤
4. kaneko/hotel-pms     - PMS（フロント業務）
5. kaneko/hotel-member  - 会員システム
```

---

## 📁 ディレクトリ構成

```
/Users/kaneko/
├── hotel-kanri/    ← 現在地（統合管理）
│   ├── .env.mcp    ← トークン設定（全リポジトリ共通）
│   └── mcp.json    ← MCP設定
├── hotel-saas/     ← SaaS管理画面
├── hotel-common/   ← API基盤
├── hotel-pms/      ← PMS
└── hotel-member/   ← 会員システム
```

**重要:**
- `.env.mcp` は `hotel-kanri/` に1つだけ配置
- 全リポジトリで共通のトークンを使用
- filesystem/ripgrep/git は全5ディレクトリにアクセス可能

---

## 🔍 動作確認方法

### Linear MCP
```
ユーザー: /roadmap

AI:
Linear MCP でロードマップ取得中...
（成功すれば Phase別進捗が表示される）
```

### GitHub MCP
```
ユーザー: hotel-saasの最新PR一覧を表示

AI:
GitHub MCP で hotel-saas PR取得中...

## hotel-saas 最新PR
1. PR #45: テナントID欠落バグ修正
   - Status: Open
   - Author: @kaneko
   - Created: 2025-10-20
```

---

## ⚠️ トラブルシューティング

### エラー: "LINEAR_API_KEY is not defined"

**原因:**
- .env.mcp が作成されていない
- トークンが正しく設定されていない

**解決方法:**
```bash
cd /Users/kaneko/hotel-kanri
ls -la .env.mcp  # ファイル存在確認
cat .env.mcp     # 内容確認（トークンが正しいか）
```

---

### エラー: "GitHub authentication failed"

**原因:**
- GITHUB_TOKEN が無効
- 権限不足

**解決方法:**
1. https://github.com/settings/tokens で確認
2. トークンの「repo」権限を確認
3. 必要なら新規トークン作成

---

### GitHub MCPでリポジトリが見つからない

**原因:**
- リポジトリ名の指定ミス
- トークンのアクセス権不足

**正しい指定方法:**
```
❌ 間違い: 「saasのPR」
✅ 正しい: 「hotel-saasリポジトリのPR」

❌ 間違い: 「commonにIssue作成」
✅ 正しい: 「hotel-commonリポジトリにIssue作成」
```

---

## 🔒 セキュリティベストプラクティス

### 1. トークンの保管
```bash
# ✅ 正しい
.env.mcp に記載（.gitignore済み）

# ❌ 間違い
- ソースコードに直接記載
- 公開リポジトリにコミット
- Slackやメールで送信
```

### 2. 最小権限の原則
```
Linear:  Read/Write (Issue, Project, Comment)
         ❌ Admin権限は不要

GitHub:  repo (Full control)
         ❌ delete_repo, admin:org 等は不要
```

### 3. 定期ローテーション
```
推奨: 3ヶ月ごとにトークンを再生成
手順:
1. 新規トークン作成
2. .env.mcp 更新
3. 旧トークン削除
```

### 4. 漏洩時の対応
```
1. 即座にトークンを無効化
   - Linear: https://linear.app/settings/api
   - GitHub: https://github.com/settings/tokens
2. 新規トークン作成
3. .env.mcp 更新
4. Cursor再起動
```

---

## 📊 MCP活用例

### 例1: バグ修正フロー（Linear + GitHub連携）

```
ユーザー: /next

AI:
Linear MCP で次タスク検索中...
推奨: LIN-45 (b1) - テナントID欠落バグ

ユーザー: Task: b1 — /rfv
（Evidence → Plan → 承認）

ユーザー: OK。Diff only
（実装完了）

ユーザー: PR作成して

AI:
GitHub MCP で hotel-saas に PR作成中...
✅ PR #123 作成完了
   https://github.com/kaneko/hotel-saas/pull/123
```

---

### 例2: ロードマップ確認（Linear）

```
ユーザー: /roadmap

AI:
Linear MCP でロードマップ取得中...

## 📊 Roadmap Overview

### Phase 1: 基盤構築
- 進捗: ██████████ 100% (10/10)

### Phase 2: 機能実装
- 進捗: ████░░░░░░ 40% (4/10)
```

---

### 例3: 複数リポジトリの状態確認（GitHub）

```
ユーザー: 全リポジトリの最新コミットを確認

AI:
GitHub MCP で確認中...

## 最新コミット

**hotel-saas**
- `fix: テナントID欠落バグ修正` (2時間前)

**hotel-common**
- `feat: 統一認証基盤追加` (3時間前)

**hotel-pms**
- `refactor: エラーハンドラ共通化` (1日前)
```

---

## 🔗 関連ドキュメント

- **MCP評価レポート**: `.cursor/reference/mcp-evaluation-report.md`
- **コマンドリファレンス**: `.cursor/reference/commands-reference.md`
- **TaskCard利用ガイド**: `.cursor/reference/taskcard-usage-guide.md`
