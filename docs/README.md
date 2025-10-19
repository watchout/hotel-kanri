# 📚 Hotel-Kanri ドキュメント

**更新日**: 2025年10月1日  
**バージョン**: 2.0.0 (認証システム統一版)

---

## 🎯 **重要なお知らせ**

### **🔄 認証システムの大幅変更**
- **変更日**: 2025年10月1日
- **内容**: JWT認証 → セッション認証への移行
- **影響**: 全システム（hotel-saas, hotel-pms, hotel-member, hotel-common）

---

## 📖 **必読ドキュメント**

### **🔐 認証システム**
1. **統一認証仕様書（マスター）** ⭐⭐⭐
   - **ファイル**: `/docs/AUTHENTICATION_MASTER_SPECIFICATION.md`
   - **内容**: セッション認証の完全仕様
   - **重要度**: 最高（実装前必読）

2. **実装統一ガイド** ⭐⭐⭐
   - **ファイル**: `/docs/IMPLEMENTATION_MASTER_GUIDE.md`
   - **内容**: 具体的な実装手順とコード例
   - **重要度**: 最高（実装時必読）

3. **JWT廃止通知** ⭐⭐
   - **ファイル**: `/docs/JWT_DEPRECATION_NOTICE.md`
   - **内容**: JWT認証廃止の詳細
   - **重要度**: 高（理解必須）

### **📋 整理・統一化**
4. **ドキュメント整理サマリー** ⭐⭐
   - **ファイル**: `/docs/DOCUMENT_CLEANUP_SUMMARY.md`
   - **内容**: ドキュメント整理の完了報告
   - **重要度**: 高（現状把握用）

---

## 🚫 **使用禁止ドキュメント**

### **JWT関連（全て廃止）**
```
❌ 使用禁止:
- /docs/01_systems/common/integration/specifications/jwt-token-specification.md
- /docs/01_systems/saas/auth/JWT_AUTH_DESIGN.md
- /docs/01_systems/common/unified-authentication-infrastructure-design.md
- その他JWT関連319ファイル
```

### **重複・矛盾ドキュメント（整理済み）**
```
❌ 使用禁止:
- 重複レガシー移行ドキュメント（削除済み）
- 矛盾する仕様書戦略（廃止済み）
- 古い実装ガイド（統一済み）
```

---

## 🗂️ **ドキュメント構造**

### **統一仕様書（Single Source of Truth）**
```
docs/
├── AUTHENTICATION_MASTER_SPECIFICATION.md    # 認証統一仕様 ⭐⭐⭐
├── IMPLEMENTATION_MASTER_GUIDE.md            # 実装統一ガイド ⭐⭐⭐
├── JWT_DEPRECATION_NOTICE.md                 # JWT廃止通知 ⭐⭐
├── DOCUMENT_CLEANUP_SUMMARY.md               # 整理サマリー ⭐⭐
└── README.md                                 # このファイル ⭐
```

### **システム別ドキュメント**
```
docs/01_systems/
├── saas/           # hotel-saas 固有仕様
├── pms/            # hotel-pms 固有仕様  
├── member/         # hotel-member 固有仕様
└── common/         # hotel-common 固有仕様
```

### **アーキテクチャ・設計**
```
docs/architecture/  # システム全体設計
docs/migration/     # 移行関連
docs/rules/         # 開発ルール
```

---

## 🎯 **開発者向けガイド**

### **新規開発者**
1. **認証仕様の理解**: `/docs/AUTHENTICATION_MASTER_SPECIFICATION.md` を熟読
2. **実装方法の習得**: `/docs/IMPLEMENTATION_MASTER_GUIDE.md` を参照
3. **禁止事項の確認**: JWT関連は一切使用禁止

### **既存開発者**
1. **変更内容の確認**: `/docs/JWT_DEPRECATION_NOTICE.md` を確認
2. **移行作業**: 既存JWT実装をセッション認証に移行
3. **統一仕様の適用**: 新しい統一仕様に従って実装

### **実装時の原則**
```
✅ 必須:
- 統一認証仕様書に従う
- セッション認証のみ使用
- 重複実装の禁止
- KISS原則の徹底

❌ 禁止:
- JWT認証の実装
- 独自認証システムの作成
- 複数認証方式の混在
- 廃止ドキュメントの参照
```

---

## 📞 **サポート・質問**

### **技術的質問**
- **認証実装**: 統一認証仕様書を参照
- **実装方法**: 実装統一ガイドを参照
- **エラー対応**: 統一エラーハンドリングを参照

### **仕様確認**
- **認証仕様**: `/docs/AUTHENTICATION_MASTER_SPECIFICATION.md`
- **実装仕様**: `/docs/IMPLEMENTATION_MASTER_GUIDE.md`
- **禁止事項**: `/docs/JWT_DEPRECATION_NOTICE.md`

### **緊急時**
- **認証障害**: セッション認証の仕様を確認
- **実装エラー**: 統一実装ガイドのトラブルシューティングを参照
- **仕様不明**: 統一仕様書で確認、不明な場合は開発チームに相談

---

## 🔄 **更新履歴**

### **v2.0.0 (2025-10-01)**
- **認証システム統一**: JWT → セッション認証
- **ドキュメント大幅整理**: 319ファイル → 5ファイルに集約
- **統一仕様書作成**: Single Source of Truth の確立

### **v1.x (〜2025-09-30)**
- **旧版**: JWT認証ベース（廃止済み）

---

**このREADMEが、Hotel-Kanriプロジェクトの統一されたドキュメント体系への入り口です。**  
**必ず統一仕様書から開始し、一貫性のある実装を心がけてください。**