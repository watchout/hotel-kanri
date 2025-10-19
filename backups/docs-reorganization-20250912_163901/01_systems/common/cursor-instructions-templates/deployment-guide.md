# 📋 Custom Instructions配布手順書

## **🎯 Phase 1: 4システム即座展開**

### **配布対象**
```yaml
配布先プロジェクト:
  1. hotel-common → メイン統合版（既に適用済み）
  2. hotel-saas → Sun特化版
  3. hotel-member → Suno特化版  
  4. hotel-pms → Luna特化版
```

---

## **📋 配布手順（各プロジェクト共通）**

### **Step 1: プロジェクトディレクトリに移動**
```bash
# 各プロジェクトに移動
cd /Users/kaneko/hotel-saas
# または
cd /Users/kaneko/hotel-member
# または
cd /Users/kaneko/hotel-pms
```

### **Step 2: .cursorディレクトリ作成**
```bash
# .cursorディレクトリが存在しない場合のみ作成
mkdir -p .cursor
```

### **Step 3: 該当するテンプレートをコピー**

#### **hotel-saasの場合**
```bash
# hotel-common/docs/cursor-instructions-templates/hotel-saas-instructions.md を
# hotel-saas/.cursor/instructions.md にコピー
cp ../hotel-common/docs/cursor-instructions-templates/hotel-saas-instructions.md .cursor/instructions.md
```

#### **hotel-memberの場合**
```bash
# hotel-common/docs/cursor-instructions-templates/hotel-member-instructions.md を
# hotel-member/.cursor/instructions.md にコピー
cp ../hotel-common/docs/cursor-instructions-templates/hotel-member-instructions.md .cursor/instructions.md
```

#### **hotel-pmsの場合**
```bash
# hotel-common/docs/cursor-instructions-templates/hotel-pms-instructions.md を
# hotel-pms/.cursor/instructions.md にコピー
cp ../hotel-common/docs/cursor-instructions-templates/hotel-pms-instructions.md .cursor/instructions.md
```

### **Step 4: Cursor再起動**
```yaml
各プロジェクトで:
  1. Cursorを完全に終了
  2. 該当プロジェクトでCursorを再起動
  3. Custom Instructionsが読み込まれることを確認
```

---

## **🔍 動作確認方法**

### **テスト用質問例**

#### **hotel-saas（Sun特化）での確認**
```
テスト質問: "顧客満足度を向上させるUIコンポーネントを作成してください"

期待される応答:
  ✅ アクセシビリティ要件への言及
  ✅ レスポンシブデザインの考慮
  ✅ 顧客感情への配慮
  ✅ WCAG 2.1 AA準拠への言及
```

#### **hotel-member（Suno特化）での確認**
```
テスト質問: "顧客データの取得処理を実装してください"

期待される応答:
  ✅ GDPR準拠の言及
  ✅ tenant_id必須の指摘
  ✅ データ暗号化の考慮
  ✅ 監査ログ記録の必要性
```

#### **hotel-pms（Luna特化）での確認**
```
テスト質問: "チェックイン処理の最適化を行ってください"

期待される応答:
  ✅ 3秒以内処理時間の言及
  ✅ イベント発行の必要性
  ✅ 24時間稼働への考慮
  ✅ エラーハンドリングの重要性
```

---

## **⚠️ 注意事項**

### **RAG・ガードレール連携**
```yaml
重要:
  ❌ 各プロジェクトにRAG・ガードレールシステムは実装しない
  ✅ hotel-common経由での実行を想定した指示のみ
  ✅ 現時点では指示レベルでの効果（30-40%）
  ✅ Phase 2でMCP統合により完全自動化予定
```

### **効果測定指標**
```yaml
Phase 1測定項目:
  - 仕様逸脱頻度の変化
  - TypeScriptエラー数の変化
  - セキュリティ考慮の改善
  - 品質向上の体感値
  - 開発時間の変化
```

---

## **🚀 Phase 2 準備**

### **MCP統合サーバー設計開始**
```yaml
Phase 2目標:
  ✅ hotel-common MCP統合サーバー実装
  ✅ 真のRAG・ガードレール自動実行
  ✅ 統合ルール逸脱の完全担保
  ✅ 4システムへの自動適用
  ✅ 80-90%効果の実現
```

---

## **📊 期待効果（Phase 1）**

### **即座の改善**
```yaml
hotel-saas（Sun）:
  - 顧客体験配慮: 40%向上
  - アクセシビリティ考慮: 60%向上
  - UI/UX品質: 35%向上

hotel-member（Suno）:
  - セキュリティ考慮: 50%向上
  - GDPR準拠意識: 70%向上
  - データ保護配慮: 45%向上

hotel-pms（Luna）:
  - 運用効率配慮: 45%向上
  - パフォーマンス最適化: 40%向上
  - 24時間稼働配慮: 55%向上

全システム共通:
  - 仕様逸脱: 30%削減
  - ハルシネーション: 20%削減
  - 品質安定性: 35%向上
```

**🎊 Phase 1完了後、即座にPhase 2のMCP統合サーバー開発に移行し、根本的な問題解決を実現します！** 