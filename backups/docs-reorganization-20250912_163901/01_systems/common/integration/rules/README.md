# 📋 統合運用ルール

**このディレクトリには各担当者が必ず守るべき運用ルールが含まれています**

---

## 🚨 **必読度：CRITICAL**

### **最優先で読むべきファイル**
1. **[unified-database-management-rules.md](unified-database-management-rules.md)** - 🚨 **最重要**
   - 統一データベースの管理ルール
   - スキーマ変更の申請プロセス
   - 絶対禁止事項
   - **全担当者必読・必守**

---

## 📚 **ファイル一覧**

### **[unified-database-management-rules.md](unified-database-management-rules.md)**
- **対象**: Luna, Suno, Sun（全担当者）
- **内容**: 統一データベース操作の基本ルール
- **重要度**: 🚨 CRITICAL
- **必読理由**: 違反はシステム全停止につながる

### **[development-governance.md](development-governance.md)**
- **対象**: 全開発者
- **内容**: 開発品質管理ルール
- **重要度**: HIGH
- **カバー範囲**: コード品質、API準拠、DB整合性

### **[integration-management-governance.md](integration-management-governance.md)**
- **対象**: 統合管理者、各システム担当者
- **内容**: 統合管理の方針とプロセス
- **重要度**: HIGH
- **カバー範囲**: 虚偽報告防止、検証システム

### **[api-standardization-guide.md](api-standardization-guide.md)**
- **対象**: API開発者
- **内容**: API標準化の実装手順
- **重要度**: MEDIUM
- **カバー範囲**: レスポンス形式、エラーコード、RESTful設計

---

## 🎯 **役割別の必読ファイル**

### **🌙 Luna（hotel-pms）**
1. ✅ **[統一データベース管理ルール](unified-database-management-rules.md)** - 必読
2. ✅ **[開発ガバナンス](development-governance.md)** - 品質管理
3. ✅ **[API標準化ガイド](api-standardization-guide.md)** - API実装

### **⚡ Suno（hotel-member）**
1. ✅ **[統一データベース管理ルール](unified-database-management-rules.md)** - 必読
2. ✅ **[開発ガバナンス](development-governance.md)** - 品質管理
3. ✅ **[統合管理ガバナンス](integration-management-governance.md)** - 移行管理

### **☀️ Sun（hotel-saas）**
1. ✅ **[統一データベース管理ルール](unified-database-management-rules.md)** - 必読
2. ✅ **[開発ガバナンス](development-governance.md)** - 品質管理
3. ✅ **[API標準化ガイド](api-standardization-guide.md)** - API実装

---

## ⚠️ **重要な注意事項**

### **ルール違反の影響**
```
個人の判断ミス → 全システム停止 → 全ホテル業務停止
```

### **必ず守るべき3つの原則**
1. **🚫 勝手にスキーマを変更しない**
2. **📝 変更は必ず申請する**
3. **🆘 困ったら即座に相談する**

---

## 📞 **質問・相談**

ルールについて不明な点がある場合：
1. **事前相談**: 実装前に統合管理者に相談
2. **緊急時**: 即座に統合管理者に連絡
3. **定期確認**: ルールの理解度確認

---

**🎯 これらのルールを守ることで、安定した統合システムを維持できます** 