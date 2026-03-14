# /next - 次タスク選択

**用途**: 次にやるべきタスクを自動選択（依存関係・優先度考慮）

**出力形式（固定）:**
```markdown
## 🎯 Next Task Recommendation

### 推奨タスク
- **ID**: LIN-45 (BUG-45, alias: b1)
- **Title**: 注文APIでテナントID欠落バグ
- **Priority**: P0 (Critical)
- **工数**: 2時間
- **Blocked by**: なし ✅

### 選定理由
1. 優先度最高（P0）
2. 依存関係なし（即着手可能）
3. あなた（Sun）にアサイン済み

### 他の候補
2. LIN-48 (s1) - SSOT作成 [P1, 4h]
3. LIN-52 (f1) - リファクタ [P2, 3h]

### 開始方法
```
Task: b1 — /rfv
```

---
❓ この推奨で開始しますか？
- Yes: 「Task: b1 — /rfv」と入力
- No: 「/next --skip」で次の候補表示
```

**実行:**
```bash
node scripts/linear/find-next-task-roadmap.js
```

**使用タイミング:**
- タスク完了時（次何やるか）
- 朝一の作業開始時
- 優先度判断に迷った時
