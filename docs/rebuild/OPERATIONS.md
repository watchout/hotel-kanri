# 🛠️ Rebuild Operations - 運用管理体制（決定版）

最終更新: 2025-11-04  
目的: リビルドを遅延なく、かつ確実に完了させるための運用規程（進捗/CI/CDを包括）

---

## 1. 原則（Non-Negotiable）
- Single Source of Truth: SSOT（docs/03_ssot）
- 進捗の唯一の真実: Plane（週次はREBUILD_PROGRESS.mdに集約）
- 品質ゲート絶対遵守: SSOT準拠 / Lint=0 / Test / Build / Security / Docs
- 「設計→承認→実装」の順序厳守（承認前の実装着手禁止）

---

## 2. 成果物
- REBUILD_PROGRESS.md（本リポジトリ: 週次ダイジェスト）
- Plane Project: hotel-saas/hotel-common Rebuild（日次リアルタイム）
- CI/CD Workflows（rebuild各リポジトリに配備）
- CRUD自動検証スクリプト（テンプレート配備）

### 2.1 ロードマップ確認（Plane）
- 日常運用: MCPツール `plane.listIssuesTree` でツリーJSON取得（90秒キャッシュ）
- 定例レビュー: `scripts/plane/list-issues-tree.cjs --format=md` で階層ツリー生成
- 詳細手順: `docs/rebuild/PLANE_DATA_ACCESS.md`

---

## 2.5 ポート設定（確定版）

### 全システムのポート番号

```
localhost ポートマップ
├─ 既存環境（温存）
│  ├─ hotel-saas: 3100
│  └─ hotel-common: 3400
│
└─ rebuild環境（新規）
   ├─ hotel-saas-rebuild: 3101  ← 📌 確定
   └─ hotel-common-rebuild: 3401 ← 📌 確定
```

**ポート設定ルール**:
- rebuild環境は既存ポート+1
- 既存環境と同時起動可能
- Health Check: `curl http://localhost:{PORT}/health`

**環境変数設定**:

```bash
# hotel-saas-rebuild/.env
PORT=3101
HOTEL_COMMON_API_URL=http://localhost:3401

# hotel-common-rebuild/.env
PORT=3401
DATABASE_URL=postgresql://kaneko@localhost:5432/hotel_common
```

---

## 3. データベース管理（rebuild環境）

**重要**: hotel-common-rebuildは**新規DBを使用**

```
PostgreSQL (localhost:5432)
├─ 既存DB: hotel_unified_db  ← 既存環境（変更なし）
└─ 新規DB: hotel_common ← rebuild環境（新規作成）
   └─ URL: postgresql://kaneko@localhost:5432/hotel_common
```

**理由**:
- 既存DBへの影響を完全に排除
- データ汚染リスクゼロ
- マイグレーション履歴の整合性確保
- テストデータの完全管理

**環境変数**:
- hotel-common: `DATABASE_URL=postgresql://...hotel_unified_db`
- hotel-common-rebuild: `DATABASE_URL=postgresql://kaneko@localhost:5432/hotel_common`

---

## 4. ブランチ戦略（rebuild各リポジトリ）
```
main      : リビルド完成版（統合作業時のみ更新）
develop   : リビルド開発のデフォルト（PRのbase）
feature/rebuild-<domain>-<short> : 個別機能開発（小さく・短く）
```
- PR要件: SSOT参照・要件ID・スクショ/ログ・テスト結果
- Merge要件: 全ゲート合格 + レビュー1名以上

補足: 実務のGH運用手順は `docs/rebuild/GH_OPERATIONS.md` を参照（標準化済み）

---

## 5. Linear運用（粒度）
- 粒度: 50〜100 Issue（機能×CRUD×Phaseで適度に集約）
- 依存関係: blocks（必須）
- サブタスク: Phase単位（DB/API/Proxy/UI/Test/Verify）
- レポート: 日次（自動）/ 週次（会議）

DoD（Definition of Done）
- SSOTのAccept条件を満たす
- CRUD全て成功（Phase 6 準拠）
- すべてのテストパス
- リグレッションなし（差分監視）

---

## 6. CI/CD（テンプレ適用）
リビルド各リポジトリに以下を配置（テンプレは hotel-kanri/templates/workflows 配下）

CI（rebuild-ci.yml）
- SSOT準拠チェック（PR本文のSSOT/要件ID/Linearリンク）
- Lint & Typecheck（警告ゼロ）
- Unit Tests / Integration Tests
- CRUD Verify（crud-verify-all.sh）
- Build Check（hotel-saas/hotel-common）
- Security Scan（npm audit + secret scan）
- Quality Gate（全ジョブ成功）

Deploy（rebuild-deploy.yml）
- 手動/DevelopへのPushでDocker Build & Push（ghcr.io）
- 環境: saas:3101 / common:3401（rebuild環境）
- 統合時は既存環境（3100/3400）へ切替

Docs（rebuild-docs.yml 任意）
- SSOT/Docリンク検証、生成物公開

---

## 7. テスト戦略
- Unit（Jest）: 関数・サービス単位
- Integration: API境界（hotel-saas → hotel-common）
- CRUD Verify: 全API CRUDを自動検証（エラー率<5%）
- Scenario: ログイン→予約→チェックイン（E2E）

---

## 8. 会議体・レビュー
- 週次: 進捗/ブロッカー/品質（REBUILD_PROGRESS.md更新）
- 月次: マイルストーン評価/ロードマップ調整
- レビュー: PR単位でSSOT適合・受入確認

---

## 9. 例外・緊急対応
- エラー検知時は即停止→SSOT再確認→ユーザー報告→承認後再開
- ガードレール: .cursor/prompts/ssot_implementation_guard.md

---

## 10. 適用手順（Check List）
- [ ] **新規DB作成（hotel_unified_db_rebuild）** ★最優先
- [ ] hotel-common-rebuild の DATABASE_URL 設定
- [ ] Prismaマイグレーション実行（新規DB）
- [ ] テストテナント作成
- [ ] 各rebuildリポジトリに templates/workflows のymlを配置
- [ ] templates/scripts のcrud-verify-all.shを配置 + 実行権限
- [ ] ブランチ保護（main/develop）
- [ ] Linear: Issue分解/依存設定/サブタスク登録
- [ ] REBUILD_PROGRESS.md初期値更新

---

## 11. メトリクス/週次集約
- エラー率 = 失敗API数 / 総API数（CRUD Verify結果から算出）
- CI成功率 = 成功ワークフロー / 実行ワークフロー
- 週次: Linearの証跡（ログ/スクショ/結果）を確認し、REBUILD_PROGRESS.mdへ要旨を転記

---

## 12. 付録（リンク）
- Linear Project: hotel-saas/hotel-common Rebuild
- SSOT: docs/03_ssot
- 週次サマリー: docs/rebuild/REBUILD_PROGRESS.md
- CIテンプレ: templates/workflows
- CRUD検証: templates/scripts/crud-verify-all.sh
