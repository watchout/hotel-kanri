# Claude Code タスク: 本格LLMベンチマーク実行

## 🎯 目的

SSOT生成の各工程において、マルチLLM統合が単一LLMより精度を向上させるかを統計的に検証する。

## 📋 実行手順

### Step 1: ベンチマークスクリプト実行

```bash
cd /Users/kaneko/hotel-kanri
node scripts/ssot-multi-llm/full-benchmark.cjs
```

**注意**: 
- 約30-40分かかります
- APIコストは約$5-10です
- ネットワーク接続が必要です

### Step 2: 結果の確認

実行完了後、以下のファイルに結果が保存されます：

```
/Users/kaneko/hotel-kanri/evidence/llm-benchmark/full/full-benchmark-*.json
```

### Step 3: 結果のサマリー作成

結果JSONを読み込み、以下の形式でサマリーを作成してください：

```markdown
## 📊 本格LLMベンチマーク結果

### Tech Architect工程
| パターン | 平均スコア | 標準偏差 | vs ベースライン |
|:---------|:-----------|:---------|:----------------|
| A: バランス | XX点 | ±X.X | +X点 ✅ or -X点 ❌ |
| B: 高品質 | XX点 | ±X.X | +X点 ✅ or -X点 ❌ |
| C: 低コスト | XX点 | ±X.X | +X点 ✅ or -X点 ❌ |
| D: ベースライン | XX点 | ±X.X | - |

### Marketing工程
（同様）

### 🎯 結論
- 効果があった工程: [リスト]
- 効果がなかった工程: [リスト]
- 推奨設定: [JSON形式]
```

### Step 4: 設定ファイル更新

効果があった組み合わせを以下のファイルに反映：

```
/Users/kaneko/hotel-kanri/scripts/ssot-multi-llm/optimal-config.json
```

形式：
```json
{
  "techArchitect": {
    "useMultiLLM": true/false,
    "generators": ["model1", "model2", "model3"],
    "merger": "model",
    "expectedScore": 90
  },
  "marketing": {
    ...
  }
}
```

## ⚠️ 注意事項

1. **APIキーが必要**
   - ANTHROPIC_API_KEY
   - OPENAI_API_KEY
   - `.env.mcp` に設定されていること

2. **タイムアウト対策**
   - 長時間実行のため、ターミナルが切れないように注意
   - `nohup` または `screen` を使用推奨

3. **コスト管理**
   - 実行前に推定コストを確認
   - 異常なコスト増加があれば中断

## 📝 完了報告

完了したら以下を報告：

1. 総実行回数と所要時間
2. 総コスト
3. 各工程の最適パターン
4. 結論と推奨設定
