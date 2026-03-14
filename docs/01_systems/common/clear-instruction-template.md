# 📋 明確な実装指示書テンプレート

**指示書ID**: {INSTRUCTION_ID}  
**対象担当者**: {ASSIGNEE_NAME}  
**発行日**: {DATE}  
**期限**: {DEADLINE}  
**管理者**: Iza（統合管理者）

---

## 🎯 **実装目標**

### **具体的な達成目標**
- [ ] {SPECIFIC_GOAL_1}
- [ ] {SPECIFIC_GOAL_2}
- [ ] {SPECIFIC_GOAL_3}

### **完了基準**
```bash
# 以下のコマンドが成功すること
{VERIFICATION_COMMAND_1}
{VERIFICATION_COMMAND_2}

# 期待される結果
{EXPECTED_RESULT}
```

---

## 📝 **詳細実装手順**

### **Step 1: 事前準備**
```bash
# 1.1 必要なディレクトリに移動
cd {TARGET_DIRECTORY}

# 1.2 現在の状況確認
{STATUS_CHECK_COMMAND}

# 1.3 バックアップ作成（必要な場合）
{BACKUP_COMMAND}
```

### **Step 2: 設定・インストール**
```bash
# 2.1 依存関係インストール
{INSTALL_COMMAND}

# 2.2 設定ファイル作成・更新
echo "{CONFIG_CONTENT}" > {CONFIG_FILE}

# 2.3 環境変数設定
{ENV_SETUP_COMMAND}
```

### **Step 3: 実装・接続**
```bash
# 3.1 メイン実装
{MAIN_IMPLEMENTATION}

# 3.2 接続確認
{CONNECTION_TEST}

# 3.3 動作確認
{FUNCTION_TEST}
```

---

## 🔗 **提供情報**

### **接続情報**
```bash
# データベース接続情報
DATABASE_URL="{DATABASE_URL}"
HOST="{HOST}"
PORT="{PORT}"
DATABASE="{DATABASE}"

# API接続情報
API_ENDPOINT="{API_ENDPOINT}"
API_KEY="{API_KEY}"

# その他必要な情報
{OTHER_INFO}
```

### **参考リソース**
- 📚 関連文書: {REFERENCE_DOCS}
- 🔧 設定例: {CONFIG_EXAMPLES}
- 🆘 ヘルプ: {HELP_RESOURCES}

---

## ⚠️ **注意事項・制約**

### **絶対に避けるべきこと**
- ❌ {FORBIDDEN_ACTION_1}
- ❌ {FORBIDDEN_ACTION_2}
- ❌ {FORBIDDEN_ACTION_3}

### **問題発生時の対応**
```bash
# エラー発生時は以下を実行してロールバック
{ROLLBACK_COMMAND}

# 問題報告方法
echo "エラー詳細: {ERROR_DETAILS}" | {REPORT_METHOD}
```

---

## 🤝 **サポート体制**

### **管理者からの支援**
- 📞 **即座サポート**: {IMMEDIATE_SUPPORT_METHOD}
- 💬 **質問・相談**: {CONSULTATION_METHOD}
- 🔧 **技術支援**: {TECHNICAL_SUPPORT}

### **困った時の連絡先**
```bash
# 緊急時
{EMERGENCY_CONTACT}

# 通常の質問
{NORMAL_CONTACT}

# 進捗報告
{PROGRESS_REPORT_METHOD}
```

---

## ✅ **完了確認プロセス**

### **担当者側の確認**
1. [ ] 全ての実装手順を完了
2. [ ] 動作確認テストを実行
3. [ ] エラーがないことを確認
4. [ ] 完了報告を送信

### **管理者側の確認**
1. [ ] 担当者からの完了報告受領
2. [ ] 実装状況の実際確認
3. [ ] 動作テストの実行
4. [ ] 統合動作の確認

### **完了報告フォーマット**
```markdown
## 実装完了報告

**担当者**: {ASSIGNEE_NAME}
**実装日**: {COMPLETION_DATE}
**実装内容**: {IMPLEMENTATION_SUMMARY}

### 動作確認結果
- [ ] {TEST_1}: ✅/❌
- [ ] {TEST_2}: ✅/❌  
- [ ] {TEST_3}: ✅/❌

### 問題・課題
{ISSUES_IF_ANY}

### 次のステップ
{NEXT_STEPS}

**署名**: {ASSIGNEE_SIGNATURE}
```

---

## 📊 **進捗管理**

### **チェックポイント**
- 🕐 **開始確認**: 実装開始から24時間以内
- 🕑 **中間確認**: 実装開始から48時間後
- 🕒 **完了確認**: 期限の24時間前
- 🕓 **最終確認**: 期限当日

### **進捗報告**
```bash
# 日次進捗報告（簡易）
echo "進捗: {PROGRESS_PERCENTAGE}% - {CURRENT_STATUS}" | {REPORT_COMMAND}
```

---

**重要**: この指示書は担当者が迷うことなく実装できるよう、全ての必要情報を含んでいます。不明な点があれば即座に管理者に連絡してください。

**責任**: 管理者（Iza）は、この指示書の内容に100%の責任を負い、担当者をサポートします。 