# File → Linear 移行計画書

**作成日**: 2025年10月21日  
**対象**: SSOT_PROGRESS_MASTER.md → Linear Issues  
**目標完了日**: 2025年11-01  
**責任者**: Iza（統合管理者）  

---

## 📋 移行の目的

**File運用（SSOT_PROGRESS_MASTER.md手動管理）から Linear運用（Linear Issues管理）への移行**

- ✅ タスク管理の効率化
- ✅ 依存関係・ブロッカーの可視化
- ✅ AI運用制御の自動化
- ✅ 週次レポートの自動生成

---

## 📅 移行スケジュール

| フェーズ | 期間 | 内容 | 責任者 | 状態 |
|:--------|:-----|:-----|:------|:----:|
| **Phase 0: 準備** | 10/21-10/24 | Linear workspace設定 | Iza | ⏳ 未着手 |
| **Phase 1: データ移行** | 10/25-10/28 | SSOT → Linear | Iza | ⏳ 未着手 |
| **Phase 2: 検証** | 10/29-10/30 | 移行データ確認 | 全員 | ⏳ 未着手 |
| **Phase 3: 切替** | 10/31-11/01 | Linear運用開始 | Iza | ⏳ 未着手 |

---

## Phase 0: 準備（10/21-10/24）

### Step 1: Linear workspace確認

```bash
# 既存のLinear workspaceを確認
- Workspace URL: https://linear.app/hotel-kanri
- Teams: Sun, Luna, Suno, Iza
- Projects: Phase 0-5
```

### Step 2: Cyclesの設定

```bash
# 週次サイクルの設定
- Duration: 1 week
- Start day: Monday
- Auto-archive: Yes
```

### Step 3: Labelsの設定

```bash
# ラベル作成
- SSOT作成
- hotel-common実装
- hotel-saas実装
- hotel-pms実装
- hotel-member実装
- バージョンアップ
```

### Step 4: Prioritiesの確認

```bash
# 優先度
- Priority 1: Critical（最優先）
- Priority 2: High（高優先）
- Priority 3: Medium（通常）
- Priority 4: Low（低優先）
```

---

## Phase 1: データ移行（10/25-10/28）

### Step 1: SSOT_PROGRESS_MASTER.mdの解析

```bash
# scripts/ops/parse-progress-master.js（新規作成）

npm run ops:parse-progress

# 出力: progress-data.json
{
  "phases": [
    {
      "name": "Phase 1",
      "weeks": [
        {
          "name": "Week 1",
          "tasks": [
            {
              "order": 1,
              "title": "SSOT_SAAS_PERMISSION_SYSTEM",
              "type": "実装",
              "assignee": "Iza",
              "status": "completed",
              "priority": 1
            }
          ]
        }
      ]
    }
  ]
}
```

### Step 2: Linear Issuesの作成

```bash
# scripts/linear/migrate-from-progress-master.js

npm run ops:migrate -- --from file --to linear

# 処理:
1. progress-data.jsonを読み込み
2. 各タスクをLinear Issueとして作成
   - Title: [種別] タスク名
   - Project: Phase別
   - Cycle: Week別
   - Priority: priority値
   - Assignee: 担当者
   - Labels: 種別
3. 依存関係の設定
   - Blocked by: 順序に基づく自動設定
4. Status: 完了タスクは"Done"に設定
```

### Step 3: 検証

```bash
# 移行データの検証

npm run ops:verify-migration

# チェック項目:
- タスク総数一致: 64件
- Phase別タスク数一致
- 依存関係の正確性
- 担当者の正確性
- ステータスの正確性
```

---

## Phase 2: 検証（10/29-10/30）

### Step 1: 全員での確認

**確認項目**:
- [ ] 全タスクが移行されている
- [ ] 依存関係が正しく設定されている
- [ ] 担当者が正しい
- [ ] ステータスが正しい
- [ ] ラベルが適切に付与されている

### Step 2: テストタスクの操作

**テスト内容**:
1. タスクのステータス変更
2. コメント追加
3. 依存関係の追加
4. ブロッカーの設定
5. 工数の記録

### Step 3: 週次エクスポートのテスト

```bash
# エクスポートのテスト

npm run ops:export-progress

# 確認:
- SSOT_PROGRESS_MASTER.mdが更新される
- 形式が正しい
- データが正確
```

---

## Phase 3: 切替（10/31-11/01）

### Step 1: ops/policy.ymlの更新

```yaml
# ops/policy.yml

progress:
  tool: linear  # file → linear
  canonical: true
  
  weekly_export:
    enabled: true  # false → true
    to_file: docs/03_ssot/SSOT_PROGRESS_MASTER.md
    schedule: '0 8 * * MON'
```

### Step 2: .cursorrulesの再生成

```bash
npm run ops:apply

# 確認:
- OPS:BEGIN progress ブロックが更新される
- 「Linearが唯一の真実」に変更される
```

### Step 3: 矛盾チェック

```bash
npm run ops:lint

# 結果: 矛盾なし ✅
```

### Step 4: ADR作成

```bash
# docs/adr/ADR-001-switch-to-linear.md

**決定**: File運用からLinear運用への切替
**日付**: 2025-11-01
**理由**: タスク管理の効率化、AI運用制御の自動化
```

### Step 5: コミット

```bash
git add ops/policy.yml .cursorrules docs/adr/ADR-001-switch-to-linear.md
git commit -m "ops: migrate from File to Linear

## 移行内容
- SSOT_PROGRESS_MASTER.md → Linear Issues（64タスク）
- ops/policy.yml: progress.tool = linear
- 週次エクスポート有効化

## 検証
- タスク総数: 64件（一致 ✅）
- 依存関係: 正確 ✅
- 担当者: 正確 ✅

Refs: docs/migration/FILE_TO_LINEAR_MIGRATION_PLAN.md"
```

---

## 🚨 ロールバックプラン

### 問題発生時の対応

**Step 1: Linear運用停止**

```yaml
# ops/policy.yml
progress:
  tool: file  # linear → file
  weekly_export:
    enabled: false
```

**Step 2: テンプレート再生成**

```bash
npm run ops:apply
npm run ops:lint
```

**Step 3: SSOT_PROGRESS_MASTER.mdの復元**

```bash
# Linearから最終エクスポート
npm run ops:export-progress -- --final

# または、Gitから復元
git checkout HEAD~1 -- docs/03_ssot/SSOT_PROGRESS_MASTER.md
```

---

## 📊 移行完了の判定基準

### 必須条件

- ✅ 全64タスクがLinearに存在
- ✅ 依存関係が正確に設定
- ✅ 担当者が正確にアサイン
- ✅ ステータスが正確に反映
- ✅ 週次エクスポートが動作
- ✅ `npm run ops:lint` で矛盾なし
- ✅ ADR作成完了

### 成功指標

- 🎯 AIがLinearから次タスクを選択できる
- 🎯 週次レポートが自動生成される
- 🎯 全員がLinearでタスク管理できる

---

**移行計画書**: `/Users/kaneko/hotel-kanri/docs/migration/FILE_TO_LINEAR_MIGRATION_PLAN.md`  
**最終更新**: 2025年10月21日  
**次回レビュー**: 2025-10-24

