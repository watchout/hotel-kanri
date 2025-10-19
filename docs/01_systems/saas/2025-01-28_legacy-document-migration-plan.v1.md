# 既存ドキュメント移行実行計画

**Doc-ID**: SPEC-2025-002
**Version**: 1.0
**Status**: Active
**Owner**: 金子裕司
**Linked-Docs**: ADR-2025-002, SUM-2025-W05

---

## 📋 **概要**

hotel-saasプロジェクトの既存ドキュメント（200+ファイル）を新しいドキュメント管理フレームワークに移行するための具体的な実行計画です。

## 🎯 **移行対象分析**

### **現在のドキュメント構成**
```
docs/ (総計 200+ ファイル)
├── features/        66ファイル ← 最大のカテゴリ
├── migration/       34ファイル ← 移行・統合関連
├── api/            15ファイル ← API仕様書
├── business/       15ファイル ← ビジネス仕様
├── database/       23ファイル ← DB設計・移行
├── auth/           10ファイル ← 認証関連
├── info/           11ファイル ← インフォメーション機能
├── order/          11ファイル ← 注文機能
├── statistics/      4ファイル ← 統計機能
├── development/     5ファイル ← 開発関連
├── testing/         2ファイル ← テスト関連
├── troubleshooting/ 3ファイル ← トラブルシューティング
└── その他          20+ファイル
```

### **重要度分類結果**

#### **重要度A（優先移行）: 15ファイル**
```yaml
認証・セキュリティ:
  - docs/auth/JWT_AUTH_DESIGN.md
  - docs/auth/unified-auth-system-design.md
  - docs/architecture/DB_ACCESS_POLICY.md

API・統合:
  - docs/api/UNIFIED_API_SPECIFICATION.md
  - docs/API_SPEC.md
  - docs/websocket-integration-spec.md

アーキテクチャ:
  - docs/ARCHITECTURE.md
  - docs/ARCHITECTURE_EXPANSION_PLAN.md
  - docs/migration/PRISMA_MIGRATION_STRATEGY.md

現在参照中:
  - docs/features/INTEGRATED_HOTEL_SYSTEM_ARCHITECTURE.md
  - docs/database/README.md
  - docs/DEVELOPMENT_RULES.md
  - docs/STATUS_SUMMARY_2025.md
  - docs/PLAN_FEATURES_MATRIX.md
  - docs/requirements.md
```

#### **重要度B（統合移行）: 80ファイル**
```yaml
機能別仕様書:
  - docs/features/ 内の現行機能関連 (40ファイル)
  - docs/order/ 全ファイル (11ファイル)
  - docs/info/ 全ファイル (11ファイル)
  - docs/statistics/ 全ファイル (4ファイル)
  - docs/business/ 内の現行仕様 (8ファイル)
  - docs/database/ 内の現行設計 (6ファイル)
```

#### **重要度C（アーカイブ）: 105ファイル**
```yaml
古い・廃止済み:
  - docs/features/ 内の実装済み・廃止機能 (26ファイル)
  - docs/migration/ 内の完了済み移行計画 (30ファイル)
  - docs/business/ 内の古いビジネス案 (7ファイル)
  - docs/database/ 内の古い設計案 (17ファイル)
  - docs/api/ 内の古いAPI仕様 (10ファイル)
  - その他の実験的・検討段階資料 (15ファイル)
```

## 📅 **移行スケジュール**

### **Phase 1: 重要度A移行（1週間: 1/28-2/3）**

#### **Day 1-2: 認証・セキュリティ系**
```yaml
作業内容:
  - JWT認証設計書の統合・移行
  - DB アクセスポリシーのADR化
  - 統合認証システム設計の最新化

移行先:
  - specs/2025-01-28_jwt-authentication-system.v1.md
  - adr/2025-01-28_database-access-policy.v1.md
  - specs/2025-01-29_unified-authentication-design.v1.md
```

#### **Day 3-4: API・統合系**
```yaml
作業内容:
  - 統合API仕様書の整理・統合
  - WebSocket統合仕様の移行
  - API仕様の重複排除

移行先:
  - specs/2025-01-30_unified-api-specification.v1.md
  - specs/2025-01-30_websocket-integration-design.v1.md
```

#### **Day 5-7: アーキテクチャ系**
```yaml
作業内容:
  - システムアーキテクチャ設計書の統合
  - Prisma移行戦略のADR化
  - 拡張計画の最新化

移行先:
  - specs/2025-01-31_system-architecture.v1.md
  - adr/2025-01-31_prisma-migration-strategy.v1.md
  - specs/2025-02-01_architecture-expansion-plan.v1.md
```

### **Phase 2: 重要度B移行（2週間: 2/3-2/17）**

#### **Week 1: 機能別統合**
```yaml
注文システム (2/3-2/5):
  - docs/order/ 11ファイル → specs/2025-02-03_order-system-specification.v1.md

インフォメーション (2/5-2/7):
  - docs/info/ 11ファイル → specs/2025-02-05_information-system-specification.v1.md

統計・分析 (2/7-2/9):
  - docs/statistics/ 4ファイル → specs/2025-02-07_statistics-system-specification.v1.md
```

#### **Week 2: 大型機能統合**
```yaml
features/ディレクトリ整理 (2/10-2/14):
  - 現行機能40ファイルを機能別に統合
  - 5-8個のspec文書に集約

ビジネス仕様整理 (2/14-2/17):
  - 現行ビジネス仕様8ファイルを統合
  - 2-3個のspec文書に集約
```

### **Phase 3: 重要度C処理（1ヶ月: 2/17-3/17）**

#### **Week 1-2: アーカイブ作業**
```yaml
完了済み移行計画:
  - docs/migration/ 30ファイル → docs/legacy/archived/

実装済み機能仕様:
  - docs/features/ 26ファイル → docs/legacy/archived/

古いビジネス案:
  - docs/business/ 7ファイル → docs/legacy/archived/
```

#### **Week 3-4: 最終整理**
```yaml
重複排除:
  - 同一情報の重複ファイル削除
  - 参照リンクの最終確認

品質確認:
  - 移行済みドキュメントの品質チェック
  - Linked-Docs整合性確認
```

## 🔧 **移行作業手順**

### **標準移行プロセス**

#### **Step 1: 事前分析**
```bash
# 対象ファイルの内容確認
cat docs/target-file.md

# 関連ファイルの特定
grep -r "target-file" docs/

# 参照元の確認
find . -name "*.md" -exec grep -l "target-file" {} \;
```

#### **Step 2: 内容統合**
```yaml
作業内容:
  1. 関連ファイルの内容を統合
  2. 重複情報の排除
  3. 古い情報の更新
  4. 新形式への変換
```

#### **Step 3: 品質確認**
```yaml
チェック項目:
  - [ ] Doc-ID付与済み
  - [ ] Version情報正確
  - [ ] Status適切
  - [ ] Owner明記
  - [ ] Linked-Docs整備
  - [ ] 内容の正確性確認
  - [ ] 重複情報排除
```

#### **Step 4: リンク更新**
```bash
# 参照元ファイルの更新
sed -i 's|docs/old-file.md|specs/2025-01-XX_new-file.v1.md|g' docs/**/*.md

# 参照確認
grep -r "old-file" docs/
```

### **統合作業の指針**

#### **情報統合ルール**
1. **最新情報優先**: 複数バージョンがある場合は最新を採用
2. **実装状況反映**: 現在の実装状況に合わせて更新
3. **重複排除**: 同じ情報は1箇所にまとめる
4. **関連性明確化**: Linked-Docsで関係性を明示

#### **品質基準**
- **完全性**: 必要な情報が全て含まれている
- **正確性**: 現在の実装・仕様と一致している
- **一貫性**: 他のドキュメントと矛盾がない
- **可読性**: 構造化され、理解しやすい

## 📊 **進捗管理**

### **移行状況トラッキング表**
```yaml
ファイル名: migration-progress.yaml
内容:
  - original_path: docs/auth/JWT_AUTH_DESIGN.md
    target_doc_id: SPEC-2025-003
    target_path: specs/2025-01-28_jwt-authentication-system.v1.md
    status: completed
    assignee: 金子裕司
    completed_date: 2025-01-28
    notes: 統合認証設計と統合済み

  - original_path: docs/features/CAMPAIGN_SYSTEM.md
    target_doc_id: SPEC-2025-004
    target_path: specs/2025-02-03_campaign-system-specification.v1.md
    status: in_progress
    assignee: 金子裕司
    completed_date: null
    notes: order-systemと統合予定
```

### **品質メトリクス**
```yaml
移行品質指標:
  - 移行完了率: 0% → 100%
  - Doc-ID付与率: 100%
  - Linked-Docs整備率: 100%
  - 重複排除率: 90%以上
  - 参照リンク正常率: 100%
```

## 🚨 **リスク管理**

### **高リスク項目**
1. **重要情報の見落とし**
   - **対策**: 移行前の詳細レビュー
   - **確認者**: 金子裕司

2. **参照リンクの切れ**
   - **対策**: legacy/ディレクトリでの既存ファイル保持
   - **確認**: 自動リンクチェック

3. **情報の劣化**
   - **対策**: 移行時の内容検証
   - **品質保証**: チェックリスト活用

### **緊急時対応**
```yaml
問題発生時:
  1. 作業を一時停止
  2. 問題の詳細記録
  3. legacy/から元ファイル復旧
  4. 原因分析と対策検討
  5. 修正後に作業再開
```

## ✅ **完了基準**

### **Phase完了条件**
- [ ] 対象ファイル100%処理完了
- [ ] 新形式ドキュメント品質チェック完了
- [ ] 参照リンク更新完了
- [ ] 進捗トラッキング表更新完了

### **全体完了条件**
- [ ] 全移行対象ファイル処理完了
- [ ] legacy/ディレクトリ整理完了
- [ ] ドキュメント検索性向上確認
- [ ] 新しい管理フレームワーク運用開始

## 🎊 **期待効果**

### **短期効果（1ヶ月後）**
- ドキュメント検索時間50%短縮
- 重複情報90%削減
- 新規ドキュメント作成効率向上

### **長期効果（6ヶ月後）**
- プロジェクト管理効率200%向上
- 新メンバーオンボーディング時間30%短縮
- ドキュメント保守コスト70%削減

---

## 📋 **次のアクション**

1. **Phase 1開始**: 重要度Aドキュメントの移行作業開始
2. **進捗管理**: 移行状況トラッキング表の作成・運用
3. **品質保証**: 移行済みドキュメントの品質チェック実施
