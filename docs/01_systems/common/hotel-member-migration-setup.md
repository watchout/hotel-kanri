# 🚀 hotel-member移行 実行手順書

**実行前必読**: hotel-memberのPostgreSQL統一基盤移行の具体的な実行手順

---

## 📋 **前提条件**

### **必要な環境**
- Node.js 18+ がインストール済み
- PostgreSQL 14+ がインストール済み
- hotel-commonプロジェクトセットアップ完了
- hotel-memberプロジェクトアクセス権限

### **確認事項**
- [ ] hotel-commonのPostgreSQL統一基盤が稼働中
- [ ] hotel-memberの現在のデータベースにアクセス可能
- [ ] 移行作業の時間枠確保（推定2-3時間）
- [ ] バックアップ・ロールバック手順の理解

---

## 🔧 **セットアップ**

### **Step 1: 依存関係インストール**
```bash
# hotel-commonディレクトリで実行
cd /path/to/hotel-common
npm install

# commanderパッケージが不足している場合
npm install commander@^12.0.0 ts-node@^10.9.0
```

### **Step 2: 環境変数設定**
```bash
# .envファイルに追加
echo "MEMBER_DB_HOST=localhost" >> .env
echo "MEMBER_DB_PORT=5432" >> .env
echo "MEMBER_DB_NAME=hotel_member" >> .env
echo "TENANT_ID=sample-hotel-tenant" >> .env
```

### **Step 3: 実行権限確認**
```bash
# 移行ツールの動作確認
npm run migration:member -- --help
```

---

## 🚀 **移行実行**

### **Phase 1: 移行準備（2025年2月第1週）**

#### **1.1 移行準備実行**
```bash
# 完全な準備作業実行
npm run migration:member:prepare

# ログ出力確認
# ✅ データベース接続テスト完了
# ✅ データ分析完了
# ✅ バックアップ作成完了
# ✅ 統一基盤準備確認完了
```

#### **1.2 移行前ステータス確認**
```bash
npm run migration:member:status
# 出力例：
# 移行段階: 準備段階
# 進捗: 0%
# 次のアクション: 移行実行準備完了
```

### **Phase 2: データ移行実行（2025年2月第4週）**

#### **2.1 ドライラン実行（テスト）**
```bash
# 実際の移行は行わず、シミュレーションのみ
npm run migration:member execute -- --dry-run

# 特定テーブルのみテスト
npm run migration:member execute -- --dry-run --table users
```

#### **2.2 実際の移行実行**
```bash
# ⚠️ 重要: 必ずバックアップ確認後に実行
npm run migration:member:execute

# 実行ログ例：
# 🚀 hotel-memberデータ移行を開始します...
# 📦 users → customers 移行中...
# ✅ users 移行完了
# 📦 ranks → customer_ranks 移行中...
# ✅ ranks 移行完了
# ✅ 移行完了
```

#### **2.3 データ検証**
```bash
# 移行データの整合性確認
npm run migration:member:validate

# 検証項目：
# - 顧客数の一致確認
# - ポイント履歴の整合性
# - ランク情報のマッピング確認
# - 予約データのリンク確認
```

### **Phase 3: ガバナンス適用（2025年3月第1週）**

#### **3.1 Level 1ガバナンス設定**
```bash
# hotel-commonでガバナンス設定更新
npm run governance:check

# hotel-memberをLevel 1に移行
npm run governance:update -- --system hotel-member --level 1
```

#### **3.2 移行完了確認**
```bash
# 最終ステータス確認
npm run migration:member:status
# 期待される出力：
# 移行段階: 完了
# 進捗: 100%
# ガバナンスレベル: Level 1
```

---

## 🚨 **トラブルシューティング**

### **よくある問題と解決方法**

#### **問題1: commander モジュールエラー**
```bash
Error: Cannot find module 'commander'
```
**解決方法:**
```bash
npm install commander@^12.0.0
npm install @types/commander@^12.0.0 --save-dev
```

#### **問題2: データベース接続エラー**
```bash
Error: データベース接続エラー
```
**解決方法:**
```bash
# PostgreSQL接続確認
psql -h localhost -p 5432 -d hotel_unified_db -U kaneko

# .env設定確認
cat .env | grep DATABASE_URL
cat .env | grep MEMBER_DB
```

#### **問題3: 移行データ不整合**
```bash
❌ 重要なデータ不整合が検出されました
```
**解決方法:**
```bash
# 即座にロールバック実行
npm run migration:member:rollback -- --backup-id backup-2025-02-01

# 原因調査・修正後に再実行
```

### **緊急時対応**

#### **移行中断が必要な場合**
1. **Ctrl+C** で移行プロセス停止
2. ロールバック実行
3. 状況報告・原因調査

#### **データ破損が疑われる場合**
1. **即座に移行停止**
2. **バックアップからの復旧**
3. **全システム停止・影響範囲確認**

---

## ✅ **移行完了チェックリスト**

### **データ移行確認**
- [ ] 全テーブルのデータ移行完了
- [ ] レコード数の一致確認
- [ ] 主要機能の動作確認
- [ ] エラーログの確認

### **システム連携確認**
- [ ] hotel-pmsとの予約データ連携
- [ ] hotel-saasとの顧客データ参照
- [ ] 統一API経由でのデータアクセス
- [ ] ソーストラッキングの記録確認

### **ガバナンス確認**
- [ ] Level 1監視の適用確認
- [ ] 非ブロッキング警告の動作確認
- [ ] 統一API使用の推奨警告
- [ ] フォールバック機能の動作確認

### **運用確認**
- [ ] パフォーマンス指標の正常値維持
- [ ] システム監査ログの記録
- [ ] バックアップ・復旧手順の再確認
- [ ] 移行ドキュメントの更新

---

## 📞 **サポート・連絡先**

### **移行作業中のサポート**
- **hotel-common統合管理者**: 技術的支援・エスカレーション
- **プロジェクトマネージャー**: 進捗管理・意思決定
- **システム管理者**: インフラ・権限・緊急対応

### **段階移行スケジュール参照**
- 詳細スケジュール: `docs/staged-governance-roadmap.md`
- 移行ガイド: `docs/hotel-member-migration-guide.md`
- API統合仕様: `docs/api-integration-specification.md`

---

## 🎉 **移行完了後の次のステップ**

1. **hotel-saas移行の準備** (2025年3月-4月予定)
2. **統一認証基盤の本格導入**
3. **Event-driven連携の実装**
4. **監視・運用体制の強化**

---

この手順書に従って安全に移行作業を進めてください。不明な点がある場合は、必ず移行前にサポートチームにご相談ください。 