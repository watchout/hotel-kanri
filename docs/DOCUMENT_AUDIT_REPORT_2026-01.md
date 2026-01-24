# ドキュメント詳細調査レポート

**調査日**: 2026年1月22日
**調査者**: Claude Code
**ステータス**: 要フィードバック

---

## 概要統計

| 項目 | 数値 |
|:-----|-----:|
| 総Markdownファイル数 | 1,283 |
| 総サイズ | 13.4 MB |
| ディレクトリ数 | 146 |
| READMEファイル数 | 28 |
| アーカイブディレクトリ数 | 3 |

### ディレクトリ別ファイル数

| ディレクトリ | ファイル数 | 備考 |
|:------------|----------:|:-----|
| docs/01_systems/saas/ | 571 | 最大 |
| docs/01_systems/common/ | 200+ | 推定 |
| docs/03_ssot/ | ~80 | SSOT |
| その他 | ~400 | 分散 |

---

## 🚨 発見された重大な問題

### 問題1: READMEと実態の矛盾

**docs/README.md** では：
> "319ファイル → 5ファイルに集約"

**実態**: 1,283ファイルが存在

**影響**: ドキュメント整理が完了したと思い込んでいるが、実際は未整理

---

### 問題2: 認証仕様の分散と矛盾

認証関連ドキュメントが**30以上**のファイルに分散：

| ファイル | バージョン | 権威主張 | 問題 |
|:---------|:-----------|:---------|:-----|
| `/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md` | v1.3.0 | 🔴 最高権威 | Redisキー: `hotel:session:{id}` |
| `/docs/AUTHENTICATION_MASTER_SPECIFICATION.md` | v1.0.0 | マスター | Redisキー: `session:{id}` |
| `/docs/01_systems/saas/auth/JWT_AUTH_DESIGN.md` | - | - | JWT（廃止済みのはず） |
| `/docs/01_systems/saas/AUTHENTICATION_ARCHITECTURE.md` | - | - | 別アーキテクチャ |
| その他26ファイル | - | - | 重複・古い |

**矛盾点**:
1. Redisキー形式が異なる
2. 両方が「最高権威」を主張
3. 廃止されたはずのJWTドキュメントが存在

---

### 問題3: データベース命名規則の矛盾（既知）

`DOCUMENT_CONFLICT_REPORT_NAMING_CONVENTION.md` で既に報告済み：

| ドキュメント | テーブル名 | フィールド名 | 状態 |
|:------------|:-----------|:-------------|:-----|
| database-naming-convention.md | PascalCase | PascalCase | ❌ 実装と不一致 |
| prisma-naming-conventions.md | PascalCase | camelCase | ⚠️ 部分一致 |
| **SSOT_DATABASE_SCHEMA.md** | snake_case | snake_case | ✅ 実装と一致 |

**推奨**: SSOTを正として、他を削除

---

### 問題4: 01_systems/ の肥大化

`docs/01_systems/saas/` に **571ファイル** が存在：

```
2025-01-28_jwt-authentication-system.v1.md  ← JWT（廃止済み）
2025-01-28_database-architecture-design.v1.md
2025-01-28_order-management-system.v1.md
... (568ファイル)
```

**問題点**:
- SSOT（03_ssot）と重複
- 日付プレフィックス形式が乱立
- 廃止済みの内容が残存

---

### 問題5: 設定ファイルの重複

| ファイル | サイズ | 役割 |
|:---------|-------:|:-----|
| `.cursorrules` | 88KB | Cursor用ルール |
| `CLAUDE.md` | 3KB | Claude Code用 |
| `.claude/rules/*.md` | 6KB | Claude Code用ルール |

**問題点**:
- `.cursorrules`と`.claude/rules/`で内容が重複
- 両方を更新する必要がある

---

## 📊 重複パターン分析

### 認証関連（30+ファイル）

```
docs/AUTHENTICATION_MASTER_SPECIFICATION.md
docs/00_shared/architecture/unified-authentication-infrastructure-design.md
docs/01_systems/common/unified-authentication-infrastructure-design.md
docs/01_systems/common/authentication/unified-authentication-infrastructure-design.md
docs/01_systems/common/authentication/2025-01-03_unified-authentication-infrastructure.v1.md
docs/01_systems/saas/auth/JWT_AUTH_DESIGN.md
docs/01_systems/saas/AUTHENTICATION_ARCHITECTURE.md
docs/03_ssot/00_foundation/SSOT_SAAS_AUTHENTICATION.md
docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md
docs/03_ssot/00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md
... (20+ファイル)
```

### データベース関連（20+ファイル）

```
docs/standards/DATABASE_NAMING_STANDARD.md
docs/01_systems/common/database/DATABASE_SAFETY_RULES.md
docs/01_systems/common/database/CURRENT_DATABASE_STATE_MASTER.md
docs/01_systems/common/integration/rules/database-naming-convention.md
docs/01_systems/common/integration/rules/unified-database-management-rules.md
docs/db/prisma-naming-conventions.md
docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md
... (13+ファイル)
```

---

## ✅ 良い点

1. **SSOTの構造は明確**: `docs/03_ssot/` の構造は整理されている
2. **CLAUDE.md はSSOTを正しく参照**: 03_ssot を指している
3. **矛盾レポートが存在**: 問題認識はある
4. **アーカイブディレクトリあり**: 削除の代わりにアーカイブする運用

---

## 📋 質問リスト（要フィードバック）

### 【質問1】SSOTの権威確認

> **03_ssotを唯一の正式仕様書として、他の全てのドキュメントより優先してよいですか？**

現状:
- SSOT README: "SSOTが最高権威"
- docs/README: "AUTHENTICATION_MASTER_SPECIFICATION.mdが最高権威"

### 【質問2】01_systemsの扱い

> **docs/01_systems/ の571ファイル（特にsaas/）は削除またはアーカイブしてよいですか？**

- SSOTに統合済みの内容が多い
- JWT関連など廃止済みの内容が残っている
- 日付プレフィックスの古いファイルが多数

### 【質問3】認証ドキュメントの統一

> **認証関連を以下のように統一してよいですか？**

残すべきファイル:
- `/docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md`
- `/docs/03_ssot/00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md`
- `/docs/03_ssot/00_foundation/SSOT_SAAS_AUTHENTICATION.md`

削除/アーカイブ候補:
- `/docs/AUTHENTICATION_MASTER_SPECIFICATION.md`
- `/docs/01_systems/saas/auth/*`
- `/docs/01_systems/common/authentication/*`
- その他20+ファイル

### 【質問4】設定ファイルの統一

> **.cursorrules と .claude/rules/ の関係はどうすべきですか？**

選択肢:
1. **両方維持**: Cursor用とClaude用を別管理
2. **claude優先**: .cursorrules を簡略化し、.claude/rules/ を詳細化
3. **cursorrules優先**: .claude/rules/ を削除し、CLAUDE.md から参照

### 【質問5】命名規則の統一

> **データベース命名規則は SSOT_SAAS_DATABASE_SCHEMA.md を正として、他を削除してよいですか？**

削除候補:
- `/docs/01_systems/common/integration/rules/database-naming-convention.md`
- `/docs/db/prisma-naming-conventions.md`
- `/docs/01_systems/common/database/archived/` 内の関連ファイル

### 【質問6】README.mdの更新

> **docs/README.md を実態に合わせて更新してよいですか？**

現状の誤り:
- "319ファイル → 5ファイルに集約" → 実際は1,283ファイル

### 【質問7】システム構成の確認

> **現在アクティブなシステムはどれですか？**

CLAUDE.mdには:
- hotel-saas-rebuild
- hotel-common-rebuild

03_ssot/README.mdには:
- hotel-saas
- hotel-common
- hotel-pms
- hotel-member

**pms と member は現在開発中ですか？**

---

## 🎯 推奨アクション（承認後）

### Phase 1: 即座実行（安全）

1. docs/README.md を実態に合わせて更新
2. DOCUMENT_CONFLICT_REPORT_*.md の指摘を反映
3. .cursorrules と .claude/rules/ の整合性確認

### Phase 2: 承認後実行（影響大）

1. 01_systems/saas/ の571ファイルを `_archived_legacy/` に移動
2. 認証関連30ファイルを `_archived_auth/` に移動
3. SSOT以外のDB命名規則ドキュメントを削除

### Phase 3: 長期（計画策定必要）

1. SSOTの網羅性確認と拡充
2. `.claude/memory/` への重要情報の永続化
3. ドキュメント更新ワークフローの確立

---

**次のステップ**: 上記質問への回答をお願いします。回答に基づいて整理作業を進めます。
