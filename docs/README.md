# Hotel-Kanri ドキュメント

**更新日**: 2026年1月23日
**バージョン**: 3.0.0

---

## ドキュメント現状

<<<<<<< HEAD
| 項目 | 数値 |
|:-----|-----:|
| 総Markdownファイル数 | 約1,283 |
| 総サイズ | 約13.4 MB |
| ディレクトリ数 | 約146 |

> **注意**: 過去のREADMEでは「319ファイル → 5ファイルに集約」と記載されていましたが、
> 実態は1,283ファイル以上が存在します。本READMEは実態に合わせて更新されました。
=======
### **🔄 認証システムの大幅変更**

- **変更日**: 2025年10月1日
- **内容**: JWT認証 → セッション認証への移行
- **影響**: 全システム（hotel-saas, hotel-pms, hotel-member, hotel-common）
>>>>>>> origin/main

---

## ドキュメント優先順位（正式な参照順序）

<<<<<<< HEAD
### 1. SSOT（Single Source of Truth）- 最高権威
=======
### **🔐 認証システム**

1. **統一認証仕様書（マスター）** ⭐⭐⭐
   - **ファイル**: `/docs/AUTHENTICATION_MASTER_SPECIFICATION.md`
   - **内容**: セッション認証の完全仕様
   - **重要度**: 最高（実装前必読）
>>>>>>> origin/main

**仕様の正式定義は `docs/03_ssot/` を参照してください。**

```
docs/03_ssot/
├── 00_foundation/          # 基盤仕様
│   ├── SSOT_SAAS_ADMIN_AUTHENTICATION.md   # 認証仕様（正）
│   ├── SSOT_SAAS_DEVICE_AUTHENTICATION.md  # デバイス認証（正）
│   ├── SSOT_SAAS_DATABASE_SCHEMA.md        # DBスキーマ（正）
│   ├── SSOT_SAAS_MULTITENANT.md            # マルチテナント（正）
│   └── ...
├── 01_admin_features/      # 管理機能仕様
├── 02_guest_features/      # ゲスト機能仕様
└── README.md               # SSOT全体ガイド
```

<<<<<<< HEAD
### 2. 標準・ルール（同格で優先）

| ディレクトリ | 用途 |
|:------------|:-----|
| `docs/standards/` | コーディング規約、命名規則（例: `DATABASE_NAMING_STANDARD.md`） |
| `docs/ops/` | 運用手順、デプロイ手順 |
| `docs/adr/` | アーキテクチャ決定記録（ADR） |

### 3. 参考資料（矛盾時はSSOTが優先）

| ディレクトリ | 説明 |
|:------------|:-----|
| `docs/01_systems/` | システム別の設計資料・作業ログ（参考扱い） |
| `docs/*MASTER*.md` | 旧マスター文書（SSOTに統合済み） |
=======
### **📋 整理・統一化**

1. **ドキュメント整理サマリー** ⭐⭐
   - **ファイル**: `/docs/DOCUMENT_CLEANUP_SUMMARY.md`
   - **内容**: ドキュメント整理の完了報告
   - **重要度**: 高（現状把握用）
>>>>>>> origin/main

---

## 01_systems/ の扱いについて

<<<<<<< HEAD
**方針: 削除禁止・アーカイブ方針**

`docs/01_systems/` には約800ファイル以上の設計資料・作業ログが存在します。
これらは以下の方針で管理されます：

1. **削除は行わない**: 過去の経緯や意思決定の記録として保持
2. **アーカイブ対象**: 段階的に `docs/_archived_system_docs/` へ移動予定
3. **矛盾時の扱い**: `docs/03_ssot/` の内容を正とする
4. **参照時の注意**: 日付プレフィックス付きファイルは特に古い可能性あり

### アーカイブ移動の条件（Phase 2で実施予定）

- 移動前に参照関係を検索
- 移動後の導線（README/INDEX）を用意
- JWT等の廃止仕様は「廃止」ラベル付きでアーカイブ
=======
### **JWT関連（全て廃止）**

```text
❌ 使用禁止:
- /docs/01_systems/common/integration/specifications/jwt-token-specification.md
- /docs/01_systems/saas/auth/JWT_AUTH_DESIGN.md
- /docs/01_systems/common/unified-authentication-infrastructure-design.md
- その他JWT関連319ファイル
```text

### **重複・矛盾ドキュメント（整理済み）**

```text
❌ 使用禁止:
- 重複レガシー移行ドキュメント（削除済み）
- 矛盾する仕様書戦略（廃止済み）
- 古い実装ガイド（統一済み）
```text
>>>>>>> origin/main

---

## 認証仕様について

<<<<<<< HEAD
**正式な認証仕様は `docs/03_ssot/00_foundation/` を参照してください。**

| ファイル | 用途 |
|:---------|:-----|
| `SSOT_SAAS_ADMIN_AUTHENTICATION.md` | 管理者認証（セッション認証） |
| `SSOT_SAAS_DEVICE_AUTHENTICATION.md` | デバイス認証 |
| `SSOT_SAAS_AUTHENTICATION.md` | 認証全般 |

> **注意**: `/docs/AUTHENTICATION_MASTER_SPECIFICATION.md` など旧マスター文書は
> 参考資料扱いです。矛盾がある場合はSSOTを正とします。
=======
### **統一仕様書（Single Source of Truth）**

```text
docs/
├── AUTHENTICATION_MASTER_SPECIFICATION.md    # 認証統一仕様 ⭐⭐⭐
├── IMPLEMENTATION_MASTER_GUIDE.md            # 実装統一ガイド ⭐⭐⭐
├── JWT_DEPRECATION_NOTICE.md                 # JWT廃止通知 ⭐⭐
├── DOCUMENT_CLEANUP_SUMMARY.md               # 整理サマリー ⭐⭐
└── README.md                                 # このファイル ⭐
```text

### **システム別ドキュメント**

```text
docs/01_systems/
├── saas/           # hotel-saas 固有仕様
├── pms/            # hotel-pms 固有仕様  
├── member/         # hotel-member 固有仕様
└── common/         # hotel-common 固有仕様
```text

### **アーキテクチャ・設計**

```text
docs/architecture/  # システム全体設計
docs/migration/     # 移行関連
docs/rules/         # 開発ルール
```text
>>>>>>> origin/main

---

## データベース命名規則について

<<<<<<< HEAD
| 種別 | 正式ドキュメント |
|:-----|:----------------|
| 命名規則（ルール） | `docs/standards/DATABASE_NAMING_STANDARD.md` |
| スキーマ定義（構造） | `docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md` |
=======
### **新規開発者**

1. **認証仕様の理解**: `/docs/AUTHENTICATION_MASTER_SPECIFICATION.md` を熟読
2. **実装方法の習得**: `/docs/IMPLEMENTATION_MASTER_GUIDE.md` を参照
3. **禁止事項の確認**: JWT関連は一切使用禁止

### **既存開発者**

1. **変更内容の確認**: `/docs/JWT_DEPRECATION_NOTICE.md` を確認
2. **移行作業**: 既存JWT実装をセッション認証に移行
3. **統一仕様の適用**: 新しい統一仕様に従って実装

### **実装時の原則**

```text
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
```text
>>>>>>> origin/main

---

## アクティブなシステム

<<<<<<< HEAD
現在アクティブなシステム:

| システム | リポジトリ | 状態 |
|:---------|:-----------|:-----|
| hotel-saas-rebuild | フロントエンド + APIプロキシ | アクティブ |
| hotel-common-rebuild | API基盤 + DB層 | アクティブ |

> **注意**: `hotel-pms`, `hotel-member` の状態は別途確認が必要です。
=======
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
>>>>>>> origin/main

---

## 開発者向けガイド

<<<<<<< HEAD
### 新規開発者

1. `CLAUDE.md`（プロジェクトルート）を確認
2. `docs/03_ssot/README.md` でSSOT構造を把握
3. 実装対象のSSOTを読んでから着手

### 実装時の原則

- **仕様確認**: まず `docs/03_ssot/` を確認
- **ルール確認**: `docs/standards/` でコーディング規約を確認
- **矛盾発見時**: SSOTを正とし、矛盾を報告

---

## 更新履歴

### v3.0.0 (2026-01-23)
- READMEを実態に合わせて全面更新
- SSOT優先の明文化
- 01_systemsのアーカイブ方針を明記
- ファイル数の訂正（319→1,283）

### v2.0.0 (2025-10-01)
- 認証システム統一: JWT → セッション認証

### v1.x (〜2025-09-30)
- 旧版: JWT認証ベース（廃止済み）
=======
### **v2.0.0 (2025-10-01)**

- **認証システム統一**: JWT → セッション認証
- **ドキュメント大幅整理**: 319ファイル → 5ファイルに集約
- **統一仕様書作成**: Single Source of Truth の確立

### **v1.x (〜2025-09-30)**

- **旧版**: JWT認証ベース（廃止済み）

---

**このREADMEが、Hotel-Kanriプロジェクトの統一されたドキュメント体系への入り口です。**  
**必ず統一仕様書から開始し、一貫性のある実装を心がけてください。**
>>>>>>> origin/main
