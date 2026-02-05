# >> claude タグ - Claude Code依頼生成

**バージョン**: 2.0.0
**最終更新**: 2026-01-29

## 概要

`>> claude [サブタスクID]` でClaude Codeへのサブタスク指示を生成します。

**重要**: 
- SSOTは**親タスク単位**で作成（例: DEV-0170）
- 指示は**サブタスク単位**で生成（例: DEV-0171, DEV-0172...）
- 既存の詳細テンプレートを参照しつつ、簡潔な指示を生成

## 使用方法

```
>> claude DEV-0171   # サブタスクごとに指示生成
>> claude DEV-0172
>> claude DEV-0173
>> claude DEV-0174
```

## 参照すべき既存テンプレート

**詳細な実装手順が必要な場合は以下を参照**:
- `/Users/kaneko/hotel-kanri/docs/standards/prompt-templates/FEATURE_IMPLEMENTATION.md` - Full Stack実装
- `/Users/kaneko/hotel-kanri/docs/standards/prompt-templates/UI_IMPLEMENTATION.md` - UI実装のみ
- `/Users/kaneko/hotel-kanri/docs/standards/prompt-templates/COMMON_SECTIONS.md` - 共通セクション

## Claude Code実行手順

### 方法1: Claude Code CLI（推奨）

```bash
# 1. プロジェクトディレクトリに移動
cd /Users/kaneko/hotel-common-rebuild  # または hotel-saas-rebuild

# 2. 指示を一時ファイルに保存
cat > /tmp/claude-task.txt << 'EOF'
[ここに >> claude で生成した指示を貼り付け]
EOF

# 3. Claude Codeで実行
cat /tmp/claude-task.txt | claude --print

# または対話モード（確認しながら進める場合）
claude
# プロンプトに指示を貼り付け
```

### 方法2: Claude Desktop App

1. Claude Desktop App を開く
2. 生成した指示をコピー＆ペースト
3. 実行結果を確認

### 方法3: Claude.ai Web（バックグラウンド実行）

1. https://claude.ai にアクセス
2. GitHubリポジトリを接続
3. 指示を送信
4. バックグラウンドで実行（PCを閉じてもOK）

### 実行時の注意

- **作業ディレクトリ**: タスクに応じて選択
  - API/DB → `hotel-common-rebuild`
  - UI/プロキシ → `hotel-saas-rebuild`
  - ドキュメント → `hotel-kanri`
  
- **Full Stack タスク**: 両方のリポジトリで順番に実行
  1. まず `hotel-common-rebuild` でAPI実装
  2. 次に `hotel-saas-rebuild` でUI/プロキシ実装

## サブタスク指示フォーマット（簡潔版）

**ユーザーが Cursor で境界と受入条件を指示 → Claude Code が実装**

### 必須5要素

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
サブタスク: DEV-XXXX - [タイトル]
親タスク: DEV-YYYY（SSOT参照元）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 目的
[1行で明確に記述]

## 参照SSOT
/Users/kaneko/hotel-kanri/docs/03_ssot/XX/SSOT_XXX.md

## 変更範囲

### システム
- [ ] hotel-common-rebuild（API/DB）
- [ ] hotel-saas-rebuild（UI/プロキシ）
- [ ] hotel-kanri（ドキュメント）

### ファイル
hotel-common-rebuild:
- src/routes/xxx.routes.ts（新規/修正）
- src/services/xxx.service.ts（新規/修正）

hotel-saas-rebuild:
- server/api/v1/admin/xxx.ts（新規/修正）
- pages/admin/xxx.vue（新規/修正）

### エンドポイント
- POST /api/v1/admin/xxx
- GET /api/v1/admin/xxx/:id

### DB変更
- なし / マイグレーション必要

## 禁止事項（CRITICAL）
- ❌ any型の使用
- ❌ tenant_idなしのDBクエリ
- ❌ フォールバック値（|| 'default', ?? 'default'）
- ❌ hotel-saasでのPrisma直接使用
- ❌ hotel-saasでの$fetch直接使用（callHotelCommonAPI必須）
- ❌ 環境分岐（if NODE_ENV === 'development'）

## Accept（受入条件）

### API
- [ ] POST /api/v1/admin/xxx → 201 Created
- [ ] GET /api/v1/admin/xxx/:id → 200 OK with { data: {...} }
- [ ] 認証なし → 401 Unauthorized
- [ ] 他テナント → 404 Not Found

### UI
- [ ] /admin/xxx にアクセスできる
- [ ] フォーム送信が成功する
- [ ] エラー時にトースト表示

### テスト
- [ ] test-standard-admin.sh PASS
- [ ] test-standard-guest.sh PASS（該当する場合）

## Evidence（実装後に必須取得）

### 実行コマンドログ
```bash
# API動作確認
curl -s -c /tmp/cookies.txt -X POST http://localhost:3401/api/v1/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@test.omotenasuai.com","password":"owner123"}'

curl -s -b /tmp/cookies.txt http://localhost:3401/api/v1/admin/xxx | jq .
```

### 保存先
- evidence/DEV-XXXX-part-N-api.log
- evidence/DEV-XXXX-part-N-test.log

## 実装手順（Claude Codeが自律的に決定）

Claude Codeは以下を自律的に実行:
1. SSOTを読み込み、要件を理解
2. 変更範囲のファイルを確認
3. 禁止事項を遵守して実装
4. Accept条件を満たすか自己検証
5. Evidence取得

## 完了報告フォーマット

実装完了後、以下を報告:

```markdown
## DEV-XXXX part N 完了報告

### Accept確認
- [x] POST /api/v1/admin/xxx → 201 Created ✅
- [x] GET /api/v1/admin/xxx/:id → 200 OK ✅
- [x] test-standard-admin.sh PASS ✅

### Evidence
- API: evidence/DEV-XXXX-part-N-api.log
- Test: evidence/DEV-XXXX-part-N-test.log

### 変更ファイル
- hotel-common-rebuild: 3 files
- hotel-saas-rebuild: 2 files

### 次のステップ
Cursorで監査: >> audit DEV-XXXX
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 生成フロー

### Step 1: タスク情報取得

```bash
cd /Users/kaneko/hotel-kanri/scripts/plane
node get-issue-detail.cjs DEV-XXXX
```

### Step 2: SSOT読み込み

タスクに紐づくSSOTを特定し、要件を抽出。

### Step 3: サブタスク分割

大きなタスクは以下のように分割:
- part 1: DB/API基盤
- part 2: ビジネスロジック
- part 3: UI実装
- part 4: テスト＆Evidence

### Step 4: 指示生成

上記テンプレートに沿ってサブタスク指示を生成。

### Step 5: 出力

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Claude Code依頼を生成しました
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

上記をClaude Codeにコピペしてください。

実装完了後:
>> audit DEV-XXXX  # Cursorで監査＆テスト
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## ハッカソンノウハウ

1. **指示は簡潔に、Accept条件は具体的に**
   - 曖昧な指示より、curl期待値を明記

2. **禁止事項を明示**
   - 「やっていいこと」より「やってはいけないこと」を先に

3. **Evidence必須**
   - 「動いた」ではなく「ログが残った」で完了

4. **分割より一括**
   - 小さいタスクは分割せず一括で
   - 大きいタスク（3ファイル以上変更）は分割
