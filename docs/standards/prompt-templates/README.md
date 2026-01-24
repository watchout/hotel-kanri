# 📋 プロンプトテンプレート使用ガイド

**最終更新**: 2025年12月24日  
**バージョン**: 2.5.0  
**目的**: 実装AIが100%意図通りに実装できるプロンプトを標準化  
**更新内容**: 
- 機能実装（Full Stack）テンプレート追加、Gatekeeper要件統合（v2.0.0）
- SSOT照合ゲート、システム境界違反検査、ルーティングA/B方式固定（v2.1.0）
- State自動更新（Backlog → In Progress）（v2.2.0）
- Phase 0: 実装状況完全スキャン追加（v2.3.0）
- **★NEW Phase 0強化: SSOT vs タスク整合性チェック追加**（v2.4.0）:
  - タスク要求 vs SSOT定義の完全照合
  - 汎用API vs 専用API判定
  - SSOT未定義検出 → 即座停止・ユーザー確認
  - プロセス上の抜け（SSOT≠タスクのときに必ず止めるゲート）を完全封鎖
- **★NEW Page Registry ゲート（UI/ページタスク共通）**（v2.5.0）:
  - `SSOT_PAGE_REGISTRY.md` を必須参照（canonical path）
  - `hotel-saas-rebuild/pages` の実体（Nuxtルート）を正（canonical）として統一
  - レジストリ未定義ページの実装は禁止（先にレジストリ追記）

---

## 🎯 使い方

### タグを使用したプロンプト生成

```
>> prmt [タスクID]
```

**例**:
```
>> prmt COM-81
```

**動作**:
1. PlaneからタスクID（COM-81）を取得
2. State自動更新（Backlog → In Progress）
3. **★NEW Phase 0強化: SSOT vs タスク整合性チェック**
   - タスク要求内容抽出（API/DB/機能）
   - SSOT定義内容確認（grep検索）
   - 整合性判定（完全一致 / 汎用vs専用 / SSOT未定義）
   - パターンB/C検出時 → 🚨 即座停止・ユーザー確認
4. 実装状況完全スキャン
   - 関連キーワード抽出
   - Git管理下・履歴・PRマージ済み確認
   - 実装状況サマリー作成
5. タスクタイプを判定（UI/API/DB等）
6. 該当テンプレートを適用
7. タスク情報を反映
8. 自動挿入（API実装タスクの場合：ルーティングポリシー、実装中断ポリシー）
9. チャット内でプロンプト全文を出力

**重要**: プロンプトはファイル化せず、チャット内で出力します。

---

## 🧭 Page Registry ゲート（UI/ページ実装タスク）

**対象**: タイトル/本文に UI, 画面, page, pages, ルーティング, route が含まれるタスク  
（または `hotel-saas-rebuild/pages` 配下の変更を含むタスク）

✅ **必須**:
- [ ] `docs/03_ssot/00_foundation/SSOT_PAGE_REGISTRY.md` に対象ページの canonical path が定義されている
- [ ] SSOT内のページパス表記は registry の canonical と完全一致している
- [ ] 新規ページの場合、先に registry を更新してから `hotel-saas-rebuild/pages` に追加する

✅ **ローカル検証（推奨）**:
```bash
cd /Users/kaneko/hotel-kanri
node scripts/quality/check-page-registry-consistency.cjs --strict
echo "exit=$?"
```

---

## 📚 テンプレート一覧

| テンプレート | 用途 | 適用条件 |
|-------------|------|---------|
| `FEATURE_IMPLEMENTATION.md` | 機能実装（Full Stack） | Plane Issueタイトルに"[Phase N]"が含まれる、DB+API+UI |
| `UI_IMPLEMENTATION.md` | UI実装のみ | タスクに"[11] UI"等が含まれる |
| `API_IMPLEMENTATION.md` | API実装のみ | タスクに"[12] API"等が含まれる（未実装） |
| `DB_MIGRATION.md` | DB Migrationのみ | タスクに"[13] DB"等が含まれる（未実装） |
| `COMMON_SECTIONS.md` | 共通セクション | 全テンプレートで使用（Item 1等） |

---

## 🏗️ テンプレートの構造

全てのテンプレートは以下の構造に従います：

```markdown
# [テンプレート名]

## Item 1: 事前調査（必須・15分）
- 既存実装の確認
- ツール使用指示（find, ls, cat, grep）
- 完了報告テンプレート

## Item 2-7: 段階的実装
- 各Itemに具体的なツール使用指示（Step 1-N）
- チェックリスト
- 完了報告テンプレート

## エラー時の対処フロー
- よくあるエラーパターンと対処法

## 実装ガード（絶対禁止事項）
- 禁止パターンの明示

## 完了条件
- 受入基準
- 証跡提出物
```

---

## 📝 プロンプト作成の原則

### 必須要素（10項目）★Gatekeeper要件統合

1. **段階的な指示（Item/Step構造）**
   - Item 1: 事前調査（SSOT確認・スコープ判定）（必須・20分）
   - Item 2-7: 実装ステップ（Item別、各ItemにStep 1-N）

2. **具体的なツール使用指示**
   - `find`, `ls`, `cat`, `grep`, `search_replace`, `write`, `read_file`
   - コマンド例を明記（`bash`ブロック）

3. **検証可能な成果物の指定**
   - ファイル一覧（`ls -la`, `sha256sum`）
   - チェックリスト（`[ ]` 形式）

4. **エラー時の対処フロー明記**
   - 401/403/500/404エラー
   - 診断コマンド + 対処法

5. **各Item完了時の報告フォーマット**
   - Markdown形式のテンプレート
   - ユーザー承認待ち指示

6. **実行するコマンドの明示**
   - `bash`ブロックで全コマンドを明示
   - 終了コード記録（`echo "終了コード: $?"`）

7. **確認すべき項目のチェックリスト**
   - `[ ]` 形式、各Item毎に定義

8. **Evidence取得手順（Gatekeeper必須）**★NEW
   - Evidence 1: Commands & Logs（実行コマンド+終了コード）
   - Evidence 2: Files（git status, ls -la, sha256sum）
   - Evidence 3: Git（branch, HEAD）
   - Evidence 4: CI（PR作成後に追記）
   - Evidence 5: CRUD Verify（CI完了後に追記）

9. **PR本文テンプレート（Gatekeeper必須）**★NEW
   - 必須見出し4件（参照SSOT / Plane / テスト・証跡 / CI）
   - Evidence 1-5の貼付箇所明示
   - 受入基準チェックリスト

10. **不可侵ルール（即否認対象）**★NEW
    - hotel-saas からの Prisma/DB 直接使用
    - tenant_id フォールバック
    - $fetch 直接使用（Cookie未転送）
    - API Routingガイドライン違反
    - 環境分岐ロジック

### 禁止事項

- ❌ 曖昧な表現（「適切に」「よしなに」等）
- ❌ プレースホルダー（「XXX」「...」等）
- ❌ ファイル一覧だけの指示
- ❌ ツール使用指示なし

---

## 🔄 テンプレートの更新

### 更新フロー

1. テンプレートに不足を発見
2. `TEMPLATE_GUIDE.md`を参照して改善案作成
3. ユーザーに提案
4. 承認後、テンプレート更新
5. バージョン番号を更新

### バージョン管理

- メジャー更新（1.0.0 → 2.0.0）: 構造変更
- マイナー更新（1.0.0 → 1.1.0）: セクション追加
- パッチ更新（1.0.0 → 1.0.1）: 誤字修正・例追加

---

## 📞 問い合わせ

テンプレートに不足や改善提案がある場合は、ユーザーに報告してください。

