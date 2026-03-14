# 🔧 技術仕様書

**このディレクトリには統合システム実装のための技術仕様書が含まれています**

---

## 🎯 **概要**

統合システムの実装に必要な技術仕様を定義しています。各システムの開発者は、この仕様に基づいて実装を行ってください。

---

## 📚 **ファイル一覧**

### **[realistic-integration-scope.md](realistic-integration-scope.md)**
- **目的**: 統合範囲の明確化
- **対象**: 全システム担当者
- **重要度**: 🚨 HIGH
- **内容**: 
  - リアルタイム同期（4項目のみ）
  - 日次バッチ処理範囲
  - JWT認証除外の決定

### **[unified-database-schema-specification.md](unified-database-schema-specification.md)**
- **目的**: データベース構造の統一仕様
- **対象**: データベース操作を行う全担当者
- **重要度**: 🚨 CRITICAL
- **内容**:
  - 統一PostgreSQLスキーマ
  - テーブル設計原則
  - インデックス戦略

### **[api-integration-specification.md](api-integration-specification.md)**
- **目的**: システム間API連携の標準仕様
- **対象**: API開発者
- **重要度**: HIGH
- **内容**:
  - RESTful API設計標準
  - 統一レスポンス形式
  - エラーコード体系

### **[system-integration-detailed-design.md](system-integration-detailed-design.md)**
- **目的**: システム間連携の詳細設計
- **対象**: システム統合担当者
- **重要度**: HIGH
- **内容**:
  - データ同期ルール
  - 権限管理
  - 競合解決

### **[jwt-token-specification.md](jwt-token-specification.md)**
- **目的**: JWT認証仕様（参考用）
- **対象**: 認証実装担当者
- **重要度**: LOW（現在除外中）
- **内容**:
  - JWT構造定義
  - 認証フロー

---

## 🎯 **役割別推奨読み順**

### **🌙 Luna（hotel-pms）**
#### **必読順序**
1. **[統一範囲定義](realistic-integration-scope.md)** - 何を統合するか
2. **[データベース仕様](unified-database-schema-specification.md)** - スキーマ構造
3. **[API仕様](api-integration-specification.md)** - API設計標準
4. **[詳細設計](system-integration-detailed-design.md)** - 実装詳細

#### **実装フェーズ**
- **Phase 1**: 統一スキーマでの新規開発
- **Phase 2**: hotel-memberとのAPI連携
- **Phase 3**: hotel-saasとのデータ連携

### **⚡ Suno（hotel-member）**
#### **必読順序**
1. **[統合範囲定義](realistic-integration-scope.md)** - 移行範囲
2. **[詳細設計](system-integration-detailed-design.md)** - 権限・データ管理
3. **[データベース仕様](unified-database-schema-specification.md)** - 移行先構造
4. **[API仕様](api-integration-specification.md)** - 連携インターフェース

#### **移行フェーズ**
- **Phase 1**: 現状分析・移行計画
- **Phase 2**: 段階的データベース移行
- **Phase 3**: API連携統合

### **☀️ Sun（hotel-saas）**
#### **必読順序**
1. **[統合範囲定義](realistic-integration-scope.md)** - 統合対象
2. **[API仕様](api-integration-specification.md)** - 連携方法
3. **[データベース仕様](unified-database-schema-specification.md)** - DB統合
4. **[詳細設計](system-integration-detailed-design.md)** - 注文連携

#### **統合フェーズ**
- **Phase 1**: MVP完成（完了済み）
- **Phase 2**: データベース統合
- **Phase 3**: 請求・顧客連携

---

## 🔍 **仕様書の使い方**

### **実装前の確認事項**
```yaml
チェックリスト:
  - [ ] realistic-integration-scope.md で対象範囲確認
  - [ ] unified-database-schema-specification.md でDB構造確認
  - [ ] api-integration-specification.md で連携方法確認
  - [ ] 不明な点は統合管理者に質問
```

### **実装中の参照方法**
- **データベース操作**: unified-database-schema-specification.md
- **API実装**: api-integration-specification.md
- **システム連携**: system-integration-detailed-design.md

### **問題発生時**
1. **仕様確認**: 該当する仕様書を再確認
2. **統合管理者相談**: 仕様の解釈について相談
3. **アップデート**: 仕様変更が必要な場合は申請

---

## 📊 **仕様の優先度**

### **🚨 CRITICAL（必須実装）**
- [realistic-integration-scope.md](realistic-integration-scope.md)
- [unified-database-schema-specification.md](unified-database-schema-specification.md)

### **📈 HIGH（重要実装）**
- [api-integration-specification.md](api-integration-specification.md)
- [system-integration-detailed-design.md](system-integration-detailed-design.md)

### **📋 MEDIUM（参考実装）**
- [jwt-token-specification.md](jwt-token-specification.md) - 現在除外中

---

## 🔄 **仕様変更管理**

### **仕様変更のプロセス**
1. **変更要求**: 統合管理者に変更理由を報告
2. **影響分析**: 他システムへの影響を調査
3. **仕様更新**: 承認後、仕様書を更新
4. **通知**: 関連担当者に変更を通知

### **バージョン管理**
- 各仕様書には最終更新日を記載
- 重要な変更はREADMEでも告知

---

## 📞 **技術相談**

### **相談内容例**
- 🤔 **実装方法の質問**: 「この仕様はどう実装すべきか？」
- 🚨 **仕様の解釈**: 「この記述の意味が分からない」
- 💡 **改善提案**: 「より良い実装方法がある」

### **相談方法**
1. **統合管理者に連絡**: 技術仕様の質問
2. **サンプルコード要求**: 具体的な実装例が欲しい場合
3. **設計レビュー**: 実装前の設計確認

---

**🔧 これらの仕様に従って、統一性のある高品質なシステムを実装しましょう！** 