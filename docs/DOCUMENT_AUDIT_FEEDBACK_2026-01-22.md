# ドキュメント監査フィードバック（Claude Code 引き継ぎ用）

**対象レポート**: `docs/DOCUMENT_AUDIT_REPORT_2026-01.md`  
**作成日**: 2026-01-22  
**目的**: レポート末尾の「質問1〜7」へ短文回答（Claude Codeで整理作業に着手できる形）

---

## 回答（質問1〜7）

### 質問1）SSOTの権威確認
- **回答**: **原則 YES**。仕様の最優先は `docs/03_ssot/`。
- **例外（同格で優先）**: ルール/運用/意思決定は以下も優先扱い：
  - **標準**: `docs/standards/`
  - **運用**: `docs/ops/`（または `ops/`）
  - **意思決定**: `docs/adr/`
- **それ以外**（`docs/01_systems/*` や `docs/*MASTER*` 等）は参考資料。矛盾時は **03_ssotを正**にする。

### 質問2）01_systemsの扱い
- **回答**: **削除はNG**。**アーカイブは条件付きでOK**。
- **条件**:
  - (1) 移動前に「参照されているか」を検索し、参照中のものは別扱い
  - (2) 移動後の導線（README/INDEX）を用意
  - (3) JWT等の廃止仕様は「廃止」ラベル付きでアーカイブ
- **推奨**: `docs/_archived_system_docs/` 等へ段階移動。

### 質問3）認証ドキュメントの統一
- **回答**: **YES（統一OK）**。ただし **削除ではなくアーカイブ＋先頭にリダイレクト注記**が安全。
- **正として残す**:
  - `docs/03_ssot/00_foundation/SSOT_SAAS_ADMIN_AUTHENTICATION.md`
  - `docs/03_ssot/00_foundation/SSOT_SAAS_DEVICE_AUTHENTICATION.md`
  - `docs/03_ssot/00_foundation/SSOT_SAAS_AUTHENTICATION.md`
- **アーカイブ候補**:
  - `docs/AUTHENTICATION_MASTER_SPECIFICATION.md`
  - `docs/01_systems/**/auth/**` など重複/旧設計

### 質問4）設定ファイル（.cursorrules と .claude/rules/）
- **回答**: **両方維持**（ツールの読み取り箇所が違うため）。
- **運用ルール**: 内容の“二重管理”を避け、**単一ソース化**する。
  - 例: **正 = `.cursorrules`**、`.claude/rules/` は要点の抜粋に留める（重複最小化）
  - `CLAUDE.md` は参照導線中心（SSOT/standards/ops/adr を指す）

### 質問5）命名規則の統一（DB）
- **回答**: **そのままはNG**。命名規則の“正”は **`docs/standards/DATABASE_NAMING_STANDARD.md`**。
- **整理方針**:
  - **ルール（命名規則）**: `docs/standards/DATABASE_NAMING_STANDARD.md`
  - **構造（DBスキーマSSOT）**: `docs/03_ssot/00_foundation/SSOT_SAAS_DATABASE_SCHEMA.md` 等
  - 旧/重複の命名規則ドキュメントは **アーカイブOK**（削除ではなく）

### 質問6）docs/README.md の更新
- **回答**: **YES**。実態（ファイル数等）と矛盾している説明は即時修正してOK。

### 質問7）アクティブなシステム（pms/member）
- **回答**: **このレポートだけでは確定不可（保留）**。
- **推奨**:
  - `docs/03_ssot/README.md` か運用SSOTに「現在アクティブなシステム」セクションを追加し、pms/memberの扱い（休止/計画/進行中）を明記する。

---

## 安全に進める優先順（提案）

### Phase 1（安全・即時）
- `docs/README.md` を現状に合わせて更新（質問6）
- 認証の正を `03_ssot` に統一する宣言を入れる（質問1/3）
- `01_systems` の扱いを「削除禁止・アーカイブ方針」で明文化（質問2）

### Phase 2（影響大・承認後）
- `docs/01_systems/saas/` を `docs/_archived_system_docs/` へ移動（参照検索・導線整備込み）
- 認証重複をアーカイブし、旧文書の先頭に「正はSSOT」注記

