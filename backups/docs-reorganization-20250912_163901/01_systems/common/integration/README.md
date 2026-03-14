# 🏢 ホテルシステム統合ドキュメント

**統合管理者**: ユーザー  
**対象システム**: hotel-saas, hotel-member, hotel-pms, hotel-common  
**最終更新**: 2025年1月25日

---

## 🚨 **新しく参加される方へ（必読）**

### **最初に読むべき3つのドキュメント**
1. 📋 **[統一データベース管理ルール](rules/unified-database-management-rules.md)** - 🚨 CRITICAL
2. 📋 **[開発ガバナンス](rules/development-governance.md)** - 品質管理ルール
3. 🔧 **[現実的統合範囲](specifications/realistic-integration-scope.md)** - 何を統合するか

---

## 👥 **役割別クイックアクセス**

### **🌙 Luna（hotel-pms担当）**
#### **📋 必読**
- [統一データベース管理ルール](rules/unified-database-management-rules.md)
- [Luna緊急統合指示書](guides/Luna_Emergency_Integration_Instructions.md)

#### **🔧 技術仕様**
- [統一データベーススキーマ仕様](specifications/unified-database-schema-specification.md)
- [システム間詳細設計](specifications/system-integration-detailed-design.md)

#### **📖 実装ガイド**
- [マイグレーションロードマップ](guides/migration-roadmap.md)

---

### **⚡ Suno（hotel-member担当）**
#### **📋 必読**
- [統一データベース管理ルール](rules/unified-database-management-rules.md)
- [Suno緊急統合指示書](guides/Suno_Emergency_Integration_Instructions.md)

#### **📖 移行ガイド**
- [hotel-member移行ガイド](guides/hotel-member-migration-guide.md)
- [マイグレーションロードマップ](guides/migration-roadmap.md)

#### **🔧 技術仕様**
- [API統合仕様](specifications/api-integration-specification.md)

---

### **☀️ Sun（hotel-saas担当）**
#### **📋 必読**
- [統一データベース管理ルール](rules/unified-database-management-rules.md)

#### **📖 統合ガイド**
- [hotel-saas緊急統合計画](guides/hotel-saas-urgent-integration-plan.md)
- [マイグレーションロードマップ](guides/migration-roadmap.md)

#### **🔧 技術仕様**
- [現実的統合範囲](specifications/realistic-integration-scope.md)

---

## 📁 **ディレクトリ構成**

```
integration/
├── 📋 rules/           # 運用ルール（必読）
├── 🔧 specifications/  # 技術仕様書
├── 📖 guides/          # 実装ガイド
├── 🏛️ governance/      # 管理・ガバナンス
└── 📄 README.md        # このファイル
```

### **📋 [rules/](rules/) - 運用ルール（各担当者必読）**
- **[unified-database-management-rules.md](rules/unified-database-management-rules.md)** - 🚨 最重要
- [development-governance.md](rules/development-governance.md) - 開発品質管理
- [integration-management-governance.md](rules/integration-management-governance.md) - 統合管理方針
- [api-standardization-guide.md](rules/api-standardization-guide.md) - API標準化

### **🔧 [specifications/](specifications/) - 技術仕様書**
- [realistic-integration-scope.md](specifications/realistic-integration-scope.md) - 統合範囲定義
- [unified-database-schema-specification.md](specifications/unified-database-schema-specification.md) - DB仕様
- [api-integration-specification.md](specifications/api-integration-specification.md) - API仕様
- [system-integration-detailed-design.md](specifications/system-integration-detailed-design.md) - 詳細設計
- [jwt-token-specification.md](specifications/jwt-token-specification.md) - JWT仕様

### **📖 [guides/](guides/) - 実装ガイド**
- [migration-roadmap.md](guides/migration-roadmap.md) - 全体ロードマップ
- [hotel-member-migration-guide.md](guides/hotel-member-migration-guide.md) - Member移行手順
- [hotel-saas-urgent-integration-plan.md](guides/hotel-saas-urgent-integration-plan.md) - SaaS統合計画
- [Luna_Emergency_Integration_Instructions.md](guides/Luna_Emergency_Integration_Instructions.md) - Luna向け指示書
- [Suno_Emergency_Integration_Instructions.md](guides/Suno_Emergency_Integration_Instructions.md) - Suno向け指示書

### **🏛️ [governance/](governance/) - 管理・ガバナンス**
- [Integration_Management_Matrix.md](governance/Integration_Management_Matrix.md) - 統合状況管理
- [Integration_Database_Complete_Analysis.md](governance/Integration_Database_Complete_Analysis.md) - 現状分析
- [Complete_Integration_Final_Model.md](governance/Complete_Integration_Final_Model.md) - 最終モデル
- [staged-governance-roadmap.md](governance/staged-governance-roadmap.md) - 段階的移行

---

## 🚨 **緊急時アクセス**

### **システム停止時**
1. 📋 [統一データベース管理ルール - 緊急時対応](rules/unified-database-management-rules.md#緊急時対応)
2. 🆘 統合管理者に即座連絡

### **スキーマ変更申請**
1. 📋 [申請書テンプレート](rules/unified-database-management-rules.md#申請書テンプレート)
2. 統合管理者に提出

### **エラー・問題発生時**
1. **即座停止**: 問題のある操作を中断
2. **ログ保存**: エラーログを保存
3. **状況報告**: 統合管理者に連絡
4. **待機**: 指示があるまで追加操作禁止

---

## 📞 **連絡先**

- **統合管理者**: [連絡方法]
- **緊急時**: [緊急連絡先]
- **技術相談**: [技術相談窓口]

---

## 🎯 **統合作業の進め方**

### **Step 1: ルール理解**
1. 📋 [統一データベース管理ルール](rules/unified-database-management-rules.md) を必読
2. 不明点は統合管理者に質問

### **Step 2: 現状把握**
1. 🏛️ [現状分析](governance/Integration_Database_Complete_Analysis.md) で全体像把握
2. 📖 [ロードマップ](guides/migration-roadmap.md) でスケジュール確認

### **Step 3: 実装開始**
1. 役割別ガイドに従って作業開始
2. スキーマ変更は必ず申請
3. 定期的な進捗報告

---

**🎉 統合システムで安定したホテル運営システムを実現しましょう！** 