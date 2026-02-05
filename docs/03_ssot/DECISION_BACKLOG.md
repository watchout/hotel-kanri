# DECISION_BACKLOG.md - 未決定事項バックログ

**バージョン**: 1.0.0
**最終更新**: 2026-02-05
**ステータス**: Active

---

## Overview

このドキュメントは、既存SSOTから抽出された未決定事項・TODO・要検討項目を一元管理します。
新規の未決定事項が発生した場合は、このバックログに追加してください。

---

## Decision Backlog Table

| ID | 項目 | 出典SSOT | 重要度 | 期限 | 影響範囲 | 推奨デフォルト | 副作用 |
|----|------|---------|--------|------|---------|---------------|--------|
| DEC-001 | エンタイトルメントAPI実装 | SSOT_API_REGISTRY.md | 高 | DEV-0430 | 料金プラン機能 | Phase 2で実装 | プラン制限機能が使えない |
| DEC-002 | ハンドオフAPI実装（Admin） | SSOT_API_REGISTRY.md | 高 | DEV-0172 Phase 2 | スタッフ対応機能 | Phase 2で実装 | AI→スタッフ引継ぎ不可 |
| DEC-003 | ハンドオフAPI実装（Guest） | SSOT_API_REGISTRY.md | 高 | DEV-0172 | ゲスト問い合わせ | Phase 1で実装 | AIからの問い合わせ不可 |
| DEC-004 | スタッフテーブル実装 | SSOT_SAAS_MULTITENANT.md | 高 | - | マルチテナント | 既存auth_usersを拡張 | スタッフ管理機能制限 |
| DEC-005 | テナント切替API実装 | SSOT_SAAS_MULTITENANT.md | 高 | - | マルチテナント | セッションベース | 複数テナント操作不可 |
| DEC-006 | 全権限取得API | PERMISSION_SYSTEM | 中 | - | 権限システム | 管理者に全権限付与 | 細かい権限制御不可 |
| DEC-007 | ロール削除API | PERMISSION_SYSTEM | 中 | - | 権限システム | 論理削除のみ | 物理削除不可 |
| DEC-008 | Settings API群 | SSOT_ADMIN_BASIC_SETTINGS.md | 高 | - | 基本設定画面 | 段階的実装 | 設定画面が動作しない |
| DEC-009 | AIフィードバックAPI | SSOT_GUEST_AI_FAQ | 中 | Phase 4 | AI改善 | 実装保留 | フィードバック収集不可 |
| DEC-010 | CSV エクスポート | SSOT_ADMIN_STATISTICS_CORE.md | 中 | - | 統計機能 | 実装保留 | データエクスポート不可 |
| DEC-011 | NFR品質属性シナリオ | NFR-QAS.md | 中 | - | 非機能要件 | 各TODOを順次解決 | 品質基準が曖昧 |

---

## Categorized Backlog

### 1. API Implementation (未実装API)

| 優先度 | API | 状態 | 関連DEV |
|--------|-----|------|---------|
| P0 | `/api/v1/admin/entitlements` | 未実装 | DEV-0430 |
| P0 | `/api/v1/admin/handoff/*` | 未実装 | DEV-0172 |
| P0 | `/api/v1/guest/handoff/*` | 未実装 | DEV-0172 |
| P1 | `/api/v1/admin/settings/*` | 未実装 | - |
| P1 | `/api/v1/admin/staff/:id/restore` | 未実装 | - |
| P1 | `/api/v1/admin/staff/:id/lock` | 未実装 | - |
| P2 | `/api/v1/ai/feedback` | 未実装 | Phase 4 |
| P2 | `/api/v1/admin/statistics/ai/*` | 未実装 | - |

### 2. Database Tables (未実装テーブル)

| 優先度 | テーブル | 状態 | 用途 |
|--------|---------|------|------|
| P0 | `staff` | 未実装 | スタッフ管理 |
| P0 | `staff_tenant_memberships` | 未実装 | マルチテナント |
| P1 | `auth_logs` | 未実装 | 認証ログ |
| P1 | `ai_operation_logs` | 未実装 | AI操作ログ |
| P2 | `page_layouts` | 未実装 | UIカスタマイズ |

### 3. UI Components (未実装UI)

| 優先度 | コンポーネント | 状態 | 画面 |
|--------|--------------|------|------|
| P1 | テナント選択ドロップダウン | 未実装 | ヘッダー |
| P1 | 権限プレビュー | 未実装 | スタッフ管理 |
| P2 | ログダッシュボード | 未実装 | システムログ |
| P2 | レイアウトエディタ | 未実装 | UIデザイン |

---

## Decision Process

### 新規項目の追加方法

1. このファイルの **Decision Backlog Table** に行を追加
2. 一意のID（DEC-XXX）を付与
3. 出典SSOTを明記
4. 重要度・期限・影響範囲を記載

### 決定後の処理

1. 該当行の「推奨デフォルト」欄を決定事項に更新
2. 実装タスク（DEV-XXXX）を作成
3. 実装完了後、この行を「Resolved」セクションに移動

---

## Resolved (解決済み)

| ID | 項目 | 解決日 | 決定内容 | 実装DEV |
|----|------|--------|---------|---------|
| - | - | - | - | - |

---

## Related Documents

- [CLAUDE.md](../../CLAUDE.md) - フレームワークエントリポイント
- [CROSS_CUTTING_API_CONTRACT.md](./CROSS_CUTTING_API_CONTRACT.md) - API契約
- [SSOT_API_REGISTRY.md](./00_foundation/SSOT_API_REGISTRY.md) - API一覧
