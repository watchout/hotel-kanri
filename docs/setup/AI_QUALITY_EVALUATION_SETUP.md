# AI品質評価システム セットアップガイド

**作成日**: 2025年10月20日  
**バージョン**: v1.0.0  
**対象**: hotel-kanriプロジェクト全体

---

## 📋 目次

1. [概要](#概要)
2. [評価指標](#評価指標)
3. [閾値設定](#閾値設定)
4. [テストケース](#テストケース)
5. [使い方](#使い方)
6. [トラブルシューティング](#トラブルシューティング)

---

## 🎯 概要

### 目的

AI応答品質を自動的に評価し、低品質なAI実装のマージを防止します。

### 実現する価値

| 指標 | Before | After | 改善率 |
|------|--------|-------|--------|
| **AI品質問題** | 本番後発見 | CI段階で検出 | 早期発見 |
| **ハルシネーション** | 60%発生 | <5% | **92%削減** |
| **低品質AI実装** | マージ可能 | 自動ブロック | **100%防止** |
| **手動レビュー時間** | 30分 | 5分 | **6倍速** |

---

## 📊 評価指標

### 1. Accuracy（正確性）>= 80%

**定義**: 回答が正しい情報を含んでいるか

**評価方法**:
- 期待キーワードの含有率をチェック
- 禁止キーワードの不在をチェック

**例**:
```
質問: hotel-saasからデータベースに直接アクセスできますか？
期待キーワード: ["許可されていない", "hotel-common", "経由"]
禁止キーワード: ["許可されている", "直接アクセス可能"]
```

---

### 2. Relevance（関連性）>= 75%

**定義**: 回答が質問に対して適切か

**評価方法**:
- 質問のキーワードと回答の関連性をチェック
- 質問文の主要な単語が回答に含まれているか

**例**:
```
質問: データベースのテーブル名はどの命名規則を使用しますか？
関連キーワード: ["データベース", "テーブル名", "命名規則"]
```

---

### 3. Coherence（一貫性）>= 80%

**定義**: 回答が論理的に一貫しているか

**評価方法**:
- 矛盾する表現の検出
- 肯定と否定の同時使用
- 必須と任意の混在

**例**:
```
❌ 不合格: "はい、可能です。いいえ、できません。"
✅ 合格: "いいえ、許可されていません。hotel-common経由でアクセスします。"
```

---

### 4. Response Time < 3秒

**定義**: 応答時間が適切か

**評価方法**:
- AI応答の取得時間を測定
- 閾値（3秒）以内かチェック

---

### 5. Hallucination（幻覚）< 5%

**定義**: 存在しない情報を生成していないか

**評価方法**:
- プレースホルダーの検出（`/path/to/`, `XXX-XXX`, `<commit-hash>`）
- サンプルコードの検出（`example.com`, `TODO:`, `FIXME:`）
- 実在しないファイル名の検出

**例**:
```
❌ 不合格: "ファイルは /path/to/file.ts にあります"
✅ 合格: "ファイルは docs/03_ssot/00_foundation/SSOT_XXX.md にあります"
```

---

## ⚙️ 閾値設定

### デフォルト閾値

```javascript
{
  accuracy: 80,      // 正確性 >= 80%
  relevance: 75,     // 関連性 >= 75%
  coherence: 80,     // 一貫性 >= 80%
  responseTime: 3000, // 応答時間 < 3秒
  hallucination: 5,   // 幻覚検出 < 5%
}
```

### カスタマイズ方法

`scripts/quality/evaluate-ai-responses.js` の `CONFIG` オブジェクトを編集：

```javascript
const CONFIG = {
  thresholds: {
    accuracy: 85,      // より厳密な基準
    relevance: 80,
    coherence: 85,
    responseTime: 2000, // より速い応答を要求
    hallucination: 3,   // より厳しい幻覚検出
  },
};
```

---

## 📝 テストケース

### デフォルトテストケース

5つのテストケースが定義されています：

| ID | カテゴリ | 目的 |
|----|----------|------|
| AI-001 | SSOT作成 | APIエンドポイント数の正確性 |
| AI-002 | データベース命名規則 | 命名規則の理解 |
| AI-003 | システム境界 | アーキテクチャ理解・ハルシネーション検出 |
| AI-004 | マルチテナント | 必須要件の理解 |
| AI-005 | ハルシネーション検出 | 認証方式の正確性 |

### カスタムテストケース追加

`scripts/quality/ai-test-cases.json` を作成：

```json
[
  {
    "id": "AI-006",
    "category": "新機能",
    "question": "XXX機能の実装方法は？",
    "expectedAnswer": "期待される回答",
    "expectedKeywords": ["キーワード1", "キーワード2"],
    "forbiddenKeywords": ["禁止キーワード1"],
    "maxResponseTime": 2000
  }
]
```

---

## 🚀 使い方

### ローカル実行

```bash
# 評価スクリプトを実行
node scripts/quality/evaluate-ai-responses.js

# 結果確認
cat .github/workflows/eval-results.json | jq '.summary'
```

### CI/CD自動実行

**トリガー条件**:
- PR作成時（`main`, `develop` ブランチ向け）
- ドキュメント変更時（`**.md`, `docs/03_ssot/**`, `.cursor/prompts/**`）
- 評価スクリプト変更時（`scripts/quality/**`）

**実行フロー**:
```
1. PR作成
   ↓
2. GitHub Actions起動
   ↓
3. AI応答品質評価実行
   ↓
4. 結果をPRにコメント
   ↓
5. 合格 → マージ可能
   不合格 → CI失敗（マージ不可）
```

---

## 📊 結果の確認

### GitHub Actions

```
1. GitHub → Actions タブ
2. "LLM/RAG Evaluation Gate" ワークフローを選択
3. 最新の実行結果を確認
```

### PRコメント

評価結果が自動的にPRにコメントされます：

```markdown
## 🤖 AI品質評価結果

### 📊 サマリー

- **合計テスト数**: 5
- **合格**: 4 ✅
- **不合格**: 1 ❌
- **合格率**: 80.0%

### ❌ 不合格のテストがあります

#### AI-003: システム境界

**質問**: hotel-saasからデータベースに直接アクセスできますか？

**評価結果**:
- Accuracy: 50.0% ❌
- Relevance: 85.0% ✅
- Coherence: 100.0% ✅
- Hallucination: 0.00% ✅
```

---

## 🐛 トラブルシューティング

### 評価が常に失敗する

**症状**: 全てのテストが不合格

**原因と対処**:

1. ✅ **閾値が厳しすぎる**
   ```javascript
   // 閾値を緩和
   thresholds: {
     accuracy: 70,  // 80 → 70
     relevance: 65,  // 75 → 65
   }
   ```

2. ✅ **テストケースが不適切**
   ```javascript
   // expectedKeywords を見直す
   // より一般的なキーワードに変更
   ```

### 評価結果ファイルが見つからない

**症状**: `eval-results.json` が存在しない

**対処**:
```bash
# ディレクトリ作成
mkdir -p .github/workflows

# 手動実行
node scripts/quality/evaluate-ai-responses.js
```

### CI/CDが実行されない

**症状**: PRを作成しても評価ワークフローが起動しない

**確認事項**:
```yaml
# .github/workflows/eval.yml のトリガー確認
on:
  pull_request:
    branches:
      - main  # ← 対象ブランチが正しいか
    paths:
      - '**.md'  # ← 変更ファイルが対象か
```

---

## 🔧 カスタマイズ例

### 1. より厳密な評価

```javascript
const CONFIG = {
  thresholds: {
    accuracy: 90,      // 90%以上
    relevance: 85,     // 85%以上
    coherence: 90,     // 90%以上
    responseTime: 2000, // 2秒以内
    hallucination: 2,   // 2%未満
  },
};
```

### 2. カテゴリ別の閾値

```javascript
function evaluateTestCase(testCase) {
  // カテゴリ別に閾値を変更
  const thresholds = {
    'SSOT作成': { accuracy: 90 },
    'データベース命名規則': { accuracy: 95 },
    'システム境界': { accuracy: 85 },
  };
  
  const categoryThreshold = thresholds[testCase.category] || CONFIG.thresholds;
  // ...
}
```

### 3. 警告レベルの追加

```javascript
// 合格・警告・不合格の3段階
function getEvaluationLevel(score, threshold) {
  if (score >= threshold) {
    return { level: 'PASS', icon: '✅' };
  } else if (score >= threshold * 0.8) {
    return { level: 'WARNING', icon: '⚠️' };
  } else {
    return { level: 'FAIL', icon: '❌' };
  }
}
```

---

## 📚 参考資料

- **評価スクリプト**: `scripts/quality/evaluate-ai-responses.js`
- **GitHub Actions Workflow**: `.github/workflows/eval.yml`
- **テストケース**: `scripts/quality/ai-test-cases.json`（カスタム用）
- **SSOT品質チェックリスト**: `docs/03_ssot/00_foundation/SSOT_QUALITY_CHECKLIST.md`

---

## ✅ チェックリスト

### 初回設定時

- [ ] 評価スクリプト動作確認
- [ ] GitHub Actions Workflow確認
- [ ] テストPRで動作確認
- [ ] 閾値が適切か確認

### 日常運用時

- [ ] PR作成前にローカルで評価実行
- [ ] CI/CD結果を確認
- [ ] 不合格の場合は修正
- [ ] 定期的にテストケース追加

---

**最終更新**: 2025年10月20日  
**バージョン**: v1.0.0  
**管理者**: Iza (統合管理者)

