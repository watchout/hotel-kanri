# Linear DoR/DoD セットアップ手順

**所要時間**: 30分  
**担当者**: Project Manager / Team Lead

---

## ステップ1: Custom Workflow作成（10分）

### 1-1. Workflowページへ移動

1. Linear > Settings（左下の歯車アイコン）
2. 左メニューから「Workflows」を選択
3. Team「OmotenasuAI」を選択

### 1-2. 新しいワークフロー作成

現在のデフォルトワークフロー（Triage, Backlog, Todo, In Progress, Done, Canceled）を以下に変更：

| # | 状態名 | Type | Color | 説明 |
|---|--------|------|-------|------|
| 1 | **Backlog** | Unstarted | Gray | アイデア・要望段階 |
| 2 | **Spec Ready** | Unstarted | Yellow | 仕様確定、DoR確認中 |
| 3 | **Dev Ready** | Unstarted | Blue | DoR完了、開発可能 |
| 4 | **In Progress** | Started | Purple | 開発中 |
| 5 | **PR Open** | Started | Orange | PR作成済み、レビュー待ち |
| 6 | **QA** | Started | Pink | QAテスト中 |
| 7 | **Release Candidate** | Started | Green | リリース候補、DoD確認中 |
| 8 | **Done** | Completed | Green | 完了、本番リリース済み |
| 9 | **Canceled** | Canceled | Gray | キャンセル |

**操作**:
1. 「Edit workflow」をクリック
2. 既存の状態を編集または新規追加
3. 「Save」をクリック

### 1-3. ワークフロー遷移ルール設定

Linearの「Automation」機能を使って遷移ルールを設定：

#### ルール1: Dev Readyへの遷移条件

```
Trigger: Status changed to "Dev Ready"
Condition: Check if all DoR items are completed
Action: If not completed, revert to "Spec Ready" and add comment
```

**手動チェック推奨**: 現在Linearでは複雑な条件チェックは手動が確実です。

#### ルール2: Doneへの遷移条件

```
Trigger: Status changed to "Done"
Condition: Check if all DoD items are completed
Action: If not completed, revert to "Release Candidate" and add comment
```

**手動チェック推奨**: レビュー時に目視確認が確実です。

---

## ステップ2: Issue Templates作成（10分）

### 2-1. Templatesページへ移動

1. Linear > Settings
2. 左メニューから「Templates」を選択
3. 「Create template」をクリック

### 2-2. テンプレート1: SSOT作成タスク

**Name**: `SSOT Creation Task`

**Description**: 
`/Users/kaneko/hotel-kanri/docs/setup/linear-templates/SSOT_CREATION_TEMPLATE.md` の内容をコピー＆ペースト

**Default values**:
- Project: `hotel-kanri`
- Labels: `ssot-creation`, `documentation`
- Estimate: `4` (2日)

「Create」をクリック

### 2-3. テンプレート2: 実装タスク

**Name**: `Implementation Task`

**Description**: 
`/Users/kaneko/hotel-kanri/docs/setup/linear-templates/IMPLEMENTATION_TEMPLATE.md` の内容をコピー＆ペースト

**Default values**:
- Labels: `implementation`
- Estimate: `6` (3日)

「Create」をクリック

### 2-4. テンプレート3: バグ修正タスク

**Name**: `Bug Fix Task`

**Description**: 
`/Users/kaneko/hotel-kanri/docs/setup/linear-templates/BUG_FIX_TEMPLATE.md` の内容をコピー＆ペースト

**Default values**:
- Labels: `bug-fix`
- Priority: `High`

「Create」をクリック

---

## ステップ3: Custom Fields作成（オプション・10分）

より詳細な追跡が必要な場合、カスタムフィールドを追加：

### 3-1. Custom Fieldsページへ移動

1. Linear > Settings
2. 左メニューから「Custom fields」を選択
3. 「Create field」をクリック

### 3-2. 推奨カスタムフィールド

| フィールド名 | Type | 用途 |
|-------------|------|------|
| `SSOT参照` | URL | docs/03_ssot/...へのリンク |
| `要件ID` | Text | AUTH-001, PERM-002等 |
| `テストカバレッジ` | Number | 単体テスト実行時のカバレッジ（%） |
| `CI Status` | Select | Passing / Failed / Pending |
| `DoR完了` | Checkbox | Definition of Ready完了フラグ |
| `DoD完了` | Checkbox | Definition of Done完了フラグ |

---

## ステップ4: 既存Issuesへの適用（自動化）

既存の145件のIssueにテンプレートを適用するスクリプトを実行：

```bash
cd /Users/kaneko/hotel-kanri/scripts/linear
export LINEAR_API_KEY="YOUR_API_KEY"
node update-issues-with-template.js
```

（スクリプトは次のステップで作成）

---

## ステップ5: チーム教育（10分）

### 5-1. ドキュメント共有

以下を全メンバーに共有：
- この設定手順書
- DoR/DoDの意味と重要性
- テンプレートの使い方

### 5-2. ワークフロー説明

```
Backlog → Spec Ready → Dev Ready → In Progress → PR Open → QA → Release Candidate → Done
  ↑           ↑            ↑                         ↑          ↑            ↑
  |           |            |                         |          |            |
アイデア    DoR確認      開発開始                  CI通過    QA完了      DoD確認
```

### 5-3. チェックリスト運用ルール

1. **Spec Ready → Dev Ready**: DoR全項目チェック完了が必須
2. **Dev Ready → In Progress**: 担当者アサイン後に開始
3. **PR Open**: GitHub PRとLinear Issueを自動リンク
4. **QA → Release Candidate**: QA完了後に遷移
5. **Release Candidate → Done**: DoD全項目チェック完了が必須

---

## ✅ セットアップ完了確認

以下を確認してください：

- [ ] Custom Workflowが8状態で設定されている
- [ ] Issue Templates（3種類）が作成されている
- [ ] （オプション）Custom Fieldsが作成されている
- [ ] チームメンバーに説明済み
- [ ] テスト用Issueを1つ作成し、ワークフローを確認

---

## 🚀 次のステップ

DoR/DoD設定完了後、以下に進みます：

1. ✅ **ステップ1完了**: Linear DoR/DoD設定
2. ⏳ **ステップ2**: GitHub設定（Branch Protection、CODEOWNERS）
3. ⏳ **ステップ3**: CI/CD完全版
4. ⏳ **ステップ4**: LLM評価ゲート
5. ⏳ **ステップ5**: リリース列車
6. ⏳ **ステップ6**: ChatOps統合

---

## 📚 参考資料

- SSOT品質チェックリスト: `/docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md`
- SSOT実装チェックリスト: `/docs/03_ssot/00_foundation/SSOT_IMPLEMENTATION_CHECKLIST.md`
- 要件ID体系: `/docs/03_ssot/00_foundation/SSOT_REQUIREMENT_ID_SYSTEM.md`

