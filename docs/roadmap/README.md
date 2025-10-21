# 📊 ロードマップ管理

**最終更新**: 2025年10月21日

---

## 🎯 唯一のロードマップ

**hotel-kanriプロジェクトのロードマップは1つだけです：**

📍 **`/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md`**

このファイルが**唯一の進捗管理・ロードマップファイル**です。

---

## 📋 SSOT_PROGRESS_MASTER.mdの内容

### 全体構成

1. **全体進捗サマリー**
   - 現在のPhase
   - システム稼働率
   - 次のマイルストーン

2. **Phase別詳細ロードマップ**
   - Phase 0: 緊急エラー対応（✅ 完了）
   - Phase 1: 基盤完成（4週間）
   - Phase 2: 客室端末完成（3週間）
   - Phase 3: AIチャット完成（2週間）
   - Phase 4: 多言語・監視（2週間）
   - Phase 5: 拡張機能（2週間）

3. **SSOT作成状況**
   - 00_foundation/（12/14完成）
   - 01_admin_features/（20/20完成）
   - 02_guest_features/（4/10完成）
   - 03_business_features/（0/4完成）
   - 04_monitoring/（0/4完成）

4. **マイルストーン定義**
   - M0: Phase 0完了（✅ 達成）
   - M1: Phase 1完了（目標: 2025-11-11）
   - M2: Phase 2完了（目標: 2025-12-02）
   - M3: Phase 3完了（目標: 2025-12-16）
   - M4: Phase 4完了（目標: 2025-12-30）
   - M5: Phase 5完了（目標: 2026-01-13）

5. **リスク管理**
   - Critical リスク
   - High リスク
   - 対策

6. **次のアクション**
   - Phase別の具体的タスク

---

## 🔄 Linear統合

### 統合スクリプト

`SSOT_PROGRESS_MASTER.md`とLinearは以下のスクリプトで統合されています：

- **`scripts/linear/migrate-to-linear.js`**: 初回データ移行
- **`scripts/linear/sync-roadmap-to-linear.js`**: 順序・優先度の同期
- **`scripts/linear/export-from-linear.js`**: 週次エクスポート
- **`scripts/linear/check-roadmap-sync.js`**: 同期状態確認

### 運用フロー

```
SSOT_PROGRESS_MASTER.md
  ↓（初回移行）
Linear Issues
  ↓（週次エクスポート）
docs/03_ssot/_linear_exports/
  ↓（月次レビュー）
SSOT_PROGRESS_MASTER.md 更新
```

---

## ❌ 非推奨ファイル

以下のファイルは**使用しないでください**：

- ❌ `current-roadmap.md` → アーカイブ済み（2025-10-21）
- ❌ 各システム内の個別ロードマップ → 削除済み
- ❌ 他のMarkdownでの進捗管理 → 禁止

---

## 📖 詳細参照

- **SSOT_PROGRESS_MASTER.md**: `/Users/kaneko/hotel-kanri/docs/03_ssot/SSOT_PROGRESS_MASTER.md`
- **Linear連携ガイド**: `/Users/kaneko/hotel-kanri/scripts/linear/README.md`
- **LINEAR_SETUP_GUIDE.md**: `/Users/kaneko/hotel-kanri/docs/03_ssot/00_foundation/LINEAR_SETUP_GUIDE.md`

---

## 🚨 重要なルール

### `.cursorrules`より引用

> ⚠️ **重要**: `SSOT_PROGRESS_MASTER.md`が唯一の進捗管理・ロードマップファイルです。他のファイルで進捗を管理してはいけません。

### 更新ルール

1. **SSOT作成開始時**: ステータスを「🟡 作成中」に変更
2. **SSOT完成時**: ステータスを「✅ 完成」に変更、バージョン記録
3. **実ファイルベースで確認**: Ground Truth原則
4. **毎日更新**: 作業終了時に必ず更新
5. **最終更新日を記録**: 変更があった場合は必ず日付を記録

---

**管理者**: 統合管理  
**最終更新**: 2025年10月21日  
**バージョン**: 1.0.0

