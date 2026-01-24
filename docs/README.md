# Hotel-Kanri ドキュメント

**更新日**: 2026年1月23日
**バージョン**: 3.0.0

---

## ドキュメント現状

| 項目 | 数値 |
|:-----|-----:|
| 総Markdownファイル数 | 約1,283 |
| 総サイズ | 約13.4 MB |
| ディレクトリ数 | 約146 |

> **注意**: 過去のREADMEでは「319ファイル → 5ファイルに集約」と記載されていましたが、
> 実態は1,283ファイル以上が存在します。本READMEは実態に合わせて更新されました。

---

## ドキュメント優先順位（正式な参照順序）

### 1. SSOT（Single Source of Truth）- 最高権威

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

---

## 01_systems/ の扱いについて

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

---

## 認証仕様について

**正式な認証仕様は `docs/03_ssot/00_foundation/` を参照してください。**

| ファイル | 用途 |
|:---------|:-----|
| `SSOT_SAAS_ADMIN_AUTHENTICATION.md` | 管理者認証（セッション認証） |
| `SSOT_SAAS_DEVICE_AUTHENTICATION.md` | デバイス認証 |
| `SSOT_SAAS_AUTHENTICATION.md` | 認証全般 |

> **注意**: `/docs/AUTHENTICATION_MASTER_SPECIFICATION.md` など旧マスター文書は
> 参考資料扱いです。矛盾がある場合はSSOTを正とします。

---

## データベース命名規則について

| 種別 | 正式ドキュメント |
|:-----|:----------------|
| 命名規則（ルール） | `docs/standards/DATABASE_NAMING_STANDARD.md` |
| スキーマ定義（構造） | `docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md` |

---

## アクティブなシステム

現在アクティブなシステム:

| システム | リポジトリ | 状態 |
|:---------|:-----------|:-----|
| hotel-saas-rebuild | フロントエンド + APIプロキシ | アクティブ |
| hotel-common-rebuild | API基盤 + DB層 | アクティブ |

> **注意**: `hotel-pms`, `hotel-member` の状態は別途確認が必要です。

---

## 開発者向けガイド

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