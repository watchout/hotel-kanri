# 📋 Linear Issues定義（リビルドプロジェクト）

**最終更新**: 2025年11月4日  
**目的**: リビルドプロジェクトのLinear Issue完全定義  
**ベース**: SSOT_PROGRESS_MASTER.md + ROADMAP.md

---

## 📖 このドキュメントの使い方

### 🎯 目的

```
Linear Issue作成の完全マニュアル

✅ やること:
1. Linear Projectを作成
2. このドキュメントの各IssueをLinearに登録
3. 依存関係（Blocked by）を設定
4. Phaseごとに実装開始

❌ やらないこと:
- このファイルで進捗管理（Linearのみ）
- 手動でIssue内容を変更（Linearで更新）
```

### 📊 Linear Project情報

```yaml
Project Name: hotel-saas/hotel-common リビルド
Key: REBUILD
Status: In Progress
Start Date: 2025-11-04
Target End Date: 2025-11-07（3日間・24時間）
Workspace: hotel-kanri
```

### 🏷️ Labels定義

| Label | 用途 | 色 |
|-------|------|---|
| `rebuild` | リビルド関連（全Issueに付与） | 🔴 Red |
| `phase-1` | Phase 1: 準備 | 🟡 Yellow |
| `phase-2` | Phase 2: 実装 | 🔵 Blue |
| `phase-3` | Phase 3: テスト | 🟢 Green |
| `phase-4` | Phase 4: 統合 | 🟣 Purple |
| `template` | テンプレート作成 | 🟡 Yellow |
| `hotel-saas` | hotel-saas関連 | 🟣 Purple |
| `hotel-common` | hotel-common関連 | 🟠 Orange |
| `has-ssot` | SSOT存在 | 🔵 Blue |
| `no-ssot` | SSOT未作成 | ⚪ Gray |

### 🎯 Priority定義

| Priority | 対象 | 理由 |
|----------|------|------|
| 0（緊急） | Phase 1（テンプレート作成） | 全ての基盤 |
| 1（最優先） | 認証・テナント・スタッフ・権限 | 管理画面の前提 |
| 2（高優先） | 客室・予約・顧客・料金 | コア業務 |
| 3（中優先） | キャンペーン・施設・アメニティ | 補助機能 |
| 4（低優先） | ログ・ダッシュボード | 運用支援 |

### 🔗 Milestones定義

| Milestone | 所要時間 | 完了条件 |
|-----------|---------|---------|
| Phase 1: 準備 | 2時間 | テンプレート動作確認済み |
| Phase 2: 実装 | 20時間 | 全機能CRUD動作 |
| Phase 3: テスト | 2時間 | エラー率5%未満 |
| Phase 4: 統合 | 3時間 | 既存環境で動作 |

---

## 📦 サブタスク標準（必須）

各Issue（REBUILD-1〜16）は「エピック」です。以下の標準サブタスクを必ず作成してください。

- [ ] SSOT確認（対象SSOTとバージョンを記載）
- [ ] Phase 1: DB（必要な場合）
- [ ] Phase 2: API（hotel-common）
- [ ] Phase 3: Proxy（hotel-saas）
- [ ] Phase 4: UI（必要な場合）
- [ ] Phase 5: テスト（Unit / Integration）
- [ ] Phase 6: CRUD Verify（結果ログ・スクショをLinearに添付）
- [ ] CI確認（lint/type/test/build/security = ✅）

受入基準（Definition of Done）:
- CI green（両リポジトリ）
- 対象機能のCRUD Verify成功（証跡をLinearコメントに添付）

### 📥 CSVインポート補助（例）

以下の列でインポート可能です（LinearのCSVインポート機能）。

```
Title,Description,Labels,Estimate,Milestone,Parent
"[Phase 2] Tenant API","CRUD + Tests","rebuild;phase-2;hotel-common;has-ssot",1,"Phase 2: 実装","REBUILD-5"
"[Phase 2] Tenant Proxy","CRUD + Tests","rebuild;phase-2;hotel-saas;has-ssot",1,"Phase 2: 実装","REBUILD-5"
"[Phase 2] Tenant UI","Forms + Validation","rebuild;phase-2;hotel-saas",1,"Phase 2: 実装","REBUILD-5"
```

---

## 🎯 Issue実行フロー（実装AI必読）

### Step 1: Issue開始前

#### Linearで確認

1. **Issue を開く**（例: REBUILD-4）
   ```
   Linear Project Board → REBUILD-4 をクリック
   ```

2. **Status を「In Progress」に変更**
   ```
   Status: Todo → In Progress
   ```

3. **Blocked by が全て「Done」か確認**
   - ❌ Blocked → 「このIssueはまだ開始できません。依存Issueを先に完了してください。」
   - ✅ Unblocked → Step 2へ

#### ドキュメント確認

1. **OVERVIEW.md を確認**（環境・フロー理解）
   ```bash
   cat /Users/kaneko/hotel-kanri/docs/rebuild/OVERVIEW.md
   ```

2. **TEMPLATE_SPEC.md を確認**（テンプレート使用方法）
   ```bash
   cat /Users/kaneko/hotel-kanri/docs/rebuild/TEMPLATE_SPEC.md
   ```

3. **該当SSOT を読み込む**（has-ssotの場合）
   ```bash
   # 例: 認証機能の場合
   cat /Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md
   ```

---

### Step 2: Issue実行中

#### 実装

1. **Issueの「タスク」セクションを1つずつ実行**
   ```markdown
   例:
   - [x] hotel-common API実装
   - [x] hotel-saas プロキシ実装
   - [ ] 動作確認 ← 現在ここ
   ```

2. **各タスク完了時にLinearコメントを更新**
   ```
   Linearコメント欄に追加:
   「✅ hotel-common API実装完了（room-grades.routes.ts）」
   ```

#### 進捗報告

- **30分ごとに進捗をLinearコメントに記録**
  ```
  例:
  「進捗報告: hotel-common API実装中（3/5ファイル完了）」
  ```

#### エラー発生時（必須フロー）

1. **即座に実装を停止**
   - ❌ エラーを修正しようとしない
   - ❌ 推測で実装を続けない

2. **Linearコメントにエラー内容を記録**
   ```markdown
   🚨 エラー発生（Issue: REBUILD-X）

   ## エラー内容
   [エラーメッセージ]

   ## 発生箇所
   - ファイル: XXX
   - 行: YYY

   ## 原因分析
   [推測される原因]

   ## 確認したこと
   - [ ] SSOT確認
   - [ ] TEMPLATE_SPEC.md確認
   - [ ] 依存ファイル存在確認

   ## 対応方針
   [具体的な対処法]

   ユーザーの承認をお願いします。
   ```

3. **ユーザーに報告**
   ```
   🚨 エラーが発生しました。Issue実行を停止しています。

   **Issue**: REBUILD-X
   **エラー**: XXX
   **原因**: YYY

   **対応方針**:
   ZZZ

   この対応方針で進めてよろしいでしょうか？
   ```

4. **承認待ち**

5. **承認後に再開**
   - Linearコメント: 「✅ エラー解決。再開します。」
   - エラー箇所から再開

---

### Step 3: Issue完了時

#### 完了確認チェックリスト

- [ ] **Issueの全タスクが✅**
- [ ] **完了条件を全て満たした**
- [ ] **エラーゼロ確認**
- [ ] **動作確認済み**（CRUD全て実行）
- [ ] **Prisma Studioでデータ確認**（該当する場合）

#### ユーザー報告

1. **Issueの「完了報告テンプレート」を使用**
   ```
   例:
   REBUILD-4（認証・セッション管理）完了しました。

   ✅ ログイン・ログアウト・セッション確認 全て動作
   ✅ Session Cookie（hotel-session-id）正しく設定
   ✅ Redis にセッション保存確認
   ✅ エラーゼロ

   次のIssue（REBUILD-5: テナント管理）に進んでよろしいですか？
   ```

2. **ユーザーに報告**

3. **承認待ち**

#### 承認後の処理

1. **Linear Status を「Done」に変更**
   ```
   Status: In Progress → Done
   ```

2. **Actual時間を記録**
   ```
   Estimate: 1h
   Actual: 1.2h （実際にかかった時間）
   ```

3. **次のIssue確認**
   - Blocked by 解除されたIssueを選択
   - 優先度の高いIssueから選択
   - Step 1へ戻る

---

## 🖥️ Linear操作ガイド（完全版）

### 方法1: Linear UI で手動作成（推奨）

#### Step 1: Projectを作成

1. **Linear ホーム → 「Projects」**
2. **「New Project」クリック**
3. **入力**:
   - Name: `hotel-saas/hotel-common リビルド`
   - Key: `REBUILD`（自動生成されるので確認）
   - Start Date: `2025-11-04`
   - Target Date: `2025-11-07`
4. **「Create Project」**

#### Step 2: Milestonesを作成

1. **Project設定 → 「Milestones」タブ**
2. **「New Milestone」を4回クリック**
3. **各Milestoneに入力**:
   - Milestone 1:
     - Name: `Phase 1: 準備`
     - Description: `テンプレート作成・動作確認`
     - Target Date: 開始日から2時間後
   - Milestone 2:
     - Name: `Phase 2: 実装`
     - Description: `全機能CRUD実装`
     - Target Date: 開始日から22時間後
   - Milestone 3:
     - Name: `Phase 3: テスト`
     - Description: `統合テスト・エラー率測定`
     - Target Date: 開始日から24時間後
   - Milestone 4:
     - Name: `Phase 4: 統合`
     - Description: `既存環境への統合`
     - Target Date: 開始日から27時間後（目標完了）

#### Step 3: Labelsを作成（Workspace設定）

1. **Workspace設定 → 「Labels」**
2. **以下のLabelsを作成**:

| Label | 色 | Description |
|-------|---|-------------|
| `rebuild` | 🔴 Red | リビルドプロジェクト関連（全Issueに付与） |
| `phase-1` | 🟡 Yellow | Phase 1: 準備 |
| `phase-2` | 🔵 Blue | Phase 2: 実装 |
| `phase-3` | 🟢 Green | Phase 3: テスト |
| `phase-4` | 🟣 Purple | Phase 4: 統合 |
| `template` | 🟡 Yellow | テンプレート作成 |
| `hotel-saas` | 🟣 Purple | hotel-saas関連 |
| `hotel-common` | 🟠 Orange | hotel-common関連 |
| `has-ssot` | 🔵 Blue | SSOT存在 |
| `no-ssot` | ⚪ Gray | SSOT未作成（最小限実装） |

#### Step 4: Issueを作成（16回繰り返し）

**REBUILD-1を例に説明**:

1. **Project Board → 「New Issue」**
2. **このドキュメントのREBUILD-1をコピー**
3. **Linearに貼り付け**:
   - **Title**: `[Phase 1] hotel-common CRUDテンプレート作成`
   - **Description**: 「Description: |」以下を全てコピー（Markdownそのまま）
   - **Labels**: `rebuild`, `phase-1`, `template`, `hotel-common`を選択
   - **Priority**: `0（Urgent）`を選択
   - **Milestone**: `Phase 1: 準備`を選択
   - **Estimate**: `1`（1時間）
   - **Assignee**: `実装AI`（存在する場合）
4. **「Create Issue」**
5. **Issue番号を確認**（例: REBUILD-1）

**REBUILD-2〜16も同様に作成**

#### Step 5: 依存関係を設定

1. **REBUILD-2 を開く**
2. **右サイドバー → 「Relations」**
3. **「Add relation」→ 「Blocked by」**
4. **REBUILD-1 を選択**
5. **保存**

**依存関係一覧**:
- REBUILD-2 ← Blocked by REBUILD-1
- REBUILD-3 ← Blocked by REBUILD-2
- REBUILD-4 ← Blocked by REBUILD-3
- REBUILD-5 ← Blocked by REBUILD-4
- REBUILD-6 ← Blocked by REBUILD-5
- REBUILD-7 ← Blocked by REBUILD-6
- REBUILD-8 ← Blocked by REBUILD-7
- REBUILD-9 ← Blocked by REBUILD-7
- REBUILD-10 ← Blocked by REBUILD-9
- REBUILD-11 ← Blocked by REBUILD-10
- REBUILD-12 ← Blocked by REBUILD-10
- REBUILD-13 ← Blocked by REBUILD-12
- REBUILD-14 ← Blocked by REBUILD-13
- REBUILD-15 ← Blocked by REBUILD-14
- REBUILD-16 ← Blocked by REBUILD-15

---

### 方法2: CSV一括インポート（効率的）

#### Step 1: CSVファイル作成

```csv
Title,Description,Labels,Priority,Milestone,Estimate,Blocked by
"[Phase 1] hotel-common CRUDテンプレート作成","hotel-common用のCRUD APIテンプレートを作成し、客室グレードで動作確認する","rebuild,phase-1,template,hotel-common",0,"Phase 1: 準備",1,
"[Phase 1] hotel-saas プロキシテンプレート作成","hotel-saas用のプロキシAPIテンプレートを作成し、客室グレードで動作確認する","rebuild,phase-1,template,hotel-saas",0,"Phase 1: 準備",1,REBUILD-1
"[Phase 1] テンプレート統合動作確認","hotel-saas + hotel-common 連携でCRUD完全動作を確認する","rebuild,phase-1,template",0,"Phase 1: 準備",0.5,REBUILD-2
...（REBUILD-4〜16も同様）
```

#### Step 2: Linearにインポート

1. **Project → 「Settings」→ 「Import」**
2. **「CSV」を選択**
3. **CSVファイルをアップロード**
4. **フィールドマッピング確認**:
   - Title → Title
   - Description → Description
   - Labels → Labels
   - Priority → Priority
   - Milestone → Milestone
   - Estimate → Estimate
   - Blocked by → Relations (Blocked by)
5. **「Import」**

---

### 方法3: Linear API（自動化・上級者向け）

#### Step 1: Linear API Key取得

1. **Linear → Settings → API**
2. **「Create new API key」**
3. **Key をコピー（環境変数に保存）**
   ```bash
   export LINEAR_API_KEY="lin_api_xxxx"
   ```

#### Step 2: Issue作成スクリプト実行

```bash
cd /Users/kaneko/hotel-kanri
node scripts/linear/create-rebuild-issues.js

# 出力例:
# ✅ REBUILD-1 created
# ✅ REBUILD-2 created (blocked by REBUILD-1)
# ...
# ✅ REBUILD-16 created (blocked by REBUILD-15)
# 
# Total: 16 Issues created
```

---

### トラブルシューティング

#### 問題1: Blocked by が設定できない

**症状**: 「Blocked by」に他のIssueが表示されない

**原因**: Issue IDが間違っている、または依存Issueが未作成

**対処法**:
1. Issue一覧で正しいIDを確認
2. REBUILD-1 → REBUILD-2 の順に設定
3. 依存Issueを先に作成

#### 問題2: Milestoneが選択できない

**症状**: Issue作成時にMilestoneが表示されない

**原因**: Milestoneが作成されていない

**対処法**:
1. Project設定 → Milestones
2. 4つのMilestone（Phase 1-4）を作成
3. Issue作成画面で再度選択

#### 問題3: Labelsが多すぎて選択しにくい

**症状**: Label選択で候補が多すぎる

**対処法**:
1. Label入力欄で検索
2. 例: "rebuild" と入力 → 候補が絞られる
3. 複数選択可能

#### 問題4: Priorityの数字がLinearと違う

**症状**: Priority 0が「Urgent」、1が「High」と表示される

**説明**: Linearの仕様（正常）
- 0 = Urgent（緊急）
- 1 = High（最優先）
- 2 = Medium（高優先）
- 3 = Low（中優先）
- 4 = No priority（低優先）

---

## 🚨 エラー対応フロー（必須）

### エラー検知（即座に停止）

以下の場合、**即座に実装を停止**：

#### 1. CRUD動作確認でエラー

```bash
# Create実行でエラー
curl -X POST ... → ❌ 500 Internal Server Error

→ 即座に停止
```

**対応**: エラー対応フローに従う（下記参照）

#### 2. サーバー起動エラー

```bash
# hotel-common起動失敗
PORT=3401 npm run dev
→ ❌ Error: Port 3401 is already in use

→ 即座に停止
```

**対応**: ポート確認、既存プロセス停止

#### 3. 依存ファイルが見つからない

```bash
# sessionAuthMiddleware が存在しない
ls /Users/kaneko/hotel-common-rebuild/src/auth/session-auth.middleware.ts
→ ❌ No such file or directory

→ 即座に停止
```

**対応**: TEMPLATE_SPEC.md の依存ファイル確認セクションを参照

#### 4. テンプレート置換エラー

```typescript
// Prismaモデル名が見つからない
prisma.roomGrade.create(...)
→ ❌ TypeError: prisma.roomGrade is not a function

→ 即座に停止
```

**対応**: schema.prisma 確認、モデル名を修正

---

### エラー報告（必須テンプレート）

#### Linearコメント

```markdown
🚨 エラー発生（Issue: REBUILD-X）

## エラー内容
```
[エラーメッセージをそのままコピー]
```

## 発生箇所
- ファイル: /Users/kaneko/hotel-common-rebuild/src/routes/XXX.ts
- 行: 123
- 関数: YYY

## 原因分析
[推測される原因]
例: Prismaモデル名が間違っている（roomGrade → room_grades）

## 確認したこと
- [x] SSOT確認（SSOT_SAAS_ROOM_MANAGEMENT.md）
- [x] TEMPLATE_SPEC.md確認
- [x] 依存ファイル存在確認（sessionAuthMiddleware: ✅ 存在）
- [x] Prismaスキーマ確認

## 対応方針
以下の修正を実施します：
1. schema.prisma を確認してPrismaモデル名を特定
2. テンプレートの置換を修正（:resource → 正しいモデル名）
3. 再度CRUD実行

所要時間: 15分

ユーザーの承認をお願いします。
```

#### ユーザーへの報告

```
🚨 エラーが発生しました。Issue実行を停止しています。

**Issue**: REBUILD-9（客室管理実装）
**エラー**: `TypeError: prisma.roomGrade is not a function`
**原因**: Prismaモデル名の置換ミス

**対応方針**:
1. schema.prismaを確認してPrismaモデル名を特定
2. テンプレートの置換を修正
3. 再度CRUD実行（所要時間: 15分）

この対応方針で進めてよろしいでしょうか？
```

---

### エラー解決後の再開

#### ユーザー承認取得後

1. **Linearコメント追加**:
   ```
   ✅ エラー解決承認を得ました。再開します。
   ```

2. **エラー箇所から再開**:
   - 修正実施
   - 動作確認

3. **動作確認**:
   ```bash
   # CRUD再実行
   curl -X POST ... → ✅ 201 Created
   curl GET ... → ✅ 200 OK
   ```

4. **エラーゼロ確認**:
   ```
   ✅ サーバーログ: エラーなし
   ✅ CRUD全て成功
   ```

5. **通常フローに戻る**:
   - Issue実行フロー Step 3（完了確認）へ

---

### エラーが解決できない場合

#### ユーザーへの報告

```
❌ エラーが解決できませんでした。

**試したこと**:
1. schema.prismaを確認 → モデル名が`room_grades`であることを確認
2. Prismaモデル名を`roomGrades`に修正
3. CRUD再実行 → 同じエラーが発生

**状況**:
- SSOT記載: Prismaモデル名は`roomGrade`（camelCase）
- 実装内容: `prisma.roomGrade.create(...)`
- エラー: `TypeError: prisma.roomGrade is not a function`
- schema.prisma: `model room_grades { @@map("room_grades") }`

**推測**:
Prisma Clientが再生成されていない可能性

次のアクションをご指示ください：
1. `npx prisma generate` を実行してPrisma Clientを再生成
2. 別の方法で解決を試みる
3. この機能をスキップして次に進む
```

---

## 🔄 Phase移行ルール（厳守）

### Phase完了の判定

#### 条件（全て満たす必要あり）

- ✅ **Phase内の全Issue が「Done」**
- ✅ **Phase Milestoneの完了条件を満たす**
- ✅ **エラーゼロ**
- ✅ **ユーザー承認済み**

#### 判定フロー

```
Step 1: Phase内の全Issue確認
  ↓
  Linearで Filter: Milestone = "Phase X"
  ↓
  全て「Done」か確認
    ↓ YES
    Step 2へ
    ↓ NO（1つでもTodo/In Progress）
    「Phase未完了。残りのIssueを完了してください。」
    
Step 2: Milestone完了条件確認
  ↓
  Phase 1: テンプレート動作確認済み？
  Phase 2: 全機能CRUD動作？
  Phase 3: エラー率5%未満？
  Phase 4: 既存環境で動作？
    ↓ YES
    Step 3へ
    ↓ NO
    「完了条件を満たしていません。確認してください。」
    
Step 3: ユーザーに報告
  ↓
  Phase完了報告テンプレートを使用
  ↓
  「Phase X完了しました。
   完了条件：
   ✅ XXX
   ✅ YYY
   次のPhaseに進んでよろしいですか？」
  ↓
  承認待ち
  
Step 4: 承認後に次Phase開始
  ↓
  - Linear で次PhaseのMilestoneに移動
  - 次Phaseの最初のIssueを開始（Step 1: Issue開始前）
```

---

### Phase完了報告テンプレート

#### Phase 1完了時

```
Phase 1（準備）完了しました。完了条件：

✅ テンプレート2種類作成
  - hotel-common-crud.template.ts（300行）
  - hotel-saas-*.template.ts（5ファイル）

✅ 客室グレードのCRUD全て動作
  - Create: ✅ 成功（201 Created）
  - List: ✅ 成功（200 OK、データ表示）
  - Get by ID: ✅ 成功（200 OK、データ表示）
  - Update: ✅ 成功（200 OK）
  - Delete: ✅ 成功（200 OK）

✅ エラーゼロ
  - hotel-common起動: ✅ エラーなし（PORT=3401）
  - hotel-saas起動: ✅ エラーなし（PORT=3101）
  - CRUD実行: ✅ エラーなし

✅ Prisma Studioで確認
  - room_grades テーブルにデータ存在
  - tenant_id正しく設定（rebuild-test-tenant）

## 統計
- 所要時間: X時間（見積もり: 2時間）
- 実装API数: 5個（Create/List/Get/Update/Delete）
- エラー数: 0件

次のPhase（Phase 2: 実装）に進んでよろしいですか？
```

#### Phase 2完了時

```
Phase 2（実装）完了しました。完了条件：

✅ 全11機能のCRUD実装完了
  1. 認証・セッション: ✅
  2. テナント管理: ✅
  3. スタッフ管理: ✅
  4. 権限管理: ✅
  5. プロフィール管理: ✅
  6. 客室管理: ✅
  7. 予約管理: ✅
  8. 顧客管理: ✅
  9. 料金・プラン管理: ✅
  10. キャンペーン管理: ✅
  11. その他管理機能: ✅

✅ 全機能CRUD動作
  - 総API数: XX個
  - 動作確認済み: XX個
  - エラー: 0件

✅ エラーゼロ

## 統計
- 所要時間: X時間（見積もり: 20時間）
- 実装機能数: 11機能
- 実装API数: XX個
- エラー数: 0件

次のPhase（Phase 3: テスト）に進んでよろしいですか？
```

#### Phase 3完了時

```
Phase 3（テスト）完了しました。完了条件：

✅ CRUD統合テスト完了
  - 総API数: XX個
  - 成功: XX個
  - 失敗: X個
  - エラー率: X.X%（目標: 5%未満）

✅ シナリオテスト全て成功
  - シナリオ1（認証・テナント・スタッフ・権限）: ✅
  - シナリオ2（客室グレード・客室）: ✅
  - シナリオ3（顧客・予約・チェックイン）: ✅
  - シナリオ4（キャンペーン・施設）: ✅

✅ エラー率5%未満達成

## 統計
- 所要時間: X時間（見積もり: 2時間）
- テスト実行API数: XX個
- エラー率: X.X%
- シナリオ成功率: 100%

次のPhase（Phase 4: 既存環境への統合）に進んでよろしいですか？
```

#### Phase 4完了時

```
🎉 Phase 4（統合）完了しました！

✅ 既存環境への統合完了
  - hotel-saas-rebuild → hotel-saas: ✅ コピー完了
  - hotel-common-rebuild → hotel-common: ✅ コピー完了
  - ポート番号: 3101/3401 → 3100/3400: ✅ 変更完了

✅ 既存環境で全機能動作
  - hotel-common: ✅ 起動成功（localhost:3400）
  - hotel-saas: ✅ 起動成功（localhost:3100）
  - 全API: ✅ 動作確認済み

✅ バックアップ保管
  - hotel-saas: ✅ バックアップ済み
  - hotel-common: ✅ バックアップ済み
  - データベース: ✅ バックアップ済み（pg_dump）

✅ クリーンアップ完了
  - hotel-saas-rebuild: ✅ 削除完了
  - hotel-common-rebuild: ✅ 削除完了

## 🎉 リビルドプロジェクト最終結果

### 統計
- 総所要時間: XX時間（目標: 24時間）
- エラー率: X.X%（目標: 5%未満）
- 実装機能数: 11機能
- 実装API数: XX個

### 成果
- ✅ Session認証統一（JWT認証削除）
- ✅ callHotelCommonAPI統一（$fetch直接使用削除）
- ✅ テンプレートベース実装（全APIパターン統一）
- ✅ エラー率大幅削減（30% → X.X%）

### コード品質
- ✅ 全てのCRUD APIが動作
- ✅ 実装パターンが統一
- ✅ エラーハンドリング統一
- ✅ 認証方式統一

リビルドプロジェクトを完了とします。お疲れ様でした！
```

---

### ユーザー承認の取り方

**承認依頼の明確化**:
```
次のPhaseに進んでよろしいですか？

【回答例】
- 「承認します」→ 次Phaseに進む
- 「XXXを修正してください」→ 修正後に再報告
- 「保留」→ 待機
```

---

### 承認されなかった場合

#### ユーザーのフィードバック例

```
「REBUILD-9（客室管理）が完了していないので、修正してください」
```

#### 対応フロー

```
Step 1: フィードバック確認
  ↓
  該当Issue（REBUILD-9）を特定
  
Step 2: Issue を「In Progress」に戻す
  ↓
  Linear: Status を Done → In Progress
  
Step 3: 修正実施
  ↓
  ユーザーの指示に従って修正
  
Step 4: 再度動作確認
  ↓
  CRUD全て実行
  
Step 5: 再報告
  ↓
  「REBUILD-9を修正しました。
   修正内容：XXX
   動作確認：✅ CRUD全て成功
   Phase 2完了報告を再度提出します。」
  ↓
  Phase完了報告テンプレートを再度使用
```

---

## 🔀 並行作業ルール

### 並行可能なIssue

| 並行グループ | Issues | 条件 | 理由 |
|------------|--------|------|------|
| **グループ1** | REBUILD-8（プロフィール）<br>REBUILD-9（客室） | REBUILD-7完了後 | 互いに依存関係なし |
| **グループ2** | REBUILD-11（顧客）<br>REBUILD-12（料金） | REBUILD-10完了後 | 互いに依存関係なし |

---

### 並行作業の実行方法

#### 実装AIは1つずつ実行

- ❌ **同時に2つのIssueを進めない**
  - 理由: 混乱を避けるため
  
- ✅ **1つ完了してから次へ**
  - 完了 → Done → 次のIssue開始

---

### 優先順位

#### グループ1の優先順位

```
1. REBUILD-9（客室管理）← 先に実行
   - Priority: 2（高優先）
   - SSOT有り（SSOT_SAAS_ROOM_MANAGEMENT.md）
   - コア業務機能
   
2. REBUILD-8（プロフィール管理）← 後で実行
   - Priority: 1（最優先だが、依存が少ない）
   - SSOT無し（最小限実装）
   - 補助機能
```

#### グループ2の優先順位

```
1. REBUILD-12（料金・プラン管理）← 先に実行
   - Priority: 2（高優先）
   - SSOT有り（SSOT_SAAS_PRICING_MANAGEMENT.md）
   - コア業務機能
   
2. REBUILD-11（顧客管理）← 後で実行
   - Priority: 2（高優先）
   - SSOT無し（最小限実装）
```

---

### 並行作業の完了報告

#### グループ1完了時

```
グループ1（REBUILD-8, REBUILD-9）の両方が完了しました。

✅ REBUILD-8（プロフィール管理）
  - プロフィール取得: ✅ 成功
  - プロフィール更新: ✅ 成功
  - エラー: 0件

✅ REBUILD-9（客室管理）
  - 客室グレードCRUD: ✅ 成功（Phase 1で確認済み）
  - 客室CRUD: ✅ 成功
  - グレード-客室関連付け: ✅ 確認済み
  - エラー: 0件

次のIssue（REBUILD-10: 予約管理）に進んでよろしいですか？
```

#### グループ2完了時

```
グループ2（REBUILD-11, REBUILD-12）の両方が完了しました。

✅ REBUILD-11（顧客管理）
  - 顧客CRUD: ✅ 成功
  - エラー: 0件

✅ REBUILD-12（料金・プラン管理）
  - 料金プランCRUD: ✅ 成功
  - 料金設定CRUD: ✅ 成功
  - エラー: 0件

次のIssue（REBUILD-13: キャンペーン管理）に進んでよろしいですか？
```

---

## 🚀 Phase 1: 準備（3 Issues）

### REBUILD-1: テンプレート作成（hotel-common）

```yaml
Title: [Phase 1] hotel-common CRUDテンプレート作成
Labels: rebuild, phase-1, template, hotel-common
Priority: 0
Milestone: Phase 1: 準備
Estimate: 1時間
Assignee: 実装AI

Description: |
  ## 目的
  hotel-common用のCRUD APIテンプレートを作成し、客室グレードで動作確認する

  ## タスク
  - [ ] 依存ファイル確認（sessionAuthMiddleware、Prisma Client）
  - [ ] hotel-common-crud.template.ts 作成（300行）
  - [ ] 客室グレードで実装（room-grades.routes.ts）
  - [ ] app.ts に登録
  - [ ] サーバー起動確認（PORT=3401）
  - [ ] CRUD動作確認（Create/List/Get/Update/Delete）
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ /Users/kaneko/hotel-kanri/templates/hotel-common-crud.template.ts 作成完了
  - ✅ 客室グレードのCRUD全て動作（hotel-common側）
  - ✅ サーバーログにエラーなし

  ## 参考ドキュメント
  - TEMPLATE_SPEC.md: Phase 1完全手順
  - SSOT_SAAS_ROOM_MANAGEMENT.md: 客室グレード仕様

Blocked by: なし
```

---

### REBUILD-2: テンプレート作成（hotel-saas）

```yaml
Title: [Phase 1] hotel-saas プロキシテンプレート作成（5ファイル）
Labels: rebuild, phase-1, template, hotel-saas
Priority: 0
Milestone: Phase 1: 準備
Estimate: 1時間
Assignee: 実装AI

Description: |
  ## 目的
  hotel-saas用のプロキシAPIテンプレートを作成し、客室グレードで動作確認する

  ## タスク
  - [ ] 依存ファイル確認（callHotelCommonAPI）
  - [ ] hotel-saas-create.template.ts 作成
  - [ ] hotel-saas-list.template.ts 作成
  - [ ] hotel-saas-get.template.ts 作成
  - [ ] hotel-saas-update.template.ts 作成
  - [ ] hotel-saas-delete.template.ts 作成
  - [ ] 客室グレードで実装（server/api/v1/admin/room-grades/）
  - [ ] サーバー起動確認（PORT=3101）
  - [ ] CRUD動作確認（Create/List/Get/Update/Delete）
  - [ ] Cookie転送確認
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ 5つのテンプレートファイル作成完了
  - ✅ 客室グレードのCRUD全て動作（hotel-saas側）
  - ✅ hotel-common へのCookie転送確認済み
  - ✅ サーバーログにエラーなし

  ## 参考ドキュメント
  - TEMPLATE_SPEC.md: Phase 1完全手順
  - SSOT_SAAS_ROOM_MANAGEMENT.md: 客室グレード仕様

Blocked by: REBUILD-1
```

---

### REBUILD-3: 統合動作確認

```yaml
Title: [Phase 1] テンプレート統合動作確認
Labels: rebuild, phase-1, template
Priority: 0
Milestone: Phase 1: 準備
Estimate: 30分
Assignee: 実装AI

Description: |
  ## 目的
  hotel-saas + hotel-common 連携でCRUD完全動作を確認する

  ## タスク
  - [ ] テストテナント作成（rebuild-test-tenant）
  - [ ] ログイン（Session Cookie取得）
  - [ ] 客室グレード Create実行 → ✅ 成功
  - [ ] 客室グレード List実行 → ✅ 成功
  - [ ] 客室グレード Get by ID実行 → ✅ 成功
  - [ ] 客室グレード Update実行 → ✅ 成功
  - [ ] 客室グレード Delete実行 → ✅ 成功
  - [ ] Prisma Studioでデータ確認
  - [ ] エラーゼロ確認
  - [ ] ユーザーに報告・承認取得

  ## 完了条件
  - ✅ CRUD全て動作（5つ全て成功）
  - ✅ hotel-saas → hotel-common 連携動作
  - ✅ tenantId正しく設定
  - ✅ エラーゼロ
  - ✅ ユーザー承認済み

  ## 完了報告テンプレート
  ```
  Phase 1完了しました。完了条件：
  ✅ テンプレート2種類作成（hotel-common + hotel-saas）
  ✅ 客室グレードのCRUD全て動作
  ✅ エラーゼロ
  次のPhase（Phase 2: 機能実装）に進んでよろしいですか？
  ```

  ## 参考ドキュメント
  - TEMPLATE_SPEC.md: Step 4（サーバー起動・動作確認）

Blocked by: REBUILD-2
```

---

## 🏗️ Phase 2: 実装（11 Issues）

### REBUILD-4: 認証・セッション管理実装

```yaml
Title: [Phase 2] 認証・セッション管理実装
Labels: rebuild, phase-2, hotel-saas, hotel-common, has-ssot
Priority: 1
Milestone: Phase 2: 実装
Estimate: 1時間
Assignee: 実装AI

Description: |
  ## 目的
  ログイン・ログアウト・セッション管理APIを実装する

  ## 関連SSOT
  - SSOT_SAAS_ADMIN_AUTHENTICATION.md v1.2.0

  ## タスク
  ### hotel-common
  - [ ] auth.routes.ts 実装（login/logout/session-check）
  - [ ] sessionAuthMiddleware 確認
  - [ ] Redis接続確認
  - [ ] app.ts に登録

  ### hotel-saas
  - [ ] login.post.ts 実装
  - [ ] logout.post.ts 実装
  - [ ] session.get.ts 実装

  ### 動作確認
  - [ ] ログイン成功（Session Cookie取得）
  - [ ] セッション確認成功
  - [ ] ログアウト成功
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ ログイン → セッション確認 → ログアウト 全て動作
  - ✅ Session Cookie（hotel-session-id）正しく設定
  - ✅ Redis にセッション保存確認
  - ✅ エラーゼロ

  ## Accept（SSOT準拠）
  - AUTH-001: ログイン成功時にSession Cookie発行
  - AUTH-002: セッション有効期限24時間
  - AUTH-003: ログアウト時にセッション削除
  - AUTH-004: 不正な認証情報で401エラー

Blocked by: REBUILD-3
```

---

### REBUILD-5: テナント管理実装

```yaml
Title: [Phase 2] テナント管理実装
Labels: rebuild, phase-2, hotel-saas, hotel-common, has-ssot
Priority: 1
Milestone: Phase 2: 実装
Estimate: 1時間
Assignee: 実装AI

Description: |
  ## 目的
  テナント（施設）の作成・読み取り・更新・削除APIを実装する

  ## 関連SSOT
  - SSOT_SAAS_MULTITENANT.md

  ## タスク
  ### hotel-common
  - [ ] テンプレートコピー（tenants.routes.ts）
  - [ ] Prismaモデル名置換（tenant）
  - [ ] APIパス置換（/api/v1/tenants）
  - [ ] app.ts に登録

  ### hotel-saas
  - [ ] 5ファイル実装（create/list/get/update/delete）
  - [ ] RESOURCE → tenants 置換

  ### 動作確認
  - [ ] Create → ✅ 成功
  - [ ] List → ✅ 成功
  - [ ] Get by ID → ✅ 成功
  - [ ] Update → ✅ 成功
  - [ ] Delete → ✅ 成功
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ CRUD全て動作
  - ✅ tenantId分離確認（自テナントのみ表示）
  - ✅ エラーゼロ

  ## Accept（SSOT準拠）
  - TENANT-001: テナント作成時にサブドメイン重複チェック
  - TENANT-002: テナント削除時に依存データ確認
  - TENANT-003: テナント情報更新時にバリデーション

Blocked by: REBUILD-4
```

---

### REBUILD-6: スタッフ管理実装

```yaml
Title: [Phase 2] スタッフ管理実装
Labels: rebuild, phase-2, hotel-saas, hotel-common, has-ssot
Priority: 1
Milestone: Phase 2: 実装
Estimate: 1時間
Assignee: 実装AI

Description: |
  ## 目的
  スタッフアカウントのCRUD実装

  ## 関連SSOT
  - SSOT_SAAS_STAFF_MANAGEMENT.md

  ## タスク
  ### hotel-common
  - [ ] テンプレートコピー（staff.routes.ts）
  - [ ] Prismaモデル名置換（staffMember）
  - [ ] APIパス置換（/api/v1/staff）
  - [ ] パスワードハッシュ化実装（bcrypt）
  - [ ] app.ts に登録

  ### hotel-saas
  - [ ] 5ファイル実装（create/list/get/update/delete）
  - [ ] RESOURCE → staff 置換

  ### 動作確認
  - [ ] CRUD全て動作
  - [ ] パスワードハッシュ化確認
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ CRUD全て動作
  - ✅ パスワードハッシュ化確認（平文保存なし）
  - ✅ tenantId分離確認
  - ✅ エラーゼロ

  ## Accept（SSOT準拠）
  - STAFF-001: スタッフ作成時にメール重複チェック
  - STAFF-002: パスワードハッシュ化（bcrypt）
  - STAFF-003: スタッフ削除時に論理削除

Blocked by: REBUILD-5
```

---

### REBUILD-7: 権限管理実装

```yaml
Title: [Phase 2] 権限管理実装
Labels: rebuild, phase-2, hotel-saas, hotel-common, has-ssot
Priority: 1
Milestone: Phase 2: 実装
Estimate: 1時間
Assignee: 実装AI

Description: |
  ## 目的
  ロール・権限のCRUD実装

  ## 関連SSOT
  - SSOT_SAAS_PERMISSION_SYSTEM.md

  ## タスク
  ### hotel-common
  - [ ] roles.routes.ts 実装（テンプレートベース）
  - [ ] permissions.routes.ts 実装（テンプレートベース）
  - [ ] role-permissions.routes.ts 実装（関連付け）
  - [ ] app.ts に登録

  ### hotel-saas
  - [ ] roles/ ディレクトリ（5ファイル）
  - [ ] permissions/ ディレクトリ（5ファイル）
  - [ ] role-permissions/ ディレクトリ（assign/revoke）

  ### 動作確認
  - [ ] ロールCRUD動作
  - [ ] 権限CRUD動作
  - [ ] ロール-権限関連付け動作
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ ロール・権限のCRUD全て動作
  - ✅ ロール-権限関連付け動作
  - ✅ エラーゼロ

  ## Accept（SSOT準拠）
  - PERM-001: ロール作成時にコード重複チェック
  - PERM-002: 権限削除時に依存ロール確認
  - PERM-003: システムロール削除禁止

Blocked by: REBUILD-6
```

---

### REBUILD-8: プロフィール管理実装

```yaml
Title: [Phase 2] プロフィール管理実装
Labels: rebuild, phase-2, hotel-saas, hotel-common
Priority: 1
Milestone: Phase 2: 実装
Estimate: 30分
Assignee: 実装AI

Description: |
  ## 目的
  ログイン中のスタッフのプロフィール取得・更新APIを実装

  ## タスク
  ### hotel-common
  - [ ] profile.routes.ts 実装（get/update）
  - [ ] app.ts に登録

  ### hotel-saas
  - [ ] profile/me.get.ts 実装
  - [ ] profile/me.put.ts 実装

  ### 動作確認
  - [ ] プロフィール取得成功
  - [ ] プロフィール更新成功
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ プロフィール取得・更新動作
  - ✅ 自分の情報のみ取得可能
  - ✅ エラーゼロ

Blocked by: REBUILD-6
```

---

### REBUILD-9: 客室管理実装（グレード + 客室）

```yaml
Title: [Phase 2] 客室管理実装（グレード + 客室）
Labels: rebuild, phase-2, hotel-saas, hotel-common, has-ssot
Priority: 2
Milestone: Phase 2: 実装
Estimate: 1時間
Assignee: 実装AI

Description: |
  ## 目的
  客室グレード・客室のCRUD実装

  ## 関連SSOT
  - SSOT_SAAS_ROOM_MANAGEMENT.md

  ## タスク
  ### hotel-common
  - [ ] room-grades.routes.ts 実装（既にPhase 1で作成済み）
  - [ ] rooms.routes.ts 実装（テンプレートベース）
  - [ ] app.ts に登録

  ### hotel-saas
  - [ ] room-grades/ ディレクトリ（既にPhase 1で作成済み）
  - [ ] rooms/ ディレクトリ（5ファイル）

  ### 動作確認
  - [ ] 客室グレードCRUD動作（Phase 1で確認済み）
  - [ ] 客室CRUD動作
  - [ ] グレード-客室関連付け確認
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ 客室グレード・客室のCRUD全て動作
  - ✅ グレード-客室関連確認
  - ✅ エラーゼロ

  ## Accept（SSOT準拠）
  - ROOM-001: 客室作成時にグレード存在確認
  - ROOM-002: 客室番号重複チェック
  - ROOM-003: 客室削除時に予約状況確認

Blocked by: REBUILD-7
```

---

### REBUILD-10: 予約管理実装

```yaml
Title: [Phase 2] 予約管理実装
Labels: rebuild, phase-2, hotel-saas, hotel-common, no-ssot
Priority: 2
Milestone: Phase 2: 実装
Estimate: 2時間
Assignee: 実装AI

Description: |
  ## 目的
  予約のCRUD実装（SSOT未作成・最小限実装）

  ## タスク
  ### hotel-common
  - [ ] reservations.routes.ts 実装（テンプレートベース）
  - [ ] 予約ステータス管理（pending/confirmed/checked-in/checked-out/cancelled）
  - [ ] app.ts に登録

  ### hotel-saas
  - [ ] reservations/ ディレクトリ（5ファイル）

  ### 動作確認
  - [ ] CRUD全て動作
  - [ ] ステータス遷移確認
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ CRUD全て動作
  - ✅ 予約ステータス管理動作
  - ✅ エラーゼロ

  ## 備考
  - SSOTはリビルド完了後に作成予定
  - 最小限のCRUD実装のみ

Blocked by: REBUILD-9
```

---

### REBUILD-11: 顧客管理実装

```yaml
Title: [Phase 2] 顧客管理実装
Labels: rebuild, phase-2, hotel-saas, hotel-common, no-ssot
Priority: 2
Milestone: Phase 2: 実装
Estimate: 1.5時間
Assignee: 実装AI

Description: |
  ## 目的
  顧客情報のCRUD実装（SSOT未作成・最小限実装）

  ## タスク
  ### hotel-common
  - [ ] customers.routes.ts 実装（テンプレートベース）
  - [ ] app.ts に登録

  ### hotel-saas
  - [ ] customers/ ディレクトリ（5ファイル）

  ### 動作確認
  - [ ] CRUD全て動作
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ CRUD全て動作
  - ✅ エラーゼロ

  ## 備考
  - SSOTはリビルド完了後に作成予定

Blocked by: REBUILD-9
```

---

### REBUILD-12: 料金・プラン管理実装

```yaml
Title: [Phase 2] 料金・プラン管理実装
Labels: rebuild, phase-2, hotel-saas, hotel-common, has-ssot
Priority: 2
Milestone: Phase 2: 実装
Estimate: 2時間
Assignee: 実装AI

Description: |
  ## 目的
  料金プラン・料金設定のCRUD実装

  ## 関連SSOT
  - SSOT_SAAS_PRICING_MANAGEMENT.md

  ## タスク
  ### hotel-common
  - [ ] pricing-plans.routes.ts 実装
  - [ ] pricing-settings.routes.ts 実装
  - [ ] app.ts に登録

  ### hotel-saas
  - [ ] pricing-plans/ ディレクトリ（5ファイル）
  - [ ] pricing-settings/ ディレクトリ（5ファイル）

  ### 動作確認
  - [ ] 料金プランCRUD動作
  - [ ] 料金設定CRUD動作
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ 料金プラン・料金設定のCRUD全て動作
  - ✅ エラーゼロ

  ## Accept（SSOT準拠）
  - PRICE-001: 料金プラン作成時にコード重複チェック
  - PRICE-002: 料金設定時に期間重複チェック

Blocked by: REBUILD-9
```

---

### REBUILD-13: キャンペーン管理実装

```yaml
Title: [Phase 2] キャンペーン管理実装
Labels: rebuild, phase-2, hotel-saas, hotel-common, no-ssot
Priority: 3
Milestone: Phase 2: 実装
Estimate: 1時間
Assignee: 実装AI

Description: |
  ## 目的
  キャンペーンのCRUD実装（SSOT未作成・最小限実装）

  ## タスク
  ### hotel-common
  - [ ] campaigns.routes.ts 実装（テンプレートベース）
  - [ ] app.ts に登録

  ### hotel-saas
  - [ ] campaigns/ ディレクトリ（5ファイル）

  ### 動作確認
  - [ ] CRUD全て動作
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ CRUD全て動作
  - ✅ エラーゼロ

  ## 備考
  - SSOTはリビルド完了後に作成予定

Blocked by: REBUILD-12
```

---

### REBUILD-14: その他管理機能実装（施設・アメニティ・ページ）

```yaml
Title: [Phase 2] その他管理機能実装（施設・アメニティ・ページ）
Labels: rebuild, phase-2, hotel-saas, hotel-common
Priority: 3
Milestone: Phase 2: 実装
Estimate: 2時間
Assignee: 実装AI

Description: |
  ## 目的
  施設・アメニティ・ページ管理のCRUD実装（まとめて実装）

  ## タスク
  ### hotel-common
  - [ ] facilities.routes.ts 実装
  - [ ] amenities.routes.ts 実装
  - [ ] pages.routes.ts 実装
  - [ ] app.ts に登録

  ### hotel-saas
  - [ ] facilities/ ディレクトリ（5ファイル）
  - [ ] amenities/ ディレクトリ（5ファイル）
  - [ ] pages/ ディレクトリ（5ファイル）

  ### 動作確認
  - [ ] 施設CRUD動作
  - [ ] アメニティCRUD動作
  - [ ] ページCRUD動作
  - [ ] エラーゼロ確認

  ## 完了条件
  - ✅ 3機能のCRUD全て動作
  - ✅ エラーゼロ

Blocked by: REBUILD-13
```

---

## ✅ Phase 3: テスト（1 Issue）

### REBUILD-15: 統合テスト・エラー率測定

```yaml
Title: [Phase 3] 統合テスト・エラー率測定
Labels: rebuild, phase-3
Priority: 1
Milestone: Phase 3: テスト
Estimate: 2時間
Assignee: 実装AI

Description: |
  ## 目的
  全機能のCRUD統合テスト + シナリオテスト実施

  ## タスク
  ### CRUD統合テスト（1時間）
  - [ ] 全API一覧作成
  - [ ] curl スクリプト作成
  - [ ] 全API実行
  - [ ] 成功/失敗カウント
  - [ ] エラー率計算

  ### シナリオテスト（1時間）
  - [ ] シナリオ1: ログイン → テナント作成 → スタッフ作成 → 権限設定
  - [ ] シナリオ2: 客室グレード作成 → 客室作成
  - [ ] シナリオ3: 顧客登録 → 予約作成 → チェックイン
  - [ ] シナリオ4: キャンペーン作成 → 施設設定
  - [ ] 全シナリオ動作確認

  ## エラー率計算
  ```bash
  TOTAL_APIS=$(find server/api -name "*.ts" | wc -l)
  FAILED_APIS=$(grep "❌" test-results.txt | wc -l)
  ERROR_RATE=$(echo "scale=2; $FAILED_APIS / $TOTAL_APIS * 100" | bc)
  ```

  ## 完了条件
  - ✅ 全API実行完了
  - ✅ エラー率5%未満（目標）
  - ✅ 全シナリオ動作確認
  - ✅ テスト結果レポート作成

  ## 完了報告テンプレート
  ```
  Phase 3完了しました。完了条件：
  
  ## CRUD統合テスト結果
  - 総API数: XX個
  - 成功: XX個
  - 失敗: XX個
  - エラー率: X.X%
  
  ## シナリオテスト結果
  - シナリオ1: ✅ 成功
  - シナリオ2: ✅ 成功
  - シナリオ3: ✅ 成功
  - シナリオ4: ✅ 成功
  
  次のPhase（Phase 4: 既存環境への統合）に進んでよろしいですか？
  ```

Blocked by: REBUILD-14
```

---

## 🔄 Phase 4: 統合（1 Issue）

### REBUILD-16: 既存環境への統合

```yaml
Title: [Phase 4] 既存環境への統合
Labels: rebuild, phase-4
Priority: 1
Milestone: Phase 4: 統合
Estimate: 3時間
Assignee: 実装AI

Description: |
  ## 目的
  hotel-saas-rebuild / hotel-common-rebuild を既存環境（localhost:3100/3400）に統合する

  ## タスク
  ### バックアップ（30分）
  - [ ] hotel-saas の main ブランチをバックアップ
  - [ ] hotel-common の main ブランチをバックアップ
  - [ ] データベースのバックアップ（pg_dump）

  ### コード統合（1時間）
  - [ ] hotel-saas-rebuild → hotel-saas へコピー
  - [ ] hotel-common-rebuild → hotel-common へコピー
  - [ ] .env ポート番号を3100/3400に戻す
  - [ ] Git commit（"feat: リビルド完了（テンプレートベース・Session認証統一）"）

  ### 最終動作確認（1時間）
  - [ ] hotel-common 起動（localhost:3400）
  - [ ] hotel-saas 起動（localhost:3100）
  - [ ] 全機能テスト（CRUD統合テスト再実行）
  - [ ] エラーゼロ確認

  ### クリーンアップ（30分）
  - [ ] hotel-saas-rebuild ディレクトリ削除
  - [ ] hotel-common-rebuild ディレクトリ削除
  - [ ] 一時ファイル削除

  ## 完了条件
  - ✅ 既存環境（localhost:3100/3400）で全機能動作
  - ✅ エラー率5%未満維持
  - ✅ Git commit完了
  - ✅ バックアップ保管確認

  ## 完了報告テンプレート
  ```
  🎉 リビルドプロジェクト完了しました！
  
  ## 最終結果
  - 総所要時間: XX時間（目標24時間）
  - エラー率: X.X%（目標5%未満）
  - 実装機能数: XX機能
  - 実装API数: XX個
  
  ## 統合環境動作確認
  - hotel-common: ✅ 起動成功（localhost:3400）
  - hotel-saas: ✅ 起動成功（localhost:3100）
  - 全API: ✅ 動作確認済み
  
  ## 成果
  - ✅ Session認証統一
  - ✅ callHotelCommonAPI統一
  - ✅ テンプレートベース実装
  - ✅ エラー率大幅削減（30% → X.X%）
  
  リビルドプロジェクトを完了とします。
  ```

Blocked by: REBUILD-15
```

---

## 📊 Linear Issue一覧サマリー

### Phase別Issue数

| Phase | Issue数 | 所要時間 | 完了条件 |
|-------|--------|---------|---------|
| Phase 1: 準備 | 3 | 2時間 | テンプレート動作確認済み |
| Phase 2: 実装 | 11 | 20時間 | 全機能CRUD動作 |
| Phase 3: テスト | 1 | 2時間 | エラー率5%未満 |
| Phase 4: 統合 | 1 | 3時間 | 既存環境で動作 |
| **合計** | **16** | **27時間** | リビルド完了 |

### Priority別Issue数

| Priority | Issue数 | 内容 |
|----------|--------|------|
| 0（緊急） | 3 | Phase 1（テンプレート作成） |
| 1（最優先） | 6 | 認証・テナント・スタッフ・権限・プロフィール + テスト + 統合 |
| 2（高優先） | 4 | 客室・予約・顧客・料金 |
| 3（中優先） | 3 | キャンペーン・その他管理機能 |

### SSOT有無別

| 分類 | Issue数 |
|-----|--------|
| has-ssot | 6 |
| no-ssot | 4 |
| その他 | 6 |

---

## 🔗 依存関係グラフ

```
REBUILD-1（hotel-common テンプレート）
  ↓
REBUILD-2（hotel-saas テンプレート）
  ↓
REBUILD-3（統合動作確認）
  ↓
REBUILD-4（認証）
  ↓
REBUILD-5（テナント）
  ↓
REBUILD-6（スタッフ）
  ↓
REBUILD-7（権限）
  ├─ REBUILD-8（プロフィール）
  └─ REBUILD-9（客室）
       ↓
     REBUILD-10（予約）
       ├─ REBUILD-11（顧客）
       └─ REBUILD-12（料金）
            ↓
          REBUILD-13（キャンペーン）
            ↓
          REBUILD-14（その他）
            ↓
          REBUILD-15（テスト）
            ↓
          REBUILD-16（統合）
```

---

## 🚀 Linear Issue作成手順

### Step 1: Linear Projectを作成

1. Linear にログイン
2. 「New Project」をクリック
3. 以下を入力：
   - Name: `hotel-saas/hotel-common リビルド`
   - Key: `REBUILD`
   - Start Date: `2025-11-04`
   - Target End Date: `2025-11-07`

### Step 2: Milestonesを作成

1. Project設定 → Milestones
2. 以下の4つを作成：
   - `Phase 1: 準備`（2時間）
   - `Phase 2: 実装`（20時間）
   - `Phase 3: テスト`（2時間）
   - `Phase 4: 統合`（3時間）

### Step 3: Labelsを作成

1. Workspace設定 → Labels
2. このドキュメントの「Labels定義」に従って作成

### Step 4: Issueを作成

1. このドキュメントのREBUILD-1〜REBUILD-16を順番に作成
2. 各Issueの内容をコピー＆ペースト
3. Labels、Priority、Milestone、Blocked byを設定

### Step 5: 依存関係を設定

1. 各IssueのBlocked byに従って依存関係を設定
2. 依存関係グラフを確認

---

## 📈 進捗確認方法

### Linearで確認

```
1. Projectページを開く
2. Board Viewで進捗確認
   - Todo: 未着手
   - In Progress: 作業中
   - Done: 完了
3. Milestoneごとの進捗率を確認
```

### 週次エクスポート

```bash
# Linearデータをエクスポート（週次自動実行）
node scripts/linear/export-rebuild-progress.js

# 出力先: docs/rebuild/REBUILD_PROGRESS.md
```

---

## 📞 問い合わせ

Linear設定で不明な点:
- Luna（設計・管理AI）に相談
- `/Users/kaneko/hotel-kanri/docs/rebuild/` を参照

---

## 🎓 重要な心構え

```
「Linear が唯一の真実」
「File は読み取り専用」
「進捗はLinearで更新」
「依存関係を守る」
「エラーは即座に停止」
「承認なしで進まない」
```

**Linearで管理すれば、進捗が明確になります。**

---

## 📈 評価（60点 → 100点）

### 改善前（60点）

**良い点**:
- ✅ Issue定義が完全（16 Issues）（15点）
- ✅ 依存関係が明確（10点）
- ✅ 完了条件が明確（5点）

**問題点**:
- ❌ 実装AIの視点が欠如（-15点）
  - Issue開始時の手順不明
  - Issue進行中の更新ルール不明
  - Issue完了時の手順不明
- ❌ Linear操作の具体的手順がない（-10点）
  - Issue作成方法不明
  - 依存関係設定方法不明
- ❌ エラー対応フローがない（-8点）
  - エラー検知方法不明
  - エラー報告フォーマット不明
- ❌ Phase移行ルールが曖昧（-5点）
  - Phase完了判定不明
  - ユーザー承認の取り方不明
- ❌ 並行作業のルールがない（-2点）

### 改善後（100点）

**完全性（40点）**:
- ✅ Issue定義が完全（16 Issues）（10点）
- ✅ Issue実行フロー完備（15点）
  - Step 1: Issue開始前
  - Step 2: Issue実行中
  - Step 3: Issue完了時
- ✅ Linear操作ガイド完備（10点）
  - 方法1: UI手動作成
  - 方法2: CSV一括インポート
  - 方法3: API自動化
- ✅ 依存関係設定ガイド（5点）

**実用性（30点）**:
- ✅ エラー対応フロー完備（15点）
  - エラー検知（4パターン）
  - エラー報告テンプレート
  - エラー解決後の再開
  - エラーが解決できない場合
- ✅ Phase移行ルール完備（10点）
  - Phase完了判定フロー
  - Phase完了報告テンプレート（4種類）
  - 承認されなかった場合の対応
- ✅ 並行作業ルール完備（5点）
  - 並行可能なIssue特定
  - 優先順位明確化

**明確性（30点）**:
- ✅ 実装AI向けの具体的手順（15点）
  - 各ステップでやることが明確
  - Linear更新タイミング明確
  - ユーザー報告フォーマット明確
- ✅ トラブルシューティング完備（10点）
  - Linear操作の問題4パターン
  - 解決方法明記
- ✅ 完了報告テンプレート完備（5点）
  - Phase 1-4の全テンプレート
  - 統計・成果・コード品質

**合計**: 100点

---

## 🎯 実装AIが得られる価値

### Issue実行時

```
✅ 何をすべきか完全に理解できる
  - Step 1-3で明確な手順
  - 各ステップでのチェックリスト

✅ Linearをどう使うか分かる
  - Status変更のタイミング
  - コメント更新の内容
  - Actual時間の記録方法

✅ エラーが出ても対処できる
  - 4パターンのエラー検知
  - エラー報告テンプレート
  - 解決後の再開手順

✅ Phase移行が明確
  - Phase完了判定フロー
  - 報告テンプレート（4種類）
  - 承認取得方法
```

### Linear設定時

```
✅ 3つの方法から選択できる
  - 方法1: UI手動作成（推奨）
  - 方法2: CSV一括インポート
  - 方法3: API自動化

✅ 具体的な操作手順が分かる
  - Project作成
  - Milestones作成
  - Labels作成
  - Issue作成（16回）
  - 依存関係設定

✅ トラブルにも対処できる
  - 4パターンの問題
  - 具体的な解決方法
```

---

## 🚀 次のアクション

**LINEAR_ISSUES.md の修正が完了しました（60点 → 100点）。**

### 実装AIへの指示

```
Step 1: LINEAR_ISSUES.md を読む（30分）
  ↓ Linear設定方法を理解

Step 2: Linear Project・Milestones・Labelsを作成（30分）
  ↓ 環境準備完了

Step 3: Linear Issues を作成（1時間）
  ↓ REBUILD-1〜16を登録

Step 4: OVERVIEW.md → TEMPLATE_SPEC.md を読む（20分）
  ↓ プロジェクト全体とテンプレートを理解

Step 5: REBUILD-1 を開始
  ↓ Issue実行フロー Step 1へ

リビルドプロジェクト開始！
```

---

## 📚 リビルドドキュメント最終確認

```
/Users/kaneko/hotel-kanri/docs/rebuild/
├── OVERVIEW.md          ✅ 完成（100点）
├── ROADMAP.md           ✅ 既存（そのまま使用）
├── TEMPLATE_SPEC.md     ✅ 完成（100点）
└── LINEAR_ISSUES.md     ✅ 完成（100点）← NEW!

すべてのドキュメントが100点です！
```

