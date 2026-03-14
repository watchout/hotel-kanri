# /progress - 現在の進捗確認

**用途**: 現在作業中タスクの詳細状態確認

**出力形式（固定）:**
```markdown
## 📍 Current Progress

### 現在のタスク
- **ID**: LIN-42 (PMS-12, alias: r1)
- **Title**: 権限管理のロール作成APIを追加
- **Status**: In Progress
- **Assignee**: Sun
- **Priority**: P1
- **工数**: 見積2h / 実績1.5h

### 進捗詳細
- ✅ Evidence収集完了
- ✅ Plan作成完了
- ⏳ 実装中（60%）
- ⬜ テスト未着手
- ⬜ PR作成未着手

### ブロッカー
なし

### 次アクション
1. POST /api/roles 実装完了（残30分）
2. テスト追加（20分）
3. PR作成（10分）

推定完了時刻: 14:00
```

**実行:**
```bash
node scripts/linear/find-next-task.js --current
```

**使用タイミング:**
- 作業開始時（今日何やるか確認）
- 中断→再開時（どこまでやったか確認）
- デイリースタンドアップ時
