# 📊 Rebuild Progress Master（リビルド専用）

最終更新: 2025-11-05  
目的: リビルドの進捗をSSOT準拠で一元管理（Planeと整合）

---

## 使い方（5分）
- このファイルはリビルドの唯一の進捗サマリー（読み取り用）
- 日次のリアルタイム更新はPlane（プロジェクト: hotel-saas/hotel-common Rebuild）
- 週次にPlaneの内容をここへ集約（要旨のみ）
- フォーマットは固定。数値を更新し、根拠はPlane Issue IDを記載

**重要**: hotel-common-rebuildは**新規DBを使用**（hotel_common）  
**確定URL**: `postgresql://kaneko@localhost:5432/hotel_common`

---

## 総合サマリー（週次）
- 現在のPhase: Phase 1（新規DB作成 + テンプレート作成）
- 進捗: 0/4 → 0%（Plane: REBUILD-0（DB作成）、REBUILD-1〜3）
- エラー率: 未計測（目標 < 5%）
- ブロッカー: なし
- **重要**: 新規DB（hotel_common）を使用  
- **URL**: `postgresql://kaneko@localhost:5432/hotel_common`
- レビュー予定: 毎週月曜 10:00 JST（出席: Sun/Luna/Suno/Iza）

Plane: hotel-saas/hotel-common Rebuild（Project URL はPlane内参照）

---

## SSOT作成進捗（対象SSOTのみ抜粋）

| カテゴリ | SSOT | バージョン | 作成状況 | 備考 |
|---|---|---|---|---|
| 00_foundation | SSOT_SAAS_ADMIN_AUTHENTICATION.md | v1.3.0 | ✅ 完成 | セッション認証基盤 |
| 00_foundation | SSOT_SAAS_MULTITENANT.md | v1.6.0 | ✅ 完成 | テナント分離必須要件 |
| 01_admin_features | SSOT_SAAS_PERMISSION_SYSTEM.md | v1.3.1 | ✅ 完成 | 全管理機能の前提 |
| 01_admin_features | SSOT_SAAS_STAFF_MANAGEMENT.md | v1.2.2 | ✅ 完成 | 役割/権限連携 |
| 01_admin_features | SSOT_SAAS_ROOM_MANAGEMENT.md | v3.1.0 | ✅ 完成 | グレード/客室/翻訳 |
| 01_admin_features | SSOT_SAAS_PRICING_MANAGEMENT.md | v1.1.0 | ✅ 完成 | プラン/料金設定 |
| 01_admin_features | SSOT_SAAS_RESERVATION_MANAGEMENT.md | v1.0.0 | ❌ 未着手 | リビルド後作成 |

注: 完整合はSSOT本文参照（docs/03_ssot/...）。ここでは状態のみ管理。

---

## SSOT別 実装進捗（hotel-common / hotel-saas / テスト）

凡例: ✅ 完了 / 🟡 進行中 / ❌ 未着手

### SSOT_SAAS_ADMIN_AUTHENTICATION.md（v1.3.0）
- hotel-common: Phase1(DB): ✅ / Phase2(API): ✅ / Phase4(Test): ✅
- hotel-saas: Phase2(Proxy): ✅ / Phase3(UI): 🟡 / Phase4(Test): 🟡
- CRUD統合検証（Phase6）: ❌
- Plane: REBUILD-4 Authentication & Session（COM-3）

### SSOT_SAAS_MULTITENANT.md（v1.6.0）
- hotel-common: Phase1(DB): ✅ / Phase2(API): ✅
- hotel-saas: Phase2(Proxy): ✅ / Phase3(UI): 🟡
- CRUD統合検証: ❌
- Linear: REBUILD-5 Tenant Management（COM-4）

### SSOT_SAAS_PERMISSION_SYSTEM.md（v1.3.1）
- hotel-common: Phase1/2: ✅
- hotel-saas: Phase2/3: 🟡
- CRUD統合検証: ❌
- Linear: REBUILD-7 Permission Management（COM-6）

### SSOT_SAAS_STAFF_MANAGEMENT.md（v1.2.2）
- hotel-common: Phase1/2: 🟡
- hotel-saas: Phase2/3: 🟡
- CRUD統合検証: ❌
- Linear: REBUILD-6 Staff Management（COM-5）

### SSOT_SAAS_ROOM_MANAGEMENT.md（v3.1.0）
- hotel-common: Phase1/2: 🟡（グレードCRUDテンプレ確認対象）
- hotel-saas: Phase2/3: 🟡（プロキシテンプレ確認対象）
- CRUD統合検証: ❌（REBUILD-3で実施）
- Linear: REBUILD-1/2/3, REBUILD-9（COM-1/2/14/15）

### SSOT_SAAS_PRICING_MANAGEMENT.md（v1.1.0）
- hotel-common: Phase1/2: ❌
- hotel-saas: Phase2/3: ❌
- CRUD統合検証: ❌
- Linear: REBUILD-12（COM-16）

---

## CRUD 統合検証 進捗（Phase 6 準拠）

| 機能 | Create | Read | Update | Delete | Prisma確認 | ログエラー | 判定 |
|---|---:|---:|---:|---:|---:|---:|---|
| 客室グレード | - | - | - | - | - | - | 未実施 |
| 客室 | - | - | - | - | - | - | 未実施 |
| 予約 | - | - | - | - | - | - | 未実施 |
| 顧客 | - | - | - | - | - | - | 未実施 |
| 料金/プラン | - | - | - | - | - | - | 未実施 |

注: 実行結果はPlaneのIssueコメントに証跡（curl/スクショ/ログ）を必ず添付。

---

## ガバナンス（品質ゲート）
- SSOT準拠: PR本文にSSOTパス + 要件ID必須（Planeリンク併記）
- Lint/Typecheck: 警告0基準（--max-warnings=0）
- Test: Unit / Integration / CRUD Verify を段階実行
- セキュリティ: npm audit + secret scan（TruffleHog）
- マージ条件: 全ゲート合格 + レビュー承認

---

## メトリクス（週次）

| 指標 | 値 | 備考 |
|---|---:|---|
| 総API数 | 0 | CRUD Verify対象API数 |
| 失敗API数 | 0 | CRUD Verify失敗件数 |
| エラー率 | - | 失敗API数/総API数 |
| CI成功率 | - | 成功ワークフロー/実行ワークフロー |

### エクスポート手順（毎週月曜）
1. PlaneからIssue一覧・状態・証跡（コメント）を確認
2. CRUD Verify結果からエラー率を算出して上表を更新
3. 特記事項があれば「運用メモ」に1〜2行で追記

---

## データベース構成（rebuild環境）

```
PostgreSQL (localhost:5432)
├─ 既存DB: hotel_unified_db  ← 既存環境（hotel-common:3400）
└─ 新規DB: hotel_common ← rebuild環境（hotel-common-rebuild:3401）
   └─ URL: postgresql://kaneko@localhost:5432/hotel_common
```

**理由**:
- 既存DBへの影響を完全に排除
- データ汚染リスクゼロ
- マイグレーション履歴の整合性確保
- テストデータの完全管理

**Phase 1の最優先タスク**:
1. ✅ **新規DB作成**（hotel_common）← `postgresql://kaneko@localhost:5432/hotel_common`
2. Prismaマイグレーション実行
3. テストテナント作成
4. **動作確認**（ポート確認）
   - hotel-saas-rebuild: `http://localhost:3101`
   - hotel-common-rebuild: `http://localhost:3401`
5. Prisma Studio確認（`npx prisma studio`）

---

## 運用メモ（週次更新欄）
- 2025-11-05: **ポート設定確定**（saas-rebuild:3101, common-rebuild:3401）
- 2025-11-05: **新規DB URL確定**（`postgresql://kaneko@localhost:5432/hotel_common`）
- 2025-11-05: **新規DB使用を明記**（hotel_common）
- 2025-11-05: **Prisma Studio使用可能を追記**（開発環境）
- 2025-11-04: リビルド管理系の初版ドキュメント作成（このファイル、CIテンプレ追加）
